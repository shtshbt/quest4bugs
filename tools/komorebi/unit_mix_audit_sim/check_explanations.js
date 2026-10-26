'use strict';
// 検証 32 (v0.2.9): for every combination the generator can make of (誤りの型 × 問題型 × 関係と領域 × 向き × 誤りの倍率), the
// table B of 8 章 gives exactly one explanation. explain() below is table B written as code: a combination for which it
// returns null has no sentence in the doc and is reported as MISSING. Every sentence, with every value the generator can
// put in it, is 25 characters or fewer (spaces not counted), and no two error types share a sentence.
//   node check_explanations.js [--all]          (--all prints every sentence; exit 1 on a missing, long or shared sentence)
const G = require('./gen.js');
const V = G.VALUES;
const lab = u => ({ m2: 'm²', cm2: 'cm²', km2: 'km²', cm3: 'cm³', m3: 'm³' }[u] || u);
const sp = u => ({ '秒速m': '秒速', '分速m': '分速', '時速km': '時速' }[u] || lab(u));
const fx = f => String(G.rd(f));
const DOMNAME = { length: '長さ', weight: '重さ', area: '面積', volume: '体積とかさ' };
const op = d => (d === 'down' ? '×' : '÷');
const rel1 = r => `1${lab(r.big)} は ${fx(r.f)}${lab(r.small)}`;
const R = id => [...G.REL1, ...G.REL2].find(r => r.id === id);
const SPEED_NAME = { 60: '分速', 3.6: '時速' };

// table B (8 章), one sentence per (type, combination)
function explain(type, c) {
  const r = c.r, d = c.dir, from = r && (d === 'down' ? r.big : r.small), to = r && (d === 'down' ? r.small : r.big);
  switch (type) {
    case 'direction':
      if (r.id === 'R16') return d === 'up' ? '1 秒は 1 分の 60 分の 1。だから ÷60' : '1 分は 60 秒。だから ×60';
      if (r.id === 'R17') return `秒速 1m は 時速 3.6km。だから ${op(d)}3.6`;
      return `${rel1(r)}。だから ${op(d)}${fx(r.f)}`;
    case 'M1mag': return `数が ${d === 'down' ? '大きくても' : '小さくても'} ${sp(from)} を ${sp(to)} に するのは ${op(d)}${fx(r.f)}`;
    case 'rate_both':
      if (r.id === 'R17') return `秒速 1m は 時速 3.6km。${d === 'down' ? '下り' : '上り'}だから ${op(d)}3.6`;
      if (r.id === 'R16') return `秒速 1m は 分速 60m。${d === 'down' ? '下り' : '上り'}だから ${op(d)}60`;
      return `${rel1(r)}。${d === 'down' ? '下り' : '上り'}だから ${op(d)}${fx(r.f)}`;
    case 'steps': return G.DEC_DOMAINS.includes(r.domain) ? `${rel1(r)}。0 は ${Math.round(Math.log10(r.f))} こ` : null;
    case 'time_steps': return r.domain === 'time' && r.f === 60 ? `${rel1(r)}。3600 は 時間と 秒` : null;
    case 'sixty':
      if (r.id === 'R16') return '1分 は 60秒。100 で なく 60 で 直す';
      if (r.domain === 'time') return `${rel1(r)}。${r.f === 3600 ? '10000' : '100'} で なく ${fx(r.f)} で 直す`;
      return null;
    case 'other_domain':
      if (G.DEC_DOMAINS.includes(r.domain)) return `${DOMNAME[r.domain]}は ×${fx(r.f)} の 階段。60 は 時間だけ`;
      if (r.domain === 'time') return '時間は 60 で くり上がる。1000 は 使わない';
      if (r.domain === 'speed') return `${sp(from)} を ${sp(to)} に するのは ${fx(r.f)}。${fx(c.g)} は ${SPEED_NAME[c.g]}`; // v0.2.9
      return null;
    case 'not_aligned': return `${c.u1} と ${c.u2} は ちがう 単位。先に そろえる`;
    case 'concat': return `${c.h}${c.uh} は ${c.h * c.f}${c.ul}。それに ${c.lo} を たす`;
    case 'zero_drop': return c.uh === '時間' || c.uh === '分' ? null : `${c.h}${c.uh} ${c.lo}${c.ul} は ${c.h * c.f}${c.ul} と ${c.lo}${c.ul}`;
    case 'texp_place': return `${c.X}分 は 60分 が ${Math.floor(c.X / 60)} こ と ${c.X % 60}分`;
    case 'texp_calc': return c.comp ? `${c.X}分 は ${Math.floor(c.X / 60) * 60}分 と ${c.X % 60}分。だから ${Math.floor(c.X / 60)}時間${c.X % 60}分` : `${c.X}分 は 60分 の ${c.X}/60。だから ${c.ans}時間`;
    case 'km_m': return r.id === 'R17' && d === 'down' ? '時速は km で 数える。1000m で 1km' : null;
    case 'cmp_bigunit': return `${c.side}${lab(c.su)} を ${lab(c.to)}に そろえて くらべる`;
    case 'cmp_same': return `${c.vb}${lab(r.big)} は ${c.conv}${lab(r.small)}。だから 同じ`;
    case 'cmp_notsame': return `${c.y}${lab(c.to)} と ${c.z}${lab(c.to)} は ちがう`; // v0.2.10: 正答が同じでないのに「同じ」
    case 'diag_missed': return `しきは 正しい。だから ${c.ans}`; // v0.2.10: 正しい答案に誤りのラベル
  }
  return undefined; // a type that table B does not have at all
}

