(function(global){
  "use strict";

  /* kom_johou_seiri generator.
     Spec: docs/komorebi_johou_seiri_curriculum.md (v0.3.2).
     No computation is asked of the child: answers are literal in the passage.
     All randomness flows through the injected random; ambient random sources
     and clocks are never touched. */

  var CONFIG={setSize:5};

  /* 6.1 問い方配合 (per Lv) and passage counts. */
  var QUESTION_MIX={
    1:{Q1:3,Q4:2},
    2:{Q2:2,Q3:1,Q4:1,Q5:1},
    3:{Q5:2,Q6:1,Q2:1,Q4:1},
    4:{Q5:2,Q6:2,Q2:1},
    5:{Q5v:2,Q4:2,Q9:1},
    6:{Q7:2,Q4:2,Q9:1},
    7:{Q8:2,Q5:1,Q4:1,Q9:1},
    8:{Q5:2,Q4:2,Q9:1},
    9:{Q10:2,Q9:1,Q5:1,Q1:1},
    10:{Q8:1,Q5:1,Q10:1,Q9:1,Q4:1}
  };
  var PASSAGE_COUNTS={1:3,2:3,3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:2};
  var FORMAT_OF={Q1:"normal",Q2:"normal",Q3:"normal",Q4:"normal",
    Q5:"find_all",Q5v:"find_all",Q6:"find_all",Q7:"find_all",
    Q8:"ordering",Q9:"diagnosis",Q10:"diagnosis"};
  var KIND_OF={Q1:"choice",Q2:"num",Q3:"num_unit",Q4:"choice",
    Q5:"find_all",Q5v:"find_all",Q6:"find_all",Q7:"find_all",
    Q8:"order",Q9:"choice",Q10:"choice"};

  /* 9.5 診断の canonical 文言。 */
  var DIAGNOSIS_LABELS={
    correct:"正しい",
    number_mixup:"ちがう数を使っている",
    role_swap:"その数があらわすものがちがう",
    unit_mixed:"単位がそろっていない",
    double_count:"同じ量を2回数えている",
    exception_ignored:"ただし書きを見落としている",
    order_wrong:"順番がちがう",
    not_written:"問題に書かれていないことを使っている",
    ask_mismatch:"聞かれていることがちがう"
  };
  var SOLVABLE_LABEL="出せる";

  /* 10 章のわざ。qTag / errorType から軸を引く。 */
  var WAZA={
    common:{primary:"聞かれている量にまず印をつける",alternate:"答えの単位を先に決める"},
    info:{primary:"数には名前をつけて読む (800円 = たろうのお金)",alternate:"聞かれている量と種類がちがう数は、いったんよけておく"},
    unit:{primary:"単位が2つ出てきたら、答えの単位にそろえる",alternate:"そろえる前の数と後の数を、両方書いておく"},
    paraphrase:{primary:"同じ量が2回出ていないか確かめる",alternate:"言いかえの文には同じ印をつける"},
    order:{primary:"時こくと順番のことばに印をつけて、時間の線に並べる",alternate:"いちばん早い出来事から決める"},
    exception:{primary:"「ただし」の文は2回読む",alternate:"数えるものに○、除くものに×をつける"}
  };
  var WAZA_BY_ERROR={unit_mixed:"unit",double_count:"paraphrase",order_wrong:"order",
    exception_ignored:"exception",number_mixup:"info",role_swap:"common",ask_mismatch:"common",not_written:"info"};

  /* 単位の系統 (4 章の単位軸は同一系統内の混在で数える)。 */
  var UNIT_SYSTEMS={cm:"length",m:"length",mL:"volume",L:"volume",
    "分":"time","時間":"time","時間分":"time","時":"clock","時分":"clock",
    "円":"money","本":"count_hon","人":"person","さつ":"count_satsu","こ":"count_ko",
    "箱":"count_hako","種類":"count_kind","きゃく":"count_seat","台":"count_dai","つ":"count_tsu","日":"day","週間":"time_week"};

  var MAX_SAFE_INTEGER=9007199254740991;

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function isInteger(value){return typeof value==="number"&&isFinite(value)&&Math.floor(value)===value&&Math.abs(value)<=MAX_SAFE_INTEGER;}
  function validateLv(lv){if(!isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");}
  function randomValue(random){
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var value=random();
    if(typeof value!=="number"||!isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }
  function pick(values,random){
    if(!Array.isArray(values)||!values.length)throw new Error("生成候補がありません");
    return values[Math.floor(randomValue(random)*values.length)];
  }
  function shuffle(values,random){
    var result=values.slice();
    for(var i=result.length-1;i>0;i--){
      var j=Math.floor(randomValue(random)*(i+1)),temporary=result[i];
      result[i]=result[j];result[j]=temporary;
    }
    return result;
  }
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function sameArray(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
    return a.every(function(value,index){return value===b[index];});
  }

  /* 数量スロット。mentionedUnits は「1本150円」のような複合表現の全単位。 */
  function quantity(id,text,value,unit,role,roleLabel,need,extraType,mentionedUnits){
    if(typeof text!=="string"||!text||typeof unit!=="string")throw new Error("数量の指定が正しくありません");
    if(!!need===!!extraType)if(need||extraType)throw new Error("need と余分の型が両立しています");
    return {id:id,text:text,value:value,unit:unit,mentionedUnits:mentionedUnits||[unit],
      role:role,roleLabel:roleLabel||null,need:!!need,extraType:extraType||null};
  }

  function finalizePassage(passage){
    if(!Array.isArray(passage.sentences)||!passage.sentences.length)throw new Error("本文がありません");
    passage.text=passage.sentences.join("")+passage.ask;
    passage.quantities.forEach(function(entry){
      if(passage.text.indexOf(entry.text)<0)throw new Error("数量が本文にありません: "+entry.text);
    });
    passage.roleLabels=passage.quantities.map(function(entry){return entry.roleLabel;}).filter(function(label){return !!label;});
    if(passage.askRoleLabel)passage.roleLabels.push(passage.askRoleLabel);
    var extras=[];
    passage.quantities.forEach(function(entry,index){if(entry.extraType)extras.push(index);});
    passage.extraIndices=extras;
    if(passage.paraphrasePairs===undefined)passage.paraphrasePairs=[];
    if(passage.exception===undefined)passage.exception=false;
    if(passage.eventOrderShuffled===undefined)passage.eventOrderShuffled=false;
    if(passage.askLimiter===undefined)passage.askLimiter=null;
    if(passage.tableSentenceIndex===undefined)passage.tableSentenceIndex=null;
    return passage;
  }

  /* 8.3 規則 6: 余分集合が選択肢列の端の連続区間と一致してはならない。 */
  function extrasPositionOk(extraIndices,total){
    if(!extraIndices.length)return true;
    var sorted=extraIndices.slice().sort(function(a,b){return a-b;});
    var contiguous=sorted.every(function(value,index){return index===0||value===sorted[index-1]+1;});
    if(!contiguous)return true;
    if(sorted[0]===0)return false;
    if(sorted[sorted.length-1]===total-1)return false;
    return true;
  }

  function unitKindsOf(units,askUnit){
    var bySystem={};
    units.forEach(function(unit){
      var system=UNIT_SYSTEMS[unit]||unit;
      bySystem[system]=bySystem[system]||{};
      bySystem[system][unit]=true;
    });
    if(askUnit){
      var askSystem=UNIT_SYSTEMS[askUnit]||askUnit;
      if(bySystem[askSystem])bySystem[askSystem][askUnit]=true;
    }
    var most=1;
    Object.keys(bySystem).forEach(function(system){
      var count=Object.keys(bySystem[system]).length;
      if(count>most)most=count;
    });
    return most;
  }

  function axesFor(passage,relevantUnits,askUnit,shuffleAxis){
    return {extra:passage.extraIndices.length,
      shuffle:!!shuffleAxis,
      paraphrase:passage.paraphrasePairs.length,
      unitKinds:relevantUnits.length?unitKindsOf(relevantUnits,askUnit):1,
      exception:passage.exception?1:0};
  }

  function baseQuestion(lv,qTag,passage,prompt,axes,wazaKey){
    if(!WAZA[wazaKey])throw new Error("わざの軸がありません: "+wazaKey);
    return {cat:"kom_johou_seiri",format:FORMAT_OF[qTag],kind:KIND_OF[qTag],lv:lv,qTag:qTag,
      passageId:passage.id,passage:passage,prompt:prompt,
      text:passage.text+"／"+prompt,axes:axes,waza:copy(WAZA[wazaKey]),ans:null,id:null};
  }

  function option(text,correct,meta){
    if(typeof text!=="string"||!text)throw new Error("選択肢が正しくありません");
    var entry={text:text,correct:!!correct};
    if(meta)Object.keys(meta).forEach(function(key){entry[key]=meta[key];});
    return entry;
  }

  /* 9.4.2: choice 系は生成の最後に注入 random で shuffle して正解位置を決める。 */
  function setChoice(question,options,random){
    if(!Array.isArray(options)||options.length!==4)throw new Error("選択肢を 4 個作れません");
    for(var i=0;i<options.length;i++)for(var j=i+1;j<options.length;j++)
      if(options[i].text===options[j].text)throw new Error("同じ選択肢があります");
    var mixed=shuffle(options,random);
    if(mixed.filter(function(item){return item.correct;}).length!==1)throw new Error("正解が 1 個ではありません");
    question.choices=mixed.map(function(item){return item.text;});
    question.choiceMeta=mixed.map(function(item){return {unit:item.unit||null,origin:item.origin||null,errorType:item.errorType||null};});
    question.ans=mixed.map(function(item){return item.correct;}).indexOf(true);
    return question;
  }

  function quantityById(passage,id){
    for(var i=0;i<passage.quantities.length;i++)if(passage.quantities[i].id===id)return passage.quantities[i];
    throw new Error("数量がありません: "+id);
  }
  function occurrencesOf(text,word){
    var positions=[],at=text.indexOf(word);
    while(at>=0){positions.push(at);at=text.indexOf(word,at+1);}
    return positions;
  }

  /* 検証 22 の遮断: 共有語句ごとに「正答とのあいだに別の数量がはさまる出現」が 1 つ以上。 */
  function isBlocked(passage,word,target){
    var text=passage.text,ansAt=text.indexOf(target.text);
    if(ansAt<0)throw new Error("正答が本文にありません");
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
  function checkExtraction(passage,question,target){
    if(question.targetOwnerIds.length<2)throw new Error("対象の数量が 2 つ未満です");
    if(passage.text.indexOf(question.targetPhrase)>=0)throw new Error("設問の対象語句が本文にそのまま現れています");
    question.sharedWords.forEach(function(word){
      if(!isBlocked(passage,word,target))throw new Error("共有語句が遮断されていません: "+word);
    });
    var sameUnit=passage.quantities.filter(function(entry){return entry.mentionedUnits.indexOf(target.unit)>=0;});
    if(sameUnit.length<2)throw new Error("同単位の数量が 2 つ未満です");
  }

  function makeQ1(lv,passage,spec,random){
    var question=baseQuestion(lv,"Q1",passage,"この問題は、何を聞いていますか。",
      axesFor(passage,[],null,false),"common");
    question.centerPhrase=spec.center;
    if(passage.ask.indexOf(spec.center)<0)throw new Error("中心語句が問い文にありません");
    if(spec.correct.indexOf(spec.center)>=0)throw new Error("正答が中心語句を含んでいます");
    if(spec.withCenter.indexOf(spec.center)<0)throw new Error("誤答が中心語句を含んでいません");
    return setChoice(question,[option(spec.correct,true),option(spec.withCenter,false),
      option(spec.others[0],false),option(spec.others[1],false)],random);
  }

  function makeQ4(lv,passage,targetId,wrongs,random){
    var target=quantityById(passage,targetId);
    if(!target.roleLabel)throw new Error("役割ラベルがありません");
    var question=baseQuestion(lv,"Q4",passage,"「"+target.text+"」は何をあらわす数ですか。",
      axesFor(passage,[target.unit],null,false),"common");
    question.targetQuantityId=targetId;
    var options=[option(target.roleLabel,true,{unit:target.unit,origin:"in_text"})],notWritten=0,sameUnit=1,realSameUnit=1;
    var targetSystem=UNIT_SYSTEMS[target.unit]||target.unit;
    wrongs.forEach(function(wrong){
      if(wrong.origin==="not_written")notWritten++;
      else if(passage.roleLabels.indexOf(wrong.text)<0)throw new Error("本文にない役割です: "+wrong.text);
      if((UNIT_SYSTEMS[wrong.unit]||wrong.unit)===targetSystem){sameUnit++;if(wrong.origin!=="not_written")realSameUnit++;}
      options.push(option(wrong.text,false,{unit:wrong.unit,origin:wrong.origin}));
    });
    if(notWritten>1)throw new Error("not_written の肢が 2 つ以上あります");
    if(sameUnit<2||realSameUnit<1)throw new Error("同単位の役割の肢が足りません");
    return setChoice(question,options,random);
  }

  function makeQ2(lv,passage,spec){
    var target=quantityById(passage,spec.targetId);
    var question=baseQuestion(lv,"Q2",passage,spec.prompt,
      axesFor(passage,[target.unit],null,false),"info");
    question.targetQuantityId=spec.targetId;question.targetPhrase=spec.targetPhrase;
    question.sharedWords=spec.sharedWords.slice();question.targetOwnerIds=spec.ownerIds.slice();
    checkExtraction(passage,question,target);
    question.ans=target.value;
    return question;
  }

  function makeQ3(lv,passage,spec){
    var target=quantityById(passage,spec.targetId);
    var question=baseQuestion(lv,"Q3",passage,spec.targetPhrase+"を、書いてあるとおりに、数と単位を書きましょう。",
      axesFor(passage,[target.unit],null,false),"info");
    question.targetQuantityId=spec.targetId;question.targetPhrase=spec.targetPhrase;
    question.sharedWords=spec.sharedWords.slice();question.targetOwnerIds=spec.ownerIds.slice();
    checkExtraction(passage,question,target);
    question.ans=target.value;question.ansUnit=target.unit;
    question.unitChoices=spec.unitChoices.slice();
    if(question.unitChoices.indexOf(target.unit)<0)throw new Error("単位チップに正答の単位がありません");
    return question;
  }

  function findAllBase(lv,qTag,passage,prompt,relevantUnits,askUnit,wazaKey){
    var question=baseQuestion(lv,qTag,passage,prompt,axesFor(passage,relevantUnits,askUnit,false),wazaKey);
    question.choices=passage.quantities.map(function(entry){return entry.text;});
    if(question.choices.length<3||question.choices.length>7)throw new Error("数量の選択肢は 3 個から 7 個です");
    if(!extrasPositionOk(passage.extraIndices,passage.quantities.length))throw new Error("余分の位置が端の連続区間です");
    return question;
  }
  function needUnits(passage){
    return passage.quantities.filter(function(entry){return entry.need;}).map(function(entry){return entry.unit;});
  }
  function makeQ5(lv,passage){
    var question=findAllBase(lv,"Q5",passage,"この問題で使う数をぜんぶえらびましょう。",needUnits(passage),passage.askUnit,"info");
    question.ans=[];
    passage.quantities.forEach(function(entry,index){if(entry.need)question.ans.push(index);});
    if(!question.ans.length)throw new Error("使う数がありません");
    return question;
  }
  function makeQ6(lv,passage){
    var question=findAllBase(lv,"Q6",passage,"この問題で使わない数をぜんぶえらびましょう。",needUnits(passage),passage.askUnit,"info");
    question.ans=passage.extraIndices.slice();
    if(!question.ans.length)throw new Error("使わない数がありません");
    return question;
  }
  function makeQ5v(lv,passage){
    var question=findAllBase(lv,"Q5v",passage,"答えを出す前に、単位をそろえる必要がある数をぜんぶえらびましょう。",
      needUnits(passage),passage.askUnit,"unit");
    question.ans=[];
    var askSystem=UNIT_SYSTEMS[passage.askUnit];
    passage.quantities.forEach(function(entry,index){
      if(entry.need&&entry.unit!==passage.askUnit&&UNIT_SYSTEMS[entry.unit]===askSystem)question.ans.push(index);
    });
    if(!question.ans.length)throw new Error("そろえる数がありません");
    var unitCounts={};
    passage.quantities.forEach(function(entry){
      if(UNIT_SYSTEMS[entry.unit]===askSystem)unitCounts[entry.unit]=(unitCounts[entry.unit]||0)+1;
    });
    var majorityUnit=Object.keys(unitCounts).sort(function(a,b){return unitCounts[b]-unitCounts[a];})[0];
    question.majorityAligned=question.ans.every(function(index){return passage.quantities[index].unit===majorityUnit;});
    return question;
  }
  function makeQ7(lv,passage){
    var pair=passage.paraphrasePairs[0];
    if(!pair)throw new Error("言い換えの組がありません");
    var sentenceIndices=passage.paraphraseChoiceSentences;
    var pairUnits=[quantityById(passage,pair[0]).unit,quantityById(passage,pair[1]).unit];
    var question=baseQuestion(lv,"Q7",passage,"同じことを言っている文を2つえらびましょう。",
      axesFor(passage,pairUnits,null,false),"paraphrase");
    question.choices=sentenceIndices.map(function(index){return passage.sentences[index];});
    question.ans=[];
    passage.paraphraseSentencePair.forEach(function(sentenceIndex){
      var at=sentenceIndices.indexOf(sentenceIndex);
      if(at<0)throw new Error("言い換えの文が選択肢にありません");
      question.ans.push(at);
    });
    question.ans.sort(function(a,b){return a-b;});
    return question;
  }

  function makeQ8(lv,passage,random){
    var events=passage.events;
    if(!Array.isArray(events)||events.length<4||events.length>5)throw new Error("部品は 4 個から 5 個です");
    var keys={};
    events.forEach(function(event){
      if(keys[event.orderKey])throw new Error("同時刻の出来事があります");
      keys[event.orderKey]=true;
    });
    var canonical=events.slice().sort(function(a,b){return a.orderKey-b.orderKey;});
    var stored=shuffle(canonical,random);
    var question=baseQuestion(lv,"Q8",passage,"出来事を起こった順にならべましょう。",
      axesFor(passage,[],null,true),"order");
    question.parts=stored.map(function(event){return {text:event.text};});
    question.ans=canonical.map(function(event){return stored.indexOf(event);});
    var order=shuffle(question.parts.map(function(entry,index){return index;}),random),guard=0;
    while(sameArray(order,question.ans)&&guard<20){order=shuffle(order,random);guard++;}
    if(sameArray(order,question.ans)){var head=order[0];order[0]=order[1];order[1]=head;}
    question.displayOrder=order;
    return question;
  }

  function makeQ9(lv,passage,spec,random){
    var question=baseQuestion(lv,"Q9",passage,
      spec.owner+"のメモ「"+spec.memo+"」。メモのどこがまちがっていますか。",
      axesFor(passage,spec.memoUnits,spec.memoAskUnit||null,false),WAZA_BY_ERROR[spec.errorType]||"common");
    question.errorType=spec.errorType;question.memo=spec.memo;question.memoUnits=spec.memoUnits.slice();
    var labels=[option(DIAGNOSIS_LABELS[spec.errorType],true,{errorType:spec.errorType})];
    var others=["correct"].concat(spec.others).filter(function(type){return type!==spec.errorType;});
    others.slice(0,3).forEach(function(type){
      if(!DIAGNOSIS_LABELS[type])throw new Error("診断語彙にありません: "+type);
      labels.push(option(DIAGNOSIS_LABELS[type],false,{errorType:type}));
    });
    return setChoice(question,labels,random);
  }

  function makeQ10(lv,passage,spec,random){
    var question=baseQuestion(lv,"Q10",passage,"書いてあることだけで答えが出せますか。",
      axesFor(passage,[],null,false),"common");
    question.errorType=spec.solvable?"solvable":"missing";
    var labels=[];
    if(spec.solvable){
      labels.push(option(SOLVABLE_LABEL,true,{errorType:"solvable"}));
      spec.wrongNames.slice(0,3).forEach(function(name){labels.push(option(name+"が書かれていない",false,{errorType:"missing"}));});
    }else{
      labels.push(option(spec.missingName+"が書かれていない",true,{errorType:"missing"}));
      labels.push(option(SOLVABLE_LABEL,false,{errorType:"solvable"}));
      spec.wrongNames.slice(0,2).forEach(function(name){labels.push(option(name+"が書かれていない",false,{errorType:"missing"}));});
    }
    return setChoice(question,labels,random);
  }

  /* 分散規則 4 つ (6.1) と配合表をセット確定時に強制する。 */
  function finalizeSet(lv,questions){
    if(!Array.isArray(questions)||questions.length!==CONFIG.setSize)throw new Error("5問セットを作れません");
    var mix={},byPassage={},passageIds=[],kinds={};
    questions.forEach(function(question,index){
      question.lv=lv;question.id="johou_seiri_"+lv+"_q"+(index+1);
      mix[question.qTag]=(mix[question.qTag]||0)+1;
      kinds[question.qTag]=true;
      byPassage[question.passageId]=byPassage[question.passageId]||{};
      if(byPassage[question.passageId][question.qTag])throw new Error("同一本文に同じ問い方が 2 回あります");
      byPassage[question.passageId][question.qTag]=true;
      if(passageIds.indexOf(question.passageId)<0)passageIds.push(question.passageId);
    });
    var expected=QUESTION_MIX[lv];
    Object.keys(expected).forEach(function(qTag){
      if(mix[qTag]!==expected[qTag])throw new Error("問い方の配合が違います: "+qTag);
    });
    Object.keys(mix).forEach(function(qTag){
      if(!expected[qTag])throw new Error("配合にない問い方です: "+qTag);
      if(lv>=3&&mix[qTag]>=3)throw new Error("同じ問い方が 3 回以上あります");
    });
    if(lv>=5&&Object.keys(kinds).length<3)throw new Error("問い方が 3 種類未満です");
    if(passageIds.length!==PASSAGE_COUNTS[lv])throw new Error("本文の本数が違います");
    Object.keys(byPassage).forEach(function(passageId){
      if(byPassage[passageId].Q2&&byPassage[passageId].Q3)throw new Error("Q2 と Q3 が同一本文にあります");
    });
    return questions;
  }

  function passageShell(id,lv,scene,backbone,names){
    return {id:id,lv:lv,scene:scene,backbone:backbone,names:names||[]};
  }

  /* ---- Lv1: 問われている量と役割 (余分 0) ---- */
  function lv1Library(random){
    var total=pick([200,220,240,260],random),zukan=pick([35,45,55,65],random);
    var passage=passageShell("js1_library",1,"library","subtract",[]);
    passage.sentences=["図書室に本が"+total+"さつあります。","そのうち図かんは"+zukan+"さつです。"];
    passage.ask="図かん以外の本は何さつありますか。";passage.askUnit="さつ";
    passage.askRoleLabel="図かん以外の本の数";
    passage.quantities=[
      quantity("q1",total+"さつ",total,"さつ","total","図書室の本全部の数",true,null),
      quantity("q2",zukan+"さつ",zukan,"さつ","part","図かんの数",true,null)];
    return finalizePassage(passage);
  }
  function lv1Classes(random){
    var first=pick([30,32,34,36],random),second=pick([27,29,31,33],random);
    while(second===first)second-=1;
    var passage=passageShell("js1_classes",1,"school","combine",[]);
    passage.sentences=["1組は"+first+"人です。","2組は"+second+"人です。"];
    passage.ask="2つの組をあわせると何人ですか。";passage.askUnit="人";
    passage.askRoleLabel="1組と2組をあわせた人数";
    passage.quantities=[
      quantity("q1",first+"人",first,"人","class1","1組の人数",true,null),
      quantity("q2",second+"人",second,"人","class2","2組の人数",true,null)];
    return finalizePassage(passage);
  }
  function lv1Tapes(random){
    var blue=pick([85,95,105],random),red=pick([120,130,140],random);
    var passage=passageShell("js1_tapes",1,"craft","combine",[]);
    passage.sentences=["青いテープは"+blue+"cmです。","赤いテープは"+red+"cmです。"];
    passage.ask="2本をつなぐと、あわせて何cmになりますか。";passage.askUnit="cm";
    passage.askRoleLabel="2本をつないだときの長さ";
    passage.quantities=[
      quantity("q1",blue+"cm",blue,"cm","blue","青いテープの長さ",true,null),
      quantity("q2",red+"cm",red,"cm","red","赤いテープの長さ",true,null)];
    return finalizePassage(passage);
  }
  function buildLv1(random){
    var library=lv1Library(random),classes=lv1Classes(random),tapes=lv1Tapes(random);
    return finalizeSet(1,[
      makeQ1(1,library,{center:"図かん以外の本",correct:"図かんをのぞいた本の数",
        withCenter:"図かん以外の本のねだん",others:["図かんの数","図書室の本全部の数"]},random),
      makeQ4(1,library,"q2",[
        {text:"図かん以外の本の数",unit:"さつ",origin:"in_text"},
        {text:"図書室の本全部の数",unit:"さつ",origin:"in_text"},
        {text:"図書室に来た人の数",unit:"人",origin:"not_written"}],random),
      makeQ1(1,classes,{center:"2つの組をあわせ",correct:"1組と2組の人数をたした数",
        withCenter:"2つの組をあわせたつくえの数",others:["1組の人数","2組の人数"]},random),
      makeQ4(1,classes,"q2",[
        {text:"1組の人数",unit:"人",origin:"in_text"},
        {text:"1組と2組をあわせた人数",unit:"人",origin:"in_text"},
        {text:"先生の人数",unit:"人",origin:"not_written"}],random),
      makeQ1(1,tapes,{center:"あわせて",correct:"2本をつないだときの長さ",
        withCenter:"あわせて買ったねだん",others:["青いテープの長さ","赤いテープの長さ"]},random)]);
  }

  /* ---- Lv2: 指名された量の抜き出し (余分 1 = 規則 1 型) ---- */
  function lv2Shop(random){
    var name=pick(["たろう","はなこ","けん"],random);
    var money=1000,hour=pick([9,10],random),price=pick([120,150,180],random),count=pick([2,3],random);
    var passage=passageShell("js2_shop",2,"shopping","subtract",[name]);
    passage.sentences=[name+"は店で"+money+"円を出しました。","店は"+hour+"時に開きます。",
      "ジュースは1本"+price+"円です。","かごに入れたのは"+count+"本です。"];
    passage.ask="おつりは何円ですか。";passage.askUnit="円";
    passage.quantities=[
      quantity("q1",money+"円",money,"円","money","はじめに出したお金",true,null),
      quantity("q2",hour+"時",hour,"時","open","店が開く時こく",false,"time_stamp"),
      quantity("q3","1本"+price+"円",price,"円","price","ジュース1本のねだん",true,null,["本","円"]),
      quantity("q4",count+"本",count,"本","count","買ったジュースの本数",true,null)];
    passage.q2Spec={targetId:"q4",prompt:name+"が買ったジュースの本数は何本ですか。数だけ書きましょう。",
      targetPhrase:"買ったジュースの本数",sharedWords:[name,"ジュース"],ownerIds:["q3","q4"]};
    return finalizePassage(passage);
  }
  function lv2Race(random){
    var first=pick([31,32,33,34],random),second=first-pick([2,3,4],random),chairs=pick([26,28,30],random);
    while(chairs===second||chairs===first)chairs-=1;
    var passage=passageShell("js2_race",2,"school","combine",[]);
    passage.sentences=["1組は"+first+"人です。","運動会では人数の少ない組が先に走ります。",
      "教室にいすが"+chairs+"きゃくあります。","2組は"+second+"人です。"];
    passage.ask="あわせて何人ですか。";passage.askUnit="人";
    passage.quantities=[
      quantity("q1",first+"人",first,"人","class1","1組の人数",true,null),
      quantity("q2",chairs+"きゃく",chairs,"きゃく","chairs","教室のいすの数",false,"other_kind"),
      quantity("q3",second+"人",second,"人","class2","2組の人数",true,null)];
    passage.q2Spec={targetId:"q3",prompt:"先に走る組の人数は何人ですか。数だけ書きましょう。",
      targetPhrase:"先に走る組",sharedWords:["先に走"],ownerIds:["q1","q3"]};
    return finalizePassage(passage);
  }
  function lv2Tape(random){
    var long=pick([140,150,160],random),price=pick([60,70,80],random),short=pick([75,85,95],random);
    var passage=passageShell("js2_tape",2,"craft","combine",[]);
    passage.sentences=["工作でつかうテープは、短いほうです。","長いほうは"+long+"cmです。",
      "テープは1まき"+price+"円です。","短いほうは"+short+"cmです。"];
    passage.ask="2本をつなぐと何cmですか。";passage.askUnit="cm";
    passage.quantities=[
      quantity("q1",long+"cm",long,"cm","long","長いほうのテープの長さ",true,null),
      quantity("q2","1まき"+price+"円",price,"円","price","テープ1まきのねだん",false,"other_kind",["まき","円"]),
      quantity("q3",short+"cm",short,"cm","short","短いほうのテープの長さ",true,null)];
    passage.q3Spec={targetId:"q3",targetPhrase:"工作でつかうテープの長さ",
      sharedWords:["工作でつかう","テープ"],ownerIds:["q1","q2","q3"],unitChoices:["cm","m"]};
    return finalizePassage(passage);
  }
  function buildLv2(random){
    var shop=lv2Shop(random),race=lv2Race(random),tape=lv2Tape(random);
    return finalizeSet(2,[
      makeQ5(2,shop),
      makeQ2(2,shop,shop.q2Spec),
      makeQ2(2,race,race.q2Spec),
      makeQ4(2,race,"q1",[
        {text:"2組の人数",unit:"人",origin:"in_text"},
        {text:"教室のいすの数",unit:"きゃく",origin:"in_text"},
        {text:"先生の人数",unit:"人",origin:"not_written"}],random),
      makeQ3(2,tape,tape.q3Spec)]);
  }

  /* ---- Lv3: 使う数の選別 (余分 1、本文ごとに規則 1 型と 3 型を交互) ---- */
  function lv3Pens(random){
    var price=pick([140,150,160],random),kinds=pick([10,12,15],random),count=pick([3,4,6],random),money=1000;
    var passage=passageShell("js3_pens",3,"shopping","subtract",[]);
    passage.sentences=["1本"+price+"円のペンを買います。","店にはペンが"+kinds+"種類ならんでいます。",
      "かごに入れたのは"+count+"本で、"+money+"円を出しました。"];
    passage.ask="おつりは何円ですか。";passage.askUnit="円";
    passage.quantities=[
      quantity("q1","1本"+price+"円",price,"円","price","ペン1本のねだん",true,null,["本","円"]),
      quantity("q2",kinds+"種類",kinds,"種類","kinds","ならんでいるペンの種類の数",false,"other_kind"),
      quantity("q3",count+"本",count,"本","count","買ったペンの本数",true,null),
      quantity("q4",money+"円",money,"円","money","はじめに出したお金",true,null)];
    passage.q2Spec={targetId:"q3",prompt:"買ったペンの本数は何本ですか。数だけ書きましょう。",
      targetPhrase:"買ったペンの本数",sharedWords:["ペン","買"],ownerIds:["q1","q3"]};
    return finalizePassage(passage);
  }
  function lv3Bus(random){
    var children=pick([33,35,36],random),teachers=pick([3,4,5],random),others=pick([37,38,39],random),cap=pick([40,45],random);
    var passage=passageShell("js3_bus",3,"trip","divide",[]);
    passage.sentences=["遠足で4年生がバスに乗ります。","4年生は子どもが"+children+"人、先生が"+teachers+"人です。",
      "5年生は"+others+"人ですが、別のバスに乗ります。","バスは1台に"+cap+"人まで乗れます。"];
    passage.ask="4年生のバスは何台いりますか。";passage.askUnit="台";passage.askLimiter="4年生の";
    passage.quantities=[
      quantity("q1",children+"人",children,"人","children","4年生の子どもの人数",true,null),
      quantity("q2",teachers+"人",teachers,"人","teachers","4年生の先生の人数",true,null),
      quantity("q3",others+"人",others,"人","grade5","5年生の人数",false,"out_of_scope"),
      quantity("q4",cap+"人",cap,"人","capacity","バス1台に乗れる人数",true,null,["台","人"])];
    return finalizePassage(passage);
  }
  function buildLv3(random){
    var pens=lv3Pens(random),bus=lv3Bus(random);
    return finalizeSet(3,[
      makeQ5(3,pens),
      makeQ2(3,pens,pens.q2Spec),
      makeQ6(3,pens),
      makeQ5(3,bus),
      makeQ4(3,bus,"q2",[
        {text:"4年生の子どもの人数",unit:"人",origin:"in_text"},
        {text:"5年生の人数",unit:"人",origin:"in_text"},
        {text:"バスの運転手の人数",unit:"人",origin:"not_written"}],random)]);
  }

  /* ---- Lv4: 使わない数の選別 (余分 2、1 個以上は規則 3 型) ---- */
  function lv4Books(random){
    var first=pick([3,4],random),limit=10,other=pick([5,6,7],random),second=2;
    while(other===first)other+=1;
    var passage=passageShell("js4_books",4,"library","combine",["ゆい","けん"]);
    passage.sentences=["ゆいさんは月曜日に本を"+first+"さつ借りました。","1人が借りられるのは"+limit+"さつまでです。",
      "けんさんは"+other+"さつ借りました。","ゆいさんは木曜日にも"+second+"さつ借りました。"];
    passage.ask="ゆいさんは全部で何さつ借りましたか。";passage.askUnit="さつ";passage.askLimiter="ゆいさん";
    passage.quantities=[
      quantity("q1",first+"さつ",first,"さつ","first","ゆいさんが月曜日に借りた数",true,null),
      quantity("q2",limit+"さつ",limit,"さつ","limit","1人が借りられる数",false,"limit"),
      quantity("q3",other+"さつ",other,"さつ","other","けんさんが借りた数",false,"out_of_scope"),
      quantity("q4",second+"さつ",second,"さつ","second","ゆいさんが木曜日に借りた数",true,null)];
    passage.q2Spec={targetId:"q4",prompt:"2回目にゆいさんが借りたさっ数は何さつですか。数だけ書きましょう。",
      targetPhrase:"2回目にゆいさんが借りたさっ数",sharedWords:["ゆいさん","借り"],ownerIds:["q1","q4"]};
    return finalizePassage(passage);
  }
  function lv4Fruits(random){
    var perBox=pick([24,26],random),rivalBox=pick([16,18],random),boxes=3,given=pick([5,7],random),rivalCount=2;
    var passage=passageShell("js4_fruits",4,"shopping","subtract",[]);
    passage.sentences=["みかんが1箱に"+perBox+"こ入っています。","りんごは1箱に"+rivalBox+"こ入っています。",
      "みかんを"+boxes+"箱買って、そのうち"+given+"こをとなりの家にあげました。","りんごは"+rivalCount+"箱買いました。"];
    passage.ask="みかんののこりは何こですか。";passage.askUnit="こ";passage.askLimiter="みかんの";
    passage.quantities=[
      quantity("q1",perBox+"こ",perBox,"こ","per_box","みかん1箱に入っている数",true,null,["箱","こ"]),
      quantity("q2",rivalBox+"こ",rivalBox,"こ","rival_per_box","りんご1箱に入っている数",false,"out_of_scope",["箱","こ"]),
      quantity("q3",boxes+"箱",boxes,"箱","boxes","買ったみかんの箱の数",true,null),
      quantity("q4",given+"こ",given,"こ","given","あげたみかんの数",true,null),
      quantity("q5",rivalCount+"箱",rivalCount,"箱","rival_boxes","買ったりんごの箱の数",false,"out_of_scope")];
    return finalizePassage(passage);
  }
  function buildLv4(random){
    var books=lv4Books(random),fruits=lv4Fruits(random);
    return finalizeSet(4,[
      makeQ5(4,books),
      makeQ2(4,books,books.q2Spec),
      makeQ6(4,books),
      makeQ5(4,fruits),
      makeQ6(4,fruits)]);
  }

  /* ---- Lv5: 単位の混在 (そろえた値は問わない) ---- */
  function lv5Tapes(random){
    var blue=pick([85,95],random),white=pick([2,3],random),red=pick([120,130],random),price=pick([80,90],random);
    var passage=passageShell("js5_tapes",5,"craft","combine",[]);
    passage.sentences=["工作でテープを使います。","青いテープは"+blue+"cmです。","白いテープは"+white+"mあります。",
      "赤いテープは"+red+"cmです。","テープは1まき"+price+"円です。"];
    passage.ask="青と赤をあわせると何mになりますか。";passage.askUnit="m";passage.askLimiter="青と赤";
    passage.quantities=[
      quantity("q1",blue+"cm",blue,"cm","blue","青いテープの長さ",true,null),
      quantity("q2",white+"m",white,"m","white","白いテープの長さ",false,"out_of_scope"),
      quantity("q3",red+"cm",red,"cm","red","赤いテープの長さ",true,null),
      quantity("q4","1まき"+price+"円",price,"円","price","テープ1まきのねだん",false,"other_kind",["まき","円"])];
    passage.q9Spec={owner:"ゆうさん",memo:blue+"と"+red+"をたしてmと書く",errorType:"unit_mixed",
      memoUnits:["cm","cm"],memoAskUnit:"m",others:["number_mixup","ask_mismatch"]};
    return finalizePassage(passage);
  }
  function lv5Milk(random){
    var small=pick([400,500],random),price=pick([160,180],random),big=pick([1,2],random);
    var passage=passageShell("js5_milk",5,"lunch","combine",[]);
    passage.sentences=["牛にゅうが大きいパックと小さいパックであります。","小さいほうは"+small+"mLです。",
      "牛にゅうは1本"+price+"円です。","大きいほうは"+big+"Lです。"];
    passage.ask="2本あわせて何mLですか。";passage.askUnit="mL";
    passage.quantities=[
      quantity("q1",small+"mL",small,"mL","small","小さいパックのかさ",true,null),
      quantity("q2","1本"+price+"円",price,"円","price","牛にゅう1本のねだん",false,"other_kind",["本","円"]),
      quantity("q3",big+"L",big,"L","big","大きいパックのかさ",true,null)];
    return finalizePassage(passage);
  }
  function buildLv5(random){
    var tapes=lv5Tapes(random),milk=lv5Milk(random);
    return finalizeSet(5,[
      makeQ5v(5,tapes),
      makeQ9(5,tapes,tapes.q9Spec,random),
      makeQ4(5,tapes,"q2",[
        {text:"青いテープの長さ",unit:"cm",origin:"in_text"},
        {text:"赤いテープの長さ",unit:"cm",origin:"in_text"},
        {text:"テープ1まきのねだん",unit:"円",origin:"in_text"}],random),
      makeQ5v(5,milk),
      makeQ4(5,milk,"q1",[
        {text:"大きいパックのかさ",unit:"L",origin:"in_text"},
        {text:"牛にゅう1本のねだん",unit:"円",origin:"in_text"},
        {text:"コップに入れたかさ",unit:"mL",origin:"not_written"}],random)]);
  }

  /* ---- Lv6: 言い換えと役割 (単位対は 60 進の時間系のみ) ---- */
  var PARAPHRASE_PAIRS=[
    {main:"1時間30分",alt:"90分",value:90,tokens:["1","30","90"]},
    {main:"1時間15分",alt:"75分",value:75,tokens:["1","15","75"]},
    {main:"1時間20分",alt:"80分",value:80,tokens:["1","20","80"]},
    {main:"2時間30分",alt:"150分",value:150,tokens:["2","30","150"]}];
  function tokensOf(text){return String(text).match(/\d+/g)||[];}
  function tokensDisjoint(pair,valueList){
    var used={};
    pair.tokens.forEach(function(token){used[token]=true;});
    return valueList.every(function(value){
      return tokensOf(value).every(function(token){return !used[token];});
    });
  }
  function lv6Saturday(random){
    for(var attempt=0;attempt<50;attempt++){
      var pair=pick(PARAPHRASE_PAIRS,random),play=pick([35,40,45],random),snack=15;
      if(!tokensDisjoint(pair,[play,snack]))continue;
      if(tokensOf(play).indexOf(String(snack))>=0)continue;
      var passage=passageShell("js6_saturday",6,"trip","combine",["まさと"]);
      passage.sentences=["まさとさんの土曜日です。","本を読んでいた時間は"+pair.main+"です。",
        "おやつは"+snack+"時に食べました。","公園で遊んだ時間は"+play+"分です。",
        "読書にかかったのは"+pair.alt+"だと、まさとさんは言っています。"];
      passage.ask="読書と公園をあわせて何分ですか。";passage.askUnit="分";
      passage.quantities=[
        quantity("q1",pair.main,pair.value,"時間分","reading","本を読んでいた時間",true,null),
        quantity("q2",snack+"時",snack,"時","snack","おやつの時こく",false,"time_stamp"),
        quantity("q3",play+"分",play,"分","play","公園で遊んだ時間",true,null),
        quantity("q4",pair.alt,pair.value,"分","reading_alt","読書にかかった時間",true,null)];
      passage.paraphrasePairs=[["q1","q4"]];
      passage.paraphraseSentencePair=[1,4];
      passage.paraphraseChoiceSentences=[1,2,3,4];
      passage.q9Spec={owner:"ゆうさん",memo:pair.main+"と"+pair.alt+"と"+play+"分をたす",errorType:"double_count",
        memoUnits:["時間分","分","分"],memoAskUnit:"分",others:["unit_mixed","number_mixup"]};
      return finalizePassage(passage);
    }
    throw new Error("言い換えの組を作れません");
  }
  function lv6Sunday(random){
    for(var attempt=0;attempt<50;attempt++){
      var pair=pick(PARAPHRASE_PAIRS,random),members=pick([26,28,32],random),bus=pick([22,25],random);
      if(!tokensDisjoint(pair,[members,bus]))continue;
      if(String(members)===String(bus))continue;
      var passage=passageShell("js6_sunday",6,"trip","combine",["けん"]);
      passage.sentences=["けんさんの日曜日です。","サッカーの練習は"+pair.main+"でした。",
        "ぼしゅうの人数は"+members+"人です。","グラウンドまでのバスは"+bus+"分です。",
        "グラウンドにいたのは"+pair.alt+"だと、コーチが言いました。"];
      passage.ask="練習とバスをあわせて何分ですか。";passage.askUnit="分";
      passage.quantities=[
        quantity("q1",pair.main,pair.value,"時間分","practice","サッカーの練習の時間",true,null),
        quantity("q2",members+"人",members,"人","members","ぼしゅうの人数",false,"other_kind"),
        quantity("q3",bus+"分",bus,"分","bus","バスにのっていた時間",true,null),
        quantity("q4",pair.alt,pair.value,"分","practice_alt","グラウンドにいた時間",true,null)];
      passage.paraphrasePairs=[["q1","q4"]];
      passage.paraphraseSentencePair=[1,4];
      passage.paraphraseChoiceSentences=[1,2,3,4];
      return finalizePassage(passage);
    }
    throw new Error("言い換えの組を作れません");
  }
  function buildLv6(random){
    var saturday=lv6Saturday(random),sunday=lv6Sunday(random);
    return finalizeSet(6,[
      makeQ7(6,saturday),
      makeQ9(6,saturday,saturday.q9Spec,random),
      makeQ4(6,saturday,"q3",[
        {text:"本を読んでいた時間",unit:"時間分",origin:"in_text"},
        {text:"おやつの時こく",unit:"時",origin:"in_text"},
        {text:"ゆうごはんの時間",unit:"分",origin:"not_written"}],random),
      makeQ7(6,sunday),
      makeQ4(6,sunday,"q3",[
        {text:"サッカーの練習の時間",unit:"時間分",origin:"in_text"},
        {text:"ぼしゅうの人数",unit:"人",origin:"in_text"},
        {text:"ひるごはんの時間",unit:"分",origin:"not_written"}],random)]);
  }

  /* ---- Lv7: 時系列の復元 (部品に値は書かない) ---- */
  function lv7Sunday(random){
    var walk=pick([20,25],random),homework=pick([30,45],random),sister=pick([35,40],random);
    while(sister===homework||sister===walk)sister+=1;
    var passage=passageShell("js7_sunday",7,"trip","combine",["けん"]);
    passage.sentences=["けんさんの日曜日の話です。","公園に着いたのは、家を出てから"+walk+"分後でした。",
      "その前に、家で"+homework+"分宿題をしました。","妹は公園に"+sister+"分いました。",
      "公園で1時間遊んでから、店でアイスを買いました。","朝はやく起きました。"];
    passage.ask="けんさんが家を出てから公園を出るまでは何分ですか。";passage.askUnit="分";passage.askLimiter="けんさん";
    passage.eventOrderShuffled=true;
    passage.quantities=[
      quantity("q1",walk+"分",walk,"分","walk","家を出てから公園に着くまでの時間",true,null),
      quantity("q2",homework+"分",homework,"分","homework","家で宿題をした時間",false,"out_of_scope"),
      quantity("q3",sister+"分",sister,"分","sister","妹が公園にいた時間",false,"out_of_scope"),
      quantity("q4","1時間",60,"時間","play","公園で遊んだ時間",true,null)];
    passage.events=[{text:"起きる",orderKey:1},{text:"宿題をする",orderKey:2},
      {text:"公園に着く",orderKey:3},{text:"アイスを買う",orderKey:4}];
    passage.q9Spec={owner:"ゆうさん",memo:"アイスを買ってから公園に行った",errorType:"order_wrong",
      memoUnits:[],others:["number_mixup","ask_mismatch"]};
    return finalizePassage(passage);
  }
  function lv7School(random){
    var test=pick([40,45,50],random),souji=pick([10,15],random),grade5=pick([20,25],random);
    while(grade5===test)grade5+=1;
    var passage=passageShell("js7_school",7,"school","combine",["けん"]);
    passage.sentences=["きのうの学校でのできごとです。","図書室に行ったのは、給食の後でした。",
      "朝いちばんに、係の仕事をしました。","給食は12時からです。",
      "そうじは、図書室からもどってからしました。","算数のテストは、給食の前にありました。",
      "テストは"+test+"分、そうじは"+souji+"分でした。","5年生のそうじは"+grade5+"分です。"];
    passage.ask="けんさんのそうじとテストをあわせて何分ですか。";passage.askUnit="分";passage.askLimiter="けんさんの";
    passage.eventOrderShuffled=true;
    passage.quantities=[
      quantity("q1","12時",12,"時","lunch_time","給食が始まる時こく",false,"time_stamp"),
      quantity("q2",test+"分",test,"分","test","テストの時間",true,null),
      quantity("q3",souji+"分",souji,"分","souji","そうじの時間",true,null),
      quantity("q4",grade5+"分",grade5,"分","grade5","5年生のそうじの時間",false,"out_of_scope")];
    passage.events=[{text:"係の仕事",orderKey:1},{text:"算数のテスト",orderKey:2},
      {text:"給食",orderKey:3},{text:"図書室",orderKey:4},{text:"そうじ",orderKey:5}];
    return finalizePassage(passage);
  }
  function buildLv7(random){
    var sunday=lv7Sunday(random),school=lv7School(random);
    return finalizeSet(7,[
      makeQ8(7,sunday,random),
      makeQ9(7,sunday,sunday.q9Spec,random),
      makeQ4(7,sunday,"q3",[
        {text:"家を出てから公園に着くまでの時間",unit:"分",origin:"in_text"},
        {text:"家で宿題をした時間",unit:"分",origin:"in_text"},
        {text:"店にいた時間",unit:"分",origin:"not_written"}],random),
      makeQ8(7,school,random),
      makeQ5(7,school)]);
  }

  /* ---- Lv8: 例外条件 (ただし書き) ---- */
  function lv8Flowers(random){
    var class1=pick([30,32,34],random),class2=class1-pick([1,2],random),class3=class1+pick([1,3],random);
    var teachers=2,injured=pick([3,4],random),beds=pick([5,6,8],random);
    while(injured===teachers)injured+=1;
    var passage=passageShell("js8_flowers",8,"school","combine_exclude",[]);
    passage.sentences=["4年生全体で花の世話をします。","1組は"+class1+"人、2組は"+class2+"人です。",
      "先生も"+teachers+"人手つだいます。","3組は"+class3+"人です。",
      "ただし、けがをしている人は世話をしません。","けがをしている人は"+injured+"人います。",
      "花だんは"+beds+"つあります。"];
    passage.ask="世話をする4年生は何人ですか。";passage.askUnit="人";passage.askLimiter="4年生";
    passage.exception=true;
    passage.quantities=[
      quantity("q1",class1+"人",class1,"人","class1","1組の人数",true,null),
      quantity("q2",class2+"人",class2,"人","class2","2組の人数",true,null),
      quantity("q3",teachers+"人",teachers,"人","teachers","手つだう先生の人数",false,"out_of_scope"),
      quantity("q4",class3+"人",class3,"人","class3","3組の人数",true,null),
      quantity("q5",injured+"人",injured,"人","injured","けがをしている人の数",true,null),
      quantity("q6",beds+"つ",beds,"つ","beds","花だんの数",false,"other_kind")];
    passage.q9Spec={owner:"ゆうさん",memo:class1+"と"+class2+"と"+class3+"をたす",errorType:"exception_ignored",
      memoUnits:["人","人","人"],memoAskUnit:"人",others:["number_mixup","double_count"]};
    return finalizePassage(passage);
  }
  function lv8Excursion(random){
    var neighbor=pick([110,120],random),class1=pick([33,35],random),class2=class1-2,class3=class1-1;
    var cap=pick([40,45],random),sick=pick([4,6],random);
    var passage=passageShell("js8_excursion",8,"trip","combine_exclude",[]);
    passage.sentences=["校外学習に行きます。","となりの学校は"+neighbor+"人が行きます。",
      "1組は"+class1+"人、2組は"+class2+"人、3組は"+class3+"人です。",
      "バスは1台に"+cap+"人まで乗れます。","ただし、かぜで休んでいる人は行きません。",
      "かぜで休んでいるのは"+sick+"人です。"];
    passage.ask="この学校から行くのは何人ですか。";passage.askUnit="人";passage.askLimiter="この学校";
    passage.exception=true;
    passage.quantities=[
      quantity("q1",neighbor+"人",neighbor,"人","neighbor","となりの学校の人数",false,"out_of_scope"),
      quantity("q2",class1+"人",class1,"人","class1","1組の人数",true,null),
      quantity("q3",class2+"人",class2,"人","class2","2組の人数",true,null),
      quantity("q4",class3+"人",class3,"人","class3","3組の人数",true,null),
      quantity("q5",cap+"人",cap,"人","capacity","バス1台に乗れる人数",false,"limit",["台","人"]),
      quantity("q6",sick+"人",sick,"人","sick","かぜで休んでいる人の数",true,null)];
    return finalizePassage(passage);
  }
  function buildLv8(random){
    var flowers=lv8Flowers(random),excursion=lv8Excursion(random);
    return finalizeSet(8,[
      makeQ5(8,flowers),
      makeQ9(8,flowers,flowers.q9Spec,random),
      makeQ4(8,flowers,"q5",[
        {text:"手つだう先生の人数",unit:"人",origin:"in_text"},
        {text:"3組の人数",unit:"人",origin:"in_text"},
        {text:"花だんの数",unit:"つ",origin:"in_text"}],random),
      makeQ5(8,excursion),
      makeQ4(8,excursion,"q5",[
        {text:"となりの学校の人数",unit:"人",origin:"in_text"},
        {text:"かぜで休んでいる人の数",unit:"人",origin:"in_text"},
        {text:"1組の人数",unit:"人",origin:"in_text"}],random)]);
  }

  /* ---- Lv9: 条件不足の検出 ("出せる" は 2 問中 1 問) ---- */
  function lv9Pencils(random,complete){
    var notePrice=pick([140,150,160],random),pencilPrice=pick([60,70,80],random);
    var hour=pick([9,10],random),money=1000,count=pick([4,6],random);
    var passage=passageShell(complete?"js9_pencils_full":"js9_pencils",9,"shopping","subtract",[]);
    passage.sentences=[complete?"えんぴつを"+count+"本買いました。":"えんぴつを何本か買いました。",
      "ノートは1さつ"+notePrice+"円です。","えんぴつは1本"+pencilPrice+"円です。",
      "店は"+hour+"時に開きます。",money+"円を出したら、おつりがありました。"];
    passage.ask="おつりは何円ですか。";passage.askUnit="円";passage.askLimiter="えんぴつ";
    passage.quantities=[];
    if(complete)passage.quantities.push(quantity("q0",count+"本",count,"本","count","買ったえんぴつの本数",true,null));
    passage.quantities.push(
      quantity("q1","1さつ"+notePrice+"円",notePrice,"円","note","ノート1さつのねだん",false,"out_of_scope",["さつ","円"]),
      quantity("q2","1本"+pencilPrice+"円",pencilPrice,"円","pencil","えんぴつ1本のねだん",true,null,["本","円"]),
      quantity("q3",hour+"時",hour,"時","open","店が開く時こく",false,"time_stamp"),
      quantity("q4",money+"円",money,"円","money","はじめに出したお金",true,null));
    passage.q9Spec={owner:"ゆうさん",memo:"えんぴつは1さつ"+notePrice+"円だから",errorType:"role_swap",
      memoUnits:["円"],others:["number_mixup","unit_mixed"]};
    passage.q10Spec=complete
      ?{solvable:true,wrongNames:["買った本数","えんぴつ1本のねだん","出したお金"]}
      :{solvable:false,missingName:"買った本数",wrongNames:["えんぴつ1本のねだん","出したお金"]};
    passage.q1Spec={center:"おつり",correct:"はらったあとに返ってくるお金",
      withCenter:"おつりをふくめた代金",others:["えんぴつ1本のねだん","はじめに出したお金"]};
    return finalizePassage(passage);
  }
  function lv9Buses(random,complete){
    var busCount=pick([3,5],random),children=pick([35,37],random),teachers=pick([4,6],random),cap=pick([40,45],random);
    var passage=passageShell(complete?"js9_buses_full":"js9_buses",9,"trip","divide",[]);
    passage.sentences=["遠足の話です。","となりの学校のバスは"+busCount+"台です。",
      "子どもが"+children+"人、先生が"+teachers+"人乗ります。","出発は8時20分です。",
      complete?"バスは1台に"+cap+"人まで乗れます。":"バスは大きな青いバスです。"];
    passage.ask="バスは何台いりますか。";passage.askUnit="台";passage.askLimiter="となりの学校";
    passage.quantities=[
      quantity("q1",busCount+"台",busCount,"台","neighbor_bus","となりの学校のバスの台数",false,"out_of_scope"),
      quantity("q2",children+"人",children,"人","children","乗る子どもの人数",true,null),
      quantity("q3",teachers+"人",teachers,"人","teachers","乗る先生の人数",true,null),
      quantity("q4","8時20分",500,"時分","depart","出発の時こく",false,"time_stamp")];
    if(complete)passage.quantities.push(quantity("q5",cap+"人",cap,"人","capacity","バス1台に乗れる人数",true,null,["台","人"]));
    passage.q10Spec=complete
      ?{solvable:true,wrongNames:["バスの台数","1台に乗れる人数","帰る時こく"]}
      :{solvable:false,missingName:"1台に乗れる人数",wrongNames:["子どもの人数","出発の時こく"]};
    return finalizePassage(passage);
  }
  function buildLv9(random){
    var pencilsComplete=randomValue(random)<0.5;
    var pencils=lv9Pencils(random,pencilsComplete),buses=lv9Buses(random,!pencilsComplete);
    var full=pencilsComplete?pencils:buses;
    return finalizeSet(9,[
      makeQ10(9,pencils,pencils.q10Spec,random),
      makeQ9(9,pencils,pencils.q9Spec,random),
      makeQ1(9,pencils,pencils.q1Spec,random),
      makeQ10(9,buses,buses.q10Spec,random),
      makeQ5(9,full)]);
  }

  /* ---- Lv10: 混合 (表提示 + 全軸) ---- */
  function lv10Sweets(random){
    var gum=pick([60,70],random),candy=pick([40,50],random),choco=pick([80,90],random);
    var hour=10,gumCount=3,chocoCount=2;
    var passage=passageShell("js10_sweets",10,"shopping","combine_exclude",[]);
    passage.sentences=["おかしを買います。","ねだんは表のとおりです。",
      "表: ガム "+gum+"円 / あめ "+candy+"円 / チョコ "+choco+"円。",
      "店は"+hour+"時に開きます。","ガムを"+gumCount+"ことチョコを"+chocoCount+"こ買います。",
      "ただし、チョコは今日はんがくです。"];
    passage.ask="はらうお金は何円ですか。";passage.askUnit="円";passage.askLimiter="ガム";
    passage.exception=true;passage.tableSentenceIndex=2;
    passage.quantities=[
      quantity("q1",gum+"円",gum,"円","gum_price","ガム1このねだん",true,null),
      quantity("q2",candy+"円",candy,"円","candy_price","あめ1このねだん",false,"out_of_scope"),
      quantity("q3",choco+"円",choco,"円","choco_price","チョコ1このねだん",true,null),
      quantity("q4",hour+"時",hour,"時","open","店が開く時こく",false,"time_stamp"),
      quantity("q5",gumCount+"こ",gumCount,"こ","gum_count","買うガムの数",true,null),
      quantity("q6",chocoCount+"こ",chocoCount,"こ","choco_count","買うチョコの数",true,null)];
    passage.q9Spec={owner:"ゆうさん",memo:candy+"円と"+gumCount+"こをかける",errorType:"number_mixup",
      memoUnits:["円","こ"],memoAskUnit:"円",others:["exception_ignored","role_swap"]};
    return finalizePassage(passage);
  }
  function lv10Saturday(random,solvable){
    for(var attempt=0;attempt<50;attempt++){
      var pair=pick(PARAPHRASE_PAIRS,random),play=pick([35,40],random),outHour=9;
      var younger=pick([25,26],random),walk=pick([10,20],random),bakery=12;
      var fixed=[play,outHour,younger,walk];
      if(solvable)fixed.push(bakery);
      if(!tokensDisjoint(pair,fixed))continue;
      if(play===younger||play===walk||younger===walk)continue;
      var passage=passageShell(solvable?"js10_saturday_full":"js10_saturday",10,"trip","combine",["まさと"]);
      passage.sentences=["まさとさんの土曜日です。","公園で"+play+"分遊んだのは、パン屋でパンを買ったあとです。",
        "午前"+outHour+"時に家を出ました。","本を読んでいた時間は"+pair.main+"、つまり"+pair.alt+"です。",
        "弟は公園で"+younger+"分遊びました。",
        "図書館に着いたのは、家を出てから"+walk+"分後で、そこで本を読みました。",
        "図書館を出てから、パン屋に行きました。"];
      if(solvable)passage.sentences.push("パン屋には"+bakery+"分いました。");
      passage.ask="家を出てから公園を出るまでは何分ですか。";passage.askUnit="分";passage.askLimiter="まさとさん";
      passage.eventOrderShuffled=true;
      passage.quantities=[
        quantity("p1",play+"分",play,"分","play","公園で遊んだ時間",true,null),
        quantity("p2",outHour+"時",outHour,"時","out","家を出た時こく",false,"time_stamp"),
        quantity("p3",pair.main,pair.value,"時間分","reading","本を読んでいた時間",true,null),
        quantity("p4",pair.alt,pair.value,"分","reading_alt","読書にかかった時間",true,null),
        quantity("p5",younger+"分",younger,"分","younger","弟が公園で遊んだ時間",false,"out_of_scope"),
        quantity("p6",walk+"分",walk,"分","walk","家を出てから図書館に着くまでの時間",true,null)];
      if(solvable)passage.quantities.push(quantity("p7",bakery+"分",bakery,"分","bakery","パン屋にいた時間",true,null));
      passage.paraphrasePairs=[["p3","p4"]];
      passage.events=[{text:"家を出る",orderKey:1},{text:"図書館に着く",orderKey:2},
        {text:"本を読む",orderKey:3},{text:"パンを買う",orderKey:4},{text:"公園で遊ぶ",orderKey:5}];
      passage.q10Spec=solvable
        ?{solvable:true,wrongNames:["パン屋にいた時間","家を出た時こく","読書にかかった時間"]}
        :{solvable:false,missingName:"パン屋にいた時間",wrongNames:["家を出た時こく","読書にかかった時間"]};
      return finalizePassage(passage);
    }
    throw new Error("言い換えの組を作れません");
  }
  function buildLv10(random){
    var sweets=lv10Sweets(random),saturday=lv10Saturday(random,randomValue(random)<0.4);
    return finalizeSet(10,[
      makeQ5(10,sweets),
      makeQ9(10,sweets,sweets.q9Spec,random),
      makeQ4(10,sweets,"q6",[
        {text:"買うガムの数",unit:"こ",origin:"in_text"},
        {text:"チョコ1このねだん",unit:"円",origin:"in_text"},
        {text:"おまけでもらう数",unit:"こ",origin:"not_written"}],random),
      makeQ8(10,saturday,random),
      makeQ10(10,saturday,saturday.q10Spec,random)]);
  }

  var BUILDERS={1:buildLv1,2:buildLv2,3:buildLv3,4:buildLv4,5:buildLv5,
    6:buildLv6,7:buildLv7,8:buildLv8,9:buildLv9,10:buildLv10};

  function buildSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    return BUILDERS[lv](random);
  }

  function normalizedIndexes(values,length){
    if(!Array.isArray(values))return null;
    var seen={},result=[];
    for(var i=0;i<values.length;i++){
      var value=values[i];
      if(!isInteger(value)||value<0||value>=length||seen[value])return null;
      seen[value]=true;result.push(value);
    }
    return result.sort(function(a,b){return a-b;});
  }

  function judge(question,answer){
    if(!isObject(question)||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="choice"){
      if(!Array.isArray(question.choices)||!isInteger(question.ans))throw new Error("選択問題の指定が正しくありません");
      return isInteger(answer)&&answer===question.ans;
    }
    if(question.kind==="find_all"){
      if(!Array.isArray(question.choices)||!Array.isArray(question.ans))throw new Error("複数選択問題の指定が正しくありません");
      var expected=normalizedIndexes(question.ans,question.choices.length);
      var actual=normalizedIndexes(answer,question.choices.length);
      if(!expected||!actual)return false;
      return expected.length===actual.length&&expected.every(function(value,index){return value===actual[index];});
    }
    if(question.kind==="order"){
      if(!Array.isArray(question.parts)||!Array.isArray(question.ans))throw new Error("整列問題の指定が正しくありません");
      if(!Array.isArray(answer)||answer.length!==question.ans.length)return false;
      return question.ans.every(function(value,index){return answer[index]===value;});
    }
    if(question.kind==="num"||question.kind==="num_unit"){
      var numeric=typeof answer==="number"?answer:Number(String(answer).replace(/^\s+|\s+$/g,""));
      return isFinite(numeric)&&numeric===question.ans;
    }
    throw new Error("問題形式の指定が正しくありません");
  }

  function unitLabel(unitId){
    if(typeof unitId!=="string"||!unitId)throw new Error("単位の指定が正しくありません");
    return unitId;
  }

  function judgeNumUnit(question,value,unitId){
    if(!isObject(question)||question.kind!=="num_unit"||typeof question.ansUnit!=="string"||!Array.isArray(question.unitChoices))throw new Error("数値と単位の問題指定が正しくありません");
    if(question.unitChoices.indexOf(unitId)<0)throw new Error("答えの単位が正しくありません");
    var numeric=typeof value==="number"?value:Number(String(value).replace(/^\s+|\s+$/g,""));
    if(!isFinite(numeric))return {correct:false,state:"wrong",note:""};
    if(numeric===question.ans&&unitId===question.ansUnit)return {correct:true,state:"correct",note:""};
    if(numeric===question.ans)return {correct:false,state:"unit_wrong",note:"数は合っているけれど、書いてあるとおりの単位は "+question.ansUnit};
    return {correct:false,state:"wrong",note:""};
  }

  global.Q4B_KOMOREBI_JOHOU_SEIRI={
    config:CONFIG,
    questionMix:QUESTION_MIX,
    passageCounts:PASSAGE_COUNTS,
    diagnosisLabels:DIAGNOSIS_LABELS,
    solvableLabel:SOLVABLE_LABEL,
    unitSystems:UNIT_SYSTEMS,
    waza:WAZA,
    paraphrasePairs:PARAPHRASE_PAIRS,
    extrasPositionOk:extrasPositionOk,
    unitKindsOf:unitKindsOf,
    isBlocked:isBlocked,
    buildSet:buildSet,
    judge:judge,
    judgeNumUnit:judgeNumUnit,
    unitLabel:unitLabel
  };
})(window);
