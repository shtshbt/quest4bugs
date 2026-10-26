// Re-measure enemies of 11 章 and the per-word conditional rate (11.5) with the independent generator gen.js.
// Usage: node measure.js [seed]. V04 marks the changes for curriculum v0.4 (pairs, F3 and F4 draws, Lv1-2 rule 10,
// and the F1 enemies A3, B1, Bopt and Bns added next to B2surf, A2 and A4).
'use strict';
const G = require('./gen');
const SEED = +(process.argv[2] || 7);
const NCAND = +(process.env.NCAND || 100000), ITERS = +(process.env.ITERS || 250);
const NTRAIN = 20000, NTEST = 3000;
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// V04 (4.4 の 2): CP3 and CP6 share numbers; CP5 (B3 only) is the Lv7 F2 pair. CP4 is no longer used for pairs.
const CP = { CP3: [['bp:B3', 'br:B3w'], ['bp:B7', 'br:B7w']], CP6: [['kb:B3', 'tk:B3']], CP5: [['br:B3d', 'br:B3w']] };
function cpFor(lv) { if (lv === 3) return 'CP6'; if (lv === 4) return 'CP3'; return G.pick(['CP3', 'CP6']); }
function pairOptions(lv, scene, t1, t2) {
  if (lv === 3) return G.GA.slice();
  if (lv === 4) return scene === 'B4' ? ['bp', 'hk', 'nr', 'ws'] : G.GB.slice();
  const on = G.SCENE_TYPES[scene];
  const base = [...new Set([t1, t2])];
  const rest = G.shuffle(on.filter(t => !base.includes(t)));
  let opts = base.concat(rest).slice(0, 4);
  if (opts.length < 4) { const off = G.shuffle(G.TYPES.filter(t => !opts.includes(t) && !(base.includes('nr') && t === 'br'))); opts = opts.concat(off).slice(0, 4); }
  return opts;
}
function makePairF1(lv) {
  const cp = cpFor(lv);
  const [a, b] = G.pick(CP[cp]);
  const first = G.R() < 0.5 ? a : b, other = first === a ? b : a;
  const contrast = G.R() < 0.5;
  const second = contrast ? other : first;
  const sc = G.SK[first].scene;
  const opts = pairOptions(lv, sc, G.SK[first].type, G.SK[other].type);
  const p1 = G.makeF1(lv, { forceId: first, options: opts, pair: 1, form: '和' });
  const p2 = G.makeF1(lv, { forceId: second, options: opts, pair: 2, form: '和' });
  return [p1, p2];
}
function makePairF2Text(lv) {
  const [a, b] = G.pick(CP.CP5);
  const first = G.R() < 0.5 ? a : b, second = G.R() < 0.5 ? (first === a ? b : a) : first;
  return [G.makeTextProb('F2', lv, first, 1, '両方'), G.makeTextProb('F2', lv, second, 2, '両方')];
}