// ---------- every combination the generator can make (gen.js の関係、小型、値の表) ----------
const combos = []; const C = (type, pattern, c) => combos.push({ type, pattern, c });
const DIRS = ['down', 'up'];
const gType = (r, g) => (G.DEC_DOMAINS.includes(r.domain) ? (g === 60 ? 'other_domain' : 'steps') : r.domain === 'time' ? (g === 100 ? 'sixty' : 'time_steps') : (g === 100 ? 'sixty' : 'other_domain'));
const gCands = r => (G.DEC_DOMAINS.includes(r.domain) ? [...(r.f !== 10000 ? [r.f * 10] : []), ...(r.f >= 100 ? [r.f / 10] : []), 60] : r.domain === 'time' ? (r.f === 60 ? [100, 3600] : [60, 100]) : (r.f === 60 ? [100, 3.6] : [60]));
const otherSpeedF = r => (r.id === 'R16' ? 3.6 : 60);
for (const r of G.REL1.filter(x => x.id !== 'R13')) for (const d of DIRS) { // rate_select (1 段) と convert
  C('direction', 'rate_select', { r, dir: d }); C('M1mag', 'rate_select', { r, dir: d });
  for (const g of gCands(r)) { C(gType(r, g), 'rate_select', { r, dir: d, g }); C('rate_both', 'rate_select', { r, dir: d, g }); }
  for (const t of ['direction', 'M1mag']) C(t, 'convert', { r, dir: d });
  if (G.DEC_DOMAINS.includes(r.domain)) { C('steps', 'convert', { r, dir: d }); C('other_domain', 'convert', { r, dir: d }); }
  if (r.domain === 'time') { C('sixty', 'convert', { r, dir: d }); C('other_domain', 'convert', { r, dir: d }); }
  if (r.domain === 'speed') { if (r.id === 'R16') C('sixty', 'convert', { r, dir: d }); C('other_domain', 'convert', { r, dir: d, g: otherSpeedF(r) }); if (r.id === 'R17' && d === 'down') C('km_m', 'convert', { r, dir: d }); } // 表 B: 正答の 1000 倍 (時速 54000km)
}
for (const r of G.REL2) for (const d of DIRS) { // 2 段の convert (Lv5、Lv10)
  for (const t of ['direction', 'M1mag']) C(t, 'convert', { r, dir: d });
  if (G.DEC_DOMAINS.includes(r.domain)) { C('steps', 'convert', { r, dir: d }); C('other_domain', 'convert', { r, dir: d }); } else { C('sixty', 'convert', { r, dir: d }); C('other_domain', 'convert', { r, dir: d }); }
}
for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R12', 'R14', 'R15']) { const r = R(id); // recall (R13 は倍率 1 で誤りの型が立たない)
  C('direction', 'recall', { r, dir: 'down' }); if (G.DEC_DOMAINS.includes(r.domain)) { C('steps', 'recall', { r, dir: 'down' }); C('other_domain', 'recall', { r, dir: 'down' }); } else { C('sixty', 'recall', { r, dir: 'down' }); C('other_domain', 'recall', { r, dir: 'down' }); } }
