#!/usr/bin/env node
// Audit simulator for kom_bamen_yomitori (docs/komorebi_bamen_yomitori_curriculum.md, v0.5.1).
// Generator written from the rule text (chapters 3, 4, 6, 8, 9); it started as the third-round
// audit generator (v0.3) and carries the v0.4 X1 to X3 and the v0.5.1 rules (11.6 章).
// Solvers see only: text, question, options, answerKind, and per-item feedback.
//
// Usage:
//   SEED=1000 node audit_sim.js 400 --stage   # stage A and stage B (T2_slot) per Lv, then the STATS line
//   SEED=1000 node audit_sim.js 400 --json    # per-Lv layers and per-pattern solver values
// Set LEGACY_V04=1 to drop the family names, the frame-word mix and the independent polarity
// (the pre-v0.5 generator). The v0.5.1 rules are the default.
'use strict';

// ---------- rng ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = mulberry32(12345);
const rnd = () => R();
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const coin = (p = 0.5) => rnd() < p;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- pools ----------
const NAMES = [
  ['たろう', 'くん'], ['じろう', 'くん'], ['けんた', 'くん'], ['ゆうと', 'くん'], ['そうた', 'くん'], ['こうき', 'くん'],
  ['はなこ', 'さん'], ['さくら', 'さん'], ['みお', 'さん'], ['めい', 'さん'], ['あおい', 'さん'], ['りこ', 'さん']];
// v0.5 family rule (FAMILY=1): 4 fixed family names; the rest from the pool (current pool minus ゆうと).
const LEGACY = !!process.env.LEGACY_V04;
const FAMILY_ON = !LEGACY; // 3.6 章: 4 family names, at least one per item
const FAMILY = [['さいと', 'くん'], ['ゆうと', 'くん'], ['しょうた', 'くん'], ['ゆきこ', 'さん']];
const POOL = NAMES.filter(n => n[0] !== 'ゆうと');
const FAM_SET = new Set(FAMILY.map(n => n[0]));
// family kinship: [Y, X, word] means "Y の word の X"
const KIN = [['ゆうと', 'さいと', 'おにいさん'], ['さいと', 'ゆうと', 'おとうと'], ['ゆうと', 'ゆきこ', 'おかあさん'], ['ゆうと', 'しょうた', 'おとうさん']];
const SIMILAR = [['たろう', 'じろう'], ['けんた', 'そうた'], ['はなこ', 'りこ'], ['めい', 'あおい']].concat(FAMILY_ON ? [['ゆうと', 'さいと']] : []); // v0.5.1: 5 pairs
const OBJS = [['あめ', 'こ'], ['どんぐり', 'こ'], ['おはじき', 'こ'], ['シール', 'まい'], ['カード', 'まい']];
const OTHER = [['ガム', 'こ'], ['ビーだま', 'こ'], ['えんぴつ', '本']];
const FULL = (FAMILY_ON ? FAMILY.concat(POOL) : NAMES).map(n => n[0] + n[1]).sort((a, b) => b.length - a.length);
const FC = {}; // wording-id counts, reset by callers per set
const STATS = { items: 0, famAppear: 0, appear: 0, famAns: 0, ans: 0, famAsked: 0, asked: 0, h10: 0, h10fam: 0, bindStmts: 0, twoName: 0, tSent3: 0, t6: 0 };

function drawPersons(k, lv) {
  for (;;) {
    let ps;
    if (FAMILY_ON) {
      const nf = Math.min(k, coin() ? 1 : 2);
      const fam = shuffle(FAMILY).slice(0, nf), pool = shuffle(POOL).slice(0, k - nf);
      ps = shuffle(fam.concat(pool)).map(n => ({ name: n[0], hon: n[1], full: n[0] + n[1], fam: FAM_SET.has(n[0]) }));
      const heads = ps.map(p => p.name[0]);
      const dupHead = heads.some((h, i) => heads.indexOf(h) !== i && !(['ゆうと', 'ゆきこ'].includes(ps[i].name) && ['ゆうと', 'ゆきこ'].includes(ps[heads.indexOf(h)].name)));
      if (dupHead) continue;
    } else ps = shuffle(NAMES).slice(0, k).map(n => ({ name: n[0], hon: n[1], full: n[0] + n[1] }));
    if (lv <= 6 && SIMILAR.some(([a, b]) => ps.some(p => p.name === a) && ps.some(p => p.name === b))) continue;
    return ps;
  }
}

// ---------- sentence renderers (token arrays) ----------
// ctx: {obj, u, verb, verbH, nom}
// v0.5.1: relation words are free for every name; gender words follow the owner's honorific
const REL_NEUTRAL = ['ともだち', 'せんぱい', 'こうはい'], REL_KUN = ['おにいさん', 'おとうと', 'おじいさん'], REL_SAN = ['おねえさん', 'いもうと', 'おばあさん'];
const INS = ['きょう', 'きのう', 'さっき', 'あさ'];
function relWord(X, Y) { return [pick(REL_NEUTRAL.concat(X.hon === 'さん' ? REL_SAN : REL_KUN)) + 'の']; }
function bindSent(form, X, Y, N, c) {
  const o = c.obj, u = c.u;
  switch (form) {
    case 'h1': return [[X.full + 'は', o + 'を', N + u, c.verb]];
    case 'h2': return [[X.full + 'の', o + 'は', N + u, 'です']];
    case 'h3': return [[o + 'を', N + u, c.nom + 'のは', X.full + 'です']];
    case 'h5': return [['きのう', 'わけて', 'もらった', o + 'を、' + X.full + 'は', N + u, c.verb]];
    case 'h6': return [[X.full + 'も', o + 'を', c.verb], [N + u, 'でした']];
    case 'h7': return [['もう', 'ひとりは', N + u, c.verb]];
    case 'h8': return [[X.full + 'は', pick(INS), Y.full + 'の', 'となりで', o + 'を', N + u, c.verbH]]; // v0.5.1: every h8 has a word between the names
    case 'h9': return [[Y.full + 'の', 'となりで、' + X.full + 'は', o + 'を', N + u, c.verbH]];
    case 'h10': return [[Y.full + 'の', ...relWord(X, Y), X.full + 'は', pick(INS), o + 'を', N + u, c.verbH]]; // v0.5.1: word after X は
  }
  throw new Error(form);
}
const PLAIN = ['h1', 'h2', 'h3', 'h5', 'h9'];

// choose binding forms for a list of owners (persons with values), per 4.4.4/4.4.5/4.4.7
function bindingPlan(owners, all, k) {
  const forms = owners.map(() => null);
  if (k === 2) {
    if (owners.length === 2 && coin(0.7)) { const f = shuffle(['h8', 'h10']); forms[0] = f[0]; forms[1] = f[1]; }
    else if (owners.length === 2) { const i = coin() ? 0 : 1; forms[i] = pick(['h8', 'h10']); } // v0.5.1: the other 30% still holds one two-name clause
    else if (owners.length === 1) forms[0] = pick(['h8', 'h10']); // v0.5.1: lone known statement is always a two-name clause
  } else {
    for (let i = 0; i < owners.length; i++) {
      const r = rnd();
      if (r < 0.7) forms[i] = coin() ? 'h8' : 'h10';
      else if (r < 0.8) forms[i] = (i === owners.length - 1 && owners.length === all.length) ? 'h7' : 'h6';
    }
  }
  for (let i = 0; i < owners.length; i++) if (!forms[i]) forms[i] = pick(PLAIN);
  // h7 only for the last person when all others are named before
  for (let i = 0; i < owners.length; i++) if (forms[i] === 'h7' && !(i === owners.length - 1 && owners.length === all.length)) forms[i] = 'h6';
  if (k === 2 && forms[1] === undefined) {}
  return forms;
}
function renderBindings(owners, vals, all, k, c) {
  const forms = bindingPlan(owners, all, k);
  const sents = [];
  owners.forEach((X, i) => {
    let Y = null;
    if (forms[i] === 'h8' || forms[i] === 'h9' || forms[i] === 'h10') Y = pick(all.filter(p => p !== X));
    FC[forms[i]] = (FC[forms[i]] || 0) + 1;
    STATS.bindStmts++; if (['h8', 'h10', 'h4'].includes(forms[i])) STATS.twoName++;
    if (forms[i] === 'h10') { STATS.h10++; if (X.fam && Y.fam) STATS.h10fam++; }
    sents.push(...bindSent(forms[i], X, Y, vals[i], c));
  });
  return { sents, forms };
}
function intro(ps) { const s = shuffle(ps); return [[s.slice(0, -1).map(p => p.full + 'と').join(' ').split(' ').concat([s[s.length - 1].full + 'が', 'います'])].flat()]; }

