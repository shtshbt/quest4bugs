'use strict';
// kom_shiki_henkei v0.3 (assembly answer format): generator and adversaries.
// Adapted from the independent audit generator for v0.2.1 (C8): same RNG, same
// number rules where they still apply, and the audit's Bayes-table stage B,
// rewritten for the assembly answer (cards placed into slots) instead of 4 choices.
// usage: node shiki_henkei_assemble_sim.js [testSets] [trainSets] [lvLo] [lvHi] [sampleSeed]
//   prints stage A / stage B maxima per Lv; with sampleSeed, also one sample set per Lv.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weighted(rng, table) { // table: [[key, p], ...]
  let u = rng(), acc = 0;
  for (const [k, p] of table) { acc += p; if (u < acc) return k; }
  return table[table.length - 1][0];
}
const B = '□';

// ---------------------------------------------------------------- spec (doc 4.2)
const TWO = { T_AF: 0.26, T_SB: 0.42, T_SF: 0.32 };
const BOTH = { T_AB: 0.03, T_AF: 0.26, T_SB: 0.43, T_SF: 0.28 };
const SPEC = {
  2: { pTwo: 1, two: { T_AF: 1 / 3, T_SB: 1 / 3, T_SF: 1 / 3 }, M: 20, rev2: 0, revB: 0, pair: 0 },
  3: { pTwo: 0.6, two: TWO, both: BOTH, M: 100, rev2: 0, revB: 0, pair: 0 },
  4: { pTwo: 0.6, two: TWO, both: BOTH, M: 100, rev2: 0.5, revB: 0, pair: 0 },
  5: { pTwo: 0, both: BOTH, M: 100, revB: 0, pair: 0 },
  6: { pTwo: 0, both: BOTH, M: 100, revB: 1, pair: 0 },
  7: { pTwo: 0, both: BOTH, M: 100, revB: 0.5, pair: 0 },
  8: { pTwo: 0, both: BOTH, M: 100, revB: 0.5, pair: 1 },
  9: { pTwo: 0, both: BOTH, M: 100, revB: 0.5, pair: 1 },
};
const tbl = o => Object.entries(o);

// signed terms: [[n, +1|-1], ...] in build order
const val = terms => terms.reduce((v, [n, s]) => v + s * n, 0);
const minStep = terms => { let v = 0, m = Infinity; terms.forEach(([n, s], i) => { v += s * n; if (i > 0) m = Math.min(m, v); }); return m; };
const key = terms => terms.map(([n, s]) => (s > 0 ? '+' : '-') + n).sort().join(',');

// ---------------------------------------------------------------- 2-number
function twoNum(rng, type, orient, M) {
  for (;;) {
    const x = ri(rng, 2, M), y = ri(rng, 2, M);
    if (!(x < y && y - x >= 2 && y !== 2 * x && x + y <= M)) continue;
    let text, box, cls, side, nums;
    if (type === 'T_AF') { text = orient === 'normal' ? `${B}+${x}=${y}` : `${y}=${B}+${x}`; box = y - x; cls = 'diff'; side = '<'; nums = [x, y]; }
    else if (type === 'T_SB') { text = orient === 'normal' ? `${y}-${B}=${x}` : `${x}=${y}-${B}`; box = y - x; cls = 'diff'; side = '>'; nums = [y, x]; }
    else {
      const aBig = rng() < 0.5; const a = aBig ? y : x, d = aBig ? x : y;
      text = orient === 'normal' ? `${B}-${a}=${d}` : `${d}=${B}-${a}`; box = a + d; cls = 'sum'; side = aBig ? '>' : '<'; nums = [a, d];
    }
    const pid = { T_AF: 'add_front', T_SB: 'sub_back', T_SF: 'sub_front' }[type] + (orient === 'reversed' ? '_rev' : '');
    return { fam: 'two', type, orient, patternId: pid, text, box, cls, side, op: type === 'T_AF' ? '+' : '-', front: type !== 'T_SB', x, y, nums, slots: 3 };
  }
}
const TWO_TERMS = (p, cls) => cls === 'diff' ? [[p.y, 1], [p.x, -1]] : cls === 'rdiff' ? [[p.x, 1], [p.y, -1]] : [[p.y, 1], [p.x, 1]];

