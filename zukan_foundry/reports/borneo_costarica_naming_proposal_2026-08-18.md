# ボルネオ遠征 I / コスタリカ遠征 I 未命名種 和名仮称提案

status: 提案レポート。bugs.js / zukan_config/zukan_catalog.js / komorebi/volumes/volume_fixture.js への反映はしない (freeze 承認前)。本ファイルの新規作成のみ。

作成日: 2026-08-18 (2026-08-18 コーディネーター指摘により修正)。対象: `zukan_foundry/reports/borneo_expedition1_freeze_draft.md`（66 種未命名）、`zukan_foundry/reports/costarica_expedition1_freeze_draft.md`（76 種未命名）。

## 0. 前提と方法

- 命名規約は `docs/komorebi_naming_convention.md` (v0.1) に従った。名前の形は「修飾語 (写真で確認できる色・模様・形、または地域名) + 分類群の和名」、全体 4〜12 文字、学名のカタカナ転写禁止、写真で確認できない生態語の使用禁止、既存和名との衝突禁止。「写真で確認できない特徴を使わない」は新しく仮称を作るときの制約であり、既に定着した標準和名・通用名の採用を妨げるものではない。
- 対象は両 draft の選抜種のうち標準和名 (nameStatus: standard) を持たない種。ボルネオ 66 種 (SSR1/SR5/R11/N49)、コスタリカ 76 種 (SSR1/SR7/R13/N55)、計 142 種を初期対象とした。英名候補 (nameStatus: english_common_candidate) であっても和名そのものは未確定のため命名対象に含めた。
- 142 種全件について、(a) draft 本文中の既存通称の言及、(b) `shared/bugs.js` 内の同一学名の別 id 登録、(c) 属レベルで日本語に定着した名 (ハキリアリ、モルフォ等) の 3 点を再確認した (再監査の詳細は 3.1 章)。この結果 Atta cephalotes 1 種が「既に定着した通用名 (ハキリアリ) を持つ」と判定され、新規仮称の提案対象から除外した。残り **141 種**が本レポートの提案対象。
- 写真の有無は、本日 (2026-08-18) 実行中のボルネオ round 1・コスタリカ round 2 の補修 fetch により `zukan_cards/_pipeline/<species_id>/emit.json` が生成され、参照先の `zukan_cards/processed/*_L2_grade.webp` が実在するかで判定した。写真ありの種は Read tool で実際に画像を確認し、色・模様・形の特徴から命名した。写真なしの種は学名 (属名・種小名の意味) と分類のみから暫定案を作り、由来欄に「(写真未確認、学名/分類からの暫定)」と明記した。
- 補修 fetch は本レポート作成中も `zukan_cards/` に書き込み続けていたため、読み取りのみ行い `git add` はしていない (下記 5 章の commit 対象はレポート本体のみ)。
- 衝突チェックは `shared/bugs.js` から正規表現で抽出した既存和名 1,765 件 (jaName 全件、コアデータ + JSON 形式の areaOnly komorebi 種を含む) と、本レポート内の両地域 141 件の提案同士を突き合わせて行った。詳細は 3 章。

写真確認の結果、`zukan_cards/_pipeline/` に emit.json はあっても実際には対象種の外見が読み取れない画像だった種が 8 種あった (標本ラベルのみの写真、無関係な図版、複数種混在の図版、種が異なる図版)。これらは「写真あり」から「写真なし」に区分を下げ、学名・分類ベースの暫定命名に切り替えた。該当種: `pyrops_sultanus`、`pyrops_intricatus`、`penthicodes_farinosa` (ボルネオ)、`argia_oenea`、`mecistogaster_modesta`、`sargus_fasciatus`、`astraptes_fulgerator`、`augocoris_gomesii`、`eurysternus_caribaeus` (コスタリカ)。

## 1. ボルネオ遠征 I (66 種)

#### SSR (1 種)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| pyrops_whiteheadi | *Pyrops whiteheadi* | ハナダビワハゴロモ（仮称） | 写真は縹色(青緑)の胸部・後翅と、橙色地に黄斑が並ぶ前翅、黒褐色の翅端を持つ。体色の縹色から命名。 | あり |

#### SR (5 種)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| neurobasis_longipes | *Neurobasis longipes* | ヒスイカワトンボ（仮称） | 頭胸部が翡翠のような金属光沢の緑色を帯びる写真の特徴から「ヒスイ」+カワトンボ | あり |
| haaniella_echinata | *Haaniella echinata* | トゲハダナナフシ（仮称） | 写真は全身が棘状の突起で覆われた濃褐色でずんぐりした体表。 | あり |
| toxodera_hauseri | *Toxodera hauseri* | エダカマキリ（仮称） | 写真は前胸が細長く伸びて小枝のように見える褐色の体形。 | あり |
| discotettix_belzebuth | *Discotettix belzebuth* | ツノヒシバッタ（仮称） | 写真で頭部付近に2本の角状突起が確認できる赤褐色でごつごつした体。 | あり |
| pulchriphyllium_mannani | *Pulchriphyllium mannani* | ウツクシコノハムシ（仮称） | 属名 Pulchriphyllium はラテン語で「美しい葉」の意 (pulcher=美しい、phyllium=葉) から修飾語「ウツクシ」とした。(写真未確認、学名/分類からの暫定) | なし |

