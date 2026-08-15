# オーストラリア遠征 I volume 凍結設計ドラフト

作成日: 2026-08-14。状態: 提案ドラフト (未実装)。最終決定は発案者が行う。

## 0. 前提と入力

- 対象: 命名済み AU 種 97 種。`zukan_foundry/data/species_reserve/naming/named_batch4.json` (52 種)、`named_batch5.json` (20 種)、`named_batch6.json` (25 種) の jaName 入り全種。
- 97 種全種が `shared/bugs.js` に登録済み (areaOnly: komorebi、rarity は全て N の仮値)。`zukan_config/zukan_catalog.js` への収録は 0 件。
- 写真は全 97 種について `zukan_cards/metadata/*.json` の species_id join で display 画像 (`zukan_cards/processed/*_L2_grade.webp`) の実在を確認した。
- 参照モデル: `komorebi/volumes/volume_fixture.js` のマダガスカル遠征 I (84 種、看板 SR 1 = oo_onaga_yamamayu コメットガ)。
- 注意 (要ユーザ判断): 依頼文は MG I を「N 62 / R 15 / SR 7」としているが、現行 fixture の実データを数えると N 57 / R 17 / SR 10 (SR に看板 1 を含む) である。本ドラフトは指示どおり N 62 / R 15 / SR 7 を基本案とし、fixture 実績比率に合わせる場合の追加昇格候補を 2.4 に示す。
- 看板およびレア度上位候補は display 画像を実見して確認した。実見した写真 id は各表に記す。

## 1. 収録 84 種の選抜案 (97 から 13 種を落とす)

### 1.1 落選 13 種と根拠

落とす基準は写真品質が相対的に弱いこと、および分類群の偏り調整。全件、写真を実見または命名 note の品質記録で確認した。

| id | 和名 | 根拠写真 id | 落選理由 |
|---|---|---|---|
| harmonia_conformis | ダイダイホシテントウ | AMK362780 | 手書きラベル 4 枚が画面を支配し、虫 2 頭は左下隅に微小 (実見) |
| hippodamia_variegata | シロエリホシテントウ | NHMUK014444593 | 白いかびの結晶が全面に付着、体の輪郭も崩れて見える (実見) |
| bactrocera_dorsalis | ミカンコミバエ | NHMUKBMNHE1435939 | 裏返りに近い姿勢崩壊で頭部が分離して見える (実見)。命名 note でも差し替え候補 |
| melangyna_viridiceps | ツヤグロヒラタアブ | AMK406108 | 油回りで黒変し、生時の黄条が白帯に見える。色情報が図鑑として誤誘導 (実見) |
| iridomyrmex_purpureus | アカムネクロハラアリ | AMK383427 | 液浸瓶に多数個体が詰まった写真で単体像がない (実見)。note でも差し替え要 |
| camponotus_consobrinus | バンデッドシュガーアリ | AMK383540 | 全体がぼやけ、脚を縮めた姿勢で種の特徴が読めない (実見)。note でも差し替え候補 |
| vespula_germanica | ヨーロッパクロスズメバチ | NHMUK010635102 | 横転姿勢に加えて頭部と胸にかび付着 (実見)。外来種で AU らしさも弱い |
| lasioglossum_urbanum | ルリガオコハナバチ | USNMENT00535183 | 頭部接写のみで全身像がない (実見)。標本カードの原則に反する |
| myrmecia_pilosula | クロガオキバハリアリ | WMCFileMyrmeciapilosulaspecimenmandiblesjpg | 頭部接写のみで全身像がない (実見)。迫力はあるが同上 |
| utetheisa_pulchelloides | ベニモンホシヒトリ | RMNHZMAINS1544761 | 三角紙の包みが画面中央を支配し、虫は左隅に小さい (実見で今回発見)。命名 note には現れていない欠陥 |
| acrophylla_wuelfingi | ゴマフナナフシ | WMCFileAcrophyllawuelfingiSF252842jpg | 頭が枠外の部分像で、赤い異物の切れ端も混入 (実見) |
| ulmerochorema_rubiconum | アメイロナガレトビケラ | NHMUK014407991 | ラベルが画面の大半を占め、虫は微小 (実見) |
| notalina_moselyi | ウスバヒゲナガトビケラ | NHMUK014409058 | type ラベルと barcode が画面下半分を支配、標本自体も退色 (実見) |

