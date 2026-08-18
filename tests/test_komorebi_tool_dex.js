/* 道具図鑑 (tools_design 6 章)。初めて授かった日だけを残す台帳で、11 種すべてを
   一度は授かる、という第二の完成目標。いま何本あるか (どうぐばこ) とは別で、
   壊れて手元から消えても図鑑からは消えない。
   node tests/test_komorebi_tool_dex.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/* ---- 台帳そのもの (DOM なし) ---- */

const unit = { console };
unit.window = unit;
vm.createContext(unit);
vm.runInContext(fs.readFileSync(path.join(root, "komorebi/tools.js"), "utf8"), unit);
const tools = unit.Q4B_KOMOREBI_TOOLS;

test("the first grant of a kind is dated, later ones change nothing", () => {
  const profile = { tools: [] };
  assert.equal(tools.firstGrantAt(profile, "cho_net"), null);
  tools.grant(profile, "cho_net", "2026-08-17");
  assert.equal(tools.firstGrantAt(profile, "cho_net"), "2026-08-17");
  tools.grant(profile, "cho_net", "2026-09-01");
  assert.equal(tools.firstGrantAt(profile, "cho_net"), "2026-08-17", "初回の日付が書き換わった");
  assert.equal(Object.keys(profile.toolDex).length, 1);
});

test("a grant without a date leaves the dex alone", () => {
  /* 日付を持たない授与 (テストの下ごしらえ) で台帳が埋まると、初回授与の記録が
     実際の授与日とずれる。 */
  const profile = { tools: [] };
  tools.grant(profile, "cho_net");
  assert.equal(tools.firstGrantAt(profile, "cho_net"), null);
  assert.equal(profile.tools.length, 1, "道具そのものは授かっている");
});

test("breaking the last tool of a kind never erases its dex entry", () => {
  const profile = { tools: [] };
  tools.grant(profile, "cho_net", "2026-08-17");
  profile.tools[0].remaining = 1;
  const use = tools.consume(profile);
  assert.equal(use.broke, true);
  assert.equal(profile.tools.length, 0, "壊れた 1 本が残っている");
  assert.equal(tools.firstGrantAt(profile, "cho_net"), "2026-08-17", "図鑑から消えた");
});

test("a broken dex is refused instead of repaired", () => {
  assert.ok(tools.validateDex({}), "無い状態は正しい (additive の既定)");
  assert.ok(tools.validateDex({ toolDex: { cho_net: "2026-08-17" } }));
  [{ toolDex: { ghost_net: "2026-08-17" } }, { toolDex: { cho_net: 20260817 } },
    { toolDex: { cho_net: "" } }, { toolDex: [] }].forEach(broken => {
    assert.throws(() => tools.validateDex(broken), /道具図鑑/, JSON.stringify(broken));
  });
});

