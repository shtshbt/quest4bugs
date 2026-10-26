#!/usr/bin/env node
// Strict generator for kom_tokushu_kata (docs/komorebi_tokushu_kata_curriculum.md, v0.4.4).
// Every normative rule of chapters 3, 4, 5, 7, 8, 9 and 付表 B, C, D that says 必ず / 全数 / 上限 /
// 下限 / 比率 is implemented as written, with the probabilities the doc gives. The text tables
// (付表 B, its 差し込み table, 付表 C, 付表 D, 7.1, 3.1) are read from the doc itself. Where the doc
// leaves a choice open, the choice is marked "free:" in a comment. strict_check.js asserts chapter 10
// on the output. Items also carry the fields audit.js reads (words, nums, dseq, opts, ...).
//   const g = require('./strict_gen.js'); g.buildSet(lv, random, state)
'use strict';
const path = require('path');
const { loadDoc, section, tableIn } = require('./independent/doc_lib');

// ---------- doc tables ----------
const L = loadDoc();
const tB = tableIn(L, section(L, '付表 B'), 0);
const tDeco = tableIn(L, section(L, '付表 B'), 1);
const tC = tableIn(L, section(L, '付表 C'), 0);
const tD = tableIn(L, section(L, '付表 D'), 0);
const t71 = tableIn(L, section(L, '7.1 わざの語彙'), 0);
const t31 = tableIn(L, section(L, '3.1 型の全列挙'), 0);
const t33 = tableIn(L, section(L, '3.3 偽装語'), 0);
const SKB = {}; tB.rows.forEach(r => { SKB[r[0]] = { id: r[0], t: r[0].split(':')[0], sc: r[0].split(':')[1].slice(0, 2), s1: r[1], s2: r[2], q: r[3], f2: r[5] === '可', f3: r[6].startsWith('可') }; });
const SK_IDS = Object.keys(SKB);
const TYPE_NAME = {}; t31.rows.forEach(r => { TYPE_NAME[r[0]] = r[1].replace(/ \(.*\)$/, ''); });
const WAZA = {}; t71.rows.forEach(r => { if (r[1].length === 2) WAZA[r[1]] = { sign: r[2], step: r[3], typical: r[4] }; });
// deco table rows: word, skeletons, sentence, new text, computation, count
const DECO_ROWS = tDeco.rows.map((r, i) => ({ i, w: r[0].split(' ')[0].split('、')[0], sks: r[1].split('、').map(x => x.trim().replace(/〔和〕$/, '')), sent: r[2], text: r[3], calc: r[4], dn: r[5] === '+1' ? 1 : 0 }));
// W3、W4 ... rows are not in v0.4.4; each row names one word
const F5_GROUPS = tC.rows.map(r => ({ id: r[0], stem: r[1], sks: r[2].replace(/ \(.*\)/, '').split('、').map(x => x.trim().replace(/〔和〕$/, '')), targets: r[3].split('、').map(x => x.trim()) }));
const F6_ROWS = {}; tD.rows.forEach(r => { F6_ROWS[r[0]] = { id: r[0], first: r[1], second: r[2], q: r[3], cond: r[4], sc: r[5] }; });
const W33 = {}; t33.rows.forEach(r => { W33[r[0]] = r[1].split(/、/).map(x => x.trim()); });
// 4.5 の 7 (v0.4.4): the quoted form of the words whose 3.3 言い回し is a pattern or carries a note
Object.assign(W33, { W3: ['ずつ'], W6: ['ちがい', 'ちがう', '差', 'より'], W8: ['年後', '年前'], W9: ['さい', '年れい'] });

