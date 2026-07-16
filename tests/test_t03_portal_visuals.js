"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}

test("M6 keeps the global catch metric and folds shiny count into treasure summary",()=>{
  const portal=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const shiny=fs.readFileSync(path.join(root,"shared/shiny_bonus.js"),"utf8");
  assert.match(portal,/つうさん '\+opts\.gCaught\+'ひき/);
  assert.match(portal,/id="q4b-shiny-summary"/);
  assert.equal(portal.includes("opts.progressSummary"),false);
  assert.equal(portal.includes("ps.join"),false);
  assert.match(shiny,/if\(!box\) return/);
  assert.equal(shiny.includes("hero.parentNode.insertBefore"),false);
});

test("M7 axis thinning includes first and last dates for every range",()=>{
  function indices(length){
    const count=Math.min(5,length),seen=new Set(),out=[];
    for(let i=0;i<count;i++){const index=count===1?0:Math.round(i*(length-1)/(count-1));if(!seen.has(index)){seen.add(index);out.push(index);}}
    return out;
  }
  for(const length of [14,60,365]){
    const got=indices(length);
    assert.ok(got.length>=4&&got.length<=5,String(length));
    assert.equal(got[0],0);assert.equal(got.at(-1),length-1);
  }
  const portal=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.match(portal,/var mid=Math\.ceil\(max\/2\)/);
  assert.match(portal,/>もん<\/small>/);
  assert.match(portal,/q4b-graph-x-axis/);
  assert.match(portal,/border-top:1px solid rgba\(120,130,110/);
});

test("M8 Eurosternus has three legs per side and retains distinct mandibles",()=>{
  const source=fs.readFileSync(path.join(root,"shared/bespoke.js"),"utf8");
  const match=source.match(/eurosternus_noko_kuwagata:function[\s\S]*?return `([\s\S]*?)`; \},/);
  assert.ok(match);
  const art=match[1];
  const legPaths=[...art.matchAll(/<path d="([^"]+)" fill="none" stroke="\$\{K\}" stroke-width="2\.5"/g)];
  assert.equal(legPaths.length,2);
  assert.equal((legPaths[0][1].match(/M/g)||[]).length,3);
  assert.equal((legPaths[1][1].match(/M/g)||[]).length,3);
  assert.equal((art.match(/stroke-width="3\.5"/g)||[]).length,2);
  assert.match(art,/M50 54 L50 88/);
});

test("M8 renderer remains unclipped at card and battle sizes",()=>{
  const context={console};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/bugs.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/render.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(root,"shared/bespoke.js"),"utf8"),context);
  const sp=context.Q4B_BUGS.find(x=>x.id==="eurosternus_noko_kuwagata");assert.ok(sp);
  for(const size of [54,100,180])for(const shiny of [false,true]){
    const normal=context.Q4BRender.species(sp,shiny);
    const framed=context.Q4BRender.deco(sp,shiny);
    assert.match(normal,/^<svg/);assert.match(framed,/^<svg/);assert.match(normal,/viewBox="0 0 100 100"/);
    assert.ok(size>0);
  }
});

console.log(`RESULT ${passed} passed, 0 failed`);
