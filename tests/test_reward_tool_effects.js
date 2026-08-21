"use strict";

/* 採集道具の本編接続 (shared/tools.js の guildWeightFor / walletStore と
   shared/reward.js の setToolsStore 配線) の検証。
   - store 未設定 / 未装備の間は、抽選の結果も乱数の消費本数も改修前と同一
   - 装備中は tier 内の最終選択が guild 重み付きになり、捕獲成立で耐久が 1 減る
   - 効果範囲はゲージ捕獲 (onCorrect) とこはく呼び出し (spendForCatch) のみ */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console, setTimeout, clearTimeout};
context.window = context;
context.Math = Object.create(Math);
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/tools.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/reward.js"), "utf8"), context);
const tools = context.Q4B_TOOLS;
const reward = context.Q4BReward;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
/* rollFromPool を任意の乱数列 + opts で直接叩く helper */
function rollDirect(p, caught, boost, random, opts){
  return reward.rollFromPool(p, caught, boost, Object.assign({random:random}, opts || {}));
}
/* vm realm 産のオブジェクトは prototype が異なり deepStrictEqual で落ちるため
   JSON 往復で host realm に写してから比較する */
function plain(x){ return JSON.parse(JSON.stringify(x)); }
function seeded(seed){
  let state=seed>>>0;
  return function(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; };
}
function counting(inner){ const fn=()=>{ fn.calls++; return inner(); }; fn.calls=0; return fn; }

/* toolGearOf / toolGearSet だけを持つ QuestSave の代役。A1 実装 (正規化 + deep clone
   + 即永続化) と同じ契約: 読み出しは毎回複製、書き込みは内部状態へ反映。 */
function saveMock(gear){
  const state = JSON.parse(JSON.stringify(gear));
  const mock = {
    setCalls: 0,
    lastPid: null,
    toolGearOf(pid){ mock.lastPid = pid; return JSON.parse(JSON.stringify(state)); },
    toolGearSet(pid, g){
      mock.setCalls++;
      state.tools = JSON.parse(JSON.stringify(g.tools));
      state.equippedToolId = g.equippedToolId;
    },
    peek(){ return JSON.parse(JSON.stringify(state)); }
  };
  return mock;
}
function gearWith(id, remaining){
  return {tools:[{type:id, remaining:remaining}], equippedToolId:id, toolDex:{}};
}
const economyOn = {on: () => true, currentRelease: () => 2};

/* 消費を数える reward 側 store の代役 (walletStore の契約と同じ形を返す)。 */
function trackingStore(instance){
  const store = {
    equipCalls: 0,
    consumeCalls: 0,
    equippedTool(){
      store.equipCalls++;
      return instance ? {type:instance.type, remaining:instance.remaining} : null;
    },
    consumeOnCapture(){
      store.consumeCalls++;
      instance.remaining--;
      return {type:instance.type, remaining:instance.remaining, broke:instance.remaining===0, swapped:false};
    }
  };
  return store;
}

test("guild weight constants and helper accept every tool shape", () => {
  assert.equal(tools.GUILD_WEIGHT, 3);
  assert.equal(tools.FRESH_BOOST, 0.25);
  const dragonfly = {id:"x", order:"Odonata"};
  const butterfly = {id:"y", order:"Lepidoptera", family:"Papilionidae"};
  /* id 文字列・定義 ({id})・instance ({type}) のどれでも同じ答え。定義を渡せる
     ことが、komorebi/app.js の pickSpecies (定義を持ち回る) の委譲互換になる。 */
  for(const form of ["tonbo_net", {id:"tonbo_net"}, {type:"tonbo_net", remaining:4}, tools.byId("tonbo_net")]){
    assert.equal(tools.guildWeightFor(form, dragonfly), 3);
    assert.equal(tools.guildWeightFor(form, butterfly), 1);
  }
  assert.equal(tools.guildWeightFor(null, dragonfly), 1);
  assert.equal(tools.guildWeightFor({type:"unknown_tool"}, dragonfly), 1);
  assert.equal(tools.guildWeightFor("tonbo_net", null), 1);
});

