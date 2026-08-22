/* 装備パネル (shared/tools_ui.js)。komorebi のインラインウィジェットと同じ表示規則
   (経済の公開ゲート、未公開 release の道具は出さない、道具ゼロならパネルごと空、
   よび N、残り N／M) が、独立部品に切り出しても 1 つも欠けないことを固定する。
   ふりがなを持たないこと (text / attrText の注入で全文字列が通ること) も見る。
   node tests/test_tools_ui.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { makeApp, plainText } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const context = { console };
context.window = context;
vm.createContext(context);
for(const file of ["shared/tools.js", "shared/tool_icons.js", "shared/tool_scenes.js", "shared/tools_ui.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const tools = context.Q4B_TOOLS;
const ui = context.Q4BToolsUI;

const economyOn = { on: () => true, currentRelease: () => 9 };
const economyOff = { on: () => false, currentRelease: () => 9 };

/* light_trap (更新 2) を 2 本と aspirator (更新 4) を 1 本。小道の実データと同じ形。 */
function gearFull(equippedId){
  return {
    tools: [
      { type: "light_trap", remaining: 12 },
      { type: "light_trap", remaining: 100 },
      { type: "aspirator", remaining: 3 }
    ],
    equippedToolId: equippedId === undefined ? "light_trap" : equippedId
  };
}

function panel(opts){
  return ui.panelHtml(Object.assign({ gear: gearFull(), economy: economyOn, course: "k10" }, opts || {}));
}

test("経済が無い / 閉じている間はパネルごと空文字", () => {
  assert.equal(ui.panelHtml({ gear: gearFull() }), "", "economy なしでパネルが出た");
  assert.equal(ui.panelHtml({ gear: gearFull(), economy: economyOff }), "", "経済が閉じているのにパネルが出た");
  assert.equal(ui.panelHtml(), "");
});

test("道具ゼロならパネルごと空文字 (空の器を出さない)", () => {
  assert.equal(panel({ gear: { tools: [], equippedToolId: null } }), "");
  /* 知らない道具しか持っていない状態も同じ (先の更新の道具を古い端末が読む形)。 */
  assert.equal(panel({ gear: { tools: [{ type: "no_such_tool", remaining: 5 }], equippedToolId: null } }), "");
});

test("チップは なし + 所持種類で、装備中の 1 枚だけ aria-pressed", () => {
  const html = panel();
  const app = makeApp();
  app.innerHTML = html;
  const chips = app.querySelectorAll("[data-equip]");
  assert.equal(chips.length, 3, "なし + 2 種類 の 3 枚でない");
  assert.equal(chips[0].getAttribute("data-equip"), "");
  assert.equal(chips[0].getAttribute("aria-pressed"), "false");
  const lightTrap = chips.filter(chip => chip.getAttribute("data-equip") === "light_trap")[0];
  assert.equal(lightTrap.getAttribute("aria-pressed"), "true", "装備中の札が押された表示でない");
  const aspirator = chips.filter(chip => chip.getAttribute("data-equip") === "aspirator")[0];
  assert.equal(aspirator.getAttribute("aria-pressed"), "false");
  assert.match(html, /class="q4b-tool-panel" role="group"/, "独立カードの器が無い");
  assert.match(plainText(html), /どうぐ/, "見出しが無い");
  assert.match(plainText(html), /いまの そうび/, "装備の行が無い");
});

test("なにも装備していなければ「なし」の札が押された表示になる", () => {
  const app = makeApp();
  app.innerHTML = panel({ gear: gearFull(null) });
  const none = app.querySelectorAll("[data-equip]")[0];
  assert.equal(none.getAttribute("aria-pressed"), "true");
  assert.match(plainText(app.innerHTML), /いまの そうび\s*なし/);
});

test("同種 2 本目は よび N、残りは durability に連動した N／M", () => {
  const html = panel();
  assert.match(plainText(html), /よび 1/, "よびの数が出ていない");
  assert.ok(html.indexOf("12／" + tools.durability) >= 0, "残りが N／M で出ていない");
  /* 上限の数字を直書きしていないこと。durability を差し替えれば表示も変わる。 */
  const saved = tools.durability;
  tools.durability = 77;
  try{
    assert.ok(panel().indexOf("12／77") >= 0, "durability の変更が表示に効いていない");
  }finally{
    tools.durability = saved;
  }
});

test("未公開 release の道具は出さず、装備中でも「なし」として見せる", () => {
  const app = makeApp();
  app.innerHTML = panel({ release: 2, gear: gearFull("aspirator") });
  const chips = app.querySelectorAll("[data-equip]");
  assert.equal(chips.length, 2, "未公開の道具の札が出ている");
  assert.equal(chips.filter(chip => chip.getAttribute("data-equip") === "aspirator").length, 0);
  /* aspirator (更新 4) を装備したままでも、公開が更新 2 なら なし と見せる。 */
  assert.equal(chips[0].getAttribute("aria-pressed"), "true", "未公開の装備が なし に倒れていない");
  assert.match(plainText(app.innerHTML), /いまの そうび\s*なし/);
  /* 全種未公開なら パネルごと出ない。 */
  assert.equal(panel({ release: 1 }), "", "全種未公開なのにパネルが出た");
});

