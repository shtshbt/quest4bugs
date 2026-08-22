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
      owned.push({type:instance.type,tool:tool,remaining:stock[0].remaining,spares:stock.length-1});
    });
    if(!owned.length)return "";

    /* 未公開の道具を装備したままの状態は「なし」として見せる (効果も出ていない)。 */
    var now=typeof tools.equippedTool==="function"?tools.equippedTool(gear):null;
    if(now&&now.release>release)now=null;
    var equippedId=now?gear.equippedToolId:null;

    var chips='<button type="button" class="q4b-tool-chip'+(equippedId?"":" is-on")+'" data-equip="" aria-pressed="'+(equippedId?"false":"true")+'">'
      +text("なし")+'</button>';
    owned.forEach(function(item){
      var on=item.type===equippedId;
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
    return '<p class="q4b-tool-break" role="status">'
      +'<span class="q4b-tool-break-art" aria-hidden="true">'+face+crackHtml()+'</span>'
      +'<strong>'+t(tool.breakText)+'</strong>'
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

  global.Q4BToolsUI={
    panelHtml:panelHtml,
    bindPanel:bindPanel,
    statusHtml:statusHtml,
    sceneHtml:sceneHtml
  };
})(typeof window!=="undefined"?window:globalThis);
