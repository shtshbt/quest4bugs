"""Validate T01 fixtures and emit one staging-only candidate.

Usage: python -m zukan_foundry.staging_consumer --request request.json --candidate candidate.json --staging-root zukan_foundry/staging
"""

import argparse
import json
import re
import sys
from pathlib import Path

from contracts.media_pipeline.staging import emit_staging_only
from contracts.media_pipeline.validator import (
    validate_media_build_candidate,
    validate_zukan_fetch_request,
)
from zukan_foundry.validators import require_valid


LICENSES = ["CC0-1.0", "PDM-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"]


def compose_fetch_request(gap, resolution, family):
    if not isinstance(gap, dict) or not isinstance(resolution, dict) or not family:
        raise ValueError("gap, resolution, and family are required")
    request = {
        "schemaVersion": 1, "requestId": f"{gap['gapId']}:1", "gapId": gap["gapId"],
        "intent": gap["intent"], "speciesId": gap["speciesId"], "variant": gap["variant"],
        "jaName": gap["jaName"], "acceptedScientificName": resolution["acceptedScientificName"],
        "synonyms": resolution["synonyms"], "taxonRank": resolution["rank"], "family": family,
        "preferredRecordType": "preserved_specimen", "allowedMediaLicenses": LICENSES,
        "excludedMediaIds": [], "currentEntryHash": gap["currentEntryHash"], "emitMode": "staging_only",
    }
    require_valid("ZukanFetchRequest", request)
    return request


def compose_build_candidate(request, media, raw_image_hash):
    if not isinstance(request, dict) or not isinstance(media, dict) or not re.fullmatch(r"[0-9a-f]{64}", raw_image_hash):
        raise ValueError("request and media must be objects and raw_image_hash must be a SHA-256 digest")
    candidate = {
        "schemaVersion": 1, "requestId": request["requestId"], "gapId": request["gapId"],
        "speciesId": request["speciesId"], "variant": request["variant"], "status": "discovered",
        "matchedScientificName": media["scientificName"], "matchedRank": media["matchedRank"],
        "matchType": "accepted_exact", "recordType": media["basisOfRecord"],
        "sourceRecordId": media["recordId"], "sourceRecordUrl": media["recordUrl"],
        "sourceMediaUrl": media["mediaUrl"], "mediaLicense": media["license"],
        "rawImageHash": raw_image_hash,
        "artifactHashes": {}, "artifactPaths": {},
        "catalogEntryCandidatePath": f"zukan_foundry/staging/{request['speciesId']}/{request['variant']}/entry.json",
        "warnings": ["fixture-only discovery candidate; no production artifact was built"],
    }
    require_valid("MediaBuildCandidate", candidate)
    return candidate


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
