import json
import tempfile
import unittest
from pathlib import Path

from zukan_foundry.candidates import load_candidate_source, select_candidates


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "zukan_foundry" / "tests" / "fixtures" / "fixture_candidates.json"


def candidate(index, intent):
    return {"speciesId": f"species_{index:02d}", "variant": "default", "gapId": f"{index:064x}", "intent": intent}


class CandidateTests(unittest.TestCase):
    def test_fixture_fallback_path(self):
        entries, source = load_candidate_source(ROOT, FIXTURE)
        selected, summary = select_candidates(entries)
        self.assertEqual(source, "fixture")
        self.assertEqual(len(selected), 3)
        self.assertEqual(summary["selectedCount"], 3)

    def test_t04_audit_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture = root / "fixture.json"
            fixture.write_text("[]", encoding="utf-8")
            audit = root / "missing_or_replacement_species.json"
            audit.write_text(json.dumps({"entries": [candidate(1, "missing")]}), encoding="utf-8")
            entries, source = load_candidate_source(root, fixture)
            self.assertEqual(source, "t04_audit")
            self.assertEqual(entries[0]["speciesId"], "species_01")

    def test_over_twenty_is_stably_bounded(self):
        entries = [candidate(index, "replacement" if index % 2 else "missing") for index in reversed(range(30))]
        first, summary = select_candidates(entries)
        second, _ = select_candidates(list(reversed(entries)))
        self.assertEqual(first, second)
        self.assertEqual(len(first), 20)
        self.assertTrue(all(item["intent"] == "missing" for item in first[:15]))
        self.assertEqual(summary["excludedCount"], 10)


if __name__ == "__main__":
    unittest.main()
