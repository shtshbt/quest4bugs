"use strict";
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { runChecks, mulberry32, SPACE } = require('../tools/komorebi/unit_mix_audit_sim/strict_check.js');
const { measureCanonical: measure, revive } = require('../tools/komorebi/unit_mix_audit_sim/strict_enemies.js');
const { checkExplanations } = require('../tools/komorebi/unit_mix_audit_sim/check_explanations.js');
const { checkTables } = require('../tools/komorebi/unit_mix_audit_sim/check_tables.js');
const source = path.resolve(__dirname, '../komorebi/unit_mix_generator.js');
const vm = require('node:vm');
const { Worker, isMainThread, workerData } = require('node:worker_threads');
const sources = ['unit_mix_data.js', 'unit_mix_generator.js'].map(name => fs.readFileSync(path.resolve(__dirname, '../komorebi', name), 'utf8'));
global.window = global;
require('../komorebi/unit_mix_data.js');
require(source);
const G = global.Q4B_KOMOREBI_UNIT_MIX;
const nearValue = (a, b) => Math.abs(a - b) < 1e-9;
const md = fs.readFileSync(path.resolve(__dirname, '../docs/komorebi_unit_mix_curriculum.md'), 'utf8');
const normalize = q => ({ ...q, kind: q.kind === 'num_unit' ? 'num' : q.kind, ans: q.kind === 'choice' ? undefined : q.ans, src: q.src ? normalize(q.src) : undefined });
function checkPerformance(lv) {
  const context = vm.createContext({ window: {} }), loadTick = performance.now();
  sources.forEach(source => vm.runInContext(source, context));
  const loadMs = performance.now() - loadTick;
  assert.ok(loadMs <= 20, `Lv${lv} load ${loadMs} ms`);
  const cold = context.window.Q4B_KOMOREBI_UNIT_MIX, tick = performance.now();
  cold.buildSet(lv, mulberry32(100 + lv), cold.newState());
  const ms = performance.now() - tick;
  assert.ok(ms <= 100, `Lv${lv} cold ${ms} ms`);
  const state = G.newState(), random = mulberry32(100 + lv);
  let worst = 0;
  for (let i = 0; i < (lv === 7 || lv === 10 ? 1000 : 500); i++) {
    const tick = performance.now(), set = G.buildSet(lv, random, state);
    worst = Math.max(worst, performance.now() - tick);
    assert.equal(set.violations.length, 0);
  }
  assert.ok(worst <= 100, `Lv${lv} worst ${worst} ms`);
  console.log(`PASS Lv${lv} load ${loadMs.toFixed(2)} ms, cold ${ms.toFixed(2)} ms, worst ${worst.toFixed(2)} ms`);
}
async function main() {
  assert.doesNotMatch(fs.readFileSync(source, 'utf8'), /Math\.random|Date\.now/);
  assert.ok(sources.reduce((n, source) => n + Buffer.byteLength(source), 0) <= 300000);
  assert.equal(global.Q4B_KOMOREBI_UNIT_MIX_DATA.plans, undefined);
  for (let lv = 1; lv <= 10; lv++) {
    await new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: lv });
      worker.on('error', reject);
      worker.on('exit', code => code === 0 ? resolve() : reject(new Error(`performance worker exited ${code}`)));
    });
  }
  const data = [], generated = [], spaces = {}, enemyFailures = [];
  const oldRandom = Math.random, oldNow = Date.now;
  Math.random = Date.now = () => { throw new Error('uninjected randomness'); };
  try {
    for (let lv = 1; lv <= 10; lv++) {
      spaces[lv] = new Set(); let plans = 0;
      const state = G.newState(), random = mulberry32(100 + lv), start = performance.now(), sets = [];
      const count = lv === 7 || lv === 10 ? 1000 : 500; let benchmark;
      for (let i = 0; i < count; i++) {
        const set = G.buildSet(lv, random, state);
        plans += set.plans;
        assert.equal(set.length, 5); assert.deepEqual(set.violations, []);
        for (const q of set) {
          assert.ok(SPACE[lv].has(q.patternId), q.patternId); spaces[lv].add(q.patternId);
          assert.equal(q.format, q.pattern === 'diagnosis' ? 'diagnosis' : 'normal');
          if (q.kind === 'num_unit') {
            const domain = Object.keys(G.units).find(d => G.units[d].includes(q.to));
            assert.deepEqual(q.unitChoices, G.units[domain]);
            assert.ok(G.judgeNumUnit(q, q.ans, q.to).correct);
            assert.ok(!G.judgeNumUnit(q, q.ans + 1, q.to).correct);
          }
          if (q.pattern === 'recall') assert.equal(q.kind, 'num');
          const base = q.src || q, exact = base.step.exact;
          if (['length', 'weight', 'area', 'volume'].includes(base.step.dom)) {
            assert.ok(Number.isInteger(exact.mantissa) && Number.isInteger(exact.exp));
            assert.ok(nearValue(exact.mantissa * 10 ** exact.exp, base.step.x));
          } else assert.ok(Number.isInteger(exact.num) && Number.isInteger(exact.den) && exact.den > 0);
          for (const e of q.errorValues) { assert.ok(e.text); assert.ok([...e.text.replace(/\s/g, '')].length <= 25, e.text); }
          if (q.kind === 'choice') q.choiceErrorTypes.forEach((types, j) => {
            if (j === q.ansOpt && q.pattern !== 'diagnosis') assert.equal(types.length, 0);
            if (j !== q.ansOpt && !(q.pattern === 'diagnosis' && q.label === 'correct')) assert.ok(types.length && q.feedback[j]);
          });
          assert.doesNotMatch(q.text, /undefined|NaN|null/);
          const shape = {
            recall: /^.+ (?:は 何(?:分|秒|時間| .+ )ですか。|を .+ で 表すと いくつですか。)$/,
            convert: /^.+ (?:は (?:何(?:分|秒|時間| .+ )|(?:秒速|分速|時速) 何 (?:m|km) )ですか。|を .+ で 表すと いくつですか。)$/,
            compound_in: /^.+ (?:は 何(?:分|秒| .+ )ですか。|を .+ で 表すと いくつですか。)$/,
            align_calc: /^.+ [+−] .+ (?:は 何(?:分|秒|時間| .+ )ですか。|を .+ で 表すと いくつですか。)$/,
            rate_select: /^.+ を .+ に なお(?:します。どうしますか。|す 計算は どれですか。)$/,
            time_express: /^\d+分 は (?:どれ|何時間)ですか。$/,
            compare: /^.+ と .+。.+ に そろえて くらべると、(?:長い|重い|広い|多い)のは どちらですか。$/,
            speed_apply: /^(?:(?:時速 \d+km|秒速 \d+m) で \d+分 進むと 何 (?:km|m) ですか。|分速 \d+m で [\d.]+km 進むと 何分 かかりますか。|分速 \d+m と 秒速 \d+m。1 (?:秒|分)で 進む 道のりの 合計は 何 m ですか。)$/
          };
          assert.match(q.text, shape[base.pattern]);
        }
        generated.push(...set);
        sets.push({ items: set.map(normalize) });
        if (i === 499) benchmark = (performance.now() - start) / 500;
      }
      const ms = (performance.now() - start) / count;
      assert.ok(benchmark <= 50, `Lv${lv} ${benchmark} ms/set over 500 sets`);
      console.log(`PASS Lv${lv}: ${count} sets, ${ms.toFixed(2)} ms/set, ${(plans / count).toFixed(1)} plans/set`);
      data.push({ lv, seed: 1, sets });
      const trainState = G.newState(), trainRandom = mulberry32(9000 + lv), train = [];
      for (let i = 0; i < 300; i++) { const set = G.buildSet(lv, trainRandom, trainState); assert.deepEqual(set.violations, []); train.push(set.map(normalize)); }
      data.push({ lv, seed: 2, sets: train.map(items => ({ items })) });
      const r = measure(sets.map(s => s.items.map(revive)), train.map(s => s.map(revive)), lv, 1);
      console.log(`Lv${lv}: A ${r.Amax.acc.toFixed(3)}, B ${r.Bexcl.toFixed(3)}, E7 window ${r.E7.p8.toFixed(3)}`);
      assert.ok(r.Amax.acc < 0.60, `Lv${lv} A ${JSON.stringify(r.Amax)}`);
      assert.ok(r.M1mag.p8 <= 0.20, `Lv${lv} M1mag ${r.M1mag.p8}`);
      assert.ok(r.Bexcl < 0.75, `Lv${lv} B ${r.Bexcl}`);
      for (const [name, from] of [['M1', 3], ['M2', 4], ['M3', 8]]) if (lv >= from) assert.ok(r[name].p8 <= 0.15, `Lv${lv} ${name} ${r[name].p8}`);
      if (lv >= 3) { if (r.E7.p8 > 0.15) enemyFailures.push(`Lv${lv} E7 ${r.E7.p8}`); assert.ok(r.E7.acc < 0.75); assert.ok(r.M1d.acc < 0.75); }
      assert.ok(r.M1magR.acc < 0.75);
      if (r.B8 !== null) assert.ok(r.B8 < 0.60, `Lv${lv} B8 ${r.B8}`);
      if (r.B9 !== null) assert.ok(r.B9 < 0.60, `Lv${lv} B9 ${r.B9}`);
      if (r.A10pair !== null) assert.ok(r.A10pair < 0.60);
    }
    assert.deepEqual([...new Set(generated.map(q => q.pattern))].sort(), ['align_calc', 'compare', 'compound_in', 'convert', 'diagnosis', 'rate_select', 'recall', 'speed_apply', 'time_express']);
    assert.deepEqual([...new Set(generated.filter(q => q.pattern === 'speed_apply').map(q => q.type))].sort(), ['kmph_min', 'mix_permin', 'mix_persec', 'mpm_km', 'sps_min']);
    assert.equal(checkExplanations(generated, G), 0);
    for (let lv = 1; lv <= 10; lv++) assert.deepEqual(G.buildSet(lv, mulberry32(77), G.newState()), G.buildSet(lv, mulberry32(77), G.newState()));
    for (const random of [() => 0, () => 0.999999]) for (let lv = 1; lv <= 10; lv++) {
      const set = G.buildSet(lv, random, G.newState()); assert.equal(set.length, 5); assert.ok(Array.isArray(set.violations));
      set.forEach(q => { assert.ok(q.text); if (q.kind === 'choice') assert.equal(new Set(q.choices).size, q.choices.length); else assert.ok(Number.isFinite(q.ans)); });
    }
  } finally { Math.random = oldRandom; Date.now = oldNow; }
  assert.equal(JSON.stringify(require('../tools/komorebi/build_unit_mix_data.js').buildData()), JSON.stringify(global.Q4B_KOMOREBI_UNIT_MIX_DATA));
  const volume = { kind: 'num_unit', to: 'mL', ansUnit: 'mL', ans: 250 };
  assert.ok(G.judgeNumUnit(volume, 250, 'cm3').correct);
  assert.equal(G.judgeNumUnit(volume, 0.25, 'L').state, 'other_unit');
  assert.deepEqual(G.arithmetic('1/3', 'x', 60), { num: 20, den: 1 });
  assert.deepEqual(G.arithmetic('0.1', '+', '0.2'), { num: 3, den: 10 });
  assert.throws(() => G.judgeNumUnit(volume, '0xfa', 'mL'));
  assert.equal(G.judgeNumUnit(volume, '250.0000001', 'mL').correct, false);
  for (let lv = 1; lv <= 10; lv++) spaces[lv] = G.patternSpace(lv, mulberry32(77000 + lv));
  assert.equal(checkTables(md, G.VALUES, spaces), 0);
  const results = await runChecks(data, { ...G, source, spaces,  });
  assert.deepEqual(results.filter(r => r.fails.length), []);
  assert.deepEqual(enemyFailures, []);
  console.log('PASS strict checks, appendix golden cases, enemy solvers, unit judgment, explanations and seeded generation');
}
if (require.main === module) {
  if (!isMainThread) checkPerformance(workerData);
  else main().catch(error => { console.error(error); process.exitCode = 1; });
}
