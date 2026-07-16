#!/usr/bin/env python3
"""Write deterministic photo-audit artifacts.

Usage: import outputs and call write_outputs(out_dir, results, receipt)
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

STATES = ("missing", "machine_reject", "review_required", "provisionally_valid", "approved")


def build_summary(results: list[dict]) -> dict:
    """Aggregate stable summary counts."""
    by_state = Counter(result["state"] for result in results)
    by_source = Counter(result["institutionCode"] for result in results)
    by_flag = Counter(flag for result in results for flag in result["flags"])
    by_word = Counter(
        word for result in results for word in {match["word"] for match in result["dangerWords"]}
    )
    variants = Counter(result["variant"] for result in results)
    return {
        "totalFixtures": len(results),
        "byState": {state: by_state[state] for state in STATES},
        "bySource": dict(sorted(by_source.items())),
        "byFlag": dict(sorted(by_flag.items())),
        "byDangerWord": dict(sorted(by_word.items())),
        "speciesCount": len({result["speciesId"] for result in results}),
        "variantCount": {"default": variants["default"], "female": variants["female"]},
    }


def write_outputs(
    out_dir: Path,
    results: list[dict],
    receipt: dict,
    stretch: dict | None = None,
) -> dict:
    """Write all specified output files and return the summary.

    stretch carries the optional additional artifacts, keyed by output filename.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    public_results = [_public_result(result) for result in results]
    for filename, payload in sorted((stretch or {}).items()):
        _write_pretty_json(out_dir / filename, payload)
    _write_jsonl(out_dir / "photo_audit.jsonl", public_results)
    summary = build_summary(public_results)
    _write_pretty_json(out_dir / "photo_audit_summary.json", summary)
    _write_pretty_json(
        out_dir / "missing_or_replacement_species.json",
        _gap_output(public_results),
    )
    rejected = [_rejected_result(result) for result in results if result["state"] == "machine_reject"]
    _write_jsonl(out_dir / "rejected_media.jsonl", rejected)
    _write_pretty_json(out_dir / "run_receipt_T04.json", receipt)
    return summary


def _public_result(result: dict) -> dict:
    return {key: value for key, value in result.items() if not key.startswith("_")}


def _gap_output(results: list[dict]) -> dict:
    records = []
    for result in results:
        if result["state"] == "missing":
            intent = "variant_missing" if result["variant"] == "female" else "missing"
        elif result["state"] == "machine_reject":
            intent = "replacement"
        else:
            continue
        gap_id = f'{result["speciesId"]}::{result["variant"]}::{intent}'
        records.append(
            {
                "gapId": gap_id,
                "speciesId": result["speciesId"],
                "variant": result["variant"],
                "intent": intent,
                "state": result["state"],
                "scientificName": result["scientificName"],
                "jaName": result["jaName"],
                "reasons": result["reasons"],
                "currentMedia": {
                    "display": result["files"]["display"]["path"],
                    "resized": result["files"]["resized"]["path"],
                    "sourceMediaUrl": result["source"]["sourceMediaUrl"],
                    "institutionRecordUrl": result["source"]["institutionRecordUrl"],
                },
            }
        )
    records.sort(key=lambda record: record["gapId"])
    gap_ids = [record["gapId"] for record in records]
    assert len(gap_ids) == len(set(gap_ids)), "duplicate gapId"
    return {
        "schemaNote": "MediaGapRecord-shaped; zukan-fetch's canonical schema is not present in this repository, so this is a conservative approximation. gapId is the idempotent key.",
        "records": records,
    }


def _rejected_result(result: dict) -> dict:
    return {
        "speciesId": result["speciesId"],
        "variant": result["variant"],
        "mediaId": result["_mediaId"],
        "sourceMediaUrl": result["source"]["sourceMediaUrl"],
        "institutionRecordUrl": result["source"]["institutionRecordUrl"],
        "sha256": result["files"]["resized"]["sha256"],
        "reasons": result["reasons"],
        "decidedBy": "machine",
    }


def _write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True, ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")


def _write_pretty_json(path: Path, value: dict) -> None:
    text = json.dumps(value, sort_keys=True, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")
