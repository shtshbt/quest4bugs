"use strict";

/* Runtime coverage for the playable kom_ratio five-question session.
   Usage: node tests/test_komorebi_ratio.js */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console, setTimeout, clearTimeout};
context.window = context;
context.Q4B_KOMOREBI_NO_BOOT = true;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js", "komorebi/ratio_generator.js", "shared/economy_flag.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const komorebi = context.Q4B_KOMOREBI;
const pool = JSON.parse(fs.readFileSync(path.join(root, "komorebi/assets/ratio_pool.json"), "utf8"));
const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
let passed = 0;

function test(name, fn){fn();passed++;console.log("PASS", name);}
function seeded(seed){
  let state = seed >>> 0;
  return function(){
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function formatCounts(questions){
  const counts = {normal:0, formulation:0, ordering:0, diagnosis:0};
  questions.forEach(question => { counts[question.format]++; });
  return counts;
}
function plain(value){return JSON.parse(JSON.stringify(value));}

test("the built pool is sorted and contains all authored items", () => {
  assert.equal(komorebi.validateRatioPool(pool), pool);
  assert.equal(pool.length, 105);
  const ids = pool.map(item => item.id);
  assert.deepEqual(ids, ids.slice().sort());
});

test("every level follows the five-question curriculum form mix", () => {
  for(let lv=1;lv<=10;lv++){
    const questions = komorebi.buildRatioSet(pool, lv, {itemIds:[], patternIds:[]}, seeded(8000+lv));
    assert.equal(questions.length, 5, `Lv${lv}`);
    assert.deepEqual(formatCounts(questions), plain(komorebi.ratioFormMix[lv]), `Lv${lv}`);
  }
});

test("static shortages fall back to normal questions", () => {
  const tinyPool = [pool.find(item => item.id === "ratio_dx_401")];
  const questions = komorebi.buildRatioSet(tinyPool, 5, {itemIds:[], patternIds:[]}, seeded(55));
  assert.equal(questions.length, 5);
  assert.deepEqual(formatCounts(questions), {normal:4, formulation:1, ordering:0, diagnosis:0});
});

test("set selection avoids the last twelve static item ids", () => {
  const orderingIds = pool.filter(item => item.kind === "order" && item.lv === 5).map(item => item.id);
  const history = {itemIds:orderingIds.slice(0, 12), patternIds:[]};
  const questions = komorebi.buildRatioSet(pool, 5, history, seeded(512));
  questions.filter(item => item.format === "ordering").forEach(item => {
    assert.equal(history.itemIds.includes(item.id), false, item.id);
  });
  const next = komorebi.updateRatioHistory(history, questions);
  assert.ok(next.itemIds.length <= 12);
  assert.ok(next.patternIds.length <= 12);
});

test("formulation and diagnosis chains place their normal child immediately after", () => {
  const formulationSet = komorebi.buildRatioSet(pool, 2, {itemIds:[], patternIds:[]}, seeded(22));
  const diagnosisSet = komorebi.buildRatioSet(pool, 6, {itemIds:[], patternIds:[]}, seeded(66));
  const chained = formulationSet.concat(diagnosisSet).filter(question => question.chainRole === "recognition");
  assert.ok(chained.some(question => question.format === "formulation"));
  assert.ok(chained.some(question => question.format === "diagnosis"));
  for(const questions of [formulationSet, diagnosisSet]){
    questions.forEach((question, index) => {
      if(question.chainRole !== "recognition")return;
      const child = questions[index+1];
      assert.ok(child, question.chainId);
      assert.equal(child.format, "normal", question.chainId);
      assert.equal(child.chainId, question.chainId);
      assert.equal(child.patternId, question.chainPatternId);
      if(question.format === "formulation")assert.deepEqual(plain(child.model), plain(question.model));
    });
  }
});

test("order judging accepts the authored order and rejects a wrong order", () => {
  const question = komorebi.buildRatioSet(pool, 5, {itemIds:[], patternIds:[]}, seeded(505))
    .find(item => item.format === "ordering");
  assert.ok(question);
  assert.equal(komorebi.judgeStandardAnswer(question, Array.from(question.ans)), true);
  const wrong = Array.from(question.ans);
  [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
  assert.equal(komorebi.judgeStandardAnswer(question, wrong), false);
  const html = komorebi.standardQuestionBodyHtml(question);
  assert.match(html, /ratio-order-answer/);
  assert.match(html, /data-part-index=/);
  assert.match(html, /やりなおし/);
});

test("diagnosis uses the single-shot four-choice renderer", () => {
  const question = komorebi.buildRatioSet(pool, 4, {itemIds:[], patternIds:[]}, seeded(44))
    .find(item => item.format === "diagnosis");
  const html = komorebi.standardQuestionBodyHtml(question);
  assert.equal((html.match(/data-choice-index=/g) || []).length, 4);
  assert.match(html, /ratio-work/);
});

test("the waza card appears after correct and incorrect answers", () => {
  const question = context.Q4B_KOMOREBI_RATIO_GENERATOR.generate("find_base", 4, "normal", seeded(404));
  const correct = komorebi.feedbackHtml(question, true, {capture:null});
  const incorrect = komorebi.feedbackHtml(question, false, {capture:null});
  for(const html of [correct, incorrect]){
    assert.match(html, /ratio-waza/);
    assert.ok(html.includes(question.waza.primary));
    assert.ok(html.includes(question.waza.alternate));
  }
});

test("one full five-question session completes the gauge and shows a capture", () => {
  const profile = komorebi.createProfile();
  profile.collection.gauge = 3;
  const questions = komorebi.buildRatioSet(pool, 1, {itemIds:[], patternIds:[]}, seeded(101));
  let result = null;
  questions.forEach((question, index) => {
    result = komorebi.applyAnswer(profile, "kom_ratio", {
      sessionId:"ratio-full-session", submissionId:"answer-"+index,
      format:question.format, kind:question.kind, correct:true, final:true
    }, volume, () => 0);
  });
  assert.equal(profile.collection.gauge, 0);
  assert.equal(profile.collection.totalCatches, 1);
  assert.ok(result.capture);
  assert.match(komorebi.feedbackHtml(questions[4], true, result), /ratio-capture/);
});

test("adaptive progress never exceeds the ten authored curriculum levels", () => {
  const profile = komorebi.createProfile();
  for(let index=0;index<200;index++)komorebi.applyPerformance(profile, "kom_ratio", true, 1000);
  assert.equal(profile.lv.kom_ratio, 10);
  assert.equal(profile.maxLv.kom_ratio, 10);
});

console.log(`RESULT ${passed} passed, 0 failed`);
