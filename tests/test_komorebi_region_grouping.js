/* 1 地域複数巻の画面 (volume_zukan_design 3 章)。
   ピンは地域に 1 本、カテゴリボタンには遠征 badge、地域図鑑は全巻一括 + 遠征
   チップ、小道トップに共通図鑑。fixture は全地域 1 巻なので、ここでは
   オーストラリアに遠征 Ⅱ を注入して多巻の挙動を固定する。
   node tests/test_komorebi_region_grouping.js で実行。 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);

  test("the map draws one pin per region even before any second volume exists", () => {
    const pins = app.querySelectorAll("[data-region-id]");
    assert.equal(pins.length, 4, "fixture has four regions: " + pins.length);
    assert.equal(app.querySelectorAll(".map-pin").filter(p => p.attrs["data-volume-id"]).length, 0,
      "pins must not be per-volume");
  });

  test("a single-volume region shows no expedition headers or badges", () => {
    /* 1 巻の地域に「遠征 Ⅰ」を書いても情報がない。 */
    assert.equal(app.innerHTML.indexOf("path-exp-head"), -1);
    assert.equal(app.innerHTML.indexOf("path-badge"), -1);
  });

  test("the path top offers the common zukan with the aggregate count", () => {
    assert.ok(app.querySelector('[data-action="path-zukan"]'), "no common zukan entrance");
    assert.match(plain(), /こもれびの ずかん/);
  });

  /* --- オーストラリアへ遠征 Ⅱ を注入する --- */
  context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia_2 = {
    id: "volume_fixture_australia_2", regionId: "australia", regionName: "オーストラリア",
    current: false, expedition: 2,
    /* kom_kuku_run は公開済み (release 1) で、AU Ⅰ の manifest には無い。
       地域内でカテゴリが 1 つの遠征にのみ属する規則に沿う。 */
    categories: ["kom_kuku_run"],
    blurb: "オーストラリアの 2 冊目。",
    frozen: true, denominator: 3,
    species: [
      { id: "kom_fixture_au2_n_01", rarity: "N", flagship: false },
      { id: "kom_fixture_au2_r_01", rarity: "R", flagship: false },
      { id: "kom_fixture_au2_sr_flagship", rarity: "SR", flagship: true }
    ]
  };

  /* 地図を開き直してオーストラリアを選ぶ (共通図鑑へ行って戻ると再描画される)。 */
  app.querySelector('[data-action="path-zukan"]').click();
  app.querySelector('[data-action="back"]').click();
  const auPin = app.querySelectorAll("[data-region-id]").filter(p => p.attrs["data-region-id"] === "australia")[0];
  assert.ok(auPin, "australia pin is gone");
  auPin.click();

  test("a two-volume region shows expedition headers and badges", () => {
    const body = plain();
    assert.ok(app.innerHTML.indexOf("path-exp-head") >= 0, "no expedition headers: " + body.slice(0, 300));
    assert.match(body, /遠征 Ⅰ/);
    assert.match(body, /遠征 Ⅱ/);
    assert.ok(app.innerHTML.indexOf("path-badge") >= 0, "category buttons carry no badge");
  });

  test("each category button binds to its own expedition's volume", () => {
    /* fake DOM は過去の描画の要素も残すので、オーストラリアの volume に
       紐づくボタンだけを見る (マダガスカルにも kom_kuku_run がある)。 */
    const buttons = app.querySelectorAll("[data-cat]")
      .filter(b => String(b.attrs["data-volume-id"] || "").indexOf("australia") >= 0);
    const runButton = buttons.filter(b => b.attrs["data-cat"] === "kom_kuku_run")[0];
    assert.ok(runButton, "the injected volume's category is not on the panel");
    assert.equal(runButton.attrs["data-volume-id"], "volume_fixture_australia_2",
      "the button must feed the expedition that owns the category");
    const ratioButton = buttons.filter(b => b.attrs["data-cat"] === "kom_ratio")[0];
    assert.ok(ratioButton, "expedition one's category disappeared");
    assert.equal(ratioButton.attrs["data-volume-id"], "volume_fixture_australia");
  });

  /* 地域図鑑: 全巻一括 + 遠征チップ。 */
  app.querySelector('[data-action="zukan"]').click();

  test("the region zukan merges every volume and offers expedition chips", () => {
    const body = plain();
    assert.match(body, /オーストラリアの ずかん/);
    assert.ok(app.innerHTML.indexOf('data-filter="expedition"') >= 0, "no expedition chips");
    /* 分母は巻ごとに凍結表示 + 合計。AU Ⅰ は 11 種 (10 + 看板)、Ⅱ は 3 種。 */
    assert.match(body, /Ⅰ 0／11/);
    assert.match(body, /Ⅱ 0／3/);
    assert.match(body, /合計 0／14/);
    const cards = (app.innerHTML.match(/zukan-card/g) || []).length;
    assert.ok(cards >= 14, "the grid does not merge both volumes: " + cards);
  });

  test("the expedition chip narrows the grid to one volume", () => {
    const chip = app.querySelectorAll('[data-filter="expedition"]').filter(c => c.attrs["data-value"] === "Ⅱ")[0];
    assert.ok(chip, "no chip for expedition two");
    chip.click();
    const cards = (app.innerHTML.match(/zukan-card/g) || []).length;
    assert.equal(cards, 3, "the filter must leave only expedition two's species: " + cards);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
