import copy
import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from zukan_foundry.catalog import build_index, parse_bugs
from zukan_foundry.dedupe import detect_duplicate
from zukan_foundry.evidence import assess_measurements, audit_species
from zukan_foundry.negative_cache import create_cache_entry, load_cache, save_cache, should_research
from zukan_foundry.provenance import normalize_media_candidate
from zukan_foundry.ranking import rank_media_candidate
from zukan_foundry.staging_consumer import consume_request
from zukan_foundry.taxonomy import generate_search_queries, resolve_taxon, species_candidate_from_gap


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "zukan_foundry" / "fixtures"
CONTRACT_FIXTURES = ROOT / "contracts" / "media_pipeline" / "fixtures"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree_digest(path):
    return {
        str(item.relative_to(path)): digest(item)
        for item in path.rglob("*") if item.is_file()
    }


class CatalogTests(unittest.TestCase):
    def test_extracts_every_current_record(self):
        parsed = parse_bugs(ROOT / "shared" / "bugs.js")
        index, names, anomalies = build_index(ROOT)
        self.assertEqual(len(parsed), 1213)
        self.assertEqual(index["recordCount"], len(parsed))
        self.assertEqual(len(index["species"]), len(parsed))
        self.assertEqual(len(names["byId"]), len(parsed))
        self.assertEqual(sum(item["media"] is not None for item in index["species"]), 893)
        self.assertEqual(names["byScientificName"]["Sasakia charonda"], ["oomurasaki", "sasakia_oomurasaki_ss"])
        self.assertIn("non-species registrations", anomalies)


class TaxonomyTests(unittest.TestCase):
    def setUp(self):
        self.gap = load(CONTRACT_FIXTURES / "media_gap_record.example.json")
        self.candidate = species_candidate_from_gap(self.gap)
        self.backbones = load(FIXTURES / "taxonomy_backbones.json")
        self.existing = [{
            "id": "aburazemi", "jaName": "アブラゼミ",
            "scientificName": "Graptopsaltria nigrofuscata",
            "canonicalName": "Graptopsaltria nigrofuscata", "synonyms": [],
            "lifeStageNames": [],
        }]

    def test_resolves_and_orders_queries(self):
        resolution = resolve_taxon(self.candidate, self.backbones, self.existing)
        self.assertEqual(resolution["status"], "resolved")
        queries = generate_search_queries(self.candidate, resolution)
        self.assertEqual([item["priority"] for item in queries], sorted(item["priority"] for item in queries))
        self.assertEqual(queries[0]["type"], "species_exact")
        self.assertEqual(queries[-1]["type"], "genus_locality")

    def test_keeps_conflicting_backbone_answers(self):
        candidate = dict(self.candidate, scientificName="Conflictus oldname", jaName="コンフリクトムシ")
        resolution = resolve_taxon(candidate, self.backbones, [])
        self.assertEqual(resolution["status"], "taxonomy_conflict")
        self.assertEqual({item["acceptedName"] for item in resolution["sources"]}, {"Conflictus alpha", "Conflictus beta"})

    def test_rejects_invalid_contract_input(self):
        with self.assertRaises(ValueError):
            species_candidate_from_gap({})


class DedupeTests(unittest.TestCase):
    def test_all_hard_conditions(self):
        candidate = {"candidateId": "c", "speciesId": "same", "jaName": "幼虫名", "scientificName": "New genus", "acceptedName": None}
        resolution = {"acceptedName": "Accepted species", "status": "resolved", "sources": [{"synonyms": ["Accepted species"]}]}
        existing = [{
            "id": "same", "jaName": "幼虫名", "canonicalName": "Accepted species",
            "scientificName": "Accepted species", "synonyms": ["Accepted species"],
            "lifeStageNames": ["幼虫名"],
        }]
        result = detect_duplicate(candidate, resolution, existing)
        self.assertEqual(result["status"], "duplicate")
        self.assertGreaterEqual(len(result["hardReasons"]), 6)

    def test_species_subspecies_collision_needs_review(self):
        candidate = {"candidateId": "c", "speciesId": "new", "jaName": "別名", "scientificName": "Dorcus hopei binodulosus"}
        resolution = {"acceptedName": "Dorcus hopei binodulosus", "status": "resolved", "sources": []}
        existing = [{"id": "old", "jaName": "オオクワガタ", "canonicalName": "Dorcus hopei", "synonyms": [], "lifeStageNames": []}]
        self.assertEqual(detect_duplicate(candidate, resolution, existing)["status"], "needs_review")

    def test_fuzzy_similarity_never_auto_rejects(self):
        candidate = {"candidateId": "c", "speciesId": "new", "jaName": "アブラゼミー", "scientificName": "Different species"}
        resolution = {"acceptedName": "Different species", "status": "resolved", "sources": []}
        existing = [{"id": "old", "jaName": "アブラゼミ", "canonicalName": "Other species", "synonyms": [], "lifeStageNames": []}]
        result = detect_duplicate(candidate, resolution, existing)
        self.assertEqual(result["status"], "needs_review")
        self.assertFalse(result["hardReasons"])


