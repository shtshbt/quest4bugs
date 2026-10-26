#!/usr/bin/env node
// Enemy solvers of 10.2 章, run on the sets of strict_gen.js (checks 25, 29, 30, 31 of strict_check.js).
// The model and the solvers are the ones the Phase 7 independent check wrote from the doc text only
// (docs/komorebi_unit_mix_phase7_v0_2_3.md 7 章), copied here unchanged except for the value bands, which are read
// from 9.2 章 through strict_gen.js. B7 is that check's reading of 10.1 章, not the repo solvers.js.
//   node strict_enemies.js <dir of sets_<seed>_<lv>.json from strict_check.js>
// Each seed is measured with the other seed's sets as the training sets of B3 and E7.
'use strict';
const fs = require('fs');
const path = require('path');


const UNITS = {
  mm: { dom: 'length', s: 1e-3 }, cm: { dom: 'length', s: 1e-2 }, m: { dom: 'length', s: 1 }, km: { dom: 'length', s: 1e3 },
  g: { dom: 'weight', s: 1 }, kg: { dom: 'weight', s: 1e3 }, t: { dom: 'weight', s: 1e6 },
  'cm²': { dom: 'area', s: 1e-4 }, 'm²': { dom: 'area', s: 1 }, a: { dom: 'area', s: 1e2 }, ha: { dom: 'area', s: 1e4 }, 'km²': { dom: 'area', s: 1e6 },
  'cm³': { dom: 'volume', s: 1e-6 }, mL: { dom: 'volume', s: 1e-6 }, L: { dom: 'volume', s: 1e-3 }, 'm³': { dom: 'volume', s: 1 },
  '秒': { dom: 'time', s: 1 }, '分': { dom: 'time', s: 60 }, '時間': { dom: 'time', s: 3600 },
  '秒速m': { dom: 'speed', s: 1 }, '分速m': { dom: 'speed', s: 1 / 60 }, '時速km': { dom: 'speed', s: 5 / 18 }, '時速m': { dom: 'speed', s: 1 / 3600 },
};

function near(a, b) { return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }
function isInt(x) { return near(x, Math.round(x)); }
function decimals(x) { for (let d = 0; d <= 8; d++) { if (near(x * 10 ** d, Math.round(x * 10 ** d))) return d; } return 99; }
function digits(x) { return String(Math.floor(Math.abs(x) + 1e-9)).length; }
function inRange(x) { return x > 0 && digits(x) <= 6 && decimals(x) <= 2; }

// factor between two units of one domain, and direction of from -> to
function stepOf(x, from, to) {
  const a = UNITS[from], b = UNITS[to];
  if (!a || !b || a.dom !== b.dom) throw new Error(`bad step ${from}->${to}`);
  const big = a.s >= b.s ? a : b, small = a.s >= b.s ? b : a;
  let f = big.s / small.s; f = Math.round(f * 1e6) / 1e6;
  return { x, from, to, f, dom: a.dom, dir: a.s > b.s ? 'down' : (a.s < b.s ? 'up' : 'none') };
}

// --- procedures: map a step to a converted value -------------------------
function applyOp(x, f, op) { return op === 'x' ? x * f : x / f; }
function correctOp(st) { return st.dir === 'down' ? 'x' : '/'; }
function rev(op) { return op === 'x' ? '/' : 'x'; }
function timeNonInt(st) {
  const r = applyOp(st.x, st.f, correctOp(st));
  if (st.comp) return true;
  if (st.dom === 'time') return !isInt(st.x) || !isInt(r);
  if (st.dom === 'speed' && st.f === 60) return !isInt(st.x) || !isInt(r);
  return false;
}
// each procedure returns {op, f}
const PROCS = {
  correct: st => ({ op: correctOp(st), f: st.f }),
  M1: st => ({ op: 'x', f: st.f }),
  M1d: st => ({ op: '/', f: st.f }),
  M1mag: st => ({ op: st.x >= 10 ? '/' : 'x', f: st.f }),
  M1magR: st => ({ op: st.x >= 10 ? 'x' : '/', f: st.f }),
  M2: st => {
    let f = st.f;
    if (timeNonInt(st)) { if (f === 60) f = 100; else if (f === 3600) f = 10000; }
    return { op: correctOp(st), f };
  },
  M3: st => ({ op: st.dom === 'speed' ? rev(correctOp(st)) : correctOp(st), f: st.f }),
};

