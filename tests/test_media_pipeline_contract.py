import copy
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from contracts.media_pipeline.staging import emit_staging_only
from contracts.media_pipeline.validator import (
    compute_gap_id,
    validate_chain,
    validate_media_build_candidate,
    validate_media_gap_record,
    validate_zukan_fetch_request,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "contracts" / "media_pipeline" / "fixtures"


def load_fixture(path):
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files_under(path):
    return {
        str(Path(directory, name).relative_to(path))
        for directory, _, names in os.walk(path)
        for name in names
    }


class MediaPipelineContractTests(unittest.TestCase):
    def setUp(self):
        self.gap = load_fixture(FIXTURES / "media_gap_record.example.json")
        self.request = load_fixture(FIXTURES / "zukan_fetch_request.example.json")
        self.candidate = load_fixture(FIXTURES / "media_build_candidate.example.json")

    def test_valid_fixtures(self):
        self.assertEqual(validate_media_gap_record(self.gap), [])
        self.assertEqual(validate_zukan_fetch_request(self.request), [])
        self.assertEqual(validate_media_build_candidate(self.candidate), [])

    def test_invalid_fixtures(self):
        invalid = FIXTURES / "invalid"
        invalid_gap = load_fixture(invalid / "media_gap_record.invalid_intent.json")
        invalid_request = load_fixture(invalid / "zukan_fetch_request.invalid_emit_mode.json")
        invalid_candidate = load_fixture(invalid / "media_build_candidate.invalid_license.json")
        self.assertTrue(validate_media_gap_record(invalid_gap))
        self.assertTrue(validate_zukan_fetch_request(invalid_request))
        self.assertTrue(validate_media_build_candidate(invalid_candidate))
        self.assertTrue(validate_chain(self.gap, self.request, invalid_candidate))

    def test_compute_gap_id(self):
        actual = compute_gap_id(
            self.gap["speciesId"],
            self.gap["variant"],
            self.gap["currentCatalogCommit"],
            self.gap["currentMediaHash"],
            self.gap["reasonCodes"],
        )
        self.assertEqual(actual, self.gap["gapId"])
        first = compute_gap_id("species", "default", "abcdef0", None, ["z", "a"])
        second = compute_gap_id("species", "default", "abcdef0", None, ["a", "z"])
        self.assertEqual(first, second)

    def test_validate_chain(self):
        self.assertEqual(validate_chain(self.gap, self.request, self.candidate), [])
        changed_request = copy.deepcopy(self.request)
        changed_request["gapId"] = "0" * 64
        self.assertTrue(validate_chain(self.gap, changed_request, self.candidate))

    def test_emit_staging_only(self):
        catalog = ROOT / "zukan_config" / "zukan_catalog.js"
        cards = ROOT / "zukan_cards"
        catalog_before = file_hash(catalog)
        cards_before = files_under(cards)
        with tempfile.TemporaryDirectory() as directory:
            staging_root = Path(directory)
            emitted = emit_staging_only(self.candidate, self.request, staging_root)
            expected = (
                staging_root
                / "aburazemi"
                / "default"
                / f"{self.gap['gapId']}_attempt1.json"
            )
            self.assertEqual(emitted, expected)
            self.assertEqual(files_under(staging_root), {str(expected.relative_to(staging_root))})
            self.assertEqual(load_fixture(emitted), self.candidate)
        self.assertEqual(file_hash(catalog), catalog_before)
        self.assertEqual(files_under(cards), cards_before)

    def test_emit_rejects_non_staging_mode(self):
        request = copy.deepcopy(self.request)
        request["emitMode"] = "catalog_merge"
        with tempfile.TemporaryDirectory() as directory:
            staging_root = Path(directory)
            with self.assertRaises(ValueError):
                emit_staging_only(self.candidate, request, staging_root)
            self.assertEqual(files_under(staging_root), set())


if __name__ == "__main__":
    unittest.main()
