#!/usr/bin/env node
// Strict generator for kom_unit_mix (docs/komorebi_unit_mix_curriculum.md).
// Every rule of chapters 3, 4, 5, 8 and 9 that says 必ず / 全数 / 上限 / 下限 / 比率 / 鏡像 / 層化 is implemented
// as written. The value lists are read from the table of 9.2 章 itself (not from gen.js), so a gap between the
// table and the rules shows up here. Where the doc leaves a free choice, the line says "free:".
// strict_check.js asserts chapter 10 on the output. The items use the field layout of the Phase 7 independent
// generator (step, options, ansOpt, kind 'num' | 'choice'), so the enemy solvers of strict_enemies.js run on them.
//   const g = require('./strict_gen.js'); const st = g.newState(); g.buildSet(lv, random, st)
'use strict';
const fs = require('fs');
const path = require('path');

// ---------- the doc: 9.2 の値の表 ----------
const DOC = process.env.UMIX_DOC || path.join(__dirname, '../../../docs/komorebi_unit_mix_curriculum.md');
function section(md, head) { const i = md.indexOf('\n' + head); if (i < 0) throw new Error('no section ' + head); const j = md.indexOf('\n### ', i + 1); return md.slice(i, j < 0 ? undefined : j); }
function readValues() {
  const md = fs.readFileSync(DOC, 'utf8'); const V = {};
  for (const line of section(md, '### 9.2').split('\n')) {
    const m = line.match(/^\| `([A-Z0-9_]+)` \|.*\| ([^|]+) \|$/); if (!m) continue;
    V[m[1]] = m[2].split('、').map(x => x.trim()).map(x => (/^-?[0-9.]+$/.test(x) ? Number(x) : x));
  }
  return V;
}
const V = readValues();
const need = (name) => { if (!V[name]) throw new Error(`9.2 章に ${name} の行が無い`); return V[name]; };
const fracVal = s => { const [a, b] = String(s).split('/').map(Number); return a / b; };

// ---------- numbers ----------
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const isInt = x => near(x, Math.round(x));
const rd = x => Math.round(x * 1e9) / 1e9;
function decimals(x) { for (let d = 0; d <= 8; d++) if (near(x * 10 ** d, Math.round(x * 10 ** d))) return d; return 99; }
const digits = x => String(Math.floor(Math.abs(x) + 1e-9)).length;
const inRange = x => x > 0 && digits(x) <= 6 && decimals(x) <= 2; // 3 章: 6 桁以内、小数第 2 位まで

// ---------- 3.2 units, 3.3 relations ----------
const UNITS = {
  mm: ['length', 1e-3], cm: ['length', 1e-2], m: ['length', 1], km: ['length', 1e3], g: ['weight', 1], kg: ['weight', 1e3], t: ['weight', 1e6],
  'cm²': ['area', 1e-4], 'm²': ['area', 1], a: ['area', 1e2], ha: ['area', 1e4], 'km²': ['area', 1e6],
  'cm³': ['volume', 1e-6], mL: ['volume', 1e-6], L: ['volume', 1e-3], 'm³': ['volume', 1],
  '秒': ['time', 1], '分': ['time', 60], '時間': ['time', 3600], '秒速m': ['speed', 1], '分速m': ['speed', 1 / 60], '時速km': ['speed', 5 / 18],
};
const R1 = { // 1 段 (R13 は recall だけ)
  R1: ['cm', 'mm'], R2: ['m', 'cm'], R3: ['km', 'm'], R4: ['kg', 'g'], R5: ['t', 'kg'], R6: ['m²', 'cm²'], R7: ['a', 'm²'], R8: ['ha', 'a'], R9: ['km²', 'ha'],
  R10: ['L', 'mL'], R11: ['L', 'cm³'], R12: ['m³', 'L'], R13: ['mL', 'cm³'], R14: ['分', '秒'], R15: ['時間', '分'], R16: ['秒速m', '分速m'], R17: ['秒速m', '時速km'],
};
const R2 = { D1: ['m', 'mm'], D2: ['km', 'cm'], D3: ['t', 'g'], D4: ['ha', 'm²'], D5: ['km²', 'a'], D6: ['m³', 'mL'], D7: ['時間', '秒'] };
const RECALL_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R12', 'R13', 'R14', 'R15'];
const DOM4 = ['length', 'weight', 'area', 'volume'], DOM5 = [...DOM4, 'time'], DOM6 = [...DOM5, 'speed'];
const fOf = id => { const [b, s] = R1[id] || R2[id]; return rd(UNITS[b][1] / UNITS[s][1]); };
const domOf = id => UNITS[(R1[id] || R2[id])[0]][0];
const rels1 = dom => Object.keys(R1).filter(id => id !== 'R13' && domOf(id) === dom);
const rels2 = dom => Object.keys(R2).filter(id => domOf(id) === dom);
// a conversion step: given x in unit `from`, asked in unit `to`
function step(x, from, to) {
  const [d1, s1] = UNITS[from], [d2, s2] = UNITS[to]; if (d1 !== d2) throw new Error('step across domains');
  const f = rd(s1 > s2 ? s1 / s2 : s2 / s1);
  return { x, from, to, f, dom: d1, dir: s1 > s2 ? 'down' : 'up' };
}
const conv = st => rd(st.dir === 'down' ? st.x * st.f : st.x / st.f);
const opOf = st => (st.dir === 'down' ? 'x' : '/');

// ---------- rng ----------
function rng(random) {
  const r = () => { const x = random(); if (!(x >= 0 && x < 1)) throw new Error('random() out of range'); return x; };
  return { r, pick: a => a[Math.floor(r() * a.length)], coin: (p = 0.5) => r() < p,
    shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; } };
}

