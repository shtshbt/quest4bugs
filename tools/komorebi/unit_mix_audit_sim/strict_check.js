#!/usr/bin/env node
// Asserts the checks of 10 章 (docs/komorebi_unit_mix_curriculum.md) on the output of strict_gen.js.
// Each check prints PASS / FAIL / NOTE. Answers, error types and the values put in the explanations are recomputed
// here from the quantities of each item (given number, units, the compound parts, the speeds), with this file's own
// unit table, independently of the generator's step objects.
//   node strict_check.js [sets-per-Lv] [seed,seed,...]          (exit 1 when any check fails)
//   node strict_check.js --gen <lv> <sets> <seed> <out.json>     (one generation job; the main mode runs these in parallel)
// The enemy solvers of checks 25, 29, 30 and 31 are run by: node strict_enemies.js <sets.json ...>
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawn } = require('child_process');

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const strip = q => { const o = {}; for (const [k, v] of Object.entries(q)) if (typeof v !== 'function') o[k] = (v && typeof v === 'object' && v.pattern) ? strip(v) : v; return o; };

if (require.main === module && process.argv[2] === '--gen') {
  const G = require('./strict_gen.js');
  const [lv, n, seed, out] = [+process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
  const r = mulberry32(seed * 100 + lv), st = G.newState(), sets = [];
  for (let i = 0; i < n; i++) { const s = G.buildSet(lv, r, st); sets.push({ plans: s.plans, items: s.map(strip) }); }
  fs.writeFileSync(out, JSON.stringify({ lv, seed, sets }));
  process.exit(0);
}

const N = +(process.argv[2] || 2000);
const SEEDS = String(process.argv[3] || '1,2').split(',').map(Number);
if (!Number.isInteger(N) || N < 10) { console.error('sets-per-Lv must be an integer >= 10'); process.exit(2); }
const DOC = process.env.UMIX_DOC || path.join(__dirname, '../../../docs/komorebi_unit_mix_curriculum.md');
const MD = fs.readFileSync(DOC, 'utf8');
const LVS = process.env.STRICT_LVS ? process.env.STRICT_LVS.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // a partial run for debugging
const OUT = require.main === module ? (process.env.STRICT_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'umix_strict_'))) : null;

// ---------- generate (parallel jobs) ----------
async function generate() {
  const jobs = []; for (const seed of SEEDS) for (const lv of LVS) jobs.push({ lv, seed, file: path.join(OUT, `sets_${seed}_${lv}.json`) });
  const todo = jobs.filter(j => !fs.existsSync(j.file)); const par = Math.max(1, Math.min(todo.length, os.cpus().length - 2));
  let next = 0;
  await Promise.all(Array.from({ length: par }, async () => {
    while (next < todo.length) { const j = todo[next++];
      await new Promise((res, rej) => { const p = spawn(process.execPath, [__filename, '--gen', j.lv, N, j.seed, j.file], { stdio: 'inherit' }); p.on('exit', c => (c ? rej(new Error(`gen Lv${j.lv} seed ${j.seed} exit ${c}`)) : res())); });
      console.error(`generated Lv${j.lv} seed ${j.seed}`); }
  }));
  return jobs.map(j => JSON.parse(fs.readFileSync(j.file, 'utf8')));
}

// ---------- independent model ----------
const U = { mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, g: 1, kg: 1e3, t: 1e6, 'cm²': 1e-4, 'm²': 1, a: 1e2, ha: 1e4, 'km²': 1e6, 'cm³': 1e-6, mL: 1e-6, L: 1e-3, 'm³': 1,
  '秒': 1, '分': 60, '時間': 3600, '秒速m': 1, '分速m': 1 / 60, '時速km': 5 / 18 };
const DOMU = { length: ['mm', 'cm', 'm', 'km'], weight: ['g', 'kg', 't'], area: ['cm²', 'm²', 'a', 'ha', 'km²'], volume: ['cm³', 'mL', 'L', 'm³'], time: ['秒', '分', '時間'], speed: ['秒速m', '分速m', '時速km', '時速m'] };
const domOfU = u => Object.keys(DOMU).find(d => DOMU[d].includes(u));
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const isInt = x => near(x, Math.round(x));
function decimals(x) { for (let d = 0; d <= 8; d++) if (near(x * 10 ** d, Math.round(x * 10 ** d))) return d; return 99; }
const digits = x => String(Math.floor(Math.abs(x) + 1e-9)).length;
const okNum = x => x > 0 && digits(x) <= 6 && decimals(x) <= 2;
const cv = (x, from, to) => x * U[from] / U[to];
const ratio = (a, b) => { const r = U[a] > U[b] ? U[a] / U[b] : U[b] / U[a]; return Math.round(r * 1e6) / 1e6; };
const dirOf = (from, to) => (U[from] > U[to] ? 'down' : 'up');
const COMPU = { C1: ['時間', '分'], C2: ['分', '秒'], C3: ['m', 'cm'], C4: ['km', 'm'], C5: ['kg', 'g'] };
const REL1 = { R1: ['cm', 'mm'], R2: ['m', 'cm'], R3: ['km', 'm'], R4: ['kg', 'g'], R5: ['t', 'kg'], R6: ['m²', 'cm²'], R7: ['a', 'm²'], R8: ['ha', 'a'], R9: ['km²', 'ha'],
  R10: ['L', 'mL'], R11: ['L', 'cm³'], R12: ['m³', 'L'], R13: ['mL', 'cm³'], R14: ['分', '秒'], R15: ['時間', '分'], R16: ['秒速m', '分速m'], R17: ['秒速m', '時速km'] };
