"use strict";

var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var generatorPath=path.join(root,"komorebi/johou_seiri_generator.js");
var source=fs.readFileSync(generatorPath,"utf8");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);

var engine=context.Q4B_KOMOREBI_JOHOU_SEIRI;
var fixture=JSON.parse(fs.readFileSync(path.join(root,"tests/fixtures/johou_seiri_reference_sets.json"),"utf8"));
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var state=seed>>>0;
  return function(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}

/* Doc constants (curriculum v0.3.2), duplicated on purpose to pin the spec. */
var QUESTION_MIX={
  1:{Q1:3,Q4:2},2:{Q2:2,Q3:1,Q4:1,Q5:1},3:{Q5:2,Q6:1,Q2:1,Q4:1},4:{Q5:2,Q6:2,Q2:1},
  5:{Q5v:2,Q4:2,Q9:1},6:{Q7:2,Q4:2,Q9:1},7:{Q8:2,Q5:1,Q4:1,Q9:1},8:{Q5:2,Q4:2,Q9:1},
  9:{Q10:2,Q9:1,Q5:1,Q1:1},10:{Q8:1,Q5:1,Q10:1,Q9:1,Q4:1}};
var PASSAGE_COUNTS={1:3,2:3,3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:2};
var FORMAT_OF={Q1:"normal",Q2:"normal",Q3:"normal",Q4:"normal",Q5:"find_all",Q5v:"find_all",
  Q6:"find_all",Q7:"find_all",Q8:"ordering",Q9:"diagnosis",Q10:"diagnosis"};
var KIND_OF={Q1:"choice",Q2:"num",Q3:"num_unit",Q4:"choice",Q5:"find_all",Q5v:"find_all",
  Q6:"find_all",Q7:"find_all",Q8:"order",Q9:"choice",Q10:"choice"};
/* 4.2 の規模 [文数 min,max, 数量 min,max] (問い文を除く、表は 1 文)。 */
var SIZE_TABLE={1:[2,4,2,3],2:[4,5,3,4],3:[3,6,4,5],4:[3,6,4,5],5:[4,6,3,6],6:[4,6,3,6],
  7:[5,8,4,7],8:[5,8,4,7],9:[5,8,4,7],10:[5,8,4,7]};
/* 4.1 の軸強度。extra は [min,max]、他はセット内最大値の許容。 */
var LV_EXTRA={1:[0,0],2:[1,1],3:[1,1],4:[2,2],5:[1,2],6:[1,2],7:[2,2],8:[2,3],9:[2,3],10:[2,3]};
var LV_PARAPHRASE_MAX={1:0,2:0,3:0,4:0,5:0,6:1,7:0,8:1,9:1,10:1};
var LV_PARAPHRASE_REQUIRED={6:1,10:1};
var LV_EXCEPTION_MAX={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:1,9:1,10:1};
var LV_EXCEPTION_REQUIRED={8:1,10:1};
var LV_UNITKINDS_MAX={1:1,2:1,3:1,4:1,5:2,6:2,7:1,8:1,9:2,10:2};
var LV_UNITKINDS_REQUIRED={5:2,6:2};
var ORDER_LVS={7:true,10:true};
var NUM_LVS={2:true,3:true,4:true};
var DIAGNOSIS_LABELS={correct:"正しい",number_mixup:"ちがう数を使っている",role_swap:"その数があらわすものがちがう",
  unit_mixed:"単位がそろっていない",double_count:"同じ量を2回数えている",exception_ignored:"ただし書きを見落としている",
  order_wrong:"順番がちがう",not_written:"問題に書かれていないことを使っている",ask_mismatch:"聞かれていることがちがう"};
var UNIT_SYSTEMS={cm:"length",m:"length",mL:"volume",L:"volume","分":"time","時間":"time","時間分":"time",
  "時":"clock","時分":"clock","円":"money","本":"count_hon","人":"person","さつ":"count_satsu","こ":"count_ko",
  "箱":"count_hako","種類":"count_kind","きゃく":"count_seat","台":"count_dai","つ":"count_tsu","まき":"count_maki"};
var RULE1_TYPES={other_kind:true,time_stamp:true,label:true};
var UNIT_WORDS=["時間","時","分","cm","mL","m","L","円","人","さつ","こ","本","箱","種類","きゃく","台","つ","まき"];
/* 検証 14: 本文の漢字は小 4 配当まで。生成器の語彙から作った実測 95 字の許可表。 */
var ALLOWED_KANJI="世乗事人今仕以休会体何作使係借先入全公円出分別前動午台図園土外大妹子学室家宿小少屋工年店弟後手教数日時曜書月朝木本校牛生発白着短種算箱組給練習花行表言話読買赤走起足遊運遠部金長開間青題類食館";

