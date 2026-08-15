"use strict";

var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var generatorPath=path.join(root,"komorebi/ratio_forms_generator.js");
var source=fs.readFileSync(generatorPath,"utf8");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);

var engine=context.Q4B_KOMOREBI_RATIO_FORMS;
var fixture=JSON.parse(fs.readFileSync(path.join(root,"tests/fixtures/komorebi_ratio_forms_golden.json"),"utf8"));
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function values(array){return Array.prototype.slice.call(array);}
function unique(array){var result=[];array.forEach(function(value){if(result.indexOf(value)<0)result.push(value);});return result;}
function gcd(a,b){while(b!==0){var r=a%b;a=b;b=r;}return a;}

/* Doc constants (curriculum v0.3), duplicated here on purpose to pin the spec. */
var DIRECTIONS=["decimal_to_percent","percent_to_decimal","wari_to_percent","percent_to_wari","wari_to_decimal","decimal_to_wari","fraction_to_percent","fraction_to_decimal","percent_to_fraction","decimal_to_fraction"];
var LV_SPACES={
  1:{directions:["decimal_to_percent","percent_to_decimal"],bands:["A"]},
  2:{directions:["decimal_to_percent","percent_to_decimal"],bands:["B","C"]},
  3:{directions:["wari_to_percent","percent_to_wari"],bands:["A","B"]},
  4:{directions:["wari_to_decimal","decimal_to_wari"],bands:["A","B"]},
  5:{directions:["fraction_to_percent","fraction_to_decimal"],bands:["A","C"]},
  6:{directions:["percent_to_fraction","decimal_to_fraction"],bands:["A","C"]},
  7:{directions:["decimal_to_percent","percent_to_decimal","fraction_to_percent","percent_to_fraction"],bands:["D"]}
};
var LV5_DENOMINATORS=[2,4,5,8,10,20,25,50];
var ERROR_TYPES=["shift_direction","shift_magnitude","wari_place","fraction_unreduced","fraction_denominator","invert","over_one_clip","base_mixup","rate_as_quantity","words_reversal"];
var WAZA_TABLE={
  decimal_to_percent:["百分率と小数は 100 倍・100 分の 1 で行き来する","小数点を二桁動かして確かめても同じ"],
  percent_to_decimal:["百分率と小数は 100 倍・100 分の 1 で行き来する","小数点を二桁動かして確かめても同じ"],
  wari_to_percent:["一割は 10%、一分は 1% として足す","歩合を小数に直して 100 倍しても同じ"],
  percent_to_wari:["十の位が割、一の位が分、小数第一位が厘","一度小数に直して位を数えても同じ"],
  wari_to_decimal:["小数第一位が割、第二位が分","百分率を経由しても同じ"],
  decimal_to_wari:["小数第一位が割、第二位が分","百分率を経由しても同じ"],
  fraction_to_percent:["分子を分母で割って小数にしてから直す","知っている等しい分数から百分率へ直しても同じ"],
  fraction_to_decimal:["分子を分母で割る。覚えている分数はそのまま出す","先に百分率へ直してから小数にしても同じ"],
  percent_to_fraction:["100 分のいくつから始めて約分する","小数に直してから分母を 10 か 100 に取っても同じ"],
  decimal_to_fraction:["小数第二位までは 100 分のいくつ、第三位は 1000 分のいくつから始めて約分する","百分率に直してから 100 分のいくつに取っても同じ"]
};
var WAZA_BAND_D=["1 は 100%。1 より大きければ 100% より大きい","整数部と小数部を分けて直しても同じ"];
var WAZA_PHRASE_FRONT=["「~の」「~に対する」の前がもとにする量","「~をもとにすると」と言いかえても同じ"];
var WAZA_PHRASE_BACK=["1 とみている方がもとにする量。いつも前にあるとは限らない","「~を 1 としたときの」の後ろは比べる量"];
var WAZA_VOCABULARY=[];
Object.keys(WAZA_TABLE).forEach(function(key){WAZA_TABLE[key].forEach(function(text){if(WAZA_VOCABULARY.indexOf(text)<0)WAZA_VOCABULARY.push(text);});});
[WAZA_BAND_D,WAZA_PHRASE_FRONT,WAZA_PHRASE_BACK].forEach(function(pair){pair.forEach(function(text){if(WAZA_VOCABULARY.indexOf(text)<0)WAZA_VOCABULARY.push(text);});});

