"use strict";

/* 同じ生成標本を全検証で共有し、各 Lv 1000 セットの条件を同じ乱数列で確かめる。 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var generatorPath=path.join(root,"komorebi/frac_flow_generator.js");
var source=fs.readFileSync(generatorPath,"utf8");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);

var fracFlow=context.Q4B_KOMOREBI_FRAC_FLOW;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value;}
function unique(array){var result=[];array.forEach(function(value){if(result.indexOf(value)<0)result.push(value);});return result;}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b!==0){var remainder=a%b;a=b;b=remainder;}return a;}
function lcm(a,b){return a/gcd(a,b)*b;}
function improper(value){return {num:value.whole*value.den+value.num,den:value.den};}
function reduced(value){var divisor=gcd(value.num,value.den);return {num:value.num/divisor,den:value.den/divisor};}
function equalPairs(left,right){return left.num*right.den===right.num*left.den;}
function apply(left,operation,right){
  if(operation==="+")return reduced({num:left.num*right.den+right.num*left.den,den:left.den*right.den});
  if(operation==="-")return reduced({num:left.num*right.den-right.num*left.den,den:left.den*right.den});
  if(operation==="×")return reduced({num:left.num*right.num,den:left.den*right.den});
  return reduced({num:left.num*right.den,den:left.den*right.num});
}
function expectedPair(question){
  if(question.pattern==="reduce")return reduced(improper(question.operands[0]));
  var operations=question.operations?values(question.operations):[question.operation],result=improper(question.operands[0]);
  operations.forEach(function(operation,index){result=apply(result,operation,improper(question.operands[index+1]));});
  return result;
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
function eachNumber(value,fn){
  if(typeof value==="number"){fn(value);return;}
  if(Array.isArray(value)){value.forEach(function(item){eachNumber(item,fn);});return;}
  if(value!==null&&typeof value==="object")Object.keys(value).forEach(function(key){eachNumber(value[key],fn);});
}

var corpus={},corpusRandom=seeded(20260813);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++)corpus[corpusLv].push(fracFlow.buildSet(corpusLv,corpusRandom));
}

test("fraction answers are always reduced",function(){
  eachQuestion(function(question){
    if(question.kind==="frac"){
      assert.equal(gcd(question.ans.num,question.ans.den),1,question.text);
      assert.equal(question.ans.num<question.ans.den,true,question.text);
      assert.equal(equalPairs(improper(question.ans),expectedPair(question)),true,question.text);
    }
    if(question.kind==="order")assert.equal(gcd(expectedPair(question).num,expectedPair(question).den),1,question.text);
  });
});

test("source and answer denominators stay in range",function(){
  eachQuestion(function(question){
    values(question.operands).forEach(function(operand){
      assert.equal(operand.den>=2&&operand.den<=12,true,question.text);
    });
    if(question.kind==="frac"||question.kind==="order")assert.equal(expectedPair(question).den<=36,true,question.text);
    if(question.pattern==="common_den"&&question.format==="normal")assert.equal(Number(question.choices[question.ans])<=36,true,question.text);
  });
});

test("every level has the canonical format mix and four unique choices",function(){
  var expected={
    1:{normal:5,diagnosis:0,ordering:0},2:{normal:4,diagnosis:1,ordering:0},
    3:{normal:2,diagnosis:1,ordering:2},4:{normal:2,diagnosis:1,ordering:2},
    5:{normal:2,diagnosis:1,ordering:2},6:{normal:4,diagnosis:1,ordering:0},
    7:{normal:3,diagnosis:2,ordering:0},8:{normal:4,diagnosis:1,ordering:0},
    9:{normal:3,diagnosis:2,ordering:0},10:{normal:2,diagnosis:1,ordering:2}
  };
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){
    var counts={normal:0,diagnosis:0,ordering:0};
    assert.equal(set.length,fracFlow.config.setSize);
    set.forEach(function(question){
      counts[question.format]++;
      if(question.kind!=="choice")return;
      var choices=values(question.choices);
      assert.equal(choices.length,4);
      assert.equal(unique(choices).length,4);
      assert.equal(question.ans>=0&&question.ans<4,true);
      assert.equal(fracFlow.judge(question,question.ans),true);
      assert.equal(fracFlow.judge(question,(question.ans+1)%4),false);
    });
    assert.deepEqual(counts,expected[lv]);
  });
});

test("Lv1 reduction finishes by one greatest-common-divisor division",function(){
  corpus[1].forEach(function(set){
    var completion={reducible:false,reduced:false},reductionCount=0;
    set.forEach(function(question){
      var sourceFraction=question.operands[0],divisor=gcd(sourceFraction.num,sourceFraction.den);
      if(question.pattern==="reduce"){
        reductionCount++;
        assert.equal(divisor>1,true);
        assert.equal(question.ans.whole,0);
        assert.equal(question.ans.num,sourceFraction.num/divisor);
        assert.equal(question.ans.den,sourceFraction.den/divisor);
        assert.equal(gcd(question.ans.num,question.ans.den),1);
      }else{
        /* 完成判定は 4 つの分数から 1 つ選ぶ形。2 択の問いに 4 択を合わせると、
           答えになっていない操作の文言が選択肢に混ざる。 */
        var chosen=question.choices[question.ans],parts=/^(\d+)\/(\d+)$/.exec(chosen);
        assert.ok(parts,"選択肢が分数でない: "+chosen);
        var chosenDivisor=gcd(Number(parts[1]),Number(parts[2]));
        assert.equal(chosenDivisor>1,divisor>1,"問いと正解の向きが合っていない");
        question.choices.forEach(function(choice,index){
          if(index===question.ans)return;
          var other=/^(\d+)\/(\d+)$/.exec(choice);
          assert.ok(other,"おとりが分数でない: "+choice);
          assert.equal(gcd(Number(other[1]),Number(other[2]))>1,divisor<=1,"おとりが正解と同じ側にある");
        });
        if(divisor>1)completion.reducible=true;
        else completion.reduced=true;
      }
    });
    assert.equal(reductionCount,2);
    assert.equal(completion.reducible&&completion.reduced,true);
  });
});

