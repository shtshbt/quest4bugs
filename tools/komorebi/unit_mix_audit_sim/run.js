'use strict';
// kom_unit_mix audit generator (docs/komorebi_unit_mix_curriculum.md 11 章)
// usage: UMIX_TRIES=30 node run.js [nSets]   (writes results.json to the current directory, or to UMIX_OUT)
const G = require('./gen.js');
const S = require('./sets.js');
const V = require('./solvers.js');
const N = Number(process.argv[2] || 2000);

function trainPrior() {
  const prior = {};
  for (let lv = 1; lv <= 10; lv++) {
    const R = G.rng(9000 + lv);
    for (let i = 0; i < 300; i++) for (const q of S.buildSet(lv, R)) if (q.pattern === 'diagnosis') {
      const k = lv + '|' + q.src.pattern + '|' + q.src.domain; prior[k] = prior[k] || {}; prior[k][q.label] = (prior[k][q.label] || 0) + 1;
    }
  }
  return prior;
}
const prior = trainPrior();
// v0.2.1: direction table for E7 (C7)
function trainDir() {
  const tab = {};
  for (let lv = 1; lv <= 10; lv++) { const R = G.rng(9500 + lv);
    for (let i = 0; i < 300; i++) for (const q0 of S.buildSet(lv, R)) { const q = q0.pattern === 'diagnosis' ? q0.src : q0; if (!q.paths) continue;
      const k = [lv, (q0.pattern === 'diagnosis' ? 'diagnosis.' : '') + q.pattern, q.domain, q.paths[0].v >= 10 ? 'big' : 'small'].join('|'); tab[k] = tab[k] || { up: 0, down: 0 }; tab[k][q.paths[0].op === '÷' ? 'up' : 'down']++; } }
  return tab;
}
const dirTab = trainDir();
const STRATS = [];
const add = (name, stage, fn) => STRATS.push({ name, stage, fn });
add('A1 数だけ動かす', 'A', V.A1);
for (const c of [10, 60, 100, 1000]) add('A2 c=' + c, 'A', V.A2(c));
add('A4 直前の倍率', 'A', V.A4);
for (const k of [1, 2, 3, 4]) add('A5 k=' + k, 'A', V.A5(k));
add('A6 大きい単位', 'A', V.A6);
add('A7 いつも同じ', 'A', V.A7);
add('A8 単位の見た目の倍率', 'L', V.A8);
add('A8s 単位の見た目の倍率 (k c 時間分のみ)', 'L', V.A8s);
add('M1mag 数の大きさで向き', 'A', V.probe('M1mag'));
add('M1magR 数の大きさで向き (逆)', 'B', V.probe('M1magR'));
add('A9 最大の数', 'A', V.A9);
add('A10 前問の数の写し', 'A', V.A10);
add('A12 数字の並びで比べる', 'A', V.A12);
add('A13 診断の語の直結', 'A', V.A13);
add('A14 式に倍率なしならそろえていない', 'A', V.A14);
add('B8 時間の言い方の肢の形', 'B', V.B8); add('B9 対比の 1 問目の倍率', 'B', V.B9);
add('B1', 'B', V.B1); add('B2', 'B', V.B2); add('B3', 'B', V.B3(prior)); add('B4', 'B', V.B4); add('B4s', 'B', V.B4s);
for (const c of [10, 100, 1000, 10000]) for (const d of ['correct', 'steps']) add(`B5 c=${c} d=${d}`, 'B60', V.B5(c, d));
for (const c of [10, 60, 100, 1000, 10000]) for (const d of ['correct', 'steps']) for (const o of ['p10', 's60']) add(`B7 c=${c} d=${d} o=${o}`, 'B', V.B5(c, d, false, o));
for (const c of [10, 60, 100, 1000]) add('B6 c=' + c, 'B', V.B6(c));
for (const m of ['M1', 'M1d', 'M2', 'M3', 'M1mag', 'M1magR', 'TRUE']) add(m, 'M', V.probe(m));
add('E7', 'M', V.E7(dirTab));

