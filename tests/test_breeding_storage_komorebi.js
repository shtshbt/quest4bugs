/* shared storage の卵 validator が小道の卵を隔離せず、3 教科と不明 game の
   従来判定も維持することを実データと実 reward.js で固定する。
   node tests/test_breeding_storage_komorebi.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

function storageContext(){
  const backing = new Map();
  const localStorage = {
    get length(){ return backing.size; },
    key(index){ return Array.from(backing.keys())[index] || null; },
    getItem(key){ return backing.has(key) ? backing.get(key) : null; },
    setItem(key, value){ backing.set(key, String(value)); },
    removeItem(key){ backing.delete(key); }
  };
  const sessionStorage = { getItem(){ return null; }, setItem(){} };
  const context = { console, localStorage, sessionStorage, setTimeout, clearTimeout, structuredClone, Date, Math, Promise };
  context.window = context;
  context.navigator = {};
  context.addEventListener = function(){};
  context.dispatchEvent = function(){};
  context.CustomEvent = function(type, init){ this.type = type; this.detail = init && init.detail; };
  context.document = {
    body: { appendChild(){} },
    getElementById(){ return null; },
    createElement(){ return { style:{}, classList:{ toggle(){} }, appendChild(){} }; }
  };
  vm.createContext(context);
  for(const file of ["shared/bugs.js", "shared/reward.js", "shared/storage.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

function egg(id, game){ return { id, game, sex:"m", progress:0, target:10 }; }

const context = storageContext();
const save = context.QuestSave;
const reward = context.Q4BReward;

test("a real komorebi egg survives breeding storage validation", () => {
  const id = "medama_yamamayu";
  assert.equal(reward.eggGameFor(reward.spById(id)), "komorebi");
  save.breedingSet("komorebi", { eggs:[egg(id, "komorebi")], pendingEggs:[], stats:{totalAbandoned:0} });
  const stored = save.breedingOf("komorebi");
  assert.equal(stored.eggs.length, 1);
  assert.equal(stored.eggs[0].id, id);
  assert.equal(Object.prototype.hasOwnProperty.call(stored, "_brokenEggs"), false);
});

test("the three main games remain valid", () => {
  const games = ["keisan", "kanji", "eitango"];
  const eggs = games.map(game => {
    const species = reward.bugs.find(sp => reward.eggGameFor(sp) === game);
    assert.ok(species, game);
    return egg(species.id, game);
  });
  save.breedingSet("main", { eggs, pendingEggs:[], stats:{totalAbandoned:0} });
  const stored = save.breedingOf("main");
  assert.deepEqual(Array.from(stored.eggs, value => value.game), games);
  assert.equal(Object.prototype.hasOwnProperty.call(stored, "_brokenEggs"), false);
});

test("an unknown game is still quarantined", () => {
  save.breedingSet("unknown", { eggs:[egg("medama_yamamayu", "battle")], pendingEggs:[], stats:{totalAbandoned:0} });
  const stored = save.breedingOf("unknown");
  assert.equal(stored.eggs.length, 0);
  assert.equal(stored._brokenEggs.length, 1);
  assert.equal(stored._brokenEggs[0].game, "battle");
});

console.log("RESULT " + passed + " passed, 0 failed");