// ---------- item container ----------
function item(o) { return Object.assign({ modifiers: [] }, o); }
function numOptions(correct, distractors) {
  // distractors: [{v, t}]; drop invalid/colliding; keep 2..3
  const used = new Set([correct]); const out = [];
  for (const d of distractors) { if (d.v >= 1 && d.v <= 20 && !used.has(d.v)) { used.add(d.v); out.push(d); } }
  return out;
}
function finishChoice(it, correctLabel, wrongLabels) {
  const all = shuffle([correctLabel, ...wrongLabels]);
  it.options = all; it.ans = all.indexOf(correctLabel); return it;
}
const ctxHave = (o) => ({ obj: o[0], u: o[1], verb: 'もっています', verbH: 'ひろいました', nom: 'もっている' });
const ctxSplit = (o) => ({ obj: o[0], u: o[1], verb: 'もらいました', verbH: 'もらいました', nom: 'もらった' });
const ctxHold = (o) => ({ obj: o[0], u: o[1], verb: 'もっていました', verbH: 'ひろいました', nom: 'もっていた' });

// ---------- have ----------
function distinctVals(k, lo, hi) { for (;;) { const v = Array.from({ length: k }, () => ri(lo, hi)); if (new Set(v).size === k) return v; } }
function haveScene(k, lv) {
  const ps = drawPersons(k, lv), o = pick(OBJS), vals = distinctVals(k, 1, 15);
  const order = shuffle(ps.map((_, i) => i));
  const owners = order.map(i => ps[i]), ov = order.map(i => vals[i]);
  const { sents, forms } = renderBindings(owners, ov, ps, k, ctxHave(o));
  const pre = coin(0.6) ? intro(ps) : [];
  return { ps, o, vals, sents: pre.concat(sents), forms };
}
function genHaveNum(lv, k = 2) {
  for (;;) {
    const S = haveScene(k, lv); const ai = ri(0, k - 1); const P = S.ps[ai], v = S.vals[ai];
    const other = S.vals[(ai + 1) % k];
    const ds = numOptions(v, [{ v: other, t: 'W1' }, { v: v + other, t: 'W11' }, { v: Math.abs(v - other), t: 'W12' }]);
    if (ds.length < 3) continue;
    const it = item({ pattern: 'have_num', kind: 'number', k, sents: S.sents, q: [P.full + 'は', 'なんこ', 'もっていますか'], forms: S.forms });
    return finishChoice(it, String(v), ds.map(d => String(d.v)));
  }
}
function genHaveWho(lv, k = 2) {
  const S = haveScene(k, lv); const ai = ri(0, k - 1);
  const it = item({ pattern: 'have_who', kind: 'person', k, sents: S.sents, q: [S.vals[ai] + S.o[1], 'もっているのは', 'だれですか'], forms: S.forms });
  return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
}
function genHaveMost(lv, k, pol) {
  const S = haveScene(k, lv);
  const tgt = pol === 'up' ? Math.max(...S.vals) : Math.min(...S.vals); const ai = S.vals.indexOf(tgt);
  const it = item({ pattern: k === 2 ? 'have_more' : 'have_most', kind: 'person', k, polarity: pol, sents: S.sents, q: [pol === 'up' ? 'おおいのは' : 'すくないのは', 'だれですか'], forms: S.forms });
  return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
}

// ---------- split ----------
function splitScene(k, lv) {
  const ps = drawPersons(k, lv), o = pick(OBJS), c = ctxSplit(o);
  let T, vals;
  if (k === 2) { T = 2 * ri(3, 9); let a; do { a = ri(1, T - 1); } while (a === T / 2); vals = [a, T - a]; }
  else { for (;;) { T = k === 3 ? ri(6, 10) : ri(8, 12); const v = []; let rem = T; for (let i = 0; i < k - 1; i++) v.push(ri(1, 6)); const last = T - v.reduce((x, y) => x + y, 0); v.push(last); if (last >= 1 && new Set(v).size === k) { vals = v; break; } } }
  const unk = ri(0, k - 1); // index of person whose number is not given
  const knownIdx = shuffle(ps.map((_, i) => i).filter(i => i !== unk));
  // total sentence: s5 at >= 1/3
  // v0.5.1: s1b and s5b (the forms the appendix uses, U18) join the draw; s5 or s5b at 0.4 (4.4.6)
  const sform = coin(0.4) ? (coin() ? 's5' : 's5b') : pick(k === 2 ? ['s1', 's1b', 's2', 's3', 's4', 's6'] : ['s1', 's1b', 's2', 's3', 's4']);
  const lst = shuffle(ps);
  const listToks = (arr, last) => arr.map((p, i) => p.full + (i === arr.length - 1 ? last : 'と'));
  let totalS = [], knownS = [], forms = [];
  if (sform === 's6') {
    const X = ps[knownIdx[0]], Y = ps[unk];
    totalS = [[T + 'この', o[0] + 'が', 'ありました']];
    knownS = [[vals[knownIdx[0]] + 'こを', X.full + 'が', 'とりました'], ['のこりは', 'ぜんぶ', Y.full + 'の', 'ぶんです']];
    forms = ['s6'];
  } else {
    if (sform === 's1') totalS = [[T + 'この', o[0] + 'を', ...listToks(lst, 'で'), 'わけました']];
    if (sform === 's2') totalS = [[...listToks(lst, 'で'), 'わけっこしました'], ['ぜんぶで', T + o[1], 'でした']];
    if (sform === 's3') totalS = [[T + o[1], 'ある', o[0] + 'を、' + lst[0].full + 'と', ...listToks(lst.slice(1), 'が'), 'ぜんぶ', 'もらいました']];
    if (sform === 's4') totalS = [[T + 'この', o[0] + 'を', ...listToks(lst, 'に'), 'くばりました']];
    if (sform === 's5') { const X = pick(ps); totalS = [[X.full + 'は', T + 'この', o[0] + 'を', ...ps.filter(p => p !== X).map((p, i, a) => p.full + 'と'), 'わけました']]; }
    if (sform === 's1b') totalS = [[o[0] + 'が', T + o[1], 'あります'], [...listToks(lst, 'で'), 'ぜんぶ', 'わけました']];
    if (sform === 's5b') { const X = pick(ps); totalS = [[X.full + 'は', o[0] + 'を', T + o[1], 'ひろって、' + ps.filter(p => p !== X)[0].full + 'と', ...ps.filter(p => p !== X).slice(1).map(p => p.full + 'と'), 'ぜんぶ', 'わけました']]; }
    const owners = knownIdx.map(i => ps[i]), ov = knownIdx.map(i => vals[i]);
    const r = renderBindings(owners, ov, ps, k, c); knownS = r.sents; forms = [sform, ...r.forms];
  }
  const pre = coin(0.6) && sform !== 's2' ? intro(ps) : [];
  return { ps, o, T, vals, unk, knownIdx, totalS, knownS, pre, forms, sents: pre.concat(totalS, knownS) };
}
function genSplitNum(lv, k, part) {
  for (;;) {
    const S = splitScene(k, lv);
    let ai, correct, ds;
    if (!part) {
      ai = S.unk; correct = S.vals[ai];
      if (k === 2) { const a = S.vals[S.knownIdx[0]]; ds = [{ v: S.T / 2, t: 'W13' }, ...shuffle([{ v: a, t: 'W1' }, { v: S.T, t: 'W2' }, { v: S.T + a, t: 'W3' }]).slice(0, 2)]; }
      else {
        const kv = S.knownIdx.map(i => S.vals[i]); const pairs = [];
        for (let i = 0; i < kv.length; i++) for (let j = i + 1; j < kv.length; j++) pairs.push(Math.abs(kv[i] - kv[j]));
        const w12 = pick(pairs);
        ds = [{ v: w12, t: 'W12' }, ...shuffle([{ v: pick(kv), t: 'W1' }, { v: S.T, t: 'W2' }, { v: S.T - pick(kv), t: 'W19' }]).slice(0, 2)];
      }
    } else {
      ai = pick(S.knownIdx); correct = S.vals[ai];
      ds = [{ v: S.vals[S.unk], t: 'W1' }, { v: S.T, t: 'W2' }, k === 2 ? { v: S.T / 2, t: 'W13' } : { v: S.T - pick(S.knownIdx.filter(i => i !== ai).map(i => S.vals[i])), t: 'W19' }];
    }
    ds = numOptions(correct, ds); if (ds.length < 2) continue;
    if (!part && ds[0].t !== (k === 2 ? 'W13' : 'W12')) continue;
    const it = item({ pattern: part ? 'split_part' : 'split_num', kind: 'number', k, sents: S.sents, q: [S.ps[ai].full + 'の', 'ぶんは', 'なんこですか'], forms: S.forms, scene: S });
    return finishChoice(it, String(correct), ds.map(d => String(d.v)));
  }
}
function genSplitMost(lv, k, pol) {
  for (;;) {
    const S = splitScene(k, lv);
    const tgt = pol === 'up' ? Math.max(...S.vals) : Math.min(...S.vals); const ai = S.vals.indexOf(tgt);
    const it = item({ pattern: k === 2 ? 'split_who' : 'split_most', kind: 'person', k, polarity: pol, sents: S.sents, q: [pol === 'up' ? 'おおいのは' : 'すくないのは', 'だれですか'], forms: S.forms });
    return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
  }
}
function genSplitUsed(lv, k) {
  const S = splitScene(k, lv); const ai = S.unk;
  const cands = [S.T, ...S.knownIdx.map(i => S.vals[i])];
  return { pattern: 'split_used', kind: 'find_all', k, sents: S.sents, q: [S.ps[ai].full + 'の', 'かずを', 'だすのに', 'つかう', 'かずを', 'ぜんぶ', 'えらびましょう'], forms: S.forms, cands, ansSet: cands.slice(), modifiers: [] };
}