#### R (11 種)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| kallima_sylvia | *Kallima sylvia* | ハクモンタテハチョウ（仮称） | 写真は暗褐色〜オリーブ色地の翅に白く丸みを帯びた紋が並ぶ模様、翅縁はぎざぎざ。 | あり |
| pyrops_sultanus | *Pyrops sultanus* | テイオウビワハゴロモ（仮称） | 種小名 sultanus はラテン語で「スルタン(君主)」に由来し威厳を表す意から修飾語「テイオウ」とした。割当画像は Fulgora 属 3 種混合の歴史図版で本種固有の外見根拠にならないため学名から暫定とした。(写真未確認、学名/分類からの暫定) | なし |
| pyrops_intricatus | *Pyrops intricatus* | コミイリビワハゴロモ（仮称） | 種小名 intricatus はラテン語で「入り組んだ、複雑な」の意から修飾語「コミイリ」とした。割当画像は sultanus と同一の Fulgora 属混合図版で本種固有の外見根拠にならないため学名から暫定とした。(写真未確認、学名/分類からの暫定) | なし |
| penthicodes_farinosa | *Penthicodes farinosa* | コナフキビワハゴロモ（仮称） | 種小名 farinosa はラテン語で「粉をまぶしたような」の意 (farina=小麦粉) から修飾語「コナフキ」とした。割当画像は標本ラベルのみで虫体が写っていないため学名から暫定とした。(写真未確認、学名/分類からの暫定) | なし |
| cryptotympana_aquila | *Cryptotympana aquila* | エリアカゼミ（仮称） | 写真は頭部から前胸にかけて赤橙色の帯(襟状部分)を持つ黒褐色の体、翅は褐色の翅脈。 | あり |
| pycanum_alternatum | *Pycanum alternatum* | ダンダラカメムシ（仮称） | 写真は緑色の体に橙色と黒が交互に並ぶ縞模様の側縁を持つ。 | あり |
| deroplatys_truncata | *Deroplatys truncata* | ヒラカレハカマキリ（仮称） | 写真は先端が直線的に切り落とされたような、平たい枯れ葉状の胸部の盾を持つ。 | あり |
| deroplatys_lobata | *Deroplatys lobata* | スジカレハカマキリ（仮称） | 写真は葉脈のような筋模様が目立つ、枯れ葉状の広い翅を持つ。 | あり |
| hierodula_venosa | *Hierodula venosa* | スジハカマキリ（仮称） | 写真は淡黄色で翅脈がくっきり透けて見える翅を持つ。 | あり |
| epidares_nolimetangere | *Epidares nolimetangere* | エリトゲナナフシ（仮称） | 写真は前胸(襟部)に棘状の突起が並ぶ緑褐色の体を持つ。 | あり |
| xylocopa_latipes | *Xylocopa latipes* | ニジバネバチ（仮称） | 写真は黒い体に緑・紫・橙に輝く光沢のある翅を持つ。 | あり |

#### N (49 種)

Coleoptera (10)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| liatongus_femoratus | *Liatongus femoratus* | シロテンコガネムシ（仮称） | 写真は黒褐色の体に白い斑点が一つ確認できる、脚は赤褐色。 | あり |
| onthophagus_cervicapra | *Onthophagus cervicapra* | レイヨウコガネムシ（仮称） | 種小名 cervicapra はラテン語で「シカとヤギ」を意味しインドカモシカ(ブラックバック)の学名に由来することから修飾語「レイヨウ」とした。(写真未確認、学名/分類からの暫定) | なし |
| sisyphus_thoracicus | *Sisyphus thoracicus* | アシナガコガネムシ（仮称） | 写真は体に対して非常に長く左右に張り出した脚を持つ。 | あり |
| proagoderus_watanabei | *Proagoderus watanabei* | ボルネオコガネムシ（仮称） | 種小名 watanabei は人名由来で意味的修飾語が取れないため地域名「ボルネオ」を用いた。(写真未確認、学名/分類からの暫定) | なし |
| paragymnopleurus_maurus | *Paragymnopleurus maurus* | アズキイロコガネムシ（仮称） | 写真は小豆色がかった赤褐色でドーム状の体、中央付近に小さな淡色斑点を持つ。 | あり |
| paragymnopleurus_sparsus | *Paragymnopleurus sparsus* | クロツヤコガネムシ（仮称） | 写真は光沢のある黒色で細長い楕円形の体を持つ。 | あり |
| catharsius_renaudpauliani | *Catharsius renaudpauliani* | カリマンタンコガネムシ（仮称） | 種小名 renaudpauliani は人名由来で意味的修飾語が取れないため地域名「カリマンタン」(ボルネオ島の現地名)を用いた。(写真未確認、学名/分類からの暫定) | なし |
| onthophagus_rugicollis | *Onthophagus rugicollis* | シワエリコガネムシ（仮称） | 種小名 rugicollis はラテン語で「しわのある首/襟」の意 (ruga=しわ、collis=襟・首) から修飾語「シワエリ」とした。(写真未確認、学名/分類からの暫定) | なし |
| catharsius_dayacus | *Catharsius dayacus* | サラワクコガネムシ（仮称） | 修正: 種小名 dayacus (先住民ダヤクへの言及) を直接和訳した「ダヤク」は学名のカタカナ転写に該当すると指摘され撤回。標本写真は未取得のため、seeds の地理定義 (MY サバ・サラワク州) に基づく地域名「サラワク」を修飾語とした。(写真未確認、学名/分類からの暫定) | なし |
| copris_sinicus | *Copris sinicus* | トウコガネムシ（仮称） | 種小名 sinicus はラテン語で「中国の」の意から修飾語「トウ(唐)」とした。(写真未確認、学名/分類からの暫定) | なし |