function poolF1(lv) {
  const c = []; let guard = 0;
  while (c.length < NCAND && guard++ < NCAND * 3) { const p = G.makeF1(lv); if (p) c.push(p); }
  G.balance(c, G.F1_FAMILIES_LV(lv), 400, G.WIDS.map((_, i) => 2 + i), 20); // V044 (4.3 規則 10)
  return { cands: c, draw: G.sampler(c) };
}
function poolText(lv, fmt) {
  const c = [];
  const f2ids = G.SK_IDS.filter(k => G.SK[k].f2), f3ids = G.SK_IDS.filter(k => G.SK[k].f3);
  const f3w = f3ids.map(k => k.startsWith('ws') ? +(process.env.F3WS || 0.6) : k === 'nr:B4a' ? +(process.env.F3NR || 0.8) : 1);
  const f3tot = f3w.reduce((a, b) => a + b, 0);
  while (c.length < NCAND) {
    let id;
    if (fmt === 'F2') { const ty = G.pick(G.TYPES); id = G.pick(f2ids.filter(k => G.SK[k].type === ty)); } // ASSUME type uniform, then skeleton
    else if (fmt === 'F3') { let x = G.R() * f3tot; let i = 0; while (x > f3w[i]) { x -= f3w[i]; i++; } id = f3ids[i]; }
    else { const ty = G.pick(G.TYPES); id = G.pick(G.SK_IDS.filter(k => G.SK[k].type === ty)); } // V04 (4.5 の 7): type uniform, then skeleton
    const p = G.makeTextProb(fmt, lv, id, null, fmt === 'F3' ? '和' : undefined);
    if (fmt === 'F4') {
      if (!p.words.length) continue;
      const w = G.pick(p.words), prop = G.TABLE[w];
      const excl = new Set([prop]); if (p.ans === 'nr') excl.add('br');
      let rej;
      if (prop === p.ans) rej = G.shuffle(G.TYPES.filter(t => !excl.has(t))).slice(0, 2);
      else { excl.add(p.ans); rej = [p.ans, G.pick(G.TYPES.filter(t => !excl.has(t)))]; }
      rej.sort();
      p.f4key = `${prop}|${w}|${rej.join(',')}|${p.scene}`;
      p.f4ans = prop === p.ans ? 'yes' : (rej[0] === p.ans ? 'r0' : 'r1');
    }
    c.push(p);
  }
  if (fmt === 'F2') G.balance(c, G.TEXT_FAMILIES, ITERS, G.WIDS.map((_, i) => i), 20);
  else if (fmt === 'F3') c.forEach(x => x.w = 1);
  else {
    // F4: keep keys where all 3 answers occur, then equalise (4.3 規則 10, 4.5 の 7)
    const g = new Map(); c.forEach(x => { if (!g.has(x.f4key)) g.set(x.f4key, new Set()); g.get(x.f4key).add(x.f4ans); });
    const kept = c.filter(x => g.get(x.f4key).size === 3);
    G.balance(kept, [{ key: x => x.f4key, ans: x => x.f4ans }], 1, [], 0);
    return { cands: kept, draw: G.sampler(kept) };
  }
  return { cands: c, draw: G.sampler(c) };
}

