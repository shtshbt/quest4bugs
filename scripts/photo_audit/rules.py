#!/usr/bin/env python3
"""Deterministic offline audit rules.

Usage: import rules and call check_rights(source, entry, allowed)
"""

from __future__ import annotations

import re

REJECT_WORDS = (
    "distribution",
    "map",
    "plate",
    "drawing",
    "water colour",
    "illustration",
    "3d",
    "thumb",
    # Historical illustration corpora, named unambiguously in the filename.
    # Author surnames (Jacobson, Seitz, Curtis) are deliberately NOT listed:
    # they appear in recordedBy and creator, where a future collector sharing
    # the surname would be rejected without cause. Those plates are caught
    # structurally by check_record_basis instead.
    "iconographia",
    "zoologica",
    "lithograph",
    "engraving",
)
REVIEW_WORDS = (
    "male and female",
    "mating",
    "交尾",
    "unidentified",
    # More than one individual, or more than one species, in frame.
    "puddling",
    "preying",
    "predation",
    "swarm",
    "aggregation",
    # Not the adult form the zukan card is meant to show.
    "caterpillar",
    "larva",
    "larvae",
    "nymph",
    "nymphe",
    "pupa",
    "幼虫",
    "蛹",
)
TEXT_FIELDS = (
    "specimen.catalogNumber",
    "specimen.localityVerbatim",
    "specimen.localityNormalized",
    "specimen.recordedBy",
    "creditLine",
    "creator",
    "modifications",
)


def find_danger_words(specimen: dict, entry: dict) -> list[dict]:
    """Return lexical danger-word matches from the approved text fields."""
    values = {
        "specimen.catalogNumber": specimen.get("catalogNumber", ""),
        "specimen.localityVerbatim": specimen.get("localityVerbatim", ""),
        "specimen.localityNormalized": specimen.get("localityNormalized", ""),
        "specimen.recordedBy": specimen.get("recordedBy", ""),
        "creditLine": entry.get("creditLine", ""),
        "creator": entry.get("creator", ""),
        "modifications": " ".join(str(value) for value in entry.get("modifications", []) or []),
    }
    matches = []
    for field in TEXT_FIELDS:
        original = str(values[field] or "")
        folded = original.casefold()
        for word in REJECT_WORDS + REVIEW_WORDS:
            pattern = rf"(?<![a-z0-9]){re.escape(word)}s?(?![a-z0-9])"
            if re.search(pattern, folded):
                matches.append(
                    {
                        "word": word,
                        "field": field,
                        "value": original[:200],
                        "target": "machine_reject" if word in REJECT_WORDS else "review_required",
                    }
                )
    return matches


def check_record_basis(specimen: dict) -> tuple[str, list[str], list[str]]:
    """Flag machine generated records, which are usually book plates.

    Measured on this catalog: 39 of 54 MachineObservation entries carry a
    lexical plate or drawing marker, against 0 of 463 PRESERVED_SPECIMEN. This
    is the signal that catches the Georgiy Jacobson plates whose filenames omit
    the word plate, without keying on the author's surname.

    It asks for review rather than rejecting, because the remaining 28 percent
    are genuine images. Pixel based drawing detection was measured and rejected:
    a printed colour plate carries more distinct colours than a real specimen
    photograph, so palette statistics separate nothing.
    """
    basis = str(specimen.get("basisOfRecord") or "")
    if basis.casefold().replace("_", "") != "machineobservation":
        return "provisionally_valid", [], []
    return (
        "review_required",
        [f"basisOfRecord={basis}: machine generated record, usually a plate rather than a specimen photo"],
        ["machine_observation_record"],
    )


def check_sex_claim(entry: dict, specimen: dict) -> tuple[str, list[str], list[str]]:
    """Compare the card's sexCovered claim against the specimen's own sex field.

    Measured on this catalog: 0 entries state a sex that the record flatly
    contradicts, 1 entry is recorded as mixed, and 41 claim a male while the
    record says indeterminate.

    Only mixed asks for review, because mixed means the media covers more than
    one sex and therefore more than one individual. Indeterminate is a note
    only: museums routinely leave beetles unsexed, and that says nothing about
    whether the photograph is usable.
    """
    covered = str(entry.get("sexCovered") or "").casefold()
    recorded = str(specimen.get("sex") or "").casefold()
    if covered not in ("m", "f") or not recorded:
        return "provisionally_valid", [], []
    if recorded.startswith("mixed"):
        return (
            "review_required",
            [f"sexCovered={covered} but specimen.sex={recorded}: media covers more than one sex"],
            ["sex_mixed_specimen"],
        )
    expected = {"m": "male", "f": "female"}[covered]
    if recorded.startswith(expected):
        return "provisionally_valid", [], []
    if recorded.startswith(("male", "female")):
        return (
            "review_required",
            [f"sexCovered={covered} contradicts specimen.sex={recorded}"],
            ["sex_claim_contradicted"],
        )
    return "provisionally_valid", [], ["sex_claim_unsupported"]


