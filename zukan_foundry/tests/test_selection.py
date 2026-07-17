"""T12 activation selection: fail-closed eligibility, rarity quota, census gate."""

import unittest

from zukan_foundry.selection import (
    EXPECTED_ORDINARY, EXPECTED_POOLS, EXPECTED_TOTAL, PER_SUBJECT, RARITY_QUOTA,
    assign_rarity, candidate_rejections, census, census_errors, eligible_by_subject,
    select_activation,
)


def clean(index, subject="kanji"):
    return {
        "candidateId": f"taxon_{index:06d}",
        "acceptedScientificName": f"Genus species{index}",
        "taxonRank": "species",
        "taxonKey": str(index),
        "synonyms": [],
        "japaneseName": f"むし{index:04d}",
        "japaneseNameSource": "gbif_vernacular",
        "order": "Coleoptera",
        "family": "Lucanidae",
        "taxonomySource": "gbif",
        "existingMatch": None,
        "subjectProposal": subject,
        "mediaCandidates": [{"occurrenceId": "o1"}],
        "sizeEvidence": [],
        "status": "media_found",
        "reviewReasons": [],
        "checkedAt": "2026-07-16T00:00:00Z",
        "sourceReceipt": "receipt-1",
    }


def full_set():
    records = []
    n = 0
    for subject in ("kanji", "keisan", "eitango"):
        for _ in range(PER_SUBJECT):
            records.append(clean(n, subject))
            n += 1
    return records


class EligibilityTests(unittest.TestCase):
    def test_clean_record_is_eligible(self):
        self.assertEqual(candidate_rejections(clean(1)), [])

    def test_unresolved_and_ambiguous_records_are_excluded(self):
        for field, value, marker in (
            ("status", "needs_review", "status:needs_review"),
            ("status", "no_hit", "status:no_hit"),
            ("taxonRank", "genus", "taxon_rank_not_species:genus"),
            ("japaneseName", "", "japanese_name_missing"),
            ("japaneseNameSource", "", "japanese_name_unverified"),
            ("order", "", "order_missing"),
            ("sourceReceipt", "", "source_receipt_missing"),
            ("mediaCandidates", [], "no_media_candidate"),
            ("reviewReasons", ["check"], "awaiting_human_review"),
            ("existingMatch", {"id": "x"}, "duplicate_of_existing_catalog_entry"),
            ("subjectProposal", "rika", "subject_proposal_invalid:rika"),
        ):
            record = clean(1)
            record[field] = value
            self.assertIn(marker, candidate_rejections(record), f"{field}={value!r}")

    def test_ambiguous_scientific_names_are_excluded(self):
        for name in ("Genus spp.", "Genus cf. species", "Genus aff. species", "Genus x hybrid"):
            record = clean(1)
            record["acceptedScientificName"] = name
            self.assertIn("accepted_name_ambiguous", candidate_rejections(record), name)

    def test_grouping_drops_ineligible_and_is_deterministic(self):
        records = [clean(1), clean(2, "keisan")]
        bad = clean(3)
        bad["status"] = "needs_review"
        records.append(bad)
        grouped = eligible_by_subject(records)
        self.assertEqual(len(grouped["kanji"]), 1)
        self.assertEqual(len(grouped["keisan"]), 1)
        self.assertEqual(eligible_by_subject(records), eligible_by_subject(list(reversed(records))))


class QuotaTests(unittest.TestCase):
    def test_rarity_quota_is_exact(self):
        assigned = assign_rarity([clean(i) for i in range(PER_SUBJECT)])
        counts = {}
        for record in assigned:
            counts[record["rarity"]] = counts.get(record["rarity"], 0) + 1
        self.assertEqual(counts, RARITY_QUOTA)
        self.assertEqual(sum(RARITY_QUOTA.values()), PER_SUBJECT)

    def test_rarity_quota_refuses_a_wrong_sized_set(self):
        with self.assertRaises(ValueError):
            assign_rarity([clean(i) for i in range(PER_SUBJECT - 1)])

    def test_assignment_does_not_mutate_the_input(self):
        source = [clean(i) for i in range(PER_SUBJECT)]
        assign_rarity(source)
        self.assertNotIn("rarity", source[0])


class ActivationTests(unittest.TestCase):
    def test_full_reserve_activates_and_matches_the_frozen_census(self):
        manifests, report = select_activation(full_set())
        self.assertTrue(report["activated"])
        self.assertEqual({s: len(v) for s, v in manifests.items()},
                         {"kanji": 270, "keisan": 270, "eitango": 270})
        result = report["census"]
        self.assertEqual(result["total"], EXPECTED_TOTAL)
        self.assertEqual(result["ordinary"], EXPECTED_ORDINARY)
        self.assertEqual(result["pools"], EXPECTED_POOLS)
        self.assertTrue(result["withinShareGate"])
        self.assertEqual(census_errors(result), [])

    def test_a_shortfall_is_handed_back_and_never_padded(self):
        records = full_set()
        # Remove one kanji candidate: that subject can no longer fill its quota.
        records.remove(next(r for r in records if r["subjectProposal"] == "kanji"))
        manifests, report = select_activation(records)
        self.assertEqual(manifests, {}, "a shortfall must not activate any subject")
        self.assertFalse(report["activated"])
        self.assertEqual(report["shortfalls"], {"kanji": 1})
        self.assertIn("handback", report)

    def test_ineligible_candidates_do_not_fill_a_quota(self):
        records = full_set()
        for record in records[:5]:
            record["status"] = "needs_review"
        manifests, report = select_activation(records)
        self.assertEqual(manifests, {})
        self.assertEqual(report["shortfalls"], {"kanji": 5})

    def test_surplus_is_bounded_to_the_quota(self):
        records = full_set() + [clean(9000 + i, "kanji") for i in range(20)]
        manifests, report = select_activation(records)
        self.assertTrue(report["activated"])
        self.assertEqual(len(manifests["kanji"]), PER_SUBJECT)
        self.assertEqual(report["eligibleCounts"]["kanji"], PER_SUBJECT + 20)

    def test_census_errors_detect_a_wrong_activation_size(self):
        short = census({"kanji": [clean(1)], "keisan": [], "eitango": []})
        self.assertNotEqual(census_errors(short), [])

    def test_empty_reserve_reports_every_subject_short(self):
        manifests, report = select_activation([])
        self.assertEqual(manifests, {})
        self.assertEqual(report["shortfalls"],
                         {"kanji": 270, "keisan": 270, "eitango": 270})


if __name__ == "__main__":
    unittest.main()
