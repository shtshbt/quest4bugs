/* 卵育成: UI 共通ヘルパ (ホーム/教科画面で共有)
   詳細: docs/breeding_eggs_plan.md §UI 設計 / Phase 2
   - 卵カード HTML ヘルパ (育成中/空きスロット/孵化準備済)
   - 卵選択モーダル (ホーム「+」から)
   - 孵化アニメーション
   - 保留卵バナー / レガシー sex='u' バナー */
(function(global){
  "use strict";

  var R = function(){ return global.Q4BReward; };
  var A = function(){ return global.Q4BArchetypes; };
  var FURI = function(){ return global.Furi; };

  /* --- ユーティリティ --- */
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function pct(n,d){ if(!d) return 0; return Math.max(0,Math.min(100,Math.round((n/d)*100))); }
  function todayStr(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function pad2(n){ return (n<10?"0":"")+n; }
  function daysBetween(a,b){
    if(!a||!b) return 0;
    var d1=new Date(a), d2=new Date(b);
    return Math.max(0, Math.round((d2-d1)/86400000));
  }

  /* タイプ→色/絵文字 */
  var GAME_COLOR = {kanji:"#A06BD8", keisan:"#5B8DE0", eitango:"#3FA86B"};
  var GAME_EMOJI = {kanji:"🟣", keisan:"🔵", eitango:"🟢"};
  var GAME_LABEL = {kanji:"かんじ", keisan:"けいさん", eitango:"えいご"};

  /* ステージ → 表示用。archetype SVG があれば img、無ければ絵文字。
     basePath はホーム/各教科ページ用に異なる (window 設定で上書き可能)。 */
  function _svgBasePath(){
    /* 呼び出し元の document.baseURI から推定。各教科は ../assets/larva_svg/、ホームは ./assets/larva_svg/。
       簡易判定: location.pathname に /kanji/ 等が含まれるか。 */
    var p = (global.location && global.location.pathname) || "";
    if(/\/(kanji|keisan|eitango)\//.test(p)) return "../assets/larva_svg/";
    return "./assets/larva_svg/";
  }
  function stageVisual(stage, sp){
    var a = A();
    if(!a) return {emoji:"🥚", svgUrl:null, archetype:null};
    if(a.stageVisualFor){
      var v = a.stageVisualFor(stage, sp, _svgBasePath());
      return {emoji: v.emoji || a.stageEmoji(stage), svgUrl: v.svgUrl, archetype: v.archetype};
    }
    return {emoji: a.stageEmoji(stage), svgUrl:null, archetype:null};
  }
  function stageVisualHTML(visual, sizePx){
    sizePx = sizePx || 36;
    if(visual.svgUrl){
      return '<img src="'+visual.svgUrl+'" alt="" style="width:'+sizePx+'px;height:'+sizePx+'px;display:inline-block;vertical-align:middle" onerror="this.style.display=\'none\';this.parentNode.innerHTML+=\''+visual.emoji+'\'">';
    }
    return '<span style="font-size:'+Math.round(sizePx*0.9)+'px;line-height:1">'+visual.emoji+'</span>';
  }

  /* metamorphosis ラベル */
  function metaLabel(sp){
    if(!sp || !sp.metamorphosis) return "";
    return sp.metamorphosis === "complete" ? "完全変態" : "不完全変態";
  }

  /* ステージ → 次ステージ移行時の子供向け CTA 文言 */
  var NEXT_STAGE_LABEL = {
    larva:  "ようちゅうに タップ",
    pupa:   "さなぎに タップ",
    nymph:  "わかむしに タップ",
    adult:  "タップでかえす"
  };

  /* --- 卵カード HTML (1枚分) ---
     opts: {onTap, onHatch, onAdvance} */
  function eggCardHTML(egg, opts){
    opts = opts || {};
    var r = R(); if(!r) return "";
    var sp = r.spById(egg.id);
    if(!sp) return emptySlotHTML(opts);
    var dispStage = r.displayStage ? r.displayStage(egg, sp) : r.currentStage(egg, sp);
    var v = stageVisual(dispStage, sp);
    var canAdv = r.canAdvanceStage ? r.canAdvanceStage(egg, sp) : false;
    var nextStage = r.nextStageFor ? r.nextStageFor(egg, sp) : null;
    var nextIsAdult = nextStage === "adult";
    var ready = r.isHatchReady(egg);
    /* CTA: 次が adult なら hatch、それ以外は advance */
    var showCta = canAdv && (nextIsAdult ? ready : true);
    var p = pct(egg.progress, egg.target);
    var color = GAME_COLOR[egg.game] || "#888";
    var sexMark = egg.sex === "m" ? "♂" : egg.sex === "f" ? "♀" : "";
    var shinyMark = egg.shiny ? '<span class="q4b-egg-shiny" style="color:#f5b800;font-weight:700">✨</span>' : '';
    var onTapAttr = opts.onTap ? ' onclick="'+opts.onTap+'(\''+egg.id+'\')"' : '';
    var idAttr = ' data-eggid="'+esc(egg.id)+'"';
    var name = sp.jaName || egg.id;
    var ctaLabel = NEXT_STAGE_LABEL[nextStage||""] || "つぎへ";
    var ctaBtn = "";
    if(showCta){
      var ctaFn = nextIsAdult ? opts.onHatch : opts.onAdvance;
      if(ctaFn){
        ctaBtn = '<button class="q4b-egg-cta" onclick="event.stopPropagation();'+ctaFn+'(\''+egg.id+'\')" style="display:block;width:100%;border:none;border-radius:8px;padding:8px 6px;margin-top:6px;font-size:13px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 3px 0 #CF7F14;cursor:pointer">✨ '+ctaLabel+'</button>';
      }
    }
    var visualHTML = v.svgUrl
      ? '<img src="'+v.svgUrl+'" alt="" style="width:42px;height:42px;display:block;margin:0 auto" onerror="this.style.display=\'none\'">'
      : '<div style="font-size:36px;line-height:1.1">'+v.emoji+'</div>';
    var glow = showCta;
    var readyLine = canAdv
      ? '<div style="font-size:10px;color:#F2A33C;text-align:center;font-weight:800;margin-top:3px">✨ つぎに すすめるよ!</div>'
      : '';
    return ''
      + '<div class="q4b-egg-card'+(glow?' q4b-egg-ready':'')+'"'+idAttr+onTapAttr
      +   ' style="background:#FFFDF4;border:2.5px solid '+(glow?'#F2A33C':'#CFDDB2')+';border-radius:14px;padding:8px 6px;cursor:pointer;'
      +   (glow?'box-shadow:0 0 0 3px rgba(242,163,60,.25),0 2px 6px rgba(0,0,0,.08);animation:q4bEggGlow 1.6s ease-in-out infinite;':'')
      +   '">'
      +   '<div style="text-align:center;margin-bottom:2px;min-height:44px;display:flex;align-items:center;justify-content:center">'+visualHTML+'</div>'
      +   '<div style="font-size:12px;font-weight:800;color:#2A3D2C;text-align:center;line-height:1.2;min-height:28px;display:flex;align-items:center;justify-content:center">'+esc(name)+shinyMark+'</div>'
      +   '<div style="font-size:11px;color:#6B7A5E;text-align:center;margin-top:1px">'+sexMark+'</div>'
      +   '<div style="background:#EAEFE0;border-radius:99px;height:6px;margin:5px 0 3px;overflow:hidden"><div style="width:'+p+'%;height:100%;background:'+color+';transition:width .3s"></div></div>'
      +   '<div style="font-size:10px;color:#6B7A5E;text-align:center">'+egg.progress+'/'+egg.target+'</div>'
      +   '<div style="font-size:10px;text-align:center;margin-top:1px">'+(GAME_EMOJI[egg.game]||"")+'<span style="color:'+color+';font-weight:700">'+(GAME_LABEL[egg.game]||egg.game)+'</span></div>'
      +   (sp.metamorphosis ? '<div style="font-size:9px;color:#9CA88A;text-align:center;margin-top:1px">'+metaLabel(sp)+'</div>' : '')
      +   readyLine
      +   ctaBtn
      + '</div>';
  }

  function emptySlotHTML(opts){
    opts = opts || {};
    var onTapAttr = opts.onAdd ? ' onclick="'+opts.onAdd+'()"' : '';
    /* 保留卵 N 個ある時は + ボタンにバッジを重ねる (📬N) */
    var pendBadge = (opts.pendingCount > 0)
      ? '<span style="position:absolute;top:-4px;right:-4px;background:#F2A33C;color:#fff;border:2px solid #FFFDF4;border-radius:99px;font-size:10px;font-weight:900;padding:1px 5px;min-width:18px;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.25);z-index:2">📬'+opts.pendingCount+'</span>'
      : '';
    var label = (opts.pendingCount > 0) ? 'たまごリスト<br>を ひらく' : 'あたらしい<br>たまご';
    return ''
      + '<div class="q4b-egg-empty"'+onTapAttr
      +   ' style="position:relative;background:rgba(207,221,178,.25);border:2.5px dashed #CFDDB2;border-radius:14px;padding:8px 6px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:130px">'
      +   pendBadge
      +   '<div style="font-size:32px;color:#9CA88A;line-height:1">＋</div>'
      +   '<div style="font-size:11px;color:#6B7A5E;font-weight:700;margin-top:3px">'+label+'</div>'
      + '</div>';
  }

  /* --- ホーム卵パネル (上限3) ---
     opts: {onTap, onAdd, onHatch, eggs: [...], pendingCount: N} */
  function homeBreedingPanelHTML(opts){
    opts = opts || {};
    var eggs = opts.eggs || [];
    var r = R();
    var max = (r && r.EGG_SLOT_MAX) || 3;
    var cards = [];
    var i;
    for(i=0;i<max;i++){
      if(i < eggs.length){
        cards.push(eggCardHTML(eggs[i], {onTap: opts.onTap, onHatch: opts.onHatch, onAdvance: opts.onAdvance}));
      } else if(eggs.length < max){
        /* 最初の空きスロットだけバッジを表示 (2 つ並ぶと冗長) */
        var firstEmpty = (i === eggs.length);
        cards.push(emptySlotHTML({onAdd: opts.onAdd, pendingCount: firstEmpty ? (opts.pendingCount||0) : 0}));
      }
    }
    var pendBanner = opts.pendingCount > 0
      ? '<div class="q4b-egg-pending-banner" style="background:#FFF6E0;border:1.5px solid #F2A33C;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:13px;font-weight:700;color:#8A5C2C;cursor:pointer"'
        + (opts.onAcceptPending ? ' onclick="'+opts.onAcceptPending+'()"' : '')
        + '>📬 たまごリストに '+opts.pendingCount+'こ まっているよ <span style="float:right">▶</span></div>'
      : '';
    /* 教科別内訳: opts.legacyByGame = {kanji:N, keisan:N, eitango:N} 形式 */
    var legacyByGame = opts.legacyByGame || {};
    var legacyBreakdown = '';
    var gameLabels = {kanji:'漢字', keisan:'計算', eitango:'英語'};
    var gks = Object.keys(legacyByGame).filter(function(g){return legacyByGame[g]>0;});
    if(gks.length){
      legacyBreakdown = '<div style="font-size:11px;font-weight:600;color:#6B4A99;margin-top:4px">内訳: '
        + gks.map(function(g){return (gameLabels[g]||g)+' '+legacyByGame[g]+'匹';}).join(' / ')
        + '</div>';
    }
    var legacyBanner = opts.legacyMasterCount > 0
      ? '<div class="q4b-egg-legacy-banner"'
        + (opts.onReviewLegacy ? ' onclick="'+opts.onReviewLegacy+'()"' : '')
        + ' style="background:#F5E8FF;border:1.5px solid #A06BD8;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:13px;font-weight:700;color:#6B4A99'
        + (opts.onReviewLegacy ? ';cursor:pointer' : '')
        + '">🎓 まだ ♂♀ をきめてない とくべつな虫が '+opts.legacyMasterCount+'匹 いるよ'
        + (opts.onReviewLegacy ? '<span style="float:right">▶</span>' : '')
        + legacyBreakdown
        + '</div>'
      : '';
    /* ブリーダー称号: opts.totalReared から段階を計算してヘッダーに表示 */
    var rwd = R();
    var br = (rwd && rwd.breederRank) ? rwd.breederRank(opts.totalReared||0) : null;
    var brBadge = '';
    if(br && br.tier && br.tier.threshold > 0){
      brBadge = '<span style="display:inline-flex;align-items:center;gap:3px;background:#FFF6E0;border:1.5px solid #E0A32E;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:800;color:#8A5C2C;margin-left:auto" title="そだてた虫 '+(opts.totalReared||0)+'匹">'
        + br.tier.emoji + ' ' + esc(br.tier.short) + '</span>';
    }
    var rearedCounter = '<span style="font-size:12px;color:#6B7A5E;margin-left:2px">🐣そだてた ×'+(opts.totalReared||0)+'</span>';
    return ''
      + '<style>@keyframes q4bEggGlow{0%,100%{box-shadow:0 0 0 3px rgba(242,163,60,.25),0 2px 6px rgba(0,0,0,.08)}50%{box-shadow:0 0 0 6px rgba(242,163,60,.4),0 4px 10px rgba(0,0,0,.12)}}</style>'
      + '<div class="card" style="background:linear-gradient(180deg,#FFFDF4 0%,#F8F4E4 100%);border:2px solid #CFDDB2;border-radius:18px;padding:14px 12px;margin-bottom:12px">'
      +   '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
      +     '<span style="font-size:22px">🥚</span>'
      +     '<span style="font-size:16px;font-weight:800;color:#2A3D2C">そだてている むし</span>'
      +     '<span style="font-size:13px;color:#6B7A5E;margin-left:4px">('+eggs.length+'/'+max+')</span>'
      +     brBadge
      +   '</div>'
      +   '<div style="margin:-2px 0 8px">'+rearedCounter
      +     (br && br.next ? '<span style="font-size:11px;color:#A89876;margin-left:8px">つぎ '+esc(br.next.label)+' まで '+(br.next.threshold-(opts.totalReared||0))+'</span>' : '')
      +   '</div>'
      +   pendBanner
      +   legacyBanner
      +   '<div style="display:grid;grid-template-columns:repeat('+max+',1fr);gap:8px">'
      +     cards.join('')
      +   '</div>'
      +   '<div style="font-size:12px;color:#6B7A5E;text-align:center;margin-top:8px">もんだいに せいかいすると、それぞれの 教科で そだつよ</div>'
      + '</div>';
  }

  /* --- 卵選択モーダル ---
     opts: {coll, onPick: 関数名, onClose: 関数名} */
  function openEggPickerModal(opts){
    opts = opts || {};
    var r = R(); if(!r) return;
    var coll = opts.coll || {};
    var layable = r.layableSpecies(coll);
    var fossilNow = r.fossilOf();
    var doc = global.document;
    if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bEggPickerOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.55);display:flex;align-items:center;justify-content:center;z-index:300;padding:14px";
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); if(opts.onClose) global[opts.onClose] && global[opts.onClose](); }
    ov.onclick = function(e){ if(e.target === ov) close(); };

    /* 空状態の判定 */
    var bs = global.QuestSave && global.QuestSave.breedingOf ? global.QuestSave.breedingOf(global.QuestSave.currentProfile()) : {eggs:[],pendingEggs:[]};
    var slotFull = bs.eggs.length >= ((r.EGG_SLOT_MAX)||3);

    /* 産卵可能種が 0 件: 空状態 3 種に分岐 */
    var bodyHTML;
    if(layable.length === 0){
      /* (1) ♂♀ なし → 図鑑へ誘導 (2) かけら不足 (3) 全種育成中 のどれか */
      /* canLayEgg はかけら不足/育成中で false を返すので、もし「♂♀ 揃った種」が存在するなら(2)か(3)、なければ (1) */
      var hasAnyPair = (r.bugs||[]).some(function(sp){
        if(!sp || !sp.metamorphosis) return false;
        var e = coll && coll.catches ? coll.catches[sp.id] : null;
        if(!e || !e.records) return false;
        return e.records.some(function(rc){return rc.sex==="m";}) && e.records.some(function(rc){return rc.sex==="f";});
      });
      var msg;
      if(!hasAnyPair){
        msg = '<div style="font-size:14px;color:#2A3D2C;text-align:center;padding:20px 8px"><div style="font-size:42px;margin-bottom:6px">🐛</div>まだ ♂♀ の そろった むしが いないよ。<br>図鑑で ♂♀ を 両方つかまえると<br>たまごが 産めるよ</div>';
      } else if(slotFull){
        msg = '<div style="font-size:14px;color:#2A3D2C;text-align:center;padding:20px 8px"><div style="font-size:42px;margin-bottom:6px">🥚🥚🥚</div>いま 3つとも たまご そだち中だよ。<br>1ぴき かえすと あたらしい たまごが 産めるよ</div>';
      } else {
        msg = '<div style="font-size:14px;color:#2A3D2C;text-align:center;padding:20px 8px"><div style="font-size:42px;margin-bottom:6px">🪨</div>かけらが たりないよ。<br>学習で 1日 30問 せいかいすると<br>かけらが もらえるよ</div>';
      }
      bodyHTML = msg;
    } else {
      var cards = layable.slice(0,80).map(function(sp){
        var cost = r.eggCost(sp);
        var target = r.eggTarget(sp);
        var canPay = fossilNow >= cost;
        var e = coll.catches[sp.id];
        var nM = (e && e.records ? e.records.filter(function(rc){return rc.sex==="m";}).length : 0);
        var nF = (e && e.records ? e.records.filter(function(rc){return rc.sex==="f";}).length : 0);
        var disabledNote = "";
        if(!canPay) disabledNote = '<div style="font-size:11px;color:#CF7F14;margin-top:2px">※ かけらが '+(cost-fossilNow)+' たりない</div>';
        return ''
          + '<button type="button" class="q4b-egg-pick"'+(canPay?'':' disabled')
          + ' style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:'+(canPay?'#FFFDF4':'#F0EAD8')+';border:1.5px solid #CFDDB2;border-radius:12px;padding:8px 10px;margin-bottom:6px;cursor:'+(canPay?'pointer':'not-allowed')+';opacity:'+(canPay?'1':'.7')+';font-family:inherit"'
          + (canPay && opts.onPick ? ' onclick="'+opts.onPick+'(\''+sp.id+'\')"' : '')
          + '>'
          +   '<div style="font-size:32px;flex:0 0 40px;text-align:center">'+(GAME_EMOJI[r.eggGameFor(sp)]||"🥚")+'</div>'
          +   '<div style="flex:1;min-width:0">'
          +     '<div style="font-weight:800;font-size:14px;color:#2A3D2C">'+esc(sp.jaName||sp.id)+'</div>'
          +     '<div style="font-size:11px;color:#6B7A5E">'+esc(sp.rarity)+' / '+target+'問</div>'
          +     '<div style="font-size:11px;color:#2A3D2C">コスト 🪨 '+cost+' &nbsp; ♂'+nM+' / ♀'+nF+'</div>'
          +     disabledNote
          +   '</div>'
          + '</button>';
      }).join("");
      bodyHTML = '<div style="max-height:60vh;overflow-y:auto;padding:4px 2px">'+cards+'</div>';
    }

    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:18px;max-width:380px;width:96%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.32)">'
      +   '<div style="padding:14px 18px 8px;border-bottom:1px solid #EAEFE0">'
      +     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      +       '<span style="font-size:22px">🥚</span>'
      +       '<span style="font-size:16px;font-weight:800;color:#2A3D2C">どの たまごを 産ませる？</span>'
      +     '</div>'
      +     '<div style="font-size:12px;color:#6B7A5E">持ってる かけら: 🪨 '+fossilNow+'</div>'
      +   '</div>'
      +   '<div style="padding:10px 14px;flex:1;min-height:0">'+bodyHTML+'</div>'
      +   '<div style="padding:10px 18px;border-top:1px solid #EAEFE0;text-align:right">'
      +     '<button type="button" onclick="(function(){var o=document.getElementById(\'q4bEggPickerOv\');if(o)o.remove();})()" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:8px 18px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      + '</div>';
    doc.body.appendChild(ov);
  }

  /* --- コスト確認ダイアログ ---
     onConfirm: function (sp を引数に取る) */
  function openLayConfirm(sp, opts){
    opts = opts || {};
    var r = R(); if(!r) return;
    var cost = r.eggCost(sp);
    var target = r.eggTarget(sp);
    var doc = global.document; if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bLayConfirmOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.55);display:flex;align-items:center;justify-content:center;z-index:310;padding:14px";
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:18px;max-width:320px;width:96%;padding:18px 18px 14px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.32)">'
      +   '<div style="font-size:48px;margin-bottom:4px">🥚</div>'
      +   '<div style="font-size:18px;font-weight:800;color:#2A3D2C;margin-bottom:6px">'+esc(sp.jaName||sp.id)+'の<br>たまごを 産ませる?</div>'
      +   '<div style="font-size:13px;color:#6B7A5E;margin-bottom:14px">'
      +     'コスト: 🪨 '+cost+'<br>'
      +     '必要せいかい数: '+target+'問'
      +   '</div>'
      +   '<button id="q4bLayOk" type="button" style="display:block;width:100%;border:none;border-radius:12px;padding:12px;font-size:16px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 3px 0 #CF7F14;cursor:pointer;margin-bottom:8px">産ませる</button>'
      +   '<button type="button" onclick="(function(){var o=document.getElementById(\'q4bLayConfirmOv\');if(o)o.remove();})()" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:8px 18px;font-weight:700;font-family:inherit;cursor:pointer">キャンセル</button>'
      + '</div>';
    doc.body.appendChild(ov);
    var ok = ov.querySelector("#q4bLayOk");
    var busy = false;
    ok.onclick = function(){
      if(busy) return; busy = true; ok.disabled = true; ok.style.opacity = "0.6";
      var result = opts.onConfirm ? opts.onConfirm(sp) : null;
      close();
      return result;
    };
  }

  /* --- 孵化アニメーション ---
     opts: {egg, sp, size, onClose, onViewZukan} */
  function playHatchAnimation(opts){
    opts = opts || {};
    var sp = opts.sp;
    var egg = opts.egg;
    var size = opts.size;
    if(!sp || !egg) return;
    var a = A();
    var stages = sp.metamorphosis === "complete"
      ? ["egg","larva","pupa","adult"]
      : ["egg","nymph","adult"];
    var doc = global.document; if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bHatchOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.7);display:flex;align-items:center;justify-content:center;z-index:320;padding:14px";
    var sexMark = egg.sex === "m" ? "♂" : egg.sex === "f" ? "♀" : "";
    var bornAt = egg.bornAt || "";
    var days = bornAt ? daysBetween(bornAt, todayStr()) : 0;
    var dayMsg = days > 0 ? '🐣 きみが '+days+'日間 そだてた 特別な子だよ' : '🐣 きみが そだてた 特別な子だよ';

    /* reduced-motion 配慮 */
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 4段階 (or 3段階) を ~0.55s 間隔で見せ、最後に成虫アート。SVG があれば img、なければ emoji */
    var stageVisuals = stages.map(function(s){ return stageVisual(s, sp); });
    function stageHTML(v){
      if(v.svgUrl) return '<img src="'+v.svgUrl+'" alt="" style="width:120px;height:120px;display:block" onerror="this.style.display=\'none\'">';
      return '<div style="font-size:90px">'+(v.emoji||"")+'</div>';
    }
    /* adult stage は SVG (Q4BRender) があれば使う */
    var adultSvg = (global.Q4BRender && global.Q4BRender.species) ? global.Q4BRender.species(sp, egg.shiny) : "";

    /* スタイル (一度だけ注入) — パーティクル / 紙吹雪 / 光輪 */
    if(!doc.getElementById("q4bHatchFxCss")){
      var st = doc.createElement("style"); st.id = "q4bHatchFxCss";
      st.textContent = ''
        + '@keyframes q4bPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}'
        + '@keyframes q4bRing{0%{transform:scale(.2);opacity:.85}100%{transform:scale(2.6);opacity:0}}'
        + '@keyframes q4bFlash{0%{opacity:0}30%{opacity:.55}100%{opacity:0}}'
        + '@keyframes q4bConfetti{0%{transform:translate3d(0,-10vh,0) rotate(0);opacity:1}100%{transform:translate3d(var(--qx,0),110vh,0) rotate(720deg);opacity:0}}'
        + '@keyframes q4bSparkleFloat{0%{transform:translate(0,0) scale(.4);opacity:0}30%{opacity:1}100%{transform:translate(var(--qx,0),var(--qy,-80px)) scale(1.1);opacity:0}}'
        + '.q4b-hatch-stage{position:relative;display:inline-block}'
        + '.q4b-hatch-stage.beat{animation:q4bPulse .55s ease-in-out}'
        + '.q4b-ring{position:absolute;inset:50% auto auto 50%;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;border:6px solid #F2A33C;animation:q4bRing 900ms ease-out forwards;pointer-events:none}'
        + '.q4b-flash{position:fixed;inset:0;background:radial-gradient(circle,rgba(255,235,160,.9) 0%,rgba(255,235,160,0) 60%);pointer-events:none;animation:q4bFlash 700ms ease-out forwards;z-index:319}'
        + '.q4b-conf{position:fixed;top:-12vh;width:10px;height:14px;border-radius:2px;pointer-events:none;animation:q4bConfetti 2.4s ease-out forwards;z-index:321}'
        + '.q4b-sparkle{position:absolute;font-size:22px;pointer-events:none;animation:q4bSparkleFloat 1.4s ease-out forwards}';
      (doc.head||doc.body).appendChild(st);
    }

    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:22px;max-width:360px;width:96%;padding:24px 22px;text-align:center;box-shadow:0 14px 44px rgba(0,0,0,.4);position:relative;overflow:hidden">'
      +   '<div id="q4bHatchStage" class="q4b-hatch-stage" style="line-height:1;margin-bottom:10px;min-height:128px;display:flex;align-items:center;justify-content:center">'+stageHTML(stageVisuals[0])+'</div>'
      +   '<div id="q4bHatchSparkle" style="font-size:14px;color:#F2A33C;font-weight:800;min-height:24px"></div>'
      +   '<div id="q4bHatchName" style="font-size:20px;font-weight:800;color:#2A3D2C;margin-top:6px;display:none">'+esc(sp.jaName||sp.id)+' '+sexMark+'</div>'
      +   '<div id="q4bHatchSize" style="font-size:13px;color:#6B7A5E;margin-top:2px;display:none">'+size+'mm</div>'
      +   '<div id="q4bHatchMsg" style="font-size:13px;color:#4A9B3A;font-weight:700;margin-top:8px;display:none">'+dayMsg+'</div>'
      +   '<div id="q4bHatchBtns" style="margin-top:14px;display:none">'
      +     '<button type="button" id="q4bHatchView" style="border:none;background:#3FA86B;color:#fff;border-radius:12px;padding:10px 18px;font-weight:800;font-family:inherit;cursor:pointer;margin-right:6px">図鑑で みる</button>'
      +     '<button type="button" id="q4bHatchClose" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:10px 18px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      + '</div>';
    doc.body.appendChild(ov);

    /* WebAudio で軽い効果音 (許可ジェスチャ時のみ。サイレント失敗安全) */
    function blip(freq, dur, type){
      if(reduce) return;
      try{
        var Ctx = global.AudioContext || global.webkitAudioContext;
        if(!Ctx) return;
        var ctx = global.__q4bAudio || (global.__q4bAudio = new Ctx());
        if(ctx.state === "suspended") try{ ctx.resume(); }catch(_){}
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type||"sine"; o.frequency.value = freq||880;
        g.gain.value = 0.0001;
        o.connect(g); g.connect(ctx.destination);
        var now = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.18, now+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now+(dur||0.2));
        o.start(now); o.stop(now+(dur||0.2)+0.05);
      }catch(_){}
    }

    /* キラキラ粒子をステージ周辺に飛ばす (reduced-motion 時はスキップ) */
    function spawnSparkles(stageRect, n){
      if(reduce) return;
      var symbols = ["✨","⭐","💫","🌟"];
      for(var k=0;k<n;k++){
        var s = doc.createElement("span");
        s.className = "q4b-sparkle";
        s.textContent = symbols[k % symbols.length];
        var ang = (Math.PI*2) * (k/n) + (k*0.317);
        var dist = 60 + 30 * ((k%3)+1);
        s.style.setProperty("--qx", (Math.cos(ang)*dist)+"px");
        s.style.setProperty("--qy", (Math.sin(ang)*dist - 20)+"px");
        s.style.left = "50%"; s.style.top = "50%";
        stageEl.appendChild(s);
        setTimeout(function(el){ return function(){ if(el.parentNode) el.remove(); }; }(s), 1500);
      }
    }

    /* 紙吹雪を画面に降らせる */
    function spawnConfetti(n){
      if(reduce) return;
      var colors = ["#F2A33C","#3FA86B","#5B8DE0","#E84A6B","#E0A32E","#A06BD8"];
      for(var k=0;k<n;k++){
        var c = doc.createElement("div");
        c.className = "q4b-conf";
        c.style.background = colors[k % colors.length];
        c.style.left = (Math.random()*100)+"vw";
        c.style.animationDuration = (2 + Math.random()*1.4)+"s";
        c.style.animationDelay = (Math.random()*0.4)+"s";
        c.style.setProperty("--qx", ((Math.random()-0.5)*200)+"px");
        doc.body.appendChild(c);
        setTimeout(function(el){ return function(){ if(el.parentNode) el.remove(); }; }(c), 3200);
      }
    }

    /* 一瞬の画面フラッシュ */
    function flashScreen(){
      if(reduce) return;
      var f = doc.createElement("div");
      f.className = "q4b-flash";
      doc.body.appendChild(f);
      setTimeout(function(){ if(f.parentNode) f.remove(); }, 750);
    }

    /* 光輪 (リング状の拡散) を stage に重ねる */
    function spawnRing(){
      if(reduce) return;
      var r = doc.createElement("div");
      r.className = "q4b-ring";
      stageEl.appendChild(r);
      setTimeout(function(){ if(r.parentNode) r.remove(); }, 950);
    }

    var stepMs = reduce ? 250 : 550;
    var stageEl = ov.querySelector("#q4bHatchStage");
    var sparkleEl = ov.querySelector("#q4bHatchSparkle");
    var i = 1;

    /* ステージ進行ごとに小さい blip と pulse */
    function pulse(){
      stageEl.classList.remove("beat");
      void stageEl.offsetWidth; /* reflow to restart animation */
      stageEl.classList.add("beat");
    }

    function nextStage(){
      if(i >= stages.length){
        /* adult — 最終演出: フラッシュ + リング + 紙吹雪 + 高音 blip */
        if(adultSvg){ stageEl.innerHTML = '<div style="width:120px;height:120px">'+adultSvg+'</div>'; }
        else { stageEl.textContent = "🐞"; }
        pulse();
        flashScreen();
        spawnRing();
        spawnSparkles(null, 12);
        spawnConfetti(28);
        blip(523.25, 0.18, "triangle");    /* C5 */
        setTimeout(function(){ blip(659.25, 0.18, "triangle"); }, 130); /* E5 */
        setTimeout(function(){ blip(783.99, 0.32, "triangle"); }, 260); /* G5 */
        sparkleEl.textContent = "✨ かえったよ！ ✨";
        ov.querySelector("#q4bHatchName").style.display = "block";
        ov.querySelector("#q4bHatchSize").style.display = "block";
        ov.querySelector("#q4bHatchMsg").style.display = "block";
        ov.querySelector("#q4bHatchBtns").style.display = "block";
        ov.querySelector("#q4bHatchView").onclick = function(){
          ov.remove();
          if(opts.onViewZukan) opts.onViewZukan(sp.id);
        };
        ov.querySelector("#q4bHatchClose").onclick = function(){
          ov.remove();
          if(opts.onClose) opts.onClose();
        };
        return;
      }
      stageEl.innerHTML = stageHTML(stageVisuals[i]);
      pulse();
      spawnSparkles(null, 5);
      blip(330 + i*60, 0.12, "sine");
      i++;
      setTimeout(nextStage, stepMs);
    }
    /* 開始時の最初の blip */
    blip(220, 0.14, "sine");
    setTimeout(nextStage, stepMs);
  }

  /* --- ステージ移行アニメ (egg→larva, larva→pupa, nymph 等) ---
     成虫化 (hatch) より軽量。prev→next の transformation を ~600ms で見せる。
     opts: {egg, sp, prevStage, nextStage, onClose} */
  function playStageAdvanceAnimation(opts){
    opts = opts || {};
    var sp = opts.sp, egg = opts.egg;
    if(!sp || !egg) return;
    var doc = global.document; if(!doc) return;
    var prevV = stageVisual(opts.prevStage, sp);
    var nextV = stageVisual(opts.nextStage, sp);
    function vHTML(v){
      if(v.svgUrl) return '<img src="'+v.svgUrl+'" alt="" style="width:110px;height:110px;display:block" onerror="this.style.display=\'none\'">';
      return '<div style="font-size:80px;line-height:1">'+(v.emoji||"")+'</div>';
    }
    var STAGE_JA = {egg:"たまご", larva:"ようちゅう", pupa:"さなぎ", nymph:"わかむし", adult:"せいちゅう"};
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var ov = doc.createElement("div");
    ov.id = "q4bAdvanceOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.7);display:flex;align-items:center;justify-content:center;z-index:325;padding:14px";
    var card = doc.createElement("div");
    card.style.cssText = "background:#FFFDF4;border-radius:22px;max-width:340px;width:96%;padding:24px 22px;text-align:center;box-shadow:0 14px 44px rgba(0,0,0,.4);position:relative";
    card.innerHTML = ''
      + '<div id="q4bAdvVis" style="line-height:1;margin-bottom:10px;min-height:120px;display:flex;align-items:center;justify-content:center">'+vHTML(prevV)+'</div>'
      + '<div id="q4bAdvLabel" style="font-size:14px;color:#F2A33C;font-weight:800;min-height:24px"></div>'
      + '<div id="q4bAdvBtn" style="margin-top:14px;display:none">'
      +   '<button type="button" id="q4bAdvClose" style="border:none;background:#3FA86B;color:#fff;border-radius:12px;padding:10px 22px;font-weight:800;font-family:inherit;cursor:pointer">やったー！</button>'
      + '</div>';
    ov.appendChild(card);
    doc.body.appendChild(ov);

    function blip(freq){
      if(reduce) return;
      try{
        var Ctx = global.AudioContext || global.webkitAudioContext;
        if(!Ctx) return;
        var ctx = global.__q4bAudio || (global.__q4bAudio = new Ctx());
        if(ctx.state === "suspended") try{ ctx.resume(); }catch(_){}
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = freq;
        g.gain.value = 0.0001;
        o.connect(g); g.connect(ctx.destination);
        var now = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.15, now+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now+0.18);
        o.start(now); o.stop(now+0.22);
      }catch(_){}
    }
    blip(400);
    var visEl = card.querySelector("#q4bAdvVis");
    var labelEl = card.querySelector("#q4bAdvLabel");
    var btnWrap = card.querySelector("#q4bAdvBtn");
    /* 0.5s 後に next stage 表示 + ラベル + sparkle */
    setTimeout(function(){
      visEl.innerHTML = vHTML(nextV);
      labelEl.textContent = "✨ " + (STAGE_JA[opts.nextStage]||opts.nextStage) + "に なったよ！";
      blip(600);
      btnWrap.style.display = "block";
      /* 軽い sparkle 3 個 */
      if(!reduce){
        var symbols = ["✨","⭐","💫"];
        for(var k=0;k<3;k++){
          var s = doc.createElement("span");
          s.style.cssText = "position:absolute;font-size:22px;pointer-events:none;left:50%;top:30%;animation:q4bSparkleFloat 1.2s ease-out forwards";
          s.style.setProperty("--qx", ((k-1)*40)+"px");
          s.style.setProperty("--qy", (-30 - k*8)+"px");
          s.textContent = symbols[k];
          card.appendChild(s);
          setTimeout(function(el){ return function(){ if(el.parentNode) el.remove(); }; }(s), 1300);
        }
      }
    }, reduce ? 200 : 500);
    card.querySelector("#q4bAdvClose").onclick = function(){
      if(ov.parentNode) ov.parentNode.removeChild(ov);
      if(opts.onClose) opts.onClose();
    };
  }

  /* --- 学習画面の +1 フィードバック HTML ---
     学習リザルトに該当教科の卵リスト + 進捗 + 孵化準備済ボタンを返す */
  function feedFeedbackHTML(game, opts){
    opts = opts || {};
    var r = R(); if(!r) return "";
    var bs = global.QuestSave && global.QuestSave.breedingOf ? global.QuestSave.breedingOf(global.QuestSave.currentProfile()) : null;
    if(!bs) return "";
    var eggs = bs.eggs.filter(function(e){ return e.game === game; });
    if(!eggs.length) return "";
    /* 孵化準備済優先 → progress 高い順 */
    eggs.sort(function(a,b){
      var ar = a.progress>=a.target ? 1 : 0;
      var br = b.progress>=b.target ? 1 : 0;
      if(ar !== br) return br - ar;
      return (b.progress/b.target) - (a.progress/a.target);
    });
    var a = A();
    var rows = eggs.map(function(egg){
      var sp = r.spById(egg.id);
      if(!sp) return "";
      var stage = r.currentStage(egg, sp);
      var em = a ? a.stageEmoji(stage) : "🥚";
      var name = sp.jaName || egg.id;
      var ready = r.isHatchReady(egg);
      var cta = (ready && opts.onHatchNow)
        ? ' <button type="button" onclick="'+opts.onHatchNow+'(\''+egg.id+'\')" style="border:none;background:#F2A33C;color:#fff;border-radius:8px;padding:4px 10px;font-weight:700;font-family:inherit;font-size:12px;cursor:pointer;margin-left:6px">いま かえす?</button>'
        : '';
      var readyTxt = ready ? '<span style="color:#F2A33C;font-weight:800;font-size:12px;margin-left:6px">✨ かえる準備OK！</span>'+cta : '';
      return '<div style="font-size:13px;color:#2A3D2C;padding:2px 0">'+em+' '+esc(name)+' +1 ('+egg.progress+'/'+egg.target+')'+readyTxt+'</div>';
    }).join("");
    return ''
      + '<div class="q4b-feed-feedback" style="background:#F4F8E8;border-radius:10px;padding:6px 10px;margin:6px 0">'
      +   '<div style="font-size:12px;color:#6B7A5E;font-weight:700;margin-bottom:2px">🥚 そだち中:</div>'
      +   rows
      + '</div>';
  }

  /* --- 自動孵化通知 (ホーム表示時) ---
     成虫まで育った卵が複数まとめて自動孵化された場合のお祝いトースト。
     opts.hatched = [{id, sp, size}, ...] (id, sp object, size mm) */
  function notifyAutoHatched(hatched){
    if(!hatched || !hatched.length) return;
    var doc = global.document; if(!doc || !doc.body) return;
    var existing = doc.getElementById("q4bAutoHatchedToast");
    if(existing) existing.remove();
    var ov = doc.createElement("div");
    ov.id = "q4bAutoHatchedToast";
    ov.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#FFFDF4;border:3px solid #F2A33C;border-radius:18px;padding:16px 18px;z-index:9998;box-shadow:0 8px 26px rgba(0,0,0,.3);max-width:88vw;width:340px;font-family:inherit;animation:q4bToastSlide .35s ease-out";
    var rows = hatched.slice(0, 5).map(function(h){
      var name = (h.sp && (h.sp.jaName || h.sp.id)) || h.id;
      return '<div style="font-size:13px;color:#2A3D2C;padding:3px 0">🪲 '+esc(name)+' ('+h.size+'mm)</div>';
    }).join("");
    var moreNote = hatched.length > 5 ? '<div style="font-size:11px;color:#6B7A5E;margin-top:4px">…ほか '+(hatched.length-5)+'匹</div>' : '';
    ov.innerHTML = ''
      + '<div style="font-size:16px;font-weight:800;color:#CF7F14;margin-bottom:6px">🎉 せいちゅうに なったよ!</div>'
      + '<div style="font-size:11px;color:#6B7A5E;margin-bottom:6px">'+hatched.length+'匹 の むしが ずかんに きろくされたよ</div>'
      + rows
      + moreNote
      + '<div style="text-align:right;margin-top:8px">'
      +   '<button type="button" id="q4bAutoHatchedClose" style="border:none;background:#F2A33C;color:#fff;border-radius:10px;padding:6px 16px;font-weight:700;font-family:inherit;cursor:pointer">やったー!</button>'
      + '</div>';
    doc.body.appendChild(ov);
    var btn = ov.querySelector("#q4bAutoHatchedClose");
    if(btn) btn.onclick = function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); };
    setTimeout(function(){ if(ov.parentNode){ ov.style.transition="opacity .3s"; ov.style.opacity="0"; setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 320); } }, 12000);
  }

  /* --- 産卵成功通知トースト ---
     各教科の layEgg 成功直後に呼ぶ。ホームへの誘導ボタン付き。
     呼出側パスは ../index.html (各教科は 1 階層下) を既定。 */
  function notifyEggLaid(sp, opts){
    opts = opts || {};
    var doc = global.document; if(!doc || !doc.body) return;
    var existing = doc.getElementById("q4bEggLaidToast");
    if(existing) existing.remove();
    var homeHref = opts.homeHref || "../index.html";
    var t = doc.createElement("div");
    t.id = "q4bEggLaidToast";
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#FFF6E0;border:2px solid #F2A33C;border-radius:14px;padding:12px 16px;z-index:9998;box-shadow:0 6px 22px rgba(0,0,0,.25);max-width:88vw;width:300px;font-family:inherit;animation:q4bToastSlide .3s ease-out";
    t.innerHTML = ''
      + '<div style="font-size:14px;font-weight:800;color:#8A5C2C;margin-bottom:4px">🥚 '+esc(sp.jaName||sp.id)+' の たまごを 産んだよ!</div>'
      + '<div style="font-size:12px;color:#6B7A5E;margin-bottom:10px">御神木の 「そだてている むし」 パネルで みられるよ</div>'
      + '<div style="display:flex;gap:6px">'
      +   '<a href="'+esc(homeHref)+'" style="flex:1;border:none;border-radius:10px;background:#F2A33C;color:#fff;padding:10px;font-weight:800;font-family:inherit;text-decoration:none;text-align:center;font-size:13px">いま みる</a>'
      +   '<button type="button" id="q4bEggLaidLater" style="border:none;border-radius:10px;background:#EAEFE0;color:#2A3D2C;padding:10px 12px;font-weight:700;font-family:inherit;cursor:pointer;font-size:13px">あとで</button>'
      + '</div>';
    doc.body.appendChild(t);
    var laterBtn = t.querySelector("#q4bEggLaidLater");
    if(laterBtn) laterBtn.onclick = function(){ if(t.parentNode) t.remove(); };
    setTimeout(function(){ if(t.parentNode){ t.style.transition="opacity .3s"; t.style.opacity="0"; setTimeout(function(){ if(t.parentNode) t.remove(); }, 320); } }, 8000);
  }

  /* --- 卵詳細モーダル ---
     卵カードタップで開く。
     表示: ステージアート + 種名 + 性別 + 産卵日 / ステージ遷移日 + 進捗 + アクション (孵化/捨てる/親図鑑)
     opts: {egg, onHatch, onAbandon, onViewParent} */
  function openEggInfoModal(opts){
    opts = opts || {};
    var egg = opts.egg; if(!egg) return;
    var r = R(); if(!r) return;
    var sp = r.spById(egg.id); if(!sp) return;
    var doc = global.document; if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bEggInfoOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.55);display:flex;align-items:center;justify-content:center;z-index:305;padding:14px";
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.onclick = function(e){ if(e.target === ov) close(); };

    var stage = r.displayStage ? r.displayStage(egg, sp) : r.currentStage(egg, sp);
    var v = stageVisual(stage, sp);
    var visualHTML = v.svgUrl
      ? '<img src="'+v.svgUrl+'" alt="" style="width:96px;height:96px;display:block;margin:0 auto" onerror="this.style.display=\'none\'">'
      : '<div style="font-size:72px;line-height:1;text-align:center">'+v.emoji+'</div>';
    var name = sp.jaName || egg.id;
    var sexMark = egg.sex === "m" ? "♂ オス" : egg.sex === "f" ? "♀ メス" : "";
    var shinyMark = egg.shiny ? ' ✨' : '';
    var ready = r.isHatchReady(egg);
    var p = pct(egg.progress, egg.target);
    var color = GAME_COLOR[egg.game] || "#888";
    var gameLabel = (GAME_EMOJI[egg.game]||"") + " " + (GAME_LABEL[egg.game]||egg.game);

    /* ステージごとの日本語ラベル + 絵文字 */
    var STAGE_LABEL = {egg:"🥚 たまご", larva:"🐛 ようちゅう", pupa:"🛌 さなぎ", nymph:"🦗 わかむし", adult:"🪲 せいちゅう"};
    /* ステージ履歴: bornAt = egg ステージの開始日 (生成日)、stageHistory[] に遷移日 */
    var history = [{stage:"egg", d:egg.bornAt||""}];
    if(egg.stageHistory && egg.stageHistory.length){
      egg.stageHistory.forEach(function(h){ history.push({stage:h.stage, d:h.d}); });
    }
    var historyRows = history.map(function(h, i){
      var isCurrent = h.stage === stage;
      var label = STAGE_LABEL[h.stage] || h.stage;
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:'+(isCurrent?'#FFF6E0':'#F4F8E8')+';border-radius:8px;margin:3px 0;font-size:13px">'
        + '<span style="font-weight:'+(isCurrent?'800':'600')+';color:'+(isCurrent?'#CF7F14':'#2A3D2C')+'">'+label+(isCurrent?' ← いま':'')+'</span>'
        + '<span style="font-size:12px;color:#6B7A5E">'+(h.d||'?')+'</span>'
        + '</div>';
    }).join("");

    var canAdv = r.canAdvanceStage ? r.canAdvanceStage(egg, sp) : false;
    var nextSt = r.nextStageFor ? r.nextStageFor(egg, sp) : null;
    var nextIsAdult = nextSt === "adult";
    var ctaLabel = NEXT_STAGE_LABEL[nextSt||""] || "つぎへ";
    var ctaBtn = "";
    if(canAdv){
      if(nextIsAdult && ready && opts.onHatch){
        ctaBtn = '<button type="button" id="q4bEggHatch" style="display:block;width:100%;border:none;border-radius:14px;padding:14px;font-size:16px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 4px 0 #CF7F14;cursor:pointer;margin-bottom:8px">✨ '+ctaLabel+'</button>';
      } else if(!nextIsAdult && opts.onAdvance){
        ctaBtn = '<button type="button" id="q4bEggAdvance" style="display:block;width:100%;border:none;border-radius:14px;padding:14px;font-size:16px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 4px 0 #CF7F14;cursor:pointer;margin-bottom:8px">✨ '+ctaLabel+'</button>';
      }
    }
    var parentBtn = opts.onViewParent
      ? '<button type="button" id="q4bEggParent" style="display:block;width:100%;border:none;border-radius:12px;padding:10px;font-size:14px;font-weight:700;font-family:inherit;color:#fff;background:#3FA86B;cursor:pointer;margin-bottom:6px">📖 おやの ずかんを みる</button>'
      : '';
    var abandonBtn = opts.onAbandon
      ? '<button type="button" id="q4bEggAbandon" style="display:block;width:100%;border:1.5px solid #B9C4A8;border-radius:10px;padding:7px;font-size:12px;font-weight:700;font-family:inherit;color:#6B7A5E;background:#FFFDF4;cursor:pointer;margin-bottom:6px">🥚 たまごを すてる (返金なし)</button>'
      : '';
    /* こうたい: 育成中の卵を pendingEggs に戻し、すぐに別の卵に切り替えられるよう
       たまごリスト Modal を自動オープン (進捗は保持) */
    var demoteBtn = opts.onDemote
      ? '<button type="button" id="q4bEggDemote" style="display:block;width:100%;border:1.5px solid #CFDDB2;border-radius:10px;padding:8px;font-size:13px;font-weight:700;font-family:inherit;color:#6B7A5E;background:#F8F4E4;cursor:pointer;margin-bottom:6px">🔄 こうたい (べつの たまごに きりかえ)</button>'
      : '';

    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:22px;max-width:340px;width:96%;max-height:90vh;overflow-y:auto;padding:18px 20px;box-shadow:0 14px 44px rgba(0,0,0,.32)">'
      +   '<div style="text-align:center;margin-bottom:10px">'+visualHTML+'</div>'
      +   '<div style="font-size:18px;font-weight:800;color:#2A3D2C;text-align:center;margin-bottom:2px">'+esc(name)+shinyMark+'</div>'
      +   '<div style="font-size:13px;color:#6B7A5E;text-align:center;margin-bottom:8px">'+sexMark+'　'+esc(gameLabel)+'</div>'
      +   '<div style="background:#EAEFE0;border-radius:99px;height:8px;margin:6px 0;overflow:hidden"><div style="width:'+p+'%;height:100%;background:'+color+';transition:width .3s"></div></div>'
      +   '<div style="font-size:12px;color:#2A3D2C;text-align:center;margin-bottom:10px">'+egg.progress+' / '+egg.target+' もん '+(ready?' ✨ かえる準備OK！':'')+'</div>'
      +   '<div style="font-size:12px;color:#6B7A5E;font-weight:700;margin-bottom:4px">📅 そだちの きろく</div>'
      +   historyRows
      +   '<div style="margin-top:12px">'
      +     ctaBtn
      +     parentBtn
      +     demoteBtn
      +     abandonBtn
      +     '<button type="button" id="q4bEggClose" style="display:block;width:100%;border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:8px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      + '</div>';
    doc.body.appendChild(ov);

    if(canAdv && nextIsAdult && ready && opts.onHatch){
      ov.querySelector("#q4bEggHatch").onclick = function(){ close(); opts.onHatch(egg.id); };
    }
    if(canAdv && !nextIsAdult && opts.onAdvance){
      ov.querySelector("#q4bEggAdvance").onclick = function(){ close(); opts.onAdvance(egg.id); };
    }
    if(opts.onViewParent){
      ov.querySelector("#q4bEggParent").onclick = function(){ close(); opts.onViewParent(egg.id); };
    }
    if(opts.onAbandon){
      ov.querySelector("#q4bEggAbandon").onclick = function(){
        if(!confirm("この たまごを すてる? (返金なし)")) return;
        if(!confirm("ほんとうに すてる?")) return;
        close(); opts.onAbandon(egg.id);
      };
    }
    if(opts.onDemote){
      ov.querySelector("#q4bEggDemote").onclick = function(){
        close(); opts.onDemote(egg.id);
      };
    }
    ov.querySelector("#q4bEggClose").onclick = close;
  }

  /* --- たまごの巣 (Egg Nest) モーダル ---
     待機卵 (pendingEggs) を可視化し、選んでスロットに promote / 個別に discard できる。
     新規産卵は「あたらしく うむ」ボタンから openEggPickerModal を起動。
     opts: {pendingEggs, slotsAvailable, eggsIds (育成中の id 集合),
            onPickPending(id), onDiscardPending(id), onOpenLayPicker} */
  function openEggNestModal(opts){
    opts = opts || {};
    var pendingEggs = opts.pendingEggs || [];
    var slotsAvailable = opts.slotsAvailable || 0;
    var eggsIds = opts.eggsIds || {};
    var r = R();
    var doc = global.document; if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bEggNestOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.55);display:flex;align-items:center;justify-content:center;z-index:330;padding:12px";
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.onclick = function(e){ if(e.target === ov) close(); };
    function cardHTML(egg, order){
      var sp = r ? r.spById(egg.id) : null;
      var name = esc(sp && sp.jaName ? sp.jaName : egg.id);
      var sexEmoji = egg.sex === 'm' ? '♂' : (egg.sex === 'f' ? '♀' : '?');
      var sexColor = egg.sex === 'm' ? '#5B8DE0' : (egg.sex === 'f' ? '#E08BB9' : '#6B7A5E');
      var shinyMark = egg.shiny ? ' ✨' : '';
      var originLabelMap = {master_pair:'🎓 マスター', boss_pair:'👑 ボス', lay:'🥚 産卵'};
      var originColorMap = {master_pair:'#A06BD8', boss_pair:'#E8B33C', lay:'#4A9B3A'};
      var originLabel = originLabelMap[egg.origin] || '';
      var originColor = originColorMap[egg.origin] || '#6B7A5E';
      /* レア度は日本語ラベルで表示 (子供向け). N→ノーマル, R→レア, SR→スーパーレア, SSR→ウルトラレア, SS→でんせつ */
      var rarityLabelMap = {N:'ノーマル', R:'レア', SR:'スーパーレア', SSR:'ウルトラレア', SS:'でんせつ'};
      var rarityColorMap = {N:'#9CA88A', R:'#5B8DE0', SR:'#A06BD8', SSR:'#E08BB9', SS:'#E8B33C'};
      var tier = sp && sp.rarity ? (rarityLabelMap[sp.rarity] || sp.rarity) : '';
      var tierBg = sp && sp.rarity ? (rarityColorMap[sp.rarity] || '#EAEFE0') : '#EAEFE0';
      var bornDate = egg.bornAt ? esc(egg.bornAt) : '';
      var canPromote = (slotsAvailable > 0) && !eggsIds[egg.id];
      /* disabled 属性は使わない (子に「押した感」と理由を見せる)。常に有効、
         押した時に canPromote=false なら alert で理由を明示。 */
      var promoteStyle = canPromote ? 'background:#4A9B3A;color:#fff' : 'background:#CFDDB2;color:#6B7A5E;opacity:.7';
      var hintHTML = '';
      if(!canPromote && eggsIds[egg.id]){
        hintHTML = '<div style="font-size:10px;color:#A89876;margin-top:2px">いま 同じ虫を そだててるよ</div>';
      } else if(!canPromote){
        hintHTML = '<div style="font-size:10px;color:#A89876;margin-top:2px">スロットが いっぱい・先に こうたい してね</div>';
      }
      return '<div class="q4bNestCard" style="background:#fff;border:1.5px solid #E0D4F2;border-radius:12px;padding:10px;margin-bottom:8px">'
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
        +   '<span style="background:'+originColor+';color:#fff;font-size:10px;font-weight:800;border-radius:99px;padding:1px 7px">'+originLabel+'</span>'
        +   (tier?'<span style="background:'+tierBg+';color:#fff;font-size:10px;font-weight:800;border-radius:6px;padding:1px 6px">'+esc(tier)+'</span>':'')
        +   '<span style="font-size:14px;font-weight:700;color:#2A3D2C;flex:1">'+name+shinyMark+'</span>'
        +   '<span style="color:'+sexColor+';font-size:18px;font-weight:900">'+sexEmoji+'</span>'
        + '</div>'
        + '<div style="font-size:10px;color:#6B7A5E;margin-bottom:8px">#'+order+(bornDate?'　・　うんだ日: '+bornDate:'')+'</div>'
        + '<div style="display:flex;gap:6px">'
        +   '<button type="button" data-act="promote" data-egg-id="'+esc(egg.id)+'" data-can-promote="'+(canPromote?'1':'0')+'"'
        +     ' style="flex:1;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:800;font-family:inherit;cursor:pointer;'+promoteStyle+'">そだてる ▶</button>'
        +   '<button type="button" data-act="discard" data-egg-id="'+esc(egg.id)+'"'
        +     ' style="border:none;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;font-family:inherit;background:#EAEFE0;color:#6B7A5E;cursor:pointer">すてる</button>'
        + '</div>'
        + hintHTML
        + '</div>';
    }
    var listHTML = pendingEggs.length
      ? pendingEggs.map(function(e,i){return cardHTML(e,i+1);}).join('')
      : '<div style="text-align:center;padding:24px;color:#6B7A5E;font-size:13px">📭 まちの たまごは ないよ</div>';
    var layBtn = opts.onOpenLayPicker
      ? '<button type="button" id="q4bNestNewLay" style="margin-top:8px;width:100%;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:800;font-family:inherit;background:#F2A33C;color:#fff;cursor:pointer;box-shadow:0 3px 0 #CF7F14">🥚 あたらしく うむ</button>'
      : '';
    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:18px;max-width:460px;width:96%;padding:18px 16px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 14px 44px rgba(0,0,0,.4)">'
      +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      +     '<span style="font-size:22px">🥚</span>'
      +     '<span style="font-size:17px;font-weight:800;color:#2A3D2C;flex:1">たまごリスト</span>'
      +     '<button type="button" id="q4bNestClose" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:8px;padding:6px 12px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      +   '<div style="font-size:12px;color:#6B7A5E;margin-bottom:10px">まちの たまご: '+pendingEggs.length+'こ　／　あき スロット: '+slotsAvailable+'</div>'
      +   '<div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;margin:-2px;padding:2px">'+listHTML+'</div>'
      +   layBtn
      + '</div>';
    doc.body.appendChild(ov);
    /* callback 呼び出しヘルパ: 関数 or 関数名 (string) の両対応 */
    function _call(cb, arg){
      if(typeof cb === 'function') cb(arg);
      else if(typeof cb === 'string' && typeof global[cb] === 'function') global[cb](arg);
    }
    ov.querySelector('#q4bNestClose').onclick = close;
    if(opts.onOpenLayPicker){
      var lb = ov.querySelector('#q4bNestNewLay');
      if(lb) lb.onclick = function(){ close(); _call(opts.onOpenLayPicker); };
    }
    Array.prototype.forEach.call(ov.querySelectorAll('button[data-act]'), function(b){
      b.onclick = function(){
        var id = b.getAttribute('data-egg-id');
        var act = b.getAttribute('data-act');
        if(act === 'promote'){
          var canP = b.getAttribute('data-can-promote') === '1';
          if(!canP){
            global.alert('スロットが いっぱい だよ。\nそだてている むしを「🔄 こうたい」してね');
            return;
          }
          if(opts.onPickPending){ close(); _call(opts.onPickPending, id); }
        } else if(act === 'discard' && opts.onDiscardPending){
          if(!global.confirm || !global.confirm('この たまごを すてる? (もどせないよ)')) return;
          close(); _call(opts.onDiscardPending, id);
        }
      };
    });
  }

  /* --- レガシーマスター一覧モーダル ---
     ホーム legacyBanner タップで開く。3 教科横断の sex='u' マスター虫を一覧 → 各エントリの
     「♂♀ をきめる」ボタンで openMasterSexPickerModal を起動する救済導線。
     opts: {entries:[{spId, sp, gameLabel, onPickSex:function(sex)}], onClose} */
  function openLegacyMasterListModal(opts){
    opts = opts || {};
    var entries = opts.entries || [];
    if(!entries.length) return;
    var doc = global.document; if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bLegacyListOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.55);display:flex;align-items:center;justify-content:center;z-index:330;padding:12px";
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); if(opts.onClose) opts.onClose(); }
    ov.onclick = function(e){ if(e.target === ov) close(); };
    var rows = entries.map(function(en, idx){
      var sp = en.sp;
      var name = esc(sp && sp.jaName ? sp.jaName : (en.spId||""));
      var glabel = esc(en.gameLabel || "");
      var gcolor = GAME_COLOR[en.game] || "#A06BD8";
      return '<div data-idx="'+idx+'" class="q4bLegRow" style="display:flex;align-items:center;gap:10px;padding:10px;border:1.5px solid #E0D4F2;border-radius:12px;margin-bottom:8px;background:#fff;cursor:pointer">'
        + '<span style="background:'+gcolor+';color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:2px 8px">'+glabel+'</span>'
        + '<span style="flex:1;font-size:15px;font-weight:700;color:#2A3D2C">🎓 '+name+'</span>'
        + '<span style="background:#A06BD8;color:#fff;font-size:12px;font-weight:800;border-radius:8px;padding:6px 10px">♂♀ をきめる ▶</span>'
        + '</div>';
    }).join("");
    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:18px;max-width:420px;width:96%;padding:18px 16px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 14px 44px rgba(0,0,0,.4)">'
      +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      +     '<span style="font-size:22px">🎓</span>'
      +     '<span style="font-size:17px;font-weight:800;color:#2A3D2C;flex:1">♂♀ をきめてない とくべつな虫</span>'
      +     '<button type="button" id="q4bLegClose" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:8px;padding:6px 12px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      +   '<div style="font-size:12px;color:#6B7A5E;margin-bottom:10px">♂♀ をきめると、反対せいべつの たまごが もらえるよ</div>'
      +   '<div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">'+rows+'</div>'
      + '</div>';
    doc.body.appendChild(ov);
    ov.querySelector("#q4bLegClose").onclick = close;
    Array.prototype.forEach.call(ov.querySelectorAll(".q4bLegRow"), function(row){
      row.onclick = function(){
        var idx = +row.getAttribute("data-idx");
        var en = entries[idx]; if(!en) return;
        close();
        openMasterSexPickerModal({
          sp: en.sp, isLegacy: true, allowCancel: true,
          onPick: function(sex){ if(en.onPickSex) en.onPickSex(sex); }
        });
      };
    });
  }

  /* ブリーダー称号アップ toast (累積孵化数の階段) */
  function notifyBreederLevelUp(newTier){
    if(!newTier) return;
    var doc = global.document; if(!doc || !doc.body) return;
    var existing = doc.getElementById("q4bBreederToast");
    if(existing) existing.remove();
    var t = doc.createElement("div");
    t.id = "q4bBreederToast";
    t.style.cssText = "position:fixed;left:50%;top:24px;transform:translateX(-50%);background:linear-gradient(180deg,#FFF6E0 0%,#FFEFC4 100%);border:2.5px solid #E0A32E;border-radius:14px;padding:14px 20px;z-index:9999;box-shadow:0 8px 22px rgba(0,0,0,.28);max-width:88vw;font-family:inherit;text-align:center;animation:q4bToastSlideTop .35s ease-out";
    t.innerHTML = '<div style="font-size:13px;color:#8A5C2C;font-weight:800;margin-bottom:4px">🎉 称号アップ!</div>'
      + '<div style="font-size:20px;font-weight:900;color:#5C3D14">'+newTier.emoji+' '+esc(newTier.label)+'</div>';
    doc.body.appendChild(t);
    setTimeout(function(){ if(t.parentNode){ t.style.transition="opacity .4s"; t.style.opacity="0"; setTimeout(function(){ if(t.parentNode) t.remove(); }, 420); } }, 5500);
  }

  /* マスター ♂♀ 確定後の toast (反対性別卵の授与結果を明示) */
  function notifyMasterEggGranted(sp, opts){
    opts = opts || {};
    var doc = global.document; if(!doc || !doc.body) return;
    var existing = doc.getElementById("q4bMasterEggToast");
    if(existing) existing.remove();
    var t = doc.createElement("div");
    t.id = "q4bMasterEggToast";
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#F5E8FF;border:2px solid #A06BD8;border-radius:14px;padding:12px 16px;z-index:9998;box-shadow:0 6px 22px rgba(0,0,0,.25);max-width:88vw;width:320px;font-family:inherit";
    var name = esc(sp && sp.jaName ? sp.jaName : (sp && sp.id ? sp.id : ""));
    var head, body;
    if(opts.batch){
      head = '🥚 '+name+' に はんたいせいべつ の たまごを 一気に もらったよ!';
      body = '御神木の 「そだてている むし」 パネルで みよう';
    } else if(opts.skipped){
      head = '✅ '+name+' の せいべつを かくていしたよ';
      body = 'たまごは すでに もらっているよ';
    } else if(opts.queued){
      head = '📬 '+name+' の はんたいせいべつ たまごを 保留に いれたよ';
      body = 'たまごスロットを 空けると うけとれるよ';
    } else {
      head = '🥚 '+name+' の はんたいせいべつ たまごを もらったよ!';
      body = '御神木の 「そだてている むし」 パネルで みられるよ';
    }
    t.innerHTML = ''
      + '<div style="font-size:14px;font-weight:800;color:#6B4A99;margin-bottom:4px">'+head+'</div>'
      + '<div style="font-size:12px;color:#6B7A5E">'+body+'</div>';
    doc.body.appendChild(t);
    setTimeout(function(){ if(t.parentNode){ t.style.transition="opacity .3s"; t.style.opacity="0"; setTimeout(function(){ if(t.parentNode) t.remove(); }, 320); } }, 4500);
  }

  /* --- マスター ♂♀ 選択モーダル ---
     B (新規マスター達成) と C (レガシー救済) で共用。
     opts: {sp, isLegacy: bool, onPick: function(sex), onCancel?: function} */
  function openMasterSexPickerModal(opts){
    opts = opts || {};
    var sp = opts.sp; if(!sp) return;
    var doc = global.document; if(!doc) return;
    var ov = doc.createElement("div");
    ov.id = "q4bMasterSexOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(42,61,44,.55);display:flex;align-items:center;justify-content:center;z-index:340;padding:14px";
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
    /* キャンセル時挙動: 新規 (isLegacy=false) は外タップ無効、X 必須 (誤キャンセル防止) */
    var canCancel = !!opts.isLegacy || opts.allowCancel;
    if(canCancel){
      ov.onclick = function(e){ if(e.target === ov){ close(); if(opts.onCancel) opts.onCancel(); } };
    }
    var name = esc(sp.jaName || sp.id);
    var label = opts.isLegacy ? "♂♀ を きめよう" : "🎓 マスター達成！どちらに する?";
    var sub = opts.isLegacy
      ? "きめると 反対せいべつの たまごが もらえるよ"
      : name+" を つかまえたよ! ♂♀ を えらぶと、はんたいの たまごも もらえるよ";
    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:18px;max-width:340px;width:96%;padding:20px 22px;text-align:center;box-shadow:0 14px 44px rgba(0,0,0,.4)">'
      +   '<div style="font-size:18px;font-weight:800;color:#2A3D2C;margin-bottom:6px">'+label+'</div>'
      +   '<div style="font-size:14px;color:#6B7A5E;margin-bottom:14px">'+esc(sub)+'</div>'
      +   '<div style="display:flex;gap:10px;margin-bottom:10px">'
      +     '<button type="button" data-sex="m" style="flex:1;border:none;border-radius:14px;padding:14px;font-size:22px;font-weight:800;font-family:inherit;background:#5B8DE0;color:#fff;box-shadow:0 3px 0 #2F65BA;cursor:pointer">♂ オス</button>'
      +     '<button type="button" data-sex="f" style="flex:1;border:none;border-radius:14px;padding:14px;font-size:22px;font-weight:800;font-family:inherit;background:#E08BB9;color:#fff;box-shadow:0 3px 0 #B36192;cursor:pointer">♀ メス</button>'
      +   '</div>'
      +   (canCancel ? '<button type="button" id="q4bMasterCancel" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:8px 18px;font-weight:700;font-family:inherit;cursor:pointer">あとで きめる</button>' : '')
      + '</div>';
    doc.body.appendChild(ov);
    Array.prototype.forEach.call(ov.querySelectorAll("button[data-sex]"), function(b){
      b.onclick = function(){
        var sex = b.getAttribute("data-sex");
        close();
        if(opts.onPick) opts.onPick(sex);
      };
    });
    var c = ov.querySelector("#q4bMasterCancel");
    if(c){ c.onclick = function(){ close(); if(opts.onCancel) opts.onCancel(); }; }
  }

  /* --- feed toast ---
     feedEgg が成功するたびに小さい toast を画面下部に出す。
     fed: progress +1 された egg の配列 */
  var _toastTimer = null;
  function showFeedToast(game, fed){
    var doc = global.document; if(!doc || !doc.body) return;
    var r = R(); if(!r) return;
    var a = A();
    var existing = doc.getElementById("q4bFeedToast");
    if(existing) existing.remove();
    if(_toastTimer){ clearTimeout(_toastTimer); _toastTimer = null; }
    var rows = fed.map(function(egg){
      var sp = r.spById(egg.id); if(!sp) return "";
      var stage = r.currentStage(egg, sp);
      var em = a ? a.stageEmoji(stage) : "🥚";
      var ready = r.isHatchReady(egg);
      var name = sp.jaName || egg.id;
      var readyTxt = ready ? ' <span style="color:#F2A33C;font-weight:800">✨ かえる準備OK!</span>' : '';
      return '<div style="font-size:13px;color:#2A3D2C;padding:1px 0">'+em+' '+esc(name)+' +1 ('+egg.progress+'/'+egg.target+')'+readyTxt+'</div>';
    }).join("");
    if(!rows) return;
    var toast = doc.createElement("div");
    toast.id = "q4bFeedToast";
    toast.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#F4F8E8;border:1.5px solid #CFDDB2;border-radius:14px;padding:10px 14px;font-family:inherit;z-index:9999;box-shadow:0 4px 18px rgba(0,0,0,.2);max-width:88vw;animation:q4bToastSlide .3s ease-out";
    toast.innerHTML = '<div style="font-size:11px;color:#6B7A5E;font-weight:700;margin-bottom:3px">🥚 そだち中:</div>'+rows;
    if(!doc.getElementById("q4bToastCss")){
      var st = doc.createElement("style"); st.id = "q4bToastCss";
      st.textContent = "@keyframes q4bToastSlide{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
      (doc.head||doc.body).appendChild(st);
    }
    doc.body.appendChild(toast);
    _toastTimer = setTimeout(function(){
      if(toast.parentNode) toast.style.transition = "opacity .3s";
      if(toast.parentNode) toast.style.opacity = "0";
      setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 320);
    }, 2400);
  }

  /* feedEgg hook を Q4BReward に登録 (自動 toast 表示) */
  if(global.Q4BReward && global.Q4BReward.setFeedHook){
    global.Q4BReward.setFeedHook(showFeedToast);
  }

  global.Q4BBreeding = {
    eggCardHTML: eggCardHTML,
    emptySlotHTML: emptySlotHTML,
    homeBreedingPanelHTML: homeBreedingPanelHTML,
    openEggPickerModal: openEggPickerModal,
    openEggNestModal: openEggNestModal,
    openLayConfirm: openLayConfirm,
    openMasterSexPickerModal: openMasterSexPickerModal,
    openLegacyMasterListModal: openLegacyMasterListModal,
    notifyMasterEggGranted: notifyMasterEggGranted,
    notifyBreederLevelUp: notifyBreederLevelUp,
    openEggInfoModal: openEggInfoModal,
    notifyEggLaid: notifyEggLaid,
    notifyAutoHatched: notifyAutoHatched,
    playHatchAnimation: playHatchAnimation,
    playStageAdvanceAnimation: playStageAdvanceAnimation,
    feedFeedbackHTML: feedFeedbackHTML,
    showFeedToast: showFeedToast,
    metaLabel: metaLabel,
    stageVisual: stageVisual,
    GAME_COLOR: GAME_COLOR,
    GAME_EMOJI: GAME_EMOJI,
    GAME_LABEL: GAME_LABEL
  };
})(typeof window!=="undefined"?window:globalThis);
