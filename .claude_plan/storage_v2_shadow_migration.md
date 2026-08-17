# Quest4Bugs Storage v2 migration — implementation roadmap and progress log

> **This file is both the design specification and the authoritative progress tracker for the storage-v2 work.**
>
> Any future storage-v2 session should read this file first, update the progress table before/after work, and record important decisions here. Do not rely on chat history to reconstruct the plan.

Last updated: 2026-08-17
Active branch: `agent/storage-v2-shadow`
Baseline branch: `main`
Branch point / last verified main SHA at project start: `6d6ddcaa6e3feec9ef19eb6c164a1c6355c406cf`

---

## 0. Executive summary

The goal is to replace Quest4Bugs' physical persistence backend incrementally **without changing the public `QuestSave` contract and without risking the existing household save data**.

The migration is deliberately asymmetric:

1. `localStorage/q4b_store_v1` remains authoritative while IndexedDB receives a shadow copy.
2. After sustained equivalence testing, IndexedDB becomes the local authority while legacy localStorage remains a rollback mirror.
3. After local persistence is stable, add **Cloudflare R2 + D1** as durable off-device backup infrastructure.
4. Commercial features (parent identity, entitlement, restore UI) are layered on top.
5. Live multi-device synchronization is explicitly deferred until after backup/restore is proven.

Content development, including incremental Komorebi releases, continues independently on `main`. Storage work must not wait for Komorebi completion. The coupling boundary is `QuestSave`.

---

## 1. Progress dashboard

Legend: `NOT STARTED` / `IN PROGRESS` / `READY FOR SOAK` / `BLOCKED` / `DONE`

| Phase | Scope | Status | Current result | Next gate |
|---|---|---|---|---|
| 0 | Architecture / branch isolation | **DONE** | Dedicated branch created; main untouched | keep branch rebased/merged from main periodically |
| 1A | Standalone IndexedDB shadow module | **DONE** | module + failure/coalescing tests; CI green | maintain under soak CI |
| 1B | Shadow write hook from `storage.js` | **READY FOR SOAK** | best-effort post-legacy-success shadow write integrated on migration branch | real-browser equality soak |
| 1C | Boot backfill | **READY FOR SOAK** | existing `q4b_store_v1` is mirrored after boot; no reverse restore | browser wipe/backfill test |
| 1D | Developer diagnostics | **READY FOR SOAK** | `shadowStatus()`, `verifyShadow()`, `shadowSnapshotMeta()` exposed | use during household soak |
| 1E | Automated regression + soak | **IN PROGRESS** | Node regressions + public contract + real Chromium IndexedDB smoke green; sustained household soak remains | sustained household verification |
| 2A | IndexedDB becomes local read authority | **IN PROGRESS** | authority candidate, WAL reconciliation, cryptographic integrity checks, and crash-safe read-switch scaffold implemented; hard gate remains OFF | automatic readiness must pass (>=300 verified commits across >=3 active days), then explicit activation decision |
| 2B | localStorage rollback mirror | **IN PROGRESS** | localStorage is currently authority/WAL; future IDB→cache restore is transaction-marker protected with rollback-on-partial-write | exercise under sustained rehearsal before authority activation |
| 2C | migration/rollback hardening | **IN PROGRESS** | stale/divergent generation rejection, SHA/checksum/byte validation, corrupt-IDB repair rules, rollback records, partial-restore recovery all automated/tested | household soak + final promotion gate |
| 3A | Cloudflare project/bootstrap | **NOT STARTED** | provider selected conceptually | only after Phase 2 local stability |
| 3B | R2 versioned family snapshots | **NOT STARTED** | no network dependency in storage-v2 yet | upload/download with integrity metadata |
| 3C | D1 backup metadata | **NOT STARTED** | none | family/snapshot index + restore metadata |
| 3D | retention + recovery policy | **NOT STARTED** | conceptual only | daily/weekly/versioned policy + restore drills |
| 4A | Parent account / family identity | **NOT STARTED** | none | after durable cloud backup exists |
| 4B | Commercial entitlement | **NOT STARTED** | none | billing integration later |
| 4C | Parent-facing restore UX | **NOT STARTED** | none | restore without developer intervention |
| 5 | Optional live multi-device sync | **DEFERRED** | not required for commercial v1 | separate future design decision |

