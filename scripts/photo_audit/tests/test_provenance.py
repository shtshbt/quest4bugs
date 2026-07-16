import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import unittest

import rules


class RecordBasisTests(unittest.TestCase):
    """basisOfRecord separates book plates from curated specimens far better
    than pixels do. Every case below is a real catalog value.
    """

    def test_machine_observation_asks_for_review(self):
        state, reasons, flags = rules.check_record_basis(
            {"basisOfRecord": "MachineObservation"}
        )
        self.assertEqual(state, "review_required")
        self.assertEqual(flags, ["machine_observation_record"])
        self.assertTrue(reasons)

    def test_preserved_specimen_passes(self):
        # Both spellings occur in the catalog: 463 uppercase, 21 CamelCase.
        for basis in ("PRESERVED_SPECIMEN", "PreservedSpecimen"):
            state, reasons, flags = rules.check_record_basis({"basisOfRecord": basis})
            self.assertEqual(state, "provisionally_valid", basis)
            self.assertEqual(flags, [])
            self.assertEqual(reasons, [])

    def test_human_observation_passes(self):
        state, _, flags = rules.check_record_basis({"basisOfRecord": "HumanObservation"})
        self.assertEqual(state, "provisionally_valid")
        self.assertEqual(flags, [])

    def test_missing_basis_passes(self):
        state, _, flags = rules.check_record_basis({})
        self.assertEqual(state, "provisionally_valid")
        self.assertEqual(flags, [])

    def test_never_rejects(self):
        for basis in ("MachineObservation", "PRESERVED_SPECIMEN", "", None):
            state, _, _ = rules.check_record_basis({"basisOfRecord": basis})
            self.assertIn(state, ("review_required", "provisionally_valid"))


class OccurrenceRecordTests(unittest.TestCase):
    def test_missing_key_is_flagged(self):
        self.assertEqual(rules.check_occurrence_record({}), ["no_occurrence_record"])

    def test_present_key_is_clean(self):
        self.assertEqual(
            rules.check_occurrence_record({"gbifOccurrenceKey": "1056811977"}), []
        )

    def test_returns_flags_only_not_a_state(self):
        # This signal covers 423 entries. It must stay a note, never a verdict.
        result = rules.check_occurrence_record({})
        self.assertIsInstance(result, list)
        for state in ("missing", "machine_reject", "review_required", "provisionally_valid"):
            self.assertNotIn(state, result)


class CorpusAndStageWordTests(unittest.TestCase):
    def test_illustration_corpus_rejects(self):
        hits = rules.find_danger_words(
            {"catalogNumber": "File:Belostoma - Print - Iconographia Zoologica.jpg"}, {}
        )
        words = {h["word"]: h["target"] for h in hits}
        self.assertEqual(words.get("iconographia"), "machine_reject")
        self.assertEqual(words.get("zoologica"), "machine_reject")

    def test_author_surnames_are_not_danger_words(self):
        # Georgiy Jacobson plates are caught by check_record_basis. Keying on the
        # surname would reject a future specimen collected by another Jacobson.
        hits = rules.find_danger_words(
            {"catalogNumber": "File:Lucanus maculifemoratus Jacobson.png",
             "recordedBy": "Georgiy Jacobson"},
            {"creator": "Georgiy Jacobson"},
        )
        self.assertEqual([h["word"] for h in hits], [])
        # but the record basis does catch it
        state, _, _ = rules.check_record_basis({"basisOfRecord": "MachineObservation"})
        self.assertEqual(state, "review_required")

    def test_group_behaviour_asks_for_review(self):
        for filename, word in (
            ("File:Close wing Mud puddling activity of Graphium sarpedon.jpg", "puddling"),
            ("File:A huntsman spider preying upon a cockroach.jpg", "preying"),
        ):
            hits = rules.find_danger_words({"catalogNumber": filename}, {})
            words = {h["word"]: h["target"] for h in hits}
            self.assertEqual(words.get(word), "review_required", filename)

    def test_non_adult_stage_asks_for_review(self):
        for filename, word in (
            ("File:Imago and larvae of Carabus blaptoides rugipennis.png", "larvae"),
            ("File:(MHNT) Nymphe de Phaneroptera falcata.jpg", "nymphe"),
            ("File:Yellow and black spotted caterpillar on the grass.jpg", "caterpillar"),
        ):
            hits = rules.find_danger_words({"catalogNumber": filename}, {})
            words = {h["word"]: h["target"] for h in hits}
            self.assertEqual(words.get(word), "review_required", filename)

    def test_clean_specimen_still_hits_nothing(self):
        hits = rules.find_danger_words(
            {"catalogNumber": "BMNH(E)668002", "recordedBy": None}, {}
        )
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
