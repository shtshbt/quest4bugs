(function(global){
  "use strict";

  var CONFIG={
    setSize:5,
    patternSpace:{1:2,2:6,3:3,4:6,5:2,6:2,7:2,8:2,9:2,10:18},
    formatMix:{
      1:{normal:5,formulation:0,ordering:0,diagnosis:0},
      2:{normal:2,formulation:3,ordering:0,diagnosis:0},
      3:{normal:3,formulation:2,ordering:0,diagnosis:0},
      4:{normal:2,formulation:1,ordering:0,diagnosis:2},
      5:{normal:2,formulation:0,ordering:2,diagnosis:1},
      6:{normal:3,formulation:0,ordering:0,diagnosis:2},
      7:{normal:2,formulation:1,ordering:0,diagnosis:2},
      8:{normal:2,formulation:1,ordering:1,diagnosis:1},
      9:{normal:2,formulation:1,ordering:0,diagnosis:2},
      10:{normal:1,formulation:1,ordering:1,diagnosis:2}
    }
  };
  var DIAGNOSIS_LABELS={
    correct:"正しい",
    correct_alternative:"正しい (べつのとき方)",
    gap_vs_count:"間の数と個数を取りちがえている",
    type_mismatch:"数えかたの型がちがう",
    remainder_read:"あまりの読み方がちがう",
    corner_double:"かどを 2 回数えている",
    calc_only:"計算だけまちがえている",
    increment_wrong:"ふえる数の見つけ方がちがう"
  };
  var AVAILABLE_ERRORS={
    4:["gap_vs_count","type_mismatch","calc_only"],
    5:["gap_vs_count","remainder_read","calc_only"],
    6:["gap_vs_count","remainder_read","calc_only"],
    7:["gap_vs_count","corner_double","calc_only"],
    8:["gap_vs_count","increment_wrong","calc_only"],
    9:["gap_vs_count","type_mismatch","increment_wrong","calc_only"],
    10:["gap_vs_count","type_mismatch","remainder_read","corner_double","calc_only","increment_wrong"]
  };
  var ALTERNATIVE_LEVELS=[6,8,9,10];
  var RELATION_PHRASES={
    both_ends:[
      "両はしにも立てます","りょうはしをふくめて立てます","はしからはしまで、はしにも置きます",
      "まっすぐ一列にならんでいます","両はしをふくめて立っています","はしからはしまで一列に立っています"
    ],
    no_ends:[
      "両はしには立てません","はしには置かず、間だけに立てます","両はしをのぞいて立てます",
      "ビルとビルの間だけに立っています","両はしをのぞいて立っています","はしには何もありません"
    ],
    loop:[
      "まわりに立てます","一周して立てます","わになるように立てます",
      "池のまわりに立っています","まるく一周ならんでいます","わになってならんでいます"
    ],
    sequence_both:["最後の数まで数えます","終わりの数もふくめます","はじめから終わりまで数えます"],
    sequence_none:["はじめとおわりをのぞきます","両はしをのぞきます","まん中だけ数えます"]
  };
  var IMPLICIT_CONTEXTS=["building","bridge","room"];
  var COLORS=["赤","青","黄","緑"];
  var GAP_VALUES=[2,3,4,5,6,8,10];
  var ALL_PATTERN_IDS=[
    "ueki:both_ends:count","ueki:no_ends:count","ueki:loop:count",
    "ueki:both_ends:gap","ueki:no_ends:gap","ueki:loop:gap",
    "ueki:both_ends:span","ueki:no_ends:span","ueki:loop:span",
    "shuuki:none:kindAt","shuuki:none:occurrences","shuuki:none:position",
    "houjin:none:perimeter","houjin:none:side",
    "sequence:none:term","sequence:none:terms","sequence:both_ends:terms","sequence:no_ends:terms"
  ];
  var MAX_SAFE_INTEGER=9007199254740991;

  function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}
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
  function range(min,max){var values=[];for(var value=min;value<=max;value++)values.push(value);return values;}
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function patternId(domain,relation,unknown){return domain+":"+(relation||"none")+":"+unknown;}
  function semanticAnswer(question){return hasOwn(question,"answerValue")?question.answerValue:question.ans;}
  function answerText(value){return typeof value==="number"?String(Math.round(value*1000)/1000):String(value);}

  function cueObjects(relation,random){
    return shuffle(RELATION_PHRASES[relation].map(function(text,index){return {id:relation+"_"+(index+1),text:text};}),random);
  }

  function wazaFor(domain,relation,unknown){
    if(domain==="shuuki")return {primary:"くり返しはわって、あまりを位置として読む",alternate:"あまり 0 はくり返しのさいご"};
    if(domain==="houjin")return {primary:"かどは 2 つの辺に入るので、1 辺ずつ数えるなら 1 こぬく",alternate:"小さい数で一度数えてみる"};
    if(domain==="sequence")return {primary:unknown==="term"?"ふえる回数は、項の数より 1 少ない":"まず間の数を出す。ものの数はそのあと",alternate:"小さい数で一度数えてみる"};
    if(relation==="loop")return {primary:"輪になったら、ものの数は間の数と同じ",alternate:"小さい数で一度数えてみる"};
    if(relation==="no_ends")return {primary:"両はしをのぞくなら、ものは間より 1 少ない",alternate:"小さい数で一度数えてみる"};
    return {primary:"両はしにもあるなら、ものは間より 1 多い",alternate:"小さい数で一度数えてみる"};
  }

  function baseQuestion(lv,format,kind,domain,relation,relationCue,unknown,params,text){
    return {
      cat:"kom_kisokusei",format:format,kind:kind,lv:lv,domain:domain,relation:relation,
      relationCue:relationCue,relationPhrasing:null,unknown:unknown,params:copy(params),text:text,
      scaffold:null,ans:null,answerValue:null,patternId:patternId(domain,relation,unknown),pairId:null,
      pairWith:null,errorType:null,chainId:null,chainRole:null,chainModelId:null,waza:wazaFor(domain,relation,unknown)
    };
  }

  function option(text,value,correct,errorType,signature){
    return {text:text,value:value,correct:!!correct,errorType:errorType||null,signature:signature||null};
  }

  function setChoice(question,options,random){
    if(!Array.isArray(options)||options.length!==4)throw new Error("選択肢を 4 個作れません");
    for(var i=0;i<options.length;i++)for(var j=i+1;j<options.length;j++){
      if(options[i].text===options[j].text)throw new Error("同じ選択肢があります");
      if(typeof options[i].value==="number"&&typeof options[j].value==="number"&&Math.abs(options[i].value-options[j].value)<1e-9)throw new Error("同値の選択肢があります");
    }
    var mixed=shuffle(options,random),correctCount=mixed.filter(function(item){return item.correct;}).length;
    if(correctCount!==1)throw new Error("正解が 1 個ではありません");
    question.choices=mixed.map(function(item){return item.text;});
    question.choiceValues=mixed.map(function(item){return item.value;});
    question.choiceErrorTypes=mixed.map(function(item){return item.errorType;});
    question.choiceSignatures=mixed.map(function(item){return item.signature;});
    question.ans=mixed.map(function(item){return item.correct;}).indexOf(true);
    return question;
  }

  function relationCount(relation,gaps){
    if(relation==="both_ends")return gaps+1;
    if(relation==="no_ends")return gaps-1;
    if(relation==="loop")return gaps;
    throw new Error("数えかたの型が正しくありません");
  }

  function implicitText(kind,unknown,params){
    var place=kind==="bridge"?"橋の両はしに門があります。門と門の間":(kind==="room"?"部屋の両がわにかべがあります。かべとかべの間":"道の両はしにビルが建っています。ビルとビルの間");
    if(unknown==="count")return "長さ "+params.span+"m の"+place+"に、"+params.gap+"m おきに木を立てます。木は何本ですか。";
    if(unknown==="gap")return place+"に木が "+params.count+" 本、同じ間かくで立っています。端から端までは "+params.span+"m です。間かくは何 m ですか。";
    return place+"に木が "+params.count+" 本、"+params.gap+"m おきに立っています。端から端までは何 m ですか。";
  }

  function makeLv1Question(unknown,value,cue,scaffold){
    var count=unknown==="gaps"?value:value+1,gaps=count-1;
    var text=unknown==="gaps"
      ?"木が "+count+" 本、"+cue.text+"。木と木の間はいくつありますか。"
      :"間が "+gaps+" つあります。"+cue.text+"。木は何本ですか。";
    var question=baseQuestion(1,"normal","num","ueki","both_ends","explicit",unknown,{count:count,gaps:gaps},text);
    question.relationPhrasing=cue.id;question.ans=unknown==="gaps"?gaps:count;question.answerValue=question.ans;question.scaffold=scaffold||null;
    return question;
  }

  function makeLv2Normal(relation,gaps,cue,scaffold){
    var count=relationCount(relation,gaps);
    var question=baseQuestion(2,"normal","num","ueki",relation,"explicit","count",{count:count,gaps:gaps},"間が "+gaps+" つあります。"+cue.text+"。木は何本ですか。");
    question.relationPhrasing=cue.id;question.answerValue=count;question.ans=count;question.scaffold=scaffold||null;
    return question;
  }

  function uekiText(relation,cue,unknown,params,implicitKind){
    if(implicitKind)return implicitText(implicitKind,unknown,params);
    var place=relation==="loop"?"まわりが "+params.span+"m の池":"長さ "+params.span+"m のまっすぐな道";
    if(unknown==="count")return place+"に、"+params.gap+"m おきに木を置きます。"+cue.text+"。木は何本ですか。";
    if(unknown==="gap")return place+"に木が "+params.count+" 本あります。"+cue.text+"。間かくは何 m ですか。";
    return "木が "+params.count+" 本、"+params.gap+"m おきに立っています。"+cue.text+"。端から端までの長さは何 m ですか。";
  }

  function makeUeki(lv,relation,unknown,params,cue,implicitKind){
    var relationCue=implicitKind?"implicit":"explicit";
    var question=baseQuestion(lv,"normal","num","ueki",relation,relationCue,unknown,params,uekiText(relation,cue,unknown,params,implicitKind));
    question.relationPhrasing=implicitKind?null:cue.id;question.implicitContext=implicitKind||null;
    question.answerValue=solve(question);question.ans=question.answerValue;
    return question;
  }

  function makeRelationQuestion(lv,relation,cue,random){
    var context=relation==="loop"?"池のまわりに木を置きます。":"まっすぐな道に木を置きます。";
    var question=baseQuestion(lv,"formulation","choice","ueki",relation,"explicit","relation",{},context+cue.text+"。木の数と間の数の関係はどれですか。");
    question.relationPhrasing=cue.id;question.answerValue=relation;
    var labels={
      both_ends:"木の数 = 間の数 + 1",no_ends:"木の数 = 間の数 - 1",loop:"木の数 = 間の数",
      plus_two:"木の数 = 間の数 + 2",double:"木の数 = 間の数 × 2"
    };
    var wrong=shuffle(["both_ends","no_ends","loop","plus_two","double"].filter(function(value){return value!==relation;}),random).slice(0,3);
    return setChoice(question,[option(labels[relation],relation,true,null,"relation")].concat(wrong.map(function(value){return option(labels[value],value,false,"type_mismatch","relation");})),random);
  }

  function formulationOptions(question){
    var p=question.params,correct=question.answerValue,values=[];
    if(question.domain==="ueki"){
      if(question.unknown==="count"){
        var quotient=p.span/p.gap,adjust=question.relation==="both_ends"?1:(question.relation==="no_ends"?-1:0);
        values=[
          option(p.span+"÷"+p.gap+(adjust>0?"+1":(adjust<0?"-1":"")),correct,true,null,"divide_adjust"),
          option(p.gap+"÷"+p.span+(adjust>0?"+1":(adjust<0?"-1":"")),p.gap/p.span+adjust,false,"calc_only","divide_adjust"),
          option(p.span+"÷"+p.gap+(adjust===1?"-1":"+1"),quotient+(adjust===1?-1:1),false,"type_mismatch","divide_adjust"),
          option(p.span+"×"+p.gap,p.span*p.gap,false,"gap_vs_count","multiply")
        ];
      }else if(question.unknown==="gap"){
        var count=p.count,denominator=p.gaps;
        values=[
          option(p.span+"÷("+count+(question.relation==="both_ends"?"-1":(question.relation==="no_ends"?"+1":""))+")",correct,true,null,"divide_adjust"),
          option(count+"÷("+p.span+"-1)",count/(p.span-1),false,"calc_only","divide_adjust"),
          option(p.span+"÷"+(denominator+1),p.span/(denominator+1),false,"gap_vs_count","divide"),
          option(p.span+"÷"+(denominator+2),p.span/(denominator+2),false,"type_mismatch","divide_adjust")
        ];
      }else{
        var factor=p.gaps;
        values=[
          option(p.gap+"×("+p.count+(question.relation==="both_ends"?"-1":(question.relation==="no_ends"?"+1":""))+")",correct,true,null,"multiply_adjust"),
          option(p.gap+"×("+p.count+(question.relation==="both_ends"?"-1":(question.relation==="no_ends"?"+1":""))+")+1",correct+1,false,"calc_only","multiply_adjust"),
          option(p.gap+"×"+(factor+1),p.gap*(factor+1),false,"gap_vs_count","multiply"),
          option(p.gap+"×"+(factor+2),p.gap*(factor+2),false,"type_mismatch","multiply_adjust")
        ];
      }
    }else if(question.domain==="shuuki"){
      if(question.unknown==="kindAt"){
        var correctIndex=p.sequence.indexOf(correct),wrongColors=COLORS.filter(function(color){return color!==correct;});
        values=[option(p.n+"÷"+p.p+" のあまりを位置として "+correct+"",correct,true,null,"remainder_position")];
        wrongColors.forEach(function(color,index){values.push(option(p.n+"÷"+p.p+" のあまりを "+(index+1)+" ずらして "+color,color,false,"remainder_read","remainder_position"));});
        if(correctIndex<0)throw new Error("周期の答えを作れません");
      }else if(question.unknown==="occurrences"){
        var full=Math.floor(p.n/p.p),per=p.sequence.filter(function(color){return color===p.target;}).length,prefix=p.sequence.slice(0,p.n%p.p).filter(function(color){return color===p.target;}).length;
        values=[
          option(full+"×"+per+"+"+prefix,correct,true,null,"multiply_add"),
          option(per+"×"+full+"+"+(prefix+1),full*per+prefix+1,false,"remainder_read","multiply_add"),
          option((full-1)+"×"+per+"+"+prefix,(full-1)*per+prefix,false,"gap_vs_count","multiply_add"),
          option(p.n+"÷"+p.p+"+0.5",correct+0.5,false,"calc_only","divide_add")
        ];
      }else{
        values=[
          option("("+p.m+"-1)×"+p.p+"+"+p.targetIndex,correct,true,null,"subtract_multiply_add"),
          option("("+p.m+"-2)×"+p.p+"+"+p.targetIndex,(p.m-2)*p.p+p.targetIndex,false,"calc_only","subtract_multiply_add"),
          option(p.m+"×"+p.p+"+"+p.targetIndex,p.m*p.p+p.targetIndex,false,"gap_vs_count","multiply_add"),
          option("("+p.m+"-1)×"+p.p+"+"+(p.targetIndex+1),(p.m-1)*p.p+p.targetIndex+1,false,"remainder_read","subtract_multiply_add")
        ];
      }
    }else if(question.domain==="houjin"){
      if(question.unknown==="perimeter")values=[
        option("("+p.side+"-1)×4",correct,true,null,"subtract_multiply"),
        option("("+p.side+"-2)×4",(p.side-2)*4,false,"gap_vs_count","subtract_multiply"),
        option(p.side+"×4",p.side*4,false,"corner_double","multiply"),
        option("("+p.side+"+1)×4",(p.side+1)*4,false,"calc_only","add_multiply")
      ];
      else values=[
        option(p.perimeter+"÷4+1",correct,true,null,"divide_add"),
        option("4÷"+p.perimeter+"+1",4/p.perimeter+1,false,"calc_only","divide_add"),
        option(p.perimeter+"÷4",p.perimeter/4,false,"gap_vs_count","divide"),
        option(p.perimeter+"÷4-1",p.perimeter/4-1,false,"corner_double","divide_subtract")
      ];
    }else if(question.domain==="sequence"){
      if(question.unknown==="term")values=[
        option(p.a+" + "+p.d+"×"+(p.n-1),correct,true,null,"add_multiply"),
        option(p.d+" + "+p.a+"×"+(p.n-1),p.d+p.a*(p.n-1),false,"increment_wrong","add_multiply"),
        option(p.a+" + "+p.d+"×"+p.n,p.a+p.d*p.n,false,"gap_vs_count","add_multiply"),
        option(p.a+"×"+p.n,p.a*p.n,false,"calc_only","multiply")
      ];
      else{
        var gaps=(p.last-p.a)/p.d,adjustTerms=question.relation==="no_ends"?-1:1;
        values=[
          option("("+p.last+"-"+p.a+")÷"+p.d+(adjustTerms>0?"+1":"-1"),correct,true,null,"subtract_divide_adjust"),
          option("("+p.last+"-"+p.d+")÷"+p.a+(adjustTerms>0?"+1":"-1"),(p.last-p.d)/p.a+adjustTerms,false,"increment_wrong","subtract_divide_adjust"),
          option("("+p.last+"-"+p.a+")÷"+p.d,gaps,false,"gap_vs_count","subtract_divide"),
          option("("+p.last+"-"+p.a+")÷"+p.d+(adjustTerms>0?"-1":"+1"),gaps-adjustTerms,false,"type_mismatch","subtract_divide_adjust")
        ];
      }
    }
    return values;
  }

  function asFormulation(source,random){
    var question=copy(source);
    question.format="formulation";question.kind="choice";question.text=source.text.replace(/ですか。$/,"ですか。求める式を選びましょう。");
    return setChoice(question,formulationOptions(source),random);
  }

  function periodicModel(n,random){
    if(!random)return {sequence:["赤","青","青","黄"],p:4,n:n,target:"青",m:n,targetIndex:1};
    var p=pick(range(3,Math.min(6,Math.floor(n/2))),random),target=pick(COLORS,random),targetIndex=pick(range(1,p),random),others=COLORS.filter(function(color){return color!==target;}),sequence=[];
    for(var index=1;index<=p;index++)sequence.push(index===targetIndex?target:pick(others,random));
    return {sequence:sequence,p:p,n:n,target:target,m:n,targetIndex:targetIndex};
  }
  function periodicText(unknown,params){
    var sequence=params.sequence.join("、")+"の順にくり返してならべます。";
    if(unknown==="kindAt")return sequence+"左から "+params.n+" 番目は何色ですか。";
    if(unknown==="occurrences")return sequence+"左から "+params.n+" 番目までに "+params.target+"は何こありますか。";
    return sequence+params.sequence[params.targetIndex-1]+"が "+params.m+" 回目に出るのは左から何番目ですか。";
  }

  function makePeriodic(lv,unknown,params,random){
    var question=baseQuestion(lv,"normal",unknown==="kindAt"?"choice":"num","shuuki",null,"none",unknown,params,periodicText(unknown,params));
    question.answerValue=solve(question);
    if(unknown==="kindAt")return setChoice(question,COLORS.map(function(color){return option(color,color,color===question.answerValue,null,"color");}),random);
    question.ans=question.answerValue;return question;
  }

  function makeHoujin(lv,unknown,value){
    var params=unknown==="perimeter"?{side:value,perimeter:4*(value-1)}:{side:value/4+1,perimeter:value};
    var text=unknown==="perimeter"
      ?"1 辺 "+params.side+" この正方形に、ご石をすきまなくならべます。いちばん外がわのご石は何こですか。"
      :"外がわだけにご石をならべたら "+params.perimeter+" こ使いました。1 辺は何こですか。";
    var question=baseQuestion(lv,"normal","num","houjin",null,"none",unknown,params,text);
    question.answerValue=solve(question);question.ans=question.answerValue;return question;
  }

  function sequenceRuleText(relation,unknown,params){
    if(unknown==="term")return params.a+" から "+params.d+" ずつふえる数がならんでいます。"+params.n+" 番目の数はいくつですか。";
    var cue=relation==="no_ends"?"はじめとおわりをのぞくと":"最後の数まで数えると";
    return params.a+" から "+params.d+" ずつふえて "+params.last+" までならびます。"+cue+"、数は何こですか。";
  }

  function makeSequence(lv,relation,unknown,params,style,cue){
    var text;
    if(unknown==="term"&&style==="enumeration")text=params.a+", "+(params.a+params.d)+", "+(params.a+2*params.d)+", "+(params.a+3*params.d)+", ... とならんでいます。"+params.n+" 番目の数はいくつですか。";
    else if(unknown==="terms"&&relation!==null&&cue)text=params.a+" から "+params.d+" ずつふえて "+params.last+" までならびます。"+cue.text+"。数は何こですか。";
    else text=sequenceRuleText(relation,unknown,params);
    var relationCue=relation===null?"none":"explicit";
    var question=baseQuestion(lv,"normal","num","sequence",relation,relationCue,unknown,params,text);
    question.sequenceStyle=style||"rule";question.relationPhrasing=cue?cue.id:null;question.answerValue=solve(question);question.ans=question.answerValue;return question;
  }

  function solve(question){
    if(!isObject(question)||!isObject(question.params))throw new Error("問題の指定が正しくありません");
    var p=question.params;
    if(question.domain==="ueki"){
      if(question.unknown==="relation")return question.relation;
      if(question.unknown==="gaps")return p.count-1;
      if(question.unknown==="count")return relationCount(question.relation,p.gaps);
      if(question.unknown==="gap")return p.span/p.gaps;
      if(question.unknown==="span")return p.gap*p.gaps;
    }
    if(question.domain==="shuuki"){
      if(question.unknown==="kindAt")return p.sequence[(p.n-1)%p.p];
      if(question.unknown==="occurrences")return Math.floor(p.n/p.p)*p.sequence.filter(function(color){return color===p.target;}).length+p.sequence.slice(0,p.n%p.p).filter(function(color){return color===p.target;}).length;
      if(question.unknown==="position")return (p.m-1)*p.p+p.targetIndex;
    }
    if(question.domain==="houjin")return question.unknown==="perimeter"?4*(p.side-1):p.perimeter/4+1;
    if(question.domain==="sequence"){
      if(question.unknown==="term")return p.a+p.d*(p.n-1);
      return (p.last-p.a)/p.d+(question.relation==="no_ends"?-1:1);
    }
    throw new Error("答えを計算できません");
  }

  function standardWork(source){
    var p=source.params,remainder,per,prefix,gaps;
    if(source.domain==="ueki"){
      if(source.unknown==="count")return p.span+"÷"+p.gap+(source.relation==="both_ends"?"+1":(source.relation==="no_ends"?"-1":""));
      if(source.unknown==="gap")return p.span+"÷"+p.gaps;
      return p.gap+"×"+p.gaps;
    }
    if(source.domain==="shuuki"){
      if(source.unknown==="kindAt"){
        remainder=p.n%p.p;
        return p.n+"÷"+p.p+"="+Math.floor(p.n/p.p)+" あまり "+remainder+"、"+(remainder||p.p)+" 番目の "+solve(source);
      }
      if(source.unknown==="occurrences"){
        per=p.sequence.filter(function(color){return color===p.target;}).length;
        prefix=p.sequence.slice(0,p.n%p.p).filter(function(color){return color===p.target;}).length;
        return Math.floor(p.n/p.p)+"×"+per+"+"+prefix;
      }
      return "("+p.m+"-1)×"+p.p+"+"+p.targetIndex;
    }
    if(source.domain==="houjin")return source.unknown==="perimeter"?"("+p.side+"-1)×4":p.perimeter+"÷4+1";
    if(source.unknown==="term")return p.a+"+"+p.d+"×("+p.n+"-1)";
    gaps=(p.last-p.a)/p.d;
    return "("+p.last+"-"+p.a+")÷"+p.d+(source.relation==="no_ends"?"-1":"+1");
  }

  function alternativeWork(source){
    var p=source.params,expected=solve(source),offset,positions=[];
    if(source.domain==="ueki"){
      if(source.unknown==="count")return p.gaps+(source.relation==="both_ends"?"+1":(source.relation==="no_ends"?"-1":"+0"));
      if(source.unknown==="gap")return p.span+"m を "+p.gaps+" 等分して "+expected+"m";
      return p.gap+"m を "+p.gaps+" 回たして "+expected+"m";
    }
    if(source.domain==="shuuki"){
      if(source.unknown==="kindAt")return p.sequence.join("、")+"をくり返して "+p.n+" 番目は "+expected;
      if(source.unknown==="occurrences")return p.n+" 番目までの "+p.target+"を数えて "+expected+"こ";
      for(var index=0;index<Math.min(3,p.m);index++)positions.push(p.targetIndex+index*p.p);
      return positions.join(", ")+", ... と "+p.p+" ずつたして "+p.m+" こ目は "+expected;
    }
    if(source.domain==="houjin")return source.unknown==="perimeter"?p.side+"×4-4":("("+p.perimeter+"+4)÷4");
    if(source.unknown==="term"){
      offset=p.a-p.d;
      return p.d+"×"+p.n+(offset<0?"-"+Math.abs(offset):"+"+offset);
    }
    if(source.relation==="no_ends")return p.n+"こから両はしの 2 こを引いて "+expected+"こ";
    return p.a+"から "+p.d+"ずつ数えて "+expected+"こ";
  }

  function diagnosisData(source,errorType){
    var p=source.params,expected=semanticAnswer(source),shown=expected,expression=standardWork(source);
    if(errorType==="correct_alternative")expression=alternativeWork(source);
    else if(errorType==="gap_vs_count"){
      if(source.domain==="ueki"&&source.unknown==="gap"){shown=p.span/p.count;expression=p.span+"÷"+p.count;}
      else if(source.domain==="ueki"&&source.unknown==="span"){shown=p.gap*p.count;expression=p.gap+"×"+p.count;}
      else if(source.domain==="shuuki"&&source.unknown==="position"){shown=p.m*p.p+p.targetIndex;expression=p.m+"×"+p.p+"+"+p.targetIndex;}
      else if(source.domain==="shuuki"){shown=Math.max(1,expected-1);expression="くり返しを 1 回少なく数える";}
      else if(source.domain==="houjin"&&source.unknown==="side"){shown=p.perimeter/4;expression=p.perimeter+"÷4";}
      else if(source.domain==="sequence"&&source.unknown==="term"){shown=p.a+p.d*p.n;expression=p.a+"+"+p.d+"×"+p.n;}
      else if(source.domain==="sequence"){shown=(p.last-p.a)/p.d;expression="("+p.last+"-"+p.a+")÷"+p.d;}
      else{shown=Math.max(1,expected-1);expression="間の数をそのまま答える";}
    }else if(errorType==="type_mismatch"){
      var wrongAdjust=source.relation==="both_ends"?-1:1,wrongGapAdjust=-wrongAdjust;
      if(source.domain==="ueki"&&source.unknown==="count"){shown=p.gaps+wrongAdjust;expression=p.span+"÷"+p.gap+(wrongAdjust<0?"-1":"+1");}
      else if(source.domain==="ueki"&&source.unknown==="gap"){shown=p.span/(p.count+wrongGapAdjust);expression=p.span+"÷("+p.count+(wrongGapAdjust<0?"-1":"+1")+")";}
      else if(source.domain==="ueki"&&source.unknown==="span"){shown=p.gap*(p.count+wrongGapAdjust);expression=p.gap+"×("+p.count+(wrongGapAdjust<0?"-1":"+1")+")";}
      else if(source.domain==="sequence"){shown=(p.last-p.a)/p.d+wrongAdjust;expression="("+p.last+"-"+p.a+")÷"+p.d+(wrongAdjust<0?"-1":"+1");}
      else{shown=expected+1;expression="別の数えかたを使う";}
    }else if(errorType==="remainder_read"){
      if(source.unknown==="kindAt"){shown=p.sequence[p.n%p.p];expression=p.n+"÷"+p.p+" のあまりを次の位置と読む";}
      else{shown=expected+1;expression="あまりの分を 1 こ多く数える";}
    }else if(errorType==="corner_double"){
      shown=p.side*4;expression=p.side+"×4";
    }else if(errorType==="increment_wrong"){
      var second=p.a+p.d;shown=source.unknown==="term"?p.a+second*(p.n-1):Math.max(1,Math.floor((p.last-p.a)/second)+1);expression="ふえる数を "+second+" と読む";
    }else if(errorType==="calc_only"){
      shown=typeof expected==="number"?expected+1:COLORS[(COLORS.indexOf(expected)+1)%COLORS.length];expression="正しい式の計算だけを 1 まちがえる";
    }
    if(errorType!=="correct"&&errorType!=="correct_alternative"&&shown===expected)shown=typeof expected==="number"?expected+1:COLORS[(COLORS.indexOf(expected)+1)%COLORS.length];
    return {expected:expected,shown:shown,expression:expression};
  }

  function combinations(values,count){
    var result=[];
    function visit(start,chosen){
      if(chosen.length===count){result.push(chosen.slice());return;}
      for(var index=start;index<values.length;index++){chosen.push(values[index]);visit(index+1,chosen);chosen.pop();}
    }
    visit(0,[]);return result;
  }

  function makeDiagnosis(source,errorType,random,usedCombos){
    var available=AVAILABLE_ERRORS[source.lv],positive=errorType==="correct"||errorType==="correct_alternative";
    if(!available)throw new Error("診断ラベルを作れません");
    var candidates=combinations(available,3).filter(function(group){return positive||group.indexOf(errorType)>=0;});
    var unused=candidates.filter(function(group){return usedCombos.indexOf(group.slice().sort().join("|"))<0;});
    var errors=pick(unused.length?unused:candidates,random),comboKey=errors.slice().sort().join("|");
    usedCombos.push(comboKey);
    var data=diagnosisData(source,errorType),question=copy(source);
    question.format="diagnosis";question.kind="choice";question.text="もんだい: "+source.text+" 答案のどこを確かめますか。";
    question.errorType=errorType;question.expectedAnswer=data.expected;question.shownAnswer=data.shown;question.answerValue=data.expected;
    question.work=["しき "+data.expression,"こたえ "+answerText(data.shown)];
    question.diagnosisEvidence={errorType:errorType,expected:data.expected,shown:data.shown};
    question.diagnosisErrorOptions=errors.slice();question.diagnosisCombo=comboKey;
    var correctType=positive?errorType:"correct",types=[correctType].concat(errors);
    return setChoice(question,types.map(function(type){return option(DIAGNOSIS_LABELS[type],type,type===errorType,type,"diagnosis");}),random);
  }

  function diagnosisTypes(lv,baseTypes,random,golden){
    if(golden)return baseTypes.slice();
    var result=lv===10?baseTypes.slice():shuffle(AVAILABLE_ERRORS[lv],random).slice(0,baseTypes.length),positiveChance=result.length===1?0.25:0.5;
    if(randomValue(random)<positiveChance){
      var index=result.length===1?0:Math.floor(randomValue(random)*result.length);
      result[index]=ALTERNATIVE_LEVELS.indexOf(lv)>=0?"correct_alternative":"correct";
    }
    return result;
  }

  function orderingTexts(pattern,params){
    if(pattern==="shuuki:none:kindAt")return {text:periodicText("kindAt",params)+"手順を正しい順にならべましょう。",steps:[params.p+" つで一くり返し",params.n+"÷"+params.p+"="+Math.floor(params.n/params.p)+" あまり "+(params.n%params.p),"あまり "+(params.n%params.p)+" は "+solve({domain:"shuuki",unknown:"kindAt",params:params})]};
    if(pattern==="shuuki:none:occurrences")return {text:periodicText("occurrences",params)+"手順を正しい順にならべましょう。",steps:[params.p+" つで一くり返し",params.n+"÷"+params.p+"="+Math.floor(params.n/params.p)+" あまり "+(params.n%params.p),"答えは "+solve({domain:"shuuki",unknown:"occurrences",params:params})+" こ"]};
    if(pattern==="shuuki:none:position")return {text:periodicText("position",params)+"手順を正しい順にならべましょう。",steps:[params.m+" 回目までの間は "+(params.m-1)+" つ",(params.m-1)+"×"+params.p+"="+((params.m-1)*params.p),"答えは "+solve({domain:"shuuki",unknown:"position",params:params})+" 番目"]};
    if(pattern==="houjin:none:perimeter")return {text:"1 辺 "+params.side+" この正方形の外がわを数えます。手順を正しい順にならべましょう。",steps:[params.side+"-1="+(params.side-1)+" こ分",(params.side-1)+"×4="+(4*(params.side-1)),"答えは "+(4*(params.side-1))+" こ"]};
    if(pattern==="houjin:none:side")return {text:"外がわが "+params.perimeter+" この正方形の 1 辺を求めます。手順を正しい順にならべましょう。",steps:[params.perimeter+"÷4="+(params.perimeter/4),params.perimeter/4+"+1="+(params.perimeter/4+1),"答えは "+(params.perimeter/4+1)+" こ"]};
    if(pattern==="sequence:none:term")return {text:sequenceRuleText(null,"term",params)+"手順を正しい順にならべましょう。",steps:[params.n+"-1="+(params.n-1)+" 回",params.d+"×"+(params.n-1)+"="+(params.d*(params.n-1)),params.a+"+"+(params.d*(params.n-1))+"="+(params.a+params.d*(params.n-1))]};
    return {text:sequenceRuleText(pattern.indexOf(":no_ends:")>=0?"no_ends":"both_ends","terms",params)+"手順を正しい順にならべましょう。",steps:[params.last+"-"+params.a+"="+(params.last-params.a),(params.last-params.a)+"÷"+params.d+"="+((params.last-params.a)/params.d)+" 回","答えは "+solve({domain:"sequence",relation:pattern.indexOf(":no_ends:")>=0?"no_ends":"both_ends",unknown:"terms",params:params})+" こ"]};
  }

  function orderingSemantics(pattern,position){
    var keys,plans;
    if(pattern==="shuuki:none:kindAt"){
      keys=["period","remainder","answer"];
      plans=["くり返しの長さを見つける","くり返しが何回分あるかを見る","あまりを列の位置として読む"];
    }else if(pattern==="shuuki:none:occurrences"){
      keys=["period","target_count","answer"];
      plans=["一くり返しの長さを見つける","くり返しの回数を数える","あまりの中の目あての色を数える"];
    }else if(pattern==="shuuki:none:position"){
      keys=["interval_count","period_span","answer"];
      plans=["同じ色どうしの間を数える","くり返しの長さを使う","周期内の位置をもどす"];
    }else if(pattern==="houjin:none:perimeter"){
      keys=["edge_gaps","perimeter","answer"];
      plans=["一辺の間の数を見つける","四つの辺を同じように数える","外がわの個数として答える"];
    }else if(pattern==="houjin:none:side"){
      keys=["edge_gaps","side_count","answer"];
      plans=["外がわを四つの辺に分ける","一辺分は間の数だと確かめる","最後に個数へもどす"];
    }else if(pattern==="sequence:none:term"){
      keys=["increase_count","increase_total","answer"];
      plans=["ふえる回数を先に数える","ふえた分をまとめて数える","初めの数を最後にたす"];
    }else{
      keys=["difference","increase_count","answer"];
      plans=["初めと終わりのちがいを見る","ふえる回数を求める","両はしを数えるか確かめる"];
    }
    return {keys:keys,planText:plans[position],planKey:"plan_"+keys[position]};
  }

  function makeOrdering(lv,pattern,params,random){
    var pieces=pattern.split(":"),domain=pieces[0],relation=pieces[1]==="none"?null:pieces[1],unknown=pieces[2];
    var content=orderingTexts(pattern,params),cue=null,numberFreePosition=Math.floor(randomValue(random)*3);
    if(domain==="sequence"&&relation!==null){
      cue=cueObjects(relation==="no_ends"?"sequence_none":"sequence_both",random)[0];
      content.text=params.a+" から "+params.d+" ずつふえて "+params.last+" までならびます。"+cue.text+"。数は何こですか。手順を正しい順にならべましょう。";
    }
    var semantics=orderingSemantics(pattern,numberFreePosition),canonical=[];
    for(var canonicalIndex=0;canonicalIndex<4;canonicalIndex++){
      if(canonicalIndex===numberFreePosition){
        canonical.push({text:semantics.planText,requires:canonicalIndex?[semantics.keys[canonicalIndex-1]]:[],produces:[semantics.planKey]});
      }else{
        var numericIndex=canonicalIndex<numberFreePosition?canonicalIndex:canonicalIndex-1,requires=numericIndex?[semantics.keys[numericIndex-1]]:[];
        if(numericIndex===numberFreePosition)requires=requires.concat([semantics.planKey]);
        canonical.push({text:content.steps[numericIndex],requires:requires,produces:[semantics.keys[numericIndex]]});
      }
    }
    var storageOrder=shuffle([0,1,2,3],random),canonicalToStored=[],parts=[];
    storageOrder.forEach(function(canonicalIndex,storedIndex){canonicalToStored[canonicalIndex]=storedIndex;});
    storageOrder.forEach(function(canonicalIndex){parts.push(canonical[canonicalIndex]);});
    var question=baseQuestion(lv,"ordering","order",domain,relation,relation===null?"none":"explicit",unknown,params,content.text);
    question.relationPhrasing=cue?cue.id:null;
    question.parts=parts;question.ans=[canonicalToStored[0],canonicalToStored[1],canonicalToStored[2],canonicalToStored[3]];
    question.displayOrder=shuffle([0,1,2,3],random);question.numberFreePosition=numberFreePosition;
    question.answerValue=solve(question);return question;
  }

  function markChain(recognition,normal,id){
    if(recognition.domain!==normal.domain||recognition.relation!==normal.relation)throw new Error("連鎖の意味モデルが一致しません");
    if(recognition.lv===2?recognition.patternId===normal.patternId:recognition.patternId!==normal.patternId)throw new Error("連鎖の patternId が正しくありません");
    recognition.chainId=id;recognition.chainRole="recognition";recognition.chainModelId=id+":"+recognition.domain+":"+recognition.relation;
    normal.chainId=id;normal.chainRole="normal";normal.chainModelId=recognition.chainModelId;
  }
  function markPair(first,second,id){first.pairId=id;second.pairId=id;}

  function finalizeSet(lv,questions){
    if(!Array.isArray(questions)||questions.length!==CONFIG.setSize)throw new Error("5問セットを作れません");
    questions.forEach(function(question,index){
      question.lv=lv;question.id="kisokusei_"+lv+"_q"+(index+1);
      var value=semanticAnswer(question);
      if(typeof value==="number"&&(!isFinite(value)||value<=0||value>9999||Math.floor(value)!==value))throw new Error("答えが正の整数ではありません");
    });
    questions.forEach(function(question){
      if(!question.pairId)return;
      var mate=questions.filter(function(candidate){return candidate!==question&&candidate.pairId===question.pairId;})[0];
      if(!mate)throw new Error("対比ペアを作れません");
      question.pairWith=mate.id;
    });
    return questions;
  }

  function randomUekiModel(random,minGaps,maxGaps){
    var gaps=pick(range(minGaps,maxGaps),random),gap=pick(GAP_VALUES,random);
    return {gap:gap,gaps:gaps,span:gap*gaps,count:0};
  }
  function withRelation(model,relation){var result=copy(model);result.count=relationCount(relation,result.gaps);return result;}
  function sequenceModel(random){
    var candidates=[];
    range(1,15).forEach(function(a){range(2,9).forEach(function(d){range(8,30).forEach(function(n){
      var optionValues=[a+d*(n-1),d+a*(n-1),a+d*n,a*n],gaps=(n-a)/d,termCounts=[gaps+1,(n-d)/a+1,gaps,gaps-1];
      if(n>a&&(n-a)%d===0&&a+d*(n-1)<=300&&optionValues.filter(function(value,index){return optionValues.indexOf(value)===index;}).length===4&&termCounts.filter(function(value,index){return termCounts.indexOf(value)===index;}).length===4)candidates.push({a:a,d:d,n:n,last:n});
    });});});
    return copy(pick(candidates,random));
  }
  function termsModel(random){
    var candidates=[];
    range(1,15).forEach(function(a){range(2,9).forEach(function(d){range(8,30).forEach(function(n){
      var last=a+d*(n-1),alternate=(last-d)/a,both=[n,alternate+1,n-1,n-2],none=[n-2,alternate-1,n-1,n];
      if(last<=300&&a!==d&&both.filter(function(value,index){return both.indexOf(value)===index;}).length===4&&none.filter(function(value,index){return none.indexOf(value)===index;}).length===4)candidates.push({a:a,d:d,last:last,n:n});
    });});});
    return copy(pick(candidates,random));
  }

  function buildLv1(random,golden){
    var cues=cueObjects("both_ends",random),values=golden?[6,9,12,15,8]:shuffle([6,8,9,12,15,16],random).slice(0,5);
    return finalizeSet(1,[
      makeLv1Question("gaps",values[0],cues[0],"木が 4 本ならんでいるとき、間は 3 つです。"),
      makeLv1Question("count",values[1],cues[1],"間が 3 つあるとき、両はしにも木があるなら木は 4 本です。"),
      makeLv1Question("gaps",values[2],cues[2],null),makeLv1Question("count",values[3],cues[3],null),makeLv1Question("gaps",values[4],cues[4],null)
    ]);
  }

  function buildLv2(random,golden){
    var relations=golden?["both_ends","loop","no_ends"]:shuffle(["both_ends","no_ends","loop"],random);
    var cueBanks={},questions=[],gaps=golden?[6,8]:shuffle(range(3,10),random).slice(0,2);
    relations.forEach(function(relation){cueBanks[relation]=cueObjects(relation,random);});
    var firstForm=makeRelationQuestion(2,relations[0],cueBanks[relations[0]][0],random);
    var firstNormal=makeLv2Normal(relations[0],gaps[0],cueBanks[relations[0]][1],null);
    var secondForm=makeRelationQuestion(2,relations[1],cueBanks[relations[1]][0],random);
    var secondNormal=makeLv2Normal(relations[1],gaps[1],cueBanks[relations[1]][1],null);
    var thirdForm=makeRelationQuestion(2,relations[2],cueBanks[relations[2]][0],random);
    firstForm.scaffold="木が 4 本ならんでいるとき、間は 3 つです。";firstNormal.scaffold="間が 3 つなら、両はしをどう数えるか確かめます。";
    markChain(firstForm,firstNormal,"kisokusei_chain_2_1");
    questions=[firstForm,firstNormal,secondForm,secondNormal,thirdForm];
    return finalizeSet(2,questions);
  }

  function buildLv3(random,golden){
    var bothCues=cueObjects("both_ends",random),loopCues=cueObjects("loop",random),pairModel=withRelation(golden?{gap:5,gaps:12,span:60,count:13}:randomUekiModel(random,3,15),"both_ends");
    pairModel.count=pairModel.gaps+1;
    var loopModel=withRelation({gap:pairModel.gap,gaps:pairModel.gaps,span:pairModel.span,count:pairModel.gaps},"loop");
    var implicitModel=withRelation(golden?{gap:5,gaps:9,span:45,count:8}:randomUekiModel(random,3,15),"no_ends");
    var extraModel=withRelation(golden?{gap:6,gaps:14,span:84,count:15}:randomUekiModel(random,3,15),"both_ends");
    var first=makeUeki(3,"both_ends","count",pairModel,bothCues[0],null),second=makeUeki(3,"loop","count",loopModel,loopCues[0],null);
    var recognition=asFormulation(makeUeki(3,"no_ends","count",implicitModel,null,pick(IMPLICIT_CONTEXTS,random)),random);
    var chained=makeUeki(3,"no_ends","count",implicitModel,null,recognition.implicitContext),extra=asFormulation(makeUeki(3,"both_ends","count",extraModel,bothCues[1],null),random);
    first.scaffold="木が 4 本ならんでいるとき、間は 3 つです。";second.scaffold=first.scaffold;
    markPair(first,second,"kisokusei_pair_3");markChain(recognition,chained,"kisokusei_chain_3_1");
    return finalizeSet(3,[first,second,recognition,chained,extra]);
  }

  function buildLv4(random,golden){
    var loopUnknown=golden?"gap":pick(["gap","span"],random),implicitUnknown=loopUnknown==="gap"?"span":"gap";
    var bothCues=cueObjects("both_ends",random),loopCues=cueObjects("loop",random),used=[];
    var firstModel=withRelation(golden?{gap:6,gaps:8,span:48,count:9}:randomUekiModel(random,5,24),"both_ends");
    var loopModel=withRelation(golden?{gap:8,gaps:12,span:96,count:12}:randomUekiModel(random,5,24),"loop");
    var normalLoopModel=golden?withRelation({gap:5,gaps:12,span:60,count:12},"loop"):loopModel;
    var implicitModel=withRelation(golden?{gap:6,gaps:8,span:48,count:7}:randomUekiModel(random,5,24),"no_ends");
    var finalModel=withRelation(golden?{gap:5,gaps:10,span:50,count:11}:randomUekiModel(random,5,24),"both_ends");
    var first=makeUeki(4,"both_ends",loopUnknown==="gap"?"gap":"span",firstModel,bothCues[0],null);
    var sourceLoop=makeUeki(4,"loop",loopUnknown,loopModel,loopCues[0],null),types=diagnosisTypes(4,["type_mismatch","gap_vs_count"],random,golden);
    var diagnosisLoop=makeDiagnosis(sourceLoop,types[0],random,used),normalLoop=makeUeki(4,"loop",loopUnknown,normalLoopModel,loopCues[1],null);
    var sourceImplicit=makeUeki(4,"no_ends",implicitUnknown,implicitModel,null,pick(IMPLICIT_CONTEXTS,random)),diagnosisImplicit=makeDiagnosis(sourceImplicit,types[1],random,used);
    var formulation=asFormulation(makeUeki(4,"both_ends",implicitUnknown,finalModel,bothCues[1],null),random);
    first.scaffold="木が 4 本なら間は 3 つ。長さは 間の数 × 間かくです。";markChain(diagnosisLoop,normalLoop,"kisokusei_chain_4_1");
    return finalizeSet(4,[first,diagnosisLoop,normalLoop,diagnosisImplicit,formulation]);
  }

  function buildLv5(random,golden){
    var orderKind=periodicModel(golden?27:pick([19,23,27,31],random),golden?null:random),orderOccurrences=periodicModel(golden?30:pick([18,22,30,34],random),golden?null:random);
    var pair=periodicModel(golden?20:pick([16,20,24,28,32],random),golden?null:random),used=[],types=diagnosisTypes(5,["remainder_read"],random,golden);
    if(golden)pair.target="青";else{pair.n=pair.p*pick(range(2,8),random);pair.m=pair.n;}
    var sourceUnknown=types[0]==="gap_vs_count"?"occurrences":"kindAt",source=makePeriodic(5,sourceUnknown,pair,random),diagnosis=makeDiagnosis(source,types[0],random,used),normalKind=makePeriodic(5,"kindAt",pair,random),normalOccurrences=makePeriodic(5,"occurrences",pair,random);
    var first=makeOrdering(5,"shuuki:none:kindAt",orderKind,random),second=makeOrdering(5,"shuuki:none:occurrences",orderOccurrences,random);
    first.scaffold="赤、青、青、黄なら、一くり返しは 4 こです。";second.scaffold="赤、青、青、黄なら、一くり返しに青は 2 こです。";
    var chained=sourceUnknown==="kindAt"?normalKind:normalOccurrences,paired=sourceUnknown==="kindAt"?normalOccurrences:normalKind;
    markChain(diagnosis,chained,"kisokusei_chain_5_1");markPair(normalKind,normalOccurrences,"kisokusei_pair_5");
    return finalizeSet(5,sourceUnknown==="kindAt"?[first,second,diagnosis,chained,paired]:[second,first,diagnosis,chained,paired]);
  }

  function buildLv6(random,golden){
    var number=golden?12:pick(range(8,15),random),pair=periodicModel(number,golden?null:random),chain=periodicModel(golden?20:pick([16,20,24,28],random),golden?null:random),used=[];
    if(golden){pair.target="赤";pair.targetIndex=1;chain.target="赤";chain.targetIndex=1;}
    var first=makePeriodic(6,"occurrences",pair,random),second=makePeriodic(6,"position",pair,random);
    var sourceOccurrence=makePeriodic(6,"occurrences",chain,random),sourcePosition=makePeriodic(6,"position",pair,random);
    var types=diagnosisTypes(6,["remainder_read",golden?"correct_alternative":"gap_vs_count"],random,golden);
    var diagnosisOccurrence=makeDiagnosis(sourceOccurrence,types[0],random,used),normalOccurrence=makePeriodic(6,"occurrences",chain,random),diagnosisPosition=makeDiagnosis(sourcePosition,types[1],random,used);
    first.scaffold="赤、青、青、黄なら、一くり返しは 4 こです。";second.scaffold=first.scaffold;
    markPair(first,second,"kisokusei_pair_6");markChain(diagnosisOccurrence,normalOccurrence,"kisokusei_chain_6_1");
    return finalizeSet(6,[first,second,diagnosisOccurrence,normalOccurrence,diagnosisPosition]);
  }

  function buildLv7(random,golden){
    var shared=golden?20:pick([12,16,20,24],random),used=[],types=diagnosisTypes(7,["corner_double","gap_vs_count"],random,golden);
    var form=asFormulation(makeHoujin(7,"perimeter",golden?9:shared),random),normalPerimeter=makeHoujin(7,"perimeter",shared),normalSide=makeHoujin(7,"side",shared);
    var perimeterType=types.indexOf("corner_double")>=0?"corner_double":null,sideType=types.indexOf("gap_vs_count")>=0?"gap_vs_count":null;
    types.forEach(function(errorType){if(errorType!==perimeterType&&errorType!==sideType){if(perimeterType===null)perimeterType=errorType;else sideType=errorType;}});
    var diagnosisPerimeter=makeDiagnosis(makeHoujin(7,"perimeter",golden?8:pick(range(4,24),random)),perimeterType,random,used);
    var diagnosisSide=makeDiagnosis(makeHoujin(7,"side",golden?36:pick(range(3,23).map(function(value){return value*4;}),random)),sideType,random,used);
    form.scaffold="ご石を 1 辺 4 この正方形にならべると、外がわは 12 こです。";markChain(form,normalPerimeter,"kisokusei_chain_7_1");markPair(normalPerimeter,normalSide,"kisokusei_pair_7");
    return finalizeSet(7,[form,normalPerimeter,normalSide,diagnosisPerimeter,diagnosisSide]);
  }

  function buildLv8(random,golden){
    var model=golden?{a:2,d:4,n:30,last:30}:sequenceModel(random),orderModel=golden?{a:5,d:3,n:13,last:41}:termsModel(random),used=[];
    var form=asFormulation(makeSequence(8,null,"term",model,"enumeration",null),random),normalTerm=makeSequence(8,null,"term",model,"rule",null),normalTerms=makeSequence(8,null,"terms",model,"rule",null);
    var types=diagnosisTypes(8,["increment_wrong"],random,golden),diagnosis=makeDiagnosis(makeSequence(8,null,"term",model,"enumeration",null),types[0],random,used);
    var ordering=makeOrdering(8,"sequence:none:terms",orderModel,random);
    form.scaffold="2, 6, 10 では、ふえる数は 4 です。";markChain(form,normalTerm,"kisokusei_chain_8_1");markPair(normalTerm,normalTerms,"kisokusei_pair_8");
    return finalizeSet(8,[form,normalTerm,normalTerms,diagnosis,ordering]);
  }

  function buildLv9(random,golden){
    var model=golden?{a:5,d:3,last:41,n:13}:termsModel(random),diagnosisModel=golden?{a:7,d:4,last:63,n:15}:termsModel(random);
    var bothCues=cueObjects("sequence_both",random),noneCues=cueObjects("sequence_none",random),used=[],types=diagnosisTypes(9,["gap_vs_count","type_mismatch"],random,golden);
    var form=asFormulation(makeSequence(9,"both_ends","terms",model,"rule",bothCues[0]),random),normalBoth=makeSequence(9,"both_ends","terms",model,"rule",bothCues[1]),normalNone=makeSequence(9,"no_ends","terms",model,"rule",noneCues[0]);
    var diagnosisBoth=makeDiagnosis(makeSequence(9,"both_ends","terms",diagnosisModel,"rule",bothCues[2]),types[0],random,used),diagnosisNone=makeDiagnosis(makeSequence(9,"no_ends","terms",diagnosisModel,"rule",noneCues[1]),types[1],random,used);
    form.scaffold="5 から 3 ずつふえて 14 までなら、間は 3 つ、数は 4 こです。";markChain(form,normalBoth,"kisokusei_chain_9_1");markPair(normalBoth,normalNone,"kisokusei_pair_9");
    return finalizeSet(9,[form,normalBoth,normalNone,diagnosisBoth,diagnosisNone]);
  }

  function uekiPair(lv,random,golden){
    var unknown=golden?"count":pick(["count","gap","span"],random),relation=golden?"both_ends":pick(["both_ends","loop"],random);
    var cues=cueObjects(relation,random),implicit=pick(IMPLICIT_CONTEXTS,random),firstModel,secondModel;
    if(unknown==="gap"){
      var candidates=relation==="both_ends"?[[7,4,3,24],[9,5,4,40],[11,6,5,60]]:[[5,6,5,30]];
      var values=pick(candidates,random),count=values[0],gapA=values[1],gapB=values[2],span=values[3];
      firstModel={count:count,gaps:relation==="both_ends"?count-1:count,gap:gapA,span:span};secondModel={count:count,gaps:count+1,gap:gapB,span:span};
    }else{
      var base=golden?{gap:6,gaps:12,span:72,count:13}:randomUekiModel(random,5,22);
      firstModel=withRelation(base,relation);secondModel=withRelation(base,"no_ends");
      if(unknown==="span"){secondModel={count:firstModel.count,gaps:firstModel.count+1,gap:firstModel.gap,span:firstModel.gap*(firstModel.count+1)};}
      else secondModel={count:firstModel.gaps-1,gaps:firstModel.gaps,gap:firstModel.gap,span:firstModel.span};
    }
    var source=makeUeki(lv,relation,unknown,firstModel,cues[0],null),form=asFormulation(source,random),normal=makeUeki(lv,relation,unknown,firstModel,cues[1],null);
    var paired=makeUeki(lv,"no_ends",unknown,secondModel,null,implicit);
    return {form:form,normal:normal,paired:paired,primaryError:"type_mismatch",implicit:true};
  }

  function shuukiPair(lv,random){
    var mode=pick(["kindAt_occurrences","occurrences_position"],random),number=mode==="occurrences_position"?pick([8,9,10,11,12,13,14,15],random):pick([12,16,20,24,28],random),model=periodicModel(number,random);
    model.m=number;
    var firstUnknown=mode==="kindAt_occurrences"?"kindAt":"occurrences",secondUnknown=mode==="kindAt_occurrences"?"occurrences":"position";
    var first=makePeriodic(lv,firstUnknown,model,random),form=asFormulation(first,random),normal=makePeriodic(lv,firstUnknown,model,random),paired=makePeriodic(lv,secondUnknown,model,random);
    return {form:form,normal:normal,paired:paired,primaryError:secondUnknown==="position"?"gap_vs_count":"remainder_read",implicit:false};
  }

  function houjinPair(lv,random){
    var firstUnknown=pick(["perimeter","side"],random),value=pick([12,16,20,24],random),secondUnknown=firstUnknown==="perimeter"?"side":"perimeter";
    var first=makeHoujin(lv,firstUnknown,value),form=asFormulation(first,random),normal=makeHoujin(lv,firstUnknown,value),paired=makeHoujin(lv,secondUnknown,value);
    return {form:form,normal:normal,paired:paired,primaryError:secondUnknown==="perimeter"?"corner_double":"gap_vs_count",implicit:false};
  }

  function sequencePair(lv,random){
    var lv8=randomValue(random)<0.5;
    if(lv8){
      var model=sequenceModel(random),firstUnknown=pick(["term","terms"],random),secondUnknown=firstUnknown==="term"?"terms":"term";
      var first=makeSequence(lv,null,firstUnknown,model,"rule",null),form=asFormulation(first,random),normal=makeSequence(lv,null,firstUnknown,model,"rule",null),paired=makeSequence(lv,null,secondUnknown,model,"rule",null);
      return {form:form,normal:normal,paired:paired,primaryError:secondUnknown==="term"?"increment_wrong":"gap_vs_count",implicit:false};
    }
    var terms=termsModel(random),firstRelation=pick(["both_ends","no_ends"],random),secondRelation=firstRelation==="both_ends"?"no_ends":"both_ends";
    var cuesFirst=cueObjects(firstRelation==="both_ends"?"sequence_both":"sequence_none",random),cuesSecond=cueObjects(secondRelation==="both_ends"?"sequence_both":"sequence_none",random);
    var firstTerms=makeSequence(lv,firstRelation,"terms",terms,"rule",cuesFirst[0]),formTerms=asFormulation(firstTerms,random),normalTerms=makeSequence(lv,firstRelation,"terms",terms,"rule",cuesFirst[1]),pairedTerms=makeSequence(lv,secondRelation,"terms",terms,"rule",cuesSecond[0]);
    return {form:formTerms,normal:normalTerms,paired:pairedTerms,primaryError:secondRelation==="no_ends"?"type_mismatch":"gap_vs_count",implicit:false};
  }

  function auxiliaryOrdering(lv,domain,random){
    if(domain==="shuuki"){
      var periodicPattern=pick(["shuuki:none:kindAt","shuuki:none:occurrences","shuuki:none:position"],random),periodicParams=periodicModel(pick([18,24,32],random),random);
      if(periodicPattern==="shuuki:none:position")periodicParams.m=pick(range(2,15),random);
      return makeOrdering(lv,periodicPattern,periodicParams,random);
    }
    if(domain==="houjin"){
      var unknown=pick(["perimeter","side"],random),value=unknown==="perimeter"?pick(range(4,24),random):pick(range(3,23).map(function(item){return item*4;}),random);
      var source=makeHoujin(lv,unknown,value);return makeOrdering(lv,source.patternId,source.params,random);
    }
    var pattern=pick(["sequence:none:term","sequence:none:terms","sequence:both_ends:terms","sequence:no_ends:terms"],random),params=pattern.indexOf(":term")>=0&&pattern.indexOf(":terms")<0?sequenceModel(random):termsModel(random);
    return makeOrdering(lv,pattern,params,random);
  }

  function auxiliaryDiagnosis(lv,domain,errorType,random,usedCombos,implicit){
    var source;
    if(domain==="ueki"){
      var unknown=pick(["count","gap","span"],random),model=withRelation(randomUekiModel(random,5,24),"no_ends");
      source=makeUeki(lv,"no_ends",unknown,model,null,pick(IMPLICIT_CONTEXTS,random));
    }else if(domain==="shuuki"){
      var unknownPeriodic=pick(["kindAt","occurrences","position"],random),periodic=periodicModel(pick([16,20,24],random),random);if(unknownPeriodic==="position")periodic.m=pick(range(2,15),random);source=makePeriodic(lv,unknownPeriodic,periodic,random);
    }else if(domain==="houjin")source=makeHoujin(lv,pick(["perimeter","side"],random),pick([12,16,20,24],random));
    else{
      var sequencePattern=pick(["term","terms_both","terms_none"],random),modelSequence=sequencePattern==="term"?sequenceModel(random):termsModel(random);
      source=sequencePattern==="term"?makeSequence(lv,null,"term",modelSequence,"enumeration",null):makeSequence(lv,sequencePattern==="terms_none"?"no_ends":"both_ends","terms",modelSequence,"rule",cueObjects(sequencePattern==="terms_none"?"sequence_none":"sequence_both",random)[0]);
    }
    if(implicit&&source.relationCue!=="implicit")throw new Error("暗黙型を作れません");
    return makeDiagnosis(source,errorType,random,usedCombos);
  }

  function buildGoldenLv10(random){
    var pair=uekiPair(10,random,true),used=[],types=["type_mismatch","corner_double"];
    var pairedDiagnosis=makeDiagnosis(pair.paired,types[0],random,used),ordering=makeOrdering(10,"shuuki:none:kindAt",periodicModel(32),random),last=makeDiagnosis(makeHoujin(10,"perimeter",15),types[1],random,used);
    pair.form.scaffold="木が 4 本ならんでいるとき、間は 3 つです。";markChain(pair.form,pair.normal,"kisokusei_chain_10_1");markPair(pair.normal,pairedDiagnosis,"kisokusei_pair_10");
    return finalizeSet(10,[pair.form,pair.normal,pairedDiagnosis,ordering,last]);
  }

  function buildLv10(random,golden){
    if(golden)return buildGoldenLv10(random);
    var family=pick(["ueki","shuuki","houjin","sequence"],random),pair=family==="ueki"?uekiPair(10,random,false):(family==="shuuki"?shuukiPair(10,random):(family==="houjin"?houjinPair(10,random):sequencePair(10,random)));
    var remaining=["shuuki","houjin","sequence"].filter(function(domain){return domain!==family;}),orderingDomain=pick(remaining,random),lastDomain=family==="ueki"?pick(remaining.filter(function(domain){return domain!==orderingDomain;}),random):"ueki";
    var used=[],baseSecondError=lastDomain==="ueki"?"type_mismatch":(lastDomain==="houjin"?"corner_double":(lastDomain==="shuuki"?"remainder_read":"increment_wrong"));
    if(baseSecondError===pair.primaryError)baseSecondError="calc_only";
    var types=diagnosisTypes(10,[pair.primaryError,baseSecondError],random,false);
    var pairedDiagnosis=makeDiagnosis(pair.paired,types[0],random,used),ordering=auxiliaryOrdering(10,orderingDomain,random),last=auxiliaryDiagnosis(10,lastDomain,types[1],random,used,lastDomain==="ueki");
    pair.form.scaffold="木が 4 本ならんでいるとき、間は 3 つです。";markChain(pair.form,pair.normal,"kisokusei_chain_10_1");markPair(pair.normal,pairedDiagnosis,"kisokusei_pair_10");
    return finalizeSet(10,[pair.form,pair.normal,pairedDiagnosis,ordering,last]);
  }

  function buildSetInternal(lv,random,golden){
    validateLv(lv);if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    if(lv===1)return buildLv1(random,golden);if(lv===2)return buildLv2(random,golden);if(lv===3)return buildLv3(random,golden);
    if(lv===4)return buildLv4(random,golden);if(lv===5)return buildLv5(random,golden);if(lv===6)return buildLv6(random,golden);
    if(lv===7)return buildLv7(random,golden);if(lv===8)return buildLv8(random,golden);if(lv===9)return buildLv9(random,golden);
    return buildLv10(random,golden);
  }
  function buildSet(lv,random){return buildSetInternal(lv,random,false);}
  function buildGoldenSet(lv,random){return buildSetInternal(lv,random,true);}

  function judge(question,answer){
    if(!isObject(question)||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="choice")return isInteger(answer)&&answer===question.ans;
    if(question.kind==="order")return Array.isArray(answer)&&answer.length===question.ans.length&&question.ans.every(function(value,index){return answer[index]===value;});
    var numeric=typeof answer==="number"?answer:Number(String(answer).replace(/^\s+|\s+$/g,""));
    return isFinite(numeric)&&numeric===question.ans;
  }

  global.Q4B_KOMOREBI_KISOKUSEI={
    config:CONFIG,diagnosisLabels:DIAGNOSIS_LABELS,availableErrors:AVAILABLE_ERRORS,
    relationPhrases:RELATION_PHRASES,implicitContexts:IMPLICIT_CONTEXTS,allPatternIds:ALL_PATTERN_IDS,
    solve:solve,semanticAnswer:semanticAnswer,buildSet:buildSet,buildGoldenSet:buildGoldenSet,judge:judge
  };
})(window);