// ---------------------------------------------------------------- both sides (R = b + c)
const BOTH_PID = { T_AB: 'both_add_back', T_AF: 'both_add_front', T_SB: 'both_sub_back', T_SF: 'both_sub_front' };
function bothNums(rng, type) {
  for (;;) {
    const a = ri(rng, 3, 97), b = ri(rng, 2, 96), c = ri(rng, 2, 96);
    if (new Set([a, b, c]).size < 3) continue;
    if (!(a > b && a > c)) continue; // C7: a is the largest single number in every type
    const R = b + c;
    if (type === 'T_SB') { if (!(a > R && a - R >= 2 && a + R <= 100)) continue; }
    else { if (!(R > a && R - a >= 2 && R + a <= 100)) continue; }
    return { a, b, c };
  }
}
function bothProb(type, orient, n) {
  const { a, b, c } = n; const R = `${b}+${c}`;
  const side = { T_AB: `${a}+${B}`, T_AF: `${B}+${a}`, T_SB: `${a}-${B}`, T_SF: `${B}-${a}` }[type];
  const text = orient === 'normal' ? `${side}=${R}` : `${R}=${side}`;
  const cls = { T_AB: 'Rm', T_AF: 'Rm', T_SB: 'aR', T_SF: 'Rp' }[type];
  const box = cls === 'Rm' ? b + c - a : cls === 'Rp' ? b + c + a : a - b - c;
  return { fam: 'both', type, orient, patternId: BOTH_PID[type] + (orient === 'reversed' ? '_rev' : ''), text, box, cls, op: (type === 'T_AB' || type === 'T_AF') ? '+' : '-', front: type === 'T_AF' || type === 'T_SF', a, b, c, nums: [a, b, c], slots: 5 };
}
const BOTH_TERMS = (p, cls) => cls === 'Rm' ? [[p.b, 1], [p.c, 1], [p.a, -1]] : cls === 'Rp' ? [[p.b, 1], [p.c, 1], [p.a, 1]] : [[p.a, 1], [p.b, -1], [p.c, -1]];
const termsOf = (p, cls) => p.fam === 'two' ? TWO_TERMS(p, cls) : BOTH_TERMS(p, cls);
function judge(p, terms) { // doc 3.4: same signed terms as the answer and no negative step
  const ok = key(terms) === key(termsOf(p, p.cls));
  return ok && minStep(terms) >= 0;
}

// cards (doc 3.3): the number cards (every number in the problem) in an order shuffled by the
// injected rng, then the operator row, always + then -
function addCards(rng, p) { p.cards = shuffle(rng, p.nums.map(String)).concat(['+', '-']); return p; }

