/* 速さを画面から 5 問通して解く配線テスト。問題オブジェクトは参照せず、
   問題文・式の選択肢・答案の文面・単位チップだけから答えを作る。
   node tests/test_komorebi_hayasa_session.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const files = KOMOREBI_FILES.slice();
files.splice(files.indexOf("komorebi/trophies.js"), 0, "komorebi/hayasa_generator.js");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function seeded(seed){
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files, profileType: "k10" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const originalVolume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia;
  const volume = Object.assign({}, originalVolume, { categories: originalVolume.categories.concat(["kom_hayasa"]) });
  const plain = () => plainText(app.innerHTML);

  function choiceLabels(){
    const labels = [];
    const pattern = /<button\b[^>]*data-choice-index="(\d+)"[^>]*>([\s\S]*?)<\/button>/g;
    let match;
    while((match = pattern.exec(app.innerHTML))) labels[Number(match[1])] = plainText(match[2]).trim();
    return labels;
  }
  function clickChoice(index){
    const button = app.querySelectorAll("[data-choice-index]")
      .filter(candidate => Number(candidate.attrs["data-choice-index"]) === index)[0];
    assert.ok(button, "選択肢 " + index + " が画面にない");
    button.click();
  }
  function evaluateExpression(text){
    const normalized = text.replace(/×/g, "*").replace(/÷/g, "/");
    assert.match(normalized, /^[\d.()+\-*/\s]+$/, "式に想定外の文字がある: " + text);
    return Function("return (" + normalized + ");")();
  }
  function expectedFromText(text){
    let match = /(\d+)m の道のりを 分速 (\d+)m/.exec(text);
    if(match) return { value: Number(match[1]) / Number(match[2]), unit: "分" };
    match = /(\d+)m の道のりを (\d+) 分/.exec(text);
    if(match) return { value: Number(match[1]) / Number(match[2]), unit: "分速m" };
    match = /分速 (\d+)m で歩く人が (\d+) 分/.exec(text);
    if(match) return { value: Number(match[1]) * Number(match[2]), unit: "m" };
    throw new Error("問題文から答えを作れない: " + text.slice(0, 240));
  }
  function answerFormulation(){
    const expected = expectedFromText(plain()).value;
    const labels = choiceLabels();
    const correct = labels.map(evaluateExpression).findIndex(value => Math.abs(value - expected) < 1e-9);
    assert.ok(correct >= 0, "正しい式が画面にない: " + labels.join(" / "));
    clickChoice(correct);
  }
  function answerDiagnosis(){
    const body = plain();
    const label = /しき\s+\d+\s+×\s+\d+/.test(body)
      ? "正しい" : "かけ算とわり算のえらび方がちがう";
    const index = choiceLabels().indexOf(label);
    assert.ok(index >= 0, "診断ラベルが画面にない: " + label);
    clickChoice(index);
  }
  function answerNumberUnit(){
    const answer = expectedFromText(plain());
    const form = app.querySelector("[data-answer-form]");
    const chip = app.querySelectorAll("[data-unit]").filter(candidate => candidate.attrs["data-unit"] === answer.unit)[0];
    assert.ok(form && chip, "数値と単位の回答部品がそろっていない: " + answer.unit);
    form.elements = { answer: { value: String(answer.value) } };
    chip.click();
    form.submit();
  }
  async function answerCurrent(){
    const body = plain();
    if(/答案のどこを確かめますか/.test(body)) answerDiagnosis();
    else if(app.querySelectorAll("[data-choice-index]").length) answerFormulation();
    else answerNumberUnit();
    await settle();
    assert.match(plain(), /正解！/, "画面の文面から作った答えが通らない: " + plain().slice(0, 260));
  }

  test("the category is implemented behind release 9", () => {
    assert.equal(komorebi.categories.kom_hayasa.course, "k10");
    assert.equal(komorebi.categories.kom_hayasa.name, "速さ");
    assert.equal(komorebi.categories.kom_hayasa.maxLv, 10);
    assert.equal(komorebi.categories.kom_hayasa.release, 9);
    assert.equal(komorebi.isReleased("kom_hayasa"), false);
    assert.ok(komorebi.sessionStarters.kom_hayasa);
  });

  const profile = komorebi.profile();
  profile.lv.kom_hayasa = 2;
  profile.maxLv.kom_hayasa = 2;
  await komorebi.sessionStarters.kom_hayasa(volume, seeded(20260814));

  let sawSpeedUnits = false;
  let sawTimeUnits = false;
  for(let index = 0; index < 5; index++){
    const units = app.querySelectorAll("[data-unit]").map(chip => chip.attrs["data-unit"]);
    if(units.length === 4 && units.indexOf("時速km") >= 0 && units.indexOf("分速m") >= 0) sawSpeedUnits = true;
    if(units.length === 3 && units.indexOf("時間") >= 0 && units.indexOf("秒") >= 0) sawTimeUnits = true;
    await answerCurrent();
    if(index < 4){
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next, "次の問題へ進めない");
      next.click();
      await settle();
    }
  }

  test("a full five-question session is solvable from the rendered wording", () => {
    assert.equal(profile.stats.kom_hayasa.n, 5);
    assert.equal(profile.collection.gauge, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  test("speed and time questions render their independent unit chips", () => {
    assert.equal(sawSpeedUnits, true);
    assert.equal(sawTimeUnits, true);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
