# 種 ID 移行表

本編カタログで種を置換したときの、旧 id から新 id への対応と経緯の記録。
設計方針は docs/komorebi_design.md 6.1 に従う。誤同定や重複の差し替えは同一 ID の書き換えではなく、移行表を伴う置換として行う。

機械可読の正本は `shared/bugs.js` の `Q4B_SPECIES_MIGRATIONS`。保存データの引き継ぎは `shared/reward.js` の `applySpeciesMigrations` (coll: catches, favorites, recent) と `applyBreedingSpeciesMigrations` (卵: eggs, pendingEggs) が行う。どちらも冪等で、移行先に既存 record があれば破壊せずマージする (n 加算, max 大きい方, min 小さい方, shiny と normal と master は OR, records 連結)。バトル編成 (party) の id は battle.html のロード時に `migrateSpeciesId` で置き換える。

| 旧 id | 新 id | 理由 | 日付 |
|---|---|---|---|
| ootora_hanamuguri | chairo_kanabun | Paratrichius doenitzi が ootorafu_kogane (オオトラフコガネ) と同種の重複だったため、実在の別種チャイロカナブン (Cosmiomorpha similis Fairmaire, 1900) に置換。図鑑分母 1213 は不変 (1 削除 + 1 追加) | 2026-08-11 |