// ---------- constants from chapter 3, 4, 8 ----------
const TYPES = ['tk', 'kb', 'ws', 'sk', 'bp', 'hk', 'nr', 'br'];
const GA = ['tk', 'kb', 'ws', 'sk'], GB = ['bp', 'hk', 'nr', 'br'];
const KIN = [['tk', 'sk'], ['tk', 'kb'], ['tk', 'ws'], ['kb', 'hk'], ['ws', 'bp'], ['ws', 'nr'], ['bp', 'br'], ['bp', 'nr'], ['nr', 'br']];
const TABLE = { W1: 'kb', W2: 'kb', W3: 'kb', W4: 'tk', W5: 'ws', W6: 'ws', W7: 'bp', W8: 'nr', W9: 'nr', W10: 'hk', W11: 'br', W12: 'sk' };
const SCENE_TYPES = { B1: ['tk', 'kb', 'ws', 'bp'], B2: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk'], B3: ['tk', 'kb', 'ws', 'bp', 'hk', 'sk', 'br'], B4: ['ws', 'bp', 'nr', 'hk'], B5: ['tk', 'ws', 'hk', 'sk'], B6: ['tk', 'kb', 'ws'], B7: ['ws', 'bp', 'br'] };
const SCENE_TYPICAL = { B1: 'tk', B2: 'sk', B3: 'kb', B4: 'nr', B5: 'hk', B6: 'kb', B7: 'br' };
const FAMILY = ['さいとくん', 'ゆうとくん', 'しょうたくん', 'ゆきこさん'], NAME_POOL = ['はなさん', 'あおいさん'];
const TWO_PERSON = ['ws:B3', 'ws:B4', 'ws:B7', 'bp:B3', 'bp:B4', 'bp:B7', 'nr:B4a', 'nr:B4b', 'br:B3w', 'br:B3d', 'br:B7w', 'br:B7d', 'hk:B4'];
const GA_START = ['tk:B1', 'bp:B1', 'ws:B6'];
const LINKS = { R1: ['hk', 'ws'], R2: ['hk', 'tk'], R3: ['ws', 'nr'], R4: ['nr', 'bp'], R5: ['hk', 'bp'] };
const FMT_CODE = { F1: 'kata', F2: 'itte', F3: 'kimete', F4: 'shindan', F5: 'tsukuru', F6: 'renketsu' };
const CPS = { 3: ['CP6'], 4: ['CP3'], 5: ['CP3', 'CP6'], 7: ['CP3', 'CP6'], 8: ['CP3', 'CP6'] };
const CP = { CP3: [['bp:B3', 'br:B3w'], ['bp:B7', 'br:B7w']], CP5: [['br:B3d', 'br:B3w']], CP6: [['kb:B3', 'tk:B3']] };
const LVFMT = { 1: 'F2 F2 F2 F2 F2', 2: 'F2 F2 F2 F2 F2', 3: 'F1 F1 F1 F1 F1', 4: 'F1 F1 F1 F1 F1', 5: 'F1 F1 F1 F1 F1', 6: 'F3 F3 F4 F4 F1', 7: 'F2 F2 F2 F1 F1', 8: 'F5 F5 F1 F1 F2', 9: 'F6 F6 F6 F1 F1' };

// ---------- rng ----------
function rng(random) {
  const r = () => { const x = random(); if (!(x >= 0 && x < 1)) throw new Error('random() out of range'); return x; };
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const coin = (p = 0.5) => r() < p;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return { r, ri, pick, coin, shuffle };
}
class Redraw extends Error {}
class NoWord extends Redraw {}
const NOWORD = new NoWord();
const REDRAW = new Redraw(); const need = c => { if (!c) throw REDRAW; }; // one shared instance: no stack traces on redraws
function retry(f, n = 4000) { for (let i = 0; i < n; i++) { try { return f(); } catch (e) { if (e instanceof NoWord && n !== 50) throw e; if (!(e instanceof Redraw)) throw e; } } throw new Error('generation failed after retries'); }

// ---------- 9.2 slot ranges (transcribed row by row) ----------
// shown(v) lists the shown slots in text order per sentence; the common condition (2..99, distinct) is applied after.
function sampleSlots(R, id, v) {
  const { ri, coin } = R;
  switch (id) {
    case 'tk:B1': v.N = ri(4, 20); v.x = ri(1, v.N - 1); v.L = 2 * v.N + 2 * v.x; break;
    case 'tk:B2': v.b = ri(5, 15); v.a = v.b + ri(2, 10); v.N = ri(3, 9); v.x = ri(1, v.N - 1); v.T = v.a * v.x + v.b * (v.N - v.x); break;
    case 'tk:B3': v.p = ri(2, 6); v.q = v.p + ri(1, 3); v.N = ri(4, 12); v.x = ri(1, v.N - 1); v.T = v.p * (v.N - v.x) + v.q * v.x; break;
    case 'tk:B5': v.p = ri(3, 10); v.q = ri(2, 5); need(v.q !== v.p); v.N = ri(6, 20); v.c = ri(1, v.N - 1); v.S = v.p * v.c - v.q * (v.N - v.c); break;
    case 'tk:B6': v.c1 = ri(2, 4); v.c2 = v.c1 + ri(1, 3); v.N = ri(4, 15); v.x = ri(1, v.N - 1); v.P = v.c1 * (v.N - v.x) + v.c2 * v.x; break;
    case 'kb:B1': case 'kb:B3': case 'kb:B6': { v.p = ri(1, 6); v.q = v.p + ri(1, 3); v.n = ri(3, 12); const sp = (v.q - v.p) * v.n; need(sp >= 4); v.r = ri(2, sp - 2); v.s = sp - v.r; v.total = v.p * v.n + v.r; need(v.total <= 99); break; }
    case 'kb:B2m': { v.u = ri(5, 20); v.m = ri(1, 6); v.n = v.m + ri(1, 4); const sp = (v.n - v.m) * v.u; v.r = ri(2, sp - 2); v.s = sp - v.r; v.money = v.m * v.u + v.r; need(v.money <= 99); break; }
    case 'kb:B2s': v.u = ri(2, 10); v.p = ri(1, 3); v.q = v.p + ri(1, 2); v.n = ri(3, 10); v.D = v.u * (v.q - v.p) * v.n; break;
    case 'ws:B1': v.c = ri(2, 15); v.x = ri(1, 12); v.S = 2 * v.c + 4 * v.x; v.D = 4 * v.x - 2 * v.c; break;
    case 'ws:B4': v.y = ri(2, 10); v.x = ri(3, 20); v.D = ri(2, 10); v.S = 2 * (v.x + v.y) + v.D; break;
    case 'ws:B2': case 'ws:B5': v.sm = ri(5, 40); v.D = ri(2, 20); v.S = 2 * v.sm + v.D; break;
    case 'ws:B3': case 'ws:B6': case 'ws:B7': v.sm = ri(3, 40); v.D = ri(2, 20); v.S = 2 * v.sm + v.D; break;
    case 'sk:B2a': v.x = ri(5, 30); v.y = ri(3, 15); v.c = ri(3, 5); v.T1 = 2 * v.x + v.y; v.T2 = 2 * v.x + v.c * v.y; break;
    case 'sk:B5': v.x = ri(3, 20); v.y = ri(2, 15); v.c = ri(3, 5); v.T1 = 2 * v.x + v.y; v.T2 = 2 * v.x + v.c * v.y; break;
    case 'sk:B2b': v.x = ri(5, 40); v.y = ri(3, 20); v.T1 = v.x + v.y; v.T2 = v.x + 3 * v.y; break;
    case 'sk:B3': v.x = ri(3, 40); v.y = ri(2, 20); v.T1 = v.x + v.y; v.T2 = v.x + 3 * v.y; break;
    case 'bp:B1': case 'bp:B2': case 'bp:B3': case 'bp:B7': { v.y = ri(2, 20); v.k = ri(2, 5); v.c = ri(2, 9); const big = v.k * v.y + (v.vi === 0 ? v.c : -v.c); need(big > v.y); v.big = big; v.S = v.y + big; break; }
    case 'bp:B4': v.y = ri(2, 15); v.x = ri(3, 15); v.k = ri(2, 5); v.S = v.x * (v.k + 1); need(v.k * v.x <= 80); break;
    case 'hk:B2': v.a = ri(10, 40); v.c = v.a + (coin() ? 1 : -1) * ri(1, 6); v.rest = 4 * v.a - 3 * v.c; need(v.rest >= 2); break;
    case 'hk:B3': v.a = ri(5, 30); v.c = v.a + (coin() ? 1 : -1) * ri(1, 6); v.rest = 4 * v.a - 3 * v.c; need(v.rest >= 2); break;
    case 'hk:B4': v.n = ri(3, 6); v.a = ri(10, 30); v.b = ri(25, 45); v.kids = v.n * v.a - 2 * v.b; need(v.kids >= v.n - 2); break;
    case 'hk:B5': v.n = ri(3, 6); v.a = ri(50, 90); v.b = v.a + (coin() ? 1 : -1) * ri(1, 8); v.next = v.b * (v.n + 1) - v.a * v.n; need(v.next >= 1 && v.next <= 100); break;
    case 'nr:B4a': v.B = ri(2, 20); v.k = ri(2, 5); v.t = ri(2, 20); v.A = v.k * (v.B + v.t) - v.t; need(v.A <= 80 && v.A - v.B >= 20); break;
    case 'nr:B4b': { v.k = ri(2, 5); v.m = ri(5, 20); v.y = ri(2, v.m - 2); v.D = v.m * (v.k - 1); need(v.D >= 20 && v.D <= 60); break; }
    case 'br:B3w': case 'br:B7w': { v.k = ri(2, 4); v.z = ri(3, 20); v.S = (v.k + 1) * v.z; v.m = ri(2, v.z - 2); need(v.m >= 2); v.B = v.z - v.m; v.A = v.k * v.z + v.m; break; }
    case 'br:B3d': case 'br:B7d': v.k = ri(2, 4); v.B = ri(2, 30); v.e = ri(2, 15); v.A = v.k * (v.B + v.e) - v.e; need(v.A > v.B); break;
    default: throw new Error('no range for ' + id);
  }
}
// shown numbers per sentence (slot names; '#n' fixed numerals) for the base text

// ---------- rendering ----------
const useIdx = (s, i) => s.replace(/〈([^〉]*)〉/g, (_, x) => { const a = x.split(' / ').map(y => y.trim()); return a[Math.min(i, a.length - 1)]; });
const formPart = (s, f) => { if (!s.includes('〔')) return s; const m = s.split(/〔([^〕]*)〕/); for (let i = 1; i < m.length; i += 2) if (m[i] === f) return m[i + 1].trim(); throw new Error('form ' + f + ' missing'); };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => { if (v[k] === undefined) throw new Error('slot ' + k + ' unset in ' + s); return String(v[k]); });
// person names (4.3 規則 13, 付表 B の人名の差し込み)
const ROLE1 = ['兄', '姉', '父'], ROLE2 = ['弟', '妹', '子', '母'];
function putNames(text, names, two) {
  if (!two) return text;
  return text.replace(/(^|[\s、「])(兄|姉|父|弟|妹|子|母)(?=(は|が|の|と|に|より|を|で|も)[\s、])/g, (m, pre, role) => pre + (ROLE1.includes(role) ? names[0] : names[1]));
}
function render(p) {
  const sk = SKB[p.sk];
  let s1 = useIdx(formPart(sk.s1, p.fm), p.vi), s2 = useIdx(formPart(sk.s2, p.fm), p.vi), q = useIdx(formPart(sk.q, p.fm), p.qi !== undefined ? p.qi : p.vi);
  if (p.deco) { const row = DECO_ROWS[p.deco.row]; let t = useIdx(row.text.replace(/\s*\(b が a より低いときは「低く」\)/, ''), p.vi); if (p.sk === 'hk:B5' && row.w === 'W6' && p.v.b < p.v.a) t = t.replace('高く', '低く'); if (row.sent === 's1') s1 = t; else s2 = t; }
  const v = Object.assign({}, p.v, p.deco ? p.deco.nums : {});
  s1 = fill(s1, v); s2 = fill(s2, v); q = fill(q, v);
  const two = TWO_PERSON.includes(p.sk);
  if (two) { s1 = putNames(s1, p.names, true); s2 = putNames(s2, p.names, true); q = putNames(q, p.names, true); }
  else if (!p.swapped) s1 = (GA_START.includes(p.sk) && !(p.deco && DECO_ROWS[p.deco.row].sent === 's1') ? p.names[0] + 'が 見ると、' : p.names[0] + 'は、') + s1;
  else s2 = p.names[0] + 'は、' + s2; // the name goes to the sentence shown first (付表 B の人名の差し込み)
  return { s1, s2, q };
}
// 3.3 word detection on a text (語の単位。問いの形の「何年後」「何さい」は数えない)
const WRE = {
  W1: /あま(る|り|ります|りました|った|らせ)/, W2: /たりな|たりず|たりませ/, W3: /ずつ/, W4: /足/, W5: /あわせて|和/, W6: /ちがい|ちがう|ちがいま|差|より/,
  W7: /倍/, W8: /\d+ 年後|\d+ 年前|か月後/, W9: /\d+ さい|年れい/, W10: /平均/, W11: /あげ|もらう|もらい|もらっ/, W12: /\S+と [^。]*?\S+で[、 ]/,
};
function wordsOf(text) { const t = text.replace(/まちが/g, '##').replace(/小さい/g, '##'); return Object.keys(WRE).filter(w => WRE[w].test(t)); }
function wordPositions(text) { const t = text.replace(/まちが/g, '##').replace(/小さい/g, '##'); return Object.keys(WRE).map(w => { const m = t.match(WRE[w]); return m ? { w, at: m.index } : null; }).filter(Boolean).sort((a, b) => a.at - b.at); }
// 4.7 の 3: shown numbers (values) in display order, excluding 1 and the "2 人" / "2 つの" that name the two people or amounts
function numbersOf(text) {
  const out = []; const re = /(\d+)( ?)(\S?)/g; let m;
  const clean = text;
  for (const mm of clean.matchAll(/(-?\d+) (?=(\S+))/g)) { const n = +mm[1]; const rest = mm[2]; if (n === 1) continue; if (n === 2 && (/^人(が|の|は|と)/.test(rest) || /^つの/.test(rest))) continue; out.push(n); }
  return out;
}

