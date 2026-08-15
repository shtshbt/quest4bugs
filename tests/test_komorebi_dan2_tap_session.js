/* 段暗唱のタップ入力を「画面から」通すテスト。
   判定エンジン (test_komorebi_kuku_dan2.js) が通っていても、はじめるボタン・
   穴あき読み札の進行・切替ボタン・還流は画面側の配線で決まる。
   localStorage を差し替えて端末モードをタップに固定し、画面の文面だけから
   1 チャンクを通す / 誤タップの理由 / モード切替 を確かめる。
   node tests/test_komorebi_dan2_tap_session.js で実行。 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/* 音声モードへ切り替えられる端末を演じるための、開始もしないマイクの代役。 */
function FakeRecognition(){}
FakeRecognition.prototype.start = function(){};
FakeRecognition.prototype.abort = function(){};
FakeRecognition.prototype.stop = function(){};

/* fake_dom には localStorage が無いので、最小の代役を注入する。 */
function makeLocalStorage(initial){
  const store = Object.assign({}, initial);
  return {
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); },
    removeItem(key){ delete store[key]; },
    __store: store
  };
}

/* タイムバーの締切は実時間で待たず、記録だけする (このテストでは撃たない)。 */
const timers = [];
function fakeSetTimeout(fn, ms){ timers.push({ fn, ms, cancelled: false, fired: false }); return timers.length; }
function fakeClearTimeout(id){ if(timers[id - 1]) timers[id - 1].cancelled = true; }

