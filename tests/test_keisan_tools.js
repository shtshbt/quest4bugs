/* けいさんへの採集道具配線 (shared/tools 系) の固定。見るのは 4 つ:
   index.html が道具系 script と css を正しい順で読むこと、app.js の配線
   (setToolsStore / 装備パネル / 統一捕獲カード) がソースに居ること、道具系
   グローバルへのトップレベル参照が無いこと (komorebi ページでは tools.js が
   keisan/app.js より後に読まれる)、そして vm 上で実際に配線が動くこと。
   node tests/test_keisan_tools.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const indexHtml = fs.readFileSync(path.join(root, "keisan/index.html"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "keisan/app.js"), "utf8");

/* startMark から endMark 直前までのソース断面。関数単位の主張に使う。 */
function sliceBetween(src, startMark, endMark){
  const start = src.indexOf(startMark);
  assert.ok(start >= 0, startMark + " が見つからない");
  const end = src.indexOf(endMark, start);
  assert.ok(end > start, endMark + " が見つからない");
  return src.slice(start, end);
}

/* ---------- index.html ---------- */

test("index.html が道具系 6 script を k5_devs_data と app.js の間に順番どおり読む", () => {
  const srcs = [];
  const re = /<script src="([^"]+)"><\/script>/g;
  let m;
  while((m = re.exec(indexHtml))) srcs.push(m[1]);
  const at = srcs.indexOf("../shared/k5_devs_data.js?v=0.1.0");
  assert.ok(at >= 0, "k5_devs_data.js が見つからない");
  assert.deepEqual(srcs.slice(at + 1, at + 8), [
    "../shared/economy_flag.js?v=0.2.1",
    "../shared/tools.js?v=0.2.2",
    "../shared/tool_icons.js?v=0.2.0",
    "../shared/tool_scenes.js?v=0.2.0",
    "../shared/tools_ui.js?v=0.1.3",
    "../shared/capture_card.js?v=0.1.0",
    "app.js?v=0.4.40"
  ], "道具系 script の並びか版か app.js の版が想定と違う");
});

test("index.html が shared/tools.css を読む", () => {
  assert.match(indexHtml, /<link rel="stylesheet" href="\.\.\/shared\/tools\.css\?v=0\.1\.2">/,
    "tools.css の link が無い (装備パネルと捕獲カードが素の HTML になる)");
});

/* ---------- app.js ソース断面 ---------- */

test("app.js が walletStore を setToolsStore に差す", () => {
  assert.match(appSrc,
    /Q4BReward\.setToolsStore\(Q4B_TOOLS\.walletStore\(QuestSave,window\.Q4B_ECONOMY,pidNow\)\)/,
    "共有 wallet の配線が無い (道具が捕獲に効かない)");
});

test("道具系グローバルへのトップレベル参照が無い", () => {
  /* このファイルのトップレベル文は必ず桁 0 から書かれる。桁 0 の行に道具系
     グローバルが現れたら、komorebi の読み込み順 (tools.js が後) で危うい。 */
  const offenders = [];
  appSrc.split("\n").forEach((line, i) => {
    if(!/^\S/.test(line)) return;
    if(/\b(Q4B_TOOLS|Q4BToolsUI|Q4BCaptureCard|Q4B_ECONOMY)\b/.test(line)){
      offenders.push((i + 1) + ": " + line.trim());
    }
  });
  assert.deepEqual(offenders, [], "トップレベルで道具系グローバルに触れている");
});

test("showKeiCatch (ゲージ捕獲) が統一捕獲カードを使う", () => {
  const fn = sliceBetween(appSrc, "function showKeiCatch(", "function keiCatchDone(");
  assert.match(fn, /Q4BCaptureCard\.html/, "カード本体が統一カードでない");
  assert.match(fn, /Q4BCaptureCard\.attach/, "めくりの配線が無い");
  assert.match(fn, /keiCatchDone\(\)/, "つづける ▶ の続行ボタンが消えた");
});

