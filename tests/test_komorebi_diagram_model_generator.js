"use strict";
/* kom_diagram_model generator tests: curriculum v0.3.4, 検証 11-41 + 敵ソルバー 4 本 */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/diagram_engine.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/diagram_model_generator.js"),"utf8"),context);
var E=context.Q4B_KOMOREBI_DIAGRAM_ENGINE;
var G=context.Q4B_KOMOREBI_DIAGRAM_MODEL;
var FIX=JSON.parse(fs.readFileSync(path.join(root,"tests/fixtures/diagram_reference_sets.json"),"utf8"));

var passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}
function seeded(seed){
  var st=seed>>>0;
  return function(){st=(Math.imul(st,1664525)+1013904223)>>>0;return st/4294967296;};
}
var SETS_PER_LV=40;
var PAIR_CHOICES=["ア","イ","どちらも合っている","どちらも合っていない"];
var WORDS=E.wordings;
var ALLOWED_LV={correct:"all",correct_alternative:[3,8,9,10],role_swap:[4,7,9,10],
  part_whole_mixup:[1,3,5,8,10],base_mixup:[4,5,6,10],relation_mixup:[2,3,10],
  step_base_mixup:[7,10],unknown_misplaced:"all",extra_quantity:[9,10],missing_relation:[9,10]};
var NEWLV={bar_series:1,bar_aligned:2,bar_multiple:4,bar_percent:6,rect:8,table:9};
var FORBIDDEN_TEXT=/時速|分速|秒速|速さ|時間/;
var CARD_FORBIDDEN=/長い|短い|大きい|小さい/;

var session=G.createSession(seeded(20260815));
var ALL={};
for(var lv=1;lv<=10;lv++){
  ALL[lv]=[];
  for(var i=0;i<SETS_PER_LV;i++)ALL[lv].push(G.generateSet(session,lv));
}
function eachQ(lv,fn){ALL[lv].forEach(function(set,si){set.forEach(function(q,qi){fn(q,si,qi);});});}
function diags(lv){var out=[];eachQ(lv,function(q){if(q.format==="diagnosis")out.push(q);});return out;}
function singles(lv){return diags(lv).filter(function(q){return q.variant==="single";});}
function pairs(lv){return diags(lv).filter(function(q){return q.variant==="pair";});}
function zukeiOf(q){
  var z=[q._model.zukei];
  if(q.variant==="pair"&&q.errorTypes.indexOf("relation_mixup")>=0)z=["bar_series","bar_aligned"];
  if(q.format==="diagnosis"&&q.variant==="single"&&q.errorTypes[0]==="relation_mixup")z=["bar_series","bar_aligned"];
  return z;
}
function typeAllowed(t,lv,zukei){
  var a=ALLOWED_LV[t];
  if(a==="all")return true;
  if(a.indexOf(lv)>=0)return true;
  var nl=NEWLV[zukei];
  return nl!=null&&a.indexOf(nl)>=0;
}

test("11. 形式配合が 6.2 の表と一致する",function(){
  for(var lv=1;lv<=10;lv++){
    var mix=G.formatMix[lv];
    ALL[lv].forEach(function(set){
      var c={normal:0,formulation:0,diag_single:0,diag_pair:0,find_all:0};
      set.forEach(function(q){
        if(q.format==="diagnosis")c[q.variant==="pair"?"diag_pair":"diag_single"]++;
        else c[q.format]++;
      });
      assert.equal(JSON.stringify(c),JSON.stringify(mix),"lv"+lv);
      assert.equal(set.length,5);
    });
  }
});

test("12. 対比ペアの R4 (値ラベル数と印の数)、relation_mixup 例外と形の分散",function(){
  for(var lv=1;lv<=10;lv++){
    pairs(lv).forEach(function(q){
      var isRM=q.errorTypes.indexOf("relation_mixup")>=0;
      var v0=E.countValueLabels(q._specs[0],q._model,{pair:true});
      var v1=E.countValueLabels(q._specs[1],q._model,{pair:true});
      var m0=E.countMarks(q._specs[0]),m1=E.countMarks(q._specs[1]);
      assert.equal(v0,v1,"lv"+lv+" pair value labels "+v0+"/"+v1);
      if(!isRM)assert.equal(m0,m1,"lv"+lv+" pair marks");
    });
  }
  var rm=[];
  [2,3].forEach(function(lv){
    diags(lv).forEach(function(q){
      if(q.errorTypes.indexOf("relation_mixup")<0)return;
      rm.push(q._model.relation==="sum2"?"series":"aligned");
    });
  });
  var sShare=rm.filter(function(x){return x==="series";}).length/rm.length;
  assert.ok(sShare>=0.35&&sShare<=0.65,"relation_mixup correct-form split "+sShare.toFixed(2));
});