### 1.2 選抜後の分類群バランス (84 種)

| 目 | 97 種時点 | 落選 | 収録 | MG I 実績との比較 |
|---|---:|---:|---:|---|
| Odonata (トンボ) | 12 | 0 | 12 | MG I はトンボ偏重 (約 25 種)。AU は 12 で適正化 |
| Orthoptera (バッタ) | 12 | 0 | 12 | MG I 10 種前後と同等 |
| Hemiptera (カメムシ・セミ) | 11 | 0 | 11 | セミ 3 種が AU らしさを担う |
| Lepidoptera (チョウ・ガ) | 12 | 1 | 11 | MG I 14 種よりやや少 |
| Phasmatodea (ナナフシ) | 12 | 1 | 11 | AU の看板分類群。MG I は 1 種のみで、地域差が出る |
| Coleoptera (甲虫) | 11 | 2 | 9 | MG I 4 種より厚い。クワガタ、ゾウムシ、ハナムグリと多様 |
| Mantodea (カマキリ) | 8 | 0 | 8 | MG I 5 種と同等 |
| Diptera (ハエ・アブ) | 9 | 2 | 7 | MG I 2 種より厚い |
| Hymenoptera (ハチ・アリ) | 7 | 5 | 2 | 写真品質起因で大幅減。MG I 3 種 (全てアリ) に近い水準 |
| Trichoptera (トビケラ) | 3 | 2 | 1 | MG I 0 種。1 種残して分類群の幅を確保 |
| 計 | 97 | 13 | 84 | |

補足。Hymenoptera の落選 5 種は全て写真品質起因で、恣意的な間引きではない。もし 3 種確保を優先するなら、頭部接写ながら画として強い myrmecia_pilosula (クロガオキバハリアリ) を復帰させ、代わりに写真が弱い creontiades_dilutus (アシナガミドリカスミカメ、WMCFileMiridonbeanjpg、ピント不良) か bactrocera_neohumeralis (パーキンスミバエ、NHMUKBMNHE1436396、脚の乱れ) を落とす選択肢がある。ただし全身像なしのカードを 1 枚許すことになるため、基本案では非収録とし AU 遠征 II までの再取得候補に回す。

## 2. レア度配分案 (N 62 / R 15 / SR 7)

配分の考え方: 見た目のインパクト (色、模様)、大きさの物語性 (最大級、巨大)、希少感 (固有性、標本の見栄え) の 3 点。全 R / SR 候補は display 画像を実見した。

### 2.1 SR 7 種 (看板 1 種を含む)

| # | id | 和名 | 根拠写真 id | 根拠 |
|---|---|---|---|---|
| 1 | papilio_ulysses | ウリッセスアゲハ | NHMUKBMNHE1054829 | 黒地に電光のような青。左右対称の完全な展翅で、実見した全候補中で最も強い。看板 (3 章参照) |
| 2 | podacanthus_viridiroseus | ベニバネナナフシ | WMCFileBothwingsopenjpg | 桃紅色の大きな後翅を全開した生態写真。AU の看板分類群ナナフシの頂点 |
| 3 | lamprima_aurata | アウラタキンイロクワガタ | AMK584706 | 全身が金緑に輝くクワガタ。子ども人気の最上位分類群で金属光沢が鮮烈 |
| 4 | extatosoma_tiaratum | ユウレイヒレアシナナフシ | NHMUK012505240 | トゲとヒレだらけの異形。色は地味だが形のインパクトと知名度 (飼育品種として世界的) が別格 |
| 5 | chrysolopus_spectabilis | ホシゾラゾウムシ | MNHNL88287 | 黒地に水色の星を散らした模様が名前どおり星空。Banks 採集の歴史的有名種 |
| 6 | papilio_aegeus | メスアカモンキアゲハ | RMNHZMAINS5182127 | 大型アゲハ。白紋と橙赤斑の対比が鮮やかな雌の展翅 |
| 7 | tectocoris_diophthalmus | ダイダイキンカメムシ | WMCFileTectocorisdiophthalmusfemaleadultwitheggsdorsoolateraljpg | 橙地に金属青緑の斑。横からの生態写真で立体感があり、小型ながら発色は SR 級 |

