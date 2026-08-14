"""地域 seed 重複判定ツールの canonical 化と fail-closed 動作。"""

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tools.komorebi import dedup_region_seeds


FIXTURES = ROOT / "zukan_foundry" / "tests" / "fixtures"
BUGS_FIXTURE = FIXTURES / "dedup_region_bugs.js"
SEEDS_FIXTURE = FIXTURES / "dedup_region_seeds.jsonl"


class CanonicalizationTests(unittest.TestCase):
    def test_authorship_year_and_subgenus_are_removed(self):
        self.assertEqual(
            dedup_region_seeds.canonicalize_scientific_name(
                "Nanos viettei (Paulian, 1976)"),
            "nanos viettei",
        )
        self.assertEqual(
            dedup_region_seeds.canonicalize_scientific_name(
                "Papilio (Achillides)   maackii"),
            "papilio maackii",
        )

    def test_subspecies_has_full_and_two_word_forms(self):
        self.assertEqual(
            dedup_region_seeds.canonical_forms("Papilio machaon hippocrates"),
            ("papilio machaon hippocrates", "papilio machaon"),
        )


class DeduplicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bugs = dedup_region_seeds.parse_bugs(BUGS_FIXTURE, minimum_count=1)
        cls.result = dedup_region_seeds.analyze_seed_file(SEEDS_FIXTURE, cls.bugs)

    def test_subspecies_two_word_form_is_matched(self):
        rejected = {item["seedId"]: item for item in self.result["rejectedSeeds"]}
        self.assertEqual(rejected["subspecies"]["reason"], "canonical")
        self.assertEqual(
            rejected["subspecies"]["matches"][0]["scientificName"],
            "Papilio machaon",
        )

    def test_synonym_match_is_rejected_with_synonym_reason(self):
        rejected = {item["seedId"]: item for item in self.result["rejectedSeeds"]}
        self.assertEqual(rejected["synonym"]["reason"], "synonym")
        self.assertEqual(rejected["synonym"]["matches"][0]["id"], "synonym_match")

    def test_empty_japanese_name_does_not_create_false_match(self):
        rejected_ids = {item["seedId"] for item in self.result["rejectedSeeds"]}
        review_ids = {item["seedId"] for item in self.result["reviewSeeds"]}
        self.assertNotIn("empty_name", rejected_ids | review_ids)
        self.assertEqual(self.result["available"], 1)

    def test_gender_ending_variant_needs_review_without_rejection(self):
        rejected_ids = {item["seedId"] for item in self.result["rejectedSeeds"]}
        reviews = {item["seedId"]: item for item in self.result["reviewSeeds"]}
        self.assertNotIn("gender", rejected_ids)
        self.assertEqual(reviews["gender"]["matches"][0]["id"], "gender_match")
        self.assertEqual(self.result["needsReview"], 1)

    def test_zero_parsed_bugs_returns_exit_code_one(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            empty_bugs = directory / "empty_bugs.js"
            out_path = directory / "report.md"
            empty_bugs.write_text("var bugs = [];\n", encoding="utf-8")
            exit_code = dedup_region_seeds.main([
                "--seeds", str(SEEDS_FIXTURE),
                "--bugs", str(empty_bugs),
                "--out", str(out_path),
            ])
            self.assertEqual(exit_code, 1)
            self.assertFalse(out_path.exists())

    def test_input_jsonl_is_unchanged_after_cli_run(self):
        before = SEEDS_FIXTURE.read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            out_path = Path(directory) / "report.md"
            with mock.patch.object(dedup_region_seeds, "MINIMUM_BUG_COUNT", 1):
                exit_code = dedup_region_seeds.main([
                    "--seeds", str(SEEDS_FIXTURE),
                    "--bugs", str(BUGS_FIXTURE),
                    "--out", str(out_path),
                ])
            self.assertEqual(exit_code, 0)
            self.assertTrue(out_path.is_file())
        self.assertEqual(SEEDS_FIXTURE.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
