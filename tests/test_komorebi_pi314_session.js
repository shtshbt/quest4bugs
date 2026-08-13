/* 3.14 の段を画面から遊ぶテスト。公開は更新 2 なので通常は選択肢に出ないが、
   「実装済み未公開」のまま放置すると解禁の日に初めて壊れているとわかる。
   開始関数を直接叩いて 5 問を通し、解禁時に動く状態であることを固定する。

   答えは画面の文面だけから再計算する。内部状態を覗かないことで、出題が
   それ単体で解ける形になっていること自体を検証している。
   node tests/test_komorebi_pi314_session.js で実行。 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/* 3.14 を浮動小数で掛けない。生成器と同じく 1000 分の 1 単位の整数で解く。 */
const BASE = 3140;
function milliOf(text){
  const digits = text.replace(/[^0-9.]/g, "");
  const [whole, fraction = ""] = digits.split(".");
  return Number(whole) * 1000 + Number((fraction + "000").slice(0, 3));
}

/* 画面の式を読んで答えを出す。生成器の内部には触れない。 */
function solve(body){
  let m;
  if((m = /3\.14×(\d+) \+ 3\.14×(\d+) \+ 3\.14×(\d+) = □/.exec(body)))
    return BASE * (Number(m[1]) + Number(m[2]) + Number(m[3])) / 1000;
  if((m = /3\.14×(\d+) ([+-]) 3\.14×(\d+) = □/.exec(body)))
    return BASE * (m[2] === "+" ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])) / 1000;
  if((m = /3\.14×(\d+) ÷ 2 = □/.exec(body))) return BASE * (Number(m[1]) / 2) / 1000;
  if((m = /([\d.]+) ÷ 3\.14 = □/.exec(body))) return milliOf(m[1]) / BASE;
  if((m = /3\.14×□ = ([\d.]+)/.exec(body))) return milliOf(m[1]) / BASE;
  if((m = /(3\.14|31\.4|0\.314)×(\d+) は/.exec(body))){
    const base = m[1] === "3.14" ? 3140 : m[1] === "31.4" ? 31400 : 314;
    return base * Number(m[2]) / 1000;
  }
  throw new Error("画面から式を読めなかった: " + body.slice(0, 120));
}

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia;
  const plain = () => plainText(app.innerHTML);

  test("the category is implemented but held back until its update", () => {
    assert.equal(komorebi.categories.kom_pi314.release, 2);
    assert.equal(komorebi.isReleased("kom_pi314"), false);
    assert.ok(komorebi.sessionStarters.kom_pi314, "the starter must exist even while unreleased");
    assert.equal(volume.categories.indexOf("kom_pi314") >= 0, true, "the fixture volume should list it already");
  });

  async function play(lv){
    const profile = komorebi.profile();
    profile.lv.kom_pi314 = lv;
    profile.maxLv.kom_pi314 = Math.max(profile.maxLv.kom_pi314, lv);
    let seed = 1000 + lv;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    await komorebi.sessionStarters.kom_pi314(volume, random);
    const seen = [];
    for(let index = 0; index < 5; index++){
      const body = plain();
      assert.match(body, new RegExp("第" + (index + 1) + "／5問"), "did not reach question " + (index + 1) + " of Lv" + lv);
      seen.push(body);
      const form = app.querySelector("[data-answer-form]");
      assert.ok(form, "Lv" + lv + " question " + (index + 1) + " has no answer box: " + body.slice(0, 160));
      form.elements = { answer: { value: String(solve(body)) } };
      form.submit();
      await settle();
      assert.match(plain(), /正解！/, "Lv" + lv + " question " + (index + 1) + " was not judged correct: " + plain().slice(0, 200));
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next);
      next.click();
      await settle();
    }
    return seen;
  }

  const lv1 = await play(1);

  test("a level one set is five recall questions answerable from the screen", () => {
    assert.equal(lv1.length, 5);
    lv1.forEach(body => assert.match(body, /3\.14×\d+ は いくつですか。/));
    const profile = komorebi.profile();
    assert.equal(profile.stats.kom_pi314.n, 5);
    assert.equal(profile.collection.gauge, 5, "the shared gauge should count the five correct answers");
  });

  const lv6 = await play(6);

  test("a level six set leads with scaffolded squares", () => {
    /* 足場は先頭 2 問。技を見せてから外す順序が崩れると足場の意味が消える。 */
    const scaffolded = lv6.filter(body => /です。/.test(body));
    assert.equal(scaffolded.length, 2, "level six should scaffold exactly two questions");
    assert.ok(/です。/.test(lv6[0]) && /です。/.test(lv6[1]), "the scaffolded questions must come first");
    lv6.forEach(body => assert.match(body, /3\.14×(16|25|36|49|64|81) は/));
  });

  const lv8 = await play(8);

  test("a level eight set is mostly the division form the child meets on paper", () => {
    const divisions = lv8.filter(body => /÷ 3\.14 = □/.test(body)).length;
    const structures = lv8.filter(body => /3\.14×□ = /.test(body)).length;
    assert.equal(divisions, 3, "the division form must dominate: " + divisions);
    assert.equal(structures, 2);
  });

  test("nothing leaked into the other categories", () => {
    const profile = komorebi.profile();
    assert.equal(profile.stats.kom_pi314.n, 15);
    assert.equal(profile.stats.kom_ratio, undefined);
    assert.equal(profile.stats.kom_kuku_run, undefined);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
