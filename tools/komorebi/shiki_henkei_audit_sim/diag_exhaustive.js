// Exhaustive check that the error diagnosis tables (3.4 and 3.5, v0.3.3) are deterministic:
// every assembly that the cards and frame can make, for every problem allowed by 3.10, falls into
// exactly one cell of the table, and the cell is 'correct' exactly when judge() accepts it.
// v0.3.4: negative_step is its own cell. Every assembly falls into exactly one of correct,
// negative_step and the error rows, and for negative_step the numbers X and Y of the explanation
// (the running value and the subtracted number at the first step that goes below 0) are recorded.
// v0.3.7: Lv1 (number input) is diagnosed by the ordered rules of 3.5.0, and every cell of every
// table resolves to exactly one explanation sentence of chapter 8 (keyed by error type and problem type).
// Usage: node diag_exhaustive.js   (exit 1 on any violation)
'use strict';
function run(G = require('./gen3.js'), check = () => {}) {
const B = G.B;
let bad = 0;
const fail = (msg) => { if (bad < 20) console.error('VIOLATION', msg); bad++; };
// first subtraction that goes below 0, read left to right: [X, Y] (X is the running value)
function firstNegative(slots) {
  let v = null, op = '+';
  for (const s of slots) {
    if (s === '+' || s === '-') { op = s; continue; }
    const n = Number(s);
    if (v !== null && op === '-' && v - n < 0) return [v, n];
    v = v === null ? n : (op === '+' ? v + n : v - n);
  }
  return null;
}
function perms(arr) { if (arr.length <= 1) return [arr]; const out = []; arr.forEach((x, i) => { for (const r of perms(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([x].concat(r)); }); return out; }

// ---- 2-number (3.5.1): cells are the columns y-x, x-y, y+x / x+y ----
function twoNumCells(type, x, y, slots) {
  const [n1, op, n2] = [Number(slots[0]), slots[1], Number(slots[2])];
  const cells = [];
  if (op === '-' && n1 === y && n2 === x) cells.push('y-x');
  if (op === '-' && n1 === x && n2 === y) cells.push('x-y');
  if (op === '+') cells.push('y+x,x+y');
  return cells;
}
const TWO = {
  T_AF: { 'y-x': 'correct', 'x-y': 'order_reversal', 'y+x,x+y': 'keep_op' },
  T_SB: { 'y-x': 'correct', 'x-y': 'order_reversal', 'y+x,x+y': 'invert_overapply' },
  T_SF_dbig: { 'y-x': 'keep_op', 'x-y': 'minuend_swap', 'y+x,x+y': 'correct' },
  T_SF_abig: { 'y-x': 'minuend_swap', 'x-y': 'keep_op', 'y+x,x+y': 'correct' },
};
let n2 = 0;
for (let x = 2; x <= 100; x++) for (let y = x + 2; y <= 100; y++) {
  if (y === 2 * x || x + y > 100) continue;
  const probs = [
    ['T_AF', [[y, 1], [x, -1]], TWO.T_AF], ['T_SB', [[y, 1], [x, -1]], TWO.T_SB],
    ['T_SF', [[x, 1], [y, 1]], TWO.T_SF_dbig], ['T_SF', [[y, 1], [x, 1]], TWO.T_SF_abig],
  ];
  for (const [type, ans, table] of probs) {
    const a = type === 'T_SF' ? ans[0][0] : type === 'T_AF' ? x : y;
    const p = { fam: '2num', type, nums: [x, y], answerTerms: ans, box: ans.reduce((v, [n, s]) => v + n * s, 0), abc: { a, d: a === x ? y : x, x, y } };
    for (const [u, v] of [[x, y], [y, x]]) for (const op of ['+', '-']) {
      const slots = [String(u), op, String(v)];
      const cells = twoNumCells(type, x, y, slots); n2++;
      if (cells.length !== 1) { fail(`2num ${type} ${slots.join('')} cells=${cells}`); continue; }
      const ok = G.judge(p, slots);
      check(p, slots, table[cells[0]] === 'correct' ? [] : [table[cells[0]]]);
      if (table[cells[0]] === 'correct' && !G.lrOK(slots)) fail(`2num ${type} ${slots.join('')} correct cell goes below 0`);
      if ((table[cells[0]] === 'correct') !== ok) fail(`2num ${type} ${slots.join('')} judge=${ok} cell=${table[cells[0]]}`);
    }
  }
}

// ---- both sides (3.5.2): rows are the 7 signed-term sets (5 rows), plus negative_step ----
const ROWS = (a, b, c) => [
  ['bc-a', [[b, 1], [c, 1], [a, -1]]], ['bc+a', [[b, 1], [c, 1], [a, 1]]], ['a-b-c', [[a, 1], [b, -1], [c, -1]]],
  ['b-c-a', [[b, 1], [c, -1], [a, -1]]], ['b-c-a', [[c, 1], [b, -1], [a, -1]]],
  ['b-c+a', [[a, 1], [b, 1], [c, -1]]], ['b-c+a', [[a, 1], [b, -1], [c, 1]]],
];
const key = ts => ts.map(([n, s]) => `${s > 0 ? '+' : '-'}${n}`).sort().join(',');
const CORRECT_ROW = { T_AB: 'bc-a', T_AF: 'bc-a', T_SF: 'bc+a', T_SB: 'a-b-c' };
G.setOpt({ sumcap: true, near: true, p1redraw: true, sfp: 0.5 });
let nb = 0, nNeg = 0, negXfirst = 0, negYa = 0; const negForms = {};
for (const type of ['T_AB', 'T_AF', 'T_SB', 'T_SF']) for (const sfBig of (type === 'T_SF' ? [false, true] : [false]))
  for (let a = 20; a <= 45; a++) for (let b = 2; b < a; b++) for (let c = 2; c < a; c++) {
    if (!G.bothValid(type, a, b, c, sfBig)) continue;
    const p = G.bothProb(type, 'normal', a, b, c);
    for (const nums of perms([a, b, c])) for (const o1 of ['+', '-']) for (const o2 of ['+', '-']) {
      const slots = [String(nums[0]), o1, String(nums[1]), o2, String(nums[2])]; nb++;
      const k = key(G.terms(slots));
      const rows = ROWS(a, b, c).filter(([, ts]) => key(ts) === k).map(([r]) => r);
      if (rows.length !== 1) { fail(`both ${type} ${slots.join('')} rows=${rows}`); continue; }
      const isCorrectSet = rows[0] === CORRECT_ROW[type];
      // cells are mutually exclusive by construction; count how many conditions hold to confirm
      const conds = [isCorrectSet && G.lrOK(slots), isCorrectSet && !G.lrOK(slots), !isCorrectSet];
      if (conds.filter(Boolean).length !== 1) { fail(`both ${type} ${slots.join('')} conds=${conds}`); continue; }
      const cell = conds[0] ? 'correct' : conds[1] ? 'negative_step' : 'error_row';
      if ((cell === 'correct') !== G.judge(p, slots)) fail(`both ${type} ${slots.join('')} judge mismatch`);
      check(p, slots, cell === 'correct' ? [] : cell === 'negative_step' ? ['negative_step'] : BOTH_TABLE[rows[0]][type], cell === 'negative_step' ? firstNegative(slots) : null);
      if (cell === 'negative_step') {
        nNeg++;
        const xy = firstNegative(slots);
        if (!xy) { fail(`both ${type} ${slots.join('')} negative_step without a negative step`); continue; }
        if (xy[0] === Number(slots[0])) negXfirst++;
        if (xy[1] === a) negYa++;
        const form = slots.map(t => t === String(a) ? 'a' : (t === '+' || t === '-') ? t : 'x').join('');
        negForms[`${type} ${form}`] = (negForms[`${type} ${form}`] || 0) + 1;
      }
    }
  }

// ---- story (3.4 and 3.5.3, v0.3.3) ----
function evalStory(slots, box) {
  const v = s => (s === B ? box : Number(s));
  const left = slots[1] === '+' ? v(slots[0]) + v(slots[2]) : v(slots[0]) - v(slots[2]);
  return left >= 0 && left === v(slots[4]);
}
function storyCells(p, slots) {
  const ans = p.answerSlots, cells = [];
  const exact = slots.join('') === ans.join('');
  const holds = evalStory(slots, p.box);
  const boxRight = slots[4] === B, ansBoxRight = ans[4] === B;
  const commuted = ans[1] === '+' && slots[1] === '+' && slots[0] === ans[2] && slots[2] === ans[0] && slots[4] === ans[4];
  if (exact) cells.push('correct');
  if (!exact && holds && boxRight && !ansBoxRight) cells.push('true_solved');
  if (!exact && holds && commuted) cells.push('true_commuted');
  if (!exact && holds && !(boxRight && !ansBoxRight) && !commuted) cells.push('true_reordered');
  if (!exact && !holds) {
    const tags = [];
    if (slots[1] !== ans[1]) tags.push('op_flip');
    if (slots.indexOf(B) !== ans.indexOf(B)) tags.push('unknown_misplaced');
    const ks = slots.filter((s, i) => i % 2 === 0 && s !== B), ka = ans.filter((s, i) => i % 2 === 0 && s !== B);
    if (ks.join() !== ka.join()) tags.push('known_swap');
    if (tags.length === 0) fail(`story no tag ${p.patternId} ${slots.join('')}`);
    cells.push(tags.join('+'));
  }
  return cells;
}
let ns = 0; const tally = {};
for (const role of ['start', 'change', 'result']) for (const dir of ['inc', 'dec'])
  for (let K1 = 2; K1 <= 30; K1++) for (let K2 = 2; K2 <= 30; K2++) {
    const p = G.storyProb(role, dir, K1, K2, 'candy');
    if (!p) continue;
    for (const pos of perms([String(K1), String(K2), B])) for (const op of ['+', '-']) {
      const slots = [pos[0], op, pos[1], '=', pos[2]]; ns++;
      const cells = storyCells(p, slots);
      if (cells.length !== 1) { fail(`story ${p.patternId} ${slots.join('')} cells=${cells}`); continue; }
      if ((cells[0] === 'correct') !== G.judge(p, slots)) fail(`story ${p.patternId} ${slots.join('')} judge mismatch`);
      check(p, slots, cells[0] === 'correct' ? [] : cells[0].split('+'));
      const t = `${p.patternId} ${cells[0]}`; tally[t] = (tally[t] || 0) + 1;
    }
  }
// ---- Lv1 (3.5.0, v0.3.7): ordered rules, first match wins; overlaps are counted ----
const LV1_RULES = [
  ['correct', (a, b, add, v) => v === (add ? a + b : a - b)],
  ['copy_visible', (a, b, add, v) => v === a || v === b],
  ['ignore_op', (a, b, add, v) => v === (add ? Math.abs(a - b) : a + b)],
  ['place_value', (a, b, add, v) => b <= 9 && v === (add ? a + 10 * b : a - 10 * b)],
  ['digit_slip', (a, b, add, v) => { const t = add ? a + b : a - b; if (v > 99 || v === t) return false; const dt = Math.floor(v / 10) !== Math.floor(t / 10), d1 = v % 10 !== t % 10; return dt !== d1; }],
  ['calc_other', () => true],
];
let n1 = 0; const lv1Tally = {}, lv1Overlap = {};
for (const add of [true, false]) for (let a = 11; a <= 89; a++) for (let b = 2; b <= 89; b++) {
  if (b === 10) continue;
  const ad = [Math.floor(a / 10), a % 10], bd = [Math.floor(b / 10), b % 10];
  if (add && !(ad[0] + bd[0] <= 9 && ad[1] + bd[1] <= 9)) continue;
  if (!add && !(ad[0] >= bd[0] && ad[1] >= bd[1])) continue;
  const t = add ? a + b : a - b; if (t < 2 || t > 99) continue;
  const p = { fam: 'intro', nums: [a, b], ans: t, patternId: add ? 'solve_add_r' : 'solve_sub_r' };
  for (let v = 0; v <= 999; v++) {
    n1++;
    const hits = LV1_RULES.filter(([, f]) => f(a, b, add, v)).map(([k]) => k);
    const cell = hits[0];
    check(p, v, cell === 'correct' ? [] : [cell]);
    if ((cell === 'correct') !== (v === t)) fail(`lv1 ${a}${add ? '+' : '-'}${b} v=${v} correct mismatch`);
    lv1Tally[cell] = (lv1Tally[cell] || 0) + 1;
    const real = hits.filter(k => k !== 'calc_other');
    if (real.length > 1) { const k = real.join('>'); lv1Overlap[k] = (lv1Overlap[k] || 0) + 1; }
  }
}

// ---- explanations (chapter 8, v0.3.7): every cell resolves to exactly one sentence key ----
const EXPL = new Set([
  'ignore_op|add', 'ignore_op|sub', 'copy_visible|*', 'place_value|add', 'place_value|sub', 'digit_slip|*', 'calc_other|*',
  'keep_op|2num:T_AF', 'keep_op|2num:T_SF', 'invert_overapply|2num:T_SB', 'minuend_swap|2num:T_SF', 'order_reversal|2num:T_AF,T_SB',
  'keep_op|both:T_AB,T_AF', 'keep_op|both:T_SF', 'invert_overapply|both:T_SB', 'minuend_swap|both:T_AB,T_AF', 'minuend_swap|both:T_SF',
  'order_reversal|both:T_SB', 'flip_other_side|both:*', 'negative_step|both:T_AB,T_AF',
  'op_flip|inc', 'op_flip|dec', 'unknown_misplaced|*', 'known_swap|*', 'true_commuted|*', 'true_solved|*', 'true_reordered|*',
]);
const PRIORITY = ['flip_other_side', 'op_flip', 'unknown_misplaced', 'known_swap', 'keep_op', 'order_reversal', 'invert_overapply', 'minuend_swap'];
const lead = tags => PRIORITY.find(t => tags.includes(t)) || tags[0];
function keyFor(fam, type, tag) {
  const cands = [...EXPL].filter(k => { const [t, ctx] = k.split('|'); if (t !== tag) return false; if (ctx === '*') return true;
    const [f, ts] = ctx.includes(':') ? ctx.split(':') : [ctx, null]; if (ts === null) return f === type; return f === fam && (ts === '*' || ts.split(',').includes(type)); });
  return cands;
}
const used = new Set();
function checkKey(fam, type, tags, what) {
  const k = keyFor(fam, type, lead(tags));
  if (k.length !== 1) fail(`explanation ${what}: ${k.length} keys for ${lead(tags)} (${fam} ${type})`); else used.add(k[0]);
}
for (const [variant, table] of Object.entries(TWO)) for (const cell of Object.values(table)) if (cell !== 'correct') checkKey('2num', variant.startsWith('T_SF') ? 'T_SF' : variant, [cell], `2num ${variant}`);
for (const row of Object.values(BOTH_TABLE)) for (const [type, tags] of Object.entries(row)) if (tags.length) checkKey('both', type, tags, `both ${type}`);
checkKey('both', 'T_AB', ['negative_step'], 'both negative_step'); checkKey('both', 'T_AF', ['negative_step'], 'both negative_step');
for (const t of Object.keys(tally)) { const [pid, cell] = t.split(' '); if (cell === 'correct') continue; checkKey('story', pid.includes('_inc_') ? 'inc' : 'dec', cell.split('+'), `story ${pid}`); }
for (const cell of Object.keys(lv1Tally)) if (cell !== 'correct') { for (const op of ['add', 'sub']) checkKey('lv1', op, [cell], `lv1 ${cell}`); }
for (const k of EXPL) if (!used.has(k)) fail(`explanation key never used: ${k}`);

console.log(`Lv1 inputs ${n1}`, JSON.stringify(lv1Tally), 'overlaps (first match wins)', JSON.stringify(lv1Overlap));
console.log(`explanation keys used ${used.size} / ${EXPL.size}`);
console.log(`2num assemblies ${n2}, both assemblies ${nb}, story assemblies ${ns}, violations ${bad}`);
console.log(`negative_step ${nNeg} (X is the first card: ${negXfirst}, Y is a: ${negYa})`, JSON.stringify(negForms));
const per = {};
for (const [t, n] of Object.entries(tally)) { const [pid, cell] = t.split(' '); if (cell.startsWith('true_') || cell === 'correct') (per[pid] = per[pid] || []).push(`${cell} ${n}`); }
for (const pid of Object.keys(per).sort()) console.log(pid, per[pid].join(', '));
return { bad, n1, n2, nb, ns, nNeg };
}
const BOTH_TABLE = {
  'bc-a': { T_AB: [], T_AF: [], T_SF: ['keep_op'], T_SB: ['order_reversal'] },
  'bc+a': { T_AB: ['keep_op'], T_AF: ['keep_op'], T_SF: [], T_SB: ['invert_overapply'] },
  'a-b-c': { T_AB: ['minuend_swap'], T_AF: ['minuend_swap'], T_SF: ['minuend_swap'], T_SB: [] },
  'b-c-a': { T_AB: ['flip_other_side'], T_AF: ['flip_other_side'], T_SF: ['flip_other_side', 'keep_op'], T_SB: ['flip_other_side', 'order_reversal'] },
  'b-c+a': { T_AB: ['flip_other_side', 'keep_op'], T_AF: ['flip_other_side', 'keep_op'], T_SF: ['flip_other_side'], T_SB: ['flip_other_side'] },
};
module.exports = { run };
if (require.main === module) process.exitCode = run().bad ? 1 : 0;
