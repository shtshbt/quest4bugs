"""Build immutable-slot species reserve banks without runtime catalog writes.

Usage:
    python -m zukan_foundry.reserve --repository-root . \
        --fixture zukan_foundry/tests/fixtures/t11_reserve_source.json \
        --bank-count 2 --bank-size 25
"""

import argparse
import hashlib
import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from zukan_foundry.catalog import build_index, build_normalized_index
from zukan_foundry.dedupe import dedupe_catalog, detect_duplicate
from zukan_foundry.discovery import DiscoveryService, GbifAdapter, HttpTransport, NhmAdapter
from zukan_foundry.negative_cache import should_research
from zukan_foundry.queries import generate_queries
from zukan_foundry.taxonomy import resolve_gbif_taxon


CANDIDATE_FIELDS = {
    "candidateId": str, "acceptedScientificName": str, "taxonRank": str,
    "taxonKey": str, "synonyms": list, "japaneseName": str,
    "japaneseNameSource": str, "order": str, "family": str,
    "taxonomySource": str, "existingMatch": (dict, type(None)),
    "subjectProposal": str, "mediaCandidates": list, "sizeEvidence": list,
    "status": str, "reviewReasons": list, "checkedAt": str,
    "sourceReceipt": str,
}
MEDIA_FIELDS = {
    "occurrenceId": str, "institution": str, "previewUrl": str,
    "mediaUrl": str, "sourceUrl": str, "license": str, "queryReceipt": str,
}
STATUSES = {"discovered", "taxonomy_resolved", "media_found", "no_hit", "needs_review", "rejected"}
DEFAULT_SPACING = dict(HttpTransport.MIN_INTERVALS)
DEFAULT_CONCURRENCY = 2


def _default_value(expected):
    if expected is str:
        return ""
    if expected is list:
        return []
    return None


def candidate_schema_errors(record):
    """Return strict schema errors without mutating the record."""
    if not isinstance(record, dict):
        return ["record:not_object"]
    errors = [f"schema:missing:{key}" for key in CANDIDATE_FIELDS.keys() - record.keys()]
    errors.extend(f"schema:unexpected:{key}" for key in record.keys() - CANDIDATE_FIELDS.keys())
    for key, expected in CANDIDATE_FIELDS.items():
        if key in record and not isinstance(record[key], expected):
            errors.append(f"schema:type:{key}")
    if record.get("status") not in STATUSES:
        errors.append("schema:value:status")
    if isinstance(record.get("candidateId"), str) and not re.fullmatch(r"taxon_\d{6}", record["candidateId"]):
        errors.append("schema:value:candidateId")
    for index, media in enumerate(record.get("mediaCandidates", [])):
        errors.extend(_media_errors(media, index))
    return sorted(errors)


def _media_errors(media, index):
    if not isinstance(media, dict):
        return [f"schema:media:{index}:not_object"]
    errors = [f"schema:media:{index}:missing:{key}" for key in MEDIA_FIELDS.keys() - media.keys()]
    errors.extend(f"schema:media:{index}:unexpected:{key}" for key in media.keys() - MEDIA_FIELDS.keys())
    for key, expected in MEDIA_FIELDS.items():
        if key in media and not isinstance(media[key], expected):
            errors.append(f"schema:media:{index}:type:{key}")
    return errors


def fail_closed_validate(record):
    """Normalize malformed fields and retain the slot with review reasons."""
    source = dict(record) if isinstance(record, dict) else {}
    reasons = candidate_schema_errors(source)
    normalized = {}
    for key, expected in CANDIDATE_FIELDS.items():
        value = source.get(key, _default_value(expected))
        normalized[key] = value if isinstance(value, expected) else _default_value(expected)
    normalized["reviewReasons"] = [item for item in normalized["reviewReasons"] if isinstance(item, str)]
    normalized["mediaCandidates"], media_reasons = _normalize_media(normalized["mediaCandidates"])
    reasons.extend(media_reasons)
    reasons.extend(_semantic_reasons(normalized))
    normalized["reviewReasons"] = sorted(set(normalized["reviewReasons"] + reasons))
    if normalized["taxonRank"].lower() != "species" or normalized["existingMatch"]:
        normalized["status"] = "rejected"
    elif reasons and normalized["status"] != "rejected":
        normalized["status"] = "needs_review"
    if normalized["status"] not in STATUSES:
        normalized["status"] = "needs_review"
    return normalized