// ---------- transfer ----------
function tSentence(G, Rr, n, c, subj, form, frameZ, framePos, wordSwap) {
  const N = n + c.u; let toks;
  if (wordSwap) {
    const ws = form === 't1' ? [Rr.full + 'に、' + G.full + 'が', N, 'あげました'] : form === 't3' ? [G.full + 'から、' + Rr.full + 'が', N, 'もらいました'] : [G.full + 'に、' + Rr.full + 'が', N, 'もらいました'];
    ws.ev = true; return [ws];
  }
  const verb = { t1: 'あげました', t2: 'わたしました', t5: 'かえしました', t3: 'もらいました', t4: 'もらいました' }[form];
  let S, O;
  if (['t1', 't2', 't5'].includes(form)) { S = G.full + 'は'; O = Rr.full + 'に'; }
  else if (form === 't3') { S = Rr.full + 'は'; O = G.full + 'から'; }
  else { S = Rr.full + 'は'; O = G.full + 'に'; }
  if (frameZ) {
    const fr = [frameZ.full + 'の', pick(['まえで', 'となりで'])];
    toks = framePos === 'before' ? [...fr, S, O, N, verb] : [S, ...fr, O, N, verb];
  } else toks = [S, O, N, verb];
  if (!LEGACY && coin()) { const i = toks.indexOf(S); toks.splice(i + 1, 0, pick(INS.concat(['そっと']))); } // 4.4.9b (X3)
  toks.ev = true; return [toks];
}
function transferScene(k, lv, opts = {}) {
  for (;;) {
    const ps = drawPersons(k, lv), o = pick(OBJS);
    const gi = ri(0, k - 1); let rI; do { rI = ri(0, k - 1); } while (rI === gi);
    const G = ps[gi], Rr = ps[rI];
    const vals = distinctVals(k, 2, 15); const n = ri(1, 5);
    const g0 = vals[gi], r0 = vals[rI];
    if (g0 - n < 1 || r0 + n > 20 || n === Math.abs(g0 - r0) || r0 - n < 1 || g0 + n > 20) continue; // v0.5.1 U15
    const subjGiver = coin();
    // v0.5.3: an item carrying the word_swap modifier gets an eligible form (t1 / t3 / t4) so the swap is realised
    const form = subjGiver ? (opts.wordSwap ? 't1' : pick(['t1', 't2', 't5'])) : (coin(0.8) ? 't4' : 't3');
    const bysts = ps.filter((_, i) => i !== gi && i !== rI);
    // v0.5.3 (4.4.8, 4.12 A3): at Lv7 and Lv10 the swap is drawn per sentence first; the t6 frame is drawn
    // only for sentences without the swap, at 2/3 of them (check 39 counts t6 among those sentences)
    const eligible = ['t1', 't3', 't4'].includes(form);
    const wordSwap = !LEGACY && eligible && (!!opts.wordSwap || ((lv === 7 || lv === 10) && coin(0.6)));
    let frameZ = null, framePos = null;
    if (k >= 3 && !wordSwap && coin(2 / 3)) { frameZ = pick(bysts); framePos = coin() ? 'before' : 'after'; }
    let holdS, forms;
    if (coin(0.3)) { // v0.5.1 h0: one summary sentence listing every start number, 3 割 of transfer starts at any head count
      const ord = shuffle(ps.map((_, i) => i));
      const parts = ord.map((i, j) => j === 0 ? [ps[i].full + 'は', o[0] + 'を', vals[i] + o[1]] : [ps[i].full + 'は', vals[i] + o[1]]);
      const toks = [];
      parts.forEach((p, j) => { if (j > 0) toks[toks.length - 1] += '、'; toks.push(...p); });
      holdS = [toks.concat(['もっていました'])];
      forms = ['hc']; FC.h0 = (FC.h0 || 0) + 1;
    } else {
      const order = shuffle(ps.map((_, i) => i));
      const r = renderBindings(order.map(i => ps[i]), order.map(i => vals[i]), ps, k, ctxHold(o)); holdS = r.sents; forms = r.forms;
    }
    const ev = tSentence(G, Rr, n, { u: o[1] }, null, form, frameZ, framePos, wordSwap);
    if (k >= 3 && !wordSwap) { STATS.tSent3++; if (frameZ) STATS.t6++; }
    const swap = !!opts.clauseSwap;
    const pre = !LEGACY && coin(0.6) ? intro(ps) : []; // v0.5.3: intro on transfer scenes too (3.5, check 14)
    const sents = pre.concat(swap ? ev.concat(holdS) : holdS.concat(ev));
    const after = vals.slice(); after[gi] -= n; after[rI] += n;
    return { ps, o, vals, after, n, gi, rI, G, Rr, form, frameZ, framePos, wordSwap, sents, evIdx: pre.length + (swap ? 0 : holdS.length), forms, subjGiver };
  }
}
function askRole(k, ratio) { // ratio: [giver, receiver, bystander]
  const r = rnd() * ratio.reduce((a, b) => a + b, 0);
  if (r < ratio[0]) return 'giver'; if (r < ratio[0] + ratio[1]) return 'receiver'; return 'bystander';
}
function personByRole(S, role) { return role === 'giver' ? S.gi : role === 'receiver' ? S.rI : S.ps.findIndex((_, i) => i !== S.gi && i !== S.rI); }
function genTransferNum(lv, k, opts) {
  for (;;) {
    const S = transferScene(k, lv, opts);
    const role = k === 2 ? (coin() ? 'giver' : 'receiver') : askRole(k, [2, 2, 1]);
    const ai = personByRole(S, role); const x0 = S.vals[ai], x1 = S.after[ai];
    let ds;
    if (role === 'bystander') ds = [{ v: x0 + S.n, t: 'W9' }, { v: x0 - S.n, t: 'W22' }, { v: S.n, t: 'W5' }];
    else ds = [{ v: role === 'giver' ? x0 + S.n : x0 - S.n, t: 'W4' }, { v: S.n, t: 'W5' }, { v: x0, t: 'W6' }];
    ds = numOptions(x1, ds); if (ds.length < 3) continue;
    const it = item({ pattern: 'transfer_num', kind: 'number', k, sents: S.sents, q: [S.ps[ai].full + 'は', 'いま', 'なんこ', 'もっていますか'], scene: S, role });
    return finishChoice(it, String(x1), ds.map(d => String(d.v)));
  }
}
function card(ps, vals, u, order) { return order.map(i => ps[i].full + ' ' + vals[i] + u).join(' ・ '); }
function genTransferCard(lv, k, opts) {
  for (;;) {
    const S = transferScene(k, lv, opts);
    const w4 = S.vals.slice(); w4[S.gi] += S.n; w4[S.rI] -= S.n;
    if (w4.some(v => v < 1 || v > 20)) continue;
    const order = shuffle(S.ps.map((_, i) => i));
    const it = item({ pattern: 'transfer_card', kind: 'card', k, sents: S.sents, q: ['いまの', 'ようすに', 'あう', 'カードは', 'どれですか'], scene: S });
    return finishChoice(it, card(S.ps, S.after, S.o[1], order), [card(S.ps, w4, S.o[1], order), card(S.ps, S.vals, S.o[1], order)]);
  }
}
function genTransferWho(lv, k, pol, opts) {
  const S = transferScene(k, lv, opts);
  const ai = pol === 'up' ? S.rI : S.gi;
  const it = item({ pattern: 'transfer_who', kind: 'person', k, polarity: pol, sents: S.sents, q: [pol === 'up' ? 'ふえたのは' : 'へったのは', 'だれですか'], scene: S });
  return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
}
function genTransferSame(lv, k, opts) {
  const S = transferScene(k, lv, opts); const ai = personByRole(S, 'bystander');
  const it = item({ pattern: 'transfer_same', kind: 'person', k, sents: S.sents, q: ['かずが', 'かわらなかったのは', 'だれですか'], scene: S });
  return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
}
function genTransferChange(lv, k, opts) {
  const S = transferScene(k, lv, opts); const role = askRole(k, [1, 1, 1]); const ai = personByRole(S, role);
  const up = S.n + 'こ ふえた', dn = S.n + 'こ へった', no = 'かわらない';
  const corr = role === 'giver' ? dn : role === 'receiver' ? up : no;
  const it = item({ pattern: 'transfer_change', kind: 'change', k, sents: S.sents, q: [S.ps[ai].full + 'の', 'かずは', 'どう', 'かわりましたか'], scene: S, role });
  return finishChoice(it, corr, [up, dn, no].filter(x => x !== corr));
}
function genTransferUsed(lv, k, opts) {
  const S = transferScene(k, lv, opts); const role = askRole(k, [1, 1, 1]); const ai = personByRole(S, role);
  const cands = [...S.vals, S.n]; const ansSet = role === 'bystander' ? [S.vals[ai]] : [S.vals[ai], S.n];
  return { pattern: 'transfer_used', kind: 'find_all', k, sents: S.sents, q: [S.ps[ai].full + 'の', 'いまの', 'かずを', 'だすのに', 'つかう', 'かずを', 'ぜんぶ', 'えらびましょう'], cands, ansSet, scene: S, role, modifiers: [] };
}

