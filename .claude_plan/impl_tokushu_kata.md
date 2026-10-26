# round: kom_tokushu_kata 実装

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-tokushu (branch claude/impl-tokushu-kata-20261026)。

仕様の正本: docs/komorebi_tokushu_kata_curriculum.md (v0.4.5、Phase 6 と Phase 7 と厳格モードの点検を反映済み)。共通要件: .claude_plan/k10_new_cats_common.md。これまでの 2 round の見本と、レビューで学んだこと: .claude_plan/impl_shiki_henkei*.md と .claude_plan/impl_bamen_yomitori*.md。生成器の参考実装は tools/komorebi/tokushu_kata_audit_sim/strict_gen.js である (10 章)。gen.js と sets.js は古いので参考にしない。

## 範囲

1. komorebi/tokushu_kata_generator.js を新設する。既存の生成器の IIFE 形式と文体に合わせる。正本は次のとおり。
   - doc 3 章: 型、署名、場面、偽装語
   - 4 章: セット構成、規則 1 から 10、ペア
   - 5 章: Lv 配合
   - 9 章: 数のスロット 9.2、patternId 9.4、問題オブジェクト
   - 付表 B から D: 文面
   乱数は注入 random のみを使う。
2. 問題文と選択肢の文は、付表 B から D と 6 章の文面に一字一句合わせる。表にない文言は画面に出さない。誤答の型と解説は 8 章どおりにし、複数の型が付くときは優先順で 1 つを出し、記録には全部を残す。解説に差し込む値は、生成器が返す値から取る。
3. 形式は既存の部品を使い、新しい画面部品は作らない。カテゴリ名での分岐は、カテゴリ固有の部分 (解説の文) にだけ置く。型えらび (F1) は問いの文を見せない。
4. 性能と配信の大きさ: 事前計算した大きな data file を作らない。配信する file (生成器と、もし作るならその data) の合計は 300 KB 以下にする。各 Lv で、冷えた状態の最初のセットと 1 セットの最悪値は、どちらもこの PC の node で 100 ms 以下にする。固定の計画の pool を持たず、毎回その場で引く。重みの掛け直し (規則 10) は、候補の表を作るのに時間がかかるなら、その Lv を初めて作るときに必要な分だけ作り、作る量に上限を設ける。上限で作れないときは throw せず、ハードな規則を満たす最も近いセットを返し、満たせなかった規則は violations に記録する。
5. komorebi/app.js の CATEGORIES に kom_tokushu_kata を登録する。course は k10、表示名は doc 9 章の指定、maxLv は 10、release は 6。SESSION_STARTERS にも登録する。isReleased に特別扱いを足さない。
6. テスト:
   - tests/test_komorebi_tokushu_kata_generator.js
     - doc 10 章の検証項目のうち、機械化できるものを全部入れる。
     - tools/komorebi/tokushu_kata_audit_sim/ の strict_check.js と audit.js と independent/ の敵ソルバーを require して、生成器の出力に当てる。必要なら tools 側を、関数を export する形に直す。CLI の挙動は残す。
     - 基準は doc 11 章の判定どおり。段 A は 0.60 未満、段 B は 0.75 未満。Lv1 と Lv2 の記録の列 (R3、Bnamed、Bshape) は判定しない。語ごとの条件付き正答率は 0.60 以下。Lv4 の検証 36 は 0.70。
     - 付録 A のセットを、本番の生成器で golden case として照合する。答え、誤答の型、解説の文が doc と一致し、setOk が受け入れることを確かめる。
     - 4 の時間と大きさの上限を assert する。冷えた時間は、新しい vm context で読み込んでから測る。
     - Math.random と Date.now を呼ばないことを固定する。
     - テスト file 全体が 30 秒程度で終わること。
   - tests/test_komorebi_tokushu_kata_session.js: release 6 のゲートと、画面の文面だけから 5 問を解けること。誤答のときに 8 章の解説が差し込み済みで出ること。
7. komorebi/index.html に ?v= 付きの script タグを足し、sw.js の CORE 配列に行を足す。CACHE 文字列は触らない。中身を変えた配信 file の ?v= を上げる。

## 範囲外

- 誤答の記録を同期データに保存すること (別 round)。
- 巻への収録。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` が全 green、`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則どうしが本当に矛盾するときだけ BLOCKED で止まる。文言の空白や句読点の揺れは、付表 B から D の形に合わせる。
