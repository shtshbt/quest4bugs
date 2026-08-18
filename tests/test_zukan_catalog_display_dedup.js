"use strict";

/* zukan_foundry/reports/card_image_inspection_2026-08-18.md §6.4 の横断検索で見つかった
   「本編 17 種が madagasukaru_oo_tagame の写真一式を誤って共有参照する」欠陥 (commit
   参照: 17 種除外 + 追加調査で見つかった 8 種除外 + 1 種再リンクの回), および同種検査で
   別途見つかったファイル名衝突由来の 8 種 (WMCFilejpg 等、Wikipedia の File: タイトルが
   日本語のみだと非ASCII文字が全部落ちて空の basename に潰れ、無関係な複数種が同じ
   ローカル物理ファイルを取り合う) の再発防止テスト。

   catalog 内で image.display パスが複数 speciesId に渡って重複すること自体は、
   同一の実在種を指す 2 つの図鑑エントリ (和名違い・性別/型違いなど、例: gengorou/
   nami_gengorou はどちらも Cybister chinensis) では意図的かつ健全であり、本テストは
   それを禁止しない。禁止するのは「学名 (属+種小名) が異なる複数 speciesId が同じ
   display パスを参照する」ケースのみ — これが実際に起きた欠陥 (誤参照/ファイル名衝突)
   の形そのもの。node tests/test_zukan_catalog_display_dedup.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "zukan_config/zukan_catalog.js");
const src = fs.readFileSync(catalogPath, "utf8");

/* brace 深さに依存せず、各 top-level entry の開始位置だけを頼りに block を切り出す。
   entry 内部 (specimen/source/image) の閉じ括弧はどれも 6 space 以上の indent なので
   "    \"id\": {" ( 4 space ) と衝突しない。 */
const startRe = /\n {4}"([a-zA-Z0-9_]+)": \{\n {6}speciesId: "\1",/g;
const starts = [];
let m;
while ((m = startRe.exec(src))) starts.push({ id: m[1], idx: m.index });

const entries = {};
for (let i = 0; i < starts.length; i++) {
  const s = starts[i];
  const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
  const block = src.slice(s.idx, end);
  const dispM = block.match(/display: "([^"]*)"/);
  const sciM = block.match(/scientificName: "([^"]*)"/);
  entries[s.id] = { display: dispM && dispM[1], sci: sciM && sciM[1] };
}

/* 学名の属+種小名だけを canonical 化 (亜属括弧・亜種/著者などの3語目以降は無視)。
   属+種小名が一致すれば「同一種」とみなし重複を許す。 */
function canonicalSpecies(name) {
  if (!name) return "";
  const stripped = name.replace(/\([^)]*\)/g, " ").trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  return (parts[0] || "").toLowerCase() + " " + (parts[1] || "").toLowerCase();
}

const byDisplay = {};
for (const [id, info] of Object.entries(entries)) {
  if (!info.display) continue;
  (byDisplay[info.display] = byDisplay[info.display] || []).push(id);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("PASS", name);
}

test("catalog has a plausible number of top-level entries (parser sanity)", () => {
  assert.ok(starts.length > 900, "entry count looks too low, the anchor regex may be broken: " + starts.length);
  const speciesIdLines = (src.match(/^ {6}speciesId: "/gm) || []).length;
  assert.equal(starts.length, speciesIdLines, "entry count must match speciesId line count exactly");
});

test("no two catalog entries with a DIFFERENT scientificName share the same image.display path", () => {
  const offenders = [];
  for (const [disp, ids] of Object.entries(byDisplay)) {
    if (ids.length < 2) continue;
    const distinctSpecies = new Set(ids.map((id) => canonicalSpecies(entries[id].sci)));
    if (distinctSpecies.size > 1) {
      offenders.push({
        display: disp,
        entries: ids.map((id) => id + " (" + entries[id].sci + ")"),
      });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "found display-path collisions across different species (misreference / filename-collision defect class): " +
      JSON.stringify(offenders, null, 2)
  );
});

test("every image.display path that is duplicated across speciesId keys still resolves to an existing physical file reference (sanity, not a filesystem check)", () => {
  for (const [disp, ids] of Object.entries(byDisplay)) {
    if (ids.length < 2) continue;
    assert.ok(disp.startsWith("zukan_cards/processed/") && disp.endsWith("_L2_grade.webp"), disp + " has an unexpected shape");
  }
});

console.log("total", passed, "tests passed");
