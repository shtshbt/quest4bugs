# 地域 seeds の重複判定ツール 実装計画

## Goal

`tools/komorebi/dedup_region_seeds.py` を新規作成し、地域 seeds を本編カタログ (`shared/bugs.js` の 1,446 種) と突き合わせて使用可能種を判定する。

## なぜ既存の reserve CLI ではいけないか

`python -m zukan_foundry.reserve` は教科 seeds 用で、和名が必須である。地域 seeds は `japaneseName` が空のまま harvest されるため、空の和名どうしが `same_japanese_name` として一致してしまい、1 地域あたり数百件の偽 reject が出る。実際に 2026-08-12 の判定はこの欠陥のため bank の手動解析で代替した (`docs/zukan_stock_ledger.md` 3 章)。

地域モードに必要なのは学名と異名だけの照合で、和名の要件は無い。それを独立したスクリプトとして書く。

## スコープ境界

やる: `tools/komorebi/dedup_region_seeds.py` と `zukan_foundry/tests/test_dedup_region_seeds.py` の 2 ファイルのみ。
やらない: `zukan_foundry/` 配下の既存モジュール、`shared/bugs.js`、seeds の jsonl、他のいかなるファイルの変更も。**データを書き換えない。判定結果の報告だけを出す。**

## 入出力

```bash
python3 tools/komorebi/dedup_region_seeds.py \
  --seeds zukan_foundry/data/species_reserve/regions/philippines.jsonl \
  --bugs shared/bugs.js \
  --out zukan_foundry/reports/region_dedup_philippines.md
```

`--seeds` は複数指定できること。`--json <path>` で機械可読版も出せること。

## 判定の規則

各 seed について、次のいずれかに当てはまれば `rejected` とする。

1. 学名の canonical (属 + 種小名の 2 語。著者名と亜属を除く) が bugs.js の学名 canonical と一致する
2. seed の `synonyms` のいずれかの canonical が bugs.js の学名 canonical と一致する
3. bugs.js 側の学名 canonical が seed の canonical と一致する (1 の逆方向。同じ処理で足りるなら 1 つにまとめてよい)

和名は判定に使わない。地域 seeds は和名を持たないためである。

canonical 化の規則:

- 著者名と年を落とす (`Nanos viettei (Paulian, 1976)` から `Nanos viettei`)
- 亜属の括弧を落とす (`Papilio (Achillides) maackii` から `Papilio maackii`)
- 亜種の第 3 語は残す (`Papilio machaon hippocrates` は 3 語のまま扱い、2 語版とも照合する)
- 大文字小文字を無視する
- 連続する空白を 1 つにまとめる

性語尾の揺れ (`signata` と `signatus`) は、末尾 1 文字の差で語幹が一致する場合に `needs_review` とする。2026-08-12 の第 1 弾でウラミスシジミがこの形で重複していた実績がある (`docs/zukan_stock_ledger.md`)。自動で reject にはしない。

## 出力

markdown の報告に次を含める。

- 地域ごとの総数、使用可能、rejected、needs_review
- rejected の一覧 (seed の学名、一致した bugs.js の学名と和名、一致の根拠が canonical か synonym か)
- needs_review の一覧 (語尾違いの候補)

## bugs.js の読み方

`shared/bugs.js` は JavaScript なので、正規表現で `sciName` と `jaName` と `id` を抜く。JSON として読もうとしない。抜き出せた件数を報告に書き、想定 (1,400 件以上) を下回ったら異常として終了コード 1 で止める。パーサが静かに 0 件を返して「重複なし」と報告するのが最悪の失敗である。

## テスト `zukan_foundry/tests/test_dedup_region_seeds.py`

`zukan_foundry/tests/` の既存 pytest の流儀に合わせる。fixture は小さな jsonl と小さな bugs.js の断片を `zukan_foundry/tests/fixtures/` に置く。

1. canonical 化が著者名、年、亜属括弧を落とすこと
2. 亜種 3 語が 2 語版とも照合されること
3. synonym 経由の一致が検出されること
4. 和名が空でも偽の一致が出ないこと (これが本ツールの存在理由)
5. 性語尾の揺れが needs_review になり、reject にならないこと
6. bugs.js から 1 件も抜けなかったとき終了コード 1 で止まること
7. データを書き換えないこと (入力 jsonl の内容が実行前後で同一)

## 実行と報告

実装後、次の 3 地域に対して実行し報告を生成すること。

- `philippines.jsonl`
- `new_guinea.jsonl`
- `southern_africa.jsonl`

## 完了条件

- pytest が green
- 3 地域の報告が `zukan_foundry/reports/` に生成されている
- 入力の jsonl が 1 バイトも変わっていない
