(function(global){
  "use strict";

  var FRAC_CONFIG={setSize:5};
  var DIAGNOSIS_LABELS=[
    "正しい","約分が のこっている","通分の しかたが ちがう",
    "くり下がりを わすれている","ひっくり返す 前に 約分している","計算だけ まちがえている"
  ];
  var LV10_WEIGHTED=[1,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9];
  var COMMON_DEN_CANDIDATES=[[4,6,8],[6,8,12],[6,9,12],[8,12,16],[9,12,18],[4,10,8],[6,10,12]];
  var ADD_SUB_CANDIDATES=[
    [1,6,"+",1,4],[2,3,"-",1,4],[3,4,"+",1,6],[5,6,"-",1,4],
    [2,5,"+",1,3],[7,8,"-",1,6],[3,10,"+",1,4],[5,9,"-",1,6]
  ];
  var MIXED_ADD_CANDIDATES=[
    [2,1,4,3,2,5],[1,1,3,2,1,6],[3,1,5,1,1,4],
    [2,3,8,1,1,4],[4,1,6,2,1,3],[1,2,9,3,1,6]
  ];
  var MIXED_SUB_CANDIDATES=[
    [5,1,4,2,3,4],[6,1,5,3,3,5],[7,1,6,2,5,6],
    [5,2,9,1,5,9],[8,3,10,3,7,10],[4,1,8,1,5,8]
  ];
  var MULTIPLY_CANDIDATES=[
    [4,9,3,8],[6,7,7,9],[8,9,3,10],[6,11,11,12],
    [9,10,5,12],[10,11,11,12],[8,11,11,12]
  ];
  var DIVIDE_CANDIDATES=[
    [2,3,4,9],[3,4,5,8],[4,5,2,3],[5,6,10,11],
    [3,8,9,10],[7,9,7,12]
  ];
  var MIXED_MULTIPLY_CANDIDATES=[
    [2,2,5,"×",1,1,4],[1,1,2,"×",2,2,3],
    [2,1,4,"×",1,1,3],[1,3,5,"×",2,1,2]
  ];
  var MIXED_DIVIDE_CANDIDATES=[
    [2,1,4,"÷",1,1,2],[3,1,3,"÷",1,2,3],
    [2,2,3,"÷",1,1,3],[3,3,4,"÷",1,1,2]
  ];
  var TRIPLE_CANDIDATES=[
    [1,2,"+",1,3,"-",1,4],[3,4,"-",1,6,"+",1,8],
    [2,3,"+",1,4,"-",1,6],[5,6,"-",1,4,"-",1,6],
    [1,3,"+",1,5,"+",1,6],[7,8,"-",1,3,"+",1,12]
  ];

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
  function validateLv(lv){if(!isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");}

  function validatePair(value){
    if(!isObject(value)||!isInteger(value.num)||value.num<0||!isInteger(value.den)||value.den<=0)throw new Error("分数の指定が正しくありません");
    return value;
  }

  function validateMixed(value){
    if(!isObject(value)||!isInteger(value.whole)||value.whole<0||!isInteger(value.num)||value.num<0||!isInteger(value.den)||value.den<=0)throw new Error("分数の指定が正しくありません");
    return value;
  }

  function gcd(a,b){
    if(!isInteger(a)||!isInteger(b)||(a===0&&b===0))throw new Error("最大公約数を求める数が正しくありません");
    a=Math.abs(a);b=Math.abs(b);
    while(b!==0){var remainder=a%b;a=b;b=remainder;}
    return a;
  }

  function lcm(a,b){
    if(!isInteger(a)||!isInteger(b)||a<=0||b<=0)throw new Error("最小公倍数を求める数が正しくありません");
    return a/gcd(a,b)*b;
  }

  function reduce(value){
    validatePair(value);
    if(value.num===0)return {num:0,den:1};
    var divisor=gcd(value.num,value.den);
    return {num:value.num/divisor,den:value.den/divisor};
  }

  function toImproper(value){
    validateMixed(value);
    return {num:value.whole*value.den+value.num,den:value.den};
  }

  /* 表示用の帯分数だけをここで作り、計算途中は仮分数の整数対から動かさない。 */
  function toMixed(value){
    var reduced=reduce(value),whole=Math.floor(reduced.num/reduced.den);
    return {whole:whole,num:reduced.num%reduced.den,den:reduced.den};
  }

  function formatFraction(value){
    validateMixed(value);
    if(value.num===0)return String(value.whole);
    if(value.whole===0)return value.num+"/"+value.den;
    return value.whole+" と "+value.num+"/"+value.den;
  }

  function fraction(whole,num,den){return {whole:whole,num:num,den:den};}
  function copyFraction(value){validateMixed(value);return fraction(value.whole,value.num,value.den);}
  function copyOperands(operands){return operands.map(function(value){return copyFraction(value);});}

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
    if(!Array.isArray(values)||!isInteger(count)||count<0||count>values.length)throw new Error("生成候補の数が足りません");
    return shuffle(values,random).slice(0,count);
  }

  function addPairs(left,right){return reduce({num:left.num*right.den+right.num*left.den,den:left.den*right.den});}
  function subtractPairs(left,right){
    var numerator=left.num*right.den-right.num*left.den;
    if(numerator<0)throw new Error("答えが負になる分数は生成できません");
    return reduce({num:numerator,den:left.den*right.den});
  }
  function multiplyPairs(left,right){return reduce({num:left.num*right.num,den:left.den*right.den});}
  function dividePairs(left,right){
    if(right.num===0)throw new Error("0では割れません");
    return reduce({num:left.num*right.den,den:left.den*right.num});
  }

  /* 分母を払った小数比較にせず、交差積だけで値の一致を確かめる。 */
  function equalPairs(left,right){return left.num*right.den===right.num*left.den;}

  function calculate(operands,operations){
    var result=toImproper(operands[0]);
    for(var i=0;i<operations.length;i++){
      var next=toImproper(operands[i+1]);
      if(operations[i]==="+")result=addPairs(result,next);
      else if(operations[i]==="-")result=subtractPairs(result,next);
      else if(operations[i]==="×")result=multiplyPairs(result,next);
      else if(operations[i]==="÷")result=dividePairs(result,next);
      else throw new Error("計算の指定が正しくありません");
    }
    return result;
  }

  function waza(primary,alternate){return {primary:primary,alternate:alternate};}

  function fractionQuestion(lv,pattern,operands,operations,text,skill){
    var question={
      cat:"kom_frac_flow",format:"normal",kind:"frac",lv:lv,pattern:pattern,
      operands:copyOperands(operands),text:text,scaffold:null,
      ans:toMixed(calculate(operands,operations)),waza:skill
    };
    if(operations.length===1)question.operation=operations[0];
    else question.operations=operations.slice();
    return question;
  }

  function choiceQuestion(lv,pattern,operands,text,choices,correct,skill,random){
    var ordered=shuffle(choices,random),unique=[];
    ordered.forEach(function(value){if(unique.indexOf(value)<0)unique.push(value);});
    if(unique.length!==4||ordered.indexOf(correct)<0)throw new Error("選択肢を一意に作れません");
    return {
      cat:"kom_frac_flow",format:"normal",kind:"choice",lv:lv,pattern:pattern,
      operands:copyOperands(operands),text:text,scaffold:null,
      choices:ordered,ans:ordered.indexOf(correct),waza:skill
    };
  }

  function reductionQuestion(lv,random){
    var selected=pick([[6,8],[6,9],[8,12],[4,10],[10,12],[9,12]],random);
    var source=fraction(0,selected[0],selected[1]),answer=toMixed(reduce({num:selected[0],den:selected[1]}));
    return {
      cat:"kom_frac_flow",format:"normal",kind:"frac",lv:lv,pattern:"reduce",
      operands:[source],text:formatFraction(source)+" を 約分しましょう。",scaffold:null,
      ans:answer,waza:waza("分子と 分母を 最大公約数で わる","小さい数から 共通の約数を たしかめても 同じ")
    };
  }

  /* 2 択の問いに 4 択を無理やり合わせると、答えになっていない操作の文言が
     選択肢に混ざる。4 つの分数から 1 つ選ばせる形にすれば、選択肢の型が問いと
     合ううえ、複数を見比べる訓練にもなる。 */
  function reducibleQuestion(lv,shouldReduce,random){
    var reducible=[[6,8],[6,9],[8,12],[4,10],[10,12],[9,12],[6,10],[8,10]];
    var irreducible=[[1,2],[2,3],[3,5],[5,8],[7,12],[4,9],[5,6],[3,8],[7,10],[5,12]];
    var answer,others;
    if(shouldReduce){
      answer=pick(reducible,random);
      others=sample(irreducible,3,random);
    }else{
      answer=pick(irreducible,random);
      others=sample(reducible,3,random);
    }
    var source=fraction(0,answer[0],answer[1]);
    var texts=[formatFraction(source)].concat(others.map(function(pair){return formatFraction(fraction(0,pair[0],pair[1]));}));
    return choiceQuestion(lv,"reducible",[source],
      shouldReduce?"つぎの うち まだ 約分 できるのは どれですか。":"つぎの うち もう 約分 できないのは どれですか。",
      texts,texts[0],
      waza("分子と 分母の 共通の約数を さがす","最大公約数が 1 なら 約分は おわり"),random);
  }

  function commonDenQuestion(lv,candidate,random){
    var left=fraction(0,1,candidate[0]),right=fraction(0,1,candidate[1]);
    var common=lcm(candidate[0],candidate[1]),product=candidate[0]*candidate[1],sum=candidate[0]+candidate[1];
    return choiceQuestion(lv,"common_den",[left,right],formatFraction(left)+" と "+formatFraction(right)+" を 通分します。いちばん 小さい 分母は いくつですか。",
      [String(common),String(product),String(sum),String(candidate[2])],String(common),
      waza("分母の 最小公倍数を さがす","両方の積でも 通分できるが 数が大きくなる"),random);
  }

  function diagnosisChoices(label,random){
    var selected=["正しい"];
    if(label!=="正しい")selected.push(label);
    DIAGNOSIS_LABELS.forEach(function(value){if(selected.length<4&&selected.indexOf(value)<0)selected.push(value);});
    return shuffle(selected,random);
  }

  function commonDenDiagnosis(lv,candidate,random){
    var left=fraction(0,1,candidate[0]),right=fraction(0,1,candidate[1]),product=candidate[0]*candidate[1];
    var shown=[fraction(0,candidate[1],product),fraction(0,candidate[0],product)],choices=diagnosisChoices("正しい",random);
    return {
      cat:"kom_frac_flow",format:"diagnosis",kind:"choice",lv:lv,pattern:"common_den",
      operands:[left,right],shown:shown,route:"両方の積で 通分",scaffold:null,
      text:formatFraction(left)+" と "+formatFraction(right)+" を "+formatFraction(shown[0])+" と "+formatFraction(shown[1])+" に 通分しました。どこを たしかめますか。",
      choices:choices,ans:choices.indexOf("正しい"),waza:waza("最小公倍数なら 分子を小さくできる","両方の積で 通分しても 正しい")
    };
  }

  function addSubQuestion(lv,random){
    var selected=pick(ADD_SUB_CANDIDATES,random),left=fraction(0,selected[0],selected[1]),right=fraction(0,selected[3],selected[4]),operation=selected[2];
    return fractionQuestion(lv,"add_sub",[left,right],[operation],formatFraction(left)+" "+operation+" "+formatFraction(right)+" は いくつですか。",
      waza("最小公倍数で 分母を そろえる","答えの 分子と 分母に 共通の約数がないか たしかめる"));
  }

  function mixedAddQuestion(lv,random){
    var selected=pick(MIXED_ADD_CANDIDATES,random),left=fraction(selected[0],selected[1],selected[2]),right=fraction(selected[3],selected[4],selected[5]);
    return fractionQuestion(lv,"mixed_add",[left,right],["+"],formatFraction(left)+" + "+formatFraction(right)+" は いくつですか。",
      waza("整数は 整数、分数は 分数で 計算","仮分数に 直しても 同じ答え"));
  }

  function mixedSubQuestion(lv,random){
    var selected=pick(MIXED_SUB_CANDIDATES,random),left=fraction(selected[0],selected[1],selected[2]),right=fraction(selected[3],selected[4],selected[5]);
    return fractionQuestion(lv,"mixed_sub",[left,right],["-"],formatFraction(left)+" - "+formatFraction(right)+" は いくつですか。",
      waza("整数から 1 を借りて 分数に 直す","仮分数に 直して 計算しても 同じ答え"));
  }

  function multiplyQuestion(lv,random){
    var selected=pick(MULTIPLY_CANDIDATES,random),left=fraction(0,selected[0],selected[1]),right=fraction(0,selected[2],selected[3]);
    return fractionQuestion(lv,"multiply",[left,right],["×"],formatFraction(left)+" × "+formatFraction(right)+" は いくつですか。",
      waza("かける前に 約分","あとから 約分しても 同じ答え"));
  }

  function divideQuestion(lv,random){
    var selected=pick(DIVIDE_CANDIDATES,random),left=fraction(0,selected[0],selected[1]),right=fraction(0,selected[2],selected[3]);
    return fractionQuestion(lv,"divide",[left,right],["÷"],formatFraction(left)+" ÷ "+formatFraction(right)+" は いくつですか。",
      waza("わる数を ひっくり返してから 約分","かけ算に 直してから 計算する"));
  }

  function mixedMulQuestion(lv,operation,random){
    var selected=pick(operation==="×"?MIXED_MULTIPLY_CANDIDATES:MIXED_DIVIDE_CANDIDATES,random);
    var left=fraction(selected[0],selected[1],selected[2]),right=fraction(selected[4],selected[5],selected[6]);
    return fractionQuestion(lv,"mixed_mul",[left,right],[selected[3]],formatFraction(left)+" "+selected[3]+" "+formatFraction(right)+" は いくつですか。",
      waza("帯分数を 仮分数に 直してから 約分","約分できる組を 先に さがす"));
  }

  function tripleQuestion(lv,random){
    var selected=pick(TRIPLE_CANDIDATES,random);
    var operands=[fraction(0,selected[0],selected[1]),fraction(0,selected[3],selected[4]),fraction(0,selected[6],selected[7])];
    var operations=[selected[2],selected[5]];
    return fractionQuestion(lv,"triple",operands,operations,formatFraction(operands[0])+" "+operations[0]+" "+formatFraction(operands[1])+" "+operations[1]+" "+formatFraction(operands[2])+" は いくつですか。",
      waza("最小公倍数で 3つの 分母を そろえる","2つずつ 計算しても 同じ答え"));
  }

  function unreducedAnswer(answer){
    var improper=toImproper(answer);
    return fraction(0,improper.num*2,improper.den*2);
  }

  function wrongByOne(answer){
    var improper=toImproper(answer);
    return toMixed(reduce({num:improper.num+1,den:improper.den}));
  }

  function wrongCommonDen(normal){
    if(normal.pattern==="triple")return wrongByOne(normal.ans);
    var left=toImproper(normal.operands[0]),right=toImproper(normal.operands[1]),common=lcm(left.den,right.den);
    var numerator=left.num*(common/left.den)+(normal.operation==="-"?-right.num:right.num);
    if(numerator<=0)return wrongByOne(normal.ans);
    var shown=toMixed(reduce({num:numerator,den:common}));
    return equalPairs(toImproper(shown),toImproper(normal.ans))?wrongByOne(normal.ans):shown;
  }

  function fractionDiagnosis(normal,label,route,random,shownOverride){
    var shown;
    if(shownOverride)shown=copyFraction(shownOverride);
    else if(label==="正しい")shown=copyFraction(normal.ans);
    else if(label==="約分が のこっている")shown=unreducedAnswer(normal.ans);
    else if(label==="通分の しかたが ちがう")shown=wrongCommonDen(normal);
    else shown=wrongByOne(normal.ans);
    var choices=diagnosisChoices(label,random),question={
      cat:"kom_frac_flow",format:"diagnosis",kind:"choice",lv:normal.lv,pattern:normal.pattern,
      operands:copyOperands(normal.operands),shown:shown,route:route,scaffold:null,
      /* 「答案を 計算、答えを …」は日本語として壊れる。誰かの答案を見せて、
         どこを確かめるかを問う形に固定する。 */
      text:normal.text+"　"+route+"、答えを "+formatFraction(shown)+" と しました。どこを たしかめますか。",
      choices:choices,ans:choices.indexOf(label),waza:normal.waza
    };
    if(normal.operation)question.operation=normal.operation;
    if(normal.operations)question.operations=normal.operations.slice();
    return question;
  }

  function addSubDiagnosis(lv,random){
    var normal=addSubQuestion(lv,random),label=pick(["正しい","約分が のこっている","通分の しかたが ちがう","計算だけ まちがえている"],random);
    return fractionDiagnosis(normal,label,label==="正しい"?"通分して 計算し":"計算し",random,null);
  }

  function mixedAddDiagnosis(lv,random){return fractionDiagnosis(mixedAddQuestion(lv,random),"正しい","仮分数に 直して 計算",random,null);}

  function mixedSubDiagnosis(lv,random){
    var normal=mixedSubQuestion(lv,random),label=pick(["正しい","約分が のこっている","くり下がりを わすれている","計算だけ まちがえている"],random);
    if(label!=="くり下がりを わすれている")return fractionDiagnosis(normal,label,label==="正しい"?"1 を借りて 計算し":"計算し",random,null);
    var left=normal.operands[0],right=normal.operands[1],wrongWhole=left.whole-right.whole;
    var shown=toMixed({num:wrongWhole*left.den+right.num-left.num,den:left.den});
    /* 経路の説明で誤りの名前を出さない。「くり下がらず」と書いてしまうと、
       答案を見て確かめる問いが、文面を読むだけの問いになる。答案の作業そのもの
       (途中の式) を見せるのは良く、誤りに名前を付けるのが駄目。 */
    return fractionDiagnosis(normal,label,"計算し",random,shown);
  }

  function multiplyDiagnosis(lv,random){return fractionDiagnosis(multiplyQuestion(lv,random),"正しい","かけてから あとから 約分",random,null);}

  function preFlipDiagnosis(lv,random){
    var normal=fractionQuestion(lv,"divide",[fraction(0,3,4),fraction(0,2,9)],["÷"],"3/4 ÷ 2/9 は いくつですか。",
      waza("わる数を ひっくり返してから 約分","かけ算に 直してから 計算する"));
    return fractionDiagnosis(normal,"ひっくり返す 前に 約分している","3 と 9 を先に約分して 1/4 ÷ 2/3 として計算",random,fraction(0,3,8));
  }

  function divideDiagnosis(lv,random){return fractionDiagnosis(divideQuestion(lv,random),"正しい","ひっくり返してから 約分",random,null);}
  function mixedMulDiagnosis(lv,random){return fractionDiagnosis(mixedMulQuestion(lv,pick(["×","÷"],random),random),"正しい","仮分数に 直してから 約分",random,null);}

  function tripleDiagnosis(lv,random){
    var normal=tripleQuestion(lv,random),label=pick(["正しい","約分が のこっている","通分の しかたが ちがう","計算だけ まちがえている"],random);
    return fractionDiagnosis(normal,label,label==="正しい"?"3つの分母を 通分して 計算し":"計算し",random,null);
  }

  function shuffledOrder(random){
    var order=shuffle([0,1,2,3],random);
    if(order.join(",")==="0,1,2,3")order=[1,0,2,3];
    return order;
  }

  function reductionCheck(raw){
    var reduced=reduce(raw),source=raw.num+"/"+raw.den,target=reduced.num+"/"+reduced.den;
    return gcd(raw.num,raw.den)>1?source+" を 約分して "+target:source+" は これ以上 約分できない";
  }

  function orderingQuestion(lv,pattern,operands,operation,parts,skill,random){
    return {
      cat:"kom_frac_flow",format:"ordering",kind:"order",lv:lv,pattern:pattern,
      operands:copyOperands(operands),operation:operation,
      text:formatFraction(operands[0])+" "+operation+" "+formatFraction(operands[1])+" を 計算します。手順を 正しい順に ならべましょう。",
      scaffold:null,parts:parts,displayOrder:shuffledOrder(random),ans:[0,1,2,3],waza:skill
    };
  }

  function addSubOrdering(lv,random){
    var selected=pick(ADD_SUB_CANDIDATES,random),left=fraction(0,selected[0],selected[1]),right=fraction(0,selected[3],selected[4]);
    var operation=selected[2],common=lcm(left.den,right.den),a=left.num*(common/left.den),b=right.num*(common/right.den),raw={num:operation==="+"?a+b:a-b,den:common};
    var verb=operation==="+"?"たす":"引く";
    return orderingQuestion(lv,"add_sub",[left,right],operation,[
      "分母を "+common+" に そろえる",
      a+"/"+common+" "+operation+" "+b+"/"+common+" に 直す",
      "分子を "+verb+": "+a+" "+operation+" "+b+" = "+raw.num,
      reductionCheck(raw)
    ],waza("通分、計算、約分チェックの 順に進む","最小公倍数で 分母を そろえる"),random);
  }

  function mixedAddOrdering(lv,random){
    var selected=pick(MIXED_ADD_CANDIDATES,random),left=fraction(selected[0],selected[1],selected[2]),right=fraction(selected[3],selected[4],selected[5]);
    var common=lcm(left.den,right.den),a=left.num*(common/left.den),b=right.num*(common/right.den),raw={num:a+b,den:common};
    return orderingQuestion(lv,"mixed_add",[left,right],"+",[
      "整数と 分数に 分ける",
      "整数を たす: "+left.whole+" + "+right.whole+" = "+(left.whole+right.whole),
      "分母を "+common+" に そろえて 分数を たす: "+a+" + "+b+" = "+raw.num,
      reductionCheck(raw)
    ],waza("整数は 整数、分数は 分数で 計算","仮分数に 直しても 同じ答え"),random);
  }

  function mixedSubOrdering(lv,random){
    var selected=pick(MIXED_SUB_CANDIDATES,random),left=fraction(selected[0],selected[1],selected[2]),right=fraction(selected[3],selected[4],selected[5]);
    var borrowedWhole=left.whole-1,borrowedNum=left.den+left.num,raw={num:borrowedNum-right.num,den:left.den};
    return orderingQuestion(lv,"mixed_sub",[left,right],"-",[
      borrowedWhole+" と "+borrowedNum+"/"+left.den+" に 直す",
      "整数を 引く: "+borrowedWhole+" - "+right.whole+" = "+(borrowedWhole-right.whole),
      "分数を 引く: "+borrowedNum+"/"+left.den+" - "+right.num+"/"+right.den+" = "+raw.num+"/"+raw.den,
      reductionCheck(raw)
    ],waza("整数から 1 を借りて 分数に 直す","仮分数に 直して 計算しても 同じ答え"),random);
  }

  function buildLv1(random){
    return shuffle([reducibleQuestion(1,true,random),reducibleQuestion(1,false,random),reducibleQuestion(1,pick([true,false],random),random),reductionQuestion(1,random),reductionQuestion(1,random)],random);
  }

  function buildLv2(random){
    var questions=sample(COMMON_DEN_CANDIDATES,4,random).map(function(candidate){return commonDenQuestion(2,candidate,random);});
    questions.push(commonDenDiagnosis(2,pick(COMMON_DEN_CANDIDATES,random),random));
    return shuffle(questions,random);
  }

  function buildLv3(random){return shuffle([addSubQuestion(3,random),addSubQuestion(3,random),addSubDiagnosis(3,random),addSubOrdering(3,random),addSubOrdering(3,random)],random);}
  function buildLv4(random){return shuffle([mixedAddQuestion(4,random),mixedAddQuestion(4,random),mixedAddDiagnosis(4,random),mixedAddOrdering(4,random),mixedAddOrdering(4,random)],random);}
  function buildLv5(random){return shuffle([mixedSubQuestion(5,random),mixedSubQuestion(5,random),mixedSubDiagnosis(5,random),mixedSubOrdering(5,random),mixedSubOrdering(5,random)],random);}
  function buildLv6(random){return shuffle([multiplyQuestion(6,random),multiplyQuestion(6,random),multiplyQuestion(6,random),multiplyQuestion(6,random),multiplyDiagnosis(6,random)],random);}
  function buildLv7(random){return shuffle([divideQuestion(7,random),divideQuestion(7,random),divideQuestion(7,random),preFlipDiagnosis(7,random),divideDiagnosis(7,random)],random);}

  function buildLv8(random){
    var questions=[mixedMulQuestion(8,"×",random),mixedMulQuestion(8,"×",random),mixedMulQuestion(8,"÷",random),mixedMulQuestion(8,"÷",random),mixedMulDiagnosis(8,random)];
    return shuffle(questions,random);
  }

  function buildLv9(random){return shuffle([tripleQuestion(9,random),multiplyQuestion(9,random),divideQuestion(9,random),tripleDiagnosis(9,random),multiplyDiagnosis(9,random)],random);}

  function normalFromLevel(sourceLv,lv,random){
    if(sourceLv===1)return pick(["reducible","reduce"],random)==="reduce"?reductionQuestion(lv,random):reducibleQuestion(lv,pick([true,false],random),random);
    if(sourceLv===2)return commonDenQuestion(lv,pick(COMMON_DEN_CANDIDATES,random),random);
    if(sourceLv===3)return addSubQuestion(lv,random);
    if(sourceLv===4)return mixedAddQuestion(lv,random);
    if(sourceLv===5)return mixedSubQuestion(lv,random);
    if(sourceLv===6)return multiplyQuestion(lv,random);
    if(sourceLv===7)return divideQuestion(lv,random);
    if(sourceLv===8)return mixedMulQuestion(lv,pick(["×","÷"],random),random);
    return pick(["triple","multiply","divide"],random)==="triple"?tripleQuestion(lv,random):pick(["multiply","divide"],random)==="multiply"?multiplyQuestion(lv,random):divideQuestion(lv,random);
  }

  function diagnosisFromLevel(sourceLv,lv,random){
    if(sourceLv===2)return commonDenDiagnosis(lv,pick(COMMON_DEN_CANDIDATES,random),random);
    if(sourceLv===3)return addSubDiagnosis(lv,random);
    if(sourceLv===4)return mixedAddDiagnosis(lv,random);
    if(sourceLv===5)return mixedSubDiagnosis(lv,random);
    if(sourceLv===6)return multiplyDiagnosis(lv,random);
    if(sourceLv===7)return pick(["before","after"],random)==="before"?preFlipDiagnosis(lv,random):divideDiagnosis(lv,random);
    if(sourceLv===8)return mixedMulDiagnosis(lv,random);
    return tripleDiagnosis(lv,random);
  }

  function orderingFromLevel(sourceLv,lv,random){
    if(sourceLv===3)return addSubOrdering(lv,random);
    if(sourceLv===4)return mixedAddOrdering(lv,random);
    return mixedSubOrdering(lv,random);
  }

  /* 総合でも整列を加減だけに限定し、交換できる途中約分を一本鎖に見せない。 */
  function buildLv10(random){
    var diagnosisLevels=LV10_WEIGHTED.filter(function(value){return value!==1;});
    return shuffle([
      normalFromLevel(pick(LV10_WEIGHTED,random),10,random),
      normalFromLevel(pick(LV10_WEIGHTED,random),10,random),
      diagnosisFromLevel(pick(diagnosisLevels,random),10,random),
      orderingFromLevel(pick([3,4,5],random),10,random),
      orderingFromLevel(pick([3,4,5],random),10,random)
    ],random);
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

  function judge(question,answer){
    if(!isObject(question)||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="choice"){
      if(!Array.isArray(question.choices)||question.choices.length!==4||!isInteger(question.ans)||question.ans<0||question.ans>=question.choices.length)throw new Error("選択問題の指定が正しくありません");
      if(!isInteger(answer))throw new Error("選択問題の回答が正しくありません");
      return answer===question.ans;
    }
    if(question.kind==="order"){
      if(!Array.isArray(question.parts)||!Array.isArray(question.ans)||question.parts.length!==4||question.ans.length!==4)throw new Error("整列問題の指定が正しくありません");
      if(!Array.isArray(answer)||answer.some(function(value){return !isInteger(value);}))throw new Error("整列問題の回答が正しくありません");
      if(answer.length!==question.ans.length)return false;
      return question.ans.every(function(value,index){return answer[index]===value;});
    }
    throw new Error("この問題形式はこの判定を使えません");
  }

  function judgeFraction(question,answer){
    if(!isObject(question)||question.kind!=="frac")throw new Error("分数問題の指定が正しくありません");
    validateMixed(question.ans);
    if(!isObject(answer))throw new Error("分数の答えが正しくありません");
    var normalized={whole:answer.whole===undefined||answer.whole===null||answer.whole===""?0:answer.whole,num:answer.num,den:answer.den};
    validateMixed(normalized);
    var actual=toImproper(normalized),expected=toImproper(question.ans);
    if(!equalPairs(actual,expected))return {correct:false,state:"wrong",note:""};
    if(gcd(normalized.num,normalized.den)!==1)return {correct:false,state:"not_reduced",note:"約分が のこっているよ"};
    return {correct:true,state:"correct",note:""};
  }

  global.Q4B_KOMOREBI_FRAC_FLOW={
    config:FRAC_CONFIG,
    gcd:gcd,lcm:lcm,
    reduce:reduce,toImproper:toImproper,toMixed:toMixed,formatFraction:formatFraction,
    buildSet:buildSet,judge:judge,judgeFraction:judgeFraction
  };
})(window);
