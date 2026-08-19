# 図鑑カード画像内容検査 round1-3 (2026-08-18)

## 概要

2026-08-18 に実施された3回の fetch round (round1: zukan_foundry/rounds/2026-08-18/run.log、round2 CR I: 同ディレクトリの batch_165736.log、補修round: 同 batch_192205.log。いずれも zukan_foundry/rounds/2026-08-18_r2/run.log・repair.log から実体のログファイルを特定した) で成功 (ok) と記録された species_id を全ログから抽出し、重複を除いた実体は次の通り。

| round | ログ上の成功件数 | 内容 |
|---|---:|---|
| round1 | 86 / 140 処理 | au_refetch・borneo_w1-5・mg_refetch・mg_w1-2 (164種対象) |
| round2 CR I | 78 / 84 処理 | コスタリカ遠征I 優先順リスト84種 |
| 補修 (au2_repair + published_repair + honpen_repair) | 46 / 62 処理 (56件 --refetch-ids 強制 + 前段CR Iの残り6件) | costarica_expedition1_freeze_draft.md 承認済み84種のうちCR I残分、および au_expedition2/card_image_inspection_2026-08-18.md で除外された種の再取得 |
| 合計 (重複なし) | 210 | round1・CR I・補修の3集合は species_id レベルで完全に排他 (重複ゼロ)。マニフェスト上は au_refetch と au2_repair のように対象種が重なるが、round1側は該当種が軒並み discover 失敗 (54件のうちに含まれる) または既存カードとしてスキップされており、成功実体としての重複は生じていない |