test("showCapture (合格ガチャ / こはく) が統一捕獲カードを使い legacy 経路も残る", () => {
  const fn = sliceBetween(appSrc, "function showCapture(", "/* ---------- stats ----------");
  assert.match(fn, /Q4BCaptureCard\.html/, "カード本体が統一カードでない");
  assert.match(fn, /Q4BCaptureCard\.attach/, "めくりの配線が無い");
  assert.ok(fn.indexOf("legacy fallback") >= 0, "旧 BUGS 配列の fallback 経路が消えた");
  assert.match(fn, /showZukan\(\)/, "ずかんで みる の導線が消えた");
});

test("ずかん画面が装備パネルを描いて配線する", () => {
  const helper = sliceBetween(appSrc, "function keisanToolPanelSection(", "function keisanEquipTool(");
  assert.match(helper, /Q4BToolsUI\.panelHtml/, "装備パネルが共通部品を通っていない");
  const zukan = sliceBetween(appSrc, "function showZukan(", "function openBugNew(");
  assert.match(zukan, /keisanToolPanelSection\(p\)/, "ずかんにパネルの節が無い");
  assert.match(zukan, /Q4BToolsUI\.bindPanel/, "data-equip の配線が無い");
  assert.match(zukan, /onEquip:keisanEquipTool/, "持ち替えの handler が違う");
});

/* ---------- vm 上の動作 ---------- */

function questSaveMock(){
  const gear = {
    tools: [{ type: "cho_net", remaining: 100 }, { type: "light_trap", remaining: 40 }],
    equippedToolId: null,
    toolDex: {}
  };
  return {
    currentProfile: () => "p1",
    toolGearOf(){ return JSON.parse(JSON.stringify(gear)); },
    toolGearSet(pid, next){
      gear.tools = JSON.parse(JSON.stringify(next.tools || []));
      gear.equippedToolId = next.equippedToolId || null;
      gear.toolDex = JSON.parse(JSON.stringify(next.toolDex || {}));
      return true;
    }
  };
}

function makeContext(extra){
  const context = { console };
  context.window = context;
  Object.assign(context, extra || {});
  vm.createContext(context);
  return context;
}

