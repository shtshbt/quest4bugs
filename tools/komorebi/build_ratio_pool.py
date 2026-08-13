"""Build the kom_ratio runtime pool from the authored JSON source files.

The files under komorebi/data remain the source of truth. This build step only
concatenates their arrays and sorts the result by item id.

Run:
    python3 tools/komorebi/build_ratio_pool.py
"""

import argparse
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = REPO_ROOT / "komorebi" / "data"
DEFAULT_OUT = REPO_ROOT / "komorebi" / "assets" / "ratio_pool.json"


def load_items(paths):
    """Load source arrays while rejecting malformed or duplicate item ids."""
    items = []
    seen_ids = set()
    for path in paths:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise ValueError(f"{path}: JSON を読み込めません: {error}") from error
        if not isinstance(payload, list):
            raise ValueError(f"{path}: 最上位は配列である必要があります")
        for item in payload:
            item_id = item.get("id") if isinstance(item, dict) else None
            if not isinstance(item_id, str) or not item_id:
                raise ValueError(f"{path}: 空または不正な item id があります")
            if item_id in seen_ids:
                raise ValueError(f"{path}: item id が重複しています: {item_id}")
            seen_ids.add(item_id)
            items.append(item)
    return sorted(items, key=lambda item: item["id"])


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build the kom_ratio runtime pool")
    parser.add_argument("paths", nargs="*", type=Path,
                        help="authored JSON files (default: komorebi/data/*.json)")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)

    paths = sorted(args.paths or DEFAULT_SOURCE_DIR.glob("*.json"))
    if not paths:
        parser.error("割合問題のソース JSON がありません")

    try:
        items = load_items(paths)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(
            json.dumps(items, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
    except (OSError, ValueError) as error:
        parser.error(str(error))

    print(f"{args.out}: {len(items)} items from {len(paths)} source files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
