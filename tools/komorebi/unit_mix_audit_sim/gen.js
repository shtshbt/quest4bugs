'use strict';
// Audit generator for kom_unit_mix, revised to the v0.2.2 rules (stratified direction and band, mirrored plans) (copied from the v0.1.2 audit generator).
// Ambiguities are resolved in the adversary-favorable direction (see AMB notes in comments).

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (R, a) => a[Math.floor(R() * a.length)];
const shuffle = (R, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rd = x => Math.round(x * 1e6) / 1e6;
const eq = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
const isInt = x => Math.abs(x - Math.round(x)) < 1e-9;
const validNum = x => x > 0 && x < 1e6 && Math.abs(Math.round(x * 100) - x * 100) < 1e-6;

const SIZE = { mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, g: 1, kg: 1e3, t: 1e6, cm2: 1e-4, m2: 1, a: 1e2, ha: 1e4, km2: 1e6,
  cm3: 1e-6, mL: 1e-6, L: 1e-3, m3: 1, '秒': 1, '分': 60, '時間': 3600, '秒速m': 1, '分速m': 1 / 60, '時速km': 5 / 18 };
const DEC_DOMAINS = ['length', 'weight', 'area', 'volume'];
const DOM5 = [...DEC_DOMAINS, 'time'];
const rel = ([id, domain, big, small]) => ({ id, domain, big, small, f: rd(SIZE[big] / SIZE[small]) });
const REL1 = [
  ['R1', 'length', 'cm', 'mm'], ['R2', 'length', 'm', 'cm'], ['R3', 'length', 'km', 'm'],
  ['R4', 'weight', 'kg', 'g'], ['R5', 'weight', 't', 'kg'],
  ['R6', 'area', 'm2', 'cm2'], ['R7', 'area', 'a', 'm2'], ['R8', 'area', 'ha', 'a'], ['R9', 'area', 'km2', 'ha'],
  ['R10', 'volume', 'L', 'mL'], ['R11', 'volume', 'L', 'cm3'], ['R12', 'volume', 'm3', 'L'], ['R13', 'volume', 'mL', 'cm3'],
  ['R14', 'time', '分', '秒'], ['R15', 'time', '時間', '分'],
  ['R16', 'speed', '秒速m', '分速m'], ['R17', 'speed', '秒速m', '時速km']].map(rel);
const REL2 = [['D1', 'length', 'm', 'mm'], ['D2', 'length', 'km', 'cm'], ['D3', 'weight', 't', 'g'], ['D4', 'area', 'ha', 'm2'],
  ['D5', 'area', 'km2', 'a'], ['D6', 'volume', 'm3', 'mL'], ['D7', 'time', '時間', '秒']].map(rel);
const RECALL_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R12', 'R13', 'R14', 'R15'];
// AMB: R13 (factor 1) is used only by recall; R11 is allowed in convert/rate_select/compare/align_calc.
const POOL1 = REL1.filter(r => r.id !== 'R13');

const INT_DOWN = [2, 3, 4, 5, 6, 7, 8, 9];
// v0.2: one value band for the big-unit side, shared by both directions (3.5 / 9.2). Half the band is 10 or more.
const B_INT = [2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 25, 40, 45, 75, 120, 150, 250];
const B_DEC = [0.5, 1.5, 2.5, 1.2, 0.8, 2.4, 0.25, 0.75, 3.5, 1.25, 4.5, 12.5, 22.5, 37.5];
const UP_SMALL = { 10: [2, 3, 4, 5, 6, 7, 8, 9], 100: [2, 3, 4, 5, 6, 7, 8, 9], 60: [6, 9] };
const SPD_B = [1.5, 2, 2.5, 3, 4, 5, 6, 10, 12, 15, 20, 25]; // v0.2: 秒速 m values for R16
const SPD_INT = [5, 10, 15, 20, 25];
const DEC_DOWN = [0.5, 1.5, 2.5, 1.2, 0.8, 2.4, 0.25, 0.75, 3.5];
const DEC_UP = [0.5, 1.5, 2.5, 1.2, 0.8, 0.25, 0.75, 3.5, 4.5];
const FRAC = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [1, 6], [5, 6], [1, 10]];
const kdOf = d => (DEC_DOMAINS.includes(d) ? 'dec' : d);
const opApply = (v, op, f) => (op === '×' ? v * f : v / f);
const rev = op => (op === '×' ? '÷' : '×');

