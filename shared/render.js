(function(global){
  "use strict";
  /* Quest4Bugs shared insect renderer (archetype SVG, recolored per species).
     Extracted from the original keisan game so every game draws bugs the same way. */
  /* base 4-winged butterfly (forewings=c1, hindwings=c2, body, antennae) */
  function wings(c1,c2,K,leg){
    return '<path d="M47 50 C30 18 8 16 7 33 C6 47 28 56 46 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M53 50 C70 18 92 16 93 33 C94 47 72 56 54 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M47 58 C32 60 16 70 20 82 C24 92 41 84 49 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M53 58 C68 60 84 70 80 82 C76 92 59 84 51 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<circle cx="27" cy="36" r="5" fill="'+c2+'"/><circle cx="73" cy="36" r="5" fill="'+c2+'"/>'
    +'<ellipse cx="50" cy="56" rx="5.5" ry="17" fill="'+K+'"/>'
    +'<path d="M47 41 C43 33 39 29 34 26 M53 41 C57 33 61 29 66 26" '+leg+'/>';
  }
  function scaleG(s,inner){ return '<g transform="translate(50 54) scale('+s+') translate(-50 -54)">'+inner+'</g>'; }
  /* butterfly archetypes: same wing base, distinct silhouette per family group */
  /* sex='f' のとき、color/both 系のメスは輝く翅色を控えめに(c2で代替)。
     ゼフィルス・メスアカ系で「オスは輝く緑/青、メスは褐色」が表現される。 */
  function butterfly(t,c1,c2,K,leg,sex){
    var wc1 = (sex==='f') ? c2 : c1;   /* メスは翅本体を鈍色に */
    if(t==="ageha"){ /* swallowtail: large wings + hindwing tails */
      return '<path d="M33 80 C29 89 26 95 23 99 M67 80 C71 89 74 95 77 99" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +scaleG(1.07,wings(wc1,c2,K,leg));
    }
    if(t==="tateha"){ /* nymphalid: broad wings + forewing eyespots */
      return scaleG(1.02,wings(wc1,c2,K,leg))
        +'<circle cx="24" cy="34" r="3.2" fill="'+K+'"/><circle cx="24" cy="34" r="1.3" fill="#fff"/>'
        +'<circle cx="76" cy="34" r="3.2" fill="'+K+'"/><circle cx="76" cy="34" r="1.3" fill="#fff"/>';
    }
    if(t==="shijimi"){ /* small lycaenid: compact + tiny tails */
      return scaleG(0.72,wings(wc1,c2,K,leg))
        +'<path d="M41 76 l-2 6 M59 76 l2 6" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>';
    }
    if(t==="seseri"){ /* skipper: stout body + swept wings + hooked antennae */
      return scaleG(0.8,wings(wc1,c2,K,leg))
        +'<ellipse cx="50" cy="58" rx="7.5" ry="14" fill="'+K+'"/>'
        +'<path d="M44 42 C39 34 35 32 32 35 M56 42 C61 34 65 32 68 35" '+leg+'/>';
    }
    if(t==="ga"){ /* moth: roof-folded wings + fuzzy body */
      return '<path d="M50 38 C28 40 14 60 18 80 C30 80 44 70 50 56 Z" fill="'+wc1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M50 38 C72 40 86 60 82 80 C70 80 56 70 50 56 Z" fill="'+wc1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M30 72 h40" stroke="'+c2+'" stroke-width="3" opacity=".8"/>'
        +'<ellipse cx="50" cy="54" rx="7" ry="18" fill="'+K+'"/>'
        +'<path d="M47 38 C42 30 36 27 30 27 M53 38 C58 30 64 27 70 27" '+leg+'/>'
        +'<circle cx="46" cy="40" r="2.2" fill="#fff"/><circle cx="54" cy="40" r="2.2" fill="#fff"/>';
    }
    return wings(c1,c2,K,leg); /* chou: default */
  }
  /* ===== Phase1: 種ごとの模様・サイズ（パラメトリック強化） =====
     archetype の本体だ円 box に模様を重ね、size で全体を拡縮する。
     データ(jaName/groupJa)から deriveParams で導出し、色違いだけの状態を解消する。 */
  var BODYBOX={  /* archetype -> [cx,cy,rx,ry]（本体のだ円目安。脚や頭は含めない） */
    kabuto:[56,58,24,19], kuwagata:[58,58,22,18], kogane:[50,56,25,22],
    tamamushi:[50,57,14,27], osamushi:[50,64,14,23], kamikiri:[50,60,13,28],
    other:[50,58,21,25], semi:[50,55,16,25], hachi:[50,60,19,23],
    batta:[50,58,25,10], mizu:[50,54,21,26], hotaru:[50,52,16,25]
  };
  var BFLY={chou:1,ageha:1,tateha:1,shijimi:1,seseri:1,ga:1};
  function _inEll(rx,ry,offs){ var o=[]; for(var i=0;i<offs.length;i++){ var dx=offs[i][0]*rx,dy=offs[i][1]*ry;
    if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1.02)o.push([dx,dy]); } return o; }
  function patternMarks(box,kind,color){
    var cx=box[0],cy=box[1],rx=box[2],ry=box[3],s='';
    if(kind==='spots'){
      var r=Math.max(2,Math.min(rx,ry)*0.22);
      _inEll(rx*0.78,ry*0.8,[[-.5,-.45],[.5,-.45],[0,-.12],[-.55,.22],[.55,.22],[0,.52],[0,-.72]]).forEach(function(d){
        s+='<circle cx="'+(cx+d[0]).toFixed(1)+'" cy="'+(cy+d[1]).toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+color+'" opacity=".82"/>'; });
    }else if(kind==='stripes'){
      [-.55,-.2,.15,.5].forEach(function(f){ var dy=f*ry, hw=rx*Math.sqrt(Math.max(0,1-f*f))*0.92;
        s+='<path d="M'+(cx-hw).toFixed(1)+' '+(cy+dy).toFixed(1)+' h'+(2*hw).toFixed(1)+'" stroke="'+color+'" stroke-width="'+Math.max(2,ry*0.16).toFixed(1)+'" stroke-linecap="round" opacity=".8"/>'; });
    }else if(kind==='bands'){
      [-.25,.28].forEach(function(f){ var dy=f*ry, hw=rx*Math.sqrt(Math.max(0,1-f*f))*0.95;
        s+='<path d="M'+(cx-hw).toFixed(1)+' '+(cy+dy).toFixed(1)+' h'+(2*hw).toFixed(1)+'" stroke="'+color+'" stroke-width="'+Math.max(4,ry*0.4).toFixed(1)+'" opacity=".72"/>'; });
    }else if(kind==='eyespot'){
      [[-.48,-.12],[.48,-.12]].forEach(function(o){ var x=cx+o[0]*rx,y=cy+o[1]*ry,R=Math.min(rx,ry)*0.34;
        s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+R.toFixed(1)+'" fill="'+color+'"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(R*0.42).toFixed(1)+'" fill="#fff"/>'; });
    }else if(kind==='metallic'){
      s+='<path d="M'+(cx-rx*0.45).toFixed(1)+' '+(cy-ry*0.4).toFixed(1)+' Q'+cx+' '+(cy-ry*0.05).toFixed(1)+' '+(cx-rx*0.18).toFixed(1)+' '+(cy+ry*0.5).toFixed(1)+'" stroke="#fff" stroke-width="3" fill="none" opacity=".38" stroke-linecap="round"/>';
    }
    return s;
  }
  var WINGC=[[27,37],[73,37],[31,72],[69,72]];  /* 蝶の翅中心(上左右・下左右) */
  function wingMarks(kind,color){ var s='';
    if(kind==='spots'){ WINGC.forEach(function(w){ s+='<circle cx="'+w[0]+'" cy="'+w[1]+'" r="3" fill="'+color+'" opacity=".82"/>'; }); }
    else if(kind==='eyespot'){ WINGC.forEach(function(w){ s+='<circle cx="'+w[0]+'" cy="'+w[1]+'" r="4.2" fill="'+color+'"/><circle cx="'+w[0]+'" cy="'+w[1]+'" r="1.8" fill="#fff"/>'; }); }
    else if(kind==='bands'){ s+='<path d="M12 40 Q27 32 46 46" stroke="'+color+'" stroke-width="3.5" fill="none" opacity=".7"/><path d="M88 40 Q73 32 54 46" stroke="'+color+'" stroke-width="3.5" fill="none" opacity=".7"/>'; }
    else if(kind==='stripes'){ s+='<path d="M14 30 L44 50 M16 41 L45 57" stroke="'+color+'" stroke-width="2.4" opacity=".7"/><path d="M86 30 L56 50 M84 41 L55 57" stroke="'+color+'" stroke-width="2.4" opacity=".7"/>'; }
    else if(kind==='metallic'){ s+='<path d="M16 34 Q28 30 44 48" stroke="#fff" stroke-width="2.6" fill="none" opacity=".4"/><path d="M84 34 Q72 30 56 48" stroke="#fff" stroke-width="2.6" fill="none" opacity=".4"/>'; }
    return s;
  }
  function deriveParams(sp){
    var nm=sp.jaName||sp.id||'', g=sp.groupJa||'', pattern='none', pcolor='#2A3D2C', size=1;
    if(/トラ|縞|シマ/.test(nm)) pattern='stripes';
    else if(/ホシ|星|マダラ|斑|ブチ/.test(nm)) pattern='spots';
    else if(/ジャノメ/.test(nm)||g==='ジャノメ') pattern='eyespot';
    else if(/ルリ|瑠璃|ニジ|虹|タマムシ|玉虫|ミドリ|アオ|青|コガネ|黄金/.test(nm)){ pattern='metallic'; pcolor='#ffffff'; }
    else if(g==='ヒョウモン'||g==='ハンミョウ') pattern='spots';
    else if(g==='タテハ'||g==='マダラチョウ') pattern='bands';
    else if(/カミキリ/.test(g)) pattern='spots';
    if(sp.renderer==='tentou') pattern='none';   /* テントウは元描画で斑点あり→重複回避 */
    if(/ヘラクレス|ゴライアス|ギラファ|テイオウ|オオ|巨大/.test(nm)) size=1.12;
    if(/ヒメ|チビ|マメ/.test(nm)) size=0.9;
    if(g==='シジミ'||g==='ゼフィルス') size=Math.min(size,0.94);
    /* Phase2: 部位variant（archetypeごとに解釈。クワガタ大アゴ・カブトのツノ・カミキリ触角） */
    var variant='', rd=sp.renderer;
    if(rd==='kabuto') variant=/ヘラクレス|ネプチューン|サタン/.test(nm)?'long':(/コーカサス|アトラス|ヒルス|モーレンカンプ|ゾウカブト/.test(nm)?'three':'single');
    else if(rd==='kuwagata') variant=/ノコギリ/.test(nm)?'saw':(/ヒラタ/.test(nm)?'flat':(/ミヤマ/.test(nm)?'miyama':(/ギラファ|マンディブラリス/.test(nm)?'giraffe':'standard')));
    else if(rd==='kamikiri'||rd==='kamakiri') variant=/ヒゲナガ/.test(nm)?'longant':'';
    return {pattern:pattern, patternColor:pcolor, size:size, variant:variant};
  }
  /* カブトのツノ（頭は左 ~37,50。ツノは左上へ）
     性差: '_f' suffix が付くとメス扱いで角を描かない（メスカブトは角がない）。
           '_m' suffix も同様に処理して既存 variant ロジックに分岐させる。 */
  function kabutoHorn(v,c2,K,leg){
    var sexF = v && /(_f)$/.test(v);
    var sexM = v && /(_m)$/.test(v);
    var base = v ? v.replace(/_[mf]$/,'') : v;
    if(sexF){
      /* メスカブト: 角なし、頭部に小さな突起だけで丸い印象 */
      return '<path d="M34 44 l-3 -3 M34 56 l-3 3" stroke="'+K+'" stroke-width="2" stroke-linecap="round" fill="none"/>';
    }
    if(base==='long'){ /* ヘラクレス系: 長い上下のはさみツノ */
      return '<path d="M35 44 C24 34 15 23 7 10 C14 10 20 14 25 20 C31 28 37 37 41 43 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/>'
        +'<path d="M34 56 C24 55 15 49 9 39 C16 40 23 44 29 49 C33 52 37 53 41 54 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/>'
        +'<path d="M17 19 l-4 1 M14 41 l-3 -2" '+leg+'/>';
    }
    if(base==='three'){ /* コーカサス系: 3本ツノ */
      return '<path d="M34 46 C26 36 22 26 20 14 L27 16 C29 26 33 35 40 43 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M31 43 C23 37 17 31 12 23" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="M33 54 C25 53 18 49 12 43" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>';
    }
    return '<path d="M34 46 C26 36 22 26 20 14 L27 16 C29 26 33 35 40 43 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
      +'<path d="M20 14 l-5 -4 M20 14 l1 -7" '+leg+'/>';
  }
  /* クワガタの大アゴ（頭は左 ~38,52。大アゴは左へ）
     性差: '_f' でメス扱い。メスは大顎が短く小さい。 */
  function kuwaMandible(v,c2,K){
    var sexF = v && /(_f)$/.test(v);
    var base = v ? v.replace(/_[mf]$/,'') : v;
    if(sexF){
      /* メスクワガタ: 大顎は短く直線的、内歯なし */
      return '<path d="M32 46 C26 44 22 43 20 43" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<path d="M32 57 C26 59 22 60 20 60" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<path d="M20 43 l-2 -1 M20 60 l-2 1" stroke="'+K+'" stroke-width="1.8" stroke-linecap="round"/>';
    }
    if(base==='saw'){ /* ノコギリ: 細長く湾曲・内歯 */
      return '<path d="M31 45 C18 38 9 28 12 14 C20 20 27 31 36 39" fill="none" stroke="'+c2+'" stroke-width="5.5" stroke-linecap="round"/>'
        +'<path d="M30 58 C16 62 6 58 6 44 C15 50 24 52 33 49" fill="none" stroke="'+c2+'" stroke-width="5.5" stroke-linecap="round"/>'
        +'<path d="M19 26 l5 2 M14 35 l5 1 M15 50 l5 -2 M11 45 l5 -1" stroke="'+K+'" stroke-width="2" stroke-linecap="round"/>';
    }
    if(base==='flat'){ /* ヒラタ: 太く平行で短め */
      return '<path d="M32 46 C22 42 13 40 7 39" fill="none" stroke="'+c2+'" stroke-width="7" stroke-linecap="round"/>'
        +'<path d="M32 57 C22 59 13 60 7 60" fill="none" stroke="'+c2+'" stroke-width="7" stroke-linecap="round"/>'
        +'<path d="M7 39 l-2 2 M7 60 l-2 -2 M18 42 l3 2 M18 58 l3 -2" stroke="'+K+'" stroke-width="2" stroke-linecap="round"/>';
    }
    if(base==='miyama'){ /* ミヤマ: 大きく湾曲＋頭部の張り出し */
      return '<path d="M31 44 C19 36 13 23 18 11 C24 18 29 30 36 39" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M30 59 C18 63 10 57 9 46 C17 51 25 53 33 50" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M20 21 l5 3 M14 49 l5 -2" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>'
        +'<path d="M40 42 C38 38 33 38 32 42 M40 62 C38 66 33 66 32 62" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>';
    }
    if(base==='giraffe'){ /* ギラファ: 非常に長く細い大アゴ */
      return '<path d="M32 47 C20 42 9 37 2 31 C10 39 21 44 36 48" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<path d="M32 57 C20 60 9 63 2 68 C10 61 21 56 36 53" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<path d="M5 33 l3 -2 M5 66 l3 2 M16 41 l3 1 M16 58 l3 -1" stroke="'+K+'" stroke-width="2" stroke-linecap="round"/>';
    }
    return '<path d="M31 45 C21 38 15 29 15 18 C22 23 28 31 36 39" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
      +'<path d="M30 58 C20 62 13 60 9 50 C17 53 24 52 33 49" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
      +'<path d="M22 30 l6 1 M18 52 l5 -3" stroke="'+K+'" stroke-width="2.5" stroke-linecap="round"/>';
  }

  function bugSVG(b){
  var c1=b.c1,c2=b.c2,K="#2A3D2C",inner="";
  /* メス時は主色 c1 を鈍色に。トンボ・カマキリ・バッタ等のメスは派手な縄張り色を持たない傾向。
     kabuto/kuwagata は b.sex==='f' で個別パスを描いているので影響しない。
     chou/ga/shijimi 等は butterfly() 内で個別 sex 分岐。 */
  if(b.sex==='f' && b.t!=='kabuto' && b.t!=='kuwagata' && b.t!=='chou' && b.t!=='ageha' && b.t!=='tateha' && b.t!=='shijimi' && b.t!=='seseri' && b.t!=='ga'){
    c1 = _muteFemale(c1);
  }
  var leg='stroke="'+K+'" stroke-width="3" stroke-linecap="round" fill="none"';
  if(b.t==="kabuto"){
    if(b.sex==='f'){
      /* メスカブト専用: 角なし、体は少し横に平ぺったく、頭部は小ぶり。
         オスSVGの「縮小+角消去」ではなく、形状から描き起こす。 */
      inner='<path d="M40 71 l-9 11 M50 74 l-2 12 M62 71 l9 10 M44 60 l-13 4" '+leg+'/>'
        +'<ellipse cx="56" cy="60" rx="26" ry="18" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'   /* 本体: 横長平たい */
        +'<path d="M56 43 L58 76" stroke="'+K+'" stroke-width="1.6" opacity=".55"/>'                   /* 中央線(薄め) */
        +'<ellipse cx="36" cy="52" rx="11" ry="9" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5"/>'  /* 頭(小) */
        +'<path d="M30 47 l-4 -4 M30 56 l-4 4" stroke="'+K+'" stroke-width="2" stroke-linecap="round" fill="none"/>'  /* 短い触角 */
        +'<circle cx="34" cy="52" r="2.1" fill="#fff"/>';
    } else {
      inner='<path d="M40 70 l-9 11 M50 74 l-2 12 M62 71 l9 10 M44 60 l-13 4" '+leg+'/>'
        +'<ellipse cx="56" cy="58" rx="25" ry="20" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M56 40 L58 76" stroke="'+K+'" stroke-width="2.5"/>'
        +'<ellipse cx="37" cy="50" rx="12" ry="10" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +kabutoHorn(b.variant,c2,K,leg)
        +'<circle cx="34" cy="51" r="2.4" fill="#fff"/>';
    }
  }else if(b.t==="kuwagata"){
    if(b.sex==='f'){
      /* メスクワガタ専用: 大顎が短く直線的、本体はやや丸め、頭部小ぶり */
      inner='<path d="M44 72 l-8 11 M56 75 l0 12 M66 70 l9 9 M46 62 l-14 5" '+leg+'/>'
        +'<ellipse cx="58" cy="60" rx="22" ry="18" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'    /* 本体: 丸めの楕円 */
        +'<path d="M58 43 L59 76" stroke="'+K+'" stroke-width="1.6" opacity=".55"/>'                    /* 薄い中央線 */
        +'<ellipse cx="40" cy="53" rx="11" ry="10" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5"/>'   /* 頭(小) */
        +'<path d="M32 47 C26 45 22 44 19 44" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'  /* 短い大顎 上 */
        +'<path d="M32 59 C26 61 22 62 19 62" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'  /* 短い大顎 下 */
        +'<path d="M19 44 l-2 -1 M19 62 l-2 1" stroke="'+K+'" stroke-width="1.8" stroke-linecap="round"/>'
        +'<circle cx="38" cy="53" r="2.1" fill="#fff"/>';
    } else {
      inner='<path d="M44 72 l-8 11 M56 75 l0 12 M66 70 l9 9 M46 62 l-14 5" '+leg+'/>'
        +'<ellipse cx="58" cy="58" rx="23" ry="19" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M58 41 L59 75" stroke="'+K+'" stroke-width="2.5"/>'
        +'<ellipse cx="38" cy="52" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +kuwaMandible(b.variant,c2,K)
        +'<circle cx="36" cy="52" r="2.4" fill="#fff"/>';
    }
  }else if(b.t==="chou"||b.t==="ageha"||b.t==="tateha"||b.t==="shijimi"||b.t==="seseri"||b.t==="ga"){
    inner=butterfly(b.t,c1,c2,K,leg,b.sex);
  }else if(b.t==="tombo"){
    inner='<ellipse cx="29" cy="42" rx="21" ry="6.5" fill="'+c2+'" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(-13 29 42)"/>'
    +'<ellipse cx="71" cy="42" rx="21" ry="6.5" fill="'+c2+'" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(13 71 42)"/>'
    +'<ellipse cx="31" cy="53" rx="18" ry="5.5" fill="'+c2+'" opacity=".75" stroke="'+K+'" stroke-width="2.5" transform="rotate(-22 31 53)"/>'
    +'<ellipse cx="69" cy="53" rx="18" ry="5.5" fill="'+c2+'" opacity=".75" stroke="'+K+'" stroke-width="2.5" transform="rotate(22 69 53)"/>'
    +'<rect x="46.5" y="36" width="7" height="50" rx="3.5" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M47 50 h6 M47 58 h6 M47 66 h6 M47 74 h6" stroke="'+K+'" stroke-width="2"/>'
    +'<circle cx="50" cy="28" r="8" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="46" cy="26" r="3.4" fill="'+K+'"/><circle cx="54" cy="26" r="3.4" fill="'+K+'"/>';
  }else if(b.t==="semi"){
    inner='<ellipse cx="32" cy="62" rx="9" ry="24" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(18 32 62)"/>'
    +'<ellipse cx="68" cy="62" rx="9" ry="24" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(-18 68 62)"/>'
    +'<path d="M50 24 C64 24 70 38 68 54 C66 70 58 80 50 82 C42 80 34 70 32 54 C30 38 36 24 50 24 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M38 58 h24 M39 66 h22 M41 73 h18" stroke="'+c2+'" stroke-width="3.5" stroke-linecap="round"/>'
    +'<circle cx="38" cy="30" r="5" fill="'+K+'"/><circle cx="62" cy="30" r="5" fill="'+K+'"/>';
  }else if(b.t==="hachi"){
    inner='<ellipse cx="33" cy="34" rx="16" ry="9" fill="#EAF2F8" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(-22 33 34)"/>'
    +'<ellipse cx="67" cy="34" rx="16" ry="9" fill="#EAF2F8" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(22 67 34)"/>'
    +'<ellipse cx="50" cy="60" rx="20" ry="24" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M32 52 h36 M31 62 h38 M34 72 h32" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
    +'<circle cx="50" cy="32" r="11" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="46" cy="30" r="2.6" fill="'+K+'"/><circle cx="54" cy="30" r="2.6" fill="'+K+'"/>'
    +'<path d="M50 84 l0 6" stroke="'+K+'" stroke-width="3" stroke-linecap="round"/>';
  }else if(b.t==="tentou"){
    inner='<circle cx="50" cy="56" r="27" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 30 A27 27 0 0 1 50 83" fill="none" stroke="'+K+'" stroke-width="2.5"/>'
    +'<path d="M28 36 A26 16 0 0 1 72 36 L50 44 Z" fill="'+K+'"/>'
    +'<circle cx="38" cy="50" r="4.5" fill="'+c2+'"/><circle cx="62" cy="50" r="4.5" fill="'+c2+'"/>'
    +'<circle cx="34" cy="66" r="4.5" fill="'+c2+'"/><circle cx="66" cy="66" r="4.5" fill="'+c2+'"/>'
    +'<circle cx="50" cy="74" r="4.5" fill="'+c2+'"/>'
    +'<circle cx="42" cy="32" r="2.2" fill="#fff"/><circle cx="58" cy="32" r="2.2" fill="#fff"/>'
    +'<path d="M40 26 l-4 -7 M60 26 l4 -7" '+leg+'/>';
  }else if(b.t==="ari"){
    inner='<path d="M44 60 l-8 14 M52 62 l0 16 M60 60 l9 13 M46 50 l-12 -10 M54 50 l12 -9" '+leg+'/>'
    +'<ellipse cx="70" cy="60" rx="16" ry="12" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="48" cy="52" r="9" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="29" cy="46" r="12" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M24 36 C20 30 18 26 19 20 M33 35 C33 28 34 24 38 19" '+leg+'/>'
    +'<circle cx="26" cy="45" r="2.4" fill="#fff"/>';
  }else if(b.t==="batta"){
    inner='<path d="M64 62 L84 44 L79 70" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<ellipse cx="50" cy="58" rx="27" ry="11" fill="'+c1+'" stroke="'+K+'" stroke-width="3" transform="rotate(-7 50 58)"/>'
    +'<path d="M30 56 h36" stroke="'+c2+'" stroke-width="3" transform="rotate(-7 50 58)"/>'
    +'<circle cx="25" cy="48" r="9" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="23" cy="46" r="2.4" fill="'+K+'"/>'
    +'<path d="M28 41 C40 30 56 26 72 28 M36 66 l-4 12 M48 68 l-2 12" '+leg+'/>';
  }else if(b.t==="kamakiri"){
    inner='<path d="M56 32 C62 48 60 66 50 84" fill="none" stroke="'+c1+'" stroke-width="9" stroke-linecap="round"/>'
    +'<path d="M55 56 l16 -8 M53 68 l17 -4 M51 78 l14 4" '+leg+'/>'
    +'<path d="M52 40 L32 34 L40 48 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M33 35 L25 22" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
    +'<path d="M49 26 L62 22 L56 33 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<circle cx="52" cy="27" r="2.6" fill="'+K+'"/>'
    +'<path d="M58 22 l3 -9 M61 23 l7 -7" '+leg+'/>';
  }else if(b.t==="hotaru"){
    inner='<circle cx="50" cy="80" r="15" fill="#FFE873" opacity=".4"/>'
    +'<ellipse cx="50" cy="52" rx="17" ry="26" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 30 L50 70" stroke="'+K+'" stroke-width="2.5"/>'
    +'<path d="M34 44 h32" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
    +'<circle cx="50" cy="76" r="9" fill="#FFE873" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="50" cy="24" r="8" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M45 18 l-5 -8 M55 18 l5 -8 M35 50 l-10 6 M65 50 l10 6" '+leg+'/>';
  }else if(b.t==="mizu"){
    inner='<path d="M28 54 C13 58 7 68 9 80 M72 54 C87 58 93 68 91 80" fill="none" stroke="'+K+'" stroke-width="4.5" stroke-linecap="round"/>'
    +'<ellipse cx="50" cy="54" rx="22" ry="27" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 30 L50 78" stroke="'+K+'" stroke-width="2.5"/>'
    +'<path d="M36 44 h28 M37 58 h26" stroke="'+c2+'" stroke-width="3.5" stroke-linecap="round"/>'
    +'<path d="M40 30 C34 24 30 20 28 14 M60 30 C66 24 70 20 72 14" stroke="'+K+'" stroke-width="4" stroke-linecap="round" fill="none"/>'
    +'<circle cx="44" cy="33" r="2.4" fill="#fff"/><circle cx="56" cy="33" r="2.4" fill="#fff"/>';
  }else if(b.t==="kemushi"){
    inner='<circle cx="74" cy="60" r="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="62" cy="56" r="12" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="49" cy="58" r="13" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="36" cy="54" r="13" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="25" cy="48" r="13" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="21" cy="45" r="2.6" fill="'+K+'"/>'
    +'<path d="M20 37 l-4 -8 M28 36 l2 -9 M30 68 l0 7 M44 72 l0 7 M58 70 l0 7 M72 72 l0 7" '+leg+'/>';
  }else if(b.t==="dango"){
    inner='<path d="M19 68 A31 31 0 0 1 81 68 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M30 47 A40 40 0 0 0 30 68 M44 39 A60 60 0 0 0 42 68 M58 39 A60 60 0 0 1 60 68 M70 47 A40 40 0 0 1 70 68" fill="none" stroke="'+c2+'" stroke-width="3"/>'
    +'<circle cx="24" cy="62" r="2.6" fill="'+K+'"/>'
    +'<path d="M20 52 l-6 -6 M26 48 l-3 -8 M28 72 l0 5 M40 74 l0 5 M52 74 l0 5 M64 74 l0 5 M74 72 l0 5" '+leg+'/>';
  }else if(b.t==="kamikiri"){ /* longhorn beetle: elongate body + very long antennae */
    inner='<path d="M37 70 l-12 9 M50 76 l0 13 M63 70 l12 9 M36 54 l-14 1 M64 54 l14 1" '+leg+'/>'
    +'<ellipse cx="50" cy="60" rx="14" ry="30" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 32 L50 88" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="44" cy="52" rx="4" ry="9" fill="'+c2+'" opacity=".7"/>'
    +'<ellipse cx="50" cy="30" rx="9" ry="9" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +(b.variant==='longant'   /* ヒゲナガ: 体長を超える非常に長い触角 */
      ?'<path d="M46 25 C34 16 18 12 12 4 M54 25 C66 16 82 12 88 4" fill="none" stroke="'+c2+'" stroke-width="2.5" stroke-linecap="round"/>'
      :'<path d="M46 25 C40 12 50 6 40 -2 M54 25 C60 12 50 6 60 -2" fill="none" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>')
    +'<circle cx="46" cy="29" r="2" fill="#fff"/><circle cx="54" cy="29" r="2" fill="#fff"/>';
  }else if(b.t==="kogane"){ /* scarab / chafer: round domed body */
    inner='<path d="M30 74 l-9 8 M50 80 l0 10 M70 74 l9 8 M28 60 l-11 -1 M72 60 l11 -1" '+leg+'/>'
    +'<ellipse cx="50" cy="56" rx="26" ry="23" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 35 L50 79" stroke="'+K+'" stroke-width="2"/>'
    +'<path d="M30 44 A26 23 0 0 1 30 70" fill="none" stroke="'+c2+'" stroke-width="2" opacity=".5"/>'
    +'<ellipse cx="50" cy="32" rx="13" ry="8" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M42 28 l-4 -5 M58 28 l4 -5" '+leg+'/>'
    +'<circle cx="45" cy="32" r="2" fill="#fff"/><circle cx="55" cy="32" r="2" fill="#fff"/>';
  }else if(b.t==="tamamushi"){ /* jewel beetle: teardrop body with metallic stripes */
    inner='<path d="M40 70 l-10 9 M50 78 l0 11 M60 70 l10 9 M38 54 l-13 1 M62 54 l13 1" '+leg+'/>'
    +'<path d="M50 26 C67 36 64 72 50 88 C36 72 33 36 50 26 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M50 30 L50 84" stroke="'+c2+'" stroke-width="2.5" opacity=".85"/>'
    +'<path d="M43 40 C41 56 43 72 47 82 M57 40 C59 56 57 72 53 82" fill="none" stroke="'+c2+'" stroke-width="2.5" opacity=".85"/>'
    +'<ellipse cx="50" cy="27" rx="8" ry="6" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M46 22 l-4 -6 M54 22 l4 -6" '+leg+'/>';
  }else if(b.t==="osamushi"){ /* ground beetle: elongate, pinched pronotum, mandibles */
    inner='<path d="M37 70 l-12 10 M50 78 l0 12 M63 70 l12 10 M36 56 l-13 3 M64 56 l13 3" '+leg+'/>'
    +'<ellipse cx="50" cy="64" rx="15" ry="24" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 42 L50 86" stroke="'+K+'" stroke-width="2"/>'
    +'<path d="M42 42 Q50 34 58 42 Q57 51 50 52 Q43 51 42 42 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<ellipse cx="50" cy="33" rx="7" ry="7" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M46 29 l-5 -5 M54 29 l5 -5" '+leg+'/>'
    +'<path d="M45 27 C40 19 36 16 33 18 M55 27 C60 19 64 16 67 18" '+leg+'/>'
    +'<circle cx="47" cy="33" r="1.8" fill="#fff"/><circle cx="53" cy="33" r="1.8" fill="#fff"/>';
  }else{ /* other: generic beetle */
    inner='<path d="M34 72 l-9 10 M50 78 l0 11 M66 72 l9 10 M33 56 l-12 2 M67 56 l12 2" '+leg+'/>'
    +'<ellipse cx="50" cy="58" rx="22" ry="26" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 36 L50 82" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="42" cy="52" rx="5" ry="9" fill="'+c2+'" opacity=".8"/>'
    +'<ellipse cx="50" cy="30" rx="11" ry="8" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M44 24 l-6 -8 M56 24 l6 -8" '+leg+'/>'
    +'<circle cx="46" cy="29" r="2.2" fill="#fff"/><circle cx="54" cy="29" r="2.2" fill="#fff"/>';
  }
  /* 模様レイヤ（本体の上に重ねる。蝶は翅、その他は本体だ円に配置） */
  var pat='';
  if(b.pattern&&b.pattern!=='none'){
    if(BFLY[b.t]) pat=wingMarks(b.pattern, b.patternColor||K);
    else if(BODYBOX[b.t]) pat=patternMarks(BODYBOX[b.t], b.pattern, b.patternColor||K);
  }
  var content=inner+pat;
  if(b.size&&Math.abs(b.size-1)>0.001) content=scaleG(b.size, content);  /* サイズ拡縮（sheenは固定） */
  var sheen = b.shiny ? '<g opacity=".95"><path d="M79 16 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2 -5.4 -5.4 -2.2 5.4 -2.2 z" fill="#fff"/><path d="M22 30 l1.5 3.6 3.6 1.5 -3.6 1.5 -1.5 3.6 -1.5 -3.6 -3.6 -1.5 3.6 -1.5 z" fill="#fff" opacity=".85"/></g>' : '';
  return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+b.n+'">'+content+sheen+'</svg>';
}
  /* ---- 色違い(shiny): 色相を回し彩度を上げた別カラーで描く（全ゲーム共通） ---- */
  function _clamp(v,a,c){return Math.max(a,Math.min(c,v));}
  function _hexRgb(h){h=String(h||'').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return [parseInt(h.slice(0,2),16)||0,parseInt(h.slice(2,4),16)||0,parseInt(h.slice(4,6),16)||0];}
  function _rgbHex(r,g,b){function p(x){x=Math.round(_clamp(x,0,255)).toString(16);return x.length<2?'0'+x:x;}return '#'+p(r)+p(g)+p(b);}
  function _rgbHsl(r,g,b){r/=255;g/=255;b/=255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b),h,s,l=(mx+mn)/2;if(mx===mn){h=s=0;}else{var d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=(g-b)/d+(g<b?6:0);else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return [h,s,l];}
  function _hslRgb(h,s,l){h=(h%360+360)%360;var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r,g,b;if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}return [(r+m)*255,(g+m)*255,(b+m)*255];}
  function _shift(hex){var rgb=_hexRgb(hex),hsl=_rgbHsl(rgb[0],rgb[1],rgb[2]);var o=_hslRgb(hsl[0]+160,_clamp(hsl[1]*1.25+0.1,0,1),_clamp(hsl[2]+0.06,0.14,0.88));return _rgbHex(o[0],o[1],o[2]);}
  /* メス用に色を彩度/明度を落として地味目に。トンボ・蝶のメスはオスより色が控えめになる
     傾向を表現する。彩度50%・明度0.85倍で「地味だが鈍くなりすぎない」バランス。 */
  function _muteFemale(hex){
    var rgb=_hexRgb(hex), hsl=_rgbHsl(rgb[0],rgb[1],rgb[2]);
    var o=_hslRgb(hsl[0], hsl[1]*0.45, _clamp(hsl[2]*0.85, 0.18, 0.88));
    return _rgbHex(o[0],o[1],o[2]);
  }
  /* Phase3/4: 代表種の個別作画レジストリ。BESPOKE[id](c1,c2,shiny,kit)→本体SVG（<svg>とsheenは speciesSVG が付与）。
     未登録の種は従来の archetype+params(Phase1/2) にフォールバックする。 */
  var BESPOKE={};
  var _SHEEN='<g opacity=".95"><path d="M79 16 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2 -5.4 -5.4 -2.2 5.4 -2.2 z" fill="#fff"/><path d="M22 30 l1.5 3.6 3.6 1.5 -3.6 1.5 -1.5 3.6 -1.5 -3.6 -3.6 -1.5 3.6 -1.5 z" fill="#fff" opacity=".85"/></g>';
  var _KIT={ K:"#2A3D2C", leg:'stroke="#2A3D2C" stroke-width="3" stroke-linecap="round" fill="none"', scaleG:scaleG, patternMarks:patternMarks };
  /* 性的二型: sp.sexDimorphism と sp.sizeBySexMm から sex 別の描画パラメータを返す。
     - size: scale だけ調整 (体格差で描画スケール)
     - horn / mandible: variant に sex 情報を載せて kabuto / kuwagata renderer に分岐させる
     - color: 色配列をメス用にシフト (基本色を控えめに / コントラスト弱める)
     - wingless: メスのみ専用シルエットへ
     - both: color と size の両方
     未指定 sex (null/undefined) は中立スケール 1.0、色変更なし。 */
  function sexAdjust(sp, sex, cols, params){
    if(!sex || (sex!=='m' && sex!=='f')) return {cols:cols, sexScale:1.0, variantSuffix:'', winglessFemale:false};
    var dim = sp && sp.sexDimorphism;
    if(!dim) return {cols:cols, sexScale:1.0, variantSuffix:'', winglessFemale:false};
    var sizeScale = 1.0;
    var newCols = cols;
    var variantSuffix = '';
    var winglessFemale = false;
    /* 体格差: sizeBySexMm の中央値比から scale を計算。
       horn/mandible 種は「角・大顎の有無」が主要な性差で、本体サイズは似ているので
       scale クランプを控えめ([0.85, 1.1]) にする。
       size 純粋種(バッタ・カマキリ等)は大胆な scale 差を許す ([0.6, 1.35])。 */
    if((dim==='size' || dim==='both' || dim==='horn' || dim==='mandible') && sp.sizeBySexMm){
      var mMid = (sp.sizeBySexMm.m[0]+sp.sizeBySexMm.m[1])/2;
      var fMid = (sp.sizeBySexMm.f[0]+sp.sizeBySexMm.f[1])/2;
      if(mMid>0 && fMid>0){
        var avg = (mMid+fMid)/2;
        sizeScale = (sex==='m' ? mMid : fMid) / avg;
        if(dim==='horn' || dim==='mandible'){
          /* オス角込み全長で計算されるため scale 比は実体差を誇張する。控えめに */
          if(sizeScale<0.85) sizeScale=0.85;
          if(sizeScale>1.10) sizeScale=1.10;
        } else {
          if(sizeScale<0.6) sizeScale=0.6;
          if(sizeScale>1.35) sizeScale=1.35;
        }
      }
    }
    /* horn (カブト): variant に sex 情報を渡して角の描画を切替 */
    if(dim==='horn') variantSuffix = '_'+sex;
    /* mandible (クワガタ): 同じく大顎切替 */
    if(dim==='mandible') variantSuffix = '_'+sex;
    /* color: メスは色2(c2)を主体に、明度落とし */
    if((dim==='color' || dim==='both') && sex==='f'){
      newCols = [cols[1], cols[0]];   /* 色を入れ替えてメス用の落ち着いた色味 */
    }
    /* wingless: メスのみ専用 */
    if(dim==='wingless' && sex==='f') winglessFemale = true;
    return {cols:newCols, sexScale:sizeScale, variantSuffix:variantSuffix, winglessFemale:winglessFemale};
  }
  /* メス無翅シルエット (フユシャク・マイマイガ・ベッコウバチ系の簡易描画): 太い胴体のみ */
  function winglessFemaleSVG(c1, c2, K){
    var leg = 'stroke="'+K+'" stroke-width="3" stroke-linecap="round" fill="none"';
    return '<g>'
      + '<path d="M30 45 C28 65 32 80 50 82 C68 80 72 65 70 45 C68 38 60 33 50 33 C40 33 32 38 30 45 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="2.6"/>'
      + '<circle cx="50" cy="32" r="9" fill="'+c1+'" stroke="'+K+'" stroke-width="2.5"/>'   /* 頭 */
      + '<line x1="46" y1="25" x2="42" y2="18" '+leg+'/>'                                   /* 短い触角 */
      + '<line x1="54" y1="25" x2="58" y2="18" '+leg+'/>'
      + '<path d="M32 52 L20 56 M30 62 L18 66 M32 72 L22 78" '+leg+'/>'                     /* 左の脚 */
      + '<path d="M68 52 L80 56 M70 62 L82 66 M68 72 L78 78" '+leg+'/>'                     /* 右の脚 */
      + '<ellipse cx="50" cy="62" rx="14" ry="20" fill="'+c2+'" opacity=".25"/>'             /* 腹のふくらみ */
      + '</g>';
  }
  function speciesSVG(sp, shiny, sex){
    if(!sp)return "";
    var cols=sp.colors||["#7A6B3A","#2A3D2C"];
    if(shiny) cols=[_shift(cols[0]), _shift(cols[1])];
    /* 性的二型の調整 (sex が指定されたときのみ作用) */
    var sa = sexAdjust(sp, sex, cols, null);
    cols = sa.cols;
    /* メス無翅 (フユシャク・マイマイガ等) は専用シルエット */
    if(sa.winglessFemale){
      return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+(sp.jaName||sp.id||"")+' ♀">'
        + winglessFemaleSVG(cols[0], cols[1], "#2A3D2C")
        + '</svg>';
    }
    /* sex='f' で horn/mandible 系 + 全ての Lucanidae(クワガタ科) + カブト類 は
       bespoke (オスベースの個別 SVG) を使わず、汎用 bugSVG の sex='f' 専用パスに振り替える。
       sexDimorphism が未設定の bespoke 種でもメス時に「オスの縮小版」にならないよう
       family/groupJa からも判定する。 */
    var useBespoke = !!BESPOKE[sp.id];
    var isKuwaKabu = sp.family==='Lucanidae' || /カブト/.test(sp.groupJa||'');
    if(useBespoke && sex==='f' && (
        (sp.sexDimorphism==='horn' || sp.sexDimorphism==='mandible') || isKuwaKabu
      )){
      useBespoke = false;
    }
    var fn = useBespoke ? BESPOKE[sp.id] : null;
    var inner;
    if(fn){
      inner = fn(cols[0],cols[1],!!shiny,_KIT)+(shiny?_SHEEN:'');
    } else {
      var pr=deriveParams(sp);
      /* variantSuffix で renderer 側に性別情報を伝える (kabuto/kuwagata 等が _m/_f を読む) */
      var v = pr.variant + (sa.variantSuffix||'');
      inner = bugSVG({t:sp.renderer||"other", c1:cols[0], c2:cols[1], n:sp.jaName||sp.id||"", shiny:!!shiny,
        pattern:pr.pattern, patternColor:pr.patternColor, size:pr.size, variant:v, sex:sex||null});
      /* bugSVG が外側 svg を付けない設計なので付ける。元コードは bugSVG が svg 込みで返している場合があるので、その場合は素通し。 */
      if(inner && inner.indexOf('<svg')===0){
        /* bugSVG が svg 込みで返した場合: ラベル更新と sex scale 適用のため再ラップ */
        if(sex==='m' || sex==='f' || sa.sexScale!==1.0){
          var bodyOnly = inner.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
          var lab = (sp.jaName||sp.id||"") + (sex==='m'?' ♂':(sex==='f'?' ♀':''));
          if(sa.sexScale!==1.0){
            bodyOnly = '<g transform="translate(50 54) scale('+sa.sexScale+') translate(-50 -54)">'+bodyOnly+'</g>';
          }
          return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+lab+'">'+bodyOnly+'</svg>';
        }
        return inner;   /* sex 指定なし & scale 1.0 のときはそのまま */
      }
    }
    /* fn 経由(BESPOKE) または bugSVG が svg 込みでないとき */
    var label = (sp.jaName||sp.id||"") + (sex==='m'?' ♂':(sex==='f'?' ♀':''));
    if(sa.sexScale!==1.0){
      inner = '<g transform="translate(50 54) scale('+sa.sexScale+') translate(-50 -54)">'+inner+'</g>';
    }
    return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+label+'">'+inner+'</svg>';
  }
  /* 装飾版: ボス＝暗い背景＋金の二重枠、マスター＝淡金背景＋金枠。中身は少し縮めて枠内に収める。 */
  function decoSpecies(sp, shiny, sex){
    /* 強調背景の統一: ボス(roster全種含む)=赤枠 / マスター=金枠 / SS(でんせつ)=紺金枠。
       これで「背景テーマが無いボスがいる」不整合を解消（SSのボス種にも必ず枠が付く）。 */
    var isBoss = !!(sp && (sp.bossOnly || (global.Q4B_BOSS_IDS && sp.id && global.Q4B_BOSS_IDS[sp.id])));
    var kind = isBoss ? 'boss' : ((sp&&sp.masterOnly) ? 'master' : ((sp&&sp.rarity==='SS') ? 'ss' : ''));
    var full = speciesSVG(sp, shiny, sex);
    if(!kind) return full;
    var inner = full.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
    var bg;
    if(kind==='boss'){
      bg = '<rect x="2" y="2" width="96" height="96" rx="14" fill="#24060f"/>'
        +'<rect x="2" y="2" width="96" height="50" rx="14" fill="#3a0a18" opacity=".7"/>'
        +'<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="#E8B23A" stroke-width="2.5"/>'
        +'<rect x="7" y="7" width="86" height="86" rx="9" fill="none" stroke="#8a1530" stroke-width="1.4"/>';
    } else if(kind==='ss'){
      bg = '<rect x="2" y="2" width="96" height="96" rx="14" fill="#121a30"/>'
        +'<rect x="2" y="2" width="96" height="50" rx="14" fill="#22305a" opacity=".75"/>'
        +'<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="#F2D06B" stroke-width="2.6"/>'
        +'<rect x="7" y="7" width="86" height="86" rx="9" fill="none" stroke="#7a5f1c" stroke-width="1.3"/>';
    } else {
      bg = '<rect x="2" y="2" width="96" height="96" rx="14" fill="#fdf3d6"/>'
        +'<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="#E0A32E" stroke-width="2.6"/>'
        +'<rect x="7" y="7" width="86" height="86" rx="9" fill="none" stroke="#caa24a" stroke-width="1.2" opacity=".7"/>';
    }
    var scaled = '<g transform="translate(50 53) scale(0.8) translate(-50 -54)">'+inner+'</g>';
    return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+((sp&&(sp.jaName||sp.id))||'')+'">'+bg+scaled+'</svg>';
  }
  global.Q4BRender={ draw:bugSVG, species:speciesSVG, deco:decoSpecies,
    addBespoke:function(m){ if(m)for(var k in m)if(Object.prototype.hasOwnProperty.call(m,k))BESPOKE[k]=m[k]; } };
})(window);
