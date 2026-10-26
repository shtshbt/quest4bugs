'use strict';
// Summarise audit.js output (11 章). usage: node summary.js out.json
// Stage A and stage B composites follow 10.1: for each format, the best enemy of the stage on that format,
// weighted by the number of problems of the format. Lv1 and 2 leave out the type-name enemies (R3, Bnamed, Bsetns)
// and, from v0.4.5, the look enemies Bshape and Bshape0 (the shape tells the type, which the screen shows).
const fs = require('fs');
const o = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const NAMED = new Set(['R3', 'Bnamed', 'Bsetns', 'Bshape', 'Bshape0']);
const stageOf = (n, lv) => { if (n.startsWith('L') || n.startsWith('R')) return 'R'; if (lv <= 2 && NAMED.has(n)) return 'R'; return n[0] === 'A' ? 'A' : 'B'; };
const rows = [];
for (const [lv, r] of Object.entries(o.lv)) {
  const L = +lv; const acc = r.acc; const fm = Object.keys(r.cntF); let tot = 0, cA = 0, cAB = 0; const bestA = [null, -1], bestB = [null, -1];
  for (const f of fm) {
    const ks = Object.keys(acc).filter(k => k.startsWith(f + ':')).map(k => [k.split(':')[1], acc[k]]);
    const a = ks.filter(([n]) => stageOf(n, L) === 'A'), b = ks.filter(([n]) => stageOf(n, L) !== 'R');
    const ma = Math.max(...a.map(x => x[1])), mb = Math.max(...b.map(x => x[1]));
    cA += ma * r.cntF[f]; cAB += mb * r.cntF[f]; tot += r.cntF[f];
    for (const [n, v] of a) if (v > bestA[1]) { bestA[0] = f + ':' + n; bestA[1] = v; }
    for (const [n, v] of ks.filter(([n]) => stageOf(n, L) === 'B')) if (v > bestB[1]) { bestB[0] = f + ':' + n; bestB[1] = v; }
  }
  const pairB = Object.entries(acc).filter(([k]) => k.includes('pairAll:') && stageOf(k.split(':')[1], L) === 'B').sort((x, y) => y[1] - x[1])[0];
  const pair2B = Object.entries(acc).filter(([k]) => k.includes('pair2:') && stageOf(k.split(':')[1], L) === 'B').sort((x, y) => y[1] - x[1])[0];
  const rec = Object.entries(acc).filter(([k]) => !k.includes('pair') && stageOf(k.split(':')[1], L) === 'R').sort((x, y) => y[1] - x[1]).slice(0, 3);
  const w = Object.entries(r.rule6 || {}).sort((x, y) => y[1] - x[1])[0];
  rows.push({ lv: L, bestA: bestA[0] + ' ' + bestA[1], compA: +(cA / tot).toFixed(3), bestB: bestB[0] + ' ' + bestB[1], compAB: +(cAB / tot).toFixed(3), pairAllB: pairB ? pairB[0] + ' ' + pairB[1] : null, pair2B: pair2B ? pair2B[0] + ' ' + pair2B[1] : null, wordMax: w ? w.join(' ') : null, rec: rec.map(x => x.join(' ')).join(', '), fixedShareF2: r.fixedShareF2, uniq: r.sig.uniq8 });
}
for (const x of rows) console.log(JSON.stringify(x));
