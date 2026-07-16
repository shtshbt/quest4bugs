import hashlib
import json
import tempfile
import threading
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path

from tools.campaign3.t11_species_reserve.seed_fetch_adapter import (
    DEFAULT_TARGET_ORDERS,
    FixtureMediaTransport,
    FixtureSeedAdapter,
    GbifSeedAdapter,
)
from zukan_foundry.catalog import build_index, build_normalized_index
from zukan_foundry.discovery import GbifAdapter, NhmAdapter
from zukan_foundry.reserve import (
    DEFAULT_SPACING,
    ReserveConfig,
    ReserveDiscovery,
    ReserveEngine,
    VirtualClock,
    candidate_schema_errors,
    fail_closed_validate,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "zukan_foundry" / "tests" / "fixtures" / "t11_reserve_source.json"
FIXED_NOW = lambda: datetime(2026, 7, 16, 16, 0, tzinfo=timezone.utc)


def digest(path):
    if path.is_file():
        return hashlib.sha256(path.read_bytes()).hexdigest()
    return {
        str(item.relative_to(path)): hashlib.sha256(item.read_bytes()).hexdigest()
        for item in sorted(path.rglob("*")) if item.is_file()
    }


class ProbeTransport:
    def __init__(self, clock, fail_first=False):
        self.clock = clock
        self.fail_first = fail_first
        self.calls = []
        self.active = 0
        self.max_active = 0
        self.lock = threading.Lock()

    def get_json(self, source, endpoint, params, headers):
        with self.lock:
            self.calls.append((source, self.clock.now()))
            self.active += 1
            self.max_active = max(self.max_active, self.active)
            call_number = len(self.calls)
        time.sleep(0.002)
        with self.lock:
            self.active -= 1
        if self.fail_first and call_number == 1:
            raise RuntimeError("HTTP 429 fixture response")
        return {"results": []} if source == "gbif" else {"records": []}


class PagedSeedTransport:
    def __init__(self):
        self.params = []

    def get_json(self, source, endpoint, params, headers):
        self.params.append(dict(params))
        results = []
        for index in range(params["offset"], params["offset"] + params["limit"]):
            results.append({
                "key": 800000 + index, "scientificName": f"Pagedus item{index}",
                "canonicalName": f"Pagedus item{index}", "rank": "SPECIES",
                "matchType": "EXACT", "confidence": 100, "order": "Coleoptera",
                "family": "Fixtureidae", "synonyms": [],
            })
        return {"results": results}


def resolved_record(candidate_id):
    return {
        "candidateId": candidate_id, "acceptedScientificName": "Fixtureus bounded",
        "taxonRank": "species", "taxonKey": "1", "synonyms": [],
        "japaneseName": "フィクスチャ", "japaneseNameSource": "fixture://names#1",
        "order": "Testoptera", "family": "Fixtureidae",
        "taxonomySource": "fixture://taxonomy#1", "existingMatch": None,
        "subjectProposal": "", "mediaCandidates": [], "sizeEvidence": [],
        "status": "taxonomy_resolved", "reviewReasons": [],
        "checkedAt": "2026-07-16T16:00:00+00:00", "sourceReceipt": "fixture://seed#1",
    }


class ReserveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        catalog = build_index(ROOT)[0]
        cls.catalog_index = build_normalized_index(catalog["species"], catalog["generatedFromCommit"])

    def build_engine(self, directory, transport=None):
        output = Path(directory) / "reserve"
        transport = transport or FixtureMediaTransport(FIXTURE)
        clock = VirtualClock()
        discovery = ReserveDiscovery(
            transport, [GbifAdapter(), NhmAdapter()], output / "query_cache",
            concurrency=2, spacing=DEFAULT_SPACING, clock=clock.now, sleeper=clock.sleep,
            now=FIXED_NOW,
        )
        engine = ReserveEngine(
            FixtureSeedAdapter(FIXTURE), self.catalog_index, discovery, output,
            ReserveConfig(bank_count=2, bank_size=25, concurrency=2),
        )
        return engine, output, transport

    def test_offline_end_to_end_generates_two_banks_of_twenty_five(self):
        with tempfile.TemporaryDirectory() as directory:
            engine, output, _ = self.build_engine(directory)
            summary = engine.run()
            banks = sorted(output.glob("candidate_bank_*.json"))
            records = [record for path in banks for record in json.loads(path.read_text(encoding="utf-8"))]
            self.assertEqual(summary["records"], 50)
            self.assertEqual([len(json.loads(path.read_text(encoding="utf-8"))) for path in banks], [25, 25])
            self.assertEqual([record["candidateId"] for record in records], [f"taxon_{i:06d}" for i in range(1, 51)])
            self.assertTrue(all(candidate_schema_errors(record) == [] for record in records))
            self.assertNotIn("rarity", records[0])
            self.assertIn("media_found", {record["status"] for record in records})
            self.assertIn("no_hit", {record["status"] for record in records})
            media = next(record["mediaCandidates"] for record in records if record["mediaCandidates"])
            self.assertEqual(set(media[0]), {
                "occurrenceId", "institution", "previewUrl", "mediaUrl",
                "sourceUrl", "license", "queryReceipt",
            })

    def test_fail_closed_cases_remain_in_their_slots(self):
        with tempfile.TemporaryDirectory() as directory:
            engine, output, _ = self.build_engine(directory)
            engine.run()
            records = [
                record for path in sorted(output.glob("candidate_bank_*.json"))
                for record in json.loads(path.read_text(encoding="utf-8"))
            ]
            self.assertEqual(records[9]["status"], "rejected")
            self.assertEqual(records[10]["status"], "rejected")
            self.assertIn("provenance:missing:sourceReceipt", records[11]["reviewReasons"])
            self.assertIn("japanese_name:unverified", records[12]["reviewReasons"])
            self.assertEqual(records[13]["existingMatch"]["scope"], "reserve")
            self.assertIn("provenance:missing:taxonomySource", records[14]["reviewReasons"])
            self.assertEqual(records[15]["existingMatch"]["scope"], "catalog")

    def test_validator_repairs_schema_without_dropping_record(self):
        broken = resolved_record("taxon_000001")
        del broken["sourceReceipt"]
        broken["taxonRank"] = "genus"
        broken["unexpected"] = True
        repaired = fail_closed_validate(broken)
        self.assertEqual(repaired["candidateId"], "taxon_000001")
        self.assertEqual(repaired["status"], "rejected")
        self.assertIn("schema:missing:sourceReceipt", repaired["reviewReasons"])
        self.assertIn("schema:unexpected:unexpected", repaired["reviewReasons"])
        self.assertEqual(candidate_schema_errors(repaired), [])

    def test_second_run_reuses_persistent_hit_and_no_hit_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            first, output, first_transport = self.build_engine(directory)
            first_summary = first.run()
            self.assertGreater(first_summary["discovery"]["requested"], 0)
            self.assertGreater(len(first_transport.calls), 0)
            second_transport = FixtureMediaTransport(FIXTURE)
            second, _, _ = self.build_engine(directory, second_transport)
            second_summary = second.run()
            self.assertEqual(second_summary["discovery"]["requested"], 0)
            self.assertEqual(second_summary["discovery"]["cached"], second_summary["discovery"]["queries"])
            self.assertEqual(second_transport.calls, [])
            self.assertTrue((output / "query_cache").is_dir())

    def test_bounded_concurrency_and_provider_spacing(self):
        with tempfile.TemporaryDirectory() as directory:
            clock = VirtualClock()
            transport = ProbeTransport(clock)
            discovery = ReserveDiscovery(
                transport, [GbifAdapter(), NhmAdapter()], Path(directory) / "cache.json",
                concurrency=2, spacing=DEFAULT_SPACING, clock=clock.now, sleeper=clock.sleep,
                now=FIXED_NOW,
            )
            discovery.discover([resolved_record("taxon_000001"), resolved_record("taxon_000002")])
            self.assertLessEqual(transport.max_active, 2)
            for source, spacing in DEFAULT_SPACING.items():
                starts = [started for name, started in transport.calls if name == source]
                self.assertTrue(all(b - a >= spacing for a, b in zip(starts, starts[1:])))

    def test_429_extends_next_provider_spacing(self):
        with tempfile.TemporaryDirectory() as directory:
            clock = VirtualClock()
            transport = ProbeTransport(clock, fail_first=True)
            discovery = ReserveDiscovery(
                transport, [GbifAdapter()], Path(directory) / "cache.json",
                concurrency=1, spacing={"gbif": 2.0}, clock=clock.now, sleeper=clock.sleep,
                now=FIXED_NOW,
            )
            records = [resolved_record("taxon_000001")]
            discovery.discover(records)
            starts = [started for _, started in transport.calls]
            self.assertGreaterEqual(starts[1] - starts[0], 4.0)
            self.assertEqual(records[0]["status"], "needs_review")
            self.assertIn("discovery:api_error", records[0]["reviewReasons"])

    def test_engine_preserves_production_and_contract_files(self):
        protected = [
            ROOT / "shared" / "bugs.js", ROOT / "zukan_config" / "zukan_catalog.js",
            ROOT / "sw.js", ROOT / "contracts" / "media_pipeline",
        ]
        before = [digest(path) for path in protected]
        with tempfile.TemporaryDirectory() as directory:
            self.build_engine(directory)[0].run()
        self.assertEqual(before, [digest(path) for path in protected])

    def test_live_seed_adapter_is_paged_filtered_and_transport_injected(self):
        transport = PagedSeedTransport()
        adapter = GbifSeedAdapter(transport)
        adapter.page_size = 2
        seeds = adapter.fetch(5)
        self.assertEqual(len(seeds), 5)
        self.assertEqual([params["offset"] for params in transport.params], [0, 2, 4])
        self.assertTrue(all(params["rank"] == "SPECIES" for params in transport.params))
        self.assertTrue(all(params["order"] == ",".join(DEFAULT_TARGET_ORDERS) for params in transport.params))
        self.assertTrue(all(seed["sourceReceipt"].startswith("https://www.gbif.org/species/") for seed in seeds))


if __name__ == "__main__":
    unittest.main()