var UNION={};
for(var unionLv=1;unionLv<=7;unionLv++)LV_SPACES[unionLv].directions.forEach(function(direction){
  LV_SPACES[unionLv].bands.forEach(function(band){UNION[direction+":"+band]=unionLv;});
});

var LEDGER_BY_M={};
engine.ledger.forEach(function(row){LEDGER_BY_M[row.m]=row;});

function isFractionDirection(direction){return direction.indexOf("fraction")>=0;}
function isBuaiDirection(direction){return direction.indexOf("wari")>=0;}
function decimalText(m){
  var whole=Math.floor(m/1000),rest=String(m%1000);
  while(rest.length<3)rest="0"+rest;
  rest=rest.replace(/0+$/,"");
  return rest?whole+"."+rest:String(whole);
}
function percentText(m){var whole=Math.floor(m/10),digit=m%10;return digit?whole+"."+digit:String(whole);}
function buaiText(m){
  var wari=Math.floor(m/100),bu=Math.floor(m/10)%10,rin=m%10,text="";
  if(wari)text+=wari+"割";if(bu)text+=bu+"分";if(rin)text+=rin+"厘";
  return text;
}
function thousandthsOfBuai(text){
  var total=0,match;
  match=text.match(/(\d+)割/);if(match)total+=Number(match[1])*100;
  match=text.match(/(\d+)分/);if(match)total+=Number(match[1])*10;
  match=text.match(/(\d+)厘/);if(match)total+=Number(match[1]);
  return total;
}
function reducedOf(m){var divisor=gcd(m,1000);return {n:m/divisor,d:1000/divisor};}
function bandOf(m){return m>1000?"D":(m%10!==0?"C":(m<100?"B":"A"));}
function expectedText(direction,m){
  var row=reducedOf(m);
  if(direction==="decimal_to_percent")return decimalText(m)+" を百分率で表すと何%ですか。";
  if(direction==="percent_to_decimal")return percentText(m)+"% を小数で表すといくつですか。";
  if(direction==="wari_to_percent")return buaiText(m)+"は何%ですか。";
  if(direction==="wari_to_decimal")return buaiText(m)+"を小数で表すといくつですか。";
  if(direction==="percent_to_wari")return percentText(m)+"% を歩合で表すとどれですか。";
  if(direction==="decimal_to_wari")return decimalText(m)+" を歩合で表すとどれですか。";
  if(direction==="fraction_to_percent")return row.n+"/"+row.d+" を百分率で表すと何%ですか。";
  if(direction==="fraction_to_decimal")return row.n+"/"+row.d+" を小数で表すといくつですか。";
  if(direction==="percent_to_fraction")return percentText(m)+"% を分数で表しましょう。それ以上約分できない形で答えます。";
  return decimalText(m)+" を分数で表しましょう。それ以上約分できない形で答えます。";
}
function countQuantities(text){return (text.match(/\d+(?:\.\d+)?(?=人|円|枚|ページ|mL|cm)/g)||[]).length;}

