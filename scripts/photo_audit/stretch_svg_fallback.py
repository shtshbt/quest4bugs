"""Build SVG fallback proposals from photo audit results.

Usage: call build_svg_fallback_candidates(results) with audit result dictionaries.
"""

from __future__ import annotations


def build_svg_fallback_candidates(results: list[dict]) -> dict:
    '''Return {"note": str, "candidates": [...]} proposing SVG fallback for
    high-confidence machine_reject entries.'''
    candidates = []
    for result in results:
        if result["state"] != "machine_reject":
            continue
        danger_words = result["dangerWords"]
        confidence = (
            "high"
            if any(match["target"] == "machine_reject" for match in danger_words)
            else "medium"
        )
        candidates.append(
            {
                "speciesId": result["speciesId"],
                "variant": result["variant"],
                "confidence": confidence,
                "reasons": list(result["reasons"]),
                "currentDisplay": result["files"]["display"]["path"],
                "dangerWords": [match["word"] for match in danger_words],
            }
        )

    confidence_rank = {"high": 0, "medium": 1}
    candidates.sort(
        key=lambda candidate: (
            confidence_rank[candidate["confidence"]],
            candidate["speciesId"],
            candidate["variant"],
        )
    )
    return {
        "note": (
            "This is a data-only proposal. No patch to "
            "zukan_config/zukan_catalog.js is generated, and the catalog stays "
            "a read-only input."
        ),
        "candidates": candidates,
    }
