'use strict';
// Set composition for kom_unit_mix v0.2 (doc 4 and 5). Rejection sampling until every rule holds.
const G = require('./gen.js');
const V = require('./solvers.js');
const { pick, shuffle, isInt, DEC_DOMAINS, DOM5 } = G;

const pidOf = q => (q.pattern === 'diagnosis' ? 'diagnosis.' + pidOf(q.src) : `${q.pattern}.${q.domain}.${q.dir}.${q.form}`);
const base = q => (q.pattern === 'diagnosis' ? q.src : q);
function is60(q0) {
  const q = base(q0);
  if (q.domain === 'time' && ['dec', 'frac', 'comp'].includes(q.form)) return true;
  if (q.pattern === 'convert' && q.domain === 'time' && !isInt(q.ans)) return true;
  return false;
}
function isUp(q0) { const q = base(q0); return q.dir === 'up'; }
// v0.2 (4.2 の 5): no two items of a set ask about the same quantity (same given and same unit)
// v0.2.4 (4.2 の 5): compare and align_calc count both of their quantities (U12)
function qkeys(q0) {
  const q = base(q0);
  if (q.pattern === 'time_express') return ['分|' + q.X];
  if (q.pattern === 'compound_in') return [q.from + '|' + q.hi + '+' + q.lo]; // v0.2.6: a compound quantity is both of its parts
  if (q.pattern === 'compare') return [q.bigU + '|' + q.vb, q.smallU + '|' + q.vs];
  if (q.pattern === 'align_calc') { const [bu, su] = q.domain === 'time' ? CPAIRS_U[q.cpair] : [G.REL1.find(r => r.id === q.rel).big, G.REL1.find(r => r.id === q.rel).small]; return [bu + '|' + q.vb, su + '|' + q.s]; }
  return [(q.from || q.domain) + '|' + q.gv];
}
const CPAIRS_U = { C1: ['時間', '分'], C2: ['分', '秒'] };
function pidOK(set) { const c = {}; for (const q of set) { const p = pidOf(q); c[p] = (c[p] || 0) + 1; if (c[p] > 2) return false; }
  const ks = set.filter(q => q.pattern !== 'recall').flatMap(qkeys); return new Set(ks).size === ks.length; }
const domains = set => new Set(set.map(q => base(q).domain));
function flatten(R, blocks) { return shuffle(R, blocks).flat(); }

// v0.2 (4.5): the chain normal keeps pattern, domain, direction and form, and uses a different relation when the domain has one.
function chainOf(R, src) {
  let fallback = null;
  // v0.2.1: when every relation of the domain has the same factor as the source (time, weight, volume, speed R16),
  // the chain normal takes the reverse direction, so that carrying over the previous operation does not pay (A4)
  const sameF = (src.pattern === 'convert' || src.pattern === 'align_calc') && G.POOL1.filter(x => x.domain === src.domain).every(x => G.eq(x.f, src.f));
  const s2 = sameF ? Object.assign({}, src, { dir: src.dir === 'down' ? 'up' : 'down' }) : src;
  // v0.2.4 (4.5 の 3): the chain band is planned once. Before, every retry below drew a new band, so the chain took
  // whichever band worked for its direction and the band and direction of chains were correlated (E7 Lv7 0.18)
  const cb = G.planBand(R);
  for (let t = 0; t < 300; t++) {
    const q = regen(R, s2, cb);
    if (!q || pidOf(q) !== pidOf(s2)) continue;
    const relOf = x => x.rel || x.cpair || null; // v0.2.4 (U11): time align_calc uses the pair (C1 or C2) as its relation
    const sameRel = relOf(q) !== null && relOf(q) === relOf(src);
    if (!sameRel) return q;
    fallback = fallback || q;
  }
  if (fallback) return fallback;
  throw new Error('chain');
}
function regen(R, s, band) {
  switch (s.pattern) {
    case 'convert': return G.makeConvert(R, { domains: [s.domain], dir: s.dir, form: s.form, steps: s.steps, _band: band });
    case 'compare': return G.makeCompare(R, { domains: [s.domain], form: s.form, _dir: s.dir }); // v0.2.3: compare has a direction
    case 'align_calc': return G.makeAlign(R, { domains: [s.domain], dir: s.dir, _band: band });
    case 'speed_apply': return G.makeSpeedApply(R, s.sa, band);
  }
}

