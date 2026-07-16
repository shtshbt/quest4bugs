"""Detect exact duplicates and review-only similarities."""

from difflib import SequenceMatcher

from zukan_foundry.catalog import canonical_scientific_name, normalize_japanese
from zukan_foundry.validators import require_valid


def _rank(name):
    return "subspecies" if len(name.split()) >= 3 else "species"


def detect_duplicate(candidate, resolution, existing_species):
    accepted = resolution.get("acceptedName") or candidate["scientificName"]
    candidate_synonyms = {name for source in resolution.get("sources", []) for name in source["synonyms"]}
    hard_reasons = []
    review_reasons = []
    warnings = []
    matched_ids = []
    for existing in existing_species:
        reasons = []
        if candidate["speciesId"] == existing["id"]:
            reasons.append("same_id")
        if candidate["jaName"] == existing["jaName"]:
            reasons.append("same_japanese_name")
        if accepted == existing["canonicalName"]:
            reasons.append("same_canonical_name")
        if accepted in existing.get("synonyms", []):
            reasons.append("candidate_accepted_is_existing_synonym")
        if existing["canonicalName"] in candidate_synonyms:
            reasons.append("existing_accepted_is_candidate_synonym")
        if candidate["jaName"] in existing.get("lifeStageNames", []):
            reasons.append("larval_adult_separate_registration")
        if existing["jaName"] in candidate.get("lifeStageNames", []):
            reasons.append("larval_adult_separate_registration")
        if canonical_species(accepted) == canonical_species(existing["canonicalName"]) and _rank(accepted) != _rank(existing["canonicalName"]):
            review_reasons.append("species_subspecies_collision")
            matched_ids.append(existing["id"])
        if reasons:
            hard_reasons.extend(reasons)
            matched_ids.append(existing["id"])
        similarity = max(
            SequenceMatcher(None, candidate["jaName"], existing["jaName"]).ratio(),
            SequenceMatcher(None, accepted, existing["canonicalName"]).ratio(),
        )
        if similarity >= 0.85 and not reasons:
            warnings.append(f"fuzzy_similarity:{existing['id']}:{similarity:.2f}")
    if hard_reasons:
        status = "duplicate"
    elif review_reasons or resolution.get("status") == "taxonomy_conflict" or warnings:
        status = "needs_review"
    else:
        status = "unique"
    return {
        "candidateId": candidate["candidateId"],
        "status": status,
        "hardReasons": sorted(set(hard_reasons)),
        "reviewReasons": sorted(set(review_reasons)),
        "matchedExistingIds": sorted(set(matched_ids)),
        "warnings": warnings,
    }


def canonical_species(name):
    return " ".join(name.split()[:2])


def dedupe_catalog(candidate, resolution, catalog_index):
    if not all(isinstance(item, dict) for item in (candidate, resolution, catalog_index)):
        raise ValueError("candidate, resolution, and catalog_index must be objects")
    candidate_id = candidate.get("speciesId")
    if not isinstance(candidate_id, str) or not candidate_id:
        raise ValueError("candidate speciesId must be a non-empty string")
    accepted = canonical_scientific_name(resolution.get("acceptedScientificName", ""))
    adapted_candidate = {
        "candidateId": candidate_id,
        "speciesId": candidate_id,
        "jaName": normalize_japanese(candidate.get("jaName", "")),
        "scientificName": candidate["scientificName"],
    }
    adapted_resolution = {
        "acceptedName": accepted,
        "status": resolution.get("status"),
        "sources": [{"synonyms": list(resolution.get("synonyms", []))}],
    }
    existing = [
        {
            "id": item["id"], "jaName": item["japanese"],
            "canonicalName": item["canonical"], "synonyms": [], "lifeStageNames": [],
        }
        for item in catalog_index.get("byId", {}).values()
    ]
    canonical = detect_duplicate(adapted_candidate, adapted_resolution, existing)
    status = "review" if canonical["status"] == "needs_review" else canonical["status"]
    matched = canonical["matchedExistingIds"]
    reasons = canonical["hardReasons"] + canonical["reviewReasons"] + canonical["warnings"]
    result = {"candidateId": candidate_id, "status": status, "matchedSpeciesIds": sorted(set(matched)), "reasons": reasons}
    require_valid("DedupeResult", result)
    return result
