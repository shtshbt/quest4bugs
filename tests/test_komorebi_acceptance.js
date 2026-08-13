/* 木漏れ日の小道 検収 fixture。docs/komorebi_design.md 15 章の受け入れ基準を
   1 ファイルで通しで確かめる。個別のテストが緑でも「基準そのもの」が満たされて
   いるかは別なので、基準の条番号ごとに 1 テストを置く。
   node tests/test_komorebi_acceptance.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

function loadContext(){
  const context = { console, setTimeout, clearTimeout };
  context.window = context;
  context.CustomEvent = function(type, init){ this.type = type; this.detail = init && init.detail; };
  context.dispatchEvent = function(){};
  context.Q4B_KOMOREBI_NO_BOOT = true;
  vm.createContext(context);
  for(const file of ["shared/bugs.js", "shared/render.js", "shared/bug_archetypes.js",
    "shared/reward.js", "shared/kuku_phrases.js",
    "komorebi/volumes/volume_fixture.js", "komorebi/kuku_run.js", "komorebi/kuku_dan2.js",
    "komorebi/trophies.js", "komorebi/app.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

const context = loadContext();
const komorebi = context.Q4B_KOMOREBI;
const trophies = context.Q4B_KOMOREBI_TROPHIES;
const dan2 = context.Q4B_KOMOREBI_KUKU_DAN2;
const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

function answer(index, overrides){
  return Object.assign({ sessionId: "acceptance", submissionId: "a" + index, format: "normal", kind: "num",
    correct: true, final: true }, overrides);
}
function feed(profile, count, from){
  let result = null;
  for(let i = 0; i < count; i++) result = komorebi.applyAnswer(profile, "kom_ratio", answer((from || 0) + i), volume, () => 0);
  return result;
}

/* ---- 15.1 回帰 (本編に一切触れない) ---- */

test("15.1 komorebi categories never reach the main game's category lists", () => {
  const keisan = fs.readFileSync(path.join(root, "keisan/app.js"), "utf8");
  const battle = fs.readFileSync(path.join(root, "battle.html"), "utf8");
  for(const [source, file] of [[keisan, "keisan/app.js"], [battle, "battle.html"]]){
    const arrays = source.match(/var K(5|10)(CATS|DEV|_CATS)=\[[^\]]*\]/g) || [];
    assert.ok(arrays.length >= 2, file + " no longer declares its frozen category arrays");
    arrays.forEach(text => assert.equal(text.indexOf("kom_"), -1, file + " leaked a komorebi category: " + text.slice(0, 60)));
  }
  /* 本編の図鑑分母は areaOnly を除外し続けること (小道の種を足しても動かない)。 */
  assert.equal(context.Q4BReward.zukanDenomCount("keisan"), 477);
  assert.equal(context.Q4BReward.zukanDenomCount("kanji"), 402);
  assert.equal(context.Q4BReward.zukanDenomCount("eitango"), 473);
});

/* ---- 15.2 進行と報酬 ---- */

test("15.2 seven correct answers catch nothing, the eighth catches one, sixteen catch two", () => {
  const profile = komorebi.createProfile();
  feed(profile, 7);
  assert.equal(profile.collection.totalCatches, 0, "a capture happened before the gauge was full");
  assert.equal(profile.collection.gauge, 7);
  feed(profile, 1, 7);
  assert.equal(profile.collection.totalCatches, 1);
  feed(profile, 8, 8);
  assert.equal(profile.collection.totalCatches, 2);
});

test("15.2 the gauge survives switching categories", () => {
  const profile = komorebi.createProfile();
  for(let i = 0; i < 5; i++) komorebi.applyAnswer(profile, "kom_ratio", answer(i), volume, () => 0);
  for(let i = 0; i < 3; i++) komorebi.applyAnswer(profile, "kom_kuku_run", answer(10 + i, { format: "flash", kind: "choice" }), volume, () => 0);
  assert.equal(profile.collection.totalCatches, 1, "the gauge was reset by the category switch");
});

test("15.2 only species of the played volume can be caught", () => {
  const profile = komorebi.createProfile();
  const inVolume = new Set(volume.species.map(species => species.id));
  for(let i = 0; i < 400; i++) komorebi.applyAnswer(profile, "kom_ratio", answer(i), volume, Math.random);
  const caught = Object.keys(profile.collection.catches);
  assert.ok(caught.length > 0);
  caught.forEach(id => assert.equal(inVolume.has(id), true, id + " is not in this volume"));
});