class ProvenanceRankingTests(unittest.TestCase):
    def setUp(self):
        self.raw = load(FIXTURES / "raw_media_candidate.json")
        self.candidate = normalize_media_candidate(self.raw)

    def test_normalizes_required_provenance_and_separate_evidence(self):
        self.assertEqual(self.candidate["recordId"], "fixture-001")
        self.assertNotEqual(self.candidate["evidenceRefs"]["image"], self.candidate["evidenceRefs"]["distribution"])
        broken = dict(self.raw)
        del broken["license"]
        with self.assertRaises(ValueError):
            normalize_media_candidate(broken)

    def test_score_components_and_bands(self):
        excellent = rank_media_candidate(self.candidate)
        self.assertEqual(excellent["components"], {"taxonomy": 40, "rights": 18, "quality": 15, "suitability": 10, "sourceTrust": 10})
        self.assertEqual(excellent["band"], "excellent")
        cases = [
            (dict(self.candidate, matchType="canonical_name", sourceTrust=5), "good"),
            (dict(self.candidate, matchType="canonical_name", width=1000, height=1000, sourceTrust=2), "review"),
            (dict(self.candidate, matchType="unknown", width=500, height=500, sourceTrust=0), "weak"),
        ]
        for candidate, band in cases:
            with self.subTest(band=band):
                self.assertEqual(rank_media_candidate(candidate)["band"], band)

    def test_every_hard_exclusion(self):
        mutations = [
            {"matchedRank": "genus"}, {"mediaUrl": None}, {"license": "unknown"},
            {"flags": {"taxonMismatch": True}}, {"lifeStage": "larva"},
            {"width": 200}, {"flags": {"aiGenerated": True}},
            {"flags": {"watermarkOverlapsSubject": True}},
            {"flags": {"identificationDoubt": True}},
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                candidate = copy.deepcopy(self.candidate)
                candidate.update(mutation)
                self.assertEqual(rank_media_candidate(candidate)["status"], "excluded")


class CacheEvidenceTests(unittest.TestCase):
    def test_ttls_and_refresh_conditions(self):
        now = datetime(2026, 7, 16, tzinfo=timezone.utc)
        for outcome, days in (("zero_results", 180), ("results_not_selected", 365), ("api_error", 7), ("license_unknown", 90)):
            entry = create_cache_entry("s", "c", "query", "1", now, outcome, 0)
            self.assertEqual(datetime.fromisoformat(entry["expiresAt"]), now + timedelta(days=days))
        hold = create_cache_entry("s", "c", "query", "1", now, "taxonomy_conflict", 0)
        self.assertIsNone(hold["expiresAt"])
        stable = create_cache_entry("s", "c", "query", "1", now, "zero_results", 0)
        self.assertFalse(should_research(stable, now, "1"))
        checks = (
            {"now": now + timedelta(days=181), "adapter_version": "1"},
            {"now": now, "adapter_version": "2"},
            {"now": now, "adapter_version": "1", "synonym_added": True},
            {"now": now, "adapter_version": "1", "source_updated": True},
            {"now": now, "adapter_version": "1", "manual": True},
        )
        for kwargs in checks:
            self.assertTrue(should_research(stable, **kwargs))
        error = create_cache_entry("s", "c", "query", "1", now, "api_error", 0)
        self.assertTrue(should_research(error, now, "1"))
        self.assertTrue(should_research(hold, now, "1", resolver_updated=True))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cache.json"
            save_cache(path, [stable])
            self.assertEqual(load_cache(path), [stable])

    def test_measurement_conflict_and_audit_reverse_lookup(self):
        evidence = load(FIXTURES / "measurement_conflict.json")
        result = assess_measurements("Hemiptera", evidence, "size-a", "prefer taxonomic monograph")
        self.assertEqual(result["sizeStatus"], "conflict")
        with self.assertRaises(ValueError):
            assess_measurements("Hemiptera", evidence)
        mixed = copy.deepcopy(evidence)
        mixed[1]["measurementType"] = "wingspan"
        with self.assertRaises(ValueError):
            assess_measurements("Hemiptera", mixed, "size-a", "reason")
        trail = audit_species(
            "aburazemi",
            [{"id": "aburazemi"}],
            [{"speciesId": "aburazemi", "status": "resolved"}],
            [{"speciesId": "aburazemi", "recordId": "fixture-001", "license": "CC-BY-4.0", "attribution": "Fixture Museum"}],
            evidence,
            [{"speciesId": "aburazemi", "decision": "needs_review"}],
        )
        self.assertEqual(trail["taxonomyResolution"]["status"], "resolved")
        self.assertEqual(trail["licenseAttribution"][0]["license"], "CC-BY-4.0")
        self.assertEqual(trail["reviewDecision"]["decision"], "needs_review")


class StagingConsumerTests(unittest.TestCase):
    def test_emits_only_under_foundry_staging_without_production_changes(self):
        request = load(FIXTURES / "zukan_fetch_request.json")
        candidate = load(FIXTURES / "media_build_candidate.json")
        protected = [ROOT / "zukan_config" / "zukan_catalog.js"] + [
            ROOT / "zukan_cards" / name for name in ("original", "processed", "thumb", "metadata")
        ]
        before = [digest(path) if path.is_file() else tree_digest(path) for path in protected]
        with tempfile.TemporaryDirectory(dir=ROOT / "zukan_foundry") as directory:
            staging = Path(directory) / "staging"
            output = consume_request(request, candidate, staging)
            expected = staging / "aburazemi" / "default" / f"{request['gapId']}_attempt1.json"
            self.assertEqual(output, expected)
            self.assertEqual(tree_digest(staging), {str(expected.relative_to(staging)): digest(expected)})
        after = [digest(path) if path.is_file() else tree_digest(path) for path in protected]
        self.assertEqual(before, after)

    def test_rejects_invalid_request_before_writing(self):
        request = load(FIXTURES / "zukan_fetch_request.json")
        candidate = load(FIXTURES / "media_build_candidate.json")
        request["emitMode"] = "catalog_merge"
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                consume_request(request, candidate, directory)
            self.assertEqual(list(Path(directory).rglob("*")), [])


if __name__ == "__main__":
    unittest.main()
