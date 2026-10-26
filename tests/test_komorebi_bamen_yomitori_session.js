"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {bootKomorebi,plainText,KOMOREBI_FILES}=require("./fake_dom.js");
const {mulberry32}=require("../tools/komorebi/bamen_yomitori_audit_sim/audit_sim.js");
const {FAMILY,POOL,OBJS}=require("../tools/komorebi/bamen_yomitori_audit_sim/strict_gen.js");
const root=path.resolve(__dirname,".."),cat="kom_bamen_yomitori";
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
const namePattern=FAMILY.concat(POOL).map(p=>p.join("")).join("|");
function names(text){return [...new Set(text.match(new RegExp(namePattern,"g"))||[])];}
function shown(app,attribute){return [...app.innerHTML.matchAll(new RegExp('<button\\b[^>]*'+attribute+'="([^"]*)"[^>]*>([\\s\\S]*?)<\\/button>',"g"))].map(m=>({id:Number(m[1]),text:plainText(m[2]).trim()}));}
function click(app,attribute,id){const button=app.querySelectorAll("["+attribute+"]").find(b=>b.getAttribute(attribute)===String(id));assert.ok(button);button.click();}
function stem(app){const match=/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(app.innerHTML);assert.ok(match);return plainText(match[1]).trim();}
function solveText(text,choices,multi){
  const sentences=text.split("。").map(s=>s.trim()).filter(Boolean),ps=names(text),values={},relations=[],events=[];
  const question=sentences.filter(s=>/ですか|でしょう|ましたか|っていますか|えらびましょう|しらべます/.test(s)).join("。");
  const body=sentences.filter(s=>!question.split("。").includes(s));
  const object=OBJS.find(o=>body.some(s=>s.includes(o.name))),u=object?object.u:"こ";
  let total=null,pending=null,pronoun=null,split=false;
  for(let s of body){
    if(/そこへ/.test(s)){pronoun=names(s)[0];continue;}
    if(s.includes("その子"))s=s.replace("その子",pronoun);
    s=s.replace(/(?:ガム|ビーだま|えんぴつ)を \d+(?:こ|本)と?\s*/g,"");
    const ns=names(s),nums=[...s.matchAll(new RegExp('(\\d+)'+u,'g'))].map(m=>Number(m[1]));
    const subj=new RegExp('('+namePattern+')(?:は|が)').exec(s);
    const other=new RegExp('('+namePattern+')(に|から)').exec(s);
    if(other&&subj&&/あげました|わたしました|かえしました|もらいました/.test(s)){
      const receive=s.includes("もらいました");events.push({giver:receive?other[1]:subj[1],receiver:receive?subj[1]:other[1],n:nums[0]});continue;
    }
    if(s.includes("より")){
      const after=s.includes("ほうが"),sub=after?ns[1]:ns[0],base=after?ns[0]:ns[1];
      relations.push({sub,base,d:(nums[0]||1)*(s.includes("すくな")?-1:1)});continue;
    }
    if(/わけました|わけっこしました|くばりました|ぜんぶ.*もらいました/.test(s)){
      split=true;if(nums.length)total=nums[0];continue;
    }
    if(/^ぜんぶで|ありま(?:す|した)$/.test(s)&&nums.length){total=nums[0];continue;}
    if(s.includes("のこりは")){split=true;continue;}
    if(!nums.length){if(/も .*もって|も .*もら/.test(s))pending=ns[0];continue;}
    if(s.includes("もう ひとり")){const unknown=ps.filter(p=>values[p]===undefined);assert.equal(unknown.length,1);values[unknown[0]]=nums[0];continue;}
    if(ns.length===0){assert.ok(pending,s);values[pending]=nums[0];pending=null;continue;}
    if(/もっていました$/.test(s)&&s.includes("、")&&nums.length===ns.length){ns.forEach((p,i)=>{values[p]=nums[i];});continue;}
    const owner=subj?subj[1]:s.includes("のは")?ns[ns.length-1]:ns[0];values[owner]=nums[0];
  }
  if(split){assert.ok(total);const unknown=ps.filter(p=>values[p]===undefined);assert.equal(unknown.length,1);values[unknown[0]]=total-Object.values(values).reduce((a,b)=>a+b,0);}
  if(relations.length){
    if(!Object.keys(values).length)values[ps[0]]=100;
    for(let i=0;i<ps.length;i++)for(const r of relations){if(values[r.base]!==undefined)values[r.sub]=values[r.base]+r.d;else if(values[r.sub]!==undefined)values[r.base]=values[r.sub]-r.d;}
  }
  const before=Object.assign({},values);
  for(const e of events){values[e.giver]-=e.n;values[e.receiver]+=e.n;}
  const asked=names(question)[0];
  if(multi){const required=split?[total,...Object.values(before).filter((_,i)=>Object.keys(before)[i]!==asked)]:[before[asked],...events.filter(e=>e.giver===asked||e.receiver===asked).map(e=>e.n)];return choices.filter(c=>required.includes(Number(c.text))).map(c=>c.id);}
  if(question.includes("カードは")){const answer=choices.find(c=>c.text.split(" ・ ").every(row=>{const p=names(row)[0],n=Number(row.match(/\d+/)[0]);return values[p]===n;}));assert.ok(answer,text);return answer.id;}
  let answer;
  if(/どう/.test(question)){const d=values[asked]-before[asked];answer=d===0?"かわらない":Math.abs(d)+u+(d>0?" ふえた":" へった");}
  else if(/ふえも|かわらなかった/.test(question))answer=ps.find(p=>values[p]===before[p]);
  else if(/ふえたのは|おおく なった/.test(question))answer=events[0].receiver;
  else if(/へったのは|すくなく なった/.test(question))answer=events[0].giver;
  else if(/いちばん|どちら/.test(question)){const v=/はじめに|まえに/.test(question)?before:values,least=/すくな|すこししか/.test(question);answer=ps.reduce((a,b)=>(least?v[b]<v[a]:v[b]>v[a])?b:a);}
  else if(/だれ/.test(question)){const n=Number(question.match(/\d+/)[0]);answer=ps.find(p=>values[p]===n);}
  else answer=String(values[asked]);
  const choice=choices.find(c=>c.text===answer);assert.ok(choice,JSON.stringify({text,answer,values,choices}));return choice.id;
}
function submit(app,answer){if(Array.isArray(answer)){for(const i of answer)click(app,"data-multi-index",i);app.querySelector('[data-action="submit-multi"]').click();}else click(app,"data-choice-index",answer);}
async function main(){
  const files=KOMOREBI_FILES.slice();files.splice(files.indexOf("komorebi/app.js"),0,"komorebi/bamen_yomitori_generator.js");
  const context=bootKomorebi({root,files,profileType:"k5"});await settle();
  const app=context.__app,api=context.Q4B_KOMOREBI,profile=api.profile(),engine=context.Q4B_KOMOREBI_BAMEN_YOMITORI;
  engine.judge=()=>{throw new Error("Session must use the generic answer path");};
  const volume=Object.assign({},context.Q4B_KOMOREBI_VOLUMES.volume_fixture,{categories:[cat]});
  assert.deepEqual(JSON.parse(JSON.stringify(api.categories[cat])),{course:"k5",name:"場面の読みとり",maxLv:10,release:6});
  for(const release of [5,6]){api.setCurrentRelease(release);assert.equal(api.isReleased(cat),release>=6);}
  api.setCurrentRelease(5);assert.ok(!app.innerHTML.includes('data-cat="'+cat+'"'));assert.ok(api.sessionStarters[cat]);
  for(let lv=1;lv<=10;lv++){
    profile.lv[cat]=lv;profile.maxLv[cat]=10;const before=profile.stats[cat]?profile.stats[cat].n:0;
    await api.sessionStarters[cat](volume,mulberry32(100+lv));
    for(let i=0;i<5;i++){
      const multi=shown(app,"data-multi-index"),choices=multi.length?multi:shown(app,"data-choice-index");
      submit(app,solveText(stem(app),choices,multi.length>0));await settle();assert.match(plainText(app.innerHTML),/正解！/);
      if(i<4)app.querySelector('[data-action="ratio-next"]').click();
    }
    assert.equal(profile.stats[cat].n,before+5);console.log(`PASS Lv${lv}: five questions solved from visible text and choices`);
  }
  const doc=fs.readFileSync(path.join(root,"docs/komorebi_bamen_yomitori_curriculum.md"),"utf8");
  const section=doc.slice(doc.indexOf("### 7.2 読み違いの一言"),doc.indexOf("## 8. 診断の語彙"));
  const templates=[...section.matchAll(/^\| W\d+ \|[^\n]*?\| ([^|]+) \|$/gm)].map(m=>m[1].trim());
  assert.equal(templates.length,25);
  const covered=new Set(),build=engine.buildSet;
  for(const lv of [1,2,4,5,6,7,8,9,10])for(let seed=1;seed<=50;seed++)for(const p of build(lv,mulberry32(seed))){
    for(let i=0;i<p.choices.length;i++){
      const message=p.feedback[i];if(!message)continue;
      const template=templates.find(t=>new RegExp("^"+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/〈ひと〉/g,"(?:"+namePattern+")").replace(/〈かず〉/g,"\\d+(?:こ|まい|本)?").replace(/〈もの〉/g,"(?:"+OBJS.map(o=>o.name).join("|")+")")+"$").test(message));assert.ok(template,message);
      const key=template+(p.kind==="find_all"?":multi":"");if(covered.has(key))continue;
      engine.buildSet=()=>[p,p,p,p,p];profile.lv[cat]=lv;await api.sessionStarters[cat](volume,mulberry32(10));
      submit(app,p.kind==="find_all"?[i]:i);await settle();
      const reason=plainText(app.innerHTML.match(/<p class="dan2-reason">([\s\S]*?)<\/p>/)[1]);assert.equal(reason,message);assert.doesNotMatch(reason,/〈|undefined|null|NaN/);covered.add(key);
    }
  }
  assert.equal(templates.filter(t=>covered.has(t)||covered.has(t+":multi")).length,25,JSON.stringify(templates.filter(t=>!covered.has(t)&&!covered.has(t+":multi"))));
  for(const lv of [6,9]){
    const p=build(lv,mulberry32(lv)).find(p=>p.kind==="find_all");engine.buildSet=()=>[p,p,p,p,p];profile.lv[cat]=lv;
    const wrong=Array.from(p.optionTypes,(t,i)=>t!=="correct"?i:-1).filter(i=>i>=0);
    if(wrong.length>1){await api.sessionStarters[cat](volume,mulberry32(1));submit(app,wrong.slice().reverse());await settle();assert.ok(plainText(app.innerHTML).includes(p.feedback[wrong[0]]));}
    if(p.ansSet.length>1){p.feedbackMissed="missed feedback fixture";await api.sessionStarters[cat](volume,mulberry32(1));submit(app,[p.ansSet[0]]);await settle();assert.ok(plainText(app.innerHTML).includes(p.feedbackMissed));}
  }
  engine.buildSet=build;
  console.log("PASS release 6 gate, all 25 canonical feedback rows with substitutions, and find_all display-order priority");
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
