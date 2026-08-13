(function(global){
  "use strict";

  var volumes=global.Q4B_KOMOREBI_VOLUMES||{};
  volumes.volume_fixture={
    id:"volume_fixture",
    regionId:"madagascar",
    regionName:"マダガスカル",
    current:true,
    categories:["kom_ratio","kom_kuku_dan2","kom_kuku_run"],
    blurb:"アフリカの東にうかぶ大きな島。日本の 1.6 倍。ここにしかいない虫がとても多い。",
    frozen:true,
    denominator:12,
    species:[
      {id:"kom_fixture_n_01",rarity:"N",flagship:false},
      {id:"kom_fixture_n_02",rarity:"N",flagship:false},
      {id:"kom_fixture_n_03",rarity:"N",flagship:false},
      {id:"kom_fixture_n_04",rarity:"N",flagship:false},
      {id:"kom_fixture_n_05",rarity:"N",flagship:false},
      {id:"kom_fixture_n_06",rarity:"N",flagship:false},
      {id:"kom_fixture_n_07",rarity:"N",flagship:false},
      {id:"kom_fixture_r_01",rarity:"R",flagship:false},
      {id:"kom_fixture_r_02",rarity:"R",flagship:false},
      {id:"kom_fixture_r_03",rarity:"R",flagship:false},
      {id:"kom_fixture_sr_01",rarity:"SR",flagship:false},
      {id:"kom_fixture_sr_flagship",rarity:"SR",flagship:true}
    ]
  };
  global.Q4B_KOMOREBI_VOLUMES=volumes;
})(window);
