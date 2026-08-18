"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console, setTimeout, clearTimeout};
context.window = context;
context.Q4B_KOMOREBI_NO_BOOT = true;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js", "komorebi/economy_flag.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const komorebi = context.Q4B_KOMOREBI;
const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function event(id, overrides){
  return Object.assign({sessionId:"session-main", submissionId:id, format:"normal", kind:"num", correct:true, final:true}, overrides);
}
function sequence(values){
  let index = 0;
  return () => {
    assert.ok(index < values.length, "乱数列が不足しています");
    return values[index++];
  };
}
function caughtEntry(){
  return {n:1,max:10,min:10,shiny:0,normal:1,records:[{d:"",s:10,sex:"m",shiny:false}]};
}

test("the area gauge survives a category switch", () => {
  const profile = komorebi.createProfile();
  for(let i=0;i<4;i++)komorebi.applyAnswer(profile, "kom_ratio", event("ratio-"+i), volume, () => 0);
  for(let i=0;i<3;i++)komorebi.applyAnswer(profile, "kom_kuku_run", event("kuku-"+i), volume, () => 0);
  assert.equal(profile.collection.gauge, 7);
  assert.equal(profile.collection.totalCatches, 0);
});

test("eight qualifying correct answers produce exactly one capture", () => {
  const profile = komorebi.createProfile();
  const answers = [
    {format:"normal",kind:"num"},
    {format:"normal",kind:"frac"},
    {format:"formulation",kind:"choice"},
    {format:"ordering",kind:"order"},
    {format:"diagnosis",kind:"choice"},
    {format:"find_all",kind:"choice"},
    {format:"voice",kind:"voice"},
    {format:"normal",kind:"num"}
  ];
  let result;
  answers.forEach((answer, index) => {
    result = komorebi.applyAnswer(profile, index < 4 ? "kom_ratio" : "kom_kuku_dan2", event("correct-"+index, answer), volume, () => 0);
  });
  assert.equal(result.capture.isNew, true);
  assert.equal(profile.collection.gauge, 0);
  assert.equal(profile.collection.totalCatches, 1);
  assert.equal(Object.keys(profile.collection.catches).length, 1);
  assert.equal(profile.collection.catches[Object.keys(profile.collection.catches)[0]].n, 1);
  assert.equal(Number.isFinite(profile.collection.catches[Object.keys(profile.collection.catches)[0]].max), true);
  assert.equal(["m","f"].includes(profile.collection.catches[Object.keys(profile.collection.catches)[0]].records[0].sex), true);
  assert.equal(typeof profile.collection.catches[Object.keys(profile.collection.catches)[0]].records[0].shiny, "boolean");
});

