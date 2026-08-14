(function(global){
  "use strict";

  /* 使用例: Q4B_KOMOREBI_EQUATION_SELECT.buildSet(7,randomFn);
     問題と選択肢の並びを再現できるよう、乱数は外から受け取る。 */
  var EQUATION_CONFIG={setSize:5};
  var STRUCTURES=["combine","decrease","compare","groups","share","measure","unknown_start","unknown_unit","mixed","two_step"];
  var CONTEXTS=["candy","stickers","flowers","books","cars"];
  var CONTEXT_DETAILS={
    candy:{noun:"あめ",unit:"こ",container:"ふくろ"},
    stickers:{noun:"シール",unit:"まい",container:"ふくろ"},
    flowers:{noun:"はな",unit:"本",container:"たば"},
    books:{noun:"ほん",unit:"さつ",container:"はこ"},
    cars:{noun:"くるま",unit:"台",container:"れつ"}
  };

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

  function additionPairs(){
    var pairs=[];
    /* 同じ数どうしを足す組は使わない。8 と 8 だと誤答の 8-8 が 0 になり、
       余分に足す型 8+8+8 も見た目が正解と近すぎて、何を誤ったのか指せない。 */
    for(var a=3;a<=12;a++)for(var b=2;b<=10;b++)if(a!==b&&a+b<=20)pairs.push([a,b]);
    return pairs;
  }

  function subtractionPairs(){
    var pairs=[];
    for(var whole=7;whole<=20;whole++)for(var part=2;part<whole;part++)if(whole-part>=2)pairs.push([whole,part]);
    return pairs;
  }

  function multiplicationPairs(){
    var pairs=[];
    for(var unit=2;unit<=9;unit++)for(var groups=3;groups<=9;groups++)pairs.push([unit,groups]);
    return pairs;
  }

  function divisionPairs(){
    var pairs=[];
    for(var divisor=2;divisor<=9;divisor++)for(var quotient=2;quotient<=9;quotient++)pairs.push([divisor*quotient,divisor]);
    return pairs;
  }

  /* 繰り返しの足し算は回数をずらして書く。回数どおりに書き切った式は掛け算と
     同じ値になり、誤答ではなく遠回りの正しい式になってしまう。正しいものを誤答
     として置くと、何が正しいかの基準が子どもから見えなくなる。
     少ない回数が 2 未満になる組では逆に 1 回多く数えた形にする (数え落としも
     数え過ぎも実在する誤り)。 */
  function repeatedAddition(value,count){
    var parts=[],terms=count>=4?count-1:count+1;
    for(var index=0;index<terms;index++)parts.push(String(value));
    return parts.join("+");
  }

  function basicEntries(operation,numbers){
    var a=numbers[0],b=numbers[1];
    if(operation==="+")return [
      {text:a+"+"+b,type:"correct"},{text:a+"-"+b,type:"operation_mixup"},
      {text:a+"×"+b,type:"unrelated_operation"},{text:a+"+"+b+"+"+b,type:"extra_addition"}
    ];
    if(operation==="×")return [
      {text:a+"×"+b,type:"correct"},{text:a+"÷"+b,type:"operation_mixup"},
      {text:a+"+"+b,type:"written_addition"},{text:repeatedAddition(a,b),type:"repeated_addition"}
    ];
    if(operation==="-")return [
      {text:a+"-"+b,type:"correct"},{text:a+"+"+b,type:"operation_mixup"},
      {text:b+"-"+a,type:"order_reversal"},{text:a+"×"+b,type:"unrelated_operation"}
    ];
    return [
      {text:a+"÷"+b,type:"correct"},{text:a+"×"+b,type:"operation_mixup"},
      {text:b+"÷"+a,type:"order_reversal"},{text:a+"-"+b,type:"unrelated_operation"}
    ];
  }

  function wazaFor(structure){
    var alternate={
      combine:"あわせた 数を つくる 式を えらぶ",decrease:"はじめの 数から へった 数を ひく",
      compare:"おおい 数から すくない 数を ひく",groups:"1 くみぶんを くみの 数だけ あつめる",
      share:"ぜんぶを 人の 数で わける",measure:"ぜんぶを 1 くみぶんで わける",
      unknown_start:"いまの 数から ふえた 数を ひく",unknown_unit:"ぜんぶを くみの 数で わける",
      mixed:"いらない 数を 式に いれない",two_step:"さいしょの 答えを つぎの 式に つかう"
    };
    return {primary:"ことばでは なく 数の かんけいを 見る",alternate:alternate[structure]};
  }

  function validateEntries(entries){
    var texts={},correct=0;
    if(!Array.isArray(entries)||entries.length!==4)throw new Error("選択肢は4個必要です");
    entries.forEach(function(entry){
      if(!entry||typeof entry.text!=="string"||!entry.text||typeof entry.type!=="string"||!entry.type)throw new Error("選択肢の形式が正しくありません");
      if(texts[entry.text])throw new Error("選択肢が重複しています");
      texts[entry.text]=true;if(entry.type==="correct")correct++;
    });
    if(correct!==1)throw new Error("正解の選択肢が正しくありません");
  }

  function choiceQuestion(lv,structure,context,operation,numbers,text,entries,random){
    validateEntries(entries);
    var selected=shuffle(entries,random),ans=-1;
    selected.forEach(function(entry,index){if(entry.type==="correct")ans=index;});
    return {
      cat:"kom_equation_select",format:"formulation",kind:"choice",lv:lv,structure:structure,
      context:context,operation:operation,numbers:numbers.slice(),text:text,scaffold:null,
      choices:selected.map(function(entry){return entry.text;}),
      choiceOperations:selected.map(function(entry){return entry.type;}),
      ans:ans,waza:wazaFor(structure)
    };
  }

  function questionEnding(unit){return "なん"+unit+" ですか。しきを えらびましょう。";}

  function buildCombine(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(additionPairs(),random);
    var text=detail.noun+"が "+numbers[0]+detail.unit+" と "+numbers[1]+detail.unit+" あります。あわせて "+questionEnding(detail.unit);
    return choiceQuestion(lv,"combine",context,"+",numbers,text,basicEntries("+",numbers),random);
  }

  function buildDecrease(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(subtractionPairs(),random);
    var text=detail.noun+"が "+numbers[0]+detail.unit+" ありました。"+numbers[1]+detail.unit+" つかいました。のこりは "+questionEnding(detail.unit);
    return choiceQuestion(lv,"decrease",context,"-",numbers,text,basicEntries("-",numbers),random);
  }

  function buildCompare(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(subtractionPairs(),random);
    var text=detail.noun+"が "+numbers[0]+detail.unit+" と "+numbers[1]+detail.unit+" あります。おおい ほうは なん"+detail.unit+" おおい ですか。しきを えらびましょう。";
    return choiceQuestion(lv,"compare",context,"-",numbers,text,basicEntries("-",numbers),random);
  }

  function buildGroups(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(multiplicationPairs(),random);
    var text="1"+detail.container+"に "+numbers[0]+detail.unit+"ずつ "+detail.noun+"が はいっています。"+numbers[1]+detail.container+"で ぜんぶは "+questionEnding(detail.unit);
    return choiceQuestion(lv,"groups",context,"×",numbers,text,basicEntries("×",numbers),random);
  }

  function buildShare(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(divisionPairs(),random);
    var text=detail.noun+"が "+numbers[0]+detail.unit+" あります。"+numbers[1]+"人で おなじ かずずつ わけると、1人ぶんは "+questionEnding(detail.unit);
    return choiceQuestion(lv,"share",context,"÷",numbers,text,basicEntries("÷",numbers),random);
  }

  function buildMeasure(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(divisionPairs(),random);
    var text=numbers[0]+detail.unit+"の "+detail.noun+"を 1"+detail.container+"に "+numbers[1]+detail.unit+"ずつ いれます。"+detail.container+"は いくつ いりますか。しきを えらびましょう。";
    return choiceQuestion(lv,"measure",context,"÷",numbers,text,basicEntries("÷",numbers),random);
  }

  function buildUnknownStart(lv,context,random){
    var detail=CONTEXT_DETAILS[context],pair=pick(subtractionPairs(),random),numbers=[pair[0],pair[1]];
    var text=detail.noun+"を なん"+detail.unit+"か もっていました。"+numbers[1]+detail.unit+" もらったので、いま "+numbers[0]+detail.unit+" です。はじめは "+questionEnding(detail.unit);
    return choiceQuestion(lv,"unknown_start",context,"-",numbers,text,basicEntries("-",numbers),random);
  }

  function buildUnknownUnit(lv,context,random){
    var detail=CONTEXT_DETAILS[context],numbers=pick(divisionPairs(),random);
    var text=detail.noun+"が "+numbers[1]+detail.container+"で "+numbers[0]+detail.unit+" あります。1"+detail.container+"には "+questionEnding(detail.unit);
    return choiceQuestion(lv,"unknown_unit",context,"÷",numbers,text,basicEntries("÷",numbers),random);
  }

  function irrelevantValue(numbers,random){
    var candidates=[6,7,8,9,10,11,12].filter(function(value){return numbers.indexOf(value)<0;});
    return pick(candidates,random);
  }

  function mixedEntries(operation,numbers){
    var a=numbers[0],b=numbers[1],extra=numbers[2];
    if(operation==="+")return [
      {text:a+"+"+b,type:"correct"},{text:a+"+"+extra,type:"irrelevant_information"},
      {text:a+"-"+b,type:"operation_mixup"},{text:a+"+"+b+"+"+b,type:"extra_addition"}
    ];
    if(operation==="×")return [
      {text:a+"×"+b,type:"correct"},{text:a+"×"+extra,type:"irrelevant_information"},
      {text:a+"+"+b,type:"written_addition"},{text:repeatedAddition(a,b),type:"repeated_addition"}
    ];
    if(operation==="-")return [
      {text:a+"-"+b,type:"correct"},{text:a+"-"+extra,type:"irrelevant_information"},
      {text:a+"+"+b,type:"operation_mixup"},{text:b+"-"+a,type:"order_reversal"}
    ];
    return [
      {text:a+"÷"+b,type:"correct"},{text:a+"÷"+extra,type:"irrelevant_information"},
      {text:a+"×"+b,type:"operation_mixup"},{text:b+"÷"+a,type:"order_reversal"}
    ];
  }

  /* 余分な数は必ず動作主の属性として文に埋める。「11さいの こが みています」の
     ように傍観者を立てると、余分だと一目でわかって罠にならない。分ける問題は
     年齢と人数が並んで「その子は 2 人に入るのか」が曖昧になるので使わない。 */
  function mixedText(context,base,numbers){
    var detail=CONTEXT_DETAILS[context],extra=numbers[2],a=numbers[0],b=numbers[1];
    if(base==="decrease")return detail.noun+"が "+a+detail.unit+" あります。"+extra+"さいの こが "+b+detail.unit+" つかいました。のこりは "+questionEnding(detail.unit);
    return extra+"さいの こが、1"+detail.container+"に "+a+detail.unit+"ずつ "+b+detail.container+" もっています。ぜんぶで "+questionEnding(detail.unit);
  }

  function buildMixed(lv,context,random){
    /* 動作主のいる 2 構造だけを使う。余分な数は動作主の年齢として埋めるので、
       動作主がいない構造 (合併) では傍観者を立てるしかなく、罠が成立しない。 */
    var base=pick(["decrease","groups"],random),operation,pair;
    if(base==="decrease"){operation="-";pair=pick(subtractionPairs(),random);}
    else{operation="×";pair=pick(multiplicationPairs(),random);}
    var numbers=pair.concat([irrelevantValue(pair,random)]),text=mixedText(context,base,numbers);
    return choiceQuestion(lv,"mixed",context,operation,numbers,text,mixedEntries(operation,numbers),random);
  }

  function twoStepPairs(){
    var pairs=[];
    /* 単価は 10 の倍数にする。1 台 6 円の車は文脈として壊れており、
       数を k5 の範囲へ収めた結果が現実味を壊してはいけない。掛け算は
       九九の 10 倍なので、範囲は保たれる。 */
    for(var tens=2;tens<=9;tens++)for(var count=2;count<=5;count++)if(tens*count<=18)pairs.push([tens*10,count]);
    return pairs;
  }

  function buildTwoStep(lv,context,random){
    var detail=CONTEXT_DETAILS[context],pair=pick(twoStepPairs(),random),total=pair[0]*pair[1];
    /* 払う額は 100 円単位。単価を 10 の倍数にしたので、20 円札のような
       ありえない金額にならないよう払う側も現実の硬貨と紙幣に合わせる。 */
    var payments=[];
    for(var value=100;value<=500;value+=100)if(value>total)payments.push(value);
    var payment=pick(payments,random),numbers=[pair[0],pair[1],payment,total],wrongTotal=pair[0]+pair[1];
    var text="1"+detail.unit+" "+pair[0]+"円の "+detail.noun+"を "+pair[1]+detail.unit+" かって、"+payment+"円 はらいました。おつりは なん円 ですか。しきの くみを えらびましょう。";
    var entries=[
      {text:"さいしょ "+pair[0]+"×"+pair[1]+"、つぎ "+payment+"-"+total,type:"correct"},
      {text:"さいしょ "+payment+"-"+total+"、つぎ "+pair[0]+"×"+pair[1],type:"step_order_reversal"},
      {text:"さいしょ "+pair[0]+"+"+pair[1]+"、つぎ "+payment+"-"+wrongTotal,type:"first_step_addition"},
      {text:"さいしょ "+pair[0]+"×"+pair[1]+"、つぎ "+payment+"+"+total,type:"second_step_addition"}
    ];
    return choiceQuestion(lv,"two_step",context,"two_step",numbers,text,entries,random);
  }

  function buildQuestion(lv,context,random){
    if(lv===1)return buildCombine(lv,context,random);
    if(lv===2)return buildDecrease(lv,context,random);
    if(lv===3)return buildCompare(lv,context,random);
    if(lv===4)return buildGroups(lv,context,random);
    if(lv===5)return buildShare(lv,context,random);
    if(lv===6)return buildMeasure(lv,context,random);
    if(lv===7)return buildUnknownStart(lv,context,random);
    if(lv===8)return buildUnknownUnit(lv,context,random);
    if(lv===9)return buildMixed(lv,context,random);
    return buildTwoStep(lv,context,random);
  }

  function buildSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    return shuffle(CONTEXTS,random).map(function(context){return buildQuestion(lv,context,random);});
  }

  function judge(question,answer){
    if(!isObject(question)||question.kind!=="choice"||!Array.isArray(question.choices)||question.choices.length!==4||!Array.isArray(question.choiceOperations)||question.choiceOperations.length!==4)throw new Error("問題の指定が正しくありません");
    var correct=[];
    question.choiceOperations.forEach(function(type,index){if(type==="correct")correct.push(index);});
    if(correct.length!==1||!isInteger(question.ans)||question.ans!==correct[0])throw new Error("問題の答えが正しくありません");
    if(typeof answer!=="number"&&typeof answer!=="string")throw new Error("答えの指定が正しくありません");
    var numeric=Number(answer);
    if(!isInteger(numeric))throw new Error("答えの指定が正しくありません");
    return numeric===question.ans;
  }

  global.Q4B_KOMOREBI_EQUATION_SELECT={
    config:EQUATION_CONFIG,
    structures:STRUCTURES.slice(),
    contexts:CONTEXTS.slice(),
    buildSet:buildSet,
    judge:judge
  };
})(window);
