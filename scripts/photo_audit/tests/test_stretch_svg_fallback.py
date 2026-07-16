import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import copy
import unittest

from stretch_svg_fallback import build_svg_fallback_candidates


def make_result(
    species_id: str,
    state: str = "machine_reject",
    variant: str = "default",
    danger_words: list[dict] | None = None,
) -> dict:
    return {
        "speciesId": species_id,
        "variant": variant,
        "state": state,
        "reasons": [f"reason for {species_id}"],
        "dangerWords": danger_words or [],
        "files": {"display": {"path": f"images/{species_id}.webp"}},
    }


class BuildSvgFallbackCandidatesTests(unittest.TestCase):
    def test_only_machine_reject_is_selected(self):
        results = [
            make_result("rejected"),
            make_result("review", state="review_required"),
            make_result("valid", state="provisionally_valid"),
        ]

        output = build_svg_fallback_candidates(results)

        self.assertEqual(
            [candidate["speciesId"] for candidate in output["candidates"]],
            ["rejected"],
        )

    def test_reject_target_ranks_as_high_confidence(self):
        results = [
            make_result(
                "medium_species",
                danger_words=[{"word": "larva", "target": "review_required"}],
            ),
            make_result(
                "high_species",
                danger_words=[{"word": "plate", "target": "machine_reject"}],
            ),
        ]

        candidates = build_svg_fallback_candidates(results)["candidates"]

        self.assertEqual(
            [(candidate["speciesId"], candidate["confidence"]) for candidate in candidates],
            [("high_species", "high"), ("medium_species", "medium")],
        )
        self.assertEqual(candidates[0]["dangerWords"], ["plate"])

    def test_order_is_deterministic(self):
        results = [
            make_result("beta", variant="female"),
            make_result("alpha", variant="female"),
            make_result("alpha", variant="default"),
        ]

        forward = build_svg_fallback_candidates(results)
        reverse = build_svg_fallback_candidates(list(reversed(results)))

        self.assertEqual(forward, reverse)
        self.assertEqual(
            [
                (candidate["speciesId"], candidate["variant"])
                for candidate in forward["candidates"]
            ],
            [("alpha", "default"), ("alpha", "female"), ("beta", "female")],
        )

    def test_empty_input(self):
        output = build_svg_fallback_candidates([])

        self.assertEqual(output["candidates"], [])
        self.assertIn("data-only proposal", output["note"])
        self.assertIn("read-only input", output["note"])

    def test_input_is_not_mutated(self):
        results = [
            make_result(
                "unchanged",
                danger_words=[{"word": "plate", "target": "machine_reject"}],
            )
        ]
        original = copy.deepcopy(results)

        build_svg_fallback_candidates(results)

        self.assertEqual(results, original)


if __name__ == "__main__":
    unittest.main()
