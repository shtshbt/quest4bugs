# オーストラリア遠征 II volume 凍結設計ドラフト

status: draft、user 承認待ち。コード・カタログ・bugs.js への反映は freeze 承認後。承認後の反映は オーストラリア遠征 I と同一の機械フロー (bugs.js 追記 + zukan_catalog append + volume manifest + trophies 割当 + テスト) で行う。本書の作成時点でリポジトリへの変更は本ファイルの新規作成のみ。

作成日: 2026-08-18。対象更新: 更新 5 (`zukan_foundry/reports/volume2_rarity_frames.md` の決定記録により、更新 5 と 6 を入れ替えて AU II を先行させる)。最終決定は発案者が行う。

## 0. 前提と入力

- 残プール: オーストラリア seeds (enriched) 302 種から、本編カタログ (`shared/bugs.js` の areaOnly なし entry) と学名 canonical または synonym が一致する種、および オーストラリア遠征 I の凍結 84 種を除いた 202 種。計測は 2026-08-18 で、`volume2_rarity_frames.md` 1 章の実測値と一致する。
- 標本写真あり: 202 種のうち 174 種。`zukan_cards/metadata/*.json` の scientific_name join で `zukan_cards/processed/*_L2_grade.webp` の実在を確認した。
- bugs.js 登録済: 13 種。この 13 種は全て オーストラリア遠征 I の落選 13 種であり、本ドラフトの選抜 84 種とは 1 種も重ならない。したがって選抜 84 種は全種が bugs.js 未登録であり、命名も新規に要る。
- カタログ登録済: 0 件。選抜 84 種の写真 id は `zukan_config/zukan_catalog.js` にいずれも存在しない。
- 参照モデル: `komorebi/volumes/volume_fixture.js` の volume_fixture_australia (オーストラリア遠征 I、84 種、看板 papilio_ulysses)。
- レアリティ配分は `docs/komorebi_rarity_standard.md` 1 章の 84 種標準 (N 57 / R 17 / SR 7 / SSR 3) をそのまま適用する。
- 写真は 174 種全件を contact sheet で実見した。SSR / SR は個別に原寸でも確認した。読み取りのみで、画像ファイルへの変更はしていない。

## 1. 選抜 84 種 (174 の写真保有種から選抜)

### 1.1 選抜の考え方

`docs/komorebi_rarity_standard.md` 6 章から 7 章の帯別基準に加えて、次の 2 点で 174 から 84 へ絞った。

1. 写真の足切り。ラベル・三角紙・スライド・液浸瓶が画面を支配するもの、頭部接写のみで全身像がないもの、複数個体を並べた図版、被写体が写っていないものを落とした。落選の代表例は 4 章に列挙する。
2. 分類群の均し。オーストラリア遠征 I の実績 (Odonata 12 / Orthoptera 12 / Hemiptera 11 / Lepidoptera 11 / Phasmatodea 11 / Coleoptera 9 / Mantodea 8 / Diptera 7 / Hymenoptera 2 / Trichoptera 1) を参照しつつ、II 巻では写真の質が高い甲虫とセミとナナフシを厚くした。

### 1.2 選抜後の目 (order) 分布

| 目 | 残プール (写真あり) | 選抜 | AU I 実績 | 備考 |
|---|---:|---:|---:|---|
| Coleoptera (コウチュウ) | 19 | 12 | 9 | 看板を含む。フンコガネが多いが 4 種に抑えた |
| Hemiptera (カメムシ・セミ) | 17 | 12 | 11 | セミ 6 種が AU らしさを担う |
| Phasmida (ナナフシ) | 15 | 12 | 11 | AU の看板分類群 |
| Odonata (トンボ) | 17 | 11 | 12 | USNM 標本が中心 |
| Mantodea (カマキリ) | 18 | 9 | 8 | |
| Orthoptera (バッタ) | 16 | 9 | 12 | 褐色のバッタが多く N 帯が単調になるため抑えた |
| Lepidoptera (チョウ・ガ) | 12 | 9 | 11 | 写真可の 10 種からほぼ全採用 |
| Hymenoptera (ハチ・アリ) | 25 | 6 | 2 | 25 種中 18 種がラベル・液浸瓶・頭部接写で落選 |
| Diptera (ハエ・カ) | 19 | 3 | 7 | ミバエとカがラベル主体で採用可が少ない |
| Trichoptera (トビケラ) | 16 | 1 | 1 | 16 種中 14 種がラベル・スライド主体 |
| 計 | 174 | 84 | 84 | |

