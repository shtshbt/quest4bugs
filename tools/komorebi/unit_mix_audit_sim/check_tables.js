'use strict';
// 検証 34 (v0.2.4): the value table of 9.2 章 and the patternId spaces of 9.4 章 match the generator one to one.
// usage: node check_tables.js <curriculum.md>        compare the doc with the generator, exit 1 on a mismatch
//        node check_tables.js --dump [samples]       print the generator's VALUES and patternId spaces in the doc's notation
const fs = require('fs');
const G = require('./gen.js');
const S = require('./sets.js');

const ORDER = { dir: ['down', 'up'], form: ['int', 'dec', 'frac', 'comp'],
  domain: ['length', 'weight', 'area', 'volume', 'time', 'speed'] };
const sortBy = (arr, ord) => arr.slice().sort((a, b) => ord.indexOf(a) - ord.indexOf(b));

// structural space of a Lv: every patternId the Lv's builder can put in a set (the trap filter only removes sets)
function spaceOf(lv, samples) {
  const [mk] = S.BUILD[lv]; const R = G.rng(77000 + lv); const ids = new Set();
  for (let i = 0; i < samples; i++) {
    let set = null; try { set = mk(R); } catch (e) { set = null; }
    if (set) for (const q of set) ids.add(S.pidOf(q));
  }
  return ids;
}
// compact notation: prefix (diagnosis. or none) + pattern . {domains} . {dirs} . {forms}
function compact(ids) {
  const groups = {};
  for (const id of ids) {
    const parts = id.split('.'); const form = parts.pop(), dir = parts.pop(), dom = parts.pop(); const head = parts.join('.');
    const k = head + '|' + dom; (groups[k] = groups[k] || new Set()).add(dir + '|' + form);
  }
  const byCombo = {};
  for (const [k, combos] of Object.entries(groups)) {
    const [head, dom] = k.split('|');
    const dirs = sortBy([...new Set([...combos].map(c => c.split('|')[0]))], ORDER.dir);
    const forms = sortBy([...new Set([...combos].map(c => c.split('|')[1]))], ORDER.form);
    const pieces = dirs.length * forms.length === combos.size ? [[dirs, forms]] : dirs.map(d => [[d], sortBy([...combos].filter(c => c.startsWith(d + '|')).map(c => c.split('|')[1]), ORDER.form)]);
    for (const [ds, fs2] of pieces) { const ck = head + '|' + ds.join(',') + '|' + fs2.join(','); (byCombo[ck] = byCombo[ck] || []).push(dom); }
  }
  const br = a => (a.length === 1 ? a[0] : '{' + a.join(', ') + '}');
  return Object.entries(byCombo).map(([ck, doms]) => { const [head, ds, fs2] = ck.split('|'); return `${head}.${br(sortBy(doms, ORDER.domain))}.${br(ds.split(','))}.${br(fs2.split(','))}`; }).sort();
}
function expand(expr) {
  const m = expr.match(/\{([^{}]*)\}/); if (!m) return [expr];
  return m[1].split(',').map(x => x.trim()).flatMap(x => expand(expr.slice(0, m.index) + x + expr.slice(m.index + m[0].length)));
}
function section(md, head) { const i = md.indexOf('\n' + head); if (i < 0) throw new Error('no section ' + head); const j = md.indexOf('\n### ', i + 1); return md.slice(i, j < 0 ? undefined : j); }
const parseVal = x => (/^-?[0-9.]+$/.test(x) ? Number(x) : x);

const SAMPLES = { 10: 40000 };
if (process.argv[2] === '--dump') {
  const n = Number(process.argv[3] || 20000);
  for (const [k, v] of Object.entries(G.VALUES)) console.log(`| \`${k}\` | ${v.join('、')} |`);
  for (let lv = 1; lv <= 10; lv++) { const ids = spaceOf(lv, SAMPLES[lv] || n); console.log(`| ${lv} | ${compact(ids).map(x => '`' + x + '`').join('、')} | ${ids.size} |`); }
  process.exit(0);
}
const md = fs.readFileSync(process.argv[2], 'utf8');
let bad = 0;
const fail = m => { bad++; console.error('MISMATCH ' + m); };
// 9.2: rows "| `NAME` | (使うところ) | v1、v2、... |"
const docVals = {};
for (const line of section(md, '### 9.2').split('\n')) {
  const m = line.match(/^\| `([A-Z0-9_]+)` \|.*\| ([^|]+) \|$/); if (m) docVals[m[1]] = m[2].split('、').map(x => parseVal(x.trim()));
}
for (const [k, v] of Object.entries(G.VALUES)) {
  if (!docVals[k]) { fail(`9.2 has no row for ${k}`); continue; }
  if (JSON.stringify(docVals[k]) !== JSON.stringify(v)) fail(`9.2 ${k}: doc ${docVals[k].join(',')} / generator ${v.join(',')}`);
}
for (const k of Object.keys(docVals)) if (!G.VALUES[k]) fail(`9.2 row ${k} is not a generator constant`);
// 9.4: rows "| Lv | `expr`、`expr` | size |"
for (const line of section(md, '### 9.4').split('\n')) {
  const m = line.match(/^\| (\d+) \| (.*) \| (\d+) \|$/); if (!m) continue;
  const lv = Number(m[1]); const docIds = new Set([...m[2].matchAll(/`([^`]+)`/g)].flatMap(x => expand(x[1])));
  const gen = spaceOf(lv, SAMPLES[lv] || 20000);
  for (const id of gen) if (!docIds.has(id)) fail(`9.4 Lv${lv}: generator makes ${id}, not in the table`);
  for (const id of docIds) if (!gen.has(id)) fail(`9.4 Lv${lv}: table has ${id}, the generator does not make it`);
  if (docIds.size !== Number(m[3])) fail(`9.4 Lv${lv}: size column ${m[3]}, the listed ids are ${docIds.size}`);
}
console.error(bad ? `${bad} mismatches` : 'check_tables: 9.2 and 9.4 match the generator');
process.exit(bad ? 1 : 0);