// v0.2: per-set plan (4.6 の 3、4.9 の 3). Conclusions and correct-sheet flags are drawn before the trap rejection loop.
const PLAN = { concl: [], diag: [], dirs: [], vars: [], us: [], bands: [], ci: 0, di: 0, ri: 0, vi: 0, ui: 0, bi: 0 };
// v0.2.2: the band (the number to convert is 10 or more, or under 10) of each slot is planned, independent of the direction
const planBand = R => (PLAN.bi < PLAN.bands.length ? PLAN.bands[PLAN.bi++] : (R() < 0.5 ? 'big' : 'small'));
// v0.2.1 (C7): domains of the slots whose domain is free are drawn from planned uniforms before the rejection loop
const planPick = (R, arr) => { if (arr.length <= 1) return arr[0]; const u = PLAN.ui < PLAN.us.length ? PLAN.us[PLAN.ui++] : R(); return arr[Math.floor(u * arr.length)]; };
// v0.2.1 (C7): directions of the slots whose direction is free are drawn uniformly before the rejection loop
const planDir = (R, d) => {
  if (!Array.isArray(d)) return d;
  if (d[0] !== 'down') { const v = PLAN.vars && PLAN.vi < PLAN.vars.length ? PLAN.vars[PLAN.vi++] : R() < 0.5; return v ? d[0] : d[1]; } // variant switches (CP2, Lv8)
  return PLAN.ri < PLAN.dirs.length ? PLAN.dirs[PLAN.ri++] : pick(R, d);
};
const LABELS4 = ['correct', 'direction', 'steps', 'sixty', 'other_domain']; // v0.2: calc dropped from diagnosis (E12)
const LABELS6 = [...LABELS4, 'not_aligned'];

