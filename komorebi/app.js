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
  var RATIO_SET_SIZE=5;
  var RATIO_FORM_MIX={
    1:{normal:5,formulation:0,ordering:0,diagnosis:0},
    2:{normal:3,formulation:2,ordering:0,diagnosis:0},
    3:{normal:2,formulation:3,ordering:0,diagnosis:0},
    4:{normal:1,formulation:2,ordering:0,diagnosis:2},
    5:{normal:2,formulation:1,ordering:2,diagnosis:0},
    6:{normal:1,formulation:0,ordering:2,diagnosis:2},
    7:{normal:2,formulation:0,ordering:0,diagnosis:3},
    8:{normal:2,formulation:1,ordering:2,diagnosis:0},
    9:{normal:1,formulation:1,ordering:0,diagnosis:3},
    10:{normal:1,formulation:1,ordering:1,diagnosis:2}
  };
  var RATIO_STATIC_LEVELS={ordering:[5,6,8],diagnosis:[4,6,7,9]};
  var RATIO_PATTERN_BY_LEVEL={4:"find_base",5:"discount",6:"two_step",7:"ratio_share",8:"soutou",9:"baibai"};
  var profile=null, profileId=null, profileType="k10", worldMap=null, ratioPool=null, ratioSession=null;
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

  function validateRatioHistory(history){
    if(!isObject(history)||!Array.isArray(history.itemIds)||!Array.isArray(history.patternIds))throw new Error("割合の履歴データの形式が正しくありません");
    [history.itemIds,history.patternIds].forEach(function(values){
      if(values.some(function(value){return typeof value!=="string"||!value;}))throw new Error("割合の履歴データの形式が正しくありません");
    });
    return history;
  }

  function validateRatioPoolItem(item,ids){
    if(!isObject(item)||typeof item.id!=="string"||!item.id||hasOwn(ids,item.id)||!Number.isInteger(item.lv)||item.lv<1||item.lv>10||typeof item.text!=="string"||!item.text||typeof item.explanation!=="string"||!item.explanation)throw new Error("割合問題データの形式が正しくありません");
    ids[item.id]=true;
    if(item.kind==="order"){
      if(!Array.isArray(item.parts)||item.parts.length<3||item.parts.length>4||item.parts.some(function(part){return typeof part!=="string"||!part;})||!Array.isArray(item.ans)||item.ans.length!==item.parts.length)throw new Error("整列問題データの形式が正しくありません");
      var sorted=item.ans.slice().sort(function(a,b){return a-b;});
      if(sorted.some(function(value,index){return value!==index;}))throw new Error("整列問題の答えが正しくありません");
    }else if(item.kind==="choice"){
      if(!Array.isArray(item.work)||!item.work.length||item.work.some(function(line){return typeof line!=="string"||!line;})||!Array.isArray(item.choices)||item.choices.length!==4||item.choices.some(function(choice){return typeof choice!=="string"||!choice;})||!Number.isInteger(item.ans)||item.ans<0||item.ans>=4)throw new Error("診断問題データの形式が正しくありません");
    }else throw new Error("割合問題の種類が正しくありません");
  }

  function validateRatioPool(pool){
    if(!Array.isArray(pool)||!pool.length)throw new Error("割合問題を読み込めません");
    var ids=Object.create(null);
    pool.forEach(function(item){validateRatioPoolItem(item,ids);});
    return pool;
  }

  function ratioGenerator(){
    var generator=global.Q4B_KOMOREBI_RATIO_GENERATOR;
    if(!generator||typeof generator.generateForLv!=="function"||typeof generator.generatePair!=="function")throw new Error("割合問題の生成器を読み込めません");
    return generator;
  }

  function shuffled(values,random){
    var result=values.slice();
    for(var i=result.length-1;i>0;i--){
      var j=Math.floor(randomValue(random)*(i+1)),tmp=result[i];
      result[i]=result[j];result[j]=tmp;
    }
    return result;
  }

  function staticCandidates(pool,format,lv){
    var kind=format==="ordering"?"order":"choice";
    var levels=lv===10?RATIO_STATIC_LEVELS[format]:[lv];
    return pool.filter(function(item){return item.kind===kind&&levels.indexOf(item.lv)>=0;});
  }

  function pickStaticQuestion(pool,format,lv,recentIds,usedIds,random){
    var candidates=staticCandidates(pool,format,lv).filter(function(item){return usedIds.indexOf(item.id)<0;});
    if(!candidates.length)return null;
    var fresh=candidates.filter(function(item){return recentIds.indexOf(item.id)<0;});
    var source=(fresh.length?fresh:candidates)[Math.floor(randomValue(random)*(fresh.length?fresh.length:candidates.length))];
    var question=JSON.parse(JSON.stringify(source));
    question.sourceLv=source.lv;
    question.lv=lv;
    question.format=format;
    question.waza={primary:source.explanation,alternate:source.alternate||""};
    if(question.kind==="order")question.displayOrder=shuffled(question.ans,random);
    usedIds.push(question.id);
    return question;
  }

  function freshGenerated(lv,format,blocked,random){
    var fallback=null,question=null;
    for(var attempt=0;attempt<60;attempt++){
      question=ratioGenerator().generateForLv(lv,format,random);
      if(!fallback)fallback=question;
      if(blocked.indexOf(question.patternId)<0)return question;
    }
    return fallback;
  }

  function freshGeneratedNormal(pattern,lv,blocked,random){
    var fallback=null,question=null;
    for(var attempt=0;attempt<60;attempt++){
      question=ratioGenerator().generate(pattern,lv,"normal",random);
      if(!fallback)fallback=question;
      if(blocked.indexOf(question.patternId)<0)return question;
    }
    return fallback;
  }

  function freshGeneratedPair(lv,blocked,random){
    var patterns=ratioGenerator().patternsForLv(lv,"formulation"),fallback=null,pair=null;
    for(var attempt=0;attempt<60;attempt++){
      var pattern=patterns[Math.floor(randomValue(random)*patterns.length)];
      pair=ratioGenerator().generatePair(pattern,lv,random);
      if(!fallback)fallback=pair;
      if(blocked.indexOf(pair.normal.patternId)<0)return pair;
    }
    return fallback;
  }

  function markRatioChain(recognition,normal,number){
    var chainId="ratio_chain_"+number;
    recognition.chainId=chainId;
    recognition.chainRole="recognition";
    recognition.chainPatternId=normal.patternId;
    normal.chainId=chainId;
    normal.chainRole="normal";
    return [recognition,normal];
  }

  function appendGeneratedUnit(units,question,usedPatterns){
    usedPatterns.push(question.patternId);
    units.push([question]);
  }

  function buildRatioUnits(pool,lv,mix,recent,random){
    var units=[],usedIds=[],usedPatterns=recent.patternIds.slice(),orders=[],diagnoses=[],i,question;
    for(i=0;i<mix.ordering;i++){
      question=pickStaticQuestion(pool,"ordering",lv,recent.itemIds,usedIds,random);
      if(question)orders.push(question);else mix.normal++;
    }
    for(i=0;i<mix.diagnosis;i++){
      question=pickStaticQuestion(pool,"diagnosis",lv,recent.itemIds,usedIds,random);
      if(question)diagnoses.push(question);else mix.normal++;
    }
    var normalLeft=mix.normal,chainNumber=0;
    while(diagnoses.length&&normalLeft){
      var diagnosis=diagnoses.shift(),pattern=RATIO_PATTERN_BY_LEVEL[diagnosis.sourceLv];
      var child=freshGeneratedNormal(pattern,lv,usedPatterns,random);
      usedPatterns.push(child.patternId);units.push(markRatioChain(diagnosis,child,++chainNumber));normalLeft--;
    }
    diagnoses.forEach(function(item){units.push([item]);});
    return {units:units,orders:orders,normalLeft:normalLeft,formulationCount:mix.formulation,usedPatterns:usedPatterns,chainNumber:chainNumber};
  }

  function finishRatioUnits(state,lv,random){
    while(state.formulationCount&&state.normalLeft){
      var pair=freshGeneratedPair(lv,state.usedPatterns,random);
      state.usedPatterns.push(pair.normal.patternId);
      state.units.push(markRatioChain(pair.formulation,pair.normal,++state.chainNumber));
      state.formulationCount--;state.normalLeft--;
    }
    while(state.formulationCount){
      appendGeneratedUnit(state.units,freshGenerated(lv,"formulation",state.usedPatterns,random),state.usedPatterns);
      state.formulationCount--;
    }
    state.orders.forEach(function(item){state.units.push([item]);});
    while(state.normalLeft){
      appendGeneratedUnit(state.units,freshGenerated(lv,"normal",state.usedPatterns,random),state.usedPatterns);
      state.normalLeft--;
    }
    return state.units;
  }

  function buildRatioSet(pool,lv,history,random){
    validateRatioPool(pool);
    if(!Number.isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var recent=history==null?{itemIds:[],patternIds:[]}:validateRatioHistory(history);
    var mix=Object.assign({},RATIO_FORM_MIX[lv]);
    var units=finishRatioUnits(buildRatioUnits(pool,lv,mix,recent,random),lv,random);
    var questions=[];
    shuffled(units,random).forEach(function(unit){questions=questions.concat(unit);});
    if(questions.length!==RATIO_SET_SIZE)throw new Error("5問セットを作れません");
    return questions;
  }

  function updateRatioHistory(history,questions){
    var next={itemIds:history.itemIds.slice(),patternIds:history.patternIds.slice()};
    questions.forEach(function(question){
      if(question.id)next.itemIds.push(question.id);
      if(question.patternId)next.patternIds.push(question.patternId);
    });
    next.itemIds=next.itemIds.slice(-12);
    next.patternIds=next.patternIds.slice(-12);
    return next;
  }

  function expectedChoiceIndex(question){
    if(Number.isInteger(question.ans))return question.ans;
    return Array.isArray(question.choices)?question.choices.indexOf(question.ans):-1;
  }

  function judgeRatioAnswer(question,answer){
    if(!isObject(question)||!hasOwn(FORMAT_KINDS,question.format)||!hasOwn(FORMAT_KINDS[question.format],question.kind))throw new Error("割合問題の形式が正しくありません");
    if(question.kind==="order"){
      if(!Array.isArray(answer)||!Array.isArray(question.ans)||answer.length!==question.ans.length)return false;
      return question.ans.every(function(value,index){return answer[index]===value;});
    }
    if(question.kind==="choice")return Number.isInteger(answer)&&answer===expectedChoiceIndex(question);
    var numeric=typeof answer==="number"?answer:Number(String(answer).trim());
    return Number.isFinite(numeric)&&Number.isFinite(question.ans)&&Math.abs(numeric-question.ans)<1e-9;
  }

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
    return {schemaVersion:1,unlocked:true,discoverySeen:false,lv:lv,maxLv:maxLv,stats:{},recent:{},adapt:{},ratioHistory:{itemIds:[],patternIds:[]},collection:{gauge:0,totalCatches:0,catches:{}},trophies:{},srs:{}};
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
    if(p.ratioHistory==null){p.ratioHistory={itemIds:[],patternIds:[]};changed=true;}
    else{
      validateRatioHistory(p.ratioHistory);
      if(p.ratioHistory.itemIds.length>12){p.ratioHistory.itemIds=p.ratioHistory.itemIds.slice(-12);changed=true;}
      if(p.ratioHistory.patternIds.length>12){p.ratioHistory.patternIds=p.ratioHistory.patternIds.slice(-12);changed=true;}
    }
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

  function applyPerformance(targetProfile,cat,ok,ms){
    if(!isObject(targetProfile)||!hasOwn(CATEGORIES,cat))throw new Error("カテゴリが正しくありません");
    if(typeof ok!=="boolean"||!Number.isFinite(ms)||ms<0)throw new Error("結果データが正しくありません");
    var s=targetProfile.stats[cat]||(targetProfile.stats[cat]={ok:0,n:0,ms:0});
    if(!Number.isInteger(s.ok)||!Number.isInteger(s.n)||!Number.isFinite(s.ms))throw new Error("統計データが正しくありません");
    s.n++;if(ok)s.ok++;s.ms+=ms;
    var recent=targetProfile.recent[cat]||(targetProfile.recent[cat]=[]);
    var adapt=targetProfile.adapt[cat]||(targetProfile.adapt[cat]={n:0,recent:[]});
    if(!Array.isArray(recent)||!Number.isInteger(adapt.n)||!Array.isArray(adapt.recent))throw new Error("統計データが正しくありません");
    recent.push(ok?1:0);while(recent.length>20)recent.shift();
    adapt.n++;adapt.recent.push(ok?1:0);while(adapt.recent.length>20)adapt.recent.shift();
    if(adapt.n%10===0){
      var ok10=adapt.recent.slice(-10).reduce(function(sum,value){return sum+value;},0);
      if(ok10>=9&&targetProfile.lv[cat]<CATEGORIES[cat].maxLv){targetProfile.lv[cat]++;targetProfile.maxLv[cat]=Math.max(targetProfile.maxLv[cat],targetProfile.lv[cat]);}
      else if(ok10<=5&&targetProfile.lv[cat]>1)targetProfile.lv[cat]--;
    }
    return targetProfile;
  }

  function recordResult(cat,ok,ms){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    var before=JSON.parse(JSON.stringify(profile));
    try{applyPerformance(profile,cat,ok,ms);}catch(error){return Promise.reject(error);}
    var saved;
    try{saved=saveProfile();}catch(error){profile=before;return Promise.reject(error);}
    return saved.catch(function(error){
      profile=before;
      throw error;
    });
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

  function recordRatioSubmission(answer,volume,random,correct,elapsed){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    var before=JSON.parse(JSON.stringify(profile)),result;
    try{
      result=applyAnswer(profile,"kom_ratio",answer,volume,random);
      if(!result.duplicate)applyPerformance(profile,"kom_ratio",correct,elapsed);
    }catch(error){profile=before;return Promise.reject(error);}
    if(result.duplicate)return Promise.resolve(result);
    var saved;
    try{saved=saveProfile();}catch(error){profile=before;return Promise.reject(error);}
    return saved.then(function(){return result;}).catch(function(error){profile=before;throw error;});
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

  function ratioGaugeHtml(){
    return '<span class="ratio-gauge">'+displayText("採集ゲージ")+' <strong>'+displayText(profile.collection.gauge+'／'+COLLECTION_CONFIG.gaugeNeed)+'</strong></span>';
  }

  function ratioChoiceHtml(question){
    return '<div class="ratio-choices">'+question.choices.map(function(choice,index){
      return '<button type="button" class="ratio-choice" data-choice-index="'+index+'">'+displayText(choice)+'</button>';
    }).join("")+'</div>';
  }

  function ratioOrderHtml(question){
    return '<ol class="ratio-order-answer" id="ratioOrderAnswer" aria-live="polite"></ol>'
      +'<div class="ratio-parts">'+question.displayOrder.map(function(index){return '<button type="button" class="ratio-part" data-part-index="'+index+'">'+displayText(question.parts[index])+'</button>';}).join("")+'</div>'
      +'<div class="ratio-order-actions"><button type="button" class="ratio-reset" data-action="reset-order">'+displayText("やりなおし")+'</button>'
      +'<button type="button" class="ratio-submit" data-action="submit-order" disabled>'+displayText("答える")+'</button></div>';
  }

  function ratioQuestionBodyHtml(question){
    var scaffold=question.scaffold?'<p class="ratio-scaffold">'+displayText(question.scaffold)+'</p>':"";
    var work=question.work?'<div class="ratio-work">'+question.work.map(function(line){return '<p>'+displayText(line)+'</p>';}).join("")+'</div>':"";
    var controls;
    if(question.kind==="choice")controls=ratioChoiceHtml(question);
    else if(question.kind==="order")controls=ratioOrderHtml(question);
    else controls='<form class="ratio-number-form" data-answer-form><input name="answer" type="text" inputmode="decimal" autocomplete="off" aria-label="'+displayText("答え")+'"><button type="submit" class="ratio-submit">'+displayText("答える")+'</button></form>';
    return scaffold+'<h2>'+displayText(question.text)+'</h2>'+work+controls;
  }

  function ratioAnswerText(question){
    if(question.kind==="order")return question.ans.map(function(index){return question.parts[index];}).join(" → ");
    if(question.kind==="choice")return question.choices[expectedChoiceIndex(question)]||"";
    return String(question.ans);
  }

  function wazaCardHtml(question){
    var waza=question.waza||{primary:question.explanation||"",alternate:""};
    if(!waza.primary)return "";
    var alternate=waza.alternate?'<p><strong>'+displayText("別の道")+'</strong><span>'+displayText(waza.alternate)+'</span></p>':"";
    return '<aside class="ratio-waza"><h3>'+displayText("わざ")+'</h3><p><strong>'+displayText("主な道")+'</strong><span>'+displayText(waza.primary)+'</span></p>'+alternate+'</aside>';
  }

  /* 本編 keisan/app.js の showCapture と同じ情報を出す: 虫の SVG、和名、レア度タグ、
     サイズ、NEW か 何匹め。SVG と TIERNAME は Q4BReward を使い回し、別実装にしない。
     bugs.js に種が無い場合 (差し替え途中など) は名前とレア度まで落として描く。 */
  function ratioCaptureHtml(capture){
    if(!capture)return "";
    var reward=global.Q4BReward,sp=reward&&reward.spById?reward.spById(capture.id):null;
    var tier=sp?sp.r:null;
    var tierName=(reward&&reward.TIERNAME&&tier!=null)?reward.TIERNAME[tier]:capture.rarity;
    var art=(sp&&reward.svg)?'<div class="ratio-capture-art r'+tier+'">'+reward.svg(sp,capture.shiny)+'</div>':"";
    var name=sp?sp.jaName:capture.id;
    var size=capture.size?'<span class="ratio-capture-size">'+capture.size+'mm</span>':"";
    var tag=capture.isNew
      ?'<span class="ratio-capture-new">'+displayText("ずかんに とうろく")+'</span>'
      :'<span class="ratio-capture-again">'+displayText(capture.n+"匹め")+'</span>';
    var note=(sp&&sp.note)?'<p class="ratio-capture-note">'+displayText(sp.note)+'</p>':"";
    return '<div class="ratio-capture" role="status"><strong>'+displayText("つかまえた！")+'</strong>'
      +art+'<div class="ratio-capture-name">'+displayText(name)+(capture.shiny?" ✨":"")+'</div>'
      +'<div class="ratio-capture-meta"><span class="ratio-capture-tier r'+tier+'">'+displayText(tierName)+'</span>'+size+tag+'</div>'
      +note+'</div>';
  }

  function ratioFeedbackHtml(question,correct,result){
    var mark=correct?"正解！":"もう一歩！";
    var answer=correct?"":'<p class="ratio-answer"><strong>'+displayText("答え")+'</strong> '+displayText(ratioAnswerText(question))+'</p>';
    return '<div class="ratio-feedback '+(correct?'is-correct':'is-wrong')+'"><h2>'+displayText(mark)+'</h2>'+answer+wazaCardHtml(question)+ratioCaptureHtml(result&&result.capture)+'</div>';
  }

  /* 本編 keisan/app.js の lvDotsHTML と同じ規則。stats ではなく adapt バッファを見る
     ことが要点で、そうしないと「画面ではあと 1 問なのに実際は 7 問」の乖離が起きる。 */
  function lvDotsHtml(cat){
    var adapt=profile.adapt&&profile.adapt[cat],lv=(profile.lv&&profile.lv[cat])||1;
    var n=adapt?adapt.n:0,inBlock=n%10,recent=adapt?adapt.recent.slice(-inBlock):[],dots="";
    for(var i=0;i<10;i++)dots+=(i<inBlock)?(recent[i]?"●":"✗"):"○";
    return '<span class="ratio-lv" aria-label="'+displayText("レベル"+lv+"、10問中"+inBlock+"問め")+'">Lv'+lv+'　'+dots+'</span>';
  }

  function ratioSessionShell(body){
    return '<main class="kom-page ratio-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back-map">← '+displayText("小道")+'</button></header>'
      +'<div class="ratio-session-head"><div><h1>'+displayText("割合と比")+'</h1><p>'+displayText("第"+(ratioSession.index+1)+"／"+RATIO_SET_SIZE+"問")+'</p>'+lvDotsHtml(ratioSession.cat||"kom_ratio")+'</div>'+ratioGaugeHtml()+'</div>'
      +'<section class="ratio-panel">'+body+'</section></main>';
  }

  function renderOrderSelection(question){
    var list=document.getElementById("ratioOrderAnswer");
    if(list)list.innerHTML=ratioSession.orderSelection.length?ratioSession.orderSelection.map(function(index){return '<li>'+displayText(question.parts[index])+'</li>';}).join(""):'<li class="ratio-order-placeholder">'+displayText("順番に選びましょう")+'</li>';
    Array.prototype.forEach.call(document.querySelectorAll("[data-part-index]"),function(button){
      button.disabled=ratioSession.orderSelection.indexOf(Number(button.getAttribute("data-part-index")))>=0;
    });
    var submit=document.querySelector('[data-action="submit-order"]');
    if(submit)submit.disabled=ratioSession.orderSelection.length!==question.parts.length;
  }

  function bindRatioQuestion(question){
    document.querySelector('[data-action="back-map"]').addEventListener("click",function(){ratioSession=null;renderMap(question.volumeId);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-choice-index]"),function(button){
      button.addEventListener("click",function(){submitRatioAnswer(Number(button.getAttribute("data-choice-index")));});
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-part-index]"),function(button){
      button.addEventListener("click",function(){ratioSession.orderSelection.push(Number(button.getAttribute("data-part-index")));renderOrderSelection(question);});
    });
    var reset=document.querySelector('[data-action="reset-order"]'),submit=document.querySelector('[data-action="submit-order"]');
    if(reset)reset.addEventListener("click",function(){ratioSession.orderSelection=[];renderOrderSelection(question);});
    if(submit)submit.addEventListener("click",function(){submitRatioAnswer(ratioSession.orderSelection.slice());});
    var form=document.querySelector("[data-answer-form]");
    if(form)form.addEventListener("submit",function(event){event.preventDefault();submitRatioAnswer(form.elements.answer.value);});
  }

  function renderRatioQuestion(errorMessage){
    var question=ratioSession.questions[ratioSession.index];
    question.volumeId=ratioSession.volumeId;
    ratioSession.orderSelection=[];
    ratioSession.startedAt=Date.now();
    var error=errorMessage?'<p class="ratio-error" role="alert">'+displayText(errorMessage)+'</p>':"";
    document.getElementById("app").innerHTML=ratioSessionShell(error+ratioQuestionBodyHtml(question));
    bindRatioQuestion(question);
    if(question.kind==="order")renderOrderSelection(question);
  }

  function renderRatioFeedback(question,correct,result){
    var last=ratioSession.index===ratioSession.questions.length-1;
    var label=last?"小道へ戻る":"次の問題";
    document.getElementById("app").innerHTML=ratioSessionShell(ratioFeedbackHtml(question,correct,result)
      +'<button type="button" class="ratio-next" data-action="ratio-next">'+displayText(label)+'</button>');
    document.querySelector('[data-action="back-map"]').addEventListener("click",function(){var id=ratioSession.volumeId;ratioSession=null;renderMap(id);});
    document.querySelector('[data-action="ratio-next"]').addEventListener("click",function(){
      if(last){var id=ratioSession.volumeId;ratioSession=null;renderMap(id);}
      else{ratioSession.index++;renderRatioQuestion();}
    });
  }

  function submitRatioAnswer(answer){
    if(!ratioSession||ratioSession.pending)return;
    var activeSession=ratioSession,question=activeSession.questions[activeSession.index],correct;
    try{correct=judgeRatioAnswer(question,answer);}catch(error){renderRatioQuestion("答えを確かめられませんでした。もう一度試してください。");return;}
    activeSession.pending=true;
    var submissionId=activeSession.id+":"+activeSession.index+":"+(activeSession.attempts++);
    var event={sessionId:activeSession.id,submissionId:submissionId,format:question.format,kind:question.kind,correct:correct,final:true,retry:false};
    var elapsed=Math.max(0,Date.now()-activeSession.startedAt),volume=volumeById(activeSession.volumeId);
    recordRatioSubmission(event,volume,Math.random,correct,elapsed).then(function(result){
      if(ratioSession!==activeSession)return;
      activeSession.pending=false;renderRatioFeedback(question,correct,result);
    }).catch(function(){
      if(ratioSession!==activeSession)return;
      activeSession.pending=false;renderRatioQuestion("答えを保存できませんでした。もう一度試してください。");
    });
  }

  function startRatioSession(volume,random){
    if(!profile||!ratioPool)return Promise.reject(new Error("割合問題を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_ratio")<0)return Promise.reject(new Error("この小道では割合と比を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=buildRatioSet(ratioPool,profile.lv.kom_ratio,profile.ratioHistory,generatorRandom);
      sessionId="ratio_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    var previous=JSON.parse(JSON.stringify(profile.ratioHistory));
    profile.ratioHistory=updateRatioHistory(profile.ratioHistory,questions);
    var saved;
    try{saved=saveProfile();}catch(error){profile.ratioHistory=previous;return Promise.reject(error);}
    return saved.then(function(){
      ratioSession={id:sessionId,volumeId:volume.id,questions:questions,index:0,attempts:0,pending:false,orderSelection:[],startedAt:0};
      renderRatioQuestion();
      return ratioSession;
    }).catch(function(error){profile.ratioHistory=previous;throw error;});
  }

  function pathPanelHtml(volume){
    var progress=volumeProgress(volume,viewCollection()),buttons="";
    volume.categories.forEach(function(cat){
      if(cat==="kom_ratio")buttons+='<button type="button" class="path-choice" data-cat="kom_ratio"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span><span class="path-choice-note">'+displayText("Lv "+profile.lv[cat])+'</span></button>';
      else buttons+='<button type="button" class="path-choice" disabled aria-disabled="true"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span><span class="path-choice-note">'+displayText("準備中")+'</span></button>';
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

  function bindPathPanel(volume){
    document.querySelector('#pathPanel [data-action="zukan"]').addEventListener("click",function(){renderZukan(volume.id);});
    var ratioButton=document.querySelector('#pathPanel [data-cat="kom_ratio"]');
    if(ratioButton)ratioButton.addEventListener("click",function(){
      ratioButton.disabled=true;
      startRatioSession(volume,Math.random).catch(function(){
        ratioButton.disabled=false;
        var panel=document.getElementById("pathPanel");
        if(panel&&!panel.querySelector(".ratio-start-error"))panel.insertAdjacentHTML("afterbegin",'<p class="ratio-start-error" role="alert">'+displayText("割合問題を始められませんでした。もう一度試してください。")+'</p>');
      });
    });
  }

  function selectVolume(volume){
    var panel=document.getElementById("pathPanel");
    if(!panel)return;
    panel.innerHTML=pathPanelHtml(volume);
    bindPathPanel(volume);
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
    bindPathPanel(selected);
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      var volume=volumeById(pin.getAttribute("data-volume-id"));
      pin.addEventListener("click",function(){selectVolume(volume);});
      pin.addEventListener("focus",function(){selectVolume(volume);});
    });
  }

  /* 図鑑の絞り込み。本編 keisan の zukanMatchK と同じ語彙 (レア度 tier / 分類キー /
     未捕獲を隠す / 検索) を使うが、状態は小道側に持つ。本編の KZ_* は keisan の
     プロフィールに束縛されているため共有できない。 */
  var zukanFilter={rarity:"",group:"",caughtOnly:false,query:""};

  function zukanGroupKey(sp){ return sp?(sp.familyJa||sp.orderJa||sp.groupJa||""):""; }

  function zukanMatches(sp,record){
    var reward=global.Q4BReward;
    if(zukanFilter.rarity!==""&&sp&&String(reward.tierOf(sp))!==zukanFilter.rarity)return false;
    if(zukanFilter.group!==""&&zukanGroupKey(sp)!==zukanFilter.group)return false;
    if(zukanFilter.caughtOnly&&!record)return false;
    var q=zukanFilter.query.trim().toLowerCase();
    if(q&&sp){
      var hay=(sp.jaName+" "+(sp.scientificName||"")+" "+zukanGroupKey(sp)).toLowerCase();
      if(hay.indexOf(q)<0)return false;
    }
    return true;
  }

  function zukanFilterBarHtml(entries){
    var reward=global.Q4BReward,groups=[],seen={};
    entries.forEach(function(item){
      var key=zukanGroupKey(item.sp);
      if(key&&!seen[key]){seen[key]=1;groups.push(key);}
    });
    groups.sort(function(a,b){return a.localeCompare(b,"ja");});
    var tiers=[["","すべて"],["2","スーパーレア"],["1","レア"],["0","ノーマル"]].map(function(pair){
      return '<button type="button" class="zukan-chip'+(zukanFilter.rarity===pair[0]?" is-on":"")+'" data-filter="rarity" data-value="'+pair[0]+'">'+displayText(pair[1])+'</button>';
    }).join("");
    var groupOpts='<option value="">'+displayText("すべての なかま")+'</option>'+groups.map(function(key){
      return '<option value="'+escapeHtml(key)+'"'+(zukanFilter.group===key?" selected":"")+'>'+displayText(key)+'</option>';
    }).join("");
    return '<div class="zukan-filters"><div class="zukan-chips" role="group" aria-label="'+displayText("レア度でしぼる")+'">'+tiers+'</div>'
      +'<div class="zukan-controls"><select id="zukanGroup" aria-label="'+displayText("なかまでしぼる")+'">'+groupOpts+'</select>'
      +'<label class="zukan-toggle"><input type="checkbox" id="zukanCaught"'+(zukanFilter.caughtOnly?" checked":"")+'>'+displayText("つかまえたものだけ")+'</label>'
      +'<input type="search" id="zukanQuery" value="'+escapeHtml(zukanFilter.query)+'" placeholder="'+displayText("なまえでさがす")+'" aria-label="'+displayText("なまえでさがす")+'"></div></div>';
  }

  /* 小道の図鑑。本編とは別カウントで、その volume の種だけを並べる (ui_design 5 章)。
     捕獲済みは本編と同じ描画資産 (Q4BRender 経由の SVG)、未捕獲は ? 枠で残す。 */
  function zukanCardHtml(entry,record){
    var reward=global.Q4BReward,sp=reward&&reward.spById?reward.spById(entry.id):null;
    if(!record){
      return '<li class="zukan-card is-unknown"><div class="zukan-art"><span>？</span></div>'
        +'<div class="zukan-name">'+displayText("まだ つかまえていない")+'</div>'
        +'<div class="zukan-meta"><span class="zukan-tier r'+(sp?sp.r:0)+'">'+displayText(sp&&reward.TIERNAME?reward.TIERNAME[sp.r]:entry.rarity)+'</span></div></li>';
    }
    var art=(sp&&reward.svg)?reward.svg(sp,record.records&&record.records.some(function(r){return r.shiny;})):"";
    var size=Number.isFinite(record.max)?'<span>'+record.max+'mm</span>':"";
    return '<li class="zukan-card'+(entry.flagship?' is-flagship':'')+'" data-species-id="'+escapeHtml(entry.id)+'" tabindex="0" role="button"><div class="zukan-art r'+(sp?sp.r:0)+'">'+art+'</div>'
      +'<div class="zukan-name">'+displayText(sp?sp.jaName:entry.id)+'</div>'
      +'<div class="zukan-meta"><span class="zukan-tier r'+(sp?sp.r:0)+'">'+displayText(sp&&reward.TIERNAME?reward.TIERNAME[sp.r]:entry.rarity)+'</span>'
      +size+'<span>'+displayText(record.n+"匹")+'</span></div>'
      +(entry.flagship?'<div class="zukan-flag">'+displayText("この遠征の 看板")+'</div>':"")+'</li>';
  }

  function renderZukan(volumeId){
    var volume=volumeById(volumeId),collection=viewCollection(),progress=volumeProgress(volume,collection);
    var reward=global.Q4BReward;
    var entries=volume.species.map(function(entry){
      return {entry:entry,sp:reward&&reward.spById?reward.spById(entry.id):null,record:collection.catches[entry.id]};
    });
    var shown=entries.filter(function(item){return zukanMatches(item.sp,item.record);});
    var cards=shown.map(function(item){return zukanCardHtml(item.entry,item.record);}).join("")
      ||'<li class="zukan-empty">'+displayText("じょうけんに あう虫は いないよ。")+'</li>';
    document.getElementById("app").innerHTML='<main class="kom-page zukan-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText(volume.regionName+"の小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText(volume.regionName+"の ずかん")+'</h1>'
      +'<p>'+displayText("あつめた虫")+'　<strong>'+progress.caught+'／'+progress.denominator+'</strong>'
      +(shown.length!==entries.length?'　<span class="zukan-shown">'+displayText("ひょうじ中 "+shown.length+"種")+'</span>':"")+'</p></div>'
      +zukanFilterBarHtml(entries)
      +'<ul class="zukan-grid">'+cards+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(volume.id);});
    bindZukanFilters(volume.id);
    bindZukanCards(entries,volume.id);
  }

  function bindZukanFilters(volumeId){
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="rarity"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.rarity=button.getAttribute("data-value");
        renderZukan(volumeId);
      });
    });
    var group=document.getElementById("zukanGroup");
    if(group)group.addEventListener("change",function(){zukanFilter.group=group.value;renderZukan(volumeId);});
    var caught=document.getElementById("zukanCaught");
    if(caught)caught.addEventListener("change",function(){zukanFilter.caughtOnly=caught.checked;renderZukan(volumeId);});
    var query=document.getElementById("zukanQuery");
    if(query)query.addEventListener("input",function(){
      zukanFilter.query=query.value;
      renderZukan(volumeId);
      var again=document.getElementById("zukanQuery");
      if(again){again.focus();again.setSelectionRange(again.value.length,again.value.length);}
    });
  }

  /* 捕獲済みカードをタップすると、本編と同じ詳細 (Q4BZukan.detailHTML) を開く。
     detailHTML は捕獲記録と種を引数で受ける汎用 API なので、小道の記録をそのまま渡せる。 */
  function bindZukanCards(entries,volumeId){
    Array.prototype.forEach.call(document.querySelectorAll(".zukan-card[data-species-id]"),function(card){
      function open(){
        var item=entries.filter(function(x){return x.entry.id===card.getAttribute("data-species-id");})[0];
        if(item&&item.record&&item.sp)openZukanModal(item);
      }
      card.addEventListener("click",open);
      card.addEventListener("keydown",function(event){
        if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}
      });
    });
  }

  /* 本編 keisan の図鑑詳細と同じ体裁: 背景タップで閉じるモーダル、種名・レア度・
     捕獲サイズ・学名・分類・注意・説明の順。中身は共有の Q4BZukan.detailHTML。 */
  function openZukanModal(item){
    closeZukanModal();
    var reward=global.Q4BReward,sp=item.sp,record=item.record,tier=sp.r;
    var size=sp.sizeMm?sp.sizeMm[0]+"〜"+sp.sizeMm[1]+"mm":"";
    var caught=Number.isFinite(record.max)?record.max+"mm":"";
    var detail=(global.Q4BZukan&&global.Q4BZukan.detailHTML)?global.Q4BZukan.detailHTML(record,sp,{}):"";
    var overlay=document.createElement("div");
    overlay.className="kom-modal";
    overlay.id="komZukanModal";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +'<div class="kom-modal-art r'+tier+'">'+(reward.svg?reward.svg(sp,record.records&&record.records.some(function(r){return r.shiny;})):"")+'</div>'
      +'<h3>'+displayText(sp.jaName)+'</h3>'
      +'<p><span class="zukan-tier r'+tier+'">'+displayText(reward.TIERNAME[tier])+'</span>　'+displayText("×"+record.n)+'</p>'
      +(caught?'<p class="kom-modal-size">'+displayText("つかまえた おおきさ")+' <b>'+caught+'</b>'+(size?'　'+displayText("（種の範囲: "+size+"）"):"")+'</p>':"")
      +(sp.scientificName?'<p class="kom-modal-sci"><i>'+escapeHtml(sp.scientificName)+'</i></p>':"")
      +'<p class="kom-modal-taxon">'+displayText([sp.orderJa,sp.familyJa,sp.groupJa].filter(Boolean).join(" / "))+'</p>'
      +(sp.caution?'<p class="kom-modal-caution">'+displayText(sp.caution)+'</p>':"")
      +(sp.note?'<p class="kom-modal-note">'+displayText(sp.note)+'</p>':"")
      +detail
      +'<button type="button" class="kom-modal-close">'+displayText("とじる")+'</button></div>';
    overlay.addEventListener("click",function(event){
      if(event.target===overlay||event.target.className==="kom-modal-close")closeZukanModal();
    });
    document.body.appendChild(overlay);
    if(global.Q4BZukan&&global.Q4BZukan.attachLightbox)global.Q4BZukan.attachLightbox();
    var close=overlay.querySelector(".kom-modal-close");
    if(close)close.focus();
  }

  function closeZukanModal(){
    var existing=document.getElementById("komZukanModal");
    if(existing&&existing.parentNode)existing.parentNode.removeChild(existing);
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

  function loadRatioPool(){
    if(typeof global.fetch!=="function")return Promise.reject(new Error("割合問題を読み込めません"));
    return global.fetch("assets/ratio_pool.json").then(function(response){
      if(!response.ok)throw new Error("割合問題を読み込めません");
      return response.json();
    }).then(validateRatioPool);
  }

  function boot(){
    if(!global.QuestSave){renderError();return;}
    profileId=QuestSave.currentProfile();
    if(!profileId){renderError();return;}
    demoMode=/[?&]demo\b/.test(global.location&&global.location.search||"");
    var pull=QuestSave.syncDown?QuestSave.syncDown().catch(function(){}):Promise.resolve();
    pull.then(function(){return Promise.all([QuestSave.load("komorebi",profileId),QuestSave.load("keisan",profileId),loadWorldMap(),loadRatioPool()]);}).then(function(data){
      var normalized=normalizeProfile(data[0]);
      profile=normalized.profile;
      profileType=data[1]&&data[1].type==="k5"?"k5":"k10";
      worldMap=validateMapPayload(data[2],expeditionVolumes());
      ratioPool=data[3];
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
    validateRatioPool:validateRatioPool,
    ratioFormMix:RATIO_FORM_MIX,
    buildRatioSet:buildRatioSet,
    updateRatioHistory:updateRatioHistory,
    judgeRatioAnswer:judgeRatioAnswer,
    ratioQuestionBodyHtml:ratioQuestionBodyHtml,
    wazaCardHtml:wazaCardHtml,
    ratioFeedbackHtml:ratioFeedbackHtml,
    startRatioSession:startRatioSession,
    formatCourseText:formatCourseText,
    applyPerformance:applyPerformance,
    recordResult:recordResult,
    speciesForArea:speciesForArea,
    profile:function(){return profile;}
  };
  if(!global.Q4B_KOMOREBI_NO_BOOT&&global.document)boot();
})(window);
