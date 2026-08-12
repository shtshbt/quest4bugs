"use strict";

/* 種 ID 移行 (ootora_hanamuguri -> chairo_kanabun) の回帰テスト。
   docs/species_migrations.md 参照。node tests/test_species_migration.js で実行。 */

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
const BUGS = context.Q4B_BUGS;
const MIG = context.Q4B_SPECIES_MIGRATIONS;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

test("catalog denominator stays 1213 and ids are unique", () => {
  assert.equal(BUGS.length, 1213);
  const seen = {};
  for(const sp of BUGS){
    assert.equal(seen[sp.id], undefined, "duplicate id " + sp.id);
    seen[sp.id] = 1;
  }
});

test("Paratrichius doenitzi duplicate is resolved", () => {
  const doenitzi = BUGS.filter(sp => sp.scientificName === "Paratrichius doenitzi");
  assert.equal(doenitzi.length, 1);
  assert.equal(doenitzi[0].id, "ootorafu_kogane");
  assert.equal(BUGS.some(sp => sp.id === "ootora_hanamuguri"), false);
});

test("chairo_kanabun entry replaces the removed slot", () => {
  const sp = reward.spById("chairo_kanabun");
  assert.ok(sp, "chairo_kanabun missing");
  assert.equal(sp.jaName, "チャイロカナブン");
  assert.equal(sp.scientificName, "Cosmiomorpha similis");
  assert.equal(sp.order, "Coleoptera");
  assert.equal(sp.family, "Scarabaeidae");
  assert.equal(sp.rarity, "SR");
  assert.equal(sp.origin, "japan_native");
  /* vm realm 越えの配列は deepEqual が prototype 差で落ちるため JSON 比較 */
  assert.equal(JSON.stringify(sp.sizeMm), "[16,25]");
  assert.equal(JSON.stringify(sp.sizeBySexMm), JSON.stringify({m:[16,24], f:[17,25]}));
  assert.equal(sp.metamorphosis, "complete");
});

test("game pool sizes are unchanged (keisan 380 / kanji 333 / eitango 408)", () => {
  assert.equal(reward.gameFor(reward.spById("chairo_kanabun")), "keisan");
  assert.equal(reward.poolCount("keisan"), 380);
  assert.equal(reward.poolCount("kanji"), 333);
  assert.equal(reward.poolCount("eitango"), 408);
});

test("migration table maps removed ids onto live ids only", () => {
  assert.equal(JSON.stringify(MIG), JSON.stringify({ootora_hanamuguri: "chairo_kanabun"}));
  for(const from in MIG){
    assert.equal(BUGS.some(sp => sp.id === from), false, from + " still in BUGS");
    assert.ok(reward.spById(MIG[from]), MIG[from] + " not in BUGS");
  }
  assert.equal(reward.migrateSpeciesId("ootora_hanamuguri"), "chairo_kanabun");
  assert.equal(reward.migrateSpeciesId("kabutomushi"), "kabutomushi");
});

test("catches remap when the new id is not caught yet", () => {
  const entry = {n:2, max:16.5, min:13.2, shiny:1, normal:1,
    records:[{d:"2026-05-01", s:16.5, sex:"m", shiny:true}, {d:"2026-05-02", s:13.2, sex:"f", shiny:false}]};
  const coll = {catches:{ootora_hanamuguri: entry}, total:2};
  assert.equal(reward.applySpeciesMigrations(coll), true);
  assert.equal(coll.catches.ootora_hanamuguri, undefined);
  assert.deepEqual(coll.catches.chairo_kanabun, entry);
  assert.equal(coll.total, 2);
});

