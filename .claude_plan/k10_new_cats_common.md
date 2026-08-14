# k10 新 5 カテゴリ実装の共通要件 (2026-08-14 決定: LOGOS ゲートを待たず全実装)

kom_ratio_forms → kom_kisokusei → kom_hayasa → kom_johou_seiri → kom_diagram_model の順に、1 カテゴリ = 1 round で実装する。各 round の仕様の正本はそのカテゴリの curriculum doc (v0.2)。本ファイルは全 round 共通の要件。

## 共通要件

1. リリースゲート: CATEGORIES に `release: 9` で登録する (未公開。CURRENT_RELEASE=1 のまま画面に出ない)。公開時期は release_linkage のカレンダー改訂で別途決める
2. 表示名・course・maxLv は curriculum doc の指定に従う (course は全て k10、maxLv 10)
3. 生成器は komorebi/ 配下の独立ファイル (既存の ratio_generator.js 等と同じ IIFE 形式・文体)。静的プールを持つカテゴリは doc の指定に従う
4. セッション開始関数を SESSION_STARTERS に登録し、既存カテゴリと同じ画面部品 (normal / formulation / ordering / diagnosis / find_all) を使う。新形式が必要な場合は FORMAT_KINDS への登録を忘れない (登録漏れはゲージが進まず例外になる)
5. 乱数は注入 random 経由 (シード再現性)。正解位置は注入 random で一様分布 (C2)
6. 敵ソルバー回帰テストを同梱する (doc の検証章が定義するソルバーを test 内に実装し、生成 200 セットで閾値未満を assert)。これが原則 6 の自動検査になる
7. 通常のセッションテスト (release gate 型: 実装済み未公開でも開始関数が動き、画面の文面だけから解けることを固定) を tests/test_komorebi_<cat>_session.js として追加
8. komorebi/index.html に script タグ追加 + sw.js の CORE に生成器ファイルを追加 (boot テストが page↔CORE 整合を強制する。CACHE 版数の bump はオーケストレータが commit 時に行うので、CORE 配列への行追加のみ行い CACHE 文字列は触らない)
9. cache busting: komorebi/app.js の ?v= を +0.0.1 (komorebi/index.html 内)
10. 検収: `for f in tests/test_*.js; do node $f; done` 全 green。zukan_cards/ は diff 判定除外。commit しない
11. doc と実装が食い違う箇所に当たったら、doc を正としてコードを合わせる。doc 自体の矛盾は BLOCKED で報告 (勝手に解釈しない)
12. 実装 round の投入前提 (2026-08-14 追加): 仕様 doc に「全 Lv のセット実在証明」の付録があること。全制約 (配合・分散・ペア・ラベル組など) を同時に満たす 5 問セットの実例が Lv ごとに構成されていない doc は、組合せ破綻 (鳩の巣・組の非反復不能) が実装段階で BLOCKED になる実績が 3 件ある (kisokusei 2 件、ratio_forms 1 件)。生成器のセット組成テストは、この実在証明のセットを golden case として再現できること