// ---------- 4.3 / 10.1 の誤り 1 つ型 (罠を数えるため、9.1 章) ----------
function timeNonInt(st) {
  const r = conv(st);
  if (st.comp) return true;
  if (st.dom === 'time') return !isInt(st.x) || !isInt(r);
  if (st.dom === 'speed' && st.f === 60) return !isInt(st.x) || !isInt(r);
  return false;
}
const rev = op => (op === 'x' ? '/' : 'x');
const PROCS = {
  correct: st => ({ op: opOf(st), f: st.f }),
  M1: st => ({ op: 'x', f: st.f }), M1d: st => ({ op: '/', f: st.f }),
  M1mag: st => ({ op: st.x >= 10 ? '/' : 'x', f: st.f }), M1magR: st => ({ op: st.x >= 10 ? 'x' : '/', f: st.f }),
  M2: st => ({ op: opOf(st), f: timeNonInt(st) ? (st.f === 60 ? 100 : st.f === 3600 ? 10000 : st.f) : st.f }),
  M3: st => ({ op: st.dom === 'speed' ? rev(opOf(st)) : opOf(st), f: st.f }),
};
const ap = (x, o) => (o.op === 'x' ? x * o.f : x / o.f);
function solve(q, proc) { // returns {val} or {opt}
  const P = typeof proc === 'function' ? proc : PROCS[proc];
  const c = st => ap(st.x, P(st));
  switch (q.pattern) {
    case 'recall': case 'convert': return { val: rd(c(q.step)) };
    case 'compound_in': return { val: rd(c(q.step) + q.lo) };
    case 'align_calc': { const v = c(q.step); return { val: rd(q.dir === 'down' ? (q.plus ? v + q.keep : v - q.keep) : (q.plus ? q.keep + v : q.keep - v)) }; }
    case 'speed_apply': return { val: rd(q.combine(c(q.step))) };
    case 'rate_select': { const o = P(q.step); return { opt: q.options.findIndex(x => x.op === o.op && near(x.f, o.f)) }; }
    case 'time_express': {
      const o = P(q.step);
      if (q.form === 'comp') { if (o.op !== '/') return { opt: -1 }; const H = Math.floor(q.step.x / o.f), M = rd(q.step.x - H * o.f); return { opt: q.options.findIndex(x => x.H === H && near(x.M, M)) }; }
      const v = ap(q.step.x, o); return { opt: q.options.findIndex(x => near(x.val, v)) };
    }
    case 'compare': {
      const v = c(q.step); const other = q.otherVal; const conclSide = near(v, other) ? 'same' : (v > other ? q.convSide : (q.convSide === 'L' ? 'R' : 'L'));
      return { opt: q.options.indexOf(conclSide) };
    }
    case 'diagnosis': return { opt: -1 };
  }
  throw new Error('pattern ' + q.pattern);
}
function correctOn(q, proc) { // for trap counting: a diagnosis is a trap when the procedure cannot solve its source (4.3 の 1)
  if (q.pattern === 'diagnosis') return correctOn(q.src, proc);
  const r = solve(q, proc);
  return q.kind === 'num' ? near(r.val, q.ans) : r.opt === q.ansOpt;
}

