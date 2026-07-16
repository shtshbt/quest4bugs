"""Rank MediaCandidate metadata without reading image binaries."""


LICENSE_SCORE = {"CC0-1.0": 20, "PDM-1.0": 20, "CC-BY-4.0": 18, "CC-BY-SA-4.0": 15}
MATCH_SCORE = {"accepted_exact": 40, "exact": 40, "synonym_exact": 35, "canonical_name": 30}


def _exclusions(candidate, require_adult):
    flags = candidate.get("flags", {})
    reasons = []
    if candidate.get("matchedRank") != "species":
        reasons.append("not_species_rank")
    if not (candidate.get("mediaUrl") or candidate.get("retrievalReference")):
        reasons.append("missing_image")
    if candidate.get("license") not in LICENSE_SCORE:
        reasons.append("unknown_license")
    if flags.get("taxonMismatch"):
        reasons.append("taxon_mismatch")
    if require_adult and candidate.get("lifeStage") != "adult":
        reasons.append("adult_required")
    if min(candidate.get("width", 0), candidate.get("height", 0)) < 300:
        reasons.append("image_too_small")
    if flags.get("aiGenerated"):
        reasons.append("ai_generated")
    if flags.get("watermarkOverlapsSubject"):
        reasons.append("watermark_overlaps_subject")
    if flags.get("identificationDoubt"):
        reasons.append("identification_doubt")
    return reasons


def rank_media_candidate(candidate, require_adult=True):
    if not isinstance(candidate, dict):
        raise ValueError("candidate must be an object")
    excluded = _exclusions(candidate, require_adult)
    if excluded:
        return {"status": "excluded", "score": 0, "band": "excluded", "reasons": excluded, "components": {}}
    shortest = min(candidate["width"], candidate["height"])
    quality = 20 if shortest >= 2000 else 15 if shortest >= 1200 else 10 if shortest >= 600 else 5
    suitability = (5 if candidate.get("view") in {"dorsal", "lateral"} else 2) + (5 if candidate.get("lifeStage") == "adult" else 0)
    components = {
        "taxonomy": MATCH_SCORE.get(candidate.get("matchType"), 20),
        "rights": LICENSE_SCORE[candidate["license"]],
        "quality": quality,
        "suitability": suitability,
        "sourceTrust": max(0, min(10, candidate.get("sourceTrust", 0))),
    }
    score = sum(components.values())
    band = "excellent" if score >= 90 else "good" if score >= 75 else "review" if score >= 60 else "weak"
    return {"status": "ranked", "score": score, "band": band, "reasons": [], "components": components}
