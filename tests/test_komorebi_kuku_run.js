"use strict";

/* 実行環境の DOM 差に影響されず、九九エンジンだけの契約を検証する。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/kuku_phrases.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "komorebi/kuku_run.js"), "utf8"), context);

const kuku = context.Q4B_KOMOREBI_KUKU_RUN;
const phrases = context.Q4B_KUKU_PHRASES;
let passed = 0;

function test(name, fn){fn();passed++;console.log("PASS", name);}
function seeded(seed){
  let state = seed >>> 0;
  return function(){
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function sequence(values){
  let index = 0;
  return function(){const value = values[index % values.length];index++;return value;};
}
function values(array){return Array.from(array);}

function assertUnique(array, message){
  assert.equal(new Set(values(array)).size, array.length, message);
}

function assertValueChoices(question){
  assert.equal(question.choices.length, 4, question.format);
  assertUnique(question.choices, question.format);
  assert.equal(values(question.choices).filter(value => value === question.ans).length, 1, question.format);
  question.choices.forEach(value => {
    assert.equal(Number.isInteger(value), true, question.format);
    assert.equal(value > 0, true, question.format);
  });
}

function assertGeneratedSet(set){
  const run = set[0];
  assert.equal(run.steps.length, kuku.config.runLength);
  run.steps.forEach(step => {
    assert.equal(step.choices.length, 4);
    assertUnique(step.choices, run.format);
    assert.equal(values(step.choices).filter(value => value === step.ans).length, 1);
    step.choices.forEach(value => assert.equal(Number.isInteger(value) && value > 0, true));
  });
  [set[1], set[2], set[4]].forEach(assertValueChoices);
  assert.deepEqual(values(set[3].choices), [0,1,2,3,4]);
  assertUnique(set[3].choices, set[3].format);
}

test("dansForLv follows the teaching order and mixed level groups", () => {
  const order = [2,5,3,4,6,7,8,9];
  for(let lv=1;lv<=8;lv++)assert.deepEqual(values(kuku.dansForLv(lv, seeded(lv))), [order[lv-1]]);
  assert.deepEqual(values(kuku.dansForLv(9, () => 0)), [2,3,4,5]);
  assert.deepEqual(values(kuku.dansForLv(9, () => 0.999)), [6,7,8,9]);
  assert.deepEqual(values(kuku.dansForLv(10, seeded(10))), [1,2,3,4,5,6,7,8,9]);
  assert.throws(() => kuku.dansForLv(0, seeded(1)), /レベル/);
  assert.throws(() => kuku.dansForLv(11, seeded(1)), /レベル/);
});

test("buildSet has five questions in the fixed format order", () => {
  const set = kuku.buildSet(4, kuku.createDeck(), sequence([0.1,0.7,0.3,0.9,0.2]));
  assert.equal(set.length, 5);
  assert.equal(kuku.config.setSize, 5);
  assert.deepEqual(values(set).map(question => question.format), ["dan_run","scroll_fill","missing_find","error_find","flash"]);
  assert.deepEqual(values(kuku.formats), ["dan_run","scroll_fill","missing_find","error_find","flash"]);
});

test("scroll_fill and flash form one short recall loop", () => {
  const set = kuku.buildSet(7, kuku.createDeck(), seeded(71));
  assert.equal(set[1].factKey, set[4].factKey);
  assert.equal(set[1].dan, set[4].dan);
  assert.equal(set[1].rows[1].b, set[4].b);
  assert.equal(4-1, kuku.config.shortLoopGap);
});

test("one thousand sets keep every value choice valid and unique", () => {
  const random = seeded(20260813);
  for(let index=0;index<1000;index++)assertGeneratedSet(kuku.buildSet(index%10+1, kuku.createDeck(), random));
});

test("missing_find hides only the answer and keeps every distractor on the board", () => {
  /* おとりが盤面に無い値だと、2 の段では奇数を弾くだけで解けてしまう。3 つのおとりが
     すべて盤面にあることが、段の完全性を確かめる問題であることの担保。 */
  const random = seeded(5105);
  for(let index=0;index<200;index++){
    const question = kuku.buildSet(index%10+1, null, random)[2];
    assert.equal(question.shown.length, 8);
    assertUnique(question.shown, question.format);
    assert.equal(question.shown.includes(question.ans), false);
    const distractors = question.choices.filter(value => value !== question.ans);
    assert.equal(distractors.length, 3);
    distractors.forEach(value => assert.equal(question.shown.includes(value), true));
  }
});

test("error_find changes exactly one line", () => {
  const random = seeded(6106);
  for(let index=0;index<200;index++){
    const question = kuku.buildSet(index%10+1, null, random)[3];
    assert.equal(question.lines.length, 5);
    assert.equal(question.lines.filter(line => line.wrong).length, 1);
    question.lines.forEach((line, lineIndex) => {
      assert.equal(line.value !== question.dan*line.b, lineIndex === question.ans);
      assert.equal(line.wrong, lineIndex === question.ans);
    });
  }
});

