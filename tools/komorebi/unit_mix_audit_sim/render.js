'use strict';
// Render one generated set per Lv as appendix A text, with the rule checks printed beside it.
// usage: node render.js [seedBase]
const G = require('./gen.js');
const S = require('./sets.js');
const V = require('./solvers.js');
const seedBase = Number(process.argv[2] || 4000);

const LAB = { m2: 'm²', cm2: 'cm²', km2: 'km²', cm3: 'cm³', m3: 'm³' };
const lab = u => LAB[u] || u;
const num = x => { const r = G.rd(x); return String(r); };
function qty(v, u) {
  if (u === '秒速m') return `秒速 ${num(v)}m`;
  if (u === '分速m') return `分速 ${num(v)}m`;
  if (u === '時速km') return `時速 ${num(v)}km`;
  return `${num(v)}${lab(u)}`;
}
const fracTxt = fr => `${fr[0]}/${fr[1]}`;
const unitAsk = u => (u === '秒速m' ? '秒速 何 m ' : u === '分速m' ? '分速 何 m ' : u === '時速km' ? '時速 何 km ' : u === '時間' ? '何時間' : u === '分' ? '何分' : u === '秒' ? '何秒' : `何 ${lab(u)} `);
const ADJ = { length: '長い', time: '長い', weight: '重い', area: '広い', volume: '多い', speed: '速い' };
const LABEL_TXT = { correct: '正しい', direction: '上りと下りが逆', steps: '10倍のかいだんの数がちがう', sixty: '60 を 100 に している',
  other_domain: 'ほかの 単位の 倍率を つかっている', not_aligned: '単位を そろえて いない' };
const near = x => Math.abs(x - Math.round(x)) < 1e-4;
function hourTxt(v) { if (near(v * 1000)) return num(v) + '時間'; for (const d of [3, 6, 12, 30, 60, 120]) if (near(v * d)) return `${Math.round(v * d)}/${d}時間`; return num(v) + '時間'; }