Hemiptera (3)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| megapomponia_merula | *Megapomponia merula* | ホシバネゼミ（仮称） | 写真は翅の縁に沿って黒褐色の斑点が並ぶ模様、頭部に赤みの装飾模様を持つ。 | あり |
| champaka_spinosa | *Champaka spinosa* | マダラゼミ（仮称） | 写真は褐色地に濃淡のまだら模様が入る翅と体を持つ。 | あり |
| velinus_nigrigenu | *Velinus nigrigenu* | クロヒザサシガメ（仮称） | 種小名 nigrigenu (羅: niger=黒+genu=膝、「黒い膝」の意) から「クロヒザ」+サシガメ。(写真未確認、学名/分類からの暫定) | なし |

Odonata (6)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| orthetrum_testaceum | *Orthetrum testaceum* | レンガイロトンボ（仮称） | 翅・体がれんが色を帯びた淡褐色をした写真の特徴から「レンガイロ」+トンボ | あり |
| tyriobapta_torrida | *Tyriobapta torrida* | サキグロトンボ（仮称） | 翅端が黒く縁取られている写真の特徴から「サキグロ」+トンボ | あり |
| euphaea_impar | *Euphaea impar* | アオムネカワトンボ（仮称） | 胸部が青緑色の金属光沢を帯びる写真の特徴から「アオムネ」+カワトンボ | あり |
| heliocypha_biseriata | *Heliocypha biseriata* | アシナガカワトンボ（仮称） | 脚が体に対して著しく長く伸びた写真の特徴から「アシナガ」+カワトンボ | あり |
| rhinagrion_borneense | *Rhinagrion borneense* | ハナナガカワトンボ（仮称） | 属名 Rhinagrion (希: rhis=鼻+agrion=トンボ類、「鼻の突き出たトンボ」の意) から「ハナナガ」+カワトンボ。(写真未確認、学名/分類からの暫定) | なし |
| devadatta_clavicauda | *Devadatta clavicauda* | コンボウビカワトンボ（仮称） | 種小名 clavicauda (羅: clava=こん棒+cauda=尾、「こん棒状の尾」の意) から「コンボウビ」+カワトンボ。(写真未確認、学名/分類からの暫定) | なし |

Mantodea (5)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| psychomantis_borneensis | *Psychomantis borneensis* | フチベニハナカマキリ（仮称） | 翅の縁が紅色を帯びる写真の特徴から「フチベニ」+ハナカマキリ | あり |
| helvia_cardinalis | *Helvia cardinalis* | オウゴンハナカマキリ（仮称） | 体全体が黄金〜橙褐色を呈する写真の特徴から「オウゴン」+ハナカマキリ | あり |
| odontomantis_planiceps | *Odontomantis planiceps* | ハネビロハナカマキリ（仮称） | 4枚の翅を大きく広げた写真の特徴から「ハネビロ」+ハナカマキリ | あり |
| ceratocrania_macra | *Ceratocrania macra* | ホソミハナカマキリ（仮称） | 体が細長くほっそりした写真の特徴から「ホソミ」+ハナカマキリ | あり |
| amantis_reticulata | *Amantis reticulata* | アミメカマキリ（仮称） | 広げた翅に網目状の翅脈が明瞭に見える写真の特徴から「アミメ」+カマキリ | あり |

Phasmida (5)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| aretaon_asperrimus | *Aretaon asperrimus* | アラハダナナフシ（仮称） | 全身に多数の突起・棘を持つざらついた体表の写真の特徴から「アラハダ」+ナナフシ | あり |
| haaniella_grayii | *Haaniella grayii* | トゲトゲナナフシ（仮称） | 脚・胸部に太く鋭い棘が密生する写真の特徴から「トゲトゲ」+ナナフシ | あり |
| hoploclonia_gecko | *Hoploclonia gecko* | サビイロナナフシ（仮称） | 体表が赤褐色にまだら状を呈する写真の特徴から「サビイロ」+ナナフシ | あり |
| aschiphasma_annulipes | *Aschiphasma annulipes* | ヒゲナガナナフシ（仮称） | 体長に匹敵するほど長い触角を持つ写真の特徴から「ヒゲナガ」+ナナフシ | あり |
| diesbachia_sophiae | *Diesbachia sophiae* | ボルネオナナフシ（仮称） | 属名・種小名がいずれも人名由来で意味的形容語がないため地域名(ボルネオ)を採用。(写真未確認、学名/分類からの暫定) | なし |

