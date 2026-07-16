"""Provide source-backed seed adapters for the T11 reserve engine.

Usage:
    python tools/campaign3/t11_species_reserve/seed_fetch_adapter.py \
        --fixture zukan_foundry/tests/fixtures/t11_reserve_source.json --limit 2
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_TARGET_ORDERS = (
    "Coleoptera", "Diptera", "Hemiptera", "Hymenoptera", "Lepidoptera",
    "Mantodea", "Odonata", "Orthoptera", "Phasmatodea", "Trichoptera",
)


def _read_json(path):
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid fixture: {path}") from error
    if not isinstance(payload, dict):
        raise ValueError("fixture root must be an object")
    return payload


def _alpha(number):
    value = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        value = chr(97 + remainder) + value
    return value


class FixtureSeedAdapter:
    """Expand a committed synthetic fixture into deterministic seed records."""

    source = "fixture"

    def __init__(self, fixture_path):
        self.path = Path(fixture_path)
        self.payload = _read_json(self.path)
        if self.payload.get("schemaVersion") != 1 or not self.payload.get("syntheticTestData"):
            raise ValueError("fixture must be schema v1 synthetic test data")

    def fetch(self, limit, offset=0):
        available = self.payload.get("seedCount")
        if not isinstance(limit, int) or limit < 1 or not isinstance(offset, int) or offset < 0:
            raise ValueError("limit must be positive and offset must be non-negative")
        if not isinstance(available, int) or offset + limit > available:
            raise ValueError("fixture does not contain the requested seed range")
        return [self._seed(index) for index in range(offset + 1, offset + limit + 1)]

    def _seed(self, index):
        dataset_id = self.payload["datasetId"]
        number = f"{index:04d}"
        seed = {
            "seedId": f"fixture_seed_{number}",
            "scientificName": f"F{_alpha(index)} s{_alpha(index * 17)}",
            "taxonRank": "species",
            "synonyms": [],
            "japaneseName": chr(0x4E00 + index),
            "japaneseNameSource": f"fixture://{dataset_id}#japanese-{number}",
            "order": "Testoptera",
            "family": "Fixtureidae",
            "taxonomySource": f"fixture://{dataset_id}#taxonomy-{number}",
            "sourceReceipt": f"fixture://{dataset_id}#seed-{number}",
            "subjectProposal": "",
            "checkedAt": self.payload["checkedAt"],
        }
        seed.update(self.payload.get("overrides", {}).get(str(index), {}))
        seed["taxonomyResponse"] = {
            "usageKey": 700000 + index,
            "scientificName": seed["scientificName"],
            "canonicalName": seed["scientificName"],
            "rank": seed["taxonRank"].upper(),
            "matchType": "EXACT",
            "confidence": 100,
            "synonyms": list(seed.get("synonyms", [])),
        }
        return seed


class GbifSeedAdapter:
    """Fetch live GBIF species seeds through an injected transport.

    This adapter is intentionally transport-agnostic. T11 offline tests never
    instantiate it with a network transport.
    """

    source = "gbif"
    page_size = 300

    def __init__(self, transport, orders=DEFAULT_TARGET_ORDERS, families=()):
        self.transport = transport
        self.orders = tuple(orders)
        self.families = tuple(families)

    def fetch(self, limit, offset=0):
        if not isinstance(limit, int) or limit < 1 or not isinstance(offset, int) or offset < 0:
            raise ValueError("limit must be positive and offset must be non-negative")
        seeds = []
        while len(seeds) < limit:
            page_limit = min(self.page_size, limit - len(seeds))
            params = self._params(page_limit, offset + len(seeds))
            payload = self.transport.get_json("gbif", "/v1/species/search", params, {})
            results = payload.get("results") if isinstance(payload, dict) else None
            if not isinstance(results, list):
                raise ValueError("invalid GBIF seed response")
            seeds.extend(self._adapt(item) for item in results)
            if len(results) < page_limit:
                break
        return seeds

    def _params(self, limit, offset):
        params = {"limit": limit, "offset": offset, "rank": "SPECIES"}
        if self.orders:
            params["order"] = ",".join(self.orders)
        if self.families:
            params["family"] = ",".join(self.families)
        return params

    @staticmethod
    def _adapt(item):
        key = item.get("key")
        name = item.get("scientificName") or item.get("canonicalName") or ""
        if not isinstance(key, int) or not isinstance(name, str) or not name:
            raise ValueError("GBIF seed is missing key or scientific name")
        source = f"https://www.gbif.org/species/{key}"
        checked_at = datetime.now(timezone.utc).isoformat()
        return {
            "seedId": f"gbif_{key}", "scientificName": name,
            "taxonRank": str(item.get("rank", "")).lower(),
            "synonyms": list(item.get("synonyms", [])),
            "japaneseName": "", "japaneseNameSource": "",
            "order": str(item.get("order", "")), "family": str(item.get("family", "")),
            "taxonomySource": source, "sourceReceipt": source,
            "subjectProposal": "", "checkedAt": checked_at, "taxonomyResponse": item,
        }


class FixtureMediaTransport:
    """Serve canonical GBIF/NHM adapters from the same committed fixture."""

    def __init__(self, fixture_path):
        self.payload = _read_json(fixture_path)
        self.calls = []
        self._names = {
            seed["scientificName"]: index
            for index, seed in enumerate(
                FixtureSeedAdapter(fixture_path).fetch(self.payload["seedCount"]), start=1
            )
        }

    def get_json(self, source, endpoint, params, headers):
        query = params.get("scientific_name") or params.get("q")
        if source not in {"gbif", "nhm"} or not isinstance(query, str):
            raise ValueError("invalid fixture media request")
        self.calls.append((source, endpoint, query))
        match = next(((name, index) for name, index in self._names.items() if name in query), None)
        if not match or match[1] % self.payload["media"]["hitModulo"] == 0:
            return {"results": []} if source == "gbif" else {"records": []}
        return self._result(source, match[0], match[1])

    def _result(self, source, name, index):
        number = f"{index:04d}"
        common = {
            "imageDimensions": {"width": 1200, "height": 800},
            "view": "dorsal", "sex": "unknown", "locality": "Fixture Island",
            "license": "CC0-1.0",
        }
        if source == "gbif":
            item = {
                "key": f"fixture-gbif-{number}", "scientificName": name,
                "taxonRank": "SPECIES", "institutionCode": "FIXTURE",
                "basisOfRecord": "PRESERVED_SPECIMEN",
                "mediaUrl": f"https://fixtures.invalid/media/gbif-{number}.jpg",
                "recordUrl": f"https://fixtures.invalid/records/gbif-{number}",
                "rightsHolder": "Fixture Museum", "attribution": "Fixture Museum",
                "lifeStage": "adult", "identificationQualifier": "", **common,
            }
            return {"results": [item]}
        item = {
            "id": f"fixture-nhm-{number}", "scientific_name": name,
            "rank": "species", "institution": "FIXTURE-NHM",
            "basis_of_record": "PreservedSpecimen",
            "identifier": f"https://fixtures.invalid/media/nhm-{number}.jpg",
            "references": f"https://fixtures.invalid/records/nhm-{number}",
            "rights_holder": "Fixture Museum", "creator": "Fixture Museum",
            "life_stage": "adult", "identification_qualifier": "", **common,
        }
        return {"records": [item]}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read source-backed reserve seeds")
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--limit", type=int, required=True)
    args = parser.parse_args(argv)
    try:
        print(json.dumps(FixtureSeedAdapter(args.fixture).fetch(args.limit), ensure_ascii=False, indent=2))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
