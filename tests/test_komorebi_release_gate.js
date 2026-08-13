/* 段階リリースのゲート。実装を先へ進めて公開だけ後から解禁するため、
   CURRENT_RELEASE を超えるカテゴリは volume manifest が挙げていても画面に出さない。
   これが緩むと「実装済み未公開」が次の deploy でそのまま子どもの画面に出る。
   node tests/test_komorebi_release_gate.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k5" });
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const trophies = context.Q4B_KOMOREBI_TROPHIES;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;
  const plain = () => plainText(app.innerHTML);

  test("every released category is fully wired and every future one is declared", () => {
    Object.keys(komorebi.categories).forEach(cat => {
      const entry = komorebi.categories[cat];
      assert.equal(Number.isInteger(entry.release), true, cat + " has no release number");
      assert.equal(entry.release >= 1, true, cat + " has a nonsensical release number");
      if(komorebi.isReleased(cat)){
        assert.ok(komorebi.sessionStarters[cat], cat + " is released but cannot be started");
        assert.ok(trophies.forCat(cat), cat + " is released but has no trophy");
      }
    });
    assert.equal(komorebi.currentRelease(), 1);
  });

  test("the release number matches the first row of the update calendar", () => {
    /* 更新カレンダー (docs/komorebi_release_linkage.md 2 章) との齟齬を防ぐ。 */
    const calendar = fs.readFileSync(path.join(root, "docs/komorebi_release_linkage.md"), "utf8");
    const row = /\|\s*1 \(初回\)\s*\|[^|]*\|[^|]*\|([^|]*)\|/.exec(calendar);
    assert.ok(row, "the calendar no longer has a first update row");
    const planned = row[1].split("+").map(text => text.trim()).filter(Boolean);
    const released = Object.keys(komorebi.categories).filter(komorebi.isReleased).sort();
    assert.deepEqual(released, planned.slice().sort(), "the shipped set differs from the calendar");
  });

  /* 更新 2 のカテゴリを先に実装した状況を作る。volume 側も先に挙げてしまった、
     という最悪のケースを再現する。 */
  komorebi.categories.kom_future_demo = { course: "k10", name: "みらいの小道", maxLv: 10, release: 2 };
  volume.categories.push("kom_future_demo");
  trophies.list().push({ trophyId: "future_demo", cat: "kom_future_demo", speciesId: "oo_onaga_yamamayu",
    regionId: "madagascar", regionName: "マダガスカルえんせい" });

  app.querySelector('[data-action="trophies"]').click();
  app.querySelector('[data-action="back"]').click();

  test("a category of a future update never reaches the path panel", () => {
    assert.equal(komorebi.isReleased("kom_future_demo"), false);
    assert.equal(app.querySelector('[data-cat="kom_future_demo"]'), null, "the unreleased category is tappable");
    assert.equal(plain().indexOf("みらいの小道"), -1, "the unreleased category is named on screen");
    /* 公開済みの 3 本はそのまま出ていること (ゲートが効きすぎていない)。 */
    assert.ok(app.querySelector('[data-cat="kom_ratio"]'));
    assert.ok(app.querySelector('[data-cat="kom_kuku_run"]'));
  });

  app.querySelector('[data-action="trophies"]').click();

  test("an unreleased trophy does not sit on the goal board", () => {
    assert.match(plain(), /0／3/, "the trophy page counted an unreleased slot: " + plain().slice(0, 200));
    assert.equal((app.innerHTML.match(/kom-trophy-slot/g) || []).length, 3);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
