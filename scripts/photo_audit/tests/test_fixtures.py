import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import unittest

import extract
import run_audit


class FixtureAcceptanceTests(unittest.TestCase):
    repo_root = pathlib.Path(__file__).resolve().parents[3]
    ineligible_species = {
        "minminzemi",
        "suzumushi",
        "tagame",
        "kawara_hanmyou",
        "nishiki_hanmyou",
        "gengorou",
        "hannoao_kamikiri",
    }

    @classmethod
    def setUpClass(cls):
        extracted = extract.extract(cls.repo_root)
        fixtures = {
            fixture["speciesId"]: fixture
            for fixture in extract.iter_fixtures(extracted["catalog"])
            if fixture["variant"] == "default"
        }
        required = cls.ineligible_species | {"hercules_beetle"}
        missing = required - fixtures.keys()
        if missing:
            raise AssertionError(f"catalog fixtures missing: {sorted(missing)}")

        bugs = {bug["id"]: bug for bug in extracted["bugs"]}
        allowed = set(extracted["allowedMediaLicenses"])
        cls.results = {}
        for species_id in sorted(required):
            fixture = fixtures[species_id]
            result = run_audit._process_fixture(
                fixture,
                cls.repo_root,
                bugs.get(species_id),
                allowed,
            )
            run_audit._resolve_result(result)
            cls.results[species_id] = result

    def test_known_ineligible_fixtures_are_not_provisionally_valid(self):
        allowed_states = {"machine_reject", "review_required", "missing"}
        for species_id in sorted(self.ineligible_species):
            with self.subTest(species_id=species_id):
                self.assertIn(self.results[species_id]["state"], allowed_states)

    def test_clean_museum_specimen_is_not_machine_rejected(self):
        result = self.results["hercules_beetle"]
        self.assertNotEqual(result["state"], "machine_reject")
        self.assertEqual(result["dangerWords"], [])

    def test_subset_never_emits_approved(self):
        for species_id, result in self.results.items():
            with self.subTest(species_id=species_id):
                self.assertNotEqual(result["state"], "approved")


if __name__ == "__main__":
    unittest.main()
