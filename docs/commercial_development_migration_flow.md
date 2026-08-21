# Quest4Bugs Commercial Development and Migration Flow

Status: ACTIVE OPERATING PROCEDURE  
Branch: `commercial/cloudflare-v1`  
Applies to: development from 2026-08-21 onward

## 1. Core principle

Quest4Bugs now has two deliberately different development tracks:

```text
main
└─ Home/family product
   ├─ fastest-moving product/content branch
   ├─ Komorebi and normal gameplay development continue freely
   └─ must not wait for commercial infrastructure work

commercial/cloudflare-v1
└─ Commercial product base
   ├─ periodically follows main
   ├─ owns commercial persistence/cloud/auth/billing changes
   └─ must not destabilize main
```

The key rule is asymmetric integration:

**Shared product/content flows from `main` -> `commercial/cloudflare-v1`.**  
**Commercial infrastructure does not flow back into `main` by default.**

If a commercial-branch change is later identified as a genuine shared product bugfix, port that specific fix intentionally rather than merging the commercial branch back wholesale.

## 2. Branch responsibilities

### `main`

`main` remains the source of truth for the home/family product and shared gameplay/content.

Normal work includes:

- Komorebi releases and new modules;
- question/content changes;
- encyclopedia/gameplay changes;
- visual and UX changes;
- shared bug fixes;
- ordinary home release work.

Commercial development must never force `main` to freeze or wait.

### `commercial/cloudflare-v1`

This branch is the source of truth for the commercial product base.

Commercial-only work includes:

- IndexedDB local-authority migration;
- commercial save/restore UX;
- Cloudflare Pages/Functions integration;
- R2 immutable snapshots;
- D1 backup metadata;
- parent/family authentication;
- billing and entitlement;
- privacy/support/commercial release gates;
- removal or hiding of home-only GitHub/PAT synchronization UI.

## 3. Persistent-state rule for all future shared development

Even while `main` continues rapid development, new persistent gameplay state should remain behind the existing `QuestSave` boundary wherever practical.

Preferred APIs:

- `QuestSave.load()` / `QuestSave.save()`;
- `QuestSave.loadVersioned()` / `QuestSave.saveVersioned()`;
- existing namespaced/versioned helpers.

Avoid adding new direct application-state writes such as arbitrary `localStorage.setItem(...)` calls. Commercial migration depends on having one logical save contract even when physical backends differ.

This is the most important compatibility rule between the two tracks.

## 4. Normal development cycle

### A. Home/product development

1. Develop and release normally on `main`.
2. Do not modify commercial infrastructure as part of ordinary home work.
3. Keep persistent state inside `QuestSave`.
4. Tag or record coherent release points when useful, but commercial development does not require every small home commit immediately.

### B. Commercial development between main syncs

Continue commercial-only work on `commercial/cloudflare-v1`:

1. local persistence hardening;
2. automated storage tests;
3. Cloudflare backend development;
4. auth/billing/privacy work;
5. staging and restore testing.

### C. Periodic `main` -> commercial sync

Sync after a coherent product milestone or whenever commercial testing needs current gameplay/content.

Procedure:

1. Confirm the current commercial branch is in a known state.
2. Record the current commercial commit and current `main` commit.
3. Bring `main` into `commercial/cloudflare-v1`.
4. Resolve conflicts using these rules:
   - shared gameplay/content: prefer current `main` behavior;
   - commercial infrastructure: preserve commercial behavior;
   - storage integration boundary: preserve `QuestSave` compatibility and rerun storage tests;
   - never silently re-enable GitHub/PAT sync for commercial users.
5. Run the full relevant regression suite.
6. Run commercial storage stress/browser tests.
7. Run Cloudflare contract/build checks.
8. Update `Last main sync` in `docs/commercial_cloudflare_v1.md`.
9. Continue commercial development.

No reverse merge into `main` is part of this cycle.

## 5. Commercial storage migration sequence

The commercial branch deliberately migrates storage in stages rather than with one destructive cutover.

### Stage L0 — inherited compatibility state

Current starting point:

