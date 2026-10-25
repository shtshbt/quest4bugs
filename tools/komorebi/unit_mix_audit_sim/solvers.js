'use strict';
const G = require('./gen.js');
const { rd, eq, isInt, opApply, rev, conclOf, INT_DOWN, DEC_DOWN, DEC_UP, SPD_INT, FRAC, B_INT, B_DEC, UP_SMALL } = G;

// ---------- shared pickers ----------
const numVal = (q, p, op, f) => rd(p.asm(opApply(p.v, op, f)));
function rsPick(q, op, f) { const i = q.opts.findIndex(o => o.op === op && eq(o.n, f)); return i < 0 ? 0 : i; }
function cmpIdx(q, concl) { return concl === 'same' ? 2 : concl === 'big' ? q.bigIdx : q.smallIdx; }
function cmpPick(q, op, f) { return cmpIdx(q, G.cmpConcl(q, op, f)); }
function texpPick(q, op, f) {
  if (q.form === 'comp') {
    if (op !== '÷') return 0;
    const h = Math.floor(q.X / f), m = rd(q.X - h * f);
    const i = q.opts.findIndex(o => o.h === h && eq(o.m, m)); return i < 0 ? 0 : i;
  }
  const v = rd(opApply(q.X, op, f)); const i = q.opts.findIndex(o => eq(o.val, v)); return i < 0 ? 0 : i;
}
const optIdx = (q, label) => { const i = q.opts.indexOf(label); return i < 0 ? 0 : i; };
// generic "do the key conversion with (op, f)" answer, returns correctness
function judgeWith(q, op, f) {
  switch (q.pattern) {
    case 'rate_select': return rsPick(q, op, f) === q.ansIdx;
    case 'compare': return cmpPick(q, op, f) === q.ansIdx;
    case 'time_express': return texpPick(q, op, f) === q.ansIdx;
    default: return eq(numVal(q, q.paths[0], op, f), q.ans);
  }
}
function rawCorrect(q) {
  switch (q.pattern) {
    case 'compare': return cmpIdx(q, conclOf(q.vb, q.vs)) === q.ansIdx;
    case 'rate_select': case 'time_express': return q.ansIdx === 0;
    case 'diagnosis': return q.label === 'correct';
    default: return eq(q.raw, q.ans);
  }
}
const mant = x => { let y = Math.abs(x); while (y >= 10) y /= 10; while (y < 1) y *= 10; return rd(y); };

// ---------- stage A ----------
function A1(q) { return rawCorrect(q); }
function A2(c) {
  return (q) => {
    if (q.pattern === 'diagnosis') {
      const s = q.src; const own = s.pattern === 'compare' ? G.cmpConcl(s, '×', c) : numVal(s, s.paths[0], '×', c);
      const same = s.pattern === 'compare' ? own === q.value : eq(own, q.value);
      return (same ? optIdx(q, 'correct') : 0) === q.ansIdx;
    }
    if (q.pattern === 'time_express' && c === 100) return q.opts.findIndex(o => o.t === 'sixty') === q.ansIdx;
    return judgeWith(q, '×', c);
  };
}
function A4(q, hist) {
  const prev = hist[hist.length - 1];
  let op = '×', f = 100;
  if (prev) { const p = (prev.pattern === 'diagnosis' ? prev.src : prev).paths[0]; op = p.op; f = p.f; }
  if (q.pattern === 'diagnosis') {
    const s = q.src; const own = s.pattern === 'compare' ? G.cmpConcl(s, op, f) : numVal(s, s.paths[0], op, f);
    const same = s.pattern === 'compare' ? own === q.value : eq(own, q.value);
    return (same ? optIdx(q, 'correct') : 0) === q.ansIdx;
  }
  return judgeWith(q, op, f);
}
function A5(k) {
  return (q) => {
    if (q.kind === 'choice') return (q.pattern === 'compare' ? Math.min(k, 3) - 1 : k - 1) === q.ansIdx;
    return judgeWith(q, '×', 100);
  };
}
function A6(q) { return q.pattern === 'compare' ? q.bigIdx === q.ansIdx : A1(q); }
function A7(q) { return q.pattern === 'compare' ? q.ansIdx === 2 : A1(q); }
function A10(q, hist) { // copy the given number of the previous question
  const prev = hist[hist.length - 1];
  if (q.kind === 'choice') return q.ansIdx === 0;
  if (!prev) return A1(q);
  const pv = (prev.pattern === 'diagnosis' ? prev.src : prev).gv;
  return eq(pv, q.ans);
}
function A12(q) { // compare by digit pattern (mantissa), ignore zeros and decimal point
  if (q.pattern !== 'compare') return A1(q);
  const a = mant(q.vb), b = mant(q.vs); return cmpIdx(q, eq(a, b) ? 'same' : a > b ? 'big' : 'small') === q.ansIdx;
}
function A13(q) { // diagnosis keyword: time -> sixty, speed -> direction, decimal -> steps
  if (q.pattern !== 'diagnosis') return A1(q);
  const l = q.domain === 'time' ? 'sixty' : q.domain === 'speed' ? 'direction' : 'steps';
  return optIdx(q, l) === q.ansIdx;
}
function A14(q) { // diagnosis: formula has no multiplier -> not_aligned, else correct
  if (q.pattern !== 'diagnosis') return A1(q);
  return optIdx(q, q.raw ? 'not_aligned' : 'correct') === q.ansIdx;
}

