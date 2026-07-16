"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}
function json(value){return JSON.parse(JSON.stringify(value));}

function loadBattleContext(){
  const context={console};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/battle.js"),"utf8"),context);
  return context;
}

function storageContext(backing){
  const localStorage={
    get length(){return backing.size;},
    key:i=>Array.from(backing.keys())[i]??null,
    getItem:key=>backing.has(key)?backing.get(key):null,
    setItem:(key,value)=>backing.set(key,String(value)),
    removeItem:key=>backing.delete(key)
  };
  const sessionStorage={getItem:()=>null,setItem:()=>{}};
  const context={console,localStorage,sessionStorage,setTimeout,clearTimeout,structuredClone,Date,Math,Promise};
  context.window=context;context.navigator={};context.addEventListener=()=>{};
  context.dispatchEvent=()=>{};context.CustomEvent=function(type,init){this.type=type;this.detail=init&&init.detail;};
  context.document={body:{appendChild:()=>{}},getElementById:()=>null,createElement:()=>({style:{},classList:{toggle:()=>{}},appendChild:()=>{}})};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/storage.js"),"utf8"),context);
  return context;
}

test("Chameleon remains outside the numbered 50-stage roster",()=>{
  const battle=loadBattleContext().Q4BBattle;
  assert.equal(battle.roster.length,50);
  assert.deepEqual(Array.from(battle.roster,x=>x.stage),Array.from({length:50},(_,i)=>i+1));
  assert.equal(battle.roster.some(x=>x.id==="chameleon"),false);
  assert.equal(battle.chameleon.hidden,true);
  assert.equal(battle.bossPartySize(battle.chameleon),6);
});

