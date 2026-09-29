"use strict";

/* れんぞく ともしび (docs/tomoshibi_streak_design.md) の段 1: 数える・段を導く・
   精算する・端末間で統合する。表示と演出はまだ無い。

   1. shared/tomoshibi.js の computeState (段・再開・ボーナス)
   2. shared/storage.js の TOMOSHIBI_MODE ごとの振る舞い ("off" は 1 バイトも書かない)
   3. mergeStore が tomoshibi namespace を日付と端末の和集合で統合すること
   4. 小道の数えた正解が tomoshibiRecord に届くこと

   Run: node tests/test_tomoshibi.js
*/

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const STORE_KEY = "q4b_store_v1";
const SEP = "\u0000";
let passed = 0;

async function test(name, fn) {
  await fn();
  passed++;
  console.log("PASS", name);
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

function loadPure() {
  const context = { console, Date, Math, Object };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "shared/tomoshibi.js"), "utf8"), context);
  return context.Q4BTomoshibi;
}

/* days を {日付: 正解数} から作る (端末は 1 台)。 */
function daysOf(map) {
  const out = { days: {}, awarded: {} };
  for (const [date, n] of Object.entries(map)) out.days[date] = { dev: { a: n } };
  return out;
}
function run(T, start, counts) {
  const map = {};
  counts.forEach((n, i) => { if (n > 0) map[T.addDays(start, i)] = n; });
  return daysOf(map);
}

/* storage.js を実物のまま読み、economy_flag と tomoshibi.js を同じ文脈に載せる。
   options.backing: 引き継ぐ localStorage の中身 (再起動や別端末を表す)
   options.device:  端末 id
   options.mode:    TOMOSHIBI_MODE
   options.remote:  cloud の save.json として返す snapshot (pullAll の統合を見る) */
function storageContext(options) {
  options = options || {};
  const backing = new Map(options.backing || []);
  backing.set("q4b_device_id_v1", options.device || "devA");
  if (options.remote) {
    backing.set("quest4bugs_fieldnote_config_v1", JSON.stringify({
      owner: "o", repo: "r", branch: "main", basePath: "q4b", token: "t", enabled: true
    }));
  }
  const localStorage = {
    get length() { return backing.size; },
    key(index) { return Array.from(backing.keys())[index] || null; },
    getItem(key) { return backing.has(key) ? backing.get(key) : null; },
    setItem(key, value) { backing.set(key, String(value)); },
    removeItem(key) { backing.delete(key); }
  };
  const events = [];
  function response(status, body) {
    return { status, ok: status >= 200 && status < 300, headers: { get() { return null; } },
      clone() { return this; }, async json() { return body || {}; } };
  }
  async function fetch(_url, opts) {
    const method = (opts && opts.method) || "GET";
    if (method === "GET") {
      if (!options.remote) return response(404);
      const content = Buffer.from(JSON.stringify(options.remote), "utf8").toString("base64");
      return response(200, { sha: "s1", content, encoding: "base64" });
    }
    return response(200, { content: { sha: "s2" } });
  }
  const context = {
    console, localStorage, sessionStorage: { getItem() { return null; }, setItem() {} },
    setTimeout() { return 0; }, clearTimeout() {}, structuredClone, Date, Math, Promise,
    TextEncoder, TextDecoder, fetch,
    btoa(v) { return Buffer.from(v, "binary").toString("base64"); },
    atob(v) { return Buffer.from(v, "base64").toString("binary"); },
    Q4B_KOMOREBI_TEST_HOOKS: true
  };
  context.window = context;
  context.navigator = {};
  context.addEventListener = function() {};
  context.dispatchEvent = function(e) { events.push(e); };
  context.CustomEvent = function(type, init) { this.type = type; this.detail = init && init.detail; };
  context.__backing = backing;
  context.__events = events;
  vm.createContext(context);
  const files = ["shared/storage.js", "shared/economy_flag.js"];
  if (!options.withoutTomoshibi) files.push("shared/tomoshibi.js");
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  if (options.mode) context.Q4B_ECONOMY.setTomoshibiMode(options.mode);
  return context;
}

