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
  var profile=null, profileId=null, profileType="k10", worldMap=null;
  /* ?demo で見え方だけを差し替える確認用モード。保存には一切触れない
     (Phase 3 のピン状態と一覧の見比べ用。実データが入ったら不要)。 */
  var demoProgress={volume_fixture:3,volume_fixture_australia:11,volume_fixture_borneo:5,volume_fixture_costa_rica:1};
  var demoMode=false;

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

  function viewCollection(){
    if(!demoMode)return profile.collection;
    var catches={};
    expeditionVolumes().forEach(function(volume){
      volume.species.slice(0,demoProgress[volume.id]||0).forEach(function(species){catches[species.id]={n:1,min:20,max:20,records:[{size:20,sex:"m",shiny:false}]};});
    });
    return {gauge:profile.collection.gauge,totalCatches:0,catches:catches};
  }

  function mapPinState(volume,collection,currentVolumeId){
    if(!volume)return null;
    var progress=volumeProgress(volume,collection),ringValue=progress.caught/progress.denominator;
    if(progress.complete)return {kind:"completed",mark:"✓",caught:progress.caught,denominator:progress.denominator,ringValue:1};
    if(volume.id===currentVolumeId)return {kind:"current",mark:"★",caught:progress.caught,denominator:progress.denominator,ringValue:ringValue};
    return {kind:"past",mark:"🦋",caught:progress.caught,denominator:progress.denominator,ringValue:ringValue};
  }

  function formatCourseText(text,type,formatter){
    if(typeof text!=="string")throw new Error("表示データの形式が正しくありません");
    if(type!=="k5")return text;
    if(typeof formatter!=="function")throw new Error("ふりがなを読み込めません");
    return formatter(text);
  }

  function escapeHtml(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function displayText(text){return formatCourseText(escapeHtml(text),profileType,global.furi5);}

  function mapViewBox(map){
    var values=typeof map.viewBox==="string"?map.viewBox.trim().split(/\s+/).map(Number):[];
    if(values.length!==4||values.some(function(value){return !Number.isFinite(value);})||values[2]<=0||values[3]<=0)throw new Error("地図の表示範囲が正しくありません");
    return values;
  }

  function validMapPath(path){return typeof path==="string"&&path.length>0&&/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/.test(path);}

  function validateMapPayload(map,volumes){
    if(!isObject(map)||!validMapPath(map.land)||!isObject(map.regions)||!isObject(map.pins))throw new Error("地図データの形式が正しくありません");
    mapViewBox(map);
    Object.keys(map.regions).forEach(function(regionId){
      var pin=map.pins[regionId];
      if(!regionId||!validMapPath(map.regions[regionId])||!isObject(pin)||!Number.isFinite(pin.x)||!Number.isFinite(pin.y))throw new Error("地域データの形式が正しくありません");
    });
    (volumes||[]).forEach(function(volume){
      if(!hasOwn(map.regions,volume.regionId)||!hasOwn(map.pins,volume.regionId))throw new Error("遠征地域が地図にありません");
    });
    return map;
  }

  function expeditionVolumes(){
    var volumes=Object.keys(global.Q4B_KOMOREBI_VOLUMES||{}).map(function(id){return global.Q4B_KOMOREBI_VOLUMES[id];});
    if(!volumes.length)throw new Error("遠征データを読み込めません");
    volumes.forEach(function(volume){
      validateVolume(volume);
      if(typeof volume.current!=="boolean"||!Array.isArray(volume.categories)||!volume.categories.length||volume.categories.some(function(cat){return !hasOwn(CATEGORIES,cat);})||typeof volume.blurb!=="string"||!volume.blurb)throw new Error("遠征の表示データが正しくありません");
    });
    if(volumes.filter(function(volume){return volume.current;}).length!==1)throw new Error("現在の遠征が正しくありません");
    return volumes;
  }

  function currentVolumeId(volumes){return volumes.filter(function(volume){return volume.current;})[0].id;}

  function volumeById(id){
    var volume=(global.Q4B_KOMOREBI_VOLUMES||{})[id];
    if(!volume)throw new Error("遠征を見つけられません");
    return volume;
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

  function graticuleHtml(box){
    var lines="",i;
    for(i=1;i<6;i++){
      var y=box[1]+box[3]*i/6;
      lines+='<line x1="'+box[0]+'" y1="'+y.toFixed(1)+'" x2="'+(box[0]+box[2])+'" y2="'+y.toFixed(1)+'"></line>';
    }
    for(i=1;i<8;i++){
      var x=box[0]+box[2]*i/8;
      lines+='<line x1="'+x.toFixed(1)+'" y1="'+box[1]+'" x2="'+x.toFixed(1)+'" y2="'+(box[1]+box[3])+'"></line>';
    }
    return lines;
  }

  function mapArtworkHtml(volumes,currentId,selectedId){
    var box=mapViewBox(worldMap),byRegion={},regionPaths="",pins="",leader="";
    volumes.forEach(function(volume){byRegion[volume.regionId]=volume;});
    Object.keys(worldMap.regions).forEach(function(regionId){
      var volume=byRegion[regionId],className="hl hl-unopened";
      if(volume)className=volume.id===currentId?"hl hl-current":"hl hl-open";
      regionPaths+='<path class="'+className+'" d="'+escapeHtml(worldMap.regions[regionId])+'"'+(volume?' filter="url(#rich-glow)"':'')+'></path>';
    });
    volumes.forEach(function(volume){
      var state=mapPinState(volume,viewCollection(),currentId),point=worldMap.pins[volume.regionId];
      var left=((point.x-box[0])/box[2]*100).toFixed(3),top=((point.y-box[1])/box[3]*100).toFixed(3);
      var status=state.kind==="current"?"現在の遠征":state.kind==="past"?"過去の遠征":"完成した遠征";
      var classes="map-pin pin-"+state.kind+(state.kind==="completed"?" pin-done":"")+(volume.id===selectedId?" pin-selected":"");
      /* 選択中の地域から下の一覧へ引き出し線を落とす。地図は「どこ」を示し、
         主役は下のカテゴリ一覧という関係を線で結ぶ。 */
      if(volume.id===selectedId)leader='<span class="map-leader" aria-hidden="true" style="left:'+left+'%;top:'+top+'%"></span>';
      pins+='<button type="button" class="'+classes+'" data-volume-id="'+escapeHtml(volume.id)+'" style="left:'+left+'%;top:'+top+'%;--pin-progress:'+(state.ringValue*360).toFixed(1)+'deg" aria-label="'+escapeHtml(volume.regionName+' '+state.caught+'／'+state.denominator+'、'+status)+'">'
        +'<span class="pin-halo" aria-hidden="true"></span><span class="pin-ring" aria-hidden="true"><span class="pin-disc"><span class="pin-mark">'+state.mark+'</span></span></span>'
        +'<span class="pin-name">'+displayText(volume.regionName)+'</span><span class="pin-count">'+state.caught+'／'+state.denominator+'</span></button>';
    });
    return '<div class="map-shell"><svg class="map map-rich" viewBox="'+escapeHtml(worldMap.viewBox)+'" role="img" aria-label="こもれびの遠征地図" preserveAspectRatio="xMidYMid meet">'
      +'<defs><radialGradient id="rich-sea" cx="50%" cy="45%" r="72%"><stop offset="0%" stop-color="#17454B"></stop><stop offset="62%" stop-color="#0E3036"></stop><stop offset="100%" stop-color="#071F26"></stop></radialGradient>'
      +'<linearGradient id="rich-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4C8352"></stop><stop offset="55%" stop-color="#38683F"></stop><stop offset="100%" stop-color="#28502F"></stop></linearGradient>'
      +'<radialGradient id="rich-vignette" cx="50%" cy="42%" r="62%"><stop offset="0%" stop-color="#FFE9A8" stop-opacity="0.20"></stop><stop offset="55%" stop-color="#FFD469" stop-opacity="0.05"></stop><stop offset="100%" stop-color="#04141A" stop-opacity="0.55"></stop></radialGradient>'
      +'<filter id="rich-glow" x="-320%" y="-320%" width="740%" height="740%"><feGaussianBlur stdDeviation="7" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>'
      +'<filter id="rich-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"></feTurbulence><feColorMatrix type="saturate" values="0"></feColorMatrix></filter>'
      +'<path id="world-land" d="'+escapeHtml(worldMap.land)+'"></path></defs>'
      +'<rect width="'+box[2]+'" height="'+box[3]+'" x="'+box[0]+'" y="'+box[1]+'" fill="url(#rich-sea)"></rect><g class="rich-latitudes">'+graticuleHtml(box)+'</g>'
      +'<use href="#world-land" class="rich-land-shadow"></use><use href="#world-land" class="rich-land"></use>'+regionPaths
      +'<rect width="'+box[2]+'" height="'+box[3]+'" x="'+box[0]+'" y="'+box[1]+'" filter="url(#rich-grain)" opacity="0.05" class="rich-grain"></rect>'
      +'<rect width="'+box[2]+'" height="'+box[3]+'" x="'+box[0]+'" y="'+box[1]+'" fill="url(#rich-vignette)"></rect></svg><div class="map-pins">'+leader+pins+'</div></div>';
  }

  function pathPanelHtml(volume){
    var progress=volumeProgress(volume,viewCollection()),buttons="";
    volume.categories.forEach(function(cat){
      buttons+='<button type="button" class="path-choice" disabled aria-disabled="true"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span><span class="path-choice-note">'+displayText("じゅんび中")+'</span></button>';
    });
    /* 地域の形は世界地図の実寸では読めない (コスタリカは幅 11、豪は 137)。
       形はここで単独に大きく描き、地図は位置を示す役に徹する。 */
    var box=worldMap.regionBoxes&&worldMap.regionBoxes[volume.regionId];
    var shape=box?'<svg class="path-shape" viewBox="'+box.join(" ")+'" role="img" aria-label="'+displayText(volume.regionName+"の形")+'"><path d="'+escapeHtml(worldMap.regions[volume.regionId])+'"></path></svg>':"";
    return '<div class="path-place">'+shape+'<div class="path-place-text"><h2>'+displayText(volume.regionName+"の小道")+'</h2><p>'+displayText(volume.blurb)+'</p></div></div>'
      +'<div class="path-choices" aria-label="'+displayText("あるく小道を えらぼう")+'">'+buttons+'</div>'
      +'<div class="path-foot"><button type="button" class="path-zukan" data-action="zukan">📖 '+displayText(volume.regionName+"の ずかん")+'</button>'
      +'<span class="path-progress">'+displayText("あつめた虫")+'　<strong>'+progress.caught+'／'+progress.denominator+'</strong></span></div>';
  }

  function selectVolume(volume){
    var panel=document.getElementById("pathPanel");
    if(!panel)return;
    panel.innerHTML=pathPanelHtml(volume);
    panel.querySelector('[data-action="zukan"]').addEventListener("click",function(){renderZukanStub(volume.id);});
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      pin.classList.toggle("pin-selected",pin.getAttribute("data-volume-id")===volume.id);
    });
    var leader=document.querySelector(".map-leader"),point=worldMap.pins[volume.regionId],box=mapViewBox(worldMap);
    if(leader&&point){
      leader.style.left=((point.x-box[0])/box[2]*100).toFixed(3)+"%";
      leader.style.top=((point.y-box[1])/box[3]*100).toFixed(3)+"%";
    }
  }

  function showRegionBlurb(volume){
    var blurb=document.getElementById("regionBlurb");
    if(blurb)blurb.innerHTML='<strong>'+displayText(volume.regionName)+'</strong><span>'+displayText(volume.blurb)+'</span>';
  }

  function renderMap(selectedId){
    var volumes=expeditionVolumes(),currentId=currentVolumeId(volumes);
    validateMapPayload(worldMap,volumes);
    /* 未知の id でも落とさない。volumeById は見つからないと例外を投げる。 */
    var wanted=selectedId||currentId,selected=volumes.filter(function(volume){return volume.id===wanted;})[0]||volumes[0];
    /* 1 画面構成: 表題 / 地図 (どこ) / 引き出し線 / 小道の一覧 (主役)。
       地図はカテゴリを選ぶための文脈であって、地域選択を挟む関門にはしない。 */
    document.getElementById("app").innerHTML='<main class="kom-page kom-map-page"><header class="kom-top"><a class="kom-back" href="../keisan/index.html">← けいさん</a></header>'
      +'<div class="kom-title"><h1>'+displayText("木漏れ日の小道")+'</h1><p>'+displayText("あるく小道を えらぼう")+'</p></div>'
      +'<section class="map-panel" aria-label="'+displayText("世界の地図")+'">'+mapArtworkHtml(volumes,currentId,selected.id)+'</section>'
      +'<section class="path-panel" id="pathPanel" aria-live="polite">'+pathPanelHtml(selected)+'</section></main>';
    document.querySelector('#pathPanel [data-action="zukan"]').addEventListener("click",function(){renderZukanStub(selected.id);});
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      var volume=volumeById(pin.getAttribute("data-volume-id"));
      pin.addEventListener("click",function(){selectVolume(volume);});
      pin.addEventListener("focus",function(){selectVolume(volume);});
    });
  }

  function renderZukanStub(volumeId){
    var volume=volumeById(volumeId),progress=volumeProgress(volume,profile.collection);
    document.getElementById("app").innerHTML='<main class="kom-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← えんせい</button><div><h1>📖 '+displayText(volume.regionName)+'の ずかん</h1></div></header>'
      +'<section class="expedition-panel center"><p class="stub-progress">あつめた虫　'+progress.caught+'／'+progress.denominator+'</p><p>ずかんは じゅんび中です。</p></section></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(volume.id);});
  }

  function renderError(){
    document.getElementById("app").innerHTML='<main class="kom-page"><section class="expedition-panel center"><h1>よみこめませんでした</h1><p>ページを よみなおしてね。</p><a class="kom-back" href="../keisan/index.html">← けいさん</a></section></main>';
  }

  function loadWorldMap(){
    if(typeof global.fetch!=="function")return Promise.reject(new Error("地図を読み込めません"));
    return global.fetch("assets/world_paths.json").then(function(response){
      if(!response.ok)throw new Error("地図を読み込めません");
      return response.json();
    });
  }

  function boot(){
    if(!global.QuestSave){renderError();return;}
    profileId=QuestSave.currentProfile();
    if(!profileId){renderError();return;}
    demoMode=/[?&]demo\b/.test(global.location&&global.location.search||"");
    var pull=QuestSave.syncDown?QuestSave.syncDown().catch(function(){}):Promise.resolve();
    pull.then(function(){return Promise.all([QuestSave.load("komorebi",profileId),QuestSave.load("keisan",profileId),loadWorldMap()]);}).then(function(data){
      var normalized=normalizeProfile(data[0]);
      profile=normalized.profile;
      profileType=data[1]&&data[1].type==="k5"?"k5":"k10";
      worldMap=validateMapPayload(data[2],expeditionVolumes());
      return normalized.changed?saveProfile():true;
    /* renderMap を直接渡すと Promise の解決値が selectedId として届いてしまう。 */
    }).then(function(){renderMap();}).catch(renderError);
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
    mapPinState:mapPinState,
    validateMapPayload:validateMapPayload,
    formatCourseText:formatCourseText,
    recordResult:recordResult,
    speciesForArea:speciesForArea,
    profile:function(){return profile;}
  };
  if(!global.Q4B_KOMOREBI_NO_BOOT&&global.document)boot();
})(window);
