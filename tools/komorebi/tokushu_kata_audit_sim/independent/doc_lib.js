// Shared parsing helpers for the Phase 7 cross-check of komorebi_tokushu_kata_curriculum.md
'use strict';
const fs = require('fs');

const path = require('path');
const DOC = process.env.DOC || path.join(__dirname, '..', '..', '..', '..', 'docs', 'komorebi_tokushu_kata_curriculum.md');

function loadDoc() {
  try {
    return fs.readFileSync(DOC, 'utf8').split('\n');
  } catch (e) {
    process.stderr.write(`cannot read doc: ${e.message}\n`);
    process.exit(2);
  }
}

// Return [startLine, endLine) of the section whose heading starts with `prefix`.
function section(lines, prefix) {
  const start = lines.findIndex(l => /^#+ /.test(l) && l.replace(/^#+ /, '').startsWith(prefix));
  if (start < 0) throw new Error(`section not found: ${prefix}`);
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+) /);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return [start, end];
}

// First markdown table inside a line range. Returns {header, rows, lineNos}.
function tableIn(lines, range, nth = 0) {
  const [s, e] = range;
  let found = -1;
  const tables = [];
  for (let i = s; i < e; i++) {
    if (/^\s*\|/.test(lines[i]) && i + 1 < e && /^\s*\|[\s|:-]+\|\s*$/.test(lines[i + 1])) {
      const header = splitRow(lines[i]);
      const rows = [], lineNos = [];
      let j = i + 2;
      while (j < e && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); lineNos.push(j + 1); j++; }
      tables.push({ header, rows, lineNos });
      i = j;
    }
  }
  if (!tables[nth]) throw new Error(`table ${nth} not found in range ${s}-${e}`);
  return tables[nth];
}

function splitRow(l) {
  return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function text(lines, range) { return lines.slice(range[0], range[1]).join('\n'); }

// Character count used for 4.7: spaces do not count, everything else counts as 1.
function charLen(s) { return [...s.replace(/\s/g, '')].length; }

module.exports = { loadDoc, section, tableIn, splitRow, text, charLen, DOC };
