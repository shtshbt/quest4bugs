"use strict";

var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var generatorPath=path.join(root,"komorebi/hayasa_generator.js");
var source=fs.readFileSync(generatorPath,"utf8");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);

var hayasa=context.Q4B_KOMOREBI_HAYASA;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function unique(array){var result=[];array.forEach(function(value){if(result.indexOf(value)<0)result.push(value);});return result;}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b!==0){var remainder=a%b;a=b;b=remainder;}return a||1;}
function fraction(num,den){var divisor=gcd(num,den);return {num:num/divisor,den:den/divisor};}
function equal(left,right){return left.num*right.den===right.num*left.den;}
function decimalFraction(value){
  var parts=String(value).split("."),den=parts.length===2?Math.pow(10,parts[1].length):1;
  return fraction(Number(parts.join("")),den);
}
function physical(value,unitId){
  var amount=decimalFraction(value),unit=hayasa.units[unitId];
  return fraction(amount.num*unit.num,amount.den*unit.den);
}
function permutations(items){
  var result=[];
  function visit(prefix,remaining){
    if(!remaining.length){result.push(prefix);return;}
    remaining.forEach(function(value,index){visit(prefix.concat([value]),remaining.slice(0,index).concat(remaining.slice(index+1)));});
  }
  visit([],items);
  return result;
}
function respectsRequires(question,order){
  var positions=[];
  order.forEach(function(index,position){positions[index]=position;});
  return question.parts.every(function(part,index){return values(part.requires).every(function(required){return positions[required]<positions[index];});});
}
function formatCounts(set){
  var result={normal:0,formulation:0,ordering:0,diagnosis:0};
  set.forEach(function(question){result[question.format]++;});
  return result;
}
function eachQuestion(fn){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set,setIndex){set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});});
}
function carryCondition(question){
  if(question.carryOver==="sum_diff_human")return ["meet","chase","lap"].indexOf(question.pattern)>=0;
  if(question.carryOver!=="unit_align")return false;
  var speedTime=question.display.speed&&question.display.speed.indexOf("時速")===0?"時間":(question.display.speed&&question.display.speed.indexOf("分速")===0?"分":"秒");
  var speedDistance=question.display.speed==="時速km"?"km":"m";
  return (question.display.time&&question.display.time!==speedTime)||(question.display.dist&&question.display.dist!==speedDistance);
}

var corpus={},random=seeded(20260814);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++)corpus[corpusLv].push(hayasa.buildSet(corpusLv,random));
}

test("all levels have the specified five-question format mix",function(){
  var expected={
    1:{normal:3,formulation:2,ordering:0,diagnosis:0},2:{normal:2,formulation:2,ordering:0,diagnosis:1},
    3:{normal:4,formulation:0,ordering:0,diagnosis:1},4:{normal:2,formulation:0,ordering:2,diagnosis:1},
    5:{normal:2,formulation:3,ordering:0,diagnosis:0},6:{normal:2,formulation:1,ordering:0,diagnosis:2},
    7:{normal:2,formulation:0,ordering:2,diagnosis:1},8:{normal:2,formulation:1,ordering:0,diagnosis:2},
    9:{normal:2,formulation:1,ordering:0,diagnosis:2},10:{normal:1,formulation:1,ordering:1,diagnosis:2}
  };
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){assert.deepEqual(formatCounts(set),expected[lv]);assert.equal(set.length,hayasa.config.setSize);});
});

test("base distance and time stay integer and numeric answers recompute exactly",function(){
  eachQuestion(function(question){
    assert.equal(Number.isInteger(question.base.d),true,question.text);
    assert.equal(Number.isInteger(question.base.t),true,question.text);
    if(question.format!=="normal"||question.kind==="choice")return;
    var answerUnit=question.ansUnit||question.display[question.unknown];
    if(question.unknown==="dist")assert.equal(equal(physical(question.ans,answerUnit),fraction(question.base.d,1)),true,question.text);
    if(question.unknown==="time")assert.equal(equal(physical(question.ans,answerUnit),fraction(question.base.t,1)),true,question.text);
    if(question.unknown==="speed")assert.equal(equal(physical(question.ans,answerUnit),fraction(question.base.d,question.base.t)),true,question.text);
    if(question.unknown==="length"){
      assert.equal(question.ans,question.model.speedMps*question.model.timeSeconds-question.model.targetLength,question.text);
    }
  });
});