// ---------- variants (4.3 規則 4) ----------
function chooseVariant(R, sk, lv, force) {
  if (force.vi !== undefined) return force.vi;
  const t = sk.t;
  if (t === 'kb') return ['kb:B1', 'kb:B2m', 'kb:B3'].includes(sk.id) ? (R.coin() ? 0 : 1) : 0;
  if (t === 'hk') return lv <= 2 && R.coin(0.4) ? 0 : 1;
  if (t === 'bp') return sk.id === 'bp:B4' ? 0 : (R.coin() ? 0 : 1);
  if (sk.id === 'br:B3d') return R.coin(0.7) ? 0 : 1;
  if (sk.id === 'br:B3w' || sk.id === 'br:B7w') return R.coin(0.8) ? 0 : 1;
  if (sk.id === 'nr:B4a') return 0;
  if (t === 'ws') return R.coin() ? 0 : 1; // v0.4.4: より form or the cue-free form
  if (['sk:B2a', 'sk:B2b', 'sk:B3'].includes(sk.id)) return R.coin() ? 0 : 1; // v0.4.4: 〜と〜で or the cue-free form
  return 0;
}
// ---------- the one step and errors (付表 B 一手、4.5 章の 3 の表) as operand structures ----------
// operand: {v, t, kind}  kind T = one shown number, P1 = (y + 1), C = built from shown numbers, K = constant not in text
const opT = (v, slot) => ({ v, t: String(v), kind: 'T', slot });
const opP1 = y => ({ v: y + 1, t: `(${y} + 1)`, kind: 'P1', y });
const opK = v => ({ v, t: String(v), kind: 'K' });
function opSlot(p, slot) { // a slot that a deco replaced is written as its computation
  const d = p.deco; if (d && d.slot === slot) return { v: p.v[slot], t: `(${d.expr})`, kind: 'C', inner: d.expr };
  return opT(p.v[slot], slot);
}
function opBuilt(p, a, op, b) { // (a op b) from two slots; a replaced slot is opened without nested brackets
  const A = opSlot(p, a); const inner = (A.kind === 'C' ? A.inner : A.t) + ` ${op} ` + p.v[b];
  return { v: op === '−' ? p.v[a] - p.v[b] : p.v[a] + p.v[b], t: `(${inner})`, kind: 'C', inner };
}
function oneStep(p) {
  const id = p.sk, t = p.t, v = p.v;
  if (id === 'tk:B1') return { o: '×', P: [opK(2), opSlot(p, 'N')] };
  if (t === 'tk') return { o: '×', P: [opSlot(p, { 'tk:B2': 'b', 'tk:B3': 'p', 'tk:B5': 'p', 'tk:B6': 'c1' }[id]), opSlot(p, 'N')] };
  if (t === 'kb') return id === 'kb:B2s' ? null : { o: '+', P: [opSlot(p, 'r'), opSlot(p, 's')] };
  if (t === 'ws') return { o: '−', P: [opSlot(p, 'S'), opSlot(p, 'D')] };
  if (t === 'sk') return { o: '−', P: [opSlot(p, 'T2'), opSlot(p, 'T1')] };
  if (id === 'bp:B4') return { o: '÷', P: [opSlot(p, 'S'), opP1(v.k)] };
  if (t === 'bp') return { o: '÷', P: [opBuilt(p, 'S', p.vi === 0 ? '−' : '+', 'c'), opP1(v.k)] };
  if (t === 'hk') return { o: '×', P: [opSlot(p, 'a'), ['hk:B2', 'hk:B3'].includes(id) ? opT(4) : opSlot(p, 'n')] };
  if (t === 'nr') return id === 'nr:B4b' ? null : { o: '−', P: [opSlot(p, 'A'), opSlot(p, 'B')] };
  if (id === 'br:B3w' || id === 'br:B7w') return p.fm === '両方' ? { o: '÷', P: [opBuilt(p, 'A', '+', 'B'), opP1(v.k)] } : { o: '÷', P: [opSlot(p, 'S'), opP1(v.k)] };
  return { o: '−', P: [opSlot(p, 'A'), opSlot(p, 'B')] };
}
// in-type errors of the 4.5 章の 3 table: [label, op, P]
function typeErrors(p) {
  const id = p.sk, t = p.t, v = p.v; const S = s => opSlot(p, s);
  if (t === 'tk') return id === 'tk:B5' ? [['M6', '×', [S('q'), S('N')]]] : id === 'tk:B1' ? [['M6', '×', [opK(2), S('L')]]] : [['M6', '×', [S({ 'tk:B2': 'b', 'tk:B3': 'p', 'tk:B6': 'c1' }[id]), S({ 'tk:B2': 'T', 'tk:B3': 'T', 'tk:B6': 'P' }[id])]]];
  if (t === 'kb') return id === 'kb:B2m' ? [['M6', '+', [S('m'), S('n')]]] : [['M6', '+', [S('p'), S('q')]]];
  if (t === 'ws') return [['M9', '÷', [S('S'), opK(2)]]];
  if (t === 'sk') return [['M10', '+', [S('T2'), S('T1')]]];
  if (id === 'bp:B4') return [['M8', '÷', [S('S'), S('k')]]];
  if (t === 'bp') return [['M9', '÷', [S('S'), opP1(v.k)]], ['M8', '÷', [opBuilt(p, 'S', p.vi === 0 ? '−' : '+', 'c'), S('k')]]];
  if (t === 'hk') return [['M6', '×', [S(id === 'hk:B4' || id === 'hk:B5' ? 'b' : 'c'), ['hk:B2', 'hk:B3'].includes(id) ? opT(4) : S('n')]]];
  if (id === 'nr:B4a') return [['M7', '÷', [S('A'), S('k')]]];
  if ((id === 'br:B3w' || id === 'br:B7w') && p.fm !== '両方') return [['M7', '÷', [opBuilt(p, 'S', '−', 'm'), opP1(v.k)]]];
  if (id === 'br:B3w') return [['M8', '÷', [opBuilt(p, 'A', '+', 'B'), S('k')]], ['M16', '−', [S('A'), S('B')]], ['M7', '÷', [S('A'), S('k')]]];
  return [['M16', '÷', [opBuilt(p, 'A', '+', 'B'), opP1(v.k)]], ['M7', '÷', [S('A'), S('k')]]];
}
// forbidden expressions (4.5 章の 4)
function forbidden(p, o, P) {
  const id = p.sk, t = p.t, v = p.v; const vals = P.map(x => x.v).sort((a, b) => a - b).join(',');
  if (t === 'tk' && id !== 'tk:B5' && o === '×') { const big = { 'tk:B1': 4, 'tk:B2': v.a, 'tk:B3': v.q, 'tk:B6': v.c2 }[id]; if (vals === [big, v.N].sort((a, b) => a - b).join(',')) return true; }
  if (t === 'ws' && o === '+' && vals === [v.S, v.D].sort((a, b) => a - b).join(',')) return true;
  if (t === 'kb' && o === '−') { const pr = id === 'kb:B2m' ? [v.m, v.n] : [v.p, v.q]; if (vals === pr.sort((a, b) => a - b).join(',')) return true; }
  if (id === 'hk:B5' && o === '×' && vals === [v.b, v.n + 1].sort((a, b) => a - b).join(',')) return true;
  return false;
}
const OPS = ['+', '−', '×', '÷'];
function order(o, P) { if ((o === '−' || o === '÷') && P[0].v < P[1].v) return [P[1], P[0]]; return P; }
const exprText = (o, P) => { const Q = order(o, P); return `${Q[0].t} ${o} ${Q[1].t}`; };
const writtenNums = (o, P) => order(o, P).flatMap(x => (x.t.match(/\d+/g) || []).map(Number));
// the look (4.5 章の 3)
function lookOf(p, o, P) {
  const nums = writtenNums(o, P); const text = p.shownVals; const mx = Math.max(...text); const f2 = p.first2;
  return o + '|' + (nums.includes(mx) ? 'M' : '') + (nums.every(x => f2.includes(x)) ? 'F' : '') + (nums.includes(p.dseq[0]) ? '1' : '') + (nums.every(x => text.includes(x)) ? 'T' : 'D');
}
function buildF2(R, p) {
  const st = oneStep(p); if (!st) throw new Redraw();
  const { o, P } = st; const looks = (oo, PP) => lookOf(p, oo, PP);
  const cl = looks(o, P);
  const text = p.shownVals;
  // P' candidates (4.5 章の 3)
  const alts = [];
  P.forEach((x, i) => {
    let reps = [];
    if (x.kind === 'T') reps = text.filter(y => y !== x.v && !P.some(q => q.kind === 'T' && q.v === y)).map(y => opT(y));
    if (x.kind === 'P1') reps = text.filter(y => y <= 9 && y !== x.y && !text.includes(y + 1)).map(y => opP1(y));
    reps.forEach(rp => { const Q = P.slice(); Q[i] = rp; alts.push([Q, 'M6']); });
  });
  const errs = typeErrors(p);
  const same = alts.filter(([Q]) => looks(o, Q) === cl);
  const seen = new Set([exprText(o, P)]);
  const cells = [{ txt: exprText(o, P), o, P, m: null }];
  const add = (oo, PP, m) => { const e = exprText(oo, PP); if (seen.has(e) || forbidden(p, oo, PP)) return false; seen.add(e); cells.push({ txt: e, o: oo, P: PP, m }); return true; };
  if (same.length) {
    const [Q, lab] = R.pick(same);
    const opAlts = errs.filter(e => e[2].map(x => x.v).join() === P.map(x => x.v).join() && e[1] !== o);
    let o2, lab2 = 'M11';
    if (opAlts.length && R.coin()) { o2 = opAlts[0][1]; lab2 = opAlts[0][0]; } else { o2 = R.pick(OPS.filter(x => x !== o)); if (p.t === 'sk' && o2 === '+') lab2 = 'M10'; }
    need(add(o, Q, lab) && add(o2, P, lab2) && add(o2, Q, 'M11'));
    p.gridKind = '2x2';
  } else {
    const nFill = R.coin() ? 2 : 1;
    const forbOp = OPS.find(x => x !== o && forbidden(p, x, P));
    const others = R.shuffle(OPS.filter(x => x !== o && x !== forbOp));
    for (const oo of others.slice(0, 3 - nFill)) need(add(oo, P, p.t === 'sk' && oo === '+' ? 'M10' : 'M11'));
    // fillers: P' with another look (M6), in-type errors, (y + 1) pairs, (k + 1) -> k, ws S ÷ 2
    const fills = alts.slice();
    for (const e of errs) fills.push([e[2], e[0], e[1]]);
    for (const y of text.filter(y => y <= 9)) P.forEach((x, i) => { if (x.kind === 'T') { const Q = P.slice(); Q[i] = opP1(y); fills.push([Q, 'M6']); } });
    P.forEach((x, i) => { if (x.kind === 'P1') { const Q = P.slice(); Q[i] = opT(x.y); fills.push([Q, 'M8']); } });
    let guard = 0;
    while (cells.length < 4 && guard++ < 80) {
      const wantD = R.coin();
      const pool = fills.filter(([Q]) => Q.every(x => x.kind === 'T') !== wantD);
      if (!pool.length) continue;
      const [Q, lab, eop] = R.pick(pool);
      const oo = eop && eop !== o ? eop : (R.coin() ? o : R.pick(OPS));
      add(oo, Q, oo === o || oo === eop ? lab : 'M11');
    }
    // v0.4.4 (4.5 の 3): when the filler candidates run short, other operations on P fill the rest
    for (const oo of R.shuffle(OPS.filter(x => x !== o))) { if (cells.length >= 4) break; add(oo, P, p.t === 'sk' && oo === '+' ? 'M10' : 'M11'); }
    need(cells.length === 4);
    p.gridKind = '1x4';
  }
  const sh = R.shuffle(cells);
  p.options = sh.map(c => c.txt); p.ans = sh.findIndex(c => c.m === null); p.optionTypes = sh.map(c => c.m);
  p.optionMeta = sh.map(c => ({ o: c.o, vals: c.P.map(x => x.v), written: writtenNums(c.o, c.P), look: looks(c.o, c.P) }));
  // audit.js view: opts with f.sh / f.v (written numerals), m
  p.opts = sh.map(c => ({ f: { sh: { '+': 'a+b', '−': 'a-b', '×': 'a*b', '÷': 'a/b' }[c.o], v: writtenNums(c.o, c.P) }, m: c.m, txt: c.txt }));
}

