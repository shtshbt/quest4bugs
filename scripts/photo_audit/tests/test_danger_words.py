import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import unittest

import rules


class DangerWordTests(unittest.TestCase):
    def assert_word_targets(self, catalog_number, expected):
        matches = rules.find_danger_words({"catalogNumber": catalog_number}, {})
        targets = {match["word"]: match["target"] for match in matches}
        for word, target in expected.items():
            self.assertEqual(targets.get(word), target, matches)

    def test_named_ineligible_catalog_numbers(self):
        cases = (
            (
                "File:Hyalessa maculaticollis distribution.png",
                {"distribution": "machine_reject"},
            ),
            (
                "File:Naturalis Biodiversity Center - RMNH.ART.591 - "
                "Homoeogryllus japonicus - Yūshi Ishizaki - Cock Blomhoff "
                "Collection - pencil drawing - water colour.jpg",
                {"drawing": "machine_reject", "water colour": "machine_reject"},
            ),
            (
                "File:Tagame-3D-VR-thumb.jpg",
                {"3d": "machine_reject", "thumb": "machine_reject"},
            ),
            (
                "File:Aid to the identification of insects (Plate 12).jpg",
                {"plate": "machine_reject"},
            ),
            (
                "File:Tiger beetle Cicindela chinensis japonica Thunberg, "
                "1781, male and female.jpg",
                {"male and female": "review_required"},
            ),
            ("File:ゲンゴロウの交尾.jpg", {"交尾": "review_required"}),
            (
                "File:Unidentified Cerambycidae (female) 2.jpg",
                {"unidentified": "review_required"},
            ),
        )
        for catalog_number, expected in cases:
            with self.subTest(catalog_number=catalog_number):
                self.assert_word_targets(catalog_number, expected)

    def test_false_positive_guards(self):
        values = (
            "Platerodrilus sp.",
            "Minahassa, Mapanget, Indonesia",
            "3d9d726f-0542-4f20-bf3d-59c34e6f3e85",
            "https://data.nhm.ac.uk/media/13cb5151-0923-4948-a164-d3903d79e273",
            "proxyImageThumbnailLarge",
            "BMNH(E)668002",
        )
        for value in values:
            with self.subTest(value=value):
                self.assertEqual(
                    rules.find_danger_words({"catalogNumber": value}, {}),
                    [],
                )

    def test_plural_forms_match(self):
        matches = rules.find_danger_words(
            {"catalogNumber": "Illustrations of typical specimens"},
            {},
        )
        self.assertIn("illustration", {match["word"] for match in matches})


if __name__ == "__main__":
    unittest.main()
