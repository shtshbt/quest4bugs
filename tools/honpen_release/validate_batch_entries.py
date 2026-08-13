"""Validate honpen batch 1 entries.

Run with:
    /home/shota/.cache/zukan_venv/bin/python3 tools/honpen_release/validate_batch_entries.py
"""

import json
import math
import os
import re
import sys
import tempfile
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "zukan_foundry" / "data" / "species_reserve"
ENTRY_FILES = {
    DATA_DIR / "honpen_batch1_entries_keisan.jsonl": 50,
    DATA_DIR / "honpen_batch1_entries_kanji.jsonl": 49,
    DATA_DIR / "honpen_batch1_entries_eitango.jsonl": 50,
}
SELECTION_PATH = DATA_DIR / "honpen_selection_v1.json"
BUGS_PATH = ROOT / "shared" / "bugs.js"
REPORT_PATH = ROOT / "zukan_foundry" / "reports" / "honpen_batch1_review_flags.md"
SECTION_MARKER = "/* 本編拡張 第1弾 (2026-08) */"
MASTER_MARKER = "/* ==== マスター虫＋特別追加 (+24) ==== */"
EXCLUDED_SCIENTIFIC_NAME = "Wagimo signata"
REQUIRED_FIELDS = {
    "id", "jaName", "scientificName", "order", "family", "familyJa",
    "groupJa", "rarity", "colors", "note", "tags",
}
ID_PATTERN = re.compile(r"[a-z]+(?:_[a-z]+)*")
HEX_PATTERN = re.compile(r"#[0-9A-Fa-f]{6}")


def load_entries(errors):
    entries = []
    total_lines = 0
    for path, expected_count in ENTRY_FILES.items():
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError as exc:
            errors.append(f"{path}: {exc}")
            continue
        total_lines += len(lines)
        if len(lines) != expected_count:
            errors.append(f"{path.name}: expected {expected_count} lines, got {len(lines)}")
        for line_number, line in enumerate(lines, 1):
            try:
                entry = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"{path.name}:{line_number}: {exc}")
                continue
            if not isinstance(entry, dict):
                errors.append(f"{path.name}:{line_number}: entry must be a JSON object")
                continue
            entries.append((path.name, line_number, entry))
    if total_lines != 149:
        errors.append(f"JSONL total: expected 149 lines, got {total_lines}")
    return entries


def load_selection(errors):
    try:
        selection = json.loads(SELECTION_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{SELECTION_PATH}: {exc}")
        return []
    if not isinstance(selection, list):
        errors.append(f"{SELECTION_PATH}: top level must be a JSON array")
        return []
    return [item for item in selection if isinstance(item, dict) and item.get("batch") == 1]


def existing_source(errors):
    try:
        source = BUGS_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"{BUGS_PATH}: {exc}")
        return ""
    if SECTION_MARKER in source:
        if source.count(SECTION_MARKER) != 1 or source.count(MASTER_MARKER) != 1:
            errors.append("bugs.js batch or master section marker is not unique")
            return ""
        start = source.index(SECTION_MARKER)
        end = source.index(MASTER_MARKER, start)
        source = source[:start] + source[end:]
    return source


def normalize_ja_name(name):
    return re.sub(r"（[^）]*）|\([^)]*\)", "", name).strip()


def canonical_scientific_name(name):
    return " ".join(name.split()[:2])


def validate_uniqueness(entries, source, errors):
    ids = [entry.get("id") for _, _, entry in entries if isinstance(entry.get("id"), str)]
    existing_ids = set(re.findall(r'(?:"id"|id)\s*:\s*"([^"]+)"', source))
    for species_id in ids:
        if ID_PATTERN.fullmatch(species_id) is None:
            errors.append(f"id format: {species_id}")
        if species_id in existing_ids:
            errors.append(f"id already exists: {species_id}")
    for species_id, count in Counter(ids).items():
        if count > 1:
            errors.append(f"duplicate batch id: {species_id}")
    names = [normalize_ja_name(entry["jaName"]) for _, _, entry in entries if isinstance(entry.get("jaName"), str)]
    existing_names = {normalize_ja_name(name) for name in re.findall(r'(?:"jaName"|jaName)\s*:\s*"([^"]+)"', source)}
    for name in names:
        if name in existing_names:
            errors.append(f"jaName already exists: {name}")
    for name, count in Counter(names).items():
        if count > 1:
            errors.append(f"duplicate batch jaName: {name}")


