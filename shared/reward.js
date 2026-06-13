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

  /* ---- rarity (5 levels) -> reward tier (4) ---- */
  var TIER = { N:0, R:1, SR:2, SSR:2, SS:3 };
  var TIERNAME = ["ノーマル", "レア", "スーパーレア", "でんせつ"];
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
  var TIER_WEIGHT = [70, 24, 6.5, 1.4]; // normal / rare / super / legend
  function rollFromPool(p){
    if(!p || !p.length) return null;
    var byTier = [0,1,2,3].map(function(t){ return p.filter(function(s){ return tierOf(s)===t; }); });
    var w = byTier.map(function(a,t){ return a.length ? TIER_WEIGHT[t] : 0; });
    var tot = w.reduce(function(a,b){return a+b;},0);
    if(tot<=0) return null;
    var r = Math.random()*tot, tier = 0, i;
    for(i=0;i<4;i++){ if(w[i] && r < w[i]){ tier=i; break; } r -= w[i]; }
    var cand = byTier[tier];
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

  /* called on each correct answer. returns a catch result, or null if the
     gauge is not full yet. `need` lets a game tune the cadence. */
  function onCorrect(coll, game, need){
    if(!coll.catches) coll.catches = {};
    coll.gauge = (coll.gauge||0) + 1;
    var threshold = need || NEED_DEFAULT;
    if(coll.gauge < threshold) return null;
    coll.gauge -= threshold;
    var sp = rollFromPool(pool(game));
    if(!sp) return null;
    return record(coll, sp);
  }

  /* ---- collection stats / rank ---- */
  function collectedCount(coll){ return coll && coll.catches ? Object.keys(coll.catches).length : 0; }
  var RANKS = [[0,"かけだし虫とり"],[20,"みならい虫とり"],[60,"いちにんまえの虫とり"],
    [140,"ベテラン虫とり"],[300,"虫とりのたつじん"],[600,"でんせつの虫はかせ"]];
  function rank(total){ var r=RANKS[0][1]; for(var i=0;i<RANKS.length;i++){ if((total||0)>=RANKS[i][0]) r=RANKS[i][1]; } return r; }

  /* ---- rendering helper (uses shared/render.js if present) ---- */
  function svg(sp){ return (global.Q4BRender ? global.Q4BRender.species(sp) : ""); }

  global.Q4BReward = {
    bugs: BUGS,
    gameFor: gameFor,
    pool: pool,
    poolCount: poolCount,
    tierOf: tierOf,
    TIERNAME: TIERNAME,
    sizeRange: sizeRange,
    onCorrect: onCorrect,
    record: record,
    collectedCount: collectedCount,
    rank: rank,
    svg: svg,
    NEED_DEFAULT: NEED_DEFAULT
  };
})(window);
