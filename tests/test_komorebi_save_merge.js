/* 保存の競合解決 (komorebi/app.js の mergeProfileCatches)。二台で遊んで CAS が
   弾かれたとき、remote 側の奉納・道具・メダルが黙って消えないことを見る。
   「獲得の記録は不滅」「コレクションを奪う操作は存在しない」(tools_design 2 章
   不変条件 4 と 6) は、競合経路でも同じように守られなければならない。
   node tests/test_komorebi_save_merge.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

const context = { console, setTimeout, clearTimeout };
context.window = context;
context.Q4B_KOMOREBI_NO_BOOT = true;
context.Q4B_KOMOREBI_TEST_HOOKS = true;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js",
  "komorebi/trophies.js", "komorebi/tools.js", "komorebi/uro.js",
  "komorebi/economy_flag.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const komorebi = context.Q4B_KOMOREBI;
const merge = (local, remote) => komorebi.mergeProfiles(local, remote);
const clone = value => JSON.parse(JSON.stringify(value));

function offering(cat, lap, date, tool){
  return { cat, speciesId: "oo_onaga_yamamayu", lap, date, tool };
}

/* ---- 奉納ログ ---- */

test("both sides of the offering log survive a conflict", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.uroLog = [offering("kom_ratio", 1, "2026-08-17", "cho_net")];
  remote.uroLog = [offering("kom_pi314", 1, "2026-08-18", "light_trap")];
  const merged = merge(local, remote);
  assert.equal(merged.uroLog.length, 2, "片側の奉納が消えた");
  assert.equal(merged.uroLog.map(entry => entry.cat).join(","), "kom_ratio,kom_pi314");
  /* 並びは日付順。記録の順序が端末ごとに違って見えるのは避ける。 */
  assert.equal(merged.uroLog.map(entry => entry.date).join(","), "2026-08-17,2026-08-18");
});

test("the same offering seen from two devices is written once", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  const entry = offering("kom_ratio", 1, "2026-08-17", "cho_net");
  local.uroLog = [clone(entry)];
  remote.uroLog = [clone(entry)];
  assert.equal(merge(local, remote).uroLog.length, 1, "同じ奉納が 2 行に増えた");
});

test("the two offerings of one lap fall on the same day, and both survive", () => {
  /* 2 周目以降は 1 度の鋳造で 2 枚出て、その 2 枚は同じ日に続けて捧げられる。
     cat + 周回 + 日付だけを鍵にすると 2 行が 1 行に潰れ、記録が消えるうえに
     捧げ待ちが 1 枚増えて道具がもう 1 つ出てしまう。 */
  const lap2 = komorebi.createProfile();
  lap2.uroLog = [offering("kom_ratio", 1, "2026-08-17", "cho_net"),
    offering("kom_ratio", 2, "2026-09-01", "cho_net"),
    offering("kom_ratio", 2, "2026-09-01", "light_trap")];
  assert.equal(merge(lap2, komorebi.createProfile()).uroLog.length, 3, "同じ日の 2 枚が 1 行に潰れた");
  /* 同じ道具を 2 つ選んだ場合も 2 行のまま。 */
  const twice = komorebi.createProfile();
  twice.uroLog = [offering("kom_ratio", 2, "2026-09-01", "cho_net"),
    offering("kom_ratio", 2, "2026-09-01", "cho_net")];
  assert.equal(merge(twice, komorebi.createProfile()).uroLog.length, 2);
  /* 片側にしか届いていない 2 枚目も残る (どちらを local にしても同じ)。 */
  const half = komorebi.createProfile();
  half.uroLog = [offering("kom_ratio", 2, "2026-09-01", "cho_net")];
  assert.equal(merge(half, twice).uroLog.length, 2);
  assert.equal(merge(twice, half).uroLog.length, 2);
});

test("two laps of one category keep two rows, and so does a same-lap clash", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.uroLog = [offering("kom_ratio", 1, "2026-08-17", "cho_net"),
    offering("kom_ratio", 2, "2026-09-01", "light_trap")];
  remote.uroLog = [offering("kom_ratio", 1, "2026-08-17", "cho_net")];
  assert.equal(merge(local, remote).uroLog.length, 2, "周回の星が失われた");
  /* 同じ周回を別の日に捧げた記録が来たら、片方を消すより 2 行残すほうを選ぶ。 */
  const split = komorebi.createProfile();
  split.uroLog = [offering("kom_ratio", 1, "2026-08-18", "banana_trap")];
  assert.equal(merge(local, split).uroLog.length, 3);
});

