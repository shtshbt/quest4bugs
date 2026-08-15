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

console.log("RESULT "+passed+" passed, 0 failed");