### 2.2 R 15 種

| # | id | 和名 | 根拠写真 id | 根拠 |
|---|---|---|---|---|
| 1 | eupoecila_australasiae | カザリハナムグリ | WMCFileFiddlerBeetleScarabaeidaeEupoecilaaustralasiae27038381872jpg | 暗赤地に黄橙の渦巻き模様。発色と解像感が高い |
| 2 | anoplognathus_porosus | ホシアメイロコガネ | AMK675972 | つやのある飴色。AU 名物クリスマスビートルの代表として |
| 3 | scutiphora_pedicellata | ホシミドリキンカメムシ | WMCFileMetallicShieldBugScutiphorapedicellataatvariouslifestagesjpg | 金属緑に黒斑と橙帯。ただし画面に成虫と幼虫群が同居しており、単体像への差し替え候補と注記して R 採用 |
| 4 | mictis_profana | ジュウジヘリカメムシ | USNMENT01567117 | 背のたすき状の交差模様が明快。標本状態良好 |
| 5 | pristhesancus_plagipennis | キアシオオサシガメ | AMK494205 | 大型サシガメの迫力。黄脚と濃褐色の対比 |
| 6 | psaltoda_plaga | スミイロゼミ | AMK294337 | 墨色の体と半透明翅の対比。ブラックプリンスの通称をもつ有名ゼミ |
| 7 | dasypodia_selenophora | ミカヅキトモエ | WMCFileDasypodiaselenophoramalejpg | 左右の大きな目玉模様と三日月の弧。展翅が整って見栄えが良い |
| 8 | junonia_villida | メダマタテハモドキ | NHMUKBMNHE668142 | 橙帯と青い瞳の眼状紋が多数並ぶ。MG I の R タテハ類と同格 |
| 9 | myrmecia_forficata | ハラグロキバハリアリ | WMCFileMyrmeciaforficatacasent0914026p1highjpg | ブルドッグアリの全身側面像。大あごの迫力と解像感が高い。AU らしさの象徴 |
| 10 | tenodera_australasiae | アミバネカマキリ | NHMUK012500106 | 翅を全開した展翅標本。後翅の網目が広がり左右対称で美しい |
| 11 | acrophylla_titan | ムギワラオオナナフシ | WMCFileAcrophyllatitan2jpg | 最大級ナナフシの物語性。色は地味だが大きさで R |
| 12 | megacrania_batesii | シロバネナナフシ | NHMUKBMNHE845071 | 緑の体に白い後翅を開いた標本。ペパーミント臭で知られる有名種 |
| 13 | anchiale_briareus | アオバネナナフシ | iNatobs154263336 | 枯草色の体から青黒い後翅がのぞく意外性 |
| 14 | valanga_irregularis | アカメオオバッタ | AMK475269 | AU 最大のバッタ。赤い複眼。写真は中程度だが大きさの物語性で R |
| 15 | anax_papuensis | セボシヤンマ | USNMENT00361709 | 大型ヤンマの全身側面。AU トンボ群 12 種の代表として 1 枠。同格候補の aeshna_brevistyla (USNMENT00359835) は翅にラベル文字が透けるため次点 |

### 2.3 N 62 種

残り全種。分類群ごとに列挙する (id、和名、根拠写真 id)。

Coleoptera (5)

| id | 和名 | 写真 id |
|---|---|---|
| chondropyga_dorsalis | ナカグロハナムグリ | WMCFileChondropygadorsalis454779434jpg |
| coccinella_transversalis | ヤマイチテントウ | AMK135602 |
| coelophora_inaequalis | カタボシテントウ | AMK255710 |
| cyclocephala_signaticollis | キイロブチコガネ | iNatobs327759524 |
| neorrhina_punctatum | ヒョウモンハナムグリ | WMCFileNeorrhinapunctatum343231784jpg |

Diptera (7)

