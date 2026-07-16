# T11 species reserve evidence

## Execution mode

This run used local supervised mode. Baseline and cloud gates, receipt creation,
Git commit, push, and pull request operations were not run. No outbound request
was attempted. The committed source fixture is synthetic test data and is not a
production candidate list.

## Resolved paths and entry points

- Foundry package: `zukan_foundry/zukan_foundry/`
- Reserve implementation: `zukan_foundry/zukan_foundry/reserve.py`
- Reserve state root: `zukan_foundry/data/species_reserve/`
- Generated bank names: `candidate_bank_001.json` through
  `candidate_bank_005.json` for the default live configuration
- Generated query cache: `zukan_foundry/data/species_reserve/query_cache/`
- Seed adapter: `tools/campaign3/t11_species_reserve/seed_fetch_adapter.py`
- Taxonomy resolver: `zukan_foundry.taxonomy.resolve_gbif_taxon(candidate, response, catalog_index)`
- Japanese name normalization and catalog index: `zukan_foundry.catalog.normalize_japanese(value)`
  and `build_normalized_index(species, commit_sha)`
- Production catalog dedupe: `zukan_foundry.dedupe.dedupe_catalog(candidate, resolution, catalog_index)`
- Reserve collision detection: `zukan_foundry.dedupe.detect_duplicate(candidate, resolution, existing_species)`
- Search query generation: `zukan_foundry.queries.generate_queries(candidate, resolution)`
- Source discovery: `zukan_foundry.discovery.DiscoveryService.search(candidate_id, adapter, query)`
- Live media adapter interfaces: `zukan_foundry.discovery.GbifAdapter` and
  `zukan_foundry.discovery.NhmAdapter`
- Negative result records: `zukan_foundry.negative_cache.create_cache_entry(...)`,
  called by `DiscoveryService`
- Media provenance normalization: `zukan_foundry.discovery.normalize_media_candidate(...)`
- Media contract root: `contracts/media_pipeline/`, read only

The existing foundry state convention is `zukan_foundry/data/`. The reserve was
placed below that root. `zukan_foundry/.gitignore` ignores `data/`, so generated
banks and query cache remain local. The committed engine, fixture, tests, and
this evidence note remain outside ignored state.

## Must results

1. M1 was replaced by the local supervised execution rules. The session did not
   apply the baseline SHA, cloud environment, or terminal receipt gates.
2. M2 reuses the canonical entry points listed above. No taxonomy, catalog
   dedupe, source discovery, provenance, or negative-cache module was copied or
   modified.
3. M3 resolves the reserve root to `zukan_foundry/data/species_reserve/`.
   `git check-ignore -v` resolves it to `zukan_foundry/.gitignore:3:data/`.
4. M4 is implemented with default configuration of 5 banks by 1000 slots and
   global IDs `taxon_000001` through `taxon_005000`. Existing bank files may be
   enriched on resume only when their complete candidate ID sequence is
   unchanged. The supervised proof used 2 banks by 25 slots. No rarity field is
   present.
5. M5 is implemented through an injected seed adapter. `GbifSeedAdapter` is
   paged, requires species rank, carries GBIF source receipts, and declares the
   target insect orders. `FixtureSeedAdapter` provides the offline proof through
   the same `fetch(limit, offset=0)` interface. Taxonomy resolution remains in
   the canonical resolver.
6. M6 checks the read-only production index and prior reserve slots through the
   canonical dedupe functions. Missing Japanese-name evidence, non-species
   rank, exact names, synonyms, and Japanese-name collisions remain in their
   slots as `needs_review` or `rejected`.
7. M7 uses a global concurrency ceiling of 2. Provider spacing is GBIF 2.0
   seconds and NHM 0.21 seconds, taken from `HttpTransport.MIN_INTERVALS` and
   the repository operating rules. A 429 doubles the next spacing. Hit,
   zero-result, license, and API-error records are persisted per query. A
   completed query is not sent again on resume. Taxonomy-resolved banks are
   written before discovery, so an interrupted run retains stable slots while
   completed query receipts remain cached.
8. M8 runs `fail_closed_validate` during record creation and again before bank
   writing. Missing provenance, invalid rank, unresolved collisions, missing or
   invalid fields, and invalid media fields add review reasons without deleting
   a slot.
9. M9 is covered by the combined standard-library test suite. The supervised
   replacement for the live 5000-record assertion is an end-to-end 50-record
   proof with the same engine and configurable bank dimensions.

## Offline proof

Generation command:

```text
PYTHONPATH=/home/shota/work/q4b_worktrees/t11-reserve/zukan_foundry:/home/shota/work/q4b_worktrees/t11-reserve /tmp/q4b_t11_venv/bin/python -m zukan_foundry.reserve --repository-root /home/shota/work/q4b_worktrees/t11-reserve --fixture /home/shota/work/q4b_worktrees/t11-reserve/zukan_foundry/tests/fixtures/t11_reserve_source.json --bank-count 2 --bank-size 25
```

First run: 50 records, 344 requested queries, 0 cached queries.

Second run: 50 records, 0 requested queries, 344 cached queries.

Final state counts: 21 `media_found`, 22 `no_hit`, 4 `rejected`, and 3
`needs_review`. The query cache contains 84 hits and 260 zero-result entries.

Environment and test commands:

```text
python3 -m venv /tmp/q4b_t11_venv
PYTHONPATH=/home/shota/work/q4b_worktrees/t11-reserve/zukan_foundry:/home/shota/work/q4b_worktrees/t11-reserve /tmp/q4b_t11_venv/bin/python -m unittest discover -s zukan_foundry/tests -p 'test_*.py' -v
```

No requirements file exists. The implementation and tests use only the Python
standard library. The combined result was 43 passed tests: 35 pre-existing
tests plus 8 T11 tests.

## Deferred live run

Population of the production 5000-candidate reserve is deferred because this
environment has no outbound network. The all-5000 completion criterion remains
the open human decision identified as `DECISIONS_PENDING` item 3. The engine can
run either a bounded partial bank proof or the default 5 by 1000 layout without
changing schema or entry points. A live run must provide source responses and an
authoritative Japanese-name verifier. It must not reuse the synthetic fixture as
production evidence.
