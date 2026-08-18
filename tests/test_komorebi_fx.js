/* メダル経済の小演出 (tools_design 9 章)。うろの輝き (奉納数連動)、奉納の直後に
   出る うろ、初回授与の合図、破損のゆれ。演出はどれも表示だけの層なので、ここで
   見るのは「出る場所と出る条件」と「動きが止められること」だけで、数の側 (輝きの
   値の作り方) は test_komorebi_uro.js が固定している。
   node tests/test_komorebi_fx.js で実行。 */
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

/* ---- 輝きの受け口 (DOM なし) ---- */

const unit = { console };
unit.window = unit;
vm.createContext(unit);
vm.runInContext(fs.readFileSync(path.join(root, "komorebi/uro.js"), "utf8"), unit);
const uro = unit.Q4B_KOMOREBI_URO;
const text = t => t;

function offered(count){
  const profile = { uroLog: [] };
  for(let i = 0; i < count; i++){
    profile.uroLog.push({ cat: "kom_ratio", speciesId: "s", lap: 1, date: "2026-08-18", tool: "cho_net" });
  }
  return profile;
}

test("強さも 範囲も 同じ 1 本の変数から出る", () => {
  /* 変数を 2 本に割ると、片方だけ動いている状態が作れてしまう。 */
  const html = uro.hollowHtml(uro.glow(offered(3)));
  assert.match(html, /--uro-glow:0\.488/, "輝きの値が渡っていない");
  assert.equal((html.match(/--uro-/g) || []).length, 1, "輝きの変数が 1 本でない");
  assert.match(html, /class="uro-halo"/, "まわりへ にじむ ひかりが無い");
  assert.match(html, /class="uro-mote/, "光の粒が無い");
});

test("段階もレベル表示も持たない", () => {
  /* 何枚捧げたかは style の数値にしか現れない。class が枚数で変わると
     「レベルが上がった」に見えて、連続変化という決定 (design 4 章) が崩れる。 */
  const shapes = [0, 1, 4, 9, 30].map(n => uro.hollowHtml(uro.glow(offered(n))).replace(/--uro-glow:[0-9.]+/, ""));
  shapes.forEach(shape => assert.equal(shape, shapes[0], "枚数で class や形が変わっている"));
  const values = [0, 1, 4, 9, 30].map(n => uro.glow(offered(n)).value);
  for(let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1], "輝きが増えていない");
});

test("地図の入口の札にも同じ輝きが乗る", () => {
  /* うろの中に入らないと明るさが分からないのでは、「捧げるほど輝く」が
     地図の上では 1 度も見えない。 */
  const state = uro.glow(offered(2));
  const entrance = uro.entranceHtml({ text, glow: state, pending: 0 });
  assert.match(entrance, /--uro-glow:0\.36/);
  assert.match(entrance, /class="kom-trophy-open uro-open"/);
  /* 輝きを渡さない呼び出し (古い呼び方) でも枚数だけは出す。 */
  assert.match(uro.entranceHtml({ text, count: 5, pending: 0 }), /<strong>5<\/strong>/);
});

/* ---- 動きの止めどころ (CSS) ---- */

test("動く演出はすべて prefers-reduced-motion で止まる", () => {
  const css = fs.readFileSync(path.join(root, "komorebi/map.css"), "utf8");
  const stops = css.split("@media (prefers-reduced-motion:reduce)").slice(1).join("\n");
  ["scene-flit-a", "scene-lamp", "scene-stir", "uro-mote-a", "uro-hollow.is-blooming",
    "uro-granted-face", "kom-tool-break"].forEach(hook => {
    assert.ok(stops.indexOf(hook) >= 0, hook + " の動きを止める行が無い");
  });
});