### Work completed so far

- [x] Created `agent/storage-v2-shadow` from `main`.
- [x] Kept `main` unchanged.
- [x] Added this migration specification.
- [x] Added standalone `shared/storage_shadow.js`.
- [x] Added `tests/test_storage_shadow.js`.
- [x] Shadow module is non-authoritative and has no gameplay read path.
- [x] Shadow record includes generation, payload size, timestamp, and deterministic checksum.
- [x] Add branch-specific CI; now running in Phase 1 soak mode.
- [x] Freeze/test the `QuestSave` public contract.
- [x] Wire successful `persist()` to shadow queue after authoritative legacy success.
- [x] Add boot backfill (legacy → shadow only).
- [x] Expose developer-only verification through `QuestSave`.
- [x] Real Chromium IndexedDB smoke: legacy→shadow backfill, no reverse restore, and Phase 2 candidate reconciliation.
- [x] Phase 2 authority candidate is integrated as a non-authoritative second shadow.
- [x] Disabled read-authority switch scaffold is integrated; hard gate is explicitly `false`.
- [x] Authority records are validated by schema, byte length, checksum, and SHA-256 before any future restore.
- [x] Partial authority→cache restore is transaction-marker protected and rolls back on failure/next boot.
- [x] Automatic sustained-soak metrics/readiness report is integrated; no automatic promotion is permitted.
- [ ] Perform sustained household soak before changing read authority.

### Maintenance rule for this table

After every meaningful storage-v2 change:

1. update phase status;
2. add completed checkbox(es);
3. record test/CI result and relevant commit SHA in the log at the bottom;
4. record current `main` SHA if main has been merged into this branch;
5. never mark a phase `DONE` merely because code exists — its exit criteria must pass.

---

## 2. Current architecture baseline

`shared/storage.js` already provides a strong compatibility boundary:

- canonical logical store `{v, profiles, current, kv, tombstones}` in `q4b_store_v1`;
- generation token `q4b_store_gen`;
- `QuestSave` namespaced load/save API;
- revision/CAS support for high-risk namespaces;
- conflict backups;
- GitHub whole-store snapshot sync;
- export/import and force-restore;
- persistent-storage request;
- degraded-save detection;
- multi-tab/bfcache generation invalidation.

This existing logical model is an asset. **Do not redesign game data and storage transport at the same time.**

The principal migration target is the *physical persistence backend*, not the logical save schema.

---

## 3. Non-negotiable invariants

1. `main` is never modified by storage-v2 work until an explicit merge decision.
2. Existing household data must not require a destructive conversion.
3. Existing `QuestSave` public method signatures and semantics stay stable throughout Phase 1.
4. `q4b_store_v1` remains the sole gameplay read authority throughout Phase 1.
5. IndexedDB failure, quota failure, corruption, blocked upgrade, or browser lack of support must never turn a successful legacy save into a failed save during Phase 1.
6. No automatic restore from IndexedDB during Phase 1.
7. Every migration is forward-only, idempotent, and preserves an older recovery copy until a defined soak period has passed.
8. Export/import remains a provider-independent escape hatch.
9. New Komorebi/content features must store persistent state through `QuestSave`; no new direct game-specific `localStorage.setItem(...)` persistence is allowed.
10. Cloud backup is initially **backup/restore**, not concurrent multi-device editing.
11. A cloud-provider outage must not prevent local gameplay.
12. Commercial and household builds share one logical save schema. They may differ in transport/configuration only.

---

## 4. Branch and content-development strategy

### Branches

- `main`: active household/content build; Komorebi and other game work continues normally.
- `agent/storage-v2-shadow`: storage migration branch.

### Integration direction

During development:

```text
main  ────────────────→ continues content releases
   \                    \
    \ merge periodically \
     v                    v
agent/storage-v2-shadow ──→ storage migration work
```

