"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}

function loadBattle(){
  const context={console};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/battle.js"),"utf8"),context);
  return context.Q4BBattle;
}

test("Reared HP bonus preserves base HP compatibility",()=>{
  const battle=loadBattle();
  assert.equal(battle.bugHP("N"),8);
  assert.equal(battle.bugHP("N",true),10);
  assert.equal(battle.bugHP("SSR",true),18);
});

test("Reared HP bonus includes legendary species",()=>{
  assert.equal(loadBattle().bugHP("SS",true),22);
});

test("Reared HP bonus is exported",()=>{
  assert.equal(loadBattle().REARED_HP_BONUS,2);
});

test("Battle UI scans reared records and applies bonus after HP floor",()=>{
  const source=fs.readFileSync(path.join(root,"battle.html"),"utf8");
  assert.match(source,/records\.some\(function\(record\)\{return record\.reared===true;\}\)/);
  assert.match(source,/return Math\.max\(B\.bugHP\(sp\.rarity\), Q4BEquipment\.HP_FLOOR\|\|20\)\+bonus/);
  assert.match(source,/🐣\+2/);
  assert.equal(source.match(/そだてた虫は さらに \+2 されるよ/g).length,1);
});

console.log(`RESULT ${passed} passed, 0 failed`);
