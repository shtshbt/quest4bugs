(function(global){
  "use strict";

  /* 採集道具の共通 UI 部品 (装備パネルと捕獲リザルトの道具行・場面)。komorebi の
     toolWidgetHtml / toolStatusHtml / toolSceneHtml と同じ表示規則を、小道と本編
     3 教科のどこにでも置ける独立部品に切り出したもの。文言は小道で点検済みの
     語彙 (tests/test_komorebi_wording.js) をそのまま使い、1 字も変えない。

     ふりがなはここでは扱わない。画面に出る文字列はすべて呼び出し側が渡す
     text / attrText を通る (keisan は furi5 のルビ、小道は displayText)。この層が
     ふりがなを持つと、コース判定が 2 か所に割れて表示が食い違う。

     見た目は shared/tools.css が自分の地色と枠ごと持つ。置かれる地がクリームでも
     夜の森でも、部品は外の色に依存しない。 */

  function passText(value){return value==null?"":String(value);}

  function textFn(fn){return typeof fn==="function"?fn:passText;}

  /* 属性値に入る id のための最小 escape。文言の escape は text / attrText の側の
     仕事で、ここで重ねると 2 重 escape になる。 */
  function escapeAttr(value){
    return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* 道具の顔。アイコン (shared/tool_icons.js) があればそれを使い、読み込んで
     いない文脈では tools.js の絵文字へ倒す (komorebi の toolFaceHtml と同じ規則)。 */
  /* ひび。道具ごとの絵は作らない (11 種ぶんの破損画を持つと、道具が増えるたびに
     絵が 1 枚要る)。道具の絵の上に線を 1 本走らせるだけで「割れた」は伝わる。
     色は presentation attribute で持たせる: tools.css を読み込んでいない文脈でも
     線が消えない (アイコンが stroke="currentColor" で潰れないのと同じ考え方)。 */
  function crackHtml(){
    return '<svg class="q4b-tool-crack" viewBox="0 0 24 24" aria-hidden="true" fill="none"'
      +' stroke="#B3541E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      +'<path d="M13.4 1.5 L10.2 8.6 L14.6 10.4 L9.4 15.2 L12.2 17.4 L7.6 22.5"/></svg>';
  }

  function faceHtml(tool){
    var icons=global.Q4B_TOOL_ICONS;
    var art=icons&&typeof icons.svg==="function"?icons.svg(tool.id):"";
    return art||tool.emoji||"🔧";
  }

  /* その場所でその道具が働かないか。プールを渡されていない文脈では常に false
     (分からないことを理由に道具を取り上げない)。判定そのものは tools.worksIn の
     1 本だけが持ち、ここは呼ぶだけ。 */
  function isDeadHere(toolId,pool){
    var tools=global.Q4B_TOOLS;
    if(!tools||typeof tools.worksIn!=="function"||!Array.isArray(pool))return false;
    return !tools.worksIn(toolId,pool);
  }

  /* 画面に出す道具の名前。5 歳コースには かなの名前 (tools.js の yomi) が返る。 */
  function toolName(tool,course){
    var tools=global.Q4B_TOOLS;
    if(!tool)return "";
    return tools&&typeof tools.displayName==="function"?tools.displayName(tool,course):(tool.name||"");
  }

  /* --- 装備パネル (独立カード) --------------------------------------------------
     opts:
       gear     {tools:[{type,remaining},...], equippedToolId} (profile と同じ形)
       text     画面文字列に通す fn (必須ではないが、ふりがなはここで注入する)
       attrText 属性値に通す fn (ruby を含まない plain。省略時は text と同じ)
       course   "k5" | "k10" (5 歳コースは かなの名前)
       economy  {on()} 公開スイッチ。無い / false の間はパネルごと出さない
       release  公開済み更新番号。省略時は economy.currentRelease() へ倒す
       pool     そのゲームの捕獲プール (種の配列)。渡すと、対象 guild の割合が
                下限 (tools.js の GUILD_MIN_SHARE) に届かない道具を「ここでは
                つかえない」として選べなくする。省略時は従来どおり全部選べる

     表示規則は komorebi の toolWidgetHtml と同じ: 未公開 release の道具は出さない、
     道具ゼロならパネルごと空文字、同種 2 本目は「よび N」、残りは N／M。 */
  function panelHtml(opts){
    var options=opts||{};
    var tools=global.Q4B_TOOLS;
    var economy=options.economy;
    if(!tools||!economy||typeof economy.on!=="function"||!economy.on())return "";
    var gear=options.gear;
    if(!gear||!Array.isArray(gear.tools)||!gear.tools.length)return "";
    var text=textFn(options.text);
    var attrText=typeof options.attrText==="function"?options.attrText:text;
    var course=options.course;
    var release=Number.isFinite(options.release)?options.release
      :(typeof economy.currentRelease==="function"?economy.currentRelease():0);

    var seen={},owned=[];
    gear.tools.forEach(function(instance){
      if(!instance||typeof instance.type!=="string"||seen[instance.type])return;
      var tool=tools.byId(instance.type);
      if(!tool||tool.release>release)return;
      seen[instance.type]=true;
      var stock=tools.ownedOf(gear,instance.type);
      owned.push({type:instance.type,tool:tool,remaining:stock[0].remaining,spares:stock.length-1,
        dead:isDeadHere(instance.type,options.pool)});
    });
    if(!owned.length)return "";

    /* 未公開の道具を装備したままの状態は「なし」として見せる (効果も出ていない)。
       ここに対象 guild ゼロも同じ扱いで足す: 抽選も耐久も倒れているので、
       「そうび中」と見せると画面だけが嘘をつく。 */
    var now=typeof tools.equippedTool==="function"?tools.equippedTool(gear):null;
    if(now&&now.release>release)now=null;
    if(now&&isDeadHere(now.id,options.pool))now=null;
    var equippedId=now?gear.equippedToolId:null;

    var chips='<button type="button" class="q4b-tool-chip'+(equippedId?"":" is-on")+'" data-equip="" aria-pressed="'+(equippedId?"false":"true")+'">'
      +text("なし")+'</button>';
    owned.forEach(function(item){
      var on=item.type===equippedId;
      /* 使えない札は data-equip を持たない (bindPanel が拾わない) 上に disabled。
         隠さないのは、道具そのものは無くなっていないため: 消すと「取り上げられた」に
         見える。ここでは選べない、という 1 行だけを足す。 */
      if(item.dead){
        chips+='<button type="button" class="q4b-tool-chip is-dead" disabled aria-disabled="true">'
          +faceHtml(item.tool)+'<span class="q4b-tool-chip-name">'+text(toolName(item.tool,course))+'</span>'
          +'<span class="q4b-tool-chip-left">'+item.remaining+'／'+tools.durability+'</span>'
          +'<span class="q4b-tool-chip-dead">'+text("ここでは つかえない")+'</span></button>';
        return;
      }
      chips+='<button type="button" class="q4b-tool-chip'+(on?" is-on":"")+'" data-equip="'+escapeAttr(item.type)+'" aria-pressed="'+(on?"true":"false")+'">'
        +faceHtml(item.tool)+'<span class="q4b-tool-chip-name">'+text(toolName(item.tool,course))+'</span>'
        +'<span class="q4b-tool-chip-left">'+item.remaining+'／'+tools.durability+'</span>'
        +(item.spares>0?'<span class="q4b-tool-chip-spare">'+text("よび "+item.spares)+'</span>':"")+'</button>';
    });
    return '<section class="q4b-tool-panel" role="group" aria-label="'+attrText("そうびする どうぐ")+'">'
      +'<h2 class="q4b-tool-head">'+text("どうぐ")+'</h2>'
      +'<p class="q4b-tool-now">'+text("いまの そうび")+'　<strong>'
      +(now?faceHtml(now)+" "+text(toolName(now,course)):text("なし"))+'</strong></p>'
      +'<div class="q4b-tool-chips">'+chips+'</div></section>';
  }

  /* data-equip の click 配線。onEquip(typeOrNull) を呼ぶだけで、保存と再描画は
     呼び出し側の仕事 (保存の失敗時に持ち替えを戻す判断は profile を持つ側にしか
     できない)。既に選ばれている札は何もしない (連打で保存が並ばない)。 */
  function bindPanel(rootEl,handlers){
    var root=rootEl&&typeof rootEl.querySelectorAll==="function"?rootEl:null;
    var onEquip=handlers&&typeof handlers.onEquip==="function"?handlers.onEquip:null;
    if(!root||!onEquip)return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-equip]"),function(button){
      button.addEventListener("click",function(){
        if(button.getAttribute("aria-pressed")==="true")return;
        onEquip(button.getAttribute("data-equip")||null);
      });
    });
  }

  /* 捕獲リザルトの道具行 (komorebi の toolStatusHtml と同じ規則)。残りが常に
     見えることで「いつの間にか壊れた」を構造的に防ぐ。未装備の回は何も出さない。
     useInfo は tools.consume の返り値 {type,remaining,broke,swapped}。course は
     持ち替えの知らせに出す道具の名前のためで、省略時は 10 歳コースの名前。 */
  function statusHtml(useInfo,text,course){
    var tools=global.Q4B_TOOLS;
    if(!tools||!useInfo)return "";
    var tool=tools.byId(useInfo.type);
    if(!tool)return "";
    var t=textFn(text);
    var face=faceHtml(tool);
    if(!useInfo.broke)return '<p class="q4b-tool-left" role="status">'+face+' '+useInfo.remaining+'／'+tools.durability+'</p>';
    /* 苦労して授かった 1 本が無くなる場面なので、残りの行と同じ 1 行では流れてしまう。
       壊れた道具の絵を大きく置き、ひびを 1 本入れて、そのあとどうなるかを言う。 */
    var after=useInfo.swapped
      ?"よびの "+toolName(tool,course)+"に もちかえた!"
      :useInfo.boxEmpty===false
        /* どうぐばこに別の種類が残っている。guild が変わるので勝手には持ち替えない。 */
        ?"どうぐばこの ほかの どうぐを そうびしよう"
        :"そうびが なくなった。うろで また もらおう";
    /* 見送りは感謝の言葉ではなく、その道具が実際にやったことで締める (2026-08-22 決定)。
       「ありがとう」は稀なイベントでも毎回同じ文なので、繰り返すと定型句になる。
       捕獲数は耐久そのもの (授かった時点が満タンで、1 捕獲 1 消費、0 で壊れる) なので、
       この 1 行のために新しい状態を持たない。 */
    return '<p class="q4b-tool-break" role="status">'
      +'<span class="q4b-tool-break-art" aria-hidden="true">'+face+crackHtml()+'</span>'
      +'<strong>'+t(tool.breakText)+'</strong>'
      +'<span class="q4b-tool-break-log">'+t(tools.durability+"ぴき いっしょに つかまえたね")+'</span>'
      +'<span class="q4b-tool-break-after">'+t(after)+'</span></p>';
  }

  /* 捕獲ビネット (komorebi の toolSceneHtml と同じ規則)。道具を装備して 1 匹
     とれた回だけ、その道具の採集シーンを捕獲カードの上に 1 枚置く。表示だけの層で、
     抽選にも耐久にも一切さわらない。経済の公開判定は呼び出し側の仕事 (閉じている間
     は useInfo 自体が来ない)。 */
  function sceneHtml(capture,useInfo,text){
    var tools=global.Q4B_TOOLS,scenes=global.Q4B_TOOL_SCENES;
    if(!capture||!useInfo||!tools||!scenes||typeof scenes.svg!=="function")return "";
    var tool=tools.byId(useInfo.type);
    if(!tool||!scenes.has(tool.id))return "";
    /* 対象 guild の虫だけに出す。道具は当選重み 3 倍であって排他ではないので、
       装備していても対象外の虫は普通に捕れる。そこでこの場面を出すと、バナナの
       絵と「きの しるに あつまっていた」の 1 行がトンボに付く。捕れ方の説明として
       嘘になるうえ、図鑑で覚えた分類と道具の対応も崩れる (実在の採集法に対応させる
       という tools.js の前提そのもの)。対象外の回は場面を出さない。
       残り耐久 (statusHtml) は別で、こちらは対象外の回でも出す: 実際に 1 減って
       いるので、黙って減らすほうが分からない。 */
    var sp=capture.sp;
    if(!sp&&capture.id&&global.Q4BReward&&typeof global.Q4BReward.spById==="function")sp=global.Q4BReward.spById(capture.id);
    /* 種が引けないときも出さない。分からないまま出すのは、対象外に出すのと同じ
       間違いを確率で引くだけ。 */
    if(typeof tools.matches!=="function"||!tools.matches(tool.id,sp))return "";
    var t=textFn(text);
    var line=scenes.caption(tool.id);
    return '<figure class="q4b-tool-scene">'+scenes.svg(tool.id)
      +(line?'<figcaption class="q4b-tool-scene-line">'+t(line)+'</figcaption>':"")
      +'</figure>';
  }

  /* --- 「ここでは つかえない」の知らせ -------------------------------------
     装備は toolgear kv に プロファイル 1 つあたり 1 個で、全ゲーム共通。だから
     けいさんで対象ゼロの道具に出会っても、保存された装備は書き換えない (書き換えると
     小道でセットした 1 本がけいさんを開くたびに消える)。倒すのは「ここ」だけで、
     そのことを黙って済ませないために 1 枚出す。

     inactiveTool は「ここでは働かない装備」の定義を返す。働く / 未装備 / 経済が
     閉じている / 未公開 release / プール不明 のときは null。ポップアップを出すか
     どうかの判定を 4 ゲームで 1 本にする。 */
  function inactiveTool(opts){
    var options=opts||{};
    var tools=global.Q4B_TOOLS,economy=options.economy;
    if(!tools||!economy||typeof economy.on!=="function"||!economy.on())return null;
    var gear=options.gear;
    if(!gear||typeof tools.equippedTool!=="function")return null;
    var tool=tools.equippedTool(gear);
    if(!tool)return null;
    var release=Number.isFinite(options.release)?options.release
      :(typeof economy.currentRelease==="function"?economy.currentRelease():0);
    if(tool.release>release)return null;
    return isDeadHere(tool.id,options.pool)?tool:null;
  }

  /* 知らせの中身。モーダルの外枠はゲームごとに違う (小道は overlay、けいさんは
     全画面、かんじは modal) ので、capture_card と同じくカード本体だけを返す。
     道具の名前だけでなく guild も言う: 「なぜ ここでは だめか」を言わないと、
     子どもには道具が壊れたのと区別がつかない。 */
  function noticeHtml(tool,opts){
    var tools=global.Q4B_TOOLS;
    if(!tool||!tools)return "";
    var entry=typeof tool==="string"?tools.byId(tool):(tools.byId(tool.id||tool.type)||tool);
    if(!entry||!entry.id)return "";
    var options=opts||{};
    var t=textFn(options.text);
    var name=toolName(entry,options.course);
    return '<div class="q4b-tool-notice" role="status">'
      +'<span class="q4b-tool-notice-art" aria-hidden="true">'+faceHtml(entry)+'</span>'
      +'<strong class="q4b-tool-notice-head">'+t("ここでは つかえない どうぐ")+'</strong>'
      +'<p class="q4b-tool-notice-why">'+t(name+"は "+entry.guild+"を つかまえる どうぐ。")+'</p>'
      /* 「いない」ではなく「ほとんど いない」。下限は 0 匹ではなく対象率 5% なので
         (tools.js の GUILD_MIN_SHARE)、1 匹だけいる巻で「いない」と言うと嘘になる。 */
      +'<p class="q4b-tool-notice-why">'+t("ここには その 虫が ほとんど いないから、ここでは はずしておくね。")+'</p>'
      +'<p class="q4b-tool-notice-keep">'+t("どうぐばこには そのまま のこるよ。つかえる ばしょでは また そうびされるよ。")+'</p>'
      +'<button type="button" class="q4b-tool-notice-ok">'+t("わかった")+'</button></div>';
  }

  /* 「わかった」の click 配線。bindPanel と同じ分担で、閉じ方は呼び出し側が持つ。 */
  function bindNotice(rootEl,handlers){
    var root=rootEl&&typeof rootEl.querySelector==="function"?rootEl:null;
    var onClose=handlers&&typeof handlers.onClose==="function"?handlers.onClose:null;
    if(!root||!onClose)return;
    var button=root.querySelector(".q4b-tool-notice-ok");
    if(button)button.addEventListener("click",function(){onClose();});
  }

  global.Q4BToolsUI={
    panelHtml:panelHtml,
    bindPanel:bindPanel,
    statusHtml:statusHtml,
    sceneHtml:sceneHtml,
    inactiveTool:inactiveTool,
    noticeHtml:noticeHtml,
    bindNotice:bindNotice
  };
})(typeof window!=="undefined"?window:globalThis);
