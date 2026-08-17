"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "shared/storage_authority.js"), "utf8");

function makeContext(indexedDB){
  const context = {
    console,
    indexedDB,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Number,
    Promise,
    TextEncoder,
    encodeURIComponent,
    unescape,
    crypto: webcrypto,
    Uint8Array
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function fakeIndexedDB(){
  const records = new Map();
  let created = false;
  const db = {
    objectStoreNames: { contains(){ return created; } },
    createObjectStore(){ created = true; return {}; },
    close(){},
    transaction(_name, mode){
      const pending = new Map();
      let aborted = false;
      let completionScheduled = false;
      const tx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        abort(){
          if(aborted) return;
          aborted = true;
          setTimeout(() => { if(tx.onabort) tx.onabort(); }, 0);
        },
        objectStore(){
          return {
            get(id){
              const req = { result:null, error:null, onsuccess:null, onerror:null };
              setTimeout(() => {
                if(aborted) return;
                req.result = records.has(id) ? structuredClone(records.get(id)) : undefined;
                if(req.onsuccess) req.onsuccess();
                if(mode === "readonly"){
                  setTimeout(() => { if(!aborted && tx.oncomplete) tx.oncomplete(); }, 0);
                }else if(!completionScheduled){
                  completionScheduled = true;
                  setTimeout(() => {
                    if(aborted) return;
                    for(const [k,v] of pending) records.set(k, structuredClone(v));
                    if(tx.oncomplete) tx.oncomplete();
                  }, 1);
                }
              }, 0);
              return req;
            },
            put(record){
              if(aborted) throw new Error("transaction aborted");
              pending.set(record.id, structuredClone(record));
              return {};
            }
          };
        }
      };
      return tx;
    }
  };
  return {
    open(){
      const req = { result:db, error:null, onupgradeneeded:null, onsuccess:null, onerror:null, onblocked:null };
      setTimeout(() => {
        if(!created && req.onupgradeneeded) req.onupgradeneeded();
        if(req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    },
    __records: records
  };
}

function storePayload(marker){
  return JSON.stringify({v:2, profiles:[{id:"p1",name:"A"}], current:"p1", kv:{x:{v:1,updated:1,data:{marker}}}, tombstones:{}});
}

(async () => {
  {
    const ctx = makeContext(undefined);
    const api = ctx.Q4BStorageAuthorityCandidate;
    assert.equal(api.supported(), false);
    const result = await api.commit(storePayload("x"), "1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "idb-unavailable");
  }

  {
    const idb = fakeIndexedDB();
    const ctx = makeContext(idb);
    const api = ctx.Q4BStorageAuthorityCandidate;

    assert.equal(api.supported(), true);
    assert.equal(api.validatePayload("not-json").ok, false);
    assert.equal(api.validatePayload(JSON.stringify({profiles:[],kv:{},current:null})).ok, true);

    const empty = await api.reconcile(null, "0");
    assert.equal(empty.ok, true);
    assert.equal(empty.action, "empty");

    const p10 = storePayload("g10");
    const seeded = await api.reconcile(p10, "10");
    assert.equal(seeded.ok, true);
    assert.equal(seeded.action, "seed-from-legacy");

    let authority = await api.authority();
    assert.equal(authority.sourceGeneration, "10");
    assert.equal(authority.payload, p10);
    assert.equal(authority.sha256.length, 64);

    const match10 = await api.verifyLegacy(p10, "10");
    assert.equal(match10.match, true);
    assert.equal(match10.generationMatch, true);
    assert.equal(match10.payloadMatch, true);

    const p11 = storePayload("g11");
    const committed = await api.commit(p11, "11", {reason:"normal-save"});
    assert.equal(committed.ok, true);
    assert.equal(committed.changed, true);

    authority = await api.authority();
    assert.equal(authority.sourceGeneration, "11");
    assert.equal(authority.payload, p11);
    const rollback = await api.rollback();
    assert.equal(rollback.sourceGeneration, "10");
    assert.equal(rollback.payload, p10);

    const stale = await api.commit(storePayload("stale"), "9");
    assert.equal(stale.ok, false);
    assert.equal(stale.reason, "stale-generation");
    authority = await api.authority();
    assert.equal(authority.sourceGeneration, "11");
    assert.equal(authority.payload, p11);

    const divergent = await api.commit(storePayload("same-gen-different"), "11");
    assert.equal(divergent.ok, false);
    assert.equal(divergent.reason, "same-generation-divergence");
    authority = await api.authority();
    assert.equal(authority.payload, p11);

    const p12 = storePayload("wal-newer");
    const replay = await api.reconcile(p12, "12");
    assert.equal(replay.ok, true);
    assert.equal(replay.action, "replay-wal");
    authority = await api.authority();
    assert.equal(authority.sourceGeneration, "12");
    assert.equal(authority.payload, p12);

    const olderLegacy = await api.reconcile(p11, "11");
    assert.equal(olderLegacy.ok, true);
    assert.equal(olderLegacy.action, "restore-cache-from-authority");
    assert.equal(olderLegacy.payload, p12);
    assert.equal(olderLegacy.generation, "12");

    const matched = await api.reconcile(p12, "12");
    assert.equal(matched.ok, true);
    assert.equal(matched.action, "matched");

    const sameGenerationConflict = await api.reconcile(storePayload("conflict"), "12");
    assert.equal(sameGenerationConflict.ok, false);
    assert.equal(sameGenerationConflict.action, "same-generation-conflict");

    const missingLegacy = await api.reconcile(null, "0");
    assert.equal(missingLegacy.ok, true);
    assert.equal(missingLegacy.action, "restore-cache-from-authority");
    assert.equal(missingLegacy.payload, p12);

    const verifyMismatch = await api.verifyLegacy(p11, "11");
    assert.equal(verifyMismatch.match, false);
    assert.equal(verifyMismatch.generationMatch, false);
  }

  {
    const broken = { open(){ throw new Error("boom"); } };
    const ctx = makeContext(broken);
    const result = await ctx.Q4BStorageAuthorityCandidate.commit(storePayload("x"), "1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "idb-unavailable");
  }

  console.log("RESULT storage authority candidate tests passed");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
