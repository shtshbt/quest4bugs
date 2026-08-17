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
| 1C | Boot backfill | **READY FOR SOAK** | existing `q4b_store_v1` is mirrored after boot; no reverse restore | sustained household verification |
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
- [x] Added branch-specific CI; now running permanent Phase 1/2 storage regression + real-browser smoke.
- [x] Freeze/test the `QuestSave` public contract.
- [x] Wire successful `persist()` to shadow queue after authoritative legacy success.
- [x] Add boot backfill (legacy → shadow only).
- [x] Expose developer-only verification through `QuestSave`.
- [x] Real Chromium IndexedDB smoke: legacy→shadow backfill, no reverse restore, Phase 2 candidate reconciliation, and enabled-copy authority restore.
- [x] Phase 2 authority candidate is integrated as a non-authoritative second shadow.
- [x] Disabled read-authority switch scaffold is integrated; hard gate is explicitly `false`.
- [x] Authority records are validated by schema, byte length, checksum, and SHA-256 before any future restore.
- [x] Partial authority→cache restore is transaction-marker protected and rolls back on failure/next boot.
- [x] Automatic sustained-soak metrics/readiness report is integrated; no automatic promotion is permitted.
- [x] One-shot promotion/progress workflows and trigger notes were removed after use; permanent tree retains only implementation, tests, permanent CI, and this roadmap.
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

Current checksum is an equality diagnostic, not a cryptographic integrity guarantee. IndexedDB authority candidate additionally records SHA-256 and refuses future authority→cache restore without cryptographic verification.

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

The legacy save remains authoritative. After a successful legacy persistence, the exact serialized payload/generation is queued to both the Phase 1 shadow and the Phase 2 authority candidate rehearsal queue. Both are best-effort and non-authoritative while the hard gate is disabled.

### Required ordering

1. serialize canonical state once;
2. write `q4b_store_v1`;
3. advance legacy generation;
4. only after legacy success, enqueue shadow/candidate write;
5. never await IndexedDB before returning legacy success;
6. IndexedDB failure produces diagnostics only;
7. do not mirror a failed authoritative write.

### Phase 1B exit criteria

- [x] all legacy save tests unchanged/green;
- [x] `persist()` return behavior unchanged in automated regression/integration tests;
- [x] IndexedDB blocked/unavailable does not alter legacy save result in failure-isolation tests;
- [x] rapid repeated saves coalesce shadow/candidate writes;
- [x] generation written to candidate corresponds to the successfully persisted legacy generation in integration tests.

---

## Phase 1C — Boot backfill

**Status: READY FOR SOAK — integrated, reverse restore intentionally absent while gate is OFF**

Existing localStorage-only users get a Phase 1 shadow and Phase 2 candidate seed/rehearsal without a user-visible migration prompt. The disabled read-switch scaffold contains the future verified restore path but cannot execute it while `__authorityReadsEnabled=false`.

### Phase 1C exit criteria

- [x] old localStorage-only fixture produces shadow after boot in integration test;
- [x] no user-visible prompt is introduced by the backfill path;
- [x] real Chromium confirms no shadow→legacy reverse restore with the hard gate OFF;
- [x] an enabled-copy real Chromium test confirms the future SHA-verified authority→cache restore path works when explicitly enabled in test only.

---

## Phase 1D — Developer diagnostics

**Status: READY FOR SOAK — integrated and covered by regression tests**

Available diagnostics include:

- `QuestSave.shadowStatus()`
- `QuestSave.verifyShadow()`
- `QuestSave.shadowSnapshotMeta()`
- `QuestSave.authorityCandidateStatus()`
- `QuestSave.verifyAuthorityCandidate()`
- `QuestSave.authorityCandidateSnapshotMeta()`
- `QuestSave.authorityPromotionStatus()`
- `QuestSave.storageV2SoakStats()`
- `QuestSave.storageV2Readiness()`

No normal child UI exposes these diagnostics.

---

## Phase 1E — Regression CI and real-use soak

**Status: IN PROGRESS — automated portion green; sustained household soak remains**

Permanent branch CI now covers Node storage regressions and real Chromium IndexedDB smoke scenarios. The current automatic readiness policy requires at least 300 verified candidate commits across at least 3 active days, with current shadow/candidate equality, cryptographic candidate verification, zero candidate/verification failures, and no restore-recovery failure. This threshold is a migration safety policy, not a product requirement.

Phase 2 read authority must not be activated automatically even if the report becomes eligible.

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
3. IDB generation newer than legacy → restore plan only if the authority record passes structural/checksum/byte/SHA-256 verification;
4. same generation + same payload → matched;
5. same generation + different payload → stop as conflict; never guess;
6. every authority replacement preserves the previous authority record as an IndexedDB rollback record;
7. corrupt authority may be repaired from an equal/newer valid WAL, but a corrupt authority claiming a newer generation is not overwritten automatically;
8. authority→cache restoration uses a transaction marker so partial localStorage writes roll back synchronously on failure or next boot.

