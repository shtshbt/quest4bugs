'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function buildData() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../komorebi/unit_mix_generator.js'), 'utf8'), context);
  const G = context.window.Q4B_KOMOREBI_UNIT_MIX, data = {};
  for (const kind of ['align', 'cmp', 'sa']) for (const dom of kind === 'sa' ? [undefined] : ['length', 'weight', 'area', 'volume', 'time']) for (const dir of kind === 'sa' ? [undefined] : ['down', 'up']) {
    for (const extra of kind === 'cmp' ? ['big', 'small', 'same'] : kind === 'sa' ? ['kmph_min', 'mpm_km', 'sps_min', 'mix_persec', 'mix_permin'] : [undefined]) for (const band of kind === 'sa' ? [null, 'hi', 'lo'] : [null]) {
      data[JSON.stringify(kind === 'sa' ? [kind, band, extra] : [kind, dom, dir, extra])] = G.groups(G.pool(kind, dom, dir, undefined, band, extra).filter(q => kind !== 'cmp' || q.big === 'L')).map(group => [...new Map(group.map(q => [JSON.stringify(q, (k, v) => k === '_recipe' ? undefined : v), q._recipe.map(i => String.fromCharCode(65 + i)).join('')])).values()].join('.'));
    }
  }
  data.meta = {}; data.metaRows = [];
  const seen = new Map();
  const descriptors = [];
  for (const kind of ['conv', 'conv2', 'rate', 'align', 'cmp']) for (const dom of ['length', 'weight', 'area', 'volume', 'time', 'speed']) for (const dir of ['down', 'up']) for (const band of [null, 'hi', 'lo']) {
    if (['align', 'cmp'].includes(kind) && dom === 'speed') continue;
    for (const extra of kind === 'cmp' ? ['big', 'small', 'same'] : [undefined]) descriptors.push([kind, dom, dir, band, extra]);
  }
  for (const extra of ['kmph_min', 'mpm_km', 'sps_min', 'mix_persec', 'mix_permin']) for (const band of [null, 'hi', 'lo']) descriptors.push(['sa', undefined, undefined, band, extra]);
  for (const extra of ['dec', 'frac', 'comp']) descriptors.push(['te', undefined, undefined, null, extra]);
  for (const extra of ['C1', 'C2', 'C3', 'C4', 'C5']) descriptors.push(['comp', undefined, undefined, null, extra]);
  for (const [kind, dom, dir, band, extra] of descriptors) {
    const rows = G.groups(G.pool(kind, dom, dir, ['int', 'dec', 'frac'], band, extra));
    data.meta[JSON.stringify([kind, dom, dir, band, extra])] = rows.map(group => {
      const q = group[0], row = [q.pattern, q.domain, q.dir, q.form, q.rel || null, q.type || null, q._traps, !['rate', 'cmp', 'te', 'comp'].includes(kind) && group.some(G.diagnosable)], key = JSON.stringify(row);
      if (!seen.has(key)) { seen.set(key, data.metaRows.length); data.metaRows.push(row); }
      return seen.get(key);
    });
  }
  return data;
}
function main() {
  const data = buildData(), target = path.resolve(__dirname, '../../komorebi/unit_mix_data.js');
  if (process.argv[2] === '--check') {
    const context = { window: {} }; vm.runInNewContext(fs.readFileSync(target, 'utf8'), context);
    if (JSON.stringify(context.window.Q4B_KOMOREBI_UNIT_MIX_DATA) !== JSON.stringify(data)) throw new Error('unit_mix_data.js differs from generator rules');
  } else if (process.argv.length === 2) process.stdout.write('(function(global){"use strict";global.Q4B_KOMOREBI_UNIT_MIX_DATA=' + JSON.stringify(data) + ';})(window);\n');
  else throw new Error('Usage: node tools/komorebi/build_unit_mix_data.js [--check]');
}
if (require.main === module) main();
module.exports = { buildData };
