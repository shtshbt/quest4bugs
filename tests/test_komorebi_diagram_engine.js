"use strict";
/* kom_diagram_model engine tests: curriculum v0.3.4, 検証 1-10c */
var assert=require("node:assert/strict");
var fs=require("node:fs");
var path=require("node:path");
var vm=require("node:vm");

var root=path.resolve(__dirname,"..");
var context={console:console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"komorebi/diagram_engine.js"),"utf8"),context);
var E=context.Q4B_KOMOREBI_DIAGRAM_ENGINE;

var passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}
function Q(id,role,v,u,l,g){return {id:id,role:role,value:v,unit:u,label:l,given:g};}

var MODELS={
  sum2:{relation:"sum2",zukei:"bar_series",quantities:[Q("w","whole",20,"こ","ぜんぶ",true),Q("a","part",8,"こ","りんご",true),Q("b","part",12,"こ","みかん",false)],unknown:"b",unused:[],whole:"w",parts:["a","b"]},
  diff2:{relation:"diff2",zukei:"bar_aligned",quantities:[Q("a","compare",90,"cm","赤",true),Q("b","compare",60,"cm","青",true),Q("d","diff",30,"cm","ちがい",false)],unknown:"d",unused:[],parts:["a","b"],diff:"d"},
  sum_diff:{relation:"sum_diff",zukei:"bar_aligned",quantities:[Q("w","whole",2000,"円","合計",true),Q("big","part",1200,"円","兄",false),Q("small","part",800,"円","弟",false),Q("d","diff",400,"円","ちがい",true)],unknown:"big",unused:[],whole:"w",parts:["big","small"],diff:"d"},
  multiple:{relation:"multiple",zukei:"bar_multiple",quantities:[Q("b","base",30,"cm","白",true),Q("m","compare",90,"cm","赤",false)],unknown:"m",unused:[],base:"b",mult:"m",k:3},
  sum_multiple:{relation:"sum_multiple",zukei:"bar_multiple",quantities:[Q("w","whole",48,"こ","ぜんぶ",true),Q("b","base",12,"こ","ガム",false),Q("m","compare",36,"こ","あめ",false)],unknown:"b",unused:[],whole:"w",base:"b",mult:"m",k:3},
  percent_part:{relation:"percent_part",zukei:"bar_percent",quantities:[Q("base","base",40,"人","定員",true),Q("part","compare",12,"人","来た人",false),Q("rate","rate",30,"","",true)],unknown:"part",unused:[],base:"base",part:"part",rate:"rate"},
  remainder:{relation:"remainder_percent",zukei:"bar_percent",quantities:[Q("base","base",240,"円","はじめのお金",false),Q("used","part",144,"円","使った",false),Q("rest","part",96,"円","のこり",true),Q("rate","rate",60,"","",true)],unknown:"base",unused:[],base:"base",used:"used",rest:"rest",rate:"rate"},
  two_step:{relation:"two_step_percent",zukei:"bar_percent",quantities:[Q("base","base",2000,"円","もとのねだん",true),Q("mid","part",1600,"円","1回目のあと",false),Q("fin","part",1440,"円","さいご",false),Q("ra","rate",20,"","",true),Q("rb","rate",10,"","",true),Q("ka","rate",80,"","",false),Q("kb","rate",90,"","",false)],unknown:"fin",unused:[],base:"base",mid:"mid",final:"fin",rate1:"ra",rate2:"rb",keep1:"ka",keep2:"kb",step2:"part",keepName:"のこるねだん",cutName:null},
  rect:{relation:"unit_product",zukei:"rect",quantities:[Q("per","per_unit",120,"円","1このねだん",true),Q("n","count",7,"こ","買った数",false),Q("w","total",840,"円","だいきん",true)],unknown:"n",unused:[],whole:"w",per:"per",count:"n"},
  table:{relation:"table2",zukei:"table",quantities:[Q("da","count",18,"人","",true),Q("ca","count",12,"人","",true),Q("db","count",15,"人","",true),Q("cb","count",9,"人","",true),Q("tb","total",24,"人","",false)],unknown:"tb",unused:[],
    table:{rowLabel:"学年",colLabel:"どうぶつ",rowItems:["3年","4年"],colItems:["犬","ねこ"],
      cellOf:{da:[0,0],ca:[0,1],db:[1,0],cb:[1,1],tb:[1,0,"rowTotal"]},
      given:["da","ca","db","cb"],totals:{row:true,col:false,given:[]},unknownAt:{kind:"rowTotal",r:1}}}
};
Object.keys(MODELS).forEach(function(k){MODELS[k].cat="kom_diagram_model";MODELS[k].lv=1;});
var MUTS={
  sum2:["part_whole_mixup","unknown_misplaced","relation_mixup"],
  diff2:["relation_mixup","unknown_misplaced","role_swap"],
  sum_diff:["part_whole_mixup","role_swap","unknown_misplaced","missing_relation"],
  multiple:["base_mixup","role_swap","unknown_misplaced"],
  sum_multiple:["part_whole_mixup","base_mixup","role_swap","unknown_misplaced"],
  percent_part:["base_mixup","role_swap","unknown_misplaced"],
  remainder:["role_swap","unknown_misplaced","base_mixup"],
  two_step:["step_base_mixup","unknown_misplaced"],
  rect:["part_whole_mixup","unknown_misplaced"],
  table:["role_swap","missing_relation","unknown_misplaced"]
};
var TYPE2COND={role_swap:"C1",part_whole_mixup:"C2",base_mixup:"C3",relation_mixup:"C4",
  step_base_mixup:"C5",unknown_misplaced:"C6",extra_quantity:"C7",missing_relation:"C8"};
