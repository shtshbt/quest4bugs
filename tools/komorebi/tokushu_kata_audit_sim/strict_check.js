#!/usr/bin/env node
// Asserts the checks of 10 章 (docs/komorebi_tokushu_kata_curriculum.md, v0.4.4) on the output of
// strict_gen.js. Each check prints PASS / FAIL / NOTE with the offending values. Answers, signatures and
// error types are recomputed here from the scene model and the rendered text, independently of the
// generator's own bookkeeping.
//   node strict_check.js [sets-per-Lv] [seedA] [seedB]     (exit 1 when any check fails)
// Check 32 (enemy solvers) is run by:  STRICT=1 node audit.js <seed> 3000 20000
'use strict';
const fs = require('fs');
const path = require('path');
const G = require('./strict_gen.js');
const { loadDoc, section, tableIn } = require('./independent/doc_lib');

const N = +(process.argv[2] || 2000), SEEDS = [+(process.argv[3] || 4242), +(process.argv[4] || 777)];
if (!Number.isInteger(N) || N < 10) { console.error('sets-per-Lv must be an integer >= 10'); process.exit(2); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const DOCL = loadDoc();
const DOC = DOCL.join('\n');

// ---------- generate ----------
const RUNS = SEEDS.map(seed => {
  const SETS = {}, STATES = {};
  for (let lv = 1; lv <= 10; lv++) { const r = mulberry32(seed * 100 + lv), st = G.newState(); STATES[lv] = st; SETS[lv] = []; for (let i = 0; i < N; i++) SETS[lv].push(G.buildSet(lv, r, st)); }
  const ALL = []; for (let lv = 1; lv <= 10; lv++) for (const set of SETS[lv]) for (const it of set) ALL.push(it);
  console.error(`seed ${seed}: generated ${N} sets per Lv (${ALL.length} items)`);
  return { seed, SETS, STATES, ALL };
});

// ---------- reporting ----------
const results = [];
function check(no, title, fn) {
  const fails = [], note = [];
  for (const run of RUNS) { try { fn(run, m => fails.push(`[seed ${run.seed}] ${m}`), m => note.push(`[seed ${run.seed}] ${m}`)); } catch (e) { fails.push(`[seed ${run.seed}] exception: ${e.stack.split('\n').slice(0, 2).join(' ')}`); } }
  results.push({ no, title, fails, note });
}
const share = (a, b) => (b ? a / b : NaN);
const band = (x, lo, hi) => x >= lo - 1e-9 && x <= hi + 1e-9;
const fmt = x => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const NAMES = G.FAMILY.concat(G.NAME_POOL);
const stripNames = s => NAMES.reduce((t, n) => t.split(n).join(''), s);
const charLen = s => [...stripNames(s).replace(/\s/g, '')].length;
const KIN = G.KIN; const isKin = (a, b) => KIN.some(q => (q[0] === a && q[1] === b) || (q[1] === a && q[0] === b));
const TABLE = { W1: 'kb', W2: 'kb', W3: 'kb', W4: 'tk', W5: 'ws', W6: 'ws', W7: 'bp', W8: 'nr', W9: 'nr', W10: 'hk', W11: 'br', W12: 'sk' };
const TYPES = ['tk', 'kb', 'ws', 'sk', 'bp', 'hk', 'nr', 'br'], GA = ['tk', 'kb', 'ws', 'sk'], GB = ['bp', 'hk', 'nr', 'br'];
const pool = run => run.ALL.filter(p => ['F1', 'F2', 'F3', 'F4'].includes(p.fmt));
const bodyOf = p => p.s1 + ' ' + p.s2;
// v0.4.4 (10 章の頭書き): the shares that rule 10 sets are judged on the weighted candidates (expected values), not on
// counts of served problems, whose sampling noise at about 100 problems per key exceeds the 0.8 to 1.2 band
function wpool(run, fmt, lv) { const rk = run.STATES[lv].pools[fmt + ':' + lv]; if (!rk) return []; let z = 0; for (let i = 0; i < rk.items.length; i++) z += rk.w[i]; return rk.items.map((p, i) => ({ p, w: rk.w[i] / z })).filter(x => x.w > 0); }
function wgroups(list, key, lab) { const g = new Map(); for (const { p, w } of list) { const k = key(p); if (k === null) continue; if (!g.has(k)) g.set(k, { n: 0, w: 0, c: {} }); const e = g.get(k); e.n++; e.w += w; const l = lab(p); e.c[l] = (e.c[l] || 0) + w; } return g; }
// the problems of one Lv as a mixture: the raked formats (F1, F2, F4) by their weighted candidates scaled to their served
// count, and F3 and the two problems that share numbers by the served problems themselves
function mixture(run, lv) {
  const served = run.SETS[lv].flat().filter(p => ['F1', 'F2', 'F3', 'F4'].includes(p.fmt)); const out = [];
  for (const p of served) if (p.fmt === 'F3' || p.pairFirst || p.pairPrev) out.push({ p, w: 1 });
  for (const f of ['F1', 'F2', 'F4']) { const cnt = served.filter(p => p.fmt === f && !p.pairFirst && !p.pairPrev).length; if (cnt) for (const x of wpool(run, f, lv)) out.push({ p: x.p, w: x.w * cnt }); }
  return out;
}
const uneven = e => { const u = Object.keys(e.c); const exp = e.w / u.length; return u.some(l => !band(e.c[l] / exp, 0.8, 1.2)); };

// ---------- independent text readers ----------
// numbers shown in a text (4.7 の 3): every numeral except 1 and the "2 人" / "2 つの" naming the two people or amounts
function nums(text) { const out = []; for (const m of text.matchAll(/(-?\d+) (?=(\S+))/g)) { const n = +m[1], rest = m[2]; if (n === 1) continue; if (n === 2 && (/^人(が|の|は|と)/.test(rest) || /^つの/.test(rest))) continue; out.push(n); } return out; }
// 3.3 words, by word units (the question forms 何年後 / 何さい are not words)
const WDET = {
  W1: /あま(る|り|ります|りました|った)/, W2: /たり(ない|ず|ませ)/, W3: /ずつ/, W4: /足/, W5: /あわせて|和/, W6: /ちがい|ちがう|ちがいま|差|より/,
  W7: /倍/, W8: /\d+ 年(後|前)|か月後/, W9: /\d+ さい|年れい/, W10: /平均/, W11: /あげ|もらう|もらい|もらっ/, W12: /\S+と [^。]*?\S+で[、 ]/,
};
function words(text) { const t = text.replace(/まちが/g, '#').replace(/小さい/g, '#'); return Object.keys(WDET).filter(w => WDET[w].test(t)); }
// signature reader from the 3.1 署名 column (relations, not words)
function sig(text0) {
  const text = stripNames(text0);
  const sents = text.split('。').filter(s => s.trim());
  const t = text;
  const rel = {
    avg: /平均|ならす|ならした|分けなおす/.test(t),
    dist2: sents.filter(x => /(ずつ|買うと|すわると)[^。]*(あま|たりま|すわれ|あき|ほしく|のこり)/.test(x)).length >= 2 || (/ずつ 買う ときと/.test(t) && /ちがいます/.test(t)),
    comb2: sents.filter(x => /\d+ (こ|つ)と [^。]*\d+ (こ|つ)で|\d+ (こ|つ)、[^。]*\d+ (こ|つ) (買うと|あわせると)|\d+ (こ|つ)と [^。]*\d+ (こ|つ)を あわせると|\d+ 問と [^。]*\d+ 問 当て|1 (こ|つ)ずつ(で| 買うと| 買うのに| あわせると)/.test(x)).length >= 2 && !/より|と、[^。]*同じ/.test(t),
    unit2: /\d+ 円の ガムと 1 こ \d+ 円の あめ|\d+ こか \d+ こずつ|当たると \d+ 点、まちがえると|人がけと \d+ 人がけ|足は ぜんぶで/.test(t),
    sum: /あわせて|和は|1 こずつ 買うと|1 つずつで|の うち|分けたら|では、|もらいました|\d+ こを、[^。]*あまりました/.test(t),
    diff: /より [^。]*?(多|少|高|安|上)|差は|ちがいます|あと \d+ \S+ (あると|高いと|たつと|いると)、[^。]*同じ/.test(t),
    mult: /倍/.test(t), exch: /わたすと|あげると[、 ][^。]*倍/.test(t), eqinc: /同じ (数|金がく)ずつ/.test(t),
    age: /さい|年れい/.test(t), later: /何年か たつと|\d+ 年後に、[^。]*倍/.test(t), same: /そのとき/.test(t),
  };
  const c = [];
  if (rel.avg) c.push('hk');
  if (rel.dist2) c.push('kb');
  if (rel.comb2) c.push('sk');
  if (rel.unit2 && !rel.dist2 && !rel.comb2) c.push('tk');
  if (rel.mult && (rel.exch || (rel.eqinc && !rel.age))) c.push('br');
  if (rel.mult && rel.age && rel.later && !rel.same) c.push('nr');
  if (rel.mult && rel.sum && !rel.exch && !rel.eqinc && !(rel.age && rel.later)) c.push('bp');
  if (rel.sum && rel.diff && !rel.mult && !rel.comb2 && !rel.avg && !rel.dist2) c.push('ws');
  return c;
}
// ---------- scene model (independent) ----------
// the deco computation column of 付表 B, read here from the doc text
const tDeco = tableIn(DOCL, section(DOCL, '付表 B'), 1).rows.map(r => ({ w: r[0].split(' ')[0], sks: r[1].split('、').map(x => x.trim().replace(/〔和〕$/, '')), sent: r[2], text: r[3], calc: r[4], dn: r[5] }));
function slotsWithDeco(p) {
  const v = Object.assign({}, p.v);
  if (!p.deco) return v;
  const row = tDeco[p.deco.row]; const n = p.deco.nums; const m = row.calc.match(/^(\w+)(?: \((bp|sk) は (\w+)\))? = (\w+) ([−+±]) (\w+)$/);
  if (m) {
    const slot = m[2] && p.t === m[2] ? m[3] : m[1];
    const a = n[m[4]] !== undefined ? n[m[4]] : v[m[4]], b = n[m[6]] !== undefined ? n[m[6]] : v[m[6]];
    const val = m[5] === '−' ? a - b : a + b;
    if (['X', 'S0'].includes(m[4])) { v._decoSlot = slot; v._decoVal = val; } else v._decoCheck = [slot, val, v[slot]];
  }
  return v;
}
function answer(p) {
  const v = slotsWithDeco(p); const id = p.sk; const t = p.t;
  if (v._decoSlot && v._decoVal !== v[v._decoSlot]) return { err: `deco ${v._decoSlot} ${v._decoVal} != ${v[v._decoSlot]}` };
  if (v._decoCheck && v._decoCheck[0] !== 'b' && v._decoCheck[1] !== p.deco.nums.d && p.deco.nums.d !== undefined) { /* d = q − p is checked below */ }
  const q = p.hq;
  const r = (() => {
    switch (id) {
      case 'tk:B1': return (v.L - 2 * v.N) / 2;
      case 'tk:B2': return (v.T - v.b * v.N) / (v.a - v.b);
      case 'tk:B3': return (v.T - v.p * v.N) / (v.q - v.p);
      case 'tk:B5': return (v.S + v.q * v.N) / (v.p + v.q);
      case 'tk:B6': return (v.P - v.c1 * v.N) / (v.c2 - v.c1);
      case 'kb:B1': case 'kb:B3': case 'kb:B6': return (v.r + v.s) / (v.q - v.p);
      case 'kb:B2m': return (v.r + v.s) / (v.n - v.m);
      case 'kb:B2s': return v.D / (v.u * (v.q - v.p));
      case 'ws:B1': return (v.S - v.D) / 4;
      case 'ws:B4': return (v.S - v.D) / 2 - v.y;
      case 'ws:B2': case 'ws:B3': case 'ws:B5': case 'ws:B6': case 'ws:B7': return (v.S - v.D) / 2;
      case 'sk:B2a': case 'sk:B5': return (v.T2 - v.T1) / (v.c - 1);
      case 'sk:B2b': case 'sk:B3': return (v.T2 - v.T1) / 2;
      case 'bp:B4': return v.S / (v.k + 1) + v.y;
      case 'bp:B1': case 'bp:B2': case 'bp:B3': case 'bp:B7': { const less = /少ない|安い/.test(p.s1 + p.s2); return (v.S + (less ? v.c : -v.c)) / (v.k + 1); }
      case 'hk:B2': case 'hk:B3': return 4 * v.a - 3 * v.c;
      case 'hk:B4': return v.n * v.a - 2 * v.b;
      case 'hk:B5': return v.b * (v.n + 1) - v.a * v.n;
      case 'nr:B4a': { const tt = (v.A - v.k * v.B) / (v.k - 1); return /何年後/.test(q) ? tt : v.B + tt; }
      case 'nr:B4b': return v.D / (v.k - 1) - v.y;
      case 'br:B3w': case 'br:B7w': return /はじめ/.test(q) ? v.k * v.S / (v.k + 1) + v.m : (v.A + v.B) / (v.k + 1) - v.B;
      case 'br:B3d': return (v.A - v.k * v.B) / (v.k - 1);
      case 'br:B7d': return v.B + (v.A - v.k * v.B) / (v.k - 1);
    }
    return NaN;
  })();
  return { ans: r };
}
// independent one-step value (付表 B 一手) for F2
function oneStepValue(p) {
  const v = p.v, id = p.sk, t = p.t;
  if (id === 'tk:B1') return 2 * v.N;
  if (t === 'tk') return { 'tk:B2': v.b, 'tk:B3': v.p, 'tk:B5': v.p, 'tk:B6': v.c1 }[id] * v.N;
  if (t === 'kb') return v.r + v.s;
  if (t === 'ws') return v.S - v.D;
  if (t === 'sk') return v.T2 - v.T1;
  if (id === 'bp:B4') return v.S / (v.k + 1);
  if (t === 'bp') return (v.S + (/少ない|安い/.test(p.s1 + p.s2) ? v.c : -v.c)) / (v.k + 1);
  if (t === 'hk') return v.a * (['hk:B2', 'hk:B3'].includes(id) ? 4 : v.n);
  if (t === 'nr') return v.A - v.B;
  if ((id === 'br:B3w' || id === 'br:B7w')) return /はじめ/.test(p.hq) ? v.S / (v.k + 1) : (v.A + v.B) / (v.k + 1);
  return v.A - v.B;
}
const evalExpr = e => Function('"use strict";return (' + e.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/') + ')')();
// independent 8.1 / 4.9 labels for F1
function expectF1Labels(p, prevT, run) {
  const ordered = []; for (const s of [p.s1, p.s2]) for (const w of Object.keys(WDET)) { const t = s.replace(/まちが/g, '#').replace(/小さい/g, '#'); const m = t.match(WDET[w]); if (m) ordered.push({ w, pos: (s === p.s1 ? 0 : 10000) + m.index }); }
  ordered.sort((a, b) => a.pos - b.pos);
  const tw = new Map(); for (const x of ordered) if (!tw.has(TABLE[x.w])) tw.set(TABLE[x.w], x.w);
  const brd = ['br:B3d', 'br:B7d'].includes(p.sk);
  const lab = p.opts.map(x => { if (x === p.t) return null; if (tw.has(x)) return 'M1:' + tw.get(x); if (G.SCENE_TYPICAL[p.sc] === x) return 'M2'; if (isKin(p.t, x) && !(brd && x === 'nr')) return 'M4'; if (prevT === x) return 'M5'; return 'M12'; });
  const kidx = x => KIN.findIndex(q => (q[0] === p.t && q[1] === x) || (q[1] === p.t && q[0] === x));
  let kept = false; p.opts.map((x, i) => [x, i]).filter(([, i]) => lab[i] === 'M4').sort((a, b) => kidx(a[0]) - kidx(b[0])).forEach(([, i]) => { if (kept) lab[i] = 'M12'; kept = true; });
  for (const m of ['M2', 'M5']) { let first = true; lab.forEach((l, i) => { if (l === m) { if (!first) lab[i] = 'M12'; first = false; } }); }
  const seen = new Set(); lab.forEach((l, i) => { if (l && l.startsWith('M1:')) { if (seen.has(l)) lab[i] = 'M12'; seen.add(l); } });
  return lab;
}

// ---------- doc tables ----------
const t52 = tableIn(DOCL, section(DOCL, '5.2 形式配合'));
const FORM = {}; t52.rows.forEach(r => { const lv = +r[0]; FORM[lv] = lv === 10 ? null : { F1: +r[1], F2: +r[2], F3: +r[3], F4: +r[4], F5: +r[5], F6: +r[6] }; });
const t82 = tableIn(DOCL, section(DOCL, '8.2 Lv 別の可用型'));
const AVAIL = {}; t82.rows.forEach(r => { AVAIL[+r[0]] = r[1] === '全 16 種' ? null : r[1].split(/\s+/); });
const t94 = tableIn(DOCL, section(DOCL, '9.4 Lv 別の patternId 空間'));
const SPACE = {}; t94.rows.forEach(r => { SPACE[+r[0]] = +r[4]; });
const SKB = G.SKB;

// ---------- checks ----------
check(1, '解の存在', (run, fail) => {
  for (const p of pool(run)) { const a = answer(p); if (a.err) { fail(`${p.patternId}: ${a.err}`); return; } if (!(Number.isInteger(a.ans) && a.ans > 0)) { fail(`${p.patternId} answer ${a.ans} | ${bodyOf(p)} ${p.hq}`); return; } }
  for (const p of run.ALL.filter(x => x.fmt === 'F5')) for (const o of p.optsModel) { const q = { sk: o.id, t: o.t, v: Object.assign({}, o.v), hq: SKB[o.id].q, s1: p.stem, s2: o.text, deco: null }; if (o.t === 'sk') q.v.T1 = o.v.S; const a = answer(q); if (!(Number.isInteger(a.ans) && a.ans > 0)) { fail(`F5 option ${o.id} answer ${a.ans}: ${o.text}`); return; } }
  for (const p of run.ALL.filter(x => x.fmt === 'F6')) { const v = p.v; let ok; if (p.rid === 'R1') ok = Number.isInteger(v.a - v.D / 2) && v.D % 2 === 0; if (p.rid === 'R2') ok = Number.isInteger((v.v * v.N - v.q * v.N) / (v.p - v.q)); if (p.rid === 'R3') ok = Number.isInteger((v.A - v.k * v.B) / (v.k - 1)) && (v.A - v.k * v.B) / (v.k - 1) > 0; if (p.rid === 'R4') ok = Number.isInteger((v.S + 2 * v.y) / (v.k + 1)) && (v.S + 2 * v.y) / (v.k + 1) - v.y >= 1; if (p.rid === 'R5') ok = Number.isInteger(2 * v.a / (v.k + 1)); if (!ok) { fail(`F6 ${p.rid} ${JSON.stringify(v)}`); return; } }
});
check(2, '署名の一致', (run, fail) => { let bad = 0, n = 0; const ex = []; for (const p of pool(run)) { n++; const s = sig(bodyOf(p)); if (!(s.length === 1 && s[0] === p.t)) { bad++; if (ex.length < 4) ex.push(`${p.sk}${p.deco ? '+' + p.deco.w : ''} -> [${s}] ${bodyOf(p)}`); } } if (bad) fail(`${bad}/${n} ${ex.join(' || ')}`); });
check(3, '集合の一致', (run, fail) => {
  const t101 = tableIn(DOCL, section(DOCL, '10.1 敵ソルバーの正本'));
  const stated = DOC.match(/(\d+) 行で全部である \(段 A/); if (!stated || +stated[1] !== t101.rows.length) fail(`10.1 rows ${t101.rows.length} vs stated ${stated && stated[1]}`);
  if (tableIn(DOCL, section(DOCL, '付表 B')).rows.length !== 36) fail('付表 B rows');
  // 9.4 against the patternIds that occur
  for (let lv = 1; lv <= 10; lv++) { const seen = new Set(run.SETS[lv].flatMap(s => s.map(p => p.patternId))); if (seen.size > SPACE[lv]) fail(`Lv${lv}: ${seen.size} patternIds > 9.4 ${SPACE[lv]}`); if (seen.size < SPACE[lv] * 0.95) fail(`Lv${lv}: only ${seen.size} of 9.4 ${SPACE[lv]} occur`); }
  // 8.2 contains the measured types
  for (let lv = 1; lv <= 10; lv++) { if (!AVAIL[lv]) continue; const used = new Set(run.SETS[lv].flat().flatMap(p => (p.optionTypes || []).filter(Boolean).map(x => x.split(':')[0]))); const miss = [...used].filter(x => !AVAIL[lv].includes(x)); if (miss.length) fail(`8.2 Lv${lv} lacks ${miss}`); }
});
check(4, '形式配合', (run, fail) => { for (let lv = 1; lv <= 10; lv++) for (const s of run.SETS[lv]) { const c = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0, F6: 0 }; s.forEach(p => c[p.fmt]++); if (lv === 10) { if (!(s.length === 5 && Object.values(c).filter(x => x === 1).length === 5)) { fail(`Lv10 ${JSON.stringify(c)}`); return; } } else if (Object.keys(c).some(k => c[k] !== FORM[lv][k])) { fail(`Lv${lv} ${JSON.stringify(c)}`); return; } } });
check(5, '群の範囲', (run, fail) => {
  for (const lv of [1, 3]) for (const s of run.SETS[lv]) if (s.some(p => !GA.includes(p.t))) { fail(`Lv${lv} group B answer`); return; }
  for (const lv of [2, 4]) for (const s of run.SETS[lv]) if (s.some(p => !GB.includes(p.t))) { fail(`Lv${lv} group A answer`); return; }
  for (const lv of [1, 2]) for (const s of run.SETS[lv]) if (new Set(s.map(p => p.t)).size !== 4) { fail(`Lv${lv} set lacks a type`); return; }
  // Lv3+: distinct-type count per set against independent draws, each problem from the marginal of its own format (pairs left out)
  for (let lv = 3; lv <= 10; lv++) {
    const sets = run.SETS[lv].map(st => st.filter(p => !p.pairFirst && !p.pairPrev && !['F5', 'F6'].includes(p.fmt)));
    const marg = {}; sets.flat().forEach(p => { marg[p.fmt] = marg[p.fmt] || {}; marg[p.fmt][p.t] = (marg[p.fmt][p.t] || 0) + 1; });
    const R = mulberry32(run.seed + lv); const draw = f => { const m = marg[f]; const tot = Object.values(m).reduce((a, b) => a + b, 0); let u = R() * tot; for (const [t, c] of Object.entries(m)) { u -= c; if (u < 0) return t; } return Object.keys(m)[0]; };
    const obs = {}, sim = {}; for (const st of sets) { const k = new Set(st.map(p => p.t)).size; obs[k] = (obs[k] || 0) + 1; const k2 = new Set(st.map(p => draw(p.fmt))).size; sim[k2] = (sim[k2] || 0) + 1; }
    let tv = 0; for (const k of new Set(Object.keys(obs).concat(Object.keys(sim)))) tv += Math.abs((obs[k] || 0) - (sim[k] || 0)) / sets.length; if (tv / 2 > 0.05) fail(`Lv${lv} distinct-type distribution TV ${fmt(tv / 2)}`);
  }
});
check(6, '場面の分散', (run, fail) => {
  for (const [sc, ts] of Object.entries(G.SCENE_TYPES)) if (ts.length < 3) fail(`scene ${sc} has ${ts.length} types`);
  for (const t of TYPES) { const scs = Object.keys(G.SCENE_TYPES).filter(sc => G.SCENE_TYPES[sc].includes(t)); if (t !== 'nr' && scs.length < 2) fail(`type ${t} on ${scs.length} scene`); }
  for (const p of run.SETS[3].flat()) if (['B4', 'B7'].includes(p.sc) || (p.fmt === 'F1' && p.sc === 'B5')) { fail('Lv3 uses ' + p.sc); return; }
  for (const p of run.ALL) if (p.fmt === 'F1' && ['B1', 'B6'].includes(p.sc)) { fail('F1 on ' + p.sc); return; }
  for (const p of run.SETS[4].flat()) if (['B1', 'B5', 'B6'].includes(p.sc)) { fail('Lv4 uses ' + p.sc); return; }
});
check(7, 'patternId', (run, fail) => { for (let lv = 1; lv <= 10; lv++) for (const s of run.SETS[lv]) { const c = {}; for (const p of s) { c[p.patternId] = (c[p.patternId] || 0) + 1; const parts = p.patternId.split(':'); const sk = parts.slice(1).join(':'); if (p.fmt !== 'F5' && p.fmt !== 'F6' && !(SKB[sk] && sk === p.sk)) { fail(`bad id ${p.patternId} (${p.sk})`); return; } if (p.fmt === 'F6' && !(G.LINKS[parts[1]] && ['1', '2'].includes(parts[2]))) { fail(`bad id ${p.patternId}`); return; } if (p.fmt === 'F2' && !SKB[sk].f2) { fail(`F2 on ${sk}`); return; } if (p.fmt === 'F3' && !SKB[sk].f3) { fail(`F3 on ${sk}`); return; } } if (Object.values(c).some(x => x > 2)) { fail(`Lv${lv} patternId > 2`); return; } } });
check(8, '数を共有する 2 問', (run, fail) => {
  const allowed = { 3: ['CP6'], 4: ['CP3'], 5: ['CP3', 'CP6'], 7: ['CP3', 'CP6', 'CP5'], 8: ['CP3', 'CP6'] };
  for (const lv of [3, 4, 5, 7, 8]) for (const s of run.SETS[lv]) {
    const i = s.findIndex(p => p.pairFirst); if (i < 0 || !s[i + 1] || !s[i + 1].pairPrev) { fail(`Lv${lv} pair missing or not adjacent`); return; }
    const a = s[i], b = s[i + 1];
    if (a.sc !== b.sc) { fail('scene differs'); return; }
    if (a.seq.slice().sort().join() !== b.seq.slice().sort().join()) { fail(`multiset ${a.seq} vs ${b.seq}`); return; }
    if (!allowed[lv].includes(a.cp)) { fail(`Lv${lv} uses ${a.cp}`); return; }
    if (lv === 7 && (a.fmt === 'F2') !== (a.cp === 'CP5')) { fail('Lv7 F2 pair not CP5'); return; }
    if (a.pairKind === 'CP' && a.t === b.t && a.cp !== 'CP5') { fail('contrast pair same type'); return; }
    if (a.pairKind === 'SP' && a.sk !== b.sk) { fail('same-type pair different skeleton'); return; }
    if (['CP3', 'CP5'].includes(a.cp)) { const f1 = x => (x.swapped ? x.s2 : x.s1); if (a.s1 !== b.s1 && a.pairKind === 'CP') { fail(`CP first sentence differs: ${a.s1} / ${b.s1}`); return; } }
    for (const p of [a, b]) { if (p.t === 'kb' && /あまります|たりません/.test(bodyOf(p))) { fail('pair kb with cue'); return; } if ((p.sk === 'br:B3w' || p.sk === 'br:B7w') && /あげると/.test(bodyOf(p))) { fail('pair br あげる'); return; } if (p.sk === 'br:B3d' && /もらう/.test(bodyOf(p))) { fail('pair br:B3d もらう'); return; } if (p.deco && p.deco.dn) { fail('pair number deco'); return; } }
    if (a.cp === 'CP5' && a.options.slice().sort().join() !== b.options.slice().sort().join()) { fail('CP5 options differ'); return; }
    const ans = answer(b); if (!(Number.isInteger(ans.ans) && ans.ans > 0)) { fail('second of pair unsolvable'); return; }
  }
});
check(9, '対比と同型の割合 (C6)', (run, fail) => { for (const lv of [3, 4, 5, 7, 8]) { const ps = run.SETS[lv].map(s => s.find(p => p.pairPrev)); const c = share(ps.filter(p => p.pairKind === 'CP').length, ps.length); if (!band(c, 0.45, 0.55)) fail(`Lv${lv} contrast share ${fmt(c)}`); for (const s of run.SETS[lv]) { const i = s.findIndex(p => p.pairPrev); const b = s[i], a = s[i - 1]; if (b.fmt === 'F1') { const partner = Object.values(G.CP).flat().find(pr => pr.includes(a.sk)); const pt = partner && partner.map(x => x.split(':')[0]).find(t => t !== a.t); if (!b.opts.includes(a.t) || (pt && !b.opts.includes(pt))) { fail(`Lv${lv} second options lack ${a.t}/${pt}`); return; } } } } });
check(10, '足場', (run, fail) => { const t71 = tableIn(DOCL, section(DOCL, '7.1 わざの語彙')); const step = {}; t71.rows.forEach(r => { step[r[1]] = r[3]; }); for (let lv = 1; lv <= 10; lv++) for (const s of run.SETS[lv]) s.forEach((p, i) => { const want = lv <= 2 && i < 2; if (want !== !!p.scaffold) { fail(`Lv${lv} pos ${i} scaffold ${!!p.scaffold}`); } else if (want && p.scaffold !== step[p.t]) fail(`scaffold text ${p.scaffold}`); }); });
check(11, '偽装語の付与', (run, fail, note) => {
  for (const lv of [1, 2]) if (run.SETS[lv].flat().some(p => p.deco)) { fail(`Lv${lv} has deco`); return; }
  const cand = []; for (let lv = 3; lv <= 10; lv++) for (const rk of Object.values(run.STATES[lv].pools)) cand.push(...rk.items.filter(p => !p.topup && !p.pairFirst && !p.pairPrev && p.decoDrew !== undefined));
  const drew = share(cand.filter(p => p.decoDrew).length, cand.length), att = share(cand.filter(p => p.deco).length, cand.filter(p => p.decoDrew).length);
  const served = []; for (let lv = 3; lv <= 10; lv++) served.push(...run.SETS[lv].flat().filter(p => ['F1', 'F2', 'F3', 'F4'].includes(p.fmt) && !p.pairFirst && !p.pairPrev && !p.topup));
  if (!band(drew, 0.65, 0.75)) fail(`candidates that drew a word ${fmt(drew)}`); else note(`drew ${fmt(drew)}, attached when drawn ${fmt(att)}, served with deco ${fmt(share(served.filter(p => p.deco).length, served.length))}`);
});
check(12, '語の独立 (同じ場面の型どうし)', (run, fail) => {
  for (const sc of Object.keys(G.SCENE_TYPES)) {
    // v0.4.4: F2 candidates and the served F3; F4 keeps only problems with a word (4.5 の 7), so it is not counted
    const ps = []; for (let lv = 3; lv <= 10; lv++) { const rk = run.STATES[lv].pools['F2:' + lv]; if (rk) ps.push(...rk.items.filter(p => p.sc === sc)); ps.push(...run.SETS[lv].flat().filter(p => p.fmt === 'F3' && p.sc === sc)); }
    const words = [...new Set(tDeco.filter(r => r.sks.some(k => SKB[k].sc === sc)).map(r => r.w))];
    for (const w of words) { const types = [...new Set(tDeco.filter(r => r.w === w).flatMap(r => r.sks).filter(k => SKB[k].sc === sc).map(k => SKB[k].t))]; if (types.length < 2) continue; const rate = types.map(t => { const q = ps.filter(p => p.t === t && tDeco.some(r => r.w === w && r.sks.includes(p.sk) && !(p.sk === 'br:B3w' && p.fm !== '和')) && !(p.wordSetBase || []).includes(w)); return share(q.filter(p => p.deco && p.deco.w === w).length, q.length); }); const mean = rate.reduce((a, b) => a + b, 0) / rate.length; if (rate.some(x => !band(x / mean, 0.7, 1.3))) fail(`${sc} ${w}: ${types.map((t, i) => t + ' ' + fmt(rate[i])).join(', ')}`); }
  }
});
const R13 = {};
check(13, '語ごとの条件付き正答率 (C7)', (run, fail, note) => {
  for (let lv = 3; lv <= 10; lv++) {
    const ps = run.SETS[lv].flat().filter(p => ['F1', 'F2', 'F3', 'F4'].includes(p.fmt));
    const mx = mixture(run, lv); const wd = x => words(x.p.fmt === 'F1' ? bodyOf(x.p) : bodyOf(x.p) + ' ' + x.p.hq);
    const mw = mx.map(x => ({ x, ws: wd(x) }));
    for (const w of Object.keys(TABLE)) { const q = mw.filter(y => y.ws.includes(w)); const tot = q.reduce((a, y) => a + y.x.w, 0); const k = q.filter(y => y.x.p.t === TABLE[w]).reduce((a, y) => a + y.x.w, 0); if (tot >= 30 && k / tot > 0.60) fail(`Lv${lv} ${w} ${fmt(k / tot)} (weighted ${tot.toFixed(0)})`); }
    if (ps.some(p => words(bodyOf(p) + ' ' + (p.fmt === 'F1' ? '' : p.hq)).includes('W10'))) fail(`Lv${lv} W10 present`);
    const q5 = share(ps.filter(p => p.fmt !== 'F1' && /何年後/.test(p.hq)).length, ps.length); if (q5 > 0.05) fail(`Lv${lv} Q5 ${fmt(q5)}`);
  }
});
check(14, '主の型の言い換え (候補で数える)', (run, fail, note) => {
  const cand = []; for (let lv = 1; lv <= 10; lv++) for (const rk of Object.values(run.STATES[lv].pools)) cand.push(...rk.items.filter(p => !p.pairFirst && !p.pairPrev).map(p => Object.assign(p, { _lv: lv })));
  const sh = (f, g) => { const q = cand.filter(f); return [share(q.filter(g).length, q.length), q.length]; };
  const cases = [
    ['kb cue (B1 B2m B3)', p => ['kb:B1', 'kb:B2m', 'kb:B3'].includes(p.sk), p => /あまります/.test(p.s1 + p.s2 + (p.deco ? '' : '')) || /たりません/.test(p.s2), 0.45, 0.55],
    ['hk 平均 Lv1-2', p => p.t === 'hk' && p._lv <= 2, p => /平均/.test(bodyOf(p)), 0.35, 0.45],
    ['hk 平均 Lv3+', p => p.t === 'hk' && p._lv >= 3, p => /平均/.test(bodyOf(p)), 0, 0],
    ['br わたす', p => ['br:B3w', 'br:B7w'].includes(p.sk), p => /わたす/.test(bodyOf(p)), 0.75, 0.85],
    ['br:B3w 和', p => p.sk === 'br:B3w', p => p.fm === '和', 0.45, 0.55],
    ['br:B3d ふえる', p => p.sk === 'br:B3d', p => /ふえると/.test(bodyOf(p)), 0.65, 0.75],
    ['bp const (not B4)', p => p.t === 'bp' && p.sk !== 'bp:B4', p => /倍より/.test(bodyOf(p)), 1, 1],
    ['bp 多い', p => p.t === 'bp' && p.sk !== 'bp:B4', p => /(多い|高い)です/.test(p.s2) || /(多い|高い)です/.test(p.s1), 0.45, 0.55],
    ['hk 比べる値が大きい (B2 B3 B5)', p => ['hk:B2', 'hk:B3', 'hk:B5'].includes(p.sk), p => (p.sk === 'hk:B5' ? p.v.b > p.v.a : p.v.c > p.v.a), 0.4, 0.6],
    ['br 差がかわらない形', p => p.t === 'br', p => /d$/.test(p.sk), 0.4, 0.6],
    ['ws より形', p => p.t === 'ws', p => /より/.test(p.s2), 0.45, 0.55],
    ['sk 〜と〜で (B2a B2b B3)', p => ['sk:B2a', 'sk:B2b', 'sk:B3'].includes(p.sk), p => /(こ|つ)で /.test(p.s2), 0.45, 0.55],
  ];
  for (const [name, f, g, lo, hi] of cases) { const [x, n] = sh(f, g); if (!n) continue; if (!band(x, lo, hi)) fail(`${name} ${fmt(x)} (${n})`); }
  // the served shares are a record (11.8)
});
check(15, '偽装語の意味', (run, fail) => {
  for (const p of pool(run).filter(x => x.deco)) {
    const row = tDeco[p.deco.row]; if (!row.sks.includes(p.sk)) { fail(`${p.deco.w} on ${p.sk} not in the table`); return; }
    const v = slotsWithDeco(p); if (v._decoSlot && v._decoVal !== p.v[v._decoSlot]) { fail(`${p.sk} ${row.calc}: ${v._decoVal} vs ${p.v[v._decoSlot]}`); return; }
    for (const [k, x] of Object.entries(p.deco.nums)) if (!nums(bodyOf(p)).includes(x)) { fail(`deco number ${k}=${x} not shown in ${bodyOf(p)}`); return; }
    const frag = row.text.split('{')[0].trim().split(/\s+/).pop() || ''; if (!bodyOf(p).includes(frag)) { fail(`deco text not in ${bodyOf(p)}`); return; } // v0.4.4: the people are names, so the fragment is the last word before the first slot
    const s = sig(bodyOf(p)); if (!(s.length === 1 && s[0] === p.t)) { fail(`signature with deco ${p.sk}+${p.deco.w}: [${s}] ${bodyOf(p)}`); return; }
  }
});
check(16, '正解位置', (run, fail) => { for (const k of [3, 4]) { const ps = run.ALL.filter(p => p.options && p.options.length === k); const c = Array(k).fill(0); ps.forEach(p => c[p.ans]++); const [lo, hi] = k === 4 ? [0.2, 0.3] : [0.28, 0.39]; c.forEach((x, i) => { if (!band(x / ps.length, lo, hi)) fail(`${k} options pos ${i} ${fmt(x / ps.length)}`); }); } });
check(17, 'F1 の肢', (run, fail) => {
  for (let lv = 3; lv <= 10; lv++) for (const p of run.SETS[lv].flat().filter(x => x.fmt === 'F1')) {
    const S = p.opts; if (S.length !== 4 || new Set(S).size !== 4 || !S.includes(p.t)) { fail(`Lv${lv} options ${S}`); return; }
    if (lv === 3 && S.slice().sort().join() !== GA.slice().sort().join()) { fail('Lv3 options'); return; }
    if (lv === 4 && S.slice().sort().join() !== (p.sc === 'B4' ? ['bp', 'hk', 'nr', 'ws'] : GB).slice().sort().join()) { fail('Lv4 options'); return; }
    if (lv >= 5) { const on = G.SCENE_TYPES[p.sc]; const inScene = S.filter(t => on.includes(t)).length; if (inScene !== Math.min(4, on.length)) { fail(`Lv${lv} ${p.sc} in-scene options ${inScene}`); return; } }
    if (p.t === 'nr' && S.includes('br')) { fail('nr with br option'); return; }
  }
  for (const p of run.ALL.filter(x => x.fmt === 'F6')) if ((p.t === 'nr' || p.other === 'nr') && p.opts.includes('br')) { fail('F6 nr link with br'); return; }
});
check(18, 'F2 の肢', (run, fail, note) => {
  const f2 = run.ALL.filter(p => p.fmt === 'F2');
  for (const p of f2) {
    if (!SKB[p.sk].f2) { fail('F2 on ' + p.sk); return; }
    const vals = p.options.map(evalExpr); const want = oneStepValue(p);
    if (Math.abs(vals[p.ans] - want) > 1e-9) { fail(`${p.sk} correct ${p.options[p.ans]} = ${vals[p.ans]} != ${want}`); return; }
    if (new Set(p.options).size !== 4) { fail('duplicate options'); return; }
    if (p.gridKind === '2x2') { const lk = p.optionMeta.map(m => m.look); const ci = p.ans; const sameOp = p.optionMeta.filter(m => m.o === p.optionMeta[ci].o); if (sameOp.length !== 2 || sameOp[0].look !== sameOp[1].look) { fail(`2x2 looks ${lk} ${p.options}`); return; } }
    // forbidden expressions (4.5 章の 4)
    const v = p.v; const forb = []; if (p.t === 'tk' && p.sk !== 'tk:B5') forb.push([{ 'tk:B1': 4, 'tk:B2': v.a, 'tk:B3': v.q, 'tk:B6': v.c2 }[p.sk] * v.N, '×']); if (p.t === 'ws') forb.push([v.S + v.D, '+']); if (p.t === 'kb') forb.push([p.sk === 'kb:B2m' ? v.n - v.m : v.q - v.p, '−']); if (p.sk === 'hk:B5') forb.push([v.b * (v.n + 1), '×']);
    const forbPairs = []; if (p.t === 'tk' && p.sk !== 'tk:B5') forbPairs.push(['×', [{ 'tk:B1': 4, 'tk:B2': v.a, 'tk:B3': v.q, 'tk:B6': v.c2 }[p.sk], v.N]]); if (p.t === 'ws') forbPairs.push(['+', [v.S, v.D]]); if (p.t === 'kb') forbPairs.push(['−', p.sk === 'kb:B2m' ? [v.m, v.n] : [v.p, v.q]]); if (p.sk === 'hk:B5') forbPairs.push(['×', [v.b, v.n + 1]]);
    for (const [op, pr] of forbPairs) p.optionMeta.forEach((m, i) => { if (i !== p.ans && m.o === op && m.vals.slice().sort((a, b) => a - b).join() === pr.slice().sort((a, b) => a - b).join()) fail(`forbidden ${p.options[i]} in ${p.sk}`); });
  }
  const sw = share(f2.filter(p => p.swapped).length, f2.length); if (!band(sw, 0.45, 0.55)) fail(`swap share ${fmt(sw)}`);
});
check(19, '肢の集合の形 (C5)', (run, fail, note) => {
  for (const lv of [7, 8, 10]) { const f2 = wpool(run, 'F2', lv).filter(x => x.p.gridKind !== 'cp5'); const g = wgroups(f2, p => p.optionMeta.map(m => m.look).sort().join(';'), p => p.optionMeta[p.ans].look); let bad = 0, big = 0; const ex = []; for (const [k, e] of g) { if (e.n < 30) continue; big++; if (uneven(e)) { bad++; ex.push(k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(e.c).map(([a, b]) => [a, +(b / e.w).toFixed(2)])))); } } if (bad) fail(`Lv${lv}: ${bad} of ${big} look sets (weighted) uneven: ${ex.slice(0, 2).join(' | ')}`); }
  note('Lv1 and 2: the 0.3 weight is structural (strict_gen poolF2); Bshape via STRICT=1 node audit.js');
});
check(20, 'F3', (run, fail) => {
  const f3 = run.ALL.filter(p => p.fmt === 'F3'); if (f3.some(p => !SKB[p.sk].f3)) fail('F3 skeleton');
  if (f3.some(p => p.sk === 'br:B3w' && p.fm !== '和')) fail('F3 br:B3w not 和');
  const first = share(f3.filter(p => p.keyRole === 0).length, f3.length); if (!band(first, 0.4, 0.6)) fail(`key first ${fmt(first)}`);
  if (f3.some(p => p.options[p.ans] !== p.s2)) fail('key is not s2');
  if (f3.some(p => !words(p.s1).length)) fail(`non-key sentence without cue: ${f3.find(p => !words(p.s1).length).s1}`);
  const ws = share(f3.filter(p => p.t === 'ws').length, f3.length), wsExp = 7 * 0.6 / (7 * 0.6 + 6 + 0.8); if (!band(ws / wsExp, 0.9, 1.1)) fail(`ws weight share ${fmt(ws)} vs ${fmt(wsExp)}`);
});
const FIRST33 = {}; tableIn(DOCL, section(DOCL, '3.3')).rows.forEach(r => { FIRST33[r[0]] = r[1].split('、')[0].trim(); });
check(21, 'F4', (run, fail) => {
  const f4 = run.ALL.filter(p => p.fmt === 'F4'); const c = share(f4.filter(p => p.propCorrect).length, f4.length); if (!band(c, 0.25, 0.45)) fail(`proposal correct ${fmt(c)}`);
  for (const p of f4) { if (!(p.text.startsWith(p.person + 'は、「') && p.text.endsWith(p.person + 'の 考えは 正しい?'))) { fail('F4 text ' + p.text); return; } const ws = words(bodyOf(p) + ' ' + p.hq); if (!ws.includes(p.propWord)) { fail('proposal word not in text'); return; }
    // v0.4.4 (4.5 の 7): the quote is a literal form, found in the text unless it is the word's first form (たりない for たりません)
    if (/[()（）…\/]/.test(p.quote) || (!(bodyOf(p) + ' ' + p.hq).includes(p.quote) && p.quote !== FIRST33[p.propWord])) { fail(`quote 「${p.quote}」 in ${bodyOf(p)} ${p.hq}`); return; } }
  for (const lv of [6]) { const sets = run.SETS[lv]; const pairs = sets.map(s => s.filter(p => p.fmt === 'F4').map(p => p.propCorrect)); const agree = share(pairs.filter(x => x[0] === x[1]).length, pairs.length); const pc = share(pairs.flat().filter(Boolean).length, pairs.flat().length); const ind = pc * pc + (1 - pc) * (1 - pc); if (Math.abs(agree - ind) > 0.1) fail(`Lv6 F4 agreement ${fmt(agree)} vs ${fmt(ind)}`); }
});
check(22, '型づくり (F5)', (run, fail) => {
  const tC = tableIn(DOCL, section(DOCL, '付表 C')); const ok = {}; tC.rows.forEach(r => r[3].split('、').forEach(t => { ok[r[0] + ':' + t.trim()] = true; }));
  for (const p of run.ALL.filter(x => x.fmt === 'F5')) {
    if (!ok[p.group + ':' + p.t]) { fail(`target ${p.t} in ${p.group}`); return; }
    if (p.optsModel.filter(o => o.t === p.t).length !== 1) { fail('target type count'); return; }
    const byT = {}; p.optsModel.forEach(o => { byT[o.t] = (byT[o.t] || 0) + 1; }); if (Object.values(byT).some(x => x > 2)) { fail('3 of one type'); return; }
    const cue = { ws: ['W5', 'W6'], bp: ['W7'], br: ['W11'] }[p.t]; const has = t => words(t).some(w => cue.includes(w)); const cc = has(p.options[p.ans]); if (!p.options.some((t, i) => i !== p.ans && has(t) === cc)) { fail('cue balance ' + p.options); return; }
    if (p.t === 'br' && words(p.options[p.ans]).includes('W11')) { fail('br target with W11'); return; }
    for (const o of p.optsModel) if (sig(p.stem + ' ' + o.text).join() !== o.t) { fail(`F5 option sig ${o.text} -> ${sig(p.stem + ' ' + o.text)} (${o.t})`); return; }
  }
});
check(23, '連結 (F6)', (run, fail) => {
  const f6 = run.ALL.filter(p => p.fmt === 'F6');
  const d1 = share(f6.filter(p => p.dir === 1).length, f6.length), ff = share(f6.filter(p => p.firstFirst).length, f6.length), ps = share(f6.filter(p => p.opts.includes(p.other)).length, f6.length);
  if (!band(d1, 0.4, 0.6)) fail(`dir1 ${fmt(d1)}`); if (!band(ff, 0.4, 0.6)) fail(`first-type sentence first ${fmt(ff)}`); if (!band(ps, 0.4, 0.6)) fail(`partner shown ${fmt(ps)}`);
  for (const p of f6) { const i = p.opts.indexOf(p.other); if (i >= 0 && p.optionTypes[i] !== 'M5') { fail(`partner label ${p.optionTypes[i]}`); return; } }
  const lv9 = run.SETS[9]; for (const s of lv9) { const r = new Set(s.filter(p => p.fmt === 'F6').map(p => p.rid)); if (r.size < 3) { fail('Lv9 links < 3'); return; } }
});
check(24, '誤答の型', (run, fail, note) => {
  for (let lv = 1; lv <= 10; lv++) for (const s of run.SETS[lv]) s.forEach((p, i) => {
    if (!p.optionTypes || p.optionTypes.length !== p.options.length) { fail(`${p.fmt} labels missing`); return; }
    if (p.optionTypes.some((l, j) => (j === p.ans) !== (l === null))) { fail(`${p.fmt} null label not at answer`); return; }
    if (p.fmt === 'F1') { const exp = expectF1Labels(p, p.pairPrev ? s[i - 1].t : null); if (exp.join() !== p.optionTypes.join()) fail(`F1 labels ${p.optionTypes} vs ${exp} | ${bodyOf(p)} | ${p.opts}`); }
    for (const [j, l] of p.optionTypes.entries()) if (l === 'M4') { const t = p.fmt === 'F5' ? p.optsModel[j].t : p.opts[j]; if (!isKin(p.t, t)) fail(`M4 on non-kin ${p.t}/${t}`); }
    if (['F1', 'F5', 'F6'].includes(p.fmt)) { const ls = p.optionTypes.filter(l => l && l !== 'M12'); if (new Set(ls).size !== ls.length) fail(`${p.fmt} not injective ${p.optionTypes}`); }
  });
  for (let lv = 1; lv <= 10; lv++) { const used = new Set(run.SETS[lv].flat().flatMap(p => p.optionTypes.filter(Boolean).map(x => x.split(':')[0]))); if (used.size < 3) fail(`Lv${lv} only ${used.size} types`); if (AVAIL[lv]) { const miss = [...used].filter(x => !AVAIL[lv].includes(x)); if (miss.length) fail(`Lv${lv} uses ${miss} not in 8.2`); } }
});
check(25, '長さと数', (run, fail) => {
  const cap = p => (['hk:B2', 'hk:B3', 'sk:B2a', 'sk:B2b', 'sk:B3', 'sk:B5', 'ws:B5'].includes(p.sk) ? 80 : 70);
  for (const p of pool(run)) { const n = charLen(p.s1 + p.s2 + p.hq); if (n > cap(p)) { fail(`${p.sk} ${n} > ${cap(p)}: ${bodyOf(p)} ${p.hq}`); return; } const k = new Set(nums(bodyOf(p))).size; if (p.fmt === 'F1' && !p.pairFirst && !p.pairPrev && (k < 3 || k > 4)) { fail(`F1 numbers ${k}: ${bodyOf(p)}`); return; } if (k < 2 || k > 5) { fail(`numbers ${k}`); return; } if (nums(bodyOf(p)).some(x => x > 99 || x < 2)) { fail('number range ' + bodyOf(p)); return; } if ((bodyOf(p).match(/。/g) || []).length !== 2) { fail('sentences ' + bodyOf(p)); return; } }
  for (const p of run.ALL.filter(x => x.fmt === 'F4')) { const n = charLen(p.lead + p.s1 + p.s2 + p.hq); if (n > cap(p) + 30) { fail('F4 ' + n); return; } }
  for (const p of run.ALL.filter(x => x.fmt === 'F6')) { const n = charLen(p.s1 + p.s2 + p.hq); if (n > 90) { fail('F6 ' + n); return; } }
});
check(26, '範囲外', (run, fail) => { const bad = /相当算|損益算|濃度算|仕事算|旅人算|通過算|流水算|植木算|方陣算|周期算|日暦算|集合算|=/; for (const p of run.ALL) if (bad.test(p.text) || p.options.some(o => bad.test(o))) { fail(p.text); return; } });
check(27, '本編の到達範囲', (run, fail, note) => note('judged against the 3.1 本編の到達 column by review; the 9.2 ranges are checked in 1 and 25'));
// kanji allowed: grade 1-4 kanji that the texts use (each checked against the 学年別漢字配当表)
// checked against the 学年別漢字配当表 (2020): grade 1 to 4. 過 (5) and 齢 (not listed) occur only in the type names (4.7 の 4).
const ALLOWED = new Set([...'円人本点問回年後前子父母兄弟姉妹足数分倍和差上少多高安算何文型使式決考正書買配用意入大小方家族体同合計平均値段国語男女貯金月毎組答題持長見代拾全関係低言頭付消去不当']);
check(28, '漢字', (run, fail, note) => { const seen = new Set(); for (const p of run.ALL) for (const ch of (p.text + p.options.join('')).replace(/過不足算|年齢算/g, '').replace(/[^一-鿿]/g, '')) seen.add(ch); const out = [...seen].filter(c => !ALLOWED.has(c)); if (out.length) fail(`not in the checked list: ${out.join('')}`); else note(`${seen.size} kanji: ${[...seen].join('')}`); });
check(29, 'わざ', (run, fail) => { for (const p of run.ALL.filter(x => x.fmt !== 'F6')) { if (!p.waza || p.waza.sign !== G.WAZA[p.t].sign) { fail('waza ' + p.t); return; } } });
check(30, '本編との非重複', (run, fail) => { const src = fs.readFileSync(path.join(__dirname, '../../../keisan/app.js'), 'utf8'); const lits = new Set((src.match(/["'`]([^"'`\n]{12,})["'`]/g) || []).map(x => x.slice(1, -1))); for (const p of run.ALL) for (const s of [p.s1, p.s2].filter(Boolean)) if (lits.has(s)) { fail('same as keisan template: ' + s); return; } });
check(31, '再現性', (run, fail) => { const src = fs.readFileSync(path.join(__dirname, 'strict_gen.js'), 'utf8'); if (/Math\.random|Date\.now/.test(src)) fail('Math.random or Date.now in strict_gen'); const a = G.buildSet(5, mulberry32(9), G.newState()), b = G.buildSet(5, mulberry32(9), G.newState()); if (JSON.stringify(a.map(p => p.text)) !== JSON.stringify(b.map(p => p.text))) fail('not reproducible'); });
check(32, '敵ソルバー回帰テスト', (run, fail, note) => note('run: STRICT=1 node audit.js <seed> 3000 20000 && node summary.js'));
check(33, '敵ソルバーの更新規約', (run, fail, note) => note('process rule'));
check(34, '実在証明 (付録 A)', (run, fail) => {
  const s = section(DOCL, '付録 A'); const txt = DOCL.slice(s[0], s[1]).join('\n');
  const byLv = {}; let lv = 0; for (const line of DOCL.slice(s[0], s[1])) { const h = line.match(/^### A\.(\d+) Lv(\d+)/); if (h) lv = +h[2]; const m = line.match(/^\| \d \| (\w+):([\w:]+) \|/); if (m && lv) { const rest = m[2].split(':'); const x = ['tsukuru', 'renketsu'].includes(m[1]) ? [m[1], rest[0], rest[1]] : [m[1], rest[0], m[2]]; (byLv[lv] = byLv[lv] || []).push(x); } }
  const code = { kata: 'F1', itte: 'F2', kimete: 'F3', shindan: 'F4', tsukuru: 'F5', renketsu: 'F6' };
  for (let l = 1; l <= 10; l++) { const r = byLv[l] || []; if (r.length !== 5) { fail(`A Lv${l} rows ${r.length}`); continue; } const c = {}; r.forEach(x => { c[code[x[0]]] = (c[code[x[0]]] || 0) + 1; }); if (l < 10 && Object.entries(FORM[l]).some(([f, n]) => (c[f] || 0) !== n)) fail(`A Lv${l} formats ${JSON.stringify(c)}`); r.forEach(x => { if (!['tsukuru', 'renketsu'].includes(x[0]) && !(SKB[x[2]] && SKB[x[2]].t === x[1])) fail(`A Lv${l} ${x.join(':')}`); if (x[0] === 'tsukuru' && !/^G\d$/.test(x[2])) fail(`A Lv${l} F5 ${x.join(':')}`); if (x[0] === 'renketsu' && !(G.LINKS[x[1]] && ['1', '2'].includes(x[2]))) fail(`A Lv${l} F6 ${x.join(':')}`); }); }
});
check(35, 'F1 の問いの文', (run, fail) => { for (const p of run.ALL.filter(x => x.fmt === 'F1')) { if (p.text.includes(p.hq)) { fail('question shown'); return; } if (p.sk === 'nr:B4a' && !/倍/.test(bodyOf(p))) { fail('nr:B4a ratio not in body'); return; } } });
check(36, '同時分布の一様 (C7)', (run, fail) => {
  for (let lv = 3; lv <= 10; lv++) {
    const f1 = wpool(run, 'F1', lv); if (!f1.length) continue;
    const firstT = p => { const o = []; for (const [si, s] of [p.s1, p.s2].entries()) for (const w of Object.keys(WDET)) { const m = s.replace(/まちが/g, '#').replace(/小さい/g, '#').match(WDET[w]); if (m) o.push([si * 10000 + m.index, w]); } o.sort((a, b) => a[0] - b[0]); return o.length ? TABLE[o[0][1]] : '-'; };
    const fams = { ns: p => `${p.sc}|${new Set(nums(bodyOf(p))).size}|${firstT(p)}|${p.opts.slice().sort()}`, surf: p => `${words(bodyOf(p)).filter(w => ['W1', 'W2', 'W3', 'W4', 'W8', 'W9'].includes(w)).sort()}|${p.sc}` };
    // v0.4.4: the largest type's share in each key is at most 0.60 (the evenness bands of (1) and (2) cannot hold together with the caps of rule 10)
    const lim = lv === 4 ? 0.70 : 0.60; // v0.4.4: Lv4 is 0.70 (4.3 規則 10, 12 章の未確定事項 27)
    for (const [nm, f] of Object.entries(fams)) { const g = wgroups(f1, f, p => p.t); let bad = 0, big = 0; const ex = []; for (const [k, e] of g) { if (e.n < 30 || e.w < 0.01) continue; big++; if (Object.keys(e.c).length > 1 && Math.max(...Object.values(e.c)) / e.w > lim) { bad++; ex.push(k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(e.c).map(([a, b]) => [a, +(b / e.w).toFixed(2)])))); } } if (bad) fail(`Lv${lv} family ${nm}: ${bad}/${big} keys (weighted) over ${lim}: ${ex.slice(0, 2).join(' | ')}`); }
    const marg = {}; f1.forEach(({ p, w }) => { marg[p.t] = (marg[p.t] || 0) + w; }); const nt = lv <= 4 ? 4 : 8; for (const [t, c] of Object.entries(marg)) if (!band(c * nt, 0.8, 1.2)) fail(`Lv${lv} type share ${t} ${fmt(c)}`);
    for (const [nm, f] of Object.entries({ scene: p => p.sc, n: p => new Set(nums(bodyOf(p))).size, first: p => firstT(p) })) { const g = wgroups(f1, f, p => p.t); for (const [k, e] of g) { if (e.n < 30 || e.w < 0.01) continue; const mx = Math.max(...Object.values(e.c)) / e.w; if (mx > lim) fail(`Lv${lv} P(type | ${nm}=${k}) ${fmt(mx)}`); } }
  }
});
check(37, '署名の一意', (run, fail) => { const f1 = run.ALL.filter(p => p.fmt === 'F1'); const u = share(f1.filter(p => { const s = sig(bodyOf(p)); return s.length === 1 && s[0] === p.t; }).length, f1.length); if (u < 1) fail(`unique ${fmt(u)}`); });
check(38, 'F2 の誤りの出現回数', (run, fail, note) => { for (const lv of [1, 2, 7, 8, 10]) { const c = {}; run.SETS[lv].flat().filter(p => p.fmt === 'F2').forEach(p => p.optionTypes.forEach(l => { if (l) c[l] = (c[l] || 0) + 1; })); note(`Lv${lv} ${JSON.stringify(c)}`); } });
check(39, '人名 (C7)', (run, fail) => {
  for (const p of run.ALL) { const t = p.fmt === 'F5' ? p.stem + p.options.join('') : p.fmt === 'F4' ? bodyOf(p) + p.hq : p.text; if (!G.FAMILY.some(f => t.includes(f))) { fail('no family name: ' + t); return; } }
  for (const p of pool(run)) { const two = G.TWO_PERSON.includes(p.sk); if (two !== (p.names.length === 2)) { fail('slots ' + p.sk); return; } if (/(^|[ 、])(兄|弟|姉|妹|父|母)(は|が|の|と|に|より|を|で) /.test(bodyOf(p) + ' ' + p.hq)) { fail('role word left: ' + bodyOf(p) + ' ' + p.hq); return; } }
  for (let lv = 3; lv <= 10; lv++) {
    // mixture of the formats by their count per set; F1, F2 and F4 from the weighted candidates, F3 from the served problems
    const ps = mixture(run, lv);
    const tot = ps.reduce((a, x) => a + x.w, 0); const marg = {}; ps.forEach(({ p, w }) => { marg[p.t] = (marg[p.t] || 0) + w / tot; });
    for (const f of G.FAMILY) { const q = ps.filter(x => x.p.names.includes(f)); const qt = q.reduce((a, x) => a + x.w, 0); for (const [t, c] of Object.entries(marg)) { if (c < 0.03) continue; const r = share(q.filter(x => x.p.t === t).reduce((a, x) => a + x.w, 0), qt) / c; if (!band(r, 0.7, 1.3)) fail(`Lv${lv} ${f} ${t} ratio ${fmt(r)}`); } }
  }
});
// check 13 combined across the two seeds for words under 300
// v0.4.4: check 13 is judged on the mixture (expected values), so the two-seed pooling for words under 300 is not needed

// ---------- report ----------
let nf = 0;
for (const r of results.sort((a, b) => a.no - b.no)) {
  const st = r.fails.length ? 'FAIL' : (r.note.length ? 'NOTE' : 'PASS');
  if (r.fails.length) nf++;
  console.log(`${String(r.no).padStart(2)} ${st} ${r.title}${r.fails.length ? '\n     ' + r.fails.slice(0, 6).join('\n     ') : ''}${r.note.length ? '  (' + r.note.slice(0, 4).join('; ') + ')' : ''}`);
}
console.log(`${results.length} checks, ${nf} failed`);
process.exit(nf ? 1 : 0);
