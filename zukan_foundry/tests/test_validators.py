import copy
import json
import unittest
from pathlib import Path

from zukan_foundry.validators import validate_record


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "zukan_foundry" / "tests" / "fixtures"
CONTRACT_FIXTURES = ROOT / "contracts" / "media_pipeline" / "fixtures"


class ValidatorTests(unittest.TestCase):
    def test_contract_valid_and_invalid_fixtures(self):
        cases = {
            "MediaGapRecord": ("media_gap_record.example.json", "invalid/media_gap_record.invalid_intent.json"),
            "ZukanFetchRequest": ("zukan_fetch_request.example.json", "invalid/zukan_fetch_request.invalid_emit_mode.json"),
            "MediaBuildCandidate": ("media_build_candidate.example.json", "invalid/media_build_candidate.invalid_license.json"),
        }
        for record_type, (valid_name, invalid_name) in cases.items():
            with self.subTest(record_type=record_type):
                valid = json.loads((CONTRACT_FIXTURES / valid_name).read_text(encoding="utf-8"))
                invalid = json.loads((CONTRACT_FIXTURES / invalid_name).read_text(encoding="utf-8"))
                self.assertEqual(validate_record(record_type, valid), [])
                self.assertTrue(validate_record(record_type, invalid))

    def test_internal_valid_and_invalid_fixtures(self):
        valid = json.loads((FIXTURES / "internal_records_valid.json").read_text(encoding="utf-8"))
        invalid = json.loads((FIXTURES / "internal_records_invalid.json").read_text(encoding="utf-8"))
        self.assertEqual(set(valid), set(invalid))
        for record_type in valid:
            with self.subTest(record_type=record_type):
                self.assertEqual(validate_record(record_type, valid[record_type]), [])
                self.assertTrue(validate_record(record_type, invalid[record_type]))

    def test_rejects_extra_internal_field(self):
        valid = json.loads((FIXTURES / "internal_records_valid.json").read_text(encoding="utf-8"))
        changed = copy.deepcopy(valid["DedupeResult"])
        changed["extra"] = True
        self.assertTrue(validate_record("DedupeResult", changed))


if __name__ == "__main__":
    unittest.main()