def _semantic_reasons(record):
    reasons = []
    for key in ("taxonomySource", "sourceReceipt"):
        if not record[key]:
            reasons.append(f"provenance:missing:{key}")
    if not record["acceptedScientificName"]:
        reasons.append("taxonomy:unresolved")
    if record["taxonRank"].lower() != "species":
        reasons.append("taxonomy:not_species")
    if not record["japaneseName"] or not record["japaneseNameSource"]:
        reasons.append("japanese_name:unverified")
    for index, media in enumerate(record["mediaCandidates"]):
        for key, value in media.items():
            if not value:
                reasons.append(f"media:{index}:missing:{key}")
    return reasons


def _normalize_media(items):
    normalized, reasons = [], []
    for index, item in enumerate(items):
        reasons.extend(_media_errors(item, index))
        source = item if isinstance(item, dict) else {}
        normalized.append({
            key: source[key] if isinstance(source.get(key), expected) else ""
            for key, expected in MEDIA_FIELDS.items()
        })
    return normalized, reasons


class SourceBackedJapaneseNameVerifier:
    """Default hook requiring a name and an independently traceable source."""

    def verify(self, seed):
        name = seed.get("japaneseName")
        source = seed.get("japaneseNameSource")
        if not isinstance(name, str) or not name or not isinstance(source, str) or not source:
            return False, "japanese_name:unverified"
        if not source.startswith(("https://", "http://", "fixture://")):
            return False, "japanese_name:unsupported_source"
        return True, ""


@dataclass(frozen=True)
class ReserveConfig:
    bank_count: int = 5
    bank_size: int = 1000
    concurrency: int = DEFAULT_CONCURRENCY

    def __post_init__(self):
        if self.bank_count < 1 or self.bank_size < 1 or self.concurrency < 1:
            raise ValueError("bank_count, bank_size, and concurrency must be positive")


class ProviderRateLimiter:
    """Coordinate provider starts and extend spacing after rate limits."""

    def __init__(self, spacing=None, clock=time.monotonic, sleeper=time.sleep):
        self.spacing = dict(DEFAULT_SPACING if spacing is None else spacing)
        if any(not isinstance(value, (int, float)) or value < 0 for value in self.spacing.values()):
            raise ValueError("provider spacing must be non-negative numbers")
        for source, minimum in DEFAULT_SPACING.items():
            if source in self.spacing and self.spacing[source] < minimum:
                raise ValueError(f"provider spacing is below canonical minimum: {source}")
        self.clock, self.sleeper = clock, sleeper
        self.next_allowed = {}
        self.locks = {source: threading.Lock() for source in self.spacing}

    def wait(self, source):
        if source not in self.spacing:
            raise ValueError(f"missing provider spacing: {source}")
        with self.locks[source]:
            now = self.clock()
            self.sleeper(max(0.0, self.next_allowed.get(source, now) - now))
            started = self.clock()
            self.next_allowed[source] = started + self.spacing[source]
            return started

    def backoff(self, source):
        with self.locks[source]:
            extended = self.clock() + (self.spacing[source] * 2)
            self.next_allowed[source] = max(self.next_allowed.get(source, extended), extended)


class CoordinatedTransport:
    """Apply reserve pacing to any canonical discovery transport."""

    def __init__(self, transport, limiter):
        self.transport, self.limiter = transport, limiter

    def get_json(self, source, endpoint, params, headers):
        self.limiter.wait(source)
        try:
            return self.transport.get_json(source, endpoint, params, headers)
        except RuntimeError as error:
            if "429" in str(error):
                self.limiter.backoff(source)
            raise


class VirtualClock:
    """Advance provider spacing deterministically without wall-clock delays."""

    def __init__(self):
        self.value = 0.0
        self.lock = threading.Lock()

    def now(self):
        with self.lock:
            return self.value

    def sleep(self, seconds):
        with self.lock:
            self.value += max(0.0, seconds)


