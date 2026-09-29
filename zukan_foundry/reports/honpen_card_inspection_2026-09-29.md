# 本編カード写真の検品 (2026-09-29)

公開中の本編カード 868 枚を、48 枚ずつの一覧 19 枚にして 4 つの batch で目視した。あわせて zukan-fetch の品質ゲート (label_dominant を足した版) を display 画像に当てた。目視かゲートのどちらかで指摘のあった 215 枚は、種 ID を焼き込んだ確認用の一覧に並べ直し、1 枚ずつ見直して判定を確定した。

目視の batch はマス番号を 1 つ取り違えることがあった (シート 18 の 12 から 15 番を隣の枠の画像で判定していた)。この表の判定は見直し後のもので、batch の生の判定ではない。

判定の基準は 2026-09-29 の発案者決定に従う。同じ種の 2 個体の並び (背面と腹面、雌雄) は使える。3 個体以上の図版、ラベル主体、図版やイラスト、幼虫、体の一部だけの写真は不可。

## 結果

| 区分 | 枚数 |
|---|---:|
| 不可 (差し替え対象) | 185 |
| 4 個体の並び (扱いは発案者の判断待ち) | 5 |
| 種の取り違えの疑い | 3 |
| 見直しで OK に戻したもの | 22 |

不可の内訳は、ラベルや標本箱だけ、またはラベルが大半の写真が最も多い (RMNH の Satyrinae と Hesperiidae の標本箱写真がまとまって入っている)。次いで多数個体の図版、イラストや線画、幼虫、容器や巣の写真が続く。

## 4 個体の並び

雌雄それぞれの背面と腹面を並べた 4 個体の写真。2 個体までは使えると決まっているが、4 個体は 3 個体以上の図版の規則に当たる。シート 6 から 10 を見た batch は 4 個体を OK として扱ったため、その範囲にも同じ形のカードが指摘なしで残っている可能性がある。

| species_id | シート:枠 | 判定 | 指摘の出どころ |
|---|---|---|---|
| midorishijimi | sheet02:16 | 4 個体の並び | NOT_SPECIMEN 4個体の集合写真 / gate: multiple_subjects |
| ryukyu_uraboshi_shijimi |  | 4 個体の並び | gate: multiple_subjects |
| kita_kichou |  | 4 個体の並び | gate: multiple_subjects |
| kuro_midorishijimi |  | 4 個体の並び | gate: multiple_subjects |
| hime_midorishijimi |  | 4 個体の並び | gate: multiple_subjects |

## 種の取り違えの疑い

| species_id | シート:枠 | 判定 | 指摘の出どころ |
|---|---|---|---|
| shiokara_tonbo | sheet01:39 | 翅が緑に写り、シオカラトンボの見た目と合わない | WRONG_SPECIES 色柄がシオカラトンボと一致しない |
| suminagashi | sheet02:38 | 赤褐色に橙の斑で、スミナガシの青黒い地色と合わない | WRONG_SPECIES 橙班紋様で別種に見える |
| oo_aoboshi_kamikiri | sheet17:31 | 淡い桃色のカミキリで、和名の青い星と合わない | WRONG_SPECIES 青灰色の斑紋がなくピンク色の別個体 |

## 同じ写真を共有しているカード

display 画像が同じカードが 28 組ある。多くは同じ種の別 ID (master_ 版、_ss 版、雌の別カードなど) だが、別の種どうしが同じ写真を使っている組も含まれる。

| 組 | 見立て |
|---|---|
| kuro_tsuchibachi / naki_kumabachi | 別種 |
| juushihoshi_tentou / shiro_juni_hoshi_tentou | 別種 |
| kurokonomachou / kono_maron | 要確認 |
| shirokobu_zoumushi / hime_botan_zou | 別種 |
| sentou_kamikiri / sennoki_kamikiri | 別種 |
| shiroten_hanamuguri / oo_hana_muguri | 別種 |
| hanamuguri / ao_hanamuguri | 要確認 |
| kuro_osamushi / oo_kubonaga_gomimushi | 別種 |
| ubatama_kometsuki / oo_futa_mon_kometsuki | 別種。写真自体も不可 |
| nami_tentou / naden_tentou | 別種。写真自体も不可 |
| kusakagerou / oo_kakagerou_dummy | 別種。写真自体も不可 |
| lateralis_noko_kuwagata / eurosternus_noko_kuwagata | 別種。写真自体も不可 |
| master_urania / nishiki_tsubamega | 同じ種 |
| akasuji_kin_kamemushi / master_nishiki_kin_kamemushi | 要確認 |
| tanbo_koorogi / hatake_korogi、kirigirisu / nishi_kirigirisu、umaoi / hatakeno_umaoi、hishibatta / hara_hishi_batta | 近縁の別種の可能性。要確認 |
| その他 (agehachou / namiageha、gengorou / nami_gengorou、amenbo / nami_amenbo ほか) | 同じ種の別 ID |

