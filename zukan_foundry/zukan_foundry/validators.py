"""Validate foundry records. Example: validate_record("SearchRun", payload)."""

from contracts.media_pipeline.validator import (
    validate_media_build_candidate,
    validate_media_gap_record,
    validate_zukan_fetch_request,
)


INTERNAL_FIELDS = {
    "TaxonResolution": {
        "candidateId": str, "inputName": str, "status": str,
        "acceptedScientificName": str, "matchedScientificName": str,
        "rank": str, "matchType": str, "synonyms": list,
        "backboneKey": int, "confidence": int, "evidence": dict,
        "reviewRequired": bool,
    },
    "DedupeResult": {
        "candidateId": str, "status": str, "matchedSpeciesIds": list,
        "reasons": list,
    },
    "SearchRun": {
        "searchRunId": str, "candidateId": str, "source": str,
        "query": str, "startedAt": str, "status": str,
        "resultCount": int, "cached": bool,
    },
    "MediaCandidate": {
        "candidateId": str, "source": str, "recordId": str,
        "scientificName": str, "matchedRank": str, "institution": str,
        "basisOfRecord": str, "mediaUrl": (str, type(None)),
        "retrievalReference": (str, type(None)), "recordUrl": str,
        "license": str, "rightsHolder": str, "attribution": str,
        "width": int, "height": int, "view": str, "lifeStage": str,
        "sex": str, "collectionLocality": str, "identificationQualifier": str,
        "originalMetadata": dict, "matchType": str, "sourceTrust": int,
        "flags": dict, "evidenceRefs": dict,
    },
    "NegativeCacheEntry": {
        "sourceId": str, "candidateId": str, "queryHash": str,
        "query": str, "adapterVersion": str, "searchedAt": str,
        "resultCount": int, "expiresAt": (str, type(None)), "outcome": str,
    },
}

CONTRACT_VALIDATORS = {
    "MediaGapRecord": validate_media_gap_record,
    "ZukanFetchRequest": validate_zukan_fetch_request,
    "MediaBuildCandidate": validate_media_build_candidate,
}


def validate_record(record_type: str, payload: object) -> list[str]:
    if record_type in CONTRACT_VALIDATORS:
        return CONTRACT_VALIDATORS[record_type](payload)
    fields = INTERNAL_FIELDS.get(record_type)
    if fields is None:
        raise ValueError(f"unknown record type: {record_type}")
    if not isinstance(payload, dict):
        return ["payload must be an object"]
    errors = [f"missing required field: {key}" for key in fields.keys() - payload.keys()]
    errors.extend(f"unexpected field: {key}" for key in payload.keys() - fields.keys())
    for key, expected in fields.items():
        if key in payload and not isinstance(payload[key], expected):
            errors.append(f"{key} has an invalid type")
    for key in ("candidateId", "inputName", "status", "source", "query", "recordId"):
        if key in payload and not payload[key]:
            errors.append(f"{key} must not be empty")
    if record_type == "TaxonResolution" and payload.get("status") not in {"resolved", "taxonomy_conflict", "unresolved"}:
        errors.append("status has an unsupported value")
    if record_type == "DedupeResult" and payload.get("status") not in {"duplicate", "review", "unique"}:
        errors.append("status has an unsupported value")
    if record_type == "MediaCandidate":
        for key in ("recordId", "scientificName", "matchedRank", "institution", "basisOfRecord", "recordUrl", "license"):
            if key in payload and not payload[key]:
                errors.append(f"{key} must not be empty")
        if not payload.get("mediaUrl") and not payload.get("retrievalReference"):
            errors.append("mediaUrl or retrievalReference must not be empty")
    return errors


def require_valid(record_type: str, payload: object) -> None:
    errors = validate_record(record_type, payload)
    if errors:
        raise ValueError(f"invalid {record_type}: " + "; ".join(errors))