// v0.2 (4.3): probe traps. Each probe in scope must fail at least `need` items of the set.
const TRAP_SCOPE = { M1mag: 1, M1magR: 1, M1: 3, M1d: 3, M2: 4, M3: 8 };
function trapCount(set, name) { return set.filter(q => V.probeFails(name, q)).length; }
const TRAP_NEED = { M1mag: 2, M1magR: 2, M1: 2, M1d: 2, M2: 2, M3: 2 }; // v0.2.1: M1mag 3, its reverse 2, M1 and its reverse M1d 2 each (C7)
const needOf = (lv, name) => TRAP_NEED[name];
function trapsOK(lv, set) {
  for (const [name, from] of Object.entries(TRAP_SCOPE)) if (lv >= from && trapCount(set, name) < needOf(lv, name)) return false;
  return true;
}

function lv1(R) {
  const qs = [G.makeRecall(R), G.makeRecall(R),
    G.makeRateSelect(R, { domains: DOM5, dir: 'down', form: 'int' }), G.makeRateSelect(R, { domains: DOM5, dir: 'down', form: 'int' }),
    G.makeRateSelect(R, { domains: DOM5, dir: 'down', form: 'int' })];
  return shuffle(R, qs);
}
function lv2(R) {
  const k = pick(R, G.B_INT);
  const t = G.makeConvert(R, { domains: ['time'], dir: 'down', form: 'int', gv: k });
  const d = G.makeConvert(R, { domains: DEC_DOMAINS, dir: 'down', form: 'int', gv: k });
  const pair = shuffle(R, [t, d]); pair[0].pairType = 'CP1'; pair[1].pairType = 'CP1'; pair[1].pairWithPrev = true;
  const rs = [0, 1, 2].map(() => [G.makeRateSelect(R, { domains: DOM5, dir: 'down', form: 'int' })]);
  return flatten(R, [pair, ...rs]);
}
// v0.2 (4.4 CP2): the same given number in both directions (50kg は 何 g / 50g は 何 kg).
function lv3(R) {
  // v0.2.2 (C6): the variant (reverse, or same direction with another relation of a different factor) is planned first,
  // and the relation is drawn from the domains where the variant exists, so neither variant is rejected more often
  const variant = G.planDir(R, ['rev', 'same']);
  const pool = G.POOL1.filter(x => DOM5.includes(x.domain) && (variant === 'rev' || G.POOL1.some(y => y.domain === x.domain && !G.eq(y.f, x.f))));
  const r = pick(R, pool);
  const k = pick(R, G.VALUES.CP2_GIVEN);
  const d1 = G.planDir(R, ['down', 'up']);
  const first = G.convQ(r, d1, k, isInt(d1 === 'down' ? k : k / r.f) ? 'int' : 'dec');
  let second;
  if (variant === 'rev') second = G.convQ(r, d1 === 'down' ? 'up' : 'down', k, 'int');
  else { const others = G.POOL1.filter(x => x.domain === r.domain && !G.eq(x.f, r.f)); if (!others.length) return null; second = G.convQ(pick(R, others), d1, k, 'int'); }
  if (!first || !second || G.eq(first.ans, second.ans)) return null;
  if (second.dir === 'up' && !isInt(second.ans)) second.form = 'dec';
  const pair = [first, second]; pair[1].pairWithPrev = true; pair[0].pairType = pair[1].pairType = 'CP2';
  const c = G.makeConvert(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] });
  const rs = [0, 1].map(() => [G.makeRateSelect(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] })]);
  return flatten(R, [pair, [c], ...rs]);
}
function ok3(set) {
  const up = set.filter(q => q.dir === 'up').length, dn = set.filter(q => q.dir === 'down').length;
  const d = domains(set); return up >= 2 && dn >= 2 && d.size >= 3 && d.has('time') && pidOK(set);
}
// v0.2 Lv4: the diagnosis source and its chain are up items.
function lv4(R) {
  const pd = G.planDir(R, ['down', 'up']);
  // v0.2.4: the band of the CP1 pair is planned too. Before, the up list was mostly 10 or more and the down list mostly under 10,
  // so the band of the pair told its direction (E7 Lv4 0.19)
  const cpBand = G.planBand(R); const inB = x => (cpBand === 'big' ? x >= 10 : x < 10);
  const v = pick(R, (pd === 'down' ? G.VALUES.LV4_CP1_DOWN : G.VALUES.LV4_CP1_UP).filter(inB)); // v0.2.1: the CP1 pair goes up or down
  const t = G.makeConvert(R, { domains: ['time'], dir: pd, form: 'dec', gv: v });
  const d = G.makeConvert(R, { domains: DEC_DOMAINS, dir: pd, form: 'dec', gv: v });
  // v0.2.8 (4.4 章、9.2 章): both items of the pair keep the value band of 9.2 章. The big-unit side is in B_DEC, or an up item
  // gives a small number of UP_SMALL. v0.2.7 let 150m は 何 km (0.15) through, outside both
  const inBand = q => { const big = q.dir === 'down' ? q.gv : q.ans; return G.B_DEC.some(b => G.eq(b, big)) || (q.dir === 'up' && (G.UP_SMALL[q.f] || []).some(b => G.eq(b, q.gv))); };
  if (!inBand(t) || !inBand(d)) return null;
  const pair = shuffle(R, [t, d]); pair[1].pairWithPrev = true;
  const src = G.makeConvert(R, { domains: tc(R) ? ['time'] : DEC_DOMAINS, dir: ['down', 'up'], form: 'dec' });
  const dg = G.makeDiagnosis(R, src, G.LABELS4); if (!dg) return null;
  const ch = chainOf(R, src); ch.chainOf = true;
  const te = G.makeTimeExpress(R, pick(R, ['dec', 'frac']));
  return flatten(R, [pair, [dg, ch], [te]]);
}
function lv5(R) {
  const partner = pick(R, ['C3', 'C4', 'C5']); const tc = pick(R, ['C1', 'C2']);
  const hi = pick(R, G.VALUES.LV5_CP1_HI); // v0.2: the upper part is 10 or more in part of the pairs
  const lo = pick(R, partner === 'C3' ? G.VALUES.LV5_CP1_LO_C3 : G.VALUES.LV5_CP1_LO_C45);
  const pair = shuffle(R, [G.compoundQ(tc, hi, lo), G.compoundQ(partner, hi, lo)]); pair[1].pairWithPrev = true;
  const te = G.makeTimeExpress(R, 'comp');
  const cv = G.makeConvert(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'], steps: 2 });
  const rs = G.makeRateSelect(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] });
  return flatten(R, [pair, [te], [cv], [rs]]);
}
// v0.2 Lv6: compare 3 (diagnosis source included) + convert up 2.
function lv6(R) {
  // v0.2.2: compare 1 + diagnosis (convert or align_calc, direction planned) + chain + convert 1 + align_calc 1.
  // With the mirrored plan, a set and its mirror both need 2 up items (M1) and 2 down items (M1d), so Lv6 needs 4 direction items.
  const cm = G.makeCompare(R, { domains: DOM5, form: ['int', 'dec'] });
  const src = tc(R) ? G.makeConvert(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] }) : G.makeAlign(R, { domains: DOM5, dir: ['down', 'up'] });
  const dg = G.makeDiagnosis(R, src, G.LABELS6); if (!dg) return null;
  const ch = chainOf(R, src); ch.chainOf = true;
  const cv = G.makeConvert(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] });
  const al = G.makeAlign(R, { domains: DOM5, dir: ['down', 'up'] });
  return flatten(R, [[dg, ch], [cm], [cv], [al]]);
}
function ok6(set) {
  const cmps = set.map(base).filter(q => q.pattern === 'compare');
  return pidOK(set); // v0.2.2: one compare per set
}
// v0.2 Lv7: align 3 (diagnosis source included) + convert up 2.
function lv7(R) {
  const src = G.makeAlign(R, { domains: DOM5, dir: ['down', 'up'] });
  const dg = G.makeDiagnosis(R, src, G.LABELS6); if (!dg) return null;
  const ch = chainOf(R, src); ch.chainOf = true;
  const a2 = G.makeAlign(R, { domains: DOM5, dir: ['down', 'up'] });
  const cv1 = G.makeConvert(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] });
  const cv2 = G.makeConvert(R, { domains: DOM5, dir: ['down', 'up'], form: ['int', 'dec'] });
  return flatten(R, [[dg, ch], [a2], [cv1], [cv2]]);
}
// v0.2 Lv8 CP1: "n 分 は 何秒" then "分速 n m は 秒速 何 m" (same given n, opposite direction).
function lv8(R) {
  // v0.2.1 (C6): the first item goes down (n分 は 何秒) or up (n秒 は 何分); the second is 分速 n m -> 秒速 or 時速 n km -> 秒速.
  // When the first goes up, the second is 時速 (分速 would repeat the same ÷60 and the same answer).
  const n = pick(R, G.VALUES.LV8_N);
  const tdir = G.planDir(R, ['down', 'up']);
  const t = G.convQ(G.REL1.find(r => r.id === 'R14'), tdir, n, tdir === 'down' ? 'int' : 'dec');
  // v0.2.3: the second item always takes the direction opposite to the first, so the mirror flips both
  // (n分 は 何秒 / 分速 n m は 秒速 何 m, and n秒 は 何分 / 秒速 n m は 分速 何 m); 分速 or 時速 is a planned variant
  const useMin = G.planDir(R, ['min', 'kmph']) === 'min';
  const sdir = tdir === 'down' ? 'up' : 'down';
  const sf = useMin ? 60 : 3.6;
  const s = G.convQ(G.REL1.find(r => r.id === (useMin ? 'R16' : 'R17')), sdir, n, isInt(sdir === 'up' ? n / sf : n * sf) ? 'int' : 'dec');
  if (!t || !s) return null; s.pairWithPrev = true;
  const cv = G.makeConvert(R, { domains: ['speed'], dir: ['down', 'up'], form: ['int', 'dec'] });
  const rs = G.makeRateSelect(R, { domains: ['speed'], dir: ['down', 'up'], form: 'int' });
  // v0.2: the speed compare is replaced by a second speed convert (5 章。compare の結論の分布と罠の下限が両立しないため)
  const cv2 = G.makeConvert(R, { domains: ['speed'], dir: ['down', 'up'], form: ['int', 'dec'] });
  return flatten(R, [[t, s], [cv], [rs], [cv2]]);
}
function lv9(R) {
  let src1;
  if (tc(R)) src1 = G.makeSpeedApply(R, tp(R, ['apply', 'apply', 'apply', 'mix']));
  else src1 = G.makeConvert(R, { domains: ['speed'], dir: ['down', 'up'], form: ['int', 'dec'] });
  const d1 = G.makeDiagnosis(R, src1, G.LABELS6); if (!d1) return null;
  const c1 = chainOf(R, src1); c1.chainOf = true;
  // v0.2.1 (C7): the domain of the second diagnosis is drawn in the plan, so the rejection does not keep picking time
  const dom2 = G.PLAN.doms && G.PLAN.doms.length ? G.PLAN.doms[0] : pick(R, DOM5);
  // v0.2.4 (U24, 統括者の方針 (b)): Lv9 has one diagnosis. The second diagnosis and its chain become two direction items:
  // a convert or align_calc of a 10 進 domain or time, and a speed convert
  const x2 = tc(R) ? G.makeConvert(R, { domains: [dom2], dir: ['down', 'up'], form: ['int', 'dec'] }) : G.makeAlign(R, { domains: [dom2], dir: ['down', 'up'] });
  const x3 = G.makeConvert(R, { domains: ['speed'], dir: ['down', 'up'], form: ['int', 'dec'] });
  const sa = G.makeSpeedApply(R, 'mix');
  return flatten(R, [[d1, c1], [x2], [x3], [sa]]);
}
function randomQ(R, type) {
  const DOM6 = [...DOM5, 'speed'];
  switch (type) {
    case 'rate_select': return G.makeRateSelect(R, { domains: DOM6, dir: ['down', 'up'], form: ['int', 'dec'] });
    case 'convert': {
      const two = tp(R, [true, false, false, false]);
      return G.makeConvert(R, { domains: two ? DOM5 : DOM6, dir: ['down', 'up'], form: two ? ['int', 'dec'] : ['int', 'dec', 'frac'], steps: two ? 2 : 1 });
    }
    case 'compound_in': return G.makeCompound(R, pick(R, ['C1', 'C2', 'C3', 'C4', 'C5']));
    case 'time_express': return G.makeTimeExpress(R, pick(R, ['dec', 'frac', 'comp']));
    case 'compare': return G.makeCompare(R, { domains: DOM6, form: ['int', 'dec'] });
    case 'align_calc': return G.makeAlign(R, { domains: DOM5, dir: ['down', 'up'] }); // v0.2.3: was always down
    case 'speed_apply': return G.makeSpeedApply(R, tp(R, ['apply', 'apply', 'apply', 'mix']));
  }
}
function lv10(R) {
  const src = tc(R) ? (tc(R) ? G.makeConvert(R, { domains: ['speed'], dir: ['down', 'up'], form: ['int', 'dec'] }) : G.makeSpeedApply(R, tp(R, ['apply', 'apply', 'apply', 'mix'])))
    : randomQ(R, tp(R, ['convert', 'align_calc'])); // v0.2.4 (U27): compare is not a diagnosis source
  const dg = G.makeDiagnosis(R, src, G.LABELS6); if (!dg) return null;
  const ch = chainOf(R, src); ch.chainOf = true;
  // v0.2 Lv10: one speed slot, one time slot, one free slot (5 章)
  const types = ['rate_select', 'convert', 'compound_in', 'time_express', 'align_calc', 'speed_apply']; // v0.2: compare は自由枠に入れない
  const sp = tp(R, [() => G.makeConvert(R, { domains: ['speed'], dir: ['down', 'up'], form: ['int', 'dec'] }),
    () => G.makeRateSelect(R, { domains: ['speed'], dir: ['down', 'up'], form: 'int' }), () => G.makeSpeedApply(R, 'mix')])();
  const tm = tp(R, [() => G.makeConvert(R, { domains: ['time'], dir: ['down', 'up'], form: ['dec', 'frac'] }),
    () => G.makeTimeExpress(R, pick(R, ['dec', 'frac', 'comp'])), () => G.makeCompound(R, pick(R, ['C1', 'C2']))])();
  const free = randomQ(R, tp(R, types));
  return flatten(R, [[dg, ch], [sp], [tm], [free]]);
}
function ok10(set) {
  const d = domains(set); const types = new Set(set.map(q => q.pattern));
  return d.size >= 3 && types.size >= 4 && d.has('time') && pidOK(set); // v0.2: 3 domains (speed and time slots are fixed)
}
const BUILD = {
  1: [lv1, s => { const d = domains(s); return d.size >= 3 && d.has('time') && pidOK(s); }],
  2: [lv2, s => { const d = domains(s); return d.size >= 3 && d.has('time') && pidOK(s); }],
  3: [lv3, ok3], 4: [lv4, pidOK], 5: [lv5, pidOK], 6: [lv6, ok6], 7: [lv7, pidOK], 8: [lv8, pidOK], 9: [lv9, pidOK], 10: [lv10, ok10] };