class ReserveDiscovery:
    """Run canonical discovery with persistent hit and no-hit query caching."""

    def __init__(self, transport, adapters, cache_path, concurrency=DEFAULT_CONCURRENCY,
                 spacing=None, clock=time.monotonic, sleeper=time.sleep, now=None):
        if not adapters or concurrency < 1:
            raise ValueError("adapters and positive concurrency are required")
        self.adapters = list(adapters)
        self.cache_root = Path(cache_path)
        self.concurrency = concurrency
        self.limiter = ProviderRateLimiter(spacing, clock, sleeper)
        self.transport = CoordinatedTransport(transport, self.limiter)
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.cache = self._load_cache()
        self.cache_lock = threading.Lock()

    def discover(self, records):
        operations = self._operations(records)
        results = []
        pending = []
        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            for candidate_id, adapter, query in operations:
                key = self._key(candidate_id, adapter.source, query)
                cached = self._cached_entry(key)
                if cached:
                    results.append(cached)
                else:
                    future = executor.submit(self._search, candidate_id, adapter, query)
                    pending.append((key, future))
            for key, future in pending:
                entry = future.result()
                self._save_entry(key, entry)
                results.append(entry)
        self._apply_results(records, results)
        return {"queries": len(operations), "requested": len(pending), "cached": len(operations) - len(pending)}

    def _cached_entry(self, key):
        entry = self.cache.get(key)
        if not entry:
            return None
        negative = entry.get("negativeCache")
        if negative and should_research(negative, self.now(), "1"):
            return None
        return entry

    def _operations(self, records):
        operations = []
        for record in records:
            if record["status"] != "taxonomy_resolved":
                continue
            candidate = {
                "speciesId": record["candidateId"], "scientificName": record["acceptedScientificName"],
                "jaName": record["japaneseName"],
            }
            resolution = {
                "acceptedScientificName": record["acceptedScientificName"],
                "synonyms": record["synonyms"],
            }
            for query in generate_queries(candidate, resolution):
                operations.extend((record["candidateId"], adapter, query["query"]) for adapter in self.adapters)
        return operations

    def _search(self, candidate_id, adapter, query):
        service = DiscoveryService(self.transport, self.now)
        run, media, negative = service.search(candidate_id, adapter, query)
        return {"candidateId": candidate_id, "run": run, "media": media, "negativeCache": negative}

    def _save_entry(self, key, entry):
        with self.cache_lock:
            self.cache[key] = entry
            _atomic_json(self.cache_root / f"{key}.json", entry)

    def _load_cache(self):
        if not self.cache_root.exists():
            return {}
        if not self.cache_root.is_dir():
            raise ValueError(f"reserve cache must be a directory: {self.cache_root}")
        entries = {}
        for path in sorted(self.cache_root.glob("*.json")):
            try:
                entry = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                raise ValueError(f"invalid reserve cache entry: {path}") from error
            if not isinstance(entry, dict) or not isinstance(entry.get("candidateId"), str):
                raise ValueError(f"invalid reserve cache entry schema: {path}")
            run = entry.get("run", {})
            expected = self._key(entry["candidateId"], run.get("source", ""), run.get("query", ""))
            if path.stem != expected:
                raise ValueError(f"reserve cache key mismatch: {path}")
            entries[path.stem] = entry
        return entries

    @staticmethod
    def _key(candidate_id, source, query):
        return hashlib.sha256(f"{candidate_id}|{source}|{query}".encode()).hexdigest()

    @staticmethod
    def _apply_results(records, results):
        grouped = {}
        for entry in results:
            grouped.setdefault(entry["candidateId"], []).append(entry)
        for record in records:
            entries = grouped.get(record["candidateId"])
            if not entries:
                continue
            media = [_reserve_media(item, entry["run"]) for entry in entries for item in entry["media"]]
            record["mediaCandidates"] = _unique_media(media)
            api_error = any(
                entry["negativeCache"] and entry["negativeCache"]["outcome"] == "api_error"
                for entry in entries
            )
            if media:
                record["status"] = "media_found"
            elif api_error:
                record["status"] = "needs_review"
                record["reviewReasons"].append("discovery:api_error")
            else:
                record["status"] = "no_hit"