var ALT_MODELS=["diff2","sum_diff","multiple","rect","table"];

test("1. 正図が対応条件 C1-C8 をすべて満たす",function(){
  Object.keys(MODELS).forEach(function(k){
    var spec=E.buildSpec(MODELS[k]);
    assert.equal(E.checkConditions(spec,MODELS[k]).length,0,k);
  });
});

test("2. 図 spec が値を持たない (qid 経由でのみ値を引く)",function(){
  Object.keys(MODELS).forEach(function(k){
    var spec=E.clone(E.buildSpec(MODELS[k]));
    (function scrub(o){
      if(Array.isArray(o)){o.forEach(scrub);return;}
      if(o&&typeof o==="object"){
        ["id","row","rows","from","to","seg","idx","r","c","percentAxis","cellOf",
         "rowAxis","colAxis","totals","unknown","parent"].forEach(function(key){delete o[key];});
        Object.keys(o).forEach(function(key){scrub(o[key]);});
      }
    })(spec);
    assert.ok(!/\d\d/.test(JSON.stringify(spec)),"values leaked in spec of "+k+": "+JSON.stringify(spec));
  });
});

test("3. 誤図はちょうど 1 つの対応条件を破り、宣言 errorType と一致する",function(){
  Object.keys(MUTS).forEach(function(k){
    var m=MODELS[k],spec=E.buildSpec(m);
    MUTS[k].forEach(function(t){
      var mu=E.mutate(spec,m,t,0);
      assert.ok(mu,k+" "+t+" mutate null");
      var broken=E.checkConditions(mu,m);
      assert.equal(broken.length,1,k+" "+t+" broke "+JSON.stringify(broken));
      assert.equal(broken[0],TYPE2COND[t],k+" "+t);
    });
  });
  var xm=JSON.parse(JSON.stringify(MODELS.percent_part));
  xm.quantities.push(Q("x","count",24,"人","バスの人",true));
  xm.unused=["x"];
  var xs=E.buildSpec(xm);
  var xq=E.mutate(xs,xm,"extra_quantity",0);
  assert.equal(JSON.stringify(Array.from(E.checkConditions(xq,xm))),JSON.stringify(["C7"]));
});

