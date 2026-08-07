"use strict";

/* Regression test for uniquely solvable bairitsu Lv7/Lv8 questions.
   Usage: node tests/test_keisan_bairitsu.js */

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

function loadKeisan(seed){
  const context = {console};
  context.window = context;
  context.Q4B_KEISAN_NO_BOOT = true;
  context.Math = Object.create(Math);
  context.Math.random = seeded(seed);
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "keisan/app.js"), "utf8"), context);
  return context.Q4B_KEISAN;
}

function parseConditions(text){
  const totalMatch = text.match(/あわせて (\d+)個/);
  const transferMatch = text.match(/を (\d+)個 あげました/);
  const multipleMatch = text.match(/の (\d+)倍に なりました/);
  assert.ok(totalMatch, text);
  assert.ok(transferMatch, text);
  assert.ok(multipleMatch, text);
  return {
    total: Number(totalMatch[1]),
    transfer: Number(transferMatch[1]),
    multiple: Number(multipleMatch[1])
  };
}

for(const level of [7, 8]){
  const keisan = loadKeisan(7000 + level);
  for(let i = 0; i < 500; i++){
    const question = keisan.genBy("bairitsu", null, level);
    const {total, transfer, multiple} = parseConditions(question.text);
    const afterReceiver = total / (multiple + 1);
    assert.ok(Number.isInteger(afterReceiver), question.text);
    assert.equal(question.ans, multiple * afterReceiver + transfer, question.text);
  }
  console.log("PASS 倍数算 Lv" + level + " has a unique answer in 500 generated questions");
}

console.log("RESULT 2 passed, 0 failed");
