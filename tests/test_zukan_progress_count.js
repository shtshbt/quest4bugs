"use strict";

/* 図鑑達成度 (分子/分母) の回帰テスト。
   ホーム総合 "N / 1446 しゅるい" の分子は
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

/* index.html の countSpecies と同じ規則 (本編の分母に属する実在種のみ) の参照実装。
   ソース側と乖離しないよう、規則自体は下の source 断面テストで固定する。 */
function countSpecies(catches){
  if(!catches) return 0;
  let n = 0;
  for(const id in catches){
    if(!Object.prototype.hasOwnProperty.call(catches, id)) continue;
    const sp = reward.spById(id);
    if(!sp || sp.areaOnly) continue;   /* エリア専用種 (小道) は本編の分母外 */
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

test("countSpecies drops ids outside the home denominator set", () => {
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

test("home numerator counts every species the home denominator covers", () => {
  /* 1213 既存 + batch1 149 = 1362 が本編の分母。さらに小道 fixture 12 種が
     areaOnly で bugs.js に居るが、ホームの分子にも分母にも入らない。 */
  const catches = {};
  for(const sp of context.Q4B_BUGS) catches[sp.id] = {n:1, records:[]};
  catches["nushi_hercules_beetle"] = {n:1, records:[]};
  assert.equal(context.Q4B_BUGS.length, 1446);
  assert.equal(context.Q4B_BUGS.filter(sp => sp.areaOnly).length, 84);
  assert.equal(countSpecies(catches), 1362);
});

/* ---- 教科別達成度 (zukanDenomCount / zukanCaughtCount) ---- */

const PREDATORS = context.Q4B_BUGS.filter(sp => sp.boss && sp.boss.predator).map(sp => sp.id);

test("per-game denominators are the acquirable sets (keisan 477 / kanji 402 / eitango 473)", () => {
  assert.equal(reward.zukanDenomCount("keisan"), 477);   /* 430 pool + 38 master + 3 boss + 6 SS */
  assert.equal(reward.zukanDenomCount("kanji"), 402);    /* 382 pool + 8 master + 4 boss + 8 SS */
  assert.equal(reward.zukanDenomCount("eitango"), 473);  /* 458 pool + 7 master + 3 boss + 5 SS */
  /* 3 教科の分母 + 天敵 (入手経路なし) = 本編の全種 1362。小道の areaOnly 12 種は
     どの教科にも属さないのでこの等式には入らない。 */
  assert.equal(PREDATORS.length, 10);
  assert.equal(reward.zukanDenomCount("keisan") + reward.zukanDenomCount("kanji")
    + reward.zukanDenomCount("eitango") + PREDATORS.length, 1362);
});

test("every SS-other species has a battle acquisition path (non-predator roster boss)", () => {
  /* 分母算入の根拠: SS その他 (masterOnly/bossOnly 以外の SS) は全て battle roster の
     昆虫ボス。初回撃破が _recordBossInGameColl で gameFor(sp) の coll に record される。 */
  vm.runInContext(fs.readFileSync(path.join(root, "shared/battle.js"), "utf8"), context);
  const roster = context.Q4BBattle.roster;
  const ssOther = context.Q4B_BUGS.filter(sp => !sp.masterOnly && !sp.bossOnly && sp.rarity === "SS");
  assert.equal(ssOther.length, 19);
  for(const sp of ssOther){
    const r = roster.find(x => x.id === sp.id);
    assert.ok(r, sp.id + " not in battle roster");
    assert.equal(r.predator, false, sp.id + " must be an insect boss");
  }
});

test("special species count in both numerator and denominator of their game", () => {
  const master = context.Q4B_BUGS.find(sp => sp.masterOnly && sp.master && sp.master.game === "kanji");
  assert.ok(master, "no kanji masterOnly species");
  const collK = {catches:{}, total:0};
  reward.awardMaster(collK, master);                                     /* masterOnly 経路 */
  assert.equal(reward.zukanCaughtCount(collK, "kanji"), 1);
  const collC = {catches:{
    titan_kamikiri:{n:1, records:[]},        /* bossOnly (keisan, 非天敵) */
    hercules_beetle:{n:1, records:[]},       /* SS その他 (keisan, battle 経由) */
    kabutomushi:{n:1, records:[]}            /* 通常プール */
  }};
  assert.equal(reward.zukanCaughtCount(collC, "keisan"), 3);
  assert.equal(reward.zukanCaughtCount(collC, "kanji"), 0);              /* 他教科では数えない */
});

test("predators have no acquisition path and are outside both numerator and denominator", () => {
  for(const id of PREDATORS){
    assert.equal(!!reward.spById(id), true, id + " should exist in bugs.js");
  }
  /* 万一 catches に混入しても分子に入らない → 分子 ⊆ 分母 は保たれる */
  const coll = {catches:{mozu:{n:1, records:[]}, daiou_sasori:{n:1, records:[]}}};
  for(const g of ["keisan","kanji","eitango"]){
    assert.equal(reward.zukanCaughtCount(coll, g), 0, g);
  }
});

test("numerator never exceeds denominator even with pseudo/stale/foreign ids", () => {
  for(const g of ["keisan","kanji","eitango"]){
    const catches = {};
    for(const sp of context.Q4B_BUGS) catches[sp.id] = {n:1, records:[]};   /* 全種 (他教科含む) */
    catches["nushi_oniyanma"] = {n:1, records:[]};                           /* 疑似 id */
    catches["ootora_hanamuguri"] = {n:1, records:[]};                        /* 撤去済み旧 id */
    const caught = reward.zukanCaughtCount({catches}, g);
    assert.equal(caught, reward.zukanDenomCount(g), g);
  }
});

test("pages use the acquirable-set helpers and keisan pbar is clamped", () => {
  const keisan = fs.readFileSync(path.join(root, "keisan/app.js"), "utf8");
  const kanji = fs.readFileSync(path.join(root, "kanji/index.html"), "utf8");
  const eitango = fs.readFileSync(path.join(root, "eitango/index.html"), "utf8");
  for(const [src, game, file] of [[keisan, "keisan", "keisan/app.js"], [kanji, "kanji", "kanji/index.html"], [eitango, "eitango", "eitango/index.html"]]){
    assert.ok(src.includes("zukanCaughtCount"), file + " numerator not migrated");
    assert.ok(src.includes("zukanDenomCount"), file + " denominator not migrated");
    assert.ok(new RegExp("zukanDenomCount\\(['\"]" + game + "['\"]\\)").test(src), file + " must pass its own game id");
  }
  assert.match(keisan, /Math\.min\(100,Math\.round\(cnt\/tot\*100\)\)/);
  /* eitango 図鑑タブ (ALLSP 基準で内部整合) は現行維持 */
  assert.match(eitango, /const caught=zk\.filter\(s=>P\.catches\[s\[0\]\]\)\.length;/);
});

console.log("total", passed, "tests passed");
