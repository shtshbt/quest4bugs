/* こはく呼び出しの捕獲記録に入手経路 (src:"amber") が残ること。
   学習を経ない捕獲の割合を監視するため (docs/tomoshibi_streak_design.md 7 章)。
   色違いの判定に使う source とは独立で、記録用の印を足しても確率は変わらない。
   node tests/test_capture_source.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const context = { console, Date, Math, JSON, Object };
context.window = context;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const R = context.Q4BReward;
const sp = context.Q4B_BUGS[0];
const morning = new Date(2026, 8, 28, 7, 0, 0);

function lastRecord(coll){
  const records = coll.catches[sp.id].records;
  return records[records.length - 1];
}

test("an amber-sourced record carries src amber", () => {
  const coll = { catches: {} };
  R.record(coll, sp, { source: "amber", random: () => 0.99 });
  assert.equal(lastRecord(coll).src, "amber");
});

test("wild and other records carry no src field", () => {
  const coll = { catches: {} };
  R.record(coll, sp, { source: "wild", random: () => 0.99 });
  assert.equal("src" in lastRecord(coll), false);
  R.record(coll, sp, { random: () => 0.99 });
  assert.equal("src" in lastRecord(coll), false);
});

test("recordSource marks the record without changing the shiny odds of the draw source", () => {
  const coll = { catches: {} };
  /* 朝の窓で source:"wild" は 0.045。recordSource を足しても判定は wild のまま。 */
  const r = R.record(coll, sp, { source: "wild", recordSource: "amber", now: morning, random: () => 0.03 });
  assert.equal(lastRecord(coll).src, "amber");
  assert.equal(r.shinyChance, 0.045);
  assert.equal(r.shiny, true);
  const plainAmber = R.record(coll, sp, { source: "amber", now: morning, random: () => 0.03 });
  assert.equal(plainAmber.shinyChance, 0.015, "a main-game amber call keeps the normal odds");
});

console.log("RESULT " + passed + " passed, 0 failed");
