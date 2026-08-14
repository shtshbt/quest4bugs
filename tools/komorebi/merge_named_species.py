"""命名 batch の出力を bugs.js の小道セクションへ統合する。

Run with:
    python3 tools/komorebi/merge_named_species.py --batch <named_batchN.json> [--dry-run]

命名 batch (写真を見て仮称を付けた種の JSON) から bug({...}) 行を組み立て、
shared/bugs.js の小道セクション末尾へ挿入する。全種に areaOnly と
nameStatus="provisional" を立てる。仮称はまだ volume に属さない在庫であり、
volume manifest に載るまで画面には出ない (POOLS からも図鑑分母からも
areaOnly で除外されるため、本編の数値は動かない)。
"""

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUGS_PATH = ROOT / "shared" / "bugs.js"
SECTION_MARKER = "/* 木漏れ日の小道 fixture (2026-08、areaOnly)。"
FIELD_ORDER = (
    "id", "jaName", "scientificName", "taxonRank", "order", "family",
    "familyJa", "groupJa", "origin", "areaOnly", "nameStatus", "rarity",
    "renderer", "colors", "tags", "habitat", "note", "needsTaxonReview",
    "sizeMm", "sexRatio", "sizeBySexMm",
)

# 目から renderer への既定対応。写真がある種は archetype 描画は fallback にしか
# 使われないが、写真が消えたときに絵が空になるよりはるかによい。
RENDERER_BY_ORDER = {
    "Lepidoptera": "ga", "Coleoptera": "other", "Odonata": "tonbo",
    "Orthoptera": "batta", "Mantodea": "kamakiri", "Phasmida": "nanafushi",
    "Phasmatodea": "nanafushi", "Hymenoptera": "hachi", "Hemiptera": "kamemushi",
    "Diptera": "hae", "Blattodea": "gokiburi", "Trichoptera": "other",
    "Neuroptera": "other", "Mecoptera": "other", "Ephemeroptera": "other",
}

GROUP_BY_ORDER = {
    "Lepidoptera": "ガ", "Coleoptera": "甲虫", "Odonata": "トンボ",
    "Orthoptera": "バッタ", "Mantodea": "カマキリ", "Phasmida": "ナナフシ",
    "Phasmatodea": "ナナフシ", "Hymenoptera": "ハチ・アリ", "Hemiptera": "カメムシ",
    "Diptera": "ハエ・アブ", "Blattodea": "ゴキブリ", "Trichoptera": "トビケラ",
}


def log(message: str) -> None:
    print(f"[merge_named] {message}", file=sys.stderr)


def existing_names_and_ids(source: str) -> tuple[set, set]:
    names = set(re.findall(r'"jaName"\s*:\s*"([^"]+)"', source))
    names |= set(re.findall(r'jaName\s*:\s*"([^"]+)"', source))
    ids = set(re.findall(r'"id"\s*:\s*"([^"]+)"', source))
    ids |= set(re.findall(r'\bid\s*:\s*"([^"]+)"', source))
    return names, ids


def build_entry(row: dict) -> dict:
    order = row["order"]
    entry = {
        "id": row["id"],
        "jaName": row["jaName"],
        "scientificName": row["scientificName"],
        "taxonRank": "species",
        "order": order,
        "family": row.get("family") or "",
        "familyJa": row.get("familyJa") or "",
        "groupJa": GROUP_BY_ORDER.get(order, ""),
        "origin": "overseas",
        "areaOnly": "komorebi",
        # 文献で定着した実在の名前は standard (命名 batch が override で申告する)。
        "nameStatus": row.get("nameStatusOverride") or "provisional",
        # レア度は volume 選抜時に付け直す。在庫段階の既定は N。
        "rarity": "N",
        "renderer": RENDERER_BY_ORDER.get(order, "other"),
        "colors": row["colors"],
        "tags": ["overseas"],
        "habitat": ["forest"],
        # note は featureNote (写真から見た特徴) をそのまま使う。命名根拠と
        # 図鑑の説明が一致していることが仮称の説明責任になる。
        "note": row.get("featureNote", ""),
        "needsTaxonReview": False,
    }
    return entry


def render_line(entry: dict) -> str:
    ordered = {k: entry[k] for k in FIELD_ORDER if k in entry}
    return "    bug(" + json.dumps(ordered, ensure_ascii=False) + "),"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    rows = json.loads(args.batch.read_text(encoding="utf-8"))
    usable = [r for r in rows if r.get("photoSeen") and r.get("jaName")]
    skipped = len(rows) - len(usable)
    log(f"batch {args.batch.name}: {len(usable)} 件を統合、{skipped} 件は写真不良で見送り")

    source = BUGS_PATH.read_text(encoding="utf-8")
    if SECTION_MARKER not in source:
        log(f"小道セクションのマーカーが見つかりません: {SECTION_MARKER}")
        return 1

    names, ids = existing_names_and_ids(source)
    lines = []
    for row in usable:
        if row["id"] in ids:
            log(f"id 重複のため見送り: {row['id']}")
            continue
        if row["jaName"] in names:
            log(f"和名重複のため見送り: {row['jaName']}")
            continue
        for field in ("id", "jaName", "scientificName", "order", "colors"):
            if not row.get(field):
                raise ValueError(f"{row.get('id')}: {field} がありません")
        lines.append(render_line(build_entry(row)))
        names.add(row["jaName"])
        ids.add(row["id"])

    if not lines:
        log("統合できる行がありません")
        return 1

    # 小道セクションは配列の最後にあるので、配列を閉じる "];" の直前へ挿す。
    marker_at = source.index(SECTION_MARKER)
    closing = re.search(r"\n  \];", source[marker_at:])
    if not closing:
        log("挿入位置を特定できません")
        return 1
    insert_at = marker_at + closing.start()

    merged = source[:insert_at] + "\n" + "\n".join(lines) + source[insert_at:]

    if args.dry_run:
        log(f"dry-run: {len(lines)} 行を挿入する予定 (書き込みなし)")
        return 0

    with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=BUGS_PATH.parent,
            suffix=".tmp", delete=False) as handle:
        handle.write(merged)
        temporary = Path(handle.name)
    temporary.replace(BUGS_PATH)
    log(f"{len(lines)} 行を統合しました")
    return 0


if __name__ == "__main__":
    sys.exit(main())
