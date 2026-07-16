import hashlib
import re


HASH_PATTERN = re.compile(r"^[0-9a-f]{64}$")
COMMIT_PATTERN = re.compile(r"^[0-9a-f]{7,40}$")
REQUEST_PATTERN = re.compile(r"^[0-9a-f]{64}:[0-9]+$")
DATE_TIME_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)
URI_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:\S+$")
INTENTS = {"missing", "replacement", "new_species", "variant_missing"}
LICENSES = {"CC0-1.0", "PDM-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"}


def _start(obj, fields):
    if not isinstance(obj, dict):
        return ["payload must be an object"]
    errors = [f"missing required field: {field}" for field in fields - obj.keys()]
    errors.extend(f"unexpected field: {field}" for field in obj.keys() - fields)
    return errors


def _const(obj, field, expected, errors):
    if field in obj and (type(obj[field]) is not type(expected) or obj[field] != expected):
        errors.append(f"{field} must equal {expected!r}")


def _string(obj, field, errors, pattern=None, nullable=False, nonempty=True):
    if field not in obj:
        return
    value = obj[field]
    if nullable and value is None:
        return
    if not isinstance(value, str):
        errors.append(f"{field} must be a string" + (" or null" if nullable else ""))
    elif nonempty and not value:
        errors.append(f"{field} must not be empty")
    elif pattern and not pattern.fullmatch(value):
        errors.append(f"{field} has an invalid format")


def _array(obj, field, errors, allowed=None, min_items=0):
    if field not in obj:
        return
    value = obj[field]
    if not isinstance(value, list):
        errors.append(f"{field} must be an array")
        return
    if len(value) < min_items:
        errors.append(f"{field} must contain at least {min_items} item(s)")
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item:
            errors.append(f"{field}[{index}] must be a non-empty string")
        elif allowed is not None and item not in allowed:
            errors.append(f"{field}[{index}] has an unsupported value")


def _enum(obj, field, allowed, errors):
    if field in obj and (not isinstance(obj[field], str) or obj[field] not in allowed):
        errors.append(f"{field} has an unsupported value")


def validate_media_gap_record(obj: dict) -> list[str]:
    fields = {
        "schemaVersion", "gapId", "speciesId", "variant", "intent",
        "auditStatus", "reasonCodes", "jaName", "scientificName",
        "acceptedName", "currentCatalogCommit", "currentEntryHash",
        "currentMediaHash", "currentSourceRecordId", "evidencePaths", "createdAt",
    }
    errors = _start(obj, fields)
    if not isinstance(obj, dict):
        return errors
    _const(obj, "schemaVersion", 1, errors)
    _string(obj, "gapId", errors, HASH_PATTERN)
    for field in ("speciesId", "variant", "auditStatus", "jaName", "scientificName"):
        _string(obj, field, errors)
    _enum(obj, "intent", INTENTS, errors)
    _array(obj, "reasonCodes", errors)
    _string(obj, "acceptedName", errors, nullable=True, nonempty=False)
    _string(obj, "currentCatalogCommit", errors, COMMIT_PATTERN)
    _string(obj, "currentEntryHash", errors, HASH_PATTERN)
    _string(obj, "currentMediaHash", errors, HASH_PATTERN, nullable=True)
    _string(obj, "currentSourceRecordId", errors, nullable=True, nonempty=False)
    _array(obj, "evidencePaths", errors)
    _string(obj, "createdAt", errors, DATE_TIME_PATTERN)
    return errors


