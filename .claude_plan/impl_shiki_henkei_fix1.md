# round: kom_shiki_henkei 実装の修正 1

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-shiki (branch claude/impl-shiki-henkei-20261025)。前回の round (.claude_plan/impl_shiki_henkei.md) の未 commit の実装が作業ツリーにある。それを直す。

仕様の正本: docs/komorebi_shiki_henkei_curriculum.md (v0.3.7)。v0.3.7 で 8.1 章 (解説 27 文の正本、差し込む値の定義、複数の型が付いたときの優先順)、3.5.0 章 (Lv1 の誤答診断の全列挙)、9.5 章 (表示名「式のかたちをかえる」) が加わった。

## 範囲

1. 解説の文言をすべて 8.1 章の表に置き換える。表に無い文言を画面に出さない。keep_op と minuend_swap は型ごとに文が違う。1 つの答えに複数の型が付くときは、8.1 章の優先順で最初の型の文だけを出し、記録にはすべての型を残す。差し込む値 (A、B、X、Y、D、B+C) は 8.1 章の定義どおり、生成器が返す値から取る。negative_step の X と Y は、生成器の firstNegative (export する) から取り、UI で位置から推さない。
2. Lv1 の診断を 3.5.0 章の順の規則に置き換える (正答 → copy_visible → ignore_op → place_value → digit_slip → calc_other)。
3. komorebi/app.js の isReleased にある kom_shiki_henkei の特別扱いの行を消す。ゲートは CATEGORIES の release:6 だけで決まる。
4. 組み立て部品のスタイルを komorebi/index.html のインライン style から komorebi/map.css に移し、map.css の ?v= を上げる。モックの □ カードの見た目 (.card.boxc に相当する別の色) を加える。描画テストは map.css を読んで寸法の下限を確かめ、幅のはみ出しの検査も map.css から読んだ値で計算する (決め打ちの数を使わない)。
5. 枠、カード、操作の描画は kind==="assemble" で分岐する。カテゴリ名での分岐は、カテゴリ固有の部分 (わざの文、解説の文) にだけ残す。
6. tests/test_komorebi_shiki_henkei_generator.js に貼り付けた監査 sim を、tools/komorebi/shiki_henkei_audit_sim/ の module を require する形に替える (必要なら tools 側の file を、関数を export する形に直す。CLI として動く挙動は残す)。敵ソルバーの回帰は、訓練と検査のセット数を減らし、このテスト file 全体が 30 秒程度で終わるようにする。減らしても閾値の判定がゆれで落ちないよう、各 Lv の検査数と余裕を確かめて決める。
7. 表示名を「式のかたちをかえる」にそろえる (CATEGORIES、画面)。

## 範囲外

- 誤答の記録 (slots、diagnose、unknownPosition、けすの回数) を同期データに保存すること。別の round で、ほかのカテゴリと合わせて設計する。question.answerData はテストが読むものとして残してよい。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` が全 green。`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則や検証項目どうしが矛盾しているときだけ BLOCKED で止まる。説明文の中の参考値は拘束しない。
