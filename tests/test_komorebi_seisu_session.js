/* 整数の性質 (kom_seisu) のセッションテスト。release ゲート型。
   実装済みで未公開のまま開始関数が動き、画面の文面だけから 5 問セッションが解けることを固定する。
   node tests/test_komorebi_seisu_session.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const files = KOMOREBI_FILES.slice();
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function seeded(seed){
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const WEEKDAYS = ["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];
function gcd(a, b){ while(b){ const t = a % b; a = b; b = t; } return a; }
function lcm(a, b){ return a / gcd(a, b) * b; }
function divisors(n){
  const out = [];
  for(let d = 1; d * d <= n; d++) if(n % d === 0){ out.push(d); if(d !== n / d) out.push(n / d); }
  return out.sort((x, y) => x - y);
}

(async () => {
  const context = bootKomorebi({ root, files, profileType: "k10" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const originalVolume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia;
  const volume = Object.assign({}, originalVolume, { categories: originalVolume.categories.concat(["kom_seisu"]) });

  const plain = () => plainText(app.innerHTML);
  function questionText(){
    const match = /<h2>([\s\S]*?)<\/h2>/.exec(app.innerHTML);
    assert.ok(match, "問題文が描かれていない");
    return plainText(match[1]).replace(/\s+/g, " ").trim();
  }
  function workLines(){
    const block = /<div class="ratio-work">([\s\S]*?)<\/div>/.exec(app.innerHTML);
    if(!block) return [];
    return (block[1].match(/<p>([\s\S]*?)<\/p>/g) || [])
      .map(row => plainText(row.replace(/<\/?p>/g, "")).replace(/\s+/g, " ").trim());
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
  function chooseLabel(label){
    const labels = indexedLabels("data-choice-index");
    const index = labels.indexOf(label);
    assert.ok(index >= 0, "選ぶべき肢が画面にない: " + label + " / " + labels.join(" / "));
    clickIndexed("data-choice-index", index);
  }

  /* --- Lv3 (数のみ 3 問と候補提示型 2 問) を文面だけで解く ------------------- */
  function answerLv3(){
    const text = questionText();
    const multi = indexedLabels("data-multi-index");
    if(multi.length){
      const match = /から (\d+) と (\d+) の(公約数|公倍数)をすべて/.exec(text);
      assert.ok(match, "候補提示型の本文が読めない: " + text);
      const a = Number(match[2 - 1]), b = Number(match[2]), wantDivisors = match[3] === "公約数";
      const wanted = multi.map((label, index) => {
        const value = Number(label);
        const ok = wantDivisors ? (a % value === 0 && b % value === 0) : (value % a === 0 && value % b === 0);
        return ok ? index : -1;
      }).filter(index => index >= 0);
      assert.ok(wanted.length >= 2 && wanted.length < multi.length, "正解集合が読めない: " + multi.join(" / "));
      wanted.forEach(index => clickIndexed("data-multi-index", index));
      const submit = app.querySelector('[data-action="submit-multi"]');
      assert.ok(submit, "まとめて答えるボタンがない");
      submit.click();
      return;
    }
    const pair = /(\d+) と (\d+) の(最大公約数|最小公倍数|公約数)/.exec(text);
    assert.ok(pair, "2 数の本文が読めない: " + text);
    const a = Number(pair[1]), b = Number(pair[2]);
    if(pair[3] === "最大公約数") submitNumber(gcd(a, b));
    else if(pair[3] === "最小公倍数") submitNumber(lcm(a, b));
    else submitNumber(divisors(gcd(a, b)).length);
  }

  /* --- Lv8 (立式 2 問、曜日の選択 2 問、答案診断 1 問) を文面だけで解く ------- */
  function answerLv8(){
    const text = questionText(), work = workLines();
    if(work.length){
      /* 答案診断。もんだいの正しい答えを自分で出し、答案と突き合わせてラベルを決める。 */
      const expression = (work.find(line => /^しき/.test(line)) || "").replace(/^しき\s*/, "");
      const shown = (work.find(line => /^こたえ/.test(line)) || "").replace(/^こたえ\s*/, "");
      const align = /(\d+) 秒ごと、B のライトは (\d+) 秒ごと[\s\S]*?このあと (\d+) 秒(までのあいだに|より前に)/.exec(text);
      if(align){
        const step = lcm(Number(align[1]), Number(align[2])), total = Number(align[3]);
        const right = align[4] === "までのあいだに" ? Math.floor(total / step) : Math.ceil(total / step) - 1;
        const given = Number(shown.replace(/[^0-9]/g, ""));
        if(given === right) return chooseLabel("正しい");
        if(/最大公約数/.test(expression)) return chooseLabel("公約数と公倍数を取りちがえている");
        const division = /(\d+)÷(\d+)=(\d+)/.exec(expression);
        const arithmetic = division && Math.floor(Number(division[1]) / Number(division[2])) === Number(division[3]);
        return chooseLabel(arithmetic && Math.abs(given - right) === 1
          ? "数えかたが 1 ずれている" : "計算だけまちがえている");
      }
      const weekday = /今日は(.曜日)です。(\d+) 日後は何曜日/.exec(text);
      if(weekday){
        const start = WEEKDAYS.indexOf(weekday[1]), days = Number(weekday[2]);
        const right = WEEKDAYS[(start + days % 7) % 7];
        if(shown === right) return chooseLabel("正しい");
        return chooseLabel(/商を使う/.test(expression)
          ? "商とあまりを取りちがえている" : "計算だけまちがえている");
      }
      const rounds = /今日は(.曜日)です。今日から (\d+) 日の間に、.曜日は何回ありますか。(今日も数えます|今日は数えません)/.exec(text);
      assert.ok(rounds, "答案のもんだいが読めない: " + text);
      const quotient = Math.floor(Number(rounds[2]) / 7);
      const right = rounds[3] === "今日も数えます" ? quotient + 1 : quotient;
      const given = Number(shown.replace(/[^0-9]/g, ""));
      if(given === right) return chooseLabel("正しい");
      return chooseLabel(Math.abs(given - right) === 1 ? "数えかたが 1 ずれている" : "計算だけまちがえている");
    }
    if(/しきをえらびましょう/.test(text)){
      const days = Number(/(\d+) 日/.exec(text)[1]);
      if(/何曜日ですか/.test(text)) return chooseLabel(days + "÷7 のあまり");
      return chooseLabel(days + "÷7 の商に 1 をたす");
    }
    const forward = /今日は(.曜日)です。(\d+) 日(後|前)は何曜日/.exec(text);
    assert.ok(forward, "曜日の本文が読めない: " + text);
    const start = WEEKDAYS.indexOf(forward[1]), step = Number(forward[2]) % 7;
    const index = forward[3] === "前" ? ((start - step) % 7 + 7) % 7 : (start + step) % 7;
    chooseLabel(WEEKDAYS[index]);
  }

  async function playSession(lv, answer){
    const profile = komorebi.profile();
    profile.lv.kom_seisu = lv;
    profile.maxLv.kom_seisu = 10;
    await komorebi.sessionStarters.kom_seisu(volume, seeded(20260828 + lv));
    for(let index = 0; index < 5; index++){
      answer();
      await settle();
      assert.match(plain(), /正解！/, "画面の文面から正解に至らなかった: " + plain().slice(0, 300));
      if(index < 4){
        const next = app.querySelector('[data-action="ratio-next"]');
        assert.ok(next, "次の問題へ進めない");
        next.click();
        await settle();
      }
    }
  }

  test("release 5 の裏で実装され、画面には出ない", () => {
    assert.equal(komorebi.categories.kom_seisu.course, "k10");
    assert.equal(komorebi.categories.kom_seisu.name, "整数の性質");
    assert.equal(komorebi.categories.kom_seisu.maxLv, 10);
    assert.equal(komorebi.categories.kom_seisu.release, 5);
    assert.equal(komorebi.isReleased("kom_seisu"), false /* CURRENT_RELEASE=3 < 5 */);
    assert.ok(komorebi.sessionStarters.kom_seisu);
  });

  const profile = komorebi.profile();
  await playSession(3, answerLv3);
  test("Lv3 の 5 問セッションが画面の文面だけで解ける", () => {
    assert.equal(profile.stats.kom_seisu.n, 5);
    assert.equal(profile.collection.gauge, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  await playSession(8, answerLv8);
  test("Lv8 の 5 問セッション (立式・曜日の選択・答案診断) が画面の文面だけで解ける", () => {
    assert.equal(profile.stats.kom_seisu.n, 10);
  });

  /* --- Lv5 の整列と答案の描画配線 ------------------------------------------- */
  profile.lv.kom_seisu = 5;
  await komorebi.sessionStarters.kom_seisu(volume, seeded(555));
  let sawOrdering = false, sawWork = false;
  for(let index = 0; index < 5; index++){
    const parts = indexedLabels("data-part-index");
    if(parts.length){
      sawOrdering = true;
      assert.ok(parts.length === 4 || parts.length === 5, "整列の部品が 4 か 5 でない: " + parts.length);
      const submit = app.querySelector('[data-action="submit-order"]');
      assert.ok(submit, "整列の答えるボタンがない");
      assert.equal(submit.attrs.disabled !== undefined || submit.disabled === true, true,
        "部品を選ぶ前から答えられる");
      parts.forEach((label, at) => clickIndexed("data-part-index", at));
      app.querySelector('[data-action="submit-order"]').click();
    }else if(workLines().length){
      sawWork = true;
      const work = workLines();
      assert.ok(/^わけ/.test(work[0]) && /^しき/.test(work[1]) && /^こたえ/.test(work[2]),
        "答案の 3 欄が描かれていない: " + work.join(" / "));
      clickIndexed("data-choice-index", 0);
    }else{
      submitNumber(1);
    }
    await settle();
    if(index < 4){
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next, "次の問題へ進めない");
      next.click();
      await settle();
    }
  }
  test("Lv5 の整列と答案の 3 欄が画面に描かれ、回答まで配線されている", () => {
    assert.equal(sawOrdering, true, "整列が 1 問も描かれなかった");
    assert.equal(sawWork, true, "答案が 1 問も描かれなかった");
    assert.equal(profile.stats.kom_seisu.n, 15);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
