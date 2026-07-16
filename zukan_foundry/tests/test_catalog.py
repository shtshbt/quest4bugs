import unittest
from pathlib import Path

from zukan_foundry.catalog import (
    build_index,
    build_normalized_index,
    canonical_scientific_name,
    normalize_japanese,
    parse_bugs,
    split_scientific_name,
)


ROOT = Path(__file__).resolve().parents[2]
SHA = "5ae22a4819e949aed8c0b352a748f2763cb926e8"


class CatalogTests(unittest.TestCase):
    def test_parses_every_current_catalog_entry(self):
        records = parse_bugs(ROOT / "shared" / "bugs.js")
        self.assertEqual(len(records), 1213)
        self.assertEqual(len({item["id"] for item in records}), 1213)
        for item in records:
            self.assertTrue({"id", "jaName", "scientificName"} <= item.keys())

    def test_build_is_deterministic_and_records_commit(self):
        species = build_index(ROOT)[0]["species"]
        first = build_normalized_index(species, SHA)
        second = build_normalized_index(species, SHA)
        self.assertEqual(first, second)
        self.assertEqual(first["sourceCommit"], SHA)
        self.assertEqual(first["count"], 1213)

    def test_name_normalization(self):
        self.assertEqual(normalize_japanese(" モルフォ・チョウｰ "), "モルフォチョウー")
        self.assertEqual(canonical_scientific_name("Dorcus hopei binodulosus Waterhouse, 1874"), "Dorcus hopei binodulosus")
        self.assertEqual(canonical_scientific_name("MORPHO spp."), "Morpho spp.")
        split = split_scientific_name("Dorcus hopei binodulosus")
        self.assertEqual((split["genus"], split["species"], split["subspecies"]), ("Dorcus", "hopei", "binodulosus"))
        self.assertTrue(split_scientific_name("Cosmodela sp.")["isGenusLevel"])


if __name__ == "__main__":
    unittest.main()
