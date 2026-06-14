/* Quest4Bugs 代表種の個別作画（bespoke）。Q4BRender.addBespoke で登録。
   各関数 (c1,c2,shiny,kit) は本体SVG文字列を返す（<svg>ラッパとsheenは render 側が付与）。
   小さく表示されるため、シルエット＋象徴的特徴＋配色で見分けを優先する。 */
(function(g){
  if(!g.Q4BRender||!g.Q4BRender.addBespoke) return;
  var add=g.Q4BRender.addBespoke;

  add({
    /* ヘラクレスオオカブト: 淡い上翅＋黒い大ツノ(上下のはさみ)が象徴 */
    hercules_beetle:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M46 80 l-10 11 M60 84 l-2 12 M72 80 l11 9 M44 66 l-15 3 M76 66 l14 3" '+leg+'/>'
        +'<ellipse cx="60" cy="64" rx="27" ry="22" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M60 44 L60 86" stroke="'+K+'" stroke-width="2.4"/>'
        +'<ellipse cx="50" cy="57" rx="2.8" ry="3.4" fill="'+c2+'"/><ellipse cx="69" cy="55" rx="2.6" ry="3.2" fill="'+c2+'"/>'
        +'<ellipse cx="59" cy="73" rx="2.6" ry="3" fill="'+c2+'"/><ellipse cx="73" cy="70" rx="2.4" ry="2.8" fill="'+c2+'"/>'
        +'<ellipse cx="40" cy="55" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M40 47 C26 35 14 25 9 12 C13 11 18 15 23 21 C29 28 34 36 39 43" fill="none" stroke="'+c2+'" stroke-width="6.5" stroke-linecap="round"/>'
        +'<path d="M9 12 C7 16 8 22 13 26" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="M19 30 l5 2" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>'
        +'<ellipse cx="30" cy="60" rx="7" ry="7" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M27 56 C18 51 12 44 10 35 C16 38 23 45 31 51" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +'<circle cx="28" cy="60" r="2" fill="#fff"/>';
    },
    /* ニジイロクワガタ: クワガタ体型＋虹色の金属光沢 */
    rainbow_stag_beetle:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M44 72 l-8 11 M56 75 l0 12 M66 70 l9 9 M46 62 l-14 5" '+leg+'/>'
        +'<ellipse cx="58" cy="58" rx="24" ry="20" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M58 40 L59 76" stroke="'+K+'" stroke-width="2.4"/>'
        +'<path d="M40 48 C52 44 66 46 75 54" fill="none" stroke="'+c2+'" stroke-width="3" opacity=".7"/>'
        +'<path d="M40 60 C52 64 66 64 76 58" fill="none" stroke="#FFE08A" stroke-width="2.4" opacity=".6"/>'
        +'<path d="M44 53 C56 52 68 54 74 60" fill="none" stroke="#7FE0C8" stroke-width="2" opacity=".6"/>'
        +'<ellipse cx="38" cy="52" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M31 45 C21 38 15 29 15 18 C22 23 28 31 36 39" fill="none" stroke="'+c1+'" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M30 58 C20 62 13 60 9 50 C17 53 24 52 33 49" fill="none" stroke="'+c1+'" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M22 30 l6 1 M18 52 l5 -3" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>'
        +'<path d="M30 46 C22 40 17 32 17 24" fill="none" stroke="#FFE08A" stroke-width="2" opacity=".7"/>'
        +'<circle cx="36" cy="52" r="2.2" fill="#fff"/>';
    },
    /* モルフォチョウ: 大きく鮮やかな青い翅＋濃い縁＋白点 */
    morpho_butterfly:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M46 48 C24 14 4 14 4 32 C4 48 28 56 47 54 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M54 48 C76 14 96 14 96 32 C96 48 72 56 53 54 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M46 56 C30 58 14 70 18 84 C22 94 42 86 49 62 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M54 56 C70 58 86 70 82 84 C78 94 58 86 51 62 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M46 49 C26 18 9 18 8 31 C26 26 38 34 46 49 Z" fill="'+c2+'" opacity=".55"/>'
        +'<path d="M54 49 C74 18 91 18 92 31 C74 26 62 34 54 49 Z" fill="'+c2+'" opacity=".55"/>'
        +'<path d="M9 30 C6 36 7 44 14 50 M91 30 C94 36 93 44 86 50" fill="none" stroke="'+K+'" stroke-width="4"/>'
        +'<circle cx="16" cy="40" r="1.8" fill="#fff"/><circle cx="24" cy="46" r="1.8" fill="#fff"/>'
        +'<circle cx="84" cy="40" r="1.8" fill="#fff"/><circle cx="76" cy="46" r="1.8" fill="#fff"/>'
        +'<ellipse cx="50" cy="55" rx="5" ry="18" fill="'+K+'"/>'
        +'<path d="M47 40 C43 32 39 28 34 25 M53 40 C57 32 61 28 66 25" '+leg+'/>';
    },
    /* アレクサンドラトリバネアゲハ(雄): 細長く角ばった翅＋緑の帯＋黄の腹 */
    queen_alexandras_birdwing:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M48 50 L14 20 L6 34 L20 44 L10 50 L44 58 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="2.6" stroke-linejoin="round"/>'
        +'<path d="M52 50 L86 20 L94 34 L80 44 L90 50 L56 58 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="2.6" stroke-linejoin="round"/>'
        +'<path d="M46 56 C32 60 22 74 28 86 C34 94 46 82 49 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="2.6" stroke-linejoin="round"/>'
        +'<path d="M54 56 C68 60 78 74 72 86 C66 94 54 82 51 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="2.6" stroke-linejoin="round"/>'
        +'<path d="M40 34 L20 28 M42 42 L16 40 M44 50 L24 50" stroke="'+c1+'" stroke-width="3" stroke-linecap="round"/>'
        +'<path d="M60 34 L80 28 M58 42 L84 40 M56 50 L76 50" stroke="'+c1+'" stroke-width="3" stroke-linecap="round"/>'
        +'<path d="M38 70 C40 76 44 80 48 82 M62 70 C60 76 56 80 52 82" fill="none" stroke="'+c1+'" stroke-width="3" stroke-linecap="round"/>'
        +'<ellipse cx="50" cy="58" rx="4.5" ry="20" fill="#E9C24A"/>'
        +'<ellipse cx="50" cy="40" rx="5" ry="6" fill="'+K+'"/>'
        +'<path d="M47 36 C43 28 39 25 34 23 M53 36 C57 28 61 25 66 23" '+leg+'/>';
    }
  });
})(window);
