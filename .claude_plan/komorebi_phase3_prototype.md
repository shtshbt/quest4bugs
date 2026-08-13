# 木漏れ日の小道 Phase 3 最小プロトタイプ 実装計画

## Goal

木漏れ日の小道の初回リリース (更新 1 = kom_ratio + kom_kuku_dan2 + kom_kuku_run + マダガスカル遠征 I) をゲーム内で動かすための最小実装を、Stage A から E の順に段階的に作る。各 Stage は独立にテスト可能で、Stage 単位で /implement (Codex) に渡せる。実 volume の種データ投入 (選抜・写真) は本計画の範囲外で、fixture volume で全機構を検証する。

## 正典文書 (実装前にこの順で読む)

1. `docs/komorebi_design.md` — 全体設計。特に 3 章 (データモデル・manifest・実装カテゴリ規約)、5 章 (ゲージ・捕獲・pity)、6 章 (コレクション・トロフィー)、7 章 (問題形式 4+1 と renderQ 拡張)、9 章 (既存機能からの隔離)、13 章 (検収リスト)
2. `docs/komorebi_categories.md` — カテゴリ roster。3.1 (kom_ratio)、3.2 (段暗唱 8 本の仕様: チャンク・足場・タイムバー・タイム判定)、3.10 (kom_kuku_run: 九九 SRS と 5 形式)、5 章 (わざフィールド)、6 章 (連鎖セット)
3. `docs/komorebi_ratio_curriculum.md` — kom_ratio の教材詳細 (Lv 別内容、生成器の意味モデル §6.1、静的プール schema §6.2、validator 項目 §7、在庫目標 §8、確定事項 §9)
4. `docs/komorebi_item_examples.md` — 問題品質の 6 原則と基準例 (生成器・静的プールの見本)
5. `docs/komorebi_release_linkage.md` — 更新カレンダー (何がいつ出るか)
6. `docs/komorebi_ui_design.md` — UI 確定仕様 (入口・遠征マップ・図鑑隔離・ふりがな・トロフィー配置)
6. 実装パターンの参考: `keisan/app.js` (カテゴリ・Lv・renderQ・保存の既存流儀)、`shared/reward.js` (ゲージ・捕獲)、design 7.4 章と既存 kukuyomi (音声判定の流用元)

## スコープ境界

やる: 上記 3 カテゴリのエンジン + ステージ境界 + ゲージ + 捕獲 (pity 込み) + トロフィー安定判定 + fixture volume + 回帰テスト。
やらない: 実 volume の種データ (Phase 0b の選抜後に別途)、トロフィーの金 recolor SVG 生成 (判定とデータ保持まで)、音声九九以外のカテゴリの音声、dan3 以降の段 (dan2 のみ。ただし段番号はパラメータ化し dan3〜9 が設定追加だけで増やせる構造にする)、breeding/battle との新規連携、演出強化。

## 共通規約 (全 Stage)

