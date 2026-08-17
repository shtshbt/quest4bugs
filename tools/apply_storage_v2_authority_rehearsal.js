"use strict";

/*
 * Deterministically adds the Phase 2 authority-candidate rehearsal wiring to
 * shared/storage.js. The rehearsal is still non-authoritative: localStorage
 * remains the only gameplay read authority, while q4b_local_v2 receives the
 * same successful generations as a second shadow/WAL target.
 *
 * This patcher is used in CI before any branch promotion. It fails closed when
 * the expected Phase 1 anchors move.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "shared/storage.js");
let source = fs.readFileSync(file, "utf8");

if(source.includes("storage-v2 Phase 2 authority rehearsal")){
  throw new Error("Phase 2 authority rehearsal is already integrated");
}

function replaceOnce(label, before, after){
  const first = source.indexOf(before);
  if(first < 0) throw new Error(`Phase2 rehearsal patch anchor not found: ${label}`);
  if(source.indexOf(before, first + before.length) >= 0) throw new Error(`Phase2 rehearsal patch anchor is not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

const helperAnchor = `  function shadowSnapshotMeta(){\n    return _loadShadow().then(function(shadow){\n      if(!shadow)return {supported:false,exists:false,error:__shadowLoadError||\"shadow module unavailable\"};\n      return shadow.latest().then(function(r){\n        if(!r)return {supported:true,exists:false};\n        return {supported:true,exists:true,mirrorSchema:r.mirrorSchema,sourceGeneration:r.sourceGeneration,\n          writtenAt:r.writtenAt,payloadBytes:r.payloadBytes,checksum:r.checksum};\n      });\n    });\n  }\n\n  function now(){return Date.now();}\n`;

const helperReplacement = `  function shadowSnapshotMeta(){\n    return _loadShadow().then(function(shadow){\n      if(!shadow)return {supported:false,exists:false,error:__shadowLoadError||\"shadow module unavailable\"};\n      return shadow.latest().then(function(r){\n        if(!r)return {supported:true,exists:false};\n        return {supported:true,exists:true,mirrorSchema:r.mirrorSchema,sourceGeneration:r.sourceGeneration,\n          writtenAt:r.writtenAt,payloadBytes:r.payloadBytes,checksum:r.checksum};\n      });\n    });\n  }\n\n  /* ---------------- storage-v2 Phase 2 authority rehearsal ----------------\n     This is still non-authoritative in Phase 1. The candidate IndexedDB receives\n     successful legacy generations through a serialized/coalescing queue so the\n     exact future WAL->IDB commit path is exercised without any gameplay reads. */\n  var __authorityLoadPromise=null;\n  var __authorityLoadError=null;\n  var __authorityPending=null;\n  var __authorityRunning=false;\n  var __authorityLastResult=null;\n  var __authorityLastCommitAt=0;\n  function _authorityScriptUrl(){\n    if(!__storageScriptSrc)return null;\n    return __storageScriptSrc.replace(/storage\\.js(?:\\?.*)?$/,\"storage_authority.js\");\n  }\n  function _loadAuthorityCandidate(){\n    if(global.Q4BStorageAuthorityCandidate)return Promise.resolve(global.Q4BStorageAuthorityCandidate);\n    if(__authorityLoadPromise)return __authorityLoadPromise;\n    var d=global.document, url=_authorityScriptUrl();\n    if(!d||!d.createElement||!url)return Promise.resolve(null);\n    __authorityLoadPromise=new Promise(function(resolve){\n      try{\n        var s=d.createElement(\"script\");\n        s.src=url; s.async=true;\n        s.onload=function(){ resolve(global.Q4BStorageAuthorityCandidate||null); };\n        s.onerror=function(){ __authorityLoadError=\"storage_authority.js load failed\"; resolve(null); };\n        var host=d.head||d.documentElement||d.body;\n        if(!host||!host.appendChild){ __authorityLoadError=\"no script host\"; resolve(null); return; }\n        host.appendChild(s);\n      }catch(e){ __authorityLoadError=(e&&e.message)||String(e); resolve(null); }\n    });\n    return __authorityLoadPromise;\n  }\n  function _drainAuthorityCandidate(){\n    if(__authorityRunning)return;\n    __authorityRunning=true;\n    _loadAuthorityCandidate().then(async function(api){\n      if(!api){ __authorityPending=null; return; }\n      while(__authorityPending){\n        var next=__authorityPending;\n        __authorityPending=null;\n        try{\n          __authorityLastResult=await api.commit(next.payload,next.generation,{reason:\"phase1-rehearsal\"});\n          __authorityLastCommitAt=Date.now();\n        }catch(e){\n          __authorityLoadError=(e&&e.message)||String(e);\n          __authorityLastResult={ok:false,reason:\"rehearsal-exception\",error:__authorityLoadError};\n        }\n      }\n    }).catch(function(e){\n      __authorityLoadError=(e&&e.message)||String(e);\n      __authorityPending=null;\n    }).then(function(){\n      __authorityRunning=false;\n      if(__authorityPending)_drainAuthorityCandidate();\n    });\n  }\n  function _queueAuthorityCandidate(payload,generation){\n    if(payload===null||payload===undefined)return false;\n    __authorityPending={payload:String(payload),generation:String(generation==null?\"0\":generation)};\n    _drainAuthorityCandidate();\n    return true;\n  }\n  function authorityCandidateStatus(){\n    return _loadAuthorityCandidate().then(function(api){\n      var base=api?api.status():{supported:false};\n      base.loaded=!!api;\n      base.pending=!!__authorityPending;\n      base.running=__authorityRunning;\n      base.loaderError=__authorityLoadError;\n      base.lastResult=__authorityLastResult;\n      base.lastCommitAt=__authorityLastCommitAt;\n      return base;\n    });\n  }\n  function verifyAuthorityCandidate(){\n    var payload=safeGet(STORE_KEY,null), generation=_storeGeneration();\n    return _loadAuthorityCandidate().then(function(api){\n      if(!api)return {supported:false,exists:false,match:false,error:__authorityLoadError||\"authority candidate unavailable\"};\n      return api.verifyLegacy(payload,generation);\n    });\n  }\n  function authorityCandidateSnapshotMeta(){\n    return _loadAuthorityCandidate().then(async function(api){\n      if(!api)return {supported:false,exists:false,error:__authorityLoadError||\"authority candidate unavailable\"};\n      var a=await api.authority(), r=await api.rollback();\n      function meta(x){return x?{generation:x.sourceGeneration,writtenAt:x.writtenAt,payloadBytes:x.payloadBytes,checksum:x.checksum,sha256:x.sha256||null}:null;}\n      return {supported:true,exists:!!a,authority:meta(a),rollback:meta(r)};\n    });\n  }\n\n  function now(){return Date.now();}\n`;

replaceOnce("authority rehearsal helpers", helperAnchor, helperReplacement);

replaceOnce(
  "persist authority rehearsal queue",
  `      _queueShadow(serialized,_storeGeneration());\n`,
  `      _queueShadow(serialized,_storeGeneration());\n      _queueAuthorityCandidate(serialized,_storeGeneration());\n`
);

replaceOnce(
  "boot authority rehearsal seed",
  `  _shadowBackfill();\n  /* PA-1: 起動時は同期成功実績で初期 status を決める。 lastSuccess があり 24h 以内\n`,
  `  _shadowBackfill();\n  /* Phase 2 rehearsal: seed/replay candidate from the current synchronous WAL.\n     Candidate state is never read back into gameplay during Phase 1. */\n  (function(){var p=safeGet(STORE_KEY,null);if(p!==null)_queueAuthorityCandidate(p,_storeGeneration());})();\n  /* PA-1: 起動時は同期成功実績で初期 status を決める。 lastSuccess があり 24h 以内\n`
);

replaceOnce(
  "QuestSave authority rehearsal diagnostics",
  `    // storage-v2 Phase 1 diagnostics (read-only; never restore)\n    shadowStatus:shadowStatus, verifyShadow:verifyShadow, shadowSnapshotMeta:shadowSnapshotMeta,\n    // legacy compat\n`,
  `    // storage-v2 Phase 1 diagnostics (read-only; never restore)\n    shadowStatus:shadowStatus, verifyShadow:verifyShadow, shadowSnapshotMeta:shadowSnapshotMeta,\n    // storage-v2 Phase 2 rehearsal diagnostics (candidate never feeds gameplay in Phase 1)\n    authorityCandidateStatus:authorityCandidateStatus, verifyAuthorityCandidate:verifyAuthorityCandidate, authorityCandidateSnapshotMeta:authorityCandidateSnapshotMeta,\n    // legacy compat\n`
);

fs.writeFileSync(file, source);
console.log("Applied storage-v2 Phase 2 authority rehearsal to shared/storage.js");
