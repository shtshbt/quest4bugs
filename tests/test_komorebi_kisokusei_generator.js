"use strict";

var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var generatorPath=path.join(root,"komorebi/kisokusei_generator.js");
var source=fs.readFileSync(generatorPath,"utf8");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);

var engine=context.Q4B_KOMOREBI_KISOKUSEI;
var passed=0;
var UNKNOWN_VALUES=["count","gaps","gap","span","relation","kindAt","occurrences","position","side","perimeter","term","terms"];
var GAP_VALUES=[2,3,4,5,6,8,10];
var POSITIVE_TYPES=["correct","correct_alternative"];
var ERROR_TYPES=["gap_vs_count","type_mismatch","remainder_read","corner_double","calc_only","increment_wrong"];
var PAIR_LEVELS=[3,5,6,7,8,9,10];

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function unique(array){var result=[];array.forEach(function(value){if(result.indexOf(value)<0)result.push(value);});return result;}
function same(left,right){return JSON.stringify(left)===JSON.stringify(right);}
function numbers(text){return (String(text).match(/\d+(?:\.\d+)?/g)||[]).sort();}
function formatCounts(set){
  var result={normal:0,formulation:0,ordering:0,diagnosis:0};
  set.forEach(function(question){result[question.format]++;});
  return result;
}
function choose(n,k){
  if(k<0||k>n)return 0;
  var result=1;
  for(var index=1;index<=k;index++)result=result*(n-k+index)/index;
  return result;
}
function permutations(items){
  var result=[];
  function visit(prefix,remaining){
    if(!remaining.length){result.push(prefix);return;}
    remaining.forEach(function(value,index){visit(prefix.concat([value]),remaining.slice(0,index).concat(remaining.slice(index+1)));});
  }
  visit([],items);return result;
}
var FOUR_ORDERS=permutations([0,1,2,3]);

function respectsDependencies(question,order){
  var positions=[],producer={};
  order.forEach(function(index,position){positions[index]=position;});
  question.parts.forEach(function(part,index){values(part.produces).forEach(function(key){producer[key]=index;});});
  return question.parts.every(function(part,index){
    return values(part.requires).every(function(key){return Object.prototype.hasOwnProperty.call(producer,key)&&positions[producer[key]]<positions[index];});
  });
}

function relationCount(relation,gaps){return relation==="both_ends"?gaps+1:(relation==="no_ends"?gaps-1:gaps);}

function validateParameters(question){
  var p=question.params;
  if(question.domain==="ueki"){
    if(p.gap!==undefined){
      assert.equal(GAP_VALUES.indexOf(p.gap)>=0,true,question.text);
      assert.equal(p.span,p.gap*p.gaps,question.text);
      assert.equal(p.span<=240,true,question.text);
      assert.equal(p.count,relationCount(question.relation,p.gaps),question.text);
      assert.equal(p.gaps>=(question.lv<=3?3:5)&&p.gaps<=(question.lv<=3?15:24),true,question.text);
      if(question.relation==="no_ends")assert.equal(p.gaps>=3,true,question.text);
    }
  }else if(question.domain==="shuuki"){
    assert.equal(p.p>=3&&p.p<=6,true,question.text);
    assert.equal(p.sequence.length,p.p,question.text);
    if(question.unknown==="kindAt"||question.unknown==="occurrences")assert.equal(p.n>=p.p*2&&p.n<=p.p*15,true,question.text);
    if(question.unknown==="position"){
      assert.equal(p.m>=2&&p.m<=15,true,question.text);
      assert.equal(p.sequence.filter(function(color){return color===p.sequence[p.targetIndex-1];}).length,1,question.text);
    }
  }else if(question.domain==="houjin"){
    assert.equal(p.side>=4&&p.side<=24,true,question.text);
    assert.equal(p.perimeter,4*(p.side-1),question.text);
    assert.equal(p.perimeter>=12&&p.perimeter<=92&&p.perimeter%4===0,true,question.text);
  }else if(question.domain==="sequence"){
    assert.equal(p.a>=1&&p.a<=15,true,question.text);
    assert.equal(p.d>=2&&p.d<=9,true,question.text);
    if(question.unknown==="term"){
      assert.equal(p.n>=8&&p.n<=30,true,question.text);
      assert.equal(p.a+p.d*(p.n-1)<=300,true,question.text);
    }else{
      assert.equal((p.last-p.a)%p.d,0,question.text);
      if(question.relation==="no_ends")assert.equal((p.last-p.a)/p.d+1>=4,true,question.text);
    }
  }
  if(question.lv===2&&question.format==="normal"){
    assert.equal(p.gaps>=3&&p.gaps<=10,true,question.text);
    assert.equal(p.gap,undefined,question.text);assert.equal(p.span,undefined,question.text);
  }
}

