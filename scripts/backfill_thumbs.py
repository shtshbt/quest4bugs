#!/usr/bin/env python3
"""zukan_catalog.js が参照しているのに実体が無い thumb を display から作り直す。

2026-06-22〜23 の chunk_b / bulk migrate 系 3 commit (d9c936c / 466016b /
6cd52c8) は `processed/<catalog>_L2_grade.webp` を追加しながら
`thumb/<catalog>_{54,108,216}.webp` を 1 枚も追加しておらず、その 324 種は
公開 catalog から参照されたまま実体が存在しない状態が続いていた
(git 履歴上も一度も存在しない = 生成漏れ)。

生成は zukan-svg の `build_zukan_card.write_thumbnails()` をそのまま呼ぶ。
display (L2 webp) は既に segmentation + color grade 済みで catalog が配信して
いる画像そのものなので、thumb はそこから縮小するのが唯一整合する経路になる。

  python3 scripts/backfill_thumbs.py            # 不足分を数えるだけ
  python3 scripts/backfill_thumbs.py --write    # 実際に生成する

要 Pillow: /home/shota/.cache/zukan_venv/bin/python3 で実行する。
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CATALOG = REPO / "zukan_config" / "zukan_catalog.js"
OUT_ROOT = REPO / "zukan_cards"
BUILD_SCRIPT_DIR = Path.home() / ".claude/skills/zukan-svg"

THUMB_FIELDS = {"thumb54": 54, "thumb108": 108, "thumb216": 216}
THUMB_NAME_RE = re.compile(r"^(?P<stem>.+)_(?:54|108|216)\.webp$")

# catalog.js は IIFE なので node に食わせて JSON で受け取る。
_DUMP_JS = """
const fs = require('fs');
global.window = global;
eval(fs.readFileSync(process.argv[1], 'utf8'));
process.stdout.write(JSON.stringify(global.Q4B_ZUKAN_INDEX));
"""


def load_catalog() -> dict:
    out = subprocess.run(
        ["node", "-e", _DUMP_JS, str(CATALOG)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def missing_thumbs(index: dict) -> dict[str, list[Path]]:
    """{display 相対パス: [作るべき thumb の絶対パス, ...]} を返す。"""
    work: dict[str, list[Path]] = {}
    for entry in index.values():
        for key in ("image", "image_female"):
            img = entry.get(key)
            if not img:
                continue
            display = img.get("display")
            if not display:
                continue
            lacking = [
                REPO / img[f] for f in THUMB_FIELDS
                if img.get(f) and not (REPO / img[f]).exists()
            ]
            if lacking:
                work.setdefault(display, [])
                for p in lacking:
                    if p not in work[display]:
                        work[display].append(p)
    return work


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true",
                    help="実際に thumb を書き出す (既定は数えるだけ)")
    args = ap.parse_args()

    index = load_catalog()
    work = missing_thumbs(index)
    total = sum(len(v) for v in work.values())
    print(f"catalog entries      : {len(index)}", file=sys.stderr)
    print(f"thumb 欠損の display : {len(work)}", file=sys.stderr)
    print(f"生成すべき thumb     : {total}", file=sys.stderr)

    no_display = [d for d in work if not (REPO / d).exists()]
    if no_display:
        print(f"display 自体が無く再生成できない: {len(no_display)}", file=sys.stderr)
        for d in no_display:
            print(f"  {d}", file=sys.stderr)

    if not args.write:
        return 0

    sys.path.insert(0, str(BUILD_SCRIPT_DIR))
    from PIL import Image  # noqa: E402
    from build_zukan_card import write_thumbnails  # noqa: E402

    written = 0
    failed: list[tuple[str, str]] = []
    for display, wanted in sorted(work.items()):
        src = REPO / display
        if not src.exists():
            failed.append((display, "display missing"))
            continue
        # 生成先の catalog stem は thumb のファイル名から取る (display の stem と
        # 一致しない entry があっても catalog の指すパスを正とする)。
        stems = {THUMB_NAME_RE.match(p.name).group("stem") for p in wanted
                 if THUMB_NAME_RE.match(p.name)}
        thumb_dir = wanted[0].parent
        try:
            with Image.open(src) as im:
                l2 = im.convert("RGBA")
            for stem in sorted(stems):
                write_thumbnails(l2, thumb_dir, stem, out_root=OUT_ROOT)
        except Exception as e:  # noqa: BLE001 — 1 枚の失敗で全体を止めない
            failed.append((display, f"{type(e).__name__}: {e}"))
            continue
        written += sum(1 for p in wanted if p.exists())

    print(f"生成した thumb       : {written}", file=sys.stderr)
    if failed:
        print(f"失敗                 : {len(failed)}", file=sys.stderr)
        for d, why in failed:
            print(f"  {d}: {why}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