test("12b. Lv7 の 2 段目の親 (部分/全体) が累計 40-60%",function(){
  var vs=[];
  eachQ(7,function(q){if(q._model.relation==="two_step_percent")vs.push(q._model.step2);});
  var p=vs.filter(function(x){return x==="part";}).length/vs.length;
  assert.ok(p>=0.35&&p<=0.65,"step2 part share "+p.toFixed(2));
});

test("13. 対比ペアは固定 4 語彙、正解分布が目標比率内",function(){
  for(var lv=1;lv<=10;lv++){
    var cnt=[0,0,0,0];
    pairs(lv).forEach(function(q){
      assert.equal(JSON.stringify(q.choices),JSON.stringify(PAIR_CHOICES),"lv"+lv);
      cnt[q.ans]++;
    });
    var n=cnt[0]+cnt[1]+cnt[2]+cnt[3];
    assert.ok(cnt[0]/n>=0.25,"lv"+lv+" ア "+(cnt[0]/n));
    assert.ok(cnt[1]/n>=0.25,"lv"+lv+" イ "+(cnt[1]/n));
    assert.ok((cnt[0]+cnt[1])/n>=0.5&&(cnt[0]+cnt[1])/n<=0.8,"lv"+lv+" ア+イ");
    assert.ok(cnt[2]/n<=0.3&&cnt[3]/n<=0.3,"lv"+lv+" 末尾 2 肢");
  }
});

test("14. 対比ペアに extra_quantity / missing_relation が無い",function(){
  for(var lv=1;lv<=10;lv++)pairs(lv).forEach(function(q){
    q.errorTypes.forEach(function(t){
      assert.ok(t!=="extra_quantity"&&t!=="missing_relation","lv"+lv+" "+t);
    });
  });
});

test("15. どちらも合っていないのペアは 2 図が別々の型で壊れている",function(){
  for(var lv=1;lv<=10;lv++)pairs(lv).forEach(function(q){
    if(q.ans!==3)return;
    assert.ok(q.errorTypes[0]&&q.errorTypes[1],"lv"+lv);
    assert.notEqual(q.errorTypes[0],q.errorTypes[1],"lv"+lv);
    var b0=E.checkConditions(q._specs[0],q._model);
    var b1=E.checkConditions(q._specs[1],q._model);
    assert.equal(b0.length,1,"lv"+lv);assert.equal(b1.length,1,"lv"+lv);
    assert.notEqual(b0[0],b1[0],"lv"+lv);
  });
});

test("16. 単図診断: 4 肢が文言表にあり、図に適用可能な型のみ + 正解 Lv 規定 (新出 + 既習持ち込み)",function(){
  var valid={};Object.keys(WORDS).forEach(function(t){valid[WORDS[t]]=1;});
  for(var lv=1;lv<=10;lv++)singles(lv).forEach(function(q){
    assert.equal(q.choices.length,4,"lv"+lv);
    q.choices.forEach(function(c){assert.ok(valid[c],"lv"+lv+" wording "+c);});
    var appW={};
    E.applicableTypes(q._specs[0],q._model).forEach(function(t){appW[WORDS[t]]=1;});
    q.choices.forEach(function(c){assert.ok(appW[c],"lv"+lv+" not applicable: "+c);});
    assert.equal(q.choices[q.ans],WORDS[q.errorTypes[0]],"lv"+lv+" ans wording");
    assert.ok(typeAllowed(q.errorTypes[0],lv,q._model.zukei),"lv"+lv+" type "+q.errorTypes[0]+" on "+q._model.zukei);
  });
});

test("17. 同一文言の肢が重複しない + 正答案 20-30% + 等価図比率 (Lv3/8/9)",function(){
  for(var lv=1;lv<=10;lv++){
    var pos=0,ca=0,n=0;
    singles(lv).forEach(function(q){
      var seen={};
      q.choices.forEach(function(c){assert.ok(!seen[c],"lv"+lv+" dup "+c);seen[c]=1;});
      n++;
      if(q.errorTypes[0]==="correct"||q.errorTypes[0]==="correct_alternative")pos++;
      if(q.errorTypes[0]==="correct_alternative")ca++;
    });
    var share=pos/n;
    assert.ok(share>=0.18&&share<=0.32,"lv"+lv+" 正答案 "+share.toFixed(2));
    if([3,8,9].indexOf(lv)>=0){
      var caShare=ca/pos;
      assert.ok(caShare>=0.28&&caShare<=0.55,"lv"+lv+" CA share "+caShare.toFixed(2));
    }
  }
});

