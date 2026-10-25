// Generator for kom_shiki_henkei (assemble format): the independent re-audit generator for v0.3,
// modified to the v0.3.1 and v0.3.2 rules (variant 'v031' in run3.js: common sum cap, common a and d bands,
// T_SF traps with a > b + c, P1 and P2 types drawn first and only numbers redrawn, no shared {b, c}
// between adjacent non-pair problems). Original header follows.
// Independent generator for kom_shiki_henkei v0.3 (assemble format),
// written only from docs/komorebi_shiki_henkei_curriculum.md v0.3 rule text.
// Ambiguities are tagged V3AMB-n and resolved in the adversary's favor where it matters.
'use strict';
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
const B = '□';
const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpick(rng, items, w) { let u = rng() * w.reduce((s, x) => s + x, 0); for (let i = 0; i < items.length; i++) { u -= w[i]; if (u < 0) return items[i]; } return items[items.length - 1]; }

// ---- judge (3.4) ----
// slots: array of tokens; numbers as strings, ops '+'/'-', '□' (story only)
function terms(slots) { const t = []; let sign = 1; for (const s of slots) { if (s === '+') sign = 1; else if (s === '-') sign = -1; else { t.push([Number(s), sign]); } } return t; }
function lrOK(slots) { let v = null, op = '+'; for (const s of slots) { if (s === '+' || s === '-') { op = s; continue; } const n = Number(s); v = v === null ? n : (op === '+' ? v + n : v - n); if (v < 0) return false; } return true; }
const key = ts => ts.map(([n, s]) => `${s > 0 ? '+' : '-'}${n}`).sort().join(',');
function judge(p, slots) {
  if (p.fam === 'story') return slots.join('') === p.answerSlots.join('');
  if (slots.some(s => s === undefined)) return false;
  // first term always +; terms multiset
  return key(terms(slots)) === key(p.answerTerms) && lrOK(slots);
}