Orthoptera (9)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| nisitrus_vittatus | *Nisitrus vittatus* | アカメコオロギ（仮称） | 赤みを帯びた大きな複眼が目立つ写真の特徴から「アカメ」+コオロギ | あり |
| valanga_nigricornis | *Valanga nigricornis* | クロヅノバッタ（仮称） | 触角の先端が黒い写真の特徴から「クロヅノ」+バッタ | あり |
| traulia_azureipennis | *Traulia azureipennis* | コゲチャバッタ（仮称） | 体が黒褐色の焦げたような色合いをした写真の特徴から「コゲチャ」+バッタ | あり |
| xantia_borneensis | *Xantia borneensis* | アワイロキリギリス（仮称） | 体色が淡い黄褐色をした写真の特徴から「アワイロ」+キリギリス | あり |
| zulpha_perlaria | *Zulpha perlaria* | マダラキリギリス（仮称） | 体表に金褐色のまだら模様が広がる写真の特徴から「マダラ」+キリギリス | あり |
| amphibotettix_longipes | *Amphibotettix longipes* | アシナガヒシバッタ（仮称） | 後脚が体に比して長く伸びた写真の特徴から「アシナガ」+ヒシバッタ | あり |
| leptoderes_ornatipennis | *Leptoderes ornatipennis* | サキグロキリギリス（仮称） | 後翅の先端が黒褐色に縁取られた写真の特徴から「サキグロ」+キリギリス | あり |
| salomona_borneensis | *Salomona borneensis* | ボルネオキリギリス（仮称） | 属名 Salomona は人名由来、種小名 borneensis は「ボルネオの」の意のため地域名を採用。(写真未確認、学名/分類からの暫定) | なし |
| onomarchus_uninotatus | *Onomarchus uninotatus* | キミドリキリギリス（仮称） | 翅が鮮やかな黄緑色をした写真の特徴から「キミドリ」+キリギリス | あり |

Hymenoptera (4)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| vespa_tropica | *Vespa tropica* | クロズキンスズメバチ（仮称） | 頭部が黒く覆われている写真の特徴から「クロズキン」+スズメバチ | あり |
| polyrhachis_armata | *Polyrhachis armata* | トゲムネアリ（仮称） | 胸部背面に鋭い棘状突起が並ぶ写真の特徴から「トゲムネ」+アリ | あり |
| crematogaster_inflata | *Crematogaster inflata* | ダイダイオビアリ（仮称） | 頭部・腹部が黒く中央の体節が橙色に色分けされた写真の特徴から「ダイダイオビ」+アリ | あり |
| dolichoderus_thoracicus | *Dolichoderus thoracicus* | ホソアシアリ（仮称） | 体に対して細く長い脚・触角が写真で確認できることから | あり |

Diptera (4)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| bactrocera_carambolae | *Bactrocera carambolae* | コハクミバエ（仮称） | 翅が琥珀色を帯び体は黒褐色の写真から | あり |
| bactrocera_musae | *Bactrocera musae* | コガネミバエ（仮称） | 体全体が金褐色がかった色合いの写真から | あり |
| bactrocera_frauenfeldi | *Bactrocera frauenfeldi* | アワイロミバエ（仮称） | 標本写真に写る淡い乳白色の体色から | あり |
| anopheles_balabacensis | *Anopheles balabacensis* | バラバクカ（仮称） | 種小名 balabacensis (フィリピン・バラバク島に由来する地名) から。(写真未確認、学名/分類からの暫定) | なし |

Trichoptera (3)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| limnocentropus_grandis | *Limnocentropus grandis* | ナガヒゲトビケラ（仮称） | 翅より前方へ長く伸びる糸状の触角が写真で確認できることから | あり |
| cheumatopsyche_globosa | *Cheumatopsyche globosa* | マルミトビケラ（仮称） | 種小名 globosa (ラテン語で「球状の、丸い」の意) から。(写真未確認、学名/分類からの暫定) | なし |
| polymorphanisus_quadripunctatus | *Polymorphanisus quadripunctatus* | キバネトビケラ（仮称） | 翅が黄褐色を帯びる写真の色合いから | あり |

## 2. コスタリカ遠征 I (76 種未命名のうち 1 種は既存名採用のため 75 種を提案)

#### 既存名採用 (提案対象外、1 種)

看板種 Atta cephalotes は「トゲアカアリ」という新規仮称を提案していたが、コーディネーターの指摘により撤回した。ハキリアリは Atta 属 (および近縁の Acromyrmex 属) を指す既に定着した通用名であり、freeze draft 本文 (「(命名未。ハキリアリ相当)」) および `docs/komorebi_release_linkage.md` の更新カレンダーでも看板名として使われている。「写真で確認できない生態語を使わない」の規約は新規仮称を作る際の制約であり、既存の通用名採用を妨げない。

| species_id | 学名 | 採用和名 | nameStatus | 根拠 |
|---|---|---|---|---|
| atta_cephalotes | *Atta cephalotes* | ハキリアリ | standard (既存通用名の採用。仮称ではない) | freeze draft の「ハキリアリ相当」表記および更新カレンダーの看板名表記に基づき、新規命名ではなく既存通用名を採用する |

#### SR (7 種)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| caligo_atreus | *Caligo atreus* | オオメダマタテハ（仮称） | 翅裏面に大きな目玉状の斑紋が写る写真から | あり |
| choeradodis_rhombicollis | *Choeradodis rhombicollis* | ルリカマキリ（仮称） | 頭部・前胸が瑠璃色に輝く写真から | あり |
| mecistogaster_ornata | *Mecistogaster ornata* | ホソナガイトトンボ（仮称） | 極端に細く長い体と翅が写真で確認できることから | あり |
| copiphora_rhinoceros | *Copiphora rhinoceros* | ミドリツノキリギリス（仮称） | 緑色の体と頭部の角状突起が写真で確認できることから | あり |
| umbonia_crassicornis | *Umbonia crassicornis* | トゲツノゼミ（仮称） | 掲載図版(歴史的複合図譜)に描かれたとげ状に尖った前胸背の形状から | あり |
| eacles_imperialis | *Eacles imperialis* | オウゴンヤママユ（仮称） | 正面から見た体全体が黄金色を帯びる写真から | あり |
| trychopeplus_laciniatus | *Trychopeplus laciniatus* | コケイロナナフシ（仮称） | 緑褐色にまだらな体色の写真から | あり |

