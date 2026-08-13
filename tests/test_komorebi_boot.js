/* 木漏れ日の小道の起動 smoke テスト。
   ロジックのテストは通るのに画面が「よみこめませんでした」になる配線ミス
   (Promise の解決値が renderMap の第 1 引数へ流れ込む等) を捕まえる。
   本物の DOM は使わず、innerHTML を受け取るだけの最小の器で描画まで走らせる。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;

function fakeElement(tag) {
  const element = {
    tagName: tag, innerHTML: "", style: {}, children: [], listeners: {},
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, getAttribute() { return null; },
    appendChild(child) { element.children.push(child); return child; },
    addEventListener(type, fn) { (element.listeners[type] = element.listeners[type] || []).push(fn); },
    querySelector() { return fakeElement("div"); },
    querySelectorAll() { return []; }
  };
  return element;
}

function bootContext(mapPayload, ratioPool) {
  const app = fakeElement("div");
  const saved = {};
  const context = {
    console, setTimeout, clearTimeout,
    location: { href: "" },
    document: {
      getElementById(id) { return id === "app" ? app : null; },
      querySelector() { return fakeElement("div"); },
      querySelectorAll() { return []; },
      createElement: fakeElement,
      addEventListener() {},
      body: fakeElement("body")
    },
    fetch(url) {
      const payload = url.indexOf("world_paths.json") >= 0 ? mapPayload :
        url.indexOf("ratio_pool.json") >= 0 ? ratioPool : null;
      assert.ok(payload, "a known runtime payload is fetched: " + url);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    },
    QuestSave: {
      currentProfile: () => "p1",
      load(game) { return Promise.resolve(game === "keisan" ? { type: "k10" } : saved[game] || null); },
      save(game, id, state) { saved[game] = state; return Promise.resolve(true); },
      syncDown: () => Promise.resolve()
    },
    __app: app
  };
  context.window = context;
  context.global = context;
  vm.createContext(context);
  for (const file of ["shared/bugs.js", "shared/render.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js", "komorebi/ratio_generator.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

const mapPayload = JSON.parse(
  fs.readFileSync(path.join(root, "komorebi/assets/world_paths.json"), "utf8"));
const ratioPool = JSON.parse(
  fs.readFileSync(path.join(root, "komorebi/assets/ratio_pool.json"), "utf8"));

/* 描画は Promise 連鎖の先なので、同期 test の外で確かめる。 */
(async () => {
  const context = bootContext(mapPayload, ratioPool);
  vm.runInContext(fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8"), context);
  await new Promise((resolve) => setTimeout(resolve, 60));
  const html = context.__app.innerHTML;

  assert.ok(html.length > 0, "the screen rendered something");
  assert.ok(html.indexOf("よみこめませんでした") < 0 && html.indexOf("エラー") < 0,
    "the boot chain did not fall into the error screen: " + html.slice(0, 160));
  passed++; console.log("PASS boot renders the path screen, not the error screen");

  assert.ok(html.indexOf("木漏れ日の小道") >= 0, "the area title is shown in kanji");
  passed++; console.log("PASS the kanji area title is present");

  assert.ok(html.indexOf("map-leader") >= 0, "the leader line joins the map to the list");
  assert.ok(html.indexOf("path-choices") >= 0, "the category list is on the same screen");
  passed++; console.log("PASS map, leader and category list share one screen");

  assert.ok(html.indexOf('data-cat="kom_ratio"') >= 0, "the ratio path is enabled");
  assert.ok(html.indexOf("割合と比") >= 0, "the ratio category is visible");
  passed++; console.log("PASS the ratio path is wired for play");

  /* 捕獲カードの絵は render.js 依存。読み込みが抜けると SVG が空文字になり、
     ロジックのテストは通ったまま画面だけ絵なしになる。 */
  const page = fs.readFileSync(path.join(root, "komorebi/index.html"), "utf8");
  assert.ok(page.indexOf("shared/render.js") >= 0, "the komorebi page loads the species renderer");
  const rendered = context.Q4BReward.svg(context.Q4BReward.spById("oo_onaga_yamamayu"), false);
  assert.ok(rendered.length > 100, "a komorebi species renders to a real SVG, not an empty string");
  passed++; console.log("PASS komorebi species render to real SVG through the shared renderer");

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch((error) => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
