#!/usr/bin/env python3
"""Write deterministic contact sheets for photo review targets.

Usage: import contact_sheet and call write_contact_sheets(results, out_dir, repo_root)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CELL_SIZE = 256
LABEL_HEIGHT = 20
CAPTION_HEIGHT = 24
SHEET_SIZE = (CELL_SIZE * 4, LABEL_HEIGHT + CELL_SIZE + CAPTION_HEIGHT)


def write_contact_sheets(
    results: list[dict], out_dir: Path, repo_root: Path
) -> tuple[int, int]:
    """Write review target sheets and return written and error counts."""
    target_dir = Path(out_dir) / "contact_sheets"
    target_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    errors = 0
    for result in results:
        if result.get("state") not in {"machine_reject", "review_required"}:
            continue
        try:
            sheet = _build_sheet(result, Path(repo_root))
            try:
                target = target_dir / _filename(result)
                sheet.save(target, format="PNG", optimize=False)
            finally:
                sheet.close()
            count += 1
        except Exception as error:  # noqa: BLE001
            errors += 1
            fixture = f"{result.get('speciesId', '')}/{result.get('variant', '')}"
            print(f"contact sheet error for {fixture}: {error}", file=sys.stderr)
    return count, errors


def _build_sheet(result: dict, repo_root: Path) -> Image.Image:
    sheet = Image.new("RGB", SHEET_SIZE, "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    roles = (("resized", "original"), ("display", "processed"), ("thumb54", "thumb54"))
    for index, (role, label) in enumerate(roles):
        _draw_image_cell(sheet, draw, font, index, label, result, role, repo_root)
    _draw_candidate_cell(draw, font, 3)
    caption = f"{result.get('speciesId', '')} [{result.get('variant', '')}] {result.get('state', '')}"
    _draw_centered(draw, caption, (0, LABEL_HEIGHT + CELL_SIZE, SHEET_SIZE[0], SHEET_SIZE[1]), font)
    return sheet


def _draw_image_cell(
    sheet: Image.Image,
    draw: ImageDraw.ImageDraw,
    font: ImageFont.ImageFont,
    index: int,
    label: str,
    result: dict,
    role: str,
    repo_root: Path,
) -> None:
    left = index * CELL_SIZE
    path = str(result.get("files", {}).get(role, {}).get("path") or "")
    draw.text((left + 4, 4), label, fill="black", font=font)
    if not path:
        draw.text((left + 4, LABEL_HEIGHT + 4), "missing", fill="black", font=font)
        return
    try:
        with Image.open(repo_root / path) as source:
            source.load()
            resampling = Image.Resampling.NEAREST if role == "thumb54" else Image.Resampling.LANCZOS
            rendered = source.convert("RGBA")
            rendered.thumbnail((CELL_SIZE, CELL_SIZE), resampling)
            x = left + (CELL_SIZE - rendered.width) // 2
            y = LABEL_HEIGHT + (CELL_SIZE - rendered.height) // 2
            sheet.paste(rendered, (x, y), rendered)
    except Exception:  # noqa: BLE001
        draw.rectangle((left, LABEL_HEIGHT, left + CELL_SIZE - 1, LABEL_HEIGHT + CELL_SIZE - 1), fill="white")
        draw.text((left + 4, LABEL_HEIGHT + 4), "missing", fill="black", font=font)


def _draw_candidate_cell(
    draw: ImageDraw.ImageDraw, font: ImageFont.ImageFont, index: int
) -> None:
    left = index * CELL_SIZE
    draw.text((left + 4, 4), "candidate", fill="black", font=font)
    bounds = (left, LABEL_HEIGHT, left + CELL_SIZE, LABEL_HEIGHT + CELL_SIZE)
    _draw_with_ascii_fallback(
        draw,
        "候補なし (zukan-fetch 未実行)",
        "no candidate (zukan-fetch not run)",
        bounds,
        font,
    )


def _draw_with_ascii_fallback(
    draw: ImageDraw.ImageDraw,
    text: str,
    fallback: str,
    bounds: tuple[int, int, int, int],
    font: ImageFont.ImageFont,
) -> None:
    try:
        text.encode("latin-1")
        _draw_centered(draw, text, bounds, font)
    except UnicodeEncodeError:
        _draw_centered(draw, fallback, bounds, font)


def _draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    bounds: tuple[int, int, int, int],
    font: ImageFont.ImageFont,
) -> None:
    text_bounds = draw.textbbox((0, 0), text, font=font)
    width = text_bounds[2] - text_bounds[0]
    height = text_bounds[3] - text_bounds[1]
    x = bounds[0] + (bounds[2] - bounds[0] - width) // 2
    y = bounds[1] + (bounds[3] - bounds[1] - height) // 2
    draw.text((x, y), text, fill="black", font=font)


def _filename(result: dict) -> str:
    species_id = _safe_component(str(result.get("speciesId") or "unknown"))
    variant = _safe_component(str(result.get("variant") or "default"))
    return f"{species_id}__{variant}.png"


def _safe_component(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    return safe or "unknown"