// --- solve a question with a procedure ------------------------------------
// q.kind: 'num' | 'choice'. Returns {val} for num, {opt: index or -1 (guess)} for choice.
function solveWith(q, pname, rng) {
  const P = PROCS[pname];
  const conv = st => { const r = P(st); return { v: applyOp(st.x, r.f, r.op), op: r.op, f: r.f }; };
  switch (q.pattern) {
    case 'recall': case 'convert': return { val: conv(q.step).v };
    case 'compound_in': { const r = conv(q.step); return { val: r.v + q.lower }; }
    case 'align_calc': { const r = conv(q.step); return { val: q.sign > 0 ? q.keep + r.v : (q.convFirst ? r.v - q.keep : q.keep - r.v) }; }
    case 'speed_apply': { const r = conv(q.step); return { val: q.combine(r.v) }; }
    case 'rate_select': {
      const r = P(q.step);
      const i = q.options.findIndex(o => o.op === r.op && near(o.f, r.f));
      return { opt: i };
    }
    case 'time_express': {
      const r = conv(q.step); // minutes -> hours
      let i;
      if (q.form === 'comp') {
        const H = Math.floor(q.step.x / (r.f === 100 ? 100 : 60)), Mi = q.step.x - H * (r.f === 100 ? 100 : 60);
        i = (r.op === '/' && (r.f === 60 || r.f === 100)) ? q.options.findIndex(o => o.H === H && o.M === Mi) : -1;
      } else i = q.options.findIndex(o => near(o.val, r.v));
      return { opt: i };
    }
    case 'compare': {
      const r = conv(q.step); // converts side q.convSide into the align unit
      const conv_ = r.v, other = q.otherVal;
      // conclusion as which side is larger
      let concl; if (near(conv_, other)) concl = 'same'; else concl = (conv_ > other) === true ? q.convSide : (q.convSide === 'L' ? 'R' : 'L');
      return { opt: q.options.indexOf(concl) };
    }
    case 'diagnosis': {
      const own = solveWith(q.src, pname, rng);
      const ownCorrect = isCorrect(q.src, own);
      const sameAsShown = q.src.kind === 'num' ? near(own.val, q.shown) : own.opt === q.shownOpt;
      let pick;
      if (sameAsShown) pick = q.options.indexOf('correct');
      else if (ownCorrect) pick = q.options.indexOf(q.label);
      else { const c = q.options.map((o, i) => i).filter(i => q.options[i] !== 'correct'); pick = c[Math.floor(rng() * c.length)]; }
      return { opt: pick, guess: !sameAsShown && !ownCorrect };
    }
  }
  throw new Error('unknown pattern ' + q.pattern);
}
function isCorrect(q, res) {
  if (q.kind === 'num') return near(res.val, q.ans);
  return res.opt === q.ansOpt;
}
// a procedure "fails" a question for trap counting: wrong or must guess (11.5, 4.3)
function fails(q, pname) {
  if (q.pattern === 'diagnosis') return !isCorrect(q.src, solveWith(q.src, pname, () => 0));
  const r = solveWith(q, pname, () => 0);
  if (q.kind === 'choice' && r.opt < 0) return true;
  return !isCorrect(q, r);
}
// accuracy draw with guessing
function answerWith(q, pname, rng) {
  const r = solveWith(q, pname, rng);
  if (q.kind === 'choice' && r.opt < 0) return Math.floor(rng() * q.options.length) === q.ansOpt;
  return isCorrect(q, r);
}


const SG = require('./strict_gen.js');
const BAND_B = [...SG.V.B_INT, ...SG.V.B_DEC];
const RATIOS = [10, 100, 1000, 10000, 60, 3600, 3.6, 100000, 1000000];

