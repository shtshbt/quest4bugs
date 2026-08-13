"use strict";

/* 同じ乱数標本を全検証で共有し、Lv ごとの 1000 セットという母数をそろえる。 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"shared/kuku_phrases.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/kuku_reverse_generator.js"),"utf8"),context);

var reverse=context.Q4B_KOMOREBI_KUKU_REVERSE;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function pairFromText(text){var match=/^([1-9])×([1-9])$/.exec(text);assert.ok(match,"式の形が違う: "+text);return [Number(match[1]),Number(match[2])];}
function pairKey(pair){return pair[0]+"x"+pair[1];}
function sortedPairKeys(pairs){return values(pairs).map(function(pair){return pairKey(values(pair));}).sort();}
/* 相手側も 2 以上を要求する。8 を 8×1 で「作れる」と数えると、共通因数の
   問いが 1 の扱いだけで揺れる。生成器と同じ定義でなければ検証にならない。 */
function factorCanMake(product,factor){return factor>=2&&factor<=9&&product%factor===0&&product/factor>=2&&product/factor<=9;}
function countByPattern(set,pattern){return set.filter(function(question){return question.pattern===pattern;}).length;}

var uraCorpus={},inverseCorpus={};
var uraRandom=seeded(20260813),inverseRandom=seeded(20260814);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  uraCorpus[corpusLv]=[];
  inverseCorpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++){
    uraCorpus[corpusLv].push(reverse.buildUraSet(corpusLv,uraRandom));
    inverseCorpus[corpusLv].push(reverse.buildInverseSet(corpusLv,inverseRandom));
  }
}

function eachUraQuestion(fn){
  for(var lv=1;lv<=10;lv++)uraCorpus[lv].forEach(function(set,setIndex){set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});});
}

function eachInverseQuestion(fn){
  for(var lv=1;lv<=10;lv++)inverseCorpus[lv].forEach(function(set,setIndex){set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});});
}

function expectedNearKeys(question){
  var result=[],a=question.factors[0],b=question.factors[1];
  for(var da=-1;da<=1;da++)for(var db=-1;db<=1;db++){
    var pair=[a+da,b+db];
    if((da!==0||db!==0)&&pair[0]>=1&&pair[0]<=9&&pair[1]>=1&&pair[1]<=9&&pair[0]*pair[1]!==question.product)result.push(pairKey(pair));
  }
  return result;
}

test("ura Lv1-4 uses products with one unordered decomposition",function(){
  /* 因数 1 の分解は数えない。5 は 5×1 しか作れず、答えが自明で訓練にならない
     ので出題そのものから外してある。 */
  for(var lv=1;lv<=4;lv++)uraCorpus[lv].forEach(function(set){set.forEach(function(question){
    var unordered=values(reverse.properDecompositions(question.product)).filter(function(pair){return pair[0]<=pair[1];});
    assert.equal(question.pattern,"factorize");
    assert.equal(unordered.length,1);
    assert.equal(question.factors[0]*question.factors[1],question.product);
    assert.equal(question.factors[0]>=2&&question.factors[1]>=2,true,"因数 1 の式が出た: "+question.text);
  });});
});

test("ura Lv1-4 distractors come from neighboring factors",function(){
  for(var lv=1;lv<=4;lv++)uraCorpus[lv].forEach(function(set){set.forEach(function(question){
    var allowed=expectedNearKeys(question);
    question.choices.forEach(function(choice,index){if(index!==question.ans)assert.notEqual(allowed.indexOf(pairKey(pairFromText(choice))),-1);});
  });});
});

test("ura Lv5 lists every in-table decomposition",function(){
  uraCorpus[5].forEach(function(set){set.forEach(function(question){
    var actual=question.ans.map(function(index){return pairFromText(question.choices[index]);});
    var expected=reverse.decompositions(question.product);
    assert.equal(question.kind,"find_all");
    assert.deepEqual(sortedPairKeys(actual),sortedPairKeys(expected));
    actual.forEach(function(pair){assert.equal(pair[0]>=1&&pair[0]<=9&&pair[1]>=1&&pair[1]<=9,true);});
  });});
});

