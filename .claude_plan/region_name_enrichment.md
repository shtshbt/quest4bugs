# 地域 seeds の名称 enrichment 実装計画

## Goal

`tools/komorebi/enrich_region_names.py` を新規作成し、地域 seeds の空の名称欄を埋める。harvest 段階では和名を必須にしていないため (`docs/komorebi_design.md` 12.3)、`japaneseName` と `englishName` が空で `nameStatus` が `pending` のまま残っている。

## 名称の階層 (design 決定 1、6.4)

上から順に試し、最初に取れたところで止める。どの層で取れたかを `nameStatus` と `nameSource` に必ず記録する。

| 優先 | nameStatus | 内容 |
|---|---|---|
| 1 | `standard_ja` | GBIF vernacular の日本語名 (language が jpn) |
| 2 | `common_ja` | 通用名。GBIF に無い場合はこの版では取りに行かない (将来の手作業枠) |
| 3 | `english` | GBIF vernacular の英語名 (language が eng) |
| 4 | `provisional` | 仮称。属の日本語名が既知なら「(属名) の 1 種」、無ければ学名のカタカナ転写はせず英語名なしとして記録 |

学名のカタカナ転写は禁止 (design 決定 1)。仮称は「不明」であることを隠さない形にする。

## スコープ境界

やる: `tools/komorebi/enrich_region_names.py` と `zukan_foundry/tests/test_enrich_region_names.py` の 2 ファイル。
やらない: 既存モジュールの変更。**入力の jsonl を上書きしない。** 出力は別ファイルへ書く。

## 入出力

```bash
python3 tools/komorebi/enrich_region_names.py \
  --seeds zukan_foundry/data/species_reserve/regions/madagascar.jsonl \
  --out zukan_foundry/data/species_reserve/regions/madagascar.enriched.jsonl \
  --cache /tmp/q4b_vernacular_cache.json \
  --report zukan_foundry/reports/name_enrichment_madagascar.md
```

- 入力は読み取り専用。出力は `--out` の新しいファイル
- `--cache` で GBIF の応答を保存し、再実行で叩き直さない (resume 可能にする)
- `--limit N` で先頭 N 件だけ処理できること (試運転用)
- `--offline` でネットワークを一切使わず、cache にあるものだけで処理できること

## GBIF の叩き方

- endpoint: `https://api.gbif.org/v1/species/{usageKey}/vernacularNames`
- usageKey は seed の `taxonomyResponse` から取る。無ければ `seedId` の `gbif_` の後ろを使う
- **rate limit を守る。1 リクエストあたり最低 2 秒空ける** (`CLAUDE.md` の zukan-fetch 節と同じ制約。GBIF に対する上限は repo 全体で共有している)
- 429 と 5xx は指数バックオフで最大 3 回まで再試行し、それでも駄目なら `nameStatus` を `pending` のまま残して次へ進む。1 件の失敗で全体を止めない
- User-Agent に連絡先を入れない (個人情報を外部へ出さない)。`quest4bugs-nametool/0.1` とする

## 出力の書き方

seed の既存フィールドを消さない。次の 4 つだけを更新する。

- `japaneseName`
- `englishName`
- `nameStatus`
- `nameSource` (取得元の URL)

`nameStatus` が既に `pending` 以外のものは触らない (再実行で上書きしない)。

## 報告

`--report` に markdown で出す。

- 総数、層ごとの件数 (standard_ja / english / provisional / pending)
- standard_ja の一覧 (和名と学名)
- pending のまま残った件数と理由の内訳 (network 失敗 / vernacular 無し)

和名の取得率が地域の供給能力そのものなので、そこが読める報告にする。マダガスカルは標準和名 10% 程度という 2026-08-11 の観測がある (`docs/zukan_stock_ledger.md`)。

## テスト `zukan_foundry/tests/test_enrich_region_names.py`

ネットワークを使わない。`--offline` と cache を使って検証する。

1. 日本語の vernacular があるとき `standard_ja` になり `japaneseName` が入ること
2. 日本語が無く英語があるとき `english` になること
3. どちらも無いとき `provisional` になり、学名のカタカナ転写が入らないこと
4. 既に `nameStatus` が埋まっている seed を上書きしないこと
5. 入力 jsonl が実行前後で 1 バイトも変わらないこと
6. cache が再利用され、`--offline` でネットワーク関数が 1 度も呼ばれないこと
7. 出力の各行が入力の全フィールドを保持していること (欠落しない)

## 実行

実装後、まず `--limit 20` で試運転して報告を確認し、それからマダガスカル全 301 件を通す。301 件 x 2 秒で約 10 分かかる。

## 完了条件

- pytest が green
- `madagascar.enriched.jsonl` と報告が生成されている
- 入力の `madagascar.jsonl` が 1 バイトも変わっていない
