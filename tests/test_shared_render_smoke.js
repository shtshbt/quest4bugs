"use strict";

/* shared/render.js に nanafushi (ナナフシ) renderer を追加した回帰テスト。
   render.js は全ゲーム共有なので、既存 archetype の出力を 1 バイトも変えずに
   1 種類だけ追加できていることを、変更前に採取した固定 fixture との比較で
   固定する (tests/fixtures/render_smoke_baseline.json は nanafushi 追加前の
   shared/render.js + shared/bugs.js から生成した「全renderer描画スモーク」)。
   合わせて、Phasmatodea かつ renderer が kemushi だった種の nanafushi への
   更新 (shared/bugs.js) と、新 renderer の最低限の形も見る。
   node tests/test_shared_render_smoke.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/bugs.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "shared/render.js"), "utf8"), context);

const BUGS = context.Q4B_BUGS;
const BY_ID = {};
BUGS.forEach(b => { BY_ID[b.id] = b; });
const render = context.Q4BRender;

const baseline = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/render_smoke_baseline.json"), "utf8"));

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* fixture 生成時と同じ組 (1 renderer archetype につき 1 種、nanafushi へ移行しない種だけ)。
   移行対象 (Phasmatodea かつ旧 renderer=kemushi) は 1 つも含まない。 */
const SPECIES_IDS = [
  "hercules_beetle", "ookuwagata", "monshirochou", "agehachou", "oomurasaki",
  "benishijimi", "aoba_seseri", "ibotaga", "oniyanma", "kumazemi", "nihon_mitsubachi",
  "nanahoshi_tentou", "kuro_ooari", "tonosama_batta", "ookamakiri", "genji_botaru",
  "tagame", "hebitonbo", "dangomushi", "usuba_kamikiri", "kanabun", "yamato_tamamushi",
  "hanmyou", "tabanocella_longirostris"
];
const COMBOS = [
  { shiny: false, sex: null }, { shiny: false, sex: "m" }, { shiny: false, sex: "f" }, { shiny: true, sex: null }
];
/* renderer がすでに "nanafushi" だった種 (au2 側で先に振ってあった 4 種の 1 つ)。
   nanafushi 実装前は未知の archetype として "other" (汎用甲虫) にフォールバックしていた。 */
const WIRING_ID = "leiophasma_flaviceps";
const WIRING_KEY = WIRING_ID + "|species|shiny=false|sex=null|PRE_EDIT_FALLBACK";

/* Phasmatodea かつ renderer が kemushi だった種を、今回すべて nanafushi へ更新した。 */
const MIGRATED_IDS = [
  "nanafushi_modoki", "toge_nanafushi", "eda_nanafushi", "nanafushi_modoki_seibu_dummy",
  "shirabui_nanafushi_dummy", "amami_nanafushi_dummy", "konoha_mushi", "sekai_saichou_nanafushi",
  "kobu_nanafushi", "yaeyama_togari_nanafushi", "okinawa_togari_nanafushi", "kumejima_eda_nanafushi",
  "yonaguni_eda_nanafushi", "master_sakadachi_konoha", "master_jungle_nymph", "indo_nanafushi",
  "ctenomorpha_marginipennis", "anchiale_austrotessulata", "acrophylla_titan", "anchiale_briareus",
  "extatosoma_tiaratum", "podacanthus_viridiroseus", "tropidoderus_childrenii", "megacrania_batesii",
  "candovia_strumosa", "sipyloidea_larryi", "eurycnema_osiris"
];
/* すでに nanafushi だった種 (更新前から)。触っていないことの確認用。 */
const ALREADY_NANAFUSHI_IDS = ["parectatosoma_echinus", "parectatosoma_mocquerysi", "leiophasma_flaviceps", "acrophylla_wuelfingi"];

