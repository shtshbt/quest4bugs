(function(global){
  "use strict";

  /* Usage:
     Q4B_KOMOREBI_RATIO_GENERATOR.generateForLv(3,"formulation",Math.random); */

  var PATTERN_NAMES=["convert","find_rate","find_compare","find_base","discount","two_step","ratio_share","soutou","baibai"];
  var LV_NORMAL={
    1:["convert"],
    2:["convert","find_rate"],
    3:["find_compare"],
    4:["find_base"],
    5:["discount"],
    6:["two_step"],
    7:["ratio_share"],
    8:["soutou"],
    9:["baibai"],
    10:PATTERN_NAMES.slice()
  };
  var LV_FORMULATION={
    1:[],2:["find_rate"],3:["find_compare"],4:["find_base"],5:["discount"],
    6:[],7:[],8:["soutou"],9:["baibai"],
    10:["find_rate","find_compare","find_base","discount","soutou","baibai"]
  };

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function nearlyEqual(a,b){return Math.abs(a-b)<1e-9;}
  function randomValue(random){
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var value=random();
    if(!Number.isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }
  function pick(values,random){
    if(!Array.isArray(values)||!values.length)throw new Error("生成候補がありません");
    return values[Math.floor(randomValue(random)*values.length)];
  }
  function decimalText(percent){return String(percent/100);}
  function factorText(percent,direction){return String((100+(direction==="up"?percent:-percent))/100);}
  function generationError(message){var error=new Error(message);error.retryGeneration=true;return error;}

  function createModel(pattern,lv,subtype,values){
    values.pattern=pattern;
    values.lv=lv;
    values.subtype=subtype;
    values.patternId=pattern+":"+subtype;
    values.givenMoney=values.givenMoney||[];
    values.computedMoney=values.computedMoney||[];
    values.integerQuantities=values.integerQuantities||[];
    values.ratePercents=values.ratePercents||[];
    values.divisions=values.divisions||[];
    return values;
  }

  function contextBases(context){
    if(context==="class_members")return [20,30,40,50,60];
    if(context==="shopping")return [600,800,1000,1200,1600,2000,2400];
    if(context==="book_pages")return [80,100,120,160,200,240];
    if(context==="stickers_cards")return [40,50,60,80,100,120,160];
    return [400,500,600,800,1000,1200];
  }

  function compatibleBase(context,percent,random,moneyCompare){
    var candidates=contextBases(context).filter(function(base){
      var compare=base*percent/100;
      return Number.isInteger(compare)&&(!moneyCompare||compare%10===0);
    });
    return pick(candidates,random);
  }

  function amountArrays(context,base,compare,baseGiven,compareGiven){
    if(context==="shopping")return {
      givenMoney:(baseGiven?[base]:[]).concat(compareGiven?[compare]:[]),
      computedMoney:(baseGiven?[]:[base]).concat(compareGiven?[]:[compare]),
      integerQuantities:[]
    };
    return {givenMoney:[],computedMoney:[],integerQuantities:[base,compare]};
  }

  function buildConvert(lv,random){
    var modes=lv===2||lv===10?["wari_to_percent"]:["decimal_to_percent","percent_to_decimal","fraction_to_percent","fraction_to_decimal","wari_to_percent"];
    var mode=pick(modes,random),values={context:"number_form",unknown:"converted_form"};
    if(mode==="decimal_to_percent"||mode==="percent_to_decimal"){
      values.percent=pick([7,15,25,35,40,60,75,80],random);
      values.sourceValue=mode==="decimal_to_percent"?values.percent/100:values.percent;
      values.answerValue=mode==="decimal_to_percent"?values.percent:values.percent/100;
      values.ratePercents=[values.percent];
    }else if(mode==="wari_to_percent"){
      values.percent=pick([15,25,35,45,65,75],random);
      values.sourceValue=values.percent;
      values.answerValue=values.percent;
      values.ratePercents=[values.percent];
    }else{
      var fraction=pick([[1,2],[1,4],[3,4],[1,5],[2,5],[1,10],[7,10]],random);
      values.numerator=fraction[0];values.denominator=fraction[1];
      values.sourceValue=values.numerator/values.denominator;
      values.answerValue=mode==="fraction_to_percent"?values.sourceValue*100:values.sourceValue;
      values.ratePercents=mode==="fraction_to_percent"?[values.answerValue]:[];
    }
    return createModel("convert",lv,mode,values);
  }

  function buildFindRate(lv,random){
    var context=pick(["class_members","shopping","book_pages","stickers_cards","water_volume"],random);
    var percent=pick([10,15,20,25,30,40,50,60,70,75,80,90],random);
    var base=compatibleBase(context,percent,random,context==="shopping"),compare=base*percent/100;
    var arrays=amountArrays(context,base,compare,true,true);
    return createModel("find_rate",lv,context+":percent",{
      context:context,unknown:"rate",base:base,compare:compare,rate:percent/100,ratePercent:percent,
      answerValue:percent,givenMoney:arrays.givenMoney,integerQuantities:arrays.integerQuantities,
      ratePercents:[percent],divisions:[{numerator:compare*100,denominator:base,result:percent}]
    });
  }

  function buildFindCompare(lv,random){
    var context=pick(["class_members","shopping","book_pages","stickers_cards","water_volume"],random);
    var percent=pick([15,20,25,30,40,50,60,70,75,80,90],random);
    var base=compatibleBase(context,percent,random,false),compare=base*percent/100;
    var arrays=amountArrays(context,base,compare,true,false);
    return createModel("find_compare",lv,context+":percent",{
      context:context,unknown:"compare",base:base,compare:compare,rate:percent/100,ratePercent:percent,
      answerValue:compare,givenMoney:arrays.givenMoney,computedMoney:arrays.computedMoney,
      integerQuantities:arrays.integerQuantities,ratePercents:[percent]
    });
  }

  function buildFindBase(lv,random){
    var context=pick(["class_members","shopping","book_pages","stickers_cards","water_volume"],random);
    var percent=pick([15,20,25,30,40,50,60,75,80],random);
    var base=compatibleBase(context,percent,random,context==="shopping"),compare=base*percent/100;
    var arrays=amountArrays(context,base,compare,false,true);
    return createModel("find_base",lv,context+":percent",{
      context:context,unknown:"base",base:base,compare:compare,rate:percent/100,ratePercent:percent,
      answerValue:base,givenMoney:arrays.givenMoney,computedMoney:arrays.computedMoney,
      integerQuantities:arrays.integerQuantities,ratePercents:[percent],
      divisions:[{numerator:compare*100,denominator:percent,result:base}]
    });
  }

  function buildDiscount(lv,random){
    var direction=pick(["down","up"],random),percent=pick([10,15,20,25,30,40],random);
    var base=pick([600,800,1000,1200,1600,2000,2400,3000],random);
    var change=base*percent/100,compare=direction==="down"?base-change:base+change;
    return createModel("discount",lv,direction==="down"?"discount":"markup",{
      context:"shopping",unknown:"compare",direction:direction,base:base,compare:compare,change:change,
      rate:percent/100,ratePercent:percent,answerValue:compare,givenMoney:[base],
      computedMoney:[change,compare],ratePercents:[percent]
    });
  }

  function buildContinuousDiscount(lv,random){
    var first=pick([10,20,25],random),second=pick([10,20,25],random);
    var bases=[1000,1200,1600,2000,2400,3000,4000].filter(function(value){return Number.isInteger(value*(100-first)/100*(100-second)/100);});
    var base=pick(bases,random),middle=base*(100-first)/100,compare=middle*(100-second)/100;
    return createModel("two_step",lv,"continuous_discount",{
      context:"shopping",unknown:"compare",base:base,compare:compare,intermediate:middle,
      rates:[first/100,second/100],ratePercents:[first,second],answerValue:compare,
      givenMoney:[base],computedMoney:[middle,compare]
    });
  }

  function buildRateOfRate(lv,random){
    var first=pick([20,25,40,50,60],random),second=pick([20,25,30,35,40,50],random);
    var bases=[100,200,300,400,500,600,800,1000].filter(function(value){return Number.isInteger(value*first/100*second/100);});
    var base=pick(bases,random),middle=base*first/100,compare=middle*second/100;
    return createModel("two_step",lv,"rate_of_rate",{
      context:"class_members",unknown:"compare",base:base,compare:compare,intermediate:middle,
      rates:[first/100,second/100],ratePercents:[first,second],answerValue:compare,
      integerQuantities:[base,middle,compare]
    });
  }

  function buildMixedChange(lv,random){
    var first=pick([10,20,25],random),second=pick([10,20,25],random);
    var bases=[800,1000,1200,1600,2000,2400,3000].filter(function(value){return Number.isInteger(value*(100+first)/100*(100-second)/100);});
    var base=pick(bases,random),middle=base*(100+first)/100,compare=middle*(100-second)/100;
    return createModel("two_step",lv,"increase_then_discount",{
      context:"shopping",unknown:"compare",base:base,compare:compare,intermediate:middle,
      rates:[first/100,second/100],ratePercents:[first,second],answerValue:compare,
      givenMoney:[base],computedMoney:[middle,compare]
    });
  }

  function buildTwoStep(lv,random){
    var subtype=pick(["continuous_discount","rate_of_rate","increase_then_discount"],random);
    if(subtype==="continuous_discount")return buildContinuousDiscount(lv,random);
    if(subtype==="rate_of_rate")return buildRateOfRate(lv,random);
    return buildMixedChange(lv,random);
  }

  function buildRatioShare(lv,random){
    var ratio=pick([[2,3],[3,5],[4,7],[3,7],[5,8]],random),unit=pick([10,20,30,40,50],random);
    var context=pick(["shopping","stickers_cards","water_volume"],random);
    var total=(ratio[0]+ratio[1])*unit,small=ratio[0]*unit,large=ratio[1]*unit;
    return createModel("ratio_share",lv,"share",{
      context:context,unknown:"larger_share",ratioA:ratio[0],ratioB:ratio[1],base:total,
      compare:large,smallShare:small,answerValue:large,givenMoney:context==="shopping"?[total]:[],
      computedMoney:context==="shopping"?[small,large]:[],integerQuantities:context==="shopping"?[]:[total,small,large],
      divisions:[{numerator:total,denominator:ratio[0]+ratio[1],result:unit}]
    });
  }

  function buildRatioValue(lv,random){
    var ratio=pick([[12,4],[18,6],[21,7],[24,8],[35,5]],random),answer=ratio[0]/ratio[1];
    return createModel("ratio_share",lv,"ratio_value",{
      context:"ratio",unknown:"ratio_value",ratioA:ratio[0],ratioB:ratio[1],answerValue:answer,
      integerQuantities:[ratio[0],ratio[1]],divisions:[{numerator:ratio[0],denominator:ratio[1],result:answer}]
    });
  }

  function buildEquivalentRatio(lv,random){
    var ratio=pick([[2,3],[3,4],[3,5],[4,7]],random),scale=pick([2,3,4],random);
    return createModel("ratio_share",lv,"equivalent_ratio",{
      context:"ratio",unknown:"equivalent_ratio",ratioA:ratio[0],ratioB:ratio[1],scale:scale,
      equivalentA:ratio[0]*scale,equivalentB:ratio[1]*scale,answerValue:ratio[0]/ratio[1],
      integerQuantities:[ratio[0],ratio[1],ratio[0]*scale,ratio[1]*scale]
    });
  }

  function buildRatio(lv,random){
    var subtype=pick(["share","share","ratio_value","equivalent_ratio"],random);
    if(subtype==="share")return buildRatioShare(lv,random);
    if(subtype==="ratio_value")return buildRatioValue(lv,random);
    return buildEquivalentRatio(lv,random);
  }

  function buildFractionSoutou(lv,random){
    var fraction=pick([[3,8],[2,5],[3,5],[3,4]],random),unit=pick([4,6,8,10,12],random);
    var base=fraction[1]*unit,compare=fraction[0]*unit;
    return createModel("soutou",lv,"fraction_part",{
      context:"book_pages",unknown:"base",base:base,compare:compare,numerator:fraction[0],denominator:fraction[1],
      rate:fraction[0]/fraction[1],answerValue:base,integerQuantities:[base,compare],
      divisions:[{numerator:compare*fraction[1],denominator:fraction[0],result:base}]
    });
  }

  function buildRemainingSoutou(lv,random){
    var spent=pick([20,40,60,75],random),remaining=100-spent;
    var bases=[150,200,225,240,300,400,450,600,800].filter(function(value){return Number.isInteger(value*remaining/100)&&value*remaining/100%10===0;});
    var base=pick(bases,random),compare=base*remaining/100;
    return createModel("soutou",lv,"remaining_money",{
      context:"shopping",unknown:"base",base:base,compare:compare,spentPercent:spent,
      remainingPercent:remaining,rate:remaining/100,answerValue:base,givenMoney:[compare],
      computedMoney:[base],ratePercents:[spent],divisions:[{numerator:compare*100,denominator:remaining,result:base}]
    });
  }

  function buildSoutou(lv,random){return pick(["fraction_part","remaining_money"],random)==="fraction_part"?buildFractionSoutou(lv,random):buildRemainingSoutou(lv,random);}

  function buildBaibai(lv,random){
    var pair=pick([[10,10],[10,20],[10,25],[20,10],[20,20],[20,25],[25,10],[25,25],[30,10],[30,20],[30,25]],random);
    var profit=pair[0],discount=pair[1];
    var costs=[400,600,800,1000,1200,1600,2000,2400].filter(function(value){
      var list=value*(100+profit)/100;
      return Number.isInteger(list)&&Number.isInteger(list*(100-discount)/100);
    });
    var base=pick(costs,random),listPrice=base*(100+profit)/100,compare=listPrice*(100-discount)/100;
    return createModel("baibai",lv,"profit_then_discount",{
      context:"shopping",unknown:"selling_price",base:base,compare:compare,listPrice:listPrice,
      profitPercent:profit,discountPercent:discount,rates:[profit/100,discount/100],
      ratePercents:[profit,discount],answerValue:compare,givenMoney:[base],computedMoney:[listPrice,compare]
    });
  }

  function buildModel(pattern,lv,random){
    if(pattern==="convert")return buildConvert(lv,random);
    if(pattern==="find_rate")return buildFindRate(lv,random);
    if(pattern==="find_compare")return buildFindCompare(lv,random);
    if(pattern==="find_base")return buildFindBase(lv,random);
    if(pattern==="discount")return buildDiscount(lv,random);
    if(pattern==="two_step")return buildTwoStep(lv,random);
    if(pattern==="ratio_share")return buildRatio(lv,random);
    if(pattern==="soutou")return buildSoutou(lv,random);
    return buildBaibai(lv,random);
  }

  function amountText(model,question){
    var b=model.base,c=model.compare,p=model.ratePercent;
    if(model.context==="class_members"){
      if(question==="rate")return b+"人の学級で"+c+"人が眼鏡をかけています。眼鏡の人は全体の何%ですか。";
      if(question==="compare")return b+"人の学級の"+p+"%は何人ですか。";
      return c+"人が学級全体の"+p+"%にあたります。全体は何人ですか。";
    }
    if(model.context==="shopping"){
      if(question==="rate")return b+"円の代金のうち"+c+"円を使いました。使った金額は全体の何%ですか。";
      if(question==="compare")return b+"円の"+p+"%は何円ですか。";
      return c+"円がもとの金額の"+p+"%にあたります。もとの金額は何円ですか。";
    }
    if(model.context==="book_pages"){
      if(question==="rate")return b+"ページの本を"+c+"ページ読みました。読んだのは全体の何%ですか。";
      if(question==="compare")return b+"ページの本の"+p+"%は何ページですか。";
      return c+"ページが本全体の"+p+"%にあたります。本全体は何ページですか。";
    }
    if(model.context==="stickers_cards"){
      if(question==="rate")return b+"枚のシールのうち"+c+"枚を使いました。使ったのは全体の何%ですか。";
      if(question==="compare")return b+"枚のシールの"+p+"%は何枚ですか。";
      return c+"枚がシール全体の"+p+"%にあたります。全部で何枚ですか。";
    }
    if(question==="rate")return b+"mLの水のうち"+c+"mLを使いました。使った水は全体の何%ですか。";
    if(question==="compare")return b+"mLの水の"+p+"%は何mLですか。";
    return c+"mLが水全体の"+p+"%にあたります。水は全部で何mLですか。";
  }

  function convertText(model){
    if(model.subtype==="decimal_to_percent")return model.sourceValue+"を百分率で表すと何%ですか。";
    if(model.subtype==="percent_to_decimal")return model.sourceValue+"%を小数で表すといくつですか。";
    if(model.subtype==="fraction_to_percent")return model.numerator+"/"+model.denominator+"を百分率で表すと何%ですか。";
    if(model.subtype==="fraction_to_decimal")return model.numerator+"/"+model.denominator+"を小数で表すといくつですか。";
    var wari=Math.floor(model.percent/10),bu=model.percent%10;
    return wari+"割"+(bu?bu+"分":"")+"は何%ですか。";
  }

  function twoStepText(model){
    var first=model.ratePercents[0],second=model.ratePercents[1];
    if(model.subtype==="continuous_discount")return model.base+"円の品物を"+first+"%引きし、さらに"+second+"%引きしました。何円になりましたか。";
    if(model.subtype==="rate_of_rate")return "学校全体"+model.base+"人の"+first+"%が5年生で、その"+second+"%が眼鏡をかけています。眼鏡をかけた5年生は何人ですか。";
    return model.base+"円の品物を"+first+"%増しにし、その金額から"+second+"%引きしました。何円ですか。";
  }

  function ratioText(model){
    if(model.subtype==="ratio_value")return model.ratioA+":"+model.ratioB+"の比の値はいくつですか。";
    if(model.subtype==="equivalent_ratio")return model.ratioA+":"+model.ratioB+"と等しい比を選びましょう。";
    var unit=model.context==="shopping"?"円":model.context==="water_volume"?"mL":"枚";
    return model.base+unit+"を"+model.ratioA+":"+model.ratioB+"に分けます。多い方は"+(unit==="円"?"何円":unit==="mL"?"何mL":"何枚")+"ですか。";
  }

  function soutouText(model){
    if(model.subtype==="fraction_part")return "ある本の"+model.numerator+"/"+model.denominator+"を読んだら"+model.compare+"ページでした。本全体は何ページですか。";
    return "持っているお金の"+model.spentPercent+"%を使ったら"+model.compare+"円残りました。はじめは何円持っていましたか。";
  }

  function wazaFor(model){
    if(model.pattern==="convert"&&model.subtype.indexOf("fraction")===0)return {primary:"分子を分母で割って小数にしてから直す",alternate:"知っている等しい分数から百分率へ直しても同じ"};
    if(model.pattern==="convert"&&model.subtype==="wari_to_percent")return {primary:"一割は10%、一分は1%として足す",alternate:"歩合を小数に直して100倍しても同じ"};
    if(model.pattern==="convert")return {primary:"百分率と小数は100倍・100分の1で行き来する",alternate:"小数点を二桁動かして確かめても同じ"};
    if(model.pattern==="find_rate")return {primary:"比べる量÷もとにする量で割合を出す",alternate:"出た小数を100倍すると百分率になる"};
    if(model.pattern==="find_compare")return {primary:"もとにする量×割合で比べる量を出す",alternate:"1%分を出してから必要な分だけ集めても同じ"};
    if(model.pattern==="find_base")return {primary:"もとにする量を聞かれたら割合で割って戻す",alternate:"比べる量÷百分率の数×100でも同じ"};
    if(model.pattern==="discount")return model.direction==="down"?{primary:"値引き額を求めて、もとの値段から引く",alternate:"残る割合を一度にかけても同じ"}:{primary:"増える額を求めて、もとの値段に足す",alternate:"100%を超える割合を一度にかけても同じ"};
    if(model.pattern==="two_step")return {primary:"一回目の答えを二回目のもとにする量にする",alternate:"二つの割合を順にかけても同じ"};
    if(model.pattern==="ratio_share"&&model.subtype==="ratio_value")return {primary:"比の値は前項÷後項で出す",alternate:"前項と後項を約分してから割っても同じ"};
    if(model.pattern==="ratio_share"&&model.subtype==="equivalent_ratio")return {primary:"前項と後項に同じ数をかける",alternate:"二つの比の値が同じか確かめてもよい"};
    if(model.pattern==="ratio_share")return {primary:"比の合計で全体を割り、一つ分を出す",alternate:"全体×ほしい方の比÷比の合計でも同じ"};
    if(model.pattern==="soutou")return {primary:"分かっている部分をその割合で割って全体へ戻す",alternate:"一つ分を先に出して全部の数だけ集めても同じ"};
    return {primary:"原価から定価、定価から売価の順に進む",alternate:"二つの割合をまとめた一つの倍率でも計算できる"};
  }

  function baseQuestion(model,format,kind,text,answerValue){
    return {pattern:model.pattern,patternId:model.patternId,lv:model.lv,format:format,kind:kind,
      text:text,answerValue:answerValue,waza:wazaFor(model),model:model};
  }

  function shuffle(values,random){
    var result=values.slice();
    for(var i=result.length-1;i>0;i--){
      var j=Math.floor(randomValue(random)*(i+1)),tmp=result[i];result[i]=result[j];result[j]=tmp;
    }
    return result;
  }

  function uniqueFour(entries){
    var selected=[];
    entries.forEach(function(entry){
      if(selected.length===4||typeof entry.text!=="string"||!Number.isFinite(entry.value))return;
      if(selected.some(function(item){return item.text===entry.text||nearlyEqual(item.value,entry.value);}))return;
      selected.push(entry);
    });
    if(selected.length!==4||selected[0].operation!=="correct")throw generationError("選択肢を一意にできません");
    return selected;
  }

  function choiceQuestion(model,format,text,entries,random){
    var selected=shuffle(uniqueFour(entries),random),correct=selected.filter(function(entry){return entry.operation==="correct";})[0];
    var question=baseQuestion(model,format,"choice",text,correct.value);
    question.choices=selected.map(function(entry){return entry.text;});
    question.choiceValues=selected.map(function(entry){return entry.value;});
    question.choiceOperations=selected.map(function(entry){return entry.operation;});
    question.ans=correct.text;
    question.distractors=selected.filter(function(entry){return entry.operation!=="correct";}).map(function(entry){return {text:entry.text,value:entry.value,operation:entry.operation};});
    return question;
  }

  function equivalentRatioQuestion(model,random){
    var a=model.ratioA,b=model.ratioB,k=model.scale,ca=model.equivalentA,cb=model.equivalentB;
    return choiceQuestion(model,"normal",ratioText(model),[
      {text:ca+":"+cb,value:ca/cb,operation:"correct"},
      {text:cb+":"+ca,value:cb/ca,operation:"quantity_swap"},
      {text:ca+":"+(cb+1),value:ca/(cb+1),operation:"one_side_only"},
      {text:(a*10)+":"+b,value:a*10/b,operation:"digit_shift"},
      {text:a+":"+(b*k),value:a/(b*k),operation:"scale_one_side"}
    ],random);
  }

  function normalQuestion(model,random){
    var text,question;
    if(model.pattern==="convert")text=convertText(model);
    else if(model.pattern==="find_rate")text=amountText(model,"rate");
    else if(model.pattern==="find_compare")text=amountText(model,"compare");
    else if(model.pattern==="find_base")text=amountText(model,"base");
    else if(model.pattern==="discount")text=model.base+"円の品物を"+model.ratePercent+"%"+(model.direction==="down"?"引き":"増し")+"にすると何円ですか。";
    else if(model.pattern==="two_step")text=twoStepText(model);
    else if(model.pattern==="ratio_share")text=ratioText(model);
    else if(model.pattern==="soutou")text=soutouText(model);
    else text="原価"+model.base+"円の品物に"+model.profitPercent+"%の利益を見込み、定価から"+model.discountPercent+"%引きで売りました。売価は何円ですか。";
    if(model.subtype==="equivalent_ratio")return equivalentRatioQuestion(model,random);
    question=baseQuestion(model,"normal","num",text,model.answerValue);
    question.ans=model.answerValue;
    return question;
  }

  function findRateFormulation(model){
    var b=model.base,c=model.compare;
    return [
      {text:c+"÷"+b,value:c/b,operation:"correct"},
      {text:b+"÷"+c,value:b/c,operation:"quantity_swap"},
      {text:c+"×"+b,value:c*b,operation:"operation_reversal"},
      {text:b+"−"+c,value:b-c,operation:"subtraction_escape"},
      {text:(c*10)+"÷"+b,value:c*10/b,operation:"digit_shift"}
    ];
  }

  function findCompareFormulation(model){
    var b=model.base,p=model.ratePercent,r=decimalText(p);
    return [
      {text:b+"×"+r,value:b*p/100,operation:"correct"},
      {text:b+"÷"+r,value:b/(p/100),operation:"operation_reversal"},
      {text:b+"×"+p,value:b*p,operation:"missing_percent_conversion"},
      {text:b+"÷"+p,value:b/p,operation:"reversal_and_missing_conversion"},
      {text:p+"÷"+b,value:p/b,operation:"quantity_swap"}
    ];
  }

  function findBaseFormulation(model){
    var c=model.compare,p=model.ratePercent,r=decimalText(p);
    return [
      {text:c+"÷"+r,value:c/(p/100),operation:"correct"},
      {text:c+"×"+r,value:c*p/100,operation:"operation_reversal"},
      {text:c+"÷"+p,value:c/p,operation:"missing_percent_conversion"},
      {text:r+"÷"+c,value:(p/100)/c,operation:"quantity_swap"},
      {text:c+"×"+p,value:c*p,operation:"digit_shift"}
    ];
  }

  function discountFormulation(model){
    var b=model.base,p=model.ratePercent,r=decimalText(p),sign=model.direction==="down"?"−":"＋";
    var correct=model.direction==="down"?b-b*p/100:b+b*p/100;
    var opposite=model.direction==="down"?b+b*p/100:b-b*p/100;
    return [
      {text:b+sign+b+"×"+r,value:correct,operation:"correct"},
      {text:b+"×"+r,value:b*p/100,operation:"answer_change_amount"},
      {text:b+(sign==="−"?"＋":"−")+b+"×"+r,value:opposite,operation:"direction_reversal"},
      {text:b+"÷"+r,value:b/(p/100),operation:"operation_reversal"},
      {text:b+"×"+p,value:b*p,operation:"missing_percent_conversion"}
    ];
  }

  function soutouFormulation(model){
    var c=model.compare;
    if(model.subtype==="remaining_money"){
      var remain=model.remainingPercent,spent=model.spentPercent,r=decimalText(remain);
      return [
        {text:c+"÷"+r,value:c/(remain/100),operation:"correct"},
        {text:c+"×"+r,value:c*remain/100,operation:"operation_reversal"},
        {text:c+"÷"+decimalText(spent),value:c/(spent/100),operation:"quantity_mixup"},
        {text:c+"×"+remain,value:c*remain,operation:"missing_percent_conversion"},
        {text:c+"÷"+remain,value:c/remain,operation:"digit_shift"}
      ];
    }
    var n=model.numerator,d=model.denominator,f="("+n+"/"+d+")";
    return [
      {text:c+"÷"+f,value:c/(n/d),operation:"correct"},
      {text:c+"×"+f,value:c*n/d,operation:"operation_reversal"},
      {text:c+"÷"+d,value:c/d,operation:"denominator_only"},
      {text:c+"÷"+n,value:c/n,operation:"numerator_only"},
      {text:c+"×"+d,value:c*d,operation:"fraction_digit_shift"}
    ];
  }

  function baibaiFormulation(model){
    var b=model.base,p=model.profitPercent,d=model.discountPercent;
    var up=(100+p)/100,down=(100-d)/100,list=b*up;
    return [
      {text:b+"×"+String(up)+"×"+String(down),value:b*up*down,operation:"correct"},
      {text:b+"×"+factorText(p,"down"),value:b*(100-p)/100,operation:"profit_direction_reversal"},
      {text:list+"×"+decimalText(d),value:list*d/100,operation:"answer_discount_amount"},
      {text:b+"×"+String((100+p-d)/100),value:b*(100+p-d)/100,operation:"combine_percentages"},
      {text:b+"×"+decimalText(p),value:b*p/100,operation:"answer_profit_amount"}
    ];
  }

  function formulationQuestion(model,random){
    var entries;
    if(model.pattern==="find_rate")entries=findRateFormulation(model);
    else if(model.pattern==="find_compare")entries=findCompareFormulation(model);
    else if(model.pattern==="find_base")entries=findBaseFormulation(model);
    else if(model.pattern==="discount")entries=discountFormulation(model);
    else if(model.pattern==="soutou")entries=soutouFormulation(model);
    else entries=baibaiFormulation(model);
    return choiceQuestion(model,"formulation",normalQuestion(model,random).text+"式を選びましょう。",entries,random);
  }

  function recomputeAnswer(model){
    if(model.pattern==="convert")return model.subtype==="decimal_to_percent"?model.sourceValue*100:model.subtype==="percent_to_decimal"?model.sourceValue/100:model.subtype==="wari_to_percent"?model.percent:model.subtype==="fraction_to_percent"?model.numerator/model.denominator*100:model.numerator/model.denominator;
    if(model.pattern==="find_rate")return model.compare*100/model.base;
    if(model.pattern==="find_compare")return model.base*model.rate;
    if(model.pattern==="find_base")return model.compare/model.rate;
    if(model.pattern==="discount")return model.direction==="down"?model.base-model.base*model.rate:model.base+model.base*model.rate;
    if(model.pattern==="two_step")return model.subtype==="rate_of_rate"?model.base*model.rates[0]*model.rates[1]:model.subtype==="continuous_discount"?model.base*(1-model.rates[0])*(1-model.rates[1]):model.base*(1+model.rates[0])*(1-model.rates[1]);
    if(model.pattern==="ratio_share")return model.subtype==="share"?model.base*model.ratioB/(model.ratioA+model.ratioB):model.ratioA/model.ratioB;
    if(model.pattern==="soutou")return model.subtype==="fraction_part"?model.compare/(model.numerator/model.denominator):model.compare/(model.remainingPercent/100);
    return model.base*(1+model.profitPercent/100)*(1-model.discountPercent/100);
  }

  function validateNumberArrays(model){
    ["givenMoney","computedMoney","integerQuantities","ratePercents","divisions"].forEach(function(key){
      if(!Array.isArray(model[key]))throw generationError("意味モデルの数値情報が不足しています");
    });
    model.givenMoney.forEach(function(value){if(!Number.isInteger(value)||value<=0||value%10!==0)throw generationError("与件の金額は10円単位である必要があります");});
    model.computedMoney.forEach(function(value){if(!Number.isInteger(value)||value<=0)throw generationError("計算結果の金額は整数である必要があります");});
    model.integerQuantities.forEach(function(value){if(!Number.isInteger(value)||value<=0)throw generationError("人数と個数は整数である必要があります");});
    model.ratePercents.forEach(function(value){if(!Number.isInteger(value)||value<=0||value>=100)throw generationError("百分率は1から99の整数である必要があります");});
    model.divisions.forEach(function(item){
      if(!isObject(item)||!Number.isInteger(item.numerator)||!Number.isInteger(item.denominator)||item.denominator===0||item.numerator%item.denominator!==0||item.result!==item.numerator/item.denominator)throw generationError("答えが割り切れません");
    });
  }

  function validateModel(model){
    if(!isObject(model)||PATTERN_NAMES.indexOf(model.pattern)<0||!Number.isInteger(model.lv)||model.lv<1||model.lv>10||typeof model.patternId!=="string"||!model.patternId)throw generationError("意味モデルの形式が正しくありません");
    validateNumberArrays(model);
    if(Number.isFinite(model.base)&&Number.isFinite(model.compare)){
      if(model.base<=0||model.compare<=0||nearlyEqual(model.base,model.compare))throw generationError("もとにする量と比べる量が同じです");
    }
    var expected=recomputeAnswer(model);
    if(!Number.isFinite(expected)||!Number.isFinite(model.answerValue)||!nearlyEqual(expected,model.answerValue))throw generationError("意味モデルの答えが一致しません");
    if(model.pattern!=="convert"&&model.subtype!=="equivalent_ratio"&&!nearlyEqual(expected,Math.round(expected)))throw generationError("答えは整数である必要があります");
    return true;
  }

  function validateChoices(question){
    if(!Array.isArray(question.choices)||question.choices.length!==4||!Array.isArray(question.choiceValues)||question.choiceValues.length!==4||!Array.isArray(question.choiceOperations)||question.choiceOperations.length!==4)throw generationError("選択肢は4個必要です");
    for(var i=0;i<question.choiceValues.length;i++){
      if(!Number.isFinite(question.choiceValues[i]))throw generationError("選択肢の値が正しくありません");
      for(var j=0;j<i;j++)if(nearlyEqual(question.choiceValues[i],question.choiceValues[j]))throw generationError("選択肢の値が重複しています");
    }
    var correctIndexes=[];
    question.choiceOperations.forEach(function(operation,index){if(operation==="correct")correctIndexes.push(index);});
    if(correctIndexes.length!==1||question.choices[correctIndexes[0]]!==question.ans||!nearlyEqual(question.choiceValues[correctIndexes[0]],question.answerValue))throw generationError("正解の選択肢が一致しません");
    if(!Array.isArray(question.distractors)||question.distractors.length!==3||question.distractors.some(function(item){return !isObject(item)||item.operation==="correct"||nearlyEqual(item.value,question.answerValue);}))throw generationError("誤答候補が正しくありません");
  }

  function validateQuestion(question){
    if(!isObject(question)||PATTERN_NAMES.indexOf(question.pattern)<0||!Number.isInteger(question.lv)||question.lv<1||question.lv>10||typeof question.patternId!=="string"||!question.patternId||["normal","formulation"].indexOf(question.format)<0||["num","choice"].indexOf(question.kind)<0||typeof question.text!=="string"||!question.text)throw new Error("問題データの形式が正しくありません");
    if(question.patternId!==question.model.patternId||question.pattern!==question.model.pattern||question.lv!==question.model.lv)throw generationError("問題と意味モデルが一致しません");
    if((question.format==="normal"?LV_NORMAL[question.lv]:LV_FORMULATION[question.lv]).indexOf(question.pattern)<0)throw generationError("レベルと出題パターンが一致しません");
    if(!isObject(question.waza)||typeof question.waza.primary!=="string"||!question.waza.primary||typeof question.waza.alternate!=="string"||!question.waza.alternate)throw generationError("わざの形式が正しくありません");
    validateModel(question.model);
    var expected=question.format==="formulation"&&question.pattern==="find_rate"?question.model.rate:question.model.answerValue;
    if(!Number.isFinite(question.answerValue)||!nearlyEqual(question.answerValue,expected))throw generationError("問題の答えが一致しません");
    if(question.kind==="choice")validateChoices(question);
    else if(question.format!=="normal"||!Number.isFinite(question.ans)||!nearlyEqual(question.ans,expected))throw generationError("通常問題の答えが一致しません");
    return true;
  }

  function patternsForLv(lv,format){
    if(!Number.isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");
    if(format!=="normal"&&format!=="formulation")throw new Error("形式の指定が正しくありません");
    return (format==="normal"?LV_NORMAL[lv]:LV_FORMULATION[lv]).slice();
  }

  function validateRequest(pattern,lv,format,random){
    if(PATTERN_NAMES.indexOf(pattern)<0)throw new Error("割合パターンの指定が正しくありません");
    var available=patternsForLv(lv,format);
    if(available.indexOf(pattern)<0)throw new Error("このレベルでは指定した形式を生成できません");
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
  }

  function renderModel(model,format,random){return format==="normal"?normalQuestion(model,random):formulationQuestion(model,random);}

  function generate(pattern,lv,format,random){
    validateRequest(pattern,lv,format,random);
    for(var attempt=0;attempt<100;attempt++){
      try{
        var model=buildModel(pattern,lv,random),question=renderModel(model,format,random);
        validateQuestion(question);
        return question;
      }catch(error){if(!error.retryGeneration)throw error;}
    }
    throw new Error("条件を満たす割合問題を生成できません");
  }

  function generateForLv(lv,format,random){
    var available=patternsForLv(lv,format);
    if(!available.length)throw new Error("このレベルには指定した形式がありません");
    return generate(pick(available,random),lv,format,random);
  }

  function generatePair(pattern,lv,random){
    validateRequest(pattern,lv,"normal",random);
    for(var attempt=0;attempt<100;attempt++){
      try{
        var model=buildModel(pattern,lv,random),normal=renderModel(model,"normal",random),formulation=null;
        validateQuestion(normal);
        if(LV_FORMULATION[lv].indexOf(pattern)>=0){formulation=renderModel(model,"formulation",random);validateQuestion(formulation);}
        return {model:model,normal:normal,formulation:formulation};
      }catch(error){if(!error.retryGeneration)throw error;}
    }
    throw new Error("条件を満たす割合問題の組を生成できません");
  }

  function namedPattern(pattern){return function(lv,format,random){return generate(pattern,lv,format,random);};}
  var patternApi={};
  PATTERN_NAMES.forEach(function(pattern){patternApi[pattern]=namedPattern(pattern);});

  global.Q4B_KOMOREBI_RATIO_GENERATOR={
    patternIds:PATTERN_NAMES.slice(),
    patterns:patternApi,
    generate:generate,
    generateForLv:generateForLv,
    generatePair:generatePair,
    patternsForLv:patternsForLv,
    validateQuestion:validateQuestion
  };
})(window);