// ---------- relation ----------
function relScene(lv, numbered, opts = {}) {
  for (;;) {
    const ps = drawPersons(3, lv), o = pick(OBJS);
    const [B, P1, P2] = ps; // B base, P1 compared to B, P2 compared to P1
    const b = ri(3, 15), d1 = ri(1, 6); let d2; do { d2 = ri(1, 6); } while (d2 === d1);
    const s1 = coin() ? 1 : -1, s2 = coin() ? 1 : -1;
    const v1 = b + s1 * d1, v2 = v1 + s2 * d2;
    if ([v1, v2].some(v => v < 1 || v > 20) || new Set([b, v1, v2]).size < 3 || b === 2 * d2) continue;
    const rel = (X, Y, D, s) => {
      const after = coin(); const w = s > 0 ? 'おおい' : 'すくない';
      if (numbered) return after ? [Y.full + 'より', X.full + 'の', 'ほうが', D + o[1], w + 'です'] : [X.full + 'は', Y.full + 'より', D + o[1], w + 'です'];
      return after ? [Y.full + 'より', X.full + 'の', 'ほうが', w.replace('い', 'く'), 'もっています'] : [X.full + 'は', Y.full + 'より', w.replace('い', 'く'), 'もっています'];
    };
    let baseS = [];
    if (numbered) baseS = renderBindings([B], [b], ps, 3, ctxHave(o)).sents;
    let relS = [rel(P1, B, d1, s1), rel(P2, P1, d2, s2)]; relS.forEach(r => { r.ev = true; });
    if (coin()) relS = [relS[1], relS[0]];
    const pre = !LEGACY && coin(0.6) ? intro(ps) : []; // v0.5.3: intro on relation scenes too (3.5, check 14)
    const sents = pre.concat(opts.clauseSwap ? relS.concat(baseS) : baseS.concat(relS));
    return { ps, o, B, P1, P2, b, v1, v2, d1, d2, s1, s2, vals: [b, v1, v2], sents };
  }
}
function genRelNum(lv, opts) {
  for (;;) {
    const S = relScene(lv, true, opts);
    const ds = numOptions(S.v1, [{ v: S.b, t: 'W1' }, { v: S.d1, t: 'W5' }, { v: S.b - S.s1 * S.d1, t: 'W7' }]);
    if (ds.length < 3) continue;
    const it = item({ pattern: 'rel_num', kind: 'number', k: 3, sents: S.sents, q: [S.P1.full + 'は', 'なんこ', 'もっていますか'], scene: S });
    return finishChoice(it, String(S.v1), ds.map(d => String(d.v)));
  }
}
function genRelCard(lv, opts) {
  for (;;) {
    const S = relScene(lv, true, opts);
    const w7 = [S.b, S.b - S.s1 * S.d1, S.b - S.s1 * S.d1 - S.s2 * S.d2], w5 = [S.b, S.d1, S.d2];
    if (w7.some(v => v < 1 || v > 20) || w5[1] === S.v1 || w5[2] === S.v2 || w7[1] === S.d1 || w7[2] === S.d2) continue;
    const order = shuffle([0, 1, 2]);
    const it = item({ pattern: 'rel_card', kind: 'card', k: 3, sents: S.sents, q: ['ばめんに', 'あう', 'カードは', 'どれですか'], scene: S });
    return finishChoice(it, card(S.ps, S.vals, S.o[1], order), [card(S.ps, w7, S.o[1], order), card(S.ps, w5, S.o[1], order)]);
  }
}
function genRelMost(lv, pol) {
  for (;;) {
    const S = relScene(lv, false);
    if (S.s1 !== S.s2) continue; // chain needs consistent direction so the middle is P1
    const tgt = pol === 'up' ? Math.max(...S.vals) : Math.min(...S.vals); const ai = S.vals.indexOf(tgt);
    const it = item({ pattern: 'rel_most', kind: 'person', k: 3, polarity: pol, sents: S.sents, q: [pol === 'up' ? 'いちばん おおいのは' : 'いちばん すくないのは', 'だれですか'].join(' ').split(' '), scene: S });
    return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
  }
}

// ---------- step ----------
function genStepSplitTransfer(lv, k, mode, pol) {
  for (;;) {
    const S = splitScene(k, lv);
    const gi = ri(0, k - 1); let rI; do { rI = ri(0, k - 1); } while (rI === gi);
    const n = ri(1, 3);
    const after = S.vals.slice(); after[gi] -= n; after[rI] += n;
    if (after[gi] < 1) continue;
    if (n === Math.abs(S.vals[gi] - S.vals[rI])) continue; // v0.5.1 U15
    const w4 = S.vals.slice(); w4[gi] += n; w4[rI] -= n; if (w4.some(v => v < 1)) continue;
    const subjGiver = coin(); const form = subjGiver ? pick(['t1', 't2', 't5']) : (coin(0.8) ? 't4' : 't3');
    let frameZ = null, framePos = null; const bys = S.ps.filter((_, i) => i !== gi && i !== rI);
    const wordSwap = !LEGACY && ['t1', 't3', 't4'].includes(form) && coin(0.6); // v0.5.3: Lv10 word_swap (4.4.8)
    if (!wordSwap && coin(2 / 3)) { frameZ = pick(bys); framePos = coin() ? 'before' : 'after'; }
    const ev = tSentence(S.ps[gi], S.ps[rI], n, { u: S.o[1] }, null, form, frameZ, framePos, wordSwap);
    ev[0] = ['そのあと、'].concat(ev[0]); ev[0].ev = true;
    const sents = S.sents.concat(ev);
    const scene = Object.assign({}, S, { gi, rI, n, after, form, frameZ, framePos, wordSwap, G: S.ps[gi], Rr: S.ps[rI], step: true });
    if (mode === 'card') {
      const order = shuffle(S.ps.map((_, i) => i));
      const it = item({ pattern: 'step_split_transfer_card', kind: 'card', k, sents, q: ['いまの', 'ようすに', 'あう', 'カードは', 'どれですか'], scene });
      if (new Set([card(S.ps, after, S.o[1], order), card(S.ps, w4, S.o[1], order), card(S.ps, S.vals, S.o[1], order)]).size < 3) continue;
      return finishChoice(it, card(S.ps, after, S.o[1], order), [card(S.ps, w4, S.o[1], order), card(S.ps, S.vals, S.o[1], order)]);
    }
    if (new Set(after).size < k) continue;
    const tgt = pol === 'up' ? Math.max(...after) : Math.min(...after); const ai = after.indexOf(tgt);
    const it = item({ pattern: 'step_split_transfer_most', kind: 'person', k, polarity: pol, sents, q: ['いま', pol === 'up' ? 'いちばん' : 'いちばん', pol === 'up' ? 'おおいのは' : 'すくないのは', 'だれですか'], scene });
    return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
  }
}
function genStepTransferMost(lv, k, pol) {
  // (before, after) role pairs: up: (by, rec) or (giv, by); down: (by, giv) or (rec, by)
  const combo = coin() ? 0 : 1; const when = coin() ? 'before' : 'after';
  for (let tries = 0; tries < 20000; tries++) {
    const S = transferScene(k, lv);
    if (new Set(S.vals).size < k || new Set(S.after).size < k) continue;
    const f = pol === 'up' ? Math.max : Math.min;
    const bI = S.vals.indexOf(f(...S.vals)), aI = S.after.indexOf(f(...S.after));
    if (bI === aI) continue;
    const role = i => i === S.gi ? 'giv' : i === S.rI ? 'rec' : 'by';
    const want = pol === 'up' ? (combo === 0 ? ['by', 'rec'] : ['giv', 'by']) : (combo === 0 ? ['by', 'giv'] : ['rec', 'by']);
    if (role(bI) !== want[0] || role(aI) !== want[1]) continue;
    const ai = when === 'before' ? bI : aI;
    const it = item({ pattern: 'step_transfer_most', kind: 'person', k, polarity: pol, when, sents: S.sents, q: [when === 'before' ? 'はじめに' : 'いま', 'いちばん', pol === 'up' ? 'おおいのは' : 'すくないのは', 'だれですか'], scene: S });
    return finishChoice(it, S.ps[ai].full, S.ps.filter((_, i) => i !== ai).map(p => p.full));
  }
  throw new Error('step_transfer_most generation failed');
}

