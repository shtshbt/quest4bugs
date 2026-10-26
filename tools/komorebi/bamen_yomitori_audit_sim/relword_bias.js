#!/usr/bin/env node
// C7 check for the h10 relation words: per word, how often the owner X ("Y の 〈rel〉の X は") is
// the answer of a person item or the person named by a number/direction question, against the
// same rate over all h10 owners. A word that predicts the answer or role would show a gap.
'use strict';
// Check 45 of 10 章 (v0.5.1).   node relword_bias.js [sets-per-Lv]
const sim = require('./audit_sim.js');
const N = +(process.argv[2] || 3000);
const WORDS = ['ともだち', 'せんぱい', 'こうはい', 'おにいさん', 'おとうと', 'おじいさん', 'おねえさん', 'いもうと', 'おばあさん'];
const KUN = new Set(['おにいさん', 'おとうと', 'おじいさん']), SAN = new Set(['おねえさん', 'いもうと', 'おばあさん']);
const st = {}; WORDS.forEach(w => (st[w] = { n: 0, ansN: 0, ans: 0, askN: 0, ask: 0, kun: 0, san: 0, fam: 0 }));
const base = { ansN: 0, ans: 0, askN: 0, ask: 0 };
let genderViolations = 0;
const gbase = { kun: { ansN: 0, ans: 0, askN: 0, ask: 0 }, san: { ansN: 0, ans: 0, askN: 0, ask: 0 } };
for (let lv = 1; lv <= 10; lv++) {
  sim.setR(sim.mulberry32(9100 + lv));
  for (let s = 0; s < N; s++) {
    let seq;
    try { seq = sim.buildSet(lv); } catch (e) { console.error('buildSet failed', lv, e.message); process.exit(1); }
    for (const it of seq) {
      const flat = it.sents.map(x => x.join(' ')).join(' ').split(/[ 、]/).filter(Boolean);
      const ansLabel = it.kind === 'person' ? it.options[it.ans] : null;
      const askTok = it.kind !== 'person' && it.q ? it.q.find(t => /(くん|さん)(は|の)$/.test(t)) : null;
      const asked = askTok ? askTok.replace(/(は|の)$/, '') : null;
      for (let i = 0; i + 1 < flat.length; i++) {
        const m = flat[i].match(/^(.+)の$/);
        if (!m || !WORDS.includes(m[1])) continue;
        const w = m[1], X = flat[i + 1].replace(/は$/, '');
        if (!/(くん|さん)$/.test(X)) continue; // pronoun その子 replaced the owner
        const g = X.endsWith('くん') ? 'kun' : 'san'; const gb = gbase[g]; if (ansLabel !== null) { gb.ansN++; if (ansLabel === X) gb.ans++; } if (asked !== null) { gb.askN++; if (asked === X) gb.ask++; }
        const r = st[w]; r.n++;
        if (X.endsWith('くん')) r.kun++; else r.san++;
        if ((KUN.has(w) && !X.endsWith('くん')) || (SAN.has(w) && !X.endsWith('さん'))) genderViolations++;
        if (['さいとくん', 'ゆうとくん', 'しょうたくん', 'ゆきこさん'].includes(X)) r.fam++;
        if (ansLabel !== null) { r.ansN++; base.ansN++; if (ansLabel === X) { r.ans++; base.ans++; } }
        if (asked !== null) { r.askN++; base.askN++; if (asked === X) { r.ask++; base.ask++; } }
      }
    }
  }
}
const f = (a, b) => (b ? (a / b).toFixed(3) : '-');
console.log(`all h10 owners: answer rate ${f(base.ans, base.ansN)} (n=${base.ansN}), asked rate ${f(base.ask, base.askN)} (n=${base.askN}); gender mismatches ${genderViolations}`);
for (const g of ['kun', 'san']) console.log(`${g} owners: answer ${f(gbase[g].ans, gbase[g].ansN)} asked ${f(gbase[g].ask, gbase[g].askN)}`);
console.log('word\tuses\tshare\towner=answer\towner=asked\tfamily owner\tkun/san');
const tot = WORDS.reduce((a, w) => a + st[w].n, 0);
for (const w of WORDS) { const r = st[w]; console.log(`${w}\t${r.n}\t${f(r.n, tot)}\t${f(r.ans, r.ansN)}\t${f(r.ask, r.askN)}\t${f(r.fam, r.n)}\t${r.kun}/${r.san}`); }