test("answers are integral except for one-decimal kilometres per hour",function(){
  eachQuestion(function(question){
    if(question.kind!=="num"&&question.kind!=="num_unit")return;
    if(Number.isInteger(question.ans))return;
    assert.equal(question.ansUnit,"時速km",question.text);
    assert.equal(Number.isInteger(question.ans*10),true,question.text);
  });
});

test("number-and-unit questions expose the complete unit family",function(){
  eachQuestion(function(question){
    if(question.kind!=="num_unit")return;
    assert.equal(values(question.unitChoices).indexOf(question.ansUnit)>=0,true,question.text);
    var expected=question.unknown==="speed"?4:(question.unknown==="time"?3:2);
    assert.equal(question.unitChoices.length,expected,question.text);
    assert.equal(unique(values(question.unitChoices)).length,expected,question.text);
  });
});

test("equivalent values in another unit are named and refused",function(){
  var speed=corpus[3][0][1],distance=corpus[4][0][1],time=corpus[2][0][1];
  var cases=[
    {question:speed,value:4800,unit:"時速m"},
    {question:distance,value:0.5,unit:"km"},
    {question:time,value:time.ans*60,unit:"秒"}
  ];
  cases.forEach(function(item){
    var verdict=hayasa.judgeNumUnit(item.question,item.value,item.unit);
    assert.equal(verdict.correct,false);
    assert.equal(verdict.state,"other_unit");
    assert.match(verdict.note,/きかれているのは/);
    assert.equal(hayasa.judgeNumUnit(item.question,item.question.ans,item.question.ansUnit).correct,true);
  });
});

test("formulation choices are four rationally distinct values",function(){
  eachQuestion(function(question){
    if(question.format!=="formulation")return;
    assert.equal(question.choices.length,4,question.text);
    assert.equal(unique(values(question.choices)).length,4,question.text);
    var choices=values(question.choiceValues);
    for(var i=0;i<choices.length;i++)for(var j=i+1;j<choices.length;j++)assert.equal(equal(choices[i],choices[j]),false,question.text);
    assert.equal(hayasa.judge(question,question.ans),true);
  });
});

test("ordering dependencies have one topological order without numeric chaining",function(){
  var allOrders=permutations([0,1,2,3]),valuePositions=[0,0,0,0],orderingCount=0,identityCount=0;
  eachQuestion(function(question,lv){
    if(question.format!=="ordering")return;
    orderingCount++;
    assert.equal([4,7,10].indexOf(lv)>=0,true);
    assert.equal(question.parts.length,4);
    assert.equal(question.parts.filter(function(part){return part.value!==null;}).length,1);
    var valid=allOrders.filter(function(order){return respectsRequires(question,order);});
    assert.equal(valid.length,1,question.text);
    assert.deepEqual(valid[0],values(question.ans),question.text);
    var numericEdges=[];
    question.parts.forEach(function(part,index){
      if(part.value===null)return;
      question.parts.forEach(function(next,nextIndex){if(index!==nextIndex&&next.text.indexOf(String(part.value))>=0)numericEdges.push([index,nextIndex]);});
      valuePositions[question.ans.indexOf(index)]++;
    });
    var numericOrders=allOrders.filter(function(order){
      var positions=[];order.forEach(function(index,position){positions[index]=position;});
      return numericEdges.every(function(edge){return positions[edge[0]]<positions[edge[1]];});
    });
    assert.equal(numericOrders.length>=2,true,question.text);
    if(question.ans.join(",")==="0,1,2,3")identityCount++;
  });
  valuePositions.forEach(function(count){assert.equal(count/orderingCount>=0.2&&count/orderingCount<=0.3,true,valuePositions.join(","));});
  assert.equal(identityCount/orderingCount<=0.1,true);
});

test("diagnoses use canonical labels and their selected error exists",function(){
  var canonical=Object.keys(hayasa.diagnosisLabels).map(function(key){return hayasa.diagnosisLabels[key];});
  eachQuestion(function(question){
    if(question.format!=="diagnosis")return;
    assert.equal(question.choices.length,4);
    assert.equal(unique(values(question.choiceErrorTypes)).length>=3,true,question.text);
    values(question.choices).forEach(function(label){assert.equal(canonical.indexOf(label)>=0,true,label);});
    assert.equal(question.choiceErrorTypes[question.ans],question.errorType);
    assert.equal(question.shownAnswer===question.expectedAnswer,question.errorType==="correct",question.text);
    assert.equal(question.choices.indexOf(hayasa.diagnosisLabels.correct)>=0,true);
    assert.equal(question.choices.indexOf(hayasa.diagnosisLabels.correct_alternative),-1);
  });
});