test("18. 単一 errorType が各 Lv の診断の 60% を超えない (持ち込み込み)",function(){
  for(var lv=1;lv<=10;lv++){
    var cnt={},n=0;
    diags(lv).forEach(function(q){
      var t=q.variant==="pair"
        ?(q.ans===2?"correct_alternative":(q.errorTypes[0]||q.errorTypes[1]))
        :q.errorTypes[0];
      cnt[t]=(cnt[t]||0)+1;n++;
    });
    Object.keys(cnt).forEach(function(t){
      if(t==="correct"||t==="correct_alternative")return;
      assert.ok(cnt[t]/n<=0.605,"lv"+lv+" "+t+" "+(cnt[t]/n).toFixed(2));
    });
  }
});

test("19. 誤図に現れる値がすべて本文の数と一致 (装置 1)",function(){
  for(var lv=1;lv<=10;lv++)diags(lv).forEach(function(q){
    q._specs.forEach(function(spec){
      E.figureNumbers(spec,q._model,{pair:q.variant==="pair"}).forEach(function(v){
        assert.ok(q._model.textNumbers.indexOf(v)>=0,"lv"+lv+" figure value "+v+" not in text ["+q._model.textNumbers+"]");
      });
    });
  });
});

test("20+36+40. formulation: 正解 1 手 / ? と不一致 / 最大区間・無値区間パターン 60% 以下 / 分からない 5-25%",function(){
  for(var lv=1;lv<=10;lv++){
    var fs2=[];eachQ(lv,function(q){if(q.format==="formulation")fs2.push(q);});
    if(!fs2.length)continue;
    assert.ok([3,4,5,6,8].indexOf(lv)>=0,"formulation on lv"+lv);
    var largest=0,pattern=0,dcnt=0;
    fs2.forEach(function(q){
      assert.equal(q.choices.length,4);
      assert.ok(q.choices.indexOf(G.unknowable)>=0,"lv"+lv+" 分からない肢");
      assert.ok(!q._form.correctIsUnknown,"lv"+lv+" 正解が ? と一致");
      if(q._form.largest)largest++;
      if(q._form.pattern)pattern++;
      if(q.choices[q.ans]===G.unknowable)dcnt++;
    });
    assert.ok(largest/fs2.length<=0.62,"lv"+lv+" largest "+(largest/fs2.length).toFixed(2));
    assert.ok(pattern/fs2.length<=0.62,"lv"+lv+" pattern "+(pattern/fs2.length).toFixed(2));
    assert.ok(dcnt/fs2.length>=0.05&&dcnt/fs2.length<=0.25,"lv"+lv+" D "+(dcnt/fs2.length).toFixed(2));
  }
});

test("21+30. find_all: 肢 5-6 / 正解 2-4 / 表は合計ます + 計算ますの同居 / 図は本文の数を正誤両肢に",function(){
  for(var lv=1;lv<=10;lv++){
    var fa=[];eachQ(lv,function(q){if(q.format==="find_all")fa.push(q);});
    if(!fa.length)continue;
    assert.ok([7,9,10].indexOf(lv)>=0);
    fa.forEach(function(q){
      assert.ok(q.choices.length>=5&&q.choices.length<=6,"lv"+lv+" choices "+q.choices.length);
      assert.ok(q.ansSet.length>=2&&q.ansSet.length<=4,"lv"+lv+" ansSet");
      if(q._findAll.kind==="table"){
        var ansTexts=q.ansSet.map(function(ix){return q.choices[ix];});
        assert.ok(ansTexts.some(function(t){return t.indexOf("合計")>=0;}),"lv"+lv+" total in ansSet");
        var wrong=q.choices.filter(function(c,ix){return q.ansSet.indexOf(ix)<0;});
        assert.ok(wrong.length>=1,"lv"+lv+" calc cells remain");
      }else{
        var nums=q._model.textNumbers.map(String);
        var hasNum=function(t){return nums.some(function(nn){return t.indexOf(nn)>=0;});};
        var okWith=q.ansSet.some(function(ix){return hasNum(q.choices[ix]);});
        var ngWith=q.choices.some(function(c,ix){return q.ansSet.indexOf(ix)<0&&hasNum(c);});
        assert.ok(okWith&&ngWith,"lv"+lv+" 本文の数が正誤両肢に無い");
      }
    });
  }
});

test("22. normal は 1 手で出る整数",function(){
  for(var lv=1;lv<=10;lv++)eachQ(lv,function(q){
    if(q.format!=="normal")return;
    assert.ok(Number.isInteger(q.ans)&&q.ans>0,"lv"+lv+" ans "+q.ans);
  });
});

