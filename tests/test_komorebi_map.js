"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {console, setTimeout, clearTimeout};
context.window = context;
context.Q4B_KEISAN_NO_BOOT = true;
context.Q4B_KOMOREBI_NO_BOOT = true;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js", "keisan/app.js", "komorebi/volumes/volume_fixture.js", "shared/economy_flag.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}

const komorebi = context.Q4B_KOMOREBI;
const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
const map = JSON.parse(fs.readFileSync(path.join(root, "komorebi/assets/world_paths.json"), "utf8"));

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function caughtEntry(){
  return {n:1,max:10,min:10,shiny:0,normal:1,records:[{d:"",s:10,sex:"m",shiny:false}]};
}

test("the world map payload parses and covers every fixture region", () => {
  assert.equal(komorebi.validateMapPayload(map, [volume]), map);
  assert.equal(typeof map.viewBox, "string");
  assert.equal(typeof map.land, "string");
  assert.ok(map.land.length > 1000);
  assert.equal(typeof map.regions[volume.regionId], "string");
  assert.equal(Number.isFinite(map.pins[volume.regionId].x), true);
  assert.equal(Number.isFinite(map.pins[volume.regionId].y), true);
});

test("pin state follows current, past, completed, and unopened progress", () => {
  const profile = komorebi.createProfile();
  let state = komorebi.mapPinState(volume, profile.collection, volume.id);
  assert.equal(state.kind, "current");
  assert.equal(state.mark, "★");
  assert.equal(state.ringValue, 0);

  profile.collection.catches.oo_beni_hagoromo = caughtEntry();
  profile.collection.catches.akamarubane_monki_tateha = caughtEntry();
  state = komorebi.mapPinState(volume, profile.collection, "newer_volume");
  assert.equal(state.kind, "past");
  assert.equal(state.mark, "🦋");
  assert.equal(state.caught, 2);
  assert.equal(state.denominator, 84);
  assert.equal(state.ringValue, 2 / 84);

  volume.species.forEach(species => { profile.collection.catches[species.id] = caughtEntry(); });
  state = komorebi.mapPinState(volume, profile.collection, volume.id);
  assert.equal(state.kind, "completed");
  assert.equal(state.mark, "✓");
  assert.equal(state.ringValue, 1);
  assert.equal(komorebi.mapPinState(null, profile.collection, volume.id), null);
});

test("the k5 region blurb passes through the shared furi5 formatter", () => {
  const formatted = komorebi.formatCourseText(volume.blurb, "k5", context.furi5);
  assert.match(formatted, /<ruby>東<rt>ひがし<\/rt><\/ruby>/);
  assert.match(formatted, /<ruby>大きな<rt>おおきな<\/rt><\/ruby>/);
  assert.match(formatted, /<ruby>島<rt>しま<\/rt><\/ruby>/);
  assert.match(formatted, /<ruby>日本<rt>にほん<\/rt><\/ruby>/);
  assert.match(formatted, /<ruby>虫<rt>むし<\/rt><\/ruby>/);
  assert.equal(komorebi.formatCourseText(volume.blurb, "k10", context.furi5), volume.blurb);
});

console.log(`RESULT ${passed} passed, 0 failed`);
