"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console, setTimeout, clearTimeout};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/reward.js"), "utf8"), context);
const reward = context.Q4BReward;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function shiftDay(today, days){
  const date = new Date(today + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("answer buckets use exact boundaries and interrupted answers skip timing", () => {
  const empty = {};
  let log = reward.logAnswer(empty, "wariai", true, 4999, false, "2026-08-14");
  assert.deepEqual(empty, {});
  log = reward.logAnswer(log, "wariai", false, 5000, false, "2026-08-14");
  log = reward.logAnswer(log, "wariai", true, 60000, false, "2026-08-14");
  log = reward.logAnswer(log, "wariai", true, 10000, true, "2026-08-14");
  assert.deepEqual(JSON.parse(JSON.stringify(log["2026-08-14"].wariai)), {
    n:4, ok:3, t:[1,1,0,1], x:1
  });
});

test("answer history prunes days older than 180 days", () => {
  const today = "2026-08-14";
  const tooOld = shiftDay(today, -181);
  const recent = shiftDay(today, -179);
  const seed = {};
  seed[tooOld] = {wariai:{n:1,ok:1,t:[1,0,0,0],x:0}};
  seed[recent] = {wariai:{n:1,ok:0,t:[0,1,0,0],x:0}};
  const log = reward.logAnswer(seed, "wariai", true, 1000, false, today);
  assert.equal(Object.prototype.hasOwnProperty.call(log, tooOld), false);
  assert.equal(Object.prototype.hasOwnProperty.call(log, recent), true);
});

test("legacy profiles initialize missing answer history", () => {
  const profile = {name:"legacy"};
  profile.anslog = reward.logAnswer(profile.anslog, "reading", false, 15000, false, "2026-08-14");
  assert.deepEqual(JSON.parse(JSON.stringify(profile.anslog["2026-08-14"].reading)), {
    n:1, ok:0, t:[0,0,1,0], x:0
  });
});

test("every game starts the timer and records through the shared helper", () => {
  const sources = {
    keisan:fs.readFileSync(path.join(root, "keisan/app.js"), "utf8"),
    kanji:fs.readFileSync(path.join(root, "kanji/index.html"), "utf8"),
    eitango:fs.readFileSync(path.join(root, "eitango/index.html"), "utf8"),
    komorebi:fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8")
  };
  assert.match(sources.keisan, /KEISAN_ANSWER_TIMER\.start\(\)/);
  assert.match(sources.keisan, /logAnswer\(p\.anslog,q\.cat/);
  assert.match(sources.kanji, /KANJI_ANSWER_TIMER\.start\(\)/);
  assert.match(sources.kanji, /logAnswer\(ST\.anslog,p\.sk/);
  assert.match(sources.eitango, /EITANGO_ANSWER_TIMER\.start\(\)/);
  assert.match(sources.eitango, /logAnswer\(P\.anslog,item\.type/);
  assert.match(sources.komorebi, /KOMOREBI_ANSWER_TIMER\.start\(\)/);
  assert.match(sources.komorebi, /logAnswer\(profile\.anslog,cat/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