function systemOf(unit){return UNIT_SYSTEMS[unit]||unit;}
function unitKindsOf(units,askUnit){
  if(!units.length)return 1;
  var bySystem={};
  units.forEach(function(unit){bySystem[systemOf(unit)]=bySystem[systemOf(unit)]||{};bySystem[systemOf(unit)][unit]=true;});
  if(askUnit&&bySystem[systemOf(askUnit)])bySystem[systemOf(askUnit)][askUnit]=true;
  var most=1;
  Object.keys(bySystem).forEach(function(system){most=Math.max(most,Object.keys(bySystem[system]).length);});
  return most;
}
function occurrencesOf(text,word){
  var positions=[],at=text.indexOf(word);
  while(at>=0){positions.push(at);at=text.indexOf(word,at+1);}
  return positions;
}
function sameArray(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every(function(v,i){return v===b[i];});}
function sortedCopy(values){return values.slice().sort(function(a,b){return a-b;});}
function digitTokens(text){return String(text).match(/\d+/g)||[];}
function contentTokens(sentence){
  var tokens=(sentence.match(/[一-鿿]+|[ァ-ヶー]+/g)||[]);
  return tokens.filter(function(token){return UNIT_WORDS.indexOf(token)<0;});
}

function normalizePassage(raw){
  var passage=JSON.parse(JSON.stringify(raw));
  passage.text=passage.sentences.join("")+passage.ask;
  passage.extraIndices=[];
  passage.quantities.forEach(function(entry,index){
    assert.equal(passage.text.indexOf(entry.text)>=0,true,"quantity in text: "+entry.text);
    assert.equal(!!entry.need,!entry.extraType,"need xor extra: "+entry.text);
    if(entry.extraType)passage.extraIndices.push(index);
  });
  passage.roleLabels=passage.quantities.map(function(entry){return entry.roleLabel;}).filter(Boolean);
  if(passage.askRoleLabel)passage.roleLabels.push(passage.askRoleLabel);
  if(!passage.paraphrasePairs)passage.paraphrasePairs=[];
  return passage;
}
function quantityById(passage,id){
  var hit=passage.quantities.filter(function(entry){return entry.id===id;})[0];
  assert.ok(hit,"quantity id "+id);
  return hit;
}
function sentenceIndexOf(passage,text){
  for(var i=0;i<passage.sentences.length;i++)if(passage.sentences[i].indexOf(text)>=0)return i;
  return -1;
}
function extrasEdgeRunOk(extraIndices,total){
  if(!extraIndices.length)return true;
  var sorted=sortedCopy(extraIndices);
  var contiguous=sorted.every(function(value,index){return index===0||value===sorted[index-1]+1;});
  if(!contiguous)return true;
  return sorted[0]!==0&&sorted[sorted.length-1]!==total-1;
}
function isBlocked(passage,word,target){
  var text=passage.text,ansAt=text.indexOf(target.text);
  var occurrences=occurrencesOf(text,word);
  if(!occurrences.length)return true;
  return occurrences.some(function(at){
    var lo=Math.min(at+word.length,ansAt),hi=Math.max(at,ansAt);
    return passage.quantities.some(function(entry){
      if(entry.id===target.id)return false;
      return occurrencesOf(text,entry.text).some(function(qAt){return qAt>=lo&&qAt+entry.text.length<=hi;});
    });
  });
}

