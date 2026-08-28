# 木漏れ日の小道 更新カレンダーと紐づけ (地域 × 図鑑 × カテゴリ)

- 版: v0.2 (倍速カレンダー。2026-08-14 決定: k10 と k5 は足並みを揃え、段は 1 更新 2 本。学習カテゴリ全 17 本を更新 1 から 4 = 8 週間 (約 2 か月) に収める)
- 日付: 2026-08-14 (v0.1 draft: 2026-08-12)
- 親文書: `docs/komorebi_design.md` (3 章 manifest、6 章 コレクション、12 章 運用)、`docs/komorebi_categories.md` (roster)、`docs/komorebi_regions.md` (v0.3)
- 役割: C 系統 (リンク) の設計初版。どの更新で、どの地域 volume と、どの学習カテゴリを、どのトロフィー紐づけで出すかを 1 枚で定める。

---

## 1. 前提と入力

- 更新テンポ: 約 2 週間ごとに 1 地域 volume。更新 1 から 4 は学習カテゴリ 4 から 5 本を同梱 (倍速)、更新 5 から 8 は図鑑の巻のみ。開始は Phase 3 実装完了後。
- 倍速の理由 (2026-08-14): 対象の子はすでに 7×8 等を足し算で処理しており、段の暗唱は早く届くほど効く。旧カレンダー (段 1 本/更新 × 8 = 16 週) は長すぎるため半減した。
- volume サイズ: 80 から 100 種 (決定 11)。看板 1 種 / volume (決定 12)、N/R/SR のみ (決定 13)。
- 地域在庫 (2026-08-12 時点の seeds、後処理前): マダガスカル 301 / オーストラリア 302 / ボルネオ 200 / コスタリカ 301、計 1,104。
- 在庫の目減り要因 (未確定): 対カタログ重複判定と名前 enrichment が未実施。教科 seeds の重複率 (28%) より低い見込みだが (カタログは国内中心)、volume 種数は後処理後に確定する。
- k5 と k10 は同じ volume を共有する (決定 9)。カテゴリの対象年齢に関係なく、その期間の捕獲は共通プールから出る。

## 2. 更新カレンダー (枠方式。2026-08-28 再編)

### 2.0 方式

更新番号は**枠**であって、地域と学習カテゴリの予約席ではない。どの地域を当てはめるかは
図鑑 (写真と命名と freeze) の準備次第、どの学習カテゴリを置くかはカテゴリの完成次第で、
準備できたものから順に若い枠へ入れる。deploy 済みの枠 (更新 1 から 3) だけが固定で、
それ以降は自由に組み替えてよい。

守る規則は 1 つだけである。

> **1 巻につき k10 を 2 本以上、k5 を 2 本以上あてる。**

この下限を割った巻は、そのコースの子にとって学習を経ずに図鑑が埋まる巻になる。こはく
呼び出しはコースを見ずに巻を選ぶ (`komorebi/app.js` の `amberCallVolume`) ため、学習
カテゴリの薄い巻は図鑑を対価なしで配ることになる。k5 を 2 本としたのは k10 との整合で、
既存の公開済み 3 巻が持つ 3 本から 1 本減る (2026-08-28 決定)。

再編の理由: 写真 0/84 のコスタリカ遠征 I を更新 4 に置いていたため、写真 100% で凍結
済みの 2 巻 (マダガスカル遠征 II、オーストラリア遠征 II) がその後ろで待たされ、チェーン
全体のブロッカーになっていた。準備の遠い巻を若い枠に固定しない。

### 2.1 現在の割り当て

第 4 列が機械可読の正本である (`tests/test_komorebi_release_gate.js` が読み、実装の
`CATEGORIES` と突き合わせる)。cat id を `+` で連ねる。カテゴリ未定の枠は「なし」と書く。