test("Lv2 uses the least common denominator with the required distractors",function(){
  corpus[2].forEach(function(set){set.forEach(function(question){
    var leftDen=question.operands[0].den,rightDen=question.operands[1].den,product=leftDen*rightDen;
    if(question.format==="diagnosis"){
      assert.equal(question.choices[question.ans],"正しい");
      assert.equal(question.shown[0].den,product);
      assert.equal(question.shown[1].den,product);
      return;
    }
    var numeric=question.choices.map(function(value){return Number(value);}),answer=numeric[question.ans];
    assert.equal(answer,lcm(leftDen,rightDen));
    assert.equal(numeric.indexOf(product)>=0,true);
    assert.equal(numeric.indexOf(leftDen+rightDen)>=0,true);
    var remaining=numeric.filter(function(value){return value!==answer&&value!==product&&value!==leftDen+rightDen;});
    assert.equal(remaining.length,1);
    assert.equal((remaining[0]%leftDen===0)!==(remaining[0]%rightDen===0),true);
    assert.match(question.text,/いちばん 小さい 分母/);
  });});
});

test("Lv4 never carries and Lv5 always needs borrowing",function(){
  corpus[4].forEach(function(set){set.forEach(function(question){
    var left=question.operands[0],right=question.operands[1];
    assert.equal(left.num*right.den+right.num*left.den<=left.den*right.den,true,question.text);
  });});
  corpus[5].forEach(function(set){set.forEach(function(question){
    var left=question.operands[0],right=question.operands[1];
    assert.equal(left.num*right.den<right.num*left.den,true,question.text);
  });});
});

test("Lv6 multiplication has two independent cancellation places",function(){
  corpus[6].forEach(function(set){set.forEach(function(question){
    var left=improper(question.operands[0]),right=improper(question.operands[1]),places=0;
    if(gcd(left.num,right.den)>1)places++;
    if(gcd(right.num,left.den)>1)places++;
    assert.equal(places>=2,true,question.text);
  });});
});

test("Lv8 mixed multiplication and division can cancel after conversion",function(){
  corpus[8].forEach(function(set){set.forEach(function(question){
    var left=improper(question.operands[0]),right=improper(question.operands[1]),canCancel;
    if(question.operation==="×")canCancel=gcd(left.num,right.den)>1||gcd(right.num,left.den)>1;
    else canCancel=gcd(left.num,right.num)>1||gcd(right.den,left.den)>1;
    assert.equal(canCancel,true,question.text);
    assert.equal(question.operands.some(function(value){return value.whole>0;}),true);
  });});
});

test("every ordering accepts exactly one full permutation",function(){
  var allOrders=permutations([0,1,2,3]);
  eachQuestion(function(question){
    if(question.kind!=="order")return;
    assert.equal(values(question.parts).length,4);
    assert.equal(values(question.displayOrder).length,4);
    assert.equal(unique(values(question.displayOrder)).length,4);
    assert.equal(allOrders.filter(function(order){return fracFlow.judge(question,order);}).length,1);
  });
});

test("every ordering ends with a reduction check",function(){
  eachQuestion(function(question){
    if(question.kind!=="order")return;
    assert.match(question.parts[question.ans[3]],/約分/);
  });
});