/* 検証 6, 23, 24 と 8.3 の規則 5, 6。 */
function checkPassage(passage,lv){
  var size=SIZE_TABLE[lv];
  assert.equal(passage.sentences.length>=size[0]&&passage.sentences.length<=size[1],true,"文数 "+passage.id+" "+passage.sentences.length);
  assert.equal(passage.quantities.length>=size[2]&&passage.quantities.length<=size[3],true,"数量数 "+passage.id);
  assert.doesNotMatch(passage.text,/[+\-×÷=＋－＝]/,passage.id);
  (passage.text.match(/[一-鿿]/g)||[]).forEach(function(ch){
    assert.equal(ALLOWED_KANJI.indexOf(ch)>=0,true,"漢字が 4 年配当外: "+ch+" ("+passage.id+")");
  });
  assert.equal(passage.names.length<=2,true,passage.id);
  passage.names.forEach(function(name,index){
    assert.equal(passage.text.indexOf(name)>=0,true,"name in text: "+name);
    passage.names.forEach(function(other,otherIndex){
      if(index<otherIndex)assert.notEqual(name.charAt(0),other.charAt(0),"似た音の名前: "+name+"/"+other);
    });
  });
  var extra=passage.extraIndices.length,range=LV_EXTRA[lv];
  assert.equal(extra>=range[0]&&extra<=range[1],true,"余分の個数 "+passage.id+" "+extra);
  assert.equal(extrasEdgeRunOk(passage.extraIndices,passage.quantities.length),true,"余分の位置 "+passage.id);
  var extraSentences={};
  passage.extraIndices.forEach(function(index){
    var entry=passage.quantities[index],sentence=sentenceIndexOf(passage,entry.text);
    assert.equal(sentence>=0,true,passage.id);
    assert.equal(!extraSentences[sentence],true,"1 文に余分 2 つ: "+passage.id);
    extraSentences[sentence]=true;
    if(entry.extraType==="limit"){
      assert.match(passage.sentences[sentence],/まで|以上|以下/,"限度語なし: "+passage.id);
    }else if(entry.extraType==="out_of_scope"){
      assert.equal(typeof passage.askLimiter==="string"&&passage.askLimiter.length>0,true,"名指しなし: "+passage.id);
      assert.equal(passage.text.indexOf(passage.askLimiter)>=0,true,"名指しが本文にない: "+passage.id);
    }else{
      assert.equal(!!RULE1_TYPES[entry.extraType],true,"余分の型: "+entry.extraType);
    }
  });
  if(lv>=4&&extra>=2){
    var rule3=passage.extraIndices.filter(function(index){return passage.quantities[index].extraType==="out_of_scope";});
    assert.equal(rule3.length>=1,true,"規則 3 型の余分なし: "+passage.id);
  }
  var paraphrase=passage.paraphrasePairs.length;
  assert.equal(paraphrase<=LV_PARAPHRASE_MAX[lv],true,"言い換えの組数 "+passage.id);
  assert.equal((passage.exception?1:0)<=LV_EXCEPTION_MAX[lv],true,"例外節 "+passage.id);
  if(paraphrase){
    var pair=passage.paraphrasePairs[0],first=quantityById(passage,pair[0]),second=quantityById(passage,pair[1]);
    assert.equal(systemOf(first.unit),"time","時間系でない言い換え: "+passage.id);
    assert.equal(systemOf(second.unit),"time","時間系でない言い換え: "+passage.id);
    assert.notEqual(first.unit,second.unit,passage.id);
    assert.equal(first.value,second.value,passage.id);
    var firstTokens=digitTokens(first.text),secondTokens=digitTokens(second.text);
    firstTokens.forEach(function(a){secondTokens.forEach(function(b){
      assert.notEqual(a,b,"数字トークン一致: "+passage.id);
      assert.equal(a.indexOf(b)<0&&b.indexOf(a)<0,true,"数字トークンの部分文字列: "+passage.id);
    });});
  }
  return passage;
}

function checkQuestionCore(question,passage,lv,golden){
  assert.equal(question.format,FORMAT_OF[question.qTag],question.qTag);
  assert.equal(question.kind,KIND_OF[question.qTag],question.qTag);
  assert.notEqual(question.format,"formulation");
  assert.doesNotMatch(question.prompt,/[+\-×÷=＋－＝]/,question.prompt);
  if(!golden){
    assert.equal(question.cat,"kom_johou_seiri");
    assert.equal(question.lv,lv);
    assert.equal(typeof question.text==="string"&&question.text.indexOf(question.prompt)>=0,true,question.qTag);
    assert.equal(typeof question.waza.primary==="string"&&question.waza.primary.length>0,true,question.qTag);
    assert.equal(typeof question.waza.alternate==="string"&&question.waza.alternate.length>0,true,question.qTag);
  }
  /* 検証 10: axes の再計算一致。 */
  var relevantUnits=[],askUnit=null;
  if(question.qTag==="Q5"||question.qTag==="Q6"||question.qTag==="Q5v"){
    relevantUnits=passage.quantities.filter(function(entry){return entry.need;}).map(function(entry){return entry.unit;});
    askUnit=passage.askUnit;
  }else if(question.qTag==="Q2"||question.qTag==="Q3"||question.qTag==="Q4"){
    relevantUnits=[quantityById(passage,question.targetQuantityId).unit];
  }else if(question.qTag==="Q7"){
    relevantUnits=passage.paraphrasePairs[0].map(function(id){return quantityById(passage,id).unit;});
  }else if(question.qTag==="Q9"){
    relevantUnits=question.memoUnits.slice();
    askUnit=passage.askUnit;
  }
  var expectedAxes={extra:passage.extraIndices.length,
    shuffle:question.qTag==="Q8",
    paraphrase:passage.paraphrasePairs.length,
    unitKinds:unitKindsOf(relevantUnits,askUnit),
    exception:passage.exception?1:0};
  assert.deepEqual({extra:question.axes.extra,shuffle:!!question.axes.shuffle,paraphrase:question.axes.paraphrase,
    unitKinds:question.axes.unitKinds,exception:question.axes.exception},expectedAxes,"axes "+question.qTag+" Lv"+lv);
  assert.equal(question.axes.unitKinds<=LV_UNITKINDS_MAX[lv],true,"unitKinds Lv"+lv);
  if(question.qTag==="Q8")assert.equal(!!ORDER_LVS[lv],true,"Q8 の Lv");
  if(question.kind==="choice"){
    assert.equal(question.choices.length,4,question.qTag);
    assert.equal(new Set(question.choices).size,4,question.qTag);
    assert.equal(Number.isInteger(question.ans)&&question.ans>=0&&question.ans<4,true,question.qTag);
  }
}

