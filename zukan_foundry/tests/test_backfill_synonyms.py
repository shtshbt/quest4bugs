"""Synonym backfill: paged fetch, resumable atomic rewrite, no re-asks."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.campaign3.t11_species_reserve.backfill_synonyms import backfill
from tools.campaign3.t11_species_reserve.gbif_japan_seed import fetch_synonyms


class PagedSynonymTransport:
    """Serve canned synonym pages and record every call."""

    def __init__(self, pages_by_key, failures=()):
        self.pages_by_key = pages_by_key
        self.failures = set(failures)
        self.calls = []

    def get_json(self, source, endpoint, params, headers):
        key = int(endpoint.split("/")[3])
        self.calls.append((key, params.get("offset", 0)))
        if key in self.failures:
            raise RuntimeError("gbif request failed: 503")
        pages = self.pages_by_key.get(key, [[]])
        index = params["offset"] // params["limit"]
        page = pages[index] if index < len(pages) else []
        return {"results": page, "endOfRecords": index >= len(pages) - 1}


class RefusingTransport:
    """Fail the test if any request is made at all."""

    def get_json(self, source, endpoint, params, headers):
        raise AssertionError("a fetched record must never be re-asked")


class FetchSynonymsTests(unittest.TestCase):
    def test_pages_are_walked_and_names_deduplicated(self):
        transport = PagedSynonymTransport({7: [
            [{"canonicalName": "Aus aus"}, {"scientificName": "Bus bus (X, 1900)"}],
            [{"canonicalName": "Aus aus"}, {"canonicalName": "Cus cus"}],
        ]})
        names = fetch_synonyms(transport, 7, page_size=2)
        self.assertEqual(names, ["Aus aus", "Bus bus (X, 1900)", "Cus cus"])
        self.assertEqual(transport.calls, [(7, 0), (7, 2)])

    def test_canonical_name_is_preferred_over_scientific_name(self):
        transport = PagedSynonymTransport({7: [
            [{"canonicalName": "Aus aus", "scientificName": "Aus aus (X, 1900)"}],
        ]})
        self.assertEqual(fetch_synonyms(transport, 7), ["Aus aus"])

    def test_no_synonyms_is_an_empty_list(self):
        self.assertEqual(fetch_synonyms(PagedSynonymTransport({}), 7), [])

    def test_malformed_response_raises(self):
        class Broken:
            def get_json(self, source, endpoint, params, headers):
                return {"unexpected": True}

        with self.assertRaises(ValueError):
            fetch_synonyms(Broken(), 7)

    def test_invalid_species_key_raises(self):
        for key in (0, -1, "7", None):
            with self.assertRaises(ValueError):
                fetch_synonyms(PagedSynonymTransport({}), key)


def seed_line(seed_id, **overrides):
    record = {"seedId": seed_id, "scientificName": "Aus aus", "synonyms": []}
    record.update(overrides)
    return record


def write_seeds(path, records):
    path.write_text(
        "".join(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n"
                for record in records),
        encoding="utf-8")


def read_seeds(path):
    return [json.loads(line) for line in
            path.read_text(encoding="utf-8").splitlines() if line.strip()]


class BackfillTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "seeds.jsonl"

    def test_backfill_fills_marks_and_leaves_no_temporary_file(self):
        write_seeds(self.path, [seed_line("gbif_7"), seed_line("gbif_8")])
        transport = PagedSynonymTransport({7: [[{"canonicalName": "Olds seven"}]]})
        summary = backfill(self.path, transport=transport, now=lambda: "T0")
        self.assertEqual(summary, {"records": 2, "fetched": 2, "alreadyFetched": 0,
                                   "noSpeciesKey": 0, "failed": 0})
        first, second = read_seeds(self.path)
        self.assertEqual(first["synonyms"], ["Olds seven"])
        self.assertEqual(first["synonymsFetchedAt"], "T0")
        self.assertEqual(first["synonymsSource"],
                         "https://www.gbif.org/species/7#synonyms")
        self.assertEqual(second["synonyms"], [],
                         "a zero-synonym answer is still an answer")
        self.assertEqual(second["synonymsFetchedAt"], "T0")
        self.assertEqual(list(self.path.parent.glob("*.tmp")), [])

    def test_resumed_run_never_reasks_a_fetched_record(self):
        write_seeds(self.path, [seed_line("gbif_7"), seed_line("gbif_8")])
        backfill(self.path, transport=PagedSynonymTransport({}), now=lambda: "T0")
        summary = backfill(self.path, transport=RefusingTransport())
        self.assertEqual(summary["fetched"], 0)
        self.assertEqual(summary["alreadyFetched"], 2)

    def test_limit_bounds_the_run_and_keeps_the_rest_unmarked(self):
        write_seeds(self.path, [seed_line("gbif_7"), seed_line("gbif_8")])
        summary = backfill(self.path, transport=PagedSynonymTransport({}),
                           limit=1, now=lambda: "T0")
        self.assertEqual(summary["fetched"], 1)
        first, second = read_seeds(self.path)
        self.assertIn("synonymsFetchedAt", first)
        self.assertNotIn("synonymsFetchedAt", second)

    def test_transient_failure_stays_unmarked_and_is_retried_on_resume(self):
        write_seeds(self.path, [seed_line("gbif_7"), seed_line("gbif_8")])
        failing = PagedSynonymTransport({}, failures={7})
        summary = backfill(self.path, transport=failing, now=lambda: "T0")
        self.assertEqual(summary["failed"], 1)
        self.assertEqual(summary["fetched"], 1)
        first, _ = read_seeds(self.path)
        self.assertNotIn("synonymsFetchedAt", first)
        retry = backfill(self.path, transport=PagedSynonymTransport({}),
                         now=lambda: "T1")
        self.assertEqual(retry["fetched"], 1)
        self.assertEqual(retry["alreadyFetched"], 1)
        self.assertEqual(read_seeds(self.path)[0]["synonymsFetchedAt"], "T1")

    def test_seed_without_gbif_key_is_left_alone(self):
        write_seeds(self.path, [seed_line("fixture_seed_0001")])
        summary = backfill(self.path, transport=RefusingTransport())
        self.assertEqual(summary["noSpeciesKey"], 1)
        self.assertNotIn("synonymsFetchedAt", read_seeds(self.path)[0])

    def test_malformed_line_fails_the_whole_run(self):
        self.path.write_text('{"seedId": "gbif_7"}\nnot json\n', encoding="utf-8")
        with self.assertRaises(ValueError):
            backfill(self.path, transport=PagedSynonymTransport({}))

    def test_invalid_limit_is_rejected(self):
        write_seeds(self.path, [seed_line("gbif_7")])
        for limit in (0, -1):
            with self.assertRaises(ValueError):
                backfill(self.path, transport=RefusingTransport(), limit=limit)


if __name__ == "__main__":
    unittest.main()