function validateChoices(question){
  if(question.format!=="formulation"&&question.format!=="diagnosis"&&!(question.format==="normal"&&question.kind==="choice"))return;
  assert.equal(question.choices.length,4,question.text);
  assert.equal(unique(values(question.choices)).length,4,question.text);
  assert.equal(question.ans>=0&&question.ans<4,true,question.text);
  if(question.format==="formulation"){
    var choiceValues=values(question.choiceValues);
    for(var first=0;first<choiceValues.length;first++)for(var second=first+1;second<choiceValues.length;second++)assert.notEqual(choiceValues[first],choiceValues[second],question.text);
    assert.equal(choiceValues[question.ans],question.answerValue,question.text);
    var correctSignature=question.choiceSignatures[question.ans];
    assert.equal(values(question.choiceSignatures).filter(function(signature,index){return index!==question.ans&&signature===correctSignature;}).length>=1,true,question.text);
    values(question.choiceErrorTypes).forEach(function(errorType,index){if(index!==question.ans)assert.equal(ERROR_TYPES.indexOf(errorType)>=0,true,question.text);});
  }else if(question.format==="diagnosis"){
    assert.equal(question.choiceErrorTypes[question.ans],question.errorType,question.text);
    assert.equal(question.diagnosisEvidence.expected,question.expectedAnswer,question.text);
    assert.equal(question.diagnosisEvidence.shown,question.shownAnswer,question.text);
    assert.equal(question.shownAnswer===question.expectedAnswer,POSITIVE_TYPES.indexOf(question.errorType)>=0,question.text);
    if(POSITIVE_TYPES.indexOf(question.errorType)>=0){
      assert.doesNotMatch(question.work.join(" "),/正しい手順|小さい数から同じきまりをたどる/,question.text);
      assert.match(question.work.join(" "),/\d/,question.text);
    }
    var hasCorrect=question.choiceErrorTypes.indexOf("correct")>=0,hasAlternative=question.choiceErrorTypes.indexOf("correct_alternative")>=0;
    assert.equal(hasCorrect!==hasAlternative,true,question.text);
    values(question.choices).forEach(function(label){assert.equal(values(Object.keys(engine.diagnosisLabels).map(function(key){return engine.diagnosisLabels[key];})).indexOf(label)>=0,true,label);});
  }else assert.equal(question.choiceValues[question.ans],question.answerValue,question.text);
}

function validateOrdering(question,orderingPositions){
  if(question.format!=="ordering")return;
  assert.equal(question.parts.length,4,question.text);
  assert.equal(question.ans.length,4,question.text);
  assert.equal(question.displayOrder.length,4,question.text);
  var valid=FOUR_ORDERS.filter(function(order){return respectsDependencies(question,order);});
  assert.equal(valid.length,1,question.text);
  assert.equal(same(valid[0],values(question.ans)),true,question.text);
  var numberFree=question.parts.map(function(part,index){return /\d/.test(part.text)?-1:index;}).filter(function(index){return index>=0;});
  assert.equal(numberFree.length,1,question.text);
  assert.equal(question.ans.indexOf(numberFree[0]),question.numberFreePosition,question.text);
  assert.equal(question.numberFreePosition>=0&&question.numberFreePosition<=2,true,question.text);
  question.parts.forEach(function(part){
    values(part.requires).concat(values(part.produces)).forEach(function(key){assert.doesNotMatch(key,/^step_\d+$/,question.text);});
  });
  orderingPositions[question.numberFreePosition]++;
  var numericOrder=values(question.ans).filter(function(index){return index!==numberFree[0];}),numericOnlyOrders=[];
  for(var position=0;position<=numericOrder.length;position++)numericOnlyOrders.push(numericOrder.slice(0,position).concat([numberFree[0]],numericOrder.slice(position)));
  assert.equal(unique(numericOnlyOrders.map(function(order){return order.join(",");})).length>=2,true,question.text);
}