function withProc(q, fn, R) { PROCS.__s = fn; const r = solveWith(q, '__s', R); delete PROCS.__s; return r; }
function correctOf(q, r, R) {
  if (q.kind === 'num') return isCorrect(q, r);
  if (r.opt === undefined || r.opt < 0) return Math.floor(R() * q.options.length) === q.ansOpt;
  return r.opt === q.ansOpt;
}
function opt0(q) { return { opt: 0 }; }
// raw numeric answer (A1)
function rawNum(q) {
  switch (q.pattern) {
    case 'recall': case 'convert': return q.step.x;
    case 'compound_in': return Number(String(q.hi) + String(q.lo));
    case 'align_calc': return q.sign > 0 ? q.A.v + q.B.v : q.A.v - q.B.v;
    case 'speed_apply': return q.combine(q.step.x);
  }
  return NaN;
}
function rawCompare(q) { // larger raw number
  const L = q.L.v, Rv = q.R.v; return { opt: near(L, Rv) ? 2 : (L > Rv ? 0 : 1) };
}
const numberIn = s => { const m = String(s).match(/[\d.]+/g); return m ? Math.max(...m.map(Number)) : -Infinity; };
const LABEL_NUM = { correct: -1, direction: -1, steps: 10, sixty: 100, other_domain: -1, not_aligned: -1 };

