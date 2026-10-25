'use strict';
// C7 check: joint distributions (domain x direction, band x direction, domain x diagnosis label) per Lv.
const G = require('./gen.js'), S = require('./sets.js');
const N = Number(process.argv[2] || 300);
for (let lv = 3; lv <= 10; lv++) {
  const R = G.rng(600 + lv); const sets = []; for (let i = 0; i < N; i++) sets.push(S.buildSet(lv, R));
  const items = sets.flat().map(q => (q.pattern === 'diagnosis' ? q.src : q)).filter(q => ['convert', 'rate_select', 'time_express', 'speed_apply'].includes(q.pattern));
  const dd = {}, bd = {};
  for (const q of items) {
    const k = q.domain; dd[k] = dd[k] || { up: 0, down: 0 }; dd[k][q.dir]++;
    const v = q.pattern === 'time_express' ? q.X : q.paths[0].v; const b = v >= 10 ? 'big' : 'small'; bd[b] = bd[b] || { up: 0, down: 0 }; bd[b][q.dir]++;
  }
  const lab = {}; sets.flat().filter(q => q.pattern === 'diagnosis').forEach(q => { const k = q.src.domain; lab[k] = lab[k] || {}; lab[k][q.label] = (lab[k][q.label] || 0) + 1; });
  const fmt = o => Object.entries(o).map(([k, v]) => `${k}:${Math.round(100 * v.up / (v.up + v.down))}%up(n${v.up + v.down})`).join(' ');
  console.log(`Lv${lv} domain x dir: ${fmt(dd)} | band x dir: ${fmt(bd)}`);
  if (Object.keys(lab).length) console.log(`   domain x label: ${JSON.stringify(lab)}`);
}
