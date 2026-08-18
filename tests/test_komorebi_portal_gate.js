/* 御神木パネル (portal) のうろ入口の配線。portal は komorebi/app.js を読み込まないので、
   公開スイッチだけを持つ komorebi/economy_flag.js を挟んで判定を配る
   (tools_implementation_plan 検収指摘 3)。
   ここで見るのは 3 つ: スイッチ off で入口が 1 文字も出ないこと、更新番号が
   道具の公開番号に届くまで開かないこと、そして portal が実際にそのフラグを
   読み込んでいること。
   node tests/test_komorebi_portal_gate.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* portal の文脈を模す: economy_flag.js と breeding.js だけで、tools.js も app.js も無い。 */
function portalContext(){
  const context = { console };
  context.window = context;
  context.global = context;
  context.Q4B_KOMOREBI_TEST_HOOKS = true;
  vm.createContext(context);
  for(const file of ["komorebi/economy_flag.js", "shared/breeding.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

const portal = portalContext();
const economy = portal.Q4B_KOMOREBI_ECONOMY;
const panel = opts => portal.Q4BBreeding.homeBreedingPanelHTML(opts);
const played = () => panel({ eggs: [], pendingEggs: [], komorebiPlayed: true });

/* 道具の一覧を持つ文脈 (小道のページ) も 1 つ作り、控えの番号との一致を見る。 */
const withTools = { console };
withTools.window = withTools;
vm.createContext(withTools);
vm.runInContext(fs.readFileSync(path.join(root, "komorebi/tools.js"), "utf8"), withTools);
const tools = withTools.Q4B_KOMOREBI_TOOLS;

test("the fallback release number matches the earliest tool in tools.js", () => {
  /* portal は tools.js を読み込まないので、economy_flag が控えの番号で判定する。
     ずれると御神木の入口だけが道具より早く出る。 */
  const earliest = Math.min.apply(null, tools.list().map(tool => tool.release));
  assert.equal(economy.toolsFirstRelease, earliest,
    "economy_flag の控えが tools.js の最小 release とずれている");
});

test("with the economy switch off the hollow entrance is nowhere in the panel", () => {
  economy.setOn(false);
  assert.equal(economy.on(), false);
  assert.equal(economy.toolsReleased(), false);
  const html = played();
  assert.doesNotMatch(html, /q4b-uro-entrance/, "スイッチ off で入口の器が出ている");
  assert.doesNotMatch(html, /かがやきのうろ/, "スイッチ off で うろの名前が出ている");
  assert.doesNotMatch(html, /komorebi\/index\.html\?uro=1/, "スイッチ off で うろへの導線がある");
  /* 小道段そのものは経済とは無関係に出る。off で消えるのは うろだけ。 */
  assert.match(html, /こもれびで そだてている むし/);
});

test("the switch alone is not enough: the update must reach the tools", () => {
  economy.setOn(true);
  economy.setCurrentRelease(economy.toolsFirstRelease - 1);
  assert.equal(economy.toolsReleased(), false);
  assert.doesNotMatch(played(), /q4b-uro-entrance/, "道具の更新前に入口が出ている");
});

test("once both gates open the entrance points at the hollow", () => {
  economy.setOn(true);
  economy.setCurrentRelease(economy.toolsFirstRelease);
  assert.equal(economy.toolsReleased(), true);
  const html = played();
  assert.match(html, /q4b-uro-entrance/);
  assert.match(html, /かがやきのうろ/);
  /* portal からの相対 path。地図を 1 枚はさまずに うろへ着地させる。 */
  assert.match(html, /href="\.\/komorebi\/index\.html\?uro=1"/);
});

test("the portal loads the flag module and still never loads the path app", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /<script src="\.\/komorebi\/economy_flag\.js\?v=[^"]+"><\/script>/,
    "portal が公開スイッチを読み込んでいない");
  assert.doesNotMatch(html, /<script src="\.\/komorebi\/app\.js/,
    "portal が小道の app.js を読み込んでいる (軽量配線の前提が崩れる)");
  /* 小道のページ側も同じ 1 本を読む。2 つの数の実体は 1 か所きり。 */
  const komorebi = fs.readFileSync(path.join(root, "komorebi/index.html"), "utf8");
  assert.match(komorebi, /<script src="economy_flag\.js\?v=[^"]+"><\/script>/);
  /* app.js は自前の定数を持たない (持つと点火の 1 行が 2 か所になる)。 */
  const app = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8");
  assert.doesNotMatch(app, /var\s+CURRENT_RELEASE\s*=/);
  assert.doesNotMatch(app, /var\s+MEDAL_ECONOMY_ON\s*=/);
});

test("the switch seams do not exist outside a test harness", () => {
  const plain = { console };
  plain.window = plain;
  vm.createContext(plain);
  vm.runInContext(fs.readFileSync(path.join(root, "komorebi/economy_flag.js"), "utf8"), plain);
  assert.equal(typeof plain.Q4B_KOMOREBI_ECONOMY.setOn, "undefined",
    "配信された画面の console 1 行でメダル経済が開いてしまう");
  assert.equal(typeof plain.Q4B_KOMOREBI_ECONOMY.setCurrentRelease, "undefined");
});

console.log(`RESULT ${passed} passed, 0 failed`);
