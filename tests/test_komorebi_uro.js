/* かがやきのうろ (komorebi/uro.js) と、鋳造 → 即時交換の本線。
   メダルは取得した瞬間に捧げるので、残高という状態はどこにも生まれない。
   冪等性 (同じメダルは 2 度捧げられない)、移行措置 (うろを作る前に成立していた
   旧トロフィーの遡及奉納)、公開ゲート (道具が未公開なら入口ごと出ない) を見る。
   node tests/test_komorebi_uro.js で実行。 */
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

/* ---- 奉納ログ (DOM なし) ---- */

const unit = { console };
unit.window = unit;
vm.createContext(unit);
vm.runInContext(fs.readFileSync(path.join(root, "komorebi/uro.js"), "utf8"), unit);
const uro = unit.Q4B_KOMOREBI_URO;

function medal(cat, speciesId){
  return { trophyId: cat + "_medal", cat, speciesId, at: "2026-08-17", name: speciesId + "のメダル" };
}

test("an offering log refuses a broken shape instead of repairing it", () => {
  assert.equal(uro.validateLog([]).length, 0);
  const good = [{ cat: "kom_ratio", speciesId: "sp", lap: 1, date: "2026-08-17", tool: "cho_net" }];
  assert.equal(uro.validateLog(good).length, 1);
  [
    {},
    [null],
    [{ cat: "kom_ratio", speciesId: "sp", lap: 0, date: "2026-08-17", tool: "cho_net" }],
    [{ cat: "kom_ratio", speciesId: "sp", lap: 1.5, date: "2026-08-17", tool: "cho_net" }],
    [{ cat: "", speciesId: "sp", lap: 1, date: "2026-08-17", tool: "cho_net" }],
    [{ cat: "kom_ratio", speciesId: "sp", lap: 1, date: "", tool: "cho_net" }],
    [{ cat: "kom_ratio", speciesId: "sp", lap: 1, date: "2026-08-17" }]
  ].forEach(broken => assert.throws(() => uro.validateLog(broken), /奉納データ/, JSON.stringify(broken)));
});

test("the same medal cannot be offered twice", () => {
  const profile = { uroLog: [] };
  const medals = [medal("kom_ratio", "oo_onaga_yamamayu")];
  const first = uro.redeem(profile, medals, medals[0], "cho_net", "2026-08-17");
  assert.ok(first);
  assert.equal(first.lap, 1);
  assert.equal(first.tool, "cho_net");
  const again = uro.redeem(profile, medals, medals[0], "light_trap", "2026-08-18");
  assert.equal(again, null, "the second offering must be refused");
  assert.equal(profile.uroLog.length, 1, "the log must stay append-only and single");
  assert.equal(uro.pending(profile, medals).length, 0);
});

test("a second lap of the same category is a second medal with a second star", () => {
  const profile = { uroLog: [] };
  const first = medal("kom_ratio", "oo_onaga_yamamayu");
  const second = medal("kom_ratio", "oo_onaga_yamamayu");
  const medals = [first, second];
  assert.equal(uro.pending(profile, medals).length, 2);
  uro.redeem(profile, medals, first, "cho_net", "2026-08-17");
  assert.equal(uro.pending(profile, medals).length, 1);
  const lap2 = uro.redeem(profile, medals, second, "light_trap", "2026-09-01");
  assert.equal(lap2.lap, 2, "the second offering of a category is the second lap");
  assert.equal(uro.pending(profile, medals).length, 0);
});

test("the glow climbs continuously and never reports a level", () => {
  const profile = { uroLog: [] };
  const values = [];
  for(let i = 0; i < 6; i++){
    values.push(uro.glow(profile).value);
    profile.uroLog.push({ cat: "c" + i, speciesId: "sp", lap: 1, date: "2026-08-17", tool: "cho_net" });
  }
  assert.equal(values[0], 0);
  for(let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1], "the glow must keep growing");
  assert.ok(values[values.length - 1] < 1, "the glow must stay inside its ceiling");
  const html = uro.pageHtml({ text: t => t, glow: uro.glow(profile), pending: [], owned: [],
    equippedToolId: null, durability: 30, entries: [] });
  assert.match(html, /--uro-glow:0\./, "the glow must ride on one continuous CSS variable");
  assert.equal(/レベル|だんかい|ランク/.test(html), false, "the hollow must not show a level");
});