- `QuestSave` logical contract retained;
- localStorage remains legacy read authority;
- IndexedDB shadow/candidate receives validated generations;
- authority read switch remains disabled;
- cloud backup is not required for gameplay.

### Stage L1 — automated validation

Before promotion:

- storage contract tests green;
- candidate corruption/divergence tests green;
- stress test with thousands of generations green;
- real Chromium IndexedDB tests green;
- rollback/reconcile behavior green;
- cloud-unavailable simulation does not block local saves.

Human household usage is not used as a substitute for deterministic automated stress testing.

### Stage L2 — commercial IndexedDB authority

Promote only on the commercial origin after L1 passes.

Target behavior:

```text
gameplay
   -> QuestSave
       -> IndexedDB       # local durable authority
       -> compatibility/WAL fallback as needed during transition
```

Requirements:

- fresh commercial installs do not depend on GitHub or a PAT;
- old/home exports can still be imported explicitly;
- corruption never silently overwrites a valid newer generation;
- restore has a rollback path;
- schema migrations are explicit and testable.

### Stage L3 — remove legacy authority dependency

After staging proves L2 is stable:

- retain only the minimum compatibility/rollback data needed;
- remove user-visible GitHub Fieldnote/PAT behavior from commercial UX;
- keep export/import as an escape hatch.

Do not delete compatibility data merely because cloud backup exists.

## 6. Cloudflare migration sequence

Cloudflare is backup/recovery infrastructure first, not the primary live gameplay database.

### C0 — scaffold (repository only)

Repository contains:

- Pages Functions API contract;
- D1 schema;
- R2 binding contract;
- client adapter;
- static commercial build;
- disabled-by-default API kill switch;
- commercial CI.

No real Cloudflare resources are required yet.

### C1 — provision staging resources

After a Cloudflare account/project is available:

1. create a dedicated commercial Pages project/origin;
2. create R2 backup bucket;
3. create D1 database;
4. apply schema;
5. bind R2/D1 to Pages Functions;
6. configure secrets outside git;
7. keep `COMMERCIAL_API_ENABLED=0` until bindings and auth are verified.

The commercial origin must be separate from the home GitHub Pages origin so browser localStorage/IndexedDB cannot collide.

### C2 — staging backup verification

Enable API only on staging and verify:

1. upload one snapshot;
2. verify server SHA-256 and byte length;
3. verify a unique immutable R2 object exists;
4. verify D1 metadata points to it;
5. upload subsequent generations without overwriting history;
6. list backup metadata;
7. download a chosen historical backup;
8. verify checksum client-side;
9. restore explicitly into an isolated test profile/origin;
10. simulate R2/D1/network failure and confirm gameplay remains usable.

### C3 — retention and recovery

Before external beta, define and test:

- recent snapshot retention;
- daily/weekly historical retention;
- deletion behavior;
- family/account deletion behavior;
- orphan R2 cleanup;
- D1/R2 consistency audit;
- manual emergency restore procedure.

R2 version history is application-managed; D1 rollback features do not automatically version R2 objects.

### C4 — real parent/family authentication

The temporary staging bearer mechanism is not a production authentication design.

Before beta:

- family identity must be server-derived;
- users must never choose arbitrary family IDs to access data;
- long-lived plaintext privileged tokens must not be stored in normal browser storage;
- every backup/list/download operation must be authorized against the authenticated family.

### C5 — billing/entitlement

Add subscription state only after data persistence/authentication are stable.

Billing must not be coupled to the physical save format. Losing or cancelling entitlement must never destroy user backup data immediately.

## 7. Deployment lanes

Use distinct deployment purposes:

```text
Home production
  main -> existing GitHub Pages

Commercial preview/staging
  commercial/cloudflare-v1 -> Cloudflare preview/staging origin

Commercial production
  promoted commercial commit -> production Cloudflare origin
```

Rules:

- never point home users at commercial storage experiments;
- never test destructive migration against the home origin;
- commercial preview may use synthetic or explicitly imported test data;
- production promotion requires storage + backend + browser gates to be green.

## 8. Home -> commercial user-data migration

