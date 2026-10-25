"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {bootKomorebi,plainText,KOMOREBI_FILES}=require("./fake_dom.js");
const root=path.resolve(__dirname,".."),cat="kom_shiki_henkei";
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
function seeded(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
async function boot(){
  const files=KOMOREBI_FILES.slice();files.splice(files.indexOf("komorebi/app.js"),0,"komorebi/shiki_henkei_generator.js");
  const context=bootKomorebi({root,files,profileType:"k5"});await settle();
  const app=context.__app,api=context.Q4B_KOMOREBI;
  const volume=Object.assign({},context.Q4B_KOMOREBI_VOLUMES.volume_fixture,{categories:[cat]});
  return {context,app,api,volume};
}
function shown(app,attribute){
  const re=new RegExp('<button\\b[^>]*'+attribute+'="([^"]*)"[^>]*>([\\s\\S]*?)<\\/button>',"g"),out=[];let m;
  while((m=re.exec(app.innerHTML)))out.push({id:m[1],text:plainText(m[2]).trim().replace(/−/g,"-")});return out;
}
function click(app,attribute,id){const button=app.querySelectorAll("["+attribute+"]").find(b=>b.getAttribute(attribute)===String(id));assert.ok(button,attribute+"="+id);button.click();}
function fill(app,slots){
  for(const token of slots){if(token==="=")continue;if(token==="+"||token==="-")click(app,"data-assemble-op",token);else{const card=shown(app,"data-assemble-number").find(c=>c.text===token);assert.ok(card,"card "+token);click(app,"data-assemble-number",card.id);}}
  const done=app.querySelector('[data-action="submit-assemble"]');assert.equal(done.getAttribute("disabled"),null);done.click();
}
function stem(app){const m=/<h2 class="shiki-stem[^"]*">([\s\S]*?)<\/h2>/.exec(app.innerHTML);assert.ok(m);return plainText(m[1]).trim().replace(/−/g,"-");}
function solve(app,lv){
  const text=stem(app);
  if(lv===1){const n=text.match(/\d+/g).map(Number),v=text.includes("+")?n[0]+n[1]:n[0]-n[1],form=app.querySelector("[data-answer-form]");form.elements={answer:{value:String(v)}};form.submit();return;}
  if(lv===10){const n=text.match(/\d+|□/g),op=/もらって|さいて|かって|きて/.test(text)?"+":"-";fill(app,[n[0],op,n[1],"=",n[2]]);return;}
  const [l,r]=text.split("="),side=l.includes("□")?l:r,other=l.includes("□")?r:l,a=side.match(/\d+/)[0],n=other.match(/\d+/g),front=side.startsWith("□"),op=side.includes("+")?"+":"-";
  const slots=op==="+"?n.flatMap((s,i)=>i?["+",s]:[s]).concat(["-",a]):front?n.flatMap((s,i)=>i?["+",s]:[s]).concat(["+",a]):[a,...n.flatMap(s=>["-",s])];
  fill(app,slots);
}
async function main(){
  const {app,api,context,volume}=await boot(),profile=api.profile();
  assert.deepEqual(JSON.parse(JSON.stringify(api.categories[cat])),{course:"k5",name:"式のかたちをかえる",maxLv:10,release:6});
  for(const release of [5,6]){api.setCurrentRelease(release);assert.equal(api.isReleased(cat),release>=6);}
  api.setCurrentRelease(5);assert.ok(!app.innerHTML.includes('data-cat="'+cat+'"'));assert.ok(api.sessionStarters[cat]);
  for(let lv=1;lv<=10;lv++){
    profile.lv[cat]=lv;profile.maxLv[cat]=10;
    const startCount=profile.stats[cat]?profile.stats[cat].n:0;
    await api.sessionStarters[cat](volume,seeded(100+lv));
    for(let k=0;k<5;k++){
      solve(app,lv);await settle();assert.match(plainText(app.innerHTML),/正解！/);
      if(k<4)app.querySelector('[data-action="ratio-next"]').click();
    }
    assert.equal(profile.stats[cat].n,startCount+5);
    console.log(`PASS Lv${lv}: five questions solved from visible text and cards`);
  }
  const engine=context.Q4B_KOMOREBI_SHIKI_HENKEI,build=engine.buildSet;
  for(const mode of ["negative_step","true_commuted","true_solved","true_reordered"]){
    let p,slots;
    if(mode==="negative_step"){
      for(let seed=1;!p;seed++)p=build(5,seeded(seed)).find(q=>q.type==="T_AF"||q.type==="T_AB");
      slots=[String(p.numbers.b),"-",String(p.numbers.a),"+",String(p.numbers.c)];
    }else{
      for(let seed=1;!p;seed++)p=build(10,seeded(seed)).find(q=>q.patternId==="story_inc_start");
      const {K1:a,K2:b}=p.numbers;
      slots=mode==="true_commuted"?[String(a),"+","□","=",String(b)]:mode==="true_solved"?[String(b),"-",String(a),"=","□"]:[String(b),"-","□","=",String(a)];
    }
    engine.buildSet=()=>[p,p,p,p,p];profile.lv[cat]=p.lv;const before=profile.collection.gauge;
    const session=await api.sessionStarters[cat](volume,seeded(5));fill(app,slots);await settle();
    assert.match(plainText(app.innerHTML),/ただしい しき だけど/);assert.equal(profile.collection.gauge,before);
    assert.deepEqual(Array.from(session.questions[0].answerData.diagnose),[mode]);
    assert.equal(session.questions[0].answerData.correct,false);
    assert.deepEqual(Array.from(session.questions[0].answerData.slots),slots);
    if(mode==="negative_step")assert.ok(plainText(app.innerHTML).includes(p.numbers.b+" から "+p.numbers.a+" は ひけないね。たす かずを さきに ならべよう"));
    else{assert.match(plainText(app.innerHTML),/おはなしの じゅんに ならべてみよう/);assert.ok(plainText(app.innerHTML).includes(slots.join("").replace(/-/g,"−")));assert.ok(plainText(app.innerHTML).includes(p.answerSlots.join("").replace(/-/g,"−")));}
  }
  engine.buildSet=build;
  const doc=fs.readFileSync(path.join(root,"docs/komorebi_shiki_henkei_curriculum.md"),"utf8"),sentences=new Map([...doc.matchAll(/^\| ([LTBS]\d+) \|.*?「([^」]+)」/gm)].map(m=>[m[1],m[2]]));
  const covered=new Set(),priority=["flip_other_side","op_flip","unknown_misplaced","known_swap","keep_op","order_reversal","invert_overapply","minuend_swap"];
  const permutations=a=>a.length<2?[a]:a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(r=>[x,...r]));
  assert.equal(sentences.size,27);
  assert.deepEqual(Array.from(engine.firstNegative(["8","+","4","-","20"])),[12,20]);
  for(const lv of [1,2,5,10])for(let seed=1;seed<=100&&![...sentences.keys()].every(key=>covered.has(key)||covered.has(key+":multi"));seed++)for(const p of build(lv,seeded(seed))){
    const options=lv===1?Array.from({length:1000},(_,i)=>i):permutations(Array.from(p.numberCards)).flatMap(n=>lv===10?["+","-"].map(o=>[n[0],o,n[1],"=",n[2]]):p.frame.length===3?["+","-"].map(o=>[n[0],o,n[1]]):["+","-"].flatMap(o=>["+","-"].map(v=>[n[0],o,n[1],v,n[2]])));
    for(const slots of options){
      const tags=Array.from(engine.diagnose(p,slots));if(!tags.length)continue;
      const id=priority.find(t=>tags.includes(t))||tags[0],sf=p.type==="T_SF",add=p.patternId.startsWith("solve_add");
      const key=lv===1?{ignore_op:add?"L1":"L2",copy_visible:"L3",place_value:add?"L4":"L5",digit_slip:"L6",calc_other:"L7"}[id]:lv===10?{op_flip:p.direction==="inc"?"S1":"S2",unknown_misplaced:"S3",known_swap:"S4",true_commuted:"S5",true_solved:"S6",true_reordered:"S7"}[id]:p.frame.length===3?{keep_op:sf?"T2":"T1",invert_overapply:"T3",minuend_swap:"T4",order_reversal:"T5"}[id]:{keep_op:sf?"B2":"B1",invert_overapply:"B3",minuend_swap:sf?"B5":"B4",order_reversal:"B6",flip_other_side:"B7",negative_step:"B8"}[id];
      const coverage=key+(tags.length>1?":multi":"");if(covered.has(coverage))continue;
      const n=p.numbers,xy=id==="negative_step"?engine.firstNegative(slots):null,values={A:n.a,B:n.b,C:n.c,D:n.d,X:xy?xy[0]:n.x,Y:xy?xy[1]:n.y};
      const expected=sentences.get(key).replace(/[ABCDXY]/g,v=>String(values[v]));
      engine.buildSet=()=>[p,p,p,p,p];profile.lv[cat]=lv;
      const session=await api.sessionStarters[cat](volume,seeded(seed));
      if(lv===1){const form=app.querySelector("[data-answer-form]");form.elements={answer:{value:String(slots)}};form.submit();}else fill(app,slots);
      await settle();
      const reason=plainText(app.innerHTML.match(/<p class="dan2-reason">([\s\S]*?)<\/p>/)[1]);
      assert.equal(reason,(lv===10&&id.indexOf("true_")===0?slots.join("").replace(/-/g,"−")+" ":"")+expected,key);
      assert.deepEqual(Array.from(session.questions[0].answerData.diagnose),tags);
      covered.add(coverage);
    }
  }
  assert.equal([...sentences.keys()].filter(key=>covered.has(key)||covered.has(key+":multi")).length,27);
  assert.ok(covered.has("B7:multi"));assert.ok(covered.has("S1:multi")||covered.has("S2:multi"));
  engine.buildSet=build;
  console.log("PASS all 27 canonical explanations, substituted values and multi-tag priority with complete records");
  console.log("PASS release 6 gate, diagnosis records, dedicated feedback and unchanged gauge on wrong answers");
}
module.exports={boot,settle,seeded,shown,click,fill,stem,solve};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
