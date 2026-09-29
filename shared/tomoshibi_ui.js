(function(global){
  "use strict";

  /* れんぞく ともしび の表示と演出 (docs/tomoshibi_streak_design.md 5 章)。

     - badgeHTML: 統一ステータスバー (shared/reward.js の statusHTML) に置くカウンター
     - 毎日のボーナスと段が上がる演出: shared/tomoshibi.js の settle が出す
       q4b-tomoshibi イベントを聞いて出す。問題を解いている最中にも出るので、
       画面の操作を奪わない (pointer-events:none、時間で自動で消える)
     - 段が下がった知らせ: ページを開いたときにだけ出す (解いている最中には出さない)。
       ボタンで閉じる。どの端末で見ても 1 回 (tomoshibiMarkSeen)
     - 説明画面: カウンターをタップすると出る。救済の規則はここにだけ書く

     TOMOSHIBI_MODE が "on" でないときは、何も描かず何も聞かない。 */

  var STYLE_ID="q4b-tomo-style";
  var FX_MS={bonus:3000, up:4800};

  var FLAME={
    aka: {stops:[["0","#ffd0b8"],["0.55","#ff6a3d"],["1","#c9321a"]], glow:"rgba(255,106,61,.55)"},
    ao:  {stops:[["0","#d6ecff"],["0.55","#4a95ff"],["1","#1b56c2"]], glow:"rgba(74,149,255,.6)"},
    gin: {stops:[["0","#ffffff"],["0.55","#cdd6e0"],["1","#8793a1"]], glow:"rgba(205,214,224,.8)"},
    kin: {stops:[["0","#fff6c2"],["0.55","#ffcf2e"],["1","#d18f00"]], glow:"rgba(255,207,46,.85)"},
    niji:{stops:[["0","#ff5e5e"],["0.2","#ffb13b"],["0.4","#ffe94d"],["0.6","#5fd66b"],["0.8","#4aa3ff"],["1","#a36bff"]], glow:"rgba(255,255,255,.9)"}
  };

  var gradSeq=0;

  function engine(){ return global.Q4BTomoshibi; }
  function store(){ return global.QuestSave; }
  function modeOn(){
    var eco=global.Q4B_ECONOMY;
    try{ return !!(eco&&typeof eco.tomoshibiMode==="function"&&eco.tomoshibiMode()==="on"); }catch(_){ return false; }
  }
  function currentPid(){
    var s=store();
    try{ return s&&typeof s.currentProfile==="function"?s.currentProfile():null; }catch(_){ return null; }
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});
  }

  function flameSVG(tierId,size){
    var f=FLAME[tierId]||FLAME.aka, id="q4bTomoG"+(++gradSeq), stops="";
    f.stops.forEach(function(s){ stops+='<stop offset="'+s[0]+'" stop-color="'+s[1]+'"/>'; });
    return '<svg class="q4b-tomo-flame q4b-tomo-flame-'+tierId+'" width="'+size+'" height="'+size+'" viewBox="0 0 64 64" aria-hidden="true">'
      +'<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'+stops+'</linearGradient></defs>'
      +'<path d="M32 4C37 15 51 24 50 40C49 52 41 60 32 60C23 60 15 52 14 40C13 30 20 23 24 15C26 22 28 26 32 28C30 20 30 12 32 4Z" fill="url(#'+id+')"/>'
      +'<path d="M32 31C36 37 42 41 41 48C40 54 36 57 32 57C28 57 23 54 23 48C23 42 28 38 32 31Z" fill="#fff" opacity=".55"/>'
      +'</svg>';
  }

  /* 状態から表示する文言を作る (DOM に触れない。テストはここを見る)。 */
  function viewModel(state){
    var T=engine(), tiers=T.tiers(), tier=tiers[state.tierIndex], vm={};
    vm.tierId=tier.id;
    vm.name=tier.name;
    vm.days=state.dropPending?state.restartDay+" にちめ から さいかい":state.streakDays+" にち れんぞく";
    if(state.qualifiedToday){
      vm.today="きょうの ボーナス +"+(state.bonusToday.base+state.bonusToday.top)+" こはく ✓";
      if(state.toTop>0)vm.today+="　あと "+state.toTop+" もんで +"+tier.topBonus;
    }else{
      var would=state.dropPending?state.tierIndex:T.tierIndexOf(state.streakDays+1);
      vm.today="あと "+(T.DAY_MIN-state.todayCount)+" もんで きょうの ボーナス +"+tiers[would].bonus;
    }
    if(state.next){
      var nt=tiers[state.next.tierIndex];
      vm.next=state.next.daysLeft<=1&&state.qualifiedToday
        ?"あした 3 もんで "+nt.name+"！"
        :"あと "+state.next.daysLeft+" にちで "+nt.name+" (まいにち +"+nt.bonus+")";
    }else{
      vm.next="いちばん つよい ともしび！ "+T.TOP_MIN+" もんの 日は +"+tier.topBonus;
    }
    /* 段の中の進み具合 (にじ は上限が無いので出さない)。 */
    vm.ticks=null;
    if(tier.to!=null&&!state.dropPending){
      var span=tier.to-tier.from+1;
      vm.ticks={filled:Math.max(0,Math.min(span,state.streakDays-tier.from+1)),total:span};
    }
    return vm;
  }

  function stateFor(pid){
    var s=store(), T=engine();
    if(!pid||!s||typeof s.tomoshibiOf!=="function"||!T)return null;
    /* 公開前の履歴の取り込み (1 回だけ。済んでいれば何もしない)。 */
    try{ if(typeof s.tomoshibiSeed==="function")s.tomoshibiSeed(pid); }catch(_){}
    return T.computeState(s.tomoshibiOf(pid),typeof s.todayKey==="function"?s.todayKey():undefined);
  }

  /* 各ゲームが 🔥 の日数を出している箇所と、けいさんのレア率の後押しが読む日数。
     公開 ("on") 前は各ゲームの従来の値 (fallback) をそのまま返すので、振る舞いは
     変わらない。公開後は ともしびの連続日数 1 本にそろう。段が下がって再開を待つ間は、
     再開する段の手前までの日数を返す (0 と出して途切れを強調しないため)。 */
  function streakDays(pid,fallback){
    if(!modeOn())return fallback;
    var state=stateFor(pid||currentPid());
    if(!state)return fallback;
    return state.dropPending?Math.max(0,state.restartDay-1):state.streakDays;
  }

  function badgeHTML(pid){
    if(!modeOn())return "";
    pid=pid||currentPid();
    var state=stateFor(pid);
    if(!state)return "";
    injectStyle();
    var vm=viewModel(state), ticks="";
    if(vm.ticks){
      for(var i=0;i<vm.ticks.total;i++)ticks+='<i class="'+(i<vm.ticks.filled?"on":"")+'"></i>';
      ticks='<span class="q4b-tomo-ticks">'+ticks+'</span>';
    }
    return '<button type="button" class="q4b-tomo-badge q4b-tomo-'+vm.tierId+'" data-q4b-tomo="help" aria-label="'+esc(vm.name+" "+vm.days)+'">'
      +'<span class="q4b-tomo-icon">'+flameSVG(vm.tierId,40)+'</span>'
      +'<span class="q4b-tomo-text">'
      +'<b>'+esc(vm.name)+'</b><span class="q4b-tomo-days">'+esc(vm.days)+'</span>'+ticks
      +'<span class="q4b-tomo-line">'+esc(vm.today)+'</span>'
      +'<span class="q4b-tomo-line q4b-tomo-next">'+esc(vm.next)+'</span>'
      +'</span></button>';
  }

  /* ---- 演出 ---- */

  function reducedMotion(){
    try{ return !!(global.matchMedia&&global.matchMedia("(prefers-reduced-motion: reduce)").matches); }catch(_){ return false; }
  }

  function confettiHTML(n){
    var colors=["#ff6a3d","#ffcf2e","#4a95ff","#5fd66b","#a36bff","#ffffff"], h="";
    for(var i=0;i<n;i++){
      h+='<i class="q4b-tomo-conf" style="left:'+((i*37)%100)+'%;background:'+colors[i%colors.length]
        +';animation-delay:'+((i%7)*70)+'ms;animation-duration:'+(1600+(i%5)*220)+'ms"></i>';
    }
    return h;
  }

  function mount(html,cls,ms){
    var doc=global.document;
    if(!doc||!doc.body)return null;
    injectStyle();
    var el=doc.createElement("div");
    el.className="q4b-tomo-fx "+cls;
    el.setAttribute("aria-live","polite");
    el.innerHTML=html;
    doc.body.appendChild(el);
    if(ms)global.setTimeout(function(){ if(el.parentNode)el.parentNode.removeChild(el); },ms);
    return el;
  }

  function playBonus(detail){
    var T=engine(), tiers=T.tiers(), st=detail.state, tier=tiers[st.tierIndex];
    var paid=(detail.basePaid||0)+(detail.topPaid||0);
    var title=detail.basePaid?(st.restartedToday?"さいかい！":"きょうの ともしび"):"にじの ともしび "+T.TOP_MIN+" もん！";
    mount('<div class="q4b-tomo-flash q4b-tomo-flash-strong"></div>'+confettiHTML(32)
      +'<div class="q4b-tomo-center">'+flameSVG(tier.id,120)
      +'<div class="q4b-tomo-title">'+esc(title)+'</div>'
      +'<div class="q4b-tomo-amber">🔶 +'+paid+' こはく</div>'
      +'<div class="q4b-tomo-sub">'+esc(tier.name)+'　'+esc(st.streakDays+" にち れんぞく")+'</div></div>',
      "q4b-tomo-bonus q4b-tomo-"+tier.id,FX_MS.bonus);
  }

  function playTierUp(detail){
    var T=engine(), tiers=T.tiers(), st=detail.state, tier=tiers[st.tierIndex], prev=tiers[Math.max(0,st.tierIndex-1)];
    mount('<div class="q4b-tomo-flash q4b-tomo-flash-strong"></div>'+confettiHTML(40)
      +'<div class="q4b-tomo-center">'
      +'<div class="q4b-tomo-swap"><span class="q4b-tomo-old">'+flameSVG(prev.id,110)+'</span>'
      +'<span class="q4b-tomo-new">'+flameSVG(tier.id,150)+'</span></div>'
      +'<div class="q4b-tomo-title">'+esc(tier.name)+' に なった！</div>'
      +'<div class="q4b-tomo-amber">まいにち +'+tier.bonus+' こはく</div></div>',
      "q4b-tomo-up q4b-tomo-"+tier.id,FX_MS.up);
  }

  function showDrop(pid,state){
    var T=engine(), tiers=T.tiers(), from=tiers[state.lastDrop.fromIndex], to=tiers[state.tierIndex];
    var el=mount('<div class="q4b-tomo-modal" role="dialog" aria-modal="true">'
      +'<div class="q4b-tomo-swap q4b-tomo-down"><span class="q4b-tomo-old">'+flameSVG(from.id,110)+'</span>'
      +'<span class="q4b-tomo-new">'+flameSVG(to.id,110)+'</span></div>'
      +'<div class="q4b-tomo-title">ざんねん！ ともしびが ちいさく なった</div>'
      +'<div class="q4b-tomo-sub">でも '+esc(to.name)+' '+state.restartDay+' にちめ から さいかい できるよ</div>'
      +'<button type="button" class="q4b-tomo-ok" data-q4b-tomo="close">つづける</button></div>',
      "q4b-tomo-drop",0);
    if(el){
      var s=store();
      try{ s.tomoshibiMarkSeen(pid,state.lastDrop.date,"drop"); }catch(_){}
    }
    return el;
  }

  function showHelp(){
    var T=engine(), tiers=T.tiers(), rows="";
    tiers.forEach(function(t){
      rows+='<tr><td>'+flameSVG(t.id,28)+'</td><td>'+esc(t.name)+'</td><td>'
        +t.from+(t.to!=null?" 〜 "+t.to:" 〜")+' にち</td><td>+'+t.bonus
        +(t.topBonus?' ('+T.TOP_MIN+' もんで +'+t.topBonus+')':'')+'</td></tr>';
    });
    mount('<div class="q4b-tomo-modal q4b-tomo-help" role="dialog" aria-modal="true">'
      +'<div class="q4b-tomo-title">れんぞく ともしび</div>'
      +'<p>1 日に '+T.DAY_MIN+' もん せいかい すると、ともしびが つづく。つづくほど まいにちの こはくが ふえるよ。</p>'
      +'<table>'+rows+'</table>'
      +'<p class="q4b-tomo-note">'+T.DAY_MIN+' もん せいかい できなかった 日が あると、ともしびは 2 だん ちいさく なって、その だんの さいしょの 日から さいかい するよ。</p>'
      +'<button type="button" class="q4b-tomo-ok" data-q4b-tomo="close">とじる</button></div>',
      "q4b-tomo-drop",0);
  }

  function onPaid(event){
    if(!modeOn())return;
    var detail=event&&event.detail;
    if(!detail||!detail.state)return;
    if(detail.basePaid&&detail.state.tierUpToday){
      playBonus(detail);
      global.setTimeout(function(){ playTierUp(detail); },reducedMotion()?0:FX_MS.bonus-400);
    }else{
      playBonus(detail);
    }
  }

  /* ページを開いたときと同期の取り込み後: 他の端末の分で今日が条件を満たしていれば
     精算し (演出は q4b-tomoshibi で出る)、まだ見ていない段の下降があれば知らせる。 */
  function checkNow(){
    if(!modeOn())return;
    var pid=currentPid(), T=engine();
    if(!pid||!T)return;
    try{ T.settle(pid); }catch(_){}
    var state=stateFor(pid), s=store();
    if(!state||!state.dropPending||!state.lastDrop)return;
    var data=s.tomoshibiOf(pid), seen=data.seen&&data.seen[state.lastDrop.date];
    if(seen&&seen.drop)return;
    /* 公開前 (履歴を取り込む前) の途切れは知らせない。公開日の最初の画面が
       「ざんねん」にならないように。 */
    if(!data.seededAt||state.lastDrop.date<data.seededAt)return;
    showDrop(pid,state);
  }

  function onClick(event){
    var t=event.target, el=t&&t.closest?t.closest("[data-q4b-tomo]"):null;
    if(!el)return;
    var action=el.getAttribute("data-q4b-tomo");
    if(action==="help"){ event.preventDefault(); showHelp(); }
    else if(action==="close"){
      var fx=el.closest(".q4b-tomo-fx");
      if(fx&&fx.parentNode)fx.parentNode.removeChild(fx);
    }
  }

  function injectStyle(){
    var doc=global.document;
    if(!doc||!doc.head||doc.getElementById(STYLE_ID))return;
    var st=doc.createElement("style");
    st.id=STYLE_ID;
    st.textContent=''
      +'.q4b-tomo-badge{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;margin:0 0 10px;padding:8px 12px;border-radius:16px;border:2px solid #e8d9b0;background:linear-gradient(135deg,#fffaf0,#fff3dc);text-align:left;font:inherit;color:#3a2a14;cursor:pointer}'
      +'.q4b-tomo-badge b{font-size:15px}'
      +'.q4b-tomo-text{display:flex;flex-direction:column;gap:2px;min-width:0}'
      +'.q4b-tomo-days{font-size:18px;font-weight:900}'
      +'.q4b-tomo-line{font-size:12px;font-weight:700;color:#6b5330}'
      +'.q4b-tomo-next{color:#8a6a3a}'
      +'.q4b-tomo-ticks{display:flex;gap:3px;margin:2px 0}'
      +'.q4b-tomo-ticks i{display:block;width:12px;height:6px;border-radius:3px;background:#eadfca}'
      +'.q4b-tomo-ticks i.on{background:#ff9a3c}'
      +'.q4b-tomo-badge.q4b-tomo-ao{border-color:#b9d6ff;background:linear-gradient(135deg,#f5f9ff,#e3efff)}'
      +'.q4b-tomo-badge.q4b-tomo-gin{border-color:#c7d0da;background:linear-gradient(135deg,#ffffff,#eef1f5)}'
      +'.q4b-tomo-badge.q4b-tomo-kin{border-color:#f0c94a;background:linear-gradient(135deg,#fffbe6,#ffefb0)}'
      +'.q4b-tomo-badge.q4b-tomo-niji{border-color:transparent;background:linear-gradient(#fffdf6,#fffdf6) padding-box,linear-gradient(90deg,#ff5e5e,#ffb13b,#ffe94d,#5fd66b,#4aa3ff,#a36bff) border-box}'
      +'.q4b-tomo-flame{display:block}'
      +'.q4b-tomo-flame-ao{filter:drop-shadow(0 0 4px rgba(74,149,255,.6))}'
      +'.q4b-tomo-flame-gin{filter:drop-shadow(0 0 6px rgba(160,175,190,.9))}'
      +'.q4b-tomo-flame-kin{filter:drop-shadow(0 0 9px rgba(255,190,20,.95))}'
      +'.q4b-tomo-flame-niji{filter:drop-shadow(0 0 12px rgba(255,255,255,.95)) drop-shadow(0 0 6px rgba(163,107,255,.8))}'
      +'.q4b-tomo-badge .q4b-tomo-icon{animation:q4bTomoFlick 1.8s ease-in-out infinite}'
      +'.q4b-tomo-badge.q4b-tomo-kin .q4b-tomo-icon,.q4b-tomo-badge.q4b-tomo-niji .q4b-tomo-icon{animation-duration:1.2s}'
      +'.q4b-tomo-fx{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden}'
      +'.q4b-tomo-drop{pointer-events:auto;background:rgba(20,16,10,.55)}'
      +'.q4b-tomo-flash{position:absolute;inset:0;background:radial-gradient(circle,rgba(255,236,170,.95) 0%,rgba(255,236,170,0) 70%);animation:q4bTomoFlash 900ms ease-out forwards}'
      +'.q4b-tomo-flash-strong{animation-duration:1400ms}'
      +'.q4b-tomo-conf{position:absolute;top:-6vh;width:10px;height:14px;border-radius:2px;animation:q4bTomoConf 1.8s linear forwards}'
      +'.q4b-tomo-center{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 26px;border-radius:24px;background:#fffcf2;box-shadow:0 10px 40px rgba(0,0,0,.25);animation:q4bTomoPop 520ms cubic-bezier(.2,1.6,.4,1) both}'
      +'.q4b-tomo-center .q4b-tomo-flame{animation:q4bTomoRise 900ms ease-out both}'
      +'.q4b-tomo-title{font-size:22px;font-weight:900;color:#3a2a14;text-align:center}'
      +'.q4b-tomo-amber{font-size:30px;font-weight:900;color:#d97a00;animation:q4bTomoAmber 900ms 250ms ease-out both}'
      +'.q4b-tomo-sub{font-size:14px;font-weight:700;color:#6b5330;text-align:center}'
      +'.q4b-tomo-bonus,.q4b-tomo-up{background:rgba(30,20,5,.28)}'
      +'.q4b-tomo-bonus{animation:q4bTomoOut 3000ms ease-in forwards}'
      +'.q4b-tomo-up{animation:q4bTomoOut 4800ms ease-in forwards}'
      +'.q4b-tomo-swap{position:relative;width:160px;height:160px;display:flex;align-items:center;justify-content:center}'
      +'.q4b-tomo-swap>span{position:absolute}'
      +'.q4b-tomo-up .q4b-tomo-old{animation:q4bTomoOldOut 1200ms ease-in forwards}'
      +'.q4b-tomo-up .q4b-tomo-new{animation:q4bTomoNewIn 1400ms 900ms cubic-bezier(.2,1.5,.4,1) both}'
      +'.q4b-tomo-down .q4b-tomo-old{animation:q4bTomoDim 1300ms ease-in forwards}'
      +'.q4b-tomo-down .q4b-tomo-new{animation:q4bTomoNewIn 900ms 1200ms ease-out both}'
      +'.q4b-tomo-modal{position:relative;max-width:min(92vw,420px);display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 22px;border-radius:22px;background:#fffaf0;box-shadow:0 12px 40px rgba(0,0,0,.3);color:#3a2a14}'
      +'.q4b-tomo-modal p{margin:0;font-size:14px;line-height:1.6}'
      +'.q4b-tomo-modal table{border-collapse:collapse;font-size:13px;font-weight:700}'
      +'.q4b-tomo-modal td{padding:3px 6px;vertical-align:middle}'
      +'.q4b-tomo-note{color:#6b5330;font-size:12px!important}'
      +'.q4b-tomo-ok{margin-top:4px;padding:10px 28px;border:0;border-radius:999px;background:#ff9a3c;color:#fff;font:inherit;font-size:16px;font-weight:900;cursor:pointer}'
      +'@keyframes q4bTomoFlick{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.06) rotate(2deg)}}'
      +'@keyframes q4bTomoFlash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}'
      +'@keyframes q4bTomoConf{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}100%{transform:translate3d(0,112vh,0) rotate(540deg);opacity:.9}}'
      +'@keyframes q4bTomoPop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}'
      +'@keyframes q4bTomoRise{0%{transform:translateY(24px) scale(.6)}60%{transform:translateY(-6px) scale(1.15)}100%{transform:translateY(0) scale(1)}}'
      +'@keyframes q4bTomoAmber{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.25);opacity:1}100%{transform:scale(1)}}'
      +'@keyframes q4bTomoOut{0%,82%{opacity:1}100%{opacity:0}}'
      +'@keyframes q4bTomoOldOut{0%{transform:scale(1);opacity:1}100%{transform:scale(1.6);opacity:0}}'
      +'@keyframes q4bTomoNewIn{0%{transform:scale(.2);opacity:0}100%{transform:scale(1);opacity:1}}'
      +'@keyframes q4bTomoDim{0%{transform:scale(1);opacity:1;filter:none}100%{transform:scale(.6);opacity:0;filter:grayscale(1) brightness(.6)}}'
      +'@media (prefers-reduced-motion:reduce){'
      +'.q4b-tomo-badge .q4b-tomo-icon,.q4b-tomo-center,.q4b-tomo-center .q4b-tomo-flame,.q4b-tomo-amber,.q4b-tomo-conf,.q4b-tomo-flash{animation:none!important}'
      +'.q4b-tomo-conf,.q4b-tomo-flash,.q4b-tomo-old{display:none}'
      +'.q4b-tomo-new{animation:none!important;opacity:1}'
      +'}';
    doc.head.appendChild(st);
  }

  var started=false;
  function init(){
    if(started||!global.document||!global.addEventListener)return;
    started=true;
    global.addEventListener("q4b-tomoshibi",onPaid);
    global.addEventListener("q4b-store-reloaded",function(){ global.setTimeout(checkNow,0); });
    global.document.addEventListener("click",onClick);
    if(global.document.readyState==="loading")global.document.addEventListener("DOMContentLoaded",checkNow);
    else global.setTimeout(checkNow,0);
  }

  global.Q4BTomoshibiUI={
    badgeHTML:badgeHTML,
    streakDays:streakDays,
    viewModel:viewModel,
    showHelp:showHelp,
    checkNow:checkNow,
    init:init
  };
  init();
})(typeof window!=="undefined"?window:globalThis);
