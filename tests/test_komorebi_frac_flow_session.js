/* 分数の解き方を画面から遊ぶテスト。倍速カレンダーで公開は更新 3。
   このカテゴリだけが整数部と分子と分母の 3 欄で答えを受け取る。約分の残りを
   名指しする経路と、仮分数でも帯分数でも通ることを画面側で押さえる。
   node tests/test_komorebi_frac_flow_session.js で実行。 */
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
  const komorebi = context.Q4B_KOMOREBI;
  const frac = context.Q4B_KOMOREBI_FRAC_FLOW;
  /* 分数の解き方は更新 3 = ボルネオ遠征 I のカテゴリ。ボルネオ遠征 I は実 manifest
     (release:3) になり kom_frac_flow を自前で挙げるので、写しを作らずそのまま使う。 */
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_borneo;
  const plain = () => plainText(app.innerHTML);

  function seeded(seed){
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  async function start(lv, seed){
    const profile = komorebi.profile();
    profile.lv.kom_frac_flow = lv;
    profile.maxLv.kom_frac_flow = Math.max(profile.maxLv.kom_frac_flow, lv);
    await komorebi.sessionStarters.kom_frac_flow(volume, seeded(seed));
  }
  function submitFraction(whole, num, den){
    const form = app.querySelector("[data-answer-form]");
    assert.ok(form, "分数の回答欄がない: " + plain().slice(0, 200));
    form.elements = { whole: { value: String(whole) }, num: { value: String(num) }, den: { value: String(den) } };
    form.submit();
  }
  function next(){
    const button = app.querySelector('[data-action="ratio-next"]');
    assert.ok(button, "次へ進めない");
    button.click();
  }

  test("the category is implemented but held back until its update", () => {
    assert.equal(komorebi.categories.kom_frac_flow.release, 3);
    assert.equal(komorebi.isReleased("kom_frac_flow"), false);
    assert.ok(komorebi.sessionStarters.kom_frac_flow);
  });

  await start(1, 606);

  /* 約分の問題が出るまで進める (Lv1 は完成判定と一発約分の混合)。 */
  let guard = 0;
  while(!/を 約分しましょう。/.test(plain()) && guard < 5){
    const choice = app.querySelectorAll("[data-choice-index]")[0];
    assert.ok(choice, "選択肢も分数欄も無い画面: " + plain().slice(0, 200));
    choice.click();
    await settle();
    next();
    await settle();
    guard++;
  }
  assert.ok(/を 約分しましょう。/.test(plain()), "一発約分の問題が出なかった");

  test("the fraction answer takes a whole part, a numerator and a denominator", () => {
    assert.ok(app.querySelector("[data-answer-form]"), "分数の回答欄がない");
    assert.match(app.innerHTML, /name="whole"/, "整数部の欄がない");
    assert.match(app.innerHTML, /name="num"/, "分子の欄がない");
    assert.match(app.innerHTML, /name="den"/, "分母の欄がない");
  });

  const source = /(\d+)\/(\d+) を 約分しましょう。/.exec(plain());
  /* ここまでに完成判定を正解している場合があるので、変化量で見る。 */
  const gaugeBefore = komorebi.profile().collection.gauge;
  submitFraction("", source[1], source[2]);
  await settle();

  test("an unreduced answer is refused by name, not as a plain miss", () => {
    /* 検算わざ「答えが約分できたら まだ終わってない」の実体。値は合っているので、
       ただの誤答として返すと何を直せばよいか渡せない。 */
    assert.match(plain(), /もう一歩！/, "約分の残りが正答になった: " + plain().slice(0, 200));
    assert.match(plain(), /約分が のこっているよ/, "約分の残りを名指ししていない: " + plain().slice(0, 240));
    assert.equal(komorebi.profile().collection.gauge, gaugeBefore, "誤答でゲージが動いた");
  });

  test("an improper answer is accepted as readily as a mixed one", () => {
    /* 7/5 と 1 と 2/5 は同じ数で、どちらで書くかは約束の問題であって計算の
       正しさではない (curriculum 5 章)。 */
    const question = { kind: "frac", ans: { whole: 1, num: 2, den: 5 } };
    assert.equal(frac.judgeFraction(question, { whole: 1, num: 2, den: 5 }).correct, true);
    assert.equal(frac.judgeFraction(question, { whole: 0, num: 7, den: 5 }).correct, true);
    assert.equal(frac.judgeFraction(question, { whole: 0, num: 14, den: 10 }).state, "not_reduced");
  });

  await start(3, 303);

  test("the ordering level renders four tappable pieces ending in a reduction check", () => {
    let found = false;
    for(let index = 0; index < 5 && !found; index++){
      if(app.querySelectorAll("[data-part-index]").length){ found = true; break; }
      const form = app.querySelector("[data-answer-form]");
      if(form) submitFraction("", 1, 1);
      else app.querySelectorAll("[data-choice-index]")[0].click();
      next();
    }
    assert.ok(found, "Lv3 のセットに整列が出なかった");
    assert.equal(app.querySelectorAll("[data-part-index]").length, 4, "整列は 4 部品");
    assert.match(plain(), /約分/, "最後の部品が約分チェックになっていない: " + plain().slice(0, 300));
  });

  test("answers are recorded against kom_frac_flow only", () => {
    const profile = komorebi.profile();
    assert.ok(profile.stats.kom_frac_flow.n >= 1);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