Commercial launch does not require changing the home product's storage first.

Preferred migration path for existing household data:

1. export via the existing logical `QuestSave.exportAll()` format;
2. open commercial origin;
3. import explicitly;
4. validate schema/generation/checksum;
5. write to commercial IndexedDB authority;
6. read back and verify;
7. create first cloud backup only after local promotion succeeds.

Do not make the commercial site reach into the home site's browser storage across origins.

Old -> new compatibility is required for launch. Permanent arbitrary new -> old compatibility is not guaranteed.

## 9. Failure and rollback policy

### Local storage failure

If candidate IndexedDB commit fails during a transitional dual-write phase, do not invalidate a successful existing authoritative save.

After IndexedDB promotion, a failed local-authority write must be surfaced as a local-save failure; cloud success must not disguise it.

### Cloud failure

Cloud backup failure is non-fatal to gameplay:

```text
local save succeeds
cloud backup fails
=> gameplay continues, backup remains pending/retriable
```

Never make an answer/session depend synchronously on Cloudflare availability.

### Bad commercial deployment

Rollback application code to the last known-good commercial commit. Do not roll user data backward automatically merely because code is rolled back.

Schema changes therefore need forward/backward-aware migration guards.

### Corrupt backup

Do not restore a backup that fails checksum/schema validation. Fall back to another historical snapshot or local valid state.

## 10. Testing gates

Every material commercial storage/backend change should pass the applicable gates below.

### Shared/home compatibility

- current shared product tests;
- no new persistent-state bypasses around `QuestSave`.

### Local persistence

- public QuestSave contract;
- shadow/candidate tests;
- generation ordering;
- same-generation divergence rejection;
- SHA-256 corruption detection;
- rollback/reconcile;
- multi-generation stress;
- real-browser IndexedDB smoke tests.

### Cloud backend

- syntax/build checks;
- API disabled by default;
- no committed secrets;
- snapshot validation;
- R2 immutability;
- D1 metadata/latest pointer consistency;
- authorization boundary;
- restore checksum validation;
- network/backend failure isolation.

### Release gate

No external commercial release until:

- local authority has been proven on staging;
- cloud backup and historical restore have been demonstrated end-to-end;
- real family authentication is present;
- privacy/retention/deletion behavior is defined;
- support/recovery path exists;
- commercial content QA gates are satisfied.

## 11. Emergency shared bugfix flow

If a critical bug exists in both tracks:

1. fix the shared bug in the branch where it is safest/fastest to prove;
2. identify the minimal shared commit/diff;
3. port that minimal fix to the other branch;
4. do not use the emergency as a reason to merge commercial infrastructure into `main`;
5. rerun both relevant test sets.

## 12. Documentation update rule

After each major commercial milestone, update at least:

- `docs/commercial_cloudflare_v1.md` — current implementation/status ledger;
- this file — only if the operating flow itself changes.

Record:

- last `main` sync commit;
- storage-authority phase;
- Cloudflare provisioning/deployment phase;
- known blockers;
- migration/rollback decisions.

This keeps the commercial branch understandable even after long periods of parallel development.

## 13. Current intended flow at a glance

```text
                 ┌─────────────────────────────┐
                 │            main             │
                 │ home + Komorebi + content   │
                 └──────────────┬──────────────┘
                                │
                     periodic one-way sync
                                │
                                ▼
              ┌─────────────────────────────────┐
              │ commercial/cloudflare-v1        │
              │                                 │
              │ QuestSave logical contract      │
              │        │                        │
              │        ▼                        │
              │ IndexedDB local authority       │
              │        │                        │
              │        └── async snapshots ──┐  │
              └───────────────────────────────┼──┘
                                              ▼
                              Cloudflare Pages Functions
                                  │                 │
                                  ▼                 ▼
                             R2 snapshots       D1 metadata
                                  │
                                  ▼
                           explicit restore
```

The development objective is therefore not to finish the home product before commercialization. The objective is to keep `main` moving quickly while maintaining a controlled, testable one-way integration path into a progressively hardened commercial platform.
