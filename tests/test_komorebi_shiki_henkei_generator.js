"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(root,"komorebi/shiki_henkei_generator.js"),"utf8");
const context={window:{},Math:Object.assign(Object.create(Math),{random(){throw Error("Math.random");}}),Date:{now(){throw Error("Date.now");}}};
vm.runInThisContext("(function(window,Math,Date){"+source+"})")(context.window,context.Math,context.Date);
const engine=context.window.Q4B_KOMOREBI_SHIKI_HENKEI;
const json=value=>JSON.parse(JSON.stringify(value));
function seeded(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function permutations(a){return a.length<2?[a]:a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(r=>[x,...r]));}
function answer(p){return p.lv===1?p.boxValue:p.lv===10?p.answerSlots:p.answerTerms.flatMap(([n,s],i)=>i?[s===1?"+":"-",String(n)]:[String(n)]);}
function arithmetic(s){let n=Number(s[0]);for(let i=2;i<s.length;i+=2)n+=s[i-1]==="+"?Number(s[i]):-Number(s[i]);return n;}
function assemblies(p){return permutations(Array.from(p.numberCards)).flatMap(n=>p.lv===10?["+","-"].map(o=>[n[0],o,n[1],"=",n[2]]):p.frame.length===3?["+","-"].map(o=>[n[0],o,n[1]]):["+","-"].flatMap(o=>["+","-"].map(v=>[n[0],o,n[1],v,n[2]])));}
const pids=["solve_add_r","solve_sub_r","solve_add_l","solve_sub_l","add_front","sub_back","sub_front","add_front_rev","sub_back_rev","sub_front_rev","both_add_back","both_add_front","both_sub_back","both_sub_front","both_add_back_rev","both_add_front_rev","both_sub_back_rev","both_sub_front_rev","story_inc_start","story_inc_change","story_inc_result","story_dec_start","story_dec_change","story_dec_result"];
const checkedAssemblies=new Set();
function check(p,lv,k){
  assert.equal(p.lv,lv);assert.equal(p.cat,"kom_shiki_henkei");assert.ok(pids.includes(p.patternId));
  assert.equal(p.format,lv===1?"normal":"assemble");assert.equal(p.kind,lv===1?"num":"assemble");
  assert.ok(p.boxValue>=2&&p.boxValue<=(lv===1?99:lv===2?20:lv===10?30:100));
  assert.ok(!/[×÷()]/.test(p.text));if(lv>1)assert.ok(!/いくつ|なんこ/.test(p.text+p.prompt));
  const both=!!p.numbers.c,two=lv>1&&lv<10&&!both,rev=p.orientation==="reversed";
  if(lv===1)assert.match(p.patternId,/^solve_/);else if(lv===2)assert.ok(two&&!rev);else if(lv===3)assert.ok(!rev);else if(lv===4)assert.ok(two||!rev);else if(lv<10){assert.ok(both);if(lv===5)assert.ok(!rev);if(lv===6)assert.ok(rev);}else assert.match(p.patternId,/^story_/);
  let sc=k>=2||lv===9?null:lv===1?"SC_hitori":lv===2?k===0?"SC_rei":"SC_zenbu":lv===10?"SC_junban":both?"SC_ryougawa":"SC_zenbu";
  assert.equal(p.scaffold&&p.scaffold.id,sc);
  assert.equal(p.waza.primary,lv===1?"WZ_hitori":lv===10?"WZ_junban":both?"WZ_hitotsu":"WZ_zenbu");
  assert.equal(p.waza.alternate,lv===1?null:lv===10?"WZ_ohanashi":rev?"WZ_muki":"WZ_tashikame");
  assert.equal(engine.judge(p,answer(p)),true);
  if(lv===1){const {a,b}=p.numbers,add=p.patternId.includes("add");assert.ok(a>=11&&a<=89&&(b>=2&&b<=9||b>=11&&b<=89));assert.ok(add?a%10+b%10<=9&&Math.floor(a/10)+Math.floor(b/10)<=9:a%10>=b%10&&Math.floor(a/10)>=Math.floor(b/10));return;}
  assert.deepEqual(json(p.operatorCards),["+","-"]);
  let accepted;
  const {a,b,c,d}=p.numbers;
  if(lv===10)accepted=[p.answerSlots.join("")];
  else if(both)accepted=p.type==="T_SB"?[`${a}-${b}-${c}`,`${a}-${c}-${b}`]:p.type==="T_SF"?permutations([a,b,c]).map(n=>n.join("+")):[`${b}+${c}-${a}`,`${c}+${b}-${a}`];
  else accepted=p.type==="T_SF"?[`${a}+${d}`,`${d}+${a}`]:[`${Math.max(a,d)}-${Math.min(a,d)}`];
  const signature=JSON.stringify([p.kind,p.lv===10,p.type,p.numbers,p.boxValue,p.answerTerms,p.answerSlots]);
  if(!checkedAssemblies.has(signature))for(const slots of assemblies(p)){
    const correct=accepted.includes(slots.join("")),tags=engine.diagnose(p,slots);
    assert.equal(engine.judge(p,slots),correct);assert.equal(tags.length===0,correct);
    if(!correct)assert.ok(tags.length>=1&&tags.length<=3);
  }
  checkedAssemblies.add(signature);
  const visible=(p.text.match(/\d+|□/g)||[]).filter(s=>lv===10||s!=="□");
  assert.deepEqual(Array.from(p.numberCards).sort(),visible.sort());
  if(lv===10){assert.equal((p.text.match(/□/g)||[]).length,1);assert.ok(!/[一-龯]/.test(p.text.replace(/[本台]/g,"")));const contexts={candy:["あめ","こ","もらって","たべて","ありました"],stickers:["シール","まい","もらって","あげて","ありました"],flowers:["はな","本","さいて","かれて","ありました"],books:["ほん","さつ","かって","あげて","ありました"],cars:["くるま","台","きて","でていって","とまって いました"]},ctx=contexts[p.context];assert.ok(ctx);const t=p.answerSlots;assert.equal(p.text,`${ctx[0]}が ${t[0]} ${ctx[1]} ${ctx[4]}。${t[2]} ${ctx[1]} ${ctx[p.direction==="inc"?2:3]}、${t[4]} ${ctx[1]}に なりました。`);const {K1:u,K2:v}=p.numbers;assert.ok(u>=2&&u<=30&&v>=2&&v<=30&&Math.abs(u-v)>=2&&u!==2*v&&v!==2*u);}
  else{const s=answer(p);assert.equal(arithmetic(s),p.boxValue);let run=Number(s[0]);for(let i=2;i<s.length;i+=2){run+=s[i-1]==="+"?Number(s[i]):-Number(s[i]);assert.ok(run>=0);}}
  if(both){const {a,b,c}=p.numbers,d=Math.abs(a-b-c);assert.ok(a>=20&&a<=45&&a>b&&a>c&&b!==c&&b>=2&&c>=2&&d>=2&&d<=10&&a+b+c>=42&&a+b+c<=88);if(p.type==="T_SB")assert.ok(a>b+c);if(p.type==="T_AB"||p.type==="T_AF")assert.ok(a<b+c);}
  if(two){const n=Object.values(p.numbers).filter(Number.isFinite),x=Math.min(...n),y=Math.max(...n);assert.ok(x>=2&&y-x>=2&&y!==2*x&&x+y<=(lv===2?20:100));}
  if(lv<10){const parts=p.text.split("=").map(s=>s.match(/\d+|□|[+-]/g).map(t=>t==="□"?String(p.boxValue):t));assert.equal(arithmetic(parts[0]),arithmetic(parts[1]));}
  else{const s=answer(p).map(t=>t==="□"?String(p.boxValue):t);assert.equal(arithmetic(s.slice(0,3)),Number(s[4]));}
}
function checkSet(set,lv){
  assert.equal(set.length,5);assert.equal(new Set(set.map(p=>p.text)).size,5);set.forEach((p,i)=>check(p,lv,i));
  const pair=set.filter(p=>p.pairId!==null);assert.equal(pair.length,lv>=8?2:0);
  if(pair.length){assert.equal(set.indexOf(pair[1]),set.indexOf(pair[0])+1);assert.equal(pair[0].pairType,lv===10?"P2":"P1");if(lv===10){assert.equal(pair[0].context,pair[1].context);assert.deepEqual(Object.values(pair[0].numbers).sort((a,b)=>a-b),Object.values(pair[1].numbers).sort((a,b)=>a-b));}else{assert.equal(pair[0].numbers.b,pair[1].numbers.b);assert.equal(pair[0].numbers.c,pair[1].numbers.c);}}
  set.slice(1).forEach((p,i)=>{const q=set[i];if(p.numbers.c&&q.numbers.c&&!(p.pairId&&q.pairId))assert.notEqual([p.numbers.b,p.numbers.c].sort().join(),[q.numbers.b,q.numbers.c].sort().join());});
}
const corpus={};
for(let lv=1;lv<=10;lv++){
  const random=seeded(20261025+lv);corpus[lv]=Array.from({length:2000},()=>engine.buildSet(lv,random));
  corpus[lv].forEach(set=>checkSet(set,lv));
  assert.deepEqual(json(engine.buildSet(lv,seeded(lv))),json(engine.buildSet(lv,seeded(lv))));
  const rows=corpus[lv].flat(),fraction=fn=>rows.filter(fn).length/rows.length;
  if(lv===1){assert.ok(Math.abs(fraction(p=>p.patternId.includes("add"))-.5)<=.02);assert.ok(Math.abs(fraction(p=>p.orientation==="reversed")-.5)<=.02);}
  else if(lv===10){for(const t of ["start","change","result"])assert.ok(Math.abs(fraction(p=>p.type===t)-1/3)<=.02);assert.ok(Math.abs(fraction(p=>p.direction==="inc")-.5)<=.03);}
  else{
    const two=rows.filter(p=>!p.numbers.c),both=rows.filter(p=>p.numbers.c);
    assert.ok(Math.abs(two.length/rows.length-(lv===2?1:lv<=4?.6:0))<=.02);
    for(const [list,types,weights] of [[two,["T_AF","T_SB","T_SF"],lv===2?[1/3,1/3,1/3]:[.26,.42,.32]],[both,["T_AB","T_AF","T_SB","T_SF"],[.03,.26,.43,.28]]])if(list.length){types.forEach((t,i)=>assert.ok(Math.abs(list.filter(p=>p.type===t).length/list.length-weights[i])<=.02,`Lv${lv} ${t}`));const sf=list.filter(p=>p.type==="T_SF");if(list===both)assert.ok(Math.abs(sf.filter(p=>p.numbers.a>p.numbers.b+p.numbers.c).length/sf.length-.5)<=.03);}
    for(const group of [two,both])if(group.length){const expected=lv===6?1:lv>=7||lv===4&&group===two?.5:0;assert.ok(Math.abs(group.filter(p=>p.orientation==="reversed").length/group.length-expected)<=.02);}
  }
  console.log(`PASS Lv${lv} 2000 sets: checks 1–11, 15–20`);
}
assert.throws(()=>engine.buildSet(0,seeded(1)));assert.throws(()=>engine.buildSet(11,seeded(1)));assert.throws(()=>engine.buildSet(1));assert.throws(()=>engine.buildSet(1,()=>1));
assert.ok(!/Math\.random|Date\.now/.test(source));

