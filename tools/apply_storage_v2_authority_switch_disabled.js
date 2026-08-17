"use strict";

/*
 * Adds the complete Phase 2 read-authority bootstrap/restore path to storage.js
 * with the hard gate __authorityReadsEnabled=false.
 *
 * The resulting committed source is behaviorally still rehearsal mode. Tests may
 * flip the constant only inside a VM/browser test copy to exercise the future
 * authority path. Production/household branch code stays disabled until soak.
 */

const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "..", "shared", "storage.js");
let source = fs.readFileSync(file, "utf8");

if(source.includes("storage-v2 Phase 2 read-authority switch (disabled)")){
  throw new Error("disabled Phase 2 read-authority switch already integrated");
}
if(!source.includes("storage-v2 Phase 2 authority rehearsal")){
  throw new Error("Phase 2 rehearsal must be integrated first");
}

function replaceOnce(label,before,after){
  const pos=source.indexOf(before);
  if(pos<0) throw new Error("authority switch patch anchor missing: "+label);
  if(source.indexOf(before,pos+before.length)>=0) throw new Error("authority switch patch anchor not unique: "+label);
  source=source.slice(0,pos)+after+source.slice(pos+before.length);
}

const helpers = `
  /* ---------------- storage-v2 Phase 2 read-authority switch (disabled) ----------------
     Hard gate stays false until sustained household rehearsal passes. Everything below
     is already testable by flipping the constant only in an isolated test copy. */
  var __authorityReadsEnabled=false;
  var AUTHORITY_RECEIPT_KEY="q4b_storage_v2_idb_receipt_v1";
  var AUTHORITY_RESTORE_TXN_KEY="q4b_storage_v2_restore_txn_v1";
  var __authorityBootstrapPending=false;
  var __authorityBootstrapPlan=null;
  var __authorityRestoreRecovery=null;
  var __authorityBootstrapBlockedWrites=0;

  function _storageV2FastChecksum(text){
    text=String(text==null?"":text);
    var h=0x811c9dc5;
    for(var i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
    return ("00000000"+h.toString(16)).slice(-8);
  }
  function _readAuthorityReceipt(){
    var raw=safeGet(AUTHORITY_RECEIPT_KEY,null), r=null;
    if(!raw)return null;
    try{r=JSON.parse(raw);}catch(_){return null;}
    if(!r||r.v!==1||!/^\\d+$/.test(String(r.generation||""))||!r.checksum)return null;
    return r;
  }
  function _writeAuthorityReceipt(payload,generation,result){
    if(!result||!result.ok||payload==null)return false;
    var receipt={v:1,generation:String(generation==null?"0":generation),checksum:_storageV2FastChecksum(payload),
      sha256:result.sha256||null,committedAt:Date.now()};
    return safeSet(AUTHORITY_RECEIPT_KEY,JSON.stringify(receipt));
  }
  function _authorityCacheHint(){
    var receipt=_readAuthorityReceipt(), payload=safeGet(STORE_KEY,null), generation=_storeGeneration();
    if(!receipt)return {state:"unknown",legacyExists:payload!==null,legacyGeneration:String(generation)};
    if(payload===null)return {state:"authority-newer-hint",legacyExists:false,legacyGeneration:String(generation),receiptGeneration:receipt.generation};
    var lg=parseInt(generation,10)||0, rg=parseInt(receipt.generation,10)||0;
    if(lg>rg)return {state:"wal-newer",legacyExists:true,legacyGeneration:String(generation),receiptGeneration:receipt.generation};
    if(lg<rg)return {state:"authority-newer-hint",legacyExists:true,legacyGeneration:String(generation),receiptGeneration:receipt.generation};
    var cs=_storageV2FastChecksum(payload);
    if(cs===String(receipt.checksum))return {state:"matched",legacyExists:true,legacyGeneration:String(generation),receiptGeneration:receipt.generation,checksum:cs};
    return {state:"same-generation-receipt-mismatch",legacyExists:true,legacyGeneration:String(generation),receiptGeneration:receipt.generation,legacyChecksum:cs,receiptChecksum:receipt.checksum};
  }
  function _captureLegacyForRestore(){
    var p=safeGet(STORE_KEY,null);
    return {exists:p!==null,payload:p,generation:_storeGeneration()};
  }
  function _validRestoreTxn(m){
    return !!(m&&m.v===1&&m.old&&m.next&&/^\\d+$/.test(String(m.old.generation||"0"))&&/^\\d+$/.test(String(m.next.generation||""))&&typeof m.next.payload==="string");
  }
  function _restoreOldFromTxn(m){
    var ok=true;
    if(m.old.exists){
      ok=safeSet(STORE_KEY,String(m.old.payload))&&ok;
      ok=safeSet(STORE_GEN_KEY,String(m.old.generation||"0"))&&ok;
    }else{
      ok=safeRemove(STORE_KEY)&&ok;
      ok=safeSet(STORE_GEN_KEY,String(m.old.generation||"0"))&&ok;
    }
    var p=safeGet(STORE_KEY,null), g=_storeGeneration();
    if(m.old.exists)ok=ok&&p===String(m.old.payload)&&g===String(m.old.generation||"0");
    else ok=ok&&p===null&&g===String(m.old.generation||"0");
    return ok;
  }
  function _recoverAuthorityRestoreTxn(){
    var raw=safeGet(AUTHORITY_RESTORE_TXN_KEY,null), m=null;
    if(!raw)return {state:"none"};
    try{m=JSON.parse(raw);}catch(_){return {state:"invalid-marker",recovered:false};}
    if(!_validRestoreTxn(m))return {state:"invalid-marker",recovered:false};
    var p=safeGet(STORE_KEY,null), g=_storeGeneration();
    if(p===m.next.payload&&g===String(m.next.generation)){
      safeRemove(AUTHORITY_RESTORE_TXN_KEY);
      return {state:"completed-cleanup",recovered:true,generation:g};
    }
    if((m.old.exists?p===String(m.old.payload):p===null)&&g===String(m.old.generation||"0")){
      safeRemove(AUTHORITY_RESTORE_TXN_KEY);
      return {state:"old-state-cleanup",recovered:true,generation:g};
    }
    var rolledBack=_restoreOldFromTxn(m);
    if(rolledBack)safeRemove(AUTHORITY_RESTORE_TXN_KEY);
    return {state:rolledBack?"partial-rollback":"partial-rollback-failed",recovered:rolledBack,generation:_storeGeneration()};
  }
  function _applyAuthorityCacheRestore(plan){
    if(!__authorityReadsEnabled)return {ok:false,applied:false,reason:"read-authority-disabled"};
    if(!plan||!plan.ok||plan.action!=="restore-cache-from-authority")return {ok:false,applied:false,reason:"not-a-restore-plan"};
    if(!plan.cryptoVerified)return {ok:false,applied:false,reason:"authority-not-cryptographically-verified"};
    var candidate=null;
    try{candidate=JSON.parse(String(plan.payload));}catch(_){return {ok:false,applied:false,reason:"authority-payload-invalid-json"};}
    if(!candidate||typeof candidate!=="object"||!Array.isArray(candidate.profiles)||!candidate.kv||typeof candidate.kv!=="object")return {ok:false,applied:false,reason:"authority-payload-invalid-shape"};
    var old=_captureLegacyForRestore();
    var marker={v:1,startedAt:Date.now(),old:old,next:{payload:String(plan.payload),generation:String(plan.generation),checksum:String(plan.checksum||"")}};
    if(!safeSet(AUTHORITY_RESTORE_TXN_KEY,JSON.stringify(marker)))return {ok:false,applied:false,reason:"restore-marker-write-failed"};
    var payloadOk=safeSet(STORE_KEY,marker.next.payload);
    var generationOk=payloadOk&&safeSet(STORE_GEN_KEY,marker.next.generation);
    var exact=generationOk&&safeGet(STORE_KEY,null)===marker.next.payload&&_storeGeneration()===marker.next.generation;
    if(!exact){
      var recovery=_recoverAuthorityRestoreTxn();
      return {ok:false,applied:false,reason:"restore-write-failed",recovery:recovery};
    }
    safeRemove(AUTHORITY_RESTORE_TXN_KEY);
    _writeAuthorityReceipt(marker.next.payload,marker.next.generation,plan);
    _discardStore();
    loadStore();
    return {ok:true,applied:true,generation:marker.next.generation};
  }
  function _reconcileAuthorityBootstrap(){
    return _loadAuthorityCandidate().then(async function(api){
      if(!api){__authorityBootstrapPlan={ok:false,action:"candidate-unavailable",error:__authorityLoadError};return __authorityBootstrapPlan;}
      var payload=safeGet(STORE_KEY,null), generation=_storeGeneration();
      var plan=await api.reconcile(payload,generation);
      __authorityBootstrapPlan=plan;
      if(plan&&plan.ok&&payload!==null&&(plan.action==="matched"||plan.action==="seed-from-legacy"||plan.action==="replay-wal"||plan.action==="repair-corrupt-authority")){
        _writeAuthorityReceipt(payload,generation,plan);
      }
      if(__authorityReadsEnabled&&plan&&plan.ok&&plan.action==="restore-cache-from-authority"){
        var applied=_applyAuthorityCacheRestore(plan);
        __authorityBootstrapPending=false;
        if(applied&&applied.ok){
          try{if(global.location&&typeof global.location.reload==="function")setTimeout(function(){global.location.reload();},0);}catch(_){}
        }
        return Object.assign({},plan,{restoreResult:applied});
      }
      __authorityBootstrapPending=false;
      return plan;
    }).catch(function(e){
      __authorityBootstrapPending=false;
      __authorityBootstrapPlan={ok:false,action:"bootstrap-exception",error:(e&&e.message)||String(e)};
      return __authorityBootstrapPlan;
    });
  }
  function authorityPromotionStatus(){
    return {enabled:__authorityReadsEnabled,bootstrapPending:__authorityBootstrapPending,blockedWrites:__authorityBootstrapBlockedWrites,
      cacheHint:_authorityCacheHint(),lastPlan:__authorityBootstrapPlan,restoreRecovery:__authorityRestoreRecovery};
  }
  function authorityReconcileNow(){return _reconcileAuthorityBootstrap();}
  function authorityReadSwitchEnabled(){return __authorityReadsEnabled;}
`;

