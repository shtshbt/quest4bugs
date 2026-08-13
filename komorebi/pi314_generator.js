(function(global){
  "use strict";

  var BASE_MILLI=3140;
  var PI314_CONFIG={baseMilli:BASE_MILLI,setSize:5};
  var PATTERNS=["recall","place","merge","square","advanced","inverse","distribute","decimal"];
  var SQUARES=[16,25,36,49,64,81];
  var PLACE_COEFFICIENTS=[10,20,30,40,50,60,70,80,90,100];
  var DISTRIBUTE_COEFFICIENTS=[11,12,13,14,15,17,18,19];
  /* 係数 1 を逆引きに置かない。3.14 ÷ 3.14 は答えが自明で何も訓練しないうえ、
     足場に置く「1 段下のきりのいい係数」が存在しない。 */
  var INVERSE_COEFFICIENTS=[2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,16,25,36,49,64,81];
  /* 加算はどちらの係数も 3 以上に限る。1+2 は 3.14 + 6.28 で律儀に足しても軽く、
     まとめる技のありがたみが出ない。差 3 以内という条件だけでは軽い組が通ってしまう。
     小さくまとめる練習は減算側 (8-6 = 2 等) が担う。 */
  var ADD_PAIRS=[[3,4],[3,5],[3,6],[4,4],[4,5],[4,6],[5,5]];
  var SUBTRACT_PAIRS=[[6,4],[7,4],[8,4],[9,4],[7,5],[8,5],[9,5],[8,6],[9,6],[9,7]];
  var SQUARE_DIFF_PAIRS=[[4,1],[9,1],[9,4],[16,9],[25,16]];
  var THREE_TERM_GROUPS=[[1,2,3],[1,2,4],[1,2,5],[1,3,4],[1,3,5],[2,3,4],[2,3,5],[1,4,5]];
  var HALF_COEFFICIENTS=[2,4,6,8,10,12,14,16,18];
  var MERGE_SQUARE_PAIRS=[[10,6],[20,5],[30,6],[40,9],[60,4],[80,1]];
  var SQUARE_DETAILS={
    16:{primary:"×16 は ×8 の 2 ばい",alternate:"×10 と ×6 に 分けても 同じ",scaffold:"3.14×8 = 25.12 です。"},
    25:{primary:"×25 は 314 の 半分の 半分",alternate:"×20 と ×5 に 分けても 同じ",scaffold:"314 の 半分は 157 です。"},
    36:{primary:"×36 は ×18 の 2 ばい",alternate:"×30 と ×6 に 分けても 同じ",scaffold:"3.14×18 = 56.52 です。"},
    49:{primary:"×49 は ×50 から ×1 を 引く",alternate:"",scaffold:"3.14×50 = 157 です。"},
    64:{primary:"×64 は ×32 の 2 ばい",alternate:"×60 と ×4 に 分けても 同じ",scaffold:"3.14×32 = 100.48 です。"},
    81:{primary:"×81 は ×80 と ×1 に 分ける",alternate:"",scaffold:"3.14×80 = 251.2 です。"}
  };
  var SCAFFOLD_COUNTS=[0,0,0,2,2,2,1,1,1,0];
  var LV10_WEIGHTED=["recall","place","merge","merge","square","advanced","advanced","inverse","distribute","decimal"];

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
  function range(start,end,step){var values=[];for(var value=start;value<=end;value+=step||1)values.push(value);return values;}
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

  /* 16 と 25 は同じ問題を重ねずに出現しやすくする必要があるため、重み付きで一つずつ候補を外す。 */
  function weightedSquares(count,random){
    var pool=SQUARES.slice(),selected=[];
    while(selected.length<count){
      var total=0,index,target;
      for(index=0;index<pool.length;index++)total+=pool[index]===16||pool[index]===25?2:1;
      target=randomValue(random)*total;
      for(index=0;index<pool.length;index++){
        target-=pool[index]===16||pool[index]===25?2:1;
        if(target<0)break;
      }
      selected.push(pool.splice(index,1)[0]);
    }
    return selected;
  }

  function uniqueNumbers(values){
    var result=[];
    values.forEach(function(value){if(result.indexOf(value)<0)result.push(value);});
    return result;
  }

  function coefficientsForLv(lv){
    validateLv(lv);
    if(lv===1)return range(1,5);
    if(lv===2)return range(6,9);
    if(lv===3)return range(1,9);
    if(lv===4)return PLACE_COEFFICIENTS.slice();
    if(lv===5)return range(2,10);
    if(lv===6)return SQUARES.slice();
    if(lv===7)return uniqueNumbers(range(1,10).concat(SQUARES));
    if(lv===8)return uniqueNumbers(INVERSE_COEFFICIENTS);
    if(lv===9)return uniqueNumbers(DISTRIBUTE_COEFFICIENTS.concat(range(1,9)));
    return uniqueNumbers(range(1,19).concat(PLACE_COEFFICIENTS,SQUARES));
  }

  function scaffoldCount(lv){validateLv(lv);return SCAFFOLD_COUNTS[lv-1];}

  /* 小数の掛け算を一度も使わず、整数の商と余りから表示文字列を組み立てる。 */
  function formatValue(milli){
    if(!isInteger(milli))throw new Error("値の指定が正しくありません");
    var sign=milli<0?"-":"",absolute=Math.abs(milli),whole=Math.floor(absolute/1000),remainder=absolute%1000;
    if(remainder===0)return sign+String(whole);
    var fraction=String(1000+remainder).slice(1).replace(/0+$/g,"");
    return sign+String(whole)+"."+fraction;
  }

  function baseQuestion(lv,pattern,subtype,coefficients,text,answerMilli,waza){
    return {
      cat:"kom_pi314",format:"normal",kind:"num",lv:lv,pattern:pattern,subtype:subtype,
      coefficients:coefficients.slice(),text:text,scaffold:null,ans:answerMilli/1000,
      waza:{primary:waza.primary,alternate:waza.alternate||""}
    };
  }

  function buildRecall(lv,coefficient){
    return baseQuestion(lv,"recall","recall",[coefficient],"3.14×"+coefficient+" は いくつですか。",BASE_MILLI*coefficient,
      {primary:"3.14 の 段で ×"+coefficient+" を 思い出す",alternate:""});
  }

  function buildPlace(lv,coefficient){
    return baseQuestion(lv,"place","place",[coefficient],"3.14×"+coefficient+" は いくつですか。",BASE_MILLI*coefficient,
      {primary:"×"+coefficient+" は ×"+(coefficient/10)+" の 10 ばい",alternate:"31.4×"+(coefficient/10)+" と 考えても 同じ"});
  }

  function buildMerge(lv,subtype,pair){
    var a=pair[0],b=pair[1],coefficient=subtype==="add"?a+b:a-b,operator=subtype==="add"?" + ":" - ";
    return baseQuestion(lv,"merge",subtype,[a,b],"3.14×"+a+operator+"3.14×"+b+" = □",BASE_MILLI*coefficient,
      {primary:"先に まとめて ×"+coefficient,alternate:"それぞれを 計算してから まとめても 同じ"});
  }

  function buildSquare(lv,coefficient){
    var detail=SQUARE_DETAILS[coefficient];
    return baseQuestion(lv,"square","square",[coefficient],"3.14×"+coefficient+" は いくつですか。",BASE_MILLI*coefficient,detail);
  }

  function buildAdvanced(lv,subtype,coefficients){
    var answerCoefficient,text,waza;
    if(subtype==="square_diff"){
      answerCoefficient=coefficients[0]-coefficients[1];
      text="3.14×"+coefficients[0]+" - 3.14×"+coefficients[1]+" = □";
      waza={primary:"平方数の 差を 先に ×"+answerCoefficient+" へ まとめる",alternate:""};
    }else if(subtype==="three_term"){
      answerCoefficient=coefficients[0]+coefficients[1]+coefficients[2];
      text="3.14×"+coefficients[0]+" + 3.14×"+coefficients[1]+" + 3.14×"+coefficients[2]+" = □";
      waza={primary:"3つを 先に まとめて ×"+answerCoefficient,alternate:"2つを 先に まとめても 同じ"};
    }else if(subtype==="half"){
      answerCoefficient=coefficients[0]/2;
      text="3.14×"+coefficients[0]+" ÷ 2 = □";
      waza={primary:"×"+coefficients[0]+"÷2 は ×"+answerCoefficient,alternate:"係数を 半分にしてから かける"};
    }else{
      answerCoefficient=coefficients[0]+coefficients[1];
      text="3.14×"+coefficients[0]+" + 3.14×"+coefficients[1]+" = □";
      waza={primary:"先に まとめて ×"+answerCoefficient,alternate:"Lv6 の 答えで たしかめる"};
    }
    return baseQuestion(lv,"advanced",subtype,coefficients,text,BASE_MILLI*answerCoefficient,waza);
  }

  function buildInverse(lv,subtype,coefficient){
    var productText=formatValue(BASE_MILLI*coefficient),text=subtype==="divide"?productText+" ÷ 3.14 = □":"3.14×□ = "+productText;
    return baseQuestion(lv,"inverse",subtype,[coefficient],text,coefficient*1000,
      {primary:"積から 3.14 の 段を 逆に たどる",alternate:"3.14×"+coefficient+" = "+productText+" で たしかめる"});
  }

  function buildDistribute(lv,coefficient){
    var remainder=coefficient-10;
    return baseQuestion(lv,"distribute","distribute",[coefficient],"3.14×"+coefficient+" は いくつですか。",BASE_MILLI*coefficient,
      {primary:"×"+coefficient+" は ×10 と ×"+remainder+" に 分ける",alternate:"×20 から ×"+(20-coefficient)+" を 引いても 同じ"});
  }

  function buildDecimal(lv,subtype,coefficient){
    var timesTen=subtype==="times_ten",baseText=timesTen?"31.4":"0.314",baseMilli=timesTen?31400:314;
    var primary=timesTen?"31.4×"+coefficient+" は 3.14×"+(coefficient*10)+" と 同じ":"0.314×"+coefficient+" は 3.14×"+coefficient+" の 10分の1";
    var alternate=timesTen?"3.14×"+coefficient+" の 10 ばい":"314×"+coefficient+" の 1000分の1";
    return baseQuestion(lv,"decimal",subtype,[coefficient],baseText+"×"+coefficient+" は いくつですか。",baseMilli*coefficient,
      {primary:primary,alternate:alternate});
  }

  function advancedScaffold(question){
    var values=question.coefficients;
    if(question.subtype==="square_diff")return values[0]+" - "+values[1]+" で "+(values[0]-values[1])+" になるよ。";
    if(question.subtype==="three_term")return values[0]+" + "+values[1]+" + "+values[2]+" で "+(values[0]+values[1]+values[2])+" になるよ。";
    if(question.subtype==="half")return values[0]+" ÷ 2 で "+(values[0]/2)+" になるよ。";
    return values[0]+" と "+values[1]+" で "+(values[0]+values[1])+" になるよ。";
  }

  /* 逆引きの足場は答えそのものを渡さず、答えより 1 段下のきりのいい係数を示す。
     狙いは「この積より少し大きいから、この係数より少し大きい」と当たりをつけさせ、
     わり算を始めさせないこと。遠いランドマーク (157 に対する 62.8 等) では当たりが
     つかず、足場が飾りになる。 */
  function inverseAnchors(){
    var anchors=range(1,9),tens=10;
    for(;tens<=100;tens+=10)anchors.push(tens);
    return anchors;
  }

  function inverseScaffold(question){
    var coefficient=question.coefficients[0],selected=null;
    inverseAnchors().forEach(function(anchor){
      if(anchor<coefficient&&(selected===null||anchor>selected))selected=anchor;
    });
    /* 係数 2 以上しか出さないので下は必ずある。無いなら候補表が壊れている。 */
    if(selected===null)throw new Error("逆引きの足場を作れません");
    return "3.14×"+selected+" = "+formatValue(BASE_MILLI*selected)+" です。";
  }

  function scaffoldFor(question){
    var values=question.coefficients;
    if(question.pattern==="place")return "3.14×"+(values[0]/10)+" = "+formatValue(BASE_MILLI*(values[0]/10))+" です。";
    if(question.pattern==="merge")return question.subtype==="add"?values[0]+" と "+values[1]+" で "+(values[0]+values[1])+" になるよ。":values[0]+" から "+values[1]+" を 引くと "+(values[0]-values[1])+" になるよ。";
    if(question.pattern==="square")return SQUARE_DETAILS[values[0]].scaffold;
    if(question.pattern==="advanced")return advancedScaffold(question);
    if(question.pattern==="inverse")return inverseScaffold(question);
    if(question.pattern==="distribute")return values[0]+" は 10 と "+(values[0]-10)+" に 分けるよ。";
    throw new Error("足場を生成できません");
  }

  function addScaffolds(questions,lv){
    var count=scaffoldCount(lv);
    questions.forEach(function(question,index){question.scaffold=index<count?scaffoldFor(question):null;});
    return questions;
  }

  function buildLv1(random){return shuffle(range(1,5),random).map(function(value){return buildRecall(1,value);});}
  function buildLv2(random){return shuffle([6,7,7,8,9],random).map(function(value){return buildRecall(2,value);});}
  function buildLv3(random){return sample(range(1,9),5,random).map(function(value){return buildRecall(3,value);});}

  function buildLv4(random){
    var landmark=pick([50,100],random),others=PLACE_COEFFICIENTS.filter(function(value){return value!==landmark;});
    var coefficients=shuffle([landmark].concat(sample(others,4,random)),random);
    return addScaffolds(coefficients.map(function(value){return buildPlace(4,value);}),4);
  }

  function buildLv5(random){
    var questions=sample(ADD_PAIRS,3,random).map(function(pair){return buildMerge(5,"add",pair);});
    questions=questions.concat(sample(SUBTRACT_PAIRS,2,random).map(function(pair){return buildMerge(5,"subtract",pair);}));
    return addScaffolds(shuffle(questions,random),5);
  }

  function buildLv6(random){
    var questions=weightedSquares(5,random).map(function(value){return buildSquare(6,value);});
    return addScaffolds(shuffle(questions,random),6);
  }

  function advancedCandidates(){
    var candidates=[];
    SQUARE_DIFF_PAIRS.forEach(function(values){candidates.push({subtype:"square_diff",coefficients:values});});
    THREE_TERM_GROUPS.forEach(function(values){candidates.push({subtype:"three_term",coefficients:values});});
    HALF_COEFFICIENTS.forEach(function(value){candidates.push({subtype:"half",coefficients:[value]});});
    MERGE_SQUARE_PAIRS.forEach(function(values){candidates.push({subtype:"merge_to_square",coefficients:values});});
    return candidates;
  }

  function buildLv7(random){
    var subtypes=shuffle(["square_diff","three_term","half","merge_to_square"],random),extra=pick(subtypes,random),questions=[];
    subtypes.push(extra);
    subtypes.forEach(function(subtype){
      var used=questions.filter(function(question){return question.subtype===subtype;}).map(function(question){return question.coefficients.join(",");});
      var candidates=advancedCandidates().filter(function(candidate){return candidate.subtype===subtype&&used.indexOf(candidate.coefficients.join(","))<0;});
      var selected=pick(candidates,random);
      questions.push(buildAdvanced(7,selected.subtype,selected.coefficients));
    });
    return addScaffolds(shuffle(questions,random),7);
  }

  function buildLv8(random){
    var coefficients=sample(SQUARES,2,random),remaining=INVERSE_COEFFICIENTS.filter(function(value){return coefficients.indexOf(value)<0;});
    coefficients=shuffle(coefficients.concat(sample(remaining,3,random)),random);
    var subtypes=shuffle(["divide","divide","divide","structure","structure"],random);
    var questions=coefficients.map(function(value,index){return buildInverse(8,subtypes[index],value);});
    return addScaffolds(questions,8);
  }

  function buildLv9(random){
    var distributed=sample(DISTRIBUTE_COEFFICIENTS,3,random),decimal=sample(range(1,9),2,random);
    /* Lv9 の足場は分配先を見せる契約なので、分配問題を必ず先頭に固定する。 */
    var first=buildDistribute(9,distributed[0]),rest=[buildDistribute(9,distributed[1]),buildDistribute(9,distributed[2]),
      buildDecimal(9,"times_ten",decimal[0]),buildDecimal(9,"times_tenth",decimal[1])];
    return addScaffolds([first].concat(shuffle(rest,random)),9);
  }

  function lv10Pools(random){
    var pools={recall:[],place:[],merge:[],square:[],advanced:[],inverse:[],distribute:[],decimal:[]};
    range(1,9).forEach(function(value){pools.recall.push({coefficient:value});});
    PLACE_COEFFICIENTS.forEach(function(value){pools.place.push({coefficient:value});});
    ADD_PAIRS.forEach(function(values){pools.merge.push({subtype:"add",coefficients:values});});
    SUBTRACT_PAIRS.forEach(function(values){pools.merge.push({subtype:"subtract",coefficients:values});});
    SQUARES.forEach(function(value){pools.square.push({coefficient:value});});
    pools.advanced=advancedCandidates();
    INVERSE_COEFFICIENTS.forEach(function(value){pools.inverse.push({subtype:"divide",coefficient:value});pools.inverse.push({subtype:"structure",coefficient:value});});
    DISTRIBUTE_COEFFICIENTS.forEach(function(value){pools.distribute.push({coefficient:value});});
    range(1,9).forEach(function(value){pools.decimal.push({subtype:"times_ten",coefficient:value});pools.decimal.push({subtype:"times_tenth",coefficient:value});});
    PATTERNS.forEach(function(pattern){pools[pattern]=shuffle(pools[pattern],random);});
    return pools;
  }

  function questionFromLv10Pool(pattern,pool){
    var selected=pool.shift();
    if(!selected)throw new Error("全形式混合の生成候補がありません");
    if(pattern==="recall")return buildRecall(10,selected.coefficient);
    if(pattern==="place")return buildPlace(10,selected.coefficient);
    if(pattern==="merge")return buildMerge(10,selected.subtype,selected.coefficients);
    if(pattern==="square")return buildSquare(10,selected.coefficient);
    if(pattern==="advanced")return buildAdvanced(10,selected.subtype,selected.coefficients);
    if(pattern==="inverse")return buildInverse(10,selected.subtype,selected.coefficient);
    if(pattern==="distribute")return buildDistribute(10,selected.coefficient);
    return buildDecimal(10,selected.subtype,selected.coefficient);
  }

  function buildLv10(random){
    var pools=lv10Pools(random),questions=[];
    for(var index=0;index<PI314_CONFIG.setSize;index++){
      var pattern=pick(LV10_WEIGHTED,random);
      questions.push(questionFromLv10Pool(pattern,pools[pattern]));
    }
    return questions;
  }

  function buildSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    if(lv===1)return buildLv1(random);
    if(lv===2)return buildLv2(random);
    if(lv===3)return buildLv3(random);
    if(lv===4)return buildLv4(random);
    if(lv===5)return buildLv5(random);
    if(lv===6)return buildLv6(random);
    if(lv===7)return buildLv7(random);
    if(lv===8)return buildLv8(random);
    if(lv===9)return buildLv9(random);
    return buildLv10(random);
  }

  /* 判定用の内部値も係数から再計算し、ans の浮動小数を計算根拠に戻さない。 */
  function valueOf(question){
    if(!isObject(question)||PATTERNS.indexOf(question.pattern)<0||typeof question.subtype!=="string"||!Array.isArray(question.coefficients)||!question.coefficients.length)throw new Error("問題の指定が正しくありません");
    var values=question.coefficients;
    if(values.some(function(value){return !isInteger(value);}))throw new Error("問題の係数が正しくありません");
    if(question.pattern==="recall"||question.pattern==="place"||question.pattern==="square"||question.pattern==="distribute")return BASE_MILLI*values[0];
    if(question.pattern==="merge")return BASE_MILLI*(question.subtype==="add"?values[0]+values[1]:values[0]-values[1]);
    if(question.pattern==="advanced"){
      if(question.subtype==="square_diff")return BASE_MILLI*(values[0]-values[1]);
      if(question.subtype==="three_term")return BASE_MILLI*(values[0]+values[1]+values[2]);
      if(question.subtype==="half"){
        if(values[0]%2!==0)throw new Error("2で割る係数が正しくありません");
        return BASE_MILLI*(values[0]/2);
      }
      return BASE_MILLI*(values[0]+values[1]);
    }
    if(question.pattern==="inverse")return values[0]*1000;
    if(question.pattern==="decimal")return (question.subtype==="times_ten"?31400:314)*values[0];
    throw new Error("問題の指定が正しくありません");
  }

  function judge(question,answer){
    var expected=valueOf(question)/1000;
    if(typeof question.ans!=="number"||!isFinite(question.ans)||Math.abs(question.ans-expected)>=1e-9)throw new Error("問題の答えが正しくありません");
    if((typeof answer!=="number"&&typeof answer!=="string")||(typeof answer==="string"&&!/\S/.test(answer)))throw new Error("答えの指定が正しくありません");
    var numeric=Number(answer);
    if(!isFinite(numeric))throw new Error("答えの指定が正しくありません");
    return Math.abs(numeric-question.ans)<1e-9;
  }

  global.Q4B_KOMOREBI_PI314={
    config:PI314_CONFIG,
    patterns:PATTERNS.slice(),
    coefficientsForLv:coefficientsForLv,
    scaffoldCount:scaffoldCount,
    buildSet:buildSet,
    judge:judge,
    formatValue:formatValue,
    valueOf:valueOf
  };
})(window);
