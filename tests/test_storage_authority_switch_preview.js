"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const committedSource = fs.readFileSync(path.join(root, "shared/storage.js"), "utf8");
assert.match(committedSource, /storage-v2 Phase 2 read-authority switch \(disabled\)/, "preview patch must be applied before this test");

function payload(marker){
  return JSON.stringify({v:2,profiles:[{id:"p1",name:marker}],current:"p1",kv:{x:{v:1,updated:1,data:{marker}}},tombstones:{}});
}

function makeLocalStorage(seed, opts={}){
  const backing = new Map(Object.entries(seed||{}).map(([k,v])=>[k,String(v)]));
  let failGenerationValue = opts.failGenerationValue == null ? null : String(opts.failGenerationValue);
  let failedGenerationOnce = false;
  return {
    backing,
    api:{
      get length(){return backing.size;},
      key(i){return Array.from(backing.keys())[i]||null;},
      getItem(k){return backing.has(k)?backing.get(k):null;},
      setItem(k,v){
        v=String(v);
        if(k==="q4b_store_gen" && failGenerationValue!==null && v===failGenerationValue && !failedGenerationOnce){
          failedGenerationOnce=true;
          throw new Error("simulated generation write failure");
        }
        backing.set(k,v);
      },
      removeItem(k){backing.delete(k);}
    }
  };
}

function fakeCandidate(options={}){
  const commits=[];
  const authorityRecord = options.authorityRecord || null;
  return {
    commits,
    status(){return {supported:true,dbName:"q4b_local_v2",persistenceSchema:1};},
    async commit(p,g,opts){
      commits.push({payload:String(p),generation:String(g),reason:opts&&opts.reason});
      return {ok:true,changed:true,generation:String(g),checksum:"candidate",sha256:"a".repeat(64)};
    },
    async reconcile(p,g){
      if(typeof options.reconcile === "function") return options.reconcile(p,g);
      return {ok:true,action:"matched",generation:String(g),checksum:"candidate",sha256:"a".repeat(64),cryptoVerified:true};
    },
    async verifyLegacy(p,g){return {supported:true,exists:true,match:true,legacyGeneration:String(g),authorityGeneration:String(g)};},
    async authority(){return authorityRecord;},
    async rollback(){return null;}
  };
}

function makeContext({source=committedSource, seed={}, candidate=fakeCandidate(), localOpts={}}={}){
  const local=makeLocalStorage(seed,localOpts);
  const reloads=[];
  const events=[];
  const context={
    console,
    localStorage:local.api,
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    setTimeout,
    clearTimeout,
    setInterval(){return 0;},
    clearInterval(){},
    structuredClone,
    Date,
    Math,
    Promise,
    TextEncoder,
    TextDecoder,
    fetch:async()=>{throw new Error("network disabled");},
    Q4BStorageAuthorityCandidate:candidate,
    location:{reload(){reloads.push(Date.now());}}
  };
  context.window=context;
  context.navigator={};
  context.addEventListener=function(){};
  context.dispatchEvent=function(e){events.push(e&&e.type);return true;};
  context.CustomEvent=function(type,init){this.type=type;this.detail=init&&init.detail;};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:"shared/storage.js"});
  context.__local=local;
  context.__reloads=reloads;
  context.__events=events;
  context.__candidate=candidate;
  return context;
}

async function waitUntil(fn, timeout=1000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    if(fn())return;
    await new Promise(r=>setTimeout(r,5));
  }
  throw new Error("timeout waiting for condition");
}