function drawType(rng, shares) { return weighted(rng, tbl(shares)); }
function buildItem(rng, lv, fam, type) {
  const S = SPEC[lv];
  if (fam === 'two') return twoNum(rng, type, rng() < S.rev2 ? 'reversed' : 'normal', S.M);
  return bothProb(type, rng() < S.revB ? 'reversed' : 'normal', bothNums(rng, type));
}
function buildSetMid(rng, lv) {
  const S = SPEC[lv];
  const seq = [];
  for (let k = 0; k < 5; k++) {
    const fam = rng() < S.pTwo ? 'two' : 'both';
    seq.push(buildItem(rng, lv, fam, drawType(rng, fam === 'two' ? S.two : S.both)));
  }
  if (S.pair) { // doc 3.6 P1 / C6: the second item reuses the far side b + c; its type is drawn from the
    // full shares; a is kept when the type allows it and redrawn (same b, c) otherwise
    const i = ri(rng, 0, 3); const p = seq[i];
    const t2 = drawType(rng, S.both);
    const fits = a => (new Set([a, p.b, p.c]).size === 3) && a > p.b && a > p.c && (t2 === 'T_SB' ? (a > p.b + p.c && a - p.b - p.c >= 2 && a + p.b + p.c <= 100) : (p.b + p.c > a && p.b + p.c - a >= 2 && p.b + p.c + a <= 100));
    let a2 = fits(p.a) ? p.a : null;
    for (let t = 0; t < 200 && a2 === null; t++) { const c = ri(rng, 3, 97); if (fits(c)) a2 = c; }
    if (a2 === null) return buildSetMid(rng, lv);
    // same type and same numbers: the orientation is flipped so that the two stems differ
    const o2 = t2 === p.type && a2 === p.a ? (p.orient === 'normal' ? 'reversed' : 'normal') : (rng() < S.revB ? 'reversed' : 'normal');
    const q = bothProb(t2, o2, { a: a2, b: p.b, c: p.c });
    q.pair = p.pair = 'pair'; seq[i + 1] = q;
  }
  return seq.map(p => addCards(rng, p));
}

// ---------------------------------------------------------------- Lv1 (number input, unchanged)
function buildLv1(rng) {
  const seq = [];
  for (let k = 0; k < 5; k++) {
    const add = rng() < 0.5; let a, b;
    for (;;) {
      a = ri(rng, 11, 89); b = rng() < 0.5 ? ri(rng, 2, 9) : ri(rng, 11, 89);
      if (add) { if (a % 10 + b % 10 <= 9 && Math.floor(a / 10) + Math.floor(b / 10) <= 9) break; }
      else if (a - b >= 2 && a % 10 >= b % 10 && Math.floor(a / 10) >= Math.floor(b / 10)) break;
    }
    const side = rng() < 0.5 ? 'r' : 'l'; const e = `${a}${add ? '+' : '-'}${b}`;
    seq.push({ fam: 'intro', add, a, b, ans: add ? a + b : a - b, side, patternId: `solve_${add ? 'add' : 'sub'}_${side}`, text: side === 'r' ? `${B}=${e}` : `${e}=${B}` });
  }
  return seq;
}

// ---------------------------------------------------------------- Lv10 (story -> story-order equation)
const CTX = {
  candy: ['あめ', 'こ', 'もらって', 'たべて', 'ありました'], stickers: ['シール', 'まい', 'もらって', 'あげて', 'ありました'],
  flowers: ['はな', '本', 'さいて', 'かれて', 'ありました'], books: ['ほん', 'さつ', 'かって', 'あげて', 'ありました'],
  cars: ['くるま', '台', 'きて', 'でていって', 'とまって いました'],
};
function story(rng, role, inc, ctx, fixed) {
  for (;;) {
    const u = fixed ? fixed[0] : ri(rng, 2, 30), w = fixed ? fixed[1] : ri(rng, 2, 30);
    const [lo, hi] = [Math.min(u, w), Math.max(u, w)];
    if (hi - lo < 2 || hi === 2 * lo) { if (fixed) return null; continue; }
    let s, c, r, box;
    if (role === 'start') { c = inc ? lo : (rng() < 0.5 ? lo : hi); r = inc ? hi : (c === lo ? hi : lo); box = inc ? r - c : r + c; }
    else if (role === 'change') { if (inc) { s = lo; r = hi; box = r - s; } else { s = hi; r = lo; box = s - r; } }
    else { s = hi; c = lo; box = inc ? s + c : s - c; }
    if (box < 2 || box > 30) { if (fixed) return null; continue; }
    const [mono, unit, vi, vd, ari] = CTX[ctx];
    const t = role === 'start' ? [B, c, r] : role === 'change' ? [s, B, r] : [s, c, B];
    const text = `${mono}が ${t[0]} ${unit} ${ari}。${t[1]} ${unit} ${inc ? vi : vd}、${t[2]} ${unit}に なりました。`;
    const eq = { lhs1: t[0], op: inc ? '+' : '-', lhs2: t[1], rhs: t[2] };
    const nums = [t[0], t[1], t[2]].filter(v => v !== B);
    return { fam: 'story', role, inc, ctx, text, box, eq, nums, tokens: t, slots: 4 };
  }
}
function buildLv10(rng) {
  const ctxs = Object.keys(CTX);
  const roleTbl = [['start', 1 / 3], ['change', 1 / 3], ['result', 1 / 3]];
  const seq = [];
  for (let k = 0; k < 5; k++) seq.push(story(rng, weighted(rng, roleTbl), rng() < 0.5, pick(rng, ctxs)));
  // pair (doc 3.6 P4): same numbers and context; direction or role changes, chosen 1/2 (C6)
  const i = ri(rng, 0, 3); const p = seq[i];
  for (let t = 0; t < 50; t++) {
    const flipDir = rng() < 0.5;
    const role = flipDir ? p.role : pick(rng, ['start', 'change', 'result'].filter(r => r !== p.role));
    const q = story(rng, role, flipDir ? !p.inc : p.inc, p.ctx, p.nums);
    if (q) { q.pair = p.pair = 'pair'; seq[i + 1] = q; break; }
  }
  return seq.map(p => { p.cards = shuffle(rng, p.nums.map(String).concat([B])).concat(['+', '-']); return p; });
}
const eqStr = e => `${e.lhs1}${e.op}${e.lhs2}=${e.rhs}`;

