(function(global){
  "use strict";

  /* 学習達成トロフィー (design 6.6)。小道専用のマスター虫は新設せず、既存種の
     パラメトリック SVG を金色化して授与する。地域を重ねるほど新規マスター種の
     選定が厳しくなり持続不能になるため。

     獲得条件は Lv10 到達ではなく Lv10 クリア。到達だけで配ると「上がった瞬間に
     もらえる」ので、安定して解けることの証明にならない。 */

  var GOLD_COLORS=["#F0C24A","#8A6410"];
  /* 仮置き。design 16 章の未確定事項 1 (最終値は実測後)。 */
  var STABILITY={windowSize:20,minAnswers:20,minAccuracy:0.85};

  /* cat 1 つにトロフィー 1 個。代表虫はその cat の最終 Lv 帯を投入した volume の
     看板が既定で、k5 cat は看板が 1 種しかないので同じ volume の別 SR を指定する
     (design 6.7)。捕獲抽選には一切影響しない。表示専用の対応づけ。 */
  var TROPHIES=[
    {trophyId:"madagascar_ratio",cat:"kom_ratio",speciesId:"oo_onaga_yamamayu",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    {trophyId:"madagascar_kuku_dan2",cat:"kom_kuku_dan2",speciesId:"kanmuri_kareha_kamakiri",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    {trophyId:"madagascar_kuku_run",cat:"kom_kuku_run",speciesId:"oo_togeashi_kirigirisu",regionId:"madagascar",regionName:"マダガスカルえんせい"}
  ];

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}

  function list(){return TROPHIES.map(function(trophy){return trophy;});}

  function forCat(cat){
    return TROPHIES.filter(function(trophy){return trophy.cat===cat;})[0]||null;
  }

  /* 金色化に素材は要らない。Q4BRender.species は sp.colors を読むだけなので、
     色だけ差し替えた複製を渡せば金の虫が描ける (ui_design 6 章)。
     看板が写真つきの種になっても、トロフィーは SVG 側を金色化して使う。 */
  function goldSpecies(sp){
    if(!isObject(sp))throw new Error("トロフィーの種データが正しくありません");
    var copy={},key;
    for(key in sp)if(Object.prototype.hasOwnProperty.call(sp,key))copy[key]=sp[key];
    copy.colors=GOLD_COLORS.slice();
    return copy;
  }

  function progressFor(profile,cat){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    if(!isObject(profile.trophyProgress))profile.trophyProgress={};
    var entry=profile.trophyProgress[cat];
    if(!isObject(entry)){entry={n:0,recent:[]};profile.trophyProgress[cat]=entry;}
    return entry;
  }

  function validateProgress(progress){
    if(!isObject(progress))throw new Error("トロフィー進捗の形式が正しくありません");
    Object.keys(progress).forEach(function(cat){
      var entry=progress[cat];
      if(!isObject(entry)||!Number.isInteger(entry.n)||entry.n<0||!Array.isArray(entry.recent))throw new Error("トロフィー進捗の形式が正しくありません");
      if(entry.recent.length>STABILITY.windowSize)throw new Error("トロフィー進捗の形式が正しくありません");
      entry.recent.forEach(function(value){if(value!==0&&value!==1)throw new Error("トロフィー進捗の形式が正しくありません");});
    });
    return progress;
  }

  function validateTrophies(trophies){
    if(!isObject(trophies))throw new Error("トロフィーデータの形式が正しくありません");
    Object.keys(trophies).forEach(function(id){
      var entry=trophies[id];
      if(!isObject(entry)||typeof entry.cat!=="string"||typeof entry.speciesId!=="string"||typeof entry.at!=="string")throw new Error("トロフィーデータの形式が正しくありません");
    });
    return trophies;
  }

  /* Lv10 での有効回答だけを数える。Lv9 以下の正答は安定判定の材料にならない。
     認識失敗や途中試行はそもそも呼ばれない (呼び出し側で弾いている)。 */
  function noteAnswer(profile,cat,lv,correct){
    if(typeof correct!=="boolean"||!Number.isInteger(lv))throw new Error("結果データが正しくありません");
    if(lv!==10)return null;
    var entry=progressFor(profile,cat);
    entry.n++;
    entry.recent.push(correct?1:0);
    while(entry.recent.length>STABILITY.windowSize)entry.recent.shift();
    return entry;
  }

  function qualifies(profile,cat){
    if(!isObject(profile))return false;
    var maxLv=profile.maxLv&&profile.maxLv[cat];
    if(!Number.isInteger(maxLv)||maxLv<10)return false;
    var entry=profile.trophyProgress&&profile.trophyProgress[cat];
    if(!isObject(entry)||entry.n<STABILITY.minAnswers||entry.recent.length<STABILITY.windowSize)return false;
    var ok=entry.recent.reduce(function(sum,value){return sum+value;},0);
    return ok/entry.recent.length>=STABILITY.minAccuracy;
  }

  /* 一度獲得したトロフィーは後の Lv 降格でも失わない。再授与もしない。 */
  function award(profile,cat,today){
    if(typeof today!=="string"||!today)throw new Error("授与日の指定が正しくありません");
    var trophy=forCat(cat);
    if(!trophy)return null;
    if(!isObject(profile.trophies))profile.trophies={};
    if(profile.trophies[trophy.trophyId])return null;
    if(!qualifies(profile,cat))return null;
    profile.trophies[trophy.trophyId]={cat:cat,speciesId:trophy.speciesId,at:today};
    return trophy;
  }

  function displayName(trophy,speciesName){
    return trophy.regionName+"の きんいろ"+(speciesName||"トロフィー");
  }

  global.Q4B_KOMOREBI_TROPHIES={
    goldColors:GOLD_COLORS.slice(),
    stability:STABILITY,
    list:list,
    forCat:forCat,
    goldSpecies:goldSpecies,
    noteAnswer:noteAnswer,
    qualifies:qualifies,
    award:award,
    displayName:displayName,
    validateProgress:validateProgress,
    validateTrophies:validateTrophies
  };
})(typeof window!=="undefined"?window:globalThis);
