"use strict";

/* Ratio generator constraints and deterministic output.
   Usage: node tests/test_komorebi_ratio_generator.js */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "komorebi/ratio_generator.js"), "utf8"), context);

const generator = context.Q4B_KOMOREBI_RATIO_GENERATOR;
const canonicalLv = {
  convert:1, find_rate:2, find_compare:3, find_base:4, discount:5,
  two_step:6, ratio_share:7, soutou:8, baibai:9
};

let passed = 0;
function test(name, fn){fn();passed++;console.log("PASS", name);}
function seeded(seed){
  let state = seed >>> 0;
  return function(){
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function plain(value){return JSON.parse(JSON.stringify(value));}
function nearlyEqual(a, b){return Math.abs(a-b) < 1e-9;}

function assertDistinctChoices(question){
  if(!question.choices)return;
  assert.equal(question.choices.length, 4, question.text);
  assert.equal(question.choiceValues.length, 4, question.text);
  for(let i=0;i<question.choiceValues.length;i++){
    for(let j=0;j<i;j++)assert.equal(nearlyEqual(question.choiceValues[i], question.choiceValues[j]), false, question.text);
  }
  assert.equal(question.distractors.length, 3, question.text);
  question.distractors.forEach(distractor => {
    assert.equal(nearlyEqual(distractor.value, question.answerValue), false, question.text);
    assert.notEqual(distractor.operation, "correct", question.text);
  });
}

function assertNumericConstraints(question){
  assert.equal(generator.validateQuestion(question), true, question.text);
  const model = question.model;
  model.givenMoney.forEach(value => {
    assert.equal(Number.isInteger(value), true, question.text);
    assert.equal(value % 10, 0, question.text);
  });
  model.computedMoney.forEach(value => assert.equal(Number.isInteger(value), true, question.text));
  model.integerQuantities.forEach(value => assert.equal(Number.isInteger(value), true, question.text));
  model.ratePercents.forEach(value => assert.equal(Number.isInteger(value), true, question.text));
  Object.keys(model).filter(key => /Percent$/.test(key)).forEach(key => assert.equal(Number.isInteger(model[key]), true, question.text));
  model.divisions.forEach(division => {
    assert.equal(division.numerator % division.denominator, 0, question.text);
    assert.equal(division.result, division.numerator / division.denominator, question.text);
  });
  if(Number.isFinite(model.base) && Number.isFinite(model.compare))assert.equal(nearlyEqual(model.base, model.compare), false, question.text);
  assert.equal(Number.isFinite(question.answerValue), true, question.text);
  assertDistinctChoices(question);
}

test("one thousand generated normal questions satisfy all numeric constraints", () => {
  const random = seeded(20260813);
  const patterns = Array.from(generator.patternIds);
  for(let i=0;i<1000;i++){
    const pattern = patterns[i % patterns.length];
    const question = generator.generate(pattern, canonicalLv[pattern], "normal", random);
    assert.equal(question.pattern, pattern);
    assert.equal(question.patternId.startsWith(pattern+":"), true);
    assert.equal(question.lv, canonicalLv[pattern]);
    assert.equal(question.format, "normal");
    assert.equal(["num","choice"].includes(question.kind), true);
    assert.match(question.waza.primary, /[一-龯]/);
    assert.match(question.waza.alternate, /[一-龯]/);
    assertNumericConstraints(question);
  }
});

test("all generated distractors are semantic, unique, and unequal to the answer", () => {
  const random = seeded(918273);
  const formulationPatterns = ["find_rate","find_compare","find_base","discount","soutou","baibai"];
  formulationPatterns.forEach(pattern => {
    const lv = canonicalLv[pattern];
    for(let i=0;i<100;i++){
      const question = generator.generate(pattern, lv, "formulation", random);
      assert.equal(question.kind, "choice");
      assert.equal(question.format, "formulation");
      assertNumericConstraints(question);
      question.distractors.forEach(distractor => assert.equal(typeof distractor.operation, "string"));
    }
  });
});

test("every formulation question offers exactly four choices", () => {
  const random = seeded(451);
  for(let lv=1;lv<=10;lv++){
    for(const pattern of Array.from(generator.patternsForLv(lv, "formulation"))){
      const question = generator.generate(pattern, lv, "formulation", random);
      assert.equal(question.choices.length, 4, `Lv${lv} ${pattern}`);
      assert.equal(question.choiceValues.length, 4, `Lv${lv} ${pattern}`);
      assert.equal(question.choiceOperations.filter(operation => operation === "correct").length, 1, `Lv${lv} ${pattern}`);
    }
  }
});

test("the same seed produces the same question", () => {
  const first = generator.generate("baibai", 9, "formulation", seeded(777));
  const second = generator.generate("baibai", 9, "formulation", seeded(777));
  assert.deepEqual(plain(first), plain(second));

  const firstLv = generator.generateForLv(10, "normal", seeded(13579));
  const secondLv = generator.generateForLv(10, "normal", seeded(13579));
  assert.deepEqual(plain(firstLv), plain(secondLv));
});

test("every level exposes and generates exactly its curriculum patterns", () => {
  const expectedNormal = {
    1:["convert"],
    2:["convert","find_rate"],
    3:["find_compare"],
    4:["find_base"],
    5:["discount"],
    6:["two_step"],
    7:["ratio_share"],
    8:["soutou"],
    9:["baibai"],
    10:["convert","find_rate","find_compare","find_base","discount","two_step","ratio_share","soutou","baibai"]
  };
  const expectedFormulation = {
    1:[],2:["find_rate"],3:["find_compare"],4:["find_base"],5:["discount"],
    6:[],7:[],8:["soutou"],9:["baibai"],
    10:["find_rate","find_compare","find_base","discount","soutou","baibai"]
  };
  const random = seeded(2468);
  for(let lv=1;lv<=10;lv++){
    assert.deepEqual(Array.from(generator.patternsForLv(lv, "normal")), expectedNormal[lv]);
    assert.deepEqual(Array.from(generator.patternsForLv(lv, "formulation")), expectedFormulation[lv]);
    expectedNormal[lv].forEach(pattern => assert.equal(generator.generate(pattern, lv, "normal", random).pattern, pattern));
    expectedFormulation[lv].forEach(pattern => assert.equal(generator.generate(pattern, lv, "formulation", random).pattern, pattern));
  }
});

test("named pattern functions and paired questions use one semantic model", () => {
  const named = generator.patterns.find_compare(3, "normal", seeded(24));
  assert.equal(named.pattern, "find_compare");
  const pair = generator.generatePair("find_base", 4, seeded(81));
  assert.ok(pair.formulation);
  assert.deepEqual(plain(pair.normal.model), plain(pair.formulation.model));
  assert.equal(pair.normal.model.patternId, pair.formulation.model.patternId);
  assert.equal(pair.normal.answerValue, pair.formulation.answerValue);
  const normalOnly = generator.generatePair("two_step", 6, seeded(82));
  assert.equal(normalOnly.formulation, null);
});

test("invalid boundary inputs fail without returning partial questions", () => {
  assert.throws(() => generator.generate("unknown", 1, "normal", seeded(1)), /パターン/);
  assert.throws(() => generator.generate("convert", 0, "normal", seeded(1)), /レベル/);
  assert.throws(() => generator.generate("convert", 1, "formulation", seeded(1)), /このレベル/);
  assert.throws(() => generator.generate("convert", 1, "normal", () => 1), /乱数の値/);
  assert.throws(() => generator.generateForLv(6, "formulation", seeded(1)), /指定した形式/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
