(function(global){
  "use strict";

  /*
   * Quest4Bugs storage-v2 Phase 2 authority candidate.
   *
   * The candidate is durable IndexedDB state, but storage.js still treats
   * localStorage as gameplay authority during rehearsal. This module therefore
   * focuses on the promotion contract: generation ordering, WAL reconciliation,
   * rollback preservation, and integrity verification.
   */

  var DB_NAME = "q4b_local_v2";
  var DB_VERSION = 1;
  var OBJECT_STORE = "records";
  var AUTHORITY_ID = "authority";
  var ROLLBACK_ID = "rollback";
  var PERSISTENCE_SCHEMA = 1;
  var dbPromise = null;
  var lastError = null;
  var lastErrorAt = 0;

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

  function checksum(text){
    text = String(text == null ? "" : text);
    var h = 0x811c9dc5;
    for(var i=0;i<text.length;i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  async function sha256(text){
    try{
      if(!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return null;
      var bytes = new global.TextEncoder().encode(String(text == null ? "" : text));
      var digest = await global.crypto.subtle.digest("SHA-256", bytes);
      var view = new Uint8Array(digest), out = "";
      for(var i=0;i<view.length;i++) out += ("0" + view[i].toString(16)).slice(-2);
      return out;
    }catch(_){ return null; }
  }

  function generationNumber(generation){
    var n = Number(generation);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function validatePayload(payload){
    payload = String(payload == null ? "" : payload);
    if(!payload) return {ok:false,error:"empty payload"};
    var obj;
    try{ obj = JSON.parse(payload); }
    catch(_){ return {ok:false,error:"invalid JSON"}; }
    if(!obj || typeof obj !== "object" || Array.isArray(obj)) return {ok:false,error:"store must be an object"};
    if(!Array.isArray(obj.profiles)) return {ok:false,error:"profiles must be an array"};
    if(!obj.kv || typeof obj.kv !== "object" || Array.isArray(obj.kv)) return {ok:false,error:"kv must be an object"};
    if(obj.tombstones != null && (typeof obj.tombstones !== "object" || Array.isArray(obj.tombstones))) return {ok:false,error:"tombstones must be an object"};
    if(obj.current != null && typeof obj.current !== "string") return {ok:false,error:"current must be string or null"};
    return {ok:true,store:obj};
  }

  function recordBasicIntegrity(record){
    if(!record || typeof record !== "object") return {ok:false,error:"record missing"};
    if(record.persistenceSchema !== PERSISTENCE_SCHEMA) return {ok:false,error:"persistence schema mismatch"};
    if(record.sourceStoreKey !== "q4b_store_v1") return {ok:false,error:"source store key mismatch"};
    if(typeof record.payload !== "string") return {ok:false,error:"payload missing"};
    var valid=validatePayload(record.payload);
    if(!valid.ok) return {ok:false,error:"payload invalid: "+valid.error};
    var actualBytes=byteLength(record.payload);
    if(Number(record.payloadBytes)!==actualBytes) return {ok:false,error:"payload byte length mismatch",expectedBytes:record.payloadBytes,actualBytes:actualBytes};
    var actualChecksum=checksum(record.payload);
    if(String(record.checksum||"")!==actualChecksum) return {ok:false,error:"checksum mismatch",expectedChecksum:record.checksum,actualChecksum:actualChecksum};
    var gen=String(record.sourceGeneration==null?"":record.sourceGeneration);
    if(!/^\d+$/.test(gen)) return {ok:false,error:"generation is not a non-negative integer"};
    return {ok:true,actualBytes:actualBytes,actualChecksum:actualChecksum,generation:gen};
  }

  async function verifyRecord(record){
    var basic=recordBasicIntegrity(record);
    if(!basic.ok) return Object.assign({exists:!!record,cryptoVerified:false,record:record||null},basic);
    var digest=await sha256(record.payload);
    var storedDigest=record.sha256==null?null:String(record.sha256);
    var cryptoVerified=!!(digest && storedDigest && digest===storedDigest);
    if(storedDigest && digest && digest!==storedDigest){
      return {exists:true,ok:false,cryptoVerified:false,error:"SHA-256 mismatch",expectedSha256:storedDigest,actualSha256:digest,record:record};
    }
    return {
      exists:true,
      ok:true,
      cryptoVerified:cryptoVerified,
      sha256Available:!!digest,
      sha256Stored:!!storedDigest,
      actualSha256:digest,
      record:record,
      generation:basic.generation,
      checksum:basic.actualChecksum,
      payloadBytes:basic.actualBytes
    };
  }

  function recordFailure(err){
    lastErrorAt = Date.now();
    lastError = (err && err.message) ? String(err.message) : String(err || "unknown error");
  }

  function openDb(){
    if(!supported()) return Promise.reject(new Error("IndexedDB unavailable"));
    if(dbPromise) return dbPromise;
    dbPromise = new Promise(function(resolve,reject){
      var req;
      try{ req = global.indexedDB.open(DB_NAME, DB_VERSION); }
      catch(e){ reject(e); return; }
      req.onupgradeneeded = function(){
        var db = req.result;
        if(!db.objectStoreNames.contains(OBJECT_STORE)) db.createObjectStore(OBJECT_STORE,{keyPath:"id"});
      };
      req.onsuccess = function(){
        var db = req.result;
        try{ db.onversionchange = function(){ try{db.close();}catch(_){} dbPromise=null; }; }catch(_){}
        resolve(db);
      };
      req.onerror = function(){ reject(req.error || new Error("IndexedDB open failed")); };
      req.onblocked = function(){ reject(new Error("IndexedDB open blocked")); };
    }).catch(function(err){ dbPromise=null; recordFailure(err); throw err; });
    return dbPromise;
  }

  async function makeRecord(id,payload,generation,reason){
    payload = String(payload == null ? "" : payload);
    return {
      id:id,
      persistenceSchema:PERSISTENCE_SCHEMA,
      sourceStoreKey:"q4b_store_v1",
      sourceGeneration:String(generation == null ? "0" : generation),
      generationNumber:generationNumber(generation),
      writtenAt:Date.now(),
      reason:reason || null,
      payload:payload,
      payloadBytes:byteLength(payload),
      checksum:checksum(payload),
      sha256:await sha256(payload)
    };
  }

  function getById(id){
    return openDb().then(function(db){
      return new Promise(function(resolve,reject){
        var req;
        try{ req=db.transaction(OBJECT_STORE,"readonly").objectStore(OBJECT_STORE).get(id); }
        catch(e){ reject(e); return; }
        req.onsuccess=function(){ resolve(req.result||null); };
        req.onerror=function(){ reject(req.error||new Error("IndexedDB read failed")); };
      });
    }).catch(function(err){ recordFailure(err); throw err; });
  }

  async function commit(payload,generation,opts){
    opts=opts||{};
    var valid=validatePayload(payload);
    if(!valid.ok) return {ok:false,reason:"invalid-payload",error:valid.error};
    var incoming=await makeRecord(AUTHORITY_ID,payload,generation,opts.reason||"commit");
    var db;
    try{ db=await openDb(); }
    catch(err){ return {ok:false,reason:"idb-unavailable",error:lastError||String(err)}; }

    return new Promise(function(resolve){
      var tx,store,getReq,finished=false,decision=null;
      try{
        tx=db.transaction(OBJECT_STORE,"readwrite");
        store=tx.objectStore(OBJECT_STORE);
        getReq=store.get(AUTHORITY_ID);
      }catch(e){ recordFailure(e); resolve({ok:false,reason:"transaction-open-failed",error:String(e.message||e)}); return; }

      function finishOnce(result){ if(finished)return; finished=true; resolve(result); }
      getReq.onerror=function(){
        recordFailure(getReq.error||new Error("authority read failed"));
        try{tx.abort();}catch(_){}
        finishOnce({ok:false,reason:"authority-read-failed",error:lastError});
      };
      getReq.onsuccess=function(){
        var current=getReq.result||null;
        if(current){
          var currentGen=generationNumber(current.sourceGeneration), incomingGen=incoming.generationNumber;
          var currentIntegrity=recordBasicIntegrity(current);
          var samePayload=currentIntegrity.ok && current.payload===incoming.payload && current.checksum===incoming.checksum;
          if(incomingGen < currentGen && !opts.allowOlder){
            decision={ok:false,reason:"stale-generation",authorityGeneration:current.sourceGeneration,incomingGeneration:incoming.sourceGeneration,authorityIntegrity:currentIntegrity.ok};
            try{tx.abort();}catch(_){}
            return;
          }
          if(incomingGen === currentGen && currentIntegrity.ok){
            if(samePayload){
              decision={ok:true,changed:false,reason:"already-current",generation:current.sourceGeneration,checksum:current.checksum};
              return;
            }
            if(!opts.forceSameGeneration){
              decision={ok:false,reason:"same-generation-divergence",authorityGeneration:current.sourceGeneration,incomingGeneration:incoming.sourceGeneration,authorityChecksum:current.checksum,incomingChecksum:incoming.checksum};
              try{tx.abort();}catch(_){}
              return;
            }
          }
          /* A corrupt authority may be repaired only by an equal/newer valid WAL.
             Preserve the raw prior record as rollback evidence before replacement. */
          if(!currentIntegrity.ok && incomingGen < currentGen){
            decision={ok:false,reason:"corrupt-authority-newer-than-wal",authorityGeneration:current.sourceGeneration,incomingGeneration:incoming.sourceGeneration,error:currentIntegrity.error};
            try{tx.abort();}catch(_){}
            return;
          }
          try{
            var rollbackRecord=Object.assign({},current,{id:ROLLBACK_ID,rollbackSavedAt:Date.now(),rollbackReason:opts.reason||"authority-replaced",rollbackCorrupt:!currentIntegrity.ok,rollbackIntegrityError:currentIntegrity.ok?null:currentIntegrity.error});
            store.put(rollbackRecord);
          }catch(e2){ recordFailure(e2); try{tx.abort();}catch(_){} return; }
        }
        try{ store.put(incoming); decision={ok:true,changed:true,generation:incoming.sourceGeneration,checksum:incoming.checksum,sha256:incoming.sha256}; }
        catch(e3){ recordFailure(e3); try{tx.abort();}catch(_){} }
      };
      tx.oncomplete=function(){ finishOnce(decision||{ok:false,reason:"unknown-transaction-result"}); };
      tx.onabort=function(){ finishOnce(decision||{ok:false,reason:"transaction-aborted",error:lastError}); };
      tx.onerror=function(){ recordFailure(tx.error||new Error("authority transaction failed")); };
    });
  }

  async function authority(){
    if(!supported()) return null;
    try{ return await getById(AUTHORITY_ID); }
    catch(_){ return null; }
  }

  async function verifiedAuthority(){
    var record=await authority();
    if(!record) return {exists:false,ok:false,cryptoVerified:false,error:lastError||null,record:null};
    return verifyRecord(record);
  }

  async function rollback(){
    if(!supported()) return null;
    try{ return await getById(ROLLBACK_ID); }
    catch(_){ return null; }
  }

  async function verifiedRollback(){
    var record=await rollback();
    if(!record) return {exists:false,ok:false,cryptoVerified:false,error:lastError||null,record:null};
    return verifyRecord(record);
  }

  async function verifyLegacy(payload,generation){
    payload = payload == null ? null : String(payload);
    var verified=await verifiedAuthority();
    if(!verified.exists) return {supported:supported(),exists:false,match:false,legacyExists:payload!==null,error:lastError};
    if(!verified.ok) return {supported:true,exists:true,match:false,legacyExists:payload!==null,authorityValid:false,cryptoVerified:false,error:verified.error};
    var a=verified.record;
    if(payload===null) return {supported:true,exists:true,match:false,legacyExists:false,authorityValid:true,cryptoVerified:verified.cryptoVerified,authorityGeneration:a.sourceGeneration,authorityChecksum:a.checksum};
    var legacyChecksum=checksum(payload), gen=String(generation==null?"0":generation);
    var generationMatch=gen===String(a.sourceGeneration);
    var payloadMatch=legacyChecksum===a.checksum && payload===a.payload;
    return {supported:true,exists:true,match:generationMatch&&payloadMatch,legacyExists:true,authorityValid:true,cryptoVerified:verified.cryptoVerified,generationMatch:generationMatch,payloadMatch:payloadMatch,legacyGeneration:gen,authorityGeneration:a.sourceGeneration,legacyChecksum:legacyChecksum,authorityChecksum:a.checksum,authoritySha256:a.sha256||null};
  }

  async function reconcile(legacyPayload,legacyGeneration){
    var legacyExists=legacyPayload!==null && legacyPayload!==undefined;
    if(legacyExists){
      legacyPayload=String(legacyPayload);
      var valid=validatePayload(legacyPayload);
      if(!valid.ok) return {ok:false,action:"invalid-legacy",error:valid.error};
    }

    var raw=await authority();
    if(!raw){
      if(!legacyExists) return {ok:true,action:"empty"};
      var seeded=await commit(legacyPayload,legacyGeneration,{reason:"seed-from-legacy"});
      return Object.assign({action:seeded.ok?"seed-from-legacy":"seed-failed"},seeded);
    }

    var verified=await verifyRecord(raw);
    if(!verified.ok){
      /* If legacy is valid and not older, it may safely repair the corrupt IDB
         record while preserving the raw corrupt record as rollback evidence. */
      var rawGen=generationNumber(raw.sourceGeneration), legacyGen=generationNumber(legacyGeneration);
      if(legacyExists && legacyGen>=rawGen){
        var repaired=await commit(legacyPayload,legacyGeneration,{reason:"repair-corrupt-authority",forceSameGeneration:true});
        return Object.assign({action:repaired.ok?"repair-corrupt-authority":"repair-corrupt-authority-failed",previousIntegrityError:verified.error},repaired);
      }
      return {ok:false,action:"invalid-authority",error:verified.error,authorityGeneration:raw.sourceGeneration==null?null:String(raw.sourceGeneration),legacyGeneration:String(legacyGeneration==null?"0":legacyGeneration)};
    }

    var a=verified.record;
    if(!legacyExists){
      if(!verified.cryptoVerified) return {ok:false,action:"authority-not-cryptographically-verified",error:"refusing cache restore without matching SHA-256",authorityGeneration:a.sourceGeneration};
      return {ok:true,action:"restore-cache-from-authority",payload:a.payload,generation:a.sourceGeneration,checksum:a.checksum,sha256:a.sha256||null,cryptoVerified:true};
    }
    var lg=generationNumber(legacyGeneration), ag=generationNumber(a.sourceGeneration);
    if(lg>ag){
      var replayed=await commit(legacyPayload,legacyGeneration,{reason:"replay-localstorage-wal"});
      return Object.assign({action:replayed.ok?"replay-wal":"replay-failed"},replayed);
    }
    if(ag>lg){
      if(!verified.cryptoVerified) return {ok:false,action:"authority-not-cryptographically-verified",error:"refusing cache restore without matching SHA-256",authorityGeneration:a.sourceGeneration,legacyGeneration:String(legacyGeneration==null?"0":legacyGeneration)};
      return {ok:true,action:"restore-cache-from-authority",payload:a.payload,generation:a.sourceGeneration,checksum:a.checksum,sha256:a.sha256||null,cryptoVerified:true,legacyGeneration:String(legacyGeneration==null?"0":legacyGeneration)};
    }
    var legacyChecksum=checksum(legacyPayload);
    if(legacyChecksum===a.checksum && legacyPayload===a.payload){
      return {ok:true,action:"matched",generation:a.sourceGeneration,checksum:a.checksum,sha256:a.sha256||null,cryptoVerified:verified.cryptoVerified};
    }
    return {ok:false,action:"same-generation-conflict",generation:a.sourceGeneration,legacyChecksum:legacyChecksum,authorityChecksum:a.checksum,authorityPayload:a.payload,legacyPayload:legacyPayload,cryptoVerified:verified.cryptoVerified};
  }

  function status(){
    return {supported:supported(),dbName:DB_NAME,persistenceSchema:PERSISTENCE_SCHEMA,lastError:lastError,lastErrorAt:lastErrorAt};
  }

  global.Q4BStorageAuthorityCandidate={
    supported:supported,
    validatePayload:validatePayload,
    checksum:checksum,
    verifyRecord:verifyRecord,
    commit:commit,
    authority:authority,
    verifiedAuthority:verifiedAuthority,
    rollback:rollback,
    verifiedRollback:verifiedRollback,
    verifyLegacy:verifyLegacy,
    reconcile:reconcile,
    status:status
  };
})(window);
