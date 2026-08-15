/* 段暗唱を「画面から」通すテスト。
   判定エンジンの単体テスト (test_komorebi_kuku_dan2.js) が通っていても、マイクの
   開始・タイムバー・認識失敗のやり直し・時間切れの記録は画面側の配線で決まる。
   SpeechRecognition とタイマを差し替えて、5 状態それぞれの行き先を確かめる。
   node tests/test_komorebi_dan2_session.js で実行。 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/* 実物の SpeechRecognition の代役。テストから onspeechend / onresult を撃つ。 */
const recognitions = [];
function FakeRecognition(){
  this.started = false;
  this.aborted = false;
  recognitions.push(this);
}
FakeRecognition.prototype.start = function(){ this.started = true; };
FakeRecognition.prototype.abort = function(){ this.aborted = true; };
FakeRecognition.prototype.stop = function(){ this.aborted = true; };

function endSpeech(){
  const rec = recognitions[recognitions.length - 1];
  assert.ok(rec && rec.started, "recognition was never started");
  if(rec.onspeechend) rec.onspeechend();
}

function returnResult(text){
  const rec = recognitions[recognitions.length - 1];
  assert.ok(rec && rec.started, "recognition was never started");
  const alternatives = [{ transcript: text }];
  alternatives.length = 1;
  rec.onresult({ results: [alternatives] });
}

function speak(text){ endSpeech(); returnResult(text); }

function stayQuiet(){
  const rec = recognitions[recognitions.length - 1];
  assert.ok(rec && rec.started, "recognition was never started");
  rec.onresult({ results: [[{ transcript: "" }]] });
}

/* タイムバーの制限は 12 秒。実時間で待つ代わりに、記録したタイマを撃つ。 */
const timers = [];
function fakeSetTimeout(fn, ms){ timers.push({ fn, ms, cancelled: false, fired: false }); return timers.length; }
function fakeClearTimeout(id){ if(timers[id - 1]) timers[id - 1].cancelled = true; }
function fireTimebarTimer(){
  const entry = timers.filter(t => !t.cancelled && !t.fired && t.ms >= 1000).pop();
  assert.ok(entry, "the time bar timer was never scheduled");
  entry.fired = true;
  entry.fn();
}

