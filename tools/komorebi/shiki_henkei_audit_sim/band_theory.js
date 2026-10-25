// Verification 13 (2) and (3) for the both-sides items, v0.3.6.
// Computes the theoretical band distributions exactly from the generator procedure (3.10 single draw,
// and the P1 pair procedure of 3.6), then measures the generator and compares.
// (2) each type's band distribution inside a group is compared with that type's exact theory, within
//     max(0.03, 4 * sqrt(p (1 - p) / n)); the exact theory itself differs between types by at most 0.001.
// (3) the pooled distribution of each group is compared with the exact theory including P1, within 0.03.
// Usage: node band_theory.js [sets per Lv, default 2000] [Lv list, default 3,...,9] [seed base]
//        (exit 1 when a check fails)
'use strict';
const G = require('./gen3.js');
const OPT = { sumcap: true, near: true, p1redraw: true, sfp: 0.5 };
G.setOpt(OPT);
const SETS = Number(process.argv[2] || 2000);
const SEED = Number(process.argv[4] || 9000);
const TYPES = ['T_AB', 'T_AF', 'T_SB', 'T_SF'], RATIO = [0.03, 0.26, 0.43, 0.28];
const SFP = 0.5;
const bandA = a => (a <= 29 ? 0 : a <= 39 ? 1 : 2);
const bandD = d => (d <= 4 ? 0 : d <= 7 ? 1 : 2);
const bandS = s => (s <= 59 ? 0 : s <= 74 ? 1 : 2);
const grp = (a, b, c) => (a > b + c ? 'big' : 'small'); // big: a > b + c, small: a < b + c

// (type, trap) variants with their probabilities (4.2: type ratio, T_SF trap 1/2)
const VARIANTS = [];
TYPES.forEach((t, i) => { if (t === 'T_SF') { VARIANTS.push([t, false, RATIO[i] * (1 - SFP)]); VARIANTS.push([t, true, RATIO[i] * SFP]); } else VARIANTS.push([t, false, RATIO[i]]); });

// single draw (3.10): a uniform 20..45, d uniform 2..10, b uniform 2..R-2, rejected unless valid
const SINGLE = new Map();
function single(t, big) {
  const k = `${t}${big}`; if (SINGLE.has(k)) return SINGLE.get(k);
  const bigA = t === 'T_SB' || big; const out = []; let z = 0;
  for (let a = 20; a <= 45; a++) for (let d = 2; d <= 10; d++) {
    const R = bigA ? a - d : a + d;
    for (let b = 2; b <= R - 2; b++) { const c = R - b; if (G.bothValid(t, a, b, c, big)) { const w = 1 / (26 * 9 * (R - 3)); out.push([a, b, c, w]); z += w; } }
  }
  out.forEach(x => { x[3] /= z; }); SINGLE.set(k, out); return out;
}
// feasible a for the second P1 item with b, c fixed (3.6: a drawn uniformly from these)
function feasA(t, big, b, c) { const r = []; for (let a = 20; a <= 45; a++) if (G.bothValid(t, a, b, c, big)) r.push(a); return r; }

// theory accumulator: role -> group -> {type -> [bandsA, bandsD, bandsS], all -> ...}
function emptyAcc() { return { big: {}, small: {} }; }
function add(acc, t, a, b, c, w) {
  const g = grp(a, b, c), d = Math.abs(a - (b + c)), s = a + b + c;
  for (const key of [t, 'all']) {
    const e = acc[g][key] || (acc[g][key] = { n: 0, A: [0, 0, 0], D: [0, 0, 0], S: [0, 0, 0] });
    e.n += w; e.A[bandA(a)] += w; e.D[bandD(d)] += w; e.S[bandS(s)] += w;
  }
}
function theorySingle() {
  const acc = emptyAcc();
  for (const [t, big, p] of VARIANTS) for (const [a, b, c, w] of single(t, big)) add(acc, t, a, b, c, p * w);
  return acc;
}
// P1 pair: item 1 from the single draw; item 2 a uniform in feasA; the pair is redrawn when item 2
// has no feasible a or has the same text as item 1 (same type, trap, orientation and a)
function theoryP1(lv) {
  const acc1 = emptyAcc(), acc2 = emptyAcc();
  const pr = lv >= 7 ? 0.5 : lv === 6 ? 1 : 0; const pSameO = pr * pr + (1 - pr) * (1 - pr);
  for (const [t1, b1, p1] of VARIANTS) for (const [t2, b2, p2] of VARIANTS) {
    let z = 0; const items = [];
    for (const [a, b, c, w] of single(t1, b1)) {
      const S = feasA(t2, b2, b, c); if (!S.length) continue;
      for (const a2 of S) {
        const same = t1 === t2 && b1 === b2 && a2 === a;
        const wt = w / S.length * (same ? 1 - pSameO : 1); // same text only when the orientation matches too
        if (wt > 0) { items.push([a, b, c, a2, wt]); z += wt; }
      }
    }
    // types, traps and orientations are drawn first and kept, so each (t1, t2) has weight p1 * p2
    for (const [a, b, c, a2, wt] of items) { add(acc1, t1, a, b, c, p1 * p2 * wt / z); add(acc2, t2, a2, b, c, p1 * p2 * wt / z); }
  }
  return [acc1, acc2];
}
function merge(parts) { // parts: [acc, weight]
  const out = emptyAcc();
  for (const [acc, k] of parts) for (const g of ['big', 'small']) for (const [key, e] of Object.entries(acc[g])) {
    const o = out[g][key] || (out[g][key] = { n: 0, A: [0, 0, 0], D: [0, 0, 0], S: [0, 0, 0] });
    o.n += k * e.n; for (const f of ['A', 'D', 'S']) for (let i = 0; i < 3; i++) o[f][i] += k * e[f][i];
  }
  return out;
}
const norm = e => ({ A: e.A.map(x => x / e.n), D: e.D.map(x => x / e.n), S: e.S.map(x => x / e.n) });
const f3 = v => v.map(x => x.toFixed(4)).join('/');

