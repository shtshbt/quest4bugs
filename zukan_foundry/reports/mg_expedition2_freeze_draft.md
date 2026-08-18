# マダガスカル遠征 II volume 凍結設計ドラフト

status: draft、user 承認待ち。コード・カタログ・bugs.js への反映は freeze 承認後。承認後の反映は オーストラリア遠征 I と同一の機械フロー (bugs.js 追記 + zukan_catalog append + volume manifest + trophies 割当 + テスト) で行う。本書の作成時点でリポジトリへの変更は本ファイルの新規作成のみ。

作成日: 2026-08-18。対象更新: 更新 6 (`zukan_foundry/reports/volume2_rarity_frames.md` の決定記録により、更新 5 と 6 を入れ替えて MG II を後ろへ回した)。最終決定は発案者が行う。

## 0. 結論

**写真既存分だけで 84 種は成立しない。** 数の面でも品質の面でも届かない。

- 残プール 209 種のうち標本写真ありは 107 種。うち採用可 (A 等級) は 68 種で、84 に 16 種足りない。
- 画質に欠陥がある B 等級 11 種と、画像の出典が種を特定できない A- 等級 5 種を全て入れても 84 ちょうどで、余裕が無い。その構成では 84 種のうち 16 種 (19%) が欠陥または要検証を抱える。
- 分類群の偏りが決定的である。A 等級 68 種のうち 20 種 (29%) が AntWeb 由来のアリの側面標本で、見た目がほぼ同じ茶色い側面像になる。一方トンボは 1 種しかない (マダガスカル遠征 I が 25 種前後を消費したため)。
- したがって本書は 2 案を併記する。1 章から 4 章が写真既存のみの案 (80 種)、5 章が追加 fetch を伴う案 (84 種) である。

看板 Phyllocrania paradoxa (ネジレカンムリカマキリ) は `volume2_rarity_frames.md` の決定記録で確定済み。写真も保有しており、どちらの案でも変わらない。

## 1. 写真 107 種の等級づけ

107 種全件を contact sheet で実見し、4 等級に分けた。

| 等級 | 種数 | 定義 |
|---|---:|---|
| A | 68 | 単体の全身像で、ラベルや台紙が画面を支配せず、画像の出典から種が特定できる |
| A- | 5 | 画質は A と同等だが、画像が属や科や一覧記事に由来し、その種の個体である根拠が弱い |
| B | 11 | 種は特定できるが画質に欠陥がある。収録可能だが帯を上げられない |
| C | 23 | 使用不可 |
| 計 | 107 | |

### 1.1 A- 等級 5 種 (画像の出典が種を特定できない)

| 学名 | 写真 id | 問題 |
|---|---|---|
| Chopardempusa neglecta | WIKIPEDIAWPListofmantisgeneraandspecies | カマキリの属種一覧記事の図。どの種の図か特定できない |
| Majanga basilaris | WIKIPEDIAWPMajangidae | 科の記事の図 |
| Rhadinacris schistocercoides | WIKIPEDIAWPCyrtacanthacridinae | 亜科の記事の図 |
| Paramantis prasina | WMCFileChipequejpg | ファイル名に分類名が無く、由来を追えない |
| Hyalomantis madagascariensis | WMCFileMantisHyalomantispunctata7621511836jpg | ファイル名の種小名が punctata で対象種と異なる |

metadata の scientific_name は 5 件とも対象種と一致しているため、取得工程は「この種」として登録している。ずれているのは画像側の出所である。凍結前に原画像を辿って同定を確認するか、再取得する。

### 1.2 B 等級 11 種 (画質に欠陥)

| 学名 | 写真 id | 欠陥 |
|---|---|---|
| Aphaenogaster swammerdami | USNMENT00532097 | 複数個体が絡み合い単体像がない |
| Technomyrmex madecassus | WMCFileTechnomyrmexmadecassuscasent0101705profile1jpg | 腹部に白い矩形のマウント痕が乗る |
| Phymateus saxosus | WMCFileFace2FacePhymateussaxosus5047291052jpg | 顔の接写のみ。全身像がない |
| Heteracris nigricornis | WIKIPEDIAWPHeteracris | 属記事の図。ただし赤い後翅を広げた図で見栄えは高い |
| Sigara alluaudi | WIKIPEDIAWPSigara | 属記事の図。斜位で背面が読めない |
| Anopheles coustani | NHMUK013655656 | 2 個体が小さく並ぶ |
| Amphipsyche senegalensis | NHMUK014413814 | ラベル 2 枚が画面の下半分を占める |
| Bactrocera musae | NHMUKBMNHE1438290 | 台紙の破片が同居し虫が画面上部に小さい |
| Ceratitis malgassa | NHMUKBMNHE1442182 | 黄色い台紙が画面の大半を占める |
| Liturgusella malagassa | WMCFileLiturgusellamalagassajpg | 白飛びに近く体色が出ない |
| Leiophasma flaviceps | WMCFileLeiophasmaflavicepsjpg | 極細の個体が薄く写り thumb では線にしか見えない |

### 1.3 C 等級 23 種 (使用不可)

