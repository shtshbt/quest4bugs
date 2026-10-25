'use strict';
// kom_tokushu_kata set builder (curriculum v0.4, 4.2 to 4.5). Balancing of 4.3 規則 10 by raking.
const G = require('./gen');
const { rnd, ri, pick, shuffle, TYPES, GA, GB, TABLE } = G;

// 3.7 pairs used for problems that share numbers (v0.4: CP3 and CP6, and CP5 for the Lv7 F2 pair)
const CP = { CP3: [['bp:B3', 'br:B3w'], ['bp:B7', 'br:B7w']], CP5: [['br:B3d', 'br:B3w']], CP6: [['kb:B3', 'tk:B3']] };
const CPS = { 3: ['CP6'], 4: ['CP3'], 5: ['CP3', 'CP6'], 7: ['CP3', 'CP6'], 8: ['CP3', 'CP6'] };
const skType = id => id.split(':')[0];
const skScene = id => G.SK[id].sc;
const F3OK = Object.values(G.SK).filter(s => s.f3).map(s => s.id);
const F2OK = Object.values(G.SK).filter(s => s.f2).map(s => s.id);
const clone = x => JSON.parse(JSON.stringify(x, (k, v) => v instanceof Set ? { __set: [...v] } : v), (k, v) => v && v.__set ? new Set(v.__set) : v);

// raking (4.3 規則 10): candidates get weights; key families are rescaled in turn so that inside each key value
// the answers are even; then exact passes on the word families (own share at most 0.5) and the surface family.
class Rake {
  constructor(draw, fams, lab, n, rounds = 250, post = null) {
    this.items = []; for (let i = 0; i < n; i++) { const c = draw(); if (c) this.items.push(c); }
    const N = this.items.length; this.w = new Float64Array(N).fill(1);
    const Fm = fams.map(f => { if (Array.isArray(f)) { const g = f.slice(); g.isWord = f.isWord; g.isSurf = f.isSurf; return g; } const g = [f, lab]; g.isSurf = f.isSurf; return g; });
    const groups = Fm.map(([f, lf]) => { const labs = this.items.map(lf); const m = new Map(); this.items.forEach((c, i) => { for (const k of [].concat(f(c))) { if (k === null) continue; let g = m.get(k); if (!g) { g = []; m.set(k, g); } g.push(i); } }); return [m, labs]; });
    this.groups = groups;
    const even = (idx, labs, pw) => { const sum = new Map(); for (const i of idx) sum.set(labs[i], (sum.get(labs[i]) || 0) + this.w[i]); const tot = [...sum.values()].reduce((a, b) => a + b, 0); const tgt = tot / sum.size; for (const i of idx) this.w[i] *= Math.pow(tgt / sum.get(labs[i]), pw); };
    for (let r = 0; r < rounds; r++) for (const [m, labs] of groups) for (const idx of m.values()) even(idx, labs, 0.8);
    for (let r = 0; r < 20; r++) for (let gi = 0; gi < groups.length; gi++) {
      const [m, labs] = groups[gi];
      if (Fm[gi].isSurf) { for (const idx of m.values()) even(idx, labs, 1); continue; }
      if (!Fm[gi].isWord) continue;
      for (const idx of m.values()) { const sum = new Map(); for (const i of idx) sum.set(labs[i], (sum.get(labs[i]) || 0) + this.w[i]); if (sum.size < 2) continue; const tot = [...sum.values()].reduce((a, b) => a + b, 0); const own = sum.get('own') || 0; if (own <= 0.55 * tot) continue; const f = (0.5 * (tot - own)) / (0.5 * own); for (const i of idx) if (labs[i] === 'own') this.w[i] *= f; }
    }
    if (post) post(this);
    this.build();
  }
  build() { const N = this.items.length; this.cum = new Float64Array(N); let z = 0; for (let i = 0; i < N; i++) { z += this.w[i]; this.cum[i] = z; } this.z = z; this.byT = null; }
  getType(t) { if (!this.byT) this.byT = {}; if (!this.byT[t]) { const idx = []; const cum = []; let z = 0; this.items.forEach((c, i) => { if (c.t === t && this.w[i] > 0) { z += this.w[i]; idx.push(i); cum.push(z); } }); this.byT[t] = { idx, cum, z }; }
    const { idx, cum, z } = this.byT[t]; if (!idx.length) return null; const u = rnd() * z; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; } return clone(this.items[idx[lo]]); }
  get() { const u = rnd() * this.z; let lo = 0, hi = this.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (this.cum[m] < u) lo = m + 1; else hi = m; } return clone(this.items[lo]); }
}
const BAL = {};
const PILOT = +(process.env.PILOT || 60000);
const SURFW = new Set(['W1', 'W2', 'W3', 'W4', 'W8', 'W9']);
const firstT = p => { const w = G.wordsInOrder(p).find(x => TABLE[x.w]); return w ? TABLE[w.w] : '-'; };
const surfKey = p => [...new Set(p.words.map(x => x.w).filter(w => SURFW.has(w)))].sort().join('.');
const nsKey = p => `${p.sc}|${p.nums.length}|${firstT(p)}|${p.opts.slice().sort().join(',')}`;
const surfFam = p => `${surfKey(p)}|${p.sc}`; surfFam.isSurf = true;
const WORD_FAMS = Object.keys(TABLE).map(w => { const f = [p => (p.words.some(x => x.w === w) ? 'w:' + w : null), p => (TABLE[w] === p.t ? 'own' : 'other')]; f.isWord = true; return f; });