def _reserve_media(media, run):
    media_url = media.get("mediaUrl") or media.get("retrievalReference") or ""
    return {
        "occurrenceId": media["recordId"], "institution": media["institution"],
        "previewUrl": media_url, "mediaUrl": media_url,
        "sourceUrl": media["recordUrl"], "license": media["license"],
        "queryReceipt": run["searchRunId"],
    }


def _unique_media(media):
    found = {}
    for item in media:
        found.setdefault((item["occurrenceId"], item["mediaUrl"]), item)
    return list(found.values())


class ReserveEngine:
    """Resolve seeds, preserve slots, validate records, and write bank files."""

    def __init__(self, seed_adapter, catalog_index, discovery, output_root,
                 config=ReserveConfig(), japanese_verifier=None):
        self.seed_adapter = seed_adapter
        self.catalog_index = catalog_index
        self.discovery = discovery
        self.output_root = Path(output_root)
        self.config = config
        self.japanese_verifier = japanese_verifier or SourceBackedJapaneseNameVerifier()
        if discovery and discovery.concurrency > config.concurrency:
            raise ValueError("discovery concurrency exceeds the reserve ceiling")

    def run(self):
        total = self.config.bank_count * self.config.bank_size
        seeds = self.seed_adapter.fetch(total)
        if len(seeds) != total:
            raise ValueError(f"seed adapter returned {len(seeds)} records, expected {total}")
        records = self._resolve(seeds)
        self._write_banks(records)
        discovery_stats = self.discovery.discover(records) if self.discovery else {"queries": 0, "requested": 0, "cached": 0}
        records = [fail_closed_validate(record) for record in records]
        self._write_banks(records)
        return {"banks": self.config.bank_count, "records": len(records), "discovery": discovery_stats}

    def _resolve(self, seeds):
        records, prior = [], []
        for index, seed in enumerate(seeds, start=1):
            record, resolution = self._resolve_one(index, seed)
            if resolution:
                self._apply_duplicates(record, resolution, prior)
                prior.append(_prior_record(record))
            records.append(fail_closed_validate(record))
        return records

    def _resolve_one(self, index, seed):
        record = _empty_record(index, seed)
        candidate = {
            "speciesId": record["candidateId"], "scientificName": seed.get("scientificName", ""),
            "acceptedName": None, "jaName": seed.get("japaneseName", ""),
        }
        try:
            resolution = resolve_gbif_taxon(candidate, seed.get("taxonomyResponse", {}), self.catalog_index)
        except (KeyError, TypeError, ValueError) as error:
            record["reviewReasons"].append(f"taxonomy:resolution_error:{type(error).__name__}")
            return record, None
        record.update({
            "acceptedScientificName": resolution["acceptedScientificName"],
            "taxonRank": resolution["rank"], "taxonKey": str(resolution["backboneKey"]),
            "synonyms": list(resolution["synonyms"]),
            "status": "taxonomy_resolved" if resolution["status"] == "resolved" else "needs_review",
        })
        if resolution["status"] != "resolved":
            record["reviewReasons"].append(f"taxonomy:{resolution['status']}")
        verified, reason = self.japanese_verifier.verify(seed)
        if not verified:
            record["reviewReasons"].append(reason)
        return record, resolution

    def _apply_duplicates(self, record, resolution, prior):
        seed_candidate = {
            "candidateId": record["candidateId"], "speciesId": record["candidateId"],
            "jaName": record["japaneseName"], "scientificName": record["acceptedScientificName"],
        }
        catalog = dedupe_catalog(seed_candidate, resolution, self.catalog_index)
        if catalog["status"] == "duplicate":
            _reject_match(record, "catalog", catalog["matchedSpeciesIds"], catalog["reasons"])
            return
        canonical_resolution = {
            "acceptedName": record["acceptedScientificName"], "status": resolution["status"],
            "sources": [{"synonyms": record["synonyms"]}],
        }
        reserve = detect_duplicate(seed_candidate, canonical_resolution, prior)
        if reserve["status"] == "duplicate":
            _reject_match(record, "reserve", reserve["matchedExistingIds"], reserve["hardReasons"])
        elif reserve["status"] == "needs_review":
            record["status"] = "needs_review"
            record["reviewReasons"].extend(reserve["reviewReasons"] + reserve["warnings"])

    def _write_banks(self, records):
        self.output_root.mkdir(parents=True, exist_ok=True)
        for bank in range(1, self.config.bank_count + 1):
            start = (bank - 1) * self.config.bank_size
            path = self.output_root / f"candidate_bank_{bank:03d}.json"
            bank_records = records[start:start + self.config.bank_size]
            _verify_existing_slots(path, bank_records)
            _atomic_json(path, bank_records)