| 分類 | 件数 | 代表 | 内容 |
|---|---:|---|---|
| スライド標本・ラベルのみ | 9 | Culicoides 4 種 / Bemisia tabaci / Trialeurodes vaporariorum / Coelopa alluaudi / Phaonia pallida / Crematogaster kelleri | 虫が写っていないか微小 |
| 全身像がない | 3 | Monomorium termitobium / Pheidole spinosa / Bothroponera cambouei | 頭部や毛の超接写のみ |
| 複数個体の図版 | 1 | Helina impuncta | 多数個体を並べた古図版 |
| 線画・模式図 | 2 | Locris vicina / Aphis craccivora | 交尾器の線画と分布図、顕微鏡モノクロ像 |
| 被写体が種でない | 6 | Musca confiscata (カの線画) / Phaonia errans (クモとハエの合成) / Orius laevigatus (画像は Orius insidiosus) / Acraea ranavalona と Acraea zitja (収蔵ラベルのみで蝶が写っていない) | 対象種が写っていない |
| 画像が壊れている | 2 | Pycnocrania grandidieri (岩の写真) / Dipseudopsis pauliani (ほぼ白紙) | 被写体が無い |

Pycnocrania grandidieri の card が岩の写真である件と、Achrioptera impennis の card が枝だけの写真である件 (後者は `zukan_foundry/data/species_reserve/naming/refetch_queue.json` に既載) は、写真取得工程の検査漏れである。オーストラリア側でも同種の混入 (Aedes vigilax の card がフィラリア生活環の模式図) を確認しているため、`zukan_cards/metadata` 全件に対する「画像が単一個体の標本または生態写真であること」の再検査を別途提案する。

## 2. 案 A: 写真既存のみで組む (80 種)

A 68 + A- 5 + B の欠陥が軽い 7 種 = 80 種。決定 11 の下限 80 にちょうど届く。B の残り 4 種 (Bactrocera musae / Ceratitis malgassa / Liturgusella malagassa / Leiophasma flaviceps) は台紙支配と白飛びが強いため入れない。

レアリティは `docs/komorebi_rarity_standard.md` 2 章のスケール規則で 80 種の行を使う。N 55 / R 16 / SR 6 / SSR 3。

### 2.1 SSR 3 種

| # | id | 和名 | 学名 | 目 | 写真 id | flagship |
|---|---|---|---|---|---|---|
| 1 | phyllocrania_paradoxa | ネジレカンムリカマキリ | Phyllocrania paradoxa | Mantodea | WMCFilePhyllocraniaparadoxa337356299croppedjpg | true |
| 2 | epilissus_splendidus | ルリミドリマルコガネ | Epilissus splendidus | Coleoptera | WMCFileEpilissussplendidusFairmaire1889CanthonidaedeMadagascarMasoalaOMontreuildetjpg | false |
| 3 | madranga_segnita | ベニルリヨコバイ | Madranga segnita | Hemiptera | WMCFileLeafhopperMadrangasegnita7621117860jpg | false |

看板 Phyllocrania paradoxa は枯葉に擬態する有名種で、頭部のねじれた突起と体の輪郭が独特である。原寸で実見したところ、オリーブ色の枯葉状の突起が全身に付いた側面像で、種の特徴は読める。ただし縦位置で背景と体色が近く、thumb サイズでの視認は マダガスカル遠征 I の看板コメットガ (黄色い大型のガ) に一段劣る。背面展開の写真が取れれば差し替えたい。

非看板 2 種は `docs/komorebi_rarity_standard.md` 5 章の 3 点のうち見た目のインパクトで選んだ。Epilissus splendidus は上翅全面が深いエメラルド、前胸が明緑の金属光沢で、宝石のように見える。Madranga segnita は赤地に青い縦条が 3 本入るヨコバイで、体長は小さいが thumb でも赤と青が判別できる。SSR 3 種の目は Mantodea / Coleoptera / Hemiptera の 3 つに散っており、11 章の検査 5 を満たす。

生態的スペクタクルの枠は Appasus quadrivittatus (スジコオイムシ、雄が背中に卵塊を背負う) が担うが、写真が属記事由来のため SR に置いた。マダガスカル遠征 I の SSR に既に Belostomatidae (マダガスカルオオタガメ) を置いていることもあり、同科を 2 巻連続で最上位に置く形は避けた。

### 2.2 SR 6 種

| # | id | 和名 | 学名 | 目 | 根拠 |
|---|---|---|---|---|---|
| 1 | papilio_epiphorbas | アサギボシアゲハ | Papilio epiphorbas | Lepidoptera | 黒地に浅葱色の帯。雌雄 2 個体の完全な展翅で解像も高い |
| 2 | acraea_strattipocles | ベニゾメホソチョウ | Acraea strattipocles | Lepidoptera | 赤地に黒点を散らしたホソチョウ。雌雄 2 個体の展翅 |
| 3 | appasus_quadrivittatus | スジコオイムシ | Appasus quadrivittatus | Hemiptera | 背中一面に卵塊を背負った個体。生き方がそのまま図になる |
| 4 | parectatosoma_mocquerysi | ベニトゲアシナナフシ | Parectatosoma mocquerysi | Phasmida | 赤い棘を全身にもつナナフシ。形のインパクト |
| 5 | helictopleurus_quadripunctatus | ヨツボシコガネ | Helictopleurus quadripunctatus | Coleoptera | 橙地に黒点、前胸に白い輪。マダガスカル固有の糞虫の中で最も配色が強い |
| 6 | brancsikia_aeroplana | ハイイロカレハカマキリ | Brancsikia aeroplana | Mantodea | 翅が枯葉状に張り出した異形。看板と同じ目だが形が全く違う |