// ---------- F1 (4.5 の 2) ----------
const sceneTypes = (lv, sc) => G.SCENE_TYPES[sc].filter(t => G.sceneAllowed(lv, t, sc) && (lv === 3 ? GA.includes(t) : lv === 4 ? GB.includes(t) : true));
function optionSet(lv, sc, must) {
  if (lv === 3) return GA.slice();
  if (lv === 4) return sc === 'B4' ? ['bp', 'hk', 'nr', 'ws'] : GB.slice();
  const pool = shuffle(sceneTypes(lv, sc).slice());
  const S = must.slice();
  for (const t of pool) if (S.length < 4 && !S.includes(t) && !(t === 'br' && S.includes('nr')) && !(t === 'nr' && S.includes('br'))) S.push(t);
  const off = shuffle(TYPES.filter(t => !S.includes(t) && !(t === 'br' && S.includes('nr'))));
  while (S.length < 4) S.push(off.shift());
  return S;
}
function scenesFor(lv) { return Object.keys(G.SCENE_TYPES).filter(sc => sceneTypes(lv, sc).length > 0); }
function drawF1(lv) {
  const sc = pick(scenesFor(lv));
  const S = optionSet(lv, sc, []);
  const feas = S.filter(t => sceneTypes(lv, sc).includes(t)); if (!feas.length) return null;
  const t = pick(feas);
  const p = G.inst(pick(G.SKEL.filter(s => s.t === t && s.sc === sc)).id, lv); if (!p) return null; p.fmt = 'F1';
  G.attachDeco(p, 0.7); if (!G.fitCount(p)) return null;
  G.buildF1OptionsS(p, S); return p;
}
function makeF1(lv) { const k = 'F1:' + lv; if (!BAL[k]) BAL[k] = new Rake(() => drawF1(lv), [nsKey, surfFam, ...WORD_FAMS, () => 'all'], p => p.t, PILOT); return BAL[k].get(); }