| 更新 | 地域 volume | 種数 | 学習カテゴリ (k10 2 + k5 2) | 写真 | 状態 |
|---|---|---:|---|---:|---|
| 1 | マダガスカル遠征 I | 84 | kom_ratio + kom_pi314 + kom_kuku_dan2 + kom_kuku_dan5 + kom_kuku_run | 68% | deploy 済 |
| 2 | オーストラリア遠征 I | 84 | kom_unit_convert + kom_diagram_model + kom_kuku_ura + kom_kuku_dan3 + kom_kuku_dan4 | 95% | deploy 済 |
| 3 | ボルネオ遠征 I | 84 | kom_frac_flow + kom_ratio_forms + kom_kuku_inverse + kom_kuku_dan6 + kom_kuku_dan7 | 100% | deploy 済 |
| 4 | オーストラリア遠征 II | 84 | kom_hayasa + kom_johou_seiri + kom_equation_select + kom_kuku_dan8 | 100% | 準備済 |
| 5 | マダガスカル遠征 II | 80 | kom_seisu + kom_kisokusei + kom_kuku_bridge + kom_kuku_dan9 | 100% | 整数の性質の実装待ち |
| 6 | 未定 | | なし | | 枠のみ |
| 7 | 未定 | | なし | | 枠のみ |
| 8 | コスタリカ遠征 I | 84 | なし | 0% | 写真取得が全量残 |

読み方の補足。更新 1 から 3 は k5 が 3 本で、これは再編前の配分である。更新 4 以降が
k10 2 + k5 2 の新しい規則に従う。

更新 6 と 7 の候補はボルネオ遠征 II とコスタリカ遠征 II で、どちらも manifest 未作成。
準備できた順に入れる。

k10 の在庫は更新 5 で尽きる。未投入の 4 本 (整数の性質・きまりと数えかた・速さ・情報整理)
をちょうど使い切るため、更新 6 以降は新規カテゴリの開発が必須になる。k5 も同じく更新 5 で
段カテゴリ 8 本が出揃い、未投入がゼロになる。

### 2.2 旧カレンダー (2026-08-28 まで。参考)

| 更新 | 地域 volume | 看板 (確保済) | 新カテゴリ | 新 採集道具 | 備考 |
|---|---|---|---|---|---|
| 1 (初回) | マダガスカル遠征 I | コメットガ | kom_ratio + kom_pi314 + kom_kuku_dan2 + kom_kuku_dan5 + kom_kuku_run | (なし) | k10 2 + k5 3。ratio は Lv1-10 一括投入 |
| 2 | オーストラリア遠征 I | ユリシス | kom_unit_convert + kom_diagram_model + kom_kuku_ura + kom_kuku_dan3 + kom_kuku_dan4 | ちょうネット / トンボ用メッシュネット / 灯火採集セット / バナナトラップ | k10 2 + k5 3。図化は release 9 から前倒し。道具はスイッチ別 (下記) |
| 3 | ボルネオ遠征 I | アカエリトリバネアゲハ | kom_frac_flow + kom_ratio_forms + kom_kuku_inverse + kom_kuku_dan6 + kom_kuku_dan7 | スイーピングネット / さかなとりあみ | k10 2 + k5 3。ratio_forms は 2026-08-28 に release 9 から前倒し (下記) |
| 4 | コスタリカ遠征 I | ハキリアリ | kom_kuku_bridge + kom_equation_select + kom_kuku_dan8 + kom_kuku_dan9 | ビーティングセット / 吸虫管 | 学習カテゴリ 17 本はここで出揃う |
| 5 | マダガスカル遠征 II | マダガスカルオオゴキブリ | (なし。図鑑の巻のみ) | 高所用長竿 / 落とし穴トラップ / フントラップ | II 巻のカテゴリ帰属は freeze 時に他地域公開済み cat から指定 (地域内 1 cat 1 遠征の規則は維持)。道具 11 種はここで出揃う |
| 6 | オーストラリア遠征 II | クリスマスビートル | (なし。図鑑の巻のみ) | (なし) | |
| 7 | ボルネオ遠征 II | モーレンカンプオオカブト | (なし。図鑑の巻のみ) | (なし) | ボルネオ在庫はここで打ち止め (200) |
| 8 | コスタリカ遠征 II | ビワハゴロモ | (なし。図鑑の巻のみ) | (なし) | |
| 9 | マダガスカル遠征 III | (volume freeze 時に指名) | 完成順に投入 (残る待機分 / 既存 cat の Lv 追加) | (なし) | |
| 10 以降 | オーストラリア III、コスタリカ III、新地域 (Tier 2) | 同上 | kom_exhaustive_search (新 kind 実装後)、予備在庫、Lv 追加 | (なし) | 新地域 harvest は更新 6 ごろまでに開始 |

