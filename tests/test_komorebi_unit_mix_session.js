"use strict";
const assert = require('node:assert/strict'), path = require('node:path');
const { bootKomorebi, plainText, KOMOREBI_FILES } = require('./fake_dom.js');
const { mulberry32 } = require('../tools/komorebi/unit_mix_audit_sim/strict_check.js');
const root = path.resolve(__dirname, '..'), cat = 'kom_unit_mix';
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const units = { mm: 0.001, cm: 0.01, m: 1, km: 1000, g: 1, kg: 1000, t: 1000000, 'cm²': 0.0001, 'm²': 1, a: 100, ha: 10000, 'km²': 1000000, 'cm³': 0.000001, mL: 0.000001, L: 0.001, 'm³': 1, '秒': 1, '分': 60, '時間': 3600, '秒速m': 1, '分速m': 1 / 60, '時速km': 5 / 18 };
const ids = { 'cm²': 'cm2', 'm²': 'm2', 'km²': 'km2', 'cm³': 'cm3', 'm³': 'm3' };
const number = s => s.includes('/') ? s.split('/').map(Number).reduce((a, b) => a / b) : Number(s);
const near = (a, b) => Math.abs(a - b) < 1e-7;
function text(html) { return plainText(html.replace(/<span class="fr"[^>]*aria-label="([^"]+)"[^>]*>[\s\S]*?<\/span>/g, '$1')).trim(); }
function quantities(s) {
  return [...s.matchAll(/(?:(秒速|分速|時速)\s*)?(\d+(?:\.\d+)?(?:\/\d+)?)\s*(km²|cm²|m²|cm³|m³|km|mm|cm|kg|ha|mL|m|g|t|a|L|時間|分|秒)/g)].map(m => ({ v: number(m[2]), u: m[1] ? m[1] + m[3] : m[3] }));
}
function ask(s) {
  const speed = /(秒速|分速|時速) 何 (km|m)/.exec(s) || /を (秒速|分速|時速) で/.exec(s);
  if (speed) return speed[1] + (speed[2] || (speed[1] === '時速' ? 'km' : 'm'));
  const m = /(?:何\s*|を\s*)(km²|cm²|m²|cm³|m³|km|mm|cm|kg|ha|mL|m|g|t|a|L|時間|分|秒)(?:\s*ですか|\s*で|\s*に)/.exec(s);
  assert.ok(m, s); return m[1];
}
function model(s) {
  const qs = quantities(s), a = qs[0], b = qs[1];
  if (b && /分速.*秒速/.test(s)) { const sec = s.includes('1 秒で') ? 1 : 60; return { value: (a.v * units[a.u] + b.v * units[b.u]) * sec, unit: 'm', step: { x: sec === 1 ? a.v : b.v, from: sec === 1 ? a.u : b.u, to: sec === 1 ? b.u : a.u } }; }
  if (/進むと/.test(s)) {
    if (a.u === '分速m') return { value: b.v * units[b.u] / (a.v / 60) / 60, unit: '分', step: { x: b.v, from: b.u, to: 'm' } };
    const hour = a.u === '時速km'; return { value: a.v * units[a.u] * b.v * units[b.u] / (hour ? 1000 : 1), unit: hour ? 'km' : 'm', step: { x: b.v, from: b.u, to: hour ? '時間' : '秒' } };
  }
  if (/そろえて くらべる/.test(s)) { const av = a.v * units[a.u], bv = b.v * units[b.u]; return { choice: near(av, bv) ? '同じ' : av > bv ? '左の量' : '右の量' }; }
  const unit = /何時間ですか|分 は どれですか/.test(s) ? '時間' : ask(s);
  const value = (a.v * units[a.u] + (b ? (s.includes('−') ? -1 : 1) * b.v * units[b.u] : 0)) / units[unit];
  const changing = b && unit === a.u ? b : a;
  return { value, unit, step: { x: changing.v, from: changing.u, to: unit } };
}
async function main() {
  const files = KOMOREBI_FILES.slice(); files.splice(files.indexOf('komorebi/app.js'), 0, 'komorebi/unit_mix_data.js', 'komorebi/unit_mix_generator.js');
  const context = bootKomorebi({ root, files, profileType: 'k10' }); await settle();
  const app = context.__app, api = context.Q4B_KOMOREBI, engine = context.Q4B_KOMOREBI_UNIT_MIX, profile = api.profile();
  const volume = Object.assign({}, context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia, { categories: [cat] });
  const choices = () => [...app.innerHTML.matchAll(/<button\b[^>]*data-choice-index="(\d+)"[^>]*>([\s\S]*?)<\/button>/g)].map(m => ({ id: +m[1], text: text(m[2]) }));
  function clickChoice(i) { const button = app.querySelectorAll('[data-choice-index]').find(b => b.getAttribute('data-choice-index') === String(i)); assert.ok(button); button.click(); }
  function submit(value, unit) {
    const form = app.querySelector('[data-answer-form]'); assert.ok(form);
    form.elements = { answer: { value: String(value) } };
    if (unit) { const chip = app.querySelectorAll('[data-unit]').find(b => b.getAttribute('data-unit') === (ids[unit] || unit)); assert.ok(chip, unit); chip.click(); }
    form.submit();
  }
  assert.deepEqual(JSON.parse(JSON.stringify(api.categories[cat])), { course: 'k10', name: '単位のまぜ練習', maxLv: 10, release: 6 });
  api.setCurrentRelease(5); assert.equal(api.isReleased(cat), false); assert.ok(!app.innerHTML.includes('data-cat="' + cat + '"'));
  api.setCurrentRelease(6); assert.equal(api.isReleased(cat), true); api.setCurrentRelease(5);
  for (let lv = 1; lv <= 10; lv++) {
    profile.lv[cat] = lv; profile.maxLv[cat] = 10;
    const before = profile.stats[cat] ? profile.stats[cat].n : 0;
    await api.sessionStarters[cat](volume, mulberry32(100 + lv));
    for (let i = 0; i < 5; i++) {
      const h = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(app.innerHTML), stem = text(h[1]), opts = choices();
      if (/なおす|なおします/.test(stem)) {
        const a = quantities(stem)[0], suffix = /を (.+?) に なお/ .exec(stem)[1], to = ({ 秒速: '秒速m', 分速: '分速m', 時速: '時速km' })[suffix] || suffix;
        const factor = units[a.u] / units[to], label = factor >= 1 ? '×' + Math.round(factor * 1e9) / 1e9 : '÷' + Math.round(1 / factor * 1e9) / 1e9;
        const option = opts.find(o => o.text === label); assert.ok(option, stem + ' ' + label); clickChoice(option.id);
      } else {
        const expected = model(stem), work = /<div class="ratio-work">([\s\S]*?)<\/div>/.exec(app.innerHTML);
        if (work) {
          const sheet = text(work[1]), shown = /こたえ (.*)$/.exec(sheet)[1], v = quantities(shown)[0];
          let label = '正しい';
          if (!near(v.v, expected.value)) {
            const op = /しき [\d./]+ ([×÷]) ([\d.]+)/.exec(sheet), st = expected.step;
            const factor = Math.max(units[st.from], units[st.to]) / Math.min(units[st.from], units[st.to]);
            if (!op || (!sheet.includes('そのあと') && /進む|合計|[+−]/.test(stem))) label = '単位を そろえて いない';
            else if (op[1] !== (units[st.from] > units[st.to] ? '×' : '÷')) label = '上りと下りが逆';
            else if (['時間', '分', '秒', '秒速m', '分速m'].includes(st.from) && [100, 10000].includes(+op[2])) label = '60 を 100 に している';
            else if (near(+op[2], factor * 10) || near(+op[2], factor / 10)) label = '10倍のかいだんの数がちがう';
            else label = 'ほかの 単位の 倍率を つかっている';
          }
          const option = opts.find(o => o.text === label); assert.ok(option, stem + ' ' + sheet + ' ' + label); clickChoice(option.id);
        } else if (opts.length) {
          const option = opts.find(o => expected.choice ? o.text === expected.choice : near(quantities(o.text).reduce((n, q) => n + q.v * units[q.u], 0), expected.value * units[expected.unit]));
          assert.ok(option, stem + ' ' + JSON.stringify(expected)); clickChoice(option.id);
        } else submit(Math.round(expected.value * 1e9) / 1e9, app.querySelectorAll('[data-unit]').length ? expected.unit : null);
      }
      await settle(); assert.match(text(app.innerHTML), /正解！/);
      if (i < 4) app.querySelector('[data-action="ratio-next"]').click();
    }
    assert.equal(profile.stats[cat].n, before + 5);
    console.log(`PASS Lv${lv}: five questions solved from visible wording and chips`);
  }
  const build = engine.buildSet, covered = new Set(); let sawFraction = false, sawSamePriority = false;
  for (let lv = 1; lv <= 10; lv++) for (let seed = 1; seed <= 15; seed++) for (const q of build(lv, mulberry32(seed), engine.newState())) {
    const cases = q.kind === 'choice' ? Array.from(q.feedback, (message, answer) => ({ message, answer, type: q.choiceErrorTypes[answer][0] })) : Array.from(q.errorValues, e => { const result = engine.feedback(q, e.value, q.to); return { message: result.text, answer: e.value, type: result.types[0] }; });
    if (!sawFraction && /\d+\/\d+時間/.test(q.text + (q.choices || []).join(''))) {
      engine.buildSet = () => [q, q, q, q, q]; profile.lv[cat] = lv; await api.sessionStarters[cat](volume, mulberry32(1));
      assert.match(app.innerHTML, /class="fr"/); sawFraction = true;
    }
    if (q.pattern === 'compare' && q.choiceErrorTypes.some(types => types.includes('cmp_same'))) {
      assert.ok(q.choiceErrorTypes.filter(types => types.includes('cmp_same')).every(types => types[0] !== 'cmp_same')); sawSamePriority = true;
    }
    for (const e of cases) {
      if (!e.message || q.kind === 'choice' && e.answer === q.ans || covered.has(e.type)) continue;
      engine.buildSet = () => [q, q, q, q, q]; profile.lv[cat] = lv;
      await api.sessionStarters[cat](volume, mulberry32(1));
      if (q.kind === 'choice') clickChoice(e.answer); else submit(e.answer, q.kind === 'num_unit' ? q.to : null);
      await settle();
      const reason = /<p class="dan2-reason">([\s\S]*?)<\/p>/.exec(app.innerHTML); assert.ok(reason, e.type);
      assert.equal(text(reason[1]), e.message); assert.doesNotMatch(text(reason[1]), /undefined|NaN|〈/); covered.add(e.type);
    }
    if (q.pattern === 'diagnosis' && q.label === 'correct' && !covered.has('correct_sheet')) {
      engine.buildSet = () => [q, q, q, q, q]; profile.lv[cat] = lv; await api.sessionStarters[cat](volume, mulberry32(1));
      clickChoice((q.ans + 1) % 4); await settle(); assert.ok(app.innerHTML.includes('dan2-reason')); assert.ok(app.innerHTML.includes('しきは')); covered.add('correct_sheet');
    }
  }
  engine.buildSet = build;
  assert.equal(covered.size, 17, [...covered].join(',')); assert.ok(sawFraction); assert.ok(sawSamePriority);
  for (const lv of [2, 8]) {
    const q = build(lv, mulberry32(100 + lv), engine.newState()).find(q => q.kind === 'num_unit' && q.pattern === 'convert');
    engine.buildSet = () => [q, q, q, q, q]; profile.lv[cat] = lv;
    await api.sessionStarters[cat](volume, mulberry32(1));
    submit(q.step.x, q.step.from); await settle();
    const note = engine.judgeNumUnit(q, q.step.x, ids[q.step.from] || q.step.from).note;
    assert.match(note, /^たしかに /); assert.ok(text(app.innerHTML).includes(note));
    assert.ok(text(app.innerHTML).includes(engine.quantityText(q.ans, q.ansUnit)));
  }
  engine.buildSet = build;
  const q = engine.publicQuestion(engine.pool('te', undefined, undefined, undefined, null, 'frac').find(q => q.step.x === 20 && q.calcBelow), 4, { coin: () => false, shuffle: a => a.slice() });
  const furi = bootKomorebi({ root, files, profileType: 'k5' }); await settle();
  furi.furi5 = s => s.replace(/時間/g, '<ruby>時間<rt>じかん</rt></ruby>');
  const html = furi.Q4B_KOMOREBI.standardQuestionBodyHtml(q);
  for (const fraction of q.fractions) assert.ok(html.includes('aria-label="' + fraction.num + '/' + fraction.den + '"><i>' + fraction.num + '</i><i>' + fraction.den + '</i></span><ruby>時間<rt>じかん</rt></ruby>'));
  assert.ok(q.fractions.some(f => f.text === '1/3') && q.fractions.some(f => f.text === '1/30'));
  assert.doesNotMatch(furi.Q4B_KOMOREBI.standardQuestionBodyHtml({ ...q, cat: 'kom_unit_convert' }), /class="fr"/);
  context.Q4B_KOMOREBI_UNIT_MIX = undefined;
  assert.throws(() => api.standardQuestionBodyHtml(build(2, mulberry32(102), engine.newState()).find(q => q.kind === 'num_unit')), /単位のまぜ練習を読み込めません/);
  context.Q4B_KOMOREBI_UNIT_MIX = engine;
  console.log('PASS release 6 gate, table B feedback priority, fractions with furigana, other-unit notes, speed answers and engine loading guard');
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