function validatePairs(set,lv){
  var paired=set.filter(function(question){return question.pairId;});
  assert.equal(paired.length,PAIR_LEVELS.indexOf(lv)>=0?2:0,"Lv"+lv);
  if(!paired.length)return;
  assert.equal(paired[0].pairId,paired[1].pairId);
  assert.equal(Math.abs(set.indexOf(paired[0])-set.indexOf(paired[1])),1,"Lv"+lv);
  assert.equal(paired[0].pairWith,paired[1].id);assert.equal(paired[1].pairWith,paired[0].id);
  assert.deepEqual(numbers(paired[0].text),numbers(paired[1].text),"Lv"+lv+" pair numbers");
  assert.equal(paired[0].unknown!==paired[1].unknown||paired[0].relation!==paired[1].relation,true,"Lv"+lv);
  assert.notEqual(engine.semanticAnswer(paired[0]),engine.semanticAnswer(paired[1]),"Lv"+lv);
}

function validateMix(set,lv){
  if(lv===1){
    assert.equal(set.filter(function(question){return question.unknown==="gaps";}).length>=2,true);
    assert.equal(set.filter(function(question){return question.unknown==="count";}).length>=2,true);
  }else if(lv===2||lv===3){
    ["both_ends","no_ends","loop"].forEach(function(relation){assert.equal(set.some(function(question){return question.relation===relation;}),true,"Lv"+lv+" "+relation);});
  }else if(lv===4){
    assert.equal(unique(set.map(function(question){return question.relation;})).length>=2,true);
    assert.equal(unique(set.map(function(question){return question.unknown;})).length>=2,true);
  }else if(lv===5){
    ["kindAt","occurrences"].forEach(function(unknown){assert.equal(set.some(function(question){return question.unknown===unknown;}),true);});
  }else if(lv===6){
    ["occurrences","position"].forEach(function(unknown){assert.equal(set.some(function(question){return question.unknown===unknown;}),true);});
  }else if(lv===7){
    ["perimeter","side"].forEach(function(unknown){assert.equal(set.some(function(question){return question.unknown===unknown;}),true);});
  }else if(lv===8){
    ["term","terms"].forEach(function(unknown){assert.equal(set.some(function(question){return question.unknown===unknown;}),true);});
  }else if(lv===9){
    ["both_ends","no_ends"].forEach(function(relation){assert.equal(set.some(function(question){return question.relation===relation;}),true);});
  }else assert.equal(unique(set.map(function(question){return question.domain;})).length>=3,true);
}

function validatePatternRules(set,lv){
  var space=engine.config.patternSpace[lv],upper=Math.ceil(set.length/space),counts={},units=[];
  set.forEach(function(question){
    var previous=units[units.length-1];
    if(lv>=3&&question.chainId&&previous&&previous.chainId===question.chainId)return;
    units.push({patternId:question.patternId,chainId:question.chainId});
  });
  units.forEach(function(unit,index){
    counts[unit.patternId]=(counts[unit.patternId]||0)+1;
    for(var previous=Math.max(0,index-Math.min(12,space-1));previous<index;previous++){
      assert.notEqual(units[previous].patternId,unit.patternId,"Lv"+lv+" freshness");
    }
  });
  Object.keys(counts).forEach(function(key){assert.equal(counts[key]<=upper,true,"Lv"+lv+" "+key);});
}

function validateDiagnosisSet(set,lv){
  var diagnoses=set.filter(function(question){return question.format==="diagnosis";});
  if(!diagnoses.length)return;
  assert.equal(unique(diagnoses.map(function(question){return question.errorType;})).length,diagnoses.length,"Lv"+lv);
  var available=values(engine.availableErrors[lv]),limit=Math.ceil(diagnoses.length/choose(available.length,3)),counts={};
  diagnoses.forEach(function(question){
    assert.equal(question.diagnosisErrorOptions.length,3,question.text);
    question.diagnosisErrorOptions.forEach(function(errorType){assert.equal(available.indexOf(errorType)>=0,true,errorType);});
    counts[question.diagnosisCombo]=(counts[question.diagnosisCombo]||0)+1;
    if(POSITIVE_TYPES.indexOf(question.errorType)<0)assert.equal(available.indexOf(question.errorType)>=0,true,question.errorType);
    if(question.errorType==="correct_alternative")assert.equal([6,8,9,10].indexOf(lv)>=0,true,"Lv"+lv);
  });
  Object.keys(counts).forEach(function(key){assert.equal(counts[key]<=limit,true,"Lv"+lv+" "+key);});
}