test("the answer a diagnosis prints is the value of the formula it prints",function(){
  /* 診断は「しき」と「こたえ」を並べて見せる。値を手で書くと隣の式と合わなくなる
     (分速 80m の読み替えでは 80 ÷ 60 の隣に 1.3 が手で置かれていた)。 */
  var checked=0;
  eachQuestion(function(question){
    if(question.format!=="diagnosis")return;
    var match=/^しき (\d+(?:\.\d+)?) ([×÷+-]) (\d+(?:\.\d+)?)$/.exec(question.work[0]);
    if(!match)return;
    var left=Number(match[1]),right=Number(match[3]),value;
    if(match[2]==="×")value=left*right;
    else if(match[2]==="÷")value=left/right;
    else if(match[2]==="+")value=left+right;
    else value=left-right;
    checked++;
    assert.equal(question.shownAnswer,value,question.work.join(" / "));
  });
  assert.equal(checked>0,true);
});

test("the minute-to-hour conversion takes every number from one model",function(){
  var found=0;
  eachQuestion(function(question){
    if(question.pattern!=="rate_convert")return;
    var model=question.model;
    assert.equal(!!model,true,question.text);
    assert.equal(question.text.indexOf("分速 "+model.metresPerMinute+"m")>=0,true,question.text);
    var hourly=model.metresPerMinute*model.minutesPerHour/model.metresPerKilometre;
    var reversed=model.metresPerMinute/model.minutesPerHour;
    if(question.format==="diagnosis"){
      assert.equal(question.expectedAnswer,hourly,question.text);
      if(question.errorType!=="correct")assert.equal(question.shownAnswer,reversed,question.work.join(" / "));
    }else{
      assert.equal(question.ans,hourly,question.text);
      assert.equal(question.diagnosisWrongValue,reversed,question.text);
    }
    found++;
  });
  assert.equal(found>0,true);
});

test("train, chase, and stream parameters obey their bounds",function(){
  eachQuestion(function(question){
    if(question.model&&question.model.trainLength!=null){
      assert.equal(question.model.trainLength>=80&&question.model.trainLength<=200&&question.model.trainLength%10===0,true,question.text);
      assert.equal(question.model.targetLength===0||question.model.targetLength>=100,true,question.text);
    }
    if(question.pattern==="chase")assert.equal(question.model.v1>question.model.v2,true,question.text);
    if(question.model&&question.model.still!=null){
      assert.equal(question.model.still>2*question.model.flow,true,question.text);
      assert.equal(question.model.up>0,true,question.text);
    }
  });
});

test("context phrasing is canonical and does not repeat three times in a set",function(){
  var canonical=[];
  Object.keys(hayasa.phrasings).forEach(function(key){hayasa.phrasings[key].forEach(function(value,index){canonical.push(key+"_"+(index+1));});});
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var counts={};
    set.forEach(function(question){
      if(!question.phrasing)return;
      assert.equal(canonical.indexOf(question.phrasing)>=0,true,question.phrasing);
      counts[question.phrasing]=(counts[question.phrasing]||0)+1;
      assert.equal(question.text.indexOf(hayasa.phrasings[question.phrasing.replace(/_\d+$/,"")][Number(question.phrasing.match(/(\d+)$/)[1])-1])>=0,true,question.text);
    });
    Object.keys(counts).forEach(function(key){assert.equal(counts[key]<3,true,key);});
  });
});