Merge **main into the storage branch**, not storage into main, until an explicit integration decision.

### Why Komorebi does not block this project

Storage does not care whether Komorebi has 10 or 100 content releases if all persistent state goes through the stable `QuestSave` boundary. New content may add fields/namespaces, but storage transport remains generic.

Therefore:

- do **not** wait months for Komorebi to be “finished”;
- periodically merge new `main` into this branch;
- if a new persistent state field appears, add it through the logical schema/API rather than bypassing `QuestSave`;
- run storage regression tests after each substantial main→storage merge.

---

# PHASE 1 — Shadow IndexedDB while localStorage remains authoritative

## Phase 1A — Standalone shadow module

**Status: DONE — standalone tests and branch CI green**

File: `shared/storage_shadow.js`

Responsibilities:

- IndexedDB database `q4b_shadow_v1`;
- object store for latest authoritative snapshot and metadata;
- async open/write/read/verify API;
- write debounce/coalescing;
- no game-module dependency;
- no gameplay reads;
- no network access;
- errors contained inside shadow subsystem.

Record shape:

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

Current checksum is an equality diagnostic, not a cryptographic integrity guarantee. Before IndexedDB becomes authoritative, add SHA-256 where Web Crypto is available and retain deterministic checksum/byte length for diagnostics.

### Phase 1A exit criteria

- [x] shadow module exists independently;
- [x] unsupported IndexedDB is detectable;
- [x] payload metadata is deterministic;
- [x] shadow read cannot affect gameplay;
- [x] write failures remain local to module;
- [x] branch CI executes the shadow tests successfully.

---

## Phase 1B — Minimal persistence hook

**Status: READY FOR SOAK — integrated on `agent/storage-v2-shadow`**

Modify only the persistence boundary in `shared/storage.js`.

Current conceptual behavior:

```js
const serialized = JSON.stringify(mem);
safeSet(STORE_KEY, serialized);
safeSet(STORE_GEN_KEY, nextGeneration);
```

Target Phase-1 behavior:

```js
const serialized = JSON.stringify(mem);
const ok = safeSet(STORE_KEY, serialized);

if (ok) {
  // legacy generation remains authoritative
  safeSet(STORE_GEN_KEY, nextGeneration);

  // best effort only; never awaited by gameplay
  shadowQueue(serialized, currentGeneration);
}
```

### Required ordering

1. serialize canonical state once;
2. write `q4b_store_v1`;
3. advance legacy generation;
4. only after legacy success, enqueue shadow write;
5. never await IndexedDB before returning legacy success;
6. shadow failure produces diagnostics only;
7. do not mirror a failed authoritative write.

### Loading the shadow module

Do not edit every game page. `shared/storage.js` is already the common persistence boundary, so it should lazily load `shared/storage_shadow.js` or otherwise initialize it centrally.

Requirements for loader:

- failure to load is silent for gameplay but visible in developer diagnostics;
- no duplicate script loads;
- compatible with root/subdirectory page URLs;
- does not disturb Node test harnesses where no browser IndexedDB exists.

### Phase 1B exit criteria

- [x] all legacy save tests unchanged/green;
- [x] `persist()` return behavior unchanged in automated regression/integration tests;
- [x] IndexedDB blocked/unavailable does not alter legacy save result in failure-isolation tests;
- [x] rapid repeated saves coalesce shadow writes;
- [x] generation written to shadow corresponds to the successfully persisted legacy generation in integration tests.

---

## Phase 1C — Boot backfill

**Status: READY FOR SOAK — integrated, reverse restore intentionally absent**

Once the legacy store is loaded and normalized, enqueue one authoritative snapshot into shadow storage.

Purpose:

- users with years/months of existing legacy state get a shadow without needing a new gameplay action;
- clearing only IndexedDB is self-healed by a later boot;
- no migration prompt is needed.

Important: this is **backfill only**, never restore.

### Phase 1C exit criteria