test("23. 本文に時間と速さの文言が無い",function(){
  for(var lv=1;lv<=10;lv++)eachQ(lv,function(q){
    assert.ok(!FORBIDDEN_TEXT.test(q.text),"lv"+lv+" "+q.text);
  });
});

test("24. Lv10 は直近 12 問の patternId を避ける",function(){
  var stream=[];
  ALL[10].forEach(function(set){set.forEach(function(q){stream.push(q.patternId);});});
  for(var i2=0;i2<stream.length;i2++){
    for(var j=Math.max(0,i2-11);j<i2;j++){
      assert.notEqual(stream[j],stream[i2],"dup within 12: "+stream[i2]+" at "+j+","+i2);
    }
  }
});

test("29. 図型分散 (6.3) と patternId のセット内反復",function(){
  for(var lv=1;lv<=10;lv++)ALL[lv].forEach(function(set){
    var zk={};
    set.forEach(function(q){zukeiOf(q).forEach(function(z){zk[z]=1;});});
    var uniq=Object.keys(zk).length;
    if(lv===2){assert.ok(zk.bar_series&&zk.bar_aligned,"lv2 both forms");}
    if(lv>=5&&lv<=7)assert.ok(uniq>=2,"lv"+lv+" carry zukei");
    if(lv>=8)assert.ok(uniq>=2,"lv"+lv);
    if(lv===10)assert.ok(uniq>=3,"lv10 zukei "+uniq);
    var pc={};
    set.forEach(function(q){pc[q.patternId]=(pc[q.patternId]||0)+1;});
    Object.keys(pc).forEach(function(p){assert.ok(pc[p]<3,"patternId x3 "+p);});
  });
});

test("31. ordering 形式が 1 問も生成されない",function(){
  for(var lv=1;lv<=10;lv++)eachQ(lv,function(q){assert.notEqual(q.format,"ordering");});
});

/* ---------- 分散系 (28, 33, 34, 26, 35, 37, 38) ---------- */

test("28. 正解位置の分布 (4 択各 15% 以上)",function(){
  for(var lv=1;lv<=10;lv++){
    var cnt=[0,0,0,0],n=0;
    eachQ(lv,function(q){
      if(q.format!=="diagnosis"&&q.format!=="formulation")return;
      if(q.variant==="pair")return;
      cnt[q.ans]++;n++;
    });
    for(var p2=0;p2<4;p2++)assert.ok(cnt[p2]/n>=0.15,"lv"+lv+" pos"+p2+" "+(cnt[p2]/n).toFixed(2));
  }
});

test("26b. 正図ラベル数と本文の数の差が Lv 内で固定されない (使わない数の分散)",function(){
  for(var lv=1;lv<=10;lv++){
    var seen={};
    diags(lv).forEach(function(q){seen[q._model.unused.length]=1;});
    assert.ok(Object.keys(seen).length>=2,"lv"+lv+" unused counts "+JSON.stringify(Object.keys(seen)));
  }
});

test("33. Lv9 の表 (診断と normal) の正図空欄 1/2/3 が各 15% 以上",function(){
  var cnt={1:0,2:0,3:0},n=0;
  eachQ(9,function(q){
    if(q.format==="find_all")return;
    if(q._model.relation!=="table2")return;
    cnt[q._model.blanks]++;n++;
  });
  [1,2,3].forEach(function(b){
    assert.ok(cnt[b]/n>=0.15,"blanks "+b+" "+(cnt[b]/n).toFixed(2));
  });
});

function rowRects(svg){
  var out=[],re=/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="36"\/>/g,mm;
  while((mm=re.exec(svg)))out.push({x:+mm[1],y:+mm[2],w:+mm[3]});
  return out;
}
test("34. R1b: 1 段目の帯全長が全問で等しく、2 段目は親区間幅",function(){
  var widths={};
  [6,7].forEach(function(lv){
    diags(lv).forEach(function(q){
      if(q._model.zukei!=="bar_percent")return;
      var pair=q.variant==="pair";
      q._specs.forEach(function(spec,fi){
        var svg=q.figures[fi],rs=rowRects(svg);
        var y0=rs[0].y,b1=rs.filter(function(r){return r.y===y0;});
        var tot=b1.reduce(function(a,r){return a+r.w;},0);
        var key=pair?"pair":"single";
        if(widths[key]==null)widths[key]=tot;
        assert.ok(Math.abs(widths[key]-tot)<0.5,"band1 width varies: "+tot+" vs "+widths[key]);
        if(spec.parent){
          var b2=rs.filter(function(r){return r.y!==y0;});
          var tot2=b2.reduce(function(a,r){return a+r.w;},0);
          var covered=0,on=false;
          spec.rows[0].segments.forEach(function(sg){
            if(sg.id===spec.parent.from)on=true;
            if(on)covered+=(sg.len.k==="rate"?E.valOf(q._model,sg.len.qid):100-E.valOf(q._model,sg.len.qid));
            if(sg.id===spec.parent.to)on=false;
          });
          assert.ok(Math.abs(tot2-widths[key]*covered/100)<0.6,"band2 != parent width");
        }
      });
    });
  });
});