test("ura Lv6 has exactly one number outside the table",function(){
  uraCorpus[6].forEach(function(set){set.forEach(function(question){
    var absent=question.choices.filter(function(choice){return !reverse.isKukuProduct(Number(choice));});
    assert.equal(absent.length,1);
    assert.equal(question.choices[question.ans],absent[0]);
    assert.equal(Number(absent[0])>=10&&Number(absent[0])<=99,true);
  });});
});

test("ura Lv7 has exactly the exchanged expression as its answer",function(){
  uraCorpus[7].forEach(function(set){set.forEach(function(question){
    var expected=question.factors[1]+"×"+question.factors[0];
    assert.equal(question.choices[question.ans],expected);
    assert.equal(question.choices.filter(function(choice){var pair=pairFromText(choice);return pair[0]*pair[1]===question.product;}).length,1);
  });});
});

test("ura Lv8-9 common factors satisfy both products",function(){
  uraCorpus[8].forEach(function(set){set.forEach(function(question){
    var answer=Number(question.choices[question.ans]),classes={left:0,right:0,neither:0};
    assert.equal(factorCanMake(question.products[0],answer)&&factorCanMake(question.products[1],answer),true);
    question.choices.forEach(function(choice,index){
      if(index===question.ans)return;
      var factor=Number(choice),left=factorCanMake(question.products[0],factor),right=factorCanMake(question.products[1],factor);
      assert.equal(left&&right,false);
      if(left)classes.left++;else if(right)classes.right++;else classes.neither++;
    });
    assert.deepEqual(classes,{left:1,right:1,neither:1});
  });});
  uraCorpus[9].forEach(function(set){set.forEach(function(question){
    assert.equal(factorCanMake(question.products[0],question.ans)&&factorCanMake(question.products[1],question.ans),true);
    for(var factor=question.ans+1;factor<=9;factor++)assert.equal(factorCanMake(question.products[0],factor)&&factorCanMake(question.products[1],factor),false);
  });});
});

test("inverse forms have valid answers and level compositions",function(){
  var seen={};
  eachInverseQuestion(function(question){
    seen[question.pattern]=true;
    assert.equal(question.ans>=1&&question.ans<=9,true);
    assert.equal(question.product,question.fact.dan*question.fact.b);
    assert.equal(question.ans,question.fact.b);
  });
  assert.deepEqual(Object.keys(seen).sort(),["divide_divisor","divide_quotient","multiply_left","multiply_right"]);
  for(var lv=1;lv<=8;lv++)inverseCorpus[lv].forEach(function(set){
    assert.equal(countByPattern(set,"multiply_right"),lv<=2?3:2);
    assert.equal(countByPattern(set,"divide_quotient"),2);
    assert.equal(countByPattern(set,"multiply_left"),lv<=2?0:1);
  });
});

test("inverse sets never repeat a fact",function(){
  for(var lv=1;lv<=10;lv++)inverseCorpus[lv].forEach(function(set){
    var keys=set.map(function(question){return question.fact.dan+"x"+question.fact.b;});
    assert.equal(keys.filter(function(key,index){return keys.indexOf(key)===index;}).length,5);
  });
});

test("unknown divisors appear only in every inverse Lv10 set",function(){
  for(var lv=1;lv<=9;lv++)inverseCorpus[lv].forEach(function(set){assert.equal(countByPattern(set,"divide_divisor"),0);});
  inverseCorpus[10].forEach(function(set){assert.equal(countByPattern(set,"divide_divisor")>=1,true);});
});

function semanticChoiceCorrect(question,choice){
  if(question.pattern==="factorize"||question.pattern==="commute"){var pair=pairFromText(choice);return pair[0]*pair[1]===question.product;}
  if(question.pattern==="in_table")return !reverse.isKukuProduct(Number(choice));
  if(question.pattern==="common")return factorCanMake(question.products[0],Number(choice))&&factorCanMake(question.products[1],Number(choice));
  throw new Error("選択問題の形式が正しくありません");
}