test("every other archetype's species() and deco() output is untouched, byte for byte", () => {
  let checked = 0;
  SPECIES_IDS.forEach(id => {
    const sp = BY_ID[id];
    assert.ok(sp, "fixture の種が見つからない: " + id);
    COMBOS.forEach(combo => {
      const key = id + "|species|shiny=" + combo.shiny + "|sex=" + combo.sex;
      assert.ok(Object.prototype.hasOwnProperty.call(baseline, key), "fixture に無い: " + key);
      assert.equal(render.species(sp, combo.shiny, combo.sex), baseline[key], key + " の出力が変わった");
      checked++;
    });
    const decoKey = id + "|deco|shiny=false|sex=null";
    assert.equal(render.deco(sp, false, null), baseline[decoKey], decoKey + " の出力が変わった");
    checked++;
  });
  assert.equal(checked, SPECIES_IDS.length * (COMBOS.length + 1));
});

test("every Phasmatodea species that used the kemushi renderer now uses nanafushi", () => {
  MIGRATED_IDS.forEach(id => {
    const sp = BY_ID[id];
    assert.ok(sp, "種が見つからない: " + id);
    assert.equal(sp.order, "Phasmatodea", id + " は Phasmatodea ではない");
    assert.equal(sp.renderer, "nanafushi", id + " が nanafushi に更新されていない");
  });
  /* 更新前から nanafushi だった種は触れていない。 */
  ALREADY_NANAFUSHI_IDS.forEach(id => {
    const sp = BY_ID[id];
    assert.ok(sp, "種が見つからない: " + id);
    assert.equal(sp.renderer, "nanafushi");
  });
  /* Phasmatodea でも kemushi のままの種は無い (漏れが無いことの確認)。 */
  const leftover = BUGS.filter(b => b.order === "Phasmatodea" && b.renderer === "kemushi");
  assert.equal(leftover.length, 0, "kemushi のまま残った Phasmatodea 種: " + leftover.map(b => b.id).join(","));
  /* Phasmatodea 以外の kemushi 種はそのまま (renderer の混同が無いことの確認)。 */
  const hebitonbo = BY_ID.hebitonbo;
  assert.ok(hebitonbo);
  assert.equal(hebitonbo.renderer, "kemushi", "Phasmatodea 以外の kemushi 種まで巻き込まれた");
});

test("a species that only had the nanafushi id set (no renderer implemented yet) now draws differently", () => {
  const sp = BY_ID[WIRING_ID];
  assert.ok(sp);
  assert.equal(sp.renderer, "nanafushi");
  const now = render.species(sp, false, null);
  assert.notEqual(now, baseline[WIRING_KEY], "nanafushi 実装後も other フォールバックのまま");
});

test("the nanafushi archetype draws a slender body, long legs and antennae, with no broken tokens", () => {
  const sp = BY_ID.indo_nanafushi; /* sexDimorphism:size を持つ移行種で ♂♀ 両方見る */
  assert.ok(sp);
  ["m", "f"].forEach(sex => {
    const svg = render.species(sp, false, sex);
    assert.match(svg, /^<svg viewBox="0 0 100 100"[^>]*>.*<\/svg>$/, "svg の外枠が壊れている");
    assert.equal(/undefined|NaN/.test(svg), false, "壊れた値が出力に混ざった (" + sex + ")");
    /* 細長い体 (rect) ・長い脚 (leg 用の stroke path) ・触角 (先端が頭より外) の 3 要素。 */
    assert.match(svg, /<rect x="45" y="13" width="10" height="76"/, "細長い体が描かれていない");
    assert.match(svg, /L10 20/, "長い脚が描かれていない");
    assert.match(svg, /stroke-width="2.5" stroke-linecap="round"\/>/, "触角が描かれていない");
  });
  /* シャイニーでも壊れない (色置換が nanafushi にも一様にかかることの確認)。 */
  const shiny = render.species(sp, true, null);
  assert.equal(/undefined|NaN/.test(shiny), false, "シャイニー描画が壊れた");
  assert.notEqual(shiny, render.species(sp, false, null), "シャイニーが通常色と同じになった");
  /* deco (図鑑の枠付き版) も壊れない。 */
  const deco = render.deco(sp, false, "m");
  assert.match(deco, /^<svg viewBox="0 0 100 100"[^>]*>.*<\/svg>$/);
});

console.log(`RESULT ${passed} passed, 0 failed`);
