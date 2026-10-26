// Independent generator for kom_tokushu_kata, written in the Phase 7 cross-check of v0.3.2 from the doc's
// rule text (4.2-4.5, 9.2) and 付表 B only, without the audit generator (../gen.js). Updated for v0.4: the
// 付表 B wording, the 9.2 deco pool and slot ranges, and the rules that v0.4 wrote down (marked V04).
// It reads 付表 B, 3.2 and 9.2 from the doc itself. Assumptions left from v0.3.2 are marked ASSUME.
'use strict';
const fs = require('fs');
const { loadDoc, section, tableIn } = require('./doc_lib');

// ---------------- PRNG
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = mulberry32(7);
const setSeed = s => { R = mulberry32(s); };
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = arr => arr[Math.floor(R() * arr.length)];
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------------- doc tables
const L = loadDoc();
const tB = tableIn(L, section(L, '付表 B'));
// V04: the deco pool (9.2 の 1 つ目の表) and the scene types (3.2) are read from the doc
const POOL = {}; const SCENE_TYPES = {};
tableIn(L, section(L, '9.2'), 1).rows.forEach(r => { POOL[r[0]] = [...r[1].matchAll(/(W\d+) [^()、]*\(([a-z ]+)\)/g)].map(m => ({ w: m[1], tys: m[2].trim().split(/\s+/) })); });
tableIn(L, section(L, '3.2')).rows.forEach(r => { SCENE_TYPES[r[0]] = r[2].trim().split(/\s+/); });
const TYPES = ['tk', 'kb', 'ws', 'sk', 'bp', 'hk', 'nr', 'br'];
const GA = ['tk', 'kb', 'ws', 'sk'], GB = ['bp', 'hk', 'nr', 'br'];
const SK = {};
tB.rows.forEach(r => { SK[r[0]] = { id: r[0], type: r[0].split(':')[0], scene: r[0].split(':')[1].slice(0, 2), s1: r[1], s2: r[2], q: r[3], f2: r[5] === '可', f3: r[6].startsWith('可') }; });
const SK_IDS = Object.keys(SK);

// 3.3 surface words and the child's table type (W7 -> bp, the first listed)
const WORDS = {
  W1: /あま(る|り|ります|りました|った)/, W2: /たりな|たりず|たりませ/, W3: /ずつ/, W4: /足/,
  W5: /あわせて|和/, W6: /ちがい|ちがう|ちがいま|差|より/, W7: /倍/, W8: /(\}|\d) 年後|(\}|\d) 年前|か月後/, // V04: 何年後 is a question form (3.3)
  W9: /(\}|\d) さい|年れい/, W10: /平均/, W11: /あげ|もらう|もらい|もらっ/, W12: /(こ|つ)と [^。]*(こ|つ)で/,
};
const WIDS = Object.keys(WORDS);
const TABLE = { W1: 'kb', W2: 'kb', W3: 'kb', W4: 'tk', W5: 'ws', W6: 'ws', W7: 'bp', W8: 'nr', W9: 'nr', W10: 'hk', W11: 'br', W12: 'sk' };
const NON_SIG = ['W1', 'W2', 'W3', 'W4', 'W8', 'W9'];
const NUMERIC_DECO = new Set(['W1', 'W2', 'W6', 'W8', 'W11']); // 4.3 規則 9
const SCENE_TYPICAL = { B1: 'tk', B2: 'sk', B3: 'kb', B4: 'nr', B5: 'hk', B6: 'kb', B7: 'br' }; // A4