function text(q) {
  switch (q.pattern) {
    case 'recall': return `1${lab(q.from)} は ${unitAsk(q.to)}ですか。`;
    case 'convert': return `${q.frac ? fracTxt(q.frac) + lab(q.from) : qty(q.gv, q.from)} は ${unitAsk(q.to)}ですか。`;
    case 'rate_select': return `${qty(q.gv, q.from)} を ${q.to === '秒速m' ? '秒速' : q.to === '分速m' ? '分速' : q.to === '時速km' ? '時速 km' : lab(q.to)} に なおします。どうしますか。`;
    case 'compound_in': { const [, uh, ul] = G.CPAIRS[q.cpair]; return q.domain === 'time' ? `${q.hi}${uh}${q.lo}${ul} は ${unitAsk(ul)}ですか。` : `${q.hi}${lab(uh)} ${q.lo}${lab(ul)} は ${unitAsk(ul)}ですか。`; }
    case 'time_express': return q.form === 'comp' ? `${q.X}分 は どれですか。` : `${q.X}分 は 何時間ですか。`;
    case 'compare': { const b = qty(q.vb, q.bigU), s = qty(q.vs, q.smallU); const [l, r] = q.bigIdx === 0 ? [b, s] : [s, b]; const to = q.dir === 'up' ? q.bigU : q.smallU; const toTxt = to === '秒速m' ? '秒速' : to === '分速m' ? '分速' : to === '時速km' ? '時速' : lab(to); return `${l} と ${r}。${toTxt} に そろえて くらべると、${ADJ[q.domain]}のは どちらですか。`; }
    case 'align_calc': {
      const sg = q.plus ? '+' : '−';
      if (q.domain === 'time') { const [, uh, ul] = G.CPAIRS[q.cpair]; return `${num(q.vb)}${uh} ${sg} ${q.s}${ul} は ${unitAsk(q.dir === 'up' ? uh : ul)}ですか。`; }
      const r = G.REL1.find(x => x.id === q.rel); return `${qty(q.vb, r.big)} ${sg} ${qty(q.s, r.small)} は ${unitAsk(q.dir === 'up' ? r.big : r.small)}ですか。`;
    }
    case 'speed_apply':
      if (q.sa === 'kmph_min') return `時速 ${q.v}km で ${q.m}分 進むと 何 km ですか。`;
      if (q.sa === 'mpm_km') return `分速 ${q.v}m で ${num(q.d)}km 進むと 何分 かかりますか。`;
      if (q.sa === 'sps_min') return `秒速 ${q.v}m で ${q.m}分 進むと 何 m ですか。`;
      if (q.sa === 'mix_persec') return `分速 ${q.v}m と 秒速 ${num(q.b)}m。1 秒で 進む 道のりの 合計は 何 m ですか。`;
      return `分速 ${q.a}m と 秒速 ${num(q.v)}m。1 分で 進む 道のりの 合計は 何 m ですか。`;
  }
  return '';
}
function ansTxt(q) {
  switch (q.pattern) {
    case 'recall': return num(q.ans);
    case 'convert': case 'compound_in': case 'align_calc': return `${num(q.ans)}、${unitAskShort(q)}`;
    case 'speed_apply': return `${num(q.ans)}、${q.sa === 'kmph_min' ? 'km' : q.sa === 'mpm_km' ? '分' : 'm'}`;
    case 'rate_select': return 'ア イ ウ エ のうち ' + 'アイウエ'[q.ansIdx];
    case 'time_express': return 'ア イ ウ エ のうち ' + 'アイウエ'[q.ansIdx];
    case 'compare': return ['左', '右', '同じ'][q.ansIdx];
    case 'diagnosis': return 'ア イ ウ エ のうち ' + 'アイウエ'[q.ansIdx];
  }
}
function unitAskShort(q) { if (q.pattern === 'compound_in') return lab(G.CPAIRS[q.cpair][2]); if (q.pattern === 'align_calc') { const up = q.dir === 'up'; return q.domain === 'time' ? G.CPAIRS[q.cpair][up ? 1 : 2] : lab(G.REL1.find(x => x.id === q.rel)[up ? 'big' : 'small']); } return lab(q.to); }
function optsTxt(q) {
  const k = 'アイウエ';
  if (q.pattern === 'rate_select') return q.opts.map((o, i) => `${k[i]} ${o.op}${num(o.n)}`).join(' / ');
  if (q.pattern === 'time_express') return q.opts.map((o, i) => `${k[i]} ${o.h !== undefined ? `${o.h}時間${o.m}分` : hourTxt(o.val)}`).join(' / ');
  if (q.pattern === 'diagnosis') return q.opts.map((l, i) => `${k[i]} ${LABEL_TXT[l]}`).join(' / ');
  return '';
}
function sheet(dg) {
  const s = dg.src, p = s.paths[0];
  if (s.pattern === 'compare') {
    const side = c => (c === 'same' ? '同じ' : c === 'big' ? qty(s.vb, s.bigU) : qty(s.vs, s.smallU));
    if (dg.raw) return `${num(s.vb)} と ${num(s.vs)} を そのまま くらべて、こたえ ${side(dg.value)}`;
    return `しき ${num(p.v)} ${dg.shownOp} ${num(dg.shownF)} = ${num(G.rd(G.opApply(p.v, dg.shownOp, dg.shownF)))}、こたえ ${side(dg.value)}`;
  }
  // v0.2.4 (4.9 の 1、U12): the answer carries its unit, and a second step is written as its own formula
  const unitOf = q => (q.pattern === 'convert' ? (q.to === '秒速m' ? '(秒速 m)' : q.to === '分速m' ? '(分速 m)' : q.to === '時速km' ? '(時速 km)' : lab(q.to))
    : q.pattern === 'align_calc' ? unitAskShort(q) : q.pattern === 'speed_apply' ? (q.sa === 'kmph_min' ? 'km' : q.sa === 'mpm_km' ? '分' : 'm') : '');
  const u = unitOf(s);
  if (dg.raw) return `しき ${s.pattern === 'speed_apply' && s.sa === 'kmph_min' ? `${s.v} × ${s.m}` : s.pattern === 'speed_apply' && s.sa === 'mpm_km' ? `${num(s.d)} ÷ ${s.v}` : s.pattern === 'speed_apply' && s.sa === 'sps_min' ? `${s.v} × ${s.m}` : s.pattern === 'speed_apply' && s.sa.startsWith('mix') ? `${s.sa === 'mix_persec' ? s.v : s.a} + ${num(s.sa === 'mix_persec' ? s.b : s.v)}` : s.pattern === 'align_calc' ? `${num(s.vb)} ${s.plus ? '+' : '−'} ${s.s}` : num(s.raw)} = ${num(dg.value)}、こたえ ${num(dg.value)}${u}`;
  const y = G.rd(G.opApply(p.v, dg.shownOp, dg.shownF));
  let second = '';
  if (s.pattern === 'align_calc') second = s.dir === 'up' ? `${num(s.vb)} ${s.plus ? '+' : '−'} ${num(y)}` : `${num(y)} ${s.plus ? '+' : '−'} ${num(s.s)}`;
  else if (s.pattern === 'speed_apply') second = s.sa === 'kmph_min' || s.sa === 'sps_min' ? `${s.v} × ${num(y)}` : s.sa === 'mpm_km' ? `${num(y)} ÷ ${s.v}` : s.sa === 'mix_persec' ? `${num(y)} + ${num(s.b)}` : `${num(s.a)} + ${num(y)}`;
  const rest = second && G.rd(dg.value) !== y ? `、そのあと ${second} = ${num(dg.value)}` : '';
  return `しき ${num(p.v)} ${dg.shownOp} ${num(dg.shownF)} = ${num(y)}${rest}、こたえ ${num(dg.value)}${u}`;
}

