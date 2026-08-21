/* eitango への採集道具共通化の配線を、ソース断面で固定する。見るのは 6 つ:
   共有モジュールの script/link とその順序、setToolsStore の配線、ずかん画面の
   装備パネル (panelHtml)、捕獲 3 経路 (ゲージ・こはく・ヌシ) の共通捕獲カード化、
   ずかん詳細が specCard のままであること、そしてヌシの機構 (catchNushi と
   p.nushi の記録) が改修前と 1 文字も変わっていないこと。
   vm 起動はしない (画面の実挙動でなく配線の形を見る)。
   node tests/test_eitango_tools.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "eitango/index.html"), "utf8");

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* startMarker から endMarker の手前までの断面。どちらかが無ければ落とす。 */
function slice(startMarker, endMarker){
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, "断面の開始が見つからない: " + startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, "断面の終了が見つからない: " + endMarker);
  return src.slice(start, end);
}

/* ---- 1. 共有モジュールの script/link と順序 -------------------------------- */

test("tools 系の script が idiom_data とインライン本体の間に、正しい版と順序で並ぶ", () => {
  const TOOL_SCRIPTS = [
    '<script src="../shared/economy_flag.js?v=0.2.0"></script>',
    '<script src="../shared/tools.js?v=0.2.0"></script>',
    '<script src="../shared/tool_icons.js?v=0.2.0"></script>',
    '<script src="../shared/tool_scenes.js?v=0.2.0"></script>',
    '<script src="../shared/tools_ui.js?v=0.1.0"></script>',
    '<script src="../shared/capture_card.js?v=0.1.0"></script>'
  ];
  const anchor = src.indexOf('<script src="../shared/idiom_data.js');
  assert.ok(anchor >= 0, "idiom_data.js の script tag が無い");
  /* インライン本体 (src なしの <script>) の開始位置。 */
  const inline = src.indexOf("<script>", anchor);
  assert.ok(inline > anchor, "インライン script の開始が見つからない");
  let cursor = anchor;
  for (const tag of TOOL_SCRIPTS){
    const at = src.indexOf(tag, cursor);
    assert.ok(at >= 0, "script tag が無いか順序が違う: " + tag);
    assert.ok(at < inline, "script tag がインライン本体より後にある: " + tag);
    cursor = at + tag.length;
  }
});

test("tools.css の link がある", () => {
  assert.ok(src.includes('<link rel="stylesheet" href="../shared/tools.css?v=0.1.0">'));
});

/* ---- 2. setToolsStore の配線 ------------------------------------------------ */

test("setupWalletE が walletStore を setToolsStore に差す (pid は amber と同じ ePid)", () => {
  const wallet = slice("function setupWalletE(){", "function eitangoLayEgg(");
  assert.ok(wallet.includes("Q4BReward.setAmberStore"), "amber store の配線が消えた");
  assert.ok(wallet.includes("Q4BReward.setToolsStore(Q4B_TOOLS.walletStore(QuestSave,Q4B_ECONOMY,ePid))"),
    "setToolsStore の配線が無い");
});

/* ---- 3. ずかん画面の装備パネル --------------------------------------------- */

test("scrZukan は こはく行の直後、フィルタ前に装備パネルを置く", () => {
  const zukan = slice("function scrZukan(){", "function eitangoToolPanelHtml(){");
  const amber = zukan.indexOf("eitangoAmberCatch()");
  const panel = zukan.indexOf("${eitangoToolPanelHtml()}");
  const tabs = zukan.indexOf('class="ztabs"');
  assert.ok(amber >= 0, "こはく行が無い");
  assert.ok(panel >= 0, "装備パネルの差し込みが無い");
  assert.ok(tabs >= 0, "フィルタ (ztabs) が無い");
  assert.ok(amber < panel && panel < tabs, "装備パネルの位置が こはく行とフィルタの間でない");
});

test("装備パネルは共通部品 panelHtml で描き、持ち替えは toolGearSet で保存して再描画する", () => {
  const panel = slice("function eitangoToolPanelHtml(){", "/* フィールドの習熟率");
  assert.ok(panel.includes("Q4BToolsUI.panelHtml({gear:QuestSave.toolGearOf(pid),economy:Q4B_ECONOMY})"),
    "panelHtml の呼び出しが無い");
  assert.ok(panel.includes("Q4BToolsUI.bindPanel"), "bindPanel の配線が無い");
  assert.ok(panel.includes("QuestSave.toolGearSet(pid,gear)"), "持ち替えの保存が無い");
  assert.ok(panel.includes("render()"), "持ち替え後の再描画が無い");
  /* render() の zukan 分岐が click 配線まで呼ぶこと。 */
  assert.ok(src.includes("if(screen==='zukan'){ $('#app').innerHTML=scrZukan(); bindEitangoToolPanel(); }"),
    "zukan 描画後に bindEitangoToolPanel を呼んでいない");
});

