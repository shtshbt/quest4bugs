"""Generate fixture evidence. Example: python -m zukan_foundry.run_offline."""

import json
from datetime import datetime, timezone
from pathlib import Path

from zukan_foundry.candidates import load_candidate_source, select_candidates
from zukan_foundry.catalog import build_index, build_normalized_index
from zukan_foundry.dedupe import dedupe_catalog
from zukan_foundry.discovery import DiscoveryService, GbifAdapter, NhmAdapter
from zukan_foundry.queries import generate_queries
from zukan_foundry.taxonomy import resolve_gbif_taxon
from zukan_foundry.validators import require_valid


class FixtureTransport:
    def __init__(self, gbif: dict, nhm: dict):
        self.payloads = {"gbif": gbif, "nhm": nhm}
        self.calls = []

    def get_json(self, source: str, endpoint: str, params: dict, headers: dict) -> dict:
        query = params.get("scientific_name") or params.get("q")
        if source not in self.payloads or not isinstance(query, str):
            raise ValueError("invalid fixture transport input")
        if source == "nhm" and not headers.get("User-Agent"):
            raise ValueError("NHM requests require User-Agent")
        self.calls.append((source, endpoint, query))
        return self.payloads[source].get(query, {"results": []} if source == "gbif" else {"records": []})


def _load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid JSON fixture: {path}") from error


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run(root: Path) -> dict:
    if not root.is_dir():
        raise ValueError("repository root must exist")
    foundry_root = root / "zukan_foundry"
    fixtures = foundry_root / "tests" / "fixtures"
    catalog, _, _ = build_index(root)
    names = build_normalized_index(catalog["species"], catalog["generatedFromCommit"])
    _write_json(foundry_root / "data" / "source_discovery" / "normalized_names_index.json", names)

    candidate_path = fixtures / "fixture_candidates.json"
    entries, source = load_candidate_source(root, candidate_path)
    selected, selection = select_candidates(entries)
    for gap in selected:
        require_valid("MediaGapRecord", gap)
    taxonomy_payloads = _load_json(fixtures / "gbif_taxonomy.json")
    gbif_payloads = _load_json(fixtures / "gbif_search.json")
    nhm_payloads = _load_json(fixtures / "nhm_search.json")
    transport = FixtureTransport(gbif_payloads, nhm_payloads)
    service = DiscoveryService(transport, lambda: datetime(2026, 7, 16, 16, 0, tzinfo=timezone.utc))
    adapters = [GbifAdapter(), NhmAdapter()]
    summary = {"candidateSource": source, **selection, "liveNetworkExecuted": False}

    for gap in selected:
        response = taxonomy_payloads.get(gap["scientificName"], {})
        resolution = resolve_gbif_taxon(gap, response, names)
        _write_json(foundry_root / "data" / "taxonomy" / f"{gap['speciesId']}.json", resolution)
        result = dedupe_catalog(gap, resolution, names)
        _write_json(foundry_root / "data" / "dedupe" / f"{gap['speciesId']}.json", result)
        queries = generate_queries(gap, resolution) if resolution["status"] == "resolved" and result["status"] == "unique" else []
        _write_json(foundry_root / "data" / "queries" / f"{gap['speciesId']}.json", queries)
        media = []
        operations = [(adapter, query["query"]) for query in queries for adapter in adapters]
        for adapter, query in operations:
            search_run, found, cache = service.search(gap["speciesId"], adapter, query)
            _write_json(foundry_root / "data" / "search_runs" / f"{search_run['searchRunId']}.json", search_run)
            if cache:
                _write_json(foundry_root / "data" / "negative_cache" / f"{cache['queryHash']}.json", cache)
            media.extend(found)
        calls_before_retry = len(transport.calls)
        for adapter, query in operations:
            service.search(gap["speciesId"], adapter, query)
        if len(transport.calls) != calls_before_retry:
            raise RuntimeError("idempotent retry sent fixture requests")
        _write_json(foundry_root / "data" / "media_candidates" / f"{gap['speciesId']}.json", media)
    _write_json(foundry_root / "data" / "search_runs" / "offline_run_summary.json", summary)
    return summary


if __name__ == "__main__":
    run(Path(__file__).resolve().parents[2])
