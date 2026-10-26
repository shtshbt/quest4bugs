(function(global){
  "use strict";
  const VALUES = {
  "B_INT": [
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    12,
    15,
    20,
    25,
    40,
    45,
    75,
    120,
    150,
    250
  ],
  "B_DEC": [
    0.5,
    1.5,
    2.5,
    1.2,
    0.8,
    2.4,
    0.25,
    0.75,
    3.5,
    1.25,
    4.5,
    12.5,
    22.5,
    37.5
  ],
  "UP_SMALL_10": [
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9
  ],
  "UP_SMALL_100": [
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9
  ],
  "UP_SMALL_60": [
    6,
    9
  ],
  "SPD_R16": [
    1.5,
    2,
    2.5,
    3,
    4,
    5,
    6,
    10,
    12,
    15,
    20,
    25
  ],
  "SPD_R17": [
    5,
    10,
    15,
    20,
    25
  ],
  "FRAC_HOURS": [
    "1/2",
    "1/3",
    "2/3",
    "1/4",
    "3/4",
    "1/5",
    "1/6",
    "5/6",
    "1/10"
  ],
  "TEXP_HOURS": [
    0.5,
    1.5,
    2.5,
    1.2,
    0.8,
    2.4,
    0.25,
    0.75,
    3.5,
    1.25,
    4.5,
    0.1,
    0.15
  ],
  "TEXP_COMP_H": [
    1,
    2,
    3
  ],
  "TEXP_COMP_M": [
    5,
    10,
    15,
    20,
    25,
    30,
    35,
    40,
    45,
    50,
    55
  ],
  "COMP_TIME_HI": [
    1,
    2,
    3,
    12,
    15
  ],
  "COMP_TIME_LO": [
    5,
    10,
    15,
    20,
    25,
    30,
    35,
    40,
    45,
    50,
    55
  ],
  "COMP_C3_HI": [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    12,
    15
  ],
  "COMP_C3_LO": [
    3,
    5,
    8,
    15,
    25,
    40,
    75
  ],
  "COMP_C3_SHORT": [
    3,
    5,
    8
  ],
  "COMP_C45_HI": [
    1,
    2,
    3,
    4,
    5,
    12,
    15
  ],
  "COMP_C45_LO": [
    50,
    80,
    250,
    400,
    600
  ],
  "COMP_C45_SHORT": [
    50,
    80
  ],
  "ALIGN_TIME_BIG": [
    0.5,
    1.5,
    2.5,
    1.2,
    0.8,
    2.4,
    0.25,
    0.75,
    3.5,
    1.25,
    4.5
  ],
  "ALIGN_TIME_S_DOWN": [
    5,
    10,
    15,
    20,
    25,
    30,
    35,
    40,
    45,
    50,
    55
  ],
  "ALIGN_TIME_S_UP": [
    15,
    30,
    45,
    6,
    9
  ],
  "ALIGN_K": [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9
  ],
  "SA_KMPH_V": [
    12,
    15,
    18,
    24,
    30,
    36,
    42,
    48,
    54,
    60
  ],
  "SA_KMPH_T_BIG": [
    10,
    15,
    20,
    25,
    30,
    35,
    40,
    45,
    50
  ],
  "SA_KMPH_T_SMALL": [
    3,
    5,
    6
  ],
  "SA_MPM_V": [
    50,
    60,
    75,
    80,
    100,
    120,
    150
  ],
  "SA_MPM_D_BIG": [
    10,
    12,
    15,
    18,
    20
  ],
  "SA_MPM_D_SMALL": [
    0.6,
    0.7,
    0.8,
    0.9,
    1,
    1.1,
    1.2,
    1.3,
    1.4,
    1.5,
    1.6,
    1.7,
    1.8,
    1.9,
    2,
    2.1,
    2.2,
    2.3,
    2.4,
    2.5,
    2.6,
    2.7,
    2.8,
    2.9,
    3
  ],
  "SA_SPS_V": [
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25
  ],
  "SA_SPS_T_BIG": [
    10,
    15,
    20
  ],
  "SA_SPS_T_SMALL": [
    1,
    2,
    3,
    4,
    5
  ],
  "SA_MIX_A": [
    60,
    90,
    120,
    150,
    180,
    240
  ],
  "SA_MIX_B": [
    10,
    12,
    15,
    20,
    25
  ],
  "LV4_CP1_DOWN": [
    0.5,
    1.5,
    2.5,
    1.2,
    0.8,
    2.4,
    0.25,
    0.75,
    3.5,
    1.25,
    4.5,
    12.5,
    22.5,
    37.5
  ],
  "LV4_CP1_UP": [
    90,
    45,
    15,
    30,
    72,
    75,
    150,
    270,
    6,
    9
  ],
  "LV5_CP1_HI": [
    1,
    2,
    3,
    12,
    15
  ],
  "LV5_CP1_LO_C3": [
    5,
    15,
    25,
    40
  ],
  "LV5_CP1_LO_C45": [
    50
  ],
  "LV8_N": [
    18,
    36,
    54,
    72,
    90,
    180
  ],
  "CP2_GIVEN": [
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    12,
    15,
    20,
    25,
    40,
    45,
    75,
    120,
    150,
    250,
    30,
    50,
    60,
    90,
    300,
    500,
    600
  ]
};
  const V = VALUES;
  const need = name => V[name];
  const fracVal = s => { const [a,b] = String(s).split("/").map(Number); return a/b; };
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const isInt = x => near(x, Math.round(x));
const rd = x => Math.round(x * 1e9) / 1e9;
function decimals(x) { for (let d = 0; d <= 8; d++) if (near(x * 10 ** d, Math.round(x * 10 ** d))) return d; return 99; }
const digits = x => String(Math.floor(Math.abs(x) + 1e-9)).length;
const inRange = x => x > 0 && digits(x) <= 6 && decimals(x) <= 2;

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
const RELS1 = Object.fromEntries(DOM6.map(dom => [dom, Object.keys(R1).filter(id => id !== 'R13' && domOf(id) === dom)]));
const RELS2 = Object.fromEntries(DOM6.map(dom => [dom, Object.keys(R2).filter(id => domOf(id) === dom)]));
const rels1 = dom => RELS1[dom];
const rels2 = dom => RELS2[dom];
function step(x, from, to) {
  const [d1, s1] = UNITS[from], [d2, s2] = UNITS[to]; if (d1 !== d2) throw new Error('step across domains');
  const f = rd(s1 > s2 ? s1 / s2 : s2 / s1);
  return { x, from, to, f, dom: d1, dir: s1 > s2 ? 'down' : 'up', exact: DOM4.includes(d1) ? decimal(x) : rational(x) };
}
function gcd(a, b) { while (b) { const c = a % b; a = b; b = c; } return Math.abs(a); }
function rational(x) {
  if (Number.isInteger(x)) return { num: x, den: 1 };
  if (x && Number.isInteger(x.num) && Number.isInteger(x.den) && x.den > 0) return x;
  if (x && Number.isInteger(x.mantissa) && Number.isInteger(x.exp)) {
    const num = x.mantissa * 10 ** Math.max(0, x.exp), den = 10 ** Math.max(0, -x.exp), g = gcd(num, den);
    return { num: num / g, den: den / g };
  }
  const s = String(x), parts = s.toLowerCase().split('e'), exp = Number(parts[1] || 0) - ((parts[0].split('.')[1] || '').length);
  const p = s.includes('/') ? s.split('/').map(Number) : [Number(parts[0].replace('.', '')) * 10 ** Math.max(0, exp), 10 ** Math.max(0, -exp)];
  const g = gcd(p[0], p[1]); return { num: p[0] / g, den: p[1] / g };
}
function arithmetic(a, op, b) {
  a = rational(a); b = rational(b);
  const n = op === 'x' ? a.num * b.num : op === '/' ? a.num * b.den : a.num * b.den + (op === '+' ? 1 : -1) * b.num * a.den;
  const d = op === 'x' ? a.den * b.den : op === '/' ? a.den * b.num : a.den * b.den;
  const g = gcd(n, d); return { num: n / g, den: d / g };
}
const valueOf = r => r.num / r.den;
const calc = (a, op, b) => valueOf(arithmetic(a, op, b));
function decimal(x) {
  if (x && Number.isInteger(x.mantissa) && Number.isInteger(x.exp)) return x;
  const s = String(x).toLowerCase().split('e');
  return { mantissa: Number(s[0].replace('.', '')), exp: Number(s[1] || 0) - ((s[0].split('.')[1] || '').length) };
}
const decimalValue = d => Number(d.mantissa + 'e' + d.exp);
function decimalCalc(a, op, b) {
  a = decimal(a); b = decimal(b); const exp = Math.min(a.exp, b.exp);
  return { mantissa: a.mantissa * 10 ** (a.exp - exp) + (op === '+' ? 1 : -1) * b.mantissa * 10 ** (b.exp - exp), exp };
}
function converted(st) {
  if (DOM4.includes(st.dom)) { const a = decimal(st.exact || st.x); return { mantissa: a.mantissa, exp: a.exp + (st.dir === 'down' ? 1 : -1) * Math.round(Math.log10(st.f)) }; }
  return arithmetic(st.exact || st.x, st.dir === 'down' ? 'x' : '/', st.f);
}
const conv = st => DOM4.includes(st.dom) ? decimalValue(converted(st)) : valueOf(converted(st));
const opOf = st => (st.dir === 'down' ? 'x' : '/');

function rng(random) {
  let last, repeated = 0;
  const r = () => { const x = random(); if (typeof x !== 'number' || !(x >= 0 && x < 1)) throw new Error('random() out of range'); repeated = x === last ? repeated + 1 : 0; last = x; return x; };
  return { r, stagnant: () => repeated >= 128, pick: a => a[Math.floor(r() * a.length)], coin: (p = 0.5) => r() < p,
    shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; } };
}

function timeNonInt(st) {
  const r = st.dir === 'down' ? st.x * st.f : st.x / st.f;
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
const ap = (x, o) => o.op === 'x' ? x * o.f : x / o.f;
function solve(q, proc) { // returns {val} or {opt}
  const P = typeof proc === 'function' ? proc : PROCS[proc];
  const c = st => ap(st.x, P(st));
  switch (q.pattern) {
    case 'recall': case 'convert': return { val: rd(c(q.step)) };
    case 'compound_in': return { val: rd(c(q.step) + q.lo) };
    case 'align_calc': { const v = c(q.step); return { val: rd(q.dir === 'down' ? (q.plus ? v + q.keep : v - q.keep) : (q.plus ? q.keep + v : q.keep - v)) }; }
    case 'speed_apply': { const o = P(q.step); return { val: rd(q.combine(arithmetic(q.step.exact || q.step.x, o.op, o.f))) }; }
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
  return q.kind === 'num' || q.kind === 'num_unit' ? near(r.val, q.ans) : r.opt === q.ansOpt;
}

const bandOf = x => (x >= 10 ? 'hi' : 'lo');
const formBig = (st, ans) => { const big = st.dir === 'down' ? st.x : ans; return isInt(big) ? 'int' : 'dec'; };
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
      const value = rd(dir === 'down' ? v.x * f : v.x / f);
      const form = v.frac ? 'frac' : (isInt(dir === 'down' ? v.x : value) ? 'int' : 'dec');
      if (!forms.includes(form)) continue;
      if (!v.frac && !inRange(v.x)) continue; if (!inRange(value)) continue;
      if (band && bandOf(v.x) !== band) continue;
      const st = step(v.x, from, to); if (v.frac) st.exact = rational(v.frac); const ans = conv(st);
      out.push({ id, st, ans, form, frac: v.frac || null });
    }
  }
  return out;
}
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
const COMP = { C1: ['time', '時間', '分'], C2: ['time', '分', '秒'], C3: ['length', 'm', 'cm'], C4: ['length', 'km', 'm'], C5: ['weight', 'kg', 'g'] };
function compoundQ(cid, hi, lo) {
  const [dom, uh, ul] = COMP[cid]; const st = step(hi, uh, ul); st.comp = dom === 'time';
  return { pattern: 'compound_in', kind: 'num', step: st, lo, hi, cid, ans: DOM4.includes(dom) ? decimalValue(decimalCalc(converted(st), '+', lo)) : calc(converted(st), '+', lo), domain: dom, dir: 'down', form: 'comp', unit: ul };
}
const sig2 = x => { if (x < 10) return Math.round(x); const p = 10 ** (Math.floor(Math.log10(x)) - 1); return rd(Math.round(x / p) * p); };
function compareQ(R, dom, dir, concl) { // 9.2 章の compare の値、4.13 章
  const id = R.pick(rels1(dom)); const [bu, su] = R1[id]; const f = fOf(id);
  const vb = R.pick(R.coin() ? need('B_INT') : need('B_DEC'));
  const c = rd(vb * f); let vs;
  if (concl === 'same') vs = c;
  else if (concl === 'small') vs = (dom === 'time' && !isInt(vb) && R.coin()) ? rd(vb * 100) : sig2(R.coin() ? c * (1.1 + 0.4 * R.r()) : c * (8 + 4 * R.r()));
  else vs = sig2(R.coin() ? c * (0.5 + 0.4 * R.r()) : c * (0.08 + 0.04 * R.r()));
  const ratio = vs / c;
  if (concl === 'small' && !(ratio > 1 + 1e-9 && ((ratio >= 1.1 - 1e-9 && ratio <= 1.5 + 1e-9) || (ratio >= 8 - 1e-9 && ratio <= 12 + 1e-9) || near(vs, vb * 100)))) return null;
  if (concl === 'big' && !((ratio >= 0.5 - 1e-9 && ratio <= 0.9 + 1e-9) || (ratio >= 0.08 - 1e-9 && ratio <= 0.12 + 1e-9))) return null;
  if (!inRange(vs) || !inRange(vb) || vs < 1) return null;
  const x = dir === 'down' ? vb : vs; if (x < 10) return null;
  if (dir === 'up' && decimals(vs / f) > 2) return null;
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
  const convertedValue = converted(st), left = dir === 'down' ? convertedValue : keep, right = dir === 'down' ? keep : convertedValue;
  const ans = DOM4.includes(dom) ? decimalValue(decimalCalc(left, plus ? '+' : '-', right)) : calc(left, plus ? '+' : '-', right);
  if (!(ans > 0) || !inRange(ans) || !inRange(A) || !inRange(B)) return null;
  return { pattern: 'align_calc', kind: 'num', step: st, keep, plus, ans, domain: dom, dir, form: isInt(A) ? 'int' : 'dec', rel: id || cpair, cpair, A: { v: A, u: bu }, B: { v: B, u: su }, unit: dir === 'down' ? su : bu };
}
const SA_DIR = { kmph_min: 'up', mix_persec: 'up', mpm_km: 'down', sps_min: 'down', mix_permin: 'down' };
const SPEED_COMBINES = new Map();
function speedApplyQ(R, type, band) { // 9.2 章の speed_apply の小型
  let st, combine, ans, vals, unit;
  if (type === 'kmph_min') { const v = R.pick(need('SA_KMPH_V')), t = R.pick(need(band === 'lo' ? 'SA_KMPH_T_SMALL' : 'SA_KMPH_T_BIG')); st = step(t, '分', '時間'); combine = h => calc(v, 'x', h); ans = combine(converted(st)); if (decimals(ans) > 1) return null; vals = { v, t }; unit = 'km'; }
  else if (type === 'mpm_km') { const v = R.pick(need('SA_MPM_V')), d = R.pick(need(band === 'hi' ? 'SA_MPM_D_BIG' : 'SA_MPM_D_SMALL')); st = step(d, 'km', 'm'); combine = m => calc(m, '/', v); ans = combine(converted(st)); if (!isInt(ans)) return null; vals = { v, d }; unit = '分'; }
  else if (type === 'sps_min') { const v = R.pick(need('SA_SPS_V')), t = R.pick(need(band === 'hi' ? 'SA_SPS_T_BIG' : 'SA_SPS_T_SMALL')); st = step(t, '分', '秒'); combine = s => calc(v, 'x', s); ans = combine(converted(st)); vals = { v, t }; unit = 'm'; }
  else { if (band === 'lo') return null; const a = R.pick(need('SA_MIX_A')), b = R.pick(need('SA_MIX_B'));
    if (type === 'mix_persec') { st = step(a, '分速m', '秒速m'); combine = x => calc(x, '+', b); } else { st = step(b, '秒速m', '分速m'); combine = x => calc(a, '+', x); }
    ans = combine(converted(st));
    vals = { a, b }; unit = 'm'; }
  if (band && bandOf(st.x) !== band) return null;
  if (!inRange(ans)) return null;
  const key = JSON.stringify([type, vals]);
  if (SPEED_COMBINES.has(key)) combine = SPEED_COMBINES.get(key); else SPEED_COMBINES.set(key, combine);
  return { pattern: 'speed_apply', kind: 'num', type, step: st, combine, ans, domain: 'speed', dir: SA_DIR[type], form: isInt(ans) ? 'int' : 'dec', vals, unit };
}

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
    if (!Number.isFinite(shown) || near(shown, src.ans) || !inRange(shown)) return null;
    label = PRIO.find(p => ops.some(([l, g]) => l === p && near(sheetVal(src, g), shown)));
    sheet = fn ? Object.assign(fn(src.step), { raw: false }) : { raw: true };
    sheet.l0 = l0;
  }
  const rest = R.shuffle(usable.filter(x => x !== label && x !== 'correct'));
  const opts = [label]; if (label !== 'correct') opts.push('correct');
  while (opts.length < 4) opts.push(rest.shift());
  const options = R.shuffle(opts);
  return { pattern: 'diagnosis', kind: 'choice', src, shown, options, ansOpt: options.indexOf(label), label, sheet, domain: src.domain, dir: src.dir };
}

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
const recentApplies = lv => lv !== 8;