test("tool-less rollFromPool keeps pre-change results and random consumption", () => {
  /* 改修前 rollFromPool の写し (夜間重み未使用時): tier 抽選 1 本 + tier 内一様 1 本 */
  function referenceRoll(p, caught, boost, values){
    let i = 0;
    const random = () => values[i++];
    const byTier = [0,1,2,3].map(t => p.filter(s => reward.tierOf(s)===t));
    const available = [];
    byTier.forEach((a,t) => { if(a.length) available.push(t); });
    const tier = reward.selectTier(boost, available, random);
    let cand = byTier[tier];
    if(caught){ const fresh = cand.filter(s => !caught[s.id]); if(fresh.length) cand = fresh; }
    const sp = cand[Math.floor(random()*cand.length)];
    return {sp, used:i};
  }
  const p = reward.pool("keisan");
  assert.ok(p.length > 1);
  const caught = {};
  caught[p[0].id] = {n:1};
  caught[p[3].id] = {n:2};
  const gen = seeded(2026);
  for(let i=0;i<300;i++){
    const values = [gen(), gen(), gen(), gen()];
    const expected = referenceRoll(p, caught, 1, values);
    let used = 0;
    const rnd = () => values[used++];
    const result = rollDirect(p, caught, 1, rnd);
    assert.equal(result.id, expected.sp.id, "iteration "+i);
    assert.equal(used, expected.used, "iteration "+i);
    assert.equal(used, 2, "tool なしの抽選は tier + 種の乱数 2 本のまま");
  }
});

test("an equipped tool re-weights the in-tier final pick", () => {
  const dragonfly = {id:"tp_tombo", rarity:"N", order:"Odonata"};
  const butterfly = {id:"tp_chou", rarity:"N", order:"Lepidoptera"};
  const p = [dragonfly, butterfly];
  const instance = {type:"tonbo_net", remaining:10};
  function pick(values, opts){
    let i = 0;
    return rollDirect(p, null, 1, () => values[i++], opts);
  }
  /* 道具なし: 一様なので境界は 0.5 */
  assert.equal(pick([0.5, 0.49]).id, "tp_tombo");
  assert.equal(pick([0.5, 0.51]).id, "tp_chou");
  /* 道具あり: 重み [3,1] なので境界が 0.75 へ動く */
  assert.equal(pick([0.5, 0.74], {tool:instance}).id, "tp_tombo");
  assert.equal(pick([0.5, 0.76], {tool:instance}).id, "tp_chou");
  /* 大数: 対象 guild の当選率が 1/2 から 3/4 へ */
  const rnd = seeded(9);
  let hit = 0;
  for(let i=0;i<8000;i++) if(rollDirect(p, null, 1, rnd, {tool:instance}).id === "tp_tombo") hit++;
  assert.ok(Math.abs(hit/8000 - 0.75) < 0.02, "rate="+hit/8000);
});

test("onCorrect consults the store only at capture and attaches toolUse", () => {
  const instance = {type:"cho_net", remaining:2};
  const store = trackingStore(instance);
  reward.setToolsStore(store);
  const coll = {};
  /* ゲージ満了前の正解では store に触れない */
  assert.equal(reward.onCorrect(coll, "kanji", 8, 1, null, 1, {random:seeded(3)}), null);
  assert.equal(store.equipCalls, 0);
  assert.equal(store.consumeCalls, 0);
  /* 満了 → 捕獲成立で耐久 1 消費 + result.toolUse */
  const res = reward.onCorrect(coll, "kanji", 1, 1, null, 1, {random:seeded(4)});
  assert.ok(res && res.sp);
  assert.deepEqual(res.toolUse, {type:"cho_net", remaining:1, broke:false, swapped:false});
  assert.equal(store.equipCalls, 1);
  assert.equal(store.consumeCalls, 1);
  assert.equal(instance.remaining, 1);
  /* consumeOnCapture が null (競合等) なら toolUse は付けない */
  reward.setToolsStore({equippedTool: () => ({type:"cho_net", remaining:1}), consumeOnCapture: () => null});
  const res2 = reward.onCorrect({}, "kanji", 1, 1, null, 1, {random:seeded(5)});
  assert.ok(res2 && !("toolUse" in res2));
  reward.setToolsStore(null);
});