#### R (13 種)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| anartia_fatima | *Anartia fatima* | シロオビタテハ（仮称） | 暗色の翅を横断する白い帯模様が写真で確認できることから | あり |
| heliconius_hecale | *Heliconius hecale* | トラフタテハ（仮称） | 黒地に橙色の縞模様が写真で確認できることから | あり |
| automeris_zugana | *Automeris zugana* | ベニエリヤママユ（仮称） | 頭部後方の紅色の毛の襟状部分が写真で確認できることから | あり |
| euglossa_imperialis | *Euglossa imperialis* | ヒスイハナバチ（仮称） | 頭部・胸部が翡翠色に輝く写真から | あり |
| camponotus_sericeiventris | *Camponotus sericeiventris* | キンケアリ（仮称） | 腹部が金色の細毛で覆われている写真から | あり |
| synoeca_septentrionalis | *Synoeca septentrionalis* | コガネバネスズメバチ（仮称） | 黒藍色の体に対し翅が金褐色を帯びる写真から | あり |
| apoica_pallens | *Apoica pallens* | アメイロアシナガバチ（仮称） | 体・翅とも淡い飴色を帯びる細身の写真から | あり |
| pseudoxycheila_tarsalis | *Pseudoxycheila tarsalis* | コンジョウハンミョウ（仮称） | 体表が紺青色に輝く写真から | あり |
| hetaerina_titia | *Hetaerina titia* | ベニカワトンボ（仮称） | 翅の基部が紅色を帯びる写真から | あり |
| libellula_herculea | *Libellula herculea* | コハクトンボ（仮称） | 翅全体が琥珀色を帯びる写真から | あり |
| pseudovates_chlorophaea | *Pseudovates chlorophaea* | コエダツノカマキリ（仮称） | 小枝のような褐色の細長い体と頭部の角状突起が写真で確認できることから | あり |
| acanthops_godmani | *Acanthops godmani* | トゲカマキリ（仮称） | 属名 Acanthops (ギリシャ語で「とげのある外観」の意) から。(写真未確認、学名/分類からの暫定) | なし |
| lirometopum_coronatum | *Lirometopum coronatum* | カンムリキリギリス（仮称） | 頭部が冠状に大きく張り出す写真の特徴 (種小名 coronatum も「冠状の」の意) から「カンムリ」+キリギリス | あり |

#### N (55 種)

Lepidoptera (1)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| astraptes_fulgerator | *Astraptes fulgerator* | イナズマセセリ（仮称） | 属名 Astraptes (ギリシャ語「稲妻」) + 種小名 fulgerator (ラテン語「閃光を放つもの」) の意味から。(写真未確認、学名/分類からの暫定) | なし |

Hymenoptera (5)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| wasmannia_auropunctata | *Wasmannia auropunctata* | コハクアリ（仮称） | 写真で艶のある琥珀色〜黄褐色の体色を確認 | あり |
| trigona_fulviventris | *Trigona fulviventris* | ケブカクロバチ（仮称） | 写真で黒褐色の体に密な体毛が確認できる | あり |
| ectatomma_ruidum | *Ectatomma ruidum* | カギアゴアリ（仮称） | 写真で黒褐色の艶のある体と鉤状に湾曲した大顎の形を確認 | あり |
| bombus_ephippiatus | *Bombus ephippiatus* | キンケバチ（仮称） | 写真で金褐色〜黄褐色の密な体毛を確認 | あり |
| polistes_instabilis | *Polistes instabilis* | チャスジアシナガバチ（仮称） | 写真で茶褐色の体に黄褐色の縦条模様、細身の体形を確認 | あり |

Orthoptera (7)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| abracris_flavolineata | *Abracris flavolineata* | キスジバッタ（仮称） | 写真で褐色の体側面に淡黄色の縦条を確認 | あり |
| neoconocephalus_triops | *Neoconocephalus triops* | エンスイキリギリス（仮称） | 頭部が円錐状に尖った写真の特徴から「エンスイ」+キリギリス | あり |
| mimetica_incisa | *Mimetica incisa* | カレハキリギリス（仮称） | 写真で枯れ葉そっくりの褐色と葉脈状の模様、葉形の翅を確認 | あり |
| chromacris_trogon | *Chromacris trogon* | ルリアシバッタ（仮称） | 写真で鮮やかな緑色の体と瑠璃色の脚を確認 | あり |
| copiphora_cultricornis | *Copiphora cultricornis* | ケンヅノキリギリス（仮称） | 属名 Copiphora (「剣を持つもの」の意) + 種小名 cultricornis (「刃物状の角」の意) から。(写真未確認、学名/分類からの暫定) | なし |
| philophyllia_guttulata | *Philophyllia guttulata* | クロホシキリギリス（仮称） | 写真で黒緑色の葉形の体と頭部付近の小さな斑点を確認 | あり |
| pycnopalpa_bicordata | *Pycnopalpa bicordata* | フタツボシキリギリス（仮称） | 写真で胸部にある対になったハート状の緑色斑紋を確認 | あり |

