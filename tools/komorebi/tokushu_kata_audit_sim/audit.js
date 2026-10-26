'use strict';
// Enemy solvers (stage A, stage B, record) and measurement for kom_tokushu_kata (curriculum v0.4, 10.1).
// usage: node audit.js <seed> <nTestSets> <nTrainSets>   (11 章: seeds 7 and 99, 3000 test sets, 20000 table sets)
const G = require('./gen');
const S = require('./sets');
const { TABLE, STRENGTH, TYPES, GA, GB, isKin, kinOf } = G;

const SEED = +(process.argv[2] || 7), NTEST = +(process.argv[3] || 3000), NTRAIN = +(process.argv[4] || 20000);
// STRICT=1: the sets come from strict_gen.js (v0.4.4, the doc implemented as written); the enemies are unchanged
if (process.env.STRICT) { const SG = require('./strict_gen'); const st = {}; S.makeSet = lv => { st[lv] = st[lv] || SG.newState(); return SG.buildSet(lv, G.rnd, st[lv]); }; }
const LVS = (process.env.LVS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);

// ---------- lookup tables (stage B "full knowledge of the generator") ----------
class Tab {
  constructor() { this.m = new Map(); }
  add(k, lab) { let e = this.m.get(k); if (!e) { e = new Map(); this.m.set(k, e); } e.set(lab, (e.get(lab) || 0) + 1); }
  vec(k, cands, min = 3) { const e = this.m.get(k); if (!e) return null; const v = cands.map(c => e.get(c) || 0); const s = v.reduce((a, b) => a + b, 0); return s >= min ? v : null; }
}
const argmaxRand = v => { const m = Math.max(...v); const idx = v.map((x, i) => [x, i]).filter(x => x[0] === m).map(x => x[1]); return G.pick(idx); };
const rIdx = n => Math.floor(G.rnd() * n);

const wset = p => G.tableWordSet(p).join(',');
const firstWordType = (p, map = TABLE) => { const w = G.wordsInOrder(p).find(x => map[x.w]); return w ? map[w.w] : null; };
const strongest = (p, w7) => { const ws = new Set(p.words.map(x => x.w)); const w = STRENGTH.find(x => ws.has(x)); if (!w) return null; return w === 'W7' ? w7 : TABLE[w]; };
const pickType = (p, t) => { const i = p.opts.indexOf(t); return i >= 0 ? i : rIdx(p.opts.length); };
const oset = p => p.opts.slice().sort().join(',');

// F2 option features
const topOp = sh => sh.includes('/') ? '/' : sh.includes('*') ? '*' : sh.includes('+') ? '+' : '-';
const featF2 = S.featF2, fsetF2 = S.fsetF2;
const first2 = p => new Set(p.dseq.filter((x, i, a) => a.indexOf(x) === i).slice(0, 2));

const T = { f1: {}, f2: {}, f3: {}, f4: {}, f6: {} };
function tabs() {
  return {
    n: new Tab(), w: new Tab(), o: new Tab(), full: [new Tab(), new Tab(), new Tab(), new Tab(), new Tab()],
    f2full: [new Tab(), new Tab(), new Tab()], f2named: new Tab(), f2type: new Tab(),
    f3pos: new Tab(), f3full: new Tab(), f4acc: new Tab(), f4w: new Tab(), f6lex: new Tab(),
    ns: [new Tab(), new Tab(), new Tab(), new Tab()], nm: new Tab(), f2sh0: new Tab(), surf: new Tab(), rel: new Tab(), f2shape: new Tab(), f4s: new Tab(),
  };
}
const f1keys = p => [`${p.sc}|${wset(p)}|${p.nums.length}|${oset(p)}`, `${p.sc}|${wset(p)}|${oset(p)}`, `${wset(p)}|${oset(p)}`, `${p.sc}|${oset(p)}`, `${oset(p)}`];
const f2keys = p => [`${p.sc}|${wset(p)}|${fsetF2(p)}`, `${wset(p)}|${fsetF2(p)}`, `${fsetF2(p)}`];
const REL = new Set(['W5', 'W6', 'W7', 'W10', 'W11', 'W12']);
const SURF = new Set(['W1', 'W2', 'W3', 'W4', 'W8', 'W9']);
const wsub = (p, S0) => [...new Set(p.words.map(x => x.w).filter(w => S0.has(w)))].sort().join(',');
// v0.4.2: the enemy Bname reads only the person names (the multiset of names in order of the slots)
const nameKey = p => (p.names || []).join('+');
const decoyT = p => firstWordType(p) || '-';
const nskeys = p => [`${p.sc}|${p.nums.length}|${decoyT(p)}|${oset(p)}`, `${p.sc}|${decoyT(p)}|${oset(p)}`, `${decoyT(p)}|${oset(p)}`, `${oset(p)}`];
function nspost(tb, p) { const ks = nskeys(p); for (let i = 0; i < ks.length; i++) { const v = tb.ns[i].vec(ks[i], p.opts); if (v) return v; } return p.opts.map(() => 1); }
const f4skey = p => { const rj = p.opts.filter(o => o.k === 'rej').map(o => o.t).sort(); return `${p.prop}|${p.propWord}|${rj.join(',')}`; };
const f4lab = p => { const rj = p.opts.filter(o => o.k === 'rej').map(o => o.t).sort(); return p.propCorrect ? 'acc' : 'r' + rj.indexOf(p.t); };
const f3key = p => `${p.qfirst}|${p.roleWords.map(r => r.slice().sort().join('.')).join('/')}|${p.sc}`;