/* ---- 道具箱 ---- */

test("a tool box never shrinks through a conflict", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.tools = [{ type: "cho_net", remaining: 12 }];
  remote.tools = [{ type: "light_trap", remaining: 30 }, { type: "banana_trap", remaining: 30 }];
  const merged = merge(local, remote);
  assert.equal(merged.tools.length, 3, "別の端末で授かった道具が消えた");
  const types = merged.tools.map(tool => tool.type).sort();
  assert.equal(types.join(","), "banana_trap,cho_net,light_trap");
});

test("tools merge one instance at a time, so a fresh one never loses to worn copies", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  /* 件数が違えば多い側。片側で壊した 1 本が古い写しで戻ることはあるが、
     授かった 1 本が競合で消えるほうは起こさない。 */
  local.tools = [{ type: "cho_net", remaining: 3 }, { type: "cho_net", remaining: 30 }];
  remote.tools = [{ type: "cho_net", remaining: 30 }];
  assert.equal(merge(local, remote).tools.length, 2);
  assert.equal(merge(remote, local).tools.length, 2, "local と remote を入れ替えても同じ");
  /* 同数なら残りの大きい側。減った側を正としない。 */
  const worn = komorebi.createProfile(), fresh = komorebi.createProfile();
  worn.tools = [{ type: "cho_net", remaining: 4 }];
  fresh.tools = [{ type: "cho_net", remaining: 28 }];
  assert.equal(merge(worn, fresh).tools[0].remaining, 28);
  assert.equal(merge(fresh, worn).tools[0].remaining, 28);
  /* 授かったばかりの 1 本は、本数だけ多い壊れかけの写しに負けない。丸ごと片側を
     採ると、メダルを払ったのに何も残らない結果になる。 */
  const justGranted = komorebi.createProfile(), nearlyBroken = komorebi.createProfile();
  justGranted.tools = [{ type: "cho_net", remaining: 30 }];
  nearlyBroken.tools = [{ type: "cho_net", remaining: 1 }, { type: "cho_net", remaining: 1 }];
  [merge(justGranted, nearlyBroken), merge(nearlyBroken, justGranted)].forEach(merged => {
    const left = merged.tools.map(tool => tool.remaining).sort((a, b) => b - a);
    assert.equal(left.length, 2, "本数が減った");
    assert.equal(left[0], 30, "授かったばかりの 1 本が壊れかけの写しに負けた");
  });
});

test("the equipped slot follows the local choice, or repairs itself", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.tools = [{ type: "cho_net", remaining: 12 }];
  local.equippedToolId = "cho_net";
  remote.tools = [{ type: "light_trap", remaining: 30 }];
  remote.equippedToolId = "light_trap";
  assert.equal(merge(local, remote).equippedToolId, "cho_net", "手に持っていた道具が入れ替わった");
  /* local が何も装備していなければ remote の選択を受ける。 */
  local.equippedToolId = null;
  assert.equal(merge(local, remote).equippedToolId, "light_trap");
  /* 本体の無い装備は黙って外す (道具そのものは残るので選び直せる)。 */
  const dangling = komorebi.createProfile();
  dangling.equippedToolId = "cho_net";
  assert.equal(merge(dangling, komorebi.createProfile()).equippedToolId, null);
});

/* ---- メダルと周回の起点 ---- */