test("15.2 the volume holds no SS and every species is reachable by the normal draw", () => {
  assert.equal(volume.species.some(species => species.rarity === "SS"), false);
  const catalog = new Map(context.Q4B_BUGS.map(species => [species.id, species]));
  volume.species.forEach(species => {
    const sp = catalog.get(species.id);
    assert.ok(sp, species.id + " is missing from bugs.js");
    assert.equal(sp.areaOnly, "komorebi");
    assert.equal(!!sp.masterOnly, false, species.id + " must not need a master route");
    assert.equal(!!sp.bossOnly, false, species.id + " must not need a boss route");
  });
  /* 未捕獲が残る限り有限の正答で完走できること。pity 上限で連続重複が必ず途切れる。 */
  const profile = komorebi.createProfile();
  let answers = 0;
  while(Object.keys(profile.collection.catches).length < volume.denominator){
    komorebi.applyAnswer(profile, "kom_ratio", answer(answers), volume, Math.random);
    answers++;
    assert.ok(answers < volume.denominator * 8 * 12, "the volume could not be completed in a bounded number of answers");
  }
  assert.equal(Object.keys(profile.collection.catches).length, volume.denominator);
});

test("15.2 the frozen denominator never grows with duplicate captures", () => {
  const profile = komorebi.createProfile();
  feed(profile, 8 * 30);
  const progress = komorebi.volumeProgress(volume, profile.collection);
  assert.equal(progress.denominator, volume.denominator);
  assert.ok(progress.caught <= progress.denominator);
});

/* ---- 15.3 問題品質 ---- */

test("15.3 voice kuku never accepts the answers alone and drops recognition failures", () => {
  const chunk = dan2.buildSet(2, 1, () => 0.5)[0];
  const answersOnly = chunk.phrases.map(phrase => phrase.ans).join(" ");
  const spoken = dan2.judgeChunk(chunk, answersOnly, 1000);
  assert.equal(spoken.state, "answer_only");
  assert.equal(spoken.correct, false, "saying only the answers must not pass");

  const heardNothing = dan2.judgeChunk(chunk, "", 1000);
  assert.equal(heardNothing.state, "recognition_failure");
  assert.equal(heardNothing.counted, false, "a recognition failure must not be recorded at all");

  /* ノーカウントは統計にも Lv にも触れない。 */
  const profile = komorebi.createProfile();
  const before = JSON.stringify(profile);
  assert.equal(heardNothing.counted, false);
  assert.equal(JSON.stringify(profile), before);
});

test("15.3 generated choices never repeat a value or the answer", () => {
  const kuku = context.Q4B_KOMOREBI_KUKU_RUN;
  let seed = 20260813;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for(let i = 0; i < 300; i++){
    kuku.buildSet(i % 10 + 1, kuku.createDeck(), random).forEach(question => {
      const values = question.format === "dan_run"
        ? question.steps.map(step => step.choices).flat()
        : question.choices;
      if(question.format === "dan_run"){
        question.steps.forEach(step => {
          assert.equal(new Set(step.choices).size, 4);
          assert.equal(step.choices.filter(value => value === step.ans).length, 1);
        });
      }else{
        assert.equal(new Set(question.choices).size, question.choices.length);
        assert.equal(question.choices.filter(value => value === question.ans).length, 1);
      }
      values.forEach(value => assert.equal(Number.isInteger(value), true));
    });
  }
});

/* ---- 15.5 トロフィー ---- */

function reachLv10(profile, cat){
  profile.lv[cat] = 10;
  profile.maxLv[cat] = 10;
  return profile;
}

test("15.5 reaching level ten alone awards nothing", () => {
  const profile = reachLv10(komorebi.createProfile(), "kom_ratio");
  assert.equal(trophies.qualifies(profile, "kom_ratio"), false);
  assert.equal(trophies.award(profile, "kom_ratio", "2026-08-13"), null);
  assert.deepEqual(Object.keys(profile.trophies), []);
});