- [x] old localStorage-only fixture produces shadow after boot in integration test;
- [x] no user-visible prompt is introduced by the backfill path;
- [ ] no mutation of legacy payload beyond existing normalization rules;
- [ ] deleting IndexedDB and rebooting recreates the mirror;
- [x] code/CI authority guard confirms there is no IndexedDB → legacy automatic restore path in Phase 1; browser-level destructive test still belongs to soak.

---

## Phase 1D — Developer diagnostics

**Status: READY FOR SOAK — integrated and covered by regression tests**

Expose developer-only methods via `QuestSave`:

- `QuestSave.shadowStatus()`
- `QuestSave.verifyShadow()`
- `QuestSave.shadowSnapshotMeta()` (optional but recommended)

Expected verifier result:

```js
{
  supported: true,
  exists: true,
  match: true,
  generationMatch: true,
  sourceGeneration: "...",
  shadowGeneration: "...",
  authoritativeBytes: 123456,
  shadowBytes: 123456,
  authoritativeChecksum: "...",
  shadowChecksum: "...",
  lastShadowWriteAt: 0,
  error: null
}
```

No normal child UI should expose this during Phase 1.

### Phase 1D exit criteria

- [x] `QuestSave.verifyShadow()` can prove current shadow equality;
- [x] mismatch is diagnostic-only;
- [x] diagnostics never mutate either copy by design/test;
- [x] unsupported/failing IndexedDB produces structured diagnostics rather than an uncaught exception.

---

## Phase 1E — Regression CI and real-use soak

**Status: IN PROGRESS — automated portion green; real-browser/household soak remains**

### Automated regression

Add branch-specific GitHub Actions workflow for `agent/storage-v2-shadow`.

Minimum checks:

- run all `tests/test_*.js` that are self-contained Node tests;
- run `tests/test_storage_shadow.js`;
- add a dedicated public-contract test for `QuestSave`;
- verify no accidental direct replacement of legacy authority occurs during Phase 1.

### Required functional checks

- profile create/edit/delete/current profile;
- keisan / kanji / eitango save/load;
- Komorebi revision/CAS behavior;
- breeding and wallet revisions;
- generation-token reload behavior;
- export/import/restore;
- GitHub Fieldnote behavior remains unchanged;
- shadow write does not change return timing/semantics.

### Browser soak scenarios

1. existing real profile loads normally;
2. play several subjects and Komorebi, close/reopen, legacy data unchanged;
3. `verifyShadow()` reports equality after writes settle;
4. force IndexedDB unavailable/failure: legacy still works;
5. clear only IndexedDB: reload backfills it;
6. clear only localStorage: Phase 1 does **not** silently restore from shadow;
7. multiple tabs / bfcache continue to respect the generation logic;
8. import/restore updates the mirror after the authoritative legacy update.

### Soak duration criterion

Do not promote IndexedDB merely after one successful test. A useful minimum is:

- repeated normal household usage across multiple days;
- at least several hundred ordinary save events across different namespaces;
- no unexplained checksum mismatch;
- all mismatches, if any, understood and reproducible before proceeding.

This criterion is intentionally event/behavior based rather than tied to Komorebi completion.

### Phase 1 exit gate

Phase 2 may begin only when all are true:

- [x] branch CI green;
- [x] public `QuestSave` contract test green;
- [x] automated failure-isolation test confirms shadow failure does not affect legacy persistence;
- [ ] real-browser shadow equality observed during sustained use;
- [ ] IndexedDB wipe/backfill scenario verified;
- [ ] legacy wipe does not trigger unauthorized restore;
- [x] rollback is still simply “disable shadow hook”; localStorage remains sole authority.

---

# PHASE 2 — Promote IndexedDB to local authority

## Phase 2 compatibility decision — IndexedDB authority + localStorage WAL/cache

**Status: IMPLEMENTED THROUGH DISABLED READ-SWITCH SCAFFOLD; NOT YET GAMEPLAY AUTHORITY**

A pure localStorage→IndexedDB replacement is not compatible with the current QuestSave surface because IndexedDB is asynchronous while several existing callers depend on synchronous in-memory/local persistence semantics. The promotion architecture therefore uses:

```text
synchronous QuestSave mutation
        |
        v
localStorage q4b_store_v1 + q4b_store_gen   <- WAL / boot cache / rollback path
        | exact successful generation
        v
IndexedDB q4b_local_v2                       <- durable candidate authority
```

Boot reconciliation rules are deterministic:

1. no IDB authority + valid legacy WAL → seed IDB from legacy;
2. legacy generation newer than IDB → replay WAL into IDB;
3. IDB generation newer than legacy → return a cache-restore plan, but do not apply it during Phase 1 rehearsal;
4. same generation + same payload → matched;
5. same generation + different payload → stop as conflict; never guess;
6. every authority replacement preserves the previous authority record as an IndexedDB rollback record;
7. SHA-256 plus deterministic checksum/byte length are recorded for integrity diagnostics.

During rehearsal, storage.js only queues successful legacy generations into the candidate IDB through a serialized/coalescing queue. Candidate records are never read into gameplay state.


## Phase 2A — Read authority switch

**Status: NOT STARTED; prohibited until Phase 1 exit gate passes**

Target local architecture:

```text
QuestSave
   |
   v
IndexedDB  ← local authority
   |
   +------→ q4b_store_v1 legacy rollback mirror
```

### Requirements

- IndexedDB read is the normal path;
- legacy localStorage remains untouched as recovery copy during initial soak;
- if IndexedDB is missing on first migration, import from legacy exactly once/idempotently;
- migration record stores source generation/checksum;
- bad/malformed IndexedDB must not overwrite a valid legacy copy;
- explicit fallback decision is logged diagnostically.

## Phase 2B — Dual-write rollback mirror

After promotion, every successful IndexedDB transaction should emit/update a compatible legacy mirror for a defined rollback period.

Do not treat the mirror as live multi-master storage. It is a rollback artifact.

## Phase 2C — Schema versioning and migration discipline

Introduce explicit local persistence schema metadata, independent of game-content fields.

Every migration must:

1. identify source schema version;
2. create pre-migration recovery snapshot;
3. transform idempotently;
4. validate structural invariants;
5. commit transactionally;
6. record migration completion;
7. keep old recovery copy until soak passes.

Add SHA-256 integrity where supported before IndexedDB is considered authoritative.

### Phase 2 exit gate

- [ ] IndexedDB authoritative reads/writes stable;
- [ ] legacy import works from representative old fixtures;
- [ ] rollback to localStorage mirror is tested;
- [ ] schema migration failure leaves a recoverable source copy;
- [ ] export/import still works independent of backend;
- [ ] normal gameplay remains offline-first.

---

# PHASE 3 — Cloudflare durable backup

## Provider decision

**Planned default provider: Cloudflare.**

- **R2**: versioned encrypted/compressed family snapshot objects.
- **D1**: small relational metadata/index only.
- Worker/API layer: authenticated upload/list/restore operations and access control.

Do not introduce Cloudflare code into Phase 1/2. The local system must be complete and provider-independent first.

## Phase 3A — Cloudflare bootstrap

Create isolated infrastructure/configuration for commercial backup.

No child gameplay data should be required in D1 beyond opaque family/profile identifiers necessary for backup lookup.

Suggested D1 metadata fields:

```text
family_id
snapshot_id
object_key
schema_version
created_at
payload_bytes
sha256
source_device_id
app_version
backup_kind       # current/daily/weekly/pre-migration/manual
restore_status    # optional audit field
```

Account/payment identity belongs to a separate concern even if technically stored in the same service later.

## Phase 3B — R2 snapshot objects

Cloud upload unit should be an immutable/versioned family snapshot, not hundreds of tiny per-answer objects.

Conceptual object key:

```text
families/<opaque-family-id>/snapshots/<timestamp>-<snapshot-id>.json.gz.enc
```

Properties:

- compressed;
- integrity hash stored independently in D1;
- ideally application-layer encrypted before R2 if threat model requires it;
- immutable snapshot IDs;
- “latest” is metadata, not destructive overwrite of the only object;
- upload failure never blocks local gameplay.

