#!/usr/bin/env node
// 検証 28 (v0.2.8): every item of 付録 A, and every example of 6 章, read back from the doc text and put through the
// item checks of strict_check.js (answer, value band of 9.2 章, patternId and the space of 9.4 章, direction, the
// options, the diagnosis label by 8.1 章). The sets of 付録 A also go through the set checks (5 章の配合, 4.2 章,
// 4.3 章の罠の下限と「罠の本数」の行, 4.4 章の対比ペア, 4.5 章の連鎖).
//   node check_appendix.js [curriculum.md]        (exit 1 when anything fails)
'use strict';
const fs = require('fs');
const path = require('path');
function checkAppendix(doc, items = [], implementation) {
const DOC = doc || path.join(__dirname, '../../../docs/komorebi_unit_mix_curriculum.md');
process.env.UMIX_DOC = DOC;
const G = require('./strict_gen.js');
const V = G.V;
const MD = fs.readFileSync(DOC, 'utf8');
const near = G.near;
const inList = (name, x) => V[name].some(y => (typeof y === 'number' ? near(y, x) : false));
const fracOf = s => { const [a, b] = s.split('/').map(Number); return a / b; };

// ---------- the text of one question ----------
const UNIT_RE = '(km²|cm²|m²|km|cm|mm|m|kg|g|t|ha|a|cm³|m³|mL|L|時間|分|秒)';
const SPEED = { '秒速': '秒速m', '分速': '分速m', '時速': '時速km' };
function parseQty(s) { // "1.5km", "秒速 15m", "3/4時間"
  let m = s.match(/^(秒速|分速|時速) ([0-9.]+)(m|km)$/); if (m) return { v: Number(m[2]), u: SPEED[m[1]] };
  m = s.match(new RegExp('^([0-9./]+)' + UNIT_RE + '$')); if (m) return { v: m[1].includes('/') ? fracOf(m[1]) : Number(m[1]), u: m[2], frac: m[1].includes('/') ? m[1] : null };
  return null;
}
function parseAsk(s) { // "何 m ", "何分", "秒速 何 m ", "時速 何 km "
  let m = s.match(/^(秒速|分速|時速) 何 (m|km)\s*$/); if (m) return SPEED[m[1]];
  m = s.match(new RegExp('^何 ?' + UNIT_RE + '\\s*$')); if (m) return m[1];
  return null;
}
const COMPU = { '時間|分': 'C1', '分|秒': 'C2', 'm|cm': 'C3', 'km|m': 'C4', 'kg|g': 'C5' };
function parseQuestion(t) {
  t = t.trim(); let m;
  if ((m = t.match(/^1(\S+?) は (.+?)ですか。$/)) && parseQty('1' + m[1]) && parseQty('1' + m[1]).v === 1) { const to = parseAsk(m[2]); const from = parseQty('1' + m[1]).u; if (to) return { pattern: 'recall', from, to, x: 1 }; }
  if ((m = t.match(/^(\d+)(時間|分)(\d+)(分|秒) は (.+?)ですか。$/))) return { pattern: 'compound_in', cid: COMPU[m[2] + '|' + m[4]], hi: +m[1], lo: +m[3] };
  if ((m = t.match(new RegExp('^(\\d+)' + UNIT_RE + ' (\\d+)' + UNIT_RE + ' は (.+?)ですか。$')))) return { pattern: 'compound_in', cid: COMPU[m[2] + '|' + m[4]], hi: +m[1], lo: +m[3] };
  if ((m = t.match(/^(\d+)分 は どれですか。$/))) return { pattern: 'time_express', X: +m[1], form: 'comp' };
  if ((m = t.match(/^(\S+) と (\S+)。(\S+?) ?に そろえて くらべると、\S+のは どちらですか。$/))) { const L = parseQty(m[1]), R = parseQty(m[2]); const to = m[3] === '秒速' || m[3] === '分速' ? SPEED[m[3]] : m[3]; return { pattern: 'compare', L, R, alignTo: to }; }
  if ((m = t.match(/^(\S+) ([+−]) (\S+) は (.+?)ですか。$/))) { const A = parseQty(m[1]), B = parseQty(m[3]); return { pattern: 'align_calc', A, B, plus: m[2] === '+', to: parseAsk(m[4]) }; }
  if ((m = t.match(/^時速 (\d+)km で (\d+)分 進むと 何 km ですか。$/))) return { pattern: 'speed_apply', type: 'kmph_min', vals: { v: +m[1], t: +m[2] } };
  if ((m = t.match(/^分速 (\d+)m で ([0-9.]+)km 進むと 何分 かかりますか。$/))) return { pattern: 'speed_apply', type: 'mpm_km', vals: { v: +m[1], d: +m[2] } };
  if ((m = t.match(/^秒速 (\d+)m で (\d+)分 進むと 何 m ですか。$/))) return { pattern: 'speed_apply', type: 'sps_min', vals: { v: +m[1], t: +m[2] } };
  if ((m = t.match(/^分速 (\d+)m と 秒速 ([0-9.]+)m。1 (秒|分)で 進む 道のりの 合計は 何 m ですか。$/))) return { pattern: 'speed_apply', type: m[3] === '秒' ? 'mix_persec' : 'mix_permin', vals: { a: +m[1], b: +m[2] } };
  if ((m = t.match(/^(秒速|分速|時速) ([0-9.]+)(m|km) は (秒速|分速|時速) 何 (m|km) ですか。$/))) return { pattern: 'convert', x: +m[2], from: SPEED[m[1]], to: SPEED[m[4]] };
  if ((m = t.match(/^(.+?) を (\S+?) ?に なお(?:します。どうしますか。|す 計算は どれですか。)$/))) { const q = parseQty(m[1]); const to = SPEED[m[2]] || (m[2] === '時速 km' ? '時速km' : m[2]); if (q) return { pattern: 'rate_select', x: q.v, from: q.u, to }; }
  if ((m = t.match(/^(\S+) は (.+?)ですか。$/))) { const q = parseQty(m[1]); const to = parseAsk(m[2]); if (q && to) { if (q.u === '分' && to === '時間' && !/何時間/.test('')) return { pattern: 'convert_or_texp', x: q.v, from: q.u, to, frac: q.frac }; return { pattern: 'convert', x: q.v, from: q.u, to, frac: q.frac }; } }
  return null;
}
// a strict_gen item from a parsed question (fields the solvers of strict_gen read)
function itemOf(p, extra = {}) {
  const st = (x, a, b) => G.step(x, a, b);
  switch (p.pattern) {
    case 'recall': { const s = st(1, p.from, p.to); return { pattern: 'recall', kind: 'num', step: s, ans: G.conv(s), domain: s.dom, dir: 'down', form: 'int' }; }
    case 'convert': { const s = st(p.x, p.from, p.to); const ans = G.conv(s); return { pattern: 'convert', kind: 'num', step: s, ans, domain: s.dom, dir: s.dir, form: p.frac ? 'frac' : (G.isInt(s.dir === 'down' ? s.x : ans) ? 'int' : 'dec'), frac: p.frac, unit: p.to }; }
    case 'compound_in': { const [dom, uh, ul] = G.COMP[p.cid]; const s = st(p.hi, uh, ul); s.comp = dom === 'time'; return { pattern: 'compound_in', kind: 'num', step: s, hi: p.hi, lo: p.lo, cid: p.cid, ans: G.conv(s) + p.lo, domain: dom, dir: 'down', form: 'comp', unit: ul }; }
    case 'align_calc': { const dir = p.to === p.B.u ? 'down' : 'up'; const s = dir === 'down' ? st(p.A.v, p.A.u, p.B.u) : st(p.B.v, p.B.u, p.A.u); const cv = G.conv(s); const keep = dir === 'down' ? p.B.v : p.A.v;
      const ans = dir === 'down' ? (p.plus ? cv + keep : cv - keep) : (p.plus ? keep + cv : keep - cv);
      const cpair = s.dom === 'time' ? (p.A.u === '時間' ? 'C1' : 'C2') : null;
      return { pattern: 'align_calc', kind: 'num', step: s, keep, plus: p.plus, ans: Math.round(ans * 1e9) / 1e9, domain: s.dom, dir, form: G.isInt(p.A.v) ? 'int' : 'dec', A: p.A, B: p.B, cpair, unit: p.to }; }
    case 'speed_apply': { const v = p.vals; let s, combine;
      if (p.type === 'kmph_min') { s = st(v.t, '分', '時間'); combine = h => v.v * h; } else if (p.type === 'mpm_km') { s = { x: v.d, from: 'km', to: 'm', f: 1000, dom: 'length', dir: 'down' }; combine = m => m / v.v; }
      else if (p.type === 'sps_min') { s = st(v.t, '分', '秒'); combine = x => v.v * x; } else if (p.type === 'mix_persec') { s = st(v.a, '分速m', '秒速m'); combine = x => x + v.b; } else { s = st(v.b, '秒速m', '分速m'); combine = x => v.a + x; }
      const ans = Math.round(combine(G.conv(s)) * 1e9) / 1e9; return { pattern: 'speed_apply', kind: 'num', type: p.type, step: s, combine, ans, domain: 'speed', dir: G.SA_DIR[p.type], form: G.isInt(ans) ? 'int' : 'dec', vals: v }; }
    case 'rate_select': { const s = st(p.x, p.from, p.to); return { pattern: 'rate_select', kind: 'choice', step: s, options: extra.options || [], ansOpt: extra.ansOpt, domain: s.dom, dir: s.dir, form: G.isInt(s.dir === 'down' ? s.x : G.conv(s)) ? 'int' : 'dec' }; }
    case 'time_express': { const s = st(p.X, '分', '時間'); return { pattern: 'time_express', kind: 'choice', step: s, options: extra.options || [], ansOpt: extra.ansOpt, domain: 'time', dir: 'up', form: p.form }; }
    case 'compare': { const big = G.UNITS[p.L.u][1] > G.UNITS[p.R.u][1] ? p.L : p.R, small = big === p.L ? p.R : p.L; const dir = p.alignTo === small.u ? 'down' : 'up';
      const s = dir === 'down' ? st(big.v, big.u, small.u) : st(small.v, small.u, big.u); const conv = big === p.L ? 'L' : 'R';
      const q = { pattern: 'compare', kind: 'choice', step: s, convSide: dir === 'down' ? conv : (conv === 'L' ? 'R' : 'L'), otherVal: dir === 'down' ? small.v : big.v, options: ['L', 'R', 'same'], domain: s.dom, dir, form: G.isInt(big.v) ? 'int' : 'dec', L: p.L, R: p.R, vb: big.v, vs: small.v, alignTo: p.alignTo, big: conv };
      const tr = G.conv(s); q.concl = near(tr, q.otherVal) ? 'same' : tr > q.otherVal ? 'big' : 'small'; q.ansOpt = q.concl === 'same' ? 2 : (tr > q.otherVal ? (q.convSide === 'L' ? 0 : 1) : (q.convSide === 'L' ? 1 : 0)); return q; }
  }
  return null;
}

// ---------- value band (9.2 章) ----------
function bandOK(q, role, lv) { // returns '' or the reason
  const s = q.step, upSmall = f => (near(f, 10) ? 'UP_SMALL_10' : near(f, 100) ? 'UP_SMALL_100' : near(f, 60) ? 'UP_SMALL_60' : null);
  const big = s && (s.dir === 'down' ? s.x : G.conv(s));
  const decOrInt = x => inList('B_INT', x) || inList('B_DEC', x);
  switch (q.pattern) {
    case 'recall': return '';
    case 'convert': case 'rate_select': {
      if (role === 'cp2b') return ''; // 4.4 章: CP2 の 2 問目は帯の外に出てよい
      if (role === 'cp8') return inList('LV8_N', s.x) ? '' : `Lv8 CP1 の n ${s.x} が LV8_N に無い`;
      if (role === 'cp2a') return inList('CP2_GIVEN', s.x) ? '' : `CP2 の与え ${s.x} が CP2_GIVEN に無い`;
      if (role === 'cp1' && lv === 2 && !inList('B_INT', s.x)) return `Lv2 CP1 の与え ${s.x} が B_INT に無い`;
      if (role === 'cp1' && lv === 4 && !inList(s.dir === 'down' ? 'LV4_CP1_DOWN' : 'LV4_CP1_UP', s.x)) return `Lv4 CP1 の与え ${s.x} が LV4_CP1 に無い`;
      if (q.frac) return inList('FRAC_HOURS', 0) || V.FRAC_HOURS.includes(q.frac) ? '' : `分数 ${q.frac} が FRAC_HOURS に無い`;
      if (s.dom === 'speed') { const k = s.dir === 'down' ? s.x : G.conv(s); const list = near(s.f, 60) ? 'SPD_R16' : 'SPD_R17'; return inList(list, k) ? '' : `秒速 ${k} が ${list} に無い`; }
      if (decOrInt(big)) return '';
      if (s.dir === 'up' && upSmall(s.f) && inList(upSmall(s.f), s.x)) return '';
      return `大きい単位の側の量 ${big} が B_INT、B_DEC に無く、上りの小さい与え (${upSmall(s.f) || '倍率 ' + s.f + ' には無い'}) でもない`;
    }
    case 'compound_in': { if (role === 'cp1') return inList('LV5_CP1_HI', q.hi) && (inList('LV5_CP1_LO_C3', q.lo) || inList('LV5_CP1_LO_C45', q.lo)) ? '' : `Lv5 CP1 の ${q.hi}、${q.lo}`;
      const t = q.domain === 'time', c3 = q.cid === 'C3'; return inList(t ? 'COMP_TIME_HI' : c3 ? 'COMP_C3_HI' : 'COMP_C45_HI', q.hi) && inList(t ? 'COMP_TIME_LO' : c3 ? 'COMP_C3_LO' : 'COMP_C45_LO', q.lo) ? '' : `複名数 ${q.hi}、${q.lo}`; }
    case 'time_express': { const X = s.x; if (q.form === 'comp') return inList('TEXP_COMP_H', Math.floor(X / 60)) && inList('TEXP_COMP_M', X % 60) ? '' : `複名数の言い方 ${X}分`;
      return inList('TEXP_HOURS', X / 60) || V.FRAC_HOURS.some(f => near(fracOf(f), X / 60)) ? '' : `${X}分 が TEXP_HOURS、FRAC_HOURS に無い`; }
    case 'compare': { if (!decOrInt(q.vb)) return `vb ${q.vb}`; const x = q.dir === 'down' ? q.vb : q.vs; if (x < 10) return `直す数 ${x} が 10 未満`; const r = q.vs / G.conv(G.step(q.vb, s.dir === 'down' ? s.from : s.to, s.dir === 'down' ? s.to : s.from));
      return (near(r, 1) || (r >= 1.1 - 1e-9 && r <= 1.5 + 1e-9) || (r >= 8 - 1e-9 && r <= 12 + 1e-9) || (r >= 0.5 - 1e-9 && r <= 0.9 + 1e-9) || (r >= 0.08 - 1e-9 && r <= 0.12 + 1e-9) || (q.domain === 'time' && near(q.vs, q.vb * 100))) ? '' : `比 ${r.toFixed(3)} が 9.2 章の幅の外`; }
    case 'align_calc': { if (q.domain === 'time') { if (!inList('ALIGN_TIME_BIG', q.A.v)) return `大きい量 ${q.A.v}`; return inList(q.dir === 'down' ? 'ALIGN_TIME_S_DOWN' : 'ALIGN_TIME_S_UP', q.B.v) ? '' : `小さい量 ${q.B.v}`; }
      if (!decOrInt(q.A.v)) return `大きい量 ${q.A.v}`; const f = G.UNITS[q.A.u][1] / G.UNITS[q.B.u][1]; const k = near(f, 10) ? q.B.v : q.B.v / (f / 10); return inList('ALIGN_K', k) ? '' : `小さい量 ${q.B.v} は k × (倍率 ÷ 10) でない`; }
    case 'speed_apply': { const v = q.vals; const ok = (n, x) => inList(n, x);
      if (q.type === 'kmph_min') return ok('SA_KMPH_V', v.v) && (ok('SA_KMPH_T_BIG', v.t) || ok('SA_KMPH_T_SMALL', v.t)) ? '' : 'kmph_min の値';
      if (q.type === 'mpm_km') return ok('SA_MPM_V', v.v) && (ok('SA_MPM_D_BIG', v.d) || ok('SA_MPM_D_SMALL', v.d)) ? '' : 'mpm_km の値';
      if (q.type === 'sps_min') return ok('SA_SPS_V', v.v) && (ok('SA_SPS_T_BIG', v.t) || ok('SA_SPS_T_SMALL', v.t)) ? '' : 'sps_min の値';
      return ok('SA_MIX_A', v.a) && ok('SA_MIX_B', v.b) ? '' : '合計の型の値'; }
  }
  return '';
}

// ---------- 9.4 章の空間 ----------
function section(head) { const i = MD.indexOf('\n' + head); const j = MD.indexOf('\n### ', i + 1); return MD.slice(i, j < 0 ? undefined : j); }
function expand(e) { const m = e.match(/\{([^{}]*)\}/); if (!m) return [e]; return m[1].split(',').map(x => x.trim()).flatMap(x => expand(e.slice(0, m.index) + x + e.slice(m.index + m[0].length))); }
const SPACE = {}; for (const l of section('### 9.4').split('\n')) { const m = l.match(/^\| (\d+) \| (.*) \| (\d+) \|$/); if (m) SPACE[m[1]] = new Set([...m[2].matchAll(/`([^`]+)`/g)].flatMap(x => expand(x[1]))); }

// ---------- options ----------
const LAB = { '正しい': 'correct', '上りと下りが逆': 'direction', '10倍のかいだんの数がちがう': 'steps', '60 を 100 に している': 'sixty', 'ほかの 単位の 倍率を つかっている': 'other_domain', '単位を そろえて いない': 'not_aligned' };
function parseOpts(line) { return line.trim().split(' / ').map(x => x.replace(/^[アイウエ] /, '').trim()); }
const KANA = 'アイウエ';
function rateOptions(texts) { return texts.map(t => ({ op: t[0] === '×' ? 'x' : '/', f: Number(t.slice(1)) })); }
function texpOptions(texts) { return texts.map(t => { let m = t.match(/^(\d+)時間(\d+)分$/); if (m) return { H: +m[1], M: +m[2] }; m = t.match(/^([0-9./]+)時間$/); return { val: m[1].includes('/') ? fracOf(m[1]) : Number(m[1]) }; }); }
function checkOptions(q, fail, where) {
  if (q.pattern === 'rate_select') { const f = q.step.f; const fs = [...new Set(q.options.map(o => o.f))]; if (q.options.length !== 4 || fs.length !== 2 || !fs.some(x => near(x, f))) fail(`${where}: 倍率えらびの肢が 2 組の逆数の組でない`); for (const x of fs) if (!near(x, f) && !G.gCands(Object.keys(G.R1).find(id => { const [b, s] = G.R1[id]; return [b, s].includes(q.step.from) && [b, s].includes(q.step.to); })).some(y => near(y, x))) fail(`${where}: g ${x} が 4.7 章の候補に無い`); }
  if (q.pattern === 'time_express') { const X = q.step.x; const want = q.form === 'comp' ? [[Math.floor(X / 60), X % 60], [Math.floor(X / 100), X % 100], [Math.floor(X / 10), X % 10]] : null;
    if (want) { for (const [h, m] of want) if (!q.options.some(o => o.H === h && o.M === m)) fail(`${where}: 複名数の肢 ${h}時間${m}分 が無い`); }
    else for (const w of [X / 60, X / 100, X * 60]) if (!q.options.some(o => near(o.val, w))) fail(`${where}: 肢 ${w}時間 が無い`);
    if (!want) { const rest = q.options.filter(o => ![X / 60, X / 100, X * 60].some(w => near(o.val, w))); if (rest.length !== 1 || !(near(rest[0].val, X / 6) || near(rest[0].val, X / 600))) fail(`${where}: 計算ちがいの肢が 分 ÷ 6 か 分 ÷ 600 でない`); } }
}

// ---------- 付録 A ----------
const fails = []; const fail = m => fails.push(m); let nItems = 0;
const app = MD.slice(MD.indexOf('## 付録 A. セット実在証明'), MD.indexOf('## 付録 A の v0.2.3 版'));
const sets = []; let cur = null;
const lines = app.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]; let m;
  if ((m = l.match(/^### A\.(\d+) Lv(\d+)/))) { cur = { lv: +m[2], items: [], trapLine: null }; sets.push(cur); continue; }
  if (l.startsWith('罠の本数')) { cur.trapLine = l; continue; }
  if (!(m = l.match(/^(\d)\. \[([^\]]+)\] (.*)$/))) continue;
  const tags = m[2].split('、'), pid = tags[0], role = tags.includes('連鎖') ? 'chain' : tags.find(t => /^CP/.test(t)) || '';
  let body = m[3];
  if (body.startsWith('もんだい: ')) {
    const srcText = body.slice('もんだい: '.length); const sheet = lines[i + 1].replace(/^\s*答案: /, ''); const opt = lines[i + 2];
    const om = opt.match(/^(.*?)\s{3}\(ア イ ウ エ のうち (.)。(.+)\)$/); const labels = parseOpts(om[1]).map(x => LAB[x]); const ans = LAB[om[3]];
    const p = parseQuestion(srcText.replace(/\s+$/, '')); if (!p) { fail(`A.${cur.lv} ${m[1]}: もんだい を読めない: ${srcText}`); continue; }
    const src = itemOf(p.pattern === 'convert_or_texp' ? { ...p, pattern: 'convert' } : p);
    const shown = Number((sheet.match(/こたえ ([0-9.]+)/) || [])[1]);
    cur.items.push({ pid, role: 'diag', q: { pattern: 'diagnosis', kind: 'choice', src, label: ans, labels, shown, sheetText: sheet, domain: src.domain, dir: src.dir }, n: +m[1] });
    continue;
  }
  const am = body.match(/^(.*?)\s{3}\((.*)\)$/); const qtext = am ? am[1] : body; const ansText = am ? am[2] : '';
  const p = parseQuestion(qtext); if (!p) { fail(`A.${cur.lv} ${m[1]}: 問題文を読めない: ${qtext}`); continue; }
  let extra = {};
  if (p.pattern === 'rate_select' || p.pattern === 'time_express' || (p.pattern === 'convert_or_texp' && /のうち/.test(ansText))) { const texts = parseOpts(lines[i + 1]); const k = KANA.indexOf(ansText.slice(-1)); extra = { options: p.pattern === 'rate_select' ? rateOptions(texts) : texpOptions(texts), ansOpt: k }; }
  let pp = p; if (p.pattern === 'convert_or_texp') pp = /のうち/.test(ansText) ? { pattern: 'time_express', X: p.x, form: G.isInt(p.x / 60 * 100) ? 'dec' : 'frac' } : { ...p, pattern: 'convert' }; // 3.5 章: the form from the shown answer
  const q = itemOf(pp, extra);
  if (q.pattern === 'compare') { const want = { 左: 0, 右: 1, 同じ: 2 }[ansText]; if (want !== q.ansOpt) fail(`A.${cur.lv} ${m[1]}: compare の答え ${ansText}`); }
  if (q.kind === 'num') { const n = Number(ansText.split('、')[0]); if (!near(n, q.ans)) fail(`A.${cur.lv} ${m[1]}: 答え ${n} / ${q.ans}`); }
  if ((q.pattern === 'rate_select' || q.pattern === 'time_express') && G.solve(q, 'correct').opt !== q.ansOpt) fail(`A.${cur.lv} ${m[1]}: 選択式の答え`);
  cur.items.push({ pid, role, q, n: +m[1] });
}
for (const set of sets) {
  const lv = set.lv; const W = n => `A.${lv} ${n}`;
  if (set.items.length !== 5) fail(`A.${lv}: ${set.items.length} 問`);
  const qs = set.items.map(x => x.q);
  if (implementation) {
    const prepare = raw => {
      const q = { ...raw };
      if (q.src) { q.src = prepare(q.src); q.options = q.labels; q.ansOpt = q.options.indexOf(q.label); }
      else {
        q.step = { ...q.step, exact: ['length', 'weight', 'area', 'volume'].includes(q.domain) ? { mantissa: Math.round(q.step.x * 100), exp: -2 } : implementation.rational(q.frac || q.step.x) };
        q.rel = Object.keys({ ...G.R1, ...G.R2 }).find(id => (G.R1[id] || G.R2[id]).includes(q.step.from) && (G.R1[id] || G.R2[id]).includes(q.step.to));
        q.unit = q.unit || (q.pattern === 'speed_apply' ? { kmph_min: 'km', mpm_km: '分', sps_min: 'm', mix_persec: 'm', mix_permin: 'm' }[q.type] : q.step.to);
        if (q.combine) { const combine = q.combine; q.combine = value => combine(typeof value === 'object' ? value.num / value.den : value); }
        if (q.pattern === 'time_express') q.options = q.options.map((o, i) => ({ ...o, t: i === q.ansOpt ? 'correct' : q.form === 'comp' ? o.H === Math.floor(q.step.x / 100) && o.M === q.step.x % 100 ? 'sixty' : o.H === Math.floor(q.step.x / 10) && o.M === q.step.x % 10 ? 'place' : 'calc' : near(o.val, q.step.x / 100) ? 'sixty' : near(o.val, q.step.x * 60) ? 'rev' : 'calc' }));
      }
      if (q.src) { const m = /しき [0-9./]+ ([×÷]) ([0-9.]+)/.exec(q.sheetText); q.sheet = q.label === 'not_aligned' ? { raw: true } : { raw: false, op: m[1] === '×' ? 'x' : '/', f: +m[2] }; }
      return q;
    };
    const actual = set.items.map((x, i) => {
      const raw = prepare(x.q);
      raw.role = /^CP/.test(x.role) ? (i && /^CP/.test(set.items[i - 1].role) ? 'cpB' : 'cpA') : x.role;
      const q = implementation.publicQuestion(raw, lv, { coin: () => false, shuffle: a => a.slice() }, true);
      const answer = q.kind === 'choice' ? x.q.pattern === 'diagnosis' ? x.q.labels.indexOf(x.q.label) : x.q.ansOpt : x.q.ans;
      if (!implementation.judge(q, answer, q.to)) fail(`${W(x.n)}: production judge rejected appendix answer`);
      const sourceLine = lines.find(l => l.startsWith(`${x.n}. [${x.pid}`) && l.includes(q.text));
      if (!sourceLine) fail(`${W(x.n)}: production wording differs from appendix`);
      if (q.kind === 'choice') q.choiceErrorTypes.forEach((types, j) => { if (j !== q.ansOpt && !types.length) fail(`${W(x.n)}: production choice has no error type`); });
      return q;
    });
    if (!implementation.setOk(lv, actual, null)) fail(`A.${lv}: production setOk rejected appendix`);
    if (require('./check_explanations.js').checkExplanations(actual, implementation, () => {})) fail(`A.${lv}: production explanations differ from table B`);
  }
  set.items.forEach((x, k) => { nItems++;
    const q = x.q, b = q.pattern === 'diagnosis' ? q.src : q;
    const pid = G.pidOf(q); if (pid !== x.pid) fail(`${W(x.n)}: タグ ${x.pid}、問題文から ${pid}`);
    if (!SPACE[lv].has(pid)) fail(`${W(x.n)}: ${pid} が 9.4 章の Lv${lv} の空間に無い`);
    const prev = set.items[k - 1];
    const role = x.role === 'chain' ? 'chain' : x.role === 'CP2' ? (prev && prev.role === 'CP2' ? 'cp2b' : 'cp2a') : x.role === 'CP1' ? (lv === 8 ? 'cp8' : 'cp1') : '';
    const why = bandOK(b, q.pattern === 'diagnosis' ? '' : role, lv); if (why) fail(`${W(x.n)} [${x.pid}]: ${why}`);
    checkOptions(q, fail, W(x.n));
    if (q.pattern === 'diagnosis') { // 8.1 章: 答案の値と優先順のラベル
      const usable = lv === 4 ? G.USABLE[4] : G.USABLE.d; if (!q.labels.includes(q.label) || q.labels.some(l => !usable.includes(l))) fail(`${W(x.n)}: 診断の肢`);
      if (q.label === 'correct') { if (!near(q.shown, b.ans)) fail(`${W(x.n)}: 正しい答案の値 ${q.shown}`); }
      else { const vals = { direction: s => ({ op: s.dir === 'down' ? '/' : 'x', f: s.f }), steps: s => ({ op: s.dir === 'down' ? 'x' : '/', f: s.f * 10 }), steps2: s => ({ op: s.dir === 'down' ? 'x' : '/', f: s.f / 10 }), sixty: s => ({ op: s.dir === 'down' ? 'x' : '/', f: near(s.f, 60) ? 100 : near(s.f, 3600) ? 10000 : s.f }), other_domain: s => ({ op: s.dir === 'down' ? 'x' : '/', f: s.dom === 'time' ? 1000 : 60 }) };
        const raw = b.pattern === 'align_calc' ? (b.plus ? b.A.v + b.B.v : b.A.v - b.B.v) : b.pattern === 'speed_apply' ? b.combine(b.step.x) : NaN;
        const gives = l => (l === 'not_aligned' ? near(raw, q.shown) : l === 'steps' ? [vals.steps, vals.steps2].some(fn => near(G.solve(b, fn).val, q.shown)) : vals[l] ? near(G.solve(b, vals[l]).val, q.shown) : false);
        const top = G.PRIO.find(l => usable.includes(l) && gives(l)); if (top !== q.label) fail(`${W(x.n)}: ラベル ${q.label}、答案の値 ${q.shown} からは ${top}`); }
    }
  });
  // set rules
  const doms = new Set(qs.map(q => (q.pattern === 'diagnosis' ? q.src : q).domain)); if (lv <= 3 && (doms.size < 3 || !doms.has('time'))) fail(`A.${lv}: 領域 (4.2 の 1、2)`);
  if (lv === 10 && (doms.size < 3 || new Set(qs.map(q => q.pattern)).size < 4)) fail('A.10: 領域か問題型 (4.2 の 3)');
  const pc = {}; for (const q of qs) { const k = G.pidOf(q); pc[k] = (pc[k] || 0) + 1; if (pc[k] > 2) fail(`A.${lv}: ${k} が 3 回 (4.2 の 4)`); }
  const ks = qs.filter(q => q.pattern !== 'recall').flatMap(q => qtyKeys(q)); if (new Set(ks).size !== ks.length) fail(`A.${lv}: 同じ量 (4.2 の 5)`);
  const counts = {}; for (const [name, from] of [['M1mag', 1], ['M1magR', 1], ['M1', 3], ['M1d', 3], ['M2', 4], ['M3', 8]]) { if (lv < from) continue; const nums = set.items.filter(x => !trapRight(x.q, name)).map(x => x.n); counts[name] = nums; if (nums.length < 2) fail(`A.${lv}: ${name} の罠 ${nums.length} 問 (下限 2)`); }
  if (set.trapLine) for (const [name, nums] of Object.entries(counts)) { const m = set.trapLine.match(new RegExp(`${name} は ([0-9 ]+) 番`)); if (!m || m[1].trim() !== nums.join(' ')) fail(`A.${lv}: 罠の本数の行の ${name} (${m && m[1]}) と数え直し (${nums.join(' ')})`); }
  const i = set.items.findIndex(x => /^CP/.test(x.role)); if (i >= 0) { const a = set.items[i].q, c = set.items[i + 1] && set.items[i + 1].q; if (!c) fail(`A.${lv}: 対比ペアが隣接しない`); else if (near(c.ans, a.ans) || near(c.ans, a.step.x)) fail(`A.${lv}: 対比の 2 問目の答えが 1 問目の写し`); }
  const d = set.items.findIndex(x => x.q.pattern === 'diagnosis'); if (d >= 0) { const src = set.items[d].q.src, ch = set.items[d + 1] && set.items[d + 1].q; const sameRatio = ['time', 'weight', 'volume'].includes(src.domain) && src.pattern !== 'speed_apply';
    if (!ch || set.items[d + 1].role !== 'chain') fail(`A.${lv}: 連鎖が診断の直後に無い`);
    else { if (ch.pattern !== src.pattern || ch.domain !== src.domain || ch.form !== src.form) fail(`A.${lv}: 連鎖の型、領域、形`); const want = sameRatio ? (src.dir === 'down' ? 'up' : 'down') : src.dir; if (ch.dir !== want) fail(`A.${lv}: 連鎖の向き ${ch.dir} / ${want}`);
      const rel = q => (q.pattern === 'speed_apply' ? q.type : q.pattern === 'align_calc' ? (q.cpair || q.A.u + q.B.u) : [q.step.from, q.step.to].sort().join());
      if (src.pattern === 'speed_apply' ? rel(ch) !== rel(src) : rel(ch) === rel(src)) fail(`A.${lv}: 連鎖の関係 (4.5 の 1)`); } }
}
function qtyKeys(q) { const s = q.pattern === 'diagnosis' ? q.src : q;
  if (s.pattern === 'compare') return [s.L.u + '|' + s.L.v, s.R.u + '|' + s.R.v]; if (s.pattern === 'align_calc') return [s.A.u + '|' + s.A.v, s.B.u + '|' + s.B.v];
  if (s.pattern === 'compound_in') return [s.cid + '|' + s.hi + '+' + s.lo]; if (s.pattern === 'speed_apply') return [s.type + JSON.stringify(s.vals)]; return [s.step.from + '|' + s.step.x]; }
function trapRight(q, name) { return G.correctOn(q.pattern === 'diagnosis' ? q.src : q, name); }

// ---------- 6 章の例題 ----------
// a code block is read as a pair (CP1 or CP2) when the prose just before it names the pair and the block has exactly 2 questions
let nEx = 0;
const ch6 = MD.slice(MD.indexOf('\n## 6. Lv 別詳細'), MD.indexOf('\n## 7. '));
const blocks = []; { let lv = 0, cur = null, prose = '';
  for (const l of ch6.split('\n')) { let m;
    if ((m = l.match(/^### Lv(\d+)/))) { lv = +m[1]; prose = ''; continue; }
    if (l.startsWith('```')) { if (cur) { blocks.push(cur); cur = null; } else cur = { lv, prose, lines: [] }; continue; }
    if (cur) cur.lines.push(l); else if (l.trim()) prose = l; } }
for (const b of blocks) {
  const qsIn = []; const L = b.lines;
  for (let i = 0; i < L.length; i++) {
    const l = L[i]; if (/^\s/.test(l) || /の答案:/.test(l)) continue;
    const t = l.replace(/^つぎ: /, '').replace(/^もんだい: /, '');
    const am = t.match(/^(.*?)\s{3}\((.*)\)$/); const qtext = am ? am[1] : t; const ansText = am ? am[2] : '';
    const p = parseQuestion(qtext); if (!p) { if (/ですか。|しますか。/.test(qtext)) fail(`6 章 Lv${b.lv}: 問題文を読めない: ${qtext}`); continue; }
    const optLines = []; for (let k = i + 1; k < L.length && /^\s{2}\S/.test(L[k]); k++) optLines.push(L[k].trim().split(/\s{2,}/)[0]);
    let pp = p; if (p.pattern === 'convert_or_texp') pp = optLines.length === 4 && /時間$/.test(optLines[0]) ? { pattern: 'time_express', X: p.x, form: 'dec' } : { ...p, pattern: 'convert' };
    let extra = {}; if ((pp.pattern === 'rate_select' || pp.pattern === 'time_express') && optLines.length === 4) extra = { options: pp.pattern === 'rate_select' ? rateOptions(optLines) : texpOptions(optLines), ansOpt: 0 };
    qsIn.push({ q: itemOf(pp, extra), qtext, ansText, diag: /^もんだい: /.test(l), extra });
  }
  const pair = /CP1|CP2/.test(b.prose) && qsIn.length === 2 ? (/CP2/.test(b.prose) ? 'CP2' : 'CP1') : '';
  qsIn.forEach((x, k) => { nEx++; const q = x.q, W = `6 章 Lv${b.lv} 「${x.qtext}」`;
    if (q.kind === 'num' && x.ansText) { const n = Number(x.ansText.split('、')[0]); if (Number.isFinite(n) && !near(n, q.ans)) fail(`${W}: 答え ${n} / ${q.ans}`); }
    const role = pair === 'CP2' ? (k === 0 ? 'cp2a' : 'cp2b') : pair === 'CP1' ? (b.lv === 8 ? 'cp8' : 'cp1') : '';
    const why = bandOK(q, role, b.lv); if (why) fail(`${W}: ${why}`);
    if (x.extra.options) checkOptions(q, fail, W);
    const pid = (x.diag ? 'diagnosis.' : '') + G.pidOf(q); if (!SPACE[b.lv] || !SPACE[b.lv].has(pid)) fail(`${W}: ${pid} が 9.4 章の Lv${b.lv} の空間に無い`); });
}
for (const { q, lv } of items) {
  const role = q.cpType === 'CP2' ? q.role === 'cpA' ? 'cp2a' : 'cp2b' : q.cpType === 'CP1' ? lv === 8 ? 'cp8' : 'cp1' : '';
  const b = q.src || q, why = bandOK(b, role, lv);
  if (why) fail(`generated Lv${lv} ${G.pidOf(q)}: ${why}`);
  checkOptions(b, fail, `generated Lv${lv}`);
}
console.log(`付録 A ${nItems} 問、6 章の例題 ${nEx} 問を照合した`);
for (const f of fails) console.log('FAIL ' + f);
console.log(fails.length ? `${fails.length} 件の不一致` : 'check_appendix: 付録 A と 6 章の例題はすべて通る');
return fails;
}
if (require.main === module) process.exit(checkAppendix(process.argv[2]).length ? 1 : 0);
module.exports = { checkAppendix };
