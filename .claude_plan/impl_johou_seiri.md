# round: kom_johou_seiri 実装

仕様の正本: docs/komorebi_johou_seiri_curriculum.md (v0.3、付録 A に全 Lv 実在証明あり)。共通要件: .claude_plan/k10_new_cats_common.md (release:9 ゲート・敵ソルバー回帰テスト・注入 random・正解位置一様・FORMAT_KINDS 整合・sw CORE 追加・実在証明 golden case・doc 矛盾は BLOCKED)。

## 範囲

1. komorebi/johou_seiri_generator.js を新設: 本文テンプレート (場面 × 骨、8 章のデータ仕様) + 数量スロット、負荷 5 軸の Lv 別強度 (4.1 章)、問い方 Q1-Q10 (5 章のカタログ、各問い方の制約は 9.4.1 章)、配合と分散規則 (6.1 章: 問い方配合・本文本数・分散規則 4 つ)、余分の型規則 (8.3 章)、literal 原則 (正答は本文中に literal に存在)
2. 遮断規則の実装 (v0.3 で強化された定義に従う): Q1 中心語句の部分文字列判定、Q2/Q3 の近接照合遮断 (「共有語句のどれからも最近傍でない」)、余分の位置規則 (先頭/末尾の連続区間と一致しない)、ordering の提示順シャッフル
3. komorebi/app.js: CATEGORIES (course k10、表示名は doc の指定、maxLv 10、release 9)、SESSION_STARTERS 登録。形式は normal / find_all / ordering / diagnosis (formulation 不使用が境界規約)
4. find_all の可変選択肢数 (未確定 11 の扱いは doc の現行規定に従う。画面部品が 4 択前提で衝突する場合は BLOCKED)
5. テスト:
   - tests/test_komorebi_johou_seiri_session.js: release 9・isReleased false + 画面の文面だけから解く 5 問セッション
   - tests/test_komorebi_johou_seiri_generator.js: doc の検証項目のうち機械化可能なもの。敵ソルバー (T1: 語の重なり最大・名前近接・単位孤立・数値一致の各照合) を 200 セットで 0.70 未満、正解位置一様、余分の位置規則
   - tests/fixtures/johou_seiri_reference_sets.json: 付録 A.3 の 10 セットを fixture 化し、生成器と同じ検証関数に通す (検証 31)
6. komorebi/index.html に script 追加、sw.js の CORE 配列に追加 (CACHE 文字列は触らない)

## 検収

- 全テスト green、zukan_cards/ diff 除外、commit しない
