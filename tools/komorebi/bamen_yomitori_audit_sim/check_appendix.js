#!/usr/bin/env node
// Checks the 50 items of 付録 A in docs/komorebi_bamen_yomitori_curriculum.md against the
// v0.5.1 name and wording rules that can be read from the text alone:
//   family name in every item (3.6), first-kana duplicates (3.6), similar pairs up to Lv6 (3.6),
//   a word between the names in every h8 (4.4.9a), a word after "X は" in every h10 (4.4.9c),
//   relation words from the 9-word pool with the honorific of X (3.6), a two-name clause in every
//   2-person text (4.4.4), per-set caps of h0 / h8 / h10 (4.5), kanji only in その子 (9.5, check 33).
//   node check_appendix.js [path-to-doc]
'use strict';
const fs = require('fs');
const path = require('path');

function checkAppendix(doc, report = () => {}) {
const FAMILY = ['さいと', 'ゆうと', 'しょうた', 'ゆきこ'];
const POOL = ['たろう', 'じろう', 'けんた', 'そうた', 'こうき', 'はなこ', 'さくら', 'みお', 'めい', 'あおい', 'りこ'];
const HON = { さいと: 'くん', ゆうと: 'くん', しょうた: 'くん', ゆきこ: 'さん', たろう: 'くん', じろう: 'くん', けんた: 'くん', そうた: 'くん', こうき: 'くん', はなこ: 'さん', さくら: 'さん', みお: 'さん', めい: 'さん', あおい: 'さん', りこ: 'さん' };
const SIMILAR = [['たろう', 'じろう'], ['けんた', 'そうた'], ['はなこ', 'りこ'], ['めい', 'あおい'], ['ゆうと', 'さいと']];
const INS = ['きょう', 'きのう', 'さっき', 'あさ'];
const REL_N = ['ともだち', 'せんぱい', 'こうはい'], REL_K = ['おにいさん', 'おとうと', 'おじいさん'], REL_S = ['おねえさん', 'いもうと', 'おばあさん'];
const CAP_H8 = [9, 7, 7, 5, 7, 8, 6, 9, 8, 9], CAP_H0 = [3, 3, 3, 3, 3, 4, 3, 3, 3, 3];
const NAMES = FAMILY.concat(POOL);
const NAME_RE = new RegExp(`(${NAMES.join('|')})(くん|さん)`, 'g');

const start = doc.indexOf('## 付録 A.');
if (start < 0) throw new Error('appendix A not found');
const appx = doc.slice(start);
const sections = [...appx.matchAll(/### A\.(\d+) Lv(\d+)\n\n```text\n([\s\S]*?)```/g)];
if (sections.length !== 10) throw new Error(`expected 10 Lv blocks, found ${sections.length}`);

const errors = [];
let itemCount = 0;
for (const [, , lvStr, block] of sections) {
  const lv = +lvStr;
  const items = [];
  for (const line of block.split('\n')) {
    if (/^\d /.test(line)) items.push({ head: line, body: [] });
    else if (/^ {2}\S/.test(line) && items.length) items[items.length - 1].body.push(line.trim());
  }
  if (items.length !== 5) errors.push(`Lv${lv}: ${items.length} items`);
  let h8 = 0, h10 = 0, h0 = 0;
  for (const it of items) {
    itemCount++;
    const tag = `Lv${lv} ${it.head.split(' ').slice(0, 2).join(' ')}`;
    const text = it.body.slice(0, -1).join(' '); // last body line is the options
    const names = [...new Set([...text.matchAll(NAME_RE)].map(m => m[1]))];
    for (const m of text.matchAll(NAME_RE)) if (HON[m[1]] !== m[2]) errors.push(`${tag}: honorific ${m[0]}`);
    if (!names.some(n => FAMILY.includes(n))) errors.push(`${tag}: no family name`);
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      if (a[0] === b[0] && !([a, b].includes('ゆうと') && [a, b].includes('ゆきこ'))) errors.push(`${tag}: first kana ${a} ${b}`);
      if (lv <= 6 && SIMILAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) errors.push(`${tag}: similar pair ${a} ${b} at Lv${lv}`);
    }
    // h8: "X は 〈ことば〉 Y の となりで"; a bare "X は Y の となりで" is a violation
    // a t6 frame ("X は Z の となりで R に …") is followed by a name with に or から and is not an h8
    const notT6 = '(?!\\S+(?:くん|さん)(?:に|から)[ 、])';
    for (const m of text.matchAll(new RegExp(`(\\S+(?:くん|さん))は (\\S+) (\\S+(?:くん|さん))の となりで ${notT6}`, 'g'))) {
      if (!INS.includes(m[2])) errors.push(`${tag}: h8 word between names is "${m[2]}"`);
      h8++;
    }
    if (new RegExp(`(くん|さん)は (\\S+(くん|さん))の となりで ${notT6}`).test(text)) errors.push(`${tag}: h8 without a word between the names`);
    // h10: "Y の 〈rel〉の X は 〈ことば〉"
    for (const m of text.matchAll(/(\S+(?:くん|さん))の (\S+)の (\S+)(くん|さん)は (\S+)/g)) {
      const rel = m[2], hon = m[4];
      if (['おかあさん', 'おとうさん', 'こ'].includes(rel)) { errors.push(`${tag}: relation word ${rel} is outside the 9-word pool`); continue; }
      if (!REL_N.includes(rel) && !REL_K.includes(rel) && !REL_S.includes(rel)) continue; // not an h10
      h10++;
      if ((REL_K.includes(rel) && hon !== 'くん') || (REL_S.includes(rel) && hon !== 'さん')) errors.push(`${tag}: relation word ${rel} with ${m[3]}${hon}`);
      if (!INS.includes(m[5])) errors.push(`${tag}: h10 without a word after "X は" (${m[5]})`);
    }
    // h0: one sentence that lists two or more "X は … N〈単位〉" separated by 、 and ends in もっていました/もっています
    for (const s of text.split('。')) {
      const parts = s.split('、');
      if (parts.length >= 2 && /もってい(ました|ます)$/.test(s.trim()) && parts.filter(p => /(くん|さん)は .*\d+(こ|まい)/.test(p)).length >= 2) h0++;
    }
    // two-name clause in every 2-person text (clauses split by 。 and 、)
    if (names.length === 2) {
      const clauses = text.split(/[。、]/);
      const twoName = clauses.some(c => (c.match(NAME_RE) || []).length >= 2 && /\d/.test(c));
      if (!twoName) errors.push(`${tag}: 2-person text without a two-name clause holding a number`);
    }
    // kanji: only 子 of その子 (9.5 章の例外) and the units
    const kanji = text.replace(/その子/g, '').match(/[一-鿿]/g);
    if (kanji) errors.push(`${tag}: kanji ${[...new Set(kanji)].join('')}`);
  }
  if (h8 > CAP_H8[lv - 1]) errors.push(`Lv${lv}: h8 ${h8} over cap ${CAP_H8[lv - 1]}`);
  if (h10 > CAP_H8[lv - 1]) errors.push(`Lv${lv}: h10 ${h10} over cap ${CAP_H8[lv - 1]}`);
  if (h0 > CAP_H0[lv - 1]) errors.push(`Lv${lv}: h0 ${h0} over cap ${CAP_H0[lv - 1]}`);
  report(`Lv${lv}: h8 ${h8}, h10 ${h10}, h0 ${h0}`);
}
report(`${itemCount} items checked`);
if (errors.length) { report(`${errors.length} violations:`); errors.forEach(e => report('  ' + e)); }
else report('no violations');
return { errors, itemCount };
}
if (require.main === module) {
  const docPath = process.argv[2] || path.join(__dirname, '../../../docs/komorebi_bamen_yomitori_curriculum.md');
  try { const { errors } = checkAppendix(fs.readFileSync(docPath, 'utf8'), console.log); process.exitCode = errors.length ? 1 : 0; }
  catch (e) { console.error(e.message); process.exitCode = 2; }
}
module.exports = { checkAppendix };
