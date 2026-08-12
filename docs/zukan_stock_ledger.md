# 図鑑在庫台帳とリリース引当

- 版: v0.1 (2026-08-12)
- 親文書: `docs/komorebi_release_linkage.md` (更新カレンダー)、`docs/komorebi_regions.md` (地域定義)
- 役割: 図鑑ストックの全プール・状態・引当先をセッションをまたいで参照できる台帳。数値を更新したら日付を添えて本書を書き換える。

---

## 1. 在庫プールの全体像 (2026-08-12 実測)

| プール | 件数 | 状態 | 用途 |
|---|---|---|---|
| 現行カタログ (配信中) | 1,213 種 | 標本カード 892 / SVG フォールバック 321 | 本編の分母。凍結済み |
| 地域 seeds (小道用) | 1,104 = マダガスカル 301 / オーストラリア 302 / ボルネオ 200 / コスタリカ 301 | synonym backfill 済み (failed 0)。対カタログ重複判定・名前 enrichment 未実施 | 小道 volume (更新 1 から 9+) |
| 教科 seeds (本編拡張用) | 2,300。うち resolved 1,432 / needs_review 219 / rejected 649 | 教科割当 (resolved のみ): eitango 586 / kanji 498 / keisan 348 | 2000 種 milestone の 810 種活性化 (270×3)。全教科 270 を確保済み (バッファ eitango +316 / kanji +228 / keisan +78) |
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

- 需給収支: 更新 9 まで需要 約 900 種 vs 在庫 1,104。対カタログ重複の目減りを 1 割 (約 110 種) と仮定しても成立。遠征 III は 80 種規模に縮めてよい (決定 11 の下限)。
- 新地域 harvest (Tier 2: フィリピン / ニューギニア / 中央アフリカ等) は更新 6 ごろまでに開始する。1 地域 300 種で約 25 分 + must-have 数分の実績 (2026-08-12 のコスタリカ)。

## 3. volume 公開前パイプライン (地域 seeds → 配信)

1. 対カタログ重複判定 (reserve CLI の offline 判定。regionId 付き seeds の受入は要確認) — **次の background 実行候補**
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