function storeDoc(ctx) { return JSON.parse(ctx.__backing.get(STORE_KEY) || "{}"); }
function tomoKey(pid) { return "tomoshibi" + SEP + pid; }

function solve(save, pid, n) {
  let last = null;
  for (let i = 0; i < n; i++) last = save.recordCorrect(pid, "keisan", 1);
  return last;
}

(async () => {
  const T = loadPure();

  /* ---- 1. computeState ---- */

  await test("the tier table doubles the daily bonus and tops out at niji", () => {
    const tiers = plain(T.tiers());
    assert.deepEqual(tiers.map(t => t.id), ["aka", "ao", "gin", "kin", "niji"]);
    assert.deepEqual(tiers.map(t => t.bonus), [5, 10, 20, 40, 40]);
    assert.equal(tiers[4].topBonus, 80);
    assert.deepEqual(tiers.map(t => t.from), [1, 6, 11, 21, 31]);
    assert.equal(T.DAY_MIN, 3);
    assert.equal(T.TOP_MIN, 10);
  });

  await test("a day counts only with three correct answers", () => {
    const s2 = T.computeState(daysOf({ "2026-09-01": 2 }), "2026-09-01");
    assert.equal(s2.qualifiedToday, false);
    assert.deepEqual(plain(s2.bonusToday), { base: 0, top: 0 });
    const s3 = T.computeState(daysOf({ "2026-09-01": 3 }), "2026-09-01");
    assert.equal(s3.qualifiedToday, true);
    assert.equal(s3.streakDays, 1);
    assert.equal(s3.tier.id, "aka");
    assert.deepEqual(plain(s3.bonusToday), { base: 5, top: 0 });
  });

  await test("twelve straight days sit in gin with nine days to kin", () => {
    const s = T.computeState(run(T, "2026-09-01", Array(12).fill(5)), "2026-09-12");
    assert.equal(s.streakDays, 12);
    assert.equal(s.tier.id, "gin");
    assert.deepEqual(plain(s.bonusToday), { base: 20, top: 0 });
    assert.deepEqual(plain(s.next), { tierIndex: 3, daysLeft: 9 });
    assert.equal(s.tierUpToday, false);
  });

  await test("today still open is not a break", () => {
    const s = T.computeState(run(T, "2026-09-01", Array(12).fill(5)), "2026-09-13");
    assert.equal(s.qualifiedToday, false);
    assert.equal(s.streakDays, 12);
    assert.equal(s.tier.id, "gin");
    assert.equal(s.dropPending, false);
    assert.deepEqual(plain(s.next), { tierIndex: 3, daysLeft: 9 });
  });

  await test("the first day of a tier is a tier-up", () => {
    const s = T.computeState(run(T, "2026-09-01", Array(6).fill(3)), "2026-09-06");
    assert.equal(s.tier.id, "ao");
    assert.equal(s.tierUpToday, true);
    assert.deepEqual(plain(s.bonusToday), { base: 10, top: 0 });
  });

  await test("niji pays the top bonus only on a ten-answer day", () => {
    const counts = Array(31).fill(12);
    const full = T.computeState(run(T, "2026-08-01", counts), "2026-08-31");
    assert.equal(full.tier.id, "niji");
    assert.deepEqual(plain(full.bonusToday), { base: 40, top: 40 });
    assert.equal(full.toTop, 0);
    counts[30] = 4;
    const light = T.computeState(run(T, "2026-08-01", counts), "2026-08-31");
    assert.deepEqual(plain(light.bonusToday), { base: 40, top: 0 });
    assert.equal(light.toTop, 6);
  });

  await test("a missed day drops two tiers and restarts at that tier's first day", () => {
    const data = run(T, "2026-08-01", Array(31).fill(5));
    const waiting = T.computeState(data, "2026-09-02");
    assert.equal(waiting.dropPending, true);
    assert.equal(waiting.tier.id, "gin");
    assert.equal(waiting.restartDay, 11);
    assert.equal(waiting.streakDays, 0);
    assert.deepEqual(plain(waiting.lastDrop), { date: "2026-09-01", fromIndex: 4, toIndex: 2 });
    assert.deepEqual(plain(waiting.next), { tierIndex: 3, daysLeft: 11 });
    data.days["2026-09-02"] = { dev: { a: 3 } };
    const back = T.computeState(data, "2026-09-02");
    assert.equal(back.dropPending, false);
    assert.equal(back.streakDays, 11);
    assert.equal(back.tier.id, "gin");
    assert.equal(back.restartedToday, true);
    assert.equal(back.tierUpToday, false, "a restart is not a tier-up");
    assert.deepEqual(plain(back.bonusToday), { base: 20, top: 0 });
  });

  await test("each further missed day drops two more tiers, never below aka", () => {
    const data = run(T, "2026-08-01", Array(31).fill(5));
    const two = T.computeState(data, "2026-09-03");
    assert.equal(two.tier.id, "aka");
    assert.equal(two.restartDay, 1);
    const many = T.computeState(data, "2026-09-20");
    assert.equal(many.tier.id, "aka");
    assert.equal(many.restartDay, 1);
  });

  await test("a break while still in aka is a plain restart with no drop notice", () => {
    const s = T.computeState(run(T, "2026-09-01", [5, 5, 5, 0, 0]), "2026-09-05");
    assert.equal(s.streakDays, 0);
    assert.equal(s.tier.id, "aka");
    assert.equal(s.dropPending, false);
    assert.equal(s.lastDrop, null);
    const back = T.computeState(run(T, "2026-09-01", [5, 5, 5, 0, 4]), "2026-09-05");
    assert.equal(back.streakDays, 1);
    assert.equal(back.restartedToday, false);
  });

  await test("an empty history starts at aka with six days to ao", () => {
    const s = T.computeState({ days: {} }, "2026-09-03");
    assert.equal(s.streakDays, 0);
    assert.equal(s.tier.id, "aka");
    assert.equal(s.dropPending, false);
    assert.deepEqual(plain(s.next), { tierIndex: 1, daysLeft: 6 });
  });

  await test("day arithmetic crosses month, year and leap day", () => {
    assert.equal(T.addDays("2026-01-31", 1), "2026-02-01");
    assert.equal(T.addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(T.addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(T.addDays("2026-03-08", 1), "2026-03-09");
    assert.equal(T.addDays("2026-03-01", -1), "2026-02-28");
  });

  /* ---- 2. storage.js と TOMOSHIBI_MODE ---- */

  await test("mode off writes nothing new and keeps the existing daily log", () => {
    const ctx = storageContext();
    assert.equal(ctx.Q4B_ECONOMY.tomoshibiMode(), "off");
    const save = ctx.QuestSave;
    const r = solve(save, "p1", 5);
    const keys = Object.keys(storeDoc(ctx).kv || {});
    assert.ok(keys.some(k => k.indexOf("goshin") === 0), "the existing daily log still records");
    assert.equal(keys.some(k => k.indexOf("tomoshibi") === 0), false, "mode off must not create the tomoshibi kv");
    assert.equal(save.amberOf("p1"), 0);
    assert.equal(r.ok, true);
    assert.deepEqual(plain(r.tomoshibi), { ok: false, mode: "off" });
  });

  await test("the production switch ships as off", () => {
    const src = fs.readFileSync(path.join(root, "shared/economy_flag.js"), "utf8");
    assert.match(src, /var TOMOSHIBI_MODE="off";/);
  });

  await test("mode count records per device but pays nothing", () => {
    const ctx = storageContext({ mode: "count", device: "devA" });
    const save = ctx.QuestSave;
    solve(save, "p1", 4);
    const data = save.tomoshibiOf("p1");
    assert.deepEqual(plain(data.days[save.todayKey()]), { dev: { devA: 4 } });
    assert.deepEqual(plain(data.awarded), {});
    assert.equal(save.amberOf("p1"), 0);
    assert.equal(ctx.__events.filter(e => e.type === "q4b-tomoshibi").length, 0);
  });

  await test("mode on pays the day's bonus once, at the third correct answer", () => {
    const ctx = storageContext({ mode: "on" });
    const save = ctx.QuestSave;
    solve(save, "p1", 2);
    assert.equal(save.amberOf("p1"), 0);
    const third = save.recordCorrect("p1", "kanji", 1);
    assert.equal(third.tomoshibi.total, 3);
    assert.equal(third.tomoshibi.settled.basePaid, 5);
    assert.equal(save.amberOf("p1"), 5);
    solve(save, "p1", 20);
    assert.equal(save.amberOf("p1"), 5, "later answers the same day pay nothing more");
    assert.deepEqual(plain(save.tomoshibiOf("p1").awarded[save.todayKey()]), { base: 5, top: 0 });
    assert.equal(ctx.__events.filter(e => e.type === "q4b-tomoshibi").length, 1);
  });

  await test("mode on at niji pays base at three and the top-up at ten", () => {
    const first = storageContext({ mode: "count", device: "devA" });
    solve(first.QuestSave, "p1", 1);
    const today = first.QuestSave.todayKey();
    /* 別端末 devB が 30 日続けた履歴を入れ、今日が 31 日目 (にじ) になるようにする。 */
    const doc = storeDoc(first);
    const data = doc.kv[tomoKey("p1")].data;
    data.days = {};
    for (let i = 30; i >= 1; i--) data.days[T.addDays(today, -i)] = { dev: { devB: 5 } };
    first.__backing.set(STORE_KEY, JSON.stringify(doc));
    const ctx = storageContext({ backing: first.__backing, mode: "on", device: "devA" });
    const save = ctx.QuestSave;
    solve(save, "p1", 3);
    assert.equal(save.amberOf("p1"), 40, "niji base at the third answer");
    solve(save, "p1", 6);
    assert.equal(save.amberOf("p1"), 40, "no top-up before the tenth");
    solve(save, "p1", 1);
    assert.equal(save.amberOf("p1"), 80, "the tenth answer adds the top-up");
    solve(save, "p1", 5);
    assert.equal(save.amberOf("p1"), 80);
  });

  await test("a page without tomoshibi.js still counts in mode on and pays later", () => {
    const ctx = storageContext({ mode: "on", withoutTomoshibi: true });
    const save = ctx.QuestSave;
    const r = solve(save, "p1", 3);
    assert.equal(r.tomoshibi.total, 3);
    assert.equal(r.tomoshibi.settled, null);
    assert.equal(save.amberOf("p1"), 0);
    const later = storageContext({ backing: ctx.__backing, mode: "on" });
    solve(later.QuestSave, "p1", 1);
    assert.equal(later.QuestSave.amberOf("p1"), 5, "the next counted answer on a full page settles today");
  });

  /* ---- 3. 端末間の統合 ---- */

  await test("pull merges tomoshibi by date and device instead of last-write-wins", async () => {
    const local = storageContext({ mode: "count", device: "devA" });
    solve(local.QuestSave, "p1", 4);
    const today = local.QuestSave.todayKey();
    const doc = storeDoc(local);
    /* 他端末 devB の snapshot: 今日 2 問、過去の 1 日、その日の支払い記録。ローカル
       より新しい updated を持つので、丸ごと LWW なら devA の今日の 4 問が消える。 */
    const remote = {
      schema: 1, kind: "snapshot", v: 2, profiles: doc.profiles || [], current: doc.current || null,
      tombstones: {},
      kv: { [tomoKey("p1")]: { v: 1, updated: Date.now() + 60000, data: {
        v: 1,
        days: { [today]: { dev: { devB: 2, devA: 1 } }, "2026-01-05": { dev: { devB: 7 } } },
        awarded: { "2026-01-05": { base: 5, top: 0 } }
      } } }
    };
    const ctx = storageContext({ backing: local.__backing, remote, mode: "count", device: "devA" });
    await ctx.QuestSave.pullAll();
    const merged = ctx.QuestSave.tomoshibiOf("p1");
    assert.deepEqual(plain(merged.days[today]), { dev: { devA: 4, devB: 2 } },
      "each device keeps its larger count and the other device's count is added");
    assert.deepEqual(plain(merged.days["2026-01-05"]), { dev: { devB: 7 } });
    assert.deepEqual(plain(merged.awarded["2026-01-05"]), { base: 5, top: 0 });
  });

  await test("a stale device cannot erase days it never saw", async () => {
    const local = storageContext({ mode: "count", device: "devA" });
    solve(local.QuestSave, "p1", 3);
    const doc = storeDoc(local);
    doc.kv[tomoKey("p1")].data.days["2026-02-01"] = { dev: { devA: 9 } };
    local.__backing.set(STORE_KEY, JSON.stringify(doc));
    const remote = { schema: 1, kind: "snapshot", v: 2, profiles: doc.profiles || [], current: doc.current || null,
      tombstones: {}, kv: { [tomoKey("p1")]: { v: 1, updated: Date.now() + 60000, data: { v: 1, days: {}, awarded: {} } } } };
    const ctx = storageContext({ backing: local.__backing, remote, mode: "count", device: "devA" });
    await ctx.QuestSave.pullAll();
    assert.equal(ctx.QuestSave.tomoshibiOf("p1").days["2026-02-01"].dev.devA, 9);
  });

  await test("broken dates and prototype-named device ids do not poison the merge", async () => {
    const local = storageContext({ mode: "count", device: "devA" });
    solve(local.QuestSave, "p1", 3);
    const today = local.QuestSave.todayKey();
    const doc = storeDoc(local);
    const remoteData = JSON.parse(`{"v":1,"days":{
      "${today}":{"dev":{"constructor":4,"toString":2,"__proto__":9}},
      "0001-01-01":{"dev":{"devB":5}},
      "2026-02-30":{"dev":{"devB":5}}},
      "awarded":{"0001-01-01":{"base":5,"top":0}}}`);
    const remote = { schema: 1, kind: "snapshot", v: 2, profiles: doc.profiles || [], current: doc.current || null,
      tombstones: {}, kv: { [tomoKey("p1")]: { v: 1, updated: Date.now() + 60000, data: remoteData } } };
    const ctx = storageContext({ backing: local.__backing, remote, mode: "count", device: "devA" });
    await ctx.QuestSave.pullAll();
    const merged = plain(ctx.QuestSave.tomoshibiOf("p1"));
    assert.deepEqual(merged.days[today].dev, { devA: 3, constructor: 4, toString: 2 });
    assert.equal(merged.days["0001-01-01"], undefined);
    assert.equal(merged.days["2026-02-30"], undefined);
    assert.deepEqual(merged.awarded, {});
  });

  await test("computeState ignores impossible dates and looks back at most 400 days", () => {
    const data = daysOf({ "0001-01-01": 5, "2026-02-30": 5, "2026-09-01": 3 });
    const s = T.computeState(data, "2026-09-01");
    assert.equal(s.streakDays, 1);
    const long = run(T, "2025-01-01", Array(700).fill(4));
    const end = T.addDays("2025-01-01", 699);
    const state = T.computeState(long, end);
    assert.equal(state.tier.id, "niji");
    assert.ok(state.streakDays <= 401, "the walk starts at most 400 days back");
  });

  await test("other namespaces keep last-write-wins", async () => {
    const local = storageContext({ device: "devA" });
    local.QuestSave.amberAdd("p1", 7);
    const doc = storeDoc(local);
    const walletKey = Object.keys(doc.kv).find(k => k.indexOf("wallet") === 0);
    const remote = { schema: 1, kind: "snapshot", v: 2, profiles: doc.profiles || [], current: doc.current || null,
      tombstones: {}, kv: { [walletKey]: Object.assign({}, doc.kv[walletKey],
        { updated: Date.now() + 60000, revision: (doc.kv[walletKey].revision || 0) + 1, data: { amber: 3 } }) } };
    const ctx = storageContext({ backing: local.__backing, remote, device: "devA" });
    await ctx.QuestSave.pullAll();
    assert.equal(ctx.QuestSave.amberOf("p1"), 3);
  });

  /* ---- 5. 表示 (段 2) ---- */

  function uiContext(mode) {
    const ctx = storageContext({ mode });
    for (const file of ["shared/reward.js", "shared/tomoshibi_ui.js"]) {
      vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx);
    }
    ctx.QuestSave.currentProfile = () => "p1";
    return ctx;
  }

  await test("mode off keeps the old fire chip and shows no badge", () => {
    const ctx = uiContext(undefined);
    assert.equal(ctx.Q4BTomoshibiUI.badgeHTML("p1"), "");
    const html = ctx.Q4BReward.statusHTML({ caught: 1, pool: 2, amber: 3, streak: 4, total: 5 });
    assert.match(html, /🔥 4日/);
    assert.doesNotMatch(html, /q4b-tomo-badge/);
  });

  await test("mode on replaces the fire chip with the tomoshibi badge", () => {
    const ctx = uiContext("on");
    solve(ctx.QuestSave, "p1", 1);
    const html = ctx.Q4BReward.statusHTML({ caught: 1, pool: 2, amber: 3, streak: 4, total: 5 });
    assert.doesNotMatch(html, /🔥 4日/);
    assert.match(html, /q4b-tomo-badge q4b-tomo-aka/);
    assert.match(html, /あかの ともしび/);
    assert.match(html, /あと 2 もんで きょうの ボーナス \+5/);
  });

  await test("the view model words the counter for each situation", () => {
    const ctx = uiContext("on");
    const UI = ctx.Q4BTomoshibiUI;
    const T2 = ctx.Q4BTomoshibi;
    const gin = plain(UI.viewModel(T2.computeState(run(T, "2026-09-01", Array(12).fill(5)), "2026-09-12")));
    assert.equal(gin.name, "ぎんの ともしび");
    assert.equal(gin.days, "12 にち れんぞく");
    assert.equal(gin.today, "きょうの ボーナス +20 こはく ✓");
    assert.equal(gin.next, "あと 9 にちで きんの ともしび (まいにち +40)");
    assert.deepEqual(gin.ticks, { filled: 2, total: 10 });
    const eve = plain(UI.viewModel(T2.computeState(run(T, "2026-09-01", Array(20).fill(5)), "2026-09-20")));
    assert.equal(eve.next, "あした 3 もんで きんの ともしび！");
    const drop = plain(UI.viewModel(T2.computeState(run(T, "2026-08-01", Array(31).fill(5)), "2026-09-02")));
    assert.equal(drop.name, "ぎんの ともしび");
    assert.equal(drop.days, "11 にちめ から さいかい");
    assert.equal(drop.today, "あと 3 もんで きょうの ボーナス +20");
    assert.equal(drop.ticks, null);
    const niji = plain(UI.viewModel(T2.computeState(run(T, "2026-08-01", [...Array(30).fill(5), 4]), "2026-08-31")));
    assert.equal(niji.today, "きょうの ボーナス +40 こはく ✓　あと 6 もんで +80");
    assert.equal(niji.next, "いちばん つよい ともしび！ 10 もんの 日は +80");
  });

  await test("seen marks merge as a union and are never written in mode off", async () => {
    const off = storageContext();
    assert.equal(off.QuestSave.tomoshibiMarkSeen("p1", "2026-09-01", "drop"), false);
    assert.equal(Object.keys(storeDoc(off).kv || {}).some(k => k.indexOf("tomoshibi") === 0), false);
    const local = storageContext({ mode: "on", device: "devA" });
    assert.equal(local.QuestSave.tomoshibiMarkSeen("p1", "2026-09-01", "drop"), true);
    assert.equal(local.QuestSave.tomoshibiMarkSeen("p1", "2026-09-01", "drop"), false);
    assert.equal(local.QuestSave.tomoshibiMarkSeen("p1", "2026-09-01", "bogus"), false);
    const doc = storeDoc(local);
    const remote = { schema: 1, kind: "snapshot", v: 2, profiles: doc.profiles || [], current: doc.current || null,
      tombstones: {}, kv: { [tomoKey("p1")]: { v: 1, updated: Date.now() + 60000,
        data: { v: 1, days: {}, awarded: {}, seen: { "2026-09-05": { drop: 1 } } } } } };
    const ctx = storageContext({ backing: local.__backing, remote, mode: "on", device: "devA" });
    await ctx.QuestSave.pullAll();
    assert.deepEqual(plain(ctx.QuestSave.tomoshibiOf("p1").seen), { "2026-09-01": { drop: 1 }, "2026-09-05": { drop: 1 } });
  });

  /* ---- 6. 🔥 の日数の統一 (段 3) ---- */

  await test("streakDays returns each game's own value until the switch is on", () => {
    const off = uiContext(undefined);
    assert.equal(off.Q4BTomoshibiUI.streakDays("p1", 7), 7);
    const on = uiContext("on");
    solve(on.QuestSave, "p1", 3);
    assert.equal(on.Q4BTomoshibiUI.streakDays("p1", 7), 1, "on: the shared tomoshibi streak replaces the game's own");
  });

  await test("every fire display and the keisan rarity boost read the shared streak", () => {
    const read = file => fs.readFileSync(path.join(root, file), "utf8");
    const keisan = read("keisan/app.js");
    assert.match(keisan, /function streakN\(p\)\{ return \(window\.Q4BTomoshibiUI&&Q4BTomoshibiUI\.streakDays\)/);
    assert.match(keisan, /var s=Math\.min\(streakN\(p\),7\);/, "gachaPull uses the shared streak");
    assert.match(keisan, /Math\.min\(streakN\(p\), 14\)/, "the mission capture boost uses the shared streak");
    assert.doesNotMatch(keisan.replace(/p\.streak\.n\+\+|p\.streak\.n=1|streakDays\(p\.id,p\.streak\.n\):p\.streak\.n|streak:p\.streak\.n|\(p\.streak\.n\) そのもの/g, ""),
      /p\.streak\.n/, "no other keisan display reads the mission streak directly");
    const eitango = read("eitango/index.html");
    assert.doesNotMatch(eitango.replace(/streakDays\(ePid\(\),P\.streak\.n\):P\.streak\.n|従来の P\.streak\.n|streak:P\.streak\.n/g, ""),
      /\$\{P\.streak\.n\}/, "eitango displays go through eStreak()");
    assert.match(read("kanji/index.html"), /Q4BTomoshibiUI\.streakDays\(CUR\.id,n\)/);
    assert.match(read("index.html"), /streak=Q4BTomoshibiUI\.streakDays\(pid,streak\)/);
  });

  /* ---- 7. 公開前の履歴の取り込み ---- */

  /* goshin の log と komorebi の daily を持つ保存を作る (過去 n 日、毎日 per 問)。 */
  function seededBacking(days, perDay, komorebiDays) {
    const base = storageContext();
    const today = base.QuestSave.todayKey();
    const doc = storeDoc(base);
    doc.kv = doc.kv || {};
    const log = {};
    for (let i = days; i >= 1; i--) log[T.addDays(today, -i)] = { correct: { keisan: perDay, kanji: 0, eitango: 0 } };
    log[today] = { correct: { keisan: 50, kanji: 0, eitango: 0 } };
    doc.kv["goshin" + SEP + "p1"] = { v: 1, updated: 1, data: { v: 1, log } };
    const daily = {};
    for (const [offset, ok] of komorebiDays || []) daily[T.addDays(today, -offset)] = { n: ok, ok };
    doc.kv["komorebi" + SEP + "p1"] = { v: 1, updated: 1, revision: 1, data: { daily } };
    base.__backing.set(STORE_KEY, JSON.stringify(doc));
    return { backing: base.__backing, today };
  }

  await test("the first count seeds past days from goshin and komorebi, but not today", () => {
    const { backing, today } = seededBacking(12, 5, [[13, 4]]);
    const ctx = storageContext({ backing, mode: "count" });
    ctx.QuestSave.recordCorrect("p1", "keisan", 1);
    const data = plain(ctx.QuestSave.tomoshibiOf("p1"));
    assert.equal(data.seeded, 1);
    assert.equal(data.seededAt, today, "the seeding date gates drop notices");
    assert.equal(data.days[T.addDays(today, -1)].dev.legacy, 5);
    assert.equal(data.days[T.addDays(today, -13)].dev.legacy, 4, "komorebi-only days count too");
    assert.equal(data.days[today].dev.legacy, undefined, "today is counted live, not seeded");
    assert.deepEqual(data.days[today].dev, { devA: 1 });
    const state = ctx.Q4BTomoshibi.computeState(data, today);
    assert.equal(state.streakDays, 13, "the running streak carries over");
    assert.equal(state.tier.id, "gin");
  });

  await test("seeding happens once and never in mode off", () => {
    const { backing } = seededBacking(3, 5);
    const off = storageContext({ backing });
    assert.equal(off.QuestSave.tomoshibiSeed("p1"), false);
    assert.equal(Object.keys(storeDoc(off).kv).some(k => k.indexOf("tomoshibi") === 0), false);
    const on = storageContext({ backing, mode: "on" });
    assert.equal(on.QuestSave.tomoshibiSeed("p1"), true);
    assert.equal(on.QuestSave.tomoshibiSeed("p1"), false);
  });

  await test("a day under three answers in the old log does not count", () => {
    const { backing, today } = seededBacking(5, 2);
    const ctx = storageContext({ backing, mode: "count" });
    ctx.QuestSave.tomoshibiSeed("p1");
    const state = ctx.Q4BTomoshibi.computeState(ctx.QuestSave.tomoshibiOf("p1"), today);
    assert.equal(state.streakDays, 0);
    assert.equal(state.dropPending, false, "days that never qualified are not a break");
  });

  await test("the seeded mark merges as a union", async () => {
    const local = storageContext({ mode: "count", device: "devA" });
    solve(local.QuestSave, "p1", 1);
    const doc = storeDoc(local);
    doc.kv[tomoKey("p1")].data.seeded = 0;
    local.__backing.set(STORE_KEY, JSON.stringify(doc));
    const remote = { schema: 1, kind: "snapshot", v: 2, profiles: doc.profiles || [], current: doc.current || null,
      tombstones: {}, kv: { [tomoKey("p1")]: { v: 1, updated: Date.now() + 60000, data: { v: 1, days: {}, awarded: {}, seeded: 1 } } } };
    const ctx = storageContext({ backing: local.__backing, remote, mode: "count", device: "devA" });
    await ctx.QuestSave.pullAll();
    assert.equal(ctx.QuestSave.tomoshibiOf("p1").seeded, 1);
  });

  /* ---- 4. 小道の配線 ---- */

  await test("komorebi forwards each counted correct answer to tomoshibiRecord", async () => {
    const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
    await new Promise(resolve => setTimeout(resolve, 20));
    const calls = [];
    context.QuestSave.tomoshibiRecord = (pid, n) => { calls.push([pid, n]); return { ok: false, mode: "off" }; };
    const komorebi = context.Q4B_KOMOREBI;
    const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
    const answer = (id, extra) => Object.assign({ sessionId: "tomo", submissionId: id, format: "normal",
      kind: "num", correct: true, final: true }, extra || {});
    await komorebi.recordAnswer("kom_ratio", answer("t-1"), volume, () => 0.5);
    assert.deepEqual(calls, [["p1", 1]]);
    await komorebi.recordAnswer("kom_ratio", answer("t-1"), volume, () => 0.5);
    assert.equal(calls.length, 1, "a duplicate submission is not counted again");
    await komorebi.recordAnswer("kom_ratio", answer("t-2", { hintShown: true }), volume, () => 0.5);
    assert.equal(calls.length, 1, "an answer after a hint is not counted");
    await komorebi.recordAnswer("kom_ratio", answer("t-3", { correct: false }), volume, () => 0.5);
    assert.equal(calls.length, 1, "a wrong answer is not counted");
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