test("a medal minted on either device is still there after the merge", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.trophies = { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-17" } };
  remote.trophies = { madagascar_pi314: { cat: "kom_pi314", speciesId: "medama_yamamayu", at: "2026-08-18" } };
  const merged = merge(local, remote);
  assert.equal(Object.keys(merged.trophies).sort().join(","), "madagascar_pi314,madagascar_ratio");
  /* 同じ銘が両側にあるときは先に成立したほうの日付を残す。 */
  const early = komorebi.createProfile(), late = komorebi.createProfile();
  early.trophies = { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-10" } };
  late.trophies = { madagascar_ratio: { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-20" } };
  assert.equal(merge(early, late).trophies.madagascar_ratio.at, "2026-08-10");
  assert.equal(merge(late, early).trophies.madagascar_ratio.at, "2026-08-10");
});

test("the stability window keeps the side that got further", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.trophyProgress = { kom_ratio: { n: 4, recent: [1, 1, 1, 1] } };
  remote.trophyProgress = { kom_ratio: { n: 18, recent: new Array(18).fill(1) } };
  assert.equal(merge(local, remote).trophyProgress.kom_ratio.n, 18, "安定判定の積み上げが競合で捨てられた");
  assert.equal(merge(remote, local).trophyProgress.kom_ratio.n, 18);
});

test("the reset lock starts from the most recent level ten clear", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.lv10ClearAt = { kom_ratio: "2026-08-10T00:00:00.000Z" };
  remote.lv10ClearAt = { kom_ratio: "2026-08-17T00:00:00.000Z", kom_pi314: "2026-08-18T00:00:00.000Z" };
  const merged = merge(local, remote);
  assert.equal(merged.lv10ClearAt.kom_ratio, "2026-08-17T00:00:00.000Z", "古い記録でロックが早く明ける");
  assert.equal(merged.lv10ClearAt.kom_pi314, "2026-08-18T00:00:00.000Z");
});

test("a reset done on the other device is replayed here, not just counted", () => {
  /* 周回番号だけ進んで Lv と安定判定の窓が前の周のまま残ると、Lv10 に居るだけで
     次の周のメダルが即座に成立する (競合を起こすだけで 2 枚もらえる穴)。 */
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.lv.kom_ratio = 10; local.maxLv.kom_ratio = 10;
  local.adapt.kom_ratio = { n: 40, recent: new Array(10).fill(1) };
  local.trophyProgress.kom_ratio = { n: 20, recent: new Array(20).fill(1) };
  local.mintedLaps.kom_ratio = 1;
  remote.lv.kom_ratio = 1; remote.maxLv.kom_ratio = 10;
  remote.lapCount.kom_ratio = 2;
  remote.mintedLaps.kom_ratio = 1;
  const merged = merge(local, remote);
  assert.equal(merged.lapCount.kom_ratio, 2);
  assert.equal(merged.lv.kom_ratio, 1, "向こうのリセットが Lv に通っていない");
  assert.equal(merged.adapt.kom_ratio.n, 0, "昇降の窓が前の周のまま残った");
  assert.equal(merged.trophyProgress.kom_ratio.n, 0, "安定判定の窓が前の周のまま残った");
  /* 到達 Lv と図鑑は戻さない。戻すのは Lv の進行だけ。 */
  assert.equal(merged.maxLv.kom_ratio, 10);
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  assert.equal(trophies.qualifies(merged, "kom_ratio"), false, "統合しただけで鋳造が成立する");
  assert.equal(trophies.award(merged, "kom_ratio", "2026-09-01"), null);
});

test("a reset done on this device is not undone by the other device's stale window", () => {
  /* 手元がリセット済み、向こうが前の周のまま。安定判定を「進んだ側」だけで選ぶと
     リセット前の 20 問が次の周の実績に化け、Lv1 のまま次の答えで 2 枚成立する。 */
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.lv.kom_ratio = 1; local.maxLv.kom_ratio = 10;
  local.adapt.kom_ratio = { n: 0, recent: [] };
  local.trophyProgress.kom_ratio = { n: 0, recent: [] };
  local.lapCount.kom_ratio = 2; local.mintedLaps.kom_ratio = 1;
  remote.lv.kom_ratio = 10; remote.maxLv.kom_ratio = 10;
  remote.adapt.kom_ratio = { n: 250, recent: new Array(10).fill(1) };
  remote.trophyProgress.kom_ratio = { n: 25, recent: new Array(20).fill(1) };
  remote.lapCount.kom_ratio = 1; remote.mintedLaps.kom_ratio = 1;
  const merged = merge(local, remote);
  assert.equal(merged.lapCount.kom_ratio, 2);
  assert.equal(merged.lv.kom_ratio, 1, "自分のリセットが向こうの古い Lv で消えた");
  assert.equal(merged.trophyProgress.kom_ratio.n, 0, "前の周の 20 問が持ち込まれた");
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  assert.equal(trophies.qualifies(merged, "kom_ratio"), false, "統合しただけで鋳造が成立する");
  assert.equal(trophies.award(merged, "kom_ratio", "2026-09-01"), null);
});

test("a lap the remote already relearned is not demoted back to level one", () => {
  /* 向こうがリセット後に Lv10 まで戻していたら、その周回の進みをそのまま採る。 */
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.lv.kom_ratio = 10; local.maxLv.kom_ratio = 10;
  local.trophyProgress.kom_ratio = { n: 25, recent: new Array(20).fill(1) };
  remote.lv.kom_ratio = 9; remote.maxLv.kom_ratio = 10;
  remote.adapt.kom_ratio = { n: 90, recent: [1, 1, 1] };
  remote.trophyProgress.kom_ratio = { n: 6, recent: [1, 1, 1, 1, 1, 1] };
  remote.lapCount.kom_ratio = 2; remote.mintedLaps.kom_ratio = 1;
  const merged = merge(local, remote);
  assert.equal(merged.lv.kom_ratio, 9, "向こうの周回の進みが Lv1 に潰れた");
  assert.equal(merged.adapt.kom_ratio.n, 90);
  assert.equal(merged.trophyProgress.kom_ratio.n, 6, "手元の前の周の窓が残った");
});

test("a lap the local device already ran keeps its own progress", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.lv.kom_ratio = 7; local.maxLv.kom_ratio = 10;
  local.adapt.kom_ratio = { n: 30, recent: [1, 1, 1] };
  local.lapCount.kom_ratio = 2; local.mintedLaps.kom_ratio = 1;
  remote.lv.kom_ratio = 4; remote.maxLv.kom_ratio = 10;
  remote.lapCount.kom_ratio = 2; remote.mintedLaps.kom_ratio = 1;
  const merged = merge(local, remote);
  assert.equal(merged.lv.kom_ratio, 7, "自分で走っていた周回の Lv が巻き戻った");
  assert.equal(merged.adapt.kom_ratio.n, 30);
});

