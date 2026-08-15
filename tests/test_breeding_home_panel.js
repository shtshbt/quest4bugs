/* 御神木の卵育成パネルの小道段: 出し分けの回帰テスト。
   1 個産むまで段が見えないと御神木で育てられることに気づけないため、
   小道を開いた profile には卵ゼロでも段を出す (2026-08-15 実機フィードバック)。
   node tests/test_breeding_home_panel.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {};
context.window = context;
context.global = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/breeding.js"), "utf8"), context);

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const panel = opts => context.Q4BBreeding.homeBreedingPanelHTML(opts);

test("an unplayed profile with no komorebi eggs hides the komorebi row", () => {
  const html = panel({ eggs: [], pendingEggs: [] });
  assert.doesNotMatch(html, /こもれびで そだてている むし/);
});

test("a played profile shows the komorebi row even with zero eggs", () => {
  const html = panel({ eggs: [], pendingEggs: [], komorebiPlayed: true });
  assert.match(html, /こもれびで そだてている むし/);
  assert.match(html, /\(0\/3\)/);
  assert.match(html, /こもれびの ずかんから たまごを うめるよ/);
});

test("a komorebi egg shows the row with the growth hint even when unplayed flag is absent", () => {
  const egg = { id: "e1", speciesId: "ameiro_tonbo", game: "komorebi", stage: 0, progress: 0 };
  const html = panel({ eggs: [egg], pendingEggs: [] });
  assert.match(html, /こもれびで そだてている むし/);
  assert.match(html, /こもれびの小道の もんだいで そだつよ/);
  assert.doesNotMatch(html, /ずかんから たまごを うめるよ/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