function buildSet(lv, rng) { return lv === 1 ? buildLv1(rng) : lv === 10 ? buildLv10(rng) : buildSetMid(rng, lv); }

// ---------------------------------------------------------------- stage A (one visible cue, same rule for all items)
// Each returns signed terms built from the cards (Lv2-9).
const largestFirst = p => { const ns = p.nums.slice().sort((u, v) => v - u); return ns; };
const STAGE_A = {
  'A1 いつも引く (大きい数から)': p => { const ns = largestFirst(p); return [[ns[0], 1]].concat(ns.slice(1).map(n => [n, -1])); },
  'A1r いつも むこうから □ の となりを引く': p => p.fam === 'two' ? termsOf(p, 'diff') : termsOf(p, 'Rm'),
  'A2 いつも足す': p => p.nums.map(n => [n, 1]),
  'A3 見えている演算子をそのまま (□ を消して数を式の順に、演算子は式の演算子)': p => {
    const ns = p.text.match(/\d+/g).map(Number); const sg = p.op === '+' ? 1 : -1;
    return ns.map((n, i) => [n, i ? sg : 1]);
  },
  'A4 ぎゃくの演算': p => p.op === '+' ? (p.fam === 'two' ? termsOf(p, 'diff') : termsOf(p, 'Rm')) : (p.fam === 'two' ? termsOf(p, 'sum') : termsOf(p, 'Rp')),
  'A5 □ がまえならたす、うしろならひく': p => p.front ? (p.fam === 'two' ? termsOf(p, 'sum') : termsOf(p, 'Rp')) : (p.fam === 'two' ? termsOf(p, 'diff') : termsOf(p, 'Rm')),
  'A6 □ がまえならひく、うしろならたす': p => p.front ? (p.fam === 'two' ? termsOf(p, 'diff') : termsOf(p, 'Rm')) : (p.fam === 'two' ? termsOf(p, 'sum') : termsOf(p, 'Rp')),
  'A7 □ と むこうを入れかえる': p => { // a+□=R -> a+R ; a-□=R -> a-R ; □+a=R -> R+a ; □-a=R -> R-a
    if (p.fam === 'two') { if (p.type === 'T_AF') return termsOf(p, 'sum'); if (p.type === 'T_SB') return termsOf(p, 'diff'); return [[p.nums[1], 1], [p.nums[0], -1]]; }
    if (p.type === 'T_SB') return termsOf(p, 'aR'); if (p.type === 'T_SF') return termsOf(p, 'Rm'); return termsOf(p, 'Rp');
  },
  'A8 カードの並びの順に置く (演算子は左のカード、つまり +)': p => {
    const ns = p.cards.filter(c => /\d/.test(c)).map(Number); const op = p.cards.find(c => c === '+' || c === '-') === '+' ? 1 : -1;
    return ns.map((n, i) => [n, i ? op : 1]);
  },
  'A9 小さい数から並べて引く': p => { const ns = p.nums.slice().sort((u, v) => u - v); return [[ns[0], 1]].concat(ns.slice(1).map(n => [n, -1])); },
};