(async()=>{
  // Default committed source remains rehearsal-only. Normal saves work and a
  // successful candidate commit leaves a local receipt for future fast boot hints.
  {
    const p10=payload("old10");
    const candidate=fakeCandidate();
    const ctx=makeContext({seed:{q4b_store_v1:p10,q4b_store_gen:"10"},candidate});
    assert.equal(ctx.QuestSave.authorityReadSwitchEnabled(),false);
    await waitUntil(()=>candidate.commits.length>=1);
    const receipt=JSON.parse(ctx.__local.backing.get("q4b_storage_v2_idb_receipt_v1"));
    assert.equal(receipt.generation,"10");
    assert.ok(receipt.checksum);
    const before=ctx.__local.backing.get("q4b_store_v1");
    await ctx.QuestSave.save("demo","p1",{n:7});
    const after=ctx.__local.backing.get("q4b_store_v1");
    assert.notEqual(after,before);
    assert.equal(JSON.parse(after).kv["demo\u0000p1"].data.n,7);
    assert.equal(ctx.QuestSave.authorityPromotionStatus().enabled,false);
  }

  // Flip the hard gate only inside this VM copy. If cryptographically verified
  // IDB is newer, cache restore is marker-protected and triggers a clean reload.
  {
    const enabledSource=committedSource.replace("var __authorityReadsEnabled=false;","var __authorityReadsEnabled=true;");
    assert.notEqual(enabledSource,committedSource);
    const old=payload("old10"), newer=payload("new20");
    const candidate=fakeCandidate({reconcile:async()=>({ok:true,action:"restore-cache-from-authority",payload:newer,generation:"20",checksum:"idb20",sha256:"b".repeat(64),cryptoVerified:true})});
    const ctx=makeContext({source:enabledSource,seed:{q4b_store_v1:old,q4b_store_gen:"10"},candidate});
    await waitUntil(()=>ctx.__reloads.length===1);
    assert.equal(ctx.__local.backing.get("q4b_store_v1"),newer);
    assert.equal(ctx.__local.backing.get("q4b_store_gen"),"20");
    assert.equal(ctx.__local.backing.has("q4b_storage_v2_restore_txn_v1"),false);
    assert.equal(JSON.parse(ctx.__local.backing.get("q4b_storage_v2_idb_receipt_v1")).generation,"20");
    const status=ctx.QuestSave.authorityPromotionStatus();
    assert.equal(status.enabled,true);
    assert.equal(status.bootstrapPending,false);
  }

  // A crash between payload and generation writes is repaired synchronously on
  // the next boot before loadStore() sees the partial state, even with gate=false.
  {
    const old=payload("old10"), newer=payload("new20");
    const marker={v:1,startedAt:1,old:{exists:true,payload:old,generation:"10"},next:{payload:newer,generation:"20",checksum:"x"}};
    const ctx=makeContext({seed:{q4b_store_v1:newer,q4b_store_gen:"10",q4b_storage_v2_restore_txn_v1:JSON.stringify(marker)}});
    assert.equal(ctx.__local.backing.get("q4b_store_v1"),old);
    assert.equal(ctx.__local.backing.get("q4b_store_gen"),"10");
    assert.equal(ctx.__local.backing.has("q4b_storage_v2_restore_txn_v1"),false);
    assert.equal(ctx.QuestSave.authorityPromotionStatus().restoreRecovery.state,"partial-rollback");
    assert.equal(ctx.QuestSave.currentProfile(),"p1");
    assert.equal((await ctx.QuestSave.profiles())[0].name,"old10");
  }

  // Same-generation conflict never mutates the local cache. Bootstrap unlocks
  // after the diagnostic decision so subsequent normal writes remain possible.
  {
    const enabledSource=committedSource.replace("var __authorityReadsEnabled=false;","var __authorityReadsEnabled=true;");
    const old=payload("conflict-local");
    const candidate=fakeCandidate({reconcile:async()=>({ok:false,action:"same-generation-conflict",generation:"30",legacyChecksum:"l",authorityChecksum:"a"})});
    const ctx=makeContext({source:enabledSource,seed:{q4b_store_v1:old,q4b_store_gen:"30"},candidate});
    await waitUntil(()=>ctx.QuestSave.authorityPromotionStatus().bootstrapPending===false);
    assert.equal(ctx.__local.backing.get("q4b_store_v1"),old);
    assert.equal(ctx.__reloads.length,0);
    assert.equal(ctx.QuestSave.authorityPromotionStatus().lastPlan.action,"same-generation-conflict");
    await ctx.QuestSave.save("demo","p1",{afterConflict:true});
    assert.equal(JSON.parse(ctx.__local.backing.get("q4b_store_v1")).kv["demo\u0000p1"].data.afterConflict,true);
  }

  // If the second half of a cache restore fails, the transaction marker drives an
  // immediate rollback to the old cache rather than leaving payload/gen split.
  {
    const enabledSource=committedSource.replace("var __authorityReadsEnabled=false;","var __authorityReadsEnabled=true;");
    const old=payload("old40"), newer=payload("new50");
    const candidate=fakeCandidate({reconcile:async()=>({ok:true,action:"restore-cache-from-authority",payload:newer,generation:"50",checksum:"idb50",sha256:"c".repeat(64),cryptoVerified:true})});
    const ctx=makeContext({source:enabledSource,seed:{q4b_store_v1:old,q4b_store_gen:"40"},candidate,localOpts:{failGenerationValue:"50"}});
    await waitUntil(()=>ctx.QuestSave.authorityPromotionStatus().bootstrapPending===false);
    assert.equal(ctx.__local.backing.get("q4b_store_v1"),old);
    assert.equal(ctx.__local.backing.get("q4b_store_gen"),"40");
    assert.equal(ctx.__local.backing.has("q4b_storage_v2_restore_txn_v1"),false);
    assert.equal(ctx.__reloads.length,0);
  }

  console.log("PASS disabled Phase 2 read-authority switch scaffold and crash recovery");
})().catch(error=>{
  console.error("FAIL",error);
  process.exit(1);
});
