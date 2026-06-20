/* Quest4Bugs 図鑑詳細の拡張表示 — 各ゲームの図鑑詳細モーダルに挿入する HTML を生成。
   docs/zukan_enhancement_plan.md の Step 3-5 を実装:
     - 個体ごとの捕獲履歴リスト (records)
     - サイズヒストグラム (オス/メス色分け)
     - 最大個体・最小個体のハイライト
     - オス/メス比
   後方互換: records が空/未定義でも安全に動作（メッセージのみ表示）。 */
(function(global){
  "use strict";
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];
  }); }
  function pct(n,d){ return d>0 ? Math.round(n/d*100) : 0; }

  /* サイズヒストグラム: bin 数 6-8、bar は積み上げ(オス/メス) */
  function histogramHTML(records, range){
    if(!records || records.length===0) return "";
    var mn = range[0], mx = range[1];
    if(mx<=mn) mx = mn+1;
    var bins = 7;
    var step = (mx - mn) / bins;
    var data = [];
    for(var i=0;i<bins;i++) data.push({m:0, f:0, u:0, lo:mn+step*i, hi:mn+step*(i+1)});
    var maxS = -Infinity, minS = Infinity, maxR=null, minR=null;
    records.forEach(function(r){
      var s = r.s; if(s==null) return;
      var idx = Math.min(bins-1, Math.max(0, Math.floor((s - mn) / step)));
      var sex = (r.sex==="m"||r.sex==="f") ? r.sex : "u";
      data[idx][sex]++;
      if(s>maxS){ maxS=s; maxR=r; }
      if(s<minS){ minS=s; minR=r; }
    });
    var maxCount = 0;
    data.forEach(function(d){ var t=d.m+d.f+d.u; if(t>maxCount) maxCount=t; });
    if(maxCount===0) return "";
    var BAR_H = 50;        /* px */
    var bars = data.map(function(d, i){
      var total = d.m+d.f+d.u;
      var hPx = total>0 ? Math.max(4, Math.round(total/maxCount*BAR_H)) : 0;
      var fH = total>0 ? Math.round(d.f/total*hPx) : 0;
      var mH = total>0 ? Math.round(d.m/total*hPx) : 0;
      var uH = Math.max(0, hPx - fH - mH);
      var isMax = (maxR && d.lo<=maxR.s && maxR.s<=d.hi);
      var isMin = (minR && d.lo<=minR.s && minR.s<=d.hi);
      var marker = isMax ? '<span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:11px">🏆</span>' :
                   isMin ? '<span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:11px">🌱</span>' : '';
      return ''
        + '<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;height:'+(BAR_H+18)+'px">'
        +   marker
        +   '<div style="display:flex;flex-direction:column-reverse;width:80%;height:'+BAR_H+'px;justify-content:flex-start;align-items:stretch">'
        +     (mH>0 ? '<div title="オス '+d.m+'匹" style="background:#5b8de0;height:'+mH+'px"></div>' : '')
        +     (fH>0 ? '<div title="メス '+d.f+'匹" style="background:#e08bb9;height:'+fH+'px"></div>' : '')
        +     (uH>0 ? '<div title="ふめい '+d.u+'匹" style="background:#bbb;height:'+uH+'px"></div>' : '')
        +   '</div>'
        +   '<div style="font-size:9px;color:#666;margin-top:2px">'+Math.round(d.lo)+'</div>'
        + '</div>';
    }).join("");
    var legend = '<div style="display:flex;gap:8px;justify-content:center;font-size:11px;color:#666;margin-top:4px">'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#5b8de0;vertical-align:middle"></span> オス</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#e08bb9;vertical-align:middle"></span> メス</span>'
      + '</div>';
    return ''
      + '<div style="margin:10px 0">'
      +   '<div style="font-size:12px;color:#56714e;margin-bottom:4px">サイズの分布</div>'
      +   '<div style="display:flex;align-items:flex-end;gap:2px;height:'+(BAR_H+22)+'px;padding-top:14px">'+bars+'</div>'
      +   legend
      + '</div>';
  }

  /* 性別比サマリ: "オス 7 / メス 5" 等 */
  function sexSummary(records){
    if(!records || records.length===0) return "";
    var m=0,f=0,u=0;
    records.forEach(function(r){
      if(r.sex==="m") m++;
      else if(r.sex==="f") f++;
      else u++;
    });
    if(m===0 && f===0) return "";        /* 性別記録がないなら省略 */
    var total=m+f+u;
    var parts=[];
    if(m>0) parts.push('<span style="color:#3a5fa5">♂ オス '+m+'</span>');
    if(f>0) parts.push('<span style="color:#a0497a">♀ メス '+f+'</span>');
    if(u>0) parts.push('<span style="color:#888">？ '+u+'</span>');
    return '<div style="font-size:12px;margin:4px 0">'+parts.join(' / ')+' （ぜんぶで '+total+'ひき）</div>';
  }

  /* 最大・最小ハイライト */
  function bestWorstHTML(records){
    if(!records || records.length===0) return "";
    var maxR=null, minR=null;
    records.forEach(function(r){
      if(r.s==null) return;
      if(!maxR || r.s>maxR.s) maxR=r;
      if(!minR || r.s<minR.s) minR=r;
    });
    if(!maxR) return "";
    function sexIcon(sx){ return sx==="m"?"♂":sx==="f"?"♀":""; }
    function lineFor(label, r, emoji){
      return '<span style="display:inline-block;margin:0 6px;font-size:12px">'+emoji+' '+label+': <b>'+r.s+'mm</b> '+sexIcon(r.sex)+' '+(r.shiny?'✨':'')+(r.d?' <span style="color:#888">('+r.d+')</span>':'')+'</span>';
    }
    var html = '<div style="margin:4px 0">';
    html += lineFor('さいだい', maxR, '🏆');
    if(minR && minR!==maxR) html += lineFor('さいしょう', minR, '🌱');
    html += '</div>';
    return html;
  }

  /* 直近の捕獲履歴一覧 (最新 N 件) */
  function recentListHTML(records, limit){
    if(!records || records.length===0) return "";
    var n = Math.min(limit||5, records.length);
    var recent = records.slice(-n).reverse();
    function sexIcon(sx){ return sx==="m"?"♂":sx==="f"?"♀":""; }
    var rows = recent.map(function(r){
      return '<div style="display:flex;justify-content:space-between;font-size:11px;color:#444;padding:1px 0">'
        +    '<span>'+(r.d||'?')+'</span>'
        +    '<span><b>'+r.s+'mm</b> '+sexIcon(r.sex)+(r.shiny?' ✨':'')+'</span>'
        +    '</div>';
    }).join("");
    return ''
      + '<div style="margin:8px 0">'
      +   '<div style="font-size:12px;color:#56714e;margin-bottom:2px">さいきんの きろく ('+n+'けん)</div>'
      +   '<div style="background:rgba(0,0,0,.04);padding:4px 8px;border-radius:6px">'+rows+'</div>'
      + '</div>';
  }

  /* お気に入りトグルボタン HTML。クリックで coll.favorites を反転 → saveFn → reRenderFn を呼ぶ。
     各画面の詳細モーダルに同じ形で差し込める共通スニペット。
     coll: 該当ゲームの collection オブジェクト
     id: 種 id
     globalAccessor: 'window.kanjiZukanFavToggle' 等、画面側で window 直下に登録したコールバック名 */
  function favoriteToggleHTML(coll, id, globalCallbackName){
    if(!global.Q4BReward || !global.Q4BReward.favoriteButtonHTML) return "";
    var onclickStr = globalCallbackName ? globalCallbackName+"('"+id+"')" : "";
    return '<div style="display:inline-block">'+global.Q4BReward.favoriteButtonHTML(coll, id, onclickStr)+'</div>';
  }

  /* 全部まとめた詳細 HTML を返す。entry: catches[id], sp: 種データ
     opts.coll: お気に入り対象コレクション (Q4BReward.favoriteButtonHTML 用)
     opts.favCallback: window 直下に登録したお気に入りトグル関数名 (例: "kanjiFavTap") */
  function detailHTML(entry, sp, opts){
    if(!entry) return "";
    opts = opts || {};
    var records = entry.records || [];
    var sizeMm = (sp && sp.sizeMm) ? sp.sizeMm : (global.Q4BReward && global.Q4BReward.sizeRange ? global.Q4BReward.sizeRange(sp) : [0, 100]);
    var html = '';
    /* お気に入りボタン (画面側が opts.coll / opts.favCallback を渡したときのみ表示) */
    if(opts.coll && opts.favCallback){
      var fav = favoriteToggleHTML(opts.coll, (sp&&sp.id)||"", opts.favCallback);
      if(fav) html += '<div style="text-align:right;margin:2px 0">'+fav+'</div>';
    }
    if(records.length===0){
      html += '<div style="font-size:12px;color:#888;margin:6px 0">これからの捕獲で きろくが たまるよ</div>';
      return html;
    }
    html += sexSummary(records);
    html += bestWorstHTML(records);
    html += histogramHTML(records, sizeMm);
    html += recentListHTML(records, 5);
    return html;
  }

  global.Q4BZukan = {
    detailHTML: detailHTML,
    histogramHTML: histogramHTML,
    sexSummary: sexSummary,
    bestWorstHTML: bestWorstHTML,
    recentListHTML: recentListHTML,
    favoriteToggleHTML: favoriteToggleHTML,
  };
})(window);
