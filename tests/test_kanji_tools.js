/* かんじページの採集道具配線。かんじ本体は 1 枚の巨大インライン script なので
   vm では起動せず、ソース断面で配線の形だけを固定する。見るのは 4 点:
   共有 script の読み込み順、共有ウォレット (setToolsStore) の接続、むしかごの
   装備パネル、捕獲カードの共通化。あわせて「変えない」と決めた 2 点 (finishTest
   のまとめグリッドと rewardEligible の式) が動いていないことも見る。
   node tests/test_kanji_tools.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "kanji/index.html"), "utf8");

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS", name); }

/* function 宣言から次の function 宣言までのソース断面。 */
function sliceOf(startMark, endMark) {
  const start = source.indexOf(startMark);
  assert.ok(start >= 0, startMark + " が見つからない");
  const end = source.indexOf(endMark, start);
  assert.ok(end > start, endMark + " が " + startMark + " の後に見つからない");
  return source.slice(start, end);
}

test("the shared tool scripts load in order, after yomi.js and before the inline script", () => {
  /* 版は test_script_versions.js が全ページ横断で見るが、順序はここで固定する。
     economy_flag → tools → icons → scenes → tools_ui → capture_card の順。
     UI 部品は tools.js に乗るので、この順が崩れると読み込み時に落ちる。 */
  const expected = [
    '<script src="../shared/yomi.js?v=0.3.0"></script>',
    '<script src="../shared/economy_flag.js?v=0.2.1"></script>',
    '<script src="../shared/tools.js?v=0.2.1"></script>',
    '<script src="../shared/tool_icons.js?v=0.2.0"></script>',
    '<script src="../shared/tool_scenes.js?v=0.2.0"></script>',
    '<script src="../shared/tools_ui.js?v=0.1.0"></script>',
    '<script src="../shared/capture_card.js?v=0.1.0"></script>'
  ];
  let cursor = -1;
  for (const tag of expected) {
    const at = source.indexOf(tag);
    assert.ok(at >= 0, tag + " が無い");
    assert.ok(at > cursor, tag + " の順序が違う");
    cursor = at;
  }
  const inlineStart = source.indexOf("<script>", cursor);
  assert.ok(inlineStart > cursor, "共有 script はインライン script より前に読む");
});

test("tools.css is linked next to the existing stylesheet", () => {
  assert.match(source, /<link rel="stylesheet" href="\.\.\/shared\/tools\.css\?v=0\.1\.0">/);
});

test("the shared tool wallet is wired into the reward draw, with the amber pid getter", () => {
  /* setAmberStore と同じ kPidNow を渡す。pid が割れると道具とこはくで別人になる。 */
  assert.match(source,
    /Q4BReward\.setToolsStore\(Q4B_TOOLS\.walletStore\(QuestSave,window\.Q4B_ECONOMY,kPidNow\)\)/);
  const amberAt = source.indexOf("Q4BReward.setAmberStore({");
  const toolsAt = source.indexOf("Q4BReward.setToolsStore(");
  assert.ok(amberAt >= 0 && toolsAt > amberAt, "setToolsStore は setAmberStore の隣に置く");
});

test("renderBugs shows the shared equip panel and rebinds it on redraw", () => {
  const fn = sliceOf("function renderBugs(){", "function _renderBugsFallback(");
  assert.match(fn, /Q4BToolsUI\.panelHtml\(\{gear:QuestSave\.toolGearOf\(kPidNow\(\)\),economy:window\.Q4B_ECONOMY\}\)/);
  /* パネルはこはく行の直後・むしずかんフィルタの前 (独立カード)。 */
  const amberRow = fn.indexOf("こはくで よぶ");
  const panelAt = fn.indexOf("+toolPanel");
  const filterAt = fn.indexOf("むしずかん");
  assert.ok(amberRow >= 0 && panelAt > amberRow && filterAt > panelAt,
    "装備パネルは こはく行の後・フィルタの前");
  /* 持ち替えは equip → toolGearSet 保存 → renderBugs 再描画の一本道。 */
  assert.match(fn, /Q4BToolsUI\.bindPanel\(/);
  assert.match(fn, /Q4B_TOOLS\.equip\(gear,type\)/);
  assert.match(fn, /QuestSave\.toolGearSet\(pid,gear\)/);
});

test("showCatchModal renders the shared capture card inside the existing modal frame", () => {
  const fn = sliceOf("function showCatchModal(got){", "function answerInfo(");
  assert.match(fn, /Q4BCaptureCard\.html\(got,\{headline:'むしを つかまえた！'\}\)/);
  assert.match(fn, /Q4BCaptureCard\.attach\(\$\('modalIn'\)\)/);
  /* 外枠は既存のまま: modal() で開き、やった！で閉じる。 */
  assert.match(fn, /modal\(h\)/);
  assert.match(fn, /onclick="closeModal\(\)">やった！<\/button>/);
  /* 旧カードの手書きバッジは残さない (二重表示防止)。 */
  assert.doesNotMatch(fn, /じこベスト！<\/span>/);
});

test("the finishTest summary grid is untouched (a roll call, not a capture card)", () => {
  const fn = sliceOf("function finishTest(){", "function startReview(){");
  assert.match(fn, /<div class="bugs" style="margin:8px 0">/);
  assert.match(fn, /gainedCatches\.forEach\(function\(got\)\{/);
  assert.doesNotMatch(fn, /Q4BCaptureCard/);
});

test("the rewardEligible expression is unchanged (tools only apply inside onCorrect)", () => {
  assert.match(source, /var rewardEligible = ok && !p\.rq && SES\.mode !== 'test';/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
