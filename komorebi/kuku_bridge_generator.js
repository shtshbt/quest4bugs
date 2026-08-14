(function(global){
  "use strict";

  /* 使用例: Q4B_KOMOREBI_KUKU_BRIDGE.buildSet(4,randomFn);
     再現できる問題列にするため、乱数は呼び出し側から受け取る。 */
  var BRIDGE_CONFIG={setSize:5};
  var PATTERNS=["times_ten","tens_times","times_hundred","distribute","gather","adjust","double_half"];
  var SCAFFOLD_COUNTS=[0,2,2,2,1,1,1,1,0,0];
  var WAZA={
    times_ten:{primary:"九九の 答えに 0 を つける",alternate:"10 が 前でも うしろでも 同じ"},
    tens_times:{primary:"九九の 答えを 10 ばいする",alternate:"0 を あとから つける"},
    times_hundred:{primary:"九九の 答えに 0 を 2 つ つける",alternate:"10 ばいを 2 回"},
    distribute:{primary:"×12 は ×10 と ×2 に わける",alternate:"2 つの 九九を たす"},
    gather:{primary:"さきに まとめて ×10",alternate:"べつべつに 計算しても 同じ"},
    adjust:{primary:"×9 は ×10 から 1 こ ひく",alternate:"九九で 思い出しても よい"},
    double_half:{primary:"×8 は ×4 の 2 ばい",alternate:"×5 は ×10 の 半分"}
  };
  var LV10_WEIGHTED=["times_ten","tens_times","times_hundred","distribute","distribute","gather","adjust","double_half"];

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
  function validateLv(lv){if(!isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");}

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

  function sample(values,count,random){
    if(!Array.isArray(values)||count<0||count>values.length)throw new Error("生成候補の数が足りません");
    return shuffle(values,random).slice(0,count);
  }

  function wazaFor(pattern){
    var waza=WAZA[pattern];
    if(!waza)throw new Error("わざを生成できません");
    return {primary:waza.primary,alternate:waza.alternate};
  }

  function answerFor(pattern,factors){
    if(pattern==="gather")return factors[0]*factors[1]+factors[0]*factors[2];
    return factors[0]*factors[1];
  }

  function questionText(pattern,factors){
    if(pattern==="gather")return factors[0]+"×"+factors[1]+" + "+factors[0]+"×"+factors[2]+" は いくつですか。";
    return factors[0]+"×"+factors[1]+" は いくつですか。";
  }

  function baseQuestion(lv,pattern,factors){
    return {
      cat:"kom_kuku_bridge",format:"normal",kind:"num",lv:lv,pattern:pattern,
      factors:factors.slice(),text:questionText(pattern,factors),scaffold:null,
      ans:answerFor(pattern,factors),waza:wazaFor(pattern)
    };
  }

  function candidatesFor(pattern){
    var candidates=[],a,b,c;
    if(pattern==="times_ten")for(a=2;a<=9;a++)candidates.push([a,10]);
    if(pattern==="tens_times")for(a=20;a<=90;a+=10)for(b=2;b<=9;b++)candidates.push([a,b]);
    if(pattern==="times_hundred"){
      for(a=2;a<=9;a++)candidates.push([a,100]);
      for(a=200;a<=900;a+=100)for(b=2;b<=9;b++)candidates.push([a,b]);
    }
    if(pattern==="distribute")for(a=2;a<=9;a++)for(b=11;b<=19;b++)candidates.push([a,b]);
    if(pattern==="gather")for(a=2;a<=9;a++)for(b=2;b<=8;b++)for(c=b+1;c<=9;c++)if(b+c===10)candidates.push([a,b,c]);
    if(pattern==="adjust")for(a=2;a<=9;a++){candidates.push([a,9]);candidates.push([a,19]);}
    if(pattern==="double_half"){
      for(a=2;a<=9;a++)candidates.push([a,8]);
      for(a=2;a<=8;a+=2)candidates.push([a,5]);
    }
    if(!candidates.length)throw new Error("問題の型が正しくありません");
    return candidates;
  }

  /* 掛ける順序だけが違う問題も同じ組とみなし、セット内の見かけの水増しを防ぐ。 */
  function factorKey(factors){
    if(factors.length===2)return factors.slice().sort(function(a,b){return a-b;}).join("×");
    return factors[0]+"×"+factors.slice(1).sort(function(a,b){return a-b;}).join("+");
  }

  function uniqueFactorCandidates(candidates){
    var seen={},result=[];
    candidates.forEach(function(factors){
      var key=factorKey(factors);
      if(!seen[key]){seen[key]=true;result.push(factors);}
    });
    return result;
  }

  function takeUniqueQuestion(lv,pattern,pool,seen){
    while(pool.length){
      var factors=pool.shift(),key=factorKey(factors);
      if(!seen[key]){seen[key]=true;return baseQuestion(lv,pattern,factors);}
    }
    throw new Error("重ならない問題を生成できません");
  }

  function buildPatternMix(lv,patterns,random){
    var pools={},seen={},questions=[];
    patterns.forEach(function(pattern){
      if(!pools[pattern])pools[pattern]=shuffle(candidatesFor(pattern),random);
      questions.push(takeUniqueQuestion(lv,pattern,pools[pattern],seen));
    });
    return questions;
  }

  function scaffoldFor(question){
    var f=question.factors;
    if(question.pattern==="tens_times")return (f[0]/10)+"×"+f[1]+" = "+((f[0]/10)*f[1])+" です。";
    if(question.pattern==="times_hundred")return f[0]<10?f[0]+"×1 = "+f[0]+" です。":(f[0]/100)+"×"+f[1]+" = "+((f[0]/100)*f[1])+" です。";
    if(question.pattern==="distribute")return f[0]+"×10 = "+(f[0]*10)+"、"+f[0]+"×"+(f[1]-10)+" = "+(f[0]*(f[1]-10))+" です。";
    if(question.pattern==="gather")return f[1]+" + "+f[2]+" = "+(f[1]+f[2])+" です。";
    if(question.pattern==="adjust")return f[0]+"×"+(f[1]+1)+" = "+(f[0]*(f[1]+1))+" です。";
    if(question.pattern==="double_half")return f[1]===8?f[0]+"×4 = "+(f[0]*4)+" です。":(f[0]/2)+"×10 = "+((f[0]/2)*10)+" です。";
    throw new Error("足場を生成できません");
  }

  function scaffoldCount(lv){validateLv(lv);return SCAFFOLD_COUNTS[lv-1];}

  function addScaffolds(questions,lv){
    var count=scaffoldCount(lv);
    questions.forEach(function(question,index){question.scaffold=index<count?scaffoldFor(question):null;});
    return questions;
  }

  function buildLv3(random){
    var small=candidatesFor("times_hundred").filter(function(factors){return factors[0]<10;});
    var hundreds=candidatesFor("times_hundred").filter(function(factors){return factors[0]>=100;});
    var factors=shuffle(sample(small,3,random).concat(sample(hundreds,2,random)),random);
    return addScaffolds(factors.map(function(values){return baseQuestion(3,"times_hundred",values);}),3);
  }

  function buildLv9(random){
    var patterns=shuffle(["distribute","distribute","gather","adjust","double_half"],random);
    return buildPatternMix(9,patterns,random);
  }

  function buildLv10(random){
    var patterns=[];
    for(var index=0;index<BRIDGE_CONFIG.setSize;index++)patterns.push(pick(LV10_WEIGHTED,random));
    return buildPatternMix(10,patterns,random);
  }

  function buildSinglePattern(lv,pattern,random){
    /* 倍々と半分では 5×8 と 8×5 が同じ候補になるため、抽選前に一組へまとめる。 */
    var candidates=uniqueFactorCandidates(candidatesFor(pattern));
    var questions=sample(candidates,BRIDGE_CONFIG.setSize,random).map(function(factors){return baseQuestion(lv,pattern,factors);});
    return addScaffolds(questions,lv);
  }

  function buildSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    if(lv===1)return buildSinglePattern(lv,"times_ten",random);
    if(lv===2)return buildSinglePattern(lv,"tens_times",random);
    if(lv===3)return buildLv3(random);
    if(lv===4||lv===5)return buildSinglePattern(lv,"distribute",random);
    if(lv===6)return buildSinglePattern(lv,"gather",random);
    if(lv===7)return buildSinglePattern(lv,"adjust",random);
    if(lv===8)return buildSinglePattern(lv,"double_half",random);
    if(lv===9)return buildLv9(random);
    return buildLv10(random);
  }

  function judge(question,answer){
    if(!isObject(question)||PATTERNS.indexOf(question.pattern)<0||!Array.isArray(question.factors)||question.factors.length<2)throw new Error("問題の指定が正しくありません");
    if(question.factors.some(function(value){return !isInteger(value);}))throw new Error("問題の因数が正しくありません");
    var expected=answerFor(question.pattern,question.factors);
    if(!isInteger(question.ans)||question.ans!==expected)throw new Error("問題の答えが正しくありません");
    if((typeof answer!=="number"&&typeof answer!=="string")||(typeof answer==="string"&&!/\S/.test(answer)))throw new Error("答えの指定が正しくありません");
    var numeric=Number(answer);
    if(!isFinite(numeric))throw new Error("答えの指定が正しくありません");
    return numeric===question.ans;
  }

  global.Q4B_KOMOREBI_KUKU_BRIDGE={
    config:BRIDGE_CONFIG,
    patterns:PATTERNS.slice(),
    scaffoldCount:scaffoldCount,
    buildSet:buildSet,
    judge:judge
  };
})(window);
