# round 10: kom_ratio_forms 実装

仕様の正本: docs/komorebi_ratio_forms_curriculum.md (v0.2)。共通要件: .claude_plan/k10_new_cats_common.md (release:9 ゲート・敵ソルバー回帰テスト・注入 random・正解位置一様・FORMAT_KINDS 整合・sw CORE 追加・doc 矛盾は BLOCKED)。

## 範囲

1. komorebi/ratio_forms_generator.js を新設: 値の台帳 (千分率整数 m を主キー、doc 7 章のデータ仕様)、4 表現 (小数・百分率・歩合・分数) の導出、Lv1-10 の出題 (doc 6 章の Lv 別詳細)、言い回し表 W1-W4 (doc 6 章)、W3/W4 への words_reversal 誤答必須、方向・言い回しの分散規則 (7.4)
2. komorebi/app.js: CATEGORIES に kom_ratio_forms (course k10、表示名は doc の指定、maxLv 10、release 9)、SESSION_STARTERS 登録。形式は normal (num/frac/choice) と diagnosis のみ (doc 4 章)
3. 静的プールは持たない (全問生成、doc の決定)
4. テスト:
   - tests/test_komorebi_ratio_forms_session.js: 実装済み未公開 (release 9、isReleased false) の確認 + 画面の文面だけから解く 5 問セッション (既存 session テストの体裁)
   - tests/test_komorebi_ratio_forms_generator.js: doc 9 章の検証項目のうち機械化可能なもの。特に検証 20 (語順規則ソルバーを test 内に実装し、200 セット生成で正答率 0.70 未満を assert)、正解位置の一様性、台帳の値品質 (割り切れない値が無い)
5. komorebi/index.html に script 追加、sw.js の CORE 配列に追加 (CACHE 文字列は触らない)

## 検収

- 全テスト green、zukan_cards/ diff 除外、commit しない
