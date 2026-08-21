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
    assert.equal(Number.isInteger(komorebi.currentRelease()) && komorebi.currentRelease() >= 1, true);
  });

  test("the eight recitation tables unlock in teaching order, two per update", () => {
    /* 指導順 (2, 5, 3, 4, 6, 7, 8, 9) を 2 本ずつの倍速で出す (2026-08-14 決定:
       すでに 7×8 を足し算処理しており、段は 8 週間で出揃わせる)。
       エンジンは段番号駆動なので実装は CATEGORIES の 1 行だけ。 */
    const dans = Object.keys(komorebi.categories)
      .map(cat => /^kom_kuku_dan(\d)$/.exec(cat))
      .filter(Boolean)
      .map(m => ({ cat: m[0], dan: Number(m[1]), release: komorebi.categories[m[0]].release }))
      .sort((a, b) => a.release - b.release);
    assert.deepEqual(dans.map(entry => entry.dan), [2, 5, 3, 4, 6, 7, 8, 9]);
    assert.deepEqual(dans.map(entry => entry.release), [1, 1, 2, 2, 3, 3, 4, 4]);
    dans.forEach(entry => {
      assert.ok(komorebi.sessionStarters[entry.cat], entry.cat + " has no starter");
      assert.equal(komorebi.categories[entry.cat].course, "k5");
      /* 段番号がそのままエンジンへ渡ることを、句の生成まで下りて確かめる。 */
      const chunks = context.Q4B_KOMOREBI_KUKU_DAN2.buildSet(entry.dan, 1, () => 0.5);
      assert.equal(chunks.length, 5);
      assert.equal(chunks[0].dan, entry.dan);
      assert.equal(chunks[0].phrases[0].phrase, context.Q4B_KUKU_PHRASES.phrase(entry.dan, chunks[0].phrases[0].b));
    });
  });

  /* 更新カレンダー (docs/komorebi_release_linkage.md 2 章) の 1 行を読む。
     行頭の更新番号は "1 (初回)" のように注記が付くことがある。 */
  function calendarRow(calendar, update){
    const row = new RegExp("\\|\\s*" + update + "(?:\\s*\\([^)]*\\))?\\s*\\|[^|]*\\|[^|]*\\|([^|]*)\\|").exec(calendar);
    assert.ok(row, "the calendar no longer has a row for update " + update);
    return row[1].split("+").map(text => text.trim()).filter(text => text && text.indexOf("なし") < 0);
  }

  test("the released set matches the update calendar up to the current release", () => {
    /* 公開済み集合は「更新 1 から CURRENT_RELEASE までの行の和」。1 行だけを見ると
       CURRENT_RELEASE を上げた瞬間に必ず落ちるので、番号ぶんの行を足して比べる。 */
    const calendar = fs.readFileSync(path.join(root, "docs/komorebi_release_linkage.md"), "utf8");
    const planned = [];
    for(let update = 1; update <= komorebi.currentRelease(); update++){
      calendarRow(calendar, update).forEach(cat => planned.push(cat));
    }
    const released = Object.keys(komorebi.categories).filter(komorebi.isReleased).sort();
    assert.deepEqual(released, planned.slice().sort(), "the shipped set differs from the calendar");
  });

  test("section 4's volume freeze checklist still asks for guild coverage", () => {
    /* 公開する各道具に対象種が 1 種以上いるかの確認 (guild カバレッジ)。volume
       freeze (分母確定) の直前に見るべき項目で、抜けると道具だけ公開されて
       実際には何も拾えない volume ができる (komorebi_tools_implementation_plan.md
       Phase 2 観測 3)。4 章の外へ迷い込んでいないことも合わせて見る。 */
    const doc = fs.readFileSync(path.join(root, "docs/komorebi_release_linkage.md"), "utf8");
    const section4 = doc.split(/^## 4\. /m)[1].split(/^## 5\. /m)[0];
    assert.match(section4, /volume freeze/, "volume freeze の項目が見当たらない");
    assert.match(section4, /guild カバレッジ/, "guild カバレッジのチェック項目が消えた");
    assert.match(section4, /対象種が1種以上/, "対象種が1種以上いるかの条件が消えた");
  });

  /* 次の更新のカテゴリを先に実装した状況を作る。volume 側も先に挙げてしまった、
     という最悪のケースを再現する。番号は CURRENT_RELEASE の 1 つ先に取り、
     公開番号を上げてもこのケースが「未公開」であり続けるようにする。 */
  const nextRelease = komorebi.currentRelease() + 1;
  komorebi.categories.kom_future_demo = { course: "k10", name: "みらいの小道", maxLv: 10, release: nextRelease };
  volume.categories.push("kom_future_demo");
  trophies.list().push({ trophyId: "future_demo", cat: "kom_future_demo", speciesId: "oo_onaga_yamamayu",
    regionId: "madagascar", regionName: "マダガスカルえんせい" });

  app.querySelector('[data-action="trophies"]').click();
  app.querySelector('[data-action="back"]').click();

  test("a category of a future update never reaches the path panel", () => {
    assert.equal(komorebi.isReleased("kom_future_demo"), false);
    assert.equal(app.querySelector('[data-cat="kom_future_demo"]'), null, "the unreleased category is tappable");
    assert.equal(plain().indexOf("みらいの小道"), -1, "the unreleased category is named on screen");
    /* release で絞ったあと、現在コース k5 の公開済みカテゴリだけが残ること。 */
    assert.equal(app.querySelector('[data-cat="kom_ratio"]'), null, "a released k10 category leaked into k5");
    assert.ok(app.querySelector('[data-cat="kom_kuku_run"]'));
  });

  app.querySelector('[data-action="trophies"]').click();

  test("a volume staged for a future update stays off the map", () => {
    /* 事前準備方式の要。未来の巻を manifest に仕込んでも、CURRENT_RELEASE を
       上げるまで地図にも図鑑にも出ない。デプロイ = 番号を上げるだけ。
       いまはトロフィーページに居るので、仕込んでから地図へ戻って再描画させる。 */
    context.Q4B_KOMOREBI_VOLUMES.volume_future_stage = {
      id: "volume_future_stage", regionId: "australia", regionName: "オーストラリア",
      current: false, expedition: 9, release: nextRelease,
      categories: ["kom_kuku_run"], blurb: "未来の巻。", frozen: true, denominator: 1,
      species: [{ id: "kom_future_stage_sr_01", rarity: "SSR", flagship: true }]
    };
    app.querySelector('[data-action="back"]').click();
    assert.equal(app.innerHTML.indexOf("volume_future_stage"), -1, "the staged volume leaked to the map");
    assert.equal(plain().indexOf("遠征 Ⅱ"), -1, "the staged expedition is visible before its release");
    delete context.Q4B_KOMOREBI_VOLUMES.volume_future_stage;
    /* 次のテストはトロフィーページ前提なので戻しておく。 */
    app.querySelector('[data-action="trophies"]').click();
  });

  test("the real Australia II volume (release 6) stays staged and off every surface", () => {
    /* 事前準備方式の実データ版。オーストラリア遠征 II は release:6 で manifest に
       仕込み済みで、種 id は bugs.js に実在する。CURRENT_RELEASE が 6 に届くまで
       地図 (ピンの分母)・地域図鑑・抽選 (いずれも regionList 経由) に出ないこと。 */
    const au2 = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_australia_2;
    assert.ok(au2, "AU II manifest entry is missing");
    assert.equal(au2.release, 6);
    assert.equal(au2.expedition, 2);
    assert.equal(au2.frozen, true);
    assert.equal(au2.denominator, 84);
    assert.equal(au2.species.length, 84);
    const flagships = au2.species.filter(species => species.flagship);
    assert.equal(flagships.length, 1, "AU II must have exactly one flagship");
    assert.equal(flagships[0].id, "anoplognathus_viridiaeneus");
    assert.equal(flagships[0].rarity, "SSR");
    assert.ok(au2.release > komorebi.currentRelease(),
      "AU II is expected to be staged; update the release-gate fixtures when it ships");
    /* 地図へ戻って再描画し、巻もその分母も現れないことを見る。 */
    app.querySelector('[data-action="back"]').click();
    assert.equal(app.innerHTML.indexOf("volume_fixture_australia_2"), -1, "AU II leaked into the map");
    assert.equal(plain().indexOf("遠征 Ⅱ"), -1, "AU II is visible before its release");
    const pin = app.querySelector('[data-region-id="australia"]');
    assert.ok(pin, "the australia pin disappeared");
    assert.match(pin.getAttribute("aria-label"), /／84、/, "the australia denominator counted the staged volume");
    app.querySelector('[data-action="trophies"]').click();
  });

  test("the real Borneo I volume (release 3) stays staged and off every surface", () => {
    /* 事前準備方式の実データ版その 2。ボルネオ遠征 I は release:3 で manifest に
       仕込み済みで、種 id は bugs.js に実在する。AU II と違い、ボルネオには公開済みの
       巻が 1 つも無いので、CURRENT_RELEASE が 3 に届くまで地図のピン自体が出ない
       (旧 placeholder の合成 fixture は「…」ピンを出していた)。 */
    const borneo = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_borneo;
    assert.ok(borneo, "Borneo I manifest entry is missing");
    assert.equal(borneo.release, 3);
    assert.equal(borneo.expedition, 1);
    assert.equal(borneo.frozen, true);
    assert.equal(borneo.placeholder, undefined, "Borneo I must no longer be a placeholder");
    assert.equal(borneo.denominator, 84);
    assert.equal(borneo.species.length, 84);
    const flagships = borneo.species.filter(species => species.flagship);
    assert.equal(flagships.length, 1, "Borneo I must have exactly one flagship");
    assert.equal(flagships[0].id, "trogonoptera_brookiana");
    assert.equal(flagships[0].rarity, "SSR");
    assert.ok(borneo.release > komorebi.currentRelease(),
      "Borneo I is expected to be staged; update the release-gate fixtures when it ships");
    /* 地図へ戻って再描画し、巻もピンも現れないことを見る。 */
    app.querySelector('[data-action="back"]').click();
    assert.equal(app.innerHTML.indexOf("volume_fixture_borneo"), -1, "Borneo I leaked into the map");
    assert.equal(plain().indexOf("ボルネオ"), -1, "Borneo is visible before its release");
    assert.equal(app.querySelector('[data-region-id="borneo"]'), null, "the borneo pin appeared before its release");
    app.querySelector('[data-action="trophies"]').click();
  });

  test("the real Madagascar II volume (release 5) stays staged and off every surface", () => {
    /* 事前準備方式の実データ版その 3。マダガスカル遠征 II は release:5 で manifest に
       仕込み済みで、種 id は bugs.js に実在する。AU II と同じく地域には公開済みの
       巻 (MG I) があるので、ピンは出るが分母は MG I の 84 のまま動かないこと。 */
    const mg2 = context.Q4B_KOMOREBI_VOLUMES.volume_fixture_madagascar_2;
    assert.ok(mg2, "MG II manifest entry is missing");
    assert.equal(mg2.release, 5);
    assert.equal(mg2.expedition, 2);
    assert.equal(mg2.frozen, true);
    assert.equal(mg2.denominator, 80);
    assert.equal(mg2.species.length, 80);
    const flagships = mg2.species.filter(species => species.flagship);
    assert.equal(flagships.length, 1, "MG II must have exactly one flagship");
    assert.equal(flagships[0].id, "phyllocrania_paradoxa");
    assert.equal(flagships[0].rarity, "SSR");
    assert.ok(mg2.release > komorebi.currentRelease(),
      "MG II is expected to be staged; update the release-gate fixtures when it ships");
    /* 地図へ戻って再描画し、巻もその分母も現れないことを見る。 */
    app.querySelector('[data-action="back"]').click();
    assert.equal(app.innerHTML.indexOf("volume_fixture_madagascar_2"), -1, "MG II leaked into the map");
    assert.equal(plain().indexOf("遠征 Ⅱ"), -1, "MG II is visible before its release");
    const pin = app.querySelector('[data-region-id="madagascar"]');
    assert.ok(pin, "the madagascar pin disappeared");
    assert.match(pin.getAttribute("aria-label"), /／84、/, "the madagascar denominator counted the staged volume");
    app.querySelector('[data-action="trophies"]').click();
  });

  test("an unreleased trophy does not sit on the goal board", () => {
    /* 目標ボードに出るのは「公開済み × いまのコース (k5)」のメダルだけ。枚数は
       CURRENT_RELEASE で動くので、期待値も同じ規則から作る (kom_future_demo は
       このテストの中で足した k10 の偽カテゴリなので、どちらにせよ入らない)。 */
    const slots = trophies.list().filter(trophy => {
      const entry = komorebi.categories[trophy.cat];
      return entry && komorebi.isReleased(trophy.cat) && entry.course === "k5";
    }).length;
    assert.ok(slots > 0, "the k5 goal board went empty");
    assert.match(plain(), new RegExp("0／" + slots), "the trophy page counted another course or an unreleased slot: " + plain().slice(0, 200));
    assert.equal((app.innerHTML.match(/kom-trophy-slot/g) || []).length, slots);
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