function train(tb, set) {
  for (const p of set) {
    if (p.fmt === 'F1') {
      tb.n.add(String(p.nums.length), p.t); tb.w.add(`${wset(p)}|${p.sc}`, p.t); tb.o.add(oset(p), p.t);
      f1keys(p).forEach((k, i) => tb.full[i].add(k, p.t));
      nskeys(p).forEach((k, i) => tb.ns[i].add(k, p.t)); tb.nm.add(nameKey(p), p.t); tb.surf.add(`${wsub(p, SURF)}|${p.sc}`, p.t); tb.rel.add(`${wsub(p, REL)}|${p.sc.replace(/B[^4]/, 'Bx')}`, p.t);
    }
    if (p.fmt === 'F2') {
      const lab = featF2(p, p.opts[p.ans]);
      f2keys(p).forEach((k, i) => tb.f2full[i].add(k, lab));
      tb.f2named.add(`${G.tkey(p)}|${fsetF2(p)}`, lab);
      tb.f2shape.add(fsetF2(p), lab); tb.f2sh0.add(p.opts.map(o => o.f.sh).sort().join(';'), p.opts[p.ans].f.sh);
      tb.f2type.add(`${p.sc}|${wset(p)}|${p.nums.length}`, G.tkey(p));
    }
    if (p.fmt === 'F3') { tb.f3pos.add(String(p.qfirst), String(p.keyRole)); tb.f3full.add(f3key(p), String(p.keyRole)); }
    if (p.fmt === 'F4') {
      const [X, Y] = p.opts.filter(o => o.k === 'rej').map(o => o.t);
      tb.f4acc.add(`${isKin(X, Y)}|${isKin(p.prop, X) || isKin(p.prop, Y)}|${p.propWord}|${p.sc}`, p.propCorrect ? 'acc' : 'rej');
      tb.f4w.add(`${wset(p)}|${p.sc}`, p.t); tb.f4s.add(f4skey(p), f4lab(p));
    }
    if (p.fmt === 'F6') tb.f6lex.add(`${wset(p)}|${p.dir}`, p.t);
  }
}

// posterior over a problem's options from the F1 full table chain
function f1post(tb, p) {
  const ks = f1keys(p);
  for (let i = 0; i < ks.length; i++) { const v = tb.full[i].vec(ks[i], p.opts); if (v) return v; }
  return p.opts.map(() => 1);
}