test("spendForCatch applies the tool and consumes durability once", () => {
  const instance = {type:"banana_trap", remaining:3};
  const store = trackingStore(instance);
  reward.setToolsStore(store);
  const coll = {catches:{}, amber:30};
  const res = reward.spendForCatch(coll, "keisan", 1);
  assert.ok(res && res.sp);
  assert.equal(coll.amber, 0);
  assert.deepEqual(res.toolUse, {type:"banana_trap", remaining:2, broke:false, swapped:false});
  assert.equal(store.consumeCalls, 1);
  /* こはく不足なら抽選前に打ち切られ、store に触れない */
  const before = store.equipCalls;
  assert.equal(reward.spendForCatch({catches:{}, amber:0}, "keisan", 1), null);
  assert.equal(store.equipCalls, before);
  assert.equal(store.consumeCalls, 1);
  reward.setToolsStore(null);
});

test("award and awardMaster never touch the tools store", () => {
  const bomb = {
    calls: 0,
    equippedTool(){ bomb.calls++; return {type:"cho_net", remaining:5}; },
    consumeOnCapture(){ throw new Error("award / awardMaster で耐久が減ってはならない"); }
  };
  reward.setToolsStore(bomb);
  const res = reward.award({catches:{}}, "keisan", 1);
  assert.ok(res && !("toolUse" in res));
  const res2 = reward.awardMaster({catches:{}}, reward.pool("kanji")[0]);
  assert.ok(res2 && !("toolUse" in res2));
  assert.equal(bomb.calls, 0);
  reward.setToolsStore(null);
});

test("walletStore consumes durability, persists, and reports broke and swapped", () => {
  /* 同種の予備あり: remaining 1 -> 0 で broke、予備へ swap */
  const save = saveMock({tools:[{type:"cho_net", remaining:1}, {type:"cho_net", remaining:100}], equippedToolId:"cho_net", toolDex:{}});
  const store = tools.walletStore(save, economyOn, () => "p1");
  assert.deepEqual(plain(store.equippedTool()), {type:"cho_net", remaining:1});
  assert.deepEqual(plain(store.consumeOnCapture()), {type:"cho_net", remaining:100, broke:true, swapped:true});
  assert.equal(save.setCalls, 1);
  assert.equal(save.lastPid, "p1");
  assert.deepEqual(save.peek().tools, [{type:"cho_net", remaining:100}]);
  assert.equal(save.peek().equippedToolId, "cho_net");
  /* 予備なし: broke + swapped:false、装備が外れて以後は未装備 */
  const save2 = saveMock(gearWith("cho_net", 1));
  const store2 = tools.walletStore(save2, economyOn, () => "p1");
  assert.deepEqual(plain(store2.consumeOnCapture()), {type:"cho_net", remaining:0, broke:true, swapped:false});
  assert.equal(save2.peek().equippedToolId, null);
  assert.equal(store2.equippedTool(), null);
  assert.equal(store2.consumeOnCapture(), null);
  assert.equal(save2.setCalls, 1);
  /* 通常消費: 1 減って即永続化 */
  const save3 = saveMock(gearWith("cho_net", 5));
  const store3 = tools.walletStore(save3, economyOn, () => "p1");
  assert.deepEqual(plain(store3.consumeOnCapture()), {type:"cho_net", remaining:4, broke:false, swapped:false});
  assert.deepEqual(save3.peek().tools, [{type:"cho_net", remaining:4}]);
});