test("the highest level reached is never rolled back by a merge", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.lv.kom_ratio = 3; local.maxLv.kom_ratio = 3;
  remote.lv.kom_ratio = 10; remote.maxLv.kom_ratio = 10;
  const merged = merge(local, remote);
  assert.equal(merged.maxLv.kom_ratio, 10);
  /* 到達 Lv が現在 Lv を下回るセーブは作らない (normalizeProfile が弾く形)。 */
  assert.equal(komorebi.normalizeProfile(clone(merged)).profile.maxLv.kom_ratio, 10);
});

/* ---- 捕獲の union は元のまま ---- */

test("the catch merge still unions records and recounts the total", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.collection.catches = { ameiro_tonbo: { n: 1, records: [{ size: 40 }] } };
  local.collection.totalCatches = 1;
  remote.collection.catches = { ameiro_tonbo: { n: 1, records: [{ size: 55 }] },
    oo_onaga_yamamayu: { n: 1, records: [{ size: 120 }] } };
  remote.collection.totalCatches = 2;
  const merged = merge(local, remote);
  assert.equal(merged.collection.catches.ameiro_tonbo.n, 2);
  assert.equal(merged.collection.catches.ameiro_tonbo.max, 55);
  assert.equal(merged.collection.catches.ameiro_tonbo.min, 40);
  assert.equal(merged.collection.totalCatches, 3);
});

test("a merged profile is still a profile the loader accepts", () => {
  const local = komorebi.createProfile();
  const remote = komorebi.createProfile();
  local.uroLog = [offering("kom_ratio", 1, "2026-08-17", "cho_net")];
  local.tools = [{ type: "cho_net", remaining: 12 }];
  local.equippedToolId = "cho_net";
  remote.uroLog = [offering("kom_pi314", 1, "2026-08-18", "light_trap")];
  remote.tools = [{ type: "light_trap", remaining: 30 }];
  remote.trophies = { madagascar_pi314: { cat: "kom_pi314", speciesId: "medama_yamamayu", at: "2026-08-18" } };
  const merged = komorebi.normalizeProfile(clone(merge(local, remote)));
  assert.equal(merged.profile.uroLog.length, 2);
  assert.equal(merged.profile.tools.length, 2);
  assert.equal(merged.profile.equippedToolId, "cho_net");
  /* 1 度読めば落ち着く。2 度目で書き戻しが起きるなら、毎回の保存が止まらない。
     (1 度目は向こうのメダルにロックの起点を埋める migration が走る。) */
  const again = komorebi.normalizeProfile(clone(merged.profile));
  assert.equal(again.changed, false, "統合した結果が読むたびに書き換わる");
});