Hemiptera (8)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| hortensia_similis | *Hortensia similis* | アミメヨコバイ（仮称） | 写真で黄緑色の体と頭部の網目状の黒い模様を確認 | あり |
| chlorogonalia_coeruleovittata | *Chlorogonalia coeruleovittata* | アオスジヨコバイ（仮称） | 種小名 coeruleovittata (ラテン語「青い筋のある」の意) から。(写真未確認、学名/分類からの暫定) | なし |
| mahanarva_costaricensis | *Mahanarva costaricensis* | フタオビアワフキムシ（仮称） | 写真で黒色の体に2本の淡黄色の横帯を確認 | あり |
| prosapia_simulans | *Prosapia simulans* | マダラアワフキムシ（仮称） | 写真で赤褐色地に濃淡の斑模様を確認 | あり |
| orsilochides_variabilis | *Orsilochides variabilis* | サラサキンカメムシ（仮称） | 写真で黒赤橙色の複雑な更紗模様を確認 | あり |
| augocoris_gomesii | *Augocoris gomesii* | ヒカリキンカメムシ（仮称） | 属名 Augocoris (ギリシャ語「輝く虫」の意) から。(写真未確認、学名/分類からの暫定) | なし |
| dysdercus_bimaculatus | *Dysdercus bimaculatus* | フタホシベニカメムシ（仮称） | 写真で橙赤色の体と翅膜部の2つの黒斑を確認 | あり |
| graphocephala_albomaculata | *Graphocephala albomaculata* | シロブチヨコバイ（仮称） | 種小名 albomaculata (ラテン語「白斑のある」の意) から。(写真未確認、学名/分類からの暫定) | なし |

Coleoptera (7)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| canthidium_aurifex | *Canthidium aurifex* | オウゴンコガネムシ（仮称） | 種小名 aurifex (ラテン語「金細工師」の意、金色を示唆) から。(写真未確認、学名/分類からの暫定) | なし |
| cyclocephala_lunulata | *Cyclocephala lunulata* | ミカヅキコガネムシ（仮称） | 写真で光沢のある褐色の体と三日月形の淡色斑を確認 | あり |
| copris_lugubris | *Copris lugubris* | クロツノコガネムシ（仮称） | 写真でつや消しの黒色の体と頭部の角状突起を確認 | あり |
| cephaloleia_belti | *Cephaloleia belti* | ベニカシラハムシ（仮称） | 写真で紅色の頭部と黒緑色に淡条の入った体を確認 | あり |
| dichotomius_satanas | *Dichotomius satanas* | カギヅノコガネムシ（仮称） | 写真で黒色の体と前方に湾曲した鉤状の角を確認 | あり |
| chelobasis_perplexa | *Chelobasis perplexa* | クロオビハムシ（仮称） | 写真で橙黄色の体に2本の黒い横帯模様を確認 | あり |
| eurysternus_caribaeus | *Eurysternus caribaeus* | カリブコガネムシ（仮称） | 種小名 caribaeus (「カリブ海の」の意、地域名) から。(写真未確認、学名/分類からの暫定) | なし |

Odonata (7)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| orthemis_discolor | *Orthemis discolor* | サビイロトンボ（仮称） | 写真で赤褐色(錆色)の胴部と透明な翅を確認 | あり |
| erythrodiplax_funerea | *Erythrodiplax funerea* | クロバネトンボ（仮称） | 標本写真で翅の基部から中央にかけて黒褐色の斑紋が広がり、体全体も黒っぽいことから「クロバネ」+トンボ | あり |
| hetaerina_occisa | *Hetaerina occisa* | ムネアカカワトンボ（仮称） | 胸部が鮮やかな紅色を帯びる写真の特徴から「ムネアカ」+カワトンボ | あり |
| erythemis_peruviana | *Erythemis peruviana* | サビオトンボ（仮称） | 標本写真で胸部が黒っぽく腹部(尾)が赤褐色のさび色を帯びることから「サビオ」+トンボ | あり |
| gynacantha_nervosa | *Gynacantha nervosa* | アメイロヤンマ（仮称） | 標本写真で体・翅全体が飴色(黄褐色)に見えることから「アメイロ」+ヤンマ | あり |
| argia_oenea | *Argia oenea* | ブドウイロイトトンボ（仮称） | 提供画像は標本ラベルのみで虫体が確認できず。種小名 oenea はギリシャ語 oinos(葡萄酒)に由来し「葡萄酒色」の意であることから「ブドウイロ」+イトトンボ。(写真未確認、学名/分類からの暫定) | なし |
| mecistogaster_modesta | *Mecistogaster modesta* | ナガオイトトンボ（仮称） | 提供画像は標本ラベルのみで虫体が確認できず。属名 Mecistogaster はギリシャ語 mekistos(最も長い)+gaster(腹)で「最も長い腹部」を意味することから「ナガオ」+イトトンボ。(写真未確認、学名/分類からの暫定) | なし |

Mantodea (6)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| vates_pectinicornis | *Vates pectinicornis* | クシヒゲカマキリ（仮称） | 種小名 pectinicornis はラテン語 pecten(櫛)+cornis(角/触角)で「櫛状の触角」を意味することから「クシヒゲ」+カマキリ。(写真未確認、学名/分類からの暫定) | なし |
| liturgusa_maya | *Liturgusa maya* | モクメカマキリ（仮称） | 標本写真で翅・体表に木目状の褐色まだら模様が見えることから「モクメ」+カマキリ | あり |
| stagmomantis_carolina | *Stagmomantis carolina* | ワライロカマキリ（仮称） | 標本写真で体・翅全体が淡い藁色(黄褐色)を帯びることから「ワライロ」+カマキリ | あり |
| macromantis_hyalina | *Macromantis hyalina* | クビワカマキリ（仮称） | 標本写真で鮮やかな緑色の体に対し首元(前胸背)付近が赤褐色の帯状斑になっていることから「クビワ」+カマキリ | あり |
| stagmatoptera_biocellata | *Stagmatoptera biocellata* | メダマカマキリ（仮称） | 標本写真で後翅のピンクと緑の鮮やかな配色の中に目玉状の斑紋が見えることから「メダマ」+カマキリ | あり |
| tithrone_roseipennis | *Tithrone roseipennis* | サンゴバネカマキリ（仮称） | 標本写真で翅がサンゴ色(橙がかった桃色)に染まることから「サンゴバネ」+カマキリ | あり |