選抜率は 174 分の 84 で 48%。オーストラリア遠征 I の落選率 13% (命名済み 97 から 84) より厳しいのは、今回は写真だけが先にあり命名前に選べるため、写真の足切りを先に通せたことによる。

## 2. レア度配分 (N 57 / R 17 / SR 7 / SSR 3)

### 2.1 SSR 3 種

| # | id | 仮称 | 学名 | 目 | 写真 id | flagship |
|---|---|---|---|---|---|---|
| 1 | anoplognathus_viridiaeneus | キンミドリコガネ | Anoplognathus viridiaeneus | Coleoptera | AMK113274 | true |
| 2 | dryococelus_australe | クロオオナナフシ | Dryococelus australe | Phasmida | AMK115660 | false |
| 3 | thopha_saccata | オオフクロゼミ | Thopha saccata | Hemiptera | WMCFileThophasaccataKirby1885png | false |

看板 Anoplognathus viridiaeneus は `volume2_rarity_frames.md` の決定記録で確定済み。原寸で実見したところ、上翅が金色、前胸と頭部が緑色の金属光沢で、後翅がわずかにのぞく。thumb サイズでも金と緑の二色が読める。更新カレンダーの「クリスマスビートル」を種まで落とした指名にあたる。

非看板 2 種の選定理由 (`docs/komorebi_rarity_standard.md` 5 章の生態的スペクタクルと知名度)。

Dryococelus australe (クロオオナナフシ)
- 生態的スペクタクル。ロードハウ島の固有種で 80 年間絶滅とされ、外海の岩峰に残った 1 株の低木から再発見された。「いなくなったはずの虫が 1 か所だけ生きていた」という筋がそのまま図鑑の 1 行になる。
- 写真。赤褐色で光沢のある大型ナナフシの完全な背面像で、脚と触角が全て揃っている。選抜 84 種の中で最も標本状態が良い部類にあたる。

Thopha saccata (オオフクロゼミ)
- 生態的スペクタクル。オーストラリア最大級のセミで、腹部側面の袋状の共鳴室から出る鳴き声は昆虫の中で最大級とされる。姿の特徴 (袋) と音の特徴が同じ器官に由来する点が説明しやすい。
- 知名度。現地でセミに愛称を付ける文化の中で通っている種で、オーストラリア遠征 I の R に入れた Psaltoda plaga (スミイロゼミ) と同じ系列にある。

SSR 3 種の目は Coleoptera / Phasmida / Hemiptera の 3 つに散っており、`docs/komorebi_rarity_standard.md` 11 章の検査 5 (2 つ以上) を満たす。

要判断 1 件。Thopha saccata の写真は Kirby 1885 のモノクロ図版である。全身像で姿勢も整っており足切りは通るが、色が無い。金色の看板と赤褐色のナナフシに並ぶ 3 枚目がモノクロになる。モノクロを巻の頂点に置くことを避けるなら、同じ Hemiptera の Aleeta curvicosta (コナフキゼミ、AMK295075、白い粉を吹いた背面のカラー写真) と入れ替える。その場合 Thopha saccata は R に落とす。

### 2.2 SR 7 種