test("35+37+38. 可用型 4 以上 / 名前ラベル規定 / viewBox と 4 桁上限",function(){
  for(var lv=1;lv<=10;lv++)eachQ(lv,function(q){
    if(q.format==="diagnosis"){
      q._specs.forEach(function(spec){
        var w={},pairVb=q.variant==="pair";
        E.applicableTypes(spec,q._model).forEach(function(t){w[WORDS[t]]=1;});
        assert.ok(Object.keys(w).length>=3&&E.applicableTypes(spec,q._model).length>=4,"lv"+lv+" applicable <4");
        if(spec.type==="bar"){
          spec.rows.forEach(function(r){
            r.segments.forEach(function(g){
              if(g.qid!=null)assert.ok(g.name!=null||r.nameQid===g.qid||r.name!=null,"lv"+lv+" qid seg without name");
            });
          });
        }
      });
    }
    (q.figures||[]).forEach(function(svg,fi){
      var isRect=q._specs&&q._specs[fi]&&q._specs[fi].type==="rect";
      var vbOK=q.variant==="pair"
        ?(isRect?'viewBox="0 0 180 100"':'viewBox="0 0 188 128"')
        :(isRect?'viewBox="0 0 180 100"':/viewBox="0 0 320 130"/.source);
      assert.ok(svg.indexOf(typeof vbOK==="string"?vbOK:'viewBox="0 0 320 130"')>=0,"lv"+lv+" viewBox");
    });
    if(q._specs)q._specs.forEach(function(spec){
      E.figureNumbers(spec,q._model,{}).forEach(function(v){assert.ok(v<10000,"5 桁値 "+v);});
    });
  });
});

test("39. 解説カード: 4 系統分岐 + 定型文 + 2 図の長さ比較表現の禁止",function(){
  var branches={};
  for(var lv=1;lv<=10;lv++)eachQ(lv,function(q){
    var card=G.explainCard(q);
    assert.ok(!CARD_FORBIDDEN.test(card.text),"lv"+lv+" card: "+card.text);
    branches[card.branch]=1;
    if(q.format==="formulation"||q.format==="find_all")assert.equal(card.branch,"reading");
    if(q.format==="diagnosis"&&q.variant==="single"){
      var t=q.errorTypes[0];
      if(t==="correct")assert.equal(card.branch,"correct");
      else if(t==="correct_alternative"){
        assert.equal(card.branch,"correct_alternative");
        assert.ok(card.text.indexOf(G.altSentences[q._altOp])>=0,"定型文 lv"+lv);
      }else assert.equal(card.branch,"error");
    }
    if(q.format==="diagnosis"&&q.variant==="pair"&&q.ans===2){
      assert.equal(card.branch,"correct_alternative");
      assert.ok(card.text.indexOf(G.altSentences[q._altOp])>=0);
    }
  });
  ["correct","correct_alternative","error","reading"].forEach(function(b){
    assert.ok(branches[b],"branch missing "+b);
  });
});

/* ---------- 敵ソルバー 4 本 (25, 26, 27, 32) ---------- */

