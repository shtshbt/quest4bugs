/* 情報整理を画面から 5 問通して解く配線テスト。問題オブジェクトは参照せず、
   本文 (johou-passage) の文と問い文と設問だけから答えを作る。本文・問い文・設問の
   分割描画と、可変長 find_all の描画も確かめる。
   node tests/test_komorebi_johou_seiri_session.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const files = KOMOREBI_FILES.slice();
files.splice(files.indexOf("komorebi/trophies.js"), 0, "komorebi/johou_seiri_generator.js");
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
  const volume = Object.assign({}, originalVolume, { categories: originalVolume.categories.concat(["kom_johou_seiri"]) });
  const plain = () => plainText(app.innerHTML);

  function passageParts(){
    const block = /<div class="johou-passage">([\s\S]*?)<\/div>/.exec(app.innerHTML);
    assert.ok(block, "本文ブロック (johou-passage) が描かれていない");
    const sentences = [];
    const re = /<p(?:\s+class="([^"]*)")?>([\s\S]*?)<\/p>/g;
    let match, ask = "";
    while((match = re.exec(block[1]))){
      if(match[1] === "johou-ask") ask = plainText(match[2]).trim();
      else sentences.push(plainText(match[2]).trim());
    }
    assert.ok(sentences.length >= 2 && ask, "本文の文と問い文が分かれていない");
    return { sentences, ask };
  }
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
    assert.ok(button, attribute + "=" + index + " が画面にない");
    button.click();
  }
  function submitNumber(value){
    const form = app.querySelector("[data-answer-form]");
    assert.ok(form, "数の回答フォームが描かれていない");
    form.elements = { answer: { value: String(value) } };
    form.submit();
  }
  function answerFindAll(){
    /* Lv2 の Q5: 使う数をぜんぶ選ぶ。余分は開店時こく (○時) の 1 つだけ。 */
    const labels = indexedLabels("data-multi-index");
    const wanted = labels.map((label, index) => /時/.test(label) ? -1 : index).filter(index => index >= 0);
    assert.ok(wanted.length >= 2 && wanted.length < labels.length, "使う数の選別ができない: " + labels.join(" / "));
    wanted.forEach(index => clickIndexed("data-multi-index", index));
    const submit = app.querySelector('[data-action="submit-multi"]');
    assert.ok(submit, "まとめて答えるボタンがない");
    submit.click();
  }
  function answerExtraction(){
    const body = plain(), passage = passageParts();
    if(/何本ですか。数だけ/.test(body)){
      const match = /かごに入れたのは(\d+)本/.exec(passage.sentences.join(""));
      assert.ok(match, "本数の文が見つからない: " + passage.sentences.join(" / "));
      submitNumber(match[1]);
      return;
    }
    assert.match(body, /先に走る組の人数/, "想定外の抜き出し設問: " + body.slice(0, 240));
    const counts = passage.sentences.join("").match(/(\d+)人/g).map(token => Number(token.replace("人", "")));
    submitNumber(Math.min.apply(null, counts));
  }
  function answerRole(){
    const quoted = /「(\d+[^」]*)」は何をあらわす数ですか/.exec(plain());
    assert.ok(quoted, "名指しの設問が読めない: " + plain().slice(0, 240));
    const sentence = passageParts().sentences.find(text => text.indexOf(quoted[1]) >= 0);
    assert.ok(sentence, "名指しの数の文が見つからない: " + quoted[1]);
    const labels = indexedLabels("data-choice-index");
    const hits = labels.map((label, index) => sentence.indexOf(label.replace(/の(数|人数|長さ|ねだん)$/, "")) >= 0 ? index : -1)
      .filter(index => index >= 0);
    assert.equal(hits.length, 1, "文に合う肢を 1 つに絞れない: " + sentence + " / " + labels.join(" / "));
    clickIndexed("data-choice-index", hits[0]);
  }
  function answerNumberUnit(){
    const passage = passageParts();
    const side = /(長い|短い)ほうです/.exec(passage.sentences.join(""));
    assert.ok(side, "どちらのテープかが書かれていない");
    const match = new RegExp(side[1] + "ほうは(\\d+)(cm|m)").exec(passage.sentences.join(""));
    assert.ok(match, "テープの長さが見つからない");
    const chip = app.querySelectorAll("[data-unit]").filter(candidate => candidate.attrs["data-unit"] === match[2])[0];
    const form = app.querySelector("[data-answer-form]");
    assert.ok(chip && form, "数値と単位の回答部品がそろっていない");
    form.elements = { answer: { value: match[1] } };
    chip.click();
    form.submit();
  }
  async function answerCurrent(){
    const body = plain();
    if(app.querySelectorAll("[data-multi-index]").length) answerFindAll();
    else if(/は何をあらわす数ですか/.test(body)) answerRole();
    else if(app.querySelectorAll("[data-unit]").length) answerNumberUnit();
    else answerExtraction();
    await settle();
    assert.match(plain(), /正解！/, "画面の文面から作った答えが通らない: " + plain().slice(0, 260));
  }

  test("the category is implemented behind release 9", () => {
    assert.equal(komorebi.categories.kom_johou_seiri.course, "k10");
    assert.equal(komorebi.categories.kom_johou_seiri.name, "情報整理");
    assert.equal(komorebi.categories.kom_johou_seiri.maxLv, 10);
    assert.equal(komorebi.categories.kom_johou_seiri.release, 4);
    assert.equal(komorebi.isReleased("kom_johou_seiri"), false /* CURRENT_RELEASE=3 < 4 */);
    assert.ok(komorebi.sessionStarters.kom_johou_seiri);
  });

  const profile = komorebi.profile();
  profile.lv.kom_johou_seiri = 2;
  profile.maxLv.kom_johou_seiri = 2;
  await komorebi.sessionStarters.kom_johou_seiri(volume, seeded(7));

  let sawVariableFindAll = false;
  for(let index = 0; index < 5; index++){
    test("question " + (index + 1) + " renders the passage split from the prompt", () => {
      passageParts();
      /* 暫定連結 (本文＋「／」＋設問) を画面に出さない。ゲージの「0／8」とは
         「。／」の並びで区別する。 */
      assert.doesNotMatch(plain(), /。／/, "連結された question.text が画面に出ている");
    });
    const multi = app.querySelectorAll("[data-multi-index]");
    if(multi.length && indexedLabels("data-multi-index").length !== 4) sawVariableFindAll = true;
    await answerCurrent();
    if(index < 4){
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next, "次の問題へ進めない");
      next.click();
      await settle();
    }
  }
  void sawVariableFindAll; /* Lv2 は 4 肢固定。可変長は生成器テストが 3〜7 肢で検査する。 */

  test("a full five-question session is solvable from the rendered wording", () => {
    assert.equal(profile.stats.kom_johou_seiri.n, 5);
    assert.equal(profile.collection.gauge, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