function checkQuestion(question,passage,lv,golden){
  checkQuestionCore(question,passage,lv,golden);
  var qTag=question.qTag;
  if(qTag==="Q1"){
    /* 検証 21 */
    assert.equal(passage.ask.indexOf(question.centerPhrase)>=0,true,"中心語句が問い文にない");
    assert.equal(question.choices[question.ans].indexOf(question.centerPhrase)<0,true,"正答が中心語句を含む");
    var withCenter=question.choices.filter(function(choice,index){return index!==question.ans&&choice.indexOf(question.centerPhrase)>=0;});
    assert.equal(withCenter.length>=1,true,"中心語句を含む誤答がない");
  }else if(qTag==="Q2"||qTag==="Q3"){
    /* 検証 2, 3, 22 */
    var target=quantityById(passage,question.targetQuantityId);
    assert.equal(question.ans,target.value,"正答が literal でない");
    assert.equal(passage.text.indexOf(target.text)>=0,true,"正答が本文にない");
    assert.equal(question.targetOwnerIds.length>=2,true,"対象の数量が 2 つ未満");
    question.targetOwnerIds.forEach(function(id){quantityById(passage,id);});
    assert.equal(passage.text.indexOf(question.targetPhrase)<0,true,"対象語句が本文にそのままある");
    question.sharedWords.forEach(function(word){
      assert.equal(isBlocked(passage,word,target),true,"遮断されていない共有語句: "+word);
    });
    var sameUnit=passage.quantities.filter(function(entry){return entry.mentionedUnits.indexOf(target.unit)>=0;});
    assert.equal(sameUnit.length>=2,true,"同単位の数量が 2 つ未満");
    var values={};
    passage.quantities.forEach(function(entry){
      assert.equal(!values[entry.value],true,"数量の値が重複: "+passage.id);
      values[entry.value]=true;
    });
    if(qTag==="Q3"){
      assert.equal(question.ansUnit,target.unit);
      assert.equal(question.unitChoices.indexOf(question.ansUnit)>=0,true,"単位チップに正答がない");
      assert.equal(question.unitChoices.length>=2,true,"単位チップが 1 つ");
    }
  }else if(qTag==="Q4"){
    /* 検証 26 */
    var q4Target=quantityById(passage,question.targetQuantityId);
    assert.equal(question.choices[question.ans],q4Target.roleLabel,"Q4 正答が役割ラベルでない");
    assert.equal(question.prompt.indexOf(q4Target.text)>=0,true,"Q4 設問が対象を示さない");
    var sameSystem=0,realWrongSameSystem=0,notWritten=0;
    question.choices.forEach(function(choice,index){
      var meta=question.choiceMeta[index];
      if(systemOf(meta.unit||"")===systemOf(q4Target.unit))sameSystem++;
      if(index===question.ans)return;
      if(meta.origin==="not_written")notWritten++;
      else{
        assert.equal(passage.roleLabels.indexOf(choice)>=0,true,"本文にない役割: "+choice);
        if(systemOf(meta.unit||"")===systemOf(q4Target.unit))realWrongSameSystem++;
      }
    });
    assert.equal(sameSystem>=2,true,"同単位の役割が 2 つ未満");
    assert.equal(realWrongSameSystem>=1,true,"実在する同単位の誤答がない");
    assert.equal(notWritten<=1,true,"not_written が 2 つ以上");
  }else if(qTag==="Q5"||qTag==="Q6"||qTag==="Q5v"){
    /* 検証 4, 5, 29 */
    assert.equal(sameArray(question.choices,passage.quantities.map(function(entry){return entry.text;})),true,"選択肢が数量列でない");
    assert.equal(question.choices.length>=3&&question.choices.length<=7,true,"選択肢の数");
    var expected;
    if(qTag==="Q5")expected=passage.quantities.map(function(entry,index){return entry.need?index:-1;}).filter(function(v){return v>=0;});
    else if(qTag==="Q6")expected=passage.extraIndices.slice();
    else{
      var askSystem=systemOf(passage.askUnit);
      expected=passage.quantities.map(function(entry,index){
        return entry.need&&entry.unit!==passage.askUnit&&systemOf(entry.unit)===askSystem?index:-1;
      }).filter(function(v){return v>=0;});
      var counts={};
      passage.quantities.forEach(function(entry){if(systemOf(entry.unit)===askSystem)counts[entry.unit]=(counts[entry.unit]||0)+1;});
      var majority=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0];
      var aligned=expected.every(function(index){return passage.quantities[index].unit===majority;});
      assert.equal(question.majorityAligned,aligned,"majorityAligned の再計算不一致");
    }
    assert.equal(sameArray(sortedCopy(question.ans),sortedCopy(expected)),true,qTag+" の正解集合");
    assert.equal(question.ans.length>=1,true,qTag);
    assert.equal(extrasEdgeRunOk(passage.extraIndices,passage.quantities.length),true,"検証 29");
  }else if(qTag==="Q7"){
    /* 検証 25 */
    var pair=passage.paraphrasePairs[0];
    assert.ok(pair,"言い換えの組がない");
    assert.equal(sameArray(question.choices,passage.paraphraseChoiceSentences.map(function(index){return passage.sentences[index];})),true,"Q7 選択肢");
    assert.equal(question.ans.length,2,"Q7 は 2 文");
    var ansSentences=question.ans.map(function(index){return question.choices[index];});
    var pairSentences=passage.paraphraseSentencePair.map(function(index){return passage.sentences[index];});
    assert.equal(sameArray(ansSentences.slice().sort(),pairSentences.slice().sort()),true,"Q7 正答が言い換えの組でない");
    var shared=contentTokens(pairSentences[0]).filter(function(token){
      return contentTokens(pairSentences[1]).indexOf(token)>=0;});
    assert.equal(new Set(shared).size<=2,true,"共有内容語が 3 語以上: "+shared.join(","));
    var otherSentences=question.choices.filter(function(text){return pairSentences.indexOf(text)<0;});
    otherSentences.forEach(function(text){
      var tokens=digitTokens(text);
      question.choices.forEach(function(other){
        if(other===text)return;
        digitTokens(other).forEach(function(token){assert.equal(tokens.indexOf(token)<0,true,"数字トークンを共有する 2 文");});
      });
    });
  }else if(qTag==="Q8"){
    /* 検証 7, 30 */
    assert.equal(question.parts.length>=4&&question.parts.length<=5,true,"部品数");
    var keys={},canonical=passage.events.slice().sort(function(a,b){return a.orderKey-b.orderKey;});
    passage.events.forEach(function(event){
      assert.equal(!keys[event.orderKey],true,"同時刻の出来事");
      keys[event.orderKey]=true;
    });
    assert.equal(question.parts.length,passage.events.length,"部品と出来事の数");
    assert.equal(sameArray(sortedCopy(question.ans),question.parts.map(function(entry,index){return index;})),true,"ans が順列でない");
    question.ans.forEach(function(storedIndex,position){
      assert.equal(question.parts[storedIndex].text,canonical[position].text,"正答列が時系列と違う");
    });
    assert.equal(sameArray(sortedCopy(question.displayOrder),question.parts.map(function(entry,index){return index;})),true,"提示順が順列でない");
    assert.equal(sameArray(question.displayOrder,question.ans),false,"提示順が正答順と一致 (検証 30)");
    assert.equal(passage.eventOrderShuffled,true,"本文の提示順が時系列のまま");
  }else if(qTag==="Q9"){
    /* 検証 8 */
    assert.equal(typeof DIAGNOSIS_LABELS[question.errorType],"string","errorType が語彙にない");
    var errorHits=0;
    question.choices.forEach(function(choice,index){
      var meta=question.choiceMeta[index];
      assert.equal(choice,DIAGNOSIS_LABELS[meta.errorType],"canonical 文言でない: "+choice);
      if(meta.errorType===question.errorType){errorHits++;assert.equal(index,question.ans,"errorType と正解位置");}
    });
    assert.equal(errorHits,1,"errorType が 1 つに定まらない");
    assert.equal(question.prompt.indexOf(question.memo)>=0,true,"メモが設問にない");
  }else if(qTag==="Q10"){
    var solvableIndices=[];
    question.choices.forEach(function(choice,index){
      if(choice==="出せる")solvableIndices.push(index);
      else assert.match(choice,/が書かれていない$/,"Q10 の文言");
    });
    assert.equal(solvableIndices.length,1,"出せるの肢は 1 つ");
    if(question.errorType==="solvable")assert.equal(question.ans,solvableIndices[0],"出せるが正答でない");
    else{
      assert.notEqual(question.ans,solvableIndices[0]);
      assert.match(question.choices[question.ans],/が書かれていない$/);
    }
  }else assert.fail("未知の問い方: "+qTag);
}

