/* Quest4Bugs morning shiny bonus and shared shiny presentation layer. */
(function(global){
  "use strict";

  var NORMAL_CHANCE = 0.015;
  var MORNING_CHANCE = 0.045;
  var lastMorningCatchAt = 0;
  var summaryTimer = null;

  function isMorningBonusTime(date){
    var d = date || new Date();
    var h = d.getHours();
    return h >= 6 && h < 8;
  }

  function shinyTitle(count){
    var table = [
      [100, "色ちがい博士"],
      [50, "きらめきマスター"],
      [25, "虹色コレクター"],
      [10, "色ちがいコレクター"],
      [5, "きらめきハンター"]
    ];
    for(var i=0;i<table.length;i++) if(count >= table[i][0]) return table[i][1];
    return "";
  }

  function addShinyIds(out, catches){
    if(!catches) return;
    for(var id in catches){
      if(Object.prototype.hasOwnProperty.call(catches,id) && catches[id] && catches[id].shiny) out[id] = true;
    }
  }

  function shinySpeciesCount(states){
    states = states || {};
    var ids = {};
    var keisan = states.keisan || {};
    var kanji = states.kanji || {};
    var eitango = states.eitango || {};
    var battle = states.battle || {};
    addShinyIds(ids, keisan.coll && keisan.coll.catches);
    addShinyIds(ids, kanji.coll && kanji.coll.catches);
    addShinyIds(ids, eitango.catches || (eitango.coll && eitango.coll.catches));
    addShinyIds(ids, battle.bosses);
    return Object.keys(ids).length;
  }

  function wrapRenderer(name){
    var renderer = global.Q4BRender;
    if(!renderer || typeof renderer[name] !== "function" || renderer[name].__q4bShinyWrapped) return;
    var original = renderer[name];
    var wrapped = function(sp, shiny, sex){
      var html = original.apply(this, arguments);
      if(!shiny) return html;
      return '<span class="q4b-shiny-art q4b-shiny-static" data-q4b-shiny="1">'
        + html + '<span class="q4b-shiny-badge" aria-hidden="true">✨</span></span>';
    };
    wrapped.__q4bShinyWrapped = true;
    wrapped.__q4bOriginal = original;
    renderer[name] = wrapped;
  }

  function trackMorningResult(result){
    if(result && result.morningBonus){
      lastMorningCatchAt = Date.now();
    }
    return result;
  }

  function wrapRewardMethod(name){
    var reward = global.Q4BReward;
    if(!reward || typeof reward[name] !== "function" || reward[name].__q4bShinyTracked) return;
    var original = reward[name];
    var wrapped = function(){ return trackMorningResult(original.apply(this, arguments)); };
    wrapped.__q4bShinyTracked = true;
    wrapped.__q4bOriginal = original;
    reward[name] = wrapped;
  }

  function mountMorningBanner(){
    var old = document.getElementById("q4b-morning-shiny-banner");
    if(!isMorningBonusTime()){
      if(old) old.remove();
      return;
    }
    if(old) return;
    var banner = document.createElement("div");
    banner.id = "q4b-morning-shiny-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML = '<span class="q4b-morning-sun">🌅</span><span><b>朝露ボーナス</b><small>朝8時まで 色ちがい3倍</small></span>';
    document.body.appendChild(banner);
  }

  function addMorningCatchMessage(){
    if(!lastMorningCatchAt || Date.now() - lastMorningCatchAt > 4000) return;
    var candidates = document.querySelectorAll(".card.center, .mcard, .face.front");
    for(var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if(el.textContent.indexOf("つかまえた") < 0 && !(el.classList.contains("face") && el.textContent.indexOf("✨") >= 0)) continue;
      var host = el.classList.contains("face") ? (el.closest(".card") || el.parentElement) : el;
      if(host && !host.querySelector(".q4b-morning-catch-note")){
        var note = document.createElement("div");
        note.className = "q4b-morning-catch-note";
        note.textContent = "🌅 朝露ボーナスで見つけた！";
        var heading = host.querySelector("h2,h3");
        if(heading && heading.nextSibling) heading.parentNode.insertBefore(note, heading.nextSibling);
        else host.insertBefore(note, host.firstChild);
      }
      lastMorningCatchAt = 0;
      break;
    }
  }

  function decorate(root){
    root = root || document;
    var cards = root.querySelectorAll ? root.querySelectorAll(".zc, .spec.shiny, .face.front, .shiny-card") : [];
    for(var i=0;i<cards.length;i++){
      var card = cards[i];
      if(card.classList.contains("shiny-card") || card.classList.contains("shiny") || card.textContent.indexOf("✨") >= 0){
        card.classList.add("q4b-shiny-card");
        if((card.classList.contains("face") || card.classList.contains("spec")) && !card.dataset.q4bShinyRevealed){
          card.dataset.q4bShinyRevealed = "1";
          card.classList.add("q4b-shiny-reveal");
          (function(c){ setTimeout(function(){ c.classList.remove("q4b-shiny-reveal"); }, 1400); })(card);
        }
      }
    }

    var eggMarks = root.querySelectorAll ? root.querySelectorAll(".q4b-egg-shiny") : [];
    for(var j=0;j<eggMarks.length;j++){
      var eggCard = eggMarks[j].closest(".q4b-egg-card, .zd-egg-row, .zd-egg-pending-row");
      if(eggCard) eggCard.classList.add("q4b-shiny-egg");
    }

    var arts = root.querySelectorAll ? root.querySelectorAll(".q4b-shiny-art") : [];
    for(var k=0;k<arts.length;k++){
      if(arts[k].closest(".modal, .mcard, [data-q4b-zd], .drop-award")) arts[k].classList.add("q4b-shiny-detail");
    }

    addMorningCatchMessage();
  }

  function isPortal(){
    var p = (global.location && global.location.pathname) || "";
    return !/(?:\/kanji\/|\/keisan\/|\/eitango\/|\/battle\.html$)/.test(p);
  }

  function loadShinySummary(){
    if(!isPortal() || !global.QuestSave || !QuestSave.currentProfile || !QuestSave.load) return;
    var pid = QuestSave.currentProfile();
    var existing = document.getElementById("q4b-shiny-summary");
    if(!pid){ if(existing) existing.remove(); return; }
    Promise.all([
      QuestSave.load("keisan",pid),
      QuestSave.load("kanji",pid),
      QuestSave.load("eitango",pid),
      QuestSave.load("battle",pid)
    ]).then(function(r){
      if(QuestSave.currentProfile() !== pid) return;
      var count = shinySpeciesCount({keisan:r[0],kanji:r[1],eitango:r[2],battle:r[3]});
      var title = shinyTitle(count);
      var box = document.getElementById("q4b-shiny-summary");
      if(!box){
        box = document.createElement("div");
        box.id = "q4b-shiny-summary";
        box.className = "q4b-shiny-summary";
        var hero = document.querySelector(".hero");
        if(hero && hero.parentNode) hero.parentNode.insertBefore(box, hero.nextSibling);
        else document.body.insertBefore(box, document.body.firstChild);
      }
      box.innerHTML = '<span class="q4b-shiny-summary-icon">✨</span><span><b>色ちがい '+count+'種</b>'
        +(title?'<small>現在の称号　'+title+'</small>':'<small>5種で最初の称号</small>')+'</span>';
    }).catch(function(){});
  }

  function scheduleSummary(){
    if(!isPortal()) return;
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(loadShinySummary, 400);
  }

  function init(){
    wrapRenderer("species");
    wrapRenderer("deco");
    wrapRewardMethod("award");
    wrapRewardMethod("onCorrect");
    mountMorningBanner();
    decorate(document);
    scheduleSummary();
    /* This script is intentionally loaded after each game's app code. If the first
       screen was rendered synchronously, redraw it once so shiny SVG wrappers also
       apply on the initial screen rather than only after the next navigation. */
    if(typeof global.Q4BZukanRerender === "function"){
      setTimeout(function(){
        try{ global.Q4BZukanRerender(); decorate(document); }catch(_){}
      }, 0);
    }

    if(global.MutationObserver){
      var observer = new MutationObserver(function(mutations){
        for(var i=0;i<mutations.length;i++){
          for(var j=0;j<mutations[i].addedNodes.length;j++){
            var node = mutations[i].addedNodes[j];
            if(node && node.nodeType === 1) decorate(node);
          }
        }
        mountMorningBanner();
        scheduleSummary();
      });
      observer.observe(document.body, {childList:true, subtree:true});
    }
  }

  global.Q4BShiny = {
    NORMAL_CHANCE: NORMAL_CHANCE,
    MORNING_CHANCE: MORNING_CHANCE,
    isMorningBonusTime: isMorningBonusTime,
    shinySpeciesCount: shinySpeciesCount,
    shinyTitle: shinyTitle,
    decorate: decorate,
    refreshSummary: loadShinySummary
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})(window);