SR 6 種は 5 目にまたがる。更新 6 は学習カテゴリを伴わない図鑑ドロップなので、トロフィー代表虫の予備枠としての要件 (`docs/komorebi_rarity_standard.md` 11 章の検査 4) は 6 章のカテゴリ本数で満たす。

### 2.3 全 80 種 (目ごと。等級列つき)

コウチュウ目 (Coleoptera) 7 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| epilissus_splendidus | ルリミドリマルコガネ | Epilissus splendidus | SSR | A | WMCFileEpilissussplendidusFairmaire1889CanthonidaedeMadagascarMasoalaOMontreuildetjpg |
| helictopleurus_quadripunctatus | ヨツボシコガネ | Helictopleurus quadripunctatus | SR | A | WMCFileHelictopleurusquadripunctata2871827701jpg |
| graciella_compacta | キマダラカミキリ | Graciella compacta | R | A | WIKIPEDIAWPGraciellacompacta |
| helictopleurus_rudicollis | アカオビミドリコガネ | Helictopleurus rudicollis | R | A | WMCFileHelictopleurusrudicollis103897BDJ12e120304Figure3ajpg |
| helictopleurus_vadoni | アカボシコガネ | Helictopleurus vadoni | R | A | WMCFileHelictopleurusvadoni103897BDJ12e120304Figure3cjpg |
| canthydrus_guttula | アカアシコツブゲンゴロウ | Canthydrus guttula | N | A | WIKIPEDIAWPCanthydrus |
| rhantus_latus | マダラゲンゴロウ | Rhantus latus | N | A | WIKIPEDIAWPRhantus |

チョウ目 (Lepidoptera) 6 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| acraea_strattipocles | ベニゾメホソチョウ | Acraea strattipocles | SR | A | YPMENT708821 |
| papilio_epiphorbas | アサギボシアゲハ | Papilio epiphorbas | SR | A | YPMENT727251 |
| acraea_encedon | シロオビホソチョウ | Acraea encedon | R | A | NHMUKBMNHE668100 |
| colotis_mananhari | レモンイロシロチョウ | Colotis mananhari | R | A | USNMENT00781637 |
| heteropsis_pauper | ヒトツメジャノメ | Heteropsis pauper | R | A | ETHZAZ130391 |
| papilio_oribazus | アサギオビアゲハ | Papilio oribazus | R | A | YPMENT727974 |

カマキリ目 (Mantodea) 9 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| phyllocrania_paradoxa | ネジレカンムリカマキリ | Phyllocrania paradoxa | SSR | A | WMCFilePhyllocraniaparadoxa337356299croppedjpg |
| brancsikia_aeroplana | ハイイロカレハカマキリ | Brancsikia aeroplana | SR | A | WMCFileBrancsikiaaeroplanajpg |
| brancsikia_freyi | ヒシムネカマキリ | Brancsikia freyi | R | A | WMCFileBrancsikiafreyijpg |
| chopardempusa_neglecta | マダラチャバネカマキリ | Chopardempusa neglecta | N | A- | WIKIPEDIAWPListofmantisgeneraandspecies |
| hyalomantis_madagascariensis | アカメミドリカマキリ | Hyalomantis madagascariensis | N | A- | WMCFileMantisHyalomantispunctata7621511836jpg |
| majanga_basilaris | ヒロバネカレハカマキリ | Majanga basilaris | N | A- | WIKIPEDIAWPMajangidae |
| paramantis_prasina | ミドリフチカマキリ | Paramantis prasina | N | A- | WMCFileChipequejpg |
| paramantis_viridis | ウスチャホソカマキリ | Paramantis viridis | N | A | WIKIPEDIAWPParamantis |
| tisma_freyi | シラホシホソカマキリ | Tisma freyi | N | A | iNatobs1956155 |

カメムシ目 (Hemiptera) 8 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| madranga_segnita | ベニルリヨコバイ | Madranga segnita | SSR | A | WMCFileLeafhopperMadrangasegnita7621117860jpg |
| appasus_quadrivittatus | スジコオイムシ | Appasus quadrivittatus | SR | A | WIKIPEDIAWPAppasus |
| spilostethus_pandurus | クロタスキナガカメムシ | Spilostethus pandurus | R | A | WMCFile247Spilostethuspandurusjpg |
| yanga_guttulata | コケゴロモゼミ | Yanga guttulata | R | A | WMCFileCicadayangaguttulatajpg |
| zanna_madagascariensis | マダガスカルビワハゴロモ | Zanna madagascariensis | R | A | WMCFileZannatenebrosamadagascariensis108484374jpg |
| amberana_marginata | ベニツヤアワフキ | Amberana marginata | N | A | iNatobs218654495 |
| paracopium_dauphinicum | シリアカクログンバイ | Paracopium dauphinicum | N | A | USNMENT00866528 |
| sigara_alluaudi | マダラミズムシ | Sigara alluaudi | N | B | WIKIPEDIAWPSigara |

