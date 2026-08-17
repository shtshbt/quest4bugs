(function(global){
  "use strict";

  /*
   * Quest4Bugs storage-v2 Phase 1 shadow mirror.
   *
   * Safety contract:
   * - This module is never authoritative in Phase 1.
   * - It never reads into gameplay state and never repairs localStorage.
   * - IndexedDB failures are contained here and must not affect QuestSave.
   * - Callers pass the already-serialized authoritative q4b_store_v1 payload.
   */

  var DB_NAME = "q4b_shadow_v1";
  var DB_VERSION = 1;
  var OBJECT_STORE = "snapshots";
  var RECORD_ID = "authoritative";
  var MIRROR_SCHEMA = 1;
  var DEFAULT_DEBOUNCE_MS = 250;

  var dbPromise = null;
  var pending = null;
  var timer = null;
  var writing = null;
  var lastSuccessAt = 0;
  var lastErrorAt = 0;
  var lastError = null;
  var lastGeneration = null;
  var lastChecksum = null;

  function supported(){
    return !!(global && global.indexedDB && typeof global.indexedDB.open === "function");
  }

  function byteLength(text){
    text = String(text == null ? "" : text);
    try{
      if(typeof global.TextEncoder === "function") return new global.TextEncoder().encode(text).length;
    }catch(_){}
    try{ return unescape(encodeURIComponent(text)).length; }catch(_){ return text.length; }
  }

  /* Deterministic FNV-1a style 32-bit checksum. This is an equality diagnostic,
     not a cryptographic integrity primitive. Phase 2 may add SHA-256 before the
     mirror becomes authoritative. */
  function checksum(text){
    text = String(text == null ? "" : text);
    var h = 0x811c9dc5;
    for(var i=0;i<text.length;i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  function makeRecord(payload, generation){
    payload = String(payload == null ? "" : payload);
    return {
      id: RECORD_ID,
      mirrorSchema: MIRROR_SCHEMA,
      sourceStoreKey: "q4b_store_v1",
      sourceGeneration: generation == null ? null : String(generation),
      writtenAt: Date.now(),
      payload: payload,
      payloadBytes: byteLength(payload),
      checksum: checksum(payload)
    };
  }

  function openDb(){
    if(!supported()) return Promise.reject(new Error("IndexedDB unavailable"));
    if(dbPromise) return dbPromise;
    dbPromise = new Promise(function(resolve, reject){
      var req;
      try{ req = global.indexedDB.open(DB_NAME, DB_VERSION); }
      catch(e){ reject(e); return; }
      req.onupgradeneeded = function(){
        var db = req.result;
        if(!db.objectStoreNames.contains(OBJECT_STORE)) db.createObjectStore(OBJECT_STORE, {keyPath:"id"});
      };
      req.onsuccess = function(){
        var db = req.result;
        try{
          db.onversionchange = function(){
            try{ db.close(); }catch(_){}
            dbPromise = null;
          };
        }catch(_){}
        resolve(db);
      };
      req.onerror = function(){ reject(req.error || new Error("IndexedDB open failed")); };
      req.onblocked = function(){ reject(new Error("IndexedDB open blocked")); };
    }).catch(function(err){
      dbPromise = null;
      throw err;
    });
    return dbPromise;
  }

  function putRecord(record){
    return openDb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx;
        try{ tx = db.transaction(OBJECT_STORE, "readwrite"); }
        catch(e){ reject(e); return; }
        tx.oncomplete = function(){ resolve(record); };
        tx.onerror = function(){ reject(tx.error || new Error("IndexedDB shadow write failed")); };
        tx.onabort = function(){ reject(tx.error || new Error("IndexedDB shadow write aborted")); };
        try{ tx.objectStore(OBJECT_STORE).put(record); }
        catch(e2){ reject(e2); }
      });
    });
  }

  function getRecord(){
    return openDb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx, req;
        try{
          tx = db.transaction(OBJECT_STORE, "readonly");
          req = tx.objectStore(OBJECT_STORE).get(RECORD_ID);
        }catch(e){ reject(e); return; }
        req.onsuccess = function(){ resolve(req.result || null); };
        req.onerror = function(){ reject(req.error || new Error("IndexedDB shadow read failed")); };
      });
    });
  }

  function _recordFailure(err){
    lastErrorAt = Date.now();
    lastError = (err && err.message) ? String(err.message) : String(err || "unknown error");
    try{
      if(global.console && console.warn) console.warn("[Q4BShadowStorage] " + lastError);
    }catch(_){}
  }

  async function _drain(){
    if(timer){ clearTimeout(timer); timer = null; }
    if(!supported()) return {supported:false, written:false};
    if(writing){
      try{ await writing; }catch(_){}
    }
    while(pending){
      var record = pending;
      pending = null;
      writing = putRecord(record);
      try{
        await writing;
        lastSuccessAt = Date.now();
        lastGeneration = record.sourceGeneration;
        lastChecksum = record.checksum;
        lastError = null;
      }catch(err){
        _recordFailure(err);
      }finally{
        writing = null;
      }
    }
    return {
      supported:true,
      written:!!lastSuccessAt,
      lastSuccessAt:lastSuccessAt,
      lastGeneration:lastGeneration,
      lastChecksum:lastChecksum,
      error:lastError
    };
  }

  function queue(payload, generation, opts){
    opts = opts || {};
    if(!supported()) return false;
    pending = makeRecord(payload, generation);
    if(timer) clearTimeout(timer);
    var delay = Number.isFinite(opts.debounceMs) ? Math.max(0, opts.debounceMs) : DEFAULT_DEBOUNCE_MS;
    timer = setTimeout(function(){ _drain().catch(_recordFailure); }, delay);
    return true;
  }

  function flush(){
    return _drain();
  }

  async function latest(){
    if(!supported()) return null;
    try{ return await getRecord(); }
    catch(err){ _recordFailure(err); return null; }
  }

  async function verify(payload, generation, opts){
    opts = opts || {};
    payload = String(payload == null ? "" : payload);
    if(!supported()){
      return {supported:false, exists:false, match:false, error:"IndexedDB unavailable"};
    }
    if(opts.flush !== false) await flush();
    var record = await latest();
    if(!record){
      return {supported:true, exists:false, match:false, error:lastError};
    }
    var expectedChecksum = checksum(payload);
    var expectedBytes = byteLength(payload);
    var generationString = generation == null ? null : String(generation);
    var generationMatch = generationString === null || record.sourceGeneration === generationString;
    var payloadMatch = record.payloadBytes === expectedBytes && record.checksum === expectedChecksum && record.payload === payload;
    return {
      supported:true,
      exists:true,
      match:!!(generationMatch && payloadMatch),
      generationMatch:generationMatch,
      payloadMatch:payloadMatch,
      sourceGeneration:generationString,
      shadowGeneration:record.sourceGeneration,
      authoritativeBytes:expectedBytes,
      shadowBytes:record.payloadBytes,
      authoritativeChecksum:expectedChecksum,
      shadowChecksum:record.checksum,
      lastShadowWriteAt:record.writtenAt || 0,
      error:lastError
    };
  }

  function status(){
    return {
      supported:supported(),
      pending:!!pending,
      writing:!!writing,
      lastSuccessAt:lastSuccessAt,
      lastErrorAt:lastErrorAt,
      lastError:lastError,
      lastGeneration:lastGeneration,
      lastChecksum:lastChecksum,
      dbName:DB_NAME,
      mirrorSchema:MIRROR_SCHEMA
    };
  }

  global.Q4BStorageShadow = {
    supported:supported,
    queue:queue,
    flush:flush,
    latest:latest,
    verify:verify,
    status:status
  };
})(window);