| id | 和名 | 写真 id |
|---|---|---|
| bactrocera_neohumeralis | パーキンスミバエ | NHMUKBMNHE1436396 |
| bactrocera_tryoni | クインスランドミバエ | NHMUKBMNHE1435083 |
| eristalinus_punctulatus | ホシメダイダイハナアブ | AMK405433 |
| exaireta_spinigera | シロバネクロミズアブ | AMK474256 |
| neoaratus_hercules | アカアシムシヒキアブ | AMK422735 |
| polypedilum_nubifer | ホシバネユスリカ | WMCFilePolypedilumnubiferinat270879334jpg |
| simosyrphus_grandicornis | キハラヒラタアブ | USNMENT00250289 |

Hemiptera (6)

| id | 和名 | 写真 id |
|---|---|---|
| creontiades_dilutus | アシナガミドリカスミカメ | WMCFileMiridonbeanjpg |
| cyclochila_australasiae | ウスキバネオオゼミ | AMK287219 |
| gminatus_australis | ダイダイサシガメ | AMK492822 |
| henicopsaltria_eydouxii | ダイダイオビゼミ | AMK293741 |
| nabis_kinbergii | ネッタイマキバサシガメ | WMCFileNabiskinbergiijpg |
| stenotus_binotatus | フタスジカスミカメ | NHMUK015556665 |

Hymenoptera (1)

| id | 和名 | 写真 id |
|---|---|---|
| amegilla_chlorocyanea | キンムネシマハナバチ | AMK105221 |

Lepidoptera (7)

| id | 和名 | 写真 id |
|---|---|---|
| agrotis_infusa | ハイイロモンヤガ | WMCFileAgrotisinfusafemalejpg |
| agrotis_munda | クロモンヤガ | WMCFileAgrotismundamaleLCRjpg |
| euploea_corinna | シロテンマダラ | NHMUKBMNHE668114 |
| heteronympha_merope | ミナミジャノメ | RMNHZMAINS5178440 |
| ocybadistes_walkeri | イシダタミセセリ | AMK461609 |
| synemon_plana | キモンセセリモドキガ | NHMUK015925004 |
| vanessa_itea | モンキアカタテハ | NHMUKBMNHE668140 |

Mantodea (7)

| id | 和名 | 写真 id |
|---|---|---|
| archimantis_latistyla | ホソミドリカマキリ | iNatobs203207456 |
| archimantis_sobrina | カレエダホソカマキリ | WMCFileArchimantissobrinaFlickrjeansPhotosjpg |
| mantis_octospilota | クロボシカマキリ | iNatobs329556630 |
| miomantis_caffra | クビナガカマキリ | WMCFileMiomantiscaffra251261857jpg |
| neomantis_australis | マルバネカマキリ | iNatobs197573116 |
| orthodera_ministralis | ナンヨウカマキリ | WMCFileOrthoderaministralisNZAC06001821jpg |
| sphodropoda_quinquedens | チャバネカマキリ | iNatobs389240952 |

Odonata (11)

| id | 和名 | 写真 id |
|---|---|---|
| aeshna_brevistyla | ムネスジヤンマ | USNMENT00359835 |
| austroargiolestes_icteromelas | ハバビロイトトンボ | USNMENT00350072 |
| austrolestes_analis | ハラナガアオイトトンボ | USNMENT00827056 |
| austrolestes_leda | ワモンアオイトトンボ | USNMENT00349663 |
| diplacodes_bipunctata | ベニヒメトンボ | USNMENT00273708 |
| diplacodes_haematodes | コハクバネヒメトンボ | USNMENT00273587 |
| hemicordulia_australiae | キボシエゾトンボ | USNMENT00360051 |
| ischnura_aurora | キバライトトンボ | USNMENT00331947 |
| orthetrum_caledonicum | クロオビシオカラトンボ | USNMENT00311327 |
| orthetrum_sabina | ハラボソトンボ | USNMENT00386511 |
| tramea_loewii | オセアニアハネビロトンボ | AMK305254 |

Orthoptera (11)