// ---------- question makers ----------
function convQ(r, dir, gv, form, frac) {
  const ans = rd(dir === 'down' ? gv * r.f : gv / r.f);
  if (!validNum(gv) || !validNum(ans)) return null;
  if (form === 'int' && !isInt(gv)) return null;
  return { pattern: 'convert', kind: 'num_unit', domain: r.domain, dir, form, rel: r.id, f: r.f, gv, frac,
    from: dir === 'down' ? r.big : r.small, to: dir === 'down' ? r.small : r.big, ans, raw: gv,
    paths: [{ v: gv, f: r.f, op: dir === 'down' ? '×' : '÷', kd: kdOf(r.domain), relId: r.id, asm: x => x }] };
}
function valueFor(R, r, dir, form, band) {
  // v0.2.2: the given number is drawn inside the planned band (big: 10 or more, small: under 10)
  const inBand = g => (band === 'small' ? g < 10 : band === 'big' ? g >= 10 : true);
  if (form === 'frac') { if (band === 'big') return null; const fr = pick(R, FRAC); return { gv: fr[0] / fr[1], frac: fr }; }
  if (r.id === 'R17' || r.id === 'R16') {
    const ks = (r.id === 'R17' ? SPD_INT : SPD_B).filter(k => inBand(dir === 'down' ? k : rd(k * r.f))); if (!ks.length) return null;
    const k = pick(R, ks); return { gv: dir === 'down' ? k : rd(k * r.f) };
  }
  if (dir === 'up' && band === 'small') { if (form !== 'dec' || !UP_SMALL[r.f]) return null; return { gv: pick(R, UP_SMALL[r.f]) }; }
  const bs = (form === 'int' ? B_INT : B_DEC).filter(b => inBand(dir === 'down' ? b : rd(b * r.f))); if (!bs.length) return null;
  const b = pick(R, bs);
  return { gv: dir === 'down' ? b : rd(b * r.f) };
}
function makeConvert(R, o) {
  for (let t = 0; t < 500; t++) {
    const dom = o._dom || (o._dom = planPick(R, o.domains.filter(d => (o.steps === 2 ? REL2 : POOL1).some(r => r.domain === d))));
    let pool = (o.steps === 2 ? REL2 : POOL1).filter(r => r.domain === dom);
    if (o.rel) pool = pool.filter(r => r.id === o.rel);
    let form = Array.isArray(o.form) ? pick(R, o.form) : o.form;
    let dir = o._dir || (o._dir = planDir(R, o.dir));
    const band = o._band || (o._band = planBand(R));
    if (form === 'frac') { pool = pool.filter(r => r.id === 'R15'); dir = 'down'; }
    if (!pool.length) continue;
    const r = pick(R, pool);
    const vv = o.gv !== undefined ? { gv: o.gv } : valueFor(R, r, dir, form, band); if (!vv) continue; const { gv, frac } = vv;
    const q = convQ(r, dir, gv, form, frac || null);
    if (q) { q.steps = o.steps || 1; return q; }
  }
  throw new Error('convert fail ' + JSON.stringify(o));
}
function gCands(r) {
  if (r.domain === 'time') return r.f === 60 ? [100, 3600] : [60, 100];
  if (r.domain === 'speed') return r.f === 60 ? [100, 3.6] : [60]; // v0.2.1 (C5): {3.6, 1000} only arises from f = 3.6
  const s = []; if (r.f !== 10000) s.push(r.f * 10); if (r.f >= 100) s.push(r.f / 10); s.push(60); return s; // v0.2.1 (C5): no 100000 for f = 10000
}
function makeRateSelect(R, o) {
  for (let t = 0; t < 500; t++) {
    const dom = o._dom || (o._dom = planPick(R, o.domains));
    const pool = POOL1.filter(r => r.domain === dom);
    const r = pick(R, pool);
    const dir = o._dir || (o._dir = planDir(R, o.dir));
    const band = o._band || (o._band = planBand(R));
    const form = Array.isArray(o.form) ? pick(R, o.form) : o.form;
    const vv = valueFor(R, r, dir, form, band); if (!vv) continue; const { gv } = vv;
    const ansV = rd(dir === 'down' ? gv * r.f : gv / r.f);
    if (!validNum(gv) || !validNum(ansV)) continue;
    const g = pick(R, gCands(r));
    const opts = shuffle(R, [{ op: '×', n: r.f }, { op: '÷', n: r.f }, { op: '×', n: g }, { op: '÷', n: g }]);
    const op = dir === 'down' ? '×' : '÷';
    return { pattern: 'rate_select', kind: 'choice', domain: r.domain, dir, form, rel: r.id, f: r.f, g, gv,
      from: dir === 'down' ? r.big : r.small, to: dir === 'down' ? r.small : r.big, opts,
      ansIdx: opts.findIndex(x => x.op === op && x.n === r.f), raw: gv,
      paths: [{ v: gv, f: r.f, op, kd: kdOf(r.domain), relId: r.id, asm: x => x }] };
  }
  throw new Error('rs fail');
}
function makeRecall(R) {
  const r = pick(R, REL1.filter(x => RECALL_IDS.includes(x.id)));
  return { pattern: 'recall', kind: 'num', domain: r.domain, dir: 'down', form: 'int', rel: r.id, f: r.f, gv: 1, ans: r.f,
    from: r.big, to: r.small, raw: 1, paths: [{ v: 1, f: r.f, op: '×', kd: kdOf(r.domain), relId: r.id, asm: x => x }] };
}
function hourDisp(v) { return isInt(v * 100) ? 'dec' : 'frac'; }
function makeTimeExpress(R, form) {
  for (let t = 0; t < 500; t++) {
    let X, opts;
    if (form === 'comp') {
      const h = pick(R, [1, 2, 3]); const m = pick(R, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]); X = 60 * h + m;
      if (X < 100) continue;
      let m2 = R() < 0.5 ? m + 10 : m - 10; if (m2 < 0 || m2 >= 60) m2 = m2 < 0 ? m + 10 : m - 10;
      opts = [{ t: 'correct', h, m }, { t: 'sixty', h: Math.floor(X / 100), m: X % 100 }, { t: 'calc', h, m: m2 },
        { t: 'mispos', h: Math.floor(X / 10), m: X % 10 }];
      const keys = opts.map(o => o.h + ':' + o.m); if (new Set(keys).size < 4) continue;
    } else {
      let v;
      if (form === 'frac') { const fr = pick(R, FRAC); v = fr[0] / fr[1]; } else v = pick(R, [...B_DEC.filter(x => x < 10), 0.1, 0.15]);
      X = rd(60 * v); if (!isInt(X)) continue;
      // v0.2 (4.8): the calc option is v + 0.5, v - 0.5, v x 10 or v / 10, chosen at random among valid ones.
      // v0.2.1 (C5): the step error is built from the minutes (X / 6 or X / 600), not from the correct option; frac drops X / 600
      // the distractor may carry 3 decimals (0.075時間) or a fraction (1/30時間) so that X / 600 is always available
      const cc = [X / 6, X / 600].map(rd).filter(x => x > 0 && (form === 'frac' || isInt(x * 1000)));
      if (cc.length < 2) continue;
      opts = [{ t: 'correct', val: rd(v) }, { t: 'sixty', val: rd(X / 100) }, { t: 'calc', val: pick(R, cc) }, { t: 'rev', val: rd(X * 60) }];
      if (new Set(opts.map(o => o.val)).size < 4) continue;
    }
    const sh = shuffle(R, opts);
    return { pattern: 'time_express', kind: 'choice', domain: 'time', dir: 'up', form: form === 'comp' ? 'comp' : form, X, opts: sh,
      ansIdx: sh.findIndex(o => o.t === 'correct'), raw: X, rel: 'R15', f: 60,
      paths: [{ v: X, f: 60, op: '÷', kd: 'time', comp: form === 'comp', asm: x => x }] };
  }
  throw new Error('texp');
}
const CPAIRS = { C1: ['time', '時間', '分', 60], C2: ['time', '分', '秒', 60], C3: ['length', 'm', 'cm', 100], C4: ['length', 'km', 'm', 1000], C5: ['weight', 'kg', 'g', 1000] };
const COMP_VALS = { time: { hi: [1, 2, 3, 12, 15], lo: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], small: [5] },
  C3: { hi: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 15], lo: [3, 5, 8, 15, 25, 40, 75], small: [3, 5, 8] },
  C45: { hi: [1, 2, 3, 4, 5, 12, 15], lo: [50, 80, 250, 400, 600], small: [50, 80] } };