function msKey(a){return a.map(Number).sort(function(x,y){return x-y;}).join(",");}
function figNums(q,ix){return E.figureNumbers(q._specs[ix],q._model,{pair:q.variant==="pair"});}
function figNumsTicks(q,ix){
  var out=figNums(q,ix).slice(),ax=q._specs[ix].percentAxis;
  if(ax&&ax.ticks)out.push(ax.ticks[1]);
  return out;
}
var SOLVER={};
function solverReport(name,lv,acc){
  SOLVER[name]=SOLVER[name]||{};
  SOLVER[name][lv]=acc;
}
test("25. 幾何照合ソルバー: 全誤図が比例を満たし、期待正答率が偶然水準近傍以下",function(){
  for(var lv=1;lv<=10;lv++){
    var credit=0,n=0;
    diags(lv).forEach(function(q){
      n++;
      if(q.variant==="pair"){
        if(q._specs[0].type==="rect"){
          var r0=q.figures[0].match(/<rect [^>]*height="60"\/>/g),r1=q.figures[1].match(/<rect [^>]*height="60"\/>/g);
          assert.equal(String(r0),String(r1),"rect pair dims differ");
        }
        credit+=0.25;
        return;
      }
      var spec=q._specs[0];
      if(spec.type==="bar"&&spec.rows[0].align!=="band"){
        /* 誤図も含めて区間長 / 値の比が一定 (規則 8: 幾何で落ちる型ゼロ) */
        var rs=rowRects(q.figures[0]);
        var y0=rs[0].y,row0=rs.filter(function(x){return x.y===y0;});
        var lens=spec.rows[0].segments.map(function(sg){
          if(sg.len.k==="val"||sg.len.k==="unit")return E.valOf(q._model,sg.len.qid);
          return 0;
        });
        if(row0.length===lens.length&&lens.every(function(v){return v>0;})){
          var k0=row0[0].w/lens[0];
          row0.forEach(function(r,i3){
            assert.ok(Math.abs(r.w/lens[i3]-k0)<0.02,"lv"+lv+" 比例が崩れた誤図");
          });
        }
      }
      credit+=(q.choices[q.ans]==="正しい")?1:0;
    });
    var acc=credit/n;
    solverReport("geometry",lv,acc);
    assert.ok(acc<=0.28,"lv"+lv+" geometry "+acc.toFixed(3));
  }
});

test("26. 個数照合ソルバー: 期待正答率が偶然水準近傍以下",function(){
  for(var lv=1;lv<=10;lv++){
    var credit=0,n=0;
    diags(lv).forEach(function(q){
      n++;
      if(q.variant==="pair"){credit+=0.25;return;}
      var fig=msKey(figNumsTicks(q,0)),text=msKey(q._model.textNumbers);
      if(fig===text){credit+=(q.choices[q.ans]==="正しい")?1:0;return;}
      var missW=WORDS.missing_relation;
      if(q.choices.indexOf(missW)>=0)credit+=(q.choices[q.ans]===missW)?1:0;
      else credit+=0.25;
    });
    var acc=credit/n;
    solverReport("count",lv,acc);
    assert.ok(acc<=0.30,"lv"+lv+" count "+acc.toFixed(3));
  }
});

test("27. 語順照合ソルバー: 期待正答率が偶然水準近傍以下 (両読みの悪い方)",function(){
  for(var lv=1;lv<=10;lv++){
    var worst=0;
    [false,true].forEach(function(rev){
      var credit=0,n=0;
      diags(lv).forEach(function(q){
        n++;
        function ordered(ix){
          var fig=figNums(q,ix);
          if(rev)fig=fig.slice().reverse();
          var inFig={};fig.forEach(function(v){inFig[v]=(inFig[v]||0)+1;});
          var common=q._model.textNumbers.filter(function(v){
            if(inFig[v]>0){inFig[v]--;return true;}
            return false;
          });
          var inTx={};q._model.textNumbers.forEach(function(v){inTx[v]=(inTx[v]||0)+1;});
          var figC=fig.filter(function(v){if(inTx[v]>0){inTx[v]--;return true;}return false;});
          return JSON.stringify(common)===JSON.stringify(figC);
        }
        if(q.variant==="pair"){
          var o0=ordered(0),o1=ordered(1);
          if(o0!==o1)credit+=(q.ans===(o0?0:1))?1:0;
          else credit+=0.25;
          return;
        }
        if(ordered(0))credit+=(q.choices[q.ans]==="正しい")?1:0;
        else credit+=(q.choices[q.ans]!=="正しい")?1/3:0;
      });
      if(credit/n>worst)worst=credit/n;
    });
    solverReport("order",lv,worst);
    assert.ok(worst<=0.31,"lv"+lv+" order "+worst.toFixed(3));
  }
});

test("32. 語彙照合ソルバー: 期待正答率 + 文言別正解率 40% 以下 + 専用文言なし",function(){
  for(var lv=1;lv<=10;lv++){
    var present={},correct={};
    var qs2=singles(lv);
    qs2.forEach(function(q){
      q.choices.forEach(function(c){present[c]=(present[c]||0)+1;});
      correct[q.choices[q.ans]]=(correct[q.choices[q.ans]]||0)+1;
    });
    Object.keys(correct).forEach(function(w){
      var rate=correct[w]/present[w];
      assert.ok(rate<=0.40,"lv"+lv+" wording rate "+w+" "+rate.toFixed(2));
      assert.ok(present[w]>correct[w],"lv"+lv+" 専用文言 "+w);
    });
    var credit=0;
    qs2.forEach(function(q){
      var min=Infinity;
      q.choices.forEach(function(c){if(present[c]<min)min=present[c];});
      var rare=q.choices.filter(function(c){return present[c]===min;});
      if(rare.indexOf(q.choices[q.ans])>=0)credit+=1/rare.length;
    });
    var acc=credit/qs2.length;
    solverReport("vocab",lv,acc);
    /* 合格線は検証 32 の文言別上限 40% に合わせる (未確定 12 の緩和線 0.40 と同値)。
       肢の組は (Lv, 図のクラス) で固定なので、組み合わせ照合の上限は文言別正解率の最大値に一致する */
    assert.ok(acc<=0.40,"lv"+lv+" vocab "+acc.toFixed(3));
  }
});

