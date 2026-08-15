/* トロフィーページを画面から確かめる。判定 (test_komorebi_acceptance.js) が正しくても、
   入口が地図に出ない・未獲得の枠が並ばない・金色にならない、は画面側の話。
   node tests/test_komorebi_trophy_ui.js で実行。 */
const assert = require("node:assert/strict");
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
  const profile = komorebi.profile();
  const plain = () => plainText(app.innerHTML);

  test("the map carries a trophy entrance that counts what has been won", () => {
    const entrance = app.querySelector('[data-action="trophies"]');
    assert.ok(entrance, "no trophy entrance under the map: " + plain().slice(-200));
    assert.match(plain(), /0／3/, "the entrance does not show the course count: " + plain().slice(-160));
  });

  app.querySelector('[data-action="trophies"]').click();

  test("an empty trophy page is a goal board, not an empty room", () => {
    const text = plain();
    assert.match(text, /きんいろトロフィー/);
    assert.equal((app.innerHTML.match(/kom-trophy-slot/g) || []).length, 3, "every k5 category needs a slot");
    assert.equal((app.innerHTML.match(/is-locked/g) || []).length, 3);
    /* 条件が「Lv10 到達」ではなく「Lv10 クリア」であることが見える形になっていること。 */
    assert.match(text, /Lv10 クリア/);
    assert.match(text, /連続九九を Lv10 クリア/);
    assert.equal(text.indexOf("割合と比を Lv10 クリア"), -1, "a k10 trophy leaked into the k5 denominator");
    assert.ok(text.indexOf("🔒") >= 0, "locked slots need a lock");
  });

  /* 安定判定を満たしてから戻る。 */
  profile.maxLv.kom_kuku_run = 10;
  profile.lv.kom_kuku_run = 10;
  for(let i = 0; i < 20; i++) trophies.noteAnswer(profile, "kom_kuku_run", 10, true);
  assert.ok(trophies.award(profile, "kom_kuku_run", "2026-08-13"));

  app.querySelector('[data-action="back"]').click();
  app.querySelector('[data-action="trophies"]').click();

  test("a won trophy shows the gold insect, its name and the date", () => {
    const text = plain();
    assert.equal((app.innerHTML.match(/is-earned/g) || []).length, 1);
    assert.equal((app.innerHTML.match(/is-locked/g) || []).length, 2);
    assert.match(text, /マダガスカルえんせいの きんいろオオトゲアシキリギリス/);
    assert.match(text, /2026-08-13 かくとく/);
    assert.match(plain(), /1／3/);
  });

  test("the gold rendering swaps colours only and leaves the catalog untouched", () => {
    const reward = context.Q4BReward;
    const sp = reward.spById("oo_togeashi_kirigirisu");
    assert.equal(Array.from(sp.colors).join(","), "#5A6E38,#C9A24B", "the catalog entry was recoloured in place");
    assert.ok(app.innerHTML.indexOf(trophies.goldColors[0]) >= 0, "the gold palette is not in the rendered slot");
    /* 未獲得の枠には虫を描かない。先に見せると獲得の意味が薄れる。 */
    const locked = app.innerHTML.match(/<li class="kom-trophy-slot is-locked">[\s\S]*?<\/li>/g) || [];
    assert.equal(locked.every(slot => slot.indexOf("<svg") < 0), true, "a locked slot is showing the insect already");
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
