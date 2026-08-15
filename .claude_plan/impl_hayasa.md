# round 12: kom_hayasa 実装

仕様の正本: docs/komorebi_hayasa_curriculum.md (v0.2)。共通要件: .claude_plan/k10_new_cats_common.md (release:9 ゲート・敵ソルバー回帰テスト・注入 random・正解位置一様・FORMAT_KINDS 整合・sw CORE 追加・doc 矛盾は BLOCKED)。

## 範囲

1. komorebi/hayasa_generator.js を新設: Lv1-10 (0 章の節構成: 1-2 みはじ同定 / 3-4 単位合成 / 5-6 和差判別 / 7-8 通過 / 9 流水 / 10 統合)。供給は全問生成 (doc の決定)。内部表現は道のり m 整数 × 時間 秒整数の 2 つ組、生成は常に「道のり = 速さ × 時間」の積の向きで行い、問う量の変更で商を作る (割り切れの構造保証)
2. パターン配合列 (4 章の v0.2 表) と累積出題 (4.3)、対比ペア (Lv1/2 の doc 指定)、和差の配合下限、Lv7/9 の逆算義務、節またぎ (Lv10)
3. num_unit: 速さ側の独立単位表 (チップ: 時速km / 時速m / 分速m / 秒速m、道のり側は doc 指定)。判定は unit_convert の judgeNumUnit と同型の 3 分岐 (一致 / 同じ速さの別単位 / それ以外) を速さ用に実装
4. 整列 (ordering): 部品の requires 依存宣言による位相順序の一意性 (数値連鎖に依存しない)。値を持つ部品は 3-4 部品中 1-2 個、位置は注入 random
5. 診断: 各 Lv でラベル 3 種以上 (doc 8 章の表に従う)。C3 対策の型またぎ共有語彙 (「向かい合って」を Lv6/8 で共有等) は問題文生成の語彙表に従う
6. komorebi/app.js: CATEGORIES (course k10、表示名は doc 指定、maxLv 10、release 9)、SESSION_STARTERS 登録
7. テスト:
   - tests/test_komorebi_hayasa_session.js: release 9・isReleased false + 画面の文面だけから解く 5 問セッション (num_unit の単位チップ判定含む)
   - tests/test_komorebi_hayasa_generator.js: doc 10 章の検証項目のうち機械化可能なもの。特に敵ソルバー (T1: 比 r による演算判別 + 「常に和」+ 「最小の数で残りの和を割る」) を 200 セットで 0.75 未満、割り切れ保証、数値帯の重なり (時間 3-60 分 vs 速さ帯)、整列の「数値照合だけでは正順 2 通り以上」、正解位置一様
8. komorebi/index.html に script 追加、sw.js の CORE 配列に追加 (CACHE 文字列は触らない)

## 検収

- 全テスト green、zukan_cards/ diff 除外、commit しない