// A8: multiplier read from the look of the unit symbol, direction ignored
const UNIT_OF = { convert: q => [q.from, q.to], rate_select: q => [q.from, q.to], recall: q => [q.from, q.to] };
let LOOK_STRICT = false;
function lookF(us) {
  if (us.some(u => u === '時間' || u === '分' || u === '秒' || u === '分速m')) return 60;
  if (us.some(u => u.startsWith('k') || u === '時速km')) return 1000;
  if (!LOOK_STRICT && us.some(u => u === 'mm' || u === 'mL')) return 1000;
  if (us.some(u => u.startsWith('c'))) return 100;
  return LOOK_STRICT ? 1 : 100;
}
function A8s(q) { LOOK_STRICT = true; const r = A8(q); LOOK_STRICT = false; return r; }
function A8(q) {
  const p = q.paths ? q.paths[0] : null;
  if (q.pattern === 'diagnosis') return q.label === 'correct';
  let us = UNIT_OF[q.pattern] ? UNIT_OF[q.pattern](q) : q.pattern === 'compare' ? [q.bigU, q.smallU] : q.pattern === 'compound_in' ? [q.from, q.to] : q.pattern === 'time_express' ? ['分'] : (q.cpair ? ['分'] : q.domain === 'time' ? ['分'] : q.rel ? [G.REL1.find(r => r.id === q.rel).small] : ['m']);
  if (q.pattern === 'speed_apply') us = q.paths[0].kd === 'time' ? ['分'] : ['km'];
  return judgeWith(q, '×', lookF(us));
}
// A9: choose the option holding the largest number
function A9(q) {
  if (q.pattern === 'rate_select') { let bi = 0; q.opts.forEach((o, i) => { if (o.n > q.opts[bi].n) bi = i; }); return bi === q.ansIdx; }
  if (q.pattern === 'time_express') { const val = o => (o.val !== undefined ? o.val : o.h + o.m / 60); let bi = 0; q.opts.forEach((o, i) => { if (val(o) > val(q.opts[bi])) bi = i; }); return bi === q.ansIdx; }
  return A1(q);
}