let failed = 0;
const lvs = process.argv[3] ? process.argv[3].split(',').map(Number) : [3, 4, 5, 6, 7, 8, 9];
for (const lv of lvs) {
  const ts = theorySingle();
  let thAll = ts, thNo2 = ts;
  if (lv === 8 || lv === 9) { const [p1a, p1b] = theoryP1(lv); thAll = merge([[ts, 3], [p1a, 1], [p1b, 1]]); thNo2 = merge([[ts, 3], [p1a, 1]]); }
  // measurement
  const meas = { all: emptyAcc(), no2: emptyAcc(), noP1: emptyAcc() };
  const rng = G.mulberry32(SEED + lv);
  for (let s = 0; s < SETS; s++) {
    const set = G.buildSet(lv, rng, OPT);
    set.forEach((p, k) => {
      if (p.fam !== 'both') return;
      const { a, b, c } = p.abc;
      add(meas.all, p.type, a, b, c, 1);
      const second = p.pairId && k > 0 && set[k - 1].pairId;
      if (!second) add(meas.no2, p.type, a, b, c, 1);
      if (!p.pairId) add(meas.noP1, p.type, a, b, c, 1);
    });
  }
  for (const g of ['small', 'big']) {
    const M = norm(meas.all[g].all), T = norm(thAll[g].all), Ts = norm(ts[g].all), M2 = norm(meas.no2[g].all), T2 = norm(thNo2[g].all);
    const dev = (x, y) => Math.max(...['A', 'D', 'S'].flatMap(f => x[f].map((v, i) => Math.abs(v - y[f][i]))));
    // (2): within the group, type-wise distributions differ by at most 0.03 (types with at least 300 items)
    const typesIn = Object.keys(meas.all[g]).filter(k => k !== 'all');
    let d2 = 0, ok2 = true;
    for (const x of typesIn) {
      const m = meas.all[g][x], mt = norm(m), tt = norm(thAll[g][x]);
      for (const f of ['A', 'D', 'S']) for (let i = 0; i < 3; i++) {
        const tol = Math.max(0.03, 4 * Math.sqrt(tt[f][i] * (1 - tt[f][i]) / m.n)); const e = Math.abs(mt[f][i] - tt[f][i]);
        d2 = Math.max(d2, e); if (e > tol) ok2 = false;
      }
    }
    const d3all = dev(M, T), d3single = dev(M, Ts), d3no2 = dev(M2, T2), d3no2single = dev(M2, Ts);
    let t2max = 0; const tk = Object.keys(thAll[g]).filter(k => k !== 'all');
    for (const x of tk) for (const y of tk) t2max = Math.max(t2max, dev(norm(thAll[g][x]), norm(thAll[g][y])));
    const ok3 = d3all <= 0.03;
    if (!ok2 || !ok3) failed++;
    console.log(`Lv${lv} ${g}: n=${meas.all[g].all.n} aBand meas ${f3(M.A)} theoryP1 ${f3(T.A)} theory3.10 ${f3(Ts.A)} | sum meas ${f3(M.S)} theoryP1 ${f3(T.S)} | (3) dev vs P1-incl ${d3all.toFixed(3)} vs 3.10-only ${d3single.toFixed(3)}; drop 2nd: vs P1-incl ${d3no2.toFixed(3)} vs 3.10-only ${d3no2single.toFixed(3)} | (2) theory type diff ${t2max.toFixed(3)} meas vs type theory ${d2.toFixed(3)} [${typesIn.join(',')}] ${ok2 && ok3 ? 'OK' : 'FAIL'}`);
  }
}
process.exit(failed ? 1 : 0);
