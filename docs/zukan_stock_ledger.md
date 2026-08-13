# 図鑑在庫台帳とリリース引当

- 版: v0.1 (2026-08-12)
- 親文書: `docs/komorebi_release_linkage.md` (更新カレンダー)、`docs/komorebi_regions.md` (地域定義)
- 役割: 図鑑ストックの全プール・状態・引当先をセッションをまたいで参照できる台帳。数値を更新したら日付を添えて本書を書き換える。

---

## 1. 在庫プールの全体像 (2026-08-12 実測)

| プール | 件数 | 状態 | 用途 |
|---|---|---|---|
| 現行カタログ (配信中) | 1,213 種 | 標本カード 892 / SVG フォールバック 321 | 本編の分母。凍結済み |
| 地域 seeds (小道用) | 1,104。**使用可能 1,070** (2026-08-12 対カタログ判定済み: マダガスカル 295/301、オーストラリア 291/302、ボルネオ 188/200、コスタリカ 296/301。真の重複 34 = 汎存種と本編収録済み有名種) | synonym backfill 済み。名前 enrichment 未実施 | 小道 volume (更新 1 から 9+)。ボルネオ II は 88 種規模 (下限 80 クリア) |
| 教科 seeds (本編拡張用) | 2,300。使用可能 **1,621** (resolved 1,432 + 監査クリア 219 − 直接照合の取りこぼし 30。2026-08-12) | 教科割当: eitango 670 / kanji 541 / keisan 410 | 810 種活性化 + 本編拡張 450 選抜済み (下記トラック) |
| 未撮影 hard-core | 320 種 (カタログ内 SVG のみ) | museum / iNat CC0 / Wikipedia 全 fail の残り | 将来の写真再挑戦。小道とは独立 |
| 個別未撮影 | chairo_kanabun 1 種 | すげ替え (dc308a3) で entry あり写真なし | zukan-fetch 1 種で media 893 に復帰 |

- must-have 看板の確保状況: コメットガ・マダガスカルオオゴキブリ・ユリシス・クリスマスビートル・ロードハウナナフシ・アカエリトリバネアゲハ・モーレンカンプオオカブト・ハキリアリ・ビワハゴロモ = 在庫済み。チャニナナフシのみ GBIF 地域内 occurrence 0 で未確保 (harvest のたびに自動再試行)。
- プール間の突き合わせ (地域 seeds × 教科 seeds × カタログ) は未実施。同一種が複数プールにいる可能性があり、volume 選抜前の重複判定で解消する。

## 2. リリースタイムライン × 在庫引当

各 volume 100 種で引当てた場合の残数推移 (目減り前の粗い引当。実数は後処理後に確定):

| 更新 | volume | 引当 | 引当後の地域残 | 看板 | 新カテゴリ |
|---|---|---|---|---|---|
| 1 | マダガスカル I | MG 100 | MG 201 | コメットガ | kom_ratio + dan2 + run |
| 2 | オーストラリア I | AU 100 | AU 202 | ユリシス | dan5 + pi314 |
| 3 | ボルネオ I | ボルネオ 100 | ボルネオ 100 | アカエリトリバネアゲハ | dan3 + unit_convert |
| 4 | コスタリカ I | CR 100 | CR 201 | ハキリアリ | dan4 + ura |
| 5 | マダガスカル II | MG 100 | MG 101 | マダガスカルオオゴキブリ | dan6 + inverse |
| 6 | オーストラリア II | AU 100 | AU 102 | クリスマスビートル | dan7 + frac_flow |
| 7 | ボルネオ II | ボルネオ 100 | ボルネオ 0 (打ち止め) | モーレンカンプオオカブト | dan8 + bridge |
| 8 | コスタリカ II | CR 100 | CR 101 | ビワハゴロモ | dan9 + equation_select |
| 9 | マダガスカル III | MG 80 から 100 | MG ほぼ 0 | freeze 時指名 | 9 月 LOGOS ゲート結果枠 |
| 10+ | オーストラリア III / コスタリカ III / 新地域 | AU 102 / CR 101 / 新 harvest | — | exhaustive_search、予備在庫、Lv 追加 |

