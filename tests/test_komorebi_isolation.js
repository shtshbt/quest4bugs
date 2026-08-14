"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadContext(injectAreaOnly){
  const context = {console, setTimeout, clearTimeout};
  context.window = context;
  context.CustomEvent = function(type, init){ this.type=type; this.detail=init&&init.detail; };
  context.dispatchEvent = function(){};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);
  if(injectAreaOnly){
    context.Q4B_BUGS.push({id:"synthetic_komorebi_species",order:"Coleoptera",rarity:"N",areaOnly:"komorebi"});
  }
  vm.runInContext(fs.readFileSync(path.join(root, "shared/reward.js"), "utf8"), context);
  return context;
}

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const base = loadContext(false);
const injected = loadContext(true);

test("main category selectors and reach averages ignore komorebi categories", () => {
  const context = {console};
  context.window = context;
  context.Q4B_KEISAN_NO_BOOT = true;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "keisan/app.js"), "utf8"), context);
  const mainCats = [
    ...context.Q4B_KEISAN.K5CATS,
    ...context.Q4B_KEISAN.K10CATS,
    ...context.Q4B_KEISAN.K5DEV,
    ...context.Q4B_KEISAN.K10DEV
  ];
  assert.deepEqual(
    [context.Q4B_KEISAN.K5CATS.length, context.Q4B_KEISAN.K10CATS.length, context.Q4B_KEISAN.K5DEV.length, context.Q4B_KEISAN.K10DEV.length],
    [6, 6, 30, 22]
  );
  assert.equal(mainCats.some(cat => cat.startsWith("kom_")), false);

  const battle = fs.readFileSync(path.join(root, "battle.html"), "utf8");
  const k5 = JSON.parse(battle.match(/var K5_CATS=(\[[^;]+\]);/s)[1]);
  const k10 = JSON.parse(battle.match(/var K10_CATS=(\[[^;]+\]);/s)[1]);
  assert.deepEqual(k5, ["hissan","hikizan","kuku","anzan","warizan","wasa","jikan","kakebun"]);
  assert.deepEqual(k10, ["mix","kufuu","deci","frac","sougou","warizan","wasa","jikan","kakebun","noudo","tabibito","hiritsu","tsurukame","kabusoku","heikin","soneki","shigoto","nenrei","ueki","ryuusui","tsuuka","shuuki","nichireki","kisokusei","hayasahi","shuugou","bairitsu","shoukyo","houjin","baai","hireihanpi"]);
  function average(cats, lv){ return cats.reduce((sum, cat) => sum + lv[cat], 0) / cats.length; }
  const k5Lv = Object.fromEntries(k5.map(cat => [cat, 4]));
  const k10Lv = Object.fromEntries(k10.map(cat => [cat, 7]));
  k5Lv.kom_kuku_run = 10;
  k10Lv.kom_ratio = 10;
  assert.equal(average(k5, k5Lv), 4);
  assert.equal(average(k10, k10Lv), 7);
});

test("synthetic areaOnly species changes no main pool or denominator count", () => {
  /* 小道 fixture の 12 種が既に areaOnly で入っている。ここでさらに 1 種注入しても
     本編の数が動かないことを確かめる。 */
  assert.ok(base.Q4B_BUGS.filter(sp => sp.areaOnly).length >= 84);   /* 在庫は命名 batch のたびに増える */
  for(const [game, poolCount, denomCount] of [["keisan",480,527],["kanji",432,452],["eitango",508,523]]){
    assert.equal(base.Q4BReward.poolCount(game), poolCount, game + " base pool");
    assert.equal(base.Q4BReward.zukanDenomCount(game), denomCount, game + " base denominator");
    assert.equal(injected.Q4BReward.poolCount(game), poolCount, game + " injected pool");
    assert.equal(injected.Q4BReward.zukanDenomCount(game), denomCount, game + " injected denominator");
  }
});

test("komorebi species stays outside the main zukan numerator", () => {
  const coll = {catches:{
    kabutomushi:{n:1,records:[]},
    synthetic_komorebi_species:{n:1,records:[]}
  }};
  assert.equal(injected.Q4BReward.zukanCaughtCount(coll, "keisan"), 1);
  assert.equal(injected.Q4BReward.zukanCaughtCount({catches:{synthetic_komorebi_species:{n:1}}}, "keisan"), 0);
  const portal = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(portal, /var total = keisanN \+ kanjiN \+ eitangoN \+ bossOnlyN;/);
});

test("komorebi selector contains only areaOnly komorebi species", () => {
  injected.Q4B_KOMOREBI_NO_BOOT = true;
  vm.runInContext(fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8"), injected);
  const species = injected.Q4B_KOMOREBI.speciesForArea();
  /* 実在の小道の種 + 注入した合成 1 種。すべて areaOnly であることが要点。 */
  assert.ok(species.length >= 85);
  assert.equal(species.some(sp => sp.id === "synthetic_komorebi_species"), true);
  assert.equal(species.every(sp => sp.areaOnly === "komorebi"), true);
});

test("Stage A keeps categories and save state in the komorebi namespace", () => {
  const komorebi = injected.Q4B_KOMOREBI;
  /* 公開済みは初回更新の 3 本。実装だけ先に進んだカテゴリは宣言されているが
     未公開で、リリースゲート側 (test_komorebi_release_gate.js) が押さえている。 */
  assert.deepEqual(Object.keys(komorebi.categories).filter(komorebi.isReleased), ["kom_ratio","kom_kuku_dan2","kom_kuku_run"]);
  const state = komorebi.createProfile();
  /* Lv の枠は未公開カテゴリにも作る。解禁の日に保存データの移行を要らなくするため。
     値は 1 のままで、遊べるようになるまで動かない。 */
  assert.deepEqual(Object.keys(state.lv), Object.keys(komorebi.categories));
  assert.deepEqual(Object.keys(state.maxLv), Object.keys(komorebi.categories));
  assert.equal(state.lv.kom_pi314, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.collection)), {gauge:0,totalCatches:0,catches:{}});
  assert.deepEqual(JSON.parse(JSON.stringify(state.trophies)), {});
  assert.deepEqual(JSON.parse(JSON.stringify(state.srs)), {});
  const keisan = fs.readFileSync(path.join(root, "keisan/app.js"), "utf8");
  assert.match(keisan, /QuestSave\.load\("komorebi",p\.id\)/);
  assert.match(keisan, /QuestSave\.save\("komorebi",p\.id,state\)/);
  assert.match(keisan, /if\(p\.type==="k5"\)\{title=furi5\(title\);body=furi5\(body\);\}/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