## 見直しで OK に戻したもの

| species_id | シート:枠 | 判定 | 指摘の出どころ |
|---|---|---|---|
| higurashi | sheet01:37 | 同種 2 個体の並び | NOT_SPECIMEN 同種2個体が並んでいる |
| nishiki_hanmyou | sheet02:14 | 同種 2 個体の並び | NOT_SPECIMEN 雌雄2個体が並んでいる |
| hisamatsu_midorishijimi | sheet02:24 | 雌雄 2 個体の並び | NOT_SPECIMEN 色の異なる2個体が並んでいる |
| kirishima_midorishijimi | sheet02:25 | 雌雄 2 個体の並び | NOT_SPECIMEN 色の異なる2個体が並んでいる |
| aodougane | sheet04:5 | 同種 2 個体 (生体) | NOT_SPECIMEN 2個体が重なっている |
| koao_hanamuguri | sheet04:12 | 同種 2 個体 (背面と側面) | NOT_SPECIMEN 異なる2個体が並んでいる |
| asagimadara | sheet05:6 | 背面と腹面の並び。配色は標本の色として範囲内 | WRONG_SPECIES 配色がアサギマダラと一致しない |
| koyama_tonbo | sheet11:1 | 側面の全身 | NOT_SPECIMEN 交尾中の2匹のトンボが重なっている |
| oohoshi_kamemushi | sheet11:39 | 同種 2 個体の並び | NOT_SPECIMEN 2匹の別個体が並んでいる |
| ooyokobai_aobaha | sheet12:5 | 同種 2 個体の並び | NOT_SPECIMEN 同種2個体が重なって写っている |
| tsukuhoushi_replaced_aotsukutsuku | sheet12:8 | 同種 2 個体の並び | NOT_SPECIMEN 同一姿勢のセミが2個体並んでいる |
| ootabu_suzumebachi | sheet12:21 | 同種 2 個体の並び | NOT_SPECIMEN ハチ3匹が並んだコラージュ |
| tarandus_kuwagata | sheet13:18 | 全身。脚の色がやや青い | POOR 脚に不自然な青いカビ状の変色 |
| shirohoshi_kokemeiga | sheet16:31 | 成虫の全身 (幼虫ではない) | LARVA 蛹または繭のような形状 |
| yotsubishi_kamemushi | sheet17:9 | 同種 2 個体の並び | NOT_SPECIMEN カメムシ2匹が並んでいる |
| kin_bae | sheet17:16 | 針刺し標本の全身 | NOT_SPECIMEN ハエが2匹重なって写っている |
| master_ruri_janome | sheet18:12 | 全身 (隣の枠との取り違えによる誤指摘) | WRONG_SPECIES 瑠璃色の目玉模様がなく別種の蛾 |
| master_promethea | sheet18:13 | 全身 (同上) | WRONG_SPECIES プロメテアでなくウラニア柄の蛾 |
| master_urania | sheet18:14 | 全身 (同上) | WRONG_SPECIES 蛾でなく甲虫が写っている |
| master_niji_daikoku | sheet18:15 | 全身 (同上) | WRONG_SPECIES クワガタでなくカメムシが写っている |
| violin_mushi | sheet18:43 | バイオリンムシの全身 | WRONG_SPECIES 平たいバイオリン体型でなくゾウムシ状 |
| chrysochroa_tamamushi | sheet19:4 | Chrysochroa の全身 | WRONG_SPECIES 金属光沢でなく黒斑紋の別種に見える |

## 不可