// ---------------------------------------------------------------- stage B (rules known; Bayes tables over allowed features + history)
// Excluded as the learning content itself (doc 11.1): op together with pos, and op or pos together with
// side (side is a magnitude reading of which number is the whole, the WZ_zenbu / WZ_hitotsu skill).
const FEATS = {
  fam: p => p.fam,
  op: p => p.op,
  pos: p => (p.front ? 'F' : 'K'),
  side: p => (p.fam === 'two' ? p.side : (p.a / Math.max(p.b, p.c) < 1.3 ? 'r1' : p.a / Math.max(p.b, p.c) < 1.6 ? 'r2' : p.a / Math.max(p.b, p.c) < 2 ? 'r3' : 'r4')),
  orient: p => p.orient,
  cards: p => (p.cards[0] === '+' || p.cards[0] === '-' ? 'op1st' : 'num1st'),
  pair: (p, prev) => (prev && p.pair && prev.pair ? 'PAIR' : ''),
};
const B_SETS = ['fam', 'fam,op', 'fam,pos', 'fam,side', 'fam,orient', 'fam,cards', 'fam,op,orient', 'fam,pos,orient', 'fam,op,pair', 'fam,pos,pair', 'fam,side,pair', 'fam,op,cards'];
let EXCL_RAW = false; // true only when measuring the excluded combinations for reference
function featKey(p, prev, which) {
  return which.split(',').map(f => {
    if (f === 'side' && (which.includes('op') || which.includes('pos')) && !EXCL_RAW) return 'side-';
    return FEATS[f](p, prev);
  }).join('|');
}
function trainB(sets, which) {
  const tab = new Map();
  const add = (k, cls) => { let m = tab.get(k); if (!m) { m = {}; tab.set(k, m); } m[cls] = (m[cls] || 0) + 1; };
  for (const set of sets) {
    let hist = '';
    set.forEach((p, k) => { const f = featKey(p, set[k - 1], which); add(`${k}|${hist}|${f}`, p.cls); add(`F|${f}`, p.cls); hist += `[${f}:${p.cls}]`; });
  }
  return tab;
}
const argmax = m => Object.keys(m).reduce((a, b) => (m[a] >= m[b] ? a : b));
function runB(tab, set, which) {
  let ok = 0, hist = '';
  set.forEach((p, k) => {
    const f = featKey(p, set[k - 1], which);
    let m = tab.get(`${k}|${hist}|${f}`);
    if (!m || Object.values(m).reduce((a, b) => a + b, 0) < 20) m = tab.get(`F|${f}`);
    const cls = m ? argmax(m) : (p.fam === 'two' ? 'diff' : 'Rm');
    if (judge(p, termsOf(p, cls))) ok++;
    hist += `[${f}:${p.cls}]`;
  });
  return ok;
}
// previous-answer rules (C6), stage A form: reuse the previous item's answer class
function runPrevRepeat(set) { let ok = 0; set.forEach((p, k) => { const cls = k && set[k - 1].fam === p.fam ? set[k - 1].cls : (p.fam === 'two' ? 'diff' : 'Rm'); if (judge(p, termsOf(p, cls))) ok++; }); return ok; }

