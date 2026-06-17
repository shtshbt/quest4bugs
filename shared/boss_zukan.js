/* boss_zukan.js — 各ゲーム図鑑にボス昆虫セクションを表示する共有モジュール。
   ボス撃破データは battle 名前空間（QuestSave.load("battle", profileId)）に保存されているため、
   ゲーム側から横断的に読み込んでセクション化する。battle.js（roster）と render/reward が前提。 */
(function(global){
  "use strict";
  var BOSSES = {};      /* 現在プロフィールの撃破マップ {speciesId:{n}} */
  var loaded = false;

  /* バトルセーブから撃破ボスを読み込む（図鑑表示前に await する） */
  function load(profileId){
    if(!global.QuestSave || !profileId){ BOSSES = {}; loaded = true; return Promise.resolve(); }
    return global.QuestSave.load("battle", profileId).then(function(bt){
      BOSSES = (bt && bt.bosses) || {}; loaded = true;
    }).catch(function(){ BOSSES = {}; loaded = true; });
  }
  function ready(){ return loaded; }

  function byIdMap(){
    var m = {}, BUGS = global.Q4B_BUGS || [];
    BUGS.forEach(function(s){ m[s.id] = s; });
    return m;
  }
  /* そのゲーム（属性）の昆虫ボス一覧（天敵=predator は図鑑に入らないので除外） */
  function bossesFor(game){
    var B = global.Q4BBattle, byId = byIdMap();
    if(!B || !B.roster) return [];
    return B.roster.filter(function(r){ return !r.predator && r.type === game && byId[r.id]; });
  }

  /* Render the boss section using each game's regular zukan classes. */
  function sectionHTML(game){
    var RW = global.Q4BReward, R = global.Q4BRender, byId = byIdMap();
    if(!RW || !R) return "";
    var list = bossesFor(game);
    if(!list.length) return "";
    var got = list.filter(function(r){ return BOSSES[r.id]; }).length;
    var gridClass = game === "kanji" ? "bugs" : "zgrid";
    var cells = list.map(function(r){ return cellHTML(game, r, byId[r.id], !!BOSSES[r.id]); }).join("");
    return '<div class="card"><h3>👑 ボス昆虫　<span style="color:#E8B33C">' + got + ' / ' + list.length + '</span></h3>'
      + '<p style="margin:2px 0 8px;font-size:13px;color:#888">ずかんバトルで たおすと あらわれる 強いボス</p>'
      + '<div class="' + gridClass + '">' + cells + '</div></div>';
  }

  function cellHTML(game, r, sp, got){
    var RW = global.Q4BReward;
    var tier = RW.tierOf(sp), tierName = RW.TIERNAME[tier] || "";
    var name = got ? esc(sp.jaName) : "？？？";
    var id = jsStr(r.id);
    var art = artHTML(sp, false);
    var click = 'Q4BBossZukan.detail(\'' + id + '\')';
    if(game === "kanji"){
      return '<button type="button" class="bug' + (got ? '' : ' no') + '" onclick="' + click + '"'
        + ' style="width:100%;font:inherit;cursor:pointer;appearance:none;-webkit-appearance:none">'
        + (got ? art : '<div style="font-size:44px;line-height:64px">❓</div>')
        + '<div class="nm">' + name + (got ? '👑' : '') + '</div>'
        + '<div class="rar">' + tierName + '</div>'
        + '<div style="font-size:10px;color:#888">' + (r.hp ? 'HP' + r.hp : 'ボス') + '</div>'
        + '</button>';
    }
    if(game === "eitango"){
      return '<button type="button" class="zc' + (got ? '' : ' un') + '" style="--rc:var(--rar' + tier + ')" onclick="' + click + '">'
        + '<span class="ze" style="width:64px;height:64px;margin:0 auto;display:block">' + art + '</span>'
        + '<span class="zn">' + name + (got ? '👑' : '') + '</span>'
        + '<span class="zs">' + (got && r.hp ? 'HP' + r.hp + ' ' : '') + tierName + '</span>'
        + '</button>';
    }
    return '<button type="button" class="zc r' + tier + '" onclick="' + click + '"'
      + (got ? '' : ' style="opacity:.55"')
      + '><div class="bs' + (got ? '' : ' sil') + '">' + art + '</div>'
      + '<div class="nm">' + name + (got ? '👑' : '') + '</div>'
      + '</button>';
  }

  /* Boss detail modal. Reuse each game's modal shell when available. */
  function detail(id){
    var B = global.Q4BBattle, RW = global.Q4BReward, R = global.Q4BRender, byId = byIdMap();
    var sp = byId[id]; if(!sp || !RW || !R) return;
    var TYPE_JA = { kanji:"かんじ", keisan:"けいさん", eitango:"えいご", none:"むぞくせい" };
    var r = null; if(B && B.roster) B.roster.forEach(function(x){ if(x.id === id) r = x; });
    var got = !!BOSSES[id], n = ((BOSSES[id]) || {}).n || 0;
    var tier = RW.tierOf(sp), tname = RW.TIERNAME[tier];
    var g = RW.gameFor(sp), hp = r ? r.hp : (B && B.bugHP ? B.bugHP(sp.rarity) : "");
    var fam = [sp.familyJa, sp.groupJa].filter(Boolean).join(' / ');
    var inner;
    if(!got){
      inner = '<div class="center"><div style="width:140px;height:140px;margin:0 auto;filter:brightness(0) opacity(.32)">' + artHTML(sp, false) + '</div>'
        + '<h3>？？？</h3><p style="color:#777;font-size:13px">まだ たおしていない…<br>ずかんバトルで かちにいこう！</p>'
        + badgeHTML(TYPE_JA[g], "#777") + ' ' + badgeHTML(tname, "#bbb")
        + (hp ? '<span style="margin-left:6px;color:#777;font-size:13px">HP' + hp + '</span>' : '')
        + '<div style="margin-top:14px"><button class="btn sub" onclick="Q4BBossZukan.closeDetail()">とじる</button></div></div>';
    }else{
      var sz = RW.sizeRange(sp);
      inner = '<div class="center"><div style="width:140px;height:140px;margin:0 auto">' + artHTML(sp, false) + '</div>'
        + '<h3>👑 ' + esc(sp.jaName) + '</h3>'
        + '<p>' + badgeHTML(TYPE_JA[g], "#5b7") + ' ' + badgeHTML(tname, "#E8B33C")
        + (hp ? ' HP' + hp : '') + (n ? '　たおした ×' + n : '') + '</p>'
        + '<p style="font-size:13px;color:#777">おおきさ ' + sz[0] + '〜' + sz[1] + 'mm</p>'
        + (sp.scientificName ? '<p style="font-size:12px;color:#999"><i>' + esc(sp.scientificName) + '</i></p>' : "")
        + (fam ? '<p style="font-size:12px;color:#999">' + esc(fam) + '</p>' : "")
        + (sp.caution ? '<p style="background:#FFF1DE;border-radius:12px;padding:8px;font-size:13px;color:#c98f1e;font-weight:800">' + esc(sp.caution) + '</p>' : "")
        + (sp.note ? '<p style="background:#eef6e0;border-radius:12px;padding:10px;font-size:14px">' + esc(sp.note) + '</p>' : "")
        + '<div style="margin-top:14px"><button class="btn sub" onclick="Q4BBossZukan.closeDetail()">とじる</button></div></div>';
    }
    showDetail(detailCardHTML(inner));
  }

  var activeDetail = null;
  function showDetail(inner){
    closeDetail();
    var doc = global.document;
    var kanjiModalInner = doc.getElementById("modalIn");
    if(kanjiModalInner && typeof global.modal === "function"){
      activeDetail = "kanji";
      global.modal(inner);
      return;
    }
    var existing = doc.getElementById("modal");
    if(existing && !kanjiModalInner){
      activeDetail = "existing";
      existing.innerHTML = '<div class="mcard">' + inner + '</div>';
      existing.classList.add("show");
      return;
    }
    var ov = document.createElement("div"); ov.id = "bossZukanOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.onclick = function(e){ if(e.target === ov) closeDetail(); };
    ov.innerHTML = '<div class="mcard" style="background:#fff;border-radius:18px;padding:20px;max-width:360px;width:100%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.3);max-height:86vh;overflow:auto">' + inner + '</div>';
    doc.body.appendChild(ov);
    activeDetail = "own";
  }
  function closeDetail(){
    var o = document.getElementById("bossZukanOv"); if(o) o.parentNode.removeChild(o);
    if(activeDetail === "kanji" && typeof global.closeModal === "function") global.closeModal();
    if(activeDetail === "existing"){
      var m = document.getElementById("modal");
      if(m){ m.classList.remove("show"); m.innerHTML = ""; }
    }
    activeDetail = null;
  }

  function artHTML(sp, shiny){ return global.Q4BReward && global.Q4BReward.svg ? global.Q4BReward.svg(sp, shiny) : global.Q4BRender.species(sp, shiny); }
  function badgeHTML(text, color){ return '<span style="background:' + color + ';color:#fff;border-radius:8px;padding:2px 8px;font-size:12px;font-weight:800">' + esc(text) + '</span>'; }
  function detailCardHTML(inner){ return '<div style="background:#FFFDF4;color:#2A3D2C;border-radius:18px;padding:6px 4px;text-align:center">' + inner + '</div>'; }

  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function jsStr(s){ return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

  global.Q4BBossZukan = { load:load, ready:ready, sectionHTML:sectionHTML, bossesFor:bossesFor, detail:detail, closeDetail:closeDetail };
})(window);
