"""Select bounded audit candidates. Example: select_candidates(entries, 20)."""

import json
from pathlib import Path

from zukan_foundry.catalog import normalize_japanese


def select_candidates(entries: object, limit: int = 20) -> tuple[list[dict], dict]:
    if not isinstance(entries, list) or not all(isinstance(item, dict) for item in entries):
        raise ValueError("candidate input must be an array of objects")
    if not isinstance(limit, int) or limit < 1 or limit > 20:
        raise ValueError("limit must be between 1 and 20")
    eligible = [item for item in entries if item.get("intent") in {"missing", "replacement"}]
    for item in eligible:
        for key in ("speciesId", "variant", "gapId"):
            if not isinstance(item.get(key), str) or not item[key]:
                raise ValueError(f"candidate {key} must be a non-empty string")
    ordered = sorted(eligible, key=lambda item: (item["intent"] != "missing", normalize_japanese(item["speciesId"]), item["variant"], item["gapId"]))
    selected = ordered[:limit]
    return selected, {
        "selectedCount": len(selected), "excludedCount": len(entries) - len(selected),
        "sortKey": ["intent(missing first)", "normalized speciesId", "variant", "gapId"],
    }


def load_candidate_source(root: Path, fixture_path: Path) -> tuple[list[dict], str]:
    if not root.is_dir() or not fixture_path.is_file():
        raise ValueError("candidate root and fixture path must exist")
    audit_paths = sorted(root.glob("**/*missing*replacement*species*.json"))
    source = audit_paths[0] if audit_paths else fixture_path
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid candidate source: {source}") from error
    if isinstance(payload, dict):
        entries = next((payload[key] for key in ("entries", "records") if isinstance(payload.get(key), list)), None)
    else:
        entries = payload
    if not isinstance(entries, list):
        raise ValueError("candidate source must contain an array")
    return entries, "t04_audit" if audit_paths else "fixture"
