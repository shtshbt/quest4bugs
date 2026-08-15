# round: k10 新 3 カテゴリの配線 (ratio_forms / johou_seiri / diagram_model)

仕様の正本: 各カリキュラム doc (ratio_forms v0.3 / johou_seiri v0.3.3 / diagram_model v0.3.5) と、実装済み生成器の公開 API。共通要件: .claude_plan/k10_new_cats_common.md (release:9 ゲート・FORMAT_KINDS 整合・sw CORE 追加・CACHE 文字列不変・doc 矛盾は BLOCKED)。表示名は各 doc の指定を使う (見つからなければ BLOCKED)。

前提: 生成器は全て commit 済みで無配線 (Q4B_KOMOREBI_RATIO_FORMS / Q4B_KOMOREBI_JOHOU_SEIRI / Q4B_KOMOREBI_DIAGRAM_ENGINE + Q4B_KOMOREBI_DIAGRAM_MODEL)。

## 範囲

1. komorebi/index.html: script 追加 (ratio_forms_generator.js / johou_seiri_generator.js / diagram_engine.js → diagram_model_generator.js の順。engine が先)
2. sw.js: CORE 配列へ 4 ファイル追加 (CACHE 文字列は触らない)
3. komorebi/app.js:
   - CATEGORIES 3 本 (course k10 / maxLv 10 / release 9)、SESSION_STARTERS 3 本。既存 kisokusei / hayasa の登録様式に合わせる
   - ratio_forms: 形式は normal のみ (doc 4 章が正。plan 旧記述の diagnosis は使わない)。kind frac の判定は cat 分岐で Q4B_KOMOREBI_RATIO_FORMS.judgeFraction({whole,num,den}) を使い (verdict: correct / not_reduced)、表示側 formatFraction も cat 分岐。短ループ想起は buildSet(lv, random, carry) の第 3 引数 — 直前セットの {m, pattern} をセッション内で受け渡す
   - johou_seiri: judgeAnswer に find_all 分岐 (engine.judge)。numUnitEngine 相当は kom_johou_seiri 分岐を追加し judgeNumUnit / unitLabel を使う (verdict state は unit_wrong)。ordering は kisokusei と同じ parts / ans / displayOrder 契約。画面は question.passage.sentences / ask / prompt を分けて描画し、暫定の question.text (／ 連結) を画面に出さない。find_all は選択肢 3〜7 個の可変長 (multiChoiceHtml は対応済みだがレイアウト確認)。Q7 は選択肢が文なので 1 列表示
   - diagram_model: セッション開始時に createSession(random) を 1 回作り、セット生成は generateSet(session, lv) (セッション内でデッキ保持。問題ごとに作り直さない)。standardQuestionBodyHtml に question.figures 分岐 (1 枚 = 単図中央、2 枚 = 横並びで 375px 時 1 図 161px。doc 20.1)。選択肢はテキストなので ratioChoiceHtml / multiChoiceHtml 流用。解説カードは explainCard(question) をフィードバックのわざカード位置に結線 (4 系統の出し分けは生成器側で済んでいる)
4. komorebi/map.css: 図と対比ペアの並び (doc 20.1、60-100 行目安)。1 画面判定は Lv 単位 (doc 15.3)
5. FORMAT_KINDS: 3 カテゴリの format/kind の組を登録 (johou の find_all/find_all、diagram の diagnosis/choice ほか)。qualifiesForGauge / anslog 経路が全形式で通ること
6. テスト:
   - tests/test_komorebi_ratio_forms_session.js / test_komorebi_johou_seiri_session.js / test_komorebi_diagram_model_session.js: release 9 で isReleased false の確認 + (Lv を直接引き上げて) 画面の文面だけから 5 問解く。diagram は figures の SVG が本文に描かれる smoke を含む
   - 既存 komorebi スイート全 green (トロフィー・進捗分母は release ゲートで自動除外のはずだが、崩れたらテスト側でなく実装を疑う)

## 検収

- 全テスト green、zukan_cards/ diff なし、sw.js CACHE 不変、commit しない。?v= bump は orchestrator が commit 時に行う
