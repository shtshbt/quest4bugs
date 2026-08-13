(function(global){
  "use strict";

  var DAN2_CONFIG={
    setSize:5,
    levels:[
      {lv:1,chunkLength:3,display:"read",seconds:12},
      {lv:2,chunkLength:3,display:"read",seconds:10},
      {lv:3,chunkLength:3,display:"recall",seconds:8},
      {lv:4,chunkLength:3,display:"recall",seconds:6},
      {lv:5,chunkLength:5,display:"read",seconds:15},
      {lv:6,chunkLength:5,display:"read",seconds:13},
      {lv:7,chunkLength:5,display:"recall",seconds:12},
      {lv:8,chunkLength:5,display:"recall",seconds:10},
      {lv:9,chunkLength:9,display:"recall",seconds:25},
      {lv:10,chunkLength:9,display:"recall",seconds:13}
    ]
  };
  var VARIANTS={
    3:[[1,2,3],[4,5,6],[7,8,9]],
    5:[[1,2,3,4,5],[5,6,7,8,9]],
    9:[[1,2,3,4,5,6,7,8,9]]
  };
  var PHRASES=global.Q4B_KUKU_PHRASES;
  var KANA_UNITS=[
    ["きゅう",9],["いち",1],["ひと",1],["ふた",2],["さん",3],
    ["よん",4],["ろく",6],["なな",7],["しち",7],["はち",8],
    ["に",2],["し",4],["ご",5],["く",9]
  ];

  if(!PHRASES||typeof PHRASES.phrase!=="function")throw new Error("九九の読みを利用できません");

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
  function copyArray(values){return values.map(function(value){return Array.isArray(value)?value.slice():value;});}

  function levelPlan(lv){
    if(!isInteger(lv)||lv<1||lv>DAN2_CONFIG.levels.length)throw new Error("レベルの指定が正しくありません");
    var plan=DAN2_CONFIG.levels[lv-1];
    return {lv:plan.lv,chunkLength:plan.chunkLength,display:plan.display,seconds:plan.seconds};
  }

  function chunkVariants(lv){
    var plan=levelPlan(lv),variants=VARIANTS[plan.chunkLength];
    return copyArray(variants);
  }

  function validateDan(dan){
    if(!isInteger(dan)||dan<1||dan>9)throw new Error("段の指定が正しくありません");
  }

  function buildChunk(dan,lv,variantIndex){
    validateDan(dan);
    var plan=levelPlan(lv),variants=chunkVariants(lv);
    if(!isInteger(variantIndex)||variantIndex<0||variantIndex>=variants.length)throw new Error("チャンクの指定が正しくありません");
    return {
      cat:"kom_kuku_dan2",
      format:"voice",
      kind:"voice",
      lv:lv,
      dan:dan,
      variantIndex:variantIndex,
      display:plan.display,
      limitMs:plan.seconds*1000,
      phrases:variants[variantIndex].map(function(b){
        return {b:b,ans:dan*b,phrase:PHRASES.phrase(dan,b)};
      })
    };
  }

  function randomValue(random){
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var value=random();
    if(typeof value!=="number"||!isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }

  function buildSet(dan,lv,random){
    var variants=chunkVariants(lv),start=Math.floor(randomValue(random)*variants.length),set=[];
    validateDan(dan);
    /* 開始位置だけを乱数で選び、以後は巡回することで少数のチャンクを偏りなく反復する。 */
    for(var index=0;index<DAN2_CONFIG.setSize;index++)set.push(buildChunk(dan,lv,(start+index)%variants.length));
    return set;
  }

  function halfWidthLower(raw){
    return String(raw||"").toLowerCase().replace(/[０-９]/g,function(character){
      return String.fromCharCode(character.charCodeAt(0)-0xFEE0);
    });
  }

  function normalizeTranscript(raw){
    var source=halfWidthLower(raw),text="",positions=[],operators=["掛ける","かける","かけ","×","x"];
    for(var index=0;index<source.length;){
      var removed=false;
      for(var operatorIndex=0;operatorIndex<operators.length;operatorIndex++){
        var operator=operators[operatorIndex];
        if(source.slice(index,index+operator.length)===operator){index+=operator.length;removed=true;break;}
      }
      if(removed)continue;
      if(/[\s　、。,.!?！？ー\-]/.test(source.charAt(index))){index++;continue;}
      text+=source.charAt(index);positions.push(index);index++;
    }
    return {source:source,text:text,positions:positions};
  }

  function buildKanaNumbers(){
    var words=KANA_UNITS.slice(),prefixIndex,suffixIndex;
    words.push(["じゅう",10]);
    for(prefixIndex=0;prefixIndex<KANA_UNITS.length;prefixIndex++){
      words.push([KANA_UNITS[prefixIndex][0]+"じゅう",KANA_UNITS[prefixIndex][1]*10]);
      for(suffixIndex=0;suffixIndex<KANA_UNITS.length;suffixIndex++){
        words.push([
          KANA_UNITS[prefixIndex][0]+"じゅう"+KANA_UNITS[suffixIndex][0],
          KANA_UNITS[prefixIndex][1]*10+KANA_UNITS[suffixIndex][1]
        ]);
      }
    }
    for(suffixIndex=0;suffixIndex<KANA_UNITS.length;suffixIndex++){
      words.push(["じゅう"+KANA_UNITS[suffixIndex][0],10+KANA_UNITS[suffixIndex][1]]);
    }
    return words.sort(function(left,right){return right[0].length-left[0].length;});
  }

  var KANA_NUMBERS=buildKanaNumbers();
  var KANJI_UNIT={"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};

  function kanjiNumberAt(source,index){
    var match=/^([一二三四五六七八九]?十[一二三四五六七八九]?|[一二三四五六七八九])/.exec(source.slice(index));
    if(!match)return null;
    var word=match[0],tenIndex=word.indexOf("十"),value;
    if(tenIndex<0)value=KANJI_UNIT[word];
    else value=(tenIndex===0?1:KANJI_UNIT[word.charAt(0)])*10+(tenIndex===word.length-1?0:KANJI_UNIT[word.charAt(word.length-1)]);
    return {value:value,length:word.length};
  }

  function kanaNumberAt(source,index){
    for(var wordIndex=0;wordIndex<KANA_NUMBERS.length;wordIndex++){
      var entry=KANA_NUMBERS[wordIndex];
      if(source.slice(index,index+entry[0].length)===entry[0])return {value:entry[1],length:entry[0].length};
    }
    return null;
  }

  function numberTokens(source){
    var tokens=[];
    for(var index=0;index<source.length;){
      var start=index,match=null,character=source.charAt(index);
      if(/[0-9]/.test(character)){
        while(index<source.length&&/[0-9]/.test(source.charAt(index)))index++;
        tokens.push({value:parseInt(source.slice(start,index),10),start:start,end:index});
        continue;
      }
      match=kanjiNumberAt(source,index)||kanaNumberAt(source,index);
      if(match){tokens.push({value:match.value,start:start,end:start+match.length});index+=match.length;continue;}
      index++;
    }
    return tokens;
  }

  function canonicalEnd(info,phrase,cursor){
    var searchIndex=0,index,start;
    while((index=info.text.indexOf(phrase,searchIndex))>=0){
      start=info.positions[index];
      if(start>=cursor)return info.positions[index+phrase.length-1]+1;
      searchIndex=index+1;
    }
    return -1;
  }

  function numberSequence(tokens,expected,cursor){
    var expectedIndex=0,end=cursor;
    for(var tokenIndex=0;tokenIndex<tokens.length&&expectedIndex<expected.length;tokenIndex++){
      var token=tokens[tokenIndex];
      if(token.start<cursor)continue;
      if(token.value===expected[expectedIndex]){expectedIndex++;end=token.end;}
    }
    return {matched:expectedIndex,end:expectedIndex===expected.length?end:-1};
  }

  function phraseEnd(info,tokens,dan,phrase,cursor){
    var kanaEnd=canonicalEnd(info,phrase.phrase,cursor);
    var numeric=numberSequence(tokens,[dan,phrase.b,phrase.ans],cursor),numericEnd=numeric.end;
    if(kanaEnd<0)return numericEnd;
    if(numericEnd<0)return kanaEnd;
    return Math.min(kanaEnd,numericEnd);
  }

  function matchPhrases(info,tokens,chunk){
    var cursor=0,matched=0;
    for(var index=0;index<chunk.phrases.length;index++){
      var end=phraseEnd(info,tokens,chunk.dan,chunk.phrases[index],cursor);
      if(end<0)return {matched:matched,missing:index};
      matched++;cursor=end;
    }
    return {matched:matched,missing:-1};
  }

  function matchStems(tokens,chunk){
    var cursor=0;
    for(var index=0;index<chunk.phrases.length;index++){
      var match=numberSequence(tokens,[chunk.dan,chunk.phrases[index].b],cursor);
      if(match.end<0)return false;
      cursor=match.end;
    }
    return true;
  }

  function exactAnswers(tokens,chunk){
    if(tokens.length!==chunk.phrases.length)return false;
    return chunk.phrases.every(function(phrase,index){return tokens[index].value===phrase.ans;});
  }

  function hasAnyStem(tokens,chunk){
    return chunk.phrases.some(function(phrase){
      return numberSequence(tokens,[chunk.dan,phrase.b],0).end>=0;
    });
  }

  function hasKanaPhrase(text){
    for(var dan in PHRASES.table){
      if(Object.prototype.hasOwnProperty.call(PHRASES.table,dan)){
        for(var index=0;index<PHRASES.table[dan].length;index++)if(text.indexOf(PHRASES.table[dan][index])>=0)return true;
      }
    }
    return false;
  }

  function validateChunkPhrases(chunk){
    if(!isObject(chunk)||!isInteger(chunk.dan)||chunk.dan<1||chunk.dan>9||!Array.isArray(chunk.phrases)||!chunk.phrases.length){
      throw new Error("チャンク問題の指定が正しくありません");
    }
    chunk.phrases.forEach(function(phrase){
      if(!isObject(phrase)||!isInteger(phrase.b)||!isInteger(phrase.ans)||typeof phrase.phrase!=="string"){
        throw new Error("チャンク問題の指定が正しくありません");
      }
    });
  }

  function judgeTranscript(chunk,transcript){
    validateChunkPhrases(chunk);
    var info=normalizeTranscript(transcript),tokens=numberTokens(info.source),phraseMatch=matchPhrases(info,tokens,chunk);
    if(info.text===""||(tokens.length===0&&!hasKanaPhrase(info.text))){
      return {state:"recognition_failure",matched:0,missing:0};
    }
    if(phraseMatch.missing<0)return {state:"correct_phrase",matched:phraseMatch.matched,missing:-1};
    if(exactAnswers(tokens,chunk))return {state:"answer_only",matched:phraseMatch.matched,missing:phraseMatch.missing};
    var answers=numberSequence(tokens,chunk.phrases.map(function(phrase){return phrase.ans;}),0);
    if(answers.end>=0&&!hasAnyStem(tokens,chunk))return {state:"answer_only",matched:phraseMatch.matched,missing:phraseMatch.missing};
    if(matchStems(tokens,chunk))return {state:"stem_only",matched:phraseMatch.matched,missing:phraseMatch.missing};
    return {state:"wrong_phrase",matched:phraseMatch.matched,missing:phraseMatch.missing};
  }

  function judgeTiming(chunk,elapsedMs){
    if(!isObject(chunk)||typeof chunk.limitMs!=="number"||!isFinite(chunk.limitMs)||chunk.limitMs<0){
      throw new Error("制限時間の指定が正しくありません");
    }
    if(typeof elapsedMs!=="number"||!isFinite(elapsedMs)||elapsedMs<0)throw new Error("回答時間の指定が正しくありません");
    return {inTime:elapsedMs<=chunk.limitMs,limitMs:chunk.limitMs};
  }

  function judgeChunk(chunk,transcript,elapsedMs){
    var transcriptResult=judgeTranscript(chunk,transcript);
    if(transcriptResult.state==="recognition_failure"){
      return {state:"recognition_failure",correct:false,counted:false,inTime:null};
    }
    var timing=judgeTiming(chunk,elapsedMs),correct=transcriptResult.state==="correct_phrase"&&timing.inTime;
    var result={
      state:transcriptResult.state,
      correct:correct,
      counted:true,
      inTime:timing.inTime,
      limitMs:timing.limitMs,
      matched:transcriptResult.matched,
      missing:transcriptResult.missing
    };
    if(transcriptResult.state==="correct_phrase"&&!timing.inTime)result.timedOut=true;
    return result;
  }

  /* 一度も声が出ないままバーが尽きた場合。書き起こしが空でも「認識できなかった」
     ではなく「唱えられなかった」なので、認識失敗と違って成績に数える
     (categories 3.2: バー切れ = 不正解)。詰まった句は特定できないので還流しない。 */
  function timeoutVerdict(chunk){
    validateChunkPhrases(chunk);
    if(typeof chunk.limitMs!=="number"||!isFinite(chunk.limitMs))throw new Error("制限時間の指定が正しくありません");
    return {state:"timeout",correct:false,counted:true,inTime:false,timedOut:true,limitMs:chunk.limitMs,matched:0,missing:-1};
  }

  global.Q4B_KOMOREBI_KUKU_DAN2={
    config:DAN2_CONFIG,
    levelPlan:levelPlan,
    chunkVariants:chunkVariants,
    buildChunk:buildChunk,
    buildSet:buildSet,
    judgeTranscript:judgeTranscript,
    judgeTiming:judgeTiming,
    judgeChunk:judgeChunk,
    timeoutVerdict:timeoutVerdict
  };
})(window);
