"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const battle = fs.readFileSync(path.join(root, "battle.html"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

test("battle merges the komorebi collection without writing its save", () => {
  assert.match(battle, /QuestSave\.load\("komorebi",PROF\)/);
  assert.match(battle, /komorebi:\s*\(komorebi && komorebi\.collection\) \? komorebi\.collection : null/);
  assert.match(battle, /add\(komorebi\.collection\.catches\)/);
  assert.equal(battle.includes('QuestSave.save("komorebi"'), false);
});

test("battle caches one question per subject until an answer is submitted", () => {
  assert.match(battle, /turnQuestions:\{\}/);
  assert.match(battle, /var subj=RW\.gameFor\(m\.sp\)/);
  assert.match(battle, /var q=st\.turnQuestions\[subj\]/);
  assert.match(battle, /st\.turnQuestions\[subj\]=q/);
  assert.match(battle, /function answer\(c\)[\s\S]*?st\.turnQuestions=\{\}/);
});

test("battle routes party names through the provisional-name helper", () => {
  assert.match(battle, /function speciesName\(sp\).*Q4B_SPECIES_DISPLAY_NAME/);
  assert.match(battle, /speciesName\(m\.sp\)/);
});

test("equipment picker includes the komorebi collection read-only", () => {
  assert.match(home, /QuestSave\.load\("komorebi",pid\)/);
  assert.match(home, /states\.komorebi&&states\.komorebi\.collection&&states\.komorebi\.collection\.catches/);
  assert.equal(home.includes('QuestSave.save("komorebi"'), false);
});

console.log(`RESULT ${passed} passed, 0 failed`);
