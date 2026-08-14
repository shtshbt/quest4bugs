(function(global){
  "use strict";

  /* 公開済みの更新番号 (release_linkage 2 章の更新カレンダー)。実装は先へ進めて
     公開はここ 1 か所で段階解禁する。これが無いと「実装済み未公開」のカテゴリが
     次の deploy でそのまま子どもの画面に出てしまう。 */
  var CURRENT_RELEASE=1;

  /* release は「どの更新で公開するか」。volume manifest がそのカテゴリを挙げていても、
     release が CURRENT_RELEASE を超える間は選択肢に出さない。 */
  var CATEGORIES={
    kom_ratio:{course:"k10",name:"割合と比",maxLv:10,release:1},
    kom_kuku_dan2:{course:"k5",name:"2の段暗唱",maxLv:10,release:1},
    kom_kuku_run:{course:"k5",name:"連続九九",maxLv:10,release:1},
    kom_pi314:{course:"k10",name:"3.14の段",maxLv:10,release:1},
    kom_unit_convert:{course:"k10",name:"単位換算",maxLv:10,release:2},
    kom_kuku_ura:{course:"k5",name:"九九のうら読み",maxLv:10,release:2},
    kom_kuku_inverse:{course:"k5",name:"九九の逆引き",maxLv:10,release:3},
    kom_frac_flow:{course:"k10",name:"分数の解き方",maxLv:10,release:3},
    kom_kuku_bridge:{course:"k5",name:"九九の外へ",maxLv:10,release:4},
    kom_equation_select:{course:"k5",name:"文章題の式えらび",maxLv:10,release:4},
    /* 段暗唱は指導順 (2, 5, 3, 4, 6, 7, 8, 9) に 1 更新 2 本ずつ解禁する
       (release_linkage 2 章の倍速カレンダー)。エンジンは段番号駆動なので
       実装はこの行だけ。同 release 内の指導順は宣言順で保たれる。 */
    kom_kuku_dan5:{course:"k5",name:"5の段暗唱",maxLv:10,release:1},
    kom_kuku_dan3:{course:"k5",name:"3の段暗唱",maxLv:10,release:2},
    kom_kuku_dan4:{course:"k5",name:"4の段暗唱",maxLv:10,release:2},
    kom_kuku_dan6:{course:"k5",name:"6の段暗唱",maxLv:10,release:3},
    kom_kuku_dan7:{course:"k5",name:"7の段暗唱",maxLv:10,release:3},
    kom_kuku_dan8:{course:"k5",name:"8の段暗唱",maxLv:10,release:4},
    kom_kuku_dan9:{course:"k5",name:"9の段暗唱",maxLv:10,release:4}
  };

  function isReleased(cat){
    var entry=CATEGORIES[cat];
    return !!entry&&entry.release<=CURRENT_RELEASE;
  }

  /* 段暗唱は 1 段 = 1 カテゴリ。cat 名が段番号を持つので、dan3 以降は
     CATEGORIES に 1 行足すだけで動く。 */
  function danOfCategory(cat){
    var match=/^kom_kuku_dan(\d)$/.exec(cat);
    return match?Number(match[1]):0;
  }
  function isDanCat(cat){return danOfCategory(cat)>0;}
  var COLLECTION_CONFIG={
    gaugeNeed:global.Q4BReward?global.Q4BReward.NEED_DEFAULT:8,
    pityChances:[0,0.25,0.5,0.75,1],
    flagshipWeight:0.25
  };
  var RARITIES=["N","R","SR"];
  /* ゲージに数える回答の形式。ここに無い形式は例外になる (黙って加算されないより、
     登録漏れが即わかるほうがよい)。れんぞく九九はだんラン 1 本で 1 正答。 */
  var FORMAT_KINDS={
    normal:{num:true,frac:true,choice:true,num_unit:true},
    formulation:{choice:true},
    ordering:{order:true},
    diagnosis:{choice:true},
    find_all:{choice:true,find_all:true},
    voice:{voice:true},
    dan_run:{run:true},
    scroll_fill:{choice:true},
    missing_find:{choice:true},
    error_find:{choice:true},
    flash:{choice:true}
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
  var profile=null, profileId=null, profileRevision=0, profileType="k10", worldMap=null, ratioPool=null, session=null;
  var zukanModalRerender=null;
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

  /* 仮称には「（仮称）」を添える。小道の種は標準和名を持たないものが大半で、
     こちらで組み立てた名前をそのまま出すと実在の名前として覚えられてしまう。 */
  function speciesName(sp){
    return global.Q4B_SPECIES_DISPLAY_NAME?global.Q4B_SPECIES_DISPLAY_NAME(sp):(sp&&sp.jaName)||"";
  }

  function escapeHtml(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function displayText(text){return formatCourseText(escapeHtml(text),profileType,global.furi5);}
  /* 属性値にはふりがなを通さない。ruby の markup がそのまま読み上げられ、
     placeholder ではタグが文字として表示されてしまう。 */
  function attrText(text){return escapeHtml(text);}

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

  function judgeStandardAnswer(question,answer){
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

  /* --- 地域と遠征 ------------------------------------------------------------
     地域 (region) は表示の単位、遠征 (volume) は抽選と分母の単位。ピンと図鑑は
     地域に 1 つ、カテゴリと捕獲プールは遠征に属する (volume_zukan_design 2 章)。 */

  var ROMAN=["","Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ","Ⅶ","Ⅷ","Ⅸ","Ⅹ"];
  function romanNumeral(n){return ROMAN[n]||String(n);}
  function volumeExpedition(volume){return Number.isInteger(volume.expedition)&&volume.expedition>=1?volume.expedition:1;}

  /* volume にも release 番号を持たせ、未来の巻を manifest に仕込んでおける。
     カテゴリと同じく CURRENT_RELEASE 1 か所で公開が決まり、デプロイは番号を
     上げるだけになる (事前準備方式)。release 無しの volume は公開済み扱い。 */
  function isVolumeReleased(volume){
    return !Number.isInteger(volume.release)||volume.release<=CURRENT_RELEASE;
  }

  function regionList(){
    var byRegion={},order=[];
    expeditionVolumes().filter(isVolumeReleased).forEach(function(volume){
      if(!byRegion[volume.regionId]){
        byRegion[volume.regionId]={regionId:volume.regionId,regionName:volume.regionName,volumes:[]};
        order.push(volume.regionId);
      }
      byRegion[volume.regionId].volumes.push(volume);
    });
    return order.map(function(regionId){
      var region=byRegion[regionId];
      region.volumes.sort(function(a,b){return volumeExpedition(a)-volumeExpedition(b);});
      /* 地域の紹介文は最初の遠征のものを使う。巻ごとに変えると地域の顔がぶれる。 */
      region.blurb=region.volumes[0].blurb;
      region.current=region.volumes.some(function(volume){return volume.current;});
      return region;
    });
  }

  function regionById(regionId){
    var region=regionList().filter(function(r){return r.regionId===regionId;})[0];
    if(!region)throw new Error("地域を見つけられません");
    return region;
  }

  function regionPinState(region,collection){
    var caught=0,denominator=0,complete=true;
    region.volumes.forEach(function(volume){
      var progress=volumeProgress(volume,collection);
      caught+=progress.caught;denominator+=progress.denominator;
      if(!progress.complete)complete=false;
    });
    if(complete)return {kind:"completed",mark:"✓",caught:caught,denominator:denominator,ringValue:1};
    if(region.current)return {kind:"current",mark:"★",caught:caught,denominator:denominator,ringValue:denominator?caught/denominator:0};
    return {kind:"past",mark:"🦋",caught:caught,denominator:denominator,ringValue:denominator?caught/denominator:0};
  }

  function createProfile(){
    var lv={},maxLv={};
    Object.keys(CATEGORIES).forEach(function(cat){lv[cat]=1;maxLv[cat]=1;});
    return {schemaVersion:1,unlocked:true,discoverySeen:false,lv:lv,maxLv:maxLv,stats:{},recent:{},adapt:{},ratioHistory:{itemIds:[],patternIds:[]},collection:{gauge:0,totalCatches:0,catches:{}},trophies:{},trophyProgress:{},srs:{}};
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
    ["lv","maxLv","stats","recent","adapt","trophies","trophyProgress","srs"].forEach(function(key){
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
    /* 壊れたトロフィーデータを黙って受けない。トロフィーは再授与しないので、
       形が崩れたまま通すと二度と直せない。 */
    if(global.Q4B_KOMOREBI_TROPHIES){
      global.Q4B_KOMOREBI_TROPHIES.validateTrophies(p.trophies);
      global.Q4B_KOMOREBI_TROPHIES.validateProgress(p.trophyProgress);
    }
    return {profile:p,changed:changed};
  }

  function mergeProfileCatches(localProfile,remoteProfile){
    var localCatches=localProfile&&localProfile.collection&&localProfile.collection.catches||{};
    var remoteCatches=remoteProfile&&remoteProfile.collection&&remoteProfile.collection.catches||{};
    var merged=JSON.parse(JSON.stringify(localProfile)), catches={};
    Object.keys(remoteCatches).concat(Object.keys(localCatches)).forEach(function(id){
      if(catches[id])return;
      var remote=remoteCatches[id], local=localCatches[id], entry={}, key;
      if(remote)for(key in remote)entry[key]=remote[key];
      if(local)for(key in local)entry[key]=local[key];
      entry.records=(remote&&remote.records||[]).concat(local&&local.records||[]);
      entry.n=entry.records.length;
      var sizes=entry.records.map(function(record){return record&&record.size;}).filter(Number.isFinite);
      if(sizes.length){entry.max=Math.max.apply(Math,sizes);entry.min=Math.min.apply(Math,sizes);}
      catches[id]=entry;
    });
    merged.collection.catches=catches;
    merged.collection.totalCatches=Object.keys(catches).reduce(function(total,id){return total+catches[id].n;},0);
    return merged;
  }

  function saveProfile(){
    if(!profileId||!global.QuestSave)return Promise.reject(new Error("保存できません"));
    if(QuestSave.warnIfDegraded)QuestSave.warnIfDegraded();
    var localProfile=profile;
    return QuestSave.saveVersioned("komorebi",profileId,localProfile,profileRevision).then(function(result){
      if(result&&result.ok){profileRevision=result.revision;return true;}
      if(!result||result.reason!=="conflict")throw new Error("保存できません");
      return QuestSave.loadVersioned("komorebi",profileId,null).then(function(latest){
        var remoteProfile=normalizeProfile(latest.data).profile;
        profile=mergeProfileCatches(localProfile,remoteProfile);
        profileRevision=latest.revision;
        return QuestSave.saveVersioned("komorebi",profileId,profile,profileRevision).then(function(retry){
          if(!retry||!retry.ok)throw new Error("保存の競合を解消できません");
          profileRevision=retry.revision;
          return true;
        });
      });
    });
  }

  function todayString(){
    var now=new Date();
    return now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2)+"-"+("0"+now.getDate()).slice(-2);
  }

  function applyPerformance(targetProfile,cat,ok,ms){
    if(!isObject(targetProfile)||!hasOwn(CATEGORIES,cat))throw new Error("カテゴリが正しくありません");
    if(typeof ok!=="boolean"||!Number.isFinite(ms)||ms<0)throw new Error("結果データが正しくありません");
    var trophyModule=global.Q4B_KOMOREBI_TROPHIES,lvAtAnswer=targetProfile.lv[cat];
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
    /* 安定判定は「その回答を出したときの Lv」で数える。昇降のあとの Lv で数えると、
       Lv9 の正答が Lv10 の実績に化ける。 */
    if(trophyModule){
      trophyModule.noteAnswer(targetProfile,cat,lvAtAnswer,ok);
      trophyModule.award(targetProfile,cat,todayString());
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

  /* 産卵とこはくの接続 (komorebi_breeding_bonus_gaps 決定 1, 3)。
     小道の有効正答は egg.game="komorebi" の卵だけを育て、こはくは共有ウォレットへ
     学習価値に応じて加算する。本編の卵 (keisan 等) はここからは一切進まない。
     習熟済み (maxLv 到達) カテゴリの周回は本編と同じく価値 0.4 に減衰する。 */
  function feedSideRewards(cat,result,masteredAtAnswer){
    if(!result||!result.counted)return;
    var reward=global.Q4BReward;
    if(!reward)return;
    var mastered=masteredAtAnswer!=null?masteredAtAnswer:profile.maxLv&&profile.maxLv[cat]>=CATEGORIES[cat].maxLv;
    var value=mastered?0.4:1;
    if(typeof reward.earnAmber==="function"){
      try{
        profile.collection.amberAcc=(profile.collection.amberAcc||0)+value;
        if(profile.collection.amberAcc>=1){
          var amberWhole=Math.floor(profile.collection.amberAcc);
          reward.earnAmber(profile.collection,amberWhole);
          profile.collection.amberAcc-=amberWhole;
        }
      }catch(_){}
    }
    if(typeof reward.feedEgg==="function"){
      try{
        var fed=reward.feedEgg("komorebi",value,{});
        if(fed&&typeof fed.catch==="function")fed.catch(function(){});
      }catch(_){}
    }
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
    return saveProfile().then(function(){feedSideRewards(cat,result);return result;}).catch(function(error){
      replaceCollection(profile.collection,before);
      throw error;
    });
  }

  function recordSubmission(cat,answer,volume,random,correct,elapsed){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    var before=JSON.parse(JSON.stringify(profile)),result;
    try{
      result=applyAnswer(profile,cat,answer,volume,random);
      var masteredAtAnswer=profile.maxLv&&profile.maxLv[cat]>=CATEGORIES[cat].maxLv;
      if(!result.duplicate)applyPerformance(profile,cat,correct,elapsed);
    }catch(error){profile=before;return Promise.reject(error);}
    if(result.duplicate)return Promise.resolve(result);
    var saved;
    try{saved=saveProfile();}catch(error){profile=before;return Promise.reject(error);}
    return saved.then(function(){feedSideRewards(cat,result,masteredAtAnswer);return result;}).catch(function(error){profile=before;throw error;});
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

  function mapArtworkHtml(regions,currentRegionId,selectedRegionId){
    var box=mapViewBox(worldMap),byRegion={},regionPaths="",pins="",leader="";
    regions.forEach(function(region){byRegion[region.regionId]=region;});
    Object.keys(worldMap.regions).forEach(function(regionId){
      var region=byRegion[regionId],className="hl hl-unopened";
      if(region)className=region.regionId===currentRegionId?"hl hl-current":"hl hl-open";
      regionPaths+='<path class="'+className+'" d="'+escapeHtml(worldMap.regions[regionId])+'"'+(region?' filter="url(#rich-glow)"':'')+'></path>';
    });
    /* ピンは地域に 1 本。巻が増えてもピンは重ならず、数字は地域の全巻合計になる。 */
    regions.forEach(function(region){
      var state=regionPinState(region,viewCollection()),point=worldMap.pins[region.regionId];
      var left=((point.x-box[0])/box[2]*100).toFixed(3),top=((point.y-box[1])/box[3]*100).toFixed(3);
      var status=state.kind==="current"?"現在の遠征":state.kind==="past"?"過去の遠征":"完成した遠征";
      var classes="map-pin pin-"+state.kind+(state.kind==="completed"?" pin-done":"")+(region.regionId===selectedRegionId?" pin-selected":"");
      /* 選択中の地域から下の一覧へ引き出し線を落とす。地図は「どこ」を示し、
         主役は下のカテゴリ一覧という関係を線で結ぶ。 */
      if(region.regionId===selectedRegionId)leader='<span class="map-leader" aria-hidden="true" style="left:'+left+'%;top:'+top+'%"></span>';
      pins+='<button type="button" class="'+classes+'" data-region-id="'+escapeHtml(region.regionId)+'" style="left:'+left+'%;top:'+top+'%;--pin-progress:'+(state.ringValue*360).toFixed(1)+'deg" aria-label="'+escapeHtml(region.regionName+' '+state.caught+'／'+state.denominator+'、'+status)+'">'
        +'<span class="pin-halo" aria-hidden="true"></span><span class="pin-ring" aria-hidden="true"><span class="pin-disc"><span class="pin-mark">'+state.mark+'</span></span></span>'
        +'<span class="pin-name">'+displayText(region.regionName)+'</span><span class="pin-count">'+state.caught+'／'+state.denominator+'</span></button>';
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

  /* ここから下は学習セッションの共通シェル。ゲージ・Lv ドット・捕獲カード・
     フィードバックはカテゴリを問わず同じものを出す (本編と乖離させないため)。
     CSS の ratio-* クラスは割合専用ではなく、このシェル共通のもの。 */

  function gaugeHtml(){
    return '<span class="ratio-gauge">'+displayText("採集ゲージ")+' <strong>'+displayText(profile.collection.gauge+'／'+COLLECTION_CONFIG.gaugeNeed)+'</strong></span>';
  }

  /* まちがいさがしだけは「値」ではなく「行」を選ばせるため、選択肢の見た目が式になる。 */
  function choiceLabels(question){
    if(question.format==="error_find")return question.lines.map(function(line){return question.dan+"×"+line.b+"＝"+line.value;});
    return question.choices.map(function(choice){return String(choice);});
  }

  function ratioChoiceHtml(question){
    /* 数字だけの選択肢は 2 列で出す。式を選ぶまちがいさがしは横幅がいるので 1 列のまま。 */
    var numeric=question.cat==="kom_kuku_run"&&question.format!=="error_find";
    return '<div class="ratio-choices'+(numeric?" kuku-choices":"")+'">'+choiceLabels(question).map(function(label,index){
      return '<button type="button" class="ratio-choice'+(numeric?" kuku-num":"")+'" data-choice-index="'+index+'">'+displayText(label)+'</button>';
    }).join("")+'</div>';
  }

  /* 分数の回答。整数部と分子と分母の 3 欄をいつも出す。帯分数になる問題だけ
     3 欄にすると、欄を見た時点で「1 より大きい」とわかってしまう。 */
  function fracInputHtml(){
    return '<form class="ratio-number-form frac-form" data-answer-form>'
      +'<div class="frac-input">'
      +'<input name="whole" type="text" inputmode="numeric" autocomplete="off" class="frac-whole" aria-label="'+attrText("整数の部分")+'">'
      +'<span class="frac-stack">'
      +'<input name="num" type="text" inputmode="numeric" autocomplete="off" aria-label="'+attrText("分子")+'">'
      +'<span class="frac-bar" aria-hidden="true"></span>'
      +'<input name="den" type="text" inputmode="numeric" autocomplete="off" aria-label="'+attrText("分母")+'">'
      +'</span></div>'
      +'<button type="submit" class="ratio-submit">'+displayText("答える")+'</button></form>';
  }

  /* 集合完成 (「ぜんぶ えらぶ」)。1 つ選んで即判定にすると、選び終える前に
     判定が走って残りを選べない。選択を溜めてから 1 回で出す。 */
  function multiChoiceHtml(question){
    var selection=(session&&session.multiSelection)||[];
    return '<div class="ratio-choices multi-choices">'+question.choices.map(function(choice,index){
      var on=selection.indexOf(index)>=0;
      return '<button type="button" class="ratio-choice'+(on?" is-selected":"")+'" data-multi-index="'+index+'"'
        +' aria-pressed="'+(on?"true":"false")+'">'+displayText(choice)+'</button>';
    }).join("")+'</div>'
      +'<div class="ratio-order-actions"><button type="button" class="ratio-reset" data-action="reset-multi">'+displayText("やりなおし")+'</button>'
      +'<button type="button" class="ratio-submit" data-action="submit-multi"'+(selection.length?"":" disabled")+'>'+displayText("答える")+'</button></div>';
  }

  function ratioOrderHtml(question){
    return '<ol class="ratio-order-answer" id="ratioOrderAnswer" aria-live="polite"></ol>'
      +'<div class="ratio-parts">'+question.displayOrder.map(function(index){return '<button type="button" class="ratio-part" data-part-index="'+index+'">'+displayText(question.parts[index])+'</button>';}).join("")+'</div>'
      +'<div class="ratio-order-actions"><button type="button" class="ratio-reset" data-action="reset-order">'+displayText("やりなおし")+'</button>'
      +'<button type="button" class="ratio-submit" data-action="submit-order" disabled>'+displayText("答える")+'</button></div>';
  }

  /* --- 数値 + 単位の回答 -----------------------------------------------------
     単位換算だけが使う。数値だけを受け取ると「別の単位で計算し切った答え」が
     ただの計算違いに見えてしまい、何を直せばよいか子どもに渡せない
     (unit_convert curriculum 5 章)。 */

  function unitEngine(){
    var engine=global.Q4B_KOMOREBI_UNIT_CONVERT;
    if(!engine)throw new Error("単位換算を読み込めません");
    return engine;
  }

  function numUnitHtml(question){
    var chips=question.unitChoices.map(function(unitId){
      var selected=session&&session.unitSelection===unitId;
      return '<button type="button" class="unit-chip'+(selected?" is-selected":"")+'" data-unit="'+attrText(unitId)+'"'
        +' aria-pressed="'+(selected?"true":"false")+'">'+displayText(unitEngine().unitLabel(unitId))+'</button>';
    }).join("");
    return '<form class="ratio-number-form num-unit-form" data-answer-form>'
      +'<input name="answer" type="text" inputmode="decimal" autocomplete="off" aria-label="'+attrText("答えの数")+'">'
      +'<div class="unit-choices" role="group" aria-label="'+attrText("答えの単位")+'">'+chips+'</div>'
      +'<button type="submit" class="ratio-submit" data-submit-num-unit'+(session&&session.unitSelection?"":" disabled")+'>'+displayText("答える")+'</button></form>';
  }

  function standardQuestionBodyHtml(question){
    var scaffold=question.scaffold?'<p class="ratio-scaffold">'+displayText(question.scaffold)+'</p>':"";
    var work=question.work?'<div class="ratio-work">'+question.work.map(function(line){return '<p>'+displayText(line)+'</p>';}).join("")+'</div>':"";
    var controls;
    if(question.kind==="choice")controls=ratioChoiceHtml(question);
    else if(question.kind==="find_all")controls=multiChoiceHtml(question);
    else if(question.kind==="order")controls=ratioOrderHtml(question);
    else if(question.kind==="num_unit")controls=numUnitHtml(question);
    else if(question.kind==="frac")controls=fracInputHtml();
    else controls='<form class="ratio-number-form" data-answer-form><input name="answer" type="text" inputmode="decimal" autocomplete="off" aria-label="'+attrText("答え")+'"><button type="submit" class="ratio-submit">'+displayText("答える")+'</button></form>';
    return scaffold+'<h2>'+displayText(question.text)+'</h2>'+work+controls;
  }

  function ratioAnswerText(question){
    if(question.kind==="order")return question.ans.map(function(index){return question.parts[index];}).join(" → ");
    if(question.kind==="choice")return question.choices[expectedChoiceIndex(question)]||"";
    return String(question.ans);
  }

  /* --- れんぞく九九の画面 ---------------------------------------------------
     時間の可視要素は一切置かない (categories 3.10)。速さは SRS の内部判定だけに
     使い、子どもには見せない。カウントダウンも速度ボーナスも作らない。 */

  function kukuEngine(){
    var engine=global.Q4B_KOMOREBI_KUKU_RUN;
    if(!engine)throw new Error("れんぞく九九を読み込めません");
    return engine;
  }

  function kukuPhrase(dan,b){
    var table=global.Q4B_KUKU_PHRASES;
    if(!table)return "";
    try{return table.phrase(dan,b);}catch(error){return "";}
  }

  /* 単一の句を問う形式だけが SRS の対象。factKey は "8x7" 形式で、まきものは
     行を持つため top-level の b を持たない。ここで 1 か所に解釈をまとめる。 */
  function kukuFact(question){
    var parts=typeof question.factKey==="string"?question.factKey.split("x"):[];
    if(parts.length!==2)return null;
    var dan=Number(parts[0]),b=Number(parts[1]);
    return Number.isInteger(dan)&&Number.isInteger(b)?{dan:dan,b:b}:null;
  }

  function kukuScaffoldHtml(question){
    return question.scaffold?'<p class="ratio-scaffold">'+displayText(question.scaffold)+'</p>':"";
  }

  function kukuScrollHtml(question){
    return '<div class="kuku-scroll">'+question.rows.map(function(row){
      return '<p class="kuku-scroll-row'+(row.blank?" is-blank":"")+'"><span>'+displayText(question.dan+"×"+row.b+"＝")+'</span><strong>'+displayText(row.blank?"？":String(row.value))+'</strong></p>';
    }).join("")+'</div>';
  }

  function kukuBoardHtml(question){
    return '<div class="kuku-board">'+question.shown.map(function(value){
      return '<span class="kuku-chip">'+displayText(String(value))+'</span>';
    }).join("")+'</div>';
  }

  /* だんランは 1 本で 1 問。途中の句は鎖として残し、いま答える句だけを大きく出す。 */
  function kukuChainHtml(question){
    var state=session.runState,done="",step;
    state.results.forEach(function(result,index){
      var past=question.steps[index];
      done+='<span class="kuku-link'+(result.correct?"":" is-wrong")+'">'+displayText(question.dan+"×"+past.b+"＝"+past.ans)+'</span>';
    });
    step=question.steps[state.step];
    return '<div class="kuku-chain">'+done+'</div>'
      +(step?'<h2>'+displayText(question.dan+"×"+step.b+"＝？")+'</h2>'
        +'<div class="ratio-choices kuku-choices">'+step.choices.map(function(choice,index){
          return '<button type="button" class="ratio-choice kuku-num" data-step-choice="'+index+'">'+displayText(String(choice))+'</button>';
        }).join("")+'</div>':"");
  }

  function kukuQuestionBodyHtml(question){
    if(question.format==="dan_run")return '<h2>'+displayText(question.dan+"のだんを つなげよう")+'</h2>'+kukuChainHtml(question);
    var head=kukuScaffoldHtml(question);
    if(question.format==="scroll_fill")return head+'<h2>'+displayText("まきものの あなを うめよう")+'</h2>'+kukuScrollHtml(question)+ratioChoiceHtml(question);
    if(question.format==="missing_find")return head+'<h2>'+displayText(question.dan+"のだんで たりないのは？")+'</h2>'+kukuBoardHtml(question)+ratioChoiceHtml(question);
    if(question.format==="error_find")return head+'<h2>'+displayText("まちがいは どれ？")+'</h2>'+ratioChoiceHtml(question);
    return head+'<h2 class="kuku-flash">'+displayText(question.dan+"×"+question.b+"＝？")+'</h2>'+ratioChoiceHtml(question);
  }

  function kukuAnswerText(question){
    if(question.format==="dan_run")return question.steps.map(function(step){return question.dan+"×"+step.b+"＝"+step.ans;}).join("　");
    if(question.format==="error_find")return question.dan+"×"+question.lines[question.ans].b+"＝"+(question.dan*question.lines[question.ans].b);
    return String(question.ans);
  }

  /* 答え合わせのあとに句を出す。想起の足場は「見せてから数問はさんで問う」ことで
     効くので、正誤に関わらず出す (categories 3.10 の短ループ想起)。 */
  function kukuPhraseCardHtml(question){
    var fact=question.format==="dan_run"?null:kukuFact(question),phrase=fact?kukuPhrase(fact.dan,fact.b):"";
    if(!phrase)return "";
    return '<aside class="ratio-waza"><h3>'+displayText("く")+'</h3><p><span>'+displayText(phrase)+'</span></p></aside>';
  }

  /* --- 段暗唱の画面 ---------------------------------------------------------
     ここだけ時間 UI を持つ (design 決定 6 第 2 次改訂)。見えないタイムアウトは
     理不尽なので、バーが目標の可視化とテンポガイドを兼ねる。 */

  function dan2Engine(){
    var engine=global.Q4B_KOMOREBI_KUKU_DAN2;
    if(!engine)throw new Error("段暗唱を読み込めません");
    return engine;
  }

  function speechCtor(){return global.SpeechRecognition||global.webkitSpeechRecognition||null;}

  function dan2PhrasesHtml(chunk){
    return '<ol class="dan2-phrases">'+chunk.phrases.map(function(item){
      var equation=chunk.dan+"×"+item.b+(chunk.display==="read"?"＝"+item.ans:"");
      return '<li><span class="dan2-eq">'+displayText(equation)+'</span>'
        +(chunk.display==="read"?'<span class="dan2-yomi">'+displayText(item.phrase)+'</span>':"")+'</li>';
    }).join("")+'</ol>';
  }

  function dan2QuestionBodyHtml(chunk){
    var lead=chunk.display==="read"?"こえに 出して よもう":"こえに 出して となえよう";
    return '<div class="dan2-timebar" aria-hidden="true"><span class="dan2-timebar-fill" id="dan2Timebar"></span></div>'
      +'<h2>'+displayText(chunk.dan+"の段　"+lead)+'</h2>'
      +dan2PhrasesHtml(chunk)
      +'<div class="dan2-voice"><button type="button" class="ratio-submit" data-action="dan2-listen">🎙 '+displayText("となえる")+'</button></div>'
      +'<p class="dan2-status" id="dan2Status" role="status"></p>';
  }

  function dan2AnswerText(chunk){
    return chunk.phrases.map(function(item){return item.phrase;}).join("　");
  }

  /* 詰まった句を れんぞく九九 の再出題デッキへ還流する (categories 3.2)。
     段暗唱で言えなかった句こそ、数値タップで繰り返す価値がある。 */
  function refluxStuckPhrase(chunk,verdict){
    if(!verdict||verdict.missing==null||verdict.missing<0)return;
    var item=chunk.phrases[verdict.missing];
    if(!item||!global.Q4B_KOMOREBI_KUKU_RUN)return;
    reviewKukuFact(chunk.dan,item.b,false,0);
  }

  function questionBodyHtml(question){
    if(question.cat==="kom_kuku_run")return kukuQuestionBodyHtml(question);
    if(isDanCat(question.cat))return dan2QuestionBodyHtml(question);
    return standardQuestionBodyHtml(question);
  }

  function answerText(question){
    if(question.kind==="find_all")return question.ans.map(function(index){return question.choices[index];}).join("　");
    if(question.kind==="frac")return fracEngine().formatFraction(question.ans);
    if(question.cat==="kom_kuku_run")return kukuAnswerText(question);
    if(isDanCat(question.cat))return dan2AnswerText(question);
    if(question.kind==="num_unit")return String(question.ans)+unitEngine().unitLabel(question.ansUnit);
    return ratioAnswerText(question);
  }

  function reverseEngine(){
    var engine=global.Q4B_KOMOREBI_KUKU_REVERSE;
    if(!engine)throw new Error("九九のうら読みを読み込めません");
    return engine;
  }

  function fracEngine(){
    var engine=global.Q4B_KOMOREBI_FRAC_FLOW;
    if(!engine)throw new Error("分数の解き方を読み込めません");
    return engine;
  }

  function judgeAnswer(question,answer){
    if(question.cat==="kom_kuku_run")return kukuEngine().judge(question,answer);
    if(question.cat==="kom_kuku_ura"||question.cat==="kom_kuku_inverse")return reverseEngine().judge(question,answer);
    if(question.kind==="frac"){
      /* 「値は合うが約分が残っている」を名指しするため、真偽値だけでなく verdict を残す。 */
      session.verdict=fracEngine().judgeFraction(question,{
        whole:Number(String(answer.whole).trim()||0),
        num:Number(String(answer.num).trim()),
        den:Number(String(answer.den).trim())
      });
      return session.verdict.correct;
    }
    if(question.cat==="kom_frac_flow")return fracEngine().judge(question,answer);
    if(isDanCat(question.cat))return !!(session.verdict&&session.verdict.correct);
    if(question.kind==="num_unit"){
      /* 判定の内訳 (単位だけ違うのか、量そのものが違うのか) をフィードバックで
         使うため、真偽値だけでなく verdict を残す。 */
      session.verdict=unitEngine().judgeNumUnit(question,answer.value,answer.unit);
      return session.verdict.correct;
    }
    return judgeStandardAnswer(question,answer);
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
    var name=sp?speciesName(sp):capture.id;
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

  /* 段暗唱は「なぜ駄目だったか」を言わないと理不尽になる。時間切れと言い間違いは
     子どもにとって別のことなので、区別して伝える。 */
  var DAN2_REASONS={
    answer_only:"式も いっしょに となえよう",
    stem_only:"答えまで となえよう",
    wrong_phrase:"じゅんばんに となえよう"
  };

  /* 誤答の理由を名指しする。「なぜ駄目だったか」を言わないと理不尽になるのは
     段暗唱も単位換算も同じで、直す先が違うだけ。 */
  function reasonHtml(question,correct){
    var verdict=session&&session.verdict;
    if(correct||!verdict)return "";
    var reason="";
    if(isDanCat(question.cat))reason=verdict.timedOut?"タイムバーが 切れたよ":(DAN2_REASONS[verdict.state]||"");
    else if(question.kind==="num_unit"||question.kind==="frac")reason=verdict.note||"";
    return reason?'<p class="dan2-reason">'+displayText(reason)+'</p>':"";
  }

  function feedbackHtml(question,correct,result){
    var mark=correct?"正解！":"もう一歩！";
    var answer=correct?"":'<p class="ratio-answer"><strong>'+displayText("答え")+'</strong> '+displayText(answerText(question))+'</p>';
    var card=question.cat==="kom_kuku_run"?kukuPhraseCardHtml(question):(isDanCat(question.cat)?"":wazaCardHtml(question));
    return '<div class="ratio-feedback '+(correct?'is-correct':'is-wrong')+'"><h2>'+displayText(mark)+'</h2>'
      +reasonHtml(question,correct)+answer+card+ratioCaptureHtml(result&&result.capture)+'</div>';
  }

  /* 本編 keisan/app.js の lvDotsHTML と同じ規則。stats ではなく adapt バッファを見る
     ことが要点で、そうしないと「画面ではあと 1 問なのに実際は 7 問」の乖離が起きる。 */
  function lvDotsHtml(cat){
    var adapt=profile.adapt&&profile.adapt[cat],lv=(profile.lv&&profile.lv[cat])||1;
    var n=adapt?adapt.n:0,inBlock=n%10,recent=adapt?adapt.recent.slice(-inBlock):[],dots="";
    for(var i=0;i<10;i++)dots+=(i<inBlock)?(recent[i]?"●":"✗"):"○";
    return '<span class="ratio-lv" aria-label="'+attrText("レベル"+lv+"、10問中"+inBlock+"問め")+'">Lv'+lv+'　'+dots+'</span>';
  }

  function sessionShell(body){
    var cat=session.cat;
    return '<main class="kom-page ratio-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back-map">← '+displayText("小道")+'</button></header>'
      +'<div class="ratio-session-head"><div><h1>'+displayText(CATEGORIES[cat].name)+'</h1><p>'+displayText("第"+(session.index+1)+"／"+session.questions.length+"問")+'</p>'+lvDotsHtml(cat)+'</div>'+gaugeHtml()+'</div>'
      +'<section class="ratio-panel">'+body+'</section></main>';
  }

  function renderOrderSelection(question){
    var list=document.getElementById("ratioOrderAnswer");
    if(list)list.innerHTML=session.orderSelection.length?session.orderSelection.map(function(index){return '<li>'+displayText(question.parts[index])+'</li>';}).join(""):'<li class="ratio-order-placeholder">'+displayText("順番に選びましょう")+'</li>';
    Array.prototype.forEach.call(document.querySelectorAll("[data-part-index]"),function(button){
      button.disabled=session.orderSelection.indexOf(Number(button.getAttribute("data-part-index")))>=0;
    });
    var submit=document.querySelector('[data-action="submit-order"]');
    if(submit)submit.disabled=session.orderSelection.length!==question.parts.length;
  }

  /* 選択肢のタップは index で届く。判定側は「値」で比べるので、ここで値へ戻す。
     まちがいさがしは選択肢そのものが行 index なので、どちらでも同じ値になる。 */
  function choiceValue(question,index){
    return question.cat==="kom_kuku_run"?question.choices[index]:index;
  }

  /* --- 段暗唱の音声とタイムバー --------------------------------------------
     タイムの基準は発話終端 (音声活動の終わり)。認識結果の到着時刻で測ると、
     エンジンの遅延が子どもの成績に化けてしまう (categories 3.2)。 */

  function dan2Status(message){
    var node=document.getElementById("dan2Status");
    if(node)node.innerHTML=message?displayText(message):"";
  }

  function startTimebar(limitMs){
    var fill=document.getElementById("dan2Timebar");
    if(!fill)return;
    fill.style.transition="none";
    fill.style.width="100%";
    /* 幅を戻した直後に transition を張ると、ブラウザが 1 フレームにまとめてしまい
       アニメーションが起きない。次のフレームまで待ってから減らし始める。 */
    var start=function(){fill.style.transition="width "+limitMs+"ms linear";fill.style.width="0%";};
    if(typeof global.requestAnimationFrame==="function")global.requestAnimationFrame(function(){global.requestAnimationFrame(start);});
    else setTimeout(start,16);
  }

  /* 発話が終わった時点の残りを止めて見せる。transition の途中の実寸は
     offsetWidth で取れるので、そこで固定する。 */
  function freezeTimebar(){
    var fill=document.getElementById("dan2Timebar");
    if(!fill)return;
    var width=Number.isFinite(fill.offsetWidth)?fill.offsetWidth+"px":fill.style.width;
    fill.style.transition="none";
    fill.style.width=width;
  }

  function retryDan2(message){
    var fill=document.getElementById("dan2Timebar");
    if(fill){fill.style.transition="none";fill.style.width="100%";}
    dan2Status(message);
  }

  function stopDan2Voice(){
    var voice=session&&session.voice;
    if(!voice)return;
    if(voice.timer){clearTimeout(voice.timer);voice.timer=null;}
    if(voice.rec){try{voice.rec.abort();}catch(error){}voice.rec=null;}
    voice.listening=false;
  }

  function finishDan2(chunk,transcript,elapsedMs){
    var voice=session&&session.voice;
    if(!voice||!voice.listening)return;
    stopDan2Voice();
    freezeTimebar();
    var verdict=dan2Engine().judgeChunk(chunk,transcript,elapsedMs);
    if(!verdict.counted){
      /* 認識失敗はノーカウント。統計にも Lv にも入れず、同じチャンクをやり直す。 */
      retryDan2("ききとれませんでした。もういちど となえてね");
      return;
    }
    session.verdict=verdict;
    refluxStuckPhrase(chunk,verdict);
    submitAnswer({transcript:transcript,elapsedMs:elapsedMs});
  }

  function startDan2Voice(chunk){
    var Ctor=speechCtor();
    if(!Ctor){dan2Status("この ブラウザでは こえが つかえません");return;}
    if(session.voice&&session.voice.listening)return;
    var rec=new Ctor(),active=session;
    session.voice={rec:rec,listening:true,startedAt:Date.now(),speechEndAt:0,timer:null};
    rec.lang="ja-JP";rec.interimResults=false;rec.maxAlternatives=3;rec.continuous=false;
    rec.onspeechend=function(){if(session===active&&session.voice)session.voice.speechEndAt=Date.now();};
    rec.onerror=function(){if(session!==active)return;stopDan2Voice();freezeTimebar();dan2Status("ききとれませんでした。もういちど となえてね");};
    rec.onresult=function(event){
      if(session!==active||!session.voice||!session.voice.listening)return;
      var texts=[],result=event.results&&event.results[0],index;
      if(result)for(index=0;index<result.length;index++)texts.push(result[index].transcript||"");
      var voice=session.voice,end=voice.speechEndAt||Date.now();
      finishDan2(chunk,texts.join(" "),Math.max(0,end-voice.startedAt));
    };
    /* バーが尽きた時点で打ち切る。認識結果を待つと、遅れて届いた発話で
       時間内だったことにできてしまう。発話終端が届いていれば「唱えたが認識が
       間に合わなかった」なのでノーカウント、一度も声が出ていなければ不正解。 */
    session.voice.timer=setTimeout(function(){
      if(session!==active||!session.voice||!session.voice.listening)return;
      var spoke=session.voice.speechEndAt>0;
      stopDan2Voice();
      freezeTimebar();
      if(spoke){retryDan2("ききとれませんでした。もういちど となえてね");return;}
      session.verdict=dan2Engine().timeoutVerdict(chunk);
      submitAnswer({transcript:"",elapsedMs:chunk.limitMs+1});
    },chunk.limitMs+200);
    dan2Status("きいています…");
    startTimebar(chunk.limitMs);
    try{rec.start();}catch(error){stopDan2Voice();dan2Status("こえを はじめられませんでした");}
  }

  function bindQuestion(question){
    document.querySelector('[data-action="back-map"]').addEventListener("click",function(){stopDan2Voice();session=null;renderMap(question.volumeId);});
    var listen=document.querySelector('[data-action="dan2-listen"]');
    if(listen)listen.addEventListener("click",function(){startDan2Voice(question);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-choice-index]"),function(button){
      button.addEventListener("click",function(){submitAnswer(choiceValue(question,Number(button.getAttribute("data-choice-index"))));});
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-step-choice]"),function(button){
      button.addEventListener("click",function(){submitRunStep(Number(button.getAttribute("data-step-choice")));});
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-part-index]"),function(button){
      button.addEventListener("click",function(){session.orderSelection.push(Number(button.getAttribute("data-part-index")));renderOrderSelection(question);});
    });
    var reset=document.querySelector('[data-action="reset-order"]'),submit=document.querySelector('[data-action="submit-order"]');
    if(reset)reset.addEventListener("click",function(){session.orderSelection=[];renderOrderSelection(question);});
    if(submit)submit.addEventListener("click",function(){submitAnswer(session.orderSelection.slice());});
    Array.prototype.forEach.call(document.querySelectorAll("[data-multi-index]"),function(button){
      button.addEventListener("click",function(){
        var index=Number(button.getAttribute("data-multi-index")),at=session.multiSelection.indexOf(index);
        if(at>=0)session.multiSelection.splice(at,1);
        else session.multiSelection.push(index);
        renderCurrent();
      });
    });
    var resetMulti=document.querySelector('[data-action="reset-multi"]'),submitMulti=document.querySelector('[data-action="submit-multi"]');
    if(resetMulti)resetMulti.addEventListener("click",function(){session.multiSelection=[];renderCurrent();});
    if(submitMulti)submitMulti.addEventListener("click",function(){submitAnswer(session.multiSelection.slice());});
    /* 単位を選んでも描き直さない。描き直すと入力済みの数が消えて、
       数を打ってから単位を押した子だけが打ち直しになる。 */
    Array.prototype.forEach.call(document.querySelectorAll("[data-unit]"),function(button){
      button.addEventListener("click",function(){
        session.unitSelection=button.getAttribute("data-unit");
        Array.prototype.forEach.call(document.querySelectorAll("[data-unit]"),function(chip){
          var on=chip.getAttribute("data-unit")===session.unitSelection;
          chip.classList.toggle("is-selected",on);
          chip.setAttribute("aria-pressed",on?"true":"false");
        });
        var submit=document.querySelector("[data-submit-num-unit]");
        if(submit)submit.disabled=false;
      });
    });
    var form=document.querySelector("[data-answer-form]");
    if(form)form.addEventListener("submit",function(event){
      event.preventDefault();
      if(question.kind==="num_unit"){
        if(!session.unitSelection)return;
        submitAnswer({value:form.elements.answer.value,unit:session.unitSelection});
        return;
      }
      if(question.kind==="frac"){
        submitAnswer({whole:form.elements.whole.value,num:form.elements.num.value,den:form.elements.den.value});
        return;
      }
      submitAnswer(form.elements.answer.value);
    });
  }

  /* 描画のやり直し。だんランは 1 問の途中で何度も描き直すため、計測の起点を
     壊さないよう、初期化を行う renderQuestion とは分けてある。 */
  function renderCurrent(errorMessage){
    var question=session.questions[session.index];
    question.volumeId=session.volumeId;
    var error=errorMessage?'<p class="ratio-error" role="alert">'+displayText(errorMessage)+'</p>':"";
    document.getElementById("app").innerHTML=sessionShell(error+questionBodyHtml(question));
    bindQuestion(question);
    if(question.kind==="order")renderOrderSelection(question);
  }

  function renderQuestion(errorMessage){
    var question=session.questions[session.index];
    stopDan2Voice();
    session.orderSelection=[];
    session.multiSelection=[];
    session.unitSelection=null;
    session.startedAt=Date.now();
    session.verdict=null;
    session.runState=question.format==="dan_run"?{step:0,results:[],startedAt:Date.now()}:null;
    renderCurrent(errorMessage);
  }

  function renderFeedback(question,correct,result){
    var last=session.index===session.questions.length-1;
    var label=last?"小道へ戻る":"次の問題";
    document.getElementById("app").innerHTML=sessionShell(feedbackHtml(question,correct,result)
      +'<button type="button" class="ratio-next" data-action="ratio-next">'+displayText(label)+'</button>');
    document.querySelector('[data-action="back-map"]').addEventListener("click",function(){var id=session.volumeId;stopDan2Voice();session=null;renderMap(id);});
    document.querySelector('[data-action="ratio-next"]').addEventListener("click",function(){
      if(last){var id=session.volumeId;stopDan2Voice();session=null;renderMap(id);}
      else{session.index++;renderQuestion();}
    });
  }

  /* 九九 SRS のデッキは初回の出題で作る。createProfile を変えると既存の保存データの
     形が動くので、遅延生成にしてある。 */
  function kukuDeck(){
    if(!profile.srs.kuku)profile.srs.kuku=kukuEngine().createDeck();
    return profile.srs.kuku;
  }

  function reviewKukuFact(dan,b,correct,ms){
    var engine=kukuEngine(),deck=kukuDeck();
    engine.noteAsked(deck);
    engine.reviewFact(deck,dan,b,correct,ms);
  }

  /* だんランの 1 句。ここでは保存せず、鎖を終えた時点で 1 問として提出する。
     句ごとのレイテンシは累加の検出に使うので、句単位で SRS に渡す。 */
  function submitRunStep(choiceIndex){
    if(!session||session.pending||!session.runState)return;
    var question=session.questions[session.index],state=session.runState,step=question.steps[state.step];
    if(!step)return;
    var value=step.choices[choiceIndex],correct=value===step.ans;
    reviewKukuFact(question.dan,step.b,correct,Math.max(0,Date.now()-state.startedAt));
    state.results.push({correct:correct,value:value});
    state.step++;
    state.startedAt=Date.now();
    if(state.step<question.steps.length){renderCurrent();return;}
    submitAnswer(state.results.map(function(result){return result.value;}));
  }

  function submitAnswer(answer){
    if(!session||session.pending)return;
    var activeSession=session,question=activeSession.questions[activeSession.index],correct;
    try{correct=judgeAnswer(question,answer);}catch(error){renderQuestion("答えを確かめられませんでした。もう一度試してください。");return;}
    activeSession.pending=true;
    var submissionId=activeSession.id+":"+activeSession.index+":"+(activeSession.attempts++);
    var event={sessionId:activeSession.id,submissionId:submissionId,format:question.format,kind:question.kind,correct:correct,final:true,retry:false};
    var elapsed=Math.max(0,Date.now()-activeSession.startedAt),volume=volumeById(activeSession.volumeId);
    /* SRS は単一の句を想起させる形式だけに効かせる。まちがいさがし・たりないさがしは
       盤面の走査であって句の想起ではないので、レイテンシを混ぜない。 */
    var fact=(question.cat==="kom_kuku_run"&&(question.format==="scroll_fill"||question.format==="flash"))?kukuFact(question):null;
    if(fact)reviewKukuFact(fact.dan,fact.b,correct,elapsed);
    /* 逆引きの誤答も同じデッキへ戻す。どのカテゴリで詰まっても、九九の再出題は
       れんぞく九九 1 か所に集まる (reverse curriculum 3.5)。 */
    if(question.cat==="kom_kuku_inverse"&&!correct&&question.fact&&global.Q4B_KOMOREBI_KUKU_RUN)reviewKukuFact(question.fact.dan,question.fact.b,false,0);
    recordSubmission(activeSession.cat,event,volume,Math.random,correct,elapsed).then(function(result){
      if(session!==activeSession)return;
      activeSession.pending=false;renderFeedback(question,correct,result);
    }).catch(function(){
      if(session!==activeSession)return;
      activeSession.pending=false;renderQuestion("答えを保存できませんでした。もう一度試してください。");
    });
  }

  function beginSession(cat,volume,questions,sessionId){
    session={id:sessionId,cat:cat,volumeId:volume.id,questions:questions,index:0,attempts:0,pending:false,
      orderSelection:[],multiSelection:[],unitSelection:null,startedAt:0,runState:null};
    renderQuestion();
    return session;
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
      return beginSession("kom_ratio",volume,questions,sessionId);
    }).catch(function(error){profile.ratioHistory=previous;throw error;});
  }

  /* 割合と違って出題履歴を先に保存する必要がない (同じ句の反復こそが目的)。
     SRS デッキの更新は解答のたびに提出と一緒に保存される。 */
  function startKukuRunSession(volume,random){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    if(!volume||volume.categories.indexOf("kom_kuku_run")<0)return Promise.reject(new Error("この小道ではれんぞく九九を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=kukuEngine().buildSet(profile.lv.kom_kuku_run,kukuDeck(),generatorRandom);
      sessionId="kuku_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_kuku_run",volume,questions,sessionId));
  }

  function startKukuDanSession(cat){
    return function(volume,random){
      if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
      if(!volume||volume.categories.indexOf(cat)<0)return Promise.reject(new Error("この小道では段暗唱を遊べません"));
      if(!speechCtor())return Promise.reject(new Error("この端末では こえを つかえません"));
      var generatorRandom=random||Math.random,chunks,sessionId;
      try{
        chunks=dan2Engine().buildSet(danOfCategory(cat),profile.lv[cat],generatorRandom);
        sessionId=cat+"_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      }catch(error){return Promise.reject(error);}
      return Promise.resolve(beginSession(cat,volume,chunks,sessionId));
    };
  }

  /* 3.14 の段は normal の 1 形式だけなので、共通シェルの標準レンダラと標準判定を
     そのまま使う。ここで足すのは出題の取り出しだけ。 */
  function startPi314Session(volume,random){
    var engine=global.Q4B_KOMOREBI_PI314;
    if(!profile||!engine)return Promise.reject(new Error("3.14 の段を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_pi314")<0)return Promise.reject(new Error("この小道では3.14の段を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=engine.buildSet(profile.lv.kom_pi314,generatorRandom);
      sessionId="pi314_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_pi314",volume,questions,sessionId));
  }

  /* うら読みと逆引きは同じ生成器を共有する。出題の取り出しだけ cat で分ける。 */
  function startKukuReverseSession(cat){
    return function(volume,random){
      if(!profile||!global.Q4B_KOMOREBI_KUKU_REVERSE)return Promise.reject(new Error("九九のうら読みを読み込めません"));
      if(!volume||volume.categories.indexOf(cat)<0)return Promise.reject(new Error("この小道では遊べません"));
      var generatorRandom=random||Math.random,questions,sessionId;
      try{
        questions=cat==="kom_kuku_ura"
          ?reverseEngine().buildUraSet(profile.lv[cat],generatorRandom)
          :reverseEngine().buildInverseSet(profile.lv[cat],generatorRandom);
        sessionId=cat+"_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      }catch(error){return Promise.reject(error);}
      return Promise.resolve(beginSession(cat,volume,questions,sessionId));
    };
  }

  function startFracFlowSession(volume,random){
    if(!profile||!global.Q4B_KOMOREBI_FRAC_FLOW)return Promise.reject(new Error("分数の解き方を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_frac_flow")<0)return Promise.reject(new Error("この小道では遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=fracEngine().buildSet(profile.lv.kom_frac_flow,generatorRandom);
      sessionId="frac_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_frac_flow",volume,questions,sessionId));
  }

  /* 生成器を 1 つ持つだけのカテゴリは同じ形で開始できる。cat ごとに関数を
     書き足すと、増えるたびに同じ 10 行が並ぶ。 */
  function startGeneratedSession(cat,globalName,errorMessage){
    return function(volume,random){
      var engine=global[globalName];
      if(!profile||!engine)return Promise.reject(new Error(errorMessage));
      if(!volume||volume.categories.indexOf(cat)<0)return Promise.reject(new Error("この小道では遊べません"));
      var generatorRandom=random||Math.random,questions,sessionId;
      try{
        questions=engine.buildSet(profile.lv[cat],generatorRandom);
        sessionId=cat+"_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      }catch(error){return Promise.reject(error);}
      return Promise.resolve(beginSession(cat,volume,questions,sessionId));
    };
  }

  function startUnitConvertSession(volume,random){
    if(!profile||!global.Q4B_KOMOREBI_UNIT_CONVERT)return Promise.reject(new Error("単位換算を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_unit_convert")<0)return Promise.reject(new Error("この小道では単位換算を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=unitEngine().buildSet(profile.lv.kom_unit_convert,generatorRandom);
      sessionId="unit_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_unit_convert",volume,questions,sessionId));
  }

  /* 段暗唱は CATEGORIES に 1 行足すだけで dan3 以降が動く。開始関数もここで
     機械的に作るので、段ごとに分岐を書き足す場所は残さない。 */
  var SESSION_STARTERS={kom_ratio:startRatioSession,kom_kuku_run:startKukuRunSession,
    kom_pi314:startPi314Session,kom_unit_convert:startUnitConvertSession,kom_frac_flow:startFracFlowSession,
    kom_kuku_ura:startKukuReverseSession("kom_kuku_ura"),
    kom_kuku_inverse:startKukuReverseSession("kom_kuku_inverse"),
    kom_kuku_bridge:startGeneratedSession("kom_kuku_bridge","Q4B_KOMOREBI_KUKU_BRIDGE","九九の外へを読み込めません"),
    kom_equation_select:startGeneratedSession("kom_equation_select","Q4B_KOMOREBI_EQUATION_SELECT","文章題の式えらびを読み込めません")};
  Object.keys(CATEGORIES).forEach(function(cat){
    if(danOfCategory(cat))SESSION_STARTERS[cat]=startKukuDanSession(cat);
  });

  function categoryButtonsHtml(volume,badge){
    var buttons="";
    /* 未公開の更新に属するカテゴリは選択肢そのものを出さない。volume manifest が
       先に挙げていても、公開は CURRENT_RELEASE 1 か所で決める。 */
    volume.categories.filter(isReleased).forEach(function(cat){
      /* 音声カテゴリはマイクが無いことを「始める前に」出す。代替入力は提供しない
         (design 7.4)。押してから駄目だと分かるのは子どもには理不尽。 */
      var blocked=isDanCat(cat)&&!speechCtor()?"マイクが つかえません":(SESSION_STARTERS[cat]?"":"準備中");
      /* badge はこのボタンで正答したときに増える図鑑の巻番号。どのボタンが
         どの図鑑を増やすかを、始める前に見えるようにする (volume_zukan_design 3.1)。 */
      var badgeHtml=badge?'<span class="path-badge" aria-label="'+attrText("遠征 "+badge)+'">'+badge+'</span>':"";
      if(!blocked)buttons+='<button type="button" class="path-choice" data-cat="'+cat+'" data-volume-id="'+escapeHtml(volume.id)+'"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span>'+badgeHtml+'<span class="path-choice-note">'+displayText("Lv "+profile.lv[cat])+'</span></button>';
      else buttons+='<button type="button" class="path-choice" disabled aria-disabled="true"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span>'+badgeHtml+'<span class="path-choice-note">'+displayText(blocked)+'</span></button>';
    });
    return buttons;
  }

  function pathPanelHtml(region){
    var collection=viewCollection(),multi=region.volumes.length>1,sections="",progressParts=[];
    region.volumes.forEach(function(volume){
      var numeral=romanNumeral(volumeExpedition(volume)),buttons=categoryButtonsHtml(volume,multi?numeral:"");
      if(!buttons)return;
      /* 巻が複数のときだけ見出しと badge を出す。1 巻の地域に「遠征 Ⅰ」を
         書いても情報がない。 */
      if(multi)sections+='<h3 class="path-exp-head">'+displayText("遠征 "+numeral)+'</h3>';
      sections+='<div class="path-choices" aria-label="'+attrText("あるく小道を えらぼう")+'">'+buttons+'</div>';
      var progress=volumeProgress(volume,collection);
      progressParts.push((multi?numeral+" ":"")+progress.caught+"／"+progress.denominator+(progress.complete?" ✓":""));
    });
    /* 地域の形は世界地図の実寸では読めない (コスタリカは幅 11、豪は 137)。
       形はここで単独に大きく描き、地図は位置を示す役に徹する。 */
    var box=worldMap.regionBoxes&&worldMap.regionBoxes[region.regionId];
    var shape=box?'<svg class="path-shape" viewBox="'+box.join(" ")+'" role="img" aria-label="'+attrText(region.regionName+"の形")+'"><path d="'+escapeHtml(worldMap.regions[region.regionId])+'"></path></svg>':"";
    return '<div class="path-place">'+shape+'<div class="path-place-text"><h2>'+displayText(region.regionName+"の小道")+'</h2><p>'+displayText(region.blurb)+'</p></div></div>'
      +sections
      +'<div class="path-foot"><button type="button" class="path-zukan" data-action="zukan">📖 '+displayText(region.regionName+"の ずかん")+'</button>'
      +'<span class="path-progress">'+displayText("あつめた虫")+'　<strong>'+progressParts.join("　")+'</strong></span></div>';
  }

  function bindPathPanel(region){
    document.querySelector('#pathPanel [data-action="zukan"]').addEventListener("click",function(){renderZukan(region.regionId);});
    Array.prototype.forEach.call(document.querySelectorAll("#pathPanel [data-cat]"),function(button){
      var cat=button.getAttribute("data-cat"),start=SESSION_STARTERS[cat];
      /* 捕獲プールはボタンが属する巻。badge が示す対応をここが実行する。 */
      var volume=volumeById(button.getAttribute("data-volume-id"));
      if(!start)return;
      button.addEventListener("click",function(){
        button.disabled=true;
        start(volume,Math.random).catch(function(){
          button.disabled=false;
          var panel=document.getElementById("pathPanel");
          if(panel&&!panel.querySelector(".ratio-start-error"))panel.insertAdjacentHTML("afterbegin",'<p class="ratio-start-error" role="alert">'+displayText(CATEGORIES[cat].name+"を始められませんでした。もう一度試してください。")+'</p>');
        });
      });
    });
  }

  function selectRegion(region){
    var panel=document.getElementById("pathPanel");
    if(!panel)return;
    panel.innerHTML=pathPanelHtml(region);
    bindPathPanel(region);
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      pin.classList.toggle("pin-selected",pin.getAttribute("data-region-id")===region.regionId);
    });
    var leader=document.querySelector(".map-leader"),point=worldMap.pins[region.regionId],box=mapViewBox(worldMap);
    if(leader&&point){
      leader.style.left=((point.x-box[0])/box[2]*100).toFixed(3)+"%";
      leader.style.top=((point.y-box[1])/box[3]*100).toFixed(3)+"%";
    }
  }

  function showRegionBlurb(volume){
    var blurb=document.getElementById("regionBlurb");
    if(blurb)blurb.innerHTML='<strong>'+displayText(volume.regionName)+'</strong><span>'+displayText(volume.blurb)+'</span>';
  }

  /* --- トロフィー ------------------------------------------------------------
     入口は地図の下端に置き、専用ページへ送る (ui_design 6 章)。最初の数週間は
     獲得ゼロなので、空の棚をトップに常時置くと虚しく場所も食う。 */

  function trophyModule(){
    var module=global.Q4B_KOMOREBI_TROPHIES;
    if(!module)throw new Error("トロフィーデータを読み込めません");
    return module;
  }

  /* 未公開カテゴリのトロフィーは枠ごと出さない。取りようのない枠を並べると、
     目標ボードが「いつまでも埋まらない棚」に見えてしまう。 */
  function releasedTrophies(){
    return trophyModule().list().filter(function(trophy){return isReleased(trophy.cat);});
  }

  function trophyEntranceHtml(){
    var all=releasedTrophies(),earned=all.filter(function(trophy){return profile.trophies[trophy.trophyId];}).length;
    return '<div class="kom-trophy-entrance"><button type="button" class="kom-trophy-open" data-action="trophies">'
      +'🏆 <span>'+displayText("トロフィー")+'</span> <strong>'+earned+'／'+all.length+'</strong></button></div>';
  }

  function trophySlotHtml(trophy){
    var record=profile.trophies[trophy.trophyId],reward=global.Q4BReward;
    var sp=reward&&reward.spById?reward.spById(trophy.speciesId):null;
    var name=sp?sp.jaName:trophy.speciesId;
    if(!record){
      /* 未獲得の枠も並べる。空のページを「何もない部屋」ではなく目標ボードにし、
         条件が Lv10 到達ではなくクリアであることを初めて見える形にする。 */
      return '<li class="kom-trophy-slot is-locked"><div class="kom-trophy-art">🔒</div>'
        +'<p class="kom-trophy-name">'+displayText("？？？")+'</p>'
        +'<p class="kom-trophy-cond">'+displayText(CATEGORIES[trophy.cat].name+"を Lv10 クリア")+'</p></li>';
    }
    var art=(sp&&reward.svg)?reward.svg(trophyModule().goldSpecies(sp),false):"";
    return '<li class="kom-trophy-slot is-earned"><div class="kom-trophy-art">'+art+'</div>'
      +'<p class="kom-trophy-name">'+displayText(trophyModule().displayName(trophy,name))+'</p>'
      +'<p class="kom-trophy-cond">'+displayText(record.at+" かくとく")+'</p></li>';
  }

  function renderTrophies(volumeId){
    var all=releasedTrophies(),earned=all.filter(function(trophy){return profile.trophies[trophy.trophyId];}).length;
    document.getElementById("app").innerHTML='<main class="kom-page kom-trophy-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText("小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText("きんいろトロフィー")+'</h1>'
      +'<p>'+displayText("カテゴリを Lv10 クリアすると もらえる")+'　<strong>'+earned+'／'+all.length+'</strong></p></div>'
      +'<ul class="kom-trophy-grid">'+all.map(trophySlotHtml).join("")+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(volumeId);});
  }

  function renderMap(selectedId){
    var volumes=expeditionVolumes(),regions=regionList();
    validateMapPayload(worldMap,volumes);
    /* selectedId は volume id でも region id でも受ける (セッションからの戻りは
       volume id で来る)。未知の id でも落とさず現在の地域へ寄せる。 */
    var wantedRegion=null;
    regions.forEach(function(region){
      if(region.regionId===selectedId)wantedRegion=region;
      region.volumes.forEach(function(volume){if(volume.id===selectedId)wantedRegion=region;});
    });
    var currentRegion=regions.filter(function(region){return region.current;})[0]||regions[0];
    var selected=wantedRegion||currentRegion;
    /* 1 画面構成: 表題 / 地図 (どこ) / 引き出し線 / 小道の一覧 (主役)。
       地図はカテゴリを選ぶための文脈であって、地域選択を挟む関門にはしない。 */
    document.getElementById("app").innerHTML='<main class="kom-page kom-map-page"><header class="kom-top"><a class="kom-back" href="../keisan/index.html">← けいさん</a></header>'
      +'<div class="kom-title"><h1>'+displayText("木漏れ日の小道")+'</h1><p>'+displayText("あるく小道を えらぼう")+'</p></div>'
      +'<section class="map-panel" aria-label="'+attrText("世界の地図")+'">'+mapArtworkHtml(regions,currentRegion.regionId,selected.regionId)+'</section>'
      +'<section class="path-panel" id="pathPanel" aria-live="polite">'+pathPanelHtml(selected)+'</section>'
      +pathZukanEntranceHtml()
      +trophyEntranceHtml()+'</main>';
    bindPathPanel(selected);
    document.querySelector('[data-action="trophies"]').addEventListener("click",function(){renderTrophies(selected.regionId);});
    document.querySelector('[data-action="path-zukan"]').addEventListener("click",function(){renderCommonZukan(selected.regionId);});
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      var region=regionById(pin.getAttribute("data-region-id"));
      pin.addEventListener("click",function(){selectRegion(region);});
      pin.addEventListener("focus",function(){selectRegion(region);});
    });
  }

  /* 図鑑の絞り込み。本編 keisan の zukanMatchK と同じ語彙 (レア度 tier / 分類キー /
     未捕獲を隠す / 検索) を使うが、状態は小道側に持つ。本編の KZ_* は keisan の
     プロフィールに束縛されているため共有できない。 */
  var zukanFilter={rarity:"",group:"",caughtOnly:false,query:"",expedition:"",region:""};

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
    return '<div class="zukan-filters"><div class="zukan-chips" role="group" aria-label="'+attrText("レア度でしぼる")+'">'+tiers+'</div>'
      +'<div class="zukan-controls"><select id="zukanGroup" aria-label="'+attrText("なかまでしぼる")+'">'+groupOpts+'</select>'
      +'<label class="zukan-toggle"><input type="checkbox" id="zukanCaught"'+(zukanFilter.caughtOnly?" checked":"")+'>'+displayText("つかまえたものだけ")+'</label>'
      +'<input type="search" id="zukanQuery" value="'+escapeHtml(zukanFilter.query)+'" placeholder="'+attrText("なまえでさがす")+'" aria-label="'+attrText("なまえでさがす")+'"></div></div>';
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
      +'<div class="zukan-name">'+displayText(sp?speciesName(sp):entry.id)+'</div>'
      +'<div class="zukan-meta"><span class="zukan-tier r'+(sp?sp.r:0)+'">'+displayText(sp&&reward.TIERNAME?reward.TIERNAME[sp.r]:entry.rarity)+'</span>'
      +size+'<span>'+displayText(record.n+"匹")+'</span></div>'
      +(entry.flagship?'<div class="zukan-flag">'+displayText("この遠征の 看板")+'</div>':"")+'</li>';
  }

  /* 地域の全巻の種を 1 冊に連結する。I/II/III は運用の単位であって、子どもに
     とっての意味単位は「マダガスカルの虫」。分冊感を出さない (volume_zukan_design 3.2)。 */
  function regionEntries(region,collection){
    var reward=global.Q4BReward,entries=[];
    region.volumes.forEach(function(volume){
      var numeral=romanNumeral(volumeExpedition(volume));
      volume.species.forEach(function(entry){
        entries.push({entry:entry,expedition:numeral,regionId:region.regionId,regionName:region.regionName,
          sp:reward&&reward.spById?reward.spById(entry.id):null,record:collection.catches[entry.id]});
      });
    });
    return entries;
  }

  /* 進捗は巻ごとの凍結分母を並べる。合計は添え物で、完成判定は巻ごと (決定 4)。 */
  function regionProgressHtml(region,collection){
    var multi=region.volumes.length>1,parts=[],caught=0,denominator=0;
    region.volumes.forEach(function(volume){
      var progress=volumeProgress(volume,collection);
      caught+=progress.caught;denominator+=progress.denominator;
      parts.push((multi?romanNumeral(volumeExpedition(volume))+" ":"")+progress.caught+"／"+progress.denominator+(progress.complete?" ✓":""));
    });
    if(multi)parts.push("合計 "+caught+"／"+denominator);
    return parts.join("　");
  }

  function expeditionChipsHtml(region){
    if(region.volumes.length<2)return "";
    var chips=[["","すべて"]].concat(region.volumes.map(function(volume){
      var numeral=romanNumeral(volumeExpedition(volume));
      return [numeral,"遠征 "+numeral];
    })).map(function(pair){
      return '<button type="button" class="zukan-chip'+(zukanFilter.expedition===pair[0]?" is-on":"")+'" data-filter="expedition" data-value="'+escapeHtml(pair[0])+'">'+displayText(pair[1])+'</button>';
    }).join("");
    return '<div class="zukan-chips" role="group" aria-label="'+attrText("遠征でしぼる")+'">'+chips+'</div>';
  }

  function renderZukan(regionId){
    var region=regionById(regionId),collection=viewCollection();
    var entries=regionEntries(region,collection);
    var shown=entries.filter(function(item){
      if(zukanFilter.expedition!==""&&item.expedition!==zukanFilter.expedition)return false;
      return zukanMatches(item.sp,item.record);
    });
    var cards=shown.map(function(item){return zukanCardHtml(item.entry,item.record);}).join("")
      ||'<li class="zukan-empty">'+displayText("じょうけんに あう虫は いないよ。")+'</li>';
    document.getElementById("app").innerHTML='<main class="kom-page zukan-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText(region.regionName+"の小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText(region.regionName+"の ずかん")+'</h1>'
      +'<p>'+displayText("あつめた虫")+'　<strong>'+regionProgressHtml(region,collection)+'</strong>'
      +(shown.length!==entries.length?'　<span class="zukan-shown">'+displayText("ひょうじ中 "+shown.length+"種")+'</span>':"")+'</p></div>'
      +expeditionChipsHtml(region)
      +zukanFilterBarHtml(entries)
      +'<ul class="zukan-grid">'+cards+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(region.regionId);});
    bindZukanFilters(function(){renderZukan(regionId);});
    bindZukanCards(entries,function(){renderZukan(regionId);});
  }

  function bindZukanFilters(rerender){
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="rarity"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.rarity=button.getAttribute("data-value");
        rerender();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="expedition"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.expedition=button.getAttribute("data-value");
        rerender();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="region"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.region=button.getAttribute("data-value");
        rerender();
      });
    });
    var group=document.getElementById("zukanGroup");
    if(group)group.addEventListener("change",function(){zukanFilter.group=group.value;rerender();});
    var caught=document.getElementById("zukanCaught");
    if(caught)caught.addEventListener("change",function(){zukanFilter.caughtOnly=caught.checked;rerender();});
    var query=document.getElementById("zukanQuery");
    if(query)query.addEventListener("input",function(){
      zukanFilter.query=query.value;
      rerender();
      var again=document.getElementById("zukanQuery");
      if(again){again.focus();again.setSelectionRange(again.value.length,again.value.length);}
    });
  }

  /* --- 小道の共通図鑑 --------------------------------------------------------
     全地域を横断する読み物としての図鑑 (volume_zukan_design 3.3)。御神木パネルの
     「こもれび N/M」の着地先。捕獲の場ではないので、ここから遠征へは飛ばない。 */

  function pathZukanEntranceHtml(){
    var collection=viewCollection(),caught=0,denominator=0;
    regionList().forEach(function(region){
      region.volumes.forEach(function(volume){
        var progress=volumeProgress(volume,collection);
        caught+=progress.caught;denominator+=progress.denominator;
      });
    });
    return '<div class="kom-trophy-entrance"><button type="button" class="kom-trophy-open" data-action="path-zukan">'
      +'📖 <span>'+displayText("こもれびの ずかん")+'</span> <strong>'+caught+'／'+denominator+'</strong></button></div>';
  }

  function renderCommonZukan(backId){
    var collection=viewCollection(),regions=regionList(),entries=[];
    regions.forEach(function(region){
      regionEntries(region,collection).forEach(function(item){entries.push(item);});
    });
    var shown=entries.filter(function(item){
      if(zukanFilter.region!==""&&item.regionId!==zukanFilter.region)return false;
      return zukanMatches(item.sp,item.record);
    });
    var regionChips=[["","すべて"]].concat(regions.map(function(region){return [region.regionId,region.regionName];}))
      .map(function(pair){
        return '<button type="button" class="zukan-chip'+(zukanFilter.region===pair[0]?" is-on":"")+'" data-filter="region" data-value="'+escapeHtml(pair[0])+'">'+displayText(pair[1])+'</button>';
      }).join("");
    var cards=shown.map(function(item){return zukanCardHtml(item.entry,item.record);}).join("")
      ||'<li class="zukan-empty">'+displayText("じょうけんに あう虫は いないよ。")+'</li>';
    var caught=entries.filter(function(item){return item.record;}).length;
    document.getElementById("app").innerHTML='<main class="kom-page zukan-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText("小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText("こもれびの ずかん")+'</h1>'
      +'<p>'+displayText("あつめた虫")+'　<strong>'+caught+'／'+entries.length+'</strong>'
      +(shown.length!==entries.length?'　<span class="zukan-shown">'+displayText("ひょうじ中 "+shown.length+"種")+'</span>':"")+'</p></div>'
      +'<div class="zukan-chips" role="group" aria-label="'+attrText("ちいきでしぼる")+'">'+regionChips+'</div>'
      +zukanFilterBarHtml(entries)
      +'<ul class="zukan-grid">'+cards+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(backId);});
    bindZukanFilters(function(){renderCommonZukan(backId);});
    bindZukanCards(entries,function(){renderCommonZukan(backId);});
  }

  /* 捕獲済みカードをタップすると、本編と同じ詳細 (Q4BZukan.detailHTML) を開く。
     detailHTML は捕獲記録と種を引数で受ける汎用 API なので、小道の記録をそのまま渡せる。 */
  function bindZukanCards(entries,rerender){
    Array.prototype.forEach.call(document.querySelectorAll(".zukan-card[data-species-id]"),function(card){
      function open(){
        var item=entries.filter(function(x){return x.entry.id===card.getAttribute("data-species-id");})[0];
        if(item&&item.record&&item.sp)openZukanModal(item,rerender);
      }
      card.addEventListener("click",open);
      card.addEventListener("keydown",function(event){
        if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}
      });
    });
  }

  /* 本編 keisan の図鑑詳細と同じ体裁: 背景タップで閉じるモーダル、種名・レア度・
     捕獲サイズ・学名・分類・注意・説明の順。中身は共有の Q4BZukan.detailHTML。 */
  function breedingCollection(){
    return {catches:profile.collection.catches,total:profile.collection.totalCatches};
  }

  function refreshZukanModal(spId,redrawScreen){
    var rerender=zukanModalRerender;
    if(typeof rerender!=="function")return;
    if(redrawScreen)rerender();
    var sp=global.Q4BReward&&global.Q4BReward.spById?global.Q4BReward.spById(spId):null;
    var record=profile&&profile.collection&&profile.collection.catches[spId];
    if(sp&&record)openZukanModal({sp:sp,record:record},rerender);
    else closeZukanModal();
  }

  function komorebiLayEgg(spId){
    if(!profile||!profile.collection||!global.Q4BReward||!global.Q4BBreeding)return;
    var sp=global.Q4BReward.spById(spId); if(!sp)return;
    global.Q4BBreeding.openLayConfirm(sp,{coll:breedingCollection(),profileId:profileId,homeHref:"../index.html",onSuccess:function(){
      refreshZukanModal(spId,false);
    }});
  }

  function komorebiAbandonEgg(spId){
    if(!global.Q4BReward)return;
    if(!global.confirm("この たまごを すてる? (返金なし)"))return;
    if(!global.confirm("ほんとうに すてる?"))return;
    global.Q4BReward.abandonEgg(spId).then(function(ok){if(ok)refreshZukanModal(spId,false);});
  }

  function komorebiHatchEgg(spId){
    if(!profile||!profile.collection||!global.Q4BReward)return;
    var coll=breedingCollection();
    global.Q4BReward.hatchEgg(coll,spId).then(function(result){
      if(!result){global.alert("孵化できませんでした (別の たんまつで すすんでいる可能性があります)");return;}
      profile.collection.catches=coll.catches;
      profile.collection.totalCatches=coll.total;
      saveProfile().then(function(){refreshZukanModal(spId,true);},function(){
        global.alert("孵化できませんでした (別の たんまつで すすんでいる可能性があります)");
      });
    });
  }

  function openZukanModal(item,rerender){
    closeZukanModal();
    zukanModalRerender=rerender;
    var reward=global.Q4BReward,sp=item.sp,record=item.record,tier=sp.r;
    var size=sp.sizeMm?sp.sizeMm[0]+"〜"+sp.sizeMm[1]+"mm":"";
    var caught=Number.isFinite(record.max)?record.max+"mm":"";
    var detail=(global.Q4BZukan&&global.Q4BZukan.detailHTML)?global.Q4BZukan.detailHTML(record,sp,{coll:breedingCollection(),onLayEgg:"komorebiLayEgg",onAbandonEgg:"komorebiAbandonEgg",onHatchEgg:"komorebiHatchEgg"}):"";
    var overlay=document.createElement("div");
    overlay.className="kom-modal";
    overlay.id="komZukanModal";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +'<div class="kom-modal-art r'+tier+'">'+(reward.svg?reward.svg(sp,record.records&&record.records.some(function(r){return r.shiny;})):"")+'</div>'
      +'<h3>'+displayText(speciesName(sp))+'</h3>'
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
    zukanModalRerender=null;
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
    pull.then(function(){return Promise.all([QuestSave.loadVersioned("komorebi",profileId,null),QuestSave.load("keisan",profileId),loadWorldMap(),loadRatioPool()]);}).then(function(data){
      var normalized=normalizeProfile(data[0].data);
      profile=normalized.profile;
      profileRevision=data[0].revision;
      profileType=data[1]&&data[1].type==="k5"?"k5":"k10";
      worldMap=validateMapPayload(data[2],expeditionVolumes());
      ratioPool=data[3];
      return normalized.changed?saveProfile():true;
    /* renderMap を直接渡すと Promise の解決値が selectedId として届いてしまう。 */
    }).then(function(){renderMap();}).catch(renderError);
  }

  global.komorebiLayEgg=komorebiLayEgg;
  global.komorebiAbandonEgg=komorebiAbandonEgg;
  global.komorebiHatchEgg=komorebiHatchEgg;

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
    judgeStandardAnswer:judgeStandardAnswer,
    standardQuestionBodyHtml:standardQuestionBodyHtml,
    wazaCardHtml:wazaCardHtml,
    feedbackHtml:feedbackHtml,
    kukuQuestionBodyHtml:kukuQuestionBodyHtml,
    startRatioSession:startRatioSession,
    startKukuRunSession:startKukuRunSession,
    sessionStarters:SESSION_STARTERS,
    isReleased:isReleased,
    currentRelease:function(){return CURRENT_RELEASE;},
    dan2QuestionBodyHtml:dan2QuestionBodyHtml,
    formatCourseText:formatCourseText,
    applyPerformance:applyPerformance,
    recordResult:recordResult,
    speciesForArea:speciesForArea,
    profile:function(){return profile;}
  };
  if(!global.Q4B_KOMOREBI_NO_BOOT&&global.document)boot();
})(window);
