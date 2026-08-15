/* 小道のこはく UI (獲得の見える化 / 残高表示 / こはくで よぶ)。
   feedSideRewards の返り値は recordAnswer の result.amberGained として観測し、
   フィードバック行は feedbackHtml を関数単位で、残高とよぶボタンは fake DOM の
   画面遷移で固定する。よぶ は 残高不足 / 成功 / 保存失敗の返金 の 3 経路を見る。
   node tests/test_komorebi_amber_ui.js で実行。 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { bootKomorebi, plainText, KOMOREBI_FILES } = require("./fake_dom.js");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/* ---- フィードバック行 (DOM なし) ---- */

const unit = { console, setTimeout, clearTimeout };
unit.window = unit;
unit.Q4B_KOMOREBI_NO_BOOT = true;
vm.createContext(unit);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js", "komorebi/app.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), unit);
}
const question = { cat: "kom_ratio", format: "normal", kind: "num", text: "た", ans: 5 };

test("feedbackHtml shows the amber pickup line only when whole amber arrived", () => {
  const html = unit.Q4B_KOMOREBI.feedbackHtml(question, true, { capture: null, amberGained: 2 });
  assert.match(html, /ratio-amber-gain/);
  assert.match(html, /🔶 こはくを 2こ ひろった！/);
});

test("feedbackHtml stays silent for zero, missing, or incorrect amber results", () => {
  assert.doesNotMatch(unit.Q4B_KOMOREBI.feedbackHtml(question, true, { capture: null, amberGained: 0 }), /ratio-amber-gain/);
  assert.doesNotMatch(unit.Q4B_KOMOREBI.feedbackHtml(question, true, { capture: null }), /ratio-amber-gain/);
  assert.doesNotMatch(unit.Q4B_KOMOREBI.feedbackHtml(question, false, { capture: null, amberGained: 1 }), /ratio-amber-gain/);
});

/* ---- 返り値のタイミングと画面 smoke (fake DOM) ---- */

