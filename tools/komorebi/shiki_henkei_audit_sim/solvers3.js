// Adversaries for v0.3 (assemble). They see the text, the shuffled number cards,
// the fixed operator cards, and the revealed correct assembly of earlier problems.
'use strict';
const { judge, B } = require('./gen3.js');

function parse(p) {
  const [L, R] = p.text.split('=');
  const boxSide = L.includes(B) ? L : R, other = L.includes(B) ? R : L;
  const front = boxSide.startsWith(B);
  const op = front ? boxSide[1] : boxSide[boxSide.indexOf(B) - 1];
  const a = Number(boxSide.match(/\d+/)[0]);
  const on = other.match(/\d+/g).map(Number);
  return { front, op, a, other: on, rev: !L.includes(B), isBoth: on.length === 2 };
}
// build an assembly from an answer class
function build(p, cls) {
  const x = parse(p);
  if (!x.isBoth) {
    const L = Math.max(x.a, x.other[0]), S = Math.min(x.a, x.other[0]);
    return cls === 'sum' ? [L, '+', S].map(String) : [L, '-', S].map(String);
  }
  const [b, c] = x.other, a = x.a;
  if (cls === 'amr') return [a, '-', b, '-', c].map(String);
  if (cls === 'Rpa') return [b, '+', c, '+', a].map(String);
  return [b, '+', c, '-', a].map(String);
}
function classOf(p) {
  if (p.fam === '2num') return p.answerTerms.every(([, s]) => s > 0) ? 'sum' : 'diff';
  const neg = p.answerTerms.filter(([, s]) => s < 0).length;
  return neg === 2 ? 'amr' : neg === 0 ? 'Rpa' : 'Rma';
}
// ---- stage A (Lv2-9): one visible cue, one rule for all 5 problems ----
const sortD = arr => arr.slice().sort((u, v) => v - u);
const STAGE_A = {
  A1_biggest_minus_rest: p => { const n = sortD(parse(p).isBoth ? [parse(p).a, ...parse(p).other] : [parse(p).a, parse(p).other[0]]); return n.length === 2 ? [n[0], '-', n[1]] : [n[0], '-', n[1], '-', n[2]]; },
  A1r_other_minus_neighbor: p => { const x = parse(p); return x.isBoth ? [x.other[0], '+', x.other[1], '-', x.a] : [x.other[0], '-', x.a]; },
  A2_always_add: p => { const x = parse(p); return x.isBoth ? [x.other[0], '+', x.other[1], '+', x.a] : [x.a, '+', x.other[0]]; },
  A3_keep_visible_op: p => { const x = parse(p); const nums = p.text.match(/\d+/g); return x.isBoth ? [nums[0], x.op, nums[1], '+', nums[2]] : [nums[0], x.op, nums[1]]; },
  A4_inverse_op: p => build(p, parse(p).isBoth ? (parse(p).op === '+' ? 'Rma' : 'Rpa') : (parse(p).op === '+' ? 'diff' : 'sum')),
  A5_front_add: p => build(p, parse(p).isBoth ? (parse(p).front ? 'Rpa' : 'Rma') : (parse(p).front ? 'sum' : 'diff')),
  A6_front_sub: p => build(p, parse(p).isBoth ? (parse(p).front ? 'Rma' : 'Rpa') : (parse(p).front ? 'diff' : 'sum')),
  A7_replace_box: p => { const x = parse(p); const Rt = x.isBoth ? [x.other[0], '+', x.other[1]] : [x.other[0]]; return x.front ? [...Rt, x.op, x.a] : [x.a, x.op, ...Rt]; },
  A8_card_order: p => { const c = p.numberCards; return c.length === 2 ? [c[0], '+', c[1]] : [c[0], '+', c[1], '+', c[2]]; },
  A8m_card_order_minus: p => { const c = p.numberCards; return c.length === 2 ? [c[0], '-', c[1]] : [c[0], '-', c[1], '-', c[2]]; },
  A9_small_first_minus: p => { const n = sortD(parse(p).isBoth ? [parse(p).a, ...parse(p).other] : [parse(p).a, parse(p).other[0]]).reverse(); return n.length === 2 ? [n[0], '-', n[1]] : [n[0], '-', n[1], '-', n[2]]; },
  A11_biggest_first_then_text: p => { const x = parse(p); if (!x.isBoth) return build(p, 'diff'); return [x.a, x.op === '+' ? '-' : '+', x.other[0], '+', x.other[1]]; },
};
function runA(name, set) {
  let ok = 0;
  for (const p of set) if (judge(p, STAGE_A[name](p).map(String))) ok++;
  return ok;
}
function runA10(set) { // A10: repeat previous answer class (C6)
  let ok = 0, prev = null;
  for (const p of set) { const cls = prev && ((p.fam === '2num') === (prev.fam === '2num')) ? classOf(prev) : (p.fam === '2num' ? 'diff' : 'Rma'); if (judge(p, build(p, cls))) ok++; prev = p; }
  return ok;
}
// ---- stage B: Bayes table over visible features + history ----
function feat(p, prev, which) {
  const x = parse(p); const f = [x.isBoth ? 'b' : '2'];
  for (const w of which) {
    if (w === 'op') f.push('op' + x.op);
    if (w === 'pos') f.push(x.front ? 'F' : 'K');
    if (w === 'orient') f.push(x.rev ? 'rev' : 'nor');
    if (w === 'mag') f.push(x.isBoth ? (x.a > x.other[0] + x.other[1] ? 'a>R' : 'a<R') : (x.a > x.other[0] ? 'S>' : 'S<'));
    if (w === 'size') { const s = x.isBoth ? x.a + x.other[0] + x.other[1] : x.a + x.other[0]; f.push('sz' + Math.min(5, Math.floor(s / 25))); }
    if (w === 'amax') { f.push('am' + Math.floor((x.isBoth ? x.a : Math.max(x.a, x.other[0])) / 20)); }
    if (w === 'card') { const mx = Math.max(...p.numberCards.map(Number)); f.push('c0' + (Number(p.numberCards[0]) === mx ? 'max' : 'n') + (Number(p.numberCards[0]) === x.a ? 'a' : '')); }
    if (w === 'pair' && prev && prev.fam === p.fam && p.fam === 'both') {
      const y = parse(prev);
      if (y.other.join() === x.other.join()) f.push('PR', y.a === x.a ? 'asame' : 'adiff', y.rev === x.rev ? 'osame' : 'oflip');
    }
  }
  return f.join(',');
}
function train(sets, which) {
  const tab = new Map(); const add = (k, c) => { let m = tab.get(k); if (!m) { m = {}; tab.set(k, m); } m[c] = (m[c] || 0) + 1; };
  for (const set of sets) { let h = ''; set.forEach((p, k) => { const f = feat(p, set[k - 1], which); const c = classOf(p); add(`${k}|${h}|${f}`, c); add(`F|${f}`, c); h += `[${f}:${c}]`; }); }
  return tab;
}
const argmax = m => Object.keys(m).reduce((a, b) => (m[a] >= m[b] ? a : b));
function runB(tab, set, which) {
  let ok = 0, h = '';
  set.forEach((p, k) => {
    const f = feat(p, set[k - 1], which);
    let m = tab.get(`${k}|${h}|${f}`); if (!m || Object.values(m).reduce((a, b) => a + b, 0) < 10) m = tab.get(`F|${f}`);
    if (!m) m = p.fam === '2num' ? { diff: 1 } : { Rma: 1 };
    if (judge(p, build(p, argmax(m)))) ok++;
    h += `[${f}:${classOf(p)}]`;
  });
  return ok;
}

