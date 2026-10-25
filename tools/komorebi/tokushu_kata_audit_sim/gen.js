'use strict';
// kom_tokushu_kata audit generator (curriculum v0.4). Word-level model of
// docs/komorebi_tokushu_kata_curriculum.md: skeletons from 付表 B, slot ranges from 9.2,
// deco pools from 9.2, rules 4.3 to 4.5. sets.js builds sets, audit.js runs the enemies.
// This is the port source of 検証 32. The independent generator is in independent/.

let R = null;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function setSeed(s) { R = mulberry32(s); }
setSeed(1);
const rnd = () => R();
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const TYPES = ['tk', 'kb', 'ws', 'sk', 'bp', 'hk', 'nr', 'br'];
const GA = ['tk', 'kb', 'ws', 'sk'];
const GB = ['bp', 'hk', 'nr', 'br'];
// 3.1 kin pairs, in table order (4.9: the first listed pair keeps M4)
const KIN = [['tk', 'sk'], ['tk', 'kb'], ['tk', 'ws'], ['kb', 'hk'], ['ws', 'bp'], ['ws', 'nr'], ['bp', 'br'], ['bp', 'nr'], ['nr', 'br']];
const isKin = (a, b) => KIN.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const kinOf = t => KIN.filter(p => p.includes(t)).map(p => (p[0] === t ? p[1] : p[0]));
// 3.3 child's lookup table
const TABLE = { W1: 'kb', W2: 'kb', W3: 'kb', W4: 'tk', W5: 'ws', W6: 'ws', W7: 'bp', W8: 'nr', W9: 'nr', W10: 'hk', W11: 'br', W12: 'sk' };
const STRENGTH = ['W10', 'W8', 'W1', 'W2', 'W4', 'W11', 'W12', 'W7', 'W6', 'W9', 'W3', 'W5'];
const SCENE_TYPES = { B1: ['tk', 'kb', 'ws', 'bp'], B2: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk'], B3: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk', 'br'], B4: ['ws', 'bp', 'nr', 'hk'], B5: ['tk', 'ws', 'hk', 'sk'], B6: ['tk', 'kb', 'ws'], B7: ['ws', 'bp', 'br'] };
const SCENE_TYPICAL = { B1: 'tk', B2: 'sk', B3: 'kb', B4: 'nr', B5: 'hk', B6: 'kb', B7: 'br' };
// 9.2 deco pools (v0.4): word -> types that can carry it
const DECO = {
  B1: { W4: ['tk', 'ws', 'bp'], W1: ['kb', 'tk', 'ws', 'bp'] },
  B2: { W1: ['tk', 'kb', 'sk', 'ws', 'bp', 'hk'], W2: ['tk', 'kb', 'sk', 'ws', 'bp', 'hk'], W3: ['ws', 'bp', 'sk', 'tk'], W6: ['sk', 'hk', 'kb'], W12: ['hk', 'kb', 'tk', 'ws', 'bp'] },
  B3: { W1: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk', 'br'], W2: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk', 'br'], W11: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk'], W6: ['br', 'hk', 'sk', 'kb'], W12: ['tk', 'kb', 'ws', 'bp', 'hk'] },
  B4: { W6: ['nr', 'hk'], W5: ['hk'] },
  B5: { W2: ['hk', 'ws', 'tk', 'sk'], W6: ['hk', 'sk'], W12: ['hk', 'tk', 'ws'] },
  B6: { W1: ['kb', 'tk', 'ws'], W5: ['tk', 'ws', 'kb'], W6: ['kb'] },
  B7: { W2: ['bp', 'ws', 'br'], W11: ['bp', 'ws'], W3: ['ws', 'bp', 'br'] },
};
const NUMW = ['W1', 'W2', 'W6', 'W8', 'W11']; // number-bearing deco words (4.3 規則 9)

function F(sh, v) { let s = sh; const L = 'abc'; for (let i = 0; i < v.length; i++) s = s.split(L[i]).join(String(v[i])); return { sh, v: v.slice(), str: s }; }

