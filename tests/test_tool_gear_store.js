/* shared storage の採集道具 wallet (toolgear kv)。komorebi profile 直下に住んでいた
   tools / equippedToolId / toolDex を琥珀と同じ shared kv へ昇格させた配線を固定する。
   見るのは 4 つ: 未作成 kv での安全な既定値、set→of の往復と revision の前進、
   壊れた形の正規化、そして profile からの一方向移行 (消費後に復活しないこと)。
   node tests/test_tool_gear_store.js で実行。 */
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
  vm.runInContext(fs.readFileSync(path.join(root, "shared/storage.js"), "utf8"), context);
  return context;
}

const context = storageContext();
const save = context.QuestSave;
const SEP = String.fromCharCode(0);   /* storage.js の kv 区切り (SEP="U+0000") と同じ */

/* revision 等の entry metadata は公開 API に出ていないので、永続化された
   localStorage の JSON を直接開いて見る。 */
function storedEntry(pid){
  const raw = context.__backing.get("q4b_store_v1");
  if(!raw) return undefined;
  return JSON.parse(raw).kv["toolgear" + SEP + pid];
}

const BLANK = { tools: [], equippedToolId: null, toolDex: {}, migrated: false };

/* toolGearOf の返り値は vm 側 realm の Object で、deepEqual が prototype 差で
   落ちる。比較前にこちらの realm へ写す (test_home_daily_counts.js と同じ理由)。 */
const local = value => JSON.parse(JSON.stringify(value));
const gearOf = pid => local(save.toolGearOf(pid));

test("an empty pid returns the blank default and refuses writes", () => {
  assert.deepEqual(gearOf(""), BLANK);
  assert.deepEqual(gearOf(null), BLANK);
  assert.equal(save.toolGearSet("", { tools: [{ type: "ami", remaining: 5 }] }), false);
});

test("an unseen profile gets an independent blank each time", () => {
  const first = save.toolGearOf("nobody");
  assert.deepEqual(local(first), BLANK);
  /* 返り値を汚しても内部には漏れない (deep clone 相当) */
  first.tools.push({ type: "ami", remaining: 1 });
  first.toolDex.ami = "2026-08-20";
  assert.deepEqual(gearOf("nobody"), BLANK);
  assert.equal(storedEntry("nobody"), undefined, "of だけでは kv を作らない");
});

test("set then of round-trips and the revision advances", () => {
  const pid = "roundtrip";
  const gear = { tools: [{ type: "ami", remaining: 40 }, { type: "kago", remaining: 100 }],
    equippedToolId: "ami", toolDex: { ami: "2026-08-01", kago: "2026-08-10" }, migrated: false };
  assert.equal(save.toolGearSet(pid, gear), true);
  assert.deepEqual(gearOf(pid), gear);
  assert.equal(storedEntry(pid).revision, 1);
  assert.equal(typeof storedEntry(pid).updatedBy, "string");
  /* caller 側の参照を後から触っても保存済みの中身は動かない */
  gear.tools[0].remaining = 1;
  assert.equal(save.toolGearOf(pid).tools[0].remaining, 40);
  save.toolGearSet(pid, { tools: [{ type: "ami", remaining: 39 }], equippedToolId: "ami",
    toolDex: { ami: "2026-08-01" } });
  assert.equal(storedEntry(pid).revision, 2, "上書きごとに revision が増える");
  assert.equal(save.toolGearOf(pid).tools[0].remaining, 39);
});

test("broken shapes are normalized instead of stored verbatim", () => {
  const pid = "broken";
  save.toolGearSet(pid, null);
  assert.deepEqual(gearOf(pid), BLANK);
  save.toolGearSet(pid, { tools: "not-an-array", equippedToolId: 7, toolDex: ["x"] });
  assert.deepEqual(gearOf(pid), BLANK);
  save.toolGearSet(pid, {
    tools: [null, "x", { type: "", remaining: 5 }, { type: "ami", remaining: -3 },
      { type: "ami", remaining: 0 }, { type: "ami", remaining: 2.9 }, { remaining: 4 }],
    equippedToolId: "kago",          /* 本体の無い装備は取りこぼしとして外れる */
    toolDex: { ami: "2026-08-01", kago: 123, empty: "" }
  });
  assert.deepEqual(gearOf(pid), {
    tools: [{ type: "ami", remaining: 2 }],   /* 残量は整数へ、0 以下と type 欠落は落ちる */
    equippedToolId: null,
    toolDex: { ami: "2026-08-01" },
    migrated: false
  });
});

test("migration seeds the kv from the profile exactly once", () => {
  const pid = "migrate";
  const profile = { tools: [{ type: "ami", remaining: 40 }], equippedToolId: "ami",
    toolDex: { ami: "2026-08-01" } };
  assert.equal(save.toolGearMigrateFromProfile(pid, profile), true);
  const gear = gearOf(pid);
  assert.deepEqual(gear.tools, [{ type: "ami", remaining: 40 }]);
  assert.equal(gear.equippedToolId, "ami");
  assert.deepEqual(gear.toolDex, { ami: "2026-08-01" });
  assert.equal(gear.migrated, true, "移行で作った kv は migrated を立てる");
  assert.equal(storedEntry(pid).revision, 1);
  /* profile 側は消さない (古いクライアントとの共存・データ保全) */
  assert.deepEqual(profile.tools, [{ type: "ami", remaining: 40 }]);
  /* kv が既に在れば別の profile を持ち込んでも何もしない */
  assert.equal(save.toolGearMigrateFromProfile(pid, { tools: [{ type: "kago", remaining: 100 }] }), false);
  assert.deepEqual(gearOf(pid).tools, [{ type: "ami", remaining: 40 }]);
});

test("consumed gear never comes back through a re-migration", () => {
  const pid = "consume";
  const profile = { tools: [{ type: "ami", remaining: 40 }], equippedToolId: "ami", toolDex: {} };
  save.toolGearMigrateFromProfile(pid, profile);
  /* 使い切って空になった kv を、profile の残骸がもう一度埋めてはいけない */
  save.toolGearSet(pid, { tools: [], equippedToolId: null, toolDex: {}, migrated: true });
  assert.equal(save.toolGearMigrateFromProfile(pid, profile), false);
  const gear = gearOf(pid);
  assert.deepEqual(gear.tools, []);
  assert.equal(gear.migrated, true);
});

test("an empty or missing profile tools list never creates the kv", () => {
  const pid = "empty_profile";
  assert.equal(save.toolGearMigrateFromProfile(pid, { tools: [] }), false);
  assert.equal(save.toolGearMigrateFromProfile(pid, {}), false);
  assert.equal(save.toolGearMigrateFromProfile(pid, null), false);
  assert.equal(storedEntry(pid), undefined, "空の移行が kv エントリを作っている");
  /* エントリが無いままなので、後から道具を持つ profile が来れば移行できる */
  assert.equal(save.toolGearMigrateFromProfile(pid, { tools: [{ type: "ami", remaining: 3 }] }), true);
});

test("the toolgear namespace is registered for CAS", () => {
  const source = fs.readFileSync(path.join(root, "shared/storage.js"), "utf8");
  assert.match(source, /CAS_NAMESPACES\s*=\s*\{[^}]*\btoolgear:1\b/,
    "CAS_NAMESPACES に toolgear が入っていない");
  assert.equal(save.isCASNamespace("toolgear"), true);
});

console.log(`RESULT ${passed} passed, 0 failed`);
