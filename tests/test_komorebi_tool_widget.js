/* ずかん画面の装備パネル (tools_design 7 章)。実体は共有部品 (shared/tools_ui.js の
   panelHtml / bindPanel) で、現在の装備が常時見えていて、札を押すだけで なし /
   所持道具 に切り替わる。既定値は今の装備なので、いつもどおり呼ぶだけなら 0 タップ。
   道具の状態は profile ではなく共有 kv (QuestSave.toolGearOf / toolGearSet) に住み、
   装備切替はその場で kv へ永続する (profile の保存は走らない)。
   node tests/test_komorebi_tool_widget.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const komorebi = context.Q4B_KOMOREBI;
  const tools = context.Q4B_TOOLS;
  const profile = komorebi.profile();
  const alerts = [];
  context.alert = message => alerts.push(String(message));

  /* 道具の状態は共有 kv に住む。読みは毎回 clone なので、書き換えたら set で戻す。 */
  const gearOf = () => context.QuestSave.toolGearOf("p1");
  function seedGear(fn){
    const gear = { tools: [], equippedToolId: null, toolDex: {} };
    if(fn) fn(gear);
    context.QuestSave.toolGearSet("p1", gear);
    return gear;
  }

  /* ずかんは小道の一覧から開く。地図 → ずかん の 1 経路だけを使う。
     既にずかんに居るときは一度地図へ戻ってから開き直す (描き直しの経路も同じ)。 */
  function backToMap(){
    const back = app.querySelector('[data-action="back"]');
    if(back) back.click();
  }
  function openZukan(){
    if(!app.querySelector('[data-action="zukan"]')) backToMap();
    app.querySelector('[data-action="zukan"]').click();
  }
  const chips = () => app.querySelectorAll("[data-equip]");
  const chipFor = type => app.querySelector('[data-equip="' + type + '"]');

  test("with the economy switch off the panel is nowhere on the call screen", () => {
    komorebi.setMedalEconomyOn(false);
    seedGear(gear => tools.grant(gear, "cho_net"));
    openZukan();
    assert.equal(chips().length, 0, "経済 off で道具の札が出た");
    assert.equal(plain().indexOf("いまの そうび"), -1);
    /* こはくの行そのものは変わらない。 */
    assert.match(plain(), /こはく：/);
    backToMap();
  });

  /* 経済と道具を開ける。 */
  komorebi.setMedalEconomyOn(true);
  const savedReleases = tools.list().map(tool => tool.release);
  tools.list().forEach(tool => { if(tool.release === 2) tool.release = 1; });

  test("a released tool but an empty tool box still shows no panel", () => {
    seedGear();
    openZukan();
    assert.equal(chips().length, 0, "道具を持っていないのに空の器が出た");
    backToMap();
  });

  test("the panel shows the equipped tool and one chip per kind held", () => {
    seedGear(gear => {
      tools.grant(gear, "cho_net");
      tools.grant(gear, "cho_net");
      tools.grant(gear, "light_trap");
      gear.tools[0].remaining = 12;
    });
    openZukan();
    /* なし + 種類ぶん。同じ種類の 2 本目は札を増やさず「よび」として数だけ添える。 */
    assert.equal(chips().length, 3, "札の数が 種類 + なし になっていない");
    assert.ok(chipFor("cho_net"));
    assert.ok(chipFor("light_trap"));
    const text = plain();
    assert.match(text, /いまの そうび/);
    assert.match(text, /ちょうネット/);
    assert.ok(text.indexOf("12／" + tools.durability) >= 0, "先頭 1 本の残りが出ていない");
    /* 道具の絵は交換画面と同じ 1 本 (shared/tool_icons.js)。 */
    assert.match(app.innerHTML, /class="tool-icon"/, "パネルの道具アイコンが共用のものでない");
    /* 独立カードの器は共有部品のもの (map.css の旧ウィジェットは削除済み)。 */
    assert.match(app.innerHTML, /class="q4b-tool-panel"/, "共有パネルの器で描かれていない");
    assert.match(text, /よび 1/, "同じ種類の予備が数えられていない");
    /* 既定値は今の装備。最初に授かった 1 本がそのまま押された状態で並ぶ。 */
    assert.equal(chipFor("cho_net").getAttribute("aria-pressed"), "true");
    assert.equal(chipFor("light_trap").getAttribute("aria-pressed"), "false");
    assert.equal(app.querySelector('[data-equip=""]').getAttribute("aria-pressed"), "false");
  });

  await (async () => {
    chipFor("light_trap").click();
    await settle();
    test("tapping another kind equips it in the shared kv without touching anything else", () => {
      assert.equal(gearOf().equippedToolId, "light_trap");
      assert.equal(gearOf().tools.length, 3, "切り替えで道具が増減した");
      assert.equal(gearOf().tools[0].remaining, 12, "切り替えで耐久が減った");
      assert.equal(profile.collection.totalCatches, 0, "切り替えで図鑑が動いた");
      assert.equal(chipFor("light_trap").getAttribute("aria-pressed"), "true");
      assert.equal(chipFor("cho_net").getAttribute("aria-pressed"), "false");
      /* 保存先は toolgear kv。profile 側の旧フィールドはもう増減しない。 */
      assert.equal(context.__toolGear.p1.equippedToolId, "light_trap", "切り替えが kv に保存されていない");
      assert.equal(profile.tools.length, 0, "profile 側の道具箱に書き戻された");
      assert.equal(profile.equippedToolId, null, "profile 側の装備に書き戻された");
    });
  })();

  await (async () => {
    app.querySelector('[data-equip=""]').click();
    await settle();
    test("tapping none takes the tool off and the basic loop is free again", () => {
      assert.equal(gearOf().equippedToolId, null);
      assert.equal(gearOf().tools.length, 3, "はずしたら道具が消えた");
      assert.equal(app.querySelector('[data-equip=""]').getAttribute("aria-pressed"), "true");
      assert.match(plain(), /いまの そうび なし/);
    });
  })();

  await (async () => {
    /* 同じ札をもう一度押しても kv への書き込みは走らない (profile の保存も走らない)。 */
    const before = context.__toolGear.p1.equippedToolId;
    let gearWrites = 0, saves = 0;
    const toolGearSet = context.QuestSave.toolGearSet;
    const saveVersioned = context.QuestSave.saveVersioned;
    context.QuestSave.toolGearSet = function(){ gearWrites++; return toolGearSet.apply(this, arguments); };
    context.QuestSave.saveVersioned = function(){ saves++; return saveVersioned.apply(this, arguments); };
    app.querySelector('[data-equip=""]').click();
    await settle();
    context.QuestSave.toolGearSet = toolGearSet;
    context.QuestSave.saveVersioned = saveVersioned;
    test("re-tapping the chip that is already on writes nothing", () => {
      assert.equal(gearWrites, 0, "同じ札の連打で kv への書き込みが走った");
      assert.equal(saves, 0, "装備切替で profile の保存が走った");
      assert.equal(context.__toolGear.p1.equippedToolId, before);
    });
  })();

  await (async () => {
    /* 装備した道具は そのまま 呼び出しの抽選と耐久に効く (別の入口を作らない)。 */
    chipFor("cho_net").click();
    await settle();
    const wallet = new Map([["p1", 300]]);
    context.QuestSave.amberOf = pid => wallet.get(pid) || 0;
    context.QuestSave.amberAdd = (pid, n) => { wallet.set(pid, (wallet.get(pid) || 0) + (n || 0)); return wallet.get(pid); };
    context.QuestSave.amberSpend = (pid, n) => {
      const now = wallet.get(pid) || 0;
      if(now < n) return false;
      wallet.set(pid, now - n);
      return true;
    };
    openZukan();
    const remainingBefore = tools.ownedOf(gearOf(), gearOf().equippedToolId)[0].remaining;
    app.querySelector('[data-action="amber-call"]').click();
    await settle();
    test("the panel's choice is the one the amber call actually uses", () => {
      assert.equal(gearOf().equippedToolId, "cho_net");
      assert.equal(tools.ownedOf(gearOf(), gearOf().equippedToolId)[0].remaining, remainingBefore - 1, "よぶ 1 回で 1 減らない");
      assert.equal(profile.collection.totalCatches, 1);
    });
  })();

  test("an unreleased tool left equipped reads as none", () => {
    /* 更新をまたいで先に授かった道具が未公開へ戻ることは無いが、release を跨いだ
       セーブは起こりうる。効果が出ていないものを「そうび中」と見せない。 */
    tools.list().forEach(tool => { if(tool.id === "cho_net") tool.release = 9; });
    openZukan();
    assert.match(plain(), /いまの そうび なし/);
    assert.equal(app.querySelector('[data-equip=""]').getAttribute("aria-pressed"), "true");
    assert.equal(chipFor("cho_net"), null, "未公開の道具が札に並んだ");
    tools.list().forEach((tool, index) => { tool.release = savedReleases[index]; });
  });

  test("no alert was needed anywhere in the panel path", () => {
    assert.deepEqual(alerts, []);
  });

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