// ---- Lv10 ----
const INC = /もらって|さいて|かって|きて/;
function storyTok(p) { return p.text.match(/\d+|□/g); }
function build10(p, role, dir) {
  const [K1, K2] = p.K.map(String); const op = dir === 'inc' ? '+' : '-';
  if (role === 'start') return [B, op, K1, '=', K2];
  if (role === 'change') return [K1, op, B, '=', K2];
  return [K1, op, K2, '=', B];
}
// visible: story numbers K1,K2 (the solver reads the digits but, in stage B tables, not where □ sits)
function visK(p) { return storyTok(p).filter(t => t !== B).map(Number); }
const STAGE_A10 = {
  Q1_box_first: p => { const [K1, K2] = visK(p).map(String); return [B, INC.test(p.text) ? '+' : '-', K1, '=', K2]; },
  Q2_box_middle: p => { const [K1, K2] = visK(p).map(String); return [K1, INC.test(p.text) ? '+' : '-', B, '=', K2]; },
  Q3_box_last: p => { const [K1, K2] = visK(p).map(String); return [K1, INC.test(p.text) ? '+' : '-', K2, '=', B]; },
  Q4_story_order_plus: p => { const t = storyTok(p); return [t[0], '+', t[1], '=', t[2]]; },
  Q5_story_order_minus: p => { const t = storyTok(p); return [t[0], '-', t[1], '=', t[2]]; },
  Q6_card_order: p => { const c = p.numberCards; return [c[0], '+', c[1], '=', c[2]]; },
  Q7_box_first_big_last: p => { const [u, v] = visK(p); return [B, INC.test(p.text) ? '+' : '-', String(Math.min(u, v)), '=', String(Math.max(u, v))]; },
  Q8_box_first_big_last_verb_free_plus: p => { const [u, v] = visK(p); return [B, '+', String(Math.min(u, v)), '=', String(Math.max(u, v))]; },
};
function feat10(p, prev, which) {
  const [K1, K2] = visK(p); const f = [];
  const inc = INC.test(p.text);
  for (const w of which) {
    if (w === 'verb') f.push(inc ? 'inc' : 'dec');
    if (w === 'kmag') f.push(K1 < K2 ? 'K<' : 'K>');
    if (w === 'ksize') f.push('ks' + (K1 + K2 > 30 ? 'H' : 'L'));
    if (w === 'card') f.push('c0' + (p.numberCards[0] === B ? 'box' : 'n'));
    if (w === 'pair' && prev) { const [P1, P2] = visK(prev); if (((P1 === K1 && P2 === K2) || (P1 === K2 && P2 === K1)) && prev.ctx === p.ctx) f.push('PR', INC.test(prev.text) === inc ? 'vsame' : 'vflip', P1 === K1 ? 'osame' : 'oswap'); }
  }
  return f.join(',');
}
const cls10 = p => `${p.role}/${p.dir}`;
function train10(sets, which) {
  const tab = new Map(); const add = (k, c) => { let m = tab.get(k); if (!m) { m = {}; tab.set(k, m); } m[c] = (m[c] || 0) + 1; };
  for (const set of sets) { let h = ''; set.forEach((p, k) => { const f = feat10(p, set[k - 1], which); const c = cls10(p); add(`${k}|${h}|${f}`, c); add(`F|${f}`, c); h += `[${f}:${c}]`; }); }
  return tab;
}
function runB10(tab, set, which) {
  let ok = 0, h = '';
  set.forEach((p, k) => {
    const f = feat10(p, set[k - 1], which);
    let m = tab.get(`${k}|${h}|${f}`); if (!m || Object.values(m).reduce((a, b) => a + b, 0) < 10) m = tab.get(`F|${f}`);
    let [role, dir] = argmax(m).split('/');
    if (which.includes('verb')) dir = INC.test(p.text) ? 'inc' : 'dec';
    if (judge(p, build10(p, role, dir))) ok++;
    h += `[${f}:${cls10(p)}]`;
  });
  return ok;
}
module.exports = { STAGE_A, runA, runA10, train, runB, STAGE_A10, train10, runB10, judge, classOf };
