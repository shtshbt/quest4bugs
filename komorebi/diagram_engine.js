/* komorebi diagram engine (kom_diagram_model)
 * spec layer per docs/komorebi_diagram_model_curriculum.md v0.3.4
 * 3 layers: semantic model -> figure spec (no values, no lengths) -> deterministic SVG.
 * No Math.random / Date.now. Labels escaped here (15.2-6).
 */
(function(global){
  "use strict";

  var WORDINGS={
    correct:"正しい",
    correct_alternative:"正しい",
    role_swap:"2 つの数のつけ場所が入れかわっている",
    part_whole_mixup:"部分と全体を取りちがえている",
    base_mixup:"1とみる量がちがう",
    relation_mixup:"あわせる形とくらべる形がちがう",
    step_base_mixup:"2 回目をもとの全体からとっている",
    unknown_misplaced:"?の場所がちがう",
    extra_quantity:"使わない数まで図に入れている",
    missing_relation:"わかっている数が図にない"
  };
  var ERROR_TYPES=Object.keys(WORDINGS);
  var VIEWBOX={
    bar_single:[320,130],table_single:[320,130],
    pair:[188,128],rect:[180,100]
  };
  var DISPLAY_W={bar_single:343,table_single:343,pair:161,rect_single:220,rect_pair:161};
  var FONT=14,STROKE=2,LEADER_MIN_PX=40;

  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function clone(o){return JSON.parse(JSON.stringify(o));}
  function byId(model){
    var map={};
    model.quantities.forEach(function(q){map[q.id]=q;});
    return map;
  }
  function q(model,qid){return qid==null?null:byId(model)[qid]||null;}
  function valOf(model,qid){var e=q(model,qid);return e?e.value:null;}
  function labelOf(model,qid){var e=q(model,qid);return e?e.label:null;}
  function unitOf(model,qid){var e=q(model,qid);return e&&e.unit?e.unit:"";}
  function givens(model){
    return model.quantities.filter(function(e){return e.given&&(model.unused||[]).indexOf(e.id)<0;});
  }

  /* ---------- correct spec builders ---------- */

  function seg(id,qid,name,len){return {id:id,qid:qid==null?null:qid,name:name==null?null:name,len:len};}
  function lenVal(qid){return {k:"val",qid:qid};}
  function lenRate(qid){return {k:"rate",qid:qid};}
  function lenRest(qid){return {k:"restRate",qid:qid};}
  function lenUnit(qid){return {k:"unit",qid:qid};}

  function buildSpec(model){
    var r=model.relation,m,rows,marks,unknown,parent=null,axis=null;
    var wq=model.whole,bq=model.base,uq=model.unknown;
    if(r==="sum2"){
      rows=[{id:"r1",align:"series",name:null,nameQid:null,segments:[
        seg("s1",model.parts[0],labelOf(model,model.parts[0]),lenVal(model.parts[0])),
        seg("s2",model.parts[1],labelOf(model,model.parts[1]),lenVal(model.parts[1]))]}];
      marks=[{kind:"brace",qid:wq,row:"r1",from:"s1",to:"s2"}];
      unknown=(uq===wq)?{at:{kind:"mark",idx:0}}:{at:{kind:"seg",row:"r1",seg:uq===model.parts[0]?"s1":"s2"}};
    }else if(r==="diff2"){
      rows=[
        {id:"r1",align:"aligned",name:labelOf(model,model.parts[0]),nameQid:model.parts[0],rowQid:model.parts[0],
         segments:[seg("s1",model.parts[0],null,lenVal(model.parts[0]))]},
        {id:"r2",align:"aligned",name:labelOf(model,model.parts[1]),nameQid:model.parts[1],rowQid:model.parts[1],
         segments:[seg("s2",model.parts[1],null,lenVal(model.parts[1]))]}];
      marks=[{kind:"gap",qid:model.diff,row:"r1",vs:"r2"}];
      unknown=(uq===model.diff)?{at:{kind:"mark",idx:0}}:{at:{kind:"row",row:uq===model.parts[0]?"r1":"r2"}};
    }else if(r==="sum_diff"){
      rows=[
        {id:"r1",align:"aligned",name:labelOf(model,model.parts[0]),nameQid:model.parts[0],rowQid:model.parts[0],
         segments:[seg("s1",null,null,lenVal(model.parts[1])),seg("s2",model.diff,null,lenVal(model.diff))]},
        {id:"r2",align:"aligned",name:labelOf(model,model.parts[1]),nameQid:model.parts[1],rowQid:model.parts[1],
         segments:[seg("s3",null,null,lenVal(model.parts[1]))]}];
      marks=[{kind:"vbrace",qid:wq,rows:["r1","r2"]}];
      unknown={at:{kind:"row",row:uq===model.parts[0]?"r1":"r2"}};
    }else if(r==="multiple"){
      var mult=model.mult,k=model.k,msegs=[],i;
      for(i=0;i<k;i++)msegs.push(seg("m"+i,i===0?mult:null,null,lenUnit(bq)));
      rows=[
        {id:"r1",align:"aligned",name:labelOf(model,bq),nameQid:bq,rowQid:bq,unit:true,
         segments:[seg("s1",bq,null,lenUnit(bq))]},
        {id:"r2",align:"aligned",name:labelOf(model,mult),nameQid:mult,rowQid:mult,
         segments:msegs}];
      marks=[];
      unknown={at:{kind:"row",row:uq===bq?"r1":"r2"}};
    }else if(r==="sum_multiple"){
      var mu=model.mult,segs=[seg("s1",bq,labelOf(model,bq),lenUnit(bq)),
        seg("s2",mu,labelOf(model,mu),lenUnit(bq))];
      for(i=1;i<model.k;i++)segs.push(seg("s"+(i+2),null,null,lenUnit(bq)));
      var lastId="s"+(model.k+1);
      if(model.diff){segs.push(seg("sd",model.diff,labelOf(model,model.diff),lenVal(model.diff)));lastId="sd";}
      rows=[{id:"r1",align:"series",name:null,nameQid:null,segments:segs,unitQid:bq}];
      marks=[{kind:"brace",qid:wq,row:"r1",from:"s1",to:lastId}];
      unknown=(uq===wq)?{at:{kind:"mark",idx:0}}:{at:{kind:"seg",row:"r1",seg:uq===bq?"s1":"s2"}};
    }else if(r==="percent_part"){
      rows=[{id:"r1",align:"band",name:null,nameQid:null,segments:[
        seg("s1",model.part,labelOf(model,model.part),lenRate(model.rate)),
        seg("s2",null,model.restName||null,lenRest(model.rate))]}];
      marks=[{kind:"band",qid:bq,row:"r1"}];
      axis={ticks:[0,valOf(model,model.rate),100]};
      unknown=(uq===bq)?{at:{kind:"mark",idx:0}}:{at:{kind:"seg",row:"r1",seg:"s1"}};
    }else if(r==="remainder_percent"){
      rows=[{id:"r1",align:"band",name:null,nameQid:null,segments:[
        seg("s1",model.used,labelOf(model,model.used),lenRate(model.rate)),
        seg("s2",model.rest,labelOf(model,model.rest),lenRest(model.rate))]}];
      marks=[{kind:"band",qid:bq,row:"r1"}];
      axis={ticks:[0,valOf(model,model.rate),100]};
      unknown=(uq===bq)?{at:{kind:"mark",idx:0}}:{at:{kind:"seg",row:"r1",seg:uq===model.used?"s1":"s2"}};
    }else if(r==="two_step_percent"){
      var keep1=100-valOf(model,model.rate1),keep2=100-valOf(model,model.rate2);
      rows=[
        {id:"r1",align:"band",name:null,nameQid:null,segments:[
          seg("s1",null,model.keepName||null,lenRate(model.keep1)),
          seg("s2",null,model.cutName||null,lenRest(model.keep1))]},
        {id:"r2",align:"band",name:null,nameQid:null,segments:[
          seg("s3",model.final,labelOf(model,model.final),lenRate(model.keep2)),
          seg("s4",null,null,lenRest(model.keep2))]}];
      marks=[{kind:"band",qid:bq,row:"r1"}];
      if(model.mid)marks.push({kind:"band",qid:model.mid,row:"r2"});
      parent=(model.step2==="part")?{row:"r1",from:"s1",to:"s1"}:{row:"r1",from:"s1",to:"s2"};
      axis={ticks:[0,keep1,100],ticks2:[0,keep2,100]};
      unknown={at:{kind:"seg",row:"r2",seg:"s3"}};
    }else if(r==="unit_product"){
      return {type:"rect",zukei:"rect",
        axes:{vertical:{qid:model.per},horizontal:{qid:model.count}},
        area:{qid:wq},
        unknown:{at:{kind:"slot",slot:uq===wq?"area":(uq===model.per?"vertical":"horizontal")}},
        meta:{relation:r,baseQid:null,unknownQid:uq,wholeQid:wq}};
    }else if(r==="table2"){
      return buildTableSpec(model);
    }else{
      throw new Error("unknown relation "+r);
    }
    return {type:"bar",zukei:model.zukei,rows:rows,marks:marks,unknown:unknown,
      percentAxis:axis,parent:parent,
      meta:{relation:r,baseQid:bq||null,unknownQid:uq,wholeQid:wq||null}};
  }

  function buildTableSpec(model){
    var t=model.table,cells=[];
    t.given.forEach(function(qid){
      var rc=t.cellOf[qid];
      cells.push({r:rc[0],c:rc[1],qid:qid});
    });
    return {type:"table",zukei:"table",
      rowAxis:{label:t.rowLabel,items:t.rowItems.slice()},
      colAxis:{label:t.colLabel,items:t.colItems.slice()},
      cells:cells,totals:clone(t.totals),
      unknown:{at:clone(t.unknownAt)},
      meta:{relation:"table2",baseQid:null,unknownQid:model.unknown,wholeQid:null,
        cellOf:clone(t.cellOf)}};
  }

  /* ---------- structural helpers ---------- */

  function rowById(spec,id){
    for(var i=0;i<spec.rows.length;i++)if(spec.rows[i].id===id)return spec.rows[i];
    return null;
  }
  function segsInRange(row,from,to){
    var out=[],on=false;
    row.segments.forEach(function(s){
      if(s.id===from)on=true;
      if(on)out.push(s);
      if(s.id===to)on=false;
    });
    return out;
  }
  function collectQids(spec){
    var out=[];
    function add(x){if(x!=null&&out.indexOf(x)<0)out.push(x);}
    if(spec.type==="bar"){
      spec.rows.forEach(function(r){
        add(r.rowQid);add(r.nameQid);
        r.segments.forEach(function(s){
          add(s.qid);
          if(s.len&&(s.len.k==="rate"||s.len.k==="restRate"))add(s.len.qid);
        });
      });
      spec.marks.forEach(function(m){add(m.qid);});
    }else if(spec.type==="rect"){
      add(spec.axes.vertical.qid);add(spec.axes.horizontal.qid);add(spec.area.qid);
    }else{
      spec.cells.forEach(function(c){add(c.qid);});
      (spec.totals.given||[]).forEach(function(g){add(g.qid);});
    }
    return out;
  }
  function locQid(spec,at,model){
    if(at.kind==="seg"){var r=rowById(spec,at.row);for(var i=0;i<r.segments.length;i++)if(r.segments[i].id===at.seg)return r.segments[i].qid;return null;}
    if(at.kind==="row"){return rowById(spec,at.row).rowQid;}
    if(at.kind==="mark"){return spec.marks[at.idx]?spec.marks[at.idx].qid:null;}
    if(at.kind==="slot"){return at.slot==="area"?spec.area.qid:spec.axes[at.slot].qid;}
    if(at.kind==="cell"||at.kind==="rowTotal"||at.kind==="colTotal"){
      return tableExpectedQid(spec,at,model);
    }
    return null;
  }
  function tableExpectedQid(spec,at,model){
    var m=spec.meta.cellOf,best=null;
    Object.keys(m).forEach(function(qid){
      var rc=m[qid];
      if(at.kind==="cell"&&rc[0]===at.r&&rc[1]===at.c&&rc.length===2)best=qid;
      if(at.kind==="rowTotal"&&rc[0]===at.r&&rc[2]==="rowTotal")best=qid;
      if(at.kind==="colTotal"&&rc[1]===at.c&&rc[2]==="colTotal")best=qid;
    });
    return best;
  }
  function lenNumber(spec,model,s){
    if(s.len.k==="val")return valOf(model,s.len.qid);
    if(s.len.k==="unit")return valOf(model,s.len.qid);
    if(s.len.k==="rate")return valOf(model,s.len.qid);
    if(s.len.k==="restRate")return 100-valOf(model,s.len.qid);
    return 0;
  }

  /* ---------- canonical (18) ---------- */

  function canonical(spec,model){
    if(spec.type==="rect"){
      var edges=[String(valOf(model,spec.axes.vertical.qid)),String(valOf(model,spec.axes.horizontal.qid))].sort();
      return JSON.stringify({t:"rect",area:spec.area.qid,edges:[spec.axes.vertical.qid,spec.axes.horizontal.qid].sort(),
        ev:edges,unk:locQid(spec,spec.unknown.at,model)});
    }
    if(spec.type==="table"){
      var ra=spec.rowAxis,ca=spec.colAxis,flip=String(ra.label)>String(ca.label);
      var cells=spec.cells.map(function(c){
        var ri=ra.items[c.r],ci=ca.items[c.c];
        return (flip?[ci,ri]:[ri,ci]).concat([c.qid]).join("|");
      }).sort();
      var tot=[];
      (spec.totals.given||[]).forEach(function(g){tot.push((flip?"c":"r")+g.of+"|"+g.qid);});
      var unk=spec.unknown.at;
      var unkKey=unk.kind==="cell"
        ?(flip?[ca.items[unk.c],ra.items[unk.r]]:[ra.items[unk.r],ca.items[unk.c]]).join("|")
        :(unk.kind==="rowTotal"?(flip?"ct|":"rt|")+ra.items[unk.r]:(flip?"rt|":"ct|")+ca.items[unk.c]);
      return JSON.stringify({t:"table",axes:[ra.label,ca.label].sort(),cells:cells,tot:tot.sort(),unk:unkKey});
    }
    var unkQ=null,unkAt=spec.unknown.at;
    var rows=spec.rows.map(function(r){
      var segKeys;
      if(r.align==="series"){
        var groups=[],cur=null;
        r.segments.forEach(function(s){
          if(s.qid!=null||cur==null){cur={qid:s.qid||"-",name:s.name||"-",lk:s.len.k,units:0,len:0};groups.push(cur);}
          cur.units+=1;cur.len+=lenNumber(spec,model,s);
        });
        segKeys=groups.map(function(g){return [g.qid,g.name,g.lk,g.units,g.len].join("|");}).sort();
      }else{
        segKeys=r.segments.map(function(s){
          return [s.qid||"-",s.name||"-",s.len.k+":"+lenNumber(spec,model,s)].join("|");
        });
      }
      var nm=r.nameQid?labelOf(model,r.nameQid):(r.name||"-");
      return [r.align,r.rowQid||"-",nm,segKeys.join(";")].join("#");
    }).sort();
    var marks=spec.marks.map(function(m,i){
      var cover;
      if(m.kind==="brace")cover=segsInRange(rowById(spec,m.row),m.from,m.to).map(function(s){return s.qid||s.len.k+lenNumber(spec,model,s);}).sort().join(",");
      else if(m.kind==="vbrace")cover=m.rows.slice().sort().map(function(rid){var rr=rowById(spec,rid);return rr.rowQid||"-";}).sort().join(",");
      else if(m.kind==="band")cover="band:"+m.row;
      else cover="gap";
      return [m.kind,m.qid||"-",cover].join("|");
    }).sort();
    var parentKey="-";
    if(spec.parent){
      var pr=rowById(spec,spec.parent.row);
      var covered=segsInRange(pr,spec.parent.from,spec.parent.to);
      parentKey=covered.length===pr.segments.length?"whole":"part:"+covered.map(function(s){return s.len.k+lenNumber(spec,model,s);}).join(",");
    }
    var unkKey2;
    if(unkAt.kind==="seg"){var rr2=rowById(spec,unkAt.row),sg=null;rr2.segments.forEach(function(s){if(s.id===unkAt.seg)sg=s;});
      unkKey2="seg:"+(sg.qid||"-")+":"+sg.len.k+lenNumber(spec,model,sg);}
    else if(unkAt.kind==="row")unkKey2="row:"+(rowById(spec,unkAt.row).rowQid||"-");
    else unkKey2="mark:"+(spec.marks[unkAt.idx]?spec.marks[unkAt.idx].qid||"-":"-");
    return JSON.stringify({t:"bar",rel:spec.meta.relation,rows:rows,marks:marks,parent:parentKey,unk:unkKey2});
  }

  /* ---------- condition checker C1-C8 (16, D13: C1 = same level only) ---------- */

  function unitOwners(row){
    var owners={},cur=null;
    row.segments.forEach(function(s){
      if(s.qid!=null)cur=s.qid;
      if(cur!=null)owners[cur]=(owners[cur]||0)+1;
    });
    return owners;
  }
  function isPercentRel(rel){return rel==="percent_part"||rel==="remainder_percent"||rel==="two_step_percent";}
  function checkConditions(spec,model){
    var broken=[],rel=spec.meta.relation,qids=collectQids(spec),unused=model.unused||[];
    if(qids.some(function(id){return unused.indexOf(id)>=0;}))broken.push("C7");
    var gv=givens(model).filter(function(e){return e.role!=="rate";}).map(function(e){return e.id;});
    if(gv.some(function(id){return qids.indexOf(id)<0;}))broken.push("C8");
    if(locQid(spec,spec.unknown.at,model)!==model.unknown)broken.push("C6");
    var c4=false;
    if(rel==="sum2"&&!(spec.rows.length===1&&spec.rows[0].align==="series"))c4=true;
    if(rel==="diff2"&&!(spec.rows.length===2&&spec.rows[0].align==="aligned"))c4=true;
    if(c4){broken.push("C4");return broken;}
    if(spec.type==="rect"){
      if(spec.area.qid!==model.whole)broken.push("C2");
      return broken;
    }
    if(spec.type==="table"){
      spec.cells.forEach(function(c){
        if(unused.indexOf(c.qid)>=0)return;
        var rc=spec.meta.cellOf[c.qid];
        if(!rc||rc.length>2)return;
        if(rc[0]!==c.r||rc[1]!==c.c){if(broken.indexOf("C1")<0)broken.push("C1");}
      });
      return broken;
    }
    if(model.whole&&!isPercentRel(rel)){
      var wOk=false,wSeen=false;
      spec.marks.forEach(function(m){
        if(m.qid!==model.whole)return;
        wSeen=true;
        if(m.kind==="brace"){var row=rowById(spec,m.row);wOk=segsInRange(row,m.from,m.to).length===row.segments.length;}
        else if(m.kind==="vbrace")wOk=m.rows.length===spec.rows.length;
      });
      spec.rows.forEach(function(r){r.segments.forEach(function(s){if(s.qid===model.whole)wSeen=true;});});
      if(wSeen&&!wOk)broken.push("C2");
    }
    if(isPercentRel(rel)){
      var band1=null;
      spec.marks.forEach(function(m){if(m.kind==="band"&&m.row===spec.rows[0].id)band1=m;});
      if(band1&&band1.qid!==model.base)broken.push("C3");
    }else if(rel==="multiple"){
      var single=null;
      spec.rows.forEach(function(r){if(r.segments.length===1)single=r;});
      if(!single||single.rowQid!==model.base)broken.push("C3");
    }else if(rel==="sum_multiple"){
      var owners=unitOwners(spec.rows[0]);
      if(owners[model.base]!==1)broken.push("C3");
    }
    if(rel==="two_step_percent"&&spec.parent){
      var pr=rowById(spec,spec.parent.row);
      var cov=segsInRange(pr,spec.parent.from,spec.parent.to);
      var whole=cov.length===pr.segments.length;
      var want=model.step2==="whole";
      if(whole!==want)broken.push("C5");
    }
    var c1=false;
    spec.rows.forEach(function(r){
      if(r.nameQid&&r.rowQid&&r.nameQid!==r.rowQid)c1=true;
      r.segments.forEach(function(s){
        if(s.qid&&unused.indexOf(s.qid)>=0)return;
        if(s.name&&s.qid&&s.name!==labelOf(model,s.qid))c1=true;
      });
    });
    if(rel==="remainder_percent"){
      spec.rows[0].segments.forEach(function(s){
        if(s.len.k==="rate"&&s.qid===model.rest)c1=true;
        if(s.len.k==="restRate"&&s.qid===model.used)c1=true;
      });
    }
    if(rel==="percent_part"){
      spec.rows[0].segments.forEach(function(s){
        if(s.len.k==="restRate"&&s.qid===model.part)c1=true;
      });
    }
    if(c1)broken.push("C1");
    return broken;
  }

  /* ---------- applicability (17, choice level) ---------- */

  function textGivenCount(model){
    /* 本文基準: 本文に現れる数の個数 (倍率・割合・unused を含む)。17 章 missing_relation の適用条件 */
    if(model.textNumbers)return model.textNumbers.length;
    return model.quantities.filter(function(e){return e.given;}).length;
  }
  function applicableTypes(spec,model){
    var rel=spec.meta.relation,out=["correct","unknown_misplaced"];
    if((spec.type==="bar"&&spec.rows.length>=2)||spec.type==="rect"||spec.type==="table")out.push("correct_alternative");
    var sibs=spec.type==="bar"&&spec.rows.length===1&&
      spec.rows[0].segments.filter(function(g){return g.qid!=null;}).length>=2;
    /* rect: 2 辺は同じ階層の兄弟。肢としての適用は付録 A.8 問 2 が規定 (mutator は生成しない) */
    if(spec.type==="table"||spec.type==="rect"||(spec.type==="bar"&&(spec.rows.length>=2||isPercentRel(rel)||sibs)))out.push("role_swap");
    if(rel==="sum2"||rel==="sum_diff"||rel==="sum_multiple"||spec.type==="rect")out.push("part_whole_mixup");
    if(isPercentRel(rel)||rel==="multiple"||rel==="sum_multiple")out.push("base_mixup");
    /* 肢としては和差算にも置ける (付録 A.3 問 2)。mutator は sum2/diff2 のみ */
    if(rel==="sum2"||rel==="diff2"||rel==="sum_diff")out.push("relation_mixup");
    if(spec.parent)out.push("step_base_mixup");
    if((model.unused||[]).length>0)out.push("extra_quantity");
    if(textGivenCount(model)>=3)out.push("missing_relation");
    return out;
  }

  /* ---------- mutators (17; spec only, never SVG, never values) ---------- */

  function placeUnknownAtQid(spec,model,qid){
    if(spec.type==="rect"){
      spec.unknown.at={kind:"slot",slot:spec.area.qid===qid?"area":(spec.axes.vertical.qid===qid?"vertical":"horizontal")};
      return;
    }
    for(var i=0;i<spec.marks.length;i++)if(spec.marks[i].qid===qid){spec.unknown.at={kind:"mark",idx:i};return;}
    for(var r=0;r<spec.rows.length;r++){
      var row=spec.rows[r];
      if(row.rowQid===qid){spec.unknown.at={kind:"row",row:row.id};return;}
      for(var s2=0;s2<row.segments.length;s2++)if(row.segments[s2].qid===qid){spec.unknown.at={kind:"seg",row:row.id,seg:row.segments[s2].id};return;}
    }
  }
  function mutate(spec,model,type,pick){
    pick=pick||0;
    var s=clone(spec),rel=s.meta.relation,row0=s.rows?s.rows[0]:null;
    if(type==="correct")return s;
    if(type==="correct_alternative"){
      if(s.type==="rect"){
        var t=s.axes.vertical;s.axes.vertical=s.axes.horizontal;s.axes.horizontal=t;
        if(s.unknown.at.kind==="slot"&&s.unknown.at.slot!=="area")
          s.unknown.at.slot=s.unknown.at.slot==="vertical"?"horizontal":"vertical";
        return s;
      }
      if(s.type==="table")return transposeTable(s);
      if(s.rows.length>=2){s.rows.reverse();return s;}
      return null;
    }
    if(type==="role_swap"){
      if(s.type==="table"){
        var rowIdx=pick%s.rowAxis.items.length,inRow=s.cells.filter(function(c){return c.r===rowIdx;});
        if(inRow.length<2)inRow=s.cells.filter(function(c){return c.r===(rowIdx+1)%s.rowAxis.items.length;});
        if(inRow.length<2)return null;
        var q1=inRow[0].qid;inRow[0].qid=inRow[1].qid;inRow[1].qid=q1;
        return s;
      }
      if(s.type!=="bar")return null;
      if(rel==="remainder_percent"||rel==="percent_part"){
        var a=row0.segments[0],b=row0.segments[1];
        var tq=a.qid;a.qid=b.qid;b.qid=tq;
        var tn=a.name;a.name=b.name;b.name=tn;
        placeUnknownAtQid(s,model,model.unknown);
        return s;
      }
      if(s.rows.length===1){
        var qsegs=row0.segments.filter(function(g){return g.qid!=null;});
        if(qsegs.length<2)return null;
        var sa=qsegs[0],sb=qsegs[1];
        var n1=sa.name;sa.name=sb.name;sb.name=n1;
        return s;
      }
      if(s.rows.length>=2){
        var ra=s.rows[0],rb=s.rows[1];
        var nq=ra.nameQid;ra.nameQid=rb.nameQid;rb.nameQid=nq;
        var nm=ra.name;ra.name=rb.name;rb.name=nm;
        return s;
      }
      return null;
    }
    if(type==="part_whole_mixup"){
      if(s.type==="rect"){
        var hq=s.axes.horizontal.qid;s.axes.horizontal.qid=s.area.qid;s.area.qid=hq;
        placeUnknownAtQid(s,model,model.unknown);
        return s;
      }
      for(var mi=0;mi<s.marks.length;mi++){
        var mk=s.marks[mi];
        if(mk.qid!==model.whole)continue;
        if(mk.kind==="vbrace"){mk.rows=[mk.rows[pick%mk.rows.length]];return s;}
        if(mk.kind==="brace"){
          var rr=rowById(s,mk.row),withQ=rr.segments.filter(function(g){return g.qid&&g.qid!==model.whole;});
          var anchor=withQ[pick%withQ.length];
          if(rel==="sum_multiple"&&anchor.qid===s.meta.baseQid&&rr.segments.length>2){
            mk.from=rr.segments[1].id;mk.to=rr.segments[rr.segments.length-1].id;
          }else{mk.from=anchor.id;mk.to=anchor.id;}
          return s;
        }
      }
      return null;
    }
    if(type==="base_mixup"){
      if(rel==="multiple"){
        /* 区間の多重度だけを入れかえる。qid は行 (rowQid) が保持し、値ラベル数は変えない (R4) */
        var segsA=s.rows[0].segments,segsB=s.rows[1].segments;
        s.rows[0].segments=segsB.map(function(g,i){return seg("a"+i,null,null,g.len);});
        s.rows[1].segments=segsA.map(function(g,i){return seg("b"+i,null,null,g.len);});
        return s;
      }
      if(rel==="sum_multiple"){
        var x=row0.segments[0],y=row0.segments[1];
        var tq2=x.qid;x.qid=y.qid;y.qid=tq2;
        var tn2=x.name;x.name=y.name;y.name=tn2;
        placeUnknownAtQid(s,model,model.unknown);
        return s;
      }
      if(isPercentRel(rel)){
        var band=null;
        s.marks.forEach(function(m){if(m.kind==="band"&&m.row===row0.id)band=m;});
        var part=row0.segments[0];
        var bq2=band.qid;band.qid=part.qid;part.qid=bq2;
        part.name=part.qid?labelOf(model,part.qid):null;
        placeUnknownAtQid(s,model,model.unknown);
        return s;
      }
      return null;
    }
    if(type==="relation_mixup")return relationFlip(s,model);
    if(type==="step_base_mixup"){
      if(!s.parent)return null;
      var prr=rowById(s,s.parent.row);
      var covAll=segsInRange(prr,s.parent.from,s.parent.to).length===prr.segments.length;
      if(covAll)s.parent={row:prr.id,from:prr.segments[0].id,to:prr.segments[0].id};
      else s.parent={row:prr.id,from:prr.segments[0].id,to:prr.segments[prr.segments.length-1].id};
      return s;
    }
    if(type==="unknown_misplaced")return misplaceUnknown(s,model,pick);
    if(type==="extra_quantity")return addExtra(s,model,pick);
    if(type==="missing_relation")return removeGiven(s,model,pick);
    return null;
  }

  function transposeTable(s){
    var t=s.rowAxis;s.rowAxis=s.colAxis;s.colAxis=t;
    s.cells.forEach(function(c){var r=c.r;c.r=c.c;c.c=r;});
    var m=s.meta.cellOf,nm={};
    Object.keys(m).forEach(function(qid){
      var rc=m[qid];
      if(rc.length>2)nm[qid]=[rc[1],rc[0],rc[2]==="rowTotal"?"colTotal":"rowTotal"];
      else nm[qid]=[rc[1],rc[0]];
    });
    s.meta.cellOf=nm;
    (s.totals.given||[]).forEach(function(g){g.dim=g.dim==="row"?"col":"row";});
    var rt=s.totals.row;s.totals.row=s.totals.col;s.totals.col=rt;
    var at=s.unknown.at;
    if(at.kind==="cell"){var rr=at.r;at.r=at.c;at.c=rr;}
    else if(at.kind==="rowTotal")s.unknown.at={kind:"colTotal",c:at.r};
    else if(at.kind==="colTotal")s.unknown.at={kind:"rowTotal",r:at.c};
    return s;
  }
  function relationFlip(s,model){
    var rel=s.meta.relation;
    if(rel==="sum2"){
      var pA=model.parts[0],pB=model.parts[1];
      s.rows=[
        {id:"r1",align:"aligned",name:labelOf(model,pA),nameQid:pA,rowQid:pA,segments:[seg("s1",pA,null,lenVal(pA))]},
        {id:"r2",align:"aligned",name:labelOf(model,pB),nameQid:pB,rowQid:pB,segments:[seg("s2",pB,null,lenVal(pB))]}];
      s.marks=[{kind:"gap",qid:model.whole,row:"r1",vs:"r2"}];
      placeUnknownAtQid(s,model,model.unknown);
      return s;
    }
    if(rel==="diff2"){
      var a=model.parts[0],b=model.parts[1];
      s.rows=[{id:"r1",align:"series",name:null,nameQid:null,segments:[
        seg("s1",a,labelOf(model,a),lenVal(a)),seg("s2",b,labelOf(model,b),lenVal(b))]}];
      s.marks=[{kind:"brace",qid:model.diff,row:"r1",from:"s1",to:"s2"}];
      placeUnknownAtQid(s,model,model.unknown);
      return s;
    }
    return null;
  }
  function misplaceUnknown(s,model,pick){
    /* ? は与件のある別の場所へだけ移す (元の場所の値ラベルが消えず R4 が保たれる) */
    var spots=[];
    function isGiven(qid){var e=q(model,qid);return !!(e&&e.given);}
    if(s.type==="rect"){
      ["area","vertical","horizontal"].forEach(function(slot){
        var qid=slot==="area"?s.area.qid:s.axes[slot].qid;
        if(qid!==model.unknown&&isGiven(qid))spots.push({kind:"slot",slot:slot});
      });
    }else if(s.type==="table"){
      s.cells.forEach(function(c){if(c.qid!==model.unknown&&isGiven(c.qid))spots.push({kind:"cell",r:c.r,c:c.c});});
    }else{
      s.rows.forEach(function(r){
        if(r.rowQid&&r.rowQid!==model.unknown&&r.segments.length===1&&isGiven(r.rowQid))spots.push({kind:"row",row:r.id});
        r.segments.forEach(function(g){
          if(r.name&&r.rowQid===g.qid)return; /* 行ラベル側が受け持つ */
          if(g.qid&&g.qid!==model.unknown&&isGiven(g.qid))spots.push({kind:"seg",row:r.id,seg:g.id});
        });
      });
      s.marks.forEach(function(m,i){if(m.qid&&m.qid!==model.unknown&&isGiven(m.qid))spots.push({kind:"mark",idx:i});});
    }
    if(!spots.length)return null;
    s.unknown.at=spots[pick%spots.length];
    return s;
  }
  function addExtra(s,model,pick){
    var extras=model.unused||[];
    if(!extras.length)return null;
    var xq=extras[pick%extras.length];
    if(s.type==="table"){
      var empty=[];
      for(var r=0;r<s.rowAxis.items.length;r++)for(var c=0;c<s.colAxis.items.length;c++){
        var used=s.cells.some(function(cc){return cc.r===r&&cc.c===c;});
        var isUnk=s.unknown.at.kind==="cell"&&s.unknown.at.r===r&&s.unknown.at.c===c;
        if(!used&&!isUnk)empty.push([r,c]);
      }
      if(!empty.length)return null;
      s.cells.push({r:empty[0][0],c:empty[0][1],qid:xq});
      return s;
    }
    if(s.type==="bar"){
      for(var i=0;i<s.rows.length;i++){
        var row=s.rows[i];
        for(var j=0;j<row.segments.length;j++){
          var g=row.segments[j];
          var unkHere=s.unknown.at.kind==="seg"&&s.unknown.at.row===row.id&&s.unknown.at.seg===g.id;
          if(g.qid==null&&!unkHere){g.qid=xq;g.name=labelOf(model,xq);return s;}
        }
      }
    }
    return null;
  }
  function removeGiven(s,model,pick){
    var gv=givens(model).map(function(e){return e.id;}),targets=[];
    if(s.type==="table"){
      s.cells.forEach(function(c,i){if(gv.indexOf(c.qid)>=0)targets.push(i);});
      if(!targets.length)return null;
      s.cells.splice(targets[pick%targets.length],1);
      return s;
    }
    if(s.type==="bar"){
      for(var i=0;i<s.rows.length;i++){
        var row=s.rows[i];
        for(var j=0;j<row.segments.length;j++){
          var g=row.segments[j];
          if(g.qid&&gv.indexOf(g.qid)>=0&&g.len.k==="val"&&row.segments.length>1){
            row.segments.splice(j,1);
            s.marks.forEach(function(mm){
              if(mm.kind!=="brace"||mm.row!==row.id)return;
              var ids=row.segments.map(function(x){return x.id;});
              if(ids.indexOf(mm.from)<0)mm.from=ids[0];
              if(ids.indexOf(mm.to)<0)mm.to=ids[ids.length-1];
            });
            return s;
          }
        }
      }
      for(var k2=0;k2<s.marks.length;k2++){
        if(s.marks[k2].qid&&gv.indexOf(s.marks[k2].qid)>=0&&s.marks[k2].kind==="gap"){
          s.marks.splice(k2,1);
          return s;
        }
      }
    }
    return null;
  }

  /* ---------- renderer (15): deterministic, escaped, currentColor ---------- */

  function geomOf(spec,pair){
    if(spec.type==="rect")return {vb:VIEWBOX.rect,dispW:pair?DISPLAY_W.rect_pair:DISPLAY_W.rect_single};
    if(pair)return {vb:VIEWBOX.pair,dispW:DISPLAY_W.pair};
    return {vb:spec.type==="table"?VIEWBOX.table_single:VIEWBOX.bar_single,dispW:DISPLAY_W.bar_single};
  }
  function fmtVal(model,qid){var e=q(model,qid);return e?String(e.value)+(e.unit||""):"";}
  function unknownHere(spec,at){
    var u=spec.unknown.at;
    return JSON.stringify(u)===JSON.stringify(at);
  }
  function valueTextAt(spec,model,qid,at){
    var unk=unknownHere(spec,at);
    var e=q(model,qid);
    if(unk)return (e&&e.given?fmtVal(model,qid):"")+"?";
    if(e&&e.given)return fmtVal(model,qid);
    return null;
  }

  function planBar(spec,model,pair){
    var g=geomOf(spec,pair),vbW=g.vb[0],hasNames=spec.rows.some(function(r){return r.name;});
    var vbr=spec.marks.some(function(m){return m.kind==="vbrace";});
    var L=hasNames?34:8,R=vbr?52:8,W=vbW-L-R,px=g.dispW/vbW;
    var maxLen=0;
    spec.rows.forEach(function(r){
      if(r.align==="band")return;
      var t=0;r.segments.forEach(function(s){t+=lenNumber(spec,model,s);});
      if(t>maxLen)maxLen=t;
    });
    var scale=maxLen>0?W/maxLen:0;
    var items=[],shapes=[],rowTops=[],y=spec.marks.some(function(m){return m.kind==="brace";})?22:14;
    spec.rows.forEach(function(row,ri){
      var top=y,x=L,widths=[],isBand=row.align==="band";
      var bw=W;
      if(isBand&&spec.parent&&ri===1){
        var pr=rowById(spec,spec.parent.row),cov=segsInRange(pr,spec.parent.from,spec.parent.to),cw=0;
        cov.forEach(function(s){cw+=lenNumber(spec,model,s);});
        bw=W*cw/100;
      }
      row.segments.forEach(function(s){
        var n=lenNumber(spec,model,s);
        widths.push(isBand?bw*n/100:n*scale);
      });
      var bandMark=null,bmIdx=-1;
      spec.marks.forEach(function(m,i){if(m.kind==="band"&&m.row===row.id){bandMark=m;bmIdx=i;}});
      if(bandMark){
        var bv=valueTextAt(spec,model,bandMark.qid,{kind:"mark",idx:bmIdx});
        var bnm=labelOf(model,bandMark.qid)||"";
        if(bnm)items.push({text:bnm,x:L,y:top-3,anchor:"start",value:false,num:null,leader:false,name:true});
        if(bv!=null)items.push({text:bv,x:L+bw,y:top-3,anchor:"end",value:true,num:bv!=="?"?valOf(model,bandMark.qid):null,leader:false});
        top+=4;
      }
      if(row.name){
        items.push({text:row.name,x:2,y:top+22,anchor:"start",value:false,num:null,leader:false,name:true});
        var rvAt={kind:"row",row:row.id};
        var rv=row.rowQid?valueTextAt(spec,model,row.rowQid,rvAt):null;
        if(rv!=null){
          var totalW=0;widths.forEach(function(w){totalW+=w;});
          items.push({text:rv,x:L+totalW+4,y:top+22,anchor:"start",value:true,num:rv!=="?"?valOf(model,row.rowQid):null,leader:false});
        }
      }
      row.segments.forEach(function(s,si){
        var w=widths[si],cx=x+w/2;
        shapes.push('<rect x="'+r2s(x)+'" y="'+top+'" width="'+r2s(w)+'" height="36"/>');
        var at={kind:"seg",row:row.id,seg:s.id};
        var dupRow=row.name&&row.rowQid!=null&&row.rowQid===s.qid;
        var vt=(!dupRow&&s.qid!=null)?valueTextAt(spec,model,s.qid,at):((!dupRow&&unknownHere(spec,at))?"?":null);
        var leader=(w*px)<LEADER_MIN_PX&&(s.name||vt);
        if(s.name)items.push({text:s.name,x:cx,y:leader?top-16:top+14,anchor:"middle",value:false,num:null,leader:!!leader,name:true,segPx:w*px});
        if(vt!=null)items.push({text:vt,x:cx,y:leader?top-3:top+30,anchor:"middle",value:true,num:vt!=="?"?valOf(model,s.qid):null,leader:!!leader,segPx:w*px});
        if(leader)shapes.push('<line x1="'+r2s(cx)+'" y1="'+(top-2)+'" x2="'+r2s(cx)+'" y2="'+top+'" data-leader="1"/>');
        if(si>0)shapes.push('<line x1="'+r2s(x)+'" y1="'+top+'" x2="'+r2s(x)+'" y2="'+(top+36)+'"/>');
        x+=w;
      });
      rowTops.push({top:top,right:x,row:row});
      if(isBand&&spec.percentAxis){
        var ticks=(ri===1&&spec.percentAxis.ticks2)?spec.percentAxis.ticks2:spec.percentAxis.ticks;
        var grid=!pair;
        var lblTicks={};ticks.forEach(function(t){lblTicks[t]=1;});
        for(var p=0;p<=100;p+=10){
          if(!grid&&!lblTicks[p])continue;
          var tx=L+bw*p/100;
          if(tx>L+bw+0.01)continue;
          shapes.push('<line x1="'+r2s(tx)+'" y1="'+(top+36)+'" x2="'+r2s(tx)+'" y2="'+(top+42)+'"/>');
        }
        ticks.forEach(function(t){
          var tx=L+bw*t/100;
          items.push({text:String(t)+"%",x:tx,y:top+56,anchor:"middle",value:false,num:null,leader:false,tick:true});
        });
        y=top+62;
      }else{
        y=top+52;
      }
    });
    spec.marks.forEach(function(m,i){
      if(m.kind==="brace"){
        var rt=rowTops[spec.rows.map(function(r){return r.id;}).indexOf(m.row)];
        var row=rt.row,xcur=L,x1=null,x2=null;
        row.segments.forEach(function(s){
          var w=(row.align==="band")?W*lenNumber(spec,model,s)/100:lenNumber(spec,model,s)*scale;
          if(s.id===m.from)x1=xcur;
          if(s.id===m.to)x2=xcur+w;
          xcur+=w;
        });
        if(x1==null)x1=L;
        if(x2==null||x2<x1)x2=x1;
        var by=rt.top-8;
        shapes.push('<path d="M '+r2s(x1)+' '+(by+4)+' L '+r2s(x1)+' '+by+' L '+r2s(x2)+' '+by+' L '+r2s(x2)+' '+(by+4)+'"/>');
        var vt=valueTextAt(spec,model,m.qid,{kind:"mark",idx:i});
        if(vt!=null)items.push({text:vt,x:(x1+x2)/2,y:by-2,anchor:"middle",value:true,num:vt!=="?"?valOf(model,m.qid):null,leader:false});
      }else if(m.kind==="vbrace"){
        var xs=rowTops.map(function(rt2){return rt2.right;});
        var vx=Math.max.apply(null,xs)+8;
        var ids=spec.rows.map(function(r){return r.id;});
        var covTops=m.rows.map(function(rid){return rowTops[ids.indexOf(rid)];});
        var yTop=Math.min.apply(null,covTops.map(function(ct){return ct.top;}));
        var yBot=Math.max.apply(null,covTops.map(function(ct){return ct.top;}))+36;
        shapes.push('<path d="M '+r2s(vx-4)+' '+yTop+' L '+r2s(vx)+' '+yTop+' L '+r2s(vx)+' '+yBot+' L '+r2s(vx-4)+' '+yBot+'"/>');
        var vt2=valueTextAt(spec,model,m.qid,{kind:"mark",idx:i});
        if(vt2!=null)items.push({text:vt2,x:vx+4,y:(yTop+yBot)/2+5,anchor:"start",value:true,num:vt2!=="?"?valOf(model,m.qid):null,leader:false});
      }else if(m.kind==="gap"){
        var rtA=rowTops[0],rtB=rowTops[1];
        var gx1=Math.min(rtA.right,rtB.right),gx2=Math.max(rtA.right,rtB.right);
        var gy=rtA.top+44;
        shapes.push('<path d="M '+r2s(gx1)+' '+(gy-4)+' L '+r2s(gx1)+' '+gy+' L '+r2s(gx2)+' '+gy+' L '+r2s(gx2)+' '+(gy-4)+'"/>');
        var vt3=valueTextAt(spec,model,m.qid,{kind:"mark",idx:i});
        if(vt3!=null)items.push({text:vt3,x:(gx1+gx2)/2,y:gy+16,anchor:"middle",value:true,num:vt3!=="?"?valOf(model,m.qid):null,leader:false});
      }
    });
    return {geom:g,items:items,shapes:shapes};
  }

  function planRect(spec,model,pair){
    var g=geomOf(spec,pair),items=[],shapes=[];
    var RL=48,RT=16,RW=90,RH=60;
    shapes.push('<rect x="'+RL+'" y="'+RT+'" width="'+RW+'" height="'+RH+'"/>');
    var vAt={kind:"slot",slot:"vertical"},hAt={kind:"slot",slot:"horizontal"},aAt={kind:"slot",slot:"area"};
    var vq=spec.axes.vertical.qid,hq=spec.axes.horizontal.qid,aq=spec.area.qid;
    items.push({text:labelOf(model,vq)||"",x:2,y:RT+24,anchor:"start",value:false,num:null,leader:false,name:true});
    var vv=valueTextAt(spec,model,vq,vAt);
    if(vv!=null)items.push({text:vv,x:2,y:RT+40,anchor:"start",value:true,num:vv!=="?"?valOf(model,vq):null,leader:false});
    items.push({text:labelOf(model,hq)||"",x:RL+RW/2,y:RT+RH+14,anchor:"middle",value:false,num:null,leader:false,name:true});
    var hv=valueTextAt(spec,model,hq,hAt);
    if(hv!=null)items.push({text:hv,x:RL+RW/2,y:RT+RH+22,anchor:"middle",value:true,num:hv!=="?"?valOf(model,hq):null,leader:false});
    items.push({text:labelOf(model,aq)||"",x:RL+RW/2,y:RT+26,anchor:"middle",value:false,num:null,leader:false,name:true});
    var av=valueTextAt(spec,model,aq,aAt);
    if(av!=null)items.push({text:av,x:RL+RW/2,y:RT+44,anchor:"middle",value:true,num:av!=="?"?valOf(model,aq):null,leader:false});
    return {geom:g,items:items,shapes:shapes};
  }

  function planTable(spec,model,pair){
    var g=geomOf(spec,pair),items=[],shapes=[];
    var vbW=g.vb[0],vbH=g.vb[1];
    var cols=1+spec.colAxis.items.length+(spec.totals.col?1:0);
    var rows=1+spec.rowAxis.items.length+(spec.totals.row?1:0);
    var L=6,T=8,W=vbW-12,H=vbH-16,cw=W/cols,ch=H/rows;
    for(var i=0;i<=rows;i++)shapes.push('<line x1="'+L+'" y1="'+r2s(T+i*ch)+'" x2="'+r2s(L+W)+'" y2="'+r2s(T+i*ch)+'"/>');
    for(var j=0;j<=cols;j++)shapes.push('<line x1="'+r2s(L+j*cw)+'" y1="'+T+'" x2="'+r2s(L+j*cw)+'" y2="'+r2s(T+H)+'"/>');
    function put(rr,cc,text,isVal,num){
      items.push({text:text,x:L+cc*cw+cw/2,y:T+rr*ch+ch/2+5,anchor:"middle",value:!!isVal,num:num==null?null:num,leader:false,name:!isVal});
    }
    put(0,0,spec.rowAxis.label+"／"+spec.colAxis.label,false,null);
    spec.colAxis.items.forEach(function(cn,ci){put(0,ci+1,cn,false,null);});
    if(spec.totals.col)put(0,cols-1,"合計",false,null);
    spec.rowAxis.items.forEach(function(rn,ri2){put(ri2+1,0,rn,false,null);});
    if(spec.totals.row)put(rows-1,0,"合計",false,null);
    spec.cells.slice().sort(function(a,b){return a.r-b.r||a.c-b.c;}).forEach(function(c){
      var at={kind:"cell",r:c.r,c:c.c};
      var vt=valueTextAt(spec,model,c.qid,at);
      if(vt!=null)put(c.r+1,c.c+1,vt,true,vt!=="?"?valOf(model,c.qid):null);
    });
    (spec.totals.given||[]).forEach(function(tg){
      var at2=tg.dim==="row"?{kind:"rowTotal",r:tg.idx}:{kind:"colTotal",c:tg.idx};
      var vt2=valueTextAt(spec,model,tg.qid,at2);
      if(vt2!=null){
        if(tg.dim==="row")put(tg.idx+1,cols-1,vt2,true,vt2!=="?"?valOf(model,tg.qid):null);
        else put(rows-1,tg.idx+1,vt2,true,vt2!=="?"?valOf(model,tg.qid):null);
      }
    });
    var u=spec.unknown.at;
    if(u.kind==="cell"){
      var filled=spec.cells.some(function(c){return c.r===u.r&&c.c===u.c;});
      if(!filled)put(u.r+1,u.c+1,"?",true,null);
    }else if(u.kind==="rowTotal"){
      var g1=(spec.totals.given||[]).some(function(tg){return tg.dim==="row"&&tg.idx===u.r;});
      if(!g1)put(u.r+1,cols-1,"?",true,null);
    }else if(u.kind==="colTotal"){
      var g2=(spec.totals.given||[]).some(function(tg){return tg.dim==="col"&&tg.idx===u.c;});
      if(!g2)put(rows-1,u.c+1,"?",true,null);
    }
    return {geom:g,items:items,shapes:shapes};
  }

  function r2s(n){return String(Math.round(n*100)/100);}
  function plan(spec,model,opts){
    var pair=!!(opts&&opts.pair);
    if(spec.type==="rect")return planRect(spec,model,pair);
    if(spec.type==="table")return planTable(spec,model,pair);
    return planBar(spec,model,pair);
  }
  function render(spec,model,opts){
    var p=plan(spec,model,opts),vb=p.geom.vb;
    var aria=p.items.map(function(it){return it.text;}).join("、");
    var out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+vb[0]+' '+vb[1]+'" '+
      'preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(aria)+'">';
    out+='<g fill="none" stroke="currentColor" stroke-width="'+STROKE+'">'+p.shapes.join("")+'</g>';
    out+='<g fill="currentColor" stroke="none" font-size="'+FONT+'">';
    p.items.forEach(function(it){
      out+='<text x="'+r2s(it.x)+'" y="'+r2s(it.y)+'" text-anchor="'+(it.anchor||"start")+'"'+
        (it.leader?' data-leader="1"':'')+'>'+esc(it.text)+'</text>';
    });
    out+='</g></svg>';
    return out;
  }
  function countValueLabels(spec,model,opts){
    /* 値と ? が同じ場所に重なる表示 ("12こ?") は値ラベル 2 つと数える (R4) */
    return plan(spec,model,opts).items.reduce(function(acc,it){
      if(!it.value)return acc;
      return acc+((it.text.length>1&&/\?$/.test(it.text))?2:1);
    },0);
  }
  function countMarks(spec){
    if(spec.type==="bar")return spec.marks.length;
    return 0;
  }
  function figureNumbers(spec,model,opts){
    var out=[];
    plan(spec,model,opts).items.forEach(function(it){if(it.value&&it.num!=null)out.push(it.num);});
    return out;
  }
  function labelItems(spec,model,opts){return plan(spec,model,opts).items;}

  global.Q4B_KOMOREBI_DIAGRAM_ENGINE={
    wordings:WORDINGS,errorTypes:ERROR_TYPES,viewbox:VIEWBOX,displayW:DISPLAY_W,
    font:FONT,stroke:STROKE,leaderMinPx:LEADER_MIN_PX,
    esc:esc,clone:clone,valOf:valOf,labelOf:labelOf,unitOf:unitOf,givens:givens,
    buildSpec:buildSpec,canonical:canonical,collectQids:collectQids,locQid:locQid,
    checkConditions:checkConditions,applicableTypes:applicableTypes,mutate:mutate,
    textGivenCount:textGivenCount,
    render:render,countValueLabels:countValueLabels,countMarks:countMarks,
    figureNumbers:figureNumbers,labelItems:labelItems
  };
})(window);
