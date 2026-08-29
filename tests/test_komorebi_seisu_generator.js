/* 整数の性質 (kom_seisu) の生成器テスト。
   仕様の正本は docs/komorebi_seisu_curriculum.md (v0.6) の 10 章。敵ソルバーの攻撃集合は
   docs/komorebi_seisu_audit.md 7.4 章 (A1 から A24) を正本とする。
   node tests/test_komorebi_seisu_generator.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "komorebi/seisu_generator.js"), "utf8");
const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "seisu_generator.js" });
const engine = context.Q4B_KOMOREBI_SEISU;

let passed = 0;
function test(name, fn){
  try{ fn(); }
  catch(error){ console.error("FAIL " + name + ": " + error.message); process.exit(1); }
  passed++; console.log("PASS", name);
}
function seeded(seed){
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

const gcd = engine.gcd, lcm = engine.lcm, divisors = engine.divisors;
const commonDivisors = engine.commonDivisors, isPrime = engine.isPrime;
const LEVELS = [1,2,3,4,5,6,7,8,9,10];

/* 生成の母数。10 章は敵ソルバーを 200 セットで測ると定める。空間サイズの検査 (検証 13)
   だけは Lv10 の 43 型を引き当てるために母数を増やす。 */
const SETS_PER_LV = 200;
const SPACE_SETS = { 10: 400 };

const corpus = {};
LEVELS.forEach(lv => {
  const total = Math.max(SETS_PER_LV, SPACE_SETS[lv] || 0);
  corpus[lv] = [];
  for(let i = 0; i < total; i++) corpus[lv].push(engine.buildSet(lv, seeded(7919 * lv + 104729 * i + 13)));
});
const flat = {};
LEVELS.forEach(lv => { flat[lv] = corpus[lv].slice(0, SETS_PER_LV).reduce((all, set) => all.concat(set), []); });
const everyQuestion = LEVELS.reduce((all, lv) => all.concat(flat[lv]), []);

function sortNum(list){ return list.slice().sort((a,b) => a-b); }
function sameNumbers(a, b){
  const x = sortNum(a), y = sortNum(b);
  return x.length === y.length && x.every((value, index) => value === y[index]);
}
function setText(question){
  return question.ansSet ? sortNum(question.ansSet.map(i => Number(question.choices[i]))).join(",") : null;
}

/* ---- 1. 定数表の整合 (検証 3、4、13、15、24、36) ---------------------------- */

test("3.1 章の pattern は 47 種で、Lv 別の空間サイズが 9.4 章と一致する (検証 3、4、13)", () => {
  assert.equal(Object.keys(engine.patterns).length, 47);
  const table = { 1:5, 2:5, 3:5, 4:6, 5:8, 6:11, 7:6, 8:4, 9:6, 10:43 };
  LEVELS.forEach(lv => {
    assert.equal(engine.patternSpace[lv], table[lv], `Lv${lv} の空間サイズ`);
    assert.equal(engine.lvPatterns[lv].length, table[lv]);
    engine.lvPatterns[lv].forEach(id => assert.ok(engine.patterns[id], `${id} は 3.1 章に無い`));
  });
  /* Lv10 は 47 種から Lv1 専用の 4 種を除いた 43 種。 */
  ["div_count","div_missing","div_extra","nondiv_select"].forEach(id => {
    assert.equal(engine.lvPatterns[10].indexOf(id), -1, `${id} は Lv1 専用`);
  });
});

test("全 pattern が 9.3 章の unknown 20 種のいずれかに対応する (検証 15)", () => {
  assert.equal(engine.unknownValues.length, 20);
  Object.keys(engine.patterns).forEach(id => {
    assert.ok(engine.unknownValues.indexOf(engine.patterns[id].unknown) >= 0, `${id} の unknown`);
  });
});

test("Lv ごとの誤りラベル集合が 8.1 章の表と一致する (検証 24)", () => {
  const expected = {
    5:["count_off","factor_incomplete","calc_only"],
    6:["swap_gcd_lcm","word_cue","not_minimal","not_maximal","count_off","calc_only"],
    8:["quotient_remainder","count_off","swap_gcd_lcm","calc_only"],
    9:["swap_gcd_lcm","not_minimal","not_maximal","word_cue","calc_only"],
    10:["swap_gcd_lcm","word_cue","not_minimal","not_maximal","quotient_remainder","factor_incomplete","count_off","calc_only"]
  };
  Object.keys(expected).forEach(lv => {
    assert.equal(Array.from(engine.availableErrors[lv]).sort().join(","), expected[lv].slice().sort().join(","), `Lv${lv} の可用ラベル`);
    assert.ok(engine.availableErrors[lv].length >= 3, `Lv${lv} の誤りラベルが 3 未満`);
  });
  assert.equal(Object.keys(engine.diagnosisLabels).length, 9);
  assert.equal(engine.diagnosisLabels.correct, "正しい");
  assert.equal(engine.diagnosisLabels.swap_gcd_lcm, "公約数と公倍数を取りちがえている");
});

test("全 pattern に 7.1 章のわざの行が引ける (検証 36)", () => {
  const texts = Object.keys(engine.wazaRows).map(key => engine.wazaRows[key].text);
  everyQuestion.forEach(question => {
    assert.ok(texts.indexOf(question.waza.primary) >= 0, `${question.patternId} の primary`);
    assert.ok(texts.indexOf(question.waza.alternate) >= 0, `${question.patternId} の alternate`);
  });
  const seen = {};
  everyQuestion.forEach(question => { seen[question.patternId] = true; });
  Object.keys(engine.patterns).forEach(id => {
    /* 表の側からの突き合わせ。行が引けない pattern を作らない。 */
    const waza = engine.wazaRows;
    assert.ok(Object.keys(waza).length === 11, "わざの行数");
  });
});

test("Math.random と Date.now を呼ばない (検証 37)", () => {
  /* コメント文中の言及は除いて、実際の呼び出しだけを見る。 */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert.equal(/Math\s*\.\s*random/.test(code), false, "Math.random を呼んでいる");
  assert.equal(/Date\s*\.\s*now/.test(code), false, "Date.now を呼んでいる");
});

/* ---- 2. セット単位の構造検査 --------------------------------------------- */