function validateSet(setLike,lv,state,golden){
  var questions=setLike.questions;
  assert.equal(questions.length,5,"Lv"+lv);
  var passages={};
  if(setLike.passages)setLike.passages.forEach(function(raw){passages[raw.id]=checkPassage(normalizePassage(raw),lv);});
  else questions.forEach(function(question){
    if(!passages[question.passageId])passages[question.passageId]=checkPassage(normalizePassage(question.passage),lv);
  });
  var mix={},byPassage={},kinds={},passageIds=Object.keys(passages);
  assert.equal(passageIds.length,PASSAGE_COUNTS[lv],"本文の本数 Lv"+lv);
  questions.forEach(function(question,index){
    if(!golden)assert.equal(question.id,"johou_seiri_"+lv+"_q"+(index+1));
    var passage=passages[question.passageId];
    assert.ok(passage,"passage "+question.passageId);
    mix[question.qTag]=(mix[question.qTag]||0)+1;
    kinds[question.qTag]=true;
    byPassage[question.passageId]=byPassage[question.passageId]||{};
    assert.equal(!byPassage[question.passageId][question.qTag],true,"検証 18: 同一本文に同じ問い方");
    byPassage[question.passageId][question.qTag]=true;
    checkQuestion(question,passage,lv,golden);
    if(state&&question.kind==="choice"){state.positions[lv][question.ans]++;state.choiceTotals[lv]++;}
    if(state&&question.qTag==="Q10")state.q10[lv].push(question.errorType==="solvable");
    if(state&&question.qTag==="Q5v"&&question.majorityAligned)state.majorityAligned=true;
  });
  assert.deepEqual(mix,QUESTION_MIX[lv],"検証 17: 配合 Lv"+lv);
  if(lv>=3)Object.keys(mix).forEach(function(qTag){assert.equal(mix[qTag]<3,true,"検証 19");});
  if(lv>=5)assert.equal(Object.keys(kinds).length>=3,true,"検証 20");
  Object.keys(byPassage).forEach(function(passageId){
    assert.equal(!(byPassage[passageId].Q2&&byPassage[passageId].Q3),true,"分散規則 4");
  });
  /* セット水準の軸要求。 */
  var maxParaphrase=0,maxException=0,maxUnitKinds=1,q5vAligned=false;
  questions.forEach(function(question){
    maxParaphrase=Math.max(maxParaphrase,question.axes.paraphrase);
    maxException=Math.max(maxException,question.axes.exception);
    maxUnitKinds=Math.max(maxUnitKinds,question.axes.unitKinds);
    if(question.qTag==="Q5v"&&question.majorityAligned)q5vAligned=true;
  });
  if(LV_PARAPHRASE_REQUIRED[lv])assert.equal(maxParaphrase,LV_PARAPHRASE_REQUIRED[lv],"言い換えの軸 Lv"+lv);
  if(LV_EXCEPTION_REQUIRED[lv])assert.equal(maxException,LV_EXCEPTION_REQUIRED[lv],"例外の軸 Lv"+lv);
  if(LV_UNITKINDS_REQUIRED[lv])assert.equal(maxUnitKinds,LV_UNITKINDS_REQUIRED[lv],"単位の軸 Lv"+lv);
  if(lv===5)assert.equal(q5vAligned,true,"検証 27");
  if(lv===3){
    var profiles=passageIds.map(function(passageId){
      var passage=passages[passageId];
      return passage.extraIndices.every(function(index){return !!RULE1_TYPES[passage.quantities[index].extraType];});
    });
    assert.equal(profiles.filter(Boolean).length,1,"検証 23: 規則 1 型の本文が 1 本でない");
  }
  if(NUM_LVS[lv])questions.forEach(function(question){
    if(question.kind!=="num")return;
    var passage=passages[question.passageId],values={};
    passage.quantities.forEach(function(entry){
      assert.equal(!values[entry.value],true,"検証 3: 値の重複");
      values[entry.value]=true;
    });
  });
  /* 11 章の連鎖: 抽出 (Lv2-4) と診断 (Lv5-10) を 1 組以上、同一本文で隣接。 */
  if(lv>=2&&lv<=4){
    var extraction=questions.some(function(question,index){
      var next=questions[index+1];
      return next&&question.qTag==="Q5"&&next.qTag==="Q2"&&question.passageId===next.passageId;
    });
    assert.equal(extraction,true,"抽出の連鎖がない Lv"+lv);
  }
  if(lv>=5){
    var diagnosisChain=questions.some(function(question,index){
      var next=questions[index+1];
      return next&&(question.qTag==="Q9"||question.qTag==="Q10")
        &&(next.qTag==="Q1"||next.qTag==="Q4")&&question.passageId===next.passageId;
    });
    assert.equal(diagnosisChain,true,"診断の連鎖がない Lv"+lv);
  }
  /* 検証 11: 新軸を導入する Lv では、その軸が載る問いの他の軸を前 Lv 以下に。 */
  questions.forEach(function(question){
    if(lv===6&&question.axes.paraphrase>0){
      assert.equal(question.axes.extra<=2&&question.axes.exception===0&&!question.axes.shuffle,true,"検証 11 Lv6");
    }
    if(lv===7&&question.axes.shuffle){
      assert.equal(question.axes.paraphrase===0&&question.axes.extra<=2&&question.axes.exception===0,true,"検証 11 Lv7");
    }
    if(lv===8&&question.axes.exception>0){
      assert.equal(question.axes.paraphrase===0&&question.axes.extra<=2&&!question.axes.shuffle,true,"検証 11 Lv8");
    }
  });
  return passages;
}