| # | id | 仮称 | 学名 | 目 | 写真 id | 根拠 |
|---|---|---|---|---|---|---|
| 1 | castiarina_sexplagiata | ダイダイオビタマムシ | Castiarina sexplagiata | Coleoptera | WMCFileCastiarinasexplagiata247307907jpg | 黒地に橙の帯が 3 本、上翅の先が赤、頭胸が緑の金属光沢。解像も高い |
| 2 | xylotrupes_australicus | クロツノカブト | Xylotrupes australicus | Coleoptera | AMK474350 | 頭に角をもつ黒褐色のカブト。子どもに最も通じる分類群 |
| 3 | podacanthus_typhon | モモバネナナフシ | Podacanthus typhon | Phasmida | WMCFileNaturalhistoryofVictoriaPl805998830110jpg | 桃色の後翅を扇状に全開した図版。AU I の SSR ベニバネナナフシの近縁 |
| 4 | rhyothemis_graphiptera | キンモンチョウトンボ | Rhyothemis graphiptera | Odonata | USNMENT00324488 | 金色の翅に濃褐色の斑。MG I の SR スケバチョウトンボと同属 |
| 5 | cosmodes_elegans | ミドリモンヤガ | Cosmodes elegans | Lepidoptera | WMCFileCosmodeselegansfemalejpg | 暗赤色の前翅に鮮緑の紋。ガとして図鑑映えが突出する |
| 6 | phricta_spinosa | オオトゲキリギリス | Phricta spinosa | Orthoptera | WMCFileKatydidNymphPhrictaspinosa9710095299jpg | 全身が棘に覆われた大型キリギリス。形のインパクトで抜ける |
| 7 | hierodula_werneri | オオミドリカマキリ | Hierodula werneri | Mantodea | WMCFileHierodulawerneriMiddlePointNT0822AustraliaimportedfromiNaturalistphoto523873292jpg | 緑色の大型カマキリの生態写真。前脚を上げた姿勢が整っている |

SR 7 種は 6 目にまたがる。更新 5 は学習カテゴリを伴わない図鑑ドロップなので、トロフィー代表虫の予備枠としての要件 (`docs/komorebi_rarity_standard.md` 11 章の検査 4) は 3 章のカテゴリ本数で満たす。

注記 2 件。
- phricta_spinosa の写真は幼虫 (nymph) である。棘の特徴は成虫と共通するが、成虫写真が取れ次第の差し替え候補とする。
- podacanthus_typhon の写真は Natural history of Victoria の図版で、ファイル名に種小名がない。凍結前に図版の種同定を確認する (7 章)。

### 2.3 R 17 種と N 57 種

全 84 種を目ごとに列挙する。同じ目の中はレア度順。

コウチュウ目 (Coleoptera) 12 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| anoplognathus_viridiaeneus | キンミドリコガネ | Anoplognathus viridiaeneus | SSR | コガネムシ科 | AMK113274 |
| castiarina_sexplagiata | ダイダイオビタマムシ | Castiarina sexplagiata | SR | タマムシ科 | WMCFileCastiarinasexplagiata247307907jpg |
| xylotrupes_australicus | クロツノカブト | Xylotrupes australicus | SR | コガネムシ科 | AMK474350 |
| anoplognathus_montanus | アカアメイロコガネ | Anoplognathus montanus | R | コガネムシ科 | AMK672279 |
| porrostoma_rhipidium | ダイダイベニボタル | Porrostoma rhipidium | R | ベニボタル科 | WMCFilePorrostomarhipidium252903311jpg |
| paropsisterna_cloelia | クリイロマルハムシ | Paropsisterna cloelia | N | ハムシ科 | WMCFileParopsisternacloeliajpg |
| acrossidius_tasmaniae | クロガシラコガネ | Acrossidius tasmaniae | N | コガネムシ科 | WMCFileCOLEScarabaeidaeAcrossidiustasmaniaepng |
| adoryphorus_couloni | ツヤクロコガネ | Adoryphorus couloni | N | コガネムシ科 | WMCFileCOLEScarabaeidaeAdoryphoruscouloni1png |
| euoniticellus_fulvus | キイロダイコクコガネ | Euoniticellus fulvus | N | コガネムシ科 | WMCFileEuoniticellusfulvuscalwer2112jpg |
| heteronychus_arator | クロヨロイコガネ | Heteronychus arator | N | コガネムシ科 | WMCFileHeteronychusarator53065377jpg |
| onthophagus_binodis | コブムネコガネ | Onthophagus binodis | N | コガネムシ科 | WMCFileOnthophagusbinodis0012392jpg |
| onthophagus_taurus | ウシツノコガネ | Onthophagus taurus | N | コガネムシ科 | WMCFileOnthophagusPrintIconographiaZoologicaSpecialCollectionsUniversityofAmsterdamUBAINV0274001050014tif |