const TRAPS = { 1: ['M1mag', 'M1magR'], 2: ['M1mag', 'M1magR'], 3: ['M1mag', 'M1magR', 'M1', 'M1d'] };
for (let lv = 4; lv <= 10; lv++) TRAPS[lv] = ['M1mag', 'M1magR', 'M1', 'M1d', 'M2', ...(lv >= 8 ? ['M3'] : [])];
const flip = d => (d === 'down' ? 'up' : 'down');
function drawPlan(lv, R) {
  const P = { lv, frames: [] };
  const F = o => P.frames.push(o);
  const dir = () => (R.coin() ? 'down' : 'up'), band = () => (R.coin() ? 'hi' : 'lo');
  const free = o => F({ ...o, dir: dir(), band: band(), chainBand: band(), freeDir: true });
  const correct = () => R.coin(0.25);
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
    case 6: { const u = R.r(); const concl = u < 0.24 ? 'big' : (u < 0.45 ? 'same' : 'small');
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
      const ff = R.pick(['rate', 'conv', 'comp', 'te', 'align', 'sa']);
      if (ff === 'comp') F({ kind: 'comp', cid: R.pick(['C1', 'C2', 'C3', 'C4', 'C5']) });
      else if (ff === 'te') F({ kind: 'te', form: R.pick(['dec', 'frac', 'comp']) });
      else if (ff === 'sa') free({ kind: 'sa1', saPick: R.r() });
      else free({ kind: ff, dom: R.pick(ff === 'align' ? DOM5 : DOM6), forms: [R.pick(['int', 'dec'])], two: ff === 'conv' && R.coin(0.25) });
      break; }
  }
  return P;
}
function mirror(P) { return { lv: P.lv, frames: P.frames.map(f => { const g = { ...f }; if (f.freeDir) g.dir = flip(f.dir); if (f.variantFlips) g.variant = f.variant === 'rev' ? 'same' : f.variant === 'same' ? 'rev' : f.variant === 'min' ? 'hour' : 'min'; return g; }) }; }

