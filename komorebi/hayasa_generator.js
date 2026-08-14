(function(global){
  "use strict";

  var HAYASA_CONFIG={setSize:5};
  var UNITS={
    "時速km":{dimension:"speed",num:5,den:18,label:"時速km"},
    "時速m":{dimension:"speed",num:1,den:3600,label:"時速m"},
    "分速m":{dimension:"speed",num:1,den:60,label:"分速m"},
    "秒速m":{dimension:"speed",num:1,den:1,label:"秒速m"},
    km:{dimension:"distance",num:1000,den:1,label:"km"},
    m:{dimension:"distance",num:1,den:1,label:"m"},
    "時間":{dimension:"time",num:3600,den:1,label:"時間"},
    "分":{dimension:"time",num:60,den:1,label:"分"},
    "秒":{dimension:"time",num:1,den:1,label:"秒"}
  };
  var UNIT_CHOICES={speed:["時速km","時速m","分速m","秒速m"],distance:["km","m"],time:["時間","分","秒"]};
  var DIAGNOSIS_LABELS={
    correct:"正しい",
    correct_alternative:"正しい (べつのとき方)",
    operation_choice:"かけ算とわり算のえらび方がちがう",
    unit_mixed:"単位をそろえていない",
    unit_rate:"時速と分速をとりちがえている",
    sum_diff_reversal:"たすのとひくのが逆",
    length_missing:"相手の長さを入れていない",
    flow_reversal:"流れの向きが逆",
    calc_only:"計算だけまちがえている",
    answer_form:"聞かれたものと別のものを答えている"
  };
  var PHRASINGS={
    meet:["向かい合って進む","反対の向きから近づく","両方から歩き出す"],
    chase:["同じ向きに進む","追いかける","後を追う"],
    pass_cross:["向かい合って走る","反対の向きから近づく"],
    pass_overtake:["同じ向きに走る","追いかける"],
    pass_point:["電柱を通過する","立っている人の前を通り過ぎる"],
    pass_bridge:["鉄橋をわたる","トンネルをぬける","陸橋を通り抜ける"],
    stream_down:["川を下る","流れにそって進む","川下へ向かう"],
    stream_up:["川を上る","流れに逆らって進む","川上へ向かう"]
  };
  var MAX_SAFE_INTEGER=9007199254740991;

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value&&Math.abs(value)<=MAX_SAFE_INTEGER;}
  function validateLv(lv){if(!isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");}
  function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}

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

  function gcd(a,b){
    a=Math.abs(a);b=Math.abs(b);
    while(b!==0){var remainder=a%b;a=b;b=remainder;}
    return a||1;
  }

  function fraction(num,den){
    if(!isInteger(num)||!isInteger(den)||den===0)throw new Error("有理数の指定が正しくありません");
    if(den<0){num=-num;den=-den;}
    var divisor=gcd(num,den);
    return {num:num/divisor,den:den/divisor};
  }

  function decimalFraction(value){
    var text=String(value),parts=text.split("."),den=parts.length===2?Math.pow(10,parts[1].length):1;
    return fraction(Number(parts.join("")),den);
  }

  function multiply(left,right){return fraction(left.num*right.num,left.den*right.den);}
  function equalFractions(left,right){return left.num*right.den===right.num*left.den;}
  function fractionNumber(value){return value.num/value.den;}

  function unit(id){
    if(typeof id!=="string"||!hasOwn(UNITS,id))throw new Error("単位の指定が正しくありません");
    return UNITS[id];
  }

  function unitLabel(id){return unit(id).label;}

  function physicalFraction(value,unitId){
    var parsed=decimalFraction(value),definition=unit(unitId);
    return fraction(parsed.num*definition.num,parsed.den*definition.den);
  }

  function formatNumber(value){
    if(isInteger(value))return String(value);
    return String(Math.round(value*10)/10);
  }

  function speedText(value,unitId){
    if(unitId==="時速km")return "時速 "+formatNumber(value)+"km";
    if(unitId==="時速m")return "時速 "+formatNumber(value)+"m";
    if(unitId==="分速m")return "分速 "+formatNumber(value)+"m";
    if(unitId==="秒速m")return "秒速 "+formatNumber(value)+"m";
    throw new Error("速さの単位が正しくありません");
  }

  function answerUnitChoices(unknown){
    if(unknown==="speed")return UNIT_CHOICES.speed.slice();
    if(unknown==="dist"||unknown==="length")return UNIT_CHOICES.distance.slice();
    if(unknown==="time")return UNIT_CHOICES.time.slice();
    throw new Error("答えの量が正しくありません");
  }

  function wazaFor(section){
    if(section==="identification")return {primary:"聞かれているのは速さ・道のり・時間のどれかを先に確かめる",alternate:"分かっている 2 つの量を探す"};
    if(section==="unit")return {primary:"計算の前に時間と道のりの単位をそろえる",alternate:"秒速・分速・時速は 1 本の家系としてたどる"};
    if(section==="sum_diff")return {primary:"近づくときは速さを合わせ、離れないときは差をとる",alternate:"2 つが 1 分でどれだけ近づくかを出す"};
    if(section==="passing")return {primary:"通過は自分の長さも進む",alternate:"進む道のりは通り過ぎるものと自分の長さの合計"};
    return {primary:"流れの向きと同じなら合わせ、逆なら差をとる",alternate:"静水時の速さは下りと上りの真ん中"};
  }

  function baseQuestion(lv,format,kind,pattern,section,base,display,unknown,text,patternId){
    return {
      cat:"kom_hayasa",format:format,kind:kind,lv:lv,section:section,pattern:pattern,
      base:{d:base.d,t:base.t},given:[],unknown:unknown,display:display,
      context:null,phrasing:null,pairWith:null,carryOver:null,text:text,scaffold:null,
      waza:wazaFor(section),patternId:patternId
    };
  }

  function setNumericAnswer(question,value,unitId){
    question.ans=value;
    question.answerValue=value;
    if(question.lv>=2){
      question.kind="num_unit";
      question.ansUnit=unitId;
      question.unitChoices=answerUnitChoices(question.unknown);
    }
    return question;
  }

  function choiceQuestion(question,options,random){
    if(!Array.isArray(options)||options.length!==4)throw new Error("選択肢を 4 個作れません");
    for(var i=0;i<options.length;i++)for(var j=i+1;j<options.length;j++){
      if(options[i].value&&options[j].value&&equalFractions(options[i].value,options[j].value))throw new Error("同値の選択肢があります");
    }
    var mixed=shuffle(options,random);
    question.choices=mixed.map(function(option){return option.text;});
    question.choiceValues=mixed.map(function(option){return option.value||null;});
    question.choiceErrorTypes=mixed.map(function(option){return option.errorType||null;});
    question.ans=mixed.map(function(option){return !!option.correct;}).indexOf(true);
    if(question.ans<0)throw new Error("正解の選択肢がありません");
    return question;
  }

  function expression(text,num,den,correct,errorType){return {text:text,value:fraction(num,den),correct:!!correct,errorType:errorType||null};}

  function simpleModel(random){
    var speed=pick([50,60,70,80,90],random),times=[3,6,10,12,20,30,50,60].filter(function(value){return value!==speed;});
    var minutes=pick(times,random);
    return {speed:speed,minutes:minutes,distance:speed*minutes,pairData:[speed,minutes]};
  }

  function makeSimple(lv,pattern,format,model,random,patternId){
    var unknown=pattern==="find_speed"?"speed":(pattern==="find_dist"?"dist":"time");
    var text,answer,answerUnit,correct,wrong;
    if(pattern==="find_speed"){
      text=model.distance+"m の道のりを "+model.minutes+" 分で歩きました。速さは 分速 何 m ですか。";
      answer=model.speed;answerUnit="分速m";correct=model.distance+" ÷ "+model.minutes;
      wrong=[expression(model.minutes+" ÷ "+model.distance,model.minutes,model.distance,false,"operation_choice"),expression(model.distance+" × "+model.minutes,model.distance*model.minutes,1,false,"operation_choice"),expression(model.distance+" + "+model.minutes,model.distance+model.minutes,1,false,"calc_only")];
    }else if(pattern==="find_dist"){
      text="分速 "+model.speed+"m で歩く人が "+model.minutes+" 分進みました。道のりは 何 m ですか。";
      answer=model.distance;answerUnit="m";correct=model.speed+" × "+model.minutes;
      wrong=[expression(model.speed+" ÷ "+model.minutes,model.speed,model.minutes,false,"operation_choice"),expression(model.minutes+" ÷ "+model.speed,model.minutes,model.speed,false,"operation_choice"),expression(model.speed+" + "+model.minutes,model.speed+model.minutes,1,false,"calc_only")];
    }else{
      text=model.distance+"m の道のりを 分速 "+model.speed+"m で歩きます。何分かかりますか。";
      answer=model.minutes;answerUnit="分";correct=model.distance+" ÷ "+model.speed;
      wrong=[expression(model.speed+" ÷ "+model.distance,model.speed,model.distance,false,"operation_choice"),expression(model.distance+" × "+model.speed,model.distance*model.speed,1,false,"operation_choice"),expression(model.distance+" - "+model.speed,model.distance-model.speed,1,false,"calc_only")];
    }
    if(format==="formulation")text=text.replace(/。$/,"。式を選びましょう。");
    var question=baseQuestion(lv,format,format==="formulation"?"choice":"num",pattern,"identification",{d:model.distance,t:model.minutes*60},{speed:"分速m",time:"分",dist:"m"},unknown,text,patternId);
    question.given=unknown==="speed"?["dist","time"]:(unknown==="dist"?["speed","time"]:["dist","speed"]);
    question.context="walk";question.pairData=model.pairData.slice();question.model={speed:model.speed,minutes:model.minutes,distanceM:model.distance};question.correctExpression=correct;
    if(pattern==="find_speed"){question.diagnosisWrongExpression=model.distance+" × "+model.minutes;question.diagnosisWrongValue=model.distance*model.minutes;}
    else if(pattern==="find_dist"){question.diagnosisWrongExpression=model.speed+" + "+model.minutes;question.diagnosisWrongValue=model.speed+model.minutes;}
    else{question.diagnosisWrongExpression=model.distance+" × "+model.speed;question.diagnosisWrongValue=model.distance*model.speed;}
    if(format==="formulation"){
      question.answerValue=answer;
      return choiceQuestion(question,[expression(correct,answer,1,true,null)].concat(wrong),random);
    }
    return setNumericAnswer(question,answer,answerUnit);
  }

  function makeRateConvert(lv,format,random,patternId){
    var question=baseQuestion(lv,format,"num","rate_convert","unit",{d:80,t:60},{speed:"時速km",time:null,dist:null},"speed","分速 80m は 時速 何 km ですか。",patternId);
    question.given=["speed"];question.context="walk";question.correctExpression="80 × 60 ÷ 1000";question.diagnosisWrongExpression="80 ÷ 60";question.diagnosisWrongValue=1.3;
    return setNumericAnswer(question,4.8,"時速km");
  }

  function makeRateCompare(lv,random,patternId){
    var question=baseQuestion(lv,"normal","choice","rate_compare","unit",{d:15,t:1},{speed:"秒速m",time:null,dist:null},"choice","秒速 15m で走る電車と、時速 50km で走る自動車。速いのはどちらですか。",patternId);
    question.given=["speed"];question.context="train";question.comparison={left:{d:15,t:1},right:{d:125,t:9}};
    return choiceQuestion(question,[
      {text:"電車",correct:true},{text:"自動車",correct:false},{text:"同じ速さ",correct:false},{text:"このままでは比べられない",correct:false}
    ],random);
  }

  function makeRateApply(lv,index,patternId){
    var question;
    if(index===0){
      question=baseQuestion(lv,"normal","num","rate_apply","unit",{d:150,t:10},{speed:"時速km",time:"秒",dist:"m"},"dist","時速 54km で走る電車は、10 秒で何 m 進みますか。",patternId);
      question.context="train";question.given=["speed","time"];
      return setNumericAnswer(question,150,"m");
    }
    question=baseQuestion(lv,"normal","num","rate_apply","unit",{d:6000,t:1800},{speed:"分速m",time:"分",dist:"km"},"dist","分速 200m で走る自転車は、30 分で何 km 進みますか。",patternId);
    question.context="bicycle";question.given=["speed","time"];
    return setNumericAnswer(question,6,"km");
  }

  function diagnosisTypeList(primary){
    var lists={
      operation_choice:["operation_choice","answer_form","calc_only"],
      unit_rate:["unit_rate","unit_mixed","calc_only"],
      unit_mixed:["unit_mixed","unit_rate","calc_only"],
      sum_diff_reversal:["sum_diff_reversal","operation_choice","answer_form"],
      length_missing:["length_missing","unit_mixed","calc_only"],
      flow_reversal:["flow_reversal","sum_diff_reversal","answer_form"]
    };
    return (lists[primary]||[primary,"calc_only","answer_form"]).slice();
  }

  function makeDiagnosis(source,primaryError,random,patternId){
    var actual=randomValue(random)<0.25?"correct":primaryError;
    var candidates=diagnosisTypeList(primaryError),types=["correct"],i;
    if(actual!=="correct")types.push(actual);
    for(i=0;i<candidates.length&&types.length<4;i++)if(types.indexOf(candidates[i])<0)types.push(candidates[i]);
    for(i=0;types.length<4&&i<Object.keys(DIAGNOSIS_LABELS).length;i++){
      var fallback=Object.keys(DIAGNOSIS_LABELS)[i];
      if(fallback!=="correct_alternative"&&types.indexOf(fallback)<0)types.push(fallback);
    }
    var answerValue=source.answerValue==null?source.ans:source.answerValue;
    var shown=actual==="correct"?answerValue:(source.diagnosisWrongValue==null?(isFinite(answerValue)?answerValue+1:1):source.diagnosisWrongValue);
    var expression=actual==="correct"?(source.correctExpression||"正しい手順"):(source.diagnosisWrongExpression||"まちがった手順");
    var question=baseQuestion(source.lv,"diagnosis","choice",source.pattern,source.section,source.base,source.display,source.unknown,source.text+" 答案のどこを確かめますか。",patternId||source.patternId);
    question.given=source.given.slice();question.context=source.context;question.phrasing=source.phrasing;
    question.pairData=source.pairData?source.pairData.slice():null;question.model=source.model?JSON.parse(JSON.stringify(source.model)):null;
    question.errorType=actual;question.shownAnswer=shown;question.expectedAnswer=answerValue;
    question.diagnosisEvidence={errorType:actual,expected:answerValue,shown:shown};
    question.work=["しき "+expression,"こたえ "+formatNumber(shown)+(source.ansUnit?unitLabel(source.ansUnit):"")];
    return choiceQuestion(question,types.map(function(type){return {text:DIAGNOSIS_LABELS[type],correct:type===actual,errorType:type};}),random);
  }

  function makeMixedNormal(lv,index,patternId){
    var question;
    if(index===0){
      question=baseQuestion(lv,"normal","num","mixed_unit","unit",{d:500,t:25},{speed:"時速km",time:"秒",dist:"m"},"dist","時速 72km で走る電車が 25 秒走りました。道のりは何 m ですか。",patternId);
      question.context="train";question.given=["speed","time"];question.normalization="m_sec";question.correctExpression="72 × 1000 ÷ 3600 × 25";question.diagnosisWrongExpression="72 × 25";question.diagnosisWrongValue=1800;
      return setNumericAnswer(question,500,"m");
    }
    question=baseQuestion(lv,"normal","num","mixed_unit","unit",{d:120000,t:7200},{speed:"時速km",time:"時間",dist:"km"},"dist","時速 60km で走る車が 2 時間走りました。道のりは何 km ですか。",patternId);
    question.context="train";question.given=["speed","time"];question.normalization="km_hour";
    return setNumericAnswer(question,120,"km");
  }

  function shuffledIndexes(count,random){
    var indexes=[],i;
    for(i=0;i<count;i++)indexes.push(i);
    return shuffle(indexes,random);
  }

  function makeOrderingQuestion(lv,sourceKind,random,patternId){
    var canonical,valueCandidates,text,base,display,unknown,answer,answerUnit,pattern,context,carry=null;
    if(sourceKind==="mixed_dist"){
      text="時速 12km で 20 分走ります。道のりは何 km ですか。手順を正しい順にならべましょう。";
      base={d:4000,t:1200};display={speed:"時速km",time:"分",dist:"km"};unknown="dist";answer=4;answerUnit="km";pattern="mixed_unit";context="bicycle";
      canonical=[
        {text:"速さを分速になおす",value:null,requires:[]},
        {text:"12000 ÷ 60 = 分速 200m",value:null,requires:[0]},
        {text:"20 分ぶんに進む道のりを出す",value:null,requires:[1]},
        {text:"答えの道のりを km になおす",value:null,requires:[2]}
      ];
      valueCandidates=[200,200,4000,4];
    }else if(sourceKind==="mixed_time"){
      text="時速 12km で 4km 進みます。何分かかりますか。手順を正しい順にならべましょう。";
      base={d:4000,t:1200};display={speed:"時速km",time:"分",dist:"km"};unknown="time";answer=20;answerUnit="分";pattern="find_time";context="bicycle";
      canonical=[
        {text:"速さと道のりを同じ単位にそろえる",value:null,requires:[]},
        {text:"時速 12km の 1 分ぶんを確かめる",value:null,requires:[0]},
        {text:"道のりを 1 分ぶんの道のりで割る",value:null,requires:[1]},
        {text:"答えが何分かを確かめる",value:null,requires:[2]}
      ];
      valueCandidates=[200,200,20,20];
    }else{
      text="時速 72km で走る電車が、長さ 380m の鉄橋を 25 秒でわたり終わりました。電車の長さは何 m ですか。手順を正しい順にならべましょう。";
      base={d:500,t:25};display={speed:"時速km",time:"秒",dist:"m"};unknown="length";answer=120;answerUnit="m";pattern="train_length";context="train";carry=sourceKind==="train_carry"?"unit_align":null;
      canonical=[
        {text:"速さを秒速になおす",value:null,requires:[]},
        {text:"72000 ÷ 3600 = 秒速 20m",value:null,requires:[0]},
        {text:"25 秒間に進んだ道のりを出す",value:null,requires:[1]},
        {text:"進んだ道のりから鉄橋の長さをひく",value:null,requires:[2]}
      ];
      valueCandidates=[20,20,500,120];
    }
    var valueIndex=Math.floor(randomValue(random)*canonical.length);
    canonical[valueIndex].value=valueCandidates[valueIndex];
    var storageOrder=shuffledIndexes(4,random);
    if(storageOrder.join(",")==="0,1,2,3")storageOrder=[1,0,2,3];
    var canonicalToStored=[],stored=[];
    storageOrder.forEach(function(canonicalIndex,storedIndex){canonicalToStored[canonicalIndex]=storedIndex;});
    storageOrder.forEach(function(canonicalIndex){
      var part=canonical[canonicalIndex];
      stored.push({text:part.text,value:part.value,requires:part.requires.map(function(required){return canonicalToStored[required];})});
    });
    var question=baseQuestion(lv,"ordering","order",pattern,sourceKind.indexOf("train")===0?"passing":"unit",base,display,unknown,text,patternId);
    question.context=context;question.parts=stored;question.ans=[canonicalToStored[0],canonicalToStored[1],canonicalToStored[2],canonicalToStored[3]];
    question.displayOrder=shuffledIndexes(4,random);question.answerValue=answer;question.ansUnit=answerUnit;question.carryOver=carry;
    return question;
  }

  function phrasing(pattern,index){
    var values=PHRASINGS[pattern];
    if(!values)throw new Error("言い回しの型が正しくありません");
    var at=index%values.length;
    return {id:pattern+"_"+(at+1),text:values[at]};
  }

  function humanModel(){return {v1:70,v2:50,distanceM:1200,pairData:[1200,70,50]};}

  function makeHuman(lv,pattern,format,model,operation,carry,random,patternId,phraseIndex){
    var rate=operation==="sum"?model.v1+model.v2:model.v1-model.v2;
    var isRelative=pattern==="rel_speed",minutes=isRelative?1:model.distanceM/rate;
    if(!isInteger(minutes))throw new Error("旅人算の答えが割り切れません");
    var phrase=phrasing(pattern==="rel_speed"?(operation==="sum"?"meet":"chase"):pattern,phraseIndex||0);
    var distanceText=carry==="unit_align"?formatNumber(model.distanceM/1000)+"km":model.distanceM+"m";
    var text,unknown=isRelative?"speed":"time",answer=isRelative?rate:minutes,answerUnit=isRelative?"分速m":"分";
    if(isRelative)text="太郎は分速 "+model.v1+"m、花子は分速 "+model.v2+"m です。2 人が "+phrase.text+"と、1 分間に間は何 m ちぢまりますか。";
    else text=distanceText+" はなれた 2 人が "+phrase.text+"。速さは分速 "+model.v1+"m と分速 "+model.v2+"m です。何分後ですか。";
    if(format==="formulation")text=text.replace(/。$/,"。式を選びましょう。");
    var display={speed:"分速m",time:"分",dist:carry==="unit_align"?"km":"m"};
    var question=baseQuestion(lv,format,format==="formulation"?"choice":"num",pattern,"sum_diff",{d:isRelative?rate:model.distanceM,t:minutes*60},display,unknown,text,patternId);
    question.context="walk";question.phrasing=phrase.id;question.direction=operation;question.carryOver=carry||null;
    question.model={v1:model.v1,v2:model.v2,distanceM:model.distanceM};question.pairData=model.pairData.slice();
    var distanceValue=carry==="unit_align"?model.distanceM/1000:model.distanceM;
    var correctText=isRelative?model.v1+" "+(operation==="sum"?"+":"-")+" "+model.v2:(carry==="unit_align"?formatNumber(distanceValue)+" × 1000 ÷ ("+model.v1+" "+(operation==="sum"?"+":"-")+" "+model.v2+")":model.distanceM+" ÷ ("+model.v1+" "+(operation==="sum"?"+":"-")+" "+model.v2+")");
    question.correctExpression=correctText;
    question.diagnosisWrongExpression=isRelative?model.v1+" "+(operation==="sum"?"-":"+")+" "+model.v2:model.distanceM+" ÷ ("+model.v1+" "+(operation==="sum"?"-":"+")+" "+model.v2+")";
    question.diagnosisWrongValue=isRelative?(operation==="sum"?model.v1-model.v2:model.v1+model.v2):model.distanceM/(operation==="sum"?model.v1-model.v2:model.v1+model.v2);
    if(format==="formulation"){
      var wrongRate=operation==="sum"?model.v1-model.v2:model.v1+model.v2;
      var correctValue=fraction(answer,1),wrongValue=isRelative?fraction(wrongRate,1):fraction(model.distanceM,wrongRate);
      var missingUnitValue=carry==="unit_align"?fraction(Math.round(distanceValue*10),10*rate):fraction(model.v1+model.v2,model.distanceM);
      question.answerValue=answer;
      return choiceQuestion(question,[
        {text:correctText,value:correctValue,correct:true},
        {text:question.diagnosisWrongExpression,value:wrongValue,correct:false,errorType:"sum_diff_reversal"},
        {text:isRelative?model.v1+" × "+model.v2:model.distanceM+" × ("+model.v1+" + "+model.v2+")",value:fraction(isRelative?model.v1*model.v2:model.distanceM*(model.v1+model.v2),1),correct:false,errorType:"operation_choice"},
        {text:carry==="unit_align"?formatNumber(distanceValue)+" ÷ ("+model.v1+" + "+model.v2+")":"("+model.v1+" + "+model.v2+") ÷ "+model.distanceM,value:missingUnitValue,correct:false,errorType:"unit_mixed"}
      ],random);
    }
    return setNumericAnswer(question,answer,answerUnit);
  }

  function trainModel(){return {length:120,target:380,speed:20,total:500,time:25,pairData:[120,380,20]};}

  function makeTrain(lv,pattern,format,model,carry,random,patternId,phraseIndex){
    var unknown,answer,answerUnit,text,phraseKey=pattern;
    if(pattern==="pass_point")phraseKey="pass_point";
    else if(pattern==="pass_bridge"||pattern==="train_length"||pattern==="pass_speed")phraseKey="pass_bridge";
    var phrase=phrasing(phraseKey,phraseIndex||0);
    var shownSpeed=carry==="unit_align"?speedText(model.speed*3.6,"時速km"):speedText(model.speed,"秒速m");
    if(pattern==="pass_point"){
      unknown="time";answer=model.length/model.speed;answerUnit="秒";text="長さ "+model.length+"m の電車が "+shownSpeed+" で走り、"+phrase.text+"のに何秒かかりますか。";
    }else if(pattern==="pass_bridge"){
      unknown="time";answer=model.time;answerUnit="秒";text="長さ "+model.length+"m の電車が "+shownSpeed+" で走り、長さ "+model.target+"m の"+phrase.text+"のに何秒かかりますか。";
    }else if(pattern==="train_length"){
      unknown="length";answer=model.length;answerUnit="m";text=shownSpeed+" で走る電車が、長さ "+model.target+"m の"+phrase.text+"のに "+model.time+" 秒かかりました。電車の長さは何 m ですか。";
    }else{
      unknown="speed";answer=model.speed;answerUnit="秒速m";text="長さ "+model.length+"m の電車が、長さ "+model.target+"m の鉄橋を "+model.time+" 秒でわたります。速さは秒速何 m ですか。";
    }
    if(format==="formulation")text=text.replace(/。$/,"。式を選びましょう。");
    var base={d:pattern==="pass_point"?model.length:model.total,t:pattern==="pass_point"?answer:model.time};
    var display={speed:carry==="unit_align"?"時速km":"秒速m",time:"秒",dist:"m"};
    var question=baseQuestion(lv,format,format==="formulation"?"choice":"num",pattern,"passing",base,display,unknown,text,patternId);
    question.context="train";question.phrasing=phrase.id;question.carryOver=carry||null;question.pairData=model.pairData.slice();
    question.model={trainLength:model.length,targetLength:pattern==="pass_point"?0:model.target,speedMps:model.speed,timeSeconds:base.t};
    question.correctExpression=pattern==="train_length"?model.speed+" × "+model.time+" - "+model.target:(pattern==="pass_speed"?"("+model.length+" + "+model.target+") ÷ "+model.time:"("+model.length+" + "+(pattern==="pass_point"?0:model.target)+") ÷ "+model.speed);
    question.diagnosisWrongExpression=pattern==="train_length"?model.speed+" × "+model.time+" + "+model.target:model.target+" ÷ "+model.speed;
    question.diagnosisWrongValue=pattern==="train_length"?model.speed*model.time+model.target:model.target/model.speed;
    if(format==="formulation"){
      var correct=fraction(answer,1);
      question.answerValue=answer;
      return choiceQuestion(question,[
        {text:question.correctExpression,value:correct,correct:true},
        {text:model.length+" ÷ "+model.speed,value:fraction(model.length,model.speed),correct:false,errorType:"length_missing"},
        {text:"("+model.length+" + "+model.target+") × "+model.speed,value:fraction((model.length+model.target)*model.speed,1),correct:false,errorType:"operation_choice"},
        {text:"("+model.length+" + "+model.target+") ÷ "+(model.speed+5),value:fraction(model.length+model.target,model.speed+5),correct:false,errorType:"calc_only"}
      ],random);
    }
    return setNumericAnswer(question,answer,answerUnit);
  }

  function crossingModel(){return {length1:120,length2:180,v1:20,v2:10,pairData:[120,180,20,10]};}

  function makeCrossing(lv,pattern,format,model,carry,random,patternId,phraseIndex){
    var sumLength=model.length1+model.length2,relative=pattern==="pass_cross"?model.v1+model.v2:model.v1-model.v2;
    var answer=sumLength/relative,phrase=phrasing(pattern,phraseIndex||0);
    var firstSpeed=carry==="unit_align"?speedText(model.v1*3.6,"時速km"):speedText(model.v1,"秒速m");
    var secondSpeed=carry==="unit_align"?speedText(model.v2*3.6,"時速km"):speedText(model.v2,"秒速m");
    var text="長さ "+model.length1+"m の電車 A が "+firstSpeed+"、長さ "+model.length2+"m の電車 B が "+secondSpeed+" で "+phrase.text+"。通り終わるまで何秒かかりますか。";
    if(format==="formulation")text=text.replace(/。$/,"。式を選びましょう。");
    var question=baseQuestion(lv,format,format==="formulation"?"choice":"num",pattern,"passing",{d:sumLength,t:answer},{speed:carry==="unit_align"?"時速km":"秒速m",time:"秒",dist:"m"},"time",text,patternId);
    question.context="train";question.phrasing=phrase.id;question.direction=pattern==="pass_cross"?"sum":"diff";question.carryOver=carry||null;
    question.model={length1:model.length1,length2:model.length2,v1:model.v1,v2:model.v2};question.pairData=model.pairData.slice();
    var sign=pattern==="pass_cross"?"+":"-",wrongSign=pattern==="pass_cross"?"-":"+";
    question.correctExpression="("+model.length1+" + "+model.length2+") ÷ ("+model.v1+" "+sign+" "+model.v2+")";
    question.diagnosisWrongExpression=model.length1+" ÷ ("+model.v1+" "+sign+" "+model.v2+")";
    question.diagnosisWrongValue=model.length1/relative;
    if(format==="formulation"){
      question.answerValue=answer;
      return choiceQuestion(question,[
        {text:question.correctExpression,value:fraction(sumLength,relative),correct:true},
        {text:"("+model.length1+" + "+model.length2+") ÷ ("+model.v1+" "+wrongSign+" "+model.v2+")",value:fraction(sumLength,pattern==="pass_cross"?model.v1-model.v2:model.v1+model.v2),correct:false,errorType:"sum_diff_reversal"},
        {text:model.length1+" ÷ ("+model.v1+" "+sign+" "+model.v2+")",value:fraction(model.length1,relative),correct:false,errorType:"length_missing"},
        {text:"("+model.length1+" + "+model.length2+") × ("+model.v1+" "+sign+" "+model.v2+")",value:fraction(sumLength*relative,1),correct:false,errorType:"operation_choice"}
      ],random);
    }
    return setNumericAnswer(question,answer,"秒");
  }

  function streamModel(){return {still:170,flow:30,down:200,up:140,distanceM:2800,pairData:[2800,170,30]};}

  function makeStream(lv,pattern,format,model,random,patternId,phraseIndex){
    var unknown,answer,answerUnit,text,phrase=null,base;
    if(pattern==="stream_down"||pattern==="stream_up"){
      var rate=pattern==="stream_down"?model.down:model.up;
      answer=model.distanceM/rate;unknown="time";answerUnit="分";phrase=phrasing(pattern,phraseIndex||0);
      text="静水時の速さが分速 "+model.still+"m の船が、流れの速さ分速 "+model.flow+"m の川を "+phrase.text+"。"+model.distanceM+"m 進むのに何分かかりますか。";
      base={d:model.distanceM,t:answer*60};
    }else{
      unknown="speed";answer=pattern==="stream_still"?model.still:model.flow;answerUnit="分速m";
      text="ある船は川を下ると分速 "+model.down+"m、流れに逆らって進むと分速 "+model.up+"m です。"+(pattern==="stream_still"?"静水時":"流れ")+"の速さは分速何 m ですか。";
      base={d:answer,t:60};
    }
    if(format==="formulation")text=text.replace(/。$/,"。式を選びましょう。");
    var question=baseQuestion(lv,format,format==="formulation"?"choice":"num",pattern,"stream",base,{speed:"分速m",time:"分",dist:"m"},unknown,text,patternId);
    question.context="boat";question.phrasing=phrase?phrase.id:null;question.pairData=model.pairData.slice();
    question.model={still:model.still,flow:model.flow,down:model.down,up:model.up,distanceM:model.distanceM};
    if(pattern==="stream_down"||pattern==="stream_up"){
      var sign=pattern==="stream_down"?"+":"-",wrongSign=pattern==="stream_down"?"-":"+";
      question.correctExpression=model.distanceM+" ÷ ("+model.still+" "+sign+" "+model.flow+")";
      question.diagnosisWrongExpression=model.distanceM+" ÷ ("+model.still+" "+wrongSign+" "+model.flow+")";
      question.diagnosisWrongValue=model.distanceM/(pattern==="stream_down"?model.up:model.down);
    }else{
      var reverseSign=pattern==="stream_still"?"+":"-";
      question.correctExpression="("+model.down+" "+reverseSign+" "+model.up+") ÷ 2";
      question.diagnosisWrongExpression=model.down+" "+reverseSign+" "+model.up;
      question.diagnosisWrongValue=pattern==="stream_still"?model.down+model.up:model.down-model.up;
    }
    if(format==="formulation"){
      var wrongA,wrongB;
      if(pattern==="stream_still"||pattern==="stream_flow"){
        wrongA=pattern==="stream_still"?(model.down-model.up)/2:(model.down+model.up)/2;
        wrongB=pattern==="stream_still"?model.down+model.up:model.down-model.up;
      }else{
        wrongA=model.distanceM/(pattern==="stream_down"?model.up:model.down);wrongB=model.distanceM*(pattern==="stream_down"?model.down:model.up);
      }
      question.answerValue=answer;
      return choiceQuestion(question,[
        {text:question.correctExpression,value:fraction(answer,1),correct:true},
        {text:question.diagnosisWrongExpression,value:fraction(wrongB,1),correct:false,errorType:pattern.indexOf("stream_")===0?"flow_reversal":"calc_only"},
        {text:pattern==="stream_still"?"("+model.down+" - "+model.up+") ÷ 2":"("+model.down+" + "+model.up+") ÷ 2",value:fraction(wrongA,1),correct:false,errorType:"sum_diff_reversal"},
        {text:model.down+" ÷ "+model.up,value:fraction(model.down,model.up),correct:false,errorType:"operation_choice"}
      ],random);
    }
    return setNumericAnswer(question,answer,answerUnit);
  }

  function markChain(recognition,normal,id){
    recognition.chainId=id;recognition.chainRole="recognition";recognition.chainPatternId=normal.patternId;
    normal.chainId=id;normal.chainRole="normal";
  }

  function finalizeSet(lv,questions,pairs){
    if(!Array.isArray(questions)||questions.length!==HAYASA_CONFIG.setSize)throw new Error("5問セットを作れません");
    questions.forEach(function(question,index){question.lv=lv;question.id="hayasa_"+lv+"_q"+(index+1);});
    (pairs||[]).forEach(function(pair){
      var first=questions.indexOf(pair[0]),second=questions.indexOf(pair[1]);
      if(first<0||second<0||Math.abs(first-second)!==1)throw new Error("対比ペアを隣接させられません");
      pair[0].pairWith=pair[1].id;pair[1].pairWith=pair[0].id;
    });
    return questions;
  }

  function buildLv1(random){
    var model=simpleModel(random),extra=simpleModel(random);
    var formSpeed=makeSimple(1,"find_speed","formulation",model,random,"find_speed:basic:pair");
    var normalSpeed=makeSimple(1,"find_speed","normal",model,random,"find_speed:basic:pair");
    var formDist=makeSimple(1,"find_dist","formulation",model,random,"find_dist:basic:pair");
    var normalDist=makeSimple(1,"find_dist","normal",model,random,"find_dist:basic:pair");
    var extraNormal=makeSimple(1,randomValue(random)<0.5?"find_speed":"find_dist","normal",extra,random,"basic:extra");
    markChain(formSpeed,normalSpeed,"hayasa_chain_1");markChain(formDist,normalDist,"hayasa_chain_2");
    return finalizeSet(1,[formSpeed,normalSpeed,formDist,normalDist,extraNormal],[[normalSpeed,formDist]]);
  }

  function buildLv2(random){
    var model=simpleModel(random);
    var formTime=makeSimple(2,"find_time","formulation",model,random,"find_time:basic:pair");
    var normalTime=makeSimple(2,"find_time","normal",model,random,"find_time:basic:pair");
    var formSpeed=makeSimple(2,"find_speed","formulation",model,random,"find_speed:basic:pair");
    var normalSpeed=makeSimple(2,"find_speed","normal",model,random,"find_speed:basic:pair");
    var sourceDist=makeSimple(2,"find_dist","normal",model,random,"find_dist:diagnosis");
    var diagnosis=makeDiagnosis(sourceDist,"operation_choice",random,"find_dist:diagnosis");
    markChain(formTime,normalTime,"hayasa_chain_1");markChain(formSpeed,normalSpeed,"hayasa_chain_2");
    return finalizeSet(2,[formTime,normalTime,formSpeed,normalSpeed,diagnosis],[[normalTime,formSpeed]]);
  }

  function buildLv3(random){
    var conversion=makeRateConvert(3,"normal",random,"rate_convert:min_to_hour");
    var diagnosis=makeDiagnosis(conversion,"unit_rate",random,"rate_convert:min_to_hour");
    var chained=makeRateConvert(3,"normal",random,"rate_convert:min_to_hour");
    markChain(diagnosis,chained,"hayasa_chain_1");
    return finalizeSet(3,[diagnosis,chained,makeRateCompare(3,random,"rate_compare:mps_kmh"),makeRateApply(3,0,"rate_apply:second"),makeRateApply(3,1,"rate_apply:minute")],[]);
  }

  function buildLv4(random){
    var first=makeMixedNormal(4,0,"mixed_unit:kmh_min");
    var diagnosis=makeDiagnosis(first,"unit_mixed",random,"mixed_unit:kmh_min");
    var chained=makeMixedNormal(4,0,"mixed_unit:kmh_min");
    var orderDist=makeOrderingQuestion(4,"mixed_dist",random,"mixed_unit:order_dist");
    var orderTime=makeOrderingQuestion(4,"mixed_time",random,"find_time:order_time");
    var second=makeMixedNormal(4,1,"mixed_unit:kmh_hour");
    orderDist.pairData=[4000,1200,12];orderTime.pairData=[4000,1200,12];
    markChain(diagnosis,chained,"hayasa_chain_1");
    return finalizeSet(4,[diagnosis,chained,orderDist,orderTime,second],[[orderDist,orderTime]]);
  }

  function buildLv5(random){
    var model=humanModel();
    var formRelative=makeHuman(5,"rel_speed","formulation",model,"sum",null,random,"rel_speed:sum:chain",0);
    var normalRelative=makeHuman(5,"rel_speed","normal",model,"sum",null,random,"rel_speed:sum:chain",0);
    var normalDiff=makeHuman(5,"rel_speed","normal",model,"diff",null,random,"rel_speed:diff",0);
    var formMeet=makeHuman(5,"meet","formulation",model,"sum","unit_align",random,"meet:unit_align",1);
    var formChase=makeHuman(5,"chase","formulation",model,"diff",null,random,"chase:basic",1);
    markChain(formRelative,normalRelative,"hayasa_chain_1");
    return finalizeSet(5,[formRelative,normalRelative,normalDiff,formMeet,formChase],[]);
  }

  function buildLv6(random){
    var model=humanModel();
    var formMeet=makeHuman(6,"meet","formulation",model,"sum",null,random,"meet:chain",0);
    var normalMeet=makeHuman(6,"meet","normal",model,"sum","unit_align",random,"meet:chain",0);
    var normalChase=makeHuman(6,"chase","normal",model,"diff",null,random,"chase:pair",0);
    var diagnosisMeet=makeDiagnosis(makeHuman(6,"meet","normal",model,"sum",null,random,"meet:diagnosis",1),"sum_diff_reversal",random,"meet:diagnosis");
    var diagnosisChase=makeDiagnosis(makeHuman(6,"chase","normal",model,"diff",null,random,"chase:diagnosis",1),"sum_diff_reversal",random,"chase:diagnosis");
    markChain(formMeet,normalMeet,"hayasa_chain_1");
    return finalizeSet(6,[formMeet,normalMeet,normalChase,diagnosisMeet,diagnosisChase],[[normalMeet,normalChase]]);
  }

  function buildLv7(random){
    var model=trainModel();
    var bridge=makeTrain(7,"pass_bridge","normal",model,null,random,"pass_bridge:chain",0);
    var diagnosis=makeDiagnosis(bridge,"length_missing",random,"pass_bridge:chain");
    var chained=makeTrain(7,"pass_bridge","normal",model,null,random,"pass_bridge:chain",0);
    var reverse=makeTrain(7,"train_length","normal",model,null,random,"train_length:pair",1);
    var orderCarry=makeOrderingQuestion(7,"train_carry",random,"train_length:order_carry");
    var orderPlain=makeOrderingQuestion(7,"train_plain",random,"train_length:order_plain");
    chained.pairData=model.pairData.slice();reverse.pairData=model.pairData.slice();
    markChain(diagnosis,chained,"hayasa_chain_1");
    return finalizeSet(7,[diagnosis,chained,reverse,orderCarry,orderPlain],[[chained,reverse]]);
  }

  function buildLv8(random){
    var model=crossingModel();
    var formCross=makeCrossing(8,"pass_cross","formulation",model,"unit_align",random,"pass_cross:chain",0);
    var normalCross=makeCrossing(8,"pass_cross","normal",model,null,random,"pass_cross:chain",0);
    var normalOvertake=makeCrossing(8,"pass_overtake","normal",model,null,random,"pass_overtake:pair",0);
    var diagnosisCross=makeDiagnosis(makeCrossing(8,"pass_cross","normal",model,null,random,"pass_cross:diagnosis",1),"length_missing",random,"pass_cross:diagnosis");
    var diagnosisOvertake=makeDiagnosis(makeCrossing(8,"pass_overtake","normal",model,null,random,"pass_overtake:diagnosis",1),"sum_diff_reversal",random,"pass_overtake:diagnosis");
    markChain(formCross,normalCross,"hayasa_chain_1");
    return finalizeSet(8,[formCross,normalCross,normalOvertake,diagnosisCross,diagnosisOvertake],[[normalCross,normalOvertake]]);
  }

  function buildLv9(random){
    var stream=streamModel();
    var formStill=makeStream(9,"stream_still","formulation",stream,random,"stream_still:chain",0);
    var normalStill=makeStream(9,"stream_still","normal",stream,random,"stream_still:chain",0);
    var normalDown=makeStream(9,"stream_down","normal",stream,random,"stream_down:forward",0);
    var human={v1:stream.still,v2:stream.flow,distanceM:stream.distanceM,pairData:stream.pairData.slice()};
    var diagnosisHuman=makeDiagnosis(makeHuman(9,"meet","normal",human,"sum","sum_diff_human",random,"meet:carry",0),"sum_diff_reversal",random,"meet:carry");
    diagnosisHuman.carryOver="sum_diff_human";
    var diagnosisUp=makeDiagnosis(makeStream(9,"stream_up","normal",stream,random,"stream_up:forward",0),"flow_reversal",random,"stream_up:forward");
    diagnosisHuman.pairData=stream.pairData.slice();diagnosisUp.pairData=stream.pairData.slice();
    markChain(formStill,normalStill,"hayasa_chain_1");
    return finalizeSet(9,[formStill,normalStill,normalDown,diagnosisHuman,diagnosisUp],[[diagnosisHuman,diagnosisUp]]);
  }

  function buildLv10(random){
    var simple=simpleModel(random),stream=streamModel();
    var form=makeSimple(10,"find_speed","formulation",simple,random,"find_speed:integrated");
    var normal=makeSimple(10,"find_speed","normal",simple,random,"find_speed:integrated");
    var order=makeOrderingQuestion(10,"train_plain",random,"train_length:integrated");
    var human={v1:stream.still,v2:stream.flow,distanceM:stream.distanceM,pairData:stream.pairData.slice()};
    var diagnosisHuman=makeDiagnosis(makeHuman(10,"meet","normal",human,"sum",null,random,"meet:integrated",2),"sum_diff_reversal",random,"meet:integrated");
    var diagnosisStream=makeDiagnosis(makeStream(10,"stream_up","normal",stream,random,"stream_up:integrated",1),"flow_reversal",random,"stream_up:integrated");
    diagnosisHuman.pairData=stream.pairData.slice();diagnosisStream.pairData=stream.pairData.slice();
    markChain(form,normal,"hayasa_chain_1");
    return finalizeSet(10,[form,normal,order,diagnosisHuman,diagnosisStream],[[diagnosisHuman,diagnosisStream]]);
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
      if(!Array.isArray(question.parts)||!Array.isArray(question.ans)||question.parts.length!==question.ans.length)throw new Error("整列問題の指定が正しくありません");
      if(!Array.isArray(answer)||answer.some(function(value){return !isInteger(value);})||answer.length!==question.ans.length)return false;
      return question.ans.every(function(value,index){return answer[index]===value;});
    }
    var numeric=typeof answer==="number"?answer:Number(String(answer).replace(/^\s+|\s+$/g,""));
    return isFinite(numeric)&&Math.abs(numeric-question.ans)<1e-9;
  }

  function judgeNumUnit(question,value,unitId){
    if(!isObject(question)||question.kind!=="num_unit"||typeof question.ansUnit!=="string"||!Array.isArray(question.unitChoices)||question.unitChoices.indexOf(unitId)<0)throw new Error("数値と単位の問題指定が正しくありません");
    var selected=unit(unitId),target=unit(question.ansUnit);
    if(selected.dimension!==target.dimension)throw new Error("答えの単位が正しくありません");
    var inputPhysical=physicalFraction(value,unitId),expectedPhysical=physicalFraction(question.ans,question.ansUnit);
    if(unitId===question.ansUnit&&equalFractions(inputPhysical,expectedPhysical))return {correct:true,state:"correct",note:""};
    if(equalFractions(inputPhysical,expectedPhysical))return {correct:false,state:"other_unit",note:"たしかに "+formatNumber(Number(value))+unitLabel(unitId)+" は同じ量だけど、きかれているのは "+unitLabel(question.ansUnit)};
    return {correct:false,state:"wrong",note:""};
  }

  global.Q4B_KOMOREBI_HAYASA={
    config:HAYASA_CONFIG,
    units:UNITS,
    unitChoices:UNIT_CHOICES,
    diagnosisLabels:DIAGNOSIS_LABELS,
    phrasings:PHRASINGS,
    unitLabel:unitLabel,
    buildSet:buildSet,
    judge:judge,
    judgeNumUnit:judgeNumUnit
  };
})(window);
