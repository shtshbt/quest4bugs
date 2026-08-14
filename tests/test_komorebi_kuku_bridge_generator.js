"use strict";

/* 同じ生成標本を 11 項目で使い、各 Lv 1000 セットの条件をそろえて比べる。 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/kuku_bridge_generator.js"),"utf8"),context);

var bridge=context.Q4B_KOMOREBI_KUKU_BRIDGE;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
function expectedAnswer(question){
  var factors=values(question.factors);
  if(question.pattern==="gather")return factors[0]*factors[1]+factors[0]*factors[2];
  return factors[0]*factors[1];
}
function factorKey(question){
  var factors=values(question.factors);
  if(factors.length===2)return factors.sort(function(a,b){return a-b;}).join("×");
  return factors[0]+"×"+factors.slice(1).sort(function(a,b){return a-b;}).join("+");
}
function eachQuestion(fn){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set,setIndex){
    set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});
  });
}

var corpus={};
var corpusRandom=seeded(20260813);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++)corpus[corpusLv].push(bridge.buildSet(corpusLv,corpusRandom));
}

test("answers are recomputed from factors with integer arithmetic",function(){
  eachQuestion(function(question){
    assert.equal(question.ans,expectedAnswer(question));
    assert.equal(bridge.judge(question,String(question.ans)),true);
    assert.equal(bridge.judge(question,question.ans+1),false);
  });
});

test("answers stay within four digits",function(){
  eachQuestion(function(question){
    assert.equal(isInteger(question.ans),true);
    assert.equal(question.ans>0&&question.ans<=9999,true);
  });
});

test("scaffolds have the required count and lead each set",function(){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var expected=bridge.scaffoldCount(lv),actual=0;
    assert.equal(set.length,5);
    set.forEach(function(question,index){
      if(question.scaffold!==null)actual++;
      assert.equal(question.scaffold!==null,index<expected);
    });
    assert.equal(actual,expected);
  });
});

test("Lv4 distribution leaves a multiplication-table part",function(){
  corpus[4].forEach(function(set){set.forEach(function(question){
    var factors=values(question.factors);
    assert.equal(question.pattern,"distribute");
    assert.equal(factors[0]>=2&&factors[0]<=9,true);
    assert.equal(factors[1]>=11&&factors[1]<=19,true);
    assert.equal(factors[1]-10>=1&&factors[1]-10<=9,true);
  });});
});

test("Lv6 gathered factors finish at ten or in the multiplication table",function(){
  corpus[6].forEach(function(set){set.forEach(function(question){
    var factors=values(question.factors),gathered=factors[1]+factors[2];
    assert.equal(question.pattern,"gather");
    assert.equal(gathered===10||(gathered>=1&&gathered<=9),true);
  });});
});

test("Lv7 uses only times nine and times nineteen",function(){
  corpus[7].forEach(function(set){set.forEach(function(question){
    assert.equal(question.pattern,"adjust");
    assert.equal([9,19].indexOf(question.factors[1])>=0,true);
  });});
});

test("Lv8 double and half problems always have an even factor",function(){
  corpus[8].forEach(function(set){set.forEach(function(question){
    assert.equal(question.pattern,"double_half");
    assert.equal(values(question.factors).some(function(value){return value%2===0;}),true);
  });});
});

test("waza wording comes only from the curriculum table",function(){
  var expected={
    times_ten:["九九の 答えに 0 を つける","10 が 前でも うしろでも 同じ"],
    tens_times:["九九の 答えを 10 ばいする","0 を あとから つける"],
    times_hundred:["九九の 答えに 0 を 2 つ つける","10 ばいを 2 回"],
    distribute:["×12 は ×10 と ×2 に わける","2 つの 九九を たす"],
    gather:["さきに まとめて ×10","べつべつに 計算しても 同じ"],
    adjust:["×9 は ×10 から 1 こ ひく","九九で 思い出しても よい"],
    double_half:["×8 は ×4 の 2 ばい","×5 は ×10 の 半分"]
  };
  eachQuestion(function(question){
    assert.equal(question.waza.primary,expected[question.pattern][0]);
    assert.equal(question.waza.alternate,expected[question.pattern][1]);
  });
});

test("question text contains no kanji",function(){
  eachQuestion(function(question){assert.doesNotMatch(question.text,/[\u3400-\u9fff]/);});
});

test("sets contain no repeated factor combination",function(){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var seen={};
    set.forEach(function(question){var key=factorKey(question);assert.equal(seen[key],undefined,key);seen[key]=true;});
  });
});

test("question text excludes time and speed wording",function(){
  eachQuestion(function(question){assert.doesNotMatch(question.text,/時間|時|分|秒|速|タイム|はやい|おそい/);});
});

console.log("RESULT "+passed+" passed, 0 failed");