ナナフシ目 (Phasmida) 4 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| parectatosoma_mocquerysi | ベニトゲアシナナフシ | Parectatosoma mocquerysi | SR | A | WMCFileParectatosomamocquerysijpg |
| achrioptera_magnifica | ダイダイオオナナフシ | Achrioptera magnifica | R | A | WIKIPEDIAWPAchrioptera |
| parectatosoma_echinus | シロトゲクロナナフシ | Parectatosoma echinus | R | A | iNatobs336222845 |
| parectatosoma_hystrix | アカアシトゲナナフシ | Parectatosoma hystrix | R | A | NHMUK013805850 |

バッタ目 (Orthoptera) 10 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| atractomorpha_acutipennis | トガリバネバッタ | Atractomorpha acutipennis | R | A | WMCFileAtractomorphaacutipennisfemalejpg |
| heteracris_zolotarevskyi | キスジミドリバッタ | Heteracris zolotarevskyi | R | A | iNatobs137602628 |
| acorypha_decisa | チャスジバッタ | Acorypha decisa | N | A | WIKIPEDIAWPAcorypha |
| catantopsis_sacalava | スナイロクロモンバッタ | Catantopsis sacalava | N | A | iNatobs217943977 |
| eyprepocnemis_smaragdipes | サクライロバッタ | Eyprepocnemis smaragdipes | N | A | WIKIPEDIAWPEyprepocnemis |
| gastrimargus_africanus | マダラミドリバッタ | Gastrimargus africanus | N | A | WMCFileGastrimargusafricanusafricanusmalejpg |
| heteracris_nigricornis | アカバネオオバッタ | Heteracris nigricornis | N | B | WIKIPEDIAWPHeteracris |
| phymateus_saxosus | アオアシキボシバッタ | Phymateus saxosus | N | B | WMCFileFace2FacePhymateussaxosus5047291052jpg |
| rhadinacris_schistocercoides | ゴマフオオバッタ | Rhadinacris schistocercoides | N | A- | WIKIPEDIAWPCyrtacanthacridinae |
| trilophidia_cinnabarina | イワハダバッタ | Trilophidia cinnabarina | N | A | iNatobs223063901 |

トンボ目 (Odonata) 1 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| hemistigma_affine | スジムネトンボ | Hemistigma affine | N | A | USNMENT00277541 |

ハエ目 (Diptera) 7 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| anopheles_arabiensis | ブチバネカ | Anopheles arabiensis | N | A | NHMUK013655658 |
| anopheles_coustani | アシナガハマダラカ | Anopheles coustani | N | B | NHMUK013655656 |
| anopheles_gambiae | ガンビアハマダラカ | Anopheles gambiae | N | A | NHMUK010976523 |
| dacus_demmerezi | チャイロミバエ | Dacus demmerezi | N | A | NHMUKBMNHE700275 |
| melanostoma_sylvarum | コハクヒラタアブ | Melanostoma sylvarum | N | A | WIKIPEDIAWPMelanostoma |
| orgizomyia_zigzag | ヤマガタモンアブ | Orgizomyia zigzag | N | A | WIKIPEDIAWPOrgizomyia |
| tabanocella_longirostris | シロボシナガクチアブ | Tabanocella longirostris | N | A | WIKIPEDIAWPTabanocella |

トビケラ目 (Trichoptera) 6 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| amphipsyche_senegalensis | ウスキシマトビケラ | Amphipsyche senegalensis | N | B | NHMUK014413814 |
| dipseudopsis_longispina | シロボシトビケラ | Dipseudopsis longispina | N | A | NHMUK011246787 |
| leptonema_affine | ハネビロシマトビケラ | Leptonema affine | N | A | NHMUK012502492 |
| leptonema_ranomafana | ムジバネシマトビケラ | Leptonema ranomafana | N | A | NHMUK012502494 |
| macrostemum_placidum | キンオビシマトビケラ | Macrostemum placidum | N | A | WIKIPEDIAWPMacrostemum |
| macrostemum_scriptum | チャスジシマトビケラ | Macrostemum scriptum | N | A | NHMUK012502498 |

ハチ目 (Hymenoptera) 22 種

