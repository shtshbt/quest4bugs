# 木漏れ日の小道 更新カレンダーと紐づけ (地域 × 図鑑 × カテゴリ)

- 版: v0.1 draft (レビュー用)
- 日付: 2026-08-12
- 親文書: `docs/komorebi_design.md` (3 章 manifest、6 章 コレクション、12 章 運用)、`docs/komorebi_categories.md` (roster)、`docs/komorebi_regions.md` (v0.3)
- 役割: C 系統 (リンク) の設計初版。どの更新で、どの地域 volume と、どの学習カテゴリを、どのトロフィー紐づけで出すかを 1 枚で定める。

---

## 1. 前提と入力

- 更新テンポ: 約 2 週間ごとに 1 地域 volume + 学習カテゴリ 1 から 2 本 (design 12 章)。開始は Phase 3 実装完了後。
- volume サイズ: 80 から 100 種 (決定 11)。看板 1 種 / volume (決定 12)、N/R/SR のみ (決定 13)。
- 地域在庫 (2026-08-12 時点の seeds、後処理前): マダガスカル 301 / オーストラリア 302 / ボルネオ 200 / コスタリカ 301、計 1,104。
- 在庫の目減り要因 (未確定): 対カタログ重複判定と名前 enrichment が未実施。教科 seeds の重複率 (28%) より低い見込みだが (カタログは国内中心)、volume 種数は後処理後に確定する。
- k5 と k10 は同じ volume を共有する (決定 9)。カテゴリの対象年齢に関係なく、その期間の捕獲は共通プールから出る。

## 2. 更新カレンダー (相対番号。日付は運用開始時に確定)

| 更新 | 地域 volume | 看板 (確保済) | 新カテゴリ | 備考 |
|---|---|---|---|---|
| 1 (初回) | マダガスカル遠征 I | コメットガ | kom_ratio + kom_kuku_dan2 + kom_kuku_run | 初回のみ 3 本 (k10 1 + k5 2)。ratio は Lv1-10 一括投入 |
| 2 | オーストラリア遠征 I | ユリシス | kom_kuku_dan5 + kom_pi314 | |
| 3 | ボルネオ遠征 I | アカエリトリバネアゲハ | kom_kuku_dan3 + kom_unit_convert | |
| 4 | コスタリカ遠征 I | ハキリアリ | kom_kuku_dan4 + kom_kuku_ura | |
| 5 | マダガスカル遠征 II | マダガスカルオオゴキブリ | kom_kuku_dan6 + kom_kuku_inverse | |
| 6 | オーストラリア遠征 II | クリスマスビートル | kom_kuku_dan7 + kom_frac_flow | |
| 7 | ボルネオ遠征 II | モーレンカンプオオカブト | kom_kuku_dan8 + kom_kuku_bridge | ボルネオ在庫はここで打ち止め (200) |
| 8 | コスタリカ遠征 II | ビワハゴロモ | kom_kuku_dan9 + kom_equation_select | |
| 9 | マダガスカル遠征 III | (volume freeze 時に指名) | 9 月 LOGOS ゲート判定の結果枠 (kom_kisokusei / kom_hayasa / 既存 cat の Lv 追加) | |
| 10 以降 | オーストラリア III、コスタリカ III、新地域 (Tier 2) | 同上 | kom_exhaustive_search (新 kind 実装後)、予備在庫、Lv 追加 | 新地域 harvest は更新 6 ごろまでに開始 |

- 在庫収支: 更新 9 まで 9 volume ≒ 900 種需要 vs seeds 1,104。後処理の目減りを 1 割と見ても成立。更新 10 以降は AU III / CR III (在庫各 300 で III まで可) と Tier 2 新地域 (フィリピン、ニューギニア等) の harvest で継ぐ。
- 段カテゴリの解禁順 (2, 5, 3, 4, 6, 7, 8, 9) は roster 3.2 章の段順。毎更新に k5 の弾を 1 本入れることで、優澄側にも常に新カテゴリが届く。

## 3. トロフィー紐づけ (design 6.6 / 6.7)

- 規定: cat の代表虫 = その cat の最終 Lv 帯を投入した volume の看板。
- 初回投入 cat は Lv1-10 を一括投入するため、代表虫 = 投入と同じ更新の看板になる。
- 同一更新で複数 cat が入る場合 (毎回 2 から 3 本)、看板を割り当てるのは k10 側 1 本を既定とし、k5 側の cat は trophy manifest で volume 内の別種 (SR 帯) を個別指定する。例: 更新 1 は kom_ratio = コメットガ、kom_kuku_dan2 と kom_kuku_run = マダガスカル I の別 SR 2 種。
- 割当表は volume freeze 時 (種のレアリティ確定後) に本書へ追記する。

## 4. 図鑑側の前提パイプライン (各 volume の公開前に必要)

1. 対カタログ重複判定 (synonym 込み。地域 seeds は backfill 済み)
2. 名前 enrichment (決定 1: 標準和名 → 通用名 → 仮称 → 英語一般名の優先順)
3. 種選抜: volume 80 から 100 種、N/R/SR 構成 + 看板 SR 指定 (5.4 章の抽選設計に接続)
4. 標本写真の zukan-fetch (museum tier)。リードタイム最大の工程で、更新 1 の volume は Phase 3 実装と並行して先行着手する
5. volume freeze (分母確定、以後増やさない。決定 4)
- 未在庫の看板 (チャニナナフシ) は must-have 再試行を継続し、確保できるまで看板に立てない。

## 5. 検証点

- 9 月 LOGOS: 更新 9 の内容を確定させる (roster 原則 5 の投入判定信号)。
- 各 volume 公開後: 対応 cat の演習ログが juken_saito 基盤へ自動連携される (q4b_import)。komorebi カテゴリの skill_id 対応表を q4b_import 側へ追加する作業が発生する (kom_ratio → wariai_kihon / soutou / baibai 等)。
- 完走ペース: 種数 × 8 正答が下限、pity 込み期待 1.2 から 2 倍 (決定 14)。2 週間で 640 から 800 正答は 1 日 50 正答前後に相当し、過去地域の常時開放 (5.5 章) が吸収する。

## 6. レビューで確認したい事項

1. 更新 1 を 3 カテゴリ (ratio + dan2 + run) にする点 (標準は 1 から 2 本。初回だけ k5 と k10 の両輪を立てるための例外)。
2. 地域ローテーションの順序 (MG → AU → ボルネオ → CR の輪番。看板の強さで初回をマダガスカルにしている)。
3. k5 側トロフィーの「volume 内別 SR 指定」方式。
4. 更新 6 ごろまでに始める新地域 harvest の候補 (Tier 2 のフィリピン / ニューギニア / 中央アフリカ等、docs/komorebi_regions.md の照合済みリストから)。
