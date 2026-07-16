import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import unittest

import rules


class SexClaimTests(unittest.TestCase):
    """sexCovered is the card's promise, specimen.sex is the record's own value.
    Every value below occurs in the real catalog.
    """

    def test_mixed_record_asks_for_review(self):
        # Mixed means the media covers more than one sex, so more than one animal.
        state, reasons, flags = rules.check_sex_claim(
            {"sexCovered": "m"}, {"sex": "mixed"}
        )
        self.assertEqual(state, "review_required")
        self.assertEqual(flags, ["sex_mixed_specimen"])
        self.assertTrue(reasons)

    def test_indeterminate_is_a_note_not_a_verdict(self):
        # 41 real entries. Museums routinely leave beetles unsexed, which says
        # nothing about whether the photo is usable.
        state, reasons, flags = rules.check_sex_claim(
            {"sexCovered": "m"}, {"sex": "Indeterminate"}
        )
        self.assertEqual(state, "provisionally_valid")
        self.assertEqual(flags, ["sex_claim_unsupported"])
        self.assertEqual(reasons, [])

    def test_agreeing_sex_passes_clean(self):
        for covered, recorded in (("m", "Male"), ("f", "Female")):
            state, reasons, flags = rules.check_sex_claim(
                {"sexCovered": covered}, {"sex": recorded}
            )
            self.assertEqual(state, "provisionally_valid", recorded)
            self.assertEqual(flags, [])
            self.assertEqual(reasons, [])

    def test_contradicting_sex_asks_for_review(self):
        state, _, flags = rules.check_sex_claim({"sexCovered": "m"}, {"sex": "Female"})
        self.assertEqual(state, "review_required")
        self.assertEqual(flags, ["sex_claim_contradicted"])

    def test_both_and_missing_values_are_ignored(self):
        # sexCovered=both carries its own female variant, and most records have
        # no sex at all. Neither is a finding.
        for entry, specimen in (
            ({"sexCovered": "both"}, {"sex": "Male"}),
            ({"sexCovered": "m"}, {"sex": None}),
            ({}, {}),
        ):
            state, reasons, flags = rules.check_sex_claim(entry, specimen)
            self.assertEqual(state, "provisionally_valid")
            self.assertEqual(flags, [])
            self.assertEqual(reasons, [])

    def test_never_rejects(self):
        for recorded in ("mixed", "Male", "Female", "Indeterminate", None):
            state, _, _ = rules.check_sex_claim({"sexCovered": "m"}, {"sex": recorded})
            self.assertIn(state, ("review_required", "provisionally_valid"))


if __name__ == "__main__":
    unittest.main()