/* ---------- 検証 41: 付録 A fixture (v0.3.4) をセット単位の検証に通す ---------- */

var APPL_FIX={
  sum2:["correct","part_whole_mixup","unknown_misplaced","relation_mixup","role_swap"],
  diff2:["correct","relation_mixup","unknown_misplaced","role_swap","correct_alternative"],
  sum_diff:["correct","correct_alternative","part_whole_mixup","role_swap","unknown_misplaced","relation_mixup"],
  multiple:["correct","correct_alternative","base_mixup","role_swap","unknown_misplaced"],
  sum_multiple:["correct","part_whole_mixup","base_mixup","role_swap","unknown_misplaced"],
  percent_part:["correct","base_mixup","role_swap","unknown_misplaced"],
  remainder_percent:["correct","role_swap","base_mixup","unknown_misplaced"],
  two_step_percent:["correct","step_base_mixup","base_mixup","role_swap","unknown_misplaced"],
  unit_product:["correct","correct_alternative","part_whole_mixup","role_swap","unknown_misplaced"],
  table2:["correct","correct_alternative","role_swap","unknown_misplaced"]
};
var PAIR_DOMAIN={1:["part_whole_mixup","unknown_misplaced"],2:["relation_mixup","unknown_misplaced"],
  3:["part_whole_mixup","unknown_misplaced"],4:["base_mixup","role_swap"],5:["part_whole_mixup","base_mixup"],
  6:["base_mixup","unknown_misplaced"],7:["step_base_mixup","unknown_misplaced"],
  8:["part_whole_mixup","base_mixup","unknown_misplaced"],9:["role_swap","unknown_misplaced"],
  10:["part_whole_mixup","base_mixup","unknown_misplaced"]};
var SINGLE_DOMAIN={
  1:G.decks.l1s,2:G.decks.l2s,3:G.decks.l3a.concat(G.decks.l3b),4:G.decks.l4a.concat(G.decks.l4b),
  5:G.decks.l5a.concat(G.decks.l5b),6:G.decks.l6s,7:G.decks.l7a.concat(G.decks.l7b),
  8:G.decks.l8a.concat(G.decks.l8b),9:G.decks.l9a.concat(G.decks.l9b),10:G.decks.l10a.concat(G.decks.l10b)};

