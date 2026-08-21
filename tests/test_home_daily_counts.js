"use strict";

/* ホーム「まいにちの がくしゅう」グラフ / つうさん問題数 / れんぞく日数の回帰テスト。
   小道 (komorebi) の解答は komorebi.anslog[日][カテゴリ]={n,ok,...} に入っており、
   教科側の平坦な daily/log/cal とは形が違う。2026-08-20 まで集計に入っておらず、
   小道だけ遊んだ日が「学習ゼロ」扱いで streak が切れていた。
   node tests/test_home_daily_counts.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const portal = fs.readFileSync(path.join(root, "index.html"), "utf8");
const reward = fs.readFileSync(path.join(root, "shared/reward.js"), "utf8");

/* 小道本体は DOM 無しでも normalizeProfile / mergeProfiles だけ触れる。 */
const komCtx = { console, setTimeout, clearTimeout };
komCtx.window = komCtx;
komCtx.Q4B_KOMOREBI_NO_BOOT = true;
komCtx.Q4B_KOMOREBI_TEST_HOOKS = true;
vm.createContext(komCtx);
for (const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js",
  "komorebi/trophies.js", "shared/tools.js", "komorebi/uro.js",
  "komorebi/economy_flag.js", "komorebi/app.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), komCtx);
}
const komorebi = komCtx.Q4B_KOMOREBI;

/* index.html から集計ヘルパの実装だけを切り出して評価する。参照実装を書くと本体と
   乖離するので、ソースそのものを動かす。 */
function sliceHelpers(src) {
  const start = src.indexOf("function ndk(k)");
  const end = src.indexOf("function setDashRange(");
  assert.ok(start > -1, "index.html に ndk が見つからない");
  assert.ok(end > start, "index.html に setDashRange が見つからない");
  return src.slice(start, end);
}

const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(sliceHelpers(portal), context);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS", name); }

test("dayTotal counts the komorebi channel", () => {
  assert.equal(context.dayTotal({ k: 1, j: 2, e: 3, m: 4 }), 10);
  assert.equal(context.dayTotal({ k: 1, j: 0, e: 0 }), 1);   /* 旧 save の m 欠落 */
  assert.equal(context.dayTotal(null), 0);
});

test("sumKomorebiDaily folds anslog categories into one per-day total", () => {
  const day = {};
  context.sumKomorebiDaily(day, {
    "2026-08-18": { kom_kuku: { n: 7, ok: 5 }, kom_ratio: { n: 3, ok: 3 } },
    "2026-08-19": { kom_hayasa: { n: 4, ok: 2 } }
  });
  assert.equal(day["2026-08-18"].m, 10);
  assert.equal(day["2026-08-19"].m, 4);
  assert.equal(day["2026-08-18"].k, 0);
});

test("komorebi-only days appear in the day map so the streak survives", () => {
  const day = {};
  context.sumDaily(day, { "2026-08-17": { n: 5 } }, "n", "k");
  context.sumKomorebiDaily(day, { "2026-08-18": { kom_kuku: { n: 6, ok: 6 } } });
  assert.deepEqual(Object.keys(day).sort(), ["2026-08-17", "2026-08-18"]);
  assert.equal(context.dayTotal(day["2026-08-18"]), 6);
});

test("subject and komorebi totals stack on the same day", () => {
  const day = {};
  context.sumDaily(day, { "2026-08-18": { n: 12 } }, "n", "k");
  context.sumDaily(day, { 20260818: { q: 8 } }, "q", "e");   /* えいたんごは数値キー */
  context.sumKomorebiDaily(day, { "2026-08-18": { kom_kuku: { n: 6 } } });
  /* blankDay は vm 側 realm の Object なので、比較前にこちらの realm へ写す */
  assert.deepEqual({ ...day["2026-08-18"] }, { k: 12, j: 0, e: 8, m: 6 });
  assert.equal(context.dayTotal(day["2026-08-18"]), 26);
});

test("malformed anslog entries are skipped instead of throwing", () => {
  const day = {};
  context.sumKomorebiDaily(day, null);
  context.sumKomorebiDaily(day, { "2026-08-18": null, "2026-08-19": { kom_kuku: null } });
  assert.deepEqual(day, {});
});