function saByDir(dir, p) { const L = dir === 'up' ? ['kmph_min', 'mix_persec'] : ['mpm_km', 'sps_min', 'mix_permin']; return L[Math.floor(p * L.length)]; }
const SAME_RATIO = Object.fromEntries(DOM6.map(d => { const ids = rels1(d); return [d, ids.length > 1 && ids.every(id => near(fOf(id), fOf(ids[0])))]; }));
const sameRatioDom = d => SAME_RATIO[d];
const pidOf = q => (q.pattern === 'diagnosis' ? 'diagnosis.' + pidOf(q.src) : `${q.pattern}.${q.domain}.${q.dir}.${q.form}`);
function setOk(lv, items, recent) {
  const doms = new Set(items.map(q => (q.pattern === 'diagnosis' ? q.src.domain : q.domain)));
  if (lv <= 3 && (doms.size < 3 || !doms.has('time'))) return false;
  if (lv === 10 && (doms.size < 3 || new Set(items.map(q => q.pattern)).size < 4)) return false;
  const pc = {}; for (const q of items) { const k = pidOf(q); pc[k] = (pc[k] || 0) + 1; if (pc[k] > 2) return false; } // 4.2 の 4
  const ks = items.filter(q => q.pattern !== 'recall').flatMap(qty); if (new Set(ks).size !== ks.length) return false;
  const i = items.findIndex(q => q.role === 'cpA');
  if (i >= 0) { const a = items[i], b = items[i + 1]; if (near(b.ans, a.ans) || near(b.ans, a.step.x)) return false; }
  if (lv === 3) { const ds = items.map(q => q.dir); if (ds.filter(d => d === 'up').length < 2 || ds.filter(d => d === 'down').length < 2) return false; } // 5 章
  for (const p of TRAPS[lv]) if (items.filter(q => !correctOn(q, p)).length < 2) return false;
  if (recent && questions(items).some(k => recent.has(k))) return false;
  return true;
}

