# Quest4Bugs Commercial / Cloudflare v1

Status: ACTIVE DESIGN + IMPLEMENTATION LEDGER  
Branch: `commercial/cloudflare-v1`  
Created from main: `fabf9f7c40013898919b5115415b5cecae3dba4f` (2026-08-21)  
Last main sync: `fabf9f7c40013898919b5115415b5cecae3dba4f`

## 0. Purpose and branch rule

This branch is the commercial product base. The home/family product remains on `main` and may continue rapid Komorebi/content development without waiting for commercial infrastructure.

Hard rules:

1. `main` remains the source of truth for shared product/content code.
2. Periodically merge **main -> commercial/cloudflare-v1**. Do not merge commercial storage/auth/billing changes back into main unless explicitly decided.
3. Home storage is not being migrated as part of this project.
4. Commercial storage must not require a GitHub PAT from end users.
5. Commercial deploy uses a separate origin from the home GitHub Pages site so localStorage/IndexedDB cannot collide.
6. Preserve the logical `QuestSave` API/schema boundary wherever practical so shared games do not know the physical backend.
7. Local gameplay must continue if Cloudflare is unreachable. Cloud backup failure is never allowed to block an answer/save.

## 1. Target architecture

```text
HOME / main                         COMMERCIAL / commercial/cloudflare-v1
GitHub Pages                        Cloudflare Pages (staging -> production)
      |                                      |
localStorage (current)                    IndexedDB
      |                                      |  local authority
private GitHub Fieldnote                   |
                                             +---- async versioned backup ----+
                                                                              |
                                                               Cloudflare Pages Functions
                                                                      |             |
                                                                     R2            D1
                                                            immutable snapshots   metadata
```

R2 stores immutable versioned snapshot bodies. D1 stores family/backup metadata and the pointer to the latest known-good backup. Live per-answer remote writes and realtime multi-device sync are explicitly out of scope for v1.

## 2. Reused storage-v2 work

The following work from `agent/storage-v2-shadow` is reusable and has been seeded into this branch:

- `shared/storage_shadow.js`: IndexedDB mirror engine.
- `shared/storage_authority.js`: future IndexedDB authority candidate, generation ordering, rollback record, checksum and SHA-256 integrity checks, divergence detection, corruption repair.
- `shared/storage.js`: integration hooks, boot reconciliation, crash-safe restore transaction, diagnostics, `QuestSave` compatibility.

Important: the inherited `shared/storage.js` still has `__authorityReadsEnabled=false`. This is deliberate. Commercial fresh-install promotion to IndexedDB authority is a separate controlled step after CI/stress tests.

The inherited GitHub Fieldnote code is transitional compatibility code only. It must not be presented to commercial users and will be disabled behind commercial mode before external beta.

## 3. Phase dashboard

| Phase | Status | Goal | Exit criteria |
|---|---|---|---|
| C0 clean split | DONE | Latest main + reusable storage-v2 foundation on dedicated branch | branch exists, main untouched, separate architecture documented |
| C1 local persistence | IN PROGRESS | Make IndexedDB the commercial local authority with rollback/import compatibility | storage contract tests + browser tests + stress tests green; fresh commercial install does not depend on GitHub/localStorage authority |
| C2 Cloudflare scaffold | IN PROGRESS | Prepare Pages Functions, D1 schema, R2 contract, build/deploy config | backend code exists, disabled-by-default auth gate, local validation/CI green |
| C3 cloud backup/restore | BLOCKED: ACCOUNT | Provision Pages/R2/D1 and prove immutable versioned upload/list/restore | staging deployment; create/list/download restore verified; offline failure harmless |
| C4 family auth | NOT STARTED | Replace staging bearer gate with real parent/family authentication | family identity server-derived, no plaintext long-lived tokens in client storage |
| C5 billing/entitlement | NOT STARTED | Subscription state controls premium entitlement | payment webhook/entitlement tests; grace/retry semantics documented |
| C6 commercial QA/beta | NOT STARTED | Small external release | privacy/terms/support/restore UX/content QA gates complete |

## 4. C1: local persistence details

### Current state

`localStorage` remains the read authority because the reused home-migration code keeps the hard gate off. In parallel, the candidate IndexedDB (`q4b_local_v2`) receives exact successful generations.

### Commercial target

For a fresh commercial origin:

1. IndexedDB is the durable local authority.
2. localStorage may remain a small compatibility/WAL/rollback cache during the transition, but not the long-term source of truth.
3. `QuestSave.exportAll()/importAll()` remains the escape hatch and home->commercial transfer path.
4. No automatic destructive migration. If legacy data is imported, verify structure + generation + SHA-256 before promotion.