(async () => {
  const context = bootKomorebi({ root, files: KOMOREBI_FILES, profileType: "k10" });
  await settle();
  const app = context.__app;
  const plain = () => plainText(app.innerHTML);
  const komorebi = context.Q4B_KOMOREBI;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

  /* ハーネスの QuestSave は amber API を持たないので、最小の共有ウォレットを注入する。
     keisan/app.js が配線済みの amberStore (earnAmber 側) も同じ台帳に落ちる。 */
  const wallet = new Map();
  context.QuestSave.amberOf = pid => wallet.get(pid) || 0;
  context.QuestSave.amberAdd = (pid, n) => { wallet.set(pid, (wallet.get(pid) || 0) + (n || 0)); return wallet.get(pid); };
  context.QuestSave.amberSpend = (pid, n) => {
    const now = wallet.get(pid) || 0;
    if(now < n) return false;
    wallet.set(pid, now - n);
    return true;
  };
  const alerts = [];
  context.alert = message => alerts.push(String(message));

  const answer = id => ({ sessionId: "amber-ui", submissionId: id, format: "normal", kind: "num", correct: true, final: true });

  await (async () => {
    const fresh = await komorebi.recordAnswer("kom_ratio", answer("a-1"), volume, () => 0.5);
    test("an unmastered counted answer grants exactly one amber", () => {
      assert.equal(fresh.amberGained, 1);
      assert.equal(wallet.get("p1"), 1);
      assert.equal(komorebi.profile().collection.amberAcc, 0);
    });

    komorebi.profile().maxLv.kom_ratio = komorebi.categories.kom_ratio.maxLv;
    const gains = [];
    for(const id of ["a-2", "a-3", "a-4"]){
      const result = await komorebi.recordAnswer("kom_ratio", answer(id), volume, () => 0.5);
      gains.push(result.amberGained);
    }
    test("mastered decay accumulates 0.4 per answer and pays out on the third", () => {
      assert.deepEqual(gains, [0, 0, 1]);
      assert.equal(wallet.get("p1"), 2);
      assert.ok(Math.abs(komorebi.profile().collection.amberAcc - 0.2) < 1e-9);
    });
  })();

  app.querySelector('[data-action="zukan"]').click();

  test("the region zukan header shows the balance and the call button", () => {
    assert.match(plain(), /マダガスカルの ずかん/);
    assert.match(plain(), /🔶 こはく：2/);
    assert.ok(app.querySelector('[data-action="amber-call"]'), "no call button");
    assert.match(plain(), /🔶 こはくで よぶ（30）/);
  });

  await (async () => {
    const catchesBefore = Object.keys(komorebi.profile().collection.catches).length;
    app.querySelector('[data-action="amber-call"]').click();
    await settle();
    test("an insufficient balance alerts and captures nothing", () => {
      assert.equal(alerts.length, 1);
      assert.match(alerts[0], /🔶こはくが たりないよ（30こ いるよ）/);
      assert.equal(wallet.get("p1"), 2);
      assert.equal(Object.keys(komorebi.profile().collection.catches).length, catchesBefore);
      assert.equal(komorebi.profile().collection.totalCatches, 0);
    });
  })();

  await (async () => {
    context.QuestSave.amberAdd("p1", 33);   /* 残高 35 に補充 */
    app.querySelector('[data-action="amber-call"]').click();
    await settle();
    test("a funded call spends 30 amber and lands one capture", () => {
      assert.equal(alerts.length, 1, "success must not alert");
      assert.equal(wallet.get("p1"), 5);
      assert.equal(komorebi.profile().collection.totalCatches, 1);
      assert.equal(Object.keys(komorebi.profile().collection.catches).length, 1);
      assert.equal(context.__saved.komorebi.collection.totalCatches, 1, "the capture must be persisted");
      assert.match(plain(), /あつめた虫\s+1／84/);
    });
  })();

  await (async () => {
    context.QuestSave.amberAdd("p1", 30);   /* 残高 35 に補充 */
    const saveVersioned = context.QuestSave.saveVersioned;
    context.QuestSave.saveVersioned = () => Promise.reject(new Error("boom"));
    app.querySelector('[data-action="amber-call"]').click();
    await settle();
    context.QuestSave.saveVersioned = saveVersioned;
    test("a failed save refunds the 30 amber and rolls the capture back", () => {
      assert.equal(alerts.length, 2);
      assert.match(alerts[1], /ほぞんに しっぱいしました。こはくは かえしたよ/);
      assert.equal(wallet.get("p1"), 35);
      assert.equal(komorebi.profile().collection.totalCatches, 1);
    });
  })();

  await (async () => {
    /* farming 対策の回帰: 購入捕獲は救済段位を使わず、進めず、壊さない。
       段位 4 (次のゲージ捕獲は 100% 救済) の状態で呼んでも、段位 4 がそのまま
       残ること (旧実装は新種で段位を消し、重複で段位を上書きしていた)。 */
    komorebi.profile().collection.pityDuplicates = 4;
    context.QuestSave.amberAdd("p1", 30);   /* 35+30=65 → 30 消費で 35 に戻り、後続の残高期待を保つ */
    app.querySelector('[data-action="amber-call"]').click();
    await settle();
    test("a purchased call ignores the pity ladder and leaves it untouched", () => {
      assert.equal(komorebi.profile().collection.totalCatches, 2, "the call itself must land");
      assert.equal(komorebi.profile().collection.pityDuplicates, 4, "the learning pity ladder must survive a purchase");
    });
  })();

  test("the common zukan shows the balance but no call button", () => {
    app.querySelector('[data-action="back"]').click();
    app.querySelector('[data-action="path-zukan"]').click();
    assert.match(plain(), /こもれびの ずかん/);
    assert.match(plain(), /🔶 こはく：35/);
    assert.equal(app.querySelector('[data-action="amber-call"]'), null);
    app.querySelector('[data-action="back"]').click();
  });

  test("the path foot carries a compact amber chip", () => {
    assert.ok(app.querySelector(".path-amber"), "no path-foot amber chip");
    assert.match(plain(), /🔶35/);
  });

  console.log(`RESULT ${passed} passed, 0 failed`);
})().catch(error => { console.error(error); process.exit(1); });