During rehearsal, successful legacy generations are copied to the candidate IDB through a serialized/coalescing queue. Candidate records are never read into gameplay state because the hard gate is OFF.

## Phase 2A — Read authority switch

**Status: CODE COMPLETE BEHIND HARD-OFF GATE; ACTIVATION PENDING SOAK**

The read-authority/bootstrap code exists and is tested both in Node and in an isolated real-Chromium enabled copy. Production branch source retains:

```js
var __authorityReadsEnabled = false;
```

Do not change this until the readiness/household gate is intentionally reviewed.

## Phase 2B — localStorage WAL/cache and rollback

**Status: IMPLEMENTED/TESTED BEHIND DISABLED SWITCH; ACTIVATION PENDING**

In future authority mode, localStorage remains the synchronous WAL/cache rather than disappearing. An IndexedDB-newer restore is copied into localStorage using `q4b_storage_v2_restore_txn_v1`; payload/generation are verified exactly and a partial write is rolled back before normal store load.

## Phase 2C — hardening

**Status: AUTOMATED HARDENING IMPLEMENTED; HOUSEHOLD SOAK PENDING**

Automated coverage includes stale generation rejection, same-generation divergence stop, structural payload validation, byte/checksum/SHA validation, corrupt authority repair rules, raw rollback preservation, WebCrypto-unavailable restore refusal, and interrupted cache-restore recovery.

---

# PHASE 3 — Cloudflare durable backup

## Provider decision

**Default architecture: Cloudflare R2 + D1.**

- R2 stores immutable/versioned family snapshot blobs.
- D1 stores family/snapshot metadata, latest valid snapshot pointer, timestamps, checksums, schema versions and future entitlement references.
- Cloud backup is additive and asynchronous; local gameplay must never depend on Cloudflare availability.
- Initial cloud behavior is backup/restore, not live multi-master synchronization.

Do not implement provider-specific backup writes until Phase 2 local authority is proven in sustained use.

---

# PHASE 4 — Commercial family/account layer

After durable backup is stable, add parent/family identity, entitlement, restore UI, retention/deletion/export policy and only the minimum child-linked server data necessary.

---

# PHASE 5 — Optional live multi-device sync

Deferred. Treat as a separate conflict-resolution product rather than an extension of backup.

---

# Implementation / decision log

### 2026-08-17 — Phase 1 foundation

- Created isolated migration branch.
- Added non-authoritative IndexedDB shadow, diagnostics, contract tests and permanent branch CI.
- `main` remained unchanged.

### 2026-08-17 — Phase 1B/1C/1D promoted

- `shared/storage.js` queues shadow writes only after successful legacy persistence.
- Boot backfill is legacy→shadow only.
- Automated failure isolation and public API contract tests are green.

### 2026-08-17 — Phase 2 authority candidate rehearsal

- Added `shared/storage_authority.js` with validated canonical snapshots, generation ordering, SHA-256, rollback record preservation and deterministic WAL reconciliation.
- Added Node and real-Chromium IndexedDB tests.
- Integrated candidate as a write-only second shadow during rehearsal.

### 2026-08-17 — Disabled read-authority switch + automatic soak gate

- Promoted the complete authority→local-cache bootstrap path into the migration branch with `__authorityReadsEnabled=false`; normal behavior therefore remains rehearsal-only.
- Future restore is accepted only from a structurally valid, checksum/byte-valid and SHA-256-verified IndexedDB authority record.
- Cache restore uses `q4b_storage_v2_restore_txn_v1` for crash/partial-write recovery.
- Added automatic soak stats/readiness reporting. No child/game payload is copied into the stats record.
- Current readiness policy: current shadow match, current cryptographically verified candidate match, zero candidate/verification failures, >=300 verified candidate commits, >=3 active days, no restore-recovery failure, hard gate still OFF, and `automaticPromotion:false`.
- Added a real-Chromium test that enables the gate only in an isolated fetched source copy and confirms verified IndexedDB→local-cache restoration.
- Removed completed one-shot promotion/progress workflows and trigger notes after use; permanent CI remains `.github/workflows/storage-v2-shadow.yml`.

## Current stopping rule

**Do not flip the read-authority hard gate yet.** The remaining gate is sustained normal household use on `agent/storage-v2-shadow`. Once `await QuestSave.storageV2Readiness()` reports `eligible: true` and the observed failures/mismatches remain zero, review the result explicitly before changing the hard gate. Phase 3 Cloudflare work remains intentionally deferred until Phase 2 local authority is proven.
