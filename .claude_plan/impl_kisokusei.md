# round 11: kom_kisokusei 実装

仕様の正本: docs/komorebi_kisokusei_curriculum.md (v0.2)。共通要件: .claude_plan/k10_new_cats_common.md (release:9 ゲート・敵ソルバー回帰テスト・注入 random・正解位置一様・FORMAT_KINDS 整合・sw CORE 追加・doc 矛盾は BLOCKED)。

## 範囲

1. komorebi/kisokusei_generator.js を新設: 植木算 (両端あり/なし/円形)・周期算・方陣算・等差数列の生成器。doc の Lv1-10 詳細、パラメタ帯 (10.2 章の改訂値: 帯の重なりを作る値域)、対比ペア (問題文に現れる数がすべて同一で問いまたは型だけが異なる 2 問。答えが一致する組は破棄)、暗黙型 (型語彙を置かない状況文、Lv3/4 に 1 問・Lv10 に 2 問)、混在規則の全 Lv 表 (5.3 章)
2. 整列 (ordering): 一意性は部品の requires/produces による位相順序で保証 (数値連鎖に依存しない)。数を含まない手順部品をちょうど 1 つ混ぜ、位置は注入 random で分散
3. 診断 (diagnosis): 各 Lv に誤りラベル 3 種以上、gap_vs_count を含む。canonical 文言は doc の診断語彙表に従う
4. komorebi/app.js: CATEGORIES (course k10、表示名は doc の指定、maxLv 10、release 9)、SESSION_STARTERS 登録
5. 静的プールの要否は doc の供給欄に従う (v0.2 で全問生成に変更されているはず。矛盾があれば BLOCKED)
6. テスト:
   - tests/test_komorebi_kisokusei_session.js: release 9・isReleased false の確認 + 画面の文面だけから解く 5 問セッション
   - tests/test_komorebi_kisokusei_generator.js: doc 11 章の検証項目のうち機械化可能なもの。特に敵ソルバー (T1 構造盲目: doc 判定表のソルバー定義を実装) を 200 セットで 0.75 未満、対比ペアの答え不一致保証、整列の「数値照合だけでは正順が 2 通り以上」、正解位置の一様性
7. komorebi/index.html に script 追加、sw.js の CORE 配列に追加 (CACHE 文字列は触らない)

## 検収

- 全テスト green、zukan_cards/ diff 除外、commit しない
