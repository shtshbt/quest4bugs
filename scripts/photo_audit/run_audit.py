#!/usr/bin/env python3
"""Run the read-only catalog photo audit.

Usage: python scripts/photo_audit/run_audit.py --repo-root . --out-dir /tmp/photo_audit
"""

from __future__ import annotations

import argparse
import copy
import json
import shlex
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import imaging
import outputs
import rules
from contact_sheet import write_contact_sheets
from extract import extract, iter_fixtures
from review_bundle import write_review_bundle

ROLES = ("resized", "display", "thumb54", "thumb108", "thumb216")
STATE_PRIORITY = ("missing", "machine_reject", "review_required", "provisionally_valid")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit zukan catalog photos without modifying them.")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--out-dir", default="photo_audit")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--checkpoint")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--no-bundle", action="store_true")
    parser.add_argument("--no-contact-sheets", action="store_true")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be non-negative")
    return args


def main() -> int:
    args = parse_args()
    started_at = datetime.now(timezone.utc)
    started_clock = time.monotonic()
    repo_root = Path(args.repo_root).resolve()
    out_dir = Path(args.out_dir)
    checkpoint = Path(args.checkpoint) if args.checkpoint else out_dir / ".audit_checkpoint.jsonl"

    extracted = extract(repo_root)
    fixtures = iter_fixtures(extracted["catalog"])
    if args.limit is not None:
        fixtures = fixtures[: args.limit]
    allowed = set(extracted["allowedMediaLicenses"])
    bugs = {bug["id"]: bug for bug in extracted["bugs"]}
    canonical_keys = [_fixture_key(fixture) for fixture in fixtures]

    cached = _load_checkpoint(checkpoint) if args.resume else {}
    cached = {key: value for key, value in cached.items() if key in set(canonical_keys)}
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    mode = "a" if args.resume else "w"
    processed_now = 0
    with checkpoint.open(mode, encoding="utf-8", newline="\n") as handle:
        for fixture in fixtures:
            key = _fixture_key(fixture)
            if key in cached:
                continue
            try:
                result = _process_fixture(fixture, repo_root, bugs.get(fixture["speciesId"]), allowed)
            except Exception as error:  # noqa: BLE001
                result = _error_result(fixture, error, repo_root)
            _resolve_result(result)
            cached[key] = result
            handle.write(json.dumps(result, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")
            handle.flush()
            processed_now += 1
            if processed_now % 100 == 0:
                print(f"processed {processed_now} fixtures", file=sys.stderr, flush=True)

    raw_results = [cached[key] for key in canonical_keys]
    results = copy.deepcopy(raw_results)
    _apply_duplicates(results)
    for result in results:
        _resolve_result(result)

    preliminary_summary = outputs.build_summary(results)
    finished_at = datetime.now(timezone.utc)
    errors = [result["_auditError"] for result in results if result.get("_auditError")]
    receipt = {
        "tool": "scripts/photo_audit/run_audit.py",
        "command": shlex.join(sys.argv),
        "exitCode": 0,
        "fixturesTotal": len(fixtures),
        "fixturesProcessed": processed_now,
        "fixturesFromCheckpoint": len(fixtures) - processed_now,
        "byState": preliminary_summary["byState"],
        "unresolved": {
            state: preliminary_summary["byState"][state]
            for state in ("review_required", "machine_reject", "missing")
        },
        "errors": errors,
        "durationSeconds": round(time.monotonic() - started_clock, 3),
        "startedAt": started_at.isoformat(),
        "finishedAt": finished_at.isoformat(),
    }
    outputs.write_outputs(out_dir, results, receipt)
    if not args.no_bundle:
        bundle_path = write_review_bundle(results, out_dir, repo_root)
        print(f"review bundle: {bundle_path}", file=sys.stderr)
    if not args.no_contact_sheets:
        sheet_count, sheet_errors = write_contact_sheets(results, out_dir, repo_root)
        print(
            f"contact sheets: {sheet_count} written, {sheet_errors} errors",
            file=sys.stderr,
        )
    return 0


def _process_fixture(fixture: dict, repo_root: Path, bug: dict | None, allowed: set[str]) -> dict:
    entry = fixture["entry"]
    specimen = fixture["specimen"]
    source = fixture["source"]
    image = fixture["image"]
    files, completeness_state, completeness_reasons = _check_completeness(image, repo_root)

    danger_words = rules.find_danger_words(specimen, entry)
    subject_flags = []
    subject_reasons = [f'danger word "{match["word"]}" in {match["field"]}' for match in danger_words]
    if all(files[role]["decodable"] for role in ("display", "resized")):
        flags, reasons = imaging.analyze_subject(
            repo_root / files["display"]["path"],
            repo_root / files["resized"]["path"],
            {size: repo_root / files[f"thumb{size}"]["path"] for size in (54, 108, 216)},
        )
        subject_flags.extend(flags)
        subject_reasons.extend(_portable_text(reason, repo_root) for reason in reasons)
    subject_state = _subject_state(danger_words, subject_flags)

    catalog_name = str(specimen.get("scientificName") or entry.get("scientificName") or "")
    identification_state, identification_reasons, comparison = rules.check_identification(catalog_name, bug)
    rights_state, rights_reasons = rules.check_rights(source, entry, allowed)
    return {
        "speciesId": fixture["speciesId"],
        "variant": fixture["variant"],
        "state": "provisionally_valid",
        "jaName": str(entry.get("jaName") or ""),
        "scientificName": catalog_name,
        "catalogNumber": str(specimen.get("catalogNumber") or ""),
        "institutionCode": str(specimen.get("institutionCode") or source.get("institutionCode") or ""),
        "axes": {
            "completeness": {"state": completeness_state, "reasons": completeness_reasons},
            "subject": {"state": subject_state, "reasons": subject_reasons},
            "identification": {"state": identification_state, "reasons": identification_reasons},
            "rights": {"state": rights_state, "reasons": rights_reasons},
        },
        "flags": sorted(set(subject_flags)),
        "reasons": [],
        "dangerWords": danger_words,
        "taxonComparison": comparison,
        "files": files,
        "source": {
            "mediaLicense": str(source.get("mediaLicense") or ""),
            "institutionRecordUrl": str(source.get("institutionRecordUrl") or ""),
            "licenseUrl": str(source.get("licenseUrl") or ""),
            "sourceMediaUrl": str(source.get("sourceMediaUrl") or ""),
            "creditLine": str(entry.get("creditLine") or ""),
        },
        "_mediaId": str(specimen.get("occurrenceId") or source.get("gbifOccurrenceKey") or ""),
        "_auditError": "",
    }


def _check_completeness(image: dict | None, repo_root: Path) -> tuple[dict, str, list[str]]:
    files = {}
    reasons = []
    if not image:
        reasons.append("image object missing")
    for role in ROLES:
        relative = str((image or {}).get(role) or "")
        if not relative:
            result = imaging.probe_file(repo_root / "__photo_audit_missing_path__")
            result["path"] = ""
            reasons.append(f"missing path: {role}")
        else:
            result = imaging.probe_file(repo_root / relative)
            result["path"] = relative
            result["error"] = _portable_text(result["error"], repo_root)
            if not result["exists"]:
                reasons.append(f"missing file: {role}: {relative}")
        files[role] = result
    if reasons:
        return files, "missing", reasons
    undecodable = [f"undecodable: {role}" for role in ROLES if not files[role]["decodable"]]
    if undecodable:
        return files, "machine_reject", undecodable
    review_reasons = []
    for size in (54, 108, 216):
        role = f"thumb{size}"
        width, height = files[role]["width"], files[role]["height"]
        if (width, height) != (size, size):
            review_reasons.append(f"{role} expected {size}x{size}, got {width}x{height}")
    if files["display"]["width"] != files["display"]["height"]:
        review_reasons.append("display not square")
    state = "review_required" if review_reasons else "provisionally_valid"
    return files, state, review_reasons


def _apply_duplicates(results: list[dict]) -> None:
    digest_map = defaultdict(list)
    for result in results:
        for role in ("resized", "display"):
            digest = result["files"][role]["sha256"]
            if digest:
                digest_map[digest].append((result["speciesId"], result["variant"], role))
    for result in results:
        fixture_id = (result["speciesId"], result["variant"])
        reasons = result["axes"]["completeness"]["reasons"]
        for role in ("resized", "display"):
            digest = result["files"][role]["sha256"]
            others = [item for item in digest_map.get(digest, []) if item[:2] != fixture_id]
            for species_id, variant, other_role in sorted(others):
                reasons.append(f"sha256 duplicate of {species_id}/{variant} ({other_role})")
        if any(reason.startswith("sha256 duplicate of ") for reason in reasons):
            if result["axes"]["completeness"]["state"] == "provisionally_valid":
                result["axes"]["completeness"]["state"] = "review_required"


def _resolve_result(result: dict) -> None:
    states = {axis["state"] for axis in result["axes"].values()}
    result["state"] = next(state for state in STATE_PRIORITY if state in states)
    assert result["state"] != "approved", "photo audit must never emit approved"
    result["flags"] = sorted(set(result["flags"]))
    result["reasons"] = [
        reason
        for axis_name in ("completeness", "subject", "identification", "rights")
        for reason in result["axes"][axis_name]["reasons"]
    ]


def _subject_state(danger_words: list[dict], flags: list[str]) -> str:
    targets = {match["target"] for match in danger_words}
    if "machine_reject" in targets:
        return "machine_reject"
    if "review_required" in targets or flags:
        return "review_required"
    return "provisionally_valid"


def _error_result(fixture: dict, error: Exception, repo_root: Path) -> dict:
    message = _portable_text(f"audit error: {error}", repo_root)
    empty_files = {role: imaging.probe_file(Path("__photo_audit_error__")) for role in ROLES}
    for value in empty_files.values():
        value["path"] = ""
    entry, specimen, source = fixture["entry"], fixture["specimen"], fixture["source"]
    catalog_name = str(specimen.get("scientificName") or entry.get("scientificName") or "")
    return {
        "speciesId": fixture["speciesId"], "variant": fixture["variant"], "state": "review_required",
        "jaName": str(entry.get("jaName") or ""), "scientificName": catalog_name,
        "catalogNumber": str(specimen.get("catalogNumber") or ""), "institutionCode": "",
        "axes": {
            "completeness": {"state": "provisionally_valid", "reasons": []},
            "subject": {"state": "review_required", "reasons": [message]},
            "identification": {"state": "provisionally_valid", "reasons": []},
            "rights": {"state": "provisionally_valid", "reasons": []},
        },
        "flags": [], "reasons": [message], "dangerWords": [],
        "taxonComparison": {"catalogName": catalog_name, "bugsName": "", "bugsRank": "", "match": "error", "notes": [message]},
        "files": empty_files,
        "source": {"mediaLicense": str(source.get("mediaLicense") or ""), "institutionRecordUrl": str(source.get("institutionRecordUrl") or ""), "licenseUrl": str(source.get("licenseUrl") or ""), "sourceMediaUrl": str(source.get("sourceMediaUrl") or ""), "creditLine": str(entry.get("creditLine") or "")},
        "_mediaId": str(specimen.get("occurrenceId") or source.get("gbifOccurrenceKey") or ""),
        "_auditError": message,
    }


def _fixture_key(fixture: dict) -> str:
    return f'{fixture["speciesId"]}::{fixture["variant"]}'


def _portable_text(value: str, repo_root: Path) -> str:
    return str(value).replace(f"{repo_root}/", "").replace(str(repo_root), ".")


def _load_checkpoint(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    cached = {}
    try:
        with path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if not line.strip():
                    continue
                result = json.loads(line)
                cached[f'{result["speciesId"]}::{result["variant"]}'] = result
    except (OSError, json.JSONDecodeError, KeyError) as error:
        raise RuntimeError(f"invalid checkpoint {path}: {error}") from error
    return cached


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
