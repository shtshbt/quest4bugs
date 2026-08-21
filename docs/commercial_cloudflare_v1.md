# Quest4Bugs Commercial / Cloudflare v1

Status: ACTIVE DESIGN + IMPLEMENTATION LEDGER  
Branch: `commercial/cloudflare-v1`  
Created from main: `fabf9f7c40013898919b5115415b5cecae3dba4f` (2026-08-21)  
Last main sync: `fabf9f7c40013898919b5115415b5cecae3dba4f`  
Current implementation head before this ledger update: `242391144acd951fda0d0ff0c97f40d4ebf81bac`

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

The following work from `agent/storage-v2-shadow` is reused in this branch:

- `shared/storage_shadow.js`: IndexedDB mirror engine.
- `shared/storage_authority.js`: future IndexedDB authority candidate, generation ordering, rollback record, checksum and SHA-256 integrity checks, divergence detection, corruption repair.
- `shared/storage.js`: integration hooks, boot reconciliation, crash-safe restore transaction, diagnostics, `QuestSave` compatibility.

Important: the inherited `shared/storage.js` still has `__authorityReadsEnabled=false`. This is deliberate. Commercial fresh-install promotion to IndexedDB authority is a separate controlled step after automated validation.

The inherited GitHub Fieldnote code is transitional compatibility code only. It must not be presented to commercial users and will be disabled behind commercial mode before external beta.

## 3. Phase dashboard

| Phase | Status | Goal | Exit criteria |
|---|---|---|---|
| C0 clean split | **DONE** | Latest main + reusable storage-v2 foundation on dedicated branch | branch exists, main untouched, separate architecture documented |
| C1 local persistence | **IMPLEMENTED / VALIDATION PENDING** | Make IndexedDB the commercial local authority with rollback/import compatibility | storage contract + browser + stress CI green; then controlled authority promotion |
| C2 Cloudflare scaffold | **IMPLEMENTED / VALIDATION PENDING** | Prepare Pages Functions, D1 schema, R2 contract, build/deploy config | CI green; API remains disabled by default until provisioned |
| C3 cloud backup/restore | **BLOCKED: CLOUDFLARE ACCOUNT** | Provision Pages/R2/D1 and prove immutable versioned upload/list/restore | staging deployment; create/list/download verified; offline failure harmless |
| C4 family auth | NOT STARTED | Replace staging bearer gate with real parent/family authentication | family identity server-derived, no plaintext long-lived production tokens in client storage |
| C5 billing/entitlement | NOT STARTED | Subscription state controls premium entitlement | payment webhook/entitlement tests; grace/retry semantics documented |
| C6 commercial QA/beta | NOT STARTED | Small external release | privacy/terms/support/restore UX/content QA gates complete |

## 4. C1: local persistence details

### Current implementation

`localStorage` remains the read authority because the reused migration code keeps the hard gate off. In parallel, the candidate IndexedDB (`q4b_local_v2`) receives exact successful generations. This protects the commercial branch while automated tests are run.

Permanent storage tests from the original storage-v2 branch have been ported. A dedicated commercial stress test now performs **2,000 sequential authority generations**, then checks the newest generation, rollback generation, stale-write rejection, and same-generation divergence rejection. Real Chromium smoke pages are also ported.

### Commercial target

For a fresh commercial origin:

1. IndexedDB is the durable local authority.
2. localStorage may remain a small compatibility/WAL/rollback cache during the transition, but not the long-term source of truth.
3. `QuestSave.exportAll()/importAll()` remains the escape hatch and home->commercial transfer path.
4. No automatic destructive migration. If legacy data is imported, verify structure + generation + SHA-256 before promotion.

There is no requirement for children to answer 300 additional questions. Load/stress volume is an automated-test concern; human usage is only a short real-device sanity check after staging exists.

## 5. C2/C3: Cloudflare backup contract

### Implemented files

- `cloudflare/schema.sql`: D1 family + backup metadata schema.
- `cloudflare/wrangler.template.jsonc`: provisioning template only; not an active deploy config.
- `cloudflare/build-static.mjs`: builds `dist-commercial` while excluding development/internal files and writes `_routes.json` so only `/api/*` invokes Functions.
- `functions/_lib/auth.js`: disabled-by-default staging auth gate.
- `functions/_lib/backup.js`: snapshot validation, server-side SHA-256, immutable R2 write, D1 metadata transaction, list/get helpers.
- `functions/api/health.js`: backend/binding health endpoint.
- `functions/api/backups/index.js`: staging GET list + POST upload.
- `functions/api/backups/[id].js`: family-scoped download.
- `shared/storage_cloudflare.js`: browser-side upload/list/download adapter. It is **not wired into gameplay yet**.

### Bindings

- D1: `Q4B_DB`
- R2: `Q4B_BACKUPS`
- kill switch: `COMMERCIAL_API_ENABLED`

