/* 卵育成: 開発用デバッグヘルパ。
   URL に ?debug=1 を付けたときだけ window.Q4BDebug を expose する。
   本番ビルドでも安全 (gated)。
   詳細: docs/breeding_eggs_plan.md Phase 1 step 10 */
(function(global){
  "use strict";
  if(typeof global.location === "undefined") return;
  if(!/[?&]debug=1\b/.test(global.location.search||"")) return;
  if(!global.Q4BReward) return;

  var R = global.Q4BReward;
  var QS = global.QuestSave;

  function pid(){
    return (QS && QS.currentProfile && QS.currentProfile()) || null;
  }

  global.Q4BDebug = {
    /* 卵 progress を強制セット (孵化準備済テストに便利) */
    setEggProgress: function(spId, n){
      if(!QS || !QS.breedingOf || !QS.breedingSet) return false;
      var p = pid(); if(!p) return false;
      var bs = QS.breedingOf(p);
      var i, hit=false;
      for(i=0;i<bs.eggs.length;i++){ if(bs.eggs[i].id===spId){ bs.eggs[i].progress = n; hit=true; break; } }
      if(!hit) return false;
      QS.breedingSet(p, bs);
      return true;
    },
    /* 全卵を強制孵化 */
    forceHatchAll: function(coll){
      if(!coll) { console.warn("[Q4BDebug] forceHatchAll: coll required"); return []; }
      if(!QS || !QS.breedingOf || !QS.breedingSet) return [];
      var p = pid(); if(!p) return [];
      var bs = QS.breedingOf(p);
      var out=[];
      var ids = bs.eggs.map(function(e){return e.id;});
      ids.forEach(function(id){
        var bs2 = QS.breedingOf(p);
        var egg = bs2.eggs.find(function(e){return e.id===id;});
        if(egg){ egg.progress = egg.target; QS.breedingSet(p, bs2); }
        var r = R.hatchEgg(coll, id);
        if(r) out.push(r);
      });
      return out;
    },
    /* マスター卵を即授与 (新規達成相当) */
    grantMasterEgg: function(coll, spId, sex){
      var sp = R.spById(spId); if(!sp){ console.warn("[Q4BDebug] unknown sp:", spId); return null; }
      return R.awardMasterEgg(coll, sp, sex);
    },
    /* ボス N 回撃破をシミュレート (BATTLE.bosses に書き込む) */
    simulateBossKills: function(spId, n){
      if(!global.BATTLE){ global.BATTLE = {bosses:{}}; }
      if(!global.BATTLE.bosses) global.BATTLE.bosses = {};
      var out=[];
      for(var i=0;i<n;i++){ out.push(R.bossKillReward(spId, global.BATTLE.bosses)); }
      console.log("[Q4BDebug] bosses["+spId+"] =", global.BATTLE.bosses[spId]);
      return out;
    },
    /* かけらを付与 (テスト用) */
    grantFragments: function(n){
      var p = pid(); if(!p) return false;
      if(!QS || !QS.addFossil) return false;
      QS.addFossil(p, n);
      console.log("[Q4BDebug] fossilFragments now:", QS.fossilOf ? QS.fossilOf(p) : "?");
      return true;
    },
    /* breeding state を console に dump */
    state: function(){
      var p = pid();
      if(!p || !QS || !QS.breedingOf) return null;
      var s = QS.breedingOf(p);
      console.log("[Q4BDebug] breeding state:", JSON.stringify(s, null, 2));
      return s;
    },
    /* 一式テスト: かけら付与 → 産卵 → progress 強制 → 孵化 */
    e2e: function(coll, spId){
      if(!coll){ console.warn("[Q4BDebug.e2e] coll required"); return; }
      var sp = R.spById(spId); if(!sp){ console.warn("[Q4BDebug.e2e] unknown sp:", spId); return; }
      var cost = R.eggCost(sp);
      console.log("[Q4BDebug.e2e] step1: grant fragments", cost);
      this.grantFragments(cost);
      console.log("[Q4BDebug.e2e] step2: layEgg");
      var egg = R.layEgg(coll, sp);
      console.log("[Q4BDebug.e2e] egg:", egg);
      if(!egg){ console.warn("[Q4BDebug.e2e] layEgg failed (前提未充足? canLayEgg=", R.canLayEgg(coll, sp), ")"); return; }
      console.log("[Q4BDebug.e2e] step3: setEggProgress to target");
      this.setEggProgress(spId, R.eggTarget(sp));
      console.log("[Q4BDebug.e2e] step4: hatchEgg");
      var r = R.hatchEgg(coll, spId);
      console.log("[Q4BDebug.e2e] hatch result:", r);
      console.log("[Q4BDebug.e2e] coll.catches["+spId+"]:", coll.catches[spId]);
      return r;
    }
  };
  console.log("[Q4BDebug] debug mode enabled. Try: Q4BDebug.state() / Q4BDebug.e2e(ST.coll, 'kabutomushi')");
})(typeof window!=="undefined"?window:globalThis);
