#!/usr/bin/env python3
"""Extract audit inputs through Node.

Usage: import extract and call extract.extract(Path("."))
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


def extract(repo_root: Path | str) -> dict:
    """Return the evaluated catalog, bugs, and allowed licenses."""
    root = Path(repo_root).resolve()
    command = [
        "node",
        str(root / "scripts/photo_audit/extract_catalog.js"),
        str(root / "zukan_config/zukan_catalog.js"),
        str(root / "shared/bugs.js"),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
    except FileNotFoundError as error:
        raise RuntimeError("node is required for catalog extraction but was not found") from error
    if completed.returncode:
        detail = completed.stderr.strip() or "no error output"
        raise RuntimeError(f"catalog extraction failed: {detail}")
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"catalog extraction returned invalid JSON: {error}") from error


def iter_fixtures(catalog: dict) -> list[dict]:
    """Build fixtures in catalog order, with the default variant first."""
    fixtures = []
    for species_id, entry in catalog.items():
        fixtures.append(_fixture(species_id, entry, "default"))
        if any(key in entry for key in ("image_female", "specimenFemale", "sourceFemale")):
            fixtures.append(_fixture(species_id, entry, "female"))
    return fixtures


def _fixture(species_id: str, entry: dict, variant: str) -> dict:
    if variant == "female":
        image = entry.get("image_female", entry.get("image"))
        specimen = entry.get("specimenFemale", entry.get("specimen"))
        source = entry.get("sourceFemale", entry.get("source"))
    else:
        image = entry.get("image")
        specimen = entry.get("specimen")
        source = entry.get("source")
    return {
        "speciesId": species_id,
        "variant": variant,
        "entry": entry,
        "image": image,
        "specimen": specimen or {},
        "source": source or {},
    }
