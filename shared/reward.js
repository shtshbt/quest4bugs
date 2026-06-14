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
  BUGS.forEach(function(sp){ (POOLS[gameFor(sp)] || POOLS.eitango).push(sp); });
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
  function sizeRange(sp){
    var b = BASE_SIZE[sp.renderer] || [12,45];
    var span = b[1]-b[0];
    var lo = b[0] + span*0.15*((hash(sp.id)%100)/100); // small deterministic shift per species
    var hi = lo + span*0.8;
    // rarer species skew a touch larger
    var bump = 1 + tierOf(sp)*0.05;
    return [Math.round(lo), Math.round(hi*bump)];
  }
  function rollSize(sp){
    var r = sizeRange(sp), v = r[0] + (r[1]-r[0])*Math.pow(Math.random(), 1.7);
    return Math.round(v*10)/10;
  }

  /* ---- catch roll ---- */
  var NEED_DEFAULT = 8;            // correct answers per gauge fill
  var SHINY_CHANCE = 0.03;
  var TIER_WEIGHT = [70, 22, 6, 1.6, 0.4]; // N / R / SR / SSR / SS
  var REVIEW_BOOST = 3;  // 復習チャレンジ時の「珍しい虫が出やすい」係数
  /* boost>1 で SR以上(tier>=2)のティア重みを倍化（復習チャレンジ用のレアブースト） */
  function weightsWith(boost){
    if(!boost || boost<=1) return TIER_WEIGHT;
    return TIER_WEIGHT.map(function(w,t){ return t>=2 ? w*boost : w; });
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
    return cand[Math.floor(Math.random()*cand.length)];
  }
  function record(coll, sp){
    var prev = coll.catches[sp.id];
    var size = rollSize(sp);
    var shiny = Math.random() < SHINY_CHANCE;
    var isNew = !prev;
    var isRecord = !isNew && size > prev.max;
    coll.catches[sp.id] = {
      n: (prev?prev.n:0) + 1,
      max: Math.max(size, prev?prev.max:0),
      shiny: (prev && prev.shiny) || shiny ? 1 : 0
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
  function onCorrect(coll, game, need, boost, itemId){
    if(!coll.catches) coll.catches = {};
    earnAmber(coll, AMBER_PER_CORRECT);   // 🍯救済通路は満額のまま温存（共有ウォレット対応）
    coll.acc = (coll.acc||0) + freshnessOf(coll, itemId);
    if(coll.acc >= 1){ coll.gauge = (coll.gauge||0) + 1; coll.acc -= 1; }  // ゲージは整数を維持
    var threshold = need || NEED_DEFAULT;
    if((coll.gauge||0) < threshold) return null;
    coll.gauge -= threshold;
    var sp = rollFromPool(pool(game), coll.catches, boost);
    if(!sp) return null;
    return record(coll, sp);
  }

  /* guaranteed single catch (for set-completion / bonus gacha, no gauge). boost optional. */
  function award(coll, game, boost){
    if(!coll.catches) coll.catches = {};
    var sp = rollFromPool(pool(game), coll.catches, boost);
    return sp ? record(coll, sp) : null;
  }

  /* ---- collection stats / rank ---- */
  function collectedCount(coll){ return coll && coll.catches ? Object.keys(coll.catches).length : 0; }
  var RANKS = [[0,"かけだし虫とり"],[20,"みならい虫とり"],[60,"いちにんまえの虫とり"],
    [140,"ベテラン虫とり"],[300,"虫とりのたつじん"],[600,"でんせつの虫はかせ"]];
  function rank(total){ var r=RANKS[0][1]; for(var i=0;i<RANKS.length;i++){ if((total||0)>=RANKS[i][0]) r=RANKS[i][1]; } return r; }
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

  /* ---- rendering helper (uses shared/render.js if present) ---- */
  function svg(sp){ return (global.Q4BRender ? global.Q4BRender.species(sp) : ""); }

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
    onCorrect: onCorrect,
    award: award,
    spendForCatch: spendForCatch,
    setAmberStore: setAmberStore,
    amberOf: amberOf,
    AMBER_CATCH_COST: AMBER_CATCH_COST,
    REVIEW_BOOST: REVIEW_BOOST,
    record: record,
    collectedCount: collectedCount,
    rank: rank,
    rankListHTML: rankListHTML,
    svg: svg,
    statusHTML: statusHTML,
    NEED_DEFAULT: NEED_DEFAULT
  };
})(window);
