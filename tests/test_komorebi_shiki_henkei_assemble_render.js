"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {boot,settle,seeded,shown,click,fill}=require("./test_komorebi_shiki_henkei_session.js");
async function main(){
  const {app,api,volume}=await boot(),cat="kom_shiki_henkei";
  for(const lv of [2,5,10]){
    api.profile().lv[cat]=lv;api.profile().maxLv[cat]=10;
    const session=await api.sessionStarters[cat](volume,seeded(lv)),p=session.questions[0];
    assert.equal(api.standardQuestionBodyHtml(Object.assign({},p,{cat:"kom_ratio"})),api.standardQuestionBodyHtml(p));
    if(lv===10)assert.match(app.innerHTML,/assemble-card assemble-box/);
    assert.equal(shown(app,"data-assemble-number").length,p.numberCards.length);
    assert.deepEqual(shown(app,"data-assemble-op").map(c=>c.text),["+","-"]);
    assert.equal(shown(app,"data-assemble-slot").length,p.frame.filter(s=>s!=="eq").length);
    assert.match(app.innerHTML,/data-action="submit-assemble" disabled/);
    const cards=shown(app,"data-assemble-number");click(app,"data-assemble-number",cards[0].id);
    assert.equal(shown(app,"data-assemble-slot")[0].text,cards[0].text);
    assert.match(app.innerHTML,/assemble-card used/);
    click(app,"data-assemble-number",cards[0].id);assert.equal(shown(app,"data-assemble-slot").filter(s=>s.text).length,1);
    click(app,"data-assemble-number",cards[1].id);click(app,"data-assemble-op","-");
    assert.equal(shown(app,"data-assemble-slot")[1].text,"-");
    click(app,"data-assemble-slot",0);assert.equal(shown(app,"data-assemble-slot")[0].text,"");
    click(app,"data-assemble-number",cards[0].id);assert.equal(shown(app,"data-assemble-slot")[0].text,cards[0].text);
    app.querySelector('[data-action="clear-assemble"]').click();assert.ok(shown(app,"data-assemble-slot").every(s=>!s.text));assert.ok(!app.innerHTML.includes("assemble-card used"));
    assert.match(app.innerHTML,/data-action="submit-assemble" disabled/);
    app.querySelector('[data-action="submit-assemble"]').click();await settle();assert.ok(!api.profile().stats[cat]);
    const slots=lv===10?Array.from(p.answerSlots):p.answerTerms.flatMap(([n,s],i)=>i?[s===1?"+":"-",String(n)]:[String(n)]);
    fill(app,slots);await settle();assert.equal(api.profile().stats[cat].n,1);
    delete api.profile().stats[cat];
    console.log(`PASS Lv${lv}: frame, card placement, reuse, undo, clear and submit`);
  }
  const html=fs.readFileSync(path.join(__dirname,"../komorebi/index.html"),"utf8"),css=fs.readFileSync(path.join(__dirname,"../komorebi/map.css"),"utf8");
  assert.match(html,/href="map\.css\?v=0\.4\.16"/);assert.ok(!html.includes(".assemble-card{"));
  function rule(selector){const m=new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\{([^}]+)\\}").exec(css);assert.ok(m,selector);return m[1];}
  function pixels(selector,property){const m=new RegExp("(?:^|;)"+property+":([0-9.]+)px").exec(rule(selector));assert.ok(m,selector+" "+property);return Number(m[1]);}
  for(const [selector,props] of [[".assemble-card",{width:76,height:76,"min-width":76,"min-height":76,"font-size":32}],[".assemble-slot",{width:52,height:64}],[".assemble-slot.assemble-op",{width:40}],[".assemble-actions button",{"min-height":64}],[".assemble-row",{gap:12}],[".assemble-tray",{gap:12}],[".ratio-panel .shiki-stem",{"font-size":28}]]){
    const text=rule(selector);for(const [property,min] of Object.entries(props)){const m=new RegExp("(?:^|;)"+property+":([0-9.]+)px").exec(text);assert.ok(m,selector+" "+property);assert.ok(Number(m[1])>=min);}
  }
  const border=Number(rule(".ratio-panel").match(/(?:^|;)border:([0-9.]+)px/)[1]);
  for(const width of [320,360,375,390]){
    const content=width-2*pixels(".shiki-page","padding")-2*border-2*pixels(".shiki-page .ratio-panel","padding");
    const frame=3*pixels(".assemble-slot","width")+2*pixels(".assemble-slot.assemble-op","width")+5*pixels(".assemble-frame","gap")+pixels(".assemble-label","width");
    const story=3*pixels(".assemble-slot","width")+pixels(".assemble-slot.assemble-op","width")+4*pixels(".assemble-frame","gap")+pixels(".assemble-label","width");
    assert.ok(frame<=content,`${width}: frame fits`);assert.ok(story<=content,`${width}: story frame fits`);
    assert.ok(3*pixels(".assemble-card","width")+2*pixels(".assemble-row","gap")<=content);
    assert.ok(2*pixels(".assemble-actions button","min-width")+pixels(".assemble-actions","gap")<=content);
  }
  assert.notEqual(rule(".assemble-box").match(/background:([^;}]*)/)[1],rule(".assemble-card").match(/background:([^;}]*)/)[1]);
  console.log("PASS CSS lower bounds and frame/tray/action widths at 320, 360, 375, 390px");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
