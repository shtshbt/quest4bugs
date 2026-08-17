"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const storageSource = fs.readFileSync(path.join(root, "shared/storage.js"), "utf8");

function makeLocalStorage(seed){
  const backing = new Map(Object.entries(seed || {}).map(([k,v]) => [k, String(v)]));
  return {
    backing,
    api: {
      get length(){ return backing.size; },
      key(i){ return Array.from(backing.keys())[i] || null; },
      getItem(k){ return backing.has(k) ? backing.get(k) : null; },
      setItem(k,v){ backing.set(k, String(v)); },
      removeItem(k){ backing.delete(k); }
    }
  };
}

function storageContext(seed){
  const local = makeLocalStorage(seed);
  const context = {
    console,
    localStorage: local.api,
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    setTimeout,
    clearTimeout,
    setInterval(){ return 0; },
    clearInterval(){},
    structuredClone,
    Date,
    Math,
    Promise,
    TextEncoder,
    TextDecoder,
    fetch: async () => { throw new Error("network disabled in storage contract test"); }
  };
  context.window = context;
  context.navigator = {};
  context.addEventListener = function(){};
  context.dispatchEvent = function(){};
  context.CustomEvent = function(type, init){ this.type=type; this.detail=init && init.detail; };
  vm.createContext(context);
  vm.runInContext(storageSource, context, {filename:"shared/storage.js"});
  context.__local = local;
  return context;
}

const REQUIRED_METHODS = [
  // core namespaced persistence
  "load", "save", "loadVersioned", "saveVersioned", "isCASNamespace",
  // profiles
  "profiles", "saveProfiles", "currentProfile", "setCurrentProfile",
  "addProfile", "updateProfile", "deleteProfile",
  // shared progression/economy
  "amberOf", "amberAdd", "amberSpend",
  "goshinOf", "recordCorrect",
  "chameleonOf", "unlockChameleon", "recordChameleonClear",
  "equipmentOf", "restoreEquipment", "equipItem", "unequipItem",
  "spendAwakeningDrops", "addFossil", "spendFossil", "fossilOf",
  "breedingOf", "breedingSet", "markDropSeen",
  // status / storage safety
  "getStatus", "onStatus", "isDegraded", "warnIfDegraded", "getSyncMeta",
  "requestPersistent", "storageEstimate", "autoConnect",
  // conflict diagnostics
  "getConflicted", "clearConflicted", "listConflictBackups", "readConflictBackup",
  "getDeviceId",
  // current household GitHub transport
  "connectGitHub", "disconnect", "getConfig", "saveConfig", "clearConfig", "testConnection",
  "pushAll", "pullAll", "syncDown",
  // provider-independent backup / legacy compatibility
  "exportAll", "importAll", "loadKey", "saveKey",
  // UI compatibility
  "mountSaveBadge"
];

(async () => {
  const a = storageContext();
  const save = a.QuestSave;
  assert.ok(save && typeof save === "object", "QuestSave must exist");

  for(const name of REQUIRED_METHODS){
    assert.equal(typeof save[name], "function", `QuestSave.${name} must remain a function`);
  }

  // Representative logical round trip. This intentionally tests the public backup
  // format, not any physical backend implementation.
  const p = save.addProfile("contract", "🪲");
  assert.ok(p && p.id);
  await save.save("keisan", p.id, {level:7, answers:123});
  const versioned = await save.loadVersioned("keisan", p.id, null);
  assert.equal(versioned.data.level, 7);
  assert.ok(versioned.revision >= 1);

  const exported = save.exportAll();
  const doc = JSON.parse(exported);
  assert.equal(doc.schema, "quest4bugs.fieldnote.v2");
  assert.ok(Array.isArray(doc.profiles));
  assert.ok(doc.kv && typeof doc.kv === "object");

  const b = storageContext();
  await b.QuestSave.importAll(exported, "restore");
  const restoredProfiles = await b.QuestSave.profiles();
  assert.equal(restoredProfiles.length, 1);
  assert.equal(restoredProfiles[0].name, "contract");
  const restored = await b.QuestSave.load("keisan", p.id);
  assert.equal(restored.level, 7);
  assert.equal(restored.answers, 123);

  console.log(`PASS QuestSave public contract (${REQUIRED_METHODS.length} methods)`);
  console.log("PASS export/import logical round trip");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
