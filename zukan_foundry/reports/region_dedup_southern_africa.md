# 地域 seeds 重複判定報告

- bugs.js 抽出件数: **1,444**
- 判定基準: 学名 canonical と synonym（和名は不使用）
- 照合対象外: 2 件 （フキバッタ: 属名のみ、オカメコオロギ: 属名のみ）

## southern_africa

- 入力: `zukan_foundry/data/species_reserve/regions/southern_africa.jsonl`

| 総数 | 使用可能 | rejected | needs_review |
|---:|---:|---:|---:|
| 300 | 265 | 35 | 0 |

### rejected

| seed 学名 | bugs.js 学名 | 和名 | 根拠 |
|---|---|---|---|
| Harmonia axyridis (Pallas, 1773) | Harmonia axyridis | ナミテントウ | canonical |
| Harmonia axyridis (Pallas, 1773) | Harmonia axyridis | ナミテントウ黒型 | canonical |
| Apis mellifera Linnaeus, 1758 | Apis mellifera | セイヨウミツバチ | canonical |
| Vanessa cardui (Linnaeus, 1758) | Vanessa cardui | ヒメアカタテハ | canonical |
| Danaus chrysippus (Linnaeus, 1758) | Danaus chrysippus | カバマダラ | canonical |
| Popa spurca Stal, 1856 | Popa spurca | アフリカエダカマキリ | canonical |
| Zizeeria knysna (Trimen, 1862) | Zizeeria knysna | アフリカヤマトシジミ | canonical |
| Crocothemis erythraea (Brullé, 1832) | Crocothemis erythraea | ハラビロアカトンボ | canonical |
| Carausius morosus Brunner von Wattenwyl, 1907 | Carausius morosus | インドナナフシ | canonical |
| Papilio demodocus Esper, 1798 | Papilio demodocus | アフリカオナシアゲハ | canonical |
| Ischnura senegalensis (Rambur, 1842) | Ischnura senegalensis | アオモンイトトンボ | canonical |
| Eristalis tenax (Linnaeus, 1758) | Eristalis tenax | ナミハナアブ | canonical |
| Eristalis tenax (Linnaeus, 1758) | Eristalis tenax | ハナアブ | canonical |
| Polyspilota aeruginosa (Goeze, 1778) | Polyspilota aeruginosa | アフリカオオカマキリ | canonical |
| Sympetrum fonscolombii (Selys, 1840) | Sympetrum fonscolombii | スナアカネ | canonical |
| Nezara viridula (Linnaeus, 1758) | Nezara viridula | ミナミアオカメムシ | canonical |
| Ceriagrion glabrum (Burmeister, 1839) | Ceriagrion glabrum | ダイダイイトトンボ | canonical |
| Trithemis kirbyi Selys, 1891 | Trithemis kirbyi | キンバネベニトンボ | canonical |
| Gryllus bimaculatus De Geer, 1773 | Gryllus bimaculatus | フタホシコオロギ | canonical |
| Junonia oenone (Linnaeus, 1764) | Junonia oenone | ルリモンクロタテハモドキ | canonical |
| Brachythemis leucosticta (Burmeister, 1839) | Brachythemis leucosticta | オビバネトンボ | canonical |
| Eurema brigitta (Stoll, 1780) | Eurema brigitta | ホシボシキチョウ | canonical |
| Catopsilia florella (Fabricius, 1775) | Catopsilia florella | アフリカウスキシロチョウ | canonical |
| Mantis religiosa (Linne, 1758) | Mantis religiosa | ウスバカマキリ | canonical |
| Lampides boeticus (Linnaeus, 1767) | Lampides boeticus | ウラナミシジミ | canonical |
| Stomorhina lunata (Fabricius, 1805) | Stomorhina lunata | バッタキンバエ | canonical |
| Eupeodes corollae (Fabricius, 1794) | Eupeodes corollae | フタホシヒラタアブ | canonical |
| Trithemis annulata (Palisot de Beauvois, 1807) | Trithemis annulata | ムラサキベニトンボ | canonical |
| Cyrtacanthacris tatarica (Linnaeus, 1758) | Cyrtacanthacris tatarica | チャマダラトビバッタ | canonical |
| Hypolimnas misippus Linnaeus, 1764 | Hypolimnas misippus | メスアカムラサキ | canonical |
| Paracinema tricolor (Thunberg, 1815) | Paracinema tricolor | ミイロバッタ | canonical |
| Hermetia illucens (Linnaeus, 1758) | Hermetia illucens | アメリカミズアブ | canonical |
| Tenodera superstitiosa (Fabricius, 1781) | Tenodera superstitiosa | ホソナガカマキリ | canonical |
| Diplacodes lefebvrii (Rambur, 1842) | Diplacodes lefebvrii | クロヒメトンボ | canonical |
| Pantala flavescens (Fabricius, 1798) | Pantala flavescens | ウスバキトンボ | canonical |
| Pheidole megacephala (Fabricius, 1793) | Pheidole megacephala | ツヤオオズアリ | canonical |
| Hysteroneura setariae (Thomas, 1878) | Hysteroneura setariae | オヒシバクロアブラムシ | canonical |

### needs_review

なし
