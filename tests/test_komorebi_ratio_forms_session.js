/* 割合の表現変換を画面から 2 セッション (計 10 問) 解く配線テスト。問題オブジェクトは
   参照せず、問題文の数値だけから既約分数を作って答える。2 セッション目は短ループ carry
   (直前セットの台帳行が別方向で再登場する) の受け渡しを画面の文面で確かめる。
   node tests/test_komorebi_ratio_forms_session.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const files = KOMOREBI_FILES.slice();
files.splice(files.indexOf("komorebi/trophies.js"), 0, "komorebi/ratio_forms_generator.js");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function seeded(seed){
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files, profileType: "k10" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const originalVolume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia;
  const volume = Object.assign({}, originalVolume, { categories: originalVolume.categories.concat(["kom_ratio_forms"]) });
  const plain = () => plainText(app.innerHTML);

  function gcd(a, b){ return b ? gcd(b, a % b) : a; }
  /* Lv6 は全問 frac (帯 A と C、percent_to_fraction / decimal_to_fraction の 2 方向)。
     千分率 m を問題文から読み、m/1000 を既約にして答える。 */
  function readQuestion(){
    const body = plain();
    let match = /([\d.]+)% を分数で表しましょう/.exec(body);
    if(match) return { m: Math.round(Number(match[1]) * 10), direction: "percent" };
    match = /([\d.]+) を分数で表しましょう/.exec(body);
    assert.ok(match, "問題文から値を読めない: " + body.slice(0, 240));
    return { m: Math.round(Number(match[1]) * 1000), direction: "decimal" };
  }
  async function answerCurrent(){
    const q = readQuestion();
    const d = gcd(q.m, 1000);
    assert.ok(q.m < 1000, "帯 A/C の値が 1 を超えている: " + q.m);
    const form = app.querySelector("[data-answer-form]");
    assert.ok(form, "分数の回答フォームが描かれていない");
    form.elements = { whole: { value: "" }, num: { value: String(q.m / d) }, den: { value: String(1000 / d) } };
    form.submit();
    await settle();
    assert.match(plain(), /正解！/, "画面の文面から作った答えが通らない: " + plain().slice(0, 260));
    return q;
  }
  async function playSession(seed){
    await komorebi.sessionStarters.kom_ratio_forms(volume, seeded(seed));
    const asked = [];
    for(let index = 0; index < 5; index++){
      asked.push(await answerCurrent());
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next, "次へ進むボタンがない");
      next.click();
      await settle();
    }
    return asked;
  }

  /* 2026-08-28 に release 9 から更新 3 へ前倒し。巻あたり k10 2 本の下限を満たすため
     (更新 3 の k10 が kom_frac_flow 1 本だけだと、10 歳コースの子はボルネオ I の
     84 種を 1 カテゴリで消費し、残りはこはく購入でしか埋まらない)。 */
  test("the category shipped with update 3 and is open", () => {
    assert.equal(komorebi.categories.kom_ratio_forms.course, "k10");
    assert.equal(komorebi.categories.kom_ratio_forms.name, "割合の表現変換");
    assert.equal(komorebi.categories.kom_ratio_forms.maxLv, 10);
    assert.equal(komorebi.categories.kom_ratio_forms.release, 3);
    assert.equal(komorebi.isReleased("kom_ratio_forms"), true);
    assert.ok(komorebi.sessionStarters.kom_ratio_forms);
  });

  const profile = komorebi.profile();
  profile.lv.kom_ratio_forms = 6;
  profile.maxLv.kom_ratio_forms = 6;
  const first = await playSession(20260815);
  const second = await playSession(7);

  test("two five-question sessions are solvable from the rendered wording", () => {
    assert.equal(profile.stats.kom_ratio_forms.n, 10);
    assert.equal(profile.collection.gauge, 2);
    assert.equal(profile.collection.totalCatches, 1);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  test("the short-loop carry re-asks a first-session row in the other direction", () => {
    /* seed 7 を carry なしで生成すると方向をまたぐ再登場は 0 件 (テスト作成時に確認)。
       ここで見つかる組は buildSet の第 3 引数が渡っている証拠になる。 */
    const dir1 = new Map(first.map(q => [q.m, q.direction]));
    const flipped = second.filter(q => dir1.has(q.m) && dir1.get(q.m) !== q.direction);
    assert.ok(flipped.length >= 1, "直前セットの行が別方向で再登場していない: "
      + JSON.stringify(second));
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
