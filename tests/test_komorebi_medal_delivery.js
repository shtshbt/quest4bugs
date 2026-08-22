/* メダルが「届く」ところだけを見る。判定 (test_komorebi_acceptance.js) と交換の中身
   (test_komorebi_uro.js) が正しくても、鋳造の瞬間に何も出ない・取りこぼしが回収されない、
   は届け方の話で、本人には「Lv10 をクリアしたのに何も起こらない」としか見えない。
   node tests/test_komorebi_medal_delivery.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/* メダル経済が閉じていた頃に成立したメダル。trophies と mintedLaps はあるが、
   交換の入口が無かったので奉納ログ (uroLog) は空のまま積まれている。 */
const LEGACY_SAVE = {
  komorebi: {
    schemaVersion: 1,
    lv: { kom_ratio: 10 }, maxLv: { kom_ratio: 10 },
    trophies: { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-15" } },
    mintedLaps: { kom_ratio: 1 },
    trophyProgress: { kom_ratio: { n: 24, recent: new Array(20).fill(1) } },
    uroLog: []
  }
};

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10",
    saved: JSON.parse(JSON.stringify(LEGACY_SAVE)) });
  /* モーダルは document.body へ足されるので、生成された要素を横取りして掴む。
     boot は非同期なので、この差し込みは settle より前でなければ最初の地図を取り逃す。 */
  const overlays = [];
  const createElement = context.document.createElement;
  context.document.createElement = function(){
    const element = createElement();
    overlays.push(element);
    return element;
  };
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  const profile = komorebi.profile();
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const medalModals = () => overlays.filter(element => element.id === "komMedalModal");

  test("a medal minted while the economy was shut is offered as soon as the map opens", () => {
    assert.equal(komorebi.toolsReleased(), true, "the tools gate is shut, so this run proves nothing");
    assert.equal(komorebi.pendingMedals().length, 1, "the legacy medal is not waiting to be offered");
    assert.equal(medalModals().length, 1, "the waiting medal was never offered: " + plainText(app.innerHTML).slice(-160));
    assert.match(plainText(medalModals()[0].innerHTML), /オオオナガヤママユのメダルを かくとく!/);
  });

  /* 地図はセッションの戻り先でもある。毎回出すと「あとにする」を選んでも小道へ
     入るたびに塞がれるので、回収は 1 回の読み込みにつき 1 度きり。 */
  app.querySelector('[data-action="trophies"]').click();
  app.querySelector('[data-action="back"]').click();

  test("the sweep does not fire again every time the map comes back", () => {
    assert.equal(medalModals().length, 1, "the exchange popped again on the way back to the map");
  });

  /* --- Lv10 の出題画面に出る条件表示 --------------------------------------- */

  /* fake DOM の子要素は属性しか持たないので、中身は描かれた HTML から取る。 */
  const headText = () => {
    const found = /<span class="ratio-medal[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(app.innerHTML);
    return found ? plainText(found[1]).replace(/\s+/g, " ").trim() : null;
  };
  const need = Math.ceil(trophies.stability.windowSize * trophies.stability.minAccuracy);
  const answer = (correct, times) => {
    for(let i = 0; i < times; i++) trophies.noteAnswer(profile, "kom_ratio", 10, correct);
  };

  await komorebi.sessionStarters.kom_ratio(volume, () => 0.5);

  test("a lap that is already minted says so instead of staying silent", () => {
    /* 同じ条件をもう一度満たしても再授与はしない。黙っていると「クリアしたのに
       無反応」に見えるので、取得済みであることをその場で言う。 */
    assert.equal(headText(), "🏅 かくとくずみ");
  });

  delete profile.trophies.madagascar_ratio;
  profile.mintedLaps = {};
  profile.lapCount = {};
  profile.trophyProgress.kom_ratio = { n: 0, recent: [] };
  await komorebi.sessionStarters.kom_ratio(volume, () => 0.5);

  test("an untouched window shows the whole distance, not a blank", () => {
    assert.equal(headText(), "🏅 あと" + trophies.stability.windowSize + "もん 0／" + trophies.stability.windowSize);
  });

  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, i < 14);
  await komorebi.sessionStarters.kom_ratio(volume, () => 0.5);

  test("a full window counts the hits and the distance left", () => {
    /* 直近 6 問を外した直後なので、その 6 問が窓から出るまで成立しない。
       17 - 14 = 3 ではない: 誤答が窓に残っている間は、正解を足しても同じ数の
       正答が押し出されるだけで正答数が増えない。 */
    assert.equal(headText(), "🏅 あと17もん 14／20");
    assert.ok(need - 14 < 17, "the naive shortfall would have understated the distance");
  });

  /* 窓は 20 問で回る。この窓 ([正答 14, 誤答 6] の順) では、正解を足しても
     出ていくのが正答なので直近 20 問の正答数は 14 のまま動かない。
     正答数の不足ぶん (17 - 14 = 3) を数えていた頃は、ここで何問解いても
     「あと 3 もん」で固まっていた (「メーターが動かない」の正体)。
     押し出しまで数えれば、正解 1 問につき必ず 1 減る。 */
  const countdown = [];
  for(let i = 0; i < 4; i++){
    countdown.push(headText());
    answer(true, 1);
    await komorebi.sessionStarters.kom_ratio(volume, () => 0.5);
  }

  test("every correct answer takes exactly one off the countdown", () => {
    assert.deepEqual(countdown, ["🏅 あと17もん 14／20", "🏅 あと16もん 14／20",
      "🏅 あと15もん 14／20", "🏅 あと14もん 14／20"],
      "the countdown froze while the rolling hit count stood still");
    /* 正答数が動かないのは正しい: 出ていくのも正答なので、直近 20 問のできばえは
       変わっていない。動かしてよいのは「あと」だけ。 */
    const entry = profile.trophyProgress.kom_ratio;
    assert.equal(entry.recent.length, 20, "the window grew past its size");
    assert.equal(entry.recent.reduce((sum, value) => sum + value, 0), 14);
  });

  profile.lv.kom_ratio = 9;
  await komorebi.sessionStarters.kom_ratio(volume, () => 0.5);

  test("below level ten the condition is not shown, because it does not move", () => {
    assert.equal(headText(), null);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
