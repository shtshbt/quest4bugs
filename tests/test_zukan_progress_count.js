"use strict";

/* 図鑑達成度 (分子/分母) の回帰テスト。
   ホーム総合 "N / 1213 しゅるい" の分子は
     - 種 ID 移行 (docs/species_migrations.md) を集計より前に適用し、
     - bugs.js に実在する種のみ数える (nushi_* 疑似 id・撤去済み旧 id を除外する)
   ことを検証する。node tests/test_zukan_progress_count.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console, setTimeout, clearTimeout};
context.window = context;
context.CustomEvent = function(type, init){ this.type=type; this.detail=init&&init.detail; };
context.dispatchEvent = function(){};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/reward.js"), "utf8"), context);
const reward = context.Q4BReward;
const portal = fs.readFileSync(path.join(root, "index.html"), "utf8");

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* index.html の countSpecies と同じ規則 (bugs.js 実在種のみ) の参照実装。
   ソース側と乖離しないよう、規則自体は下の source 断面テストで固定する。 */
function countSpecies(catches){
  if(!catches) return 0;
  let n = 0;
  for(const id in catches){
    if(!Object.prototype.hasOwnProperty.call(catches, id)) continue;
    if(!reward.spById(id)) continue;
    n++;
  }
  return n;
}

test("portal applies species migrations before the achievement tally", () => {
  const migIdx = portal.indexOf("Q4BReward.applySpeciesMigrations(kp.coll)");
  const tallyIdx = portal.indexOf("keisanN=countSpecies(");
  assert.ok(migIdx > -1, "portal no longer migrates kp.coll");
  assert.ok(tallyIdx > -1, "portal tally no longer uses countSpecies");
  assert.ok(migIdx < tallyIdx, "migration must run before keisanN tally");
  /* 旧実装 (集計後の _legacyGames 内 migration) が復活していないこと */
  assert.equal(portal.includes("var _mig = it.isEi"), false);
  /* 3 教科とも membership-aware カウントを使うこと */
  assert.match(portal, /keisanN=countSpecies\(kp\.coll\.catches\)/);
  assert.match(portal, /kanjiN=ks\.coll\?countSpecies\(ks\.coll\.catches\):0/);
  assert.match(portal, /eitangoN=countSpecies\(es\.catches\)/);
});

test("portal counts eitango favorites/recent remap from the save root", () => {
  assert.match(portal, /applySpeciesMigrations\(\{catches:es\.catches, favorites:es\.favorites, recent:es\.recent\}\)/);
});

test("coexisting old+new ids tally as one species once migrated", () => {
  const coll = {catches:{
    ootora_hanamuguri:{n:1, max:15, min:15, records:[{d:"2026-05-01", s:15, sex:"m", shiny:false}]},
    chairo_kanabun:{n:1, max:20, min:20, records:[{d:"2026-08-12", s:20, sex:"f", shiny:false}]}
  }};
  /* 修正前の集計順 (migration 前に Object.keys) だと 2 種に見えた */
  assert.equal(Object.keys(coll.catches).length, 2);
  reward.applySpeciesMigrations(coll);
  assert.equal(countSpecies(coll.catches), 1);
  assert.equal(coll.catches.chairo_kanabun.n, 2);
  assert.equal(coll.catches.chairo_kanabun.records.length, 2);
});

test("countSpecies drops ids outside the 1213 denominator set", () => {
  const catches = {
    oniyanma:{n:1, records:[]},              /* 実在種: 数える */
    nushi_oniyanma:{n:1, records:[]},        /* えいたんごヌシ疑似 id: 数えない */
    ootora_hanamuguri:{n:1, records:[]},     /* 撤去済み旧 id (未移行 save): 数えない */
    removed_dummy_species_xyz:{n:1, records:[]}
  };
  assert.equal(reward.spById("nushi_oniyanma"), undefined);
  assert.equal(reward.spById("ootora_hanamuguri"), undefined);
  assert.equal(countSpecies(catches), 1);
  assert.equal(countSpecies(null), 0);
  assert.equal(countSpecies({}), 0);
});

test("home numerator upper bound equals the denominator (1213)", () => {
  /* 全種捕獲 + 疑似 id 混入でも分子は分母 1213 を超えない */
  const catches = {};
  for(const sp of context.Q4B_BUGS) catches[sp.id] = {n:1, records:[]};
  catches["nushi_hercules_beetle"] = {n:1, records:[]};
  assert.equal(context.Q4B_BUGS.length, 1213);
  assert.equal(countSpecies(catches), 1213);
});

console.log("total", passed, "tests passed");