const reference=require("../tools/komorebi/shiki_henkei_audit_sim/gen3.js");
reference.setOpt({sumcap:true,near:true,sfp:.5,p1redraw:true});
const doc=fs.readFileSync(path.join(root,"docs/komorebi_shiki_henkei_curriculum.md"),"utf8");
(function(){
const {emptyAcc,add,theorySingle,theoryP1,merge,norm}=require("../tools/komorebi/shiki_henkei_audit_sim/band_theory.js");
const singleTheory=theorySingle(),pairTheory=merge([[singleTheory,3],...theoryP1(8).map(acc=>[acc,1])]);
for(let lv=3;lv<=9;lv++){
  const measured=emptyAcc(),expected=lv>=8?pairTheory:singleTheory;
  for(const p of corpus[lv].flat())if(p.numbers.c)add(measured,p.type,p.numbers.a,p.numbers.b,p.numbers.c,1);
  for(const group of ["small","big"]){
    const types=Object.keys(expected[group]).filter(t=>t!=="all");
    for(const type of [...types,"all"]){
      const actual=measured[group][type],m=norm(actual),t=norm(expected[group][type]);
      for(const field of ["A","D","S"])for(let i=0;i<3;i++){
        const p=t[field][i],tolerance=type==="all"?.03:Math.max(.03,4*Math.sqrt(p*(1-p)/actual.n));
        assert.ok(Math.abs(m[field][i]-p)<=tolerance,`Lv${lv} check 13 ${group} ${type} ${field}[${i}]: ${m[field][i]} vs ${p}`);
      }
    }
  }
  console.log(`PASS Lv${lv}: check 13 (2), (3), exact theory including both P1 items`);
}
})();

