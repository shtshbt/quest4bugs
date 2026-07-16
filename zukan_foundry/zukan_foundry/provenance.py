"""Normalize one offline source record into MediaCandidate."""


REQUIRED_RAW_FIELDS = {
    "sourceId", "recordId", "scientificName", "taxonRank", "institution",
    "basisOfRecord", "recordUrl", "license", "rightsHolder", "attribution",
    "width", "height", "view", "lifeStage", "sex", "collectionLocality",
    "identificationQualifier", "originalMetadata",
}


def normalize_media_candidate(raw):
    if not isinstance(raw, dict):
        raise ValueError("raw source response must be an object")
    missing = REQUIRED_RAW_FIELDS - raw.keys()
    if missing or not (raw.get("mediaUrl") or raw.get("retrievalReference")):
        detail = sorted(missing) or ["mediaUrl or retrievalReference"]
        raise ValueError("missing source fields: " + ", ".join(detail))
    return {
        "source": raw["sourceId"],
        "recordId": raw["recordId"],
        "scientificName": raw["scientificName"],
        "matchedRank": raw["taxonRank"],
        "institution": raw["institution"],
        "basisOfRecord": raw["basisOfRecord"],
        "mediaUrl": raw.get("mediaUrl"),
        "retrievalReference": raw.get("retrievalReference"),
        "recordUrl": raw["recordUrl"],
        "license": raw["license"],
        "rightsHolder": raw["rightsHolder"],
        "attribution": raw["attribution"],
        "width": raw["width"],
        "height": raw["height"],
        "view": raw["view"],
        "lifeStage": raw["lifeStage"],
        "sex": raw["sex"],
        "collectionLocality": raw["collectionLocality"],
        "identificationQualifier": raw["identificationQualifier"],
        "originalMetadata": raw["originalMetadata"],
        "matchType": raw.get("matchType", "accepted_exact"),
        "sourceTrust": raw.get("sourceTrust", 0),
        "flags": dict(raw.get("flags", {})),
        "evidenceRefs": {
            "image": raw.get("imageEvidence"),
            "measurement": raw.get("measurementEvidence"),
            "distribution": raw.get("distributionEvidence"),
            "japaneseName": raw.get("japaneseNameEvidence"),
        },
    }