| id | 和名 | 学名 | レア度 | 等級 | 写真 id |
|---|---|---|---|---|---|
| anochetus_grandidieri | アメイロナガアゴアリ | Anochetus grandidieri | N | A | WMCFileAnochetusgrandidiericasent0041177dorsal1jpg |
| anochetus_madagascarensis | キイロナガアゴアリ | Anochetus madagascarensis | N | A | USNMENT00529624 |
| aphaenogaster_swammerdami | アカアシナガアリ | Aphaenogaster swammerdami | N | B | USNMENT00532097 |
| bothroponera_wasmannii | ブドウイロクロアリ | Bothroponera wasmannii | N | A | WMCFilePachycondylawasmanniicasent0101038profile1jpg |
| camponotus_quadrimaculatus | シロボシオオアリ | Camponotus quadrimaculatus | N | A | WMCFileCamponotusquadrimaculatuscasent0146549profile1jpg |
| camponotus_repens | シロオビオオアリ | Camponotus repens | N | A | WMCFileCamponotusrepenscasent0104623profile1jpg |
| camponotus_roeseli | アズキイロオオアリ | Camponotus roeseli | N | A | WMCFileCamponotusroeselicasent0101602profile1jpg |
| cataulacus_ebrardi | ヒラタヨロイアリ | Cataulacus ebrardi | N | A | WMCFileCataulacusebrardicasent0101244profile1jpg |
| cataulacus_porcatus | タテスジヨロイアリ | Cataulacus porcatus | N | A | WMCFileCataulacusporcatuscasent0101772profile1jpg |
| crematogaster_hova | クリイロシリアゲアリ | Crematogaster hova | N | A | WMCFileCrematogasterhovalatinodacasent0101761profile1jpg |
| crematogaster_ranavalonae | ウスチャシリアゲアリ | Crematogaster ranavalonae | N | A | WMCFileCrematogasterranavalonaecasent0101762profile1jpg |
| melissotarsus_insularis | チャイロタルアリ | Melissotarsus insularis | N | A | WMCFileMelissotarsusinsulariscasent0101466dorsal1jpg |
| mystrium_mysticum | クロヒゲナガアリ | Mystrium mysticum | N | A | WMCFileMystriummysticumcasent0101701profile1jpg |
| mystrium_rogeri | クロナガアゴアリ | Mystrium rogeri | N | A | WMCFileMystriumrogericasent0009349profile1jpg |
| mystrium_voeltzkowi | シワムネナガアゴアリ | Mystrium voeltzkowi | N | A | WMCFileMystriumvoeltzkowicasent0101952profile1jpg |
| odontomachus_coquereli | トゲナガアゴアリ | Odontomachus coquereli | N | A | WMCFileOdontomachuscoquerelicasent0009409profile1jpg |
| paratrechina_glabra | ウスキツヤアリ | Paratrechina glabra | N | A | WMCFileParatrechinaglabracasent0067057dorsal1jpg |
| strumigenys_dicomas | ハリアゴアリ | Strumigenys dicomas | N | A | WMCFileStrumigenysdicomascasent0005521profile1jpg |
| strumigenys_lucomo | キイロケブカアリ | Strumigenys lucomo | N | A | WMCFileStrumigenyslucomocasent0005587profile1jpg |
| syllophopsis_hildebrandti | アメイロケブカアリ | Syllophopsis hildebrandti | N | A | WMCFileMonomoriumhildebrandticasent0133645profile1jpg |
| technomyrmex_madecassus | キイロヒラフシアリ | Technomyrmex madecassus | N | B | WMCFileTechnomyrmexmadecassuscasent0101705profile1jpg |
| tetraponera_sahlbergii | ホソナガクロアリ | Tetraponera sahlbergii | N | A | WMCFileTetraponerasahlbergiicasent0012851profile1jpg |

### 2.4 案 A の品質評価

数は下限 80 に届く。品質は次の 3 点で成立しない。

1. アリが 22 種 (27.5%)。全て AntWeb の CASENT 側面像で、褐色から黒褐色の同じ構図が並ぶ。N 帯 55 種の 4 割がこれになる。マダガスカル遠征 I のアリは 3 種だったので、同じ地域の I と II で見え方が大きく変わる。
2. トンボが 1 種。マダガスカル遠征 I がトンボ 25 種前後を収録したため残プールに 1 種しか無く、追加 fetch でも増やせない (3 章)。チョウ目も 6 種が上限で、これも増やせない。
3. A- 5 種と B 7 種の計 12 種 (15%) が要検証または欠陥を抱える。凍結は取り消せない (決定 4) ため、この状態で freeze すると差し替えの余地が無くなる。

レア帯の見栄えだけは成立する。SSR 3 と SR 6 の 9 枚はいずれも色か形が突出しており、オーストラリア遠征 II の上位帯と比べても遜色がない。問題は N 帯の単調さに集中している。

## 3. 追加 fetch でも動かせない制約

残プール 209 種のうち写真未取得の 102 種の目の内訳は次のとおりである。

| 目 | 写真未取得 | occ の範囲 | 取得見込み |
|---|---:|---|---|
| Coleoptera | 21 | 113 から 908 | 高い。全て Scarabaeidae のマダガスカル固有群 |
| Trichoptera | 18 | 5 から 94 | 低い。既取得分も大半がラベル支配だった |
| Phasmida | 16 | 5 から 33 | 低い |
| Hemiptera | 13 | 47 から 154 | 中。Reduviidae 8 種が中心 |
| Diptera | 11 | 39 から 466 | 中 |
| Mantodea | 11 | 5 から 24 | 低い |
| Orthoptera | 10 | 22 から 126 | 中 |
| Hymenoptera | 2 | 850 から 877 | 高い |
| Odonata | 0 | | 追加不可 |
| Lepidoptera | 0 | | 追加不可 |
| 計 | 102 | | |

Odonata と Lepidoptera は残プールに 1 種も残っていない。マダガスカル遠征 I がトンボ 25 種前後とチョウ・ガ 14 種を消費したためで、seeds を使い切っている。したがって追加 fetch をいくら回しても マダガスカル遠征 II のトンボは 1 種、チョウ目は 6 種が上限である。これを動かすには `docs/komorebi_regions.md` 6 章の must-have 指名シード層で speciesKey を指定した追加 harvest が要る。

## 4. 案 B: 追加 fetch を伴う 84 種

### 4.1 目の上限を設ける

案 A の偏りを直すため、次の上限を置く。

| 目 | 上限 | 理由 |
|---|---:|---|
| Hymenoptera | 10 | 全て同構図のアリ側面像。マダガスカル遠征 I が 3 種、オーストラリア遠征 I が 2 種 |
| Diptera | 5 | カとミバエが中心で見栄えが弱い |
| Trichoptera | 4 | 同上 |

A 等級 68 種にこの上限をかけると 56 種になる。84 種に対して **28 種の不足** である。