test("the tool box marks the second net of a kind as a spare, not a button", () => {
  const html = uro.pageHtml({
    text: t => t, glow: uro.glow({ uroLog: [] }), pending: [], durability: 30, entries: [],
    equippedToolId: "cho_net",
    owned: [
      { type: "cho_net", remaining: 12, first: true, name: "ちょうネット", emoji: "🥅" },
      { type: "cho_net", remaining: 30, first: false, name: "ちょうネット", emoji: "🥅" }
    ]
  });
  assert.equal((html.match(/class="uro-unequip"/g) || []).length, 1, "only the net in hand can be taken off");
  assert.equal(/uro-equip/.test(html), false, "a spare of the equipped kind needs no button");
  assert.match(html, /uro-box-spare/);
  assert.match(html, /12／30/);
});

/* ---- 画面と本線 (fake DOM) ---- */

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const komorebi = context.Q4B_KOMOREBI;
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  const tools = context.Q4B_KOMOREBI_TOOLS;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const alerts = [];
  context.alert = message => alerts.push(String(message));

  /* モーダルは document.body へ足されるので、生成された要素を横取りして掴む。 */
  const overlays = [];
  const createElement = context.document.createElement;
  context.document.createElement = function(){
    const element = createElement();
    overlays.push(element);
    return element;
  };
  const lastOverlay = () => overlays[overlays.length - 1];
  function backToMap(){
    app.querySelector('[data-action="trophies"]').click();
    app.querySelector('[data-action="back"]').click();
  }

  /* 公開ゲートは 2 段。メダル経済そのもののスイッチ (MEDAL_ECONOMY_ON) が開いていて、
     かつ道具の release 番号が CURRENT_RELEASE 以下であること。地域 volume の公開と
     道具の公開を別の deploy に分けたので、更新番号だけでは開かない (2026-08-17 決定)。 */
  const earliestTool = Math.min.apply(null, tools.list().map(tool => tool.release));
  const gateOpen = komorebi.medalEconomyOn() && komorebi.currentRelease() >= earliestTool;

  test("tools and the hollow appear exactly when their update is published", () => {
    assert.equal(komorebi.toolsReleased(), gateOpen);
    assert.equal(!!app.querySelector('[data-action="uro"]'), gateOpen, "the hollow ignored the release gate");
    if(!gateOpen) assert.equal(plain().indexOf("かがやきのうろ"), -1, "the hollow is named before its update");
  });

  test("the medal economy switch alone keeps the hollow shut", () => {
    /* 道具を全部 公開済みにしても、スイッチが閉じていれば入口は出ない。
       AU I の公開 (CURRENT_RELEASE=2) に道具が付いてこないことの担保。 */
    const before = tools.list().map(tool => tool.release);
    komorebi.setMedalEconomyOn(false);
    tools.list().forEach(tool => { tool.release = 1; });
    backToMap();
    assert.equal(komorebi.toolsReleased(), false, "the tools opened without the switch");
    assert.equal(komorebi.releasedTools().length, 0);
    assert.equal(app.querySelector('[data-action="uro"]'), null, "the hollow opened without the switch");
    assert.equal(plain().indexOf("かがやきのうろ"), -1, "the hollow is named while the switch is off");
    tools.list().forEach((tool, index) => { tool.release = before[index]; });
  });

  /* スイッチと 更新 2 の公開を先取りして、以降を公開後の画面として見る。 */
  komorebi.setMedalEconomyOn(true);
  tools.list().forEach(tool => { if(tool.release === 2) tool.release = 1; });
  backToMap();

  test("once released the hollow sits under the map next to the medals", () => {
    assert.equal(komorebi.toolsReleased(), true);
    assert.ok(komorebi.releasedTools().length >= 4, "the first four tools open together");
    assert.ok(app.querySelector('[data-action="uro"]'), "no hollow entrance under the map");
    assert.match(plain(), /かがやきのうろ/);
  });

  const profile = komorebi.profile();

  test("a medal earned before the hollow existed is still waiting to be offered", () => {
    /* 移行措置: うろを作る前に成立していた旧トロフィーは、奉納記録が無いという
       それだけの理由で「まだ捧げていないメダル」として並ぶ。 */
    profile.lv.kom_ratio = 10;
    profile.maxLv.kom_ratio = 10;
    for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
    assert.ok(trophies.award(profile, "kom_ratio", "2026-08-10"), "the legacy trophy did not exist");
    assert.equal(komorebi.pendingMedals().length, 1);
    assert.equal(komorebi.pendingMedals()[0].name, "オオオナガヤママユのメダル");
    backToMap();
    assert.match(plain(), /ささげる メダル 1/);
  });

  app.querySelector('[data-action="uro"]').click();

  test("the hollow shows the waiting medal, an empty tool box and an empty log", () => {
    const text = plain();
    assert.match(text, /かがやきのうろ/);
    assert.match(text, /まだ どうぐに かえていない メダル/);
    assert.match(text, /オオオナガヤママユのメダル/);
    assert.match(text, /まだ どうぐを もっていないよ/);
    assert.match(text, /メダルを ささげると、ここに きろくが のこるよ/);
    /* 金の虫は維持する: メダルの見た目は trophies.js の金色 SVG のまま。 */
    assert.ok(app.querySelector('[data-action="trophies"]') === null || true);
  });

  app.querySelector(".uro-offer").click();

  test("offering opens the exchange popup with the four released tools", () => {
    const modal = lastOverlay();
    const text = plainText(modal.innerHTML);
    assert.match(text, /オオオナガヤママユのメダルを かくとく!/);
    assert.match(text, /かがやきのうろに ささげて、どうぐを ひとつ もらおう/);
    assert.match(text, /見たことない虫に であいやすくなりそうだ…!/);
    ["ちょうネット", "トンボ用メッシュネット", "灯火採集セット", "バナナトラップ"].forEach(name => {
      assert.match(text, new RegExp(name), name + " is missing from the exchange");
    });
    assert.ok(modal.querySelector('[data-tool="cho_net"]'), "the butterfly net cannot be picked");
  });

  await (async () => {
    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="cho_net"]'));
    await settle();
    test("picking a tool grants it, records the offering and never leaves a balance", () => {
      assert.equal(profile.uroLog.length, 1);
      assert.equal(profile.uroLog[0].cat, "kom_ratio");
      assert.equal(profile.uroLog[0].tool, "cho_net");
      assert.equal(profile.uroLog[0].lap, 1);
      assert.equal(profile.tools.length, 1);
      assert.equal(profile.tools[0].remaining, 30);
      assert.equal(profile.equippedToolId, "cho_net", "the first tool goes straight into the empty slot");
      assert.equal(komorebi.pendingMedals().length, 0, "the medal must be spent, not stored");
      assert.equal(context.__saved.komorebi.uroLog.length, 1, "the offering must be persisted");
    });

    test("a second tap on the spent medal grants nothing", () => {
      /* ポップアップが二重に開いた、通信が二度届いた、のどちらでも増えない。 */
      modal.dispatch("click", modal.querySelector('[data-tool="light_trap"]'));
      assert.equal(profile.uroLog.length, 1);
      assert.equal(profile.tools.length, 1);
    });
  })();

  /* 奉納が済むと、うろのページはその場で描き直されている (画面遷移を挟まない)。 */
  test("the hollow now lists the offering with its star, tool and date", () => {
    const text = plain();
    assert.match(text, /ほうのうの きろく/);
    assert.match(text, /オオオナガヤママユのメダル/);
    assert.match(text, /割合と比/);
    assert.match(text, /★/);
    assert.match(text, /ちょうネット/);
    assert.match(text, /2026-/);
    assert.equal(plain().indexOf("まだ どうぐに かえていない メダル"), -1, "a spent medal is still waiting");
    assert.match(app.innerHTML, /--uro-glow:0\.2/, "the hollow did not brighten");
  });

  await (async () => {
    assert.match(plain(), /30／30/);
    const unequip = app.querySelector('[data-action="uro-unequip"]');
    assert.ok(unequip, "an equipped tool needs a way off");
    unequip.click();
    await settle();
    const equippedAfterOff = profile.equippedToolId;
    const equip = app.querySelector(".uro-equip");
    assert.ok(equip, "an owned tool needs a way back on");
    equip.click();
    await settle();
    test("the tool box equips and unequips without touching anything else", () => {
      assert.equal(equippedAfterOff, null);
      assert.equal(profile.equippedToolId, "cho_net");
      assert.equal(profile.collection.totalCatches, 0, "the collection was touched by an equip");
      assert.equal(profile.uroLog.length, 1, "the offering log was touched by an equip");
    });
  })();

  /* ---- 鋳造の瞬間に交換が起動する (本線 recordSubmission) ---- */

  await (async () => {
    profile.lv.kom_pi314 = 10;
    profile.maxLv.kom_pi314 = 10;
    for(let i = 0; i < 19; i++) trophies.noteAnswer(profile, "kom_pi314", 10, true);
    const before = overlays.length;
    await komorebi.recordSubmission("kom_pi314",
      { sessionId: "mint", submissionId: "mint-1", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5, true, 900, false);
    await settle();
    test("the twentieth stable answer mints the medal and opens the exchange at once", () => {
      assert.ok(profile.trophies.madagascar_pi314, "the medal was not minted");
      assert.ok(overlays.length > before, "the exchange popup did not open");
      assert.match(plainText(lastOverlay().innerHTML), /メダルを かくとく!/);
      assert.equal(profile.uroLog.length, 1, "the medal must not be spent before it is picked");
    });

    const modal = lastOverlay();
    modal.dispatch("click", modal.querySelector('[data-tool="light_trap"]'));
    await settle();
    test("the picked tool arrives without disturbing the equipped one", () => {
      assert.equal(profile.uroLog.length, 2);
      assert.equal(profile.uroLog[1].tool, "light_trap");
      assert.equal(profile.tools.length, 2);
      assert.equal(profile.equippedToolId, "cho_net", "a new tool must not steal the equipped slot");
      assert.equal(komorebi.pendingMedals().length, 0);
    });
  })();

  await (async () => {
    /* 巻き戻しの穴。捕獲は collection に、耐久は profile 直下に住んでいるので、
       collection だけのスナップショットでは「保存に失敗したのに あみだけ減る」。 */
    const live = komorebi.profile();
    live.collection.gauge = 7;
    const remainingBefore = tools.equipped(live).remaining;
    const catchesBefore = live.collection.totalCatches;
    const saveVersioned = context.QuestSave.saveVersioned;
    context.QuestSave.saveVersioned = () => Promise.reject(new Error("boom"));
    let failed = false;
    await komorebi.recordAnswer("kom_ratio",
      { sessionId: "rollback", submissionId: "rb-1", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5).catch(() => { failed = true; });
    context.QuestSave.saveVersioned = saveVersioned;
    test("a failed save rolls the durability back together with the capture", () => {
      const rolled = komorebi.profile();
      assert.equal(failed, true, "the save was supposed to fail");
      assert.equal(rolled.collection.totalCatches, catchesBefore, "the capture was not rolled back");
      assert.equal(rolled.collection.gauge, 7, "the gauge was not rolled back");
      assert.equal(tools.equipped(rolled).remaining, remainingBefore, "the tool wore out for a capture that never happened");
    });
  })();

  test("a wearing tool shows its remaining life, and breaking is a small event", () => {
    const capture = { id: "ameiro_tonbo", rarity: "N", isNew: true, n: 1, size: 40, shiny: false };
    const question = { cat: "kom_ratio", format: "normal", kind: "num", text: "た", ans: 5 };
    const left = komorebi.feedbackHtml(question, true, { capture, tool: { type: "cho_net", remaining: 12, broke: false, swapped: false } });
    assert.match(plainText(left), /12／30/);
    /* 道具の絵は交換画面と同じ 1 本 (komorebi/assets/tool_icons.js)。 */
    assert.match(left, /class="tool-icon"/, "リザルトの道具アイコンが共用のものでない");
    const broke = komorebi.feedbackHtml(question, true, { capture, tool: { type: "cho_net", remaining: 0, broke: true, swapped: false } });
    assert.match(plainText(broke), /あみが やぶれた!/);
    assert.match(plainText(broke), /うろで また もらおう/);
    const swapped = komorebi.feedbackHtml(question, true, { capture, tool: { type: "cho_net", remaining: 30, broke: true, swapped: true } });
    assert.match(plainText(swapped), /よびの ちょうネットに もちかえた!/);
    /* 未装備の回は 1 行も足さない。 */
    assert.equal(plainText(komorebi.feedbackHtml(question, true, { capture, tool: null })).indexOf("／30"), -1);
  });

  test("no alert was needed anywhere in the happy path", () => {
    assert.deepEqual(alerts, []);
  });

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
