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

test("どうぐばこに別の種類が残っているなら、うろではなく そうび を案内する", () => {
  /* 同じ種類の予備は黙って引き継ぐが、別の種類へは勝手に持ち替えない (guild が
     変わる)。持っているのに「うろで また もらおう」と言うと、どうぐばこの中身が
     無いことにされてしまう。 */
  const left = ui.statusHtml({ type: "light_trap", remaining: 0, broke: true, swapped: false,
    boxEmpty: false }, null, "k10");
  assert.match(plainText(left), /ライトが きえた!/);
  assert.match(plainText(left), /どうぐばこの ほかの どうぐを そうびしよう/);
  assert.equal(plainText(left).indexOf("うろで また もらおう"), -1);
  /* boxEmpty を知らない古い呼び出しは、これまでどおり うろへ案内する。 */
  assert.match(plainText(ui.statusHtml({ type: "light_trap", remaining: 0, broke: true, swapped: false })),
    /うろで また もらおう/);
});

test("破損は 1 行の知らせではなく、絵とひびのある 1 つの出来事として出す", () => {
  const broke = ui.statusHtml({ type: "light_trap", remaining: 0, broke: true, swapped: false, boxEmpty: true });
  assert.match(broke, /class="q4b-tool-break-art"/, "壊れた道具の絵が無い");
  assert.match(broke, /class="q4b-tool-crack"/, "ひびが無い");
  /* 見送りは感謝の言葉ではなく、その道具が実際にやったこと。捕獲数は耐久そのもの
     なので、この 1 行のために新しい状態は持たない (数字は tools.durability と一致)。 */
  assert.match(plainText(broke), new RegExp(tools.durability + "ぴき いっしょに つかまえたね"),
    "見送りの 1 行が無い");
  assert.equal(plainText(broke).indexOf("ありがとう"), -1, "感謝の定型句になっている");
  /* 壊れていない回に ひび が出ると、残りの行が毎回 破損に見える。 */
  const alive = ui.statusHtml({ type: "light_trap", remaining: 12, broke: false, swapped: false });
  assert.equal(alive.indexOf("q4b-tool-crack"), -1, "壊れていない回に ひびが出た");
  assert.equal(alive.indexOf("いっしょに つかまえたね"), -1, "壊れていない回に見送りが出た");
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

/* --- ここでは つかえない道具 (対象 guild ゼロ) -------------------------------
   本編は目で捕獲プールが割れているので、けいさん (甲虫) に灯火採集セットを持ち込むと
   対象種が 1 匹もいない。それでも耐久だけが減って壊れるので、プールを渡された文脈では
   「その場所では道具ではない」として倒す。 */
const MOTHS = [{ id: "ga", order: "Lepidoptera", family: "Saturniidae", groupJa: "ガ", tags: ["moth"] }];
const BEETLES = [{ id: "kuwagata", order: "Coleoptera", family: "Lucanidae", groupJa: "クワガタムシ", tags: [] }];

test("worksIn は対象 guild が 1 匹でもいるかを見て、プール不明では取り上げない", () => {
  assert.equal(tools.worksIn("light_trap", MOTHS), true);
  assert.equal(tools.worksIn("light_trap", BEETLES), false, "甲虫しかいないのに灯火が働いた");
  assert.equal(tools.worksIn("banana_trap", BEETLES), true);
  assert.equal(tools.worksIn("light_trap", null), true, "プール不明で道具を取り上げた");
  assert.equal(tools.worksIn("light_trap", []), true, "空のプールで道具を取り上げた");
  assert.equal(tools.worksIn("no_such_tool", MOTHS), false);
});

test("パネルは対象ゼロの道具を選べなくし、いまの そうび を なし に倒す", () => {
  const html = panel({ pool: BEETLES, text: plainText });
  assert.match(html, /q4b-tool-chip is-dead/, "つかえない札の目印が無い");
  assert.ok(html.indexOf('data-equip="light_trap"') < 0, "対象ゼロの道具が選べる");
  assert.match(html, /ここでは つかえない/, "理由の 1 行が無い");
  assert.match(html, /12／100/, "残りは伏せない (道具は無くなっていない)");
  assert.match(html, /いまの そうび.*<strong>なし<\/strong>/, "働かない道具が そうび中 に見えている");
  /* 対象がいるプールでは従来どおり選べる。 */
  const alive = panel({ pool: MOTHS, text: plainText });
  assert.match(alive, /data-equip="light_trap"/, "対象がいるのに選べない");
  /* 判定は道具ごと。同じプールでも吸虫管 (15mm 未満) には対象がいないので倒れる。 */
  assert.ok(alive.indexOf('data-equip="aspirator"') < 0, "対象ゼロの吸虫管が選べる");
  /* プールを渡さない文脈は従来どおり (小道の旧呼び出しを壊さない)。 */
  assert.match(panel({ text: plainText }), /data-equip="light_trap"/);
});

test("inactiveTool は ここでは働かない装備だけを返す", () => {
  const args = { gear: gearFull("light_trap"), economy: economyOn };
  assert.equal(ui.inactiveTool(Object.assign({ pool: BEETLES }, args)).id, "light_trap");
  assert.equal(ui.inactiveTool(Object.assign({ pool: MOTHS }, args)), null, "働く道具で知らせが出た");
  assert.equal(ui.inactiveTool(args), null, "プール不明で知らせが出た");
  assert.equal(ui.inactiveTool({ gear: gearFull(null), economy: economyOn, pool: BEETLES }), null,
    "未装備で知らせが出た");
  assert.equal(ui.inactiveTool({ gear: gearFull("light_trap"), economy: economyOff, pool: BEETLES }), null,
    "経済が閉じているのに知らせが出た");
  /* 未公開 release の道具は「未装備」扱いなので、知らせも出さない。 */
  assert.equal(ui.inactiveTool({ gear: gearFull("aspirator"), economy: economyOn, release: 2, pool: BEETLES }),
    null, "未公開の道具で知らせが出た");
});

test("noticeHtml は道具の名前と guild を言い、text の注入が全文字列を通る", () => {
  const html = ui.noticeHtml(tools.byId("light_trap"), { text: value => "《" + value + "》" });
  assert.match(html, /class="q4b-tool-notice"/);
  assert.ok(html.indexOf("《灯火採集セットは よるに とぶ 虫を つかまえる どうぐ。》") >= 0,
    "なぜ ここでは だめかの 1 行が無い");
  assert.ok(html.indexOf("《ここには その 虫が いないから、ここでは はずしておくね。》") >= 0);
  assert.ok(html.indexOf("どうぐばこには そのまま のこるよ") >= 0, "道具が残ることを言っていない");
  assert.match(html, /class="q4b-tool-notice-ok"/, "閉じる札が無い");
  /* 5 歳コースは かなの名前 (tools.js の yomi)。 */
  assert.ok(ui.noticeHtml("light_trap", { course: "k5" }).indexOf("とうかさいしゅうセット") >= 0);
  assert.equal(ui.noticeHtml(null), "", "道具なしで知らせが出た");
});

test("bindNotice は わかった を 1 度だけ配線する", () => {
  const app = makeApp();
  app.innerHTML = ui.noticeHtml(tools.byId("light_trap"));
  let closed = 0;
  ui.bindNotice(app, { onClose: () => closed++ });
  app.querySelector(".q4b-tool-notice-ok").click();
  assert.equal(closed, 1, "わかった が閉じない");
});

console.log(`RESULT ${passed} passed, 0 failed`);
