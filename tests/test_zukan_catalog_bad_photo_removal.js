"use strict";

/* zukan_foundry/reports/card_image_inspection_2026-08-18.md の推奨処置適用の回帰テスト。
   公開中(マダガスカルI・オーストラリアI) 23 種 (誤参照 1 + 品質問題 22) を
   zukan_config/zukan_catalog.js から外した結果、
     - catalog 側に該当 speciesId が一切残らない (thumb/display 参照も含め消える)
     - shared/zukan_render.js が catalog miss を SVG (bespoke/parametric) へ正しく
       fallback する (museum <image> を出さない)
     - shared/zukan_detail.js の specimenInfoHTML が catalog miss で "" を返す
       (出典/ライセンス表記が残らない)
     - 誤参照バグの原因だった隣接種 madagasukaru_oo_tagame は無傷で残る
   ことを検証する。node tests/test_zukan_catalog_bad_photo_removal.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

/* 誤参照バグ (最優先): madagasukaru_oo_tagame の写真を誤って参照していた */
const MISREFERENCE_REMOVED = "kiboshi_kuro_hishibatta";

/* 公開中の品質問題 22 種 (種でない/幼虫等/画質不良/別種の疑い)。
   レポート本文の「21 件」という記載に対し、実際の表の行数は 22 件 (neomantis_australis
   を含む) だった。差異はレポート記載の丸め/数え間違いと判断し、表に載った全 22 件を処置。 */
const QUALITY_REMOVED = [
  "coccinella_transversalis", "coelophora_inaequalis", "kinoko_kikuimushi", "suzukuri_konajirami",
  "oo_beni_hagoromo", "kuroboshi_maru_kaigaramushi", "ohishiba_kuro_aburamushi", "afurika_yamato_shijimi",
  "akamarubane_monki_tateha", "hagata_murasaki", "suji_mori_tonbo", "gin_haneguro_tonbo",
  "madagasukaru_gin_yanma", "haneashi_ito_tonbo", "tsuchiiro_ito_tonbo", "kanmuri_kareha_kamakiri",
  "chamadara_tobibatta", "madagasukaru_oo_gokiburi", "scutiphora_pedicellata", "tsuya_oozu_ari",
  "aka_tobibatta", "neomantis_australis",
];

const ALL_REMOVED = [MISREFERENCE_REMOVED, ...QUALITY_REMOVED];

function freshContext(){
  const context = {console, setTimeout, clearTimeout};
  context.window = context;
  context.CustomEvent = function(type, init){ this.type = type; this.detail = init && init.detail; };
  context.dispatchEvent = function(){};
  vm.createContext(context);
  /* index.html の読み込み順 (bugs -> render -> catalog -> zukan_render -> bespoke -> reward -> zukan_detail) を再現。 */
  for(const file of ["shared/bugs.js", "shared/render.js", "zukan_config/zukan_catalog.js",
    "shared/zukan_render.js", "shared/bespoke.js", "shared/reward.js", "shared/zukan_detail.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

const context = freshContext();
const idx = context.Q4B_ZUKAN_INDEX;
const BUGS = context.Q4B_BUGS;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

test("all 23 flagged species no longer have a catalog entry", () => {
  for(const id of ALL_REMOVED){
    assert.equal(idx[id], undefined, id + " should have been removed from Q4B_ZUKAN_INDEX");
  }
});

test("no stray thumb/display path for the removed species remains in the catalog source", () => {
  const src = fs.readFileSync(path.join(root, "zukan_config/zukan_catalog.js"), "utf8");
  for(const id of ALL_REMOVED){
    assert.equal(new RegExp("\"" + id + "\":\\s*\\{").test(src), false, id + " key must not appear in zukan_catalog.js");
  }
});

test("the actual misreference source (madagasukaru_oo_tagame) is untouched and correctly matched", () => {
  const tagame = idx.madagasukaru_oo_tagame;
  assert.ok(tagame, "madagasukaru_oo_tagame entry must still exist");
  assert.equal(tagame.scientificName, "Lethocerus oculatus");
  assert.equal(tagame.image.display, "zukan_cards/processed/WIKIPEDIAWP_L2_grade.webp");
  assert.equal(tagame.specimen.catalogNumber, "WP:タガメ");
});

test("catalog-miss species render via the SVG/bespoke fallback, not a museum photo", () => {
  for(const id of [MISREFERENCE_REMOVED, "neomantis_australis", "madagasukaru_gin_yanma"]){
    const sp = BUGS.find(b => b.id === id);
    assert.ok(sp, id + " must still exist in bugs.js (game roster unaffected)");
    const svg = context.Q4BRender.species(sp, false, undefined);
    assert.match(svg, /^<svg\b/, id + " fallback must still be a valid svg root");
    assert.equal(svg.includes("zukan_cards/processed"), false, id + " must not embed a museum photo href");
    assert.equal(svg.includes("<image"), false, id + " must not embed an <image> tag");
  }
});

test("catalog-miss species carry no specimen/license attribution in the detail panel", () => {
  for(const id of [MISREFERENCE_REMOVED, "coccinella_transversalis", "chamadara_tobibatta"]){
    const sp = BUGS.find(b => b.id === id);
    assert.ok(sp, id + " must still exist in bugs.js");
    const html = context.Q4BZukan.specimenInfoHTML(sp);
    assert.equal(html, "", id + " specimenInfoHTML must be empty once the catalog entry is gone");
  }
});

test("kiboshi_kuro_hishibatta keeps its own species identity in bugs.js (only the photo mapping was removed)", () => {
  const sp = BUGS.find(b => b.id === "kiboshi_kuro_hishibatta");
  assert.ok(sp);
  assert.equal(sp.scientificName, "Oxytettix arius");
  assert.equal(sp.jaName, "キボシクロヒシバッタ");
});

console.log("total", passed, "tests passed");
