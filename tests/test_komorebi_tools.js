/* 採集道具 (shared/tools.js) の単体。matcher は「実在の採集法に対応させる」という
   決定 (tools_design 6 章) の実装なので、guild ごとの当たり数を MG I の実データで
   固定する。当たり数が動いたら、種データの語彙か matcher のどちらかが変わっている。
   instance 側は耐久の境界 (満タン → 0)、破損、同種予備への自動持ち替えを見る。
   node tests/test_komorebi_tools.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { console };
context.window = context;
context.global = context;
vm.createContext(context);
for(const file of ["shared/bugs.js", "komorebi/volumes/volume_fixture.js", "shared/tools.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const tools = context.Q4B_TOOLS;
/* 耐久は調整値。数字を直に書くと、balance を動かすたびにテストが落ちる。
   定数そのものを固定する検査は 1 か所だけ置き、他はこの D を使う。 */
const D = tools.durability;
const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
const catalog = new Map(context.Q4B_BUGS.map(sp => [sp.id, sp]));
const mgSpecies = volume.species.map(entry => catalog.get(entry.id)).filter(Boolean);

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function hits(toolId){ return mgSpecies.filter(sp => tools.matches(toolId, sp)).length; }

test("the eleven tools are declared once each with the fields the UI needs", () => {
  const list = tools.list();
  assert.equal(list.length, 11, "tools_design 6 章は 11 種で打ち止め");
  const ids = new Set();
  list.forEach(tool => {
    assert.equal(ids.has(tool.id), false, tool.id + " is declared twice");
    ids.add(tool.id);
    ["id", "name", "emoji", "guild", "blurb", "breakText"].forEach(key => {
      assert.equal(typeof tool[key], "string", tool.id + " has no " + key);
      assert.ok(tool[key].length > 0, tool.id + " has an empty " + key);
    });
    assert.equal(Number.isInteger(tool.release), true, tool.id + " has no release number");
    assert.ok(tool.release >= 1, tool.id + " has a nonsensical release number");
    assert.equal(typeof tool.match, "function", tool.id + " has no matcher");
    /* ダッシュ記号は子ども向け文言に出さない。 */
    assert.equal(/[—–]/.test(tool.blurb + tool.guild + tool.breakText), false, tool.id + " uses a dash");
  });
  /* 全図鑑に効かせる前提の調整値 (2026-08-20)。変えるときは意図的に変えること。 */
  assert.equal(tools.durability, 100);
});

test("the first four purchasable tools all have targets in Madagascar I", () => {
  /* 交換画面に「この遠征では出番がない」しか並ばない状態を作らない (design 6 章)。
     先行 4 種は MG I に対象種がいる組で確定 (Phase 0 監査)。 */
  const early = tools.list().filter(tool => tool.release === 2).map(tool => tool.id);
  assert.equal(early.join(","), "cho_net,tonbo_net,light_trap,banana_trap");
  early.forEach(id => assert.ok(hits(id) > 0, id + " has no target species in Madagascar I"));
});

test("each guild matcher lands on the number of Madagascar I species it should", () => {
  /* habitat の語彙はデータの実語彙 (pond / marsh / stream / river / paddy)。
     設計書の総称語 (aquatic / wetland) では 1 種も当たらない。 */
  assert.equal(hits("cho_net"), 16);
  assert.equal(hits("tonbo_net"), 29);
  assert.equal(hits("light_trap"), 7);
  assert.equal(hits("banana_trap"), 9);
  assert.equal(hits("water_net"), 35);
  assert.equal(hits("sweep_net"), 8);
  assert.equal(hits("beating_set"), 3);
  assert.equal(hits("aspirator"), 13);
  /* 高所とフンは MG I に対象がいない。だから未公開のまま置いてある。 */
  assert.equal(hits("long_pole"), 0);
  assert.equal(hits("dung_trap"), 0);
});

test("a matcher reads the species record, never the volume manifest", () => {
  assert.equal(tools.matches("tonbo_net", catalog.get("ameiro_tonbo")), true);
  assert.equal(tools.matches("tonbo_net", catalog.get("oo_onaga_yamamayu")), false);
  assert.equal(tools.matches("light_trap", catalog.get("oo_onaga_yamamayu")), true);
  assert.equal(tools.matches("cho_net", catalog.get("hagata_murasaki")), true);
  /* 種データが引けないときは「対象でない」に倒す。1 種の欠けで捕獲は止めない。 */
  assert.equal(tools.matches("cho_net", null), false);
  assert.equal(tools.matches("cho_net", undefined), false);
  assert.equal(tools.matches("no_such_tool", catalog.get("hagata_murasaki")), false);
});

test("a granted tool is owned, auto equipped only when nothing is equipped", () => {
  const profile = { tools: [], equippedToolId: null };
  tools.grant(profile, "cho_net");
  assert.equal(profile.equippedToolId, "cho_net");
  assert.equal(JSON.stringify(profile.tools), JSON.stringify([{ type: "cho_net", remaining: D }]));
  tools.grant(profile, "light_trap");
  assert.equal(profile.equippedToolId, "cho_net", "a grant must not steal the equipped slot");
  assert.equal(profile.tools.length, 2);
  assert.equal(tools.equippedTool(profile).id, "cho_net");
  assert.throws(() => tools.grant(profile, "no_such_tool"), /道具の指定/);
});