カメムシ目 (Hemiptera) 12 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| thopha_saccata | オオフクロゼミ | Thopha saccata | SSR | セミ科 | WMCFileThophasaccataKirby1885png |
| aleeta_curvicosta | コナフキゼミ | Aleeta curvicosta | R | セミ科 | AMK295075 |
| lyramorpha_rosea | モモイロオオカメムシ | Lyramorpha rosea | R | ミナミカメムシ科 | WMCFileLyramorpharoseaspecimendorsaljpg |
| tettigarcta_tomentosa | ケブカムカシゼミ | Tettigarcta tomentosa | R | ムカシセミ科 | AMK286866 |
| yoyetta_celis | ウスモンコゼミ | Yoyetta celis | N | セミ科 | AMK307154 |
| agonoscelis_rutila | ダイダイシマカメムシ | Agonoscelis rutila | N | カメムシ科 | WMCFileAgonoscelisrutila1632959215jpg |
| oechalia_schellenbergii | トゲカタカメムシ | Oechalia schellenbergii | N | カメムシ科 | WMCFileOechaliaschellenbergii63084710jpg |
| remaudiereana_inornatus | チャイロナガカメムシ | Remaudiereana inornatus | N | ナガカメムシ科 | NHMUKremaudiereanainornatus |
| chaetedus_longiceps | ミドリホソカスミカメ | Chaetedus longiceps | N | カスミカメムシ科 | iNatobs212731962 |
| neolethaeus_australiensis | ゴマフナガカメムシ | Neolethaeus australiensis | N | ナガカメムシ科 | WIKIPEDIAWPNeolethaeus |
| psaltoda_moerens | クロツヤゼミ | Psaltoda moerens | N | セミ科 | AMK293854 |
| tamasa_tristigma | チャイロモリゼミ | Tamasa tristigma | N | セミ科 | AMK294867 |

ナナフシ目 (Phasmida) 12 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| dryococelus_australe | クロオオナナフシ | Dryococelus australe | SSR | ナナフシ科 | AMK115660 |
| podacanthus_typhon | モモバネナナフシ | Podacanthus typhon | SR | ナナフシ科 | WMCFileNaturalhistoryofVictoriaPl805998830110jpg |
| podacanthus_keyi | アオスジナナフシ | Podacanthus keyi | R | ナナフシ科 | iNatobs269259256 |
| tropidoderus_rhodomus | アカバネナナフシ | Tropidoderus rhodomus | R | ナナフシ科 | WMCFileArthurBartholomewRedshoulderedstickinsectTropidoderusrhodomusGoogleArtProjectjpg |
| onchestus_rentzi | カンムリナナフシ | Onchestus rentzi | R | ナナフシ科 | WMCFileOnchestusrentziJPG |
| didymuria_violescens | フタイロナナフシ | Didymuria violescens | N | ナナフシ科 | WMCFileNaturalhistoryofVictoriaPl795998829322jpg |
| candovia_annulata | シマアシナナフシ | Candovia annulata | N | ナナフシ科 | iNatobs149207229 |
| candovia_granulosa | ザラハダナナフシ | Candovia granulosa | N | ナナフシ科 | WMCFileCandoviagranulosa455227903jpg |
| tropidoderus_gracilifemur | ハイバネナナフシ | Tropidoderus gracilifemur | N | ナナフシ科 | NHMUK015984059 |
| acrophylla_enceladus | ウスイロオオナナフシ | Acrophylla enceladus | N | ナナフシ科 | iNatobs241216308 |
| austrosipyloidea_carterus | クロスジホソナナフシ | Austrosipyloidea carterus | N | ナナフシ科 | iNatobs271800338 |
| sipyloidea_rentzi | ホソミドリナナフシ | Sipyloidea rentzi | N | ナナフシ科 | iNatobs137593683 |

トンボ目 (Odonata) 11 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| rhyothemis_graphiptera | キンモンチョウトンボ | Rhyothemis graphiptera | SR | トンボ科 | USNMENT00324488 |
| diphlebia_coerulescens | ルリカワトンボ | Diphlebia coerulescens | R | カワトンボ | USNMENT00328479 |
| neurothemis_stigmatizans | ベニバネトンボ | Neurothemis stigmatizans | R | トンボ科 | USNMENT00310374 |
| ictinogomphus_australis | キオビサナエ | Ictinogomphus australis | N | サナエトンボ科 | USNMENT00361309 |
| austrogomphus_guerini | キスジホソサナエ | Austrogomphus guerini | N | サナエトンボ科 | USNMENT00827225 |
| austrolestes_annulosus | ルリオビイトトンボ | Austrolestes annulosus | N | アオイトトンボ科 | USNMENT00827057 |
| diplacodes_melanopsis | クロガオヒメトンボ | Diplacodes melanopsis | N | トンボ科 | USNMENT00273648 |
| orthetrum_villosovittatum | アカハラシオカラトンボ | Orthetrum villosovittatum | N | トンボ科 | USNMENT00313961 |
| synlestes_weyersii | アカガネホソイトトンボ | Synlestes weyersii | N | イトトンボ | USNMENT00827017 |
| hemicordulia_tau | チャイロエゾトンボ | Hemicordulia tau | N | エゾトンボ科 | USNMENT00360128 |
| xanthagrion_erythroneurum | アカムネイトトンボ | Xanthagrion erythroneurum | N | イトトンボ科 | USNMENT00347647 |

