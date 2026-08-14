# 地域 seeds 重複判定報告

- bugs.js 抽出件数: **1,444**
- 判定基準: 学名 canonical と synonym（和名は不使用）
- 照合対象外: 2 件 （フキバッタ: 属名のみ、オカメコオロギ: 属名のみ）

## new_guinea

- 入力: `zukan_foundry/data/species_reserve/regions/new_guinea.jsonl`

| 総数 | 使用可能 | rejected | needs_review |
|---:|---:|---:|---:|
| 300 | 292 | 8 | 0 |

### rejected

| seed 学名 | bugs.js 学名 | 和名 | 根拠 |
|---|---|---|---|
| Aedes albopictus (Skuse, 1894) | Aedes albopictus | ヒトスジシマカ | canonical |
| Lamprima adolphinae (Gestro, 1875) | Lamprima adolphinae | パプアキンイロクワガタ | canonical |
| Pantala flavescens (Fabricius, 1798) | Pantala flavescens | ウスバキトンボ | canonical |
| Oxya japonica (Thunberg, 1824) | Oxya japonica | ハネナガイナゴ | canonical |
| Hysteroneura setariae (Thomas, 1878) | Hysteroneura setariae | オヒシバクロアブラムシ | canonical |
| Diplacodes trivialis (Rambur, 1842) | Diplacodes trivialis | ヒメトンボ | canonical |
| Locusta migratoria (Linnaeus, 1758) | Locusta migratoria | トノサマバッタ | canonical |
| Aulacophora indica (Gmelin, 1790) | Aulacophora indica | ウリハムシ | canonical |

### needs_review

なし