// ---------- 付表 B skeletons with 9.2 slot ranges ----------
// sample(v) fills v and returns true when the 9.2 conditions hold. ord: shown numbers per body
// sentence in text order ('#n' is a fixed numeral). w: native table words per sentence [s1, s2, q]
// for the chosen variant. hand: one step (付表 B). err: in-type errors for F2.
const pm = () => (rnd() < 0.5 ? 1 : -1);
const SK = {};
function def(id, t, sc, o) { SK[id] = Object.assign({ id, t, sc, f2: true, f3: false }, o); }
// tk
def('tk:B1', 'tk', 'B1', { q: 'Q7', sample: v => { v.N = ri(4, 20); v.x = ri(1, v.N - 1); v.L = 2 * v.N + 2 * v.x; return true; }, ord: () => [['N'], ['L']], w: () => [['W5'], ['W4'], []], hand: v => F('a*b', [2, v.N]), err: v => [['M6', F('a*b', [2, v.L])]], forb: v => [F('a*b', [4, v.N])] });
def('tk:B2', 'tk', 'B2', { q: 'Q2', sample: v => { v.b = ri(5, 15); v.a = v.b + ri(2, 10); v.N = ri(3, 9); v.x = ri(1, v.N - 1); v.T = v.a * v.x + v.b * (v.N - v.x); return v.T <= 99; }, ord: () => [['a', 'b', 'N'], ['T']], w: () => [['W5'], [], []], hand: v => F('a*b', [v.b, v.N]), err: v => [['M6', F('a*b', [v.b, v.T])]], forb: v => [F('a*b', [v.a, v.N])] });
def('tk:B3', 'tk', 'B3', { q: 'Q1', sample: v => { v.p = ri(2, 6); v.q = v.p + ri(1, 3); v.N = ri(4, 12); v.x = ri(1, v.N - 1); v.T = v.p * (v.N - v.x) + v.q * v.x; return v.T <= 99; }, ord: () => [['N', 'p', 'q'], ['T']], w: () => [['W3'], [], ['W11']], hand: v => F('a*b', [v.p, v.N]), err: v => [['M6', F('a*b', [v.p, v.T])]], forb: v => [F('a*b', [v.q, v.N])] });
def('tk:B5', 'tk', 'B5', { q: 'Q6', sample: v => { v.p = ri(3, 10); v.q = ri(2, 5); v.N = ri(6, 20); v.c = ri(1, v.N - 1); v.S = v.p * v.c - v.q * (v.N - v.c); return v.q !== v.p && v.S >= 2 && v.S <= 99; }, ord: () => [['p', 'q', 'N'], ['S']], w: () => [[], [], []], hand: v => F('a*b', [v.p, v.N]), err: v => [['M6', F('a*b', [v.q, v.N])]], forb: () => [] });
def('tk:B6', 'tk', 'B6', { q: 'Q7', sample: v => { v.c1 = ri(2, 4); v.c2 = v.c1 + ri(1, 3); v.N = ri(4, 15); v.x = ri(1, v.N - 1); v.P = v.c1 * (v.N - v.x) + v.c2 * v.x; return v.P <= 99; }, ord: () => [['c1', 'c2', 'N'], ['P']], w: () => [['W5'], [], []], hand: v => F('a*b', [v.c1, v.N]), err: v => [['M6', F('a*b', [v.c1, v.P])]], forb: v => [F('a*b', [v.c2, v.N])] });
// kb: vi 0 = cue wording (あまり / たりない), vi 1 = no cue (のこる / ほしい). kb:B6 is always no cue.
const kbSample = v => { v.p = ri(2, 6); v.q = v.p + ri(1, 3); v.n = ri(3, 12); const span = (v.q - v.p) * v.n; if (span < 4) return false; v.r = ri(2, span - 2); v.s = span - v.r; return v.p * v.n + v.r <= 99; };
const kbW = (cue, extra) => (vi) => [[...extra, ...(vi === 0 && cue ? ['W1'] : [])], [...extra, ...(vi === 0 && cue ? ['W2'] : [])], []];
def('kb:B1', 'kb', 'B1', { q: 'Q7', vis: 2, sample: kbSample, ord: () => [['p', 'r'], ['q', 's']], w: kbW(true, ['W3', 'W11']), hand: v => F('a+b', [v.r, v.s]), err: v => [['M6', F('a+b', [v.p, v.q])]], forb: v => [F('a-b', [v.q, v.p])] });
def('kb:B2m', 'kb', 'B2', { q: 'Q3', vis: 2, sample: v => { v.u = ri(5, 20); v.m = ri(2, 6); v.n = v.m + ri(1, 4); const span = (v.n - v.m) * v.u; v.r = ri(2, span - 2); v.s = span - v.r; return v.m * v.u + v.r <= 99 && v.s >= 2; }, ord: () => [['m', 'r'], ['n', 's']], w: kbW(true, []), hand: v => F('a+b', [v.r, v.s]), err: v => [['M6', F('a+b', [v.m, v.n])]], forb: v => [F('a-b', [v.n, v.m])] });
def('kb:B2s', 'kb', 'B2', { q: 'Q1', f2: false, sample: v => { v.u = ri(2, 10); v.p = ri(2, 3); v.q = v.p + ri(1, 2); v.n = ri(3, 10); v.D = v.u * (v.q - v.p) * v.n; return v.D <= 99; }, ord: () => [['u', 'p', 'q'], ['D']], w: () => [['W3'], ['W6'], []], hand: () => null, err: () => [], forb: () => [] });
def('kb:B3', 'kb', 'B3', { q: 'Q1', vis: 2, sample: kbSample, ord: () => [['p', 'r'], ['q', 's']], w: kbW(true, ['W3']), hand: v => F('a+b', [v.r, v.s]), err: v => [['M6', F('a+b', [v.p, v.q])]], forb: v => [F('a-b', [v.q, v.p])] });
def('kb:B6', 'kb', 'B6', { q: 'Q7', sample: kbSample, ord: () => [['p', 'r'], ['q', 's']], w: () => [['W3'], ['W3'], []], hand: v => F('a+b', [v.r, v.s]), err: v => [['M6', F('a+b', [v.p, v.q])]], forb: v => [F('a-b', [v.q, v.p])] });
// ws
const wsSample = (lo, hi, dhi) => v => { v.y = ri(lo, hi); v.D = ri(2, dhi); v.S = 2 * v.y + v.D; return v.S <= 99; };
const wsDef = (id, sc, q, w, sample, ord) => def(id, 'ws', sc, { q, f3: true, sample: sample || wsSample(3, 40, 20), ord: ord || (() => [['S'], ['D']]), w: () => w, hand: v => F('a-b', [v.S, v.D]), err: v => [['M9', F('a/b', [v.S, 2])]], forb: v => [F('a+b', [v.S, v.D])] });
wsDef('ws:B1', 'B1', 'Q7', [['W5', 'W4'], ['W4', 'W6'], []], v => { const c = ri(2, 15), x = ri(1, 12); v.S = 2 * c + 4 * x; v.D = 4 * x - 2 * c; return v.S <= 99 && v.D >= 2; });
wsDef('ws:B2', 'B2', 'Q3', [['W3'], ['W6'], []], wsSample(5, 40, 20));
wsDef('ws:B3', 'B3', 'Q2', [['W5'], ['W6'], []]);
wsDef('ws:B4', 'B4', 'Q4', [['W8', 'W9', 'W5'], ['W9', 'W6'], []], v => { v.y = ri(2, 10); const x = ri(3, 20); v.D = ri(2, 10); v.S = 2 * (x + v.y) + v.D; return v.S <= 99; }, () => [['y', 'S'], ['D']]);
wsDef('ws:B5', 'B5', 'Q6', [['W5'], ['W6'], []], wsSample(5, 40, 20));
wsDef('ws:B6', 'B6', 'Q1', [['W5'], ['W6'], []]);
wsDef('ws:B7', 'B7', 'Q3', [['W5'], ['W6'], []]);
// sk
const skA = (xlo, xhi, ylo, yhi) => v => { v.x = ri(xlo, xhi); v.y = ri(ylo, yhi); v.c = ri(3, 5); v.T1 = 2 * v.x + v.y; v.T2 = 2 * v.x + v.c * v.y; return v.T2 <= 99; };
const skB = (xlo, xhi, ylo, yhi) => v => { v.x = ri(xlo, xhi); v.y = ri(ylo, yhi); v.T1 = v.x + v.y; v.T2 = v.x + 3 * v.y; return v.T2 <= 99 && v.T1 !== 3; };
const skDef = (id, sc, q, sample, ord, w) => def(id, 'sk', sc, { q, sample, ord, w: () => w, hand: v => F('a-b', [v.T2, v.T1]), err: v => [['M10', F('a+b', [v.T2, v.T1])]], forb: () => [] });
skDef('sk:B2a', 'B2', 'Q3', skA(5, 30, 3, 15), () => [['#2', 'T1'], ['#2', 'c', 'T2']], [['W12'], ['W12'], []]);
skDef('sk:B2b', 'B2', 'Q3', skB(5, 40, 3, 20), () => [['T1'], ['#3', 'T2']], [['W3'], ['W12'], []]);
skDef('sk:B3', 'B3', 'Q2', skB(3, 40, 2, 20), () => [['T1'], ['#3', 'T2']], [['W3'], ['W12'], []]);
skDef('sk:B5', 'B5', 'Q6', skA(3, 20, 2, 15), () => [['#2', 'T1'], ['#2', 'c', 'T2']], [[], [], []]);
// bp: vi 0 = 多い (高い), vi 1 = 少ない (安い). The constant form always outside B4.
const bpSample = v => { v.y = ri(2, 20); v.k = ri(2, 5); v.c = ri(2, 9); const big = v.k * v.y + (v.vi === 0 ? v.c : -v.c); if (big <= v.y) return false; v.S = v.y + big; return v.S <= 99; };
const bpHand = v => (v.vi === 0 ? F('(a-c)/(b+1)', [v.S, v.k, v.c]) : F('(a+c)/(b+1)', [v.S, v.k, v.c]));
const bpErr = v => [['M9', F('a/(b+1)', [v.S, v.k])], ['M8', v.vi === 0 ? F('(a-c)/b', [v.S, v.k, v.c]) : F('(a+c)/b', [v.S, v.k, v.c])]];
const bpDef = (id, sc, q, w1) => def(id, 'bp', sc, { q, f3: true, vis: 2, sample: bpSample, ord: () => [['S'], ['k', 'c']], w: () => [w1, ['W7', 'W6'], []], hand: bpHand, err: bpErr, forb: () => [] });
bpDef('bp:B1', 'B1', 'Q7', ['W5']);
bpDef('bp:B2', 'B2', 'Q3', ['W3']);
bpDef('bp:B3', 'B3', 'Q2', ['W5']);
bpDef('bp:B7', 'B7', 'Q3', ['W5']);
def('bp:B4', 'bp', 'B4', { q: 'Q4', sample: v => { v.y = ri(2, 15); const x = ri(3, 15); v.k = ri(2, 5); v.S = x * (v.k + 1); return v.S <= 99 && v.k * x <= 80; }, ord: () => [['y', 'S'], ['k']], w: () => [['W8', 'W9', 'W5'], ['W7'], []], hand: v => F('a/(b+1)', [v.S, v.k]), err: v => [['M8', F('a/b', [v.S, v.k])]], forb: () => [] });
// hk: vi 0 = 平均 (Lv1 and 2 only), vi 1 = ならす
const hkSmall = (lo, hi) => v => { v.a = ri(lo, hi); v.c = v.a + pm() * ri(1, 6); return 4 * v.a - 3 * v.c >= 2; };
def('hk:B2', 'hk', 'B2', { q: 'Q3', vis: 2, sample: hkSmall(10, 40), ord: () => [['#4', 'a'], ['#3', 'c']], w: vi => [vi === 0 ? ['W10'] : [], [], []], hand: v => F('a*b', [v.a, 4]), err: v => [['M6', F('a*b', [v.c, 4])]], forb: () => [] });
def('hk:B3', 'hk', 'B3', { q: 'Q2', vis: 2, sample: hkSmall(5, 30), ord: () => [['#4', 'a'], ['#3', 'c']], w: vi => [vi === 0 ? ['W10'] : ['W3'], [], []], hand: v => F('a*b', [v.a, 4]), err: v => [['M6', F('a*b', [v.c, 4])]], forb: () => [] });
def('hk:B4', 'hk', 'B4', { q: 'Q4', vis: 2, sample: v => { v.n = ri(3, 6); v.a = ri(10, 30); v.b = ri(25, 45); return v.n * v.a - 2 * v.b >= v.n - 2; }, ord: () => [['n', 'a'], ['b']], w: vi => [vi === 0 ? ['W9', 'W10'] : ['W9'], ['W9'], []], hand: v => F('a*b', [v.a, v.n]), err: v => [['M6', F('a*b', [v.b, v.n])]], forb: () => [] });
def('hk:B5', 'hk', 'B5', { q: 'Q6', vis: 2, sample: v => { v.n = ri(3, 6); v.a = ri(50, 90); v.b = v.a + pm() * ri(1, 8); const nx = v.b * (v.n + 1) - v.a * v.n; return v.b <= 99 && nx >= 0 && nx <= 100; }, ord: () => [['n', 'a'], ['b']], w: vi => [vi === 0 ? ['W10'] : [], [], []], hand: v => F('a*b', [v.a, v.n]), err: v => [['M6', F('a*b', [v.b, v.n])]], forb: v => [F('a*b', [v.b, v.n + 1])] });
// nr
def('nr:B4a', 'nr', 'B4', { q: 'Q4', f3: true, sample: v => { v.B = ri(2, 20); v.k = ri(2, 5); v.t = ri(2, 20); v.A = v.k * (v.B + v.t) - v.t; return v.A <= 80 && v.A - v.B >= 20; }, ord: () => [['A', 'B'], ['k']], w: () => [['W9'], ['W9', 'W7'], []], hand: v => F('a-b', [v.A, v.B]), err: v => [['M7', F('a/b', [v.A, v.k])]], forb: () => [] });
def('nr:B4b', 'nr', 'B4', { q: 'Q4', f2: false, sample: v => { v.k = ri(2, 5); const m = ri(5, 20); v.D = m * (v.k - 1); v.y = ri(2, m - 2); return v.D >= 20 && v.D <= 60; }, ord: () => [['D'], ['y', 'k']], w: () => [['W6', 'W9'], ['W8', 'W9', 'W7'], []], hand: () => null, err: () => [], forb: () => [] });
// br. w-form: vi 0 = わたす (0.8), vi 1 = あげる. fm 'sum' (和) or 'both' (両方, br:B3w only).
// d-form (br:B3d): vi 0 = ふえる (0.7), vi 1 = もらう.
const brwSample = v => { v.k = ri(2, 4); const z = ri(3, 20); v.S = z * (v.k + 1); v.m = ri(2, z - 2); if (v.m < 2) return false; v.B = z - v.m; v.A = v.k * z + v.m; return v.S <= 99 && v.A <= 99; };
const brwDef = (id, sc, qSum) => def(id, 'br', sc, { q: qSum, f3: true, vis: 2, form: true, sample: brwSample,
  ord: v => (v.fm === 'both' ? [['A', 'B'], ['k']] : [['S'], ['m', 'k']]),
  w: (vi, v) => { const ag = vi === 1 ? ['W11'] : []; return v.fm === 'both' ? [[], ['W7', ...ag], ag] : [['W5'], ['W7', ...ag], []]; },
  qOf: v => (v.fm === 'both' ? 'Q2' : qSum),
  hand: v => (v.fm === 'both' ? F('(a+b)/(c+1)', [v.A, v.B, v.k]) : F('a/(b+1)', [v.S, v.k])),
  err: v => (v.fm === 'both' ? [['M8', F('(a+b)/c', [v.A, v.B, v.k])], ['M16', F('a-b', [v.A, v.B])], ['M7', F('a/b', [v.A, v.k])]] : [['M7', F('(a-c)/(b+1)', [v.S, v.k, v.m])]]), forb: () => [] });