/* ---- 4. 捕獲 3 経路の共通捕獲カード化 -------------------------------------- */

test("橋渡し captureCardHtml は Q4BCaptureCard.html を呼ぶ", () => {
  const bridge = slice("function captureCardHtml(res,opts){", "const Reward = {");
  assert.ok(bridge.includes("Q4BCaptureCard.html(result,opts||{})"));
  /* toolUse と tier を結果へ渡していること (道具行とレア度枠のため)。 */
  assert.ok(bridge.includes("toolUse:res.toolUse"));
  assert.ok(bridge.includes("tier:res.sp[4]"));
});

test("ゲージ捕獲 showCatch は共通捕獲カードで描く", () => {
  const catchScr = slice("function showCatch(res,then){", "function closeCatch(){");
  assert.ok(catchScr.includes("あみを ふる!"), "前置演出 (あみを ふる!) が消えた");
  assert.ok(catchScr.includes("captureCardHtml(res)"), "共通捕獲カードで描いていない");
  assert.ok(catchScr.includes("attachCaptureCard($('#modal'))"), "めくりの配線が無い");
  assert.ok(!catchScr.includes("UI.specCard("), "旧 specCard が残っている");
});

test("こはく呼び出しも共通捕獲カードで描き、toolUse を結果へ渡す", () => {
  const amber = slice("function eitangoAmberCatch(){", "function showSpec(id){");
  assert.ok(amber.includes("captureCardHtml(spRes,{headline:'🔶 こはく30こで つかまえた！'})"),
    "共通捕獲カードで描いていない");
  assert.ok(amber.includes("toolUse:got.toolUse"), "toolUse が結果へ渡っていない");
  assert.ok(amber.includes("attachCaptureCard($('#modal'))"), "めくりの配線が無い");
  assert.ok(!amber.includes("UI.specCard("), "旧 specCard が残っている");
});

test("ヌシは 👑 見出しつきの共通捕獲カードで描き、失敗分岐の文は変えない", () => {
  const end = slice("function endSession(){", "/* ---------- launch ---------- */");
  assert.ok(end.includes("captureCardHtml(res,{headline:'👑 ヌシを つかまえた!!'})"),
    "ヌシの共通捕獲カードが無い");
  assert.ok(end.includes("ヌシは にげていった…"), "失敗分岐の文が消えた");
  assert.ok(end.includes("attachCaptureCard($('#app'))"), "めくりの配線が無い");
  assert.ok(!end.includes("UI.specCard("), "旧 specCard が残っている");
});

/* ---- 5. ずかん詳細は specCard のまま --------------------------------------- */

test("ずかん詳細 showSpec は捕獲カードでなく specCard のまま", () => {
  const spec = slice("function showSpec(id){", "/* ---------------- PROGRESS");
  assert.ok(spec.includes("UI.specCard({sp:s,size:c.max,shiny:baseShiny,isNew:false,isRecord:false})"),
    "ずかん詳細の specCard が消えた");
  assert.ok(!spec.includes("captureCardHtml("), "ずかん詳細まで捕獲カードになっている");
});

/* ---- 6. ヌシの機構は不可侵 -------------------------------------------------- */

test("catchNushi の本体は改修前と 1 文字も変わらない", () => {
  /* p.nushi の記録と Reward.record 経由の捕獲。ここが動くと でんせつ喪失に直結する。 */
  const FROZEN = "  catchNushi(p, field) {\n"
    + "    const n = NUSHI.find(x => x[3] === field);\n"
    + "    if (!n) return null;\n"
    + "    p.nushi[field] = true;\n"
    + "    return this.record(p, n, n[6], false);\n"
    + "  },";
  assert.ok(src.includes(FROZEN), "catchNushi の本体が書き換わっている");
  assert.ok(src.includes("const res=Reward.catchNushi(P,GFID);"), "endSession の catchNushi 呼び出しが変わった");
});

/* ---- 7. retry 除外の維持 ---------------------------------------------------- */

test("rewardEligible の gate は不変", () => {
  assert.ok(src.includes("const rewardEligible = ok && !item.retry;"));
});

console.log(`RESULT ${passed} passed, 0 failed`);