// ---------------------------------------------------------------- Lv10 adversaries
// Build an equation [t1 op t2 = t3] from the cards; correct iff it equals the story-order equation.
const S10 = {
  'Q1 □ をはじめ、数は文の順、演算は動詞': p => ({ lhs1: B, op: p.inc ? '+' : '-', lhs2: p.nums[0], rhs: p.nums[1] }),
  'Q2 □ をまんなか': p => ({ lhs1: p.nums[0], op: p.inc ? '+' : '-', lhs2: B, rhs: p.nums[1] }),
  'Q3 □ をさいご': p => ({ lhs1: p.nums[0], op: p.inc ? '+' : '-', lhs2: p.nums[1], rhs: B }),
  'Q4 文の順、演算はいつも +': p => ({ lhs1: p.tokens[0], op: '+', lhs2: p.tokens[1], rhs: p.tokens[2] }),
  'Q5 文の順、演算はいつも -': p => ({ lhs1: p.tokens[0], op: '-', lhs2: p.tokens[1], rhs: p.tokens[2] }),
  'Q6 カードの並びの順': p => { const t = p.cards.filter(c => c !== '+' && c !== '-'); return { lhs1: t[0], op: p.cards.find(c => c === '+' || c === '-'), lhs2: t[1], rhs: t[2] }; },
  'Q7 大きい数をさいご、□ をはじめ': p => { const [lo, hi] = p.nums.slice().sort((u, v) => u - v); return { lhs1: B, op: p.inc ? '+' : '-', lhs2: lo, rhs: hi }; },
};
const sameEq = (e, f) => String(e.lhs1) === String(f.lhs1) && e.op === f.op && String(e.lhs2) === String(f.lhs2) && String(e.rhs) === String(f.rhs);
function trainB10(sets, which) {
  const tab = new Map();
  const add = (k, c) => { let m = tab.get(k); if (!m) { m = {}; tab.set(k, m); } m[c] = (m[c] || 0) + 1; };
  for (const set of sets) { let hist = ''; set.forEach((p, k) => { const f = f10(p, set[k - 1], which); add(`${k}|${hist}|${f}`, p.role); add(`F|${f}`, p.role); hist += `[${f}:${p.role}]`; }); }
  return tab;
}
function f10(p, prev, which) { const v = []; if (which.includes('verb')) v.push(p.inc ? 'inc' : 'dec'); if (which.includes('pair')) v.push(prev && p.pair && prev.pair ? 'PAIR' + prev.role : ''); if (which.includes('big')) v.push(p.nums[0] > p.nums[1] ? 'desc' : 'asc'); return v.join('|'); }
function runB10(tab, set, which) {
  let ok = 0, hist = '';
  set.forEach((p, k) => {
    const f = f10(p, set[k - 1], which);
    let m = tab.get(`${k}|${hist}|${f}`); if (!m || Object.values(m).reduce((a, b) => a + b, 0) < 20) m = tab.get(`F|${f}`);
    const role = argmax(m);
    const e = role === 'start' ? S10['Q1 □ をはじめ、数は文の順、演算は動詞'](p) : role === 'change' ? S10['Q2 □ をまんなか'](p) : S10['Q3 □ をさいご'](p);
    if (sameEq(e, p.eq)) ok++;
    hist += `[${f}:${p.role}]`;
  });
  return ok;
}

