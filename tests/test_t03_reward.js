"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const events = [];
const context = {console, setTimeout, clearTimeout};
context.window = context;
context.Math = Object.create(Math);
context.CustomEvent = function(type, init){ this.type=type; this.detail=init.detail; };
context.dispatchEvent = event => events.push(event);
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/reward.js"), "utf8"), context);
const reward = context.Q4BReward;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function localDate(hour, minute, second, millisecond=0){ return new Date(2026, 0, 2, hour, minute, second, millisecond); }
function seeded(seed){
  let state=seed>>>0;
  return function(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; };
}

test("M1 morning boundaries and equality rule for every learning route", () => {
  const routes=["kanji","keisan","eitango-main","eitango-review"];
  const boundaries=[
    [localDate(5,59,59,999),0.015],
    [localDate(6,0,0),0.045],
    [localDate(7,59,59,999),0.045],
    [localDate(8,0,0),0.015]
  ];
  for(const route of routes){
    for(const [now,chance] of boundaries){
      assert.equal(reward.shinyChanceFor({source:"wild",now}),chance,route);
      assert.equal(reward.rollShiny({source:"wild",now,random:()=>chance-Number.EPSILON}),true,route);
      assert.equal(reward.rollShiny({source:"wild",now,random:()=>chance}),false,route);
      assert.equal(reward.rollShiny({source:"wild",now,random:()=>chance+Number.EPSILON}),false,route);
    }
  }
});

test("M1 seeded shiny distributions converge for every route and condition", () => {
  const routes=["kanji","keisan","eitango-main","eitango-review"];
  for(let route=0;route<routes.length;route++){
    for(const [hour,expected] of [[5,0.015],[6,0.045]]){
      const random=seeded(100+route*10+hour);
      let shiny=0;
      for(let i=0;i<100000;i++) shiny+=reward.rollShiny({source:"wild",now:localDate(hour,0,0),random})?1:0;
      assert.ok(Math.abs(shiny/100000-expected)<0.002,routes[route]+" "+hour+" rate="+shiny/100000);
    }
  }
});

test("M1 non-wild routes retain normal odds", () => {
  for(const source of ["egg","hatch","master","boss","amber"]){
    assert.equal(reward.shinyChanceFor({source,now:localDate(6,0,0)}),0.015,source);
  }
});

test("M1 result and diagnostic carry applied morning roll data", () => {
  const sp=reward.pool("eitango")[0];
  const shiny=reward.record({catches:{}},sp,{source:"wild",game:"eitango",mode:"main",now:localDate(6,0,0),random:()=>0});
  const plain=reward.record({catches:{}},sp,{source:"wild",game:"eitango",mode:"review",now:localDate(6,0,0),random:()=>0.5});
  assert.deepEqual([shiny.morningBonus,shiny.shinyChance,shiny.shinySource,shiny.shiny],[true,0.045,"wild",true]);
  assert.deepEqual([plain.morningBonus,plain.shinyChance,plain.shinySource,plain.shiny],[true,0.045,"wild",false]);
  assert.deepEqual(Object.keys(events.at(-1).detail),["game","mode","eligibility","windowActive","chance","shiny"]);
});

test("M2 tier cumulative thresholds use lower-inclusive next buckets", () => {
  const probabilities=reward.rarityProbabilities(1,[0,1,2,3]);
  let cumulative=0;
  for(let tier=0;tier<3;tier++){
    cumulative+=probabilities[tier];
    assert.equal(reward.selectTier(1,[0,1,2,3],()=>cumulative-Number.EPSILON),tier);
    assert.equal(reward.selectTier(1,[0,1,2,3],()=>cumulative),tier+1);
    assert.equal(reward.selectTier(1,[0,1,2,3],()=>cumulative+Number.EPSILON),tier+1);
  }
});

test("M2 field and streak metadata cannot change tier sequences", () => {
  const expected=[];
  const base=seeded(71);
  for(let i=0;i<1000;i++) expected.push(reward.selectTier(1,[0,1,2,3],base));
  for(const field of [1,2,3,4,5,6,7]){
    const random=seeded(71);
    assert.deepEqual(Array.from({length:1000},()=>reward.selectTier(1,[0,1,2,3],random)),expected,"field "+field);
  }
  for(const streak of [0,7,14,30]){
    const random=seeded(71);
    assert.deepEqual(Array.from({length:1000},()=>reward.selectTier(1,[0,1,2,3],random)),expected,"streak "+streak);
  }
});

test("M2 ordinary routes converge to shared odds with no SS", () => {
  for(const route of ["kanji","keisan","eitango-main","eitango-review"]){
    const random=seeded(route.length*101);
    const counts=[0,0,0,0,0];
    for(let i=0;i<100000;i++) counts[reward.selectTier(1,[0,1,2,3],random)]++;
    assert.equal(counts[4],0,route);
    assert.ok(Math.abs((counts[2]+counts[3])/100000-5.8/100.8)<0.003,route);
    assert.ok(counts[0]>0 && counts[1]>0,route);
  }
});

test("M2 eight eligible answers create exactly one catch", () => {
  for(const mode of ["main","review"]){
    const coll={gauge:0,acc:0,total:3,catches:{legacy:{n:3,max:10,min:4,shiny:1,normal:1,records:[]}},recent:[]};
    const legacy=JSON.stringify(coll.catches.legacy);
    let catches=0;
    for(let i=0;i<8;i++) if(reward.onCorrect(coll,"eitango",8,1,"word-"+i,1,{mode,now:localDate(9,0,0),random:seeded(10+i)})) catches++;
    assert.equal(catches,1,mode);
    assert.equal(coll.total,4,mode);
    assert.equal(JSON.stringify(coll.catches.legacy),legacy,mode);
  }
});

test("M2 ineligible answers leave gauge and save domains byte-for-byte unchanged", () => {
  const profile={coll:{gauge:0,acc:0,total:9,catches:{kept:{n:2,max:8,shiny:1}},recent:[]},
    shiny:7,eggs:[{id:"egg"}],masterAwards:{m:1},boss:{ouja:{REACH:42},unlocked:true},equipment:{net:"gold"},srs:{word:[3,9,4,0]},field:6};
  const before=JSON.stringify(profile);
  assert.equal(profile.coll.gauge,0);
  assert.equal(JSON.stringify(profile),before);
});

test("M2 eitango source uses the shared engine without field, streak, or review boost coupling", () => {
  const source=fs.readFileSync(path.join(root,"eitango/index.html"),"utf8");
  assert.equal(source.includes("Math.random() < 0.03"),false);
  assert.equal(source.includes("Reward.roll("),false);
  assert.equal(source.includes("streakBonus"),false);
  assert.match(source,/sharedEitangoCatch\(P,'review',_ePrefresh\)/);
  assert.match(source,/Q4BReward\.BOOST_NORMAL/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