brwDef('br:B3w', 'B3', 'Q8');
brwDef('br:B7w', 'B7', 'Q3');
const brdSample = v => { v.k = ri(2, 4); v.B = ri(2, 30); v.e = ri(2, 15); v.A = v.k * (v.B + v.e) - v.e; return v.A <= 99 && v.A > v.B; };
def('br:B3d', 'br', 'B3', { q: 'Q2', vis: 2, sample: brdSample, ord: () => [['A', 'B'], ['k']], w: vi => [[], ['W3', 'W7', ...(vi === 1 ? ['W11'] : [])], ['W3', ...(vi === 1 ? ['W11'] : [])]], hand: v => F('a-b', [v.A, v.B]), err: v => [['M16', F('(a+b)/(c+1)', [v.A, v.B, v.k])], ['M7', F('a/b', [v.A, v.k])]], forb: () => [] });
def('br:B7d', 'br', 'B7', { q: 'Q3', sample: brdSample, ord: () => [['A', 'B'], ['k']], w: () => [[], ['W3', 'W7'], []], hand: v => F('a-b', [v.A, v.B]), err: v => [['M16', F('(a+b)/(c+1)', [v.A, v.B, v.k])], ['M7', F('a/b', [v.A, v.k])]], forb: () => [] });
const SKEL = Object.values(SK).map(s => ({ id: s.id, t: s.t, sc: s.sc }));

