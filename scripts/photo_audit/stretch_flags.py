"""Weak heuristic flags for photo audit fixtures."""

from PIL import Image


def auxiliary_flags(files: dict) -> list[str]:
    """Weak per-fixture heuristic flags. Flags only, never a state change."""
    try:
        resized = files.get("resized")
        if not isinstance(resized, dict):
            return []
        if not resized.get("exists") or not resized.get("decodable"):
            return []
        width = resized.get("width", 0)
        height = resized.get("height", 0)
        if width <= 0 or height <= 0:
            return []

        flags = []
        if max(width, height) / min(width, height) >= 3.0:
            flags.append("aspect_ratio_outlier")
        if max(width, height) < 400:
            flags.append("low_resolution")
        return sorted(flags)
    except Exception:  # noqa: BLE001
        return []


def blob_gray_zone_flag(display_path) -> list[str]:
    """Flag blobs in the uncertain gray zone without changing audit state.

    This band has no ground truth because a detached wing can look exactly like
    a small second individual. The result is deliberately a flag only.
    """
    try:
        with Image.open(display_path) as image:
            rgba = image.convert("RGBA")
            rgba.load()
        alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
        mask = alpha.resize((128, 128), Image.Resampling.NEAREST)
        pixels = list(mask.getdata())
        width, height = mask.size
        visited = bytearray(width * height)
        areas = []

        for start, value in enumerate(pixels):
            if not value or visited[start]:
                continue
            visited[start] = 1
            stack = [start]
            area = 0
            while stack:
                current = stack.pop()
                area += 1
                x, y = current % width, current // width
                for neighbor in (current - width, current + width, current - 1, current + 1):
                    if neighbor < 0 or neighbor >= width * height or visited[neighbor]:
                        continue
                    nx, ny = neighbor % width, neighbor // width
                    if abs(nx - x) + abs(ny - y) != 1 or not pixels[neighbor]:
                        continue
                    visited[neighbor] = 1
                    stack.append(neighbor)
            areas.append(area)

        if len(areas) < 2:
            return []
        largest, second = sorted(areas, reverse=True)[:2]
        ratio = second / largest
        return ["blob_ratio_gray_zone"] if 0.10 <= ratio < 0.25 else []
    except Exception:  # noqa: BLE001
        return []