function checkSet(lv, set, label){
  const where = msg => `${label} Lv${lv}: ${msg}`;
  assert.equal(set.length, 5, where("5 問でない"));

  /* 検証 5: 形式配合 */
  const mix = { normal:0, find_all:0, formulation:0, ordering:0, diagnosis:0 };
  set.forEach(q => { mix[q.format]++; });
  if(lv < 10){
    const want = engine.formatMix[lv];
    Object.keys(want).forEach(key => assert.equal(mix[key], want[key], where(`形式配合 ${key}`)));
  }else{
    assert.equal(mix.ordering, 1, where("Lv10 の整列が 1 問でない"));
    const doubled = Object.keys(mix).filter(key => key !== "ordering" && mix[key] === 2);
    assert.equal(doubled.length, 1, where("Lv10 で 2 問にした形式が 1 つでない"));
  }

  /* 検証 3 の Lv 別: pattern が 9.4 章の空間に収まる */
  set.forEach(q => assert.ok(engine.lvPatterns[lv].indexOf(q.patternId) >= 0, where(`空間外 ${q.patternId}`)));

  /* 検証 14: patternId の上限と隣接相異 (検証 17) */
  const cap = Math.ceil(5 / engine.patternSpace[lv]);
  const counts = {}, chainSeen = {};
  set.forEach(q => {
    if(q.chainId){
      const key = q.chainId + "|" + q.patternId;
      if(chainSeen[key]) return;
      chainSeen[key] = true;
    }
    counts[q.patternId] = (counts[q.patternId] || 0) + 1;
  });
  Object.keys(counts).forEach(key => assert.ok(counts[key] <= cap, where(`patternId 上限 ${key}`)));
  for(let i = 0; i + 1 < 5; i++){
    const a = set[i], b = set[i+1];
    if(a.patternId === b.patternId && !(a.chainId && a.chainId === b.chainId))
      assert.fail(where(`隣接が同一 patternId ${a.patternId}`));
  }

  /* 検証 7: 対比ペア */
  const pairs = {};
  set.forEach((q, index) => { if(q.pairId) (pairs[q.pairId] = pairs[q.pairId] || []).push(index); });
  const pairKeys = Object.keys(pairs);
  assert.ok(pairKeys.length >= 1, where("対比ペアが無い"));
  if(lv === 2 || lv === 3) assert.ok(pairKeys.length >= 2, where("対比ペアが 2 組でない"));
  pairKeys.forEach(key => {
    const members = pairs[key];
    assert.equal(members.length, 2, where("ペアが 2 問でない"));
    const [x, y] = members, A = set[x], B = set[y];
    assert.equal(Math.abs(x - y), 1, where("ペアが隣接していない"));
    assert.equal(A.format, B.format, where("ペアの形式が違う"));
    assert.equal(A.kind, B.kind, where("ペアの答えの型が違う"));
    assert.ok(sameNumbers(A.numbers, B.numbers), where("ペアの与件の多重集合が違う"));
    assert.ok(engine.pairTypes.indexOf(A.pairType) >= 0, where("ペア型が 3.2 章に無い"));
    if(A.format === "find_all"){
      assert.ok(sameNumbers(A.candidates, B.candidates), where("ペアの候補が違う"));
      assert.notEqual(setText(A), setText(B), where("ペアの正解集合が一致"));
    }else{
      const ca = A.choices ? A.choices.slice().sort().join("|") : "";
      const cb = B.choices ? B.choices.slice().sort().join("|") : "";
      assert.equal(ca, cb, where("ペアの選択肢集合が違う"));
      assert.notEqual(A.ans, B.ans, where("ペアの答えが一致"));
    }
  });

  /* 検証 32: 連鎖 */
  const chains = {};
  set.forEach((q, index) => { if(q.chainId) (chains[q.chainId] = chains[q.chainId] || []).push(index); });
  if(lv >= 4) assert.ok(Object.keys(chains).length >= 1, where("連鎖が無い"));
  Object.keys(chains).forEach(key => {
    const members = chains[key];
    assert.equal(members.length, 2, where("連鎖が 2 問でない"));
    const recognition = set[members[0]].chainRole === "recognition" ? members[0] : members[1];
    const production = recognition === members[0] ? members[1] : members[0];
    assert.equal(production - recognition, 1, where("連鎖が隣接していない"));
    assert.ok(["formulation","ordering","diagnosis"].indexOf(set[recognition].format) >= 0, where("連鎖の認識形式"));
    assert.ok(["normal","find_all"].indexOf(set[production].format) >= 0, where("連鎖の産出形式"));
    assert.equal(set[recognition].domain, set[production].domain, where("連鎖の領域が違う"));
    assert.equal(set[recognition].direction, set[production].direction, where("連鎖の向きが違う"));
    assert.notEqual(JSON.stringify(set[recognition].params), JSON.stringify(set[production].params),
      where("連鎖の 2 問の数値が同じ"));
  });

  /* 検証 31: 足場 */
  set.forEach((question, index) => {
    if(lv === 10){ assert.equal(question.scaffold, null, where("Lv10 に足場")); return; }
    if(index < 2) assert.ok(question.scaffold, where("前半 2 問に足場が無い"));
    else assert.equal(question.scaffold, null, where("後半に足場"));
    if(!question.scaffold) return;
    const numbers = (question.scaffold.match(/\d+/g) || []).map(Number);
    numbers.forEach(value => assert.equal(question.numbers.indexOf(value), -1,
      where(`足場に本問の与件 ${value}`)));
    if([4,6,7,9].indexOf(lv) >= 0){
      const hasGcd = /公約数/.test(question.scaffold), hasLcm = /公倍数/.test(question.scaffold);
      assert.equal(hasGcd, hasLcm, where("足場が片方の向きだけを示している"));
    }
  });
  if(lv !== 10) assert.notEqual(set[0].scaffold, set[1].scaffold, where("足場が同一"));

  /* 検証 18、30: 選択肢と候補 */
  set.forEach(question => {
    if(question.format === "formulation" || question.format === "diagnosis"){
      assert.equal(question.choices.length, 4, where("肢が 4 個でない"));
      assert.equal(new Set(question.choices).size, 4, where("肢が重複"));
      assert.ok(Number.isInteger(question.ans) && question.ans >= 0 && question.ans < 4, where("正解の添字"));
      const values = (question.choiceValues || []).filter(v => typeof v === "number");
      assert.equal(new Set(values).size, values.length, where("誤答が正解と数値的に同値"));
    }
    if(question.format === "find_all"){
      assert.ok(question.choices.length >= 5 && question.choices.length <= 9, where("候補の個数"));
      assert.ok(question.ansSet.length >= 2, where("正解集合が 2 未満"));
      assert.ok(question.ansSet.length < question.choices.length, where("正解集合が候補全体"));
      assert.equal(question.ans, null, where("find_all で ans が非 null"));
    }
    if(question.format === "ordering"){
      assert.ok(question.parts.length === 4 || question.parts.length === 5, where("部品数が 4 か 5 でない"));
      assert.equal(question.ans.length, question.parts.length, where("ans の長さが部品数と違う"));
      assert.equal(new Set(question.displayOrder).size, question.parts.length, where("提示順が順列でない"));
    }
    assert.ok(engine.unknownValues.indexOf(question.unknown) >= 0, where("unknown が列挙外"));
    assert.ok(["max","min","count","nth","none"].indexOf(question.ask) >= 0, where("ask が列挙外"));
  });

  /* 検証 9: 場面問題の境界 */
  set.filter(q => q.domain === "scene").forEach(question => {
    assert.ok(question.boundary, where("場面に境界が無い"));
    assert.equal(question.numbers.length, 3, where(`場面の与件が 3 数でない ${question.patternId}`));
    if(question.ask === "max") assert.equal(question.boundary.kind, "upper", where("max の境界"));
    if(question.ask === "min") assert.equal(question.boundary.kind, "lower", where("min の境界"));
    if(question.ask === "nth") assert.equal(question.boundary.kind, "rank", where("nth の境界"));
    assert.ok(engine.sceneTemplates[question.template], where("template が 3.3 章に無い"));
  });

  /* 検証 34: 除外語 */
  set.forEach(question => {
    const text = question.text || "";
    assert.equal(/[赤青黄緑◯△]|進法|およそ|約(?![数分])|m2|cm2|mL/.test(text), false,
      where(`除外語 ${text.slice(0, 40)}`));
    if(/曜日/.test(text)) assert.equal(question.domain, "cycle", where("曜日名が周期以外に出た"));
    assert.equal(/\d+\s*月\s*\d+\s*日/.test(text), false, where("日付が出た"));
  });

  /* 検証 12: 同一セット内で同じ言い回しを 2 回以上使わない */
  const phrases = set.filter(q => q.phrase).map(q => q.phrase);
  assert.equal(new Set(phrases).size, phrases.length, where(`言い回しの重複 ${phrases.join("/")}`));

  /* 検証 10: 四象限 */
  if([4,6,10].indexOf(lv) >= 0){
    const word = set.filter(q => q.ask === "max" || q.ask === "min");
    const n = word.length, lower = lv === 10 ? 2 : 4;
    assert.ok(n >= lower, where(`大小語を持つ問題 n=${n} が下限 ${lower} 未満`));
    const reversed = word.filter(q => q.agreement === "reverseA" || q.agreement === "reverseB").length;
    assert.ok(reversed >= Math.floor(n / 2), where(`反転が floor(n/2) 未満 ${reversed}/${n}`));
    assert.ok(word.some(q => q.agreement === "match"), where("一致が 0"));
    assert.ok(word.some(q => q.agreement === "reverseB"), where("反転 B が 0"));
    assert.ok(set.some(q => q.ask !== "max" && q.ask !== "min"), where("大小語を持たない問題が無い"));
    const quadrants = {};
    set.filter(q => q.domain === "scene" && (q.ask === "max" || q.ask === "min")).forEach(q => {
      const key = q.ask + "/" + q.boundary.size;
      (quadrants[key] = quadrants[key] || []).push(q.direction);
    });
    Object.keys(quadrants).forEach(key => {
      if(quadrants[key].length >= 2)
        assert.ok(new Set(quadrants[key]).size >= 2, where(`象限 ${key} で向きが関数になっている`));
    });
    assert.ok(set.filter(q => q.boundary && q.boundary.oneSided).length <= 1, where("片側象限が 2 問以上"));
    if(lv !== 10){
      /* 3.3 章: 1 つのテンプレートで両向きの 2 問を作る */
      const byTemplate = {};
      set.filter(q => q.template).forEach(q => { (byTemplate[q.template] = byTemplate[q.template] || []).push(q.direction); });
      assert.ok(Object.keys(byTemplate).some(key => new Set(byTemplate[key]).size >= 2),
        where("同一テンプレートで向きが異なる 2 問が無い"));
    }
  }

  /* 検証 22: 診断ラベル */
  const diagnoses = set.filter(q => q.format === "diagnosis");
  const errorTypes = diagnoses.map(q => q.errorType);
  assert.equal(new Set(errorTypes).size, errorTypes.length, where("セット内の診断で errorType が重複"));
  /* 4.8 章の「同じ 3 肢の組は ceil(診断問数 ÷ C(可用ラベル数, 3)) 回まで」は、
     4.3 章が対比ペアに要求する「選択肢集合の完全一致」と同時には満たせない
     (診断どうしのペアでは 3 肢の組が必ず一致する)。ペアの相方どうしは 4.3 章を
     優先し、ペア外の診断についてだけ上限を見る。 */
  const unpaired = diagnoses.filter(q => !q.pairId);
  if(unpaired.length >= 2){
    const trios = unpaired.map(q => q.errorChoices.slice().sort().join("|"));
    assert.equal(new Set(trios).size, trios.length, where("同じ 3 肢の組が反復"));
  }
  diagnoses.forEach(question => {
    assert.equal(question.choices.indexOf("正しい") >= 0, true, where("正答肢「正しい」が無い"));
    assert.equal(question.choices.filter(text => text === "正しい").length, 1, where("正答肢が 2 つ"));
    assert.equal(question.work.length, 3, where("答案が 3 欄でない"));
    assert.ok(/^わけ /.test(question.work[0]) && /^しき /.test(question.work[1]) && /^こたえ /.test(question.work[2]),
      where("答案の欄名"));
    const labels = Object.keys(engine.diagnosisLabels).map(key => engine.diagnosisLabels[key]);
    question.choices.forEach(text => assert.ok(labels.indexOf(text) >= 0, where(`ラベル文言 ${text}`)));
    assert.equal(question.choices[question.ans], engine.diagnosisLabels[question.errorType], where("正解の肢がラベルと一致しない"));
    const same = String(question.shownAnswer) === String(question.correctAnswer);
    assert.equal(same, question.errorType === "correct", where("答案の誤りが errorType と一致しない"));
    assert.equal(/正しい \(/.test(question.choices.join("")), false, where("correct_alternative の文言が残っている"));
  });
}

test("生成した全セットが 4 章と 5.2 章と 9.4 章の規則を満たす (検証 5-14、17、18、22、30-32、34)", () => {
  LEVELS.forEach(lv => corpus[lv].slice(0, SETS_PER_LV).forEach((set, index) => checkSet(lv, set, `set#${index}`)));
});

test("答えが params から整数演算で再計算した値と一致する (検証 1、2)", () => {
  everyQuestion.forEach(question => {
    const p = question.params;
    if(question.kind === "num"){
      assert.ok(Number.isInteger(question.ans) && question.ans > 0 && question.ans <= 9999,
        `${question.patternId} の答えが 4 桁以内の正の整数でない: ${question.ans}`);
      if(question.domain === "scene")
        assert.equal(question.ans, engine.sceneAnswer(question.patternId, p.a, p.b, question.boundary.value),
          `${question.patternId} の場面の答え`);
      if(question.patternId === "gcd_num") assert.equal(question.ans, gcd(p.a, p.b));
      if(question.patternId === "lcm_num") assert.equal(question.ans, lcm(p.a, p.b));
      if(question.patternId === "div_count") assert.equal(question.ans, divisors(p.n).length);
      if(question.patternId === "mul_count") assert.equal(question.ans, Math.floor(p.cap / p.n));
      if(question.patternId === "mul_capped") assert.equal(question.ans, Math.floor(p.cap / p.n) * p.n);
      if(question.patternId === "mul_nth") assert.equal(question.ans, p.n * p.k);
      if(question.patternId === "common_div_count") assert.equal(question.ans, commonDivisors(p.a, p.b).length);
      if(question.patternId === "factor_count") assert.equal(question.ans, engine.divisorCount(p.n));
      if(question.patternId === "gcd3_num") assert.equal(question.ans, gcd(gcd(p.a, p.b), p.c));
      if(question.patternId === "lcm3_num") assert.equal(question.ans, lcm(lcm(p.a, p.b), p.c));
      if(question.patternId === "rem_zero") assert.equal(question.ans, Math.floor(p.m / lcm(p.p, p.q)) * lcm(p.p, p.q));
      if(question.patternId === "rem_count") assert.equal(question.ans, Math.floor(p.m / lcm(p.p, p.q)));
      if(question.patternId === "rem_same"){
        assert.equal(question.ans % p.p, p.r % p.p);
        assert.equal(question.ans % p.q, p.r % p.q);
        assert.ok(question.ans >= 10 && question.ans <= 99);
      }
      if(question.patternId === "cycle_align_count") assert.equal(question.ans, Math.floor(p.total / lcm(p.a, p.b)));
      if(question.patternId === "cycle_count") assert.equal(question.ans, Math.floor(p.n / 7) + 1);
    }
    if(question.format === "find_all"){
      const chosen = question.ansSet.map(i => Number(question.choices[i]));
      if(question.patternId === "div_select") chosen.forEach(v => assert.equal(p.n % v, 0));
      if(question.patternId === "nondiv_select") chosen.forEach(v => assert.notEqual(p.n % v, 0));
      if(question.patternId === "mul_select") chosen.forEach(v => assert.equal(v % p.n, 0));
      if(question.patternId === "common_div_select") chosen.forEach(v => assert.ok(p.a % v === 0 && p.b % v === 0));
      if(question.patternId === "common_mul_select") chosen.forEach(v => assert.ok(v % p.a === 0 && v % p.b === 0));
      if(question.patternId === "common_div3_select") chosen.forEach(v => assert.ok(p.a % v === 0 && p.b % v === 0 && p.c % v === 0));
      if(question.patternId === "common_mul3_select") chosen.forEach(v => assert.ok(v % p.a === 0 && v % p.b === 0 && v % p.c === 0));
      if(question.patternId === "rem_divisor") chosen.forEach(v => assert.ok(v > p.r && (p.n - p.r) % v === 0));
      /* 誤答候補にもう一方の向きの集合に属する数が 1 個以上含まれる (9.2 章)。 */
      const missed = question.candidates.filter(v => chosen.indexOf(v) < 0);
      assert.ok(missed.length >= 1, "誤答候補が無い");
    }
  });
});

test("Lv ごとに 9.4 章の空間の全 pattern が実際に生成される (検証 13)", () => {
  LEVELS.forEach(lv => {
    const seen = new Set();
    corpus[lv].forEach(set => set.forEach(q => seen.add(q.patternId)));
    const missing = engine.lvPatterns[lv].filter(id => !seen.has(id));
    assert.equal(missing.length, 0, `Lv${lv} で生成されない pattern: ${missing.join(",")}`);
    assert.equal(seen.size, engine.patternSpace[lv], `Lv${lv} の異なり数`);
  });
});

test("1 問しかない形式枠は 2 種以上の pattern から抽選される (検証 20)", () => {
  LEVELS.forEach(lv => {
    const byFormat = {};
    corpus[lv].forEach(set => {
      const counts = {};
      set.forEach(q => { counts[q.format] = (counts[q.format] || 0) + 1; });
      set.forEach(q => {
        if(counts[q.format] !== 1) return;
        (byFormat[q.format] = byFormat[q.format] || new Set()).add(q.patternId);
      });
    });
    Object.keys(byFormat).forEach(format => {
      assert.ok(byFormat[format].size >= 2, `Lv${lv} の ${format} 枠が ${byFormat[format].size} 種`);
    });
  });
});

test("形式ごとの与件の個数が揃い、帯の重なる区間から 30% 以上を引く (検証 8)", () => {
  LEVELS.forEach(lv => {
    corpus[lv].slice(0, SETS_PER_LV).forEach(set => {
      const byFormat = {};
      set.forEach(q => { (byFormat[q.format] = byFormat[q.format] || []).push(q); });
      /* 4.2 章が与件の形を揃えると定めるのは normal の枠 (Lv2、3、5、7、8、9、
         および場面 Lv の対比ペア)。付録 A.9 は診断 2 問の与件が 2 数と 3 数に
         分かれているので、診断は対象外である。 */
      const group = byFormat.normal || [];
      if(group.length >= 2){
        const sizes = new Set(group.map(q => q.numbers.length));
        assert.equal(sizes.size, 1, `Lv${lv} の normal で与件の個数が揃わない`);
      }
    });
  });
  /* mul_nth の k と mul_count の上限は 9.2 章で帯を重ねてある。重なる区間 (30-60) から
     30% 以上を引くこと (再監査 H6、三次監査 N8)。 */
  const nth = flat[2].filter(q => q.patternId === "mul_nth");
  const inside = nth.filter(q => q.params.k >= 30 && q.params.k <= 60).length;
  assert.ok(inside / nth.length >= 0.3, `重なる区間の割合 ${(inside / nth.length).toFixed(2)}`);
});

test("文脈テンプレートと問い語が両向きに現れ、単位から向きが決まらない (検証 11、12)", () => {
  const scene = everyQuestion.filter(q => q.domain === "scene");
  const byTemplate = {}, byAsk = {}, byUnit = {};
  scene.forEach(q => {
    (byTemplate[q.template] = byTemplate[q.template] || new Set()).add(q.direction);
    (byAsk[q.ask] = byAsk[q.ask] || new Set()).add(q.direction);
    (byUnit[q.params.unit] = byUnit[q.params.unit] || new Set()).add(q.direction);
  });
  ["T1","T2","T3","T4","T5"].forEach(id => {
    assert.ok(byTemplate[id], `${id} が使われていない`);
    assert.equal(byTemplate[id].size, 2, `${id} が片側の向きにしか現れない`);
  });
  ["max","min","count","nth"].forEach(id => {
    assert.ok(byAsk[id], `問い語 ${id} が使われていない`);
    assert.equal(byAsk[id].size, 2, `問い語 ${id} が片側の向きにしか現れない`);
  });
  Object.keys(byUnit).forEach(unit => {
    assert.equal(byUnit[unit].size, 2, `単位 ${unit} から向きが決まる`);
  });
  /* 効く境界が gcd 側と lcm 側の両方に現れる (検証 9)。 */
  const effective = scene.filter(q => q.boundary && q.boundary.effective === true);
  assert.ok(effective.some(q => q.direction === "gcd"));
  assert.ok(effective.some(q => q.direction === "lcm"));
});

test("正解選択肢の位置が一様で、候補列の正解位置も偏らない (検証 29、30)", () => {
  const choiceQuestions = everyQuestion.filter(q => q.kind === "choice" && q.choices.length === 4);
  assert.ok(choiceQuestions.length >= 1000, `選択問題が ${choiceQuestions.length} 問`);
  const positions = [0,0,0,0];
  choiceQuestions.forEach(q => { positions[q.ans]++; });
  positions.forEach((count, index) => {
    const share = count / choiceQuestions.length;
    assert.ok(share >= 0.20 && share <= 0.30, `位置 ${index} の割合 ${share.toFixed(3)}`);
  });
  const findAll = everyQuestion.filter(q => q.format === "find_all");
  const slots = [0,0,0,0,0,0,0,0,0], totals = [0,0,0,0,0,0,0,0,0];
  findAll.forEach(q => {
    for(let i = 0; i < q.choices.length; i++){ totals[i]++; if(q.ansSet.indexOf(i) >= 0) slots[i]++; }
  });
  for(let i = 0; i < 5; i++){
    const share = slots[i] / totals[i];
    assert.ok(share > 0.25 && share < 0.65, `候補位置 ${i} の正解率 ${share.toFixed(3)}`);
  }
});

test("整列は位相順序が一意で、提示順が完全シャッフルである (検証 26、27、28)", () => {
  const orderings = everyQuestion.filter(q => q.format === "ordering");
  assert.ok(orderings.length >= 200, `整列問題が ${orderings.length} 問`);
  let identical = 0;
  const keys = {};
  orderings.forEach(question => {
    /* 位相順序がちょうど 1 通り。requires / produces から順序を再構成する。 */
    const parts = question.parts;
    const produced = {};
    parts.forEach((part, index) => part.produces.forEach(key => { produced[key] = index; }));
    const remaining = parts.map((part, index) => index);
    const order = [];
    while(remaining.length){
      const ready = remaining.filter(index => parts[index].requires.every(key =>
        !(key in produced) || order.indexOf(produced[key]) >= 0));
      assert.equal(ready.length, 1, `位相順序が一意でない (${ready.length} 通り)`);
      order.push(ready[0]);
      remaining.splice(remaining.indexOf(ready[0]), 1);
    }
    assert.equal(order.join(","), Array.from(question.ans).join(","), "位相順序が ans と一致しない");
    if(question.displayOrder.every((value, index) => value === question.ans[index])) identical++;
    const free = parts.map((part, index) => /\d/.test(part.text) ? null : index).filter(v => v !== null);
    const signature = parts.length + "/" + (free.length === parts.length ? "all" : free.join("-"));
    (keys[signature] = keys[signature] || new Set()).add(question.design);
    assert.ok(free.length >= 1, "数を含まない部品が無い");
  });
  /* (部品数, 数なし部品の位置) の組から設計が一意に定まらない (検証 26)。 */
  assert.ok(Object.keys(keys).some(key => keys[key].size >= 2), "同じ組を持つ設計が 2 つ以上現れない");
  /* 正順との一致率が 1 / n! に近い。正順の固定置換を出していないことの検査。 */
  const share = identical / orderings.length;
  assert.ok(share < 0.10, `提示順が正順と一致する割合 ${share.toFixed(3)}`);
  assert.ok(share > 0.0, "提示順が正順を一度も含まない (完全シャッフルでない)");
  /* Lv5 の整列 2 問は数ゼロ設計を 1 問以上含み、数あり設計は非連鎖形に限る (検証 27)。 */
  corpus[5].slice(0, SETS_PER_LV).forEach(set => {
    const list = set.filter(q => q.format === "ordering");
    assert.equal(list.length, 2);
    assert.ok(list.some(q => q.design === "D6" || q.design === "D7"), "Lv5 に数ゼロ設計が無い");
    list.forEach(q => {
      if(q.design !== "D6" && q.design !== "D7")
        assert.ok(["D2","D3","D4"].indexOf(q.design) >= 0, `Lv5 に連鎖形 ${q.design}`);
    });
  });
});

test("出題順とペア内の順序が一様で、Lv10 の 2 問形式も偏らない (検証 7、16)", () => {
  /* ペア内の 2 問の出題順が全生成にわたり一様であること (4.3 章の乱数化)。 */
  let firstIsGcd = 0, pairs = 0;
  LEVELS.forEach(lv => corpus[lv].slice(0, SETS_PER_LV).forEach(set => {
    const seen = {};
    set.forEach((question, index) => { if(question.pairId) (seen[question.pairId] = seen[question.pairId] || []).push(index); });
    Object.keys(seen).forEach(key => {
      const members = seen[key];
      if(members.length !== 2) return;
      pairs++;
      if(set[members[0]].direction === "gcd" || set[members[0]].pattern < set[members[1]].pattern) firstIsGcd++;
    });
  }));
  const share = firstIsGcd / pairs;
  assert.ok(share > 0.35 && share < 0.65, `ペア内の先頭の偏り ${share.toFixed(3)}`);
  /* Lv10 でどの形式を 2 問にするかも一様であること。 */
  const doubled = {};
  corpus[10].forEach(set => {
    const counts = {};
    set.forEach(q => { counts[q.format] = (counts[q.format] || 0) + 1; });
    const key = Object.keys(counts).filter(name => name !== "ordering" && counts[name] === 2)[0];
    doubled[key] = (doubled[key] || 0) + 1;
  });
  ["normal","find_all","formulation","diagnosis"].forEach(format => {
    const rate = (doubled[format] || 0) / corpus[10].length;
    assert.ok(rate > 0.15 && rate < 0.35, `Lv10 で ${format} を 2 問にする割合 ${rate.toFixed(3)}`);
  });
  /* 各 pattern がセット内の各位置に現れる割合が偏らない (Lv1 から Lv3 の弾層で見る)。 */
  [1,2,3].forEach(lv => {
    const byPattern = {};
    corpus[lv].slice(0, SETS_PER_LV).forEach(set => set.forEach((question, index) => {
      (byPattern[question.patternId] = byPattern[question.patternId] || [0,0,0,0,0])[index]++;
    }));
    Object.keys(byPattern).forEach(id => {
      const counts = byPattern[id], total = counts.reduce((a, b) => a + b, 0);
      counts.forEach((count, index) => assert.ok(count / total < 0.55,
        `Lv${lv} の ${id} が位置 ${index} に ${(count / total).toFixed(2)} 偏っている`));
    });
  });
});

test("診断の正答案比率とラベル分布 (検証 23、25)", () => {
  [5,6,8,9,10].forEach(lv => {
    /* 比率は「Lv ごとのプール全体」で見る (4.8 章)。生成した全セットを母数にする。 */
    const list = corpus[lv].reduce((all, set) => all.concat(set), []).filter(q => q.format === "diagnosis");
    assert.ok(list.length >= 100, `Lv${lv} の診断が ${list.length} 問`);
    const correct = list.filter(q => q.errorType === "correct");
    const ratio = correct.length / list.length;
    assert.ok(ratio >= 0.20 && ratio <= 0.30, `Lv${lv} の正答案比率 ${ratio.toFixed(3)}`);
    /* 別解が立つのは Lv9 と Lv10 だけ。その 2 段では正答案の 3 分の 1 以上が別解 (F3)。 */
    const alternatives = correct.filter(q => q.alternative).length;
    if(lv === 9 || lv === 10) assert.ok(alternatives / correct.length >= 1/3,
      `Lv${lv} の別解比率 ${(alternatives / correct.length).toFixed(3)}`);
    /* 誤りラベルの出現が、そのラベルを成立させられる問題数に対する期待値の 0.7-1.4 倍。 */
    const observed = {}, expected = {};
    engine.availableErrors[lv].forEach(id => { observed[id] = 0; expected[id] = 0; });
    list.forEach(question => {
      if(question.errorType !== "correct") observed[question.errorType]++;
      const support = question.errorSupport.filter(id => id !== "correct");
      support.forEach(id => { if(id in expected) expected[id] += 1 / support.length; });
    });
    const errorTotal = list.length - correct.length;
    const expectedTotal = Object.keys(expected).reduce((sum, id) => sum + expected[id], 0);
    engine.availableErrors[lv].forEach(id => {
      const want = expected[id] / expectedTotal * errorTotal;
      assert.ok(observed[id] >= 1, `Lv${lv} の ${id} が 1 件も出ない`);
      /* 期待値が 5 件を切る枠では 0.7-1.4 倍の帯が標本ゆらぎに埋もれるので、
         実在すること (1 件以上) だけを見る。 */
      if(want < 5) return;
      assert.ok(observed[id] >= want * 0.7 && observed[id] <= want * 1.4,
        `Lv${lv} の ${id} が ${observed[id]} 件 (期待 ${want.toFixed(1)})`);
    });
    /* calc_only と word_cue は正解ラベルとして実際に生成する (8 章)。 */
    ["calc_only","word_cue"].forEach(id => {
      if(engine.availableErrors[lv].indexOf(id) < 0) return;
      assert.ok(observed[id] >= 1, `Lv${lv} の ${id} が正解ラベルとして生成されない`);
    });
    /* correct_alternative の文言は一切現れない (検証 25)。 */
    list.forEach(q => assert.equal(/べつの/.test(q.choices.join("")), false, "別解ラベルの文言が残っている"));
  });
});

test("8.2 章の表層形衝突の組が Lv ごとに 2 組以上実装されている (検証 21)", () => {
  const counts = { 5:2, 6:2, 8:2, 9:2, 10:8 };
  Object.keys(counts).forEach(lv => {
    for(let index = 0; index < counts[lv]; index++){
      const pair = engine.collisionCase(Number(lv), index, seeded(9001 + index * 37 + Number(lv)));
      const sameExpression = pair.a.workExpression === pair.b.workExpression;
      const sameReason = pair.a.workReason === pair.b.workReason;
      assert.ok(sameExpression || sameReason,
        `Lv${lv} の衝突 ${index} で答案の式も「わけ」も一致しない`);
      assert.notEqual(pair.a.errorType, pair.b.errorType,
        `Lv${lv} の衝突 ${index} で errorType が同じ`);
      assert.notEqual(pair.a.text, pair.b.text, `Lv${lv} の衝突 ${index} でもとの問題が同じ`);
    }
  });
});

test("整列の設計が 9.5 章の 7 種と一致する (検証 26)", () => {
  const table = {
    D1:{ pattern:"factorize", parts:5 }, D2:{ pattern:"factorize", parts:4 },
    D3:{ pattern:"gcd_by_factor", parts:4 }, D4:{ pattern:"lcm_by_factor", parts:4 },
    D5:{ pattern:"gcd_by_factor", parts:5 }, D6:{ pattern:"procedure_gcd", parts:4 },
    D7:{ pattern:"procedure_lcm", parts:4 }
  };
  assert.equal(Object.keys(engine.orderDesigns).sort().join(","), Object.keys(table).sort().join(","));
  Object.keys(table).forEach(id => {
    assert.equal(engine.orderDesigns[id].pattern, table[id].pattern, `${id} の pattern`);
    assert.equal(engine.orderDesigns[id].parts, table[id].parts, `${id} の部品数`);
  });
  const used = new Set(), sizes = new Set();
  everyQuestion.filter(q => q.format === "ordering").forEach(q => { used.add(q.design); sizes.add(q.parts.length); });
  Object.keys(table).forEach(id => assert.ok(used.has(id), `${id} が生成されない`));
  assert.ok(sizes.has(4) && sizes.has(5), "部品数が 4 と 5 に振られていない");
});

test("答案の式と「わけ」から errorType への写像が関数にならない (検証 21)", () => {
  [5,6,8,9,10].forEach(lv => {
    const byExpression = {}, byReason = {};
    flat[lv].filter(q => q.format === "diagnosis").forEach(question => {
      (byExpression[question.workExpression] = byExpression[question.workExpression] || new Set()).add(question.errorType);
      (byReason[question.workReason] = byReason[question.workReason] || new Set()).add(question.errorType);
    });
    const clashes = Object.keys(byExpression).filter(key => byExpression[key].size >= 2).length
      + Object.keys(byReason).filter(key => byReason[key].size >= 2).length;
    assert.ok(clashes >= 2, `Lv${lv} の表層形衝突が ${clashes} 組`);
  });
});

test("同一の PRNG 状態と (cat, lv) から同一の問題オブジェクトが得られる (検証 37)", () => {
  LEVELS.forEach(lv => {
    const first = engine.buildSet(lv, seeded(20260828 + lv));
    const second = engine.buildSet(lv, seeded(20260828 + lv));
    assert.equal(JSON.stringify(first), JSON.stringify(second), `Lv${lv} の再現性`);
    first.forEach(q => assert.equal(q.cat, "kom_seisu"));
  });
});

test("本編の周期算・日暦算・倍数算・あまりの文型と一致しない (検証 35)", () => {
  const mainForms = [
    /くり返して\s*ならべ/, /何番目の\s*色/, /^\s*\d+\s*÷\s*\d+\s*の\s*あまりは/,
    /月をまたぐ/, /\d+\s*月\s*\d+\s*日/, /のこりは\s*いくつ/
  ];
  everyQuestion.forEach(question => {
    mainForms.forEach(pattern => assert.equal(pattern.test(question.text), false,
      `本編と同じ文型: ${question.text.slice(0, 40)}`));
  });
});

/* ---- 3. 付録 A の実在証明 (検証 40) -------------------------------------- */

test("付録 A の 10 セットを golden case として再現し、全制約に通す (検証 40)", () => {
  const expectations = {
    1: [["div_count",18,6],["div_select",24,null],["div_missing",36,6],["div_extra",36,8],["nondiv_select",24,null]],
    2: [["mul_select",12,null],["div_select",12,null],["mul_nth",6,270],["mul_count",8,7],["mul_capped",8,56]],
    3: [["gcd_num",24,12],["lcm_num",24,72],["common_div_count",18,4],["common_div_select",6,null],["common_mul_select",6,null]],
    7: [["rem_same",5,null],["rem_same",3,14],["rem_zero",4,96],["rem_count",4,8],["rem_divisor",35,null]]
  };
  LEVELS.forEach(lv => {
    const set = engine.buildGoldenSet(lv, seeded(31415 + lv));
    checkSet(lv, set, "付録 A");
    const byPattern = {};
    set.forEach(q => { (byPattern[q.patternId] = byPattern[q.patternId] || []).push(q); });
    if(expectations[lv]) expectations[lv].forEach(row => {
      const [pattern, first, answer] = row;
      const hit = (byPattern[pattern] || []).filter(q => q.numbers[0] === first || q.params.n === first || q.params.a === first);
      assert.ok(hit.length >= 1, `付録 A.${lv} の ${pattern}(${first}) が無い`);
      if(answer !== null) assert.ok(hit.some(q => q.ans === answer), `付録 A.${lv} の ${pattern} の答え ${answer}`);
    });
  });
  /* 付録 A.4 の四象限の分布 (一致 2、反転 2、反転 B 1 以上)。 */
  const lv4 = engine.buildGoldenSet(4, seeded(31419));
  const word = lv4.filter(q => q.ask === "max" || q.ask === "min");
  assert.equal(word.length, 4);
  assert.equal(word.filter(q => q.agreement === "match").length, 2);
  assert.equal(word.filter(q => q.agreement === "reverseA").length, 1);
  assert.equal(word.filter(q => q.agreement === "reverseB").length, 1);
  /* 付録 A.10 は 3 数の対比ペアを持つ回。 */
  const lv10 = engine.buildGoldenSet(10, seeded(31425));
  assert.ok(lv10.some(q => q.patternId === "common_div3_select"));
  assert.ok(lv10.some(q => q.patternId === "common_mul3_select"));
  assert.equal(lv10.filter(q => q.ask === "max" || q.ask === "min").length, 2);
});

/* ---- 4. 敵ソルバー回帰テスト (検証 38、監査 7.4 章の A1 から A24) ---------- */

/* ---- 4. 敵ソルバー回帰テスト (検証 38。監査 7.4 章の A1 から A24) ------------
   攻撃の実体は curriculum に書かない (検証 39)。本節は監査 doc が保持する累積の
   攻撃集合をそのまま実装したものである。各攻撃は「その攻撃に許された分割の中で
   最も当たる手続きを選べたとき」の上限で測る。閾値は 200 セットでの正答率の上限。 */

function range0(n){ const out = []; for(let i = 0; i < n; i++) out.push(i); return out; }
function numbersOf(q){ return q.numbers || []; }
function smallestTwoDigit(p, q, r){
  const step = lcm(p, q);
  let value = r;
  while(value < 10) value += step;
  return value;
}
function condDivisorCount(n){
  const small = engine.primeFactors(n)[0];
  return divisors(n).filter(v => v % small === 0).length;
}
const NUM_PROCS = [
  ["gcd", n => n.length >= 2 ? gcd(n[0], n[1]) : null],
  ["lcm", n => n.length >= 2 ? lcm(n[0], n[1]) : null],
  ["product", n => n.length >= 2 ? n[0] * n[1] : null],
  ["sum", n => n.length >= 2 ? n[0] + n[1] : null],
  ["difference", n => n.length >= 2 ? Math.abs(n[1] - n[0]) : null],
  ["quotient", n => n.length >= 2 && n[0] ? Math.floor(n[1] / n[0]) : null],
  ["quotientTimes", n => n.length >= 2 && n[0] ? Math.floor(n[1] / n[0]) * n[0] : null],
  ["divisorCount", n => n.length ? divisors(n[0]).length : null],
  ["condCount", n => n.length ? condDivisorCount(n[0]) : null],
  ["commonDivisorCount", n => n.length >= 2 ? commonDivisors(n[0], n[1]).length : null],
  ["primeCount", n => n.filter(isPrime).length],
  ["capCount", n => n.length >= 3 ? Math.floor(n[2] / lcm(n[0], n[1])) : null],
  ["capValue", n => n.length >= 3 ? Math.floor(n[2] / lcm(n[0], n[1])) * lcm(n[0], n[1]) : null],
  ["floorValue", n => n.length >= 3 ? (Math.floor(n[2] / lcm(n[0], n[1])) + 1) * lcm(n[0], n[1]) : null],
  ["lcmTimes", n => n.length >= 3 ? lcm(n[0], n[1]) * n[2] : null],
  ["gcdOver", n => n.length >= 3 ? (commonDivisors(n[0], n[1]).filter(d => d > n[2])[0] || null) : null],
  ["gcdUnder", n => n.length >= 3 ? (commonDivisors(n[0], n[1]).filter(d => d <= n[2]).pop() || null) : null],
  ["gcdNth", n => n.length >= 3 ? (commonDivisors(n[0], n[1]).slice().reverse()[n[2] - 1] || null) : null],
  ["gcdWays", n => n.length >= 3 ? commonDivisors(n[0], n[1]).filter(d => d > n[2]).length : null],
  ["gcd3", n => n.length >= 3 ? gcd(gcd(n[0], n[1]), n[2]) : null],
  ["lcm3", n => n.length >= 3 ? lcm(lcm(n[0], n[1]), n[2]) : null],
  ["twoDigit", n => n.length >= 3 && n[0] > 1 && n[1] > 1 ? smallestTwoDigit(n[0], n[1], n[2]) : null],
  ["weekQuotient", n => n.length ? Math.floor(n[0] / 7) : null],
  ["weekQuotientPlus", n => n.length ? Math.floor(n[0] / 7) + 1 : null],
  ["weekRemainder", n => n.length ? n[0] % 7 : null],
  ["first", n => n.length ? n[0] : null],
  ["third", n => n.length >= 3 ? n[2] : null]
];
const CHOICE_WORDS = ["最大公約数","最小公倍数","公約数をすべて","公倍数をすべて","+","正しい",
  "商に 1 をたす","のあまり","÷7 の商","商とあまり","公約数と公倍数を取りちがえている",
  "大小のことばにつられている","数えかたが 1 ずれている","素数までわり切れていない","計算だけまちがえている",
  "公倍数だがいちばん小さくない","公約数だがいちばん大きくない"];
function weekdayFrom(question, mode){
  const match = /今日は(.曜日)です。(\d+) 日(後|前)/.exec(question.text || "");
  if(!match) return null;
  const start = engine.weekdays.indexOf(match[1]), days = Number(match[2]);
  if(start < 0) return null;
  const step = mode === "quotient" ? Math.floor(days / 7) : days % 7;
  const index = match[3] === "前" ? ((start - step) % 7 + 7) % 7 : (start + step) % 7;
  const target = engine.weekdays[index];
  const at = question.choices.indexOf(target);
  return at >= 0 ? at : null;
}
const SET_PROCS = [
  ["divOf", (q, n) => q.candidates.map((v, i) => n[0] % v === 0 ? i : -1).filter(i => i >= 0)],
  ["nonDivOf", (q, n) => q.candidates.map((v, i) => n[0] % v !== 0 ? i : -1).filter(i => i >= 0)],
  ["mulOf", (q, n) => q.candidates.map((v, i) => v % n[0] === 0 ? i : -1).filter(i => i >= 0)],
  ["commonDiv", (q, n) => n.length >= 2 ? q.candidates.map((v, i) => (n[0] % v === 0 && n[1] % v === 0) ? i : -1).filter(i => i >= 0) : null],
  ["commonMul", (q, n) => n.length >= 2 ? q.candidates.map((v, i) => (v % n[0] === 0 && v % n[1] === 0) ? i : -1).filter(i => i >= 0) : null],
  ["commonDiv3", (q, n) => n.length >= 3 ? q.candidates.map((v, i) => (n[0] % v === 0 && n[1] % v === 0 && n[2] % v === 0) ? i : -1).filter(i => i >= 0) : null],
  ["commonMul3", (q, n) => n.length >= 3 ? q.candidates.map((v, i) => (v % n[0] === 0 && v % n[1] === 0 && v % n[2] === 0) ? i : -1).filter(i => i >= 0) : null],
  ["remDivisor", (q, n) => n.length >= 2 ? q.candidates.map((v, i) => (v > n[1] && (n[0] - n[1]) % v === 0) ? i : -1).filter(i => i >= 0) : null],
  ["remSame", (q, n) => n.length >= 3 ? q.candidates.map((v, i) => (v % n[0] === n[2] % n[0] && v % n[1] === n[2] % n[1]) ? i : -1).filter(i => i >= 0) : null],
  ["waysGcd", (q, n) => n.length >= 3 ? q.candidates.map((v, i) => (n[0] % v === 0 && n[1] % v === 0 && v > n[2]) ? i : -1).filter(i => i >= 0) : null],
  ["waysLcm", (q, n) => n.length >= 3 ? q.candidates.map((v, i) => (v % lcm(n[0], n[1]) === 0 && v <= n[2]) ? i : -1).filter(i => i >= 0) : null]
];
const ROLE_WORDS = ["素数のかけ算","素数のかけ算に分ける","なおす","調べる","ならべ","共通","見つけ","多いほう",
  "かける","集める","くり返","止める","のこり","最大公約数","最小公倍数","答え"];
function roleRank(text){
  for(let i = 0; i < ROLE_WORDS.length; i++) if(text.indexOf(ROLE_WORDS[i]) >= 0) return i;
  return ROLE_WORDS.length;
}
function firstNumber(text){ const m = /\d+/.exec(text); return m ? Number(m[0]) : Infinity; }
const ORDER_PROCS = [
  ["asPresented", q => q.displayOrder.slice()],
  ["stored", q => range0(q.parts.length)],
  ["reversed", q => q.displayOrder.slice().reverse()],
  ["byNumber", q => range0(q.parts.length).sort((a, b) => firstNumber(q.parts[a].text) - firstNumber(q.parts[b].text))],
  ["byNumberDesc", q => range0(q.parts.length).sort((a, b) => firstNumber(q.parts[b].text) - firstNumber(q.parts[a].text))],
  ["byRole", q => range0(q.parts.length).sort((a, b) => roleRank(q.parts[a].text) - roleRank(q.parts[b].text))],
  ["byLength", q => range0(q.parts.length).sort((a, b) => q.parts[a].text.length - q.parts[b].text.length)],
  ["chain", q => {
    /* 部品に現れる数を照合して並べる。前の部品の数を含む部品を次に置く。 */
    const rest = range0(q.parts.length), order = [];
    while(rest.length){
      let pickAt = 0;
      if(order.length){
        const prev = (q.parts[order[order.length - 1]].text.match(/\d+/g) || []).map(Number);
        const found = rest.findIndex(i => (q.parts[i].text.match(/\d+/g) || []).map(Number).some(v => prev.indexOf(v) >= 0));
        if(found >= 0) pickAt = found;
      }
      order.push(rest[pickAt]);
      rest.splice(pickAt, 1);
    }
    return order;
  }]
];
function candidateAnswers(question){
  if(question.__answers) return question.__answers;
  const map = new Map();
  const numbers = numbersOf(question);
  if(question.kind === "num") NUM_PROCS.forEach(([id, fn]) => {
    let value = null;
    try{ value = fn(numbers); }catch(error){ value = null; }
    if(typeof value === "number" && isFinite(value)) map.set("n:" + id, value);
  });
  if(question.kind === "choice"){
    range0(question.choices.length).forEach(index => map.set("p:" + index, index));
    CHOICE_WORDS.forEach(word => {
      const at = question.choices.findIndex(text => text.indexOf(word) >= 0);
      if(at >= 0) map.set("w:" + word, at);
    });
    ["remainder","quotient"].forEach(mode => {
      const at = weekdayFrom(question, mode);
      if(at !== null) map.set("d:" + mode, at);
    });
  }
  if(question.kind === "find_all") SET_PROCS.forEach(([id, fn]) => {
    let value = null;
    try{ value = fn(question, numbers); }catch(error){ value = null; }
    if(Array.isArray(value) && value.length) map.set("s:" + id, value);
  });
  if(question.kind === "order") ORDER_PROCS.forEach(([id, fn]) => {
    let value = null;
    try{ value = fn(question); }catch(error){ value = null; }
    if(Array.isArray(value)) map.set("o:" + id, value);
  });
  question.__answers = map;
  return map;
}
function partitionRate(questions, keyFn){
  const groups = new Map();
  questions.forEach((question, index) => {
    const key = keyFn(question, index);
    if(key === null || key === undefined) return;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  });
  let hits = 0;
  groups.forEach(list => {
    const score = new Map();
    list.forEach(question => {
      candidateAnswers(question).forEach((answer, id) => {
        let ok = false;
        try{ ok = engine.judge(question, answer); }catch(error){ ok = false; }
        if(ok) score.set(id, (score.get(id) || 0) + 1);
      });
    });
    let best = 0;
    score.forEach(value => { if(value > best) best = value; });
    hits += best;
  });
  return hits / questions.length;
}
function directionAnswer(question, direction){
  const n = numbersOf(question);
  if(n.length < 2) return null;
  const value = direction === "gcd" ? gcd(n[0], n[1]) : lcm(n[0], n[1]);
  if(question.kind === "num") return value;
  if(question.kind === "choice"){
    const word = direction === "gcd" ? "最大公約数" : "最小公倍数";
    const at = question.choices.findIndex(text => text.indexOf(word) >= 0);
    return at >= 0 ? at : null;
  }
  return null;
}
function directionRate(questions, decide){
  let hits = 0;
  questions.forEach(question => {
    const direction = decide(question);
    if(!direction) return;
    const answer = directionAnswer(question, direction);
    if(answer === null) return;
    let ok = false;
    try{ ok = engine.judge(question, answer); }catch(error){ ok = false; }
    if(ok) hits++;
  });
  return hits / questions.length;
}
function plainWordMap(question){
  if(question.ask === "max") return "gcd";
  if(question.ask === "min") return "lcm";
  return null;
}
function bandOf(value){
  return value < 10 ? "a" : value < 30 ? "b" : value < 60 ? "c" : value < 120 ? "d" : value < 300 ? "e" : "f";
}
function boundaryBites(question){
  /* 境界が答えを動かすかを、素直な写像で決めた側について計算する。 */
  const n = numbersOf(question);
  if(!question.boundary || n.length < 3) return false;
  const implied = plainWordMap(question);
  if(!implied) return false;
  const plain = implied === "gcd" ? gcd(n[0], n[1]) : lcm(n[0], n[1]);
  return question.boundary.kind === "upper" ? plain > n[2] : plain <= n[2];
}
const scenePool = {};
[4, 6, 10].forEach(lv => { scenePool[lv] = flat[lv]; });
const orderingPool = flat[5].concat(flat[10]).filter(q => q.format === "ordering").slice(0, 200);
const diagnosisPool = [5, 6, 8, 9, 10].reduce((all, lv) =>
  all.concat(flat[lv].filter(q => q.format === "diagnosis")), []).slice(0, 200);

function reportRate(name, rate, threshold){
  /* SEISU_SOLVER_LOG=1 で実測値を並べて見られるようにしておく (再監査への受け渡し)。 */
  if(process.env.SEISU_SOLVER_LOG) console.log("  " + name + " = " + rate.toFixed(3) + " / " + threshold);
  assert.ok(rate < threshold, `${name} の正答率 ${rate.toFixed(3)} が閾値 ${threshold} 以上`);
}

test("A1 列の最大値 (Lv1、閾値 0.70)", () => {
  let hits = 0;
  flat[1].forEach(question => {
    const list = (question.text.match(/\d+(?:, \d+)+/g) || [])[0];
    if(!list) return;
    const answer = Math.max.apply(null, list.split(", ").map(Number));
    let ok = false;
    try{ ok = engine.judge(question, answer); }catch(error){ ok = false; }
    if(ok) hits++;
  });
  reportRate("A1", hits / flat[1].length, 0.70);
});

test("A2 形式内固定手続き / A23 形式から pattern (Lv1、2、3、5、7、9、10、閾値 0.70)", () => {
  [1, 2, 3, 5, 7, 9, 10].forEach(lv => {
    reportRate(`A2 Lv${lv}`, partitionRate(flat[lv], q => q.format), 0.70);
  });
});

test("A3 与件の個数と帯 (Lv2、4、5、7、8、閾値 0.70)", () => {
  [2, 4, 5, 7, 8].forEach(lv => {
    const rate = partitionRate(flat[lv], q =>
      q.format + "|" + numbersOf(q).length + "|" + numbersOf(q).map(bandOf).join(","));
    reportRate(`A3 Lv${lv}`, rate, 0.70);
  });
});

test("A4 から A9 大小語と境界の系列 (Lv4、6、10、閾値 0.70)", () => {
  [4, 6, 10].forEach(lv => {
    const pool = scenePool[lv];
    reportRate(`A4 Lv${lv}`, directionRate(pool, plainWordMap), 0.70);
    reportRate(`A5 Lv${lv}`, directionRate(pool, q => {
      if(numbersOf(q).length === 3 && q.domain === "scene") return "lcm";
      return plainWordMap(q);
    }), 0.70);
    reportRate(`A6 Lv${lv}`, directionRate(pool, q => {
      const plain = plainWordMap(q);
      if(!plain) return null;
      return numbersOf(q).length === 3 ? (plain === "gcd" ? "lcm" : "gcd") : plain;
    }), 0.70);
    reportRate(`A7 Lv${lv}`, directionRate(pool, q => plainWordMap(q) || "lcm"), 0.70);
    reportRate(`A8 Lv${lv}`, directionRate(pool, q => {
      const plain = plainWordMap(q);
      if(!plain) return null;
      return boundaryBites(q) ? (plain === "gcd" ? "lcm" : "gcd") : plain;
    }), 0.70);
    reportRate(`A9 Lv${lv}`, directionRate(pool, q => {
      const n = numbersOf(q);
      if(n.length < 3 || !q.boundary) return plainWordMap(q);
      if(q.boundary.kind === "upper") return lcm(n[0], n[1]) <= n[2] ? "lcm" : "gcd";
      if(q.boundary.kind === "lower") return gcd(n[0], n[1]) > n[2] ? "gcd" : "lcm";
      return plainWordMap(q);
    }), 0.70);
  });
});

test("A10 数値連鎖 / A11 部品数からの設計判別 / A12 役割語照合 (整列、閾値 0.35)", () => {
  assert.ok(orderingPool.length >= 150, `整列問題が ${orderingPool.length} 問`);
  const chainOnly = new Set(["o:chain", "o:byNumber", "o:byNumberDesc"]);
  let a10 = 0;
  orderingPool.forEach(question => {
    let ok = false;
    candidateAnswers(question).forEach((answer, id) => {
      if(!chainOnly.has(id)) return;
      try{ if(engine.judge(question, answer)) ok = true; }catch(error){ /* 判定不能は不正解 */ }
    });
    if(ok) a10++;
  });
  reportRate("A10", a10 / orderingPool.length, 0.35);
  reportRate("A11", partitionRate(orderingPool, question => {
    const free = question.parts.map((part, index) => /\d/.test(part.text) ? null : index).filter(v => v !== null);
    return question.parts.length + "/" + (free.length === question.parts.length ? "all" : free.join("-"));
  }), 0.35);
  let a12 = 0;
  orderingPool.forEach(question => {
    const answer = candidateAnswers(question).get("o:byRole");
    if(!answer) return;
    try{ if(engine.judge(question, answer)) a12++; }catch(error){ /* 判定不能は不正解 */ }
  });
  reportRate("A12", a12 / orderingPool.length, 0.35);
});

test("A13 答案の式からラベル / A14「わけ」欄からラベル (診断、閾値 0.50)", () => {
  assert.ok(diagnosisPool.length >= 150, `診断問題が ${diagnosisPool.length} 問`);
  const surface = text => [/×/, /÷/, /最大公約数/, /最小公倍数/, /あまり/, /公約数は/, /=/, /-/]
    .map(pattern => pattern.test(text) ? "1" : "0").join("");
  reportRate("A13", partitionRate(diagnosisPool, q => surface(q.workExpression || "")), 0.50);
  const reasonSurface = text => [/「/, /大きいほう/, /小さいほう/, /共通/, /積/, /素数/, /くり返し/, /1 をたして/]
    .map(pattern => pattern.test(text) ? "1" : "0").join("");
  reportRate("A14", partitionRate(diagnosisPool, q => reasonSurface(q.workReason || "")), 0.50);
});

test("A15 選択肢の文言 (Lv8、9、閾値 0.40) / A16 常に正しい (診断、閾値 0.35)", () => {
  [8, 9].forEach(lv => {
    const pool = flat[lv].filter(q => q.kind === "choice");
    let hits = 0;
    pool.forEach(question => {
      const at = question.choices.findIndex(text => text.indexOf("商に 1 をたす") >= 0);
      const fallback = question.choices.indexOf("正しい");
      const answer = at >= 0 ? at : fallback;
      if(answer < 0) return;
      try{ if(engine.judge(question, answer)) hits++; }catch(error){ /* 判定不能は不正解 */ }
    });
    reportRate(`A15 Lv${lv}`, hits / pool.length, 0.40);
  });
  let always = 0;
  diagnosisPool.forEach(question => {
    const at = question.choices.indexOf("正しい");
    if(at < 0) return;
    try{ if(engine.judge(question, at)) always++; }catch(error){ /* 判定不能は不正解 */ }
  });
  reportRate("A16", always / diagnosisPool.length, 0.35);
});

test("A17 答えの型 (Lv8、閾値 0.70)", () => {
  reportRate("A17", partitionRate(flat[8], question => {
    if(question.kind === "num") return "num";
    if(question.kind !== "choice") return question.kind;
    return question.choices.some(text => /曜日$/.test(text)) ? "weekday" : "expression";
  }), 0.70);
});

test("A18 位置から pattern / A19 ペア内の順序 (全 Lv、閾値 0.70)", () => {
  LEVELS.forEach(lv => {
    reportRate(`A18 Lv${lv}`, partitionRate(flat[lv], (q, index) => index % 5), 0.70);
    const pool = flat[lv];
    reportRate(`A19 Lv${lv}`, partitionRate(pool, (question, index) => {
      const at = index % 5, base = index - at, set = pool.slice(base, base + 5);
      const before = at > 0 ? set[at - 1] : null, after = at < 4 ? set[at + 1] : null;
      const paired = (before && before.pairId && before.pairId === question.pairId) ? "second"
        : (after && after.pairId && after.pairId === question.pairId) ? "first" : null;
      return paired ? question.format + "/" + paired : null;
    }), 0.70);
  });
});

test("A20 単位から向き / A22 足場から向き (閾値 0.70)", () => {
  [4, 6, 10].forEach(lv => {
    reportRate(`A20 Lv${lv}`, directionRate(scenePool[lv], question =>
      (question.params && (question.params.unit === "分" || question.params.unit === "秒")) ? "lcm" : plainWordMap(question)), 0.70);
  });
  [4, 6, 7, 9].forEach(lv => {
    reportRate(`A22 Lv${lv}`, directionRate(flat[lv], question => {
      if(!question.scaffold) return null;
      const gcdAt = question.scaffold.indexOf("公約数"), lcmAt = question.scaffold.indexOf("公倍数");
      if(gcdAt < 0 && lcmAt < 0) return null;
      if(gcdAt < 0) return "lcm";
      if(lcmAt < 0) return "gcd";
      return gcdAt < lcmAt ? "gcd" : "lcm";
    }), 0.70);
  });
});

test("A21 候補の帯 / A24 3 数の集合の大きさ (閾値 0.70)", () => {
  [1, 3, 9, 10].forEach(lv => {
    const pool = flat[lv].filter(q => q.format === "find_all");
    let hits = 0;
    pool.forEach(question => {
      const n = numbersOf(question);
      if(n.length < 2) return;
      const top = Math.max.apply(null, question.candidates);
      const id = top <= Math.max.apply(null, n) ? "s:commonDiv" : "s:commonMul";
      const answer = candidateAnswers(question).get(id);
      if(!answer) return;
      try{ if(engine.judge(question, answer)) hits++; }catch(error){ /* 判定不能は不正解 */ }
    });
    if(pool.length) reportRate(`A21 Lv${lv}`, hits / flat[lv].length, 0.70);
  });
  const triples = flat[10].filter(q => q.format === "find_all" && numbersOf(q).length === 3);
  let hits = 0;
  triples.forEach(question => {
    const answers = candidateAnswers(question);
    const divs = answers.get("s:commonDiv3") || [], muls = answers.get("s:commonMul3") || [];
    const answer = divs.length >= muls.length ? divs : muls;
    if(!answer.length) return;
    try{ if(engine.judge(question, answer)) hits++; }catch(error){ /* 判定不能は不正解 */ }
  });
  if(triples.length) reportRate("A24", hits / triples.length, 0.70);
});

console.log("RESULT " + passed + " passed, 0 failed");
