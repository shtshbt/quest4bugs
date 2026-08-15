/* れんぞく九九を「画面から」遊びきるテスト。
   エンジンの単体テスト (test_komorebi_kuku_run.js) が通っていても、ボタンが描かれない・
   ハンドラが結線されない・だんランの鎖が進まない、といった配線ミスは捕まらない。
   実際に innerHTML を読んでボタンを押し、5 問を最後まで通す。
   node tests/test_komorebi_kuku_session.js で実行。 */
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
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

  const plain = () => plainText(app.innerHTML);

  test("the path panel offers the kuku run category as playable", () => {
    const button = app.querySelector('[data-cat="kom_kuku_run"]');
    assert.ok(button, "kom_kuku_run is not on the path panel: " + app.innerHTML.slice(0, 200));
    assert.equal(button.attrs.disabled, undefined);
  });

  /* 決定的な乱数で開始する。だんランのおとり位置まで固定されるので、
     「正解ボタンが必ず存在する」ことを押しながら確かめられる。 */
  let seed = 7;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  await komorebi.startKukuRunSession(volume, random);

  const profile = komorebi.profile();
  const questions = () => app.innerHTML;

  test("the session head shows the same level readout as the main game", () => {
    assert.match(questions(), /Lv1　○○○○○○○○○○/, "level dots missing: " + questions().slice(0, 400));
    assert.match(questions(), /採集ゲージ/);
    assert.match(questions(), /第1／5問/);
  });

  test("dan_run draws a chain and one tappable choice row", () => {
    assert.match(questions(), /kuku-chain/);
    assert.equal(app.querySelectorAll("[data-step-choice]").length, 4);
  });

  /* --- 5 問を最後まで正解で押しきる ------------------------------------- */

  function correctStepButton(){
    const question = context.Q4B_KOMOREBI.profile() && null;   /* 内部状態は覗かない */
    const buttons = app.querySelectorAll("[data-step-choice]");
    const shown = /(\d+)×(\d+)＝？/.exec(app.innerHTML);
    assert.ok(shown, "the current step is not displayed: " + app.innerHTML.slice(0, 300));
    const answer = String(Number(shown[1]) * Number(shown[2]));
    const hit = buttons.filter(b => b.attrs.class.indexOf("kuku-num") >= 0 && stripRuby(b) === answer)[0];
    assert.ok(hit, "no button carries the correct product " + answer);
    return hit;
  }
  /* k5 では displayText が ruby を振るので、ボタンの文字列は素の数字ではない。 */
  function stripRuby(button){
    const html = app.innerHTML;
    const re = new RegExp('data-step-choice="' + button.attrs["data-step-choice"] + '">([\\s\\S]*?)</button>');
    const m = re.exec(html);
    return m ? m[1].replace(/<[^>]*>/g, "").replace(/[^0-9]/g, "") : "";
  }

  let steps = 0;
  while(app.querySelectorAll("[data-step-choice]").length && steps < 12){
    correctStepButton().click();
    steps++;
    await settle();
  }

  test("the chain accepts every step and ends the first question", () => {
    assert.equal(steps, 5, "dan_run should be five steps, walked " + steps);
    assert.match(plain(), /正解！/, "the run did not judge as correct: " + plain().slice(0, 300));
  });

  function advance(){
    const next = app.querySelector('[data-action="ratio-next"]');
    assert.ok(next, "no next button on the feedback screen");
    next.click();
  }

  function label(attribute, value){
    const re = new RegExp(attribute + '="' + value + '">([\\s\\S]*?)</button>');
    const m = re.exec(app.innerHTML);
    return m ? m[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]*>/g, "") : "";
  }

  /* 正解は画面に書かれている情報だけから決める。内部状態を覗かないことで、
     「画面だけ見て答えられる」という出題側の条件そのものを検証している。 */
  function correctChoice(){
    const buttons = app.querySelectorAll("[data-choice-index]");
    assert.ok(buttons.length >= 4, "choices missing: " + plain().slice(0, 300));
    const labels = buttons.map(button => label("data-choice-index", button.attrs["data-choice-index"]));
    const equations = labels.map(text => /^(\d+)\s*×\s*(\d+)\s*＝\s*(\d+)$/.exec(text.replace(/\s+/g, " ").trim()));
    if(equations.every(Boolean)){
      const index = equations.findIndex(m => Number(m[1]) * Number(m[2]) !== Number(m[3]));
      assert.ok(index >= 0, "error_find offers no wrong line");
      return buttons[index];
    }
    const digits = labels.map(text => text.replace(/[^0-9]/g, ""));
    const blank = /(\d+)\s*×\s*(\d+)\s*＝\s*？/.exec(plain());
    if(blank){
      const answer = String(Number(blank[1]) * Number(blank[2]));
      const index = digits.indexOf(answer);
      assert.ok(index >= 0, "the product " + answer + " is not among the choices");
      return buttons[index];
    }
    const dan = /(\d+)のだん/.exec(plain());
    assert.ok(dan, "the board does not name its table: " + plain().slice(0, 200));
    const chips = (app.innerHTML.match(/class="kuku-chip"[^>]*>[\s\S]*?<\/span>/g) || [])
      .map(chunk => chunk.replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]*>/g, "").replace(/[^0-9]/g, ""));
    const missing = [];
    for(let b = 1; b <= 9; b++){
      const value = String(Number(dan[1]) * b);
      if(chips.indexOf(value) < 0) missing.push(value);
    }
    assert.equal(missing.length, 1, "the board must hide exactly one product, it hid " + missing.length);
    const index = digits.indexOf(missing[0]);
    assert.ok(index >= 0, "the hidden product " + missing[0] + " is not among the choices");
    return buttons[index];
  }

  let solved = 1;
  for(let index = 1; index < 5; index++){
    advance();
    await settle();
    assert.match(plain(), new RegExp("第" + (index + 1) + "／5問"), "the session did not advance to question " + (index + 1));
    correctChoice().click();
    await settle();
    assert.match(plain(), /正解！/, "question " + (index + 1) + " was not judged correct: " + plain().slice(0, 300));
    if(index === 1) assert.match(plain(), /くくの よみかた/, "the phrase card heading is incomplete");
    solved++;
  }

  test("every format can be answered from what the screen shows alone", () => {
    assert.equal(solved, 5);
    assert.equal(profile.collection.gauge, 5, "five correct answers should advance the shared gauge by five");
  });

  test("answers are recorded against kom_kuku_run only", () => {
    assert.equal(profile.stats.kom_kuku_run.n, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
    assert.equal(profile.adapt.kom_kuku_run.n, 5);
  });

  test("the silent latency deck learned the facts it asked about", () => {
    const deck = profile.srs.kuku;
    assert.ok(deck, "no kuku SRS deck was created");
    assert.ok(Object.keys(deck.facts).length >= 5, "the deck recorded " + Object.keys(deck.facts).length + " facts");
    assert.ok(deck.counter > 0);
    Object.keys(deck.facts).forEach(key => {
      assert.match(key, /^[1-9]x[1-9]$/);
      assert.equal(Number.isInteger(deck.facts[key].interval), true);
    });
  });

  test("the saved profile carries the deck so the weakness survives a reload", () => {
    const saved = context.__saved.komorebi;
    assert.ok(saved && saved.srs && saved.srs.kuku, "the deck was not persisted");
    assert.equal(komorebi.normalizeProfile(JSON.parse(JSON.stringify(saved))).profile.srs.kuku.counter, saved.srs.kuku.counter);
  });

  test("no timing or speed wording is shown to the child", () => {
    /* categories 3.10: れんぞく九九に時間の可視要素は置かない。 */
    for(const word of ["秒", "タイム", "はやい", "おそい", "スピード"]){
      assert.equal(app.innerHTML.indexOf(word), -1, "the screen exposes timing wording: " + word);
    }
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