// ---------- F2 (4.5 の 3 から 5, 4.3 規則 10 と 12) ----------
function swapSent(p) { p.words.forEach(x => { if (x.s === 0) { x.s = 1; x.o += 1; } else if (x.s === 1) { x.s = 0; x.o -= 1; } }); p.swapped = true; }
function prepF2(p, lv) {
  p.fmt = 'F2'; p.named = lv <= 2; G.showQuestion(p);
  if (rnd() < 0.5) swapSent(p);
  p.dseq = (p.swapped ? p.sent[1].concat(p.sent[0]) : p.sent[0].concat(p.sent[1]));
  return G.buildF2Options(p);
}
function drawF2(lv) {
  const range = lv === 1 ? GA : lv === 2 ? GB : TYPES;
  const t = pick(range); const p = G.inst(pick(F2OK.filter(id => skType(id) === t)), lv); if (!p) return null;
  if (lv >= 3) G.attachDeco(p, 0.7);
  return prepF2(p, lv) ? p : null;
}
const featF2 = (p, o) => G.look(p, o.f);
const fsetF2 = p => p.opts.map(o => featF2(p, o)).sort().join(';');
// Lv1 and 2 (v0.4): the weight of a look set whose answer is fixed (the second answer under 10 %) is cut to DETW
const DETW = process.env.DETW !== undefined ? +process.env.DETW : 0.3;
function cutFixed(rk) {
  const [m, labs] = rk.groups[0]; let fixedW = 0, all = 0;
  for (const idx of m.values()) { const sum = new Map(); for (const i of idx) sum.set(labs[i], (sum.get(labs[i]) || 0) + rk.w[i]); const tot = [...sum.values()].reduce((a, b) => a + b, 0); const v = [...sum.values()].sort((a, b) => b - a); const fixed = v.length < 2 || v[1] < 0.1 * tot; if (fixed) { for (const i of idx) rk.w[i] *= DETW; } }
  for (const idx of m.values()) { const sum = new Map(); for (const i of idx) sum.set(labs[i], (sum.get(labs[i]) || 0) + rk.w[i]); const tot = [...sum.values()].reduce((a, b) => a + b, 0); const v = [...sum.values()].sort((a, b) => b - a); if (v.length < 2 || v[1] < 0.1 * tot) fixedW += tot; all += tot; }
  rk.fixedShare = fixedW / all;
}
function makeF2(lv, t) {
  const k = 'F2:' + lv;
  if (!BAL[k]) BAL[k] = lv <= 2 ? new Rake(() => drawF2(lv), [[fsetF2, p => featF2(p, p.opts[p.ans])]], p => p.t, PILOT, 250, cutFixed)
    : new Rake(() => drawF2(lv), [[fsetF2, p => featF2(p, p.opts[p.ans])], ...WORD_FAMS, [() => 'all', p => p.t]], p => p.t, PILOT, 250);
  return t ? BAL[k].getType(t) : BAL[k].get();
}

// ---------- F3 (4.5 の 6) ----------
const F3W = id => (id.startsWith('ws') ? +(process.env.F3WS || 0.6) : id.startsWith('nr') ? +(process.env.F3NR || 0.8) : 1);
function makeF3(lv) {
  let u = rnd() * F3OK.reduce((a, id) => a + F3W(id), 0); let sk = F3OK[F3OK.length - 1]; for (const id of F3OK) { u -= F3W(id); if (u < 0) { sk = id; break; } }
  const p = G.inst(sk, lv, { fm: 'sum' }); p.fmt = 'F3'; G.attachDeco(p, 0.7); G.showQuestion(p);
  const swap = rnd() < 0.5; if (swap) swapSent(p);
  p.keyRole = swap ? 0 : 1;
  p.qfirst = false;
  const roleWords = [0, 1, 2].map(r => [...new Set(p.words.filter(x => x.s === r).map(x => x.w))]);
  if (p.q === 'Q5') roleWords[2].push('Q5');
  p.roleWords = roleWords; p.nonKeyCue = roleWords[1 - p.keyRole].some(w => TABLE[w]);
  p.disp = [0, 1, 2];
  const opts = shuffle([0, 1, 2]); p.opts = opts; p.ans = opts.indexOf(p.keyRole);
  return p;
}

