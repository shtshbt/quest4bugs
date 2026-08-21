/* 統一捕獲カード (shared/capture_card.js)。keisan のフリップカード + レア度枠を
   土台に、いろちがいの光り・とうろく・じこベスト・道具の場面と残り表示までを
   1 枚に合成した「最もリッチな形」が、そのまま全ゲームに置けることを固定する:
   モーダルの外枠を含まない、絵は Q4BRender.species を通る (しゃしんモード両対応)、
   画面の全文字列が opts.text を通る (ふりがなを注入できる)。
   node tests/test_capture_card.js で実行。 */
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
for(const file of ["shared/bugs.js", "shared/render.js", "shared/bug_archetypes.js", "shared/reward.js",
  "shared/tools.js", "shared/tool_icons.js", "shared/tool_scenes.js",
  "shared/tools_ui.js", "shared/capture_card.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const card = context.Q4BCaptureCard;
const reward = context.Q4BReward;
const tools = context.Q4B_TOOLS;
const bugs = context.Q4B_BUGS;

function speciesOfTier(tier){
  const sp = bugs.filter(b => reward.tierOf(b) === tier && b.note)[0];
  assert.ok(sp, "tier " + tier + " の種が見つからない");
  return sp;
}
const sp0 = speciesOfTier(0);
const sp3 = speciesOfTier(3);

/* Q4BReward.record の返り値と同じ形。 */
function result(sp, extra){
  return Object.assign({ sp, size: 40, shiny: false, sex: "m",
    isNew: false, isRecord: false, tier: reward.tierOf(sp) }, extra || {});
}

test("新顔は とうろくのしるし付きのフリップカードになる", () => {
  const html = card.html(result(sp0, { isNew: true }));
  assert.match(html, /^<div class="q4b-cap-card" role="status">/, "カードの器が無い");
  assert.match(html, /q4b-cap-flipwrap/, "フリップの器が無い");
  assert.match(html, /class="q4b-cap-face q4b-cap-front r0"/, "レア度枠が付いていない");
  assert.match(html, /class="q4b-cap-face q4b-cap-back" aria-hidden="true"/, "裏面が読み上げ対象になっている");
  const text = plainText(html);
  assert.match(text, /つかまえた！/);
  assert.match(text, /ずかんに とうろく/, "とうろくのしるしが無い");
  assert.match(text, /40mm/, "サイズが無い");
  assert.match(text, new RegExp(reward.TIERNAME[0]), "レア度の名前が無い");
  assert.ok(text.indexOf(sp0.jaName.replace(/\s+/g, " ")) >= 0, "和名が無い");
  assert.match(text, new RegExp(sp0.note.slice(0, 6)), "まめちしきが無い");
  assert.equal(html.indexOf("匹め"), -1, "新顔に 何匹めが出た");
});

test("レア度で枠とタグの色クラスが変わる", () => {
  const html = card.html(result(sp3));
  assert.match(html, /class="q4b-cap-face q4b-cap-front r3"/);
  assert.match(html, /class="q4b-cap-tier r3"/);
  assert.match(plainText(html), new RegExp(reward.TIERNAME[3]));
});

test("いろちがいは面が光り、名前に ✨、いろちがいのしるしが付く", () => {
  const html = card.html(result(sp0, { shiny: true, n: 2 }));
  assert.match(html, /q4b-cap-front r0 q4b-cap-shiny/, "面が光っていない");
  assert.match(plainText(html), /✨/, "名前の ✨ が無い");
  assert.match(plainText(html), /いろちがい/, "いろちがいのしるしが無い");
  /* 新顔の回は とうろくのしるしと 2 度鳴らさない。 */
  const asNew = card.html(result(sp0, { shiny: true, isNew: true }));
  assert.equal(asNew.indexOf("q4b-cap-shiny-tag"), -1, "新顔に いろちがいのしるしが重なった");
  assert.match(asNew, /q4b-cap-shiny/, "新顔でも面は光る");
  /* ふつうの個体は光らない。 */
  assert.equal(card.html(result(sp0)).indexOf("q4b-cap-shiny"), -1, "ふつうの個体が光った");
});

test("何匹めと じこベストのしるし", () => {
  assert.match(plainText(card.html(result(sp0, { n: 3 }))), /3匹め/);
  assert.match(plainText(card.html(result(sp0, { n: 3, isRecord: true }))), /3匹め・じこベスト こうしん!/);
  assert.match(plainText(card.html(result(sp0, { isRecord: true }))), /じこベスト こうしん!/);
});

test("道具を使った回だけ、場面が上に、残りの行が下に付く", () => {
  const use = { type: "light_trap", remaining: 12, broke: false, swapped: false };
  const html = card.html(result(sp0, { toolUse: use }));
  assert.match(html, /class="q4b-tool-scene"/, "場面が無い");
  assert.ok(html.indexOf("q4b-tool-scene") < html.indexOf("q4b-cap-head"),
    "場面は見出しより上に置く (komorebi と同じ順)");
  assert.match(html, /class="q4b-tool-left" role="status"/, "残りの行が無い");
  assert.ok(html.indexOf("12／" + tools.durability) >= 0, "残りが N／M で出ていない");
  assert.ok(html.indexOf("q4b-cap-note") < html.indexOf("q4b-tool-left"),
    "残りの行はカードの一番下");
  assert.match(plainText(html), /よるの ぬのに あかりを ともすと/, "灯火の 1 行が無い");
});

test("道具なしの回は道具の要素が 1 つも出ない", () => {
  const html = card.html(result(sp0, { isNew: true }));
  assert.equal(html.indexOf("q4b-tool-"), -1, "道具なしの回に道具の要素が出た");
});

test("破損の知らせもカードの中で完結する (コースの名前で)", () => {
  const broke = card.html(result(sp0, {
    toolUse: { type: "light_trap", remaining: 100, broke: true, swapped: true } }), { course: "k5" });
  assert.match(plainText(broke), /ライトが きえた!/);
  assert.match(plainText(broke), /よびの とうかさいしゅうセットに もちかえた!/);
  const gone = card.html(result(sp0, {
    toolUse: { type: "light_trap", remaining: 0, broke: true, swapped: false } }));
  assert.match(plainText(gone), /そうびが なくなった。うろで また もらおう/);
});

test("モーダルの外枠を含まない (包む側がゲームごとに違う)", () => {
  const html = card.html(result(sp0, { isNew: true,
    toolUse: { type: "light_trap", remaining: 12, broke: false, swapped: false } }));
  assert.doesNotMatch(html, /class="modal"|class="mcard"/, "モーダルの外枠が混ざっている");
  assert.doesNotMatch(html, /position:\s*fixed/, "固定配置が混ざっている");
  assert.match(html, /^<div class="q4b-cap-card"/, "カード本体から始まっていない");
  assert.match(html, /<\/div>$/, "カード本体で終わっていない");
});

test("見出しとそえる 1 行は差し替えられる", () => {
  const html = card.html(result(sp0), { headline: "こはくで よんだよ", sub: "ふくしゅうの ごほうび" });
  assert.match(plainText(html), /こはくで よんだよ/);
  assert.match(html, /class="q4b-cap-sub"/);
  assert.match(plainText(html), /ふくしゅうの ごほうび/);
  assert.equal(card.html(null), "", "result なしで空になっていない");
  assert.equal(card.html({}), "", "sp なしで空になっていない");
});

test("絵は Q4BRender.species を通る (しゃしんモードの差し替えが効く)", () => {
  const savedSpecies = context.Q4BRender.species;
  try{
    /* zukan_render はしゃしんモードで Q4BRender.species を置き換える。カードが
       この 1 本を呼んでいれば、差し替えだけで写真にもイラストにもなる。 */
    context.Q4BRender.species = () => '<svg class="ART-MARK"></svg>';
    context.Q4BRender.zukanOrigSpecies = () => '<svg class="ORIG-MARK"></svg>';
    assert.match(card.html(result(sp0)), /ART-MARK/, "species を通っていない");
    assert.match(card.html(result(sp0), { photoMode: false }), /ORIG-MARK/,
      "photoMode:false が常時イラストへ倒れていない");
    assert.match(card.html(result(sp0), { photoMode: true }), /ART-MARK/);
  }finally{
    context.Q4BRender.species = savedSpecies;
    delete context.Q4BRender.zukanOrigSpecies;
  }
});

test("text の注入が全可視文字列を通る (ふりがなを注入できる)", () => {
  const html = card.html(result(sp0, { shiny: true, n: 3, isRecord: true,
    toolUse: { type: "light_trap", remaining: 100, broke: true, swapped: true } }),
    { text: value => "《" + value + "》", sub: "ふくしゅうの ごほうび", course: "k10" });
  ["《つかまえた！》", "《ふくしゅうの ごほうび》", "《" + sp0.jaName + "》",
   "《" + reward.TIERNAME[0] + "》", "《3匹め・じこベスト こうしん!》", "《いろちがい》",
   "《ライトが きえた!》", "《よびの 灯火採集セットに もちかえた!》"].forEach(marked => {
    assert.ok(html.indexOf(marked) >= 0, marked + " が text を通っていない");
  });
  /* 漢字を含む文字列がひとつでも text の外に出ると、5 歳コースでふりがなが
     付けられない。タグと《…》の中身を除いた残りに漢字が無いことを見る。 */
  const bare = plainText(html).replace(/《[^》]*》/g, " ");
  assert.doesNotMatch(bare, /[一-鿿]/, "text を通らない漢字がある: " + bare.trim());
});

test("attach はめくりを配線し、二重には配線しない", () => {
  const app = makeApp();
  app.innerHTML = card.html(result(sp0, { isNew: true }));
  card.attach(app);
  const flip = app.querySelector(".q4b-cap-flip");
  assert.ok(flip, "フリップの要素が無い");
  assert.equal((flip.listeners.click || []).length, 1, "タップが配線されていない");
  card.attach(app);
  assert.equal(flip.listeners.click.length, 1, "二重に配線された");
  flip.click();
  assert.equal(flip.style.animation, "", "タップ後にアニメが掛け直されていない");
  /* 配線相手がいなくても落ちない。 */
  card.attach(null);
});

console.log(`RESULT ${passed} passed, 0 failed`);