test("15.5 the stable-clear rule needs twenty level ten answers at 85 percent", () => {
  const profile = reachLv10(komorebi.createProfile(), "kom_ratio");
  for(let i = 0; i < 19; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
  assert.equal(trophies.qualifies(profile, "kom_ratio"), false, "nineteen answers must not be enough");
  trophies.noteAnswer(profile, "kom_ratio", 10, true);
  assert.equal(trophies.qualifies(profile, "kom_ratio"), true);

  /* 17 / 20 = 85% がちょうど閾値。16 / 20 = 80% は届かない。 */
  const floor = reachLv10(komorebi.createProfile(), "kom_ratio");
  for(let i = 0; i < 20; i++) trophies.noteAnswer(floor, "kom_ratio", 10, i >= 3);
  assert.equal(trophies.qualifies(floor, "kom_ratio"), true, "17 of 20 is exactly the floor and must pass");

  const shaky = reachLv10(komorebi.createProfile(), "kom_ratio");
  for(let i = 0; i < 20; i++) trophies.noteAnswer(shaky, "kom_ratio", 10, i >= 4);
  assert.equal(trophies.qualifies(shaky, "kom_ratio"), false, "16 of 20 is below the floor");
  /* 窓は直近 20 問。正答を重ねれば誤答が押し出されて条件を満たす。 */
  for(let i = 0; i < 4; i++) trophies.noteAnswer(shaky, "kom_ratio", 10, true);
  assert.equal(trophies.qualifies(shaky, "kom_ratio"), true);
});

test("15.5 answers given below level ten do not count toward the trophy", () => {
  const profile = reachLv10(komorebi.createProfile(), "kom_ratio");
  for(let i = 0; i < 40; i++) trophies.noteAnswer(profile, "kom_ratio", 9, true);
  assert.equal(trophies.qualifies(profile, "kom_ratio"), false);
  assert.equal(profile.trophyProgress.kom_ratio, undefined);
});

test("15.5 the trophy is awarded once and survives a demotion", () => {
  const profile = reachLv10(komorebi.createProfile(), "kom_ratio");
  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_ratio", 10, true);
  const awarded = trophies.award(profile, "kom_ratio", "2026-08-13");
  assert.ok(awarded);
  assert.equal(profile.trophies.madagascar_ratio.at, "2026-08-13");
  assert.equal(trophies.award(profile, "kom_ratio", "2026-09-01"), null, "the trophy must not be re-awarded");
  assert.equal(profile.trophies.madagascar_ratio.at, "2026-08-13");

  profile.lv.kom_ratio = 4;                       /* 降格しても失わない */
  assert.ok(profile.trophies.madagascar_ratio);
  assert.equal(komorebi.normalizeProfile(JSON.parse(JSON.stringify(profile))).profile.trophies.madagascar_ratio.at, "2026-08-13");
});

test("15.5 the trophy species stays catchable exactly as before", () => {
  /* トロフィーの有無で捕獲抽選が変わらないこと。表示専用の対応づけであることの担保。 */
  const withTrophy = komorebi.createProfile();
  withTrophy.trophies.madagascar_ratio = { cat: "kom_ratio", speciesId: "oo_onaga_yamamayu", at: "2026-08-13" };
  const without = komorebi.createProfile();
  const draws = [];
  for(const profile of [withTrophy, without]){
    let seed = 5;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const ids = [];
    let i = 0;
    /* 看板は SR 内の重みを下げてあり出現は後半寄り。回数ではなく「捕獲されるまで」で
       打ち切り、上限だけ置く。 */
    while(!profile.collection.catches.oo_onaga_yamamayu && i < volume.denominator * 8 * 12){
      const result = komorebi.applyAnswer(profile, "kom_ratio", answer(i), volume, random);
      if(result.capture) ids.push(result.capture.id);
      i++;
    }
    assert.ok(profile.collection.catches.oo_onaga_yamamayu, "the trophy species is not reachable by the normal draw");
    draws.push(ids);
  }
  assert.deepEqual(draws[0], draws[1], "owning the trophy changed what gets caught");
});

test("15.5 every trophy points at a real species of a real volume", () => {
  const catalog = new Map(context.Q4B_BUGS.map(species => [species.id, species]));
  const inVolume = new Set(volume.species.map(species => species.id));
  trophies.list().forEach(trophy => {
    assert.ok(komorebi.categories[trophy.cat], trophy.trophyId + " names an unknown category");
    const sp = catalog.get(trophy.speciesId);
    assert.ok(sp, trophy.trophyId + " names a species that is not in bugs.js");
    assert.equal(inVolume.has(trophy.speciesId), true, trophy.trophyId + " names a species outside its volume");
    /* 金色化は色の差し替えだけ。素材を用意しない (ui_design 6 章)。 */
    const gold = trophies.goldSpecies(sp);
    assert.deepEqual(gold.colors, trophies.goldColors);
    assert.deepEqual(sp.colors, catalog.get(trophy.speciesId).colors, "the catalog entry was mutated");
    assert.ok(context.Q4BReward.svg(gold, false).length > 100, "the gold species does not render");
  });
  /* トロフィーは volume の freeze 時に代表虫を凍結するので、未公開カテゴリには
     まだ存在しない。公開済みのカテゴリが 1 個ずつ持っていることを見る。 */
  const released = Object.keys(komorebi.categories).filter(komorebi.isReleased);
  assert.equal(trophies.list().length, released.length, "every released category needs exactly one trophy");
  released.forEach(cat => assert.ok(trophies.forCat(cat), cat + " has no trophy"));
});

console.log("RESULT " + passed + " passed, 0 failed");