test("choice arrays have four unique entries and one correct answer",function(){
  eachUraQuestion(function(question){
    assert.equal(typeof question.cat,"string");assert.equal(typeof question.format,"string");assert.equal(typeof question.kind,"string");
    assert.equal(typeof question.pattern,"string");assert.equal(typeof question.text,"string");assert.equal(question.scaffold,null);assert.equal(typeof question.waza.primary,"string");
    if(!question.choices)return;
    /* 集合完成だけは選択肢が 4 個ではない。正解の数 + おとり 2 個で、
       全部押せば通る問題にならないようにしてある。 */
    var expectedCount=question.kind==="find_all"?question.ans.length+2:4;
    assert.equal(question.choices.length,expectedCount,question.pattern+" の選択肢が "+question.choices.length+" 個");
    assert.equal(values(question.choices).filter(function(choice,index,array){return array.indexOf(choice)===index;}).length,expectedCount);
    if(question.kind==="find_all")assert.equal(question.ans.length<question.choices.length,true,"全部が正解の集合完成が出た");
    if(question.kind==="choice"){
      var correct=question.choices.filter(function(choice){return semanticChoiceCorrect(question,choice);});
      assert.equal(correct.length,1);
      assert.equal(question.choices[question.ans],correct[0]);
    }
  });
  eachInverseQuestion(function(question){assert.equal(question.cat,"kom_kuku_inverse");assert.equal(question.format,"normal");assert.equal(question.kind,"num");});
});

test("inverse division always divides evenly",function(){
  eachInverseQuestion(function(question){
    if(question.pattern==="divide_quotient")assert.equal(question.product%question.fact.dan,0);
    if(question.pattern==="divide_divisor"){
      assert.equal(question.product%question.ans,0);
      assert.equal(question.product/question.ans,question.fact.dan);
    }
  });
});

test("question text contains no time or speed wording",function(){
  eachUraQuestion(function(question){assert.doesNotMatch(question.text,/秒|時間|時刻|タイム|速さ|はやい|早い/);});
  eachInverseQuestion(function(question){assert.doesNotMatch(question.text,/秒|時間|時刻|タイム|速さ|はやい|早い/);});
});

test("decompositions returns every ordered factorization",function(){
  assert.deepEqual(sortedPairKeys(reverse.decompositions(56)),["7x8","8x7"]);
  assert.deepEqual(sortedPairKeys(reverse.decompositions(12)),["2x6","3x4","4x3","6x2"]);
});

test("productsTable and isKukuProduct cover exactly 36 values",function(){
  var table=reverse.productsTable(),expected={};
  for(var a=1;a<=9;a++)for(var b=1;b<=9;b++)expected[a*b]=true;
  assert.equal(Object.keys(table).length,36);
  for(var value=1;value<=81;value++){
    assert.equal(reverse.isKukuProduct(value),expected[value]===true);
    if(expected[value])assert.deepEqual(sortedPairKeys(table[value]),sortedPairKeys(reverse.decompositions(value)));
  }
  [-1,0,2.5,82,99,"4",null].forEach(function(value){assert.equal(reverse.isKukuProduct(value),false);});
});

test("ura Lv1-4 moves each distractor factor by at most one",function(){
  for(var lv=1;lv<=4;lv++)uraCorpus[lv].forEach(function(set){set.forEach(function(question){
    question.choices.forEach(function(choice,index){
      if(index===question.ans)return;
      var pair=pairFromText(choice),da=Math.abs(pair[0]-question.factors[0]),db=Math.abs(pair[1]-question.factors[1]);
      assert.equal(da<=1&&db<=1&&(da===1||db===1),true);
      assert.notEqual(pair[0]*pair[1],question.product);
    });
  });});
});

test("judge requires exact find_all set equality",function(){
  var question=null;
  uraCorpus[5].some(function(set){return set.some(function(candidate){if(candidate.ans.length<candidate.choices.length){question=candidate;return true;}return false;});});
  assert.notEqual(question,null);
  var expected=values(question.ans),reversed=expected.slice().reverse();
  var wrongIndex=question.choices.map(function(choice,index){return index;}).filter(function(index){return expected.indexOf(index)<0;})[0];
  assert.equal(reverse.judge(question,expected),true);
  assert.equal(reverse.judge(question,reversed),true);
  assert.equal(reverse.judge(question,expected.slice(0,-1)),false);
  assert.equal(reverse.judge(question,expected.concat([wrongIndex])),false);
});

console.log("RESULT "+passed+" passed, 0 failed");
