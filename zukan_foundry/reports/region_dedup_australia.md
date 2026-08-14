# 地域 seeds 重複判定報告

- bugs.js 抽出件数: **1,636**
- 判定基準: 学名 canonical と synonym（和名は不使用）
- 照合対象外: 2 件 （フキバッタ: 属名のみ、オカメコオロギ: 属名のみ）

## australia

- 入力: `zukan_foundry/data/species_reserve/regions/australia.jsonl`

| 総数 | 使用可能 | rejected | needs_review |
|---:|---:|---:|---:|
| 302 | 286 | 16 | 0 |

### rejected

| seed 学名 | bugs.js 学名 | 和名 | 根拠 |
|---|---|---|---|
| Apis mellifera Linnaeus, 1758 | Apis mellifera | セイヨウミツバチ | canonical |
| Vanessa kershawi (McCoy, 1868) | Vanessa cardui | ヒメアカタテハ | synonym |
| Pieris rapae (Linnaeus, 1758) | Pieris rapae | モンシロチョウ | canonical |
| Eristalis tenax (Linnaeus, 1758) | Eristalis tenax | ナミハナアブ | canonical |
| Eristalis tenax (Linnaeus, 1758) | Eristalis tenax | ハナアブ | canonical |
| Zizina otis (Fabricius, 1787) | Zizina otis | ヒメシルビアシジミ | canonical |
| Danaus plexippus (Linnaeus, 1758) | Danaus plexippus | オオカバマダラ | canonical |
| Hermetia illucens (Linnaeus, 1758) | Hermetia illucens | アメリカミズアブ | canonical |
| Locusta migratoria (Linnaeus, 1758) | Locusta migratoria | トノサマバッタ | canonical |
| Aiolopus thalassinus (Fabricius, 1781) | Aiolopus thalassinus tamulus | マダラバッタ | canonical |
| Aiolopus thalassinus (Fabricius, 1781) | Aiolopus thalassinus | ミドリバネホソバッタ | canonical |
| Diplacodes trivialis (Rambur, 1842) | Diplacodes trivialis | ヒメトンボ | canonical |
| Pheidole megacephala (Fabricius, 1793) | Pheidole megacephala | ツヤオオズアリ | canonical |
| Zizina labradus (Godart, 1824) | Zizina otis | ヒメシルビアシジミ | synonym |
| Hypolimnas bolina (Linnaeus, 1758) | Hypolimnas bolina | リュウキュウムラサキ | canonical |
| Nezara viridula (Linnaeus, 1758) | Nezara viridula | ミナミアオカメムシ | canonical |
| Henosepilachna vigintioctopunctata (Fabricius, 1775) | Henosepilachna vigintioctopunctata | ニジュウヤホシテントウ | canonical |
| Melanitis leda Linnaeus, 1758 | Melanitis leda | ウスイロコノマチョウ | canonical |

### needs_review

なし