/* ---- 敵ソルバー (T1): 語の重なり最大・名前近接・単位孤立・数値一致 ---- */
function bigramOverlap(a,b){
  var grams={},count=0;
  for(var i=0;i+1<b.length;i++)grams[b.slice(i,i+2)]=true;
  for(var j=0;j+1<a.length;j++)if(grams[a.slice(j,j+2)]){count++;delete grams[a.slice(j,j+2)];}
  return count;
}
function solverChoice(question,reference){
  var best=0,bestScore=-1;
  question.choices.forEach(function(choice,index){
    var score=bigramOverlap(choice,reference);
    if(score>bestScore){bestScore=score;best=index;}
  });
  return best;
}
function solverExtraction(question,passage){
  var word=question.sharedWords[0]||question.targetPhrase.slice(0,3);
  var at=passage.text.indexOf(word);
  if(at<0)return null;
  var best=null,bestDistance=Infinity;
  passage.quantities.forEach(function(entry){
    occurrencesOf(passage.text,entry.text).forEach(function(qAt){
      var distance=qAt>=at?qAt-at:(at-qAt)*3;
      if(distance<bestDistance){bestDistance=distance;best=entry;}
    });
  });
  return best?best.value:null;
}
function solverFindAll(question,passage){
  var unitCounts={};
  passage.quantities.forEach(function(entry){entry.mentionedUnits.forEach(function(unit){unitCounts[unit]=(unitCounts[unit]||0)+1;});});
  var guess=[];
  passage.quantities.forEach(function(entry,index){
    var isolated=entry.mentionedUnits.every(function(unit){return unitCounts[unit]===1;});
    var sentence=passage.sentences[sentenceIndexOf(passage,entry.text)]||"";
    var limited=/まで|以上|以下/.test(sentence);
    if(question.qTag==="Q6"){if(isolated||limited)guess.push(index);}
    else if(!isolated&&!limited)guess.push(index);
  });
  return guess;
}
function solverAlign(question,passage){
  var askSystem=systemOf(passage.askUnit),counts={};
  counts[passage.askUnit]=1;
  passage.quantities.forEach(function(entry){if(systemOf(entry.unit)===askSystem)counts[entry.unit]=(counts[entry.unit]||0)+1;});
  var units=Object.keys(counts),max=Math.max.apply(null,units.map(function(unit){return counts[unit];}));
  var minority=units.filter(function(unit){return counts[unit]<max;});
  var guess=[];
  passage.quantities.forEach(function(entry,index){
    if(minority.length){if(minority.indexOf(entry.unit)>=0)guess.push(index);}
    else if(entry.unit!==passage.askUnit)guess.push(index);
  });
  return guess;
}
function solverPair(question){
  for(var i=0;i<question.choices.length;i++)for(var j=i+1;j<question.choices.length;j++){
    var shared=digitTokens(question.choices[i]).filter(function(token){return digitTokens(question.choices[j]).indexOf(token)>=0;});
    if(shared.length)return [i,j];
  }
  var withMinutes=[];
  question.choices.forEach(function(choice,index){if(/\d+分/.test(choice))withMinutes.push(index);});
  return withMinutes.slice(0,2);
}
function solverSolve(question,passage){
  if(question.qTag==="Q1")return solverChoice(question,passage.ask)===question.ans;
  if(question.qTag==="Q4")return solverChoice(question,question.prompt)===question.ans;
  if(question.qTag==="Q9")return solverChoice(question,question.memo+passage.ask)===question.ans;
  if(question.qTag==="Q10")return solverChoice(question,passage.text)===question.ans;
  if(question.qTag==="Q2"||question.qTag==="Q3")return solverExtraction(question,passage)===question.ans;
  if(question.qTag==="Q5"||question.qTag==="Q6")return sameArray(sortedCopy(solverFindAll(question,passage)),sortedCopy(question.ans));
  if(question.qTag==="Q5v")return sameArray(sortedCopy(solverAlign(question,passage)),sortedCopy(question.ans));
  if(question.qTag==="Q7")return sameArray(sortedCopy(solverPair(question)),sortedCopy(question.ans));
  if(question.qTag==="Q8")return sameArray(question.displayOrder,question.ans);
  throw new Error("solver: "+question.qTag);
}