const STATS = {};
// v0.2.3: the structural choices of a set (which pattern fills a slot, which source a diagnosis has) are drawn from planned
// uniforms too, so a plan and its mirror have the same structure and only the directions differ. Before this, the retries
// inside one plan could pick a different pattern for the mirror (Lv10 compare went down 0.83 of the time)
const TS = { u: [], i: 0 };
const tp = (R, arr) => arr[Math.floor((TS.i < TS.u.length ? TS.u[TS.i++] : R()) * arr.length)];
const tc = R => tp(R, [true, false]);
const CONCL_W6 = [['big', 0.24], ['same', 0.21], ['small', 0.55]];
const wpick = (R, w) => { let u = R(); for (const [k, p] of w) { if (u < p) return k; u -= p; } return w[w.length - 1][0]; };
// v0.2.6 (4.2 の 6、12 章の 18): a set does not ask a quantity (4.2 の 5 の数え方、recall を除く) that one of the previous
// RECENT_SETS sets of the same Lv asked. `recent` is the set of those keys; makeStream keeps it.
const RECENT_SETS = Number(process.env.UMIX_RECENT === undefined ? 3 : process.env.UMIX_RECENT);
// a question is the quantity given together with the unit asked for (6分 は 何時間 and 6分 は 何秒 are different questions)
const askedUnit = q0 => { const q = base(q0); return q.to || (q.pattern === 'time_express' ? '時間' : q.pattern === 'compare' ? (q.dir === 'up' ? q.bigU : q.smallU) : q.pattern === 'align_calc' ? q.dir : q.sa || ''); };
// recall and the speed domain are left out: the speed questions are few (秒速 5 値から 12 値) and meet the trap minimums only
// with a handful of values, so with them in the window Lv8 to Lv10 could not be built (v0.2.6)
const setKeys = set => set.filter(q => q.pattern !== 'recall' && base(q).domain !== 'speed').flatMap(q => qkeys(q).map(k => k + '>' + askedUnit(q)));
const recentOK = (set, recent) => !recent || !setKeys(set).some(k => recent.has(k));
// Lv8 is exempt: its question space is small (9.4 章の 8 patternId) and the values that meet the trap minimums in both a plan
// and its mirror are few, so even a window of 1 set took 560 000 tries for one set (v0.2.6)
const recentWindow = lv => (lv === 8 ? 0 : RECENT_SETS); // Lv8: see the comment above (time items are only the CP1 n, and the trap minimums need particular n)
function makeStream(lv, R, k = recentWindow(lv)) {
  const hist = [];
  return () => {
    const recent = new Set(hist.flat());
    const s = buildSet(lv, R, k > 0 ? recent : null);
    hist.push(setKeys(s)); while (hist.length > k) hist.shift();
    return s;
  };
}
function buildSet(lv, R, recent) {
  G.PLAN.recent = recent && recent.size ? (q => setKeys([q]).some(k => recent.has(k))) : null; // v0.2.6
  try { return buildSetInner(lv, R, recent); } finally { G.PLAN.recent = null; }
}
function buildSetInner(lv, R, recent) {
  const [mk, ok] = BUILD[lv];
  let t = 0;
  // v0.2.2: stratified plan with its mirror. A plan fixes, slot by slot, the direction and the band (and the domain,
  // the conclusion, the sheet, the variants). The mirror flips every planned direction and keeps everything else.
  // A plan is used only when both it and its mirror can be built; one of the two sets is returned at random,
  // so each planned slot is up exactly half the time and the direction is independent of domain and band.
  const TRIES = Number(process.env.UMIX_TRIES || 40);
  const tryBuild = () => {
    for (let k = 0; k < TRIES; k++) {
      t++; TS.i = 0; G.PLAN.ci = 0; G.PLAN.di = 0; G.PLAN.ri = 0; G.PLAN.vi = 0; G.PLAN.ui = 0; G.PLAN.bi = 0;
      let s; try { s = mk(R); } catch (e) { continue; }
      if (s && ok(s) && recentOK(s, recent) && trapsOK(lv, s)) return s;
    }
    return null;
  };
  for (let plan = 0; plan < 100000; plan++) {
    // v0.2.3 (4.6 の 3): at Lv6 the planned conclusion is drawn with weights inverse to how often a plan with that conclusion
    // can be built (a "small" compare traps no probe, so its plans fail more often), so the accepted sets come out near 1/3 each
    const CW = lv === 6 ? CONCL_W6 : null;
    G.PLAN.concl = [0, 1, 2, 3].map(() => (CW ? wpick(R, CW) : pick(R, ['big', 'small', 'same']))); G.PLAN.diag = [0, 1].map(() => R() < 0.25);
    const dirs = [0, 1, 2, 3, 4, 5].map(() => pick(R, ['down', 'up']));
    G.PLAN.vars = [0, 1].map(() => R() < 0.5); G.PLAN.doms = [pick(R, DOM5)]; G.PLAN.us = [0, 1, 2, 3, 4, 5, 6, 7].map(() => R()); TS.u = Array.from({ length: 12 }, () => R());
    G.PLAN.bands = Array.from({ length: 12 }, () => (R() < 0.5 ? 'big' : 'small'));
    G.PLAN.dirs = dirs; const s1 = tryBuild(); if (!s1) continue;
    const vars0 = G.PLAN.vars; G.PLAN.dirs = dirs.map(d => (d === 'up' ? 'down' : 'up')); G.PLAN.vars = vars0.map(v => !v); // the mirror also flips the variants (CP2, Lv8)
    const s2 = tryBuild(); G.PLAN.vars = vars0; if (!s2) continue;
    STATS[lv] = STATS[lv] || []; STATS[lv].push(t);
    G.PLAN.concl = []; G.PLAN.diag = []; G.PLAN.dirs = []; G.PLAN.bands = [];
    return R() < 0.5 ? s1 : s2;
  }
  throw new Error('buildSet fail lv' + lv);
}
module.exports = { BUILD, buildSet, makeStream, setKeys, RECENT_SETS, recentWindow, pidOf, base, is60, isUp, trapCount, TRAP_SCOPE, TRAP_NEED, needOf, STATS };