def validate_zukan_fetch_request(obj: dict) -> list[str]:
    fields = {
        "schemaVersion", "requestId", "gapId", "intent", "speciesId", "variant",
        "jaName", "acceptedScientificName", "synonyms", "taxonRank", "family",
        "preferredRecordType", "allowedMediaLicenses", "excludedMediaIds",
        "currentEntryHash", "emitMode",
    }
    errors = _start(obj, fields)
    if not isinstance(obj, dict):
        return errors
    _const(obj, "schemaVersion", 1, errors)
    _string(obj, "requestId", errors, REQUEST_PATTERN)
    _string(obj, "gapId", errors, HASH_PATTERN)
    _enum(obj, "intent", INTENTS, errors)
    for field in ("speciesId", "variant", "jaName", "acceptedScientificName", "taxonRank", "family", "preferredRecordType"):
        _string(obj, field, errors)
    _array(obj, "synonyms", errors)
    _array(obj, "allowedMediaLicenses", errors, LICENSES, min_items=1)
    _array(obj, "excludedMediaIds", errors)
    _string(obj, "currentEntryHash", errors, HASH_PATTERN)
    _const(obj, "emitMode", "staging_only", errors)
    return errors


def validate_media_build_candidate(obj: dict) -> list[str]:
    fields = {
        "schemaVersion", "requestId", "gapId", "speciesId", "variant", "status",
        "matchedScientificName", "matchedRank", "matchType", "recordType",
        "sourceRecordId", "sourceRecordUrl", "sourceMediaUrl", "mediaLicense",
        "rawImageHash", "artifactHashes", "artifactPaths",
        "catalogEntryCandidatePath", "warnings",
    }
    errors = _start(obj, fields)
    if not isinstance(obj, dict):
        return errors
    _const(obj, "schemaVersion", 1, errors)
    _string(obj, "requestId", errors, REQUEST_PATTERN)
    _string(obj, "gapId", errors, HASH_PATTERN)
    for field in ("speciesId", "variant", "status", "matchedScientificName", "matchedRank", "matchType", "recordType", "sourceRecordId", "catalogEntryCandidatePath"):
        _string(obj, field, errors)
    _string(obj, "sourceRecordUrl", errors, URI_PATTERN)
    _string(obj, "sourceMediaUrl", errors, URI_PATTERN)
    _enum(obj, "mediaLicense", LICENSES, errors)
    _string(obj, "rawImageHash", errors, HASH_PATTERN)
    for field in ("artifactHashes", "artifactPaths"):
        if field in obj and not isinstance(obj[field], dict):
            errors.append(f"{field} must be an object")
    _array(obj, "warnings", errors)
    return errors


def compute_gap_id(
    species_id: str,
    variant: str,
    current_catalog_commit: str,
    current_media_hash: str | None,
    reason_codes: list[str],
) -> str:
    if not all(isinstance(value, str) for value in (species_id, variant, current_catalog_commit)):
        raise TypeError("species_id, variant, and current_catalog_commit must be strings")
    if current_media_hash is not None and not isinstance(current_media_hash, str):
        raise TypeError("current_media_hash must be a string or None")
    if not isinstance(reason_codes, list) or not all(isinstance(code, str) for code in reason_codes):
        raise TypeError("reason_codes must be a list of strings")
    payload = "|".join((
        species_id,
        variant,
        current_catalog_commit,
        current_media_hash or "",
        ",".join(sorted(reason_codes)),
    ))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate_chain(gap: dict, request: dict, candidate: dict) -> list[str]:
    if not all(isinstance(obj, dict) for obj in (gap, request, candidate)):
        return ["gap, request, and candidate must be objects"]
    errors = []
    gap_id = gap.get("gapId")
    if gap_id != request.get("gapId") or gap_id != candidate.get("gapId"):
        errors.append("gapId must match across the chain")
    request_id = request.get("requestId")
    if not isinstance(gap_id, str) or not isinstance(request_id, str) or not re.fullmatch(rf"{re.escape(gap_id)}:[0-9]+", request_id):
        errors.append("requestId must contain the gapId and an integer attempt number")
    if candidate.get("requestId") != request_id:
        errors.append("candidate requestId must match request requestId")
    if gap.get("intent") != request.get("intent"):
        errors.append("intent must match between gap and request")
    if gap.get("currentEntryHash") != request.get("currentEntryHash"):
        errors.append("currentEntryHash must match between gap and request")
    licenses = request.get("allowedMediaLicenses")
    if not isinstance(licenses, list) or candidate.get("mediaLicense") not in licenses:
        errors.append("candidate mediaLicense must be allowed by the request")
    return errors