test("4. 描画規則 R1a/R1b-1/R1b-2/R1c を満たす",function(){
  function widths(svg){
    var out=[],re=/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="36"\/>/g,mm;
    while((mm=re.exec(svg)))out.push({x:+mm[1],y:+mm[2],w:+mm[3]});
    return out;
  }
  var svg=E.render(E.buildSpec(MODELS.sum2),MODELS.sum2,{});
  var ws=widths(svg);
  assert.equal(ws.length,2);
  assert.ok(Math.abs(ws[0].w/ws[1].w-8/12)<0.01,"R1a ratio");
  var psvg=E.render(E.buildSpec(MODELS.percent_part),MODELS.percent_part,{});
  var pw=widths(psvg);
  assert.ok(Math.abs(pw[0].w+pw[1].w-304)<0.5,"R1b-1 band full width, got "+(pw[0].w+pw[1].w));
  assert.ok(Math.abs(pw[0].w/(pw[0].w+pw[1].w)-0.3)<0.01,"R1b-1 rate proportion");
  var tsvg=E.render(E.buildSpec(MODELS.two_step),MODELS.two_step,{});
  var tw=widths(tsvg);
  var band1=tw.filter(function(r){return r.y===tw[0].y;});
  var band2=tw.filter(function(r){return r.y!==tw[0].y;});
  var keepW=band1[0].w,b2=band2[0].w+band2[1].w;
  assert.ok(Math.abs(b2-keepW)<0.5,"R1b-2 band2 total = parent width");
  var rsvg=E.render(E.buildSpec(MODELS.rect),MODELS.rect,{});
  assert.ok(rsvg.indexOf('width="90" height="60"')>=0,"R1c fixed 3:2 rect");
  var r2=JSON.parse(JSON.stringify(MODELS.rect));
  r2.quantities[0].value=990;r2.quantities[2].value=990*7;
  assert.ok(E.render(E.buildSpec(r2),r2,{}).indexOf('width="90" height="60"')>=0,"R1c value-independent");
});

test("5. canonical(誤図) != canonical(正図)",function(){
  Object.keys(MUTS).forEach(function(k){
    var m=MODELS[k],spec=E.buildSpec(m),c0=E.canonical(spec,m);
    MUTS[k].forEach(function(t){
      var mu=E.mutate(spec,m,t,0);
      assert.notEqual(E.canonical(mu,m),c0,k+" "+t);
    });
  });
});

test("6. correct_alternative は canonical 一致 + SVG 相違 + 文言「正しい」",function(){
  ALT_MODELS.forEach(function(k){
    var m=MODELS[k],spec=E.buildSpec(m);
    var alt=E.mutate(spec,m,"correct_alternative",0);
    assert.ok(alt,k);
    assert.equal(E.canonical(alt,m),E.canonical(spec,m),k+" canonical");
    assert.notEqual(E.render(alt,m,{}),E.render(spec,m,{}),k+" svg");
    assert.equal(E.checkConditions(alt,m).length,0,k+" conditions");
  });
  assert.equal(E.wordings.correct_alternative,"正しい");
  assert.equal(E.wordings.correct,"正しい");
});

test("7. renderer 決定性",function(){
  Object.keys(MODELS).forEach(function(k){
    var spec=E.buildSpec(MODELS[k]);
    assert.equal(E.render(spec,MODELS[k],{}),E.render(spec,MODELS[k],{}),k);
    assert.equal(E.render(spec,MODELS[k],{pair:true}),E.render(spec,MODELS[k],{pair:true}),k+" pair");
  });
});