// ---- 2-number ----
function twoNum(rng, type, orient, M) {
  for (;;) {
    const x = ri(rng, 2, M), y = ri(rng, 2, M);
    if (!(x < y && y - x >= 2 && y !== 2 * x && x + y <= M)) continue;
    let text, ans, nums;
    if (type === 'T_AF') { text = orient === 'normal' ? `${B}+${x}=${y}` : `${y}=${B}+${x}`; ans = [[y, 1], [x, -1]]; nums = [x, y]; }
    else if (type === 'T_SB') { text = orient === 'normal' ? `${y}-${B}=${x}` : `${x}=${y}-${B}`; ans = [[y, 1], [x, -1]]; nums = [y, x]; }
    else { const aBig = rng() < 0.5; const a = aBig ? y : x, d = aBig ? x : y; text = orient === 'normal' ? `${B}-${a}=${d}` : `${d}=${B}-${a}`; ans = [[a, 1], [d, 1]]; nums = [a, d]; }
    const pid = { T_AF: 'add_front', T_SB: 'sub_back', T_SF: 'sub_front' }[type] + (orient === 'reversed' ? '_rev' : '');
    return { fam: '2num', type, orient, patternId: pid, text, answerTerms: ans, nums, box: ans.reduce((s, [n, g]) => s + n * g, 0) };
  }
}
// ---- both sides (R always b+c) ----
const BPID = { T_AB: 'both_add_back', T_AF: 'both_add_front', T_SB: 'both_sub_back', T_SF: 'both_sub_front' };
let OPT = {};
function bothValid(type, a, b, c, sfBig) {
  if (a < 2 || b < 2 || c < 2 || a === b || b === c || a === c) return false;
  if (a > 100 || b > 100 || c > 100) return false;
  if (!(a > b && a > c)) return false;
  const R = b + c;
  if (OPT.sumcap && a + b + c > 100) return false; // fix variant: same size cap for every type
  if (OPT.near && (Math.abs(b + c - a) > 10 || a < 20 || a > 45 || a + b + c < 42 || a + b + c > 88)) return false; // v0.3.1: a band and |a - (b+c)| band common to all types
  if (type === 'T_SB' || (type === 'T_SF' && sfBig)) { if (!(a > R && a - R >= 2)) return false; }
  else if (!(R > a && R - a >= 2)) return false;
  const box = type === 'T_SB' ? a - R : type === 'T_SF' ? R + a : R - a;
  if (box < 2 || box > 100) return false;
  if (type === 'T_SF' && a + b + c > 100) return false;
  return true;
}
function bothProb(type, orient, a, b, c) {
  const side = { T_AB: `${a}+${B}`, T_AF: `${B}+${a}`, T_SB: `${a}-${B}`, T_SF: `${B}-${a}` }[type];
  const R = `${b}+${c}`;
  const ans = type === 'T_SB' ? [[a, 1], [b, -1], [c, -1]] : type === 'T_SF' ? [[b, 1], [c, 1], [a, 1]] : [[b, 1], [c, 1], [a, -1]];
  return { fam: 'both', type, orient, patternId: BPID[type] + (orient === 'reversed' ? '_rev' : ''), text: orient === 'normal' ? `${side}=${R}` : `${R}=${side}`, answerTerms: ans, nums: [a, b, c], abc: { a, b, c }, box: ans.reduce((s, [n, g]) => s + n * g, 0) };
}
function drawBoth(rng, type, orient, fixedBC, sfBigFixed) {
  const sfBig = sfBigFixed !== undefined ? sfBigFixed : (type === 'T_SF' && rng() < (OPT.sfp === undefined ? 0 : OPT.sfp)); // v0.3.1: T_SF with a > b+c (trap) with probability sfp
  if (fixedBC && OPT.near) { // b, c fixed: a is drawn uniformly from the values that satisfy 3.10 (none: null)
    const ok = [];
    for (let a = 20; a <= 45; a++) if (bothValid(type, a, fixedBC[0], fixedBC[1], sfBig)) ok.push(a);
    return ok.length ? bothProb(type, orient, ok[Math.floor(rng() * ok.length)], fixedBC[0], fixedBC[1]) : null;
  }
  for (let t = 0; t < 200000; t++) {
    let a, b, c;
    if (OPT.near) { // v0.3.1: a from 20..45, d = |a - (b+c)| from 2..10, the same for every type
      const bigA = type === 'T_SB' || sfBig;
      if (fixedBC) { b = fixedBC[0]; c = fixedBC[1]; a = ri(rng, 20, 45); }
      else { a = ri(rng, 20, 45); const d = ri(rng, 2, 10); const R = bigA ? a - d : a + d; b = ri(rng, 2, R - 2); c = R - b; }
    } else {
      a = OPT.acommon ? ri(rng, 20, 49) : ri(rng, 2, 100); // fix variant: same a distribution for every type
      b = fixedBC ? fixedBC[0] : ri(rng, 2, 100); c = fixedBC ? fixedBC[1] : ri(rng, 2, 100);
    }
    if (bothValid(type, a, b, c, sfBig)) return bothProb(type, orient, a, b, c);
  }
  return null;
}