test("the dashboard prefers the unpruned komorebi daily store", () => {
  assert.match(portal, /sumDaily\(day,kom\.daily,"n","m"\)/);
  assert.match(portal, /else sumKomorebiDaily\(day,kom\.anslog\);/);
  const sumIdx = portal.indexOf('sumDaily(day,kom.daily,"n","m")');
  const streakIdx = portal.indexOf("while(day[ymd(probe)])");
  assert.ok(sumIdx > -1 && streakIdx > sumIdx, "streak は小道の加算より後で数えること");
});

test("komorebi keeps an unpruned lifetime daily store", () => {
  const app = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8");
  /* anslog は 180 日で切り捨てられる。生涯ぶんは daily 側に残ること。 */
  assert.match(reward, /cutoff\.setUTCDate\(cutoff\.getUTCDate\(\)-180\)/);
  assert.match(app, /anslog:\{\},daily:\{\}/);
  assert.match(app, /bumpDailyTotal\(profile,correct\)/);
  assert.match(app, /merged\.daily=mergeDailyTotals\(/);
  /* daily を刈る経路が生えていないこと */
  assert.equal(/p\.daily\s*=\s*\{\}[^;]*cutoff/.test(app), false);
});

test("an existing save seeds daily from anslog once, then keeps counting", () => {
  const stale = komorebi.createProfile();
  delete stale.daily;                       /* 2026-08-20 より前の save */
  stale.anslog = {
    "2026-08-18": { kom_kuku: { n: 7, ok: 5 }, kom_ratio: { n: 3, ok: 3 } },
    "2026-08-19": { kom_hayasa: { n: 4, ok: 2 } }
  };
  const seeded = komorebi.normalizeProfile(stale);
  assert.equal(seeded.changed, true, "種入れは save に反映されること");
  assert.equal(seeded.profile.daily["2026-08-18"].n, 10);
  assert.equal(seeded.profile.daily["2026-08-18"].ok, 8);
  assert.equal(seeded.profile.daily["2026-08-19"].n, 4);
  /* 2 度目の正規化で anslog をもう一度足さない */
  const again = komorebi.normalizeProfile(JSON.parse(JSON.stringify(seeded.profile)));
  assert.equal(again.profile.daily["2026-08-18"].n, 10);
});

test("a save whose anslog was already pruned keeps the older daily entries", () => {
  const p = komorebi.createProfile();
  p.daily = { "2026-01-05": { n: 12, ok: 9 }, "2026-08-19": { n: 4, ok: 2 } };
  p.anslog = { "2026-08-19": { kom_hayasa: { n: 4, ok: 2 } } };   /* 180 日で刈られた後 */
  const out = komorebi.normalizeProfile(p).profile;
  assert.equal(out.daily["2026-01-05"].n, 12, "刈られた過去が daily から消えた");
  assert.equal(Object.keys(out.daily).length, 2);
});

test("merging two devices takes the larger per-day count, never the sum", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.daily = { "2026-08-18": { n: 10, ok: 8 }, "2026-08-19": { n: 4, ok: 2 } };
  remote.daily = { "2026-08-18": { n: 6, ok: 6 }, "2026-08-20": { n: 9, ok: 7 } };
  const merged = komorebi.mergeProfiles(local, remote);
  assert.equal(merged.daily["2026-08-18"].n, 10, "同じ日が足し算になっている");
  assert.equal(merged.daily["2026-08-19"].n, 4, "local だけの日が消えた");
  assert.equal(merged.daily["2026-08-20"].n, 9, "remote だけの日が消えた");
});

test("every aggregation site uses dayTotal, not the 3-subject sum", () => {
  assert.equal(portal.includes("o.k+o.j+o.e"), false);
  assert.equal(portal.includes("v.o.k+v.o.j+v.o.e"), false);
  assert.match(portal, /allTotalQ\+=tot/);
  assert.match(portal, /var totalQ=vals\.reduce\(function\(a,v\)\{return a\+dayTotal\(v\.o\);\},0\)/);
});

test("the graph draws and labels the komorebi channel", () => {
  assert.match(portal, /COL=\{k:"#3E7C3F",j:"#E8902E",e:"#4F9DD6",m:"#8C6BB1"\}/);
  assert.match(portal, /seg\(o\.m,COL\.m\)/);
  assert.match(portal, /lg\(COL\.m,"こみち"\)/);
  assert.match(portal, /・こみち'\+\(o\.m\|\|0\)/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
