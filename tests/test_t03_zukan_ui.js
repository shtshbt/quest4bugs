"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const context={console};context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"shared/render.js"),"utf8"),context);
const species={id:"fixture",jaName:"とてもながいにほんごのこんちゅうのなまえ",renderer:"kabuto",colors:["#d5a21a","#33240e"]};
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}

test("M4 toggle has an explicit host lifecycle and no fixed boot control",()=>{
  const shared=fs.readFileSync(path.join(root,"shared/zukan_render.js"),"utf8");
  assert.match(shared,/setZukanModeToggleVisible = function\(active, host\)/);
  assert.match(shared,/mountZukanModeToggle = function\(\)\{ return global\.Q4BRender\.setZukanModeToggleVisible\(false\)/);
  assert.equal(shared.includes("position:fixed;top:54px"),false);
  for(const file of ["kanji/index.html","eitango/index.html","keisan/app.js","shared/boss_zukan.js"]){
    assert.match(fs.readFileSync(path.join(root,file),"utf8"),/setZukanModeToggleVisible/,file);
  }
  assert.equal(fs.readFileSync(path.join(root,"keisan/index.html"),"utf8").includes("innerHTML||''"),false);
});

test("M4 mode rerender preserves explicit filters, tabs, and scroll",()=>{
  const shared=fs.readFileSync(path.join(root,"shared/zukan_render.js"),"utf8");
  assert.match(shared,/scrollTo\(x,y\)/);
  assert.match(fs.readFileSync(path.join(root,"kanji/index.html"),"utf8"),/renderZukan\(_zukanCurTab/);
  assert.match(fs.readFileSync(path.join(root,"eitango/index.html"),"utf8"),/Q4BZukanRerender=function\(\)\{ if\(typeof render==='function'\) render\(\)/);
  assert.match(fs.readFileSync(path.join(root,"keisan/index.html"),"utf8"),/Q4BKeisanScreen==="zukan"/);
});

test("M5 shiny and ordinary renderers retain an SVG root across the fixture matrix",()=>{
  const hosts=["list","detail","boss","party","egg-hatch","portal-picker"];
  const modes=["svg","museum"];
  const sexes=["m","f",""];
  const widths=[320,390,620];
  const motion=["normal","reduced"];
  let cases=0;
  for(const host of hosts)for(const mode of modes)for(const sex of sexes)for(const width of widths)for(const reduced of motion){
    for(const shiny of [false,true]){
      const html=context.Q4BRender.species(species,shiny,sex);
      assert.match(html,/^<svg\b/,`${host}/${mode}/${sex}/${width}/${reduced}/${shiny}`);
      assert.equal(html.includes("q4b-shiny-art"),false);
      cases++;
    }
  }
  assert.equal(cases,432);
});

test("M5 decoration is host-scoped and idempotent",()=>{
  const source=fs.readFileSync(path.join(root,"shared/shiny_bonus.js"),"utf8");
  assert.equal(source.includes("wrapRenderer"),false);
  assert.match(source,/safeReveal = card\.closest\("\.modal, \.mcard, \[data-q4b-zd\], \.drop-award"\)/);
  assert.match(source,/!card\.dataset\.q4bShinyRevealed/);
  assert.equal(fs.readFileSync(path.join(root,"shared/shiny_bonus.css"),"utf8").includes(".q4b-shiny-art"),false);
});

console.log(`RESULT ${passed} passed, 0 failed`);