カマキリ目 (Mantodea) 9 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| hierodula_werneri | オオミドリカマキリ | Hierodula werneri | SR | カマキリ科 | WMCFileHierodulawerneriMiddlePointNT0822AustraliaimportedfromiNaturalistphoto523873292jpg |
| hierodula_majuscula | モエギオオカマキリ | Hierodula majuscula | R | カマキリ科 | WMCFileHierodulamajusculaL4larvaejpg |
| paraoxypilus_verreauxii | コケハダカマキリ | Paraoxypilus verreauxii | R | カマキリ | iNatobs38703647 |
| calofulcinia_paraoxypila | キメダマカマキリ | Calofulcinia paraoxypila | N | カマキリ | WIKIPEDIAWPCalofulcinia |
| trachymantis_dentifrons | クサイロカマキリ | Trachymantis dentifrons | N | カマキリ科 | WMCFileTrachymantisdentifrons219379574jpg |
| phthersigena_conspersa | ヒメミドリカマキリ | Phthersigena conspersa | N | カマキリ | WIKIPEDIAWPPhthersigenaconspersa |
| statilia_apicalis | クロエダカマキリ | Statilia apicalis | N | カマキリ科 | iNatobs153029017 |
| ciulfina_rentzi | ホソアシカマキリ | Ciulfina rentzi | N | カマキリ | iNatobs178507505 |
| paraoxypilus_tasmaniensis | キノハダカマキリ | Paraoxypilus tasmaniensis | N | カマキリ | iNatobs261438772 |

バッタ目 (Orthoptera) 9 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| phricta_spinosa | オオトゲキリギリス | Phricta spinosa | SR | キリギリス科 | WMCFileKatydidNymphPhrictaspinosa9710095299jpg |
| torbia_viridissima | ワカバキリギリス | Torbia viridissima | R | キリギリス科 | iNatobs263616551 |
| caedicia_simplex | アオバツユムシ | Caedicia simplex | R | キリギリス科 | WMCFileCaediciasimplex30021493jpg |
| ephippitytha_trigintiduoguttata | ホシツユムシ | Ephippitytha trigintiduoguttata | N | キリギリス科 | AMK475278 |
| heteropternis_obscurella | ベニアシバッタ | Heteropternis obscurella | N | バッタ科 | AMK421415 |
| macrotona_australis | ホソチャイロバッタ | Macrotona australis | N | バッタ科 | AMK622892 |
| conocephalus_semivittatus | ミドリスジササキリ | Conocephalus semivittatus | N | キリギリス科 | iNatobs165460477 |
| austrosalomona_falcata | チャイロヤブキリ | Austrosalomona falcata | N | キリギリス科 | AMK310562 |
| caledia_captiva | クリイロバッタ | Caledia captiva | N | バッタ科 | AMK266198 |

チョウ目 (Lepidoptera) 9 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| cosmodes_elegans | ミドリモンヤガ | Cosmodes elegans | SR | ヤガ科 | WMCFileCosmodeselegansfemalejpg |
| tisiphone_abeona | ダイダイオビジャノメ | Tisiphone abeona | R | タテハチョウ科 | RMNHZMAINS5185594 |
| belenois_java | クロフチシロチョウ | Belenois java | R | シロチョウ科 | USNMENT00804513 |
| agrotis_porphyricollis | モモイロヤガ | Agrotis porphyricollis | N | ヤガ科 | iNatobs141754127 |
| uresiphita_ornithopteralis | フチグロツトガ | Uresiphita ornithopteralis | N | ツトガ科 | WMCFileUresiphitaornithopteralismaleLCRjpg |
| hellula_hydralis | ウスチャツトガ | Hellula hydralis | N | ツトガ科 | iNatobs243611931 |
| chrysodeixis_argentifera | ギンモンヤガ | Chrysodeixis argentifera | N | ヤガ科 | AMK502878 |
| persectania_ewingii | ナマリイロヤガ | Persectania ewingii | N | ヤガ科 | iNatobs322580716 |
| uraba_lugens | モエギコブガ | Uraba lugens | N | コブガ科 | WMCFileUrabalugens1jpg |

