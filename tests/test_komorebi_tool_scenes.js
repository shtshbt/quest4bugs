/* 捕獲ビネット (shared/tool_scenes.js、tools_design 9 章)。道具ごとの
   採集シーンが 11 種そろっていること、絵が静的ファイルだけで完結すること、そして
   「表示だけの層」という約束 (装備した回にだけ出る / スイッチが閉じている間は
   1 要素も増えない) を固定する。
   node tests/test_komorebi_tool_scenes.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, KOMOREBI_FILES, plainText } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function settle(){ return new Promise(resolve => setTimeout(resolve, 0)); }

const context = { console };
context.window = context;
vm.createContext(context);
for(const file of ["shared/tool_scenes.js", "shared/tools.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const scenes = context.Q4B_TOOL_SCENES;
const tools = context.Q4B_TOOLS;

test("there is exactly one scene per tool, and no scene without a tool", () => {
  const toolIds = tools.list().map(tool => tool.id).sort();
  assert.equal(toolIds.length, 11, "道具が 11 種でない");
  assert.equal(scenes.ids.slice().sort().join(","), toolIds.join(","), "ビネットと道具が 1 対 1 でない");
  assert.equal(scenes.svg("no_such_tool"), "", "知らない道具に場面が出た");
  assert.equal(scenes.caption("no_such_tool"), "", "知らない道具に文が出た");
});

test("every scene is a self-contained drawing that reads without any stylesheet", () => {
  scenes.ids.forEach(id => {
    const svg = scenes.svg(id);
    assert.match(svg, /^<svg class="tool-scene" viewBox="0 0 160 84"/, id + " の器が揃っていない");
    assert.match(svg, /<\/svg>$/, id + " が閉じていない");
    /* 絵そのものは飾り。読み上げるぶんは caption() の 1 行が受け持つ。 */
    assert.match(svg, /aria-hidden="true"/, id + " の絵が読み上げの対象になっている");
    /* 配信は静的ファイルだけで完結する。外部参照も画像埋め込みも持たせない。 */
    assert.doesNotMatch(svg, /<image|xlink:href|href=|url\(|http/, id + " が外を読みに行っている");
    assert.doesNotMatch(svg, /<script|on[a-z]+=/, id + " に実行されるものが混ざっている");
    /* CSS が無くても色が乗っていること (class だけに頼らない)。 */
    assert.match(svg, /fill="#/, id + " が CSS 頼みで、素では潰れる");
    assert.match(svg, /class="scene-sky"/, id + " に場面の下地が無い");
  });
});

test("動く場所は位置を持つ入れ子の外側にある", () => {
  /* CSS の transform は SVG の transform 属性を置き換える。位置を持つ g に
     ゆれを掛けると虫が原点へ飛ぶので、動く枠と置き場所は別の g で持つ。 */
  scenes.ids.forEach(id => {
    const svg = scenes.svg(id);
    const animated = svg.match(/<g class="scene-life [^"]*"[^>]*>/g) || [];
    animated.forEach(tag => assert.doesNotMatch(tag, /transform=/,
      id + " の動く g が位置も持っている (CSS の transform に潰される)"));
  });
});

test("every scene comes with one line a child can read", () => {
  scenes.ids.forEach(id => {
    const line = scenes.caption(id);
    assert.ok(line && line.length >= 12, id + " の文が短すぎる");
    /* ダッシュ記号は使わない (docs の文体規約)。 */
    assert.doesNotMatch(line, /[—–]|--/, id + " の文にダッシュが混ざっている");
    /* ひらがな多めであること。小 2 でも読める字 (水・中・木・虫・手・白) に限る
       前提で、割合の上限だけを固定する。 */
    const kanji = (line.match(/[一-鿿]/g) || []).length;
    assert.ok(kanji / line.length <= 0.15, id + " の文が漢字に寄っている (" + kanji + "/" + line.length + ")");
  });
});

test("the scene module is delivered and cached like the rest of the path", () => {
  const page = fs.readFileSync(path.join(root, "komorebi/index.html"), "utf8");
  assert.match(page, /<script src="\.\.\/shared\/tool_scenes\.js\?v=[^"]+"><\/script>/,
    "小道のページがビネットを読み込んでいない");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(sw, /"\.\/shared\/tool_scenes\.js"/, "ビネットが precache に無い");
});

/* ---- 捕獲リザルトへの出方 (fake DOM) ---- */

(async () => {
  const live = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const komorebi = live.Q4B_KOMOREBI;
  const capture = { id: "ameiro_tonbo", rarity: "N", isNew: true, n: 1, size: 40, shiny: false };
  const question = { cat: "kom_ratio", format: "normal", kind: "num", text: "た", ans: 5 };
  const use = { type: "light_trap", remaining: 12, broke: false, swapped: false };

  test("スイッチが閉じている間は捕獲の見た目が 1 要素も増えない", () => {
    komorebi.setMedalEconomyOn(false);
    const html = komorebi.feedbackHtml(question, true, { capture, tool: use });
    assert.equal(html.indexOf("kom-tool-scene"), -1, "経済が閉じているのに場面が出た");
    assert.equal(html.indexOf("tool-scene"), -1);
  });

  komorebi.setMedalEconomyOn(true);

  test("装備して 1 匹とれた回にだけ、その道具の場面が捕獲カードの上に出る", () => {
    const html = komorebi.feedbackHtml(question, true, { capture, tool: use });
    assert.match(html, /class="tool-scene"/, "場面が出ていない");
    /* 場面は共有捕獲カード (q4b-cap-card) の中で、めくり (q4b-cap-flipwrap) より
       上に置かれる (結果より先に絵が来る順)。 */
    assert.ok(html.indexOf("q4b-tool-scene") >= 0, "場面の器が出ていない");
    assert.ok(html.indexOf("q4b-tool-scene") < html.indexOf("q4b-cap-flipwrap"),
      "場面は捕獲カードの上に置く (結果より先に絵が来る順)");
    assert.match(plainText(html), /よるの ぬのに あかりを ともすと/, "灯火の 1 行が出ていない");
    /* 場面は道具ごとに違う。落とし穴なら朝の見回りになる。 */
    const morning = komorebi.feedbackHtml(question, true,
      { capture, tool: { type: "pitfall_trap", remaining: 9, broke: false, swapped: false } });
    assert.match(plainText(morning), /あさ いちばんに 見まわりに いくと/);
  });

  test("道具なしの回と、とれなかった回には出ない", () => {
    assert.equal(komorebi.feedbackHtml(question, true, { capture, tool: null }).indexOf("tool-scene"), -1,
      "未装備の回に場面が出た");
    assert.equal(komorebi.feedbackHtml(question, true, { capture: null, tool: use }).indexOf("tool-scene"), -1,
      "1 匹もとれていない回に場面が出た");
  });

  test("道具が壊れた回でも、その 1 匹はとれているので場面は出る", () => {
    const broke = komorebi.feedbackHtml(question, true,
      { capture, tool: { type: "light_trap", remaining: 0, broke: true, swapped: false } });
    assert.match(broke, /class="tool-scene"/);
    assert.match(plainText(broke), /ライトが きえた!/);
  });

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
