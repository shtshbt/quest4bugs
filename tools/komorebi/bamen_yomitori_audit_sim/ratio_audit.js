#!/usr/bin/env node
// Ratio checks of 10 章 that the audit generator can be measured against (v0.5.3). Prints, per Lv
// and pooled, the share each check constrains, so that products and denominators of the ratio
// rules can be compared against the stated bands.
//   node ratio_audit.js [sets-per-Lv]
'use strict';
const sim = require('./audit_sim.js');
const N = +(process.argv[2] || 2000);
if (!Number.isInteger(N) || N < 1) { console.error('sets-per-Lv must be a positive integer'); process.exit(2); }

const R = () => ({ n: 0, d: 0 });
const add = (r, hit) => { r.d++; if (hit) r.n++; };
const f = r => (r.d ? `${(r.n / r.d).toFixed(3)} (${r.d})` : '-');
const pooled = {};
const names = ['t4_of_recvSubj', 'wordSwap_of_transfer', 't6_of_3p_noSwap', 't6_of_3p_all', 'h0_of_starts', 'pair_of_2p_2stmt', 'h8h10_of_3p_stmt', 'h6h7_of_3p_stmt', 'h5_have_items', 's3_split_items', 's5s5b_of_totals', 'intro_items'];
names.forEach(k => (pooled[k] = R()));
console.log(['Lv', ...names].join('\t'));
for (let lv = 1; lv <= 10; lv++) {
  sim.setR(sim.mulberry32(8200 + lv));
  const r = {}; names.forEach(k => (r[k] = R()));
  for (let s = 0; s < N; s++) {
    let seq;
    try { seq = sim.buildSet(lv); } catch (e) { console.error(`buildSet failed at Lv${lv}: ${e.message}`); process.exit(1); }
    for (const it of seq) {
      const sc = it.scene || {};
      const forms = it.forms || sc.forms || [];
      const isTransfer = /^t/.test(sc.form || '');
      if (isTransfer) {
        if (['t3', 't4'].includes(sc.form)) add(r.t4_of_recvSubj, sc.form === 't4');
        add(r.wordSwap_of_transfer, !!sc.wordSwap);
        if (it.k >= 3) { add(r.t6_of_3p_all, !!sc.frameZ); if (!sc.wordSwap) add(r.t6_of_3p_noSwap, !!sc.frameZ); }
        add(r.h0_of_starts, forms[0] === 'hc');
      }
      const bind = forms.filter(x => /^h/.test(x) && x !== 'hc');
      if (it.k === 2 && bind.length === 2) add(r.pair_of_2p_2stmt, bind.includes('h8') && bind.includes('h10'));
      if (it.k >= 3) for (const b of bind) { add(r.h8h10_of_3p_stmt, b === 'h8' || b === 'h10'); add(r.h6h7_of_3p_stmt, b === 'h6' || b === 'h7'); }
      if (/^have/.test(it.pattern)) add(r.h5_have_items, bind.includes('h5'));
      if (/^split/.test(it.pattern) || /^step_split/.test(it.pattern)) {
        const sf = forms.find(x => /^s/.test(x));
        if (sf) { add(r.s3_split_items, sf === 's3'); add(r.s5s5b_of_totals, sf === 's5' || sf === 's5b'); }
      }
      add(r.intro_items, (it.sents || []).some(st => st[st.length - 1] === 'います' && st.some(t => /が$/.test(t)) && st.length >= 3 && !st.some(t => /\d/.test(t))));
    }
  }
  names.forEach(k => { pooled[k].n += r[k].n; pooled[k].d += r[k].d; });
  console.log([`Lv${lv}`, ...names.map(k => f(r[k]))].join('\t'));
}
console.log(['all', ...names.map(k => f(pooled[k]))].join('\t'));