ハチ目 (Hymenoptera) 6 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| myrmecia_pyriformis | オオキバハリアリ | Myrmecia pyriformis | R | アリ科 | WMCFileMyrmeciapyriformiscasent0217501p1highjpg |
| myrmecia_nigriscapa | クロヒゲキバハリアリ | Myrmecia nigriscapa | N | アリ科 | WMCFileMyrmecianigriscapacasent0217499p1highjpg |
| camponotus_aeneopilosus | キンオビオオアリ | Camponotus aeneopilosus | N | アリ科 | WMCFileCamponotusaeneopilosus108874747jpg |
| iridomyrmex_chasei | チャイロルリアリ | Iridomyrmex chasei | N | アリ科 | WMCFileIridomyrmexchasei4jpg |
| lipotriches_australica | シロオビコハナバチ | Lipotriches australica | N | コハナバチ科 | NHMUK014025924 |
| lipotriches_flavoviridis | ミドリコハナバチ | Lipotriches flavoviridis | N | コハナバチ科 | NHMUK014025933 |

ハエ目 (Diptera) 3 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| toxorhynchites_speciosus | ルリイロオオカ | Toxorhynchites speciosus | N | カ科 | AMK341440 |
| chaetocoelopa_sydneyensis | ウスバハマベバエ | Chaetocoelopa sydneyensis | N | ハマベバエ科 | AMK546759 |
| bibio_imitator | アメイロケバエ | Bibio imitator | N | ケバエ科 | AMK522699 |

トビケラ目 (Trichoptera) 1 種

| id | 仮称 | 学名 | レア度 | 科 | 写真 id |
|---|---|---|---|---|---|
| atriplectides_dubius | チャバネトビケラ | Atriplectides dubius | N | トビケラ | NHMUK014027156 |

### 2.4 命名の方針と検証

命名は `docs/komorebi_naming_convention.md` に従った。

- 全 84 種が仮称であり、`nameStatus: "provisional"` を立てる。図鑑では「（仮称）」を添えて学名と並べる。
- 名前の形は 修飾語 + 分類群の和名。修飾語は contact sheet で確認した色・模様・形・大きさに限り、生態や英名の直訳は使っていない。
- 学名のカタカナ転写は使っていない (決定 1)。
- 全 84 名が 4 から 12 文字の範囲に収まることを機械検査した。
- 科の和名が定まらない分類群 (Nanomantidae、Lestoideidae、Synlestidae、Atriplectididae) は目または大きな群の和名 (カマキリ / カワトンボ / イトトンボ / トビケラ) で終わらせた。

機械検証の結果 (`shared/bugs.js` の全 1765 entry を突き合わせ)。

| 検査 | 結果 |
|---|---|
| 選抜数 | 84 |
| レア度内訳 | N 57 / R 17 / SR 7 / SSR 3 |
| id の bugs.js 既存 id との衝突 | 0 件 |
| 和名の bugs.js 既存和名との衝突 | 0 件 |
| ドラフト内の id 重複 | 0 件 |
| ドラフト内の和名重複 | 0 件 |
| オーストラリア遠征 I の 84 種との id 重複 | 0 件 |
| 写真 (display 画像) 未保有の選抜種 | 0 件 |
| seeds の order / family とドラフト記載の一致 | 84 件全一致 |
| 和名の長さ 4 から 12 文字 | 84 件全通過 |

写真が無い選抜種は 0 件である。選抜を写真保有 174 種の中だけで行ったため、代替の要否は発生しない。

## 3. カテゴリ帰属案

更新 5 は新しい学習カテゴリを伴わない図鑑ドロップである (`docs/komorebi_release_linkage.md` 2 章)。一方 `komorebi/app.js` の `validateVolume` は `volume.categories` が空配列だと検査で落ちるため、II 巻にも最低 1 本の帰属が要る。カレンダーの備考のとおり「他地域公開済み cat から指定」する。

