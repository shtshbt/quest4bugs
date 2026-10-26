# round: kom_bamen_yomitori 実装

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-bamen (branch claude/impl-bamen-yomitori-20261025)。

仕様の正本: docs/komorebi_bamen_yomitori_curriculum.md (v0.5.2、Phase 6 と Phase 7 の反映済み)。共通要件: .claude_plan/k10_new_cats_common.md (k5 カテゴリだが同じ要件を適用する)。前の round の見本: .claude_plan/impl_shiki_henkei.md と impl_shiki_henkei_fix1.md (kom_shiki_henkei の実装と、そのレビューで直した点)。

## 範囲

1. komorebi/bamen_yomitori_generator.js を新設する。既存生成器の IIFE 形式と文体に合わせる。正本は doc 3 章 (pattern、文の形 h/t/s の全列挙、人名の規則 3.6、関係の語の表)、4 章 (セット構成、言い回しの上限、X1 から X3、4.12 の曖昧点の決定)、5 章 (Lv 配合)、9 章 (問題オブジェクト)。乱数は注入 random のみ。
2. 判定と誤答の型: doc 8 章 (誤答の型の決め方、優先順)。子どもに見せる一言は doc 7.2 章の表をそのまま使い、差し込み先 (〈ひと〉〈かず〉〈あと〉など) は 7.2 章の定義どおり、生成器が返す値から取る。表に無い文言を画面に出さない。find_all は候補ごとの配列で持ち、表示順で最初の誤った候補の一言を 1 つ出す (7.2 章)。
3. 形式は既存の normal、formulation (場面カード)、find_all を使う。新しい画面部品は作らない。カテゴリ名での分岐は、カテゴリ固有の部分 (一言の文) にだけ置く。
4. komorebi/app.js の CATEGORIES に kom_bamen_yomitori (course k5、表示名は doc 9 章の指定、maxLv 10、release 6) を登録し、SESSION_STARTERS に登録する。isReleased に特別扱いを足さない (ゲートは release だけで決まる)。
5. テスト:
   - tests/test_komorebi_bamen_yomitori_generator.js: doc 10 章の検証項目のうち機械化できるもの全部。敵ソルバー回帰は tools/komorebi/bamen_yomitori_audit_sim/ の module を require して生成器の出力に当てる (必要なら tools 側を関数を export する形に直し、CLI の挙動は残す)。段 A は 0.60 未満、段 B は 0.75 未満。付録 A の 50 問を golden case として check_appendix.js の検査に通す。検証 44 (名前と役の偏り)、検証 45 (関係の語の偏り) を含める。Math.random と Date.now を呼ばないことを固定する。テスト file 全体が 30 秒程度で終わるようにセット数を決める。
   - tests/test_komorebi_bamen_yomitori_session.js: release 6 ゲート (CURRENT_RELEASE 5 の間は出ない) と、画面の文面だけから 5 問を解けること。誤答で 7.2 章の一言が差し込み済みで出ること。
6. komorebi/index.html に ?v= 付きの script タグを追加し、sw.js の CORE 配列に行を足す。sw.js の CACHE 文字列は触らない。中身を変えた配信ファイル (app.js、index.html) の ?v= を上げる。

## 範囲外

- 誤答の記録を同期データに保存すること (別 round)。
- 巻への収録と release_linkage。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` が全 green。`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則や検証項目どうしが矛盾しているときだけ BLOCKED で止まる。説明文の中の参考値 (約、目安、11 章の測定値) は拘束しない。