| 目 | A 等級 | 上限適用後 | 追加 fetch の配分案 | 最終 |
|---|---:|---:|---:|---:|
| Coleoptera | 7 | 7 | +9 | 16 |
| Hemiptera | 7 | 7 | +6 | 13 |
| Orthoptera | 7 | 7 | +4 | 11 |
| Phasmida | 4 | 4 | +5 | 9 |
| Mantodea | 5 | 5 | +4 | 9 |
| Hymenoptera | 20 | 10 | 0 | 10 |
| Lepidoptera | 6 | 6 | 0 | 6 |
| Diptera | 6 | 5 | 0 | 5 |
| Trichoptera | 5 | 4 | 0 | 4 |
| Odonata | 1 | 1 | 0 | 1 |
| 計 | 68 | 56 | +28 | 84 |

レアリティは 84 種標準の N 57 / R 17 / SR 7 / SSR 3 に戻る。SSR 3 と SR 6 は 2.1 と 2.2 のまま据え置き、SR の 7 本目は追加 fetch の結果から選ぶ。暫定候補は Hyalomantis madagascariensis (アカメミドリカマキリ、赤い複眼をもつ緑色のカマキリ) で、1.1 の同定確認か再取得を先に通す。

### 4.2 追加 fetch リスト (不足 28 種を満たすための対象)

写真の落選率を オーストラリア遠征 I の実績 13% ではなく、マダガスカル側の実測 (107 種中 C 等級 23 種 = 21%) で見積もる。歩留まりを 65% として、28 種を確保するには 44 種前後の fetch が要る。優先順に列挙する。

第 1 優先: Coleoptera 21 種 (全件)。期待取得 14 種。

| 学名 | 科 | occ |
|---|---|---:|
| Nanos viettei | Scarabaeidae | 908 |
| Neoemadiellus humerosanguineum | Scarabaeidae | 536 |
| Helictopleurus neoamplicollis | Scarabaeidae | 462 |
| Nanos mirjae | Scarabaeidae | 451 |
| Helictopleurus fasciolatus | Scarabaeidae | 444 |
| Nanos dubitatus | Scarabaeidae | 398 |
| Apotolamprus marojejyensis | Scarabaeidae | 311 |
| Epilissus emmae | Scarabaeidae | 260 |
| Helictopleurus neuter | Scarabaeidae | 253 |
| Epilissus apotolamproides | Scarabaeidae | 230 |
| Helictopleurus marsyas | Scarabaeidae | 222 |
| Apotolamprus quadrinotatus | Scarabaeidae | 215 |
| Laccophilus posticus | Dytiscidae | 180 |
| Nanos binotatus | Scarabaeidae | 173 |
| Helictopleurus splendidicollis | Scarabaeidae | 172 |
| Nanos vadoni | Scarabaeidae | 161 |
| Labarrus madagassicus | Scarabaeidae | 141 |
| Epilissus mantasoae | Scarabaeidae | 133 |
| Arachnodes hanskii | Scarabaeidae | 118 |
| Nanos occidentalis | Scarabaeidae | 114 |
| Heteroconus paradoxus | Scarabaeidae | 113 |

この群は マダガスカル固有の Canthonini と Helictopleurus で、既に取得済みの Epilissus splendidus (エメラルド)、Helictopleurus rudicollis (金属緑)、Helictopleurus vadoni (青銅に赤斑)、Helictopleurus quadripunctatus (橙に黒点) を見るかぎり、金属光沢と強い配色が期待できる。occ も 113 以上で museum tier の見込みが高い。fetch 1 本あたりの図鑑価値は残プール中で最も高い。

第 2 優先: Hemiptera 13 種 (全件)。期待取得 8 種。

| 学名 | 科 | occ |
|---|---|---:|
| Naucoris madagascariensis | Naucoridae | 154 |
| Tanindrazanus marginatus | Reduviidae | 114 |
| Toxopus toliara | Reduviidae | 101 |
| Hovacoris bipunctatus | Reduviidae | 99 |
| Gibbosella vangocris | Reduviidae | 93 |
| Toliarus trichrous | Reduviidae | 72 |
| Tanindrazanus harinhali | Reduviidae | 69 |
| Nasatus davidouvrardi | Ricaniidae | 65 |
| Paracopium glabricorne | Tingidae | 52 |
| Bekilya tuleara | Reduviidae | 52 |
| Zanna tenebrosa | Fulgoridae | 51 |
| Toxopus insignis | Reduviidae | 49 |
| Amberana sexguttata | Cercopidae | 47 |

Zanna tenebrosa は既収録の Zanna madagascariensis と同属のビワハゴロモで、取れれば R 帯の候補になる。

第 3 優先: Orthoptera 10 種 (全件)。期待取得 6 種。Rubellia nigro-signata (Pyrgomorphidae、occ 126) を筆頭に Acrididae 9 種。Pyrgomorphidae は既収録の Phymateus saxosus と Atractomorpha acutipennis を見るかぎり配色が強い。

第 4 優先: Phasmida 16 種と Mantodea 11 種。期待取得は合わせて 9 種だが occ が 5 から 33 と低く、成功率は読めない。Spathomorpha adefa (occ 33)、Parectatosoma cervinum、Antongilia laciniata、Platycalymma dichroica、Tarachomantis caldwelli を優先する。