function concatNum(hi, lo) { return Number(String(hi) + String(lo)); }
function compoundQ(c, hi, lo) {
  const [domain, uh, ul, f] = CPAIRS[c];
  return { pattern: 'compound_in', kind: 'num_unit', domain, dir: 'down', form: 'comp', cpair: c, f, hi, lo, ans: hi * f + lo,
    from: uh, to: ul, raw: concatNum(hi, lo), gv: hi,
    paths: [{ v: hi, f, op: '×', kd: kdOf(domain), comp: true, asm: x => x + lo }] };
}
function makeCompound(R, c) {
  const vs = CPAIRS[c][0] === 'time' ? COMP_VALS.time : c === 'C3' ? COMP_VALS.C3 : COMP_VALS.C45;
  const hi = pick(R, vs.hi);
  const lo = (CPAIRS[c][0] !== 'time' && R() < 0.6) ? pick(R, vs.small) : pick(R, vs.lo);
  return compoundQ(c, hi, lo);
}
function makeCompare(R, o) {
  // v0.2.3: the planned conclusion is drawn once per item, so the retries below do not redraw it (4.6 の 3)
  const concl0 = o.concl || (PLAN.ci < PLAN.concl.length ? PLAN.concl[PLAN.ci++] : pick(R, ['big', 'small', 'same']));
  for (let t = 0; t < 500; t++) {
    const domain = o._dom || (o._dom = planPick(R, o.domains));
    // v0.2.3: the item names the unit to align to, so the conversion has a direction; it is planned and mirrored (4.13)
    const cdir = o._dir || (o._dir = planDir(R, ['down', 'up']));
    const pool = POOL1.filter(r => r.domain === domain);
    const r = pick(R, pool);
    let form = Array.isArray(o.form) ? pick(R, o.form) : o.form;
    let vb;
    if (domain === 'speed') { vb = pick(R, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]); form = 'int'; } // AMB: speed compare has no dec values
    else vb = pick(R, form === 'int' ? B_INT : B_DEC);
    if (vb < 10) continue; // v0.2.3: the number to convert is 10 or more in both directions, so the band says nothing about the direction
    const conv = rd(vb * r.f);
    const concl = concl0;
    let vs;
    // v0.2 (9.2): the small-unit quantity is taken near the true conversion or near a wrong-step conversion (x10, x1/10).
    // v0.2: the small-unit quantity is rounded to 2 significant digits (no 7038kg)
    const nice = x => { if (x < 10) return Math.round(x); const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
    const band = (a, b) => { const lo = conv * a, hi = conv * b; for (let k = 0; k < 20; k++) { const v = nice(lo + R() * (hi - lo)); if (v >= lo - 1e-9 && v <= hi + 1e-9 && v >= 1) return v; } return null; };
    if (concl === 'same') vs = conv;
    else if (concl === 'small') {
      if (domain === 'time' && !isInt(vb) && R() < 0.5) vs = rd(vb * 100);
      else vs = R() < 0.5 ? band(1.1, 1.5) : band(8, 12);
      if (vs === null || vs <= conv) continue;
    } else {
      vs = R() < 0.5 ? band(0.5, 0.9) : band(0.08, 0.12); if (vs === null || vs < 1 || vs >= conv) continue;
    }
    if (!validNum(vs) || !validNum(vb)) continue;
    const bigLeft = R() < 0.5;
    const bigIdx = bigLeft ? 0 : 1, smallIdx = bigLeft ? 1 : 0;
    const ansIdx = concl === 'same' ? 2 : concl === 'big' ? bigIdx : smallIdx;
    if (cdir === 'up' && (vs < 10 || !validNum(rd(vs / r.f)) || !isInt(rd(vs / r.f) * 100))) continue; // v0.2.3: the small side divides to 2 decimals at most
    return { pattern: 'compare', kind: 'choice', domain, dir: cdir, form, rel: r.id, f: r.f, vb, vs, conv, concl,
      bigU: r.big, smallU: r.small, bigIdx, smallIdx, ansIdx, raw: vb, gv: cdir === 'up' ? vs : vb,
      paths: [cdir === 'up' ? { v: vs, f: r.f, op: '÷', kd: kdOf(domain), relId: r.id, asm: x => x } : { v: vb, f: r.f, op: '×', kd: kdOf(domain), relId: r.id, asm: x => x }] };
  }
  throw new Error('cmp');
}
const conclOf = (a, b) => (eq(a, b) ? 'same' : a > b ? 'big' : 'small'); // a = big-unit side, b = small side, in one unit
// v0.2.3: conclusion of a compare item when its conversion is done with (op, f) in the item's own direction
const cmpConcl = (q, op, f) => (q.dir === 'up' ? conclOf(q.vb, rd(opApply(q.vs, op, f))) : conclOf(rd(opApply(q.vb, op, f)), q.vs));
function makeAlign(R, o) {
  const adir = o._dir || (o._dir = planDir(R, o.dir || 'down'));
  const aband = o._band || (o._band = planBand(R));
  const okBand = g => (aband === 'small' ? g < 10 : g >= 10);
  for (let t = 0; t < 500; t++) {
    const domain = o._dom || (o._dom = planPick(R, o.domains));
    const plus = R() < 0.5;
    if (adir === 'up') { // v0.2.1: the answer is asked in the bigger unit, so the small-unit addend goes up
      let r, f, vb, s, kd, cpair = null;
      if (domain === 'time') { cpair = pick(R, ['C1', 'C2']); f = 60; vb = pick(R, B_DEC.filter(x => x < 10)); s = pick(R, [15, 30, 45, 6, 9]); kd = 'time'; }
      else { r = pick(R, POOL1.filter(x => x.domain === domain)); f = r.f; vb = pick(R, R() < 0.5 ? B_INT : B_DEC); s = rd(pick(R, [1, 2, 3, 4, 5, 6, 7, 8, 9]) * Math.max(1, f / 10)); kd = 'dec'; }
      const ans = rd(vb + (plus ? 1 : -1) * s / f); if (!validNum(ans) || !validNum(s) || !okBand(s)) continue;
      return { pattern: 'align_calc', kind: 'num_unit', domain, dir: 'up', form: isInt(vb) ? 'int' : 'dec', rel: r ? r.id : null, f, vb, s, plus, ans, cpair,
        raw: rd(vb + (plus ? s : -s)), gv: s, paths: [{ v: s, f, op: '÷', kd, relId: r ? r.id : null, asm: x => vb + (plus ? x : -x) }] };
    }
    if (domain === 'time') {
      const c = pick(R, ['C1', 'C2']); const form = 'dec'; // v0.2: time align is dec only (4.11)
      const s = pick(R, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
      if (form === 'comp') {
        const hi = pick(R, [1, 2, 3]), lo = pick(R, COMP_VALS.time.lo);
        const ans = 60 * hi + lo + (plus ? s : -s); if (ans <= 0) continue;
        return { pattern: 'align_calc', kind: 'num_unit', domain, dir: 'down', form, f: 60, hi, lo, s, plus, ans,
          raw: concatNum(hi, lo) + (plus ? s : -s), gv: hi, cpair: c,
          paths: [{ v: hi, f: 60, op: '×', kd: 'time', comp: true, asm: x => x + lo + (plus ? s : -s) }] };
      }
      const vb = pick(R, B_DEC.filter(x => x < 10)); const ans = rd(60 * vb + (plus ? s : -s)); if (ans <= 0 || !okBand(vb)) continue;
      return { pattern: 'align_calc', kind: 'num_unit', domain, dir: 'down', form, f: 60, vb, s, plus, ans, raw: rd(vb + (plus ? s : -s)), gv: vb, cpair: c,
        paths: [{ v: vb, f: 60, op: '×', kd: 'time', asm: x => x + (plus ? s : -s) }] };
    }
    const r = pick(R, POOL1.filter(x => x.domain === domain));
    const form = pick(R, ['int', 'dec']);
    const vb = form === 'int' ? pick(R, B_INT) : pick(R, B_DEC); if (!okBand(vb)) continue;
    // AMB: small-unit addend values are not specified; use k * f/10 (k 1..9).
    const s = rd(pick(R, [1, 2, 3, 4, 5, 6, 7, 8, 9]) * Math.max(1, r.f / 10));
    const ans = rd(vb * r.f + (plus ? s : -s)); if (!validNum(ans)) continue;
    return { pattern: 'align_calc', kind: 'num_unit', domain, dir: 'down', form, rel: r.id, f: r.f, vb, s, plus, ans,
      raw: rd(vb + (plus ? s : -s)), gv: vb,
      paths: [{ v: vb, f: r.f, op: '×', kd: 'dec', relId: r.id, asm: x => x + (plus ? s : -s) }] };
  }
  throw new Error('align');
}
// v0.2.3: 'apply' plans the direction (up: kmph_min, down: sps_min or mpm_km) and the band of the number to convert,
// and 'mix' plans the direction (up: 1 秒で, down: 1 分で), so both go into the mirror of the plan (4.13)
function makeSpeedApply(R, type0) {
  let type = type0, band = null;
  if (type0 === 'apply') { const d = planDir(R, ['down', 'up']); band = planBand(R); type = d === 'up' ? 'kmph_min' : pick(R, ['sps_min', 'mpm_km']); }
  if (type0 === 'mix') type = planDir(R, ['down', 'up']) === 'up' ? 'mix_persec' : 'mix_permin';
  for (let t = 0; t < 500; t++) {
    if (type === 'kmph_min') {
      const v = pick(R, [12, 15, 18, 24, 30, 36, 42, 48, 54, 60]); const m = pick(R, band === 'small' ? [3, 5, 6] : [10, 15, 20, 25, 30, 35, 40, 45, 50]);
      const ans = rd(v * m / 60); if (!isInt(ans * 10)) continue;
      return { pattern: 'speed_apply', sa: type, kind: 'num_unit', domain: 'speed', dir: 'up', form: 'int', v, m, ans, raw: v * m, gv: m,
        paths: [{ v: m, f: 60, op: '÷', kd: 'time', asm: x => v * x }] };
    }
    if (type === 'mpm_km') {
      const v = pick(R, [50, 60, 75, 80, 100, 120, 150]); const d = band === 'big' ? pick(R, [10, 12, 15, 18, 20]) : rd((6 + Math.floor(R() * 25)) / 10);
      const ans = rd(d * 1000 / v); if (!isInt(ans)) continue;
      return { pattern: 'speed_apply', sa: type, kind: 'num_unit', domain: 'speed', dir: 'down', form: 'int', v, d, ans, raw: rd(d / v), gv: d,
        paths: [{ v: d, f: 1000, op: '×', kd: 'dec', asm: x => x / v }] };
    }
    if (type === 'sps_min') {
      const v = 5 + Math.floor(R() * 21); const m = pick(R, band === 'big' ? [10, 15, 20] : [1, 2, 3, 4, 5]); const ans = v * 60 * m; if (!validNum(ans)) continue;
      return { pattern: 'speed_apply', sa: type, kind: 'num_unit', domain: 'speed', dir: 'down', form: 'int', v, m, ans, raw: v * m, gv: m,
        paths: [{ v: m, f: 60, op: '×', kd: 'time', asm: x => v * x }] };
    }
    // v0.2: mix_persec. "分速 a m と 秒速 b m。1 秒で 進む 道のりの 合計は 何 m" (up, a / 60 + b) or
    // "1 分で 進む 道のりの 合計" (down, a + 60 b). Every route needs a speed conversion; no time is given.
    const a = pick(R, [60, 90, 120, 150, 180, 240]); const b = pick(R, [10, 12, 15, 20, 25]); // v0.2.3: 秒速 is 10 m or more, so both directions convert a number of 10 or more // v0.2.1: 秒速 10 m 以上も入れる (帯と向きの独立)
    const perSec = type === 'mix_persec' ? true : type === 'mix_permin' ? false : R() < 0.5;
    if (perSec) { const ans = rd(a / 60 + b); if (!validNum(ans)) continue;
      return { pattern: 'speed_apply', sa: 'mix_persec', kind: 'num_unit', domain: 'speed', dir: 'up', form: isInt(a / 60) ? 'int' : 'dec', v: a, b, ans, raw: rd(a + b), gv: a,
        paths: [{ v: a, f: 60, op: '÷', kd: 'speed', asm: x => x + b }] }; }
    const ans = rd(a + 60 * b);
    return { pattern: 'speed_apply', sa: 'mix_permin', kind: 'num_unit', domain: 'speed', dir: 'down', form: isInt(b) ? 'int' : 'dec', v: b, a, ans, raw: rd(a + b), gv: b,
      paths: [{ v: b, f: 60, op: '×', kd: 'speed', asm: x => x + a }] };
  }
  throw new Error('sa');
}

// ---------- diagnosis ----------
function shiftDigit(R, x) {
  const s = String(x); const idx = [];
  for (let i = 0; i < s.length; i++) if (/\d/.test(s[i])) idx.push(i);
  for (let t = 0; t < 50; t++) {
    const i = pick(R, idx); const d = Number(s[i]); const nd = d + (R() < 0.5 ? 1 : -1);
    if (nd < 0 || nd > 9) continue; if (i === 0 && nd === 0) continue;
    const y = Number(s.slice(0, i) + nd + s.slice(i + 1)); if (y > 0 && !eq(y, x)) return y;
  }
  return rd(x + 1);
}
const isTimeNonIntSrc = q => (q.domain === 'time' && ['dec', 'frac', 'comp'].includes(q.form)) || (q.pattern === 'convert' && q.domain === 'time' && !isInt(q.ans));
function errorCandidates(q) {
  const P = q.pattern, kd = kdOf(q.domain), c = [];
  if (P === 'convert') {
    if (q.f !== 1) c.push('direction');
    if (kd === 'dec') { c.push('steps', 'other_domain'); }
    if (kd === 'time') { c.push('other_domain'); if (isTimeNonIntSrc(q)) c.push('sixty'); }
    if (q.rel === 'R16') c.push('sixty');
  } else if (P === 'compare') {
    c.push('not_aligned'); if (kd === 'dec') c.push('steps'); if ((kd === 'time' && !isInt(q.vb)) || q.rel === 'R16') c.push('sixty');
  } else if (P === 'align_calc') {
    if (kd === 'dec') c.push('steps'); if (kd === 'time') c.push('sixty');
    if (!(kd === 'time' && q.form === 'comp')) c.push('not_aligned');
  } else if (P === 'speed_apply') {
    c.push('direction'); if (q.sa === 'kmph_min' || (q.sa === 'mix_persec' && !isInt(q.v / 60))) c.push('sixty'); c.push('not_aligned');
  }
  return c;
}
function stepsF(R, f) { const s = [f * 10]; if (f / 10 >= 10) s.push(f / 10); return pick(R, s); }
const sixtyF = f => (f === 60 ? 100 : f === 3600 ? 10000 : f);
// value produced by applying a (possibly wrong) op/f on path0 of q
function evalPath(q, p, op, f) { if (p.comp && q.pattern !== 'time_express') return p.asm(opApply(p.v, op, f)); return p.asm(opApply(p.v, op, f)); }
function answerValue(q, op, f) { // numeric or conclusion
  const p = q.paths[0]; const x = evalPath(q, p, op, f);
  if (q.pattern === 'compare') return cmpConcl(q, op, f);
  return rd(x);
}
function makeDiagnosis(R, src, labels) {
  const wantCorrect = PLAN.di < PLAN.diag.length ? PLAN.diag[PLAN.di++] : R() < 0.25;
  for (let t = 0; t < 200; t++) {
    const p = src.paths[0];
    const cands = errorCandidates(src).filter(l => labels.includes(l));
    if (!wantCorrect && t >= 100) return null; // v0.2: no fallback to a correct sheet (keeps 4.9 の 3)
    let label = wantCorrect ? 'correct' : pick(R, cands);
    let value, shownF = p.f, shownOp = p.op, raw = false, arithOK = true;
    const correctV = src.pattern === 'compare' ? src.concl : src.ans;
    if (label === 'correct') value = correctV;
    else if (label === 'direction') { shownOp = rev(p.op); value = answerValue(src, shownOp, p.f); }
    else if (label === 'steps') { shownF = stepsF(R, p.f); value = answerValue(src, p.op, shownF); }
    else if (label === 'sixty') { shownF = sixtyF(p.f); value = answerValue(src, p.op, shownF); }
    else if (label === 'other_domain') { shownF = kdOf(src.domain) === 'dec' ? 60 : 1000; value = answerValue(src, p.op, shownF); }
    else if (label === 'not_aligned') { raw = true; shownF = null; value = src.pattern === 'compare' ? conclOf(src.vb, src.vs) : rd(src.raw); }
    else if (label === 'calc') { arithOK = false; value = shiftDigit(R, src.ans); }
    if (label !== 'correct') { if (src.pattern === 'compare' ? value === correctV : eq(value, correctV)) continue; }
    if (src.pattern !== 'compare' && !validNum(value)) continue; // v0.2: shown values stay within 2 decimals
    const opts = [label]; if (label !== 'correct') opts.push('correct');
    for (const l of shuffle(R, labels)) if (opts.length < 4 && !opts.includes(l)) opts.push(l);
    const sh = shuffle(R, opts);
    return { pattern: 'diagnosis', kind: 'choice', src, domain: src.domain, label, value, shownF, shownOp, raw, arithOK,
      opts: sh, ansIdx: sh.indexOf(label) };
  }
  return null;
}

module.exports = { PLAN, planDir, planPick, planBand, B_INT, B_DEC, UP_SMALL, rng, pick, shuffle, rd, eq, isInt, validNum, REL1, REL2, POOL1, DEC_DOMAINS, DOM5, INT_DOWN, SPD_INT, DEC_DOWN, DEC_UP, FRAC,
  LABELS4, LABELS6, kdOf, opApply, rev, convQ, makeConvert, makeRateSelect, makeRecall, makeTimeExpress, makeCompound, compoundQ,
  makeCompare, makeAlign, makeSpeedApply, makeDiagnosis, conclOf, cmpConcl, errorCandidates, CPAIRS, COMP_VALS, sixtyF, isTimeNonIntSrc };
