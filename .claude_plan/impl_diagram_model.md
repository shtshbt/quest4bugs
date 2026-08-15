# round: kom_diagram_model 実装 (生成器ラウンド)

仕様の正本: docs/komorebi_diagram_model_curriculum.md (v0.3.3。責務 3 層 = 12 章、入力 schema = 13 章、図 spec = 14 章、レンダラ要件と viewBox = 15 章、対応条件 C1-C8 = 16 章、mutator = 17 章、等価性 = 18 章、実装規模と実装順序 = 20.2 章、検証 1-41 = 21 章、実在証明 = 付録 A)。共通要件: .claude_plan/k10_new_cats_common.md (release:9 ゲート・注入 random・doc 矛盾は BLOCKED)。

## スコープ (新規ファイルのみ。app.js / index.html / sw.js / map.css は配線ラウンドへ)

1. komorebi/diagram_engine.js (新規、目安 500-650 行): 図 spec 検査 / 正規形 (canonical) / 対応条件 checker C1-C8 / mutator 10 型 (17 章の表どおり、spec 変換のみで SVG を触らない) / renderer 3 型 (bar 系・rect・table)。renderer は決定的 (同一 spec → 同一 SVG 文字列)、viewBox は 15.3 章の規定 (bar/table 単図 320×130、rect 180×100、対比ペア 188×128、rect ペア 180×100)、R1a/R1b-1/R1b-2/R1c/R2/R3/R4 を実装、ラベル escape は renderer 自身が行う、外部参照なし、currentColor、role="img" + aria-label
2. komorebi/diagram_model_generator.js (新規、目安 350-500 行): 意味モデル 10 relation、本文テンプレート + 数量スロット (johou_seiri と共有可能な形。23 章)、形式配合 (6.2 章)、対比ペア/単図診断/formulation/find_all/normal の問題組み立て、選択肢固定 4 語彙と分布 (19 章)、解説カードの文面データ生成 (10.1 章の 4 系統出し分け。correct_alternative と「どちらも合っている」の定型文、2 図の長短比較表現の禁止)
3. tests/test_komorebi_diagram_engine.js: 21 章のエンジン側 1-10c
4. tests/test_komorebi_diagram_model_generator.js: 21 章の教材側 11-24 + 機械化耐性 25-40 (敵ソルバー 4 本: 幾何照合・個数照合・語順照合・語彙照合を各 Lv 200 問で偶然水準以下)。分散系は Lv 累計で測る (21 章末尾の規約)
5. tests/fixtures/diagram_reference_sets.json: 付録 A の 10 セットを fixture 化し、検証 41 として生成セットと同じ検証関数に通す

## 実装順序 (doc 20.2 の固定順)

1. 図 spec + 正規形 + 対応条件 checker (テストのみ動く状態)
2. renderer bar 型
3. bar に適用できる mutator 7 型
4. 教材 Lv1-7 (線分図と帯のみ)
5. renderer rect / table 型 + extra_quantity + 教材 Lv8-10

## 制約

- 乱数は注入、Date.now / Math.random 禁止。モジュール規約は kisokusei / ratio_forms / hayasa の生成器に合わせる (IIFE + window グローバル)
- 出力トークン上限対策: ファイルは骨格 Write + 章ごとの Edit 追記で分割し、1 回のツール呼び出しの新規テキストは 300 行以下。fixture JSON も分割構築。最終レポートは 30 行以内
- テストは自分の 2 本のみ実行。コミットしない
- doc に矛盾や曖昧を見つけたら実装せず BLOCKED: <理由> (付録 A.2 相当の記録は orchestrator が doc 側へ)

## 配線ラウンドへ送るもの (このラウンドではやらない)

- app.js: standardQuestionBodyHtml への figures 分岐 (1 枚中央 / 2 枚横並び)、ratioChoiceHtml / multiChoiceHtml の流用、CATEGORIES / SESSION_STARTERS 登録 (表示名は doc の指定)、解説カードの表示結線
- map.css: 図と対比ペアの並び (60-100 行)、1 画面判定は Lv 単位 (15.3 章)
- sw.js CORE 追加、?v= バンプ、セッションテスト

## 検収

- 両テスト green、付録 A fixture 全通過、敵ソルバー 4 本とも偶然水準以下の実測値を報告、zukan_cards/ diff なし
