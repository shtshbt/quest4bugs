"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root=path.resolve(__dirname,"..");
const events=[];
const context={console,setTimeout,clearTimeout};
context.window=context;
context.CustomEvent=function(type,init){this.type=type;this.detail=init.detail;};
context.dispatchEvent=event=>events.push(event);
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"shared/bugs.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"shared/reward.js"),"utf8"),context);
const reward=context.Q4BReward;
const species=reward.bugs.find(sp=>sp.metamorphosis && reward.tierOf(sp)===0);
const cost=reward.eggCost(species);

function fixture(options={}){
  let active=options.active||"kid";
  const balances={kid:options.balance==null?cost+5:options.balance,other:99};
  const states={kid:options.state||{eggs:[],pendingEggs:[],stats:{totalAbandoned:0}},other:{eggs:[],pendingEggs:[],stats:{totalAbandoned:0}}};
  const revisions={kid:1,other:1};
  let conflict=!!options.conflict;
  reward.setFossilStore({
    pid:()=>active,
    get:pid=>balances[pid||active]||0,
    spend:(n,pid)=>{pid=pid||active;if((balances[pid]||0)<n)return false;balances[pid]-=n;return true;},
    refund:(n,pid)=>{pid=pid||active;balances[pid]=(balances[pid]||0)+n;return true;}
  });
  reward.setEggStore({
    pid:()=>active,
    loadVersioned:pid=>Promise.resolve({data:JSON.parse(JSON.stringify(states[pid])),revision:revisions[pid]}),
    saveVersioned:(pid,data,revision)=>{
      if(conflict){conflict=false;return Promise.resolve({ok:false,reason:"conflict",expectedRevision:revision,actualRevision:revision+1});}
      states[pid]=JSON.parse(JSON.stringify(data));revisions[pid]++;return Promise.resolve({ok:true,revision:revisions[pid]});
    }
  });
  return {balances,states,setActive:pid=>{active=pid;}};
}
function coll(){return {catches:{[species.id]:{records:[{sex:"m"},{sex:"f"}]}}};}

(async function(){
  let passed=0;
  async function test(name,fn){await fn();passed++;console.log("PASS",name);}

  await test("M3 open slot persists one egg and exact cost",async()=>{
    const f=fixture();
    const result=await reward.layEgg(coll(),species,{profileId:"kid"});
    assert.deepEqual([result.ok,result.queued,result.profileId,result.fossilCost,result.fossilBefore,result.fossilAfter],[true,false,"kid",cost,cost+5,5]);
    assert.equal(f.states.kid.eggs.length,1);assert.equal(f.states.kid.pendingEggs.length,0);
  });

  await test("M3 full slots queue exactly one egg",async()=>{
    const state={eggs:[{id:"a"},{id:"b"},{id:"c"}],pendingEggs:[],stats:{totalAbandoned:0}};
    const f=fixture({state});
    const result=await reward.layEgg(coll(),species,{profileId:"kid"});
    assert.equal(result.queued,true);assert.equal(f.states.kid.eggs.length,3);assert.equal(f.states.kid.pendingEggs.length,1);
  });

  await test("M3 exact balance succeeds and insufficient balance is inert",async()=>{
    let f=fixture({balance:cost});
    let result=await reward.layEgg(coll(),species,{profileId:"kid"});
    assert.equal(result.ok,true);assert.equal(f.balances.kid,0);
    f=fixture({balance:cost-1});
    const before=JSON.stringify(f.states.kid);
    result=await reward.layEgg(coll(),species,{profileId:"kid"});
    assert.equal(result.ok,false);assert.equal(result.reason,"insufficient-fossil");assert.equal(JSON.stringify(f.states.kid),before);assert.equal(f.balances.kid,cost-1);
  });

  await test("M3 double submission shares one transaction",async()=>{
    const f=fixture();const c=coll();
    const [a,b]=await Promise.all([reward.layEgg(c,species,{profileId:"kid"}),reward.layEgg(c,species,{profileId:"kid"})]);
    assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(f.states.kid.eggs.length,1);assert.equal(f.balances.kid,5);
  });

  await test("M3 CAS conflict restores the charged fragments",async()=>{
    const f=fixture({conflict:true});const before=f.balances.kid;
    const result=await reward.layEgg(coll(),species,{profileId:"kid"});
    assert.equal(result.ok,false);assert.equal(result.reason,"conflict");assert.equal(f.balances.kid,before);assert.equal(f.states.kid.eggs.length,0);
    const event=events.find(e=>e.type==="q4b-egg-compensation");assert.ok(event);assert.equal(event.detail.compensated,true);
  });

  await test("M3 profile switch invalidates a stale confirmation",async()=>{
    const f=fixture();f.setActive("other");
    const before=JSON.stringify(f.states);
    const result=await reward.layEgg(coll(),species,{profileId:"kid"});
    assert.equal(result.ok,false);assert.equal(result.reason,"profile-changed");assert.equal(JSON.stringify(f.states),before);assert.equal(f.balances.kid,cost+5);
  });

  await test("M3 persisted state survives JSON and Fieldnote-shaped round trips",async()=>{
    const f=fixture();await reward.layEgg(coll(),species,{profileId:"kid"});
    const reloaded=JSON.parse(JSON.stringify({reward:{fossilFragments:f.balances.kid},breeding:f.states.kid}));
    assert.equal(reloaded.reward.fossilFragments,5);assert.equal(reloaded.breeding.eggs.length,1);assert.equal(reloaded.breeding.eggs[0].id,species.id);
  });

  await test("M3 every paid caller uses the shared awaited confirmation contract",async()=>{
    for(const file of ["index.html","kanji/index.html","eitango/index.html","keisan/app.js","shared/boss_zukan.js"]){
      const source=fs.readFileSync(path.join(root,file),"utf8");
      assert.equal(source.includes("Q4BReward.layEgg("),false,file);
      assert.match(source,/openLayConfirm\([\s\S]{0,500}coll:/,file);
    }
  });

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