// ---------- F4 (4.5 の 7) ----------
function drawF4(lv) {
  const t = pick(TYPES); const p = G.inst(pick(G.SKEL.filter(s => s.t === t)).id, lv); if (!p) return null; G.attachDeco(p, 0.7); G.showQuestion(p); p.fmt = 'F4';
  const ws = G.tableWordSet(p).filter(w => !G.excluded(p, TABLE[w])); if (!ws.length) return null;
  const w = pick(ws), P = TABLE[w]; p.propWord = w; p.prop = P; p.propCorrect = P === p.t;
  const pool = shuffle(TYPES.filter(x => x !== P && !G.excluded(p, x)));
  let X, Y;
  if (p.propCorrect) { [X, Y] = pool.slice(0, 2); } else { X = p.t; Y = pool.find(x => x !== X); }
  const opts = shuffle([{ k: 'acc' }, { k: 'rej', t: X }, { k: 'rej', t: Y }]);
  p.opts = opts; p.ans = opts.findIndex(o => (p.propCorrect ? o.k === 'acc' : (o.k === 'rej' && o.t === p.t)));
  return p;
}
const f4key = p => { const rj = p.opts.filter(o => o.k === 'rej').map(o => o.t).sort(); return `${p.prop}|${p.propWord}|${rj.join(',')}|${p.sc}`; };
const f4lab = p => { const rj = p.opts.filter(o => o.k === 'rej').map(o => o.t).sort(); return p.propCorrect ? 'acc' : 'r' + rj.indexOf(p.t); };
function makeF4(lv) {
  const k = 'F4:' + lv;
  if (!BAL[k]) BAL[k] = new Rake(() => drawF4(lv), [[f4key, f4lab]], f4lab, PILOT, 1, rk => { const [m, labs] = rk.groups[0]; for (const idx of m.values()) { if (new Set(idx.map(i => labs[i])).size < 3) for (const i of idx) rk.w[i] = 0; } });
  return BAL[k].get();
}

// ---------- F5, F6 ----------
function makeF5(lv) {
  const sc = pick(Object.keys(G.SCENE_TYPES)); const T = pick(G.SCENE_TYPES[sc]);
  const opts = shuffle([{ c: true, cue: rnd() < 0.5 }, { c: false, cue: rnd() < 0.4 }, { c: false, cue: rnd() < 0.4 }, { c: false, cue: rnd() < 0.4 }]);
  return { fmt: 'F5', t: T, sc, opts, ans: opts.findIndex(o => o.c), words: [], nums: [] };
}
const LINKS = { R1: ['hk', 'ws'], R2: ['hk', 'tk'], R3: ['ws', 'nr'], R4: ['nr', 'bp'], R5: ['hk', 'bp'] };
const LINKW = { R1: [['W10'], ['W6']], R2: [['W10'], ['W5']], R3: [['W5', 'W6'], ['W9']], R4: [['W5', 'W9'], ['W8', 'W7']], R5: [['W10'], ['W7']] };
function makeF6(lv, rid) {
  const [t1, t2] = LINKS[rid]; const dir = rnd() < 0.5 ? 1 : 2; const ans = dir === 1 ? t1 : t2;
  const firstFirst = rnd() < 0.5;
  const [w1, w2] = LINKW[rid];
  const seq = firstFirst ? [...w1, ...w2] : [...w2, ...w1];
  const words = seq.map((w, i) => ({ w, s: i < seq.length / 2 ? 0 : 1, o: i }));
  if (rnd() < 0.7) { const w = pick(Object.keys(TABLE)); words.splice(ri(0, words.length), 0, { w, s: 0, o: 0, role: 'deco' }); words.forEach((x, i) => { x.o = i; }); }
  const p = { fmt: 'F6', rid, t: ans, dir, words, nums: [], sc: rid === 'R3' || rid === 'R4' ? 'B4' : 'B3', other: dir === 1 ? t2 : t1 };
  const ok0 = x => !(ans === 'nr' && x === 'br') && !(p.other === 'nr' && x === 'br');
  const opts = [ans]; if (rnd() < 0.5) opts.push(p.other);
  const rest = shuffle(TYPES.filter(x => !opts.includes(x) && x !== (opts.includes(p.other) ? null : p.other) && ok0(x)));
  while (opts.length < 4) opts.push(rest.shift());
  p.opts = shuffle(opts); p.ans = p.opts.indexOf(ans);
  return p;
}