| id | 和名 | 写真 id |
|---|---|---|
| acrida_conica | トガリアタマバッタ | AMK584674 |
| acripeza_reticulata | アミメキリギリス | AMK519253 |
| austracris_guttulosa | シロスジオオバッタ | AMK475365 |
| chortoicetes_terminifera | サビイロカスリバッタ | AMK620098 |
| coryphistes_ruricola | キノカワバッタ | AMK267408 |
| cryptobothrus_chrysophorus | アカスネバッタ | AMK620855 |
| gastrimargus_musicus | セスジチャイロバッタ | AMK622521 |
| goniaea_australasiae | トサカバッタ | AMK622575 |
| oedaleus_australis | ミドリガシラバッタ | AMK421400 |
| phaulacridium_vittatum | アカチャコバネバッタ | AMK622942 |
| teleogryllus_commodus | キモンクロコオロギ | AMK618667 |

Phasmatodea (6)

| id | 和名 | 写真 id |
|---|---|---|
| anchiale_austrotessulata | マダラナナフシ | WMCFileAnchialeaustrotessulataSamuelFrankel605360593jpeg |
| candovia_strumosa | イボアタマナナフシ | WMCFileCandoviastrumosa453625215jpg |
| ctenomorpha_marginipennis | ハイイロナナフシ | WMCFileCtenomorphachronus03jpg |
| eurycnema_osiris | トゲアシミドリナナフシ | iNatobs84402040 |
| sipyloidea_larryi | イトアシナナフシ | WMCFileSipyloidealarryijpg |
| tropidoderus_childrenii | ワカクサナナフシ | WMCFileAnotherMaleTropidoderusChildreniijpg |

Trichoptera (1)

| id | 和名 | 写真 id |
|---|---|---|
| asmicridea_edwardsii | カスリシマトビケラ | NHMUK014499636 |

判断メモ。eurycnema_osiris (トゲアシミドリナナフシ、iNatobs84402040) は色は良いが姿勢が入り組んで読みにくく、実見の結果 R から N に落とした。cyclochila_australasiae (ウスキバネオオゼミ、AMK287219) は現地で最有名のセミだが標本退色が強く N とした。acripeza_reticulata (アミメキリギリス、AMK519253) は実物は隠し色をもつ有名種だが写真が暗く N。

### 2.4 fixture 実績比率 (N 57 / R 17 / SR 10) に合わせる場合の追加昇格候補

MG I fixture の実カウントに合わせるなら、SR へ 3 種、R へ 2 種を追加する。推奨順:

- SR 昇格 (R から): eupoecila_australasiae (カザリハナムグリ)、dasypodia_selenophora (ミカヅキトモエ)、myrmecia_forficata (ハラグロキバハリアリ)
- R 昇格 (N から): eurycnema_osiris (トゲアシミドリナナフシ)、henicopsaltria_eydouxii (ダイダイオビゼミ、AMK293741、翅脈の質感が良い)

## 3. 看板 (flagship SR) 候補と推薦順位

| 順位 | id | 和名 | 根拠写真 id | 推薦理由 |
|---|---|---|---|---|
| 1 | papilio_ulysses | ウリッセスアゲハ | NHMUKBMNHE1054829 | 黒地に輝く青一色という即読性。展翅が完全対称で thumb サイズでも識別できる。Queensland の観光紋章になった AU 昆虫の代表格。MG I 看板コメットガ (大型で色が明快な鱗翅) と同じ役割設計で、地域間の看板に統一感が出る |
| 2 | podacanthus_viridiroseus | ベニバネナナフシ | WMCFileBothwingsopenjpg | 緑の体から桃紅の大翅を全開した劇的な生態写真。ナナフシ大国 AU の個性を看板にできる。構図が斜めで背景切り抜きがやや複雑なぶん、カード映えで ulysses に一歩譲る |
| 3 | lamprima_aurata | アウラタキンイロクワガタ | AMK584706 | 金緑の光沢と子ども人気の高いクワガタという分類群。単体の見栄えは強いが、青いアゲハと比べると thumb での遠目のインパクトが劣る |

推奨: 第 1 候補 papilio_ulysses を看板 SR とする。

## 4. 地域 blurb

現行 fixture 文の流用を推奨する。

> 南半球の大陸。日本の 20 倍。かわいた大地とユーカリの森が広がる。