## Phase 3C — Backup scheduling

Initial commercial v1 should prioritize recovery over live sync.

Suggested policy subject to later tuning:

- debounce normal changes locally;
- upload after meaningful session/end-of-session or bounded interval;
- keep recent daily versions;
- keep lower-frequency weekly versions longer;
- always keep explicit pre-migration snapshots;
- allow manual backup trigger from parent/admin context.

Do not upload every answer event individually.

## Phase 3D — Restore semantics

Restore must be explicit and safe:

1. authenticate parent/family;
2. list valid snapshots;
3. download selected/latest snapshot;
4. validate size/hash/schema;
5. create pre-restore local snapshot;
6. restore into IndexedDB transactionally;
7. verify post-restore hash/logical invariants;
8. only then mark restore successful;
9. preserve previous copy for rollback.

No silent server-to-device overwrite in commercial v1.

## Cloud outage behavior

If Cloudflare is unavailable:

- gameplay continues from IndexedDB;
- backup state becomes “pending/offline”;
- local export remains available;
- upload retries later;
- the UI must never falsely label an unuploaded snapshot as cloud-backed-up.

### Phase 3 exit gate

- [ ] device loss can be recovered on a fresh browser/device;
- [ ] corrupt/truncated cloud snapshot rejected before restore;
- [ ] previous version restore works;
- [ ] cloud outage does not block local saves;
- [ ] retention policy prevents unbounded object growth;
- [ ] server credentials/secrets never ship to client;
- [ ] backup access is scoped to correct family.

---

# PHASE 4 — Commercial storage/account layer

## Phase 4A — Parent/family identity

Commercial server-side identity should be parent/family centric. Avoid collecting unnecessary child PII.

Server-side minimum may include:

- parent account identifier/email;
- family ID;
- subscription entitlement;
- backup ownership/access metadata.

Child gameplay profile can remain opaque/local-first unless there is a demonstrated product need for more.

## Phase 4B — Entitlement

Billing/subscription does not become the storage authority. Loss of entitlement must never destroy data.

A lapsed subscription may disable premium functionality/cloud backup according to product policy, but local export/recovery policy must be explicit.

## Phase 4C — Parent restore UX

Parent should be able to recover without developer intervention:

- latest backup date/status;
- device-local vs cloud-backed-up distinction;
- restore latest;
- optionally choose older recovery point;
- export backup;
- destructive restore requires clear confirmation and automatic pre-restore snapshot.

### Phase 4 exit gate

- [ ] commercial user can understand whether data is local-only or cloud-backed-up;
- [ ] fresh-device recovery is self-service;
- [ ] subscription logic cannot accidentally delete family learning data;
- [ ] privacy/retention/deletion policy matches implementation.

---

# PHASE 5 — Optional multi-device live synchronization

**Status: DEFERRED. Not needed for commercial v1.**

This is a separate distributed-data problem and must not be conflated with backup.

Only design this if real users demand simultaneous use across multiple devices.

Potential issues requiring a new design:

- concurrent collection/reward mutations;
- revision/CAS across server and clients;
- conflict resolution policy;
- offline edits from multiple devices;
- tombstones;
- event IDs/idempotency;
- clock independence;
- user-facing conflict recovery.

Until then, supported semantics can be:

> One active local authority per device; cloud preserves recoverable snapshots. Moving to another device is restore/migration, not live multi-master sync.

---

## 5. `QuestSave` compatibility contract

The following API boundary is considered part of the migration compatibility surface and should be regression-tested before changing storage authority:

### Core namespaced persistence

- `load`
- `save`
- `loadVersioned`
- `saveVersioned`
- `isCASNamespace`

### Profiles

- `profiles`
- `saveProfiles`
- `currentProfile`
- `setCurrentProfile`
- `addProfile`
- `updateProfile`
- `deleteProfile`

### Shared progression/economy that relies on persistence

- wallet/amber functions;
- goshin/reward functions;
- breeding functions;
- equipment functions;
- chameleon functions.

