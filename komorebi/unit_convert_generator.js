(function(global){
  "use strict";

  var UNIT_CONFIG={setSize:5};
  var UNITS={
    mm2:{dimension:"area",exp:-6,label:"mm²"},
    cm2:{dimension:"area",exp:-4,label:"cm²"},
    m2:{dimension:"area",exp:0,label:"m²"},
    a:{dimension:"area",exp:2,label:"a"},
    ha:{dimension:"area",exp:4,label:"ha"},
    km2:{dimension:"area",exp:6,label:"km²"},
    mm3:{dimension:"volume",exp:-9,label:"mm³"},
    cm3:{dimension:"volume",exp:-6,label:"cm³"},
    mL:{dimension:"volume",exp:-6,label:"mL"},
    L:{dimension:"volume",exp:-3,label:"L"},
    m3:{dimension:"volume",exp:0,label:"m³"}
  };
  var AREA_STEPS=[["cm2","m2"],["m2","a"],["a","ha"],["ha","km2"]];
  var AREA_DOUBLE_STEPS=[["m2","ha"],["a","km2"]];
  var AREA_CHOICE_UNITS=["cm2","m2","a","ha","km2"];
  var VOLUME_CHOICE_UNITS=["cm3","mL","L","m3"];
  var DIAGNOSIS_LABELS=["正しい","10倍のかいだんの数がちがう","単位がちがう","計算だけまちがえている","上りと下りが逆"];
  var LV10_WEIGHTED=["one_step","one_step","two_step","bridge_path","inverse","inverse","align"];
  var MAX_SAFE_INTEGER=9007199254740991;

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value&&Math.abs(value)<=MAX_SAFE_INTEGER;}
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
    if(!Array.isArray(values)||!isInteger(count)||count<0||count>values.length)throw new Error("生成候補の数が足りません");
    return shuffle(values,random).slice(0,count);
  }

  function unit(id){
    if(typeof id!=="string"||!Object.prototype.hasOwnProperty.call(UNITS,id))throw new Error("単位の指定が正しくありません");
    return UNITS[id];
  }

  function unitLabel(id){return unit(id).label;}

  function validateQuantity(quantity){
    if(!isObject(quantity)||!isInteger(quantity.mantissa)||!isInteger(quantity.exp))throw new Error("量の指定が正しくありません");
    return quantity;
  }

  /* 小数へ変換してから丸めると換算誤差を持ち込むため、桁の位置だけで表示を組み立てる。 */
  function formatQuantity(quantity){
    validateQuantity(quantity);
    if(quantity.mantissa===0)return "0";
    var sign=quantity.mantissa<0?"-":"",digits=String(Math.abs(quantity.mantissa)),point=digits.length+quantity.exp,text;
    if(quantity.exp>=0)return sign+digits+new Array(quantity.exp+1).join("0");
    if(point<=0)text="0."+new Array(1-point).join("0")+digits;
    else text=digits.slice(0,point)+"."+digits.slice(point);
    text=text.replace(/0+$/g,"").replace(/\.$/g,"");
    return sign+text;
  }

  /* 単位の倍率はすべて 10 の累乗なので、仮数には触れず指数差だけを移す。 */
  function convert(quantity,fromId,toId){
    validateQuantity(quantity);
    var fromUnit=unit(fromId),toUnit=unit(toId);
    if(fromUnit.dimension!==toUnit.dimension)throw new Error("異なる種類の単位は換算できません");
    return {mantissa:quantity.mantissa,exp:quantity.exp+fromUnit.exp-toUnit.exp};
  }

  function normalized(quantity){
    validateQuantity(quantity);
    var mantissa=quantity.mantissa,exp=quantity.exp;
    if(mantissa===0)return {mantissa:0,exp:0};
    while(mantissa%10===0){mantissa/=10;exp++;}
    return {mantissa:mantissa,exp:exp};
  }

  function equalQuantities(left,right){
    var a=normalized(left),b=normalized(right);
    return a.mantissa===b.mantissa&&a.exp===b.exp;
  }

  function powerOfTen(exp){
    if(!isInteger(exp)||exp<0)throw new Error("指数の指定が正しくありません");
    var value=1;
    for(var i=0;i<exp;i++){
      value*=10;
      if(!isInteger(value))throw new Error("量が大きすぎます");
    }
    return value;
  }

  /* 加減も小さい方の指数へ整数仮数をそろえ、小数の演算を避ける。 */
  function combineQuantities(left,right,operation){
    validateQuantity(left);validateQuantity(right);
    if(operation!=="add"&&operation!=="subtract")throw new Error("計算の指定が正しくありません");
    var exp=Math.min(left.exp,right.exp);
    var leftMantissa=left.mantissa*powerOfTen(left.exp-exp);
    var rightMantissa=right.mantissa*powerOfTen(right.exp-exp);
    var mantissa=operation==="add"?leftMantissa+rightMantissa:leftMantissa-rightMantissa;
    if(!isInteger(leftMantissa)||!isInteger(rightMantissa)||!isInteger(mantissa))throw new Error("計算結果が大きすぎます");
    return {mantissa:mantissa,exp:exp};
  }

  function quantityNumber(quantity){
    var value=Number(formatQuantity(quantity));
    if(!isFinite(value))throw new Error("量を数値で表せません");
    return value;
  }

  /* 回答値も十進表記から仮数と指数へ戻し、判定時の掛け算を整数に限定する。 */
  function quantityFromValue(value){
    if((typeof value!=="number"&&typeof value!=="string")||(typeof value==="number"&&!isFinite(value)))throw new Error("答えの値が正しくありません");
    var text=String(value).replace(/^\s+|\s+$/g,"");
    var match=/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(text);
    if(!match)throw new Error("答えの値が正しくありません");
    var whole=match[2]||"0",fraction=match[3]!==undefined?match[3]:(match[4]||"");
    var digits=(whole+fraction).replace(/^0+(?=\d)/g,"");
    var mantissa=Number(digits),exp=-(fraction.length)+(match[5]===undefined?0:Number(match[5]));
    if(match[1]==="-")mantissa=-mantissa;
    if(!isInteger(mantissa)||!isInteger(exp))throw new Error("答えの値が正しくありません");
    return {mantissa:mantissa,exp:exp};
  }

  function sourceQuantity(mantissa,exp,unitId){
    validateQuantity({mantissa:mantissa,exp:exp});unit(unitId);
    return {mantissa:mantissa,exp:exp,unit:unitId};
  }

  function copyQuantity(quantity){return sourceQuantity(quantity.mantissa,quantity.exp,quantity.unit);}

  function unitChoices(toId){
    var target=unit(toId),ladder=target.dimension==="area"?AREA_CHOICE_UNITS:VOLUME_CHOICE_UNITS,index=ladder.indexOf(toId),start;
    if(index<0)throw new Error("単位選択肢を作れません");
    start=Math.min(Math.max(index-1,0),ladder.length-4);
    return ladder.slice(start,start+4);
  }

  function wazaFor(pattern,dimension,fromId,toId){
    if(pattern==="relation"&&dimension==="area")return {primary:"面積の かいだんは ×100",alternate:unitLabel(fromId)+" から "+unitLabel(toId)+" の 関係を 思い出す"};
    if(pattern==="relation")return {primary:"体積とかさの 関係を 思い出す",alternate:unitLabel(fromId)+" から "+unitLabel(toId)+" の 関係を たしかめる"};
    if(pattern==="principle")return {primary:"長さの 倍率を 面積は 2 回、体積は 3 回 かける",alternate:"指数の 数だけ 10 を かける"};
    if(pattern==="two_step")return {primary:"かいだんを 2 つ わたるから ×100 を 2 回",alternate:"一段ずつ 単位を たどる"};
    if(pattern==="bridge_path")return {primary:"m³ から L、L から mL の 順に たどる",alternate:"×1000 を 2 回 かける"};
    if(pattern==="inverse")return {primary:"小さい単位から 大きい単位へ 上るときは 割る",alternate:"指数の 差だけ 小数点を 左へ 動かす"};
    if(pattern==="align")return {primary:"答えの単位に そろえてから 計算する",alternate:"小さい単位へ そろえると 整数で 計算しやすい"};
    return {primary:dimension==="area"?"面積の かいだんを 一段ずつ たどる":"体積とかさの かいだんを 一段ずつ たどる",alternate:unitLabel(fromId)+" から "+unitLabel(toId)+" の 向きを たしかめる"};
  }

  function makeConversion(lv,pattern,fromId,toId,quantity,kind,scaffold){
    var fromUnit=unit(fromId),toUnit=unit(toId),answer;
    if(fromUnit.dimension!==toUnit.dimension)throw new Error("異なる種類の単位は問題にできません");
    answer=convert(quantity,fromId,toId);
    var question={
      cat:"kom_unit_convert",format:"normal",kind:kind,lv:lv,dimension:fromUnit.dimension,pattern:pattern,
      from:sourceQuantity(quantity.mantissa,quantity.exp,fromId),to:toId,
      text:formatQuantity(quantity)+unitLabel(fromId)+" は 何 "+unitLabel(toId)+" ですか。",
      scaffold:scaffold||null,ans:quantityNumber(answer),waza:wazaFor(pattern,fromUnit.dimension,fromId,toId)
    };
    if(kind==="num_unit"){
      question.ansUnit=toId;
      /* 二段問題は ×100 の階段だけを使うため、選択肢にも cm² を混ぜない。 */
      question.unitChoices=pattern==="two_step"?["m2","a","ha","km2"]:unitChoices(toId);
    }
    return question;
  }

  /* 長さの関係は足場としてだけ出す。本文にも入れると画面に 2 回並ぶ
     (足場は共通シェルが問題文の上に描くため)。 */
  function makePrinciple(lv,fromId,toId,lengthText){
    return makeConversion(lv,"principle",fromId,toId,{mantissa:1,exp:0},"num",lengthText);
  }

  function expectedQuantity(question){
    if(!isObject(question)||!isObject(question.from)||typeof question.from.unit!=="string"||typeof question.to!=="string")throw new Error("問題の指定が正しくありません");
    var first=convert(question.from,question.from.unit,question.to);
    if(question.pattern!=="align")return first;
    if(!isObject(question.other)||typeof question.other.unit!=="string")throw new Error("そろえ計算の問題が正しくありません");
    return combineQuantities(first,convert(question.other,question.other.unit,question.to),question.operation);
  }

  function makeAlign(lv,first,operation,other,toId){
    var target=unit(toId);
    if(unit(first.unit).dimension!==target.dimension||unit(other.unit).dimension!==target.dimension)throw new Error("そろえる単位が正しくありません");
    var question={
      cat:"kom_unit_convert",format:"normal",kind:"num_unit",lv:lv,dimension:target.dimension,pattern:"align",
      from:copyQuantity(first),other:copyQuantity(other),operation:operation,to:toId,
      text:formatQuantity(first)+unitLabel(first.unit)+(operation==="add"?" + ":" − ")+formatQuantity(other)+unitLabel(other.unit)+" は 何 "+unitLabel(toId)+" ですか。",
      scaffold:null,ansUnit:toId,unitChoices:unitChoices(toId),waza:wazaFor("align",target.dimension,first.unit,toId)
    };
    question.ans=quantityNumber(expectedQuantity(question));
    return question;
  }

  function physicalQuantity(quantity,unitId){
    validateQuantity(quantity);
    return {mantissa:quantity.mantissa,exp:quantity.exp+unit(unitId).exp};
  }

  function diagnosisShown(question,label){
    var correct=expectedQuantity(question),shown,delta;
    if(label==="正しい")shown={mantissa:correct.mantissa,exp:correct.exp,unit:question.to};
    else if(label==="10倍のかいだんの数がちがう"){
      delta=question.dimension==="area"?2:3;
      shown={mantissa:correct.mantissa,exp:correct.exp+delta,unit:question.to};
    }else if(label==="単位がちがう")shown={mantissa:correct.mantissa,exp:correct.exp,unit:question.from.unit};
    else if(label==="計算だけまちがえている")shown={mantissa:correct.mantissa+(correct.mantissa>=0?1:-1),exp:correct.exp,unit:question.to};
    else{
      delta=unit(question.from.unit).exp-unit(question.to).exp;
      shown={mantissa:question.from.mantissa,exp:question.from.exp-delta,unit:question.to};
    }
    if(label!=="正しい"&&equalQuantities(physicalQuantity(shown,shown.unit),physicalQuantity(correct,question.to)))throw new Error("診断の誤答案を正解と区別できません");
    return shown;
  }

  function diagnosisChoices(label,question,random){
    var allowed=diagnosisLabels(question),selected=["正しい"];
    if(label!=="正しい")selected.push(label);
    var remaining=allowed.filter(function(value){return selected.indexOf(value)<0;});
    selected=selected.concat(sample(remaining,4-selected.length,random));
    return shuffle(selected,random);
  }

  /* 「上りと下りが逆」は換算 1 回が問題そのものである形式でしか使えない。
     揃え計算に当てると、向きを逆にした値には引き算が反映されず、誤りが 2 つ
     ある答案になってしまう (そのうえ生の引き算は負の数になる)。 */
  function diagnosisLabels(question){
    var allowed=DIAGNOSIS_LABELS.slice(0,question.lv>=8?5:4);
    if(question.pattern!=="align")return allowed;
    return allowed.filter(function(label){return label!=="上りと下りが逆";});
  }

  function makeDiagnosis(normal,random){
    var allowed=diagnosisLabels(normal),label=pick(allowed,random),shown=diagnosisShown(normal,label);
    var question={
      cat:"kom_unit_convert",format:"diagnosis",kind:"choice",lv:normal.lv,dimension:normal.dimension,pattern:normal.pattern,
      from:copyQuantity(normal.from),to:normal.to,scaffold:null,waza:normal.waza,shown:shown
    };
    if(normal.pattern==="align"){
      question.other=copyQuantity(normal.other);
      question.operation=normal.operation;
    }
    question.text=normal.text+" "+formatQuantity(shown)+unitLabel(shown.unit)+" と 答えました。どこを たしかめますか。";
    question.choices=diagnosisChoices(label,normal,random);
    question.ans=question.choices.indexOf(label);
    return question;
  }

  function shuffledOrder(random){
    var order=shuffle([0,1,2,3],random);
    if(order[0]===0&&order[1]===1&&order[2]===2&&order[3]===3)order=[1,0,2,3];
    return order;
  }

  function makeOrdering(lv,random){
    var from=sourceQuantity(pick([1,2,3,4,5,6,7,8,9],random),-1,"m3");
    var liters=convert(from,"m3","L"),milliliters=convert(from,"m3","mL");
    var sourceText=formatQuantity(from),literText=formatQuantity(liters),milliliterText=formatQuantity(milliliters);
    return {
      cat:"kom_unit_convert",format:"ordering",kind:"order",lv:lv,dimension:"volume",pattern:"bridge_path",
      from:from,to:"mL",text:sourceText+"m³ は 何 mL ですか。手順を 正しい順に ならべましょう。",scaffold:null,
      parts:["m³ から L は ×1000",sourceText+"×1000 = "+literText+"L","L から mL は ×1000",literText+"×1000 = "+milliliterText+"mL"],
      displayOrder:shuffledOrder(random),ans:[0,1,2,3],waza:wazaFor("bridge_path","volume","m3","mL")
    };
  }

  function relationQuestions(lv,relations,extraCount,random,scaffolds){
    var selected=relations.slice().concat(sample(relations,extraCount,random));
    return shuffle(selected,random).map(function(relation){
      var scaffold=scaffolds?relation[2]:null;
      return makeConversion(lv,lv===3?"principle":"relation",relation[0],relation[1],{mantissa:1,exp:0},"num",scaffold);
    });
  }

  function buildLv1(random){
    return relationQuestions(1,[["a","m2"],["ha","a"],["km2","ha"]],2,random,null);
  }

  function buildLv2(random){
    return relationQuestions(2,[["L","mL"],["m3","L"],["mL","cm3"]],2,random,null);
  }

  function buildLv3(random){
    var principles=[
      makePrinciple(3,"cm2","mm2","1cm = 10mm です。"),
      makePrinciple(3,"m2","cm2","1m = 100cm です。"),
      makePrinciple(3,"m3","cm3","1m = 100cm です。"),
      makePrinciple(3,"cm3","mm3","1cm = 10mm です。")
    ];
    var duplicate=pick([["cm2","mm2","1cm = 10mm です。"],["m2","cm2","1m = 100cm です。"],["m3","cm3","1m = 100cm です。"],["cm3","mm3","1cm = 10mm です。"]],random);
    principles.push(makePrinciple(3,duplicate[0],duplicate[1],duplicate[2]));
    return shuffle(principles,random);
  }

  function upwardIntegerQuantity(smallId,bigId,random){
    return {mantissa:pick([1,2,3,4,5,6,7,8,9],random),exp:unit(bigId).exp-unit(smallId).exp};
  }

  function stepConversion(lv,pair,direction,pattern,random){
    var smallId=pair[0],bigId=pair[1],fromId=direction==="up"?smallId:bigId,toId=direction==="up"?bigId:smallId;
    var quantity=direction==="up"?upwardIntegerQuantity(smallId,bigId,random):{mantissa:pick([1,2,3,4,5,6,7,8,9],random),exp:0};
    return makeConversion(lv,pattern,fromId,toId,quantity,"num_unit",null);
  }

  function buildLv4(random){
    var pairs=shuffle(AREA_STEPS,random),directions=shuffle(["up","up","down","down"],random),questions=[];
    pairs.forEach(function(pair,index){questions.push(stepConversion(4,pair,directions[index],"one_step",random));});
    questions.push(makeDiagnosis(stepConversion(4,pick(AREA_STEPS,random),pick(["up","down"],random),"one_step",random),random));
    return shuffle(questions,random);
  }

  function buildLv5(random){
    var questions=[];
    AREA_DOUBLE_STEPS.forEach(function(pair){
      questions.push(stepConversion(5,pair,"up","two_step",random));
      questions.push(stepConversion(5,pair,"down","two_step",random));
    });
    questions.push(makeDiagnosis(stepConversion(5,pick(AREA_DOUBLE_STEPS,random),pick(["up","down"],random),"two_step",random),random));
    return shuffle(questions,random);
  }

  function buildLv6(random){
    var questions=[makeConversion(6,"one_step","mL","cm3",{mantissa:25,exp:1},"num_unit",null)];
    questions.push(stepConversion(6,["mL","L"],"down","one_step",random));
    questions.push(stepConversion(6,["cm3","L"],"up","one_step",random));
    questions.push(stepConversion(6,["L","m3"],"down","one_step",random));
    questions.push(makeDiagnosis(stepConversion(6,pick([["mL","L"],["cm3","L"],["L","m3"]],random),pick(["up","down"],random),"one_step",random),random));
    return shuffle(questions,random);
  }

  function bridgeConversion(lv,random){
    return makeConversion(lv,"bridge_path","m3","mL",{mantissa:pick([1,2,3,4,5,6,7,8,9],random),exp:-1},"num_unit",null);
  }

  function buildLv7(random){
    var questions=[bridgeConversion(7,random),bridgeConversion(7,random)];
    questions.push(makeDiagnosis(bridgeConversion(7,random),random));
    questions.push(makeOrdering(7,random));
    questions.push(makeOrdering(7,random));
    return shuffle(questions,random);
  }

  function inverseConversion(lv,random){
    var pair=pick(AREA_STEPS,random),difference=unit(pair[1]).exp-unit(pair[0]).exp;
    return makeConversion(lv,"inverse",pair[0],pair[1],{mantissa:pick([25,45,75],random),exp:difference-2},"num_unit",null);
  }

  function buildLv8(random){
    var pairs=sample(AREA_STEPS,2,random),questions=[];
    pairs.forEach(function(pair){
      var difference=unit(pair[1]).exp-unit(pair[0]).exp;
      questions.push(makeConversion(8,"inverse",pair[0],pair[1],{mantissa:pick([25,45,75],random),exp:difference-2},"num_unit",null));
    });
    var downPair=pick(AREA_STEPS,random);
    questions.push(makeConversion(8,"inverse",downPair[1],downPair[0],{mantissa:8,exp:-1},"num_unit",null));
    questions.push(makeDiagnosis(inverseConversion(8,random),random));
    questions.push(makeDiagnosis(inverseConversion(8,random),random));
    return shuffle(questions,random);
  }

  function alignQuestion(lv,index,random){
    if(index%3===0)return makeAlign(lv,sourceQuantity(pick([11,12,13,14,15,16,17,18,19],random),-1,"m2"),"subtract",sourceQuantity(pick([1,2,3,4,5,6,7,8,9],random),2,"cm2"),"cm2");
    if(index%3===1)return makeAlign(lv,sourceQuantity(pick([1,2,3,4,5],random),0,"ha"),"add",sourceQuantity(pick([1,2,3,4,5],random),2,"a"),"a");
    return makeAlign(lv,sourceQuantity(pick([1,2,3,4,5],random),0,"km2"),"subtract",sourceQuantity(pick([1,2,3,4,5,6,7,8,9],random),1,"ha"),"ha");
  }

  function buildLv9(random){
    var questions=[alignQuestion(9,0,random),alignQuestion(9,1,random),alignQuestion(9,2,random)];
    questions.push(makeDiagnosis(alignQuestion(9,pick([0,1,2],random),random),random));
    questions.push(makeDiagnosis(alignQuestion(9,pick([0,1,2],random),random),random));
    return shuffle(questions,random);
  }

  function randomOneStep(lv,random){
    if(randomValue(random)<0.5)return stepConversion(lv,pick(AREA_STEPS,random),pick(["up","down"],random),"one_step",random);
    return stepConversion(lv,pick([["mL","L"],["cm3","L"],["L","m3"]],random),pick(["up","down"],random),"one_step",random);
  }

  function lv10Normal(pattern,random){
    if(pattern==="one_step")return randomOneStep(10,random);
    if(pattern==="two_step")return stepConversion(10,pick(AREA_DOUBLE_STEPS,random),pick(["up","down"],random),"two_step",random);
    if(pattern==="bridge_path")return bridgeConversion(10,random);
    if(pattern==="inverse")return inverseConversion(10,random);
    return alignQuestion(10,pick([0,1,2],random),random);
  }

  function buildLv10(random){
    var questions=[],first=pick(LV10_WEIGHTED,random),second=pick(LV10_WEIGHTED,random),diagnosisPattern=pick(LV10_WEIGHTED,random);
    questions.push(lv10Normal(first,random));
    questions.push(lv10Normal(second,random));
    questions.push(makeDiagnosis(lv10Normal(diagnosisPattern,random),random));
    questions.push(makeOrdering(10,random));
    questions.push(makeOrdering(10,random));
    return shuffle(questions,random);
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
      if(!Array.isArray(question.choices)||!isInteger(question.ans)||question.ans<0||question.ans>=question.choices.length)throw new Error("選択問題の指定が正しくありません");
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

  /* 同じ次元で指数も同じ単位は同じ大きさで、mL と cm³ がそれに当たる
     (curriculum 3 章。橋の実体は「指数が同じ」という 1 事実である)。
     単位の一致を id で見ると、Lv2 と Lv6 で 1mL = 1cm³ を渡した直後に、
     250mL を 250cm³ と答えた子をその等式ごと誤答にしてしまう。 */
  function sameSizeUnit(leftId,rightId){
    var left=unit(leftId),right=unit(rightId);
    return left.dimension===right.dimension&&left.exp===right.exp;
  }

  function judgeNumUnit(question,value,unitId){
    if(!isObject(question)||question.kind!=="num_unit"||question.ansUnit!==question.to)throw new Error("数値と単位の問題指定が正しくありません");
    var selectedUnit=unit(unitId),targetUnit=unit(question.to);
    if(selectedUnit.dimension!==targetUnit.dimension)throw new Error("答えの単位が正しくありません");
    var input=quantityFromValue(value),expected=expectedQuantity(question);
    if(sameSizeUnit(unitId,question.to)&&equalQuantities(input,expected))return {correct:true,state:"correct",note:""};
    if(equalQuantities(physicalQuantity(input,unitId),physicalQuantity(expected,question.to))){
      /* 同じ量を別の単位で言い切った答え。正解の単位を 2 回並べると
         「…は km² と同じ量だけど、きかれているのは km²」になって意味を成さない。 */
      return {correct:false,state:"other_unit",note:"たしかに "+formatQuantity(input)+unitLabel(unitId)+" だけど、きかれているのは "+unitLabel(question.to)};
    }
    return {correct:false,state:"wrong",note:""};
  }

  global.Q4B_KOMOREBI_UNIT_CONVERT={
    config:UNIT_CONFIG,
    units:UNITS,
    unitLabel:unitLabel,
    formatQuantity:formatQuantity,
    convert:convert,
    buildSet:buildSet,
    judge:judge,
    judgeNumUnit:judgeNumUnit
  };
})(window);
