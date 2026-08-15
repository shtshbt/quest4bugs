# round: 実機フィードバック修正 B (ずかん強化 + 地図バッジ)

仕様の参照: 本編の実装 (keisan/app.js の zukanMatchK と Q4BRender の共有 API) を体裁・語彙の正とする。共通要件: .claude_plan/k10_new_cats_common.md のうち「全テスト green」「sw.js CACHE 文字列は触らない」を適用。

前提: .claude_plan/impl_live_feedback_a.md の変更が先に入っている。壊さないこと。

## 範囲

### 1. ずかんフィルタ増強 (komorebi/app.js)

zukanFilter / zukanMatches / zukanFilterBarHtml に、本編 keisan の zukanMatchK (keisan/app.js:236) と同じ 6 条件を追加する:
- お気に入り (Q4BReward.isFavorite(coll, sp.id))
- 色違い (捕獲記録の shiny)
- そだてた (Q4BReward.hasReared(coll, sp.id))
- 2匹以上 (record.n>=2)
- たまご (Q4BReward.eggsForSpecies(sp.id).total>0)
- 雌雄ペア (Q4BReward.hasBothSexes(coll, sp.id))

UI は既存の zukan-chips / zukan-toggle の体裁を踏襲したトグル群。文言は本編の同機能と同じ子ども向け表記に揃える (本編の該当ボタン文言を読んで一致させる)。地域ずかん (renderZukan) と こもれびのずかん (renderCommonZukan) の両方に適用。

### 2. イラスト/しゃしん切替の設置

renderZukan と renderCommonZukan で Q4BRender.setZukanModeToggleVisible(true, host) を呼び、host._q4bRerender に当該画面の再描画関数を登録する (本編 keisan/app.js:993 と同じ運用)。ずかん以外の画面へ遷移する描画時は setZukanModeToggleVisible(false)。問題セッション中は Q4BRender.setSessionActive(true/false) で非表示制御 (keisan/app.js:687,5797 と同じ)。カード側の描画は reward.svg 経由で共有レンダラが museum photo に切り替わるため、追加実装は不要のはず。切替後の再描画でフィルタ状態 (zukanFilter) が保持されること。

### 3. 地図バッジの海上配置 + 引き出し線

地域ピンに付随する進捗バッジ類が小さい地域 (コスタリカ等) を隠す問題への対処。バッジを地域ポリゴン上ではなく海上のアンカー位置に置き、地域の代表点から SVG の line でバッジへ結ぶ。
- アンカー座標は app.js 内の地域別定数表 (regionId → {x, y}) で定義し、4 地域ぶんを実寸の world map viewBox 座標で置く。地域と重ならない海上を選ぶ
- 線は視認性のため 1px 系の控えめな色 (既存の地図配色トーンに合わせる)
- 選択中地域の発光・タップ判定は現状維持 (ポリゴン側)
- 「じゅんびちゅう」バッジ (plan A) も同じ海上アンカー方式に載せる

### 4. 御神木パネルの小道卵段の常時表示 (2026-08-14 実機フィードバック追加)

現状 shared/breeding.js の homeBreedingPanelHTML は「小道の卵が 1 つでもあるときだけ」小道段を出す。これを「小道を一度でも開いた profile (komorebi save が存在) なら卵ゼロでも表示」に変える。卵ゼロ時は空きスロット 3 つと案内文「ずかんから たまごを うめるよ」を出す。小道未プレイの profile では従来どおり非表示 (混乱防止)。portal 側 (index.html) から komorebi save の有無を opts で渡す。

### 5. テスト

- 既存 komorebi テスト全 green
- 新規: ずかんフィルタ 6 条件の判定ユニット (フィルタ関数を jsdom なしで呼べる形なら関数単位で)、ずかん画面でトグルボタン要素が設置される DOM smoke、地図バッジのアンカー定数が 4 地域ぶん定義されていること

## 検収

- 全テスト green、zukan_cards/ の diff なし、sw.js CACHE 文字列変更なし、commit しない