// ---------- stage B ----------
function B1(q, hist, R) { if (q.pattern !== 'rate_select') return A1(q); const n = R() < 0.5 ? q.f : q.g; return rsPick(q, '×', n) === q.ansIdx; }
function B2(q, hist, R) {
  if (q.pattern !== 'compare') return A1(q);
  const seen = new Set(hist.map(h => (h.pattern === 'diagnosis' ? h.src : h)).filter(h => h.pattern === 'compare').map(h => h.concl));
  const order = ['small', 'big', 'same'].filter(c => !seen.has(c));
  const c = order.length ? (seen.size === 0 ? 'small' : order[Math.floor(R() * order.length)]) : 'small';
  return cmpIdx(q, c) === q.ansIdx;
}
function B3(prior) {
  return (q, hist, R, lv) => {
    if (q.pattern !== 'diagnosis') return A1(q);
    const key = lv + '|' + q.src.pattern + '|' + q.src.domain; const tab = prior[key] || {};
    const best = q.opts.slice().sort((a, b) => (tab[b] || 0) - (tab[a] || 0))[0];
    return q.opts.indexOf(best) === q.ansIdx;
  };
}
function nearPair(q) {
  if (q.form === 'comp') {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j && q.opts[i].h === q.opts[j].h && Math.abs(q.opts[i].m - q.opts[j].m) === 10) return [i, j];
  } else for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j && eq(q.opts[j].val - q.opts[i].val, 0.5)) return [i, j]; // i smaller
  return null;
}
function B4(q, hist, R) { if (q.pattern !== 'time_express') return A1(q); const p = nearPair(q); if (!p) return q.ansIdx === 0; return p[R() < 0.5 ? 0 : 1] === q.ansIdx; }
function B4s(q, hist, R) { // smaller of the near pair; comp case random
  if (q.pattern !== 'time_express') return A1(q); const p = nearPair(q); if (!p) return q.ansIdx === 0;
  if (q.form === 'comp') return p[R() < 0.5 ? 0 : 1] === q.ansIdx; return p[0] === q.ansIdx;
}
// B5: rule-omniscient, knows that time and speed are base 60 (3.1 table column), does not know which power of ten belongs to which decimal pair.
const DOWNSET = new Set([...B_INT, ...B_DEC, ...SPD_INT, ...FRAC.map(f => rd(f[0] / f[1]))]); // v0.2 band
function inferDir(q) { if (q.frac) return 'down'; return DOWNSET.has(rd(q.gv)) ? 'down' : 'up'; }
const P10 = [10, 100, 1000, 10000, 100000, 1000000];
function upFactor(q, cands) {
  const qs = q.form === 'int' ? (q.rel === 'R17' ? SPD_INT : B_INT) : [...B_DEC, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.2, 0.3, 0.4, 0.6, 0.7, 0.9, 0.1, 0.15];
  for (const f of cands || [10, 100, 1000, 10000, 100000, 1000000]) if (qs.some(x => eq(x, rd(q.gv / f)))) return f;
  return null;
}
function ratioF(q, cands) {
  for (const f of cands || P10) {
    const r = q.vs / (q.vb * f); if ((r >= 0.5 - 1e-9 && r <= 0.9 + 1e-9) || eq(r, 1) || (r >= 1.1 - 1e-9 && r <= 1.5 + 1e-9) || (r >= 8 - 1e-9 && r <= 12 + 1e-9) || (r >= 0.08 - 1e-9 && r <= 0.12 + 1e-9)) return f;
  }
  return null;
}
function B5(cDown, diagDefault, know60 = true, order = 'p10') {
  const known = p => (know60 && (p.kd === 'time' || p.kd === 'speed') ? p.f : null);
  const UPC = know60 ? null : (order === 'p10' ? [10, 100, 1000, 10000, 100000, 1000000, 3.6, 60, 3600] : [3.6, 60, 3600, 10, 100, 1000, 10000, 100000, 1000000]);
  const upF = q => upFactor(q, UPC);
  const ratF = q => ratioF(q, UPC);
  function decide(q) { // returns {op, f}
    const p = q.paths[0];
    if (q.pattern === 'convert' || q.pattern === 'rate_select') {
      const dir = inferDir(q); const op = dir === 'down' ? '×' : '÷';
      let f = known(p);
      if (f === null && q.pattern === 'rate_select') {
        const ns = [...new Set(q.opts.map(o => o.n))];
        if (ns.includes(60)) f = ns.find(n => n !== 60);
        else if (op === '÷') f = upFactor(q, ns.slice().sort((a, b) => a - b));
        if (f === null || f === undefined) f = ns.slice().sort((a, b) => Math.abs(Math.log10(a / cDown)) - Math.abs(Math.log10(b / cDown)))[0];
      }
      if (f === null) f = op === '÷' ? (upF(q) || cDown) : cDown;
      return { op, f };
    }
    if (q.pattern === 'compare') { const f = known(p) || ratF(q) || cDown; return { op: p.op, f }; } // v0.2.3: the aligned unit is named in the item
    if (q.pattern === 'speed_apply') return { op: p.op, f: known(p) || cDown }; // the operation follows from 1 秒で / 1 分で (approved as learning content)
    if (q.pattern === 'align_calc') { const op = inferDir(q) === 'down' ? '×' : '÷'; return { op, f: known(p) || cDown }; } // v0.2.2: align_calc has both directions; infer from the value band, not from the answer
    return { op: p.op, f: known(p) || cDown };
  }
  return (q) => {
    if (q.pattern === 'diagnosis') {
      const s = q.src, p = s.paths[0]; let l;
      if (q.raw) l = 'not_aligned';
      else if (!q.arithOK) l = 'calc';
      else if ((p.kd === 'time' || p.kd === 'speed') && (q.shownF === 100 || q.shownF === 10000)) l = 'sixty';
      else if (p.kd === 'time' && q.shownF === 1000) l = 'other_domain';
      else if (p.kd === 'dec' && q.shownF === 60) l = 'other_domain';
      else {
        const exp = s.pattern === 'convert' ? decide(s) : { op: p.op, f: known(p) };
        if (q.shownOp !== exp.op) l = 'direction';
        else {
          let f = known(p);
          if (f === null && s.pattern === 'convert' && exp.op === '÷') f = upF(s);
          if (f === null && s.pattern === 'compare') f = ratF(s);
          if (f === null) l = diagDefault; else l = eq(q.shownF, f) ? 'correct' : 'steps';
        }
      }
      return optIdx(q, l) === q.ansIdx;
    }
    const { op, f } = decide(q);
    return judgeWith(q, op, f);
  };
}
function B6(c) { // magnitude decides direction, fixed multiplier (table-blind, two cues)
  return (q) => {
    if (q.pattern === 'diagnosis' || q.pattern === 'compare') return A1(q);
    const p = q.paths[0]; return judgeWith(q, p.v >= 10 ? '÷' : '×', c);
  };
}