function checkConversion(question,lv){
  var row=LEDGER_BY_M[question.m];
  assert.ok(row,"ledger row "+question.m);
  assert.equal(question.band,bandOf(question.m),question.text);
  assert.equal(question.patternId,question.pattern+":"+question.band,question.text);
  var direction=question.pattern;
  if(lv<=7){
    assert.equal(LV_SPACES[lv].directions.indexOf(direction)>=0,true,"Lv"+lv+" "+direction);
    assert.equal(LV_SPACES[lv].bands.indexOf(question.band)>=0,true,"Lv"+lv+" "+question.band);
  }else if(lv<=9){
    assert.equal(Object.prototype.hasOwnProperty.call(UNION,question.patternId),true,"Lv"+lv+" "+question.patternId);
  }
  var reduced=reducedOf(question.m);
  if(isFractionDirection(direction)){
    assert.equal(reduced.d<=50,true,question.text);
    var sourceLv=lv<=7?lv:(lv<=9?UNION[question.patternId]:10);
    if(sourceLv===5||sourceLv===6)assert.equal(LV5_DENOMINATORS.indexOf(reduced.d)>=0,true,question.text);
  }
  if(isBuaiDirection(direction))assert.equal(question.m<1000,true,question.text);
  var expectedKind=direction==="percent_to_wari"||direction==="decimal_to_wari"?"choice":(direction==="percent_to_fraction"||direction==="decimal_to_fraction"?"frac":"num");
  assert.equal(question.kind,expectedKind,question.text);
  assert.equal(question.text,expectedText(direction,question.m));
  if(question.kind==="num"){
    var expectedAns=direction==="decimal_to_percent"||direction==="wari_to_percent"||direction==="fraction_to_percent"?Number(percentText(question.m)):Number(decimalText(question.m));
    assert.equal(question.ans,expectedAns,question.text);
  }else if(question.kind==="frac"){
    assert.equal(question.ans.n,reduced.n,question.text);
    assert.equal(question.ans.d,reduced.d,question.text);
    assert.equal(gcd(question.ans.n,question.ans.d),1,question.text);
  }else{
    assert.equal(question.choices.length,4,question.text);
    assert.equal(unique(values(question.choices)).length,4,question.text);
    assert.equal(question.ans>=0&&question.ans<4,true,question.text);
    question.choices.forEach(function(choice,index){
      var value=question.choiceValues[index];
      assert.equal(Number.isInteger(value)&&value>0,true,question.text);
      assert.equal(thousandthsOfBuai(choice),value,choice);
      if(index===question.ans){
        assert.equal(value,question.m,question.text);
        assert.equal(question.distractorTypes[index],null,question.text);
      }else{
        assert.notEqual(value,question.m,question.text);
        assert.equal(ERROR_TYPES.indexOf(question.distractorTypes[index])>=0,true,question.text+" "+question.distractorTypes[index]);
      }
    });
  }
  var wazaRow=WAZA_TABLE[direction];
  if(question.band==="D"){
    assert.equal(question.waza.primary,WAZA_BAND_D[0],question.text);
    assert.equal(question.waza.alternate,wazaRow[0],question.text);
  }else{
    assert.equal(question.waza.primary,wazaRow[0],question.text);
    assert.equal(question.waza.alternate,wazaRow[1],question.text);
  }
}

function checkPhrase(question,lv){
  assert.equal(["W1","W2","W3","W4"].indexOf(question.wType)>=0,true,question.text);
  assert.equal(question.patternId,question.pattern+":"+question.wType,question.text);
  assert.equal(question.kind,"choice",question.text);
  assert.equal(question.m,null,question.text);
  assert.equal(question.choices.length,4,question.text);
  assert.equal(unique(values(question.choices)).length,4,question.text);
  assert.equal(question.ans>=0&&question.ans<4,true,question.text);
  var reversals=0;
  question.distractorTypes.forEach(function(type,index){
    if(index===question.ans){assert.equal(type,null,question.text);return;}
    if(type!==null)assert.equal(["words_reversal","rate_as_quantity"].indexOf(type)>=0,true,question.text+" "+type);
    if(type==="words_reversal")reversals++;
  });
  if(question.wType==="W3"||question.wType==="W4")assert.equal(reversals,1,question.text);
  else assert.equal(reversals<=1,true,question.text);
  assert.equal(countQuantities(question.text)<=2,true,question.text);
  if(question.pattern==="phrase_equal"){
    assert.equal(["W1","W2","W3"].indexOf(question.answerWType)>=0,true,question.text);
    assert.notEqual(question.answerWType,question.wType,question.text);
  }
  var expectedWaza=question.wType==="W3"||question.wType==="W4"?WAZA_PHRASE_BACK:WAZA_PHRASE_FRONT;
  assert.equal(question.waza.primary,expectedWaza[0],question.text);
  assert.equal(question.waza.alternate,expectedWaza[1],question.text);
}