// ---------------- text realisation of one skeleton (variants by 4.3 規則 4)
// V04: all 〈 〉 of one row take the same index; 〔 〕 names a form whose s1, s2 and question go together
const useIdx = (s, i) => s.replace(/〈([^〉]*)〉/g, (_, v) => { const alts = v.split(' / ').map(x => x.trim()); return alts[Math.min(i, alts.length - 1)]; });
const formPart = (s, f) => { if (!s.includes('〔')) return s; const m = s.split(/〔([^〕]*)〕/); for (let i = 1; i < m.length; i += 2) if (m[i] === f) return m[i + 1].trim(); return m[2].trim(); };
const stripNote = s => s.replace(/\s*\([^)]*する\)/g, '');
// V04 (4.7 の 3): count the shown values. Slots count once each; fixed numerals count unless they are 1, or the
// "2 人" / "2 つ" that name the two people or the two amounts of the story. A numeral repeated counts once.
function countNums(s) {
  const slots = new Set((s.match(/\{\w+\}/g) || []));
  const fixed = new Set();
  const re = /(^|[^\w{])(\d+) (こ|つ|人|問|回|まい|本|ぴき)/g; let m;
  while ((m = re.exec(s))) { if (m[2] === '1') continue; const after = s.slice(m.index + m[0].length, m.index + m[0].length + 2); if (m[2] === '2' && ((m[3] === '人' && /^(が|の|は|と)/.test(after)) || (m[3] === 'つ' && after.startsWith('の')))) continue; fixed.add(m[2]); }
  return slots.size + fixed.size;
}
// V04 (4.3 規則 4 と 5, 4.4 の 6): the index of the 〈 〉 by type, and the form of br:B3w
function variantIndex(id, lv, pair) {
  const ty = id.split(':')[0];
  if (ty === 'kb') return pair ? 1 : (R() < 0.5 ? 0 : 1);
  if (ty === 'hk') return lv <= 2 && R() < 0.4 ? 0 : 1;
  if (id === 'br:B3d') return pair ? 0 : (R() < 0.7 ? 0 : 1);
  if (ty === 'br') return pair ? 0 : (R() < 0.8 ? 0 : 1);
  if (id === 'nr:B4a') return R() < 1 / 3 ? 0 : 1;
  return R() < 0.5 ? 0 : 1;
}
function realize(id, lv, opts = {}) {
  const sk = SK[id];
  const form = opts.form || (id === 'br:B3w' ? (R() < 0.5 ? '和' : '両方') : '和');
  const i = variantIndex(id, lv, opts.pair);
  const s1 = useIdx(formPart(stripNote(sk.s1), form), i), s2 = useIdx(formPart(stripNote(sk.s2), form), i);
  const q = useIdx(formPart(sk.q, form), i);
  return { s1, s2, q, form, vi: i };
}

function wordsAt(text) {
  const res = [];
  for (const w of WIDS) { const m = text.match(WORDS[w]); if (m) res.push({ w, pos: m.index }); }
  return res;
}

// deco: 4.3 規則 1 (0.7, draw from the scene pool, skip if the type cannot carry it)
// V04 (4.3 規則 1): one word drawn uniformly from the pool words the type can carry and that the text lacks
function drawDeco(scene, ty, onlyNonNumeric, text) {
  const have = new Set(text ? wordsAt(text).map(x => x.w) : []);
  const p = (POOL[scene] || []).filter(d => d.tys.includes(ty) && !have.has(d.w) && !(onlyNonNumeric && NUMERIC_DECO.has(d.w)));
  if (!p.length) return null;
  return pick(p).w;
}

// ---------------- F1 candidate (single problem)
function f1Options(lv, scene, ans) {
  if (lv === 3) return GA.slice();
  if (lv === 4) return scene === 'B4' ? ['bp', 'hk', 'nr', 'ws'] : GB.slice();
  const on = SCENE_TYPES[scene];
  if (on.length >= 4) return shuffle(on).slice(0, 4);
  const off = TYPES.filter(t => !on.includes(t));
  return on.concat([pick(off)]);
}
function scenesFor(lv) { if (lv === 3) return ['B1', 'B2', 'B3', 'B5', 'B6']; if (lv === 4) return ['B2', 'B3', 'B4', 'B7']; return ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']; }
function typesOn(lv, scene) { let t = SCENE_TYPES[scene]; if (lv === 3) t = t.filter(x => GA.includes(x)); if (lv === 4) t = t.filter(x => GB.includes(x)); return t; }

function buildText(id, lv, r, deco, decoSent) {
  const text = r.s1 + ' ' + r.s2;
  const ws = wordsAt(text);
  if (deco) {
    const pos = decoSent === 0 ? Math.floor(r.s1.length / 2) : r.s1.length + 1 + Math.floor(r.s2.length / 2);
    if (!ws.find(x => x.w === deco)) ws.push({ w: deco, pos });
    else { const o = ws.find(x => x.w === deco); o.pos = Math.min(o.pos, pos); }
  }
  ws.sort((a, b) => a.pos - b.pos);
  return ws;
}

function makeF1(lv, opts = {}) {
  for (let tries = 0; tries < 50; tries++) {
    let scene, ans, id, options;
    if (opts.forceId) { id = opts.forceId; scene = SK[id].scene; ans = SK[id].type; options = opts.options; }
    else {
      scene = pick(scenesFor(lv));
      options = f1Options(lv, scene);
      const cand = options.filter(t => typesOn(lv, scene).includes(t));
      if (!cand.length) continue;
      ans = pick(cand);
      if (ans === 'nr' && options.includes('br')) continue;
      const ids = SK_IDS.filter(k => SK[k].type === ans && SK[k].scene === scene);
      id = pick(ids);
    }
    const r = realize(id, lv, { pair: opts.pair, form: opts.form });
    let n = countNums(r.s1 + ' ' + r.s2);
    let deco = R() < 0.7 ? drawDeco(scene, ans, opts.pair, r.s1 + ' ' + r.s2) : null;
    if (!opts.pair) {
      if (deco && NUMERIC_DECO.has(deco)) n += 1;
      if (n < 3) { // 4.3 規則 9: top up with a numeric deco
        const have = new Set(wordsAt(r.s1 + ' ' + r.s2).map(x => x.w));
        const numeric = (POOL[scene] || []).filter(p => NUMERIC_DECO.has(p.w) && p.tys.includes(ans) && !have.has(p.w));
        if (!numeric.length) continue;
        if (deco && NUMERIC_DECO.has(deco)) n -= 1;
        deco = pick(numeric).w; n += 1;
      }
      if (n < 3 || n > 4) continue;
    }
    const decoSent = R() < 0.5 ? 0 : 1;
    const ws = buildText(id, lv, r, deco, decoSent);
    return mkProb('F1', lv, id, scene, ans, options, ws, n, opts.pair || null);
  }
  return null;
}
// V042: person names. A skeleton whose text names two people (兄、姉、父) has two name slots, the others one.
// One slot, uniformly chosen, gets a family name, the other a name from the pool (付表 B の人名の差し込み).
const FAMILY = ['さいと', 'ゆうと', 'しょうた', 'ゆきこ'], NAME_POOL = ['はな', 'あおい'];
function names(id) { const two = /兄|姉|父/.test(SK[id].s1 + SK[id].s2); const f = pick(FAMILY); if (!two) return [f]; const o = pick(NAME_POOL); return R() < 0.5 ? [f, o] : [o, f]; }
function mkProb(fmt, lv, id, scene, ans, options, ws, n, pair) {
  const wset = ws.map(x => x.w);
  const first = ws.length ? TABLE[ws[0].w] : 'none';
  const ns = NON_SIG.filter(w => wset.includes(w)).join('+');
  return { fmt, lv, id, scene, ans, names: names(id), options: options ? options.slice().sort() : null, words: wset, first, n, pair,
    key1: `${scene}|${n}|${first}|${options ? options.slice().sort().join(',') : ''}`, key2: `${ns}|${scene}` };
}

// ---------------- F2 / F3 / F4 word-level candidates (Lv3+), and F2 shape candidates (Lv1-2)
function makeTextProb(fmt, lv, id, pair, form) {
  const sk = SK[id];
  const r = realize(id, lv, { pair, form });
  const deco = lv >= 3 && R() < 0.7 ? drawDeco(sk.scene, sk.type, !!pair, r.s1 + ' ' + r.s2) : null;
  const decoSent = R() < 0.5 ? 0 : 1;
  const text = r.s1 + ' ' + r.s2 + ' ' + r.q;
  const ws = wordsAt(text);
  if (deco && !ws.find(x => x.w === deco)) ws.push({ w: deco, pos: decoSent === 0 ? 0 : r.s1.length + 1 });
  ws.sort((a, b) => a.pos - b.pos);
  return mkProb(fmt, lv, id, sk.scene, sk.type, null, ws, 0, pair || null);
}

// ---- F2 option grid (4.5 の 3) for Lv1-2 with numbers
const OPS = ['+', '−', '×', '÷'];
// V04: slot ranges and conditions of 9.2 の 2 つ目の表
function sampleNums(id) {
  for (let t = 0; t < 500; t++) {
    const v = {};
    switch (id) {
      case 'tk:B1': { v.N = ri(4, 20); const x = ri(1, v.N - 1); v.L = 2 * v.N + 2 * x; v.order = [['N'], ['L']]; break; }
      case 'tk:B2': { v.b = ri(5, 15); v.a = v.b + ri(2, 10); v.N = ri(3, 9); const x = ri(1, v.N - 1); v.T = v.a * x + v.b * (v.N - x); v.order = [['a', 'b', 'N'], ['T']]; break; }
      case 'tk:B3': { v.p = ri(2, 6); v.q = v.p + ri(1, 3); v.N = ri(4, 12); const x = ri(1, v.N - 1); v.T = v.p * (v.N - x) + v.q * x; v.order = [['N', 'p', 'q'], ['T']]; break; }
      case 'tk:B5': { v.p = ri(3, 10); v.q = ri(2, 5); v.N = ri(6, 20); const c = ri(1, v.N - 1); v.S = v.p * c - v.q * (v.N - c); v.order = [['p', 'q', 'N'], ['S']]; break; }
      case 'tk:B6': { v.c1 = ri(2, 4); v.c2 = v.c1 + ri(1, 3); v.N = ri(4, 15); const x = ri(1, v.N - 1); v.P = v.c1 * (v.N - x) + v.c2 * x; v.order = [['c1', 'c2', 'N'], ['P']]; break; }
      case 'kb:B1': case 'kb:B3': case 'kb:B6': { const n = ri(3, 12); v.p = ri(2, 6); v.q = v.p + ri(1, 3); const sp = (v.q - v.p) * n; if (sp < 4) continue; v.r = ri(2, sp - 2); v.s = sp - v.r; if (v.p * n + v.r > 99) continue; v.order = [['p', 'r'], ['q', 's']]; break; }
      case 'kb:B2m': { const u = ri(5, 20); v.m = ri(2, 6); v.n = v.m + ri(1, 4); const sp = (v.n - v.m) * u; v.r = ri(2, sp - 2); v.s = sp - v.r; if (v.m * u + v.r > 99) continue; v.order = [['m', 'r'], ['n', 's']]; break; }
      case 'ws:B1': { const c = ri(2, 15), k = ri(1, 12); v.S = 2 * c + 4 * k; v.D = 4 * k - 2 * c; v.order = [['S'], ['D']]; break; }
      case 'ws:B4': { v.y = ri(2, 10); const x = ri(3, 20); v.D = ri(2, 10); v.S = 2 * (x + v.y) + v.D; v.order = [['y', 'S'], ['D']]; break; }
      case 'ws:B2': case 'ws:B5': { const x = ri(5, 40); v.D = ri(2, 20); v.S = 2 * x + v.D; v.order = [['S'], ['D']]; break; }
      case 'ws:B3': case 'ws:B6': case 'ws:B7': { const x = ri(3, 40); v.D = ri(2, 20); v.S = 2 * x + v.D; v.order = [['S'], ['D']]; break; }
      case 'sk:B2a': case 'sk:B5': { const a = id === 'sk:B5' ? ri(3, 20) : ri(5, 30), m = id === 'sk:B5' ? ri(2, 15) : ri(3, 15); v.f2 = 2; v.c = ri(3, 5); v.T1 = 2 * a + m; v.T2 = 2 * a + v.c * m; v.order = [['f2', 'T1'], ['f2', 'c', 'T2']]; break; }
      case 'sk:B2b': case 'sk:B3': { const a = id === 'sk:B3' ? ri(3, 40) : ri(5, 40), m = id === 'sk:B3' ? ri(2, 20) : ri(3, 20); v.f3 = 3; v.T1 = a + m; v.T2 = a + 3 * m; v.order = [['T1'], ['f3', 'T2']]; break; }
      case 'bp:B1': case 'bp:B2': case 'bp:B3': case 'bp:B7': { const y = ri(2, 20); v.k = ri(2, 5); v.c = ri(2, 9); v.sign = R() < 0.5 ? 1 : -1; const big = v.k * y + v.sign * v.c; if (big <= y) continue; v.S = y + big; v.order = [['S'], ['k', 'c']]; break; }
      case 'bp:B4': { v.y = ri(2, 15); const x = ri(3, 15); v.k = ri(2, 5); v.S = x * (v.k + 1); if (v.k * x > 80) continue; v.order = [['y', 'S'], ['k']]; break; }
      case 'hk:B2': case 'hk:B3': { v.f4 = 4; v.f3 = 3; v.a = id === 'hk:B2' ? ri(10, 40) : ri(5, 30); v.c = v.a + (R() < 0.5 ? 1 : -1) * ri(1, 6); if (4 * v.a - 3 * v.c < 2) continue; v.order = [['f4', 'a'], ['f3', 'c']]; break; }
      case 'hk:B4': { v.n = ri(3, 6); v.a = ri(10, 30); v.b = ri(25, 45); if (v.n * v.a - 2 * v.b < v.n - 2) continue; v.order = [['n', 'a'], ['b']]; break; }
      case 'hk:B5': { v.n = ri(3, 6); v.a = ri(50, 90); v.b = v.a + (R() < 0.5 ? 1 : -1) * ri(1, 8); const nx = v.b * (v.n + 1) - v.a * v.n; if (nx < 0 || nx > 100) continue; v.order = [['n', 'a'], ['b']]; break; }
      case 'nr:B4a': { v.B = ri(2, 20); v.k = ri(2, 5); const t2 = ri(2, 20); v.A = v.k * (v.B + t2) - t2; if (v.A > 80 || v.A - v.B < 20) continue; v.order = [['A', 'B'], ['k']]; break; }
      case 'br:B3w': case 'br:B7w': { const z = ri(3, 20); v.k = ri(2, 4); v.m = ri(2, z - 2); if (v.m < 2) continue; v.S = z * (v.k + 1); v.A = v.k * z + v.m; v.B = z - v.m; v.useAB = id === 'br:B3w' && R() < 0.5; if (v.useAB && v.A > 99) continue; v.order = v.useAB ? [['A', 'B'], ['k']] : [['S'], ['m', 'k']]; break; }
      case 'br:B3d': case 'br:B7d': { v.B = ri(2, 30); v.k = ri(2, 4); const e = ri(2, 15); v.A = v.k * (v.B + e) - e; if (v.A <= v.B) continue; v.order = [['A', 'B'], ['k']]; break; }
      default: return null;
    }
    // 9.2 共通の条件: shown numbers 2..99, distinct (a fixed numeral repeated counts once)
    const shown = [...new Set(v.order.flat())].map(k => v[k]);
    if (shown.some(x => !Number.isInteger(x) || x < 2 || x > 99) || new Set(shown).size !== shown.length) continue;
    return v;
  }
  return null;
}
// operands: {t:'s',k} text slot, {t:'p1',k} slot+1, {t:'c',v} constant not in text, {t:'cmp',o,a,b} compound of slots
function oneStep(id, v) {
  const s = k => ({ t: 's', k }), p1 = k => ({ t: 'p1', k });
  const ty = id.split(':')[0];
  if (id === 'tk:B1') return { o: '×', P: [{ t: 'c', v: 2 }, s('N')] };
  if (ty === 'tk') return { o: '×', P: [s({ 'tk:B2': 'b', 'tk:B3': 'p', 'tk:B5': 'p', 'tk:B6': 'c1' }[id]), s('N')] };
  if (ty === 'kb') return { o: '+', P: [s('r'), s('s')] };
  if (ty === 'ws') return { o: '−', P: [s('S'), s('D')] };
  if (ty === 'sk') return { o: '−', P: [s('T2'), s('T1')] };
  if (id === 'bp:B4') return { o: '÷', P: [s('S'), p1('k')] };
  if (ty === 'bp') return { o: '÷', P: [{ t: 'cmp', o: v.sign > 0 ? '−' : '+', a: 'S', b: 'c' }, p1('k')] };
  if (id === 'hk:B2' || id === 'hk:B3') return { o: '×', P: [s('a'), s('f4')] };
  if (ty === 'hk') return { o: '×', P: [s('a'), s('n')] };
  if (ty === 'nr') return { o: '−', P: [s('A'), s('B')] };
  if (id.endsWith('w')) return v.useAB ? { o: '÷', P: [{ t: 'cmp', o: '+', a: 'A', b: 'B' }, p1('k')] } : { o: '÷', P: [s('S'), p1('k')] };
  return { o: '−', P: [s('A'), s('B')] };
}
const textSlots = v => [...new Set(v.order.flat())];
const opStr = x => x.t === 's' ? x.k : x.t === 'p1' ? `(${x.k}+1)` : x.t === 'c' ? `#${x.v}` : `(${x.a}${x.o}${x.b})`;
const exprStr = (o, P) => `${opStr(P[0])}${o}${opStr(P[1])}`;
// ASSUME: 「式の形」 is ambiguous. FORM=full keeps the operand structure, FORM=op keeps only the outer operator.
const FORM = process.env.FORM || 'op';
const formStr = (o, P) => { if (FORM === 'op') return o; const f = x => x.t === 's' ? 'T' : x.t === 'p1' ? '(T+1)' : x.t === 'c' ? 'C' : `(T${x.o}T)`; return `${f(P[0])}${o}${f(P[1])}`; };
function slotsUsed(P) { const u = []; P.forEach(x => { if (x.t === 's' || x.t === 'p1') u.push(x.k); if (x.t === 'cmp') u.push(x.a, x.b); }); return u; }
function appearance(o, P, v, displayOrder) {
  const used = slotsUsed(P);
  const vals = textSlots(v).map(k => v[k]); const mx = Math.max(...vals);
  const hasMax = used.some(k => v[k] === mx);
  const first2 = new Set(displayOrder.slice(0, 2));
  const onlyFirst2 = used.length > 0 && used.every(k => first2.has(k));
  const hasFirst = used.includes(displayOrder[0]);
  const hasOOT = P.some(x => x.t === 'p1' || x.t === 'c');
  return { form: formStr(o, P), flags: `${+hasMax}${+onlyFirst2}${+hasFirst}${+hasOOT}` };
}
function forbidden(id, o, P, v) {
  const e = exprStr(o, P), ty = id.split(':')[0];
  if (ty === 'ws' && o === '+' && slotsUsed(P).sort().join() === 'D,S') return true; // 和 + 差
  if (ty === 'kb' && o === '−') { const u = slotsUsed(P).sort().join(); if (u === 'p,q' || u === 'm,n') return true; } // 1 人分の差
  if (ty === 'tk' && o === '×') { const big = { 'tk:B2': 'a', 'tk:B3': 'q', 'tk:B6': 'c2' }[id]; if (big && slotsUsed(P).includes(big) && slotsUsed(P).includes('N')) return true; } // 大きい方 × 全体
  if (id === 'hk:B5' && o === '×' && P.some(x => x.t === 'p1' && x.k === 'n') && slotsUsed(P).includes('b')) return true; // 目標の平均 × 回数
  return false;
}
function buildF2(id, lv) {
  const v = sampleNums(id); if (!v) return null;
  const { o, P } = oneStep(id, v);
  const swap = R() < 0.5; // 4.3 規則 12
  const order = swap ? v.order[1].concat(v.order[0]) : v.order[0].concat(v.order[1]);
  const slots = textSlots(v);
  const ap = (oo, PP) => appearance(oo, PP, v, order);
  const correct = ap(o, P);
  const sameAp = (a, b) => a.form === b.form && a.flags === b.flags;
  // P' candidates
  const Pp = [];
  P.forEach((x, i) => {
    let reps = [];
    if (x.t === 's') reps = slots.filter(k => k !== x.k && v[k] !== v[x.k]).map(k => ({ t: 's', k }));
    if (x.t === 'p1') reps = slots.filter(k => k !== x.k).map(k => ({ t: 'p1', k }));
    if (x.t === 'c') reps = slots.map(k => ({ t: 'p1', k }));
    reps.forEach(rp => { const Q = P.slice(); Q[i] = rp; if (sameAp(ap(o, Q), correct)) Pp.push(Q); });
  });
  const optsOut = [];
  const seen = new Set([exprStr(o, P)]);
  const push = (oo, PP, lab) => { const e = exprStr(oo, PP); if (seen.has(e) || forbidden(id, oo, PP, v)) return false; seen.add(e); optsOut.push({ ap: ap(oo, PP), lab }); return true; };
  let grid = null;
  if (Pp.length) {
    const Q = pick(Pp);
    const others = shuffle(OPS.filter(x => x !== o));
    for (const o2 of others) {
      if (!forbidden(id, o2, P, v) && !forbidden(id, o2, Q, v) && exprStr(o2, P) !== exprStr(o, Q)) {
        const ok = push(o, Q, 'M6') && push(o2, P, 'M11') && push(o2, Q, 'M11');
        if (ok) { grid = '2x2'; } break;
      }
    }
    if (!grid) { optsOut.length = 0; seen.clear(); seen.add(exprStr(o, P)); }
  }
  if (!grid) {
    grid = '1x4';
    const forbOp = OPS.find(x => x !== o && forbidden(id, x, P, v));
    const rest = shuffle(OPS.filter(x => x !== o && x !== forbOp));
    const nOther = Math.min(rest.length, R() < 0.5 ? 1 : 2);
    for (let i = 0; i < nOther; i++) push(rest[i], P, 'M11');
    let guard = 0;
    while (optsOut.length < 3 && guard++ < 60) {
      const wantOOT = R() < 0.5;
      const oo = R() < 0.5 ? o : pick(OPS);
      const small = slots.slice().sort((a, b) => v[a] - v[b])[0];
      let cands = [];
      if (wantOOT) {
        P.forEach((x, i) => { if (x.t === 's') { const Q = P.slice(); Q[i] = { t: 'p1', k: small }; cands.push(Q); } });
        if (P.some(x => x.t === 'p1' || x.t === 'c')) P.forEach((x, i) => { if (x.t === 's') slots.filter(k => k !== x.k).forEach(k => { const Q = P.slice(); Q[i] = { t: 's', k }; cands.push(Q); }); });
        if (id.startsWith('ws')) cands.push([{ t: 's', k: 'S' }, { t: 'c', v: 2 }]);
      } else {
        const base = P.map(x => x.t === 'p1' ? { t: 's', k: x.k } : x.t === 'c' ? { t: 's', k: pick(slots) } : x);
        if (P.some(x => x.t === 'p1' || x.t === 'c')) cands.push(base);
        base.forEach((x, i) => { if (x.t === 's') slots.filter(k => k !== x.k).forEach(k => { const Q = base.slice(); Q[i] = { t: 's', k }; cands.push(Q); }); });
      }
      if (!cands.length) continue;
      const Q = pick(cands);
      const isOOT = Q.some(x => x.t === 'p1' || x.t === 'c');
      if (isOOT !== wantOOT) continue;
      push(oo, Q, 'fill');
    }
    if (optsOut.length < 3) return null;
  }
  const all = [{ ap: correct, lab: 'ok' }].concat(optsOut);
  const apKey = a => `${a.form}/${a.flags}`;
  const key = all.map(x => apKey(x.ap)).sort().join(' ; ');
  return { fmt: 'F2', lv, id, type: id.split(':')[0], ans: apKey(correct), apOpts: all.map(x => apKey(x.ap)), key, grid };
}

// ---------------- reweighting (4.3 規則 10)
function balance(cands, families, iters, finalFamilies, finalIters) {
  for (const c of cands) c.w = 1;
  const groups = families.map(f => { const g = new Map(); cands.forEach((c, i) => { const k = f.key(c); if (k === null) return; if (!g.has(k)) g.set(k, []); g.get(k).push(i); }); return g; });
  const step = (fi) => {
    const f = families[fi];
    for (const idx of groups[fi].values()) {
      const sum = new Map(); let tot = 0;
      for (const i of idx) { const a = f.ans(cands[i]); sum.set(a, (sum.get(a) || 0) + cands[i].w); tot += cands[i].w; }
      if (sum.size < 2) continue;
      const tgt = tot / sum.size;
      for (const i of idx) { const a = f.ans(cands[i]); cands[i].w *= tgt / sum.get(a); }
    }
  };
  for (let it = 0; it < iters; it++) for (let fi = 0; fi < families.length; fi++) step(fi);
  for (let it = 0; it < finalIters; it++) for (const fi of finalFamilies) step(fi);
}
function sampler(cands) {
  const cum = []; let s = 0; for (const c of cands) { s += c.w; cum.push(s); }
  return () => { const x = R() * s; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < x) lo = m + 1; else hi = m; } return cands[lo]; };
}
const F1_FAMILIES = [
  { key: c => c.key1, ans: c => c.ans },
  { key: c => c.key2, ans: c => c.ans },
  ...WIDS.map(w => ({ key: c => c.words.includes(w) ? w : null, ans: c => c.ans === TABLE[w] ? 'T' : 'O' })),
  { key: () => 'all', ans: c => c.ans },
];
const TEXT_FAMILIES = [
  ...WIDS.map(w => ({ key: c => c.words.includes(w) ? w : null, ans: c => c.ans === TABLE[w] ? 'T' : 'O' })),
  { key: () => 'all', ans: c => c.ans },
];

module.exports = { FAMILY, SCENE_TYPES, R: () => R(), setSeed, ri, pick, shuffle, SK, SK_IDS, TYPES, GA, GB, TABLE, NON_SIG, WIDS, SCENE_TYPICAL, POOL,
  makeF1, makeTextProb, buildF2, balance, sampler, F1_FAMILIES, TEXT_FAMILIES, mkProb, realize, wordsAt, countNums };