/* ---- corpus: Lv 別 200 セット (= 1000 問) ---- */
var SETS_PER_LV=200;
var state={positions:{},choiceTotals:{},q10:{},majorityAligned:false};
var corpus={},corpusRandom=seeded(20260815);
for(var lvInit=1;lvInit<=10;lvInit++){state.positions[lvInit]=[0,0,0,0];state.choiceTotals[lvInit]=0;state.q10[lvInit]=[];}
for(var corpusLv=1;corpusLv<=10;corpusLv++){
  corpus[corpusLv]=[];
  for(var corpusIndex=0;corpusIndex<SETS_PER_LV;corpusIndex++){
    var generated=engine.buildSet(corpusLv,corpusRandom);
    validateSet({questions:generated},corpusLv,state,false);
    corpus[corpusLv].push(generated);
  }
}

test("all generated sets pass 検証 1-30 (structure, mix, dispersion, axes, blocking)",function(){
  for(var lv=1;lv<=10;lv++)assert.equal(corpus[lv].length,SETS_PER_LV);
  assert.equal(state.majorityAligned,true,"検証 27");
});

test("検証 28: choice と diagnosis の正解位置が Lv 別母集団で一様 (15%-35%)",function(){
  for(var lv=1;lv<=10;lv++){
    var total=state.choiceTotals[lv];
    if(!total)continue;
    assert.equal(total>=SETS_PER_LV,true,"Lv"+lv+" total "+total);
    state.positions[lv].forEach(function(count){
      var share=count/total;
      assert.equal(share>=0.15&&share<=0.35,true,"Lv"+lv+" positions "+state.positions[lv].join(","));
    });
  }
});