/* ---- 実際の保存経路 (CAS の衝突 → 再保存) ---- */

(async () => {
  const live = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = live.Q4B_KOMOREBI;
  const volume = live.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const profile = app.profile();

  /* 手元では道具を授かって奉納した。同じ間に別の端末が別のメダルを捧げていた、
     という並びを保存の裏で作る。 */
  profile.uroLog.push(offering("kom_ratio", 1, "2026-08-17", "cho_net"));
  profile.tools.push({ type: "cho_net", remaining: 30 });
  profile.equippedToolId = "cho_net";

  const remote = JSON.parse(JSON.stringify(profile));
  remote.uroLog = [offering("kom_pi314", 1, "2026-08-18", "light_trap")];
  remote.tools = [{ type: "light_trap", remaining: 30 }];
  remote.equippedToolId = "light_trap";
  remote.trophies = { madagascar_pi314: { cat: "kom_pi314", speciesId: "medama_yamamayu", at: "2026-08-18" } };
  live.__saved.komorebi = remote;

  /* 次の 1 回だけ競合させる (CAS の revision が進んだ状態を作る)。 */
  const saveVersioned = live.QuestSave.saveVersioned;
  let conflicted = false;
  live.QuestSave.saveVersioned = function(game, id, state, expectedRevision){
    if(!conflicted){ conflicted = true; return Promise.resolve({ ok: false, reason: "conflict" }); }
    return saveVersioned.call(this, game, id, state, expectedRevision);
  };

  await app.recordAnswer("kom_ratio",
    { sessionId: "merge", submissionId: "m-1", format: "normal", kind: "num", correct: true, final: true },
    volume, () => 0.5);
  await settle();
  live.QuestSave.saveVersioned = saveVersioned;

  test("a real save conflict keeps both devices' offerings, tools and medals", () => {
    const after = app.profile();
    assert.equal(conflicted, true, "競合を通っていない");
    assert.equal(after.uroLog.length, 2, "競合で奉納の記録が消えた");
    assert.equal(after.uroLog.map(entry => entry.cat).sort().join(","), "kom_pi314,kom_ratio");
    assert.equal(after.tools.length, 2, "競合で道具が消えた");
    assert.ok(after.trophies.madagascar_pi314, "競合でメダルが消えた");
    /* 保存された中身も同じ。画面だけ直って保存が古いまま、にしない。 */
    assert.equal(live.__saved.komorebi.uroLog.length, 2);
    assert.equal(live.__saved.komorebi.tools.length, 2);
  });

  await (async () => {
    /* 競合を解いたあとの再送に失敗したとき。呼び出し側は手元の profile を巻き戻すので、
       ここで revision まで向こうに合わせてしまうと、次の保存が競合なしで通り、
       向こうの記録を知らない古い profile がそのまま上書きしてしまう。 */
    const beforeRows = live.__saved.komorebi.uroLog.length;
    const saveVersionedNow = live.QuestSave.saveVersioned;
    let calls = 0;
    live.QuestSave.saveVersioned = function(){
      calls++;
      if(calls === 1) return Promise.resolve({ ok: false, reason: "conflict" });
      if(calls === 2) return Promise.reject(new Error("boom"));
      return saveVersionedNow.apply(this, arguments);
    };
    let failed = false;
    await app.recordAnswer("kom_ratio",
      { sessionId: "merge", submissionId: "m-2", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5).catch(() => { failed = true; });
    /* 次の保存はまだ古い revision で出るので、もう一度競合して統合をやり直す。 */
    await app.recordAnswer("kom_ratio",
      { sessionId: "merge", submissionId: "m-3", format: "normal", kind: "num", correct: true, final: true },
      volume, () => 0.5).catch(() => {});
    await settle();
    live.QuestSave.saveVersioned = saveVersionedNow;

    test("a failed retry does not let the next save overwrite the other device", () => {
      assert.equal(failed, true, "再送の失敗が呼び出し側へ届いていない");
      assert.ok(live.__saved.komorebi.uroLog.length >= beforeRows,
        "巻き戻した profile が向こうの奉納を上書きした");
      assert.ok(live.__saved.komorebi.trophies.madagascar_pi314, "巻き戻した profile がメダルを消した");
    });
  })();

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
