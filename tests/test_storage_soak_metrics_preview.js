"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"shared/storage.js"),"utf8");
assert.match(source,/storage-v2 sustained soak metrics/,"soak metrics patch must be applied before this test");

function store(marker){return JSON.stringify({v:2,profiles:[{id:"p1",name:"A"}],current:"p1",kv:{x:{v:1,updated:1,data:{marker}}},tombstones:{}});}
function makeLocal(seed){const m=new Map(Object.entries(seed||{}).map(([k,v])=>[k,String(v)]));return {m,api:{get length(){return m.size;},key(i){return Array.from(m.keys())[i]||null;},getItem(k){return m.has(k)?m.get(k):null;},setItem(k,v){m.set(k,String(v));},removeItem(k){m.delete(k);}}};}
function makeCandidate(opts={}){
  const calls=[];
  return {
    calls,
    status(){return {supported:true,dbName:"q4b_local_v2"};},
    async commit(payload,generation){calls.push({payload,generation:String(generation)});if(opts.fail)return {ok:false,reason:"test-failure",error:"boom"};return {ok:true,changed:true,generation:String(generation),checksum:"c",sha256:"a".repeat(64)};},
    async verifyLegacy(payload,generation){return opts.mismatch?{supported:true,exists:true,match:false,authorityValid:true,cryptoVerified:true,error:"mismatch"}:{supported:true,exists:true,match:true,authorityValid:true,cryptoVerified:true,generationMatch:true,payloadMatch:true,legacyGeneration:String(generation),authorityGeneration:String(generation)};},
    async authority(){const c=calls[calls.length-1];return c?{sourceGeneration:c.generation,writtenAt:Date.now(),payloadBytes:String(c.payload).length,checksum:"c",sha256:"a".repeat(64)}:null;},
    async rollback(){return null;},
    async reconcile(payload,generation){return {ok:true,action:"matched",generation:String(generation),checksum:"c",sha256:"a".repeat(64),cryptoVerified:true};}
  };
}
function makeShadow(){return {status(){return {supported:true};},queue(){return true;},async verify(){return {supported:true,exists:true,match:true,generationMatch:true,payloadMatch:true};},async latest(){return {mirrorSchema:1,sourceGeneration:"1",writtenAt:1,payloadBytes:1,checksum:"s"};}};}
function context(seed,candidate,shadow=makeShadow()){
  const local=makeLocal(seed);
  const ctx={console,localStorage:local.api,sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout,clearTimeout,setInterval(){return 0;},clearInterval(){},structuredClone,Date,Math,Promise,TextEncoder,TextDecoder,fetch:async()=>{throw new Error("network disabled");},Q4BStorageAuthorityCandidate:candidate,Q4BStorageShadow:shadow};
  ctx.window=ctx;ctx.navigator={};ctx.addEventListener=function(){};ctx.dispatchEvent=function(){};ctx.CustomEvent=function(type,init){this.type=type;this.detail=init&&init.detail;};
  vm.createContext(ctx);vm.runInContext(source,ctx,{filename:"shared/storage.js"});ctx.__local=local;return ctx;
}
async function wait(fn,ms=1000){const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error("timeout");}

(async()=>{
  {
    const c=makeCandidate();
    const ctx=context({q4b_store_v1:store("seed"),q4b_store_gen:"10"},c);
    await wait(()=>ctx.QuestSave.storageV2SoakStats().verifiedMatches>=1);
    let st=ctx.QuestSave.storageV2SoakStats();
    assert.equal(st.successfulCommits,1);
    assert.equal(st.verifiedMatches,1);
    assert.equal(st.verificationMismatches,0);
    assert.equal(st.failedCommits,0);
    assert.equal(st.consecutiveVerified,1);
    assert.equal(st.activeDays,1);

    await ctx.QuestSave.save("demo","p1",{n:1});
    await wait(()=>ctx.QuestSave.storageV2SoakStats().verifiedMatches>=2);
    st=ctx.QuestSave.storageV2SoakStats();
    assert.equal(st.successfulCommits,2);
    assert.equal(st.verifiedMatches,2);
    assert.equal(st.failedCommits,0);

    const readiness=await ctx.QuestSave.storageV2Readiness();
    assert.equal(readiness.eligible,false);
    assert.equal(readiness.checks.hardGateStillOff,true);
    assert.equal(readiness.checks.shadowCurrent,true);
    assert.equal(readiness.checks.candidateCurrent,true);
    assert.equal(readiness.checks.candidateCryptoVerified,true);
    assert.equal(readiness.checks.enoughVerifiedCommits,false);
    assert.equal(readiness.policy.automaticPromotion,false);
  }

  {
    const c=makeCandidate({mismatch:true});
    const ctx=context({q4b_store_v1:store("mismatch"),q4b_store_gen:"20"},c);
    await wait(()=>ctx.QuestSave.storageV2SoakStats().verificationMismatches>=1);
    const st=ctx.QuestSave.storageV2SoakStats();
    assert.equal(st.successfulCommits,1);
    assert.equal(st.verifiedMatches,0);
    assert.equal(st.verificationMismatches,1);
    assert.equal(st.consecutiveVerified,0);
    assert.equal(st.lastError,"mismatch");
  }

  {
    const c=makeCandidate({fail:true});
    const ctx=context({q4b_store_v1:store("failure"),q4b_store_gen:"30"},c);
    await wait(()=>ctx.QuestSave.storageV2SoakStats().failedCommits>=1);
    const st=ctx.QuestSave.storageV2SoakStats();
    assert.equal(st.failedCommits,1);
    assert.equal(st.successfulCommits,0);
    assert.equal(st.consecutiveVerified,0);
    assert.equal(st.lastError,"boom");
  }

  // Readiness can become eligible only by observation; it never flips the hard gate.
  {
    const seededStats={v:1,startedAt:1,firstSuccessAt:1,lastSuccessAt:172800001,lastFailureAt:0,successfulCommits:300,verifiedMatches:300,verificationMismatches:0,failedCommits:0,repairs:0,staleRejects:0,conflicts:0,consecutiveVerified:300,lastGeneration:"99",lastError:null,days:{"2026-08-15":100,"2026-08-16":100,"2026-08-17":100}};
    const c=makeCandidate();
    const ctx=context({q4b_store_v1:store("ready"),q4b_store_gen:"100",q4b_storage_v2_soak_stats_v1:JSON.stringify(seededStats)},c);
    await wait(()=>ctx.QuestSave.storageV2SoakStats().verifiedMatches>=301);
    const r=await ctx.QuestSave.storageV2Readiness();
    assert.equal(r.eligible,true);
    assert.equal(r.checks.enoughVerifiedCommits,true);
    assert.equal(r.checks.enoughActiveDays,true);
    assert.equal(ctx.QuestSave.authorityReadSwitchEnabled(),false);
  }

  console.log("PASS storage-v2 automatic soak metrics and readiness report");
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
