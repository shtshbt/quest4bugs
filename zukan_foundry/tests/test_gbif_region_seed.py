"""Komorebi region seed harvester: regional facets, name enrichment, resume."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.campaign3.t11_species_reserve.gbif_japan_seed import ORDER_KEYS
from tools.komorebi.gbif_region_seed import (
    REGION_ORDER_KEYS, GbifRegionSeedAdapter, load_regions, parse_polygon,
)
from tools.komorebi import harvest_region_seeds
from zukan_foundry.discovery import HttpTransport

REGIONS_FILE = Path(__file__).resolve().parents[2] / "tools" / "komorebi" / "regions.json"


class FakeTransport:
    """Serve canned GBIF payloads and record every call."""

    def __init__(self, facet_pages=None, taxa=None, vernaculars=None,
                 occurrence_counts=None):
        # facet_pages maps (filter_key, taxon_key) -> [page, page, ...] where
        # filter_key is ("country", code) or ("geometry", wkt).
        # occurrence_counts maps (filter_key, taxon_key) -> count for the
        # facet-less presence queries the must-have layer sends.
        self.facet_pages = facet_pages or {}
        self.taxa = taxa or {}
        self.vernaculars = vernaculars or {}
        self.occurrence_counts = occurrence_counts or {}
        self.calls = []

    def get_json(self, source, endpoint, params, headers):
        self.calls.append((source, endpoint, dict(params)))
        if endpoint == "/v1/occurrence/search":
            if "country" in params:
                filter_key = ("country", params["country"])
            else:
                filter_key = ("geometry", params.get("geometry"))
            if "facet" not in params:
                return {"count": self.occurrence_counts.get(
                    (filter_key, params["taxonKey"]), 0)}
            pages = self.facet_pages.get((filter_key, params["taxonKey"]), [])
            index = params.get("facetOffset", 0) // params["facetLimit"]
            counts = pages[index] if index < len(pages) else []
            return {"facets": [{"field": "SPECIES_KEY", "counts": counts}]}
        if endpoint.endswith("/vernacularNames"):
            key = int(endpoint.split("/")[3])
            return {"results": self.vernaculars.get(key, [])}
        if endpoint.startswith("/v1/species/"):
            return self.taxa.get(int(endpoint.rsplit("/", 1)[1]), {})
        raise AssertionError(f"unexpected endpoint {endpoint}")


def taxon(key, name="Genus species", rank="SPECIES", order="Coleoptera",
          family="Lucanidae", klass="Insecta"):
    return {"key": key, "scientificName": name, "rank": rank, "class": klass,
            "order": order, "family": family}


def order_taxon(name):
    return {"scientificName": name, "rank": "ORDER", "class": "Insecta"}


def point_in_polygon(lon, lat, ring):
    """Ray-casting point test against a closed [(lon, lat), ...] ring."""
    inside = False
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        if (y0 > lat) != (y1 > lat):
            crossing = x0 + (lat - y0) * (x1 - x0) / (y1 - y0)
            if lon < crossing:
                inside = not inside
    return inside


def write_regions(directory, data):
    path = Path(directory) / "regions.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


class RegionsFileTests(unittest.TestCase):
    """The shipped regions file is data the harvester trusts, so it is tested."""

    def test_shipped_regions_file_defines_the_four_initial_regions(self):
        regions = load_regions(REGIONS_FILE)
        self.assertEqual(sorted(regions),
                         ["australia", "borneo", "costa_rica", "madagascar"])
        self.assertEqual(regions["madagascar"]["countries"], ["MG"])
        self.assertEqual(regions["australia"]["countries"], ["AU"])
        self.assertEqual(regions["costa_rica"]["countries"], ["CR"])
        self.assertNotIn("countries", regions["borneo"],
                         "Borneo spans three countries, so it must be geometry-only")
        self.assertTrue(regions["borneo"]["geometry"].startswith("POLYGON(("))

    def test_shipped_regions_all_name_their_flagships(self):
        # Frequency-ranked harvests drop famous-but-thinly-recorded species
        # (docs/komorebi_regions.md 6 章), so every initial region must ship a
        # verified must-have list.
        regions = load_regions(REGIONS_FILE)
        for region_id, region in regions.items():
            self.assertGreaterEqual(len(region.get("mustHave") or []), 2, region_id)
        madagascar_keys = [entry["speciesKey"]
                           for entry in regions["madagascar"]["mustHave"]]
        self.assertIn(1994576, madagascar_keys,
                      "the hissing cockroach is the reason Blattodea exists here")

    def test_borneo_polygon_covers_the_island(self):
        ring = parse_polygon(load_regions(REGIONS_FILE)["borneo"]["geometry"])
        for place, lon, lat in (
                ("Kuching, Sarawak", 110.35, 1.55),
                ("Kudat, Sabah", 116.84, 6.88),
                ("Bandar Seri Begawan, Brunei", 114.94, 4.94),
                ("Pontianak, West Kalimantan", 109.34, -0.03),
                ("Banjarmasin, South Kalimantan", 114.59, -3.32),
                ("Balikpapan, East Kalimantan", 116.85, -1.24),
                ("Tanjung Mangkalihat, east cape", 118.98, 1.03)):
            self.assertTrue(point_in_polygon(lon, lat, ring), place)

    def test_borneo_polygon_excludes_peninsular_malaysia_java_and_sulawesi(self):
        ring = parse_polygon(load_regions(REGIONS_FILE)["borneo"]["geometry"])
        for place, lon, lat in (
                ("Kuala Lumpur", 101.69, 3.14),
                ("Kuantan, east peninsular coast", 103.33, 3.81),
                ("Johor Bahru", 103.76, 1.49),
                ("Singapore", 103.85, 1.29),
                ("Jakarta, Java", 106.85, -6.21),
                ("Semarang, Java", 110.42, -6.99),
                ("Surabaya, Java", 112.74, -7.25),
                ("Makassar, Sulawesi", 119.41, -5.13),
                ("Palu, Sulawesi", 119.87, -0.90)):
            self.assertFalse(point_in_polygon(lon, lat, ring), place)

    def test_region_without_countries_or_geometry_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_regions(tmp, {"nowhere": {"label": "Nowhere"}})
            with self.assertRaises(ValueError):
                load_regions(path)

    def test_missing_label_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_regions(tmp, {"mg": {"countries": ["MG"]}})
            with self.assertRaises(ValueError):
                load_regions(path)

    def test_lowercase_country_code_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_regions(tmp, {"mg": {"label": "M", "countries": ["mg"]}})
            with self.assertRaises(ValueError):
                load_regions(path)

    def test_unknown_region_key_is_rejected_as_a_probable_typo(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_regions(tmp, {"mg": {"label": "M", "countires": ["MG"]}})
            with self.assertRaises(ValueError):
                load_regions(path)

    def test_must_have_entries_are_validated_up_front(self):
        base = {"label": "M", "countries": ["MG"]}
        for bad in ([],                                          # empty list
                    "1994576",                                    # not a list
                    [{"speciesKey": 1994576}],                    # missing label
                    [{"speciesKey": 1994576, "label": " "}],      # blank label
                    [{"speciesKey": "1994576", "label": "G"}],    # string key
                    [{"speciesKey": True, "label": "G"}],         # bool key
                    [{"speciesKey": 0, "label": "G"}],            # non-positive
                    [{"speciesKey": 1, "label": "G", "note": "x"}]):  # typo key
            with tempfile.TemporaryDirectory() as tmp:
                path = write_regions(tmp, {"mg": dict(base, mustHave=bad)})
                with self.assertRaises(ValueError, msg=repr(bad)):
                    load_regions(path)

    def test_region_without_must_have_is_still_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_regions(tmp, {"mg": {"label": "M", "countries": ["MG"]}})
            self.assertEqual(load_regions(path)["mg"]["label"], "M")

    def test_clockwise_polygon_is_rejected_before_gbif_can_reject_it(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_regions(tmp, {"box": {
                "label": "B", "geometry": "POLYGON((0 0, 0 2, 2 2, 2 0, 0 0))"}})
            with self.assertRaises(ValueError):
                load_regions(path)

    def test_unclosed_polygon_ring_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_polygon("POLYGON((0 0, 2 0, 2 2, 0 2))")

    def test_non_polygon_geometry_is_rejected(self):
        for wkt in ("POINT(1 2)", "POLYGON((0 0, 2 0, 2 2, 0 2, 0 0), (1 1, 1.5 1, 1 1.5, 1 1))", 42):
            with self.assertRaises(ValueError):
                parse_polygon(wkt)


class RegionOrderKeysTests(unittest.TestCase):
    """Blattodea is a komorebi-only widening of the shared order mapping."""

    def test_region_orders_add_blattodea_without_touching_the_shared_mapping(self):
        self.assertEqual(REGION_ORDER_KEYS["Blattodea"], 800)
        self.assertNotIn("Blattodea", ORDER_KEYS,
                         "the domestic harvester must keep its ten orders")
        self.assertEqual({name: key for name, key in REGION_ORDER_KEYS.items()
                          if name != "Blattodea"}, ORDER_KEYS)

    def test_adapter_defaults_to_the_region_orders(self):
        adapter = GbifRegionSeedAdapter(
            FakeTransport(), "testregion", {"label": "M", "countries": ["MG"]})
        self.assertEqual(adapter.orders, REGION_ORDER_KEYS)


class RegionQueryTests(unittest.TestCase):
    def adapter(self, region, transport, orders=None, **kwargs):
        return GbifRegionSeedAdapter(
            transport, "testregion", region,
            orders=orders or {"Coleoptera": 1470}, **kwargs)

    def test_country_filter_scopes_the_facet_query(self):
        transport = FakeTransport(
            facet_pages={(("country", "MG"), 1470): [[{"name": "101", "count": 9}]]})
        found = self.adapter({"label": "M", "countries": ["MG"]}, transport).region_species(5)
        self.assertEqual([key for key, _, _ in found], [101])
        call = transport.calls[0]
        self.assertEqual(call[2]["country"], "MG")
        self.assertEqual(call[2]["rank"], "SPECIES")
        self.assertNotIn("geometry", call[2])

    def test_geometry_filter_is_passed_verbatim_without_country(self):
        wkt = "POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))"
        transport = FakeTransport(
            facet_pages={(("geometry", wkt), 1470): [[{"name": "101", "count": 9}]]})
        found = self.adapter({"label": "B", "geometry": wkt}, transport).region_species(5)
        self.assertEqual([key for key, _, _ in found], [101])
        call = transport.calls[0]
        self.assertEqual(call[2]["geometry"], wkt)
        self.assertNotIn("country", call[2])

    def test_facet_offset_pages_past_the_first_page(self):
        transport = FakeTransport(facet_pages={(("country", "MG"), 1470): [
            [{"name": "101", "count": 9}, {"name": "102", "count": 8}],
            [{"name": "103", "count": 7}],
        ]})
        adapter = self.adapter({"label": "M", "countries": ["MG"]}, transport)
        adapter.facet_page = 2
        found = adapter.region_species(5)
        self.assertEqual([key for key, _, _ in found], [101, 102, 103])
        offsets = [call[2]["facetOffset"] for call in transport.calls]
        self.assertEqual(offsets, [0, 2],
                         "a full first page must be followed by a facetOffset page")

    def test_multi_country_counts_are_summed_across_surfaces(self):
        transport = FakeTransport(facet_pages={
            (("country", "KE"), 1470): [[{"name": "101", "count": 6}]],
            (("country", "TZ"), 1470): [[{"name": "101", "count": 7},
                                         {"name": "102", "count": 5}]],
        })
        found = self.adapter({"label": "EA", "countries": ["KE", "TZ"]},
                             transport).region_species(5)
        self.assertEqual([(key, count) for key, count, _ in found], [(101, 13), (102, 5)])
        receipts = dict((key, urls) for key, _, urls in found)
        self.assertEqual(len(receipts[101]), 2,
                         "a species seen on both surfaces keeps both receipts")

    def test_species_below_the_occurrence_floor_end_the_surface(self):
        transport = FakeTransport(facet_pages={(("country", "MG"), 1470): [[
            {"name": "101", "count": 9}, {"name": "102", "count": 3},
            {"name": "103", "count": 8},
        ]]})
        found = self.adapter({"label": "M", "countries": ["MG"]},
                             transport, min_occurrences=5).region_species(5)
        self.assertEqual([key for key, _, _ in found], [101],
                         "counts are descending, so the first sub-floor term ends the surface")

    def test_orders_are_interleaved_so_a_bounded_run_stays_broad(self):
        transport = FakeTransport(facet_pages={
            (("country", "MG"), 1470): [[{"name": "101", "count": 9},
                                         {"name": "103", "count": 7}]],
            (("country", "MG"), 797): [[{"name": "201", "count": 8}]],
        })
        found = self.adapter({"label": "M", "countries": ["MG"]}, transport,
                             orders={"Coleoptera": 1470, "Lepidoptera": 797}).region_species(4)
        self.assertEqual([key for key, _, _ in found], [101, 201, 103],
                         "a bounded run must not exhaust one order first")

    def test_receipts_record_the_facet_query_url(self):
        transport = FakeTransport(
            facet_pages={(("country", "MG"), 1470): [[{"name": "101", "count": 9}]]})
        found = self.adapter({"label": "M", "countries": ["MG"]}, transport).region_species(5)
        receipt = found[0][2][0]
        self.assertIn("api.gbif.org/v1/occurrence/search?", receipt)
        self.assertIn("country=MG", receipt)
        self.assertIn("taxonKey=1470", receipt)

    def test_invalid_arguments_are_rejected(self):
        transport = FakeTransport()
        region = {"label": "M", "countries": ["MG"]}
        with self.assertRaises(ValueError):
            self.adapter(region, transport).region_species(0)
        with self.assertRaises(ValueError):
            self.adapter({"label": "M"}, transport)
        with self.assertRaises(ValueError):
            GbifRegionSeedAdapter(transport, "testregion", region, orders={})
        with self.assertRaises(ValueError):
            self.adapter(region, transport, min_occurrences=0)


class MustHavePresenceTests(unittest.TestCase):
    """Named flagships keep the evidence rule but waive the frequency floor."""

    def adapter(self, region, transport):
        return GbifRegionSeedAdapter(transport, "testregion", region,
                                     orders={"Coleoptera": 1470})

    def test_counts_are_summed_across_surfaces_with_receipts(self):
        transport = FakeTransport(occurrence_counts={
            (("country", "KE"), 104): 2, (("country", "TZ"), 104): 3})
        count, receipts = self.adapter(
            {"label": "EA", "countries": ["KE", "TZ"]}, transport
        ).must_have_presence(104)
        self.assertEqual(count, 5)
        self.assertEqual(len(receipts), 2)
        self.assertIn("taxonKey=104", receipts[0])
        for call in transport.calls:
            self.assertNotIn("facet", call[2],
                             "a presence query must not pay for a facet walk")

    def test_zero_records_yield_zero_and_no_receipts(self):
        count, receipts = self.adapter(
            {"label": "M", "countries": ["MG"]}, FakeTransport()
        ).must_have_presence(104)
        self.assertEqual((count, receipts), (0, []))

    def test_surface_without_records_contributes_no_receipt(self):
        transport = FakeTransport(occurrence_counts={(("country", "TZ"), 104): 3})
        count, receipts = self.adapter(
            {"label": "EA", "countries": ["KE", "TZ"]}, transport
        ).must_have_presence(104)
        self.assertEqual(count, 3)
        self.assertEqual(len(receipts), 1)
        self.assertIn("country=TZ", receipts[0])


class NameEnrichmentTests(unittest.TestCase):
    """Names are enrichment, never a stocking condition (design 6.4 / 12.3)."""

    def setUp(self):
        self.transport = FakeTransport(
            taxa={101: taxon(101, "Chrysiridia rhipheus", order="Lepidoptera",
                             family="Uraniidae")},
            vernaculars={101: []})
        self.adapter = GbifRegionSeedAdapter(
            self.transport, "madagascar", {"label": "M", "countries": ["MG"]},
            orders={"Lepidoptera": 797})

    def seed(self):
        seed, reason = self.adapter.seed_for(101, 42, ["https://receipt"])
        self.assertIsNone(reason)
        return seed

    def test_japanese_vernacular_yields_standard(self):
        self.transport.vernaculars[101] = [
            {"language": "eng", "vernacularName": "Madagascan sunset moth"},
            {"language": "jpn", "vernacularName": "ニシキオオツバメガ"},
        ]
        seed = self.seed()
        self.assertEqual(seed["nameStatus"], "standard")
        self.assertEqual(seed["japaneseName"], "ニシキオオツバメガ")
        self.assertEqual(seed["englishName"], "Madagascan sunset moth",
                         "the English name is still recorded as enrichment data")
        self.assertIn("#vernacular-jpn", seed["nameSource"])

    def test_english_only_yields_english_common_candidate(self):
        self.transport.vernaculars[101] = [
            {"language": "eng", "vernacularName": "Madagascan sunset moth"}]
        seed = self.seed()
        self.assertEqual(seed["nameStatus"], "english_common_candidate")
        self.assertEqual(seed["englishName"], "Madagascan sunset moth")
        self.assertEqual(seed["japaneseName"], "")
        self.assertIn("#vernacular-eng", seed["nameSource"])

    def test_no_vernacular_yields_pending_and_the_species_is_still_stocked(self):
        seed = self.seed()
        self.assertEqual(seed["nameStatus"], "pending")
        self.assertEqual(seed["japaneseName"], "")
        self.assertEqual(seed["englishName"], "")
        self.assertEqual(seed["nameSource"], "")
        self.assertEqual(seed["scientificName"], "Chrysiridia rhipheus",
                         "a nameless species must be stocked, not dropped")

    def test_romaji_jpn_vernacular_does_not_count_as_standard(self):
        self.transport.vernaculars[101] = [
            {"language": "jpn", "vernacularName": "Nishiki-ootsubamega"},
            {"language": "eng", "vernacularName": "Madagascan sunset moth"},
        ]
        self.assertEqual(self.seed()["nameStatus"], "english_common_candidate")

    def test_two_letter_en_language_is_accepted_for_english(self):
        self.transport.vernaculars[101] = [
            {"language": "en", "vernacularName": "Madagascan sunset moth"}]
        self.assertEqual(self.seed()["nameStatus"], "english_common_candidate")

    def test_record_carries_region_membership_and_receipts(self):
        seed = self.seed()
        self.assertEqual(seed["seedId"], "gbif_101")
        self.assertEqual(seed["regionId"], "madagascar")
        self.assertEqual(seed["occurrenceCount"], 42)
        self.assertEqual(seed["facetReceipts"], ["https://receipt"])
        self.assertEqual(seed["synonyms"], [])
        self.assertEqual(seed["taxonRank"], "species")
        self.assertEqual(seed["order"], "Lepidoptera")
        self.assertEqual(seed["family"], "Uraniidae")
        self.assertEqual(seed["taxonomyResponse"]["key"], 101,
                         "taxonomyResponse keeps the species/{key} shape")
        self.assertTrue(seed["checkedAt"])
        self.assertIn("gbif.org/species/101", seed["sourceReceipt"])
        self.assertNotIn("mustHave", seed,
                         "ordinary seeds keep the exact historic record shape")

    def test_must_have_flag_marks_the_seed(self):
        seed, reason = self.adapter.seed_for(101, 42, ["https://receipt"],
                                             must_have=True)
        self.assertIsNone(reason)
        self.assertIs(seed["mustHave"], True)


class RejectTests(unittest.TestCase):
    """Only wrong rank and wrong class reject a species for good."""

    def adapter(self, taxa):
        self.transport = FakeTransport(taxa=taxa)
        return GbifRegionSeedAdapter(
            self.transport, "testregion", {"label": "T", "countries": ["MG"]},
            orders={"Coleoptera": 1470})

    def test_non_species_rank_is_rejected_with_a_reason(self):
        seed, reason = self.adapter(
            {101: taxon(101, "Genus", rank="GENUS")}).seed_for(101, 9, [])
        self.assertIsNone(seed)
        self.assertEqual(reason, "non_species_rank:GENUS")

    def test_non_insect_class_is_rejected_with_a_reason(self):
        seed, reason = self.adapter(
            {101: taxon(101, "Mus musculus", klass="Mammalia")}).seed_for(101, 9, [])
        self.assertIsNone(seed)
        self.assertEqual(reason, "non_insecta:Mammalia")

    def test_unreadable_taxonomy_raises_instead_of_rejecting(self):
        with self.assertRaises(ValueError):
            self.adapter({}).seed_for(101, 9, [])

    def test_taxon_without_name_or_order_raises_instead_of_rejecting(self):
        broken = taxon(101)
        del broken["scientificName"]
        with self.assertRaises(ValueError):
            self.adapter({101: broken}).seed_for(101, 9, [])

    def test_rejected_species_does_not_pay_for_a_vernacular_call(self):
        adapter = self.adapter({101: taxon(101, "Genus", rank="GENUS")})
        adapter.seed_for(101, 9, [])
        self.assertEqual([call[1] for call in self.transport.calls], ["/v1/species/101"])


class HarvestTests(unittest.TestCase):
    """The harvest loop is resumable and never re-asks about settled species."""

    def fresh_transport(self):
        return FakeTransport(
            facet_pages={(("country", "MG"), 1470): [[
                {"name": "101", "count": 9}, {"name": "102", "count": 8},
                {"name": "103", "count": 7},
            ]]},
            taxa={1470: order_taxon("Coleoptera"),
                  101: taxon(101, "Aaa bbb"),
                  102: taxon(102, "Genus", rank="GENUS"),
                  103: taxon(103, "Ccc ddd")},
            vernaculars={101: [{"language": "jpn", "vernacularName": "アアア"}],
                         103: []})

    def run_harvest(self, tmp, transport, target=3):
        regions_file = write_regions(tmp, {"testregion": {"label": "T", "countries": ["MG"]}})
        output = Path(tmp) / "testregion.jsonl"
        harvest_region_seeds.harvest(
            "testregion", regions_file, output, target,
            {"Coleoptera": 1470}, 5, 2.0, transport=transport)
        return output

    def read_seeds(self, output):
        return [json.loads(line) for line in
                output.read_text(encoding="utf-8").splitlines() if line.strip()]

    def test_harvest_writes_seeds_and_reject_reasons(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = self.run_harvest(tmp, self.fresh_transport())
            seeds = self.read_seeds(output)
            self.assertEqual([seed["seedId"] for seed in seeds], ["gbif_101", "gbif_103"])
            self.assertEqual([seed["nameStatus"] for seed in seeds], ["standard", "pending"])
            rejected = harvest_region_seeds.rejects_path(output).read_text(encoding="utf-8")
            self.assertEqual(rejected, "102\tnon_species_rank:GENUS\n")

    def test_resume_does_not_re_ask_gbif_about_settled_species(self):
        with tempfile.TemporaryDirectory() as tmp:
            # The first run settles all three keys: two seeds and one reject.
            self.run_harvest(tmp, self.fresh_transport(), target=3)
            transport = self.fresh_transport()
            output = self.run_harvest(tmp, transport, target=4)
            self.assertEqual([seed["seedId"] for seed in self.read_seeds(output)],
                             ["gbif_101", "gbif_103"])
            endpoints = {call[1] for call in transport.calls}
            self.assertIn("/v1/occurrence/search", endpoints,
                          "an unmet target still re-walks the facet ranking")
            re_asked = [call[1] for call in transport.calls
                        if call[1].startswith("/v1/species/10")]
            self.assertEqual(re_asked, [],
                             "cached seeds and rejects must not be re-fetched on resume")

    def test_partial_resume_pays_only_for_unsettled_species(self):
        with tempfile.TemporaryDirectory() as tmp:
            # target=1 settles only species 101; 102 and 103 stay open.
            self.run_harvest(tmp, self.fresh_transport(), target=1)
            transport = self.fresh_transport()
            output = self.run_harvest(tmp, transport, target=2)
            self.assertEqual([seed["seedId"] for seed in self.read_seeds(output)],
                             ["gbif_101", "gbif_103"])
            re_asked = [call[1] for call in transport.calls
                        if call[1].startswith("/v1/species/101")]
            self.assertEqual(re_asked, [],
                             "the already-cached species must be skipped")

    def test_met_target_short_circuits_without_any_network_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_harvest(tmp, self.fresh_transport(), target=2)
            transport = FakeTransport()
            self.run_harvest(tmp, transport, target=2)
            self.assertEqual(transport.calls, [])

    def test_wrong_order_key_refuses_to_harvest(self):
        transport = self.fresh_transport()
        transport.taxa[1470] = {"scientificName": "Pilosa", "rank": "ORDER",
                                "class": "Mammalia"}
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                self.run_harvest(tmp, transport)
            facet_calls = [call for call in transport.calls
                           if call[1] == "/v1/occurrence/search"]
            self.assertEqual(facet_calls, [],
                             "verification must fail closed before any harvesting")

    def test_unknown_region_is_rejected_before_any_call(self):
        transport = FakeTransport()
        with tempfile.TemporaryDirectory() as tmp:
            regions_file = write_regions(tmp, {"testregion": {"label": "T",
                                                              "countries": ["MG"]}})
            with self.assertRaises(ValueError):
                harvest_region_seeds.harvest(
                    "atlantis", regions_file, Path(tmp) / "x.jsonl", 3,
                    {"Coleoptera": 1470}, 5, 2.0, transport=transport)
            self.assertEqual(transport.calls, [])


class MustHaveHarvestTests(unittest.TestCase):
    """Named flagships are stocked first, floor-free, and retried while absent."""

    def transport_with_must(self, must_count=2, must_taxon=None):
        return FakeTransport(
            facet_pages={(("country", "MG"), 1470): [[{"name": "101", "count": 9}]]},
            taxa={1470: order_taxon("Coleoptera"),
                  101: taxon(101, "Aaa bbb"),
                  104: must_taxon or taxon(104, "Star star", order="Blattodea",
                                           family="Blaberidae")},
            vernaculars={101: [], 104: []},
            occurrence_counts={(("country", "MG"), 104): must_count})

    def regions_with_must(self, tmp):
        return write_regions(tmp, {"testregion": {
            "label": "T", "countries": ["MG"],
            "mustHave": [{"speciesKey": 104, "label": "看板"}]}})

    def run_harvest(self, tmp, transport, regions_file, target=2):
        output = Path(tmp) / "testregion.jsonl"
        harvest_region_seeds.harvest(
            "testregion", regions_file, output, target,
            {"Coleoptera": 1470}, 5, 2.0, transport=transport)
        return output

    def read_seeds(self, output):
        return [json.loads(line) for line in
                output.read_text(encoding="utf-8").splitlines() if line.strip()]

    def test_must_have_is_stocked_first_even_below_the_frequency_floor(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = self.run_harvest(tmp, self.transport_with_must(must_count=2),
                                      self.regions_with_must(tmp))
            seeds = self.read_seeds(output)
            self.assertEqual([seed["seedId"] for seed in seeds],
                             ["gbif_104", "gbif_101"],
                             "the flagship must land before any ranked seed")
            self.assertIs(seeds[0]["mustHave"], True)
            self.assertEqual(seeds[0]["occurrenceCount"], 2,
                             "2 records is below min_occurrences=5 and stocked anyway")
            self.assertNotIn("mustHave", seeds[1])

    def test_met_target_still_stocks_a_pending_must_have(self):
        with tempfile.TemporaryDirectory() as tmp:
            plain = write_regions(tmp, {"testregion": {"label": "T",
                                                       "countries": ["MG"]}})
            self.run_harvest(tmp, self.transport_with_must(), plain, target=1)
            transport = self.transport_with_must()
            output = self.run_harvest(tmp, transport,
                                      self.regions_with_must(tmp), target=1)
            self.assertEqual([seed["seedId"] for seed in self.read_seeds(output)],
                             ["gbif_101", "gbif_104"])
            for call in transport.calls:
                self.assertNotIn("facet", call[2],
                                 "a met target must not re-walk the facet ranking")

    def test_zero_count_must_have_is_skipped_without_a_reject_and_retried(self):
        with tempfile.TemporaryDirectory() as tmp:
            regions_file = self.regions_with_must(tmp)
            output = self.run_harvest(tmp, self.transport_with_must(must_count=0),
                                      regions_file, target=1)
            self.assertEqual([seed["seedId"] for seed in self.read_seeds(output)],
                             ["gbif_101"])
            self.assertFalse(harvest_region_seeds.rejects_path(output).exists(),
                             "absence of records today is not a permanent verdict")
            output = self.run_harvest(tmp, self.transport_with_must(must_count=2),
                                      regions_file, target=2)
            self.assertEqual([seed["seedId"] for seed in self.read_seeds(output)],
                             ["gbif_101", "gbif_104"])

    def test_must_have_with_a_wrong_rank_is_rejected_for_good(self):
        with tempfile.TemporaryDirectory() as tmp:
            regions_file = self.regions_with_must(tmp)
            transport = self.transport_with_must(
                must_taxon=taxon(104, "Genus", rank="GENUS"))
            output = self.run_harvest(tmp, transport, regions_file, target=1)
            self.assertEqual([seed["seedId"] for seed in self.read_seeds(output)],
                             ["gbif_101"])
            rejected = harvest_region_seeds.rejects_path(output).read_text(
                encoding="utf-8")
            self.assertIn("104\tnon_species_rank:GENUS", rejected)
            retry = self.transport_with_must()
            self.run_harvest(tmp, retry, regions_file, target=1)
            asked = [call for call in retry.calls if "taxonKey" in call[2]
                     and call[2]["taxonKey"] == 104]
            self.assertEqual(asked, [],
                             "a settled reject must not be re-asked on resume")


class TransportIntervalTests(unittest.TestCase):
    """The --interval flag reaches the transport without touching the class."""

    def test_interval_overrides_gbif_spacing_on_the_instance_only(self):
        transport = harvest_region_seeds.make_transport(4.5)
        self.assertEqual(transport.MIN_INTERVALS["gbif"], 4.5)
        self.assertEqual(HttpTransport.MIN_INTERVALS["gbif"], 2.0,
                         "the class default must stay untouched for other users")
        self.assertEqual(transport.MIN_INTERVALS["nhm"],
                         HttpTransport.MIN_INTERVALS["nhm"])

    def test_non_positive_interval_is_rejected(self):
        for interval in (0, -1, 0.0, "2", None, True):
            with self.assertRaises(ValueError):
                harvest_region_seeds.make_transport(interval)


if __name__ == "__main__":
    unittest.main()
