"use strict";

/* DOM や音声 API を使わず、段暗唱エンジンの順序と時間の契約だけを検証する。 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"shared/kuku_phrases.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/kuku_dan2.js"),"utf8"),context);

var kuku=context.Q4B_KOMOREBI_KUKU_DAN2;
var phrases=context.Q4B_KUKU_PHRASES;
var passed=0;

function test(name,fn){fn();passed++;console.log("PASS",name);}
function values(array){return Array.prototype.slice.call(array);}
function plain(value){return JSON.parse(JSON.stringify(value));}
function sequence(valuesToReturn){
  var index=0;
  return function(){var value=valuesToReturn[index%valuesToReturn.length];index++;return value;};
}

test("levelPlan matches all ten tempo levels",function(){
  var expected=[
    [1,3,"read",12],[2,3,"read",10],[3,3,"recall",8],[4,3,"recall",6],
    [5,5,"read",15],[6,5,"read",13],[7,5,"recall",12],[8,5,"recall",10],
    [9,9,"recall",25],[10,9,"recall",13]
  ];
  var previous=null;
  expected.forEach(function(row){
    var plan=kuku.levelPlan(row[0]);
    assert.deepEqual(plain(plan),{lv:row[0],chunkLength:row[1],display:row[2],seconds:row[3]});
    if(previous){
      assert.equal(plan.chunkLength>=previous.chunkLength,true);
      if(plan.chunkLength===previous.chunkLength)assert.equal(plan.seconds<previous.seconds,true);
    }
    previous=plan;
  });
});

test("chunkVariants preserves the three fixed chunk layouts",function(){
  assert.deepEqual(plain(kuku.chunkVariants(1)),[[1,2,3],[4,5,6],[7,8,9]]);
  assert.deepEqual(plain(kuku.chunkVariants(5)),[[1,2,3,4,5],[5,6,7,8,9]]);
  assert.deepEqual(plain(kuku.chunkVariants(9)),[[1,2,3,4,5,6,7,8,9]]);
  assert.equal(kuku.chunkVariants(5)[0][4],5);
  assert.equal(kuku.chunkVariants(5)[1][0],5);
});

test("buildSet returns five chunks without adjacent duplicate variants",function(){
  [1,5].forEach(function(lv){
    var set=kuku.buildSet(2,lv,sequence([0.7]));
    assert.equal(set.length,5);
    for(var index=1;index<set.length;index++)assert.notEqual(set[index].variantIndex,set[index-1].variantIndex);
  });
  var full=kuku.buildSet(2,9,sequence([0.4]));
  assert.equal(full.length,5);
  full.forEach(function(chunk){assert.equal(chunk.variantIndex,0);assert.equal(chunk.phrases.length,9);});
});

test("buildChunk uses the shared canonical phrases",function(){
  for(var dan=1;dan<=9;dan++){
    var chunk=kuku.buildChunk(dan,5,1);
    chunk.phrases.forEach(function(phrase){
      assert.equal(phrase.ans,dan*phrase.b);
      assert.equal(phrase.phrase,phrases.phrase(dan,phrase.b));
    });
    assert.equal(chunk.cat,"kom_kuku_dan2");
    assert.equal(chunk.format,"voice");
    assert.equal(chunk.kind,"voice");
  }
});

test("judgeTranscript distinguishes all five recognition states",function(){
  var chunk=kuku.buildChunk(2,1,0);
  assert.equal(kuku.judgeTranscript(chunk,"にいちがにににんがしにさんがろく").state,"correct_phrase");
  assert.equal(kuku.judgeTranscript(chunk,"2かける1は2 2かける2は4 2かける3は6").state,"correct_phrase");
  assert.equal(kuku.judgeTranscript(chunk,"2 4 6").state,"answer_only");
  assert.equal(kuku.judgeTranscript(chunk,"2かける1 2かける2 2かける3").state,"stem_only");
  assert.equal(kuku.judgeTranscript(chunk,"3かける1は3 3かける2は6 3かける3は9").state,"wrong_phrase");
  assert.equal(kuku.judgeTranscript(chunk,"").state,"recognition_failure");
  assert.equal(kuku.judgeTranscript(chunk,"！？、。---").state,"recognition_failure");
});

test("number extraction keeps kanji and kana compounds in order",function(){
  var shortChunk=kuku.buildChunk(2,1,0);
  assert.equal(kuku.judgeTranscript(shortChunk,"二かける一は二 二かける二は四 二かける三は六").state,"correct_phrase");
  var longChunk=kuku.buildChunk(2,5,1);
  assert.equal(kuku.judgeTranscript(longChunk,"じゅう じゅうに じゅうし じゅうろく じゅうはち").state,"answer_only");
});

test("transcript aliases and guided matching recover common Chrome readings",function(){
  assert.equal(kuku.transcriptAliases["人"],"にん");
  var shortChunk=kuku.buildChunk(2,1,0);
  assert.equal(kuku.judgeTranscript(shortChunk,"2いちが2 2人が4 2さんが6").state,"correct_phrase");
  var longChunk=kuku.buildChunk(2,5,0);
  assert.equal(kuku.judgeTranscript(longChunk,"にいちがに ににんがし にさんがろく にしがはち 2ごじゅう").state,"correct_phrase");
  assert.equal(kuku.judgeTranscript(shortChunk,"").state,"recognition_failure");
});

test("a missing phrase reports its first missing index",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeTranscript(chunk,"にいちがに にさんがろく");
  assert.notEqual(result.state,"correct_phrase");
  assert.equal(result.matched,1);
  assert.equal(result.missing,1);
});

test("phrase order cannot be rearranged",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeTranscript(chunk,"ににんがし にいちがに にさんがろく");
  assert.notEqual(result.state,"correct_phrase");
});

test("judgeTiming includes the exact limit and excludes one millisecond over",function(){
  var chunk=kuku.buildChunk(2,3,0);
  assert.deepEqual(plain(kuku.judgeTiming(chunk,8000)),{inTime:true,limitMs:8000});
  assert.deepEqual(plain(kuku.judgeTiming(chunk,8001)),{inTime:false,limitMs:8000});
});

test("judgeChunk marks a correct phrase over time as counted timeout",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeChunk(chunk,"にいちがにににんがしにさんがろく",12001);
  assert.equal(result.state,"correct_phrase");
  assert.equal(result.correct,false);
  assert.equal(result.timedOut,true);
  assert.equal(result.counted,true);
  assert.equal(result.inTime,false);
});

test("recognition failure is not counted",function(){
  var chunk=kuku.buildChunk(2,1,0);
  assert.deepEqual(plain(kuku.judgeChunk(chunk,"。！？",1000)),{
    state:"recognition_failure",correct:false,counted:false,inTime:null
  });
});

test("the exact iPhone transcript of the 2-dan chunk judges as a correct phrase",function(){
  /* 実機 (iPhone) の実転写。にいちがに→ニーチが2、ににんがし→2人が4 / 2人が死に、
     にさんがろく→23が6。カタカナ畳み + 長音展開 + 死→し で数列照合が通ること。 */
  var chunk=kuku.buildChunk(2,1,0);
  var real="ニーチが22人が423が6ニーチが22人が死に3が6ニーチが22人が23が6";
  var result=kuku.judgeChunk(chunk,real,5000);
  assert.equal(result.state,"correct_phrase");
  assert.equal(result.correct,true);
});