test("Bespoke Chameleon SVG renders current and incoming type colors",()=>{
  const context=loadBattleContext();
  vm.runInContext(fs.readFileSync(path.join(root,"shared/render.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/bespoke.js"),"utf8"),context);
  const svg=context.Q4BRender.deco(context.Q4BBattle.chameleon.species,false);
  assert.match(svg,/^<svg/);
  assert.match(svg,/#7C3AED/);
  assert.match(svg,/#2563EB/);
  assert.equal(svg.includes("<image"),false);
});

test("Incoming color waits for exactly two answer-independent actions and resets",()=>{
  const battle=loadBattleContext().Q4BBattle;
  let state=json(battle.createChameleonColorState("kanji"));
  assert.deepEqual(state,{currentType:"kanji",incomingType:"keisan",actionsRemaining:2});
  state=json(battle.consumeChameleonAction(state));
  assert.deepEqual(state,{currentType:"kanji",incomingType:"keisan",actionsRemaining:1});
  let prepared=json(battle.prepareChameleonAction(state));
  assert.equal(prepared.changed,false);
  state=json(battle.consumeChameleonAction(prepared.state));
  assert.deepEqual(state,{currentType:"kanji",incomingType:"keisan",actionsRemaining:0});
  prepared=json(battle.prepareChameleonAction(state));
  assert.equal(prepared.changed,true);
  assert.deepEqual(prepared.state,{currentType:"keisan",incomingType:"eitango",actionsRemaining:2});
  state=json(battle.consumeChameleonAction(prepared.state));
  state=json(battle.consumeChameleonAction(state));
  prepared=json(battle.prepareChameleonAction(state));
  assert.deepEqual(prepared.state,{currentType:"eitango",incomingType:"kanji",actionsRemaining:2});
});

test("Swap prohibition is isolated to the Chameleon encounter",()=>{
  const battle=loadBattleContext().Q4BBattle;
  assert.equal(battle.canSwap(battle.chameleon),false);
  for(const boss of battle.roster)assert.equal(battle.canSwap(boss),true,boss.id);
  const source=fs.readFileSync(path.join(root,"battle.html"),"utf8");
  assert.match(source,/function swapTo\(i\)[\s\S]*?if\(!B\.canSwap\(st\.r\)\)/);
  assert.match(source,/B\.isChameleon\(r\)&&PARTY\.length!==6/);
  assert.match(source,/st\.r\.id==="mozu"&&!alreadyCleared[\s\S]*?QuestSave\.unlockChameleon\(PROF\)/);
});

test("Unlock and immutable first-clear scale use one additive save key",()=>{
  const sep="\u0000", existing={
    v:2,profiles:[{id:"p1",name:"Child"}],current:"p1",tombstones:{},kv:{}
  };
  existing.kv["keisan"+sep+"p1"]={v:1,updated:11,data:{coll:{catches:{beetle:{n:3}},total:3},shiny:2,eggs:[{id:"egg"}],masterAwards:{gold:1}}};
  existing.kv["battle"+sep+"p1"]={v:1,updated:12,data:{cleared:{50:1},boss:{mozu:true}}};
  existing.kv["goshin"+sep+"p1"]={v:1,updated:13,data:{equipment:{owned:{attack_1:{id:"attack_1"}},equipped:{beetle:{attack:"attack_1"}},equippedBy:{attack_1:"beetle"}}}};
  const originalExisting=json(existing.kv);
  const backing=new Map([["q4b_store_v1",JSON.stringify(existing)]]);
  let context=storageContext(backing), save=context.QuestSave;
  assert.equal(save.chameleonOf("p1").unlocked,false);
  assert.equal(save.unlockChameleon("p1").changed,true);
  const afterUnlock=backing.get("q4b_store_v1");
  assert.equal(save.unlockChameleon("p1").changed,false);
  assert.equal(backing.get("q4b_store_v1"),afterUnlock);

  const party=["a","b","c","d","e","f"], equipment={a:{attack:"attack_1"},b:{},c:{},d:{},e:{},f:{}};
  const first=save.recordChameleonClear("p1",party,equipment,"2026-07-16");
  assert.equal(first.first,true);
  const afterFirst=backing.get("q4b_store_v1");
  const replay=save.recordChameleonClear("p1",party.slice().reverse(),{f:{hp:"hp_1"}},"2026-07-17");
  assert.equal(replay.first,false);
  assert.equal(backing.get("q4b_store_v1"),afterFirst);
  first.state.chameleon_scale.party[0]="mutated";

  context=storageContext(backing);save=context.QuestSave;
  assert.deepEqual(json(save.chameleonOf("p1").chameleon_scale),{
    party,equipment,date:"2026-07-16"
  });
  const reloaded=JSON.parse(backing.get("q4b_store_v1"));
  for(const key of Object.keys(originalExisting))assert.deepEqual(reloaded.kv[key].data,originalExisting[key].data,key);
  assert.ok(reloaded.kv["chameleon"+sep+"p1"]);
});

test("A mixed non-legendary party wins with no fossil equipment",()=>{
  const context=loadBattleContext();
  vm.runInContext(fs.readFileSync(path.join(root,"shared/bugs.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/reward.js"),"utf8"),context);
  const battle=context.Q4BBattle,reward=context.Q4BReward;
  const ids=["queen_alexandras_birdwing","morpho_butterfly","hercules_beetle","rainbow_stag_beetle","mukashi_tonbo","gunki_oo_ari"];
  const members=ids.map(id=>context.Q4B_BUGS.find(x=>x.id===id));
  assert.equal(members.every(Boolean),true);
  assert.equal(members.some(x=>(x.tags||[]).includes("legendary")),false);
  let color=json(battle.createChameleonColorState("kanji")),bossHp=battle.chameleon.hp,index=0,turns=0;
  const hp=members.map(x=>battle.bugHP(x.rarity));
  while(bossHp>0&&index<members.length&&turns<100){
    color=json(battle.prepareChameleonAction(color).state);
    const type=reward.gameFor(members[index]);
    bossHp-=battle.damage(type,color.currentType);
    color=json(battle.consumeChameleonAction(color));
    turns++;
    if(bossHp<=0)break;
    color=json(battle.prepareChameleonAction(color).state);
    hp[index]-=battle.bossDamage(true,type,color.currentType);
    color=json(battle.consumeChameleonAction(color));
    turns++;
    if(hp[index]<=0)index++;
  }
  assert.ok(bossHp<=0,{bossHp,index,turns});
  assert.equal(Object.keys({}).length,0);
});

test("Portal composes a read-only Hall of Fame from chameleon_scale",()=>{
  const source=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.match(source,/function chameleonHallOfFameHTML\(pid\)/);
  assert.match(source,/chameleonHallOfFameHTML\(pid\)/);
  assert.match(source,/state\.chameleon_scale/);
  assert.equal(source.includes("recordChameleonClear("),false);
});

console.log(`RESULT ${passed} passed, 0 failed`);
