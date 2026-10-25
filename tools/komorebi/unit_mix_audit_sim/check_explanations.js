'use strict';
// 検証 32 (v0.2.4): every explanation of 8 章 (one template per error type, 8 章の表 B) is 25 characters or fewer
// (spaces not counted) for every value the generator can put in it. usage: node check_explanations.js [--all]
const G = require('./gen.js');
const V = G.VALUES;
const lab = u => ({ m2: 'm²', cm2: 'cm²', km2: 'km²', cm3: 'cm³', m3: 'm³' }[u] || u);
const fx = f => String(G.rd(f));
const DOMNAME = { length: '長さ', weight: '重さ', area: '面積', volume: '体積とかさ' };
const ALL = [...G.POOL1, ...G.REL2];
const rel1 = r => (r.domain === 'speed' ? null : `1${lab(r.big)} は ${fx(r.f)}${lab(r.small)}`);
const T = {};
const add = (type, s) => (T[type] = T[type] || []).push(s);
for (const r of ALL) {
  const op = d => (d === 'down' ? '×' : '÷');
  for (const d of ['down', 'up']) {
    if (r.id === 'R16') add('direction', d === 'up' ? '1 秒は 1 分の 60 分の 1。だから ÷60' : '1 分は 60 秒。だから ×60');
    else if (r.id === 'R17') add('direction', `秒速 1m は 時速 3.6km。だから ${op(d)}3.6`);
    else add('direction', `${rel1(r)}。だから ${op(d)}${fx(r.f)}`);
    // M1mag: down with a number of 10 or more, or up with a number under 10
    const from = d === 'down' ? r.big : r.small, to = d === 'down' ? r.small : r.big;
    const sp = u => ({ '秒速m': '秒速', '分速m': '分速', '時速km': '時速' }[u] || lab(u));
    add('M1mag', `数が ${d === 'down' ? '大きくても' : '小さくても'} ${sp(from)} を ${sp(to)} に するのは ${op(d)}${fx(r.f)}`);
    if (G.POOL1.includes(r)) add('rate_both', r.id === 'R17' ? `秒速 1m は 時速 3.6km。${d === 'down' ? '下り' : '上り'}だから ${op(d)}3.6`
      : r.id === 'R16' ? `秒速 1m は 分速 60m。${d === 'down' ? '下り' : '上り'}だから ${op(d)}60` : `${rel1(r)}。${d === 'down' ? '下り' : '上り'}だから ${op(d)}${fx(r.f)}`);
  }
  if (G.DEC_DOMAINS.includes(r.domain)) {
    add('steps', `${rel1(r)}。0 は ${Math.round(Math.log10(r.f))} こ`);
    add('other_domain', `${DOMNAME[r.domain]}は ×${fx(r.f)} の 階段。60 は 時間だけ`);
    add('not_aligned', `${lab(r.big)} と ${lab(r.small)} は ちがう 単位。先に そろえる`);
  }
  if (r.domain === 'time') {
    add('sixty', `${rel1(r)}。${r.f === 3600 ? '10000' : '100'} で なく ${fx(r.f)} で 直す`);
    add('other_domain', '時間は 60 で くり上がる。1000 は 使わない');
    if (r.f === 60) add('time_steps', `${rel1(r)}。3600 は 時間と 秒`);
  }
}
add('sixty', '1 分は 60 秒。100 で なく 60 で 直す'); // R16 (分速と秒速) uses the 分と秒 sentence
add('not_aligned', '分速 m と 秒速 m は ちがう 単位。先に そろえる');
add('not_aligned', '時速 km と 分 は ちがう 単位。先に そろえる');
for (const h of V.COMP_TIME_HI) for (const m of V.COMP_TIME_LO) add('concat', `${h}時間 は ${h * 60}分。それに ${m} を たす`);
for (const c of [['C3', 'm', 'cm', 100, V.COMP_C3_HI, V.COMP_C3_LO], ['C4', 'km', 'm', 1000, V.COMP_C45_HI, V.COMP_C45_LO], ['C5', 'kg', 'g', 1000, V.COMP_C45_HI, V.COMP_C45_LO]])
  for (const h of c[4]) for (const lo of c[5]) { add('concat', `${h}${c[1]} は ${h * c[3]}${c[2]}。それに ${lo} を たす`); add('zero_drop', `${h}${c[1]} ${lo}${c[2]} は ${h * c[3]}${c[2]} と ${lo}${c[2]}`); }
for (const h of V.TEXP_COMP_H) for (const m of V.TEXP_COMP_M) { const X = 60 * h + m; if (X < 100) continue;
  add('texp_place', `${X}分 は 60分 が ${h} こ と ${m}分`); add('texp_calc', `${X}分 は ${h * 60}分 と ${m}分。だから ${h}時間${m}分`); }
const hours = [...V.TEXP_HOURS, ...V.FRAC_HOURS.map(f => { const [a, b] = f.split('/').map(Number); return a / b; })];
for (const v of hours) { const X = Math.round(60 * v); const ans = Number.isInteger(Math.round(v * 1e6) / 1e4) ? fx(v) : V.FRAC_HOURS.find(f => { const [a, b] = f.split('/').map(Number); return Math.abs(a / b - v) < 1e-9; });
  add('texp_calc', `${X}分 は 60分 の ${X}/60。だから ${ans}時間`); }
add('km_m', '時速は km で 数える。1000m で 1km');
for (const r of G.POOL1.filter(x => G.DOM5.includes(x.domain))) for (const vb of [...V.B_INT, ...V.B_DEC].filter(x => x >= 10)) {
  const conv = G.rd(vb * r.f); if (conv >= 1e6) continue;
  add('cmp_bigunit', `${vb}${lab(r.big)} を ${lab(r.small)}に そろえて くらべる`); add('cmp_bigunit', `${conv}${lab(r.small)} を ${lab(r.big)}に そろえて くらべる`);
  add('cmp_same', `${vb}${lab(r.big)} は ${conv}${lab(r.small)}。だから 同じ`);
}
const len = s => [...s.replace(/\s/g, '')].length;
let bad = 0;
for (const [k, list] of Object.entries(T)) {
  const u = [...new Set(list)]; const mx = u.reduce((a, s) => (len(s) > len(a) ? s : a), '');
  console.log(`${k}\t${u.length} 文\t最長 ${len(mx)} 字\t${mx}`);
  if (process.argv[2] === '--all') u.forEach(s => console.log('   ' + len(s) + ' ' + s));
  for (const s of u) if (len(s) > 25) { bad++; console.error('OVER 25: ' + s); }
}
// the templates of different types must differ (8 章の表 B is a bijection between types and templates)
const firsts = Object.entries(T).map(([k, l]) => [k, new Set(l)]);
for (let i = 0; i < firsts.length; i++) for (let j = i + 1; j < firsts.length; j++) for (const s of firsts[i][1]) if (firsts[j][1].has(s) && firsts[i][0] !== firsts[j][0]) { bad++; console.error(`SHARED by ${firsts[i][0]} and ${firsts[j][0]}: ${s}`); }
process.exit(bad ? 1 : 0);
