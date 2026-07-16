"""Validate measurement evidence and build one-species audit trails."""


MEASUREMENT_DEFINITIONS = {
    "Anura": "body_length",
    "Araneae": "body_length",
    "Blattodea": "body_length",
    "Coleoptera": "body_length",
    "Diptera": "body_length",
    "Lepidoptera": "wingspan",
    "Odonata": "body_length",
    "Hemiptera": "body_length",
    "Hymenoptera": "body_length",
    "Isopoda": "body_length",
    "Mantodea": "body_length",
    "Megaloptera": "body_length",
    "Neuroptera": "body_length",
    "Orthoptera": "body_length",
    "Passeriformes": "body_length",
    "Phasmatodea": "body_length",
    "Scolopendromorpha": "body_length",
    "Scorpiones": "body_length",
    "Scutigeromorpha": "body_length",
    "Squamata": "body_length",
    "Trichoptera": "body_length",
}


def assess_measurements(order, evidence, selected_evidence_id=None, rationale=None):
    if order not in MEASUREMENT_DEFINITIONS:
        raise ValueError("measurement definition is not configured for order")
    if not isinstance(evidence, list) or not evidence:
        raise ValueError("evidence must be a non-empty array")
    expected = MEASUREMENT_DEFINITIONS[order]
    if any(item.get("measurementType") != expected for item in evidence):
        raise ValueError("measurement definitions must not be mixed within a taxon")
    ranges = [(item["minMm"], item["maxMm"]) for item in evidence]
    conflict = max(low for low, _ in ranges) > min(high for _, high in ranges)
    if conflict and (not selected_evidence_id or not rationale):
        raise ValueError("conflicting measurements require a selection and rationale")
    return {
        "sizeStatus": "conflict" if conflict else "consistent",
        "measurementType": expected,
        "selectedEvidenceId": selected_evidence_id,
        "selectionRationale": rationale,
        "evidence": evidence,
    }


def audit_species(species_id, existing_species, resolutions, media_candidates, measurement_records, review_decisions):
    species = next((item for item in existing_species if item["id"] == species_id), None)
    if species is None:
        raise ValueError("unknown species id")
    return {
        "species": species,
        "taxonomyResolution": next((item for item in resolutions if item.get("speciesId") == species_id), None),
        "mediaRecords": [item for item in media_candidates if item.get("speciesId") == species_id],
        "licenseAttribution": [
            {"recordId": item["recordId"], "license": item["license"], "attribution": item["attribution"]}
            for item in media_candidates if item.get("speciesId") == species_id
        ],
        "sizeEvidence": [item for item in measurement_records if item.get("speciesId") == species_id],
        "reviewDecision": next((item for item in review_decisions if item.get("speciesId") == species_id), None),
    }