test("diagnoses use canonical labels and semantically match the shown work",function(){
  var canonical=["正しい","約分が のこっている","通分の しかたが ちがう","くり下がりを わすれている","ひっくり返す 前に 約分している","計算だけ まちがえている"];
  eachQuestion(function(question){
    if(question.format!=="diagnosis")return;
    var choices=values(question.choices),label=choices[question.ans];
    choices.forEach(function(choice){assert.equal(canonical.indexOf(choice)>=0,true);});
    assert.equal(canonical.indexOf(label)>=0,true);
    if(question.pattern==="common_den"){
      assert.equal(label,"正しい");
      assert.equal(equalPairs(improper(question.shown[0]),improper(question.operands[0])),true);
      assert.equal(equalPairs(improper(question.shown[1]),improper(question.operands[1])),true);
      return;
    }
    var shown=improper(question.shown),expected=expectedPair(question),same=equalPairs(shown,expected);
    if(label==="正しい")assert.equal(same,true,question.text);
    else if(label==="約分が のこっている"){
      assert.equal(same,true,question.text);
      assert.equal(gcd(question.shown.num,question.shown.den)>1,true,question.text);
    }else assert.equal(same,false,question.text);
  });
  corpus[7].forEach(function(set){
    var labels=set.filter(function(question){return question.format==="diagnosis";}).map(function(question){return question.choices[question.ans];});
    assert.equal(labels.filter(function(label){return label==="ひっくり返す 前に 約分している";}).length,1);
  });
});

test("long but correct routes keep the single correct label",function(){
  var routeCount=0;
  eachQuestion(function(question){
    if(question.format!=="diagnosis")return;
    if(/仮分数|あとから 約分/.test(question.route)){
      routeCount++;
      assert.equal(question.choices[question.ans],"正しい",question.text);
    }
    values(question.choices).forEach(function(choice){assert.notEqual(choice,"正しい (べつのとき方)");});
  });
  assert.equal(routeCount>0,true);
});

test("all stored arithmetic values and recomputations remain integers",function(){
  eachQuestion(function(question){
    eachNumber(question,function(value){assert.equal(isInteger(value),true,question.text);});
    if(question.kind==="frac"||question.kind==="order"){
      var result=expectedPair(question);
      assert.equal(isInteger(result.num)&&isInteger(result.den),true,question.text);
    }
  });
  assert.doesNotMatch(source,/Math\.random|Date\.now/);
  assert.doesNotMatch(source,/=>|\b(?:let|const|class)\b|`/);
});

test("question wording contains no time or speed language",function(){
  eachQuestion(function(question){
    var text=question.text+(question.parts?values(question.parts).join(""):"");
    assert.doesNotMatch(text,/時間|速さ|秒|タイム|はやい|はやく/);
  });
});

test("judgeFraction returns correct not_reduced and wrong states",function(){
  var question={kind:"frac",ans:{whole:0,num:3,den:4}};
  var correct=fracFlow.judgeFraction(question,{whole:0,num:3,den:4});
  var notReduced=fracFlow.judgeFraction(question,{whole:0,num:6,den:8});
  var wrong=fracFlow.judgeFraction(question,{whole:0,num:2,den:3});
  assert.equal(correct.correct,true);
  assert.equal(correct.state,"correct");
  assert.equal(correct.note,"");
  assert.equal(notReduced.correct,false);
  assert.equal(notReduced.state,"not_reduced");
  assert.equal(notReduced.note,"約分が のこっているよ");
  assert.equal(wrong.correct,false);
  assert.equal(wrong.state,"wrong");
  assert.equal(wrong.note,"");
});

test("improper and mixed forms are both accepted for the same answer",function(){
  var question={kind:"frac",ans:{whole:1,num:2,den:5}};
  assert.equal(fracFlow.judgeFraction(question,{whole:0,num:7,den:5}).state,"correct");
  assert.equal(fracFlow.judgeFraction(question,{whole:1,num:2,den:5}).state,"correct");
  assert.equal(fracFlow.judgeFraction(question,{whole:"",num:7,den:5}).state,"correct");
});

test("fraction helpers reduce and round-trip with integers only",function(){
  var common=fracFlow.gcd(42,30),multiple=fracFlow.lcm(6,8);
  var reducedValue=fracFlow.reduce({num:42,den:30});
  var improperValue=fracFlow.toImproper({whole:1,num:2,den:5});
  var mixedValue=fracFlow.toMixed({num:14,den:10});
  assert.equal(common,6);
  assert.equal(multiple,24);
  assert.equal(reducedValue.num,7);
  assert.equal(reducedValue.den,5);
  assert.equal(improperValue.num,7);
  assert.equal(improperValue.den,5);
  assert.equal(mixedValue.whole,1);
  assert.equal(mixedValue.num,2);
  assert.equal(mixedValue.den,5);
  [common,multiple,reducedValue.num,reducedValue.den,improperValue.num,improperValue.den,mixedValue.whole,mixedValue.num,mixedValue.den].forEach(function(value){assert.equal(isInteger(value),true);});
  assert.equal(fracFlow.formatFraction(mixedValue),"1 と 2/5");
});

console.log("RESULT "+passed+" passed, 0 failed");