制約は `docs/komorebi_volume_zukan_design.md` 4 章の「地域内で同じカテゴリは 1 つの遠征にのみ属し、帰属は変わらない」である。したがって オーストラリア遠征 I が保持する 5 本 (kom_unit_convert / kom_diagram_model / kom_kuku_ura / kom_kuku_dan3 / kom_kuku_dan4) は使えない。他地域が保持する cat を オーストラリアの panel へ持ち込むことは、地域内一意が保たれる限り規則に反しない。

推奨案。更新 4 (コスタリカ遠征 I) で出た 4 本をそのまま AU II に割り当てる。

| cat | 由来 | 割当理由 |
|---|---|---|
| kom_kuku_bridge | コスタリカ遠征 I | 更新 5 の時点で最も新しい k5 群で、まだ登り切っていない |
| kom_equation_select | コスタリカ遠征 I | 同上。k10 枠 |
| kom_kuku_dan8 | コスタリカ遠征 I | 8 の段。段カテゴリの中で定着が遅い側 |
| kom_kuku_dan9 | コスタリカ遠征 I | 9 の段。同上 |

地域内一意の検査。オーストラリアが保持する cat は AU I の 5 本 + AU II の 4 本 = 9 本で重複なし。コスタリカ側では CR I がこの 4 本を保持し続けるため、同じ cat が オーストラリア と コスタリカ の両 panel に出る。子どもは段暗唱を始めるときに「どちらの図鑑を増やすか」を選ぶことになり、`docs/komorebi_volume_zukan_design.md` 3.1 の badge の目的 (始める前に対応が分かる) とは矛盾しない。

対案。ボルネオ遠征 I 由来の 4 本 (kom_frac_flow / kom_kuku_inverse / kom_kuku_dan6 / kom_kuku_dan7) を AU II に、コスタリカ遠征 I 由来の 4 本を MG II に割り当てる入れ替え。更新 5 と 6 の間隔が短い場合は、より古い側を先に再訪させるこちらが自然になる。

## 4. 落選の代表例 (174 から 90 種を落とした根拠)

落選理由は 4 分類にまとまる。全 90 件の列挙は省き、分類ごとの代表を挙げる。

| 分類 | 件数の目安 | 代表 | 内容 |
|---|---:|---|---|
| ラベル・台紙が画面を支配 | 約 40 | Harmonia conformis (AMK362780) / Lasioglossum cognatum (NHMUK014024646) / Triplectides ciuskus (BMNHE251362) | 手書きラベル、type ラベル、barcode、スライド台紙が画面の過半を占める。トビケラ 16 種のうち 14 種、コハナバチ 8 種のうち 6 種がこれ |
| 全身像がない | 約 10 | Myrmecia pilosula / Lasioglossum urbanum | 頭部接写のみ。標本カードの原則に反する |
| 複数個体または液浸瓶 | 約 15 | Iridomyrmex purpureus (AMK383427) / Bubas bison / Onthophagus australis | 液浸瓶に多数個体、または多数種を並べた図版で単体像がない |
| 被写体が種でない | 3 | Aedes vigilax (WMCFileWuchereriabancroftiLifeCyclegif) / Ima fusca / Pseudomantis albofimbriata | 順に、フィラリア生活環の模式図、ほぼ白紙の画像、前脚の解剖線画。いずれも虫の姿が写っていない |

Aedes vigilax の card が寄生虫の生活環模式図になっている件は、写真取得工程の検査漏れである。同種の混入が他地域にもある可能性があるため、`zukan_cards/metadata` 全件に対する「画像が単一個体の標本または生態写真であること」の再検査を別途提案する。

## 5. 差し替え候補 (収録するが、より良い写真が取れ次第)

| id | 仮称 | 現画像の弱点 |
|---|---|---|
| phricta_spinosa | オオトゲキリギリス | 幼虫。成虫像へ差し替えたい |
| hierodula_majuscula | モエギオオカマキリ | L4 幼虫。同上 |
| onthophagus_taurus | ウシツノコガネ | Iconographia Zoologica の属図版で、種の同定根拠が弱い |
| neolethaeus_australiensis | ゴマフナガカメムシ | Wikipedia 属記事のモノクロ線画 |
| calofulcinia_paraoxypila | キメダマカマキリ | Wikipedia 属記事の彩色図版。近縁の Metoxypilus lobifrons の card とほぼ同一の図で、種の区別が付かないため後者は非収録とした |
| acrossidius_tasmaniae / adoryphorus_couloni | クロガシラコガネ / ツヤクロコガネ | いずれもモノクロ線画 |
| didymuria_violescens | フタイロナナフシ | 複数個体を並べた彩色図版 |