test("set composition meets pattern, pair, carry-over, and section rules",function(){
  var pairLevels=[1,2,4,6,7,8,9,10];
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var patternCounts={};set.forEach(function(question){patternCounts[question.patternId]=(patternCounts[question.patternId]||0)+1;});
    Object.keys(patternCounts).forEach(function(key){assert.equal(patternCounts[key]<3,true,key);});
    if(lv===1)assert.equal(set.some(function(q){return q.pattern==="find_speed";})&&set.some(function(q){return q.pattern==="find_dist";}),true);
    if(lv===2)["find_speed","find_dist","find_time"].forEach(function(pattern){assert.equal(set.some(function(q){return q.pattern===pattern;}),true);});
    if(lv===3){assert.equal(set.filter(function(q){return q.pattern==="rate_convert";}).length>=1,true);assert.equal(set.filter(function(q){return q.pattern==="rate_compare";}).length,1);assert.equal(set.filter(function(q){return q.pattern==="rate_apply";}).length,2);}
    if(lv===4)assert.deepEqual(values(set.filter(function(q){return q.format==="normal";}).map(function(q){return q.normalization;})).sort(),["km_hour","m_sec"]);
    if(lv===5){assert.equal(set.filter(function(q){return q.direction==="sum";}).length>=2,true);assert.equal(set.filter(function(q){return q.direction==="diff";}).length>=2,true);}
    if(lv===6||lv===8)[lv===6?["meet","chase"]:["pass_cross","pass_overtake"]][0].forEach(function(pattern){assert.equal(set.some(function(q){return q.pattern===pattern;}),true);});
    if(lv===7){var normals=set.filter(function(q){return q.format==="normal";});assert.equal(normals.some(function(q){return q.pattern==="pass_bridge";}),true);assert.equal(normals.some(function(q){return q.pattern==="train_length"||q.pattern==="pass_speed";}),true);}
    if(lv===9){assert.equal(set.filter(function(q){return q.pattern==="stream_down"||q.pattern==="stream_up";}).length>=2,true);assert.equal(set.some(function(q){return q.pattern==="stream_still"||q.pattern==="stream_flow";}),true);}
    if(pairLevels.indexOf(lv)>=0){
      var paired=set.filter(function(q){return q.pairWith;});
      assert.equal(paired.length>=2,true,"Lv"+lv);
      paired.forEach(function(question,index){
        var other=set.filter(function(q){return q.id===question.pairWith;})[0];
        assert.ok(other);assert.equal(other.pairWith,question.id);assert.equal(Math.abs(set.indexOf(question)-set.indexOf(other)),1);
        assert.notEqual(other.pattern,question.pattern);assert.deepEqual(values(other.pairData),values(question.pairData));
      });
    }
    var carry=set.filter(function(q){return q.carryOver!==null;});
    if(lv>=5&&lv<=9){assert.equal(carry.length,1,"Lv"+lv);assert.equal(carry[0].carryOver,lv===9?"sum_diff_human":"unit_align");assert.equal(carryCondition(carry[0]),true,carry[0].text);}
    else assert.equal(carry.length,0,"Lv"+lv);
    if(lv===10)assert.equal(unique(set.map(function(q){return q.section;})).length>=4,true);
  });
});

test("recognition chains place their normal child immediately after",function(){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){set.forEach(function(question,index){
    if(question.chainRole!=="recognition")return;
    var child=set[index+1];assert.ok(child);assert.equal(child.format,"normal");assert.equal(child.chainId,question.chainId);assert.equal(child.patternId,question.chainPatternId);
  });});
});

test("choice answer positions are uniform under the injected random",function(){
  var counts=[0,0,0,0],total=0;
  eachQuestion(function(question){if(question.kind==="choice"){counts[question.ans]++;total++;}});
  counts.forEach(function(count){assert.equal(count/total>=0.2&&count/total<=0.3,true,counts.join(","));});
  assert.doesNotMatch(source,/Math\.random|Date\.now/);
});

test("the three documented enemy solvers stay below the threshold",function(){
  var enemyRandom=seeded(200);
  for(var sample=0;sample<200;sample++){
    var ratioSet=hayasa.buildSet(sample%2+1,enemyRandom),ratioHits=ratioSet.filter(function(question){return question.pattern==="find_speed";}).length;
    assert.equal(ratioHits/ratioSet.length<0.75,true);
    var sumSet=hayasa.buildSet(sample%2+5,enemyRandom),sumHits=sumSet.filter(function(question){return question.direction==="sum";}).length;
    assert.equal(sumHits/sumSet.length<0.75,true);
    var trainSet=hayasa.buildSet(7,enemyRandom),minimumDivideHits=trainSet.filter(function(question){return question.pattern==="pass_point"||question.pattern==="pass_bridge";}).length;
    assert.equal(minimumDivideHits/trainSet.length<0.75,true);
  }
});

test("forbidden topics never enter question or ordering text",function(){
  eachQuestion(function(question){
    var text=question.text+(question.parts?question.parts.map(function(part){return part.text;}).join(""):"");
    assert.doesNotMatch(text,/時計|長針|短針|ダイヤグラム|平均の速さ/);
  });
});

console.log("RESULT "+passed+" passed, 0 failed");