for (const r of G.POOL1.filter(x => G.DOM5.includes(x.domain))) for (const d of DIRS) { // align_calc と compare
  const uz = [lab(r.big), lab(r.small)];
  for (const t of ['direction', 'M1mag']) C(t, 'align_calc', { r, dir: d });
  if (G.DEC_DOMAINS.includes(r.domain)) C('steps', 'align_calc', { r, dir: d }); else C('sixty', 'align_calc', { r, dir: d });
  C('not_aligned', 'align_calc', { r, dir: d, u1: uz[0], u2: uz[1] });
  C('direction', 'compare', { r, dir: d }); if (G.DEC_DOMAINS.includes(r.domain)) C('steps', 'compare', { r, dir: d }); else C('sixty', 'compare', { r, dir: d });
  C('not_aligned', 'compare', { r, dir: d, u1: uz[0], u2: uz[1] });
  for (const vb of [...V.B_INT, ...V.B_DEC].filter(x => x >= 10)) { const conv = G.rd(vb * r.f); if (conv >= 1e6) continue;
    C('cmp_bigunit', 'compare', { r, dir: d, side: d === 'down' ? vb : conv, su: d === 'down' ? r.big : r.small, to: d === 'down' ? r.small : r.big });
    C('cmp_same', 'compare', { r, dir: d, vb, conv });
    for (const k of [0.5, 0.9, 0.08, 0.12, 1.1, 1.5, 8, 12]) { const vs = sig2(conv * k); if (!(vs >= 1) || vs >= 1e6) continue; // 9.2 章の vs の幅の両端
      if (d === 'down') C('cmp_notsame', 'compare', { r, dir: d, y: conv, z: vs, to: r.small });
      else { const y = G.rd(vs / r.f); if (G.isInt(y * 100)) C('cmp_notsame', 'compare', { r, dir: d, y, z: vb, to: r.big }); } } }
}
const SA = { kmph_min: ['R15', 'up', '時速 km', '分'], mpm_km: ['R3', 'down', '分速 m', 'km'], sps_min: ['R14', 'down', '秒速 m', '分'], mix_persec: ['R16', 'up', '分速 m', '秒速 m'], mix_permin: ['R16', 'down', '分速 m', '秒速 m'] };
for (const [type, [id, d, u1, u2]] of Object.entries(SA)) { const r = R(id); // speed_apply の 5 小型
  for (const t of ['direction', 'M1mag']) C(t, 'speed_apply', { r, dir: d });
  if (type === 'kmph_min' || type === 'mix_persec') C('sixty', 'speed_apply', { r, dir: d });
  C('not_aligned', 'speed_apply', { r, dir: d, u1, u2 });
}
const CP = { C1: ['時間', '分', 60, V.COMP_TIME_HI, V.COMP_TIME_LO], C2: ['分', '秒', 60, V.COMP_TIME_HI, V.COMP_TIME_LO], C3: ['m', 'cm', 100, V.COMP_C3_HI, V.COMP_C3_LO], C4: ['km', 'm', 1000, V.COMP_C45_HI, V.COMP_C45_LO], C5: ['kg', 'g', 1000, V.COMP_C45_HI, V.COMP_C45_LO] };
for (const [cid, [uh, ul, f, his, los]] of Object.entries(CP)) for (const h of his) for (const lo of los) { // compound_in
  C('concat', 'compound_in', { uh, ul, f, h, lo }); if (cid !== 'C1' && cid !== 'C2') C('zero_drop', 'compound_in', { uh, ul, f, h, lo }); }
