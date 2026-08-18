/* komorebi diagram_model generator (kom_diagram_model)
 * curriculum: docs/komorebi_diagram_model_curriculum.md v0.3.6
 * Uses Q4B_KOMOREBI_DIAGRAM_ENGINE for spec/mutate/render. Injected random only.
 */
(function(global){
  "use strict";

  var E=function(){return global.Q4B_KOMOREBI_DIAGRAM_ENGINE;};

  var PAIR_CHOICES=["ア","イ","どちらも合っている","どちらも合っていない"];
  var UNKNOWABLE="この図では分からない";
  var WAZA={
    1:{primary:"あわせるならつなぐ、くらべるなら そろえて並べる",alternate:"全体を指す印がどこまでかを最初に決める"},
    2:{primary:"あわせるならつなぐ、くらべるなら そろえて並べる",alternate:"全体を指す印がどこまでかを最初に決める"},
    3:{primary:"あわせるならつなぐ、くらべるなら そろえて並べる",alternate:"全体を指す印がどこまでかを最初に決める"},
    4:{primary:"1 つ分にあたるのはどちらかをさがす",alternate:"1 つ分が決まれば、あとは数えるだけ"},
    5:{primary:"1 つ分にあたるのはどちらかをさがす",alternate:"1 つ分が決まれば、あとは数えるだけ"},
    6:{primary:"1 とみる量をさがして、それを帯ぜんぶにする",alternate:"「の」の前がもとにする量"},
    7:{primary:"2 回目は、1 回目の残りの上にのせる",alternate:"2 段目の帯の左右の端をそろえて確かめる"},
    8:{primary:"面積が全体の量、2 つの辺がその成分",alternate:"たてとよこは入れかえてもよい"},
    9:{primary:"2 つの見方を、行と列に分ける",alternate:"文から直接埋まるますだけ先に埋める"},
    10:{primary:"図に置いた数が、文にある数と 1 対 1 になっているか",alternate:"使わない数を図に入れない"}
  };
  var ALT_SENTENCES={
    rows:"上と下を入れかえても、図の表す関係は変わらない。どちらを上にかくかに決まりはない。",
    rect:"たてとよこを入れかえても、長方形の面積は変わらない。どちらをたてにするかに決まりはない。",
    table:"行と列を入れかえても、表が伝えることは変わらない。どちらを行にするかに決まりはない。"
  };
  var FORMAT_MIX={
    1:{normal:2,formulation:0,diag_single:2,diag_pair:1,find_all:0},
    2:{normal:2,formulation:0,diag_single:2,diag_pair:1,find_all:0},
    3:{normal:1,formulation:1,diag_single:2,diag_pair:1,find_all:0},
    4:{normal:1,formulation:1,diag_single:2,diag_pair:1,find_all:0},
    5:{normal:1,formulation:1,diag_single:2,diag_pair:1,find_all:0},
    6:{normal:1,formulation:1,diag_single:2,diag_pair:1,find_all:0},
    7:{normal:1,formulation:0,diag_single:2,diag_pair:1,find_all:1},
    8:{normal:1,formulation:1,diag_single:2,diag_pair:1,find_all:0},
    9:{normal:1,formulation:0,diag_single:2,diag_pair:1,find_all:1},
    10:{normal:1,formulation:0,diag_single:2,diag_pair:1,find_all:1}
  };

  /* ---------- session decks (quota rotation, injected random) ---------- */

  function shuffle(arr,random){
    var a=arr.slice(),i,j,t;
    for(i=a.length-1;i>0;i--){j=Math.floor(random()*(i+1));t=a[i];a[i]=a[j];a[j]=t;}
    return a;
  }
  function createSession(random){
    var decks={};
    function draw(name,items){
      var d=decks[name];
      if(!d||!d.length){d=shuffle(items,random);decks[name]=d;}
      return d.pop();
    }
    function drawDiff(name,items,exclude){
      var v=draw(name,items);
      if(v!==exclude)return v;
      var d=decks[name];
      for(var i=d.length-1;i>=0;i--){
        if(d[i]!==exclude){var w=d[i];d[i]=v;return w;}
      }
      decks[name]=null;
      var v2=draw(name,items);
      if(v2!==exclude)return v2;
      d=decks[name];
      for(var j=d.length-1;j>=0;j--){
        if(d[j]!==exclude){var w2=d[j];d[j]=v2;return w2;}
      }
      return v2;
    }
    return {random:random,draw:draw,drawDiff:drawDiff,recent:[]};
  }
  function pick(arr,random){return arr[Math.floor(random()*arr.length)];}

  /* ---------- quantity/context banks ---------- */

  function Q(id,role,v,u,l,g){return {id:id,role:role,value:v,unit:u,label:l,given:g};}
  var SUM2_CTX=[
    {a:"りんご",b:"みかん",box:"かごにくだもの",unit:"こ",cnt:"こ",decoy:"となりのかごには {d} こ入っています。"},
    {a:"赤い花",b:"白い花",box:"花だんに花",unit:"本",cnt:"本",decoy:"つぼみは {d} 本あります。"},
    {a:"赤い玉",b:"青い玉",box:"箱に玉",unit:"こ",cnt:"こ",decoy:"白い玉は べつの箱に {d} こあります。"},
    {a:"赤い風船",b:"青い風船",box:"会場に風船",unit:"こ",cnt:"こ",decoy:"黄色い風船は {d} こしぼんでいました。"}
  ];
  var SUM2_VALS=[[20,8],[24,9],[30,12],[36,15],[42,18],[28,12],[40,16],[45,18]];
  var DIFF2_CTX=[
    {a:"赤いリボン",b:"青いリボン",unit:"cm",decoy:"黄色いリボンは {d} cm です。"},
    {a:"大人",b:"子ども",unit:"人",decoy:"駅では {d} 人が待っています。"},
    {a:"白いテープ",b:"青いテープ",unit:"cm",decoy:"黒いテープは {d} cm です。"}
  ];
  var DIFF2_VALS=[[90,60],[80,50],[70,40],[45,25],[65,40],[85,60]];
  var SUMDIFF_CTX=[
    {a:"兄",b:"弟",unit:"円",decoy:"2 人は {d} 円のおかしも見ています。"},
    {a:"姉",b:"妹",unit:"円",decoy:"2 人は {d} 円の本も見ています。"}
  ];
  var SUMDIFF_VALS=[[2000,400],[1400,200],[1800,600],[2400,600],[1600,400],[3000,600]];
  var MULT_CTX=[
    {a:"白いテープ",b:"赤いテープ",unit:"cm",decoy:"青いテープは {d} cm です。"},
    {a:"みかん",b:"りんご",unit:"こ",decoy:"バナナは {d} 本あります。"},
    {a:"青いひも",b:"黄色いひも",unit:"cm",decoy:"赤いひもは {d} cm です。"},
    {a:"弟",b:"兄",unit:"円",decoy:"2 人は {d} 円の本も見ています。"}
  ];
  var MULT_VALS=[[30,3],[8,4],[15,3],[12,4],[25,2],[9,5],[14,3],[16,2]];
  var SUMMULT_CTX=[
    {a:"ガム",b:"あめ",unit:"こ",decoy:"チョコは {d} こあります。"},
    {a:"みかん",b:"りんご",unit:"こ",decoy:"かきは {d} こあります。"},
    {a:"白いテープ",b:"赤いテープ",unit:"cm",decoy:"青いテープは {d} cm です。"}
  ];
  var SUMMULT_VALS=[[12,3],[15,3],[12,4],[9,4],[8,5],[14,2],[20,3]];
  var PCT_CTX=[
    {base:"定員",part:"来た人",unit:"人",of:"定員",q:"何人来ましたか",decoy:"先週は {d} 人来ました。",extra:"バスで来る人は {d} 人です。",extraLabel:"バスの人"},
    {base:"本ぜんぶ",part:"読んだ",unit:"ページ",of:"本ぜんぶ",q:"読んだのは何ページですか",decoy:"あとがきは {d} ページあります。",extra:"きのうは {d} ページ読みました。",extraLabel:"きのうの分"},
    {base:"学級",part:"男子",unit:"人",of:"学級",q:"男子は何人ですか",decoy:"校庭には {d} 人います。",extra:"となりの学級には {d} 人います。",extraLabel:"となりの学級"},
    {base:"町の人数",part:"子ども",unit:"人",of:"町の人数",q:"子どもは何人ですか",decoy:"公園には {d} 人います。",extra:"となりの町の子どもは {d} 人です。",extraLabel:"となりの町"}
  ];
  var PCT_VALS=[[40,30],[200,40],[30,60],[120,30],[60,40],[80,20],[150,40],[90,30]];
  var REM_VALS=[[60,96],[60,120],[70,90],[80,48],[70,120],[60,84]];
  var TWOSTEP_VALS=[[2000,20,10],[3000,10,20],[1000,20,10],[2000,30,20]];
  var RECT_CTX=[
    {thing:"りんご",per:"1こ",cu:"こ",unit:"円",decoy:"袋は {d} 円です。"},
    {thing:"リボン",per:"1m",cu:"m",unit:"円",decoy:"箱は {d} 円です。"},
    {thing:"ペン",per:"1本",cu:"本",unit:"円",decoy:"ノートは {d} 円です。"}
  ];
  var RECT_VALS=[[120,7],[250,3],[90,7],[80,6],[60,8],[110,4],[150,5],[70,9]];
  var TABLE_VALS=[[18,12,15,9],[20,10,16,14],[17,13,19,11],[22,18,14,16],
    [21,14,13,19],[16,11,18,12],[23,15,12,17],[19,17,21,13]];
  /* 使わない数 (本文にだけ置く数) の上限。値ラベルの 4 桁上限 (curriculum 11 章) と
     そろえる。使わない数は extra_quantity で図に載ることがあるため同じ枠に入れる。 */
  var DECOY_MAX=9999;

  /* ---------- semantic model builders (13) ---------- */

  /* 使わない数は、その問題が扱う数と同じ桁で作る。固定表から引くと「全部で 20 こ」の
     となりに「となりのかごには 900 こ」が並び、本文の数だけ桁が 2 つずれる。桁は
     模型の量から導く。基準に取るのは、使わない数と同じ単位を持つ量に限る。面積図は
     ねだん (円) と個数 (本) が同居しており、全量から取ると桁の幅が単位をまたぐ。 */
  function decoyStep(max){return max>=1000?100:(max>=100?10:1);}
  function decoyRange(model,unit){
    var vals=[];
    function collect(matchUnit){
      model.quantities.forEach(function(e){
        if(model.unused.indexOf(e.id)>=0)return;   /* 使わない数どうしで桁を引き継がない */
        if(e.role==="rate")return;                 /* 割合は無単位の 10 から 90 で量ではない */
        if(!(e.value>0))return;
        if(matchUnit&&e.unit!==unit)return;
        vals.push(e.value);
      });
    }
    collect(!!unit);
    if(!vals.length)collect(false);
    if(!vals.length)return null;
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),step=decoyStep(mx);
    var lo=Math.max(step,Math.ceil(mn/2/step)*step);
    var hi=Math.min(DECOY_MAX,Math.floor(mx*1.5/step)*step);
    return hi<lo?null:{lo:lo,hi:hi,step:step};
  }
  function drawDecoy(model,s,unit,taken){
    var r=decoyRange(model,unit);
    if(!r)throw new Error("使わない数の桁を決められません "+model.relation);
    var cand=[],v;
    for(v=r.lo;v<=r.hi;v+=r.step)if(taken.indexOf(v)<0)cand.push(v);
    if(!cand.length)throw new Error("使わない数の候補がありません "+model.relation);
    return cand[Math.floor(s.random()*cand.length)];
  }
  function withDecoy(model,s,ctx,n){
    var taken=model.quantities.map(function(e){return e.value;}),i;
    for(i=0;i<n;i++){
      var d=drawDecoy(model,s,ctx&&ctx.unit,taken);
      taken.push(d);
      var id="x"+i;
      model.quantities.push(Q(id,"count",d,"","(使わない)",true));
      model.unused.push(id);
      model.text+=ctx.decoy.replace("{d}",String(d));
      model.textNumbers.push(d);
    }
    return model;
  }
  function base_(rel,zukei){return {cat:"kom_diagram_model",relation:rel,zukei:zukei,unused:[],textNumbers:[]};}

  function mSum2(s,decoyN){
    var ctx=SUM2_CTX[s.draw("sum2c",[0,1,2,3])],v=SUM2_VALS[s.draw("sum2v",[0,1,2,3,4,5,6,7])];
    var w=v[0],a=v[1],b=w-a,ord=s.draw("ord2",[0,1]);
    var m=base_("sum2","bar_series");
    m.quantities=[Q("w","whole",w,ctx.unit,"ぜんぶ",true),Q("a","part",a,ctx.unit,ctx.a,true),Q("b","part",b,ctx.unit,ctx.b,false)];
    m.whole="w";m.parts=["a","b"];m.unknown="b";
    if(ord===0){m.text=ctx.box+"が全部で "+w+" "+ctx.cnt+"入っています。そのうち"+ctx.a+"が "+a+" "+ctx.cnt+"です。"+ctx.b+"は何"+ctx.cnt+"ですか。";m.textNumbers=[w,a];}
    else{m.text=ctx.a+"が "+a+" "+ctx.cnt+"あります。"+ctx.box+"は全部で "+w+" "+ctx.cnt+"です。"+ctx.b+"は何"+ctx.cnt+"ですか。";m.textNumbers=[a,w];}
    m.patternId="sum2:bar_series";m.ctx=ctx;
    return withDecoy(m,s,ctx,decoyN);
  }
  function mDiff2(s,wantSum,decoyN){
    var ctx=DIFF2_CTX[s.draw("d2c",[0,1,2])],v=DIFF2_VALS[s.draw("d2v",[0,1,2,3,4,5])];
    var a=v[0],b=v[1];
    if(wantSum){
      var m=base_("sum2","bar_series");
      m.quantities=[Q("w","whole",a+b,ctx.unit,"あわせて",false),Q("a","part",a,ctx.unit,ctx.a,true),Q("b","part",b,ctx.unit,ctx.b,true)];
      m.whole="w";m.parts=["a","b"];m.unknown="w";
      m.text=ctx.a+"は "+a+" "+ctx.unit+"、"+ctx.b+"は "+b+" "+ctx.unit+"です。あわせて何"+ctx.unit+"ですか。";
      m.textNumbers=[a,b];m.patternId="sum2j:bar_series";m.ctx=ctx;
      return withDecoy(m,s,ctx,decoyN);
    }
    var m2=base_("diff2","bar_aligned");
    m2.quantities=[Q("a","compare",a,ctx.unit,ctx.a,true),Q("b","compare",b,ctx.unit,ctx.b,true),Q("d","diff",a-b,ctx.unit,"ちがい",false)];
    m2.parts=["a","b"];m2.diff="d";m2.unknown="d";
    m2.text=ctx.a+"は "+a+" "+ctx.unit+"、"+ctx.b+"は "+b+" "+ctx.unit+"です。ちがいは何"+ctx.unit+"ですか。";
    m2.textNumbers=[a,b];m2.patternId="diff2:bar_aligned";m2.ctx=ctx;
    return withDecoy(m2,s,ctx,decoyN);
  }
  function mSumDiff(s,decoyN){
    var ctx=SUMDIFF_CTX[s.draw("sdc",[0,1])],v=SUMDIFF_VALS[s.draw("sdv",[0,1,2,3,4,5])];
    var w=v[0],d=v[1],big=(w+d)/2,small=(w-d)/2,ord=s.draw("ordsd",[0,1]);
    var m=base_("sum_diff","bar_aligned");
    m.quantities=[Q("w","whole",w,"円","合計",true),Q("big","part",big,"円",ctx.a,false),
      Q("small","part",small,"円",ctx.b,false),Q("d","diff",d,"円","ちがい",true)];
    m.whole="w";m.parts=["big","small"];m.diff="d";m.unknown=s.draw("sdunk",["big","small"]);
    var target=m.unknown==="big"?ctx.a:ctx.b;
    if(ord===0){m.text=ctx.a+"と"+ctx.b+"の持っているお金の合計は "+w+" 円、ちがいは "+d+" 円です。"+target+"は何円ですか。";m.textNumbers=[w,d];}
    else{m.text=ctx.a+"と"+ctx.b+"の持っているお金のちがいは "+d+" 円、合計は "+w+" 円です。"+target+"は何円ですか。";m.textNumbers=[d,w];}
    m.patternId="sum_diff:bar_aligned";m.ctx=ctx;
    return withDecoy(m,s,ctx,decoyN);
  }
  function mMultiple(s,decoyN){
    var ctx=MULT_CTX[s.draw("muc",[0,1,2,3])],v=MULT_VALS[s.draw("muv",[0,1,2,3,4,5,6,7])];
    var b=v[0],k=v[1],ord=s.draw("ordmu",[0,1]);
    var m=base_("multiple","bar_multiple");
    m.quantities=[Q("b","base",b,ctx.unit,ctx.a,true),Q("m","compare",b*k,ctx.unit,ctx.b,false)];
    m.base="b";m.mult="m";m.k=k;m.unknown="m";
    if(ord===0){m.text=ctx.b+"は"+ctx.a+"の "+k+" 倍で、"+ctx.a+"は "+b+" "+ctx.unit+"です。"+ctx.b+"は何"+ctx.unit+"ですか。";m.textNumbers=[k,b];}
    else{m.text=ctx.a+"は "+b+" "+ctx.unit+"あります。"+ctx.b+"は"+ctx.a+"の "+k+" 倍です。"+ctx.b+"は何"+ctx.unit+"ですか。";m.textNumbers=[b,k];}
    m.patternId="multiple:bar_multiple";m.ctx=ctx;
    return withDecoy(m,s,ctx,decoyN);
  }
  function mSumMultiple(s,opt){
    opt=opt||{};
    var ctx=SUMMULT_CTX[s.draw("smc",[0,1,2])],v=SUMMULT_VALS[s.draw("smv",[0,1,2,3,4,5,6])];
    var b=v[0],k=v[1],w=b*(k+1),ord=s.draw("ordsm",[0,1]);
    var m=base_("sum_multiple","bar_multiple");
    m.quantities=[Q("w","whole",w,ctx.unit,"あわせて",true),Q("b","base",b,ctx.unit,ctx.a,false),Q("m","compare",b*k,ctx.unit,ctx.b,false)];
    m.whole="w";m.base="b";m.mult="m";m.k=k;m.unknown=opt.unknownWhole?"w":"b";
    if(opt.unknownWhole){
      m.quantities[0].given=false;m.quantities[1].given=true;
      m.text=ctx.a+"を "+b+" "+ctx.unit+"買いました。"+ctx.b+"は"+ctx.a+"の "+k+" 倍です。"+ctx.b+"と"+ctx.a+"はあわせて何"+ctx.unit+"ですか。";
      m.textNumbers=[b,k];
    }else if(ord===0){
      m.text=ctx.b+"と"+ctx.a+"をあわせて "+w+" "+ctx.unit+"買いました。"+ctx.b+"の数は"+ctx.a+"の "+k+" 倍です。"+ctx.a+"は何"+ctx.unit+"ですか。";
      m.textNumbers=[w,k];
    }else{
      m.text=ctx.b+"の数は"+ctx.a+"の "+k+" 倍で、あわせると "+w+" "+ctx.unit+"です。"+ctx.a+"は何"+ctx.unit+"ですか。";
      m.textNumbers=[k,w];
    }
    m.patternId="sum_multiple:bar_multiple";m.ctx=ctx;
    return withDecoy(m,s,ctx,opt.decoyN||0);
  }
  function mSumMultDiff(s,decoyN){
    var v=s.draw("smdv",[[3200,200,2],[2600,200,2],[1700,200,2],[2900,200,2],[1400,200,3]]);
    var w=v[0],d=v[1],k=v[2],b=(w-d)/(k+1);
    var ctx=SUMDIFF_CTX[s.draw("sdc",[0,1])];
    var m=base_("sum_multiple","bar_multiple");
    m.quantities=[Q("w","whole",w,"円","合計",true),Q("b","base",b,"円",ctx.b,false),
      Q("m","compare",b*k,"円",ctx.a,false),Q("d","diff",d,"円","多い分",true)];
    m.whole="w";m.base="b";m.mult="m";m.k=k;m.diff="d";m.unknown="b";
    m.text=ctx.a+"と"+ctx.b+"の持っているお金の合計は "+w+" 円で、"+ctx.a+"は"+ctx.b+"の "+k+" 倍より "+d+" 円多いそうです。"+ctx.b+"は何円ですか。";
    m.textNumbers=[w,k,d];m.patternId="sum_multiple_diff:bar_multiple";m.ctx=ctx;
    return withDecoy(m,s,ctx,decoyN);
  }

  function mPercentPart(s,opt){
    opt=opt||{};
    var ctx=PCT_CTX[s.draw("pcc",[0,1,2,3])],v=PCT_VALS[s.draw("pcv",[0,1,2,3,4,5,6,7])];
    var B=v[0],r=v[1],part=B*r/100,ord=s.draw("ordpc",[0,1]);
    var m=base_("percent_part","bar_percent");
    m.quantities=[Q("base","base",B,ctx.unit,ctx.base,true),Q("part","compare",part,ctx.unit,ctx.part,false),Q("rate","rate",r,"","",true)];
    m.base="base";m.part="part";m.rate="rate";m.unknown="part";
    if(ord===0){m.text=ctx.base+"は "+B+" "+ctx.unit+"です。そのうち "+ctx.of+"の "+r+"% が"+ctx.part+"です。"+ctx.q+"。";m.textNumbers=[B,r];}
    else{m.text=ctx.of+"の "+r+"% が"+ctx.part+"です。"+ctx.base+"は "+B+" "+ctx.unit+"です。"+ctx.q+"。";m.textNumbers=[r,B];}
    m.patternId="percent_part:bar_percent";m.ctx=ctx;
    if(opt.bus){
      var d=drawDecoy(m,s,ctx.unit,m.quantities.map(function(e){return e.value;}));
      m.quantities.push(Q("bus","count",d,ctx.unit,ctx.extraLabel,true));
      m.unused.push("bus");
      m.text+=ctx.extra.replace("{d}",String(d));
      m.textNumbers.push(d);
    }
    return withDecoy(m,s,ctx,opt.decoyN||0);
  }
  function mRemainder(s,opt){
    opt=opt||{};
    var v=REM_VALS[s.draw("rmv",[0,1,2,3,4,5])],r=v[0],rest=v[1];
    var B=Math.round(rest*100/(100-r)),used=B-rest,ord=s.draw("ordrm",[0,1]);
    var m=base_("remainder_percent","bar_percent");
    if(opt.baseGiven){
      m.quantities=[Q("base","base",B,"円","はじめのお金",true),Q("used","part",used,"円","使った",false),
        Q("rest","part",rest,"円","のこり",false),Q("rate","rate",r,"","",true)];
      m.unknown="rest";
      m.text="はじめに "+B+" 円持っていました。そのうち "+r+"% を使いました。のこりは何円ですか。";
      m.textNumbers=[B,r];
    }else{
      m.quantities=[Q("base","base",B,"円","はじめのお金",false),Q("used","part",used,"円","使った",false),
        Q("rest","part",rest,"円","のこり",true),Q("rate","rate",r,"","",true)];
      m.unknown="base";
      if(ord===0){m.text="持っていたお金の "+r+"% を使ったら、残りが "+rest+" 円でした。はじめは何円ですか。";m.textNumbers=[r,rest];}
      else{m.text="残りが "+rest+" 円になりました。持っていたお金の "+r+"% を使いました。はじめは何円ですか。";m.textNumbers=[rest,r];}
    }
    m.base="base";m.used="used";m.rest="rest";m.rate="rate";
    m.patternId="remainder_percent:bar_percent";m.ctx={unit:"円",decoy:"さいふには べつに {d} 円入っています。"};
    return withDecoy(m,s,m.ctx,opt.decoyN||0);
  }
  function mTwoStep(s,variant,decoyN){
    var v=TWOSTEP_VALS[s.draw("tsv",[0,1,2,3])],B=v[0],r1=v[1],r2=v[2];
    var m=base_("two_step_percent","bar_percent");
    if(variant==="part"){
      var mid=B*(100-r1)/100,fin=mid*(100-r2)/100;
      m.quantities=[Q("base","base",B,"円","もとのねだん",true),Q("mid","part",mid,"円","1回目のあと",false),
        Q("fin","part",fin,"円","さいご",false),Q("ra","rate",r1,"","",true),Q("rb","rate",r2,"","",true),
        Q("ka","rate",100-r1,"","",false),Q("kb","rate",100-r2,"","",false)];
      m.mid="mid";m.keep2="kb";m.step2="part";
      m.text=B+" 円の品物を "+r1+"% 引きにし、そのねだんからさらに "+r2+"% 引きにしました。いくらになりましたか。";
      m.textNumbers=[B,r1,r2];
      m.keepName="のこるねだん";m.cutName=null;
    }else{
      var fin2=B*r2/100;
      m.quantities=[Q("base","base",B,"円","もとのお金",true),
        Q("fin","part",fin2,"円","きょうの分",false),Q("ra","rate",r1,"","",true),Q("rb","rate",r2,"","",true),
        Q("ka","rate",100-r1,"","",false),Q("kb","rate",r2,"","",false)];
      m.mid=null;m.keep2="kb";m.step2="whole";
      m.text=B+" 円のうち、きのうは "+r1+"% を使いました。きょうは、はじめのお金の "+r2+"% を使います。きょう使うのは何円ですか。";
      m.textNumbers=[B,r1,r2];
      m.keepName="のこり";m.cutName="きのう";
    }
    m.base="base";m.final="fin";m.rate1="ra";m.rate2="rb";m.keep1="ka";
    m.unknown="fin";m.patternId="two_step_percent:"+variant+":bar_percent";
    m.ctx={unit:"円",decoy:"さいふには べつに {d} 円入っています。"};
    return withDecoy(m,s,m.ctx,decoyN||0);
  }
  function mRect(s,opt){
    opt=opt||{};
    var ctx=RECT_CTX[s.draw("rcc",[0,1,2])],v=RECT_VALS[s.draw("rcv",[0,1,2,3,4,5,6,7])];
    var per=v[0],n=v[1],total=per*n;
    var m=base_("unit_product","rect");
    var unkWhole=opt.unknownCount?false:true;
    m.quantities=[Q("per","per_unit",per,"円",ctx.per+"のねだん",true),
      Q("n","count",n,ctx.cu,"買った数",!unkWhole?false:true),
      Q("w","total",total,"円","だいきん",unkWhole?false:true)];
    var ordR=s.draw("ordrc",[0,1]);
    if(opt.unknownCount){
      m.quantities[1].given=false;m.quantities[2].given=true;m.unknown="n";
      if(ordR===0){
        m.text=ctx.per+" "+per+" 円の"+ctx.thing+"を何"+ctx.cu+"か買ったら、代金が "+total+" 円でした。何"+ctx.cu+"買いましたか。";
        m.textNumbers=[per,total];
      }else{
        m.text=ctx.thing+"を何"+ctx.cu+"か買って、代金が "+total+" 円でした。"+ctx.thing+"は "+ctx.per+" "+per+" 円です。何"+ctx.cu+"買いましたか。";
        m.textNumbers=[total,per];
      }
    }else{
      m.unknown="w";
      if(ordR===0){
        m.text=ctx.per+" "+per+" 円の"+ctx.thing+"を "+n+" "+ctx.cu+"買いました。代金は何円ですか。";
        m.textNumbers=[per,n];
      }else{
        m.text=ctx.thing+"を "+n+" "+ctx.cu+"買いました。"+ctx.thing+"は "+ctx.per+" "+per+" 円です。代金は何円ですか。";
        m.textNumbers=[n,per];
      }
    }
    m.whole="w";m.per="per";m.count="n";
    m.patternId="unit_product:rect";m.ctx=ctx;
    return withDecoy(m,s,ctx,opt.decoyN||0);
  }
  function mTable(s,opt){
    opt=opt||{};
    var v=TABLE_VALS[s.draw("tbv",[0,1,2,3,4,5,6,7])],d3=v[0],c3=v[1],d4=v[2],c4=v[3];
    var blanks=opt.blanks||2;
    var m=base_("table2","table");
    m.quantities=[Q("da","count",d3,"人","",true),Q("ca","count",c3,"人","",true),
      Q("db","count",d4,"人","",true),Q("cb","count",c4,"人","",true),
      Q("ta","total",d3+c3,"人","",blanks===1),Q("tb","total",d4+c4,"人","",false)];
    m.unknown="tb";
    var t3given=blanks===1||blanks===3;
    m.quantities[4].given=t3given;
    var totals={row:true,col:blanks===3,given:[]};
    if(t3given)totals.given.push({dim:"row",idx:0,qid:"ta"});
    var colFlip=s.draw("tcf",[0,1])===1,txtOrd=s.draw("tto",[0,1,2]);
    var colItems=colFlip?["ねこ","犬"]:["犬","ねこ"];
    var dogCol=colFlip?1:0,catCol=colFlip?0:1;
    m.table={rowLabel:"学年",colLabel:"どうぶつ",rowItems:["3年","4年"],colItems:colItems,
      cellOf:{da:[0,dogCol],ca:[0,catCol],db:[1,dogCol],cb:[1,catCol],ta:[0,0,"rowTotal"],tb:[1,0,"rowTotal"]},
      given:["da","ca","db","cb"],totals:totals,unknownAt:{kind:"rowTotal",r:1}};
    if(txtOrd===0){
      m.text="3 年生は犬が "+d3+" 人、ねこが "+c3+" 人。4 年生は犬が "+d4+" 人、ねこが "+c4+" 人でした。";
      m.textNumbers=[d3,c3,d4,c4];
    }else if(txtOrd===1){
      m.text="3 年生はねこが "+c3+" 人、犬が "+d3+" 人。4 年生はねこが "+c4+" 人、犬が "+d4+" 人でした。";
      m.textNumbers=[c3,d3,c4,d4];
    }else{
      m.text="犬が好きなのは 3 年生が "+d3+" 人、4 年生が "+d4+" 人。ねこが好きなのは 3 年生が "+c3+" 人、4 年生が "+c4+" 人でした。";
      m.textNumbers=[d3,d4,c3,c4];
    }
    if(t3given){m.text+="3 年生は全部で "+(d3+c3)+" 人です。";m.textNumbers.push(d3+c3);}
    m.text+="4 年生は全部で何人ですか。";
    m.blanks=blanks;
    m.patternId="table2:table:"+blanks;m.ctx={unit:"人",decoy:"アンケートに答えなかった人が {d} 人います。"};
    return withDecoy(m,s,m.ctx,opt.decoyN||0);
  }
  function mTablePair(s){
    var m=mTable(s,{blanks:2,decoyN:0});
    m.patternId="table2:table:pair";
    return m;
  }

  /* ---------- problem assemblers (19) ---------- */

  function fp(m){m.patternId=m.patternId+":"+m.textNumbers.join("_");return m;}
  var ANSWER_LV={correct:"all",correct_alternative:[3,8,9,10],role_swap:[4,7,9,10],
    part_whole_mixup:[1,3,5,8,10],base_mixup:[4,5,6,10],relation_mixup:[2,3,10],
    step_base_mixup:[7,10],unknown_misplaced:"all",extra_quantity:[9,10],missing_relation:[9,10]};
  var ZUKEI_NEWLV={bar_series:1,bar_aligned:2,bar_multiple:4,bar_percent:6,rect:8,table:9};
  function answerable(t,lv,zukei){
    var a=ANSWER_LV[t];
    if(a==="all")return true;
    if(a.indexOf(lv)>=0)return true;
    var nl=ZUKEI_NEWLV[zukei];
    return nl!=null&&a.indexOf(nl)>=0;
  }
  function altOpOf(spec){
    if(spec.type==="rect")return "rect";
    if(spec.type==="table")return "table";
    return "rows";
  }
  function qBase(lv,format,kind,model){
    return {cat:"kom_diagram_model",lv:lv,format:format,kind:kind,text:model.text,
      waza:WAZA[lv],patternId:model.patternId,_model:model};
  }
  function insertAns(others,ansLabel,pos){
    var choices=others.slice(0,pos);
    choices.push(ansLabel);
    return choices.concat(others.slice(pos));
  }
  function buildSingleDiag(s,lv,model,ansType,deckTypes){
    var eng=E(),spec=eng.buildSpec(model);
    var fig=eng.mutate(spec,model,ansType,Math.floor(s.random()*4));
    if(!fig)throw new Error("mutate failed "+ansType+" "+model.relation);
    var app=eng.applicableTypes(fig,model);
    if(app.indexOf(ansType)<0)app.push(ansType);
    var ansWord=eng.wordings[ansType];
    /* 肢の組は (Lv, 図のクラス) で固定する。正解の在不在が語彙の手がかりにならない (19.3、検証 32)。
     * 構成: 正しい + ?の場所 + そのクラスの正解デッキの型 + 足りなければ適用可能な型で補完 */
    var order=["correct","unknown_misplaced"]
      .concat(deckTypes||[])
      .concat(["relation_mixup","role_swap","part_whole_mixup","base_mixup","missing_relation","extra_quantity","step_base_mixup"]);
    var set=[];
    order.forEach(function(t){
      if(set.length>=4)return;
      if(app.indexOf(t)<0&&t!==ansType)return;
      var w=eng.wordings[t];
      if(set.indexOf(w)<0)set.push(w);
    });
    if(set.indexOf(ansWord)<0)set[3]=ansWord;
    var pool=set.filter(function(w){return w!==ansWord;});
    if(pool.length<3)throw new Error("choice pool <3 for "+model.relation);
    pool=pool.slice(0,3);
    var pos=s.draw("pos"+lv,[0,1,2,3]);
    var q=qBase(lv,"diagnosis","choice",model);
    q.variant="single";
    q.text=model.text+" 下の図は、この文を表したつもりの図です。図はどうなっていますか。";
    q.figures=[eng.render(fig,model,{})];
    q.choices=insertAns(pool,ansWord,pos);
    q.ans=pos;
    q.errorTypes=[ansType];
    q.patternId=model.patternId+":"+ansType;
    q._specs=[fig];q._correctSpec=spec;q._altOp=altOpOf(spec);
    return q;
  }
  function buildPair(s,lv,model,mainType,outcome,wrongTypes){
    var eng=E(),spec=eng.buildSpec(model),figs,errs;
    if(outcome===0||outcome===1){
      var mut=eng.mutate(spec,model,mainType,Math.floor(s.random()*4));
      if(!mut)throw new Error("pair mutate failed "+mainType);
      figs=outcome===0?[spec,mut]:[mut,spec];
      errs=outcome===0?[null,mainType]:[mainType,null];
    }else if(outcome===2){
      var alt=eng.mutate(spec,model,"correct_alternative",0);
      if(!alt)throw new Error("pair alt failed "+model.relation);
      figs=[spec,alt];errs=[null,null];
    }else{
      var t1=wrongTypes[0],t2=wrongTypes[1];
      var m1=eng.mutate(spec,model,t1,0),m2=eng.mutate(spec,model,t2,1);
      if(!m1||!m2)throw new Error("pair wrong mutate failed");
      figs=[m1,m2];errs=[t1,t2];
    }
    var q=qBase(lv,"diagnosis","choice",model);
    q.variant="pair";
    q.text=model.text+" 文に合っているのはどちらですか。";
    q.figures=[eng.render(figs[0],model,{pair:true}),eng.render(figs[1],model,{pair:true})];
    q.choices=PAIR_CHOICES.slice();
    q.ans=outcome;
    q.errorTypes=errs;
    q.patternId=model.patternId+":pair";
    q._specs=figs;q._correctSpec=spec;q._altOp=altOpOf(spec);
    return q;
  }
  function amountWord(unit){
    if(unit==="cm"||unit==="m")return "長さ";
    if(unit==="円")return "金額";
    return "数";
  }
  function buildFormulation(s,lv,kind,model){
    var eng=E(),spec=eng.buildSpec(model);
    var q=qBase(lv,"formulation","choice",model);
    var aw,others,meta={pattern:false,largest:false};
    var byid={};model.quantities.forEach(function(e){byid[e.id]=e;});
    if(model.relation==="sum_multiple"){
      var un=amountWord(byid[model.base].unit);
      var bn=byid[model.base].label,mn=byid[model.mult].label;
      if(kind==="A"){aw=mn+"の"+un;others=[mn+"と"+bn+"をあわせた"+un,bn+"の半分の"+un,UNKNOWABLE];meta.pattern=true;meta.largest=true;}
      else if(kind==="B"){aw=mn+"と"+bn+"のちがいの"+un;others=[mn+"と"+bn+"をあわせた"+un,bn+"の半分の"+un,UNKNOWABLE];}
      else{aw=UNKNOWABLE;others=[mn+"と"+bn+"をあわせた"+un,bn+"の半分の"+un,mn+"の半分の"+un];}
    }else if(model.relation==="sum_diff"){
      var big=byid[model.parts[0]].label,small=byid[model.parts[1]].label;
      if(kind==="A"){aw="2 本分にあたる金額";others=[big+"の持っているお金",small+"の持っているお金",UNKNOWABLE];}
      else{aw=UNKNOWABLE;others=[big+"の持っているお金",small+"の持っているお金","2 人のお金の半分"];}
    }else{ /* remainder_percent, baseGiven */
      if(kind==="A"){aw="使った分の金額";others=["のこりの金額","使った分とのこりのちがい",UNKNOWABLE];meta.pattern=true;meta.largest=true;}
      else if(kind==="B"){aw="のこりが全体の何%か";others=["のこりの金額","使った分とのこりのちがい",UNKNOWABLE];}
      else{aw=UNKNOWABLE;others=["のこりの金額","使った分とのこりのちがい","はじめの 2 倍の金額"];}
    }
    var pos=s.draw("pos"+lv,[0,1,2,3]);
    if(aw===UNKNOWABLE)others=shuffle(others,s.random);
    else others=shuffle(others,s.random);
    q.text=model.text+" この図を見て、つぎに分かるのはどれですか。計算はしなくてよい。";
    q.figures=[eng.render(spec,model,{})];
    q.choices=insertAns(others,aw,pos);
    q.ans=pos;
    q.errorTypes=[];
    q.patternId=model.patternId+":form"+kind;
    q._specs=[spec];q._correctSpec=spec;q._form={kind:kind,pattern:meta.pattern,largest:meta.largest,correctIsUnknown:false};
    return q;
  }
  function buildFindAll(s,lv,model){
    var eng=E(),q;
    if(model.relation==="remainder_percent"){
      var spec=eng.buildSpec(model);
      var byid={};model.quantities.forEach(function(e){byid[e.id]=e;});
      var r=byid[model.rate].value,rest=byid[model.rest].value;
      var stmts=[
        {t:"のこりの "+rest+" 円は、はじめのお金の "+(100-r)+"% にあたる",ok:true},
        {t:"使った分は "+rest+" 円より多い",ok:r>50},
        {t:"はじめのお金は "+rest+" 円の 2 倍より多い",ok:r>50},
        {t:"のこりの "+rest+" 円は、はじめのお金の "+r+"% にあたる",ok:false},
        {t:"使った分とのこりは同じ長さ",ok:false}
      ];
      stmts=shuffle(stmts,s.random);
      q=qBase(lv,"find_all","find_all",model);
      q.text=model.text+" この正しい図から、計算しないで分かることをぜんぶえらびましょう。";
      q.figures=[eng.render(spec,model,{})];
      q.choices=stmts.map(function(x){return x.t;});
      q.ansSet=stmts.map(function(x,i){return x.ok?i:-1;}).filter(function(i){return i>=0;});
      q._specs=[spec];q._findAll={kind:"figure"};
      q.patternId=model.patternId+":findall";
    }else{
      var mode=lv>=10?"three":"four";
      var byid2={};model.quantities.forEach(function(e){byid2[e.id]=e;});
      var d3=byid2.da.value,c3=byid2.ca.value,d4=byid2.db.value,c4=byid2.cb.value,t3=d3+c3;
      var cellsAll;
      if(mode==="four"){
        model.text="3 年生は全部で "+t3+" 人で、そのうち犬が好きなのは "+d3+" 人。4 年生は犬が "+d4+" 人、ねこが "+c4+" 人でした。";
        model.textNumbers=[t3,d3,d4,c4];
        cellsAll=[
          {t:"3年と犬のます",ok:true},{t:"3年とねこのます",ok:false},{t:"3年の合計のます",ok:true},
          {t:"4年と犬のます",ok:true},{t:"4年とねこのます",ok:true},{t:"4年の合計のます",ok:false}];
      }else{
        model.text="3 年生は全部で "+t3+" 人で、そのうち犬が好きなのは "+d3+" 人。4 年生はねこが "+c4+" 人でした。";
        model.textNumbers=[t3,d3,c4];
        cellsAll=[
          {t:"3年と犬のます",ok:true},{t:"3年とねこのます",ok:false},{t:"3年の合計のます",ok:true},
          {t:"4年とねこのます",ok:true},{t:"4年の合計のます",ok:false},{t:"犬の合計のます",ok:false}];
      }
      var spec2=eng.buildSpec(model);
      spec2.cells=[];spec2.totals.given=[];spec2.unknown={at:{kind:"hidden"}};
      cellsAll=shuffle(cellsAll,s.random);
      q=qBase(lv,"find_all","find_all",model);
      q.text=model.text+" 文を読んで、すぐ数が入るますをぜんぶえらびましょう。";
      q.figures=[eng.render(spec2,model,{})];
      q.choices=cellsAll.map(function(x){return x.t;});
      q.ansSet=cellsAll.map(function(x,i){return x.ok?i:-1;}).filter(function(i){return i>=0;});
      q._specs=[spec2];q._findAll={kind:"table",totalInAns:true};
      q.patternId=model.patternId+":findall";
    }
    q.errorTypes=[];
    return q;
  }
  function buildNormal(s,lv,model){
    var eng=E(),spec=eng.buildSpec(model);
    var byid={};model.quantities.forEach(function(e){byid[e.id]=e;});
    var text,ans,unit="";
    if(model.relation==="sum2"){
      var unk=byid[model.unknown];
      text=(model.unknown==="w")?"あわせた数はいくつですか。":unk.label+"はいくつですか。";
      ans=unk.value;unit=unk.unit;
    }else if(model.relation==="diff2"){
      text="ちがいはいくつですか。";ans=byid[model.diff].value;unit=byid[model.diff].unit;
    }else if(model.relation==="sum_diff"){
      text="2 本分にあたる金額は何円ですか。";ans=byid[model.whole].value-byid[model.diff].value;unit="円";
    }else if(model.relation==="multiple"){
      text=byid[model.mult].label+"はいくつですか。";ans=byid[model.mult].value;unit=byid[model.mult].unit;
    }else if(model.relation==="sum_multiple"){
      if(model.diff){text=(model.k+1)+" つ分にあたる金額は何円ですか。";ans=byid[model.whole].value-byid[model.diff].value;unit="円";}
      else{text="1 つ分にあたる数はいくつですか。";ans=byid[model.base].value;unit=byid[model.base].unit;}
    }else if(model.relation==="percent_part"){
      text=byid[model.part].label+"はいくつですか。";ans=byid[model.part].value;unit=byid[model.part].unit;
    }else if(model.relation==="remainder_percent"){
      text="のこりは全体の何%ですか。";ans=100-byid[model.rate].value;unit="%";
    }else if(model.relation==="unit_product"){
      var unk2=byid[model.unknown];
      text=(model.unknown==="w")?"代金は何円ですか。":"買った数はいくつですか。";
      ans=unk2.value;unit=unk2.unit;
    }else{
      text="犬が好きな人はあわせて何人ですか。";ans=byid.da.value+byid.db.value;unit="人";
    }
    var q=qBase(lv,"normal","num",model);
    q.text=model.text+" 正しい図を見て答えましょう。"+text;
    q.figures=[eng.render(spec,model,{})];
    q.ans=ans;q.unit=unit;
    q.errorTypes=[];
    q.patternId=model.patternId+":normal";
    q._specs=[spec];q._correctSpec=spec;
    return q;
  }

  /* ---------- level orchestration (6) ---------- */

  var PW="part_whole_mixup",UM="unknown_misplaced",RS="role_swap",BM="base_mixup",
      RM="relation_mixup",SB="step_base_mixup",XQ="extra_quantity",MR="missing_relation",
      CO="correct",CA="correct_alternative";
  var DECKS={
    l1s:[PW,PW,PW,UM,UM,UM,CO,CO],
    l2s:[RM,RM,RM,UM,UM,UM,CO,CO],
    l3a:[PW,PW,PW,CA,CA,UM,UM,CO],
    l3b:[RM,RM,RM,RM,UM,UM,UM,CO],
    l4a:[RS,RS,RS,UM,UM,CO,CO,BM],
    l4b:[BM,BM,BM,UM,UM,CO,CO,RS],
    l5a:[PW,PW,PW,BM,BM,BM,CO,CO],
    l5b:[PW,PW,UM,UM,UM,UM,CO,CO],
    l6s:[BM,BM,BM,UM,UM,UM,CO,CO],
    l7a:[RS,RS,RS,UM,UM,UM,CO,CO],
    l7b:[BM,BM,BM,RS,RS,UM,CO,CO],
    l8a:[PW,PW,PW,CA,CA,UM,UM,UM],
    l8b:[BM,BM,BM,UM,UM,UM,CO,CO],
    l9a:[RS,RS,MR,MR,CA,CA,UM,CO],
    l9b:[PW,PW,UM,UM,UM,UM,UM,CO],
    l10a:[MR,MR,MR,PW,PW,UM,CO,CO],
    l10b:[XQ,XQ,XQ,BM,BM,UM,CO,CO],
    dcy:[1,0,0,1,0],
    f3:["A","A","A","A","A","A","A","D"],
    fab:["A","A","A","A","B","B","B","D"],
    pAIW:[0,0,0,1,1,1,3,3],
    pABW:[0,0,0,1,1,1,2,3]
  };
  function dN(s,name,t){
    /* 正答案には使わない数をやや厚めに混ぜる (個数照合の match→正しい を弱める)。決定的な対応にはしない */
    if(t===CO||t===CA)return s.draw(name+"_dcyC",[1,1,0,1,0]);
    return s.draw(name+"_dcy",DECKS.dcy);
  }
  function needDecoy(t){return t===MR;}
  function singleWithDecoy(s,lv,builder,deckName){
    var t=s.draw(deckName,DECKS[deckName]);
    var n=needDecoy(t)?1+s.draw("mrn",[0,1]):dN(s,deckName,t);
    return {q:buildSingleDiag(s,lv,fp(builder(n)),t,DECKS[deckName]),t:t};
  }
  function singleDiffType(s,lv,builder,deckName,exclude){
    var t=s.drawDiff(deckName,DECKS[deckName],exclude);
    var n=needDecoy(t)?1+s.draw("mrn",[0,1]):dN(s,deckName,t);
    return {q:buildSingleDiag(s,lv,fp(builder(n)),t,DECKS[deckName]),t:t};
  }
  function generateSet(s,lv){
    var qs=[],a,b;
    if(lv===1){
      qs.push(buildPair(s,1,fp(mSum2(s,0)),s.draw("p1t",[PW,PW,UM]),s.draw("p1o",DECKS.pAIW),[PW,UM]));
      a=singleWithDecoy(s,1,function(n){return mSum2(s,n);},"l1s");
      qs.push(a.q);qs.push(buildNormal(s,1,a.q._model));
      b=singleDiffType(s,1,function(n){return mSum2(s,n);},"l1s",a.t);
      qs.push(b.q);qs.push(buildNormal(s,1,b.q._model));
    }else if(lv===2){
      var o2=s.draw("p2o",DECKS.pABW),wantSum=s.draw("rel2",[true,false]);
      if(o2===2)wantSum=false;
      qs.push(buildPair(s,2,fp(mDiff2(s,wantSum,0)),RM,o2,[RM,UM]));
      var f2=s.draw("rel2b",[true,false]);
      a=singleWithDecoy(s,2,function(n){return mDiff2(s,f2,n);},"l2s");
      qs.push(a.q);qs.push(buildNormal(s,2,a.q._model));
      b=singleDiffType(s,2,function(n){return mDiff2(s,!f2,n);},"l2s",a.t);
      qs.push(b.q);qs.push(buildNormal(s,2,b.q._model));
    }else if(lv===3){
      qs.push(buildPair(s,3,fp(mSumDiff(s,0)),PW,s.draw("p3o",DECKS.pABW),[PW,UM]));
      a=singleWithDecoy(s,3,function(n){return mSumDiff(s,n);},"l3a");
      qs.push(a.q);qs.push(buildNormal(s,3,a.q._model));
      var f3rel=s.draw("rel3",[true,false]);
      b=singleWithDecoy(s,3,function(n){return mDiff2(s,f3rel,n);},"l3b");
      qs.push(b.q);
      qs.push(buildFormulation(s,3,s.draw("f3",DECKS.f3),fp(mSumDiff(s,0))));
    }else if(lv===4){
      qs.push(buildPair(s,4,fp(mMultiple(s,0)),BM,s.draw("p4o",DECKS.pABW),[BM,RS]));
      a=singleWithDecoy(s,4,function(n){return mMultiple(s,n);},"l4a");
      qs.push(a.q);qs.push(buildNormal(s,4,a.q._model));
      b=singleWithDecoy(s,4,function(n){return mMultiple(s,n);},"l4b");
      qs.push(b.q);
      qs.push(buildFormulation(s,4,s.draw("f4",DECKS.fab),fp(mSumMultiple(s,{unknownWhole:true}))));
    }else if(lv===5){
      qs.push(buildPair(s,5,fp(mSumMultiple(s,{})),PW,s.draw("p5o",DECKS.pAIW),[PW,BM]));
      a=singleWithDecoy(s,5,function(n){return mSumMultiple(s,{decoyN:n});},"l5a");
      qs.push(a.q);qs.push(buildNormal(s,5,a.q._model));
      b=singleWithDecoy(s,5,function(n){return mSum2(s,n);},"l5b");
      qs.push(b.q);
      qs.push(buildFormulation(s,5,s.draw("f5",DECKS.fab),fp(mSumMultiple(s,{unknownWhole:true}))));
    }else if(lv===6){
      qs.push(buildPair(s,6,fp(mPercentPart(s,{})),BM,s.draw("p6o",DECKS.pAIW),[BM,UM]));
      a=singleWithDecoy(s,6,function(n){return mPercentPart(s,{decoyN:n});},"l6s");
      qs.push(a.q);qs.push(buildNormal(s,6,a.q._model));
      b=singleDiffType(s,6,function(n){return mPercentPart(s,{decoyN:n});},"l6s",a.t);
      qs.push(b.q);
      qs.push(buildFormulation(s,6,s.draw("f6",DECKS.fab),fp(mSumMultiple(s,{unknownWhole:true}))));
    }else if(lv===7){
      var v7=s.draw("v7",["part","whole"]);
      qs.push(buildPair(s,7,fp(mTwoStep(s,v7,0)),SB,s.draw("p7o",DECKS.pAIW),[SB,UM]));
      a=singleWithDecoy(s,7,function(n){return mRemainder(s,{decoyN:n});},"l7a");
      qs.push(a.q);qs.push(buildNormal(s,7,a.q._model));
      b=singleWithDecoy(s,7,function(n){return mMultiple(s,n);},"l7b");
      qs.push(b.q);
      qs.push(buildFindAll(s,7,a.q._model));
    }else if(lv===8){
      var o8=s.draw("p8o",DECKS.pABW);
      if(o8===3)qs.push(buildPair(s,8,fp(mPercentPart(s,{})),BM,o8,[BM,UM]));
      else qs.push(buildPair(s,8,fp(mRect(s,{unknownCount:true})),PW,o8,[PW,UM]));
      a=singleWithDecoy(s,8,function(n){return mRect(s,{decoyN:n});},"l8a");
      qs.push(a.q);qs.push(buildNormal(s,8,a.q._model));
      b=singleWithDecoy(s,8,function(n){return mPercentPart(s,{decoyN:n});},"l8b");
      qs.push(b.q);
      qs.push(buildFormulation(s,8,s.draw("f8",DECKS.fab),fp(mRemainder(s,{baseGiven:true}))));
    }else if(lv===9){
      qs.push(buildPair(s,9,fp(mTablePair(s)),RS,s.draw("p9o",DECKS.pABW),[RS,UM]));
      var b9=s.draw("b9",[1,2,3]);
      a=singleWithDecoy(s,9,function(n){return mTable(s,{blanks:b9,decoyN:n});},"l9a");
      qs.push(a.q);qs.push(buildNormal(s,9,a.q._model));
      b=singleWithDecoy(s,9,function(n){return mSum2(s,n);},"l9b");
      qs.push(b.q);
      qs.push(buildFindAll(s,9,fp(mTable(s,{blanks:2}))));
    }else{
      var o10=s.draw("p10o",DECKS.pABW),z=s.draw("p10z",["rect","bp","bm5"]);
      if(o10===2)z="rect";
      if(o10===3&&z==="rect")z="bp";
      var pq;
      if(z==="rect")pq=buildPair(s,10,fpAvoid(s,function(){return mRect(s,{unknownCount:true});}),PW,o10,[PW,UM]);
      else if(z==="bp")pq=buildPair(s,10,fpAvoid(s,function(){return mPercentPart(s,{});}),BM,o10,[BM,UM]);
      else pq=buildPair(s,10,fpAvoid(s,function(){return mSumMultiple(s,{});}),PW,o10,[PW,BM]);
      qs.push(pq);
      var t10=s.draw("l10a",DECKS.l10a);
      var n10=needDecoy(t10)?1+s.draw("mrn",[0,1]):dN(s,"l10a");
      a={q:buildSingleDiag(s,10,fpAvoid(s,function(){return mSumMultDiff(s,n10);}),t10,DECKS.l10a),t:t10};
      qs.push(a.q);qs.push(buildNormal(s,10,a.q._model));
      var t10b=s.draw("l10b",DECKS.l10b);
      var m10b=fpAvoid(s,function(){return mPercentPart(s,{bus:true,decoyN:t10b===MR?1:0});});
      qs.push(buildSingleDiag(s,10,m10b,t10b,DECKS.l10b));
      qs.push(buildFindAll(s,10,fpAvoid(s,function(){return mTable(s,{blanks:2});})));
      qs.forEach(function(qq){
        s.recent.push(qq.patternId);
        if(s.recent.length>24)s.recent.shift();
      });
    }
    return qs;
  }
  function fpAvoid(s,builder){
    /* 直近 12 問 (自セットの残り分を含め 11 件) の patternId を避けて抽選する (8 章 Lv10) */
    var m=fp(builder()),i;
    for(i=0;i<8;i++){
      var win=s.recent.slice(-11);
      var hit=win.some(function(p){return p.indexOf(m.patternId)===0;});
      if(!hit)break;
      m=fp(builder());
    }
    return m;
  }

  /* ---------- explanation cards (10.1) ---------- */

  function explainCard(q){
    var lvW=q.waza||WAZA[q.lv],eng=E();
    if(q.format==="formulation"||q.format==="find_all"){
      return {branch:"reading",text:"図の区間のくらべ方と目もりの読みで、分かることを 1 つずつたしかめよう。2 手かかる量は、まだ分からない。"};
    }
    if(q.format==="normal"){
      return {branch:"reading",text:"正しい図から 1 手で読める数だ。"+lvW.primary+"。"};
    }
    var e;
    if(q.variant==="pair"){
      if(q.ans===2)return {branch:"correct_alternative",text:"どちらもあっている。"+ALT_SENTENCES[q._altOp]+" "+lvW.alternate+"。"};
      if(q.ans===3)return {branch:"error",text:"どちらの図もこわれている。一方は「"+eng.wordings[q.errorTypes[0]]+"」、もう一方は「"+eng.wordings[q.errorTypes[1]]+"」。"+lvW.primary+"。"};
      e=q.errorTypes[q.ans===0?1:0];
      return {branch:"error",text:"もう一方の図は「"+eng.wordings[e]+"」。正しい図とならべて、こわれた対応を 1 つさがそう。"+lvW.primary+"。"};
    }
    e=q.errorTypes[0];
    if(e===CO)return {branch:"correct",text:"あっている。"+lvW.primary+"。"};
    if(e===CA)return {branch:"correct_alternative",text:"あっている。"+ALT_SENTENCES[q._altOp]+" "+lvW.alternate+"。"};
    return {branch:"error",text:"この図は「"+eng.wordings[e]+"」。正図とならべて、なおすところを 1 つ見つけよう。"+lvW.primary+"。"};
  }

  function buildSet(lv,random){
    var s=createSession(random);
    return generateSet(s,lv);
  }

  global.Q4B_KOMOREBI_DIAGRAM_MODEL={
    pairChoices:PAIR_CHOICES,unknowable:UNKNOWABLE,waza:WAZA,altSentences:ALT_SENTENCES,
    formatMix:FORMAT_MIX,decks:DECKS,
    createSession:createSession,generateSet:generateSet,buildSet:buildSet,
    explainCard:explainCard,
    _models:{mSum2:mSum2,mDiff2:mDiff2,mSumDiff:mSumDiff,mMultiple:mMultiple,
      mSumMultiple:mSumMultiple,mSumMultDiff:mSumMultDiff,mPercentPart:mPercentPart,
      mRemainder:mRemainder,mTwoStep:mTwoStep,mRect:mRect,mTable:mTable,fp:fp}
  };
})(window);