### Backup/sync compatibility

- `exportAll`
- `importAll`
- `pushAll`
- `pullAll`
- `syncDown`
- current GitHub configuration functions during household transition.

### Legacy compatibility

- `loadKey`
- `saveKey`

The exact public method list should be captured by an automated contract test so accidental removal is caught by CI.

---

## 6. Data-format compatibility policy

- Existing household data migrates forward automatically and idempotently.
- Existing export format remains readable.
- Commercial and household builds share the same logical save schema and `QuestSave` API.
- Backend differences are adapter/configuration differences, not separate game-data models.
- Permanent bidirectional compatibility with arbitrarily old builds is not required.
- Forward migration + explicit export + defined rollback window are required.
- New fields should generally be additive and old readers should fail conservatively rather than erase unknown state.

---

## 7. Rollback policy

### Phase 1

Rollback is trivial: localStorage is still authoritative. Disable/remove shadow hook. Do not copy IndexedDB back automatically.

### Phase 2

Keep the old `q4b_store_v1` source/mirror until the defined soak period is complete. If regression occurs, switch read authority back to legacy and export the IndexedDB copy for diagnosis rather than overwriting either side.

### Phase 3+

Cloud restore is never the only copy. A restore operation must generate a pre-restore local recovery snapshot and verify the cloud snapshot before replacing current local authority.

---

## 8. Immediate recommended work queue

These tasks are safe to do now without waiting for Komorebi completion:

1. **Add branch-specific CI.**
   - run storage shadow tests;
   - run existing Node regression suite;
   - no deployment from storage branch.
2. **Add `QuestSave` public-contract regression test.**
   - prevents content work from accidentally bypassing/removing the compatibility boundary.
3. **Strengthen standalone shadow tests.**
   - unsupported IndexedDB;
   - open/write failure isolation;
   - coalescing;
   - equality/mismatch diagnostics.
4. **Implement Phase 1B minimal hook.**
   - only after tests/CI exist;
   - localStorage remains authoritative.
5. **Implement Phase 1C boot backfill + Phase 1D diagnostics.**
6. **Merge latest `main` into storage branch whenever a material Komorebi persistence change lands.**
7. **Begin household soak.**
   - actual normal usage becomes migration testing time rather than dead waiting time.

Items intentionally **not** started now:

- IndexedDB read authority;
- Cloudflare credentials/infrastructure;
- account/auth;
- billing;
- automatic cloud restore;
- live sync.

---

## 9. Decision log

### 2026-08-17 — Branch rather than repository fork

Decision: keep one repository and use `agent/storage-v2-shadow` rather than copying/forking the entire Quest4Bugs codebase.

Reason: active Komorebi/content work will continue for months. A separate codebase would diverge rapidly. A branch lets main content changes be merged into the storage migration while keeping production untouched.

### 2026-08-17 — Do not wait for Komorebi completion

Decision: storage migration proceeds in parallel with incremental Komorebi releases.

Reason: persistence backend is generic behind `QuestSave`. Months of real household usage are valuable soak time for shadow equivalence.

### 2026-08-17 — Shadow before authority switch

Decision: localStorage remains sole read authority throughout Phase 1; IndexedDB cannot auto-restore.

Reason: it makes the initial migration observational and reversible. IndexedDB can fail without risking current household state.

### 2026-08-17 — Cloudflare architecture

Decision: planned commercial backup platform is **Cloudflare R2 + D1**, with a Worker/API layer. R2 stores immutable/versioned snapshot objects; D1 stores small lookup/integrity metadata.

Reason: Q4B storage volume is small, object snapshots match the backup model, and local-first operation minimizes server complexity/cost. Cloudflare is intentionally deferred until local IndexedDB authority is stable.

### 2026-08-17 — Backup before live synchronization

Decision: commercial v1 provides durable backup/restore, not general concurrent multi-device synchronization.

Reason: live synchronization introduces conflict-resolution complexity that is unnecessary to solve the primary data-loss risk.

---

## 10. Implementation / verification log