これら210件に対応する zukan_cards/processed/*_L2_grade.webp を検品対象とした。検品方法は zukan_foundry/reports/card_image_inspection_2026-08-18.md と同一 (各画像を目視し、対応する metadata の species_id・学名・和名・institution と突き合わせて OK / 幼虫・蛹 / 別種の疑い / 種でない / 画質不良 の5区分で判定)。画像の目視は6並列のサブエージェントによるバッチ検査 (169件) と、担当者自身による個別検査 (SSR級6種＋補修roundの新旧比較10件) を組み合わせて全件を網羅した。

catalog.js・bugs.js・volume manifest への反映はfreeze承認前のため行っていない。zukan_cards/ 以下も一切変更していない (読み取り専用)。

## 1. 検査総数サマリー

検査に先立ち、210件のうち31件は zukan_cards/metadata または zukan_cards/processed に実体ファイルが存在せず、目視検査自体が不可能だった (詳細は次節)。残り179件を実際に検品した。

| round | ログ上の成功 | ファイル消失で検査不能 | 検品実施 | OK | 非OK |
|---|---:|---:|---:|---:|---:|
| round1 | 86 | 5 | 81 | 64 | 17 |
| round2 CR I | 78 | 7 | 71 | 50 | 21 |
| 補修 | 46 | 19 | 27 | 2 | 25 |
| 合計 | 210 | 31 | 179 | 116 | 63 |

非OK 63件の内訳: 種でない 44、画質不良 13、別種の疑い 3、幼虫・蛹 3。

補修round (46件) は、対象自体がもともと「品質問題または誤参照バグの是正」であったにもかかわらず、検品実施27件のうち非OKが25件 (93%) を占め、OKはわずか2件 (onthophagus_taurus、neomantis_australis) にとどまった。加えて46件中19件 (41%) はファイル消失により検査すら不能だった。補修roundは今回のfreeze対象としては機能しておらず、後述のパイプライン欠陥の是正が先決である。

## 2. 重大な基盤問題: パイプラインバグによる画像ファイル消失 (31件)

### 2.1 事象と根本原因

31件はログ上「ok」と記録されているにもかかわらず、zukan_cards/metadata・zukan_cards/processed のいずれにも実体ファイルが存在せず、目視検査ができなかった。全件について zukan_cards/_archive/refetch/ 以下を調査した結果、単一の根本原因に起因することを確認した。

補修round (batch_192205.log) の「旧カードをarchiveへ退避してから新カードで上書きする」処理が、対象種自身の旧accessionだけでなく、同時点でライブディレクトリに存在する他の全ファイルまで、accessionの接頭辞 (例: `WIKIPEDIAWP*`、`WMCFilejpg*` のようなsource由来の広いprefix) でマッチさせて一括で退避してしまっている。これにより、意図しない副作用が2パターンで発生した。

1. 広域巻き込み型。kiboshi_kuro_hishibatta の補修実行時、`WIKIPEDIAWP` prefixを持つ現存ライブファイルが46種分・264ファイル、丸ごと `zukan_cards/_archive/refetch/kiboshi_kuro_hishibatta/` へ退避された。この46種には、round1・CR Iで直前までに正常に取得されていた pulchriphyllium_mannani、rhinagrion_borneense、anopheles_balabacensis 等13種と、au2_repair直後に取得されたばかりの calofulcinia_paraoxypila が含まれる。
2. ドミノ連鎖型。続けて処理された honpen_repair の一連の種 (akahane_mushi → amami_shika_kuwagata → ao_kamikiri → beni_bekkoubachi → ooki_no_komushi → ranran_hana_kamakiri_dummy → tokara_nokogiri_kuwagata → yaeyama_koku_kuwagata → yaeyama_nokogiri_kuwagata → yakushima_noko_kuwagata) は、それぞれの補修実行時に「直前の種が処理直後に書き込んだばかりのライブファイル」を巻き込んで自分のarchiveフォルダへ退避してしまい、結果として処理順で1つ前の種のライブカードが常に消失するドミノ現象が発生した。suji_kuwagata・akamadara_hanamuguri・hiroobi_midorishijimi・oohikage_janome・oni_kuwa_kamikiri・yamato_batta の6種は、この巻き込みが自分自身の新規ファイルにも及び (同一の広いprefixを共有する自分の新ファイルまで一緒に退避)、ライブに何も残らなかった。

この結果、metadata自体が消失した25種と、metadataは残るがprocessed画像ファイルのみ消失した6種、計31種が現在ライブでは完全に閲覧不能になっている。archiveフォルダには消失したファイルの実体 (metadata・processed webp含む) がほぼそのまま残存しているため、復旧自体は容易だが、対象種を正しく特定して個別に戻す必要がある。

### 2.2 kiboshi_kuro_hishibatta 自身も未解消

補修roundの発端となった kiboshi_kuro_hishibatta (キボシクロヒシバッタ。当初は zukan_config/zukan_catalog.js がマダガスカルオオタガメの写真を誤参照していたバグ) 自身も、今回の再取得結果を archive 内 (`zukan_cards/_archive/refetch/kiboshi_kuro_hishibatta/processed/WIKIPEDIAWP_b00e34de_L2_grade.webp`、ドミノ連鎖で akahane_mushi 側にも metadata の残骸あり) から確認したところ、Wikipedia由来のカニ9種を3×3グリッドに並べた図版であり、バッタとは無関係な内容のままだった。前回の誤参照 (Wikipediaの「カニ」記事を参照) と現象が酷似しており、種名からのsource discoveryロジック自体に依然として問題が残っている可能性が高い。単純な再fetchの繰り返しでは同じ結果に収束すると見られ、discoveryクエリの見直しが必要。

### 2.3 消失31件の一覧

| species_id | 学名 | round | 消失accession | 消失の型 |
|---|---|---|---|---|
| pulchriphyllium_mannani | Pulchriphyllium mannani | round1 | WIKIPEDIAWPPulchriphyllium | metadataごと消失 |
| rhinagrion_borneense | Rhinagrion borneense | round1 | WIKIPEDIAWPRhinagrion | metadataごと消失 |
| anopheles_balabacensis | Anopheles balabacensis | round1 | WIKIPEDIAWPAnophelesbalabacensis | metadataごと消失 |
| velinus_nigrigenu | Velinus nigrigenu | round1 | WIKIPEDIAWPVelinus | metadataごと消失 |
| pyrops_sidereus | Pyrops sidereus | round1 | WIKIPEDIAWPPyrops | metadataごと消失 |
| acanthops_godmani | Acanthops godmani | CR I | WIKIPEDIAWPAcanthops | metadataごと消失 |
| leptonema_albovirens | Leptonema albovirens | CR I | WIKIPEDIAWPLeptonemacaddisfly | metadataごと消失 |
| scione_maculipennis | Scione maculipennis | CR I | WIKIPEDIAWPScionefly | metadataごと消失 |
| graphocephala_albomaculata | Graphocephala albomaculata | CR I | WIKIPEDIAWP_4719848f | metadataごと消失 |
| vates_pectinicornis | Vates pectinicornis | CR I | WIKIPEDIAWPListofmantisgeneraandspecies_bd7485d5 | metadataごと消失 |
| oncotophasma_martini | Oncotophasma martini | CR I | WIKIPEDIAWP_5eca4850 | metadataごと消失 |
| prisopus_biolleyi | Prisopus biolleyi | CR I | WIKIPEDIAWPPrisopus | metadataごと消失 |
| calofulcinia_paraoxypila | Calofulcinia paraoxypila | 補修 (au2_repair) | WIKIPEDIAWPCalofulcinia | metadataごと消失 |
| kiboshi_kuro_hishibatta | Oxytettix arius | 補修 (published_repair) | WIKIPEDIAWP_b00e34de | metadataごと消失 (archiveにカニ図版が残存、内容自体も未解決) |
| akahane_mushi | Pseudopyrochroa rufula | 補修 (honpen_repair) | WIKIPEDIAWP_6feca9a7 | metadataごと消失 |
| amami_shika_kuwagata | Rhaetulus recticornis | 補修 (honpen_repair) | WIKIPEDIAWPRhaetulus | metadataごと消失 |
| ao_kamikiri | Schwarzerium quadricolle | 補修 (honpen_repair) | WIKIPEDIAWP_b99d34d9 | metadataごと消失 |
| beni_bekkoubachi | Cyphononyx confluens | 補修 (honpen_repair) | WIKIPEDIAWP_f24add6d | metadataごと消失 |
| ooki_no_komushi | Encaustes praenobilis | 補修 (honpen_repair) | WIKIPEDIAWP_69cecdc4 | metadataごと消失 |
| ranran_hana_kamakiri_dummy | Phyllothelys werneri | 補修 (honpen_repair) | WIKIPEDIAWP_90cb0af7 | metadataごと消失 |
| tokara_nokogiri_kuwagata | Prosopocoilus dissimilis elegans | 補修 (honpen_repair) | WIKIPEDIAWP_397da139 | metadataごと消失 (yakushima_noko_kuwagataとaccession衝突) |
| yaeyama_koku_kuwagata | Dorcus amamianus yaeyamaensis | 補修 (honpen_repair) | WIKIPEDIAWP_43565d14 | metadataごと消失 |
| yaeyama_nokogiri_kuwagata | Prosopocoilus pseudodissimilis | 補修 (honpen_repair) | WIKIPEDIAWP_cd9a977a | metadataごと消失 |
| yakushima_noko_kuwagata | Prosopocoilus inclinatus yakushimaensis | 補修 (honpen_repair) | WIKIPEDIAWP_397da139 | metadataごと消失 (tokara_nokogiri_kuwagataとaccession衝突) |
| himekimadara_seseri | Ochlodes ochracea | 補修 (honpen_repair) | WMCFileRhopaloceranihonicaBHL22784764jpg | metadataごと消失。同accessionは現在 hime_kijanome に紐づき、内容は「ちょうちょ図譜」型複合プレート (§4.1参照) |
| akamadara_hanamuguri | Anthracophora rusticola | 補修 (honpen_repair) | WMCFileGeorgiyJacobsonBeetlesRussiaandWesternEuropeplate32jpg_87fd4b67 | 画像ファイルのみ消失 (旧新とも甲虫30種混在プレートで内容不変、§4参照) |
| hiroobi_midorishijimi | Favonius cognatus | 補修 (honpen_repair) | WMCFileFavoniusP1020551jpg_d4e65de8 | 画像ファイルのみ消失 (旧新とも蝶24種混在プレートで内容不変) |
| oohikage_janome | Ninguta schrenckii | 補修 (honpen_repair) | WMCFileRhopaloceranihonicaBHL22784764jpg_270daf2b | 画像ファイルのみ消失 (旧新とも蝶28種混在の歴史図版で内容不変) |
| oni_kuwa_kamikiri | Megopis sinica | 補修 (honpen_repair) | WMCFileDeadbodyofsawyerbeetle2jpg_d2682e73 | 画像ファイルのみ消失 (旧新とも単一個体写真で内容自体は良好、§4参照) |
| suji_kuwagata | Dorcus striatipennis | 補修 (honpen_repair) | WMCFilejpg_1a8d6d8b | 画像ファイルのみ消失 (旧: ぼやけた個体 → 新: 鮮明な背面個体写真。復旧すれば有効なカードになる、§4参照) |
| yamato_batta | Epacromius japonicus | 補修 (honpen_repair) | WIKIPEDIAWP_1cee960c | 画像ファイルのみ消失。archive内容は無関係な昆虫6種 (蚊・ゾウムシ・カメムシ・ケラ・ガ・ハチ) を2×3グリッドに並べた合成画像で、バッタは一切写っていない。復旧しても不合格 (§4参照) |

補修roundは対象26種 (au2_repair 8 + published_repair 1 + honpen_repair 17、うち kiboshi_kuro_hishibatta は published_repair の1件) にわたって影響しており、round1・CR Iの巻き込み被害 (12種) と合わせて計31種のライブ画像が現在存在しない。これはfreeze承認前の段階で発見されたため現行の公開catalogには影響していないが、次のfetch/repair実行前に必ず修正すべき最優先の技術的負債である。

## 3. 非OKの全件表 (63件)

判定根拠は画像内容とmetadataの突き合わせによる。round列は round1 / CR I (round2 CR I) / 補修 のいずれか。

| species_id | 学名 | 和名 | round | 判定 | 根拠 | 推奨処置 |
|---|---|---|---|---|---|---|
| anartia_jatrophae | Anartia jatrophae | ウスベニタテハ | CR I | 種でない | 1フレームに2個体 (背面2枚) の蝶が縦に並んで写っており単一個体写真ではない | 個体写真への差し替え推奨 |
| argia_oenea | Argia oenea | Argia oenea | CR I | 種でない | フレームの大半がUSNMのデータラベルで標本は左端に翅の断片がわずかに見えるのみ | 個体写真への差し替え推奨 |
| astraptes_fulgerator | Astraptes fulgerator | Astraptes fulgerator | CR I | 種でない | 標本個体は写っておらずRMNHのバーコードラベルと手書き同定ラベルのみが写っている | 個体写真への差し替え必須 |
| augocoris_gomesii | Augocoris gomesii | Augocoris gomesii | CR I | 種でない | カメムシ4種を描いた古い版画 (イラスト) プレートで写真ではない | 差し替え必須 |
| caligo_atreus | Caligo atreus | Caligo atreus | CR I | 種でない | 背面像と腹面像の2枚の蝶画像が縦に合成され単一個体の標本写真になっていない | 個体1枚のみの標本写真への差し替え推奨 |
| cyclocephala_lunulata | Cyclocephala lunulata | Cyclocephala lunulata | CR I | 画質不良 | 画像全体が滲むように強くぼやけ輪郭が溶けたように歪んでおり甲虫の細部が判別できない | 拡大鮮明な個体写真への差し替え推奨 |
| eacles_imperialis | Eacles imperialis | Eacles imperialis | CR I | 画質不良 | 頭部と翅基部のみの極端なクローズアップで全身像がなく背景除去による白い欠損部分も生じている | 全身が写った鮮明な個体写真への差し替え推奨 |
| euglossa_imperialis | Euglossa imperialis | Euglossa imperialis | CR I | 画質不良 | 顔面のみの極端なマクロクローズアップで全身像が確認できない | 全身が写った個体写真への差し替え推奨 |
| eurysternus_caribaeus | Eurysternus caribaeus | Eurysternus caribaeus | CR I | 種でない | 甲虫16頭を並べた多個体プレート画像であり単一個体写真ではない | 差し替え必須 |
| hetaerina_titia | Hetaerina titia | Hetaerina titia | CR I | 画質不良 | 翅の領域に標本ラベルとみられる文字が透けて重なって写り込んでいる | ラベルが写り込まない撮影・切り抜き画像への差し替え推奨 |
| lirometopum_coronatum | Lirometopum coronatum | Lirometopum coronatum | CR I | 別種の疑い | 表示画像は直翅目様昆虫でLirometopum coronatum (アリ科) の体制と一致しない | 種同定確認要、正しい標本画像への差し替え必須 |
| mecistogaster_ornata | Mecistogaster ornata | Mecistogaster ornata | CR I | 画質不良 | 翅と頭胸部の一部のみが写り本種特徴の長い腹部が含まれず不自然にクロップされている | 腹部を含む全身写真への差し替え推奨 |
| metriophasma_diocles | Metriophasma diocles | Metriophasma diocles | CR I | 別種の疑い | カゲロウ様の昆虫が写っておりナナフシ目 (Phasmida) の体制と一致しない | 同定確認要 |
| nectopsyche_punctata | Nectopsyche punctata | Nectopsyche punctata | CR I | 種でない | ラベル・データカードがフレームの大半を占め標本本体はごく一部のみ | 個体写真への差し替え推奨 |
| orsilochides_variabilis | Orsilochides variabilis | Orsilochides variabilis | CR I | 画質不良 | 単一個体は写っているが解像度が著しく低く輪郭が崩れ同定に使えない | 拡大鮮明な個体写真への差し替え推奨 |
| sargus_fasciatus | Sargus fasciatus | Sargus fasciatus | CR I | 種でない | 複数個体の魚類を描いた版画のスキャンで写真ではない | 実写標本画像への差し替え必須 |
| siproeta_stelenes | Siproeta stelenes | ミドリタテハ | CR I | 種でない | 紋様の異なる2個体が上下合成され、いずれも本種特有の淡緑色パッチとも不一致 | 個体を分離した単一標本写真への差し替え必須 |
| tithrone_roseipennis | Tithrone roseipennis | Tithrone roseipennis | CR I | 種でない | 1フレームに2個体のカマキリが並んで写っている | 個体写真への差し替え推奨 |
| trigona_fulviventris | Trigona fulviventris | Trigona fulviventris | CR I | 画質不良 | 極端にズーム・トリミングされ頭部付近のみで全体の体形が判別できない | 個体全体が写った鮮明な写真への差し替え推奨 |
| umbonia_crassicornis | Umbonia crassicornis | Umbonia crassicornis | CR I | 種でない | 1843年の古い博物図版 (エングレービング) で写真ではない | 実物標本の写真への差し替え必須 |
| urbanus_proteus | Urbanus proteus | オナガセセリ | CR I | 種でない | RMNHのバーコードラベルのみが写っており標本個体が全く写っていない | 差し替え必須 |
| acrossidius_tasmaniae | Acrossidius tasmaniae | Acrossidius tasmaniae | 補修 | 種でない | 写真ではなく点描によるペン画 (版画/イラスト) | 実個体の写真への差し替え必須 |
| adoryphorus_couloni | Adoryphorus couloni | Adoryphorus couloni | 補修 | 種でない | 写真ではなく点描によるペン画 (版画/イラスト) | 実個体の写真への差し替え必須 |
| afurika_yamato_shijimi | Zizeeria knysna | アフリカヤマトシジミ | 補修 | 種でない | RMNHのバーコードラベルと薄紙の包み紙が大半で個体はごく小さな一部のみ | 個体を拡大トリミングした写真への差し替え必須 |
| aka_tobibatta | Nomadacris septemfasciata | アカトビバッタ | 補修 | 種でない | 2個体のトビバッタが絡み合った状態で写っている | 単一個体の写真への差し替え推奨 |
| akamarubane_monki_tateha | Aterica rabena | アカマルバネモンキタテハ | 補修 | 種でない | Seitz Fauna Africana原著図版で約30種の蝶標本を格子状に並べた複合プレート | 実写単一個体標本への差し替え必須 |
| chamadara_tobibatta | Cyrtacanthacris tatarica | チャマダラトビバッタ | 補修 | 種でない | Druryの図版からの彩色イラストで2個体が並んで描かれている | 実個体の写真への差し替え必須 |
| coccinella_transversalis | Coccinella transversalis | ヤマイチテントウ | 補修 | 種でない | 同一ピンに2個体のテントウムシが刺されている | 単一個体の写真への差し替え推奨 |
| coelophora_inaequalis | Coelophora inaequalis | カタボシテントウ | 補修 | 種でない | 採集データラベルとAM標本番号表示が大半で標本は左上にごく小さい | 個体を拡大トリミングした写真への差し替え推奨 |
| didymuria_violescens | Didymuria violescens | フタイロナナフシ | 補修 | 種でない | 古い図版からの彩色イラストで複数個体・複数体色パターンのプレート | 個体写真への差し替え必須 |
| gin_haneguro_tonbo | Palpopleura vestita | ギンハネグロトンボ | 補修 | 種でない | 左右に2個体のトンボが向かい合う形で写っている | 単一個体の写真への差し替え推奨 |
| hagata_murasaki | Hypolimnas dexithea | ハガタムラサキ | 補修 | 種でない | Seitz Fauna Africana原著図版で約16種の蝶標本を格子状に並べた複合プレート | 実写単一個体標本への差し替え必須 |
| hierodula_majuscula | Hierodula majuscula | モエギオオカマキリ | 補修 | 幼虫・蛹 | ファイル名の通りL4齢幼虫で翅が確認できず成虫ではない | 成虫個体写真への差し替え推奨 |
| hime_kijanome | Zophoessa callipteris | ヒメキマダラヒカゲ | 補修 | 種でない | 生物多様性遺産図書館の図版で多数の蝶標本が並んだ一覧プレート | 実個体の写真への差し替え必須 |
| kinoko_kikuimushi | Xyleborus affinis | キノコキクイムシ | 補修 | 種でない | 採集データラベルとAM標本番号ラベルが大半で標本は左上にごく小さい | 個体を拡大トリミングした写真への差し替え必須 |
| kuroboshi_maru_kaigaramushi | Morganella conspicua | クロボシマルカイガラムシ | 補修 | 種でない | 同定・採集ラベル2枚が大半で個体とみられる小片は形態判別不能 | 個体が明瞭に判別できる拡大写真への差し替え必須 |
| madagasukaru_gin_yanma | Anax tumorifer | マダガスカルギンヤンマ | 補修 | 画質不良 | 頭部・翅と腹部が分離した破損標本にラベル文字が重なって写り込む | 状態の良い個体写真への差し替え推奨 |
| madagasukaru_oo_gokiburi | Gromphadorhina portentosa | マダガスカルオオゴキブリ | 補修 | 種でない | 脱皮殻状の個体と脚のある個体の2つが同一フレームに写っている | 単一成虫個体の写真への差し替え推奨 |
| ohishiba_kuro_aburamushi | Hysteroneura setariae | オヒシバクロアブラムシ | 補修 | 種でない | 修復後の新画像は葉茎上に8〜10個体のアブラムシが列をなす集団写真 | 単一個体が判別できる拡大写真への差し替え推奨 |
| oo_beni_hagoromo | Flatida rosea | オオベニハゴロモ | 補修 | 種でない | 標本個体は写っておらず産地・旧コレクション・NHMUKバーコードの3枚のラベルのみ | 個体写真への差し替え必須 |
| phricta_spinosa | Phricta spinosa | オオトゲキリギリス | 補修 | 幼虫・蛹 | ファイル名がKatydidNymphの通り翅が未発達な幼虫 (ニンフ) | 成虫個体写真への差し替え推奨 |
| scutiphora_pedicellata | Scutiphora pedicellata | ホシミドリキンカメムシ | 補修 | 種でない | 成虫1個体と複数の幼虫がまとまった複数個体・複数ステージの合成プレート | 成虫単一個体の写真への差し替え推奨 |
| suji_mori_tonbo | Neodythemis hildebrandti | スジモリトンボ | 補修 | 種でない | 展翅されたトンボが上下に2個体写っている | 単一個体の写真への差し替え推奨 |
| suzukuri_konajirami | Paraleyrodes bondari | スヅクリコナジラミ | 補修 | 種でない | 同定・採集ラベルが大半で葉片上の微小な点以外に個体形態が判別不能 | 個体が明瞭に判別できる拡大写真への差し替え必須 |
| tsuchiiro_ito_tonbo | Lestes ochraceus | ツチイロイトトンボ | 補修 | 画質不良 | 頭部・胸部・翅が分離した破損標本にラベル文字が重なって写り込む | 状態の良い個体写真への差し替え推奨 |
| tsuya_oozu_ari | Pheidole megacephala | ツヤオオズアリ | 補修 | 種でない | アリ2個体が甲虫の死骸を捕食している場面 | 単一個体の標本写真への差し替え推奨 |
| amphibotettix_longipes | Amphibotettix longipes | Amphibotettix longipes | round1 | 画質不良 | 全体的に露出不足で暗く体表・脚・触角の輪郭がほとんど判別できない | 明るく鮮明な個体写真への差し替え推奨 |
| apis_dorsata | Apis dorsata | オオミツバチ | round1 | 種でない | 写っているのはハニカム状の蜂の巣板で成虫個体そのものが写っていない | 差し替え必須 |
| bactrocera_frauenfeldi | Bactrocera frauenfeldi | Bactrocera frauenfeldi | round1 | 種でない | 手書きラベルと赤いTypeラベルが大半で中央に翅または体の断片らしきもののみ | 差し替え必須 |
| ceriagrion_cerinorubellum | Ceriagrion cerinorubellum | ナンヨウベニイトトンボ | round1 | 種でない | ラベルとパラフィン袋が大半で標本本体は左下にごく小さく写るのみ | 差し替え必須 |
| dolichoderus_thoracicus | Dolichoderus thoracicus | Dolichoderus thoracicus | round1 | 種でない | 多数のアリが折り重なった「アリの筏」の群れ写真で単一個体が判別できない | 差し替え必須 |
| junonia_atlites | Junonia atlites | アトリテスタテハモドキ | round1 | 画質不良 | 標本個体は視認できるがNaturalisのラベルカードと三角包紙が画角の大半 | 拡大鮮明な個体写真への差し替え推奨 |
| limnocentropus_grandis | Limnocentropus grandis | Limnocentropus grandis | round1 | 種でない | スケール定規・タイプラベル・産地ラベル・バーコードカードが大半 | 個体全身が写った標本写真への差し替え必須 |
| orthetrum_testaceum | Orthetrum testaceum | Orthetrum testaceum | round1 | 画質不良 | 翅と胸部の一部のみで腹部が確認できず異物とラベルが重なった破損標本 | 鮮明な完全個体写真への差し替え推奨 |
| oxya_hyla | Oxya hyla | Oxya hyla | round1 | 画質不良 | 個体が斜め下向きにぼやけ脚が画面端で切れ葉片状の異物が浮遊 | 鮮明な個体写真への差し替え推奨 |
| penthicodes_farinosa | Penthicodes farinosa | Penthicodes farinosa | round1 | 種でない | 個体の写真が一切写っておらず手書き産地ラベルとバーコードラベルのみ | 差し替え必須 |
| polyrhachis_armata | Polyrhachis armata | Polyrhachis armata | round1 | 種でない | 複数アングルの部位写真とスケールバーを組み合わせた合成図版 | 差し替え必須 |
| pycanum_alternatum | Pycanum alternatum | Pycanum alternatum | round1 | 別種の疑い | 元ファイル名がPycanum rubens (近縁別種) を示し同定不一致の疑い | 同定確認要 |
| pyrops_intricatus | Pyrops intricatus | Pyrops intricatus | round1 | 種でない | pyrops_sultanusと同一の3種併記illustration plate画像が使われている | 差し替え必須 |
| pyrops_sultanus | Pyrops sultanus | Pyrops sultanus | round1 | 種でない | 3種の異なるランタンフライを並べた19世紀風の彩色図版 | 差し替え必須 |
| sisyphus_thoracicus | Sisyphus thoracicus | Sisyphus thoracicus | round1 | 種でない | 左右鏡像対称でハーフトーン線画的な質感、19世紀の分類学的engraving | 差し替え必須 |
| vespa_tropica | Vespa tropica | Vespa tropica | round1 | 種でない | 単一個体ではなく7匹のスズメバチ標本が並んだプレート写真 | 差し替え必須 |
| zanna_tenebrosa | Zanna tenebrosa | Zanna tenebrosa | round1 | 幼虫・蛹 | 翅がなく掘削脚状の構造を持つ未成熟なセミ幼虫 (ニンフ) | 翅を持つ成虫個体写真への差し替え推奨 |

pyrops_sultanus と pyrops_intricatus は完全に同一の画像 (3種併記illustration plate) を共有しており、単一のsource discovery不具合が同時に2種を巻き込んでいる。

## 4. 補修round (46件) の改善評価

archiveに旧版が残存し新旧比較が可能だったのは10種。うち6種は §2 の消失バグによりライブの新版が失われているため、archive内の (誤って退避された) 新版データを参照して内容のみ評価した。

| species_id | 旧版の内容 | 新版の内容 | 評価 |
|---|---|---|---|
| onthophagus_taurus | Iconographia Zoologica由来の版画イラスト (種でない) | iNat由来の実写、ややグレイン/ソフトフォーカスだが単一個体を判別可能 | 改善。イラスト→実写への転換に成功。品質は中程度で今後の精査候補ではあるがOK水準 |
| suji_kuwagata | 個体が横倒し気味でやや不鮮明、光沢が強く姿勢が不自然 | 背面から個体全体 (大顎・触角・脚) が鮮明に写る良好な標本写真 | 改善。ただし§2のバグでライブに反映されておらず、archiveから復元すれば有効なカードになる |
| ohishiba_kuro_aburamushi | ラベル・標本容器・封筒のみで個体が一切見えない (種でない) | 葉茎上に8〜10個体のアブラムシが列をなす集団写真 (種でない、bulk sample) | 部分改善だが不合格。個体は視認できるようになったが単一個体表示の基準を満たさない |
| akamarubane_monki_tateha | RMNH標本ラベル台紙のみ、蝶が一切写っていない (種でない) | Seitz Fauna Africana原著の図版スキャン、蝶約30種を格子状に並べた複合プレート (種でない) | 同等 (未解消)。ラベルのみ→複合プレートへと欠陥の型が変わっただけで、単一個体写真という目標は達成されていない |
| hagata_murasaki | RMNH標本ラベル台紙のみ、蝶が一切写っていない (種でない) | Seitz Fauna Africana原著の図版スキャン、蝶約16種を格子状に並べた複合プレート (種でない) | 同等 (未解消)。akamarubane_monki_tatehaと同一書籍・同一パターン |
| akamadara_hanamuguri | 甲虫30種混在の歴史図版 (Georgiy Jacobson Beetles of Russia and Western Europe) | 旧版と完全に同一の画像 (再fetchが同一source-titleに再収束) | 変化なし。再取得しても同じ複合図版に収束しており、かつ§2のバグでライブからも消失 |
| hiroobi_midorishijimi | 蝶24種混在のプレート (Favonius系統比較図版) | 旧版と完全に同一の画像 | 変化なし。同上 |
| oohikage_janome | 「Rhopalocera Nihonica」歴史図版、蝶28種混在 | 旧版と完全に同一の画像 | 変化なし。同上 |
| oni_kuwa_kamikiri | 死骸状の単一個体、側面から脚・触角が確認できる | 旧版と完全に同一の画像 | 変化なし。内容自体はもともとOK水準だったと見られ、§2のバグでライブから消失したことのみが問題 |
| yamato_batta | (archiveに新版のみ残存、旧版は未特定) | 無関係な昆虫6種 (蚊・ゾウムシ・カメムシ・ケラ・ガ・スズメバチ) を2×3グリッドに並べた合成画像。バッタは一切写っていない | 悪化。新規取得内容が種として完全に誤っており、ライブ復元しても不合格。source discoveryの再実行が必須 |

差し戻し推奨 (現状のまま復旧・採用すべきでない): akamarubane_monki_tateha、hagata_murasaki、akamadara_hanamuguri、hiroobi_midorishijimi、oohikage_janome、yamato_batta の6種。いずれも新版の内容が単一個体写真の基準を満たしておらず、archiveへの復元やそのままの再fetch再実行では解決しない。akamarubane_monki_tateha・hagata_murasaki (RMNH由来ラベルのみ→Seitz複合プレート) と akamadara_hanamuguri・hiroobi_midorishijimi・oohikage_janome (再fetchが完全に同一sourceへ収束) は、いずれも card_image_inspection_2026-08-18.md §6.5 で既に「WMC上の非ASCIIファイル名衝突により本来の単一個体写真が存在しない」と特定されていた群と重なり、単純な再fetchでは解消しないことが今回改めて確認された。tier順を切り替えるか、該当種の写真取得自体を諦めてrenderer (SVG) フォールバックに委ねる方針転換が必要。

復旧を推奨: suji_kuwagata (改善が確認できておりarchiveからの復元で有効なカードになる)、oni_kuwa_kamikiri (内容自体は良好、消失のみが問題)。onthophagus_taurusは既にライブで有効なため対応不要。

## 5. SSR級の個別評価

### 5.1 ボルネオI SSR3種 (borneo_expedition1_freeze_draft.md 2.2節)

Trogonoptera brookiana (アカエリアゲハ、USNM、USNMENT00669316) は展翅された背面全形。黒褐色の翅に白い放射状の帯、前翅基部の緑〜青の光沢帯、後翅の黄緑斑と、本種を特徴づける全ての形質が鮮明に写っている。触角・脚も含め欠損なし。看板種として申し分ない画質。判定はOK、追加対応不要。

Tacua speciosa (キエリアブラゼミ、NHMUK、NHMUK013385268) は背面全形。黒地に黄色の襟状の帯、翅脈の赤みがかった発色まで確認でき、選定理由に挙げられた「黒地に黄色い襟」の配色が明瞭に再現されている。判定はOK、追加対応不要。

Pyrops whiteheadi (和名未定、NHMUK、NHMUK013388365) は頭部から前方に伸びる特徴的な突起、翅を開いた状態で黄色地に黒斑の前翅と鮮やかなターコイズの後翅が確認できる。「姿の異様さが説明不要のインパクトを持つ」という選定理由通りの構図で撮影されている。判定はOK、追加対応不要。ボルネオI SSR3種はいずれもOKで、看板級カードとしてfreeze可能な状態にある。

### 5.2 コスタリカI SSR3種 (costarica_expedition1_freeze_draft.md 3.1節)

Atta cephalotes (ハキリアリ、WMC、File:Leaf cutting ant.jpg) は生体の側面全形。赤褐色の体色、長い脚と触角が鮮明に写り、単一個体として問題なく判別できる。ハキリアリ特有の葉を運ぶ行動シーンではない静止個体のみの写真だが、種の同定という観点では十分。判定はOK。

Tropidacris cristata (シタベニオオバッタ、NHMUK、NHMUKBMNHE669542) は翅を開いた背面全形で、緑色の前翅と、和名の由来である赤みを帯びた後翅の網目模様が同時に確認できる。触角・脚も欠損なく、大型バッタとしての迫力も伝わる構図。判定はOK。

Morpho helenor (ヘレノールモルフォ、NHMUK、NHMUK808207) は展翅された腹面 (裏面) の全形で、褐色地に環状紋 (眼状紋) が並ぶ模様は本種の腹面として矛盾なく、種の同定自体に問題はない。ただし、モルフォ蝶の一般的な訴求力は背面の構造色による強い青の光沢にあり、今回のカードは腹面のみのため、その最大の見せ場が写っていない。判定はOKとするが、看板級カードとしての訴求力を重視するなら、背面 (青色面) が確認できる個体への差し替えを検討する価値がある。

## 6. gateをすり抜けた欠陥の型の考察

新設のquality gate (空箱・ラベル検出、実測recall 53.6%) を通過した179件の検品を通じて、gateが捕捉できていない残存欠陥は大きく5パターンに分類できる。

(1) ラベル主体だが「矩形」判定を免れる構図。gateは `label_rectangle` (前景が bbox の大半を直線的矩形で占める) を検出根拠にしているとみられるが、ラベルが画面の70〜90%を占めていても、標本本体の断片が画面の一部 (左端・左上・下端など) にはみ出す構図では矩形判定を免れる。今回の非OK 63件のうち19件 (30%) がこの型で、institution別では RMNH (Naturalis) が検品対象4件中4件全てで発生 (defect率100%)、NHMUKが65件中7件、USNMが32件中6件で発生している。重点確認1の懸念は的中しており、RMNH・NHMUK・USNM 3機関のラベル付き標本写真については、ラベル領域と標本本体領域を分離してから標本側の面積比を評価する (単純な前景矩形検出ではなく、標本らしき非矩形連結成分の面積比を見る) 方式への改良が必要。

(2) 複数個体・複数ステージの合成写真。単一個体の写真という前提が崩れる最多パターン (種でない44件中、複数個体合成は約20件)。同一ピンに複数個体、タンデム (交尾態) 、群れ・営巣・捕食シーンなど。gateは空間占有率のみを見ており、bbox内に「何個体写っているか」は評価していない。セグメンテーション後の連結成分数をカウントし、閾値以上なら reject する仕組みの追加を推奨する。

(3) 実写でないコンテンツ (歴史図版・イラスト・地図・標本箱)。種でない44件中、非写真コンテンツ (エングレービング・彩色図版・分布地図・標本箱ジオラマ等) が約12件。WMC tierで取得される歴史的博物図版は、色調・質感が現代写真と大きく異なるため、gateに輝度分散やテクスチャ特徴 (ハーフトーン検出等) を追加すれば機械的に相当数を弾ける可能性が高い。

(4) 同一sourceへの再収束。akamadara_hanamuguri・hiroobi_midorishijimi・oohikage_janome の3種は、補修roundで再fetchしても寸分違わず同一の複合プレート画像に収束した。これは discovery ロジックが同じクエリに対して同じ最上位結果を返す以上、gateをいくら強化しても再fetchの繰り返しだけでは解決しない。該当種は tier を切り替える (次段sourceへ強制フォールバック) か、正しい単一個体写真が存在しないと判断してrendererフォールバックに委ねる運用ルールが必要。

(5) パイプライン自体のバグによる完全消失。これはgateの対象外だが、画像内容の良し悪し以前に、そもそも検品可能な実体が存在しない31件が発生した (§2)。これは quality gate ではなく、archive/refetch のファイル操作ロジック側の欠陥であり、次回のfetch/repair実行前に修正が必須。

## 7. まとめ

検品総数179件 (ログ上の成功210件のうち31件はパイプラインバグによりファイル消失、検品不能)。OK 116件、非OK 63件 (種でない44、画質不良13、別種の疑い3、幼虫・蛹3)。補修round46件は検品可能27件中25件が非OKで改善効果はほぼ確認できず、加えて46件中19件がライブから消失している。ボルネオI・コスタリカIのSSR6種はいずれも種として正しく、5種は画質・構図とも良好、Morpho helenorのみ看板性の観点で背面写真への差し替えを検討の余地あり。catalog・bugs.js・volume manifestへの反映は行っていない。