// ---------- deco (4.3 規則 1、9、付表 B の差し込みの表) ----------
function decoRowsFor(p) { return DECO_ROWS.filter(r => r.sks.includes(p.sk) && !(p.sk === 'br:B3w' && p.fm !== '和')); }
function applyDeco(R, p, row) {
  // computation column: replace the slot by the new numbers (free: the new numbers are drawn uniformly within 2..99)
  const v = p.v, calc = row.calc; const n = {}; let slot = null, expr = null;
  const m = calc.match(/^(\w+)(?: \((bp|sk) は (\w+)\))? = (\w+) ([−+]) (\w+)$/);
  if (m) {
    slot = m[2] && p.t === m[2] ? m[3] : m[1];
    m.splice(1, 3, m[1]); // keep [full, slot0, a, op, b]
    const [, , a, op, b] = m;
    const Z = v[slot]; if (a === 'X' || a === 'S0') need(Z !== undefined && Z >= 2 && Z <= 99); // the replaced slot keeps 9.2's conditions
    if (a === 'X' && op === '−') { const lo = 2, hi = 99 - Z; need(hi >= lo); n[b] = R.ri(lo, hi); n.X = Z + n[b]; expr = `${n.X} − ${n[b]}`; }
    else if (a === 'X' && op === '+') { need(Z - 2 >= 2); n[b] = R.ri(2, Z - 2); n.X = Z - n[b]; expr = `${n.X} + ${n[b]}`; }
    else if (a === 'S0' && op === '+') { need(Z - 2 >= 2); n.X = R.ri(2, Z - 2); n.S0 = Z - n.X; expr = `${n.S0} + ${n.X}`; }
    else if (a === 'q' && op === '−') { n.d = v.q - v.p; need(n.d >= 2); slot = null; }
    else if (a === 'a' && op === '+') { n.d = v.b - v.a; need(n.d >= 2); slot = null; }
    else throw new Error('calc ' + calc);
  } else if (calc === 'b = a ± d') { n.d = Math.abs(v.b - v.a); need(n.d >= 2); }
  else if (calc !== '(変わらない)') throw new Error('calc ' + calc);
  p.deco = { w: row.w, row: row.i, nums: n, slot: row.dn ? slot : null, expr: row.dn ? expr : null, dn: row.dn, sent: row.sent };
}
// ---------- names ----------
function drawNames(R, sk) { const two = TWO_PERSON.includes(sk) || ['R1', 'R3', 'R4', 'R5'].includes(sk); const f = R.pick(FAMILY); if (!two) return [f]; const o = R.pick(NAME_POOL); return R.coin() ? [f, o] : [o, f]; }

