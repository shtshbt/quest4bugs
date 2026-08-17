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
| 1B | Shadow write hook from `storage.js` | **READY FOR SOAK** | best-effort post-legacy-success shadow write integrated on migration branch | sustained household equality soak |
| 1C | Boot backfill | **READY FOR SOAK** | existing `q4b_store_v1` is mirrored after boot; no reverse restore while hard gate is OFF | sustained household verification |
| 1D | Developer diagnostics | **READY FOR SOAK** | shadow/candidate/promotion/readiness diagnostics exposed | use during household soak |
| 1E | Automated regression + soak | **IN PROGRESS** | Node regressions + public contract + real Chromium IndexedDB smoke green; sustained household soak remains | sustained household verification |
| 2A | IndexedDB becomes local read authority | **IN PROGRESS** | authority candidate, WAL reconciliation, cryptographic integrity checks, and crash-safe read-switch scaffold implemented; hard gate remains OFF | readiness must pass (>=300 verified commits across >=3 active days), then explicit activation decision |
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
- [x] Added permanent branch CI covering Phase 1/2 storage regressions and real-browser smoke.
- [x] Freeze/test the `QuestSave` public contract.
- [x] Wire successful `persist()` to shadow queue after authoritative legacy success.
- [x] Add boot backfill (legacy → shadow only while hard gate is OFF).
- [x] Expose developer-only verification through `QuestSave`.
- [x] Real Chromium IndexedDB smoke: legacy→shadow backfill, no reverse restore, Phase 2 candidate reconciliation, and enabled-copy authority restore.
- [x] Phase 2 authority candidate is integrated as a non-authoritative second shadow.
- [x] Disabled read-authority switch scaffold is integrated; hard gate is explicitly `false`.
- [x] Authority records are validated by schema, byte length, checksum, and SHA-256 before any future restore.
- [x] Partial authority→cache restore is transaction-marker protected and rolls back on failure/next boot.
- [x] Automatic sustained-soak metrics/readiness report is integrated; no automatic promotion is permitted.
- [x] One-shot promotion/progress workflows were removed after use; permanent CI remains.
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
4. `q4b_store_v1` remains the sole gameplay read authority throughout Phase 1/rehearsal.
5. IndexedDB failure, quota failure, corruption, blocked upgrade, or browser lack of support must never turn a successful legacy save into a failed save during rehearsal.
6. No automatic restore from IndexedDB while the read-authority hard gate is disabled.
7. Every migration is forward-only, idempotent, and preserves an older recovery copy until a defined soak period has passed.
8. Export/import remains a provider-independent escape hatch.
9. New Komorebi/content features must store persistent state through `QuestSave`; no new direct game-specific `localStorage.setItem(...)` persistence is allowed.
10. Cloud backup is initially **backup/restore**, not concurrent multi-device editing.
11. A cloud-provider outage must not prevent local gameplay.
12. Commercial and household builds share one logical save schema. They may differ in transport/configuration only.
13. `storageV2Readiness().eligible === true` never flips the read-authority gate automatically.

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

The Phase 1 checksum is an equality diagnostic, not a cryptographic guarantee. The Phase 2 authority candidate adds SHA-256 and refuses future authority→cache restore without cryptographic verification.

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

The persistence boundary remains legacy-first:

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

In the current rehearsal branch, the same successful payload/generation is also queued to the Phase 2 candidate through a serialized/coalescing queue.

### Required ordering

1. serialize canonical state once;
2. write `q4b_store_v1`;
3. advance legacy generation;
4. only after legacy success, enqueue shadow/candidate write;
5. never await IndexedDB before returning legacy success;
6. IndexedDB failure produces diagnostics only;
7. do not mirror a failed authoritative write.

### Loading the IndexedDB modules

Do not edit every game page. `shared/storage.js` is the common persistence boundary and lazy-loads the migration modules centrally.

Requirements:

- failure to load is silent for gameplay but visible in developer diagnostics;
- no duplicate script loads;
- compatible with root/subdirectory page URLs;
- does not disturb Node test harnesses where no browser IndexedDB exists.

### Phase 1B exit criteria

- [x] all legacy save tests unchanged/green;
- [x] `persist()` return behavior unchanged in automated regression/integration tests;
- [x] IndexedDB blocked/unavailable does not alter legacy save result in failure-isolation tests;
- [x] rapid repeated saves coalesce shadow/candidate writes;
- [x] generation written to candidate corresponds to the successfully persisted legacy generation in integration tests.

---

## Phase 1C — Boot backfill

**Status: READY FOR SOAK — integrated; reverse restore disabled by hard gate**

