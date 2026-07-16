import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from contracts.media_pipeline.staging import emit_staging_only
from zukan_foundry.staging_consumer import compose_build_candidate, compose_fetch_request
from zukan_foundry.validators import validate_record


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "zukan_foundry" / "tests" / "fixtures"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class StagingTests(unittest.TestCase):
    def test_staging_simulation_preserves_production_files(self):
        protected = [ROOT / "shared" / "bugs.js", ROOT / "zukan_config" / "zukan_catalog.js"]
        before = {path: digest(path) for path in protected}
        gaps = json.loads((FIXTURES / "fixture_candidates.json").read_text(encoding="utf-8"))
        valid = json.loads((FIXTURES / "internal_records_valid.json").read_text(encoding="utf-8"))
        request = compose_fetch_request(gaps[0], valid["TaxonResolution"], "Fixtureidae")
        raw_image_hash = hashlib.sha256(b"offline fixture image").hexdigest()
        candidate = compose_build_candidate(request, valid["MediaCandidate"], raw_image_hash)
        self.assertEqual(candidate["status"], "discovered")
        self.assertNotEqual(candidate["status"], "built")
        self.assertEqual(candidate["rawImageHash"], raw_image_hash)
        self.assertEqual(validate_record("ZukanFetchRequest", request), [])
        self.assertEqual(validate_record("MediaBuildCandidate", candidate), [])
        with tempfile.TemporaryDirectory() as directory:
            emitted = emit_staging_only(candidate, request, Path(directory))
            self.assertTrue(emitted.is_file())
        self.assertEqual(before, {path: digest(path) for path in protected})


if __name__ == "__main__":
    unittest.main()