function makeSet(lv, P) {
  const s = [];
  const single = () => P.F1.draw();
  if (lv <= 5) { s.push(...makePairF1(lv)); for (let i = 0; i < 3; i++) s.push(single()); }
  else if (lv === 6) { s.push(single(), P.F3.draw(), P.F3.draw(), P.F4.draw(), P.F4.draw()); }
  else if (lv === 7) {
    if (G.R() < 0.5) { s.push(...makePairF1(lv)); s.push(P.F2.draw(), P.F2.draw(), P.F2.draw()); }
    else { s.push(single(), single()); s.push(...makePairF2Text(lv)); s.push(P.F2.draw()); }
  } else if (lv === 8) { s.push(...makePairF1(lv)); s.push(P.F2.draw()); }
  else if (lv === 9) { s.push(single(), single()); }
  else {
    const omit = G.pick(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    for (const f of ['F1', 'F2', 'F3', 'F4']) if (f !== omit) s.push(P[f].draw());
  }
  return s.filter(Boolean);
}

function measureLv(lv) {
  G.setSeed(SEED * 1000 + lv);
  const P = { F1: poolF1(lv) };
  if ([6, 10].includes(lv)) { P.F3 = poolText(lv, 'F3'); P.F4 = poolText(lv, 'F4'); }
  if ([7, 8, 10].includes(lv)) P.F2 = poolText(lv, 'F2');
  G.setSeed(SEED * 1000 + lv + 500);
  const train = []; for (let i = 0; i < NTRAIN; i++) train.push(makeSet(lv, P));
  G.setSeed(SEED * 1000 + lv + 900);
  const test = []; for (let i = 0; i < NTEST; i++) test.push(makeSet(lv, P));
  // B2surf table: (non-signature words, scene) -> answer counts; back off to scene
  const tab = new Map(), tabS = new Map();
  const inc = (m, k, a) => { if (!m.has(k)) m.set(k, {}); m.get(k)[a] = (m.get(k)[a] || 0) + 1; };
  train.flat().filter(p => p.fmt === 'F1').forEach(p => { inc(tab, p.key2, p.ans); inc(tabS, p.scene, p.ans); });
  const argmax = (cnt, opts) => { let best = -1, bs = []; for (const o of opts) { const v = (cnt && cnt[o]) || 0; if (v > best) { best = v; bs = [o]; } else if (v === best) bs.push(o); } return G.pick(bs); };
  let n = 0, b2 = 0, a2 = 0, a4 = 0, b2pair = 0, npair = 0, b2single = 0, nsingle = 0, a3 = 0, b1 = 0, bopt = 0, bns = 0;
  const STR = ['W10', 'W8', 'W1', 'W2', 'W4', 'W11', 'W12', 'W7', 'W6', 'W9', 'W3', 'W5'];
  const tN = new Map(), tO = new Map(), tK = [new Map(), new Map(), new Map(), new Map()];
  const nsKeys = p => { const o = p.options.join(','); return [p.key1, `${p.scene}|${p.first}|${o}`, `${p.first}|${o}`, o]; };
  const tNm = new Map(); let bname = 0;
  train.flat().filter(p => p.fmt === 'F1').forEach(p => { inc(tNm, p.names.join('+'), p.ans); });
  train.flat().filter(p => p.fmt === 'F1').forEach(p => { inc(tN, String(p.n), p.ans); inc(tO, p.options.join(','), p.ans); nsKeys(p).forEach((k, i) => inc(tK[i], k, p.ans)); });
  for (const p of test.flat().filter(p => p.fmt === 'F1')) {
    n++;
    const cnt = tab.get(p.key2) || tabS.get(p.scene);
    const g = argmax(cnt, p.options);
    const hit = g === p.ans; b2 += hit;
    if (p.pair) { npair++; b2pair += hit; } else { nsingle++; b2single += hit; }
    const f = p.first !== 'none' && p.options.includes(p.first) ? p.first : G.pick(p.options); a2 += f === p.ans;
    const t = G.SCENE_TYPICAL[p.scene]; a4 += (p.options.includes(t) ? t : G.pick(p.options)) === p.ans;
    const sw = STR.find(w => p.words.includes(w)); const st = sw ? (sw === 'W7' ? 'bp' : G.TABLE[sw]) : null; a3 += (st && p.options.includes(st) ? st : G.pick(p.options)) === p.ans;
    bname += argmax(tNm.get(p.names.join('+')), p.options) === p.ans;
    b1 += argmax(tN.get(String(p.n)), p.options) === p.ans; bopt += argmax(tO.get(p.options.join(',')), p.options) === p.ans;
    const ks = nsKeys(p); let cn = null; for (let i = 0; i < 4; i++) { const e = tK[i].get(ks[i]); if (e && Object.values(e).reduce((a, b) => a + b, 0) >= 3) { cn = e; break; } } bns += argmax(cn, p.options) === p.ans;
  }
  // per-word conditional rate over the F1-F4 pool
  const wc = {};
  for (const p of test.flat()) for (const w of p.words) { wc[w] = wc[w] || [0, 0]; wc[w][0]++; wc[w][1] += p.ans === G.TABLE[w] ? 1 : 0; }
  const wcn = {};
  for (const p of test.flat().filter(p => !p.pair)) for (const w of p.words) { wcn[w] = wcn[w] || [0, 0]; wcn[w][0]++; wcn[w][1] += p.ans === G.TABLE[w] ? 1 : 0; }
  const wrNoPair = Object.entries(wcn).filter(([, v]) => v[0] >= 50).map(([w, v]) => [w, +(v[1] / v[0]).toFixed(3), v[0]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const wr = Object.entries(wc).filter(([, v]) => v[0] >= 50).map(([w, v]) => [w, v[1] / v[0], v[0]]).sort((a, b) => b[1] - a[1]);
  // V042 (検証 39): family name in every problem, P(type | family name) / P(type)
  const all = test.flat(); const marg = {}; let fam = 0; all.forEach(p => { marg[p.ans] = (marg[p.ans] || 0) + 1; if (p.names.some(x => G.FAMILY.includes(x))) fam++; });
  let lo = 9, hi = 0; for (const f of G.FAMILY) { const ps = all.filter(p => p.names.includes(f)); for (const t of Object.keys(marg)) { if (marg[t] / all.length < 0.03) continue; const r = (ps.filter(p => p.ans === t).length / ps.length) / (marg[t] / all.length); lo = Math.min(lo, r); hi = Math.max(hi, r); } }
  return { lv, nF1: n, Bname: bname / n, famShare: fam / all.length, nameRatio: [+lo.toFixed(2), +hi.toFixed(2)], A3: a3 / n, B1: b1 / n, Bopt: bopt / n, Bns: bns / n, B2surf: b2 / n, B2surf_single: nsingle ? b2single / nsingle : null, B2surf_pair: npair ? b2pair / npair : null, A2: a2 / n, A4: a4 / n, wordMax: wr[0], wordTop3: wr.slice(0, 3).map(x => [x[0], +x[1].toFixed(3), x[2]]), wordNoPairTop3: wrNoPair, words: wr };
}

// ---------------- Lv1-2: Bshape on F2 with type names
function measureShape(lv) {
  G.setSeed(SEED * 1000 + lv);
  const types = lv === 1 ? G.GA : G.GB;
  const ids = G.SK_IDS.filter(k => G.SK[k].f2 && types.includes(G.SK[k].type));
  let c = [];
  const per = Math.ceil(NCAND / types.length);
  for (const ty of types) { const tids = ids.filter(k => G.SK[k].type === ty); let k = 0, guard = 0; while (k < per && guard++ < per * 5) { const p = G.buildF2(G.pick(tids), lv); if (p) { c.push(p); k++; } } }
  // V04 (4.3 規則 10): answers made even inside each look set; a look set with one answer only keeps weight DETW
  const DETW = process.env.DETW !== undefined ? +process.env.DETW : 0.3;
  const g = new Map(); c.forEach(p => { if (!g.has(p.key)) g.set(p.key, {}); const o = g.get(p.key); o[p.ans] = (o[p.ans] || 0) + 1; });
  const before = c.length;
  G.balance(c, [{ key: p => p.key, ans: p => p.ans }], 1, [], 0);
  let single = 0; c.forEach(p => { if (Object.keys(g.get(p.key)).length < 2) { p.w *= DETW; single++; } });
  const byType = {}; for (const ty of types) { const sub = c.filter(p => p.type === ty); byType[ty] = sub.length ? G.sampler(sub) : null; }
  const mk = () => { const pos = types.concat([G.pick(types)]); return pos.map(t => byType[t] && byType[t]()).filter(Boolean); };
  G.setSeed(SEED * 1000 + lv + 500); const train = []; for (let i = 0; i < NTRAIN; i++) train.push(...mk());
  G.setSeed(SEED * 1000 + lv + 900); const test = []; for (let i = 0; i < NTEST; i++) test.push(...mk());
  const tab = new Map(); train.forEach(p => { if (!tab.has(p.key)) tab.set(p.key, {}); const o = tab.get(p.key); o[p.ans] = (o[p.ans] || 0) + 1; });
  let hit = 0, grid2 = 0;
  for (const p of test) {
    const o = tab.get(p.key) || {};
    const aps = [...new Set(p.apOpts)];
    let best = -1, bs = []; for (const a of aps) { const v = o[a] || 0; if (v > best) { best = v; bs = [a]; } else if (v === best) bs.push(a); }
    const chosenAp = G.pick(bs);
    const same = p.apOpts.filter(a => a === chosenAp).length;
    if (chosenAp === p.ans && G.R() < 1 / same) hit++;
    if (p.grid === '2x2') grid2++;
  }
  const singleShown = test.filter(p => Object.keys(g.get(p.key)).length < 2).length / test.length;
  return { lv, Bshape: hit / test.length, singleCandidates: single / before, singleShown, generated: before, share2x2: grid2 / test.length, typesWithoutCandidates: types.filter(t => !byType[t]) };
}

const res = [];
for (const lv of [1, 2]) { const r = measureShape(lv); log(JSON.stringify(r)); res.push(r); }
for (let lv = 3; lv <= 10; lv++) { const r = measureLv(lv); log(JSON.stringify({ ...r, words: undefined })); res.push(r); }
console.log(JSON.stringify(res, null, 1));
