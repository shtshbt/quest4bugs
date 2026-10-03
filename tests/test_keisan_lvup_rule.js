/* けいさんの昇格基準の固定。木漏れ日の小道 (komorebi/app.js applyPerformance) と
   同じ「10 問ごとに判定、8 問以上で昇格 / 5-7 で維持 / 4 以下で降格」に揃えてある。
   見るのは 5 か所: 適応 Lv の判定 (ひっさん含む)、レベル選択練習、九九チャレンジ、
   ミッション側の九九の段、木漏れ日の基準そのもの。
   node tests/test_keisan_lvup_rule.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const appSrc = fs.readFileSync(path.join(root, "keisan/app.js"), "utf8");
const komSrc = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8");

/* startMark から endMark 直前までのソース断面。関数単位の主張に使う。 */
function sliceBetween(src, startMark, endMark){
  const start = src.indexOf(startMark);
  assert.ok(start >= 0, startMark + " が見つからない");
  const end = src.indexOf(endMark, start);
  assert.ok(end > start, endMark + " が見つからない");
  return src.slice(start, end);
}

test("木漏れ日の基準は 10 問ブロックで 8 以上昇格 / 4 以下降格", () => {
  assert.match(komSrc, /adapt\.n%10===0/);
  assert.match(komSrc, /ok10>=8&&/);
  assert.match(komSrc, /ok10<=4&&/);
});

test("適応 Lv はひっさんも含めて 10 問中 8 以上で昇格 / 4 以下で降格", () => {
  const body = sliceBetween(appSrc, "function afterJudge(", "/* 正解時に採集エンジンを進める");
  assert.match(body, /if\(LVL_CATS\[q\.cat\] && q\.cat!=="kuku" && _lvUpdateAllowed\)/,
    "ひっさん / ひき算ひっさんが共通判定から外れている");
  assert.match(body, /aBuf\.n%10===0/);
  assert.match(body, /ok10>=8 && p\.lv\[q\.cat\]<10/);
  assert.match(body, /ok10<=4 && p\.lv\[q\.cat\]>1/);
  assert.doesNotMatch(body, /hsRun|hkRun/, "旧 5 連続正解ルールが残っている");
  assert.match(body, /syncLegacyFromLv\(p\)/, "ひっさんの旧 Lv 同期が抜けている");
});

test("ひっさんのレベル選択練習は 10 問組んで 8 問で次の Lv", () => {
  const build = sliceBetween(appSrc, "function buildPractice(", "function startPractice(");
  assert.match(build, /var n=\(lv&&\(cat==="hissan"\|\|cat==="hikizan"\)\)\?10:5/);
  const finish = sliceBetween(appSrc, "if(Q.mode===\"practice\"&&Q.lv&&", "updateProgressSummary(p);");
  assert.match(finish, /var cleared=\(Q\.ok>=8\)/);
  assert.doesNotMatch(appSrc, /5問中4問/, "旧 4/5 の案内文が残っている");
});

test("九九チャレンジは 10 問で 8 問合格", () => {
  const body = sliceBetween(appSrc, "function kukuChallenge(", "nextQ();");
  assert.match(body, /shuffle\(\[1,2,3,4,5,6,7,8,9,1\+Math\.floor\(Math\.random\(\)\*9\)\]\)/,
    "チャレンジが 10 問になっていない");
  assert.match(appSrc, /if\(Q\.mode==="kuku"\)\{\n    var pass=\(Q\.ok>=8\)/);
  assert.doesNotMatch(appSrc, /9問中8問|9問チャレンジ/, "旧 9 問の案内文が残っている");
});

test("ミッション側の九九は目標の段の 10 問ブロックで 8 問以上なら次の段", () => {
  const body = sliceBetween(appSrc, "if(q.cat===\"kuku\"&&p.type===\"k5\"&&_lvUpdateAllowed", "/* 正解時に採集エンジンを進める");
  assert.match(body, /p\.kukuBlk\.push\(ok\?1:0\)/, "ミスがブロックに数えられていない");
  assert.match(body, /var kukuPass=\(p\.kukuBlk\.length>=10 && p\.kukuHits>=8\)/);
  assert.match(body, /if\(p\.kukuBlk\.length>=10\)\{ p\.kukuBlk=\[\]; p\.kukuHits=0; \}/,
    "ブロックが 10 問で区切られていない");
});

console.log(passed + " passed");