// a solver = (q, ctx, R) => boolean correct
function A1(q, ctx, R) {
  if (q.kind === 'num') return near(rawNum(q), q.ans);
  if (q.pattern === 'compare') return rawCompare(q).opt === q.ansOpt;
  if (q.pattern === 'diagnosis') return q.options[q.ansOpt] === 'correct';
  return q.ansOpt === 0;
}
const A2 = c => (q, ctx, R) => {
  const fn = st => ({ op: 'x', f: c });
  if (q.pattern === 'rate_select') { const i = q.options.findIndex(o => o.op === 'x' && near(o.f, c)); return (i < 0 ? 0 : i) === q.ansOpt; }
  if (q.pattern === 'time_express') { if (c !== 100) return q.ansOpt === 0; const r = withProc(q, st => ({ op: '/', f: 100 }), R); return correctOf(q, r, R); }
  if (q.pattern === 'compare') { const big = q.big === 'L' ? q.L : q.R, sm = q.big === 'L' ? q.R : q.L; const v = big.v * c; const concl = near(v, sm.v) ? 'same' : (v > sm.v ? q.big : (q.big === 'L' ? 'R' : 'L')); return q.options.indexOf(concl) === q.ansOpt; }
  if (q.pattern === 'diagnosis') return q.options[q.ansOpt] === 'correct';
  return correctOf(q, withProc(q, fn, R), R);
};
function mainOp(q) { const s = q.pattern === 'diagnosis' ? q.src.step : q.step; return { op: s.dir === 'down' ? 'x' : '/', f: s.f }; }
function A4(q, ctx, R) {
  const prev = ctx.i === 0 ? { op: 'x', f: 100 } : mainOp(ctx.items[ctx.i - 1]);
  if (q.pattern === 'rate_select') { const i = q.options.findIndex(o => o.op === prev.op && near(o.f, prev.f)); return (i < 0 ? 0 : i) === q.ansOpt; }
  if (q.pattern === 'diagnosis') return q.options[q.ansOpt] === 'correct';
  return correctOf(q, withProc(q, () => prev, R), R);
}
const A5 = k => (q, ctx, R) => {
  if (q.kind === 'choice') return Math.min(k, q.options.length) - 1 === q.ansOpt;
  return correctOf(q, withProc(q, st => ({ op: 'x', f: 100 }), R), R);
};
function A6(q, ctx, R) { if (q.pattern === 'compare') return q.options.indexOf(q.big) === q.ansOpt; return A1(q, ctx, R); }
function A7(q, ctx, R) { if (q.pattern === 'compare') return q.ansOpt === 2; return A1(q, ctx, R); }
function A9(q, ctx, R) {
  if (q.kind !== 'choice') return A1(q, ctx, R);
  let vals;
  if (q.pattern === 'rate_select') vals = q.options.map(o => o.f);
  else if (q.pattern === 'time_express') vals = q.options.map(o => (o.val !== undefined ? o.val : o.H * 100 + o.M));
  else if (q.pattern === 'compare') return rawCompare(q).opt === q.ansOpt;
  else vals = q.options.map(o => LABEL_NUM[o]);
  const mx = Math.max(...vals); return vals.indexOf(mx) === q.ansOpt;
}
function M(name) { return (q, ctx, R) => correctOf(q, solveWith(q, name, R), R); }
function B1(q, ctx, R) { if (q.pattern !== 'rate_select') return A1(q, ctx, R); const fs = [...new Set(q.options.map(o => o.f))]; const f = fs[Math.floor(R() * fs.length)]; return q.options.findIndex(o => o.op === 'x' && near(o.f, f)) === q.ansOpt; }
function B2(q, ctx, R) {
  if (q.pattern !== 'compare') return A1(q, ctx, R);
  const seen = ctx.items.slice(0, ctx.i).filter(x => x.pattern === 'compare').map(x => x.concl);
  const order = ['small', 'big', 'same'].filter(c => !seen.includes(c)); const c = order.length ? order[0] : 'small';
  const sideSmall = q.big === 'L' ? 'R' : 'L';
  const opt = c === 'same' ? 2 : q.options.indexOf(c === 'small' ? sideSmall : q.big);
  return opt === q.ansOpt;
}
function B3(q, ctx, R) { if (q.pattern !== 'diagnosis') return A1(q, ctx, R); const key = q.src.pattern + '.' + q.src.domain; const lab = ctx.prior[key]; const i = q.options.indexOf(lab); return (i < 0 ? 0 : i) === q.ansOpt; }
function B4(small) { return (q, ctx, R) => {
  if (q.pattern !== 'time_express') return A1(q, ctx, R);
  const v = q.options.map(o => (o.val !== undefined ? o.val * 60 : o.H * 60 + o.M)); const d = q.form === 'comp' ? 10 : 30;
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (near(Math.abs(v[a] - v[b]), d)) { const pickI = small ? (v[a] < v[b] ? a : b) : (R() < 0.5 ? a : b); return pickI === q.ansOpt; }
  return q.ansOpt === 0;
}; }
const B6 = c => (q, ctx, R) => {
  if (q.pattern === 'rate_select') { const op = q.step.x >= 10 ? '/' : 'x'; const i = q.options.findIndex(o => o.op === op && near(o.f, c)); return (i < 0 ? 0 : i) === q.ansOpt; }
  if (q.pattern === 'diagnosis' || q.pattern === 'compare' || q.pattern === 'time_express') return A1(q, ctx, R);
  return correctOf(q, withProc(q, st => ({ op: st.x >= 10 ? '/' : 'x', f: c }), R), R);
};
// B7: knows the 9.2 bands and the generation rules, not the conversion table
const inB = x => BAND_B.some(y => near(x, y));
function b7Dir(st) { return inB(st.x) || (st.dom === 'speed' && [...[1.5, 2, 2.5, 3, 4, 5, 6, 10, 12, 15, 20, 25]].some(y => near(y, st.x))) ? 'down' : 'up'; }
function b7Ratios(st, dir) {
  if (dir === 'up') {
    const ok = RATIOS.filter(r => { const v = st.x / r; return inB(v) || ((r === 10 || r === 100) && st.x >= 2 && st.x <= 9 && isInt(st.x)) || (r === 60 && (st.x === 6 || st.x === 9)); });
    return ok.length ? ok : RATIOS.filter(r => inRange(st.x / r));
  }
  return RATIOS.filter(r => inRange(st.x * r));
}
function B7(q, ctx, R, opt = {}) {
  const pickR = a => a[Math.floor(R() * a.length)];
  switch (q.pattern) {
    case 'convert': { const d = b7Dir(q.step); const r = pickR(b7Ratios(q.step, d)); return correctOf(q, withProc(q, () => ({ op: d === 'down' ? 'x' : '/', f: r }), R), R); }
    case 'rate_select': {
      const d = b7Dir(q.step); const fs = [...new Set(q.options.map(o => o.f))];
      let cand = d === 'up' ? fs.filter(f => b7Ratios(q.step, 'up').some(r => near(r, f))) : fs; if (!cand.length) cand = fs;
      const f = pickR(cand); return q.options.findIndex(o => o.op === (d === 'down' ? 'x' : '/') && near(o.f, f)) === q.ansOpt;
    }
    case 'compare': {
      const big = q.big === 'L' ? q.L : q.R, sm = q.big === 'L' ? q.R : q.L;
      const ok = RATIOS.filter(r => { const t = sm.v / (big.v * r); return near(t, 1) || (t >= 1.1 && t <= 1.5) || (t >= 8 && t <= 12) || (t >= 0.5 && t <= 0.9) || (t >= 0.08 && t <= 0.12); });
      const r = ok.length ? pickR(ok) : 100; const v = big.v * r;
      const concl = near(v, sm.v) ? 'same' : (v > sm.v ? q.big : (q.big === 'L' ? 'R' : 'L'));
      return q.options.indexOf(concl) === q.ansOpt;
    }
    case 'align_calc': {
      const st = q.step; const d = b7Dir(st);
      const other = q.keep;
      let ok;
      if (d === 'down') ok = RATIOS.filter(r => { const k = r === 10 ? other : other / (r / 10); return (isInt(k) && k >= 1 && k <= 9) || (r === 60 && [15, 20, 25, 35, 40, 45, 50].includes(other)); });
      else ok = RATIOS.filter(r => { const k = r === 10 ? st.x : st.x / (r / 10); return ((isInt(k) && k >= 1 && k <= 9) || (r === 60 && [15, 30, 45, 6, 9].includes(st.x))) && decimals(st.x / r) <= 2; });
      const r = ok.length ? pickR(ok) : 100;
      return correctOf(q, withProc(q, () => ({ op: d === 'down' ? 'x' : '/', f: r }), R), R);
    }
    case 'speed_apply': if (opt.noApproved) return A1(q, ctx, R); return true; // approved: 「1 秒で」「1 分で」 and the time definitions
    case 'diagnosis': {
      if (opt.noApproved) return q.options[q.ansOpt] === 'correct';
      const s = q.sheet; const src = q.src; let lab;
      if (s.raw) lab = 'not_aligned';
      else if (src.step.dom === 'time' && (s.f === 100 || s.f === 10000)) lab = 'sixty';
      else if (['length', 'weight', 'area', 'volume'].includes(src.step.dom) && s.f === 60) lab = 'other_domain';
      else if (src.step.dom === 'time' && s.f === 1000) lab = 'other_domain';
      else if ((src.step.dom === 'speed' && s.f === 100)) lab = 'sixty';
      else {
        const d = src.pattern === 'speed_apply' ? src.step.dir : b7Dir(src.step);
        if ((s.op === 'x') !== (d === 'down')) lab = 'direction';
        else lab = R() < 0.5 ? 'correct' : 'steps';
      }
      const i = q.options.indexOf(lab); return (i < 0 ? 0 : i) === q.ansOpt;
    }
  }
  return A1(q, ctx, R);
}
function B8(q, ctx, R) {
  if (q.pattern !== 'time_express') return A1(q, ctx, R);
  const m = q.step.x; let keep;
  if (q.form === 'comp') { const T = m; const bad = [[Math.floor(T / 100), T % 100], [Math.floor(T / 10), T % 10]]; keep = q.options.map((o, i) => i).filter(i => !bad.some(([h, mm]) => q.options[i].H === h && q.options[i].M === mm)); }
  else { const vals = q.options.map(o => o.val); const mx = Math.max(...vals); keep = q.options.map((o, i) => i).filter(i => !near(vals[i], m / 100) && !near(vals[i], mx)); }
  if (!keep.length) return q.ansOpt === 0;
  return keep[Math.floor(R() * keep.length)] === q.ansOpt;
}
function B9(q, ctx, R) {
  if (q.role !== 'cpB') return A1(q, ctx, R);
  const a = ctx.items[ctx.i - 1]; const f = a.step.f; const d1 = a.step.dir;
  const opp = ctx.lv === 3 || ctx.lv === 8; const d = opp ? (d1 === 'down' ? 'up' : 'down') : d1;
  return correctOf(q, withProc(q, () => ({ op: d === 'down' ? 'x' : '/', f }), R), R);
}
// E7: the table, plus the majority direction per frame learned from training sets
function e7Key(q) { const s = q.pattern === 'diagnosis' ? q.src : q; return `${q.pattern === 'diagnosis' ? 'diag:' : ''}${s.pattern}.${s.domain}.${s.step.x >= 10 ? 'hi' : 'lo'}${process.env.E7_SUBTYPE && s.type ? '.' + s.type : ''}`; }
const FIXED = new Set(['compound_in', 'time_express', 'recall']);
function E7(q, ctx, R) {
  if (FIXED.has(q.pattern)) return correctOf(q, solveWith(q, 'correct', R), R);
  const d = ctx.e7[e7Key(q)] || 'down';
  const fn = st => ({ op: d === 'down' ? 'x' : '/', f: st.f });
  return correctOf(q, withProc(q, fn, R), R);
}
const STAGE_A = { A1, A2_10: A2(10), A2_60: A2(60), A2_100: A2(100), A2_1000: A2(1000), A3: A1, A4, A5_1: A5(1), A5_2: A5(2), A5_3: A5(3), A5_4: A5(4), A6, A7, A9 };
const STAGE_B_EXTRA = { B1, B2, B3, B4: B4(false), B4s: B4(true), B6_10: B6(10), B6_60: B6(60), B6_100: B6(100), B6_1000: B6(1000), B7, B8, B9 };

