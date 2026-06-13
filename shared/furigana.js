(function(global){
  "use strict";
  /* =========================================================================
     Quest4Bugs furigana (ruby) renderer — shared by every game.
     -------------------------------------------------------------------------
     下の子向けに、本文の漢字へ常時ルビを振る。正確さ最優先のため、読みは
     「フレーズ単位の事前注釈HTML」を辞書引きする方式（推測で誤った読みを
     出さない）。辞書に無い文字列はそのまま（エスケープのみ）返す。

       Furi.add({ "読み書き": "<ruby>読<rt>よ</rt></ruby>み<ruby>書<rt>か</rt></ruby>き", ... })
       Furi.ruby("読み書きの能力")  // 完全一致すればルビHTML、無ければ素通り

     データは shared/yomi.js などが Furi.add(...) で登録する。
     ========================================================================= */
  var DICT = global.__Q4B_YOMI || {};   // phrase(surface) -> 注釈済みルビHTML
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }
  function add(obj){ if(obj){ for(var k in obj){ if(Object.prototype.hasOwnProperty.call(obj,k)) DICT[k]=obj[k]; } } }
  function has(s){ return Object.prototype.hasOwnProperty.call(DICT, String(s)); }
  /* 完全一致でルビHTMLを返す。無ければ素通り（誤読を出さない）。 */
  function ruby(s){
    if(s==null) return "";
    s=String(s);
    return has(s) ? DICT[s] : esc(s);
  }
  /* ルビの見た目（小さめ・控えめ）を一度だけ注入。 */
  function injectCSS(){
    var doc=global.document;
    if(!doc||doc.getElementById("q4b-furi-css"))return;
    var st=doc.createElement("style");
    st.id="q4b-furi-css";
    st.textContent="ruby{ruby-align:center}ruby>rt{font-size:.52em;font-weight:600;color:inherit;opacity:.8;line-height:1;letter-spacing:0}";
    (doc.head||doc.body||doc.documentElement).appendChild(st);
  }
  if(global.document){
    if(global.document.head||global.document.body) injectCSS();
    else if(global.addEventListener) global.addEventListener("DOMContentLoaded", injectCSS);
  }
  global.Furi = { dict:DICT, add:add, has:has, ruby:ruby };
  if(typeof global.furi!=="function") global.furi = ruby;  // 便利な短縮グローバル
})(window);