// ---------- noise (Lv9, Lv10 modifier slot) ----------
function addAttrNoise(it) {
  // prefix age/grade token before the first name token of a random sentence holding a name
  const tokIdx = []; it.sents.forEach((s, si) => s.forEach((t, ti) => { if (FULL.some(f => t.startsWith(f))) tokIdx.push([si, ti]); }));
  if (!tokIdx.length) return it;
  const [si, ti] = pick(tokIdx);
  const pre = coin() ? ri(5, 9) + 'さいの' : ri(1, 6) + 'ねんせいの';
  const wasEv = it.sents[si].ev; it.sents[si] = it.sents[si].slice(); it.sents[si].ev = wasEv; it.sents[si].splice(ti, 0, pre); it.modifiers.push('attr_noise');
  if (it.cands) it.cands.push(parseInt(pre)); // find_all candidates include attribute numbers
  return it;
}
function addObjectNoise(it) {
  // insert "〈べつのもの〉を Mこ" before or after the object number in a one-person holding sentence
  const o = OTHER[coin(0.6) ? ri(0, 1) : 2]; const M = ri(1, 10);
  for (const s of shuffle(it.sents.map((_, i) => i))) {
    const sent = it.sents[s]; const ni = sent.findIndex(t => /^\d+(こ|まい)$/.test(t));
    const names = sent.filter(t => FULL.some(f => t.startsWith(f))).length;
    if (ni < 0 || names !== 1) continue;
    const nn = sent.slice(); const extra = [o[0] + 'を', M + o[1] + 'と'];
    if (coin()) nn.splice(ni, 0, ...extra); else { nn[ni] = nn[ni] + 'と'; nn.splice(ni + 1, 0, o[0] + 'を', M + o[1]); }
    it.sents[s] = nn; it.modifiers.push('object_noise'); if (it.cands) it.cands.push(M); return it;
  }
  return addAttrNoise(it);
}
function addPronoun(it) {
  // replace a one-name "X は N" sentence by "そこへ Xが きました。その子は N ..."
  for (const s of shuffle(it.sents.map((_, i) => i))) {
    const sent = it.sents[s]; const nameT = sent.filter(t => FULL.some(f => t.startsWith(f)));
    if (nameT.length !== 1 || !sent[0].startsWith(nameT[0]) || !sent[0].endsWith('は')) continue;
    const full = FULL.find(f => sent[0].startsWith(f));
    const rest = sent.slice(1);
    it.sents = it.sents.slice(0, s).concat([['そこへ', full + 'が', 'きました'], ['その子は', ...rest]], it.sents.slice(s + 1));
    it.modifiers.push('pronoun'); return it;
  }
  return addAttrNoise(it);
}
const NOISE = { attr_noise: addAttrNoise, object_noise: addObjectNoise, pronoun: addPronoun };

// ---------- Lv composition (4.2 table) ----------
function polPair() { return !LEGACY ? [coin() ? 'up' : 'down', coin() ? 'up' : 'down'] : shuffle(['up', 'down']); }
function polBoth(m) { // 4.11 rule 2: if >= 2 polarity person items, both up and down appear
  if (!LEGACY) return Array.from({ length: m }, () => coin() ? 'up' : 'down');
  for (;;) { const a = Array.from({ length: m }, () => coin() ? 'up' : 'down'); if (m < 2 || (a.includes('up') && a.includes('down'))) return a; }
}
function buildSet(lv) {
  let items;
  const L = lv;
  if (L === 1) { const pp = polPair(); items = [genHaveNum(1), genHaveNum(1), genHaveWho(1), genHaveMost(1, 2, pp[0]), genHaveMost(1, 2, pp[1])]; }
  if (L === 2) { const p = polBoth(2); items = [genSplitNum(2, 2, coin()), genSplitMost(2, 2, p[0]), genHaveNum(2), genHaveWho(2), genHaveMost(2, 2, p[1])]; }
  if (L === 3) { const p = polBoth(3); items = [genTransferCard(3, 2), genTransferNum(3, 2), genTransferWho(3, 2, p[0]), genSplitMost(3, 2, p[1]), genHaveMost(3, 2, p[2])]; }
  if (L === 4) { const pp = polPair(); items = [genRelCard(4), genRelNum(4), genRelMost(4, coin() ? 'up' : 'down'), genHaveMost(4, 3, pp[0]), genHaveMost(4, 3, pp[1])]; }
  if (L === 5) { const p = polBoth(2); const useRel = coin(); items = [useRel ? genRelCard(5) : genTransferCard(5, 2), useRel ? genRelNum(5) : genTransferNum(5, 2), genSplitMost(5, 3, p[0]), genSplitNum(5, 3, coin()), genHaveMost(5, 3, p[1])]; }
  if (L === 6) { items = [genTransferCard(6, 3), genTransferNum(6, 3), genTransferUsed(6, 3), genTransferWho(6, 3, coin() ? 'up' : 'down'), genTransferSame(6, 3)]; }
  if (L === 7) {
    const mods = shuffle(['q_first', 'clause_swap', 'word_swap', pick(['q_first', 'clause_swap', 'word_swap']), pick(['q_first', 'clause_swap', 'word_swap'])]);
    const o = i => ({ wordSwap: mods[i] === 'word_swap', clauseSwap: mods[i] === 'clause_swap' });
    const useRel = coin();
    items = [useRel ? genRelCard(7, o(0)) : genTransferCard(7, 3, o(0)), useRel ? genRelNum(7, o(1)) : genTransferNum(7, 3, o(1)), genTransferUsed(7, 3, o(2)), genTransferWho(7, 3, coin() ? 'up' : 'down', o(3)), genTransferChange(7, 3, o(4))];
    items.forEach((it, i) => { it.modifiers.push(mods[i]); if (mods[i] === 'q_first') it.qFirst = true; });
  }
  if (L === 8) {
    const who = coin(); const p = polBoth(who ? 2 : 1);
    items = [genTransferCard(8, 3), genTransferNum(8, 3), genSplitMost(8, 4, p[0]), genSplitNum(8, 4, coin()), who ? genTransferWho(8, pick([3, 4]), p[1]) : genTransferChange(8, pick([3, 4]))];
  }
  if (L === 9) {
    const p = polBoth(2); const useRel = coin(); const k = pick([3, 4]);
    items = [useRel ? genRelCard(9) : genTransferCard(9, 3), useRel ? genRelNum(9) : genTransferNum(9, 3), coin() ? genSplitUsed(9, k) : genTransferUsed(9, k), genHaveMost(9, k, p[0]), genSplitMost(9, k, p[1])];
    const ns = shuffle(['attr_noise', 'object_noise', 'pronoun', pick(['attr_noise', 'object_noise', 'pronoun']), pick(['attr_noise', 'object_noise', 'pronoun'])]);
    items = items.map((it, i) => NOISE[ns[i]](it));
  }
  if (L === 10) {
    const k = pick([3, 4]);
    const slot = pick(['transfer_who', 'transfer_change', 'transfer_used']);
    const last = coin() ? 'rel_most' : 'have_most';
    const npol = 2 + (slot === 'transfer_who' ? 1 : 0) + 1; const p = polBoth(npol); let pi = 0;
    items = [genStepSplitTransfer(10, k, 'card'), genStepSplitTransfer(10, k, 'most', p[pi++]), genStepTransferMost(10, pick([3, 4]), p[pi++])];
    const m = slot === 'transfer_who' ? genTransferWho(10, k, p[pi++]) : slot === 'transfer_change' ? genTransferChange(10, k) : genTransferUsed(10, k);
    items.push(NOISE[pick(['attr_noise', 'object_noise', 'pronoun'])](m));
    items.push(last === 'rel_most' ? genRelMost(10, p[pi++]) : genHaveMost(10, 4, p[pi++]));
  }
  // order: chain (card then producer) adjacent; others random; same pattern not adjacent
  for (;;) {
    let order = shuffle(items.map((_, i) => i));
    const ci = items.findIndex(it => it.kind === 'card');
    if (ci >= 0) { order = order.filter(i => i !== ci + 1); const pos = order.indexOf(ci); order.splice(pos + 1, 0, ci + 1); }
    const seq = order.map(i => items[i]);
    if (seq.every((it, i) => i === 0 || it.pattern !== seq[i - 1].pattern)) { seq.forEach((it, i) => { it.slot = order[i]; it.lv = lv; }); return seq; }
  }
}

// ---------- rendering for solvers ----------
function view(it) {
  const body = it.sents.map(s => s.join(' ')).join('。') + '。';
  const q = it.q.join(' ');
  return { text: it.qFirst ? q + 'でしょう。' + body : body, sents: it.qFirst ? it.sents : it.sents, q, kind: it.kind, options: it.options, cands: it.cands, k: it.k };
}