// ---------- problems that share numbers (4.4, C6) ----------
// second problem of a contrast pair: slot values derived from the first (the multiset is the same), checked
// against the second skeleton's 9.2 conditions
function derive(first, second, v) {
  const out = [];
  if (first.startsWith('bp') && second.startsWith('br')) { const z = v.S / (v.k + 1); if (Number.isInteger(z) && v.k <= 4 && v.c <= z - 2) out.push({ S: v.S, k: v.k, m: v.c, fm: 'sum', B: z - v.c, A: v.k * z + v.c }); }
  if (first.startsWith('br') && second.startsWith('bp') && first.endsWith('w')) { for (const vi of shuffle([0, 1])) { const y = (v.S - (vi === 0 ? v.m : -v.m)) / (v.k + 1); const big = v.k * y + (vi === 0 ? v.m : -v.m); if (Number.isInteger(y) && y >= 2 && big > y && v.m <= 9) out.push({ S: v.S, k: v.k, c: v.m, vi, y }); } }
  if (first === 'kb:B3' && second === 'tk:B3') { for (const [N, T] of shuffle([[v.r, v.s], [v.s, v.r]])) { const x = (T - v.p * N) / (v.q - v.p); if (Number.isInteger(x) && x >= 1 && x <= N - 1 && N >= 4) out.push({ p: v.p, q: v.q, N, T, x }); } }
  if (first === 'tk:B3' && second === 'kb:B3') { for (const [r, s] of shuffle([[v.N, v.T], [v.T, v.N]])) { const n = (r + s) / (v.q - v.p); if (Number.isInteger(n) && n >= 3 && v.p * n + r <= 99) out.push({ p: v.p, q: v.q, r, s, n, vi: 1 }); } }
  if (first === 'br:B3d' && second === 'br:B3w') { const z = (v.A + v.B) / (v.k + 1); const m = z - v.B; if (Number.isInteger(z) && m >= 2 && v.A === v.k * z + m) out.push({ A: v.A, B: v.B, k: v.k, fm: 'both', m, S: v.A + v.B }); }
  if (first === 'br:B3w' && second === 'br:B3d') { const e = (v.A - v.k * v.B) / (v.k - 1); if (Number.isInteger(e) && e >= 2) out.push({ A: v.A, B: v.B, k: v.k, e, vi: 0 }); }
  return out;
}
function cloneCore(p) { const q = clone(p); q.words = q.words.filter(x => x.role !== 'deco'); delete q.deco; return q; }
// the pair's wording (4.4 の 6): kb no cue, br わたす, br:B3d ふえる; CP3 uses 〔和〕 and CP5 uses 〔両方〕
const pairForce = (id, cp) => ({ vi: skType(id) === 'kb' ? 1 : (id.startsWith('br') ? 0 : undefined), fm: id.endsWith('w') ? (cp === 'CP5' ? 'both' : 'sum') : undefined });
// CP5 (F2): both problems show the same four options, the two one steps and two shared fillers (4.4 の 7)
function cp5Options(p1, p2) {
  const v = p1.v; const d = G.F('a-b', [v.A, v.B]); const w = G.F('a/b', [v.A + v.B, v.k + 1]);
  const fills = shuffle([[G.F('a+b', [v.A, v.B]), 'M11'], [G.F('a/b', [v.A, v.k]), 'M7'], [G.F('a*b', [v.A + v.B, v.k + 1]), 'M11'], [G.F('a/b', [v.A + v.B, v.k]), 'M8']]).slice(0, 2);
  for (const p of [p1, p2]) {
    const isD = p.form === 'd';
    const cells = [{ f: d, m: isD ? null : 'M16' }, { f: w, m: isD ? 'M16' : null }, ...fills.map(([f, m]) => ({ f, m }))];
    const sh = shuffle(cells.map(c => Object.assign({}, c))); p.opts = sh; p.ans = sh.findIndex(o => o.m === null); p.gridKind = 'cp5';
  }
}
function makePair(lv, fmt) {
  const kind = rnd() < 0.5 ? 'CP' : 'SP'; // C6: the kind is drawn once and kept while the numbers are searched
  for (let g = 0; g < 400; g++) {
    const cp = pick(lv === 7 && fmt === 'F2' ? ['CP5'] : CPS[lv]); const pr = pick(CP[cp]);
    const first = rnd() < 0.5 ? pr[0] : pr[1]; const sec = pr[0] === first ? pr[1] : pr[0];
    const p1 = G.inst(first, lv, pairForce(first, cp)); if (!p1) continue;
    let p2;
    if (kind === 'CP') { const ds = derive(first, sec, p1.v); if (!ds.length) continue; const f = pairForce(sec, cp); const d = ds[0]; p2 = G.inst(sec, lv, { vi: d.vi !== undefined ? d.vi : f.vi, fm: f.fm, vals: d }); if (!p2) continue; if ([...p2.nums].sort().join() !== [...p1.nums].sort().join()) continue; }
    else p2 = cloneCore(p1);
    p1.fmt = p2.fmt = fmt;
    for (const p of [p1, p2]) G.attachDeco(p, 0.7, { noNum: true });
    if (fmt === 'F1') {
      const sc = p1.sc; const partnerT = skType(sec);
      G.buildF1OptionsS(p1, optionSet(lv, sc, [p1.t]));
      const must = [p1.t, partnerT]; const S2 = optionSet(lv, sc, must);
      if (!must.every(t => S2.includes(t))) continue;
      G.buildF1OptionsS(p2, S2);
    } else { if (!prepF2(p1, lv) || !prepF2(p2, lv)) continue; if (cp === 'CP5') cp5Options(p1, p2); }
    p1.pairFirst = true; p2.pairPrev = true; p1.pairKind = p2.pairKind = kind; p1.cp = p2.cp = cp;
    return [p1, p2];
  }
  return null;
}

