(function(global){
  "use strict";

  /* Phase 3 の検証用 fixture。実在の地域名と blurb を使うが、種 id は架空で
     どのカタログにも存在しない (実データは Phase 0b の選抜後に差し替える)。
     4 地域あるのは、地図のピンが増えたときの見え方と、ピンを選び替えたときの
     一覧の入れ替わりを実機で確かめるため。 */
  var volumes=global.Q4B_KOMOREBI_VOLUMES||{};

  function pad(n){return ("0"+n).slice(-2);}

  function speciesSet(prefix,counts){
    var list=[],i;
    for(i=1;i<=counts.n;i++)list.push({id:prefix+"_n_"+pad(i),rarity:"N",flagship:false});
    for(i=1;i<=counts.r;i++)list.push({id:prefix+"_r_"+pad(i),rarity:"R",flagship:false});
    for(i=1;i<=counts.sr;i++)list.push({id:prefix+"_sr_"+pad(i),rarity:"SR",flagship:false});
    list.push({id:prefix+"_sr_flagship",rarity:"SSR",flagship:true});
    return list;
  }

  function volume(config){
    var species=speciesSet(config.prefix,config.counts);
    return {
      id:config.id, regionId:config.regionId, regionName:config.regionName,
      current:!!config.current, expedition:config.expedition||1,
      placeholder:!!config.placeholder,
      categories:config.categories, blurb:config.blurb,
      frozen:true, denominator:species.length, species:species
    };
  }

  /* マダガスカルは実在種 12 種 (bugs.js に areaOnly で登録済み)。捕獲カードと図鑑が
     本編と同じ描画資産で出る。他 3 地域は形と進捗の見比べ用の合成 fixture のまま。 */
  /* マダガスカル遠征 I: 実在 84 種 (bugs.js に areaOnly で登録済み)。看板はコメットガ。
     他 3 地域は地図の見え方確認用の合成 fixture のまま。 */
  volumes.volume_fixture={
    id:"volume_fixture", regionId:"madagascar", regionName:"マダガスカル", current:true, expedition:1,
    /* 更新 1 の実カテゴリ 5 本 (release_linkage 2 章の倍速カレンダー)。 */
    categories:["kom_ratio","kom_pi314","kom_kuku_dan2","kom_kuku_dan5","kom_kuku_run"],
    blurb:"アフリカの東にうかぶ大きな島。日本の 1.6 倍。ここにしかいない虫がとても多い。",
    frozen:true, denominator:84,
    species:[{"id": "oo_onaga_yamamayu", "rarity": "SSR", "flagship": true},{"id": "hagata_murasaki", "rarity": "SR", "flagship": false}, {"id": "akamarubane_monki_tateha", "rarity": "R", "flagship": false}, {"id": "serikorunisu_nokogiri_kuwagata", "rarity": "R", "flagship": false}, {"id": "madagasukaru_oo_gokiburi", "rarity": "R", "flagship": false}, {"id": "oo_beni_hagoromo", "rarity": "N", "flagship": false}, {"id": "madagasukaru_tatehamodoki", "rarity": "N", "flagship": false}, {"id": "afurika_onashi_ageha", "rarity": "N", "flagship": false}, {"id": "suji_tsumaaka_shirochou", "rarity": "N", "flagship": false}, {"id": "usucha_hekusodon", "rarity": "N", "flagship": false}, {"id": "ameiro_tonbo", "rarity": "N", "flagship": false}, {"id": "tsuya_oozu_ari", "rarity": "N", "flagship": false}, {"id": "gin_haneguro_tonbo", "rarity": "N", "flagship": false}, {"id": "harabiro_aka_tonbo", "rarity": "N", "flagship": false}, {"id": "ao_shiokara_tonbo", "rarity": "N", "flagship": false}, {"id": "madagasukaru_beni_tonbo", "rarity": "R", "flagship": false}, {"id": "daidai_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "madagasukaru_mori_tonbo", "rarity": "SR", "flagship": false}, {"id": "akaashi_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "obibane_tonbo", "rarity": "N", "flagship": false}, {"id": "haneashi_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "midori_kawa_tonbo", "rarity": "R", "flagship": false}, {"id": "sorairo_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "murasaki_beni_tonbo", "rarity": "R", "flagship": false}, {"id": "suji_mori_tonbo", "rarity": "N", "flagship": false}, {"id": "kuro_shiokara_tonbo", "rarity": "N", "flagship": false}, {"id": "sukeba_chou_tonbo", "rarity": "SR", "flagship": false}, {"id": "kuro_beni_tonbo", "rarity": "N", "flagship": false}, {"id": "kuro_hime_tonbo", "rarity": "N", "flagship": false}, {"id": "sesuji_aka_tonbo", "rarity": "N", "flagship": false}, {"id": "tsuchiiro_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "hyoutan_tonbo", "rarity": "R", "flagship": false}, {"id": "shikatsuno_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "madagasukaru_gin_yanma", "rarity": "SR", "flagship": false}, {"id": "misuji_yama_tonbo", "rarity": "R", "flagship": false}, {"id": "megane_shiokara_tonbo", "rarity": "N", "flagship": false}, {"id": "ruriiro_tonbo", "rarity": "N", "flagship": false}, {"id": "ko_shiokara_tonbo", "rarity": "N", "flagship": false}, {"id": "kinbane_beni_tonbo", "rarity": "R", "flagship": false}, {"id": "hikari_ito_tonbo", "rarity": "N", "flagship": false}, {"id": "indo_nanafushi", "rarity": "N", "flagship": false}, {"id": "benihoshi_oo_ageha", "rarity": "SSR", "flagship": false},{"id": "usuki_obi_ageha", "rarity": "R", "flagship": false}, {"id": "midori_suji_ageha", "rarity": "N", "flagship": false}, {"id": "onaga_suji_ageha", "rarity": "N", "flagship": false}, {"id": "madara_tsumaaka_shirochou", "rarity": "N", "flagship": false}, {"id": "afurika_usuki_shirochou", "rarity": "N", "flagship": false}, {"id": "shinju_tateha", "rarity": "R", "flagship": false}, {"id": "obimon_tateha", "rarity": "N", "flagship": false}, {"id": "rurimon_kuro_tatehamodoki", "rarity": "N", "flagship": false}, {"id": "chairo_tatehamodoki", "rarity": "N", "flagship": false}, {"id": "afurika_yamato_shijimi", "rarity": "N", "flagship": false}, {"id": "medama_yamamayu", "rarity": "SR", "flagship": false}, {"id": "chairo_oo_yamamayu", "rarity": "R", "flagship": false}, {"id": "fujiiro_suzume", "rarity": "R", "flagship": false}, {"id": "fukurou_tomoe", "rarity": "N", "flagship": false}, {"id": "tatesuji_yaga", "rarity": "N", "flagship": false}, {"id": "saku_kikuimushi", "rarity": "N", "flagship": false}, {"id": "kinoko_kikuimushi", "rarity": "N", "flagship": false}, {"id": "madagasukaru_ooari", "rarity": "N", "flagship": false}, {"id": "usu_hime_kiari", "rarity": "N", "flagship": false}, {"id": "afurika_shiwaari", "rarity": "N", "flagship": false}, {"id": "midoribane_hoso_batta", "rarity": "N", "flagship": false}, {"id": "chamadara_tobibatta", "rarity": "N", "flagship": false}, {"id": "aka_tobibatta", "rarity": "N", "flagship": false}, {"id": "toge_hiza_inago", "rarity": "N", "flagship": false}, {"id": "miiro_batta", "rarity": "N", "flagship": false}, {"id": "nettai_ie_koorogi", "rarity": "N", "flagship": false}, {"id": "futahoshi_koorogi", "rarity": "N", "flagship": false}, {"id": "kiboshi_kuro_hishibatta", "rarity": "N", "flagship": false}, {"id": "oo_togeashi_kirigirisu", "rarity": "SR", "flagship": false}, {"id": "futasuji_tsuyumushi", "rarity": "N", "flagship": false}, {"id": "afurika_eda_kamakiri", "rarity": "R", "flagship": false}, {"id": "togarigashira_kamakiri", "rarity": "R", "flagship": false}, {"id": "kanmuri_kareha_kamakiri", "rarity": "SR", "flagship": false}, {"id": "afurika_oo_kamakiri", "rarity": "R", "flagship": false}, {"id": "hosonaga_kamakiri", "rarity": "N", "flagship": false}, {"id": "oo_shizuku_awafuki", "rarity": "R", "flagship": false}, {"id": "madagasukaru_oo_tagame", "rarity": "SSR", "flagship": false},{"id": "suzukuri_konajirami", "rarity": "N", "flagship": false}, {"id": "ohishiba_kuro_aburamushi", "rarity": "N", "flagship": false}, {"id": "kuroboshi_maru_kaigaramushi", "rarity": "N", "flagship": false}, {"id": "batta_kinbae", "rarity": "N", "flagship": false}, {"id": "onaji_shoujoubae", "rarity": "N", "flagship": false}]
  };

  /* オーストラリア遠征 I = 更新 2 の巻 (release_linkage 2 章)。2026-08-17 freeze。
     選抜と レア度の根拠は zukan_foundry/reports/au_expedition1_freeze_draft.md。
     命名済み 97 種から写真品質で 13 種を落として 84 種、配分は マダガスカル遠征 I の
     実カウントに合わせて N 57 / R 17 / SR 帯 10。SR 帯の内訳も揃えてあり、
     SSR 3 (看板 papilio_ulysses + 非看板 2) / SR 7。
     frozen なので以後この配列と denominator は増やさない (決定 4)。 */
  volumes.volume_fixture_australia={
    id:"volume_fixture_australia", regionId:"australia", regionName:"オーストラリア",
    current:false, expedition:1, release:2,
    /* 更新 2 の実カテゴリ 5 本。k10 2 本 (単位換算・図化) + k5 3 本 (うら読み・3 の段・4 の段)。
       図化は 2026-08-17 に release 9 から前倒しした分 (受験 ROI 優先)。 */
    categories:["kom_unit_convert","kom_diagram_model","kom_kuku_ura","kom_kuku_dan3","kom_kuku_dan4"],
    blurb:"南半球の大陸。日本の 20 倍。かわいた大地とユーカリの森が広がる。",
    frozen:true, denominator:84,
    species:[
      {id:"papilio_ulysses", rarity:"SSR", flagship:true},
      {id:"lamprima_aurata", rarity:"SSR", flagship:false},
      {id:"podacanthus_viridiroseus", rarity:"SSR", flagship:false},
      {id:"chrysolopus_spectabilis", rarity:"SR", flagship:false},
      {id:"dasypodia_selenophora", rarity:"SR", flagship:false},
      {id:"eupoecila_australasiae", rarity:"SR", flagship:false},
      {id:"extatosoma_tiaratum", rarity:"SR", flagship:false},
      {id:"myrmecia_forficata", rarity:"SR", flagship:false},
      {id:"papilio_aegeus", rarity:"SR", flagship:false},
      {id:"tectocoris_diophthalmus", rarity:"SR", flagship:false},
      {id:"acripeza_reticulata", rarity:"R", flagship:false},
      {id:"acrophylla_titan", rarity:"R", flagship:false},
      {id:"aeshna_brevistyla", rarity:"R", flagship:false},
      {id:"anax_papuensis", rarity:"R", flagship:false},
      {id:"anchiale_briareus", rarity:"R", flagship:false},
      {id:"anoplognathus_porosus", rarity:"R", flagship:false},
      {id:"cyclochila_australasiae", rarity:"R", flagship:false},
      {id:"eurycnema_osiris", rarity:"R", flagship:false},
      {id:"henicopsaltria_eydouxii", rarity:"R", flagship:false},
      {id:"junonia_villida", rarity:"R", flagship:false},
      {id:"megacrania_batesii", rarity:"R", flagship:false},
      {id:"mictis_profana", rarity:"R", flagship:false},
      {id:"pristhesancus_plagipennis", rarity:"R", flagship:false},
      {id:"psaltoda_plaga", rarity:"R", flagship:false},
      {id:"scutiphora_pedicellata", rarity:"R", flagship:false},
      {id:"tenodera_australasiae", rarity:"R", flagship:false},
      {id:"valanga_irregularis", rarity:"R", flagship:false},
      {id:"acrida_conica", rarity:"N", flagship:false},
      {id:"agrotis_infusa", rarity:"N", flagship:false},
      {id:"agrotis_munda", rarity:"N", flagship:false},
      {id:"amegilla_chlorocyanea", rarity:"N", flagship:false},
      {id:"anchiale_austrotessulata", rarity:"N", flagship:false},
      {id:"archimantis_latistyla", rarity:"N", flagship:false},
      {id:"archimantis_sobrina", rarity:"N", flagship:false},
      {id:"asmicridea_edwardsii", rarity:"N", flagship:false},
      {id:"austracris_guttulosa", rarity:"N", flagship:false},
      {id:"austroargiolestes_icteromelas", rarity:"N", flagship:false},
      {id:"austrolestes_analis", rarity:"N", flagship:false},
      {id:"austrolestes_leda", rarity:"N", flagship:false},
      {id:"bactrocera_neohumeralis", rarity:"N", flagship:false},
      {id:"bactrocera_tryoni", rarity:"N", flagship:false},
      {id:"candovia_strumosa", rarity:"N", flagship:false},
      {id:"chondropyga_dorsalis", rarity:"N", flagship:false},
      {id:"chortoicetes_terminifera", rarity:"N", flagship:false},
      {id:"coccinella_transversalis", rarity:"N", flagship:false},
      {id:"coelophora_inaequalis", rarity:"N", flagship:false},
      {id:"coryphistes_ruricola", rarity:"N", flagship:false},
      {id:"creontiades_dilutus", rarity:"N", flagship:false},
      {id:"cryptobothrus_chrysophorus", rarity:"N", flagship:false},
      {id:"ctenomorpha_marginipennis", rarity:"N", flagship:false},
      {id:"cyclocephala_signaticollis", rarity:"N", flagship:false},
      {id:"diplacodes_bipunctata", rarity:"N", flagship:false},
      {id:"diplacodes_haematodes", rarity:"N", flagship:false},
      {id:"eristalinus_punctulatus", rarity:"N", flagship:false},
      {id:"euploea_corinna", rarity:"N", flagship:false},
      {id:"exaireta_spinigera", rarity:"N", flagship:false},
      {id:"gastrimargus_musicus", rarity:"N", flagship:false},
      {id:"gminatus_australis", rarity:"N", flagship:false},
      {id:"goniaea_australasiae", rarity:"N", flagship:false},
      {id:"hemicordulia_australiae", rarity:"N", flagship:false},
      {id:"heteronympha_merope", rarity:"N", flagship:false},
      {id:"ischnura_aurora", rarity:"N", flagship:false},
      {id:"mantis_octospilota", rarity:"N", flagship:false},
      {id:"miomantis_caffra", rarity:"N", flagship:false},
      {id:"nabis_kinbergii", rarity:"N", flagship:false},
      {id:"neoaratus_hercules", rarity:"N", flagship:false},
      {id:"neomantis_australis", rarity:"N", flagship:false},
      {id:"neorrhina_punctatum", rarity:"N", flagship:false},
      {id:"ocybadistes_walkeri", rarity:"N", flagship:false},
      {id:"oedaleus_australis", rarity:"N", flagship:false},
      {id:"orthetrum_caledonicum", rarity:"N", flagship:false},
      {id:"orthetrum_sabina", rarity:"N", flagship:false},
      {id:"orthodera_ministralis", rarity:"N", flagship:false},
      {id:"phaulacridium_vittatum", rarity:"N", flagship:false},
      {id:"polypedilum_nubifer", rarity:"N", flagship:false},
      {id:"simosyrphus_grandicornis", rarity:"N", flagship:false},
      {id:"sipyloidea_larryi", rarity:"N", flagship:false},
      {id:"sphodropoda_quinquedens", rarity:"N", flagship:false},
      {id:"stenotus_binotatus", rarity:"N", flagship:false},
      {id:"synemon_plana", rarity:"N", flagship:false},
      {id:"teleogryllus_commodus", rarity:"N", flagship:false},
      {id:"tramea_loewii", rarity:"N", flagship:false},
      {id:"tropidoderus_childrenii", rarity:"N", flagship:false},
      {id:"vanessa_itea", rarity:"N", flagship:false}
    ]
  };

  volumes.volume_fixture_borneo=volume({
    id:"volume_fixture_borneo", expedition:1, regionId:"borneo", regionName:"ボルネオ",
    placeholder:true,
    categories:["kom_kuku_run","kom_kuku_dan2","kom_kuku_dan3","kom_unit_convert","kom_kuku_bridge"],
    blurb:"世界で 3 番目に大きな島。3 つの国にまたがる熱帯雨林。",
    prefix:"kom_fixture_bo", counts:{n:5,r:2,sr:1}
  });

  volumes.volume_fixture_costa_rica=volume({
    id:"volume_fixture_costa_rica", expedition:1, regionId:"costa_rica", regionName:"コスタリカ",
    placeholder:true,
    categories:["kom_ratio","kom_kuku_dan4","kom_kuku_ura","kom_equation_select"],
    blurb:"中央アメリカの小さな国。九州ほどの広さに世界の生きものの 5% がすむ。",
    prefix:"kom_fixture_cr", counts:{n:6,r:2,sr:1}
  });

  global.Q4B_KOMOREBI_VOLUMES=volumes;
})(window);