const keyOf = q => q.pattern;
const out = {};
for (let lv = 1; lv <= 10; lv++) {
  const R = G.rng(1000 + lv); const RS = G.rng(5000 + lv);
  const sets = []; for (let i = 0; i < N; i++) sets.push(S.buildSet(lv, R));
  const res = STRATS.map(() => sets.map(() => []));
  sets.forEach((set, si) => {
    STRATS.forEach((s, k) => { set.forEach((q, qi) => { res[k][si].push(s.fn(q, set.slice(0, qi), RS, lv) ? 1 : 0); }); });
  });
  const acc = k => res[k].flat().reduce((a, b) => a + b, 0) / (N * 5);
  // per pattern accuracy
  const pats = [...new Set(sets.flat().map(keyOf))];
  const patAcc = (k, p) => { let c = 0, n = 0; sets.forEach((set, si) => set.forEach((q, qi) => { if (keyOf(q) === p) { n++; c += res[k][si][qi]; } })); return n ? c / n : 0; };
  const composite = (stages, excl = []) => {
    const best = {};
    for (const p of pats) { let bk = -1, bv = -1; STRATS.forEach((s, k) => { if (!stages.includes(s.stage) || excl.some(e => s.name.startsWith(e))) return; const v = patAcc(k, p); if (v > bv) { bv = v; bk = k; } }); best[p] = { k: bk, v: bv, name: STRATS[bk].name }; }
    const scores = sets.map((set, si) => set.reduce((a, q, qi) => a + res[best[keyOf(q)].k][si][qi], 0));
    return { best, scores };
  };
  // v0.2.4 (10.2 章): a window is 2 consecutive sets (10 items), sliding by 1 set, as in the independent check
  const windows = scores => { let p8 = 0, p4 = 0, n = 0; for (let i = 0; i + 1 < scores.length; i += 1) { const w = scores[i] + scores[i + 1]; n++; if (w >= 8) p8++; if (w <= 4) p4++; } return { p8: p8 / n, p4: p4 / n }; };
  const row = { lv, strat: {}, pats };
  STRATS.forEach((s, k) => {
    const scores = res[k].map(a => a.reduce((x, y) => x + y, 0));
    row.strat[s.name] = { stage: s.stage, acc: acc(k), ...windows(scores), allCorrectSets: scores.filter(x => x === 5).length / N,
      perPat: Object.fromEntries(pats.map(p => [p, +patAcc(k, p).toFixed(3)])) };
  });
  const meanS = sc => sc.reduce((a, b) => a + b, 0) / (sc.length * 5);
  // v0.2: table-using probes (M1mag) are excluded from the table-free composites
  const cB = composite(['A', 'B'], ['M1mag', 'M1magR']); const cA = composite(['A'], ['M1mag']);
  const cB60 = composite(['A', 'B', 'B60'], ['M1mag', 'M1magR']);
  row.compB60 = { acc: meanS(cB60.scores), ...windows(cB60.scores), best: Object.fromEntries(Object.entries(cB60.best).map(([p, b]) => [p, b.name + ' ' + b.v.toFixed(2)])) };
  row.compB = { acc: meanS(cB.scores), ...windows(cB.scores), best: Object.fromEntries(Object.entries(cB.best).map(([p, b]) => [p, b.name + ' ' + b.v.toFixed(2)])) };
  row.compAperPattern = { acc: meanS(cA.scores) };
  const cBx = composite(['A', 'B'], ['A8', 'M1mag', 'M1magR']);
  row.compBnoA8 = { acc: meanS(cBx.scores), ...windows(cBx.scores), best: Object.fromEntries(Object.entries(cBx.best).map(([p, b]) => [p, b.name + ' ' + b.v.toFixed(2)])) };
  // v0.2.1: B9 on the second item of contrast pairs, A10 likewise
  { const k9 = STRATS.findIndex(x => x.name.startsWith('B9')); const k10 = STRATS.findIndex(x => x.name.startsWith('A10')); let n2 = 0, c9 = 0, c10 = 0;
    sets.forEach((set, si) => set.forEach((q, qi) => { if (q.pairWithPrev) { n2++; c9 += res[k9][si][qi]; c10 += res[k10][si][qi]; } }));
    row.pair2 = { n: n2, B9: n2 ? c9 / n2 : null, A10: n2 ? c10 / n2 : null }; }
  // v0.2.1: E7 and TRUE restricted to the items whose direction is a free choice (convert, rate_select, align_calc, and diagnoses of them)
  { const k7 = STRATS.findIndex(x => x.name === 'E7'); const kd = STRATS.findIndex(x => x.name === 'M1d'); const k1 = STRATS.findIndex(x => x.name === 'M1'); let n = 0, c7 = 0, cd = 0, c1 = 0; const FREE = ['convert', 'rate_select', 'align_calc'];
    sets.forEach((set, si) => set.forEach((q, qi) => { const b = q.pattern === 'diagnosis' ? q.src : q; if (!FREE.includes(b.pattern) || q.pairWithPrev) return; n++; c7 += res[k7][si][qi]; cd += res[kd][si][qi]; c1 += res[k1][si][qi]; }));
    row.free = { n, E7: n ? c7 / n : null, M1d: n ? cd / n : null, M1: n ? c1 / n : null }; }
  // v0.2.3: windows of 10 items (2 sets) restricted to an item filter; p8 = the share of windows whose correct share is 0.8 or more
  const winSub = (k, keep) => { let p8 = 0, n = 0, c = 0, m = 0; for (let i = 0; i + 1 < sets.length; i += 1) { let cc = 0, nn = 0;
      for (const si of [i, i + 1]) sets[si].forEach((q, qi) => { if (!keep(q)) return; nn++; cc += Array.isArray(k) ? k[si][qi] : res[k][si][qi]; });
      if (!nn) continue; n++; if (cc / nn >= 0.8 - 1e-9) p8++; c += cc; m += nn; } return { n, p8: n ? p8 / n : null, acc: m ? c / m : null, perWin: n ? m / n : null }; };
  const FIXED = ['compound_in', 'time_express', 'recall']; // 3 章の (ii): the direction is part of the form of the item
  { const k7 = STRATS.findIndex(x => x.name === 'E7'); row.e7sub = winSub(k7, q => !FIXED.includes(q.pattern)); }
  // stage B composite without the two approved procedures (diagnosis read from the sheet, 1 秒で -> ÷60 in speed_apply)
  { const perItem = sets.map((set, si) => set.map((q, qi) => res[cB.best[keyOf(q)].k][si][qi]));
    row.compBexcl = winSub(perItem, q => q.pattern !== 'diagnosis' && q.pattern !== 'speed_apply'); }
  // positions
  const pos = [0, 0, 0, 0]; let pn = 0; sets.flat().forEach(q => { if (['rate_select', 'time_express', 'diagnosis'].includes(q.pattern)) { pos[q.ansIdx]++; pn++; } });
  row.pos = pos.map(x => +(x / pn).toFixed(3));
  const concl = {}; sets.flat().map(S.base).filter(q => q.pattern === 'compare').forEach(q => { concl[q.concl] = (concl[q.concl] || 0) + 1; });
  row.concl = concl;
  const diag = sets.flat().filter(q => q.pattern === 'diagnosis');
  row.diagCorrectRate = diag.length ? diag.filter(q => q.label === 'correct').length / diag.length : null;
  out[lv] = row;
  const sA = Object.entries(row.strat).filter(([, v]) => v.stage === 'A').sort((a, b) => b[1].acc - a[1].acc);
  const sB = Object.entries(row.strat).filter(([, v]) => v.stage === 'B' || v.stage === 'B60').sort((a, b) => b[1].acc - a[1].acc);
  const f = x => x.toFixed(2);
  const tr = S.STATS[lv] || []; console.log(`   build tries mean ${(tr.reduce((a, b) => a + b, 0) / tr.length).toFixed(1)}`);
  console.log(`Lv${lv}: A-max ${sA[0][0]} ${f(sA[0][1].acc)} | A-2nd ${sA[1][0]} ${f(sA[1][1].acc)} | A per-pattern comp ${f(row.compAperPattern.acc)} | B-single ${sB[0][0]} ${f(sB[0][1].acc)} | B comp(strict) ${f(row.compB.acc)} p8=${f(row.compB.p8)} | B comp(+60) ${f(row.compB60.acc)} | B strict no A8 ${f(row.compBnoA8.acc)} p8=${f(row.compBnoA8.p8)} | A8s ${f(row.strat['A8s 単位の見た目の倍率 (k c 時間分のみ)'].acc)}`);
  console.log('   compBnoA8 best:', JSON.stringify(row.compBnoA8.best));
  for (const m of ['M1', 'M2', 'M3', 'M1mag', 'M1magR', 'E7', 'TRUE']) { const v = row.strat[m]; console.log(`   ${m}: acc ${f(v.acc)} p8 ${f(v.p8)} p4 ${f(v.p4)} all5 ${f(v.allCorrectSets)}`); }
  console.log('   compB best:', JSON.stringify(row.compB.best));
  for (const m of ['M1', 'M2', 'M3', 'M1mag']) console.log('   ', m, JSON.stringify(row.strat[m].perPat));
  console.log('   A8', row.strat['A8 単位の見た目の倍率'].acc.toFixed(2), 'A9', row.strat['A9 最大の数'].acc.toFixed(2), 'A10', row.strat['A10 前問の数の写し'].acc.toFixed(2), 'A12', row.strat['A12 数字の並びで比べる'].acc.toFixed(2), 'A13', row.strat['A13 診断の語の直結'].acc.toFixed(2), 'A14', row.strat['A14 式に倍率なしならそろえていない'].acc.toFixed(2));
  console.log('   pair2', JSON.stringify(row.pair2), 'B8', row.strat['B8 時間の言い方の肢の形'].acc.toFixed(2), 'M1magR', row.strat['M1magR 数の大きさで向き (逆)'].acc.toFixed(2));
  console.log('   v023 E7 without fixed patterns', JSON.stringify(row.e7sub), 'B without approved', JSON.stringify(row.compBexcl));
  console.log('   pos', row.pos, 'concl', JSON.stringify(row.concl), 'diagCorrect', row.diagCorrectRate && row.diagCorrectRate.toFixed(3));
}
// results are written to the current directory (or UMIX_OUT), not next to the scripts
require('fs').writeFileSync(process.env.UMIX_OUT || require('path').join(process.cwd(), 'results.json'), JSON.stringify(out, null, 1));
