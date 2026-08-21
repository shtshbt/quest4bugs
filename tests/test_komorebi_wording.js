/* メダル経済の文言 (tools_design 9 章 4 番目)。子どもが読む文だけを集めて、
   書き方の約束を固定する: ひらがな多め、ダッシュ記号を使わない、5 歳コースで
   読めない名前や 誤った読み を出さない。

   ふりがなは語の辞書引き (keisan/app.js の furi5) なので、辞書に無い語は素通りし、
   部分一致すると誤った読みが付く (「名人」の 人 に「にん」)。ここでは実際に furi5 を
   通し、出てきた 読み を 1 つずつ点検済みの表と突き合わせる。新しい文言で知らない
   読みが生えたらこのテストが落ちる。
   node tests/test_komorebi_wording.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, KOMOREBI_FILES, plainText } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

const unit = { console };
unit.window = unit;
vm.createContext(unit);
for(const file of ["shared/tool_scenes.js", "shared/tools.js", "komorebi/uro.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), unit);
}
const tools = unit.Q4B_TOOLS;
const scenes = unit.Q4B_TOOL_SCENES;

const KANJI = /[一-鿿]/;
const KANA_ONLY = /^[ぁ-ゟ゠-ヿー\s]+$/;

/* 画面に出る文をすべて集める。uro.js と app.js のぶんは text(...) / displayText(...)
   の引数を拾う (経済の画面はどちらもこの 2 つしか通らない)。 */
function literals(file, callee){
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const found = source.match(new RegExp(callee + '\\("([^"]*)"\\)', "g")) || [];
  return found.map(hit => hit.slice(callee.length + 2, -2));
}

function toolStrings(){
  const out = [];
  tools.list().forEach(tool => {
    [tool.name, tool.yomi, tool.guild, tool.blurb, tool.breakText].forEach(value => {
      if(typeof value === "string" && value) out.push(value);
    });
  });
  return out;
}

const captions = scenes.ids.map(id => scenes.caption(id));
const uroText = literals("komorebi/uro.js", "text");
const everything = toolStrings().concat(captions, uroText);

test("子どもが読む文にダッシュ記号も AI 的な強調も混ぜない", () => {
  everything.forEach(line => {
    assert.doesNotMatch(line, /[—–]/, "ダッシュが混ざっている: " + line);
    assert.doesNotMatch(line, /--/, "二重ハイフンが混ざっている: " + line);
    assert.doesNotMatch(line, /\*\*/, "強調記法が混ざっている: " + line);
    assert.doesNotMatch(line, /[A-Z]{3,}/, "大文字だけの語が混ざっている: " + line);
  });
});

/* ふりがなの辞書が正しく読める漢字だけを使う。辞書に無い漢字は 5 歳コースで
   読みが付かず、部分一致する漢字は誤った読みが付く。どちらも かなで書けば消える
   ので、道具の名前 (実在の採集法の名前) 以外は この 4 字に限る。 */
const READABLE_KANJI = new Set(["虫", "白", "中", "見"]);

test("名前いがいの文には、読みが付く漢字しか使わない", () => {
  const flavour = captions.concat(uroText);
  tools.list().forEach(tool => flavour.push(tool.guild, tool.blurb, tool.breakText));
  flavour.forEach(line => {
    (line.match(/[一-鿿]/g) || []).forEach(char => {
      assert.ok(READABLE_KANJI.has(char),
        "5 歳コースで読めない漢字 " + char + " が入っている: " + line);
    });
  });
});

test("5 歳コースの道具の名前に漢字は 1 文字も残らない", () => {
  tools.list().forEach(tool => {
    const kana = tools.displayName(tool, "k5");
    assert.doesNotMatch(kana, KANJI, tool.id + " の 5 歳コース名に漢字が残っている: " + kana);
    if(tool.yomi){
      assert.match(tool.yomi, KANA_ONLY, tool.id + " の yomi が かな だけでない");
      assert.match(tool.name, KANJI, tool.id + " は漢字を持たないのに yomi がある");
    }
    /* 10 歳コースは実在の採集法の名前のまま。 */
    assert.equal(tools.displayName(tool, "k10"), tool.name);
  });
  assert.equal(tools.displayName("no_such_tool", "k5"), "");
});

/* ---- ふりがなの読み ---- */

/* 点検済みの 読み。ここに無い読みが出たら、その文言は 5 歳コースで誤読になる
   可能性があるので、文言を直すか、読みを点検してここへ足す。 */
const REVIEWED = {
  "虫": "むし", "白": "しろ", "中": "なか", "見": "み", "小道": "こみち",
  "木漏れ日": "こもれび"
};