// ---------- solvers ----------
const SOL = {
  F1: {
    A1: () => p => rIdx(4), A9: () => p => 0,
    A2: () => p => pickType(p, firstWordType(p)),
    A3: () => p => pickType(p, strongest(p, 'bp')), A3b: () => p => pickType(p, strongest(p, 'br')),
    A4: () => p => pickType(p, G.SCENE_TYPICAL[p.sc]),
    A5: () => p => { const bad = new Set(p.words.map(x => TABLE[x.w])); const c = p.opts.map((t, i) => [t, i]).filter(x => !bad.has(x[0])); return c.length ? G.pick(c)[1] : rIdx(4); },
    Anen: () => p => { const ws = new Set(p.words.map(x => x.w)); if (ws.has('W8') || ws.has('W9')) return pickType(p, 'nr'); if (ws.has('W1') || ws.has('W2')) return pickType(p, 'kb'); return rIdx(4); },
    A16: () => (p, h) => { if (p.pairPrev) { const prev = h[h.length - 1]; return pickType(p, prev.t); } return pickType(p, strongest(p, 'br')); },
    B1: tb => p => { const v = tb.n.vec(String(p.nums.length), p.opts); return v ? argmaxRand(v) : rIdx(4); },
    L2: tb => p => { const v = tb.w.vec(`${wset(p)}|${p.sc}`, p.opts); return v ? argmaxRand(v) : rIdx(4); },
    B2surf: tb => p => { const v = tb.surf.vec(`${wsub(p, SURF)}|${p.sc}`, p.opts); return v ? argmaxRand(v) : rIdx(4); },
    R1lex: tb => p => { const v = tb.rel.vec(`${wsub(p, REL)}|${p.sc.replace(/B[^4]/, 'Bx')}`, p.opts); return v ? argmaxRand(v) : rIdx(4); },
    Bns: tb => p => argmaxRand(nspost(tb, p)),
    Bname: tb => p => { const v = tb.nm.vec(nameKey(p), p.opts); return v ? argmaxRand(v) : rIdx(4); },
    Bkin: () => p => {
      const d = firstWordType(p); let c = p.opts.filter(t => G.SCENE_TYPES[p.sc].includes(t) || p.t === 'nr' && false);
      if (!c.length) c = p.opts.slice();
      const c1 = c.filter(t => t !== d); if (c1.length) c = c1;
      const c2 = c.filter(t => p.opts.some(o => o !== t && isKin(o, t))); if (c2.length) c = c2;
      const deg = t => kinOf(t).length; const m = Math.min(...c.map(deg)); c = c.filter(t => deg(t) === m);
      return p.opts.indexOf(G.pick(c));
    },
    Bscene: () => p => { const c = p.opts.map((t, i) => [t, i]).filter(x => G.SCENE_TYPES[p.sc].includes(x[0])); return c.length ? G.pick(c)[1] : rIdx(4); },
    Bscene2: () => p => { const d = firstWordType(p); let c = p.opts.map((t, i) => [t, i]).filter(x => G.SCENE_TYPES[p.sc].includes(x[0])); const c2 = c.filter(x => x[0] !== d); if (c2.length) c = c2; const c3 = c.filter(x => p.opts.some(o => o !== x[0] && isKin(o, x[0]))); if (c3.length) c = c3; return c.length ? G.pick(c)[1] : rIdx(4); },
    Bsetns: tb => (p, h) => setSolve(tb, p, h, nspost),
    B3: () => p => { const bad = new Set(p.words.map(x => TABLE[x.w])); bad.add(G.SCENE_TYPICAL[p.sc]); const c = p.opts.map((t, i) => [t, i]).filter(x => !bad.has(x[0])); return c.length ? G.pick(c)[1] : rIdx(4); },
    Bopt: tb => p => { const v = tb.o.vec(oset(p), p.opts); return v ? argmaxRand(v) : rIdx(4); },
    Lfull: tb => p => argmaxRand(f1post(tb, p)),
    B8doc: () => (p, h) => { if (p.pairPrev) { const prev = h[h.length - 1]; const cand = p.opts.filter(t => t !== prev.t && cpPartner(prev, t)); if (cand.length) return pickType(p, G.pick(cand)); } return rIdx(4); },
    Lset: tb => (p, h) => setSolve(tb, p, h, f1post),
    Bpair: tb => (p, h) => { if (!p.pairPrev) return argmaxRand(nspost(tb, p)); const prev = h[h.length - 1]; const v = nspost(tb, p).map(x => x + 1e-6); const c = p.opts.map((t, i) => [t, i]).filter(x => x[0] === prev.t || cpPartner(prev, x[0])); if (!c.length) return argmaxRand(v); let b = c[0]; for (const x of c) if (v[x[1]] > v[b[1]]) b = x; return b[1]; },
  },
  F2: {
    A1: () => p => rIdx(4), A9: () => p => 0,
    A7: () => p => { const m = { W5: '+', W1: '+', W2: '+', W6: '-', W7: '*', W3: '*', W10: '/' }; const w = G.wordsInOrder(p).find(x => m[x.w]); if (!w) return rIdx(4); const c = p.opts.map((o, i) => [o, i]).filter(x => topOp(x[0].f.sh) === m[w.w]); return c.length ? G.pick(c)[1] : rIdx(4); },
    A8: () => p => { const mx = Math.max(...p.nums); const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].f.v.includes(mx)); return c.length ? G.pick(c)[1] : rIdx(4); },
    A8b: () => p => { const f2 = first2(p); const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].f.v.every(v => f2.has(v))); return c.length ? G.pick(c)[1] : rIdx(4); },
    Afirst: () => p => { const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].f.v.includes(p.dseq[0])); return c.length ? G.pick(c)[1] : rIdx(4); },
    A2p: () => p => { const t = firstWordType(p); if (!t) return rIdx(4); const sh = G.TSHAPE[t === 'br' ? 'brw' : t]; const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].f.sh === sh); return c.length ? G.pick(c)[1] : rIdx(4); },
    B4: () => p => { const t = strongest(p, 'bp'); if (!t) return rIdx(4); const op = topOp(G.TSHAPE[t === 'br' ? 'brw' : t]); const c = p.opts.map((o, i) => [o, i]).filter(x => topOp(x[0].f.sh) === op); return c.length ? G.pick(c)[1] : rIdx(4); },
    Bcent: () => p => { const sc = p.opts.map((o, i) => p.opts.filter((q, j) => j !== i && near(o.f, q.f)).length); return argmaxRand(sc); },
    Lfull: tb => p => f2choose(tb.f2full, f2keys(p), p),
    Lset: tb => (p, h) => f2set(tb, p, h, true),
    Bshape: tb => p => f2choose([tb.f2shape], [fsetF2(p)], p),
    Bshape0: tb => p => { const sh = p.opts.map(o => o.f.sh); const v = tb.f2sh0.vec(sh.slice().sort().join(';'), [...new Set(sh)]); if (!v) return rIdx(4); const u = [...new Set(sh)]; const b = u[argmaxRand(v)]; return G.pick(sh.map((x, i) => [x, i]).filter(x => x[0] === b))[1]; },
    Bpair2: () => p => { const mx = Math.max(...p.nums); const sh = p.opts.map(o => o.f.sh); let c = p.opts.map((o, i) => [o, i]).filter(x => sh.filter(y => y === x[0].f.sh).length >= 2); if (!c.length) return rIdx(4); const c2 = c.filter(x => !x[0].f.v.includes(mx)); if (c2.length) c = c2; return G.pick(c)[1]; },
    Bsetns: tb => (p, h) => f2set(tb, p, h, false),
    R3: () => p => { if (!p.named) return rIdx(4); const sh = G.TSHAPE[G.tkey(p)]; const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].f.sh === sh); return c.length ? G.pick(c)[1] : rIdx(4); },
    Bnamed: tb => p => { if (!p.named) return rIdx(4); return f2choose([tb.f2named], [`${G.tkey(p)}|${fsetF2(p)}`], p); },
  },
  F3: {
    A1: () => p => rIdx(3), A9: () => p => 0,
    A10: () => p => { const c = p.opts.map((r, i) => [r, i]).filter(x => p.roleWords[x[0]].length); return c.length ? G.pick(c)[1] : rIdx(3); },
    A10b: () => p => { const r = p.disp.find(r => p.roleWords[r].length); return r === undefined ? rIdx(3) : p.opts.indexOf(r); },
    A11q: () => p => p.opts.indexOf(2), A11s2: () => p => p.opts.indexOf(1), A11d2: () => p => p.opts.indexOf(p.disp[1]),
    Bpos: tb => p => { const v = tb.f3pos.vec(String(p.qfirst), ['0', '1', '2']); return v ? p.opts.indexOf(argmaxRand(v)) : rIdx(3); },
    Lfull: tb => p => { const v = tb.f3full.vec(f3key(p), ['0', '1', '2']) || tb.f3pos.vec(String(p.qfirst), ['0', '1', '2']); return v ? p.opts.indexOf(argmaxRand(v)) : rIdx(3); },
  },
  F4: {
    A1: () => p => rIdx(3), A9: () => p => 0,
    A12: () => p => p.opts.findIndex(o => o.k === 'acc'), A13: () => p => { const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].k === 'rej'); return G.pick(c)[1]; },
    B5: () => (p, h) => { const prev = h.filter(q => q.fmt === 'F4').pop(); const acc = prev ? !prev.propCorrect : true; return acc ? p.opts.findIndex(o => o.k === 'acc') : G.pick(p.opts.map((o, i) => [o, i]).filter(x => x[0].k === 'rej'))[1]; },
    Bstruct0: tb => p => { const v = tb.f4s.vec(f4skey(p), ['acc', 'r0', 'r1']); if (!v) return rIdx(3); const lab = ['acc', 'r0', 'r1'][argmaxRand(v)]; if (lab === 'acc') return p.opts.findIndex(o => o.k === 'acc'); const rj = p.opts.filter(o => o.k === 'rej').map(o => o.t).sort(); const t = rj[+lab[1]]; return p.opts.findIndex(o => o.k === 'rej' && o.t === t); },
    Lstruct: tb => p => {
      const rej = p.opts.map((o, i) => [o, i]).filter(x => x[0].k === 'rej'); const [X, Y] = rej.map(x => x[0].t);
      const v = tb.f4acc.vec(`${isKin(X, Y)}|${isKin(p.prop, X) || isKin(p.prop, Y)}|${p.propWord}|${p.sc}`, ['acc', 'rej']);
      const acc = v ? v[0] >= v[1] : true;
      if (acc) return p.opts.findIndex(o => o.k === 'acc');
      const w = tb.f4w.vec(`${wset(p)}|${p.sc}`, [X, Y]); const j = w ? argmaxRand(w) : rIdx(2); return rej[j][1];
    },
  },
  F5: {
    A1: () => p => rIdx(4), A9: () => p => 0,
    A14: () => p => { const c = p.opts.map((o, i) => [o, i]).filter(x => x[0].cue); return c.length ? G.pick(c)[1] : rIdx(4); },
    A15: () => p => { const c = p.opts.map((o, i) => [o, i]).filter(x => !x[0].cue); return c.length ? G.pick(c)[1] : rIdx(4); },
  },
  F6: {
    A1: () => p => rIdx(4), A9: () => p => 0,
    A2: () => p => pickType(p, firstWordType(p)), A3: () => p => pickType(p, strongest(p, 'bp')), A3b: () => p => pickType(p, strongest(p, 'br')),
    B6: () => p => { const ts = G.wordsInOrder(p).map(x => TABLE[x.w]).filter(Boolean); const t = p.dir === 1 ? ts[0] : ts[ts.length - 1]; return pickType(p, t); },
    B7doc: () => p => pickType(p, G.pick([p.t, p.other])),
    Boptlink: () => p => { const c = []; for (const k of Object.keys(S.LINKS)) { const [a, b] = S.LINKS[k]; if (p.opts.includes(a) && p.opts.includes(b)) c.push(p.dir === 1 ? a : b); } return c.length ? pickType(p, G.pick(c)) : rIdx(4); },
    Llex: tb => p => { const v = tb.f6lex.vec(`${wset(p)}|${p.dir}`, p.opts); return v ? argmaxRand(v) : rIdx(4); },
  },
};
const STAGE = n => n[0];

