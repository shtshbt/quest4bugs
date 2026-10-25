'use strict';
// usage: node run3.js [testSets] [trainSets] [lvLo] [lvHi] [variant]
const G = require('./gen3.js');
const S = require('./solvers3.js');
const NTEST = Number(process.argv[2] || 2000), NTRAIN = Number(process.argv[3] || 30000);
const LO = Number(process.argv[4] || 1), HI = Number(process.argv[5] || 10);
const variant = process.argv[6] || 'base';
const m = variant.match(/sfp([0-9.]+)/);
const opt = variant === 'v031' ? { sumcap: true, near: true, p1redraw: true, sfp: 0.5 } // the v0.3.1 rules (curriculum 3.6, 3.10)
  : { sumcap: variant.includes('sumcap'), sfp: m ? Number(m[1]) : 0, acommon: variant.includes('acommon'), p1redraw: variant.includes('p1redraw'), near: variant.includes('near') };
const BSETS = ['', 'op', 'pos', 'mag', 'size', 'amax', 'orient', 'card', 'pair',
  'op,pair', 'pos,pair', 'mag,pair', 'size,pair', 'orient,pair', 'card,pair',
  'op,size', 'pos,size', 'mag,size', 'op,amax', 'pos,amax', 'op,size,pair', 'pos,size,pair', 'pos,orient', 'op,orient',
  'op,mag', 'pos,mag', 'op,mag,pair', 'pos,mag,pair', 'op,pos'];
const B10 = ['', 'verb', 'kmag', 'ksize', 'card', 'pair', 'verb,pair', 'verb,kmag', 'verb,ksize', 'verb,kmag,ksize', 'verb,kmag,pair', 'verb,ksize,pair', 'verb,kmag,ksize,pair', 'kmag,ksize,pair', 'verb,card,pair'];
const out = {};
for (let lv = LO; lv <= HI; lv++) {
  const rT = G.mulberry32(31000 + lv), rS = G.mulberry32(35000 + lv);
  const test = Array.from({ length: NTEST }, () => G.buildSet(lv, rT, opt));
  const N = NTEST * 5, res = {};
  if (lv === 1) {
    const L = { L1_sum: p => p.nums[0] + p.nums[1], L2_bigminus: p => Math.max(...p.nums) - Math.min(...p.nums), L3_first: p => p.nums[0] };
    for (const k in L) res['A:' + k] = test.reduce((a, s) => a + s.filter(p => L[k](p) === p.ans).length, 0) / N;
  } else if (lv === 10) {
    for (const k in S.STAGE_A10) res['A:' + k] = test.reduce((a, s) => a + s.filter(p => S.judge(p, S.STAGE_A10[k](p))).length, 0) / N;
    const tr = Array.from({ length: NTRAIN }, () => G.buildSet(lv, rS, opt));
    for (const w of B10) { const ws = w ? w.split(',') : []; const tab = S.train10(tr, ws); res['B:' + (w || 'none')] = test.reduce((a, s) => a + S.runB10(tab, s, ws), 0) / N; }
  } else {
    for (const k in S.STAGE_A) res['A:' + k] = test.reduce((a, s) => a + S.runA(k, s), 0) / N;
    res['A:A10_repeat_prev'] = test.reduce((a, s) => a + S.runA10(s), 0) / N;
    const tr = Array.from({ length: NTRAIN }, () => G.buildSet(lv, rS, opt));
    for (const w of BSETS) { const ws = w ? w.split(',') : []; const tab = S.train(tr, ws); res['B:' + (w || 'fam')] = test.reduce((a, s) => a + S.runB(tab, s, ws), 0) / N; }
  }
  out[lv] = res;
  console.log(`Lv${lv}: ` + Object.entries(res).map(([k, v]) => `${k}=${v.toFixed(3)}`).join('  '));
}
require('fs').writeFileSync(require('path').join(process.cwd(), `results3_${variant}_${LO}_${HI}.json`), JSON.stringify(out, null, 1));
