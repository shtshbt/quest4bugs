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

  /* 標本詳細表示。Q4B_ZUKAN_INDEX[sp.id] (specimen/source/...) からテーブル化。
     詳細モーダル末尾に「📋 ひょうほんの情報」ボタン (collapsible) として置く。
     CC-BY 4.0 の attribution 義務 (institution + license + sourceUrl) もこの table が満たす。 */
  function specimenInfoHTML(sp){
    if(!sp || !global.Q4B_ZUKAN_INDEX) return "";
    var entry = global.Q4B_ZUKAN_INDEX[sp.id];
    if(!entry) return "";
    var spec = entry.specimen || {};
    var src = entry.source || {};
    var isObservation = spec.basisOfRecord === "HumanObservation";
    var rows = [];
    /* add(label, value, opts):
         opts.raw       — true なら value をそのまま (HTML) 挿入
         opts.fallback  — value が null/空でも、この文言を薄色で表示する。 */
    function add(label, value, opts){
      opts = opts || {};
      if(value == null || value === ""){
        if(opts.fallback){
          rows.push([label, '<span style="color:#aaa">'+esc(opts.fallback)+'</span>', true]);
        }
        return;
      }
      rows.push([label, opts.raw ? value : esc(value), !!opts.raw]);
    }

    add("提供", entry.creditLine || spec.institution);

    if(isObservation){
      /* iNat 観察用 field set */
      add("撮影者", spec.recordedBy || entry.creator);
      add("撮影日", spec.eventDate || spec.eventYear, {fallback: "未記録"});
      /* coordinatesObscured が true なら座標は隠して「(大まか)」表示 */
      var locParts = [spec.localityVerbatim || spec.localityNormalized || null, spec.country].filter(Boolean);
      var locStr = locParts.length ? locParts.join(", ") : null;
      if(spec.coordinatesObscured && locStr){
        locStr = locStr + " (大まか — iNat 自動 obfuscation)";
      }
      add("観察地", locStr, {fallback: "未記録"});
      if(spec.qualityGrade){
        var qLabel = spec.qualityGrade === "research" ? "Research grade (community 2+ 同意)" : spec.qualityGrade;
        add("観察品質", qLabel);
      }
      if(spec.iNatObservationId) add("iNat 観察 ID", spec.iNatObservationId);
    } else {
      /* PreservedSpecimen (museum) 用 field set */
      add("標本番号", spec.catalogNumber);
      add("採集日", spec.eventDate || spec.eventYear, {fallback: "ラベルから未転記"});
      var locParts2 = [spec.localityVerbatim || spec.localityNormalized || null, spec.country].filter(Boolean);
      add("採集地", locParts2.length ? locParts2.join(", ") : null, {fallback: "ラベルから未転記"});
      add("採集者", spec.recordedBy, {fallback: "ラベルから未転記"});
      if(spec.sex) add("性別", spec.sex === "Male" ? "オス" : spec.sex === "Female" ? "メス" : spec.sex);
      if(spec.lifeStage) add("ステージ", spec.lifeStage === "Adult" ? "成虫" : spec.lifeStage);
      if(spec.preparations) add("保存", spec.preparations === "Pinned" ? "ピン留め" : spec.preparations);
      if(spec.typeStatus) add("タイプ", spec.typeStatus);
    }

    if(src.mediaLicense){
      var lic = src.licenseUrl
        ? '<a href="'+esc(src.licenseUrl)+'" target="_blank" rel="noopener">'+esc(src.mediaLicense)+'</a>'
        : esc(src.mediaLicense);
      add("ライセンス", lic, {raw: true});
    }
    if((entry.modifications||[]).length) add("加工", entry.modifications.join("、"));
    if(src.institutionRecordUrl){
      var recordLabel = isObservation ? "観察ページ" : "原レコード";
      add(recordLabel, '<a href="'+esc(src.institutionRecordUrl)+'" target="_blank" rel="noopener">📖 開く</a>', {raw: true});
    }
    if(rows.length === 0) return "";
    var rowsHTML = rows.map(function(r){
      return '<tr>'
        +   '<th style="text-align:right;padding:4px 8px;color:#56714e;font-weight:normal;white-space:nowrap;vertical-align:top">'+esc(r[0])+'</th>'
        +   '<td style="padding:4px 8px;color:#333;word-break:break-word">'+r[1]+'</td>'
        + '</tr>';
    }).join("");
    /* observation は緑系 (野外感)、museum は茶系 (curated 感) で button 色を分ける */
    var summaryStyle = isObservation
      ? 'cursor:pointer;display:inline-block;background:rgba(232,244,225,.85);border:1px solid #8fb05a;border-radius:14px;padding:4px 12px;font-size:11px;color:#3e6b2e;list-style:none;-webkit-user-select:none;user-select:none'
      : 'cursor:pointer;display:inline-block;background:rgba(255,255,255,.7);border:1px solid #c8b884;border-radius:14px;padding:4px 12px;font-size:11px;color:#56714e;list-style:none;-webkit-user-select:none;user-select:none';
    var summaryLabel = isObservation ? '📷 やせいのきろく' : '📋 ひょうほんの情報';
    return ''
      + '<details class="zukan-specimen-info" style="margin:10px 0 0;text-align:right">'
      +   '<summary style="'+summaryStyle+'">'+summaryLabel+'</summary>'
      +   '<table style="margin-top:8px;border-collapse:collapse;width:100%;background:rgba(0,0,0,.04);border-radius:6px;font-size:11px;text-align:left">'
      +     '<tbody>'+rowsHTML+'</tbody>'
      +   '</table>'
      + '</details>';
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
    /* レガシーマスター虫 (sex='u') 検出: スタブ表示 (♂♀ をきめるボタン主体) */
    if(global.Q4BReward && global.Q4BReward.isLegacyMasterUnknownSex && global.Q4BReward.isLegacyMasterUnknownSex(entry, sp)){
      return masterStubHTML(entry, sp, opts);
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
      html += breedingActionsHTML(entry, sp, opts);
      return html;
    }
    /* masterOnly 種は通常 detailHTML 上部にも常時 🎓 マスター達成記念バッジを表示 */
    if(sp && sp.masterOnly){
      html += '<div style="display:inline-block;background:#F5E8FF;border:1.5px solid #A06BD8;border-radius:99px;padding:3px 10px;font-size:12px;font-weight:800;color:#6B4A99;margin:0 0 6px">🎓 マスター達成</div>';
    }
    html += sexSummary(records);
    html += bestWorstHTML(records, sp);       /* SVG プレビュー + dimorphism note */
    html += bestTableHTML(records);           /* 2x2 ベスト表 (オス×メス × 大・小) */
    html += histogramHTML(records, sizeMm);
    html += recentListHTML(records, 5);
    html += specimenInfoHTML(sp);
    /* 自家育成セクション + 卵生成/放棄ボタン (前提クリア時のみ active) */
    html += rearedSectionHTML(opts.coll, sp);
    html += breedingActionsHTML(entry, sp, opts);
    return html;
  }

  /* レガシー sex='u' マスター虫 救済 UI (案2: ♂♀ をきめるボタン主体) */
  function masterStubHTML(entry, sp, opts){
    var name = (sp && sp.jaName) || (sp && sp.id) || "";
    var maxSize = (entry && entry.max) || 0;
    var pickCb = opts.onPickSex || "";
    var spId = (sp && sp.id) || "";
    var html = '';
    if(opts.coll && opts.favCallback){
      var fav = global.Q4BReward.favoriteButtonHTML(opts.coll, spId, opts.favCallback+"('"+spId+"')");
      if(fav) html += '<div style="position:absolute;top:6px;right:8px;z-index:5">'+fav+'</div>';
    }
    html += '<div style="text-align:center;padding:14px 6px">';
    html += '<div style="display:inline-block;background:#F5E8FF;border:1.5px solid #A06BD8;border-radius:99px;padding:3px 14px;font-size:13px;font-weight:800;color:#6B4A99;margin-bottom:8px">🎓 マスター達成記念</div>';
    html += '<div style="font-size:18px;font-weight:800;color:#2A3D2C;margin-bottom:4px">'+esc(name)+'</div>';
    if(sp && sp.rarity) html += '<div style="font-size:13px;color:#6B7A5E;margin-bottom:4px">'+esc(sp.rarity)+'</div>';
    if(maxSize) html += '<div style="font-size:13px;color:#6B7A5E;margin-bottom:10px">つかまえた おおきさ: '+maxSize+'mm</div>';
    if(pickCb){
      html += '<button type="button" onclick="'+pickCb+'(\''+spId+'\')" style="border:none;border-radius:12px;padding:12px 24px;font-size:15px;font-weight:800;font-family:inherit;color:#fff;background:#A06BD8;box-shadow:0 3px 0 #6B4A99;cursor:pointer">♂♀ をきめる</button>';
      html += '<div style="font-size:11px;color:#6B7A5E;margin-top:8px">きめると 反対せいべつの たまごが もらえるよ</div>';
    } else {
      html += '<div style="font-size:13px;color:#CF7F14">(♂♀ 選択 ハンドラが 設定されていません)</div>';
    }
    html += '</div>';
    return html;
  }

  /* 自家育成個体 (reared:true) のサマリセクション */
  function rearedSectionHTML(coll, sp){
    if(!coll || !sp || !global.Q4BReward || !global.Q4BReward.rearedRecords) return "";
    var recs = global.Q4BReward.rearedRecords(coll, sp.id);
    if(!recs.length) return "";
    var rows = recs.slice(0,8).map(function(r){
      var sex = r.sex==="m"?"♂":r.sex==="f"?"♀":"";
      var bornAt = r.bornAt||"";
      var d = r.d||"";
      var span = "";
      if(bornAt && d){
        var d1=new Date(bornAt), d2=new Date(d);
        var days=Math.max(0, Math.round((d2-d1)/86400000));
        if(days>0) span = ' ('+days+'日間)';
      }
      return '<div style="font-size:12px;color:#2A3D2C;padding:2px 0">🐛→🪲 '+sex+' '+r.s+'mm　'+(bornAt?bornAt+' 産卵 → ':'')+d+' 孵化'+span+'</div>';
    }).join("");
    return ''
      + '<div style="background:#EAF6E0;border-radius:10px;padding:8px 10px;margin:8px 0">'
      +   '<div style="font-size:13px;font-weight:800;color:#4A9B3A;margin-bottom:4px">🐣 きみが そだてた子: '+recs.length+'匹</div>'
      +   rows
      + '</div>';
  }

  /* 卵生成 / 放棄 ボタン (Q4BReward + Q4BBreeding が必要) */
  function breedingActionsHTML(entry, sp, opts){
    if(!global.Q4BReward || !global.Q4BBreeding) return "";
    if(!opts.coll || !sp) return "";
    var R = global.Q4BReward;
    if(!sp.metamorphosis) return "";   /* 卵対象外 order */
    var canLay = R.canLayEgg(opts.coll, sp);
    var fossilNow = R.fossilOf();
    var cost = R.eggCost(sp);
    var hasM = entry.records && entry.records.some(function(r){return r.sex==="m";});
    var hasF = entry.records && entry.records.some(function(r){return r.sex==="f";});
    var hasPair = hasM && hasF;
    var disabledReason = null;
    if(!hasPair) disabledReason = "♂と♀の りょうほうの きろくが ひつようだよ";
    else if(fossilNow < cost) disabledReason = "かけらが "+(cost-fossilNow)+" たりない";
    else if(!canLay) disabledReason = "いま 同じむしを そだててるか、上限 3 に とどいてるよ";
    var spIdStr = (sp && sp.id) || "";
    var layCb = opts.onLayEgg || "";
    var btn = '';
    if(layCb){
      var disabled = !canLay;
      btn = '<button type="button"'+(disabled?' disabled':'')
        + ' onclick="'+layCb+'(\''+spIdStr+'\')"'
        + ' style="display:block;width:100%;margin:8px 0 0;border:none;border-radius:12px;padding:11px;font-size:15px;font-weight:800;font-family:inherit;color:#fff;background:'+(disabled?'#B9C4A8':'#F2A33C')+';box-shadow:0 3px 0 '+(disabled?'#9CA88A':'#CF7F14')+';cursor:'+(disabled?'not-allowed':'pointer')+';opacity:'+(disabled?'.85':'1')+'">'
        + '🥚 たまごを 産ませる (🪨 '+cost+')'
        + '</button>'
        + (disabled && disabledReason ? '<div style="font-size:11px;color:#CF7F14;margin-top:2px;text-align:center">'+disabledReason+'</div>' : '');
    }
    /* 当該種の卵が育成中: 孵化サブ動線 / 進捗表示 / 放棄ボタン */
    var ownEgg = null;
    var bs = global.QuestSave && global.QuestSave.breedingOf ? global.QuestSave.breedingOf(global.QuestSave.currentProfile()) : null;
    if(bs && bs.eggs){
      for(var i=0;i<bs.eggs.length;i++){ if(bs.eggs[i].id===spIdStr){ ownEgg = bs.eggs[i]; break; } }
    }
    var hatchBtn = '';
    var progressLine = '';
    if(ownEgg){
      var p = ownEgg.target>0 ? Math.min(100,Math.round((ownEgg.progress/ownEgg.target)*100)) : 0;
      var ready = ownEgg.progress >= ownEgg.target;
      progressLine = '<div style="background:#F4F8E8;border-radius:10px;padding:6px 10px;margin:6px 0;font-size:12px;color:#2A3D2C">'
        + '🥚 そだち中: '+ownEgg.progress+'/'+ownEgg.target+' ('+p+'%)'
        + '<div style="background:#EAEFE0;border-radius:99px;height:6px;margin-top:3px;overflow:hidden"><div style="width:'+p+'%;height:100%;background:#F2A33C"></div></div>'
        + '</div>';
      if(ready && opts.onHatchEgg){
        hatchBtn = '<button type="button" onclick="'+opts.onHatchEgg+'(\''+spIdStr+'\')" style="display:block;width:100%;margin:6px 0 0;border:none;border-radius:12px;padding:11px;font-size:15px;font-weight:800;font-family:inherit;color:#fff;background:#F2A33C;box-shadow:0 3px 0 #CF7F14;cursor:pointer">✨ タップでかえす</button>';
      }
    }
    var abandonBtn = '';
    if(opts.onAbandonEgg && ownEgg){
      abandonBtn = '<button type="button" onclick="'+opts.onAbandonEgg+'(\''+spIdStr+'\')" style="display:block;width:100%;margin:6px 0 0;border:1.5px solid #B9C4A8;border-radius:10px;padding:7px;font-size:12px;font-weight:700;font-family:inherit;color:#6B7A5E;background:#FFFDF4;cursor:pointer">🥚 たまごを すてる (返金なし)</button>';
    }
    /* 既に育成中なら産卵ボタンは出さない (canLayEgg で false になるが UI は出ない方が分かりやすい) */
    if(ownEgg) btn = '';
    return progressLine + hatchBtn + btn + abandonBtn;
  }

  /* モーダル open 直後にホスト側から呼ぶ: 該当 root 内の museum 写真に lightbox を装着。
     呼出はホスト側 (kanji modal/keisan render/eitango showSpec/boss detail) で 1 行。 */
  function attachLightbox(root){
    if(global.Q4BZukanLightbox && global.Q4BZukanLightbox.attach) global.Q4BZukanLightbox.attach(root || document.body);
  }

  global.Q4BZukan = {
    detailHTML: detailHTML,
    attachLightbox: attachLightbox,
    histogramHTML: histogramHTML,
    sexSummary: sexSummary,
    bestTableHTML: bestTableHTML,
    bestWorstHTML: bestWorstHTML,
    recentListHTML: recentListHTML,
    favoriteToggleHTML: favoriteToggleHTML,
    specimenInfoHTML: specimenInfoHTML,
  };
})(window);
