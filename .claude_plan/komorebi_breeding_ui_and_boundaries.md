# 小道の育成 UI と境界仕様の確定 (2026-08-14 ユーザ決定 4 件の実装)

決定: ①小道の図鑑詳細に育成セクションを出す (教科図鑑と同じ) ②色違いサマリー・称号の集計に小道の色違いを数える ③records は無制限のまま様子見 (500KB 監視だけ仕込む) ④小道スロット段の「＋」は全体ピッカーのまま (作業なし)。

round 3 (.claude_plan/storage_sync_hardening.md) と round 4 (.claude_plan/lay_path_robustness.md) の後に適用する。指摘箇所のみ直し、他の挙動を変えない。

## 1. 小道の図鑑詳細に育成セクション

- komorebi/index.html: `../shared/breeding.js` を reward.js の後に読み込む (sw.js CORE には登録済みなので boot テストは通るはず。?v= は他ページと同じ版を使う)
- komorebi/app.js の図鑑詳細モーダル (1859 行付近、`Q4BZukan.detailHTML(record, sp, {})`) に opts を渡す:
  - `coll`: `{catches: profile.collection.catches, total: profile.collection.totalCatches}`
  - `onLayEgg` / `onAbandonEgg` (zukan_detail.js の opts 契約を確認し、keisan/app.js の keisanLayEgg / keisanAbandonEgg / keisanHatchEgg を手本に komorebi 版ハンドラを実装する)
- komorebi 版ハンドラ:
  - lay: `Q4BBreeding.openLayConfirm(sp, {coll: 上記, profileId, homeHref: "../index.html", onSuccess: モーダル再描画})`。かけら・breeding kv 側の話なので komorebi profile の保存は不要
  - hatch: `Q4BReward.hatchEgg(coll, id)` の成功後に `saveProfile()` (round 3 で CAS 化済みの経路) → モーダルと画面を再描画。失敗時は alert (本編と同文言)
  - abandon: 本編と同じ confirm → `Q4BReward.abandonEgg(id)` → 再描画
- 管理 (スロット一覧・待機列・受け取り) は御神木のまま。ここは種単位の詳細だけ

## 2. 色違い集計に小道を含める

- shared/shiny_bonus.js の `shinySpeciesCount()` (と称号 `shinyTitle` が使う同じ集計) の集計元に komorebi save の `collection.catches` を追加する。既存の keisan/kanji/eitango/battle と同じ形に合わせる (非同期 load なら Promise.all に 1 本追加)
- index.html のポータル側でこの集計を呼ぶ箇所があれば同様に komorebi を含める
- 対象は「集計・表示のみ」。めざめのしずくの色違い化 picker (addShinyCandidates) は本編のみのまま変えない (雫は本編の資源なので使途も本編、と docs に明記)

## 3. save.json 500KB 監視

- shared/storage.js の snapshot push 経路 (pushSnapshotRaw か snapshotDoc の呼び出し側) で、直列化サイズが 500KB を超えたら `console.warn` を 1 セッション 1 回出す (文言例: "[Q4BStorage] save.json が 500KB を超えました。records 圧縮の検討時期です")。UI には出さない

## 4. docs 追記

- docs/komorebi_breeding_bonus_gaps.md の未決事項を更新: 1 (露出範囲) は「図鑑詳細にも出す」で確定済みに、色違い集計・records ポリシー・「＋」スコープの 3 決定を §1 の決定表 or §6 に追記

## 回帰テスト

- tests/test_komorebi_breeding.js に追加 (または新設):
  1. komorebi/index.html が breeding.js を読み込んでいる (source 検査)
  2. komorebi/app.js の detailHTML 呼び出しが coll を渡している (source 検査)
  3. shiny_bonus の集計に komorebi が含まれる (source 検査か、可能なら機能検証)
- 既存全テスト green を維持 (特に test_komorebi_boot.js の page↔CORE 整合)

## cache busting

- 変更 js (komorebi/app.js、shared/shiny_bonus.js、shared/storage.js) の ?v= を参照ページで +0.0.1。sw.js の CACHE bump は commit 時にオーケストレータ側で行う (並行 round との衝突回避)

## 検収

- `for f in tests/test_*.js; do node $f; done` 全 green
- zukan_cards/ 配下は diff 判定から除外 (並走写真バッチ)
- commit はしない (レビュー後にこちらで行う)
