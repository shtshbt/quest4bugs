(function(global){
  "use strict";

  var CATEGORIES={
    kom_ratio:{course:"k10",name:"割合と比",maxLv:10},
    kom_kuku_dan2:{course:"k5",name:"2の段暗唱",maxLv:10},
    kom_kuku_run:{course:"k5",name:"連続九九",maxLv:10}
  };
  var COLLECTION_CONFIG={
    gaugeNeed:global.Q4BReward?global.Q4BReward.NEED_DEFAULT:8,
    pityChances:[0,0.25,0.5,0.75,1],
    flagshipWeight:0.25
  };
  var RARITIES=["N","R","SR"];
  var FORMAT_KINDS={
    normal:{num:true,frac:true,choice:true},
    formulation:{choice:true},
    ordering:{order:true},
    diagnosis:{choice:true},
    find_all:{choice:true},
    voice:{voice:true}
  };
  var profile=null, profileId=null;

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}

  function validateCatches(catches,full){
    if(!isObject(catches))throw new Error("捕獲データの形式が正しくありません");
    Object.keys(catches).forEach(function(id){
      var entry=catches[id];
      if(!id||!isObject(entry)||!Number.isInteger(entry.n)||entry.n<1)throw new Error("捕獲データの形式が正しくありません");
      if(full&&(!Number.isFinite(entry.max)||!Number.isFinite(entry.min)||entry.min>entry.max||!Array.isArray(entry.records)||entry.records.length!==entry.n))throw new Error("捕獲データの形式が正しくありません");
    });
  }

  function validateCollection(collection){
    if(!isObject(collection))throw new Error("採集データの形式が正しくありません");
    if(!Number.isInteger(collection.gauge)||collection.gauge<0||collection.gauge>=COLLECTION_CONFIG.gaugeNeed)throw new Error("ゲージデータの形式が正しくありません");
    if(!Number.isInteger(collection.totalCatches)||collection.totalCatches<0)throw new Error("採集データの形式が正しくありません");
    validateCatches(collection.catches,true);
    if(collection.pityDuplicates!=null&&(!Number.isInteger(collection.pityDuplicates)||collection.pityDuplicates<0||collection.pityDuplicates>=COLLECTION_CONFIG.pityChances.length))throw new Error("救済データの形式が正しくありません");
    if(collection.submissionSessionId!=null&&(typeof collection.submissionSessionId!=="string"||!collection.submissionSessionId))throw new Error("回答データの形式が正しくありません");
    if(collection.processedSubmissionIds!=null){
      if(!Array.isArray(collection.processedSubmissionIds)||collection.submissionSessionId==null)throw new Error("回答データの形式が正しくありません");
      var submissionIds=Object.create(null);
      collection.processedSubmissionIds.forEach(function(id){
        if(typeof id!=="string"||!id||hasOwn(submissionIds,id))throw new Error("回答データの形式が正しくありません");
        submissionIds[id]=true;
      });
    }else if(collection.submissionSessionId!=null)throw new Error("回答データの形式が正しくありません");
  }

  function validateVolume(volume){
    if(!isObject(volume)||typeof volume.id!=="string"||!volume.id||typeof volume.regionId!=="string"||!volume.regionId||typeof volume.regionName!=="string"||!volume.regionName)throw new Error("遠征データの形式が正しくありません");
    if(volume.frozen!==true||!Number.isInteger(volume.denominator)||volume.denominator<1||!Array.isArray(volume.species)||volume.denominator!==volume.species.length)throw new Error("遠征の分母が正しくありません");
    var ids=Object.create(null),flagships=0;
    volume.species.forEach(function(species){
      if(!isObject(species)||typeof species.id!=="string"||!species.id||RARITIES.indexOf(species.rarity)<0||typeof species.flagship!=="boolean")throw new Error("遠征の種データが正しくありません");
      if(hasOwn(ids,species.id))throw new Error("遠征の種IDが重複しています");
      ids[species.id]=true;
      if(species.flagship){
        if(species.rarity!=="SR")throw new Error("看板のレア度が正しくありません");
        flagships++;
      }
    });
    if(flagships!==1)throw new Error("看板は遠征ごとに1種必要です");
    return volume;
  }

  function validateAnswer(answer){
    if(!isObject(answer)||typeof answer.sessionId!=="string"||!answer.sessionId||typeof answer.submissionId!=="string"||!answer.submissionId||!hasOwn(FORMAT_KINDS,answer.format)||!hasOwn(FORMAT_KINDS[answer.format],answer.kind)||typeof answer.correct!=="boolean"||typeof answer.final!=="boolean")throw new Error("回答データの形式が正しくありません");
    ["hintShown","recognitionFailure","answerOnly","debug","retry"].forEach(function(key){
      if(answer[key]!=null&&typeof answer[key]!=="boolean")throw new Error("回答データの形式が正しくありません");
    });
    return answer;
  }

  function qualifiesForGauge(answer){
    validateAnswer(answer);
    return answer.correct&&answer.final&&!answer.hintShown&&!answer.recognitionFailure&&!answer.answerOnly&&!answer.debug;
  }

  function randomValue(random){
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var value=random();
    if(!Number.isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }

  function rewardEngine(){
    if(!global.Q4BReward||typeof global.Q4BReward.selectTier!=="function"||typeof global.Q4BReward.record!=="function")throw new Error("採集機構を読み込めません");
    return global.Q4BReward;
  }

  function pickTier(tiers,random){
    var tier=rewardEngine().selectTier(1,tiers,function(){return randomValue(random);});
    return RARITIES[tier];
  }

  function pickSpecies(species,random){
    var weights=species.map(function(item){return item.flagship?COLLECTION_CONFIG.flagshipWeight:1;});
    var total=weights.reduce(function(sum,weight){return sum+weight;},0);
    var value=randomValue(random)*total;
    for(var i=0;i<species.length;i++){
      if(value<weights[i])return species[i];
      value-=weights[i];
    }
    return species[species.length-1];
  }

  function drawCapture(volume,catches,pityDuplicates,random){
    validateVolume(volume);
    validateCatches(catches,false);
    if(!Number.isInteger(pityDuplicates)||pityDuplicates<0||pityDuplicates>=COLLECTION_CONFIG.pityChances.length)throw new Error("救済データの形式が正しくありません");
    var tiers=RARITIES.filter(function(rarity){return volume.species.some(function(species){return species.rarity===rarity;});});
    var incompleteTiers=tiers.filter(function(rarity){return volume.species.some(function(species){return species.rarity===rarity&&!hasOwn(catches,species.id);});});
    var tier=pickTier(tiers,random),pityApplied=false;
    var pityChance=COLLECTION_CONFIG.pityChances[pityDuplicates];
    if(incompleteTiers.indexOf(tier)<0&&incompleteTiers.length&&pityChance>0&&randomValue(random)<pityChance){
      tier=pickTier(incompleteTiers,random);
      pityApplied=true;
    }
    var candidates=volume.species.filter(function(species){return species.rarity===tier;});
    var fresh=candidates.filter(function(species){return !hasOwn(catches,species.id);});
    if(fresh.length)candidates=fresh;
    var species=pickSpecies(candidates,random);
    var isNew=!hasOwn(catches,species.id);
    return {
      species:species,
      isNew:isNew,
      pityApplied:pityApplied,
      pityDuplicates:isNew||!incompleteTiers.length?0:Math.min(pityDuplicates+1,COLLECTION_CONFIG.pityChances.length-1)
    };
  }

  function recordCapture(collection,draw,random){
    var id=draw.species.id;
    var rewardCollection={catches:collection.catches,total:collection.totalCatches};
    var recorded=rewardEngine().record(rewardCollection,draw.species,{source:"wild",random:random,game:"komorebi",mode:"volume"});
    collection.catches=rewardCollection.catches;
    collection.totalCatches=rewardCollection.total;
    if(draw.pityDuplicates)collection.pityDuplicates=draw.pityDuplicates;
    else delete collection.pityDuplicates;
    return {id:id,rarity:draw.species.rarity,flagship:draw.species.flagship,isNew:recorded.isNew,n:collection.catches[id].n,size:recorded.size,sex:recorded.sex,shiny:recorded.shiny,pityApplied:draw.pityApplied};
  }

  function cloneCollection(collection){return JSON.parse(JSON.stringify(collection));}
  function replaceCollection(target,source){
    Object.keys(target).forEach(function(key){delete target[key];});
    Object.keys(source).forEach(function(key){target[key]=source[key];});
  }

  function applyAnswer(targetProfile,cat,answer,volume,random){
    if(!isObject(targetProfile)||!hasOwn(CATEGORIES,cat))throw new Error("カテゴリが正しくありません");
    validateCollection(targetProfile.collection);
    validateAnswer(answer);
    validateVolume(volume);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var next=cloneCollection(targetProfile.collection),capture=null;
    if(next.submissionSessionId!==answer.sessionId){
      next.submissionSessionId=answer.sessionId;
      next.processedSubmissionIds=[];
    }
    if(next.processedSubmissionIds.indexOf(answer.submissionId)>=0)return {counted:false,duplicate:true,gauge:next.gauge,capture:null};
    next.processedSubmissionIds.push(answer.submissionId);
    var counted=qualifiesForGauge(answer);
    if(counted){
      next.gauge++;
      if(next.gauge>=COLLECTION_CONFIG.gaugeNeed){
        next.gauge-=COLLECTION_CONFIG.gaugeNeed;
        capture=recordCapture(next,drawCapture(volume,next.catches,next.pityDuplicates||0,random),random);
      }
    }
    replaceCollection(targetProfile.collection,next);
    return {counted:counted,duplicate:false,gauge:next.gauge,capture:capture};
  }

  function volumeProgress(volume,collection){
    validateVolume(volume);
    validateCollection(collection);
    var caught=volume.species.reduce(function(count,species){return count+(hasOwn(collection.catches,species.id)?1:0);},0);
    return {regionId:volume.regionId,volumeId:volume.id,caught:caught,denominator:volume.denominator,complete:caught===volume.denominator};
  }

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
    validateCollection(p.collection);
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

  function recordAnswer(cat,answer,volume,random){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    if(random!=null&&typeof random!=="function")return Promise.reject(new Error("乱数の指定が正しくありません"));
    var before,result;
    try{
      before=cloneCollection(profile.collection);
      result=applyAnswer(profile,cat,answer,volume,random||Math.random);
    }catch(error){return Promise.reject(error);}
    if(result.duplicate)return Promise.resolve(result);
    return saveProfile().then(function(){return result;}).catch(function(error){
      replaceCollection(profile.collection,before);
      throw error;
    });
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

  global.Q4B_KOMOREBI={
    categories:CATEGORIES,
    collectionConfig:COLLECTION_CONFIG,
    createProfile:createProfile,
    normalizeProfile:normalizeProfile,
    validateVolume:validateVolume,
    qualifiesForGauge:qualifiesForGauge,
    drawCapture:drawCapture,
    applyAnswer:applyAnswer,
    recordAnswer:recordAnswer,
    volumeProgress:volumeProgress,
    recordResult:recordResult,
    speciesForArea:speciesForArea,
    profile:function(){return profile;}
  };
  if(!global.Q4B_KOMOREBI_NO_BOOT&&global.document)boot();
})(window);
