"""Build the current species index.

Usage: python -m zukan_foundry.catalog --repository-root .
"""

import argparse
import json
import re
import subprocess
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path


def normalize_japanese(value):
    if not isinstance(value, str):
        raise ValueError("Japanese name must be a string")
    value = unicodedata.normalize("NFKC", value)
    value = re.sub(r"[\s・･·]+", "", value)
    return re.sub(r"[―‐‑‒–−ｰ]", "ー", value).casefold()


def canonical_scientific_name(value):
    if not isinstance(value, str):
        raise ValueError("scientific name must be a string")
    value = unicodedata.normalize("NFKC", value).strip()
    value = re.sub(r"\([^)]*\)|,?\s+\d{4}[a-z]?\b.*$", "", value)
    tokens = re.findall(r"[A-Za-z][A-Za-z.-]*", value)
    if not tokens:
        return ""
    keep = tokens[:2] if len(tokens) > 1 and tokens[1].lower() in {"sp.", "spp."} else tokens[:3]
    return " ".join([keep[0].capitalize(), *[item.lower() for item in keep[1:]]])


def split_scientific_name(value):
    canonical = canonical_scientific_name(value)
    parts = canonical.split()
    marker = parts[1].lower() if len(parts) > 1 and parts[1].lower() in {"sp.", "spp."} else None
    return {
        "canonical": canonical,
        "genus": parts[0] if parts else "",
        "species": "" if marker or len(parts) < 2 else parts[1],
        "subspecies": parts[2] if len(parts) > 2 else "",
        "rankMarker": marker,
        "isGenusLevel": bool(marker or len(parts) == 1),
    }


def _extract_balanced(text, start):
    depth = 0
    quote = None
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in {'"', "'"}:
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start:index + 1], index + 1
    raise ValueError("unterminated object literal")


def _quote_keys(raw):
    output = []
    quote = None
    escaped = False
    index = 0
    while index < len(raw):
        char = raw[index]
        output.append(char)
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in {'"', "'"}:
            quote = char
        elif char in "{,":
            match = re.match(r"(\s*)([A-Za-z_$][\w$]*)(\s*:)", raw[index + 1:])
            if match:
                output.append(f'{match.group(1)}"{match.group(2)}"{match.group(3)}')
                index += match.end()
        index += 1
    return "".join(output)


def _parse_object_literal(raw):
    quoted = _quote_keys(raw)
    quoted = re.sub(r",\s*([}\]])", r"\1", quoted)
    return json.loads(quoted)


def parse_bugs(path):
    text = Path(path).read_text(encoding="utf-8")
    records = []
    position = 0
    while True:
        call = text.find("bug({", position)
        if call < 0:
            break
        raw, position = _extract_balanced(text, call + 4)
        records.append(_parse_object_literal(raw))
    if not records:
        raise ValueError("no bug records found")
    return records


def _nested_object(raw, key):
    match = re.search(rf"\b{re.escape(key)}\s*:\s*\{{", raw)
    if not match:
        return {}
    value, _ = _extract_balanced(raw, match.end() - 1)
    return _parse_object_literal(value)


def parse_catalog(path):
    text = Path(path).read_text(encoding="utf-8")
    marker = "global.Q4B_ZUKAN_INDEX = {"
    start = text.find(marker)
    if start < 0:
        raise ValueError("Q4B_ZUKAN_INDEX not found")
    raw, _ = _extract_balanced(text, start + len(marker) - 1)
    entries = {}
    index = 1
    while index < len(raw) - 1:
        match = re.search(r'"([^"\\]+)"\s*:\s*\{', raw[index:])
        if not match:
            break
        key = match.group(1)
        object_start = index + match.end() - 1
        entry_raw, index = _extract_balanced(raw, object_start)
        entries[key] = {
            "specimen": _nested_object(entry_raw, "specimen"),
            "source": _nested_object(entry_raw, "source"),
            "image": _nested_object(entry_raw, "image"),
        }
    return entries


def _commit_sha(repository_root):
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repository_root,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _collisions(records, field):
    grouped = defaultdict(list)
    for record in records:
        grouped[record.get(field)].append(record["id"])
    return {key: ids for key, ids in grouped.items() if key and len(ids) > 1}


def _name_index(records, field):
    grouped = defaultdict(list)
    for record in records:
        grouped[record[field]].append(record["id"])
    return dict(grouped)


