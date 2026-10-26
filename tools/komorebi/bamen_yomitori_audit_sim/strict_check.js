#!/usr/bin/env node
// Asserts the checks of 10 章 (docs/komorebi_bamen_yomitori_curriculum.md, v0.5.5) on the output of
// strict_gen.js. Each check prints PASS / FAIL with the offending values. Answers and error types
// are recomputed here from the scene model, independently of the generator's own bookkeeping.
//   node strict_check.js [sets-per-Lv] [seed]      (exit 1 when any check fails)
// Check 36 (adversarial solvers) is run by:  STRICT=1 SEED=<seed> node audit_sim.js 400 --stage
'use strict';
const fs = require('fs');
const path = require('path');
const { checkAppendix } = require('./check_appendix.js');
const { mulberry32 } = require('./audit_sim.js');

function runChecks(G, N = 2000, SEED = 4242, sourcePath = path.join(__dirname, 'strict_gen.js'), biasCounts = {}) {
const counts = Array.from({ length: 10 }, (_, i) => typeof N === 'number' ? N : N[i + 1]);
if (counts.some(n => !Number.isInteger(n) || n < 10)) throw new Error('sets-per-Lv must be an integer >= 10');
const DOC = path.join(__dirname, '../../../docs/komorebi_bamen_yomitori_curriculum.md');

// ---------- generate ----------
const SETS = {}; // lv -> [sets]
const streams = {};
for (let lv = 1; lv <= 10; lv++) {
  const r = mulberry32(SEED + lv), st = G.newState(); SETS[lv] = [];
  streams[lv] = { r, st };
  for (let i = 0; i < counts[lv - 1]; i++) SETS[lv].push(G.buildSet(lv, r, st));
}
const ALL = []; for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) for (const it of set) ALL.push(it);
console.error(`generated ${typeof N === 'number' ? N : counts.join('/')} sets per Lv (${ALL.length} items)`);

// ---------- reporting ----------
const results = [];
function check(no, title, fn) {
  const fails = [];
  const note = [];
  try { fn(msg => fails.push(msg), msg => note.push(msg)); } catch (e) { fails.push('exception: ' + e.message); }
  results.push({ no, title, fails, note });
}
const share = (a, b) => (b ? a / b : NaN);
const band = (x, lo, hi) => x >= lo && x <= hi;
const fmt = x => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const textOf = it => it.text;
const sentText = s => s.toks.join(' ').replace(/、 /g, '、');
const fullNames = it => it.persons.map(p => p.full);
function firstMentions(it) { const seen = []; for (const s of it.S) for (const t of s.toks) for (const p of it.persons) if (t.includes(p.full) && !seen.includes(p.full)) seen.push(p.full); return seen; }
function namesIn(it, str) { return it.persons.filter(p => str.includes(p.full)).map(p => p.full); }
const argext = (V, keys, pol) => { let best = null; for (const k of keys) if (best === null || (pol === 'up' ? V[k] > V[best] : V[k] < V[best])) best = k; return keys.filter(k => V[k] === V[best]).length > 1 ? null : best; };

// ---------- scene model (independent) ----------
function stateOf(it, time) {
  const sc = it.scene, ps = sc.ps.map(p => p.full);
  let v;
  if (sc.structure === 'have' || sc.structure === 'relation' || sc.structure === 'split') v = sc.vals.slice();
  if (sc.structure === 'transfer' || sc.step) { v = sc.vals.slice(); if (time !== 'before') { v[sc.gi] -= sc.n; v[sc.ri] += sc.n; } }
  return Object.fromEntries(ps.map((p, i) => [p, v[i]]));
}
const PATTERNS = {
  have_num: ['have', 'num_of', 'number', [2, 4], 1], have_who: ['have', 'who_n', 'person', [2, 4], 1], have_more: ['have', 'more2', 'person', [2, 2], 1], have_most: ['have', 'most', 'person', [3, 4], 4],
  split_num: ['split', 'num_of', 'number', [2, 4], 2], split_part: ['split', 'num_of', 'number', [2, 4], 2], split_who: ['split', 'more2', 'person', [2, 2], 2], split_most: ['split', 'most', 'person', [3, 4], 5], split_used: ['split', 'used', 'find_all', [3, 4], 9],
  transfer_who: ['transfer', 'gain', 'person', [2, 4], 3], transfer_same: ['transfer', 'same', 'person', [3, 3], 6], transfer_num: ['transfer', 'num_of', 'number', [2, 4], 3], transfer_change: ['transfer', 'change', 'change', [3, 4], 7], transfer_card: ['transfer', 'card', 'card', [2, 4], 3], transfer_used: ['transfer', 'used', 'find_all', [3, 4], 6],
  rel_most: ['relation', 'most', 'person', [3, 3], 4], rel_num: ['relation', 'num_of', 'number', [3, 3], 4], rel_card: ['relation', 'card', 'card', [3, 3], 4],
  step_transfer_most: ['step', 'most', 'person', [3, 4], 10], step_split_transfer_most: ['step', 'most', 'person', [3, 4], 10], step_split_transfer_card: ['step', 'card', 'card', [3, 4], 10],
};
const SPACE = { 1: ['have_num', 'have_who', 'have_more'], 2: ['split_num', 'split_part', 'split_who', 'have_num', 'have_who', 'have_more'], 3: ['transfer_card', 'transfer_num', 'transfer_who', 'split_who', 'have_more'], 4: ['rel_card', 'rel_num', 'rel_most', 'have_most'], 5: ['rel_card', 'rel_num', 'transfer_card', 'transfer_num', 'split_most', 'split_num', 'split_part', 'have_most'], 6: ['transfer_card', 'transfer_num', 'transfer_used', 'transfer_who', 'transfer_same'], 7: ['transfer_card', 'transfer_num', 'rel_card', 'rel_num', 'transfer_used', 'transfer_who', 'transfer_change'], 8: ['transfer_card', 'transfer_num', 'split_most', 'split_num', 'split_part', 'transfer_who', 'transfer_change'], 9: ['transfer_card', 'transfer_num', 'rel_card', 'rel_num', 'split_used', 'transfer_used', 'have_most', 'split_most'], 10: ['step_split_transfer_card', 'step_split_transfer_most', 'step_transfer_most', 'transfer_who', 'transfer_change', 'transfer_used', 'rel_most', 'have_most'] };
const FORMATS = { 1: [5, 0, 0, 2], 2: [5, 0, 0, 2], 3: [4, 1, 0, 1], 4: [4, 1, 0, 1], 5: [4, 1, 0, 2], 6: [3, 1, 1, 1], 7: [3, 1, 1, 1], 8: [4, 1, 0, 2], 9: [3, 1, 1, 1], 10: null };
function correctAnswer(it) {
  const p = it.pattern, sc = it.scene;
  const time = it.time || (sc.step || sc.structure === 'transfer' ? 'after' : undefined);
  const V = stateOf(it, time === 'before' ? 'before' : 'after'), keys = Object.keys(V);
  if (it.kind === 'number') return String(V[it.askedName]);
  if (p === 'have_who') { const n = +it.q.join(' ').match(/(\d+)/)[1]; return keys.find(k => V[k] === n); }
  if (it.polarity && (/most$|more$|who$/.test(p)) && p !== 'transfer_who') return argext(V, keys, it.polarity);
  if (p === 'transfer_who') return it.polarity === 'up' ? sc.ps[sc.ri].full : sc.ps[sc.gi].full;
  if (p === 'transfer_same') return sc.ps.find((_, i) => i !== sc.gi && i !== sc.ri).full;
  if (p === 'transfer_change') { const i = sc.ps.findIndex(q => q.full === it.askedName); const d = i === sc.gi ? -sc.n : i === sc.ri ? sc.n : 0; return d > 0 ? `${d}${sc.obj.u} ふえた` : d < 0 ? `${-d}${sc.obj.u} へった` : 'かわらない'; }
  if (it.kind === 'card') { return '#card'; }
  if (it.kind === 'find_all') { if (p === 'split_used') return [sc.T].concat(sc.known.map(i => sc.vals[i])).sort((a, b) => a - b).join(','); const i = sc.ps.findIndex(q => q.full === it.askedName); return (i === sc.gi || i === sc.ri ? [sc.vals[i], sc.n] : [sc.vals[i]]).sort((a, b) => a - b).join(','); }
  return null;
}
const parseCard = c => Object.fromEntries(c.split(' ・ ').map(r => { const [nm, x] = r.split(' '); return [nm, parseInt(x, 10)]; }));
// independent 8.1 order (v0.5.4)
const ORDER_SPLIT = ['W16', 'W4', 'W17', 'W10', 'W7', 'W15', 'W14', 'W1'], ORDER_OTHER = ['W16', 'W4', 'W7', 'W9', 'W15', 'W14', 'W21', 'W1'];
function expectedPersonTypes(it) {
  const p = it.pattern, sc = it.scene, keys = fullNames(it), k = keys.length;
  const ans = it.options[it.ans];
  if (p === 'have_who') return Object.fromEntries(keys.filter(x => x !== ans).map(x => [x, 'W1']));
  if (p === 'transfer_same') return Object.fromEntries(keys.filter(x => x !== ans).map(x => [x, 'W6']));
  if (p === 'transfer_who') return Object.fromEntries(keys.filter(x => x !== ans).map(x => { const i = sc.ps.findIndex(q => q.full === x); return [x, i === sc.gi || i === sc.ri ? 'W4' : 'W9']; }));
  const pol = it.polarity, flip = pol === 'up' ? 'down' : 'up';
  const time = it.time || 'after';
  const cur = stateOf(it, sc.step || sc.structure === 'transfer' ? time : undefined);
  const hits = {}; // type -> person
  const add = (t, v) => { if (v && hits[t] === undefined) hits[t] = []; if (v) hits[t].push(v); };
  if (sc.step) add('W16', argext(stateOf(it, time === 'before' ? 'after' : 'before'), keys, pol));
  if (sc.step && time !== 'before') { const rv = sc.vals.slice(); rv[sc.gi] += sc.n; rv[sc.ri] -= sc.n; add('W4', argext(Object.fromEntries(sc.ps.map((q, i) => [q.full, rv[i]])), keys, pol)); }
  if (sc.structure === 'split') {
    for (const q of [sc.ps[sc.unk].full].concat(sc.s5X ? [sc.s5X] : [])) { const w = Object.assign({}, cur); w[q] = sc.T; add('W17', argext(w, keys, pol)); }
    if (!sc.step) add('W10', argext(cur, sc.known.map(i => sc.ps[i].full), pol));
  }
  add('W7', argext(cur, keys, flip));
  if (it.noise && it.noise.kind === 'pronoun' && it.noise.alt) { const v = Object.assign({}, cur); v[it.noise.alt] = v[it.noise.ref]; delete v[it.noise.ref]; add('W15', argext(v, Object.keys(v), pol)); }
  if (it.noise && (it.noise.kind === 'attr' || it.noise.kind === 'object')) {
    const holder = it.noise.kind === 'attr' ? it.noise.person : it.noise.owner;
    if (holder && keys.includes(holder)) {
      const v = Object.assign({}, cur);
      if (sc.structure === 'split' && !sc.step && sc.known.map(i => sc.ps[i].full).includes(holder)) { v[holder] = it.noise.v; const u = sc.ps[sc.unk].full; v[u] = sc.T - keys.filter(q => q !== u).reduce((a, q) => a + v[q], 0); }
      else v[holder] = it.noise.v;
      add('W14', argext(v, keys, pol));
    }
  }
  if (p === 'rel_most') { const f = sc.rels[0]; const big = f.more ? f.subj : f.other, small = f.more ? f.other : f.subj; add('W21', pol === 'up' ? big : small); }
  const order = sc.structure === 'split' ? ORDER_SPLIT : ORDER_OTHER;
  const out = {};
  for (const x of keys) if (x !== ans) { const t = order.find(t => hits[t] && hits[t].includes(x)); out[x] = t || (k === 2 ? 'W1' : 'W18'); }
  return out;
}

