/* 数量関係の図化を画面から 5 問通して解く配線テスト。問題オブジェクトは参照せず、
   問題文と、本文に描かれた図 (SVG のラベルと くくり) だけから答えを作る。
   図が本文に描かれる smoke (単図 1 枚・対比ペア 2 枚) と、フィードバックの
   解説カード (explainCard) の結線も確かめる。
   node tests/test_komorebi_diagram_model_session.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
const files = KOMOREBI_FILES.slice();
files.splice(files.indexOf("komorebi/trophies.js"), 0,
  "komorebi/diagram_engine.js", "komorebi/diagram_model_generator.js");
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
  const volume = Object.assign({}, originalVolume, { categories: originalVolume.categories.concat(["kom_diagram_model"]) });
  const plain = () => plainText(app.innerHTML);

  /* --- 図の読み取り。SVG のラベル (名前・値・?・くくり) を座標ごと取り出す。 --- */
  function figures(){
    const block = /<div class="diagram-figures[^"]*">([\s\S]*?)<\/div>\s*(?:<div class="ratio|<form|$)/.exec(app.innerHTML);
    const html = block ? block[1] : app.innerHTML;
    return (html.match(/<svg[\s\S]*?<\/svg>/g) || []).map(svg => {
      const texts = [], rects = [];
      let m;
      const textRe = /<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
      while((m = textRe.exec(svg))) texts.push({ x: Number(m[1]), y: Number(m[2]), t: m[3] });
      const rectRe = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g;
      while((m = rectRe.exec(svg))) rects.push({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]) });
      const bracket = /<path d="M ([\d.]+) [\d.]+ L [\d.]+ [\d.]+ L ([\d.]+) [\d.]+ L/.exec(svg);
      return { svg, texts, rects, bracket: bracket ? [Number(bracket[1]), Number(bracket[2])] : null };
    });
  }
  /* 問題文 (ask より前) から 全体・部分・求める量 を読む。Lv1 は 全体と部分 (sum2)。 */
  function readModel(){
    const body = plain();
    const ask = /([^。\s]+)は何(こ|本|人)ですか/.exec(body);
    assert.ok(ask, "求める量が読めない: " + body.slice(0, 240));
    const head = body.slice(0, ask.index);
    const whole = /全部で\s*(\d+)\s*(こ|本|人)/.exec(head);
    assert.ok(whole, "全体の数が読めない: " + head);
    const numRe = /(\d+)\s*(こ|本|人)/g;
    let m, part = null;
    while((m = numRe.exec(head))){
      const before = head.slice(0, m.index);
      if(/全部で\s*$/.test(before)) continue;
      const prefix = /([^\s。、]+)が\s*$/.exec(before);
      if(!prefix) continue;
      part = { value: Number(m[1]), unit: m[2], name: prefix[1].replace(/^そのうち/, "") };
      break;
    }
    assert.ok(part && part.name, "部分の数が読めない: " + head);
    return { whole: Number(whole[1]), unit: whole[2], part, unknownName: ask[1] };
  }
  function below(figure, name){
    const label = figure.texts.find(item => item.t === name);
    if(!label) return null;
    const value = figure.texts.find(item => item.y > label.y && Math.abs(item.x - label.x) < 0.7);
    return value ? value.t : null;
  }
  function figureVerdict(figure, model){
    const partBelow = below(figure, model.part.name);
    const unknownBelow = below(figure, model.unknownName);
    const top = figure.texts.find(item => item.y < 20);
    const minX = Math.min.apply(null, figure.rects.map(r => r.x));
    const maxX = Math.max.apply(null, figure.rects.map(r => r.x + r.w));
    const fullBracket = figure.bracket && Math.abs((figure.bracket[1] - figure.bracket[0]) - (maxX - minX)) < 1;
    const singleRow = figure.rects.every(r => r.y === figure.rects[0].y);
    if(partBelow === model.part.value + model.part.unit && unknownBelow === "?"
      && top && top.t === model.whole + model.unit && fullBracket && singleRow) return "正しい";
    if((partBelow && partBelow.indexOf("?") >= 0) || (unknownBelow && /^\d/.test(unknownBelow))) return "?の場所がちがう";
    if(!fullBracket || !top || top.t !== model.whole + model.unit) return "部分と全体を取りちがえている";
    if(!singleRow) return "あわせる形とくらべる形がちがう";
    throw new Error("図の型を判定できない: " + figure.svg.slice(0, 200));
  }
  function choiceLabels(){
    const labels = [];
    const pattern = /<button\b[^>]*data-choice-index="(\d+)"[^>]*>([\s\S]*?)<\/button>/g;
    let match;
    while((match = pattern.exec(app.innerHTML))) labels[Number(match[1])] = plainText(match[2]).trim();
    return labels;
  }
  function clickLabel(label){
    const index = choiceLabels().indexOf(label);
    assert.ok(index >= 0, "肢が画面にない: " + label + " / " + choiceLabels().join(" / "));
    const button = app.querySelectorAll("[data-choice-index]")
      .filter(candidate => Number(candidate.attrs["data-choice-index"]) === index)[0];
    assert.ok(button, "肢 " + index + " が押せない");
    button.click();
  }
  async function answerCurrent(){
    const body = plain(), figs = figures(), model = readModel();
    if(/どちらですか/.test(body)){
      assert.equal(figs.length, 2, "対比ペアの図が 2 枚描かれていない");
      const verdicts = figs.map(figure => figureVerdict(figure, model) === "正しい");
      const label = verdicts[0] && verdicts[1] ? "どちらも合っている"
        : verdicts[0] ? "ア" : verdicts[1] ? "イ" : "どちらも合っていない";
      clickLabel(label);
    }else if(/図はどうなっていますか/.test(body)){
      assert.equal(figs.length, 1, "単図が 1 枚で描かれていない");
      clickLabel(figureVerdict(figs[0], model));
    }else{
      assert.match(body, /正しい図を見て答えましょう/, "想定外の設問: " + body.slice(0, 240));
      assert.equal(figs.length, 1, "単図が 1 枚で描かれていない");
      const form = app.querySelector("[data-answer-form]");
      assert.ok(form, "数の回答フォームが描かれていない");
      form.elements = { answer: { value: String(model.whole - model.part.value) } };
      form.submit();
    }
    await settle();
    assert.match(plain(), /正解！/, "画面の図と文面から作った答えが通らない: " + plain().slice(0, 260));
    assert.match(plain(), /かいせつ/, "解説カード (explainCard) がフィードバックに出ていない");
  }

  test("the category is implemented behind release 9", () => {
    assert.equal(komorebi.categories.kom_diagram_model.course, "k10");
    assert.equal(komorebi.categories.kom_diagram_model.name, "数量関係の図化");
    assert.equal(komorebi.categories.kom_diagram_model.maxLv, 10);
    assert.equal(komorebi.categories.kom_diagram_model.release, 9);
    assert.equal(komorebi.isReleased("kom_diagram_model"), false);
    assert.ok(komorebi.sessionStarters.kom_diagram_model);
  });

  const profile = komorebi.profile();
  profile.lv.kom_diagram_model = 1;
  profile.maxLv.kom_diagram_model = 1;
  await komorebi.sessionStarters.kom_diagram_model(volume, seeded(20260815));

  let sawPair = false, sawSingle = false;
  for(let index = 0; index < 5; index++){
    const html = app.innerHTML;
    assert.ok(/class="diagram-figures/.test(html), "図の入れ物が描かれていない");
    assert.match(html, /<svg[^>]*aria-label="/, "図の SVG が本文に描かれていない");
    if(/diagram-figures is-pair/.test(html)) sawPair = true;
    else sawSingle = true;
    await answerCurrent();
    if(index < 4){
      const next = app.querySelector('[data-action="ratio-next"]');
      assert.ok(next, "次の問題へ進めない");
      next.click();
      await settle();
    }
  }

  test("figures render inline as one centred diagram or a side-by-side pair", () => {
    assert.equal(sawPair, true);
    assert.equal(sawSingle, true);
  });

  test("a full five-question session is solvable from the rendered wording and figures", () => {
    assert.equal(profile.stats.kom_diagram_model.n, 5);
    assert.equal(profile.collection.gauge, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
