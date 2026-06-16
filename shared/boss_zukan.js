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

  /* 図鑑に差し込むセクション HTML（class="card" でゲームのテーマを継承） */
  function sectionHTML(game){
    var RW = global.Q4BReward, R = global.Q4BRender, byId = byIdMap();
    if(!RW || !R) return "";
    var list = bossesFor(game);
    if(!list.length) return "";
    var got = list.filter(function(r){ return BOSSES[r.id]; }).length;
    var cells = list.map(function(r){
      var sp = byId[r.id], c = !!BOSSES[r.id];
      var art = c ? R.deco(sp, 0)
                  : '<div style="width:58px;height:58px;filter:brightness(0) opacity(.32)">' + R.deco(sp, 0) + '</div>';
      var nm = c ? esc(sp.jaName) : "？？？";
      return '<div style="width:58px;text-align:center;cursor:pointer" onclick="Q4BBossZukan.detail(\'' + r.id + '\')">'
        + '<div style="width:58px;height:58px">' + art + '</div>'
        + '<div style="font-size:9px;line-height:1.1;height:24px;overflow:hidden;margin-top:2px">' + nm + '</div></div>';
    }).join("");
    return '<div class="card"><h3>👑 ボス昆虫　<span style="color:#E8B33C">' + got + ' / ' + list.length + '</span></h3>'
      + '<p style="margin:2px 0 8px;font-size:13px;color:#888">ずかんバトルで たおすと あらわれる 強いボス</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px">' + cells + '</div></div>';
  }

  /* クリック詳細（自己完結オーバーレイ。どのゲームでも動く） */
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
      inner = '<div style="width:140px;height:140px;margin:0 auto;filter:brightness(0) opacity(.32)">' + R.species(sp, false) + '</div>'
        + '<h3>？？？</h3><p style="color:#777;font-size:13px">まだ たおしていない…<br>ずかんバトルで かちにいこう！</p>'
        + '<p><span style="background:#777;color:#fff;border-radius:8px;padding:2px 8px;font-size:12px">' + TYPE_JA[g] + '</span> '
        + '<span style="background:#bbb;color:#fff;border-radius:8px;padding:2px 8px;font-size:12px">' + tname + '</span>'
        + (hp ? ' HP' + hp : '') + '</p>';
    }else{
      var sz = RW.sizeRange(sp);
      inner = '<div style="width:140px;height:140px;margin:0 auto">' + R.species(sp, false) + '</div>'
        + '<h3>👑 ' + esc(sp.jaName) + '</h3>'
        + '<p><span style="background:#5b7;color:#fff;border-radius:8px;padding:2px 8px;font-size:12px">' + TYPE_JA[g] + '</span> '
        + '<span style="background:#E8B33C;color:#fff;border-radius:8px;padding:2px 8px;font-size:12px">' + tname + '</span>'
        + (hp ? ' HP' + hp : '') + (n ? '　たおした ×' + n : '') + '</p>'
        + '<p style="font-size:13px;color:#777">おおきさ ' + sz[0] + '〜' + sz[1] + 'mm</p>'
        + (sp.scientificName ? '<p style="font-size:12px;color:#999"><i>' + esc(sp.scientificName) + '</i></p>' : "")
        + (fam ? '<p style="font-size:12px;color:#999">' + esc(fam) + '</p>' : "")
        + (sp.caution ? '<p style="background:#FFF1DE;border-radius:12px;padding:8px;font-size:13px;color:#c98f1e;font-weight:800">' + esc(sp.caution) + '</p>' : "")
        + (sp.note ? '<p style="background:#eef6e0;border-radius:12px;padding:10px;font-size:14px">' + esc(sp.note) + '</p>' : "");
    }
    var ov = document.createElement("div"); ov.id = "bossZukanOv";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.onclick = function(e){ if(e.target === ov) closeDetail(); };
    ov.innerHTML = '<div style="background:#fff;border-radius:18px;padding:20px;max-width:320px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.3);max-height:86vh;overflow:auto">' + inner
      + '<div style="margin-top:14px"><button onclick="Q4BBossZukan.closeDetail()" style="border:none;background:#eee;border-radius:10px;padding:8px 18px;font-size:15px;font-weight:700;cursor:pointer">とじる</button></div></div>';
    document.body.appendChild(ov);
  }
  function closeDetail(){ var o = document.getElementById("bossZukanOv"); if(o) o.parentNode.removeChild(o); }

  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  global.Q4BBossZukan = { load:load, ready:ready, sectionHTML:sectionHTML, bossesFor:bossesFor, detail:detail, closeDetail:closeDetail };
})(window);
