/* メダル経済の不変条件 (tools_design 2 章の 6 か条) を実装側で固定する。
   道具は「どの虫か」と「新顔か」だけを動かし、8 問 1 匹のレートにもレアリティ表にも
   触れない。未装備の挙動は道具の実装前と 1 ビットも変わらない。
   node tests/test_komorebi_medal_economy.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { console, setTimeout, clearTimeout };
context.window = context;
context.Q4B_KOMOREBI_NO_BOOT = true;
/* 公開ゲートの切替 seam はハーネスの印を立てた文脈でだけ生える (app.js 末尾)。 */
context.Q4B_KOMOREBI_TEST_HOOKS = true;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js",
  "komorebi/trophies.js", "komorebi/tools.js", "komorebi/uro.js", "komorebi/economy_flag.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const komorebi = context.Q4B_KOMOREBI;
const tools = context.Q4B_KOMOREBI_TOOLS;
const uro = context.Q4B_KOMOREBI_URO;
const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
/* submissionId は profile ごとの重複判定に使われる。テスト内で使い回すと
   2 度目が duplicate として落ちるので、呼ぶたびに新しい番号を振る。 */
let submissionSeq = 0;
function answer(){
  return { sessionId: "economy", submissionId: "e-" + (submissionSeq++), format: "normal", kind: "num", correct: true, final: true };
}
function lcg(seed){
  let state = seed;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function sequence(values){
  let index = 0;
  return () => {
    assert.ok(index < values.length, "乱数列が不足しています (" + index + " 本で足りていない)");
    return values[index++];
  };
}
/* 道具の公開ゲートを 2 段とも開ける。実装は先へ進めて公開だけ後から解禁するので、
   既定 (MEDAL_ECONOMY_ON=false) では道具は 1 つも表に出ない。 */
function withReleasedTool(toolId, fn){
  const tool = tools.byId(toolId);
  const before = tool.release, beforeSwitch = komorebi.medalEconomyOn();
  tool.release = 1;
  komorebi.setMedalEconomyOn(true);
  try{ return fn(); } finally { tool.release = before; komorebi.setMedalEconomyOn(beforeSwitch); }
}
function equippedProfile(toolId){
  const profile = komorebi.createProfile();
  tools.grant(profile, toolId);
  return profile;
}
function captureIds(profile, seed, answers){
  const random = lcg(seed);
  const ids = [];
  for(let i = 0; i < answers; i++){
    const result = komorebi.applyAnswer(profile, "kom_ratio", answer(), volume, random);
    if(result.capture) ids.push(result.capture.id);
  }
  return ids;
}

/* ---- 不変条件 1: 8 問 1 匹のレートは不変 ---- */

test("1. eight qualifying answers still make exactly one capture with a net in hand", () => {
  withReleasedTool("tonbo_net", () => {
    const profile = equippedProfile("tonbo_net");
    assert.equal(captureIds(profile, 11, 7).length, 0, "the gauge must not pay out early");
    assert.equal(captureIds(profile, 11, 1).length, 1);
    assert.equal(profile.collection.totalCatches, 1);
    /* 80 問で 10 匹。道具は分布を動かすだけで、供給の蛇口には触れない。 */
    const long = equippedProfile("tonbo_net");
    assert.equal(captureIds(long, 12, 80).length, 10);
    assert.equal(long.collection.totalCatches, 10);
  });
});

/* ---- 不変条件 2: レアリティ表は不動 ---- */

test("2. the rarity ladder and the pity table are untouched by tools", () => {
  assert.equal(komorebi.collectionConfig.pityChances.join(","), "0,0.25,0.5,0.75,1");
  assert.equal(komorebi.collectionConfig.flagshipWeight, 0.25);
  assert.equal(komorebi.collectionConfig.toolGuildWeight, 3);
  assert.equal(komorebi.collectionConfig.toolFreshBoost, 0.25);
  /* 全 tier が完成していれば振替の余地が無い。そこでは道具を持っていても
     tier 抽選も乱数の消費本数も未装備と 1 本も違わない。 */
  withReleasedTool("tonbo_net", () => {
    const catches = {};
    volume.species.forEach(species => { catches[species.id] = { n: 1 }; });
    const tool = tools.byId("tonbo_net");
    const values = [0.42, 0.77];
    const plain = komorebi.drawCapture(volume, catches, 0, sequence(values.slice()));
    const armed = komorebi.drawCapture(volume, catches, 0, sequence(values.slice()), tool);
    assert.equal(plain.species.rarity, armed.species.rarity, "the tool moved the rarity ladder");
  });
});

/* ---- 不変条件 3: メダルの鋳造源は習熟のみ ---- */

test("3. a medal is minted only by a stable level ten clear", () => {
  const profile = komorebi.createProfile();
  profile.lv.kom_ratio = 10;
  profile.maxLv.kom_ratio = 10;
  /* 19 問では足りない。安定判定 (直近 20 問 85%) を満たすまで鋳造されない。 */
  for(let i = 0; i < 19; i++) assert.equal(komorebi.applyPerformance(profile, "kom_ratio", true, 900), null);
  assert.equal(Object.keys(profile.trophies).length, 0);
  const minted = komorebi.applyPerformance(profile, "kom_ratio", true, 900);
  assert.ok(minted, "twenty stable level ten answers must mint the medal");
  assert.equal(minted.cat, "kom_ratio");
  assert.equal(typeof profile.lv10ClearAt.kom_ratio, "string", "the clear time is the start of the reset lock");
  /* 再授与はしない。鋳造は 1 カテゴリ 1 周につき 1 枚きり。 */
  assert.equal(komorebi.applyPerformance(profile, "kom_ratio", true, 900), null);
});

test("3. nothing but the mint creates a medal, and no other path hands out tools", () => {
  const profile = komorebi.createProfile();
  const medals = [{ trophyId: "madagascar_ratio", cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-17", name: "オオオナガヤママユのメダル" }];
  uro.redeem(profile, medals, medals[0], "cho_net", "2026-08-17");
  tools.grant(profile, "cho_net");
  assert.equal(Object.keys(profile.trophies).length, 0, "an offering must never mint a medal");
  /* 道具の授与は奉納の 1 か所だけ。ログインボーナスや配布の口を作らない。 */
  const source = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8");
  assert.equal((source.match(/\.grant\(/g) || []).length, 1, "a second tool grant path appeared in app.js");
});

/* ---- 不変条件 4: 残高ゼロの原則 ---- */

test("4. no balance is ever stored, only an append-only offering log", () => {
  const profile = komorebi.createProfile();
  const keys = Object.keys(profile).join(" ");
  assert.equal(/medal|balance|wallet|points/i.test(keys), false, "the profile grew a medal balance: " + keys);
  assert.equal(Array.isArray(profile.uroLog), true);
  assert.equal(profile.uroLog.length, 0);
  const medals = [
    { trophyId: "a", cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-17", name: "A" },
    { trophyId: "b", cat: "kom_pi314", speciesId: "medama_yamamayu", at: "2026-08-18", name: "B" }
  ];
  uro.redeem(profile, medals, medals[0], "cho_net", "2026-08-17");
  uro.redeem(profile, medals, medals[1], "light_trap", "2026-08-18");
  assert.equal(profile.uroLog.length, 2);
  /* 記録は消えない。導出できるものは持たない。 */
  assert.equal(uro.glow(profile).count, 2);
  assert.equal(uro.pending(profile, medals).length, 0);
});

/* ---- 不変条件 5: 基本ループは道具なしで永久に無料 ---- */

test("5. without a tool the draw is bit for bit what it was before tools existed", () => {
  const bare = komorebi.createProfile();
  const plain = captureIds(bare, 7, 240);
  assert.ok(plain.length > 0, "the fixture produced no capture at all");

  /* ゲートの 1 段目: 経済のスイッチが閉じている間は、どの道具を装備していても効果ゼロ。
     公開済みの 1 本を装備しても変わらないことを見るので、release も開けておく。 */
  const closedSwitchBefore = komorebi.medalEconomyOn();
  const sample = tools.list()[0], sampleRelease = sample.release;
  komorebi.setMedalEconomyOn(false);
  sample.release = 1;
  try{
    assert.equal(komorebi.releasedTools().length, 0, "tools were published while the switch was closed");
    const anyTool = equippedProfile(sample.id);
    assert.equal(captureIds(anyTool, 7, 240).join(","), plain.join(","), "a tool worked while the switch was closed");
    assert.equal(anyTool.tools[0].remaining, 30, "a tool wore out while the switch was closed");
  } finally {
    sample.release = sampleRelease;
    komorebi.setMedalEconomyOn(closedSwitchBefore);
  }

  /* ゲートの 2 段目: スイッチを開けたうえで、release が公開番号を超えている 1 本は
     やはり効果ゼロ。スイッチを閉じたまま見ると 1 段目のほうが効いてしまい、道具
     1 本ずつのゲート (implementation_plan Phase 1) を検査したことにならない。
     公開済みの 1 本と未公開の 1 本が同時にある状態を作って区別を見る。 */
  const unreleased = tools.list().filter(tool => tool.release > komorebi.currentRelease())[0];
  assert.ok(unreleased, "every tool is already published; the gate cannot be tested");
  const opened = tools.list().filter(tool => tool.id !== unreleased.id)[0];
  const beforeSwitch = komorebi.medalEconomyOn(), beforeRelease = opened.release;
  komorebi.setMedalEconomyOn(true);
  opened.release = 1;
  try{
    const published = komorebi.releasedTools().map(tool => tool.id);
    assert.ok(published.indexOf(opened.id) >= 0, "the published tool is missing from the list");
    assert.equal(published.indexOf(unreleased.id), -1, "an unreleased tool leaked into the published list");
    const armedButUnreleased = equippedProfile(unreleased.id);
    const armed = captureIds(armedButUnreleased, 7, 240);
    assert.equal(armed.join(","), plain.join(","), "an unreleased tool changed the draw");
    assert.equal(armedButUnreleased.tools[0].remaining, 30, "an unreleased tool must not wear out");
  } finally {
    opened.release = beforeRelease;
    komorebi.setMedalEconomyOn(beforeSwitch);
  }
});

test("5. the gauge itself never asks for a tool", () => {
  const bare = komorebi.createProfile();
  const ids = captureIds(bare, 3, 800);
  assert.equal(ids.length, 100, "100 captures out of 800 answers, tool or no tool");
  assert.equal(bare.tools.length, 0);
  assert.equal(bare.equippedToolId, null);
});

/* ---- 不変条件 6: コレクションを奪う操作は存在しない ---- */

test("6. breaking, equipping and offering never take a caught insect away", () => {
  withReleasedTool("cho_net", () => {
    const profile = equippedProfile("cho_net");
    captureIds(profile, 21, 40);
    const before = JSON.stringify(profile.collection.catches);
    const total = profile.collection.totalCatches;
    profile.tools[0].remaining = 1;
    tools.consume(profile);
    tools.grant(profile, "cho_net");
    tools.equip(profile, "cho_net");
    tools.equip(profile, null);
    const medals = [{ trophyId: "a", cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-17", name: "A" }];
    uro.redeem(profile, medals, medals[0], "cho_net", "2026-08-17");
    assert.equal(JSON.stringify(profile.collection.catches), before, "the collection changed");
    assert.equal(profile.collection.totalCatches, total);
  });
});

/* ---- セーブは additive ---- */

test("an old save without any of the new keys still loads", () => {
  const old = komorebi.createProfile();
  ["tools", "uroLog", "equippedToolId", "lv10ClearAt"].forEach(key => delete old[key]);
  const first = komorebi.normalizeProfile(JSON.parse(JSON.stringify(old)));
  assert.equal(first.changed, true, "the missing keys must be filled in and written back");
  assert.equal(Array.isArray(first.profile.tools), true);
  assert.equal(Array.isArray(first.profile.uroLog), true);
  assert.equal(first.profile.equippedToolId, null);
  assert.equal(typeof first.profile.lv10ClearAt, "object");
  /* 2 回目は何も変わらない。毎回の起動で保存が走り続ける、を防ぐ。 */
  const again = komorebi.normalizeProfile(JSON.parse(JSON.stringify(first.profile)));
  assert.equal(again.changed, false);
});

test("a save with a broken tool box is refused, a dangling equip is repaired", () => {
  const base = () => JSON.parse(JSON.stringify(komorebi.createProfile()));
  const broken = base();
  broken.tools = [{ type: "cho_net", remaining: 0 }];
  assert.throws(() => komorebi.normalizeProfile(broken), /道具データ/);
  const badLog = base();
  badLog.uroLog = [{ cat: "kom_ratio" }];
  assert.throws(() => komorebi.normalizeProfile(badLog), /奉納データ/);
  /* 装備だけ残って本体が無いのは形の誤りではなく取りこぼし。黙って外す。 */
  const dangling = base();
  dangling.equippedToolId = "cho_net";
  const repaired = komorebi.normalizeProfile(dangling);
  assert.equal(repaired.profile.equippedToolId, null);
  assert.equal(repaired.changed, true);
});

test("a tool this build does not know yet is carried through normalizeProfile, not refused", () => {
  /* 道具箱は先の更新で増える台帳。新しい道具を知っている端末が書いた instance を
     古い端末が読むことがあり、そこで throw するとその端末は保存の競合解決
     (remote を読み直す経路) ごと動かなくなる (validateDex の知らない道具の id を
     素通しする方針と同じで、tools.js の validateTools 側も同じに揃えた)。 */
  const future = JSON.parse(JSON.stringify(komorebi.createProfile()));
  future.tools = [{ type: "malaise_trap", remaining: 12 }];
  future.equippedToolId = "malaise_trap";
  const loaded = komorebi.normalizeProfile(future);
  assert.equal(loaded.profile.tools.length, 1, "知らない道具の instance が消えた");
  assert.equal(loaded.profile.tools[0].type, "malaise_trap");
  /* 本体が (知らない道具でも) 手元にあるので、装備は外さない。 */
  assert.equal(loaded.profile.equippedToolId, "malaise_trap");
});

/* ---- 道具が動かす 2 つ ---- */

test("the guild weight is three times, and it is a weight, not an exclusion", () => {
  const dragonfly = { id: "ameiro_tonbo", rarity: "N", flagship: false };
  const moth = { id: "oo_onaga_yamamayu", rarity: "N", flagship: false };
  const pool = [dragonfly, moth];
  /* 未装備: 重み 1 対 1。0.6 * 2 = 1.2 は 1 を越えるので 2 番目。 */
  assert.equal(komorebi.pickSpecies(pool, () => 0.6).id, "oo_onaga_yamamayu");
  /* トンボ網: 重み 3 対 1。0.6 * 4 = 2.4 は 3 未満なのでトンボ。 */
  assert.equal(komorebi.pickSpecies(pool, () => 0.6, tools.byId("tonbo_net")).id, "ameiro_tonbo");
  /* 排他ではない。対象外の虫も 4 分の 1 の重みで出続ける。 */
  assert.equal(komorebi.pickSpecies(pool, () => 0.9, tools.byId("tonbo_net")).id, "oo_onaga_yamamayu");
});

test("the undiscovered boost adds 0.25 to the tier transfer, capped at one", () => {
  const partial = {
    id: "boost_fixture", regionId: "boost", regionName: "ブースト試験地", frozen: true, denominator: 4,
    species: [
      { id: "eco_n_1", rarity: "N", flagship: false },
      { id: "eco_n_2", rarity: "N", flagship: false },
      { id: "eco_r_1", rarity: "R", flagship: false },
      { id: "eco_flag", rarity: "SSR", flagship: true }
    ]
  };
  const catches = { eco_n_1: { n: 1 }, eco_n_2: { n: 1 }, eco_flag: { n: 1 } };
  const tool = tools.byId("cho_net");
  /* 乱数 0 は最下位 tier (N) を引く。N は完成済みなので、ここが振替の判定点。 */
  const plain = komorebi.drawCapture(partial, catches, 0, sequence([0, 0.5]));
  assert.equal(plain.species.rarity, "N", "with no tool a zero pity chance never transfers");
  assert.equal(plain.pityApplied, false);
  /* 装備中は 0 + 0.25。0.1 は境界の内側なので未完成 tier へ振り替わる。 */
  const boosted = komorebi.drawCapture(partial, catches, 0, sequence([0, 0.1, 0, 0]), tool);
  assert.equal(boosted.pityApplied, true);
  assert.equal(boosted.species.id, "eco_r_1");
  assert.equal(boosted.isNew, true);
  /* 0.3 は境界の外。装備しても確定ではない (pity の専管を奪わない)。 */
  const missed = komorebi.drawCapture(partial, catches, 0, sequence([0, 0.3, 0.5]), tool);
  assert.equal(missed.pityApplied, false);
  assert.equal(missed.species.rarity, "N");
  /* 上限 1.0。段位 4 (救済 100%) に 0.25 を足しても 1 を越えない = 乱数の意味が壊れない。 */
  const capped = komorebi.drawCapture(partial, catches, 4, sequence([0, 0.999, 0, 0]), tool);
  assert.equal(capped.pityApplied, true);
});

test("a capture spends exactly one durability on both capture routes", () => {
  withReleasedTool("cho_net", () => {
    const profile = equippedProfile("cho_net");
    const first = komorebi.applyAnswer(profile, "kom_ratio", answer(), volume, lcg(5));
    assert.equal(first.tool, null, "a plain answer must not wear the net");
    assert.equal(profile.tools[0].remaining, 30);
    captureIds(profile, 31, 8 * 5);
    assert.equal(profile.tools[0].remaining, 25, "five captures, five points of wear");
  });
});

console.log(`RESULT ${passed} passed, 0 failed`);
