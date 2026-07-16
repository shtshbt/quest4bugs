#!/usr/bin/env python3
"""Exception-safe Pillow image inspection.

Usage: import imaging and call probe_file(Path("image.webp"))
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat

BLOB_SIGNIFICANCE_RATIO = 0.25


def probe_file(path: Path | str) -> dict:
    """Return filesystem, digest, and decode metadata without raising."""
    file_path = Path(path)
    result = {
        "path": str(file_path),
        "exists": False,
        "sha256": "",
        "bytes": 0,
        "width": 0,
        "height": 0,
        "mode": "",
        "decodable": False,
        "error": "",
    }
    try:
        if not file_path.is_file():
            return result
        result["exists"] = True
        digest = hashlib.sha256()
        with file_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        result["sha256"] = digest.hexdigest()
        result["bytes"] = file_path.stat().st_size
        with Image.open(file_path) as image:
            image.load()
            result["width"], result["height"] = image.size
            result["mode"] = image.mode
        result["decodable"] = True
    except Exception as error:  # noqa: BLE001
        result["error"] = str(error)
    return result


def analyze_subject(
    display_path: Path | str,
    resized_path: Path | str,
    thumb_paths: dict[int, Path | str],
) -> tuple[list[str], list[str]]:
    """Apply conservative foreground, crop, blur, and thumb heuristics."""
    if not _is_decodable(display_path) or not _is_decodable(resized_path):
        return [], []
    try:
        with Image.open(display_path) as display, Image.open(resized_path) as resized:
            display.load()
            resized.load()
            rgba = display.convert("RGBA")
            alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
            mask = alpha.resize((128, 128), Image.Resampling.NEAREST)
            flags, reasons = _mask_findings(mask)
            _append_blur_finding(rgba, alpha, flags, reasons)
        _append_thumb_findings(thumb_paths, flags, reasons)
        return flags, reasons
    except Exception as error:  # noqa: BLE001
        return ["subject_analysis_failed"], [f"subject analysis raised: {error}"]


def _is_decodable(path: Path | str) -> bool:
    try:
        with Image.open(path) as image:
            image.load()
        return True
    except Exception:  # noqa: BLE001
        return False


def _mask_findings(mask: Image.Image) -> tuple[list[str], list[str]]:
    pixels = list(mask.getdata())
    foreground = sum(value != 0 for value in pixels)
    fraction = foreground / len(pixels)
    flags = []
    reasons = []
    if fraction < 0.005:
        flags.append("subject_tiny")
        reasons.append("foreground <0.5%, unreadable")
    if fraction > 0.90:
        flags.append("subject_fills_frame")
        reasons.append("foreground >90%, background removal likely failed or plate-like")
    blobs = _significant_blobs(pixels, mask.width, mask.height, foreground)
    if blobs >= 2:
        flags.append("multiple_blobs")
        reasons.append(f"{blobs} foreground blobs of comparable area, possible multiple individuals")
    border_fraction = _border_fraction(pixels, mask.width, mask.height)
    if border_fraction > 0.10:
        flags.append("border_contact")
        reasons.append("foreground touches frame edge, crop or body parts may be cut")
    return flags, reasons


def _significant_blobs(pixels: list[int], width: int, height: int, foreground: int) -> int:
    """Count foreground blobs comparable in area to the largest one.

    Sizing is relative to the largest blob, not to total foreground. Background
    removal routinely detaches antennae, legs, and wing tips into small
    fragments, and those are parts of one individual rather than extra ones.
    A second individual is comparable in area to the first: measured on the
    catalogued male-and-female photo the second blob is 0.897 of the largest,
    while single specimens stay at or below 0.013.
    """
    if not foreground:
        return 0
    visited = bytearray(width * height)
    sizes = []
    for start, value in enumerate(pixels):
        if not value or visited[start]:
            continue
        visited[start] = 1
        stack = [start]
        size = 0
        while stack:
            current = stack.pop()
            size += 1
            x, y = current % width, current // width
            for neighbor in (current - width, current + width, current - 1, current + 1):
                if neighbor < 0 or neighbor >= width * height or visited[neighbor]:
                    continue
                nx, ny = neighbor % width, neighbor // width
                if abs(nx - x) + abs(ny - y) != 1 or not pixels[neighbor]:
                    continue
                visited[neighbor] = 1
                stack.append(neighbor)
        sizes.append(size)
    if not sizes:
        return 0
    largest = max(sizes)
    return sum(1 for size in sizes if size >= largest * BLOB_SIGNIFICANCE_RATIO)


def _border_fraction(pixels: list[int], width: int, height: int) -> float:
    indexes = list(range(width))
    indexes += list(range((height - 1) * width, height * width))
    indexes += [row * width for row in range(1, height - 1)]
    indexes += [row * width + width - 1 for row in range(1, height - 1)]
    return sum(bool(pixels[index]) for index in indexes) / len(indexes)


def _append_blur_finding(
    rgba: Image.Image,
    alpha: Image.Image,
    flags: list[str],
    reasons: list[str],
) -> None:
    bbox = alpha.getbbox()
    if not bbox:
        return
    edges = rgba.convert("RGB").convert("L").filter(ImageFilter.FIND_EDGES).crop(bbox)
    if ImageStat.Stat(edges).stddev[0] < 6.0:
        flags.append("low_edge_energy")
        reasons.append("low edge energy, possible blur")


def _append_thumb_findings(
    thumb_paths: dict[int, Path | str],
    flags: list[str],
    reasons: list[str],
) -> None:
    for size in (54, 108, 216):
        path = thumb_paths.get(size)
        if not path:
            continue
        try:
            with Image.open(path) as image:
                image.load()
                alpha = image.convert("RGBA").getchannel("A")
                fraction = sum(value >= 128 for value in alpha.getdata()) / (image.width * image.height)
            if fraction < 0.01:
                flags.append(f"unreadable_at_{size}")
                reasons.append(f"foreground <1% at {size}px, unreadable")
        except Exception:  # noqa: BLE001
            continue
