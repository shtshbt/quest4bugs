/* 1 地域複数巻の画面 (volume_zukan_design 3 章)。
   ピンは地域に 1 本、カテゴリボタンには遠征 badge、地域図鑑は全巻一括 + 遠征
   チップ、小道トップに共通図鑑。placeholder のオーストラリア遠征 I はロックし、
   遠征 II / III を注入して公開済みの巻だけによる多巻の挙動を固定する。
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

  test("the map draws one pin per opened region and none per volume", () => {
    const pins = app.querySelectorAll("[data-region-id]");
    assert.equal(pins.length, 1, "only madagascar is opened: " + pins.length);
    assert.equal(pins[0].attrs["data-region-id"], "madagascar");
    assert.equal(app.querySelectorAll(".map-pin").filter(p => p.attrs["data-volume-id"]).length, 0,
      "pins must not be per-volume");
  });

  test("placeholder regions do not appear on the map at all", () => {
    /* 未解放地域はピンもじゅんびちゅう表示も出さず、陸地も未開拓と同じ見た目。 */
    assert.equal(app.querySelectorAll(".pin-placeholder").length, 0);
    assert.equal((plain().match(/じゅんびちゅう/g) || []).length, 0);
    assert.doesNotMatch(plain(), /オーストラリア|ボルネオ|コスタリカ/);
    assert.ok((app.innerHTML.match(/hl hl-unopened/g) || []).length >= 3,
      "placeholder land must render as unopened");
    assert.match(plain(), /マダガスカルの小道/);
  });

  test("a single-volume region shows no expedition headers or badges", () => {
    /* 1 巻の地域に「遠征 Ⅰ」を書いても情報がない。 */
    assert.equal(app.innerHTML.indexOf("path-exp-head"), -1);
    assert.equal(app.innerHTML.indexOf("path-badge"), -1);
  });

  test("the common zukan ignores placeholder species and orphan catches", () => {
    assert.ok(app.querySelector('[data-action="path-zukan"]'), "no common zukan entrance");
    const profile = context.Q4B_KOMOREBI.profile();
    profile.collection.catches.kom_fixture_au_n_01 = {n:1,max:10,min:10,records:[{size:10,sex:"m",shiny:false}]};
    profile.collection.totalCatches = 1;
    app.querySelector('[data-action="path-zukan"]').click();
    assert.match(plain(), /こもれびの ずかん/);
    assert.match(plain(), /あつめた虫\s+0／84/);
    assert.doesNotMatch(plain(), /オーストラリア/);
    app.querySelector('[data-action="back"]').click();
  });

  /* --- オーストラリアへ公開済みの遠征 II / III を注入する --- */
  context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia_2 = {
    id: "volume_fixture_australia_2", regionId: "australia", regionName: "オーストラリア",
    current: false, expedition: 2,
    categories: ["kom_ratio"],
    blurb: "オーストラリアの 2 冊目。",
    frozen: true, denominator: 3,
    species: [
      { id: "kom_fixture_au2_n_01", rarity: "N", flagship: false },
      { id: "kom_fixture_au2_r_01", rarity: "R", flagship: false },
      { id: "kom_fixture_au2_sr_flagship", rarity: "SSR", flagship: true }
    ]
  };
  context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia_3 = {
    id: "volume_fixture_australia_3", regionId: "australia", regionName: "オーストラリア",
    current: false, expedition: 3,
    categories: ["kom_pi314"],
    blurb: "オーストラリアの 3 冊目。",
    frozen: true, denominator: 2,
    species: [
      { id: "kom_fixture_au3_n_01", rarity: "N", flagship: false },
      { id: "kom_fixture_au3_sr_flagship", rarity: "SSR", flagship: true }
    ]
  };

  /* 地図を開き直してオーストラリアを選ぶ (共通図鑑へ行って戻ると再描画される)。 */
  app.querySelector('[data-action="path-zukan"]').click();
  app.querySelector('[data-action="back"]').click();
  const auPin = app.querySelectorAll("[data-region-id]").filter(p => p.attrs["data-region-id"] === "australia")[0];
  assert.ok(auPin, "australia pin is gone");
  auPin.click();

  test("only the two released volumes show expedition headers and badges", () => {
    const body = plain();
    assert.ok(app.innerHTML.indexOf("path-exp-head") >= 0, "no expedition headers: " + body.slice(0, 300));
    assert.match(body, /遠征 Ⅱ/);
    assert.match(body, /遠征 Ⅲ/);
    assert.doesNotMatch(body, /遠征 Ⅰ/);
    assert.ok(app.innerHTML.indexOf("path-badge") >= 0, "category buttons carry no badge");
  });

  test("each category button binds to its own expedition's volume", () => {
    /* fake DOM は過去の描画の要素も残すので、オーストラリアの volume に
       紐づくボタンだけを見る (マダガスカルにも kom_kuku_run がある)。 */
    const buttons = app.querySelectorAll("[data-cat]")
      .filter(b => String(b.attrs["data-volume-id"] || "").indexOf("australia") >= 0);
    const ratioButton = buttons.filter(b => b.attrs["data-cat"] === "kom_ratio")[0];
    assert.ok(ratioButton, "expedition two's category is not on the panel");
    assert.equal(ratioButton.attrs["data-volume-id"], "volume_fixture_australia_2",
      "the button must feed the expedition that owns the category");
    const piButton = buttons.filter(b => b.attrs["data-cat"] === "kom_pi314")[0];
    assert.ok(piButton, "expedition three's category is not on the panel");
    assert.equal(piButton.attrs["data-volume-id"], "volume_fixture_australia_3");
  });

  /* 地域図鑑: 全巻一括 + 遠征チップ。 */
  app.querySelector('[data-action="zukan"]').click();

  test("the region zukan merges every volume and offers expedition chips", () => {
    const body = plain();
    assert.match(body, /オーストラリアの ずかん/);
    assert.ok(app.innerHTML.indexOf('data-filter="expedition"') >= 0, "no expedition chips");
    /* placeholder の I は除外し、公開済みの II / III だけを凍結表示する。 */
    assert.match(body, /Ⅱ 0／3/);
    assert.match(body, /Ⅲ 0／2/);
    assert.match(body, /合計 0／5/);
    assert.doesNotMatch(body, /Ⅰ 0／11/);
    const cards = (app.innerHTML.match(/zukan-card/g) || []).length;
    assert.equal(cards, 5, "the grid does not merge only the released volumes: " + cards);
  });

  test("the expedition chip narrows the grid to one volume", () => {
    const chip = app.querySelectorAll('[data-filter="expedition"]').filter(c => c.attrs["data-value"] === "Ⅲ")[0];
    assert.ok(chip, "no chip for expedition three");
    chip.click();
    const cards = (app.innerHTML.match(/zukan-card/g) || []).length;
    assert.equal(cards, 2, "the filter must leave only expedition three's species: " + cards);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