// ---------- items ----------
const bandOf = x => (x >= 10 ? 'hi' : 'lo');
const formBig = (st, ans) => { const big = st.dir === 'down' ? st.x : ans; return isInt(big) ? 'int' : 'dec'; }; // 3.5 章
// candidates of a convert-like item (convert, rate_select): relation, given, form
function convCands(dom, ids, dir, forms, band) {
  const out = [];
  for (const id of ids) {
    const [big, small] = R1[id] || R2[id]; const f = fOf(id);
    const from = dir === 'down' ? big : small, to = dir === 'down' ? small : big;
    const xs = [];
    if (id === 'R16' || id === 'R17') for (const k of need(id === 'R16' ? 'SPD_R16' : 'SPD_R17')) xs.push({ x: dir === 'down' ? k : rd(k * f) });
    else {
      for (const b of need('B_INT')) xs.push({ x: dir === 'down' ? b : rd(b * f) });
      for (const b of need('B_DEC')) xs.push({ x: dir === 'down' ? b : rd(b * f) });
      if (dir === 'up') { const sm = f === 10 ? need('UP_SMALL_10') : f === 100 ? need('UP_SMALL_100') : (f === 60 ? need('UP_SMALL_60') : []); for (const g of sm) xs.push({ x: g }); }
      if (forms.includes('frac') && id === 'R15' && dir === 'down') for (const s of need('FRAC_HOURS')) xs.push({ x: fracVal(s), frac: s });
    }
    for (const v of xs) {
      const st = step(v.x, from, to); const ans = conv(st);
      const form = v.frac ? 'frac' : formBig(st, ans);
      if (!forms.includes(form)) continue; // 3.5 章: 計画した形と合わない値は捨てる
      if (!v.frac && !inRange(st.x)) continue; if (!inRange(ans)) continue;
      if (band && bandOf(st.x) !== band) continue;
      out.push({ id, st, ans, form, frac: v.frac || null });
    }
  }
  return out;
}
function pickCand(R, cs) { if (!cs.length) return null; const ids = [...new Set(cs.map(c => c.id))]; const id = R.pick(ids); return R.pick(cs.filter(c => c.id === id)); } // free: relation first, then value (3.3 章の抽選順)
const convertQ = (c, steps) => ({ pattern: 'convert', kind: 'num', step: c.st, ans: c.ans, domain: c.st.dom, dir: c.st.dir, form: c.form, rel: c.id, frac: c.frac, steps: steps || 1, unit: c.st.to });
function gCands(id) { // 4.7 章
  const f = fOf(id), dom = domOf(id);
  if (DOM4.includes(dom)) { const g = []; if (f !== 10000) g.push(f * 10); if (f / 10 >= 10) g.push(f / 10); g.push(60); return g; }
  if (dom === 'time') return f === 60 ? [100, 3600] : [60, 100];
  return near(f, 60) ? [100, 3.6] : [60];
}
function rateQ(R, c) {
  const f = c.st.f, g = R.pick(gCands(c.id));
  const options = R.shuffle([{ op: 'x', f }, { op: '/', f }, { op: 'x', f: g }, { op: '/', f: g }]);
  return { pattern: 'rate_select', kind: 'choice', step: c.st, options, ansOpt: options.findIndex(o => o.op === opOf(c.st) && near(o.f, f)), g, domain: c.st.dom, dir: c.st.dir, form: c.form, rel: c.id };
}
function recallQ(R, dom) {
  const id = R.pick(RECALL_IDS.filter(x => domOf(x) === dom)); const [b, s] = R1[id]; const st = step(1, b, s);
  return { pattern: 'recall', kind: 'num', step: st, ans: conv(st), domain: dom, dir: 'down', form: 'int', rel: id, unit: s };
}
const COMP = { C1: ['time', '時間', '分'], C2: ['time', '分', '秒'], C3: ['length', 'm', 'cm'], C4: ['length', 'km', 'm'], C5: ['weight', 'kg', 'g'] };
function compoundQ(cid, hi, lo) {
  const [dom, uh, ul] = COMP[cid]; const st = step(hi, uh, ul); st.comp = dom === 'time';
  return { pattern: 'compound_in', kind: 'num', step: st, lo, hi, cid, ans: rd(conv(st) + lo), domain: dom, dir: 'down', form: 'comp', unit: ul };
}
function compoundFree(R, cid) { // 9.2 章: 長さと重さの下の位は、CP1 以外で 6 割を桁の少ない値から
  const t = COMP[cid][0] === 'time', c3 = cid === 'C3';
  const hi = R.pick(need(t ? 'COMP_TIME_HI' : c3 ? 'COMP_C3_HI' : 'COMP_C45_HI'));
  const lo = t ? R.pick(need('COMP_TIME_LO')) : (R.coin(0.6) ? R.pick(need(c3 ? 'COMP_C3_SHORT' : 'COMP_C45_SHORT')) : R.pick(need(c3 ? 'COMP_C3_LO' : 'COMP_C45_LO')));
  return compoundQ(cid, hi, lo);
}
function timeExpressQ(R, form) { // 4.8 章
  if (form === 'comp') {
    for (let k = 0; k < 60; k++) {
      const H = R.pick(need('TEXP_COMP_H')), M = R.pick(need('TEXP_COMP_M')); const X = 60 * H + M; if (X < 100) continue; // 複名数は元の分が 100 以上
      const sides = [M + 10, M - 10].filter(m => m >= 0 && m < 60); if (!sides.length) continue;
      const opts = [{ t: 'correct', H, M }, { t: 'sixty', H: Math.floor(X / 100), M: X % 100 }, { t: 'calc', H, M: R.pick(sides) }, { t: 'place', H: Math.floor(X / 10), M: X % 10 }];
      if (new Set(opts.map(o => o.H * 1000 + o.M)).size < 4) continue;
      const options = R.shuffle(opts);
      return { pattern: 'time_express', kind: 'choice', step: step(X, '分', '時間'), options, ansOpt: options.findIndex(o => o.t === 'correct'), domain: 'time', dir: 'up', form: 'comp' };
    }
    return null;
  }
  const v = form === 'frac' ? fracVal(R.pick(need('FRAC_HOURS'))) : R.pick(need('TEXP_HOURS'));
  const X = rd(60 * v); if (!isInt(X)) return null;
  const c6 = rd(X / 6), c600 = rd(X / 600);
  const ok3 = x => decimals(x) <= 3; // 4.8 章: この肢に限り小数第 3 位まで、または分数
  if (form !== 'frac' && !(ok3(c6) && ok3(c600))) return null; // 9.2 章 / 4.8 章: 計算ちがいの肢が 2 通りとも作れるもの
  const calc = R.coin() ? c6 : c600;
  const opts = [{ t: 'correct', val: v }, { t: 'sixty', val: rd(X / 100) }, { t: 'calc', val: calc }, { t: 'rev', val: rd(X * 60) }];
  if (new Set(opts.map(o => o.val.toFixed(9))).size < 4) return null;
  const options = R.shuffle(opts);
  return { pattern: 'time_express', kind: 'choice', step: step(X, '分', '時間'), options, ansOpt: options.findIndex(o => o.t === 'correct'), domain: 'time', dir: 'up', form: isInt(v * 100) ? 'dec' : 'frac', calcBelow: calc < v };
}
const sig2 = x => { if (x < 10) return Math.round(x); const p = 10 ** (Math.floor(Math.log10(x)) - 1); return rd(Math.round(x / p) * p); };
function compareQ(R, dom, dir, concl) { // 9.2 章の compare の値、4.13 章
  const id = R.pick(rels1(dom)); const [bu, su] = R1[id]; const f = fOf(id);
  const vb = R.pick(R.coin() ? need('B_INT') : need('B_DEC')); // free: int か dec を半々
  const c = rd(vb * f); let vs;
  if (concl === 'same') vs = c;
  else if (concl === 'small') vs = (dom === 'time' && !isInt(vb) && R.coin()) ? rd(vb * 100) : sig2(R.coin() ? c * (1.1 + 0.4 * R.r()) : c * (8 + 4 * R.r()));
  else vs = sig2(R.coin() ? c * (0.5 + 0.4 * R.r()) : c * (0.08 + 0.04 * R.r()));
  const ratio = vs / c;
  if (concl === 'small' && !(ratio > 1 + 1e-9 && ((ratio >= 1.1 - 1e-9 && ratio <= 1.5 + 1e-9) || (ratio >= 8 - 1e-9 && ratio <= 12 + 1e-9) || near(vs, vb * 100)))) return null;
  if (concl === 'big' && !((ratio >= 0.5 - 1e-9 && ratio <= 0.9 + 1e-9) || (ratio >= 0.08 - 1e-9 && ratio <= 0.12 + 1e-9))) return null;
  if (!inRange(vs) || !inRange(vb) || vs < 1) return null;
  const x = dir === 'down' ? vb : vs; if (x < 10) return null; // 4.13 章: 直す数はどちらの向きでも 10 以上
  if (dir === 'up' && decimals(vs / f) > 2) return null; // 9.2 章: 上りは vs を倍率で割った値が小数第 2 位まで
  const st = dir === 'down' ? step(vb, bu, su) : step(vs, su, bu);
  const bigLeft = R.coin();
  const L = bigLeft ? { v: vb, u: bu } : { v: vs, u: su }, Rr = bigLeft ? { v: vs, u: su } : { v: vb, u: bu };
  const convSide = dir === 'down' ? (bigLeft ? 'L' : 'R') : (bigLeft ? 'R' : 'L');
  const q = { pattern: 'compare', kind: 'choice', step: st, convSide, otherVal: dir === 'down' ? vs : vb, options: ['L', 'R', 'same'], domain: dom, dir, form: isInt(vb) ? 'int' : 'dec', rel: id, concl, L, R: Rr, big: bigLeft ? 'L' : 'R', vb, vs, alignTo: dir === 'down' ? su : bu };
  const truth = conv(st); q.ansOpt = near(truth, q.otherVal) ? 2 : ((truth > q.otherVal) ? (convSide === 'L' ? 0 : 1) : (convSide === 'L' ? 1 : 0));
  return q;
}
function alignQ(R, dom, dir, band) { // 9.2 章の align_calc の値
  let id, bu, su, A, B, cpair = null;
  if (dom === 'time') { cpair = R.pick(['C1', 'C2']); [, bu, su] = COMP[cpair]; A = R.pick(need('ALIGN_TIME_BIG')); B = R.pick(need(dir === 'down' ? 'ALIGN_TIME_S_DOWN' : 'ALIGN_TIME_S_UP')); }
  else { id = R.pick(rels1(dom)); [bu, su] = R1[id]; const f = fOf(id); A = R.pick(R.coin() ? need('B_INT') : need('B_DEC')); const k = R.pick(need('ALIGN_K')); B = rd(f === 10 ? k : k * f / 10); }
  const plus = R.coin();
  const st = dir === 'down' ? step(A, bu, su) : step(B, su, bu);
  if (band && bandOf(st.x) !== band) return null;
  const cv = conv(st); if (!inRange(cv)) return null;
  const keep = dir === 'down' ? B : A;
  const ans = rd(dir === 'down' ? (plus ? cv + keep : cv - keep) : (plus ? keep + cv : keep - cv));
  if (!(ans > 0) || !inRange(ans) || !inRange(A) || !inRange(B)) return null;
  return { pattern: 'align_calc', kind: 'num', step: st, keep, plus, ans, domain: dom, dir, form: isInt(A) ? 'int' : 'dec', rel: id || cpair, cpair, A: { v: A, u: bu }, B: { v: B, u: su }, unit: dir === 'down' ? su : bu };
}
const SA_DIR = { kmph_min: 'up', mix_persec: 'up', mpm_km: 'down', sps_min: 'down', mix_permin: 'down' };
function speedApplyQ(R, type, band) { // 9.2 章の speed_apply の小型
  let st, combine, ans, vals, unit;
  if (type === 'kmph_min') { const v = R.pick(need('SA_KMPH_V')), t = R.pick(need(band === 'lo' ? 'SA_KMPH_T_SMALL' : 'SA_KMPH_T_BIG')); st = step(t, '分', '時間'); combine = h => v * h; ans = rd(v * t / 60); if (decimals(ans) > 1) return null; vals = { v, t }; unit = 'km'; }
  else if (type === 'mpm_km') { const v = R.pick(need('SA_MPM_V')), d = R.pick(need(band === 'hi' ? 'SA_MPM_D_BIG' : 'SA_MPM_D_SMALL')); st = { x: d, from: 'km', to: 'm', f: 1000, dom: 'length', dir: 'down' }; combine = m => m / v; ans = rd(d * 1000 / v); if (!isInt(ans)) return null; vals = { v, d }; unit = '分'; }
  else if (type === 'sps_min') { const v = R.pick(need('SA_SPS_V')), t = R.pick(need(band === 'hi' ? 'SA_SPS_T_BIG' : 'SA_SPS_T_SMALL')); st = step(t, '分', '秒'); combine = s => v * s; ans = v * 60 * t; vals = { v, t }; unit = 'm'; }
  else { if (band === 'lo') return null; const a = R.pick(need('SA_MIX_A')), b = R.pick(need('SA_MIX_B'));
    if (type === 'mix_persec') { st = step(a, '分速m', '秒速m'); combine = x => x + b; ans = rd(a / 60 + b); } else { st = step(b, '秒速m', '分速m'); combine = x => a + x; ans = a + 60 * b; }
    vals = { a, b }; unit = 'm'; }
  if (band && bandOf(st.x) !== band) return null;
  if (!inRange(ans)) return null;
  return { pattern: 'speed_apply', kind: 'num', type, step: st, combine, ans, domain: 'speed', dir: SA_DIR[type], form: isInt(ans) ? 'int' : 'dec', vals, unit };
}