function distribution(rows,feature){
  const counts=new Map();for(const row of rows){const key=feature(row);counts.set(key,(counts.get(key)||0)+1);}return counts;
}
for(let lv=2;lv<=10;lv++){
  const rows=corpus[lv].flat();
  for(const count of [2,3]){
    const sample=corpus[lv].slice(0,200).flat().filter(p=>p.numberCards.length===count);
    if(sample.length){
      for(let rank=0;rank<count;rank++)for(let pos=0;pos<count;pos++){
        const rate=sample.filter(p=>p.numberCards[pos]===Array.from(p.numberCards).sort((a,b)=>a==="□"?1:b==="□"?-1:Number(a)-Number(b))[rank]).length/sample.length;
        assert.ok(Math.abs(rate-1/count)<=.05,`Lv${lv} check 12 rank ${rank} position ${pos}: ${rate}`);
      }
      const rate=sample.filter(p=>p.numberCards.join()===p.text.match(/\d+|□/g).filter(s=>lv===10||s!=="□").join()).length/sample.length;
      assert.ok(Math.abs(rate-1/permutations(Array.from({length:count},(_,i)=>i)).length)<=.05,`Lv${lv} check 12 text order ${rate}`);
    }
  }
  for(const both of [false,true]){
    const group=rows.filter(p=>!!p.numbers.c===both);
    for(const type of new Set(group.map(p=>p.type))){
      const sample=group.filter(p=>p.type===type),count=sample[0].numberCards.length;
      for(let term=0;term<count;term++)for(let pos=0;pos<count;pos++){
        const rate=sample.filter(p=>p.numberCards.indexOf(answer(p)[term*2])===pos).length/sample.length;
        assert.ok(Math.abs(rate-1/count)<=Math.max(.05,4*Math.sqrt((1/count)*(1-1/count)/sample.length)),`Lv${lv} check 14 ${type} term ${term} position ${pos}`);
      }
    }
  }
  if(lv<=4){
    const two=rows.filter(p=>!p.numbers.c),band=n=>lv===2?n<=12?0:1:Math.min(3,Math.floor((n-1)/25));
    const features=[p=>p.orientation,p=>Number(p.numberCards[0])<Number(p.numberCards[1]),p=>band(p.numbers.a+p.numbers.d),p=>band(Math.max(p.numbers.a,p.numbers.d))];
    for(const feature of features){
      const groups=["T_AF","T_SB","T_SF"].map(type=>two.filter(p=>p.type===type)),counts=groups.map(g=>distribution(g,feature)),keys=new Set(counts.flatMap(c=>[...c.keys()]));
      for(const key of keys){const rates=counts.map((c,i)=>(c.get(key)||0)/groups[i].length);assert.ok(Math.max(...rates)-Math.min(...rates)<=.05,`Lv${lv} check 13 (4) ${key}: ${rates}`);}
    }
  }
  console.log(`PASS Lv${lv}: checks 12, 13 (4), 14`);
}
for(const lv of [8,9,10]){
  const random=seeded(91000+lv),pairs=Array.from({length:20000},()=>engine.buildSet(lv,random).filter(p=>p.pairId));
  for(const pos of [0,1]){
    const rows=pairs.map(pair=>pair[pos]),rate=fn=>rows.filter(fn).length/rows.length;
    const types=lv===10?["start","change","result"]:["T_AB","T_AF","T_SB","T_SF"],weights=lv===10?[1/3,1/3,1/3]:[.03,.26,.43,.28];
    types.forEach((type,i)=>assert.ok(Math.abs(rate(p=>p.type===type)-weights[i])<=.02,`Lv${lv} check 10 pair item ${pos} ${type}`));
    if(lv===10)assert.ok(Math.abs(rate(p=>p.direction==="inc")-.5)<=.02);
    else{
      assert.ok(Math.abs(rate(p=>p.orientation==="reversed")-.5)<=.02);
      const sf=rows.filter(p=>p.type==="T_SF");assert.ok(Math.abs(sf.filter(p=>p.numbers.a>p.numbers.b+p.numbers.c).length/sf.length-.5)<=.02);
    }
  }
  if(lv===10)console.log(`PASS Lv10 check 10: swapped number order ${pairs.filter(([p,q])=>p.numbers.K1===q.numbers.K2).length/pairs.length}`);
  else console.log(`PASS Lv${lv} check 10: same a ${pairs.filter(([p,q])=>p.numbers.a===q.numbers.a).length/pairs.length}, same answer ${pairs.filter(([p,q])=>p.boxValue===q.boxValue).length/pairs.length}`);
}
function specimen(lv,pid,text,cards,slots,box,k,pairType){
  const story=lv===10,both=pid.startsWith("both_"),intro=lv===1,n=(text.match(/\d+/g)||[]).map(Number),orientation=pid.endsWith("_rev")||pid.endsWith("_l")?"reversed":"normal";
  const type=intro?null:story?pid.split("_")[2]:pid.includes("add_back")?"T_AB":pid.includes("add_front")?"T_AF":pid.includes("sub_back")?"T_SB":"T_SF";
  let numbers;
  if(intro)numbers={a:n[0],b:n[1]};else if(story)numbers={K1:n[0],K2:n[1]};else{const sides=text.split("="),side=sides.find(s=>s.includes("□")),other=sides.find(s=>!s.includes("□")),a=Number(side.match(/\d+/)[0]),v=other.match(/\d+/g).map(Number);numbers=both?{a,b:v[0],c:v[1]}:{a,d:v[0]};}
  const scaffold=k>=2||lv===9?null:lv===1?"SC_hitori":lv===2?k===0?"SC_rei":"SC_zenbu":story?"SC_junban":both?"SC_ryougawa":"SC_zenbu";
  const p={cat:"kom_shiki_henkei",lv,patternId:pid,type,orientation,numbers,text,prompt:lv===1?"□ に はいる かずを こたえましょう":story?"おはなしの じゅんに □ を つかって しきを つくろう":"□ を もとめる しきを つくろう",format:intro?"normal":"assemble",kind:intro?"num":"assemble",boxValue:box,ans:intro?box:null,scaffold:scaffold?{id:scaffold}:null,waza:{primary:intro?"WZ_hitori":story?"WZ_junban":both?"WZ_hitotsu":"WZ_zenbu",alternate:intro?null:story?"WZ_ohanashi":orientation==="reversed"?"WZ_muki":"WZ_tashikame"},pairId:pairType?1:null,pairType:pairType||null};
  if(!intro){p.numberCards=cards;p.operatorCards=["+","-"];p.frame=story?["num","op","num","eq","num"]:both?["num","op","num","op","num"]:["num","op","num"];if(story){p.answerSlots=slots;p.context=text.startsWith("ほん")?"books":"candy";p.direction=pid.split("_")[1];}else p.answerTerms=slots.filter((_,i)=>i%2===0).map((s,i)=>[Number(s),i===0||slots[i*2-1]==="+"?1:-1]);}
  return p;
}
for(let lv=1;lv<=10;lv++){
  const section=doc.split("### A."+lv+" Lv"+lv)[1].split(/\n### /)[0];
  const rows=section.split("\n").filter(line=>/^\| [1-5] \|/.test(line));
  const set=rows.map((line,k)=>{
    const v=line.split("|").slice(1,-1).map(s=>s.trim().replace(/`/g,"")),pid=v[1].split(" ")[0];
    const slots=lv===1?null:(lv===10?v[4]:v[4].replace(/^□=/,"")).match(/\d+|□|[+=-]/g);
    const p=specimen(lv,pid,v[2],lv===1?null:v[3].split(" "),slots,Number(v[lv===1?3:5]),k,lv===1?null:v[6]);
    assert.equal(p.scaffold&&p.scaffold.id,v[lv===1?4:7]==="なし"?null:v[lv===1?4:7]);
    assert.deepEqual([p.waza.primary,p.waza.alternate],v[lv===1?5:8].split(" / ").map(s=>s==="なし"?null:s));return p;
  });
  checkSet(set,lv);
}
const chapter6=doc.split("## 6. Lv 別詳細")[1].split("## 7.")[0];let exampleCount=0;
for(let lv=1;lv<=10;lv++){
  const section=chapter6.split("### Lv"+lv+":")[1].split(/\n### /)[0];
  for(const match of section.matchAll(/(?:例 \d+ \((\w+)(?:、[^)]*)?\)\s+|^)([□\d][□\d+=-]+)\s+(?:カード ([\d ]+) \/ \+ −\s+)?(?:正答 (?:□=)?([\d+-]+))?/gm)){
    const text=match[2];if(!text.includes("="))continue;
    const pid=match[1]||((text.split("=")[0].includes("□")?"":"both_")+"sub_back");
    const both=text.match(/\d+/g).length===3,n=text.match(/\d+/g).map(Number),intro=lv===1;
    let slots,box;
    if(intro)box=text.includes("+")?n[0]+n[1]:n[0]-n[1];else{const [l,r]=text.split("="),side=l.includes("□")?l:r,other=l.includes("□")?r:l,a=side.match(/\d+/)[0],v=other.match(/\d+/g),front=side.startsWith("□"),op=side.includes("+")?"+":"-";slots=op==="+"?v.flatMap((s,i)=>i?["+",s]:[s]).concat(["-",a]):front?v.flatMap((s,i)=>i?["+",s]:[s]).concat(["+",a]):[a,...v.flatMap(s=>["-",s])];box=arithmetic(slots);}
    const resolved=match[1]|| (text==="38-□=28+3"?"both_sub_back":"both_add_back");
    const p=specimen(lv,resolved,text,n.map(String),slots,box,0,null);check(p,lv,0);exampleCount++;
  }
}
const objectText=doc.split("### 9.3 問題オブジェクト")[1].match(/```js\n([\s\S]*?)```/)[1],object=json(vm.runInNewContext("("+objectText+")"));
check(object,5,0);assert.ok(exampleCount>=20);
console.log("PASS golden cases: appendix A, chapter 6 and section 9.3");
function production(p){
  if(p.cat)return p;
  const story=p.fam==="story",intro=p.fam==="intro",both=p.fam==="both";
  const nums=p.nums||[];
  const a=p.type==="T_SF"?p.answerTerms[0][0]:p.type==="T_AF"?Math.min(...nums):Math.max(...nums);
  return Object.assign({},p,{cat:"kom_shiki_henkei",lv:intro?1:story?10:3,kind:intro?"num":"assemble",frame:story?["num","op","num","eq","num"]:both?["num","op","num","op","num"]:["num","op","num"],numberCards:story?p.K.map(String).concat("□"):nums.map(String),numbers:intro?{a:nums[0],b:nums[1]}:both?p.abc:story?{K1:p.K[0],K2:p.K[1]}:p.abc||{a:a,d:nums.find(n=>n!==a)},boxValue:intro?p.ans:p.box});
}
function compatible(p){
  return Object.assign({},p,{fam:p.lv===1?"intro":p.lv===10?"story":p.numbers.c?"both":"2num",orient:p.orientation,nums:p.lv===1?[p.numbers.a,p.numbers.b]:p.numbers.c?[p.numbers.a,p.numbers.b,p.numbers.c]:[p.numbers.a,p.numbers.d],abc:p.numbers,box:p.boxValue,ans:p.lv===1?p.boxValue:p.ans,K:[p.numbers.K1,p.numbers.K2],role:p.type,dir:p.direction,ctx:p.context});
}

let previous,converted;
const exhaustive=require("../tools/komorebi/shiki_henkei_audit_sim/diag_exhaustive.js").run(reference,(p,slots,tags,xy)=>{
  if(previous!==p){previous=p;converted=production(p);}
  const q=converted,actual=engine.diagnose(q,slots);
  assert.equal(actual.join(","),tags.join(","));
  if(xy)assert.equal(engine.firstNegative(slots).join(","),xy.join(","));
});
assert.deepEqual(exhaustive,{bad:0,n1:4139000,n2:36352,nb:563040,ns:25152,nNeg:18096});

const adversaries=require("../tools/komorebi/shiki_henkei_audit_sim/solvers3.js");
const audit=require("../tools/komorebi/shiki_henkei_audit_sim/run3.js");
const out=audit.run({mulberry32:reference.mulberry32,buildSet:(lv,random)=>engine.buildSet(lv,random).map(compatible)},adversaries,400,500,1,10,"v031");
for(const [level,res] of Object.entries(out)){
  const lv=Number(level),margins={A:1,B:1};
  for(const [name,rate] of Object.entries(res)){
    const ws=name.replace(/^B:/,"").split(",");
    const excluded=name.startsWith("B:")&&[["op","pos"],["op","mag"],["pos","mag"]].some(pair=>pair.every(w=>ws.includes(w)));
    if(!excluded){
      const stage=name[0],limit=lv===2?.70:stage==="A"?.60:.75;
      assert.ok(rate<limit,`Lv${lv} ${name} ${rate}`);
      margins[stage]=Math.min(margins[stage],limit-rate);
    }
  }
  console.log(`PASS Lv${lv} adversaries: 400 test sets / 2000 questions, 500 training sets; margins A=${margins.A.toFixed(4)}, B=${margins.B.toFixed(4)}`);
}