const RATIO = {
  two: { 2: [1 / 3, 1 / 3, 1 / 3], 3: [0.26, 0.42, 0.32], 4: [0.26, 0.42, 0.32] },
  both: [0.03, 0.26, 0.43, 0.28],
};
const TWO_T = ['T_AF', 'T_SB', 'T_SF'], BOTH_T = ['T_AB', 'T_AF', 'T_SB', 'T_SF'];
function revProb(lv, fam) {
  if (lv <= 3 || lv === 5) return 0;
  if (lv === 4) return fam === '2num' ? 0.5 : 0;
  if (lv === 6) return 1;
  return 0.5;
}
function oneProblem(rng, lv, opt) {
  const fam = lv === 2 ? '2num' : lv <= 4 ? (rng() < 0.6 ? '2num' : 'both') : 'both';
  const orient = rng() < revProb(lv, fam) ? 'reversed' : 'normal';
  if (fam === '2num') return twoNum(rng, wpick(rng, TWO_T, RATIO.two[lv]), orient, lv === 2 ? 20 : 100);
  return drawBoth(rng, wpick(rng, BOTH_T, opt.bothRatio || RATIO.both), orient);
}
// P1 (3.6, v0.3.2): types, traps and orientations of both items are drawn first (4.2 ratios);
// only numbers are redrawn: the first item's numbers, then a for the second item with the same b, c.
function pairP1(rng, lv, opt) {
  const ratio = opt.bothRatio || RATIO.both;
  const t1 = wpick(rng, BOTH_T, ratio), t2 = wpick(rng, BOTH_T, ratio);
  const sp = OPT.sfp === undefined ? 0 : OPT.sfp;
  const big1 = t1 === 'T_SF' && rng() < sp, big2 = t2 === 'T_SF' && rng() < sp;
  const o1 = rng() < revProb(lv, 'both') ? 'reversed' : 'normal', o2 = rng() < revProb(lv, 'both') ? 'reversed' : 'normal';
  for (;;) {
    const p1 = drawBoth(rng, t1, o1, null, big1);
    if (!p1) continue;
    const { b, c } = p1.abc;
    const p2 = drawBoth(rng, t2, o2, [b, c], big2);
    if (!p2 || p2.text === p1.text) continue;
    p1.pairType = p2.pairType = 'P1'; p1.pairId = p2.pairId = 1;
    return [p1, p2];
  }
}

// ---- story (Lv10) ----
const CTX = {
  candy: ['あめ', 'こ', 'もらって', 'たべて', 'ありました'], stickers: ['シール', 'まい', 'もらって', 'あげて', 'ありました'],
  flowers: ['はな', '本', 'さいて', 'かれて', 'ありました'], books: ['ほん', 'さつ', 'かって', 'あげて', 'ありました'],
  cars: ['くるま', '台', 'きて', 'でていって', 'とまって いました'],
};
function storyProb(role, dir, K1, K2, ctx) {
  const [mono, unit, vi, vd, ari] = CTX[ctx]; const v = dir === 'inc' ? vi : vd; const op = dir === 'inc' ? '+' : '-';
  let t, box, ans;
  if (role === 'start') { t = [B, K1, K2]; box = dir === 'inc' ? K2 - K1 : K2 + K1; ans = [B, op, String(K1), '=', String(K2)]; }
  else if (role === 'change') { t = [K1, B, K2]; box = dir === 'inc' ? K2 - K1 : K1 - K2; ans = [String(K1), op, B, '=', String(K2)]; }
  else { t = [K1, K2, B]; box = dir === 'inc' ? K1 + K2 : K1 - K2; ans = [String(K1), op, String(K2), '=', B]; }
  const text = `${mono}が ${t[0]} ${unit} ${ari}。${t[1]} ${unit} ${v}、${t[2]} ${unit}に なりました。`;
  const ok = box >= 2 && box <= 30 && K1 >= 2 && K2 >= 2 && K1 <= 30 && K2 <= 30 && Math.abs(K1 - K2) >= 2 && K1 !== 2 * K2 && K2 !== 2 * K1;
  return ok ? { fam: 'story', role, dir, ctx, text, box, K: [K1, K2], answerSlots: ans, patternId: `story_${dir}_${role}` } : null;
}
function drawStory(rng, role, dir, ctx) { for (;;) { const p = storyProb(role, dir, ri(rng, 2, 30), ri(rng, 2, 30), ctx); if (p) return p; } }
// P2 (3.6, v0.3.2): role, direction and context of both items are drawn first; only the two
// visible numbers are redrawn until both items satisfy 3.10. Item 2 keeps the story order of the two
// numbers when it can hold, and uses them in the other order otherwise.
function pairP2(rng) {
  const role = pick(rng, ['start', 'change', 'result']), dir = rng() < 0.5 ? 'inc' : 'dec', ctx = pick(rng, Object.keys(CTX));
  let role2 = role, dir2 = dir;
  if (rng() < 0.5) dir2 = dir === 'inc' ? 'dec' : 'inc'; else role2 = pick(rng, ['start', 'change', 'result'].filter(r => r !== role));
  for (;;) {
    const K1 = ri(rng, 2, 30), K2 = ri(rng, 2, 30);
    const p1 = storyProb(role, dir, K1, K2, ctx);
    if (!p1) continue;
    // keep the story order of the two numbers; swap them only when that order cannot hold for item 2
    const p2 = storyProb(role2, dir2, K1, K2, ctx) || storyProb(role2, dir2, K2, K1, ctx);
    if (!p2) continue;
    p1.pairType = p2.pairType = 'P2'; p1.pairId = p2.pairId = 1;
    return [p1, p2];
  }
}