function near(a, b) { if (a.sh === b.sh) { const d = a.v.filter((x, i) => x !== b.v[i]).length; return d === 1; } const s1 = a.v.slice().sort().join(), s2 = b.v.slice().sort().join(); return s1 === s2; }
function f2choose(tabsArr, keys, p) {
  const feats = p.opts.map(o => featF2(p, o));
  for (let i = 0; i < keys.length; i++) { const v = tabsArr[i].vec(keys[i], [...new Set(feats)]); if (v) { const u = [...new Set(feats)]; const best = u[argmaxRand(v)]; const c = feats.map((f, j) => [f, j]).filter(x => x[0] === best); return G.pick(c)[1]; } }
  return rIdx(4);
}
// contrast-pair partner of a revealed previous problem
function cpPartner(prev, t) { for (const k of Object.keys(S.CP)) for (const pr of S.CP[k]) { const ts = pr.map(S.skType); if (S.skScene(pr[0]) !== prev.sc) continue; if (pr.includes(prev.sk) && ts.includes(t) && t !== prev.t) return true; } return false; }

// set-level solver: F1 posterior x set constraints x pair logic (previous answers are revealed by feedback, 4.4.3)
function setSolve(tb, p, h, post) {
  const v = post(tb, p).map(x => x + 1e-6);
  const lv = p.lv;
  if (p.pairPrev) {
    const prev = h[h.length - 1];
    if (prev.sc === p.sc) { // contrast pair (CP shares the scene; SP must differ, 3.7)
      const c = p.opts.map((t, i) => [t, i]).filter(x => cpPartner(prev, x[0]));
      if (c.length) { let b = c[0]; for (const x of c) if (v[x[1]] > v[b[1]]) b = x; return b[1]; }
    } else { const i = p.opts.indexOf(prev.t); if (i >= 0) return i; }
  }
  const used = {}; h.forEach(q => { if (q.t) used[q.t] = (used[q.t] || 0) + 1; });
  const remain = 5 - h.length; const distinct = Object.keys(used).length;
  const need = lv === 3 ? 3 : (lv >= 5 && lv !== 8 && lv !== 9) ? 4 : 0;
  p.opts.forEach((t, i) => {
    if ((used[t] || 0) >= 2) v[i] = 0;
    if (lv === 3 && !GA.includes(t)) v[i] = 0;
    if (lv === 4) { const gaUsed = h.some(q => GA.includes(q.t)); if (gaUsed && GA.includes(t)) v[i] = 0; const gaLeft = !gaUsed; if (gaLeft && remain === 1 && !GA.includes(t)) v[i] = 0; }
    if (need && distinct + remain <= need && used[t]) v[i] = 0;
  });
  if (v.every(x => x === 0)) return rIdx(4);
  return argmaxRand(v);
}
function f2set(tb, p, h, lex) {
  if (p.pairPrev) {
    const prev = h[h.length - 1]; let tk = null;
    if (prev.sc === p.sc) { // contrast or CP5
      const pk = G.tkey(prev);
      const cands = [];
      for (const k of Object.keys(S.CP)) for (const pr of S.CP[k]) { if (!pr.includes(prev.sk)) continue; const other = pr.find(x => x !== prev.sk); cands.push(other); }
      if (cands.length) { const sk = cands.length === 1 ? cands[0] : G.pick(cands); const t = S.skType(sk); tk = t === 'br' ? 'br' + (sk.endsWith('w') ? 'w' : 'd') : t; }
    } else tk = G.tkey(prev);
    if (tk) return f2choose([tb.f2named], [`${tk}|${fsetF2(p)}`], p);
  }
  // type posterior then named table
  if (p.named) return f2choose([tb.f2named], [`${G.tkey(p)}|${fsetF2(p)}`], p);
  if (!lex) return f2choose([tb.f2shape], [fsetF2(p)], p);
  const tks = ['tk', 'kb', 'ws', 'sk', 'bp', 'hk', 'nr', 'brw', 'brd'];
  const v = tb.f2type.vec(`${p.sc}|${wset(p)}|${p.nums.length}`, tks);
  if (v) { const tk = tks[argmaxRand(v)]; return f2choose([tb.f2named, ...tb.f2full], [`${tk}|${fsetF2(p)}`, ...f2keys(p)], p); }
  return f2choose(tb.f2full, f2keys(p), p);
}