- 道具列の読み方 (2026-08-17 決定): 道具の release 番号は上の更新番号と同じ体系だが、公開は
  更新番号だけでは開かない。`komorebi/app.js` の `MEDAL_ECONOMY_ON` が独立したスイッチとして
  前段にあり、これが false の間はメダル経済一式 (採集道具・かがやきのうろ・交換ポップアップ・
  装備効果・耐久表示) が丸ごと出ない。地域 volume は新奇性が効くうちに出したいが、道具は
  手が止まりかけた頃に効くので、同じ deploy に束ねないための分離。
- したがって更新 2 の deploy は「AU I の巻 + 学習カテゴリ 5 本」だけで、道具は別日の
  deploy (`MEDAL_ECONOMY_ON` を true にして cache を上げるだけ) になる。スイッチが
  false の間に成立したメダルは、うろの初回訪問で遡って奉納できる。

- 更新 3 の kom_ratio_forms 追加 (2026-08-28 決定): 巻あたり k10 2 本を下限とする方針で release 9 から前倒しした。更新 3 の k10 が kom_frac_flow 1 本だけだと、10 歳コースの子はボルネオ I の 84 種を 1 カテゴリで消費しきり、残りはこはく購入 (学習を経ない経路) でしか埋まらない。こはく呼び出しはコースを見ずに巻を選ぶ (`komorebi/app.js` の amberCallVolume) ため、学習カテゴリが薄い巻は図鑑を対価なしで配ることになる。当時ゲート待ちだった kom_kisokusei / kom_hayasa には触れず、予備在庫の本カテゴリだけを動かした (ゲート自体は同日中に撤廃)。
- 更新 2 の kom_diagram_model 追加 (2026-08-17 決定): 受験 ROI 優先で release 9 から前倒しした。線分図・面積図・表は割合と速さの土台で、3 本の待機カテゴリ (ratio_forms / johou_seiri / diagram_model) の中で最も早く効く。更新 2 の前倒し公開 (implementation_plan 4 章) と束ねる。
- 在庫収支: 更新 9 まで 9 volume ≒ 900 種需要 vs seeds 1,104。後処理の目減りを 1 割と見ても成立。更新 10 以降は AU III / CR III (在庫各 300 で III まで可) と Tier 2 新地域 (フィリピン、ニューギニア等) の harvest で継ぐ。
- 段カテゴリの解禁順 (2, 5, 3, 4, 6, 7, 8, 9) は roster 3.2 章の段順のまま、1 更新 2 本の倍速で出す。全 8 段が更新 4 (8 週目) で出揃う。
- 更新 5 から 8 は学習カテゴリを伴わない図鑑ドロップなので、間隔は隔週に固定せず、巻の準備 (写真 + 命名 + freeze) が済み次第前倒ししてよい。
- 追加カテゴリ枠: **2026-08-28 決定: 完成したものから順に投入する。** 2026-08-13 の「9 月の模試結果を見てから検討する」ゲートは撤廃した (roster 4 章の記録 13)。判定の精度より供給の不足が効くようになったため。k10 カテゴリは総数 9 本しかなく、巻あたり k10 2 本の下限に対して完成品を寝かせる余裕がない。

## 3. トロフィー紐づけ (design 6.6 / 6.7)

