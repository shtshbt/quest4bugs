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
    list.push({id:prefix+"_sr_flagship",rarity:"SR",flagship:true});
    return list;
  }

  function volume(config){
    var species=speciesSet(config.prefix,config.counts);
    return {
      id:config.id, regionId:config.regionId, regionName:config.regionName,
      current:!!config.current, categories:config.categories, blurb:config.blurb,
      frozen:true, denominator:species.length, species:species
    };
  }

  /* マダガスカルは実在種 12 種 (bugs.js に areaOnly で登録済み)。捕獲カードと図鑑が
     本編と同じ描画資産で出る。他 3 地域は形と進捗の見比べ用の合成 fixture のまま。 */
  volumes.volume_fixture={
    id:"volume_fixture", regionId:"madagascar", regionName:"マダガスカル", current:true,
    categories:["kom_ratio","kom_kuku_dan2","kom_kuku_run"],
    blurb:"アフリカの東にうかぶ大きな島。日本の 1.6 倍。ここにしかいない虫がとても多い。",
    frozen:true, denominator:12,
    species:[{"id": "oo_onaga_yamamayu", "rarity": "SR", "flagship": true}, {"id": "hagata_murasaki", "rarity": "SR", "flagship": false}, {"id": "akamarubane_monki_tateha", "rarity": "R", "flagship": false}, {"id": "serikorunisu_nokogiri_kuwagata", "rarity": "R", "flagship": false}, {"id": "madagasukaru_oo_gokiburi", "rarity": "R", "flagship": false}, {"id": "oo_beni_hagoromo", "rarity": "N", "flagship": false}, {"id": "madagasukaru_tatehamodoki", "rarity": "N", "flagship": false}, {"id": "afurika_onashi_ageha", "rarity": "N", "flagship": false}, {"id": "suji_tsumaaka_shirochou", "rarity": "N", "flagship": false}, {"id": "usucha_hekusodon", "rarity": "N", "flagship": false}, {"id": "ameiro_tonbo", "rarity": "N", "flagship": false}, {"id": "tsuya_oozu_ari", "rarity": "N", "flagship": false}]
  };

  volumes.volume_fixture_australia=volume({
    id:"volume_fixture_australia", regionId:"australia", regionName:"オーストラリア",
    categories:["kom_ratio","kom_kuku_dan2"],
    blurb:"南半球の大陸。日本の 20 倍。かわいた大地とユーカリの森が広がる。",
    prefix:"kom_fixture_au", counts:{n:6,r:3,sr:1}
  });

  volumes.volume_fixture_borneo=volume({
    id:"volume_fixture_borneo", regionId:"borneo", regionName:"ボルネオ",
    categories:["kom_kuku_run","kom_kuku_dan2"],
    blurb:"世界で 3 番目に大きな島。3 つの国にまたがる熱帯雨林。",
    prefix:"kom_fixture_bo", counts:{n:5,r:2,sr:1}
  });

  volumes.volume_fixture_costa_rica=volume({
    id:"volume_fixture_costa_rica", regionId:"costa_rica", regionName:"コスタリカ",
    categories:["kom_ratio"],
    blurb:"中央アメリカの小さな国。九州ほどの広さに世界の生きものの 5% がすむ。",
    prefix:"kom_fixture_cr", counts:{n:6,r:2,sr:1}
  });

  global.Q4B_KOMOREBI_VOLUMES=volumes;
})(window);