- cat id は `kom_` prefix。既存の K5CATS / K10CATS / K5DEV / K10DEV 配列には一切追加しない (design 3.3)
- 保存は QuestSave の新ゲームキー `komorebi` に隔離。既存ゲームの保存構造 (kp/ks/es) には一切書かない。同期は既存 per-kv LWW に乗る
- 隔離の回帰 (design 9 章): 本編の平均 Lv・おすすめ・ミッション・図鑑分母 (ZUKAN_DENOM)・REACH 算定に kom_* が混入しないこと。「暗黙の全カテゴリ列挙」を見つけたら用途別セレクタに置換する
- テストは tests/ の既存 node 流儀 (vm.createContext で shared/*.js をロード、assert、RESULT 行)。各 Stage ごとに専用テストファイルを追加
- 時間評価の扱い: design 2.2 決定 6 (2 次改訂済み)。可視タイム UI は段暗唱のタイムバーのみ。run のレイテンシは無音の内部利用のみ
- ふりがな: 子どもに見えるテキスト (地域コメント・カテゴリ名・わざ・解説) は漢字で 1 種類だけ書き、`p.type === "k5"` のとき既存 `furi5()` (`keisan/app.js` 5799 行以降) を通して ruby を振る。新出語は `FURI5_PAIRS` に追加する。k5 用と k10 用でテキストを二重に持たない
- 数値の仮置き (Phase 3 実測で調整、コードでは定数化して 1 か所にまとめる): pity 累積 25%/50%/75%/100% (design 5.4)、タイムバー秒数 (3 句: Lv1 12 秒 → Lv4 6 秒 / 5 句: 15 → 10 / 9 句: 25 → Lv10 13)、SRS 判定 (遅い > 4 秒 = 計算疑い、速い < 2.5 秒)
- コミットは Stage ごとに 1 commit。commit 前に repo CLAUDE.md の safety check。push しない

## Stage A: 入口・ステージ境界・保存

成果物: `komorebi/index.html` + `komorebi/app.js` (keisan の構造踏襲の骨格)、けいさん内のエントランス、御神木パネルのカウント行。UI 仕様は `docs/komorebi_ui_design.md` 1 章と 2 章に従う。

1. 保存 namespace: `komorebi` キーに profile 構造 (design 3 章の `p.sideAreas` 相当。cat 別 `lv` / `maxLv` / `stats`、エリア共通 `gauge`、`catches`、`trophies`、SRS デッキ)
2. cat 登録: kom_ratio / kom_kuku_dan2 / kom_kuku_run を komorebi 内部のカテゴリ表に定義 (Lv 機構は既存 `p.lv` / `p.maxLv` / 適応昇降ロジックを komorebi 名前空間で再利用)
3. 入口: けいさんのカテゴリ一覧の先頭に常時見えるエントランス帯。ホームマップには追加しない
4. 発見演出: 解禁後の初回けいさん起動時に 1 度だけ。既存の かせきのたに 解禁演出 (`index.html` 785 から 811 行) と同じパターンを流用し、表示済みフラグを保存する
5. 御神木パネル (`index.html` 587 行) に累計カウント行 `🌿 こもれび N/M` を追加 (解禁後のみ表示、タップで小道へ)
6. **`areaOnly` 隔離**: `shared/reward.js` の POOLS 構築 (30 行) と ZUKAN_DENOM 構築 (44 行以降) で `areaOnly` を持つ種を除外する。これがないと小道の種が本編の抽選と図鑑分母に混入する (ui_design 5 章)
7. 隔離回帰テスト `tests/test_komorebi_isolation.js`: (a) 本編 3 ゲームの平均 Lv・カテゴリ列挙が不変 (b) `areaOnly` 種を bugs.js に足しても poolCount 430/382/458 と zukanDenomCount 477/402/473 が不変 (c) 図鑑達成度の分子に komorebi 由来の混入がない (d) 逆に komorebi 図鑑には `areaOnly` 種だけが入る

受け入れ: けいさんの入口から空のエリアページが開き、発見演出が 1 度だけ出て、隔離テスト green。

## Stage B: 遠征マップ・ゲージ・捕獲・fixture volume

1. エリア共通ゲージ: 8 有効正答 = 1 捕獲。カテゴリをまたいで維持 (design 5.2-5.3)。加算対象・非対象は design 5.3 の列挙に厳密に従う (ヒント表示後は加算しない、誤答後の再挑戦の最終正答は加算する、等)
2. 捕獲抽選: tier-first + 重複許容 + endgame pity (design 5.4。重複のたびに未完成 tier への引き直し確率が累積し、新種捕獲でリセット)。SS なし (N/R/SR のみ)。看板 SR は tier 内重みを下げて後半寄せ (design 6.7)
3. volume manifest 形式: `komorebi/volumes/volume_fixture.js` — id、地域名、種リスト (id/rarity/看板 flag)、freeze 済み分母。fixture は 12 種程度の架空 volume (実在種 id を使わない synthetic id) で全 tier と看板を含む
4. コレクション: 捕獲は komorebi の catches に記録。図鑑 UI への表示結線は Stage E
5. **遠征マップ (小道トップ)**: `ui_design` 3 章の確定仕様どおり実装する。素材は `tools/komorebi/build_world_map.py --out komorebi/assets/world_paths.json` で生成 (Equal Earth 等積図法、国境なし、Natural Earth パブリックドメイン)。絵柄は案 1 厚塗り (深い海のグラデーション、金色の光、宝石ピン)。地域ハイライトは `regions.json` 由来のパスを光らせる。ピンは現在地 ★ / 過去 🦋 + 進捗リング / 完成 ✓、未解放は輪郭のみ。ピン選択で下端に 2 から 3 行の地域コメント (k5 は `furi5()` でふりがな)。ピンから遠征ページへ遷移
6. 遠征ページ (`ui_design` 4 章): カテゴリボタン + volume 図鑑入口 + 進捗。ギミックなし
7. テスト `tests/test_komorebi_gauge_capture.js`: ゲージのまたぎ維持 / 8 正答 1 捕獲 / pity の累積とリセット (乱数を差し替えて決定的に検証) / 分母 freeze / 看板の重み / マップのピン状態が volume の進捗と一致すること

受け入れ: 疑似正答列を流すと fixture volume の捕獲が仕様どおり進み、マップのピンに反映される。

## Stage C: kom_ratio エンジン

curriculum (`docs/komorebi_ratio_curriculum.md`) を仕様として実装する。

1. 生成器: 意味モデル 9 パターン (§6.1 の pattern 列挙)。数値制約 (§5 冒頭: 与件金額 10 円単位・答え整数円・退化ケース禁止・誤答同値禁止) を生成時に強制。normal と formulation (choice 4 択、誤答は意味モデルへの操作から決定的に生成)
2. 静的プール: `shared/komorebi_ratio_data.js` (§6.2 schema)。初期在庫は Lv ごとの最低値 (ordering 15 問 × Lv5/6/8、diagnosis 15 問 × Lv4/6/7/9) を、`docs/komorebi_sample_items.md` と examples の基準例に文体を合わせて作問して同梱する。判定候補の canonical 文言表 (§6.2) 厳守
3. renderQ 拡張: `order` kind (タップ順選択、やり直しボタン。§9.2)。diagnosis は既存 choice を流用
4. わざ/解説カード: 正誤に関わらず回答後に表示 (categories 5 章。primary + 別の道の 2 段構成、漢字トーン)。ゲージ規則と無干渉
5. 連鎖セット: 5 問セット生成時、立式・診断の直後に同一意味モデルの normal を配置 (categories 6 章)。形式配合は curriculum §4 の表
6. validator: `tools/komorebi/validate_ratio_pool.py` (curriculum §7 の 6 項目。全順列評価による整列一意性、選択肢の数値非等価、ラベル実在性)。node テストから静的プール全件を通す
7. テスト `tests/test_komorebi_ratio.js`: 生成 1000 問サンプルの制約充足 / 形式配合 / 連鎖セット配置 / Lv 昇降が教材投入済み Lv を超えない

受け入れ: validator 全 pass、Lv1 から 10 の 5 問セットが仕様どおり生成される。

## Stage D: 九九 2 カテゴリ (dan2 + run)

1. voice 基盤の流用: 既存 kukuyomi の SpeechRecognition 設定と読みデータ (design 7.4、v1 仕様 8 章: stemAliases / answerAliases、5 状態判定、認識失敗はノーカウント)。進行状態は共有しない
2. kom_kuku_dan2 (categories 3.2 章): チャンク発話 (3/5/9 句を一息、チャンク末で一括照合)。Lv 表 = よみあげ (式+答+ふりがな) ⇄ 想起 (式のみ) × チャンク長 × テンポ。**タイムバー UI 新部品**: チャンク表示と同時に満タンから減少、発話終端 (音声活動の終わり) がバー内なら OK、バー切れ = 不正解 → 再挑戦。エンジン遅延を成績に混入させない実装 (認識結果の到着時刻でなく発話終端時刻で判定)
3. kom_kuku_run (categories 3.10 章): 数値タップ。5 形式 = だんラン (連鎖タップ、おとりは ±1 と隣の段) / まきもの穴埋め / たりないさがし / まちがいさがし / フラッシュ。5 問セット = 各形式 1。九九 SRS: 無音レイテンシで fact 別に判定し、遅い正答の fact を短期再出題 + 句の足場付与、速い正答は間隔拡大。dan2 の詰まり句も同じデッキへ還流
4. 段のパラメータ化: 段番号・チャンク定義・テンポ表を設定オブジェクトにし、dan3 以降が定義追加のみで解禁できること
5. テスト `tests/test_komorebi_kuku.js`: チャンク照合 (正順/誤順/欠落) / タイム判定が発話終端基準 / よみあげ Lv の表示内容 / SRS の再出題スケジューリング (レイテンシを注入して決定的に) / だんランのおとり生成

受け入れ: マイクなし環境では dan2 がカテゴリ開始前に明示して閉じる (design 7.4。代替入力は提供しない)。run は全形式が動く。

## Stage E: 結線と検収

1. トロフィー安定判定: cat の Lv10 で直近 20 問 85% 正答 = トロフィー獲得 (design 6.6。「Lv10 到達」ではない)。獲得データを保存し、**小道トップの世界地図の下にトロフィー棚を横一列**で置く (ui_design 6 章。金 recolor は範囲外、名前と獲得日の最小表示)
2. 小道内の図鑑タブ: fixture volume の捕獲状況 (N/R/SR、看板、分母) の最小表示。けいさん図鑑と枠色・ヘッダで視覚的に区別する (ui_design 5 章)
3. 統合回帰 fixture: design 13 章の検収リストを網羅する `tests/test_komorebi_acceptance.js` — ゲージまたぎ維持 / 音声九九で答えのみが正答にならない / 認識失敗が誤答記録されない / 新カテゴリ開始が本編平均 Lv を変えない / 凍結分母が増えない / pity 上限
4. sw.js CACHE bump と全対象ページの `?v=` bump (新規ファイルの precache 追加を含む)
5. 台帳更新: `docs/zukan_stock_ledger.md` に「Phase 3 実装済み、実 volume 投入待ち」を追記

## 受け入れ基準 (計画全体)

1. 全 Stage のテスト + 既存 node テスト (9 ファイル) + foundry 159 が green
2. 隔離: 本編のいかなる数値 (平均 Lv・プール・分母・達成度・REACH) も不変であることがテストで固定されている
3. 決定事項との整合: design 2 章の決定 1 から 15 に反する実装がない (特に 6 = 時間、9 = コレクション共有、10 = トロフィー条件、13 = SS なし、14 = pity)
4. 仮置き定数が 1 モジュールに集約され、Phase 3 実測調整の変更点が明確
5. Stage ごとに 1 commit、push なし

## Out of scope (再掲 + 追加)

- 実 volume (マダガスカル I) の種データ・写真 — 図鑑パイプライン (release_linkage 4 章) の完了後
- k5 と k10 のコース内配置 (どちらの子のホームに何を見せるか) の UI 磨き
- juken_saito q4b_import への kom_* skill_id 対応表 (リリース後のデータ連携タスク)
- 音声九九の投入時期判断 (design 13 章の未決 5。dan2 実装は行うが、初回更新に含めるかは freeze 時に決める)