## 6. 地域 blurb

オーストラリア遠征 I の文をそのまま使う。地域 blurb は地域単位で、遠征ごとに変えない。

> 南半球の大陸。日本の 20 倍。かわいた大地とユーカリの森が広がる。

## 7. freeze 承認後の反映作業 (見積り)

オーストラリア遠征 I と同一の機械フローで進める。対象ファイルと件数は次のとおり。

| # | 対象 | 件数 | 内容 |
|---|---|---:|---|
| 1 | `shared/bugs.js` | 84 entry 新規 | 選抜 84 種は全て未登録。id / jaName / scientificName / order / family / familyJa / groupJa / renderer / colors / tags / habitat / note / nameStatus provisional / areaOnly komorebi / rarity を書く。colors は各種の写真から 2 色を取る |
| 2 | `shared/bugs.js` の renderer と groupJa | 84 件 | チョウ目 9 種はアゲハ・タテハ・シロチョウ・ガの区別を明示する (AU I で発生した一律 ga 登録の再発防止)。`refineRenderer` は明示 renderer を上書きしない |
| 3 | `zukan_config/zukan_catalog.js` | 84 entry 追記 | 現在 0 件。specimen / source / image の 3 層を `zukan_cards/metadata/*.json` から移す。display / resized / thumb54 / thumb108 / thumb216 は全種分実在済み |
| 4 | `komorebi/volumes/` の volume manifest | 1 volume | `volume_fixture_australia_2` を新規追加 (または AU 用ファイルへ分割)。species 84、denominator 84、frozen true、expedition 2、release 5、flagship は anoplognathus_viridiaeneus、categories は 3 章で確定した 4 本 |
| 5 | `komorebi/trophies.js` | 0 から 4 件 | 更新 5 は新カテゴリ 0 本なので新規トロフィーは無い。看板を代表虫の既定として参照する結線のみ確認する。3 章で他地域の cat を借りる案を採る場合、そのトロフィーの代表虫が CR I 側のままでよいかを確認する |
| 6 | `sw.js` | 3 箇所 | CACHE 名バンプ、CORE への volume ファイル追加、`?v=` バンプ |
| 7 | テスト | 6 項目 | 種数と帯の一致 / flagship 1 種かつ SSR / 看板の本編未収録 / denominator と species 長の一致 / 変態タイプ (10 目全て METAMORPHOSIS_BY_ORDER に存在) / 学名 canonical と synonym の本編・他 volume 衝突 |
| 8 | 回帰 fixture と safety check | 1 回 | `tests/` の回帰実行と commit 前の混入確認 |

作業量の目安は bugs.js 84 entry と catalog 84 entry の生成が主で、いずれも `zukan_cards/metadata/*.json` からの機械変換で作れる。手作業が残るのは colors の 2 色抽出と note の 1 行、および renderer の目視確認である。

## 8. レビューで確認したい事項

1. SSR 3 種目を Thopha saccata (モノクロ図版) のままにするか、Aleeta curvicosta (カラー写真) に差し替えるか (2.1)。
2. カテゴリ帰属をコスタリカ遠征 I 由来 4 本にするか、ボルネオ遠征 I 由来 4 本にするか (3 章)。
3. 仮称 84 件の可否。特に クロツノカブト、キンミドリコガネ、オオフクロゼミ、クロオオナナフシ の 4 件は帯が高く目に触れる回数が多い。
4. 幼虫写真 2 件 (phricta_spinosa、hierodula_majuscula) を SR / R に置くことの可否 (5 章)。
5. Aedes vigilax の card 混入を受けた `zukan_cards/metadata` 全件の再検査を、この更新と並行して回すか (4 章)。

## 承認記録

- 2026-08-18: user 承認。SSR のオオフクロゼミ (モノクロ図版) はコナフキゼミ (カラー) に入替え、オオフクロゼミは SR 帯へ。反映は deploy 解禁後の機械フローで行う。