const REL2 = { D1: ['m', 'mm'], D2: ['km', 'cm'], D3: ['t', 'g'], D4: ['ha', 'm²'], D5: ['km²', 'a'], D6: ['m³', 'mL'], D7: ['時間', '秒'] };
const relOfUnits = (a, b) => [...Object.entries(REL1), ...Object.entries(REL2)].find(([, [x, y]]) => (x === a && y === b) || (x === b && y === a))?.[0];
const base = q => (q.pattern === 'diagnosis' ? q.src : q);
// the given quantity and the asked unit of an item, from its surface fields
function given(q) {
  if (q.pattern === 'compound_in') return { x: q.hi, from: COMPU[q.cid][0], to: COMPU[q.cid][1] };
  if (q.pattern === 'speed_apply') return null;
  return { x: q.step.x, from: q.step.from, to: q.step.to };
}
// the true answer, recomputed
function truth(q) {
  switch (q.pattern) {
    case 'recall': case 'convert': return cv(q.step.x, q.step.from, q.step.to);
    case 'compound_in': { const [uh, ul] = COMPU[q.cid]; return cv(q.hi, uh, ul) + q.lo; }
    case 'align_calc': { const { A, B } = q; const to = q.dir === 'down' ? B.u : A.u; const a = cv(A.v, A.u, to), b = cv(B.v, B.u, to); return q.plus ? a + b : a - b; }
    case 'speed_apply': { const v = q.vals;
      if (q.type === 'kmph_min') return v.v * v.t / 60; if (q.type === 'mpm_km') return v.d * 1000 / v.v; if (q.type === 'sps_min') return v.v * 60 * v.t;
      if (q.type === 'mix_persec') return v.a / 60 + v.b; return v.a + v.b * 60; }
  }
  return NaN;
}
function truthOpt(q) {
  if (q.pattern === 'rate_select') { const f = ratio(q.step.from, q.step.to), op = dirOf(q.step.from, q.step.to) === 'down' ? 'x' : '/'; return q.options.findIndex(o => o.op === op && near(o.f, f)); }
  if (q.pattern === 'time_express') { const X = q.step.x; return q.form === 'comp' ? q.options.findIndex(o => o.H === Math.floor(X / 60) && o.M === X % 60) : q.options.findIndex(o => near(o.val, X / 60)); }
  if (q.pattern === 'compare') { const a = cv(q.L.v, q.L.u, q.alignTo), b = cv(q.R.v, q.R.u, q.alignTo); return near(a, b) ? 2 : a > b ? 0 : 1; }
  return -1;
}
// the conversion step of an item (the number that is converted and its direction), recomputed
function convStep(q) {
  switch (q.pattern) {
    case 'recall': case 'convert': case 'rate_select': return { x: q.step.x, from: q.step.from, to: q.step.to };
    case 'compound_in': { const [uh, ul] = COMPU[q.cid]; return { x: q.hi, from: uh, to: ul, comp: true }; }
    case 'time_express': return { x: q.step.x, from: '分', to: '時間' };
    case 'align_calc': return q.dir === 'down' ? { x: q.A.v, from: q.A.u, to: q.B.u } : { x: q.B.v, from: q.B.u, to: q.A.u };
    case 'compare': { const side = [q.L, q.R].find(z => z.u !== q.alignTo); return { x: side.v, from: side.u, to: q.alignTo }; }
    case 'speed_apply': { const v = q.vals;
      if (q.type === 'kmph_min') return { x: v.t, from: '分', to: '時間' }; if (q.type === 'mpm_km') return { x: v.d, from: 'km', to: 'm' }; if (q.type === 'sps_min') return { x: v.t, from: '分', to: '秒' };
      if (q.type === 'mix_persec') return { x: v.a, from: '分速m', to: '秒速m' }; return { x: v.b, from: '秒速m', to: '分速m' }; }
  }
  return null;
}
// one-error procedures (4.3 章) applied to the recomputed step
const timeNonInt = s => { const d = domOfU(s.from), r = cv(s.x, s.from, s.to); if (s.comp) return d === 'time'; if (d === 'time') return !isInt(s.x) || !isInt(r); if (d === 'speed' && near(ratio(s.from, s.to), 60)) return !isInt(s.x) || !isInt(r); return false; };
const PROC = {
  M1: s => ['x', ratio(s.from, s.to)], M1d: s => ['/', ratio(s.from, s.to)],
  M1mag: s => [s.x >= 10 ? '/' : 'x', ratio(s.from, s.to)], M1magR: s => [s.x >= 10 ? 'x' : '/', ratio(s.from, s.to)],
  M2: s => { const f = ratio(s.from, s.to); return [dirOf(s.from, s.to) === 'down' ? 'x' : '/', timeNonInt(s) ? (near(f, 60) ? 100 : near(f, 3600) ? 10000 : f) : f]; },
  M3: s => { const d = dirOf(s.from, s.to) === 'down' ? 'x' : '/'; return [domOfU(s.from) === 'speed' ? (d === 'x' ? '/' : 'x') : d, ratio(s.from, s.to)]; },
};
function procAnswer(q, name) { // value (num) or option index (choice)
  const s = convStep(q); const [op, f] = PROC[name](s); const y = op === 'x' ? s.x * f : s.x / f;
  switch (q.pattern) {
    case 'recall': case 'convert': return y;
    case 'compound_in': return y + q.lo;
    case 'align_calc': return q.dir === 'down' ? (q.plus ? y + q.B.v : y - q.B.v) : (q.plus ? q.A.v + y : q.A.v - y);
    case 'speed_apply': { const v = q.vals; if (q.type === 'kmph_min') return v.v * y; if (q.type === 'mpm_km') return y / v.v; if (q.type === 'sps_min') return v.v * y; if (q.type === 'mix_persec') return y + v.b; return v.a + y; }
    case 'rate_select': return q.options.findIndex(o => o.op === op && near(o.f, f));
    case 'time_express': if (q.form === 'comp') { if (op !== '/') return -1; const H = Math.floor(s.x / f); return q.options.findIndex(o => o.H === H && near(o.M, s.x - H * f)); } return q.options.findIndex(o => near(o.val, y));
    case 'compare': { const other = [q.L, q.R].find(z => z.u === q.alignTo); const oSide = other === q.L ? 0 : 1; const cSide = 1 - oSide; return near(y, other.v) ? 2 : (y > other.v ? cSide : oSide); }
  }
  return null;
}
const isRight = (q, name) => { const b = base(q); const a = procAnswer(b, name); return b.kind === 'num' ? near(a, truth(b)) : a === truthOpt(b); };
const trapsOf = (q, lv) => TRAP_LV.filter(([n, from]) => lv >= from && !isRight(q, n)).map(([n]) => n);
const TRAP_LV = [['M1mag', 1], ['M1magR', 1], ['M1', 3], ['M1d', 3], ['M2', 4], ['M3', 8]];

