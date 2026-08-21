/* 採集道具のアイコン 11 種 (tools_design 9 章)。交換画面・どうぐばこ・道具図鑑・
   ほうのうの記録が同じ 1 本を使っていること、道具の一覧と 1 対 1 であること、
   そして外部を読みに行かないことを見る (配信は静的ファイルだけで完結する)。
   node tests/test_komorebi_tool_icons.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const context = { console };
context.window = context;
vm.createContext(context);
for(const file of ["shared/tool_icons.js", "shared/tools.js", "komorebi/uro.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const icons = context.Q4B_TOOL_ICONS;
const tools = context.Q4B_TOOLS;
const uro = context.Q4B_KOMOREBI_URO;
const text = t => t;

test("there is exactly one icon per tool, and no icon without a tool", () => {
  const toolIds = tools.list().map(tool => tool.id).sort();
  assert.equal(toolIds.length, 11, "道具が 11 種でない");
  assert.equal(icons.ids.slice().sort().join(","), toolIds.join(","), "アイコンと道具が 1 対 1 でない");
  toolIds.forEach(id => assert.equal(icons.has(id), true, id + " のアイコンが無い"));
  assert.equal(icons.svg("no_such_tool"), "", "知らない道具に絵が出た");
});

test("every icon is a self-contained two-tone line drawing", () => {
  icons.ids.forEach(id => {
    const svg = icons.svg(id);
    assert.match(svg, /^<svg class="tool-icon" viewBox="0 0 24 24"/, id + " の器が揃っていない");
    assert.match(svg, /stroke="currentColor"/, id + " が文字色に馴染まない");
    assert.match(svg, /fill="none"/, id + " が塗りで描かれている");
    assert.match(svg, /tool-icon-accent/, id + " に 2 色目が無い");
    assert.match(svg, /<\/svg>$/, id + " が閉じていない");
    /* 配信は静的ファイルだけで完結する。外部参照も画像埋め込みも持たせない。 */
    assert.doesNotMatch(svg, /<image|xlink:href|href=|url\(|http/, id + " が外を読みに行っている");
    assert.doesNotMatch(svg, /<script|on[a-z]+=/, id + " に実行されるものが混ざっている");
  });
});

test("an icon is decoration unless it is given a name to read", () => {
  assert.match(icons.svg("cho_net"), /aria-hidden="true"/);
  const named = icons.svg("cho_net", { label: "ちょうネット" });
  assert.match(named, /role="img" aria-label="ちょうネット"/);
  assert.doesNotMatch(named, /aria-hidden/);
  assert.match(icons.svg("cho_net", { className: "uro-face" }), /class="tool-icon uro-face"/);
});

test("the exchange popup, the tool box, the dex and the log share the one icon", () => {
  const tool = tools.byId("cho_net");
  const exchange = uro.exchangeHtml({ text, medalName: "テストのメダル",
    tools: [{ id: tool.id, name: tool.name, emoji: tool.emoji, guild: tool.guild, blurb: tool.blurb, targets: 3 }] });
  assert.match(exchange, /class="tool-icon"/, "交換画面が絵文字のまま");

  const page = uro.pageHtml({ text, glow: uro.glow({ uroLog: [] }), pending: [], durability: 100,
    equippedToolId: "cho_net",
    owned: [{ type: "cho_net", remaining: 12, first: true, name: tool.name, emoji: tool.emoji }],
    dex: [{ id: "cho_net", name: tool.name, emoji: tool.emoji, at: "2026-08-17" }, { locked: true }],
    entries: [{ cat: "kom_ratio", lap: 1, date: "2026-08-17", name: "メダル", catName: "割合と比",
      toolId: "cho_net", toolName: tool.name, toolEmoji: tool.emoji }] });
  assert.equal((page.match(/class="tool-icon"/g) || []).length, 3,
    "どうぐばこ・図鑑・記録のどれかが共用のアイコンを使っていない");
  /* 未公開の枠だけは絵を出さず 🔒 のまま。 */
  assert.match(page, /uro-dex-slot is-locked/);
});

test("without the icon module the surfaces fall back to the emoji", () => {
  /* アイコンを読み込んでいない文脈 (単体テストなど) でも顔が消えない。 */
  const bare = { console };
  bare.window = bare;
  vm.createContext(bare);
  vm.runInContext(fs.readFileSync(path.join(root, "komorebi/uro.js"), "utf8"), bare);
  const html = bare.Q4B_KOMOREBI_URO.pageHtml({ text, glow: { count: 0, value: 0 }, pending: [],
    durability: 100, equippedToolId: null, entries: [],
    owned: [{ type: "cho_net", remaining: 12, first: true, name: "ちょうネット", emoji: "🥅" }] });
  assert.doesNotMatch(html, /tool-icon/);
  assert.match(html, /🥅/, "絵文字の控えまで消えた");
});

/* 道具は全図鑑共通になったので、絵は shared/ に住む (2026-08-20)。 */
test("the icon module is delivered and cached like the rest of the path", () => {
  const page = fs.readFileSync(path.join(root, "komorebi/index.html"), "utf8");
  assert.match(page, /<script src="\.\.\/shared\/tool_icons\.js\?v=[^"]+"><\/script>/,
    "小道のページがアイコンを読み込んでいない");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(sw, /"\.\/shared\/tool_icons\.js"/, "アイコンが precache に無い");
});

console.log(`RESULT ${passed} passed, 0 failed`);
