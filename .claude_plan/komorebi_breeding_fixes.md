# 産卵×小道接続 (cfaf52e) のレビュー指摘修正

strict-reviewer が commit cfaf52e に出した指摘 S1-S9 のうち、S1, S2, S3, S4, S5, S6(前半), S7, S9 を修正する。S6 後半 (小道ページの feed トースト) と S8 (keisan/app.js 副作用への依存の解消) は今回のスコープ外。既存の挙動を変えるのは指摘箇所のみ。コードは既存の文体 (var、無セミコロン差なし、日本語コメント) に合わせる。

前提: この branch (claude/komorebi-phase3) は未デプロイなので、既に _brokenEggs へ隔離された実ユーザデータは存在しない。復旧経路は作らない。

## S1 (Critical) storage.js が komorebi 卵を隔離削除する

- `shared/storage.js` の `_isValidEgg` 内 `var validGames = {kanji:1, keisan:1, eitango:1};` (1009 行付近) に `komorebi:1` を追加する。
- 同関数の `eggGameFor(sp) !== e.game` 検査は reward.js 側の変更 (areaOnly:"komorebi" → "komorebi") と整合するはずだが、実際に整合することをテストで固定する (下記の新規テスト)。
- cache busting: `shared/storage.js?v=` を全参照ページで `0.4.21` に統一して bump する。参照箇所は `grep -rn "storage.js?v=" *.html keisan/index.html kanji/index.html eitango/index.html komorebi/index.html` で全列挙して漏れなく (現状 0.4.18/0.4.19/0.4.20 と不揃い)。`sw.js` の `CACHE` を v130 → v131 に上げ、コメントに理由 (storage.js の komorebi 卵対応) を書く。

## S2 (Critical) homeEggPicked が komorebi save を merge していない

- `index.html` に helper `_loadAllCatches(pid)` を新設する: `QuestSave.load("keisan"/"kanji"/"eitango"/"komorebi", pid)` を `Promise.all` し、keisan/kanji は `.coll.catches`、eitango は `.catches`、komorebi は `.collection.catches` を、既存 `_homeEggOpenLayPicker` 内の `merge` と同じ規則 (records を concat) で 1 つの `{catches:...}` に merぐ。resolve 値は `virtColl`。
- `_homeEggOpenLayPicker` (1580 行付近)、`homeEggPicked` (1637 行付近)、`openParentZukan` (1514 行付近) の 3 箇所を `_loadAllCatches(pid)` 呼び出しに置き換える。挙動は現行 `_homeEggOpenLayPicker` の merge と同一 + komorebi 追加。openParentZukan は merge ではなく「entry を持つ最初の coll を選ぶ」方式なので、そこは現行ロジックを保ちつつ candidates に komorebi を含む形を維持する (helper を使わず現状の 4 namespace 版のままでもよい。無理に共通化して挙動を変えない)。

## S3 (Medium) _maybeReopenEggNest の旧 3 枠判定

- `index.html` 1618 行付近 `if((bs.pendingEggs||[]).length > 0 && (bs.eggs||[]).length < 3){` を pool 別判定に変える: `Q4BReward.eggPoolOf` で main/komorebi に分け、`mainEggs.length < (Q4BReward.EGG_SLOT_MAX||3) || komEggs.length < (Q4BReward.EGG_SLOT_MAX_KOMOREBI||3)` なら再オープン。

## S4 (Medium) 保存失敗時の こはく・卵 progress 二重加算

- `komorebi/app.js` の `recordAnswer` と `recordSubmission` で、`feedSideRewards(cat,result)` の呼び出しを `saveProfile()` 成功後 (`.then` の中、結果 return の直前) へ移す。失敗経路 (rollback) では呼ばれないこと。
- `tests/test_komorebi_breeding.js` は `await recordAnswer` 後に assert しているので変更不要のはずだが、実行して確認する。

## S7 (Low) 習熟減衰判定の経路間不一致

- `recordSubmission` では `applyPerformance` が maxLv を上げる前の値で減衰判定すべき。`applyAnswer` 呼び出し直後 (applyPerformance 前) に `var masteredAtAnswer = profile.maxLv && profile.maxLv[cat] >= CATEGORIES[cat].maxLv;` をスナップショットし、`feedSideRewards(cat, result, masteredAtAnswer)` に渡す。`feedSideRewards` は第 3 引数があればそれを使い、なければ現行の判定 (recordAnswer 経路用) を使う。

## S5 (Medium-low) 小道未開放の子に「🌿こもれび あき」が出る

- `index.html` の `homeEggAdd` で `slotsAvailableKomorebi` を渡すのは「小道の卵 (eggs か pendingEggs に game==="komorebi") が 1 つでもあるとき」だけにする。無ければ undefined のまま渡さない (breeding.js 側は `!= null` gate 済みなので変更不要)。

## S6 前半 (Low) 卵ゼロでも毎問 breeding kv を保存する

- `shared/reward.js` の `feedEgg` で、`_bs()` 取得後に「`egg.game === game` かつ `progress < target` の卵が 1 つも無ければ `_saveBs` せず `{ok:true, fed:false}` を返す」early return を足す。全教科共通の改善。既存テスト (t03_breeding 等) が「feed 後に必ず save される」ことに依存していないか実行して確認する。

## S9 (Low) acceptPendingEgg の同種ガード欠落

- `shared/reward.js` の `acceptPendingEgg` の空きプール探索ループに、`bs.eggs` に同 id が既に居る待機卵はスキップする条件を足す (promotePendingEgg と同じ規則)。

## 新規テスト (S1 の盲点対応)

- `tests/test_breeding_storage_komorebi.js` を新設する。既存テストの体裁 (先頭コメント、`let passed=0; function test(...)`、`RESULT N passed, 0 failed`) に合わせる。
- 実 `shared/storage.js` を node の vm で読み込む (localStorage / window の最小 stub が必要。参考実装がレビュー担当の再現スクリプト `/tmp/claude-1000/-mnt-c-Users-shota-Dropbox-Private-tools-quest4bugs/67de709a-8b6e-4afe-aebd-fd3ffb490f61/scratchpad/repro_storage_quarantine.js` にある。読めなければ自作してよい)。
- 固定する不変条件: ① game:"komorebi" の卵 (実在の小道種 id、たとえば medama_yamamayu) を `breedingSet` → `breedingOf` して隔離されず生き残る ② `_brokenEggs` が生えない ③ 3 教科の卵も従来どおり有効 ④ 出所不明 game (例 "battle") の卵は従来どおり隔離される。

## 検収

- `node tests/test_breeding_storage_komorebi.js` が green
- `for f in tests/test_*.js; do node $f; done` が全 green
- `git diff --name-only` が上記ファイル群のみ (storage.js / reward.js / breeding.js は触るのは指摘箇所のみ)
- commit はしない (レビュー後にこちらで行う)
