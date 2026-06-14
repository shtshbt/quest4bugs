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

  add({
    /* ゴライアスオオツノハナムグリ: 白黒縦縞の前胸＋淡い上翅＋小さなY字角 */
    goliath_beetle:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M34 76 l-9 9 M50 82 l0 10 M66 76 l9 9 M30 62 l-12 -1 M70 62 l12 -1" '+leg+'/>'
        +'<ellipse cx="50" cy="62" rx="26" ry="23" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M50 40 L50 85" stroke="'+c2+'" stroke-width="2"/>'
        +'<path d="M36 50 C44 48 56 48 64 50 M36 62 C44 64 56 64 64 62" fill="none" stroke="'+c2+'" stroke-width="2" opacity=".5"/>'
        +'<ellipse cx="50" cy="37" rx="16" ry="11" fill="#F4F1E6" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M44 29 L44 45 M50 28 L50 46 M56 29 L56 45" stroke="'+c2+'" stroke-width="3"/>'
        +'<path d="M50 26 L50 17 M50 19 l-5 -6 M50 19 l5 -6" stroke="'+c2+'" stroke-width="3" stroke-linecap="round" fill="none"/>'
        +'<circle cx="44" cy="37" r="2" fill="'+K+'"/><circle cx="56" cy="37" r="2" fill="'+K+'"/>';
    },
    /* アポロチョウ: 半透明の白い丸い翅＋黒点＋赤い眼状紋 */
    apollo:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M47 50 C28 20 8 20 8 36 C8 50 28 56 46 54 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M53 50 C72 20 92 20 92 36 C92 50 72 56 54 54 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M47 57 C33 59 18 68 22 80 C26 90 43 83 49 62 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M53 57 C67 59 82 68 78 80 C74 90 57 83 51 62 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<circle cx="25" cy="33" r="2.8" fill="#3a3a3a"/><circle cx="75" cy="33" r="2.8" fill="#3a3a3a"/>'
        +'<circle cx="34" cy="44" r="4.2" fill="'+c2+'"/><circle cx="34" cy="44" r="1.6" fill="#fff"/>'
        +'<circle cx="66" cy="44" r="4.2" fill="'+c2+'"/><circle cx="66" cy="44" r="1.6" fill="#fff"/>'
        +'<circle cx="32" cy="72" r="3" fill="'+c2+'"/><circle cx="68" cy="72" r="3" fill="'+c2+'"/>'
        +'<ellipse cx="50" cy="54" rx="4.5" ry="16" fill="'+K+'"/>'
        +'<path d="M47 40 C43 32 39 29 34 27 M53 40 C57 32 61 29 66 27" '+leg+'/>';
    },
    /* ブータンシボリアゲハ: 黒い尾状アゲハ＋黄帯＋赤紋 */
    bhutan_glory:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M33 80 C29 89 26 95 23 99 M67 80 C71 89 74 95 77 99" fill="none" stroke="'+c1+'" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="M47 50 C30 18 8 16 7 33 C6 47 28 56 46 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M53 50 C70 18 92 16 93 33 C94 47 72 56 54 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M47 58 C32 60 16 70 20 82 C24 92 41 84 49 64 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M53 58 C68 60 84 70 80 82 C76 92 59 84 51 64 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M14 32 C26 30 38 38 46 48 M86 32 C74 30 62 38 54 48" fill="none" stroke="'+c2+'" stroke-width="4" opacity=".9"/>'
        +'<circle cx="26" cy="78" r="2.4" fill="#D64235"/><circle cx="34" cy="82" r="2.4" fill="#D64235"/>'
        +'<circle cx="74" cy="78" r="2.4" fill="#D64235"/><circle cx="66" cy="82" r="2.4" fill="#D64235"/>'
        +'<ellipse cx="50" cy="56" rx="5" ry="17" fill="'+K+'"/>'
        +'<path d="M47 41 C43 33 39 29 34 26 M53 41 C57 33 61 29 66 26" '+leg+'/>';
    },
    /* オオムラサキ(雄): 紫の金属光沢の翅＋白斑＋黄斑 */
    sasakia_oomurasaki_ss:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M47 50 C30 18 8 16 7 33 C6 47 28 56 46 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M53 50 C70 18 92 16 93 33 C94 47 72 56 54 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M47 58 C32 60 16 70 20 82 C24 92 41 84 49 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M53 58 C68 60 84 70 80 82 C76 92 59 84 51 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M9 26 C6 32 7 40 14 48 M91 26 C94 32 93 40 86 48" fill="none" stroke="'+c2+'" stroke-width="5" opacity=".8"/>'
        +'<circle cx="22" cy="40" r="2.4" fill="#fff"/><circle cx="30" cy="44" r="2.2" fill="#fff"/><circle cx="16" cy="34" r="2" fill="#fff"/>'
        +'<circle cx="78" cy="40" r="2.4" fill="#fff"/><circle cx="70" cy="44" r="2.2" fill="#fff"/><circle cx="84" cy="34" r="2" fill="#fff"/>'
        +'<circle cx="30" cy="74" r="2" fill="#E9C24A"/><circle cx="70" cy="74" r="2" fill="#E9C24A"/>'
        +'<ellipse cx="50" cy="56" rx="5" ry="17" fill="'+K+'"/>'
        +'<path d="M47 41 C43 33 39 29 34 26 M53 41 C57 33 61 29 66 26" '+leg+'/>';
    },
    /* ヨナグニサン: 巨大なガ＋三角の透明紋＋カギ状の前翅先 */
    yonagunisan:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M50 36 C24 36 8 56 10 80 C26 80 42 70 50 54 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M50 36 C76 36 92 56 90 80 C74 80 58 70 50 54 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M14 44 C8 40 6 44 9 50" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5"/>'
        +'<path d="M86 44 C92 40 94 44 91 50" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5"/>'
        +'<path d="M30 60 l9 -7 l2 11 Z" fill="#F2ECDD" opacity=".85" stroke="'+K+'" stroke-width="1.5"/>'
        +'<path d="M70 60 l-9 -7 l-2 11 Z" fill="#F2ECDD" opacity=".85" stroke="'+K+'" stroke-width="1.5"/>'
        +'<path d="M16 50 C30 52 40 56 48 62 M84 50 C70 52 60 56 52 62" fill="none" stroke="'+c2+'" stroke-width="2.4" opacity=".7"/>'
        +'<ellipse cx="50" cy="52" rx="6" ry="16" fill="'+c2+'" stroke="'+K+'" stroke-width="2"/>'
        +'<path d="M47 38 C42 30 36 27 30 27 M53 38 C58 30 64 27 70 27" '+leg+'/>'
        +'<circle cx="46" cy="42" r="2" fill="#fff"/><circle cx="54" cy="42" r="2" fill="#fff"/>';
    },
    /* ムカシトンボ: 黒い体＋黄色の帯のトンボ */
    mukashi_tonbo:function(c1,c2,shiny,kit){ var K=kit.K;
      return '<ellipse cx="29" cy="42" rx="21" ry="6.5" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(-13 29 42)"/>'
        +'<ellipse cx="71" cy="42" rx="21" ry="6.5" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(13 71 42)"/>'
        +'<ellipse cx="31" cy="53" rx="18" ry="5.5" fill="#EAF2F8" opacity=".7" stroke="'+K+'" stroke-width="2.5" transform="rotate(-22 31 53)"/>'
        +'<ellipse cx="69" cy="53" rx="18" ry="5.5" fill="#EAF2F8" opacity=".7" stroke="'+K+'" stroke-width="2.5" transform="rotate(22 69 53)"/>'
        +'<rect x="46.5" y="36" width="7" height="50" rx="3.5" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M47 48 h6 M47 56 h6 M47 64 h6 M47 72 h6 M47 80 h6" stroke="'+c2+'" stroke-width="3"/>'
        +'<circle cx="50" cy="28" r="8" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<circle cx="46" cy="26" r="3.4" fill="'+c2+'"/><circle cx="54" cy="26" r="3.4" fill="'+c2+'"/>';
    },
    /* ウォーレスオオハキリバチ: 巨大な黒いハチ＋大あご */
    wallace_giant_bee:function(c1,c2,shiny,kit){ var K=kit.K;
      return '<ellipse cx="33" cy="34" rx="16" ry="9" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(-22 33 34)"/>'
        +'<ellipse cx="67" cy="34" rx="16" ry="9" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(22 67 34)"/>'
        +'<ellipse cx="50" cy="62" rx="20" ry="24" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M32 54 h36 M31 64 h38 M34 74 h32" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +'<circle cx="50" cy="32" r="11" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M44 39 C38 45 37 51 41 55 M56 39 C62 45 63 51 59 55" fill="none" stroke="'+c1+'" stroke-width="4" stroke-linecap="round"/>'
        +'<circle cx="46" cy="30" r="2.4" fill="#fff"/><circle cx="54" cy="30" r="2.4" fill="#fff"/>'
        +'<path d="M50 86 l0 6" stroke="'+K+'" stroke-width="3" stroke-linecap="round"/>';
    },
    /* セカイサイチョウナナフシ: 極端に細長い枝状のナナフシ */
    sekai_saichou_nanafushi:function(c1,c2,shiny,kit){ var K=kit.K;
      return '<path d="M18 14 L84 86" stroke="'+c1+'" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M18 14 L84 86" stroke="'+c2+'" stroke-width="2" stroke-dasharray="3 7" opacity=".7"/>'
        +'<circle cx="18" cy="14" r="5" fill="'+c1+'" stroke="'+K+'" stroke-width="2.5"/>'
        +'<path d="M15 11 C8 6 4 3 2 0 M21 10 C20 4 22 1 26 -2" fill="none" stroke="'+c1+'" stroke-width="2" stroke-linecap="round"/>'
        +'<path d="M34 30 l-14 -6 M34 30 l10 14 M50 46 l-15 -4 M50 46 l9 15 M66 62 l-15 -3 M66 62 l8 16" stroke="'+c1+'" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
        +'<circle cx="16" cy="13" r="1.4" fill="#fff"/>';
    },
    /* ニセハナマオウカマキリ: 緑＋えんじ色の装飾的なカマキリ */
    ni_idolomantis_diabolica:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M56 30 C64 48 60 68 48 86" fill="none" stroke="'+c1+'" stroke-width="10" stroke-linecap="round"/>'
        +'<path d="M58 44 C66 42 71 46 66 52 C60 52 57 50 56 46 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="2"/>'
        +'<path d="M53 62 C45 62 40 66 46 72 C52 70 54 66 54 62 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="2"/>'
        +'<path d="M52 40 L30 32 L40 48 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M30 32 L20 20" stroke="'+c1+'" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="M34 35 l8 4" stroke="#E58AA0" stroke-width="2.4" stroke-linecap="round"/>'
        +'<path d="M49 24 L62 20 L56 32 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M55 20 l3 -8 M55 21 l7 -6" stroke="'+c1+'" stroke-width="2.5" stroke-linecap="round"/>'
        +'<circle cx="53" cy="25" r="2.4" fill="'+c2+'"/>'
        +'<path d="M55 56 l16 -8 M53 68 l17 -4 M51 78 l14 4" '+leg+'/>';
    },
    /* パリーフタマタクワガタ: 先が二股に分かれる大アゴ */
    parry_futamata_kuwagata:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M44 72 l-8 11 M56 75 l0 12 M66 70 l9 9 M46 62 l-14 5" '+leg+'/>'
        +'<ellipse cx="58" cy="58" rx="23" ry="19" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M58 41 L59 75" stroke="'+c2+'" stroke-width="2.4"/>'
        +'<ellipse cx="38" cy="52" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M31 46 C20 40 13 32 13 22" fill="none" stroke="'+c1+'" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="M13 22 l-5 -3 M13 22 l2 -6" stroke="'+c1+'" stroke-width="3.5" stroke-linecap="round"/>'
        +'<path d="M31 58 C20 62 13 60 11 50" fill="none" stroke="'+c1+'" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="M11 50 l-5 1 M11 50 l-1 -5" stroke="'+c1+'" stroke-width="3.5" stroke-linecap="round"/>'
        +'<circle cx="36" cy="52" r="2.2" fill="#fff"/>';
    },
    /* マンディブラリスフタマタクワガタ: 非常に長く先が二股の大アゴ */
    mandibularis_futamata_kuwagata:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg;
      return '<path d="M46 72 l-8 11 M58 75 l0 12 M68 70 l9 9 M48 62 l-14 5" '+leg+'/>'
        +'<ellipse cx="62" cy="58" rx="20" ry="17" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M62 43 L63 73" stroke="'+c2+'" stroke-width="2.2"/>'
        +'<ellipse cx="44" cy="54" rx="11" ry="10" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M37 49 C24 43 11 37 4 30" fill="none" stroke="'+c1+'" stroke-width="4" stroke-linecap="round"/>'
        +'<path d="M4 30 l-2 -4 M4 30 l-3 2" stroke="'+c1+'" stroke-width="3" stroke-linecap="round"/>'
        +'<path d="M37 60 C24 64 11 65 4 59" fill="none" stroke="'+c1+'" stroke-width="4" stroke-linecap="round"/>'
        +'<path d="M4 59 l-2 4 M4 59 l-3 -2" stroke="'+c1+'" stroke-width="3" stroke-linecap="round"/>'
        +'<circle cx="42" cy="54" r="2" fill="#fff"/>';
    },
    /* ネプチューンオオカブト: 黒く複数の長いツノ */
    neptunus_oo_kabuto:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg; var hi='#4a4a4a';
      return '<path d="M44 80 l-10 11 M58 84 l-2 12 M72 80 l11 9 M42 66 l-15 3 M76 66 l14 3" '+leg+'/>'
        +'<ellipse cx="58" cy="66" rx="25" ry="21" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M58 47 L58 86" stroke="'+hi+'" stroke-width="2"/>'
        +'<ellipse cx="40" cy="56" rx="12" ry="10" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M40 48 C26 36 14 26 8 13 C13 12 19 16 24 22 C30 29 35 38 40 44" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M8 13 C6 18 8 23 12 27" fill="none" stroke="'+c2+'" stroke-width="4.5" stroke-linecap="round"/>'
        +'<path d="M34 47 C26 41 20 35 16 27" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<ellipse cx="30" cy="62" rx="7" ry="6" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5"/>'
        +'<path d="M26 58 C18 53 12 47 10 39 C16 41 23 47 30 52" fill="none" stroke="'+c2+'" stroke-width="4.5" stroke-linecap="round"/>'
        +'<path d="M19 30 l5 2" stroke="'+hi+'" stroke-width="2"/>'
        +'<circle cx="28" cy="62" r="1.6" fill="#fff"/>';
    },
    /* サタンオオカブト: 黒く太く湾曲した大ツノ */
    satanas_oo_kabuto:function(c1,c2,shiny,kit){ var K=kit.K,leg=kit.leg; var hi='#444';
      return '<path d="M44 80 l-10 11 M58 84 l-2 12 M72 80 l11 9 M42 66 l-15 3 M76 66 l14 3" '+leg+'/>'
        +'<ellipse cx="59" cy="65" rx="26" ry="22" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M59 45 L59 85" stroke="'+hi+'" stroke-width="2"/>'
        +'<ellipse cx="40" cy="55" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
        +'<path d="M40 47 C28 37 18 30 12 20 C18 20 24 24 30 31 C35 37 39 43 42 47" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/>'
        +'<path d="M12 20 C9 24 10 30 15 33" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +'<ellipse cx="30" cy="60" rx="7" ry="7" fill="'+c2+'" stroke="'+K+'" stroke-width="2.5"/>'
        +'<path d="M27 56 C19 50 13 43 12 34 C18 37 25 44 32 50" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +'<circle cx="28" cy="60" r="1.8" fill="#fff"/>';
    }
  });
})(window);
