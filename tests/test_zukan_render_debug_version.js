"use strict";

/* test_zukan.html (図鑑 renderer のデバッグ用ページ) の shared/bugs.js ?v= が
   実ゲームのエントリポイントから 2 版遅れて (0.4.13) 固定されていた。デバッグページ
   だけ古い bugs.js を読み続けると、種データの変更をこのページで確かめたつもりが
   実際には確かめられていない、という取りこぼしが起きる。実ゲーム側の ?v= (全ページ
   一致しているはず) に test_zukan.html を揃え、今後また drift したら落ちるように
   固定する。node tests/test_zukan_render_debug_version.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* shared/bugs.js を読み込む実ゲームのエントリポイント (test_zukan.html を除く)。 */
const GAME_ENTRY_POINTS = ["index.html", "battle.html", "eitango/index.html", "kanji/index.html",
  "keisan/index.html", "komorebi/index.html"];

function bugsVersionOf(htmlPath){
  const html = fs.readFileSync(path.join(root, htmlPath), "utf8");
  const m = /shared\/bugs\.js\?v=([^"]+)"/.exec(html);
  assert.ok(m, htmlPath + " に shared/bugs.js の script タグが見当たらない");
  return m[1];
}

test("shared/bugs.js?v= is the same version across every real game entry point", () => {
  const versions = GAME_ENTRY_POINTS.map(bugsVersionOf);
  const distinct = Array.from(new Set(versions));
  assert.equal(distinct.length, 1, "実ゲームのエントリポイント間で bugs.js の版が割れている: "
    + GAME_ENTRY_POINTS.map((entry, i) => entry + "=" + versions[i]).join(", "));
});

test("test_zukan.html's shared/bugs.js?v= is not left behind the real game entry points", () => {
  const live = bugsVersionOf(GAME_ENTRY_POINTS[0]);
  const debugVersion = bugsVersionOf("test_zukan.html");
  assert.equal(debugVersion, live, "test_zukan.html の bugs.js?v= が実ゲームより古いまま (drift)");
});

console.log(`RESULT ${passed} passed, 0 failed`);
