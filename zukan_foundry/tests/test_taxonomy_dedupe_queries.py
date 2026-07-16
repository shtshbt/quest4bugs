import json
import unittest
from pathlib import Path

from zukan_foundry.catalog import build_index, build_normalized_index
from zukan_foundry.dedupe import dedupe_catalog
from zukan_foundry.queries import generate_queries
from zukan_foundry.taxonomy import resolve_gbif_taxon


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "zukan_foundry" / "tests" / "fixtures"
SHA = "5ae22a4819e949aed8c0b352a748f2763cb926e8"


class TaxonomyDedupeQueryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        species = build_index(ROOT)[0]["species"]
        cls.catalog_index = build_normalized_index(species, SHA)
        cls.candidates = json.loads((FIXTURES / "fixture_candidates.json").read_text(encoding="utf-8"))
        cls.responses = json.loads((FIXTURES / "gbif_taxonomy.json").read_text(encoding="utf-8"))

    def test_fixture_taxonomy_response_is_normalized(self):
        item = self.candidates[0]
        resolution = resolve_gbif_taxon(item, self.responses[item["scientificName"]], self.catalog_index)
        self.assertEqual(resolution["status"], "resolved")
        self.assertEqual(resolution["backboneKey"], 9001)

    def test_catalog_conflict_is_not_auto_confirmed(self):
        item = dict(self.candidates[0], speciesId="different_id")
        response = self.responses["Graptopsaltria nigrofuscata"]
        resolution = resolve_gbif_taxon(item, response, self.catalog_index)
        self.assertEqual(resolution["status"], "taxonomy_conflict")
        self.assertTrue(resolution["reviewRequired"])

    def test_dedupe_hard_and_unique_rules(self):
        replacement = self.candidates[2]
        replacement_resolution = resolve_gbif_taxon(replacement, self.responses[replacement["scientificName"]], self.catalog_index)
        self.assertEqual(dedupe_catalog(replacement, replacement_resolution, self.catalog_index)["status"], "duplicate")
        new = self.candidates[0]
        new_resolution = resolve_gbif_taxon(new, self.responses[new["scientificName"]], self.catalog_index)
        self.assertEqual(dedupe_catalog(new, new_resolution, self.catalog_index)["status"], "unique")

    def test_query_priority_is_deterministic(self):
        item = self.candidates[0]
        resolution = resolve_gbif_taxon(item, self.responses[item["scientificName"]], self.catalog_index)
        first = generate_queries(item, resolution)
        self.assertEqual(first, generate_queries(item, resolution))
        self.assertEqual([query["type"] for query in first], ["species_exact", "synonym_exact", "canonical_relaxed", "japanese_name", "genus_locality"])


if __name__ == "__main__":
    unittest.main()
