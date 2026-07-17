"""GBIF Japan seed adapter: source-backed, never invented, offline-driven."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.campaign3.t11_species_reserve.gbif_japan_seed import (
    GbifJapanSeedAdapter, _is_japanese_script,
)


class FakeTransport:
    """Serve canned GBIF payloads and record every call."""

    def __init__(self, facets=None, taxa=None, vernaculars=None):
        self.facets = facets or {}
        self.taxa = taxa or {}
        self.vernaculars = vernaculars or {}
        self.calls = []

    def get_json(self, source, endpoint, params, headers):
        self.calls.append((source, endpoint, dict(params)))
        if endpoint == "/v1/occurrence/search":
            counts = self.facets.get(params["taxonKey"], [])
            return {"facets": [{"field": "SPECIES_KEY", "counts": counts}]}
        if endpoint.endswith("/vernacularNames"):
            key = int(endpoint.split("/")[3])
            return {"results": self.vernaculars.get(key, [])}
        if endpoint.startswith("/v1/species/"):
            return self.taxa.get(int(endpoint.rsplit("/", 1)[1]), {})
        raise AssertionError(f"unexpected endpoint {endpoint}")


def taxon(key, name="Genus species", rank="SPECIES", order="Coleoptera", family="Lucanidae"):
    return {"key": key, "scientificName": name, "rank": rank, "order": order, "family": family}


class ScriptTests(unittest.TestCase):
    def test_japanese_script_is_recognized(self):
        for value in ("センチコガネ", "くろおさむし", "黒歩行虫"):
            self.assertTrue(_is_japanese_script(value), value)

    def test_romaji_is_not_japanese_script(self):
        for value in ("Senchi-kogane", "Kuro-osamushi", ""):
            self.assertFalse(_is_japanese_script(value), value)


class SeedTests(unittest.TestCase):
    def setUp(self):
        self.transport = FakeTransport(
            facets={1470: [{"name": "101", "count": 900}, {"name": "102", "count": 800}]},
            taxa={101: taxon(101, "Phelotrupes laevistriatus"), 102: taxon(102, "Carabus albrechti")},
            vernaculars={
                101: [{"language": "jpn", "vernacularName": "センチコガネ"}],
                102: [{"language": "jpn", "vernacularName": "クロオサムシ"}],
            },
        )

    def adapter(self, **kwargs):
        return GbifJapanSeedAdapter(self.transport, orders={"Coleoptera": 1470}, **kwargs)

    def test_seed_is_fully_source_backed(self):
        seed = self.adapter().fetch(1)[0]
        self.assertEqual(seed["seedId"], "gbif_101")
        self.assertEqual(seed["scientificName"], "Phelotrupes laevistriatus")
        self.assertEqual(seed["japaneseName"], "センチコガネ")
        self.assertIn("gbif.org/species/101", seed["japaneseNameSource"])
        self.assertIn("gbif.org/species/101", seed["sourceReceipt"])
        self.assertEqual(seed["order"], "Coleoptera")
        self.assertEqual(seed["taxonRank"], "species")

    def test_species_without_a_japanese_name_is_skipped_not_invented(self):
        self.transport.vernaculars[101] = [{"language": "eng", "vernacularName": "dung beetle"}]
        seeds = self.adapter().fetch(2)
        self.assertEqual([s["seedId"] for s in seeds], ["gbif_102"],
                         "a species with no Japanese name must be skipped, never named")

    def test_romaji_only_vernacular_is_skipped(self):
        self.transport.vernaculars[101] = [{"language": "jpn", "vernacularName": "Senchi-kogane"}]
        self.assertEqual([s["seedId"] for s in self.adapter().fetch(2)], ["gbif_102"])

    def test_japanese_script_wins_over_a_romaji_sibling(self):
        self.transport.vernaculars[101] = [
            {"language": "jpn", "vernacularName": "Senchi-kogane"},
            {"language": "jpn", "vernacularName": "センチコガネ"},
        ]
        self.assertEqual(self.adapter().fetch(1)[0]["japaneseName"], "センチコガネ")

    def test_non_species_rank_is_skipped(self):
        self.transport.taxa[101] = taxon(101, "Genus", rank="GENUS")
        self.assertEqual([s["seedId"] for s in self.adapter().fetch(2)], ["gbif_102"])

    def test_rare_species_are_excluded_by_the_occurrence_floor(self):
        self.transport.facets[1470] = [{"name": "101", "count": 900}, {"name": "102", "count": 2}]
        seeds = self.adapter(min_occurrences=5).fetch(2)
        self.assertEqual([s["seedId"] for s in seeds], ["gbif_101"])

    def test_orders_are_interleaved_so_a_bounded_run_stays_broad(self):
        transport = FakeTransport(
            facets={1470: [{"name": "101", "count": 900}, {"name": "103", "count": 700}],
                    797: [{"name": "201", "count": 800}]},
            taxa={101: taxon(101, "A a"), 103: taxon(103, "A c"),
                  201: taxon(201, "B b", order="Lepidoptera")},
            vernaculars={101: [{"language": "jpn", "vernacularName": "あ"}],
                         103: [{"language": "jpn", "vernacularName": "う"}],
                         201: [{"language": "jpn", "vernacularName": "い"}]},
        )
        adapter = GbifJapanSeedAdapter(
            transport, orders={"Coleoptera": 1470, "Lepidoptera": 797})
        seeds = adapter.fetch(2)
        self.assertEqual({s["order"] for s in seeds}, {"Coleoptera", "Lepidoptera"},
                         "a two-seed run must not come from a single order")

    def test_offset_pages_without_repeating(self):
        first = self.adapter().fetch(1, offset=0)
        second = self.adapter().fetch(1, offset=1)
        self.assertNotEqual(first[0]["seedId"], second[0]["seedId"])

    def test_invalid_arguments_are_rejected(self):
        for limit, offset in ((0, 0), (-1, 0), (1, -1)):
            with self.assertRaises(ValueError):
                self.adapter().fetch(limit, offset)
        with self.assertRaises(ValueError):
            GbifJapanSeedAdapter(self.transport, orders={})
        with self.assertRaises(ValueError):
            GbifJapanSeedAdapter(self.transport, min_occurrences=0)

    def test_facet_query_scopes_to_japan(self):
        self.adapter().fetch(1)
        facet_call = next(c for c in self.transport.calls if c[1] == "/v1/occurrence/search")
        self.assertEqual(facet_call[2]["country"], "JP")
        self.assertEqual(facet_call[2]["rank"], "SPECIES")


if __name__ == "__main__":
    unittest.main()
