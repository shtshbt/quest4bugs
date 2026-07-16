import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import unittest

import rules


class FilenameTaxonTests(unittest.TestCase):
    """The filename is written upstream, independently of the catalog, so it is
    the only field that can reveal that the photo is the wrong animal.
    Every case below is a real catalog entry.
    """

    def test_non_insect_photo_is_flagged(self):
        # Real entry: the frame is a longhorn beetle, the file is a train pod.
        state, reasons, check = rules.check_filename_taxon(
            {"catalogNumber": "File:Virgin Hyperloop One XP-1 pod at night.jpg"},
            "Xylotrechus pyrrhoderus",
            "ブドウトラカミキリ",
        )
        self.assertEqual(state, "review_required")
        self.assertTrue(check["decidable"])
        self.assertFalse(check["referencesTaxon"])
        self.assertTrue(reasons)

    def test_food_photo_is_flagged(self):
        # Species epithet cerealis must not be satisfied by the Italian "cereali".
        state, _, check = rules.check_filename_taxon(
            {"catalogNumber": "File:Vegetali, bacche, semi olio extravergine e cereali.jpeg"},
            "Eristalis cerealis",
            "オオハナアブ",
        )
        self.assertEqual(state, "review_required")
        self.assertFalse(check["referencesTaxon"])

    def test_other_species_filename_is_flagged(self):
        # Feuerwanze is the firebug, not Parastrachia.
        state, _, _ = rules.check_filename_taxon(
            {"catalogNumber": "File:Feuerwanze dorsal.jpg"},
            "Parastrachia japonensis",
            "ベニツチカメムシ",
        )
        self.assertEqual(state, "review_required")

    def test_matching_genus_passes(self):
        state, reasons, check = rules.check_filename_taxon(
            {"catalogNumber": "File:Dorcus rectus male dorsal.jpg"},
            "Dorcus rectus",
            "コクワガタ",
        )
        self.assertEqual(state, "provisionally_valid")
        self.assertTrue(check["referencesTaxon"])
        self.assertEqual(reasons, [])

    def test_matching_species_epithet_passes(self):
        # Genus may be recorded under a synonym while the epithet still matches.
        state, _, check = rules.check_filename_taxon(
            {"catalogNumber": "File:Carabus gehinii specimen.jpg"},
            "Damaster gehinii",
            "オオルリオサムシ",
        )
        self.assertEqual(state, "provisionally_valid")
        self.assertTrue(check["referencesTaxon"])

    def test_japanese_name_filename_passes(self):
        # Real entry. A correct photo named only in Japanese must not be flagged.
        state, _, check = rules.check_filename_taxon(
            {"catalogNumber": "File:サキシマヒラタクワガタ 2013-11-25 01-01.jpg"},
            "Dorcus titanus sakishimanus",
            "サキシマヒラタクワガタ",
        )
        self.assertEqual(state, "provisionally_valid")
        self.assertTrue(check["referencesTaxon"])

    def test_museum_accession_is_undecidable(self):
        # Real kokuwagata entry. The accession names nothing, so claiming a
        # mismatch would be unfounded.
        state, reasons, check = rules.check_filename_taxon(
            {"catalogNumber": "ETHZ-ENT0297070"},
            "Dorcus rectus",
            "コクワガタ",
        )
        self.assertEqual(state, "provisionally_valid")
        self.assertFalse(check["decidable"])
        self.assertEqual(reasons, [])

    def test_axis_never_rejects(self):
        # This signal is a suspicion, never grounds for machine_reject.
        for filename in (
            "File:Virgin Hyperloop One XP-1 pod at night.jpg",
            "File:Feuerwanze dorsal.jpg",
            "ETHZ-ENT0297070",
            "",
        ):
            state, _, _ = rules.check_filename_taxon(
                {"catalogNumber": filename}, "Dorcus rectus", "コクワガタ"
            )
            self.assertIn(state, ("review_required", "provisionally_valid"))


if __name__ == "__main__":
    unittest.main()
