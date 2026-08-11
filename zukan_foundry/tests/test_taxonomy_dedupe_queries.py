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

    def test_catalog_entry_resolving_onto_another_entry_is_a_conflict(self):
        # "tagame" is a real catalog entry; resolving it onto the name owned by
        # "aburazemi" is conflicting taxonomy and must not be auto-confirmed.
        item = dict(self.candidates[0], speciesId="tagame")
        response = self.responses["Graptopsaltria nigrofuscata"]
        resolution = resolve_gbif_taxon(item, response, self.catalog_index)
        self.assertEqual(resolution["status"], "taxonomy_conflict")
        self.assertTrue(resolution["reviewRequired"])

    def test_new_candidate_matching_catalog_name_is_duplicate_not_conflict(self):
        # A reserve candidate is not a catalog entry, so a catalog name match
        # is a dedupe matter (catalog duplicate), never a taxonomy conflict.
        item = dict(self.candidates[0], speciesId="taxon_000001",
                    scientificName="Graptopsaltria nigrofuscata", jaName="アブラゼミ")
        response = self.responses["Graptopsaltria nigrofuscata"]
        resolution = resolve_gbif_taxon(item, response, self.catalog_index)
        self.assertEqual(resolution["status"], "resolved")
        self.assertFalse(resolution["reviewRequired"])
        dedupe = dedupe_catalog(item, resolution, self.catalog_index)
        self.assertEqual(dedupe["status"], "duplicate")
        self.assertIn("aburazemi", dedupe["matchedSpeciesIds"])

    def test_dedupe_hard_and_unique_rules(self):
        replacement = self.candidates[2]
        replacement_resolution = resolve_gbif_taxon(replacement, self.responses[replacement["scientificName"]], self.catalog_index)
        self.assertEqual(dedupe_catalog(replacement, replacement_resolution, self.catalog_index)["status"], "duplicate")
        new = self.candidates[0]
        new_resolution = resolve_gbif_taxon(new, self.responses[new["scientificName"]], self.catalog_index)
        self.assertEqual(dedupe_catalog(new, new_resolution, self.catalog_index)["status"], "unique")

    @staticmethod
    def species_key_response(**overrides):
        """A species/{key} shaped response, as the harvester stores it."""
        response = {
            "key": 1071335, "nubKey": 1071335, "rank": "SPECIES",
            "taxonomicStatus": "ACCEPTED",
            "scientificName": "Phelotrupes laevistriatus (Motschulsky, 1857)",
            "canonicalName": "Phelotrupes laevistriatus",
        }
        response.update(overrides)
        return response

    def species_key_candidate(self):
        return {
            "speciesId": "taxon_000001",
            "scientificName": "Phelotrupes laevistriatus (Motschulsky, 1857)",
            "acceptedName": None, "jaName": "センチコガネ",
        }

    def test_species_key_shape_resolves_accepted_species(self):
        resolution = resolve_gbif_taxon(
            self.species_key_candidate(), self.species_key_response(), self.catalog_index)
        self.assertEqual(resolution["status"], "resolved")
        self.assertEqual(resolution["backboneKey"], 1071335)
        self.assertEqual(resolution["rank"], "species")
        self.assertEqual(resolution["matchType"], "species_key")
        self.assertFalse(resolution["reviewRequired"])

    def test_species_key_shape_accepts_doubtful_status(self):
        resolution = resolve_gbif_taxon(
            self.species_key_candidate(),
            self.species_key_response(taxonomicStatus="DOUBTFUL"), self.catalog_index)
        self.assertEqual(resolution["status"], "resolved")

    def test_species_key_shape_rejects_synonym_status(self):
        resolution = resolve_gbif_taxon(
            self.species_key_candidate(),
            self.species_key_response(taxonomicStatus="SYNONYM"), self.catalog_index)
        self.assertEqual(resolution["status"], "unresolved")
        self.assertTrue(resolution["reviewRequired"])

    def test_species_key_shape_rejects_non_species_rank(self):
        resolution = resolve_gbif_taxon(
            self.species_key_candidate(),
            self.species_key_response(rank="GENUS"), self.catalog_index)
        self.assertEqual(resolution["status"], "unresolved")

    def test_species_key_shape_prefers_nub_key_over_key(self):
        resolution = resolve_gbif_taxon(
            self.species_key_candidate(),
            self.species_key_response(key=999, nubKey=1071335), self.catalog_index)
        self.assertEqual(resolution["backboneKey"], 1071335)

    def test_species_key_shape_falls_back_to_key_without_nub_key(self):
        response = self.species_key_response()
        del response["nubKey"]
        resolution = resolve_gbif_taxon(
            self.species_key_candidate(), response, self.catalog_index)
        self.assertEqual(resolution["backboneKey"], 1071335)
        self.assertEqual(resolution["status"], "resolved")

    def test_empty_response_stays_unresolved(self):
        resolution = resolve_gbif_taxon(self.species_key_candidate(), {}, self.catalog_index)
        self.assertEqual(resolution["status"], "unresolved")
        self.assertEqual(resolution["matchType"], "none")
        self.assertEqual(resolution["backboneKey"], 0)

    def test_query_priority_is_deterministic(self):
        item = self.candidates[0]
        resolution = resolve_gbif_taxon(item, self.responses[item["scientificName"]], self.catalog_index)
        first = generate_queries(item, resolution)
        self.assertEqual(first, generate_queries(item, resolution))
        self.assertEqual([query["type"] for query in first], ["species_exact", "synonym_exact", "canonical_relaxed", "japanese_name", "genus_locality"])


if __name__ == "__main__":
    unittest.main()
