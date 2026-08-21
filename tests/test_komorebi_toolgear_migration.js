/* profile 直下 (tools / equippedToolId / toolDex) から共有 kv (toolgear) への
   起動時移行。見るのは 4 つ: 旧 save を積んだ boot が kv へ 1 回だけ種を蒔くこと、
   profile 側のフィールドは消えないこと、以後の消費・装備・授与が kv だけを動かして
   profile.tools が増減しないこと、そして 旧 save → 移行 → 交換 → 破損 の一連が
   通しで成立すること。
   node tests/test_komorebi_toolgear_migration.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  /* 旧 save: 道具が profile 直下に住んでいる (共有 kv 昇格前のクライアントの形)。 */
  const legacy = {
    tools: [{ type: "cho_net", remaining: 12 }, { type: "light_trap", remaining: 100 }],
    equippedToolId: "cho_net",
    toolDex: { cho_net: "2026-08-01", light_trap: "2026-08-05" }
  };
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10",
    saved: { komorebi: JSON.parse(JSON.stringify(legacy)) } });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const komorebi = context.Q4B_KOMOREBI;
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  const tools = context.Q4B_TOOLS;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const profile = komorebi.profile();
  const gearOf = () => context.QuestSave.toolGearOf("p1");
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
  function backToMap(){
    const back = app.querySelector('[data-action="back"]');
    if(back) back.click();
    app.querySelector('[data-action="trophies"]').click();
    app.querySelector('[data-action="back"]').click();
  }
  function openZukan(){
    if(!app.querySelector('[data-action="zukan"]')) backToMap();
    app.querySelector('[data-action="zukan"]').click();
  }

  test("boot seeds the toolgear kv from the legacy profile", () => {
    const gear = gearOf();
    assert.deepEqual(gear.tools, legacy.tools, "profile の道具箱が kv へ移っていない");
    assert.equal(gear.equippedToolId, "cho_net", "装備が kv へ移っていない");
    assert.deepEqual(gear.toolDex, legacy.toolDex, "道具図鑑が kv へ移っていない");
    assert.equal(context.__toolGear.p1.migrated, true, "移行で作った kv に migrated が立っていない");
  });

  test("the legacy profile fields survive the migration untouched", () => {
    /* profile 側は消さない (古いクライアントとの共存とデータ保全)。 */
    assert.deepEqual(profile.tools, legacy.tools, "profile.tools が移行で消えた");
    assert.equal(profile.equippedToolId, "cho_net");
    assert.deepEqual(profile.toolDex, legacy.toolDex);
  });

  test("the migration never runs twice, and spent gear never comes back", () => {
    /* kv が既に在れば (profile に道具が残っていても) 二度目は何もしない。 */
    assert.equal(context.QuestSave.toolGearMigrateFromProfile("p1", profile), false,
      "移行が 2 回走った");
    assert.deepEqual(gearOf().tools, legacy.tools);
    /* 別 profile で: 使い切って空にした kv を、profile の残骸が埋め直さない。 */
    assert.equal(context.QuestSave.toolGearMigrateFromProfile("px",
      { tools: [{ type: "cho_net", remaining: 5 }] }), true);
    context.QuestSave.toolGearSet("px", { tools: [], equippedToolId: null, toolDex: {}, migrated: true });
    assert.equal(context.QuestSave.toolGearMigrateFromProfile("px",
      { tools: [{ type: "cho_net", remaining: 5 }] }), false, "消費後の kv が埋め直された");
    assert.deepEqual(context.QuestSave.toolGearOf("px").tools, []);
    /* 道具の無い profile は kv を作らない。 */
    assert.equal(context.QuestSave.toolGearMigrateFromProfile("py", { tools: [] }), false);
    assert.equal(context.__toolGear.py, undefined, "空の移行が kv エントリを作った");
  });

  /* 経済と道具を開けて、以降を公開後の画面として見る。 */
  komorebi.setMedalEconomyOn(true);
  const savedReleases = tools.list().map(tool => tool.release);
  tools.list().forEach(tool => { if(tool.release === 2) tool.release = 1; });

  await (async () => {
    openZukan();
    app.querySelector('[data-equip="light_trap"]').click();
    await settle();
    test("equipping after the migration moves the kv, not the profile", () => {
      assert.equal(gearOf().equippedToolId, "light_trap");
      assert.equal(profile.equippedToolId, "cho_net", "装備切替が profile 側へ書き戻された");
      assert.equal(profile.tools.length, 2, "装備切替で profile.tools が増減した");
    });
  })();

  await (async () => {
    backToMap();
    profile.collection.gauge = 7;
    await komorebi.recordAnswer("kom_ratio",
      { sessionId: "mig", submissionId: "mig-1", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5);
    await settle();
    test("a capture wears the kv-side tool and leaves profile.tools alone", () => {
      const held = gearOf().tools.filter(entry => entry.type === "light_trap")[0];
      assert.equal(held.remaining, 99, "装備中の 1 本が kv 側で減っていない");
      assert.deepEqual(profile.tools, legacy.tools, "捕獲の消費が profile.tools を動かした");
      assert.equal(profile.collection.totalCatches, 1);
    });
  })();

  await (async () => {
    /* 交換: メダルを鋳造し、うろから捧げて 3 種類目 (tonbo_net) を授かる。 */
    profile.lv.kom_ratio = 10;
    profile.maxLv.kom_ratio = 10;
    for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
    assert.ok(trophies.award(profile, "kom_ratio", "2026-08-10"), "メダルが鋳造されない");
    backToMap();
    app.querySelector('[data-action="uro"]').click();
    app.querySelector(".uro-offer").click();
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="tonbo_net"]'));
    await settle();
    test("an exchange after the migration grants into the kv only", () => {
      assert.equal(gearOf().tools.filter(entry => entry.type === "tonbo_net").length, 1,
        "授かった道具が kv に居ない");
      assert.equal(typeof gearOf().toolDex.tonbo_net, "string", "初回授与が kv の図鑑に載っていない");
      assert.equal(profile.tools.length, 2, "授与が profile.tools を増やした");
      assert.equal(Object.keys(profile.toolDex).length, 2, "授与が profile.toolDex を増やした");
      assert.equal(profile.uroLog.length, 1, "奉納の記録 (小道の物語) は profile に残る");
    });
  })();

  await (async () => {
    /* 破損: 装備中の light_trap を残り 1 にして捕獲する。予備が無いので装備は空く。 */
    const worn = gearOf();
    worn.tools.forEach(entry => { if(entry.type === "light_trap") entry.remaining = 1; });
    context.QuestSave.toolGearSet("p1", worn);
    profile.collection.gauge = 7;
    await komorebi.recordAnswer("kom_ratio",
      { sessionId: "mig", submissionId: "mig-2", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5);
    await settle();
    test("a break after the migration leaves the kv box and dex consistent", () => {
      assert.equal(gearOf().tools.filter(entry => entry.type === "light_trap").length, 0,
        "壊れた 1 本が kv の道具箱に残っている");
      assert.equal(gearOf().equippedToolId, null, "予備が無いのに装備が空いていない");
      assert.equal(typeof gearOf().toolDex.light_trap, "string", "壊れても図鑑からは消えない");
      assert.deepEqual(profile.tools, legacy.tools, "破損が profile.tools を動かした");
    });
  })();

  test("no alert was needed anywhere in the migration path", () => {
    assert.deepEqual(alerts, []);
  });

  tools.list().forEach((tool, index) => { tool.release = savedReleases[index]; });
  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
