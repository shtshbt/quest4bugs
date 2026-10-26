"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),sourcePath=path.join(root,"komorebi/bamen_yomitori_generator.js");
const audit=require("../tools/komorebi/bamen_yomitori_audit_sim/audit_sim.js");
const reference=require("../tools/komorebi/bamen_yomitori_audit_sim/strict_gen.js");
const {runChecks}=require("../tools/komorebi/bamen_yomitori_audit_sim/strict_check.js");
const source=fs.readFileSync(sourcePath,"utf8"),context={window:{},Math:Object.create(Math),Date:{now(){throw new Error("Date.now");}},Object,Array,Set,Map,WeakMap,Number,String,RegExp,Error};
context.Math.random=()=>{throw new Error("Math.random");};
vm.runInThisContext("(function(window,Math,Date){"+source+"\n})")(context.window,context.Math,context.Date);
const engine=context.window.Q4B_KOMOREBI_BAMEN_YOMITORI;
let downW17=0;
function auditItem(p){
  assert.equal(p.cat,"kom_bamen_yomitori");assert.equal(p.patternId,p.pattern);
  assert.ok(["choice","find_all"].includes(p.kind));assert.equal(p.object,p.obj.id);
  assert.ok(Array.isArray(p.feedback));assert.equal(p.feedback.length,p.choices.length);
  assert.deepEqual(Object.keys(p.feedback),p.choices.map((_,i)=>String(i)));
  for(let i=0;i<p.choices.length;i++)if(p.optionTypes[i]==="W17"){
    const bound=p.optionBoundPersons[i],sc=p.scene;
    const candidates=[sc.ps[sc.unk].full].concat(sc.s5X?[sc.s5X]:[]);
    const hit=candidates.find(name=>{const values=Object.assign({},p.valsByName,{[name]:sc.T}),keys=Object.keys(values),extreme=(p.polarity==="up"?Math.max:Math.min)(...Object.values(values));return keys.filter(k=>values[k]===extreme).length===1&&values[p.choices[i]]===extreme;});
    assert.equal(bound,hit);assert.equal(p.feedback[i],`ぜんぶの かずは ${hit}の かずじゃ ないよ`);
    if(p.polarity==="down"){assert.notEqual(p.choices[i],bound);downW17++;}
  }
  assert.equal(p.wordings.length,p.bindingForms.length);assert.deepEqual(p.wordings,p.S.filter(s=>s.id!=="intro"&&s.id!=="pron").map(s=>s.id));
  assert.ok(["giver","receiver","bystander","unknown","known",null].includes(p.askedRole));
  assert.ok(p.persons.every(person=>person.id&&person.honorific===person.hon));
  const mentions=[];for(const s of p.S)for(const t of s.toks)for(const person of p.persons)if(t.includes(person.full)&&!mentions.includes(person.full))mentions.push(person.full);
  for(const person of p.persons)if(!mentions.includes(person.full))mentions.push(person.full);
  assert.deepEqual(Array.from(p.persons,x=>x.full),mentions);
  const expected=p.kind==="choice"?p.ans:Array.from(p.ansSet);
  assert.ok(engine.judge(p,expected));
  if(p.kind==="find_all"){
    assert.equal(p.feedbackMissed,"ひとりずつ「だれが いくつ」か たしかめよう");
    assert.equal(p.feedback.length,p.choices.length);assert.equal(p.ans,null);
    assert.ok(!engine.judge(p,expected.concat(expected[0])));assert.ok(!engine.judge(p,[-1]));
    assert.ok(!engine.judge(p,[p.choices.length]));assert.ok(!engine.judge(p,["0"]));
    assert.equal(p.ansSet.length,p.optionTypes.filter(t=>t==="correct").length);
    for(let i=0;i<p.choices.length;i++)assert.equal(p.feedback[i]===null,p.ansSet.includes(i));
    for(let i=0;i<p.choices.length;i++){
      const type=p.optionTypes[i],owner=p.scene.ps[p.scene.vals.indexOf(Number(p.choices[i]))];
      if(type==="W1")assert.equal(p.feedback[i],`それは ${owner.full}の かずだよ。だれの かずを きかれているかな`);
      if(type==="W9")assert.equal(p.feedback[i],`${owner?owner.full:p.askedName}は あげても もらっても いないよ`);
      if(type==="W14")assert.equal(p.feedback[i],`${p.noise.v}は ${p.obj.name}の かずじゃ ないよ`);
    }
  }else{
    assert.equal(p.ansSet,null);assert.ok(!engine.judge(p,-1));assert.ok(!engine.judge(p,String(p.ans)));
    for(let i=0;i<p.choices.length;i++)if(i!==p.ans)assert.ok(p.feedback[i]);
  }
  return Object.assign({},p,{kind:p.answerKind==="numbers"?"find_all":p.answerKind,options:p.kind==="find_all"?null:p.choices,ansSet:p.kind==="find_all"?p.ansSet.map(i=>Number(p.choices[i])):null});
}
const G=Object.assign({},reference,{newState:engine.newState,buildSet(lv,random,state){return engine.buildSet(lv,random,state).map(auditItem);}});
for(const lv of [0,11,NaN,1.5,"1"])assert.throws(()=>engine.buildSet(lv,audit.mulberry32(1)));
assert.throws(()=>engine.buildSet(1,null));assert.throws(()=>engine.buildSet(1,()=>1));
for(const invalid of [NaN,Infinity,-1,"0.5",null])assert.throws(()=>engine.buildSet(1,()=>invalid));
assert.doesNotMatch(source,/Math\.random|Date\.now/);
const stackTraceLimit=Error.stackTraceLimit;Error.stackTraceLimit=0;
const {results,SETS}=runChecks(G,{1:100,2:100,3:100,4:100,5:200,6:125,7:100,8:125,9:450,10:200},4242,sourcePath,{1:2500,2:150,3:150,4:300});
Error.stackTraceLimit=stackTraceLimit;
assert.equal(results.length,46);
assert.deepEqual(results.filter(r=>r.fails.length).map(r=>({no:r.no,title:r.title,fails:r.fails})),[]);
console.log("PASS chapter 10: all 46 assertions, including 44/45/46, and appendix A's 50 golden cases");
for(let lv=1;lv<=10;lv++){
  audit.setR(audit.mulberry32(1000+lv));
  const sets=SETS[lv].slice(0,lv===3?100:lv===2||lv===7?60:40),{res}=audit.evalLv(lv,sets.length,sets);
  const stageA={T1:Object.fromEntries(Object.entries(res.T1).filter(([key])=>audit.STAGEA_T1.includes(key))),STAGEA:res.STAGEA};
  const a=audit.composite(stageA,["T1","STAGEA"]),b=audit.composite(res,["T1","T1B","T2","STAGEA"]);
  assert.ok(a.single<0.60&&a.slotComp<0.60,`Lv${lv} stage A ${JSON.stringify(a)}`);
  assert.ok(b.single<0.75&&b.slotComp<0.75,`Lv${lv} stage A+B ${JSON.stringify(b)}`);
  console.log(`PASS Lv${lv}: stage A ${a.slotComp.toFixed(3)}, stage A+B ${b.slotComp.toFixed(3)}`);
}
for(const lv of [1,5,10])assert.equal(JSON.stringify(engine.buildSet(lv,audit.mulberry32(99))),JSON.stringify(engine.buildSet(lv,audit.mulberry32(99))));
assert.ok(downW17>0);
const fallbackWindow={attempts:0,candidates:[]};
const fallbackSource=source.replace('tries < 2000 || !best','tries < 4 || !best')
  .replace('const items = buildItems(R, lv, st, choice);','if (++global.attempts === 1) retry(() => { throw new Redraw(); }, 2); const items = buildItems(R, lv, st, choice);')
  .replace('need(items.every(it => it.kind',"if (global.attempts === 2) items[0].options[0] = items[0].options[1]; need(items.every(it => it.kind")
  .replace('capCheck(lv, items, violations);',"capCheck(lv, items, violations); violations.push('forced cap'); if (global.attempts === 3) violations.push('forced modifier'); global.candidates.push(violations.slice());");
vm.runInThisContext('(function(window){'+fallbackSource+'\n})')(fallbackWindow);
const fallback=fallbackWindow.Q4B_KOMOREBI_BAMEN_YOMITORI.buildSet(1,audit.mulberry32(42));
assert.equal(fallbackWindow.attempts,4);assert.equal(fallback.length,5);
assert.equal(fallback.violations.length,Math.min(...fallbackWindow.candidates.map(v=>v.length)));
assert.ok(fallback.violations.includes('forced cap'));
assert.ok(!fallback.violations.includes('forced modifier'));
for(const p of fallback){auditItem(p);assert.equal(new Set(p.choices).size,p.choices.length);}
assert.deepEqual(engine.buildSet(1,audit.mulberry32(42)).violations,[]);
console.log('PASS exhausted retries return the nearest valid set with violations and distinct choices');
console.log("PASS injected randomness, full-object reproducibility, object contract and judging");