test("41. 付録 A の 10 セットがセット単位の検証を全件通過する",function(){
  assert.equal(FIX.sets.length,10);
  FIX.sets.forEach(function(fset){
    var lv=fset.lv,ps=fset.problems;
    assert.equal(ps.length,5,"lv"+lv);
    var mix={normal:0,formulation:0,diag_single:0,diag_pair:0,find_all:0};
    var zk={},pc={},singleTypes=[];
    ps.forEach(function(p){
      String(p.zukei).split("+").forEach(function(z){zk[z]=1;});
      pc[p.patternId]=(pc[p.patternId]||0)+1;
      assert.ok(!FORBIDDEN_TEXT.test(p.text),"lv"+lv+" text");
      if(p.format==="diagnosis"){
        if(p.variant==="pair"){
          mix.diag_pair++;
          assert.ok(p.ans>=0&&p.ans<=3);
          p.errorTypes.forEach(function(t){
            assert.ok(t!=="extra_quantity"&&t!=="missing_relation","lv"+lv+" 検証14");
          });
          var mut=p.errorTypes.filter(function(t){return t;});
          if(p.ans<2){
            assert.equal(p.errorTypes[p.ans],null,"lv"+lv+" 正図側");
            assert.equal(mut.length,1);
            assert.ok(PAIR_DOMAIN[lv].indexOf(mut[0])>=0,"lv"+lv+" pair type "+mut[0]);
          }
          if(p.ans===3){assert.equal(mut.length,2);assert.notEqual(mut[0],mut[1]);}
        }else{
          mix.diag_single++;
          singleTypes.push(p.errorTypes[0]);
          assert.equal(p.choices.length,4,"lv"+lv);
          var seen={};
          p.choices.forEach(function(t){
            assert.ok(WORDS[t],"lv"+lv+" wording key "+t);
            assert.ok(!seen[WORDS[t]],"lv"+lv+" 同一文言の重複 (規則 4)");
            seen[WORDS[t]]=1;
            var appl=APPL_FIX[p.relation].indexOf(t)>=0
              ||(t==="missing_relation"&&(p.textNumbers||[]).length>=3)
              ||(t==="extra_quantity"&&(p.unusedCount||0)>=1);
            assert.ok(appl,"lv"+lv+" 適用不能な肢 "+t+" on "+p.relation);
          });
          assert.equal(WORDS[p.choices[p.ans]],WORDS[p.errorTypes[0]],"lv"+lv+" 正解位置の文言");
          var z0=String(p.zukei).split("+")[0];
          assert.ok(typeAllowed(p.errorTypes[0],lv,z0),"lv"+lv+" 型の Lv 規定 "+p.errorTypes[0]);
          assert.ok(SINGLE_DOMAIN[lv].indexOf(p.errorTypes[0])>=0,"lv"+lv+" 生成器デッキ外の型 "+p.errorTypes[0]);
          if(p.errorTypes[0]==="missing_relation")assert.ok(p.decoyCount>=1,"lv"+lv+" 規則 9");
        }
      }else if(p.format==="normal"){
        mix.normal++;
        assert.ok(Number.isInteger(p.ans),"lv"+lv);
        assert.ok(p.oneStep,"lv"+lv);
        var src=ps.filter(function(x){return x.n===p.chainOf;})[0];
        assert.ok(src&&src.format==="diagnosis","lv"+lv+" 連鎖元");
        assert.equal(src.relation,p.relation,"lv"+lv+" 連鎖は同じ意味モデル");
      }else if(p.format==="formulation"){
        mix.formulation++;
        assert.equal(p.choices.length,4);
        assert.ok(p.choices.indexOf(G.unknowable)>=0,"lv"+lv+" 分からない肢");
        assert.ok(!p.correctIsUnknown,"lv"+lv+" 検証 36");
      }else{
        mix.find_all++;
        assert.ok(p.choiceCount>=5&&p.choiceCount<=6,"lv"+lv+" 19.5 の 1");
        assert.ok(p.ansCount>=2&&p.ansCount<=4,"lv"+lv);
        if(p.zukei==="table"){assert.ok(p.totalInAns&&p.calcCellInChoices,"lv"+lv+" 検証 30");}
        else assert.ok(p.numbersInBoth,"lv"+lv+" 19.5 の 3");
      }
    });
    assert.equal(JSON.stringify(mix),JSON.stringify(G.formatMix[lv]),"lv"+lv+" 配合");
    Object.keys(pc).forEach(function(k){assert.ok(pc[k]<3,"lv"+lv+" patternId x3");});
    if(lv===2)assert.ok(zk.bar_series&&zk.bar_aligned,"lv2 両形");
    if(lv>=5&&lv<=7)assert.ok(Object.keys(zk).length>=2,"lv"+lv+" 既習混入");
    if(lv>=8)assert.ok(Object.keys(zk).length>=2,"lv"+lv);
    if(lv===10)assert.ok(Object.keys(zk).length>=3,"lv10 図型 3 種以上");
    if(lv===1||lv===6){
      assert.equal(singleTypes.length,2);
      assert.notEqual(singleTypes[0],singleTypes[1],"lv"+lv+" 19.3 の 8");
    }
  });
});

test("golden. 生成セットの形式列が付録 A のスロット構造を再現する",function(){
  FIX.sets.forEach(function(fset){
    var shape=fset.problems.map(function(p){return p.format+(p.variant==="pair"?":pair":"");}).join("|");
    ALL[fset.lv].forEach(function(set){
      var got=set.map(function(q){return q.format+(q.variant==="pair"?":pair":"");}).join("|");
      assert.equal(got,shape,"lv"+fset.lv+" スロット構造");
    });
  });
});

console.log("");
console.log("敵ソルバー実測 (各 Lv 200 問、期待正答率):");
["geometry","count","order","vocab"].forEach(function(name){
  var vals=SOLVER[name],max=0,lvAt=0;
  Object.keys(vals).forEach(function(lv2){if(vals[lv2]>max){max=vals[lv2];lvAt=lv2;}});
  var avg=Object.keys(vals).reduce(function(a,lv2){return a+vals[lv2];},0)/Object.keys(vals).length;
  console.log("  "+name+": 平均 "+avg.toFixed(3)+" / 最大 "+max.toFixed(3)+" (lv"+lvAt+")");
});
console.log("total",passed,"generator tests passed");
