# 地域 seeds 重複判定報告

- bugs.js 抽出件数: **1,444**
- 判定基準: 学名 canonical と synonym（和名は不使用）
- 照合対象外: 2 件 （フキバッタ: 属名のみ、オカメコオロギ: 属名のみ）

## philippines

- 入力: `zukan_foundry/data/species_reserve/regions/philippines.jsonl`

| 総数 | 使用可能 | rejected | needs_review |
|---:|---:|---:|---:|
| 300 | 271 | 29 | 0 |

### rejected

| seed 学名 | bugs.js 学名 | 和名 | 根拠 |
|---|---|---|---|
| Cybister tripunctatus (Olivier, 1795) | Cybister tripunctatus lateralis | コガタノゲンゴロウ | canonical |
| Hypolimnas bolina (Linnaeus, 1758) | Hypolimnas bolina | リュウキュウムラサキ | canonical |
| Hierodula patellifera Serville, 1839 | Hierodula patellifera | ハラビロカマキリ | canonical |
| Diplacodes trivialis (Rambur, 1842) | Diplacodes trivialis | ヒメトンボ | canonical |
| Oryctes rhinoceros (Linnaeus, 1758) | Oryctes rhinoceros | サイカブト | canonical |
| Anoplolepis gracilipes (Smith, 1857) | Anoplolepis gracilipes | アシナガキアリ | canonical |
| Aiolopus thalassinus (Fabricius, 1781) | Aiolopus thalassinus tamulus | マダラバッタ | canonical |
| Aiolopus thalassinus (Fabricius, 1781) | Aiolopus thalassinus | ミドリバネホソバッタ | canonical |
| Hermetia illucens (Linnaeus, 1758) | Hermetia illucens | アメリカミズアブ | canonical |
| Apis cerana Fabricius, 1793 | Apis cerana japonica | ニホンミツバチ | canonical |
| Cheilomenes sexmaculata (Fabricius, 1781) | Cheilomenes sexmaculata | ダンダラテントウ | canonical |
| Statilia maculata Thunberg, 1784 | Statilia maculata | コカマキリ | canonical |
| Euploea mulciber (Cramer, 1777) | Euploea mulciber | ツマムラサキマダラ | canonical |
| Pantala flavescens (Fabricius, 1798) | Pantala flavescens | ウスバキトンボ | canonical |
| Leptosia nina (Fabricius, 1793) | Leptosia nina | クロテンシロチョウ | canonical |
| Calliphara excellens | Calliphara excellens | ナナホシキンカメムシ | canonical |
| Zizina otis (Fabricius, 1787) | Zizina otis | ヒメシルビアシジミ | canonical |
| Statilia nemoralis Saussure, 1870 | Statilia nemoralis | スジイリコカマキリ | canonical |
| Chalcosoma atlas (Linnaeus, 1758) | Chalcosoma atlas | アトラスオオカブト | canonical |
| Tenodera aridifolia Stoll, 1813 | Tenodera aridifolia | オオカマキリ | canonical |
| Eurema hecabe (Linnaeus, 1758) | Eurema hecabe | ミナミキチョウ | canonical |
| Trithemis aurora (Burmeister, 1839) | Trithemis aurora | ベニトンボ | canonical |
| Hysteroneura setariae (Thomas, 1878) | Hysteroneura setariae | オヒシバクロアブラムシ | canonical |
| Ischnura senegalensis (Rambur, 1842) | Ischnura senegalensis | アオモンイトトンボ | canonical |
| Idea leuconoe Erichson, 1834 | Idea leuconoe | オオゴマダラ | canonical |
| Hebomoia glaucippe (Linnaeus, 1758) | Hebomoia glaucippe | ツマベニチョウ | canonical |
| Aedes albopictus (Skuse, 1894) | Aedes albopictus | ヒトスジシマカ | canonical |
| Tholymis tillarga (Fabricius, 1798) | Tholymis tillarga | アメイロトンボ | canonical |
| Locusta migratoria (Linnaeus, 1758) | Locusta migratoria | トノサマバッタ | canonical |
| Cylas formicarius (Fabricius, 1798) | Cylas formicarius | ホソクビゾウムシ | canonical |

### needs_review

なし
