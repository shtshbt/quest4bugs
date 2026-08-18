/* リセット周回 (tools_design 5 章)。Lv10 クリアから 7 日のロック、リセットボタンの
   出現、確認ポップアップ、周回カウント、2 周目以降の 2 枚交換。
   ロックの境界は「ちょうど 7 日」で開ける。時刻はセーブの lv10ClearAt を書き換えて
   偽装し、実時計には依存させない。
   node tests/test_komorebi_reset_lap.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const DAY = 24 * 60 * 60 * 1000;

/* ---- 周回の勘定 (DOM なし) ---- */

const unit = { console };
unit.window = unit;
vm.createContext(unit);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/trophies.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), unit);
}
const trophies = unit.Q4B_KOMOREBI_TROPHIES;

function stableProfile(cat){
  const profile = { lv: {}, maxLv: {}, trophies: {}, trophyProgress: {}, lv10ClearAt: {},
    lapCount: {}, mintedLaps: {} };
  profile.lv[cat] = 10;
  profile.maxLv[cat] = 10;
  profile.trophyProgress[cat] = { n: 20, recent: new Array(20).fill(1) };
  return profile;
}

test("the lock is exactly seven days from the level ten clear", () => {
  const profile = stableProfile("kom_ratio");
  assert.equal(trophies.resetLockDays, 7);
  assert.ok(trophies.award(profile, "kom_ratio", "2026-08-17"));
  const clearedAt = Date.parse("2026-08-17T09:00:00.000Z");
  profile.lv10ClearAt.kom_ratio = new Date(clearedAt).toISOString();
  assert.equal(trophies.resetReadyAt(profile, "kom_ratio"), clearedAt + 7 * DAY);
  assert.equal(trophies.canReset(profile, "kom_ratio", clearedAt), false, "クリア直後に開いた");
  assert.equal(trophies.canReset(profile, "kom_ratio", clearedAt + 7 * DAY - 1), false, "7 日に 1 ミリ秒足りない");
  assert.equal(trophies.canReset(profile, "kom_ratio", clearedAt + 7 * DAY), true, "ちょうど 7 日で開かない");
  assert.equal(trophies.canReset(profile, "kom_ratio", clearedAt + 30 * DAY), true, "7 日を過ぎても開かない");
});

test("a category with no medal yet can never be reset", () => {
  const profile = stableProfile("kom_ratio");
  /* 鋳造前は起点そのものが無い。ロックの計算にも入らない。 */
  assert.equal(trophies.resetReadyAt(profile, "kom_ratio"), null);
  assert.equal(trophies.canReset(profile, "kom_ratio", Date.now()), false);
  /* 周回だけ進めることもできない。 */
  assert.equal(trophies.beginNextLap(profile, "kom_ratio"), null);
  assert.equal(trophies.lapOf(profile, "kom_ratio"), 1);
});

test("a lap is only counted once, and the next one has to be earned again", () => {
  const profile = stableProfile("kom_ratio");
  assert.equal(trophies.lapOf(profile, "kom_ratio"), 1);
  assert.equal(trophies.mintedLaps(profile, "kom_ratio"), 0);
  const first = trophies.award(profile, "kom_ratio", "2026-08-17");
  assert.equal(first.lap, 1);
  assert.equal(first.medals, 1, "1 周目は 1 枚");
  assert.equal(trophies.award(profile, "kom_ratio", "2026-08-18"), null, "同じ周回で 2 度鋳造された");
  profile.lv10ClearAt.kom_ratio = new Date(Date.now() - 8 * DAY).toISOString();

  assert.equal(trophies.beginNextLap(profile, "kom_ratio"), 2);
  assert.equal(trophies.lapOf(profile, "kom_ratio"), 2);
  assert.equal(trophies.mintedLaps(profile, "kom_ratio"), 1);
  /* 周回に入った直後は安定判定の窓が空。Lv10 へ戻っただけでは鋳造しない。 */
  assert.equal(profile.trophyProgress.kom_ratio.n, 0);
  assert.equal(profile.trophyProgress.kom_ratio.recent.length, 0);
  assert.equal(trophies.qualifies(profile, "kom_ratio"), false);
  assert.equal(trophies.award(profile, "kom_ratio", "2026-08-25"), null);
  /* 周回が終わるまで、もう 1 度リセットすることもできない。 */
  assert.equal(trophies.canReset(profile, "kom_ratio", Date.now()), false, "鋳造前に次のリセットが開いた");

  /* 2 周目を安定クリアすると 2 枚ぶんの鋳造になる。 */
  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
  const second = trophies.award(profile, "kom_ratio", "2026-09-01");
  assert.equal(second.lap, 2);
  assert.equal(second.medals, 2, "2 周目は 2 枚");
  assert.equal(trophies.medalCount(profile, "kom_ratio"), 3, "1 周目 1 枚 + 2 周目 2 枚");
  /* 3 周目以降も 2 枚。 */
  assert.equal(trophies.medalsForLap(3), 2);
});