test("8. 外部参照なし + currentColor + role=img + aria-label",function(){
  Object.keys(MODELS).forEach(function(k){
    var svg=E.render(E.buildSpec(MODELS[k]),MODELS[k],{});
    assert.ok(!/href|url\(|<image|<script|@import|font-family|<use/.test(svg),k+" external ref");
    assert.ok(svg.indexOf("currentColor")>=0,k);
    assert.ok(svg.indexOf('role="img"')>=0,k);
    assert.ok(/aria-label="[^"]+"/.test(svg),k);
  });
});

test("9. ラベルは renderer 自身が escape する",function(){
  var m=JSON.parse(JSON.stringify(MODELS.sum2));
  m.quantities[1].label='a<b&"c';
  var svg=E.render(E.buildSpec(m),m,{});
  assert.ok(svg.indexOf("a&lt;b&amp;&quot;c")>=0,"escaped label present");
  assert.ok(svg.indexOf('a<b&"c')<0,"raw label absent");
});

test("10. ラベル 8 文字以内 + 値ラベル数上限 (bar5/rect3/table9) + 名前ラベル",function(){
  var caps={bar:5,rect:3,table:9};
  Object.keys(MODELS).forEach(function(k){
    var m=MODELS[k],spec=E.buildSpec(m);
    var cap=caps[spec.type]||caps.bar;
    assert.ok(E.countValueLabels(spec,m,{})<=cap,k+" value labels "+E.countValueLabels(spec,m,{}));
    E.labelItems(spec,m,{}).forEach(function(it){
      if(it.name)assert.ok(String(it.text).length<=8,k+" name len: "+it.text);
    });
    if(spec.type==="bar"){
      spec.rows.forEach(function(r){
        r.segments.forEach(function(sg){
          if(sg.qid&&m.unused.indexOf(sg.qid)<0)
            assert.ok(sg.name!=null||r.nameQid===sg.qid||r.name!=null,k+" qid seg without name");
        });
      });
    }
  });
});

test("10b. 実表示幅 40px 未満の区間は引き出し線 (data-leader)",function(){
  Object.keys(MODELS).forEach(function(k){
    var m=MODELS[k],spec=E.buildSpec(m);
    [{},{pair:true}].forEach(function(opts){
      E.labelItems(spec,m,opts).forEach(function(it){
        if(it.segPx==null)return;
        if(it.segPx<E.leaderMinPx)assert.ok(it.leader,k+" narrow seg without leader ("+it.segPx.toFixed(1)+"px)");
        else assert.ok(!it.leader,k+" wide seg with leader");
      });
      var svg=E.render(spec,m,opts);
      var leaders=E.labelItems(spec,m,opts).some(function(it){return it.leader;});
      assert.equal(svg.indexOf("data-leader")>=0,leaders,k+" leader marks in svg");
    });
  });
});

test("10c. 論理文字 14 + 最小画面での実寸 12px 近傍以上 + viewBox 規定",function(){
  assert.equal(E.font,14);
  var vb=E.viewbox;
  assert.equal(JSON.stringify(Array.from(vb.bar_single)),"[320,130]");
  assert.equal(JSON.stringify(Array.from(vb.pair)),"[188,128]");
  assert.equal(JSON.stringify(Array.from(vb.rect)),"[180,100]");
  var reals=[
    14*E.displayW.bar_single/vb.bar_single[0],
    14*E.displayW.pair/vb.pair[0],
    14*E.displayW.rect_single/vb.rect[0],
    14*E.displayW.rect_pair/vb.rect[0]
  ];
  reals.forEach(function(px){assert.ok(px>=11.95,"real font "+px);});
  Object.keys(MODELS).forEach(function(k){
    var m=MODELS[k],spec=E.buildSpec(m);
    var svg=E.render(spec,m,{});
    var expect=spec.type==="rect"?'viewBox="0 0 180 100"':'viewBox="0 0 320 130"';
    assert.ok(svg.indexOf(expect)>=0,k+" single viewBox");
    var psvg=E.render(spec,m,{pair:true});
    var pexpect=spec.type==="rect"?'viewBox="0 0 180 100"':'viewBox="0 0 188 128"';
    assert.ok(psvg.indexOf(pexpect)>=0,k+" pair viewBox");
    assert.ok(svg.indexOf('font-size="14"')>=0,k);
    assert.ok(svg.indexOf('preserveAspectRatio="xMidYMid meet"')>=0,k);
  });
});

console.log("total",passed,"engine tests passed");
