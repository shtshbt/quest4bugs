/* 単位換算を画面から遊ぶテスト。公開は更新 3 なので通常は選択肢に出ない。
   このカテゴリだけが数値と単位を分けて受け取る新しい回答部品を使うので、
   選択の状態、送信の可否、入力の保持、単位違いの言い分けを画面側で押さえる。
   node tests/test_komorebi_unit_convert_session.js で実行。 */
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
  const engine = context.Q4B_KOMOREBI_UNIT_CONVERT;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_borneo;
  const plain = () => plainText(app.innerHTML);

  function seeded(seed){
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  async function start(lv, seed){
    const profile = komorebi.profile();
    profile.lv.kom_unit_convert = lv;
    profile.maxLv.kom_unit_convert = Math.max(profile.maxLv.kom_unit_convert, lv);
    await komorebi.sessionStarters.kom_unit_convert(volume, seeded(seed));
  }
  function unitIdOf(label){
    return Object.keys(engine.units).filter(id => engine.unitLabel(id) === label)[0];
  }
  /* 画面に出ている換算問題を読む。答えはエンジンの変換で出す (数の正しさは
     生成器のテストが見ているので、ここで押さえるのは画面側の配線)。 */
  function readConversion(){
    /* 数と単位の間に空白を置かない (curriculum 8.3)。空白を許すと、画面の別の
       場所の数 (ゲージや問番号) を拾ってしまう。 */
    const m = /([\d.]+)(\S+?)\s*は 何\s*(\S+?)\s*ですか。/.exec(plain());
    assert.ok(m, "換算の問題文を読めない: " + plain().slice(0, 200));
    const from = unitIdOf(m[2]), to = unitIdOf(m[3]);
    assert.ok(from && to, "単位を id に戻せない: " + m[2] + " / " + m[3]);
    const digits = m[1].split(".");
    const source = { mantissa: Number(digits.join("")), exp: digits[1] ? -digits[1].length : 0 };
    return { source, from, to };
  }
  function answerIn(unitId){
    const read = readConversion();
    return engine.formatQuantity(engine.convert(read.source, read.from, unitId));
  }
  function submit(value, unitId){
    const form = app.querySelector("[data-answer-form]");
    assert.ok(form, "回答フォームがない: " + plain().slice(0, 160));
    form.elements = { answer: { value: String(value) } };
    if(unitId){
      const chip = app.querySelectorAll("[data-unit]").filter(button => button.attrs["data-unit"] === unitId)[0];
      assert.ok(chip, "選択肢に " + unitId + " がない");
      chip.click();
    }
    form.submit();
  }
  function next(){
    const button = app.querySelector('[data-action="ratio-next"]');
    assert.ok(button, "次の問題へ進めない: " + plain().slice(0, 160));
    button.click();
  }

  test("the category is implemented but held back until its update", () => {
    assert.equal(komorebi.categories.kom_unit_convert.release, 3);
    assert.equal(komorebi.isReleased("kom_unit_convert"), false);
    assert.ok(komorebi.sessionStarters.kom_unit_convert);
    assert.equal(volume.categories.indexOf("kom_unit_convert") >= 0, true);
  });

  await start(1, 4242);

  test("the relation levels ask for a number alone", () => {
    /* 単位選択は「別の単位で計算し切った」を捕まえる部品なので、関係を唱えるだけの
       層では取り違えが起きようがなく、置くと摩擦にしかならない。 */
    assert.ok(app.querySelector("[data-answer-form]"), "関係の Lv に回答欄がない");
    assert.equal(app.querySelectorAll("[data-unit]").length, 0, "関係の Lv に単位選択を出してはいけない");
  });

  await start(4, 777);

  test("a conversion level offers four unit chips and refuses to submit without one", () => {
    const chips = app.querySelectorAll("[data-unit]");
    assert.equal(chips.length, 4, "単位の選択肢は 4 個: " + chips.length);
    assert.equal(new Set(chips.map(chip => chip.attrs["data-unit"])).size, 4, "選択肢が重複している");
    const button = app.querySelector("[data-submit-num-unit]");
    assert.ok(button, "送信ボタンがない");
    assert.equal(button.attrs.disabled, "", "単位を選ぶ前は送信できないこと");
  });

  test("choosing a unit keeps what was already typed", () => {
    /* 描き直すと、数を打ってから単位を押した子だけが打ち直しになる。 */
    const form = app.querySelector("[data-answer-form]");
    form.elements = { answer: { value: "500" } };
    app.querySelectorAll("[data-unit]")[0].click();
    assert.equal(app.querySelector("[data-answer-form]"), form, "描き直されて入力が消えた");
    assert.equal(form.elements.answer.value, "500");
    assert.equal(app.querySelector("[data-submit-num-unit]").disabled, false, "単位を選んでも送信できないまま");
  });

  const wrongUnitCase = readConversion();
  const otherUnit = app.querySelectorAll("[data-unit]")
    .map(chip => chip.attrs["data-unit"]).filter(id => id !== wrongUnitCase.to)[0];
  submit(answerIn(otherUnit), otherUnit);
  await settle();

  test("the same amount in another unit is refused, and the screen says which unit was asked", () => {
    const body = plain();
    assert.match(body, /もう一歩！/, "単位違いを正答にしてはいけない: " + body.slice(0, 200));
    assert.match(body, /きかれているのは/, "どの単位を訊かれたかを言っていない: " + body.slice(0, 240));
    assert.ok(body.indexOf(engine.unitLabel(wrongUnitCase.to)) >= 0, "訊かれた単位が文面に出ていない");
    assert.equal(komorebi.profile().collection.gauge, 0, "誤答でゲージが動いた");
  });

  next();
  await settle();
  const rightCase = readConversion();
  submit(answerIn(rightCase.to), rightCase.to);
  await settle();

  test("the right amount in the asked unit is accepted", () => {
    assert.match(plain(), /正解！/, "正しい答えが通らない: " + plain().slice(0, 200));
    assert.equal(komorebi.profile().collection.gauge, 1);
  });

  await start(7, 31415);

  test("the two-step level renders the four part chain as tappable pieces", () => {
    let found = false;
    for(let index = 0; index < 5 && !found; index++){
      if(app.querySelectorAll("[data-part-index]").length){ found = true; break; }
      const read = readConversion();
      submit(answerIn(read.to), read.to);
      next();
    }
    assert.ok(found, "Lv7 のセットに経路整列が出なかった");
    assert.equal(app.querySelectorAll("[data-part-index]").length, 4, "経路は 4 部品");
    assert.match(plain(), /手順を 正しい順に ならべましょう。/);
  });

  test("answers are recorded against kom_unit_convert only", () => {
    const profile = komorebi.profile();
    assert.ok(profile.stats.kom_unit_convert.n >= 2);
    assert.equal(profile.stats.kom_ratio, undefined);
    assert.equal(profile.stats.kom_pi314, undefined);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
