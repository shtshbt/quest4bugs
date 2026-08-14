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
async function asyncTest(name, fn){ await fn(); passed++; console.log("PASS", name); }

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
  context.__backing = backing;
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
    let source = fs.readFileSync(path.join(root, file), "utf8");
    if(file === "shared/storage.js") source = source.replace(/\}\)\(window\);\s*$/, "global.__snapshotDoc=snapshotDoc;\n})(window);");
    vm.runInContext(source, context);
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

(async () => {
  await asyncTest("layEgg survives quarantine writeback and breeding revision increases", async () => {
    const pid = "lay_egg";
    let fragments = 100;
    reward.setEggStore({
      pid: () => pid,
      loadVersioned: key => save.loadVersioned("breeding", key, {eggs:[], pendingEggs:[], stats:{totalAbandoned:0}}),
      saveVersioned: (key, data, revision) => save.saveVersioned("breeding", key, data, revision)
    });
    reward.setFossilStore({
      pid: () => pid,
      get: () => fragments,
      spend(n){ if(fragments < n) return false; fragments -= n; return true; },
      refund(n){ fragments += n; return true; }
    });
    const species = reward.spById("hagata_murasaki");
    const collection = {catches:{}};
    collection.catches[species.id] = {n:2, min:20, max:21, records:[{size:20, sex:"m"}, {size:21, sex:"f"}]};
    const laid = await reward.layEgg(collection, species, {profileId:pid});
    assert.equal(laid.ok, true);
    const before = await save.loadVersioned("breeding", pid, null);

    const store = JSON.parse(context.__backing.get("q4b_store_v1"));
    store.kv["breeding\u0000" + pid].data.eggs.push({id:"broken", game:"battle"});
    context.__backing.set("q4b_store_v1", JSON.stringify(store));
    context.__backing.set("q4b_store_gen", String(Number(context.__backing.get("q4b_store_gen")) + 1));

    const roundTrip = save.breedingOf(pid);
    const after = await save.loadVersioned("breeding", pid, null);
    assert.equal(roundTrip.eggs.some(value => value.id === species.id), true);
    assert.equal(roundTrip._brokenEggs.length, 1);
    assert.ok(after.revision > before.revision);
  });

  await asyncTest("amber wallet entries carry increasing revisions", async () => {
    const pid = "amber";
    save.amberAdd(pid, 2);
    const first = await save.loadVersioned("wallet", pid, null);
    save.amberAdd(pid, 3);
    const second = await save.loadVersioned("wallet", pid, null);
    assert.equal(first.revision, 1);
    assert.equal(second.revision, 2);
    assert.ok(second.updatedBy);
  });

  await asyncTest("loadStore reloads data when the generation token changes", async () => {
    await save.save("keisan", "generation", {level:1});
    const store = JSON.parse(context.__backing.get("q4b_store_v1"));
    store.kv["keisan\u0000generation"].data = {level:2};
    context.__backing.set("q4b_store_v1", JSON.stringify(store));
    context.__backing.set("q4b_store_gen", String(Number(context.__backing.get("q4b_store_gen")) + 1));
    assert.deepEqual(await save.load("keisan", "generation"), {level:2});
  });

  test("komorebi is a CAS namespace", () => {
    assert.equal(save.isCASNamespace("komorebi"), true);
  });

  test("snapshot documents are compact", () => {
    const store = JSON.parse(context.__backing.get("q4b_store_v1"));
    assert.equal(context.__snapshotDoc(store).includes("\n"), false);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
