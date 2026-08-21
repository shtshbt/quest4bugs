"use strict";

/* ポータルの自動孵化が小道 save と競合したときの統合 (index.html の
   _mergeKomorebiProfileCatches) の回帰テスト。

   ポータルが小道 save に書くのは collection.catches と totalCatches だけなので、
   統合の土台は remote 側でなければならない。local を土台にしていた頃は、向こうの
   端末で増えた道具・装備・奉納ログ・メダル・日別解答数が、こちらの古いスナップ
   ショットでまるごと巻き戻っていた (2026-08-20 修正)。
   node tests/test_portal_komorebi_merge.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const portal = fs.readFileSync(path.join(root, "index.html"), "utf8");

/* 実装そのものを切り出して動かす。参照実装を書くと本体と乖離する。 */
function sliceMerge(src) {
  const start = src.indexOf("function _mergeKomorebiProfileCatches(");
  const end = src.indexOf("function _loadHatchProfile(");
  assert.ok(start > -1, "index.html に _mergeKomorebiProfileCatches が無い");
  assert.ok(end > start, "index.html に _loadHatchProfile が無い");
  return src.slice(start, end);
}

const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(sliceMerge(portal), context);
const merge = (local, remote) => context._mergeKomorebiProfileCatches(local, remote);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS", name); }

const rec = (s, d) => ({ d, s, sex: "m", shiny: false });

function profile(extra) {
  return Object.assign({
    schemaVersion: 1, unlocked: true, lv: {}, maxLv: {}, stats: {}, recent: {}, adapt: {},
    anslog: {}, daily: {}, trophies: {}, trophyProgress: {}, srs: {}, lv10ClearAt: {},
    lapCount: {}, mintedLaps: {}, tools: [], toolDex: {}, uroLog: [], equippedToolId: null,
    ratioHistory: { itemIds: [], patternIds: [] },
    collection: { gauge: 0, totalCatches: 0, catches: {} }
  }, extra || {});
}

test("the other device's tools, equipment and offerings survive the hatch merge", () => {
  /* local = ポータルが読んだ時点の古いスナップショット + 孵化ぶん。
     remote = その間に小道で遊んで増えた側。 */
  const local = profile({ collection: { gauge: 0, totalCatches: 1,
    catches: { ameiro_tonbo: { n: 1, max: 40, min: 40, records: [rec(40, "2026-08-17")] } } } });
  const remote = profile({
    tools: [{ type: "cho_net", remaining: 12 }, { type: "light_trap", remaining: 30 }],
    equippedToolId: "light_trap",
    toolDex: { cho_net: "2026-08-15", light_trap: "2026-08-19" },
    uroLog: [{ cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", lap: 1,
      date: "2026-08-18", tool: "cho_net" }],
    trophies: { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-18" } },
    lapCount: { kom_ratio: 2 },
    daily: { "2026-08-19": { n: 24, ok: 20 } },
    anslog: { "2026-08-19": { kom_ratio: { n: 24, ok: 20, t: [0, 0, 0, 0], x: 0 } } },
    collection: { gauge: 5, totalCatches: 0, catches: {} }
  });
  const merged = merge(local, remote);
  assert.equal(merged.tools.length, 2, "向こうの道具箱が消えた");
  assert.equal(merged.equippedToolId, "light_trap", "向こうの装備が巻き戻った");
  assert.equal(Object.keys(merged.toolDex).length, 2, "道具ずかんが巻き戻った");
  assert.equal(merged.uroLog.length, 1, "奉納の記録が消えた");
  assert.equal(Object.keys(merged.trophies).length, 1, "メダルが消えた");
  assert.equal(merged.lapCount.kom_ratio, 2, "周回が巻き戻った");
  assert.equal(merged.daily["2026-08-19"].n, 24, "日別の解答数が消えた");
  assert.equal(merged.anslog["2026-08-19"].kom_ratio.n, 24, "解答ログが消えた");
});

test("the hatched catch still lands on top of the other device's state", () => {
  const local = profile({ collection: { gauge: 0, totalCatches: 1,
    catches: { ameiro_tonbo: { n: 1, max: 40, min: 40, records: [rec(40, "2026-08-17")] } } } });
  const remote = profile({ collection: { gauge: 0, totalCatches: 1,
    catches: { oo_onaga_yamamayu: { n: 1, max: 120, min: 120, records: [rec(120, "2026-08-18")] } } } });
  const merged = merge(local, remote);
  assert.equal(merged.collection.catches.ameiro_tonbo.n, 1, "孵化ぶんが落ちた");
  assert.equal(merged.collection.catches.oo_onaga_yamamayu.n, 1, "向こうの捕獲が落ちた");
  assert.equal(merged.collection.totalCatches, 2);
});

test("the record size field is s, so the larger individual wins", () => {
  const local = profile({ collection: { gauge: 0, totalCatches: 1,
    catches: { ameiro_tonbo: { n: 1, max: 40, min: 40, records: [rec(40, "2026-08-17")] } } } });
  const remote = profile({ collection: { gauge: 0, totalCatches: 1,
    catches: { ameiro_tonbo: { n: 1, max: 55, min: 55, records: [rec(55, "2026-08-18")] } } } });
  const merged = merge(local, remote);
  assert.equal(merged.collection.catches.ameiro_tonbo.max, 55, "最大個体が統合されていない");
  assert.equal(merged.collection.catches.ameiro_tonbo.min, 40);
  assert.equal(merged.collection.catches.ameiro_tonbo.n, 2);
  /* size を読んでいた頃の実装が復活していないこと */
  assert.equal(portal.includes("record&&record.size"), false);
});

test("a remote save without a collection is repaired instead of throwing", () => {
  const local = profile({ collection: { gauge: 0, totalCatches: 1,
    catches: { ameiro_tonbo: { n: 1, max: 40, min: 40, records: [rec(40, "2026-08-17")] } } } });
  const remote = profile();
  delete remote.collection;
  const merged = merge(local, remote);
  assert.equal(merged.collection.catches.ameiro_tonbo.n, 1);
  assert.equal(merged.collection.totalCatches, 1);
});

test("the merge is based on the remote profile, not the local snapshot", () => {
  assert.match(portal, /var merged=JSON\.parse\(JSON\.stringify\(remoteProfile\)\)/);
  assert.equal(portal.includes("var merged=JSON.parse(JSON.stringify(localProfile)),catches={};"), false);
});

console.log(`RESULT ${passed} passed, 0 failed`);