// ---------- 4.9 章、8.1 章、8.2 章: 診断 ----------
const USABLE = { 4: ['correct', 'direction', 'steps', 'sixty', 'other_domain'], d: ['correct', 'not_aligned', 'direction', 'steps', 'sixty', 'other_domain'] };
const SRC_OK = { direction: ['convert', 'align_calc', 'speed_apply'], steps: ['convert', 'align_calc'], sixty: ['convert', 'align_calc', 'speed_apply'], other_domain: ['convert'], not_aligned: ['align_calc', 'speed_apply'] };
const PRIO = ['direction', 'steps', 'sixty', 'other_domain', 'not_aligned'];
function errOps(src) {
  const st = src.step, ops = [], dec = DOM4.includes(st.dom) && src.pattern !== 'speed_apply';
  if (SRC_OK.direction.includes(src.pattern)) ops.push(['direction', s => ({ op: rev(opOf(s)), f: s.f })]);
  if (dec && SRC_OK.steps.includes(src.pattern)) { ops.push(['steps', s => ({ op: opOf(s), f: s.f * 10 })]); if (st.f / 10 >= 10) ops.push(['steps', s => ({ op: opOf(s), f: s.f / 10 })]); }
  const sixtyOK = (src.pattern !== 'speed_apply' && st.dom === 'time' && timeNonInt(st)) || (src.pattern === 'convert' && st.dom === 'speed' && st.f === 60)
    || (src.pattern === 'speed_apply' && (src.type === 'kmph_min' || (src.type === 'mix_persec' && src.vals.a % 60 !== 0)));
  if (sixtyOK && SRC_OK.sixty.includes(src.pattern)) ops.push(['sixty', s => ({ op: opOf(s), f: s.f === 60 ? 100 : s.f === 3600 ? 10000 : s.f })]);
  if (src.pattern === 'convert' && DOM4.includes(st.dom)) ops.push(['other_domain', s => ({ op: opOf(s), f: 60 })]);
  if (src.pattern === 'convert' && st.dom === 'time') ops.push(['other_domain', s => ({ op: opOf(s), f: 1000 })]);
  if (SRC_OK.not_aligned.includes(src.pattern)) ops.push(['not_aligned', null]);
  return ops;
}
function rawVal(src) { // 換算せずに生の数で足す、掛ける
  if (src.pattern === 'align_calc') return rd(src.plus ? src.A.v + src.B.v : src.A.v - src.B.v);
  if (src.pattern === 'speed_apply') return rd(src.combine(src.step.x));
  return NaN;
}
function sheetVal(src, fn) { return fn ? solve(src, fn).val : rawVal(src); }
function diagQ(R, src, lv, wantCorrect) {
  const usable = lv === 4 ? USABLE[4] : USABLE.d;
  let label, shown, sheet;
  if (wantCorrect) { label = 'correct'; shown = src.ans; sheet = { op: opOf(src.step), f: src.step.f, raw: false }; }
  else {
    const ops = errOps(src).filter(([l]) => usable.includes(l)); if (!ops.length) return null;
    const [l0, fn] = R.pick(ops);
    shown = sheetVal(src, fn);
    if (!Number.isFinite(shown) || near(shown, src.ans) || !inRange(shown)) return null; // 4.9 の 2 と 5
    label = PRIO.find(p => ops.some(([l, g]) => l === p && near(sheetVal(src, g), shown))); // 8.1 章の優先順
    sheet = fn ? Object.assign(fn(src.step), { raw: false }) : { raw: true };
    sheet.l0 = l0;
  }
  const rest = R.shuffle(usable.filter(x => x !== label && x !== 'correct'));
  const opts = [label]; if (label !== 'correct') opts.push('correct');
  while (opts.length < 4) opts.push(rest.shift());
  const options = R.shuffle(opts);
  return { pattern: 'diagnosis', kind: 'choice', src, shown, options, ansOpt: options.indexOf(label), label, sheet, domain: src.domain, dir: src.dir };
}

