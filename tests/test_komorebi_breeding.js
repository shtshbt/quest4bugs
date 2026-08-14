/* 産卵システムの小道接続 (komorebi_breeding_bonus_gaps 決定 1-3 + 専用スロット枠)。
   小道種の卵は egg.game="komorebi" で小道の正答だけで育ち、スロットは本編 3 枠と
   別勘定。これが緩むと「小道の卵が本編の正答で育つ」「停滞した小道卵が本編の
   育成を塞ぐ」のどちらかが起きる。
   node tests/test_komorebi_breeding.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { bootKomorebi, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const reward = context.Q4BReward;
  const komorebi = context.Q4B_KOMOREBI;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

  test("the komorebi page loads the shared breeding UI", () => {
    const page = fs.readFileSync(path.join(root, "komorebi/index.html"), "utf8");
    assert.ok(page.indexOf("../shared/breeding.js") > page.indexOf("../shared/reward.js"));
  });

  test("the komorebi zukan detail receives its collection", () => {
    const source = fs.readFileSync(path.join(root, "komorebi/app.js"), "utf8");
    assert.match(source, /detailHTML\(record,sp,\{coll:breedingCollection\(\)/);
  });

  test("the shiny summary includes the komorebi collection", () => {
    const source = fs.readFileSync(path.join(root, "shared/shiny_bonus.js"), "utf8");
    assert.match(source, /QuestSave\.load\("komorebi",pid\)/);
    assert.match(source, /komorebi\.collection && komorebi\.collection\.catches/);
  });

  /* keisan/app.js が配線する QuestSave adapter は fake 環境に実体が無いので、
     テスト用の明示ストアで置き換える (実ページでは QuestSave 側が同じ役を担う)。 */
  const store = { bs: { eggs: [], pendingEggs: [], stats: { totalAbandoned: 0 } } };
  reward.setEggStore({ get(){ return store.bs; }, save(s){ store.bs = s; return true; } });
  const wallet = { amber: 0, fossil: 60 };
  reward.setAmberStore({
    get(){ return wallet.amber; },
    add(n){ wallet.amber += n; return wallet.amber; },
    spend(n){ if(wallet.amber < n) return false; wallet.amber -= n; return true; }
  });
  reward.setFossilStore({
    pid(){ return "p1"; },
    get(){ return wallet.fossil; },
    spend(n){ if(wallet.fossil < n) return false; wallet.fossil -= n; return true; },
    refund(n){ wallet.fossil += n; return true; }
  });

  const komSp = reward.spById("medama_yamamayu");
  const honSp = reward.spById("goliath_beetle");

  test("a komorebi species' egg belongs to the komorebi game", () => {
    assert.equal(komSp.areaOnly, "komorebi");
    assert.equal(reward.eggGameFor(komSp), "komorebi");
    assert.equal(reward.eggGameFor(honSp), "keisan");
    assert.ok(komSp.metamorphosis, "the stock species must be layable");
  });

  /* 本編枠 3 つを先に埋める。 */
  for(const id of ["goliath_beetle", "hirazu_gensei", "tarandus_kuwagata"]){
    const egg = await reward.awardMasterEgg(null, reward.spById(id), "m");
    assert.ok(egg, id + " egg was not created");
  }

  const komEgg = await reward.awardMasterEgg(null, komSp, "f");

  test("a full main pool does not push the komorebi egg to the queue", () => {
    assert.ok(komEgg, "the komorebi egg was not created");
    assert.equal(store.bs.eggs.length, 4, "the komorebi egg must take its own slot");
    assert.equal(store.bs.pendingEggs.length, 0);
    assert.equal(store.bs.eggs[3].game, "komorebi");
  });

  await reward.feedEgg("komorebi", 1);

  test("feeding the path grows only the komorebi egg", () => {
    assert.equal(store.bs.eggs[3].progress, 1);
    assert.equal(store.bs.eggs[0].progress, 0, "a main egg advanced from komorebi feed");
  });

  await reward.feedEgg("keisan", 1);

  test("feeding the main game leaves the komorebi egg alone", () => {
    assert.equal(store.bs.eggs[0].progress, 1);
    assert.equal(store.bs.eggs[3].progress, 1, "the komorebi egg advanced from keisan feed");
  });

  /* 小道の捕獲記録 (小道 save 側の collection と同形) から産卵できること。 */
  const pairColl = { catches: { hagata_murasaki: { n: 2, records: [{ sex: "m" }, { sex: "f" }] } } };
  const laid = await reward.layEgg(pairColl, reward.spById("hagata_murasaki"), { profileId: "p1" });

  test("a male and female pair caught on the path can lay an egg", () => {
    assert.equal(laid.ok, true, "layEgg failed: " + laid.reason);
    assert.equal(laid.queued, false, "the second komorebi slot should be open");
    assert.equal(laid.egg.game, "komorebi");
    assert.equal(wallet.fossil, 60 - reward.eggCost(reward.spById("hagata_murasaki")),
      "the cost must come from fossil fragments earned in the main game");
  });

  /* 小道枠 3 を埋めて 4 個目は待機列へ。 */
  await reward.awardMasterEgg(null, reward.spById("benihoshi_oo_ageha"), "m");
  await reward.awardMasterEgg(null, reward.spById("oo_togeashi_kirigirisu"), "m");

  test("the fourth komorebi egg waits in the queue", () => {
    assert.equal(store.bs.eggs.filter(e => e.game === "komorebi").length, 3);
    assert.equal(store.bs.pendingEggs.length, 1);
    assert.equal(store.bs.pendingEggs[0].game, "komorebi");
  });

  const blocked = await reward.acceptPendingEgg();
  test("a pending egg cannot enter its full pool", () => {
    assert.equal(blocked, null);
  });

  await reward.abandonEgg("medama_yamamayu");
  const accepted = await reward.acceptPendingEgg();
  test("freeing a komorebi slot lets the waiting egg in", () => {
    assert.ok(accepted, "the pending egg was not accepted");
    assert.equal(accepted.game, "komorebi");
    assert.equal(store.bs.pendingEggs.length, 0);
  });

  /* 小道の有効正答 1 回 = こもれびの卵 +1 と こはく +1。本編の卵は動かない。 */
  const answer = { sessionId: "kb1", submissionId: "kb1-1", format: "normal", kind: "num", correct: true, final: true };
  await komorebi.recordAnswer("kom_ratio", answer, volume, () => 0.5);
  await settle();

  test("a counted answer on the path feeds komorebi eggs and earns amber", () => {
    assert.equal(wallet.amber, 1, "amber must go to the shared wallet");
    const kom = store.bs.eggs.filter(e => e.game === "komorebi");
    assert.equal(kom.length, 3);
    kom.forEach(egg => assert.equal(egg.progress || 0, 1, egg.id + " was not fed by the answer"));
    /* 本編の卵は先の feedEgg("keisan") の 1 のまま。小道の正答で 2 になっていたら混線。 */
    store.bs.eggs.filter(e => e.game !== "komorebi")
      .forEach(egg => assert.equal(egg.progress, 1, egg.id + " advanced from a komorebi answer"));
  });

  /* ヒント付き回答はゲージ同様に卵もこはくも進めない。 */
  const hinted = { sessionId: "kb1", submissionId: "kb1-2", format: "normal", kind: "num", correct: true, final: true, hintShown: true };
  await komorebi.recordAnswer("kom_ratio", hinted, volume, () => 0.5);
  await settle();

  test("a hinted answer feeds nothing", () => {
    assert.equal(wallet.amber, 1);
    const kom = store.bs.eggs.filter(e => e.game === "komorebi");
    kom.forEach(egg => assert.equal(egg.progress, 1));
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
