(function(global){
  "use strict";

  /* 全ゲーム共通の捕獲カード。現存の 6 実装のうち最もリッチな形 (keisan の
     フリップカード + レア度枠) を土台に、✨いろちがいの光り、とうろく・じこベスト
     のしるし、道具のビネットと残り表示 (shared/tools_ui.js) までを 1 枚に合成する。

     返すのはカード本体だけで、モーダルの外枠 (.modal / .mcard) は含めない。包む側は
     ゲームごとに違う (kanji はモーダル、eitango はリザルト画面、keisan は全画面) ので、
     外枠まで持つとどれか 1 つの流儀を全員に押しつけることになる。

     虫の絵は Q4BRender.species を通す。しゃしんモードでは shared/zukan_render.js が
     Q4BRender.species を差し替えるので、ここは呼ぶだけでイラストと標本写真の両方に
     対応する。ふりがなも持たない: 画面に出る文字列はすべて opts.text を通る。

     見た目は shared/tools.css が持つ。カードが自分の地色と枠を持つので、クリーム地
     でも夜の森でも同じに読める。 */

  function passText(value){return value==null?"":String(value);}

  /* result: Q4BReward.record の返り値と同じ形。
       {sp,size,shiny,sex,isNew,isRecord,tier} に加えて、任意で
       n       いま何匹めか (coll.catches[sp.id].n。呼び出し側が知っている)
       toolUse tools.consume の返り値 {type,remaining,broke,swapped}
     opts:
       text      画面文字列に通す fn (ふりがなはここで注入する)
       photoMode false を渡した時だけ常にイラスト (パラメトリック SVG) で描く。
                 省略時はずかんの表示モードに従う (zukan_render が差し替え済み)
       headline  見出し。省略時は「つかまえた！」
       sub       見出しの下に 1 行そえる文 (ふくしゅう！ など)。省略可
       course    "k5" | "k10"。道具行の持ち替えの知らせに出す名前のため */
  function html(result,opts){
    if(!result||!result.sp)return "";
    var options=opts||{};
    var t=typeof options.text==="function"?options.text:passText;
    var sp=result.sp;
    var reward=global.Q4BReward;
    var tier=Number.isInteger(result.tier)?result.tier
      :(reward&&typeof reward.tierOf==="function"?reward.tierOf(sp):null);
    var tierName=(reward&&reward.TIERNAME&&tier!=null)?reward.TIERNAME[tier]:"";
    /* レア度が引けない時は枠色クラスを付けない ("rnull" のような無効クラスを
       出すと、後から足したスタイルが黙って外れる)。 */
    var rank=(tier==null)?"":" r"+tier;

    var art=artSvg(sp,result.shiny,result.sex,options.photoMode);
    var toolsUi=global.Q4BToolsUI;
    var scene=result.toolUse&&toolsUi?toolsUi.sceneHtml(result,result.toolUse,t):"";
    var status=result.toolUse&&toolsUi?toolsUi.statusHtml(result.toolUse,t,options.course):"";

    var head=options.headline||"つかまえた！";
    var sub=options.sub?'<p class="q4b-cap-sub">'+t(options.sub)+'</p>':"";
    var name=sp.jaName||sp.id||"";
    var size=Number.isFinite(result.size)?'<span class="q4b-cap-size">'+result.size+'mm</span>':"";

    /* しるしは 1 枠。新顔なら とうろく、そうでなければ 何匹めと じこベスト。 */
    var badge="";
    if(result.isNew){
      badge='<span class="q4b-cap-new">✨ '+t("ずかんに とうろく")+'</span>';
    }else{
      var count=Number.isFinite(result.n)?result.n+"匹め":"";
      var best=result.isRecord?"じこベスト こうしん!":"";
      var line=count&&best?count+"・"+best:(count||best);
      if(line)badge='<span class="q4b-cap-again">'+t(line)+'</span>';
    }
    /* いろちがいのしるしは新顔でない時だけ (新顔のしるしと ✨ が 2 度鳴らない)。 */
    var shinyTag=(result.shiny&&!result.isNew)?'<span class="q4b-cap-shiny-tag">✨ '+t("いろちがい")+'</span>':"";
    var note=sp.note?'<p class="q4b-cap-note">'+t(sp.note)+'</p>':"";

    return '<div class="q4b-cap-card" role="status">'
      +scene
      +'<strong class="q4b-cap-head">'+t(head)+'</strong>'+sub
      +'<div class="q4b-cap-flipwrap"><div class="q4b-cap-flip">'
      +'<div class="q4b-cap-face q4b-cap-front'+rank+(result.shiny?" q4b-cap-shiny":"")+'">'
      +(art?'<div class="q4b-cap-art">'+art+'</div>':"")
      +'<div class="q4b-cap-name">'+t(name)+(result.shiny?" ✨":"")+'</div>'
      +'<div class="q4b-cap-meta">'
      +(tierName?'<span class="q4b-cap-tier'+rank+'">'+t(tierName)+'</span>':"")
      +size+badge+shinyTag+'</div>'
      +'</div>'
      /* 裏面は返る途中の 0.6 秒しか見えない飾りで、読み上げる中身はない。 */
      +'<div class="q4b-cap-face q4b-cap-back" aria-hidden="true"><span>📖</span></div>'
      +'</div></div>'
      +note+status+'</div>';
  }

  /* 虫の絵。photoMode===false の時だけ常にイラストへ倒す (図鑑の表示モードに
     かかわらず SVG で描きたい画面のため)。それ以外は Q4BRender.species に任せる:
     zukan_render が読み込まれていれば、しゃしんモードで標本写真になる。 */
  function artSvg(sp,shiny,sex,photoMode){
    var render=global.Q4BRender;
    if(!render||typeof render.species!=="function")return "";
    if(photoMode===false&&typeof render.zukanOrigSpecies==="function")return render.zukanOrigSpecies(sp,shiny,sex);
    return render.species(sp,shiny,sex);
  }

  /* めくりのタップ配線。カードを とんとん すると、もういちど裏からめくる。
     animation を一拍外して掛け直すだけの飾りで、なくても情報は全部読める。 */
  function attach(rootEl){
    var root=rootEl&&typeof rootEl.querySelectorAll==="function"?rootEl
      :(typeof document!=="undefined"?document:null);
    if(!root||typeof root.querySelectorAll!=="function")return;
    Array.prototype.forEach.call(root.querySelectorAll(".q4b-cap-flip"),function(card){
      if(card._q4bCapBound)return;
      card._q4bCapBound=true;
      card.addEventListener("click",function(){
        card.style.animation="none";
        void card.offsetWidth;
        card.style.animation="";
      });
    });
  }

  global.Q4BCaptureCard={html:html,attach:attach};
})(typeof window!=="undefined"?window:globalThis);