test("equipping is one slot and only for tools that are owned", () => {
  const profile = { tools: [], equippedToolId: null };
  tools.grant(profile, "cho_net");
  assert.equal(tools.equip(profile, "light_trap"), false, "an unowned tool must not be equippable");
  assert.equal(profile.equippedToolId, "cho_net");
  tools.grant(profile, "light_trap");
  assert.equal(tools.equip(profile, "light_trap"), true);
  assert.equal(tools.equippedTool(profile).id, "light_trap");
  tools.equip(profile, null);
  assert.equal(profile.equippedToolId, null);
  assert.equal(tools.equipped(profile), null);
  assert.equal(tools.equippedTool(profile), null);
});

test("nothing is consumed while nothing is equipped", () => {
  const profile = { tools: [{ type: "cho_net", remaining: D }], equippedToolId: null };
  assert.equal(tools.consume(profile), null);
  assert.equal(profile.tools[0].remaining, D, "an unequipped tool must never wear out");
});

test("durability runs the full count down to 0 and the last capture breaks it", () => {
  const profile = { tools: [], equippedToolId: null };
  tools.grant(profile, "cho_net");
  for(let i = 1; i < D; i++){
    const use = tools.consume(profile);
    assert.equal(use.remaining, D - i);
    assert.equal(use.broke, false);
  }
  const last = tools.consume(profile);
  assert.equal(last.broke, true, "the thirtieth capture must break the net");
  assert.equal(last.swapped, false);
  assert.equal(profile.tools.length, 0, "a broken tool leaves the box");
  assert.equal(profile.equippedToolId, null, "with no spare the slot goes empty");
  assert.equal(tools.consume(profile), null);
});

test("a spare of the same kind is picked up without asking", () => {
  const profile = { tools: [], equippedToolId: null };
  tools.grant(profile, "cho_net");
  tools.grant(profile, "cho_net");
  profile.tools[0].remaining = 1;
  const use = tools.consume(profile);
  assert.equal(use.broke, true);
  assert.equal(use.swapped, true, "the spare must be picked up automatically");
  assert.equal(use.remaining, D, "the spare is the fresh one now in hand");
  assert.equal(profile.equippedToolId, "cho_net");
  assert.equal(profile.tools.length, 1);
  /* 別の種類の道具は代わりに装備しない。狩りの途中で勝手に持ち物が変わらない。 */
  const other = { tools: [{ type: "cho_net", remaining: 1 }, { type: "light_trap", remaining: D }], equippedToolId: "cho_net" };
  const broke = tools.consume(other);
  assert.equal(broke.swapped, false);
  assert.equal(other.equippedToolId, null);
  assert.equal(other.tools.length, 1);
});

test("instances of the same kind wear out one at a time", () => {
  const profile = { tools: [], equippedToolId: null };
  tools.grant(profile, "light_trap");
  tools.grant(profile, "light_trap");
  tools.consume(profile);
  assert.equal(profile.tools.map(item => item.remaining).join(","), (D - 1) + "," + D, "the second light set must be untouched");
  assert.equal(tools.ownedOf(profile, "light_trap").length, 2);
});

test("a broken save shape is refused instead of being silently repaired", () => {
  assert.equal(tools.validateTools([]).length, 0);
  assert.equal(JSON.stringify(tools.validateTools([{ type: "cho_net", remaining: 1 }])), '[{"type":"cho_net","remaining":1}]');
  [
    {},
    [{ type: "cho_net" }],
    [{ type: "" , remaining: 3 }],
    [{ type: "cho_net", remaining: 0 }],
    [{ type: "cho_net", remaining: -1 }],
    [{ type: "cho_net", remaining: 1.5 }],
    [null]
  ].forEach(broken => assert.throws(() => tools.validateTools(broken), /道具データ/, JSON.stringify(broken)));
});

test("a tool instance for a kind this build does not know yet is carried, not refused", () => {
  /* 道具箱は先の更新で増える台帳。新しい道具を知っている端末が書いた instance を
     古い端末が読むことがあり、そこで throw するとその端末は競合解決ごと動かなくなる
     (validateDex の「知らない道具の id は素通しする」方針と同じ)。 */
  const future = [{ type: "cho_net", remaining: 12 }, { type: "malaise_trap", remaining: D }];
  const kept = tools.validateTools(future);
  assert.equal(kept.length, 2, "知らない道具の instance が消えた");
  assert.equal(kept[1].type, "malaise_trap");
  assert.equal(kept[1].remaining, D);
  /* 知らない道具の耐久上限は分からないので、丸めは効かせない (既知の道具にだけ効く)。 */
  const untouched = tools.validateTools([{ type: "malaise_trap", remaining: 999 }]);
  assert.equal(untouched[0].remaining, 999, "知らない道具の残量が丸められた");
  /* 形の誤り (種類が無い、残量が壊れている) は、知らない道具でも通さない。 */
  [{ type: "malaise_trap" }, { type: "malaise_trap", remaining: 0 }, { type: "malaise_trap", remaining: 1.5 }]
    .forEach(entry => assert.throws(() => tools.validateTools([entry]), /道具データ/, JSON.stringify(entry)));
});

test("a remaining life above the current durability is clamped, not refused", () => {
  /* 耐久を後から下げたとき、それ以前に配った道具を持っている子のセーブが丸ごと
     読めなくなるのは仕様変更の側の問題。上限へ丸めて通す (dangling equip の
     自己修復と同じ方針)。 */
  const save = [{ type: "cho_net", remaining: tools.durability + 1 }, { type: "light_trap", remaining: 999 }];
  const fixed = tools.validateTools(save);
  assert.deepEqual(fixed.map(entry => entry.remaining), [tools.durability, tools.durability]);
  /* 引数そのものを直す (呼び出し側が別の配列を持ち歩かなくてよい)。 */
  assert.equal(save[0].remaining, tools.durability);
});

console.log(`RESULT ${passed} passed, 0 failed`);
