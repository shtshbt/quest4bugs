"use strict";

/* Regression tests for complete and consistent keisan question wording.
   Usage: node tests/test_keisan_question_quality.js */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function seeded(seed){
  let state = seed >>> 0;
  return function(){
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function loadContext(){
  const context = {console};
  context.window = context;
  context.Q4B_KEISAN_NO_BOOT = true;
  context.Math = Object.create(Math);
  context.Math.random = seeded(20260807);
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "shared/k5_devs_data.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "keisan/app.js"), "utf8"), context);
  return context;
}

const context = loadContext();
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

test("daily schedule questions state the accepted time", () => {
  const questions = context.Q4B_K5DEVS.tokei1.levels[3].pool;
  assert.equal(questions.length, 5);
  for(const question of questions){
    assert.ok(question.text.includes(question.ans), question.text);
    assert.match(question.text, /予定です/);
  }
});

test("cm and mm conversion choices include the requested unit", () => {
  const questions = context.Q4B_K5DEVS.nagasahikaku.levels[8].pool;
  for(const question of questions){
    const unitMatch = question.text.match(/なん(mm|cm)？/);
    if(!unitMatch) continue;
    const unit = unitMatch[1];
    assert.ok(question.ans.endsWith(unit), question.text);
    for(const choice of question.distractors) assert.ok(choice.endsWith(unit), question.text);
  }
});

test("river current Lv9 keeps one boat identity", () => {
  const boatPattern = /ある(ボート|船|カヌー|いかだ舟)が.*この(ボート|船|カヌー|いかだ舟)の/;
  for(let i = 0; i < 500; i++){
    const question = context.Q4B_KEISAN.genBy("ryuusui", null, 9);
    const match = question.text.match(boatPattern);
    assert.ok(match, question.text);
    assert.equal(match[1], match[2], question.text);
  }
});

console.log(`RESULT ${passed} passed, 0 failed`);
