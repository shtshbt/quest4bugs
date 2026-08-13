"use strict";

/* 同じ生成標本を全検証で共有し、各 Lv 1000 セットの条件を同じ乱数列で確かめる。 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/unit_convert_generator.js"),"utf8"),context);

var unitConvert=context.Q4B_KOMOREBI_UNIT_CONVERT;
var units=unitConvert.units;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
function unique(array){var result=[];array.forEach(function(value){if(result.indexOf(value)<0)result.push(value);});return result;}
function powerOfTen(exp){var value=1;for(var i=0;i<exp;i++)value*=10;return value;}
function converted(quantity,fromId,toId){return {mantissa:quantity.mantissa,exp:quantity.exp+units[fromId].exp-units[toId].exp};}
function combined(left,right,operation){
  var exp=Math.min(left.exp,right.exp);
  var a=left.mantissa*powerOfTen(left.exp-exp),b=right.mantissa*powerOfTen(right.exp-exp);
  return {mantissa:operation==="add"?a+b:a-b,exp:exp};
}
function expectedQuantity(question){
  var first=converted(question.from,question.from.unit,question.to);
  if(question.pattern!=="align")return first;
  return combined(first,converted(question.other,question.other.unit,question.to),question.operation);
}
function normalized(quantity){
  var mantissa=quantity.mantissa,exp=quantity.exp;
  if(mantissa===0)return {mantissa:0,exp:0};
  while(mantissa%10===0){mantissa/=10;exp++;}
  return {mantissa:mantissa,exp:exp};
}
function equalQuantities(a,b){a=normalized(a);b=normalized(b);return a.mantissa===b.mantissa&&a.exp===b.exp;}
function physical(quantity,unitId){return {mantissa:quantity.mantissa,exp:quantity.exp+units[unitId].exp};}
function formatQuantity(quantity){
  if(quantity.mantissa===0)return "0";
  var sign=quantity.mantissa<0?"-":"",digits=String(Math.abs(quantity.mantissa)),point=digits.length+quantity.exp,text;
  if(quantity.exp>=0)return sign+digits+new Array(quantity.exp+1).join("0");
  if(point<=0)text="0."+new Array(1-point).join("0")+digits;
  else text=digits.slice(0,point)+"."+digits.slice(point);
  return sign+text.replace(/0+$/g,"").replace(/\.$/g,"");
}
function permutations(valuesToPermute){
  var result=[];
  function visit(prefix,remaining){
    if(!remaining.length){result.push(prefix);return;}
    remaining.forEach(function(value,index){visit(prefix.concat([value]),remaining.slice(0,index).concat(remaining.slice(index+1)));});
  }
  visit([],valuesToPermute);
  return result;
}
function eachQuestion(fn){
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set,setIndex){set.forEach(function(question,questionIndex){fn(question,lv,set,setIndex,questionIndex);});});
}

var corpus={},corpusRandom=seeded(20260813);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++)corpus[corpusLv].push(unitConvert.buildSet(corpusLv,corpusRandom));
}

test("answers match integer mantissa and exponent calculations",function(){
  eachQuestion(function(question){
    if(question.kind!=="num"&&question.kind!=="num_unit")return;
    var expected=expectedQuantity(question);
    assert.equal(isInteger(expected.mantissa)&&isInteger(expected.exp),true);
    assert.equal(question.ans,Number(formatQuantity(expected)));
  });
  corpus[1].forEach(function(set){set.forEach(function(question){assert.equal(question.ans,100);});});
  corpus[2].forEach(function(set){assert.equal(set.some(function(question){return question.from.unit==="mL"&&question.to==="cm3"&&question.ans===1;}),true);});
  corpus[3].forEach(function(set){assert.equal(set.some(function(question){return question.from.unit==="cm3"&&question.to==="mm3";}),true);});
  corpus[6].forEach(function(set){assert.equal(set.some(function(question){return question.from.unit==="mL"&&question.to==="cm3";}),true);});
});

test("questions use at most two source units and reserve millimetre units for Lv3",function(){
  eachQuestion(function(question,lv){
    var questionUnits=[question.from.unit,question.to];
    if(question.other)questionUnits.push(question.other.unit);
    assert.equal(unique(questionUnits).length<=2,true,question.text);
    questionUnits.forEach(function(unitId){if(unitId==="mm2"||unitId==="mm3")assert.equal(lv,3);});
    if(lv!==3){
      assert.equal(question.text.indexOf("mm²"),-1);
      assert.equal(question.text.indexOf("mm³"),-1);
    }
  });
});

test("numeric answers stay within six digits except principle constants",function(){
  eachQuestion(function(question,lv){
    if(question.kind!=="num"&&question.kind!=="num_unit")return;
    var integerDigits=String(Math.floor(Math.abs(question.ans))).length;
    if(lv!==3)assert.equal(integerDigits<=6,true,question.text+" = "+question.ans);
  });
});

test("every level has the canonical format mix",function(){
  var expected={
    1:{normal:5,diagnosis:0,ordering:0},2:{normal:5,diagnosis:0,ordering:0},3:{normal:5,diagnosis:0,ordering:0},
    4:{normal:4,diagnosis:1,ordering:0},5:{normal:4,diagnosis:1,ordering:0},6:{normal:4,diagnosis:1,ordering:0},
    7:{normal:2,diagnosis:1,ordering:2},8:{normal:3,diagnosis:2,ordering:0},9:{normal:3,diagnosis:2,ordering:0},
    10:{normal:2,diagnosis:1,ordering:2}
  };
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var counts={normal:0,diagnosis:0,ordering:0};
    set.forEach(function(question){counts[question.format]++;});
    assert.deepEqual(counts,expected[lv]);
    assert.equal(set.length,unitConvert.config.setSize);
  });
});

test("answer kinds follow the level and format contract",function(){
  eachQuestion(function(question,lv){
    if(lv<=3)assert.equal(question.kind,"num");
    else if(question.format==="normal")assert.equal(question.kind,"num_unit");
    else if(question.format==="diagnosis")assert.equal(question.kind,"choice");
    else assert.equal(question.kind,"order");
  });
});

test("unit choices are four unique same-dimension adjacent units",function(){
  var ladders={area:["cm2","m2","a","ha","km2"],volume:["cm3","mL","L","m3"]};
  eachQuestion(function(question){
    if(question.kind!=="num_unit")return;
    var choices=values(question.unitChoices),ladder=ladders[question.dimension];
    assert.equal(choices.length,4);
    assert.equal(unique(choices).length,4);
    assert.equal(choices.filter(function(unitId){return unitId===question.ansUnit;}).length,1);
    choices.forEach(function(unitId){assert.equal(units[unitId].dimension,question.dimension);});
    var indexes=choices.map(function(unitId){return ladder.indexOf(unitId);}).sort(function(a,b){return a-b;});
    for(var i=1;i<indexes.length;i++)assert.equal(indexes[i],indexes[i-1]+1);
  });
});

test("every ordering has exactly one accepted permutation",function(){
  var allOrders=permutations([0,1,2,3]);
  eachQuestion(function(question){
    if(question.kind!=="order")return;
    assert.equal(values(question.parts).length,4);
    assert.equal(values(question.displayOrder).length,4);
    assert.equal(unique(values(question.displayOrder)).length,4);
    assert.equal(allOrders.filter(function(order){return unitConvert.judge(question,order);}).length,1);
  });
});

test("diagnosis uses canonical labels and a non-equivalent shown error",function(){
  var canonical=["正しい","10倍のかいだんの数がちがう","単位がちがう","計算だけまちがえている","上りと下りが逆"];
  eachQuestion(function(question,lv){
    if(question.kind!=="choice")return;
    var choices=values(question.choices),label=choices[question.ans],expected=expectedQuantity(question);
    assert.equal(choices.length,4);
    assert.equal(unique(choices).length,4);
    choices.forEach(function(choice){assert.equal(canonical.indexOf(choice)>=0,true);});
    assert.equal(canonical.indexOf(label)>=0,true);
    if(lv<8)assert.equal(choices.indexOf("上りと下りが逆"),-1);
    assert.equal(unitConvert.judge(question,question.ans),true);
    assert.equal(unitConvert.judge(question,(question.ans+1)%4),false);
    var shownEquals=equalQuantities(physical(question.shown,question.shown.unit),physical(expected,question.to));
    assert.equal(shownEquals,label==="正しい");
  });
});

test("all exposed intermediate quantities keep integer mantissas and exponents",function(){
  eachQuestion(function(question){
    [question.from,question.other,question.shown].forEach(function(quantity){
      if(!quantity)return;
      assert.equal(isInteger(quantity.mantissa),true);
      assert.equal(isInteger(quantity.exp),true);
    });
    var expected=expectedQuantity(question);
    assert.equal(isInteger(expected.mantissa),true);
    assert.equal(isInteger(expected.exp),true);
  });
});

test("question wording excludes unrelated domains",function(){
  eachQuestion(function(question){
    var text=question.text+(question.scaffold||"")+(question.parts?values(question.parts).join(""):"");
    assert.doesNotMatch(text,/秒|タイム|はやい|重さ|kg|(^|[^A-Za-z])g([^A-Za-z]|$)/);
  });
});

test("convert changes only the exponent by the unit difference",function(){
  var quantity={mantissa:12345,exp:-2};
  var result=unitConvert.convert(quantity,"ha","m2");
  assert.equal(result.mantissa,quantity.mantissa);
  assert.equal(result.exp,quantity.exp+units.ha.exp-units.m2.exp);
  assert.deepEqual(Object.keys(result).sort(),["exp","mantissa"]);
});

test("cubic centimetres and millilitres share an unchanged conversion",function(){
  assert.equal(units.cm3.exp,units.mL.exp);
  var quantity={mantissa:250,exp:0};
  var toMillilitres=unitConvert.convert(quantity,"cm3","mL"),toCubicCentimetres=unitConvert.convert(quantity,"mL","cm3");
  assert.equal(toMillilitres.mantissa,quantity.mantissa);
  assert.equal(toMillilitres.exp,quantity.exp);
  assert.equal(toCubicCentimetres.mantissa,quantity.mantissa);
  assert.equal(toCubicCentimetres.exp,quantity.exp);
});

test("formatQuantity builds canonical decimal strings",function(){
  assert.equal(unitConvert.formatQuantity({mantissa:45,exp:-2}),"0.45");
  assert.equal(unitConvert.formatQuantity({mantissa:3,exp:4}),"30000");
  assert.equal(unitConvert.formatQuantity({mantissa:4500,exp:-2}),"45");
});

test("judgeNumUnit returns correct other_unit and wrong states",function(){
  var question={
    cat:"kom_unit_convert",format:"normal",kind:"num_unit",lv:4,dimension:"area",pattern:"one_step",
    from:{mantissa:3,exp:0,unit:"ha"},to:"m2",ans:30000,ansUnit:"m2",unitChoices:["m2","a","ha","km2"]
  };
  var correct=unitConvert.judgeNumUnit(question,30000,"m2");
  var other=unitConvert.judgeNumUnit(question,300,"a");
  var wrong=unitConvert.judgeNumUnit(question,3,"m2");
  assert.equal(correct.correct,true);
  assert.equal(correct.state,"correct");
  assert.equal(correct.note,"");
  assert.equal(other.correct,false);
  assert.equal(other.state,"other_unit");
  assert.equal(other.note.indexOf("a")>=0,true);
  assert.equal(other.note.indexOf("m²")>=0,true);
  assert.equal(wrong.correct,false);
  assert.equal(wrong.state,"wrong");
  assert.equal(wrong.note,"");
});

test("Lv5 uses only the four two-step area ladder units",function(){
  var allowed=["m2","a","ha","km2"];
  corpus[5].forEach(function(set){set.forEach(function(question){
    [question.from.unit,question.to,question.shown&&question.shown.unit].forEach(function(unitId){if(unitId)assert.equal(allowed.indexOf(unitId)>=0,true);});
    if(question.unitChoices)values(question.unitChoices).forEach(function(unitId){assert.equal(allowed.indexOf(unitId)>=0,true);});
  });});
});

test("Lv7 four-part chains reject every non-canonical order",function(){
  var allOrders=permutations([0,1,2,3]);
  corpus[7].forEach(function(set){
    var orders=set.filter(function(question){return question.kind==="order";});
    assert.equal(orders.length,2);
    orders.forEach(function(question){
      assert.equal(values(question.parts).length,4);
      allOrders.forEach(function(order){assert.equal(unitConvert.judge(question,order),order.join(",")==="0,1,2,3");});
    });
  });
});

test("all levels can be independently recomputed from integer quantities",function(){
  eachQuestion(function(question){
    var expected=expectedQuantity(question);
    assert.equal(isInteger(expected.mantissa)&&isInteger(expected.exp),true);
    if(question.pattern!=="align")assert.equal(expected.mantissa,question.from.mantissa);
    if(question.kind==="num"||question.kind==="num_unit")assert.equal(formatQuantity(expected),String(question.ans));
    else if(question.kind==="order")assert.equal(question.parts[question.ans[3]].indexOf(formatQuantity(expected)+unitConvert.unitLabel(question.to))>=0,true);
  });
});

console.log("RESULT "+passed+" passed, 0 failed");