function validateChain(set,lv){
  var recognition=set.filter(function(question){return question.chainRole==="recognition";});
  assert.equal(recognition.length,lv===1?0:1,"Lv"+lv);
  recognition.forEach(function(question){
    var index=set.indexOf(question),normal=set[index+1];
    assert.ok(normal,"Lv"+lv);assert.equal(normal.format,"normal","Lv"+lv);assert.equal(normal.chainId,question.chainId,"Lv"+lv);assert.equal(normal.chainModelId,question.chainModelId,"Lv"+lv);
    assert.equal(normal.domain,question.domain,"Lv"+lv);assert.equal(normal.relation,question.relation,"Lv"+lv);
    if(lv===2){assert.equal(question.unknown,"relation","Lv2");assert.equal(["count","gaps"].indexOf(normal.unknown)>=0,true,"Lv2");assert.notEqual(normal.patternId,question.patternId,"Lv2");}
    else{assert.equal(normal.unknown,question.unknown,"Lv"+lv);assert.equal(normal.patternId,question.patternId,"Lv"+lv);}
  });
}

function validateSet(set,lv,state){
  assert.equal(set.length,5,"Lv"+lv);
  assert.equal(same(formatCounts(set),engine.config.formatMix[lv]),true,"Lv"+lv);
  var sawWithoutScaffold=false,phrasing=[];
  set.forEach(function(question){
    state.patterns[lv].add(question.patternId);
    assert.equal(question.cat,"kom_kisokusei");assert.equal(question.lv,lv);assert.equal(UNKNOWN_VALUES.indexOf(question.unknown)>=0,true,question.unknown);
    var expected=engine.solve(question);assert.equal(question.answerValue,expected,question.text);
    assert.equal(typeof expected==="string"||Number.isInteger(expected)&&expected>0&&expected<=9999,true,question.text);
    if(question.kind==="num")assert.equal(question.ans,expected,question.text);
    if(question.scaffold)assert.equal(sawWithoutScaffold,false,"Lv"+lv+" scaffold");else sawWithoutScaffold=true;
    if(question.relationCue==="explicit"){
      assert.ok(question.relationPhrasing,question.text);phrasing.push(question.relationPhrasing);state.phrasings[question.relationPhrasing]=(state.phrasings[question.relationPhrasing]||0)+1;
      var group=question.relationPhrasing.replace(/_\d+$/,""),at=Number(question.relationPhrasing.match(/(\d+)$/)[1])-1;
      assert.equal(question.text.indexOf(engine.relationPhrases[group][at])>=0,true,question.text);
    }else if(question.relationCue==="implicit"){
      assert.equal(question.domain,"ueki",question.text);assert.equal(question.relationPhrasing,null,question.text);
      Object.keys(engine.relationPhrases).forEach(function(group){engine.relationPhrases[group].forEach(function(phrase){assert.equal(question.text.indexOf(phrase),-1,question.text);});});
    }else{assert.equal(question.relationCue,"none",question.text);assert.equal(question.relation,null,question.text);assert.equal(lv>=5&&lv<=8||lv===10,true,question.text);}
    validateParameters(question);validateChoices(question);validateOrdering(question,state.orderingPositions);
    assert.doesNotMatch(question.text+(question.parts?question.parts.map(function(part){return part.text;}).join(""):""),/秒|時速|分速|等比|三角数|曜日/);
    if(question.kind==="choice"){
      var groupName=question.format==="diagnosis"?"diagnosis":(question.format==="formulation"?"formulation":"color");
      state.choicePositions[groupName][question.ans]++;state.choiceTotals[groupName]++;
    }
    if(question.format==="diagnosis"){
      state.diagnosisTotals[lv]++;if(POSITIVE_TYPES.indexOf(question.errorType)>=0)state.positiveTotals[lv]++;
    }
  });
  assert.equal(unique(phrasing).length,phrasing.length,"Lv"+lv+" phrasing");
  var implicitCount=set.filter(function(question){return question.relationCue==="implicit";}).length;
  if([3,4,10].indexOf(lv)>=0)assert.equal(implicitCount>=1,true,"Lv"+lv);else assert.equal(implicitCount,0,"Lv"+lv);
  if(lv===10)assert.equal(implicitCount,1,"Lv10");
  if(lv===5)assert.equal(set.some(function(question){return question.params.n!==undefined&&question.params.n%question.params.p===0;}),true);
  validatePairs(set,lv);validateMix(set,lv);validatePatternRules(set,lv);validateDiagnosisSet(set,lv);validateChain(set,lv);
}