Phasmida (5)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| pseudophasma_unicolor | *Pseudophasma unicolor* | キンイロナナフシ（仮称） | 標本写真で体全体が金褐色で統一されていることから「キンイロ」+ナナフシ | あり |
| oncotophasma_martini | *Oncotophasma martini* | カギナナフシ（仮称） | 属名 Oncotophasma はギリシャ語 onkos(かぎ状の突起/こぶ)+phasma(幻影)に由来することから「カギ」+ナナフシ。(写真未確認、学名/分類からの暫定) | なし |
| prisopus_biolleyi | *Prisopus biolleyi* | ノコアシナナフシ（仮称） | 属名 Prisopus はギリシャ語 prion(鋸)+pous(脚)で「鋸状の脚」を意味することから「ノコアシ」+ナナフシ。(写真未確認、学名/分類からの暫定) | なし |
| metriophasma_diocles | *Metriophasma diocles* | アミメナナフシ（仮称） | 標本写真で翅に網目状の褐色まだら模様が見えることから「アミメ」+ナナフシ | あり |
| pterinoxylus_speciosus | *Pterinoxylus speciosus* | ハナヤカナナフシ（仮称） | 種小名 speciosus はラテン語で「華やかな、見栄えのする」の意であることから「ハナヤカ」+ナナフシ。(写真未確認、学名/分類からの暫定) | なし |

Diptera (5)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| ornidia_obesa | *Ornidia obesa* | ルリイロハナアブ（仮称） | 標本写真で体表が瑠璃色の金属光沢を帯びることから「ルリイロ」+ハナアブ | あり |
| sargus_fasciatus | *Sargus fasciatus* | シマミズアブ（仮称） | 提供画像が本種と無関係な図版(魚類の図版)で虫体が確認できず。種小名 fasciatus はラテン語で「帯状の、縞模様の」の意であることから「シマ」+ミズアブ。(写真未確認、学名/分類からの暫定) | なし |
| cochliomyia_macellaria | *Cochliomyia macellaria* | アオクロバエ（仮称） | 標本写真で体表が青緑色の金属光沢を帯びることから「アオ」+クロバエ | あり |
| scione_maculipennis | *Scione maculipennis* | ブチバネアブ（仮称） | 種小名 maculipennis はラテン語 macula(斑点)+pennis(翅)で「斑点のある翅」を意味することから「ブチバネ」+アブ。(写真未確認、学名/分類からの暫定) | なし |
| palpada_agrorum | *Palpada agrorum* | トラフハナアブ（仮称） | 標本写真で腹部に黒と橙黄色の縞模様(虎斑)が見えることから「トラフ」+ハナアブ | あり |

Trichoptera (4)

| species_id | 学名 | 提案和名（仮称） | 由来 | 写真の有無 |
|---|---|---|---|---|
| atopsyche_majada | *Atopsyche majada* | キミョウトビケラ（仮称） | 属名 Atopsyche はギリシャ語 atopos(奇妙な、場違いな)+psyche に由来することから「キミョウ」+トビケラ。(写真未確認、学名/分類からの暫定) | なし |
| leptonema_albovirens | *Leptonema albovirens* | アオジロトビケラ（仮称） | 種小名 albovirens はラテン語 albus(白い)+virens(緑がかった)で「白緑色の」を意味することから「アオジロ」+トビケラ。(写真未確認、学名/分類からの暫定) | なし |
| helicopsyche_incisa | *Helicopsyche incisa* | ラセントビケラ（仮称） | 属名 Helicopsyche はギリシャ語 helix(螺旋)に由来し「螺旋」を意味することから「ラセン」+トビケラ。(写真未確認、学名/分類からの暫定) | なし |
| nectopsyche_punctata | *Nectopsyche punctata* | シロバネトビケラ（仮称） | 標本写真で翅が乳白色〜淡黄褐色で白っぽく見えることから「シロバネ」+トビケラ | あり |

## 3. 衝突検査・再監査

### 3.1 既存名の再監査 (コーディネーター指摘による再検査)

142 種全件について、既に標準和名・通用名が存在しないかを次の 3 観点で再確認した。

