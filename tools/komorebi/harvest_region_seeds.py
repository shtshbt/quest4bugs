"""Harvest komorebi region seeds from GBIF into resumable per-region caches.

Same shape as the domestic harvester (tools/campaign3/t11_species_reserve/
harvest_seeds.py): GBIF's canonical spacing is 2 seconds per call and each
species costs two calls, so a full region takes hours. Every resolved species
is appended to the region's cache as one JSON line, and every permanent
rejection (wrong rank, not an insect) is appended to a sibling .rejected file
with its reason, so an interrupted run keeps everything it already earned and
the next run does not re-ask GBIF about anything it already settled. A species
without a Japanese or English name is stocked with nameStatus "pending", never
rejected.

Usage:
    python tools/komorebi/harvest_region_seeds.py --region madagascar \
        --output zukan_foundry/data/species_reserve/regions/madagascar.jsonl \
        --target 300
"""

import argparse
import json
import sys
import time
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT))
sys.path.insert(0, str(_REPO_ROOT / "zukan_foundry"))

from tools.campaign3.t11_species_reserve.harvest_seeds import load_cache
from tools.komorebi.gbif_region_seed import (
    ORDER_KEYS, GbifRegionSeedAdapter, load_regions, verify_order_keys,
)
from zukan_foundry.discovery import HttpTransport

DEFAULT_REGIONS_FILE = Path(__file__).resolve().parent / "regions.json"
DEFAULT_OUTPUT_ROOT = _REPO_ROOT / "zukan_foundry" / "data" / "species_reserve" / "regions"


def make_transport(interval):
    """HttpTransport with a caller-chosen GBIF request spacing.

    2.0 seconds is GBIF's canonical spacing; a slower interval is for running
    beside another harvest that is already spending the budget. The override
    shadows the class mapping on the instance, so other sources keep their own
    spacing and other transports keep the default.
    """
    if not isinstance(interval, (int, float)) or isinstance(interval, bool) or interval <= 0:
        raise ValueError("interval must be a positive number of seconds")
    transport = HttpTransport()
    transport.MIN_INTERVALS = dict(HttpTransport.MIN_INTERVALS, gbif=float(interval))
    return transport


def rejects_path(output):
    return Path(str(output) + ".rejected")


def load_rejects(path):
    """Return the species keys already rejected for good.

    Each line is "speciesKey<TAB>reason". Only the key matters for skipping;
    the reason stays in the file as the audit trail. Without this record a
    resume re-pays a GBIF call for every genus-level or non-insect key it has
    already seen.
    """
    path = Path(path)
    if not path.exists():
        return set()
    keys = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        first = line.strip().split("\t", 1)[0]
        if first.isdigit():
            keys.add(int(first))
    return keys


def harvest(region_id, regions_file, output, target, orders, min_occurrences,
            interval, log_every=10, transport=None):
    """Append seeds until the region cache holds target records. Safe to interrupt."""
    regions = load_regions(regions_file)
    if region_id not in regions:
        raise ValueError(f"unknown region {region_id!r}; the regions file defines "
                         f"{', '.join(sorted(regions))}")
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    existing, seen = load_cache(output)
    rejects_file = rejects_path(output)
    rejected = load_rejects(rejects_file)
    print(f"{region_id}: cache holds {len(existing)} seeds and {len(rejected)} known "
          f"rejects; target {target}", flush=True)
    if len(existing) >= target:
        print("target already met", flush=True)
        return 0

    if transport is None:
        transport = make_transport(interval)
    adapter = GbifRegionSeedAdapter(transport, region_id, regions[region_id],
                                    orders=orders, min_occurrences=min_occurrences)

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
    # Ask for the whole ranked species list once, then walk it, so a resume
    # does not re-pay the facet queries per seed.
    ranked = adapter.region_species(target * 3)
    print(f"{len(ranked)} regional species keys available across "
          f"{len(adapter.orders)} orders", flush=True)

    for key, count, receipts in ranked:
        if len(existing) + added >= target:
            break
        if f"gbif_{key}" in seen or key in rejected:
            continue
        try:
            seed, reason = adapter.seed_for(key, count, receipts)
        except (RuntimeError, ValueError) as error:
            # A transient failure is not evidence about the species, so it is
            # not recorded as a reject.
            print(f"skip {key}: {error}", flush=True)
            continue
        if seed is None:
            with rejects_file.open("a", encoding="utf-8") as handle:
                handle.write(f"{key}\t{reason}\n")
                handle.flush()
            rejected.add(key)
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
                  f"latest {seed['scientificName']} [{seed['nameStatus']}]", flush=True)
    total = len(existing) + added
    print(f"done: {total}/{target} seeds ({added} new) in {(time.time()-started)/60:.1f}min",
          flush=True)
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Harvest GBIF region seeds into a resumable per-region cache")
    parser.add_argument("--region", required=True, help="region id from the regions file")
    parser.add_argument("--regions-file", default=str(DEFAULT_REGIONS_FILE))
    parser.add_argument("--output", default="",
                        help="default: zukan_foundry/data/species_reserve/regions/<region>.jsonl")
    parser.add_argument("--target", type=int, default=300)
    parser.add_argument("--min-occurrences", type=int, default=5)
    parser.add_argument("--interval", type=float, default=2.0,
                        help="seconds between GBIF requests")
    parser.add_argument("--orders", default="", help="comma separated order names")
    args = parser.parse_args(argv)
    orders = ({name: ORDER_KEYS[name] for name in args.orders.split(",") if name in ORDER_KEYS}
              if args.orders else None)
    output = args.output or str(DEFAULT_OUTPUT_ROOT / f"{args.region}.jsonl")
    try:
        return harvest(args.region, args.regions_file, output, args.target, orders,
                       args.min_occurrences, args.interval)
    except KeyboardInterrupt:
        print("interrupted; cache keeps every seed already written", flush=True)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