// ---------- one problem from a skeleton ----------
function common(R, id, lv, force = {}) {
  const sk = SKB[id];
  const p = { sk: id, t: sk.t, sc: sk.sc, lv };
  p.vi = chooseVariant(R, sk, lv, force);
  p.fm = force.fm || (id === 'br:B3w' ? (R.coin() ? '和' : '両方') : '和');
  if (id === 'nr:B4a') p.qi = force.qi !== undefined ? force.qi : (R.coin(1 / 3) ? 0 : 1);
  p.v = force.v ? Object.assign({ vi: p.vi }, force.v) : (() => { const v = { vi: p.vi }; sampleSlots(R, id, v); return v; })();
  p.names = force.names || drawNames(R, id);
  p.deco = null;
  return p;
}
function finish(p, showQ) {
  const t = render(p); p.s1 = t.s1; p.s2 = t.s2; p.hq = t.q;
  // 9.2 共通の条件: shown numbers 2..99 and distinct (a repeated fixed numeral counts once)
  const body = p.s1 + ' ' + p.s2;
  const nums = numbersOf(body);
  need(nums.every(x => x >= 2 && x <= 99));
  const uniq = [...new Set(nums)]; const reps = nums.length - uniq.length;
  const fixedRepeat = ['sk:B2a', 'sk:B5'].includes(p.sk); // the fixed 2 of 「ガム 2 こ」「A を 2 問」 appears in both sentences
  need(reps === 0 || (fixedRepeat && reps === 1 && nums.filter(x => x === 2).length === 2));
  p.nums = uniq; p.seq = nums;
  if (p.deco) need(Object.values(p.deco.nums).every(x => nums.includes(x))); // a new number must not read as 「2 人が」 (4.7 の 3)
  return p;
}
function wordsSetup(p, showQ) {
  const t1 = p.s1, t2 = p.s2, tq = showQ ? p.hq : '';
  const pos = []; [t1, t2, tq].forEach((t, s) => wordPositions(t).forEach(x => pos.push({ w: x.w, s, o: s + x.at / 1000 })));
  p.words = pos; p.wordSet = [...new Set(pos.map(x => x.w))];
}
// ---------- formats ----------
function lengthOK(p, cap, showQ) { const strip = s => s.replace(/(さいとくん|ゆうとくん|しょうたくん|ゆきこさん|はなさん|あおいさん)/g, ''); const n = [...strip(p.s1 + p.s2 + p.hq).replace(/\s/g, '')].length; return n <= cap; }
const CAP = id => (['hk:B2', 'hk:B3', 'sk:B2a', 'sk:B2b', 'sk:B3', 'sk:B5', 'ws:B5'].includes(id) ? 80 : 70); // 4.7 の 2 (ws:B5 は v0.4.4)
// 4.3 規則 1 (v0.4.4): one word is drawn uniformly from the words of the scene's pool (9.2 章); when the skeleton
// cannot carry it (no row in the 付表 B table) or the text already has it, no deco is attached
const POOL_WORDS = {}; for (const r of DECO_ROWS) for (const k of r.sks) { const sc = SKB[k].sc; POOL_WORDS[sc] = POOL_WORDS[sc] || []; if (!POOL_WORDS[sc].includes(r.w)) POOL_WORDS[sc].push(r.w); }
function tryDeco(R, p, opt = {}) {
  let rows;
  if (opt.onlyNum) rows = decoRowsFor(p).filter(r => !p.wordSetBase.includes(r.w) && r.dn === 1);
  else { const w = R.pick(POOL_WORDS[p.sc]); p.decoDrew = true; rows = decoRowsFor(p).filter(r => r.w === w && !p.wordSetBase.includes(r.w)); }
  if (!rows.length) return false;
  const row = R.pick(rows);
  try { applyDeco(R, p, row); } catch (e) { if (e instanceof Redraw) { p.deco = null; return false; } throw e; }
  return true;
}
// 4.3 規則 1 and 9 with the 付表 B table: the word is chosen first; when the new numbers cannot be placed in
// 2..99 the slots are drawn again with the same word (v0.4.4); when the text goes over 4.7's cap the deco is dropped
// 4.3 規則 1 (v0.4.4): the word is drawn once per problem; when the numbers do not fit, the slots are drawn again and
// the drawn word is kept (drawing it again on each retry favoured the words whose forms redraw the slots inside decorate)
const pickDeco = (R, sc) => { const drew = R.coin(0.7); return { drew, w: drew ? R.pick(POOL_WORDS[sc]) : null }; };
function decorate(R, p, lv, force, opt = {}) {
  p.decoDrew = false;
  let rows = null;
  if (opt.topup) rows = decoRowsFor(p).filter(r => !p.wordSetBase.includes(r.w) && r.dn === 1);
  else if (!opt.none && (force.decoPick ? force.decoPick.drew : R.coin(0.7))) { const w = force.decoPick ? force.decoPick.w : R.pick(POOL_WORDS[p.sc]); p.decoDrew = true; p.decoWord = w; rows = decoRowsFor(p).filter(r => r.w === w && !p.wordSetBase.includes(r.w)); }
  if (rows && rows.length) {
    const row = R.pick(rows); let q = p;
    for (let k = 0; k < 60; k++) {
      try { applyDeco(R, q, row); finish(q); if (lengthOK(q, CAP(q.sk))) return q; q.deco = null; break; }
      catch (e) {
        if (!(e instanceof Redraw)) throw e;
        const keep = { decoDrew: q.decoDrew, decoWord: q.decoWord, swapped: q.swapped };
        q = common(R, p.sk, lv, Object.assign({}, force, { vi: p.vi, fm: p.fm, qi: p.qi, names: p.names, v: undefined }));
        Object.assign(q, keep); baseWords(q);
      }
    }
    if (opt.topup) throw REDRAW;
    q.deco = null; finish(q); return q;
  }
  if (opt.topup) throw REDRAW;
  p.deco = null; finish(p); return p;
}
function baseWords(p) { const t = render(Object.assign({}, p, { deco: null })); p.wordSetBase = wordsOf(t.s1 + ' ' + t.s2 + ' ' + t.q); }
function makeF1(R, lv, sc, S, force = {}) {
  return retry(() => {
    const feas = S.filter(t => sceneTypes(lv, sc).includes(t)); need(feas.length);
    const t = force.t || R.pick(feas);
    const ids = SK_IDS.filter(k => SKB[k].t === t && SKB[k].sc === sc); need(ids.length);
    let p = common(R, force.id || R.pick(ids), lv, force);
    baseWords(p);
    // 4.4 の 6 (v0.4.4): the two problems of a pair carry no deco
    p = decorate(R, p, lv, force, { none: force.pair || lv < 3 });
    if (!force.pair && p.nums.length < 3) { // 4.3 規則 9: the one deco becomes a +1 form
      p.deco = null; finish(p); const drew = p.decoDrew; p = decorate(R, p, lv, force, { topup: true }); p.topup = true; p.decoDrew = drew;
    }
    if (!force.pair) need(p.nums.length >= 3 && p.nums.length <= 4);
    need(lengthOK(p, CAP(p.sk)));
    p.fmt = 'F1'; wordsSetup(p, false);
    p.optionTypesList = S.slice(); p.opts = R.shuffle(S); p.ans = p.opts.indexOf(p.t); need(p.ans >= 0);
    return p;
  });
}
const sceneTypes = (lv, sc) => SCENE_TYPES[sc].filter(t => !['B1', 'B6'].includes(sc) && !(lv === 3 && ['B4', 'B5', 'B7'].includes(sc)) && !(lv === 4 && ['B1', 'B2', 'B5', 'B6'].includes(sc)) && (lv === 3 ? GA.includes(t) : lv === 4 ? GB.includes(t) : true)); // F1 scenes (4.2 の 4, v0.4.4)
function scenesFor(lv) { return Object.keys(SCENE_TYPES).filter(sc => sceneTypes(lv, sc).length); }
function optionSet(R, lv, sc, must) {
  if (lv === 3) return GA.slice();
  if (lv === 4) return sc === 'B4' ? ['bp', 'hk', 'nr', 'ws'] : GB.slice();
  const on = R.shuffle(SCENE_TYPES[sc]); const S = must.slice();
  for (const t of on) if (S.length < 4 && !S.includes(t)) S.push(t);
  // free: the off-scene type for 3-type scenes is drawn uniformly from the rest
  const off = R.shuffle(TYPES.filter(t => !S.includes(t)));
  while (S.length < 4) S.push(off.shift());
  return S;
}
function drawF1(R, lv) {
  const sc = R.pick(scenesFor(lv)); const S = optionSet(R, lv, sc, []);
  const p = makeF1(R, lv, sc, S);
  if (S.includes('br') && p.t === 'nr') throw new Redraw();
  return p;
}
function drawF2(R, lv, force = {}) {
  const range = lv === 1 ? GA : lv === 2 ? GB : TYPES;
  const t0 = force.t || R.pick(range); const ids0 = SK_IDS.filter(k => SKB[k].t === t0 && SKB[k].f2); const id0 = force.id || R.pick(ids0);
  const dp = pickDeco(R, SKB[id0].sc);
  return retry(() => {
    let p = common(R, id0, lv, force); baseWords(p);
    p.swapped = R.coin();
    p = decorate(R, p, lv, Object.assign({}, force, { decoPick: dp }), { none: lv < 3 || force.pair });
    need(lengthOK(p, CAP(p.sk)));
    const n1 = numbersOf(p.s1), n2 = numbersOf(p.s2);
    p.dseq = p.swapped ? n2.concat(n1) : n1.concat(n2); p.shownVals = p.nums; p.first2 = [...new Set(p.dseq)].slice(0, 2);
    p.fmt = 'F2'; p.named = lv <= 2; wordsSetup(p, true);
    if (p.swapped) p.words.forEach(x => { if (x.s < 2) { x.s = 1 - x.s; x.o += x.s === 0 ? -1 : 1; } });
    buildF2(R, p);
    return p;
  });
}
function drawF3(R, lv) {
  const ids = SK_IDS.filter(k => SKB[k].f3);
  const w = id => (id.startsWith('ws') ? 0.6 : id === 'nr:B4a' ? 0.8 : 1);
  let u = R.r() * ids.reduce((a, id) => a + w(id), 0); let id = ids[ids.length - 1]; for (const k of ids) { u -= w(k); if (u < 0) { id = k; break; } }
  const dp = pickDeco(R, SKB[id].sc);
  return retry(() => {
    let p = common(R, id, lv, { fm: '和' }); baseWords(p);
    p.swapped = R.coin();
    p = decorate(R, p, lv, { fm: '和', decoPick: dp }); need(lengthOK(p, CAP(p.sk)));
    p.fmt = 'F3';
    const sents = p.swapped ? [p.s2, p.s1, p.hq] : [p.s1, p.s2, p.hq];
    p.keyText = p.s2; p.keyRole = p.swapped ? 0 : 1;
    wordsSetup(p, true);
    if (p.swapped) p.words.forEach(x => { if (x.s < 2) x.s = 1 - x.s; });
    p.roleWords = [0, 1, 2].map(r => [...new Set(p.words.filter(x => x.s === r).map(x => x.w))]);
    p.qfirst = false; p.disp = [0, 1, 2];
    const ord = R.shuffle([0, 1, 2]); p.opts = ord; p.options = ord.map(i => sents[i]); p.ans = ord.indexOf(p.keyRole);
    p.optionTypes = ord.map(i => (i === p.keyRole ? null : 'M13'));
    return p;
  });
}
function drawF4(R, lv) {
  // 4.5 の 7 (v0.4.4): a problem without any 3.3 word cannot carry a proposal; the type and skeleton are drawn again
  return retry(() => drawF4once(R, lv), 50);
}
function drawF4once(R, lv, idForce) {
  const t = R.pick(TYPES); const id = idForce || R.pick(SK_IDS.filter(k => SKB[k].t === t));
  const dp = pickDeco(R, SKB[id].sc);
  return retry(() => {
    let p = common(R, id, lv); baseWords(p);
    p = decorate(R, p, lv, { decoPick: dp }); need(lengthOK(p, CAP(p.sk)));
    p.fmt = 'F4'; wordsSetup(p, true);
    const ws = p.wordSet.filter(w => !(p.t === 'nr' && TABLE[w] === 'br')); if (!ws.length) throw NOWORD;
    const w = R.pick(ws), P = TABLE[w]; p.propWord = w; p.prop = P; p.propCorrect = P === p.t;
    const textAll = p.s1 + ' ' + p.s2 + ' ' + p.hq;
    if (w === 'W12') { const m = textAll.match(/(\S+と [^。、]*?\S+で)[、 ]/); p.quote = m ? m[1] : '〜と 〜で'; } // 4.5 の 7: the matched 「{名詞}と {名詞}で」
    else p.quote = W33[w].find(f => textAll.includes(f)) || W33[w][0];
    const exclude = x => x === P || (p.t === 'nr' && x === 'br');
    const pool = R.shuffle(TYPES.filter(x => !exclude(x)));
    let X, Y; if (p.propCorrect) [X, Y] = pool.slice(0, 2); else { X = p.t; Y = pool.find(x => x !== X); }
    const used = new Set(p.names); p.person = R.pick(FAMILY.concat(NAME_POOL).filter(x => !used.has(x)));
    const ops = R.shuffle([{ k: 'acc' }, { k: 'rej', t: X }, { k: 'rej', t: Y }]);
    p.opts = ops; p.options = ops.map(o => (o.k === 'acc' ? 'そのとおり' : 'ちがう。' + TYPE_NAME[o.t]));
    p.ans = ops.findIndex(o => (p.propCorrect ? o.k === 'acc' : o.k === 'rej' && o.t === p.t));
    p.optionTypes = ops.map((o, i) => (i === p.ans ? null : o.k === 'acc' ? 'M14' : p.propCorrect ? 'M15' : 'M12'));
    p.lead = `${p.person}は、「${p.quote}」と 書いて あるので ${TYPE_NAME[P]}だと 考えました。`;
    const strip = s2 => s2.replace(/(さいとくん|ゆうとくん|しょうたくん|ゆきこさん|はなさん|あおいさん)/g, '').replace(/\s/g, '');
    need([...strip(p.lead + p.s1 + p.s2 + p.hq)].length <= CAP(p.sk) + 30); // 4.7 の 2 (v0.4.4)
    return p;
  });
}
// F5 (付表 C)
function f5Option(R, id, S, force = {}) {
  const sk = SKB[id]; const vi = force.vi !== undefined ? force.vi : chooseVariant(R, sk, 8, {});
  const v = { vi, S };
  if (sk.t === 'ws') { v.D = R.ri(2, 20); need((S - v.D) % 2 === 0); v.sm = (S - v.D) / 2; need(v.sm >= (id === 'ws:B2' ? 5 : 3) && v.sm <= 40); }
  else if (sk.t === 'bp') { v.k = R.ri(2, 5); v.c = R.ri(2, 9); const y = (S - (vi === 0 ? v.c : -v.c)) / (v.k + 1); need(Number.isInteger(y) && y >= 2 && y <= 20); v.y = y; v.big = S - y; need(v.big > y); }
  else if (sk.t === 'br') { v.k = R.ri(2, 4); need(S % (v.k + 1) === 0); v.z = S / (v.k + 1); need(v.z >= 3 && v.z <= 20); v.m = R.ri(2, v.z - 2); need(v.m >= 2); v.B = v.z - v.m; v.A = v.k * v.z + v.m; }
  else if (sk.t === 'sk') { v.T1 = S; v.y = R.ri(3, 20); v.x = S - v.y; need(v.x >= 5 && v.x <= 40); v.T2 = v.x + 3 * v.y; need(v.T2 <= 99); }
  return { id, t: sk.t, v, vi };
}
function drawF5(R, lv) {
  return retry(() => {
    const g = R.pick(F5_GROUPS); const target = R.pick(g.targets);
    const tid = g.sks.find(k => SKB[k].t === target);
    const base = common(R, tid, lv, { fm: '和', vi: target === 'br' ? 0 : undefined });
    const S = target === 'sk' ? base.v.T1 : base.v.S;
    const opts = [{ id: tid, t: target, v: base.v, vi: base.vi, correct: true }];
    const others = g.sks.filter(k => SKB[k].t !== target);
    let guard = 0;
    while (opts.length < 4 && guard++ < 200) {
      const id = R.pick(others); if (opts.filter(o => o.id === id).length >= 2) continue;
      let o; try { o = f5Option(R, id, S); } catch (e) { if (e instanceof Redraw) continue; throw e; }
      opts.push(o);
    }
    need(opts.length === 4);
    // texts
    const names = drawNames(R, g.id === 'G2' ? 'X' : 'ws:B3');
    const two = g.id !== 'G2';
    const stem = fill(g.stem, { S });
    const texts = opts.map(o => { let t = fill(useIdx(formPart(SKB[o.id].s2, '和'), o.vi), Object.assign({}, o.v, { T2: o.v.T2 })); return two ? putNames(t, names, true) : t; });
    need(new Set(texts).size === 4);
    const stemN = two ? putNames(stem, names, true) : names[0] + 'は、' + stem;
    // each option with the stem: shown numbers distinct
    for (const t of texts) { const ns = numbersOf(stemN + ' ' + t); need(new Set(ns).size === ns.length && ns.every(x => x >= 2 && x <= 99)); }
    // cue balance (付表 C)
    const cue = { ws: ['W5', 'W6'], bp: ['W7'], br: ['W11'] }[target];
    const has = t => wordsOf(t).some(w => cue.includes(w));
    const cc = has(texts[0]); need(texts.slice(1).some(t => has(t) === cc));
    if (target === 'br') need(!wordsOf(texts[0]).includes('W11'));
    const p = { fmt: 'F5', lv, t: target, sc: SKB[tid].sc, group: g.id, stem: stemN, names };
    const ord = R.shuffle([0, 1, 2, 3]);
    p.optsModel = ord.map(i => Object.assign({}, opts[i], { text: texts[i], cue: has(texts[i]) }));
    p.options = p.optsModel.map(o => o.text); p.ans = p.optsModel.findIndex(o => o.correct);
    p.opts = p.optsModel.map(o => ({ c: !!o.correct, cue: o.cue, t: o.t }));
    // labels: M1 (target cue word), M4 (kin), M12; injective by word name
    const seen = new Set();
    p.optionTypes = p.optsModel.map(o => { if (o.correct) return null; const w = wordsOf(o.text).find(x => cue.includes(x)); if (w && !seen.has('M1:' + w)) { seen.add('M1:' + w); return 'M1:' + w; } if (isKin(target, o.t) && !seen.has('M4')) { seen.add('M4'); return 'M4'; } return 'M12'; });
    p.words = []; p.nums = [];
    return p;
  });
}
const isKin = (a, b) => KIN.some(q => (q[0] === a && q[1] === b) || (q[1] === a && q[0] === b));
// F6 (付表 D)
function f6Numbers(R, rid) {
  const v = {};
  if (rid === 'R1') { v.a = R.ri(50, 90); v.D = 2 * R.ri(1, 10); v.ans = v.a - v.D / 2; }
  if (rid === 'R2') { v.q = R.ri(5, 15); v.p = v.q + R.ri(2, 10); v.N = R.ri(4, 10); v.x = R.ri(1, v.N - 1); const tot = v.p * v.x + v.q * (v.N - v.x); need(tot % v.N === 0); v.v = tot / v.N; v.ans = v.x; }
  if (rid === 'R3') { v.B = R.ri(2, 20); v.k = R.ri(2, 5); v.t = R.ri(2, 20); v.A = v.k * (v.B + v.t) - v.t; need(v.A <= 80); v.D = v.A - v.B; need(v.D >= 20); v.S = v.A + v.B; need(v.S <= 99); v.ans = v.t; }
  if (rid === 'R4') { v.y = R.ri(2, 15); v.k = R.ri(2, 5); v.z = R.ri(3, 20); v.S = (v.k + 1) * v.z - 2 * v.y; need(v.S <= 99 && v.z - v.y >= 2); v.ans = v.z - v.y; }
  if (rid === 'R5') { v.k = R.ri(2, 5); v.y = R.ri(2, 20); need(((v.k + 1) * v.y) % 2 === 0); v.a = (v.k + 1) * v.y / 2; v.ans = v.y; }
  return v;
}
function drawF6(R, lv, rid) {
  return retry(() => {
    const row = F6_ROWS[rid]; const v = f6Numbers(R, rid);
    const [t1, t2] = LINKS[rid]; const dir = R.coin() ? 1 : 2; const ans = dir === 1 ? t1 : t2; const other = dir === 1 ? t2 : t1;
    const names = drawNames(R, rid); const two = rid !== 'R2';
    let a = fill(row.first, v), b = fill(row.second, v), q = fill(row.q, v);
    if (two) { a = putNames(a, names, true); b = putNames(b, names, true); q = putNames(q, names, true); }
    const firstFirst = R.coin();
    let s1 = firstFirst ? a : b, s2 = firstFirst ? b : a;
    if (!two) s1 = names[0] + 'は、' + s1;
    const ns = numbersOf(s1 + ' ' + s2); need(new Set(ns).size === ns.length && ns.every(x => x >= 2 && x <= 99));
    const p = { fmt: 'F6', lv, rid, t: ans, dir, other, sc: row.sc, s1, s2, hq: q, firstFirst, names, v };
    const ok0 = x => !((ans === 'nr' || other === 'nr') && x === 'br');
    const opts = [ans]; p.partnerShown = R.coin(); if (p.partnerShown) opts.push(other);
    const rest = R.shuffle(TYPES.filter(x => !opts.includes(x) && x !== other && ok0(x)));
    while (opts.length < 4) opts.push(rest.shift());
    p.opts = R.shuffle(opts); p.ans = p.opts.indexOf(ans); p.options = p.opts.map(x => TYPE_NAME[x]);
    wordsSetup(p, true);
    // labels 8.1 (F6: partner M5 first; then M1 > M3 > M4 > M12; M2 is F1 only)
    const tw = new Map(); for (const x of p.words.slice().sort((a2, b2) => a2.o - b2.o)) if (!tw.has(TABLE[x.w])) tw.set(TABLE[x.w], x.w);
    const QMAP = { 何人: 'kb', 何さい: 'nr', 何年後: 'nr', 何点: 'hk' }; const qt = Object.keys(QMAP).find(k => q.includes(k)); const qType = qt ? QMAP[qt] : null;
    const seen = new Set();
    p.optionTypes = p.opts.map(x => { if (x === ans) return null; let l; if (x === other) l = 'M5'; else if (tw.has(x)) l = 'M1:' + tw.get(x); else if (qType === x) l = 'M3'; else if (isKin(ans, x)) l = 'M4'; else l = 'M12'; if (l !== 'M12' && seen.has(l.split(':')[0] === 'M1' ? l : l)) l = 'M12'; seen.add(l); return l; });
    p.nums = [];
    return p;
  });
}