Existing localStorage saves receive the Phase 1 shadow and Phase 2 candidate seed/rehearsal without a user-visible migration prompt.

While `__authorityReadsEnabled=false`, this is backfill/rehearsal only. The future restore path exists but cannot execute.

### Phase 1C exit criteria

- [x] old localStorage-only fixture produces shadow after boot in integration test;
- [x] no user-visible prompt;
- [x] real Chromium confirms shadow does not reverse-restore into legacy with hard gate OFF;
- [x] real Chromium enabled-copy test confirms the future cryptographically verified authority→cache restore path works when explicitly enabled in test only;
- [ ] sustained household use confirms no unexplained equality drift.

---

## Phase 1D — Developer diagnostics

**Status: READY FOR SOAK — integrated and covered by regression tests**

Current developer-only methods include:

- `QuestSave.shadowStatus()`
- `QuestSave.verifyShadow()`
- `QuestSave.shadowSnapshotMeta()`
- `QuestSave.authorityCandidateStatus()`
- `QuestSave.verifyAuthorityCandidate()`
- `QuestSave.authorityCandidateSnapshotMeta()`
- `QuestSave.authorityPromotionStatus()`
- `QuestSave.authorityReconcileNow()`
- `QuestSave.authorityReadSwitchEnabled()`
- `QuestSave.storageV2SoakStats()`
- `QuestSave.storageV2Readiness()`

No normal child UI exposes these diagnostics.

---

## Phase 1E — Regression CI and real-use soak

**Status: IN PROGRESS — automated portion green; sustained household soak remains**

Permanent branch CI covers:

- full current-source Node regression suite;
- public `QuestSave` compatibility contract;
- Phase 1 shadow failure/coalescing/integration tests;
- Phase 2 authority/reconciliation tests;
- disabled read-switch/crash-recovery tests;
- automatic soak-metrics/readiness tests;
- real Chromium IndexedDB tests for shadow backfill, no reverse restore, authority candidate, and test-only enabled authority restore.

### Household soak criterion

Current policy is intentionally conservative:

- normal household use across at least 3 active days;
- at least 300 candidate commits that immediately verify against the current legacy payload/generation;
- zero unexplained verification mismatches;
- zero candidate commit failures;
- current shadow match;
- current candidate match and cryptographic verification;
- no restore-recovery failure.

`QuestSave.storageV2Readiness()` evaluates these conditions. Its result is advisory only; `automaticPromotion:false` is an invariant.

---

# PHASE 2 — Promote IndexedDB to local authority

## Phase 2 compatibility decision — IndexedDB authority + localStorage WAL/cache

**Status: IMPLEMENTED THROUGH DISABLED READ-SWITCH SCAFFOLD; NOT YET GAMEPLAY AUTHORITY**

A pure localStorage→IndexedDB replacement is not compatible with the current `QuestSave` surface because IndexedDB is asynchronous while several existing callers depend on synchronous in-memory/local persistence semantics. The promotion architecture therefore uses:

```text
synchronous QuestSave mutation
        |
        v
localStorage q4b_store_v1 + q4b_store_gen   <- WAL / boot cache / rollback path
        | exact successful generation
        v
IndexedDB q4b_local_v2                       <- durable candidate authority
```

### Deterministic reconciliation rules

1. no IDB authority + valid legacy WAL → seed IDB from legacy;
2. legacy generation newer than IDB → replay WAL into IDB;
3. IDB generation newer than legacy → return/apply cache-restore plan only after structural/checksum/byte/SHA-256 verification and only when read-authority gate is enabled;
4. same generation + same payload → matched;
5. same generation + different payload → stop as conflict; never guess;
6. every authority replacement preserves the previous authority record as an IndexedDB rollback record;
7. corrupt authority may be repaired from an equal/newer valid WAL, but a corrupt authority claiming a newer generation is not overwritten automatically;
8. authority→cache restoration uses a local transaction marker so partial localStorage writes roll back synchronously on failure or next boot.

During rehearsal, successful legacy generations are copied to the candidate IDB through a serialized/coalescing queue. Candidate records never feed gameplay state because the hard gate remains OFF.

## Phase 2A — Read authority switch

**Status: CODE COMPLETE BEHIND HARD-OFF GATE; ACTIVATION PENDING SOAK**

The bootstrap/read-authority code exists and is tested in Node and in an isolated real-Chromium enabled copy. Production branch source retains:

```js
var __authorityReadsEnabled = false;
```

Do not change this until household readiness is intentionally reviewed.

### Requirements already implemented/tested