function load(context, file){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

/* けいさんのページと同じ読み込み順 (道具系は app.js より先)。 */
const KEISAN_TOOL_FILES = [
  "shared/bugs.js", "shared/render.js", "shared/bug_archetypes.js", "shared/reward.js",
  "shared/economy_flag.js", "shared/tools.js", "shared/tool_icons.js", "shared/tool_scenes.js",
  "shared/tools_ui.js", "shared/capture_card.js"
];

const ctx = makeContext({ QuestSave: questSaveMock() });
ctx.Q4B_KOMOREBI_TEST_HOOKS = true;   /* economy の切替 seam (テスト専用) を生やす */
ctx.Q4B_KEISAN_NO_BOOT = true;
for(const file of KEISAN_TOOL_FILES) load(ctx, file);
/* 2026-08-21 に本番の既定が点火 (on) になった。off の挙動検査は出荷既定に依存せず
   自分で閉じてから行う。 */
ctx.Q4B_ECONOMY.setOn(false);

test("NO_BOOT では walletStore を配線せず、明示呼び出しで 1 回だけ配線する", () => {
  const calls = [];
  const realSet = ctx.Q4BReward.setToolsStore;
  ctx.Q4BReward.setToolsStore = function(store){ calls.push(store); return realSet(store); };
  load(ctx, "keisan/app.js");
  assert.equal(calls.length, 0, "NO_BOOT なのに setToolsStore が呼ばれた");
  ctx.wireKeisanToolsStore();
  assert.equal(calls.length, 1, "setToolsStore の呼び出し回数が想定と違う");
  assert.equal(typeof calls[0].equippedTool, "function");
  assert.equal(typeof calls[0].consumeOnCapture, "function");
  /* 経済が閉じている既定では store は「未装備」に倒れる。 */
  assert.equal(calls[0].equippedTool(), null, "経済 off なのに装備が見えている");
});

test("装備パネルは経済 off で空、on でパネルと data-equip が出る", () => {
  assert.equal(ctx.keisanToolPanelSection({ type: "k10" }), "", "経済 off でパネルが出た");
  ctx.Q4B_ECONOMY.setOn(true);
  const html = ctx.keisanToolPanelSection({ type: "k10" });
  assert.match(html, /q4b-tool-panel/, "パネルの器が無い");
  assert.match(html, /data-equip="cho_net"/, "所持している道具の札が無い");
  assert.match(html, /data-equip=""/, "なし の札が無い");
  ctx.Q4B_ECONOMY.setOn(false);
});

test("文字列パイプ: k5 は esc + furi5 ルビ、k10 は esc のみ", () => {
  const t5 = ctx.keisanToolText({ type: "k5" });
  assert.match(t5("虫"), /<ruby>虫<rt>むし<\/rt><\/ruby>/, "k5 でルビが付かない");
  assert.equal(t5("a<b>"), "a&lt;b&gt;", "esc が通っていない");
  const t10 = ctx.keisanToolText({ type: "k10" });
  assert.equal(t10("虫"), "虫", "k10 にルビが付いた");
  assert.equal(ctx.keisanToolAttrText("そうびする どうぐ"), "そうびする どうぐ");
});

test("keisanEquipTool は保存してずかんを再描画し、未所持は拒む", () => {
  ctx.Q4B_ECONOMY.setOn(true);
  let redrawn = 0;
  ctx.showZukan = function(){ redrawn++; };
  ctx.keisanEquipTool("cho_net");
  assert.equal(redrawn, 1, "再描画が走らない");
  assert.equal(ctx.QuestSave.toolGearOf("p1").equippedToolId, "cho_net", "持ち替えが保存されない");
  ctx.keisanEquipTool("sweep_net");   /* 未所持: equip が false で何も変わらない */
  assert.equal(redrawn, 1, "未所持の持ち替えで再描画が走った");
  assert.equal(ctx.QuestSave.toolGearOf("p1").equippedToolId, "cho_net");
  ctx.keisanEquipTool(null);
  assert.equal(ctx.QuestSave.toolGearOf("p1").equippedToolId, null, "なし に戻せない");
  ctx.Q4B_ECONOMY.setOn(false);
});

test("showKeiCatch が統一カードをモーダルに描く", () => {
  const inserted = [];
  ctx.document = { getElementById(){ return null; } };
  ctx.app = {
    insertAdjacentHTML(position, html){ inserted.push(html); },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  };
  const sp = ctx.Q4B_BUGS[0];
  const got = { sp, size: 40, shiny: false, sex: "m", isNew: true, isRecord: false,
    tier: ctx.Q4BReward.tierOf(sp) };
  ctx.showKeiCatch(got);
  assert.equal(inserted.length, 1, "モーダルが 1 枚描かれていない");
  assert.match(inserted[0], /q4b-cap-card/, "統一カードが入っていない");
  assert.match(inserted[0], /keiCatchDone\(\)/, "つづける ▶ が無い");
});

test("道具モジュール不在 (komorebi の読み込み順) でも app.js は落ちない", () => {
  const bare = makeContext({});
  bare.Q4B_KEISAN_NO_BOOT = true;
  load(bare, "keisan/app.js");
  assert.ok(bare.Q4B_KEISAN, "生成器の公開が無い");
  assert.doesNotThrow(() => bare.wireKeisanToolsStore(), "配線関数がガード無しで落ちる");
  assert.equal(bare.keisanToolPanelSection({ type: "k10" }), "", "部品不在でパネルが出た");
});

console.log("RESULT " + passed + " passed, 0 failed");
