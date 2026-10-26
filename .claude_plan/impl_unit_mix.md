# round: kom_unit_mix 実装

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-unit-mix (branch claude/impl-unit-mix-20261026)。

仕様の正本: docs/komorebi_unit_mix_curriculum.md (v0.2.9、Phase 6 と Phase 7 と厳格モードの点検を反映済み)。共通要件: .claude_plan/k10_new_cats_common.md。前の 2 round の見本とレビューの教訓: .claude_plan/impl_shiki_henkei*.md、.claude_plan/impl_bamen_yomitori*.md。

## 範囲

1. komorebi/unit_mix_generator.js を新設する。既存生成器の IIFE 形式と文体に合わせる。正本は doc 3 章 (領域、単位、関係、向き)、4 章 (計画と鏡像による層化、罠の下限、重複回避 4.2 の 6、連鎖)、5 章 (Lv 配合)、9 章 (値の帯 9.2、patternId 9.4、組成手順 9.8、誤りの型の決め方 9.7)。乱数は注入 random のみ。
2. 組成は 9.8 章の「計画の段階で罠を数えてから値を作る」手順で書き、拒否再試行に頼らない。1 セットの生成は、普通の PC の node で 1 回あたり 50 ms 以下 (全 Lv、500 セットの平均) を目標とし、テストで上限を assert する (端末で遅くならないため)。上限で作れないときは throw せず、ハードな規則を満たす最も近いセットを、満たせなかった規則を violations に記録して返す。
3. 判定と解説: 数値と単位チップの分離判定は、既存の unit_convert の judgeNumUnit と同じ形にし、単位表は本カテゴリ用に持つ。誤りの型は 9.7 章の決め方と優先順で決め、解説は 8 章の表 B の文に、生成器が返す値を差し込んで出す。表に無い文言は画面に出さない。診断の問題は 9.7 章の決まり (答案が持つ型の解説、答案が正しいのに誤りを選んだときはわざのカード) に従う。分数の時間の表示には、既存の分数の描画部品を使う (12 章の 6)。
4. 形式は既存の normal (数値 + 単位チップ) と choice と diagnosis を使う。新しい画面部品は作らない。カテゴリ名での分岐は、カテゴリ固有の部分 (解説の文) にだけ置く。
5. komorebi/app.js の CATEGORIES に kom_unit_mix (course k10、表示名は doc 9 章の指定、maxLv 10、release 6) を登録し、SESSION_STARTERS にも登録する。isReleased に特別扱いを足さない。
6. テスト:
   - tests/test_komorebi_unit_mix_generator.js: doc 10 章の検証項目のうち機械化できるもの全部。tools/komorebi/unit_mix_audit_sim/ の strict_check.js と strict_enemies.js と check_explanations.js と check_tables.js を require して、生成器の出力に当てる (必要なら tools 側を関数 export の形に直し、CLI の挙動は残す)。基準は doc 11 章の判定どおり (段 A は 0.60 未満、M1mag の 10 問窓は 0.20 以下、M1/M2/M3 は 0.15 以下、E7 の 10 問窓は 0.15 以下、段 B は承認済みの 2 手続きを除いて 0.75 未満)。付録 A のセットを golden case として通す。Math.random と Date.now を呼ばないことを固定する。テスト file 全体が 30 秒程度で終わること。
   - tests/test_komorebi_unit_mix_session.js: release 6 ゲートと、画面の文面とチップだけから 5 問を解けること。誤答で 8 章の解説が差し込み済みで出ること。
7. komorebi/index.html に ?v= 付きの script タグを追加し、sw.js の CORE 配列に行を足す。CACHE 文字列は触らない。中身を変えた配信ファイルの ?v= を上げる。

## 範囲外

- 誤答の記録を同期データに保存すること (別 round)。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` が全 green、`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則や検証項目どうしが矛盾しているときだけ BLOCKED にする。説明文の中の参考値は拘束しない。