// ---------- reporting ----------
const results = [];
function check(no, title, fn) { const fails = [], note = []; try { fn(m => fails.length < 6 && fails.push(m), m => note.push(m)); } catch (e) { fails.push('exception: ' + e.stack.split('\n').slice(0, 2).join(' ')); } results.push({ no, title, fails, note }); }
const fmt = x => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const pidOf = q => (q.pattern === 'diagnosis' ? 'diagnosis.' + pidOf(q.src) : `${q.pattern}.${q.domain}.${q.dir}.${q.form}`);
function section(head) { const i = MD.indexOf('\n' + head); const j = MD.indexOf('\n### ', i + 1); return MD.slice(i, j < 0 ? undefined : j); }
function expand(e) { const m = e.match(/\{([^{}]*)\}/); if (!m) return [e]; return m[1].split(',').map(x => x.trim()).flatMap(x => expand(e.slice(0, m.index) + x + e.slice(m.index + m[0].length))); }
const SPACE = {}; for (const l of section('### 9.4').split('\n')) { const m = l.match(/^\| (\d+) \| (.*) \| (\d+) \|$/); if (m) SPACE[m[1]] = new Set([...m[2].matchAll(/`([^`]+)`/g)].flatMap(x => expand(x[1]))); }
// 5 章の配合 (pattern -> count), written from the table
// counted without the chain normal, whose pattern is the source's (check 9). 'convert|align_calc' counts either.
const MIX = { 1: { recall: 2, rate_select: 3 }, 2: { convert: 2, rate_select: 3 }, 3: { convert: 3, rate_select: 2 }, 4: { convert: 2, time_express: 1, diagnosis: 1 },
  5: { compound_in: 2, time_express: 1, convert: 1, rate_select: 1 }, 6: { compare: 1, diagnosis: 1, convert: 1, align_calc: 1 }, 7: { align_calc: 1, diagnosis: 1, convert: 2 },
  8: { convert: 4, rate_select: 1 }, 9: { diagnosis: 1, speed_apply: 1, 'convert|align_calc': 2 }, 10: { diagnosis: 1 } };
const CP_LV = { 2: 'CP1', 3: 'CP2', 4: 'CP1', 5: 'CP1', 8: 'CP1' };
const CHAIN_LV = [4, 6, 7, 9, 10];
const USABLE = { 4: ['correct', 'direction', 'steps', 'sixty', 'other_domain'] }; for (const lv of [6, 7, 9, 10]) USABLE[lv] = ['correct', 'not_aligned', 'direction', 'steps', 'sixty', 'other_domain'];
const SRC_OK = { direction: ['convert', 'align_calc', 'speed_apply'], steps: ['convert', 'align_calc'], sixty: ['convert', 'align_calc', 'speed_apply'], other_domain: ['convert'], not_aligned: ['align_calc', 'speed_apply'] };
const PRIO = ['direction', 'steps', 'sixty', 'other_domain', 'not_aligned'];
// 8.1 章: the value of a sheet made by one operation, recomputed
function sheetValue(src, label) {
  const s = convStep(src), f = ratio(s.from, s.to), d = dirOf(s.from, s.to) === 'down' ? 'x' : '/';
  const vals = [];
  const fin = y => { switch (src.pattern) { case 'convert': return y; case 'align_calc': return src.dir === 'down' ? (src.plus ? y + src.B.v : y - src.B.v) : (src.plus ? src.A.v + y : src.A.v - y);
    case 'speed_apply': { const v = src.vals; if (src.type === 'kmph_min') return v.v * y; if (src.type === 'mpm_km') return y / v.v; if (src.type === 'sps_min') return v.v * y; if (src.type === 'mix_persec') return y + v.b; return v.a + y; } } return NaN; };
  const ap = (op, g) => fin(op === 'x' ? s.x * g : s.x / g);
  if (label === 'direction') vals.push(ap(d === 'x' ? '/' : 'x', f));
  if (label === 'steps') { vals.push(ap(d, f * 10)); if (f / 10 >= 10) vals.push(ap(d, f / 10)); }
  if (label === 'sixty') vals.push(ap(d, near(f, 60) ? 100 : near(f, 3600) ? 10000 : f));
  if (label === 'other_domain') vals.push(ap(d, domOfU(s.from) === 'time' ? 1000 : 60));
  if (label === 'not_aligned') vals.push(src.pattern === 'align_calc' ? (src.plus ? src.A.v + src.B.v : src.A.v - src.B.v) : fin(s.x));
  return vals;
}
function labelAllowed(src, label) {
  if (!SRC_OK[label].includes(src.pattern)) return false;
  const dom = src.pattern === 'speed_apply' ? 'speed' : domOfU(convStep(src).from);
  if (label === 'steps') return ['length', 'weight', 'area', 'volume'].includes(dom);
  if (label === 'sixty') { const s = convStep(src); if (src.pattern === 'speed_apply') return src.type === 'kmph_min' || (src.type === 'mix_persec' && src.vals.a % 60 !== 0); return timeNonInt(s) || (dom === 'speed' && near(ratio(s.from, s.to), 60)); }
  if (label === 'other_domain') return src.pattern === 'convert' && dom !== 'speed';
  return true;
}

async function runChecks(data, implementation) {
  results.length = 0;
  const SETS = {}; for (const d of data) (SETS[d.lv] = SETS[d.lv] || []).push(...d.sets.map(s => s.items)); // seeds concatenated per Lv; windows below stay inside one seed
  const BYSEED = {}; for (const d of data) (BYSEED[d.lv] = BYSEED[d.lv] || []).push(d.sets.map(s => s.items));
  for (let lv = 1; lv <= 10; lv++) { SETS[lv] = SETS[lv] || []; BYSEED[lv] = BYSEED[lv] || []; }
  const ALL = []; for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) for (const q of s) ALL.push({ q, lv });
  console.error(`checking ${data.map(d => 'Lv' + d.lv + ':' + d.sets.length).join(', ')} (${ALL.length} items)`);

  check(1, '答えの一致', fail => { for (const { q, lv } of ALL) { const b = q; if (b.pattern === 'diagnosis') continue; if (b.kind === 'num' ? !near(b.ans, truth(b)) : b.ansOpt !== truthOpt(b)) { fail(`Lv${lv} ${pidOf(b)} ans ${b.ans} / ${truth(b)}`); } } });
  check(2, '関係の範囲', fail => { for (const { q, lv } of ALL) { const b = base(q); const g = given(b); if (!g) continue; const id = relOfUnits(g.from, g.to); if (!id) fail(`Lv${lv} ${g.from}->${g.to} no relation`); else if (id.startsWith('D') && lv < 5) fail(`Lv${lv} 2 段 ${id}`); else if (id === 'R13' && b.pattern !== 'recall') fail(`R13 outside recall`); else if (b.pattern === 'recall' && !['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R12', 'R13', 'R14', 'R15'].includes(id)) fail(`recall ${id}`); } });
  check(3, '領域と単位の範囲', fail => { for (const { q, lv } of ALL) { const b = base(q); const us = b.pattern === 'compare' ? [b.L.u, b.R.u] : b.pattern === 'align_calc' ? [b.A.u, b.B.u] : b.step ? [b.step.from, b.step.to] : []; for (const u of us) { if (!U[u] || u === '時速m') fail(`unit ${u}`); } if (b.domain === 'speed' && lv < 8) fail(`speed at Lv${lv}`); } });
  check(4, '桁', fail => { for (const { q, lv } of ALL) { const b = base(q); if (b.kind === 'num' && !okNum(truth(b))) fail(`Lv${lv} ${pidOf(b)} ans ${truth(b)}`); const s = convStep(b); if (s && b.pattern !== 'compound_in' && !(b.form === 'frac') && !okNum(s.x)) fail(`Lv${lv} given ${s.x}`); if (q.pattern === 'diagnosis' && q.label !== 'correct' && !okNum(q.shown)) fail(`shown ${q.shown}`); } });
  check(5, '配合', fail => { for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) { const c = {}; for (const q of s) { if (q.role === 'chain') continue; c[q.pattern] = (c[q.pattern] || 0) + 1; } c['convert|align_calc'] = (c.convert || 0) + (c.align_calc || 0); if (lv === 9 && s.filter(q => q.pattern === 'convert' && q.domain === 'speed' && q.role !== 'chain').length < 1) fail('Lv9 speed convert'); for (const [p, n] of Object.entries(MIX[lv])) if ((c[p] || 0) !== n) { fail(`Lv${lv} ${p} ${c[p] || 0} / ${n}`); break; } if (s.length !== 5) fail(`Lv${lv} ${s.length} items`); } });
  check(6, '領域の混在と重複 (4.2 の 1 から 6)', fail => {
    for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) { const doms = new Set(s.map(q => base(q).domain)); if (lv <= 3 && (doms.size < 3 || !doms.has('time'))) fail(`Lv${lv} domains`); if (lv === 10 && (doms.size < 3 || new Set(s.map(q => q.pattern)).size < 4)) fail('Lv10 domains or patterns');
      const G = require('./strict_gen.js'); const ks = s.filter(q => q.pattern !== 'recall').flatMap(G.qty); if (new Set(ks).size !== ks.length) fail(`Lv${lv} same quantity`); }
  });
  check(7, '誤り 1 つ型の罠 (4.3 章) と M1、M2、M3 の 10 問窓', (fail, note) => {
    for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) for (const [n, from] of TRAP_LV) if (lv >= from && s.filter(q => !isRight(q, n)).length < 2) { fail(`Lv${lv} ${n} traps ${s.filter(q => !isRight(q, n)).length}`); break; }
    for (const [n, from] of [['M1', 3], ['M2', 4], ['M3', 8]]) for (let lv = from; lv <= 10; lv++) for (const runs of BYSEED[lv]) {
      const sc = runs.map(s => s.filter(q => isRight(q, n)).length); if (sc.some(x => x === 5)) fail(`Lv${lv} ${n} all 5 correct`);
      let hit = 0; for (let i = 0; i + 1 < sc.length; i++) if (sc[i] + sc[i + 1] >= 8) hit++; const p = hit / (sc.length - 1); if (p > 0.15) fail(`Lv${lv} ${n} 10 問窓 ${fmt(p)}`);
    }
  });
  check(8, '対比ペア', fail => {
    for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) { const a = s.findIndex(q => q.role === 'cpA');
      if (!CP_LV[lv]) { if (a >= 0) fail(`Lv${lv} has a pair`); continue; }
      if (a < 0 || !s[a + 1] || s[a + 1].role !== 'cpB') { fail(`Lv${lv} no adjacent pair`); continue; }
      const p = s[a], q = s[a + 1]; if (p.cpType !== CP_LV[lv]) fail(`Lv${lv} type ${p.cpType}`);
      const gp = given(p), gq = given(q); if (!near(gp.x, gq.x) || (p.pattern === 'compound_in' && p.lo !== q.lo)) fail(`Lv${lv} given ${gp.x} ${gq.x}`);
      if (near(truth(q), truth(p)) || near(truth(q), gp.x)) fail(`Lv${lv} 2nd answer repeats`);
      if (lv === 8 && (p.domain !== 'time' || q.domain !== 'speed' || p.dir === q.dir)) fail(`Lv8 pair form ${p.domain} ${p.dir} ${q.domain} ${q.dir}`); }
  });
  check(9, '連鎖', fail => {
    const sameRatio = d => ['time', 'weight', 'volume'].includes(d);
    for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) { const i = s.findIndex(q => q.pattern === 'diagnosis');
      if (!CHAIN_LV.includes(lv)) continue; if (i < 0) { fail(`Lv${lv} no diagnosis`); continue; } const src = s[i].src, c = s[i + 1];
      if (!c || c.role !== 'chain') { fail(`Lv${lv} chain not after diagnosis`); continue; }
      if (c.pattern !== src.pattern || c.domain !== src.domain || c.form !== src.form) fail(`Lv${lv} chain ${pidOf(c)} / ${pidOf(src)}`);
      const rel = q => (q.pattern === 'speed_apply' ? q.type : q.pattern === 'align_calc' ? (q.domain === 'time' ? q.cpair : relOfUnits(q.A.u, q.B.u)) : relOfUnits(q.step.from, q.step.to));
      if (src.pattern === 'speed_apply') { if (rel(c) !== rel(src)) fail(`Lv${lv} speed_apply chain subtype`); } else if (rel(c) === rel(src)) fail(`Lv${lv} chain same relation ${rel(c)}`);
      const want = src.pattern !== 'speed_apply' && sameRatio(src.domain) ? (src.dir === 'down' ? 'up' : 'down') : src.dir; if (c.dir !== want) fail(`Lv${lv} chain dir ${c.dir} / ${want}`); }
  });
  check(10, '回答方式', fail => { for (const { q, lv } of ALL) { if (q.pattern === 'recall' && lv !== 1) fail('recall outside Lv1'); if (['convert', 'compound_in', 'align_calc', 'speed_apply'].includes(q.pattern) && !q.unit) fail(`${q.pattern} has no answer unit`); } });
  check(11, '単位チップ (4.12 章)', fail => { for (const { q } of ALL) { const b = base(q); if (!b.unit || b.pattern === 'speed_apply' && b.type !== 'mpm_km' && b.type !== 'kmph_min') continue; const d = domOfU(b.unit) || (b.unit === 'km' ? 'length' : null); if (!d || !DOMU[d].includes(b.unit)) fail(`${b.unit} not in chips of ${d}`); } });
  check(12, '単位の判定 (mL と cm³)', (fail, note) => note('生成器の外の判定の規則。実装の judgeNumUnit で検査する (この点検の対象外)'));
  check(13, '倍率えらびの 4 肢', fail => { const gC = (f, d) => (['length', 'weight', 'area', 'volume'].includes(d) ? [...(f !== 10000 ? [f * 10] : []), ...(f / 10 >= 10 ? [f / 10] : []), 60] : d === 'time' ? (near(f, 60) ? [100, 3600] : [60, 100]) : (near(f, 60) ? [100, 3.6] : [60]));
    for (const { q } of ALL) { if (q.pattern !== 'rate_select') continue; const f = ratio(q.step.from, q.step.to); const fs = [...new Set(q.options.map(o => o.f))]; if (q.options.length !== 4 || fs.length !== 2 || !fs.some(x => near(x, f))) { fail('not two reciprocal pairs'); continue; } for (const x of fs) if (!near(x, f) && !gC(f, domOfU(q.step.from)).some(y => near(y, x))) fail(`g ${x} for f ${f}`); for (const x of fs) for (const op of ['x', '/']) if (!q.options.some(o => o.op === op && near(o.f, x))) fail('pair incomplete'); } });
  check(14, '時間の言い方えらびの 4 肢', (fail, note) => { let below = 0, nn = 0;
    for (const { q } of ALL) { if (q.pattern !== 'time_express') continue; const X = q.step.x;
      if (q.form === 'comp') { if (X < 100) fail(`comp X ${X}`); const want = [[Math.floor(X / 60), X % 60], [Math.floor(X / 100), X % 100], [Math.floor(X / 10), X % 10]]; for (const [h, m] of want) if (!q.options.some(o => o.H === h && o.M === m)) fail(`comp option ${h}:${m} missing for ${X}`); const calc = q.options.filter(o => !want.some(([h, m]) => o.H === h && o.M === m)); if (calc.length !== 1 || calc[0].H !== Math.floor(X / 60) || Math.abs(calc[0].M - X % 60) !== 10) fail(`comp calc option for ${X}`); }
      else { const v = X / 60; const want = [v, X / 100, X * 60]; for (const w of want) if (!q.options.some(o => near(o.val, w))) fail(`option ${w} missing for ${X}`); const calc = q.options.filter(o => !want.some(w => near(o.val, w))); if (calc.length !== 1 || !(near(calc[0].val, X / 6) || near(calc[0].val, X / 600))) fail(`calc option for ${X}`); else { nn++; if (calc[0].val < v) below++; } }
      if (new Set(q.options.map(o => JSON.stringify(o.val ?? [o.H, o.M]))).size !== 4) fail('duplicate options'); }
    const sh = below / nn; if (!(sh >= 0.3 && sh <= 0.7)) fail(`calc below share ${fmt(sh)}`); else note(`計算ちがいの肢が正答より小さい割合 ${fmt(sh)}`); });
  check(15, '正解位置', (fail, note) => { for (let lv = 1; lv <= 10; lv++) { const pos = [0, 0, 0, 0]; let n = 0; for (const s of SETS[lv]) for (const q of s) if (['rate_select', 'time_express', 'diagnosis'].includes(q.pattern)) { pos[q.ansOpt]++; n++; } if (!n) continue; const sh = pos.map(x => x / n); if (sh.some(x => x < 0.2 || x > 0.3)) fail(`Lv${lv} ${sh.map(fmt).join('/')}`); } });
  check(16, 'compare の結論', (fail, note) => { const c = { big: 0, small: 0, same: 0 }; let n = 0; for (const s of SETS[6]) for (const q of s) if (q.pattern === 'compare') { c[q.concl]++; n++; const sig = x => { if (x < 10) return isInt(x); const p = 10 ** (Math.floor(Math.log10(x)) - 1); return near(x / p, Math.round(x / p)); }; if (q.concl !== 'same' && !(q.domain === 'time' && near(q.vs, q.vb * 100)) && !sig(q.vs)) fail(`vs ${q.vs} not 2 digits`); }
    for (const [k, v] of Object.entries(c)) if (v / n < 0.25 || v / n > 0.4) fail(`Lv6 ${k} ${fmt(v / n)}`); note(`Lv6 big ${fmt(c.big / n)} small ${fmt(c.small / n)} same ${fmt(c.same / n)}`); });
  check(17, '診断の答案', (fail, note) => { for (const lv of CHAIN_LV) { let n = 0, ok = 0; for (const s of SETS[lv]) for (const q of s) if (q.pattern === 'diagnosis') { n++; if (q.label === 'correct') { ok++; if (!near(q.shown, truth(q.src))) fail('correct sheet value'); } else { if (near(q.shown, truth(q.src))) fail('wrong sheet with the right answer'); if (!sheetValue(q.src, q.label).some(v => near(v, q.shown))) fail(`Lv${lv} ${q.label} sheet ${q.shown} not from 8.1`); } }
    const sh = ok / n; if (sh < 0.2 || sh > 0.3) fail(`Lv${lv} correct sheets ${fmt(sh)}`); else note(`Lv${lv} 正しい答案 ${fmt(sh)}`); } });
  check(18, '診断の選択肢と 8.1 章の優先順', fail => { for (const { q, lv } of ALL) { if (q.pattern !== 'diagnosis') continue; const o = q.options; if (o.length !== 4 || new Set(o).size !== 4 || !o.includes(q.label) || !o.includes('correct')) fail('options'); if (o.some(l => !USABLE[lv].includes(l))) fail(`Lv${lv} label outside 8.2`); if (q.label === 'correct') continue;
    if (!labelAllowed(q.src, q.label)) fail(`Lv${lv} ${q.label} on ${q.src.pattern}.${q.src.domain}`);
    const top = PRIO.find(l => USABLE[lv].includes(l) && labelAllowed(q.src, l) && sheetValue(q.src, l).some(v => near(v, q.shown))); if (top !== q.label) fail(`Lv${lv} label ${q.label}, 8.1 priority gives ${top}`); } });
  check(19, '診断ラベルの種数', fail => { for (const lv of CHAIN_LV) { const k = new Set(SETS[lv].flat().filter(q => q.pattern === 'diagnosis' && q.label !== 'correct').map(q => q.label)); if (k.size < 3) fail(`Lv${lv} ${[...k]}`); } });
  check(20, '同一 patternId の上限', fail => { for (let lv = 1; lv <= 10; lv++) for (const s of SETS[lv]) { const c = {}; for (const q of s) { const k = pidOf(q); c[k] = (c[k] || 0) + 1; if (c[k] > 2) fail(`Lv${lv} ${k}`); } } });
  check(21, '複名数の下の位', (fail, note) => { let n = 0, short = 0; for (const s of SETS[10]) for (const q of s) if (q.pattern === 'compound_in' && q.domain !== 'time') { n++; if ((q.cid === 'C3' && q.lo < 10) || (q.cid !== 'C3' && q.lo < 100)) short++; } if (n && short / n < 0.5) fail(`Lv10 short ${fmt(short / n)}`); note(`Lv10 の長さと重さの複名数のうち桁の少ない下の位 ${fmt(short / n)} (n ${n})`); });
  check(22, '浮動小数を経由しない', (fail, note) => note('実装の表現 (仮数と指数、有理数) の検査。監査の生成器は浮動小数で書いているので対象外'));
  check(23, '乱数', fail => { const src = fs.readFileSync(implementation ? implementation.source : path.join(__dirname, 'strict_gen.js'), 'utf8'); if (/Math\.random|Date\.now/.test(src)) fail('Math.random or Date.now'); const G = implementation || require('./strict_gen.js'); for (const lv of [3, 6]) { const a = G.buildSet(lv, mulberry32(77), G.newState()).map(pidOf).join(), b = G.buildSet(lv, mulberry32(77), G.newState()).map(pidOf).join(); if (a !== b) fail(`Lv${lv} not reproducible`); } });
  check(24, '1 問の長さ', fail => { const optTxt = (q, o) => (q.pattern === 'rate_select' ? (o.op === 'x' ? '×' : '÷') + o.f : q.pattern === 'time_express' ? (o.H !== undefined ? `${o.H}時間${o.M}分` : `${o.val}時間`) : '');
    for (const { q } of ALL) { if (q.pattern === 'rate_select' || (q.pattern === 'time_express' && q.form === 'comp')) for (const o of q.options) if (optTxt(q, o).length > 10) fail(`option ${optTxt(q, o)}`); } });
  check(25, '敵ソルバー (段 A、段 B、誤り 1 つ型)', (fail, note) => note('strict_enemies.js で測る (11.0 章)'));
  check(26, '表の行数', fail => { const t = section('### 3.7'); const want = { 領域: '6', 単位: '22 + 受け皿 1', 向き: '2', 数の形: '4', 問題型: '9', 'speed_apply の小型': '5', 診断ラベル: '6' };
    for (const [k, v] of Object.entries(want)) { const m = t.match(new RegExp(`\\| ${k} \\| [^|]+ \\| ([^|]+) \\|`)); if (!m || m[1].trim() !== v) fail(`3.7 ${k}: ${m && m[1]}`); }
    if (Object.keys(DOMU).length !== 6 || Object.values(DOMU).flat().length !== 23) fail('model units'); });
  check(27, '値の帯 (Lv3 から Lv10 の累計)', (fail, note) => { let dn = 0, dh = 0, up = 0, ul = 0; for (let lv = 3; lv <= 10; lv++) for (const s of SETS[lv]) for (const q of s) { const b = base(q); if (!['convert', 'rate_select', 'align_calc'].includes(b.pattern)) continue; const st = convStep(b); if (b.dir === 'down') { dn++; if (st.x >= 10) dh++; } else { up++; if (st.x < 10) ul++; } }
    if (dh / dn < 0.2 || ul / up < 0.2) fail(`down>=10 ${fmt(dh / dn)} up<10 ${fmt(ul / up)}`); note(`下りの 10 以上 ${fmt(dh / dn)}、上りの 10 未満 ${fmt(ul / up)}`); });
  check(28, '付録 A の golden case と 6 章の例題', fail => { try { if (implementation) require('./check_appendix.js').checkAppendix(DOC, ALL, implementation).forEach(fail); else execFileSync(process.execPath, [path.join(__dirname, 'check_appendix.js'), DOC], { stdio: 'pipe' }); } catch (e) { fail(String(e.stdout || e.stderr || e.message).slice(0, 1000)); } }); // v0.2.8: values, not only the patternId
  check(29, '肢の形 (C5)', (fail, note) => note('B8 は strict_enemies.js で測る。倍率の組の対称は検査 13 の g の候補で確かめた'));
  check(30, '対比の組 (C6)', (fail, note) => note('B9 と A10 は strict_enemies.js で測る'));
  check(31, '同時分布 (4.13 の 1 と 2)', (fail, note) => {
    for (let lv = 3; lv <= 10; lv++) { const dd = {}, bd = {}; for (const s of SETS[lv]) for (const q of s) { const b = base(q); if (!['convert', 'rate_select', 'align_calc'].includes(b.pattern) || q.role === 'cpB') continue; const st = convStep(b); const k = b.domain; dd[k] = dd[k] || [0, 0]; dd[k][1]++; if (b.dir === 'up') dd[k][0]++; const bb = st.x >= 10 ? 'hi' : 'lo'; bd[bb] = bd[bb] || [0, 0]; bd[bb][1]++; if (b.dir === 'up') bd[bb][0]++; }
      for (const [k, [u, n]] of Object.entries(dd)) if (n >= 30 && (u / n < 0.3 || u / n > 0.7)) fail(`Lv${lv} ${k} up ${fmt(u / n)} (n ${n})`);
      for (const [k, [u, n]] of Object.entries(bd)) if (n >= 30 && (u / n < 0.3 || u / n > 0.7)) fail(`Lv${lv} band ${k} up ${fmt(u / n)} (n ${n})`); }
    note('E7、M1magR、M1d は strict_enemies.js で測る'); });
  check(32, '解説の文', fail => { try { if (implementation) { if (require('./check_explanations.js').checkExplanations(ALL.map(x => x.q), implementation, () => {})) fail('explanations differ'); } else execFileSync(process.execPath, [path.join(__dirname, 'check_explanations.js')], { stdio: 'pipe' }); } catch (e) { fail(String(e.stdout || e.stderr || e.message).slice(0, 300)); } });
  check(33, '敵の正本', (fail, note) => note('10.2 章の表の行は solvers.js と strict_enemies.js にある'));
  check(34, '表と生成器の 1 対 1', fail => { try { if (implementation) { if (require('./check_tables.js').checkTables(MD, implementation.VALUES, implementation.spaces)) fail('implementation tables differ'); } else execFileSync(process.execPath, [path.join(__dirname, 'check_tables.js'), DOC], { stdio: 'pipe' }); } catch (e) { fail(String(e.stderr || e.message).slice(0, 300)); }
    for (const { q, lv } of ALL) if (!SPACE[lv].has(pidOf(q))) { fail(`Lv${lv} strict_gen makes ${pidOf(q)}, not in 9.4`); break; } });
  check(35, '短期の重複回避', fail => { const G = require('./strict_gen.js'); for (let lv = 1; lv <= 10; lv++) { if (lv === 8) continue; for (const runs of BYSEED[lv]) for (let i = 1; i < runs.length; i++) { const prev = new Set(runs.slice(Math.max(0, i - 3), i).flatMap(G.questions)); if (G.questions(runs[i]).some(k => prev.has(k))) { fail(`Lv${lv} set ${i} repeats`); break; } } } });

  let bad = 0;
  for (const r of results) { const st = r.fails.length ? 'FAIL' : 'PASS'; if (r.fails.length) bad++; console.log(`${st} ${String(r.no).padStart(2)} ${r.title}${r.note.length ? '  (' + r.note.join('; ') + ')' : ''}`); for (const f of r.fails) console.log('     ' + f); }
  console.log(`${results.length - bad} / ${results.length} pass. sets: ${OUT}`);
  return results;
}
if (require.main === module) generate().then(runChecks).then(r => { process.exitCode = r.some(x => x.fails.length) ? 1 : 0; }).catch(e => { console.error(e); process.exitCode = 2; });
module.exports = { runChecks, truth, truthOpt, pidOf, trapsOf, mulberry32, SPACE };