/* ---- 画面と保存 (fake DOM) ---- */

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const komorebi = context.Q4B_KOMOREBI;
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  const live = context.Q4B_KOMOREBI_TOOLS;
  const profile = komorebi.profile();
  const alerts = [];
  context.alert = message => alerts.push(String(message));

  const overlays = [];
  const createElement = context.document.createElement;
  context.document.createElement = function(){
    const element = createElement();
    overlays.push(element);
    return element;
  };
  const lastOverlay = () => overlays[overlays.length - 1];
  /* 地図を描き直す。メダルの棚へ入って戻るだけで、地図が今の状態で組み直される。 */
  function backToMap(){
    const back = app.querySelector('[data-action="back"]');
    if(back) back.click();
    app.querySelector('[data-action="trophies"]').click();
    app.querySelector('[data-action="back"]').click();
  }

  test("an old save without the dex loads, fills it in once, and settles", () => {
    const old = komorebi.createProfile();
    delete old.toolDex;
    const first = komorebi.normalizeProfile(JSON.parse(JSON.stringify(old)));
    assert.equal(first.changed, true, "足りない台帳が補われていない");
    assert.equal(typeof first.profile.toolDex, "object");
    const again = komorebi.normalizeProfile(JSON.parse(JSON.stringify(first.profile)));
    assert.equal(again.changed, false, "毎回の起動で保存が走り続ける");
    /* 壊れた台帳は通さない。 */
    const broken = komorebi.createProfile();
    broken.toolDex = { ghost_net: "2026-08-17" };
    assert.throws(() => komorebi.normalizeProfile(broken), /道具図鑑/);
  });

  test("both devices' first grants survive a save conflict", () => {
    const local = komorebi.createProfile(), remote = komorebi.createProfile();
    local.toolDex = { cho_net: "2026-08-17" };
    remote.toolDex = { cho_net: "2026-08-10", light_trap: "2026-08-18" };
    const merged = komorebi.mergeProfiles(local, remote);
    assert.equal(merged.toolDex.cho_net, "2026-08-10", "早いほうの初回授与が残っていない");
    assert.equal(merged.toolDex.light_trap, "2026-08-18", "片側の初回授与が消えた");
  });

  /* 経済と道具を開ける。 */
  komorebi.setMedalEconomyOn(true);
  const savedReleases = live.list().map(tool => tool.release);
  live.list().forEach(tool => { if(tool.release === 2) tool.release = 1; });
  backToMap();

  /* 1 周目のメダルを成立させ、うろから捧げる。 */
  profile.lv.kom_ratio = 10;
  profile.maxLv.kom_ratio = 10;
  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
  assert.ok(trophies.award(profile, "kom_ratio", "2026-08-10"));
  backToMap();
  app.querySelector('[data-action="uro"]').click();

  test("an empty dex still shows every slot so the goal has a size", () => {
    const text = plain();
    assert.match(text, /どうぐ図かん/);
    assert.match(text, /0／11/, "11 種ぶんの枠が並んでいない");
    /* 公開済みは名前が出て「まだ」、未公開は伏せたまま数だけ。 */
    assert.match(text, /ちょうネット/);
    assert.match(text, /まだ/);
    assert.match(text, /？？？/, "未公開の枠が伏せて並んでいない");
    assert.equal((app.innerHTML.match(/uro-dex-slot/g) || []).length, 11);
    assert.equal((app.innerHTML.match(/is-got/g) || []).length, 0);
  });

  await (async () => {
    app.querySelector(".uro-offer").click();
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="cho_net"]'));
    await settle();

    test("the first tool of its kind says so and lands in the dex", () => {
      assert.equal(live.firstGrantAt(profile, "cho_net"), context.__saved.komorebi.toolDex.cho_net,
        "図鑑の日付が保存されていない");
      assert.ok(live.firstGrantAt(profile, "cho_net"), "初回授与が記録されていない");
      assert.match(plainText(lastOverlay().innerHTML), /はじめての どうぐ! どうぐ図かんに のこったよ/);
    });

    test("the hollow now counts one of eleven", () => {
      const text = plain();
      assert.match(text, /1／11/);
      assert.equal((app.innerHTML.match(/is-got/g) || []).length, 1);
    });
  })();

  await (async () => {
    /* 2 本目の同じ道具では「はじめて」と言わない。 */
    profile.lv.kom_pi314 = 10;
    profile.maxLv.kom_pi314 = 10;
    for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_pi314", 10, true);
    assert.ok(trophies.award(profile, "kom_pi314", "2026-08-11"));
    backToMap();
    app.querySelector('[data-action="uro"]').click();
    app.querySelector(".uro-offer").click();
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="cho_net"]'));
    await settle();

    test("a second net of the same kind is not a first anymore", () => {
      assert.equal(live.ownedOf(profile, "cho_net").length, 2);
      assert.equal(Object.keys(profile.toolDex).length, 1, "同じ道具で図鑑が 2 行になった");
      assert.doesNotMatch(plainText(lastOverlay().innerHTML), /はじめての どうぐ/);
      assert.match(plain(), /1／11/);
    });
  })();

  test("no alert was needed anywhere in the dex path", () => {
    assert.deepEqual(alerts, []);
  });

  live.list().forEach((tool, index) => { tool.release = savedReleases[index]; });
  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
