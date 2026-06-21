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

  /* ステージ → 表示用 (絵文字 fallback、SVG が将来用意されたら差し替え) */
  function stageVisual(stage){
    var a = A();
    if(!a) return {emoji:"🥚", svg:null};
    return {emoji: a.stageEmoji(stage), svg: null /* TODO Phase 6.5 */};
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
    var v = stageVisual(stage);
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
    return ''
      + '<div class="q4b-egg-card'+(ready?' q4b-egg-ready':'')+'"'+idAttr+onTapAttr
      +   ' style="background:#FFFDF4;border:2.5px solid '+(ready?'#F2A33C':'#CFDDB2')+';border-radius:14px;padding:8px 6px;cursor:pointer;'
      +   (ready?'box-shadow:0 0 0 3px rgba(242,163,60,.25),0 2px 6px rgba(0,0,0,.08);animation:q4bEggGlow 1.6s ease-in-out infinite;':'')
      +   '">'
      +   '<div style="font-size:36px;text-align:center;line-height:1.1;margin-bottom:2px">'+v.emoji+'</div>'
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
        msg = '<div style="font-size:14px;color:#2A3D2C;text-align:center;padding:20px 8px"><div style="font-size:42px;margin-bottom:6px">🔶</div>かけらが たりないよ。<br>学習で 1日 30問 せいかいすると<br>かけらが もらえるよ</div>';
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
          +     '<div style="font-size:11px;color:#2A3D2C">コスト 🔶 '+cost+' &nbsp; ♂'+nM+' / ♀'+nF+'</div>'
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
      +     '<div style="font-size:12px;color:#6B7A5E">持ってる かけら: 🔶 '+fossilNow+'</div>'
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
      +     'コスト: 🔶 '+cost+'<br>'
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

    /* 4段階 (or 3段階) を ~0.5s 間隔で見せ、最後に成虫アート */
    var stageEmojis = stages.map(function(s){ return a ? a.stageEmoji(s) : "🥚"; });
    /* adult stage は SVG (Q4BRender) があれば使う */
    var adultSvg = (global.Q4BRender && global.Q4BRender.species) ? global.Q4BRender.species(sp, egg.shiny) : "";

    ov.innerHTML = ''
      + '<div style="background:#FFFDF4;border-radius:22px;max-width:360px;width:96%;padding:24px 22px;text-align:center;box-shadow:0 14px 44px rgba(0,0,0,.4)">'
      +   '<div id="q4bHatchStage" style="font-size:90px;line-height:1;margin-bottom:10px;min-height:108px;display:flex;align-items:center;justify-content:center">'+stageEmojis[0]+'</div>'
      +   '<div id="q4bHatchSparkle" style="font-size:14px;color:#F2A33C;font-weight:800;min-height:24px"></div>'
      +   '<div id="q4bHatchName" style="font-size:18px;font-weight:800;color:#2A3D2C;margin-top:6px;display:none">'+esc(sp.jaName||sp.id)+' '+sexMark+'</div>'
      +   '<div id="q4bHatchSize" style="font-size:13px;color:#6B7A5E;margin-top:2px;display:none">'+size+'mm</div>'
      +   '<div id="q4bHatchMsg" style="font-size:13px;color:#4A9B3A;font-weight:700;margin-top:8px;display:none">'+dayMsg+'</div>'
      +   '<div id="q4bHatchBtns" style="margin-top:14px;display:none">'
      +     '<button type="button" id="q4bHatchView" style="border:none;background:#3FA86B;color:#fff;border-radius:12px;padding:10px 18px;font-weight:800;font-family:inherit;cursor:pointer;margin-right:6px">図鑑で みる</button>'
      +     '<button type="button" id="q4bHatchClose" style="border:none;background:#EAEFE0;color:#2A3D2C;border-radius:10px;padding:10px 18px;font-weight:700;font-family:inherit;cursor:pointer">とじる</button>'
      +   '</div>'
      + '</div>';
    doc.body.appendChild(ov);

    /* reduced-motion */
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var stepMs = reduce ? 250 : 550;
    var stageEl = ov.querySelector("#q4bHatchStage");
    var sparkleEl = ov.querySelector("#q4bHatchSparkle");
    var i = 1;
    function nextStage(){
      if(i >= stages.length){
        /* adult */
        if(adultSvg){ stageEl.innerHTML = '<div style="width:120px;height:120px">'+adultSvg+'</div>'; }
        else { stageEl.textContent = "🐞"; }
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
      stageEl.textContent = stageEmojis[i];
      i++;
      setTimeout(nextStage, stepMs);
    }
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

  global.Q4BBreeding = {
    eggCardHTML: eggCardHTML,
    emptySlotHTML: emptySlotHTML,
    homeBreedingPanelHTML: homeBreedingPanelHTML,
    openEggPickerModal: openEggPickerModal,
    openLayConfirm: openLayConfirm,
    playHatchAnimation: playHatchAnimation,
    feedFeedbackHTML: feedFeedbackHTML,
    metaLabel: metaLabel,
    stageVisual: stageVisual,
    GAME_COLOR: GAME_COLOR,
    GAME_EMOJI: GAME_EMOJI,
    GAME_LABEL: GAME_LABEL
  };
})(typeof window!=="undefined"?window:globalThis);