function validateSet(set,lv,state){
  assert.equal(set.length,5,"Lv"+lv);
  var conversions=[],phrases=[];
  set.forEach(function(question,index){
    assert.equal(question.cat,"kom_ratio_forms");
    assert.equal(question.format,"normal",question.text);
    assert.equal(question.lv,lv);
    assert.equal(question.id,"ratio_forms_"+lv+"_q"+(index+1));
    assert.notEqual(question.pattern,"fraction_to_wari",question.text);
    assert.notEqual(question.pattern,"wari_to_fraction",question.text);
    var isPhrase=question.pattern==="phrase_base"||question.pattern==="phrase_equal";
    assert.equal(isPhrase||DIRECTIONS.indexOf(question.pattern)>=0,true,question.pattern);
    var scaffolded=index<2&&lv<=9;
    if(scaffolded)assert.equal(typeof question.scaffold==="string"&&question.scaffold.length>0,true,"Lv"+lv+" scaffold q"+(index+1));
    else assert.equal(question.scaffold,null,"Lv"+lv+" scaffold q"+(index+1));
    assert.doesNotMatch(question.text,/時速|分速|秒速|速さ|時間/);
    var stripped=question.text.replace(/「[^」]*」/g,"");
    assert.equal(countQuantities(stripped)>=2&&/は何(人|円|枚|ページ|mL|cm)|何%\s?ですか/.test(stripped),false,question.text);
    if(isPhrase){phrases.push(question);checkPhrase(question,lv);}
    else{conversions.push(question);checkConversion(question,lv);}
    if(question.kind==="choice"&&state){state.positions[question.ans]++;state.choiceTotal++;}
    if(state&&!isPhrase&&lv<=7)state.patterns[lv][question.patternId]=true;
  });
  var expectedConversions=lv<=7?5:(lv<=9?1:3);
  assert.equal(conversions.length,expectedConversions,"Lv"+lv);
  if(lv===8)phrases.forEach(function(question){assert.equal(question.pattern,"phrase_base",question.text);});
  if(lv===9)phrases.forEach(function(question){assert.equal(question.pattern,"phrase_equal",question.text);});
  if(lv===10){
    assert.equal(phrases.filter(function(question){return question.pattern==="phrase_base";}).length,1,"Lv10");
    assert.equal(phrases.filter(function(question){return question.pattern==="phrase_equal";}).length,1,"Lv10");
  }
  var cap=lv<=7?Math.ceil(5/(LV_SPACES[lv].directions.length*LV_SPACES[lv].bands.length)):1;
  var patternCounts={};
  conversions.forEach(function(question){patternCounts[question.patternId]=(patternCounts[question.patternId]||0)+1;});
  Object.keys(patternCounts).forEach(function(key){assert.equal(patternCounts[key]<=cap,true,"Lv"+lv+" "+key+" cap");});
  var directionsInSet=unique(conversions.map(function(question){return question.pattern;}));
  if(lv<=6)assert.equal(directionsInSet.length,2,"Lv"+lv+" directions");
  if(lv===7)assert.equal(directionsInSet.length>=3,true,"Lv7 directions");
  var rowCounts={};
  conversions.forEach(function(question){rowCounts[question.m]=(rowCounts[question.m]||0)+1;});
  if(lv<=9)Object.keys(rowCounts).forEach(function(key){assert.equal(rowCounts[key],1,"Lv"+lv+" row "+key);});
  else{
    var doubled=Object.keys(rowCounts).filter(function(key){return rowCounts[key]===2;});
    assert.equal(doubled.length,1,"Lv10 pair");
    assert.equal(Object.keys(rowCounts).length,2,"Lv10 rows");
    var pair=conversions.filter(function(question){return String(question.m)===doubled[0];});
    assert.notEqual(pair[0].pattern,pair[1].pattern,"Lv10 pair patterns");
    assert.equal(pair[0].pattern.split("_to_")[0],pair[1].pattern.split("_to_")[0],"Lv10 shared given side");
  }
  if(lv>=8){
    var typeCounts={};
    phrases.forEach(function(question){typeCounts[question.wType]=(typeCounts[question.wType]||0)+1;});
    var w3=typeCounts.W3||0,w4=typeCounts.W4||0;
    assert.equal(w3>=1,true,"Lv"+lv+" W3");
    assert.equal((w3+w4)*2>=phrases.length,true,"Lv"+lv+" W3+W4");
    Object.keys(typeCounts).forEach(function(key){assert.equal(typeCounts[key]<=2,true,"Lv"+lv+" "+key);});
    if(state&&lv<=9)state.compositions[lv][["W1","W2","W3","W4"].map(function(type){return typeCounts[type]||0;}).join(",")]=true;
  }
  if(lv===5){
    set.slice(0,2).forEach(function(question){
      var denominator=reducedOf(question.m).d;
      assert.equal(question.band,"A",question.text);
      assert.equal(denominator===20||denominator===25,true,question.text);
    });
  }
}

