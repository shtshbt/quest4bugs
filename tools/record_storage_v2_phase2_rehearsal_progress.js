"use strict";

const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "..", ".claude_plan", "storage_v2_shadow_migration.md");
let s = fs.readFileSync(file, "utf8");

function replaceRequired(before, after, label){
  if(!s.includes(before)) throw new Error("progress anchor not found: " + label);
  s = s.replace(before, after);
}

replaceRequired(
  "| 1E | Automated regression + soak | **IN PROGRESS** | branch soak CI + full regression + public contract tests green; real-browser soak pending | sustained household/browser verification |",
  "| 1E | Automated regression + soak | **IN PROGRESS** | Node regressions + public contract + real Chromium IndexedDB smoke green; sustained household soak remains | sustained household verification |",
  "phase 1E row"
);
replaceRequired(
  "| 2A | IndexedDB becomes local read authority | **NOT STARTED** | prohibited during Phase 1 | requires Phase 1 soak exit criteria |",
  "| 2A | IndexedDB becomes local read authority | **IN PROGRESS** | authority candidate + WAL reconciliation + rollback record implemented and rehearsed as non-authoritative second shadow; read switch still disabled | sustained rehearsal equality, then explicit read-authority promotion |",
  "phase 2A row"
);

if(!s.includes("- [x] Real Chromium IndexedDB smoke")){
  replaceRequired(
    "- [ ] Perform real-browser soak before changing read authority.",
    "- [x] Real Chromium IndexedDB smoke: legacy→shadow backfill, no reverse restore, and Phase 2 candidate reconciliation.\n- [ ] Perform sustained household soak before changing read authority.",
    "browser soak checklist"
  );
}

const phase2Heading = "# PHASE 2 — Promote IndexedDB to local authority\n";
if(!s.includes("## Phase 2 compatibility decision — IndexedDB authority + localStorage WAL/cache")){
  const insert = [
    "",
    "## Phase 2 compatibility decision — IndexedDB authority + localStorage WAL/cache",
    "",
    "**Status: IMPLEMENTED AS CANDIDATE / REHEARSAL; NOT YET GAMEPLAY AUTHORITY**",
    "",
    "A pure localStorage→IndexedDB replacement is not compatible with the current QuestSave surface because IndexedDB is asynchronous while several existing callers depend on synchronous in-memory/local persistence semantics. The promotion architecture therefore uses:",
    "",
    "```text",
    "synchronous QuestSave mutation",
    "        |",
    "        v",
    "localStorage q4b_store_v1 + q4b_store_gen   <- WAL / boot cache / rollback path",
    "        | exact successful generation",
    "        v",
    "IndexedDB q4b_local_v2                       <- durable candidate authority",
    "```",
    "",
    "Boot reconciliation rules are deterministic:",
    "",
    "1. no IDB authority + valid legacy WAL → seed IDB from legacy;",
    "2. legacy generation newer than IDB → replay WAL into IDB;",
    "3. IDB generation newer than legacy → return a cache-restore plan, but do not apply it during Phase 1 rehearsal;",
    "4. same generation + same payload → matched;",
    "5. same generation + different payload → stop as conflict; never guess;",
    "6. every authority replacement preserves the previous authority record as an IndexedDB rollback record;",
    "7. SHA-256 plus deterministic checksum/byte length are recorded for integrity diagnostics.",
    "",
    "During rehearsal, storage.js only queues successful legacy generations into the candidate IDB through a serialized/coalescing queue. Candidate records are never read into gameplay state.",
    ""
  ].join("\n");
  replaceRequired(phase2Heading, phase2Heading + insert + "\n", "phase 2 compatibility section");
}

if(!s.includes("### 2026-08-17 — Phase 2 authority candidate rehearsal")){
  s += [
    "",
    "",
    "### 2026-08-17 — Phase 2 authority candidate rehearsal",
    "",
    "- Added shared/storage_authority.js with validated canonical snapshots, generation ordering, SHA-256, rollback record preservation, and deterministic WAL reconciliation.",
    "- Added Node tests covering seed, normal commit, stale rejection, same-generation divergence, rollback, WAL replay, authority-newer restore planning, and IndexedDB failure containment.",
    "- Added real Chromium tests for Phase 1 backfill/no-reverse-restore and the Phase 2 candidate using the browser's actual IndexedDB implementation.",
    "- Added deterministic rehearsal wiring: successful legacy saves are coalesced and copied to q4b_local_v2, but candidate data never feeds gameplay during Phase 1.",
    "- Remaining hard gate for actual read-authority switch: sustained household rehearsal with no unexplained generation/checksum divergence.",
    ""
  ].join("\n");
}

fs.writeFileSync(file, s);
console.log("Updated storage-v2 Phase 2 rehearsal progress tracker");
