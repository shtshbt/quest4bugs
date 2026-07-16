"""Detect exact duplicates and review-only similarities."""

from difflib import SequenceMatcher


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