### 2026-08-17 — Initial Phase 1A scaffold

Branch: `agent/storage-v2-shadow`

Added:

- `.claude_plan/storage_v2_shadow_migration.md`
- `shared/storage_shadow.js`
- `tests/test_storage_shadow.js`

At this point `shared/storage.js` was deliberately untouched, so branch behavior remained identical to `main` unless the standalone shadow module was manually loaded.

Branch comparison immediately after scaffold: 3 commits ahead of `main`, 0 behind; only the three files above were added.

### 2026-08-17 — Roadmap converted to progress tracker

This document expanded to cover Phase 0–5, Cloudflare R2/D1 architecture, Komorebi parallel-development rules, phase exit criteria, immediate work queue, decision log, and progress dashboard.

Next recommended implementation step: real-browser/household Phase 1 soak using `QuestSave.verifyShadow()`, while continuing Komorebi work on `main`. Do not start Phase 2 authority promotion until soak exit criteria pass.


### 2026-08-17 — Phase 1B/1C/1D promoted to migration branch

- Branch CI and QuestSave contract regression were established and green.
- The deterministic integration preview was tested repeatedly against the full Node regression suite before promotion.
- The guarded shallow-checkout promotion workflow re-applied the exact patch, ran diff validation and the full regression suite, then committed the tested `shared/storage.js` to `agent/storage-v2-shadow`.
- `shared/storage.js` now queues a best-effort IndexedDB shadow only after successful legacy persistence, performs boot backfill from legacy to shadow, and exposes read-only shadow diagnostics.
- `localStorage/q4b_store_v1` remains the sole gameplay authority. There is no IndexedDB-to-legacy automatic restore path in Phase 1.
- CI was then switched from integration-preview mode to Phase 1 soak mode, where every branch push verifies the authority invariant and runs the full Node regression suite.
- Remaining Phase 1 gate: real-browser/household soak and destructive browser scenarios (IndexedDB wipe/backfill, sustained checksum equality).


### 2026-08-17 — Phase 2 authority candidate rehearsal

- Added shared/storage_authority.js with validated canonical snapshots, generation ordering, SHA-256, rollback record preservation, and deterministic WAL reconciliation.
- Added Node tests covering seed, normal commit, stale rejection, same-generation divergence, rollback, WAL replay, authority-newer restore planning, and IndexedDB failure containment.
- Added real Chromium tests for Phase 1 backfill/no-reverse-restore and the Phase 2 candidate using the browser's actual IndexedDB implementation.
- Added deterministic rehearsal wiring: successful legacy saves are coalesced and copied to q4b_local_v2, but candidate data never feeds gameplay during Phase 1.
- Remaining hard gate for actual read-authority switch: sustained household rehearsal with no unexplained generation/checksum divergence.


### 2026-08-17 — Disabled read-authority switch + automatic soak gate
- Promoted the complete authority→local-cache bootstrap path into the migration branch with `__authorityReadsEnabled=false`; normal behavior therefore remains rehearsal-only.
- Future restore is accepted only from a structurally valid, checksum/byte-valid and SHA-256-verified IndexedDB authority record.
- Authority/local generation ordering is deterministic; same-generation divergence stops rather than guessing. Corrupt authority can be repaired only from an equal/newer valid WAL, with the raw corrupt record preserved as rollback evidence.
- Cache restore uses `q4b_storage_v2_restore_txn_v1` so a failure/crash between payload and generation writes is rolled back before normal store load on the next boot.
- Added `q4b_storage_v2_soak_stats_v1`, `QuestSave.storageV2SoakStats()` and `QuestSave.storageV2Readiness()`. No child/game payload is copied into the soak statistics record.
- Current automatic readiness policy: current shadow match, current candidate match with cryptographic verification, zero candidate/verification failures, >=300 verified candidate commits, >=3 active days, no restore-recovery failure, and hard gate still OFF. Readiness is advisory only (`automaticPromotion:false`).
- The remaining non-automatable gate is sustained normal household use on the migration branch. Do not flip the hard gate merely because unit/browser tests are green.
