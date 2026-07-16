"""Search fixture or live transports. Example: DiscoveryService(transport).search(...)."""

import hashlib
import json
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from zukan_foundry.negative_cache import create_cache_entry
from zukan_foundry.provenance import normalize_media_candidate as normalize_provenance
from zukan_foundry.validators import require_valid


ALLOWED_LICENSES = {"CC0-1.0", "PDM-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"}


class HttpTransport:
    BASE_URLS = {"gbif": "https://api.gbif.org", "nhm": "https://data.nhm.ac.uk"}
    MIN_INTERVALS = {"gbif": 2.0, "nhm": 0.21}

    def __init__(self, opener=urlopen, clock=time.monotonic, sleeper=time.sleep):
        self.opener = opener
        self.clock = clock
        self.sleeper = sleeper
        self.last_request = {}

    def get_json(self, source: str, endpoint: str, params: dict, headers: dict) -> dict:
        if source not in self.BASE_URLS or not endpoint.startswith("/") or not isinstance(params, dict) or not isinstance(headers, dict):
            raise ValueError("invalid HTTP transport input")
        elapsed = self.clock() - self.last_request.get(source, float("-inf"))
        self.sleeper(max(0.0, self.MIN_INTERVALS[source] - elapsed))
        request = Request(f"{self.BASE_URLS[source]}{endpoint}?{urlencode(params)}", headers=headers)
        try:
            with self.opener(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, UnicodeError, json.JSONDecodeError) as error:
            raise RuntimeError(f"{source} request failed: {error}") from error
        self.last_request[source] = self.clock()
        if not isinstance(payload, dict):
            raise ValueError(f"{source} response must be an object")
        return payload


class GbifAdapter:
    source = "gbif"

    def search(self, query: str, transport) -> list[dict]:
        payload = transport.get_json(self.source, "/v1/occurrence/search", {"scientific_name": query, "media_type": "StillImage"}, {})
        if not isinstance(payload, dict) or not isinstance(payload.get("results", []), list):
            raise ValueError("invalid GBIF response")
        return payload.get("results", [])


class NhmAdapter:
    source = "nhm"

    def search(self, query: str, transport) -> list[dict]:
        headers = {"User-Agent": "quest4bugs-zukan-foundry/1.0"}
        payload = transport.get_json(self.source, "/api/3/action/package_search", {"q": query}, headers)
        records = payload.get("records", []) if isinstance(payload, dict) else None
        if not isinstance(records, list):
            raise ValueError("invalid NHM response")
        return records


def _value(raw: dict, *keys: str, default=""):
    for key in keys:
        if raw.get(key) is not None:
            return raw[key]
    return default


def normalize_media_candidate(candidate_id: str, source: str, raw: object) -> dict:
    if not isinstance(raw, dict) or not candidate_id or source not in {"gbif", "nhm"}:
        raise ValueError("invalid media candidate input")
    dimensions = _value(raw, "imageDimensions", default={})
    dimensions = dimensions if isinstance(dimensions, dict) else {}
    canonical = normalize_provenance({
        "sourceId": source,
        "recordId": str(_value(raw, "key", "id", "recordId")),
        "scientificName": str(_value(raw, "scientificName", "scientific_name")),
        "taxonRank": str(_value(raw, "taxonRank", "rank")),
        "institution": str(_value(raw, "institutionCode", "institution")),
        "basisOfRecord": str(_value(raw, "basisOfRecord", "basis_of_record")),
        "mediaUrl": str(_value(raw, "mediaUrl", "identifier")),
        "recordUrl": str(_value(raw, "recordUrl", "references")),
        "license": str(_value(raw, "license")),
        "rightsHolder": str(_value(raw, "rightsHolder", "rights_holder")),
        "attribution": str(_value(raw, "attribution", "creator")),
        "width": dimensions.get("width", 0), "height": dimensions.get("height", 0),
        "view": str(_value(raw, "view")), "lifeStage": str(_value(raw, "lifeStage", "life_stage")),
        "sex": str(_value(raw, "sex")), "collectionLocality": str(_value(raw, "locality")),
        "identificationQualifier": str(_value(raw, "identificationQualifier", "identification_qualifier")),
        "originalMetadata": raw,
    })
    result = {"candidateId": candidate_id, **canonical}
    require_valid("MediaCandidate", result)
    return result


def negative_cache_entry(source, candidate_id, query, outcome, now, result_count=0):
    if now.tzinfo is None:
        raise ValueError("invalid negative cache input")
    entry = create_cache_entry(source, candidate_id, query, "1", now, outcome, result_count)
    require_valid("NegativeCacheEntry", entry)
    return entry


class DiscoveryService:
    def __init__(self, transport, now=None):
        self.transport = transport
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.search_runs = {}
        self.search_results = {}
        self.negative_cache = {}

    def search(self, candidate_id: str, adapter, query: str) -> tuple[dict, list[dict], dict | None]:
        if not candidate_id or not isinstance(query, str) or not query:
            raise ValueError("candidate_id and query must be non-empty strings")
        key = hashlib.sha256(f"{candidate_id}|{adapter.source}|{query}".encode()).hexdigest()
        if key in self.search_results:
            run, media, cache = self.search_results[key]
            return {**run, "cached": True}, list(media), cache
        started = self.now()
        try:
            raw = adapter.search(query, self.transport)
            media = [normalize_media_candidate(candidate_id, adapter.source, item) for item in raw]
            status = "completed"
            outcome = "zero_results" if not media else "license_unknown" if not any(item["license"] in ALLOWED_LICENSES for item in media) else None
        except RuntimeError:
            media = []
            status = "api_error"
            outcome = "api_error"
        run = {
            "searchRunId": key, "candidateId": candidate_id, "source": adapter.source,
            "query": query, "startedAt": started.isoformat(), "status": status,
            "resultCount": len(media), "cached": False,
        }
        require_valid("SearchRun", run)
        cache = negative_cache_entry(adapter.source, candidate_id, query, outcome, started, len(media)) if outcome else None
        self.search_runs[key] = run
        self.search_results[key] = (run, list(media), cache)
        if cache:
            self.negative_cache[key] = cache
        return run, media, cache