// ---------- 4.2 の 5 と 6: 量と問い ----------
function qty(q) { // the quantities of an item, as 単位|数
  const s = q.pattern === 'diagnosis' ? q.src : q;
  if (s.pattern === 'compare') return [s.L.u + '|' + s.L.v, s.R.u + '|' + s.R.v];
  if (s.pattern === 'align_calc') return [s.A.u + '|' + s.A.v, s.B.u + '|' + s.B.v];
  if (s.pattern === 'compound_in') return [s.step.from + '|' + s.hi + '+' + s.lo];
  if (s.pattern === 'time_express') return ['分|' + s.step.x];
  if (s.pattern === 'speed_apply') return [s.type + '|' + JSON.stringify(s.vals)];
  return [s.step.from + '|' + s.step.x];
}
function asked(q) { const s = q.pattern === 'diagnosis' ? q.src : q; return s.pattern === 'compare' ? s.alignTo : s.pattern === 'time_express' ? '時間' : s.pattern === 'rate_select' ? s.step.to : (s.unit || ''); }
function questions(set) { // 4.2 の 6: recall と speed の領域は数えない
  return set.filter(q => q.pattern !== 'recall' && (q.pattern === 'diagnosis' ? q.src : q).domain !== 'speed').flatMap(q => qty(q).map(k => k + '>' + asked(q)));
}
const RECENT = 3;
const recentApplies = lv => lv !== 8; // 4.2 の 6: Lv8 は規則の外