- (a) draft 本文中の既存通称の言及: 両 freeze draft 全文を「相当」で検索した。ヒットしたのは Atta cephalotes の「(命名未。ハキリアリ相当)」1 件のみ (他のヒットはドクチョウ類・タマムシ類の *追加候補* に関する記述で対象種の名称ではない)。
- (b) `shared/bugs.js` 内の同一学名の別 id 登録: 142 種の学名で `scientificName` を全件照合 (1,765 件をパース)。**完全一致は 0 件**。142 種はいずれも bugs.js に別 id で既に登録されている種ではなかった。
- (c) 属レベルで日本語に定着した名: 142 種の属名で bugs.js の既存属を照合したところ、Kallima (→コノハチョウ)、Deroplatys (→カレハカマキリ)、Caligo (→フクロウチョウ)、Xylocopa (→クマバチ)、Polyrhachis (→トゲアリ) など複数の属で既存の特定種の標準和名がヒットしたが、これらはいずれも「別の特定の実在種の標準和名」であり、規約 (してはならないこと 4) によりそのまま流用できないため提案対象からは外さなかった (元の提案名はこれらの既存名と非同一であることを確認済み)。Atta (→ハキリアリ) のみ、特定の 1 種の標準和名ではなく属 (近縁の Acromyrmex を含む集団) を指す通用名として draft 自体が言及しており、かつ更新カレンダーの看板表記とも一致するため、既存名採用として提案対象から除外した。

再監査の結果、**提案対象から除外したのは Atta cephalotes 1 種のみ**。他 141 種は (a)(b)(c) いずれにも該当せず、新規仮称の提案が妥当と判断した。

### 3.2 衝突検査 (修正後)

- 既存和名: `shared/bugs.js` から `jaName` を正規表現で全件抽出した 1,765 件の一意な和名一覧に対し、本レポートの提案 **141 件**を突き合わせ、**完全一致の衝突は 0 件**だった。採用した既存名「ハキリアリ」(Atta cephalotes) も 1,765 件中に無いことを確認済み (対象種自身が bugs.js に未登録のため衝突しない)。
- 地域間の突合: ボルネオとコスタリカを同一の 141 件プールとして突き合わせた結果、初回集計で以下 5 組・10 種が完全一致していた。いずれも別の写真根拠に基づき修飾語を変更して解消し、最終的に 141 件全てが一意になった。

| 旧提案名 (重複) | 該当種 A | 該当種 B | 解消後の名前 |
|---|---|---|---|
| アシナガカワトンボ | neurobasis_longipes (ボルネオ SR) | heliocypha_biseriata (ボルネオ N) | neurobasis_longipes → ヒスイカワトンボ |
| クロバネトンボ | tyriobapta_torrida (ボルネオ N) | erythrodiplax_funerea (コスタリカ N) | tyriobapta_torrida → サキグロトンボ |
| キミドリキリギリス | onomarchus_uninotatus (ボルネオ N) | lirometopum_coronatum (コスタリカ R) | lirometopum_coronatum → カンムリキリギリス |
| ミドリツノキリギリス | copiphora_rhinoceros (コスタリカ SR) | neoconocephalus_triops (コスタリカ N) | neoconocephalus_triops → エンスイキリギリス |
| ベニカワトンボ | hetaerina_titia (コスタリカ R) | hetaerina_occisa (コスタリカ N) | hetaerina_occisa → ムネアカカワトンボ |

- 文字数チェック: 141 件全てが 4〜12 文字の範囲内。採用名「ハキリアリ」は既存通用名のため文字数制約 (新規仮称向け) の対象外。
- 末尾チェック: 141 件全てが分類群の和名 (科の通称、無ければ目・大群の通称) で終わっている。
- カタカナ転写チェック: 目視で全件確認し、学名の音をそのまま転写した例は無い。地域名 (ボルネオ、カリマンタン、カリブ、バラバク、サラワク) は規約が認める「地域名」修飾語として使用した。`catharsius_dayacus` の「ダヤク」は種小名の直訳的転写と判断され撤回し、「サラワク」に差し替えた (4 章 2 参照)。

## 4. 特記事項・要確認事項

1. **写真判読不能で暫定名に切り替えた種 (8 種)**: 上記 0 章に記載の 8 種は emit.json 上は「写真あり」でも、実際の画像がラベルのみ・無関係な図版・複数種混合図版だったため、学名/分類ベースの暫定名に区分を下げた。今後の refetch で正しい標本写真が確保され次第、命名の再確認が必要。
2. **Catharsius dayacus の修正**: 初版の「ダヤク」(種小名 dayacus の直訳) は学名のカタカナ転写に該当すると指摘され撤回した。本種は標本写真が未取得のため (`zukan_cards/_pipeline/catharsius_dayacus/` 自体が存在しない)、写真に基づく再命名はできず、seeds の地理定義 (MY サバ・サラワク州) による地域名「サラワク」に差し替えた「サラワクコガネムシ」を暫定案とした。写真確保後の再確認が必要。
3. **看板種 Atta cephalotes の修正**: 初版で提案した「トゲアカアリ」(写真ベースの新規仮称) は規約の誤適用だったため撤回した。ハキリアリは Atta 属を指す既に定着した通用名であり、freeze draft・更新カレンダー双方で既に使われている。2 章の「既存名採用」表のとおり、nameStatus は provisional ではなく standard 扱いとして扱う。
4. **写真未確認 (学名/分類のみからの暫定) の種数**: ボルネオ 17 種、コスタリカ 19 種、計 36 種 (Atta cephalotes は写真確認済みで既存名採用のため提案対象から外れたが、この内訳には影響しない)。これらは freeze 前に標本写真の確保・実見が必須。

## 5. 今後の反映手順 (freeze 承認後、本レポートの対象外)

命名確定後は `docs/komorebi_naming_convention.md` 4 章の手順 (colors 決定、nameStatus: provisional 設定) を経て `shared/bugs.js` の areaOnly komorebi 種として登録する。本レポート自体はコード・カタログに一切反映しない。
