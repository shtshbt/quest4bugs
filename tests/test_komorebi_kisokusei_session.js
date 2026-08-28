/* Solve one five-question session from rendered wording without reading question objects.
   Run with: node tests/test_komorebi_kisokusei_session.js */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const files = KOMOREBI_FILES.slice();
files.splice(files.indexOf("komorebi/trophies.js"), 0, "komorebi/kisokusei_generator.js");
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
  const volume = Object.assign({}, originalVolume, { categories: originalVolume.categories.concat(["kom_kisokusei"]) });
  const plain = () => plainText(app.innerHTML);

  function indexedLabels(attribute){
    const labels = [];
    const pattern = new RegExp('<button\\b[^>]*' + attribute + '="(\\d+)"[^>]*>([\\s\\S]*?)<\\/button>', "g");
    let match;
    while((match = pattern.exec(app.innerHTML))) labels[Number(match[1])] = plainText(match[2]).trim();
    return labels;
  }
  function clickIndexed(attribute, index){
    const button = app.querySelectorAll("[" + attribute + "]")
      .filter(candidate => Number(candidate.attrs[attribute]) === index)[0];
    assert.ok(button, attribute + "=" + index + " is not rendered");
    button.click();
  }
  function colorAnswer(text){
    const match = /([赤青黄緑](?:、[赤青黄緑])+)の順にくり返してならべます。左から\s*(\d+)\s*番目/.exec(text);
    assert.ok(match, "Cannot read the periodic sequence: " + text.slice(0, 240));
    const sequence = match[1].split("、");
    return sequence[(Number(match[2]) - 1) % sequence.length];
  }
  function periodicOccurrenceAnswer(text){
    const match = /([赤青黄緑](?:、[赤青黄緑])+)の順にくり返してならべます。左から\s*(\d+)\s*番目までに\s*([赤青黄緑])は何こ/.exec(text);
    if(!match) return null;
    const sequence = match[1].split("、"), count = Number(match[2]), target = match[3];
    return Math.floor(count / sequence.length) * sequence.filter(color => color === target).length
      + sequence.slice(0, count % sequence.length).filter(color => color === target).length;
  }
  function answerChoice(){
    const body = plain();
    const labels = indexedLabels("data-choice-index");
    let label;
    if(/答案のどこを確かめますか/.test(body)){
      const occurrenceAnswer = periodicOccurrenceAnswer(body), shown = /こたえ\s*(\d+)/.exec(body);
      if(occurrenceAnswer !== null && shown && occurrenceAnswer === Number(shown[1])) label = "正しい (べつのとき方)";
      else if(/あまりの分を\s*1\s*こ多く数える/.test(body)) label = "あまりの読み方がちがう";
      else if(/(?:両はしにビル|両はしに門|両がわにかべ)/.test(body) && /(?:÷\s*\d+\s*\+\s*1|÷\s*\(\s*\d+\s*-\s*1\s*\)|×\s*\(\s*\d+\s*-\s*1\s*\))/.test(body)) label = "数えかたの型がちがう";
      else throw new Error("Cannot diagnose the rendered work: " + body.slice(0, 260));
    }else{
      const color = colorAnswer(body);
      label = /求める式を選びましょう/.test(body)
        ? labels.find(candidate => candidate && candidate.indexOf("位置として " + color) >= 0)
        : color;
    }
    const index = labels.indexOf(label);
    assert.ok(index >= 0, "The answer is not rendered: " + label + " / " + labels.join(" / "));
    clickIndexed("data-choice-index", index);
  }
  function answerOrdering(){
    const labels = indexedLabels("data-part-index");
    assert.equal(labels.length, 4, "Four ordering parts are required");
    const plan = labels.findIndex(label => !/\d/.test(label));
    const last = labels.findIndex(label => /^答えは/.test(label));
    const numeric = labels.map((label, index) => !/^答えは/.test(label) && /\d/.test(label) ? index : -1).filter(index => index >= 0);
    const first = numeric.find(index => {
      const result = /=\s*(\d+)/.exec(labels[index]);
      return result && numeric.some(other => other !== index && new RegExp("(?:^|\\D)" + result[1] + "(?:\\D|$)").test(labels[other]));
    });
    const second = numeric.find(index => index !== first);
    const order = /^初めと終わりのちがいを見る$/.test(labels[plan])
      ? [plan, first, second, last]
      : [first, plan, second, last];
    assert.equal(new Set(order).size, 4, "Cannot order the rendered parts: " + labels.join(" / "));
    order.forEach(index => clickIndexed("data-part-index", index));
    const submit = app.querySelector('[data-action="submit-order"]');
    assert.ok(submit, "The ordering answer cannot be submitted");
    submit.click();
  }
  async function answerCurrent(){
    if(app.querySelectorAll("[data-part-index]").length) answerOrdering();
    else answerChoice();
    await settle();
    assert.match(plain(), /正解！/, "The rendered wording did not produce a correct answer: " + plain().slice(0, 260));
  }

  test("the category is implemented behind release 9", () => {
    assert.equal(komorebi.categories.kom_kisokusei.course, "k10");
    assert.equal(komorebi.categories.kom_kisokusei.name, "きまりと数えかた");
    assert.equal(komorebi.categories.kom_kisokusei.maxLv, 10);
    assert.equal(komorebi.categories.kom_kisokusei.release, 5);
    assert.equal(komorebi.isReleased("kom_kisokusei"), false /* CURRENT_RELEASE=3 < 5 */);
    assert.ok(komorebi.sessionStarters.kom_kisokusei);
  });

  const profile = komorebi.profile();
  profile.lv.kom_kisokusei = 10;
  profile.maxLv.kom_kisokusei = 10;
  await komorebi.sessionStarters.kom_kisokusei(volume, seeded(20260814));

  for(let index = 0; index < 5; index++){
    await answerCurrent();
    if(index < 4){
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next, "The session cannot advance to the next question");
      next.click();
      await settle();
    }
  }

  test("a full five-question session is solvable from the rendered wording", () => {
    assert.equal(profile.stats.kom_kisokusei.n, 5);
    assert.equal(profile.collection.gauge, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
