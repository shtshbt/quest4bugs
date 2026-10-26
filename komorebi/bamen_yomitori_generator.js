(function(global){
  'use strict';
  // Internal fields such as scene and S are test seams for strict_check.

  const FAMILY = [['さいと', 'くん'], ['ゆうと', 'くん'], ['しょうた', 'くん'], ['ゆきこ', 'さん']];
  const POOL = [['たろう', 'くん'], ['じろう', 'くん'], ['けんた', 'くん'], ['そうた', 'くん'], ['こうき', 'くん'],
    ['はなこ', 'さん'], ['さくら', 'さん'], ['みお', 'さん'], ['めい', 'さん'], ['あおい', 'さん'], ['りこ', 'さん']];
  const SIMILAR = [['たろう', 'じろう'], ['けんた', 'そうた'], ['はなこ', 'りこ'], ['めい', 'あおい'], ['ゆうと', 'さいと']];
  const OBJS = [{ name: 'あめ', u: 'こ', id: 'candy' }, { name: 'どんぐり', u: 'こ', id: 'acorn' }, { name: 'おはじき', u: 'こ', id: 'marble' },
    { name: 'シール', u: 'まい', id: 'sticker' }, { name: 'カード', u: 'まい', id: 'card' }];
  const OTHER = [{ name: 'ガム', u: 'こ' }, { name: 'ビーだま', u: 'こ' }, { name: 'えんぴつ', u: '本' }];
  const INS = ['きょう', 'きのう', 'さっき', 'あさ'];
  const INS_T = INS.concat(['そっと']);
  const REL_N = ['ともだち', 'せんぱい', 'こうはい'], REL_K = ['おにいさん', 'おとうと', 'おじいさん'], REL_S = ['おねえさん', 'いもうと', 'おばあさん'];
  const ONE_HAVE = ['h1', 'h2', 'h3', 'h5', 'h9'];
  const ONE_SPLIT = ['h1', 'h2', 'h3', 'h9'];
  const UNITQ = { こ: 'なんこ', まい: 'なんまい', 本: 'なんぼん' };

  function rng(random) {
    const r = () => { const x = random(); if (typeof x !== 'number' || !Number.isFinite(x) || !(x >= 0 && x < 1)) throw new Error('random() out of range'); return x; };
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const coin = (p = 0.5) => r() < p;
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { r, ri, pick, coin, shuffle };
  }
  class Redraw extends Error {}
  const need = c => { if (!c) throw new Redraw(); };
  function retry(f, n = 5000) { for (let i = 0; i < n; i++) { try { return f(); } catch (e) { if (!(e instanceof Redraw)) throw e; } } throw new Redraw(); }

  function drawPersons(R, k, lv) {
    return retry(() => {
      const nf = Math.min(k, R.coin() ? 1 : 2);
      const fam = R.shuffle(FAMILY).slice(0, nf), pool = R.shuffle(POOL).slice(0, k - nf);
      const ps = R.shuffle(fam.concat(pool)).map(([name, hon]) => ({ name, hon, full: name + hon, fam: FAMILY.some(f => f[0] === name) }));
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
        const a = ps[i].name, b = ps[j].name;
        if (a[0] === b[0]) need([a, b].includes('ゆうと') && [a, b].includes('ゆきこ'));
        if (lv <= 6) need(!SIMILAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
      }
      return ps;
    });
  }
  const relWord = (R, X) => R.pick(REL_N.concat(X.hon === 'さん' ? REL_S : REL_K));

  function S(toks, id, extra = {}) { const s = Object.assign({ toks, id, ev: false, role: 'state', owner: null }, extra); return s; }
  function stmt(R, form, X, Y, N, ctx) {
    const o = ctx.obj.name, Nu = N + ctx.obj.u;
    switch (form) {
      case 'h1': return [S([X.full + 'は', o + 'を', Nu, ctx.verb], 'h1', { owner: X.full, num: N })];
      case 'h2': return [S([X.full + 'の', o + 'は', Nu, 'です'], 'h2', { owner: X.full, num: N })];
      case 'h3': return [S([o + 'を', Nu, ctx.nom + 'のは', X.full + 'です'], 'h3', { owner: X.full, num: N })];
      case 'h5': return [S(['きのう', 'わけて', 'もらった', o + 'を、', X.full + 'は', Nu, ctx.verb], 'h5', { owner: X.full, num: N })];
      case 'h6': return [S([X.full + 'も', o + 'を', ctx.verb], 'h6', { owner: X.full, num: null, h6head: true }), S([Nu, ctx.past ? 'でした' : 'です'], 'h6', { owner: X.full, num: N, h6tail: true })];
      case 'h7': return [S(['もう', 'ひとりは', Nu, ctx.verb], 'h7', { owner: X.full, num: N })];
      case 'h8': { const w = R.pick(INS); return [S([X.full + 'は', w, Y.full + 'の', 'となりで', o + 'を', Nu, ctx.verbH], 'h8', { owner: X.full, partner: Y.full, num: N, ins: w })]; }
      case 'h9': return [S([Y.full + 'の', 'となりで、', X.full + 'は', o + 'を', Nu, ctx.verbH], 'h9', { owner: X.full, partner: Y.full, num: N })];
      case 'h10': { const rel = relWord(R, X), w = R.pick(INS); return [S([Y.full + 'の', rel + 'の', X.full + 'は', w, o + 'を', Nu, ctx.verbH], 'h10', { owner: X.full, partner: Y.full, num: N, rel, ins: w })]; }
    }
    throw new Error('form ' + form);
  }
  const CTX = {
    have: obj => ({ obj, verb: 'もっています', verbH: 'ひろいました', nom: 'もっている', past: false }),
    split: obj => ({ obj, verb: 'もらいました', verbH: 'もらいました', nom: 'もらった', past: true }),
    hold: obj => ({ obj, verb: 'もっていました', verbH: 'ひろいました', nom: 'もっていた', past: true }),
  };
  function bindingForms(R, owners, k, scene) {
    const one = scene === 'split' ? ONE_SPLIT : ONE_HAVE;
    const forms = [];
    if (k === 2) {
      if (owners.length === 1) return [R.coin() ? 'h8' : 'h10'];
      if (R.coin(0.7)) { const f = R.shuffle(['h8', 'h10']); return f; }
      const i = R.coin() ? 0 : 1; const fr = [null, null];
      fr[i] = R.coin() ? 'h8' : 'h10'; fr[1 - i] = R.pick(one);
      return fr;
    }
    for (let i = 0; i < owners.length; i++) {
      const x = R.r();
      if (x < 0.7) forms.push(R.coin() ? 'h8' : 'h10');
      else if (x < 0.8) {
        const h7ok = scene !== 'split' && i === owners.length - 1 && owners.length === k;
        forms.push(h7ok && R.coin() ? 'h7' : 'h6');
      } else forms.push(R.pick(one));
    }
    return forms;
  }
  function renderOwners(R, owners, vals, ps, k, scene, ctx) {
    const forms = bindingForms(R, owners, k, scene);
    const out = [];
    owners.forEach((X, i) => {
      const f = forms[i];
      let Y = null;
      if (['h8', 'h9', 'h10'].includes(f)) Y = R.pick(ps.filter(p => p !== X));
      out.push(...stmt(R, f, X, Y, vals[i], ctx));
    });
    return { sents: out, forms };
  }
  function introSent(R, ps) {
    const s = R.shuffle(ps);
    return S(s.slice(0, -1).map(p => p.full + 'と').concat([s[s.length - 1].full + 'が', 'います']), 'intro', { role: 'intro' });
  }
  function h0Sent(R, ps, vals, obj) {
    const ord = R.shuffle(ps.map((_, i) => i)); const toks = [];
    ord.forEach((i, j) => {
      if (j === 0) toks.push(ps[i].full + 'は', obj.name + 'を', vals[i] + obj.u + (j < ord.length - 1 ? '、' : ''));
      else toks.push(ps[i].full + 'は', vals[i] + obj.u + (j < ord.length - 1 ? '、' : ''));
    });
    toks.push('もっていました');
    return S(toks, 'h0', { owners: ord.map(i => ps[i].full), nums: ord.map(i => vals[i]) });
  }
  function tSent(R, G, Rc, n, obj, form, frame, wordSwap) {
    const Nu = n + obj.u;
    const verb = { t1: 'あげました', t2: 'わたしました', t5: 'かえしました', t3: 'もらいました', t4: 'もらいました' }[form];
    let toks, subjIdx;
    if (wordSwap) {
      toks = form === 't1' ? [Rc.full + 'に、', G.full + 'が', Nu, verb] : form === 't3' ? [G.full + 'から、', Rc.full + 'が', Nu, verb] : [G.full + 'に、', Rc.full + 'が', Nu, verb];
      subjIdx = 1;
    } else {
      const Sx = ['t1', 't2', 't5'].includes(form) ? G.full + 'は' : Rc.full + 'は';
      const Ox = ['t1', 't2', 't5'].includes(form) ? Rc.full + 'に' : form === 't3' ? G.full + 'から' : G.full + 'に';
      if (frame) {
        const fr = [frame.Z.full + 'の', frame.word];
        toks = frame.pos === 'before' ? [...fr, Sx, Ox, Nu, verb] : [Sx, ...fr, Ox, Nu, verb];
        subjIdx = frame.pos === 'before' ? 2 : 0;
      } else { toks = [Sx, Ox, Nu, verb]; subjIdx = 0; }
    }
    let subjWord = null;
    if (R.coin()) { subjWord = R.pick(INS_T); toks.splice(subjIdx + 1, 0, subjWord); }
    return S(toks, frame ? 't6' : form, { ev: true, role: 'event', baseForm: form, frame, wordSwap, subjWord, giver: G.full, receiver: Rc.full, n });
  }
  function pickTForm(R, wordSwap) {
    const subjGiver = R.coin();
    if (subjGiver) return { subjGiver, form: wordSwap ? 't1' : R.pick(['t1', 't2', 't5']) };
    return { subjGiver, form: R.coin(0.8) ? 't4' : 't3' };
  }
  function relSent(R, X, Y, D, more, obj) {
    const after = R.coin();
    let toks, id;
    if (D !== null) {
      toks = after ? [Y.full + 'より', X.full + 'の', 'ほうが', D + obj.u, more ? 'おおいです' : 'すくないです'] : [X.full + 'は', Y.full + 'より', D + obj.u, more ? 'おおいです' : 'すくないです'];
      id = after ? (more ? 'c5' : 'c6') : (more ? 'c1' : 'c2');
    } else {
      toks = after ? [Y.full + 'より', X.full + 'の', 'ほうが', more ? 'おおく' : 'すくなく', 'もっています'] : [X.full + 'は', Y.full + 'より', more ? 'おおく' : 'すくなく', 'もっています'];
      id = after ? (more ? 'c5' : 'c6') : (more ? 'c3' : 'c4');
    }
    return S(toks, id, { ev: true, role: 'event', subj: X.full, other: Y.full, D, more });
  }
  function distinct(R, k, lo, hi) { return retry(() => { const v = Array.from({ length: k }, () => R.ri(lo, hi)); need(new Set(v).size === k); return v; }); }

  function haveScene(R, k, lv) {
    const ps = drawPersons(R, k, lv), obj = R.pick(OBJS), vals = distinct(R, k, 1, 15);
    const ord = R.shuffle(ps.map((_, i) => i));
    const r = renderOwners(R, ord.map(i => ps[i]), ord.map(i => vals[i]), ps, k, 'have', CTX.have(obj));
    return { structure: 'have', ps, obj, vals, body: r.sents, forms: r.forms };
  }
  function splitScene(R, k, lv, opts = {}) {
    const ps = drawPersons(R, k, lv), obj = R.pick(OBJS);
    let T, vals;
    if (k === 2) {
      const bigger = opts.knownBig !== undefined ? opts.knownBig : R.coin();
      T = 2 * R.ri(3, 9);
      vals = retry(() => { const a = R.ri(1, T - 1); need(a !== T / 2 && (a > T / 2) === bigger); return [a, T - a]; });
    } else {
      [T, vals] = retry(() => {
        const T0 = k === 3 ? R.ri(6, 10) : R.ri(8, 12);
        const v = Array.from({ length: k - 1 }, () => R.ri(1, T0 - k + 1)); v.push(T0 - v.reduce((a, b) => a + b, 0)); need(v.every(x => x >= 1) && new Set(v).size === k);
        return [T0, v];
      });
    }
    let unk;
    if (k === 2) { const order = R.coin() ? [0, 1] : [1, 0]; const psO = order.map(i => ps[i]); ps.splice(0, 2, ...psO); unk = 1; } else unk = R.ri(0, k - 1);
    const known = ps.map((_, i) => i).filter(i => i !== unk);
    const tf = R.coin(0.4) ? (R.coin() ? 's5' : 's5b') : R.pick(k === 2 ? ['s1', 's1b', 's2', 's3', 's4', 's6'] : ['s1', 's1b', 's2', 's3', 's4']);
    const o = obj.name, u = obj.u, Tu = T + u;
    const names = R.shuffle(ps);
    const andList = (arr, last) => arr.map((p, i) => p.full + (i < arr.length - 1 ? 'と' : last));
    const total = []; let s5X = null;
    if (tf === 's1') total.push(S([Tu + 'の', o + 'を', ...andList(names, 'で'), 'わけました'], 's1', { role: 'total', num: T }));
    if (tf === 's1b') {
      const list = k === 2 ? andList(names, 'で') : k === 3 ? names.map((p, i) => p.full + (i < 2 ? '、' : 'で')) : names.map((p, i) => p.full + (i < 3 ? '、' : 'の')).concat(['4にんで']);
      total.push(S([o + 'が', Tu, 'あります'], 's1b', { role: 'total', num: T }), S([...list, 'ぜんぶ', 'わけました'], 's1b', { role: 'total', num: null }));
    }
    if (tf === 's2') total.push(S([...andList(names, 'で'), 'わけっこしました'], 's2', { role: 'total', num: null }), S(['ぜんぶで', Tu, 'でした'], 's2', { role: 'total', num: T }));
    if (tf === 's3') total.push(S([Tu, 'ある', o + 'を、', ...andList(names, 'が'), 'ぜんぶ', 'もらいました'], 's3', { role: 'total', num: T }));
    if (tf === 's4') total.push(S([Tu + 'の', o + 'を', ...andList(names, 'に'), 'くばりました'], 's4', { role: 'total', num: T }));
    if (tf === 's5' || tf === 's5b') {
      const X = R.pick(ps); s5X = X.full; const rest = ps.filter(p => p !== X);
      if (tf === 's5') total.push(S([X.full + 'は', Tu + 'の', o + 'を', ...rest.map(p => p.full + 'と'), 'わけました'], 's5', { role: 'total', num: T, s5X }));
      else total.push(S([X.full + 'は', o + 'を', Tu, 'ひろって、', ...rest.map(p => p.full + 'と'), 'ぜんぶ', 'わけました'], 's5b', { role: 'total', num: T, s5X }));
    }
    let knownS = [], forms = [];
    if (tf === 's6') {
      const X = ps[known[0]], Y = ps[unk];
      total.push(S([Tu + 'の', o + 'が', 'ありました'], 's6', { role: 'total', num: T }));
      knownS = [S([vals[known[0]] + u + 'を', X.full + 'が', 'とりました'], 's6', { owner: X.full, num: vals[known[0]] }), S(['のこりは', 'ぜんぶ', Y.full + 'の', 'ぶんです'], 's6', { owner: Y.full, num: null })];
      forms = ['s6'];
    } else {
      const ord = R.shuffle(known);
      const r = renderOwners(R, ord.map(i => ps[i]), ord.map(i => vals[i]), ps, k, 'split', CTX.split(obj));
      knownS = r.sents; forms = r.forms;
    }
    return { structure: 'split', ps, obj, T, vals, unk, known, tf, s5X, total, knownS, forms };
  }
  function transferScene(R, k, lv, opts = {}) {
    return retry(() => {
      const ps = drawPersons(R, k, lv), obj = R.pick(OBJS);
      const gi = R.ri(0, k - 1); let ri2; do { ri2 = R.ri(0, k - 1); } while (ri2 === gi);
      const vals = distinct(R, k, 2, 15), n = R.ri(1, 5);
      const g0 = vals[gi], r0 = vals[ri2];
      need(g0 - n >= 1 && r0 + n <= 20 && g0 + n <= 20 && r0 - n >= 1 && n !== Math.abs(g0 - r0));
      const swapWanted = opts.wordSwap !== undefined ? opts.wordSwap : ((lv === 7 || lv === 10) && R.coin(0.6));
      const { subjGiver, form } = pickTForm(R, swapWanted);
      const wordSwap = swapWanted && ['t1', 't3', 't4'].includes(form);
      let frame = null;
      if (k >= 3 && !wordSwap && R.coin(2 / 3)) frame = { Z: R.pick(ps.filter((_, i) => i !== gi && i !== ri2)), pos: R.coin() ? 'before' : 'after', word: R.pick(['まえで', 'となりで']) };
      let start, forms;
      if (R.coin(0.3)) { start = [h0Sent(R, ps, vals, obj)]; forms = ['h0']; }
      else { const ord = R.shuffle(ps.map((_, i) => i)); const r = renderOwners(R, ord.map(i => ps[i]), ord.map(i => vals[i]), ps, k, 'hold', CTX.hold(obj)); start = r.sents; forms = r.forms; }
      const ev = tSent(R, ps[gi], ps[ri2], n, obj, form, frame, wordSwap);
      const after = vals.slice(); after[gi] -= n; after[ri2] += n;
      return { structure: 'transfer', ps, obj, vals, after, n, gi, ri: ri2, start, forms, ev, subjGiver, wordSwap, frame };
    });
  }
  function relScene(R, lv, numbered) {
    return retry(() => {
      const ps = drawPersons(R, 3, lv), obj = R.pick(OBJS);
      const [B, P1, P2] = ps;
      const b = R.ri(3, 15), d1 = R.ri(1, 6), d2 = R.ri(1, 6); need(d1 !== d2);
      const s1 = R.coin() ? 1 : -1, s2 = numbered ? (R.coin() ? 1 : -1) : s1;
      const v1 = b + s1 * d1, v2 = v1 + s2 * d2;
      need([b, v1, v2].every(v => v >= 1 && v <= 20) && new Set([b, v1, v2]).size === 3);
      if (numbered) need(b !== 2 * d2);
      const rel1 = relSent(R, P1, B, numbered ? d1 : null, s1 > 0, obj), rel2 = relSent(R, P2, P1, numbered ? d2 : null, s2 > 0, obj);
      let rels = [rel1, rel2]; if (R.coin()) rels = [rel2, rel1];
      let base = [];
      let forms = [];
      if (numbered) { const r = renderOwners(R, [B], [b], ps, 3, 'have', CTX.have(obj)); base = r.sents; forms = r.forms; }
      return { structure: 'relation', ps, obj, B, P1, P2, b, d1, d2, s1, s2, vals: [b, v1, v2], rels, base, forms };
    });
  }

  const argext = (vals, keys, pol) => { let best = null; for (const k of keys) if (best === null || (pol === 'up' ? vals[k] > vals[best] : vals[k] < vals[best])) best = k; const ties = keys.filter(k => vals[k] === vals[best]); return ties.length > 1 ? null : best; };
  function personTypes(persons, ans, cf, k, boundPersons = {}) {
    const out = {};
    for (const p of persons) if (p !== ans) { const hit = cf.find(c => c[1] === p); out[p] = hit ? hit[0] : (k === 2 ? 'W1' : 'W18'); if (hit && hit[0] === 'W17') boundPersons[p] = hit[2]; }
    return out;
  }

  function scaffoldFor(R, sc, structure) {
    const u = sc.obj.u;
    if (structure === 'transfer') return `メモ  あげた ひと □ ・ もらった ひと □ ・ うごいた かず □${u}`;
    const names = R.shuffle(sc.ps).map(p => `${p.full} □${u}`);
    if (structure === 'split') return `メモ  ${names.join(' ・ ')} ・ ぜんぶ □${u}`;
    return `メモ  ${names.join(' ・ ')}`;
  }
  function cardLabel(ps, vals, u, order) { return order.map(i => `${ps[i].full} ${vals[i]}${u}`).join(' ・ '); }

  function finalize(R, it) {
    if (it.kind === 'find_all') {
      const idx = R.shuffle(it.candList.map((_, i) => i));
      it.cands = idx.map(i => it.candList[i].v); it.candTypes = idx.map(i => it.candList[i].t);
      it.ansSet = it.cands.filter((_, i) => it.candTypes[i] === 'correct');
      it.options = null;
    } else {
      const idx = R.shuffle(it.optList.map((_, i) => i));
      it.options = idx.map(i => it.optList[i].label); it.optionTypes = idx.map(i => it.optList[i].t);
      it.optionBoundPersons = idx.map(i => it.optList[i].boundPerson || null);
      it.ans = it.optionTypes.indexOf('correct');
    }
    return it;
  }
  function baseItem(pattern, lv, sc, extra) {
    const structure = extra.step ? 'step' : sc.structure;
    return Object.assign({ cat: 'kom_bamen_yomitori', lv, pattern, patternId: pattern, structure, k: sc.ps.length, persons: sc.ps, obj: sc.obj, modifiers: [], scene: sc }, extra);
  }
  const ASK = {
    have_num: 'num_of', have_who: 'who_n', have_more: 'more2', have_most: 'most', split_num: 'num_of', split_part: 'num_of', split_who: 'more2', split_most: 'most', split_used: 'used',
    transfer_who: 'gain', transfer_same: 'same', transfer_num: 'num_of', transfer_change: 'change', transfer_card: 'card', transfer_used: 'used', rel_most: 'most', rel_num: 'num_of', rel_card: 'card',
    step_transfer_most: 'most', step_split_transfer_most: 'most', step_split_transfer_card: 'card',
  };
  const ANSKIND = { person: 'person', number: 'number', card: 'card', change: 'change', find_all: 'numbers' };
  const FORMAT = { person: 'normal', number: 'normal', change: 'normal', card: 'formulation', find_all: 'find_all' };

  function qNum(R, X, sc, pattern, verbHint) {
    const o = sc.obj.name, nq = UNITQ[sc.obj.u];
    if (pattern === 'transfer_num') return [X.full + 'は', 'いま', nq, 'もっていますか'];
    const v = [[X.full + 'の', o + 'は', 'いくつですか']];
    if (!sc.objNoise) v.push([X.full + 'は', nq, verbHint + 'か']);
    if (pattern === 'split_num' || pattern === 'split_part') v.push([X.full + 'の', 'ぶんは', nq + 'ですか']);
    return R.pick(v);
  }
  function qPol(R, ask, pol, sc, time) {
    const o = sc.obj.name;
    if (ask === 'more2') {
      const v = pol === 'up' ? [['おおいのは', 'どちらですか'], ['たくさん', 'もっているのは', 'どちらですか']] : [['すくないのは', 'どちらですか'], ['すこししか', 'もっていないのは', 'どちらですか']];
      const q = R.pick(v); return sc.objNoise ? [o + 'が', ...q] : q;
    }
    if (ask === 'most') {
      const past = time === 'before';
      const v = pol === 'up' ? [['いちばん', past ? 'おおかったのは' : 'おおいのは', 'だれですか'], ['いちばん', 'たくさん', past ? 'もっていたのは' : 'もっているのは', 'だれですか']]
        : [['いちばん', past ? 'すくなかったのは' : 'すくないのは', 'だれですか'], ['いちばん', 'すこししか', past ? 'もっていなかったのは' : 'もっていないのは', 'だれですか']];
      let q = R.pick(v);
      if (sc.objNoise) q = [o + 'が', ...q];
      if (time) q = (time === 'before' ? R.pick([['はじめに'], ['うけわたしの', 'まえに']]) : R.pick([['いま'], ['うけわたしの', 'あとで']])).concat(q);
      return q;
    }
    if (ask === 'gain') return pol === 'up' ? R.pick([['ふえたのは', 'だれですか'], [o + 'が', 'おおく', 'なったのは', 'だれですか']]) : R.pick([['へったのは', 'だれですか'], [o + 'が', 'すくなく', 'なったのは', 'だれですか']]);
    throw new Error(ask);
  }

  function genHaveNum(R, lv) {
    return retry(() => {
      const sc = haveScene(R, 2, lv);
      const ai = R.ri(0, 1), oi = 1 - ai, x = sc.vals[ai], y = sc.vals[oi];
      const opts = [{ v: x, t: 'correct' }, { v: y, t: 'W1' }, { v: x + y, t: 'W11' }, { v: Math.abs(x - y), t: 'W12' }];
      need(opts.every(o => o.v >= 1 && o.v <= 20) && new Set(opts.map(o => o.v)).size === 4);
      const owner = sc.body.find(s => s.owner === sc.ps[ai].full && s.num !== null);
      const verbHint = owner && ['h8', 'h9', 'h10'].includes(owner.id) ? 'ひろいました' : 'もっています';
      return finalize(R, baseItem('have_num', lv, sc, { kind: 'number', askedName: sc.ps[ai].full, askedRole: null, qToks: qNum(R, sc.ps[ai], sc, 'have_num', verbHint), optList: opts.map(o => ({ label: String(o.v), t: o.t, v: o.v })), correctValue: x }));
    });
  }
  function genHaveWho(R, lv) {
    const sc = haveScene(R, 2, lv);
    const ai = R.ri(0, 1), N = sc.vals[ai];
    const owner = sc.body.find(s => s.owner === sc.ps[ai].full && s.num !== null);
    const verb = owner && ['h8', 'h9', 'h10'].includes(owner.id) ? 'ひろった' : 'もっている';
    const q = R.pick([[N + sc.obj.u, verb + 'のは', 'だれですか'], [sc.obj.name + 'が', N + sc.obj.u, 'なのは', 'だれですか']]);
    const types = personTypes(sc.ps.map(p => p.full), sc.ps[ai].full, [], 2);
    return finalize(R, baseItem('have_who', lv, sc, { kind: 'person', qToks: q, optList: sc.ps.map(p => ({ label: p.full, t: p === sc.ps[ai] ? 'correct' : types[p.full] })), answerName: sc.ps[ai].full }));
  }
  function genHaveMost(R, lv, k, pol) {
    const sc = haveScene(R, k, lv);
    const V = Object.fromEntries(sc.ps.map((p, i) => [p.full, sc.vals[i]])), keys = Object.keys(V);
    const ans = argext(V, keys, pol);
    const cf = [['W7', argext(V, keys, pol === 'up' ? 'down' : 'up')]];
    const types = personTypes(keys, ans, cf, k);
    const ask = k === 2 ? 'more2' : 'most';
    const it = baseItem(k === 2 ? 'have_more' : 'have_most', lv, sc, { kind: 'person', polarity: pol, qToks: qPol(R, ask, pol, sc), optList: keys.map(p => ({ label: p, t: p === ans ? 'correct' : types[p] })), answerName: ans, valsByName: V });
    return finalize(R, it);
  }
  function splitTypesPerson(sc, V, pol, ans, extraCf = [], boundPersons = {}) {
    const keys = Object.keys(V);
    const cf = [];
    for (const p of [sc.ps[sc.unk].full].concat(sc.s5X ? [sc.s5X] : [])) { const w = Object.assign({}, V); w[p] = sc.T; cf.push(['W17', argext(w, keys, pol), p]); }
    cf.push(['W10', argext(V, sc.known.map(i => sc.ps[i].full), pol)]);
    cf.push(['W7', argext(V, keys, pol === 'up' ? 'down' : 'up')]);
    cf.push(...extraCf);
    return personTypes(keys, ans, cf, keys.length, boundPersons);
  }
  function genSplitWhoMost(R, lv, k, pol) {
    const unkAns = R.coin();
    return retry(() => {
      const sc = splitScene(R, k, lv);
      const V = Object.fromEntries(sc.ps.map((p, i) => [p.full, sc.vals[i]]));
      const ans = argext(V, Object.keys(V), pol); need(ans !== null);
      need((ans === sc.ps[sc.unk].full) === unkAns);
      const boundPersons = {}, types = splitTypesPerson(sc, V, pol, ans, [], boundPersons);
      need(Object.values(types).some(t => t !== 'W18'));
      const ask = k === 2 ? 'more2' : 'most';
      return finalize(R, baseItem(k === 2 ? 'split_who' : 'split_most', lv, sc, { kind: 'person', polarity: pol, qToks: qPol(R, ask, pol, sc), optList: Object.keys(V).map(p => ({ label: p, t: p === ans ? 'correct' : types[p], boundPerson: boundPersons[p] })), answerName: ans, valsByName: V, unknownIsAnswer: ans === sc.ps[sc.unk].full }));
    });
  }
  function genSplitNum(R, lv, k, part, opts = {}) {
    if (!part && k >= 3 && opts.w12Smaller === undefined) opts = Object.assign({}, opts, { w12Smaller: R.coin() });
    return retry(() => {
      const sc = splitScene(R, k, lv, opts);
      const known = sc.known, ai = part ? R.pick(known) : sc.unk;
      const x = sc.vals[ai], T = sc.T;
      let wrong;
      if (part) {
        const others = known.filter(i => i !== ai);
        wrong = [{ v: sc.vals[sc.unk], t: 'W1' }, { v: T, t: 'W2' }, k === 2 ? { v: T / 2, t: 'W13' } : { v: T - sc.vals[R.pick(others)], t: 'W19' }];
      } else if (k === 2) {
        const a = sc.vals[known[0]];
        const pool = [{ v: a, t: 'W1' }, { v: T, t: 'W2' }].concat(T + a <= 20 ? [{ v: T + a, t: 'W3' }] : []);
        wrong = [{ v: T / 2, t: 'W13' }].concat(R.shuffle(pool).slice(0, 2));
      } else {
        const pr = R.shuffle(known).slice(0, 2), w12 = Math.abs(sc.vals[pr[0]] - sc.vals[pr[1]]);
        const smaller = opts.w12Smaller !== undefined ? opts.w12Smaller : null;
        need(w12 >= 1); if (smaller !== null) need((w12 < x) === smaller);
        const textNums = [T].concat(known.map(i => sc.vals[i])); need(!textNums.includes(w12));
        const pool = [{ v: sc.vals[R.pick(known)], t: 'W1' }, { v: T, t: 'W2' }, { v: T - sc.vals[R.pick(known)], t: 'W19' }];
        wrong = [{ v: w12, t: 'W12' }].concat(R.shuffle(pool).slice(0, 2));
      }
      const opt = [{ v: x, t: 'correct' }].concat(wrong);
      need(opt.every(o => o.v >= 1 && o.v <= 20 && Number.isInteger(o.v)) && new Set(opt.map(o => o.v)).size === opt.length);
      return finalize(R, baseItem(part ? 'split_part' : 'split_num', lv, sc, { kind: 'number', askedName: sc.ps[ai].full, askedRole: part ? 'known' : 'unknown', qToks: qNum(R, sc.ps[ai], sc, part ? 'split_part' : 'split_num', 'もらいました'), optList: opt.map(o => ({ label: String(o.v), t: o.t, v: o.v })), correctValue: x }));
    });
  }
  function genSplitUsed(R, lv, k) {
    const sc = splitScene(R, k, lv);
    const ai = sc.unk;
    const cl = [{ v: sc.T, t: 'correct' }].concat(sc.known.map(i => ({ v: sc.vals[i], t: 'correct' })));
    return baseItem('split_used', lv, sc, { kind: 'find_all', askedName: sc.ps[ai].full, askedRole: 'unknown', qToks: R.pick([[sc.ps[ai].full + 'の', 'かずを', 'だすのに', 'つかう', 'かずを', 'ぜんぶ', 'えらびましょう'], [sc.ps[ai].full + 'の', 'ぶんを', 'しらべます。', 'いる', 'かずを', 'ぜんぶ', 'えらびましょう']]), candList: cl });
  }
  function roleOf(sc, i) { return i === sc.gi ? 'giver' : i === sc.ri ? 'receiver' : 'bystander'; }
  function askRoleIdx(R, sc, ratio) {
    const k = sc.ps.length, roles = k === 2 ? ['giver', 'receiver'] : ['giver', 'receiver', 'bystander'];
    const w = k === 2 ? [1, 1] : ratio; let x = R.r() * w.reduce((a, b) => a + b, 0), role = roles[0];
    for (let i = 0; i < roles.length; i++) { if (x < w[i]) { role = roles[i]; break; } x -= w[i]; }
    const idx = role === 'giver' ? sc.gi : role === 'receiver' ? sc.ri : R.pick(sc.ps.map((_, i) => i).filter(i => i !== sc.gi && i !== sc.ri));
    return { role, idx };
  }
  function genTransferNum(R, lv, k, opts = {}) {
    return retry(() => {
      const sc = transferScene(R, k, lv, opts);
      const { role, idx } = opts.role ? { role: opts.role, idx: opts.role === 'giver' ? sc.gi : opts.role === 'receiver' ? sc.ri : sc.ps.findIndex((_, i) => i !== sc.gi && i !== sc.ri) } : askRoleIdx(R, sc, [2, 2, 1]);
      const x0 = sc.vals[idx], x1 = sc.after[idx], n = sc.n;
      const wrong = role === 'bystander' ? [{ v: x0 + n, t: 'W9' }, { v: x0 - n, t: 'W22' }, { v: n, t: 'W5' }]
        : [{ v: role === 'giver' ? x0 + n : x0 - n, t: 'W4' }, { v: n, t: 'W5' }, { v: x0, t: 'W6' }];
      const opt = [{ v: x1, t: 'correct' }].concat(wrong);
      need(opt.every(o => o.v >= 1 && o.v <= 20) && new Set(opt.map(o => o.v)).size === 4);
      return finalize(R, baseItem('transfer_num', lv, sc, { kind: 'number', askedName: sc.ps[idx].full, askedRole: role, qToks: qNum(R, sc.ps[idx], sc, 'transfer_num'), optList: opt.map(o => ({ label: String(o.v), t: o.t, v: o.v })), correctValue: x1 }));
    });
  }
  function genTransferCard(R, lv, k, opts = {}) {
    return retry(() => {
      const sc = transferScene(R, k, lv, opts);
      const w4 = sc.vals.slice(); w4[sc.gi] += sc.n; w4[sc.ri] -= sc.n;
      const order = R.shuffle(sc.ps.map((_, i) => i));
      const sets = [sc.after, w4, sc.vals].map(v => v.slice().sort((a, b) => a - b).join(','));
      need(new Set(sets).size === 3);
      need(w4.every(v => v >= 1 && v <= 20));
      const q = sc.objNoise ? ['いまの', sc.obj.name + 'の', 'ようすに', 'あう', 'カードは', 'どれですか'] : ['いまの', 'ようすに', 'あう', 'カードは', 'どれですか'];
      return finalize(R, baseItem('transfer_card', lv, sc, { kind: 'card', qToks: q, optList: [{ label: cardLabel(sc.ps, sc.after, sc.obj.u, order), t: 'correct', vals: sc.after }, { label: cardLabel(sc.ps, w4, sc.obj.u, order), t: 'W4', vals: w4 }, { label: cardLabel(sc.ps, sc.vals, sc.obj.u, order), t: 'W6', vals: sc.vals }], cardOrder: order }));
    });
  }
  function genTransferWho(R, lv, k, pol, opts = {}) {
    const sc = transferScene(R, k, lv, opts);
    const ans = pol === 'up' ? sc.ps[sc.ri].full : sc.ps[sc.gi].full;
    const types = {}; sc.ps.forEach((p, i) => { if (p.full !== ans) types[p.full] = i === sc.gi || i === sc.ri ? 'W4' : 'W9'; });
    return finalize(R, baseItem('transfer_who', lv, sc, { kind: 'person', polarity: pol, qToks: qPol(R, 'gain', pol, sc), optList: sc.ps.map(p => ({ label: p.full, t: p.full === ans ? 'correct' : types[p.full] })), answerName: ans }));
  }
  function genTransferSame(R, lv, opts = {}) {
    const sc = transferScene(R, 3, lv, opts);
    const bi = sc.ps.findIndex((_, i) => i !== sc.gi && i !== sc.ri), ans = sc.ps[bi].full;
    const q = R.pick([['かずが', 'かわらなかったのは', 'だれですか'], [sc.obj.name + 'が', 'ふえも', 'へりも', 'しなかったのは', 'だれですか']]);
    return finalize(R, baseItem('transfer_same', lv, sc, { kind: 'person', qToks: q, optList: sc.ps.map(p => ({ label: p.full, t: p.full === ans ? 'correct' : 'W6' })), answerName: ans }));
  }
  function changeLabel(d, u) { return d > 0 ? `${d}${u} ふえた` : d < 0 ? `${-d}${u} へった` : 'かわらない'; }
  function genTransferChange(R, lv, k, opts = {}) {
    const sc = transferScene(R, k, lv, opts);
    const { role, idx } = opts.role ? { role: opts.role, idx: opts.role === 'giver' ? sc.gi : opts.role === 'receiver' ? sc.ri : sc.ps.findIndex((_, i) => i !== sc.gi && i !== sc.ri) } : askRoleIdx(R, sc, [1, 1, 1]);
    const u = sc.obj.u, n = sc.n;
    const corr = role === 'giver' ? -n : role === 'receiver' ? n : 0;
    const opt = role === 'bystander' ? [{ d: 0, t: 'correct' }, { d: n, t: 'W9' }, { d: -n, t: 'W22' }] : [{ d: corr, t: 'correct' }, { d: -corr, t: 'W4' }, { d: 0, t: 'W6' }];
    const q = R.pick([[sc.ps[idx].full + 'の', sc.obj.name + 'は', 'どう', 'なりましたか'], [sc.ps[idx].full + 'の', 'かずは', 'どう', 'かわりましたか']]);
    return finalize(R, baseItem('transfer_change', lv, sc, { kind: 'change', askedName: sc.ps[idx].full, askedRole: role, qToks: q, optList: opt.map(o => ({ label: changeLabel(o.d, u), t: o.t })) }));
  }
  function genTransferUsed(R, lv, k, opts = {}) {
    return retry(() => {
      const sc = transferScene(R, k, lv, opts);
      const { role, idx } = askRoleIdx(R, sc, [1, 1, 1]);
      need(!sc.vals.includes(sc.n));
      const cl = sc.ps.map((p, i) => ({ v: sc.vals[i], t: i === idx ? 'correct' : (roleOf(sc, i) === 'bystander' ? 'W9' : 'W1') }));
      cl.push({ v: sc.n, t: role === 'bystander' ? 'W9' : 'correct' });
      const q = R.pick([[sc.ps[idx].full + 'の', 'いまの', 'かずを', 'だすのに', 'つかう', 'かずを', 'ぜんぶ', 'えらびましょう'], [sc.ps[idx].full + 'が', 'いま', UNITQ[sc.obj.u], 'かを', 'しらべます。', 'いる', 'かずを', 'ぜんぶ', 'えらびましょう']]);
      return baseItem('transfer_used', lv, sc, { kind: 'find_all', askedName: sc.ps[idx].full, askedRole: role, qToks: q, candList: cl });
    });
  }
  function genRelNum(R, lv) {
    return retry(() => {
      const sc = relScene(R, lv, true);
      const v1 = sc.vals[1];
      const opt = [{ v: v1, t: 'correct' }, { v: sc.b, t: 'W1' }, { v: sc.d1, t: 'W5' }, { v: sc.b - sc.s1 * sc.d1, t: 'W7' }];
      need(opt.every(o => o.v >= 1 && o.v <= 20) && new Set(opt.map(o => o.v)).size === 4);
      return finalize(R, baseItem('rel_num', lv, sc, { kind: 'number', askedName: sc.P1.full, askedRole: null, qToks: qNum(R, sc.P1, sc, 'rel_num', 'もっています'), optList: opt.map(o => ({ label: String(o.v), t: o.t, v: o.v })), correctValue: v1 }));
    });
  }
  function genRelCard(R, lv) {
    return retry(() => {
      const sc = relScene(R, lv, true);
      const w7 = [sc.b, sc.b - sc.s1 * sc.d1, sc.b - sc.s1 * sc.d1 - sc.s2 * sc.d2], w5 = [sc.b, sc.d1, sc.d2];
      need(w7.every(v => v >= 1 && v <= 20));
      for (let r = 0; r < 3; r++) need(new Set([sc.vals[r], w7[r], w5[r]]).size === (r === 0 ? 1 : 3));
      const sets = [sc.vals, w7, w5].map(v => v.slice().sort((a, b) => a - b).join(',')); need(new Set(sets).size === 3);
      const order = R.shuffle([0, 1, 2]);
      const q = R.pick([['いまの', 'ようすに', 'あう', 'カードは', 'どれですか'], ['ばめんに', 'あう', 'カードは', 'どれですか']]);
      return finalize(R, baseItem('rel_card', lv, sc, { kind: 'card', qToks: q, optList: [{ label: cardLabel(sc.ps, sc.vals, sc.obj.u, order), t: 'correct', vals: sc.vals }, { label: cardLabel(sc.ps, w7, sc.obj.u, order), t: 'W7', vals: w7 }, { label: cardLabel(sc.ps, w5, sc.obj.u, order), t: 'W5', vals: w5 }], cardOrder: order }));
    });
  }
  function genRelMost(R, lv, pol) {
    const sc = relScene(R, lv, false);
    const V = Object.fromEntries(sc.ps.map((p, i) => [p.full, sc.vals[i]])), keys = Object.keys(V);
    const ans = argext(V, keys, pol);
    const first = sc.rels[0]; const big = first.more ? first.subj : first.other, small = first.more ? first.other : first.subj;
    const cf = [['W7', argext(V, keys, pol === 'up' ? 'down' : 'up')], ['W21', pol === 'up' ? big : small]];
    const types = personTypes(keys, ans, cf, 3);
    return finalize(R, baseItem('rel_most', lv, sc, { kind: 'person', polarity: pol, qToks: qPol(R, 'most', pol, sc), optList: keys.map(p => ({ label: p, t: p === ans ? 'correct' : types[p] })), answerName: ans, valsByName: V }));
  }
  function genStepSplit(R, lv, k, mode, pol) {
    return retry(() => {
      const sc = splitScene(R, k, lv);
      const gi = R.ri(0, k - 1); let ri2; do { ri2 = R.ri(0, k - 1); } while (ri2 === gi);
      const n = R.ri(1, 5);
      need(n !== Math.abs(sc.vals[gi] - sc.vals[ri2]));
      const after = sc.vals.slice(); after[gi] -= n; after[ri2] += n;
      const w4 = sc.vals.slice(); w4[gi] += n; w4[ri2] -= n;
      need([...after, ...w4].every(v => v >= 1 && v <= 20));
      const swapWanted = R.coin(0.6);
      const { subjGiver, form } = pickTForm(R, swapWanted);
      const wordSwap = swapWanted && ['t1', 't3', 't4'].includes(form);
      let frame = null;
      if (!wordSwap && R.coin(2 / 3)) frame = { Z: R.pick(sc.ps.filter((_, i) => i !== gi && i !== ri2)), pos: R.coin() ? 'before' : 'after', word: R.pick(['まえで', 'となりで']) };
      const ev = tSent(R, sc.ps[gi], sc.ps[ri2], n, sc.obj, form, frame, wordSwap);
      ev.toks = ['そのあと、'].concat(ev.toks);
      Object.assign(sc, { gi, ri: ri2, n, after, ev, subjGiver, wordSwap, frame, step: 'split' });
      if (mode === 'card') {
        const sets = [after, w4, sc.vals].map(v => v.slice().sort((a, b) => a - b).join(',')); need(new Set(sets).size === 3);
        const order = R.shuffle(sc.ps.map((_, i) => i));
        return finalize(R, baseItem('step_split_transfer_card', lv, sc, { kind: 'card', step: true, qToks: ['いまの', 'ようすに', 'あう', 'カードは', 'どれですか'], optList: [{ label: cardLabel(sc.ps, after, sc.obj.u, order), t: 'correct', vals: after }, { label: cardLabel(sc.ps, w4, sc.obj.u, order), t: 'W4', vals: w4 }, { label: cardLabel(sc.ps, sc.vals, sc.obj.u, order), t: 'W16', vals: sc.vals }], cardOrder: order }));
      }
      need(new Set(after).size === k);
      const V = Object.fromEntries(sc.ps.map((p, i) => [p.full, after[i]])), keys = Object.keys(V);
      const ans = argext(V, keys, pol);
      const B = Object.fromEntries(sc.ps.map((p, i) => [p.full, sc.vals[i]])), W4 = Object.fromEntries(sc.ps.map((p, i) => [p.full, w4[i]]));
      const cf = [['W16', argext(B, keys, pol)], ['W4', argext(W4, keys, pol)]];
      for (const p of [sc.ps[sc.unk].full].concat(sc.s5X ? [sc.s5X] : [])) { const w = Object.assign({}, V); w[p] = sc.T; cf.push(['W17', argext(w, keys, pol), p]); }
      cf.push(['W7', argext(V, keys, pol === 'up' ? 'down' : 'up')]);
      const boundPersons = {}, types = personTypes(keys, ans, cf, k, boundPersons);
      need(Object.values(types).some(t => t !== 'W18'));
      return finalize(R, baseItem('step_split_transfer_most', lv, sc, { kind: 'person', step: true, polarity: pol, time: 'after', qToks: qPol(R, 'most', pol, sc, 'after'), optList: keys.map(p => ({ label: p, t: p === ans ? 'correct' : types[p], boundPerson: boundPersons[p] })), answerName: ans, valsByName: V }));
    });
  }
  function genStepTransferMost(R, lv, k, pol) {
    const combo = R.coin() ? 0 : 1, when = R.coin() ? 'before' : 'after';
    return retry(() => {
      const sc = transferScene(R, k, lv);
      need(new Set(sc.after).size === k);
      const f = pol === 'up' ? Math.max : Math.min;
      const bI = sc.vals.indexOf(f(...sc.vals)), aI = sc.after.indexOf(f(...sc.after));
      need(bI !== aI);
      const role = i => (i === sc.gi ? 'giv' : i === sc.ri ? 'rec' : 'by');
      const want = pol === 'up' ? (combo === 0 ? ['by', 'rec'] : ['giv', 'by']) : (combo === 0 ? ['by', 'giv'] : ['rec', 'by']);
      need(role(bI) === want[0] && role(aI) === want[1]);
      sc.step = 'transfer';
      const ansI = when === 'before' ? bI : aI, ans = sc.ps[ansI].full;
      const B = Object.fromEntries(sc.ps.map((p, i) => [p.full, sc.vals[i]])), A = Object.fromEntries(sc.ps.map((p, i) => [p.full, sc.after[i]])), keys = Object.keys(A);
      const cur = when === 'before' ? B : A, other = when === 'before' ? A : B;
      const cf = [['W16', argext(other, keys, pol)]];
      if (when === 'after') { const rv = sc.vals.slice(); rv[sc.gi] += sc.n; rv[sc.ri] -= sc.n; cf.push(['W4', argext(Object.fromEntries(sc.ps.map((p, i) => [p.full, rv[i]])), keys, pol)]); }
      cf.push(['W7', argext(cur, keys, pol === 'up' ? 'down' : 'up')]);
      const types = personTypes(keys, ans, cf, k);
      return finalize(R, baseItem('step_transfer_most', lv, sc, { kind: 'person', step: true, polarity: pol, time: when, rolePair: want.join('-'), qToks: qPol(R, 'most', pol, sc, when), optList: keys.map(p => ({ label: p, t: p === ans ? 'correct' : types[p] })), answerName: ans, valsByName: cur }));
    });
  }

  function oneNameClauses(it) {
    const out = [];
    it.sents.forEach((s, si) => {
      if (s.role === 'intro' || s.ev) return;
      const txt = s.toks.join(' ');
      const clauses = txt.split('、');
      clauses.forEach((c, ci) => { const names = it.persons.filter(p => c.includes(p.full)).length; if (names === 1 && new RegExp('\\d+' + it.obj.u).test(c)) out.push([si, ci]); });
    });
    return out;
  }
  function addAttr(R, it) {
    const p = R.pick(it.persons); const age = R.coin(); const v = age ? R.ri(5, 9) : R.ri(1, 6); const pre = age ? v + 'さいの' : v + 'ねんせいの';
    for (const s of it.sents) { const i = s.toks.findIndex(t => t.startsWith(p.full)); if (i >= 0) { s.toks.splice(i, 0, pre); it.noise = { kind: 'attr', v, person: p.full, attrKind: age ? 'age' : 'grade' }; it.modifiers.push('attr_noise'); return it; } }
    throw new Redraw();
  }
  function addObject(R, it) {
    const sl = oneNameClauses(it); if (!sl.length) return addAttr(R, it);
    const [si] = R.pick(sl); const s = it.sents[si];
    const ni = s.toks.findIndex(t => new RegExp('^\\d+' + it.obj.u).test(t)); if (ni < 0) return addAttr(R, it);
    const same = it.obj.u === 'こ' ? R.coin(2 / 3) : false;
    const o = same ? R.pick(OTHER.slice(0, 2)) : OTHER[2]; const M = R.ri(1, 10);
    const otherFirst = R.coin();
    const ntok = s.toks[ni], comma = ntok.endsWith('、') ? '、' : '', bare = ntok.replace(/、$/, '');
    const ins = otherFirst ? [o.name + 'を', M + o.u + 'と', bare + comma] : [bare + 'と', o.name + 'を', M + o.u + comma];
    const before = s.toks.slice(0, ni), after = s.toks.slice(ni + 1);
    s.toks = before.concat(ins, after);
    it.noise = { kind: 'object', v: M, other: o.name, otherUnit: o.u, otherFirst, owner: s.owner };
    it.modifiers.push('object_noise'); it.scene.objNoise = true;
    return it;
  }
  function addPronoun(R, it) {
    const cand = it.sents.map((s, i) => [s, i]).filter(([s]) => !s.ev && s.role !== 'intro' && s.toks.length && it.persons.filter(p => s.toks.join(' ').includes(p.full)).length === 1 && it.persons.some(p => s.toks[0] === p.full + 'は') && s.num !== null && s.num !== undefined);
    if (!cand.length) return addAttr(R, it);
    const [s, i] = R.pick(cand); const p = it.persons.find(q => s.toks[0] === q.full + 'は');
    const prevNamed = it.sents.slice(0, i).flatMap(x => it.persons.filter(q => x.toks.join(' ').includes(q.full)).map(q => q.full));
    const alt = prevNamed.filter(n => n !== p.full).pop() || null;
    const come = S(['そこへ', p.full + 'が', 'きました'], 'pron', { role: 'state' });
    const rep = Object.assign({}, s, { toks: ['その子は'].concat(s.toks.slice(1)), pronounRef: p.full });
    it.sents.splice(i, 1, come, rep);
    it.noise = { kind: 'pronoun', ref: p.full, alt };
    it.modifiers.push('pronoun');
    return it;
  }
  function applyNoiseTypes(it) {
    if (!it.noise) return;
    if (it.kind === 'number' && (it.noise.kind === 'attr' || it.noise.kind === 'object')) {
      const nv = it.noise.v; let w14 = null;
      if (it.pattern === 'transfer_num') { const sc = it.scene; w14 = it.askedRole === 'giver' ? nv - sc.n : it.askedRole === 'receiver' ? nv + sc.n : nv; }
      if (it.pattern === 'rel_num') { const sc = it.scene; w14 = nv + sc.s1 * sc.d1; }
      if (w14 !== null) {
        const i5 = it.optionTypes.indexOf('W5');
        const vals = it.options.map(Number);
        if (i5 >= 0 && w14 >= 1 && w14 <= 20 && !vals.some((v, j) => j !== i5 && v === w14)) { it.options[i5] = String(w14); it.optionTypes[i5] = 'W14'; }
      }
    }
    if (it.kind === 'person' && it.valsByName) {
      const keys = Object.keys(it.valsByName), pol = it.polarity;
      if (!pol) return;
      for (let j = 0; j < it.options.length; j++) {
        const p = it.options[j]; if (it.optionTypes[j] === 'correct') continue;
        const cur = it.optionTypes[j];
        const rank = t => (it.pattern.startsWith('split') || it.pattern === 'step_split_transfer_most' ? ['W16', 'W4', 'W17', 'W10', 'W7', 'W15', 'W14', 'W1', 'W18'] : ['W16', 'W4', 'W7', 'W9', 'W15', 'W14', 'W21', 'W1', 'W18']).indexOf(t);
        let cand = null;
        if (it.noise.kind === 'pronoun' && it.noise.alt) { const v = Object.assign({}, it.valsByName); v[it.noise.alt] = v[it.noise.ref]; delete v[it.noise.ref]; if (argext(v, Object.keys(v), pol) === p) cand = 'W15'; }
        if ((it.noise.kind === 'attr' || it.noise.kind === 'object') && !cand) {
          const holder = it.noise.kind === 'attr' ? it.noise.person : it.noise.owner;
          if (holder && keys.includes(holder)) {
            const v = Object.assign({}, it.valsByName);
            if (it.pattern.startsWith('split') && it.scene.known.map(i => it.scene.ps[i].full).includes(holder)) {
              v[holder] = it.noise.v; const unkN = it.scene.ps[it.scene.unk].full; const s = keys.filter(q => q !== unkN).reduce((a, q) => a + v[q], 0); v[unkN] = it.scene.T - s;
            } else v[holder] = it.noise.v;
            if (argext(v, keys, pol) === p) cand = 'W14';
          }
        }
        if (cand && rank(cand) < rank(cur)) it.optionTypes[j] = cand;
      }
    }
  }

  function assemble(R, it, lv, opts) {
    const sc = it.scene;
    let body;
    if (sc.structure === 'have') body = sc.body.slice();
    else if (sc.structure === 'split') body = opts.clauseSwap ? sc.knownS.concat(sc.total) : sc.total.concat(sc.knownS);
    else if (sc.structure === 'transfer') body = opts.clauseSwap ? [sc.ev].concat(sc.start) : sc.start.concat([sc.ev]);
    else if (sc.structure === 'relation') body = opts.clauseSwap ? sc.rels.concat(sc.base) : sc.base.concat(sc.rels);
    if (sc.step === 'split') body = sc.total.concat(sc.knownS, [sc.ev]);
    const intro = R.coin(0.6);
    it.sents = (intro ? [introSent(R, sc.ps)] : []).concat(body).map(s => Object.assign({}, s, { toks: s.toks.slice() }));
    if (intro) it.modifiers.push('intro');
    if (opts.qFirst) { it.qFirst = true; it.modifiers.push('q_first'); }
    if (opts.clauseSwap) it.modifiers.push('clause_swap');
    if (sc.wordSwap) it.modifiers.push('word_swap');
    return it;
  }
  function render(it) {
    it.S = it.sents;
    it.sents = it.S.map(s => { const a = s.toks.slice(); a.ev = s.ev; return a; });
    const body = it.S.map(s => s.toks.join(' ').replace(/、 /g, '、')).join('。') + '。';
    it.q = it.qToks;
    if (it.qFirst) it.text = qFirstText(it.qToks) + body; else it.text = body + it.qToks.join(' ') + '。';
    return it;
  }
  function qFirstText(qt) {
    const j = qt.join(' ');
    return j.replace(/ですか$/, 'でしょう') + '。';
  }

  const WAZA = [
    ['wz_hito', 'ひとりずつ「だれが いくつ」と いいなおす', p => /^have_/.test(p) || p === 'split_part' || p === 'rel_card'],
    ['wz_zenbu', 'わけたら、ひとりぶんは ぜんぶより すくない', p => ['split_num', 'split_part', 'split_who', 'split_most'].includes(p)],
    ['wz_modosu', 'ひとりぶんを ぜんぶ たすと、もとの かずに もどる', p => ['split_num', 'split_used', 'step_split_transfer_card', 'step_split_transfer_most'].includes(p)],
    ['wz_ageru', 'あげた ひとは へる。もらった ひとは ふえる', p => /^transfer_/.test(p)],
    ['wz_yajirushi', 'だれから だれへ うごいたか、やじるしで おもいうかべる', p => ['transfer_who', 'transfer_change', 'transfer_card', 'step_transfer_most'].includes(p)],
    ['wz_soto', 'かかわらない ひとの かずは そのまま', (p, it) => ['transfer_same', 'transfer_used'].includes(p) || (p === 'transfer_card' && it.k >= 3)],
    ['wz_yori', '「〜より」が ついた ひとと くらべる', p => /^rel_/.test(p)],
    ['wz_saigo', 'さいごに、きかれている ことを もういちど よむ', (p, it) => true],
    ['wz_kikareta', 'きかれている ものの かずだけを つかう', (p, it) => it.modifiers.includes('attr_noise') || it.modifiers.includes('object_noise') || ['split_used', 'transfer_used'].includes(p)],
    ['wz_sonoko', '「その子」は すぐ まえに でてきた ひと', (p, it) => it.modifiers.includes('pronoun')],
    ['wz_junban', 'まえの ばめんを つくってから、つぎの ばめんへ', p => /^step_/.test(p)],
  ];
  const MODWAZA = ['wz_saigo', 'wz_kikareta', 'wz_sonoko'];
  function waza(it) {
    const rows = WAZA.filter(r => r[2](it.pattern, it));
    const modRows = rows.filter(r => MODWAZA.includes(r[0]) && (r[0] !== 'wz_saigo' || it.modifiers.includes('q_first')));
    const sceneRows = rows.filter(r => !MODWAZA.includes(r[0]));
    const hasMod = it.modifiers.some(m => ['q_first', 'attr_noise', 'object_noise', 'pronoun'].includes(m));
    let primary, alternate;
    if (hasMod && modRows.length) { primary = modRows[0]; alternate = sceneRows[0] || rows.find(r => r !== primary); }
    else { primary = sceneRows[0] || rows[0]; alternate = sceneRows[1] || rows.find(r => r !== primary); }
    it.waza = { primary: primary[1], alternate: alternate ? alternate[1] : null, ids: [primary[0], alternate ? alternate[0] : null] };
  }
  function feedbackFor(it, t, label, idx) {
    const sc = it.scene, o = sc.obj.name;
    const rel = it.pattern.startsWith('rel');
    switch (t) {
      case 'W1': {
        if (it.kind === 'person') { const v = it.valsByName ? it.valsByName[label] : (sc.vals ? sc.vals[sc.ps.findIndex(p => p.full === label)] : null); return `${label}が もっているのは ${v}${sc.obj.u}だよ。もう いちど よもう`; }
        const owner = it.kind === 'find_all' ? sc.ps[sc.vals.indexOf(label)] : sc.ps.find((p, i) => (sc.vals || [])[i] === Number(label) && p.full !== it.askedName) || sc.ps.find(p => p.full !== it.askedName);
        return `それは ${owner ? owner.full : ''}の かずだよ。だれの かずを きかれているかな`;
      }
      case 'W2': return 'それは ぜんぶの かずだよ。ひとりぶんは ぜんぶより すくないよ';
      case 'W3': return 'わけたのに、ふえて しまったよ';
      case 'W4': return 'あげた ひとと もらった ひとが ぎゃくだよ';
      case 'W5': return rel ? 'それは くらべた ちがいの かずだよ' : 'それは うごいた かずだよ';
      case 'W6': return 'あげたり もらったり した あとの かずを みよう';
      case 'W7': return 'おおいと すくないが ぎゃくだよ';
      case 'W9': case 'W22': { const by = sc.ps.find((_, i) => i !== sc.gi && i !== sc.ri); const owner = it.kind === 'find_all' ? sc.ps[sc.vals.indexOf(label)] : null; const who = it.kind === 'person' ? label : it.kind === 'find_all' ? (owner ? owner.full : it.askedName) : (it.askedRole === 'bystander' ? it.askedName : by && by.full); return `${who}は あげても もらっても いないよ`; }
      case 'W10': return `${sc.ps[sc.unk].full}を わすれて いないかな`;
      case 'W11': return 'きかれたのは ひとりの かずだよ。たさなくて いいよ';
      case 'W12': return it.k >= 3 ? 'ぜんぶの かずから ひこう' : 'きかれたのは ひとりの かずだよ。ひかなくて いいよ';
      case 'W13': return 'おなじ かずずつ わけたとは かいて いないよ';
      case 'W14': return `${it.noise ? it.noise.v : ''}は ${o}の かずじゃ ないよ`;
      case 'W15': return `「その子」は ${it.noise ? it.noise.ref : ''}の ことだよ`;
      case 'W16': return it.time === 'before' ? 'はじめの ばめんで くらべよう' : 'うけわたしの あとの ばめんまで すすめよう';
      case 'W17': return `ぜんぶの かずは ${it.optionBoundPersons[idx]}の かずじゃ ないよ`;
      case 'W18': return 'ひとりずつ「だれが いくつ」か たしかめよう';
      case 'W19': return it.pattern === 'split_part' ? `${it.askedName}の かずは ぶんに かいて あるよ` : 'ほかの ひとの ぶんも ひこう';
      case 'W21': return '「より」の ぶんを もう ひとつ よもう';
    }
    return null;
  }
  function feedback(it) {
    if (it.kind === 'find_all') { it.feedback = it.cands.map((v, i) => it.candTypes[i] === 'correct' ? null : feedbackFor(it, it.candTypes[i], v, i)); it.feedbackMissed = feedbackFor(it, 'W18'); }
    else it.feedback = it.options.map((l, i) => it.optionTypes[i] === 'correct' ? null : feedbackFor(it, it.optionTypes[i], l, i));
  }

  function newState() { return { prev: {} }; }
  function lottery(R, st, lv, slot, cands) {
    const key = lv + ':' + slot, prev = st.prev[key];
    const pool = cands.length >= 2 && prev !== undefined ? cands.filter(c => c !== prev) : cands;
    const c = R.pick(pool.length ? pool : cands);
    return c;
  }
  const pol = R => (R.coin() ? 'up' : 'down');
  function buildItems(R, lv, st, choice) {
    const P = () => pol(R);
    const L = lv; let items;
    if (L === 1) items = [genHaveNum(R, 1), genHaveNum(R, 1), genHaveWho(R, 1), genHaveMost(R, 1, 2, P()), genHaveMost(R, 1, 2, P())];
    if (L === 2) { const c = choice.s = lottery(R, st, L, 's', ['split_num', 'split_part']); items = [genSplitNum(R, 2, 2, c === 'split_part'), genSplitWhoMost(R, 2, 2, P()), genHaveNum(R, 2), genHaveWho(R, 2), genHaveMost(R, 2, 2, P())]; }
    if (L === 3) items = [genTransferCard(R, 3, 2), genTransferNum(R, 3, 2), genTransferWho(R, 3, 2, P()), genSplitWhoMost(R, 3, 2, P()), genHaveMost(R, 3, 2, P())];
    if (L === 4) items = [genRelCard(R, 4), genRelNum(R, 4), genRelMost(R, 4, P()), genHaveMost(R, 4, 3, P()), genHaveMost(R, 4, 3, P())];
    if (L === 5) {
      const c = choice.card = lottery(R, st, L, 'card', ['rel', 'transfer']); const s = choice.s = lottery(R, st, L, 's', ['split_num', 'split_part']);
      items = [c === 'rel' ? genRelCard(R, 5) : genTransferCard(R, 5, 2), c === 'rel' ? genRelNum(R, 5) : genTransferNum(R, 5, 2), genSplitWhoMost(R, 5, 3, P()), genSplitNum(R, 5, 3, s === 'split_part'), genHaveMost(R, 5, 3, P())];
    }
    if (L === 6) items = [genTransferCard(R, 6, 3), genTransferNum(R, 6, 3), genTransferUsed(R, 6, 3), genTransferWho(R, 6, 3, P()), genTransferSame(R, 6)];
    if (L === 7) {
      const c = choice.card = lottery(R, st, L, 'card', ['transfer', 'rel']);
      const ws = () => R.coin(0.6);
      items = [c === 'rel' ? genRelCard(R, 7) : genTransferCard(R, 7, 3, { wordSwap: ws() }), c === 'rel' ? genRelNum(R, 7) : genTransferNum(R, 7, 3, { wordSwap: ws() }), genTransferUsed(R, 7, 3, { wordSwap: ws() }), genTransferWho(R, 7, 3, P(), { wordSwap: ws() }), genTransferChange(R, 7, 3, { wordSwap: ws() })];
    }
    if (L === 8) {
      const s = choice.s = lottery(R, st, L, 's', ['split_num', 'split_part']); const l = choice.last = lottery(R, st, L, 'last', ['transfer_who', 'transfer_change']);
      const k = R.coin() ? 3 : 4;
      items = [genTransferCard(R, 8, 3), genTransferNum(R, 8, 3), genSplitWhoMost(R, 8, 4, P()), genSplitNum(R, 8, 4, s === 'split_part'), l === 'transfer_who' ? genTransferWho(R, 8, k, P()) : genTransferChange(R, 8, k)];
    }
    if (L === 9) {
      const c = choice.card = lottery(R, st, L, 'card', ['transfer', 'rel']); const f = choice.fa = lottery(R, st, L, 'fa', ['split_used', 'transfer_used']);
      const K = () => (R.coin() ? 3 : 4);
      items = [c === 'rel' ? genRelCard(R, 9) : genTransferCard(R, 9, K()), null, f === 'split_used' ? genSplitUsed(R, 9, K()) : genTransferUsed(R, 9, K()), genHaveMost(R, 9, K(), P()), genSplitWhoMost(R, 9, K(), P())];
      items[1] = c === 'rel' ? genRelNum(R, 9) : genTransferNum(R, 9, K());
    }
    if (L === 10) {
      const m = choice.mod = lottery(R, st, L, 'mod', ['transfer_who', 'transfer_change', 'transfer_used']); const l = choice.last = lottery(R, st, L, 'last', ['rel_most', 'have_most']);
      const k = R.coin() ? 3 : 4, k2 = R.coin() ? 3 : 4, k3 = R.coin() ? 3 : 4;
      items = [genStepSplit(R, 10, k, 'card'), genStepSplit(R, 10, k, 'most', P()), genStepTransferMost(R, 10, k2, P()),
        m === 'transfer_who' ? genTransferWho(R, 10, k3, P()) : m === 'transfer_change' ? genTransferChange(R, 10, k3) : genTransferUsed(R, 10, k3),
        l === 'rel_most' ? genRelMost(R, 10, P()) : genHaveMost(R, 10, 4, P())];
    }
    items.forEach((it, i) => { it.slotIndex = i; });
    return items;
  }
  function modOpts(R, lv, it) {
    const swapApplicable = ['transfer', 'relation', 'split'].includes(it.scene.structure) && !it.scene.step;
    if (lv === 7) {
      let qf = R.coin(0.4), cs = swapApplicable && R.coin(0.4);
      if (!qf && !cs && !it.scene.wordSwap) { if (swapApplicable && R.coin()) cs = true; else qf = true; }
      return { qFirst: qf, clauseSwap: cs };
    }
    if (lv === 10) return { qFirst: R.coin(0.25), clauseSwap: swapApplicable && R.coin(0.25) };
    return { qFirst: false, clauseSwap: false };
  }
  function buildSet(lv, random, st) {
    if (!Number.isInteger(lv) || lv < 1 || lv > 10) throw new Error('レベルの指定が正しくありません');
    if (typeof random !== 'function') throw new Error('乱数の指定が正しくありません');
    const R = rng(random);
    if (!st) { if (!states.has(random)) states.set(random, newState()); st = states.get(random); }
    let best, bestChoice;
    for (let tries = 0; (tries < 2000 || !best) && tries < 20000; tries++) {
      try {
        const choice = {}, violations = [];
        const items = buildItems(R, lv, st, choice);
        for (const it of items) assemble(R, it, lv, modOpts(R, lv, it));
        if (lv === 9) { const ns = R.shuffle(['attr_noise', 'object_noise', 'pronoun', R.pick(['attr_noise', 'object_noise', 'pronoun']), R.pick(['attr_noise', 'object_noise', 'pronoun'])]); items.forEach((it, i) => { ({ attr_noise: addAttr, object_noise: addObject, pronoun: addPronoun })[ns[i]](R, it); }); }
        if (lv === 10) { const it = items[3]; ({ attr_noise: addAttr, object_noise: addObject, pronoun: addPronoun })[R.pick(['attr_noise', 'object_noise', 'pronoun'])](R, it); }
        if (lv === 9 && !['attr_noise', 'object_noise', 'pronoun'].every(m => items.some(it => it.modifiers.includes(m)))) violations.push('4.2: Lv9 modifiers');
        if (lv === 7 && !(['q_first', 'clause_swap', 'word_swap'].every(m => items.some(it => it.modifiers.includes(m))) && items.every(it => it.modifiers.some(m => ['q_first', 'clause_swap', 'word_swap'].includes(m))))) violations.push('4.2: Lv7 modifiers');
        for (const it of items) if (it.scene.objNoise) reAsk(R, it);
        for (const it of items) if (it.kind === 'find_all') {
          if (it.noise && it.noise.kind !== 'pronoun') it.candList.push({ v: it.noise.v, t: 'W14' });
          need(new Set(it.candList.map(c => c.v)).size === it.candList.length && it.candList.every(c => c.v >= 1 && c.v <= 20));
          finalize(R, it);
        }
        for (const it of items) { applyNoiseTypes(it); render(it); waza(it); feedback(it); it.format = FORMAT[it.kind]; it.answerKind = ANSKIND[it.kind]; it.ask = ASK[it.pattern]; it.polarity = it.polarity || null; }
        need(items.every(it => it.kind === 'find_all' || new Set(it.options).size === it.options.length));
        const sig = it => it.persons.map(p => p.full).sort().join(',') + '|' + it.S.flatMap(s => s.toks.join(' ').match(/\d+/g) || []).map(Number).sort((a, b) => a - b).join(',');
        if (new Set(items.map(sig)).size !== items.length) violations.push('4.3: repeated scene');
        setLevelRules(items, violations);
        const ci = items.findIndex(it => it.kind === 'card');
        if (ci >= 0) { const a = items[ci], b = items[ci + 1]; if (!(a.persons.map(p => p.full).sort().join() !== b.persons.map(p => p.full).sort().join() && sig(a).split('|')[1] !== sig(b).split('|')[1])) violations.push('4.3: chain scene overlap'); }
        capCheck(lv, items, violations);
        if (!best || violations.length < best.violations.length) { best = items; best.violations = violations; bestChoice = choice; }
        if (!violations.length) break;
      } catch (e) { if (!(e instanceof Redraw)) throw e; }
    }
    if (!best) throw new Error('bamen_yomitori: no set satisfies the hard rules at Lv' + lv);
    const ci = best.findIndex(it => it.kind === 'card'), seq = order(R, best, best.violations);
    seq.forEach((it, i) => { it.slot = it.slotIndex; it.position = i; it.lv = lv; it.chainId = null; });
    if (ci >= 0) { best[ci].chainId = 'ch'; best[ci + 1].chainId = 'ch'; }
    seq.forEach((it, i) => { it.scaffold = lv <= 9 && i < 2 ? scaffoldFor(R, it.scene, it.scene.step ? 'transfer' : it.scene.structure) : null; });
    Object.assign(st.prev, Object.fromEntries(Object.entries(bestChoice).map(([k, v]) => [lv + ':' + k, v])));
    const result = seq.map(finish); result.violations = best.violations;
    return result;
  }
  function reAsk(R, it) {
    const sc = it.scene;
    if (it.kind === 'person' && it.polarity && (it.pattern.endsWith('most') || it.pattern.endsWith('more') || it.pattern.endsWith('who') && it.pattern !== 'have_who' && it.pattern !== 'transfer_who')) it.qToks = qPol(R, it.pattern.endsWith('who') || it.pattern.endsWith('more') ? 'more2' : 'most', it.polarity, sc, it.time && it.pattern === 'step_transfer_most' ? it.time : (it.pattern === 'step_split_transfer_most' ? 'after' : undefined));
    if (it.kind === 'number' && it.pattern !== 'transfer_num') it.qToks = [it.askedName + 'の', sc.obj.name + 'は', 'いくつですか'];
    if (it.kind === 'card' && it.pattern !== 'rel_card') it.qToks = ['いまの', sc.obj.name + 'の', 'ようすに', 'あう', 'カードは', 'どれですか'];
    if (it.kind === 'card' && it.pattern === 'rel_card') it.qToks = [sc.obj.name + 'の', 'ようすに', 'あう', 'カードは', 'どれですか'];
    if (it.kind === 'number' && it.pattern === 'transfer_num') it.qToks = [it.askedName + 'の', sc.obj.name + 'は', 'いま', 'いくつですか'];
  }
  function setLevelRules(items, violations) {
    const ev = items.flatMap(it => it.S.filter(s => s.ev && s.giver));
    if (ev.length >= 2 && !(ev.some(s => ['t1', 't2', 't5'].includes(s.baseForm)) && ev.some(s => ['t3', 't4'].includes(s.baseForm)))) violations.push('4.11: transfer subject roles');
    const tn = items.filter(it => it.pattern === 'transfer_num' || it.pattern === 'transfer_change');
    if (tn.length >= 2 && new Set(tn.map(it => it.askedRole)).size < 2) violations.push('4.11: asked roles');
  }
  const CAPS = { h8: [9, 7, 7, 5, 7, 8, 6, 9, 8, 9], h10: [9, 7, 7, 5, 7, 8, 6, 9, 8, 9], h0: [3, 3, 3, 3, 3, 4, 3, 3, 3, 3], t6: [3, 3, 3, 3, 3, 7, 4, 5, 3, 6], c5: [3, 3, 3, 4, 3, 3, 3, 3, 3, 3] };
  function wordingIds(it) { const ids = []; for (const s of (it.S || it.sents)) { if (!s.id || s.id === 'intro' || s.id === 'pron' || s.h6tail) continue; if (/^s/.test(s.id) && s.role === 'total' && s.num === null) continue; if (s.id === 's6' && s.num === null) continue; ids.push(s.id); } return ids; }
  function capCheck(lv, items, violations) {
    const c = {}; for (const it of items) for (const id of wordingIds(it)) c[id] = (c[id] || 0) + 1;
    for (const [id, n] of Object.entries(c)) if (n > (CAPS[id] ? CAPS[id][lv - 1] : 3)) violations.push('4.5: wording cap ' + id);
  }
  function order(R, items, violations) {
    const perms = []; const idx = items.map((_, i) => i);
    const permute = (a, l) => { if (l === a.length) { perms.push(a.slice()); return; } for (let i = l; i < a.length; i++) { [a[l], a[i]] = [a[i], a[l]]; permute(a, l + 1); [a[l], a[i]] = [a[i], a[l]]; } };
    permute(idx, 0);
    const ci = items.findIndex(it => it.kind === 'card');
    const ok = perms.filter(p => p.every((x, i) => i === 0 || items[x].pattern !== items[p[i - 1]].pattern) && (ci < 0 || p.indexOf(ci + 1) === p.indexOf(ci) + 1));
    if (!ok.length) violations.push('4.7: question order');
    return R.pick(ok.length ? ok : perms).map(i => items[i]);
  }

  const states = new WeakMap();
  const PERSON_IDS = ['saito', 'yuto', 'shota', 'yukiko', 'taro', 'jiro', 'kenta', 'sota', 'koki', 'hanako', 'sakura', 'mio', 'mei', 'aoi', 'riko'];
  function finish(it) {
    const sc = it.scene;
    const seen = [];
    for (const s of it.S) for (const t of s.toks) for (const p of sc.ps) if (t.includes(p.full) && !seen.includes(p)) seen.push(p);
    for (const p of sc.ps) if (!seen.includes(p)) seen.push(p);
    it.persons = seen.map(p => {
      const i = sc.ps.indexOf(p);
      const role = sc.gi !== undefined ? roleOf(sc, i) : sc.unk !== undefined ? (i === sc.unk ? 'unknown' : 'known') : null;
      return Object.assign({}, p, { id: PERSON_IDS[FAMILY.concat(POOL).findIndex(n => n[0] === p.name)], honorific: p.hon, role });
    });
    it.object = sc.obj.id;
    it.askedRole = it.askedRole || null;
    const start = Object.fromEntries(it.persons.map(p => [p.id, sc.vals[sc.ps.findIndex(x => x.full === p.full)]]));
    it.params = { start };
    if (sc.n !== undefined) it.params.amount = sc.n;
    if (sc.T !== undefined) it.params.total = sc.T;
    if (sc.d1 !== undefined) it.params.differences = [sc.d1, sc.d2];
    const sentences = it.S.filter(s => s.id !== 'intro' && s.id !== 'pron');
    it.wordings = sentences.map(s => s.id);
    it.bindingForms = sentences.map(s => {
      if (s.id === 'h0') return 'one';
      const clauses = s.toks.join(' ').split('、');
      const cl = clauses.find(c => new RegExp('\\d+' + sc.obj.u).test(c));
      if (!cl) return 'none';
      const n = sc.ps.filter(p => cl.includes(p.full)).length;
      return n === 0 ? 'none' : n === 1 ? 'one' : 'two';
    });
    if (it.kind === 'find_all') {
      it.choices = it.cands.map(String);
      it.optionTypes = it.candTypes.slice();
      it.ansSet = it.candTypes.flatMap((t, i) => t === 'correct' ? [i] : []);
      it.ans = null;
    } else {
      it.choices = it.options.slice();
      it.ansSet = null;
      it.kind = 'choice';
    }
    return it;
  }
  function judge(problem, answer) {
    if (!problem || problem.cat !== 'kom_bamen_yomitori' || !Array.isArray(problem.choices)) throw new Error('問題の指定が正しくありません');
    if (problem.kind === 'choice') return Number.isInteger(answer) && answer >= 0 && answer < problem.choices.length && answer === problem.ans;
    if (!Array.isArray(answer) || new Set(answer).size !== answer.length || answer.some(i => !Number.isInteger(i) || i < 0 || i >= problem.choices.length)) return false;
    return answer.length === problem.ansSet.length && answer.every(i => problem.ansSet.includes(i));
  }
  global.Q4B_KOMOREBI_BAMEN_YOMITORI = { buildSet, judge, newState };
})(window);