test("non-qualifying answers do not advance the gauge and a final retry does", () => {
  const profile = komorebi.createProfile();
  const excluded = [
    event("hint", {hintShown:true}),
    event("recognition", {format:"voice", kind:"voice", correct:false, final:false, recognitionFailure:true}),
    event("answer-only", {format:"voice", kind:"voice", answerOnly:true}),
    event("intermediate", {format:"ordering", kind:"order", final:false}),
    event("wrong", {correct:false}),
    event("debug", {debug:true})
  ];
  excluded.forEach(answer => komorebi.applyAnswer(profile, "kom_ratio", answer, volume, () => 0));
  assert.equal(profile.collection.gauge, 0);

  const retry = event("retry-final", {retry:true});
  const first = komorebi.applyAnswer(profile, "kom_ratio", retry, volume, () => 0);
  komorebi.applyAnswer(profile, "kom_ratio", event("between", {correct:false}), volume, () => 0);
  const duplicate = komorebi.applyAnswer(profile, "kom_ratio", retry, volume, () => 0);
  const nextSession = komorebi.applyAnswer(profile, "kom_ratio", event("retry-final", {sessionId:"session-next"}), volume, () => 0);
  assert.equal(first.counted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(nextSession.counted, true);
  assert.equal(profile.collection.gauge, 2);

  const untouched = komorebi.createProfile();
  assert.throws(() => komorebi.applyAnswer(untouched, "kom_ratio", event("missing-random"), volume), /乱数/);
  assert.equal(untouched.collection.gauge, 0);
});

test("pity accumulates after duplicates and resets on a new species", () => {
  const catches = {};
  volume.species.filter(species => species.rarity === "N").forEach(species => { catches[species.id] = {n:1}; });

  let draw = komorebi.drawCapture(volume, catches, 0, sequence([0,0]));
  assert.equal(draw.isNew, false);
  assert.equal(draw.pityDuplicates, 1);
  for(const expected of [2,3,4]){
    draw = komorebi.drawCapture(volume, catches, expected-1, sequence([0,0.99,0]));
    assert.equal(draw.isNew, false);
    assert.equal(draw.pityDuplicates, expected);
  }
  draw = komorebi.drawCapture(volume, catches, 4, sequence([0,0.99,0,0]));
  assert.equal(draw.pityApplied, true);
  assert.equal(draw.isNew, true);
  assert.equal(draw.species.rarity, "R");
  assert.equal(draw.pityDuplicates, 0);
  assert.deepEqual(Array.from(komorebi.collectionConfig.pityChances), [0,0.25,0.5,0.75,1]);
});

test("duplicate captures preserve the shared catch record schema", () => {
  const profile = komorebi.createProfile();
  const normalSpecies = volume.species.filter(species => species.rarity === "N");
  normalSpecies.forEach(species => { profile.collection.catches[species.id] = caughtEntry(); });
  profile.collection.totalCatches = normalSpecies.length;
  profile.collection.gauge = 7;
  const result = komorebi.applyAnswer(profile, "kom_ratio", event("duplicate-catch"), volume, () => 0);
  const entry = profile.collection.catches[result.capture.id];
  assert.equal(result.capture.isNew, false);
  assert.equal(entry.n, 2);
  assert.equal(entry.records.length, 2);
  assert.equal(Number.isFinite(entry.max), true);
  assert.equal(Number.isFinite(entry.min), true);
  assert.equal(profile.collection.pityDuplicates, 1);
});

test("the fixture denominator is frozen and supplies per-region progress", () => {
  assert.equal(volume.frozen, true);
  assert.equal(volume.denominator, 84);
  assert.equal(volume.species.length, 84);
  assert.deepEqual(Array.from(new Set(volume.species.map(species => species.rarity))).sort(), ["N","R","SR","SSR"]);
  /* ウルトラレアは 3 種 (看板コメットガ + ベニホシオオアゲハ + マダガスカルオオタガメ)。 */
  assert.equal(volume.species.filter(species => species.rarity === "SSR").length, 3);
  assert.equal(volume.species.filter(species => species.rarity === "SR").length, 7);
  assert.equal(volume.species.some(species => species.rarity === "SS"), false);
  /* fixture の種は bugs.js に areaOnly として実在する。捕獲カードと図鑑が本編と
     同じ描画資産で出るための条件であり、同時に本編の分母には入らない。 */
  const catalog = new Map(context.Q4B_BUGS.map(species => [species.id, species]));
  assert.equal(volume.species.every(species => catalog.has(species.id)), true);
  assert.equal(volume.species.every(species => catalog.get(species.id).areaOnly === "komorebi"), true);

  const profile = komorebi.createProfile();
  profile.collection.catches[volume.species[0].id] = caughtEntry();
  profile.collection.catches[volume.species[1].id] = caughtEntry();
  profile.collection.catches.not_in_this_volume = caughtEntry();
  let progress = komorebi.volumeProgress(volume, profile.collection);
  assert.deepEqual(JSON.parse(JSON.stringify(progress)), {regionId:"madagascar",volumeId:"volume_fixture",caught:2,denominator:84,complete:false});
  volume.species.forEach(species => { profile.collection.catches[species.id] = caughtEntry(); });
  progress = komorebi.volumeProgress(volume, profile.collection);
  assert.equal(progress.caught, 84);
  assert.equal(progress.denominator, 84);
  assert.equal(progress.complete, true);
});

test("the flagship has reduced SSR weight without being pinned to the final capture", () => {
  const ssrVolume = {
    id:"weight_fixture",
    regionId:"weight_region",
    regionName:"重み試験地",
    frozen:true,
    denominator:2,
    species:[
      {id:"weight_ssr_regular",rarity:"SSR",flagship:false},
      {id:"weight_ssr_flagship",rarity:"SSR",flagship:true}
    ]
  };
  assert.equal(komorebi.collectionConfig.flagshipWeight, 0.25);
  assert.equal(komorebi.drawCapture(ssrVolume, {}, 0, sequence([0,0.79])).species.id, "weight_ssr_regular");
  const earlyFlagship = komorebi.drawCapture(ssrVolume, {}, 0, sequence([0,0.81]));
  assert.equal(earlyFlagship.species.id, "weight_ssr_flagship");
  assert.equal(earlyFlagship.isNew, true);
  assert.throws(() => komorebi.validateVolume(Object.assign({}, ssrVolume, {species:[{id:"bad",rarity:"SS",flagship:true}],denominator:1})), /種データ|レア度/);
  /* 看板 = ウルトラレア固定。SR の看板は組めない。 */
  assert.throws(() => komorebi.validateVolume(Object.assign({}, ssrVolume, {species:[{id:"bad2",rarity:"SR",flagship:true}],denominator:1})), /看板のレア度/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
