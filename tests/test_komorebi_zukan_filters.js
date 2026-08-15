/* ずかんの 6 条件トグル (おきにいり / いろちがい / かえした / ×2 / たまご / ♂♀) と
   イラスト/しゃしん切替の設置 (impl_live_feedback_b 1・2)。判定は zukanMatches を
   関数単位で、設置と「切替後もフィルタ保持」は fake DOM の画面遷移で固定する。
   node tests/test_komorebi_zukan_filters.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* ---- 判定ユニット (DOM なし) ---- */

const unit = { console, setTimeout, clearTimeout };
unit.window = unit;
unit.Q4B_KEISAN_NO_BOOT = true;
unit.Q4B_KOMOREBI_NO_BOOT = true;
vm.createContext(unit);
for(const file of ["shared/bugs.js", "shared/reward.js", "keisan/app.js", "komorebi/volumes/volume_fixture.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), unit);
}

const komorebi = unit.Q4B_KOMOREBI;
const state = komorebi.zukanFilterState();
function resetFilter(){
  Object.assign(state, { rarity: "", group: "", caughtOnly: false, query: "", expedition: "", region: "",
    fav: false, shiny: false, reared: false, plural: false, egg: false, pair: false });
}
const spFav = { id: "sp_fav" };
const spOther = { id: "sp_other" };
/* records.length===n は validateCatches の要件。判定単体でも同じ形で持たせる。 */
const coll = { favorites: { sp_fav: true }, catches: {
  sp_fav: { n: 2, max: 12, min: 10, shiny: 0, normal: 1,
    records: [{ d: "", s: 10, sex: "m", shiny: false, reared: true }, { d: "", s: 12, sex: "f", shiny: false }] },
  sp_other: { n: 1, max: 9, min: 9, shiny: 1, normal: 0,
    records: [{ d: "", s: 9, sex: "m", shiny: true }] }
} };
const recFav = coll.catches.sp_fav;
const recOther = coll.catches.sp_other;

test("all six toggles default to off and pass caught and uncaught alike", () => {
  resetFilter();
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), true);
  assert.equal(komorebi.zukanMatches(spOther, undefined, coll), true);
});

test("the favorite toggle keeps only species in coll.favorites", () => {
  resetFilter();
  state.fav = true;
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), true);
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), false);
  /* 採集記録なし (demo 等) では全員 false に落ちるだけで、例外は出さない。 */
  assert.equal(komorebi.zukanMatches(spFav, recFav, undefined), false);
});

test("the shiny toggle reads the record's shiny flag", () => {
  resetFilter();
  state.shiny = true;
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), true);
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), false);
  assert.equal(komorebi.zukanMatches(spFav, undefined, coll), false);
});

test("the reared toggle requires a reared:true record", () => {
  resetFilter();
  state.reared = true;
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), true);
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), false);
});

test("the plural toggle requires two or more catches", () => {
  resetFilter();
  state.plural = true;
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), true);
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), false);
  assert.equal(komorebi.zukanMatches(spOther, undefined, coll), false);
});

test("the egg toggle counts incubating plus pending eggs for the species", () => {
  resetFilter();
  unit.Q4BReward.setEggStore({
    get: () => ({ eggs: [{ id: "sp_fav" }], pendingEggs: [], stats: { totalAbandoned: 0 } }),
    save: () => true
  });
  state.egg = true;
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), true);
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), false);
});

test("the pair toggle requires both sexes among the records", () => {
  resetFilter();
  state.pair = true;
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), true);
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), false);
});

test("toggles combine as AND like the main game's zukanMatchK", () => {
  resetFilter();
  state.fav = true;
  state.shiny = true;
  /* sp_fav はおきにいりだが色違いなし、sp_other は逆。両立する種はいない。 */
  assert.equal(komorebi.zukanMatches(spFav, recFav, coll), false);
  assert.equal(komorebi.zukanMatches(spOther, recOther, coll), false);
  resetFilter();
});

/* ---- 画面 smoke (fake DOM) ---- */

