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

  /* 性差顕著種の sex 別 SVG プレビュー (sp.sexDimorphism がある種で表示) */
  function sexPreviewHTML(sp){
    if(!sp || !sp.sexDimorphism || !global.Q4BRender || !global.Q4BRender.species) return "";
    var html = '<div style="display:flex;gap:14px;justify-content:center;margin:6px 0">'
      + '<div style="text-align:center"><div style="width:80px;height:80px;margin:0 auto">'+global.Q4BRender.species(sp,false,'m')+'</div><div style="font-size:11px;color:#3a5fa5">♂ オス</div></div>'
      + '<div style="text-align:center"><div style="width:80px;height:80px;margin:0 auto">'+global.Q4BRender.species(sp,false,'f')+'</div><div style="font-size:11px;color:#a0497a">♀ メス</div></div>'
      + '</div>';
    if(sp.sexDimorphismNote){
      html += '<div style="background:rgba(255,200,100,.15);border-radius:8px;padding:5px 8px;font-size:12px;margin:4px 0">💡 '+sp.sexDimorphismNote+'</div>';
    }
    return html;
  }
  /* 旧API: bestWorstHTML — 互換のため残すが内部は sexPreviewHTML 呼び出しのみ
     ベスト3/最小3 は groupedListHTML で扱う */
  function bestWorstHTML(records, sp){ return sexPreviewHTML(sp); }

  /* 2x2 ベスト表 (オス♂×メス♀ × 大きさ・小ささ) — コンパクト表示。 */
  function bestTableHTML(records){
    if(!records || records.length===0) return "";
    var bestM=null, smallM=null, bestF=null, smallF=null;
    records.forEach(function(r){
      if(r.s==null) return;
      if(r.sex==="m"){
        if(!bestM || r.s>bestM.s) bestM=r;
        if(!smallM || r.s<smallM.s) smallM=r;
      } else if(r.sex==="f"){
        if(!bestF || r.s>bestF.s) bestF=r;
        if(!smallF || r.s<smallF.s) smallF=r;
      }
    });
    function cell(r){
      return '<td style="text-align:center;padding:4px 6px">'
        + (r ? '<b>'+r.s+'</b><span style="font-size:10px;color:#888">mm</span>'
             : '<span style="color:#bbb">-</span>')
        + '</td>';
    }
    return ''
      + '<table style="border-collapse:collapse;width:100%;font-size:12px;margin:6px 0">'
      +   '<tr><th></th>'
      +     '<th style="color:#56714e;font-weight:normal;font-size:11px">🏆 さいだい</th>'
      +     '<th style="color:#56714e;font-weight:normal;font-size:11px">🌱 さいしょう</th></tr>'
      +   '<tr><td style="color:#3a5fa5;font-weight:bold;padding:2px 6px;font-size:13px">♂ オス</td>'+cell(bestM)+cell(smallM)+'</tr>'
      +   '<tr><td style="color:#a0497a;font-weight:bold;padding:2px 6px;font-size:13px">♀ メス</td>'+cell(bestF)+cell(smallF)+'</tr>'
      + '</table>';
  }
  /* 最近 N 件の表 (日付・サイズ・性別) */
  function recentListHTML(records, limit){
    if(!records || records.length===0) return "";
    function sexIcon(sx){ return sx==="m"?"♂":sx==="f"?"♀":""; }
    var n = Math.min(limit||5, records.length);
    /* 日付ありが先頭、新しい順。日付なし(legacy)は末尾。 */
    var sorted = records.slice().sort(function(a,b){
      var ad=a.d||'', bd=b.d||'';
      if(ad && !bd) return -1;
      if(!ad && bd) return 1;
      if(ad===bd) return (b.s||0)-(a.s||0);
      return ad < bd ? 1 : -1;
    }).slice(0, n);
    var rows = sorted.map(function(r){
      return '<tr style="font-size:11px;color:#444">'
        + '<td style="padding:1px 4px">'+(r.d||'<span style="color:#bbb">きろくなし</span>')+'</td>'
        + '<td style="padding:1px 4px;text-align:right"><b>'+r.s+'mm</b></td>'
        + '<td style="padding:1px 4px;text-align:center">'+sexIcon(r.sex)+(r.shiny?' ✨':'')+'</td>'
        + '</tr>';
    }).join('');
    return ''
      + '<div style="margin:6px 0">'
      +   '<div style="font-size:11px;color:#56714e;margin-bottom:2px">🕒 さいきんの きろく ('+n+'けん)</div>'
      +   '<table style="border-collapse:collapse;width:100%;background:rgba(0,0,0,.04);border-radius:6px"><tbody>'+rows+'</tbody></table>'
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
    /* レガシー記録(records なし)を自動 backfill:
       既存の n/max/min/shiny から仮想 records を生成して、ヒストグラム表示を維持する。
       opts.saveFn があれば永続化(次回以降は通常表示で動く)。 */
    if((!entry.records || entry.records.length===0) && entry.n>0 && global.Q4BReward && global.Q4BReward.backfillRecords && opts.coll){
      global.Q4BReward.backfillRecords(opts.coll, sp);
      if(typeof opts.saveFn === 'function') opts.saveFn();
    }
    var records = entry.records || [];
    var sizeMm = (sp && sp.sizeMm) ? sp.sizeMm : (global.Q4BReward && global.Q4BReward.sizeRange ? global.Q4BReward.sizeRange(sp) : [0, 100]);
    var html = '';
    /* お気に入りボタン: モーダル(.mcard/.inner が position:relative) の右上に絶対配置。
       追加スペース行を取らない。 */
    if(opts.coll && opts.favCallback){
      var fav = global.Q4BReward.favoriteButtonHTML(opts.coll, (sp&&sp.id)||"", opts.favCallback+"('"+((sp&&sp.id)||"")+"')");
      if(fav) html += '<div style="position:absolute;top:6px;right:8px;z-index:5">'+fav+'</div>';
    }
    if(records.length===0){
      html += '<div style="font-size:12px;color:#888;margin:6px 0">これからの捕獲で きろくが たまるよ</div>';
      return html;
    }
    html += sexSummary(records);
    html += bestWorstHTML(records, sp);       /* SVG プレビュー + dimorphism note */
    html += bestTableHTML(records);           /* 2x2 ベスト表 (オス×メス × 大・小) */
    html += histogramHTML(records, sizeMm);
    html += recentListHTML(records, 5);
    return html;
  }

  global.Q4BZukan = {
    detailHTML: detailHTML,
    histogramHTML: histogramHTML,
    sexSummary: sexSummary,
    bestTableHTML: bestTableHTML,
    bestWorstHTML: bestWorstHTML,
    recentListHTML: recentListHTML,
    favoriteToggleHTML: favoriteToggleHTML,
  };
})(window);
