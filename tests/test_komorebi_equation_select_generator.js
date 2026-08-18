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
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/equation_select_generator.js"),"utf8"),context);

var equation=context.Q4B_KOMOREBI_EQUATION_SELECT;
var passed=0;
var STRUCTURES=["combine","decrease","compare","groups","share","measure","unknown_start","unknown_unit","mixed","two_step"];
var UNITS={candy:"こ",stickers:"まい",flowers:"本",books:"さつ",cars:"台"};

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function count(array,value){return values(array).filter(function(item){return item===value;}).length;}
function eachQuestion(fn){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set,setIndex){
    set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});
  });
}

function expectedChoiceMap(question){
  var n=values(question.numbers),map={};
  if(question.operation==="two_step"){
    map.correct="さいしょ "+n[0]+"×"+n[1]+"、つぎ "+n[2]+"-"+n[3];
    map.step_order_reversal="さいしょ "+n[2]+"-"+n[3]+"、つぎ "+n[0]+"×"+n[1];
    map.first_step_addition="さいしょ "+n[0]+"+"+n[1]+"、つぎ "+n[2]+"-"+(n[0]+n[1]);
    map.second_step_addition="さいしょ "+n[0]+"×"+n[1]+"、つぎ "+n[2]+"+"+n[3];
    return map;
  }
  if(question.operation==="+"){
    map.correct=n[0]+"+"+n[1];map.operation_mixup=n[0]+"-"+n[1];
    if(question.lv===9)map.irrelevant_information=n[0]+"+"+n[2];
    else map.unrelated_operation=n[0]+"×"+n[1];
    map.extra_addition=n[0]+"+"+n[1]+"+"+n[1];return map;
  }
  if(question.operation==="×"){
    map.correct=n[0]+"×"+n[1];map.written_addition=n[0]+"+"+n[1];
    /* 回数どおりに書き切った式は掛け算と同じ値になり、誤答ではなく遠回りの
       正しい式になる。数え落としか数え過ぎのどちらかにずらす。 */
    var terms=n[1]>=4?n[1]-1:n[1]+1;
    map.repeated_addition=Array(terms+1).join(n[0]+"+").slice(0,-1);
    if(question.lv===9)map.irrelevant_information=n[0]+"×"+n[2];
    else map.operation_mixup=n[0]+"÷"+n[1];
    return map;
  }
  if(question.operation==="-"){
    map.correct=n[0]+"-"+n[1];map.operation_mixup=n[0]+"+"+n[1];map.order_reversal=n[1]+"-"+n[0];
    if(question.lv===9)map.irrelevant_information=n[0]+"-"+n[2];
    else map.unrelated_operation=n[0]+"×"+n[1];
    return map;
  }
  map.correct=n[0]+"÷"+n[1];map.operation_mixup=n[0]+"×"+n[1];map.order_reversal=n[1]+"÷"+n[0];
  if(question.lv===9)map.irrelevant_information=n[0]+"÷"+n[2];
  else map.unrelated_operation=n[0]+"-"+n[1];
  return map;
}

var corpus={};
var corpusRandom=seeded(20260813);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++)corpus[corpusLv].push(equation.buildSet(corpusLv,corpusRandom));
}

test("choices are four unique formulas with exactly one correct answer",function(){
  eachQuestion(function(question,lv,set){
    assert.equal(set.length,5);
    assert.equal(question.choices.length,4);
    assert.equal(values(question.choices).filter(function(choice,index,array){return array.indexOf(choice)===index;}).length,4);
    assert.equal(count(question.choiceOperations,"correct"),1);
    assert.equal(question.choiceOperations[question.ans],"correct");
    assert.equal(equation.judge(question,question.ans),true);
    assert.equal(equation.judge(question,(question.ans+1)%4),false);
    assert.equal(question.structure,STRUCTURES[lv-1]);
  });
});

test("correct formulas match each quantity structure and stay in the k5 range",function(){
  eachQuestion(function(question){
    var n=values(question.numbers),correct=expectedChoiceMap(question).correct;
    assert.equal(question.choices[question.ans],correct);
    if(question.operation==="+")assert.equal(n[0]<=20&&n[1]<=20&&n[0]+n[1]<=20,true);
    if(question.operation==="-")assert.equal(n[0]<=20&&n[1]<=20&&n[0]-n[1]>=0,true);
    if(question.operation==="×")assert.equal(n[0]>=2&&n[0]<=9&&n[1]>=2&&n[1]<=9,true);
    if(question.operation==="÷")assert.equal(n[1]>=2&&n[1]<=9&&n[0]%n[1]===0&&n[0]/n[1]>=2&&n[0]/n[1]<=9,true);
    /* 二段階だけ金額を扱う。単価は 10 の倍数、払う額は 100 円単位で、
       1 台 6 円の車のような壊れた文脈を出さないための制約 (curriculum 5 章)。 */
    if(question.operation==="two_step")assert.equal(
      n[0]%10===0&&n[0]<=90&&n[1]>=2&&n[1]<=5&&n[3]===n[0]*n[1]&&n[2]%100===0&&n[2]<=500&&n[2]>n[3],true,
      "二段階の数値が範囲外: "+n.join(","));
  });
});

