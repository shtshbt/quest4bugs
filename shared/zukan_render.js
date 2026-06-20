/* quest4bugs zukan-card renderer: museum-specimen photo overlay.
   Wraps Q4BRender.species / Q4BRender.deco so species that have an entry in
   Q4B_ZUKAN_INDEX render as a museum photo, while everything else keeps the
   original bespoke / parametric SVG. Shiny variants always fall back to the
   original renderer (museum photos have fixed colors). Females fall back unless
   a dedicated image_female is present. */
(function(global){
  "use strict";

  /* Resolve the directory that hosts shared/zukan_render.js so image paths in
     zukan_catalog.js can be project-root-relative regardless of whether the
     current HTML lives at root (index, battle) or one level deep
     (eitango, kanji, keisan). */
  var ZUKAN_BASE = (function(){
    if(!global.document) return "";
    var scripts = document.scripts || document.getElementsByTagName("script");
    for(var i = scripts.length - 1; i >= 0; i--){
      var src = scripts[i].src || "";
      var m = src.match(/^(.*?)shared\/zukan_render\.js(\?|$)/);
      if(m) return m[1];
    }
    return "";
  })();

  /* museum / svg モード切替 (localStorage `q4b_zukan_mode`, default "museum").
     "svg" のとき wrap は museum 画像を bypass して常に bespoke/parametric SVG を返す。
     ホーム画面の常駐トグルから書き換える。書き換え後は location.reload() で各画面が再 render。 */
  var MODE_KEY = "q4b_zukan_mode";
  function getMode(){
    try { return (global.localStorage && localStorage.getItem(MODE_KEY)) || "museum"; }
    catch(e){ return "museum"; }
  }
  function setMode(mode){
    try { if(global.localStorage) localStorage.setItem(MODE_KEY, mode === "svg" ? "svg" : "museum"); }
    catch(e){}
  }
  function toggleMode(){
    var next = getMode() === "museum" ? "svg" : "museum";
    setMode(next);
    return next;
  }

  function entryFor(sp){
    if(!sp || !global.Q4B_ZUKAN_INDEX) return null;
    return global.Q4B_ZUKAN_INDEX[sp.id] || null;
  }

  function entryCoversSex(entry, sex){
    if(!sex || sex === "m") return entry.sexCovered !== "f";
    if(sex === "f") return entry.sexCovered === "f" || !!entry.image_female;
    return false;
  }

  function imageHref(entry, sex){
    var img = (sex === "f" && entry.image_female) ? entry.image_female : entry.image;
    return ZUKAN_BASE + img.display;
  }

  function museumInner(entry, sex){
    var href = imageHref(entry, sex);
    return '<image href="' + href + '" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>';
  }

  function sexMark(sex){
    return sex === "m" ? " ♂" : (sex === "f" ? " ♀" : "");
  }

  function museumSVG(sp, entry, sex){
    var label = (sp && (sp.jaName || sp.id) || "") + sexMark(sex);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="' + label + '" data-zukan="1">'
         + museumInner(entry, sex)
         + '</svg>';
  }

  /* Re-implement the rarity frame for a museum specimen. bespoke SVG が中に来る
     decoSpecies と違って、museum 種は暗色 boss 枠だと写真が沈むため、museum 用に
     明るい配色 (淡金背景 + 金縁 + 暗赤茶縁) を採用。bespoke 種側 (render.js の
     decoSpecies) は元の暗色を維持。 */
  function frameBg(kind){
    if(kind === "boss"){
      return '<rect x="2" y="2" width="96" height="96" rx="14" fill="#f7ecca"/>'
           + '<rect x="2" y="2" width="96" height="50" rx="14" fill="#ecd28a" opacity=".55"/>'
           + '<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="#c8941f" stroke-width="2.5"/>'
           + '<rect x="7" y="7" width="86" height="86" rx="9" fill="none" stroke="#9a3a35" stroke-width="1.3"/>';
    }
    if(kind === "ss"){
      return '<rect x="2" y="2" width="96" height="96" rx="14" fill="#e9eef9"/>'
           + '<rect x="2" y="2" width="96" height="50" rx="14" fill="#c9d4ee" opacity=".55"/>'
           + '<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="#3b5a9e" stroke-width="2.6"/>'
           + '<rect x="7" y="7" width="86" height="86" rx="9" fill="none" stroke="#b89230" stroke-width="1.3"/>';
    }
    return '<rect x="2" y="2" width="96" height="96" rx="14" fill="#fdf3d6"/>'
         + '<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="#E0A32E" stroke-width="2.6"/>'
         + '<rect x="7" y="7" width="86" height="86" rx="9" fill="none" stroke="#caa24a" stroke-width="1.2" opacity=".7"/>';
  }

  function decoMuseumSVG(sp, entry, sex){
    var isBoss = !!(sp && (sp.bossOnly || (global.Q4B_BOSS_IDS && sp.id && global.Q4B_BOSS_IDS[sp.id])));
    var kind = isBoss ? "boss"
             : (sp && sp.masterOnly) ? "master"
             : (sp && sp.rarity === "SS") ? "ss"
             : "";
    if(!kind) return museumSVG(sp, entry, sex);
    var bg = frameBg(kind);
    var scaled = '<g transform="translate(50 53) scale(0.8) translate(-50 -54)">' + museumInner(entry, sex) + '</g>';
    var label = (sp && (sp.jaName || sp.id)) || "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="' + label + '" data-zukan="1">'
         + bg + scaled
         + '</svg>';
  }

  if(global.Q4BRender){
    var origSpecies = global.Q4BRender.species;
    var origDeco = global.Q4BRender.deco;

    global.Q4BRender.species = function(sp, shiny, sex){
      if(shiny || getMode() === "svg") return origSpecies(sp, shiny, sex);
      var entry = entryFor(sp);
      if(entry && entryCoversSex(entry, sex)) return museumSVG(sp, entry, sex);
      return origSpecies(sp, shiny, sex);
    };

    global.Q4BRender.deco = function(sp, shiny, sex){
      if(shiny || getMode() === "svg") return origDeco(sp, shiny, sex);
      var entry = entryFor(sp);
      if(entry && entryCoversSex(entry, sex)) return decoMuseumSVG(sp, entry, sex);
      return origDeco(sp, shiny, sex);
    };

    global.Q4BRender.museum = museumSVG;
    global.Q4BRender.decoMuseum = decoMuseumSVG;
    global.Q4BRender.zukanEntry = entryFor;
    global.Q4BRender.zukanOrigSpecies = origSpecies;
    global.Q4BRender.zukanOrigDeco = origDeco;
    global.Q4BRender.zukanGetMode = getMode;
    global.Q4BRender.zukanSetMode = setMode;
    global.Q4BRender.zukanToggleMode = toggleMode;
  }
})(window);