// 4.3 規則 4: variant index and form, by Lv and pair status
function chooseVariant(sk, lv, force) {
  if (force.vi !== undefined) return force.vi;
  if (sk.t === 'kb') return sk.vis ? (rnd() < 0.5 ? 0 : 1) : 1;
  if (sk.t === 'hk') return lv <= 2 && rnd() < 0.4 ? 0 : 1;
  if (sk.t === 'bp') return sk.vis ? (rnd() < 0.5 ? 0 : 1) : 0;
  if (sk.id === 'br:B3d') return rnd() < 0.7 ? 0 : 1;
  if (sk.form) return rnd() < 0.8 ? 0 : 1;
  return 0;
}
// distinct shown values, all at least 2 (9.2 の解の条件)
function shownOK(sk, v) { const vals = sk.ord(v).flat().map(k => (k[0] === '#' ? +k.slice(1) : v[k])); return vals.every(x => Number.isInteger(x) && x >= 2 && x <= 99) && new Set(vals).size === vals.length - (sk.t === 'sk' && sk.ord(v)[0][0] === '#2' ? 1 : 0); }

// Instantiate a skeleton. force: { vi, fm, vals }
function inst(skid, lv = 5, force = {}) {
  const sk = SK[skid];
  let v = null;
  for (let g = 0; g < 500; g++) {
    const c = { vi: chooseVariant(sk, lv, force) };
    c.fm = sk.form ? (force.fm || (sk.id === 'br:B3w' ? (rnd() < 0.5 ? 'sum' : 'both') : 'sum')) : null;
    if (force.vals) { Object.assign(c, force.vals); if (force.check && !force.check(c)) return null; if (!shownOK(sk, c)) return null; v = c; break; }
    if (sk.sample(c) && shownOK(sk, c)) { v = c; break; }
  }
  if (!v) return null;
  const ord = sk.ord(v);
  const seq = ord.flat().map(k => (k[0] === '#' ? +k.slice(1) : v[k]));
  const nums = [...new Set(seq)];
  const ws = sk.w(v.vi, v);
  const p = { t: sk.t, sc: sk.sc, sk: skid, v, vi: v.vi, fm: v.fm, form: sk.t === 'br' ? (skid.endsWith('w') ? 'w' : 'd') : null,
    words: [], qwords: ws[2].map(w => ({ w, s: 2, o: 2.5, role: 'q' })), sent: ord.map(o => o.map(k => (k[0] === '#' ? +k.slice(1) : v[k]))),
    seq, nums, correct: sk.hand(v), errs: sk.err(v), forbF: sk.forb(v), q: sk.qOf ? sk.qOf(v) : sk.q, tok: sigTok(sk, v) };
  if (skid === 'nr:B4a') p.q = rnd() < 1 / 3 ? 'Q5' : 'Q4';
  ws[0].forEach((w, i) => p.words.push({ w, s: 0, o: 0.1 + 0.2 * i, role: 'main' }));
  ws[1].forEach((w, i) => p.words.push({ w, s: 1, o: 1.1 + 0.2 * i, role: 'main' }));
  return p;
}
// signature tokens for the signature reader (検証 37)
function sigTok(sk, v) {
  const t = sk.t;
  if (t === 'tk') return new Set(['unit2', 'cnt', 'amt']);
  if (t === 'kb') return new Set(sk.id === 'kb:B2s' ? ['dist2', 'tdiff'] : ['dist2', 'resid']);
  if (t === 'ws') return new Set(sk.sc === 'B4' ? ['sum', 'diff', 'age'] : ['sum', 'diff']);
  if (t === 'sk') return new Set(['combo2']);
  if (t === 'bp') return new Set(sk.sc === 'B4' ? ['sum', 'ratioSame', 'age'] : ['sum', 'ratioSame']);
  if (t === 'hk') return new Set(sk.sc === 'B4' ? ['avg', 'count', 'age'] : ['avg', 'count']);
  if (t === 'nr') return new Set(sk.id === 'nr:B4a' ? ['age', 'inc', 'ratioOther', 'both'] : ['age', 'inc', 'ratioOther', 'diff']);
  if (sk.id.endsWith('w')) return new Set(v.fm === 'both' ? ['xfer', 'ratioOther', 'both'] : ['xfer', 'ratioOther', 'sum']);
  return new Set(['both', 'inc', 'ratioOther']);
}

