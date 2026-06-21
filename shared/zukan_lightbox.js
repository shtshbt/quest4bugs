/* Quest4Bugs 図鑑写真の拡大表示 (lightbox)
   museum モードの標本写真 (data-zukan="1" SVG) をタップするとフルスクリーンで拡大表示。
   pinch-zoom (2 本指) + ドラッグ pan + ダブルタップで 1↔2 倍トグル。
   SVG モード (bespoke) には反応しない (data-zukan 属性が無いため自然に対象外)。
   詳細: shared/zukan_render.js が museum/decoMuseum 出力時に
     <svg data-zukan="1" data-zukan-spid="<id>" data-zukan-sex="<m|f|>" ...>
   を付与しているのを利用する。 */
(function(global){
  "use strict";
  if(!global.document) return;

  var Z_INDEX = 10001;        // boss overlay (10000) より上、q4bGate (100000) より下
  var MAX_SCALE = 4;
  var MIN_SCALE = 1;
  var DBL_TAP_MS = 300;

  function isMuseum(){
    return global.Q4BRender && global.Q4BRender.zukanGetMode && global.Q4BRender.zukanGetMode() === "museum";
  }

  function resolveSrc(spid, sex){
    if(!global.Q4BRender) return null;
    return (global.Q4BRender.zukanOriginalImageHref && global.Q4BRender.zukanOriginalImageHref(spid, sex))
        || (global.Q4BRender.zukanDisplayImageHref && global.Q4BRender.zukanDisplayImageHref(spid, sex))
        || null;
  }
  function resolveFallback(spid, sex){
    return (global.Q4BRender && global.Q4BRender.zukanDisplayImageHref && global.Q4BRender.zukanDisplayImageHref(spid, sex)) || null;
  }
  function speciesName(spid){
    if(!global.Q4BReward || !global.Q4BReward.spById) return spid;
    var sp = global.Q4BReward.spById(spid);
    return (sp && (sp.jaName || sp.id)) || spid;
  }

  /* attach: root 配下の data-zukan SVG にクリックハンドラを装着 (冪等)。
     wrapper (svg の親要素) に cursor:zoom-in + role=button + click を付与。
     既に装着済なら何もしない。各教科のモーダル open 直後にホストから呼ぶ。 */
  function attach(root){
    if(!root || !isMuseum()) return;
    var svgs = root.querySelectorAll('svg[data-zukan="1"][data-zukan-spid]');
    for(var i=0;i<svgs.length;i++){
      var svg = svgs[i];
      var wrap = svg.parentNode;
      if(!wrap || wrap.nodeType !== 1) continue;
      if(wrap.dataset.zukanZoomable === "1") continue;     // 冪等ガード
      wrap.dataset.zukanZoomable = "1";
      wrap.style.cursor = "zoom-in";
      wrap.setAttribute("role", "button");
      wrap.setAttribute("tabindex", "0");
      wrap.setAttribute("aria-label", "しゃしんを 大きく みる");
      (function(s){
        function handler(ev){
          ev.stopPropagation();
          var spid = s.getAttribute("data-zukan-spid");
          var sex = s.getAttribute("data-zukan-sex") || "";
          if(!spid) return;
          open(spid, sex);
        }
        wrap.addEventListener("click", handler);
        wrap.addEventListener("keydown", function(e){
          if(e.key === "Enter" || e.key === " "){ e.preventDefault(); handler(e); }
        });
      })(svg);
    }
  }

  /* open: 全画面 lightbox を出して spid/sex の写真を表示 */
  function open(spid, sex){
    if(!isMuseum()) return;
    var src = resolveSrc(spid, sex);
    if(!src) return;
    var fb = resolveFallback(spid, sex);
    var name = speciesName(spid) + (sex==="m" ? " ♂" : sex==="f" ? " ♀" : "");

    // 既存 lightbox があれば閉じる
    var existing = document.getElementById("q4bLightboxOv");
    if(existing) existing.remove();

    var ov = document.createElement("div");
    ov.id = "q4bLightboxOv";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "ひょうほん しゃしん");
    ov.style.cssText = ""
      + "position:fixed;inset:0;background:rgba(0,0,0,.92);"
      + "z-index:" + Z_INDEX + ";"
      + "display:flex;flex-direction:column;align-items:center;justify-content:center;"
      + "padding:env(safe-area-inset-top,0) 12px env(safe-area-inset-bottom,0);"
      + "touch-action:none;user-select:none;-webkit-user-select:none";

    var stage = document.createElement("div");
    stage.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;width:100%;overflow:hidden;touch-action:none";

    var inner = document.createElement("div");
    inner.style.cssText = "transform-origin:50% 50%;transition:transform .15s ease-out;touch-action:none;will-change:transform";

    var img = new Image();
    img.alt = name;
    img.style.cssText = "max-width:96vw;max-height:80vh;object-fit:contain;display:block;touch-action:none;user-select:none;pointer-events:none";
    img.src = src;
    img.onerror = function(){ if(fb && img.src !== fb) img.src = fb; };
    inner.appendChild(img);
    stage.appendChild(inner);

    var caption = document.createElement("div");
    caption.style.cssText = "color:#FFFDF4;font-size:13px;font-weight:700;text-align:center;padding:8px 4px 4px;max-width:96vw;line-height:1.4;font-family:inherit";
    caption.textContent = name;

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "しゃしんを とじる");
    closeBtn.innerHTML = '✕ とじる';
    closeBtn.style.cssText = ""
      + "position:absolute;top:max(env(safe-area-inset-top,8px),8px);right:8px;"
      + "background:rgba(255,253,244,.94);border:2px solid #CFDDB2;border-radius:14px;"
      + "padding:8px 14px;font-size:14px;font-weight:800;font-family:inherit;color:#2A3D2C;"
      + "cursor:pointer;box-shadow:0 2px 0 #CFDDB2;min-width:44px;min-height:44px";

    var hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,253,244,.7);font-size:11px;text-align:center;padding:4px";
    hint.textContent = "つまんで ひろげると 大きく / ダブルタップで ズーム";

    ov.appendChild(closeBtn);
    ov.appendChild(stage);
    ov.appendChild(caption);
    ov.appendChild(hint);
    document.body.appendChild(ov);

    /* ===== pinch-zoom / pan / double-tap 実装 ===== */
    var scale = 1, tx = 0, ty = 0;
    var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduced) inner.style.transition = "none";

    function applyTransform(){
      inner.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    }
    function clampScale(s){ return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s)); }

    var pointers = {};        // pointerId -> {x,y}
    var lastDist = 0, lastCenter = null;
    var lastTapTime = 0, lastTapX = 0, lastTapY = 0;
    var singleDragLast = null;

    function nPointers(){ var n=0; for(var k in pointers){ if(Object.prototype.hasOwnProperty.call(pointers,k)) n++; } return n; }
    function pointerArr(){ var arr=[]; for(var k in pointers){ if(Object.prototype.hasOwnProperty.call(pointers,k)) arr.push(pointers[k]); } return arr; }
    function dist(a,b){ var dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
    function center(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }

    function onDown(e){
      pointers[e.pointerId] = {x:e.clientX, y:e.clientY};
      if(nPointers() === 1){
        // double tap detection
        var now = Date.now();
        if(now - lastTapTime < DBL_TAP_MS && Math.hypot(e.clientX-lastTapX, e.clientY-lastTapY) < 30){
          scale = scale > 1 ? 1 : 2;
          if(scale === 1){ tx = 0; ty = 0; }
          applyTransform();
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;
        lastTapX = e.clientX; lastTapY = e.clientY;
        singleDragLast = {x:e.clientX, y:e.clientY};
      } else if(nPointers() === 2){
        var ps = pointerArr();
        lastDist = dist(ps[0], ps[1]);
        lastCenter = center(ps[0], ps[1]);
        singleDragLast = null;
      }
      try{ stage.setPointerCapture(e.pointerId); }catch(_){}
    }
    function onMove(e){
      if(!pointers[e.pointerId]) return;
      pointers[e.pointerId] = {x:e.clientX, y:e.clientY};
      var ps = pointerArr();
      if(nPointers() === 2){
        var d = dist(ps[0], ps[1]);
        var c = center(ps[0], ps[1]);
        if(lastDist > 0){
          var ratio = d / lastDist;
          var newScale = clampScale(scale * ratio);
          // pan based on center movement
          tx += (c.x - lastCenter.x);
          ty += (c.y - lastCenter.y);
          scale = newScale;
          applyTransform();
        }
        lastDist = d; lastCenter = c;
      } else if(nPointers() === 1 && scale > 1 && singleDragLast){
        // pan when zoomed in
        tx += (e.clientX - singleDragLast.x);
        ty += (e.clientY - singleDragLast.y);
        singleDragLast = {x:e.clientX, y:e.clientY};
        applyTransform();
      }
    }
    function onUp(e){
      delete pointers[e.pointerId];
      if(nPointers() < 2){ lastDist = 0; lastCenter = null; }
      if(nPointers() === 0){ singleDragLast = null; }
    }
    function onWheel(e){
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.25 : 0.25;
      scale = clampScale(scale + delta);
      if(scale === 1){ tx = 0; ty = 0; }
      applyTransform();
    }

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("pointerleave", onUp);
    stage.addEventListener("wheel", onWheel, {passive:false});

    function close(){
      ov.removeEventListener("keydown", onKey);
      if(ov.parentNode) ov.parentNode.removeChild(ov);
      if(lastFocused && typeof lastFocused.focus === "function"){
        try{ lastFocused.focus(); }catch(_){}
      }
    }
    function onKey(e){ if(e.key === "Escape"){ close(); } }
    ov.addEventListener("keydown", onKey);
    ov.addEventListener("click", function(e){
      // 背景タップで閉じる (画像領域・閉じるボタン以外)
      if(e.target === ov || e.target === stage){ close(); }
    });
    closeBtn.addEventListener("click", close);

    var lastFocused = document.activeElement;
    setTimeout(function(){ try{ closeBtn.focus(); }catch(_){} }, 30);
  }

  /* 自動 attach: MutationObserver で DOM 追加を監視し、新規 museum SVG を自動装着。
     各教科の modal 関数に手動で attach 呼出を入れなくても全画面で動く。 */
  function startAutoAttach(){
    if(!global.MutationObserver) return;
    if(global.__q4bLightboxObserver) return;
    var pending = false;
    function flush(){
      pending = false;
      attach(document.body);
    }
    var obs = new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        for(var j=0;j<muts[i].addedNodes.length;j++){
          var n = muts[i].addedNodes[j];
          if(n.nodeType !== 1) continue;
          if(n.querySelector && (n.querySelector('svg[data-zukan="1"]') || n.matches && n.matches('svg[data-zukan="1"]'))){
            if(!pending){ pending = true; setTimeout(flush, 50); }
            return;
          }
        }
      }
    });
    obs.observe(document.body, {childList:true, subtree:true});
    global.__q4bLightboxObserver = obs;
    /* 起動時の既存要素も 1 度 attach */
    attach(document.body);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", startAutoAttach);
  } else {
    startAutoAttach();
  }

  global.Q4BZukanLightbox = { attach: attach, open: open, startAutoAttach: startAutoAttach };
})(typeof window !== "undefined" ? window : globalThis);