// ---------- 4.3 規則 10: raking ----------
class Rake {
  constructor(items, fams, rounds = 250, post = null) {
    this.items = items; const N = items.length; this.w = new Float64Array(N).fill(1);
    const groups = fams.map(f => { const m = new Map(); items.forEach((c, i) => { const k = f.key(c); if (k === null) return; let g = m.get(k); if (!g) { g = []; m.set(k, g); } g.push(i); }); return [m, items.map(f.lab), f]; });
    this.groups = groups;
    const even = (idx, labs, pw) => { const sum = new Map(); for (const i of idx) sum.set(labs[i], (sum.get(labs[i]) || 0) + this.w[i]); const tot = [...sum.values()].reduce((a, b) => a + b, 0); if (!(tot > 0)) return; const tgt = tot / sum.size; for (const i of idx) this.w[i] *= Math.pow(tgt / sum.get(labs[i]), pw); };
    // v0.4.4 (4.3 規則 10): the word families are a cap (the own type's share is brought down to 0.5 when above it),
    // not an equaliser; all families are iterated together, then the caps are made exact at 0.55
    const cap = (idx, labs, c, pw) => { let tot = 0, own = 0; for (const i of idx) { tot += this.w[i]; if (labs[i] === 'own') own += this.w[i]; } if (own <= c * tot || own === tot) return; const fct = (c / (1 - c)) * (tot - own) / own; for (const i of idx) if (labs[i] === 'own') this.w[i] *= Math.pow(fct, pw); };
    // v0.4.4 (F1): the families (5) to (7) are caps on the largest type's share (made even, they could not hold together
    // with (1), (2) and the word caps)
    const capmax = (idx, labs, c) => { const sum = new Map(); let tot = 0; for (const i of idx) { sum.set(labs[i], (sum.get(labs[i]) || 0) + this.w[i]); tot += this.w[i]; } for (const [l, v] of sum) if (v > c * tot && v < tot) { const fct = (c / (1 - c)) * (tot - v) / v; for (const i of idx) if (labs[i] === l) this.w[i] *= fct; } };
    // v0.4.4 (F1): a key of (1), (2) or (5) to (7) whose candidates show one answer only keeps 0.1 of its weight
    for (const [m, labs, f] of groups) if (f.single) for (const idx of m.values()) if (new Set(idx.map(i => labs[i])).size === 1) for (const i of idx) this.w[i] *= 0.1;
    for (let r = 0; r < rounds; r++) for (const [m, labs, f] of groups) for (const idx of m.values()) { if (f.word) cap(idx, labs, 0.5, 0.8); else if (f.mx) capmax(idx, labs, f.mx); else even(idx, labs, 0.8); }
    for (let r = 0; r < 20; r++) for (const [m, labs, f] of groups) if (f.word) for (const idx of m.values()) cap(idx, labs, 0.55, 1);
    if (post) post(this);
    this.cum = new Float64Array(N); let z = 0; for (let i = 0; i < N; i++) { z += this.w[i]; this.cum[i] = z; } this.z = z;
  }
  draw(R, filter) {
    if (filter) { const idx = []; const cum = []; let z = 0; this.items.forEach((c, i) => { if (filter(c) && this.w[i] > 0) { z += this.w[i]; idx.push(i); cum.push(z); } }); if (!idx.length) return null; const u = R.r() * z; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; } return clone(this.items[idx[lo]]); }
    const u = R.r() * this.z; let lo = 0, hi = this.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (this.cum[m] < u) lo = m + 1; else hi = m; } return clone(this.items[lo]);
  }
}
const clone = x => JSON.parse(JSON.stringify(x));
const SURF = ['W1', 'W2', 'W3', 'W4', 'W8', 'W9'];
const firstT = p => { const w = p.words.slice().sort((a, b) => a.o - b.o)[0]; return w ? TABLE[w.w] : '-'; };
const wordFams = () => Object.keys(TABLE).map(w => ({ key: p => (p.wordSet.includes(w) ? w : null), lab: p => (TABLE[w] === p.t ? 'own' : 'other'), word: true }));
function poolF1(R, lv, n) {
  const items = []; for (let i = 0; i < n; i++) { try { items.push(drawF1(R, lv)); } catch (e) { if (!(e instanceof Redraw) && !/generation failed/.test(e.message)) throw e; } }
  // 4.3 規則 10 (v0.4.4): (1), (2) and (5) to (7) are caps at 0.5 on the largest type's share; at Lv4 they are made even
  // (as caps they drive the weights of scene B2 or B3 to 0, because nr is only in B4 and br only in B3 and B7)
  const mx = lv === 4 ? undefined : 0.5;
  return new Rake(items, [
    { key: p => `${p.sc}|${p.nums.length}|${firstT(p)}|${p.optionTypesList.slice().sort().join(',')}`, lab: p => p.t, mx, single: true },
    { key: p => `${p.wordSet.filter(w => SURF.includes(w)).sort().join('.')}|${p.sc}`, lab: p => p.t, surf: true, mx, single: true },
    ...[p => p.sc, p => String(p.nums.length), p => firstT(p)].map(key => ({ key, lab: p => p.t, mx, single: true })),
    ...wordFams(), { key: () => 'all', lab: p => p.t }], 400);
}
function poolF2(R, lv, n) {
  const items = []; for (let i = 0; i < n; i++) { try { items.push(drawF2(R, lv)); } catch (e) { if (!/generation failed/.test(e.message)) throw e; } }
  const lookSet = p => p.optionMeta.map(m => m.look).sort().join(';');
  const fams = [{ key: lookSet, lab: p => p.optionMeta[p.ans].look }];
  if (lv >= 3) fams.push(...wordFams(), { key: () => 'all', lab: p => p.t });
  return new Rake(items, fams, 250, lv <= 2 ? rk => { const cnt = new Map(); rk.items.forEach(p => { const k = lookSet(p); if (!cnt.has(k)) cnt.set(k, new Set()); cnt.get(k).add(p.optionMeta[p.ans].look); }); rk.items.forEach((p, i) => { if (cnt.get(lookSet(p)).size < 2) rk.w[i] *= 0.3; }); } : null);
}
function poolF4(R, lv, n) {
  const items = []; for (let i = 0; i < n; i++) { try { items.push(drawF4(R, lv)); } catch (e) { if (!/generation failed/.test(e.message)) throw e; } }
  const key = p => `${p.prop}|${p.propWord}|${p.opts.filter(o => o.k === 'rej').map(o => o.t).sort().join(',')}|${p.sc}`;
  const lab = p => { const rj = p.opts.filter(o => o.k === 'rej').map(o => o.t).sort(); return p.propCorrect ? 'acc' : 'r' + rj.indexOf(p.t); };
  return new Rake(items, [{ key, lab }], 1, rk => { const [m, labs] = rk.groups[0]; for (const idx of m.values()) if (new Set(idx.map(i => labs[i])).size < 3) for (const i of idx) rk.w[i] = 0; });
}

