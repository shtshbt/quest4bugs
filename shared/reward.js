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
  function rollSize(sp, sex){
    /* sex (m/f) と sizeBySexMm が両方ある種は性別別のレンジを使う。
       それ以外は共通 sizeRange を使う。 */
    var r;
    if(sex && sp && sp.sizeBySexMm && sp.sizeBySexMm[sex]) r = sp.sizeBySexMm[sex];
    else r = sizeRange(sp);
    /* docs/zukan_enhancement_plan.md の推奨分布: 88%は中央寄り、12%は大型寄り */
    var x, ru = Math.random();
    if(ru < 0.88){
      /* 3つの一様乱数の平均で中央山を作る */
      x = (Math.random() + Math.random() + Math.random()) / 3;
    } else if(ru < 0.985){
      x = 0.55 + Math.random() * 0.35;
    } else {
      x = 0.88 + Math.random() * 0.12;
    }
    var v = r[0] + (r[1]-r[0]) * x;
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
  /* 3 段階 boost 制:
     - boost > 1 (復習・発展): SR/SSR を boost 倍に増やし、SS は SS_REVIEW_MUL=0.3 で抑制
     - boost == 1 (適正・上位): TIER_WEIGHT そのまま (デフォルト)
     - boost < 1 (既習): SR/SSR/SS を全部 boost 倍に減らす → 自然に N/R が相対的に優勢
     既習範囲を周回しても レアな虫が出にくく、こはくだけ稼げる構造を実現する。 */
  var BOOST_LOW = 0.4;     /* 既習範囲 (mastered) */
  var BOOST_NORMAL = 1.0;  /* 適正レベル / 新規上位 */
  var BOOST_HIGH = REVIEW_BOOST;  /* 復習 = 2.0 (既存維持) */
  function weightsWith(boost){
    if(!boost || boost === 1) return TIER_WEIGHT;
    if(boost > 1){
      return TIER_WEIGHT.map(function(w,t){ return (t>=2 && t<=3) ? w*boost : (t===4 ? w*SS_REVIEW_MUL : w); });
    }
    /* boost < 1: SR/SSR/SS を boost 倍で抑制 */
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
  /* 個体ごとの捕獲履歴(docs/zukan_enhancement_plan.md):
       records=[{d:"YYYY-MM-DD", s:size, sex:"m"|"f"|"u", shiny:bool}, ...]
     後方互換: records が欠落していても従来通り動作する。 */
  function todayStr(){
    var d=new Date(), y=d.getFullYear(), m=d.getMonth()+1, day=d.getDate();
    return y+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day;
  }
  function rollSex(sp){
    /* sexRatio が定義されていれば従う。未定義なら 50:50。 */
    var r = (sp && sp.sexRatio) ? sp.sexRatio : null;
    if(r && (r.m+r.f)>0) return Math.random() < r.m/(r.m+r.f) ? "m" : "f";
    return Math.random() < 0.5 ? "m" : "f";
  }
  function pushRecord(entry, size, sex, shiny){
    if(!entry.records) entry.records=[];
    entry.records.push({d:todayStr(), s:size, sex:sex, shiny:!!shiny});
  }
  /* レガシー catches (records 無し・n>=1) から仮想の個体履歴を再構成する。
     方針(docs/zukan_enhancement_plan.md 79-83 参照):
       - 最大個体は entry.max を使う (1個体)
       - 最小個体は entry.min を使う (1個体、min!=max のとき)
       - 残り (n-2 個体) は rollSize(sp, sex) で分布を再現
       - 各個体に sexRatio から性別を抽選 → 性別別レンジがあれば sizeBySexMm に合わせる
       - 日付は "" (空 = 不明) + legacy:true マーク
       - 色違いは entry.shiny フラグから 1個体だけ shiny=true、残りは false
     後方互換: 同一 entry を上書き保存。次回以降は通常の record() で追加される。 */
  function backfillRecords(coll, sp){
    if(!coll || !coll.catches || !sp) return null;
    var entry = coll.catches[sp.id];
    if(!entry) return null;
    if(entry.records && entry.records.length>0) return entry;   /* 既に records あり */
    var n = entry.n || 0;
    if(n<=0) return entry;
    var maxSize = entry.max!=null ? entry.max : null;
    var minSize = entry.min!=null ? entry.min : maxSize;
    /* サイズから性別を逆推定: sizeBySexMm がある種では、size が オス/メスのレンジに
       どちら入るかで sex を決める。両方該当 or 該当なしなら rollSex に委ねる。 */
    function inferSex(size){
      if(size==null || !sp.sizeBySexMm) return rollSex(sp);
      var m = sp.sizeBySexMm.m, f = sp.sizeBySexMm.f;
      var inM = size>=m[0]-0.5 && size<=m[1]+0.5;
      var inF = size>=f[0]-0.5 && size<=f[1]+0.5;
      if(inM && !inF) return 'm';
      if(inF && !inM) return 'f';
      return rollSex(sp);
    }
    var records = [];
    var shinyLeft = entry.shiny ? 1 : 0;
    /* 最大個体を必ず追加: sex はサイズから逆推定 */
    if(maxSize!=null){
      records.push({d:"", s:maxSize, sex:inferSex(maxSize), shiny:shinyLeft>0, legacy:true});
      if(shinyLeft>0) shinyLeft--;
    }
    /* 最小個体 (max と違うときだけ) */
    if(minSize!=null && minSize!==maxSize && records.length<n){
      records.push({d:"", s:minSize, sex:inferSex(minSize), shiny:shinyLeft>0, legacy:true});
      if(shinyLeft>0) shinyLeft--;
    }
    /* 残りを分布で生成 */
    while(records.length<n){
      var sx3 = rollSex(sp);
      var sz = rollSize(sp, sx3);
      /* 既に最大/最小として登録済みのサイズと完全一致は避ける(分散性のため、若干ジッタ) */
      records.push({d:"", s:sz, sex:sx3, shiny:shinyLeft>0, legacy:true});
      if(shinyLeft>0) shinyLeft--;
    }
    entry.records = records;
    return entry;
  }
  function rollShiny(){ return Math.random() < SHINY_CHANCE; }
  /* awardMaster(coll, sp, chosen?):
       chosen = 'm' | 'f' | 'u' (省略時 'u' で従来挙動: 性別不明 + 最大サイズ)
       chosen が 'm'/'f' の場合は rollSize(sp, chosen) で抽選し、size を変動させる。 */
  function awardMaster(coll, sp, chosen){
    if(!coll.catches) coll.catches={};
    if(coll.catches[sp.id]) return null;          // 既に授与済み（一回限り）
    var sex = chosen || "u";
    var sz = (sex==="u") ? sizeRange(sp)[1] : rollSize(sp, sex);
    coll.catches[sp.id] = { n:1, max:sz, min:sz, shiny:0, normal:1, master:1, records:[] };
    /* マスター個体: chosen 指定なら ♂/♀、未指定なら 'u' (性別不明)。学習達成の象徴的1個体 (reared:false)。 */
    pushRecord(coll.catches[sp.id], sz, sex, false);
    coll.total = (coll.total||0) + 1;
    return { sp:sp, size:sz, sex:sex, isNew:true, master:true };
  }
  /* record(coll, sp, opts?):
       opts.reared:bool         - 自家育成個体なら true (孵化フロー E 経由のみ)。既定 false。
       opts.bornAt:string       - 卵生成日 (reared:true 個体のみ意味あり)。
       opts.sex:string          - 'm'/'f'/'u' 指定 (孵化時は egg.sex を渡す)。未指定なら rollSex。
       opts.size:number         - サイズ指定 (孵化時は rollSize 結果を渡す)。未指定なら rollSize。
       opts.shiny:bool          - shiny 指定 (孵化時は egg.shiny を渡す)。未指定なら rollShiny。
     後方互換: opts 省略時は従来通りの挙動 (採集ロール) */
  function record(coll, sp, opts){
    opts = opts || {};
    var prev = coll.catches[sp.id];
    var sex = opts.sex || rollSex(sp);
    var size = (opts.size!=null) ? opts.size : rollSize(sp, sex);
    var shiny = (opts.shiny!=null) ? !!opts.shiny : rollShiny();
    var reared = !!opts.reared;
    var bornAt = opts.bornAt || null;
    var isNew = !prev;
    var isRecord = !isNew && size > prev.max;
    var prevMin = prev ? (prev.min!=null ? prev.min : prev.max) : size;
    var prevNormal = prev ? (prev.normal!=null ? prev.normal : 1) : 0;
    var prevRecords = prev ? (prev.records || []) : [];
    coll.catches[sp.id] = {
      n: (prev?prev.n:0) + 1,
      max: Math.max(size, prev?prev.max:0),
      min: Math.min(size, prevMin),
      shiny: ((prev && prev.shiny) || shiny) ? 1 : 0,
      normal: (prevNormal || (shiny?0:1)) ? 1 : 0,
      records: prevRecords
    };
    /* records[i] に reared/bornAt を含めて push。reared:false の record には field を追加しない (LWW 安全)。 */
    var rec = {d:todayStr(), s:size, sex:sex, shiny:!!shiny};
    if(reared){ rec.reared=true; if(bornAt) rec.bornAt=bornAt; }
    if(!coll.catches[sp.id].records) coll.catches[sp.id].records=[];
    coll.catches[sp.id].records.push(rec);
    coll.total = (coll.total||0) + 1;
    return { sp:sp, size:size, shiny:shiny, sex:sex, reared:reared, isNew:isNew, isRecord:isRecord, tier:tierOf(sp) };
  }

  /* 🔶 こはく(amber): a soft currency earned per correct answer, spendable on
     an extra catch. Gives "save up & spend" agency + a collection pity path.
     共有ウォレット: setAmberStore({get,add,spend}) を差すと、全ゲームで1つの財布を
     共有する（未設定なら従来どおり coll.amber を使う＝後方互換）。 */
  var AMBER_PER_CORRECT = 1;
  var AMBER_CATCH_COST = 30;
  var amberStore = null;  // {get:()->n, add:(n)->n, spend:(n)->bool}
  function setAmberStore(s){ amberStore = s; }
  function earnAmber(coll, n){ if(amberStore) amberStore.add(n); else coll.amber = (coll.amber||0) + n; }
  function amberOf(coll){ return amberStore ? amberStore.get() : ((coll && coll.amber) || 0); }
  function spendForCatch(coll, game, boost){
    if(!coll.catches) coll.catches = {};
    if(amberStore){ if(!amberStore.spend(AMBER_CATCH_COST)) return null; }
    else { if((coll.amber||0) < AMBER_CATCH_COST) return null; coll.amber -= AMBER_CATCH_COST; }
    var sp = rollFromPool(pool(game), coll.catches, boost);
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
     🔶こはくは満額のまま(救済通路は維持)。 */
  function onCorrect(coll, game, need, boost, itemId, value){
    if(!coll.catches) coll.catches = {};
    earnAmber(coll, AMBER_PER_CORRECT);   // 🔶救済通路は満額のまま温存（共有ウォレット対応）
    /* 卵育成: feedEgg は各教科の「正解判定箇所」(QuestSave.recordCorrect の隣) で
       直接呼ぶ設計に変更 (旧: onCorrect から自動呼出。kanji test/eitango 通常モード
       など onCorrect 非経由のパスで卵が進まない不具合があった)。 */
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
  /* 称号は10段階に小刻み化（旧6段だとベテランまでが厳しすぎた）。
     しきい値は近距離を細かく・遠距離を緩やかに伸ばす（毎段で達成感が出る） */
  var RANKS = [
    [  0,"かけだし虫とり"],
    [ 10,"みならい虫とり"],
    [ 25,"せんぱい虫とり"],
    [ 50,"いちにんまえの虫とり"],
    [ 90,"ベテラン虫とり"],
    [140,"じょうきゅう虫とり"],
    [200,"虫とりのたつじん"],
    [300,"虫とりマスター"],
    [450,"グランドマスター"],
    [650,"でんせつの虫はかせ"]
  ];
  function rank(total){ var r=RANKS[0][1]; for(var i=0;i<RANKS.length;i++){ if((total||0)>=RANKS[i][0]) r=RANKS[i][1]; } return r; }
  /* 全ゲーム合計の捕獲数で決まる「総合称号」（ポータル用）。
     収集pool合計≈1119、ボス含む実質max≈1200想定。最高位は1100（フルコンプ近傍）で到達可能に。 */
  var RANKS_G = [
    [   0,"かけだし虫とり"],
    [  25,"みならい虫とり"],
    [  60,"せんぱい虫とり"],
    [ 120,"いちにんまえの虫とり"],
    [ 200,"ベテラン虫とり"],
    [ 320,"じょうきゅう虫とり"],
    [ 480,"虫とりのたつじん"],
    [ 680,"虫とりマスター"],
    [ 880,"グランドマスター"],
    [1100,"でんせつの虫はかせ"]
  ];
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

  /* ---- お気に入り (図鑑詳細のハートマーク) ----
     coll.favorites = {id:true} の lazy-init マップ。未定義セーブとの後方互換のため、
     操作直前に必ず空オブジェクトでフォールバック。解除時は delete してキーを残さない
     (JSON サイズ膨張防止)。同期は per-key LWW で透過対応 (sync_architecture.md)。 */
  function _favMap(coll){
    if(!coll) return null;
    if(!coll.favorites) coll.favorites = {};
    return coll.favorites;
  }
  function isFavorite(coll, id){
    if(!coll || !coll.favorites || !id) return false;
    return !!coll.favorites[id];
  }
  function toggleFavorite(coll, id){
    var fav = _favMap(coll); if(!fav || !id) return false;
    if(fav[id]){ delete fav[id]; return false; }
    fav[id] = true; return true;
  }
  function listFavorites(coll){
    if(!coll || !coll.favorites) return [];
    return Object.keys(coll.favorites).filter(function(k){ return coll.favorites[k]; });
  }
  /* 図鑑詳細モーダル用 ハートトグルボタンの HTML を返す共有ヘルパ。
     使用側: onclick で Q4BReward.toggleFavorite(coll,id) → 保存 → モーダル再描画。 */
  function favoriteButtonHTML(coll, id, onclickStr){
    var on = isFavorite(coll, id);
    return '<button type="button" class="q4b-fav-btn" data-bugid="'+id+'" '
      +(onclickStr?'onclick="'+onclickStr+'" ':'')
      +'aria-pressed="'+(on?'true':'false')+'" '
      +'aria-label="'+(on?'お気に入り解除':'お気に入りに追加')+'" '
      +'style="border:none;background:transparent;cursor:pointer;font-size:24px;line-height:1;padding:4px 8px;color:'+(on?'#E84A6B':'#B9C4A8')+';transition:transform .15s">'
      +(on ? '♥' : '♡')
      +'</button>';
  }

  /* ---- rendering helper (uses shared/render.js if present) ---- */
  function svg(sp, shiny){ return (global.Q4BRender ? global.Q4BRender.species(sp, shiny) : ""); }

  /* 全ゲーム共通のステータスバー（図鑑数・こはく・連続日数・称号）。
     各ゲームが自分のデータから値を渡す: {caught, pool, amber, streak, total} */
  function statusHTML(v){
    v = v || {};
    function chip(t){ return '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,255,255,.9);border:1.5px solid #CFDDB2;border-radius:999px;padding:2px 9px;font-size:13px;font-weight:800;color:#2A3D2C;white-space:nowrap">'+t+'</span>'; }
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 10px">'
      + chip('📖 '+(v.caught||0)+'/'+(v.pool||0))
      + chip('🔶 '+(v.amber||0))
      + chip('🔥 '+(v.streak||0)+'日')
      + chip('🏅 '+rank(v.total||0))
      + '</div>';
  }

  /* =========================================================================
     卵育成 (breeding) API
     -------------------------------------------------------------------------
     詳細: docs/breeding_eggs_plan.md
     - eggs / pendingEggs / stats は breeding namespace の shared kv に置く (per-game coll から外す)
     - eggStore: {get:()->{eggs,pendingEggs,stats}, save:(state)->bool}
     - fossilStore: {get:()->n, spend:(n)->bool}  (egg コスト消費)
     ========================================================================= */
  var EGG_COST   = [3, 6, 9, 12, 15];          // N / R / SR / SSR / SS (低コスト・育成重視)
  var EGG_TARGET = [100, 250, 500, 750, 1000];
  var EGG_SLOT_MAX = 3;
  function eggCost(sp){ return EGG_COST[tierOf(sp)]; }
  function eggTarget(sp){ return EGG_TARGET[tierOf(sp)]; }
  /* 教科決定: masterOnly は sp.master.game を優先 (grand は kanji 既定)、通常虫は gameFor(sp) */
  function eggGameFor(sp){
    if(sp && sp.masterOnly && sp.master && sp.master.game){
      if(sp.master.game === "grand") return "kanji";
      return sp.master.game;
    }
    return gameFor(sp);
  }
  /* in-memory fallback (eggStore 未設定でも crash しないため) */
  var _memBreed = {eggs:[], pendingEggs:[], stats:{totalAbandoned:0}};
  var eggStore = {
    get: function(){ return _memBreed; },
    save: function(s){ _memBreed = s; return true; }
  };
  function setEggStore(s){
    eggStore = s || eggStore;
    if(_dbg()) console.log("[setEggStore] wired", typeof s, s && (typeof s.get === "function" ? "get✓" : "get✗"), s && (typeof s.save === "function" ? "save✓" : "save✗"));
  }
  function _bs(){ return eggStore.get() || {eggs:[],pendingEggs:[],stats:{totalAbandoned:0}}; }
  function _saveBs(s){ return eggStore.save(s); }

  /* fossilFragments を消費する store (egg コスト消費用)。
     setFossilStore({get:()->n, spend:(n)->bool}) で wire-up。 */
  var fossilStore = null;
  function setFossilStore(s){ fossilStore = s; }
  function fossilOf(){ return fossilStore ? fossilStore.get() : 0; }
  function spendForEgg(sp){
    if(!fossilStore) return false;
    return fossilStore.spend(eggCost(sp));
  }

  /* 産卵可能判定: ♂♀ あり + かけら充足 + 上限到達でない + 同種育成中/保留中でない + 卵対象 order */
  function canLayEgg(coll, sp){
    if(!sp || !sp.metamorphosis) return false;      // 卵対象外 order
    var e = coll && coll.catches ? coll.catches[sp.id] : null;
    if(!e || !e.records) return false;
    var hasM = false, hasF = false, i;
    for(i=0;i<e.records.length;i++){ if(e.records[i].sex==="m") hasM=true; else if(e.records[i].sex==="f") hasF=true; }
    if(!(hasM && hasF)) return false;
    var bs = _bs();
    if(bs.eggs.length >= EGG_SLOT_MAX) return false;
    for(i=0;i<bs.eggs.length;i++){ if(bs.eggs[i].id === sp.id) return false; }
    for(i=0;i<bs.pendingEggs.length;i++){ if(bs.pendingEggs[i].id === sp.id) return false; }
    if(fossilOf() < eggCost(sp)) return false;
    return true;
  }
  function layableSpecies(coll){
    return BUGS.filter(function(sp){ return canLayEgg(coll, sp); });
  }

  /* 卵生成 (フロー A)。前提チェック + かけら消費 + sex/shiny 抽選 + eggs に追加。
     返り値: 生成した egg または null。 */
  function layEgg(coll, sp){
    if(!canLayEgg(coll, sp)) return null;
    if(!spendForEgg(sp)) return null;
    var egg = {
      id: sp.id,
      sex: rollSex(sp),
      progress: 0,
      target: eggTarget(sp),
      game: eggGameFor(sp),
      origin: "lay",
      bornAt: todayStr(),
      shiny: rollShiny()
    };
    var bs = _bs();
    bs.eggs.push(egg);
    _saveBs(bs);
    return egg;
  }

  /* マスター卵 / ボス卵を授与。空きあり→eggs、満杯/同種育成中→pendingEggs。
     冪等ガード: 同 id + 同 origin の卵が eggs/pendingEggs に既存ならスキップ。
     かけら消費なし (達成自体が対価)。 */
  function awardEgg(sp, sex, origin){
    if(!sp || !sp.metamorphosis) return null;        // 卵対象外 order
    var bs = _bs();
    var i;
    for(i=0;i<bs.eggs.length;i++){
      if(bs.eggs[i].id===sp.id && bs.eggs[i].origin===origin) return null; // 既存
    }
    for(i=0;i<bs.pendingEggs.length;i++){
      if(bs.pendingEggs[i].id===sp.id && bs.pendingEggs[i].origin===origin) return null;
    }
    var egg = {
      id: sp.id,
      sex: sex,
      progress: 0,
      target: eggTarget(sp),
      game: eggGameFor(sp),
      origin: origin,
      bornAt: todayStr(),
      shiny: rollShiny()
    };
    /* 空きあり (かつ同種育成中でない) → eggs に直接追加、それ以外は pendingEggs に保留 */
    var sameIdInEggs = false;
    for(i=0;i<bs.eggs.length;i++){ if(bs.eggs[i].id===sp.id){ sameIdInEggs=true; break; } }
    if(bs.eggs.length < EGG_SLOT_MAX && !sameIdInEggs){
      bs.eggs.push(egg);
    } else {
      egg.queuedAt = todayStr();
      bs.pendingEggs.push(egg);
    }
    _saveBs(bs);
    return egg;
  }
  function awardMasterEgg(coll, sp, sex){ return awardEgg(sp, sex, "master_pair"); }
  function awardBossEgg(coll, sp, sex){ return awardEgg(sp, sex, "boss_pair"); }

  /* feedEgg 後の UI フック (breeding.js が toast 表示用に登録する) */
  var _feedHook = null;
  function setFeedHook(fn){ _feedHook = fn; }
  /* ?debug=1 ログ用 */
  function _dbg(){
    try{
      return typeof window !== "undefined" && window.location
        && /[?&]debug=1\b/.test(window.location.search||"");
    }catch(_){ return false; }
  }
  /* 学習問題正解で該当教科の卵 +1 (全卵対象、3倍効率は許容)。
     onCorrect から自動呼出されるため、各ゲームが追加で呼ぶ必要なし。
     ステージ遷移時に egg.stageHistory[] に日付を記録する (UI で「いつ幼虫になったか」を表示)。
     返り値: progress が +1 された卵の配列 (UI が表示する) */
  /* feedEgg(game, value, opts):
       value (0..1): その問題の「学習価値」。既習語の周回は 0.3 程度を渡して、
                     卵 progress に蓄積される速度を抑える。default 1 (満額)。
       opts.itemId: 連続正解抑制 (freshness) を効かせる場合に渡す。
     value < 0.25 のとき skip (= grinding 防止)。
     0.25-1 のとき egg.progressAcc に加算し、>= 1 で progress += 1。 */
  /* 0.05 未満は skip (freshness で激減した spam を排除)。0.05〜1.0 は acc に蓄積され
     >= 1 で progress += 1。既習語 value=0.2 なら 5 回正解で 1 進む = 5倍ペナルティ。 */
  var FEED_MIN_VALUE = 0.05;
  function feedEgg(game, value, opts){
    var bs = _bs();
    var v = (value == null) ? 1 : Math.max(0, Math.min(1, value));
    /* itemId が渡されれば freshness で更にダンプ */
    if(opts && opts.itemId && opts.coll){
      v = v * freshnessOf(opts.coll, opts.itemId);
    }
    var fed = [];
    var skipReason = "";
    for(var i=0;i<bs.eggs.length;i++){
      var egg = bs.eggs[i];
      if(egg.game !== game){ skipReason = "game mismatch ("+egg.game+" vs "+game+")"; continue; }
      if((egg.progress||0) >= egg.target){ skipReason = "already at target"; continue; }
      if(v < FEED_MIN_VALUE){ skipReason = "value too low ("+v.toFixed(2)+", < "+FEED_MIN_VALUE+")"; continue; }
      egg.progressAcc = (egg.progressAcc||0) + v;
      var inc = Math.floor(egg.progressAcc);
      if(inc < 1) continue;   // 蓄積中だが整数まで届かず
      egg.progressAcc -= inc;
      var sp = spById(egg.id);
      var prevStage = sp ? currentStage(egg, sp) : null;
      egg.progress = Math.min((egg.progress||0) + inc, egg.target);
      var newStage = sp ? currentStage(egg, sp) : null;
      if(prevStage !== newStage && newStage){
        egg.stageHistory = egg.stageHistory || [];
        if(newStage !== "egg"){
          egg.stageHistory.push({stage:newStage, d:todayStr()});
        }
      }
      fed.push(egg);
    }
    /* progressAcc を更新したケースも save する必要あり (整数進行に達してなくても) */
    _saveBs(bs);
    if(_dbg()){
      var snapshot = bs.eggs.map(function(e){return e.id+"("+e.game+"):"+e.progress+"/"+e.target+(e.progressAcc?" +"+e.progressAcc.toFixed(2):"");}).join(", ");
      console.log("[feedEgg]", game, "value:", v.toFixed(2), "→ fed:", fed.length, "/", bs.eggs.length, "eggs |", snapshot || "(no eggs)", fed.length===0 && bs.eggs.length>0 ? " ← skip: "+skipReason : "");
    }
    if(fed.length && _feedHook){ try{ _feedHook(game, fed); }catch(_){} }
    return fed.length > 0;
  }

  /* 卵を孵化 (フロー E)。progress >= target でない場合は null。
     id ベース (同期不一致で別の卵を孵化させないため)。
     呼び出し側責任: hatchEgg 後に save() を同期実行してから孵化アニメを再生 (commit 順序)。 */
  function hatchEgg(coll, id){
    var bs = _bs();
    var idx = -1, i;
    for(i=0;i<bs.eggs.length;i++){ if(bs.eggs[i].id===id){ idx=i; break; } }
    if(idx < 0) return null;
    var egg = bs.eggs[idx];
    if(egg.progress < egg.target) return null;
    var sp = spById(id);
    if(!sp) return null;
    /* records に reared:true で追加。rollSize/rollShiny の代わりに egg.sex/egg.shiny を渡す。 */
    var size = rollSize(sp, egg.sex);
    record(coll, sp, {sex: egg.sex, size: size, shiny: egg.shiny, reared: true, bornAt: egg.bornAt});
    bs.eggs.splice(idx, 1);
    /* 称号: totalReared 累積カウンタ。階級アップは prev/now の tier 差を呼び出し側で見て toast。 */
    if(!bs.stats) bs.stats = {totalAbandoned:0};
    var prevReared = bs.stats.totalReared || 0;
    bs.stats.totalReared = prevReared + 1;
    var prevTier = breederRank(prevReared);
    var newTier = breederRank(bs.stats.totalReared);
    var leveledUp = (newTier.tier.threshold > prevTier.tier.threshold);
    /* 保留卵があれば空き枠の通知バナーは index.html 側で出す (ここでは自動転送しない) */
    _saveBs(bs);
    return {egg: egg, sp: sp, size: size, totalReared: bs.stats.totalReared, prevTier: prevTier.tier, newTier: newTier.tier, leveledUp: leveledUp};
  }

  /* ブリーダー称号: 累積 reared 数 → tier
     30/100/300/1000 をしきい値とし、1 匹目で「かけだしブリーダー」昇格。 */
  var BREEDER_TIERS = [
    {threshold: 0,    label: '',                short: '',         emoji: ''},
    {threshold: 1,    label: 'かけだしブリーダー', short: 'かけだし',  emoji: '🐣'},
    {threshold: 30,   label: 'みならいブリーダー', short: 'みならい',  emoji: '🥚'},
    {threshold: 100,  label: 'せんぱいブリーダー', short: 'せんぱい',  emoji: '🦋'},
    {threshold: 300,  label: 'ベテランブリーダー', short: 'ベテラン',  emoji: '🏅'},
    {threshold: 1000, label: 'マスターブリーダー', short: 'マスター',  emoji: '👑'}
  ];
  function breederRank(total){
    total = total || 0;
    var i, cur = BREEDER_TIERS[0], next = null;
    for(i=0;i<BREEDER_TIERS.length;i++){
      if(total >= BREEDER_TIERS[i].threshold) cur = BREEDER_TIERS[i];
    }
    for(i=0;i<BREEDER_TIERS.length;i++){
      if(BREEDER_TIERS[i].threshold > total){ next = BREEDER_TIERS[i]; break; }
    }
    return {tier: cur, next: next, total: total};
  }
  function totalReared(){
    var bs = _bs();
    return (bs && bs.stats && bs.stats.totalReared) || 0;
  }

  /* 保留卵 (pendingEggs[0]) を eggs の空き枠へ転送。ホームバナー「受けとる」タップ時に呼ぶ。 */
  function acceptPendingEgg(){
    var bs = _bs();
    if(bs.eggs.length >= EGG_SLOT_MAX) return null;
    if(!bs.pendingEggs.length) return null;
    var egg = bs.pendingEggs.shift();
    delete egg.queuedAt;
    bs.eggs.push(egg);
    _saveBs(bs);
    return egg;
  }

  /* 卵を放棄。返金なし。stats.totalAbandoned を +1。 */
  function abandonEgg(id){
    var bs = _bs();
    var idx = -1, i;
    for(i=0;i<bs.eggs.length;i++){ if(bs.eggs[i].id===id){ idx=i; break; } }
    if(idx < 0) return false;
    bs.eggs.splice(idx, 1);
    bs.stats.totalAbandoned = (bs.stats.totalAbandoned||0) + 1;
    _saveBs(bs);
    return true;
  }

  /* マスター虫の性別を確定 (新規達成 + レガシー救済 共用)。
     in-place 更新 (awardMaster は呼ばない、冪等ガード回避)。
     sizeBySexMm が定義された種は size を chosen 性別レンジで再抽選 + max/min を更新。
     反対性別の卵を授与 (空きあり→eggs、満杯→pendingEggs)。 */
  function setMasterSex(coll, sp, chosen){
    if(!coll || !coll.catches) return false;
    var e = coll.catches[sp.id];
    if(!e || !e.records || !e.records.length) return false;
    if(chosen !== "m" && chosen !== "f") return false;
    e.records[0].sex = chosen;
    /* sizeBySexMm 種は、既存 size が新性別レンジ外なら再抽選。
       範囲内ならユーザの過去記録 (max/min) を保持して書き換えない。 */
    if(sp.sizeBySexMm && sp.sizeBySexMm[chosen]){
      var r = sp.sizeBySexMm[chosen];
      var cur = e.records[0].s;
      var inRange = (typeof cur === "number") && cur >= r[0]-0.5 && cur <= r[1]+0.5;
      if(!inRange){
        e.records[0].s = rollSize(sp, chosen);
        e.max = e.records[0].s;
        e.min = e.records[0].s;
      }
    }
    /* max/min/normal/master/n カウンタは保持 */
    var egg = awardMasterEgg(coll, sp, chosen === "m" ? "f" : "m");
    return egg || true;  /* 戻り値: 卵オブジェクト (新規授与時) or true (冪等スキップ時) */
  }

  /* ボス撃破時の報酬計算 (案D 段階的アンロック)。
     1回撃破 → {kind:'specimen', sex:rolled} (bossesMap[id].firstSex に保存)
     10回撃破 → {kind:'egg', sex:opposite(firstSex)}
     11回目以降 → null (生涯1卵)
     天敵 (sp.boss.predator) は null を返す (defence-in-depth)。
     coll を渡せば legacy backfill: breeding 実装前の撃破回数 (coll.catches[id].n) を
     bossesMap.n に取り込み、過去 10 回以上の legacy boss にも卵を 1 度だけ授与する。 */
  function bossKillReward(spId, bossesMap, coll){
    var sp = spById(spId);
    if(!sp) return null;
    if(sp.boss && sp.boss.predator) return null;
    var entry = bossesMap[spId] = bossesMap[spId] || {n:0};
    /* eggGranted 後方互換: 既存 n>=10 はすでに卵授与済みと推定 (誤グラント防止) */
    if(entry.eggGranted === undefined && entry.n >= 10){
      entry.eggGranted = true;
    }
    /* firstSex 未設定なら coll.catches.records[0].sex を採用 */
    if(!entry.firstSex && coll && coll.catches && coll.catches[spId]){
      var rec0 = coll.catches[spId].records && coll.catches[spId].records[0];
      if(rec0 && (rec0.sex === "m" || rec0.sex === "f")){
        entry.firstSex = rec0.sex;
      }
    }
    /* legacy backfill: coll.catches[spId].n を bossesMap.n に統合 (未追跡分) */
    if(coll && coll.catches && coll.catches[spId] && typeof coll.catches[spId].n === "number"){
      if(coll.catches[spId].n > entry.n){
        entry.n = coll.catches[spId].n;
      }
    }
    var hadSpecimen = !!(coll && coll.catches && coll.catches[spId]);
    entry.n = (entry.n||0) + 1;
    var n = entry.n;
    if(n === 1 && !hadSpecimen){
      var firstSex = rollSex(sp);
      entry.firstSex = firstSex;
      return {kind:"specimen", sex: firstSex};
    }
    if(n >= 10 && !entry.eggGranted){
      entry.eggGranted = true;
      if(!entry.firstSex) entry.firstSex = rollSex(sp);
      var fs = entry.firstSex;
      return {kind:"egg", sex: fs === "m" ? "f" : "m"};
    }
    return null;
  }

  /* 自家育成 (reared:true) 判定ヘルパ */
  function hasReared(coll, id){
    var e = coll && coll.catches ? coll.catches[id] : null;
    return !!(e && e.records && e.records.some(function(r){ return !!r.reared; }));
  }
  function rearedRecords(coll, id){
    var e = coll && coll.catches ? coll.catches[id] : null;
    return e && e.records ? e.records.filter(function(r){ return !!r.reared; }) : [];
  }

  /* 進捗→ステージ変換 (自然な変換 — 進捗率だけで決まる)。完全変態 4 段階 / 不完全変態 3 段階。 */
  function naturalStage(egg, sp){
    var ratio = egg.target>0 ? egg.progress / egg.target : 0;
    if(sp && sp.metamorphosis === "complete"){
      if(ratio < 0.25) return "egg";
      if(ratio < 0.50) return "larva";
      if(ratio < 0.85) return "pupa";
      return "adult";
    } else {
      if(ratio < 0.35) return "egg";
      if(ratio < 0.85) return "nymph";
      return "adult";
    }
  }
  /* 後方互換 alias: 既存呼出元のため currentStage = naturalStage */
  function currentStage(egg, sp){ return naturalStage(egg, sp); }

  function stageOrderFor(sp){
    return (sp && sp.metamorphosis === "complete")
      ? ["egg","larva","pupa","adult"]
      : ["egg","nymph","adult"];
  }
  /* 表示中のステージ。一段階ずつユーザーがタップで進める設計のため、
     egg.shownStage を尊重 (なければ自然ステージ)。
     ただし shownStage が natural より進んでいる事はあり得ない (cap)。 */
  function displayStage(egg, sp){
    var nat = naturalStage(egg, sp);
    if(!egg.shownStage) return nat;       // 旧データ互換: 自然進行
    var order = stageOrderFor(sp);
    var iNat = order.indexOf(nat);
    var iShown = order.indexOf(egg.shownStage);
    if(iShown < 0) return nat;
    return iShown <= iNat ? egg.shownStage : nat;
  }
  /* 次に進める stage がある? (natural が shown より先) */
  function canAdvanceStage(egg, sp){
    var order = stageOrderFor(sp);
    var iNat = order.indexOf(naturalStage(egg, sp));
    var iShown = order.indexOf(displayStage(egg, sp));
    return iNat > iShown;
  }
  function nextStageFor(egg, sp){
    var order = stageOrderFor(sp);
    var iShown = order.indexOf(displayStage(egg, sp));
    if(iShown < 0 || iShown >= order.length-1) return null;
    return order[iShown+1];
  }
  /* shownStage を 1 段階進める (adult への advance は呼び出し側が hatchEgg を使う)。
     成功時 stageHistory に新ステージの遷移日を追記。 */
  function advanceStage(coll, id){
    var bs = _bs();
    var egg = bs.eggs.find(function(e){return e.id===id;});
    if(!egg) return null;
    var sp = spById(id); if(!sp) return null;
    if(!canAdvanceStage(egg, sp)) return null;
    var next = nextStageFor(egg, sp);
    if(!next) return null;
    egg.shownStage = next;
    egg.stageHistory = egg.stageHistory || [];
    /* 同 stage が既に履歴にあれば追加しない (idempotent) */
    var already = egg.stageHistory.some(function(h){ return h.stage === next; });
    if(!already) egg.stageHistory.push({stage:next, d:todayStr()});
    _saveBs(bs);
    return {egg: egg, next: next, isAdult: next === "adult"};
  }
  function isHatchReady(egg){ return egg && egg.progress >= egg.target; }
  /* UI が「タップで かえす」を出すべきか: 自然 stage が adult かつ shown も adult 手前 */
  function canHatchNow(egg, sp){
    if(!egg) return false;
    if(!isHatchReady(egg)) return false;
    var shown = displayStage(egg, sp);
    return shown !== "adult";    // shown が既に adult なら hatchEgg 実行で消える
  }

  /* レガシー sex='u' マスター虫の検出 (C フローのトリガー判定) */
  function isLegacyMasterUnknownSex(entry, sp){
    if(!sp || !sp.masterOnly) return false;
    if(!entry || !entry.records || !entry.records.length) return false;
    return entry.records.every(function(r){ return r.sex === "u"; });
  }
  /* legacy master 自動確定: sex='u' のマスター虫すべてを rollSex で確定 + 相方卵授与。
     load 時に呼ぶ用。授与した卵オブジェクトの配列を返す ([{sp, egg, queued}, ...])。 */
  function autoFinalizeLegacyMasterAll(coll){
    if(!coll || !coll.catches) return [];
    var ids = listLegacyMasterPending(coll);
    if(!ids.length) return [];
    var out = [];
    ids.forEach(function(id){
      var sp = spById(id); if(!sp) return;
      var sex = rollSex(sp);
      var ret = setMasterSex(coll, sp, sex);
      if(ret){
        var egg = (ret !== true) ? ret : null;
        out.push({sp: sp, sex: sex, egg: egg, queued: !!(egg && egg.queuedAt)});
      }
    });
    return out;
  }
  function listLegacyMasterPending(coll){
    if(!coll || !coll.catches) return [];
    var out = [], id, sp;
    for(id in coll.catches){
      if(!Object.prototype.hasOwnProperty.call(coll.catches,id)) continue;
      sp = spById(id);
      if(isLegacyMasterUnknownSex(coll.catches[id], sp)) out.push(id);
    }
    return out;
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
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    listFavorites: listFavorites,
    favoriteButtonHTML: favoriteButtonHTML,
    backfillRecords: backfillRecords,
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
    BOOST_LOW: BOOST_LOW,
    BOOST_NORMAL: BOOST_NORMAL,
    BOOST_HIGH: BOOST_HIGH,
    record: record,
    collectedCount: collectedCount,
    rank: rank,
    rankListHTML: rankListHTML,
    rankGlobal: rankGlobal,
    rankGlobalNext: rankGlobalNext,
    svg: svg,
    netSwing: netSwing,
    statusHTML: statusHTML,
    NEED_DEFAULT: NEED_DEFAULT,
    /* ---- 卵育成 (breeding) API ---- */
    eggCost: eggCost,
    eggTarget: eggTarget,
    eggGameFor: eggGameFor,
    EGG_SLOT_MAX: EGG_SLOT_MAX,
    setEggStore: setEggStore,
    getBreedingState: function(){ return _bs(); },
    setFossilStore: setFossilStore,
    setFeedHook: setFeedHook,
    fossilOf: fossilOf,
    spendForEgg: spendForEgg,
    canLayEgg: canLayEgg,
    layableSpecies: layableSpecies,
    layEgg: layEgg,
    awardMasterEgg: awardMasterEgg,
    awardBossEgg: awardBossEgg,
    feedEgg: feedEgg,
    hatchEgg: hatchEgg,
    acceptPendingEgg: acceptPendingEgg,
    abandonEgg: abandonEgg,
    breederRank: breederRank,
    totalReared: totalReared,
    BREEDER_TIERS: BREEDER_TIERS,
    setMasterSex: setMasterSex,
    bossKillReward: bossKillReward,
    hasReared: hasReared,
    rearedRecords: rearedRecords,
    currentStage: currentStage,
    naturalStage: naturalStage,
    displayStage: displayStage,
    canAdvanceStage: canAdvanceStage,
    nextStageFor: nextStageFor,
    advanceStage: advanceStage,
    isHatchReady: isHatchReady,
    canHatchNow: canHatchNow,
    isLegacyMasterUnknownSex: isLegacyMasterUnknownSex,
    listLegacyMasterPending: listLegacyMasterPending,
    autoFinalizeLegacyMasterAll: autoFinalizeLegacyMasterAll,
    rollSex: rollSex,
    rollSize: rollSize,
    rollShiny: rollShiny,
    spById: spById
  };
})(window);