test("walletStore gates fall back to unequipped", () => {
  /* economy が無い / 閉じている */
  assert.equal(tools.walletStore(saveMock(gearWith("cho_net", 5)), null, () => "p1").equippedTool(), null);
  assert.equal(tools.walletStore(saveMock(gearWith("cho_net", 5)), {on: () => false, currentRelease: () => 2}, () => "p1").equippedTool(), null);
  /* 道具の release が現在の release より先 (sweep_net は release 3) */
  assert.equal(tools.walletStore(saveMock(gearWith("sweep_net", 5)), economyOn, () => "p1").equippedTool(), null);
  /* 装備種の定義が無い (新しい端末が書いた id) */
  assert.equal(tools.walletStore(saveMock(gearWith("mystery_tool", 5)), economyOn, () => "p1").equippedTool(), null);
  /* 装備 id はあるが instance を 1 本も持っていない */
  assert.equal(tools.walletStore(saveMock({tools:[], equippedToolId:"cho_net", toolDex:{}}), economyOn, () => "p1").equippedTool(), null);
  /* 装備 id が無い */
  assert.equal(tools.walletStore(saveMock({tools:[{type:"cho_net", remaining:5}], equippedToolId:null, toolDex:{}}), economyOn, () => "p1").equippedTool(), null);
  /* profile が無い */
  assert.equal(tools.walletStore(saveMock(gearWith("cho_net", 5)), economyOn, () => null).equippedTool(), null);
  /* ゲートで倒れた間は consumeOnCapture も null で、永続化も走らない */
  const gated = saveMock(gearWith("sweep_net", 5));
  assert.equal(tools.walletStore(gated, economyOn, () => "p1").consumeOnCapture(), null);
  assert.equal(gated.setCalls, 0);
});

test("a store that reports unequipped leaves the roll byte-identical", () => {
  function run(){
    context.Math.random = seeded(555);
    const rnd = counting(seeded(777));
    const coll = {};
    const res = reward.onCorrect(coll, "eitango", 1, 1, null, 1, {random:rnd});
    delete context.Math.random;
    return {res, calls:rnd.calls, coll};
  }
  reward.setToolsStore({equippedTool: () => null, consumeOnCapture(){ throw new Error("未装備の間は消費してはならない"); }});
  const withStore = run();
  reward.setToolsStore(null);
  const withoutStore = run();
  assert.equal(JSON.stringify(withStore.res), JSON.stringify(withoutStore.res));
  assert.equal(JSON.stringify(withStore.coll), JSON.stringify(withoutStore.coll));
  assert.equal(withStore.calls, withoutStore.calls);
  assert.ok(!("toolUse" in withStore.res));
});

/* setNight は一度呼ぶと戻せない (_nightActive が立ちきり) ため、この test は最後 */
test("night weights multiply with guild weights", () => {
  const moth = {id:"tn_ga", rarity:"N", order:"Lepidoptera", tags:["moth"]};
  const dragonfly = {id:"tn_tombo", rarity:"N", order:"Odonata"};
  const p = [moth, dragonfly];
  const instance = {type:"tonbo_net", remaining:10};
  reward.setNight(true);
  function pick(values, opts){
    let i = 0;
    return rollDirect(p, null, 1, () => values[i++], opts);
  }
  /* 夜: 夜行 2.5 × guild 1 = 2.5、昼行 1 × guild 3 = 3。境界は 2.5/5.5 */
  const withTool = 2.5/5.5;
  assert.equal(pick([0.5, withTool-0.01], {tool:instance}).id, "tn_ga");
  assert.equal(pick([0.5, withTool+0.01], {tool:instance}).id, "tn_tombo");
  /* 道具なしの夜は従来の 2.5/3.5 境界のまま (回帰確認) */
  const withoutTool = 2.5/3.5;
  assert.equal(pick([0.5, withoutTool-0.01]).id, "tn_ga");
  assert.equal(pick([0.5, withoutTool+0.01]).id, "tn_tombo");
});

console.log(`RESULT ${passed} passed, 0 failed`);