- 規定: cat の代表虫 = その cat の最終 Lv 帯を投入した volume の看板。
- 初回投入 cat は Lv1-10 を一括投入するため、代表虫 = 投入と同じ更新の看板になる。
- 同一更新で複数 cat が入る場合 (倍速では毎回 4 から 5 本)、看板を割り当てるのは k10 側 1 本を既定とし、残りの cat は trophy manifest で volume 内の別種 (SR 帯) を個別指定する。
- 更新 1 の割当 (komorebi/trophies.js に確定済み): kom_ratio = コメットガ (oo_onaga_yamamayu、看板)、kom_pi314 = medama_yamamayu、kom_kuku_dan2 = kanmuri_kareha_kamakiri、kom_kuku_dan5 = benihoshi_oo_ageha、kom_kuku_run = oo_togeashi_kirigirisu。
- 更新 2 以降の割当表は volume freeze 時 (種のレアリティ確定後) に本書へ追記する。
- 更新 2 の割当 (2026-08-17 の volume freeze で確定、`komorebi/trophies.js`): kom_diagram_model = ウリッセスアゲハ (papilio_ulysses、看板)、kom_unit_convert = podacanthus_viridiroseus、kom_kuku_ura = lamprima_aurata、kom_kuku_dan3 = extatosoma_tiaratum、kom_kuku_dan4 = chrysolopus_spectabilis。k10 が 2 本あるため、看板は受験 ROI で前倒しした図化に立てた。未割当の SR 予備は papilio_aegeus / tectocoris_diophthalmus / eupoecila_australasiae / dasypodia_selenophora / myrmecia_forficata。
- 更新 3 の割当 (2026-08-21 の volume 発射待機仕込みで確定、`komorebi/trophies.js`): kom_frac_flow = アカエリアゲハ (trogonoptera_brookiana、看板)、kom_kuku_inverse = lyssa_zampa (オオツバメガ)、kom_kuku_dan6 = discotettix_belzebuth (ツノヒシバッタ)、kom_kuku_dan7 = toxodera_hauseri (エダカマキリ)。規定どおり看板は k10 側 1 本 (frac_flow) に立て、k5 の 3 本は SR 帯から読みやすい名の種を選んだ。未割当の SR 予備は troides_amphrysus / neurobasis_longipes / haaniella_echinata / pulchriphyllium_mannani。

## 4. 図鑑側の前提パイプライン (各 volume の公開前に必要)

1. 対カタログ重複判定 (synonym 込み。地域 seeds は backfill 済み)
2. 名前 enrichment (決定 1: 標準和名 → 通用名 → 仮称 → 英語一般名の優先順)
3. 種選抜: volume 80 から 100 種、N/R/SR 構成 + 看板 SR 指定 (5.4 章の抽選設計に接続)
   - バトル属性 (分類ベース: チョウ→かんじ / 甲虫→けいさん / 他→えいご) の配分を確認し、可能な範囲で 3 属性を確保する。実測: MG Ⅰ は 22/4/58 とえいご偏重 (凍結済みのため受容)
4. 標本写真の zukan-fetch (museum tier)。リードタイム最大の工程で、更新 1 の volume は Phase 3 実装と並行して先行着手する
5. volume freeze (分母確定、以後増やさない。決定 4)
- 未在庫の看板 (チャニナナフシ) は must-have 再試行を継続し、確保できるまで看板に立てない。
- guild カバレッジ確認: 公開中の各道具に対象種が1種以上いるか (11 種の matcher を volume の種構成へ仮適用。対象ゼロの道具が残ったまま公開すると、道具だけ出て実際には何も拾えない。`komorebi_tools_implementation_plan.md` Phase 0 の監査手順と同じ)。

## 5. 検証点

- 9 月 LOGOS: 投入済みカテゴリの Lv 配分を見直す材料にする (2026-08-28 以降、投入可否のゲートではない)。
- 各 volume 公開後: 対応 cat の演習ログが juken_saito 基盤へ自動連携される (q4b_import)。komorebi カテゴリの skill_id 対応表を q4b_import 側へ追加する作業が発生する (kom_ratio → wariai_kihon / soutou / baibai 等)。
- 完走ペース: 種数 × 8 正答が下限、pity 込み期待 1.2 から 2 倍 (決定 14)。2 週間で 640 から 800 正答は 1 日 50 正答前後に相当し、過去地域の常時開放 (5.5 章) が吸収する。

## 6. レビューで確認したい事項

1. 更新 1 を 3 カテゴリ (ratio + dan2 + run) にする点 (標準は 1 から 2 本。初回だけ k5 と k10 の両輪を立てるための例外)。
2. 地域ローテーションの順序 (MG → AU → ボルネオ → CR の輪番。看板の強さで初回をマダガスカルにしている)。
3. k5 側トロフィーの「volume 内別 SR 指定」方式。
4. 更新 6 ごろまでに始める新地域 harvest の候補 (Tier 2 のフィリピン / ニューギニア / 中央アフリカ等、docs/komorebi_regions.md の照合済みリストから)。
