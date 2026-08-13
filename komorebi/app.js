(function(global){
  "use strict";

  var CATEGORIES={
    kom_ratio:{course:"k10",name:"割合と比",maxLv:10},
    kom_kuku_dan2:{course:"k5",name:"2の段暗唱",maxLv:10},
    kom_kuku_run:{course:"k5",name:"連続九九",maxLv:10}
  };
  var profile=null, profileId=null;

  function createProfile(){
    var lv={},maxLv={};
    Object.keys(CATEGORIES).forEach(function(cat){lv[cat]=1;maxLv[cat]=1;});
    return {schemaVersion:1,unlocked:true,discoverySeen:false,lv:lv,maxLv:maxLv,stats:{},recent:{},adapt:{},collection:{gauge:0,totalCatches:0,catches:{}},trophies:{},srs:{}};
  }

  function normalizeProfile(data){
    if(data==null)return {profile:createProfile(),changed:true};
    if(typeof data!=="object"||Array.isArray(data))throw new Error("保存データの形式が正しくありません");
    var p=data,changed=false;
    if(p.schemaVersion==null){p.schemaVersion=1;changed=true;}
    else if(p.schemaVersion!==1)throw new Error("保存データの版に対応していません");
    if(p.unlocked==null){p.unlocked=true;changed=true;}
    else if(typeof p.unlocked!=="boolean")throw new Error("解禁データの形式が正しくありません");
    if(p.discoverySeen==null){p.discoverySeen=false;changed=true;}
    else if(typeof p.discoverySeen!=="boolean")throw new Error("発見データの形式が正しくありません");
    ["lv","maxLv","stats","recent","adapt","trophies","srs"].forEach(function(key){
      if(p[key]==null){p[key]={};changed=true;}
      else if(typeof p[key]!=="object"||Array.isArray(p[key]))throw new Error("保存データの形式が正しくありません");
    });
    Object.keys(CATEGORIES).forEach(function(cat){
      if(p.lv[cat]==null){p.lv[cat]=1;changed=true;}
      else if(!Number.isInteger(p.lv[cat])||p.lv[cat]<1||p.lv[cat]>CATEGORIES[cat].maxLv)throw new Error("レベルデータの形式が正しくありません");
      if(p.maxLv[cat]==null){p.maxLv[cat]=p.lv[cat];changed=true;}
      else if(!Number.isInteger(p.maxLv[cat])||p.maxLv[cat]<1||p.maxLv[cat]>CATEGORIES[cat].maxLv)throw new Error("レベルデータの形式が正しくありません");
      if(p.maxLv[cat]<p.lv[cat]){p.maxLv[cat]=p.lv[cat];changed=true;}
    });
    if(p.collection==null){p.collection={gauge:0,totalCatches:0,catches:{}};changed=true;}
    else if(typeof p.collection!=="object"||Array.isArray(p.collection))throw new Error("採集データの形式が正しくありません");
    if(p.collection.gauge==null){p.collection.gauge=0;changed=true;}
    else if(!Number.isInteger(p.collection.gauge)||p.collection.gauge<0)throw new Error("ゲージデータの形式が正しくありません");
    if(p.collection.totalCatches==null){p.collection.totalCatches=0;changed=true;}
    else if(!Number.isInteger(p.collection.totalCatches)||p.collection.totalCatches<0)throw new Error("採集データの形式が正しくありません");
    if(p.collection.catches==null){p.collection.catches={};changed=true;}
    else if(typeof p.collection.catches!=="object"||Array.isArray(p.collection.catches))throw new Error("採集データの形式が正しくありません");
    return {profile:p,changed:changed};
  }

  function saveProfile(){
    if(!profileId||!global.QuestSave)return Promise.reject(new Error("保存できません"));
    if(QuestSave.warnIfDegraded)QuestSave.warnIfDegraded();
    return QuestSave.save("komorebi",profileId,profile);
  }

  function recordResult(cat,ok,ms){
    if(!profile||!Object.prototype.hasOwnProperty.call(CATEGORIES,cat))return Promise.reject(new Error("カテゴリが正しくありません"));
    if(typeof ok!=="boolean"||!Number.isFinite(ms)||ms<0)return Promise.reject(new Error("結果データが正しくありません"));
    var s=profile.stats[cat]||(profile.stats[cat]={ok:0,n:0,ms:0});
    if(!Number.isInteger(s.ok)||!Number.isInteger(s.n)||!Number.isFinite(s.ms))return Promise.reject(new Error("統計データが正しくありません"));
    s.n++;if(ok)s.ok++;s.ms+=ms;
    var recent=profile.recent[cat]||(profile.recent[cat]=[]);
    var adapt=profile.adapt[cat]||(profile.adapt[cat]={n:0,recent:[]});
    if(!Array.isArray(recent)||!Number.isInteger(adapt.n)||!Array.isArray(adapt.recent))return Promise.reject(new Error("統計データが正しくありません"));
    recent.push(ok?1:0);while(recent.length>20)recent.shift();
    adapt.n++;adapt.recent.push(ok?1:0);while(adapt.recent.length>20)adapt.recent.shift();
    if(adapt.n%10===0){
      var ok10=adapt.recent.slice(-10).reduce(function(sum,value){return sum+value;},0);
      if(ok10>=9&&profile.lv[cat]<CATEGORIES[cat].maxLv){profile.lv[cat]++;profile.maxLv[cat]=Math.max(profile.maxLv[cat],profile.lv[cat]);}
      else if(ok10<=5&&profile.lv[cat]>1)profile.lv[cat]--;
    }
    return saveProfile();
  }

  function speciesForArea(bugs){
    return (bugs||global.Q4B_BUGS||[]).filter(function(sp){return sp.areaOnly==="komorebi";});
  }

  function renderHome(){
    document.getElementById("app").innerHTML='<div class="scr"><div class="top"><a class="backbtn" href="../keisan/index.html" style="text-decoration:none">← けいさん</a></div>'
      +'<div class="hero center"><div class="sun"></div><h2>🌿 こもれびのこみち</h2><p>ここから せかいへ つながる こみちです。</p><div class="grass"></div></div>'
      +'<div class="card center"><p>えんせいの じゅんびを しています。</p></div></div>';
  }

  function renderError(){
    document.getElementById("app").innerHTML='<div class="scr"><div class="card center"><h2>よみこめませんでした</h2><p>ページを よみなおしてね。</p><a class="btn ghost" href="../keisan/index.html" style="text-decoration:none">けいさんへ もどる</a></div></div>';
  }

  function boot(){
    if(!global.QuestSave){renderError();return;}
    profileId=QuestSave.currentProfile();
    if(!profileId){renderError();return;}
    var pull=QuestSave.syncDown?QuestSave.syncDown().catch(function(){}):Promise.resolve();
    pull.then(function(){return QuestSave.load("komorebi",profileId);}).then(function(data){
      var normalized=normalizeProfile(data);
      profile=normalized.profile;
      return normalized.changed?saveProfile():true;
    }).then(renderHome).catch(renderError);
  }

  global.Q4B_KOMOREBI={categories:CATEGORIES,createProfile:createProfile,normalizeProfile:normalizeProfile,recordResult:recordResult,speciesForArea:speciesForArea,profile:function(){return profile;}};
  if(!global.Q4B_KOMOREBI_NO_BOOT&&global.document)boot();
})(window);