def validate_selection(entries, selection, errors):
    selected_names = [canonical_scientific_name(item.get("scientificName", "")) for item in selection]
    entry_names = [entry.get("scientificName") for _, _, entry in entries if isinstance(entry.get("scientificName"), str)]
    if len(selection) != 150:
        errors.append(f"batch 1 selection: expected 150 entries, got {len(selection)}")
    for name, count in Counter(selected_names).items():
        if count != 1:
            errors.append(f"selection scientificName count for {name}: {count}")
    expected = set(selected_names) - {EXCLUDED_SCIENTIFIC_NAME}
    if EXCLUDED_SCIENTIFIC_NAME not in selected_names:
        errors.append(f"selection is missing excluded species: {EXCLUDED_SCIENTIFIC_NAME}")
    if Counter(entry_names) != Counter(expected):
        missing = sorted(expected - set(entry_names))
        extra = sorted(set(entry_names) - expected)
        errors.append(f"scientificName mismatch: missing={missing}, extra={extra}")
    rarity_by_name = {canonical_scientific_name(item.get("scientificName", "")): item.get("rarity") for item in selection}
    for _, _, entry in entries:
        if entry.get("scientificName") in rarity_by_name and entry.get("rarity") != rarity_by_name[entry["scientificName"]]:
            errors.append(f"rarity mismatch for {entry['scientificName']}: {entry.get('rarity')} != {rarity_by_name[entry['scientificName']]}")


def validate_values(entries, errors):
    for file_name, line_number, entry in entries:
        label = f"{file_name}:{line_number}"
        missing = sorted(REQUIRED_FIELDS - entry.keys())
        if missing:
            errors.append(f"{label}: missing required fields {missing}")
        rarity = entry.get("rarity")
        if rarity not in {"N", "R", "SR", "SSR"}:
            errors.append(f"{label}: invalid rarity {rarity!r}")
        size = entry.get("sizeMm")
        if not (isinstance(size, list) and len(size) == 2 and all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in size) and 0 < size[0] < size[1] <= 300):
            errors.append(f"{label}: invalid sizeMm {size!r}")
        colors = entry.get("colors")
        if not (isinstance(colors, list) and len(colors) == 2 and all(isinstance(value, str) and HEX_PATTERN.fullmatch(value) for value in colors)):
            errors.append(f"{label}: invalid colors {colors!r}")
        ratio = entry.get("sexRatio")
        if not (isinstance(ratio, dict) and set(ratio) == {"m", "f"} and all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in ratio.values()) and math.isclose(ratio["m"] + ratio["f"], 1.0)):
            errors.append(f"{label}: invalid sexRatio {ratio!r}")


def write_review_flags(entries):
    night = [entry for _, _, entry in entries if isinstance(entry.get("note"), str) and "夜" in entry["note"]]
    taxon = [entry for _, _, entry in entries if entry.get("needsTaxonReview") is True]
    lines = ["# 本編図鑑拡張 第1弾 review flags", "", "## note に「夜」を含む種", ""]
    lines.extend([f"- `{entry['id']}` — {entry['jaName']}: {entry['note']}" for entry in night] or ["- なし"])
    lines.extend(["", "## needsTaxonReview=true", ""])
    lines.extend([f"- `{entry['id']}` — {entry['jaName']} (`{entry['scientificName']}`)" for entry in taxon] or ["- なし"])
    content = "\n".join(lines) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=REPORT_PATH.parent, delete=False) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, REPORT_PATH)
    return night, taxon


def main():
    errors = []
    entries = load_entries(errors)
    selection = load_selection(errors)
    source = existing_source(errors)
    validate_uniqueness(entries, source, errors)
    validate_selection(entries, selection, errors)
    validate_values(entries, errors)
    try:
        night, taxon = write_review_flags(entries)
    except OSError as exc:
        errors.append(f"{REPORT_PATH}: {exc}")
        night, taxon = [], []
    print(f"WARNING note contains 夜: {', '.join(entry['id'] for entry in night)}", file=sys.stderr)
    print(f"WARNING needsTaxonReview=true: {', '.join(entry['id'] for entry in taxon)}", file=sys.stderr)
    if errors:
        for error in errors:
            print(f"ERROR {error}", file=sys.stderr)
        return 1
    print(f"PASS validated {len(entries)} entries; review flags written to {REPORT_PATH}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
