# 保存・同期の境界強化 (保存・同期・SW 監査の指摘)

監査 (2026-08-14) で見つかった保存・同期層の問題の修正。round 1 (.claude_plan/komorebi_breeding_fixes.md) と round 2 (.claude_plan/areaonly_exposure_fixes.md) の後に適用する。対象は shared/storage.js、index.html、komorebi/app.js、tests。指摘箇所のみ直し、他の挙動を変えない。

## 1. (Critical) mem の丸ごと clobber (bfcache / 2 タブ)

storage.js の `mem` は一度 load したら二度と localStorage を読み直さず、`persist()` はストア全体を 1 本の JSON で書く。bfcache から復元されたポータルで卵操作をすると、古いスナップショット全体が書き戻り、直前の小道セッション (Lv・捕獲・こはく・breeding) がまとめて消える or 孵化済み卵が復活して二重孵化する。

修正 (監査の緩和策 1+2):
- `persist()` で `q4b_store_gen` キーに単調増加の世代トークンを書く (`safeSet`)。`loadStore()` は毎回トークンだけ読み、`mem` 保持世代と不一致なら localStorage から再 parse + migrate して mem を差し替える
- `window.addEventListener("storage", ...)` で他タブの書込みを検知したら mem を破棄 (次の loadStore で再読)
- `window.addEventListener("pageshow", e => { if(e.persisted) mem 破棄 })` を追加
- 破棄時に `Q4BReward` の breeding cache も無効化する必要がある → `q4b-store-reloaded` custom event を dispatch し、reward.js 側で受けて `__bsCache=null` にする (reward.js に小さな listener 追加。setEggStore を呼び直すのでも可)

## 2. (High) komorebi を CAS 対象に

- storage.js の `CAS_NAMESPACES` (457 行付近) に `komorebi:1` を追加
- `saveVersioned` 内の profileId 判定 (583 行付近) にも komorebi を追加 (conflict backup の profileId が空にならないように)
- komorebi/app.js の `saveProfile()` / boot load を `loadVersioned("komorebi", pid, ...)` / `saveVersioned` に移行する。boot で revision を保持し、conflict 時は再 load して collection.catches を union (records は concat、n は records.length に揃える、max/min 再計算) してから再 save。ポータル側 (index.html の homeEggHatch / _autoHatchReadyEggs) の komorebi 書込みも同じ versioned 経路に乗せる

## 3. (High) 隔離書き戻し・amberSet が revision を落とす

- storage.js `breedingOf` の隔離書き戻し (1056 行付近) と `breedingSet` (1069 行付近) を `revision: _entryRevision(既存)+1, updatedBy: __deviceId` 付きで書く
- `amberSet` (729 行付近) も同様に revision を付けて書く (wallet が CAS namespace なのに revision が付かず時刻 LWW に降格している)

## 4. (High) ポータルの小道リンクが永久に出ない

- index.html 1326 行付近: `komCollection.totalSpecies` は書き手が存在せず常に 0 → 小道リンク (1326/588-589 行) が描画されない
- `total` を `Q4B_BUGS.filter(b => b.areaOnly === "komorebi").length` で算出する形に差し替え、`total>0` の表示 gate は「小道 save が存在する (unlocked)」判定に変える

## 5. (Medium) ポータル komorebi 書込みのガード強化

- index.html の komorebi 分岐 2 箇所 (homeEggHatch / _autoHatchReadyEggs):
  - `totalCatches` ガードを `Number.isInteger(profile.collection.totalCatches)` まで含める (欠損時に 1 へリセットされる事故防止)
  - `profile.schemaVersion !== 1` なら書込みを見送る (komorebi 側 validator と同じ版チェック)

## 6. (Medium) save.json サイズ対策 (第 1 弾のみ)

- storage.js `snapshotDoc` の `JSON.stringify(doc, null, 2)` を `JSON.stringify(doc)` に変える (pretty print で 1MB 予算を 2.2 倍速で食っている。復元性は commit 履歴の内容で担保され、整形は不要)
- records[] の上限・圧縮は**今回やらない** (データ保持ポリシーはユーザ判断待ち。plan 外)

## 7. (Low) importAll / pullAll 後の breeding cache 無効化

- storage.js の `importAll` / pull 完了処理で 1 の `q4b-store-reloaded` event を dispatch する (1 の実装に相乗り)

## 8. 回帰テスト

- tests/test_breeding_storage_komorebi.js を拡張 (または新設 test_storage_sync_boundaries.js):
  1. 実 QuestSave 経由で layEgg → breedingOf 往復後も eggs に残り revision が単調増加する (隔離書き戻しの revision 保持)
  2. amberSet 後の wallet entry に revision が付く
  3. 世代トークン: 別コンテキストを模して localStorage を直接書き換え → loadStore が新データを読み直す
  4. komorebi が CAS_NAMESPACES に含まれる (source 検査でよい)
  5. snapshotDoc が compact (改行を含まない)
- 既存全テスト green を維持

## 9. cache busting

- storage.js / reward.js / komorebi/app.js / index.html の変更に応じて ?v= を +0.0.1、sw.js CACHE を +1

## 検収

- `for f in tests/test_*.js; do node $f; done` 全 green
- 監査の再現 harness (/tmp/.../scratchpad/repro/t3.js, t4.js) 相当のシナリオが再発しないこと (可能なら repro を流用して確認)
- commit はしない (レビュー後にこちらで行う)