const out = [];
for (let lv = 1; lv <= 10; lv++) {
  const R = G.rng(seedBase + lv);
  const set = S.buildSet(lv, R);
  out.push(`### A.${lv} Lv${lv}`);
  out.push('');
  out.push('```text');
  const cpName = lv === 3 ? 'CP2' : 'CP1';
  set.forEach((q, i) => {
    const inPair = q.pairWithPrev || (set[i + 1] && set[i + 1].pairWithPrev);
    const tags = [inPair ? cpName : '', q.chainOf ? '連鎖' : ''].filter(Boolean).join('、');
    const pid = S.pidOf(q);
    if (q.pattern === 'diagnosis') {
      out.push(`${i + 1}. [${pid}] もんだい: ${text(q.src)}`);
      out.push(`   答案: ${sheet(q)}`);
      out.push(`   ${optsTxt(q)}   (${ansTxt(q)}。${LABEL_TXT[q.label]})`);
    } else {
      out.push(`${i + 1}. [${pid}${tags ? '、' + tags : ''}] ${text(q)}   (${ansTxt(q)})`);
      if (q.pattern === 'rate_select' || q.pattern === 'time_express') out.push(`   ${optsTxt(q)}`);
      if (q.pattern === 'compare') out.push(`   左 / 右 / 同じ`);
    }
  });
  out.push('```');
  out.push('');
  const traps = Object.entries(S.TRAP_SCOPE).filter(([, f]) => lv >= f).map(([n]) => `${n} ${S.trapCount(set, n)} 問`).join('、');
  const fails = n => set.map((q, i) => (V.probeFails(n, q) ? i + 1 : null)).filter(Boolean).join(' ');
  const trapDetail = Object.entries(S.TRAP_SCOPE).filter(([, f]) => lv >= f).map(([n]) => `${n} は ${fails(n)} 番`).join('、');
  out.push(`罠の本数: ${traps} (${trapDetail})。`);
  out.push('');
}
console.log(out.join('\n'));