var state={patterns:{},positions:[0,0,0,0],choiceTotal:0,compositions:{8:{},9:{}}};
for(var lvInit=1;lvInit<=7;lvInit++)state.patterns[lvInit]={};
var corpus={},corpusRandom=seeded(20260814);
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<400;corpusIndex++){
    var generated=engine.buildSet(corpusLv,corpusRandom);
    validateSet(generated,corpusLv,state);
    corpus[corpusLv].push(generated);
  }
}

test("the ledger holds exactly the documented 239 rows with equivalent four forms",function(){
  assert.equal(engine.ledger.length,239);
  var bandCounts={A:0,B:0,C:0,D:0};
  engine.ledger.forEach(function(row){
    assert.equal(Number.isInteger(row.m)&&row.m>=1&&row.m<=2000&&row.m!==1000,true,String(row.m));
    var reduced=reducedOf(row.m);
    assert.equal(row.m%10===0||reduced.d<=50,true,String(row.m));
    assert.equal(row.band,bandOf(row.m));
    assert.equal(row.fracOk,reduced.d<=50);
    assert.equal(row.buaiOk,row.m<1000);
    assert.equal(row.rin,row.m%10!==0);
    assert.equal(row.numerator,reduced.n);
    assert.equal(row.denominator,reduced.d);
    assert.equal(gcd(row.numerator,row.denominator),1);
    bandCounts[row.band]++;
    /* four-form equivalence by integer thousandths, never by floats */
    var decimalParts=engine.decimalTextOf(row.m).split("."),frac=decimalParts[1]||"";
    while(frac.length<3)frac+="0";
    assert.equal(Number(decimalParts[0])*1000+Number(frac),row.m,String(row.m));
    var percentParts=engine.percentTextOf(row.m).split(".");
    assert.equal(Number(percentParts[0])*10+(percentParts[1]?Number(percentParts[1]):0),row.m,String(row.m));
    if(row.buaiOk)assert.equal(thousandthsOfBuai(engine.buaiTextOf(row.m)),row.m,String(row.m));
    assert.equal(row.numerator*1000,row.m*row.denominator,String(row.m));
  });
  assert.deepEqual(bandCounts,{A:90,B:9,C:20,D:120});
});

test("all generated sets satisfy band, direction, dispersion, scaffold, and boundary rules",function(){
  for(var lv=1;lv<=10;lv++)assert.equal(corpus[lv].length,400);
});

test("the reachable patternId spaces for Lv1-7 match the documented table",function(){
  for(var lv=1;lv<=7;lv++){
    var expected=[];
    LV_SPACES[lv].directions.forEach(function(direction){LV_SPACES[lv].bands.forEach(function(band){expected.push(direction+":"+band);});});
    assert.deepEqual(Object.keys(state.patterns[lv]).sort(),expected.sort(),"Lv"+lv);
  }
});

