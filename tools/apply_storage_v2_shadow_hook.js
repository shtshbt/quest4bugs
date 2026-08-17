"use strict";

/*
 * Deterministically applies the Phase 1B/1C/1D storage-v2 shadow integration
 * to shared/storage.js.
 *
 * This exists so CI can validate the exact intended integration before the
 * large shared/storage.js file itself is changed on the migration branch.
 * It is intentionally anchor-based and fails closed if main changes the
 * relevant storage boundaries.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "shared/storage.js");
let source = fs.readFileSync(file, "utf8");

function replaceOnce(label, before, after){
  const first = source.indexOf(before);
  if(first < 0) throw new Error(`Phase1 shadow patch anchor not found: ${label}`);
  if(source.indexOf(before, first + before.length) >= 0) throw new Error(`Phase1 shadow patch anchor is not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

const lowLevelAnchor = `  function safeRemove(key){\n    try{localStorage.removeItem(key);return true;}catch(e){return false;}\n  }\n  function now(){return Date.now();}\n`;

const lowLevelReplacement = `  function safeRemove(key){\n    try{localStorage.removeItem(key);return true;}catch(e){return false;}\n  }\n\n  /* ---------------- storage-v2 Phase 1 shadow mirror ----------------\n     localStorage remains authoritative. IndexedDB is best-effort only and is\n     never read into gameplay state in Phase 1. */\n  var __shadowLoadPromise=null;\n  var __shadowLoadError=null;\n  var __storageScriptSrc=(function(){\n    try{\n      var d=global.document, s=d&&d.currentScript;\n      if(s&&s.src)return String(s.src);\n      s=d&&d.querySelector&&d.querySelector('script[src*="shared/storage.js"]');\n      return s&&s.src?String(s.src):null;\n    }catch(_){return null;}\n  })();\n  function _shadowScriptUrl(){\n    if(!__storageScriptSrc)return null;\n    return __storageScriptSrc.replace(/storage\\.js(?:\\?.*)?$/,\"storage_shadow.js\");\n  }\n  function _loadShadow(){\n    if(global.Q4BStorageShadow)return Promise.resolve(global.Q4BStorageShadow);\n    if(__shadowLoadPromise)return __shadowLoadPromise;\n    var d=global.document, url=_shadowScriptUrl();\n    if(!d||!d.createElement||!url)return Promise.resolve(null);\n    __shadowLoadPromise=new Promise(function(resolve){\n      try{\n        var s=d.createElement(\"script\");\n        s.src=url; s.async=true;\n        s.onload=function(){ resolve(global.Q4BStorageShadow||null); };\n        s.onerror=function(){ __shadowLoadError=\"storage_shadow.js load failed\"; resolve(null); };\n        var host=d.head||d.documentElement||d.body;\n        if(!host||!host.appendChild){ __shadowLoadError=\"no script host\"; resolve(null); return; }\n        host.appendChild(s);\n      }catch(e){ __shadowLoadError=(e&&e.message)||String(e); resolve(null); }\n    });\n    return __shadowLoadPromise;\n  }\n  function _queueShadow(payload,generation){\n    try{\n      if(global.Q4BStorageShadow){ global.Q4BStorageShadow.queue(payload,generation); return; }\n      _loadShadow().then(function(shadow){\n        if(shadow)shadow.queue(payload,generation);\n      }).catch(function(e){ __shadowLoadError=(e&&e.message)||String(e); });\n    }catch(e){ __shadowLoadError=(e&&e.message)||String(e); }\n  }\n  function _shadowAuthoritativePayload(){ return safeGet(STORE_KEY,null); }\n  function _shadowBackfill(){\n    var payload=_shadowAuthoritativePayload();\n    if(payload!==null)_queueShadow(payload,_storeGeneration());\n  }\n  function shadowStatus(){\n    if(global.Q4BStorageShadow){\n      var s=global.Q4BStorageShadow.status();\n      if(__shadowLoadError&&!s.lastError)s.loaderError=__shadowLoadError;\n      return Promise.resolve(s);\n    }\n    return _loadShadow().then(function(shadow){\n      if(!shadow)return {supported:false,loaded:false,loaderError:__shadowLoadError};\n      var s=shadow.status(); s.loaded=true; return s;\n    });\n  }\n  function verifyShadow(){\n    var payload=_shadowAuthoritativePayload(), generation=_storeGeneration();\n    if(payload===null)return Promise.resolve({supported:!!global.indexedDB,exists:false,match:false,error:\"legacy authoritative store is absent\"});\n    return _loadShadow().then(function(shadow){\n      if(!shadow)return {supported:false,exists:false,match:false,error:__shadowLoadError||\"shadow module unavailable\"};\n      return shadow.verify(payload,generation);\n    });\n  }\n  function shadowSnapshotMeta(){\n    return _loadShadow().then(function(shadow){\n      if(!shadow)return {supported:false,exists:false,error:__shadowLoadError||\"shadow module unavailable\"};\n      return shadow.latest().then(function(r){\n        if(!r)return {supported:true,exists:false};\n        return {supported:true,exists:true,mirrorSchema:r.mirrorSchema,sourceGeneration:r.sourceGeneration,\n          writtenAt:r.writtenAt,payloadBytes:r.payloadBytes,checksum:r.checksum};\n      });\n    });\n  }\n\n  function now(){return Date.now();}\n`;

replaceOnce("low-level shadow helpers", lowLevelAnchor, lowLevelReplacement);

const persistAnchor = `  function persist(){\n    if(!mem) return true;\n    var ok = safeSet(STORE_KEY, JSON.stringify(mem));\n    if(ok){\n      var storedGeneration=parseInt(_storeGeneration(),10)||0;\n      var heldGeneration=parseInt(memGeneration,10)||0;\n      var nextGeneration=Math.max(storedGeneration,heldGeneration,now())+1;\n      if(safeSet(STORE_GEN_KEY,String(nextGeneration)))memGeneration=String(nextGeneration);\n    }\n`;

const persistReplacement = `  function persist(){\n    if(!mem) return true;\n    var serialized = JSON.stringify(mem);\n    var ok = safeSet(STORE_KEY, serialized);\n    if(ok){\n      var storedGeneration=parseInt(_storeGeneration(),10)||0;\n      var heldGeneration=parseInt(memGeneration,10)||0;\n      var nextGeneration=Math.max(storedGeneration,heldGeneration,now())+1;\n      if(safeSet(STORE_GEN_KEY,String(nextGeneration)))memGeneration=String(nextGeneration);\n      /* Phase 1: shadow is strictly post-legacy-success and never awaited. */\n      _queueShadow(serialized,_storeGeneration());\n    }\n`;

replaceOnce("persist shadow queue", persistAnchor, persistReplacement);

const initAnchor = `  /* ---------------- init ---------------- */\n  loadStore();\n`;
const initReplacement = `  /* ---------------- init ---------------- */\n  loadStore();\n  /* Phase 1C: existing legacy saves receive a mirror without a gameplay write.\n     This is backfill only; no IndexedDB -> localStorage restoration exists here. */\n  _shadowBackfill();\n`;
replaceOnce("boot backfill", initAnchor, initReplacement);

const apiAnchor = `    // bulk sync / backup\n    pushAll:pushAll, pullAll:pullAll, syncDown:syncDown, exportAll:exportAll, importAll:importAll,\n    // legacy compat\n`;
const apiReplacement = `    // bulk sync / backup\n    pushAll:pushAll, pullAll:pullAll, syncDown:syncDown, exportAll:exportAll, importAll:importAll,\n    // storage-v2 Phase 1 diagnostics (read-only; never restore)\n    shadowStatus:shadowStatus, verifyShadow:verifyShadow, shadowSnapshotMeta:shadowSnapshotMeta,\n    // legacy compat\n`;
replaceOnce("QuestSave shadow diagnostics", apiAnchor, apiReplacement);

fs.writeFileSync(file, source);
console.log("Applied storage-v2 Phase 1B/1C/1D integration to shared/storage.js");