// ---------- misconception probes (table known, one error) ----------
function m2NonInt(p) { return (p.kd === 'time' || (p.kd === 'speed' && p.f === 60)) && (!isInt(p.v) || p.comp || (p.op === '÷' && !isInt(p.v / p.f))); }
const BELIEF = {
  TRUE: p => ({ op: p.op, f: p.f }),
  M1: p => ({ op: '×', f: p.f }),
  M2: p => ({ op: p.op, f: m2NonInt(p) ? G.sixtyF(p.f) : p.f }),
  M3: p => ({ op: p.kd === 'speed' ? rev(p.op) : p.op, f: p.f }),
  M1mag: p => ({ op: p.v >= 10 ? '÷' : '×', f: p.f }),
  M1magR: p => ({ op: p.v >= 10 ? '×' : '÷', f: p.f }),
  M1d: p => ({ op: '÷', f: p.f }), // v0.2.1 (C7): the reverse of M1 (always divide); its traps are the down items // v0.2.1 (C7): the reverse of M1mag, learnable when band and direction correlate
};
function probeOwn(q, b) { // returns {val, correct}
  if (q.pattern === 'compare') { const x = b(q.paths[0]); const c = G.cmpConcl(q, x.op, x.f); return { val: c, correct: c === q.concl }; }
  let first = null;
  for (const p of q.paths) { const x = b(p); const v = rd(p.asm(opApply(p.v, x.op, x.f))); if (first === null) first = v; if (eq(v, q.ans)) return { val: v, correct: true }; }
  return { val: first, correct: false };
}
function probe(name) {
  const b = BELIEF[name];
  return (q, hist, R) => {
    if (q.pattern === 'diagnosis') {
      const own = probeOwn(q.src, b);
      const same = q.src.pattern === 'compare' ? own.val === q.value : eq(own.val, q.value);
      let i;
      if (same) i = optIdx(q, 'correct');
      else if (own.correct) i = q.ansIdx;
      else if (q.raw && q.opts.includes('not_aligned')) i = optIdx(q, 'not_aligned');
      else if (!q.arithOK && q.opts.includes('calc')) i = optIdx(q, 'calc');
      else { const c = q.opts.map((l, k) => k).filter(k => q.opts[k] !== 'correct'); i = c[Math.floor(R() * c.length)]; }
      return i === q.ansIdx;
    }
    if (q.pattern === 'rate_select' || q.pattern === 'time_express') { const x = b(q.paths[0]); return judgeWith(q, x.op, x.f); }
    return probeOwn(q, b).correct;
  };
}

