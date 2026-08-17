# メダル経済と採集道具 実装計画書

- 版: v1.0
- 日付: 2026-08-17
- 親文書: `docs/komorebi_tools_design.md` (仕様)、`CLAUDE.md` (運用規則)
- 役割: 設計書の実装を Phase に分解し、作業単位・担当・検証・リリース統合を定める。

---

## 0. 制約と前提

- branch: `claude/komorebi-phase3` から派生する作業 branch (`claude/komorebi-tools`) で進め、Phase ごとに親へ戻す
- セーブ互換: QuestSave への変更は additive のみ。既存キー (trophyProgress 等) はリネームしない
- 各ゲームの自己完結原則: 変更は `komorebi/` と `shared/storage.js` の追記に限る。他ゲームのディレクトリに触れない
- 配信ファイル変更時は `?v=` と `sw.js` の CACHE 名 (現行 q4b-cache-v146) を bump
- commit 前 safety check (`git diff --cached --name-only | grep -E '_inbox|_archive|_pipeline|_L1_segmented|_original\.'`) を毎回実行。zukan_cards/metadata の未追跡 JSON (写真パイプライン進行中) には触れない
- テストは `for f in tests/test_*.js; do node $f; done` で全件通す
- 目標時期: Phase 1 を才澄の初メダル成立 (ratio の Lv10 + 安定判定) 前に deploy する。現在 Lv6 のため実質今週

## 1. Phase 分解

### Phase 0: 調査 (読み取りのみ、実装前に 1 回)

1. こはく呼び出しの完全な経路 (amberCallCapture → drawCapture) と、ゲージ捕獲経路の合流点の特定
2. QuestSave の profile スキーマ現況と、追加フィールドの配置確認
3. komorebi/data/*.json の guild カバレッジ監査: MG I 公開種に対し 11 道具の matcher を仮適用し、対象ゼロの道具と habitat/tags 不足種を列挙
4. trophies.js の鋳造判定がどこで発火するかの特定 (交換フロー割込み点)
5. テストの現況地図 (どの test が抽選・セーブ・トロフィーに触れているか)

成果物: 調査メモ (実装 branch の docs/ 下書きか PR 説明に記載)。

### Phase 1: 経済の芯 (初メダル前に出す)

1. `komorebi/tools.js` 新規: 道具定義 (先行 4 種: ちょうネット・灯火採集セット・高所用長竿・落とし穴トラップ。MG I の guild 構成をカバーする組で、Phase 0 の監査結果により差し替え可)、matcher、instance 管理 (所持・装備・耐久)
2. セーブ追加: tools (instance list)、uroLog、equippedToolId
3. 抽選統合: pickSpecies の guild 重み 3 倍、drawCapture の未発見振替 +0.25、耐久消費 (捕獲 1 回 = 1)
4. `komorebi/uro.js` 新規: かがやきのうろ (奉納ログ表示、鋳造時の即時交換ポップアップ、メダルラック)
5. trophies.js: 表示文字列のメダル化、鋳造成立時に交換フローを起動
6. リザルト画面の耐久小表示、破損小イベント + 自動持ち替え
7. テスト: 不変条件 (レート不変・レアリティ表不動・残高ゼロ)、matcher 単体、耐久境界、交換フロー冪等性
8. cache bump + 実機確認 (`python3 -m http.server 8000`)

公開制御: 道具・うろの UI は CURRENT_RELEASE ゲートに乗せる (deploy と公開の分離、現行方式のまま)。

### Phase 2: 周回とターゲティングの完成

1. リセット周回: Lv10 クリア時刻の記録、7 日ロック判定、リセットボタン + 確認ポップアップ、周回カウント、2 枚交換フロー
2. こはく呼び出し画面のインライン道具ウィジェット (現装備表示 + タップ切替)
3. 残り道具 7 種の追加 (更新カレンダーに分散させ、各更新の目玉を兼ねる)
4. 道具図鑑 (初回授与の記録)
5. MG I 種データの habitat/tags 遡及追記 (Phase 0 監査で列挙した不足分)
6. volume freeze チェックリストへの guild カバレッジ確認の追記 (`docs/komorebi_release_linkage.md` 4 章)
7. テスト: ロック境界 (7 日前後)、周回カウント、2 枚交換、ウィジェット状態遷移

### Phase 3: 演出

1. 道具アイコン SVG 11 種
2. 捕獲ビネット (道具ごとの採集シーン)。優先順: 灯火 (夜景) → 落とし穴 → バナナトラップ → 残り
3. うろの輝き (奉納数連動の CSS 変数)、奉納・初回授与・破損の小演出
4. 子ども向けメッセージ文言の確定 (「見たことない虫に であいやすくなりそうだ…!」等)

## 2. 作業分担

| 担当 | 役割 |
|---|---|
| orchestrator (本セッション) | 計画管理、Phase 間の統合レビュー、経済不変条件の最終検証、commit / 公開判断 |
| opus subagent | 経済コア (tools.js の instance / 耐久、抽選統合、リセット周回)。exploit 面の再点検を含む |
| sonnet subagent | 調査 (Phase 0)、UI (uro.js、ウィジェット、リザルト表示)、テスト実装、SVG アセット |
| bonsai (advisory) | フレーバーテキスト草案 (道具説明、破損・奉納メッセージ)。出力は orchestrator が検収してから採用 |

subagent には対象ファイルと仕様書該当節のみを渡し、影響範囲外 (他ゲーム・zukan パイプライン) への変更を禁止する。

## 3. 品質ゲート

- 全テスト green (既存 + 新規)
- 経済不変条件チェックリスト (設計書 2 章の 6 か条) を Phase ごとに目視確認
- strict-reviewer による独立レビュー (Phase 1 と 2 の完了時)
- 実機確認: 二人ぶんの profile での動作 (course 分離、道具・うろの表示、破損イベント)
- セーブ後方互換: 旧セーブの読込みで例外が出ないこと (additive 検証)

## 4. リリース統合

- 公開は CURRENT_RELEASE で段階解禁。Phase 1 の機能公開は更新 2 (オーストラリア遠征 I) に同梱するのが既定 (新 volume + 新機能で目玉を束ねる)
- 更新ごとの道具追加は release note の 3 行目になる (新しい虫 / 新カテゴリ / 新しい道具)
- `docs/komorebi_release_linkage.md` の更新カレンダーに道具列を追記する (Phase 2 で)
- メダル発行速度と道具消耗の実測を q4b_import の演習ログ経由で監視し、保留事項の数値調整に使う

## 5. リスク

| リスク | 対応 |
|---|---|
| セーブ破損・互換性 | additive のみ + 旧セーブ読込みテスト。書込み前に現行スキーマの validate |
| 抽選コードの regression | drawCapture / pickSpecies は単体テストを先に書いてから触る |
| 経済インフレ (周回 2 枚) | 発行速度の実測監視。調整レバーは設計書 10 章に既定 |
| 二人の profile 差 | course 分離の前提をテストで固定 (k10 profile から k5 カテゴリの鋳造が起きないこと) |
| 演出の作業膨張 | Phase 3 に隔離。Phase 1-2 の完了を演出に依存させない |
| 写真パイプラインとの衝突 | zukan_cards / _inbox 系に一切触れない。safety check を毎 commit 実行 |
