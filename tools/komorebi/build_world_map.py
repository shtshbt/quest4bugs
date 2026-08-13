"""Project Natural Earth country outlines into an Equal Earth SVG payload for
the komorebi expedition map.

Equal Earth is an equal-area projection, so Africa and Madagascar appear at
their true relative size. Mercator would shrink them and undercut the
geography-learning intent (docs/komorebi_ui_design.md 3 章).

Region highlight paths come from tools/komorebi/regions.json, the same
definitions the harvester used to decide which insects belong to a region, so
the lit area on the map and the collected area are one source of truth.

Source data: world-atlas countries-110m (Natural Earth derived, public domain).
It is fetched on demand rather than committed; only the generated payload is a
runtime asset.

Run:
    python3 tools/komorebi/build_world_map.py --out komorebi/assets/world_paths.json
"""

import argparse
import json
import math
import re
import urllib.request
from pathlib import Path

SOURCE_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
REPO_ROOT = Path(__file__).resolve().parents[2]
REGIONS_FILE = Path(__file__).resolve().parent / "regions.json"

A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
SQRT3_2 = math.sqrt(3) / 2

REGION_COUNTRIES = {
    "madagascar": ["Madagascar"],
    "australia": ["Australia"],
    "costa_rica": ["Costa Rica"],
    "philippines": ["Philippines"],
    "new_guinea": ["Papua New Guinea"],
    "southern_africa": ["South Africa", "Namibia"],
}
REGION_PINS = {
    "madagascar": (46.9, -18.8),
    "australia": (134.0, -25.0),
    "borneo": (114.0, 0.5),
    "costa_rica": (-84.0, 9.9),
    "philippines": (122.0, 12.0),
    "new_guinea": (144.0, -6.0),
    "southern_africa": (24.0, -29.0),
}


def equal_earth(lon_deg, lat_deg):
    lon, lat = math.radians(lon_deg), math.radians(lat_deg)
    theta = math.asin(max(-1.0, min(1.0, SQRT3_2 * math.sin(lat))))
    denom = 3 * (9 * A4 * theta**8 + 7 * A3 * theta**6 + 3 * A2 * theta**2 + A1)
    x = 2 * math.sqrt(3) * lon * math.cos(theta) / denom
    y = A4 * theta**9 + A3 * theta**7 + A2 * theta**3 + A1 * theta
    return x, y


def decode_arcs(topology):
    """Undo TopoJSON quantization and delta encoding into lon/lat rings."""
    scale = topology["transform"]["scale"]
    translate = topology["transform"]["translate"]
    arcs = []
    for arc in topology["arcs"]:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
        arcs.append(points)
    return arcs


def ring_points(arc_indices, arcs):
    points = []
    for index in arc_indices:
        arc = arcs[~index][::-1] if index < 0 else arcs[index]
        points.extend(arc[1:] if points else arc)
    return points


def geometry_rings(geometry, arcs):
    if geometry["type"] == "Polygon":
        return [ring_points(ring, arcs) for ring in geometry["arcs"]]
    if geometry["type"] == "MultiPolygon":
        return [ring_points(ring, arcs)
                for polygon in geometry["arcs"] for ring in polygon]
    return []


class Frame:
    """Maps projected units into the SVG viewBox."""

    def __init__(self, width=1000.0, margin=8.0):
        x_max, _ = equal_earth(180, 0)
        _, y_max = equal_earth(0, 90)
        self.sx = (width - 2 * margin) / (2 * x_max)
        self.height = 2 * y_max * self.sx + 2 * margin
        self.cx, self.cy = width / 2, self.height / 2

    def place(self, lon, lat):
        x, y = equal_earth(lon, lat)
        return self.cx + x * self.sx, self.cy - y * self.sx


def to_path(rings, frame, precision=1):
    parts = []
    for ring in rings:
        if len(ring) < 3:
            continue
        coords = [frame.place(lon, lat) for lon, lat in ring]
        head = coords[0]
        body = " ".join(f"L{x:.{precision}f} {y:.{precision}f}" for x, y in coords[1:])
        parts.append(f"M{head[0]:.{precision}f} {head[1]:.{precision}f} {body} Z")
    return " ".join(parts)


def parse_wkt_polygon(wkt):
    match = re.match(r"^POLYGON\s*\(\(\s*(.+?)\s*\)\)$", wkt.strip(), re.DOTALL)
    if not match:
        raise ValueError("expected a single-ring POLYGON")
    points = []
    for pair in match.group(1).split(","):
        lon, lat = pair.split()
        points.append((float(lon), float(lat)))
    return points


def load_topology(cache):
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
            cache.write_bytes(response.read())
    return json.loads(cache.read_text(encoding="utf-8"))


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build the komorebi world map payload")
    parser.add_argument("--out", type=Path,
                        default=REPO_ROOT / "komorebi" / "assets" / "world_paths.json")
    parser.add_argument("--cache", type=Path, default=Path("/tmp/countries-110m.json"),
                        help="download cache for the public-domain source data")
    args = parser.parse_args(argv)

    topology = load_topology(args.cache)
    arcs = decode_arcs(topology)
    frame = Frame()

    land_rings = []
    by_name = {}
    for geometry in topology["objects"]["countries"]["geometries"]:
        rings = geometry_rings(geometry, arcs)
        land_rings.extend(rings)
        name = geometry.get("properties", {}).get("name")
        if name:
            by_name.setdefault(name, []).extend(rings)

    payload = {
        "viewBox": f"0 0 1000 {frame.height:.1f}",
        "height": round(frame.height, 1),
        "projection": "Equal Earth (equal-area)",
        "source": "Natural Earth via world-atlas countries-110m (public domain)",
        "land": to_path(land_rings, frame),
        "regions": {},
        "pins": {},
    }

    for region, names in REGION_COUNTRIES.items():
        rings = [ring for name in names for ring in by_name.get(name, [])]
        if not rings:
            raise ValueError(f"no outline found for region {region}")
        payload["regions"][region] = to_path(rings, frame)

    regions_def = json.loads(REGIONS_FILE.read_text(encoding="utf-8"))
    for region, definition in regions_def.items():
        if definition.get("geometry"):
            payload["regions"][region] = to_path(
                [parse_wkt_polygon(definition["geometry"])], frame)

    for region, (lon, lat) in REGION_PINS.items():
        x, y = frame.place(lon, lat)
        payload["pins"][region] = {"x": round(x, 1), "y": round(y, 1)}

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"{args.out}: viewBox 0 0 1000 {frame.height:.1f}, "
          f"land {len(payload['land'])} chars, {len(payload['regions'])} regions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
