(function(global){
  "use strict";

  /* かがやきのうろ (tools_design 4 章)。メダルは取得した瞬間に捧げ、その場で道具を
     1 つ授かる。財布も残高も作らない (不変条件 4: 残高ゼロ)。うろが持つのは
     append-only の奉納ログだけで、そこから導出できないものは持たない。

     このモジュールは DOM に触らない。HTML の文字列を組み立てるところまでを持ち、
     結線と描画は app.js が行う (画面の入口が 1 か所であることを崩さないため)。 */

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}

  function escapeHtml(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  /* 道具の顔。アイコン (shared/tool_icons.js) があればそれを使い、
     読み込んでいない文脈では tools.js の絵文字へ倒す。交換画面・どうぐばこ・
     図鑑・ほうのうの記録で同じ 1 本を通す。 */
  function toolFace(toolId,emoji){
    var icons=global.Q4B_TOOL_ICONS;
    var art=icons&&typeof icons.svg==="function"?icons.svg(toolId):"";
    return art||emoji||"🔧";
  }

  /* 奉納ログは記録であって残高ではない。壊れた形を黙って通すと、周回の星が
     数えられなくなる (獲得の記録は不滅、という約束が守れない)。 */
  function validateLog(log){
    if(!Array.isArray(log))throw new Error("奉納データの形式が正しくありません");
    log.forEach(function(entry){
      if(!isObject(entry))throw new Error("奉納データの形式が正しくありません");
      if(typeof entry.cat!=="string"||!entry.cat)throw new Error("奉納データの形式が正しくありません");
      if(typeof entry.speciesId!=="string"||!entry.speciesId)throw new Error("奉納データの形式が正しくありません");
      if(!Number.isInteger(entry.lap)||entry.lap<1)throw new Error("奉納データの形式が正しくありません");
      if(typeof entry.date!=="string"||!entry.date)throw new Error("奉納データの形式が正しくありません");
      if(typeof entry.tool!=="string"||!entry.tool)throw new Error("奉納データの形式が正しくありません");
    });
    return log;
  }

  function entries(profile){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    if(!Array.isArray(profile.uroLog))profile.uroLog=[];
    return profile.uroLog;
  }

  function offeredCount(profile,cat){
    return entries(profile).filter(function(entry){return entry.cat===cat;}).length;
  }

  /* まだ捧げていないメダル。移行措置もこれ 1 本で足りる: うろを作る前に成立していた
     旧トロフィーは「獲得済みだが奉納記録が無いメダル」として、そのままここに並ぶ。
     medals は成立順に並んだ獲得済みメダル ({cat, speciesId, ...})。 */
  function pending(profile,medals){
    if(!Array.isArray(medals))throw new Error("メダルの一覧が正しくありません");
    var used={},result=[];
    entries(profile).forEach(function(entry){used[entry.cat]=(used[entry.cat]||0)+1;});
    medals.forEach(function(medal){
      var left=used[medal.cat]||0;
      if(left>0){used[medal.cat]=left-1;return;}
      result.push(medal);
    });
    return result;
  }

  /* 奉納。冪等性はここで閉じる: 同じメダルを 2 度捧げようとしても、2 度目は
     pending に居ないので null を返して何も書かない。 */
  function redeem(profile,medals,medal,toolId,today){
    if(!isObject(medal)||typeof medal.cat!=="string")throw new Error("メダルの指定が正しくありません");
    if(typeof toolId!=="string"||!toolId)throw new Error("道具の指定が正しくありません");
    if(typeof today!=="string"||!today)throw new Error("奉納日の指定が正しくありません");
    var waiting=pending(profile,medals);
    var found=waiting.filter(function(item){return item.cat===medal.cat;})[0];
    if(!found)return null;
    /* 星の数は鋳造された周回そのもの。2 周目の 2 枚はどちらも ★★ になる
       (周回は星で重なる)。周回を持たないメダル (移行分・旧テスト) では
       これまで通り奉納の順番で数える。 */
    var lap=Number.isInteger(found.lap)&&found.lap>0?found.lap:offeredCount(profile,found.cat)+1;
    var entry={cat:found.cat,speciesId:found.speciesId,lap:lap,date:today,tool:toolId};
    entries(profile).push(entry);
    return entry;
  }

  /* 奉納数に連動する輝き。段階もレベル表示も作らず、0 から 1 へ連続で寄せるだけ。
     頭打ちにしておくと、10 枚目でも 30 枚目でも「まぶしすぎる」にはならない。 */
  function glow(profile){
    var count=entries(profile).length;
    return {count:count,value:Math.round((1-Math.pow(0.8,count))*1000)/1000};
  }

  /* 輝きは CSS 変数 1 本で渡す。段階クラスを作ると「レベルが上がった」に見えて、
     連続変化という決定 (design 4 章) が崩れる。強さ (うろの中の あかり) と 範囲
     (まわりへ にじむ ひかりと 光の粒) は、どちらも同じ 1 本から CSS 側で導く。
     変数を 2 本に割ると、片方だけ動いている状態が作れてしまう。

     class は掛かり口としてだけ置く。何枚捧げたかは style の数値にしか現れない。 */
  function hollowHtml(state,extraClass){
    return '<div class="uro-hollow'+(extraClass?" "+extraClass:"")+'" style="--uro-glow:'+state.value+'" aria-hidden="true">'
      +'<svg viewBox="0 0 120 120">'
      +'<ellipse class="uro-halo" cx="60" cy="64" rx="54" ry="58"></ellipse>'
      +'<path class="uro-bark" d="M14 6 C34 2 86 2 106 6 L112 114 L8 114 Z"></path>'
      +'<ellipse class="uro-mouth" cx="60" cy="64" rx="30" ry="38"></ellipse>'
      +'<ellipse class="uro-light" cx="60" cy="64" rx="26" ry="34"></ellipse>'
      /* 光の粒は うろの口より上に置く。中に描くと あかりに溶けて見えないので、
         「あふれて のぼっていく」ぶんだけを外へ出す。 */
      +'<g class="uro-motes">'
      +'<circle class="uro-mote uro-mote-a" cx="50" cy="20" r="2.4"></circle>'
      +'<circle class="uro-mote uro-mote-b" cx="70" cy="14" r="1.8"></circle>'
      +'<circle class="uro-mote uro-mote-c" cx="60" cy="3" r="2.1"></circle>'
      +'<circle class="uro-mote uro-mote-b" cx="78" cy="24" r="1.6"></circle>'
      +'<circle class="uro-mote uro-mote-a" cx="42" cy="9" r="1.5"></circle>'
      +'</g></svg></div>';
  }

  function toolPickHtml(tool,text,disabled){
    var note=disabled?'<span class="uro-pick-out">'+text("この えんせいでは でばんが ないよ")+'</span>':'<span class="uro-pick-guild">'+text(tool.guild)+'</span>';
    return '<li><button type="button" class="uro-pick" data-tool="'+escapeHtml(tool.id)+'"'+(disabled?' disabled aria-disabled="true"':'')+'>'
      +'<span class="uro-pick-face">'+toolFace(tool.id,tool.emoji)+'</span>'
      +'<span class="uro-pick-body"><span class="uro-pick-name">'+text(tool.name)+'</span>'
      +note
      +'<span class="uro-pick-blurb">'+text(tool.blurb)+'</span></span></button></li>';
  }

  /* 鋳造成立の瞬間に出す即時交換。メダルを持ち歩く画面は作らない。
     2 周目以降は 1 度の鋳造で 2 枚出るので、いま何枚目かを添える (total > 1 のとき
     だけ)。枚数が見えないと、1 枚選んだ直後にまた同じ画面が出てくることになる。 */
  function exchangeHtml(opts){
    var text=opts.text,tools=opts.tools||[];
    var picks=tools.map(function(tool){return toolPickHtml(tool,text,tool.targets===0);}).join("")
      ||'<li class="uro-pick-empty">'+text("いま えらべる どうぐは ないよ")+'</li>';
    var total=Number.isInteger(opts.total)?opts.total:1,index=Number.isInteger(opts.index)?opts.index:1;
    var counter=total>1?'<p class="uro-mint-count">'+text(total+"まいの うち "+index+"まいめ")+'</p>':"";
    return '<div class="uro-exchange">'
      +'<p class="uro-mint">🏅 '+text(opts.medalName+"を かくとく!")+'</p>'
      +counter
      +'<p class="uro-mint-note">'+text("かがやきのうろに ささげて、どうぐを ひとつ もらおう")+'</p>'
      +'<ul class="uro-picks">'+picks+'</ul>'
      +'<p class="uro-hint">'+text("見たことない虫に であいやすくなりそうだ…!")+'</p></div>';
  }

  /* 入口の札にも同じ変数を通す。うろの中に入らないと明るさが分からないのでは、
     「捧げるほど うろが 輝く」が地図の上では 1 度も見えないことになる。 */
  function entranceHtml(opts){
    var text=opts.text,waiting=opts.pending||0;
    var state=isObject(opts.glow)?opts.glow:{count:opts.count||0,value:0};
    return '<div class="kom-trophy-entrance"><button type="button" class="kom-trophy-open uro-open"'
      +' data-action="uro" style="--uro-glow:'+state.value+'">'
      +'✨ <span>'+text("かがやきのうろ")+'</span> <strong>'+(state.count||0)+'</strong>'
      +(waiting?'<span class="uro-waiting">'+text("ささげる メダル "+waiting)+'</span>':"")+'</button></div>';
  }

  /* メダルは鋳造した瞬間に交換する (残高を作らない) ので、ここが埋まるのは 3 つの
     ときだけ: 公開前にたまっていたぶん、交換で「あとにする」を選んだぶん、2 周目
     以降の 2 枚目。見出しだけでは「なぜ待っているのか」が伝わらないので 1 行そえる。 */
  function pendingSectionHtml(opts){
    var text=opts.text,waiting=opts.pending||[];
    if(!waiting.length)return "";
    return '<section class="uro-pending"><h2>'+text("まだ どうぐに かえていない メダル")+'</h2>'
      +'<p class="uro-pending-why">'+text("メダルは とった ときに どうぐと かえるよ。これは まだ かえていない ぶん。")+'</p>'
      +'<ul class="uro-pending-list">'+waiting.map(function(medal){
        return '<li><button type="button" class="uro-offer" data-cat="'+escapeHtml(medal.cat)+'">'
          +'🏅 <span>'+text(medal.name)+'</span><span class="uro-offer-go">'+text("ささげる")+'</span></button></li>';
      }).join("")+'</ul></section>';
  }

  function boxSectionHtml(opts){
    var text=opts.text,owned=opts.owned||[];
    var rows=owned.map(function(item){
      /* 装備は種類で 1 枠、実際に減るのはその種類の先頭 1 本。2 本目以降は予備なので、
         押しても何も起きないボタンではなく「よび」とだけ書く。 */
      var sameKind=item.type===opts.equippedToolId,active=sameKind&&item.first;
      var action=active
        ?'<button type="button" class="uro-unequip" data-action="uro-unequip">'+text("はずす")+'</button>'
        :sameKind
          ?'<span class="uro-box-spare">'+text("よび")+'</span>'
          :'<button type="button" class="uro-equip" data-tool="'+escapeHtml(item.type)+'">'+text("そうびする")+'</button>';
      return '<li class="uro-box-row'+(active?" is-equipped":"")+'">'
        +'<span class="uro-box-face">'+toolFace(item.type,item.emoji)+'</span>'
        +'<span class="uro-box-name">'+text(item.name)+'</span>'
        +'<span class="uro-box-left">'+item.remaining+'／'+opts.durability+'</span>'
        +action+'</li>';
    }).join("")||'<li class="uro-box-empty">'+text("まだ どうぐを もっていないよ")+'</li>';
    return '<section class="uro-box"><h2>'+text("どうぐばこ")+'</h2><ul class="uro-box-list">'+rows+'</ul></section>';
  }

  /* 道具図鑑 (design 6 章)。初めて授かった日だけを並べる。未公開の枠も 🔒 のまま
     数だけ出す: ゴールが何個かが見えないと「11 種すべて」が目標にならない。
     どうぐばこ (いま何本あるか) とは別の台帳で、壊れてもここからは消えない。 */
  function dexSectionHtml(opts){
    var text=opts.text,dex=opts.dex||[];
    if(!dex.length)return "";
    var got=dex.filter(function(item){return item.at;}).length;
    var cells=dex.map(function(item){
      if(item.locked)return '<li class="uro-dex-slot is-locked"><span class="uro-dex-face">🔒</span>'
        +'<span class="uro-dex-name">'+text("？？？")+'</span></li>';
      if(!item.at)return '<li class="uro-dex-slot is-empty"><span class="uro-dex-face">'+toolFace(item.id,item.emoji)+'</span>'
        +'<span class="uro-dex-name">'+text(item.name)+'</span>'
        +'<span class="uro-dex-at">'+text("まだ")+'</span></li>';
      return '<li class="uro-dex-slot is-got"><span class="uro-dex-face">'+toolFace(item.id,item.emoji)+'</span>'
        +'<span class="uro-dex-name">'+text(item.name)+'</span>'
        +'<span class="uro-dex-at">'+escapeHtml(item.at)+'</span></li>';
    }).join("");
    return '<section class="uro-dex"><h2>'+text("どうぐ ずかん")+'　<strong>'+got+'／'+dex.length+'</strong></h2>'
      +'<ul class="uro-dex-list">'+cells+'</ul></section>';
  }

  function logSectionHtml(opts){
    var text=opts.text,log=opts.entries||[];
    if(!log.length)return '<section class="uro-log"><h2>'+text("ほうのうの きろく")+'</h2>'
      +'<p class="uro-log-empty">'+text("メダルを ささげると、ここに きろくが のこるよ")+'</p></section>';
    var rows=log.map(function(entry){
      var stars="";
      for(var i=0;i<entry.lap;i++)stars+="★";
      return '<li class="uro-log-row"><span class="uro-log-name">🏅 '+text(entry.name)+'</span>'
        +'<span class="uro-log-cat">'+text(entry.catName)+'</span>'
        +'<span class="uro-log-lap" aria-label="'+escapeHtml(entry.lap+"しゅうめ")+'">'+stars+'</span>'
        +'<span class="uro-log-tool">'+toolFace(entry.toolId,entry.toolEmoji)+' '+text(entry.toolName)+'</span>'
        +'<span class="uro-log-date">'+escapeHtml(entry.date)+'</span></li>';
    }).join("");
    return '<section class="uro-log"><h2>'+text("ほうのうの きろく")+'</h2><ul class="uro-log-list">'+rows+'</ul></section>';
  }

  function pageHtml(opts){
    var text=opts.text,state=opts.glow;
    return '<div class="kom-title"><h1>'+text("かがやきのうろ")+'</h1>'
      +'<p>'+text("ささげた メダル")+'　<strong>'+state.count+'</strong></p></div>'
      +hollowHtml(state)
      +pendingSectionHtml(opts)
      +boxSectionHtml(opts)
      +dexSectionHtml(opts)
      +logSectionHtml(opts);
  }

  global.Q4B_KOMOREBI_URO={
    hollowHtml:hollowHtml,
    validateLog:validateLog,
    entries:entries,
    offeredCount:offeredCount,
    pending:pending,
    redeem:redeem,
    glow:glow,
    entranceHtml:entranceHtml,
    exchangeHtml:exchangeHtml,
    pageHtml:pageHtml
  };
})(typeof window!=="undefined"?window:globalThis);
