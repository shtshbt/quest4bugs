/* 仮称の表示。標準和名を持たない海外種はこちらで記載的に名前を組み立てているので、
   そのまま出すと子どもが実在の名前として覚えてしまう。図鑑では「（仮称）」を添え、
   学名と並べて出す。この印が黙って外れると、作った名前が本物の顔をして残る。
   node tests/test_provisional_names.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const context = { console };
context.window = context;
context.CustomEvent = function(){};
context.dispatchEvent = function(){};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);

const BUGS = context.Q4B_BUGS;
const displayName = context.Q4B_SPECIES_DISPLAY_NAME;

test("every species declares where its name came from", () => {
  BUGS.forEach(sp => {
    assert.ok(sp.nameStatus === "standard" || sp.nameStatus === "provisional",
      sp.id + " has no nameStatus");
  });
});

test("the marker is added only to constructed names", () => {
  const std = BUGS.filter(sp => sp.nameStatus === "standard")[0];
  const prov = BUGS.filter(sp => sp.nameStatus === "provisional")[0];
  assert.ok(prov, "no provisional species to check");
  assert.equal(displayName(std), std.jaName);
  assert.equal(displayName(prov), prov.jaName + "（仮称）");
  assert.equal(displayName(null), "");
});

test("unknown or missing nameStatus defaults to standard, never to a false marker", () => {
  /* 既定を仮称にすると、和名のある 1500 種すべてに印が付いて意味が消える。 */
  assert.equal(displayName({ jaName: "テスト", nameStatus: "なにか" }), "テスト");
  assert.equal(displayName({ jaName: "テスト" }), "テスト");
});

test("constructed names are confined to the path and every one of them has a scientific name", () => {
  /* 学名が無いと「仮称」とだけ言われて正体が分からない。印と学名は対で意味を持つ。 */
  const prov = BUGS.filter(sp => sp.nameStatus === "provisional");
  assert.ok(prov.length > 0);
  prov.forEach(sp => {
    assert.equal(sp.areaOnly, "komorebi", sp.id + " is a constructed name outside the path");
    assert.ok(sp.scientificName && sp.scientificName.trim().length > 0,
      sp.id + " is provisional but carries no scientific name");
  });
});

test("species with real Japanese names are not marked", () => {
  /* standard は GBIF の日本語 vernacular (初回 84 種の 19 種) と、文献で定着した
     通用名 (ガンビアハマダラカ等、命名 batch が override で申告) の両方。
     仮称のほうが多数派であることは変わらない。 */
  const komorebi = BUGS.filter(sp => sp.areaOnly === "komorebi");
  const standard = komorebi.filter(sp => sp.nameStatus === "standard");
  assert.ok(standard.length >= 19, "the original 19 GBIF names must stay standard");
  assert.ok(standard.length < komorebi.length / 2, "standard names should stay the minority");
  assert.ok(komorebi.length - standard.length >= 65);   /* 仮称は命名 batch で増える */
  standard.forEach(sp => assert.equal(displayName(sp).indexOf("（仮称）"), -1));
});

test("the main game pools carry no constructed names", () => {
  /* 本編は国内種で、harvest の時点で日本語 vernacular を必須にしている。 */
  const main = BUGS.filter(sp => !sp.areaOnly);
  assert.equal(main.filter(sp => sp.nameStatus === "provisional").length, 0);
});

test("the shared detail panel and the path both route names through the helper", () => {
  /* 表示側が jaName を直接読むと、印が付かないまま出る経路が残る。 */
  const detail = fs.readFileSync(path.join(root, "shared/zukan_detail.js"), "utf8");
  assert.match(detail, /Q4B_SPECIES_DISPLAY_NAME/, "shared/zukan_detail.js does not use the helper");
  const komorebi = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8");
  assert.match(komorebi, /Q4B_SPECIES_DISPLAY_NAME/, "komorebi/app.js does not use the helper");
  for(const marker of ["zukan-name", "ratio-capture-name"]){
    assert.ok(komorebi.indexOf(marker) >= 0, "the path lost its " + marker + " render point");
  }
  assert.equal(komorebi.indexOf("displayText(sp.jaName)"), -1,
    "a path render point still prints jaName directly");
});

console.log("RESULT " + passed + " passed, 0 failed");