test("文言にダッシュ記号も AI 的な強調も混ざらない", () => {
  const text = plainText(panel() + panel({ gear: gearFull(null), course: "k5" })
    + ui.statusHtml({ type: "light_trap", remaining: 0, broke: true, swapped: true }, null, "k5")
    + ui.statusHtml({ type: "light_trap", remaining: 0, broke: true, swapped: false }, null, "k10"));
  assert.doesNotMatch(text, /[—–]/, "ダッシュが混ざっている");
  assert.doesNotMatch(text, /--/, "二重ハイフンが混ざっている");
  assert.doesNotMatch(text, /\*\*/, "強調記法が混ざっている");
  assert.doesNotMatch(text, /[A-Z]{3,}/, "大文字だけの語が混ざっている");
});

test("text / attrText の注入が画面の全文字列を通る (ふりがなを注入できる)", () => {
  const html = panel({
    course: "k5",
    text: value => "《" + value + "》",
    attrText: value => "【" + value + "】"
  });
  ["《どうぐ》", "《いまの そうび》", "《なし》", "《よび 1》",
   "《とうかさいしゅうセット》", "《きゅうちゅうかん》"].forEach(marked => {
    assert.ok(html.indexOf(marked) >= 0, marked + " が text を通っていない");
  });
  assert.ok(html.indexOf('aria-label="【そうびする どうぐ】"') >= 0, "属性が attrText を通っていない");
  /* 5 歳コースには かなの名前だけが出る (tools.js displayName と同じ 1 本)。 */
  assert.equal(html.indexOf("灯火採集セット"), -1, "5 歳コースに漢字の名前が漏れている");
});

test("bindPanel は data-equip を配線し、選択中の札は何もしない", () => {
  const app = makeApp();
  app.innerHTML = panel();
  const calls = [];
  ui.bindPanel(app, { onEquip: type => calls.push(type) });
  const chips = app.querySelectorAll("[data-equip]");
  chips.filter(chip => chip.getAttribute("data-equip") === "aspirator")[0].click();
  assert.deepEqual(calls, ["aspirator"], "持ち替えが呼ばれていない");
  chips[0].click();     /* なし */
  assert.deepEqual(calls, ["aspirator", null], "なし が null で渡っていない");
  chips.filter(chip => chip.getAttribute("data-equip") === "light_trap")[0].click();
  assert.deepEqual(calls, ["aspirator", null], "選択中の札で持ち替えが呼ばれた");
  /* 配線相手がいなくても落ちない。 */
  ui.bindPanel(null, { onEquip(){} });
  ui.bindPanel(app, {});
});

test("statusHtml は残り N／M の 1 行。未装備 / 知らない道具は空", () => {
  const html = ui.statusHtml({ type: "light_trap", remaining: 12, broke: false, swapped: false });
  assert.match(html, /class="q4b-tool-left" role="status"/);
  assert.ok(html.indexOf("12／" + tools.durability) >= 0);
  assert.equal(ui.statusHtml(null), "");
  assert.equal(ui.statusHtml({ type: "no_such_tool", remaining: 1, broke: false, swapped: false }), "");
});

test("statusHtml の破損文はコースの名前で持ち替えを知らせる", () => {
  const swapped = ui.statusHtml({ type: "light_trap", remaining: 100, broke: true, swapped: true }, null, "k5");
  assert.match(plainText(swapped), /ライトが きえた!/);
  assert.match(plainText(swapped), /よびの とうかさいしゅうセットに もちかえた!/);
  const swappedK10 = ui.statusHtml({ type: "light_trap", remaining: 100, broke: true, swapped: true }, null, "k10");
  assert.match(plainText(swappedK10), /よびの 灯火採集セットに もちかえた!/);
  const gone = ui.statusHtml({ type: "light_trap", remaining: 0, broke: true, swapped: false }, null, "k5");
  assert.match(plainText(gone), /そうびが なくなった。うろで また もらおう/);
});

test("sceneHtml は装備して 対象 guild の虫が 1 匹とれた回だけ、その道具の場面を返す", () => {
  /* bugs.js を読まない文脈なので、種は呼び出し側と同じ形 (result.sp) で渡す。 */
  const moth = { id: "ga", sp: { order: "Lepidoptera", family: "Saturniidae", groupJa: "ガ", tags: ["moth"] } };
  const use = { type: "light_trap", remaining: 12, broke: false, swapped: false };
  const html = ui.sceneHtml(moth, use, value => "《" + value + "》");
  assert.match(html, /class="q4b-tool-scene"/);
  assert.match(html, /class="tool-scene"/, "場面の絵が無い");
  assert.ok(html.indexOf("《よるの ぬのに あかりを ともすと、虫が つぎつぎ あつまってきた》") >= 0,
    "1 行が text を通っていない");
  assert.equal(ui.sceneHtml(null, use), "", "とれていない回に場面が出た");
  assert.equal(ui.sceneHtml(moth, null), "", "未装備の回に場面が出た");
  assert.equal(ui.sceneHtml(moth, { type: "no_such_tool" }), "", "知らない道具に場面が出た");
  /* 道具は当選重み 3 倍であって排他ではない。対象外の虫に場面を出すと、絵と 1 行が
     捕れ方の説明として嘘になる (灯火採集で とんぼ、バナナトラップで トンボ)。 */
  const dragonfly = { id: "tonbo", sp: { order: "Odonata", family: "Libellulidae", groupJa: "トンボ", tags: [] } };
  assert.equal(ui.sceneHtml(dragonfly, { type: "banana_trap", remaining: 9 }), "",
    "バナナトラップの場面がトンボに付いた");
  assert.equal(ui.sceneHtml({ id: "unknown" }, use), "", "種が引けない回に場面が出た");
});

console.log(`RESULT ${passed} passed, 0 failed`);