Before real auth exists, staging endpoints require `COMMERCIAL_API_ENABLED=1`, a secret `COMMERCIAL_STAGING_TOKEN`, and a staging family identifier. Production beta must replace this global staging-token design.

### Snapshot write order

1. authenticate family context;
2. validate snapshot shape/size;
3. compute SHA-256 server-side and reject client-hash mismatch;
4. write a new immutable R2 object;
5. in one D1 `batch()` transaction, insert/update family metadata, insert backup metadata, and update latest-backup pointer;
6. if D1 fails, best-effort delete the newly-created R2 object;
7. never overwrite a historical R2 snapshot.

Object key convention:

`families/<familyId>/snapshots/<timestamp>-g<generation>-<backupId>.json`

### Restore

- list returns metadata only;
- download checks that the requested backup belongs to the authenticated family;
- client verifies SHA-256 again after download;
- restore into `QuestSave` remains an explicit parent action in v1.

## 6. Cloudflare deployment plan

Initial hosting choice: **Cloudflare Pages + Pages Functions**. Q4B is already a static HTML/JS site, so this supplies a separate commercial origin without forcing an application rewrite. Functions live in repository-root `/functions`. Static assets are copied into `dist-commercial`; `_routes.json` limits Functions invocation to `/api/*`.

Do not deploy `cloudflare/wrangler.template.jsonc` unchanged. After the Cloudflare Pages project exists, download/generate the actual project configuration and reconcile it with the template. No Cloudflare account IDs or secrets are currently committed.

## 7. Main-sync procedure

Whenever main materially advances:

1. ensure the commercial branch validation state is known;
2. merge main **into** commercial branch;
3. resolve shared-code conflicts in favor of current main unless the difference is intentionally commercial-specific;
4. rerun current main tests plus commercial storage/backend tests;
5. update `Last main sync` above;
6. never make main wait for the commercial branch.

## 8. CI

`.github/workflows/commercial-cloudflare-v1.yml` is installed for this branch and contains three gates:

1. **storage-regression**: current `tests/test_*.js`, storage hard-gate guard, commercial stress test, Cloudflare contract test;
2. **browser-indexeddb**: real headless Chromium tests for shadow backfill, no reverse restore, authority candidate, and enabled-copy restore;
3. **commercial-build**: static bundle generation, `/api/*` route isolation, Functions syntax, disabled Wrangler/API provisioning guard, no committed staging secret.

CI workflow is installed; current run result still needs to be recorded here once observable/complete.

## 9. Data/privacy constraints

Commercial v1 should minimize child personal data. Backup bodies contain learning/progress state, so cloud backup changes the privacy surface relative to local-only storage. Before external beta, authentication, retention, deletion, privacy policy, access control, and applicable child-privacy requirements must be reviewed. Encryption or pseudonymization alone must not be treated as removing those obligations.

## 10. Immediate next actions

- [x] Create `commercial/cloudflare-v1` from current main.
- [x] Seed reusable storage-v2 core files.
- [x] Port permanent storage tests and real-browser smoke tests.
- [x] Add 2,000-generation automated stress test.
- [x] Add D1 schema and disabled-by-default Pages Functions backup API.
- [x] Add commercial cloud client adapter without wiring it into gameplay.
- [x] Add branch-specific commercial CI.
- [ ] Record first all-green commercial CI run and fix any failures.
- [ ] Promote commercial fresh-install local authority to IndexedDB after automated gates pass.
- [ ] Create/connect Cloudflare account and provision Pages + R2 + D1.
- [ ] Deploy staging on a separate origin.
- [ ] Prove cloud create/list/download/restore and offline behavior.
- [ ] Disable/remove end-user GitHub Fieldnote controls in commercial mode.
- [ ] Add real parent/family authentication.
- [ ] Integrate periodic cloud snapshot scheduling and parent restore UI.

## 11. Implementation log

- `3ac17c8e5c3530bd790664415dddc224031e9893` — seeded storage-v2 core onto latest main.
- `242391144acd951fda0d0ff0c97f40d4ebf81bac` — added Cloudflare backend scaffold, D1/R2 contract, build separation, storage tests, 2,000-generation stress test, browser tests, client adapter, and CI.

## 12. Decision log

- 2026-08-21: Do not migrate home/main storage as a prerequisite for commercialization.
- 2026-08-21: Keep one repository; use separate branch/deploy/backend rather than a copied commercial repository.
- 2026-08-21: `main` remains free to evolve; commercial branch follows main periodically.
- 2026-08-21: Reuse storage-v2 as commercial local-persistence foundation.
- 2026-08-21: Cloudflare is backup/restore infrastructure first, not a realtime gameplay database.
- 2026-08-21: Replace human “300 questions” soak volume with automated stress testing plus a short real-device staging sanity check.