test("an all-katakana recitation folds to hiragana and matches the canonical phrase",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeChunk(chunk,"ニイチガニ ニニンガシ ニサンガロク",5000);
  assert.equal(result.state,"correct_phrase");
  assert.equal(result.correct,true);
});

test("the engine never reads the current clock",function(){
  var source=fs.readFileSync(path.join(root,"komorebi/kuku_dan2.js"),"utf8");
  assert.equal(/Date\s*\.\s*now/.test(source),false);
});

test("buildSet works for every table and every level",function(){
  for(var dan=1;dan<=9;dan++){
    for(var lv=1;lv<=10;lv++){
      var set=kuku.buildSet(dan,lv,sequence([((dan*10+lv)%97)/97]));
      assert.equal(set.length,5);
      set.forEach(function(chunk){assert.equal(chunk.dan,dan);assert.equal(chunk.lv,lv);});
    }
  }
});

/* ---- タップ暗唱 ---- */

function mulberry32(seed){
  var state=seed>>>0;
  return function(){
    state=(state+0x6D2B79F5)>>>0;
    var t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

test("buildTapSteps splits every phrase of every table and level into stem plus answer reading",function(){
  for(var dan=1;dan<=9;dan++){
    for(var lv=1;lv<=10;lv++){
      var variants=kuku.chunkVariants(lv);
      for(var variantIndex=0;variantIndex<variants.length;variantIndex++){
        var chunk=kuku.buildChunk(dan,lv,variantIndex);
        var steps=kuku.buildTapSteps(chunk,mulberry32(dan*100+lv*10+variantIndex));
        assert.equal(steps.length,chunk.phrases.length);
        steps.forEach(function(step,index){
          var phrase=chunk.phrases[index];
          assert.equal(step.b,phrase.b);
          assert.equal(step.ans,phrase.ans);
          assert.equal(step.stemKana.length>0,true);
          assert.equal(step.ansKana.length>0,true);
          assert.equal(step.stemKana+step.ansKana,phrase.phrase);
          assert.equal(step.choices.length,4);
          assert.equal(step.choices.indexOf(step.ans)>=0,true);
          assert.equal(new Set(step.choices).size,4);
          step.choices.forEach(function(choice){
            assert.equal(Number.isInteger(choice)&&choice>0,true);
          });
        });
      }
    }
  }
});

test("buildTapSteps takes the longest answer reading so no digit kana leaks into the stem",function(){
  var expected=[
    [2,1,0,0,"にいちが","に"],
    [2,5,1,0,"にご","じゅう"],
    [3,1,0,2,"さざんが","く"],
    [3,5,1,1,"さぶろく","じゅうはち"],
    [5,5,0,0,"ごいちが","ご"],
    [5,9,0,3,"ごし","にじゅう"],
    [8,9,0,7,"はっぱ","ろくじゅうし"],
    [9,9,0,8,"くく","はちじゅういち"]
  ];
  expected.forEach(function(row){
    var steps=kuku.buildTapSteps(kuku.buildChunk(row[0],row[1],row[2]),mulberry32(7));
    assert.equal(steps[row[3]].stemKana,row[4]);
    assert.equal(steps[row[3]].ansKana,row[5]);
  });
});

test("tap choices put the correct answer in each position with uniform frequency",function(){
  var chunk=kuku.buildChunk(2,1,0),counts=[0,0,0,0],runs=200;
  var random=mulberry32(20260815);
  for(var run=0;run<runs;run++){
    var steps=kuku.buildTapSteps(chunk,random);
    counts[steps[0].choices.indexOf(steps[0].ans)]++;
  }
  counts.forEach(function(count){
    assert.equal(count>=runs*0.15,true,"position below 15%: "+counts.join(","));
    assert.equal(count<=runs*0.35,true,"position above 35%: "+counts.join(","));
  });
});

test("judgeTapChunk accepts a full correct recitation in time",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeTapChunk(chunk,[2,4,6],5000);
  assert.equal(result.state,"correct_phrase");
  assert.equal(result.correct,true);
  assert.equal(result.counted,true);
  assert.equal(result.inTime,true);
  assert.equal(result.matched,3);
  assert.equal(result.missing,-1);
  assert.deepEqual(plain(result.wrongIndexes),[]);
  assert.equal(result.timedOut,undefined);
});

test("judgeTapChunk flags a wrong tap with its phrase index",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeTapChunk(chunk,[2,8,6],5000);
  assert.equal(result.state,"wrong_tap");
  assert.equal(result.correct,false);
  assert.equal(result.counted,true);
  assert.equal(result.matched,2);
  assert.equal(result.missing,1);
  assert.deepEqual(plain(result.wrongIndexes),[1]);
});