test("the first acquisition date and the gold insect survive a lap", () => {
  const profile = stableProfile("kom_ratio");
  trophies.award(profile, "kom_ratio", "2026-08-17");
  profile.lv10ClearAt.kom_ratio = new Date(Date.now() - 8 * DAY).toISOString();
  trophies.beginNextLap(profile, "kom_ratio");
  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
  trophies.award(profile, "kom_ratio", "2026-09-01");
  assert.equal(profile.trophies.madagascar_ratio.at, "2026-08-17", "最初に届いた日が書き換わった");
});

test("an old save with a medal but no lap counters is treated as one lap done", () => {
  const legacy = { trophies: { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-10" } } };
  assert.equal(trophies.mintedLaps(legacy, "kom_ratio"), 1);
  assert.equal(trophies.medalCount(legacy, "kom_ratio"), 1);
  /* 読んだだけで保存が起きない (書き戻さない)。 */
  assert.equal(legacy.mintedLaps, undefined);
  const fresh = { trophies: {} };
  assert.equal(trophies.mintedLaps(fresh, "kom_ratio"), 0);
});

test("a broken lap counter is refused instead of repaired", () => {
  [{ lapCount: { kom_ratio: 0 } }, { lapCount: { kom_ratio: 1.5 } },
    { mintedLaps: { kom_ratio: -1 } }, { lapCount: [] }].forEach(broken => {
    assert.throws(() => trophies.validateLaps(broken), /周回データ/, JSON.stringify(broken));
  });
  assert.ok(trophies.validateLaps({ lapCount: { kom_ratio: 2 }, mintedLaps: { kom_ratio: 1 } }));
  assert.ok(trophies.validateLaps({}), "無い状態は正しい (additive の既定)");
});

/* ---- 画面と本線 (fake DOM) ---- */

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const komorebi = context.Q4B_KOMOREBI;
  const trophyMod = context.Q4B_KOMOREBI_TROPHIES;
  const tools = context.Q4B_KOMOREBI_TOOLS;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const alerts = [];
  context.alert = message => alerts.push(String(message));

  const overlays = [];
  const createElement = context.document.createElement;
  context.document.createElement = function(){
    const element = createElement();
    overlays.push(element);
    return element;
  };
  const lastOverlay = () => overlays[overlays.length - 1];
  function backToMap(){
    app.querySelector('[data-action="trophies"]').click();
    app.querySelector('[data-action="back"]').click();
  }

  test("a medal earned before the clear time was recorded still opens a lap", () => {
    /* lv10ClearAt は Phase 1 で入れた。それより前に成立していたメダルには起点が無く、
       そのままではロックが永久に明けずリセット周回へ入れない。授与日で埋める。 */
    const legacy = komorebi.createProfile();
    legacy.lv.kom_ratio = 10;
    legacy.maxLv.kom_ratio = 10;
    legacy.trophies = { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-01" } };
    delete legacy.lv10ClearAt;
    const loaded = komorebi.normalizeProfile(JSON.parse(JSON.stringify(legacy)));
    assert.equal(loaded.changed, true);
    assert.equal(loaded.profile.lv10ClearAt.kom_ratio, "2026-08-01", "ロックの起点が埋まっていない");
    const readyAt = trophyMod.resetReadyAt(loaded.profile, "kom_ratio");
    assert.equal(readyAt, Date.parse("2026-08-01") + 7 * DAY);
    assert.equal(trophyMod.canReset(loaded.profile, "kom_ratio", readyAt), true, "旧メダルの周回が開かない");
    /* 2 度目は何も変わらない (毎回の起動で保存が走り続けない)。 */
    assert.equal(komorebi.normalizeProfile(JSON.parse(JSON.stringify(loaded.profile))).changed, false);
    /* 既に起点があるセーブは書き換えない。 */
    const kept = JSON.parse(JSON.stringify(loaded.profile));
    kept.lv10ClearAt.kom_ratio = "2026-09-09T00:00:00.000Z";
    assert.equal(komorebi.normalizeProfile(kept).profile.lv10ClearAt.kom_ratio, "2026-09-09T00:00:00.000Z");
  });

  const profile = komorebi.profile();
  /* 1 周目のメダルを成立させ、ロックが明けた状態を作る。 */
  profile.lv.kom_ratio = 10;
  profile.maxLv.kom_ratio = 10;
  for(let i = 0; i < 20; i++) trophyMod.noteAnswer(profile, "kom_ratio", 10, true);
  assert.ok(trophyMod.award(profile, "kom_ratio", "2026-08-10"), "1 周目のメダルが成立しない");
  profile.lv10ClearAt.kom_ratio = new Date(Date.now() - 8 * DAY).toISOString();
  /* 1 周目のぶんは捧げ済みにしておく (捧げ待ちが 0 の状態から 2 周目を見る)。 */
  assert.ok(context.Q4B_KOMOREBI_URO.redeem(profile, komorebi.earnedMedals(),
    { cat: "kom_ratio" }, "banana_trap", "2026-08-10"));
  tools.grant(profile, "banana_trap");

  test("with the economy switch off the reset button never appears", () => {
    komorebi.setMedalEconomyOn(false);
    backToMap();
    assert.equal(app.querySelector("[data-reset-cat]"), null, "経済 off でリセットボタンが出た");
    assert.equal(plain().indexOf("Lv1 から もういちど"), -1);
  });

  /* 経済と道具を開ける (以降は公開後の画面として見る)。 */
  komorebi.setMedalEconomyOn(true);
  const savedReleases = tools.list().map(tool => tool.release);
  tools.list().forEach(tool => { if(tool.release === 2) tool.release = 1; });
  backToMap();

  test("the reset button waits for the seven day lock", () => {
    profile.lv10ClearAt.kom_ratio = new Date(Date.now() - 6 * DAY).toISOString();
    backToMap();
    assert.equal(app.querySelector("[data-reset-cat]"), null, "6 日でリセットボタンが出た");
    /* 境界そのものは canReset の単体で見る。画面側は実時計を読むので、7 日ちょうどを
       またがせると端末の時刻補正 1 ミリ秒で結果が変わる。 */
    profile.lv10ClearAt.kom_ratio = new Date(Date.now() - 7 * DAY - 1000).toISOString();
    backToMap();
    const button = app.querySelector("[data-reset-cat]");
    assert.ok(button, "7 日たってもリセットボタンが出ない");
    assert.equal(button.getAttribute("data-reset-cat"), "kom_ratio");
    assert.match(plain(), /割合と比を Lv1 から もういちど/);
    assert.match(plain(), /メダル 2まい/);
    /* まだメダルの出ていないカテゴリには出ない。 */
    assert.equal(app.querySelectorAll("[data-reset-cat]").length, 1);
  });

  test("the confirmation says what is gained and what is kept", () => {
    app.querySelector("[data-reset-cat]").click();
    const text = plainText(lastOverlay().innerHTML);
    assert.match(text, /Lv1 に リセットしますか\?/);
    assert.match(text, /リセットして もういちど Lv10 に なったら、メダルが 2まい!/);
    assert.match(text, /ずかんも つかまえた虫も ほうのうの きろくも そのままだよ/);
    assert.match(text, /やめる/);
  });

  await (async () => {
    /* やめる を押した回では 1 ビットも動かない。 */
    const modal = lastOverlay();
    const beforeLv = profile.lv.kom_ratio, beforeLap = trophyMod.lapOf(profile, "kom_ratio");
    modal.dispatch("click", { className: "kom-modal-close", getAttribute: () => null });
    await settle();
    test("backing out of the confirmation changes nothing", () => {
      assert.equal(profile.lv.kom_ratio, beforeLv);
      assert.equal(trophyMod.lapOf(profile, "kom_ratio"), beforeLap);
    });
  })();

  await (async () => {
    const caughtBefore = JSON.stringify(profile.collection.catches);
    const totalBefore = profile.collection.totalCatches;
    const uroBefore = profile.uroLog.length;
    app.querySelector("[data-reset-cat]").click();
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-action="reset-yes"]'));
    await settle();

    test("a reset rolls back the level only", () => {
      assert.equal(profile.lv.kom_ratio, 1, "Lv1 に戻っていない");
      assert.equal(trophyMod.lapOf(profile, "kom_ratio"), 2, "周回が進んでいない");
      assert.equal(profile.adapt.kom_ratio.n, 0, "昇降の窓が残っている");
      assert.equal(profile.trophyProgress.kom_ratio.n, 0, "安定判定の窓が残っている");
      /* 奪わない側: 到達 Lv、図鑑、捕獲済み、奉納記録、メダルそのもの。 */
      assert.equal(profile.maxLv.kom_ratio, 10, "到達 Lv が下がった");
      assert.equal(JSON.stringify(profile.collection.catches), caughtBefore, "図鑑が変わった");
      assert.equal(profile.collection.totalCatches, totalBefore);
      assert.equal(profile.uroLog.length, uroBefore, "奉納の記録が変わった");
      assert.ok(profile.trophies.madagascar_ratio, "メダルが消えた");
      assert.equal(context.__saved.komorebi.lapCount.kom_ratio, 2, "周回が保存されていない");
    });

    test("the reset button is gone until the next medal is earned", () => {
      assert.equal(app.querySelector("[data-reset-cat]"), null, "リセット直後にまた押せる");
      assert.match(plain(), /Lv 1/);
    });
  })();

  /* ---- 2 周目の鋳造 = 道具を 2 つ選ぶ ---- */

  await (async () => {
    profile.lv.kom_ratio = 10;
    for(let i = 0; i < 19; i++) trophyMod.noteAnswer(profile, "kom_ratio", 10, true);
    const before = overlays.length;
    await komorebi.recordSubmission("kom_ratio",
      { sessionId: "lap2", submissionId: "lap2-1", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5, true, 900, false);
    await settle();

    test("finishing the second lap mints two medals and opens the exchange", () => {
      assert.equal(trophyMod.mintedLaps(profile, "kom_ratio"), 2);
      assert.equal(trophyMod.medalCount(profile, "kom_ratio"), 3);
      assert.equal(komorebi.pendingMedals().length, 2, "2 周目の鋳造は 2 枚");
      assert.ok(overlays.length > before, "交換ポップアップが出ない");
      const text = plainText(lastOverlay().innerHTML);
      assert.match(text, /メダルを かくとく!/);
      assert.match(text, /2まいの うち 1まいめ/, "何枚目かが出ていない");
    });

    const first = lastOverlay();
    first.dispatch("click", first.querySelector('[data-tool="cho_net"]'));
    await settle();

    test("picking the first tool immediately offers the second medal", () => {
      assert.equal(profile.uroLog.length, 2, "1 周目の記録に 2 周目の 1 枚が積まれていない");
      assert.equal(profile.uroLog[1].tool, "cho_net");
      assert.equal(profile.uroLog[1].lap, 2, "2 周目の星が付いていない");
      assert.equal(komorebi.pendingMedals().length, 1, "2 枚目が捧げ待ちに残っていない");
      assert.match(plainText(lastOverlay().innerHTML), /2まいの うち 2まいめ/);
    });

    const second = lastOverlay();
    second.dispatch("click", second.querySelector('[data-tool="light_trap"]'));
    await settle();

    test("two laps mean two tools and two stars in the log", () => {
      assert.equal(profile.uroLog.length, 3);
      assert.equal(profile.uroLog[2].tool, "light_trap");
      assert.equal(profile.uroLog[2].lap, 2);
      assert.equal(profile.tools.length, 3, "2 周目で道具が 2 つ増えていない");
      assert.equal(komorebi.pendingMedals().length, 0, "捧げ待ちが残った");
      /* ロックの起点は 2 周目のクリア時刻に更新される。判定はその時刻からの相対で
         見る (実時計を基準にすると端末の時刻補正で答えが変わる)。 */
      const clearedAt = Date.parse(profile.lv10ClearAt.kom_ratio);
      assert.ok(clearedAt > Date.parse("2026-08-11T00:00:00.000Z"),
        "ロックの起点が 1 周目のままになっている");
      assert.equal(trophyMod.canReset(profile, "kom_ratio", clearedAt + 7 * DAY - 1), false,
        "2 周目のロックが 7 日を待たずに明けた");
      assert.equal(trophyMod.canReset(profile, "kom_ratio", clearedAt + 7 * DAY), true,
        "2 周目のロックが 7 日で明けない");
    });
  })();

  test("the offering log shows the second lap with two stars", () => {
    const uro = context.Q4B_KOMOREBI_URO;
    const html = uro.pageHtml({ text: t => t, glow: uro.glow(profile), pending: [], owned: [],
      equippedToolId: null, durability: 30,
      entries: profile.uroLog.map(entry => ({ cat: entry.cat, lap: entry.lap, date: entry.date,
        name: "オオオナガヤママユのメダル", catName: "割合と比", toolName: "ちょうネット", toolEmoji: "🥅" })) });
    assert.equal((html.match(/★★</g) || []).length, 2, "2 周目の星が 2 つ重なっていない");
  });

  test("no alert was needed anywhere in the reset path", () => {
    assert.deepEqual(alerts, []);
  });

  tools.list().forEach((tool, index) => { tool.release = savedReleases[index]; });
  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
