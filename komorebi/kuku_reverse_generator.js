(function(global){
  "use strict";

  var REVERSE_CONFIG={setSize:5};
  var TEACHING_ORDER=[2,5,3,4,6,7,8,9];
  var URA_LV10_WEIGHTED=[1,2,3,4,4,5,5,6,7,8,8,9,9];
  var PHRASES=global.Q4B_KUKU_PHRASES;

  if(!PHRASES||typeof PHRASES.phrase!=="function")throw new Error("九九の読みを利用できません");

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
  function range(start,end){var values=[];for(var value=start;value<=end;value++)values.push(value);return values;}
  function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}
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
    for(var index=result.length-1;index>0;index--){
      var selected=Math.floor(randomValue(random)*(index+1)),temporary=result[index];
      result[index]=result[selected];result[selected]=temporary;
    }
    return result;
  }

  function sample(values,count,random){
    if(!Array.isArray(values)||!isInteger(count)||count<0||count>values.length)throw new Error("生成候補の数が足りません");
    return shuffle(values,random).slice(0,count);
  }

  function makeProductsTable(){
    var table={};
    for(var a=1;a<=9;a++)for(var b=1;b<=9;b++){
      var product=a*b;
      if(!hasOwn(table,product))table[product]=[];
      table[product].push([a,b]);
    }
    return table;
  }

  var PRODUCT_TABLE=makeProductsTable();
  var PRODUCT_VALUES=Object.keys(PRODUCT_TABLE).map(Number).sort(function(a,b){return a-b;});

  function productsTable(){
    var copy={};
    PRODUCT_VALUES.forEach(function(product){
      copy[product]=PRODUCT_TABLE[product].map(function(pair){return pair.slice();});
    });
    return copy;
  }

  function decompositions(product){
    if(!isInteger(product)||!hasOwn(PRODUCT_TABLE,product))return [];
    return PRODUCT_TABLE[product].map(function(pair){return pair.slice();});
  }

  function isKukuProduct(value){return isInteger(value)&&hasOwn(PRODUCT_TABLE,value);}
  function pairKey(pair){return pair[0]+"x"+pair[1];}
  function expression(pair){return pair[0]+"×"+pair[1];}

  /* 因数 1 の式はこのカテゴリでは扱わない。5 は 5×1、8 は 8×1 のような分解は
     答えが自明なうえ、1 で割っても数は変わらないので約分の土台にもならない。
     1 の段そのものは段暗唱が扱う。 */
  function properDecompositions(product){
    return decompositions(product).filter(function(pair){return pair[0]>=2&&pair[1]>=2;});
  }

  function unorderedDecompositions(product){
    return properDecompositions(product).filter(function(pair){return pair[0]<=pair[1];});
  }

  /* 積の差からおとりを探すと掛け直す問題になるため、正解の二因数を一目盛りだけ動かす。 */
  function nearFactorPairs(factors){
    var result=[],product=factors[0]*factors[1];
    for(var da=-1;da<=1;da++)for(var db=-1;db<=1;db++){
      var a=factors[0]+da,b=factors[1]+db,pair=[a,b];
      if((da===0&&db===0)||a<2||a>9||b<2||b>9||a*b===product)continue;
      if(result.map(pairKey).indexOf(pairKey(pair))<0)result.push(pair);
    }
    return result;
  }

  function factorizeFacts(dans){
    var facts=[];
    PRODUCT_VALUES.forEach(function(product){
      var pairs=unorderedDecompositions(product),pair;
      if(pairs.length!==1)return;
      pair=pairs[0];
      if(dans.indexOf(pair[0])>=0)facts.push(pair.slice());
      else if(dans.indexOf(pair[1])>=0)facts.push([pair[1],pair[0]]);
    });
    return facts;
  }

  function baseQuestion(cat,format,kind,lv,pattern,text,waza){
    return {
      cat:cat,format:format,kind:kind,lv:lv,pattern:pattern,text:text,scaffold:null,
      waza:{primary:waza.primary,alternate:waza.alternate||""}
    };
  }

  function buildFactorizeQuestion(lv,factors,random){
    var product=factors[0]*factors[1],correct=expression(factors);
    var distractors=sample(nearFactorPairs(factors),3,random).map(expression);
    var choices=shuffle([correct].concat(distractors),random);
    var question=baseQuestion("kom_kuku_ura","normal","choice",lv,"factorize",product+" は 何×何 ですか。",
      {primary:"積を 見たら 段を 思い出す",alternate:PHRASES.phrase(factors[0],factors[1])+" です。"});
    question.product=product;
    question.factors=factors.slice();
    question.choices=choices;
    question.ans=choices.indexOf(correct);
    return question;
  }

  function listAllProducts(){
    return PRODUCT_VALUES.filter(function(product){return unorderedDecompositions(product).length>=2;});
  }

  function listAllDistractors(product,correctPairs,random){
    var candidates=[],correctKeys=correctPairs.map(pairKey);
    shuffle(correctPairs,random).forEach(function(pair){
      shuffle(nearFactorPairs(pair),random).forEach(function(candidate){
        var key=pairKey(candidate);
        if(candidate[0]*candidate[1]!==product&&correctKeys.indexOf(key)<0&&candidates.map(pairKey).indexOf(key)<0)candidates.push(candidate);
      });
    });
    return candidates;
  }

  function buildListAllQuestion(lv,product,random){
    var correctPairs=properDecompositions(product),entries=correctPairs.map(function(pair){return {text:expression(pair),correct:true};});
    var distractors=listAllDistractors(product,correctPairs,random);
    /* おとりを必ず 2 つ混ぜる。分解が 4 通りある積 (12、18、24) で選択肢を 4 個に
       固定すると全部が正解になり、何も考えずに全部押せば通る問題になる。 */
    var target=correctPairs.length+2;
    if(distractors.length<2)throw new Error("集合完成のおとりを作れません");
    while(entries.length<target)entries.push({text:expression(distractors.shift()),correct:false});
    entries=shuffle(entries,random);
    var question=baseQuestion("kom_kuku_ura","find_all","find_all",lv,"list_all",product+" に なる 式を ぜんぶ えらびましょう。",
      {primary:"1 つ 見つけたら 逆も ある",alternate:"九九の 中だけで さがす"});
    question.product=product;
    question.choices=entries.map(function(entry){return entry.text;});
    question.ans=[];
    entries.forEach(function(entry,index){if(entry.correct)question.ans.push(index);});
    return question;
  }

  function nonProductValues(){return range(10,81).filter(function(value){return !isKukuProduct(value);});}

  function buildInTableQuestion(lv,missing,random){
    var products=PRODUCT_VALUES.filter(function(value){return value>=10;});
    var choices=shuffle([missing].concat(sample(products,3,random).map(String)),random);
    choices=choices.map(String);
    var question=baseQuestion("kom_kuku_ura","normal","choice",lv,"in_table","つぎの 中で 九九の 答えに ない数は どれですか。",
      {primary:"九九の 答えを 思い出す",alternate:"見たことの ない 数を さがす"});
    question.number=missing;
    question.choices=choices;
    question.ans=choices.indexOf(String(missing));
    return question;
  }

  function commuteFacts(){
    var facts=[];
    for(var a=2;a<=9;a++)for(var b=a+1;b<=9;b++)facts.push([a,b]);
    return facts;
  }

  function buildCommuteQuestion(lv,factors,random){
    var product=factors[0]*factors[1],swapped=[factors[1],factors[0]],correct=expression(swapped);
    var distractors=sample(nearFactorPairs(swapped),3,random).map(expression);
    var choices=shuffle([correct].concat(distractors),random);
    var question=baseQuestion("kom_kuku_ura","normal","choice",lv,"commute",expression(factors)+" と 同じ 答えに なるのは どれですか。",
      {primary:"1 つ 見つけたら 逆も ある",alternate:expression(swapped)+" でも "+product});
    question.product=product;
    question.factors=factors.slice();
    question.choices=choices;
    question.ans=choices.indexOf(correct);
    return question;
  }

  /* 相手側も 2 以上であることを要求する。8 を 8×1 で「作れる」と数えると、
     共通因数の問いが 1 の扱いだけで揺れてしまう。 */
  function factorCanMake(product,factor){
    return isInteger(factor)&&factor>=2&&factor<=9&&product%factor===0&&product/factor>=2&&product/factor<=9;
  }

  function factorGroups(products){
    var groups={common:[],left:[],right:[],neither:[]};
    range(2,9).forEach(function(factor){
      var left=factorCanMake(products[0],factor),right=factorCanMake(products[1],factor);
      if(left&&right)groups.common.push(factor);
      else if(left)groups.left.push(factor);
      else if(right)groups.right.push(factor);
      else groups.neither.push(factor);
    });
    return groups;
  }

  function commonProductPairs(){
    var pairs=[];
    PRODUCT_VALUES.forEach(function(left,leftIndex){
      PRODUCT_VALUES.slice(leftIndex+1).forEach(function(right){
        var pair=[left,right],groups=factorGroups(pair);
        if(groups.common.length&&groups.left.length&&groups.right.length&&groups.neither.length)pairs.push(pair);
      });
    });
    return pairs;
  }

  var COMMON_PRODUCT_PAIRS=commonProductPairs();

  /* 三種のおとりを固定し、片方だけ見て答える近道と無関係な数の両方を見抜かせる。 */
  function buildCommonQuestion(lv,products,random){
    var groups=factorGroups(products),answer=pick(groups.common,random);
    var distractors=[pick(groups.left,random),pick(groups.right,random),pick(groups.neither,random)];
    var choices=shuffle([answer].concat(distractors).map(String),random);
    var question=baseQuestion("kom_kuku_ura","normal","choice",lv,"common",products[0]+" と "+products[1]+" の 両方を 作れる 九九の 数は どれですか。",
      {primary:"両方に ある 数を さがす",alternate:"2 つの 九九を ならべて 見る"});
    question.products=products.slice();
    question.choices=choices;
    question.ans=choices.indexOf(String(answer));
    return question;
  }

  function buildGreatestCommonQuestion(lv,products){
    var common=factorGroups(products).common,answer=common[common.length-1];
    var question=baseQuestion("kom_kuku_ura","normal","num",lv,"greatest_common",products[0]+" と "+products[1]+" の 両方を 作れる 九九の 数の うち いちばん 大きいのは いくつですか。",
      {primary:"両方に ある 数を 大きい 方から さがす",alternate:"両方を 作れるか たしかめる"});
    question.products=products.slice();
    question.ans=answer;
    return question;
  }

  function dansForUraLv(lv){
    if(lv===1)return [2,5];
    if(lv===2)return [3,4];
    if(lv===3)return [6,7,8,9];
    return range(1,9);
  }

  function uraCandidates(sourceLv){
    if(sourceLv<=4)return factorizeFacts(dansForUraLv(sourceLv));
    if(sourceLv===5)return listAllProducts();
    if(sourceLv===6)return nonProductValues();
    if(sourceLv===7)return commuteFacts();
    return COMMON_PRODUCT_PAIRS;
  }

  function uraCandidateKey(sourceLv,candidate){
    if(sourceLv<=4)return "product:"+(candidate[0]*candidate[1]);
    if(sourceLv===5)return "product:"+candidate;
    if(sourceLv===6)return "missing:"+candidate;
    if(sourceLv===7)return "commute:"+candidate[0]+","+candidate[1];
    return "common:"+candidate[0]+","+candidate[1];
  }

  function buildUraQuestion(sourceLv,lv,candidate,random){
    if(sourceLv<=4)return buildFactorizeQuestion(lv,candidate,random);
    if(sourceLv===5)return buildListAllQuestion(lv,candidate,random);
    if(sourceLv===6)return buildInTableQuestion(lv,candidate,random);
    if(sourceLv===7)return buildCommuteQuestion(lv,candidate,random);
    if(sourceLv===8)return buildCommonQuestion(lv,candidate,random);
    return buildGreatestCommonQuestion(lv,candidate);
  }

  function buildUraSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    if(lv<10)return sample(uraCandidates(lv),REVERSE_CONFIG.setSize,random).map(function(candidate){
      return buildUraQuestion(lv,lv,candidate,random);
    });
    var questions=[],used=[];
    while(questions.length<REVERSE_CONFIG.setSize){
      var sourceLv=pick(URA_LV10_WEIGHTED,random);
      var candidates=uraCandidates(sourceLv).filter(function(candidate){return used.indexOf(uraCandidateKey(sourceLv,candidate))<0;});
      var selected=pick(candidates,random);
      used.push(uraCandidateKey(sourceLv,selected));
      questions.push(buildUraQuestion(sourceLv,10,selected,random));
    }
    return questions;
  }

  function inversePatterns(lv,random){
    var patterns;
    if(lv<=2)patterns=["multiply_right","multiply_right","multiply_right","divide_quotient","divide_quotient"];
    else if(lv<=8)patterns=["multiply_right","multiply_right","multiply_left","divide_quotient","divide_quotient"];
    else if(lv===9)patterns=["multiply_right","multiply_right","multiply_left","divide_quotient","divide_quotient"];
    else{
      patterns=["multiply_right","multiply_left","divide_quotient","divide_divisor"];
      patterns.push(pick(patterns,random));
    }
    return shuffle(patterns,random);
  }

  function inverseFactsForLv(lv,random){
    var facts=[];
    if(lv<=8){
      var dan=TEACHING_ORDER[lv-1];
      /* ×1 は答えが自明で欠け探しの訓練にならない (2×□=2)。段暗唱が扱う。 */
      return sample(range(2,9),REVERSE_CONFIG.setSize,random).map(function(b){return {dan:dan,b:b};});
    }
    TEACHING_ORDER.forEach(function(dan){range(2,9).forEach(function(b){facts.push({dan:dan,b:b});});});
    return sample(facts,REVERSE_CONFIG.setSize,random);
  }

  function inverseText(pattern,dan,b,product){
    if(pattern==="multiply_right")return dan+"×□="+product;
    if(pattern==="multiply_left")return "□×"+dan+"="+product;
    if(pattern==="divide_quotient")return product+"÷"+dan+"=□";
    return product+"÷□="+dan;
  }

  function buildInverseQuestion(lv,pattern,fact){
    var product=fact.dan*fact.b;
    var primary=pattern.indexOf("divide")===0?"わり算を かけ算の 欠け探しに する":"積から 九九の 句を 逆に たどる";
    var question=baseQuestion("kom_kuku_inverse","normal","num",lv,pattern,inverseText(pattern,fact.dan,fact.b,product),
      {primary:primary,alternate:PHRASES.phrase(fact.dan,fact.b)+" です。"});
    question.product=product;
    question.fact={dan:fact.dan,b:fact.b};
    question.ans=fact.b;
    return question;
  }

  function buildInverseSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var patterns=inversePatterns(lv,random),facts=inverseFactsForLv(lv,random);
    return facts.map(function(fact,index){return buildInverseQuestion(lv,patterns[index],fact);});
  }

  function normalizedIndexes(values,choiceCount){
    if(!Array.isArray(values))throw new Error("複数選択の回答が正しくありません");
    var result=[];
    values.forEach(function(value){
      if(!isInteger(value)||value<0||value>=choiceCount)throw new Error("複数選択の回答が正しくありません");
      if(result.indexOf(value)<0)result.push(value);
    });
    return result.sort(function(a,b){return a-b;});
  }

  function judge(question,answer){
    if(!isObject(question)||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="choice"){
      if(!Array.isArray(question.choices)||!isInteger(question.ans)||question.ans<0||question.ans>=question.choices.length||!isInteger(answer))throw new Error("選択問題の回答が正しくありません");
      return question.ans===answer;
    }
    if(question.kind==="num"){
      if(typeof question.ans!=="number"||!isFinite(question.ans)||(typeof answer!=="number"&&typeof answer!=="string")||(typeof answer==="string"&&!/\S/.test(answer)))throw new Error("数値問題の回答が正しくありません");
      var numeric=Number(answer);
      if(!isFinite(numeric))throw new Error("数値問題の回答が正しくありません");
      return numeric===question.ans;
    }
    if(question.kind==="find_all"){
      if(!Array.isArray(question.choices)||!Array.isArray(question.ans))throw new Error("複数選択問題の指定が正しくありません");
      var expected=normalizedIndexes(question.ans,question.choices.length);
      var actual=normalizedIndexes(answer,question.choices.length);
      return expected.length===actual.length&&expected.every(function(value,index){return value===actual[index];});
    }
    throw new Error("問題形式の指定が正しくありません");
  }

  global.Q4B_KOMOREBI_KUKU_REVERSE={
    config:REVERSE_CONFIG,
    productsTable:productsTable,
    decompositions:decompositions,
    properDecompositions:properDecompositions,
    isKukuProduct:isKukuProduct,
    buildUraSet:buildUraSet,
    buildInverseSet:buildInverseSet,
    judge:judge
  };
})(window);
