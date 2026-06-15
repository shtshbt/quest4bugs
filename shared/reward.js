(function(global){
  "use strict";
  /* =========================================================================
     Quest4Bugs shared collection-reward engine
     -------------------------------------------------------------------------
     One insect-collection reward, shared by every game (originally only the
     English game had it). Correct answers fill a gauge; a full gauge rolls a
     catch from that game's species pool, weighted by rarity tier. Catches are
     recorded with a size (individual variation) so there is always a "personal
     best" to chase even for already-owned species.

     Species are partitioned across games by taxonomy (tunable in gameFor):
       かんじ  -> 鱗翅目(チョウ・ガ)      けいさん -> 甲虫目      えいたんご -> その他
     Each game stores a small `coll` object in its own profile save:
       coll = { gauge:0, total:0, catches:{ <id>:{n,max,shiny} } }
     ========================================================================= */

  var BUGS = global.Q4B_BUGS || [];

  /* ---- allocation (thematic, by order; edit gameFor to retune) ---- */
  function gameFor(sp){
    var o = sp.order;
    if(o === "Lepidoptera") return "kanji";
    if(o === "Coleoptera")  return "keisan";
    return "eitango";
  }
  var POOLS = { kanji:[], keisan:[], eitango:[] };
  /* masterOnly(全習得限定)・bossOnly(ボス専用)・SS(でんせつ)は通常の採集プールから除外。
     ゲージ/琥珀の抽選には絶対に出さず、SSは習得達成(マスター)/ボス撃破でのみ授与する。 */
  BUGS.forEach(function(sp){ if(sp.masterOnly||sp.bossOnly||sp.rarity==="SS")return; (POOLS[gameFor(sp)] || POOLS.eitango).push(sp); });
  function pool(game){ return POOLS[game] || BUGS; }
  function poolCount(game){ return pool(game).length; }

  /* ---- rarity tier (5 levels, matches bugs.js RARITY_LEVEL) ---- */
  var TIER = { N:0, R:1, SR:2, SSR:3, SS:4 };
  var TIERNAME = ["ノーマル", "レア", "スーパーレア", "ウルトラレア", "でんせつ"];
  function tierOf(sp){ var t = TIER[sp.rarity]; return t == null ? 0 : t; }

  /* ---- deterministic size range (mm) from look/rarity ---- */
  var BASE_SIZE = {
    kabuto:[45,85], kuwagata:[35,75], ageha:[70,120], tateha:[45,90], chou:[35,70],
    shijimi:[18,40], seseri:[22,42], ga:[35,110], semi:[35,65], tombo:[35,95],
    batta:[25,75], kamakiri:[55,95], kamikiri:[18,55], kogane:[12,35], tamamushi:[20,45],
    osamushi:[18,45], tentou:[5,12], hotaru:[8,20], mizu:[20,60], hachi:[12,40],
    ari:[5,18], kemushi:[30,100], dango:[8,16], other:[12,45]
  };
  function hash(s){ var h=0,i; s=String(s); for(i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;} return h; }
  /* 旧アルゴリズム(見た目/レア度から算出)。実寸データが無い種のフォールバック＋既存記録の移行に使う */
  function legacySizeRange(sp){
    var b = BASE_SIZE[sp.renderer] || [12,45];
    var span = b[1]-b[0];
    var lo = b[0] + span*0.15*((hash(sp.id)%100)/100);
    var hi = lo + span*0.8;
    var bump = 1 + tierOf(sp)*0.05;
    return [Math.round(lo), Math.round(hi*bump)];
  }
  /* 実寸 sizeMm:[min,max] があればそれを使う。無ければ旧アルゴリズム */
  function sizeRange(sp){
    if(sp && sp.sizeMm && sp.sizeMm.length===2 && sp.sizeMm[1]>sp.sizeMm[0]) return [sp.sizeMm[0], sp.sizeMm[1]];
    return legacySizeRange(sp);
  }
  var _byId=null;
  function spById(id){ if(!_byId){ _byId={}; for(var i=0;i<BUGS.length;i++)_byId[BUGS[i].id]=BUGS[i]; } return _byId[id]; }
  /* 既存catch記録の max/min を 旧レンジ→新(実寸)レンジへ比例移行。1回だけ(coll._sizeMig=2でガード) */
  function migrateSizes(coll){
    if(!coll || !coll.catches || coll._sizeMig===2) return false;
    var changed=false;
    for(var id in coll.catches){ if(!Object.prototype.hasOwnProperty.call(coll.catches,id))continue;
      var e=coll.catches[id]; if(!e)continue;
      var sp=spById(id); if(!sp||!sp.sizeMm)continue;
      var oldR=legacySizeRange(sp), newR=[sp.sizeMm[0],sp.sizeMm[1]];
      var oldSpan=Math.max(1,oldR[1]-oldR[0]), newSpan=newR[1]-newR[0];
      function remap(v){ var pct=(v-oldR[0])/oldSpan; if(pct<0)pct=0; if(pct>1)pct=1; return Math.round((newR[0]+pct*newSpan)*10)/10; }
      if(e.max!=null)e.max=remap(e.max);
      e.min=(e.min!=null)?remap(e.min):e.max;
      changed=true;
    }
    coll._sizeMig=2;
    return changed;
  }
  function rollSize(sp){
    var r = sizeRange(sp), v = r[0] + (r[1]-r[0])*Math.pow(Math.random(), 1.7);
    return Math.round(v*10)/10;
  }

  /* ---- catch roll ---- */
  var NEED_DEFAULT = 8;            // correct answers per gauge fill
  var SHINY_CHANCE = 0.03;
  var TIER_WEIGHT = [72, 23, 5, 0.8, 0.08]; // N / R / SR / SSR / SS（高効率な復習周回でのレア量産を抑えるため SR/SSR/SS を薄く）
  var REVIEW_BOOST = 2;  // 復習チャレンジ時の「珍しい虫が出やすい」係数（復習のレア量産を抑えるため 3→2）
  var HATTEN_BOOST = 1.5;  // 発展（難問）の「すこしレアが出やすい」係数。通常1と復習2の中間
  /* boost>1(復習) で SR/SSR(tier 2,3)を倍化。SS(tier4=でんせつ)は逆に抑制する。
     復習は高頻度に周回できるため、据え置きだと量でSSが溜まりやすい。SSは通常プレイ/
     テスト合格など achievement で出すものとし、復習では出にくくする。 */
  var SS_REVIEW_MUL = 0.3;
  function weightsWith(boost){
    if(!boost || boost<=1) return TIER_WEIGHT;
    return TIER_WEIGHT.map(function(w,t){ return (t>=2 && t<=3) ? w*boost : (t===4 ? w*SS_REVIEW_MUL : w); });
  }
  /* caught: 既捕獲の {id:..} マップ。渡すと抽選ティア内で「未捕獲」を優先するが、
     捕獲済みも再出現を許容する（サイズ差・✨色違いのバリエーションがあるため、
     同じ種を採り直す意味がある）。未捕獲バイアスでコンプ到達も現実的に保つ。
     boost: レアブースト係数（省略時1=通常）。 */
  function rollFromPool(p, caught, boost){
    if(!p || !p.length) return null;
    var TW = weightsWith(boost);
    var byTier = [0,1,2,3,4].map(function(t){ return p.filter(function(s){ return tierOf(s)===t; }); });
    var w = byTier.map(function(a,t){ return a.length ? TW[t] : 0; });
    var tot = w.reduce(function(a,b){return a+b;},0);
    if(tot<=0) return null;
    var r = Math.random()*tot, tier = 0, i;
    for(i=0;i<5;i++){ if(w[i] && r < w[i]){ tier=i; break; } r -= w[i]; }
    var cand = byTier[tier];
    if(caught){ var fresh = cand.filter(function(s){ return !caught[s.id]; }); if(fresh.length) cand = fresh; }
    /* 昼夜の重み付き抽選（setNight が呼ばれたゲームのみ有効。未使用ゲームは一様のまま） */
    if(_nightActive && cand.length>1){
      var nw = cand.map(function(s){ return nightFactor(nightOf(s)); });
      var ntot = nw.reduce(function(a,b){return a+b;},0);
      if(ntot>0){ var rr = Math.random()*ntot; for(var k=0;k<cand.length;k++){ if(rr<nw[k]) return cand[k]; rr-=nw[k]; } }
    }
    return cand[Math.floor(Math.random()*cand.length)];
  }
  /* ---- 昼夜（夜は夜行性の虫が出やすい）。eitango の nightFor と同方針 ---- */
  var _isNight=false, _nightActive=false;
  function setNight(b){ _isNight=!!b; _nightActive=true; }
  function isNightNow(){ var h=new Date().getHours(); return h>=18 || h<5; }
  function nightOf(sp){
    var tags=sp.tags||[];
    if(tags.indexOf('firefly')>=0) return 1;
    if(sp.id==='suzumushi'||sp.id==='enma_koorogi'||sp.id==='higurashi') return 1;
    if((sp.note||'').indexOf('夜')>=0) return 1;
    if(sp.groupJa==='蛾'||tags.indexOf('moth')>=0) return 1;   /* ガは多くが夜行性 */
    return 2; /* 既定: 昼夜どちらでも */
  }
  function nightFactor(n){
    if(!_nightActive || n===2) return 1;
    return _isNight ? (n===1 ? 2.5 : 0.45) : (n===1 ? 0.45 : 1);
  }
  /* ---- マスター虫(全習得限定): ゲージ/琥珀では出ず、習得達成でのみ授与 ---- */
  function masterBugsFor(game){ return BUGS.filter(function(sp){ return sp.masterOnly && sp.master && sp.master.game===game; }); }
  function masterObtained(coll, id){ return !!(coll && coll.catches && coll.catches[id]); }
  function awardMaster(coll, sp){
    if(!coll.catches) coll.catches={};
    if(coll.catches[sp.id]) return null;          // 既に授与済み（一回限り）
    var sz = sizeRange(sp)[1];                     // マスターは最大サイズで記録
    coll.catches[sp.id] = { n:1, max:sz, min:sz, shiny:0, normal:1, master:1 };
    coll.total = (coll.total||0) + 1;
    return { sp:sp, size:sz, isNew:true, master:true };
  }
  function record(coll, sp){
    var prev = coll.catches[sp.id];
    var size = rollSize(sp);
    var shiny = Math.random() < SHINY_CHANCE;
    var isNew = !prev;
    var isRecord = !isNew && size > prev.max;
    /* min/normal を追加: サイズ範囲(min〜max)の表示と、色違い/通常の両方所持の判定に使う。
       既存データは min 欠落→max で代用、normal 欠落→1(通常も捕獲済みと見なす。色違いは3%と稀なため安全) */
    var prevMin = prev ? (prev.min!=null ? prev.min : prev.max) : size;
    var prevNormal = prev ? (prev.normal!=null ? prev.normal : 1) : 0;
    coll.catches[sp.id] = {
      n: (prev?prev.n:0) + 1,
      max: Math.max(size, prev?prev.max:0),
      min: Math.min(size, prevMin),
      shiny: ((prev && prev.shiny) || shiny) ? 1 : 0,
      normal: (prevNormal || (shiny?0:1)) ? 1 : 0
    };
    coll.total = (coll.total||0) + 1;
    return { sp:sp, size:size, shiny:shiny, isNew:isNew, isRecord:isRecord, tier:tierOf(sp) };
  }

  /* 🍯 こはく(amber): a soft currency earned per correct answer, spendable on
     an extra catch. Gives "save up & spend" agency + a collection pity path.
     共有ウォレット: setAmberStore({get,add,spend}) を差すと、全ゲームで1つの財布を
     共有する（未設定なら従来どおり coll.amber を使う＝後方互換）。 */
  var AMBER_PER_CORRECT = 1;
  var AMBER_CATCH_COST = 30;
  var amberStore = null;  // {get:()->n, add:(n)->n, spend:(n)->bool}
  function setAmberStore(s){ amberStore = s; }
  function earnAmber(coll, n){ if(amberStore) amberStore.add(n); else coll.amber = (coll.amber||0) + n; }
  function amberOf(coll){ return amberStore ? amberStore.get() : ((coll && coll.amber) || 0); }
  function spendForCatch(coll, game){
    if(!coll.catches) coll.catches = {};
    if(amberStore){ if(!amberStore.spend(AMBER_CATCH_COST)) return null; }
    else { if((coll.amber||0) < AMBER_CATCH_COST) return null; coll.amber -= AMBER_CATCH_COST; }
    var sp = rollFromPool(pool(game), coll.catches);
    return sp ? record(coll, sp) : null;
  }

  /* 新しさ係数: 直近で同じ問題(itemId)を繰り返すほどゲージの進みを軽減する。
     2回目0.5→3回目0.25→…最低0.2は残す(ゼロにはしない)。違う問題は満額1。
     直近 RECENT_MAX 問の窓で判定するので、時間が経てば自然に回復する。
     → 難しくはせず「同じ問題の連打farming」の旨味だけ穏やかに下げる。 */
  var RECENT_MAX = 12;
  function freshnessOf(coll, itemId){
    if(itemId == null) return 1;            // itemId未指定のゲームは従来どおり満額
    if(!coll.recent) coll.recent = [];
    var reps = 0, i;
    for(i=0;i<coll.recent.length;i++){ if(coll.recent[i] === itemId) reps++; }
    coll.recent.push(itemId);
    if(coll.recent.length > RECENT_MAX) coll.recent = coll.recent.slice(-RECENT_MAX);
    return reps === 0 ? 1 : Math.max(0.2, Math.pow(0.5, reps));
  }
  /* called on each correct answer. returns a catch result, or null if the
     gauge is not full yet. `need` lets a game tune the cadence. itemId(任意)で
     同一問題の連打を検知してゲージの進みを逓減する。 */
  /* value(任意,0〜1): その問題の「学習価値」。習得済み内容の周回は低い値を渡すと
     ゲージの伸びが鈍る → 既マスター/薄いフィールドの farming で図鑑が安く埋まるのを防ぐ。
     🍯こはくは満額のまま(救済通路は維持)。 */
  function onCorrect(coll, game, need, boost, itemId, value){
    if(!coll.catches) coll.catches = {};
    earnAmber(coll, AMBER_PER_CORRECT);   // 🍯救済通路は満額のまま温存（共有ウォレット対応）
    var v = (value==null) ? 1 : Math.max(0, Math.min(1, value));
    coll.acc = (coll.acc||0) + freshnessOf(coll, itemId) * v;
    if(coll.acc >= 1){ coll.gauge = (coll.gauge||0) + 1; coll.acc -= 1; }  // ゲージは整数を維持
    var threshold = need || NEED_DEFAULT;
    if((coll.gauge||0) < threshold) return null;
    coll.gauge -= threshold;
    var sp = rollFromPool(pool(game), coll.catches, boost);
    if(!sp) return null;
    return record(coll, sp);
  }

  /* guaranteed single catch (for set-completion / bonus gacha, no gauge). boost optional.
     minTier を渡すと「tier>=minTier に限定した重み付き抽選」（一様ではない＝SSは希少のまま）。
     テスト合格ボーナス等で『レア確定だがSSはちゃんと稀』を実現する。 */
  function award(coll, game, boost, minTier){
    if(!coll.catches) coll.catches = {};
    var p = pool(game), sp = null;
    if(minTier){
      var TW = weightsWith(boost);
      var byTier = [0,1,2,3,4].map(function(t){ return (t>=minTier) ? p.filter(function(s){ return tierOf(s)===t; }) : []; });
      var w = byTier.map(function(a,t){ return a.length ? TW[t] : 0; });
      var tot = w.reduce(function(a,b){ return a+b; }, 0);
      if(tot>0){ var r=Math.random()*tot, tier=0, i; for(i=0;i<5;i++){ if(w[i] && r<w[i]){ tier=i; break; } r-=w[i]; } var cand=byTier[tier]; sp=cand[Math.floor(Math.random()*cand.length)]; }
    }
    if(!sp) sp = rollFromPool(p, coll.catches, boost);
    return sp ? record(coll, sp) : null;
  }

  /* ---- collection stats / rank ---- */
  function collectedCount(coll){ return coll && coll.catches ? Object.keys(coll.catches).length : 0; }
  var RANKS = [[0,"かけだし虫とり"],[20,"みならい虫とり"],[60,"いちにんまえの虫とり"],
    [140,"ベテラン虫とり"],[300,"虫とりのたつじん"],[600,"でんせつの虫はかせ"]];
  function rank(total){ var r=RANKS[0][1]; for(var i=0;i<RANKS.length;i++){ if((total||0)>=RANKS[i][0]) r=RANKS[i][1]; } return r; }
  /* 全ゲーム合計の捕獲数で決まる「総合称号」（しきい値を合計向けにスケール）。ポータル用。 */
  var RANKS_G = [[0,"かけだし虫とり"],[50,"みならい虫とり"],[150,"いちにんまえの虫とり"],
    [400,"ベテラン虫とり"],[900,"虫とりのたつじん"],[2000,"でんせつの虫はかせ"]];
  function rankGlobal(total){ var r=RANKS_G[0][1]; for(var i=0;i<RANKS_G.length;i++){ if((total||0)>=RANKS_G[i][0]) r=RANKS_G[i][1]; } return r; }
  function rankGlobalNext(total){ for(var i=0;i<RANKS_G.length;i++){ if((total||0)<RANKS_G[i][0]) return {name:RANKS_G[i][1], need:RANKS_G[i][0]-(total||0)}; } return null; }
  /* 称号一覧: 獲得済み(過去＋現在)を表示。未来の名前は伏せ、つぎまでの匹数だけ示す。 */
  function rankListHTML(total){
    total = total||0;
    var cur=0, i;
    for(i=0;i<RANKS.length;i++){ if(total>=RANKS[i][0]) cur=i; }
    var rows='';
    for(i=0;i<=cur;i++){
      var on=(i===cur);
      rows+='<div style="display:flex;align-items:center;gap:8px;padding:4px 2px;'+(on?'font-weight:800;color:#2C5F2D':'color:#6B7A5E')+'">'
        +'<span>'+(on?'🏅':'✓')+'</span><span>'+RANKS[i][1]+'</span>'+(on?'<span style="margin-left:auto;font-size:12px;color:#CF7F14">いま ここ</span>':'')+'</div>';
    }
    if(cur+1<RANKS.length){ rows+='<div style="display:flex;align-items:center;gap:8px;padding:4px 2px;color:#B9C4A8"><span>🔒</span><span>？？？</span><span style="margin-left:auto;font-size:12px">あと '+(RANKS[cur+1][0]-total)+' 匹</span></div>'; }
    return rows;
  }

  /* 🥅 「なにか いる！→ あみを ふる」ワンクッション演出（全ゲーム共通・自己完結）。
     onSwing: あみを振った後に呼ばれる（各ゲームが自分の捕獲表示を出す）。 */
  function netSwing(onSwing){
    var doc = global.document;
    if(!doc || !doc.body){ if(onSwing)onSwing(); return; }
    if(!doc.getElementById('q4b-net-css')){
      var st=doc.createElement('style'); st.id='q4b-net-css';
      st.textContent='@keyframes q4bwob{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}#q4b-net-ov .q4bnetbtn:active{transform:translateY(3px)}';
      (doc.head||doc.body).appendChild(st);
    }
    var ov=doc.createElement('div');
    ov.id='q4b-net-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(20,32,20,.55);padding:16px';
    ov.innerHTML='<div style="background:#FFFDF4;border-radius:20px;padding:26px 22px;text-align:center;max-width:330px;width:88%;box-shadow:0 12px 34px rgba(0,0,0,.32)">'
      +'<div style="font-weight:800;font-size:20px;margin-bottom:4px;color:#2A3D2C">🍃 なにか いるぞ…!</div>'
      +'<div style="font-size:58px;margin:8px 0;display:inline-block;animation:q4bwob 1s ease-in-out infinite">🌿</div>'
      +'<button class="q4bnetbtn" style="display:block;width:100%;border:none;border-radius:16px;padding:15px;font-size:19px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 4px 0 #CF7F14;cursor:pointer">あみを ふる! 🥅</button>'
      +'</div>';
    doc.body.appendChild(ov);
    var done=false;
    ov.querySelector('.q4bnetbtn').onclick=function(){ if(done)return; done=true; ov.remove(); if(onSwing)onSwing(); };
  }

  /* ---- rendering helper (uses shared/render.js if present) ---- */
  function svg(sp, shiny){ return (global.Q4BRender ? global.Q4BRender.species(sp, shiny) : ""); }

  /* 全ゲーム共通のステータスバー（図鑑数・こはく・連続日数・称号）。
     各ゲームが自分のデータから値を渡す: {caught, pool, amber, streak, total} */
  function statusHTML(v){
    v = v || {};
    function chip(t){ return '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,255,255,.9);border:1.5px solid #CFDDB2;border-radius:999px;padding:2px 9px;font-size:13px;font-weight:800;color:#2A3D2C;white-space:nowrap">'+t+'</span>'; }
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 10px">'
      + chip('🧺 '+(v.caught||0)+'/'+(v.pool||0))
      + chip('🍯 '+(v.amber||0))
      + chip('🔥 '+(v.streak||0)+'日')
      + chip('🏅 '+rank(v.total||0))
      + '</div>';
  }

  global.Q4BReward = {
    bugs: BUGS,
    gameFor: gameFor,
    pool: pool,
    poolCount: poolCount,
    tierOf: tierOf,
    TIERNAME: TIERNAME,
    sizeRange: sizeRange,
    migrateSizes: migrateSizes,
    masterBugsFor: masterBugsFor,
    masterObtained: masterObtained,
    awardMaster: awardMaster,
    setNight: setNight,
    isNightNow: isNightNow,
    onCorrect: onCorrect,
    award: award,
    spendForCatch: spendForCatch,
    setAmberStore: setAmberStore,
    amberOf: amberOf,
    AMBER_CATCH_COST: AMBER_CATCH_COST,
    REVIEW_BOOST: REVIEW_BOOST,
    HATTEN_BOOST: HATTEN_BOOST,
    record: record,
    collectedCount: collectedCount,
    rank: rank,
    rankListHTML: rankListHTML,
    rankGlobal: rankGlobal,
    rankGlobalNext: rankGlobalNext,
    svg: svg,
    netSwing: netSwing,
    statusHTML: statusHTML,
    NEED_DEFAULT: NEED_DEFAULT
  };
})(window);