var state={patterns:{},phrasings:{},orderingPositions:[0,0,0],choicePositions:{formulation:[0,0,0,0],diagnosis:[0,0,0,0],color:[0,0,0,0]},choiceTotals:{formulation:0,diagnosis:0,color:0},diagnosisTotals:{},positiveTotals:{}};
for(var level=1;level<=10;level++){state.patterns[level]=new Set();state.diagnosisTotals[level]=0;state.positiveTotals[level]=0;}
var corpus={},random=seeded(20260814);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<1000;corpusIndex++){
    var generated=engine.buildSet(corpusLv,random);validateSet(generated,corpusLv,state);corpus[corpusLv].push(generated);
  }
}

test("all generated sets satisfy answer, composition, pair, cue, and parameter constraints",function(){
  for(var lv=1;lv<=10;lv++)assert.equal(corpus[lv].length,1000);
});

test("the reachable patternId spaces match the documented table",function(){
  for(var lv=1;lv<=10;lv++)assert.equal(state.patterns[lv].size,engine.config.patternSpace[lv],"Lv"+lv+" "+Array.from(state.patterns[lv]).join(","));
  assert.deepEqual(Array.from(state.patterns[10]).sort(),values(engine.allPatternIds).sort());
});

test("parameter samplers cover the documented discrete spaces and overlapping bands",function(){
  var periods=new Set(),gaps=new Set(),periodicN=[],periodicM=[],sides=[],perimeters=[];
  Object.keys(corpus).forEach(function(lv){corpus[lv].forEach(function(set){set.forEach(function(question){
    if(question.domain==="ueki"&&question.params.gap!==undefined)gaps.add(question.params.gap);
    if(question.domain==="shuuki"){
      periods.add(question.params.p);
      if(question.unknown==="position")periodicM.push(question.params.m);else periodicN.push(question.params.n);
    }
    if(question.domain==="houjin"){
      if(question.unknown==="perimeter")sides.push(question.params.side);else perimeters.push(question.params.perimeter);
    }
  });});});
  assert.deepEqual(Array.from(periods).sort(),[3,4,5,6]);
  assert.deepEqual(Array.from(gaps).sort(function(left,right){return left-right;}),GAP_VALUES);
  assert.equal(Math.max(Math.min.apply(Math,periodicN),Math.min.apply(Math,periodicM))<=Math.min(Math.max.apply(Math,periodicN),Math.max.apply(Math,periodicM)),true);
  assert.equal(Math.max(Math.min.apply(Math,sides),Math.min.apply(Math,perimeters))<=Math.min(Math.max.apply(Math,sides),Math.max.apply(Math,perimeters)),true);
});

test("relation phrasings and answer positions are uniform under injected random",function(){
  Object.keys(engine.relationPhrases).forEach(function(group){
    var counts=engine.relationPhrases[group].map(function(value,index){return state.phrasings[group+"_"+(index+1)]||0;}),total=counts.reduce(function(sum,count){return sum+count;},0),expected=1/counts.length;
    counts.forEach(function(count){assert.equal(count/total>=expected-0.06&&count/total<=expected+0.06,true,group+" "+counts.join(","));});
  });
  Object.keys(state.choicePositions).forEach(function(group){
    assert.equal(state.choiceTotals[group]>1000,true,group);
    state.choicePositions[group].forEach(function(count){assert.equal(count/state.choiceTotals[group]>=0.2&&count/state.choiceTotals[group]<=0.3,true,group+" "+state.choicePositions[group].join(","));});
  });
  var orderTotal=state.orderingPositions.reduce(function(sum,count){return sum+count;},0);
  state.orderingPositions.forEach(function(count){assert.equal(count/orderTotal>=0.28&&count/orderTotal<=0.38,true,state.orderingPositions.join(","));});
});

