import json
import unittest
from datetime import datetime, timezone
from pathlib import Path

from zukan_foundry.discovery import DiscoveryService, GbifAdapter, HttpTransport, NhmAdapter, negative_cache_entry
from zukan_foundry.run_offline import FixtureTransport


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "zukan_foundry" / "tests" / "fixtures"


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        gbif = json.loads((FIXTURES / "gbif_search.json").read_text(encoding="utf-8"))
        nhm = json.loads((FIXTURES / "nhm_search.json").read_text(encoding="utf-8"))
        self.transport = FixtureTransport(gbif, nhm)
        self.service = DiscoveryService(self.transport, lambda: datetime(2026, 7, 16, tzinfo=timezone.utc))

    def test_fixture_hits_are_normalized(self):
        run, media, cache = self.service.search("fixture_beetle", GbifAdapter(), "Testus fixturea")
        self.assertEqual(run["resultCount"], 1)
        self.assertEqual(media[0]["recordId"], "gbif-1")
        self.assertEqual(media[0]["originalMetadata"]["institutionCode"], "TEST")
        self.assertIsNone(cache)

    def test_idempotent_retry_does_not_call_transport(self):
        first = self.service.search("fixture_beetle", NhmAdapter(), "Testus fixturea")
        calls = len(self.transport.calls)
        second = self.service.search("fixture_beetle", NhmAdapter(), "Testus fixturea")
        self.assertEqual(first[1:], second[1:])
        self.assertTrue(second[0]["cached"])
        self.assertEqual(len(self.transport.calls), calls)

    def test_zero_result_writes_180_day_cache(self):
        _, media, cache = self.service.search("fixture_moth", NhmAdapter(), "Imaginaris nullus")
        self.assertEqual(media, [])
        self.assertEqual(cache["outcome"], "zero_results")
        self.assertEqual(cache["expiresAt"], "2027-01-12T00:00:00+00:00")

    def test_all_negative_cache_ttls(self):
        now = datetime(2026, 7, 16, tzinfo=timezone.utc)
        expected = {"zero_results": 180, "results_not_selected": 365, "api_error": 7, "license_unknown": 90}
        for outcome, days in expected.items():
            entry = negative_cache_entry("gbif", "fixture_beetle", outcome, outcome, now)
            expiry = datetime.fromisoformat(entry["expiresAt"])
            self.assertEqual((expiry - now).days, days)
        self.assertIsNone(negative_cache_entry("gbif", "fixture_beetle", "conflict", "taxonomy_conflict", now)["expiresAt"])

    def test_rate_boundaries_are_configured(self):
        self.assertGreaterEqual(HttpTransport.MIN_INTERVALS["gbif"], 2.0)
        self.assertGreater(HttpTransport.MIN_INTERVALS["nhm"], 0.2)

    def test_api_error_is_cached(self):
        class FailingTransport:
            def get_json(self, source, endpoint, params, headers):
                raise RuntimeError("fixture failure")

        service = DiscoveryService(FailingTransport(), lambda: datetime(2026, 7, 16, tzinfo=timezone.utc))
        run, media, cache = service.search("fixture_beetle", GbifAdapter(), "failure")
        self.assertEqual(run["status"], "api_error")
        self.assertEqual(media, [])
        self.assertEqual(cache["outcome"], "api_error")

    def test_unknown_license_is_cached(self):
        raw = json.loads((FIXTURES / "gbif_search.json").read_text(encoding="utf-8"))
        raw["Testus fixturea"]["results"][0]["license"] = "unknown"
        service = DiscoveryService(FixtureTransport(raw, {}), lambda: datetime(2026, 7, 16, tzinfo=timezone.utc))
        _, media, cache = service.search("fixture_beetle", GbifAdapter(), "Testus fixturea")
        self.assertEqual(len(media), 1)
        self.assertEqual(cache["outcome"], "license_unknown")


if __name__ == "__main__":
    unittest.main()