// ---------- 5 章の配合と 4 章の計画 ----------
const TRAPS = { 1: ['M1mag', 'M1magR'], 2: ['M1mag', 'M1magR'], 3: ['M1mag', 'M1magR', 'M1', 'M1d'] };
for (let lv = 4; lv <= 10; lv++) TRAPS[lv] = ['M1mag', 'M1magR', 'M1', 'M1d', 'M2', ...(lv >= 8 ? ['M3'] : [])];
const flip = d => (d === 'down' ? 'up' : 'down');
function drawPlan(lv, R) {
  const P = { lv, frames: [] };
  const F = o => P.frames.push(o);
  const dir = () => (R.coin() ? 'down' : 'up'), band = () => (R.coin() ? 'hi' : 'lo');
  const free = o => F({ ...o, dir: dir(), band: band(), chainBand: band(), freeDir: true }); // 4.13 章: 向きと帯を枠ごとに独立に半々
  const correct = () => R.coin(0.25); // 4.9 の 3: 正しい答案 20 から 30%
  switch (lv) {
    case 1: F({ kind: 'recall', dom: R.pick(DOM5) }); F({ kind: 'recall', dom: R.pick(DOM5) }); for (let i = 0; i < 3; i++) F({ kind: 'rate', dom: R.pick(DOM5), dir: 'down', forms: ['int'] }); break;
    case 2: F({ kind: 'cp1int', dom2: R.pick(DOM4) }); for (let i = 0; i < 3; i++) F({ kind: 'rate', dom: R.pick(DOM5), dir: 'down', forms: ['int'] }); break;
    case 3: {
      F({ kind: 'cp2', variant: R.coin() ? 'rev' : 'same', dom: null, dir: dir(), band: band(), freeDir: true, variantFlips: true, u: R.r() });
      free({ kind: 'conv', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] });
      free({ kind: 'rate', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); free({ kind: 'rate', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] });
      break;
    }
    case 4: F({ kind: 'cp1dec', dom2: R.pick(DOM4), dir: dir(), band: band(), freeDir: true });
      free({ kind: 'diag', src: 'conv', dom: R.coin() ? 'time' : R.pick(DOM4), forms: ['dec'], correct: correct() });
      F({ kind: 'te', form: R.pick(['dec', 'frac']) }); break;
    case 5: F({ kind: 'cp1comp', tc: R.pick(['C1', 'C2']), pc: R.pick(['C3', 'C4', 'C5']) }); F({ kind: 'te', form: 'comp' });
      free({ kind: 'conv2', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); free({ kind: 'rate', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); break;
    case 6: { const u = R.r(); const concl = u < 0.24 ? 'big' : (u < 0.45 ? 'same' : 'small'); // 4.6 章の重み
      F({ kind: 'cmp', dom: R.pick(DOM5), dir: dir(), concl, freeDir: true });
      free({ kind: 'diag', src: R.coin() ? 'conv' : 'align', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])], correct: correct() });
      free({ kind: 'conv', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); free({ kind: 'align', dom: R.pick(DOM5) }); break; }
    case 7: free({ kind: 'align', dom: R.pick(DOM5) }); free({ kind: 'diag', src: 'align', dom: R.pick(DOM5), correct: correct() });
      free({ kind: 'conv', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); free({ kind: 'conv', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); break;
    case 8: F({ kind: 'cp8', dir: dir(), variant: R.coin() ? 'min' : 'hour', freeDir: true, variantFlips: true });
      free({ kind: 'conv', dom: 'speed', forms: ['int', 'dec'] }); free({ kind: 'conv', dom: 'speed', forms: ['int', 'dec'] }); free({ kind: 'rate', dom: 'speed', forms: ['int'] }); break;
    case 9: free({ kind: 'diag', src: R.coin() ? 'sa' : 'conv', dom: 'speed', forms: ['int', 'dec'], correct: correct(), saPick: R.r() });
      if (R.coin()) free({ kind: 'conv', dom: R.pick(DOM5), forms: [R.pick(['int', 'dec'])] }); else free({ kind: 'align', dom: R.pick(DOM5) });
      free({ kind: 'conv', dom: 'speed', forms: ['int', 'dec'] }); free({ kind: 'sasum' }); break;
    case 10: { const sp = R.coin();
      free({ kind: 'diag', src: sp ? (R.coin() ? 'sa' : 'conv') : R.pick(['conv', 'align']), dom: sp ? 'speed' : R.pick(DOM5), forms: [R.pick(['int', 'dec'])], correct: correct(), saPick: R.r() });
      const sf = R.pick(['conv', 'rate', 'sasum']); free({ kind: sf, dom: 'speed', forms: sf === 'rate' ? ['int'] : ['int', 'dec'] });
      const tf = R.pick(['conv', 'te', 'comp']);
      if (tf === 'conv') { const form = R.pick(['dec', 'frac']); F({ kind: 'conv', dom: 'time', forms: [form], dir: form === 'frac' ? 'down' : dir(), band: form === 'frac' ? 'lo' : band(), freeDir: form !== 'frac' }); }
      else if (tf === 'te') F({ kind: 'te', form: R.pick(['dec', 'frac', 'comp']) }); else F({ kind: 'comp', cid: R.pick(['C1', 'C2']) });
      const ff = R.pick(['rate', 'conv', 'comp', 'te', 'align', 'sa']); // 5 章: 自由枠は 6 型から一様
      if (ff === 'comp') F({ kind: 'comp', cid: R.pick(['C1', 'C2', 'C3', 'C4', 'C5']) });
      else if (ff === 'te') F({ kind: 'te', form: R.pick(['dec', 'frac', 'comp']) });
      else if (ff === 'sa') free({ kind: 'sa1', saPick: R.r() });
      else free({ kind: ff, dom: R.pick(ff === 'align' ? DOM5 : DOM6), forms: [R.pick(['int', 'dec'])], two: ff === 'conv' && R.coin(0.25) });
      break; }
  }
  return P;
}
// 4.13 章: 鏡像は計画したすべての向きを逆にし、変種 (CP2 と Lv8 の CP1) も入れかえる (4.4 章の C6)。帯、領域、結論、答案の正誤はそのまま
function mirror(P) { return { lv: P.lv, frames: P.frames.map(f => { const g = { ...f }; if (f.freeDir) g.dir = flip(f.dir); if (f.variantFlips) g.variant = f.variant === 'rev' ? 'same' : f.variant === 'same' ? 'rev' : f.variant === 'min' ? 'hour' : 'min'; return g; }) }; }

function saByDir(dir, p) { const L = dir === 'up' ? ['kmph_min', 'mix_persec'] : ['mpm_km', 'sps_min', 'mix_permin']; return L[Math.floor(p * L.length)]; }
const sameRatioDom = d => { const ids = rels1(d); return ids.length > 1 && ids.every(id => near(fOf(id), fOf(ids[0]))); }; // time、weight、volume
function convFrame(R, dom, dir, forms, band, two) { const c = pickCand(R, convCands(dom, two ? rels2(dom) : rels1(dom), dir, forms, band)); return c ? convertQ(c, two ? 2 : 1) : null; }
function srcOf(R, f) {
  if (f.src === 'conv') return convFrame(R, f.dom, f.dir, f.forms || ['int', 'dec'], f.band);
  if (f.src === 'align') return alignQ(R, f.dom, f.dir, f.band);
  if (f.src === 'sa') return speedApplyQ(R, saByDir(f.dir, f.saPick), f.band);
  return null;
}
function chainOf(R, src, band) { // 4.5 章: ちがう関係、同じ型と領域と形、関係がすべて同じ倍率なら逆の向き、帯は計画した帯
  const dir = sameRatioDom(src.domain) ? flip(src.dir) : src.dir;
  for (let k = 0; k < 30; k++) {
    let q = null;
    if (src.pattern === 'convert') { const ids = rels1(src.domain).filter(id => id !== src.rel); const c = pickCand(R, convCands(src.domain, ids, dir, [src.form], band)); q = c ? convertQ(c) : null; }
    else if (src.pattern === 'align_calc') { q = alignQ(R, src.domain, dir, band); if (q && (q.form !== src.form || q.rel === src.rel)) q = null; }
    else if (src.pattern === 'speed_apply') { q = speedApplyQ(R, src.type, band); if (q && q.form !== src.form) q = null; } // 4.5 章: 同じ形
    if (q) return q;
  }
  return null;
}
function realise(R, P) {
  const blocks = [];
  for (const f of P.frames) {
    let b = null;
    switch (f.kind) {
      case 'recall': b = [recallQ(R, f.dom)]; break;
      case 'rate': { const c = pickCand(R, convCands(f.dom, rels1(f.dom), f.dir, f.forms, f.freeDir ? f.band : null)); b = c ? [rateQ(R, c)] : null; break; }
      case 'conv': b = [convFrame(R, f.dom, f.dir, f.forms, f.freeDir ? f.band : null, f.two)]; break;
      case 'conv2': b = [convFrame(R, f.dom, f.dir, f.forms, f.band, true)]; break;
      case 'align': b = [alignQ(R, f.dom, f.dir, f.band)]; break;
      case 'te': b = [timeExpressQ(R, f.form)]; break;
      case 'comp': b = [compoundFree(R, f.cid)]; break;
      case 'cmp': b = [compareQ(R, f.dom, f.dir, f.concl)]; break;
      case 'sa1': b = [speedApplyQ(R, saByDir(f.dir, f.saPick), f.band)]; break;
      case 'sasum': b = [speedApplyQ(R, f.dir === 'up' ? 'mix_persec' : 'mix_permin', f.band)]; break;
      case 'cp1int': { const x = R.pick(need('B_INT')); const mk = d => pickCand(R, convCands(d, rels1(d), 'down', ['int']).filter(c => near(c.st.x, x)));
        const a = mk('time'), c = mk(f.dom2); if (a && c) { b = R.shuffle([convertQ(a), convertQ(c)]); b.cp = 'CP1'; } break; }
      case 'cp1dec': { const list = need(f.dir === 'down' ? 'LV4_CP1_DOWN' : 'LV4_CP1_UP').filter(x => bandOf(x) === f.band); if (!list.length) break; const x = R.pick(list);
        const mk = d => pickCand(R, convCands(d, rels1(d), f.dir, ['dec']).filter(c => near(c.st.x, x)));
        const a = mk('time'), c = mk(f.dom2); if (a && c) { b = R.shuffle([convertQ(a), convertQ(c)]); b.cp = 'CP1'; } break; }
      case 'cp1comp': { const hi = R.pick(need('LV5_CP1_HI')), lo = R.pick(need(f.pc === 'C3' ? 'LV5_CP1_LO_C3' : 'LV5_CP1_LO_C45'));
        b = R.shuffle([compoundQ(f.tc, hi, lo), compoundQ(f.pc, hi, lo)]); b.cp = 'CP1'; break; }
      case 'cp2': { // 4.4 章: 同じ領域、同じ与え。2 問目は逆向きか、同じ向きの倍率のちがう関係
        const doms = DOM5.filter(d => f.variant === 'rev' || rels1(d).some(a => rels1(d).some(c => !near(fOf(a), fOf(c)))));
        const dom = doms[Math.floor(f.u * doms.length)];
        const k = R.pick(need('CP2_GIVEN').filter(x => bandOf(x) === f.band)); if (k === undefined) break;
        const ids = rels1(dom); const id = R.pick(ids); const [bu, su] = R1[id];
        const s1 = f.dir === 'down' ? step(k, bu, su) : step(k, su, bu); const a1 = conv(s1); if (!inRange(a1)) break;
        let s2;
        if (f.variant === 'rev') s2 = step(k, s1.to, s1.from);
        else { const others = ids.filter(o => !near(fOf(o), fOf(id))); if (!others.length) break; const [b2, s2u] = R1[R.pick(others)]; s2 = f.dir === 'down' ? step(k, b2, s2u) : step(k, s2u, b2); }
        const a2 = conv(s2); if (!(a2 > 0) || digits(a2) > 6 || decimals(a2) > 2) break; // 4.4 章: 2 問目は帯の外に出てよい。3 章の範囲は守る
        const q1 = { pattern: 'convert', kind: 'num', step: s1, ans: a1, domain: dom, dir: s1.dir, form: formBig(s1, a1), rel: id, unit: s1.to, steps: 1 };
        const q2 = { pattern: 'convert', kind: 'num', step: s2, ans: a2, domain: dom, dir: s2.dir, form: formBig(s2, a2), rel: null, unit: s2.to, steps: 1 };
        b = [q1, q2]; b.cp = 'CP2'; b.variant = f.variant; break; }
      case 'cp8': { const n = R.pick(need('LV8_N')); // 4.4 章: 時間が先、2 問目は 1 問目と逆の向き
        const t = f.dir === 'down' ? step(n, '分', '秒') : step(n, '秒', '分'); const at = conv(t);
        const sp = f.variant === 'min' ? '分速m' : '時速km';
        const s = f.dir === 'down' ? step(n, sp, '秒速m') : step(n, '秒速m', sp); const as = conv(s);
        if (!inRange(at) || !inRange(as)) break;
        b = [{ pattern: 'convert', kind: 'num', step: t, ans: at, domain: 'time', dir: t.dir, form: formBig(t, at), rel: 'R14', unit: t.to, steps: 1 },
          { pattern: 'convert', kind: 'num', step: s, ans: as, domain: 'speed', dir: s.dir, form: formBig(s, as), rel: f.variant === 'min' ? 'R16' : 'R17', unit: s.to, steps: 1 }];
        b.cp = 'CP1'; b.fixedOrder = true; break; }
      case 'diag': { // 8.1 章: 答案が作れない元は捨てて作り直す (計画の正誤はそのまま)
        let src = null, d = null; for (let k = 0; k < 20 && !d; k++) { src = srcOf(R, f); if (src) d = diagQ(R, src, P.lv, f.correct); }
        if (!d) break; const ch = chainOf(R, src, f.chainBand); if (!ch) break; b = [d, ch]; b.chain = true; break; }
    }
    if (!b || b.some(x => !x)) return null;
    blocks.push(b);
  }
  const items = [];
  R.shuffle(blocks).forEach(b => b.forEach((q, i) => { q.role = b.cp ? (i === 0 ? 'cpA' : 'cpB') : b.chain ? (i === 0 ? 'diag' : 'chain') : ''; q.cpType = b.cp || null; q.cpVariant = b.variant || null; items.push(q); }));
  return items;
}
const pidOf = q => (q.pattern === 'diagnosis' ? 'diagnosis.' + pidOf(q.src) : `${q.pattern}.${q.domain}.${q.dir}.${q.form}`);
function setOk(lv, items, recent) {
  const doms = new Set(items.map(q => (q.pattern === 'diagnosis' ? q.src.domain : q.domain)));
  if (lv <= 3 && (doms.size < 3 || !doms.has('time'))) return false; // 4.2 の 1、2
  if (lv === 10 && (doms.size < 3 || new Set(items.map(q => q.pattern)).size < 4)) return false; // 4.2 の 3
  const pc = {}; for (const q of items) { const k = pidOf(q); pc[k] = (pc[k] || 0) + 1; if (pc[k] > 2) return false; } // 4.2 の 4
  const ks = items.filter(q => q.pattern !== 'recall').flatMap(qty); if (new Set(ks).size !== ks.length) return false; // 4.2 の 5
  const i = items.findIndex(q => q.role === 'cpA'); // 4.4 章: 2 問目の答えが 1 問目の与えとも答えとも同じにならない
  if (i >= 0) { const a = items[i], b = items[i + 1]; if (near(b.ans, a.ans) || near(b.ans, a.step.x)) return false; }
  if (lv === 3) { const ds = items.map(q => q.dir); if (ds.filter(d => d === 'up').length < 2 || ds.filter(d => d === 'down').length < 2) return false; } // 5 章
  for (const p of TRAPS[lv]) if (items.filter(q => !correctOn(q, p)).length < 2) return false; // 4.3 章: 下限 2
  if (recent && questions(items).some(k => recent.has(k))) return false; // 4.2 の 6
  return true;
}
function newState() { return { hist: {} }; }
function buildSet(lv, random, state, opts = {}) {
  const R = rng(random), tries = opts.tries || 30;
  state = state || newState(); const h = state.hist[lv] = state.hist[lv] || [];
  const recent = recentApplies(lv) ? new Set(h.flat()) : null;
  for (let plans = 1; plans <= 200000; plans++) {
    const P = drawPlan(lv, R);
    const tryP = Q => { for (let k = 0; k < tries; k++) { const s = realise(R, Q); if (s && setOk(lv, s, recent)) return s; } return null; };
    const a = tryP(P); if (!a) continue;
    const b = tryP(mirror(P)); if (!b) continue; // 4.13 章: 計画とその鏡像の両方が組めるときだけ採る
    const s = R.coin() ? a : b; s.plans = plans;
    h.push(questions(s)); while (h.length > RECENT) h.shift();
    return s;
  }
  throw new Error('strict_gen: Lv' + lv + ' could not be built');
}
module.exports = { V, UNITS, R1, R2, RECALL_IDS, DOM4, DOM5, DOM6, fOf, domOf, step, conv, PROCS, solve, correctOn, pidOf, qty, asked, questions, RECENT, recentApplies, TRAPS, USABLE, PRIO, buildSet, newState, near, isInt, decimals, digits, inRange, COMP, SA_DIR, gCands, timeNonInt };