test("diagnosis vocabularies match the curriculum and positive answers stay at twenty to thirty percent",function(){
  var expected={
    4:["gap_vs_count","type_mismatch","calc_only"],5:["gap_vs_count","remainder_read","calc_only"],6:["gap_vs_count","remainder_read","calc_only"],
    7:["gap_vs_count","corner_double","calc_only"],8:["gap_vs_count","increment_wrong","calc_only"],9:["gap_vs_count","type_mismatch","increment_wrong","calc_only"],
    10:["gap_vs_count","type_mismatch","remainder_read","corner_double","calc_only","increment_wrong"]
  };
  Object.keys(expected).forEach(function(lv){
    assert.deepEqual(values(engine.availableErrors[lv]),expected[lv]);assert.equal(expected[lv].length>=3,true);
    var rate=state.positiveTotals[lv]/state.diagnosisTotals[lv];assert.equal(rate>=0.2&&rate<=0.3,true,"Lv"+lv+" "+rate);
  });
});

test("Lv9 type-mismatch work applies the opposite endpoint relation",function(){
  corpus[9].forEach(function(set){set.forEach(function(question){
    if(question.format!=="diagnosis"||question.errorType!=="type_mismatch")return;
    var gaps=(question.params.last-question.params.a)/question.params.d,adjust=question.relation==="both_ends"?-1:1;
    assert.equal(question.shownAnswer,gaps+adjust,question.text);
    assert.equal(question.work[0].indexOf(adjust<0?"-1":"+1")>=0,true,question.work.join(" "));
  });});
});

test("the appendix A golden fixtures pass the same set validators",function(){
  var expectedPatterns={
    1:["ueki:both_ends:gaps","ueki:both_ends:count","ueki:both_ends:gaps","ueki:both_ends:count","ueki:both_ends:gaps"],
    2:["ueki:both_ends:relation","ueki:both_ends:count","ueki:loop:relation","ueki:loop:count","ueki:no_ends:relation"],
    3:["ueki:both_ends:count","ueki:loop:count","ueki:no_ends:count","ueki:no_ends:count","ueki:both_ends:count"],
    4:["ueki:both_ends:gap","ueki:loop:gap","ueki:loop:gap","ueki:no_ends:span","ueki:both_ends:span"],
    5:["shuuki:none:kindAt","shuuki:none:occurrences","shuuki:none:kindAt","shuuki:none:kindAt","shuuki:none:occurrences"],
    6:["shuuki:none:occurrences","shuuki:none:position","shuuki:none:occurrences","shuuki:none:occurrences","shuuki:none:position"],
    7:["houjin:none:perimeter","houjin:none:perimeter","houjin:none:side","houjin:none:perimeter","houjin:none:side"],
    8:["sequence:none:term","sequence:none:term","sequence:none:terms","sequence:none:term","sequence:none:terms"],
    9:["sequence:both_ends:terms","sequence:both_ends:terms","sequence:no_ends:terms","sequence:both_ends:terms","sequence:no_ends:terms"],
    10:["ueki:both_ends:count","ueki:both_ends:count","ueki:no_ends:count","shuuki:none:kindAt","houjin:none:perimeter"]
  };
  var fixtureState={patterns:{},phrasings:{},orderingPositions:[0,0,0],choicePositions:{formulation:[0,0,0,0],diagnosis:[0,0,0,0],color:[0,0,0,0]},choiceTotals:{formulation:0,diagnosis:0,color:0},diagnosisTotals:{},positiveTotals:{}};
  for(var lv=1;lv<=10;lv++){
    fixtureState.patterns[lv]=new Set();fixtureState.diagnosisTotals[lv]=0;fixtureState.positiveTotals[lv]=0;
    var fixture=engine.buildGoldenSet(lv,seeded(1000+lv));validateSet(fixture,lv,fixtureState);
    assert.deepEqual(values(fixture.map(function(question){return question.patternId;})),expectedPatterns[lv],"Lv"+lv);
    if(lv===3){
      assert.equal(JSON.stringify(fixture[4].params),JSON.stringify({gap:6,gaps:14,span:84,count:15}));
      assert.equal(fixture[4].choices.indexOf("84÷6+1")>=0,true);
      assert.equal(fixture[4].choiceValues[fixture[4].ans],15);
    }else if(lv===4){
      assert.equal(JSON.stringify(fixture[2].params),JSON.stringify({gap:5,gaps:12,span:60,count:12}));
      assert.equal(fixture[2].ans,5);
    }
  }
});

