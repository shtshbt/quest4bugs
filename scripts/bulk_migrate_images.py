#!/usr/bin/env python3
"""bulk_migrate_images.py

One-shot cleanup migration for zukan card images:

  1. Resize each zukan_cards/original/*_original.* to <= 1000 px on the longer
     edge and save as zukan_cards/original/<cat>_resized.jpg (jpg quality 85).
  2. Archive the original *_original.* files into
     zukan_cards/_archive/original_<archive_tag>_<timestamp>.zip (flat paths),
     then delete the individual *_original.* files on archive success.
  3. Delete all zukan_cards/processed/*_L1_segmented.png (game-unused, ~310 MB).
  4. Rewrite zukan_config/zukan_catalog.js image{} blocks:
       - rename `original:` -> `resized:` (path -> .jpg)
       - drop `segmented:` line
     (also covers image_female{} blocks). A backup is written to
     zukan_config/zukan_catalog_pre_migrate.js before editing.
  5. Rewrite each zukan_cards/metadata/*.json:
       - rename files.original -> files.resized (path -> .jpg)
       - drop files.segmented
  6. Append two ignore lines to the project-root .gitignore (dedup-safe).
  7. Print a JSON summary to stdout.

Concurrency safety: a snapshot of the file list is taken at script startup;
any file added later (e.g. by an in-flight chunk_b fan-out) is *not* touched.

CLI:
  python3 scripts/bulk_migrate_images.py [--dry-run] [--archive-tag chunk_a]

Notes:
  - SHA-256 of the source image is already recorded in metadata.json
    (original_sha256); not modified here.
  - If zip creation fails, the per-file deletion in step 2 is skipped
    (safe fallback) and the issue is reported in summary.notes.
  - Intended to run under the zukan venv interpreter:
        /home/shota/.cache/zukan_venv/bin/python3 scripts/bulk_migrate_images.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ZUKAN_DIR = PROJECT_ROOT / "zukan_cards"
ORIGINAL_DIR = ZUKAN_DIR / "original"
PROCESSED_DIR = ZUKAN_DIR / "processed"
METADATA_DIR = ZUKAN_DIR / "metadata"
ARCHIVE_DIR = ZUKAN_DIR / "_archive"
CATALOG_JS = PROJECT_ROOT / "zukan_config" / "zukan_catalog.js"
CATALOG_BACKUP = PROJECT_ROOT / "zukan_config" / "zukan_catalog_pre_migrate.js"
GITIGNORE = PROJECT_ROOT / ".gitignore"

RESIZE_MAX = 1000
JPG_QUALITY = 85

GITIGNORE_LINES = [
    "zukan_cards/processed/*_L1_segmented.png",
    "zukan_cards/_pipeline/",
]


def log(msg: str) -> None:
    """stderr log (stdout reserved for JSON summary)."""
    print(msg, file=sys.stderr, flush=True)


# --------------------------------------------------------------------------
# Step 1 + 2: resize originals, then zip-archive + delete sources
# --------------------------------------------------------------------------
def step_resize_and_archive(
    originals: List[Path],
    archive_tag: str,
    timestamp: str,
    dry_run: bool,
) -> Dict:
    """Resize each original to <=1000px (longer edge) as <cat>_resized.jpg,
    then archive the source files into a single zip and delete them."""
    from PIL import Image  # local import: optional dep in some envs

    resized_count = 0
    skipped_count = 0
    failed: List[str] = []
    bytes_before = 0
    bytes_after = 0
    archived_files: List[Tuple[Path, str]] = []  # (abs_path, arcname)

    for src in originals:
        cat = src.name.rsplit("_original.", 1)[0]
        dst = ORIGINAL_DIR / f"{cat}_resized.jpg"

        try:
            src_size = src.stat().st_size
        except FileNotFoundError:
            skipped_count += 1
            continue

        if dst.exists():
            # already resized in a previous run — still archive the source
            bytes_before += src_size
            try:
                bytes_after += dst.stat().st_size
            except FileNotFoundError:
                pass
            archived_files.append((src, f"{cat}_original{src.suffix.lower()}"))
            skipped_count += 1
            continue

        if dry_run:
            bytes_before += src_size
            archived_files.append((src, f"{cat}_original{src.suffix.lower()}"))
            resized_count += 1
            continue

        try:
            with Image.open(src) as im:
                im.load()
                # convert to RGB to keep jpg-safe
                if im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")
                w, h = im.size
                longer = max(w, h)
                if longer > RESIZE_MAX:
                    scale = RESIZE_MAX / float(longer)
                    new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
                    im = im.resize(new_size, Image.LANCZOS)
                im.save(dst, format="JPEG", quality=JPG_QUALITY, optimize=True)
            bytes_before += src_size
            bytes_after += dst.stat().st_size
            archived_files.append((src, f"{cat}_original{src.suffix.lower()}"))
            resized_count += 1
        except Exception as e:  # noqa: BLE001
            failed.append(f"{src.name}: {e}")
            log(f"  [warn] resize failed for {src.name}: {e}")

    # ---- Step 2: build archive zip ----
    zip_path = ARCHIVE_DIR / f"original_{archive_tag}_{timestamp}.zip"
    archive_ok = False
    archive_size = 0

    if dry_run:
        archive_ok = True  # pretend
        log(f"  [dry-run] would archive {len(archived_files)} files into {zip_path}")
    elif archived_files:
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        try:
            # ZIP_STORED — jpgs are already compressed, no gain from DEFLATE
            with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as zf:
                for src, arcname in archived_files:
                    if src.exists():
                        zf.write(src, arcname=arcname)
            archive_size = zip_path.stat().st_size
            archive_ok = True
        except Exception as e:  # noqa: BLE001
            failed.append(f"archive zip failed: {e}")
            log(f"  [error] archive zip failed: {e}")
            archive_ok = False

    # ---- Step 2b: delete source files (only if archive succeeded) ----
    deleted = 0
    if archive_ok and not dry_run:
        for src, _arcname in archived_files:
            try:
                if src.exists():
                    src.unlink()
                    deleted += 1
            except Exception as e:  # noqa: BLE001
                failed.append(f"delete {src.name}: {e}")

    return {
        "resized_count": resized_count,
        "skipped_count": skipped_count,
        "failed": failed,
        "bytes_before": bytes_before,
        "bytes_after": bytes_after,
        "bytes_saved": max(0, bytes_before - bytes_after),
        "archive_path": str(zip_path),
        "archive_ok": archive_ok,
        "archive_size": archive_size,
        "archived_file_count": len(archived_files),
        "originals_deleted": deleted,
    }


# --------------------------------------------------------------------------
# Step 3: delete L1 segmented PNGs
# --------------------------------------------------------------------------
def step_delete_l1(l1_files: List[Path], dry_run: bool) -> Dict:
    deleted = 0
    bytes_freed = 0
    failed: List[str] = []
    for p in l1_files:
        try:
            sz = p.stat().st_size
        except FileNotFoundError:
            continue
        if dry_run:
            deleted += 1
            bytes_freed += sz
            continue
        try:
            p.unlink()
            deleted += 1
            bytes_freed += sz
        except Exception as e:  # noqa: BLE001
            failed.append(f"{p.name}: {e}")
    return {"deleted_count": deleted, "bytes_freed": bytes_freed, "failed": failed}


# --------------------------------------------------------------------------
# Step 4: rewrite zukan_catalog.js image{} blocks
# --------------------------------------------------------------------------
# Each entry looks like (image or image_female):
#   image: {
#     version: "1",
#     display: "...",
#     segmented: "zukan_cards/processed/<cat>_L1_segmented.png",
#     original: "zukan_cards/original/<cat>_original.jpg",
#     thumb54: "...",
#     thumb108: "...",
#     thumb216: "..."
#   },
IMAGE_BLOCK_RE = re.compile(
    r"(?P<indent>[ \t]*)(?P<key>image|image_female)\s*:\s*\{(?P<body>.*?)\}",
    flags=re.DOTALL,
)
SEGMENTED_LINE_RE = re.compile(
    r"^[ \t]*segmented\s*:\s*\"[^\"]*\"\s*,?\s*\n",
    flags=re.MULTILINE,
)
ORIGINAL_LINE_RE = re.compile(
    r"(?P<indent>^[ \t]*)original(?P<gap>\s*:\s*)\"(?P<path>[^\"]+)\"",
    flags=re.MULTILINE,
)


def _convert_original_path(path: str) -> str:
    """zukan_cards/original/<cat>_original.<ext> -> zukan_cards/original/<cat>_resized.jpg"""
    new = re.sub(r"_original\.(jpg|jpeg|png|webp|tif|tiff)$", "_resized.jpg", path, flags=re.IGNORECASE)
    return new


def _rewrite_image_block(match: re.Match) -> str:
    indent = match.group("indent")
    key = match.group("key")
    body = match.group("body")

    # drop segmented line
    body2 = SEGMENTED_LINE_RE.sub("", body)

    # rename original -> resized (and fix extension)
    def _orig_sub(m: re.Match) -> str:
        return f"{m.group('indent')}resized{m.group('gap')}\"{_convert_original_path(m.group('path'))}\""

    body3 = ORIGINAL_LINE_RE.sub(_orig_sub, body2)

    return f"{indent}{key}: {{{body3}}}"


def step_rewrite_catalog(dry_run: bool) -> Dict:
    text = CATALOG_JS.read_text(encoding="utf-8")
    blocks_found = len(IMAGE_BLOCK_RE.findall(text))
    new_text, n_subs = IMAGE_BLOCK_RE.subn(_rewrite_image_block, text)

    if not dry_run:
        # write backup once (do not overwrite an existing pre-migrate backup)
        if not CATALOG_BACKUP.exists():
            CATALOG_BACKUP.write_text(text, encoding="utf-8")
        CATALOG_JS.write_text(new_text, encoding="utf-8")

    return {
        "blocks_found": blocks_found,
        "blocks_rewritten": n_subs,
        "backup_path": str(CATALOG_BACKUP),
    }


# --------------------------------------------------------------------------
# Step 5: rewrite metadata/*.json
# --------------------------------------------------------------------------
def step_rewrite_metadata(json_files: List[Path], dry_run: bool) -> Dict:
    updated = 0
    skipped = 0
    failed: List[str] = []
    for jp in json_files:
        try:
            data = json.loads(jp.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            failed.append(f"{jp.name}: read {e}")
            continue
        files = data.get("files")
        if not isinstance(files, dict):
            skipped += 1
            continue
        if "original" not in files and "resized" in files and "segmented" not in files:
            skipped += 1
            continue

        if "original" in files:
            files["resized"] = _convert_original_path(files.pop("original"))
        if "segmented" in files:
            files.pop("segmented")

        if dry_run:
            updated += 1
            continue
        try:
            jp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            updated += 1
        except Exception as e:  # noqa: BLE001
            failed.append(f"{jp.name}: write {e}")
    return {"updated_count": updated, "skipped_count": skipped, "failed": failed}


# --------------------------------------------------------------------------
# Step 6: append .gitignore lines (dedup-safe)
# --------------------------------------------------------------------------
def step_update_gitignore(dry_run: bool) -> Dict:
    if not GITIGNORE.exists():
        existing = ""
    else:
        existing = GITIGNORE.read_text(encoding="utf-8")
    existing_lines = {ln.strip() for ln in existing.splitlines()}
    to_add = [ln for ln in GITIGNORE_LINES if ln not in existing_lines]

    if to_add and not dry_run:
        suffix = ""
        if existing and not existing.endswith("\n"):
            suffix += "\n"
        suffix += "\n# bulk_migrate_images cleanup (2026)\n"
        for ln in to_add:
            suffix += ln + "\n"
        with GITIGNORE.open("a", encoding="utf-8") as f:
            f.write(suffix)

    return {"added": to_add, "already_present": [ln for ln in GITIGNORE_LINES if ln in existing_lines]}


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="report-only; do not modify files")
    ap.add_argument("--archive-tag", default="chunk_a", help="archive zip name tag (e.g. chunk_a / chunk_b)")
    args = ap.parse_args()

    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    notes: List[str] = []

    if not ORIGINAL_DIR.exists():
        print(json.dumps({"ok": False, "error": f"missing dir: {ORIGINAL_DIR}"}, ensure_ascii=False))
        return 2

    # ---- snapshot file lists at startup (chunk_b safety) ----
    originals_snapshot = sorted(
        p for p in ORIGINAL_DIR.iterdir()
        if p.is_file() and re.search(r"_original\.[A-Za-z0-9]+$", p.name)
    )
    l1_snapshot = sorted(PROCESSED_DIR.glob("*_L1_segmented.png")) if PROCESSED_DIR.exists() else []
    metadata_snapshot = sorted(METADATA_DIR.glob("*.json")) if METADATA_DIR.exists() else []

    log(f"[snapshot] originals={len(originals_snapshot)} l1_pngs={len(l1_snapshot)} metadata={len(metadata_snapshot)}")
    log(f"[mode] {'DRY-RUN' if args.dry_run else 'LIVE'} archive_tag={args.archive_tag} timestamp={timestamp}")

    # ---- step 1 + 2 ----
    log("[step 1+2] resize originals -> _resized.jpg, archive sources")
    r12 = step_resize_and_archive(originals_snapshot, args.archive_tag, timestamp, args.dry_run)
    if not r12["archive_ok"]:
        notes.append("archive zip failed; source _original.* files retained for safety")

    # ---- step 3 ----
    log("[step 3] delete L1 segmented PNGs")
    r3 = step_delete_l1(l1_snapshot, args.dry_run)

    # ---- step 4 ----
    log("[step 4] rewrite zukan_catalog.js image blocks")
    r4 = step_rewrite_catalog(args.dry_run)

    # ---- step 5 ----
    log("[step 5] rewrite metadata/*.json files block")
    r5 = step_rewrite_metadata(metadata_snapshot, args.dry_run)

    # ---- step 6 ----
    log("[step 6] update .gitignore")
    r6 = step_update_gitignore(args.dry_run)

    summary = {
        "ok": True,
        "dry_run": args.dry_run,
        "archive_tag": args.archive_tag,
        "timestamp": timestamp,
        "snapshot": {
            "originals": len(originals_snapshot),
            "l1_pngs": len(l1_snapshot),
            "metadata_jsons": len(metadata_snapshot),
        },
        "step1_2_resize_archive": r12,
        "step3_l1_delete": r3,
        "step4_catalog": r4,
        "step5_metadata": r5,
        "step6_gitignore": r6,
        "notes": notes,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
