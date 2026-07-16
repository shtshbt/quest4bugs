"""Resolve fixture-backed taxonomy and generate offline search queries."""

import re

from contracts.media_pipeline.validator import validate_media_gap_record


def species_candidate_from_gap(gap):
    errors = validate_media_gap_record(gap)
    if errors:
        raise ValueError("invalid MediaGapRecord: " + "; ".join(errors))
    return {
        "candidateId": gap["gapId"],
        "gapId": gap["gapId"],
        "intent": gap["intent"],
        "speciesId": gap["speciesId"],
        "variant": gap["variant"],
        "jaName": gap["jaName"],
        "scientificName": gap["scientificName"],
        "acceptedName": gap["acceptedName"],
        "evidencePaths": list(gap["evidencePaths"]),
    }


def canonical_name(name):
    if not isinstance(name, str) or not name.strip():
        raise ValueError("scientific name must be a non-empty string")
    words = name.strip().split()
    return " ".join(words[:3] if len(words) >= 3 and words[2][0].islower() else words[:2])


def _match_record(candidate, record):
    name = candidate["scientificName"]
    accepted = candidate.get("acceptedName")
    checks = (
        ("exact", [record.get("scientificName")], name),
        ("canonical_name", [record.get("canonicalName")], canonical_name(name)),
        ("accepted_name", [record.get("acceptedName")], accepted or name),
        ("major_synonym", record.get("synonyms", []), name),
        ("former_genus", record.get("formerGenusNames", []), name),
        ("domestic_subspecies", record.get("domesticSubspeciesNames", []), name),
        ("japanese_reverse", record.get("jaNames", []), candidate["jaName"]),
    )
    for match_type, values, query in checks:
        if query and query in [value for value in values if value]:
            return match_type
    return None


def resolve_taxon(candidate, backbone_sources, existing_species):
    if not isinstance(candidate, dict) or not isinstance(backbone_sources, list):
        raise ValueError("candidate must be an object and backbone_sources must be an array")
    matches = []
    for source in backbone_sources:
        for record in source.get("records", []):
            match_type = _match_record(candidate, record)
            if match_type:
                matches.append({
                    "sourceId": source["sourceId"],
                    "sourceType": source["sourceType"],
                    "acceptedName": record["acceptedName"],
                    "matchedName": record.get("scientificName"),
                    "matchedRank": record["taxonRank"],
                    "matchType": match_type,
                    "synonyms": list(record.get("synonyms", [])),
                })
                break
    accepted_names = {match["acceptedName"] for match in matches}
    status = "unresolved"
    if len(accepted_names) == 1:
        status = "resolved"
    elif len(accepted_names) > 1:
        status = "taxonomy_conflict"
    existing = next(
        (item for item in existing_species if item["id"] == candidate["speciesId"]),
        None,
    )
    return {
        "candidateId": candidate["candidateId"],
        "status": status,
        "acceptedName": next(iter(accepted_names)) if len(accepted_names) == 1 else None,
        "matchedRank": matches[0]["matchedRank"] if matches else None,
        "matchType": matches[0]["matchType"] if matches else None,
        "sources": matches,
        "existingQuest4BugsName": existing["scientificName"] if existing else None,
    }


def generate_search_queries(candidate, resolution, locality=None):
    accepted = resolution.get("acceptedName") or candidate["scientificName"]
    synonyms = sorted({name for source in resolution.get("sources", []) for name in source["synonyms"]})
    genus = canonical_name(accepted).split()[0]
    queries = [
        {"priority": 1, "type": "species_exact", "query": f'"{accepted}"'},
    ]
    queries.extend(
        {"priority": 2, "type": "synonym_exact", "query": f'"{name}"'}
        for name in synonyms
    )
    if len(accepted.split()) >= 3:
        queries.append({"priority": 3, "type": "subspecies_exact", "query": f'"{accepted}"'})
    queries.extend([
        {"priority": 4, "type": "canonical_relaxed", "query": re.sub(r"\s+", " ", canonical_name(accepted))},
        {"priority": 5, "type": "japanese_name", "query": candidate["jaName"]},
        {"priority": 6, "type": "genus_locality", "query": f"{genus} {locality or 'Japan'}"},
    ])
    return queries
