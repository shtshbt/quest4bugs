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

1. 済 リセット周回: Lv10 クリア時刻の記録、7 日ロック判定、リセットボタン + 確認ポップアップ、周回カウント、2 枚交換フロー
2. 済 こはく呼び出し画面のインライン道具ウィジェット (現装備表示 + タップ切替)
3. 済 残り道具 7 種の追加 (Phase 1 で 11 種すべてを定義済み。公開は release 3-5 に分散)
4. 済 道具図鑑 (初回授与の記録)
5. 未 MG I 種データの habitat/tags 遡及追記 (Phase 0 監査で列挙した不足分)
6. 未 volume freeze チェックリストへの guild カバレッジ確認の追記 (`docs/komorebi_release_linkage.md` 4 章)
7. 済 テスト: ロック境界 (7 日前後)、周回カウント、2 枚交換、ウィジェット状態遷移

#### Phase 2 の実装結果 (2026-08-18)

追加・変更したファイル。

| 対象 | ファイル | 内容 |
|---|---|---|
| 公開スイッチ | `komorebi/economy_flag.js` (新規) | CURRENT_RELEASE と MEDAL_ECONOMY_ON の実体。portal と小道の両方が読む |
| 道具アイコン | `komorebi/assets/tool_icons.js` (新規) | 11 種のライン画。交換画面・どうぐばこ・ウィジェット・リザルトで共用 |
| 周回 | `komorebi/trophies.js` | lapOf / mintedLaps / medalCount / resetReadyAt / canReset / beginNextLap。award が周回対応 |
| リセットとウィジェット | `komorebi/app.js` | リセットボタン + 確認ポップアップ、2 枚交換の連続、道具ウィジェット、競合解決の拡張 |
| 図鑑と枚数表示 | `komorebi/uro.js` | 道具図鑑の節、交換ポップアップの「n まいの うち m まいめ」、奉納ログの周回星 |
| 御神木の入口 | `shared/breeding.js`, `index.html` | economy_flag を読んで判定する。portal の変更は script 1 行 |

セーブに増えたキー (すべて additive、既存キーは不変)。

| キー | 形 | 役目 |
|---|---|---|
| `lapCount` | {cat: 1 以上の整数} | いま何周目か (既定 1) |
| `mintedLaps` | {cat: 0 以上の整数} | どの周回まで鋳造したか (既定 0)。枚数はここから導出 |
| `toolDex` | {toolId: 日付文字列} | 道具図鑑。各道具の初回授与日 |

Phase 1 で入れた `lv10ClearAt` は周回ごとに上書きするよう変えた (ロックは直近の
クリアから数える)。`trophies` の獲得日は初回のままで、周回では書き換えない。

テスト (新規): `test_komorebi_portal_gate.js` / `test_komorebi_save_merge.js` /
`test_komorebi_reset_lap.js` / `test_komorebi_tool_widget.js` /
`test_komorebi_tool_dex.js` / `test_komorebi_tool_icons.js`。

#### 点火手順 (メダル経済の公開)

1. `komorebi/economy_flag.js` の `MEDAL_ECONOMY_ON` を `true` にする。更新番号を
   同時に上げるなら `CURRENT_RELEASE` も同じファイルで動かす。実運用で触るのは
   この 2 行だけで、`komorebi/app.js` には公開スイッチの実体を置かない
2. 道具 1 本ずつの `release` (`komorebi/tools.js`) が公開したい更新番号以下か確認する。
   更新 2 で開くのは先行 4 種 (ちょうネット / トンボ用メッシュネット / 灯火採集セット /
   バナナトラップ)。`economy_flag.js` の `toolsFirstRelease` は tools.js の最小
   release と一致していること (`test_komorebi_portal_gate.js` が見張る)
3. volume freeze チェック: 公開する各道具に対象種が 1 種以上いること
4. 全テストを 4 状態 (CURRENT_RELEASE 1/2 × MEDAL_ECONOMY_ON on/off) で通す
5. 配信ファイルの `?v=` と `sw.js` の CACHE 名を deploy 時に一括で上げる。sw.js は
   query を含む URL で一致を見るため、`?v=` を据え置くと復帰した端末が古い実装を
   使い続ける (点火日に御神木のうろ入口が出ない、という形で表に出る)。
   Phase 2 で中身が変わったのは次の通り。
   新規: `komorebi/economy_flag.js`、`komorebi/assets/tool_icons.js`
   (どちらも sw.js の precache と index.html の script に追加済み)。
   要 bump: `komorebi/app.js`、`komorebi/trophies.js`、`komorebi/tools.js`、
   `komorebi/uro.js`、`komorebi/map.css`、`shared/breeding.js`
   (breeding.js は portal と小道の両方の index.html に `?v=` がある)
6. 実機確認: 御神木パネルと小道の地図下端の両方に うろの入口が出ること、
   こはく呼び出し画面に道具の札が出ること、Lv10 クリアから 7 日でリセットボタンが
   出ること

#### Phase 2 の独立レビューで挙がった観測 (2026-08-18、未対応)