- 需給の考え方 (2026-08-12 更新): seeds は事実上無限で安い (1 地域 300 種 ≒ 25 分。Tier 1 だけでも数千種キーが未採取)。**真のボトルネックは写真 (zukan-fetch) のスループット**で、小道の年間需要 2,000 から 2,600 種 + 本編拡張を同じパイプラインが処理する。計画すべきは harvest の時期ではなく「写真取得を常時回し続ける運用」。
- 確定在庫: 地域 1,070 使用可 (更新 9 まで成立。ボルネオ II は 88 種規模)。第 2 波 probe は 2026-08-12 完走: フィリピン 300 / ニューギニア 300 / 南部アフリカ 300 = +900 名目 (地域名目計 2,004)。第 2 波の後処理 (synonym backfill → 直接照合 dedup → enrichment) と看板再選定は未実施。

## 2.5 本編拡張トラック (2026-08-12 決定)

小道とは別に、本編へ学習コンテンツ追加なしの種拡充リリースを行う (飽き対策の大型リリース + 9 月 LOGOS 前の演習量押し上げ)。リリース順: **本編第 1 弾 (150 種) → 小道マダガスカル I → 以後交互**。

- 方式 A 採用: SVG fallback で先行リリースし、写真は後追い (毎週数十種ずつ着弾する持続的更新感として活用)。
- 選抜済み: 450 種 = 150 × 3 弾、各弾 教科 50/50/50。`zukan_foundry/reports/honpen_expansion_selection_v1.md` (レビュー用) + `zukan_foundry/data/species_reserve/honpen_selection_v1.json` (機械可読)。
- 選抜基準: GBIF 頻度順位 (2 ラン interleave 近似) + 科あたり 3 種上限 + 和名一意 + レアリティは既存プール比率 (N/R/SR/SSR、SS なし)。
- 残工程: 選抜レビュー → entry コンテンツ生成 (説明文・サイズ) → bugs.js 組み込み + テスト → リリース。
- 教訓 (2026-08-12): reserve エンジンの catalog dedup に取りこぼし 30 件 (アゲハ、キアゲハ、カイコ、チョウセンカマキリ等) があり、bugs.js 直接照合層 (学名 canonical + 和名 + synonym) で捕捉した。以後の全 dedup はこの直接照合を必須の最終層とする。エンジン索引の欠陥調査はフォローアップ。

## 3. volume 公開前パイプライン (地域 seeds → 配信)

1. 対カタログ重複判定 — 全 4 地域 2026-08-12 実施済み (使用可能 1,070/1,104。重複の内訳は各地域とも汎存種 + 本編収録済み有名種で妥当)。注意: reserve CLI は region seeds 未対応で、空の和名同士を same_japanese_name と誤判定する (今回は bank の手動解析で真の重複のみ抽出)。region モード (bugs.js 1,213 種 + synonym への学名照合のみ、和名要件免除) の軽量スクリプト化が実装フォローアップ。第 2 波 probe 地域 (フィリピン / ニューギニア / 南部アフリカ、harvest 実行中) の判定はそのスクリプトで行う
2. 名前 enrichment (標準和名 → 通用名 → 仮称 → 英語一般名。決定 1)
3. 種選抜: 80 から 100 種、N/R/SR 構成 + 看板 SR 指定
4. 標本写真 zukan-fetch (museum tier)。リードタイム最大の工程。参考実績: カタログ 893 種の充足に数週間 (tier 順 + GBIF rate limit 2 秒)。マダガスカル I は Phase 3 実装と並行して先行着手する
5. volume freeze (分母確定。決定 4)

## 4. 関連ツールの所在 (セッションまたぎ用)

- 地域 harvest: `tools/komorebi/harvest_region_seeds.py` (`--region <id> --target <n>`。regions.json に定義 + mustHave 層)
- synonym backfill: `tools/campaign3/t11_species_reserve/backfill_synonyms.py --seeds <jsonl>`
- 重複判定 (教科 seeds 実績): `python -m zukan_foundry.reserve --seeds <path> --skip-media` (zukan venv: `/home/shota/.cache/zukan_venv/bin/python3`)
- 写真取得: zukan-fetch skill (`~/.claude/skills/zukan-fetch/`)
- 地域 seeds 置き場: `zukan_foundry/data/species_reserve/regions/*.jsonl`
- 学習側との連携: 才澄の演習ログは fieldnote repo 経由で `bios/juken_saito/` 基盤へ (q4b_import.py)。komorebi カテゴリ追加時は skill_id 対応表の追記が必要
