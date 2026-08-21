(function(global){
  "use strict";

  /* 採集道具のアイコン 11 種 (tools_design 9 章)。一色〜二色のライン画で、
     交換画面・どうぐばこ・こはくのウィジェット・捕獲リザルトの 4 か所が同じ 1 本を
     使う。道具の絵が場所ごとに違うと、交換画面で選んだものと手に持っているものが
     同じだと分からなくなる。

     線は currentColor で描くので、置いた場所の文字色にそのまま馴染む。2 色目
     (アクセント) は CSS 変数 --tool-accent で、道具の「効くところ」だけに使う:
     網の目、あかり、水面、獲物。既定値を持たせてあるので、CSS を読み込んでいない
     文脈でも線が消えることはない。

     モジュールを読み込んでいない文脈では呼び出し側が絵文字へ倒す (tools.js の
     emoji が控え)。アイコンは表示のためだけのもので、判定には一切使わない。 */

  var VIEW_BOX="0 0 24 24";

  /* accent は 2 色目で描く部分。塗りは使わず、線だけで組む (小さくしても潰れない)。 */
  var ICONS={
    /* ちょうネット: 丸い枠にゆるい袋。目は粗い 1 本だけ。 */
    cho_net:'<ellipse cx="9.5" cy="6.6" rx="6.4" ry="3.4"/>'
      +'<path d="M3.1 6.6 C3.7 13 6.3 15.7 9.5 15.7 C12.7 15.7 15.3 13 15.9 6.6"/>'
      +'<path d="M15.4 9.2 L20.6 20.4"/>'
      +'<path class="tool-icon-accent" d="M9.5 10 V15.6"/>',
    /* トンボ用メッシュネット: 同じ形で目が細かい。すばやい翅をいためない網。 */
    tonbo_net:'<ellipse cx="9.5" cy="6.6" rx="6.4" ry="3.4"/>'
      +'<path d="M3.1 6.6 C3.7 13 6.3 15.7 9.5 15.7 C12.7 15.7 15.3 13 15.9 6.6"/>'
      +'<path d="M15.4 9.2 L20.6 20.4"/>'
      +'<path class="tool-icon-accent" d="M4.2 9.6 H14.8 M5.6 12.4 H13.4 M7.6 14.8 H11.4 M9.5 8 V15.6"/>',
    /* 灯火採集セット: つり下げたあかりと、こぼれる光。 */
    light_trap:'<path d="M12 2.4 V4.6"/>'
      +'<path d="M7.4 10.2 L12 4.6 L16.6 10.2 Z"/>'
      +'<circle cx="12" cy="12.6" r="1.7"/>'
      +'<path class="tool-icon-accent" d="M6.6 15 L4.2 17.6 M17.4 15 L19.8 17.6 M12 17 V20.6"/>',
    /* バナナトラップ: じゅくしたバナナ 1 本。 */
    banana_trap:'<path d="M4.6 5 C4.6 13.8 10.2 19.4 19 19.4 C12.6 17.2 8.4 12 7.6 5 Z"/>'
      +'<path d="M7.6 5 L7 2.8"/>'
      +'<path class="tool-icon-accent" d="M6.6 8.4 C7.9 13 11.4 16.6 15.8 18.2"/>',
    /* スイーピングネット: 草はらをなでる網。草は 2 色目。 */
    sweep_net:'<circle cx="9" cy="7" r="4.6"/>'
      +'<path d="M12.4 10.2 L19.2 17.4"/>'
      +'<path class="tool-icon-accent" d="M3.6 21 C4.2 17.6 5 16 6 15 M8.6 21 C8.8 17.2 9.4 15.6 10.4 14.4'
      +' M13.6 21 C13.4 18.2 14 16.4 15 15.2"/>',
    /* さかなとりあみ: 水面をすくう浅い網。波は 2 色目。 */
    water_net:'<path d="M3.6 7.6 H14.8"/>'
      +'<path d="M3.6 7.6 Q9.2 15.4 14.8 7.6"/>'
      +'<path d="M14.2 7.9 L20.4 3.2"/>'
      +'<path class="tool-icon-accent" d="M2.4 17 C4.5 15.2 6.6 18.8 8.7 17 C10.8 15.2 12.9 18.8 15 17'
      +' M6.4 20.6 C8.5 18.8 10.6 22.4 12.7 20.6"/>',
    /* ビーティングセット: えだをたたいて白いぬのに落とす。落ちてくる虫が 2 色目。 */
    beating_set:'<path d="M2.4 5.4 C7.4 4.2 12.4 6.8 17.4 5.2"/>'
      +'<path d="M4.2 12.6 H20 L17.4 20.6 H6.6 Z"/>'
      +'<path class="tool-icon-accent" d="M18.2 8.6 L21.2 4.4"/>'
      +'<circle class="tool-icon-accent" cx="11" cy="9.6" r="1.1"/>',
    /* 吸虫管: ほそいくだ 2 本と びん。吸いこむ先の小さい虫が 2 色目。 */
    aspirator:'<path d="M8.4 7.2 H15.6"/>'
      +'<path d="M9.2 7.2 V16.8 Q12 20.6 14.8 16.8 V7.2"/>'
      +'<path d="M10.4 7.2 C10.4 4.2 7.4 3.4 5.2 5"/>'
      +'<path class="tool-icon-accent" d="M13.8 7.2 C13.8 4.6 16.4 3.4 18.4 4.6"/>'
      +'<circle class="tool-icon-accent" cx="19.6" cy="5.6" r="0.9"/>',
    /* 高所用長竿: つないで伸ばすさお。つなぎ目が 2 色目。 */
    long_pole:'<ellipse cx="17" cy="6.4" rx="3.9" ry="2.5"/>'
      +'<path d="M13.1 6.4 Q17 11.8 20.9 6.4"/>'
      +'<path d="M3.4 20.6 L14.4 9.6"/>'
      +'<path class="tool-icon-accent" d="M6.6 17.4 L8.2 19 M10.2 13.8 L11.8 15.4"/>',
    /* 落とし穴トラップ: 地めんにうめたコップ。落ちてくる線が 2 色目。 */
    pitfall_trap:'<path d="M2 9 H8 M16 9 H22"/>'
      +'<path d="M8 9 L9.8 19.4 H14.2 L16 9 Z"/>'
      +'<path class="tool-icon-accent" d="M12 11.6 V15.4"/>'
      +'<circle class="tool-icon-accent" cx="5.4" cy="6.8" r="1.1"/>',
    /* フントラップ: ころがす玉と、それを追う虫。虫が 2 色目。 */
    dung_trap:'<circle cx="8.8" cy="13.6" r="4.9"/>'
      +'<path d="M2 20.4 H22"/>'
      +'<path class="tool-icon-accent" d="M6.4 12.6 Q7.4 13.8 8.4 12.6 M10.2 15.2 Q11.2 16.4 12.2 15.2"/>'
      +'<ellipse class="tool-icon-accent" cx="17.2" cy="16.4" rx="2.5" ry="1.9"/>'
      +'<path class="tool-icon-accent" d="M15.4 18.2 L14.2 19.6 M19 18.2 L20.2 19.6"/>'
  };

  function escapeAttr(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function has(toolId){return Object.prototype.hasOwnProperty.call(ICONS,toolId);}

  /* opts: {className, label}。label を渡した時だけ読み上げの対象にする。並んだ札の
     ように名前が隣にある場所では、絵まで読み上げると同じ言葉が 2 度鳴る。 */
  function svg(toolId,opts){
    if(!has(toolId))return "";
    var options=opts||{};
    var className=options.className?"tool-icon "+options.className:"tool-icon";
    var label=options.label?' role="img" aria-label="'+escapeAttr(options.label)+'"':' aria-hidden="true"';
    return '<svg class="'+escapeAttr(className)+'" viewBox="'+VIEW_BOX+'"'+label
      +' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
      +ICONS[toolId]+'</svg>';
  }

  global.Q4B_TOOL_ICONS={ids:Object.keys(ICONS),has:has,svg:svg};
})(typeof window!=="undefined"?window:globalThis);