1. リセット周回はゲージの供給を落とさない。こはくは `maxLv` で 0.4 に減衰する
   (`feedSideRewards`) が、ゲージは `qualifiesForGauge` が Lv を見ないため、
   周回中の易しい問題でも 8 問 1 匹のまま進む。不変条件 1 (レート不変) は
   文字どおり守られている一方、1 匹あたりの実時間コストは下がる。ゲージを
   `maxLv` で減衰させるのは不変条件 1 に触れるので、まず発行速度の実測
   (10 章の保留事項 2 と同じ枠) で様子を見る
2. 保存の競合解決は `anslog` / `srs` / `stats` / `collection.gauge` /
   `amberAcc` を local 優先のままにしている。とくに `anslog` は発行速度の監視に
   使う演習ログなので、二台運用が続くなら union の対象に足す
3. `validateTools` は知らない道具 id を throw で弾く (Phase 1 の判断)。道具図鑑
   (`validateDex`) は素通しに直したが、道具の instance 側は据え置き。将来の更新で
   道具が増えたあと、古い端末が新しいセーブを読めなくなる余地が残る

#### 検収指摘の残課題 (2026-08-17 の独立レビュー)

Phase 1 の取り込みと更新 2 の公開準備の検収で挙がったもの。いずれも
`MEDAL_ECONOMY_ON=false` の間は表に出ないが、経済を公開する前に片づける。

1. 済 (2026-08-18) 保存の競合解決がメダル経済の追加データを捨てる
   `komorebi/app.js` の `mergeProfileCatches` は `collection.catches` だけを
   突き合わせ、それ以外は local 側の丸ごとコピーを返していた。二台で遊んで競合すると
   remote 側の `uroLog` / `tools` / `equippedToolId` / `trophies` / `lv10ClearAt` が
   黙って消え、奉納の記録は不滅という約束 (設計書 2 章 不変条件 4) が競合経路
   だけ守られていなかった。どちらの側の記録も減らさない統合に直した:
   uroLog は cat + 周回 + 日付 + 道具を鍵にした本数つきの union (2 周目の 2 枚は
   同じ日に並ぶので、鍵が粗いと 1 行に潰れて記録が消え、道具が 1 つ余計に出る)、
   tools は種類ごとに残りの多い順で 1 本ずつ突き合わせ (本数は多い側・各 1 本の
   残りは大きい側)、trophies と toolDex は union で早い日付を優先、lv10ClearAt は
   直近、maxLv / lapCount / mintedLaps は大きい側。周回に属する状態 (いまの Lv、
   昇降の窓、安定判定の窓) は統合後の周回に居る側から丸ごと採る。再送に失敗した
   ときは revision を進めないので、次の保存がもう一度競合して統合をやり直す。
   `tests/test_komorebi_save_merge.js` が競合シナリオを固定する。
2. catalog の jaName が仮称 64 種で学名のまま
   `zukan_config/zukan_catalog.js` のオーストラリア遠征 I 84 件のうち 64 件で
   `jaName` が学名 (例: `Simosyrphus grandicornis`) になっている。取得時点の
   metadata をそのまま写したため。マダガスカル遠征 I は 0 件で、そちらとは不整合。
   画面表示は `shared/bugs.js` の `jaName` を見るので子どもの目には触れないが、
   provenance としては誤り。命名確定 (nameStatus を standard にする作業) の
   タイミングで catalog 側もまとめて是正する。
3. 済 (2026-08-18) 御神木パネルのうろ入口が portal に配線されていない
   `shared/breeding.js` の入口は `Q4B_KOMOREBI` を読んでいたが、portal
   (`index.html`) は `komorebi/app.js` を読み込まないため常に非表示だった。
   軽量なフラグモジュール `komorebi/economy_flag.js` を新設し、判定に要る 2 つの数
   (CURRENT_RELEASE / MEDAL_ECONOMY_ON) をそこへ移した。app.js と breeding.js の
   両方がそれを読む。portal の変更は script 1 行だけで、app.js は読み込まないまま。
   tools.js を持たない portal のために控えの番号 (`toolsFirstRelease`) を置き、
   tools.js の最小 release との一致を `tests/test_komorebi_portal_gate.js` が見張る。

### Phase 3: 演出

1. 済 道具アイコン SVG 11 種 (Phase 2 で先取り。`komorebi/assets/tool_icons.js`)
2. 済 捕獲ビネット (道具ごとの採集シーン)。優先順: 灯火 (夜景) → 落とし穴 → バナナトラップ → 残り
3. 済 うろの輝き (奉納数連動の CSS 変数)、奉納・初回授与・破損の小演出
4. 済 子ども向けメッセージ文言の確定 (「見たことない虫に であいやすくなりそうだ…!」等)

#### Phase 3 の実装結果 (2026-08-18)

branch `claude/komorebi-phase3-fx`。演出はすべて表示だけの層で、抽選・耐久・保存には
一切さわらない。`MEDAL_ECONOMY_ON=false` の間は 1 要素も増えない。