test("dan_run distractors contain off-by-one and neighboring-table values", () => {
  const question = kuku.buildSet(1, null, seeded(7107))[0];
  question.steps.forEach(step => {
    const distractors = values(step.choices).filter(value => value !== step.ans);
    assert.equal(distractors.includes(step.ans-1), true);
    assert.equal(distractors.includes(step.ans+1), true);
    assert.equal(distractors.some(value => value === (question.dan-1)*step.b || value === (question.dan+1)*step.b), true);
  });
});

test("reviewFact handles wrong slow fast normal and interval cap", () => {
  const wrongDeck = kuku.createDeck();
  const wrong = kuku.reviewFact(wrongDeck, 8, 7, false, 1000);
  assert.deepEqual({...wrong}, {status:"wrong",interval:1,due:1,scaffold:true});

  const slowDeck = kuku.createDeck();
  const slow = kuku.reviewFact(slowDeck, 8, 7, true, kuku.config.slowMs);
  assert.equal(slow.status, "slow");assert.equal(slow.interval, 1);assert.equal(slow.scaffold, true);

  const fastDeck = {counter:4,facts:{"8x7":{interval:4,due:4,slow:true,seen:2}}};
  const fast = kuku.reviewFact(fastDeck, 8, 7, true, kuku.config.fastMs-1);
  assert.equal(fast.status, "fast");assert.equal(fast.interval, 8);assert.equal(fast.scaffold, false);

  const normalDeck = {counter:4,facts:{"8x7":{interval:4,due:4,slow:true,seen:2}}};
  const normal = kuku.reviewFact(normalDeck, 8, 7, true, 3000);
  assert.equal(normal.status, "normal");assert.equal(normal.interval, 4);assert.equal(normal.scaffold, true);

  const capDeck = {counter:0,facts:{"8x7":{interval:20,due:0,slow:false,seen:3}}};
  const capped = kuku.reviewFact(capDeck, 8, 7, true, 1000);
  assert.equal(capped.interval, kuku.config.maxInterval);
});

test("dueFacts sorts due records and noteAsked reaches future records", () => {
  const deck = {counter:2,facts:{
    "8x7":{interval:1,due:2,slow:true,seen:1},
    "2x3":{interval:2,due:1,slow:false,seen:2},
    "3x4":{interval:2,due:3,slow:false,seen:1},
    "9x9":{interval:2,due:1,slow:false,seen:1}
  }};
  assert.deepEqual(values(kuku.dueFacts(deck, [2,3,8])).map(fact => fact.key), ["2x3","8x7"]);
  assert.equal(kuku.noteAsked(deck), 3);
  assert.deepEqual(values(kuku.dueFacts(deck, [2,3,8])).map(fact => fact.key), ["2x3","8x7","3x4"]);
  assert.deepEqual(values(kuku.dueFacts(deck, [9])).map(fact => fact.key), ["9x9"]);
});

test("a slow correct fact returns with a phrase scaffold in the next set", () => {
  const deck = kuku.createDeck();
  kuku.reviewFact(deck, 8, 7, true, kuku.config.slowMs);
  kuku.noteAsked(deck);
  const set = kuku.buildSet(7, deck, seeded(1010));
  assert.equal(set[1].factKey, "8x7");
  assert.equal(set[1].scaffold, phrases.phrase(8, 7));
  assert.equal(set[4].factKey, "8x7");
  assert.equal(set[4].scaffold, null);
});

test("validateDeck rejects broken saved data", () => {
  assert.throws(() => kuku.validateDeck({counter:"0",facts:{}}), /デッキ/);
  assert.throws(() => kuku.validateDeck({counter:0,facts:{"8x7":{interval:-1,due:0,slow:false}}}), /デッキ/);
  assert.throws(() => kuku.validateDeck({counter:0,facts:[]}), /デッキ/);
});

test("generated questions never expose timing or speed wording", () => {
  const random = seeded(1212);
  for(let lv=1;lv<=10;lv++)assert.doesNotMatch(JSON.stringify(kuku.buildSet(lv, null, random)), /はやい|おそい|秒|タイム/);
});

test("buildSet works without a saved deck and every format is judgeable", () => {
  const set = kuku.buildSet(10, undefined, seeded(1313));
  assert.equal(set.length, kuku.config.setSize);
  const runAnswer = set[0].steps.map(step => step.ans);
  assert.equal(kuku.judge(set[0], runAnswer), true);
  assert.equal(kuku.judge(set[0], runAnswer.slice(1)), false);
  set.slice(1).forEach(question => {
    assert.equal(kuku.judge(question, question.ans), true);
    assert.equal(kuku.judge(question, question.ans+1000), false);
  });
});

console.log(`RESULT ${passed} passed, 0 failed`);