def check_occurrence_record(source: dict) -> list[str]:
    """Note a missing occurrence record. Flag only, never a state change.

    Entries without a gbifOccurrenceKey are 11.6 percent lexically bad against
    0 percent for entries with one, so the signal is real but weak, and it
    covers 423 entries. Escalating on it would swamp the review bundle and
    bury the findings a human can actually act on.
    """
    return [] if source.get("gbifOccurrenceKey") else ["no_occurrence_record"]


def check_filename_taxon(
    specimen: dict,
    scientific_name: str,
    ja_name: str,
) -> tuple[str, list[str], dict]:
    """Check whether the source filename references the catalogued taxon.

    The catalog and bugs.js scientific names are written by the same fetch step,
    so comparing them to each other cannot reveal that the photo itself is the
    wrong animal. The source filename is written independently by the upstream
    institution or uploader, so it is the one field that can disagree.

    Only Wikimedia style names (File:...) carry a taxon. Museum accession
    numbers such as ETHZ-ENT0297070 name nothing, so they return no signal
    rather than an accusation that cannot be grounded.

    This never rejects. A filename can legitimately use a vernacular name in a
    language we cannot resolve, so an unreferenced taxon means a human should
    look, not that the photo is wrong.
    """
    filename = str(specimen.get("catalogNumber") or "")
    check = {
        "decidable": False,
        "referencesTaxon": False,
        "filename": filename[:200],
    }
    if not filename.casefold().startswith("file:") or not scientific_name:
        return "provisionally_valid", [], check
    check["decidable"] = True
    if _references_taxon(filename, scientific_name, ja_name):
        check["referencesTaxon"] = True
        return "provisionally_valid", [], check
    return (
        "review_required",
        [
            f"source filename does not reference the catalogued taxon "
            f"({scientific_name}): {filename[:120]}"
        ],
        check,
    )


def _references_taxon(filename: str, scientific_name: str, ja_name: str) -> bool:
    folded = filename.casefold()
    parts = scientific_name.split()
    if parts and parts[0].casefold() in folded:
        return True
    if len(parts) > 1 and parts[1].casefold() in folded:
        return True
    return bool(ja_name) and ja_name in filename


def check_rights(source: dict, entry: dict, allowed: set[str]) -> tuple[str, list[str]]:
    """Check declared license and required CC-BY attribution fields."""
    license_name = source.get("mediaLicense")
    if not license_name:
        return "review_required", ["mediaLicense missing"]
    if license_name not in allowed:
        return "machine_reject", [f"disallowed mediaLicense: {license_name}"]
    reasons = []
    if license_name.startswith("CC-BY"):
        required = (
            (entry.get("creditLine"), "creditLine"),
            (source.get("institutionRecordUrl"), "institutionRecordUrl"),
            (source.get("licenseUrl"), "licenseUrl"),
        )
        reasons = [f"CC-BY requires {field}" for value, field in required if not value]
    return ("review_required", reasons) if reasons else ("provisionally_valid", [])


def check_identification(catalog_name: str, bug: dict | None) -> tuple[str, list[str], dict]:
    """Compare catalog and bugs.js names without making rejection decisions."""
    bugs_name = "" if bug is None else str(bug.get("scientificName") or "")
    bugs_rank = "" if bug is None else str(bug.get("taxonRank") or "species")
    comparison = {
        "catalogName": catalog_name,
        "bugsName": bugs_name,
        "bugsRank": bugs_rank,
        "match": "exact",
        "notes": [],
    }
    if bug is None:
        comparison["match"] = "missing_bug"
        comparison["notes"].append("bugs.js record missing")
        return "review_required", ["bugs.js record missing"], comparison

    catalog_normalized = _normalize_name(catalog_name)
    bugs_normalized = _normalize_name(bugs_name)
    reasons = []
    if bugs_rank.casefold() == "genus":
        reasons.append("bugs.js taxonRank=genus does not justify species-level approval")
    if _is_open_name(catalog_normalized) or _is_open_name(bugs_normalized):
        reasons.append("open nomenclature")
    if _is_family_only(bugs_normalized):
        reasons.append("family-only identification")
    if catalog_normalized != bugs_normalized:
        if _is_subspecies_pair(catalog_normalized, bugs_normalized):
            comparison["match"] = "subspecies"
            reasons.append("unverified subspecies match (recorded, not rejected)")
        else:
            comparison["match"] = "synonym_candidate"
            reasons.append("name mismatch; possible synonym, recorded, not rejected")
    comparison["notes"] = list(reasons)
    return ("review_required", reasons, comparison) if reasons else (
        "provisionally_valid",
        [],
        comparison,
    )


def _normalize_name(value: str) -> str:
    return " ".join(str(value or "").strip().casefold().split())


def _is_open_name(value: str) -> bool:
    return bool(re.search(r"\b(?:cf\.|aff\.)", value) or value.endswith((" sp.", " spp.")))


def _is_family_only(value: str) -> bool:
    return " " not in value and value.endswith(("idae", "inae"))


def _is_subspecies_pair(first: str, second: str) -> bool:
    first_parts = first.split()
    second_parts = second.split()
    return (len(first_parts) == 3 and first_parts[:2] == second_parts) or (
        len(second_parts) == 3 and second_parts[:2] == first_parts
    )