| 対象 | ファイル | 内容 |
|---|---|---|
| 捕獲ビネット | `komorebi/assets/tool_scenes.js` (新規) | 道具ごとの採集シーン 11 種 (SVG) と、添える 1 行 |
| ビネットの配線 | `komorebi/app.js` | `toolSceneHtml` を捕獲リザルトとこはくのモーダルの 2 か所へ |
| うろの輝き | `komorebi/uro.js`, `komorebi/map.css` | halo と 光の粒。強さも 範囲も `--uro-glow` 1 本から導く。入口の札にも同じ変数 |
| 小演出 | `komorebi/app.js`, `komorebi/map.css` | 授与モーダルに捧げた直後の うろ、初回授与の合図、破損の 1 度きりのゆれ |
| 文言 | `komorebi/tools.js`, `komorebi/uro.js` | 5 歳コースの かな名 (`yomi` + `displayName`)、誤った読みの除去、漢字の使いどころ |

決めたこと。

- ビネットが描くのは場面であって種ではない。とれた虫はすぐ下の捕獲カードが描くので、
  ここで種を描き分けると絵と結果が食い違って見える
- 出すのは 3 つとも満たしたときだけ (経済が公開されている / その回に道具を使った /
  実際に 1 匹とれた)。壊れた回でもその 1 匹はとれているので出す
- 色は SVG の presentation attribute に既定を持たせる。CSS を読み込んでいない文脈でも
  絵が潰れない (アイコンが `stroke="currentColor"` で潰れないのと同じ考え方)
- CSS の transform は SVG の transform 属性を置き換える。ゆれを掛ける g と位置を持つ g を
  分けてある (混ぜると虫が原点へ飛ぶ)
- 輝きの変数は 1 本だけ。2 本に割ると片方だけ動いている状態が作れてしまう。段階クラスも
  作らない (「レベルが上がった」に見える)。設計書 10 章 保留事項 6 はこれで片づいた
- 道具の名前は実在の採集法の名前なので漢字が残る。小道のふりがなは語の辞書引きなので、
  そのまま出すと 5 歳コースで読めない (灯火採集セット) か、部分一致で誤った読みが付く
  (吸虫管 の 虫 に「むし」)。`yomi` を足し、5 歳コースだけ かなの名前へ倒す
- 名前いがいの文は、読みが付く 4 字 (虫・白・中・見) だけに限る

テスト (新規): `test_komorebi_tool_scenes.js` / `test_komorebi_fx.js` /
`test_komorebi_wording.js`。4 状態 (CURRENT_RELEASE 1/2 × MEDAL_ECONOMY_ON on/off) で
全件 green。

統合時の注意。

- `?v=` と `sw.js` の CACHE 名は Phase 3 では上げていない。統合時に一括で上げる
- 新規配信ファイル: `komorebi/assets/tool_scenes.js` (`sw.js` の precache と
  `komorebi/index.html` の script には追加済み)
- 要 bump: `komorebi/app.js`、`komorebi/uro.js`、`komorebi/tools.js`、`komorebi/map.css`
- `komorebi/map.css` は 65 行目の `@media (prefers-reduced-motion:reduce)` で
  `*{animation:none!important}` を既に持つ。Phase 3 で足した個別の停止行はその念押しで、
  片方だけ消しても動きは止まる

## 2. 作業分担

| 担当 | 役割 |
|---|---|
| 統括 | 計画管理、Phase 間の統合レビュー、経済不変条件の最終検証、commit / 公開判断 |
| 実装担当 (経済コア) | tools.js の instance / 耐久、抽選統合、リセット周回。exploit 面の再点検を含む |
| 実装担当 (調査・UI) | 調査 (Phase 0)、UI (uro.js、ウィジェット、リザルト表示)、テスト実装、SVG アセット |
| 文案担当 (助言のみ) | フレーバーテキスト草案 (道具説明、破損・奉納メッセージ)。草案は統括が検収してから採用 |

各担当には対象ファイルと仕様書該当節のみを渡し、影響範囲外 (他ゲーム・zukan パイプライン) への変更を禁止する。

## 3. 品質ゲート

- 全テスト green (既存 + 新規)
- 経済不変条件チェックリスト (設計書 2 章の 6 か条) を Phase ごとに目視確認
- 実装者とは別枠の独立レビュー (Phase 1 と 2 の完了時)
- 実機確認: 二人ぶんの profile での動作 (course 分離、道具・うろの表示、破損イベント)
- セーブ後方互換: 旧セーブの読込みで例外が出ないこと (additive 検証)

## 4. リリース統合

- 公開は CURRENT_RELEASE で段階解禁。Phase 1 の機能公開は更新 2 (オーストラリア遠征 I) に同梱するのが既定 (新 volume + 新機能で目玉を束ねる)
- 更新 2 の前倒し (2026-08-17 決定): Phase 1 の道具 4 種が準備できた時点で、カレンダーを待たず更新 2 を先行公開する。才澄の Lv6 到達を踏まえ、新 volume + 新カテゴリ (unit_convert) + 道具で注意を分散させ、単一カテゴリの駆け上がりを自然に緩める。前倒しの gating 要素はオーストラリア I の volume freeze (写真 + 命名 + freeze) で、道具実装とは独立に進む
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