// ---------- signature reader (question 4) ----------
function sigTypes(tok, strict) {
  const has = x => tok.has(x); const out = [];
  if (has('unit2') && has('cnt') && has('amt')) out.push('tk');
  if (has('dist2') && (has('resid') || has('tdiff'))) out.push('kb');
  if ((has('sum') && has('diff')) || (!strict && has('cnt') && has('diff'))) out.push('ws');
  if (has('combo2') || (!strict && has('comboAvg'))) out.push('sk');
  if (has('sum') && has('ratioSame')) out.push('bp');
  if (has('avg') && has('count')) out.push('hk');
  if (has('age') && has('inc') && has('ratioOther')) out.push('nr');
  if ((has('xfer') && has('ratioOther') && (has('sum') || has('both'))) || (!has('age') && has('inc') && has('ratioOther'))) out.push('br');
  return out;
}

// ---------- run ----------
function run() {
  const out = { seed: SEED, ntest: NTEST, ntrain: NTRAIN, lv: {} };
  for (const lv of LVS) {
    G.setSeed(SEED * 1000 + lv);
    const tb = tabs();
    for (let i = 0; i < NTRAIN; i++) train(tb, S.makeSet(lv));
    G.setSeed(SEED * 7777 + lv);
    const acc = {}; const cntF = {}; const sig = { n: 0, uniq8: 0, uniqOpt: 0, uniqStrict: 0, broken: 0, fail: {} };
    const val = { pos: [0, 0, 0, 0], posN: 0, f2max: { c: [0, 0], w: [0, 0] }, f2f2: { c: [0, 0], w: [0, 0] }, f3role: [0, 0, 0], f3cue: [0, 0], pairCP: 0, pairN: 0, f2n: 0, g2: 0, swap: 0, q5: 0, npool: 0 };
    const mc = {}; const vc = {};
    const pool = [];
    for (let i = 0; i < NTEST; i++) {
      const set = S.makeSet(lv);
      const h = [];
      for (const p of set) {
        cntF[p.fmt] = (cntF[p.fmt] || 0) + 1; pool.push(p);
        const sols = SOL[p.fmt];
        for (const n of Object.keys(sols)) {
          const f = sols[n](tb); const k = p.fmt + ':' + n; acc[k] = acc[k] || [0, 0];
          const ok = (f(p, h) === p.ans) ? 1 : 0; acc[k][0] += ok; acc[k][1]++;
          if (p.fmt === 'F2' && process.env.GK) { const k3 = 'G' + p.gridKind + ':' + n + ':' + G.tkey(p); acc[k3] = acc[k3] || [0, 0]; acc[k3][0] += ok; acc[k3][1]++; }
          if (p.pairPrev || p.pairFirst) { const k4 = p.fmt + 'pairAll:' + n; acc[k4] = acc[k4] || [0, 0]; acc[k4][0] += ok; acc[k4][1]++; }
          if (p.pairPrev) { const k2 = p.fmt + 'pair2:' + n; acc[k2] = acc[k2] || [0, 0]; acc[k2][0] += ok; acc[k2][1]++; }
        }
        if (p.opts && p.opts.length === 4) { val.pos[p.ans]++; val.posN++; }
        if (p.fmt === 'F2') { const mx = Math.max(...p.nums), f2 = first2(p); p.opts.forEach((o, i) => { const g = i === p.ans ? 'c' : 'w'; val.f2max[g][0] += o.f.v.includes(mx) ? 1 : 0; val.f2max[g][1]++; val.f2f2[g][0] += o.f.v.every(v => f2.has(v)) ? 1 : 0; val.f2f2[g][1]++; }); }
        if (p.fmt === 'F3') { val.f3role[p.keyRole]++; val.f3cue[0] += p.nonKeyCue ? 1 : 0; val.f3cue[1]++; }
        if (p.fmt === 'F2') { val.f2n++; p.opts.forEach(o => { if (o.m) mc[o.m] = (mc[o.m] || 0) + 1; }); if (p.gridKind === '2x2') val.g2++; if (p.swapped) val.swap++; }
        if (p.fmt === 'F1') { if (!process.env.STRICT) { G.labelF1(p, p.pairPrev ? h[h.length - 1].t : null); p.optionTypes = p.optLab; } p.optionTypes.forEach(l => { if (l) { const m = l.split(':')[0]; mc[m] = (mc[m] || 0) + 1; } }); }
        if (p.fmt === 'F4') mc[p.propCorrect ? 'M15' : 'M14'] = (mc[p.propCorrect ? 'M15' : 'M14'] || 0) + 1;
        if (p.fmt === 'F3') mc.M13 = (mc.M13 || 0) + 2;
        if (p.sk && !process.env.STRICT && !p.pairPrev && !p.pairFirst) { const key = p.sk.split(':')[0] === 'br' ? p.sk : p.sk.split(':')[0]; const vk = key + ':' + (p.fm === 'both' ? 'both:' : '') + p.vi; vc[vk] = (vc[vk] || 0) + 1; }
        if (p.q === 'Q5') val.q5++; if (p.fmt !== 'F5' && p.fmt !== 'F6') val.npool++;
        if (p.pairPrev) { val.pairN++; if (p.pairKind === 'CP') val.pairCP++; }
        if (p.fmt === 'F1' && p.tok) {
          sig.n++; const m8 = sigTypes(p.tok, false), ms = sigTypes(p.tok, true);
          const u8 = m8.length === 1 && m8[0] === p.t;
          const mo = m8.filter(t => p.opts.includes(t));
          if (u8) sig.uniq8++; else { const k = p.sk + (p.deco ? '+' + p.deco : '') + ' -> [' + m8.join(',') + ']' + (p.oneHandBroken ? ' oneHandBroken' : ''); sig.fail[k] = (sig.fail[k] || 0) + 1; }
          if (mo.length === 1 && mo[0] === p.t && !p.oneHandBroken) sig.uniqOpt++;
          if (ms.length === 1 && ms[0] === p.t && !p.oneHandBroken) sig.uniqStrict++;
          if (p.oneHandBroken) sig.broken++;
        }
        h.push(p);
      }
    }
    // v0.4.2 (検証 39): every problem has a family name; P(type | family name) against the type marginal
    const nmStat = {}; let famOK = 0, nNm = 0; const marg = {};
    for (const p of pool) { if (!p.names) continue; nNm++; if (p.names.some(x => G.FAMILY.includes(x))) famOK++; marg[p.t] = (marg[p.t] || 0) + 1; for (const nmv of p.names) { nmStat[nmv] = nmStat[nmv] || {}; nmStat[nmv][p.t] = (nmStat[nmv][p.t] || 0) + 1; } }
    let ratioLo = 9, ratioHi = 0; for (const nmv of G.FAMILY) { const e = nmStat[nmv] || {}; const tot = Object.values(e).reduce((a, b) => a + b, 0); for (const t of Object.keys(marg)) { if ((marg[t] / nNm) < 0.03) continue; const r = ((e[t] || 0) / tot) / (marg[t] / nNm); ratioLo = Math.min(ratioLo, r); ratioHi = Math.max(ratioHi, r); } }
    const nameCheck = { famShare: nNm ? +(famOK / nNm).toFixed(3) : null, ratioLo: +ratioLo.toFixed(2), ratioHi: +ratioHi.toFixed(2) };
    // rule 6 check on this Lv's pool: P(table type | word)
    const r6 = {}; const r6n = {};
    for (const w of Object.keys(TABLE)) { const ps = pool.filter(p => p.words && p.words.some(x => x.w === w) && p.fmt !== 'F5' && p.fmt !== 'F6'); if (ps.length < 30) continue; r6[w] = +(ps.filter(p => p.t === TABLE[w]).length / ps.length).toFixed(2); r6n[w] = ps.length; }
    const res = {};
    for (const k of Object.keys(acc)) res[k] = +(acc[k][0] / acc[k][1]).toFixed(3);
    // composites
    const fm = Object.keys(cntF); let cA = 0, cAB = 0, cABL = 0, tot = 0; const bestA = {}, bestAB = {}, bestABL = {};
    for (const f of fm) {
      const ks = Object.keys(res).filter(k => k.startsWith(f + ':'));
      const a = ks.filter(k => STAGE(k.split(':')[1]) === 'A'); const ab = ks.filter(k => ['A', 'B'].includes(STAGE(k.split(':')[1])));
      const abl = ks.filter(k => STAGE(k.split(':')[1]) !== 'R'); const bl = abl.reduce((m, k) => res[k] > res[m] ? k : m, abl[0]); bestABL[f] = [bl, res[bl]]; cABL += res[bl] * cntF[f];
      const ba = a.reduce((m, k) => res[k] > res[m] ? k : m, a[0]); const bb = ab.reduce((m, k) => res[k] > res[m] ? k : m, ab[0]);
      bestA[f] = [ba, res[ba]]; bestAB[f] = [bb, res[bb]];
      cA += res[ba] * cntF[f]; cAB += res[bb] * cntF[f]; tot += cntF[f];
    }
    out.lv[lv] = {
      acc: res, cntF, bestA, bestAB, bestABL, compA: +(cA / tot).toFixed(3), compAB: +(cAB / tot).toFixed(3), compABL: +(cABL / tot).toFixed(3), rule6: r6,
      sig: { n: sig.n, uniq8: sig.n ? +(sig.uniq8 / sig.n).toFixed(3) : null, uniqOpt: sig.n ? +(sig.uniqOpt / sig.n).toFixed(3) : null, uniqStrict: sig.n ? +(sig.uniqStrict / sig.n).toFixed(3) : null, broken: sig.broken, fail: Object.fromEntries(Object.entries(sig.fail).sort((a, b) => b[1] - a[1]).slice(0, 12)) },
      nameCheck, rule6n: r6n, errTypes: mc, variants: vc, fixedShareF2: (S.BAL['F2:' + lv] || {}).fixedShare, f3nonKeyCue: val.f3cue[1] ? +(val.f3cue[0] / val.f3cue[1]).toFixed(3) : null, q5share: +(val.q5 / Math.max(1, val.npool)).toFixed(3), f2share2x2: val.f2n ? +(val.g2 / val.f2n).toFixed(3) : null, f2swap: val.f2n ? +(val.swap / val.f2n).toFixed(3) : null,
      val: { ansPos4: val.pos.map(x => +(x / Math.max(1, val.posN)).toFixed(3)), f2max: val.f2max.c[1] ? [+(val.f2max.c[0] / val.f2max.c[1]).toFixed(2), +(val.f2max.w[0] / val.f2max.w[1]).toFixed(2)] : null, f2first2: val.f2f2.c[1] ? [+(val.f2f2.c[0] / val.f2f2.c[1]).toFixed(2), +(val.f2f2.w[0] / val.f2f2.w[1]).toFixed(2)] : null, f3keyRole: val.f3role, pairCPshare: val.pairN ? +(val.pairCP / val.pairN).toFixed(2) : null },
    };
    process.stderr.write(`lv${lv} compA=${out.lv[lv].compA} compAB=${out.lv[lv].compAB} compABL=${out.lv[lv].compABL}\n`);
  }
  console.log(JSON.stringify(out, null, 1));
}
run();