// ---------- parsing helpers for solvers (position only) ----------
const NUMRE = /^(\d+)(こ|まい|本|さい|ねんせい)/;
function toks(s) { return s.join(' ').split(/[ 、]/).filter(Boolean); }
function clauses(s) { return s.join(' ').split('、').map(c => c.split(' ').filter(Boolean)); }
function nameOf(t) { return FULL.find(f => t.startsWith(f)) || null; }
function numOf(t) { const m = t.match(NUMRE); return m ? { v: +m[1], u: m[2] } : null; }
function qName(v) { for (const t of v.q.split(' ')) { const n = nameOf(t); if (n) return n; } return null; }
function qNum(v) { for (const t of v.q.split(' ')) { const n = numOf(t); if (n) return n.v; } return null; }
function personsInText(v) { const seen = []; for (const s of v.sents) for (const t of toks(s)) { const n = nameOf(t); if (n && !seen.includes(n)) seen.push(n); } return seen; }
function objUnit(v) { const c = {}; for (const s of v.sents) for (const t of toks(s)) { const n = numOf(t); if (n && (n.u === 'こ' || n.u === 'まい' || n.u === '本')) c[n.u] = (c[n.u] || 0) + 1; } return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || 'こ'; }
function textNums(v) { const u = objUnit(v); const out = []; for (const s of v.sents) for (const t of toks(s)) { const n = numOf(t); if (n && n.u === u) out.push(n.v); } return out; }

// isEvent: the solver is granted identification of the event (transfer or relation) sentence.
// Granted positionally: a sentence with 2+ names whose number (if any) is not bound by the binder rules.
// Implementation: event sentences are those produced by tSentence/rel (marked by verb position) -- we approximate by verb token,
// which biases T1+B upward (stated in the audit).
const EVENT_VERBS = ['あげました', 'わたしました', 'かえしました', 'もらいました', 'おおいです', 'すくないです', 'もっています'];
function isEventSentence(s) { return !!s.ev; }

// ---------- binder (T1+B) ----------
// opts.adj: use name adjacency to decide owner in 2-name clauses (B5)
// opts.frame: detect a bystander frame in event sentences by position (name followed by a non-name token with a later name)
function bind(v, opts) {
  const val = {}; const totals = []; let prevNames = null; const events = [];
  const unbound = () => personsInText(v).filter(p => val[p] === undefined);
  for (const s of v.sents) {
    if (isEventSentence(s)) { events.push(s); prevNames = toks(s).filter(nameOf).map(nameOf); continue; }
    const sNames = toks(s).filter(nameOf).map(nameOf);
    for (const c of clauses(s)) {
      const items = c.map((t, i) => ({ t, i, name: nameOf(t), num: numOf(t) }));
      const names = items.filter(x => x.name); const nums = items.filter(x => x.num && ['こ', 'まい', '本'].includes(x.num.u));
      for (const nm of nums) {
        if (names.length === 0) {
          if (sNames.length === 0) {
            if (prevNames && prevNames.length === 1 && val[prevNames[0]] === undefined) { val[prevNames[0]] = nm.num.v; continue; }
            const ub = unbound();
            if (totals.length === 0 && !(c.includes('もう') || c.includes('ひとりは'))) { totals.push(nm.num.v); continue; }
            if (ub.length >= 1) { val[ub[0]] = nm.num.v; continue; }
            totals.push(nm.num.v);
          } else totals.push(nm.num.v);
        } else if (names.length === 1) {
          if (val[names[0].name] === undefined) val[names[0].name] = nm.num.v; else { const a = val[names[0].name]; if (nm.num.v > a) { totals.push(nm.num.v); } else { totals.push(a); val[names[0].name] = nm.num.v; } }
        } else {
          const before = names.filter(x => x.i < nm.i), after = names.filter(x => x.i > nm.i);
          if (before.length && after.length) { totals.push(nm.num.v); continue; } // s5: number between names
          if (!before.length) { totals.push(nm.num.v); continue; } // s1/s4
          let owner;
          if (opts.b6) { const gap = nm.i - before[1].i - 1; owner = gap >= 2 ? before[0].name : gap === 0 ? before[1].name : (coin() ? before[0].name : before[1].name); } // B6: words between 2nd name and number
          else if (opts.next) owner = after.length ? after[0].name : before[before.length - 1].name; // B3: next name, else nearest preceding
          else if (opts.adj) owner = (before[1] && before[1].i === before[0].i + 1) ? before[0].name : before[before.length - 1].name;
          else if (opts.nearest) owner = before[before.length - 1].name; // stage A: nearest preceding name (B1)
          else owner = before[0].name; // B*: first name
          if (val[owner] === undefined) val[owner] = nm.num.v; else { const a = val[owner]; if (nm.num.v > a) totals.push(nm.num.v); else { totals.push(a); val[owner] = nm.num.v; } }
        }
      }
    }
    prevNames = sNames;
  }
  const T = totals.length ? Math.max(...totals) : null;
  const ps = personsInText(v);
  const ub = ps.filter(p => val[p] === undefined);
  if (T !== null && ub.length === 1) { const s = ps.filter(p => val[p] !== undefined).reduce((a, p) => a + val[p], 0); if (T - s >= 1) val[ub[0]] = T - s; }
  return { val, T, events, ps };
}
// event reading: returns {giver, receiver, bystanders, n} by position (P4) or particle table (P6)
function readEvent(v, b, opts) {
  const ev = b.events.find(s => !toks(s).some(t => t.endsWith('より')));
  if (!ev) return null;
  const t = toks(ev); const nameIdx = t.map((x, i) => nameOf(x) ? i : -1).filter(i => i >= 0);
  let frame = null;
  if (opts.frame) { for (const i of nameIdx) { const nxt = t[i + 1]; if (nxt && !nameOf(nxt) && !numOf(nxt) && nameIdx.some(j => j > i + 1)) { frame = nameOf(t[i]); break; } } }
  if (opts.particleFrame) { for (const i of nameIdx) if (t[i].endsWith('の')) frame = nameOf(t[i]); }
  let parts = nameIdx.map(i => ({ n: nameOf(t[i]), tok: t[i] })).filter(x => x.n !== frame);
  if (parts.length < 2) { parts = nameIdx.map(i => ({ n: nameOf(t[i]), tok: t[i] })).slice(-2); frame = null; }
  const nTok = t.find(x => numOf(x)); const n = nTok ? numOf(nTok).v : null;
  let giver, receiver;
  if (opts.p6) {
    const ni = parts.find(x => x.tok.endsWith('に')), ka = parts.find(x => x.tok.endsWith('から'));
    if (ni) { receiver = ni.n; giver = parts.find(x => x !== ni).n; }
    else if (ka) { giver = ka.n; receiver = parts.find(x => x !== ka).n; }
    else { giver = parts[0].n; receiver = parts[1].n; }
  } else { giver = parts[0].n; receiver = parts[1] ? parts[1].n : null; }
  const inEvent = parts.map(x => x.n);
  const bystanders = b.ps.filter(p => !inEvent.includes(p));
  return { giver, receiver, bystanders, n, frame };
}
function relSolve(v, b) { // relation: guess direction words, subject = first name (position)
  const rels = b.events.filter(s => toks(s).some(t => t.endsWith('より')));
  return rels;
}

// ---------- solvers ----------
function chooseLabel(options, label) { const i = options.indexOf(label); return i >= 0 ? i : Math.floor(rnd() * options.length); }
function chooseNum(options, val) { return chooseLabel(options, String(val)); }
function guess(v) { if (v.kind === 'find_all') return v.cands.filter(() => coin()); return Math.floor(rnd() * v.options.length); }