// v0.2 validator: does probe `name` fail item q for certain (diagnosis counted only when the failure is deterministic)
function probeFails(name, q) {
  const b = BELIEF[name];
  // v0.2 (4.3 の 1): a diagnosis counts as a trap when the probe cannot solve its source problem.
  // The count does not depend on the shown sheet, so the share of correct sheets is not skewed by the rejection.
  if (q.pattern === 'diagnosis') return !probeOwn(q.src, b).correct;
  // v0.2: a probe whose operation is not among the options fails (no default to position 1)
  if (q.pattern === 'rate_select') { const x = b(q.paths[0]); const i = q.opts.findIndex(o => o.op === x.op && eq(o.n, x.f)); return i !== q.ansIdx; }
  if (q.pattern === 'time_express') { const x = b(q.paths[0]); if (x.op !== '÷' || !eq(x.f, 60)) return true; return !judgeWith(q, x.op, x.f); }
  if (q.pattern === 'recall') { const x = b(q.paths[0]); return !judgeWith(q, x.op, x.f); }
  return !probeOwn(q, b).correct;
}
// ---------- v0.2.1 enemies (C5, C6, C7) ----------
// B8 (C5): time_express shape. Drop the option equal to X / 100 and the largest option, then pick one of the remaining two.
function B8(q, hist, R) {
  if (q.pattern !== 'time_express') return A1(q);
  const val = o => (o.val !== undefined ? o.val : o.h * 100 + o.m);
  let idx = [0, 1, 2, 3];
  if (q.form === 'comp') idx = idx.filter(i => !(q.opts[i].h === Math.floor(q.X / 100) && q.opts[i].m === q.X % 100) && !(q.opts[i].h === Math.floor(q.X / 10)));
  else { const mx = Math.max(...q.opts.map(val)); idx = idx.filter(i => !eq(q.opts[i].val, q.X / 100) && !eq(val(q.opts[i]), mx)); }
  if (!idx.length) return q.ansIdx === 0;
  return idx[Math.floor(R() * idx.length)] === q.ansIdx;
}
// B9 (C6): pair constraint. On the second item of a contrast pair, reuse the factor shown by the first answer;
// the direction is the reverse of the first (CP2 and Lv8) or the same (CP1).
function B9(q, hist, R, lv) {
  const prev = hist[hist.length - 1];
  if (!q.pairWithPrev || !prev || !prev.paths || !q.paths) return A1(q);
  const p0 = prev.paths[0]; const f = p0.f; const op = (lv === 3 || lv === 8) ? rev(p0.op) : p0.op;
  return judgeWith(q, op, f);
}
// E7 (C7): the conversion table plus the majority direction of the cell (Lv, pattern, domain, band) learned from generated sets.
function E7(table) {
  return (q, hist, R, lv) => {
    const b = q.pattern === 'diagnosis' ? q.src : q;
    if (!b.paths) return probe('TRUE')(q, hist, R, lv);
    const p = b.paths[0]; const key = [lv, b.pattern, b.domain, p.v >= 10 ? 'big' : 'small'].join('|');
    const t = table[key]; const dir = t ? (t.up >= t.down ? 'up' : 'down') : (p.op === '÷' ? 'up' : 'down');
    const op = dir === 'up' ? '÷' : '×';
    const belief = pp => ({ op: pp === p ? op : pp.op, f: pp.f });
    if (q.pattern === 'diagnosis') { const own = probeOwn(b, belief); return own.correct ? true : q.label === 'correct' ? false : R() < 1 / 3; }
    if (q.pattern === 'rate_select' || q.pattern === 'time_express') return judgeWith(q, op, p.f);
    return probeOwn(q, belief).correct;
  };
}
module.exports = { B8, B9, E7, probeFails, A8, A8s, A9, A1, A2, A4, A5, A6, A7, A10, A12, A13, A14, B1, B2, B3, B4, B4s, B5, B6, probe };