test("generation is reproducible and never calls an ambient random source",function(){
  for(var lv=1;lv<=10;lv++)assert.equal(JSON.stringify(engine.buildSet(lv,seeded(9000+lv))),JSON.stringify(engine.buildSet(lv,seeded(9000+lv))),"Lv"+lv);
  assert.doesNotMatch(source,/Math\.random|Date\.now/);
});

test("invalid generator boundary inputs fail before returning partial sets",function(){
  [0,11,1.5,null,"3"].forEach(function(lv){assert.throws(function(){engine.buildSet(lv,seeded(1));});});
  assert.throws(function(){engine.buildSet(1,null);});
  [-0.1,1,NaN,Infinity,"0.5"].forEach(function(value){assert.throws(function(){engine.buildSet(1,function(){return value;});});});
});

function visibleProjection(question){
  return {
    lv:question.lv,format:question.format,kind:question.kind,
    numbers:(question.text.match(/\d+(?:\.\d+)?/g)||[]).map(Number),
    choices:question.choices?values(question.choices):null,
    parts:question.parts?question.parts.map(function(part){return part.text;}):null
  };
}

function blindAnswer(visible){
  if(visible.kind==="choice"){
    if(visible.format!=="formulation")return 0;
    var shapes=visible.choices.map(function(choice){return choice.replace(/\d+(?:\.\d+)?/g,"#").replace(/[^#+\-×÷()]/g,"");}),counts={};
    shapes.forEach(function(shape){counts[shape]=(counts[shape]||0)+1;});
    var mostCommon=shapes.slice().sort(function(left,right){return counts[right]-counts[left];})[0];
    return shapes.indexOf(mostCommon);
  }
  if(visible.kind==="order"){
    var noNumber=visible.parts.map(function(part,index){return /\d/.test(part)?-1:index;}).filter(function(index){return index>=0;})[0];
    return [noNumber].concat(visible.parts.map(function(part,index){return index;}).filter(function(index){return index!==noNumber;}).sort(function(left,right){return Number((visible.parts[left].match(/\d+/)||[0])[0])-Number((visible.parts[right].match(/\d+/)||[0])[0]);}));
  }
  var shown=visible.numbers,small=Math.min.apply(Math,shown),large=Math.max.apply(Math,shown);
  if(visible.lv===1)return shown[0]-1;
  if(visible.lv===3||visible.lv===4||visible.lv===10)return large/small;
  if(visible.lv===6)return Math.floor(large/4);
  if(visible.lv===7)return large>=16?large/4+1:large*4;
  if(visible.lv===8&&shown.length>=3)return shown[0]+shown[1]*(shown[shown.length-1]-1);
  if(visible.lv===9&&shown.length>=3)return (large-small)/shown[1]+1;
  return shown[0]||0;
}

test("the documented structure-blind enemy solver stays below 0.75 over 200 sets",function(){
  var enemyRandom=seeded(200),hits=0,total=0;
  for(var sample=0;sample<200;sample++)engine.buildSet(sample%10+1,enemyRandom).forEach(function(question){
    var visible=visibleProjection(question);
    assert.equal(Object.prototype.hasOwnProperty.call(visible,"params"),false);
    assert.equal(Object.prototype.hasOwnProperty.call(visible,"domain"),false);
    assert.equal(Object.prototype.hasOwnProperty.call(visible,"unknown"),false);
    if(engine.judge(question,blindAnswer(visible)))hits++;total++;
  });
  assert.equal(hits/total<0.75,true,hits+"/"+total);
});

test("generated wording does not duplicate the main-course templates",function(){
  var keisanContext={console:console};keisanContext.window=keisanContext;keisanContext.Q4B_KEISAN_NO_BOOT=true;vm.createContext(keisanContext);
  vm.runInContext(fs.readFileSync(path.join(root,"keisan/app.js"),"utf8"),keisanContext);
  var mainTexts=[];
  ["ueki","shuuki","houjin","kisokusei"].forEach(function(cat){for(var lv=1;lv<=10;lv++)for(var index=0;index<20;index++)mainTexts.push(keisanContext.Q4B_KEISAN.genBy(cat,lv).text);});
  for(var lv=1;lv<=10;lv++)corpus[lv].slice(0,20).forEach(function(set){set.forEach(function(question){assert.equal(mainTexts.indexOf(question.text),-1,question.text);});});
});

console.log("RESULT "+passed+" passed, 0 failed");
