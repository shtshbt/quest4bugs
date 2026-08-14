"""Merge honpen batch 1 entries into shared/bugs.js.

Run with:
    /home/shota/.cache/zukan_venv/bin/python3 tools/honpen_release/merge_batch_entries.py
"""

import json
import os
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "zukan_foundry" / "data" / "species_reserve"

# 弾は環境変数で切り替える。validate 側と同じ規約にしてあり、2 つを違う弾で
# 走らせる事故を防ぐため既定は 1 で揃えている。
BATCH = int(os.environ.get("HONPEN_BATCH", "1"))
ENTRY_FILES = tuple(
    DATA_DIR / f"honpen_batch{BATCH}_entries_{subject}.jsonl"
    for subject in ("keisan", "kanji", "eitango")
)
BUGS_PATH = ROOT / "shared" / "bugs.js"
SECTION_MARKER = f"/* 本編拡張 第{BATCH}弾 (2026-08) */"
MASTER_MARKER = "/* ==== マスター虫＋特別追加 (+24) ==== */"
FIELD_ORDER = (
    "id", "jaName", "scientificName", "taxonRank", "order", "family",
    "subfamily", "tribe", "familyJa", "groupJa", "origin", "rarity",
    "renderer", "colors", "tags", "season", "habitat", "caution",
    "sexDimorphism", "sexDimorphismNote", "note", "needsTaxonReview",
    "sizeMm", "sexRatio", "sizeBySexMm",
)


def load_entries():
    entries = []
    for path in ENTRY_FILES:
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            try:
                entry = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path.name}:{line_number}: {exc}") from exc
            if not isinstance(entry, dict):
                raise ValueError(f"{path.name}:{line_number}: entry must be a JSON object")
            unknown = set(entry) - set(FIELD_ORDER)
            if unknown:
                raise ValueError(f"{path.name}:{line_number}: unknown fields {sorted(unknown)}")
            entries.append(entry)
    # 第 1 弾だけウラミスシジミ (性語尾違いの重複) を除外して 149 件になっている。
    expected = 149 if BATCH == 1 else 150
    if len(entries) != expected:
        raise ValueError(f"expected {expected} entries, got {len(entries)}")
    return entries


def render_entry(entry):
    ordered = {key: entry[key] for key in FIELD_ORDER if key in entry}
    return "    bug(" + json.dumps(ordered, ensure_ascii=False, separators=(",", ":")) + "),"


def write_atomic(path, content):
    mode = path.stat().st_mode
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    os.chmod(temporary_path, mode)
    os.replace(temporary_path, path)


def main():
    try:
        entries = load_entries()
        source = BUGS_PATH.read_text(encoding="utf-8")
        if SECTION_MARKER in source:
            if source.count(SECTION_MARKER) != 1:
                raise ValueError("batch section marker is not unique")
            print("PASS batch section already inserted", file=sys.stderr)
            return 0
        if source.count(MASTER_MARKER) != 1:
            raise ValueError("master section marker is not unique")
        section = SECTION_MARKER + "\n" + "\n".join(render_entry(entry) for entry in entries) + "\n"
        write_atomic(BUGS_PATH, source.replace(MASTER_MARKER, section + MASTER_MARKER))
    except (OSError, ValueError) as exc:
        print(f"ERROR {exc}", file=sys.stderr)
        return 1
    print(f"PASS merged {len(entries)} entries into {BUGS_PATH}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
