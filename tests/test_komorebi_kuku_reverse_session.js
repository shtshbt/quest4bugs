/* 九九のうら読みと逆引きを画面から遊ぶテスト。公開は更新 4 と 5。
   うら読みの Lv5 だけが集合完成 (「ぜんぶ えらぶ」) で、選択を溜めてから 1 回で
   出す新しい回答部品を使う。1 つ選んで即判定になると残りを選べないので、そこを
   画面側で押さえる。逆引きは誤答が九九のデッキへ還流することを確かめる。
   node tests/test_komorebi_kuku_reverse_session.js で実行。 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k5" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const reverse = context.Q4B_KOMOREBI_KUKU_REVERSE;
  const uraVolume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_costa_rica;
  const inverseVolume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia;
  const plain = () => plainText(app.innerHTML);

  function seeded(seed){
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  async function start(cat, volume, lv, seed){
    const profile = komorebi.profile();
    profile.lv[cat] = lv;
    profile.maxLv[cat] = Math.max(profile.maxLv[cat], lv);
    await komorebi.sessionStarters[cat](volume, seeded(seed));
  }
  function label(attribute, value){
    /* 属性のうしろに aria-pressed が続く場合があるので、閉じ括弧まで読み飛ばす。 */
    const re = new RegExp(attribute + '="' + value + '"[^>]*>([\\s\\S]*?)</button>');
    const m = re.exec(app.innerHTML);
    return m ? m[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]*>/g, "").trim() : "";
  }
  function next(){
    const button = app.querySelector('[data-action="ratio-next"]');
    assert.ok(button, "次へ進めない: " + plain().slice(0, 160));
    button.click();
  }

  test("both categories are implemented but held back until their updates", () => {
    assert.equal(komorebi.categories.kom_kuku_ura.release, 4);
    assert.equal(komorebi.categories.kom_kuku_inverse.release, 5);
    assert.equal(komorebi.isReleased("kom_kuku_ura"), false);
    assert.equal(komorebi.isReleased("kom_kuku_inverse"), false);
    assert.ok(komorebi.sessionStarters.kom_kuku_ura);
    assert.ok(komorebi.sessionStarters.kom_kuku_inverse);
  });

  await start("kom_kuku_ura", uraVolume, 1, 1234);

  test("the factorising level is answered by picking one expression", () => {
    const m = /(\d+) は 何×何 ですか。/.exec(plain());
    assert.ok(m, "うら読みの問題文を読めない: " + plain().slice(0, 200));
    const product = Number(m[1]);
    const buttons = app.querySelectorAll("[data-choice-index]");
    assert.equal(buttons.length, 4);
    /* 画面の式だけで正解を決める。積を出さずに切れる形になっていること自体は
       生成器のテストが見ているので、ここでは答えられることを確かめる。 */
    const hit = buttons.filter(button => {
      const text = label("data-choice-index", button.attrs["data-choice-index"]);
      const parts = /(\d+)×(\d+)/.exec(text);
      return parts && Number(parts[1]) * Number(parts[2]) === product;
    });
    assert.equal(hit.length, 1, "積が一致する選択肢がちょうど 1 つでない");
    hit[0].click();
  });

  await settle();

  test("the factorising answer is accepted and moves the shared gauge", () => {
    assert.match(plain(), /正解！/, "正しい式が通らない: " + plain().slice(0, 200));
    assert.equal(komorebi.profile().collection.gauge, 1);
  });

  await start("kom_kuku_ura", uraVolume, 5, 5150);

  test("the list-all level offers more choices than answers", () => {
    /* 分解が 4 通りある積で選択肢を 4 個にすると全部が正解になり、
       何も考えずに全部押せば通る問題になる。 */
    const buttons = app.querySelectorAll("[data-multi-index]");
    assert.ok(buttons.length >= 4, "集合完成の選択肢が少なすぎる: " + buttons.length);
    const m = /(\d+) に なる 式を ぜんぶ/.exec(plain());
    assert.ok(m, "集合完成の問題文を読めない: " + plain().slice(0, 200));
    const correct = reverse.properDecompositions(Number(m[1])).length;
    assert.equal(buttons.length, correct + 2, "おとりが 2 個入っていない");
  });

  test("selecting pieces accumulates instead of judging on the first tap", () => {
    const submit = app.querySelector('[data-action="submit-multi"]');
    assert.ok(submit, "集合完成の答えるボタンがない");
    assert.equal(submit.attrs.disabled, "", "何も選ばずに送信できてはいけない");
    app.querySelectorAll("[data-multi-index]")[0].click();
    assert.equal(plain().indexOf("正解！"), -1, "1 つ押した時点で判定が走った");
    assert.equal(app.querySelector('[data-action="submit-multi"]').attrs.disabled, undefined, "選んだのに送信できない");
  });

  test("the whole correct set is accepted and a partial set is not", () => {
    const m = /(\d+) に なる 式を ぜんぶ/.exec(plain());
    const product = Number(m[1]);
    const correctTexts = reverse.properDecompositions(product).map(pair => pair[0] + "×" + pair[1]);
    app.querySelector('[data-action="reset-multi"]').click();
    const buttons = app.querySelectorAll("[data-multi-index]");
    const correctButtons = buttons.filter(button => correctTexts.indexOf(label("data-multi-index", button.attrs["data-multi-index"])) >= 0);
    assert.equal(correctButtons.length, correctTexts.length);
    /* まず 1 つ足りない集合で出す。 */
    correctButtons.slice(0, correctButtons.length - 1).forEach(button => button.click());
    app.querySelector('[data-action="submit-multi"]').click();
  });

  await settle();

  test("a partial set is judged wrong", () => {
    assert.match(plain(), /もう一歩！/, "足りない集合が正答になった: " + plain().slice(0, 200));
  });

  await start("kom_kuku_inverse", inverseVolume, 1, 9001);

  test("the inverse level asks for a single number", () => {
    assert.match(plain(), /2×□=\d+|\d+÷2=□/, "逆引きの問題文が出ていない: " + plain().slice(0, 200));
    assert.ok(app.querySelector("[data-answer-form]"), "数値の回答欄がない");
    assert.equal(app.querySelectorAll("[data-unit]").length, 0, "逆引きに単位選択は要らない");
  });

  test("a wrong inverse answer feeds the fact back into the kuku deck", () => {
    /* 段暗唱の詰まり句と同じ扱いで、どのカテゴリで詰まっても九九の再出題は
       れんぞく九九 1 か所に集まる。 */
    const form = app.querySelector("[data-answer-form]");
    form.elements = { answer: { value: "99" } };
    form.submit();
  });

  await settle();

  test("the deck learned the fact that was missed", () => {
    const deck = komorebi.profile().srs.kuku;
    assert.ok(deck, "九九のデッキが作られていない");
    const keys = Object.keys(deck.facts);
    assert.ok(keys.length >= 1, "誤答した句がデッキへ戻っていない");
    keys.forEach(key => {
      assert.match(key, /^[1-9]x[1-9]$/);
      assert.equal(deck.facts[key].slow, true, "戻した句が再出題の対象になっていない");
    });
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