// ---------- checks ----------
check(1, '答えの一致', fail => {
  let bad = 0;
  for (const it of ALL) {
    const c = correctAnswer(it);
    if (it.kind === 'card') { const card = parseCard(it.options[it.ans]); const V = stateOf(it, 'after'); if (!Object.keys(V).every(k => card[k] === V[k])) bad++; continue; }
    if (it.kind === 'find_all') { if (it.ansSet.slice().sort((a, b) => a - b).join(',') !== c) bad++; continue; }
    if (it.options[it.ans] !== c) { bad++; if (bad <= 3) fail(`Lv${it.lv} ${it.pattern}: ${it.options[it.ans]} vs ${c} | ${it.text}`); }
  }
  if (bad) fail(`${bad} items disagree`);
});
check(2, '数の範囲', fail => {
  for (const it of ALL) {
    const nums = (it.text.match(/\d+/g) || []).map(Number).concat((it.options || []).flatMap(o => (o.match(/\d+/g) || []).map(Number)), it.cands || []);
    if (nums.some(x => x < 1 || x > 20)) { fail(`Lv${it.lv} ${it.pattern}: ${nums.join(',')}`); return; }
  }
});
check(3, 'pattern と structure と人数', fail => {
  for (const it of ALL) { const d = PATTERNS[it.pattern]; if (!d) { fail('pattern ' + it.pattern); continue; } if (!SPACE[it.lv].includes(it.pattern)) fail(`Lv${it.lv} ${it.pattern} not in space`); if (d[0] !== it.structure) fail(`${it.pattern} structure ${it.structure}`); if (it.k < d[3][0] || it.k > d[3][1]) fail(`${it.pattern} k=${it.k}`); if (fail.length > 5) return; }
});
check(4, 'pattern 総数の記述', fail => {
  const doc = fs.readFileSync(DOC, 'utf8');
  const sec = doc.slice(doc.indexOf('### 3.2 問題型'), doc.indexOf('### 3.3 問い'));
  const rows = (sec.match(/^\| \d+ \| `/gm) || []).length;
  if (rows !== 21) fail(`3.2 table rows ${rows}`);
  if (!/21 パターンで全部/.test(sec)) fail('3.2 total statement');
  for (const [lbl, re] of [['3.8', /問題型 \(pattern、21 種\)/], ['7.1', /21 pattern すべて/], ['9.3', /3\.2 章の 21 値/], ['検証 3', /3\.2 章の 21 語/], ['検証 32', /21 pattern すべてに 7\.1 章/]]) if (!re.test(doc)) fail(`${lbl} does not state 21`);
});
check(5, '形式配合', fail => {
  for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) {
    const c = [0, 0, 0, 0]; for (const it of set) { c[{ normal: 0, formulation: 1, find_all: 2 }[it.format]]++; if (it.kind === 'number') c[3]++; }
    const want = FORMATS[lv];
    if (want ? c.join() !== want.join() : !(c[1] === 1 && c[3] === 0 && c[0] + c[2] === 4 && c[2] <= 1)) { fail(`Lv${lv}: ${c.join('/')}`); break; }
  }
});
check(6, '答えの種類', fail => {
  for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) {
    const nn = set.filter(it => it.kind === 'number').length;
    if (nn > 2) { fail(`Lv${lv} numbers ${nn}`); break; }
    if (lv >= 3 && !(set.some(it => it.kind === 'person') && set.some(it => it.kind === 'card'))) { fail(`Lv${lv} lacks person or card`); break; }
  }
});
check(7, 'セット構成 (4.2 章)', fail => {
  const comp = { 1: s => s.have_num === 2 && s.have_who === 1 && s.have_more === 2, 2: s => (s.split_num || 0) + (s.split_part || 0) === 1 && s.split_who === 1 && s.have_num === 1 && s.have_who === 1 && s.have_more === 1,
    3: s => s.transfer_card === 1 && s.transfer_num === 1 && s.transfer_who === 1 && s.split_who === 1 && s.have_more === 1, 4: s => s.rel_card === 1 && s.rel_num === 1 && s.rel_most === 1 && s.have_most === 2,
    5: s => ((s.rel_card === 1 && s.rel_num === 1) || (s.transfer_card === 1 && s.transfer_num === 1)) && s.split_most === 1 && (s.split_num || 0) + (s.split_part || 0) === 1 && s.have_most === 1,
    6: s => ['transfer_card', 'transfer_num', 'transfer_used', 'transfer_who', 'transfer_same'].every(p => s[p] === 1),
    7: s => ((s.rel_card === 1 && s.rel_num === 1) || (s.transfer_card === 1 && s.transfer_num === 1)) && s.transfer_used === 1 && s.transfer_who === 1 && s.transfer_change === 1,
    8: s => s.transfer_card === 1 && s.transfer_num === 1 && s.split_most === 1 && (s.split_num || 0) + (s.split_part || 0) === 1 && (s.transfer_who || 0) + (s.transfer_change || 0) === 1,
    9: s => ((s.rel_card === 1 && s.rel_num === 1) || (s.transfer_card === 1 && s.transfer_num === 1)) && (s.split_used || 0) + (s.transfer_used || 0) === 1 && s.have_most === 1 && s.split_most === 1,
    10: s => s.step_split_transfer_card === 1 && s.step_split_transfer_most === 1 && s.step_transfer_most === 1 && (s.transfer_who || 0) + (s.transfer_change || 0) + (s.transfer_used || 0) === 1 && (s.rel_most || 0) + (s.have_most || 0) === 1 };
  const kRule = { 1: () => 2, 2: () => 2, 3: () => 2, 4: () => 3, 6: () => 3, 7: () => 3 };
  for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) {
    const s = {}; set.forEach(it => (s[it.pattern] = (s[it.pattern] || 0) + 1));
    if (!comp[lv](s)) { fail(`Lv${lv}: ${JSON.stringify(s)}`); break; }
    if (kRule[lv] && set.some(it => it.k !== kRule[lv]())) { fail(`Lv${lv} head count`); break; }
    if (lv === 5 && set.some(it => (it.pattern === 'transfer_card' || it.pattern === 'transfer_num') ? it.k !== 2 : it.k !== 3)) { fail('Lv5 head count'); break; }
    if (lv === 8 && set.some(it => (/^split/.test(it.pattern) && it.k !== 4) || (it.pattern === 'transfer_card' && it.k !== 3))) { fail('Lv8 head count'); break; }
    if (lv === 10 && set.some(it => it.pattern === 'have_most' && it.k !== 4)) { fail('Lv10 have_most head count'); break; }
  }
});
check(8, '重なりの禁止', fail => {
  for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) {
    const sig = set.map(it => fullNames(it).sort().join() + '|' + (it.text.match(/\d+/g) || []).map(Number).sort((a, b) => a - b).join());
    if (new Set(sig).size !== sig.length) { fail(`Lv${lv}`); return; }
  }
});
check(9, 'patternId の空間', fail => { for (let lv = 1; lv <= 10; lv++) { const seen = new Set(SETS[lv].flatMap(s => s.map(it => it.pattern))); if (seen.size !== SPACE[lv].length) fail(`Lv${lv}: ${seen.size} vs ${SPACE[lv].length}`); } });
check(10, 'patternId の上限、隣接、直近回避', fail => {
  const cap = lv => Math.ceil(5 / SPACE[lv].length);
  const lotteries = { 2: [['split_num', 'split_part']], 5: [['rel_card', 'transfer_card'], ['split_num', 'split_part']], 7: [['transfer_card', 'rel_card']], 8: [['split_num', 'split_part'], ['transfer_who', 'transfer_change']], 9: [['transfer_card', 'rel_card'], ['split_used', 'transfer_used']], 10: [['transfer_who', 'transfer_change', 'transfer_used'], ['rel_most', 'have_most']] };
  for (let lv = 1; lv <= 10; lv++) {
    let prev = null;
    for (const set of SETS[lv]) {
      const c = {}; set.forEach(it => (c[it.pattern] = (c[it.pattern] || 0) + 1));
      if (Object.values(c).some(x => x > cap(lv))) { fail(`Lv${lv} cap`); return; }
      if (set.some((it, i) => i > 0 && it.pattern === set[i - 1].pattern)) { fail(`Lv${lv} adjacent`); return; }
      const ch = (lotteries[lv] || []).map(cands => cands.find(p => set.some(it => it.pattern === p)));
      if (prev) ch.forEach((x, i) => { if (x === prev[i]) fail(`Lv${lv} lottery repeated ${x}`); });
      prev = ch;
      if (fail.length > 3) return;
    }
  }
});
check(11, '連鎖', fail => {
  for (let lv = 3; lv <= 10; lv++) for (const set of SETS[lv]) {
    const ci = set.findIndex(it => it.kind === 'card'); const b = set[ci + 1];
    if (!b || b.structure !== set[ci].structure || !(b.kind === 'number' || b.pattern === 'step_split_transfer_most')) { fail(`Lv${lv}: ${set.map(i => i.pattern).join(' ')}`); return; }
    if (fullNames(set[ci]).sort().join() === fullNames(b).sort().join()) { fail(`Lv${lv} chain persons equal`); return; }
  }
});
check(12, '問いと polarity', fail => {
  const asks = ['num_of', 'who_n', 'more2', 'most', 'gain', 'same', 'change', 'card', 'used'];
  for (const it of ALL) if (!asks.includes(it.ask)) { fail('ask ' + it.ask); return; }
  for (let lv = 1; lv <= 10; lv++) for (const a of ['more2', 'most', 'gain']) {
    const xs = SETS[lv].flat().filter(it => it.ask === a); if (xs.length < 50) continue;
    const s = share(xs.filter(it => it.polarity === 'up').length, xs.length); if (!band(s, 0.4, 0.6)) fail(`Lv${lv} ${a} up ${fmt(s)}`);
  }
  for (const it of ALL) { const q = it.q.join(' '); if (it.ask === 'more2' && !/どちら/.test(q)) fail('more2 without どちら'); if (it.ask === 'most' && !/だれ/.test(q)) fail('most without だれ'); if (fail.length > 3) return; }
});
const IDS = ['h0', 'h1', 'h2', 'h3', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10', 's1', 's1b', 's2', 's3', 's4', 's5', 's5b', 's6', 't1', 't2', 't3', 't4', 't5', 't6', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
check(13, '言い回し', fail => {
  for (const it of ALL) for (const s of it.S) if (s.id && !['intro', 'pron'].includes(s.id) && !IDS.includes(s.id)) { fail('id ' + s.id); return; }
  for (let lv = 1; lv <= 10; lv++) {
    const ev = SETS[lv].flat().flatMap(it => it.S.filter(s => s.ev && s.giver));
    if (ev.length >= 100) {
      const g = share(ev.filter(s => ['t1', 't2', 't5'].includes(s.baseForm)).length, ev.length); if (!band(g, 0.4, 0.6)) fail(`Lv${lv} giver-subject ${fmt(g)}`);
      const rc = ev.filter(s => ['t3', 't4'].includes(s.baseForm)); const t4 = share(rc.filter(s => s.baseForm === 't4').length, rc.length); if (!band(t4, 0.75, 0.85)) fail(`Lv${lv} t4 ${fmt(t4)}`);
      const ws = share(ev.filter(s => s.wordSwap).length, ev.length);
      if ((lv === 7 || lv === 10) && !(ws >= 1 / 3 && ['t1', 't3', 't4'].every(f => ev.some(s => s.wordSwap && s.baseForm === f)))) fail(`Lv${lv} word_swap ${fmt(ws)}`);
      if ((lv === 8 || lv === 9) && ws > 0) fail(`Lv${lv} word_swap present`);
      const starts = SETS[lv].flat().filter(it => it.scene.structure === 'transfer' && !(it.scene.step === 'split'));
      const h0 = share(starts.filter(it => it.scene.forms[0] === 'h0').length, starts.length); if (starts.length >= 100 && !band(h0, 0.25, 0.35)) fail(`Lv${lv} h0 ${fmt(h0)}`);
    }
    for (const set of SETS[lv]) { const c = {}; for (const it of set) for (const id of G.wordingIds(it)) c[id] = (c[id] || 0) + 1; for (const [id, n] of Object.entries(c)) if (n > (G.CAPS[id] ? G.CAPS[id][lv - 1] : 3)) { fail(`Lv${lv} cap ${id} ${n}`); break; } }
  }
  const haveOne = ALL.filter(it => it.scene.structure === 'have' || (it.scene.structure === 'transfer' && !it.scene.step) || it.scene.structure === 'relation').flatMap(it => it.S.filter(s => G.ONE_HAVE.includes(s.id) && s.role === 'state'));
  const haveOnly = ALL.filter(it => it.scene.structure === 'have').flatMap(it => it.S.filter(s => G.ONE_HAVE.includes(s.id)));
  const h5 = share(haveOnly.filter(s => s.id === 'h5').length, haveOnly.length); if (!band(h5, 0.15, 0.25)) fail(`h5 among have one-person ${fmt(h5)}`);
  const tot = ALL.filter(it => it.scene.structure === 'split' || it.scene.step === 'split').map(it => it.scene.tf);
  const s3 = share(tot.filter(x => x === 's3').length, tot.length); if (!band(s3, 0.08, 0.16)) fail(`s3 ${fmt(s3)}`);
});
check(14, '修飾', fail => {
  const MODS = { intro: [1, 10], q_first: [7, 10], clause_swap: [7, 10], word_swap: [7, 10], attr_noise: [9, 10], object_noise: [9, 10], pronoun: [9, 10] };
  for (const it of ALL) for (const m of it.modifiers) { if (!MODS[m]) { fail('mod ' + m); return; } if (!(it.lv === MODS[m][0] || it.lv === MODS[m][1] || (m === 'intro'))) { fail(`${m} at Lv${it.lv}`); return; } }
  for (const lv of [7, 9]) { const need3 = lv === 7 ? ['q_first', 'clause_swap', 'word_swap'] : ['attr_noise', 'object_noise', 'pronoun']; for (const set of SETS[lv]) { if (!need3.every(m => set.some(it => it.modifiers.includes(m))) || !set.every(it => it.modifiers.some(m => need3.includes(m)))) { fail(`Lv${lv} modifiers`); break; } } }
  for (let lv = 1; lv <= 10; lv++) { const xs = SETS[lv].flat(); const s = share(xs.filter(it => it.modifiers.includes('intro')).length, xs.length); if (s < 0.5) fail(`Lv${lv} intro ${fmt(s)}`); }
  const on = ALL.filter(it => it.noise && it.noise.kind === 'object'); const of = share(on.filter(it => it.noise.otherFirst).length, on.length); if (!band(of, 0.4, 0.6)) fail(`object other-first ${fmt(of)}`);
});
check(15, '人名', fail => {
  const all = new Map(G.FAMILY.concat(G.POOL).map(([n, h]) => [n, h]));
  let f1 = 0, f2 = 0;
  for (const it of ALL) {
    for (const p of it.persons) if (all.get(p.name) !== p.hon) { fail('name ' + p.full); return; }
    const nf = it.persons.filter(p => p.fam).length; if (nf < 1 || nf > 2) { fail(`family ${nf}`); return; } if (nf === 1) f1++; else f2++;
    const ns = it.persons.map(p => p.name);
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { if (ns[i][0] === ns[j][0] && !([ns[i], ns[j]].includes('ゆうと') && [ns[i], ns[j]].includes('ゆきこ'))) { fail('first kana ' + ns); return; } if (it.lv <= 6 && G.SIMILAR.some(([a, b]) => (a === ns[i] && b === ns[j]) || (a === ns[j] && b === ns[i]))) { fail('similar ' + ns); return; } }
    for (const s of it.S) if (s.id === 'h10') { const X = it.persons.find(p => p.full === s.owner); if (!(G.REL_N.includes(s.rel) || (X.hon === 'くん' ? G.REL_K : G.REL_S).includes(s.rel))) { fail('rel ' + s.rel + ' ' + X.full); return; } }
  }
  const s = share(f1, f1 + f2); if (!band(s, 0.4, 0.6)) fail(`family 1 vs 2: ${fmt(s)}`);
});
check(16, 'もの、属性', fail => {
  for (const it of ALL) { if (!G.OBJS.some(o => o.name === it.obj.name)) { fail('obj'); return; } if (it.noise && it.noise.kind === 'object' && !G.OTHER.some(o => o.name === it.noise.other)) { fail('other'); return; } if (it.noise && it.noise.kind === 'attr' && !(it.noise.attrKind === 'age' ? band(it.noise.v, 5, 9) : band(it.noise.v, 1, 6))) { fail('attr range'); return; } }
  const on = ALL.filter(it => it.noise && it.noise.kind === 'object' && it.obj.u === 'こ');
  const s = share(on.filter(it => it.noise.otherUnit === it.obj.u).length, on.length); if (!band(s, 0.55, 0.78)) fail(`same-unit among こ objects ${fmt(s)}`);
  const onm = ALL.filter(it => it.noise && it.noise.kind === 'object' && it.obj.u !== 'こ'); if (onm.some(it => it.noise.other !== 'えんぴつ')) fail('まい object with same-unit other');
});
check(17, '言及順', fail => {
  for (let lv = 1; lv <= 10; lv++) for (const k of [2, 3, 4]) {
    const xs0 = SETS[lv].flat().filter(it => it.kind === 'person' && it.k === k); if (xs0.length < 200) continue;
    const xs = xs0; const lastScope = it => it.structure === 'have'; // v0.5.4: last mention only in have scenes (4.4.2)
    const first = Array(k).fill(0), last = Array(k).fill(0);
    for (const it of xs) { const fm = firstMentions(it), a = it.options[it.ans]; first[fm.indexOf(a)]++; const lm = []; for (const s of it.S.slice().reverse()) for (const t of s.toks.slice().reverse()) for (const p of it.persons) if (t.includes(p.full) && !lm.includes(p.full)) lm.push(p.full); last[lm.indexOf(a)]++; }
    const nLast = xs.filter(lastScope).length; last.fill(0); for (const it of xs.filter(lastScope)) { const a = it.options[it.ans]; const lm = []; for (const s of it.S.slice().reverse()) for (const t of s.toks.slice().reverse()) for (const p of it.persons) if (t.includes(p.full) && !lm.includes(p.full)) lm.push(p.full); last[lm.indexOf(a)]++; }
    for (const arr of nLast >= 200 ? [first, last] : [first]) for (const c of arr) { const s = c / (arr === last ? nLast : xs.length); if (!band(s, 0.8 / k, 1.2 / k)) { fail(`Lv${lv} k${k} ${arr === first ? 'first' : 'last'} ${arr.map(x => fmt(x / (arr === last ? nLast : xs.length))).join('/')}`); break; } }
    const ys = SETS[lv].flat().filter(it => it.askedName && it.k === k); if (ys.length >= 200) { const c = Array(k).fill(0); ys.forEach(it => c[firstMentions(it).indexOf(it.askedName)]++); if (c.some(x => !band(x / ys.length, 0.8 / k, 1.2 / k))) fail(`Lv${lv} k${k} asked first ${c.map(x => fmt(x / ys.length)).join('/')}`); }
  }
});
const EXPECT_BIND = { h0: 'one', h1: 'one', h2: 'one', h3: 'one', h5: 'one', h7: 'none', h8: 'two', h9: 'one', h10: 'two', s1: 'two', s1b: 'none', s2: 'none', s3: 'none', s4: 'two', s5: 'two', s5b: 'one', s6: null };
function bindForm(it, s) {
  const txt = sentText(s); const cl = txt.split('、').filter(c => /\d/.test(c) && new RegExp('\\d+(' + it.obj.u + ')').test(c));
  if (!cl.length) return null;
  const n = namesIn(it, cl[0]).length + (cl[0].includes('その子') ? 1 : 0);
  return n === 0 ? 'none' : n === 1 ? 'one' : 'two';
}
function isBindStmt(s) { return s.role === 'state' && s.id && /^h/.test(s.id) && s.num !== null && s.num !== undefined; }
check(18, '束縛の形', fail => {
  let bad = 0;
  for (const it of ALL) for (const s of it.S) {
    const e = s.id === 'h6' ? (s.h6tail ? 'none' : null) : EXPECT_BIND[s.id]; if (!e || it.noise && (it.noise.kind === 'attr' || it.noise.kind === 'object')) continue;
    const b = bindForm(it, s); if (s.pronounRef) continue; if (b && b !== e) { bad++; if (bad <= 3) fail(`${s.id}: ${b} vs ${e} | ${sentText(s)}`); }
  }
  // 2-person texts with two binding statements (have; transfer starts not h0)
  const two = ALL.filter(it => it.k === 2 && it.scene.forms && it.scene.forms.length === 2 && !it.scene.forms.includes('h0') && !it.scene.forms.includes('s6') && it.scene.structure !== 'split');
  const pr = share(two.filter(it => it.scene.forms.includes('h8') && it.scene.forms.includes('h10')).length, two.length); if (!band(pr, 0.65, 0.75)) fail(`pair share ${fmt(pr)} (n=${two.length})`);
  // every 2-person text holds a two-name clause with a number (s6 excepted, v0.5.4)
  for (const it of ALL.filter(x => x.k === 2 && !(x.scene.tf === 's6'))) {
    const ok = it.S.some(s => sentText(s).split('、').some(c => namesIn(it, c).length >= 2 && /\d/.test(c)));
    if (!ok) { fail(`2-person text without a two-name clause: ${it.pattern} | ${it.text}`); break; }
  }
  for (const it of ALL.filter(x => x.k === 2 && x.scene.structure === 'split' && x.scene.tf !== 's6')) if (!['h8', 'h10'].includes(it.scene.forms[0])) { fail('2-person split lone statement ' + it.scene.forms[0]); break; }
  const st3 = ALL.filter(it => it.k >= 3).flatMap(it => it.scene.forms || []).filter(f => /^h/.test(f) && f !== 'h0');
  const hh = share(st3.filter(f => f === 'h8' || f === 'h10').length, st3.length); if (!band(hh, 0.65, 0.75)) fail(`3+ h8/h10 ${fmt(hh)}`);
  const h8r = share(st3.filter(f => f === 'h8').length, st3.filter(f => f === 'h8' || f === 'h10').length); if (!band(h8r, 0.4, 0.6)) fail(`h8:h10 ${fmt(h8r)}`);
  const h67 = share(st3.filter(f => f === 'h6' || f === 'h7').length, st3.length); if (!band(h67, 0.07, 0.13)) fail(`h6/h7 ${fmt(h67)}`);
  const tf = ALL.filter(it => it.scene.tf).map(it => it.scene.tf); const s5 = share(tf.filter(x => x === 's5' || x === 's5b').length, tf.length); if (s5 < 1 / 3) fail(`s5/s5b ${fmt(s5)}`);
});
check(19, '問われる役と半々の配分', fail => {
  for (let lv = 1; lv <= 10; lv++) {
    const xs = SETS[lv].flat();
    const tn3 = xs.filter(it => it.pattern === 'transfer_num' && it.k >= 3), tn2 = xs.filter(it => it.pattern === 'transfer_num' && it.k === 2);
    const r = (arr, role) => share(arr.filter(it => it.askedRole === role).length, arr.length);
    if (tn3.length >= 200) { if (!band(r(tn3, 'giver'), 0.3, 0.5) || !band(r(tn3, 'receiver'), 0.3, 0.5) || !band(r(tn3, 'bystander'), 0.1, 0.3)) fail(`Lv${lv} transfer_num roles ${fmt(r(tn3, 'giver'))}/${fmt(r(tn3, 'receiver'))}/${fmt(r(tn3, 'bystander'))}`); }
    if (tn2.length >= 200 && !band(r(tn2, 'giver'), 0.4, 0.6)) fail(`Lv${lv} transfer_num 2p giver ${fmt(r(tn2, 'giver'))}`);
    for (const p of ['transfer_change', 'transfer_used']) { const a = xs.filter(it => it.pattern === p); if (a.length >= 200) for (const role of ['giver', 'receiver', 'bystander']) if (!band(r(a, role), 0.233, 0.433)) fail(`Lv${lv} ${p} ${role} ${fmt(r(a, role))}`); }
    const sn = xs.filter(it => it.pattern === 'split_num' || it.pattern === 'split_part'); if (sn.length >= 200) { const s = share(sn.filter(it => it.pattern === 'split_num').length, sn.length); if (!band(s, 0.4, 0.6)) fail(`Lv${lv} split_num ${fmt(s)}`); }
    const sw = xs.filter(it => it.pattern === 'split_who' || it.pattern === 'split_most'); if (sw.length >= 200) { const s = share(sw.filter(it => it.options[it.ans] === it.scene.ps[it.scene.unk].full).length, sw.length); if (!band(s, 0.4, 0.6)) fail(`Lv${lv} unknown answer ${fmt(s)}`); }
  }
  const s2 = ALL.filter(it => it.scene.structure === 'split' && it.k === 2); const big = share(s2.filter(it => it.scene.vals[it.scene.known[0]] > it.scene.T / 2).length, s2.length); if (!band(big, 0.4, 0.6)) fail(`2p known>half ${fmt(big)}`);
  const n3 = ALL.filter(it => it.pattern === 'split_num' && it.k >= 3); const w12 = share(n3.filter(it => Number(it.options[it.optionTypes.indexOf('W12')]) < Number(it.options[it.ans])).length, n3.length); if (!band(w12, 0.4, 0.6)) fail(`W12 smaller ${fmt(w12)}`);
  const n2 = ALL.filter(it => it.pattern === 'split_num' && it.k === 2); const w13 = share(n2.filter(it => Number(it.options[it.ans]) < Number(it.options[it.optionTypes.indexOf('W13')])).length, n2.length); if (!band(w13, 0.4, 0.6)) fail(`correct < W13 ${fmt(w13)}`);
});
check(20, 'セット水準 (4.11 章)', fail => {
  for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) {
    const ev = set.flatMap(it => it.S.filter(s => s.ev && s.giver));
    if (ev.length >= 2 && !(ev.some(s => ['t1', 't2', 't5'].includes(s.baseForm)) && ev.some(s => ['t3', 't4'].includes(s.baseForm)))) { fail(`Lv${lv} subject roles`); return; }
    const tn = set.filter(it => it.pattern === 'transfer_num' || it.pattern === 'transfer_change'); if (tn.length >= 2 && new Set(tn.map(it => it.askedRole)).size < 2) { fail(`Lv${lv} asked roles`); return; }
  }
});
check(21, '足場', fail => {
  let match = 0, tot = 0;
  for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) set.forEach((it, i) => {
    const want = lv <= 9 && i < 2;
    if (!!it.scaffold !== want) fail(`Lv${lv} pos${i} scaffold ${!!it.scaffold}`);
    if (it.scaffold && /\d/.test(it.scaffold)) fail('digit in scaffold');
    if (it.scaffold && !/あげた ひと/.test(it.scaffold)) { const ord = it.persons.map(p => p.full).filter(n => it.scaffold.includes(n)).sort((a, b) => it.scaffold.indexOf(a) - it.scaffold.indexOf(b)); tot++; if (ord.join() === firstMentions(it).join()) match++; }
  });
  if (fail.length > 3) fail.length = 3;
  const kf = 2; // smallest k! = 2
  if (share(match, tot) > 2 / kf * 0.6) fail(`scaffold order matches first mention ${fmt(share(match, tot))}`);
});
check(22, '誤答の型 (数とカード)', fail => {
  for (const it of ALL.filter(x => x.kind === 'number' || x.kind === 'card')) {
    const t = it.optionTypes.filter(x => x !== 'correct'); if (new Set(t).size !== t.length) { fail(`${it.pattern} types repeat ${t}`); return; }
    if (it.kind === 'number' && !(it.options.length === 3 || it.options.length === 4)) { fail('number options count'); return; }
    if (it.kind === 'number' && new Set(it.options).size !== it.options.length) { fail('number options repeat'); return; }
    if (it.kind === 'card') {
      const cards = it.options.map(parseCard), corr = cards[it.ans], rows = Object.keys(corr);
      for (const r of rows) { const moved = cards.map((c, i) => c[r]).filter((v, i) => i !== it.ans && v !== corr[r]); if (new Set(moved).size !== moved.length) { fail(`card row ${r} repeats: ${it.options.join(' | ')}`); return; } }
    }
  }
});
function cardSolvers(it) {
  const cards = it.options.map(parseCard), textNums = (it.S.flatMap(s => sentText(s).match(/\d+/g) || [])).map(Number);
  const key = c => Object.values(c).sort((a, b) => a - b).join();
  const P2 = () => { const sc = cards.map((c, i) => Object.keys(c).filter(r => cards.some((d, j) => j !== i && d[r] === c[r])).length); const m = Math.max(...sc); const b = sc.map((x, i) => i).filter(i => sc[i] === m); return b; };
  const S4 = () => { const mx = Math.max(...textNums); return cards.map((c, i) => i).filter(i => Object.values(cards[i]).reduce((a, b) => a + b, 0) === mx); };
  const P10 = () => { const rest = cards.map((c, i) => i).filter(i => !Object.values(cards[i]).every(v => textNums.includes(v))); return rest.length ? rest : cards.map((_, i) => i); };
  const P13 = () => { const ks = cards.map(key); const r = cards.map((c, i) => i).filter(i => ks.filter(k => k === ks[i]).length === 1); return r.length && r.length < cards.length ? r : cards.map((_, i) => i); };
  return { P2, S4, P10, P13 };
}
check(23, 'カード', fail => {
  const want = { transfer: 'W4,W6', relation: 'W5,W7', step: 'W16,W4' };
  const acc = {};
  for (const it of ALL.filter(x => x.kind === 'card')) {
    if (it.options.length !== 3) { fail('card count'); return; }
    const t = it.optionTypes.filter(x => x !== 'correct').sort().join(); if (t !== want[it.structure].split(',').sort().join()) { fail(`${it.pattern} types ${t}`); return; }
    const sv = cardSolvers(it);
    for (const [nm, f] of Object.entries(sv)) { const c = f(); const p = c.includes(it.ans) ? 1 / c.length : 0; const k = it.pattern + ':' + nm; acc[k] = acc[k] || [0, 0]; acc[k][0] += p; acc[k][1]++; }
  }
  for (const [k, [a, n]] of Object.entries(acc)) if (a / n > 0.55) fail(`${k} ${fmt(a / n)}`);
});
check(24, '人の肢の型 (8.1 章)', fail => {
  let bad = 0;
  for (const it of ALL.filter(x => x.kind === 'person')) {
    const exp = expectedPersonTypes(it);
    const got = Object.fromEntries(it.options.map((o, i) => [o, it.optionTypes[i]]).filter(([, t]) => t !== 'correct'));
    for (const [p, t] of Object.entries(exp)) if (got[p] !== t) { bad++; if (bad <= 3) fail(`Lv${it.lv} ${it.pattern} ${p}: ${got[p]} vs ${t} | ${it.text}`); break; }
    if (!Object.values(got).some(t => t !== 'W18')) { fail(`${it.pattern} all W18`); return; }
  }
  if (bad) fail(`${bad} items`);
});
check(25, '正解位置と並び', fail => {
  const pos = {};
  for (const it of ALL.filter(x => x.options)) { const n = it.options.length; pos[n] = pos[n] || Array(n).fill(0); pos[n][it.ans]++; }
  for (const [n, arr] of Object.entries(pos)) { const tot = arr.reduce((a, b) => a + b, 0); for (const c of arr) { const s = c / tot; if (+n === 4 ? !band(s, 0.2, 0.3) : !band(s, 0.8 / n, 1.2 / n)) fail(`${n} options: ${arr.map(x => fmt(x / tot)).join('/')}`); } }
  let same = 0, tot = 0; for (const it of ALL.filter(x => x.kind === 'person')) { tot++; if (it.options.join() === firstMentions(it).join()) same++; } if (share(same, tot) > 0.6) fail(`person buttons follow first mention ${fmt(share(same, tot))}`);
});
check(26, '数の肢の型と大小', fail => {
  const want = it => {
    const p = it.pattern, noise = it.noise && (it.noise.kind === 'attr' || it.noise.kind === 'object');
    if (p === 'have_num') return ['W1', 'W11', 'W12'];
    if (p === 'split_part') return ['W1', 'W2', it.k === 2 ? 'W13' : 'W19'];
    if (p === 'transfer_num') return it.askedRole === 'bystander' ? ['W9', 'W22', 'W5'] : ['W4', 'W5', 'W6'];
    if (p === 'rel_num') return ['W1', 'W5', 'W7'];
    return null;
  };
  for (const it of ALL.filter(x => x.kind === 'number')) {
    const t = it.optionTypes.filter(x => x !== 'correct');
    if (it.pattern === 'split_num') { if (it.k === 2 ? !(t.includes('W13') && t.every(x => ['W13', 'W1', 'W2', 'W3'].includes(x))) : !(t.includes('W12') && t.every(x => ['W12', 'W1', 'W2', 'W19'].includes(x)))) { fail(`split_num types ${t}`); return; } continue; }
    let w = want(it); const noise = it.noise && (it.noise.kind === 'attr' || it.noise.kind === 'object');
    const ok = t.slice().sort().join() === w.slice().sort().join() || (noise && t.slice().sort().join() === w.map(x => (x === 'W5' ? 'W14' : x)).sort().join());
    if (!ok) { fail(`${it.pattern} types ${t} vs ${w}`); return; }
  }
  const acc = {}; const add = (k, p) => { acc[k] = acc[k] || [0, 0]; acc[k][0] += p; acc[k][1]++; };
  for (const it of ALL.filter(x => x.kind === 'number')) {
    const o = it.options.map(Number), c = o[it.ans], tn = (it.S.flatMap(s => sentText(s).match(/\d+/g) || [])).map(Number);
    const pick = arr => (arr.length ? (arr.includes(it.ans) ? 1 / arr.length : 0) : 1 / o.length);
    const idx = f => o.map((v, i) => i).filter(i => f(o[i]));
    const grp = /^split_(num|part)$/.test(it.pattern) ? 'split' : it.pattern;
    add(grp + ':N1a_max', pick(idx(v => v === Math.max(...o)))); add(grp + ':N1a_min', pick(idx(v => v === Math.min(...o)))); add(grp + ':N1a_first', pick(idx(v => v === tn[0])));
    const nt = idx(v => !tn.includes(v)), it2 = idx(v => tn.includes(v));
    add(grp + ':N1b_minNotText', pick(nt.length ? [nt.reduce((a, b) => (o[a] < o[b] ? a : b))] : [])); add(grp + ':N1b_maxNotText', pick(nt.length ? [nt.reduce((a, b) => (o[a] > o[b] ? a : b))] : []));
    add(grp + ':N1b_minText', pick(it2.length ? [it2.reduce((a, b) => (o[a] < o[b] ? a : b))] : [])); add(grp + ':N1b_maxText', pick(it2.length ? [it2.reduce((a, b) => (o[a] > o[b] ? a : b))] : []));
    add(grp + ':N1b_dropExt', pick(idx(v => v !== Math.max(...o) && v !== Math.min(...o))));
    if (grp === 'split') { const mx = Math.max(...tn), rest = tn.reduce((a, b) => a + b, 0) - mx; add('split:N2', pick(idx(v => v === mx - rest))); }
    if (it.pattern === 'transfer_num') {
      let n3 = []; for (const x of o) for (const n of tn) if (tn.includes(x) && o.includes(x + n) && x !== n) n3.push(o.indexOf(x)); add('transfer_num:N3', pick([...new Set(n3)].slice(0, 1)));
      let n4 = []; for (const a of o) for (const b of o) for (const d of o) if (a < b && b < d && b - a === d - b) n4.push(o.indexOf(b)); add('transfer_num:N4', pick([...new Set(n4)].slice(0, 1)));
    }
  }
  for (const [k, [a, n]] of Object.entries(acc)) if (n >= 100 && a / n > 0.55) fail(`${k} ${fmt(a / n)} (n=${n})`);
});
check(27, '受け渡しの数とカードの数の組', fail => {
  for (const it of ALL.filter(x => x.scene.n !== undefined)) { const sc = it.scene; if (sc.n === Math.abs(sc.vals[sc.gi] - sc.vals[sc.ri])) { fail(`${it.pattern} n=|diff|`); return; } }
  for (const it of ALL.filter(x => x.kind === 'card')) { const ks = it.options.map(c => Object.values(parseCard(c)).sort((a, b) => a - b).join()); if (new Set(ks).size !== 3) { fail(`${it.pattern} card sets repeat`); return; } }
});
check(28, '2 段', fail => {
  const xs = ALL.filter(it => it.pattern === 'step_transfer_most');
  for (const it of xs) { const b = stateOf(it, 'before'), a = stateOf(it, 'after'), k = Object.keys(a); if (argext(b, k, it.polarity) === argext(a, k, it.polarity)) { fail('before = after extreme'); return; } }
  for (const pol of ['up', 'down']) { const ys = xs.filter(it => it.polarity === pol); const c = {}; ys.forEach(it => (c[it.rolePair] = (c[it.rolePair] || 0) + 1)); const v = Object.values(c); if (v.length !== 2 || v.some(x => !band(x / ys.length, 0.4, 0.6))) fail(`${pol} role pairs ${JSON.stringify(c)}`); }
  const t = share(xs.filter(it => it.time === 'before').length, xs.length); if (!band(t, 0.4, 0.6)) fail(`time ${fmt(t)}`);
  const k4 = share(xs.filter(it => it.k === 4).length, xs.length); if (!band(k4, 0.4, 0.6)) fail(`4-person ${fmt(k4)}`);
});
check(29, '計算の範囲', fail => { for (const it of ALL.filter(x => x.scene.T !== undefined && x.k >= 3)) if (it.k === 3 ? it.scene.T > 10 : it.scene.T > 12) { fail(`T ${it.scene.T} k${it.k}`); return; } });
check(30, '代名詞', fail => {
  for (const it of ALL.filter(x => x.noise && x.noise.kind === 'pronoun')) { const i = it.S.findIndex(s => s.toks[0] === 'その子は'); const prev = it.S[i - 1]; const ns = namesIn(it, sentText(prev)); if (ns.length !== 1 || ns[0] !== it.noise.ref) { fail(`prev names ${ns}`); return; } }
});
check(31, '出題順', fail => {
  for (let lv = 1; lv <= 10; lv++) {
    // v0.5.4: compare with the exact position distribution of a uniform draw from the valid orders
    const pos = {}, exp = {};
    for (const set of SETS[lv]) {
      const pats = set.map(it => it.pattern), ci = set.findIndex(it => it.kind === 'card');
      const perms = []; const permute = (a, l) => { if (l === a.length) { perms.push(a.slice()); return; } for (let i = l; i < a.length; i++) { [a[l], a[i]] = [a[i], a[l]]; permute(a, l + 1); [a[l], a[i]] = [a[i], a[l]]; } };
      permute([0, 1, 2, 3, 4], 0);
      const ok = perms.filter(p => p.every((x, i) => i === 0 || pats[x] !== pats[p[i - 1]]) && (ci < 0 || p.indexOf(ci + 1) === p.indexOf(ci) + 1));
      for (const p of ok) p.forEach((x, i) => { (exp[pats[x]] = exp[pats[x]] || Array(5).fill(0))[i] += 1 / ok.length; });
      set.forEach((it, i) => { (pos[it.pattern] = pos[it.pattern] || Array(5).fill(0))[i]++; });
    }
    for (const [p, arr] of Object.entries(pos)) arr.forEach((o, i) => { const e = exp[p][i]; if (Math.abs(o - e) > 4 * Math.sqrt(e + 1) + 0.05 * e) fail(`Lv${lv} ${p} pos${i}: ${o} vs ${fmt(e)}`); });
  }
});
check(32, 'わざと一言', fail => {
  for (const p of Object.keys(PATTERNS)) { const fake = { pattern: p, k: 3, modifiers: [] }; const rows = G.WAZA.filter(r => r[2](p, fake)); if (rows.length < 2) fail(`${p}: ${rows.length} rows (primary and 別の道 need 2)`); }
  for (const it of ALL) { if (!it.waza || !it.waza.primary || !it.waza.alternate) { fail(`${it.pattern} waza ${JSON.stringify(it.waza)}`); return; } if (!G.WAZA.some(r => r[1] === it.waza.primary)) { fail('waza text'); return; } }
  for (const it of ALL) { const fb = it.feedback; const vals = fb.filter(x => x !== null); if (vals.some(x => !x || /undefined|null|NaN/.test(x))) { fail(`${it.pattern} feedback ${JSON.stringify(fb)}`); return; } }
});
check(33, '除外語', fail => {
  const bad = ['円', 'おつり', 'あわせて', 'ちがいは', 'おおいほうは', 'すくないほうは', 'ずつ', 'ばい', 'ばんめ', 'まえから', 'うしろから', 'あいだ'];
  for (const it of ALL) { const t = it.text + ' ' + (it.options || []).join(' '); const b = bad.find(w => t.includes(w)); if (b) { fail(`${b}: ${it.text}`); return; } if (/[+\-×÷=−]/.test(t)) { fail('operator ' + t); return; } const kanji = it.text.replace(/その子/g, '').match(/[一-鿿]/g); if (kanji && kanji.some(c => c !== '本')) { fail('kanji ' + kanji.join('') + ' ' + it.text); return; } }
});
check(34, '本編 gWasa との非重複', fail => {
  const res = [/円/, /おつり/, /あわせて/, /ちがいは/, /おおいほう|すくないほう/, /より \d+(こ|まい|本) (おおく|すくなく)[、 ]/];
  for (const it of ALL) { const r = res.find(x => x.test(it.text)); if (r) { fail(`${r}: ${it.text}`); return; } }
});
check(35, '再現性', fail => {
  for (const lv of [1, 5, 10]) { const a = G.buildSet(lv, mulberry32(99), G.newState()), b = G.buildSet(lv, mulberry32(99), G.newState()); const j = s => JSON.stringify(s.map(it => [it.text, it.options, it.optionTypes, it.cands])); if (j(a) !== j(b)) fail(`Lv${lv} differs`); }
  const src = fs.readFileSync(sourcePath, 'utf8'); if (/Math\.random|Date\.now/.test(src.replace(/\/\/.*$/gm, ''))) fail('Math.random or Date.now in ' + path.basename(sourcePath));
});
check(36, '敵ソルバー回帰テスト', (fail, note) => { note('run: STRICT=1 SEED=<seed> node audit_sim.js 400 --stage (stage A < 0.60, stage A+B < 0.75)'); });
check(37, '敵ソルバーの更新規約', (fail, note) => note('process rule, not a property of the output'));
check(38, '実在証明 (付録 A)', fail => { const { errors, itemCount } = checkAppendix(fs.readFileSync(DOC, 'utf8')); if (itemCount !== 50) fail(`expected 50 items, found ${itemCount}`); errors.forEach(fail); });
check(39, 'かかわらない人の枠', fail => {
  for (let lv = 1; lv <= 10; lv++) { const ev = SETS[lv].flat().filter(it => it.k >= 3).flatMap(it => it.S.filter(s => s.ev && s.giver && !s.wordSwap)); if (ev.length < 200) continue; const s = share(ev.filter(x => x.frame).length, ev.length); if (!band(s, 0.6, 0.73)) fail(`Lv${lv} t6 ${fmt(s)}`); }
  const fr = ALL.flatMap(it => it.S.filter(s => s.frame)); const b = share(fr.filter(s => s.frame.pos === 'before').length, fr.length); if (!band(b, 0.4, 0.6)) fail(`frame before ${fmt(b)}`);
  if (fr.some(s => s.toks.slice(0, -1).some(t => t.endsWith('、') && !t.startsWith('そのあと')))) fail('comma in t6');
});
check(40, '比べる文の語順', fail => { const rs = ALL.flatMap(it => it.S.filter(s => /^c/.test(s.id || ''))); const s = share(rs.filter(x => x.id === 'c5' || x.id === 'c6').length, rs.length); if (!band(s, 0.4, 0.6)) fail(`c5/c6 ${fmt(s)}`); });
check(41, '名前のあいだ、「X は」のあと、主語のあとの語', fail => {
  for (const it of ALL) for (const s of it.S) { if (s.id === 'h8' && !G.INS.includes(s.toks[s.toks.indexOf(s.owner + 'は') + 1])) { fail('h8 ' + sentText(s)); return; } if (s.id === 'h10' && !G.INS.includes(s.toks[s.toks.indexOf(s.owner + 'は') + 1])) { fail('h10 ' + sentText(s)); return; } }
  const ev = ALL.flatMap(it => it.S.filter(s => s.ev && s.giver));
  for (const [lbl, arr] of [['all', ev], ['t6', ev.filter(s => s.frame)], ['not t6', ev.filter(s => !s.frame)]]) { const s = share(arr.filter(x => x.subjWord).length, arr.length); if (!band(s, 0.4, 0.6)) fail(`${lbl} subject word ${fmt(s)}`); }
  if (ev.some(s => s.subjWord && !G.INS_T.includes(s.subjWord))) fail('subject word not in list');
});
check(42, 'polarity の独立', fail => {
  let same = 0, tot = 0; for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) { const p = set.filter(it => it.polarity).map(it => it.polarity); if (p.length >= 2) { tot++; if (p[0] === p[1]) same++; } }
  const s = share(same, tot); if (!band(s, 0.4, 0.6)) fail(`same ${fmt(s)}`);
  for (const lv of [1, 4]) { const fixed = SETS[lv].every(set => { const p = set.filter(it => it.polarity).map(it => it.polarity); return p.includes('up') && p.includes('down'); }); if (fixed) fail(`Lv${lv} always both`); }
});
check(43, '規則の文の確定 (4.12 章)', fail => {
  for (const it of ALL) {
    if (it.S.some(s => s.frame && s.wordSwap)) { fail('A3'); return; }
    if (it.scene.tf === 's6' && it.k !== 2) { fail('A4'); return; }
    if (it.noise && it.noise.kind === 'object') { const s = it.S.find(x => sentText(x).includes(it.noise.other)); const cl = sentText(s).split('、').find(c => c.includes(it.noise.other)); if (namesIn(it, cl).length !== 1) { fail('A7 object ' + sentText(s)); return; } }
    if (it.pattern === 'split_part' && it.k >= 3) { const v = Number(it.options[it.optionTypes.indexOf('W19')]); const sc = it.scene; const others = sc.known.filter(i => sc.ps[i].full !== it.askedName).map(i => sc.T - sc.vals[i]); if (!others.includes(v)) { fail('A10'); return; } }
    if (it.pattern === 'rel_most' || it.pattern === 'rel_num' || it.pattern === 'rel_card') { const sc = it.scene; if (!(sc.rels.some(r => r.subj === sc.P1.full && r.other === sc.B.full) && sc.rels.some(r => r.subj === sc.P2.full && r.other === sc.P1.full))) { fail('A6'); return; } }
  }
});
for (const [level, n] of Object.entries(biasCounts)) {
  const lv = Number(level);
  if (!Number.isInteger(lv) || lv < 1 || lv > 10 || !Number.isInteger(n) || n < counts[lv - 1]) throw new Error('invalid bias sample count');
  while (SETS[lv].length < n) { const set = G.buildSet(lv, streams[lv].r, streams[lv].st); SETS[lv].push(set); ALL.push(...set); }
}
check(44, '名前と役の対応', fail => {
  const famShare = it => it.persons.filter(p => p.fam).length / it.persons.length;
  const isFam = (it, n) => it.persons.find(p => p.full === n).fam;
  const cmp = (lbl, items, who) => { let a = 0, e = 0, n = 0; for (const it of items) { const w = who(it); if (!w) continue; n++; if (isFam(it, w)) a++; e += famShare(it); } if (n > 300 && Math.abs(a / n - e / n) > 0.03) fail(`${lbl}: ${fmt(a / n)} vs ${fmt(e / n)}`); };
  cmp('answer', ALL.filter(it => it.kind === 'person'), it => it.options[it.ans]);
  cmp('asked', ALL.filter(it => it.askedName), it => it.askedName);
  const tr = ALL.filter(it => it.scene.gi !== undefined);
  cmp('giver', tr, it => it.scene.ps[it.scene.gi].full); cmp('receiver', tr, it => it.scene.ps[it.scene.ri].full);
  cmp('bystander', tr.filter(it => it.k >= 3), it => it.scene.ps.find((_, i) => i !== it.scene.gi && i !== it.scene.ri).full);
  cmp('unknown', ALL.filter(it => it.scene.unk !== undefined), it => it.scene.ps[it.scene.unk].full);
  for (const [f] of G.FAMILY) { let a = 0, e = 0, n = 0; for (const it of ALL.filter(x => x.kind === 'person')) { n++; const full = it.persons.find(p => p.name === f); if (full) { e += 1 / it.persons.length; if (it.options[it.ans] === full.full) a++; } } if (Math.abs(a / n - e / n) > 0.03) fail(`${f}: ${fmt(a / n)} vs ${fmt(e / n)}`); }
});
check(45, '関係の語', fail => {
  const h10 = []; for (const it of ALL) for (const s of it.S) if (s.id === 'h10') h10.push({ it, s });
  for (const w of G.REL_N) { const sh = share(h10.filter(x => x.s.rel === w).length, h10.length); if (!band(sh, 0.15, 0.18)) fail(`${w} share ${fmt(sh)}`); }
  for (const hon of ['くん', 'さん']) {
    const base = h10.filter(x => x.s.owner.endsWith(hon));
    const rate = (arr, f) => share(arr.filter(f).length, arr.length);
    const ansF = x => x.it.kind === 'person' && x.it.options[x.it.ans] === x.s.owner, askF = x => x.it.askedName === x.s.owner;
    const bAns = rate(base.filter(x => x.it.kind === 'person'), ansF), bAsk = rate(base.filter(x => x.it.askedName), askF);
    for (const w of G.REL_N.concat(hon === 'くん' ? G.REL_K : G.REL_S)) {
      const arr = base.filter(x => x.s.rel === w);
      const a = rate(arr.filter(x => x.it.kind === 'person'), ansF), k = rate(arr.filter(x => x.it.askedName), askF);
      if (Math.abs(a - bAns) > 0.03) fail(`${w}(${hon}) answer ${fmt(a)} vs ${fmt(bAns)}`); if (Math.abs(k - bAsk) > 0.03) fail(`${w}(${hon}) asked ${fmt(k)} vs ${fmt(bAsk)}`);
    }
  }
  if (h10.some(x => (G.REL_K.includes(x.s.rel) && !x.s.owner.endsWith('くん')) || (G.REL_S.includes(x.s.rel) && !x.s.owner.endsWith('さん')))) fail('gender');
});

check(46, '型と一言の差し込みの一致', fail => {
  let downW17 = 0;
  for (const it of ALL) {
    const choices = it.kind === 'find_all' ? it.cands : it.options;
    const types = it.kind === 'find_all' ? it.candTypes : it.optionTypes;
    if (!Array.isArray(it.feedback) || it.feedback.length !== choices.length || it.feedback.some((text, i) => types[i] === 'correct' ? text !== null : !text)) { fail(`${it.pattern} feedback shape`); return; }
    if (it.kind === 'find_all' && it.feedbackMissed !== 'ひとりずつ「だれが いくつ」か たしかめよう') { fail(`${it.pattern} feedbackMissed`); return; }
    if (it.kind !== 'person') continue;
    for (let i = 0; i < choices.length; i++) if (types[i] === 'W17') {
      const sc = it.scene, cur = stateOf(it, it.time || 'after'), keys = Object.keys(cur);
      const bound = [sc.ps[sc.unk].full].concat(sc.s5X ? [sc.s5X] : []).find(p => argext(Object.assign({}, cur, { [p]: sc.T }), keys, it.polarity) === choices[i]);
      if (!bound || it.optionBoundPersons[i] !== bound || it.feedback[i] !== `ぜんぶの かずは ${bound}の かずじゃ ないよ`) { fail(`${it.pattern} W17 ${choices[i]} bound ${bound}: ${it.feedback[i]}`); return; }
      if (it.polarity === 'down') { downW17++; if (bound === choices[i]) { fail('down W17 bound equals choice'); return; } }
    }
  }
  if (!downW17) fail('no down W17');
});

return { results, SETS };
}

if (require.main === module) {
  let results;
  try { ({ results } = runChecks(require('./strict_gen.js'), +(process.argv[2] || 2000), +(process.argv[3] || 4242))); }
  catch (e) { console.error(e.message); process.exit(2); }
  let nf = 0;
  for (const r of results.sort((a, b) => a.no - b.no)) {
    const st = r.fails.length ? 'FAIL' : (r.note.length ? 'NOTE' : 'PASS');
    if (r.fails.length) nf++;
    console.log(`${String(r.no).padStart(2)} ${st} ${r.title}${r.fails.length ? '\n     ' + r.fails.slice(0, 6).join('\n     ') : ''}${r.note.length ? '  (' + r.note.join('; ') + ')' : ''}`);
  }
  console.log(`${results.length} checks, ${nf} failed`);
  process.exit(nf ? 1 : 0);
}
module.exports = { runChecks };