// ---- Lv1 ----
function lv1Problem(rng) {
  const add = rng() < 0.5, left = rng() < 0.5;
  for (;;) {
    const a = ri(rng, 11, 89); const b = rng() < 8 / 87 ? ri(rng, 2, 9) : ri(rng, 11, 89);
    const ad = [Math.floor(a / 10), a % 10], bd = [Math.floor(b / 10), b % 10];
    if (add && !(ad[0] + bd[0] <= 9 && ad[1] + bd[1] <= 9)) continue;
    if (!add && !(ad[0] >= bd[0] && ad[1] >= bd[1])) continue;
    const ans = add ? a + b : a - b; if (ans < 2 || ans > 99) continue;
    const e = `${a}${add ? '+' : '-'}${b}`;
    return { fam: 'intro', text: left ? `${e}=${B}` : `${B}=${e}`, nums: [a, b], ans };
  }
}

function finish(rng, p) {
  if (p.fam === 'intro') return p;
  const cards = p.fam === 'story' ? [String(p.K[0]), String(p.K[1]), B] : p.nums.map(String);
  p.numberCards = shuffle(rng, cards); // 3.3 rule 2
  return p;
}
function buildSet(lv, rng, opt = {}) {
  OPT = opt;
  for (;;) {
    let seq;
    if (lv === 1) seq = Array.from({ length: 5 }, () => lv1Problem(rng));
    else if (lv === 10) {
      const pr = pairP2(rng); const pos = ri(rng, 0, 3);
      const rest = Array.from({ length: 3 }, () => drawStory(rng, pick(rng, ['start', 'change', 'result']), rng() < 0.5 ? 'inc' : 'dec', pick(rng, Object.keys(CTX))));
      seq = rest.slice(0, pos).concat(pr, rest.slice(pos));
    } else if (lv === 8 || lv === 9) {
      const pr = pairP1(rng, lv, opt); const pos = ri(rng, 0, 3);
      const rest = Array.from({ length: 3 }, () => oneProblem(rng, lv, opt));
      seq = rest.slice(0, pos).concat(pr, rest.slice(pos));
    } else seq = Array.from({ length: 5 }, () => oneProblem(rng, lv, opt));
    if (new Set(seq.map(p => p.text)).size !== 5) continue; // 4.2 / check 9
    // 4.2 (v0.3.2): two adjacent both-sides problems share the set {b, c} only when they are the P1 pair
    let clash = false;
    for (let k = 1; k < seq.length; k++) {
      const u = seq[k - 1], v = seq[k];
      if (u.fam === 'both' && v.fam === 'both' && !(u.pairId && v.pairId) && [u.abc.b, u.abc.c].sort().join() === [v.abc.b, v.abc.c].sort().join()) clash = true;
    }
    if (clash) continue;
    return seq.map(p => finish(rng, p));
  }
}
module.exports = { buildSet, judge, mulberry32, B, terms };