// ---------- items of strict_gen.js in the layout of the independent check ----------
function revive(q) {
  if (q.pattern === 'diagnosis') { q.src = revive(q.src); if (q.src.kind === 'choice') q.shownOpt = q.shown; return q; }
  if (q.pattern === 'compound_in') q.lower = q.lo;
  if (q.pattern === 'align_calc') { q.sign = q.plus ? 1 : -1; q.convFirst = q.dir === 'down'; }
  if (q.pattern === 'speed_apply') { const v = q.vals;
    q.combine = q.type === 'kmph_min' ? h => v.v * h : q.type === 'mpm_km' ? m => m / v.v : q.type === 'sps_min' ? s => v.v * s : q.type === 'mix_persec' ? x => x + v.b : x => v.a + x; }
  return q;
}
function load(dir) {
  const D = {}; for (const f of fs.readdirSync(dir)) { const m = f.match(/^sets_(\d+)_(\d+)\.json$/); if (!m) continue; const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    (D[j.lv] = D[j.lv] || {})[j.seed] = j.sets.map(s => s.items.map(revive)); }
  return D;
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function learn(sets) {
  const dirCnt = {}, lab = {};
  for (const s of sets) for (const q of s) { const key = e7Key(q); const d = q.pattern === 'diagnosis' ? q.src.dir : q.dir; dirCnt[key] = dirCnt[key] || { down: 0, up: 0 }; dirCnt[key][d]++;
    if (q.pattern === 'diagnosis') { const pk = q.src.pattern + '.' + q.src.domain; lab[pk] = lab[pk] || {}; lab[pk][q.label] = (lab[pk][q.label] || 0) + 1; } }
  const e7 = {}; for (const [k, v] of Object.entries(dirCnt)) e7[k] = v.up >= v.down ? 'up' : 'down'; // 10.2 章: 同数なら上り
  const prior = {}; for (const [k, v] of Object.entries(lab)) prior[k] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
  return { e7, prior };
}
function p8(perSet) { let w = 0, hit = 0; for (let i = 0; i + 1 < perSet.length; i++) { const c = perSet[i][0] + perSet[i + 1][0], n = perSet[i][1] + perSet[i + 1][1]; if (!n) continue; w++; if (c / n >= 0.8 - 1e-9) hit++; } return w ? hit / w : NaN; }
function measure(sets, train, lv, seed) {
  const L = learn(train); const RA = mulberry32(5000 + lv + seed * 100);
  const ctxOf = (s, i) => ({ items: s, i, lv, e7: L.e7, prior: L.prior });
  const res = {};
  for (const p of ['M1mag', 'M1magR', 'M1', 'M1d', 'M2', 'M3']) { const per = sets.map(s => { let c = 0; s.forEach((q, i) => { if (M(p)(q, ctxOf(s, i), RA)) c++; }); return [c, s.length]; }); res[p] = { acc: per.reduce((a, b) => a + b[0], 0) / per.reduce((a, b) => a + b[1], 0), p8: p8(per) }; }
  { const per = sets.map(s => { let c = 0, n = 0; s.forEach((q, i) => { if (FIXED.has(q.pattern)) return; n++; if (E7(q, ctxOf(s, i), RA)) c++; }); return [c, n]; });
    const tot = per.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]); res.E7 = { acc: tot[1] ? tot[0] / tot[1] : NaN, p8: p8(per) }; }
  const solvers = { ...STAGE_A, ...STAGE_B_EXTRA }; const byType = {}; const aAcc = {}; let nItems = 0;
  sets.forEach(s => s.forEach((q, i) => { nItems++; const t = q.pattern; byType[t] = byType[t] || {};
    for (const [nm, fn] of Object.entries(solvers)) { const ok = fn(q, ctxOf(s, i), RA); const e = byType[t][nm] = byType[t][nm] || [0, 0]; e[0] += ok ? 1 : 0; e[1]++; if (nm in STAGE_A) aAcc[nm] = (aAcc[nm] || 0) + (ok ? 1 : 0); } }));
  const comp = skip => { let c = 0, n = 0; for (const [t, m] of Object.entries(byType)) { if (skip.includes(t)) continue; let bv = -1, cnt = 0; for (const e of Object.values(m)) { cnt = e[1]; if (e[0] / e[1] > bv) bv = e[0] / e[1]; } c += bv * cnt; n += cnt; } return n ? c / n : NaN; };
  res.Bexcl = comp(['diagnosis', 'speed_apply']); res.Braw = comp([]);
  const am = Object.entries(aAcc).map(([k, v]) => [k, v / nItems]).sort((a, b) => b[1] - a[1])[0]; res.Amax = { name: am[0], acc: am[1] };
  { let n = 0, c8 = 0; sets.forEach(s => s.forEach((q, i) => { if (q.pattern === 'time_express') { n++; if (B8(q, ctxOf(s, i), RA)) c8++; } })); res.B8 = n ? c8 / n : null; }
  { let n = 0, c9 = 0; sets.forEach(s => s.forEach((q, i) => { if (q.role === 'cpB') { n++; if (B9(q, ctxOf(s, i), RA)) c9++; } })); res.B9 = n ? c9 / n : null; }
  return res;
}
if (require.main === module) {
  const dir = process.argv[2]; if (!dir) { console.error('usage: node strict_enemies.js <dir>'); process.exit(2); }
  const D = load(dir); const out = {};
  const f = x => (x === null || x === undefined || Number.isNaN(x) ? '-' : x.toFixed(3));
  for (let lv = 1; lv <= 10; lv++) { if (!D[lv]) continue; const seeds = Object.keys(D[lv]);
    for (const sd of seeds) { const other = seeds.find(x => x !== sd) || sd; const r = measure(D[lv][sd], D[lv][other], lv, +sd); (out[lv] = out[lv] || {})[sd] = r;
      console.log(`Lv${lv} seed ${sd}: Amax ${r.Amax.name} ${f(r.Amax.acc)} | M1mag ${f(r.M1mag.acc)} p8 ${f(r.M1mag.p8)} | B(excl) ${f(r.Bexcl)} B(raw) ${f(r.Braw)} | M1 p8 ${f(r.M1.p8)} M2 p8 ${f(r.M2.p8)} M3 p8 ${f(r.M3.p8)} | E7 ${f(r.E7.acc)} p8 ${f(r.E7.p8)} | M1magR ${f(r.M1magR.acc)} M1d ${f(r.M1d.acc)} | B8 ${f(r.B8)} B9 ${f(r.B9)}`); } }
  fs.writeFileSync(path.join(dir, 'enemies.json'), JSON.stringify(out, null, 1));
}
function auditItem(q) {
  if (q.pattern === 'diagnosis') return { ...q, src: auditItem(q.src), opts: q.options, ansIdx: q.ansOpt, value: q.shown, shownF: q.sheet.f, shownOp: q.sheet.op === 'x' ? '×' : '÷', raw: q.sheet.raw, arithOK: true };
  const st = q.step;
  const asm = q.pattern === 'compound_in' ? x => x + q.lo : q.pattern === 'align_calc' ? x => q.plus ? x + q.keep : q.dir === 'down' ? x - q.keep : q.keep - x : q.pattern === 'speed_apply' ? q.combine : x => x;
  return { ...q, from: st.from, to: st.to, gv: st.x, f: st.f, ansIdx: q.ansOpt,
    opts: q.pattern === 'rate_select' ? q.options.map(o => ({ op: o.op === 'x' ? '×' : '÷', n: o.f })) : q.pattern === 'time_express' ? q.options.map(o => ({ ...o, h: o.H, m: o.M })) : q.options,
    raw: rawNum(q), X: st.x, bigIdx: q.big === 'L' ? 0 : 1, smallIdx: q.big === 'L' ? 1 : 0,
    bigU: q.L && (q.big === 'L' ? q.L.u : q.R.u), smallU: q.L && (q.big === 'L' ? q.R.u : q.L.u),
    pairWithPrev: q.role === 'cpB', paths: [{ v: st.x, f: st.f, op: st.dir === 'down' ? '×' : '÷', kd: st.dom === 'time' ? 'time' : st.dom === 'speed' ? 'speed' : 'dec', comp: st.comp || q.pattern === 'compound_in', relId: q.rel, asm }] };
}
function measureCanonical(sets, train, lv, seed) {
  const V = require('./solvers.js'), S = sets.map(s => s.map(auditItem)), T = train.map(s => s.map(auditItem));
  const prior = {}, dirs = {};
  for (const s of T) for (const q of s) {
    const b = q.pattern === 'diagnosis' ? q.src : q, p = b.paths[0];
    const key = [lv, (q.pattern === 'diagnosis' ? 'diagnosis.' : '') + b.pattern, b.domain, p.v >= 10 ? 'big' : 'small'].join('|');
    const d = dirs[key] = dirs[key] || { up: 0, down: 0 }; d[p.op === '÷' ? 'up' : 'down']++;
    if (q.pattern === 'diagnosis') { const k = lv + '|' + b.pattern + '|' + b.domain, a = prior[k] = prior[k] || {}; a[q.label] = (a[q.label] || 0) + 1; }
  }
  const A = { A1: V.A1, A3: V.A1, A4: V.A4, A6: V.A6, A7: V.A7, A9: V.A9, A10: V.A10, A12: V.A12, A13: V.A13, A14: V.A14 };
  for (const c of [10, 60, 100, 1000]) A['A2_' + c] = V.A2(c);
  for (const k of [1, 2, 3, 4]) A['A5_' + k] = V.A5(k);
  const B = { B1: V.B1, B2: V.B2, B3: V.B3(prior), B4: V.B4, B4s: V.B4s, B8: V.B8, B9: V.B9 };
  for (const c of [10, 60, 100, 1000]) B['B6_' + c] = V.B6(c);
  for (const c of [10, 60, 100, 1000, 10000]) for (const d of ['correct', 'steps']) for (const o of ['p10', 's60']) B['B7_' + c + d + o] = V.B5(c, d, false, o);
  const probes = Object.fromEntries(['M1', 'M1d', 'M2', 'M3', 'M1mag', 'M1magR'].map(p => [p, V.probe(p)]));
  const R = mulberry32(5000 + lv + seed * 100), scores = {}, solvers = { ...A, ...B, ...probes, E7: V.E7(dirs) };
  for (const [name, fn] of Object.entries(solvers)) scores[name] = S.map(s => s.map((q, i) => +fn(q, s.slice(0, i), R, lv)));
  const summary = (name, keep = () => true) => {
    const per = S.map((s, si) => s.reduce((a, q, i) => keep(q) ? [a[0] + scores[name][si][i], a[1] + 1] : a, [0, 0]));
    const total = per.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
    return { acc: total[0] / total[1], p8: p8(per) };
  };
  const res = Object.fromEntries(Object.keys(probes).map(p => [p, summary(p)]));
  res.E7 = { acc: summary('E7', q => ['convert', 'rate_select', 'align_calc'].includes((q.src || q).pattern) && !q.pairWithPrev).acc, p8: summary('E7', q => !FIXED.has(q.pattern)).p8 };
  res.Amax = Object.entries(A).map(([name]) => ({ name, acc: summary(name).acc })).sort((a, b) => b.acc - a.acc)[0];
  let total = 0, correct = 0;
  for (const pattern of new Set(S.flat().map(q => q.pattern))) {
    if (pattern === 'diagnosis' || pattern === 'speed_apply') continue;
    const best = Math.max(...Object.keys({ ...A, ...B }).map(name => summary(name, q => q.pattern === pattern).acc));
    const n = S.flat().filter(q => q.pattern === pattern).length; total += n; correct += best * n;
  }
  res.Bexcl = correct / total;
  res.B8 = S.flat().some(q => q.pattern === 'time_express') ? summary('B8', q => q.pattern === 'time_express').acc : null;
  res.B9 = S.flat().some(q => q.pairWithPrev) ? summary('B9', q => q.pairWithPrev).acc : null;
  res.A10pair = S.flat().some(q => q.pairWithPrev) ? summary('A10', q => q.pairWithPrev).acc : null;
  return res;
}
module.exports = { measure, measureCanonical, load, revive };