// ---------------------------------------------------------------- run
function measure(lv, NT, NTR) {
  const rngT = mulberry32(1000 + lv), rngS = mulberry32(5000 + lv);
  const test = Array.from({ length: NT }, () => buildSet(lv, rngT));
  const N = NT * 5, A = {}, Bv = {};
  if (lv === 1) {
    A['L1 いつも足す'] = test.flat().filter(p => p.a + p.b === p.ans).length / N;
    A['L2 大きい数から引く'] = test.flat().filter(p => p.a - p.b === p.ans).length / N;
    A['L3 最初の数'] = test.flat().filter(p => p.a === p.ans).length / N;
    Bv['B 和と差の比率 (いつも多いほう)'] = Math.max(A['L1 いつも足す'], A['L2 大きい数から引く']);
    return { A, B: Bv };
  }
  const train = Array.from({ length: NTR }, () => buildSet(lv, rngS));
  if (lv === 10) {
    for (const k of Object.keys(S10)) A[k] = test.reduce((a, s) => a + s.filter(p => sameEq(S10[k](p), p.eq)).length, 0) / N;
    for (const w of ['verb', 'pair', 'verb,pair', 'verb,big', 'verb,big,pair']) { const tab = trainB10(train, w); Bv['B bayes(' + w + ', 履歴)'] = test.reduce((a, s) => a + runB10(tab, s, w), 0) / N; }
    return { A, B: Bv };
  }
  for (const k of Object.keys(STAGE_A)) A[k] = test.reduce((a, s) => a + s.filter(p => judge(p, STAGE_A[k](p))).length, 0) / N;
  A['A10 前問の答えの形をくり返す'] = test.reduce((a, s) => a + runPrevRepeat(s), 0) / N;
  const sets = B_SETS;
  for (const w of sets) { const tab = trainB(train, w); Bv['B bayes(' + w + ', 履歴)'] = test.reduce((a, s) => a + runB(tab, s, w), 0) / N; }
  // reference only (excluded as content): op and pos together
  EXCL_RAW = true;
  for (const w of ['fam,op,pos', 'fam,op,side', 'fam,pos,side']) { const tabX = trainB(train, w); Bv['(除外) bayes(' + w + ')'] = test.reduce((a, s) => a + runB(tabX, s, w), 0) / N; }
  EXCL_RAW = false;
  return { A, B: Bv };
}

function show(lv, seed) {
  const set = buildSet(lv, mulberry32(seed));
  return set.map((p, k) => {
    if (lv === 1) return `${k + 1}. [${p.patternId}] ${p.text}  正答 ${p.ans}`;
    if (lv === 10) return `${k + 1}. [${p.role}/${p.inc ? 'inc' : 'dec'}${p.pair ? '/pair' : ''}] ${p.text}  カード ${p.cards.join(' ')}  正答 ${eqStr(p.eq)}  □=${p.box}`;
    const ans = termsOf(p, p.cls).map(([n, s], i) => (i ? (s > 0 ? '+' : '-') : '') + n).join('');
    return `${k + 1}. [${p.patternId}${p.pair ? '/pair' : ''}] ${p.text}  カード ${p.cards.join(' ')}  正答 □=${ans}  □=${p.box}`;
  }).join('\n');
}

if (require.main === module) {
  const NT = Number(process.argv[2] || 2000), NTR = Number(process.argv[3] || 30000);
  const lo = Number(process.argv[4] || 1), hi = Number(process.argv[5] || 10);
  for (let lv = lo; lv <= hi; lv++) {
    const { A, B: Bv } = measure(lv, NT, NTR);
    const bOnly = Object.entries(Bv).filter(([k]) => !k.startsWith('(除外)'));
    const am = Object.entries(A).reduce((x, y) => (y[1] > x[1] ? y : x)); const bm = bOnly.reduce((x, y) => (y[1] > x[1] ? y : x));
    console.log(`Lv${lv}: A_max=${am[1].toFixed(3)} (${am[0]})  B_max=${bm[1].toFixed(3)} (${bm[0]})`);
    console.log('   A: ' + Object.entries(A).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(', '));
    console.log('   B: ' + Object.entries(Bv).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(', '));
  }
  if (process.argv[6]) for (let lv = lo; lv <= hi; lv++) console.log(`\n=== Lv${lv} sample (seed ${Number(process.argv[6]) + lv}) ===\n` + show(lv, Number(process.argv[6]) + lv));
}
module.exports = { buildSet, measure, judge, termsOf, mulberry32, SPEC, show };
