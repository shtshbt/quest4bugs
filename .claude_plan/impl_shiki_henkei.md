# round: kom_shiki_henkei 実装

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-shiki (branch claude/impl-shiki-henkei-20261025)。

仕様の正本: docs/komorebi_shiki_henkei_curriculum.md (v0.3.5、Phase 6 完了)。共通要件: .claude_plan/k10_new_cats_common.md (k5 カテゴリだが同じ要件を適用する: release ゲート、敵ソルバー回帰テスト、注入 random、FORMAT_KINDS 整合、sw CORE 追加、doc 矛盾は BLOCKED)。

## 範囲

1. komorebi/shiki_henkei_generator.js を新設する。既存生成器 (komorebi/equation_select_generator.js) の IIFE 形式と文体に合わせる。正本は doc 3 章 (型、範囲 3.10)、4 章 (セット構成、P1/P2 ペア、罠)、5 章 (Lv 配合)、9 章 (問題オブジェクト、9.3)。乱数は注入 random のみ。
2. 判定と診断: doc 3.4 章 (受け付ける並びと文の判定表) と 3.5 章 (誤り型を決定的に決める表)、8 章 (診断語彙と解説の文言。negative_step と Lv10 の true_* は専用の解説で、ゲージは加算しない) をそのまま実装する。
3. 組み立て式の新しい回答部品を komorebi/app.js に追加する。数のカードと + − のカードを枠に並べる。寸法と操作は doc 3.11 章 (カード 76px 以上、枠 52x64 以上、ボタン高さ 64 以上、取り消し、けす) に従う。見た目の基準は docs/mock/shiki_henkei_assemble_mock.html。Lv1 は数の入力 (doc 5 章)。新しい format / kind を FORMAT_KINDS に登録する。
4. komorebi/app.js の CATEGORIES に kom_shiki_henkei (course k5、表示名「式のかたちをかえる」、maxLv 10、release 6) を登録し、SESSION_STARTERS に登録する。
5. テスト:
   - tests/test_komorebi_shiki_henkei_generator.js: doc 10 章の検証項目のうち機械化できるもの全部。敵ソルバー回帰は tools/komorebi/shiki_henkei_audit_sim/ (gen3.js, solvers3.js, run3.js) を移植し、生成器の出力に対して段 A と段 B を 200 セット以上で assert する (Lv2 は 0.70 未満、Lv3 以降は段 A 0.60 未満と段 B 0.75 未満、除外は doc 11.6 と検証 22)。診断表の全数決定性は diag_exhaustive.js を移植する。付録 A のセットを golden case として通す。Math.random と Date.now を呼ばないことを固定する。
   - tests/test_komorebi_shiki_henkei_assemble_render.js: 組み立て部品の描画と操作 (doc 10 章で、この file に割り当てられた検証項目。カードと枠の配置、タップで枠が埋まり、取り消しと「けす」で戻ること、寸法の下限が CSS に入っていること)。
   - 3 つのテスト file への検証項目の振り分けは doc 10 章 (719 行あたり) に従う。特記がなければ各 Lv 2000 セットで行う。ただし敵ソルバー回帰テストは、実行時間を見て 200 セット以上に減らしてよい。
   - tests/test_komorebi_shiki_henkei_session.js: release 6 ゲート (CURRENT_RELEASE が 5 の間は出ない。isReleased は currentRelease() >= 6 の形で書く) と、画面の文面とカードだけから 5 問を解けること。
6. komorebi/index.html に ?v= 付きの script タグを追加し、sw.js の CORE 配列に行を足す (CACHE 文字列は触らない)。中身を変えた配信ファイル (app.js、index.html) の ?v= を上げる。

## 範囲外

- 巻 (volume) への収録と release_linkage の更新。統括者がやる。
- 実機でのカード寸法の試し打ち (doc 10.1 受け入れ条件 3)。発案者がやる。

## 検収

- `for f in tests/test_*.js; do node $f; done` が全 green。`tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