test("5 歳コースに出る読みは点検済みのものだけ", () => {
  const keisan = { console, setTimeout, clearTimeout };
  keisan.window = keisan;
  keisan.Q4B_KEISAN_NO_BOOT = true;
  keisan.location = { href: "", search: "" };
  keisan.document = { getElementById: () => null, querySelector: () => null,
    querySelectorAll: () => [], addEventListener(){},
    createElement: () => ({ style: {}, setAttribute(){}, appendChild(){} }), head: null, body: null };
  vm.createContext(keisan);
  for(const file of ["shared/bugs.js", "shared/reward.js", "keisan/app.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), keisan);
  }
  const furi5 = keisan.furi5;
  assert.equal(typeof furi5, "function", "ふりがなを読み込めていない");

  const lines = everything.concat(literals("komorebi/app.js", "displayText"));
  /* 5 歳コースには かなの名前が渡るので、漢字の名前そのものは通らない。 */
  const skip = new Set(tools.list().filter(tool => tool.yomi).map(tool => tool.name));
  lines.forEach(line => {
    if(skip.has(line)) return;
    const ruby = furi5(line);
    const pairs = ruby.match(/<ruby>[^<]*<rt>[^<]*<\/rt><\/ruby>/g) || [];
    pairs.forEach(hit => {
      const parts = /<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/.exec(hit);
      assert.equal(REVIEWED[parts[1]], parts[2],
        "点検していない読み " + parts[1] + "→" + parts[2] + " が出た: " + line);
    });
  });
});

test("小道と共有 UI の道具表示文言が一致する", () => {
  /* shared/tools_ui.js の faceHtml は公開 API ではないため、配信コードは変えず
     テスト文脈だけに比較窓を差して 3 実装を直接照合する。 */
  const files = KOMOREBI_FILES.filter(file => file !== "komorebi/app.js");
  const context = bootKomorebi({ root, files, globals: { Q4B_KOMOREBI_NO_BOOT: true } });
  const uiSource = fs.readFileSync(path.join(root, "shared/tools_ui.js"), "utf8").replace(
    "  global.Q4BToolsUI={",
    "  global.__Q4B_TOOLS_UI_IMPL={faceHtml:faceHtml,sceneHtml:sceneHtml,statusHtml:statusHtml};\n  global.Q4BToolsUI={"
  );
  vm.runInContext(uiSource, context);
  const appSource = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8").replace(
    "  global.Q4B_KOMOREBI={",
    "  global.__Q4B_KOMOREBI_TOOL_UI_IMPL={faceHtml:toolFaceHtml,sceneHtml:toolSceneHtml,statusHtml:toolStatusHtml,text:displayText,setCourse:function(course){profileType=course;}};\n  global.Q4B_KOMOREBI={"
  );
  vm.runInContext(appSource, context);
  context.Q4B_KOMOREBI.setMedalEconomyOn(true);

  const local = context.__Q4B_KOMOREBI_TOOL_UI_IMPL;
  const shared = context.__Q4B_TOOLS_UI_IMPL;
  const tool = context.Q4B_TOOLS.byId("light_trap");
  const capture = { id: "ameiro_tonbo" };
  const normal = { type: "light_trap", remaining: 12, broke: false, swapped: false };
  const swapped = { type: "light_trap", remaining: 100, broke: true, swapped: true };
  const normalizeClasses = html => html.replace(/q4b-tool-/g, "kom-tool-");
  const localHtml = [], sharedHtml = [];
  ["k5", "k10"].forEach(course => {
    local.setCourse(course);
    localHtml.push(local.faceHtml(tool), local.sceneHtml(capture, normal),
      local.statusHtml(normal), local.statusHtml(swapped));
    sharedHtml.push(shared.faceHtml(tool), normalizeClasses(shared.sceneHtml(capture, normal, local.text)),
      normalizeClasses(shared.statusHtml(normal, local.text, course)),
      normalizeClasses(shared.statusHtml(swapped, local.text, course)));
  });
  assert.deepEqual(localHtml, sharedHtml, "小道と共有 UI の道具表示文言がずれている");
});

/* ---- 画面に出るところまで (fake DOM、5 歳コース) ---- */

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k5" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const live = context.Q4B_TOOLS;
  const alerts = [];
  context.alert = message => alerts.push(String(message));

  komorebi.setMedalEconomyOn(true);
  const savedReleases = live.list().map(tool => tool.release);
  live.list().forEach(tool => { tool.release = 1; });
  /* 道具の状態は共有 kv (toolgear) に住むので、下ごしらえも kv へ蒔く。 */
  const gear = context.QuestSave.toolGearOf("p1");
  live.grant(gear, "light_trap", "2026-08-18");
  live.grant(gear, "aspirator", "2026-08-18");
  context.QuestSave.toolGearSet("p1", gear);

  function backToMap(){
    const back = app.querySelector('[data-action="back"]');
    if(back) back.click();
    app.querySelector('[data-action="trophies"]').click();
    app.querySelector('[data-action="back"]').click();
  }
  backToMap();
  app.querySelector('[data-action="uro"]').click();

  test("どうぐばこ も どうぐ ずかん も かなの名前で並ぶ", () => {
    const text = plainText(app.innerHTML);
    assert.match(text, /とうかさいしゅうセット/, "どうぐばこが漢字の名前のまま");
    assert.match(text, /きゅうちゅうかん/);
    assert.equal(text.indexOf("灯火採集セット"), -1, "5 歳コースに漢字の名前が漏れている");
    assert.equal(text.indexOf("吸虫管"), -1);
    assert.match(text, /どうぐ ずかん/);
  });

  test("リザルトの持ち替えの知らせも同じ名前を使う", () => {
    const capture = { id: "ameiro_tonbo", rarity: "N", isNew: true, n: 1, size: 40, shiny: false };
    const question = { cat: "kom_ratio", format: "normal", kind: "num", text: "た", ans: 5 };
    const swapped = komorebi.feedbackHtml(question, true,
      { capture, tool: { type: "light_trap", remaining: 30, broke: true, swapped: true } });
    assert.match(plainText(swapped), /よびの とうかさいしゅうセットに もちかえた!/);
  });

  test("no alert was needed anywhere in the wording path", () => {
    assert.deepEqual(alerts, []);
  });

  live.list().forEach((tool, index) => { tool.release = savedReleases[index]; });
  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
