import json
from pathlib import Path

from contracts.media_pipeline.validator import validate_media_build_candidate


def emit_staging_only(candidate: dict, request: dict, staging_root: Path) -> Path:
    if not isinstance(request, dict):
        raise ValueError("request must be an object")
    if request.get("emitMode") != "staging_only":
        raise ValueError("request emitMode must be staging_only")
    errors = validate_media_build_candidate(candidate)
    if errors:
        raise ValueError("invalid media build candidate: " + "; ".join(errors))
    gap_id, attempt_number = candidate["requestId"].split(":", 1)
    root = Path(staging_root).resolve()
    target = (
        root
        / candidate["speciesId"]
        / candidate["variant"]
        / f"{gap_id}_attempt{attempt_number}.json"
    ).resolve()
    if target == root or root not in target.parents:
        raise ValueError("staging path escapes staging_root")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target
