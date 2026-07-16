"""Validate T01 fixtures and emit one staging-only candidate.

Usage: python -m zukan_foundry.staging_consumer --request request.json --candidate candidate.json --staging-root zukan_foundry/staging
"""

import argparse
import json
import sys
from pathlib import Path

from contracts.media_pipeline.staging import emit_staging_only
from contracts.media_pipeline.validator import (
    validate_media_build_candidate,
    validate_zukan_fetch_request,
)


def _contract_root():
    return Path(__file__).resolve().parents[2] / "contracts" / "media_pipeline"


def _validate_with_schema(payload, schema_name, validator):
    schema = json.loads((_contract_root() / "schemas" / schema_name).read_text(encoding="utf-8"))
    errors = validator(payload)
    if set(schema["required"]) != set(schema["properties"]):
        errors.append("contract schema properties and required fields differ")
    if errors:
        raise ValueError("contract validation failed: " + "; ".join(errors))


def consume_request(request, candidate, staging_root):
    _validate_with_schema(request, "zukan_fetch_request.schema.json", validate_zukan_fetch_request)
    _validate_with_schema(candidate, "media_build_candidate.schema.json", validate_media_build_candidate)
    gap_id, attempt = request["requestId"].split(":", 1)
    if gap_id != request["gapId"] or candidate["requestId"] != request["requestId"]:
        raise ValueError("requestId chain does not match gapId")
    if not attempt.isdigit():
        raise ValueError("attemptNumber must be an integer")
    return emit_staging_only(candidate, request, Path(staging_root))


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--staging-root", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        request = json.loads(args.request.read_text(encoding="utf-8"))
        candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
        output = consume_request(request, candidate, args.staging_root)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
