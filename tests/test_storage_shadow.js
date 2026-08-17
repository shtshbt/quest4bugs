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
    __records: records
  };
}

(async () => {
  {
    const ctx = makeContext(undefined);
    assert.equal(ctx.Q4BStorageShadow.supported(), false);
    assert.equal(ctx.Q4BStorageShadow.queue("{}", "1"), false);
    const result = await ctx.Q4BStorageShadow.verify("{}", "1");
    assert.equal(result.supported, false);
  }

  {
    const idb = fakeIndexedDB();
    const ctx = makeContext(idb);
    const shadow = ctx.Q4BStorageShadow;
    assert.equal(shadow.supported(), true);

    shadow.queue('{"v":1}', "10", {debounceMs:0});
    shadow.queue('{"v":2}', "11", {debounceMs:0});
    await shadow.flush();

    const latest = await shadow.latest();
    assert.equal(latest.sourceGeneration, "11");
    assert.equal(latest.payload, '{"v":2}');
    assert.ok(latest.checksum);
    assert.ok(latest.payloadBytes > 0);

    const match = await shadow.verify('{"v":2}', "11");
    assert.equal(match.match, true);
    assert.equal(match.generationMatch, true);
    assert.equal(match.payloadMatch, true);

    const wrongPayload = await shadow.verify('{"v":3}', "11", {flush:false});
    assert.equal(wrongPayload.match, false);
    assert.equal(wrongPayload.generationMatch, true);
    assert.equal(wrongPayload.payloadMatch, false);

    const wrongGeneration = await shadow.verify('{"v":2}', "12", {flush:false});
    assert.equal(wrongGeneration.match, false);
    assert.equal(wrongGeneration.generationMatch, false);
    assert.equal(wrongGeneration.payloadMatch, true);
  }

  console.log("RESULT storage shadow tests passed");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
