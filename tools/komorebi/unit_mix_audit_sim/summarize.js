'use strict';
// usage: node summarize.js [results.json]  (the path is read relative to the current directory)
const r = require(require('path').resolve(process.argv[2] || 'results.json')); const f = v => (v === null || v === undefined ? '-' : v.toFixed(2));
for (let lv = 1; lv <= 10; lv++) { const x = r[lv]; const st = x.strat;
  const A = Object.entries(st).filter(([k, v]) => v.stage === 'A').sort((a, b) => b[1].acc - a[1].acc);
  console.log(lv, 'A', A[0][0].split(' ')[0], f(A[0][1].acc), 'A2', A[1][0].split(' ')[0], f(A[1][1].acc), 'B', f(x.compB.acc), 'B8', f(st['B8 時間の言い方の肢の形'].acc), 'M1magR', f(st.M1magR.acc), 'M1d', f(st.M1d.acc), 'E7', f(st.E7.acc) + '/' + f(st.E7.p8),
    ['M1', 'M2', 'M3', 'M1mag'].map(m => m + ' ' + f(st[m].acc) + '/' + f(st[m].p8) + '/' + f(st[m].allCorrectSets)).join(' '), 'pair2 B9', f(x.pair2.B9), 'A10', f(x.pair2.A10), 'pos', x.pos.join('/'), JSON.stringify(x.concl), f(x.diagCorrectRate), 'A8', f(st['A8 単位の見た目の倍率'].acc), 'B60', f(x.compB60.acc), 'free', JSON.stringify(x.free));
  console.log('   best', JSON.stringify(x.compB.best)); }