// 4.3 規則 1: one deco word, drawn uniformly from the words of the scene pool that the type can carry and
// that are not already in the text. Number-bearing words add one shown number (規則 3).
function decoCands(p, onlyNum, noNum) {
  const pool = DECO[p.sc]; const have = new Set(p.words.map(x => x.w));
  return Object.keys(pool).filter(w => pool[w].includes(p.t) && !have.has(w) && (!onlyNum || NUMW.includes(w)) && (!noNum || !NUMW.includes(w)));
}
function addDeco(p, w) {
  const s = rnd() < 0.5 ? 0 : 1;
  p.words.push({ w, s, o: s + 0.05 + 0.9 * rnd(), role: 'deco' });
  p.deco = w;
  if (NUMW.includes(w)) { let x; do { x = ri(2, 99); } while (p.nums.includes(x)); const at = ri(0, p.seq.length); p.seq.splice(at, 0, x); p.nums = [...new Set(p.seq)]; p.sent[s].push(x); }
  return w;
}
function attachDeco(p, prob = 0.7, opt = {}) {
  const c = decoCands(p, false, opt.noNum); if (!c.length || rnd() >= prob) return null;
  return addDeco(p, pick(c));
}
// 4.3 規則 9 (F1): 3 or 4 numbers. When the problem has fewer than 3, its one deco word is a number-bearing one.
function fitCount(p) {
  if (p.nums.length >= 3) return p.nums.length <= 4;
  if (p.deco && NUMW.includes(p.deco)) return p.nums.length >= 3;
  if (p.deco) { p.words = p.words.filter(x => x.role !== 'deco'); p.deco = null; }
  const c = decoCands(p, true); if (!c.length) return false;
  addDeco(p, pick(c));
  return p.nums.length >= 3 && p.nums.length <= 4;
}
function wordsInOrder(p) { return p.words.slice().sort((a, b) => a.o - b.o); }
function tableWordSet(p) { return [...new Set(p.words.map(x => x.w))].sort(); }
function showQuestion(p) { p.words = p.words.concat(p.qwords); p.qshown = true; }