MG I の blurb (位置、日本との大きさ比較、自然の特徴) と同じ三段構成で統一感があり、変更は不要と判断。もし固有性を一言足すなら次の対案。

> 南半球の大陸。日本の 20 倍。かわいた大地とユーカリの森に、ここにしかいない虫がすむ。

## 5. 凍結時の残作業チェックリスト

docs/komorebi_design.md 13.2 の更新チェックリストを土台に、AU I 固有の項目を加えたもの。

1. カタログカード生成。収録 84 種は現在 `zukan_config/zukan_catalog.js` に 0 件。display / thumb / metadata は zukan_cards に全種分あることを確認済みなので、catalog entry の append が対象。落選 13 種は catalog に載せない (bugs.js には areaOnly のまま残し、AU 遠征 II までの再取得候補として refetch_queue で管理)。
2. bugs.js レア度反映。97 種全てが rarity N の仮値。本ドラフト確定後、R 15 種と SR 7 種の rarity を更新する。
3. bugs.js renderer / groupJa の修正。AU の Lepidoptera 12 種が一律 groupJa ガ、renderer ga で登録されており、アゲハ 2 種 (papilio_aegeus、papilio_ulysses)、タテハ 4 種 (junonia_villida、heteronympha_merope、euploea_corinna、vanessa_itea)、セセリ 1 種 (ocybadistes_walkeri) のシルエットと図鑑分類が誤る。refineRenderer は明示 renderer を上書きしないため、凍結前にデータ側の修正が必要 (MG I は hagata_murasaki が groupJa タテハ、renderer tateha で正しく登録されている前例)。
4. volume manifest 差し替え。`komorebi/volumes/volume_fixture.js` の volume_fixture_australia は合成 fixture (prefix kom_fixture_au、N6 R3 SR1)。実 84 種の species 配列、frozen: true、denominator 84、flagship 指定に置き換える。categories 配列 (現 fixture は release 3 ゲートの見本入り) は投入 release に合わせて確定する。
5. validator 実行。design doc 13.2 のとおり、重複、license、nameStatus、画像参照の 4 点。license は WMC / iNat 由来の CC-BY-SA 系と CC0 の混在があるため metadata の mediaLicense を一括検査する。nameStatus は 84 種中 provisional が大半である点を凍結記録に残す。
6. 変態タイプ検査。収録 84 種の目は 10 目で、bugs.js の METAMORPHOSIS_BY_ORDER は 10 目全てをカバーしている (Coleoptera / Lepidoptera / Hymenoptera / Diptera / Trichoptera が complete、Orthoptera / Hemiptera / Odonata / Mantodea / Phasmatodea が incomplete)。追加実装は不要の見込みだが、凍結時に再確認する。
7. 完走章重複検査。region_dedup_australia.md で seed 段階の学名衝突 16 件は除去済み。凍結時に、収録 84 種と本編 + 他 volume の学名 canonical / synonym 衝突がないことを最終確認する (catalog 重複 triage の学名衝突 41 組の前例があるため)。
8. 看板とトロフィーの結線。看板 SR は trophy manifest (komorebi/trophies.js) の既定代表虫になるため、papilio_ulysses 確定後にトロフィー側の参照を確認する。
9. sw.js CACHE バンプ、CORE 追加、?v= バンプ (design doc 13.2 の定常項目)。
10. 回帰 fixture 実行と commit 前 safety check (_inbox 等の混入確認)。

## 付記 (写真差し替えの中期候補)

収録はするが、より良い写真が取れ次第差し替えたいもの。

- scutiphora_pedicellata (ホシミドリキンカメムシ): 現画像は成虫 + 幼虫群の複数個体。単体像へ。
- valanga_irregularis (アカメオオバッタ): 後脚の欠損が疑われる個体。
- synemon_plana (キモンセセリモドキガ): 解像がやや甘い。
- acripeza_reticulata (アミメキリギリス): 露出不足。実物の隠し色 (腹部の青赤) が出る生態写真が理想。
- 落選 13 種のうち myrmecia_pilosula、utetheisa_pulchelloides、hippodamia_variegata あたりは種自体の魅力が高く、再取得できれば AU 遠征 II の有力候補。