(async () => {
  const context = bootKomorebi({
    root, files: KOMOREBI_FILES, profileType: "k5",
    globals: { SpeechRecognition: FakeRecognition },
    setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout
  });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const phrases = context.Q4B_KUKU_PHRASES;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const plain = () => plainText(app.innerHTML);

  test("the voice path is playable when a microphone exists", () => {
    const button = app.querySelector('[data-cat="kom_kuku_dan2"]');
    assert.ok(button, "kom_kuku_dan2 is not on the path panel: " + plain().slice(0, 200));
    assert.equal(plain().indexOf("マイクが"), -1, "it must not claim the microphone is missing");
  });

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
  function chant(items){ return items.map(item => phrases.phrase(item.dan, item.b)).join(""); }

  test("a read level shows the equation, the answer and the reading of every phrase", () => {
    assert.match(plain(), /第1／5問/);
    assert.match(plain(), /採集ゲージ/);
    assert.match(plain(), /Lv1\s+○○○○○○○○○○/);
    assert.match(app.innerHTML, /dan2-timebar/, "the time bar is missing");
    const items = chunkOnScreen();
    assert.equal(items.length, 3, "level 1 is a three phrase chunk");
    items.forEach(item => {
      assert.ok(plain().indexOf(phrases.phrase(item.dan, item.b)) >= 0,
        "the reading of " + item.dan + "x" + item.b + " is not shown at a read level");
      assert.ok(plain().indexOf("＝" + item.dan * item.b) >= 0, "the answer is not shown at a read level");
    });
  });

  const firstChunk = chunkOnScreen();
  app.querySelector('[data-action="dan2-listen"]').click();

  test("pressing the microphone starts recognition and the time bar", () => {
    assert.equal(recognitions.length, 1);
    assert.equal(recognitions[0].started, true);
    assert.match(plain(), /きいています/);
    assert.ok(timers.some(t => t.ms >= 1000), "the time bar deadline was not scheduled");
  });

  speak(chant(firstChunk));
  await settle();

  test("chanting the whole chunk in time counts as one correct answer", () => {
    assert.match(plain(), /正解！/, "the chunk was not accepted: " + plain().slice(0, 300));
    assert.equal(profile.collection.gauge, 1);
    assert.equal(profile.stats.kom_kuku_dan2.n, 1);
  });

  app.querySelector('[data-action="ratio-next"]').click();
  await settle();
  app.querySelector('[data-action="dan2-listen"]').click();
  stayQuiet();
  await settle();

  test("a recognition failure is a free retake, not a wrong answer", () => {
    /* design 7.4: 認識失敗は統計へ記録しない。 */
    assert.match(plain(), /ききとれませんでした/, "the child is not told to try again");
    assert.match(plain(), /第2／5問/, "the session moved on despite hearing nothing");
    assert.equal(profile.stats.kom_kuku_dan2.n, 1, "a recognition failure must not be recorded");
    assert.equal(profile.collection.gauge, 1);
  });

  app.querySelector('[data-action="dan2-listen"]').click();
  returnResult("わからない");
  await settle();

  test("a nonempty recognition failure shows what the browser heard", () => {
    assert.match(plain(), /きこえたことば: わからない/);
    assert.equal(profile.stats.kom_kuku_dan2.n, 1, "the displayed recognition failure must stay free");
  });

  const secondChunk = chunkOnScreen();
  app.querySelector('[data-action="dan2-listen"]').click();
  const delayedRecognition = recognitions[recognitions.length - 1];
  endSpeech();
  fireTimebarTimer();
  await settle();

  test("speech ending at the deadline receives an 1800ms result grace", () => {
    assert.equal(delayedRecognition.aborted, false, "recognition was aborted before the grace result");
    assert.ok(timers.some(t => !t.cancelled && !t.fired && t.ms === 1800), "the result grace was not scheduled");
    assert.equal(profile.stats.kom_kuku_dan2.n, 1, "the grace itself must not record an answer");
  });

  returnResult(chant(secondChunk));
  await settle();

  test("a result arriving during the grace is judged normally", () => {
    assert.match(plain(), /正解！/);
    assert.equal(profile.stats.kom_kuku_dan2.n, 2);
    assert.equal(profile.collection.gauge, 2);
  });

  app.querySelector('[data-action="ratio-next"]').click();
  await settle();
  app.querySelector('[data-action="dan2-listen"]').click();
  fireTimebarTimer();
  await settle();

  test("running the bar out without speaking is recorded as a wrong answer", () => {
    /* categories 3.2: バー切れ = 不正解。ゲージは減らないが、水位測定として記録する。 */
    assert.match(plain(), /もう一歩！/, "the timeout was not judged: " + plain().slice(0, 300));
    assert.match(plain(), /タイムバーが 切れたよ/, "the child is not told why it failed");
    assert.equal(profile.stats.kom_kuku_dan2.n, 3);
    assert.equal(profile.collection.gauge, 2, "a wrong answer must not move the gauge");
  });

  app.querySelector('[data-action="ratio-next"]').click();
  await settle();
  const thirdChunk = chunkOnScreen();
  app.querySelector('[data-action="dan2-listen"]').click();
  const graceWithoutResult = recognitions[recognitions.length - 1];
  endSpeech();
  fireTimebarTimer();
  fireTimebarTimer();
  await settle();

  test("the unchanged retry appears when the grace receives no result", () => {
    assert.equal(graceWithoutResult.aborted, true);
    assert.match(plain(), /ききとれませんでした。もういちど となえてね/);
    assert.equal(profile.stats.kom_kuku_dan2.n, 3);
  });

  app.querySelector('[data-action="dan2-listen"]').click();
  /* 別の段を唱える。順序も内容も違うので wrong_phrase になる。 */
  const wrongChant = chant(thirdChunk.map(item => ({ dan: item.dan === 9 ? 8 : item.dan + 1, b: item.b })));
  speak(wrongChant);
  await settle();

  test("chanting the wrong table explains itself and feeds the stuck phrase back", () => {
    assert.match(plain(), /もう一歩！/);
    assert.match(plain(), /じゅんばんに となえよう/, "the child is not told what went wrong");
    assert.match(plain(), new RegExp("きこえたことば: " + wrongChant), "the feedback hides the recognized words");
    const deck = profile.srs.kuku;
    assert.ok(deck, "the stuck phrase was not refluxed into the kuku run deck");
    const key = thirdChunk[0].dan + "x" + thirdChunk[0].b;
    assert.ok(deck.facts[key], "the first phrase of the chunk is not queued for retry: " + Object.keys(deck.facts));
    assert.equal(deck.facts[key].slow, true);
  });

  test("the answer card names every phrase of the chunk", () => {
    thirdChunk.forEach(item => {
      assert.ok(plain().indexOf(phrases.phrase(item.dan, item.b)) >= 0,
        "the reading of " + item.dan + "x" + item.b + " is missing from the answer");
    });
  });

  app.querySelector('[data-action="ratio-next"]').click();
  await settle();
  app.querySelector('[data-action="dan2-listen"]').click();
  const openRecognition = recognitions[recognitions.length - 1];
  app.querySelector('[data-action="back-map"]').click();

  test("leaving the session releases the microphone", () => {
    assert.equal(openRecognition.aborted, true, "recognition kept running after leaving");
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