test("every distractor has one declared misconception and no random formula",function(){
  eachQuestion(function(question){
    var expected=expectedChoiceMap(question);
    assert.equal(Object.keys(expected).length,4);
    question.choiceOperations.forEach(function(type,index){
      assert.equal(Object.prototype.hasOwnProperty.call(expected,type),true,type);
      assert.equal(question.choices[index],expected[type]);
    });
  });
});

test("addition and multiplication contain no order-reversal choice",function(){
  eachQuestion(function(question){
    if(question.operation==="+"||question.operation==="×")assert.equal(values(question.choiceOperations).indexOf("order_reversal"),-1);
  });
});

test("subtraction and division contain exactly one order-reversal choice",function(){
  eachQuestion(function(question){
    if(question.operation==="-"||question.operation==="÷")assert.equal(count(question.choiceOperations,"order_reversal"),1);
  });
});

test("only the order-reversal choice subtracts a bigger number",function(){
  /* 順序の反転だけは負になるのが誤りの中身そのもの (curriculum 4 章)。ほかの型で
     負の式が出ると、負の数をまだ習っていない子には誤りの型ではなく読めない式が
     並ぶ。加法の Lv で 7-8 を置かないという 4 章の決定もここに含まれる。 */
  eachQuestion(function(question){
    values(question.choiceOperations).forEach(function(type,index){
      if(type==="order_reversal")return;
      (question.choices[index].match(/\d+-\d+/g)||[]).forEach(function(part){
        var pair=part.split("-");
        assert.equal(Number(pair[0])>=Number(pair[1]),true,question.text+" / "+question.choices[index]);
      });
    });
  });
});

test("Lv9 irrelevant information keeps its formula inside the k5 range",function(){
  /* 不要情報の肢は「文中の数を順に拾った」誤りで、正しい式と同じ土俵に立って
     いなければならない。年齢の幅だけを見て余分な数を引くと、減少では 10-12 の
     負の式が、同数のまとまりでは 8×12 の九九の外の式が出る (curriculum 2 章)。 */
  corpus[9].forEach(function(set){set.forEach(function(question){
    var extra=question.numbers[2],first=question.numbers[0];
    var index=values(question.choiceOperations).indexOf("irrelevant_information");
    assert.equal(index>=0,true);
    assert.equal(extra>=6&&extra<=12,true,question.text);
    if(question.operation==="-")assert.equal(first-extra>=1,true,question.choices[index]);
    else assert.equal(first*extra<=81,true,question.choices[index]);
  });});
});

test("Lv9 irrelevant information uses a different kind of quantity",function(){
  corpus[9].forEach(function(set){set.forEach(function(question){
    var extra=question.numbers[2];
    assert.match(question.text,new RegExp(extra+"さい"));
    assert.notEqual(UNITS[question.context],"さい");
    assert.equal(count(question.choiceOperations,"irrelevant_information"),1);
  });});
});

test("Lv10 contains exactly one reversed two-step order",function(){
  corpus[10].forEach(function(set){set.forEach(function(question){
    var expected=expectedChoiceMap(question);
    assert.equal(count(question.choiceOperations,"step_order_reversal"),1);
    assert.equal(question.choices[question.choiceOperations.indexOf("step_order_reversal")],expected.step_order_reversal);
  });});
});

test("question text uses kanji only for numbers and units",function(){
  eachQuestion(function(question){
    var kanji=question.text.match(/[\u3400-\u9fff]/g)||[];
    kanji.forEach(function(character){assert.equal("本台人円".indexOf(character)>=0,true,question.text);});
  });
});

test("contexts stay within the five curriculum contexts",function(){
  var expected=["books","candy","cars","flowers","stickers"];
  assert.deepEqual(values(equation.contexts).sort(),expected);
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    assert.deepEqual(values(set).map(function(question){return question.context;}).sort(),expected);
  });
});

test("question text contains no personal names",function(){
  eachQuestion(function(question){assert.doesNotMatch(question.text,/ゆい|たろう|はなこ|さん|くん|ちゃん|おねえさん/);});
});

test("question text excludes time and speed wording",function(){
  eachQuestion(function(question){assert.doesNotMatch(question.text,/時間|時|分|秒|速|タイム|はやい|おそい/);});
});

console.log("RESULT "+passed+" passed, 0 failed");
