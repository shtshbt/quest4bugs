# 図鑑カード画像内容検査 (2026-08-18)

## 概要

zukan_cards/processed/ の display 画像 (*_L2_grade.webp) 全1319件を、対応する zukan_cards/metadata/*.json の species_id・学名・和名・source と突き合わせて目視相当で検査した。判定区分は OK、幼虫・蛹 (成虫でない)、別種の疑い、種でない (模式図・生息環境・標本ラベルのみ・白紙等)、画質不良の5種。

検査は2段階で実施した。まず公開中 (マダガスカルI・オーストラリアI、zukan_config/zukan_catalog.js 収録済み168種) を先行して全件検査し、次に残りの未公開 card (metadata がある全1160件) を全件検査した。全1319件を省略なく検査済み。

なお検査の過程で、公開中の kiboshi_kuro_hishibatta (キボシクロヒシバッタ) の catalog エントリが、既存の1319件のいずれとも異なる経路で別種の画像ファイルを参照している事例を発見した。これは物理ファイル単位の1319件カウントには含まれないため、別項目として記載する。

## 1. 公開中で問題のある card (最優先節)

公開中168種のうち、160種は display 画像を持つ (159種は metadata との直接対応、1種は catalog 経由)。残り8種は写真 card を持たず、bugs.js 上で renderer 描画 (procedural drawing) される種のため今回の画像検査の対象外である (futasuji_tsuyumushi、hosonaga_kamakiri、midori_suji_ageha、onaji_shoujoubae、saku_kikuimushi、tatesuji_yaga、toge_hiza_inago、usucha_hekusodon)。

画像を持つ160種のうち、137種は OK。以下23種で問題を検出した。

| species_id | 判定 | 根拠 | 推奨処置 |
|---|---|---|---|
| kiboshi_kuro_hishibatta | 別種の疑い (catalog不整合) | zukan_catalog.js の image.display が zukan_cards/processed/WIKIPEDIAWP_L2_grade.webp を参照しているが、この物理ファイルの本来の metadata (WIKIPEDIAWP.json) は species_id madagasukaru_oo_tagame (マダガスカルオオタガメ) であり、目視でも捕獲脚を持つ水生カメムシ (タガメ類) の姿で、キボシクロヒシバッタ (バッタ目) とは体制が全く異なる。catalog 内の specimen データ自体もWikipedia「カニ」記事を参照しており、名称・画像・source データの三者が食い違っている | catalog側の画像パス割当てを緊急に修正。公開中カードのため優先度最高 |
| coccinella_transversalis | 種でない | ピン上に2個体のテントウムシ様の背面ドームのみが並び、単一個体の全身像になっていない | 単一個体の標本画像への差し替え推奨 |
| coelophora_inaequalis | 種でない | フレームの大半が採集ラベルカードで占められ、甲虫本体は左端にごく小さく写るのみ | 標本本体を中心にクロップし直した画像への差し替え推奨 |
| kinoko_kikuimushi | 種でない | 微小な標本がピン上の不定形な白い塊としてのみ写り、脚・触角・上翅など甲虫としての特徴が判別不能 | 拡大撮影または判別可能な標本画像への差し替え推奨 |
| suzukuri_konajirami | 種でない | 手書きラベル2枚とスライド標本のみで構成され、コナジラミの昆虫体そのものが視認できない | 判別可能な拡大標本画像への差し替え推奨 |
| oo_beni_hagoromo | 種でない | 3枚の採集ラベルのみが写り、昆虫個体が一切写っていない | 標本本体の画像への差し替え必須 |
| kuroboshi_maru_kaigaramushi | 種でない | 2枚のラベルと微小な断片のみで、カイガラムシとしての形態的特徴が判別不能 | 判別可能な拡大標本画像への差し替え推奨 |
| ohishiba_kuro_aburamushi | 種でない | ラベル・標本容器・封筒で構成され、アブラムシ個体の形態が視認できない | アブラムシ個体が判別できる画像への差し替え推奨 |
| afurika_yamato_shijimi | 種でない | 標本ラベルとグラシン封筒が画面の大半を占め、個体は左下隅にごく小さな断片としてのみ写る | catalog側の画像割当てを確認、成虫個体写真への差し替え推奨 |
| akamarubane_monki_tateha | 種でない | 標本ラベルカード (台紙) のみが写っており、昆虫本体が画面内に全く写っていない | catalog側の画像割当てを確認、差し替え必須 |
| hagata_murasaki | 種でない | 標本ラベルカード (台紙) のみが写っており、昆虫本体が画面内に全く写っていない | catalog側の画像割当てを確認、差し替え必須 |
| suji_mori_tonbo | 種でない | トンボ標本2個体とスケール参照文字が1枚に合成されており、単一個体の展示になっていない | 単一個体画像への差し替え推奨 |
| gin_haneguro_tonbo | 種でない | トンボ標本2個体が向かい合わせで1枚のフレームに合成されている | 単一個体画像への差し替え推奨 |
| madagasukaru_gin_yanma | 種でない | 頭部+翅の塊、分離した小球状部位、分離した腹部の棒状部位の3パーツがバラバラに写り、一体の標本として認識できない | 破損標本のため、まとまった個体写真への差し替え必須 |
| haneashi_ito_tonbo | 種でない | 標本ラベルカードが画面の大半を占め、個体は台紙左下に小さく写るのみ | catalog側の画像割当てを確認、成虫個体写真への差し替え推奨 |
| tsuchiiro_ito_tonbo | 種でない | イトトンボ標本2個体が重なり合う形で1枚に合成されている | 単一個体画像への差し替え推奨 |
| kanmuri_kareha_kamakiri | 種でない | カマキリ2個体とコイン (スケール参照物) が1枚のフレームに写っている | 単一個体画像への差し替え推奨 |
| chamadara_tobibatta | 種でない | 1837年の博物図版で、異なる2種のバッタが1枚の図版に並んで描かれている | 非種のため差し替え必須 |
| madagasukaru_oo_gokiburi | 種でない | 脱皮殻または未成熟個体と成虫個体の計2物体が同一フレームに写る | 成虫単体へのクロップ/差し替え推奨 |
| scutiphora_pedicellata | 種でない | 成虫1体・幼虫の集合・別個体の計3パネルを1枚に合成したコラージュ画像 | 成虫単体へのクロップ/差し替え推奨 |
| tsuya_oozu_ari | 種でない | アリ2個体に加え、甲虫状の死骸 (別種の獲物とみられる) が同一フレームに写り込む | catalog側の画像割当てを確認、差し替え推奨 |
| aka_tobibatta | 種でない | 菌害 (生物的防除) で死んだ複数個体が積み重なった写真 | 非種のため差し替え必須 |
| neomantis_australis | 別種の疑い | claimはカマキリ目だが、写真は鎌状の捕獲脚も三角形の頭部もない広い楕円形のシールド状ボディで、カマキリの体制と一致しない | 別種疑い、同定確認要 |

## 2. 未公開 card の検査結果

metadata が存在する未公開種1160件を全件検査した。903件は OK。以下257件で問題を検出した。既検出8件と一致するものには [既知8件と一致] を、その関連事例 (mg/au 報告で「画像が壊れている」等として既に把握されていたもの) には [既知の関連事例と一致] を付記した。

| species_id | 判定 | 根拠 | 推奨処置 |
|---|---|---|---|
| iridomyrmex_rufoniger | 種でない | 液浸ヴァイアル+ラベルのみの構図で、個体が茶色い不定形の塊としてしか写らず単一個体の展示写真になっていない | 個体が判別可能な鮮明写真への差し替え推奨 |
| rhytidoponera_metallica | 別種の疑い | ヴァイアル画像に添付されたラベル自体に「Crematogaster sp 002 det. L. Jefferys」と記載され、claimed種と属レベルで矛盾 | catalog側の種割当てを再確認、標本再同定要 |
| hime_gengoro | 種でない | ピン標本が上下2つの塊に分離し、中央に細い破片も写り込む非典型的な構図 | 標準アングルの単一個体写真へ差し替え推奨 |
| tettigarcta_tomentosa | 画質不良 | 強いピンボケ・低解像度で識別特徴が判読不能 | 鮮明な個体写真への差し替え推奨 |
| anopheles_annulipes | 画質不良 | 点付け標本が微小な染み状にしか写らず判読不能 | 鮮明な個体写真への差し替え推奨 |
| aedes_rubrithorax | 画質不良 | 点付け標本が微小な不定形の塊として写るのみ | 鮮明な個体写真への差し替え推奨 |
| halmus_aoba_tentou | 画質不良 | 標本が極小の暗色ドーム状としてしか写らない | 拡大鮮明な個体写真への差し替え推奨 |
| iridomyrmex_purpureus | 種でない | ヴァイアル内に数十個体のアリが密集 (bulk sample)、単一個体表示になっていない | 単一個体の鮮明写真への差し替え推奨 |
| myrmecia_nigrocincta | 種でない | ヴァイアル内に多数個体のアリが密集 (bulk sample) | 単一個体の鮮明写真への差し替え推奨 |
| micronecta_annae | 種でない | 標本ラベル4枚のみで個体が一切写っていない | 個体写真への差し替え必須 |
| micronecta_robusta | 種でない | 標本ラベル3枚のみで個体が一切写っていない | 個体写真への差し替え必須 |
| coelopa_alluaudi | 種でない | 個体部分は特徴が確認できない小さな丸まった塊のみ | 個体写真の確認・差し替え推奨 |
| futamon_ashinagabachi | 種でない | 画像はハチの巣 (ペーパーネスト) そのもので、成虫個体が写っていない | 成虫個体写真への差し替え必須 |
| shiokara_tonbo (ETHZENT0230672) | 画質不良 | 成虫トンボの体制が見えず、透明翅がセグメンテーションで消去された可能性が高い | 再セグメンテーション/再crop後の差し替え推奨 |
| kuronaga_osamushi | 種でない | 手書き標本ラベルカードのみで昆虫の姿が一切写っていない | 非種のため差し替え必須 |
| nanahoshi_tentou (MNHNL88196) | 画質不良 | 本体は画面上部の約1/6のみで、残りはラベル/バーコードカード | catalog側の画像crop再処理を推奨 |
| triplectides_similis | 種でない | ラベル紙片・タイプ標本スタンプ・小さな封入スライド円盤のみで昆虫本体は視認できない | 非種のため差し替え必須 |
| triplectides_ciuskus | 種でない | 手書きラベル・QRコード・museum番号台紙・小さな封入円盤のみ | 非種のため差し替え必須 |
| lectrides_varians | 種でない | ラベル台紙とマウント円盤のみで昆虫本体は視認できない | 非種のため差し替え必須 |
| oecetis_laustra | 種でない | ラベル台紙とマウント円盤のみで昆虫本体は視認できない | 非種のため差し替え必須 |
| kuriya_keshikisui | 画質不良 | 極小の甲虫らしき斑点状個体のみで識別に足る解像度がない | catalog側でより解像度の高い画像への差し替えを検討 |
| saikabuto | 種でない | カブトムシに見合う姿が確認できず、手書きラベル・台紙断片・染みのみ | 非種のため差し替え必須 |
| kiobinaga_kakkoumushi | 種でない | 樹脂封入円盤2枚のみで甲虫の輪郭が判別できない | 非種のため差し替え必須 |
| tama_oshi_zou | 画質不良 | 黒縁樹脂封入円盤内にゾウムシ様の影がかすかに見えるのみで解像度・視認性が不足 | catalog側の画像を確認要 |
| kameno_ko_hamushi | 種でない | マウントポイントと手書きラベルのみで昆虫本体は写っていない | 非種のため差し替え必須 |
| bemisia_tabaci | 種でない | ラベルカード2枚と不鮮明な円盤のみでコナジラミ成虫の体が判別できない | 非種のため差し替え必須 |
| eupholus_zou | 種でない | 標本ラベル群のみで虫体が一切写っていない | 差し替え必須 |
| siamensis_atlas_kabuto | 種でない | 標本ラベル群のみで虫体が一切写っていない | 差し替え必須 |
| kusakagerou | 画質不良 | 標本が破損し翅が本体から分離、複数の断片として散在 | 個体差し替え推奨 |
| anopheles_gambiae | 別種の疑い | 翅が幅広く脚・口吻が視認できず、同バッチ内の他Anopheles種と明確に異なりトビケラ/蛾様の体制に見える | 別種疑い、同定確認要 |
| taiwan_kutsuwamushi | 画質不良 | 標本が細い棒状の断片のみで同定に不十分 | 個体差し替え推奨 |
| sasakiri | 幼虫・蛹 | metadata上もlifeStage: Larvaで、画像も未発達の小さな不定形個体 | 成虫個体への差し替え推奨 |
| konoha_mushi | 別種の疑い | コノハムシ特有の扁平で葉状の腹部・翅がなく、細長く棘のあるナナフシ型の体型 | 別種疑い、同定確認要 |
| yamato_kuroshijimi_hebitonbo_dummy | 画質不良 | 翅のみにほぼ全体がクロップされ個体全体を確認できない | クロップ再確認・差し替え推奨 |
| crocothemis_nigrifrons | 画質不良 | 標本が破損し淡色の胸部断片と裸の腹部のみが見える | 個体差し替え推奨 |
| kiiro_sanae | 画質不良 | 標本が破損し黒く固まった頭胸部塊と裸の腹部のみ | 個体差し替え推奨 |
| kuroito_tonbo | 画質不良 | 翅が潰れて不明瞭かつ小さく、隣に発泡素材の台座が写る | 個体差し替え推奨 |
| trialeurodes_vaporariorum | 種でない | ラベル2枚と不定形の淡色斑点のみで虫体特徴が視認できない | 差し替え必須 |
| lasioglossum_lanarium | 種でない | type labelカード群が画面の大半を占め、標本は左端に極小 | catalog側の画像割当てを確認、specimen-only画像への差し替え推奨 |
| lasioglossum_florale | 種でない | labelカード6枚に対し標本は左端の小さな個体のみ | catalog側の画像割当てを確認 |
| lasioglossum_cognatum | 種でない | 標本個体が一切写っておらずtype label 5枚とバーコードのみ | 種の写真への差し替え必須 |
| lasioglossum_dampieri | 種でない | Holotypeラベル群7枚が大半を占め、標本は左端に極小 | catalog側の画像割当てを確認 |
| kaiko_moth | 種でない | カイコの繭 (白い繭塊) で、成虫個体 (蛾) が写っていない | 成虫個体画像への差し替え必須 |
| taschorema_evansi | 種でない | ピンに巻き付いた紙/絹状の束のみで虫体構造が確認できない | 種の写真への差し替え必須 |
| ulmerochorema_rubiconum | 種でない | ピン先端の繊維状の小さな塊のみで虫体構造が判別不能 | 種の写真への差し替え必須 |
| hellyethira_simplex | 種でない | ラベルに「Wings on slide」と明記の通り翅のみがスライド標本化 | 種の写真への差し替え必須 |
| amphipsyche_senegalensis | 種でない | 折り畳まれた紙状の束とラベル群が大半で虫体の形状が確認できない | 種の写真への差し替え必須 |
| maimaiga | 幼虫・蛹 | 剛毛の目立つ毛虫 (幼虫) で成虫 (蛾) ではない | 成虫個体への差し替え推奨 |
| yotsuboshi_kuroke | 画質不良 | クロップがほぼ翅一枚のみで頭部・脚・触角が写っていない | 個体全体が写る画像への差し替え/再クロップ推奨 |
| culicoides_imicola | 種でない | 黄色いスライド封入片4個とラベルのみで個体自体が視認できない | 種の写真への差し替え必須 |
| culicoides_enderleini | 種でない | スライド封入片とバーコードラベルのみで虫体が見えない | 種の写真への差し替え必須 |
| culicoides_leucostictus | 種でない | スライド封入片とラベルのみで虫体が見えない | 種の写真への差し替え必須 |
| culicoides_moreli | 種でない | 粘着トラップ由来と思われる黄色い塊とラベルのみ | 種の写真への差し替え必須 |
| kusagi_kamemushi | 幼虫・蛹 | 翅で腹部が覆われておらず橙色の腹部節が露出、成虫でなく幼虫の体制 | 成虫個体への差し替え推奨 |
| lissopimpla_excelsa | 種でない | ラベルに「♀ genitalia」と明記の通り交尾器解剖スライドのみ | 種の写真への差し替え必須 |
| gomimushidamashi_kohira | 種でない | 「Tribolium castaneum」記載ラベル2枚と丸い封入片/ピン頭のみ | 個体写真への差し替え必須 |
| nysius_vinitor | 種でない | ラベル記載も「Nysius clevelandensis」でclaim種 (vinitor) と不一致 | catalog側の画像割当てを確認、差し替え必須 |
| hime_nagakamemushi | 種でない | ラベル記載「Nysius procerus」でclaim種 (plebeius) と不一致 | catalog側の画像割当てを確認、差し替え必須 |
| bactrocera_cacuminata | 種でない | 採集ラベル3枚が下部を占め、上部に極小のピン留めハエが斜めに写るのみ | 適切にクロップした個体写真への差し替え必須 |
| bactrocera_mayi | 画質不良 | 全体が暗く強くボケている | 高画質個体への差し替え推奨 |
| bactrocera_musae | 画質不良 | ハエ本体・台紙とも強いボケで識別特徴が読み取れない | 高画質個体への差し替え推奨 |
| ceratitis_malgassa | 画質不良 | ピン・台紙とともに個体が激しくボケている | 高画質個体への差し替え推奨 |
| oecophylla_smaragdina | 種でない | 葉巻き営巣 (リーフネスト) の写真で、アリ個体が一切写っていない | 個体写真への差し替え必須 |
| kobane_ashinaga_bachi | 種でない | 巣 (コーム) とピン留め個体3匹を1枚に並べた複合写真 | 単一個体の画像への差し替え推奨 |
| polistes_humilis | 種でない | 巣と個体2匹を1枚に並べた複合写真 | 単一個体の画像への差し替え推奨 |
| tetragonula_carbonaria | 種でない | 博物館ジオラマ標本ケース写真で、ハチ個体が全く写っていない | 個体写真への差し替え必須 |
| oo_kibara_gomimushi | 種でない | 単一個体ではなく複数属を収めた博物館収蔵箱全体が写っている | 単一個体へのクロップ差し替え必須 |
| akama_dara_hanamuguri | 種でない | 幼虫記録の手書きインデックスカードのみが写っている | 個体写真への差し替え必須 |
| taiwan_kuroboshi_shijimi | 種でない | 個体が写っておらず、標本ラベルカードと三角紙包装のみ | 個体写真への差し替え必須 (ラベルのみ) |
| shinjusan | 幼虫・蛹 | 成虫ではなく多数の繭 (蛹) と幼虫が集合した状態 | 成虫個体への差し替え推奨 |
| okinawa_birodo_seseri | 種でない | 個体写真がなく分類テキストラベルのみ | 個体写真への差し替え必須 |
| kuroboshi_seseri | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| banana_seseri (RMNH) | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| yuurei_seseri | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| kimadara_seseri | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| konohachou | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| ishigakechou | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| jakou_ageha | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| himeuranami_janome | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| onaga_ageha | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| himejanome | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| kojanome | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| satokimadara_hikage | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| uranami_janome | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| kimadara_modoki | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| kurohikage | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| hikagechou | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| kurohikage_modoki | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| tsumajiro_uragoma_janome | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| benihikage | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| hikage_janome | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| araschnia_sakahachi_aki | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| eltateha | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| ruritateha | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| sasakia_oomurasaki_ss | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| hyoumonmodaki | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| akaboshi_gomadara | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| gomadarachou | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| acraea_ranavalona | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない [既知8件と一致] | 個体写真への差し替え必須 (ラベルのみ) |
| acraea_zitja | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない [既知8件と一致] | 個体写真への差し替え必須 (ラベルのみ) |
| master_claudina | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| master_amer_aoichimonji | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| uraginsuji_hyoumon | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| oouraginsuji_hyoumon | 種でない | 空の標本箱とラベルのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| mesuguro_hyoumon | 種でない | ラベルとバーコードのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| oouragin_hyoumon | 種でない | ラベルとバーコードのみで昆虫本体が写っていない | 個体写真への差し替え必須 (ラベルのみ) |
| chamadara_seseri | 種でない | 黄色いカード状の紙片とラベルのみで昆虫の体が確認できない | 個体写真への差し替え必須 |
| sujigurochabane_seseri | 種でない | androconial scalesの記載通り、鱗粉プレパラートのラベルのみ | 個体写真への差し替え必須 (現状は鱗粉プレパラート) |
| miyama_seseri | 種でない | androc. scalesの記載通り、鱗粉プレパラートのラベルのみ | 個体写真への差し替え必須 (現状は鱗粉プレパラート) |
| kurotsubame_shijimi | 種でない | 交尾器プレパラート (genitalia slide mount) とラベルのみ | 個体写真への差し替え必須 (現状は交尾器プレパラート) |
| master_luna_moth | 種でない | 鱗粉プレパラートのラベルのみで成虫全形が写っていない | 個体写真への差し替え必須 (現状は鱗粉プレパラート) |
| tsubamehazurao_shijimi | 種でない | 標本ラベルと三角紙の標本包みのみで蝶の個体が一切存在しない | 標本写真への差し替え必須 |
| taiwan_tsubame_shijimi | 種でない | 標本ラベルと封筒のみで昆虫個体が一切存在しない | 標本写真への差し替え必須 |
| yomogi_ediba | 種でない | 交尾器プレパラート (半透明片) とラベルのみで成虫個体の写真が存在しない | 標本写真への差し替え必須 |
| tenguchou | 種でない | バーコード付きラベルのみで昆虫個体が一切存在しない | 標本写真への差し替え必須 |
| mozu | 種でない | 非常に薄い印刷帳票 (表形式のリスト) のスキャンが写っているだけで生物写真ではない | catalog側の画像割当てを確認、差し替え必須 |
| brachydiplax_denticauda | 種でない | トンボ標本2個体が重なって1枚の画像に写り、単一個体のカードとして機能していない | 単一個体への再クロップ、または差し替え推奨 |
| hatchou_tonbo | 種でない相当 | 背景未処理のラベルカード全体が主要被写体で、標本個体はラベル左下にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| hosomi_ito_tonbo | 種でない相当 | ラベルカードとカラーキャリブレーションチャートが主要被写体で、個体はラベル下端にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| austroagrion_watsoni | 種でない相当 | ラベルカードとカラーチャートが主要被写体で、個体はラベル下部にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| kiito_tonbo | 種でない相当 | 背景未処理のラベルカードが主要被写体で、個体はラベル下部に小さく写るのみ | 標本部分への再クロップ推奨 |
| oo_ito_tonbo | 種でない相当 | ラベルカードが主要被写体で、個体はラベル下端に糸状にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| ischnura_heterosticta | 種でない相当 | ラベルカードが主要被写体で、個体はラベル左下にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| morton_ito_tonbo | 種でない相当 | ラベルカードとカラーチャートが主要被写体で、個体は中央下部にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| ezo_ito_tonbo | 種でない相当 | ラベルカードとカラーチャートが主要被写体で、個体は下部にごく小さく写るのみ | 標本部分への再クロップ推奨 |
| gunbai_tonbo | 種でない相当 | ラベルカードとカラーチャートが主要被写体で、個体は左下に小さく写るのみ | 標本部分への再クロップ推奨 |
| asia_ito_tonbo | 種でない | 識別ラベルカードのみが写っており、虫体は写っていない | 非種のため差し替え必須 |
| aphis_craccivora | 画質不良 | スライド標本の顕微鏡撮影が著しくピンボケで主題を判定不能 | 焦点の合った標本写真への差し替え推奨 |
| kita_kichou | 種でない | 単一個体ではなく黄色いチョウ4個体を2x2グリッドに並べた比較プレート形式の画像 | 単一個体への差し替え推奨 |
| haiiro_maru_hanabachi | 種でない | 標本ラベルカード2枚が画面の大半を占め、ラベル上の学名もclaimと不一致 | 個体が主体の画像へ差し替え推奨 |
| hito_suji_shima_ka | 種でない | 採集データラベルとマウント台紙が画面の大半を占め、蚊本体は痕跡のみ | 画像差し替え必須 |
| shiroobi_ageha | 種でない | 採集地ラベルとバーコード標本タグの2枚のみで蝶個体は存在しない | 非種のため差し替え必須 |
| kogata_suzumebachi | 種でない | 単一個体ではなく3個体のスズメバチが横並びで写る複数個体プレート | 単一個体への差し替え推奨 |
| monsuzumebachi | 種でない | 単一個体ではなく3個体が横並びで写る複数個体プレート | 単一個体への差し替え推奨 |
| ookiba_usuba_kamikiri | 種でない | TYPE/BLNOタグと手書き標本ラベル計4枚のみで甲虫本体は存在しない | 非種のため差し替え必須 |
| oo_suzumebachi | 種でない | 6個体のスズメバチが格子状に並ぶ複数個体プレート | 単一個体への差し替え推奨 |
| ootabu_suzumebachi | 種でない | 2個体が並んで写る複数個体プレート | 単一個体への差し替え推奨 |
| ruriboshi_kamikiri | 種でない | 標本ラベル計4枚のみで甲虫本体は存在しない | 非種のため差し替え必須 |
| tsumaguro_suzumebachi | 種でない | 約24個体以上のスズメバチが格子状に並ぶ大規模な複数個体プレート | 単一個体への差し替え推奨 |
| achrioptera_magnifica | 種でない | 質感・陰影が写真ではなく彩色イラスト/図版と判断される | 実写標本画像への差し替え推奨 |
| anisocentropus_bicoloratus | 種でない | 輪郭線のみで構成された線画で写真ではない | 実写標本画像への差し替え推奨 |
| calofulcinia_paraoxypila | 種でない | 彩色された博物画風イラストで写真ではない | 実写標本画像への差し替え推奨 |
| canthydrus_guttula | 種でない | 版画/彩色図版のイラストで写真ではない | 実写標本画像への差し替え推奨 |
| heteracris_nigricornis | 種でない | 手彩色版画調のイラストで写真ではない | 実写標本画像への差し替え推奨 |
| oba_kuwa_eda_shaku | 種でない | 昆虫ではなく生息域を示す分布地図が写っている | 非種のため差し替え必須 |
| akashijimi_minami | 種でない | 昆虫ではなく分布域を示す地図が写っている | 非種のため差し替え必須 |
| chopardempusa_neglecta | 種でない | 彩色された博物画風イラストで写真ではない | 実写標本画像への差し替え推奨 |
| dipseudopsis_pauliani | 種でない | ほぼ白紙のフレームで昆虫が一切確認できない [既知の関連事例と一致] | 非種のため差し替え必須 |
| majanga_basilaris | 種でない | 彩色された博物画風イラスト (葉に擬態したカマキリ) で写真ではない | 実写標本画像への差し替え推奨 |
| metoxypilus_lobifrons | 別種の疑い | metadataがPseudocreobotra ocellata (別種) と明記しており、科レベルで体型が異なる | 別種疑い、正しい種の画像に差し替え要 |
| musca_confiscata | 別種の疑い | metadataがCulex taeniorhynchus (蚊) と明記。翅・脚・口吻の体形もイエバエとは明らかに異なる [既知8件と一致] | 別種疑い、正しい種の画像に差し替え要 |
| sedo_oo_gomimushi | 種でない | ヴィンテージ図版で、5種の異なる甲虫が1枚にまとめられた複合プレート | 非種のため差し替え必須 |
| yotsuboshi_ookisui | 種でない | 8種の異なる甲虫が格子状に描かれた複合プレート | 非種のため差し替え必須 |
| tropidoderus_rhodomus | 種でない | 1881年の絵画作品で、3匹のナナフシと葉を構成した装飾的複合プレート | 非種のため差し替え必須 |
| onthophagus_australis | 種でない | 番号付きで10種の異なる甲虫が描かれた複合プレート | 非種のため差し替え必須 |
| musgraveia_sulciventris | 種でない | 15種の異なるカメムシ類が番号付きで描かれた複合プレート | 非種のため差し替え必須 |
| tsunozemi_marubane | 種でない | 19世紀の博物図譜の手彩色銅版画で、描かれた虫も種の見た目と一致しない | 非種のため差し替え必須 |
| usubashirochou | 種でない | 10頭の異なる個体・型の蝶が1枚に並んだコンポジット図版 | 非種のため差し替え必須 |
| uramisuji_shijimi | 種でない | 15頭の異なるシジミチョウ類が格子状に並んだコンポジット図版 | 非種のため差し替え必須 |
| acrossidius_tasmaniae | 種でない | 白黒の線画 (銅版画/ペン画) で写真ではない | 非種のため差し替え必須 |
| adoryphorus_couloni | 種でない | 白黒線画で写真ではない | 非種のため差し替え必須 |
| kususan | 種でない | 標本箱を撮影した図版で成虫6頭と繭1個が1枚に並んだコンポジット | 非種のため差し替え必須 (成虫1個体へトリミング/差し替え) |
| master_jinmen_kamemushi | 幼虫・蛹 | 顔模様が未発達の個体2匹で、ファイル名にもnymphと明記 | 成虫個体への差し替え推奨 |
| tobimon_ooedashaku | 幼虫・蛹 | 尺取り虫の姿そのもので成虫の蛾の姿ではない、ファイル名もCaterpillar | 成虫個体への差し替え推奨 |
| hoshibeni_kamikiri | 種でない | 中央の個体の周囲に色・模様の異なる8頭のカミキリムシが配置されたコンポジット図版 | 非種のため差し替え必須 |
| hime_aka_hoshi_tentou | 画質不良 | 極端なクロップ/露出でテントウムシと判断できる特徴がほぼ見えない | 撮り直し/別画像への差し替え推奨 |
| chrysochroa_tamamushi | 種でない | インドネシアの記念切手に印刷された図案とみられ標本写真ではない | 非種のため差し替え必須 |
| yanga_guttulata | 画質不良 | 画像全体が極端に露出不足でほぼシルエットのみ | 撮り直し/別画像への差し替え推奨 |
| kumazemi | 種でない | ペン画/鉛筆画によるセミの線画イラストで写真ではない | 非種のため差し替え必須 |
| eliza_hanmyo | 種でない | 学術論文由来の口器/大顎の形態比較線画で写真ではない | 非種のため差し替え必須 |
| agehamodoki | 種でない | 古い鱗翅目図鑑のプレートスキャンで、複数個体が1枚にまとまったコンポジット | 非種のため差し替え必須 |
| kurousutabiga | 種でない | 12匹以上の異なるヤママユガ標本を並べた歴史図版 | 差し替え必須 |
| kuro_gengorou | 種でない | 花 (植物) イラストで昆虫が写っていない | 差し替え必須 |
| oo_gomimushi | 種でない | endophallus (交尾器) の解剖図版で複数個体の生殖器構造を比較するプレート | 差し替え必須 |
| hime_giis | 幼虫・蛹 | metadataとも幼生個体と明記 | 成虫個体への差し替え推奨 |
| helina_impuncta | 種でない | 1790年の古典図版で色柄の異なる約14匹のハエが混在 | 差し替え必須 |
| fuji_midorishijimi | 種でない | 20匹以上の異なる個体・種のシジミチョウ標本を並べた比較図版 | 差し替え必須 |
| phaonia_errans | 種でない | claim種のハエがハエトリグモに捕食される写真で2種が同一画像に混在 [既知8件と一致] | 差し替え必須 |
| benitsuchikamemushi | 別種の疑い | metadataに「種不明、他属の可能性」と明記。体色・斑紋もclaim種と一致しない | 別種疑い、同定確認要 |
| pseudomantis_albofimbriata | 種でない | 2種のカマキリの前脚 (捕獲脚) を並べた解剖線画 [既知8件と一致] | 差し替え必須 |
| kuroyama_ari | 種でない | 胸部側面/背面クローズアップと分布地図の多パネル図版で単一全身標本写真でない | 差し替え必須 |
| kawara_hanmyou | 種でない | 約25種のオサムシ類が混在する歴史図版 | 差し替え必須 |
| tama_keshikisui | 種でない | 約30種の甲虫が混在する歴史図版 | 差し替え必須 |
| ko_fuki_kogane | 種でない | 約28種のコガネムシ類が混在する歴史図版 | 差し替え必須 |
| douganebuibui | 種でない | 約24種のコガネムシ類が混在する歴史図版 | 差し替え必須 |
| kuwagata_hanamuguri | 種でない | 約30種のハナムグリ類が混在する歴史図版 | 差し替え必須 |
| koganemushi | 種でない | 約30種のコガネムシ類が混在する歴史図版 | 差し替え必須 |
| ebiiro_kamikiri | 種でない | 約25種のカミキリムシ類が混在する歴史図版 | 差し替え必須 |
| tsuno_kamemushi_esaki_replaced | 種でない | 分類群の異なる4種が混在する4パネル合成画像 | 差し替え必須 |
| muna_biro_kamakiri_dummy | 種でない | クモに捕食されるカマキリの写真で2種混在、個体も損壊 | 差し替え必須、catalog側の画像割当ても確認要 |
| hierodula_majuscula | 幼虫・蛹 | L4幼虫 (翅未発達) 個体、ファイル名にも明記 | 成虫個体への差し替え推奨 |
| mikado_gagambo | 種でない | 頭部クローズアップ写真と解剖線画2枚から成る複合図版で単一標本写真でない | 差し替え必須 |
| minminzemi | 種でない | アジア地図に生息域を色分けした分布地図で昆虫個体の写真ではない | 非種のため差し替え必須 |
| haiiro_gengorou | 種でない | 論文由来の解剖図版 (番号付き線画) で単一個体の写真ではない | 非種のため差し替え必須 |
| ni_idolomantis_diabolica | 幼虫・蛹 | metadata記載通りsubadult female (翅未発達の亜成虫個体) | 成虫個体への差し替え推奨 |
| yumon_eda_shaku | 種でない | 12頭の異なる蛾標本を格子状に並べた図版 | 非種のため差し替え必須 |
| maimaikaburi_ezo | 種でない | 成虫と幼虫の2画像を1枚に合成した図版 | 非種のため差し替え必須 |
| phricta_spinosa | 幼虫・蛹 | ファイル名がKatydidNymph (若虫) で翅が未発達 | 成虫個体への差し替え推奨 |
| eurosternus_noko_kuwagata | 種でない | 手描きイラスト図版で、キャプションもclaimed種と異なる学名 | 非種のため差し替え必須 |
| akahige_dokuga | 幼虫・蛹 | 画像・ファイル名とも毛虫 (幼虫) で成虫 (蛾) ではない | 成虫個体への差し替え推奨 |
| oogomashijimi | 種でない | 博物館標本箱の写真で多数の蝶標本とラベルが写り込む | 非種のため差し替え必須 |
| locris_vicina | 種でない | 交尾器官線画と分布図の図版で昆虫個体の写真ではない | 非種のため差し替え必須 |
| goma_fu_kamikiri | 種でない | 幼虫状個体・赤い成虫・別配色の成虫の4枚を1枚に合成した図版 | 非種のため差し替え必須 |
| tsuyumushi | 幼虫・蛹 | ファイル名がNymphe (若虫) で花上の小さな若虫個体 | 成虫個体への差し替え推奨 |
| kotsubame | 種でない | 図鑑プレートで多数種の蝶標本を格子状配置 | 非種のため差し替え必須 |
| aino_midorishijimi | 種でない | 図鑑プレートで多数種の蝶標本を格子状配置 | 非種のため差し替え必須 |
| onaga_shijimi | 種でない | 図鑑プレートで多数種の蝶標本を格子状配置 | 非種のため差し替え必須 |
| kibara_kamakirimodoki | 種でない | 6個体のカマキリモドキ類を2列3段に並べた図版 | 非種のため差し替え必須 |
| tochukasou_replaced_marukamemushi | 別種の疑い | metadataがMegacopta cribraria (別種) と記載 | 別種疑い、同定確認要 |
| bubas_bison | 種でない | 約24個体の異なる甲虫を並べた博物図版 | 非種のため実写標本への差し替え必須 |
| didymuria_violescens | 種でない | 手描き図版で複数個体のナナフシが並んで描かれている | 非種のため実写標本への差し替え必須 |
| podacanthus_typhon | 種でない | 手描き彩色イラストで実物標本写真ではない | 非種のため実写標本への差し替え必須 |
| umaoi | 種でない | 鉛筆画・水彩画イラストで実物標本写真でない | 非種のため実写標本への差し替え必須 |
| suzumushi | 種でない | 鉛筆画・水彩画イラストで実物標本写真でない | 非種のため実写標本への差し替え必須 |
| miyama_kamikiri | 種でない | 古い銅版画/線画調のイラストで実物標本写真でない | 非種のため実写標本への差し替え必須 |
| ao_sanae | 幼虫・蛹 | ヤゴまたは脱皮殻とみられる体で成虫 (緑色) の主張と一致しない | 成虫個体への差し替え推奨 |
| onthophagus_taurus | 種でない | 版画イラストで実物標本写真でない | 非種のため実写標本への差し替え必須 |
| orius_laevigatus | 別種の疑い | metadataがOrius insidiosus (別種) と明記 [既知8件と一致] | 別種疑い、catalog側の学名/画像割当てを確認 |
| urakuro_shijimi | 種でない | 複数の異なる蝶個体を並べた博物図版 | 非種のため実写標本への差し替え必須 |
| onki_ageha | 別種の疑い | metadataが分布域の異なる別種を示唆する記載 | 別種疑い、同定確認要 |
| ramie_kamikiri | 幼虫・蛹 | 白色でイモムシ状に体節が並ぶ甲虫幼虫 | 成虫個体への差し替え推奨 |
| seijaku_kamikiri | 種でない | 古い版画スタイルのイラストで実物標本写真でない | 非種のため実写標本への差し替え必須 |
| nihon_ashinagabachi | 種でない | アシナガバチの成虫個体ではなく紙巣 (ハチの巣) そのものを写している | 蜂本体が写る写真への差し替え必須 |
| usuiro_onaga_shijimi | 種でない | シジミチョウ科20種以上を格子状に並べた複合プレート | 差し替え必須、単一標本写真の再取得要 |
| hoshichabane_seseri | 種でない | セセリチョウ科20種以上を並べた複合プレート | 差し替え必須、単一標本写真の再取得要 |
| scarabe_sacer | 種でない | 白黒解剖図 (脚・口器などのパーツ分解図) で標本写真ではない | 差し替え必須、実写標本写真へ |
| sokorabe_ruri_shijimi | 種でない | シジミチョウ多数種を格子状に展示した複合プレート | 差し替え必須 |
| kuwakamikiri | 種でない | 彩色図版で、キャプションもclaim種と異なる2種を描いたものと明記 | 差し替え必須、実写かつ正しい種の標本へ |
| kusakiri | 種でない | カリバチが本種を捕獲している場面で2種の生物が写り込む | クサキリ単体の写真への差し替え推奨 |
| tagame | 種でない | metadataに3D・VRモデルのレンダリング画像と明記されており実物標本写真ではない | 実写標本写真への差し替え推奨 |
| technomyrmex_madecassus | 種でない | 腹部相当部分が標本マウント台紙の混入とみられるブロック状になっている | 元画像のクロップ/セグメンテーション再確認要 |
| nihon_himehanabachi | 画質不良 | 強いブレ・不明瞭さで体構造の境界が判別できない | 撮影品質の良い個体写真への差し替え推奨 |
| oo_geji | 画質不良 | 激しいブレで脚が細い線の断片群として散乱している | 撮影品質の良い個体写真への差し替え推奨 |
| thopha_saccata | 種でない | 白黒線画イラストで標本写真ではない | 実写標本写真への差し替え必須 |
| nephrotoma_australasiae | 別種の疑い | metadataが英国産の別種 (N. appendiculata) と明記 | 別種疑い、同定確認要 |
| oo_hanaabu_oddball_dummy | 種でない | 食材写真 (野菜・果物等) で昆虫は一切写っていない | 差し替え必須 |
| kuro_suzumebachi | 種でない | 幼虫を佃煮に加工した食品の写真 | 非種のため差し替え必須 |
| budou_tora_kamikiri | 種でない | 輸送ポッド (Hyperloop) の写真で昆虫は一切写っていない | 差し替え必須 |
| aedes_vigilax | 種でない | フィラリア生活環の解説図 (蚊と人体のイラスト) [既知8件と一致] | 差し替え必須 |
| hime_shaku | 幼虫・蛹 | 黄黒模様の幼虫 (毛虫) で成虫 (シャクガ) ではない | 成虫個体への差し替え推奨 |
| ima_fusca | 種でない | ほぼ白紙のフレームで虫体が一切視認できない [既知8件と一致] | 差し替え必須、元画像・segmentationの再確認要 |
| yotsubishi_kamemushi | 種でない | 成虫1個体と幼虫1個体が並んで写り、単一個体を代表するカードになっていない | 成虫単体へのクロップ/差し替え推奨 |
| pycnocrania_grandidieri | 種でない | 鉱物 (岩石) が写っており昆虫は一切写っていない [既知の関連事例と一致] | 差し替え必須 |
| achrioptera_impennis | 種でない | 冬芽の付いた裸の木の枝のみで虫体が確認できない [既知の関連事例と一致] | 差し替え必須 |
| banana_seseri (iNat) | 種でない | バナナの葉を筒状に巻いた幼虫の巣 (リーフロール) で成虫個体そのものではない | 成虫個体への差し替え推奨 |
| amberana_marginata | 種でない | 赤い破片状の物体が3つ画面内に散在し一つの虫体としてまとまっていない | 差し替え必須 |
| mizukamakiri | 種でない | 細長い個体が2体交差して重なって写り、単一個体を代表していない | 単一個体へのクロップ/差し替え推奨 |
| jouzan_midorishijimi | 種でない | 同一フレームに成虫の蝶2個体が並んで写っている | 単一個体へのクロップ/差し替え推奨 |
| archimantis_quinquelobata | 別種の疑い | カマキリ特有の鎌状前脚・三角形頭部が確認できずナナフシ的な体制に見える | 別種疑い、同定確認要 |
| tsuya_hada_kuwagata | 幼虫・蛹 | 光沢のあるC字型の芋虫状の体で成虫の大顎や外骨格が見えない | 成虫個体への差し替え推奨 |
| akiakane | 種でない | タンデム (交尾態) の2個体が連結して写り、単一個体の標本写真になっていない | catalog側の画像割当てを確認 |
| yamato_tamamushi | 種でない | 翅鞘の破片一枚のみで頭部・脚・胸部が一切確認できない | 非種のため差し替え必須 |
| ookamakiri | 種でない | 卵鞘らしき塊と人の手が小枝を持つ写真で、カマキリ本体が一切写っていない | 非種のため差し替え必須 |
| miyama_kuwagata | 種でない | 光沢のある翅鞘の破片一枚のみで頭部・大顎・脚が一切見えない | 非種のため差し替え必須 |
| nami_tentou | 幼虫・蛹 | 黒地にオレンジ斑と棘状突起を持つテントウムシ幼虫の体形 | 成虫個体への差し替え推奨 |
| marugata_gamushi | 画質不良 | 画像全体が暗く強いブレ/ノイズで構造がほとんど判別できない | 撮り直し/別画像への差し替え推奨 |
| sphodropoda_tristis | 種でない | 体節部分と頭部・脚のクラスターが分離しており連続した一つの虫体に見えない | catalog側の画像割当てを確認 |

## 3. 既検出8件との照合

II巻準備の worker が事前に検出していた8件 (au_expedition2_freeze_draft.md および mg_expedition2_freeze_draft.md に記録) は以下の通り。今回の再検査で全8件を独立に再確認した。いずれも見落としではなく、判定は一致した。

| species_id | 既存記録の判定根拠 | 今回の再確認結果 |
|---|---|---|
| Aedes vigilax | フィラリア生活環の模式図 | 一致。種でない (生活環解説図) として検出 |
| Ima fusca | ほぼ白紙の画像 | 一致。種でない (ほぼ白紙) として検出 |
| Pseudomantis albofimbriata | 前脚の解剖線画 | 一致。種でない (2種の前脚を並べた解剖線画) として検出 |
| Musca confiscata | カの線画 | 一致。今回は写真の蚊 (Culex taeniorhynchus) と判明、別種の疑いとして検出。被写体が claim種でない点は同じ |
| Phaonia errans | クモとハエの合成 | 一致。種でない (クモに捕食されるハエの写真、2種混在) として検出 |
| Orius laevigatus | 画像はOrius insidiosus | 一致。別種の疑いとして検出、metadataでも別種と確認 |
| Acraea ranavalona | 収蔵ラベルのみで蝶が写っていない | 一致。種でない (空の標本箱とラベルのみ) として検出 |
| Acraea zitja | 収蔵ラベルのみで蝶が写っていない | 一致。種でない (空の標本箱とラベルのみ) として検出 |

なお、両報告書ではこの8件と地続きで以下3件も記録されていた (「画像が壊れている」区分、および本文中の言及)。これらも今回独立に再確認し、一致した。

| species_id | 既存記録の判定根拠 | 今回の再確認結果 |
|---|---|---|
| Pycnocrania grandidieri | 岩の写真 | 一致。種でない (鉱物/岩石) として検出 |
| Dipseudopsis pauliani | ほぼ白紙 | 一致。種でない (ほぼ白紙) として検出 |
| Achrioptera impennis | 枝だけの写真 (refetch_queue.json に既載) | 一致。種でない (裸の木の枝) として検出 |

既検出11件 (8件+関連3件) はいずれも今回の全数検査で独立に再現され、誤検出や見落としはなかった。

## 4. 検査総数サマリー

| 区分 | 検査件数 | OK | 非OK |
|---|---:|---:|---:|
| 公開中 (画像を持つ160種、うち1種はcatalog経由) | 160 | 137 | 23 |
| 公開中だが写真card自体を持たない種 (renderer描画、対象外) | 8 | 対象外 | 対象外 |
| 未公開 (metadataがある全件) | 1160 | 903 | 257 |
| 合計 (物理ファイル1319件+catalog経由1件) | 1320 | 1040 | 280 |

非OKの内訳 (概数、複合判定を含む重複カウントなし): 種でない・種でない相当が大半を占め、次いで幼虫・蛹、画質不良、別種の疑いの順に多い。特に未公開分では、Naturalis Biodiversity Center (RMNH.INS) 由来の日本産蝶標本群で「空の標本箱とラベルのみ」というパターンが40件以上連続して見つかっており、単発の見落としではなくデータ取得工程の系統的な欠陥である可能性が高い。同様に USNM由来のトンボ標本群でも、背景未処理のままラベルカードを主要被写体としてクロップしてしまうパターンが2バッチにわたり見つかっている。

## 5. 手法についての注記

判定は各画像を目視で確認し、対応するmetadataのspecies_id・scientific_name・species_ja・institutionと突き合わせて行った。曖昧な場合はmetadataのsourceMediaUrl・localityVerbatim・notes等の付随情報も参照し、画像の実際の出所キャプションと図鑑上のclaim種名が一致するかを確認した。別種の疑いの判定は、体制 (目・科レベル) が明確に異なる場合、またはmetadata自体がclaim種と異なる学名を記載している場合に限定し、写真だけでは判別できない種内変異・亜種レベルの不確実性では判定しないよう努めた。

公開中168種のうち8種 (futasuji_tsuyumushi、hosonaga_kamakiri、midori_suji_ageha、onaji_shoujoubae、saku_kikuimushi、tatesuji_yaga、toge_hiza_inago、usucha_hekusodon) はzukan_cards以下に対応するmetadataが存在せず、bugs.js上でrenderer (procedural drawing) によって描画される種であることをzukan_config/zukan_catalog.jsおよびshared/bugs.jsの参照で確認した。これらは写真cardの内容検査という本タスクの対象外である。

この検査は読み取り専用で実施し、コード・catalog・zukan_cards以下のいずれのファイルも変更していない。

## 6. 対応記録 (2026-08-18 追記): 推奨処置の適用と再fetch候補

上記の推奨処置を、user承認のもと公開中 (マダガスカルI・オーストラリアI) の範囲で一括適用した。方針は「不良写真はzukan_config/zukan_catalog.jsからエントリを外し、shared/zukan_render.js / shared/zukan_detail.jsの標準fallback (SVG描画・出典表記なし) に委ねる」。zukan_cards以下の物理ファイルは変更していない (catalog側の参照のみ変更)。

### 6.1 誤参照バグ (最優先節) の原因

kiboshi_kuro_hishibatta (キボシクロヒシバッタ) のcatalogエントリは、image.display以下がmadagasukaru_oo_tagame (マダガスカルオオタガメ) と全く同じ物理ファイル (WIKIPEDIAWP_L2_grade.webp 一式) を指す一方、specimen/sourceはWikipedia「カニ」記事のデータになっており、名称・画像・source データが三者三様に食い違っていた。zukan_cards/metadata以下にkiboshi_kuro_hishibatta自身のmetadata (species_idで検索、scientificName "Oxytettix arius"で検索とも0件) は存在せず、専用の正しい写真は取得されていない。よってcatalogからエントリごと削除し、renderer (SVGのbatta描画) fallbackへ切り替えた。madagasukaru_oo_tagame側のエントリ (image/specimen/sourceとも「タガメ」で一貫) は誤りがないことを確認し、無変更で維持した。

### 6.2 適用結果

- catalogから削除: 23種 (誤参照バグ1種 + 品質問題22種)。zukan_config/zukan_catalog.jsのentry数は1052 → 1029。
- 品質問題は本文表 (11-41行目) に22行 (kiboshi_kuro_hishibattaを除く) 記載されており、初回の一括適用指示で見積もった「21件」より1件多かった。原因は指示側の集計ずれと判断し、表に載った22件全件を処置した (超過1件はneomantis_australisで、他と同じく「別種の疑い」として写真が種の実態と一致しないため対象に含めて妥当と判断)。
- 除外後、shared/zukan_render.js (catalog miss → SVG/bespoke fallback) と shared/zukan_detail.js (catalog miss → specimenInfoHTML が空文字、出典/ライセンス表記なし) の経路をtests/test_zukan_catalog_bad_photo_removal.jsで検証し、いずれも正しく機能することを確認した。thumb54/108/216を含め、削除した23種の物理ファイル名への参照はcatalog以外のどのcommittedファイルにも残っていない (repo全体をgrepして確認)。

### 6.3 再fetch候補 (catalogから外した23種)

| species_id | 和名 | 旧source (institution / catalogNumber) | 問題分類 |
|---|---|---|---|
| kiboshi_kuro_hishibatta | キボシクロヒシバッタ | WIKIPEDIA / WP:カニ (誤って madagasukaru_oo_tagame の写真ファイルを共有参照) | catalog誤参照 (別種の写真) |
| coccinella_transversalis | ヤマイチテントウ | AM / K.135602 | 種でない (単一個体の全身像でない) |
| coelophora_inaequalis | カタボシテントウ | AM / K.255710 | 種でない (ラベルが大半、本体極小) |
| kinoko_kikuimushi | キノコキクイムシ | AM / K.618096 | 種でない (不定形の塊のみ) |
| suzukuri_konajirami | スヅクリコナジラミ | NHMUK / NHMUK010134465 | 種でない (ラベルのみ) |
| oo_beni_hagoromo | オオベニハゴロモ | NHMUK / NHMUK010634825 | 種でない (ラベルのみ) |
| kuroboshi_maru_kaigaramushi | クロボシマルカイガラムシ | NHMUK / NHMUK014273276 | 種でない (ラベル+微小断片) |
| ohishiba_kuro_aburamushi | オヒシバクロアブラムシ | NHMUK / NHMUK014865400 | 種でない (ラベル/容器/封筒) |
| afurika_yamato_shijimi | アフリカヤマトシジミ | RMNH / RMNH.INS.1416690 | 種でない (ラベルが大半、断片のみ) |
| akamarubane_monki_tateha | アカマルバネモンキタテハ | RMNH / RMNH.INS.378693 | 種でない (ラベル台紙のみ) |
| hagata_murasaki | ハガタムラサキ | RMNH / RMNH.INS.378953 | 種でない (ラベル台紙のみ) |
| suji_mori_tonbo | スジモリトンボ | USNM / USNMENT00277591 | 種でない (2個体合成) |
| gin_haneguro_tonbo | ギンハネグロトンボ | USNM / USNMENT00278005 | 種でない (2個体合成) |
| madagasukaru_gin_yanma | マダガスカルギンヤンマ | USNM / USNMENT00328292 | 種でない (破損標本、3パーツ分離) |
| haneashi_ito_tonbo | ハネアシイトトンボ | USNM / USNMENT00343942 | 種でない (ラベルが大半) |
| tsuchiiro_ito_tonbo | ツチイロイトトンボ | USNM / USNMENT00391718 | 種でない (2個体合成) |
| kanmuri_kareha_kamakiri | カンムリカレハカマキリ | WIKIPEDIA / WP:Phyllocrania | 種でない (2個体+コイン) |
| chamadara_tobibatta | チャマダラトビバッタ | WMC / File:DruryV1P049AA.jpg | 種でない (1837年博物図版、異種混在) |
| madagasukaru_oo_gokiburi | マダガスカルオオゴキブリ | WMC / File:Gromphadorhina portentosa 2.jpg | 種でない (脱皮殻/未成熟+成虫の2物体) |
| scutiphora_pedicellata | (和名なし、Scutiphora pedicellata) | WMC / File:Metallic Shield Bug...jpg | 種でない (3パネル合成コラージュ) |
| tsuya_oozu_ari | ツヤオオズアリ | WMC / File:Pheidole megacephala 333840401.jpg | 種でない (アリ2個体+別種死骸混入) |
| aka_tobibatta | アカトビバッタ | WMC / File:Red locust with Metarhizium.jpg | 種でない (菌害死個体の集合) |
| neomantis_australis | (和名なし、Neomantis australis) | iNat / iNat_obs_197573116 | 別種の疑い (カマキリの体制と不一致) |

再fetchはzukan-fetch skillのtier順 (museum → WMC → iNat → Wikipedia infobox) に従い、上記のうち既にWMC/iNat/Wikipediaまで手を尽くして本結果になった種 (kanmuri_kareha_kamakiri、chamadara_tobibatta、madagasukaru_oo_gokiburi、scutiphora_pedicellata、tsuya_oozu_ari、aka_tobibatta、neomantis_australis、kiboshi_kuro_hishibatta) は同一tierの再検索では同じ結果に収束しやすい点に注意し、別catalogNumber個体の再検索や次段tierへの切替を検討する。

### 6.4 スコープ外で見つかった関連事象 (未対応、別途対応要)

catalog全体 (1052件時点) をkiboshi_kuro_hishibattaの誤参照パターンで横断検索したところ、同じ物理ファイル (WIKIPEDIAWP_L2_grade.webp、タガメの写真) をimage.displayに持つ本編 (非komorebi、areaOnly指定なし) のspeciesエントリが17件見つかった: ageha_himebachi、akahane_mushi、amami_shika_kuwagata、ao_kamikiri、beni_bekkoubachi、hamasuzu、kuro_suzu、ooki_no_komushi、oomizuao_oki、ranran_hana_kamakiri_dummy、sekai_saichou_nanafushi、tennen_kimadara_seseri、tokara_nokogiri_kuwagata、yaeyama_koku_kuwagata、yaeyama_nokogiri_kuwagata、yakushima_noko_kuwagata、yamato_batta。これらは今回のcard画像内容検査 (公開中168種=komorebiマダガスカルI/オーストラリアI、および未公開1160件=zukan_cards/metadataに実写metadataがある種) のいずれの走査対象にも含まれておらず (本編ロースターは今回未検査)、今回のタスク範囲外のため未修正のまま残している。ただしkiboshi_kuro_hishibattaと同一パターンの誤参照であることは確実 (画像=タガメ、specimenデータは各種バラバラの無関係な内容) なので、本編ロースターを対象にした同種の画像内容検査・catalog修正を別タスクとして早期に行うことを推奨する。