def _normalized_groups(entries, key, duplicates_only=False):
    grouped = defaultdict(list)
    for entry in entries:
        if entry[key]:
            grouped[entry[key]].append(entry["id"])
    return {
        value: sorted(ids)
        for value, ids in sorted(grouped.items())
        if not duplicates_only or len(ids) > 1
    }


def build_normalized_index(species, commit_sha):
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha):
        raise ValueError("commit_sha must be a 40-character lowercase hex SHA")
    normalized = []
    for item in species:
        names = split_scientific_name(item["canonicalName"])
        normalized.append({"id": item["id"], "jaName": item["jaName"], "japanese": normalize_japanese(item["jaName"]), **names})
    return {
        "sourceCommit": commit_sha,
        "count": len(species),
        "byId": {item["id"]: item for item in normalized},
        "byJapanese": _normalized_groups(normalized, "japanese"),
        "byScientific": _normalized_groups(normalized, "canonical"),
    }


def _genus_review_candidates(species):
    normalized = build_normalized_index(species, "0" * 40)["byId"].values()
    hierarchy = defaultdict(list)
    for item in normalized:
        if item["genus"]:
            hierarchy[item["genus"]].append(item)
    return {
        genus: sorted(item["id"] for item in items)
        for genus, items in sorted(hierarchy.items())
        if len(items) > 1 and any(item["isGenusLevel"] or item["subspecies"] for item in items)
    }


def build_index(repository_root):
    root = Path(repository_root).resolve()
    bugs = parse_bugs(root / "shared" / "bugs.js")
    catalog = parse_catalog(root / "zukan_config" / "zukan_catalog.js")
    commit = _commit_sha(root)
    species = []
    for bug in bugs:
        media = catalog.get(bug["id"], {})
        source = media.get("source", {})
        specimen = media.get("specimen", {})
        image = media.get("image", {})
        species.append({
            "id": bug["id"],
            "jaName": bug["jaName"],
            "scientificName": bug["scientificName"],
            "canonicalName": bug["scientificName"],
            "taxonRank": bug.get("taxonRank", "species"),
            "order": bug.get("order"),
            "family": bug.get("family"),
            "synonyms": [],
            "lifeStageNames": bug.get("lifeStageNames", []),
            "media": {
                "recordId": specimen.get("catalogNumber") or specimen.get("occurrenceId"),
                "institution": specimen.get("institution"),
                "basisOfRecord": specimen.get("basisOfRecord"),
                "recordUrl": source.get("institutionRecordUrl"),
                "mediaUrl": source.get("sourceMediaUrl"),
                "license": source.get("mediaLicense"),
                "displayPath": image.get("display"),
            } if media else None,
        })
    index = {
        "schemaVersion": 1,
        "generatedFromCommit": commit,
        "recordCount": len(species),
        "species": species,
    }
    names = {
        "schemaVersion": 1,
        "generatedFromCommit": commit,
        "byId": {item["id"]: item["id"] for item in species},
        "byJaName": _name_index(species, "jaName"),
        "byScientificName": _name_index(species, "scientificName"),
    }
    anomalies = {
        "id collisions": _collisions(species, "id"),
        "Japanese name collisions": _collisions(species, "jaName"),
        "scientific name collisions": _collisions(species, "scientificName"),
        "non-species registrations": {
            item["id"]: item["scientificName"]
            for item in species
            if item["taxonRank"] != "species"
            or re.search(r"\b(?:sp|spp)\.$", item["scientificName"], re.IGNORECASE)
        },
        "genus, species, and subspecies review candidates": _genus_review_candidates(species),
    }
    return index, names, anomalies


def write_index(repository_root):
    root = Path(repository_root).resolve()
    index, names, anomalies = build_index(root)
    data_root = root / "zukan_foundry" / "data" / "catalog"
    report_path = root / "zukan_foundry" / "reports" / "current_catalog_anomalies.md"
    data_root.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    for path, payload in (
        (data_root / "current_species.json", index),
        (data_root / "current_names_index.json", names),
    ):
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Current catalog anomalies",
        "",
        f"Generated from commit: `{index['generatedFromCommit']}`",
        f"Catalog records: {index['recordCount']}",
    ]
    for heading, findings in anomalies.items():
        lines.extend(["", f"## {heading}", ""])
        lines.extend(
            f"- `{key}`: {', '.join(value) if isinstance(value, list) else value}"
            for key, value in findings.items()
        )
        if not findings:
            lines.append("- None")
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return index["recordCount"]


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository-root", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        count = write_index(args.repository_root)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(count)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