- IDB authority record must validate before restore;
- SHA-256 verification is mandatory for authority→cache restoration;
- localStorage remains WAL/cache during authority mode;
- new IDB generation can restore stale/missing local cache through transaction marker;
- same-generation divergence stops;
- bootstrap can temporarily block writes only while future authority reconciliation is unresolved;
- clean restore refreshes in-memory store and requests reload;
- interrupted restore rolls back before normal store load.

### Activation gate

- [ ] `storageV2Readiness().eligible === true` under normal household use;
- [ ] inspect any recorded failures/mismatches (expected zero);
- [ ] explicitly choose to flip the hard gate;
- [ ] keep localStorage WAL/cache for rollback window after activation.

## Phase 2B — localStorage WAL/cache and rollback

**Status: IMPLEMENTED/TESTED BEHIND DISABLED SWITCH; ACTIVATION PENDING**

In future authority mode, localStorage remains the synchronous WAL/cache rather than disappearing. An IndexedDB-newer restore is copied into localStorage using `q4b_storage_v2_restore_txn_v1`; payload/generation are verified exactly and a partial write is rolled back before normal store load.

The IndexedDB `rollback` record separately preserves the previous authority snapshot when authority state is replaced/repaired.

## Phase 2C — Schema versioning and migration discipline

**Status: HARDENING IMPLEMENTED; HOUSEHOLD SOAK PENDING**

Authority records contain an explicit persistence schema independent of game-content fields. Automated coverage includes:

- stale generation rejection;
- same-generation divergence stop;
- structural payload validation;
- byte-length validation;
- deterministic checksum validation;
- SHA-256 validation;
- WebCrypto-unavailable restore refusal;
- corrupt authority repair from equal/newer valid WAL;
- refusal to overwrite corrupt newer authority with older WAL;
- raw rollback preservation;
- interrupted cache-restore recovery.

### Phase 2 exit gate

- [ ] IndexedDB authoritative reads/writes stable under real household use after activation;
- [x] legacy→candidate import/replay works in automated and real-browser fixtures;
- [x] rollback/cache-restore mechanisms are automated/tested before activation;
- [x] schema/integrity failure preserves a recoverable source/rollback copy;
- [x] export/import remains independent of backend contract;
- [x] normal rehearsal gameplay remains offline-first;
- [ ] post-activation rollback window passes without regression.

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

- gameplay continues from local persistence;
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

The following API boundary is part of the migration compatibility surface and is regression-tested before storage authority changes.

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

### Shared progression/economy relying on persistence

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

The public method list is captured by automated contract tests so accidental removal is caught by CI.

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

### Phase 1 / rehearsal

Rollback is trivial because localStorage is still gameplay authority. Disable/remove shadow/candidate hooks. Do not copy IndexedDB back automatically while the hard gate is OFF.

### Phase 2 after activation

Keep localStorage as WAL/cache and rollback surface for a defined period. If regression occurs, switch read authority back to legacy/cache and export the IndexedDB copy for diagnosis rather than destructively overwriting either side.

### Phase 3+

Cloud restore is never the only copy. A restore operation must generate a pre-restore local recovery snapshot and verify the cloud snapshot before replacing current local authority.

---

## 8. Current work queue

### Safe/automatic work completed

1. branch CI and contract tests;
2. Phase 1 shadow and boot backfill;
3. Phase 2 candidate authority and reconciliation;
4. actual IndexedDB browser tests;
5. disabled read-authority switch scaffold;
6. corruption/integrity hardening;
7. crash-safe authority→cache restore transaction;
8. automatic soak metrics/readiness reporting;
9. real-browser enabled-copy test of future authority restore;
10. cleanup of one-shot migration workflows.

### Current gate

Use `agent/storage-v2-shadow` normally for sustained household use. The branch automatically accumulates verification statistics. No manual destructive testing is required for the scenarios already covered by permanent CI.

The hard gate must remain OFF until `await QuestSave.storageV2Readiness()` reports eligible and the result is deliberately reviewed.

Items intentionally **not** started yet:

- enabling IndexedDB gameplay read authority;
- Cloudflare credentials/infrastructure;
- account/auth;
- billing;
- automatic cloud restore;
- live sync.

---

## 9. Decision log

### 2026-08-17 — Branch rather than repository fork

Decision: keep one repository and use `agent/storage-v2-shadow` rather than copying/forking the entire Quest4Bugs codebase.

Reason: active Komorebi/content work will continue. A separate codebase would diverge rapidly. A branch lets main content changes be merged into the storage migration while keeping production untouched.

### 2026-08-17 — Do not wait for Komorebi completion