const POOLS = new Map();
const DATA_POOLS = new Map();
const GROUPS = new Map();
const META_POOLS = new Map();
let poolRandom;
let metadataMode = false;
const PROBE_NAMES = ['M1mag', 'M1magR', 'M1', 'M1d', 'M2', 'M3'];
function enumerate(fn) {
  const out = [], path = [], sizes = [];
  let more = true;
  while (more) {
    let i = 0;
    const choose = a => { sizes[i] = a.length; if (path[i] === undefined) path[i] = 0; return a[path[i++]]; };
    const q = fn({ pick: choose, coin: () => choose([true, false]), r: () => choose([0, 0.25, 0.5, 0.75, 0.999999]), shuffle: a => a.slice() });
    if (q) { q._recipe = path.slice(0, i); out.push(q); }
    path.length = i;
    while (i > 0 && ++path[i - 1] === sizes[i - 1]) { path.pop(); i--; }
    more = i > 0;
  }
  return out;
}
function timePool(form) {
  const out = [];
  if (form === 'comp') {
    for (const H of V.TEXP_COMP_H) for (const M of V.TEXP_COMP_M) {
      const X = 60 * H + M; if (X < 100) continue;
      for (const delta of [-10, 10]) if (M + delta >= 0 && M + delta < 60) out.push({ pattern: 'time_express', kind: 'choice', step: step(X, '分', '時間'), domain: 'time', dir: 'up', form,
        options: [{ t: 'correct', H, M }, { t: 'sixty', H: Math.floor(X / 100), M: X % 100 }, { t: 'calc', H, M: M + delta }, { t: 'place', H: Math.floor(X / 10), M: X % 10 }], ansOpt: 0 });
    }
  } else for (const h of form === 'frac' ? V.FRAC_HOURS : V.TEXP_HOURS) {
    const hour = rational(h), X = calc(hour, 'x', 60); if (!isInt(X)) continue;
    const v = valueOf(hour), actualForm = isInt(v * 100) ? 'dec' : 'frac';
    if (form !== 'frac' && (decimals(X / 6) > 3 || decimals(X / 600) > 3)) continue;
    for (const f of [6, 600]) out.push({ pattern: 'time_express', kind: 'choice', step: step(X, '分', '時間'), domain: 'time', dir: 'up', form: actualForm,
      options: [{ t: 'correct', val: v }, { t: 'sixty', val: calc(X, '/', 100) }, { t: 'calc', val: calc(X, '/', f) }, { t: 'rev', val: X * 60 }], ansOpt: 0, calcBelow: f === 600 });
  }
  return out;
}
function pool(kind, dom, dir, forms, band, extra) {
  if (kind === 'align' || kind === 'cmp' || kind === 'sa') forms = undefined;
  if (metadataMode) {
    const data = global.Q4B_KOMOREBI_UNIT_MIX_DATA, key = JSON.stringify([kind, kind === 'sa' ? undefined : dom, kind === 'sa' ? undefined : dir, band || null, extra]);
    if (!META_POOLS.has(key)) META_POOLS.set(key, (data.meta[key] || []).map(i => {
      const [pattern, domain, dir, form, rel, type, _traps, _diag] = data.metaRows[i];
      return { pattern, domain, dir, form, rel, type, _traps, _diag };
    }));
    const rows = META_POOLS.get(key);
    return rows.filter(q => !forms || forms.includes(q.form));
  }
  const key = JSON.stringify([kind, dom, dir, forms, band, extra]); if (POOLS.has(key)) return POOLS.get(key);
  let a;
  const data = global.Q4B_KOMOREBI_UNIT_MIX_DATA;
  const dataKey = JSON.stringify(kind === 'sa' ? [kind, band, extra] : [kind, dom, dir, extra]);
  if (data && data[dataKey] && poolRandom) {
    if (DATA_POOLS.has(key)) return DATA_POOLS.get(key);
    a = data[dataKey].flatMap(encoded => {
      const group = encoded.split('.');
      const start = Math.floor(poolRandom.r() * group.length), out = [];
      for (let j = 0; j < Math.min(12, group.length); j++) {
        const path = group[(start + j) % group.length]; let i = 0;
        const choose = values => values[kind === 'cmp' && i === path.length - 1 ? (poolRandom.coin() ? 0 : 1) : path.charCodeAt(i++) - 65];
        const R = { pick: choose, coin: () => choose([true, false]), r: () => choose([0, 0.25, 0.5, 0.75, 0.999999]) };
        out.push(kind === 'align' ? alignQ(R, dom, dir, band) : kind === 'sa' ? speedApplyQ(R, extra, band) : compareQ(R, dom, dir, extra));
      }
      return out.filter(q => q && (!band || bandOf(q.step.x) === band));
    });
  } else if (kind === 'conv' || kind === 'conv2' || kind === 'rate') {
    a = kind === 'rate' ? pool('conv', dom, dir, forms, band) : convCands(dom, kind === 'conv2' ? rels2(dom) : rels1(dom), dir, forms || ['int', 'dec'], band).map(c => convertQ(c, kind === 'conv2' ? 2 : 1));
    if (kind === 'rate') a = a.map(q => ({ ...q, pattern: 'rate_select', kind: 'choice', options: [{ op: opOf(q.step), f: q.step.f }], ansOpt: 0 }));
  } else if (kind === 'align') a = enumerate(R => alignQ(R, dom, dir, band));
  else if (kind === 'sa') a = enumerate(R => speedApplyQ(R, extra, band));
  else if (kind === 'cmp') a = enumerate(R => compareQ(R, dom, dir, extra));
  else if (kind === 'recall') a = RECALL_IDS.filter(id => domOf(id) === dom).map(id => { const [b, s] = R1[id]; return { pattern: 'recall', kind: 'num', step: step(1, b, s), ans: fOf(id), domain: dom, dir: 'down', form: 'int', rel: id, unit: s }; });
  else if (kind === 'te') a = timePool(extra);
  else if (kind === 'comp') {
    const time = COMP[extra][0] === 'time', c3 = extra === 'C3';
    a = (time ? V.COMP_TIME_HI : c3 ? V.COMP_C3_HI : V.COMP_C45_HI).flatMap(hi => (time ? V.COMP_TIME_LO : c3 ? V.COMP_C3_LO : V.COMP_C45_LO).map(lo => compoundQ(extra, hi, lo)));
  }
  a = a || [];
  for (const q of a) { q._traps = PROBE_NAMES.map(p => +!correctOn(q, p)); q._qty = qty(q); q._questions = questions([q]); }
  if (data && data[dataKey] && poolRandom) DATA_POOLS.set(key, a); else POOLS.set(key, a); return a;
}
function groups(a) {
  if (GROUPS.has(a)) return GROUPS.get(a);
  const m = new Map();
  for (const q of a) { const k = [pidOf(q), q.rel, q.type, q._traps.join('')].join('|'); if (!m.has(k)) m.set(k, []); m.get(k).push(q); }
  const rows = [...m.values()]; GROUPS.set(a, rows); return rows;
}
function pairPool(f) {
  const out = [], mark = b => { out.push(b); };
  if (f.kind === 'cp1int' || f.kind === 'cp1dec') {
    const d = f.kind === 'cp1int' ? 'down' : f.dir, forms = [f.kind === 'cp1int' ? 'int' : 'dec'];
    const a = pool('conv', 'time', d, forms, f.kind === 'cp1int' ? null : f.band);
    const b = pool('conv', f.dom2, d, forms, f.kind === 'cp1int' ? null : f.band);
    const values = f.kind === 'cp1int' ? V.B_INT : V[d === 'down' ? 'LV4_CP1_DOWN' : 'LV4_CP1_UP'];
    for (const x of a) for (const y of b) if (near(x.step.x, y.step.x) && values.some(v => near(v, x.step.x)) && !near(x.ans, y.ans)) mark([x, y]);
  } else if (f.kind === 'cp1comp') {
    for (const hi of V.LV5_CP1_HI) for (const lo of f.pc === 'C3' ? V.LV5_CP1_LO_C3 : V.LV5_CP1_LO_C45) mark([compoundQ(f.tc, hi, lo), compoundQ(f.pc, hi, lo)]);
  } else if (f.kind === 'cp8') {
    for (const n of V.LV8_N) {
      const t = f.dir === 'down' ? step(n, '分', '秒') : step(n, '秒', '分'), u = f.variant === 'min' ? '分速m' : '時速km';
      const s = f.dir === 'down' ? step(n, u, '秒速m') : step(n, '秒速m', u);
      if (f.dir === 'up' && formBig(t, conv(t)) !== 'dec') continue;
      mark([t, s].map((st, i) => ({ pattern: 'convert', kind: 'num', step: st, ans: conv(st), domain: st.dom, dir: st.dir, form: formBig(st, conv(st)), rel: i === 0 ? 'R14' : f.variant === 'min' ? 'R16' : 'R17', steps: 1, unit: st.to })));
    }
  } else if (f.kind === 'cp2') {
    const ds = DOM5.filter(d => f.variant === 'rev' || rels1(d).some(a => rels1(d).some(b => fOf(a) !== fOf(b))));
    const dom = ds[Math.floor(f.u * ds.length)], ids = rels1(dom);
    for (const x of V.CP2_GIVEN.filter(v => bandOf(v) === f.band)) for (const id of ids) {
      const [bu, su] = R1[id], st = f.dir === 'down' ? step(x, bu, su) : step(x, su, bu);
      for (const other of f.variant === 'rev' ? [id] : ids.filter(b => fOf(b) !== fOf(id))) {
        const [b, s] = R1[other], d = f.variant === 'rev' ? flip(f.dir) : f.dir, st2 = d === 'down' ? step(x, b, s) : step(x, s, b);
        const a1 = conv(st), a2 = conv(st2); if (!inRange(a1) || !inRange(a2) || near(a1, a2) || near(a2, x)) continue;
        const first = { pattern: 'convert', kind: 'num', step: st, ans: a1, domain: dom, dir: st.dir, form: formBig(st, a1), rel: id, unit: st.to, steps: 1 };
        const inBand = pool('conv', dom, f.dir, ['int', 'dec'], f.band).some(q => q.rel === id && near(q.step.x, x)); if (!inBand) continue;
        mark([first, { ...first, step: st2, ans: a2, dir: d, form: formBig(st2, a2), rel: other, unit: st2.to }]);
      }
    }
  }
  return out;
}
const FRAME_ROWS = new Map();
const META_FRAME_ROWS = new Map();
const PLAN_FEASIBILITY = new Map();
function frameRows(f, lv) {
  const key = [lv, f.kind, f.dom, f.dom2, f.dir, f.forms, f.band, f.kind === 'diag' ? f.chainBand : '', f.correct, f.src, f.saPick === undefined ? '' : saByDir(f.dir, f.saPick), f.variant, f.tc, f.pc, f.cid, f.form, f.freeDir, f.two, f.u === undefined ? '' : Math.floor(f.u * (f.variant === 'same' ? 2 : 5)), f.concl].join('|'), cache = metadataMode ? META_FRAME_ROWS : FRAME_ROWS;
  if (cache.has(key)) return cache.get(key);
  let rows = [];
  if (f.kind.startsWith('cp')) {
    const m = new Map();
    for (const b of pairPool(f)) {
      const counts = PROBE_NAMES.map(p => b.filter(q => !correctOn(q, p)).length), k = b.map(pidOf).join('|') + counts.join('');
      if (!m.has(k)) m.set(k, { parts: [], pairs: [], counts }); m.get(k).pairs.push(b);
    }
    rows = [...m.values()];
  } else if (f.kind === 'diag') {
    const kind = f.src === 'sa' ? 'sa' : f.src, type = f.src === 'sa' ? saByDir(f.dir, f.saPick) : undefined;
    const a = pool(kind, f.dom, f.dir, f.forms, f.band, type);
    for (const srcs of groups(a)) {
      const src = srcs[0], d = src.pattern !== 'speed_apply' && sameRatioDom(src.domain) ? flip(src.dir) : src.dir;
      const candidates = pool(kind, f.dom, d, [src.form], f.chainBand, type);
      const valid = f.correct || srcs.every(diagnosable) ? srcs : srcs.filter(diagnosable);
      for (const cs of groups(candidates)) {
        const ch = cs[0]; if (ch.form !== src.form || (src.pattern !== 'speed_apply' && ch.rel === src.rel)) continue;
        if (valid.length) rows.push({ parts: [valid, cs], counts: src._traps.map((n, i) => n + ch._traps[i]), diag: true });
      }
    }
  } else {
    const kind = ['sa1', 'sasum'].includes(f.kind) ? 'sa' : f.kind;
    const type = f.kind === 'sa1' ? saByDir(f.dir, f.saPick) : f.kind === 'sasum' ? (f.dir === 'up' ? 'mix_persec' : 'mix_permin') : f.kind === 'te' ? f.form : f.kind === 'comp' ? f.cid : f.concl;
    rows = groups(pool(kind, f.dom, f.dir, f.forms, f.freeDir ? f.band : null, type)).map(a => ({ parts: [a], counts: a[0]._traps }));
  }
  cache.set(key, rows); return rows;
}
function diagnosable(q) {
  if (q._diag === undefined) q._diag = errOps(q).some(([, fn]) => inRange(sheetVal(q, fn)) && !near(sheetVal(q, fn), q.ans));
  return q._diag;
}
function composePlan(P, R, recent, keep, checkOnly, available) {
  const rows = P.frames.map(f => {
    const a = frameRows(f, P.lv);
    if (!recent) return a;
    if (!available.has(a)) available.set(a, a.filter(row => row.pairs ? row.pairs.some(pair => pair.every(q => !(q._questions || questions([q])).some(k => recent.has(k)))) : row.parts.every(part => {
      if (!available.has(part)) available.set(part, part.some(q => !(q._questions || questions([q])).some(k => recent.has(k))));
      return available.get(part);
    })));
    return available.get(a);
  }); if (rows.some(a => !a.length)) return null;
  let feasibleKey;
  if (metadataMode && checkOnly) {
    feasibleKey = P.lv + ':' + rows.map(a => {
      if (!a.signature) a.signature = [...new Set(a.map(row => row.counts.join('')))].sort().join(',');
      return a.signature;
    }).join('|');
    if (PLAN_FEASIBILITY.has(feasibleKey)) return PLAN_FEASIBILITY.get(feasibleKey);
  }
  const required = TRAPS[P.lv].map(p => PROBE_NAMES.indexOf(p));
  const suffix = Array.from({ length: rows.length + 1 }, () => PROBE_NAMES.map(() => 0));
  for (let i = rows.length - 1; i >= 0; i--) for (const p of required) suffix[i][p] = suffix[i + 1][p] + Math.max(...rows[i].map(r => r.counts[p]));
  if (required.some(p => suffix[0][p] < 2)) return null;
  const feasible = new Map();
  function possible(i, counts) {
    if (required.some(p => counts[p] + suffix[i][p] < 2)) return false;
    if (i === rows.length) return true;
    const key = i + ':' + required.map(p => Math.min(2, counts[p])).join('');
    if (feasible.has(key)) return feasible.get(key);
    const ok = rows[i].some(row => possible(i + 1, counts.map((n, p) => n + row.counts[p])));
    feasible.set(key, ok); return ok;
  }
  if (checkOnly) {
    const ok = possible(0, PROBE_NAMES.map(() => 0));
    if (feasibleKey) PLAN_FEASIBILITY.set(feasibleKey, ok);
    return ok;
  }
  let budget = 40;
  function choose(i, counts, chosen) {
    if (--budget < 0 || !possible(i, counts)) return null;
    if (i === rows.length) return materialise(P, chosen, R, recent, keep);
    const start = Math.floor(R.r() * rows[i].length);
    for (let j = 0; j < rows[i].length; j++) {
      const row = rows[i][(start + j) % rows[i].length];
      const s = choose(i + 1, counts.map((n, p) => n + row.counts[p]), chosen.concat([row])); if (s) return s;
      if (budget < 0) break;
    }
    return null;
  }
  return choose(0, PROBE_NAMES.map(() => 0), []);
}
function trapPlanPossible(P) {
  const counts = Object.fromEntries(PROBE_NAMES.map(p => [p, 0]));
  function count(dir, band, time, speed) {
    counts.M1 += +(dir === 'up'); counts.M1d += +(dir === 'down');
    counts.M1mag += +(band === undefined || (dir === 'down' ? band === 'hi' : band === 'lo'));
    counts.M1magR += +(band === undefined || (dir === 'down' ? band === 'lo' : band === 'hi'));
    counts.M2 += +time; counts.M3 += +speed;
  }
  for (const f of P.frames) {
    if (f.kind === 'recall') count('down', 'lo', false, false);
    else if (f.kind === 'cp1int' || f.kind === 'cp1comp') { count('down', 'hi', f.kind === 'cp1comp', false); count('down', 'hi', false, false); counts.M1magR += 2; }
    else if (f.kind === 'cp1dec') { count(f.dir, f.band, true, false); count(f.dir, f.band, false, false); }
    else if (f.kind === 'cp2') { count(f.dir, f.band, true, false); count(f.variant === 'rev' ? flip(f.dir) : f.dir, f.band, true, false); }
    else if (f.kind === 'cp8') { count(f.dir, 'hi', true, false); count(flip(f.dir), 'hi', true, true); }
    else if (f.kind === 'te') count('up', 'hi', true, false);
    else if (f.kind === 'comp') { count('down', 'hi', COMP[f.cid][0] === 'time', false); counts.M1magR++; }
    else if (f.kind === 'cmp') { if (f.concl !== 'small') count(f.dir, 'hi', true, false); }
    else {
      const speed = f.dom === 'speed' || ['sa1', 'sasum'].includes(f.kind), time = speed || f.dom === 'time' && (!f.forms || f.forms.some(form => form !== 'int'));
      count(f.dir, f.band, time, speed);
      if (f.kind === 'diag') count(f.src !== 'sa' && sameRatioDom(f.dom) ? flip(f.dir) : f.dir, f.chainBand, time, speed);
    }
  }
  return TRAPS[P.lv].every(p => counts[p] >= 2);
}
function materialise(P, rows, R, recent, keep) {
  const used = new Set(), blocks = [];
  function allowed(q) {
    return (q.pattern === 'recall' || !(q._qty || qty(q)).some(k => used.has(k))) && (!recent || !(q._questions || questions([q])).some(k => recent.has(k)));
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], f = P.frames[i]; let block = [];
    if (row.pairs) {
      const start = Math.floor(R.r() * row.pairs.length);
      for (let k = 0; k < row.pairs.length; k++) { const b = row.pairs[(start + k) % row.pairs.length]; if (b.every(allowed) && new Set(b.flatMap(qty)).size === b.flatMap(qty).length) { block = b.map(q => ({ ...q })); break; } }
      if (!block.length) return null;
      if (f.kind !== 'cp8' && f.kind !== 'cp2') block = R.shuffle(block);
      block.forEach((q, n) => { q.role = n === 0 ? 'cpA' : 'cpB'; q.cpType = f.kind === 'cp2' ? 'CP2' : 'CP1'; q.cpVariant = f.variant || null; });
    } else for (let j = 0; j < row.parts.length; j++) {
      let a = row.parts[j];
      if (a[0].pattern === 'compound_in' && a[0].domain !== 'time') {
        const short = R.coin(0.6), preferred = a.filter(q => (q.lo < (q.cid === 'C3' ? 10 : 100)) === short);
        if (preferred.length) a = preferred;
      }
      const start = Math.floor(R.r() * a.length); let q = null;
      for (let k = 0; k < a.length; k++) if (allowed(a[(start + k) % a.length])) { q = { ...a[(start + k) % a.length] }; break; }
      if (!q) return null;
      if (q.pattern !== 'recall') qty(q).forEach(k => used.add(k));
      if (row.diag) { if (j === 0) { const options = enumerate(r => diagQ(r, q, P.lv, f.correct)); if (!options.length) return null; q = R.pick(options); q.role = 'diag'; } else q.role = 'chain'; }
      block.push(q);
    }
    for (const q of block) { if (q.pattern !== 'recall') qty(q).forEach(k => used.add(k)); }
    blocks.push(block);
  }
  const items = R.shuffle(blocks).flat(); if (keep) keep(items); return setOk(P.lv, items, recent) ? items : null;
}
function newState() { return { hist: {} }; }
const defaultState = newState();
const FRAME_PATTERN = { conv: 'convert', conv2: 'convert', rate: 'rate_select', align: 'align_calc', te: 'time_express', comp: 'compound_in', sa1: 'speed_apply', sasum: 'speed_apply', diag: 'diagnosis', cmp: 'compare' };
function planPossible(P) {
  const domains = new Set(), patterns = new Set();
  for (const f of P.frames) {
    if (f.kind.startsWith('cp')) {
      patterns.add(f.kind === 'cp1comp' ? 'compound_in' : 'convert');
      if (f.kind === 'cp2') domains.add('pair');
      else { domains.add('time'); domains.add(f.kind === 'cp1comp' ? COMP[f.pc][0] : f.kind === 'cp8' ? 'speed' : f.dom2); }
    } else {
      patterns.add(FRAME_PATTERN[f.kind] || f.kind);
      domains.add(f.dom || (f.kind === 'comp' ? COMP[f.cid][0] : f.kind === 'te' ? 'time' : 'speed'));
      if (f.kind === 'diag') patterns.add(FRAME_PATTERN[f.src] || 'speed_apply');
    }
  }
  if (P.lv <= 3 && (domains.size < 3 || !domains.has('time'))) return false;
  if (P.lv === 10 && (domains.size < 3 || patterns.size < 4)) return false;
  return true;
}
function buildRawSet(lv, random, state) {
  const R = rng(random), hist = state.hist[lv] || [], recent = recentApplies(lv) ? new Set(hist.flat()) : null;
  poolRandom = R; DATA_POOLS.clear(); FRAME_ROWS.clear(); GROUPS.clear();
  const available = new Map();
  let closest = null, last, attempts = 0;
  const violations = s => {
    const out = [], domains = new Set(s.map(q => (q.src || q).domain)), ids = s.map(pidOf), qs = s.filter(q => q.pattern !== 'recall').flatMap(qty);
    if (lv <= 3 && (domains.size < 3 || !domains.has('time')) || lv === 10 && domains.size < 3) out.push('domain_mix');
    if (lv === 10 && new Set(s.map(q => q.pattern)).size < 4) out.push('pattern_mix');
    if (ids.some(id => ids.filter(k => k === id).length > 2)) out.push('pattern_limit');
    if (new Set(qs).size !== qs.length) out.push('repeated_quantity');
    if (lv === 3 && (s.filter(q => q.dir === 'up').length < 2 || s.filter(q => q.dir === 'down').length < 2)) out.push('direction_mix');
    for (const p of TRAPS[lv]) if (s.filter(q => !correctOn(q, p)).length < 2) out.push('trap_' + p);
    if (recent && questions(s).some(k => recent.has(k))) out.push('recent_repeat');
    return out;
  };
  const keep = s => { if (s.length !== 5) return; const bad = violations(s); if (!closest || bad.length < closest.violations.length) { closest = s; closest.violations = bad; } };
  for (let plans = 0; plans < 100000; plans++) {
    attempts = plans + 1;
    const P = drawPlan(lv, R);
    if ([6, 7, 9, 10].includes(lv)) {
      metadataMode = true;
      for (let i = 0; i < P.frames.length; i++) for (let n = 0; n < 64 && !R.stagnant(); n++) {
        const f = P.frames[i], mirrored = mirror({ lv, frames: [f] }).frames[0];
        if (frameRows(f, lv).length && frameRows(mirrored, lv).length) break;
        P.frames[i] = drawPlan(lv, R).frames[i];
      }
      metadataMode = false;
    }
    last = P;
    if (R.stagnant()) break;
    if (!planPossible(P) || !trapPlanPossible(P)) continue;
    const M = mirror(P); if (!trapPlanPossible(M)) continue;
    if ([6, 7, 9, 10].includes(lv)) {
      metadataMode = true;
      const possible = composePlan(P, R, null, null, true) && composePlan(M, R, null, null, true);
      metadataMode = false;
      if (!possible) continue;
    }
    if (!composePlan(P, R, recent, null, true, available) || !composePlan(M, R, recent, null, true, available)) continue;
    const a = composePlan(P, R, recent, keep, false, available); if (!a) continue;
    const b = composePlan(M, R, recent, keep, false, available); if (!b) continue;
    const s = R.coin() ? a : b; s.violations = []; s.plans = attempts;
    state.hist[lv] = hist.concat([questions(s)]).slice(-RECENT); return s;
  }
  if (!closest) { const rows = last.frames.map(f => frameRows(f, lv)[0]); if (rows.every(Boolean)) materialise(last, rows, R, null, keep); }
  const s = closest || pool('conv', 'length', 'down', ['int'], null).slice(0, 5).map(q => ({ ...q }));
  s.violations = closest ? closest.violations.concat(['mirror_composition_limit']) : violations(s).concat(['composition_limit', 'mixture', 'pair_or_chain']);
  s.plans = attempts;
  state.hist[lv] = hist.concat([questions(s)]).slice(-RECENT); return s;
}
const LABELS = { correct: '正しい', direction: '上りと下りが逆', steps: '10倍のかいだんの数がちがう', sixty: '60 を 100 に している', other_domain: 'ほかの 単位の 倍率を つかっている', not_aligned: '単位を そろえて いない' };
const UNIT_IDS = { 'cm²': 'cm2', 'm²': 'm2', 'km²': 'km2', 'cm³': 'cm3', 'm³': 'm3' };
const UNIT_LABELS = Object.fromEntries(Object.entries(UNIT_IDS).map(([a, b]) => [b, a]));
const CHIPS = { length: ['mm', 'cm', 'm', 'km'], weight: ['g', 'kg', 't'], area: ['cm2', 'm2', 'a', 'ha', 'km2'], volume: ['cm3', 'mL', 'L', 'm3'], time: ['秒', '分', '時間'], speed: ['秒速m', '分速m', '時速km', '時速m'] };
const unitId = u => UNIT_IDS[u] || u;
const unitLabel = u => UNIT_LABELS[u] || ({ '秒速m': '秒速 m', '分速m': '分速 m', '時速km': '時速 km', '時速m': '時速 m' }[u]) || u;
const surfaceUnit = u => ({ '秒速m': '秒速', '分速m': '分速', '時速km': '時速', '時速m': '時速' }[u] || u);
const quantityText = (v, u) => ['秒速m', '分速m', '時速km', '時速m'].includes(u) ? surfaceUnit(u) + ' ' + v + (u === '時速km' ? 'km' : 'm') : v + unitLabel(u);
const askText = u => ['秒速m', '分速m', '時速km', '時速m'].includes(u) ? surfaceUnit(u) + ' 何 ' + (u === '時速km' ? 'km' : 'm') : '何 ' + u;
function hourText(v) {
  if (decimals(v) <= 3) return rd(v) + '時間';
  for (const d of [3, 6, 12, 30, 60, 120, 600]) if (isInt(v * d)) { const n = Math.round(v * d), g = gcd(n, d); return n / g + '/' + d / g + '時間'; }
  throw new Error('時間の表示が正しくありません');
}
function questionText(q, alternate) {
  const st = q.step, given = quantityText(q.frac || rd(st.x), st.from), to = st.to;
  const convertText = (s, u) => alternate ? s + ' を ' + surfaceUnit(u) + ' で 表すと いくつですか。' : s + ' は ' + (u === '分' || u === '時間' || u === '秒' ? '何' + u : askText(u) + ' ') + 'ですか。';
  switch (q.pattern) {
    case 'recall': case 'convert': return convertText(given, to);
    case 'rate_select': return given + ' を ' + surfaceUnit(to) + ' に なお' + (alternate ? 'す 計算は どれですか。' : 'します。どうしますか。');
    case 'compound_in': return convertText(quantityText(q.hi, st.from) + (q.domain === 'time' ? '' : ' ') + quantityText(q.lo, st.to), st.to);
    case 'time_express': return st.x + '分 は ' + (q.form === 'comp' ? 'どれですか。' : '何時間ですか。');
    case 'compare': return quantityText(q.L.v, q.L.u) + ' と ' + quantityText(q.R.v, q.R.u) + '。' + q.alignTo + ' に そろえて くらべると、' + ({ length: '長い', weight: '重い', area: '広い', volume: '多い', time: '長い' }[q.domain]) + 'のは どちらですか。';
    case 'align_calc': return convertText(quantityText(q.A.v, q.A.u) + ' ' + (q.plus ? '+' : '−') + ' ' + quantityText(q.B.v, q.B.u), q.unit);
    case 'speed_apply': {
      const v = q.vals;
      if (q.type === 'kmph_min') return '時速 ' + v.v + 'km で ' + v.t + '分 進むと 何 km ですか。';
      if (q.type === 'mpm_km') return '分速 ' + v.v + 'm で ' + v.d + 'km 進むと 何分 かかりますか。';
      if (q.type === 'sps_min') return '秒速 ' + v.v + 'm で ' + v.t + '分 進むと 何 m ですか。';
      return '分速 ' + v.a + 'm と 秒速 ' + v.b + 'm。1 ' + (q.type === 'mix_persec' ? '秒' : '分') + 'で 進む 道のりの 合計は 何 m ですか。';
    }
  }
  throw new Error('問題型が正しくありません');
}
const WAZA = [
  'まず 何の 単位かを 見る。長さ、重さ、面積、かさ、時間で 倍率が ちがう',
  '大きい単位から 小さい単位へ 下りるときは かける。上るときは 割る',
  '数の 大きさでは なく、単位の 大きさで 向きを 決める',
  '時間は 60 で くり上がる。0.5時間 は 30分、0.1時間 は 6分',
  '単位が ちがったら、まず そろえる',
  '秒速 k m = 分速 60k m = 時速 3.6k km',
];
function explanation(q, type) {
  const st = q.step, down = st.dir === 'down', op = down ? '×' : '÷', f = st.f;
  const big = down ? st.from : st.to, small = down ? st.to : st.from;
  const rel = '1' + big + ' は ' + f + small;
  switch (type) {
    case 'direction': return q.rel === 'R16' || st.dom === 'speed' && f === 60 ? (down ? '1 分は 60 秒。だから ×60' : '1 秒は 1 分の 60 分の 1。だから ÷60') : st.dom === 'speed' && near(f, 3.6) ? '秒速 1m は 時速 3.6km。だから ' + op + f : rel + '。だから ' + op + f;
    case 'M1mag': return '数が ' + (down ? '大きくても' : '小さくても') + ' ' + surfaceUnit(st.from) + ' を ' + surfaceUnit(st.to) + ' に するのは ' + op + f;
    case 'rate_both': return (st.dom === 'speed' ? '秒速 1m は ' + (f === 60 ? '分速 60m' : '時速 3.6km') : rel) + '。' + (down ? '下り' : '上り') + 'だから ' + op + f;
    case 'steps': return rel + '。0 は ' + Math.round(Math.log10(f)) + ' こ';
    case 'time_steps': return rel + '。3600 は 時間と 秒';
    case 'sixty': return (st.dom === 'speed' ? '1分 は 60秒' : rel) + '。' + (f === 3600 ? 10000 : 100) + ' で なく ' + f + ' で 直す';
    case 'other_domain': return st.dom === 'speed' ? surfaceUnit(st.from) + ' を ' + surfaceUnit(st.to) + ' に するのは ' + f + '。' + (f === 60 ? '3.6 は 時速' : '60 は 分速') : st.dom === 'time' ? '時間は 60 で くり上がる。1000 は 使わない' : ({ length: '長さ', weight: '重さ', area: '面積', volume: '体積とかさ' }[st.dom]) + 'は ×' + f + ' の 階段。60 は 時間だけ';
    case 'not_aligned': return (q.pattern === 'speed_apply' ? q.type.startsWith('mix') ? '分速 m と 秒速 m' : q.type === 'kmph_min' ? '時速 km と 分' : q.type === 'mpm_km' ? '分速 m と km' : '秒速 m と 分' : big + ' と ' + small) + ' は ちがう 単位。先に そろえる';
    case 'concat': return q.hi + st.from + ' は ' + conv(st) + st.to + '。それに ' + q.lo + ' を たす';
    case 'zero_drop': return q.hi + st.from + ' ' + q.lo + st.to + ' は ' + conv(st) + st.to + ' と ' + q.lo + st.to;
    case 'texp_place': return st.x + '分 は 60分 が ' + Math.floor(st.x / 60) + ' こ と ' + st.x % 60 + '分';
    case 'texp_calc': return q.form === 'comp' ? st.x + '分 は ' + Math.floor(st.x / 60) * 60 + '分 と ' + st.x % 60 + '分。だから ' + Math.floor(st.x / 60) + '時間' + st.x % 60 + '分' : st.x + '分 は 60分 の ' + st.x + '/60。だから ' + (q.hourDisplay + '時間');
    case 'km_m': return '時速は km で 数える。1000m で 1km';
    case 'cmp_bigunit': return st.x + st.from + ' を ' + st.to + 'に そろえて くらべる';
    case 'cmp_same': return q.vb + big + ' は ' + rd(q.vb * f) + small + '。だから 同じ';
    case 'cmp_notsame': return quantityText(rd(conv(st)), st.to) + ' と ' + quantityText(q.otherVal, st.to) + ' は ちがう';
    case 'diag_missed': return 'しきは 正しい。だから ' + quantityText(q.ans, q.unit || st.to);
  }
  return '';
}
const ERROR_PRIORITY = ['direction', 'M1mag', 'steps', 'sixty', 'other_domain', 'not_aligned', 'rate_both', 'time_steps', 'concat', 'zero_drop', 'texp_place', 'texp_calc', 'km_m', 'cmp_bigunit', 'cmp_same', 'cmp_notsame', 'diag_missed'];
function errorValues(q) {
  const out = [], st = q.step, add = (type, value) => { if (Number.isFinite(value) && !near(value, q.ans)) out.push({ type, value: rd(value), text: explanation(q, type) }); };
  if (q.kind !== 'num' || q.pattern === 'recall' && q.rel === 'R13') return out;
  const finish = y => q.pattern === 'compound_in' ? calc(y, '+', q.lo) : q.pattern === 'align_calc' ? q.dir === 'down' ? calc(y, q.plus ? '+' : '-', q.keep) : calc(q.keep, q.plus ? '+' : '-', y) : q.pattern === 'speed_apply' ? q.combine(y) : y;
  const op = opOf(st), reversed = rev(op), mag = st.dir === 'down' ? st.x >= 10 : st.x < 10;
  add(mag ? 'M1mag' : 'direction', finish(calc(st.exact || st.x, reversed, st.f)));
  if (DOM4.includes(st.dom)) { add('steps', finish(calc(st.x, op, st.f * 10))); if (st.f / 10 >= 10) add('steps', finish(calc(st.x, op, st.f / 10))); add('other_domain', finish(calc(st.x, op, 60))); }
  if ((q.pattern !== 'compound_in' && st.dom === 'time' && timeNonInt(st)) || (st.dom === 'speed' && st.f === 60)) add('sixty', finish(calc(st.exact || st.x, op, st.f === 3600 ? 10000 : 100)));
  if (st.dom === 'time') add('other_domain', finish(calc(st.x, op, 1000)));
  if (st.dom === 'speed') add('other_domain', finish(calc(st.x, op, st.f === 60 ? 3.6 : 60)));
  if (['align_calc', 'speed_apply'].includes(q.pattern)) add('not_aligned', rawVal(q));
  if (q.pattern === 'compound_in') { add('concat', Number(String(q.hi) + String(q.lo))); if (q.domain !== 'time') add('zero_drop', Number(String(q.hi) + String(q.lo)) * 10 ** Math.max(0, Math.round(Math.log10(st.f)) - String(q.lo).length)); }
  if (q.pattern === 'convert' && st.dom === 'speed' && st.to === '時速km') add('km_m', q.ans * 1000);
  return out.sort((a, b) => ERROR_PRIORITY.indexOf(a.type) - ERROR_PRIORITY.indexOf(b.type));
}
function choiceTypes(q) {
  if (q.pattern === 'rate_select') return q.options.map((o, i) => i === q.ansOpt ? [] : o.f === q.step.f ? ['direction'] : o.op !== opOf(q.step) ? ['rate_both'] : [q.domain === 'time' ? o.f === 100 ? 'sixty' : 'time_steps' : q.domain === 'speed' ? o.f === 100 ? 'sixty' : 'other_domain' : o.f === 60 ? 'other_domain' : 'steps']);
  if (q.pattern === 'time_express') return q.options.map((o, i) => i === q.ansOpt ? [] : [({ sixty: 'sixty', calc: 'texp_calc', rev: 'direction', place: 'texp_place' })[o.t]]);
  if (q.pattern === 'compare') {
    const out = q.options.map(() => []), assign = (type, opt) => { if (opt >= 0 && opt !== q.ansOpt && !out[opt].includes(type)) out[opt].push(type); };
    const result = (op, f) => solve(q, st => ({ op, f })).opt;
    assign('direction', result(rev(opOf(q.step)), q.step.f));
    if (DOM4.includes(q.domain)) { assign('steps', result(opOf(q.step), q.step.f * 10)); if (q.step.f / 10 >= 10) assign('steps', result(opOf(q.step), q.step.f / 10)); }
    if (q.domain === 'time' && timeNonInt(q.step)) assign('sixty', result(opOf(q.step), 100));
    assign('not_aligned', q.L.v === q.R.v ? 2 : q.L.v > q.R.v ? 0 : 1);
    assign('cmp_bigunit', q.options.indexOf(q.big));
    if (q.ansOpt === 2) { assign('cmp_same', 0); assign('cmp_same', 1); }
    if (q.ansOpt !== 2 && !out[2].length) assign('cmp_notsame', 2);
    return out.map(a => a.sort((x, y) => ERROR_PRIORITY.indexOf(x) - ERROR_PRIORITY.indexOf(y)));
  }
  return q.options.map((o, i) => i === q.ansOpt ? [] : [q.label === 'correct' ? 'diag_missed' : q.label]);
}
function sheetText(q) {
  const s = q.src, st = s.step, sh = q.sheet, op = sh.op === 'x' ? '×' : '÷';
  let first, y;
  if (sh.raw) {
    if (s.pattern === 'align_calc') first = s.A.v + ' ' + (s.plus ? '+' : '−') + ' ' + s.B.v;
    else { const v = s.vals; first = s.type === 'kmph_min' || s.type === 'sps_min' ? v.v + ' × ' + v.t : s.type === 'mpm_km' ? v.d + ' ÷ ' + v.v : v.a + ' + ' + v.b; }
    return 'しき ' + first + ' = ' + q.shown + '、こたえ ' + quantityText(q.shown, s.unit);
  }
  y = calc(st.exact || st.x, sh.op, sh.f); first = (s.frac || st.x) + ' ' + op + ' ' + sh.f + ' = ' + rd(y);
  if (s.pattern === 'align_calc') first += '、そのあと ' + (s.dir === 'up' ? s.keep + ' ' + (s.plus ? '+' : '−') + ' ' + rd(y) : rd(y) + ' ' + (s.plus ? '+' : '−') + ' ' + s.keep) + ' = ' + q.shown;
  if (s.pattern === 'speed_apply') { const v = s.vals; first += '、そのあと ' + (s.type === 'kmph_min' || s.type === 'sps_min' ? v.v + ' × ' + rd(y) : s.type === 'mpm_km' ? rd(y) + ' ÷ ' + v.v : s.type === 'mix_persec' ? rd(y) + ' + ' + v.b : v.a + ' + ' + rd(y)) + ' = ' + q.shown; }
  return 'しき ' + first + '、こたえ ' + quantityText(q.shown, s.unit);
}
function publicQuestion(raw, lv, R, preserveOptions) {
  let q = { ...raw }, src = q.pattern === 'diagnosis' ? q.src : q;
  if (q.pattern === 'rate_select' && !preserveOptions) { const c = { id: q.rel, st: q.step, form: q.form }; q = { ...q, ...rateQ(R, c) }; }
  if (q.kind === 'choice' && q.pattern !== 'compare') { const correct = q.options[q.ansOpt]; q.options = R.shuffle(q.options); q.ansOpt = q.options.indexOf(correct); }
  const base = q.pattern === 'diagnosis' ? q.src : q;
  q.cat = 'kom_unit_mix'; q.lv = lv; q.format = q.pattern === 'diagnosis' ? 'diagnosis' : 'normal';
  q.patternId = pidOf(q); q.direction = base.dir; q.form = base.form; q.relation = base.rel || Object.keys(R1).find(id => R1[id].includes(base.step.from) && R1[id].includes(base.step.to)) || null; q.speedApplyType = base.type || null;
  if (base.pattern === 'time_express' && base.form !== 'comp') base.hourDisplay = hourText(base.step.x / 60).replace(/時間$/, '');
  q.text = questionText(base, R.coin()); if (q.pattern === 'diagnosis') q.work = [sheetText(q)];
  q.answerEngine = 'Q4B_KOMOREBI_UNIT_MIX'; q.to = unitId(base.unit || base.step.to); q.ansUnit = q.to;
  const from = rational(base.frac || base.step.x), def = UNITS[base.step.from];
  q.from = DOM4.includes(def[0]) ? { ...decimal(base.step.x), unit: unitId(base.step.from) } : { ...from, unit: unitId(base.step.from) };
  q.traps = TRAPS[lv].filter(p => !correctOn(q, p));
  q.waza = { primary: WAZA[lv <= 2 || lv === 10 ? 0 : lv === 3 ? 2 : lv <= 5 ? 3 : lv <= 7 ? 4 : 5], alternate: base.domain === 'time' ? '1時間 は 60分。半分は 30分' : WAZA[1] };
  q.errorValues = errorValues(base);
  if (q.kind === 'choice') {
    q.choiceErrorTypes = choiceTypes(q);
    q.choices = q.options.map(o => q.pattern === 'diagnosis' ? LABELS[o] : q.pattern === 'rate_select' ? (o.op === 'x' ? '×' : '÷') + o.f : q.pattern === 'compare' ? ({ L: '左の量', R: '右の量', same: '同じ' })[o] : o.H === undefined ? hourText(o.val) : o.H + '時間' + o.M + '分');
    q.feedback = q.choiceErrorTypes.map(types => types.length ? explanation(base, types[0]) : ''); q.ans = q.ansOpt;
  } else if (q.pattern !== 'recall') { q.kind = 'num_unit'; const domain = Object.keys(CHIPS).find(d => CHIPS[d].includes(q.to)); q.unitChoices = CHIPS[domain].slice(); }
  q.fractions = [...new Set([base.frac, ...(q.choices || []).filter(t => /^\d+\/\d+時間$/.test(t)).map(t => t.slice(0, -2))].filter(Boolean))].map(t => { const [num, den] = t.split('/').map(Number); return { text: t, num, den, unit: '時間' }; });
  q.pairType = q.cpType || null; q.pairWith = null; q.chainOf = null;
  return q;
}
function buildSet(lv, random, state) {
  if (!Number.isInteger(lv) || lv < 1 || lv > 10 || typeof random !== 'function') throw new Error('問題の指定が正しくありません');
  state = state || defaultState;
  if (!state || typeof state.hist !== 'object') throw new Error('生成状態が正しくありません');
  const raw = buildRawSet(lv, random, state), R = rng(random), out = raw.map(q => publicQuestion(q, lv, R));
  out.forEach((q, i) => { if (q.role === 'cpA') { q.pairWith = i + 1; out[i + 1].pairWith = i; } if (q.role === 'chain') q.chainOf = i - 1; });
  out.violations = raw.violations; out.plans = raw.plans; return out;
}
function unitDefinition(id) {
  const label = UNIT_LABELS[id] || id, u = UNITS[label] || (id === '時速m' ? ['speed', 1 / 3600] : null);
  if (!u) throw new Error('単位が正しくありません'); return u;
}
function judgeNumUnit(q, value, unit) {
  if (!q || q.kind !== 'num_unit' || q.ansUnit !== q.to || !Number.isFinite(Number(value)) || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(String(value).trim())) throw new Error('回答の指定が正しくありません');
  const selected = unitDefinition(unit), target = unitDefinition(q.to);
  if (selected[0] !== target[0]) throw new Error('答えの単位が正しくありません');
  const input = rational(String(value).trim()), expected = rational(q.ans);
  if (selected[1] === target[1] && input.num * expected.den === expected.num * input.den) return { correct: true, state: 'correct', note: '' };
  let same;
  if (DOM4.includes(q.domain || target[0])) {
    const a = decimal(value), b = decimal(q.ans); a.exp += Math.round(Math.log10(selected[1])); b.exp += Math.round(Math.log10(target[1]));
    same = decimalCalc(a, '-', b).mantissa === 0;
  } else {
    const factors = { '秒速m': { num: 1, den: 1 }, '分速m': { num: 1, den: 60 }, '時速km': { num: 5, den: 18 }, '時速m': { num: 1, den: 3600 } };
    const a = arithmetic(input, 'x', factors[unit] || rational(selected[1])), b = arithmetic(expected, 'x', factors[q.to] || rational(target[1]));
    same = a.num * b.den === b.num * a.den;
  }
  if (same) return { correct: false, state: 'other_unit', note: 'たしかに ' + quantityText(value, unit) + ' だけど、きかれているのは ' + unitLabel(q.to) };
  return { correct: false, state: 'wrong', note: '' };
}
function feedback(q, answer, unit) {
  if (q.kind === 'choice') return { text: q.feedback[answer] || '', types: q.choiceErrorTypes[answer] || [] };
  if (q.kind === 'num_unit' && unit !== q.to) return { text: '', types: [] };
  const matches = q.errorValues.filter(e => near(e.value, Number(answer)));
  return { text: matches.length ? matches[0].text : '', types: [...new Set(matches.map(e => e.type))] };
}
function patternSpace(lv, random) {
  const R = rng(random), ids = new Set(), visited = new Set();
  const collect = (a, prefix = '') => groups(a).forEach(g => ids.add(prefix + pidOf(g[0])));
  for (let i = 0; i < 2000; i++) for (const f of drawPlan(lv, R).frames) {
    const key = JSON.stringify(f, (k, v) => ['u', 'saPick', 'correct'].includes(k) ? undefined : v);
    if (visited.has(key)) continue; visited.add(key);
    if (f.kind === 'diag') {
      const kind = f.src === 'sa' ? 'sa' : f.src;
      for (const type of f.src === 'sa' ? f.dir === 'up' ? ['kmph_min', 'mix_persec'] : ['mpm_km', 'sps_min', 'mix_permin'] : [undefined]) {
        collect(pool(kind, f.dom, f.dir, f.forms, f.band, type), 'diagnosis.');
        collect(pool(kind, f.dom, kind !== 'sa' && sameRatioDom(f.dom) ? flip(f.dir) : f.dir, f.forms, f.chainBand, type));
      }
    } else for (const row of frameRows(f, lv)) {
      if (row.pairs) row.pairs.forEach(b => b.forEach(q => ids.add(pidOf(q))));
      else row.parts.forEach(a => collect(a));
    }
  }
  return ids;
}
function judge(q, answer, unit) {
  return q.kind === 'num_unit' ? judgeNumUnit(q, answer, unit).correct : q.kind === 'choice' ? answer === q.ansOpt : near(Number(answer), q.ans);
}
global.Q4B_KOMOREBI_UNIT_MIX = { rng, drawPlan, mirror, planPossible, trapPlanPossible, composePlan, groups, diagnosable, pool, publicQuestion, setOk, questionText, choiceTypes, errorValues, quantityText, judge, VALUES, units: CHIPS, unitLabel, buildSet, judgeNumUnit, feedback, newState, buildRawSet, explanation, rational, arithmetic, patternSpace };
})(window);
