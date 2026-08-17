"use strict";

const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "..", ".claude_plan", "storage_v2_shadow_migration.md");
let s = fs.readFileSync(file, "utf8");

function replaceRequired(before, after, label){
  if(!s.includes(before)) throw new Error(`progress anchor not found: ${label}`);
  s = s.replace(before, after);
}

replaceRequired(
  "| 1A | Standalone IndexedDB shadow module | **DONE** | `shared/storage_shadow.js` + tests added | CI + integration hook |",
  "| 1A | Standalone IndexedDB shadow module | **DONE** | module + failure/coalescing tests; CI green | maintain under soak CI |",
  "phase 1A row"
);
replaceRequired(
  "| 1B | Shadow write hook from `storage.js` | **NOT STARTED** | localStorage still sole code path | add best-effort post-persist hook |",
  "| 1B | Shadow write hook from `storage.js` | **READY FOR SOAK** | best-effort post-legacy-success shadow write integrated on migration branch | real-browser equality soak |",
  "phase 1B row"
);
replaceRequired(
  "| 1C | Boot backfill | **NOT STARTED** | no automatic backfill yet | enqueue current legacy payload after boot |",
  "| 1C | Boot backfill | **READY FOR SOAK** | existing `q4b_store_v1` is mirrored after boot; no reverse restore | browser wipe/backfill test |",
  "phase 1C row"
);
replaceRequired(
  "| 1D | Developer diagnostics | **PARTIAL** | shadow module has verification primitives | expose through `QuestSave` without UI changes |",
  "| 1D | Developer diagnostics | **READY FOR SOAK** | `shadowStatus()`, `verifyShadow()`, `shadowSnapshotMeta()` exposed | use during household soak |",
  "phase 1D row"
);
replaceRequired(
  "| 1E | Automated regression + soak | **NOT STARTED** | existing tests present, no branch CI yet | add branch CI and run all storage regressions |",
  "| 1E | Automated regression + soak | **IN PROGRESS** | branch soak CI + full regression + public contract tests green; real-browser soak pending | sustained household/browser verification |",
  "phase 1E row"
);

replaceRequired("- [ ] Add branch-specific CI.", "- [x] Add branch-specific CI; now running in Phase 1 soak mode.", "CI checkbox");
replaceRequired("- [ ] Freeze/test the `QuestSave` public contract.", "- [x] Freeze/test the `QuestSave` public contract.", "contract checkbox");
replaceRequired("- [ ] Wire successful `persist()` to shadow queue.", "- [x] Wire successful `persist()` to shadow queue after authoritative legacy success.", "persist checkbox");
replaceRequired("- [ ] Add boot backfill.", "- [x] Add boot backfill (legacy → shadow only).", "backfill checkbox");
replaceRequired("- [ ] Expose developer-only verification through `QuestSave`.", "- [x] Expose developer-only verification through `QuestSave`.", "diagnostics checkbox");

replaceRequired(
  "**Status: DONE (code exists; CI still to be added)**",
  "**Status: DONE — standalone tests and branch CI green**",
  "phase 1A status"
);
replaceRequired("**Status: NOT STARTED**\n\nModify only the persistence boundary in `shared/storage.js`.", "**Status: READY FOR SOAK — integrated on `agent/storage-v2-shadow`**\n\nModify only the persistence boundary in `shared/storage.js`.", "phase 1B status");
replaceRequired("## Phase 1C — Boot backfill\n\n**Status: NOT STARTED**", "## Phase 1C — Boot backfill\n\n**Status: READY FOR SOAK — integrated, reverse restore intentionally absent**", "phase 1C status");
replaceRequired("## Phase 1D — Developer diagnostics\n\n**Status: PARTIAL**", "## Phase 1D — Developer diagnostics\n\n**Status: READY FOR SOAK — integrated and covered by regression tests**", "phase 1D status");
replaceRequired("## Phase 1E — Regression CI and real-use soak\n\n**Status: NOT STARTED**", "## Phase 1E — Regression CI and real-use soak\n\n**Status: IN PROGRESS — automated portion green; real-browser/household soak remains**", "phase 1E status");

