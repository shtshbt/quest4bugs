"""Select the activation set from a validated reserve.

Fail-closed: a candidate is eligible only when it positively proves it is safe
to ship. Anything unresolved, ambiguous, duplicated, or awaiting human review is
excluded rather than filled in. If a subject cannot reach its full quota from
clean candidates, the shortfall is reported and the subject is NOT activated;
the caller hands it back rather than padding it with weaker records.
"""

from zukan_foundry.catalog import normalize_japanese

SUBJECTS = ("kanji", "keisan", "eitango")
PER_SUBJECT = 270
RARITY_QUOTA = {"N": 189, "R": 62, "SR": 14, "SSR": 5}
# Census the activation must land on, per the frozen execution spec.
BASELINE_TOTAL = 1213
BASELINE_ORDINARY = 1121
BASELINE_POOLS = {"kanji": 333, "keisan": 380, "eitango": 408}
EXPECTED_TOTAL = 2023
EXPECTED_ORDINARY = 1931
EXPECTED_POOLS = {"kanji": 603, "keisan": 650, "eitango": 678}
SHARE_MIN, SHARE_MAX = 0.25, 0.40

_ELIGIBLE_STATUS = "media_found"
_AMBIGUOUS_RANKS = {"genus", "family", "order", "unranked"}
_AMBIGUOUS_MARKERS = ("spp.", "sp.", " cf. ", " aff. ", " x ", "hybrid")


def candidate_rejections(record):
    """Return the reasons a reserve record may not be activated. Empty means eligible."""
    reasons = []
    if not isinstance(record, dict):
        return ["not_object"]

    if record.get("status") != _ELIGIBLE_STATUS:
        reasons.append(f"status:{record.get('status') or 'missing'}")
    if record.get("existingMatch"):
        reasons.append("duplicate_of_existing_catalog_entry")

    rank = str(record.get("taxonRank") or "").strip().lower()
    if not rank:
        reasons.append("taxon_rank_missing")
    elif rank in _AMBIGUOUS_RANKS:
        reasons.append(f"taxon_rank_not_species:{rank}")

    name = str(record.get("acceptedScientificName") or "").strip()
    if not name:
        reasons.append("accepted_name_missing")
    else:
        padded = f" {name.lower()} "
        if any(marker in padded for marker in _AMBIGUOUS_MARKERS):
            reasons.append("accepted_name_ambiguous")

    if not str(record.get("japaneseName") or "").strip():
        reasons.append("japanese_name_missing")
    if not str(record.get("japaneseNameSource") or "").strip():
        reasons.append("japanese_name_unverified")
    if not str(record.get("order") or "").strip():
        reasons.append("order_missing")
    if record.get("reviewReasons"):
        reasons.append("awaiting_human_review")
    if not record.get("mediaCandidates"):
        reasons.append("no_media_candidate")
    if not str(record.get("sourceReceipt") or "").strip():
        reasons.append("source_receipt_missing")

    subject = str(record.get("subjectProposal") or "").strip()
    if subject not in SUBJECTS:
        reasons.append(f"subject_proposal_invalid:{subject or 'missing'}")

    return sorted(reasons)


def eligible_by_subject(records):
    """Group eligible records by subject. Ineligible records never appear."""
    grouped = {subject: [] for subject in SUBJECTS}
    for record in records or []:
        if candidate_rejections(record):
            continue
        grouped[record["subjectProposal"]].append(record)
    for subject in SUBJECTS:
        grouped[subject].sort(key=lambda item: (
            normalize_japanese(item.get("japaneseName", "")), item["candidateId"]))
    return grouped


def assign_rarity(selected):
    """Assign the frozen rarity quota deterministically across one subject's set."""
    if len(selected) != PER_SUBJECT:
        raise ValueError(f"rarity quota needs exactly {PER_SUBJECT} records, got {len(selected)}")
    assigned = []
    index = 0
    for tier in ("N", "R", "SR", "SSR"):
        for _ in range(RARITY_QUOTA[tier]):
            record = dict(selected[index])
            record["rarity"] = tier
            assigned.append(record)
            index += 1
    return assigned


def select_activation(records):
    """Select exactly PER_SUBJECT clean candidates per subject, fail-closed.

    Returns (manifests, report). manifests is empty unless every subject reached
    its full quota; a shortfall is never padded and never partially activated.
    """
    grouped = eligible_by_subject(records)
    counts = {subject: len(items) for subject, items in grouped.items()}
    shortfalls = {subject: PER_SUBJECT - count
                  for subject, count in counts.items() if count < PER_SUBJECT}
    report = {
        "eligibleCounts": counts,
        "shortfalls": shortfalls,
        "activated": not shortfalls,
    }
    if shortfalls:
        report["handback"] = (
            "Subjects short of a full clean quota are handed back to a reserve-repair "
            "task rather than activated. Discovery is out of scope for this lane, so "
            "the run stops here as a timeboxed checkpoint."
        )
        return {}, report

    manifests = {subject: assign_rarity(grouped[subject][:PER_SUBJECT]) for subject in SUBJECTS}
    report["census"] = census(manifests)
    return manifests, report


def census(manifests):
    """Compute the post-activation static census and the subject-share gate."""
    added = {subject: len(records) for subject, records in manifests.items()}
    pools = {subject: BASELINE_POOLS[subject] + added.get(subject, 0) for subject in SUBJECTS}
    ordinary = BASELINE_ORDINARY + sum(added.values())
    total = BASELINE_TOTAL + sum(added.values())
    shares = {subject: pools[subject] / ordinary for subject in SUBJECTS}
    return {
        "total": total,
        "ordinary": ordinary,
        "pools": pools,
        "shares": shares,
        "withinShareGate": all(SHARE_MIN <= share <= SHARE_MAX for share in shares.values()),
    }


def census_errors(result):
    """Return the ways a census misses the frozen expectation. Empty means it matches."""
    errors = []
    if result.get("total") != EXPECTED_TOTAL:
        errors.append(f"total:{result.get('total')}!={EXPECTED_TOTAL}")
    if result.get("ordinary") != EXPECTED_ORDINARY:
        errors.append(f"ordinary:{result.get('ordinary')}!={EXPECTED_ORDINARY}")
    for subject in SUBJECTS:
        actual = (result.get("pools") or {}).get(subject)
        if actual != EXPECTED_POOLS[subject]:
            errors.append(f"pool:{subject}:{actual}!={EXPECTED_POOLS[subject]}")
    if not result.get("withinShareGate"):
        errors.append("share_gate_violated")
    return sorted(errors)