(async () => {
  const storage = makeLocalStorage({ q4b_dan_input_mode: "tap" });
  const context = bootKomorebi({
    root, files: KOMOREBI_FILES, profileType: "k5",
    globals: { SpeechRecognition: FakeRecognition, localStorage: storage },
    setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout
  });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const phrases = context.Q4B_KUKU_PHRASES;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const plain = () => plainText(app.innerHTML);

  let seed = 11;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  await komorebi.sessionStarters.kom_kuku_dan2(volume, random);
  const profile = komorebi.profile();

  /* 画面に出ている式から、その回のチャンクの句を組み立てる。内部状態を覗かない。 */
  function chunkOnScreen(){
    const equations = plain().match(/(\d+)\s*×\s*(\d+)/g) || [];
    const parsed = equations.map(text => /(\d+)\s*×\s*(\d+)/.exec(text)).map(m => ({ dan: Number(m[1]), b: Number(m[2]) }));
    assert.ok(parsed.length >= 3, "the chunk is not on screen: " + plain().slice(0, 200));
    return parsed;
  }

  /* fake_dom は部分描画を innerHTML へ積むので、常に最後に描かれた札を読む。 */
  function currentTapCard(){
    const cards = app.innerHTML.match(/<p class="dan2-tap-card">[\s\S]*?<\/p>/g) || [];
    assert.ok(cards.length, "no cloze card on screen: " + plain().slice(0, 200));
    return plainText(cards[cards.length - 1]).trim();
  }

  /* 4 択の値は画面の文面 (ボタンのラベル) から読む。 */
  function tapChoiceValues(stepIndex){
    const re = new RegExp('<button[^>]*data-tap-step="' + stepIndex + '"[^>]*data-tap-choice="(\\d)"[^>]*>(\\d+)</button>', "g");
    const values = {};
    let m;
    while((m = re.exec(app.innerHTML))) values[m[1]] = Number(m[2]);
    assert.equal(Object.keys(values).length, 4, "step " + stepIndex + " does not show four choices");
    return values;
  }

  function clickTapChoice(stepIndex, value){
    const values = tapChoiceValues(stepIndex);
    const choiceIndex = Object.keys(values).find(key => values[key] === value);
    assert.ok(choiceIndex !== undefined, value + " is not among the choices: " + JSON.stringify(values));
    const buttons = app.querySelectorAll('[data-tap-step="' + stepIndex + '"]')
      .filter(button => button.getAttribute("data-tap-choice") === choiceIndex);
    assert.ok(buttons.length, "the choice button is not clickable");
    buttons[buttons.length - 1].click();
  }

  test("the tap screen keeps the chant instruction and starts from a button", () => {
    assert.match(plain(), /こえに だして となえながら えらぼう/, "the chant instruction is missing");
    assert.ok(app.querySelector('[data-action="dan2-tap-start"]'), "the start button is missing");
    assert.equal(app.querySelector('[data-action="dan2-listen"]'), null, "the microphone button must not be drawn in tap mode");
    assert.match(plain(), /こえで こたえる/, "the switch back to voice is missing");
    assert.match(app.innerHTML, /dan2-timebar/, "the time bar is missing");
  });

  const firstChunk = chunkOnScreen();
  app.querySelector('[data-action="dan2-tap-start"]').click();

  test("starting shows the first cloze card and schedules the time bar deadline", () => {
    const card = currentTapCard();
    assert.ok(card.indexOf("＿＿") >= 0, "the cloze blank is missing: " + card);
    const stem = card.replace(/＿＿/g, "").replace(/\s+/g, "");
    assert.ok(stem.length > 0, "the cloze card shows no reading stem");
    assert.equal(phrases.phrase(firstChunk[0].dan, firstChunk[0].b).indexOf(stem), 0,
      "the card does not read as the start of the first phrase: " + stem);
    assert.ok(timers.some(t => !t.cancelled && t.ms >= 1000), "the time bar deadline was not scheduled");
  });

  for(let step = 0; step < firstChunk.length; step++){
    clickTapChoice(step, firstChunk[step].dan * firstChunk[step].b);
  }
  await settle();

  test("tapping every phrase correctly counts as one correct answer", () => {
    assert.match(plain(), /正解！/, "the chunk was not accepted: " + plain().slice(0, 300));
    assert.equal(profile.stats.kom_kuku_dan2.n, 1);
    assert.equal(profile.collection.gauge, 1);
  });

  app.querySelector('[data-action="ratio-next"]').click();
  await settle();
  const secondChunk = chunkOnScreen();
  app.querySelector('[data-action="dan2-tap-start"]').click();

  const firstStepValues = tapChoiceValues(0);
  const rightAnswer = secondChunk[0].dan * secondChunk[0].b;
  const wrongValue = Object.keys(firstStepValues).map(key => firstStepValues[key]).find(value => value !== rightAnswer);
  clickTapChoice(0, wrongValue);
  for(let step = 1; step < secondChunk.length; step++){
    clickTapChoice(step, secondChunk[step].dan * secondChunk[step].b);
  }
  await settle();

  test("one wrong tap explains itself and refluxes the stuck phrase", () => {
    assert.match(plain(), /もう一歩！/, "the wrong tap was not judged: " + plain().slice(0, 300));
    assert.match(plain(), /まちがえた 読み札を もういちど となえよう/, "the child is not told what went wrong");
    assert.equal(profile.stats.kom_kuku_dan2.n, 2);
    assert.equal(profile.collection.gauge, 1, "a wrong answer must not move the gauge");
    const deck = profile.srs.kuku;
    const key = secondChunk[0].dan + "x" + secondChunk[0].b;
    assert.ok(deck && deck.facts[key], "the wrong phrase is not queued for retry: " + (deck ? Object.keys(deck.facts) : "no deck"));
    assert.equal(deck.facts[key].slow, true);
  });

  test("the answer card names every phrase of the chunk", () => {
    secondChunk.forEach(item => {
      assert.ok(plain().indexOf(phrases.phrase(item.dan, item.b)) >= 0,
        "the reading of " + item.dan + "x" + item.b + " is missing from the answer");
    });
  });

  app.querySelector('[data-action="ratio-next"]').click();
  await settle();

  test("the toggle switches to voice and back and stores the device mode", () => {
    app.querySelector('[data-action="dan2-mode"]').click();
    assert.equal(storage.__store.q4b_dan_input_mode, "voice", "switching did not store the voice mode");
    assert.ok(app.querySelector('[data-action="dan2-listen"]'), "the microphone button is missing after switching to voice");
    assert.equal(app.querySelector('[data-action="dan2-tap-start"]'), null, "the tap start button must leave in voice mode");
    assert.match(plain(), /タップで となえる/, "the switch back to tap is missing");
    app.querySelector('[data-action="dan2-mode"]').click();
    assert.equal(storage.__store.q4b_dan_input_mode, "tap", "switching did not store the tap mode");
    assert.ok(app.querySelector('[data-action="dan2-tap-start"]'), "tap mode did not come back");
    assert.match(plain(), /こえに だして となえながら えらぼう/);
  });

  /* 音声認識の無い端末。以前はマイク無しで塞いでいたが、タップ暗唱が代替に
     なったので、段のボタンは遊べる形で出て、問題はタップモードで開く。 */
  const quiet = bootKomorebi({
    root, files: KOMOREBI_FILES, profileType: "k5",
    globals: { localStorage: makeLocalStorage({}) },
    setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout
  });
  await settle();

  test("a device without speech recognition still offers the dan path", () => {
    const button = quiet.__app.querySelector('[data-cat="kom_kuku_dan2"]');
    assert.ok(button, "kom_kuku_dan2 is blocked without a microphone: " + plainText(quiet.__app.innerHTML).slice(0, 200));
    assert.equal(plainText(quiet.__app.innerHTML).indexOf("マイクが"), -1, "it must not claim the microphone is missing");
  });

  await quiet.Q4B_KOMOREBI.sessionStarters.kom_kuku_dan2(quiet.Q4B_KOMOREBI_VOLUMES.volume_fixture, random);

  test("without speech recognition the question opens as tap and hides the voice switch", () => {
    const text = plainText(quiet.__app.innerHTML);
    assert.match(text, /こえに だして となえながら えらぼう/, "the question did not open in tap mode");
    assert.ok(quiet.__app.querySelector('[data-action="dan2-tap-start"]'), "the start button is missing");
    assert.equal(quiet.__app.querySelector('[data-action="dan2-mode"]'), null, "a voice switch that cannot work must not be drawn");
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