// ---------- set builder ----------
const LVFMT = {
  1: ['F2', 'F2', 'F2', 'F2', 'F2'], 2: ['F2', 'F2', 'F2', 'F2', 'F2'], 3: ['F1', 'F1', 'F1', 'F1', 'F1'], 4: ['F1', 'F1', 'F1', 'F1', 'F1'], 5: ['F1', 'F1', 'F1', 'F1', 'F1'],
  6: ['F3', 'F3', 'F4', 'F4', 'F1'], 7: ['F2', 'F2', 'F2', 'F1', 'F1'], 8: ['F5', 'F5', 'F1', 'F1', 'F2'], 9: ['F6', 'F6', 'F6', 'F1', 'F1'],
};
function makeSet(lv) {
  for (let guard = 0; guard < 2000; guard++) {
    const fmts = lv === 10 ? (() => { const all = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']; const om = pick(all); return all.filter(f => f !== om); })() : LVFMT[lv].slice();
    const items = []; let pairFmt = null;
    if ([3, 4, 5, 8].includes(lv)) pairFmt = 'F1';
    if (lv === 7) pairFmt = rnd() < 0.5 ? 'F1' : 'F2';
    const rest = fmts.slice();
    if (pairFmt) { const pr = makePair(lv, pairFmt); if (!pr) continue; items.push(pr); rest.splice(rest.indexOf(pairFmt), 1); rest.splice(rest.indexOf(pairFmt), 1); }
    const links = shuffle(Object.keys(LINKS)).slice(0, 3); let li = 0; let bad = false;
    const g12 = lv <= 2 ? shuffle([...(lv === 1 ? GA : GB), pick(lv === 1 ? GA : GB)]) : null; let gi = 0;
    for (const f of rest) {
      let p = null;
      if (f === 'F1') p = makeF1(lv); else if (f === 'F2') p = makeF2(lv, g12 ? g12[gi++] : null); else if (f === 'F3') p = makeF3(lv);
      else if (f === 'F4') p = makeF4(lv); else if (f === 'F5') p = makeF5(lv); else if (f === 'F6') p = makeF6(lv, lv === 10 ? pick(Object.keys(LINKS)) : links[li++]);
      if (!p) { bad = true; break; } items.push([p]);
    }
    if (bad) continue;
    shuffle(items); const set = items.flat();
    if (lv <= 2 && new Set(set.map(p => p.t)).size !== 4) continue;
    set.forEach((p, i) => { p.pos = i; p.lv = lv; });
    return set;
  }
  throw new Error('set gen failed lv ' + lv);
}

module.exports = { makeSet, LINKS, LINKW, CP, CPS, skType, skScene, F3OK, F2OK, BAL, featF2, fsetF2, derive };