test("judgeTapChunk counts a correct recitation over time as timeout like the voice path",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeTapChunk(chunk,[2,4,6],12001);
  assert.equal(result.state,"correct_phrase");
  assert.equal(result.correct,false);
  assert.equal(result.counted,true);
  assert.equal(result.inTime,false);
  assert.equal(result.timedOut,true);
  assert.deepEqual(plain(result.wrongIndexes),[]);
});

test("judgeTapChunk counts an unfinished recitation and lists unanswered indexes",function(){
  var chunk=kuku.buildChunk(2,1,0);
  var result=kuku.judgeTapChunk(chunk,[2],5000);
  assert.equal(result.state,"wrong_tap");
  assert.equal(result.correct,false);
  assert.equal(result.counted,true);
  assert.equal(result.matched,1);
  assert.equal(result.missing,1);
  assert.deepEqual(plain(result.wrongIndexes),[1,2]);
  var empty=kuku.judgeTapChunk(chunk,[],5000);
  assert.equal(empty.counted,true);
  assert.deepEqual(plain(empty.wrongIndexes),[0,1,2]);
});

test("tap engine rejects malformed answers and random sources in Japanese",function(){
  var chunk=kuku.buildChunk(2,1,0);
  assert.throws(function(){kuku.judgeTapChunk(chunk,"246",5000);},/回答の指定/);
  assert.throws(function(){kuku.judgeTapChunk(chunk,[2,4,6,8],5000);},/回答の指定/);
  assert.throws(function(){kuku.judgeTapChunk(chunk,[2,"4"],5000);},/回答の指定/);
  assert.throws(function(){kuku.judgeTapChunk(chunk,[2,4,6],-1);},/回答時間の指定/);
  assert.throws(function(){kuku.buildTapSteps(chunk,null);},/乱数の指定/);
  assert.throws(function(){kuku.buildTapSteps({dan:2,phrases:[]},mulberry32(1));},/チャンク問題の指定/);
});

test("the engine never draws its own randomness",function(){
  var source=fs.readFileSync(path.join(root,"komorebi/kuku_dan2.js"),"utf8");
  assert.equal(/Math\s*\.\s*random/.test(source),false);
});

console.log("RESULT "+passed+" passed, 0 failed");