test("all ten directions and the waza table cover each other",function(){
  DIRECTIONS.forEach(function(direction){
    assert.ok(engine.waza.direction[direction],direction);
    assert.deepEqual(values(engine.waza.direction[direction]),WAZA_TABLE[direction],direction);
  });
  var seen={};
  for(var lv=1;lv<=10;lv++)corpus[lv].forEach(function(set){set.forEach(function(question){
    assert.equal(WAZA_VOCABULARY.indexOf(question.waza.primary)>=0,true,question.waza.primary);
    assert.equal(WAZA_VOCABULARY.indexOf(question.waza.alternate)>=0,true,question.waza.alternate);
    if(DIRECTIONS.indexOf(question.pattern)>=0)seen[question.pattern]=true;
  });});
  assert.equal(Object.keys(seen).length,10,Object.keys(seen).join(","));
});

test("correct answer positions stay uniform under the injected random",function(){
  assert.equal(state.choiceTotal>=3200,true,String(state.choiceTotal));
  state.positions.forEach(function(count){
    var share=count/state.choiceTotal;
    assert.equal(share>=0.2&&share<=0.3,true,state.positions.join(","));
  });
});

test("Lv8 and Lv9 phrase compositions vary instead of freezing into one fixed shape",function(){
  engine.compositions.forEach(function(counts){
    assert.equal(counts.length,4);
    assert.equal(counts[0]+counts[1]+counts[2]+counts[3],4);
    assert.equal(counts[2]>=1,true,counts.join(","));
    assert.equal(counts[2]+counts[3]>=2,true,counts.join(","));
    counts.forEach(function(count){assert.equal(count<=2,true,counts.join(","));});
  });
  assert.equal(Object.keys(state.compositions[8]).length>=5,true,Object.keys(state.compositions[8]).join(" / "));
  assert.equal(Object.keys(state.compositions[9]).length>=5,true,Object.keys(state.compositions[9]).join(" / "));
});

test("the appendix existence-proof sets pass the same validators and match the fixture",function(){
  for(var lv=1;lv<=10;lv++){
    var golden=engine.buildGoldenSet(lv,seeded(500+lv));
    validateSet(golden,lv,null);
    var expected=fixture[String(lv)];
    assert.equal(expected.length,5,"Lv"+lv);
    golden.forEach(function(question,index){
      var spec=expected[index];
      assert.equal(question.pattern,spec.pattern,"Lv"+lv+" q"+(index+1));
      assert.equal(question.kind,spec.kind,"Lv"+lv+" q"+(index+1));
      assert.equal(question.text,spec.text,"Lv"+lv+" q"+(index+1));
      assert.equal(question.scaffold,spec.scaffold,"Lv"+lv+" q"+(index+1));
      if(spec.m!==undefined){assert.equal(question.m,spec.m);assert.equal(question.band,spec.band);}
      if(spec.wType)assert.equal(question.wType,spec.wType);
      if(spec.answerWType)assert.equal(question.answerWType,spec.answerWType);
      if(spec.kind==="num")assert.equal(question.ans,spec.ans);
      else if(spec.kind==="frac"){assert.equal(question.ans.n,spec.ans.n);assert.equal(question.ans.d,spec.ans.d);}
      else{
        var specTexts=spec.choices.map(function(choice){return choice.text;});
        assert.deepEqual(values(question.choices).slice().sort(),specTexts.slice().sort(),"Lv"+lv+" q"+(index+1));
        var correctSpec=spec.choices.filter(function(choice){return choice.correct;})[0];
        assert.equal(question.choices[question.ans],correctSpec.text,"Lv"+lv+" q"+(index+1));
        spec.choices.forEach(function(choice){
          var at=question.choices.indexOf(choice.text);
          assert.equal(question.distractorTypes[at],choice.type,choice.text);
          if(choice.value!==undefined)assert.equal(question.choiceValues[at],choice.value,choice.text);
        });
      }
    });
  }
});

/* Word-order enemy solver (curriculum 9 章の検証 21): pick the choice naming the
   quantity just before the last quantity-attached 「の」/「に対する」. */
