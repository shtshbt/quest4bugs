# Storage v2 shadow migration

## Goal

Replace the physical local persistence backend incrementally without changing the public `QuestSave` contract or risking the existing household save data.

The migration is deliberately asymmetric at first. `localStorage/q4b_store_v1` remains authoritative while IndexedDB receives a verified shadow copy. Read authority moves only after sustained equivalence tests pass.

## Non-goals for the shadow phase

- Do not change game behavior, progression, economy, breeding, komorebi, battle, or reward semantics.
- Do not remove GitHub Fieldnote sync yet.
- Do not implement commercial cloud backup, multi-device live sync, authentication, billing, or child accounts yet.

## Current baseline

`shared/storage.js` already provides a useful compatibility boundary:

- canonical logical store `{v, profiles, current, kv, tombstones}` in `q4b_store_v1`
- generation token `q4b_store_gen`
- `QuestSave` namespaced load/save API
- revision/CAS support for high-risk namespaces
- conflict backups
- GitHub whole-store snapshot sync
- export/import and restore
- persistent-storage request and degraded-save detection

This API is kept stable. The work below changes storage implementation behind that boundary.

## Hard acceptance conditions

1. `main` is never modified by storage-v2 work until an explicit merge decision.
2. Existing `q4b_store_v1` remains the sole read authority throughout Phase 1.
3. A failure, quota error, corruption, or absence of IndexedDB must never block or alter a successful legacy save.
4. Every successful authoritative persist can be represented byte-for-byte in the shadow store together with the corresponding generation token.
5. Shadow writes are asynchronous and coalesced so repeated answer saves do not stall gameplay.
6. Shadow records include schema/version metadata, generation, write timestamp, payload length, and checksum.
7. A diagnostic verifier can compare the current authoritative localStorage payload with the latest IndexedDB shadow and report match/mismatch without mutating either copy.
8. Existing `QuestSave` public methods retain signatures and semantics.
9. Existing Node regression tests remain green. Shadow-specific tests must cover unsupported IndexedDB, write failure isolation, coalescing, and comparison metadata where practical.
10. No automatic restore from IndexedDB is permitted in Phase 1.

## Branch strategy

- Active game/content development continues on `main`.
- This work lives on `agent/storage-v2-shadow`.
- Periodically merge `main` into this branch, not the reverse.
- Keep storage-v2 changes concentrated in a new module plus the smallest possible hooks in `shared/storage.js` to minimize merge conflicts with komorebi/content work.

## Phase 1A: shadow module only

Add `shared/storage_shadow.js`.

Responsibilities:

- IndexedDB database `q4b_shadow_v1`
- object store for the latest authoritative snapshot and diagnostic metadata
- asynchronous open/write/read/verify API
- write coalescing/debounce
- no dependency on game modules
- no reads used by gameplay
- no network access

Suggested record:

```js
{
  id: "authoritative",
  mirrorSchema: 1,
  sourceStoreKey: "q4b_store_v1",
  sourceGeneration: "...",
  writtenAt: 0,
  payload: "{...}",
  payloadBytes: 0,
  checksum: "..."
}
```

Initial checksum may be a deterministic non-cryptographic checksum for equality diagnostics. Before IndexedDB becomes authoritative, switch to SHA-256 where Web Crypto support permits it or otherwise retain both length and deterministic checksum.

## Phase 1B: minimal hook in `shared/storage.js`

Modify only the persistence boundary.

Current behavior conceptually:

```js
safeSet(STORE_KEY, JSON.stringify(mem));
safeSet(STORE_GEN_KEY, nextGeneration);
```

Target behavior:

```js
const serialized = JSON.stringify(mem);
const ok = safeSet(STORE_KEY, serialized);
// generation remains legacy-authoritative
if (ok) {
  // best effort only, never awaited by gameplay
  shadowQueue(serialized, memGeneration);
}
```

Important ordering:

1. serialize canonical memory state
2. write legacy `q4b_store_v1`
3. advance legacy generation
4. only after legacy success, enqueue shadow write
5. shadow failure emits diagnostics only

Do not mirror failed authoritative writes.

## Phase 1C: bootstrap/backfill

On application boot, after the legacy store has loaded and normalized, enqueue the current authoritative state once. This covers a page loaded before the shadow module is ready and ensures old household saves receive a mirror without requiring a gameplay write.

The shadow module must be lazy-loaded or included in a way that does not require editing every game page individually. Prefer a small loader hook from `shared/storage.js`, because that script is already the common persistence boundary.

## Phase 1D: diagnostics

Expose developer-only methods without changing normal UI:

- `QuestSave.shadowStatus()`
- `QuestSave.verifyShadow()`
- optional `QuestSave.shadowSnapshotMeta()`

Expected verifier result:

```js
{
  supported: true,
  exists: true,
  match: true,
  sourceGeneration: "...",
  shadowGeneration: "...",
  authoritativeBytes: 123456,
  shadowBytes: 123456,
  lastShadowWriteAt: 0,
  error: null
}
```

No automatic repair in this phase.

## Phase 1E: regression and soak

Required regression checks:

- all existing `tests/test_*.js` remain green
- profile create/edit/delete and current profile
- keisan, kanji, eitango save/load
- komorebi revision/CAS behavior
- breeding and wallet revisions
- bfcache/generation reload behavior
- export/import/restore
- GitHub Fieldnote push/pull behavior remains unchanged

Browser soak scenarios:

1. existing real profile loads with no migration prompt
2. play several subjects and komorebi, close/reopen, authoritative data unchanged
3. `verifyShadow()` reports equality after writes settle
4. force IndexedDB unavailable/failure, legacy storage still behaves exactly as before
5. clear only IndexedDB, reload, shadow backfills from localStorage
6. clear only localStorage during testing, confirm Phase 1 does **not** silently restore from shadow

The last condition is intentional. Restoration is introduced only after the shadow has been demonstrated reliable.

## Phase 2: dual-write with IndexedDB promoted to local authority

Do not begin until Phase 1 equivalence has been demonstrated on real household usage.

Planned transition:

- IndexedDB becomes the primary local store
- `q4b_store_v1` remains a legacy mirror for rollback
- reads fall back to legacy only when IndexedDB is unavailable/corrupt
- migration is idempotent and retains the original legacy blob
- explicit rollback/export path remains available

This phase requires a separate acceptance decision.

## Phase 3: commercial backup transport

Only after Phase 2 is stable:

- parent/family identity metadata in a small server-side database
- encrypted/versioned family snapshots in object storage
- local-first behavior preserved
- cloud initially provides backup/restore, not concurrent multi-device editing
- live multi-device sync remains a later, independent feature

Current candidate is Cloudflare R2 for versioned snapshots plus D1 for backup metadata. Provider choice is intentionally not hard-coded into Phase 1 or Phase 2.

## Compatibility policy

- Existing household data must migrate forward automatically and idempotently.
- Existing export format remains readable.
- Commercial and household builds should share the same logical save schema and `QuestSave` API.
- Backend differences should be configuration/adapter differences, not separate game-data models.
- Permanent bidirectional compatibility with arbitrarily old builds is not required. Forward migration and explicit backup/export are required.

## Rollback policy

During Phase 1, rollback is trivial because localStorage remains authoritative. Remove/disable the shadow hook and delete the shadow module. No data conversion is required.

During Phase 2, retain `q4b_store_v1` unchanged until a defined soak period has passed. If a regression is found, switch read authority back to legacy localStorage and export the IndexedDB copy for diagnosis rather than overwriting either copy.