### Required automated tests

- storage public contract remains stable;
- >=1,000 rapid/sequential save generations without loss or stale overwrite;
- reload/reconcile returns the newest generation;
- same-generation different-payload conflict is rejected;
- corrupted IndexedDB record is never silently trusted;
- repair creates a valid SHA-256 record;
- rollback snapshot remains readable;
- simulated failure of IndexedDB/cloud never invalidates a successful local gameplay save;
- real Chromium smoke tests for IndexedDB open/write/read/reconcile.

There is no longer a requirement for children to answer 300 additional questions. Load/stress volume is an automated test concern; human usage is only a short real-device sanity check after staging exists.

## 5. C2/C3: Cloudflare backup contract

### Bindings

Proposed names:

- D1: `Q4B_DB`
- R2: `Q4B_BACKUPS`
- kill switch: `COMMERCIAL_API_ENABLED`

Before real auth exists, staging endpoints require a secret `COMMERCIAL_STAGING_TOKEN` plus a staging family identifier. Production beta must not use this global staging token design.

### Snapshot write order

1. authenticate family context;
2. validate snapshot shape/size;
3. compute SHA-256 server-side;
4. write a new immutable R2 object;
5. in one D1 `batch()` transaction, insert backup metadata and update the family's latest-backup pointer;
6. if D1 fails, best-effort delete the newly-created R2 object;
7. never overwrite a historical R2 snapshot.

Object key convention:

`families/<familyId>/snapshots/<timestamp>-g<generation>-<backupId>.json`

### Restore

- list returns metadata only;
- download checks that the requested backup belongs to the authenticated family;
- client verifies SHA-256 again before importing;
- restore into `QuestSave` must remain an explicit user/parent action in v1.

## 6. Cloudflare deployment plan

Initial hosting choice: Cloudflare Pages + Pages Functions because Q4B is already a static HTML/JS site and Pages provides a natural separate origin and preview deployment model. Functions live in repository-root `/functions`. Static assets are copied into `dist-commercial`; `_routes.json` limits Functions invocation to `/api/*`.

Do not create an active production Wrangler file with fake resource IDs. `cloudflare/wrangler.template.jsonc` is a provisioning template. After the Cloudflare project exists, generate/download the actual config from Cloudflare, reconcile it with the template, then commit the real binding IDs/settings only if appropriate.

## 7. Main-sync procedure

Whenever main materially advances:

1. record current commercial branch state and ensure CI green;
2. merge main **into** commercial branch;
3. resolve shared-code conflicts in favor of current main unless the difference is commercial-specific;
4. rerun all current main tests plus commercial storage/backend tests;
5. update `Last main sync` above;
6. never make main wait for this merge.

## 8. Data/privacy constraints

Commercial v1 should minimize child personal data. Backup bodies inevitably contain learning/progress state, so cloud backup changes the privacy surface relative to local-only storage. Before external beta, authentication, retention, deletion, privacy policy, access control, and applicable child-privacy requirements must be reviewed. Do not claim encryption/pseudonymization alone removes those obligations.

## 9. Immediate next actions

- [x] Create `commercial/cloudflare-v1` from current main.
- [x] Seed reusable storage-v2 core files.
- [ ] Port permanent storage tests and real-browser smoke tests.
- [ ] Add >=1,000-generation automated stress test.
- [ ] Add D1 schema and disabled-by-default Pages Functions backup API.
- [ ] Add commercial cloud client adapter without wiring it into gameplay yet.
- [ ] Add commercial CI.
- [ ] Create Cloudflare account / provision Pages + R2 + D1.
- [ ] Deploy staging on separate origin.
- [ ] Promote commercial local authority to IndexedDB after automated gates pass.
- [ ] Integrate periodic cloud snapshot upload/restore UI.

## 10. Decision log

- 2026-08-21: Do not migrate home/main storage as a prerequisite for commercialization.
- 2026-08-21: Keep one repository; use separate branch/deploy/backend rather than a copied commercial repository.
- 2026-08-21: `main` remains free to evolve; commercial branch follows main periodically.
- 2026-08-21: Reuse storage-v2 as commercial local-persistence foundation.
- 2026-08-21: Cloudflare is backup/restore infrastructure first, not a realtime gameplay database.
- 2026-08-21: Replace human “300 questions” soak volume with automated stress testing plus a short real-device staging sanity check.