var DELIMITERS=" 、。「」はがをと";
function chunkBefore(text,index){
  var start=index;
  while(start>0&&DELIMITERS.indexOf(text.charAt(start-1))<0)start--;
  return text.slice(start,index);
}
function lastQuantityBase(text,choices,numericOnly){
  var best=null;
  for(var i=0;i<text.length;i++){
    var markerLength=0;
    if(text.slice(i,i+4)==="に対する")markerLength=4;
    else if(text.charAt(i)==="の")markerLength=1;
    if(!markerLength)continue;
    var chunk=chunkBefore(text,i);
    if(chunk&&!/^[\d.]+%?$/.test(chunk)&&!/%$/.test(chunk)){
      var quantity=/\d+(?:\.\d+)?(人|円|枚|ページ|mL|cm)$/.test(chunk);
      if(!quantity&&!numericOnly&&chunk.length>=2)quantity=choices.some(function(choice){return choice.indexOf(chunk)>=0;});
      if(quantity)best=chunk;
    }
    if(markerLength>1)i+=markerLength-1;
  }
  return best;
}
function solverPick(question){
  if(question.pattern==="phrase_base"){
    var base=lastQuantityBase(question.text,values(question.choices),false);
    if(!base)return null;
    var matches=values(question.choices).map(function(choice,index){return {choice:choice,index:index};})
      .filter(function(entry){return entry.choice.indexOf(base)>=0;});
    if(!matches.length)return null;
    matches.sort(function(left,right){return left.choice.length-right.choice.length;});
    return matches[0].index;
  }
  var questionBase=lastQuantityBase(question.text,values(question.choices),false);
  if(!questionBase)return null;
  var candidates=[];
  values(question.choices).forEach(function(choice,index){
    if(lastQuantityBase(choice,[],true)===questionBase)candidates.push({choice:choice,index:index});
  });
  if(!candidates.length)return null;
  candidates.sort(function(left,right){return left.choice.length-right.choice.length;});
  return candidates[0].index;
}
function solverScore(sets){
  var hits=0,total=0;
  sets.forEach(function(set){set.forEach(function(question){
    total++;
    if(question.pattern!=="phrase_base"&&question.pattern!=="phrase_equal"){hits++;return;}
    var picked=solverPick(question);
    if(picked===null)hits+=0.25;
    else if(picked===question.ans)hits++;
  });});
  return hits/total;
}

test("the word-order solver stays below 0.70 on Lv8-9 and below 0.85 on Lv10 over 200 sets",function(){
  var rate89=solverScore(corpus[8].slice(0,100).concat(corpus[9].slice(0,100)));
  assert.equal(rate89<0.7,true,String(rate89));
  var rate10=solverScore(corpus[10].slice(0,200));
  assert.equal(rate10<0.85,true,String(rate10));
});

test("W3 problems defeat the solver deterministically through the words_reversal choice",function(){
  var checked=0;
  corpus[8].slice(0,100).forEach(function(set){set.forEach(function(question){
    if(question.pattern!=="phrase_base"||question.wType!=="W3")return;
    var picked=solverPick(question);
    assert.notEqual(picked,null,question.text);
    assert.notEqual(picked,question.ans,question.text);
    assert.equal(question.distractorTypes[picked],"words_reversal",question.text);
    checked++;
  });});
  assert.equal(checked>=50,true,String(checked));
});

