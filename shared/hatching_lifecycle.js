/* Quest4Bugs hatching lifecycle correction.
   - Eggs never expose or preserve a shiny outcome.
   - Shiny is rolled only when the adult hatches.
   - Adult is not an in-slot growth stage; it appears once in the hatch reveal. */
(function(global){
  "use strict";

  var R = global.Q4BReward;
  var B = global.Q4BBreeding;
  if(!R || !B || R.__q4bHatchingLifecyclePatched) return;
  R.__q4bHatchingLifecyclePatched = true;

  var original = {
    layEgg: R.layEgg,
    awardMasterEgg: R.awardMasterEgg,
    awardBossEgg: R.awardBossEgg,
    feedEgg: R.feedEgg,
    advanceStage: R.advanceStage,
    hatchEgg: R.hatchEgg,
    eggCardHTML: B.eggCardHTML,
    homeBreedingPanelHTML: B.homeBreedingPanelHTML,
    openEggInfoModal: B.openEggInfoModal,
    openEggNestModal: B.openEggNestModal,
    playHatchAnimation: B.playHatchAnimation
  };

  function orderFor(sp){
    return sp && sp.metamorphosis === "complete"
      ? ["egg","larva","pupa","adult"]
      : ["egg","nymph","adult"];
  }

  /* Adult is deliberately excluded from natural in-slot progression. */
  function naturalStage(egg, sp){
    var ratio = egg && egg.target > 0 ? (egg.progress || 0) / egg.target : 0;
    if(sp && sp.metamorphosis === "complete"){
      if(ratio < 0.25) return "egg";
      if(ratio < 0.50) return "larva";
      return "pupa";
    }
    if(ratio < 0.35) return "egg";
    return "nymph";
  }

  function displayStage(egg, sp){
    var nat = naturalStage(egg, sp);
    if(!egg || !egg.shownStage) return nat;
    var order = orderFor(sp);
    var iNat = order.indexOf(nat);
    var iShown = order.indexOf(egg.shownStage);
    if(iShown < 0 || iShown >= order.length-1) return nat;
    return iShown <= iNat ? egg.shownStage : nat;
  }

  function progressComplete(egg){
    return !!(egg && (egg.progress || 0) >= (egg.target || 0));
  }

  function finalJuvenileStage(sp){
    var order = orderFor(sp);
    return order[order.length-2];
  }

  function canHatchNow(egg, sp){
    if(!egg || !sp || !progressComplete(egg)) return false;
    return displayStage(egg, sp) === finalJuvenileStage(sp);
  }

  /* Kept compatible with existing breeding UI: true means either advance or hatch. */
  function canAdvanceStage(egg, sp){
    if(!egg || !sp) return false;
    var order = orderFor(sp);
    var iNat = order.indexOf(naturalStage(egg, sp));
    var iShown = order.indexOf(displayStage(egg, sp));
    if(iNat > iShown) return true;
    return canHatchNow(egg, sp);
  }

  function nextStageFor(egg, sp){
    var order = orderFor(sp);
    var iShown = order.indexOf(displayStage(egg, sp));
    if(iShown < 0 || iShown >= order.length-1) return null;
    return order[iShown+1];
  }

  function isHatchReady(egg){
    var sp = egg && R.spById ? R.spById(egg.id) : null;
    return canHatchNow(egg, sp);
  }

  R.naturalStage = naturalStage;
  R.currentStage = naturalStage;
  R.displayStage = displayStage;
  R.canAdvanceStage = canAdvanceStage;
  R.nextStageFor = nextStageFor;
  R.canHatchNow = canHatchNow;
  R.isHatchReady = isHatchReady;

  function currentState(){
    try{ return R.getBreedingState ? R.getBreedingState() : null; }catch(_){ return null; }
  }

  function findEgg(id){
    var bs = currentState();
    if(!bs) return null;
    var all = (bs.eggs || []).concat(bs.pendingEggs || []);
    for(var i=0;i<all.length;i++) if(all[i] && all[i].id === id) return all[i];
    return null;
  }

  function normalizeEgg(egg, forceInitialStage){
    if(!egg) return false;
    var changed = false;
    if(Object.prototype.hasOwnProperty.call(egg, "shiny")){
      delete egg.shiny;
      changed = true;
    }
    if(forceInitialStage && !egg.shownStage){
      egg.shownStage = "egg";
      changed = true;
    }
    if(egg.stageHistory && egg.stageHistory.length){
      var filtered = egg.stageHistory.filter(function(h){ return h && h.stage !== "adult"; });
      if(filtered.length !== egg.stageHistory.length){
        egg.stageHistory = filtered;
        changed = true;
      }
    }
    return changed;
  }

  function normalizeState(persist){
    var bs = currentState();
    if(!bs) return Promise.resolve(false);
    var changed = false;
    (bs.eggs || []).forEach(function(e){
      changed = normalizeEgg(e, (e.progress || 0) === 0) || changed;
    });
    (bs.pendingEggs || []).forEach(function(e){
      changed = normalizeEgg(e, (e.progress || 0) === 0) || changed;
    });
    if(changed && persist && R.flushBreeding){
      return Promise.resolve(R.flushBreeding()).then(function(){ return true; }, function(){ return false; });
    }
    return Promise.resolve(changed);
  }

  function normalizeCreationResult(ret){
    var egg = ret && ret.egg ? ret.egg : ret;
    var changed = normalizeEgg(egg, true);
    if(changed && R.flushBreeding){
      return Promise.resolve(R.flushBreeding()).then(function(){ return ret; }, function(){ return ret; });
    }
    return Promise.resolve(ret);
  }

  if(typeof original.layEgg === "function"){
    R.layEgg = function(){
      return Promise.resolve(original.layEgg.apply(this, arguments)).then(normalizeCreationResult);
    };
  }
  if(typeof original.awardMasterEgg === "function"){
    R.awardMasterEgg = function(){
      return Promise.resolve(original.awardMasterEgg.apply(this, arguments)).then(normalizeCreationResult);
    };
  }
  if(typeof original.awardBossEgg === "function"){
    R.awardBossEgg = function(){
      return Promise.resolve(original.awardBossEgg.apply(this, arguments)).then(normalizeCreationResult);
    };
  }

  if(typeof original.feedEgg === "function"){
    R.feedEgg = function(){
      return Promise.resolve(original.feedEgg.apply(this, arguments)).then(function(ret){
        return normalizeState(true).then(function(){ return ret; });
      });
    };
  }

  if(typeof original.advanceStage === "function"){
    R.advanceStage = function(coll, id){
      var egg = findEgg(id);
      var sp = egg && R.spById ? R.spById(id) : null;
      if(!egg || !sp || !canAdvanceStage(egg, sp)) return Promise.resolve(null);
      if(nextStageFor(egg, sp) === "adult") return Promise.resolve(null);
      return original.advanceStage.apply(this, arguments);
    };
  }

  if(typeof original.hatchEgg === "function"){
    R.hatchEgg = function(coll, id){
      var egg = findEgg(id);
      var sp = egg && R.spById ? R.spById(id) : null;
      if(!egg || !sp || !canHatchNow(egg, sp)) return Promise.resolve(null);

      /* Override any legacy pre-rolled value. This is the one and only shiny roll. */
      var hadLegacy = Object.prototype.hasOwnProperty.call(egg, "shiny");
      var legacyValue = egg.shiny;
      egg.shiny = !!R.rollShiny({source:"hatch"});

      return Promise.resolve(original.hatchEgg.apply(this, arguments)).then(function(ret){
        if(!ret){
          if(hadLegacy) egg.shiny = legacyValue;
          else delete egg.shiny;
          return null;
        }
        ret.shiny = !!(ret.egg && ret.egg.shiny);
        if(ret.egg){
          ret.egg.stageHistory = ret.egg.stageHistory || [];
          if(!ret.egg.stageHistory.some(function(h){ return h && h.stage === "adult"; })){
            ret.egg.stageHistory.push({stage:"adult", d:new Date().toISOString().slice(0,10)});
          }
        }
        return ret;
      }, function(err){
        if(hadLegacy) egg.shiny = legacyValue;
        else delete egg.shiny;
        throw err;
      });
    };
  }

  function stripEggShiny(eggs){
    (eggs || []).forEach(function(e){ normalizeEgg(e, (e.progress || 0) === 0); });
  }

  if(typeof original.eggCardHTML === "function"){
    B.eggCardHTML = function(egg){ normalizeEgg(egg, (egg && (egg.progress || 0) === 0)); return original.eggCardHTML.apply(this, arguments); };
  }
  if(typeof original.homeBreedingPanelHTML === "function"){
    B.homeBreedingPanelHTML = function(opts){ stripEggShiny(opts && opts.eggs); return original.homeBreedingPanelHTML.apply(this, arguments); };
  }
  if(typeof original.openEggInfoModal === "function"){
    B.openEggInfoModal = function(opts){ if(opts && opts.egg) normalizeEgg(opts.egg, (opts.egg.progress || 0) === 0); return original.openEggInfoModal.apply(this, arguments); };
  }
  if(typeof original.openEggNestModal === "function"){
    B.openEggNestModal = function(opts){ stripEggShiny(opts && opts.pendingEggs); return original.openEggNestModal.apply(this, arguments); };
  }

  function visualHTML(stage, sp, size){
    var v = B.stageVisual ? B.stageVisual(stage, sp) : null;
    if(v && v.svgUrl) return '<img src="'+v.svgUrl+'" alt="" style="width:'+size+'px;height:'+size+'px;display:block;margin:auto" onerror="this.style.display=\'none\'">';
    return '<div style="font-size:'+Math.round(size*0.72)+'px;line-height:1">'+((v && v.emoji) || (stage === "pupa" ? "🛌" : "🦗"))+'</div>';
  }

  /* Final animation: one juvenile stage, then the actual adult once. */
  B.playHatchAnimation = function(opts){
    opts = opts || {};
    var sp = opts.sp, egg = opts.egg;
    if(!sp || !egg || !global.document) return;
    var doc = global.document;
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var preAdult = sp.metamorphosis === "complete" ? "pupa" : "nymph";
    var sexMark = egg.sex === "m" ? "♂" : egg.sex === "f" ? "♀" : "";
    var shiny = !!egg.shiny;
    var adult = global.Q4BRender && global.Q4BRender.species ? global.Q4BRender.species(sp, shiny, egg.sex) : "🐞";

    if(!doc.getElementById("q4bLifecycleFxCss")){
      var style = doc.createElement("style");
      style.id = "q4bLifecycleFxCss";
      style.textContent = ''
        + '@keyframes q4bLifeFlash{0%{opacity:0}28%{opacity:.9}100%{opacity:0}}'
        + '@keyframes q4bLifePop{0%{opacity:0;transform:scale(.45) rotate(-5deg)}55%{opacity:1;transform:scale(1.15) rotate(2deg)}100%{transform:scale(1)}}'
        + '@keyframes q4bLifeConf{0%{transform:translateY(-25px) rotate(0);opacity:1}100%{transform:translateY(330px) rotate(620deg);opacity:0}}'
        + '.q4b-life-conf{position:absolute;top:0;width:9px;height:13px;border-radius:2px;animation:q4bLifeConf 2.2s ease-out forwards;pointer-events:none}';
      (doc.head || doc.body).appendChild(style);
    }

    var ov = doc.createElement("div");
    ov.id = "q4bHatchOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.72);display:flex;align-items:center;justify-content:center;z-index:320;padding:14px";
    ov.innerHTML = '<div id="q4bLifeCard" style="position:relative;overflow:hidden;background:#FFFDF4;border-radius:24px;max-width:370px;width:96%;padding:24px 20px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.42)">'
      + '<div id="q4bLifeTitle" style="font-size:18px;font-weight:900;color:#8A5C2C;margin-bottom:8px">'+(preAdult === "pupa" ? "さなぎが うごきだした…！" : "わかむしが ひかりだした…！")+'</div>'
      + '<div id="q4bLifeVisual" style="min-height:150px;display:flex;align-items:center;justify-content:center">'+visualHTML(preAdult, sp, 125)+'</div>'
      + '<div id="q4bLifeName" style="display:none;font-size:21px;font-weight:900;color:#2A3D2C;margin-top:8px"></div>'
      + '<div id="q4bLifeMeta" style="display:none;font-size:13px;color:#6B7A5E;margin-top:3px"></div>'
      + '<div id="q4bLifeBtns" style="display:none;margin-top:16px">'
      + '<button id="q4bLifeView" style="border:none;background:#3FA86B;color:#fff;border-radius:12px;padding:10px 18px;font-weight:800;font-family:inherit;margin-right:6px">図鑑で みる</button>'
      + '<button id="q4bLifeClose" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:10px 18px;font-weight:700;font-family:inherit">とじる</button>'
      + '</div></div>';
    doc.body.appendChild(ov);

    var card = ov.querySelector("#q4bLifeCard");
    var visual = ov.querySelector("#q4bLifeVisual");
    var delay = reduce ? 120 : 650;
    setTimeout(function(){
      var flash = doc.createElement("div");
      flash.style.cssText = "position:fixed;inset:0;z-index:319;pointer-events:none;background:radial-gradient(circle,#fffbd0 0%,rgba(255,221,90,.7) 24%,rgba(118,211,255,.28) 48%,transparent 72%);animation:q4bLifeFlash .9s ease-out forwards";
      doc.body.appendChild(flash);
      setTimeout(function(){ if(flash.parentNode) flash.remove(); }, 950);

      visual.innerHTML = '<div class="'+(shiny ? 'q4b-shiny-card q4b-shiny-reveal' : '')+'" style="position:relative;width:155px;height:155px;margin:auto;animation:q4bLifePop .75s ease-out both">'+adult+'</div>';
      ov.querySelector("#q4bLifeTitle").textContent = shiny ? "✨ 色ちがいが うまれた！ ✨" : "🎉 せいちゅうに なったよ！";
      ov.querySelector("#q4bLifeName").textContent = (sp.jaName || sp.id) + " " + sexMark;
      ov.querySelector("#q4bLifeName").style.display = "block";
      ov.querySelector("#q4bLifeMeta").textContent = (opts.size != null ? opts.size + "mm　" : "") + "きみが そだてた 特別な子だよ";
      ov.querySelector("#q4bLifeMeta").style.display = "block";
      ov.querySelector("#q4bLifeBtns").style.display = "block";

      if(!reduce){
        var colors = ["#F2A33C","#3FA86B","#5B8DE0","#E84A6B","#A06BD8"];
        for(var i=0;i<26;i++){
          var c = doc.createElement("i");
          c.className = "q4b-life-conf";
          c.style.left = (Math.random()*100) + "%";
          c.style.background = colors[i%colors.length];
          c.style.animationDelay = (Math.random()*.35) + "s";
          c.style.animationDuration = (1.7+Math.random()*.9) + "s";
          card.appendChild(c);
        }
      }
      if(shiny && global.Q4BShiny && global.Q4BShiny.decorate) global.Q4BShiny.decorate(card);
    }, delay);

    ov.querySelector("#q4bLifeView").onclick = function(){ ov.remove(); if(opts.onViewZukan) opts.onViewZukan(sp.id); };
    ov.querySelector("#q4bLifeClose").onclick = function(){ ov.remove(); if(opts.onClose) opts.onClose(); };
  };

  /* Normalize existing eggs once the breeding cache becomes available. */
  setTimeout(function(){ normalizeState(true); }, 0);
  setTimeout(function(){ normalizeState(true); }, 1200);
})(typeof window !== "undefined" ? window : globalThis);