// T1 solvers
const T1 = {
  guess: () => (v) => guess(v),
  firstName: () => (v) => v.kind === 'person' ? chooseLabel(v.options, personsInText(v)[0]) : guess(v),
  lastName: () => (v) => { if (v.kind !== 'person') return guess(v); const p = personsInText(v); return chooseLabel(v.options, p[p.length - 1]); },
  numMin: () => (v) => v.kind === 'number' ? argBy(v.options, (a, b) => a < b) : guess(v),
  numMax: () => (v) => v.kind === 'number' ? argBy(v.options, (a, b) => a > b) : guess(v),
  numMinNotText: () => (v) => numFilt(v, x => !textNums(v).includes(x), (a, b) => a < b),
  numMaxNotText: () => (v) => numFilt(v, x => !textNums(v).includes(x), (a, b) => a > b),
  numMinText: () => (v) => numFilt(v, x => textNums(v).includes(x), (a, b) => a < b),
  numMaxText: () => (v) => numFilt(v, x => textNums(v).includes(x), (a, b) => a > b),
  numDropExt: () => (v) => { if (v.kind !== 'number') return guess(v); const o = v.options.map(Number); const mx = Math.max(...o), mn = Math.min(...o); const r = o.map((x, i) => i).filter(i => o[i] !== mx && o[i] !== mn); return r.length ? pick(r) : guess(v); },
  N2: () => (v) => { if (v.kind !== 'number') return guess(v); const t = textNums(v); const mx = Math.max(...t); const rest = t.reduce((a, b) => a + b, 0) - mx; return chooseNum(v.options, mx - rest); },
  N3: () => (v) => { if (v.kind !== 'number') return guess(v); const o = v.options.map(Number), t = textNums(v); for (const x of o) for (const n of t) if (t.includes(x) && o.includes(x + n) && x !== n) return o.indexOf(x); return guess(v); },
  N4: () => (v) => { if (v.kind !== 'number') return guess(v); const o = v.options.map(Number); for (const a of o) for (const b of o) for (const c of o) if (a < b && b < c && b - a === c - b) return o.indexOf(b); return guess(v); },
  cardNotAllText: () => (v) => { if (v.kind !== 'card') return guess(v); const t = textNums(v); const ok = v.options.map((c, i) => i).filter(i => !(c => c.match(/\d+/g).map(Number).every(x => t.includes(x)))(v.options[i])); return ok.length ? pick(ok) : guess(v); },
  findAllUnit: () => (v) => v.kind === 'find_all' ? textNums(v) : guess(v),
  findAll2: () => (v) => v.kind === 'find_all' ? shuffle(v.cands).slice(0, 2) : guess(v),
};
function argBy(opts, better) { const o = opts.map(Number); let bi = 0; o.forEach((x, i) => { if (better(x, o[bi])) bi = i; }); return bi; }
function numFilt(v, f, better) { if (v.kind !== 'number') return guess(v); const o = v.options.map(Number); const c = o.map((x, i) => i).filter(i => f(o[i])); if (!c.length) return guess(v); let bi = c[0]; c.forEach(i => { if (better(o[i], o[bi])) bi = i; }); return bi; }

// T1+B / T2 scene solver. state carries set-level polarity inference (P12) when opts.fb is set.
function sceneSolver(opts) {
  return () => {
    const st = { polSeen: [], lv: null };
    const f = (v, it) => {
      const b = bind(v, opts);
      const ev = readEvent(v, b, opts);
      const qn = qName(v), qv = qNum(v);
      const after = Object.assign({}, b.val);
      if (ev && ev.giver && ev.receiver && ev.n) { if (after[ev.giver] !== undefined) after[ev.giver] -= ev.n; if (after[ev.receiver] !== undefined) after[ev.receiver] += ev.n; }
      if (v.kind === 'card') {
        // exclude the card equal to the base (all values in text), then pick the card matching the event reading
        const t = textNums(v);
        const parsed = v.options.map(c => Object.fromEntries(c.split(' ・ ').map(r => { const [nm, x] = r.split(' '); return [nm, parseInt(x)]; })));
        const tgt = ev ? after : b.val;
        const i = parsed.findIndex(p => Object.keys(p).every(nm => tgt[nm] === p[nm]));
        if (i >= 0) return i;
        const ok = parsed.map((p, i) => i).filter(i => !Object.values(parsed[i]).every(x => t.includes(x)));
        return ok.length ? pick(ok) : guess(v);
      }
      if (v.kind === 'number') {
        if (!qn) return guess(v);
        if (b.events.some(s => toks(s).some(t => t.endsWith('より')))) return guess(v); // relation: direction not readable
        if (ev) { if (ev.bystanders.includes(qn) && b.val[qn] !== undefined) return chooseNum(v.options, b.val[qn]); return chooseNum(v.options, after[qn]); }
        return chooseNum(v.options, b.val[qn]);
      }
      if (v.kind === 'change') {
        if (!ev || !qn) return guess(v);
        if (ev.bystanders.includes(qn)) return chooseLabel(v.options, 'かわらない');
        return chooseLabel(v.options, ev.n + 'こ ' + (qn === ev.receiver ? 'ふえた' : 'へった'));
      }
      if (v.kind === 'find_all') {
        if (ev && qn) return ev.bystanders.includes(qn) ? [b.val[qn]] : [b.val[qn], ev.n];
        return textNums(v);
      }
      // person
      if (qv !== null) { const p = Object.keys(b.val).find(p => b.val[p] === qv); return p ? chooseLabel(v.options, p) : guess(v); }
      // no name, no number in the question: polarity item or transfer_same
      if (ev) {
        // transfer_same vs transfer_who: answer bystander if a same item is still expected in this set
        if (st.lv === 6 && !st.sameSeen) { it._bys = ev.bystanders[0]; return chooseLabel(v.options, ev.bystanders[0]); }
        const pol = guessPol(st, opts);
        it._pol = pol;
        return chooseLabel(v.options, pol === 'up' ? ev.receiver : ev.giver);
      }
      const vals = b.val; const known = Object.keys(vals).filter(p => v.options.includes(p));
      if (known.length < v.options.length) return guess(v);
      const pol = guessPol(st, opts); it._pol = pol;
      const sorted = known.sort((a, c) => vals[a] - vals[c]);
      it._max = sorted[sorted.length - 1]; it._min = sorted[0];
      return chooseLabel(v.options, pol === 'up' ? it._max : it._min);
    };
    f.feedback = (v, it, correctIdx) => {
      if (!v.options) return;
      const corr = v.options[correctIdx];
      if (it._bys !== undefined && corr === it._bys) st.sameSeen = true;
      if (it._max && (corr === it._max || corr === it._min)) st.polSeen.push(corr === it._max ? 'up' : 'down');
      else if (it._pol && it.kind === 'person' && it.polarity) {} // gain items: polarity not attributable without direction
    };
    f.start = (lv, set) => { st.polSeen = []; st.lv = lv; st.sameSeen = false; st.mExpected = set.filter(x => x.polarity).length; st.fixedPair = (lv === 1 || lv === 4); };
    function guessPol(st, opts) {
      if (!opts.fb) return coin() ? 'up' : 'down';
      // Enumerate valid polarity patterns (4.11 rule 2 / Lv1 and Lv4 fixed pairs) given seen prefix.
      const m = st.mExpected, seen = st.polSeen;
      if (m < 2 || seen.length === 0) return coin() ? 'up' : 'down';
      if (st.fixedPair && st.lv === 1) return seen[seen.length - 1] === 'up' ? 'down' : 'up';
      // count completions where the next one is up vs down, with "not all equal" constraint
      const rem = m - seen.length; if (rem <= 0) return coin() ? 'up' : 'down';
      let cu = 0, cd = 0;
      for (let mask = 0; mask < (1 << rem); mask++) {
        const tail = Array.from({ length: rem }, (_, i) => (mask >> i) & 1 ? 'up' : 'down');
        const all = seen.concat(tail); if (!(all.includes('up') && all.includes('down'))) continue;
        if (tail[0] === 'up') cu++; else cd++;
      }
      return cu === cd ? (coin() ? 'up' : 'down') : (cu > cd ? 'up' : 'down');
    }
    return f;
  };
}

// P14 (stage A, v0.5.1 U29): in a comparison sentence the first name is the subject; the "より" and
// the direction word are read correctly. Numbers are bound with B2 (first name of the clause).
function relP14() {
  return (v) => {
    const b = bind(v, {});
    const rels = b.events.filter(s => toks(s).some(t => t.endsWith('より')));
    if (!rels.length) return guess(v);
    const val = Object.assign({}, b.val); const order = [];
    const parsed = rels.map(s => {
      const t = toks(s); const names = t.filter(nameOf).map(nameOf); const nt = t.find(x => numOf(x));
      return { subj: names[0], other: names[1], d: nt ? numOf(nt).v : null, more: /おおい|おおく/.test(s.join(' ')) };
    });
    for (let k = 0; k < 3; k++) for (const r of parsed) {
      if (r.d === null) continue;
      const sg = r.more ? 1 : -1;
      if (val[r.other] !== undefined && val[r.subj] === undefined) val[r.subj] = val[r.other] + sg * r.d;
      else if (val[r.subj] !== undefined && val[r.other] === undefined) val[r.other] = val[r.subj] - sg * r.d;
    }
    for (const r of parsed) if (r.d === null) order.push(r.more ? [r.subj, r.other] : [r.other, r.subj]);
    if (v.kind === 'number') { const qn = qName(v); return qn && val[qn] !== undefined ? chooseNum(v.options, val[qn]) : guess(v); }
    if (v.kind === 'card') {
      const parsedC = v.options.map(c => Object.fromEntries(c.split(' ・ ').map(r => { const [nm, x] = r.split(' '); return [nm, parseInt(x)]; })));
      const i = parsedC.findIndex(p => Object.keys(p).every(nm => val[nm] === p[nm]));
      return i >= 0 ? i : guess(v);
    }
    if (v.kind === 'person') {
      const up = /おおい|たくさん/.test(v.q);
      let rank;
      if (order.length) { const score = {}; for (const p of v.options) score[p] = 0; for (const [hi, lo] of order) { score[hi] = (score[hi] || 0) + 1; score[lo] = (score[lo] || 0) - 1; } rank = score; }
      else rank = val;
      const ks = v.options.filter(p => rank[p] !== undefined); if (ks.length < v.options.length) return guess(v);
      const best = ks.reduce((a, p) => (up ? rank[p] > rank[a] : rank[p] < rank[a]) ? p : a, ks[0]);
      return chooseLabel(v.options, best);
    }
    return guess(v);
  };
}
// P15 (stage A, v0.5.1 U29): transfer_change answered with a fixed option (かわらない).
function changeFixed() { return (v) => v.kind === 'change' ? chooseLabel(v.options, 'かわらない') : guess(v); }
// P13 (stage B, v0.5.1 U15): drop the cards whose number multiset is shared with another card; pick among the rest.
function cardSameSet() {
  return (v) => {
    if (v.kind !== 'card') return guess(v);
    const key = c => c.match(/\d+/g).map(Number).sort((a, b) => a - b).join(',');
    const ks = v.options.map(key); const rest = v.options.map((c, i) => i).filter(i => ks.filter(k => k === ks[i]).length === 1);
    return rest.length && rest.length < v.options.length ? pick(rest) : guess(v);
  };
}

