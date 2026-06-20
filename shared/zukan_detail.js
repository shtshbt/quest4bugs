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

  /* グループ別サマリ: 大きいベスト3 / 小さいベスト3 / 最近3件
     重複(同一個体)は除外して各グループ独立に並べる。 */
  function groupedListHTML(records){
    if(!records || records.length===0) return "";
    function sexIcon(sx){ return sx==="m"?"♂":sx==="f"?"♀":""; }
    function row(r){
      return '<div style="display:flex;justify-content:space-between;font-size:11px;color:#444;padding:1px 0">'
        + '<span>'+(r.d||'<span style="color:#bbb">きろくなし</span>')+'</span>'
        + '<span><b>'+r.s+'mm</b> '+sexIcon(r.sex)+(r.shiny?' ✨':'')+'</span>'
        + '</div>';
    }
    function block(title, emoji, rows){
      if(rows.length===0) return '';
      return ''
        + '<div style="margin:6px 0">'
        +   '<div style="font-size:11px;color:#56714e;margin-bottom:2px">'+emoji+' '+title+'</div>'
        +   '<div style="background:rgba(0,0,0,.04);padding:4px 8px;border-radius:6px">'+rows.map(row).join('')+'</div>'
        + '</div>';
    }
    var bigSort = records.slice().sort(function(a,b){ return (b.s||0)-(a.s||0); });
    var smallSort = records.slice().sort(function(a,b){ return (a.s||0)-(b.s||0); });
    /* 日付ありが優先、日付なし(legacy)は後ろ。同点は size 大きい順 */
    var dateSort = records.slice().sort(function(a,b){
      var ad=a.d||'', bd=b.d||'';
      if(ad && !bd) return -1;
      if(!ad && bd) return 1;
      if(ad===bd) return (b.s||0)-(a.s||0);
      return ad < bd ? 1 : -1;
    });
    var html = '';
    if(records.length>=2){
      html += block('大きい ベスト3', '🏆', bigSort.slice(0,3));
      var smallTop = smallSort.slice(0,3);
      /* big と完全に重複する場合(records.length<=3)は省略 */
      var bigIds = bigSort.slice(0,3).map(function(r){return r.d+'/'+r.s+'/'+r.sex;}).join('|');
      var smallIds = smallTop.map(function(r){return r.d+'/'+r.s+'/'+r.sex;}).join('|');
      if(smallIds !== bigIds) html += block('小さい ベスト3', '🌱', smallTop);
    }
    html += block('さいきん3けん', '🕒', dateSort.slice(0,3));
    return html;
  }
  /* 直近の捕獲履歴一覧 (旧式・後方互換) — 案Bの groupedListHTML に置き換え */
  function recentListHTML(records, limit){
    return groupedListHTML(records);
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
    /* お気に入りボタン (画面側が opts.coll / opts.favCallback を渡したときのみ表示)
       — 右上に絶対配置。モーダルが position:relative の枠を持つ前提で
       float+負marginの併用で「追加スペースを取らずに右上に浮かせる」 */
    if(opts.coll && opts.favCallback){
      var fav = global.Q4BReward.favoriteButtonHTML(opts.coll, (sp&&sp.id)||"", opts.favCallback+"('"+((sp&&sp.id)||"")+"')");
      if(fav) html += '<div style="float:right;margin:-2px -4px 0 0;line-height:0">'+fav+'</div>';
    }
    if(records.length===0){
      html += '<div style="font-size:12px;color:#888;margin:6px 0">これからの捕獲で きろくが たまるよ</div>';
      return html;
    }
    html += sexSummary(records);
    html += bestWorstHTML(records, sp);
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