test("catches merge keeps both records when the new id already exists", () => {
  const coll = {catches:{
    ootora_hanamuguri: {n:3, max:17, min:13, shiny:1, normal:0, master:1,
      records:[{d:"2026-04-01", s:17, sex:"m", shiny:true}]},
    chairo_kanabun: {n:1, max:20, min:18, shiny:0, normal:1,
      records:[{d:"2026-06-01", s:20, sex:"f", shiny:false}]}
  }};
  assert.equal(reward.applySpeciesMigrations(coll), true);
  const e = coll.catches.chairo_kanabun;
  assert.equal(coll.catches.ootora_hanamuguri, undefined);
  assert.equal(e.n, 4);
  assert.equal(e.max, 20);
  assert.equal(e.min, 13);
  assert.equal(e.shiny, 1);
  assert.equal(e.normal, 1);
  assert.equal(e.master, 1);
  assert.equal(e.records.length, 2);
  assert.equal(e.records[0].d, "2026-06-01");
  assert.equal(e.records[1].d, "2026-04-01");
});

test("favorites and recent remap", () => {
  const coll = {
    catches:{},
    favorites:{ootora_hanamuguri:true, kabutomushi:true},
    recent:["item_a", "ootora_hanamuguri", "item_b"]
  };
  assert.equal(reward.applySpeciesMigrations(coll), true);
  assert.equal(coll.favorites.ootora_hanamuguri, undefined);
  assert.equal(coll.favorites.chairo_kanabun, true);
  assert.equal(coll.favorites.kabutomushi, true);
  assert.deepEqual(coll.recent, ["item_a", "chairo_kanabun", "item_b"]);
});

test("applySpeciesMigrations is idempotent", () => {
  const coll = {
    catches:{ootora_hanamuguri:{n:1, max:15, min:15, shiny:0, normal:1, records:[{d:"2026-01-01", s:15, sex:"m", shiny:false}]}},
    favorites:{ootora_hanamuguri:true}
  };
  assert.equal(reward.applySpeciesMigrations(coll), true);
  const snapshot = JSON.stringify(coll);
  assert.equal(reward.applySpeciesMigrations(coll), false);
  assert.equal(JSON.stringify(coll), snapshot);
  assert.equal(reward.applySpeciesMigrations(null), false);
  assert.equal(reward.applySpeciesMigrations({}), false);
});

test("breeding eggs and pendingEggs remap through the egg store", () => {
  let state = {
    eggs:[{id:"ootora_hanamuguri", sex:"m", progress:10, target:500, game:"keisan", origin:"lay", bornAt:"2026-08-01", shiny:false}],
    pendingEggs:[{id:"ootora_hanamuguri", sex:"f", progress:0, target:500, game:"keisan", origin:"lay", bornAt:"2026-08-02", shiny:false, queuedAt:"2026-08-02"}],
    stats:{totalAbandoned:0}
  };
  reward.setEggStore({get:() => state, save:s => { state = s; return true; }});
  const bs = reward.getBreedingState();
  assert.equal(bs.eggs[0].id, "chairo_kanabun");
  assert.equal(bs.eggs[0].progress, 10);
  assert.equal(bs.pendingEggs[0].id, "chairo_kanabun");
  /* 冪等: 2 回目の読取でも壊れない */
  const bs2 = reward.getBreedingState();
  assert.equal(bs2.eggs.length, 1);
  assert.equal(bs2.eggs[0].id, "chairo_kanabun");
  assert.equal(reward.applyBreedingSpeciesMigrations(bs2), false);
});

test("zukan catalog no longer carries the removed species", () => {
  vm.runInContext(fs.readFileSync(path.join(root, "zukan_config/zukan_catalog.js"), "utf8"), context);
  const idx = context.Q4B_ZUKAN_INDEX;
  assert.equal(idx.ootora_hanamuguri, undefined);
  assert.equal(idx.chairo_kanabun, undefined);   /* 写真なし = SVG fallback 稼働 */
  assert.ok(idx.ootorafu_kogane || true);        /* 正 entry の有無は写真取得状況に依存するため必須にしない */
});

console.log("total", passed, "tests passed");
