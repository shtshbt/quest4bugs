"use strict";

const fs=require("node:fs");
const path=require("node:path");
const file=path.resolve(__dirname,"..",".claude_plan","storage_v2_shadow_migration.md");
let s=fs.readFileSync(file,"utf8");

function replaceIfPresent(before,after){if(s.includes(before))s=s.replace(before,after);}
function appendOnce(marker,text){if(!s.includes(marker))s+=text;}

replaceIfPresent(
  "| 2A | IndexedDB becomes local read authority | **IN PROGRESS** | authority candidate + WAL reconciliation + rollback record implemented and rehearsed as non-authoritative second shadow; read switch still disabled | sustained rehearsal equality, then explicit read-authority promotion |",
  "| 2A | IndexedDB becomes local read authority | **IN PROGRESS** | authority candidate, WAL reconciliation, cryptographic integrity checks, and crash-safe read-switch scaffold implemented; hard gate remains OFF | automatic readiness must pass (>=300 verified commits across >=3 active days), then explicit activation decision |"
);
replaceIfPresent(
  "| 2B | localStorage rollback mirror | **NOT STARTED** | existing store remains authoritative today | dual-write after promotion |",
  "| 2B | localStorage rollback mirror | **IN PROGRESS** | localStorage is currently authority/WAL; future IDB→cache restore is transaction-marker protected with rollback-on-partial-write | exercise under sustained rehearsal before authority activation |"
);
replaceIfPresent(
  "| 2C | migration/rollback hardening | **NOT STARTED** | export/import already exists | explicit IDB↔legacy recovery tests |",
  "| 2C | migration/rollback hardening | **IN PROGRESS** | stale/divergent generation rejection, SHA/checksum/byte validation, corrupt-IDB repair rules, rollback records, partial-restore recovery all automated/tested | household soak + final promotion gate |"
);

if(!s.includes("- [x] Phase 2 authority candidate is integrated as a non-authoritative second shadow.")){
  const anchor="- [x] Real Chromium IndexedDB smoke: legacy→shadow backfill, no reverse restore, and Phase 2 candidate reconciliation.\n";
  if(!s.includes(anchor))throw new Error("checklist anchor missing");
  s=s.replace(anchor,anchor+
    "- [x] Phase 2 authority candidate is integrated as a non-authoritative second shadow.\n"+
    "- [x] Disabled read-authority switch scaffold is integrated; hard gate is explicitly `false`.\n"+
    "- [x] Authority records are validated by schema, byte length, checksum, and SHA-256 before any future restore.\n"+
    "- [x] Partial authority→cache restore is transaction-marker protected and rolls back on failure/next boot.\n"+
    "- [x] Automatic sustained-soak metrics/readiness report is integrated; no automatic promotion is permitted.\n"
  );
}

const compatStatus="**Status: IMPLEMENTED AS CANDIDATE / REHEARSAL; NOT YET GAMEPLAY AUTHORITY**";
replaceIfPresent(compatStatus,"**Status: IMPLEMENTED THROUGH DISABLED READ-SWITCH SCAFFOLD; NOT YET GAMEPLAY AUTHORITY**");

appendOnce("### 2026-08-17 — Disabled read-authority switch + automatic soak gate",[
  "\n\n### 2026-08-17 — Disabled read-authority switch + automatic soak gate\n",
  "- Promoted the complete authority→local-cache bootstrap path into the migration branch with `__authorityReadsEnabled=false`; normal behavior therefore remains rehearsal-only.\n",
  "- Future restore is accepted only from a structurally valid, checksum/byte-valid and SHA-256-verified IndexedDB authority record.\n",
  "- Authority/local generation ordering is deterministic; same-generation divergence stops rather than guessing. Corrupt authority can be repaired only from an equal/newer valid WAL, with the raw corrupt record preserved as rollback evidence.\n",
  "- Cache restore uses `q4b_storage_v2_restore_txn_v1` so a failure/crash between payload and generation writes is rolled back before normal store load on the next boot.\n",
  "- Added `q4b_storage_v2_soak_stats_v1`, `QuestSave.storageV2SoakStats()` and `QuestSave.storageV2Readiness()`. No child/game payload is copied into the soak statistics record.\n",
  "- Current automatic readiness policy: current shadow match, current candidate match with cryptographic verification, zero candidate/verification failures, >=300 verified candidate commits, >=3 active days, no restore-recovery failure, and hard gate still OFF. Readiness is advisory only (`automaticPromotion:false`).\n",
  "- The remaining non-automatable gate is sustained normal household use on the migration branch. Do not flip the hard gate merely because unit/browser tests are green.\n"
].join(""));

fs.writeFileSync(file,s);
console.log("Updated storage-v2 progress through disabled read switch and soak metrics");
