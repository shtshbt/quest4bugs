"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "shared/storage_shadow.js"), "utf8");

function makeContext(indexedDB){
  const context = {
    console,
    indexedDB,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Promise,
    TextEncoder,
    encodeURIComponent,
    unescape
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function fakeIndexedDB(){
  const records = new Map();
  let created = false;
  let putCount = 0;
  const db = {
    objectStoreNames: { contains(){ return created; } },
    createObjectStore(){ created = true; return {}; },
    close(){},
    transaction(){
      const tx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore(){
          return {
            put(record){
              putCount++;
              records.set(record.id, structuredClone(record));
              setTimeout(() => { if(tx.oncomplete) tx.oncomplete(); }, 0);
            },
            get(id){
              const req = { result:null, error:null, onsuccess:null, onerror:null };
              setTimeout(() => {
                req.result = records.has(id) ? structuredClone(records.get(id)) : undefined;
                if(req.onsuccess) req.onsuccess();
              }, 0);
              return req;
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
    __records: records,
    __putCount(){ return putCount; }
  };
}

function failingIndexedDB(){
  return {
    open(){
      const req = { result:null, error:new Error("synthetic open failure"), onupgradeneeded:null, onsuccess:null, onerror:null, onblocked:null };
      setTimeout(() => { if(req.onerror) req.onerror(); }, 0);
      return req;
    }
  };
}

(async () => {
  // Browser without IndexedDB: feature is simply unavailable; no exception escapes.
  {
    const ctx = makeContext(undefined);
    assert.equal(ctx.Q4BStorageShadow.supported(), false);
    assert.equal(ctx.Q4BStorageShadow.queue("{}", "1"), false);
    const result = await ctx.Q4BStorageShadow.verify("{}", "1");
    assert.equal(result.supported, false);
    assert.equal(result.exists, false);
  }

  // Normal mirror: rapid writes coalesce to the newest authoritative payload.
  {
    const idb = fakeIndexedDB();
    const ctx = makeContext(idb);
    const shadow = ctx.Q4BStorageShadow;
    assert.equal(shadow.supported(), true);

    shadow.queue('{"v":1}', "10", {debounceMs:1000});
    shadow.queue('{"v":2}', "11", {debounceMs:1000});
    shadow.queue('{"v":3}', "12", {debounceMs:1000});
    await shadow.flush();

    const latest = await shadow.latest();
    assert.equal(latest.sourceGeneration, "12");
    assert.equal(latest.payload, '{"v":3}');
    assert.ok(latest.checksum);
    assert.ok(latest.payloadBytes > 0);
    assert.equal(idb.__putCount(), 1, "debounced writes should persist only the newest pending snapshot");

    const match = await shadow.verify('{"v":3}', "12");
    assert.equal(match.match, true);
    assert.equal(match.generationMatch, true);
    assert.equal(match.payloadMatch, true);

    const wrongPayload = await shadow.verify('{"v":4}', "12", {flush:false});
    assert.equal(wrongPayload.match, false);
    assert.equal(wrongPayload.generationMatch, true);
    assert.equal(wrongPayload.payloadMatch, false);

    const wrongGeneration = await shadow.verify('{"v":3}', "13", {flush:false});
    assert.equal(wrongGeneration.match, false);
    assert.equal(wrongGeneration.generationMatch, false);
    assert.equal(wrongGeneration.payloadMatch, true);
  }

  // IndexedDB exists but fails to open: failure stays inside the shadow subsystem.
  {
    const ctx = makeContext(failingIndexedDB());
    const shadow = ctx.Q4BStorageShadow;
    assert.equal(shadow.supported(), true);
    assert.equal(shadow.queue('{"v":9}', "90", {debounceMs:1000}), true);
    const result = await shadow.flush();
    assert.equal(result.supported, true);
    assert.equal(result.written, false);
    assert.match(result.error || "", /synthetic open failure/);
    const status = shadow.status();
    assert.match(status.lastError || "", /synthetic open failure/);
    assert.ok(status.lastErrorAt > 0);
  }

  console.log("RESULT storage shadow tests passed");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
