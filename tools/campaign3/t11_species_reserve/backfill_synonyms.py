"""Backfill GBIF synonyms into the harvested seed cache, resumably.

Harvested seeds carry an empty synonyms list because the harvester never
called /v1/species/{key}/synonyms, so synonym-based dedupe cannot fire. This
script fills the field in after the fact:

  - reads the seed cache (seeds.jsonl), one JSON object per line
  - fetches synonyms for every gbif_* record not yet marked as fetched
  - stamps synonymsFetchedAt and synonymsSource on success, so a resumed run
    never re-asks GBIF about a record it already answered, even when the
    answer was "no synonyms"
  - rewrites the whole file atomically through a temporary file after every
    fetched record, so an interrupt loses at most the in-flight record

GBIF pacing is the canonical 2 seconds per request (HttpTransport), so a full
1461-record run takes about 50 minutes. Use --limit for bounded smoke runs.

Usage:
    python tools/campaign3/t11_species_reserve/backfill_synonyms.py \
        --seeds zukan_foundry/data/species_reserve/seeds.jsonl [--limit 3]
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "zukan_foundry"))

from tools.campaign3.t11_species_reserve.gbif_japan_seed import fetch_synonyms
from zukan_foundry.discovery import HttpTransport


def load_seed_records(path):
    """Parse every seed line, failing on any malformed one.

    Unlike the harvester's tolerant reader, a backfill rewrites the whole
    file, so a line it cannot parse must stop the run rather than be silently
    dropped from the rewrite.
    """
    records = []
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"{path}:{number}: not valid JSON") from error
        if not isinstance(record, dict) or not record.get("seedId"):
            raise ValueError(f"{path}:{number}: not a seed record")
        records.append(record)
    return records


def species_key(seed):
    """The GBIF species key behind a gbif_NNN seedId, or None for other seeds."""
    seed_id = str(seed.get("seedId", ""))
    if seed_id.startswith("gbif_") and seed_id[len("gbif_"):].isdigit():
        return int(seed_id[len("gbif_"):])
    return None


def write_atomic(path, records):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    payload = "".join(
        json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n"
        for record in records
    )
    try:
        temporary.write_text(payload, encoding="utf-8")
        temporary.replace(path)
    except OSError as error:
        temporary.unlink(missing_ok=True)
        raise RuntimeError(f"failed to write {path}: {error}") from error


def backfill(seeds_path, transport=None, limit=None, now=None):
    """Fill synonyms for unfetched records. Returns a summary of counts."""
    if limit is not None and (not isinstance(limit, int) or limit < 1):
        raise ValueError("limit must be a positive integer")
    records = load_seed_records(seeds_path)
    transport = transport or HttpTransport()
    now = now or (lambda: datetime.now(timezone.utc).isoformat())
    fetched = already = foreign = failed = 0
    for record in records:
        if limit is not None and fetched >= limit:
            break
        if record.get("synonymsFetchedAt"):
            already += 1
            continue
        key = species_key(record)
        if key is None:
            foreign += 1
            continue
        try:
            names = fetch_synonyms(transport, key)
        except (RuntimeError, ValueError) as error:
            # Transient failure: the record stays unmarked so a resume retries.
            print(f"skip {record['seedId']}: {error}", file=sys.stderr, flush=True)
            failed += 1
            continue
        record["synonyms"] = names
        record["synonymsSource"] = f"https://www.gbif.org/species/{key}#synonyms"
        record["synonymsFetchedAt"] = now()
        write_atomic(seeds_path, records)
        fetched += 1
        print(f"{record['seedId']}: {len(names)} synonyms", file=sys.stderr, flush=True)
    return {
        "records": len(records), "fetched": fetched, "alreadyFetched": already,
        "noSpeciesKey": foreign, "failed": failed,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Backfill GBIF synonyms into the seed cache")
    parser.add_argument("--seeds", required=True)
    parser.add_argument("--limit", type=int, default=None,
                        help="stop after this many newly fetched records")
    try:
        args = parser.parse_args(argv)
        summary = backfill(args.seeds, limit=args.limit)
    except KeyboardInterrupt:
        print("interrupted; the cache keeps every record already rewritten",
              file=sys.stderr, flush=True)
        return 130
    except (OSError, RuntimeError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