/* ---- 出る場所と出る条件 (fake DOM) ---- */

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  const live = context.Q4B_KOMOREBI_TOOLS;
  const profile = komorebi.profile();
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
    const back = app.querySelector('[data-action="back"]');
    if(back) back.click();
    app.querySelector('[data-action="trophies"]').click();
    app.querySelector('[data-action="back"]').click();
  }

  test("スイッチが閉じている間は演出の掛かり口ごと出ない", () => {
    komorebi.setMedalEconomyOn(false);
    backToMap();
    assert.equal(app.innerHTML.indexOf("uro-open"), -1, "入口の輝きが出ている");
    assert.equal(app.innerHTML.indexOf("--uro-glow"), -1, "輝きの変数が漏れている");
  });

  komorebi.setMedalEconomyOn(true);
  const savedReleases = live.list().map(tool => tool.release);
  live.list().forEach(tool => { if(tool.release === 2) tool.release = 1; });
  backToMap();

  profile.lv.kom_ratio = 10;
  profile.maxLv.kom_ratio = 10;
  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
  assert.ok(trophies.award(profile, "kom_ratio", "2026-08-10"));
  backToMap();

  test("まだ 1 枚も捧げていない入口は光らない", () => {
    assert.match(app.innerHTML, /uro-open/);
    assert.match(app.innerHTML, /--uro-glow:0"/, "捧げる前から光っている");
  });

  await (async () => {
    app.querySelector('[data-action="uro"]').click();
    app.querySelector(".uro-offer").click();
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="cho_net"]'));
    await settle();

    test("捧げた直後の うろが その場で 1 枚出る (奉納の小演出)", () => {
      const html = lastOverlay().innerHTML;
      assert.match(html, /uro-hollow is-blooming/, "ひらく うろが出ていない");
      /* 輝きは捧げたあとの奉納ログから出る。演出のためだけの数は持たない。 */
      assert.match(html, /--uro-glow:0\.2"/, "捧げたあとの明るさになっていない");
      assert.match(plainText(html), /うろが すこし あかるくなった/);
    });

    test("初めての 1 本には合図が付く (初回授与の小演出)", () => {
      const html = lastOverlay().innerHTML;
      assert.match(html, /class="uro-granted is-first"/, "初回授与の合図が無い");
      assert.match(plainText(html), /はじめての どうぐ! どうぐ図かんに のこったよ/);
    });

    test("入口の輝きは 1 枚ぶん進む", () => {
      backToMap();
      assert.match(app.innerHTML, /--uro-glow:0\.2/, "地図の入口が明るくなっていない");
    });
  })();

  await (async () => {
    /* 2 本目の同じ道具では初回授与の合図を出さない。 */
    profile.lv.kom_pi314 = 10;
    profile.maxLv.kom_pi314 = 10;
    for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_pi314", 10, true);
    assert.ok(trophies.award(profile, "kom_pi314", "2026-08-11"));
    backToMap();
    app.querySelector('[data-action="uro"]').click();
    app.querySelector(".uro-offer").click();
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="cho_net"]'));
    await settle();

    test("2 本目には初回授与の合図が付かず、うろだけが明るくなる", () => {
      const html = lastOverlay().innerHTML;
      assert.match(html, /class="uro-granted"/, "2 本目に初回授与の合図が付いた");
      assert.match(html, /uro-hollow is-blooming/);
      assert.match(html, /--uro-glow:0\.36"/, "2 枚目ぶんの明るさになっていない");
    });
  })();

  test("破損は 1 度だけ ゆれる行として出る (破損の小演出)", () => {
    const capture = { id: "ameiro_tonbo", rarity: "N", isNew: true, n: 1, size: 40, shiny: false };
    const question = { cat: "kom_ratio", format: "normal", kind: "num", text: "た", ans: 5 };
    const broke = komorebi.feedbackHtml(question, true,
      { capture, tool: { type: "cho_net", remaining: 0, broke: true, swapped: false } });
    assert.match(broke, /class="kom-tool-break"/, "破損の行が出ていない");
    assert.match(broke, /class="tool-icon"/, "傾ける道具の絵が無い");
    /* 減っただけの回は同じ行にしない (毎回ゆれては小イベントにならない)。 */
    const left = komorebi.feedbackHtml(question, true,
      { capture, tool: { type: "cho_net", remaining: 12, broke: false, swapped: false } });
    assert.equal(left.indexOf("kom-tool-break"), -1);
  });

  test("no alert was needed anywhere in the effects path", () => {
    assert.deepEqual(alerts, []);
  });

  live.list().forEach((tool, index) => { tool.release = savedReleases[index]; });
  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