const SOLVERS = {
  T1: T1,
  T1B: {
    Bstar: sceneSolver({ adj: false, frame: false, fb: false }),
    Bstar_fb: sceneSolver({ adj: false, frame: false, fb: true }),
    B5frame: sceneSolver({ adj: true, frame: true, fb: false }),
    B5frame_fb: sceneSolver({ adj: true, frame: true, fb: true }),
    B6: sceneSolver({ b6: true, frame: false, fb: false }),
    B6_P6: sceneSolver({ b6: true, frame: false, fb: false, p6: true }),
    B6frame: sceneSolver({ b6: true, frame: true, fb: false }),
  },
  T2: {
    P6_B5frame_fb: sceneSolver({ adj: true, frame: true, fb: true, p6: true }),
    P13_cardSameSet: cardSameSet,
  },
  LEARN: {
    F1r_P6: sceneSolver({ adj: true, particleFrame: true, fb: true, p6: true }),
  },
  // stage A (v0.4 10.1): single surface cue, no counting, no feedback use
  STAGEA: {
    B1_near: sceneSolver({ nearest: true, frame: false, fb: false }),
    B1_near_P6: sceneSolver({ nearest: true, frame: false, fb: false, p6: true }),
    B2_first: sceneSolver({ frame: false, fb: false }),
    B2_first_P6: sceneSolver({ frame: false, fb: false, p6: true }),
    B3_next: sceneSolver({ next: true, frame: false, fb: false }),
    B3_next_P6: sceneSolver({ next: true, frame: false, fb: false, p6: true }),
    P14_relFirstSubject: relP14,
    P15_changeFixed: changeFixed,
  },
};
const STAGEA_T1 = ['guess', 'firstName', 'lastName', 'numMin', 'numMax'];

// ---------- evaluation ----------
function correctOf(it, ans) {
  if (it.kind === 'find_all') { const a = new Set(ans), b = new Set(it.ansSet); return a.size === b.size && [...a].every(x => b.has(x)); }
  return ans === it.ans;
}
function evalLv(lv, nSets) {
  const res = {}; // layer -> solver -> {slotAcc: {slot:[c,n]}, total:[c,n]}
  // STRICT=1: sets from strict_gen.js (the doc-literal generator, v0.5.4) instead of this file's generator
  let build = buildSet;
  if (process.env.STRICT) { const sg = require('./strict_gen.js'); const st = sg.newState(); build = l => sg.buildSet(l, rnd, st); }
  const sets = []; for (let i = 0; i < nSets; i++) sets.push(build(lv));
  // C7: family share among answers / asked persons vs appearance share
  for (const set of sets) for (const it of set) {
    const v = view(it); const ps = personsInText(v); const famIn = n => FAMILY.some(f => n === f[0] + f[1]);
    STATS.items++; STATS.appear += ps.length; STATS.famAppear += ps.filter(famIn).length;
    if (it.kind === 'person') { STATS.ans++; if (famIn(v.options[it.ans])) STATS.famAns++; STATS.expAns = (STATS.expAns || 0) + v.options.filter(famIn).length / v.options.length; }
    const qn = qName(v); if (qn) { STATS.asked++; if (famIn(qn)) STATS.famAsked++; STATS.expAsked = (STATS.expAsked || 0) + ps.filter(famIn).length / ps.length; }
  }
  for (const layer of Object.keys(SOLVERS)) {
    res[layer] = {};
    for (const [name, mk] of Object.entries(SOLVERS[layer])) {
      const r = { slot: {}, c: 0, n: 0, byPat: {} };
      for (const set of sets) {
        const s = mk(); if (s.start) s.start(lv, set);
        for (const it of set) {
          const v = view(it); it._max = it._min = it._pol = it._bys = undefined;
          const a = s(v, it); const ok = correctOf(it, a);
          if (s.feedback) s.feedback(v, it, it.ans);
          r.c += ok; r.n++;
          const key = it.pattern; (r.byPat[key] = r.byPat[key] || [0, 0]); r.byPat[key][0] += ok; r.byPat[key][1]++;
          const sk = it.slot; (r.slot[sk] = r.slot[sk] || [0, 0]); r.slot[sk][0] += ok; r.slot[sk][1]++;
        }
      }
      res[layer][name] = r;
    }
  }
  return { res, sets };
}
function composite(res, layers) {
  // single-procedure best and slot-best composite over solvers in the given layers
  const all = layers.flatMap(l => Object.entries(res[l]));
  const single = Math.max(...all.map(([, r]) => r.c / r.n));
  const bestSingle = all.find(([, r]) => r.c / r.n === single)[0];
  const slots = Object.keys(all[0][1].slot);
  const slotBest = slots.map(s => Math.max(...all.map(([, r]) => r.slot[s][0] / r.slot[s][1])));
  return { single, bestSingle, slotComp: slotBest.reduce((a, b) => a + b, 0) / slots.length };
}

if (require.main === module) {
  const N = +(process.argv[2] || 800);
  const out = [];
  for (let lv = 1; lv <= 10; lv++) {
    R = mulberry32((process.env.SEED ? +process.env.SEED : 1000) + lv);
    const { res } = evalLv(lv, N);
    const t1 = composite(res, ['T1']), t1b = composite(res, ['T1', 'T1B']), t2 = composite(res, ['T1', 'T1B', 'T2']);
    const noFb = composite({ T1: res.T1, T1B: { Bstar: res.T1B.Bstar, B5frame: res.T1B.B5frame } }, ['T1', 'T1B']);
    const learn = res.LEARN.F1r_P6.c / res.LEARN.F1r_P6.n;
    const stA = composite({ T1: Object.fromEntries(Object.entries(res.T1).filter(([k]) => STAGEA_T1.includes(k))), STAGEA: res.STAGEA }, ['T1', 'STAGEA']);
    const stAB = composite(res, ['T1', 'T1B', 'T2', 'STAGEA']); // stage A and stage B together (10 章 検証 36)
    if (process.argv.includes('--stage')) console.log(`Lv${lv}\tstageA ${stA.slotComp.toFixed(3)}\tstageB(T2_slot) ${t2.slotComp.toFixed(3)}\tstageA+B ${stAB.slotComp.toFixed(3)}`);
    const byPat = {};
    for (const [nm, r] of Object.entries(Object.assign({}, res.T1B, res.T2))) for (const [p, [c, n]] of Object.entries(r.byPat)) { byPat[p] = byPat[p] || {}; byPat[p][nm] = +(c / n).toFixed(2); }
    out.push({ lv, T1: +t1.single.toFixed(3), T1_slot: +t1.slotComp.toFixed(3), T1B: +t1b.single.toFixed(3), T1B_best: t1b.bestSingle, T1B_slot: +t1b.slotComp.toFixed(3), T1B_noFeedback: +noFb.single.toFixed(3), T2: +t2.single.toFixed(3), T2_slot: +t2.slotComp.toFixed(3), learnF1rP6: +learn.toFixed(3), byPat });
  }
  if (process.argv.includes('--stage')) { const s = STATS; console.log(`famAppear ${(s.famAppear / s.appear).toFixed(3)} famAns ${(s.famAns / s.ans).toFixed(3)} (expected ${(s.expAns / s.ans).toFixed(3)}) famAsked ${(s.famAsked / s.asked).toFixed(3)} (expected ${(s.expAsked / s.asked).toFixed(3)}) twoNameShare ${(s.twoName / s.bindStmts).toFixed(3)} h10Share ${(s.h10 / s.bindStmts).toFixed(3)} h10famPairs ${s.h10fam} t6Share3p ${(s.t6 / s.tSent3).toFixed(3)}`); process.exit(0); }
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else for (const o of out) console.log(`Lv${o.lv}\tT1 ${o.T1}/${o.T1_slot}\tT1B ${o.T1B}/${o.T1B_slot} (${o.T1B_best}, noFb ${o.T1B_noFeedback})\tT2 ${o.T2}/${o.T2_slot}\tlearn ${o.learnF1rP6}`);
}
module.exports = { buildSet, view, bind, readEvent, mulberry32, setR: f => { R = f; }, FC };