test("short-loop carry rows reappear in another direction from Lv3 on and stay reproducible",function(){
  var set5=engine.buildSet(5,seeded(77),{m:350,pattern:"fraction_to_decimal"});
  var hit5=set5.filter(function(question){return question.m===350;});
  assert.equal(hit5.length,1);
  assert.equal(hit5[0].pattern,"fraction_to_percent");
  assert.equal(hit5[0].shortLoop,true);
  var set3=engine.buildSet(3,seeded(78),{m:450,pattern:"percent_to_wari"});
  var hit3=set3.filter(function(question){return question.m===450;})[0];
  assert.equal(hit3.pattern,"wari_to_percent");
  assert.equal(hit3.shortLoop,true);
  var set8=engine.buildSet(8,seeded(79),{m:1250,pattern:"percent_to_fraction"});
  var hit8=set8.filter(function(question){return question.shortLoop;});
  assert.equal(hit8.length,1);
  assert.equal(hit8[0].m,1250);
  assert.notEqual(hit8[0].pattern,"percent_to_fraction");
  var set10=engine.buildSet(10,seeded(80),{m:220,pattern:"fraction_to_percent"});
  var hit10=set10.filter(function(question){return question.m===220;});
  assert.equal(hit10.length,1);
  assert.notEqual(hit10[0].pattern,"fraction_to_percent");
  [set3,set5,set8,set10].forEach(function(set,index){validateSet(set,[3,5,8,10][index],null);});
  var lowSet=engine.buildSet(1,seeded(81),{m:450,pattern:"decimal_to_percent"});
  assert.equal(lowSet.filter(function(question){return question.shortLoop;}).length,0);
  var incompatible=engine.buildSet(3,seeded(82),{m:1250,pattern:"decimal_to_percent"});
  assert.equal(incompatible.filter(function(question){return question.shortLoop;}).length,0);
  assert.equal(JSON.stringify(engine.buildSet(6,seeded(83),{m:375,pattern:"decimal_to_fraction"})),JSON.stringify(engine.buildSet(6,seeded(83),{m:375,pattern:"decimal_to_fraction"})));
});

test("judgement accepts exact answers only and the frac verdict names leftover reduction",function(){
  var set6=corpus[6][0],fracQuestion=set6.filter(function(question){return question.kind==="frac";})[0];
  assert.equal(engine.judge(fracQuestion,{n:fracQuestion.ans.n,d:fracQuestion.ans.d}),true);
  assert.equal(engine.judge(fracQuestion,{n:fracQuestion.ans.n*2,d:fracQuestion.ans.d*2}),false);
  var verdict=engine.judgeFraction(fracQuestion,{whole:0,num:fracQuestion.ans.n*2,den:fracQuestion.ans.d*2});
  assert.equal(verdict.correct,false);
  assert.equal(verdict.state,"not_reduced");
  assert.equal(engine.judgeFraction(fracQuestion,{whole:0,num:fracQuestion.ans.n,den:fracQuestion.ans.d}).correct,true);
  var numQuestion=corpus[1][0][0];
  assert.equal(engine.judge(numQuestion,String(numQuestion.ans)),true);
  assert.equal(engine.judge(numQuestion,numQuestion.ans+1),false);
  var choiceQuestion=corpus[3][0].filter(function(question){return question.kind==="choice";})[0];
  assert.equal(engine.judge(choiceQuestion,choiceQuestion.ans),true);
  assert.equal(engine.judge(choiceQuestion,(choiceQuestion.ans+1)%4),false);
});

test("generation is reproducible and never calls an ambient random source",function(){
  for(var lv=1;lv<=10;lv++)assert.equal(JSON.stringify(engine.buildSet(lv,seeded(9000+lv))),JSON.stringify(engine.buildSet(lv,seeded(9000+lv))),"Lv"+lv);
  assert.doesNotMatch(source,/Math\.random|Date\.now/);
});

test("invalid generator boundary inputs fail before returning partial sets",function(){
  [0,11,1.5,null,"3"].forEach(function(lv){assert.throws(function(){engine.buildSet(lv,seeded(1));});});
  assert.throws(function(){engine.buildSet(1,null);});
  [-0.1,1,NaN,Infinity,"0.5"].forEach(function(value){assert.throws(function(){engine.buildSet(1,function(){return value;});});});
  [{},{m:"450",pattern:"decimal_to_percent"},{m:450},5,"carry"].forEach(function(carry){
    assert.throws(function(){engine.buildSet(3,seeded(2),carry);},undefined,JSON.stringify(carry));
  });
  assert.equal(engine.buildSet(3,seeded(3),{m:9999,pattern:"unknown"}).length,5);
});

console.log("RESULT "+passed+" passed, 0 failed");
