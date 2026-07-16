/* Quest4Bugs morning shiny bonus and shared shiny presentation layer. */
(function(global){
  "use strict";

  var NORMAL_CHANCE = global.Q4BReward ? global.Q4BReward.SHINY_CHANCE_NORMAL : 0.015;
  var MORNING_CHANCE = global.Q4BReward ? global.Q4BReward.SHINY_CHANCE_MORNING : 0.045;
  var lastMorningCatchAt = 0;
  var summaryTimer = null;

  function isMorningBonusTime(date){
    return !!(global.Q4BReward && global.Q4BReward.isMorningBonusTime(date));
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

  function trackMorningResult(result){
    if(result && result.morningBonus && result.shiny){
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
    banner.innerHTML = '<span class="q4b-morning-sun">🌅</span><span>あさ6じ〜8じ　がくしゅうで みつける 色ちがい3ばい</span>';
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
        var safeReveal = card.closest(".modal, .mcard, [data-q4b-zd], .drop-award");
        if(safeReveal && (card.classList.contains("face") || card.classList.contains("spec")) && !card.dataset.q4bShinyRevealed){
          card.dataset.q4bShinyRevealed = "1";
          card.classList.add("q4b-shiny-reveal");
          (function(c){ setTimeout(function(){ c.classList.remove("q4b-shiny-reveal"); }, 1400); })(card);
        }
      }
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
      if(!box) return;
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
    wrapRewardMethod("award");
    wrapRewardMethod("onCorrect");
    mountMorningBanner();
    setInterval(mountMorningBanner, 30000);
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

/* Load the breeding lifecycle correction from the same shared directory. */
(function(){
  var current = document.currentScript;
  var src;
  try{
    src = current && current.src
      ? new URL("hatching_lifecycle.js", current.src).href
      : ((/\/(?:kanji|keisan|eitango)\//.test(location.pathname) ? "../" : "./") + "shared/hatching_lifecycle.js");
  }catch(_){
    src = "./shared/hatching_lifecycle.js";
  }
  if(document.querySelector('script[data-q4b-hatching-lifecycle="1"]')) return;
  var script = document.createElement("script");
  script.src = src;
  script.async = false;
  script.dataset.q4bHatchingLifecycle = "1";
  script.onload = function(){
    /* Existing eggs may already be painted with the old >=85% adult stage.
       Re-render once after the corrected lifecycle overrides are active. */
    setTimeout(function(){
      try{
        if(typeof window.Q4BZukanRerender === "function") window.Q4BZukanRerender();
        if(window.Q4BShiny && window.Q4BShiny.decorate) window.Q4BShiny.decorate(document);
      }catch(_){}
    }, 0);
  };
  (document.head || document.documentElement).appendChild(script);
})();
