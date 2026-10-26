#!/usr/bin/env node
// Wording-id caps of 4.5 章 (v0.5.1): per Lv, the expected count E of each wording id in a set
// (counted from the final items of audit_sim.js), the cap max(3, ceil(2 * E)), and the share of
// sets that would exceed it (those sets are redrawn).
//   node wording_caps.js [sets-per-Lv]
'use strict';
const sim = require('./audit_sim.js');
const N = +(process.argv[2] || 3000);
if (!Number.isInteger(N) || N < 1) { console.error('sets-per-Lv must be a positive integer'); process.exit(2); }

function cId(sent) {
  const j = sent.join(' ');
  if (!/より/.test(j)) return null;
  const after = /ほうが/.test(j), more = /おおい|おおく/.test(j), num = /です$/.test(j);
  if (after) return more ? 'c5' : 'c6';
  if (num) return more ? 'c1' : 'c2';
  return more ? 'c3' : 'c4';
}
const IDS = ['h0', 'h1', 'h2', 'h3', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10',
  't1', 't2', 't3', 't4', 't5', 't6',
  's1', 's1b', 's2', 's3', 's4', 's5', 's5b', 's6',
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

console.log(['Lv', ...IDS].join('\t'));
let worst = 0;
for (let lv = 1; lv <= 10; lv++) {
  sim.setR(sim.mulberry32(7000 + lv));
  const dist = {}; IDS.forEach(id => (dist[id] = []));
  for (let s = 0; s < N; s++) {
    let seq;
    try { seq = sim.buildSet(lv); } catch (e) { console.error(`buildSet failed at Lv${lv}: ${e.message}`); process.exit(1); }
    const c = {};
    const add = id => { if (id) c[id] = (c[id] || 0) + 1; };
    for (const it of seq) {
      const sc = it.scene;
      if (sc && sc.form && /^t/.test(sc.form)) add(sc.frameZ ? 't6' : sc.form); // a framed sentence counts as t6 only
      const forms = it.forms || (sc && sc.forms) || [];
      for (const f of forms) add(f === 'hc' ? 'h0' : f);
      for (const st of it.sents || []) add(cId(st));
    }
    IDS.forEach(id => dist[id].push(c[id] || 0));
  }
  const row = IDS.map(id => {
    const d = dist[id], E = d.reduce((a, b) => a + b, 0) / N;
    if (E === 0) return '-';
    const cap = Math.max(3, Math.ceil(2 * E)), over = d.filter(x => x > cap).length / N;
    worst = Math.max(worst, over);
    return `${E.toFixed(2)}/${cap}${over > 0 ? `(>${over.toFixed(3)})` : ''}`;
  });
  console.log([`Lv${lv}`, ...row].join('\t'));
}
console.log(`cell = E/cap(share of sets over cap). worst share over cap: ${worst.toFixed(3)}`);