function sceneAllowed(lv, t, sc) {
  if (lv === 3 && (sc === 'B4' || sc === 'B7')) return false;
  if (lv === 4 && ['B1', 'B5', 'B6'].includes(sc)) return false;
  return true;
}

// ---------- options ----------
function excluded(p, x) { return p.t === 'nr' && x === 'br'; }
function buildF1OptionsS(p, S) { const sh = shuffle(S.slice()); p.opts = sh; p.ans = sh.indexOf(p.t); }
// 4.9: option error types (F1). Priority M1 > M2 > M4 > M5 > M12, then injective: a repeated type keeps the
// option whose kin pair comes first in the 3.1 table, the others become M12.
function labelF1(p, prevT) {
  const tw = new Map(); for (const x of p.words) if (TABLE[x.w] && !tw.has(TABLE[x.w])) tw.set(TABLE[x.w], x.w);
  const kinIdx = x => KIN.findIndex(q => (q[0] === p.t && q[1] === x) || (q[1] === p.t && q[0] === x));
  const kinOK = x => isKin(p.t, x) && !(p.form === 'd' && ((p.t === 'br' && x === 'nr')));
  const lab = p.opts.map(x => { if (x === p.t) return null; if (tw.has(x)) return 'M1:' + tw.get(x); if (SCENE_TYPICAL[p.sc] === x) return 'M2'; if (kinOK(x)) return 'M4'; if (prevT && x === prevT) return 'M5'; return 'M12'; });
  const seen = new Map();
  p.opts.map((x, i) => [x, i]).filter(([x, i]) => lab[i] === 'M4').sort((a, b) => kinIdx(a[0]) - kinIdx(b[0])).forEach(([x, i]) => { if (seen.has('M4')) lab[i] = 'M12'; else seen.set('M4', i); });
  ['M2', 'M5'].forEach(m => { let first = true; lab.forEach((l, i) => { if (l === m) { if (!first) lab[i] = 'M12'; first = false; } }); });
  p.optLab = lab;
}
const TSHAPE = { tk: 'a*b', kb: 'a+b', ws: 'a-b', sk: 'a-b', bp: 'a/b', hk: 'a*b', nr: 'a-b', brw: 'a/b', brd: 'a-b' };
const tkey = p => (p.t === 'br' ? 'br' + p.form : p.t);
const OPS = ['a+b', 'a-b', 'a*b', 'a/b'];
function toBin(f) {
  const v = f.v, sh = f.sh;
  if (sh === 'a/(b+1)') return ['a/b', [v[0], v[1] + 1]];
  if (sh === '(a-c)/(b+1)') return ['a/b', [v[0] - v[2], v[1] + 1]];
  if (sh === '(a+c)/(b+1)') return ['a/b', [v[0] + v[2], v[1] + 1]];
  if (sh === '(a+b)/(c+1)') return ['a/b', [v[0] + v[1], v[2] + 1]];
  if (sh === '(a-c)/b') return ['a/b', [v[0] - v[2], v[1]]];
  if (sh === '(a+c)/b') return ['a/b', [v[0] + v[2], v[1]]];
  if (sh === '(a+b)/c') return ['a/b', [v[0] + v[1], v[2]]];
  if (OPS.includes(sh)) return [sh, v.slice(0, 2)];
  return null;
}
const ordF = (sh, pr) => { let [a, b] = pr; if ((sh === 'a-b' || sh === 'a/b') && a < b) [a, b] = [b, a]; return F(sh, [a, b]); };
// 4.5 の 3: the look of an option. 式の形 = outer operation; flags = has the largest text number, uses only the
// first two text numbers, has the first text number, uses only text numbers.
function look(p, f) {
  const mx = Math.max(...p.nums); const f2 = new Set(p.dseq.filter((x, i, a) => a.indexOf(x) === i).slice(0, 2)); const vs = f.v;
  return f.sh + '|' + (vs.includes(mx) ? 'M' : '') + (vs.every(x => f2.has(x)) ? 'F' : '') + (vs.includes(p.dseq[0]) ? '1' : '') + (vs.every(x => p.nums.includes(x)) ? 'T' : 'D');
}
// F2 options (4.5 の 3, C5). p.dseq is the display order of the numbers (sentence swap, 規則 12).
function buildF2Options(p) {
  if (!p.correct) return false;
  if (!p.dseq) p.dseq = p.seq.slice();
  const c = toBin(p.correct); if (!c) return false;
  const [opc, pc] = c;
  const forb = new Set(p.forbF.map(f => { const b = toBin(f); return ordF(b[0], b[1]).str; }));
  const alts = []; const opAlts = [];
  for (const [lab, f] of p.errs) { const b = toBin(f); if (!b) continue; if (b[1][0] === pc[0] && b[1][1] === pc[1]) { if (b[0] !== opc) opAlts.push([b[0], lab]); } else alts.push([b[1], lab]); }
  const inText = x => p.nums.includes(x);
  const sub = x => (inText(x) ? p.nums.filter(y => y !== x && !pc.includes(y)) : (p.nums.includes(x - 1) ? p.nums.filter(y => y <= 9 && y !== x - 1).map(y => y + 1).filter(y => !inText(y) && !pc.includes(y)) : []));
  for (const i of [0, 1]) for (const y of sub(pc[i])) { const q = pc.slice(); q[i] = y; alts.push([q, 'M6']); }
  const cl = look(p, ordF(opc, pc)).split('|')[1];
  const same = alts.filter(a => look(p, ordF(opc, a[0])).split('|')[1] === cl);
  if (!same.length) {
    // 1 x 4: the correct cell, one or two other operations on P, and one or two fillers (0.5 each)
    const cells = [{ f: ordF(opc, pc), m: null }];
    const wrong = shuffle(OPS.filter(x => x !== opc && !forb.has(ordF(x, pc).str)));
    const nFill = rnd() < 0.5 ? 2 : 1;
    for (const op of wrong.slice(0, Math.min(wrong.length, 3 - nFill))) cells.push({ f: ordF(op, pc), m: (p.t === 'sk' && op === 'a+b') ? 'M10' : 'M11' });
    const inTextPr = pr => pr.every(v => p.nums.includes(v));
    const fill = alts.slice(); fill.push([[pc[0], 2], p.t === 'ws' ? 'M9' : 'M6']);
    for (const y of p.nums.filter(y => y <= 9 && !pc.includes(y + 1))) fill.push([[pc[0], y + 1], 'M6']);
    if (!pc.every(v => p.nums.includes(v)) && p.nums.includes(pc[1] - 1)) fill.push([[pc[0], pc[1] - 1], 'M8']);
    const wantD = rnd() < 0.5;
    let pool = fill.filter(a => inTextPr(a[0]) !== wantD); if (!pool.length) pool = fill;
    for (const [pr, lab] of shuffle(pool.concat(fill))) {
      if (cells.length >= 4) break;
      const op = rnd() < 0.5 ? opc : pick(OPS);
      const f = ordF(op, pr); if (forb.has(f.str) || cells.some(x => x.f.str === f.str)) continue;
      cells.push({ f, m: op === opc ? lab : 'M11' });
    }
    if (cells.length < 4) return false;
    p.gridKind = '1x4';
    const sh = shuffle(cells.slice(0, 4)); p.opts = sh; p.ans = sh.findIndex(o => o.m === null); return true;
  }
  p.gridKind = '2x2';
  for (let g = 0; g < 40; g++) {
    const [po, plab] = pick(same);
    let opo, olab = 'M11';
    if (opAlts.length && rnd() < 0.5) { [opo, olab] = pick(opAlts); } else { opo = pick(OPS.filter(x => x !== opc)); if (p.t === 'sk' && opo === 'a+b') olab = 'M10'; }
    const cells = [{ f: ordF(opc, pc), m: null }, { f: ordF(opc, po), m: plab }, { f: ordF(opo, pc), m: olab }, { f: ordF(opo, po), m: 'M11' }];
    if (new Set(cells.map(x => x.f.str)).size < 4) continue;
    if (cells.slice(1).some(x => forb.has(x.f.str))) continue;
    const sh = shuffle(cells.slice()); p.opts = sh; p.ans = sh.findIndex(o => o.m === null);
    return true;
  }
  return false;
}

module.exports = { setSeed, rnd, ri, pick, shuffle, TYPES, GA, GB, KIN, isKin, kinOf, TABLE, STRENGTH, SCENE_TYPES, SCENE_TYPICAL, DECO, NUMW, SK, SKEL, inst, attachDeco, addDeco, decoCands, fitCount, wordsInOrder, tableWordSet, showQuestion, sceneAllowed, buildF1OptionsS, labelF1, buildF2Options, look, TSHAPE, tkey, excluded, F, OPS };