const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const FLAG_LABELS = ["♥ おきにいり", "✨ いろちがい", "🐣 かえした", "×2 いじょう", "🥚 たまごあり", "♂♀ そろい"];
const FLAG_KEYS = ["fav", "shiny", "reared", "plural", "egg", "pair"];

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const flagChip = key => app.querySelectorAll('[data-filter="flag"]').filter(b => b.attrs["data-value"] === key)[0];

  /* 共有トグル API は zukan_render.js が生やす。ここでは設置の呼び出しだけを見る。 */
  const toggleCalls = [];
  context.Q4BRender.setZukanModeToggleVisible = (active, host) => { toggleCalls.push({ active, host }); };
  const sessionCalls = [];
  context.Q4BRender.setSessionActive = active => { sessionCalls.push(active); };

  const profile = context.Q4B_KOMOREBI.profile();
  profile.collection.catches.oo_beni_hagoromo = { n: 2, max: 12, min: 10, shiny: 0, normal: 1,
    records: [{ d: "", s: 10, sex: "m", shiny: false }, { d: "", s: 12, sex: "f", shiny: false }] };
  profile.collection.catches.akamarubane_monki_tateha = { n: 1, max: 9, min: 9, shiny: 1, normal: 0,
    records: [{ d: "", s: 9, sex: "m", shiny: true }] };
  profile.collection.totalCatches = 3;

  app.querySelector('[data-action="zukan"]').click();

  test("the region zukan draws all six condition chips with the main game's wording", () => {
    assert.match(plain(), /マダガスカルの ずかん/);
    for(const label of FLAG_LABELS) assert.ok(plain().indexOf(label) >= 0, "missing chip label: " + label);
    for(const key of FLAG_KEYS) assert.ok(flagChip(key), "missing chip element: " + key);
  });

  test("the mode toggle mounts on the region zukan with a rerender hook", () => {
    const last = toggleCalls[toggleCalls.length - 1];
    assert.ok(last, "setZukanModeToggleVisible was never called");
    assert.equal(last.active, true);
    assert.ok(last.host, "no host element handed to the toggle");
    assert.equal(typeof last.host._q4bRerender, "function");
  });

  test("the plural chip narrows the grid and renders as on", () => {
    flagChip("plural").click();
    assert.match(plain(), /ひょうじ中 1種/);
    assert.ok((flagChip("plural").attrs.class || "").indexOf("is-on") >= 0, "plural chip lost its on state");
    assert.ok(app.innerHTML.indexOf('data-species-id="oo_beni_hagoromo"') >= 0);
    assert.equal(app.innerHTML.indexOf('data-species-id="akamarubane_monki_tateha"'), -1);
  });

  test("the mode toggle rerender keeps the active filter", () => {
    const host = toggleCalls[toggleCalls.length - 1].host;
    host._q4bRerender();
    assert.equal(context.Q4B_KOMOREBI.zukanFilterState().plural, true);
    assert.match(plain(), /ひょうじ中 1種/);
    assert.ok((flagChip("plural").attrs.class || "").indexOf("is-on") >= 0, "filter state was lost across the rerender");
    flagChip("plural").click();
  });

  test("leaving the zukan hides the mode toggle", () => {
    app.querySelector('[data-action="back"]').click();
    assert.equal(toggleCalls[toggleCalls.length - 1].active, false);
  });

  test("the common zukan draws the same six chips and mounts the toggle", () => {
    app.querySelector('[data-action="path-zukan"]').click();
    assert.match(plain(), /こもれびの ずかん/);
    for(const key of FLAG_KEYS) assert.ok(flagChip(key), "missing chip element: " + key);
    const last = toggleCalls[toggleCalls.length - 1];
    assert.equal(last.active, true);
    assert.equal(typeof last.host._q4bRerender, "function");
    app.querySelector('[data-action="back"]').click();
  });

  await (async () => {
    const buttons = app.querySelectorAll("[data-cat]").filter(b => b.attrs["data-cat"] === "kom_ratio");
    buttons[buttons.length - 1].click();
    await settle();
    test("a question session flips the shared session flag on, and the map flips it off", () => {
      assert.ok(sessionCalls.indexOf(true) >= 0, "beginSession never marked the session active");
      app.querySelector('[data-action="back-map"]').click();
      assert.equal(sessionCalls[sessionCalls.length - 1], false);
    });
  })();

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
