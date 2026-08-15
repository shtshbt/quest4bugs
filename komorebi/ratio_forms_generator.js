(function(global){
  "use strict";

  /* kom_ratio_forms generator.
     Spec: docs/komorebi_ratio_forms_curriculum.md (v0.3).
     Values come from the thousandths ledger (7.1); no division at generation time. */

  var CONFIG={setSize:5};
  var DIRECTIONS=[
    "decimal_to_percent","percent_to_decimal","wari_to_percent","percent_to_wari",
    "wari_to_decimal","decimal_to_wari","fraction_to_percent","fraction_to_decimal",
    "percent_to_fraction","decimal_to_fraction"
  ];
  var LV_SPACES={
    1:{directions:["decimal_to_percent","percent_to_decimal"],bands:["A"]},
    2:{directions:["decimal_to_percent","percent_to_decimal"],bands:["B","C"]},
    3:{directions:["wari_to_percent","percent_to_wari"],bands:["A","B"]},
    4:{directions:["wari_to_decimal","decimal_to_wari"],bands:["A","B"]},
    5:{directions:["fraction_to_percent","fraction_to_decimal"],bands:["A","C"]},
    6:{directions:["percent_to_fraction","decimal_to_fraction"],bands:["A","C"]},
    7:{directions:["decimal_to_percent","percent_to_decimal","fraction_to_percent","percent_to_fraction"],bands:["D"]}
  };
  /* Lv5 の記憶帯 (curriculum 6 章 Lv5)。Lv6 はその逆変換なので同じ帯に閉じる。 */
  var LV5_DENOMINATORS=[2,4,5,8,10,20,25,50];
  var FRONT_DENOMINATORS=[20,25];

  var WAZA_DIRECTION={
    decimal_to_percent:["百分率と小数は 100 倍・100 分の 1 で行き来する","小数点を二桁動かして確かめても同じ"],
    percent_to_decimal:["百分率と小数は 100 倍・100 分の 1 で行き来する","小数点を二桁動かして確かめても同じ"],
    wari_to_percent:["一割は 10%、一分は 1% として足す","歩合を小数に直して 100 倍しても同じ"],
    percent_to_wari:["十の位が割、一の位が分、小数第一位が厘","一度小数に直して位を数えても同じ"],
    wari_to_decimal:["小数第一位が割、第二位が分","百分率を経由しても同じ"],
    decimal_to_wari:["小数第一位が割、第二位が分","百分率を経由しても同じ"],
    fraction_to_percent:["分子を分母で割って小数にしてから直す","知っている等しい分数から百分率へ直しても同じ"],
    fraction_to_decimal:["分子を分母で割る。覚えている分数はそのまま出す","先に百分率へ直してから小数にしても同じ"],
    percent_to_fraction:["100 分のいくつから始めて約分する","小数に直してから分母を 10 か 100 に取っても同じ"],
    decimal_to_fraction:["小数第二位までは 100 分のいくつ、第三位は 1000 分のいくつから始めて約分する","百分率に直してから 100 分のいくつに取っても同じ"]
  };
  var WAZA_BAND_D=["1 は 100%。1 より大きければ 100% より大きい","整数部と小数部を分けて直しても同じ"];
  var WAZA_PHRASE_FRONT=["「~の」「~に対する」の前がもとにする量","「~をもとにすると」と言いかえても同じ"];
  var WAZA_PHRASE_BACK=["1 とみている方がもとにする量。いつも前にあるとは限らない","「~を 1 としたときの」の後ろは比べる量"];

  var CONVERSION_SCAFFOLDS={
    1:"0.01 = 1% です。",
    2:"0.07 = 7%、0.7 = 70% です。",
    3:"1割 = 10%、1分 = 1% です。",
    4:"0.1 = 1割、0.01 = 1分 です。",
    5:"1/8 = 0.125 = 12.5% です。",
    6:"40% は 100 分の 40 です。ここから約分します。",
    7:"1 = 100% です。1 より大きい数は 100% より大きくなります。"
  };
  var PHRASE_SCAFFOLDS={
    W1:"『~の』の前がもとにする量です。",
    W2:"『~に対する』の前がもとにする量です。",
    W3:"1 とみている方がもとにする量です。",
    W4:"1 とみている方がもとにする量です。"
  };

  /* kom_ratio と同じ 5 文脈 (curriculum 6 章 Lv8)。pairs は [もとにする量, 比べる量]。 */
  var CONTEXTS=[
    {id:"class_members",aName:"クラス全体",bName:"めがねの子",unit:"人",qword:"人数",pairs:[[40,12],[30,18],[50,20],[20,8]]},
    {id:"shopping",aName:"ノート",bName:"えんぴつ",unit:"円",qword:"ねだん",pairs:[[1200,300],[800,200],[200,50],[600,150]]},
    {id:"book_pages",aName:"本全体",bName:"読んだページ",unit:"ページ",qword:"ページ数",pairs:[[120,30],[200,50],[160,40],[80,20]]},
    {id:"stickers_cards",aName:"シール",bName:"カード",unit:"枚",qword:"枚数",pairs:[[50,30],[80,25],[60,15],[40,10]]},
    {id:"water_volume",aName:"水そうの水",bName:"コップの水",unit:"mL",qword:"かさ",pairs:[[500,200],[400,100],[1000,250],[600,150]]}
  ];
  /* percent と、その逆数の decimal (対比ペアで世界を矛盾させないための組)。 */
  var RATE_PAIRS=[[80,"1.25"],[50,"2"],[40,"2.5"],[25,"4"],[20,"5"]];
  var RATE_PERCENTS=[15,20,25,30,40,60,75,80,90];
  /* 言い換え 4 問の W 型配合 (6 章の分散規則を満たす全列挙: W3+W4>=2, W3>=1, 同型<=2)。 */
  var COMPOSITIONS=[
    [2,0,1,1],[1,1,1,1],[0,2,1,1],[1,0,1,2],[0,1,1,2],
    [2,0,2,0],[1,1,2,0],[0,2,2,0],[1,0,2,1],[0,1,2,1],[0,0,2,2]
  ];
  var EQUAL_ANSWER_TYPE={W1:"W3",W2:"W1",W3:"W1",W4:"W2"};
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
  function gcdInt(a,b){while(b!==0){var r=a%b;a=b;b=r;}return a;}
  function waza(pair){return {primary:pair[0],alternate:pair[1]};}

  function buildLedger(){
    var rows=[];
    for(var m=1;m<=2000;m++){
      if(m===1000)continue;
      var divisor=gcdInt(m,1000),numerator=m/divisor,denominator=1000/divisor,multipleOfTen=m%10===0;
      if(!multipleOfTen&&denominator>50)continue;
      var band=m>1000?"D":(!multipleOfTen?"C":(m<100?"B":"A"));
      rows.push({m:m,band:band,fracOk:denominator<=50,buaiOk:m<1000,rin:m%10!==0,numerator:numerator,denominator:denominator});
    }
    return rows;
  }
  var LEDGER=buildLedger();
  function ledgerRow(m){
    for(var i=0;i<LEDGER.length;i++)if(LEDGER[i].m===m)return LEDGER[i];
    throw new Error("台帳にない値です: "+m);
  }

  /* 4 形の導出は文字列操作で行い、生成器は割り算を実行しない (7.1)。 */
  function decimalTextOf(m){
    if(!isInteger(m)||m<1)throw new Error("千分率の指定が正しくありません");
    var whole=Math.floor(m/1000),rest=String(m%1000);
    while(rest.length<3)rest="0"+rest;
    rest=rest.replace(/0+$/,"");
    return rest?whole+"."+rest:String(whole);
  }
  function percentTextOf(m){
    if(!isInteger(m)||m<1)throw new Error("千分率の指定が正しくありません");
    var whole=Math.floor(m/10),digit=m%10;
    return digit?whole+"."+digit:String(whole);
  }
  function buaiTextOf(m){
    if(!isInteger(m)||m<1)throw new Error("千分率の指定が正しくありません");
    var wari=Math.floor(m/100),bu=Math.floor(m/10)%10,rin=m%10,text="";
    if(wari)text+=wari+"割";
    if(bu)text+=bu+"分";
    if(rin)text+=rin+"厘";
    return text;
  }

  function isFractionDirection(direction){return direction.indexOf("fraction")>=0;}
  function isBuaiDirection(direction){return direction.indexOf("wari")>=0;}
  function eligibleRow(lv,direction,row){
    if(isFractionDirection(direction)&&!row.fracOk)return false;
    if(isBuaiDirection(direction)&&!row.buaiOk)return false;
    if((lv===5||lv===6)&&LV5_DENOMINATORS.indexOf(row.denominator)<0)return false;
    return true;
  }
  function rowsFor(lv,direction,band){
    return LEDGER.filter(function(row){return row.band===band&&eligibleRow(lv,direction,row);});
  }
  function patternIdsFor(lv){
    var space=LV_SPACES[lv],ids=[];
    space.directions.forEach(function(direction){space.bands.forEach(function(band){ids.push(direction+":"+band);});});
    return ids;
  }
  var UNION_ENTRIES=[];
  (function(){
    for(var lv=1;lv<=7;lv++)LV_SPACES[lv].directions.forEach(function(direction){
      LV_SPACES[lv].bands.forEach(function(band){UNION_ENTRIES.push({sourceLv:lv,direction:direction,band:band});});
    });
  })();

  function baseQuestion(lv,kind,pattern,patternId,text){
    return {cat:"kom_ratio_forms",format:"normal",kind:kind,lv:lv,pattern:pattern,patternId:patternId,
      m:null,band:null,wType:null,text:text,scaffold:null,ans:null,waza:null,shortLoop:false};
  }
  function option(text,value,correct,errorType){
    return {text:text,value:value,correct:!!correct,errorType:errorType||null};
  }
  function setChoice(question,options,random){
    if(!Array.isArray(options)||options.length!==4)throw new Error("選択肢を 4 個作れません");
    for(var i=0;i<options.length;i++)for(var j=i+1;j<options.length;j++){
      if(options[i].text===options[j].text)throw new Error("同じ選択肢があります");
      if(typeof options[i].value==="number"&&typeof options[j].value==="number"&&options[i].value===options[j].value)throw new Error("同値の選択肢があります");
    }
    var mixed=shuffle(options,random),correctCount=mixed.filter(function(item){return item.correct;}).length;
    if(correctCount!==1)throw new Error("正解が 1 個ではありません");
    question.choices=mixed.map(function(item){return item.text;});
    question.choiceValues=mixed.map(function(item){return item.value;});
    question.distractorTypes=mixed.map(function(item){return item.errorType;});
    question.ans=mixed.map(function(item){return item.correct;}).indexOf(true);
    return question;
  }

  function conversionWaza(direction,band){
    var row=WAZA_DIRECTION[direction];
    if(!row)throw new Error("わざの行がありません: "+direction);
    if(band==="D")return {primary:WAZA_BAND_D[0],alternate:row[0]};
    return waza(row);
  }

  /* 歩合を答える choice の誤答 (7.3)。位ずれの型そのものを並べる。 */
  function buaiChoiceOptions(row){
    var m=row.m,wari=Math.floor(m/100),bu=Math.floor(m/10)%10,rin=m%10;
    var options=[option(buaiTextOf(m),m,true,null)];
    options.push(option(buaiTextOf(m*10),m*10,false,"shift_magnitude"));
    if(m%10===0){
      options.push(option(buaiTextOf(m/10),m/10,false,"shift_magnitude"));
      if(wari>=1&&bu>=1)options.push(option(buaiTextOf(wari*100+bu),wari*100+bu,false,"wari_place"));
      else if(wari>=1)options.push(option(buaiTextOf(m/100),m/100,false,"shift_magnitude"));
      else options.push(option(buaiTextOf(m+100),m+100,false,"wari_place"));
    }else{
      options.push(option(buaiTextOf(wari*100+rin*10+bu),wari*100+rin*10+bu,false,"wari_place"));
      options.push(option(buaiTextOf(m-rin),m-rin,false,"wari_place"));
    }
    return options;
  }

  function makeConversion(lv,direction,row,random){
    if(DIRECTIONS.indexOf(direction)<0)throw new Error("方向の指定が正しくありません");
    if(!eligibleRow(lv,direction,row))throw new Error("この行では出せない方向です");
    var patternId=direction+":"+row.band,decText=decimalTextOf(row.m),pctText=percentTextOf(row.m),question;
    if(direction==="decimal_to_percent"){
      question=baseQuestion(lv,"num",direction,patternId,decText+" を百分率で表すと何%ですか。");
      question.ans=Number(pctText);
    }else if(direction==="percent_to_decimal"){
      question=baseQuestion(lv,"num",direction,patternId,pctText+"% を小数で表すといくつですか。");
      question.ans=Number(decText);
    }else if(direction==="wari_to_percent"){
      question=baseQuestion(lv,"num",direction,patternId,buaiTextOf(row.m)+"は何%ですか。");
      question.ans=Number(pctText);
    }else if(direction==="wari_to_decimal"){
      question=baseQuestion(lv,"num",direction,patternId,buaiTextOf(row.m)+"を小数で表すといくつですか。");
      question.ans=Number(decText);
    }else if(direction==="percent_to_wari"){
      question=baseQuestion(lv,"choice",direction,patternId,pctText+"% を歩合で表すとどれですか。");
      setChoice(question,buaiChoiceOptions(row),random);
    }else if(direction==="decimal_to_wari"){
      question=baseQuestion(lv,"choice",direction,patternId,decText+" を歩合で表すとどれですか。");
      setChoice(question,buaiChoiceOptions(row),random);
    }else if(direction==="fraction_to_percent"){
      question=baseQuestion(lv,"num",direction,patternId,row.numerator+"/"+row.denominator+" を百分率で表すと何%ですか。");
      question.ans=Number(pctText);
    }else if(direction==="fraction_to_decimal"){
      question=baseQuestion(lv,"num",direction,patternId,row.numerator+"/"+row.denominator+" を小数で表すといくつですか。");
      question.ans=Number(decText);
    }else if(direction==="percent_to_fraction"){
      question=baseQuestion(lv,"frac",direction,patternId,pctText+"% を分数で表しましょう。それ以上約分できない形で答えます。");
      question.ans={n:row.numerator,d:row.denominator};
    }else{
      question=baseQuestion(lv,"frac",direction,patternId,decText+" を分数で表しましょう。それ以上約分できない形で答えます。");
      question.ans={n:row.numerator,d:row.denominator};
    }
    question.m=row.m;question.band=row.band;question.waza=conversionWaza(direction,row.band);
    return question;
  }

  function labelOf(name,value,context){
    return value===null?name+"の"+context.qword:name+"の "+value+context.unit;
  }
  function phraseWaza(wType){
    return wType==="W3"||wType==="W4"?waza(WAZA_PHRASE_BACK):waza(WAZA_PHRASE_FRONT);
  }

  function makePhraseBase(lv,wType,context,random,linkedRate){
    var pairValues=pick(context.pairs,random),aValue=pairValues[0],bValue=pairValues[1];
    var text,options,ratePair=linkedRate||pick(RATE_PAIRS,random);
    var sumChoice=option(context.aName+"と"+context.bName+"の合計",null,false,null);
    if(wType==="W1"){
      var percent=linkedRate?ratePair[0]:pick(RATE_PERCENTS,random);
      text=pick([
        context.aName+"は "+aValue+context.unit+"です。"+context.bName+"は "+context.aName+"の "+percent+"% です。",
        context.aName+"は "+aValue+context.unit+"です。"+context.bName+"は その "+percent+"% の"+context.qword+"です。"
      ],random);
      options=[option(labelOf(context.aName,aValue,context),null,true,null),
        option(labelOf(context.bName,null,context),null,false,"words_reversal"),
        option(percent+"% という割合",null,false,"rate_as_quantity"),sumChoice];
    }else if(wType==="W2"){
      text=context.aName+" "+aValue+context.unit+"に対する "+context.bName+" "+bValue+context.unit+"の割合を考えます。";
      options=[option(labelOf(context.aName,aValue,context),null,true,null),
        option(labelOf(context.bName,bValue,context),null,false,"words_reversal"),
        option(aValue+context.unit+"と "+bValue+context.unit+"の差",null,false,null),
        option(aValue+context.unit+"と "+bValue+context.unit+"の合計",null,false,null)];
    }else if(wType==="W3"){
      var rate=ratePair[1];
      text=context.bName+"を 1 としたときの "+context.aName+"の割合は "+rate+" です。";
      options=[option(labelOf(context.bName,null,context),null,true,null),
        option(labelOf(context.aName,null,context),null,false,"words_reversal"),
        option(rate+" という割合",null,false,"rate_as_quantity"),sumChoice];
    }else if(wType==="W4"){
      var basePercent=linkedRate?ratePair[0]:pick(RATE_PERCENTS,random);
      text=context.aName+"が "+aValue+context.unit+"あります。"+context.bName+"は "+context.aName+"をもとにすると "+basePercent+"% の"+context.qword+"です。";
      options=[option(labelOf(context.aName,aValue,context),null,true,null),
        option(labelOf(context.bName,null,context),null,false,"words_reversal"),
        option(basePercent+"% という割合",null,false,"rate_as_quantity"),sumChoice];
    }else throw new Error("言い回し型の指定が正しくありません");
    var question=baseQuestion(lv,"choice","phrase_base","phrase_base:"+wType,text+"もとにする量はどれですか。");
    question.wType=wType;question.context=context.id;question.waza=phraseWaza(wType);
    return setChoice(question,options,random);
  }

  function equalPhrasing(type,n1,n2,u){
    if(type==="W1")return n2+u+"は "+n1+u+"の何%ですか";
    if(type==="W2")return n1+u+"に対する "+n2+u+"の割合は何%ですか";
    if(type==="W3")return n1+u+"を 1 としたときの "+n2+u+"の割合はいくつですか";
    throw new Error("言い回し型の指定が正しくありません");
  }
  function equalQuestionText(wType,n1,n2,u){
    if(wType==="W1")return "「"+n2+u+"は "+n1+u+"の何%ですか」と 同じことを 聞いているのはどれですか。";
    if(wType==="W2")return "「"+n1+u+"に対する "+n2+u+"の割合は何%ですか」と 同じことを 聞いているのはどれですか。";
    if(wType==="W3")return "「"+n1+u+"を 1 としたときの "+n2+u+"の割合」と 同じことを 聞いているのはどれですか。";
    if(wType==="W4")return "「"+n1+u+"をもとにすると "+n2+u+"は何%ですか」と 同じことを 聞いているのはどれですか。";
    throw new Error("言い回し型の指定が正しくありません");
  }
  function makePhraseEqual(lv,wType,context,random){
    var pairValues=pick(context.pairs,random),n1=pairValues[0],n2=pairValues[1],u=context.unit;
    var answerType=EQUAL_ANSWER_TYPE[wType];
    var question=baseQuestion(lv,"choice","phrase_equal","phrase_equal:"+wType,equalQuestionText(wType,n1,n2,u));
    question.wType=wType;question.answerWType=answerType;question.context=context.id;question.waza=phraseWaza(wType);
    return setChoice(question,[
      option(equalPhrasing(answerType,n1,n2,u),null,true,null),
      option(equalPhrasing(answerType,n2,n1,u),null,false,"words_reversal"),
      option(n1+u+"と "+n2+u+"の差は何%ですか",null,false,null),
      option(n1+u+"の "+n2+"% は何"+u+"ですか",null,false,null)
    ],random);
  }

  function finalizeSet(lv,questions){
    if(!Array.isArray(questions)||questions.length!==CONFIG.setSize)throw new Error("5問セットを作れません");
    var seenRows={};
    questions.forEach(function(question,index){
      question.lv=lv;question.id="ratio_forms_"+lv+"_q"+(index+1);
      if(question.m!==null&&lv<=9){
        if(seenRows[question.m])throw new Error("同じ台帳行が 2 回出ています");
        seenRows[question.m]=true;
      }
      var scaffolded=index<2&&lv<=9;
      if(scaffolded&&(typeof question.scaffold!=="string"||!question.scaffold))throw new Error("足場の位置が正しくありません");
      if(!scaffolded&&question.scaffold!==null)throw new Error("足場の位置が正しくありません");
    });
    if(lv===10){
      var counts={};
      questions.forEach(function(question){if(question.m!==null)counts[question.m]=(counts[question.m]||0)+1;});
      var doubled=Object.keys(counts).filter(function(key){return counts[key]===2;});
      if(doubled.length!==1||Object.keys(counts).length!==2)throw new Error("同一行 2 方向の組が 1 組ではありません");
    }
    return questions;
  }

  function normalizeCarry(carry){
    if(carry===undefined||carry===null)return null;
    if(!isObject(carry)||!isInteger(carry.m)||typeof carry.pattern!=="string"||!carry.pattern)throw new Error("短ループの指定が正しくありません");
    return {m:carry.m,pattern:carry.pattern};
  }
  function carryPlanFor(lv,carry,random){
    if(!carry||lv<3)return null;
    var row=null;
    for(var i=0;i<LEDGER.length;i++)if(LEDGER[i].m===carry.m){row=LEDGER[i];break;}
    if(!row)return null;
    var directions=[];
    function consider(direction,sourceLv){
      if(direction!==carry.pattern&&eligibleRow(sourceLv,direction,row)&&directions.indexOf(direction)<0)directions.push(direction);
    }
    if(lv<=7){
      if(LV_SPACES[lv].bands.indexOf(row.band)>=0)LV_SPACES[lv].directions.forEach(function(direction){consider(direction,lv);});
    }else if(lv<=9){
      UNION_ENTRIES.forEach(function(entry){if(entry.band===row.band)consider(entry.direction,entry.sourceLv);});
    }else{
      DIRECTIONS.forEach(function(direction){consider(direction,10);});
    }
    if(!directions.length)return null;
    var direction=pick(directions,random);
    return {row:row,direction:direction,patternId:direction+":"+row.band};
  }

  function buildConversionSet(lv,random,carryPlan){
    var ids=patternIdsFor(lv),cap=Math.ceil(CONFIG.setSize/ids.length);
    for(var attempt=0;attempt<300;attempt++){
      var slots=carryPlan?[carryPlan.patternId]:[];
      while(slots.length<CONFIG.setSize)slots.push(pick(ids,random));
      var counts={},capOk=true;
      slots.forEach(function(id){counts[id]=(counts[id]||0)+1;if(counts[id]>cap)capOk=false;});
      if(!capOk)continue;
      if(lv===5&&slots.filter(function(id){return id.indexOf(":C")>=0;}).length>3)continue;
      var questions=pickRowsAndBuild(lv,slots,carryPlan,random);
      if(!questions)continue;
      var ordered=arrangeConversions(lv,questions,random);
      if(!ordered)continue;
      ordered[0].scaffold=CONVERSION_SCAFFOLDS[lv];ordered[1].scaffold=CONVERSION_SCAFFOLDS[lv];
      return finalizeSet(lv,ordered);
    }
    throw new Error("条件を満たす変換セットを作れません");
  }
  function pickRowsAndBuild(lv,slots,carryPlan,random){
    var used={},questions=[],frontQuota=lv===5?2:0,failed=false;
    slots.forEach(function(id,index){
      if(failed)return;
      if(carryPlan&&index===0){
        used[carryPlan.row.m]=true;
        if(lv===5&&carryPlan.row.band==="A"&&FRONT_DENOMINATORS.indexOf(carryPlan.row.denominator)>=0)frontQuota--;
        var carryQuestion=makeConversion(lv,carryPlan.direction,carryPlan.row,random);
        carryQuestion.shortLoop=true;
        questions.push(carryQuestion);
        return;
      }
      var parts=id.split(":"),direction=parts[0],band=parts[1];
      var pool=rowsFor(lv,direction,band).filter(function(row){return !used[row.m];});
      if(lv===5&&band==="A"&&frontQuota>0){
        var frontPool=pool.filter(function(row){return FRONT_DENOMINATORS.indexOf(row.denominator)>=0;});
        if(frontPool.length){pool=frontPool;frontQuota--;}
      }
      if(!pool.length){failed=true;return;}
      var row=pick(pool,random);
      used[row.m]=true;
      questions.push(makeConversion(lv,direction,row,random));
    });
    if(failed||frontQuota>0)return null;
    return questions;
  }
  function arrangeConversions(lv,questions,random){
    var ordered=shuffle(questions,random);
    if(lv!==5)return ordered;
    var front=[],back=[];
    ordered.forEach(function(question){
      var isFront=question.band==="A"&&FRONT_DENOMINATORS.indexOf(ledgerRow(question.m).denominator)>=0;
      if(front.length<2&&isFront)front.push(question);else back.push(question);
    });
    if(front.length<2)return null;
    return front.concat(back);
  }

  function makeUnionConversion(lv,random,carryPlan){
    if(carryPlan){
      var carryQuestion=makeConversion(lv,carryPlan.direction,carryPlan.row,random);
      carryQuestion.shortLoop=true;
      return carryQuestion;
    }
    var entry=pick(UNION_ENTRIES,random);
    return makeConversion(lv,entry.direction,pick(rowsFor(entry.sourceLv,entry.direction,entry.band),random),random);
  }

  function removeOne(values,target){
    var index=values.indexOf(target);
    if(index>=0)values.splice(index,1);
  }
  function compositionTypes(random){
    var counts=pick(COMPOSITIONS,random),types=[];
    ["W1","W2","W3","W4"].forEach(function(type,index){for(var i=0;i<counts[index];i++)types.push(type);});
    return types;
  }

  function buildLv8(random,carryPlan){
    var types=compositionTypes(random),contexts=shuffle(CONTEXTS,random),contextIndex=0,head=[],rest=[];
    if(types.indexOf("W1")>=0){
      /* 対比ペア (6 章 Lv8): 同じ 2 量で基準が入れ替わる W1 + W3 を同じ文脈で先頭に置く。 */
      var pairContext=contexts[contextIndex++],ratePair=pick(RATE_PAIRS,random);
      head.push(makePhraseBase(8,"W1",pairContext,random,ratePair));
      head.push(makePhraseBase(8,"W3",pairContext,random,ratePair));
      removeOne(types,"W1");removeOne(types,"W3");
    }
    shuffle(types,random).forEach(function(type){rest.push(makePhraseBase(8,type,contexts[contextIndex++],random,null));});
    var questions=head.concat(rest);
    questions.push(makeUnionConversion(8,random,carryPlan));
    questions[0].scaffold=PHRASE_SCAFFOLDS[questions[0].wType];
    questions[1].scaffold=PHRASE_SCAFFOLDS[questions[1].wType];
    return finalizeSet(8,questions);
  }

  function buildLv9(random,carryPlan){
    var types=shuffle(compositionTypes(random),random),contexts=shuffle(CONTEXTS,random),questions=[];
    types.forEach(function(type,index){questions.push(makePhraseEqual(9,type,contexts[index],random));});
    questions.push(makeUnionConversion(9,random,carryPlan));
    questions[0].scaffold=PHRASE_SCAFFOLDS[questions[0].wType];
    questions[1].scaffold=PHRASE_SCAFFOLDS[questions[1].wType];
    return finalizeSet(9,questions);
  }

  var LV10_SOURCES={decimal:["percent","wari","fraction"],percent:["decimal","wari","fraction"],fraction:["percent","decimal"],wari:["percent","decimal"]};
  function buildLv10(random,carryPlan){
    for(var attempt=0;attempt<300;attempt++){
      var from=pick(Object.keys(LV10_SOURCES),random),targets=shuffle(LV10_SOURCES[from],random).slice(0,2);
      var firstDirection=from+"_to_"+targets[0],secondDirection=from+"_to_"+targets[1];
      var pool=LEDGER.filter(function(row){return eligibleRow(10,firstDirection,row)&&eligibleRow(10,secondDirection,row);});
      if(!pool.length)continue;
      /* 短ループ想起 (7.4): 同じ行を与件を共有する 2 方向で問う組を 1 組だけ置く。 */
      var pairRow=pick(pool,random);
      var pairIds=[firstDirection+":"+pairRow.band,secondDirection+":"+pairRow.band];
      var third=null;
      if(carryPlan){
        if(carryPlan.row.m===pairRow.m||pairIds.indexOf(carryPlan.patternId)>=0)continue;
        third=makeConversion(10,carryPlan.direction,carryPlan.row,random);
        third.shortLoop=true;
      }else{
        var thirdDirection=pick(DIRECTIONS,random);
        var thirdPool=LEDGER.filter(function(row){
          return row.m!==pairRow.m&&eligibleRow(10,thirdDirection,row)&&pairIds.indexOf(thirdDirection+":"+row.band)<0;
        });
        if(!thirdPool.length)continue;
        third=makeConversion(10,thirdDirection,pick(thirdPool,random),random);
      }
      var w3OnBase=randomValue(random)<0.5,otherType=pick(["W1","W2","W4"],random);
      var contexts=shuffle(CONTEXTS,random);
      var phraseBase=makePhraseBase(10,w3OnBase?"W3":otherType,contexts[0],random,null);
      var phraseEqual=makePhraseEqual(10,w3OnBase?otherType:"W3",contexts[1],random);
      var questions=shuffle([
        makeConversion(10,firstDirection,pairRow,random),
        makeConversion(10,secondDirection,pairRow,random),
        third,phraseBase,phraseEqual
      ],random);
      return finalizeSet(10,questions);
    }
    throw new Error("条件を満たす Lv10 セットを作れません");
  }

  function buildSet(lv,random,carry){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var carryPlan=carryPlanFor(lv,normalizeCarry(carry),random);
    if(lv<=7)return buildConversionSet(lv,random,carryPlan);
    if(lv===8)return buildLv8(random,carryPlan);
    if(lv===9)return buildLv9(random,carryPlan);
    return buildLv10(random,carryPlan);
  }

  /* 12 章の実在証明セット。値と文言は doc の付録そのまま、選択肢位置のみ注入 random で決まる。 */
  var GOLDEN_CONVERSIONS={
    1:[["decimal_to_percent",450],["percent_to_decimal",600],["decimal_to_percent",280],["percent_to_decimal",350],["decimal_to_percent",720]],
    2:[["decimal_to_percent",80],["percent_to_decimal",60],["percent_to_decimal",125],["decimal_to_percent",375],["decimal_to_percent",90]],
    3:[["wari_to_percent",320],["percent_to_wari",450],["wari_to_percent",600],["percent_to_wari",80],["wari_to_percent",70]],
    4:[["wari_to_decimal",150],["decimal_to_wari",280],["wari_to_decimal",640],["decimal_to_wari",70],["wari_to_decimal",30]],
    5:[["fraction_to_decimal",350],["fraction_to_percent",360],["fraction_to_percent",375],["fraction_to_decimal",650],["fraction_to_decimal",625]],
    6:[["percent_to_fraction",400],["decimal_to_fraction",240],["percent_to_fraction",625],["decimal_to_fraction",850],["decimal_to_fraction",375]],
    7:[["decimal_to_percent",1050],["percent_to_decimal",1500],["fraction_to_percent",1200],["decimal_to_percent",1400],["percent_to_fraction",1250]]
  };
  var GOLDEN_PHRASES={
    8:[
      {pattern:"phrase_base",wType:"W1",scaffold:PHRASE_SCAFFOLDS.W1,
        text:"赤いリボンは 60cm です。青いリボンは 赤いリボンの 80% です。もとにする量はどれですか。",
        options:[["赤いリボンの長さ",null],["青いリボンの長さ","words_reversal"],["80% という割合","rate_as_quantity"],["赤と青を合わせた長さ",null]]},
      {pattern:"phrase_base",wType:"W3",scaffold:PHRASE_SCAFFOLDS.W3,
        text:"青いリボンを 1 としたときの 赤いリボンの割合は 1.25 です。もとにする量はどれですか。",
        options:[["青いリボンの長さ",null],["赤いリボンの長さ","words_reversal"],["1.25 という割合","rate_as_quantity"],["赤と青を合わせた長さ",null]]},
      {pattern:"phrase_base",wType:"W2",scaffold:null,
        text:"40人のクラスに対する めがねの子 12人の割合を考えます。もとにする量はどれですか。",
        options:[["クラス全体の 40人",null],["めがねの 12人","words_reversal"],["めがねでない 28人",null],["40人と 12人の合計",null]]},
      {pattern:"phrase_base",wType:"W4",scaffold:null,
        text:"シールが 50枚あります。カードは シールをもとにすると 60% の枚数です。もとにする量はどれですか。",
        options:[["シールの 50枚",null],["カードの枚数","words_reversal"],["60% という割合","rate_as_quantity"],["シールとカードの合計",null]]}
    ],
    9:[
      {pattern:"phrase_equal",wType:"W2",answerWType:"W1",scaffold:PHRASE_SCAFFOLDS.W2,
        text:"「40人に対する 12人の割合は何%ですか」と 同じことを 聞いているのはどれですか。",
        options:[["12人は 40人の何%ですか",null],["40人は 12人の何%ですか","words_reversal"],["40人と 12人の差は何%ですか",null],["40人の 12% は何人ですか",null]]},
      {pattern:"phrase_equal",wType:"W3",answerWType:"W1",scaffold:PHRASE_SCAFFOLDS.W3,
        text:"「200円を 1 としたときの 50円の割合」と 同じことを 聞いているのはどれですか。",
        options:[["50円は 200円の何%ですか",null],["200円は 50円の何%ですか","words_reversal"],["200円と 50円の差は何%ですか",null],["200円の 50% は何円ですか",null]]},
      {pattern:"phrase_equal",wType:"W4",answerWType:"W2",scaffold:null,
        text:"「本全体をもとにすると 読んだページは何%ですか」と 同じことを 聞いているのはどれですか。",
        options:[["本全体に対する 読んだページの割合は何%ですか",null],["読んだページに対する 本全体の割合は何%ですか","words_reversal"],["本全体と 読んだページの差は何%ですか",null],["本全体の 何% が残っていますか",null]]},
      {pattern:"phrase_equal",wType:"W1",answerWType:"W3",scaffold:null,
        text:"「シール 80枚の 25%」と 同じ意味なのはどれですか。",
        options:[["シール 80枚を 1 としたときの 0.25 にあたる枚数",null],["0.25 を 1 としたときの シール 80枚にあたる枚数","words_reversal"],["シール 80枚より 25枚少ない枚数",null],["シール 80枚と 25枚を合わせた枚数",null]]}
    ],
    10:[
      {pattern:"phrase_base",wType:"W1",scaffold:null,
        text:"ノートは 1200円です。えんぴつは その 15% のねだんです。もとにする量はどれですか。",
        options:[["ノートの 1200円",null],["えんぴつのねだん","words_reversal"],["15% という割合","rate_as_quantity"],["ノートとえんぴつの合計",null]]},
      {pattern:"phrase_equal",wType:"W3",answerWType:"W1",scaffold:null,
        text:"「30人を 1 としたときの 6人の割合」と 同じことを 聞いているのはどれですか。",
        options:[["6人は 30人の何%ですか",null],["30人は 6人の何%ですか","words_reversal"],["30人と 6人の差は何%ですか",null],["30人の 6% は何人ですか",null]]}
    ]
  };
  function makeGoldenPhrase(lv,spec,random){
    var question=baseQuestion(lv,"choice",spec.pattern,spec.pattern+":"+spec.wType,spec.text);
    question.wType=spec.wType;question.waza=phraseWaza(spec.wType);
    if(spec.answerWType)question.answerWType=spec.answerWType;
    setChoice(question,spec.options.map(function(entry,index){return option(entry[0],null,index===0,entry[1]);}),random);
    question.scaffold=spec.scaffold;
    return question;
  }
  function buildGoldenSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var questions=[];
    if(lv<=7){
      GOLDEN_CONVERSIONS[lv].forEach(function(entry){questions.push(makeConversion(lv,entry[0],ledgerRow(entry[1]),random));});
      questions[0].scaffold=CONVERSION_SCAFFOLDS[lv];questions[1].scaffold=CONVERSION_SCAFFOLDS[lv];
    }else if(lv<=9){
      GOLDEN_PHRASES[lv].forEach(function(spec){questions.push(makeGoldenPhrase(lv,spec,random));});
      questions.push(makeConversion(lv,lv===8?"decimal_to_percent":"wari_to_percent",ledgerRow(lv===8?600:250),random));
    }else{
      questions.push(makeConversion(10,"decimal_to_percent",ledgerRow(375),random));
      questions.push(makeConversion(10,"decimal_to_fraction",ledgerRow(375),random));
      questions.push(makeConversion(10,"percent_to_decimal",ledgerRow(1250),random));
      GOLDEN_PHRASES[10].forEach(function(spec){questions.push(makeGoldenPhrase(10,spec,random));});
    }
    return finalizeSet(lv,questions);
  }

  function judge(question,answer){
    if(!isObject(question)||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="choice")return isInteger(answer)&&answer===question.ans;
    if(question.kind==="frac"){
      if(!isObject(question.ans)||!isObject(answer))return false;
      return isInteger(answer.n)&&isInteger(answer.d)&&answer.n===question.ans.n&&answer.d===question.ans.d;
    }
    var numeric=typeof answer==="number"?answer:Number(String(answer).replace(/^\s+|\s+$/g,""));
    return isFinite(numeric)&&numeric===question.ans;
  }
  /* frac kind 用の verdict 付き判定。frac_flow の judgeFraction と同じ入出力契約 (whole/num/den)。 */
  function judgeFraction(question,answer){
    if(!isObject(question)||question.kind!=="frac"||!isObject(question.ans))throw new Error("分数問題の指定が正しくありません");
    if(!isObject(answer))throw new Error("分数の答えが正しくありません");
    var whole=answer.whole===undefined||answer.whole===null||answer.whole===""?0:answer.whole;
    if(!isInteger(whole)||whole<0||!isInteger(answer.num)||answer.num<1||!isInteger(answer.den)||answer.den<1)return {correct:false,state:"wrong",note:""};
    var actualN=whole*answer.den+answer.num,actualD=answer.den;
    if(actualN*question.ans.d!==question.ans.n*actualD)return {correct:false,state:"wrong",note:""};
    if(gcdInt(answer.num,answer.den)!==1)return {correct:false,state:"not_reduced",note:"約分が のこっているよ"};
    return {correct:true,state:"correct",note:""};
  }

  global.Q4B_KOMOREBI_RATIO_FORMS={
    config:CONFIG,
    directions:DIRECTIONS.slice(),
    ledger:LEDGER,
    lvSpaces:LV_SPACES,
    lv5Denominators:LV5_DENOMINATORS.slice(),
    frontDenominators:FRONT_DENOMINATORS.slice(),
    unionEntries:UNION_ENTRIES,
    contexts:CONTEXTS,
    compositions:COMPOSITIONS,
    equalAnswerType:EQUAL_ANSWER_TYPE,
    waza:{direction:WAZA_DIRECTION,bandD:WAZA_BAND_D,phraseFront:WAZA_PHRASE_FRONT,phraseBack:WAZA_PHRASE_BACK},
    scaffolds:{conversion:CONVERSION_SCAFFOLDS,phrase:PHRASE_SCAFFOLDS},
    patternIdsFor:patternIdsFor,
    decimalTextOf:decimalTextOf,percentTextOf:percentTextOf,buaiTextOf:buaiTextOf,
    buildSet:buildSet,buildGoldenSet:buildGoldenSet,judge:judge,judgeFraction:judgeFraction
  };
})(window);