replaceOnce(
  "insert disabled switch helpers",
  "\n  function now(){return Date.now();}\n",
  helpers+"\n  function now(){return Date.now();}\n"
);

replaceOnce(
  "record successful authority rehearsal receipt",
  `          __authorityLastResult=await api.commit(next.payload,next.generation,{reason:"phase1-rehearsal"});\n          __authorityLastCommitAt=Date.now();\n`,
  `          __authorityLastResult=await api.commit(next.payload,next.generation,{reason:"phase1-rehearsal"});\n          __authorityLastCommitAt=Date.now();\n          if(__authorityLastResult&&__authorityLastResult.ok)_writeAuthorityReceipt(next.payload,next.generation,__authorityLastResult);\n`
);

replaceOnce(
  "block writes during future authority bootstrap",
  `  function persist(){\n    if(!mem) return true;\n`,
  `  function persist(){\n    if(__authorityReadsEnabled&&__authorityBootstrapPending){\n      __authorityBootstrapBlockedWrites++;\n      return false;\n    }\n    if(!mem) return true;\n`
);

replaceOnce(
  "authority-aware init",
  `  /* ---------------- init ---------------- */\n  loadStore();\n  /* Phase 1C: existing legacy saves receive a mirror without a gameplay write.\n     This is backfill only; no IndexedDB -> localStorage restoration exists here. */\n  _shadowBackfill();\n  /* Phase 2 rehearsal: seed/replay candidate from the current synchronous WAL.\n     Candidate state is never read back into gameplay during Phase 1. */\n  (function(){var p=safeGet(STORE_KEY,null);if(p!==null)_queueAuthorityCandidate(p,_storeGeneration());})();\n`,
  `  /* ---------------- init ---------------- */\n  /* Future authority-mode crash recovery is safe to run even while the hard gate is off:\n     no marker exists unless an authority cache-restore transaction had started. */\n  __authorityRestoreRecovery=_recoverAuthorityRestoreTxn();\n  if(__authorityReadsEnabled){\n    var __authorityInitialHint=_authorityCacheHint();\n    __authorityBootstrapPending=!(__authorityInitialHint.state==="matched"||__authorityInitialHint.state==="wal-newer");\n  }\n  loadStore();\n  /* Phase 1C: existing legacy saves receive a mirror without a gameplay write. */\n  _shadowBackfill();\n  if(__authorityReadsEnabled){\n    _reconcileAuthorityBootstrap();\n  }else{\n    /* Rehearsal remains write-only toward the candidate authority. */\n    (function(){var p=safeGet(STORE_KEY,null);if(p!==null)_queueAuthorityCandidate(p,_storeGeneration());})();\n  }\n`
);

replaceOnce(
  "expose disabled promotion diagnostics",
  `    // storage-v2 Phase 2 rehearsal diagnostics (candidate never feeds gameplay in Phase 1)\n    authorityCandidateStatus:authorityCandidateStatus, verifyAuthorityCandidate:verifyAuthorityCandidate, authorityCandidateSnapshotMeta:authorityCandidateSnapshotMeta,\n    // legacy compat\n`,
  `    // storage-v2 Phase 2 rehearsal diagnostics (candidate never feeds gameplay while hard gate=false)\n    authorityCandidateStatus:authorityCandidateStatus, verifyAuthorityCandidate:verifyAuthorityCandidate, authorityCandidateSnapshotMeta:authorityCandidateSnapshotMeta,\n    // storage-v2 Phase 2 promotion diagnostics; switch is compile-time disabled pending soak\n    authorityPromotionStatus:authorityPromotionStatus, authorityReconcileNow:authorityReconcileNow, authorityReadSwitchEnabled:authorityReadSwitchEnabled,\n    // legacy compat\n`
);

fs.writeFileSync(file,source);
console.log("Applied disabled storage-v2 Phase 2 read-authority switch scaffold");