def _empty_record(index, seed):
    return {
        "candidateId": f"taxon_{index:06d}", "acceptedScientificName": "",
        "taxonRank": str(seed.get("taxonRank", "")), "taxonKey": "", "synonyms": [],
        "japaneseName": str(seed.get("japaneseName", "")),
        "japaneseNameSource": str(seed.get("japaneseNameSource", "")),
        "order": str(seed.get("order", "")), "family": str(seed.get("family", "")),
        "taxonomySource": str(seed.get("taxonomySource", "")), "existingMatch": None,
        "subjectProposal": str(seed.get("subjectProposal", "")), "mediaCandidates": [],
        "sizeEvidence": [], "status": "discovered", "reviewReasons": [],
        "checkedAt": str(seed.get("checkedAt", "")), "sourceReceipt": str(seed.get("sourceReceipt", "")),
    }


def _prior_record(record):
    return {
        "id": record["candidateId"], "jaName": record["japaneseName"],
        "canonicalName": record["acceptedScientificName"], "synonyms": record["synonyms"],
        "lifeStageNames": [],
    }


def _reject_match(record, scope, identifiers, reasons):
    record["existingMatch"] = {"scope": scope, "identifiers": list(identifiers)}
    record["status"] = "rejected"
    record["reviewReasons"].extend(f"duplicate:{reason}" for reason in reasons)


def _verify_existing_slots(path, records):
    if not path.exists():
        return
    try:
        existing = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"existing bank is invalid: {path}") from error
    before = [item.get("candidateId") for item in existing if isinstance(item, dict)] if isinstance(existing, list) else []
    after = [item["candidateId"] for item in records]
    if before != after:
        raise ValueError(f"immutable candidate slots differ: {path}")


def _atomic_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    try:
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        temporary.replace(path)
    except OSError as error:
        temporary.unlink(missing_ok=True)
        raise RuntimeError(f"failed to write {path}: {error}") from error


def _catalog_index(repository_root):
    catalog = build_index(repository_root)[0]
    return build_normalized_index(catalog["species"], catalog["generatedFromCommit"])


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build offline T11 species reserve banks")
    parser.add_argument("--repository-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--output-root", type=Path)
    parser.add_argument("--bank-count", type=int, default=5)
    parser.add_argument("--bank-size", type=int, default=1000)
    args = parser.parse_args(argv)
    try:
        from tools.campaign3.t11_species_reserve.seed_fetch_adapter import FixtureMediaTransport, FixtureSeedAdapter
        root = args.repository_root.resolve()
        output = args.output_root or root / "zukan_foundry" / "data" / "species_reserve"
        clock = VirtualClock()
        transport = FixtureMediaTransport(args.fixture)
        discovery = ReserveDiscovery(
            transport, [GbifAdapter(), NhmAdapter()], output / "query_cache",
            DEFAULT_CONCURRENCY, DEFAULT_SPACING, clock.now, clock.sleep,
            lambda: datetime(2026, 7, 16, 16, 0, tzinfo=timezone.utc),
        )
        engine = ReserveEngine(
            FixtureSeedAdapter(args.fixture), _catalog_index(root), discovery, output,
            ReserveConfig(args.bank_count, args.bank_size, DEFAULT_CONCURRENCY),
        )
        print(json.dumps(engine.run(), ensure_ascii=False, sort_keys=True))
    except (OSError, RuntimeError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