replaceRequired("- [ ] branch CI executes the shadow tests successfully.", "- [x] branch CI executes the shadow tests successfully.", "1A exit CI");
replaceRequired("- [ ] all legacy save tests unchanged/green;", "- [x] all legacy save tests unchanged/green;", "1B exit legacy tests");
replaceRequired("- [ ] `persist()` return behavior unchanged;", "- [x] `persist()` return behavior unchanged in automated regression/integration tests;", "1B exit persist");
replaceRequired("- [ ] IndexedDB blocked/unavailable does not alter legacy save result;", "- [x] IndexedDB blocked/unavailable does not alter legacy save result in failure-isolation tests;", "1B exit failure");
replaceRequired("- [ ] rapid repeated saves coalesce shadow writes;", "- [x] rapid repeated saves coalesce shadow writes;", "1B exit coalesce");
replaceRequired("- [ ] generation written to shadow corresponds to the successfully persisted legacy generation.", "- [x] generation written to shadow corresponds to the successfully persisted legacy generation in integration tests.", "1B exit generation");
replaceRequired("- [ ] old localStorage-only fixture produces shadow after boot;", "- [x] old localStorage-only fixture produces shadow after boot in integration test;", "1C fixture");
replaceRequired("- [ ] no user-visible prompt;", "- [x] no user-visible prompt is introduced by the backfill path;", "1C prompt");
replaceRequired("- [ ] deleting legacy localStorage does **not** restore from IndexedDB in Phase 1.", "- [x] code/CI authority guard confirms there is no IndexedDB → legacy automatic restore path in Phase 1; browser-level destructive test still belongs to soak.", "1C restore");
replaceRequired("- [ ] one console call can prove current shadow equality;", "- [x] `QuestSave.verifyShadow()` can prove current shadow equality;", "1D verify");
replaceRequired("- [ ] mismatch is diagnostic-only;", "- [x] mismatch is diagnostic-only;", "1D mismatch");
replaceRequired("- [ ] diagnostics never mutate either copy;", "- [x] diagnostics never mutate either copy by design/test;", "1D mutate");
replaceRequired("- [ ] unsupported IndexedDB produces structured result rather than an uncaught exception.", "- [x] unsupported/failing IndexedDB produces structured diagnostics rather than an uncaught exception.", "1D unsupported");
replaceRequired("- [ ] branch CI green;", "- [x] branch CI green;", "phase1 gate CI");
replaceRequired("- [ ] public `QuestSave` contract test green;", "- [x] public `QuestSave` contract test green;", "phase1 gate contract");
replaceRequired("- [ ] no shadow failure can affect legacy persistence;", "- [x] automated failure-isolation test confirms shadow failure does not affect legacy persistence;", "phase1 gate failure");
replaceRequired("- [ ] rollback is still simply “disable shadow hook”.", "- [x] rollback is still simply “disable shadow hook”; localStorage remains sole authority.", "phase1 gate rollback");

replaceRequired(
  "Next recommended implementation step: branch CI + `QuestSave` contract test, then Phase 1B hook.",
  "Next recommended implementation step: real-browser/household Phase 1 soak using `QuestSave.verifyShadow()`, while continuing Komorebi work on `main`. Do not start Phase 2 authority promotion until soak exit criteria pass.",
  "next step"
);

s += `\n\n### 2026-08-17 — Phase 1B/1C/1D promoted to migration branch\n\n- Branch CI and QuestSave contract regression were established and green.\n- The deterministic integration preview was tested repeatedly against the full Node regression suite before promotion.\n- The guarded shallow-checkout promotion workflow re-applied the exact patch, ran diff validation and the full regression suite, then committed the tested `shared/storage.js` to `agent/storage-v2-shadow`.\n- `shared/storage.js` now queues a best-effort IndexedDB shadow only after successful legacy persistence, performs boot backfill from legacy to shadow, and exposes read-only shadow diagnostics.\n- `localStorage/q4b_store_v1` remains the sole gameplay authority. There is no IndexedDB-to-legacy automatic restore path in Phase 1.\n- CI was then switched from integration-preview mode to Phase 1 soak mode, where every branch push verifies the authority invariant and runs the full Node regression suite.\n- Remaining Phase 1 gate: real-browser/household soak and destructive browser scenarios (IndexedDB wipe/backfill, sustained checksum equality).\n`;

fs.writeFileSync(file, s);
console.log("Updated storage-v2 Phase 1 progress tracker");
