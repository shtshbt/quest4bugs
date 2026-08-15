(function(global){
  "use strict";

  var KUKU_RUN_CONFIG={
    slowMs:4000,
    fastMs:2500,
    runLength:5,
    maxInterval:32,
    shortLoopGap:3,
    setSize:5
  };
  var FORMATS=["dan_run","scroll_fill","missing_find","error_find","flash"];
  var TEACHING_ORDER=[2,5,3,4,6,7,8,9];
  var PHRASES=global.Q4B_KUKU_PHRASES;

  if(!PHRASES||typeof PHRASES.phrase!=="function")throw new Error("九九の読みを利用できません");

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
  function isNonNegativeInteger(value){return isInteger(value)&&value>=0;}
  function range(start,end){var values=[];for(var value=start;value<=end;value++)values.push(value);return values;}

  function randomValue(random){
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var value=random();
    if(typeof value!=="number"||!isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }

  function pick(values,random){
    if(!Array.isArray(values)||!values.length)throw new Error("生成候補がありません");
    return values[Math.floor(randomValue(random)*values.length)];
  }

  function shuffle(values,random){
    var result=values.slice();
    for(var i=result.length-1;i>0;i--){
      var j=Math.floor(randomValue(random)*(i+1)),temporary=result[i];
      result[i]=result[j];result[j]=temporary;
    }
    return result;
  }

  function generationError(message){var error=new Error(message);error.retryGeneration=true;return error;}

  function validateFact(dan,b){
    if(!isInteger(dan)||!isInteger(b)||dan<1||dan>9||b<1||b>9)throw new Error("九九の指定が正しくありません");
  }

  function factKey(dan,b){validateFact(dan,b);return dan+"x"+b;}

  function parseFactKey(key){
    var match=typeof key==="string"&&/^([1-9])x([1-9])$/.exec(key);
    if(!match)throw new Error("九九デッキのキーが正しくありません");
    return {dan:Number(match[1]),b:Number(match[2])};
  }

  function createDeck(){return {counter:0,facts:{}};}

  function validateDeck(deck){
    if(!isObject(deck)||!isNonNegativeInteger(deck.counter)||!isObject(deck.facts))throw new Error("九九デッキの形式が正しくありません");
    Object.keys(deck.facts).forEach(function(key){
      var fact=deck.facts[key];
      parseFactKey(key);
      if(!isObject(fact)||!isNonNegativeInteger(fact.interval)||!isNonNegativeInteger(fact.due)||typeof fact.slow!=="boolean")throw new Error("九九デッキの記録が正しくありません");
      if(fact.seen!==undefined&&!isNonNegativeInteger(fact.seen))throw new Error("九九デッキの記録が正しくありません");
    });
    return deck;
  }

  function validateDans(dans){
    if(!Array.isArray(dans)||!dans.length)throw new Error("段の指定が正しくありません");
    dans.forEach(function(dan){if(!isInteger(dan)||dan<1||dan>9)throw new Error("段の指定が正しくありません");});
    return dans;
  }

  function dueFacts(deck,dans){
    validateDeck(deck);
    var selected=dans===undefined?range(1,9):validateDans(dans).slice();
    return Object.keys(deck.facts).map(function(key){
      var parsed=parseFactKey(key),fact=deck.facts[key];
      if(selected.indexOf(parsed.dan)<0||fact.due>deck.counter)return null;
      return {key:key,dan:parsed.dan,b:parsed.b,due:fact.due,slow:fact.slow};
    }).filter(function(fact){return fact!==null;}).sort(function(a,b){
      if(a.due!==b.due)return a.due-b.due;
      return a.key<b.key?-1:a.key>b.key?1:0;
    });
  }

  function noteAsked(deck){validateDeck(deck);deck.counter++;return deck.counter;}

  function reviewFact(deck,dan,b,correct,ms){
    validateDeck(deck);validateFact(dan,b);
    if(typeof correct!=="boolean")throw new Error("正誤の指定が正しくありません");
    if(typeof ms!=="number"||!isFinite(ms)||ms<0)throw new Error("回答時間の指定が正しくありません");
    var key=factKey(dan,b),fact=deck.facts[key],status;
    if(!fact){fact={interval:1,due:0,slow:false,seen:0};deck.facts[key]=fact;}
    if(correct===false){status="wrong";fact.interval=1;fact.slow=true;}
    else if(ms>=KUKU_RUN_CONFIG.slowMs){status="slow";fact.interval=1;fact.slow=true;}
    else if(ms<KUKU_RUN_CONFIG.fastMs){status="fast";fact.interval=Math.min(Math.max(1,fact.interval)*2,KUKU_RUN_CONFIG.maxInterval);fact.slow=false;}
    else{status="normal";fact.interval=Math.max(1,fact.interval);}
    fact.due=deck.counter+fact.interval;
    fact.seen=(isNonNegativeInteger(fact.seen)?fact.seen:0)+1;
    return {status:status,interval:fact.interval,due:fact.due,scaffold:fact.slow};
  }

  function dansForLv(lv,random){
    if(!isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");
    if(lv<=8)return [TEACHING_ORDER[lv-1]];
    if(lv===9)return randomValue(random)<0.5?[2,3,4,5]:[6,7,8,9];
    return range(1,9);
  }

  function addCandidate(selected,value,answer,forbidden){
    if(!isInteger(value)||value<=0||value===answer||selected.indexOf(value)>=0)return;
    if(forbidden&&forbidden.indexOf(value)>=0)return;
    selected.push(value);
  }

  function choicesFrom(answer,candidates,random,forbidden){
    var distractors=[];
    candidates.forEach(function(value){if(distractors.length<3)addCandidate(distractors,value,answer,forbidden);});
    if(distractors.length!==3)throw generationError("選択肢を一意にできません");
    return shuffle([answer].concat(distractors),random);
  }

  function productCandidates(dan,b){
    var answer=dan*b,candidates=[answer-1,answer+1,(dan-1)*b,(dan+1)*b];
    range(1,9).forEach(function(otherB){if(otherB!==b)candidates.push(dan*otherB);});
    return candidates;
  }

  function baseQuestion(format,kind,lv,dan,key,scaffold){
    return {cat:"kom_kuku_run",format:format,kind:kind,lv:lv,dan:dan,factKey:key,scaffold:scaffold};
  }

  function buildDanRun(lv,dan,random){
    var question=baseQuestion("dan_run","run",lv,dan,null,null);
    question.steps=range(1,KUKU_RUN_CONFIG.runLength).map(function(b){
      var answer=dan*b;
      return {b:b,ans:answer,choices:choicesFrom(answer,productCandidates(dan,b),random)};
    });
    return question;
  }

  function buildScrollFill(lv,dan,b,scaffold,random){
    var answer=dan*b,candidates=[answer-dan,answer+dan,answer-1,answer+1];
    var question=baseQuestion("scroll_fill","choice",lv,dan,factKey(dan,b),scaffold);
    question.rows=[b-1,b,b+1].map(function(rowB){return {b:rowB,value:dan*rowB,blank:rowB===b};});
    question.ans=answer;
    question.choices=choicesFrom(answer,candidates,random);
    return question;
  }

  /* おとりは盤面に「ある」積から取る。段の外の値を混ぜると、2 の段なら奇数を弾くだけで
     答えが出てしまい、段の完全性を確かめる問題にならない。3 つとも盤面にあることで、
     子どもは 4 つすべてを盤面と照らし合わせる必要が生じる。 */
  function buildMissingFind(lv,dan,b,random){
    var answer=dan*b,shown=range(1,9).filter(function(otherB){return otherB!==b;}).map(function(otherB){return dan*otherB;});
    var question=baseQuestion("missing_find","choice",lv,dan,factKey(dan,b),null);
    question.shown=shuffle(shown,random);
    question.ans=answer;
    question.choices=choicesFrom(answer,shuffle(shown,random),random);
    return question;
  }

  function wrongValues(dan,b){
    var correct=dan*b,values=[];
    [correct-1,correct+1,correct-dan,correct+dan].forEach(function(value){addCandidate(values,value,correct);});
    return values;
  }

  function buildErrorFind(lv,dan,startB,random){
    var wrongIndex=Math.floor(randomValue(random)*5),wrongB=startB+wrongIndex;
    var question=baseQuestion("error_find","choice",lv,dan,factKey(dan,wrongB),null);
    question.lines=range(0,4).map(function(index){
      var b=startB+index,wrong=index===wrongIndex;
      return {b:b,value:wrong?pick(wrongValues(dan,b),random):dan*b,wrong:wrong};
    });
    question.ans=wrongIndex;
    question.choices=[0,1,2,3,4];
    return question;
  }

  function buildFlash(lv,dan,b,random){
    var answer=dan*b,question=baseQuestion("flash","choice",lv,dan,factKey(dan,b),null);
    question.b=b;
    question.ans=answer;
    question.choices=choicesFrom(answer,productCandidates(dan,b),random);
    return question;
  }

  function targetFact(deck,dans,random){
    /* 短ループ (scroll_fill / flash) は b の前後の句が要るため b=1,9 は使えない。
       期限句をここで絞らないと、×1 か ×9 でつまずいたデッキは以後どの試行でも
       同じ句が先頭に返り、セット生成が永久に失敗する (実機で発生)。b=1,9 の
       期限句はだんランが b=1..9 を通しで出題するので取りこぼさない。 */
    var due=dueFacts(deck,dans).filter(function(fact){return fact.b>=2&&fact.b<=8;}),selected;
    if(due.length)return due[0];
    selected={dan:pick(dans,random),b:pick(range(2,8),random),slow:false};
    selected.key=factKey(selected.dan,selected.b);
    return selected;
  }

  function buildSetAttempt(lv,deck,random){
    var dans=dansForLv(lv,random),target=targetFact(deck,dans,random);
    if(target.b<2||target.b>8)throw generationError("短ループの句を配置できません");
    var scaffold=target.slow?PHRASES.phrase(target.dan,target.b):null;
    return [
      buildDanRun(lv,pick(dans,random),random),
      buildScrollFill(lv,target.dan,target.b,scaffold,random),
      buildMissingFind(lv,pick(dans,random),pick(range(1,9),random),random),
      buildErrorFind(lv,pick(dans,random),pick(range(1,5),random),random),
      buildFlash(lv,target.dan,target.b,random)
    ];
  }

  function buildSet(lv,deck,random){
    var activeDeck=deck===null||deck===undefined?createDeck():validateDeck(deck);
    for(var attempt=0;attempt<20;attempt++){
      try{
        var questions=buildSetAttempt(lv,activeDeck,random);
        if(questions.length===KUKU_RUN_CONFIG.setSize)return questions;
      }catch(error){if(!error.retryGeneration)throw error;}
    }
    throw new Error("条件を満たすれんぞく九九を生成できません");
  }

  function judge(question,answer){
    if(!isObject(question)||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="run"){
      if(!Array.isArray(question.steps)||!Array.isArray(answer))throw new Error("だんランの回答が正しくありません");
      if(answer.some(function(value){return typeof value!=="number"||!isFinite(value);}))throw new Error("だんランの回答が正しくありません");
      if(answer.length!==question.steps.length)return false;
      return question.steps.every(function(step,index){return isObject(step)&&typeof step.ans==="number"&&answer[index]===step.ans;});
    }
    if(question.kind==="choice"){
      if(typeof question.ans!=="number"||!isFinite(question.ans)||typeof answer!=="number"||!isFinite(answer))throw new Error("選択問題の回答が正しくありません");
      return question.ans===answer;
    }
    throw new Error("問題形式の指定が正しくありません");
  }

  global.Q4B_KOMOREBI_KUKU_RUN={
    config:KUKU_RUN_CONFIG,
    formats:FORMATS.slice(),
    dansForLv:dansForLv,
    factKey:factKey,
    createDeck:createDeck,
    validateDeck:validateDeck,
    dueFacts:dueFacts,
    reviewFact:reviewFact,
    noteAsked:noteAsked,
    buildSet:buildSet,
    judge:judge
  };
})(window);
