"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const storageSource = fs.readFileSync(path.join(root, "shared/storage.js"), "utf8");

function makeLocalStorage(seed){
  const backing = new Map(Object.entries(seed || {}).map(([k,v]) => [k, String(v)]));
  return {
    backing,
    api: {
      get length(){ return backing.size; },
      key(i){ return Array.from(backing.keys())[i] || null; },
      getItem(k){ return backing.has(k) ? backing.get(k) : null; },
      setItem(k,v){ backing.set(k, String(v)); },
      removeItem(k){ backing.delete(k); }
    }
  };
}

(async () => {
  assert.match(storageSource, /storage-v2 Phase 2 authority rehearsal/, "integration preview must be patched before this test runs");

  const seedPayload = JSON.stringify({v:2,profiles:[{id:"p0",name:"seed"}],current:"p0",kv:{},tombstones:{}});
  const local = makeLocalStorage({q4b_store_v1:seedPayload,q4b_store_gen:"100"});

  let firstResolve;
  const calls = [];
  const candidate = {
    status(){ return {supported:true,dbName:"q4b_local_v2",persistenceSchema:1}; },
    commit(payload,generation,opts){
      calls.push({payload:String(payload),generation:String(generation),reason:opts&&opts.reason});
      if(calls.length === 1){
        return new Promise(resolve => { firstResolve = () => resolve({ok:true,changed:true,generation:String(generation)}); });
      }
      return Promise.resolve({ok:true,changed:true,generation:String(generation)});
    },
    verifyLegacy(payload,generation){
      const last = calls[calls.length-1];
      return Promise.resolve({supported:true,exists:!!last,match:!!last&&last.payload===payload&&last.generation===String(generation)});
    },
    authority(){
      const last = calls[calls.length-1];
      return Promise.resolve(last ? {sourceGeneration:last.generation,writtenAt:1,payloadBytes:last.payload.length,checksum:"a",sha256:"b"} : null);
    },
    rollback(){ return Promise.resolve(null); }
  };

  const context = {
    console,
    localStorage: local.api,
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    setTimeout,
    clearTimeout,
    setInterval(){ return 0; },
    clearInterval(){},
    structuredClone,
    Date,
    Math,
    Promise,
    TextEncoder,
    TextDecoder,
    fetch: async () => { throw new Error("network disabled"); },
    Q4BStorageAuthorityCandidate: candidate
  };
  context.window = context;
  context.navigator = {};
  context.addEventListener = function(){};
  context.dispatchEvent = function(){};
  context.CustomEvent = function(type, init){ this.type=type; this.detail=init&&init.detail; };

  vm.createContext(context);
  vm.runInContext(storageSource, context, {filename:"shared/storage.js"});

  // Boot should begin one non-authoritative candidate commit from the current WAL.
  await new Promise(r => setTimeout(r, 5));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload, seedPayload);
  assert.equal(calls[0].generation, "100");
  assert.equal(calls[0].reason, "phase1-rehearsal");

  // While the first commit is deliberately blocked, multiple authoritative saves
  // must coalesce to the latest candidate payload rather than racing IDB commits.
  await context.QuestSave.save("demo","p0",{n:1});
  await context.QuestSave.save("demo","p0",{n:2});
  await context.QuestSave.save("demo","p0",{n:3});
  const latestLegacyBeforeRelease = local.backing.get("q4b_store_v1");
  const latestGenerationBeforeRelease = local.backing.get("q4b_store_gen");
  assert.ok(firstResolve, "first candidate commit should be blocked by test gate");
  firstResolve();

  for(let i=0;i<50 && calls.length<2;i++) await new Promise(r => setTimeout(r,2));
  assert.equal(calls.length, 2, "boot commit + one coalesced latest commit expected");
  assert.equal(calls[1].payload, latestLegacyBeforeRelease);
  assert.equal(calls[1].generation, latestGenerationBeforeRelease);
  assert.equal(calls[1].reason, "phase1-rehearsal");

  // Rehearsal must never replace the authoritative localStorage payload.
  assert.equal(local.backing.get("q4b_store_v1"), latestLegacyBeforeRelease);
  assert.equal(JSON.parse(latestLegacyBeforeRelease).kv["demo\u0000p0"].data.n, 3);

  const verify = await context.QuestSave.verifyAuthorityCandidate();
  assert.equal(verify.match, true);
  const status = await context.QuestSave.authorityCandidateStatus();
  assert.equal(status.loaded, true);
  assert.equal(status.supported, true);
  const meta = await context.QuestSave.authorityCandidateSnapshotMeta();
  assert.equal(meta.exists, true);
  assert.equal(meta.authority.generation, latestGenerationBeforeRelease);

  console.log("PASS Phase 2 authority rehearsal coalesces writes and preserves Phase 1 authority");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