再取得: A- 5 種と B 11 種。既に card はあるので `zukan_foundry/data/species_reserve/naming/refetch_queue.json` に載せて別 tier での再取得を試す。期待取得 8 種。これが取れれば第 4 優先の低 occ 群を削れる。

### 4.3 案 B の見込み

fetch 対象を第 1 から第 3 優先の 44 種 + 再取得 16 種 = 60 種とすると、期待取得は 36 種で必要 28 種に対して余裕がある。作業量は `/zukan-fetch` の 1 process serial で 60 種分で、ボルネオ遠征 I の 96 種より軽い。

ただし 3 章の制約により、案 B でもトンボ 1 種とチョウ目 6 種は変わらない。マダガスカル遠征 I がトンボの巻、II が甲虫とカマキリの巻という色分けになる。これを地域の性格として受け入れるか、must-have 指名で補正するかは判断を要する。

## 5. 命名の状況

案 A の 80 種のうち 63 種は既に `shared/bugs.js` に areaOnly komorebi として登録済みで、和名も付いている (マダガスカル遠征 I の選抜から漏れた命名済み種)。命名が要るのは 17 種である。全件について `docs/komorebi_naming_convention.md` に従い、写真を実見して仮称を提案する。

| id | 仮称案 | 学名 | 科 | 命名根拠 (写真から) |
|---|---|---|---|---|
| graciella_compacta | キマダラカミキリ | Graciella compacta | カミキリムシ科 | 褐色の上翅に淡黄色の大きな斑が縦に並ぶ |
| rhantus_latus | マダラゲンゴロウ | Rhantus latus | ゲンゴロウ科 | 黒地に淡黄の斑が全面に散る |
| canthydrus_guttula | アカアシコツブゲンゴロウ | Canthydrus guttula | コツブゲンゴロウ科 | 黒褐色の体に橙赤の脚と縁取り |
| melanostoma_sylvarum | コハクヒラタアブ | Melanostoma sylvarum | ハナアブ科 | 全身が琥珀色に透ける側面像 |
| orgizomyia_zigzag | ヤマガタモンアブ | Orgizomyia zigzag | アブ科 | 腹部に山形の暗色帯が 3 段並ぶ |
| appasus_quadrivittatus | スジコオイムシ | Appasus quadrivittatus | コオイムシ科 | 背に卵塊、体には縦条。属の和名に合わせた |
| chopardempusa_neglecta | マダラチャバネカマキリ | Chopardempusa neglecta | カマキリ | 褐色の体に斑の入った翅 |
| majanga_basilaris | ヒロバネカレハカマキリ | Majanga basilaris | カマキリ | 枯葉状に広がった翅の背面展開 |
| paramantis_viridis | ウスチャホソカマキリ | Paramantis viridis | カマキリ科 | 細身で淡褐色 |
| acorypha_decisa | チャスジバッタ | Acorypha decisa | バッタ科 | 褐色地に濃い縦条 |
| eyprepocnemis_smaragdipes | サクライロバッタ | Eyprepocnemis smaragdipes | バッタ科 | 淡い桜色を帯びた灰褐色 |
| rhadinacris_schistocercoides | ゴマフオオバッタ | Rhadinacris schistocercoides | バッタ科 | 大型で全身に胡麻状の黒点 |
| parectatosoma_hystrix | アカアシトゲナナフシ | Parectatosoma hystrix | ナナフシ | 緑色の体に赤い脚と棘 |
| achrioptera_magnifica | ダイダイオオナナフシ | Achrioptera magnifica | ナナフシ科 | 橙色の大型ナナフシ。体の中央に黄条 |
| macrostemum_placidum | キンオビシマトビケラ | Macrostemum placidum | シマトビケラ科 | 黒地に金色の帯 |
| heteracris_nigricornis | アカバネオオバッタ | Heteracris nigricornis | バッタ科 | 後翅が鮮やかな赤 |
| sigara_alluaudi | マダラミズムシ | Sigara alluaudi | ミズムシ科 | 楕円形の体に淡色の斑 |

機械検証の結果 (`shared/bugs.js` の全 1765 entry、および オーストラリア遠征 II ドラフトの 84 件と突き合わせ)。

| 検査 | 結果 |
|---|---|
| 新規命名 17 件の bugs.js 既存和名との衝突 | 0 件 |
| 新規命名 17 件の AU II ドラフト和名との衝突 | 0 件 |
| 新規命名 17 件のドラフト内重複 | 0 件 |
| 和名の長さ 4 から 12 文字 | 17 件全通過 |
| 案 A 80 種の写真保有 | 80 件全て保有 |
| 案 A のレア度内訳 | N 55 / R 16 / SR 6 / SSR 3 |
| SSR の目の分散 | 3 目 (Mantodea / Coleoptera / Hemiptera) |

初回作成時に Macrostemum placidum に付けた キマダラシマトビケラ が本編の Diplectrona japonica と衝突したため キンオビシマトビケラ に付け直した。

## 6. カテゴリ帰属案

更新 6 は新しい学習カテゴリを伴わない図鑑ドロップである (`docs/komorebi_release_linkage.md` 2 章)。一方 `komorebi/app.js` の `validateVolume` は `volume.categories` が空配列だと検査で落ちるため、II 巻にも最低 1 本の帰属が要る。

