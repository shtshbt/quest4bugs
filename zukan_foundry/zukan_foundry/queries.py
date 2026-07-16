"""Adapt source-discovery records to canonical search-query generation."""

from zukan_foundry.taxonomy import generate_search_queries


def generate_queries(candidate: dict, resolution: dict) -> list[dict]:
    if not isinstance(candidate, dict) or not isinstance(resolution, dict):
        raise ValueError("candidate and resolution must be objects")
    accepted = resolution.get("acceptedScientificName")
    if not isinstance(accepted, str) or not accepted:
        raise ValueError("acceptedScientificName must be a non-empty string")
    canonical = {
        "acceptedName": accepted,
        "sources": [{"synonyms": list(resolution.get("synonyms", []))}],
    }
    return generate_search_queries(candidate, canonical, candidate.get("locality") or candidate.get("origin"))