// ---------- pairs (4.4) ----------
function derive(first, sec, v) {
  const out = [];
  if (first.startsWith('bp') && sec.startsWith('br')) { const z = v.S / (v.k + 1); if (Number.isInteger(z) && v.k <= 4 && v.c >= 2 && v.c <= z - 2) out.push({ S: v.S, k: v.k, m: v.c, z, B: z - v.c, A: v.k * z + v.c }); }
  if (first.startsWith('br') && sec.startsWith('bp')) for (const vi of [0, 1]) { const y = (v.S - (vi === 0 ? v.m : -v.m)) / (v.k + 1); const big = v.S - y; if (Number.isInteger(y) && y >= 2 && y <= 20 && big > y && v.m <= 9) out.push({ S: v.S, k: v.k, c: v.m, y, big, vi }); }
  if (first === 'kb:B3' && sec === 'tk:B3') for (const [N, T] of [[v.r, v.s], [v.s, v.r]]) { const x = (T - v.p * N) / (v.q - v.p); if (Number.isInteger(x) && x >= 1 && x <= N - 1 && N >= 4 && N <= 12) out.push({ p: v.p, q: v.q, N, T, x }); }
  if (first === 'tk:B3' && sec === 'kb:B3') for (const [r, s] of [[v.N, v.T], [v.T, v.N]]) { const n = (r + s) / (v.q - v.p); if (Number.isInteger(n) && n >= 3 && n <= 12 && v.p * n + r <= 99) out.push({ p: v.p, q: v.q, r, s, n, total: v.p * n + r }); }
  if (first === 'br:B3d' && sec === 'br:B3w') { const z = (v.A + v.B) / (v.k + 1); const m = z - v.B; if (Number.isInteger(z) && z >= 3 && z <= 20 && m >= 2 && m <= z - 2 && v.A === v.k * z + m) out.push({ A: v.A, B: v.B, k: v.k, z, m, S: v.A + v.B }); }
  if (first === 'br:B3w' && sec === 'br:B3d') { const e = (v.A - v.k * v.B) / (v.k - 1); if (Number.isInteger(e) && e >= 2 && e <= 15 && v.B <= 30) out.push({ A: v.A, B: v.B, k: v.k, e }); }
  return out;
}
const pairForce = (id, cp) => ({ vi: SKB[id].t === 'kb' ? 1 : id.startsWith('br') ? 0 : undefined, fm: id === 'br:B3w' ? (cp === 'CP5' ? '両方' : '和') : undefined });
function makePair(R, lv, fmt, st) {
  const kind = R.coin() ? 'CP' : 'SP';
  return retry(() => {
    const cp = R.pick(lv === 7 && fmt === 'F2' ? ['CP5'] : CPS[lv]); const pr = R.pick(CP[cp]);
    const first = R.coin() ? pr[0] : pr[1], sec = pr[0] === first ? pr[1] : pr[0];
    const sc = SKB[first].sc;
    let p1, p2;
    if (fmt === 'F1') {
      const S1 = optionSet(R, lv, sc, [SKB[first].t]); p1 = makeF1(R, lv, sc, S1, Object.assign({ id: first, t: SKB[first].t, pair: true }, pairForce(first, cp)));
      const must = [p1.t, SKB[sec].t]; const S2 = optionSet(R, lv, sc, must); need(must.every(t => S2.includes(t)));
      if (kind === 'CP') { const d = derive(first, sec, p1.v); need(d.length); const f = pairForce(sec, cp); p2 = makeF1(R, lv, sc, S2, { id: sec, t: SKB[sec].t, pair: true, v: d[0], vi: d[0].vi !== undefined ? d[0].vi : f.vi, fm: f.fm, names: p1.names }); }
      else p2 = makeF1(R, lv, sc, S2, { id: first, t: p1.t, pair: true, v: p1.v, vi: p1.vi, fm: p1.fm, qi: p1.qi, names: p1.names });
    } else {
      p1 = drawF2(R, lv, Object.assign({ id: first, t: SKB[first].t, pair: true }, pairForce(first, cp)));
      if (kind === 'CP') { const d = derive(first, sec, p1.v); need(d.length); const f = pairForce(sec, cp); p2 = drawF2(R, lv, { id: sec, t: SKB[sec].t, pair: true, v: d[0], vi: d[0].vi !== undefined ? d[0].vi : f.vi, fm: f.fm, names: p1.names }); }
      else p2 = drawF2(R, lv, { id: first, t: p1.t, pair: true, v: p1.v, vi: p1.vi, fm: p1.fm, names: p1.names });
      if (cp === 'CP5') cp5Options(R, p1, p2);
    }
    need([...p1.nums].sort().join() === [...p2.nums].sort().join());
    p1.pairFirst = true; p2.pairPrev = true; p1.pairKind = p2.pairKind = kind; p1.cp = p2.cp = cp;
    return [p1, p2];
  });
}
function cp5Options(R, p1, p2) {
  const v = p1.v; const A = opT(v.A), B = opT(v.B); const AB = { v: v.A + v.B, t: `(${v.A} + ${v.B})`, kind: 'C' };
  const d = { o: '−', P: [A, B] }, w = { o: '÷', P: [AB, opP1(v.k)] };
  const fills = R.shuffle([[{ o: '+', P: [A, B] }, 'M11'], [{ o: '÷', P: [A, opT(v.k)] }, 'M7'], [{ o: '×', P: [AB, opP1(v.k)] }, 'M11'], [{ o: '÷', P: [AB, opT(v.k)] }, 'M8']]).slice(0, 2);
  for (const p of [p1, p2]) {
    const isD = p.sk === 'br:B3d';
    const cells = [{ e: d, m: isD ? null : 'M16' }, { e: w, m: isD ? 'M16' : null }, ...fills.map(([e, m]) => ({ e, m }))];
    const sh = R.shuffle(cells);
    p.options = sh.map(c => exprText(c.e.o, c.e.P)); p.ans = sh.findIndex(c => c.m === null); p.optionTypes = sh.map(c => c.m); p.gridKind = 'cp5';
    p.optionMeta = sh.map(c => ({ o: c.e.o, vals: c.e.P.map(x => x.v), written: writtenNums(c.e.o, c.e.P), look: lookOf(p, c.e.o, c.e.P) }));
    p.opts = sh.map(c => ({ f: { sh: { '+': 'a+b', '−': 'a-b', '×': 'a*b', '÷': 'a/b' }[c.e.o], v: writtenNums(c.e.o, c.e.P) }, m: c.m, txt: exprText(c.e.o, c.e.P) }));
  }
}