制約は `docs/komorebi_volume_zukan_design.md` 4 章の「地域内で同じカテゴリは 1 つの遠征にのみ属し、帰属は変わらない」である。マダガスカル遠征 I が保持する 5 本 (kom_ratio / kom_pi314 / kom_kuku_dan2 / kom_kuku_dan5 / kom_kuku_run) は使えない。

推奨案。ボルネオ遠征 I (更新 3) 由来の 4 本を MG II に割り当てる。

| cat | 由来 | 割当理由 |
|---|---|---|
| kom_frac_flow | ボルネオ遠征 I | k10 枠。分数の流れ |
| kom_kuku_inverse | ボルネオ遠征 I | 九九の逆引き。マダガスカル遠征 I の kom_kuku_run と系列が近く、地域の性格が揃う |
| kom_kuku_dan6 | ボルネオ遠征 I | 6 の段 |
| kom_kuku_dan7 | ボルネオ遠征 I | 7 の段 |

オーストラリア遠征 II のドラフト (`zukan_foundry/reports/au_expedition2_freeze_draft.md` 3 章) はコスタリカ遠征 I 由来の 4 本を推奨しており、2 巻で重複しない。地域内一意の検査は、マダガスカルが MG I の 5 本 + MG II の 4 本 = 9 本で重複なし。

対案。オーストラリア遠征 II とコスタリカ遠征 I 由来 4 本を入れ替える。更新 5 と 6 の順序を再度動かす場合は連動して見直す。

## 7. 地域 blurb

マダガスカル遠征 I の文をそのまま使う。地域 blurb は地域単位で、遠征ごとに変えない。

> アフリカの東にうかぶ大きな島。日本の 1.6 倍。ここにしかいない虫がとても多い。

## 8. freeze 承認後の反映作業 (見積り)

オーストラリア遠征 I と同一の機械フローで進める。件数は案 A (80 種) を基準とし、案 B を採る場合は括弧内。

| # | 対象 | 件数 | 内容 |
|---|---|---:|---|
| 1 | `shared/bugs.js` レア度更新 | 63 entry (案 B なら 56) | 既登録の 63 種は rarity が N の仮値。SSR / SR / R の 25 種を書き換える |
| 2 | `shared/bugs.js` 新規追記 | 17 entry (案 B なら 28 前後) | 5 章の命名 17 件。id / jaName / scientificName / order / family / familyJa / groupJa / renderer / colors / tags / habitat / note / nameStatus provisional / areaOnly komorebi / rarity |
| 3 | `zukan_config/zukan_catalog.js` | 80 entry 追記 (案 B なら 84) | 現在 0 件。specimen / source / image の 3 層を `zukan_cards/metadata/*.json` から移す |
| 4 | `komorebi/volumes/` の volume manifest | 1 volume | `volume_fixture_madagascar_2` を新規追加。species 80 (または 84)、denominator 同数、frozen true、expedition 2、release 6、flagship は phyllocrania_paradoxa、categories は 6 章の 4 本 |
| 5 | `komorebi/trophies.js` | 0 から 4 件 | 更新 6 は新カテゴリ 0 本。看板を代表虫の既定として参照する結線のみ確認する |
| 6 | `sw.js` | 3 箇所 | CACHE 名バンプ、CORE への volume ファイル追加、`?v=` バンプ |
| 7 | 写真取得 (案 B のみ) | 60 種 fetch | 4.2 の優先順。`/zukan-fetch` の 1 process serial |
| 8 | テスト | 6 項目 | 種数と帯の一致 / flagship 1 種かつ SSR / 看板の本編未収録 / denominator と species 長の一致 / 変態タイプ (10 目全て METAMORPHOSIS_BY_ORDER に存在) / 学名 canonical と synonym の本編・他 volume 衝突 |
| 9 | 回帰 fixture と safety check | 1 回 | `tests/` の回帰実行と commit 前の混入確認 |

案 A なら写真取得が不要なため、命名 17 件を書けば freeze に進める。案 B は fetch 60 種と命名 28 件前後が先に立ち、着手から freeze まで数日規模が乗る。

## 9. レビューで確認したい事項

1. 案 A (80 種、写真既存のみ、アリ 22 種・トンボ 1 種) と案 B (84 種、fetch 60 種) のどちらを採るか (2 章と 4 章)。
2. 案 A を採る場合、A- 等級 5 種と B 等級 7 種の計 12 種を凍結に含めることの可否 (1.1 と 1.2)。凍結は取り消せない (決定 4)。
3. マダガスカル遠征 II のトンボが 1 種・チョウ目が 6 種で固定される件を受け入れるか、must-have 指名シード層で補正する追加 harvest を回すか (3 章)。
4. 看板 Phyllocrania paradoxa の写真を現行のまま使うか、背面展開の写真を再取得してから freeze するか (2.1)。
5. 新規命名 17 件の可否 (5 章)。
6. カテゴリ帰属をボルネオ遠征 I 由来 4 本にするか、オーストラリア遠征 II と入れ替えるか (6 章)。
7. `zukan_cards/metadata` 全件に対する画像内容の再検査 (岩の写真、枝だけの写真、模式図、別種の画像が確認されている) をこの更新と並行して回すか (1.3)。

## 決定記録

- 2026-08-18: user 決定は案B (84 種、28 種を追加 fetch)。fetch 対象 60 種リストはボルネオ I の取得 round と同じ回でまとめて回す。
