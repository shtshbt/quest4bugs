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

  /* --- 卵カード HTML (1枚分) ---
     opts: {onTap: 関数名 string, mode: 'normal'|'kids' (将来), idx: スロット位置} */
  function eggCardHTML(egg, opts){
    opts = opts || {};
    var r = R(); if(!r) return "";
    var sp = r.spById(egg.id);
    if(!sp) return emptySlotHTML(opts);
    var stage = r.currentStage(egg, sp);
    var v = stageVisual(stage, sp);
    var ready = r.isHatchReady(egg);
    var p = pct(egg.progress, egg.target);
    var color = GAME_COLOR[egg.game] || "#888";
    var sexMark = egg.sex === "m" ? "♂" : egg.sex === "f" ? "♀" : "";
    var shinyMark = egg.shiny ? '<span class="q4b-egg-shiny" style="color:#f5b800;font-weight:700">✨</span>' : '';
    var onTapAttr = opts.onTap ? ' onclick="'+opts.onTap+'(\''+egg.id+'\')"' : '';
    var idAttr = ' data-eggid="'+esc(egg.id)+'"';
    var name = sp.jaName || egg.id;
    var ctaBtn = ready && opts.onHatch
      ? '<button class="q4b-egg-cta" onclick="event.stopPropagation();'+opts.onHatch+'(\''+egg.id+'\')" style="display:block;width:100%;border:none;border-radius:8px;padding:8px 6px;margin-top:6px;font-size:13px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 3px 0 #CF7F14;cursor:pointer">✨ タップでかえす</button>'
      : '';
    var visualHTML = v.svgUrl
      ? '<img src="'+v.svgUrl+'" alt="" style="width:42px;height:42px;display:block;margin:0 auto" onerror="this.style.display=\'none\'">'
      : '<div style="font-size:36px;line-height:1.1">'+v.emoji+'</div>';
    return ''
      + '<div class="q4b-egg-card'+(ready?' q4b-egg-ready':'')+'"'+idAttr+onTapAttr
      +   ' style="background:#FFFDF4;border:2.5px solid '+(ready?'#F2A33C':'#CFDDB2')+';border-radius:14px;padding:8px 6px;cursor:pointer;'
      +   (ready?'box-shadow:0 0 0 3px rgba(242,163,60,.25),0 2px 6px rgba(0,0,0,.08);animation:q4bEggGlow 1.6s ease-in-out infinite;':'')
      +   '">'
      +   '<div style="text-align:center;margin-bottom:2px;min-height:44px;display:flex;align-items:center;justify-content:center">'+visualHTML+'</div>'
      +   '<div style="font-size:12px;font-weight:800;color:#2A3D2C;text-align:center;line-height:1.2;min-height:28px;display:flex;align-items:center;justify-content:center">'+esc(name)+shinyMark+'</div>'
      +   '<div style="font-size:11px;color:#6B7A5E;text-align:center;margin-top:1px">'+sexMark+'</div>'
      +   '<div style="background:#EAEFE0;border-radius:99px;height:6px;margin:5px 0 3px;overflow:hidden"><div style="width:'+p+'%;height:100%;background:'+color+';transition:width .3s"></div></div>'
      +   '<div style="font-size:10px;color:#6B7A5E;text-align:center">'+egg.progress+'/'+egg.target+'</div>'
      +   '<div style="font-size:10px;text-align:center;margin-top:1px">'+(GAME_EMOJI[egg.game]||"")+'<span style="color:'+color+';font-weight:700">'+(GAME_LABEL[egg.game]||egg.game)+'</span></div>'
      +   (sp.metamorphosis ? '<div style="font-size:9px;color:#9CA88A;text-align:center;margin-top:1px">'+metaLabel(sp)+'</div>' : '')
      +   (ready ? '<div style="font-size:10px;color:#F2A33C;text-align:center;font-weight:800;margin-top:3px">✨ かえる準備OK!</div>' : '')
      +   ctaBtn
      + '</div>';
  }

  function emptySlotHTML(opts){
    opts = opts || {};
    var onTapAttr = opts.onAdd ? ' onclick="'+opts.onAdd+'()"' : '';
    return ''
      + '<div class="q4b-egg-empty"'+onTapAttr
      +   ' style="background:rgba(207,221,178,.25);border:2.5px dashed #CFDDB2;border-radius:14px;padding:8px 6px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:130px">'
      +   '<div style="font-size:32px;color:#9CA88A;line-height:1">＋</div>'
      +   '<div style="font-size:11px;color:#6B7A5E;font-weight:700;margin-top:3px">あたらしい<br>たまご</div>'
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
        cards.push(eggCardHTML(eggs[i], {onTap: opts.onTap, onHatch: opts.onHatch}));
      } else if(eggs.length < max){
        cards.push(emptySlotHTML({onAdd: opts.onAdd}));
      }
    }
    var pendBanner = opts.pendingCount > 0
      ? '<div class="q4b-egg-pending-banner" style="background:#FFF6E0;border:1.5px solid #F2A33C;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:13px;font-weight:700;color:#8A5C2C;cursor:pointer"'
        + (opts.onAcceptPending ? ' onclick="'+opts.onAcceptPending+'()"' : '')
        + '>📬 たまごが '+opts.pendingCount+'こ まっているよ! タップで うけとる</div>'
      : '';
    var legacyBanner = opts.legacyMasterCount > 0
      ? '<div class="q4b-egg-legacy-banner" style="background:#F5E8FF;border:1.5px solid #A06BD8;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:13px;font-weight:700;color:#6B4A99">🎓 まだ ♂♀ をきめてない とくべつな虫が '+opts.legacyMasterCount+'匹 いるよ</div>'
      : '';
    return ''
      + '<style>@keyframes q4bEggGlow{0%,100%{box-shadow:0 0 0 3px rgba(242,163,60,.25),0 2px 6px rgba(0,0,0,.08)}50%{box-shadow:0 0 0 6px rgba(242,163,60,.4),0 4px 10px rgba(0,0,0,.12)}}</style>'
      + '<div class="card" style="background:linear-gradient(180deg,#FFFDF4 0%,#F8F4E4 100%);border:2px solid #CFDDB2;border-radius:18px;padding:14px 12px;margin-bottom:12px">'
      +   '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'
      +     '<span style="font-size:22px">🥚</span>'
      +     '<span style="font-size:16px;font-weight:800;color:#2A3D2C">そだてている むし</span>'
      +     '<span style="font-size:13px;color:#6B7A5E;margin-left:4px">('+eggs.length+'/'+max+')</span>'
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

    var stage = r.currentStage(egg, sp);
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

    var ctaBtn = (ready && opts.onHatch)
      ? '<button type="button" id="q4bEggHatch" style="display:block;width:100%;border:none;border-radius:14px;padding:14px;font-size:16px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 4px 0 #CF7F14;cursor:pointer;margin-bottom:8px">✨ タップで かえす</button>'
      : '';
    var parentBtn = opts.onViewParent
      ? '<button type="button" id="q4bEggParent" style="display:block;width:100%;border:none;border-radius:12px;padding:10px;font-size:14px;font-weight:700;font-family:inherit;color:#fff;background:#3FA86B;cursor:pointer;margin-bottom:6px">📖 おやの ずかんを みる</button>'
      : '';
    var abandonBtn = opts.onAbandon
      ? '<button type="button" id="q4bEggAbandon" style="display:block;width:100%;border:1.5px solid #B9C4A8;border-radius:10px;padding:7px;font-size:12px;font-weight:700;font-family:inherit;color:#6B7A5E;background:#FFFDF4;cursor:pointer;margin-bottom:6px">🥚 たまごを すてる (返金なし)</button>'
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
      +     abandonBtn
      +     '<button type="button" id="q4bEggClose" style="display:block;width:100%;border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:8px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      + '</div>';
    doc.body.appendChild(ov);

    if(ready && opts.onHatch){
      ov.querySelector("#q4bEggHatch").onclick = function(){ close(); opts.onHatch(egg.id); };
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
    ov.querySelector("#q4bEggClose").onclick = close;
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
    openLayConfirm: openLayConfirm,
    openMasterSexPickerModal: openMasterSexPickerModal,
    openEggInfoModal: openEggInfoModal,
    notifyEggLaid: notifyEggLaid,
    playHatchAnimation: playHatchAnimation,
    feedFeedbackHTML: feedFeedbackHTML,
    showFeedToast: showFeedToast,
    metaLabel: metaLabel,
    stageVisual: stageVisual,
    GAME_COLOR: GAME_COLOR,
    GAME_EMOJI: GAME_EMOJI,
    GAME_LABEL: GAME_LABEL
  };
})(typeof window!=="undefined"?window:globalThis);
