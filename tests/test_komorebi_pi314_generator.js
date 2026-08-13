"use strict";

/* 同じ生成標本を各検証で使い、Lv ごとの 1000 セットという母数を検証項目間でそろえる。 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/pi314_generator.js"),"utf8"),context);

var pi314=context.Q4B_KOMOREBI_PI314;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function contains(array,value){return values(array).indexOf(value)>=0;}
function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
function isSquare(value){var rootValue=Math.floor(Math.sqrt(value));return rootValue*rootValue===value;}
function coefficientKey(question){return question.pattern+":"+question.subtype+":"+values(question.coefficients).join(",");}

function expectedMilli(question){
  var coefficients=values(question.coefficients);
  if(question.pattern==="recall"||question.pattern==="place"||question.pattern==="square"||question.pattern==="distribute")return 3140*coefficients[0];
  if(question.pattern==="merge")return 3140*(question.subtype==="add"?coefficients[0]+coefficients[1]:coefficients[0]-coefficients[1]);
  if(question.pattern==="advanced"){
    if(question.subtype==="square_diff")return 3140*(coefficients[0]-coefficients[1]);
    if(question.subtype==="three_term")return 3140*(coefficients[0]+coefficients[1]+coefficients[2]);
    if(question.subtype==="half")return 3140*(coefficients[0]/2);
    return 3140*(coefficients[0]+coefficients[1]);
  }
  if(question.pattern==="inverse")return coefficients[0]*1000;
  return (question.subtype==="times_ten"?31400:314)*coefficients[0];
}

function eachQuestion(fn){
  for(var lv=1;lv<=10;lv++){
    corpus[lv].forEach(function(set,setIndex){set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});});
  }
}

var corpus={};
var corpusRandom=seeded(20260813);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++)corpus[corpusLv].push(pi314.buildSet(corpusLv,corpusRandom));
}

test("answers match coefficient-only integer calculations",function(){
  eachQuestion(function(question){assert.equal(question.ans,expectedMilli(question)/1000);});
});

test("coefficients stay inside every level range",function(){
  var squares=[16,25,36,49,64,81],places=[10,20,30,40,50,60,70,80,90,100],distributed=[11,12,13,14,15,17,18,19];
  eachQuestion(function(question,lv){
    var c=values(question.coefficients),answerCoefficient;
    c.forEach(function(value){assert.equal(isInteger(value)&&value>0,true);});
    if(question.pattern==="recall"){
      assert.equal(c[0]>=(lv===2?6:1)&&c[0]<=(lv===1?5:9),true);
    }else if(question.pattern==="place"){
      assert.equal(contains(places,c[0]),true);
    }else if(question.pattern==="merge"){
      answerCoefficient=question.subtype==="add"?c[0]+c[1]:c[0]-c[1];
      assert.equal(answerCoefficient>=2&&answerCoefficient<=10,true);
      assert.equal(c[0]<=9&&c[1]<=9,true);
      if(question.subtype==="add")assert.equal(Math.abs(c[0]-c[1])<=3,true);
      else assert.equal(c[1]>=4,true);
    }else if(question.pattern==="square"){
      assert.equal(contains(squares,c[0]),true);
    }else if(question.pattern==="advanced"){
      if(question.subtype==="square_diff")assert.equal(isSquare(c[0])&&isSquare(c[1])&&c[0]-c[1]>=1&&c[0]-c[1]<=10,true);
      else if(question.subtype==="three_term")assert.equal(c[0]+c[1]+c[2]>=2&&c[0]+c[1]+c[2]<=10,true);
      else if(question.subtype==="half")assert.equal(c[0]%2===0&&c[0]/2>=1&&c[0]/2<=9,true);
      else assert.equal(contains(squares,c[0]+c[1]),true);
    }else if(question.pattern==="inverse"){
      assert.equal(contains(values(pi314.coefficientsForLv(8)),c[0]),true);
    }else if(question.pattern==="distribute"){
      assert.equal(contains(distributed,c[0]),true);
    }else{
      assert.equal(c[0]>=1&&c[0]<=9,true);
      assert.equal(question.subtype==="times_ten"||question.subtype==="times_tenth",true);
    }
  });
});

test("scaffolds have the required count and lead each set",function(){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var expected=pi314.scaffoldCount(lv),actual=0;
    set.forEach(function(question,index){
      if(question.scaffold!==null)actual++;
      assert.equal(question.scaffold!==null,index<expected);
    });
    assert.equal(actual,expected);
  });
});

test("degenerate coefficient cases never appear",function(){
  eachQuestion(function(question){
    var c=values(question.coefficients);
    assert.equal(c.indexOf(0),-1);
    if(question.pattern==="merge"&&question.subtype==="subtract")assert.notEqual(c[0],c[1]);
    if(question.pattern==="merge"){
      var merged=question.subtype==="add"?c[0]+c[1]:c[0]-c[1];
      assert.equal(merged>1&&merged<11,true);
      assert.notEqual(c[1],0);
    }
    if(question.pattern==="advanced"&&question.subtype==="square_diff")assert.notEqual(c[0],c[1]);
    if(question.pattern==="advanced"&&question.subtype==="half")assert.equal(c[0]%2,0);
  });
});

test("Lv6 scaffolds use the primary first step",function(){
  var expected={
    16:"3.14×8 = 25.12 です。",25:"314 の 半分は 157 です。",36:"3.14×18 = 56.52 です。",
    49:"3.14×50 = 157 です。",64:"3.14×32 = 100.48 です。",81:"3.14×80 = 251.2 です。"
  };
  corpus[6].forEach(function(set){set.slice(0,2).forEach(function(question){
    assert.equal(question.scaffold,expected[question.coefficients[0]]);
    if(question.coefficients[0]===16)assert.doesNotMatch(question.scaffold,/×10|×6/);
  });});
});

test("question text excludes unrelated words",function(){
  eachQuestion(function(question){assert.doesNotMatch(question.text,/円|半径|直径|円周率|秒|タイム|はやい/);});
});

test("formatted answers never keep trailing decimal zeroes",function(){
  eachQuestion(function(question){assert.doesNotMatch(pi314.formatValue(pi314.valueOf(question)),/\.\d*0$/);});
});

test("sets avoid duplicate coefficient problems except two Lv2 sevens",function(){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var seen={},sevens=0;
    set.forEach(function(question){
      var key=coefficientKey(question);
      if(lv===2&&question.coefficients[0]===7){sevens++;return;}
      assert.equal(seen[key],undefined,key);
      seen[key]=true;
    });
    if(lv===2)assert.equal(sevens,2);
  });
});

test("Lv8 mixes three divisions and two structures with square answers",function(){
  corpus[8].forEach(function(set){
    assert.equal(set.filter(function(question){return question.subtype==="divide";}).length,3);
    assert.equal(set.filter(function(question){return question.subtype==="structure";}).length,2);
    assert.equal(set.filter(function(question){return isSquare(question.ans);}).length>=2,true);
  });
});

test("Lv8 answers are integer coefficients rather than products",function(){
  corpus[8].forEach(function(set){set.forEach(function(question){
    assert.equal(isInteger(question.ans),true);
    assert.equal(question.ans,question.coefficients[0]);
    assert.notEqual(question.ans,3140*question.coefficients[0]/1000);
  });});
});

test("formatValue builds canonical decimal text",function(){
  assert.equal(pi314.formatValue(31400),"31.4");
  assert.equal(pi314.formatValue(157000),"157");
  assert.equal(pi314.formatValue(50240),"50.24");
  assert.equal(pi314.formatValue(3140),"3.14");
  assert.deepEqual(values(pi314.patterns),["recall","place","merge","square","advanced","inverse","distribute","decimal"]);
});

test("answers preserve the exact milli integer",function(){
  eachQuestion(function(question){assert.equal(Math.round(question.ans*1000),pi314.valueOf(question));});
});

test("judge accepts equivalent numeric input",function(){
  var question=null;
  corpus[4].some(function(set){return set.some(function(candidate){if(candidate.coefficients[0]===50){question=candidate;return true;}return false;});});
  assert.notEqual(question,null);
  assert.equal(pi314.judge(question,"157.0"),true);
  assert.equal(pi314.judge(question,157),true);
  assert.equal(pi314.judge(question,157.01),false);
});

test("Lv1 is a shuffle of coefficients one through five",function(){
  corpus[1].forEach(function(set){
    assert.deepEqual(values(set).map(function(question){return question.coefficients[0];}).sort(function(a,b){return a-b;}),[1,2,3,4,5]);
  });
});

test("Lv7 includes every advanced subtype",function(){
  var expected=["half","merge_to_square","square_diff","three_term"];
  corpus[7].forEach(function(set){
    var actual=values(set).map(function(question){return question.subtype;}).filter(function(value,index,array){return array.indexOf(value)===index;}).sort();
    assert.deepEqual(actual,expected);
  });
});

test("Lv10 uses only patterns from Lv3 through Lv9",function(){
  var allowed=["recall","place","merge","square","advanced","inverse","distribute","decimal"];
  corpus[10].forEach(function(set){set.forEach(function(question){assert.equal(contains(allowed,question.pattern),true);});});
});

test("Lv5 additions keep both coefficients heavy enough for the merge to pay off",function(){
  /* 1+2 は 3.14 + 6.28 で律儀に足しても軽く、まとめる技のありがたみが出ない。
     差 3 以内という条件だけでは軽い組が通るので、下限も要る。 */
  corpus[5].forEach(function(set){
    set.forEach(function(question){
      var a=question.coefficients[0],b=question.coefficients[1];
      if(question.subtype==="add"){
        assert.equal(a>=3&&b>=3,true,"軽い加算の組が出た: "+a+"+"+b);
        assert.equal(Math.abs(a-b)<=3,true,"加算の差が開きすぎ: "+a+"+"+b);
      }else{
        assert.equal(b>=4,true,"減算の引く数が小さい: "+a+"-"+b);
        assert.equal(a>b,true,"減算が退化している: "+a+"-"+b);
      }
    });
  });
});

test("Lv8 scaffolds bracket the answer from just below",function(){
  /* 遠いランドマーク (157 に対する 62.8) では当たりがつかず、足場が飾りになる。
     答えより 1 段下のきりのいい係数であることを固定する。 */
  var rounds=[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100];
  corpus[8].forEach(function(set){
    set.forEach(function(question){
      if(!question.scaffold)return;
      var match=/^3\.14×(\d+) = /.exec(question.scaffold);
      assert.ok(match,"足場の形が違う: "+question.scaffold);
      var anchor=Number(match[1]),answer=question.coefficients[0];
      assert.equal(contains(rounds,anchor),true,"きりのいい係数でない: "+anchor);
      assert.equal(anchor<answer,true,"足場が答え以上: "+anchor+" >= "+answer);
      rounds.forEach(function(candidate){
        if(candidate<answer)assert.equal(candidate<=anchor,true,"より近い足場があった: "+candidate+" (選ばれたのは "+anchor+")");
      });
    });
  });
});

console.log("RESULT "+passed+" passed, 0 failed");
