"use strict";

/* 図鑑の標本情報 (shared/zukan_detail.js specimenInfoHTML) が外部 link の href に
   絶対 http/https URL だけを使うことの回帰テスト。
     - safeHttpUrl が javascript: / data: / 他 scheme / 相対 URL / 空白・制御文字・
       backslash による偽装を拒否し、正当な URL はそのまま返す
     - 不正 URL の entry でも種名以外の標本情報・提供者・ライセンス表記は残り、
       link だけが消える
     - 既存 catalog の全 entry で、出る link の数と href が変更前と同じ
   JavaScript payload は実行しない (文字列として扱うだけ)。
   node tests/test_zukan_detail_url_scheme.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function freshContext(withURL){
  const context = {console, setTimeout, clearTimeout};
  if(withURL) context.URL = URL;
  context.window = context;
  context.CustomEvent = function(type, init){ this.type = type; this.detail = init && init.detail; };
  context.dispatchEvent = function(){};
  vm.createContext(context);
  for(const file of ["shared/bugs.js", "shared/render.js", "zukan_config/zukan_catalog.js",
    "shared/zukan_render.js", "shared/bespoke.js", "shared/reward.js", "shared/zukan_detail.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const VALID = [
  "https://data.nhm.ac.uk/object/8b0a8ba8-d92d-4bfc-9039-b7e4784316c0",
  "http://collections.peabody.yale.edu/search/Record/YPM-ENT-000001",
  "https://www.gbif.org/occurrence/999000001",
  "https://ja.wikipedia.org/wiki/カブトムシ",
  "HTTPS://example.org/a?b=1&c=%22",
];
const INVALID = [
  "javascript:void(0)", "JaVaScRiPt:void(0)", " javascript:void(0)", "\tjavascript:void(0)",
  "java\nscript:void(0)", "java\tscript:void(0)", "javascript\u0000:void(0)", "\ufeffjavascript:void(0)",
  "\u2028https://example.org/", "https://example.org/\u00a0x", "data:text/html,<b>x</b>",
  "vbscript:msgbox(1)", "file:///etc/passwd", "ftp://example.org/x", "//evil.example/x",
  "/relative/path", "example.org/x", "https:/\\evil.example", "https://", "http:///path",
  "https://exa mple.org/", "https://example.org/" + "a".repeat(2100), "", null, undefined, 123,
  ["https://example.org/"],
];

for(const withURL of [true, false]){
  const label = withURL ? "with URL" : "without URL";
  const ctx = freshContext(withURL);
  test("safeHttpUrl keeps valid http/https URLs (" + label + ")", () => {
    for(const u of VALID) assert.equal(ctx.Q4BZukan.safeHttpUrl(u), u, u);
  });
  test("safeHttpUrl rejects other schemes and disguised values (" + label + ")", () => {
    for(const u of INVALID) assert.equal(ctx.Q4BZukan.safeHttpUrl(u), null, JSON.stringify(u));
  });
}

const ctx = freshContext(true);
const idx = ctx.Q4B_ZUKAN_INDEX;

function fixtureEntry(source){
  return {
    speciesId: "fixture_sp", scientificName: "Fixturus testus", jaName: "テストムシ",
    creditLine: "Fixture Museum", creator: "Fixture Museum", sexCovered: "m",
    specimen: {basisOfRecord: "PreservedSpecimen", catalogNumber: "FX-1", recordedBy: "A. Collector",
      eventDate: "1901-05-01", country: "Japan", localityVerbatim: "Tokyo"},
    source: Object.assign({gbifOccurrenceKey: "999000001", mediaLicense: "CC-BY-4.0"}, source),
    image: {}, modifications: ["cropped"],
  };
}

function render(source){
  idx.fixture_sp = fixtureEntry(source);
  try { return ctx.Q4BZukan.specimenInfoHTML({id: "fixture_sp", jaName: "テストムシ"}); }
  finally { delete idx.fixture_sp; }
}

test("unsafe URLs produce no href but keep specimen, credit and license text", () => {
  for(const bad of ["javascript:void(document.title='Q4B_FIXTURE')", " JaVaScRiPt:void(0)", "data:text/html,x", "//evil.example/x"]){
    const html = render({institutionRecordUrl: bad, licenseUrl: bad, sourceMediaUrl: bad});
    assert.equal(/href=/i.test(html), false, "no link for " + JSON.stringify(bad));
    assert.equal(/javascript:|data:text/i.test(html), false, "value not echoed for " + JSON.stringify(bad));
    for(const text of ["Fixture Museum", "FX-1", "A. Collector", "CC-BY-4.0", "Tokyo"]){
      assert.ok(html.includes(text), text + " kept for " + JSON.stringify(bad));
    }
    assert.equal(html.includes("原レコード"), false, "record row omitted when its URL is rejected");
  }
});

test("valid URLs still render as links", () => {
  const html = render({institutionRecordUrl: "https://www.gbif.org/occurrence/999000001",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/"});
  assert.ok(html.includes('href="https://www.gbif.org/occurrence/999000001"'));
  assert.ok(html.includes('href="https://creativecommons.org/licenses/by/4.0/"'));
  assert.ok(html.includes("原レコード"));
});

test("every committed catalog entry renders the same links as before", () => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  let entries = 0, links = 0;
  for(const id of Object.keys(idx)){
    const src = idx[id].source || {};
    /* 変更前の規則: 値が truthy なら link (license は mediaLicense があるときだけ)。 */
    const expected = [];
    if(src.mediaLicense && src.licenseUrl) expected.push(src.licenseUrl);
    if(src.institutionRecordUrl) expected.push(src.institutionRecordUrl);
    const html = ctx.Q4BZukan.specimenInfoHTML({id: id, jaName: idx[id].jaName});
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, expected.map(esc), id);
    entries++; links += hrefs.length;
  }
  assert.ok(entries > 1000, "catalog loaded (" + entries + " entries)");
  console.log("  catalog entries:", entries, "links:", links);
});

console.log(passed + " passed");