const R15 = R('R15');
for (const h of V.TEXP_COMP_H) for (const m of V.TEXP_COMP_M) { const X = 60 * h + m; if (X < 100) continue; // time_express (複名数)
  C('sixty', 'time_express', { r: R15, dir: 'up' }); C('texp_calc', 'time_express', { X, comp: true }); C('texp_place', 'time_express', { X }); }
const hours = [...V.TEXP_HOURS.map(v => [v, G.rd(v)]), ...V.FRAC_HOURS.map(f => { const [a, b] = f.split('/').map(Number); return [a / b, f]; })];
for (const [v, shown] of hours) { const X = Math.round(60 * v); // time_express (小数か分数)
  C('sixty', 'time_express', { r: R15, dir: 'up' }); C('direction', 'time_express', { r: R15, dir: 'up' }); C('texp_calc', 'time_express', { X, ans: G.isInt(v * 100) ? fx(v) : shown }); }

// the fixed options (compare の「同じ」、診断の「正しい」) when they are wrong, and when they are the answer and another option
// is chosen: 9.7 章の 4 と 5 decide one type for each
const FIXED_OPT = [['compare', 'truth big or small, chosen 同じ', 'cmp_notsame'], ['compare', 'truth 同じ, chosen a side', 'cmp_same'], ['diagnosis', 'sheet wrong, chosen 正しい', 'sheet type'], ['diagnosis', 'sheet right, chosen an error label', 'diag_missed']];
for (const [p, when, t] of FIXED_OPT) if (t !== 'sheet type' && explain(t, { r: R('R4'), dir: 'down', y: 1, z: 2, to: 'kg', vb: 1, conv: 1000, ans: '1kg' }) == null) { console.error(`MISSING fixed option ${p} ${when}`); }
// diag_missed: the answer of a source of a diagnosis is 6 桁以内、小数第 2 位まで (3 章) and its unit; the longest display is
// 「時速 999999.99km」 (速さは「時速 X km」の形)、10 進は 999999.99cm² など
for (const ans of ['999999.99cm²', '999999.99時間', '時速 999999.99km', '秒速 999999.99m', '999999.99m']) C('diag_missed', 'diagnosis', { ans });
function sig2(x) { if (x < 10) return Math.round(x); const p = 10 ** (Math.floor(Math.log10(x)) - 1); return G.rd(Math.round(x / p) * p); }

// ---------- check ----------
const len = s => [...s.replace(/\s/g, '')].length;
const T = {}; let bad = 0; const missing = new Set();
for (const { type, pattern, c } of combos) {
  const s = explain(type, c);
  if (s === undefined || s === null) { const key = `${type} / ${pattern} / ${c.r ? c.r.id + ' ' + c.r.domain : ''} / ${c.dir || ''}${c.g ? ' / g ' + c.g : ''}`; if (!missing.has(key)) { missing.add(key); bad++; console.error('MISSING ' + key); } continue; }
  (T[type] = T[type] || new Set()).add(s);
}
for (const [k, set] of Object.entries(T)) {
  const u = [...set]; const mx = u.reduce((a, s) => (len(s) > len(a) ? s : a), '');
  console.log(`${k}\t${u.length} 文\t最長 ${len(mx)} 字\t${mx}`);
  if (process.argv[2] === '--all') u.forEach(s => console.log('   ' + len(s) + ' ' + s));
  for (const s of u) if (len(s) > 25) { bad++; console.error('OVER 25: ' + s); }
}
const types = Object.entries(T); // the templates of different types must differ (表 B is a bijection between types and templates)
for (let i = 0; i < types.length; i++) for (let j = i + 1; j < types.length; j++) for (const s of types[i][1]) if (types[j][1].has(s)) { bad++; console.error(`SHARED by ${types[i][0]} and ${types[j][0]}: ${s}`); }
console.log(`${combos.length} 組み合わせ、型 ${types.length}。${bad ? bad + ' 件の不足か超過' : 'すべての組み合わせで表 B の文が 1 つに決まり、25 字以内で、型の間で共有しない'}`);
process.exit(bad ? 1 : 0);