test("検証 9: 「出せる」正答の割合が閉区間 [0.3, 0.5] に収まる (Lv9, Lv10)",function(){
  [9,10].forEach(function(lv){
    var flags=state.q10[lv],share=flags.filter(Boolean).length/flags.length;
    assert.equal(flags.length,SETS_PER_LV*QUESTION_MIX[lv].Q10,"Lv"+lv);
    assert.equal(share>=0.3&&share<=0.5,true,"Lv"+lv+" 出せる率 "+share.toFixed(3));
    console.log("  Lv"+lv+" 出せる率 "+share.toFixed(3));
  });
});

test("敵ソルバーの実効通過率が全 Lv で 0.70 未満 (200 セット)",function(){
  for(var lv=1;lv<=10;lv++){
    var hits=0,total=0;
    corpus[lv].forEach(function(set){
      var passages={};
      set.forEach(function(question){
        if(!passages[question.passageId])passages[question.passageId]=normalizePassage(question.passage);
        total++;
        if(solverSolve(question,passages[question.passageId]))hits++;
      });
    });
    var rate=hits/total;
    console.log("  Lv"+lv+" T1="+rate.toFixed(3));
    assert.equal(rate<0.70,true,"Lv"+lv+" T1 "+rate.toFixed(3));
  }
});

test("検証 31: 付録 A.3 の実在証明 10 セットが同じ検証関数を通る",function(){
  for(var lv=1;lv<=10;lv++){
    var golden=fixture[String(lv)];
    assert.ok(golden,"fixture Lv"+lv);
    assert.equal(golden.questions.length,5,"Lv"+lv);
    validateSet(golden,lv,null,true);
  }
});

test("生成は注入 random で再現可能で、環境の乱数と時計を使わない",function(){
  for(var lv=1;lv<=10;lv++){
    assert.equal(JSON.stringify(engine.buildSet(lv,seeded(4000+lv))),
      JSON.stringify(engine.buildSet(lv,seeded(4000+lv))),"Lv"+lv);
  }
  assert.doesNotMatch(source,/Math\.random|Date\.now/);
});

test("判定関数は形式ごとに厳密で、num_unit は単位違いを名指しする",function(){
  var choiceQuestion=corpus[1][0][0];
  assert.equal(engine.judge(choiceQuestion,choiceQuestion.ans),true);
  assert.equal(engine.judge(choiceQuestion,(choiceQuestion.ans+1)%4),false);
  var findAll=corpus[3][0].filter(function(question){return question.kind==="find_all";})[0];
  assert.equal(engine.judge(findAll,findAll.ans.slice().reverse()),true);
  assert.equal(engine.judge(findAll,findAll.ans.slice(1)),false);
  assert.equal(engine.judge(findAll,findAll.ans.concat(findAll.ans[0])),false);
  var order=corpus[7][0].filter(function(question){return question.kind==="order";})[0];
  assert.equal(engine.judge(order,order.ans.slice()),true);
  assert.equal(engine.judge(order,order.displayOrder),false);
  var num=corpus[2][0].filter(function(question){return question.kind==="num";})[0];
  assert.equal(engine.judge(num,String(num.ans)),true);
  assert.equal(engine.judge(num,num.ans+1),false);
  var numUnit=corpus[2][0].filter(function(question){return question.kind==="num_unit";})[0];
  assert.equal(engine.judgeNumUnit(numUnit,numUnit.ans,numUnit.ansUnit).correct,true);
  var wrongUnit=numUnit.unitChoices.filter(function(unit){return unit!==numUnit.ansUnit;})[0];
  var verdict=engine.judgeNumUnit(numUnit,numUnit.ans,wrongUnit);
  assert.equal(verdict.correct,false);
  assert.equal(verdict.state,"unit_wrong");
  assert.equal(engine.judgeNumUnit(numUnit,numUnit.ans+1,numUnit.ansUnit).state,"wrong");
  assert.equal(engine.unitLabel("cm"),"cm");
});

test("生成器境界の入力検証: 不正な lv と乱数は例外で落ちる",function(){
  [0,11,1.5,null,"3",NaN].forEach(function(lv){assert.throws(function(){engine.buildSet(lv,seeded(1));});});
  assert.throws(function(){engine.buildSet(1,null);});
  assert.throws(function(){engine.buildSet(1,{});});
  [-0.1,1,NaN,Infinity,"0.5"].forEach(function(value){
    assert.throws(function(){engine.buildSet(1,function(){return value;});});
  });
  assert.throws(function(){engine.judge(null,0);});
  assert.throws(function(){engine.judge({kind:"voice"},0);});
  assert.throws(function(){engine.judgeNumUnit({kind:"num"},1,"cm");});
});

console.log("RESULT "+passed+" passed, 0 failed");