Decision: storage migration proceeds in parallel with incremental Komorebi releases.

Reason: persistence backend is generic behind `QuestSave`. Months of real household usage are valuable soak time for equivalence testing.

### 2026-08-17 — Shadow before authority switch

Decision: localStorage remains gameplay read authority throughout rehearsal; IndexedDB cannot auto-restore while the hard gate is OFF.

Reason: the initial migration stays observational and reversible. IndexedDB can fail without risking current household state.

### 2026-08-17 — IndexedDB authority + localStorage WAL/cache

Decision: eventual authority mode retains localStorage as synchronous WAL/cache rather than attempting a pure synchronous-API→asynchronous-IDB replacement.

Reason: current Q4B has synchronous persistence callers. WAL/cache preserves compatibility while IndexedDB supplies durable reconciled authority.

### 2026-08-17 — Readiness is advisory, never automatic

Decision: normal usage automatically records migration evidence, but no threshold may automatically enable IndexedDB reads.

Reason: the final authority switch changes failure semantics and deserves an explicit reviewed decision even after automated evidence is sufficient.

### 2026-08-17 — Cloudflare architecture

Decision: planned commercial backup platform is **Cloudflare R2 + D1**, with a Worker/API layer. R2 stores immutable/versioned snapshot objects; D1 stores small lookup/integrity metadata.

Reason: Q4B storage volume is small, object snapshots match the backup model, and local-first operation minimizes server complexity/cost. Cloudflare is intentionally deferred until local IndexedDB authority is stable.

### 2026-08-17 — Backup before live synchronization

Decision: commercial v1 provides durable backup/restore, not general concurrent multi-device synchronization.

Reason: live synchronization introduces conflict-resolution complexity that is unnecessary to solve the primary data-loss risk.

---

## 10. Implementation / verification log

### 2026-08-17 — Initial Phase 1A scaffold

- Created isolated migration branch.
- Added non-authoritative IndexedDB shadow, tests, and this roadmap.
- `main` remained unchanged.

### 2026-08-17 — Phase 1B/1C/1D promoted

- Branch CI and `QuestSave` contract regression established.
- Successful legacy saves queue the shadow only after authoritative persistence.
- Existing legacy saves backfill the shadow at boot.
- Read-only diagnostics exposed.
- Failure isolation and full Node regressions passed.

### 2026-08-17 — Phase 2 authority candidate rehearsal

- Added `shared/storage_authority.js` with validated canonical snapshots, generation ordering, SHA-256, rollback preservation, and deterministic WAL reconciliation.
- Added Node tests covering seed, normal commit, stale rejection, same-generation divergence, rollback, WAL replay, authority-newer restore planning, corruption handling, and IndexedDB failure containment.
- Added real Chromium tests using the browser's actual IndexedDB implementation.
- Integrated candidate as a serialized/coalesced write-only second shadow during rehearsal.

### 2026-08-17 — Disabled read-authority switch + hardening

- Integrated the complete authority→local-cache bootstrap path with `__authorityReadsEnabled=false`.
- Added structural/byte/checksum/SHA-256 verification before future restore.
- Added deterministic same-generation conflict stop and corrupt-authority repair rules.
- Added `q4b_storage_v2_restore_txn_v1` for partial-write/crash recovery.
- Node tests exercise enabled mode only in isolated source copies.
- Real Chromium test likewise flips the gate only in a fetched test copy and confirms verified IndexedDB→cache restore.

### 2026-08-17 — Automatic sustained-soak gate

- Added `q4b_storage_v2_soak_stats_v1` diagnostic metadata.
- Added `QuestSave.storageV2SoakStats()` and `QuestSave.storageV2Readiness()`.
- No child/game payload is copied into the statistics record.
- Current readiness policy requires current shadow/candidate equality, cryptographic candidate verification, zero failures/mismatches, >=300 verified commits, >=3 active days, no restore-recovery failure, and hard gate OFF.
- `automaticPromotion:false` is explicit and tested.

### 2026-08-17 — Branch cleanup

- Removed completed one-shot promotion/progress workflows and trigger notes after use.
- Permanent migration CI remains `.github/workflows/storage-v2-shadow.yml`.
- Detailed roadmap remains the sole storage-v2 progress/design document.

## Current stopping rule

**Do not flip the read-authority hard gate yet.** The remaining gate is sustained normal household use on `agent/storage-v2-shadow`. Once `await QuestSave.storageV2Readiness()` reports `eligible: true` and recorded failures/mismatches remain zero, review the result explicitly before changing the hard gate. Phase 3 Cloudflare work remains intentionally deferred until Phase 2 local authority is proven.
