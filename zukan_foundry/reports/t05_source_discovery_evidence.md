# T05 source discovery evidence

## Execution mode

This worktree was executed in local supervised offline mode. No outbound request was attempted. Live S4 execution against GBIF and the Natural History Museum Data Portal is deferred because outbound network access is unavailable in this sandbox.

The HTTP transport is implemented behind the same adapter interface used by committed fixture tests. GBIF is limited to one request every 2 seconds or slower. NHM is limited to fewer than 5 requests per second and receives a User-Agent header.

## Offline evidence

- Contract authority: `contracts/media_pipeline/`
- Candidate source: `zukan_foundry/tests/fixtures/fixture_candidates.json`
- Catalog source: `shared/bugs.js` at commit `5ae22a4819e949aed8c0b352a748f2763cb926e8`
- Catalog records indexed: 1,213
- Selected candidates: 3
- Fixture-only taxonomy, dedupe, query, search run, negative cache, and media candidate records are generated under ignored `zukan_foundry/data/`
- The second identical discovery pass made no additional fixture transport calls
- The staging contract is exercised only with an explicit fixture-owned content hash; no offline runner record uses status `built`
- No image bytes were downloaded or stored

## Deferred work

The one-time live taxonomy and two-source discovery run required by the cloud form of Must 5 and Must 8 was not executed. Network-produced evidence must be collected later in an S4-enabled environment using the implemented adapters.