// ---------- labels for F1 (8.1, 4.9) ----------
function labelF1(p, prevT) {
  const tw = new Map(); for (const x of p.words.slice().sort((a, b) => a.o - b.o)) if (!tw.has(TABLE[x.w])) tw.set(TABLE[x.w], x.w);
  const brd = p.sk === 'br:B3d' || p.sk === 'br:B7d';
  const kinOK = x => isKin(p.t, x) && !(brd && x === 'nr');
  const lab = p.opts.map(x => { if (x === p.t) return null; if (tw.has(x)) return 'M1:' + tw.get(x); if (SCENE_TYPICAL[p.sc] === x) return 'M2'; if (kinOK(x)) return 'M4'; if (prevT && x === prevT) return 'M5'; return 'M12'; });
  const kinIdx = x => KIN.findIndex(q => (q[0] === p.t && q[1] === x) || (q[1] === p.t && q[0] === x));
  let kept = false; p.opts.map((x, i) => [x, i]).filter(([, i]) => lab[i] === 'M4').sort((a, b) => kinIdx(a[0]) - kinIdx(b[0])).forEach(([, i]) => { if (kept) lab[i] = 'M12'; kept = true; });
  for (const m of ['M2', 'M5']) { let first = true; lab.forEach((l, i) => { if (l === m) { if (!first) lab[i] = 'M12'; first = false; } }); }
  const m1 = new Set(); lab.forEach((l, i) => { if (l && l.startsWith('M1:')) { if (m1.has(l)) lab[i] = 'M12'; m1.add(l); } });
  p.optionTypes = lab;
}

// ---------- set builder (4.2) ----------
function newState() { return { pools: {}, pilot: +(process.env.PILOT || 60000) }; }
function pool(st, R, fmt, lv) {
  const k = fmt + ':' + lv; if (st.pools[k]) return st.pools[k];
  st.pools[k] = fmt === 'F1' ? poolF1(R, lv, st.pilot) : fmt === 'F2' ? poolF2(R, lv, st.pilot) : poolF4(R, lv, st.pilot);
  return st.pools[k];
}
function finalize(p, lv) {
  p.cat = 'kom_tokushu_kata'; p.kind = 'choice'; p.format = FMT_CODE[p.fmt]; p.lv = lv;
  p.type = p.fmt === 'F6' ? (p.dir === 1 ? [p.t, p.other] : [p.other, p.t]) : p.t;
  p.skeleton = p.sk || p.group || p.rid;
  p.patternId = p.fmt === 'F5' ? `tsukuru:${p.t}:${p.group}` : p.fmt === 'F6' ? `renketsu:${p.rid}:${p.dir}` : `${FMT_CODE[p.fmt]}:${p.sk}`;
  p.showTypeName = lv <= 2;
  p.form = p.t === 'br' && p.sk ? (p.sk.endsWith('w') ? 'w' : 'd') : null; // audit.js view
  p.waza = WAZA[p.t] ? Object.assign({}, WAZA[p.t]) : null;
  const ask = { F1: 'この 問題は どの 型?', F2: 'この 問題を とく ときに 使う 式は どれ?', F3: 'この 問題の 型を 決めて いる 文は どれ?', F6: p.dir === 1 ? 'この 問題で さいしょに 使う 型は?' : 'この 問題で 2 つめに 使う 型は?' };
  if (p.fmt === 'F1') { p.options = p.opts.map(t => (lv <= 4 ? `${TYPE_NAME[t]} (${WAZA[t].sign})` : TYPE_NAME[t])); p.text = `${p.s1} ${p.s2} ${ask.F1}`; p.numsMultiset = p.seq.slice(); }
  if (p.fmt === 'F2') { const [a, b] = p.swapped ? [p.s2, p.s1] : [p.s1, p.s2]; p.text = (lv <= 2 ? `${TYPE_NAME[p.t]}の 問題です。` : '') + `${a} ${b} ${p.hq} ${ask.F2}`; p.numsMultiset = p.seq.slice(); }
  if (p.fmt === 'F3') { const [a, b] = p.swapped ? [p.s2, p.s1] : [p.s1, p.s2]; p.text = `${a} ${b} ${p.hq} ${ask.F3}`; }
  if (p.fmt === 'F4') p.text = `${p.lead} 問題: ${p.s1} ${p.s2} ${p.hq} ${p.person}の 考えは 正しい?`;
  if (p.fmt === 'F5') p.text = `「${p.stem}」に つづけて、${TYPE_NAME[p.t]}に なる 文は どれ?`;
  if (p.fmt === 'F6') p.text = `${p.s1} ${p.s2} ${p.hq} ${ask.F6}`;
  p.pairId = p.pairFirst || p.pairPrev ? (p.pairKind === 'SP' ? 'SP' : p.cp) : null;
  return p;
}
function buildSet(lv, random, st) {
  const R = rng(random);
  return retry(() => {
    const fmts = lv === 10 ? (() => { const all = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']; const om = R.pick(all); return all.filter(f => f !== om); })() : LVFMT[lv].split(' ');
    const items = []; let pairFmt = [3, 4, 5, 8].includes(lv) ? 'F1' : lv === 7 ? (R.coin() ? 'F1' : 'F2') : null;
    const rest = fmts.slice();
    if (pairFmt) { items.push(makePair(R, lv, pairFmt, st)); rest.splice(rest.indexOf(pairFmt), 1); rest.splice(rest.indexOf(pairFmt), 1); }
    const links = R.shuffle(Object.keys(LINKS)).slice(0, 3); let li = 0;
    const g12 = lv <= 2 ? R.shuffle([...(lv === 1 ? GA : GB), R.pick(lv === 1 ? GA : GB)]) : null; let gi = 0;
    for (const f of rest) {
      let p;
      if (f === 'F1') p = pool(st, R, 'F1', lv).draw(R);
      else if (f === 'F2') p = g12 ? pool(st, R, 'F2', lv).draw(R, c => c.t === g12[gi]) : pool(st, R, 'F2', lv).draw(R);
      else if (f === 'F3') p = drawF3(R, lv);
      else if (f === 'F4') p = pool(st, R, 'F4', lv).draw(R);
      else if (f === 'F5') p = drawF5(R, lv);
      else p = drawF6(R, lv, lv === 10 ? R.pick(Object.keys(LINKS)) : links[li++]);
      if (f === 'F2' && g12) gi++;
      need(p);
      // 4.8 の 2 (v0.4.4): a problem that would be the third of a patternId is drawn again alone
      const pid = q => (q.fmt === 'F5' ? `tsukuru:${q.t}:${q.group}` : q.fmt === 'F6' ? `renketsu:${q.rid}:${q.dir}` : `${FMT_CODE[q.fmt]}:${q.sk}`);
      let tries = 0;
      while (items.flat().filter(q => pid(q) === pid(p)).length >= 2 && tries++ < 50) {
        if (f === 'F1') p = pool(st, R, 'F1', lv).draw(R); else if (f === 'F2') p = g12 ? pool(st, R, 'F2', lv).draw(R, c => c.t === g12[gi - 1]) : pool(st, R, 'F2', lv).draw(R); else if (f === 'F3') p = drawF3(R, lv); else if (f === 'F4') p = pool(st, R, 'F4', lv).draw(R); else if (f === 'F5') p = drawF5(R, lv); else p = drawF6(R, lv, p.rid);
      }
      items.push([p]);
    }
    const blocks = R.shuffle(items); const set = blocks.flat();
    if (lv <= 2) need(new Set(set.map(p => p.t)).size === 4);
    set.forEach((p, i) => { p.pos = i; });
    // labels needing the set order
    set.forEach((p, i) => { if (p.fmt === 'F1') labelF1(p, p.pairPrev ? set[i - 1].t : null); });
    // scaffold (4.1 の 1): Lv1 and 2, positions 1 and 2
    set.forEach((p, i) => { p.scaffold = lv <= 2 && i < 2 ? WAZA[p.t].step : null; });
    // patternId: at most 2 per set (4.8 の 2)
    const cnt = {}; set.forEach(p => { finalize(p, lv); cnt[p.patternId] = (cnt[p.patternId] || 0) + 1; }); need(Object.values(cnt).every(c => c <= 2));
    return set;
  }, 200);
}

module.exports = { _internal: () => ({ decorate, buildF2, baseWords, applyDeco, finish, numbersOf, wordsSetup, drawF1, drawF2, drawF3, drawF4once, drawF5, drawF6, common, Redraw, Rake, wordFams, firstT }), buildSet, newState, rng, SKB, SK_IDS, DECO_ROWS, F5_GROUPS, F6_ROWS, TYPE_NAME, WAZA, TABLE, KIN, SCENE_TYPES, SCENE_TYPICAL, FAMILY, NAME_POOL, TWO_PERSON, LINKS, wordsOf, numbersOf, CP, CPS, W33 };
