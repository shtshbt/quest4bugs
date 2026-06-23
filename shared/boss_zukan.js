/* boss_zukan.js — 各ゲーム図鑑にボス昆虫セクションを表示する共有モジュール。
   ボス撃破データは battle 名前空間（QuestSave.load("battle", profileId)）に保存されているため、
   ゲーム側から横断的に読み込んでセクション化する。battle.js（roster）と render/reward が前提。 */
(function(global){
  "use strict";
  var BOSSES = {};      /* 現在プロフィールの撃破マップ {speciesId:{n}} */
  var loaded = false;
  /* ボス節の折りたたみ状態を localStorage に永続化 (デフォルト open) */
  var PANEL_LS_KEY = "q4b_boss_panel_open";
  function _loadPanelOpen(){
    try{
      var s = global.localStorage && localStorage.getItem(PANEL_LS_KEY);
      return s ? JSON.parse(s) : {};
    }catch(_){ return {}; }
  }
  function _savePanelOpen(state){
    try{ if(global.localStorage) localStorage.setItem(PANEL_LS_KEY, JSON.stringify(state)); }catch(_){}
  }
  var PANEL_OPEN = _loadPanelOpen();

  /* バトルセーブから撃破ボスを読み込む（図鑑表示前に await する）。
     legacy: 旧版で coll.catches[boss_id] にしか書かれていない撃破履歴を
     bt.bosses に load-time backfill する (battle.html を経由しなくても
     教科側のボスセクションで表示される)。 */
  /* Q1: プロフィール間データ汚染を遮断するための「想定 profileId」 と完了時の整合
     チェック。 load 完了時に現在の QuestSave.currentProfile() と一致しなければ、
     卵授与系の副作用 (bossesBackfill / 関連 save) をスキップする。 */
  function _stillCurrent(profileId){
    try{
      var cur = global.QuestSave && global.QuestSave.currentProfile && global.QuestSave.currentProfile();
      return !cur || cur === profileId;
    }catch(_){ return true; }
  }
  function load(profileId){
    if(!global.QuestSave || !profileId){ BOSSES = {}; loaded = true; return Promise.resolve(); }
    return Promise.all([
      global.QuestSave.load("battle",   profileId),
      global.QuestSave.load("keisan",   profileId),
      global.QuestSave.load("kanji",    profileId),
      global.QuestSave.load("eitango",  profileId)
    ]).then(function(rs){
      var bt = rs[0] || {};
      bt.bosses = bt.bosses || {};
      var keisanProf = rs[1] || {};
      var kanjiProf  = rs[2] || {};
      var eitangoProf = rs[3] || {};
      var colls = {
        keisan:  keisanProf.coll || null,
        kanji:   kanjiProf.coll || null,
        eitango: eitangoProf.catches ? {catches: eitangoProf.catches, total: eitangoProf.total||0} : null
      };
      /* migration (bosses→catches): BATTLE.bosses に records ありで教科 coll.catches に
         未登録のボスを補完 (一般図鑑カードに出るように) */
      var collTouched = backfillCatchesFromBosses(bt.bosses, colls);
      if(collTouched.keisan && colls.keisan){ keisanProf.coll = colls.keisan;
        try{ global.QuestSave.save("keisan", profileId, keisanProf); }catch(_){} }
      if(collTouched.kanji && colls.kanji){ kanjiProf.coll = colls.kanji;
        try{ global.QuestSave.save("kanji", profileId, kanjiProf); }catch(_){} }
      if(collTouched.eitango && colls.eitango){
        eitangoProf.catches = colls.eitango.catches;
        eitangoProf.total = colls.eitango.total;
        try{ global.QuestSave.save("eitango", profileId, eitangoProf); }catch(_){}
      }
      /* T1: 「eggGranted=true なのに在庫にない」 を「授与失敗」 と誤認する旧
         migration は廃止。 孵化済み卵は当然在庫から消えるため、 ボス卵を孵化させた
         直後にポータルを開くと毎回新しい卵が再支給される無限ループになっていた。
         eggGranted は「過去に一度授与した」 という永続履歴とし、 一度 true に
         なったら false に戻さない。 過去の取り残しユーザの救済は 既に v100 周辺で
         済んでいる前提。 万一の取り残しは bossesBackfill が n>=10 でしか払わない
         ので無限再支給は起きない。 */
      /* Q1: load が走っている間に別プロフィールに切り替わったら、 副作用 (相方卵
         授与) はスキップして BOSSES だけ復元しない。 BOSSES も上書きしないで終了。 */
      if(!_stillCurrent(profileId)){
        loaded = true;
        return;
      }
      var res = bossesBackfill(bt.bosses, colls);
      if(res.changed && global.QuestSave.save){
        try{ global.QuestSave.save("battle", profileId, bt); }catch(_){}
      }
      BOSSES = bt.bosses; loaded = true;
      /* legacy 救済で相方卵が新規授与された場合は toast 表示 (子供向け feedback) */
      if(res.granted && res.granted.length && global.Q4BBreeding && global.Q4BBreeding.notifyMasterEggGranted){
        var n = res.granted.length;
        global.Q4BBreeding.notifyMasterEggGranted(
          {jaName: 'ボス昆虫 ' + n + '匹'},
          {batch:true, queued:false}
        );
      }
    }).catch(function(){ BOSSES = {}; loaded = true; });
  }
  /* migration: 撃破履歴のあるボス (be.n>=1) が教科 coll.catches に未登録なら 1 個体を
     補完して一般図鑑カードを表示可能に。be.records[0] があればそれを使い、無ければ
     be.firstSex + be.max から擬似 record を作る (legacy ユーザ救済)。
     in-place で coll.catches を変更し、変更があった game の名前を返す。 */
  function backfillCatchesFromBosses(bossesMap, collsByGame){
    var B = global.Q4BBattle, RW = global.Q4BReward;
    if(!B || !B.roster || !RW || !RW.gameFor || !RW.record) return {};
    var byId = byIdMap();
    var touched = {};
    B.roster.forEach(function(r){
      if(r.predator || !r.id || !byId[r.id]) return;
      var be = bossesMap[r.id];
      if(!be || (be.n||0) === 0) return;
      var sp = byId[r.id];
      var game = RW.gameFor(sp);
      var coll = collsByGame[game];
      if(!coll) return;
      if(!coll.catches) coll.catches = {};
      if(coll.catches[r.id]) return;
      /* records[0] があれば優先、無ければ firstSex + max から擬似 record を生成 */
      var sex, size, shiny;
      if(be.records && be.records.length > 0){
        var rec0 = be.records[0];
        sex = rec0.sex; size = rec0.s; shiny = !!rec0.shiny;
      } else {
        sex = (be.firstSex === "m" || be.firstSex === "f") ? be.firstSex : (RW.rollSex ? RW.rollSex(sp) : "u");
        size = (be.max != null) ? be.max : (RW.rollSize ? RW.rollSize(sp, sex) : (RW.sizeRange ? RW.sizeRange(sp)[1] : 0));
        shiny = !!be.shiny;
      }
      RW.record(coll, sp, {sex:sex, size:size, shiny:shiny, reared:false});
      touched[game] = true;
    });
    return touched;
  }

  /* coll.catches[boss_id] が存在しているのに bt.bosses[id] が未登録 (または records 等が
     欠落している) ボスに対し、in-place で補完する。既存値があれば尊重 (max 比較)。 */
  function bossesBackfill(bossesMap, collsByGame){
    var B = global.Q4BBattle, RW = global.Q4BReward;
    if(!B || !B.roster || !RW || !RW.gameFor) return {changed:false, granted:[]};
    var byId = byIdMap();
    var changed = false;
    var granted = [];  /* legacy 救済で相方卵を授与したボス [{sp, sex, egg, queued}, ...] */
    B.roster.forEach(function(r){
      if(r.predator || !r.id || !byId[r.id]) return;
      var sp = byId[r.id];
      var game = RW.gameFor(sp);
      var coll = collsByGame[game];
      var cat = (coll && coll.catches) ? coll.catches[r.id] : null;
      var be = bossesMap[r.id];
      /* 撃破経験なし (両側に entry なし) はスキップ */
      if(!be && !cat) return;
      if(!be){ bossesMap[r.id] = be = {n:0}; changed = true; }
      /* coll.catches から n を取り込み (新版データは BATTLE.bosses 側にしか入っていない) */
      if(cat && typeof cat.n === "number" && cat.n > (be.n||0)){ be.n = cat.n; changed = true; }
      /* firstSex: records[0].sex 採用 → 不明なら rollSex で自動確定 */
      if(!be.firstSex){
        var rec0 = cat && cat.records && cat.records[0];
        if(rec0 && (rec0.sex === "m" || rec0.sex === "f")){
          be.firstSex = rec0.sex; changed = true;
        } else if(RW.rollSex){
          be.firstSex = RW.rollSex(sp); changed = true;
        }
      }
      /* coll.catches 側に records / max / min / shiny がある場合のみ補完 */
      if(cat){
        if(!be.records && cat.records){ be.records = cat.records.slice(); changed = true; }
        if(be.max == null && cat.max != null){ be.max = cat.max; changed = true; }
        if(be.min == null && cat.min != null){ be.min = cat.min; changed = true; }
        if(be.shiny == null && cat.shiny != null){ be.shiny = cat.shiny; changed = true; }
      }
      /* T1: 相方卵の本来仕様は「10 回撃破で反対性別の卵」。 旧版は n>=1 で
         救済発動し、 T1 修正前の eggGranted false 戻しと組み合わせて無限再支給に
         なっていた。 ここを n>=10 に統一して仕様と一致させる。 別 awardBossEgg
         path も同条件のはず。 */
      if(!be.eggGranted && (be.n||0) >= 10 && be.firstSex && RW.awardBossEgg){
        var opp = be.firstSex === "m" ? "f" : "m";
        var egg = RW.awardBossEgg(null, sp, opp, {forceQueue:true});  /* legacy 救済は pendingEggs に */
        if(egg){
          be.eggGranted = true; changed = true;
          granted.push({sp: sp, sex: opp, egg: egg, queued: !!egg.queuedAt});
        } else {
          /* null = awardEgg 内 dedup (同 id+origin が既存) または metamorphosis 無し。
             既存があるなら実質授与済みなので eggGranted=true 化、無いなら次回 retry */
          var bs2 = RW.getBreedingState ? RW.getBreedingState() : null;
          var hasExisting = bs2 && (
            (bs2.eggs||[]).some(function(e){return e.id===sp.id && e.origin==='boss_pair';})
            || (bs2.pendingEggs||[]).some(function(e){return e.id===sp.id && e.origin==='boss_pair';})
          );
          if(hasExisting){ be.eggGranted = true; changed = true; }
        }
      }
    });
    return {changed: changed, granted: granted};
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
    /* 折りたたみ状態の保持: フィルタ再描画でリセットされないようゲーム別に保存 */
    var panelOpen = PANEL_OPEN[game] !== false;   /* 初回は true */
    var arrow = panelOpen ? "▼" : "▶";
    return '<details class="card"' + (panelOpen ? ' open' : '') + ' style="padding:0;border:2px solid #E8B33C;background:linear-gradient(180deg,rgba(255,247,219,.85) 0%,rgba(255,253,244,.6) 100%)" ontoggle="Q4BBossZukan._panel(\'' + game + '\',this.open)">'
      + '<summary style="list-style:none;cursor:pointer;padding:14px;font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;background:rgba(255,247,219,.5);border-radius:12px 12px 0 0">'
      + '<span style="font-size:22px;color:#CF7F14;display:inline-block;width:22px;text-align:center" class="q4b-toggle-arrow">' + arrow + '</span>'
      + '👑 ボス昆虫 <span style="color:#E8B33C;font-size:14px">' + got + ' / ' + list.length + '</span>'
      + '<span style="margin-left:auto;font-size:11px;color:#CF7F14;font-weight:700">タップで ' + (panelOpen ? "とじる" : "ひらく") + '</span></summary>'
      + '<div style="padding:0 14px 14px"><p style="margin:8px 0;font-size:13px;color:#6B7A5E">ずかんバトルで たおすと あらわれる 強いボス</p>'
      + '<div class="' + gridClass + '">' + cells + '</div></div></details>';
  }

  function cellHTML(game, r, sp, got){
    var RW = global.Q4BReward;
    var tier = RW.tierOf(sp), tierName = RW.TIERNAME[tier] || "";
    var name = got ? esc(sp.jaName) : "？？？";
    var id = jsStr(r.id);
    var rec = BOSSES[r.id] || {}, shiny = got && !!rec.shiny;
    var art = artHTML(sp, shiny);
    var click = 'Q4BBossZukan.detail(\'' + id + '\')';
    /* 体長範囲: 通常種と同じ書式 ("35〜85mm")。未撃破でも種の生物学情報は出して構わない。
       撃破済で個体記録 (rec.max/min) があれば「つかまえた おおきさ」も付加。 */
    var szRange = RW.sizeRange(sp);
    var sizeLabel = (szRange && szRange[1] > szRange[0])
      ? szRange[0] + '〜' + szRange[1] + 'mm'
      : (szRange && szRange[0] ? szRange[0] + 'mm' : '');
    /* 🥚×N バッジ: 育成中 + 待機中の卵数。一般図鑑カードと同じ書式 */
    var eggCnt = (RW.eggsForSpecies ? RW.eggsForSpecies(r.id) : {total:0}).total;
    var eggBadge = eggCnt > 0
      ? '<span style="position:absolute;bottom:2px;right:4px;background:#FFF6E0;border:1px solid #E8B33C;border-radius:99px;font-size:9px;font-weight:800;color:#8A5C2C;padding:0 4px;line-height:1.3;pointer-events:none;z-index:2">🥚×'+eggCnt+'</span>'
      : '';
    if(game === "kanji"){
      return '<button type="button" class="bug' + (got ? '' : ' no') + '" onclick="' + click + '"'
        + ' style="position:relative;width:100%;font:inherit;cursor:pointer;appearance:none;-webkit-appearance:none">'
        + eggBadge
        + (got ? art : '<div style="font-size:44px;line-height:64px">❓</div>')
        + '<div class="nm">' + name + (got ? '👑' : '') + (shiny ? '✨' : '') + '</div>'
        + '<div class="rar">' + tierName + '</div>'
        + '<div style="font-size:10px;color:#888">' + (sizeLabel || 'ボス') + '</div>'
        + '</button>';
    }
    if(game === "eitango"){
      return '<button type="button" class="zc' + (got ? '' : ' un') + '" style="position:relative;--rc:var(--rar' + tier + ')" onclick="' + click + '">'
        + eggBadge
        + '<span class="ze" style="width:64px;height:64px;margin:0 auto;display:block">' + art + '</span>'
        + '<span class="zn">' + name + (got ? '👑' : '') + (shiny ? '✨' : '') + '</span>'
        + '<span class="zs">' + (sizeLabel ? sizeLabel + ' ' : '') + tierName + '</span>'
        + '</button>';
    }
    return '<button type="button" class="zc r' + tier + '" onclick="' + click + '"'
      + (got ? ' style="position:relative"' : ' style="position:relative;opacity:.55"')
      + '>' + eggBadge
      + '<div class="bs' + (got ? '' : ' sil') + '">' + art + '</div>'
      + '<div class="nm">' + name + (got ? '👑' : '') + (shiny ? '✨' : '') + '</div>'
      + '</button>';
  }

  /* Boss detail modal. 撃破済みは Q4BZukan.detailHTML を使って通常図鑑と同じ書式
     (ヒストグラム / ♂♀ 表 / 卵生成 / 標本情報) を表示する。 */
  function detail(id){
    var B = global.Q4BBattle, RW = global.Q4BReward, R = global.Q4BRender, byId = byIdMap();
    var sp = byId[id]; if(!sp || !RW || !R) return;
    var TYPE_JA = { kanji:"かんじ", keisan:"けいさん", eitango:"えいご", none:"むぞくせい" };
    var r = null; if(B && B.roster) B.roster.forEach(function(x){ if(x.id === id) r = x; });
    var got = !!BOSSES[id], rec = (BOSSES[id]) || {}, n = rec.n || 0, shiny = !!rec.shiny;
    var tier = RW.tierOf(sp), tname = RW.TIERNAME[tier];
    var g = RW.gameFor(sp);
    /* 体長範囲 — HP の代わりに使う子供向け生物学情報 */
    var szRange = RW.sizeRange(sp);
    var sizeLabel = (szRange && szRange[1] > szRange[0])
      ? szRange[0] + '〜' + szRange[1] + 'mm'
      : (szRange && szRange[0] ? szRange[0] + 'mm' : '');
    var inner;
    if(!got){
      inner = '<div class="center"><div data-zukan-uncaught="1" style="width:140px;height:140px;margin:0 auto;filter:brightness(0) opacity(.32)">' + artHTML(sp, false) + '</div>'
        + '<h3>？？？</h3><p style="color:#777;font-size:13px">まだ たおしていない…<br>ずかんバトルで かちにいこう！</p>'
        + badgeHTML(TYPE_JA[g], "#777") + ' ' + badgeHTML(tname, "#bbb")
        + (sizeLabel ? '<div style="margin-top:6px;color:#777;font-size:13px">大きさ ' + sizeLabel + '</div>' : '')
        + '<div style="margin-top:14px"><button class="btn sub" onclick="Q4BBossZukan.closeDetail()">とじる</button></div></div>';
    }else{
      /* 撃破済: Q4BZukan.detailHTML 統合で histogram/♂♀表/卵/標本を全部表示 */
      var fam = [sp.familyJa, sp.groupJa].filter(Boolean).join(' / ');
      var head = '<div style="text-align:center;position:relative;padding-bottom:6px">'
        + '<div style="width:120px;height:120px;margin:0 auto">' + artHTML(sp, shiny) + '</div>'
        + '<h3 style="margin:6px 0 2px">👑 ' + esc(sp.jaName) + (shiny ? ' ✨' : '') + '</h3>'
        + '<div style="font-size:12px">' + badgeHTML(TYPE_JA[g], "#5b7") + ' ' + badgeHTML(tname, "#E8B33C")
        + (sizeLabel ? ' <span style="color:#888">' + sizeLabel + '</span>' : '') + (n ? ' <span style="color:#888">たおした ×' + n + '</span>' : '') + '</div>'
        + (sp.scientificName ? '<div style="font-size:12px;color:#999;margin-top:2px"><i>' + esc(sp.scientificName) + '</i></div>' : "")
        + (fam ? '<div style="font-size:12px;color:#999">' + esc(fam) + '</div>' : "")
        + (sp.caution ? '<div style="background:#FFF1DE;border-radius:12px;padding:6px 10px;font-size:13px;color:#c98f1e;font-weight:800;margin:6px 0">' + esc(sp.caution) + '</div>' : "")
        + (sp.note ? '<div style="background:#eef6e0;border-radius:12px;padding:8px 10px;font-size:13px;margin:6px 0;text-align:left">' + esc(sp.note) + '</div>' : "")
        + '</div>';
      /* coll-like wrapper を作って Q4BZukan.detailHTML を呼ぶ。
         BATTLE.bosses[id] が catches[id] と同じ shape (n/max/min/shiny/records) を満たす。 */
      var bossColl = {catches:{}};
      bossColl.catches[id] = rec;
      var detailBody = "";
      if(global.Q4BZukan && global.Q4BZukan.detailHTML){
        detailBody = global.Q4BZukan.detailHTML(rec, sp, {
          coll: bossColl,
          favCallback: "",
          saveFn: function(){},
          onLayEgg: "Q4BBossZukan.layEgg",
          onHatchEgg: "Q4BBossZukan.hatchEgg",
          onAbandonEgg: "Q4BBossZukan.abandonEgg"
        });
      }
      inner = head + detailBody
        + '<div style="margin-top:14px;text-align:center"><button class="btn sub" onclick="Q4BBossZukan.closeDetail()">とじる</button></div>';
    }
    showDetail(detailCardHTML(inner));
  }

  /* ボス専用の卵生成 / 孵化 / 放棄 ハンドラ (detailHTML から呼ばれる) */
  function _saveBattleBosses(){
    /* PROF 取得は battle.html 側にあるので、QuestSave に直接書く。
       現在 active な battle 名前空間に BATTLE 全体を保存する必要があるため、
       ここでは BATTLE.bosses だけは window.BATTLE 参照で更新済み。 */
    if(global.QuestSave && global.QuestSave.currentProfile){
      var pid = global.QuestSave.currentProfile();
      if(pid && global.BATTLE){
        global.QuestSave.load("battle", pid).then(function(bt){
          bt = bt || {};
          bt.bosses = global.BATTLE.bosses;
          global.QuestSave.save("battle", pid, bt);
        });
      }
    }
  }
  function layEgg(spId){
    var RW = global.Q4BReward, byId = byIdMap();
    var sp = byId[spId]; if(!sp || !RW || !global.Q4BBreeding) return;
    var bossColl = {catches:{}}; bossColl.catches[spId] = BOSSES[spId] || {};
    global.Q4BBreeding.openLayConfirm(sp, {onConfirm:function(sp){
      var egg = RW.layEgg(bossColl, sp);
      if(egg){
        closeDetail();
      } else {
        alert("たまごを 産めませんでした (前提未充足)");
      }
    }});
  }
  function hatchEgg(spId){
    var RW = global.Q4BReward;
    if(!RW) return;
    var bossColl = {catches:{}}; bossColl.catches[spId] = BOSSES[spId] || {};
    var r = RW.hatchEgg(bossColl, spId);
    if(!r){ alert("孵化できませんでした"); return; }
    BOSSES[spId] = bossColl.catches[spId];
    _saveBattleBosses();
    closeDetail();
    if(global.Q4BBreeding){
      global.Q4BBreeding.playHatchAnimation({egg:r.egg, sp:r.sp, size:r.size, onClose:function(){}, onViewZukan:function(){}});
    }
  }
  function abandonEgg(spId){
    if(!confirm("この たまごを すてる? (返金なし)")) return;
    if(!confirm("ほんとうに すてる?")) return;
    if(global.Q4BReward && global.Q4BReward.abandonEgg(spId)) closeDetail();
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

  function _panel(game, open){ PANEL_OPEN[game] = !!open; _savePanelOpen(PANEL_OPEN); }
  global.Q4BBossZukan = { load:load, ready:ready, sectionHTML:sectionHTML, bossesFor:bossesFor, detail:detail, closeDetail:closeDetail, _panel:_panel,
    layEgg:layEgg, hatchEgg:hatchEgg, abandonEgg:abandonEgg };
})(window);