| species_id | シート:枠 | 判定 | 指摘の出どころ |
|---|---|---|---|
| oomurasaki | sheet01:12 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| ookamakiri | sheet01:23 | 不可 | POOR 頭部前脚のみで体が写っていない |
| kumazemi | sheet01:24 | 不可 | NOT_SPECIMEN 写真でなく線画イラスト |
| nanahoshi_tentou | sheet01:32 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_dominant |
| nami_tentou |  | 不可 | gate: label_dominant |
| kuro_ooari | sheet01:34 | 不可 | POOR 頭部のみで体が写っていない |
| minminzemi | sheet01:36 | 不可 | NOT_SPECIMEN 分布地図で虫が写っていない |
| tonosama_batta | sheet01:41 | 不可 | POOR しなびて形状が不明瞭 |
| ramie_kamikiri | sheet02:4 | 不可 | LARVA 成虫でなく幼虫 |
| ruriboshi_kamikiri | sheet02:5 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| ao_osamushi | sheet02:12 | 不可 | WRONG_SPECIES 青くなく別の虫に見える |
| kawara_hanmyou | sheet02:15 | 不可 | NOT_SPECIMEN 多数標本の図版 / gate: multiple_subjects |
| aino_midorishijimi | sheet02:17 | 不可 | NOT_SPECIMEN 多数標本の図版 / gate: multiple_subjects |
| benihikage | sheet02:33 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| usubashirochou | sheet02:35 | 不可 | NOT_SPECIMEN 多数標本の図版 / gate: multiple_subjects |
| oo_ichimonji | sheet02:43 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい |
| sakahachichou | sheet02:44 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| banana_seseri | sheet02:47 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| akaboshi_gomadara | sheet03:4 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| onaga_ageha | sheet03:14 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| jakou_ageha | sheet03:15 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| shiroobi_ageha | sheet03:17 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| yaeyama_karasu_ageha | sheet03:18 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_dominant |
| tomon_ageha | sheet03:21 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_border |
| oouragin_hyoumon | sheet03:24 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| uraginsuji_hyoumon | sheet03:25 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| oouraginsuji_hyoumon | sheet03:26 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| mesuguro_hyoumon | sheet03:27 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| hyoumonmodaki | sheet03:33 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| himejanome | sheet03:35 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| kojanome | sheet03:36 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| kurohikage | sheet03:37 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| hikagechou | sheet03:38 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| satokimadara_hikage | sheet03:39 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| himeuranami_janome | sheet03:41 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| uranami_janome | sheet03:42 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| kimadara_modoki | sheet03:44 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| tsumajiro_uragoma_janome | sheet03:45 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| hikage_janome | sheet03:46 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| kurohikage_modoki | sheet03:47 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| saikabuto | sheet04:3 | 不可 | NOT_SPECIMEN 虫でなく容器のみ |
| douganebuibui | sheet04:6 | 不可 | NOT_SPECIMEN 多数個体の集合写真 / gate: multiple_subjects |
| koganemushi | sheet04:7 | 不可 | NOT_SPECIMEN 多数個体の集合写真 / gate: multiple_subjects |
| maguso_kogane | sheet04:14 | 不可 | NOT_SPECIMEN 写真でなくイラスト |
| kuwagata_hanamuguri | sheet04:15 | 不可 | NOT_SPECIMEN 多数個体の集合写真 / gate: multiple_subjects |
| miyama_kamikiri | sheet04:16 | 不可 | NOT_SPECIMEN 写真でなくイラスト |
| ebiiro_kamikiri | sheet04:22 | 不可 | NOT_SPECIMEN 多数個体の集合写真 |
| budou_tora_kamikiri | sheet04:28 | 不可 | NOT_SPECIMEN 虫に見えない画像 |
| kuwakamikiri | sheet04:29 | 不可 | NOT_SPECIMEN イラストで3個体 / gate: multiple_subjects |
| hoshibeni_kamikiri | sheet04:36 | 不可 | NOT_SPECIMEN イラストの集合図 |
| kameno_ko_hamushi | sheet04:43 | 不可 | NOT_SPECIMEN 虫でなく容器のみ |
| tsuya_hada_kuwagata | sheet05:5 | 不可 | LARVA 成虫でなく幼虫 |
| konohachou | sheet05:12 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| tenguchou | sheet05:13 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| ishigakechou | sheet05:14 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| tatehamodoki | sheet05:15 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい |
| ichimonji_seseri | sheet05:18 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい |
| chabane_seseri | sheet05:19 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_dominant |
| miyama_chabane_seseri | sheet05:21 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_dominant |
| sujigurochabane_seseri | sheet05:23 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| kimadara_seseri | sheet05:24 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| miyama_seseri | sheet05:28 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| kuro_seseri | sheet05:30 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_dominant |
| hoshichabane_seseri | sheet05:31 | 不可 | NOT_SPECIMEN 多数個体の集合写真 / gate: multiple_subjects |
| chamadara_seseri | sheet05:32 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: multiple_subjects |
| kuroboshi_seseri | sheet05:33 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| yuurei_seseri | sheet05:34 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| okinawa_birodo_seseri | sheet05:36 | 不可 | NOT_SPECIMEN テキストのみで虫が写っていない / gate: multiple_subjects |
| sugitani_rurishijimi | sheet05:38 | 不可 | NOT_SPECIMEN ラベルが大半で虫が小さい / gate: label_dominant |
| oogomashijimi | sheet05:44 | 不可 | NOT_SPECIMEN 多数個体の集合写真 / gate: multiple_subjects |
| kurotsubame_shijimi | sheet05:45 | 不可 | NOT_SPECIMEN 虫でなく容器・ラベルのみ |
| taiwan_kuroboshi_shijimi | sheet05:48 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない |
| tsubamehazurao_shijimi | sheet06:1 | 不可 | NOT_SPECIMEN ラベルのみで虫がほぼ写っていない / gate: label_dominant |
| amida_shijimi | sheet06:2 | 不可 | NOT_SPECIMEN ラベルが主体で虫が極小 / gate: label_dominant |
| sokorabe_ruri_shijimi | sheet06:3 | 不可 | NOT_SPECIMEN 標本一覧の集合写真 / gate: multiple_subjects |
| yakushima_ruri_shijimi | sheet06:4 | 不可 | NOT_SPECIMEN ラベルが主体で虫が極小 / gate: label_dominant |
| iwakawa_shijimi | sheet06:6 | 不可 | NOT_SPECIMEN ラベルが主体で虫が極小 / gate: label_dominant |
| ruri_uranami_shijimi | sheet06:7 | 不可 | NOT_SPECIMEN ラベルが主体で虫が極小 / gate: label_dominant |
| shirouranami_shijimi | sheet06:8 | 不可 | NOT_SPECIMEN タグが主体で虫が断片的 |
| tappi_shijimi | sheet06:9 | 不可 | NOT_SPECIMEN ラベルが主体で虫が極小 / gate: label_dominant |
| kuronaga_osamushi | sheet06:35 | 不可 | NOT_SPECIMEN データラベルのみで虫なし / gate: label_rectangle |
| oo_gomimushi | sheet06:39 | 不可 | NOT_SPECIMEN 虫に見えない物体の集合 / gate: multiple_subjects |
| eltateha | sheet06:44 | 不可 | NOT_SPECIMEN データラベルのみで虫なし / gate: label_border |
| ruritateha | sheet06:48 | 不可 | NOT_SPECIMEN データラベルのみで虫なし |
| gomadarachou | sheet07:2 | 不可 | NOT_SPECIMEN 標本箱ラベルのみで虫なし / gate: label_rectangle |
| kobatateha | sheet07:7 | 不可 | NOT_SPECIMEN タグが主体で虫が極小 |
| sasakia_oomurasaki_ss | sheet07:10 | 不可 | NOT_SPECIMEN 標本箱ラベルのみで虫なし / gate: label_rectangle |
| araschnia_sakahachi_aki | sheet07:12 | 不可 | NOT_SPECIMEN 標本箱ラベルのみで虫なし / gate: label_rectangle |
| fuji_midorishijimi | sheet07:14 | 不可 | NOT_SPECIMEN 標本一覧の集合写真 / gate: multiple_subjects |
| urakuro_shijimi | sheet07:15 | 不可 | NOT_SPECIMEN イラスト図版で写真でない / gate: multiple_subjects |
| uramisuji_shijimi | sheet07:16 | 不可 | NOT_SPECIMEN 標本一覧の集合写真 / gate: multiple_subjects |
| usuiro_onaga_shijimi | sheet07:19 | 不可 | NOT_SPECIMEN 標本一覧の集合写真 / gate: multiple_subjects |
| onaga_shijimi | sheet07:20 | 不可 | NOT_SPECIMEN 標本一覧の集合写真 / gate: multiple_subjects |
| kotsubame | sheet07:22 | 不可 | NOT_SPECIMEN 標本一覧の集合写真 / gate: multiple_subjects |
| akashijimi_minami | sheet07:26 | 不可 | NOT_SPECIMEN 分布図のみで虫が写っていない |
| marutan_yanma | sheet07:32 | 不可 | NOT_SPECIMEN 標本が破損し腹部が分離 |
| hatchou_tonbo | sheet08:4 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| kiito_tonbo | sheet08:7 | 不可 | NOT_SPECIMEN データラベルのみで虫がほぼ無い / gate: label_rectangle |
| kuroito_tonbo | sheet08:9 | 不可 | NOT_SPECIMEN 標本が破損し脚等が散乱 |
| tsuyumushi | sheet08:32 | 不可 | NOT_SPECIMEN 花の写真で虫が極小 |
| oo_suzumebachi | sheet08:45 | 不可 | NOT_SPECIMEN 5匹の集合写真 |
| kogata_suzumebachi | sheet08:47 | 不可 | NOT_SPECIMEN 3匹並んだ集合写真 / gate: multiple_subjects |
| kuroyama_ari | sheet09:5 | 不可 | NOT_SPECIMEN 頭部の合成画像で全身でない |
| kuro_gengorou | sheet09:11 | 不可 | NOT_SPECIMEN 植物のイラストで虫でない |
| haiiro_gengorou | sheet09:13 | 不可 | NOT_SPECIMEN 線画の分類図版で写真でない / gate: multiple_subjects |
| ojiro_ashinaga_zoumushi | sheet09:17 | 不可 | NOT_SPECIMEN 虫が極小で判別不能 |
| kususan | sheet09:36 | 不可 | NOT_SPECIMEN 6匹の集合写真 |
| shinjusan | sheet09:38 | 不可 | NOT_SPECIMEN 多数個体が重なった集合写真 |
| kurousutabiga | sheet09:41 | 不可 | NOT_SPECIMEN 多数個体の集合写真 / gate: multiple_subjects |
| kaiko_moth | sheet09:42 | 不可 | NOT_SPECIMEN 繭のみで成虫が写っていない |
| agehamodoki |  | 不可 | gate: multiple_subjects |
| yotsumeaoshaku |  | 不可 | gate: label_dominant |
| akahige_dokuga | sheet10:9 | 不可 | LARVA 幼虫（毛虫）で成虫でない |
| maimaiga | sheet10:16 | 不可 | LARVA 幼虫（毛虫）で成虫でない |
| tobimon_ooedashaku | sheet10:17 | 不可 | LARVA シャクトリムシ幼虫で成虫でない |
| asia_ito_tonbo | sheet10:42 | 不可 | NOT_SPECIMEN データラベルのみで虫なし / gate: label_rectangle |
| oo_ito_tonbo | sheet10:44 | 不可 | NOT_SPECIMEN データラベルのみで虫なし / gate: label_rectangle |
| hosomi_ito_tonbo | sheet10:45 | 不可 | NOT_SPECIMEN データラベルのみで虫なし / gate: label_rectangle |
| kosanae | sheet11:5 | 不可 | NOT_SPECIMEN 標本が破損し腹部が分離している |
| ao_sanae | sheet11:7 | 不可 | LARVA 翅のないヤゴ状の幼虫の体つき |
| mitsukado_koorogi | sheet11:19 | 不可 | NOT_SPECIMEN 2匹のコオロギが重なっている |
| tsuno_kamemushi_esaki_replaced | sheet12:1 | 不可 | NOT_SPECIMEN 4種の異なる虫のコラージュ / gate: multiple_subjects |
| tsunozemi_marubane | sheet12:7 | 不可 | NOT_SPECIMEN 植物のイラストで虫が小さすぎる |
| monsuzumebachi | sheet12:18 | 不可 | NOT_SPECIMEN ハチ3匹が並んだコラージュ / gate: multiple_subjects |
| kuro_suzumebachi | sheet12:20 | 不可 | NOT_SPECIMEN 幼虫や蛹の塊で成虫が写っていない |
| futamon_ashinagabachi | sheet12:23 | 不可 | NOT_SPECIMEN 巣のみで虫本体が写っていない |
| nihon_ashinagabachi | sheet12:25 | 不可 | NOT_SPECIMEN 巣のみで虫本体が写っていない |
| yamato_kuroshijimi_hebitonbo_dummy |  | 不可 | gate: label_border |
| kibara_kamakirimodoki | sheet12:42 | 不可 | NOT_SPECIMEN イラストの虫6体のコラージュ / gate: multiple_subjects |
| kusakagerou | sheet12:43 | 不可 | NOT_SPECIMEN 絵画調イラストで翅の破片も別写り / gate: multiple_subjects |
| oo_kakagerou_dummy | sheet12:44 | 不可 | NOT_SPECIMEN 絵画調イラストで翅の破片も別写り / gate: multiple_subjects |
| mikado_gagambo | sheet13:3 | 不可 | NOT_SPECIMEN 白黒の解剖図イラストで写真でない / gate: label_rectangle |
| oo_hanaabu_oddball_dummy | sheet13:4 | 不可 | NOT_SPECIMEN 果実や種の連なりで虫が写っていない |
| ni_idolomantis_diabolica | sheet13:8 | 不可 | POOR 体の形が判別できずしおれた葉のよう |
| muna_biro_kamakiri_dummy | sheet13:12 | 不可 | NOT_SPECIMEN カマキリと別の小さな虫が並んでいる |
| lateralis_noko_kuwagata | sheet13:23 | 不可 | NOT_SPECIMEN 白黒の版画イラストで写真でない |
| siamensis_atlas_kabuto | sheet13:26 | 不可 | NOT_SPECIMEN ラベルのみで虫本体が写っていない / gate: label_dominant |
| ubatama_kometsuki | sheet13:30 | 不可 | NOT_SPECIMEN 甲虫2匹が重なって写っている |
| gomimushidamashi_kohira | sheet13:32 | 不可 | NOT_SPECIMEN ラベル中心で虫がほぼ写っていない / gate: label_dominant |
| katsuobushi_mushi | sheet13:36 | 不可 | NOT_SPECIMEN 大きなラベルに対し虫が極小 / gate: label_dominant |
| kiobinaga_kakkoumushi | sheet13:37 | 不可 | NOT_SPECIMEN 容器のような丸い物体で虫でない |
| yomogi_ediba |  | 不可 | gate: label_dominant |
| yumon_eda_shaku | sheet14:7 | 不可 | NOT_SPECIMEN 蛾12匹の図版コラージュ / gate: multiple_subjects |
| oba_kuwa_eda_shaku | sheet14:8 | 不可 | NOT_SPECIMEN 分布図のみで虫が写っていない / gate: multiple_subjects |
| tama_oshi_zou | sheet14:23 | 不可 | NOT_SPECIMEN 容器のような丸い物体で虫でない |
| kibara_tentou | sheet14:27 | 不可 | LARVA 蛹状の未成熟部分が付着している |
| dandara_tentou | sheet14:29 | 不可 | NOT_SPECIMEN ラベルのみで虫本体が写っていない |
| oo_futa_mon_kometsuki | sheet15:8 | 不可 | NOT_SPECIMEN 甲虫2匹が重なって写っている |
| hime_nagakamemushi | sheet15:17 | 不可 | NOT_SPECIMEN ラベルのみで虫本体が写っていない / gate: label_dominant |
| kobane_ashinaga_bachi | sheet15:22 | 不可 | NOT_SPECIMEN 木片とハチ複数のコラージュ / gate: multiple_subjects |
| kubinaga_ari | sheet15:25 | 不可 | NOT_SPECIMEN 標本が破損し破片が散らばっている |
| kuro_hira_taabu |  | 不可 | gate: multiple_subjects |
| hito_suji_shima_ka | sheet15:33 | 不可 | NOT_SPECIMEN 標本箱のみで虫がごく小さい点 / gate: label_rectangle |
| oo_yokobai |  | 不可 | gate: label_rectangle |
| tsumaguro_suzumebachi | sheet16:3 | 不可 | NOT_SPECIMEN 標本トレイの集合写真、単体でない / gate: multiple_subjects |
| oo_zu_ari | sheet16:5 | 不可 | NOT_SPECIMEN 大小2個体のアリが並んでいる |
| gunbai_tonbo | sheet16:9 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| suna_akane | sheet16:14 | 不可 | NOT_SPECIMEN 本体と破片が分離した壊れた標本 |
| akama_dara_hanamuguri | sheet16:20 | 不可 | NOT_SPECIMEN ラベルカードのみで虫が写っていない |
| inago_hamushi | sheet16:21 | 不可 | NOT_SPECIMEN バーコードラベルのみで虫がいない |
| hime_shaku | sheet16:39 | 不可 | LARVA 幼虫(イモムシ)で成虫でない |
| hime_silvia_shijimi | sheet16:40 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| taiwan_tsubame_shijimi | sheet16:41 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| goma_fu_kamikiri | sheet17:1 | 不可 | NOT_SPECIMEN 小さな断片のみで甲虫本体が見えない / gate: multiple_subjects |
| ko_fuki_kogane | sheet17:2 | 不可 | NOT_SPECIMEN 標本トレイの集合写真 / gate: multiple_subjects |
| tama_keshikisui | sheet17:6 | 不可 | NOT_SPECIMEN 標本トレイの集合写真 / gate: multiple_subjects |
| morton_ito_tonbo | sheet17:20 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_rectangle |
| ezo_ito_tonbo | sheet17:21 | 不可 | NOT_SPECIMEN ラベルのみで虫が写っていない / gate: label_dominant |
| naden_tentou | sheet17:36 | 不可 | NOT_SPECIMEN バーコードラベルのみで虫がいない / gate: label_dominant |
| kuriya_keshikisui | sheet17:38 | 不可 | NOT_SPECIMEN 粒状の物体が3つ並び単体でない |
| sedo_oo_gomimushi |  | 不可 | gate: multiple_subjects |
| oo_kibara_gomimushi | sheet17:45 | 不可 | NOT_SPECIMEN 線画イラストで写真でない / gate: label_rectangle |
| halmus_aoba_tentou | sheet17:47 | 不可 | WRONG_SPECIES 丸いテントウムシでなく細長い体形 |
| yotsuboshi_ookisui |  | 不可 | gate: multiple_subjects |
| haiiro_maru_hanabachi | sheet18:5 | 不可 | NOT_SPECIMEN 虫が非常に小さくラベルが主体 / gate: label_dominant |
| master_amer_aoichimonji | sheet18:9 | 不可 | NOT_SPECIMEN ラベルカードのみで虫がいない / gate: label_rectangle |
| master_claudina | sheet18:10 | 不可 | NOT_SPECIMEN ラベルカードのみで虫がいない / gate: label_rectangle |
| master_luna_moth | sheet18:11 | 不可 | WRONG_SPECIES 黄緑色や尾状突起がなく別種の蝶 / gate: label_dominant |
| eurosternus_noko_kuwagata | sheet18:31 | 不可 | NOT_SPECIMEN 線画イラストで写真でない |
| oo_geji | sheet18:37 | 不可 | NOT_SPECIMEN ゲジと獲物の2個体が写っている |
| mozu | sheet18:41 | 不可 | NOT_SPECIMEN 生物が写らずメモ用紙のみ / gate: multiple_subjects |
| eupholus_zou | sheet18:42 | 不可 | NOT_SPECIMEN ラベルカードのみで虫がいない / gate: label_dominant |
| scarabe_sacer | sheet18:44 | 不可 | NOT_SPECIMEN 線画イラストで写真でない / gate: multiple_subjects |
| ookiba_usuba_kamikiri | sheet18:48 | 不可 | NOT_SPECIMEN ラベルカードのみで虫がいない / gate: label_dominant |
| eliza_hanmyo | sheet19:2 | 不可 | NOT_SPECIMEN 顎の線画イラストで写真でない / gate: multiple_subjects |
