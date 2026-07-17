"""Harvest reserve seeds from GBIF into a resumable append-only cache.

Seed harvesting is slow and network bound: GBIF's canonical spacing is 2 seconds
per call and each species costs two calls, so a full 5000-species reserve takes
hours. ReserveEngine.run() instead demands every seed in one fetch and raises if
it gets fewer, which would throw away a long run over a single gap.

So harvesting is separated from the engine. This writes one JSON object per line
as each species resolves, so an interrupted run keeps everything it already
earned and the next run continues where it stopped. The engine then reads the
finished cache offline through CachedSeedAdapter, which is fast and
deterministic.

Usage:
    python tools/campaign3/t11_species_reserve/harvest_seeds.py \
        --output zukan_foundry/data/species_reserve/seeds.jsonl --target 5000
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "zukan_foundry"))

from tools.campaign3.t11_species_reserve.gbif_japan_seed import (
    ORDER_KEYS, GbifJapanSeedAdapter, verify_order_keys,
)
from zukan_foundry.discovery import HttpTransport


def load_cache(path):
    """Return (seeds, seen_ids). A truncated final line is dropped, not guessed at."""
    path = Path(path)
    if not path.exists():
        return [], set()
    seeds, seen = [], set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            seed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(seed, dict) and seed.get("seedId") and seed["seedId"] not in seen:
            seen.add(seed["seedId"])
            seeds.append(seed)
    return seeds, seen


class CachedSeedAdapter:
    """Serve harvested seeds to ReserveEngine offline."""

    source = "gbif"

    def __init__(self, cache_path):
        self.seeds, _ = load_cache(cache_path)

    def fetch(self, limit, offset=0):
        if not isinstance(limit, int) or limit < 1 or not isinstance(offset, int) or offset < 0:
            raise ValueError("limit must be positive and offset must be non-negative")
        window = self.seeds[offset:offset + limit]
        if len(window) < limit:
            raise ValueError(
                f"seed cache holds {len(self.seeds)} seeds; {offset + limit} were requested. "
                "Harvest more before running the engine.")
        return window


def harvest(output, target, orders, min_occurrences, log_every=10):
    """Append seeds until the cache holds target records. Safe to interrupt."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    existing, seen = load_cache(output)
    print(f"cache holds {len(existing)} seeds; target {target}", flush=True)
    if len(existing) >= target:
        print("target already met", flush=True)
        return 0

    transport = HttpTransport()
    adapter = GbifJapanSeedAdapter(transport, orders=orders,
                                   min_occurrences=min_occurrences)

    # Fail closed before spending hours: a wrong taxonKey harvests the wrong
    # animals, and that is not visible until the seeds are inspected.
    problems = verify_order_keys(transport, adapter.orders)
    if problems:
        for problem in problems:
            print(f"order key rejected: {problem}", file=sys.stderr, flush=True)
        raise ValueError("order keys failed verification; refusing to harvest")
    print(f"verified {len(adapter.orders)} insect order keys", flush=True)

    started = time.time()
    added = 0
    # Ask for the whole ordered key list once, then walk it, so a resume does not
    # re-pay for the facet queries per seed.
    # Facets, not occurrence pages: one facet call returns up to 1000 distinct
    # species keys, while paging occurrence records yields only about 200 unique
    # species per 900 records because the same common species repeat.
    keys = adapter._japanese_species_keys(target * 3)
    print(f"{len(keys)} Japanese species keys available across "
          f"{len(adapter.orders)} orders", flush=True)

    for key in keys:
        if len(existing) + added >= target:
            break
        if f"gbif_{key}" in seen:
            continue
        try:
            seed = adapter._seed_for(key)
        except (RuntimeError, ValueError) as error:
            print(f"skip {key}: {error}", flush=True)
            continue
        if seed is None:
            continue
        with output.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(seed, ensure_ascii=False, sort_keys=True) + "\n")
            handle.flush()
        seen.add(seed["seedId"])
        added += 1
        if added % log_every == 0:
            total = len(existing) + added
            rate = (time.time() - started) / added
            remaining = (target - total) * rate
            print(f"{total}/{target} seeds  {rate:.1f}s/seed  eta {remaining/3600:.1f}h  "
                  f"latest {seed['japaneseName']}", flush=True)
    total = len(existing) + added
    print(f"done: {total}/{target} seeds ({added} new) in {(time.time()-started)/60:.1f}min",
          flush=True)
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Harvest GBIF Japan seeds into a resumable cache")
    parser.add_argument("--output", required=True)
    parser.add_argument("--target", type=int, default=5000)
    parser.add_argument("--min-occurrences", type=int, default=5)
    parser.add_argument("--orders", default="", help="comma separated order names")
    args = parser.parse_args(argv)
    orders = ({name: ORDER_KEYS[name] for name in args.orders.split(",") if name in ORDER_KEYS}
              if args.orders else None)
    try:
        return harvest(args.output, args.target, orders, args.min_occurrences)
    except KeyboardInterrupt:
        print("interrupted; cache keeps every seed already written", flush=True)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
