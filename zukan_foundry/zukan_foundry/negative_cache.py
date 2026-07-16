"""Apply deterministic negative-cache TTL and refresh rules."""

import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path


TTL_DAYS = {
    "zero_results": 180,
    "results_not_selected": 365,
    "api_error": 7,
    "license_unknown": 90,
}


def query_hash(query):
    if not isinstance(query, str) or not query:
        raise ValueError("query must be a non-empty string")
    return hashlib.sha256(query.encode("utf-8")).hexdigest()


def create_cache_entry(source_id, candidate_id, query, adapter_version, searched_at, outcome, result_count):
    if outcome not in {*TTL_DAYS, "taxonomy_conflict"}:
        raise ValueError("unsupported cache outcome")
    if not isinstance(result_count, int) or result_count < 0:
        raise ValueError("result_count must be a non-negative integer")
    expires = None
    if outcome != "taxonomy_conflict":
        expires = searched_at + timedelta(days=TTL_DAYS[outcome])
    return {
        "sourceId": source_id,
        "candidateId": candidate_id,
        "queryHash": query_hash(query),
        "query": query,
        "adapterVersion": adapter_version,
        "searchedAt": searched_at.isoformat(),
        "resultCount": result_count,
        "expiresAt": expires.isoformat() if expires else None,
        "outcome": outcome,
    }


def should_research(entry, now, adapter_version, synonym_added=False, source_updated=False, manual=False, resolver_updated=False):
    if not isinstance(entry, dict) or not isinstance(now, datetime):
        raise ValueError("entry must be an object and now must be a datetime")
    if manual or synonym_added or source_updated or entry["adapterVersion"] != adapter_version:
        return True
    if entry["outcome"] == "api_error" or (entry["outcome"] == "taxonomy_conflict" and resolver_updated):
        return True
    if entry["expiresAt"] is None:
        return False
    return now >= datetime.fromisoformat(entry["expiresAt"])


def save_cache(path, entries):
    if not isinstance(entries, list):
        raise ValueError("cache entries must be an array")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_cache(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("cache file must contain an array")
    return payload
