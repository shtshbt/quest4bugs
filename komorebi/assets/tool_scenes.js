(function(global){
  "use strict";

  /* 道具ごとの捕獲ビネット (tools_design 9 章)。抽選の数学は重みでも、体験は
     「その道具で どうやって とったか」の 1 場面にする。灯火なら夜景にあかりが
     ともって虫が寄ってくる、落とし穴なら朝の見回り、というふうに、道具の名前から
     実際の採集のしかたが思い浮かぶ絵を 1 枚だけ置く。

     この絵は表示だけのもので、抽選には一切かかわらない。描くのは場面であって
     種ではない: 実際に捕れた虫は、すぐ下の捕獲カード (ratioCaptureHtml) が
     描く。ここで種を描き分けると、絵の虫と捕れた虫が食い違って見える。

     色は presentation attribute で持たせ、class は CSS の掛かり口としてだけ置く。
     こうしておくと map.css を読み込んでいない文脈でも絵が黒く潰れない (アイコンが
     stroke="currentColor" で潰れないのと同じ考え方)。外部を読みに行く要素は
     持たない (配信は静的ファイルだけで完結する)。 */

  var VIEW_BOX="0 0 160 84";

  /* 虫の影は 3 型だけ (とぶ / あるく / すべる) で足りる。場面の主語は道具のほうで、
     虫は「そこに 来ている」ことが分かればよい。

     入れ子が 2 段なのは動きのため。CSS の transform は SVG の transform 属性を
     置き換えてしまうので、位置を持つ g にゆれの animation を掛けると虫が原点へ
     飛ぶ。外側に動く枠、内側に置き場所、と分けておく。 */
  function life(cls,body){
    return '<g class="scene-life'+(cls?" "+cls:"")+'">'+body+'</g>';
  }

  /* tone は影の色。置く下地が暗い場面 (夜の ぬの・木のみき・あなの 中) では
     明るい側へ寄せる。虫が見えない絵は「集まってきた」を伝えられない。 */
  function flyer(x,y,scale,cls,tone){
    var ink=tone||"#2A1D12";
    return life(cls,'<g transform="translate('+x+' '+y+') scale('+scale+')" fill="'+ink+'">'
      +'<ellipse cx="0" cy="0" rx="1.3" ry="2.7"/>'
      +'<ellipse cx="-3.6" cy="-1.6" rx="3.7" ry="2.3" transform="rotate(-22)"/>'
      +'<ellipse cx="3.6" cy="-1.6" rx="3.7" ry="2.3" transform="rotate(22)"/></g>');
  }

  function crawler(x,y,scale,cls,tone){
    var ink=tone||"#2A1D12";
    return life(cls,'<g transform="translate('+x+' '+y+') scale('+scale+')" fill="'+ink+'">'
      +'<ellipse cx="0.6" cy="0" rx="3.6" ry="2.3"/>'
      +'<circle cx="-3.6" cy="0" r="1.5"/>'
      +'<path d="M-1.6 2 L-2.8 3.8 M1 2.3 L1 4.2 M3.4 1.9 L4.6 3.6'
      +' M-1.6 -2 L-2.8 -3.8 M1 -2.3 L1 -4.2 M3.4 -1.9 L4.6 -3.6"'
      +' fill="none" stroke="'+ink+'" stroke-width="0.8" stroke-linecap="round"/></g>');
  }

  function darter(x,y,scale,cls,tone){
    var ink=tone||"#20303A";
    return life(cls,'<g transform="translate('+x+' '+y+') scale('+scale+')" fill="'+ink+'">'
      +'<rect x="-2" y="-0.8" width="12" height="1.6" rx="0.8"/>'
      +'<circle cx="-2.6" cy="0" r="1.7"/>'
      +'<ellipse cx="2" cy="-2.8" rx="4.4" ry="1.3"/>'
      +'<ellipse cx="2" cy="2.8" rx="4.4" ry="1.3"/></g>');
  }

  /* 場面。手前から奥へではなく、空 → 地面 → 道具 → 虫 の順に重ねる。 */
  var SCENES={

    /* 灯火採集セット: 夜の 森に 白い ぬのを はって あかりを ともす。虫は ぬのの
       上に とまりに来る。あかりを ぬのの手前に吊るすのが本物の組み方で、絵の中でも
       光が ぬのに あたっているように置く。 */
    light_trap:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#0E1D33"/>'
      +'<circle class="scene-star" cx="14" cy="12" r="1" fill="#FFF3C8"/>'
      +'<circle class="scene-star" cx="34" cy="8" r="0.8" fill="#FFF3C8"/>'
      +'<circle class="scene-star" cx="112" cy="10" r="1.1" fill="#FFF3C8"/>'
      +'<circle class="scene-star" cx="128" cy="30" r="0.7" fill="#FFF3C8"/>'
      +'<circle class="scene-star" cx="150" cy="40" r="0.9" fill="#FFF3C8"/>'
      +'<circle class="scene-moon" cx="140" cy="15" r="7" fill="#FFEEB8"/>'
      +'<path class="scene-ground" d="M0 68 C30 64 60 71 90 67 C118 63 140 69 160 66 L160 84 L0 84 Z" fill="#12261D"/>'
      +'<path class="scene-prop" d="M26 20 V70 M98 20 V70 M24 21 H100"'
      +' fill="none" stroke="#6E5A3C" stroke-width="2.4" stroke-linecap="round"/>'
      +'<path class="scene-sheet" d="M28 23 H96 L94 64 Q62 69 30 64 Z" fill="#EFEEDD"/>'
      +'<circle class="scene-glow" cx="62" cy="40" r="21" fill="#FFE49A" opacity="0.26"/>'
      +'<path class="scene-cord" d="M62 22 V30" fill="none" stroke="#6E5A3C" stroke-width="1.2"/>'
      +'<path class="scene-shade" d="M55 36 L62 30 L69 36 Z" fill="#8A7350"/>'
      +'<circle class="scene-lamp" cx="62" cy="39" r="4" fill="#FFF6CC"/>'
      +flyer(42,44,1,"scene-flit-a","#3A2A16")
      +flyer(80,34,0.85,"scene-flit-b","#3A2A16")
      +flyer(52,56,0.7,"scene-flit-c","#3A2A16")
      +flyer(86,56,0.6,"scene-flit-a","#3A2A16")
      +flyer(116,44,0.7,"scene-flit-b","#C9B896"),

    /* 落とし穴トラップ: 日の出の 見まわり。あなの 中に おちている。 */
    pitfall_trap:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#3B4A64"/>'
      +'<rect class="scene-dawn" x="0" y="26" width="160" height="20" fill="#B87554" opacity="0.85"/>'
      +'<rect class="scene-dawn" x="0" y="42" width="160" height="14" fill="#F0BE86"/>'
      +'<circle class="scene-sun" cx="124" cy="50" r="8" fill="#FFD79A"/>'
      +'<path class="scene-ray" d="M124 50 L150 26 M124 50 L156 44 M124 50 L136 22"'
      +' fill="none" stroke="#FFD79A" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>'
      +'<path class="scene-ground" d="M0 56 C40 52 70 59 110 56 C132 54 148 58 160 56 L160 84 L0 84 Z" fill="#1B3325"/>'
      +'<path class="scene-grass" d="M12 58 Q14 52 17 50 M21 59 Q20 52 23 49 M139 58 Q141 52 144 50 M147 59 Q146 53 149 51"'
      +' fill="none" stroke="#2F5C3E" stroke-width="1.4" stroke-linecap="round"/>'
      +'<ellipse class="scene-hole" cx="74" cy="64" rx="21" ry="7" fill="#0A1810"/>'
      +'<path class="scene-cup" d="M56 64 L62 82 H86 L92 64 Z" fill="#2B5346"/>'
      +'<ellipse class="scene-cup-rim" cx="74" cy="64" rx="18" ry="6" fill="#D8E6D0"/>'
      +'<ellipse class="scene-cup-in" cx="74" cy="65" rx="15.4" ry="4.8" fill="#37604F"/>'
      +'<circle class="scene-dew" cx="30" cy="60" r="1.2" fill="#CFE7EF" opacity="0.8"/>'
      +'<circle class="scene-dew" cx="122" cy="62" r="1" fill="#CFE7EF" opacity="0.8"/>'
      +crawler(74,68,1.15,"scene-stir","#C8A55E"),

    /* バナナトラップ: 木の みきの 樹液に あつまっている。 */
    banana_trap:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#20351F"/>'
      +'<path class="scene-far" d="M0 0 H160 V26 C126 34 96 22 62 30 C36 36 16 28 0 32 Z" fill="#1A2C1B"/>'
      +'<path class="scene-trunk" d="M52 0 C48 28 51 56 46 84 H90 C85 56 88 28 84 0 Z" fill="#5C4630"/>'
      +'<path class="scene-bark" d="M60 6 C58 30 61 56 58 82 M76 4 C74 30 77 54 74 82"'
      +' fill="none" stroke="#43301F" stroke-width="1.3" stroke-linecap="round"/>'
      +'<path class="scene-fruit" d="M58 16 C73 15 82 25 78 38 C76 26 68 21 58 22 Z" fill="#F2D35C"/>'
      +'<path class="scene-fruit" d="M62 23 C76 23 84 32 80 44 C78 33 70 28 62 29 Z" fill="#DDB03A"/>'
      +'<path class="scene-sap" d="M70 42 C66 52 72 60 68 72" fill="none" stroke="#C99A46"'
      +' stroke-width="3.4" stroke-linecap="round" opacity="0.95"/>'
      +'<path class="scene-ground" d="M0 74 H160 V84 H0 Z" fill="#16281A"/>'
      +crawler(58,52,1.05,"","#2A1B0E")+crawler(78,60,0.95,"scene-stir","#2A1B0E")
      +crawler(63,70,0.85,"","#2A1B0E")
      +flyer(110,36,1,"scene-flit-b","#C7B27A"),

    /* ちょうネット: 昼の ひかりの 中で あみを ふる。 */
    cho_net:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#9BD9EC"/>'
      +'<circle class="scene-sun" cx="136" cy="15" r="9" fill="#FFF0A8"/>'
      +'<path class="scene-ground" d="M0 58 C40 52 80 61 120 56 C140 53 152 58 160 56 L160 84 L0 84 Z" fill="#3E7C3F"/>'
      +'<circle class="scene-flower" cx="24" cy="66" r="2" fill="#F2E27A"/>'
      +'<circle class="scene-flower" cx="52" cy="72" r="2" fill="#EFA0C0"/>'
      +'<circle class="scene-flower" cx="132" cy="68" r="2" fill="#F2E27A"/>'
      +'<path class="scene-swing" d="M26 70 C42 46 66 30 94 25" fill="none" stroke="#FFFFFF"'
      +' stroke-width="1.6" stroke-linecap="round" stroke-dasharray="4 6" opacity="0.45"/>'
      +'<path class="scene-prop" d="M20 78 L58 45" fill="none" stroke="#7A6242" stroke-width="3" stroke-linecap="round"/>'
      +'<path class="scene-bag" d="M60 30 C74 16 92 22 88 36 C85 47 68 47 60 42 Z" fill="#F6F5EA" opacity="0.62"/>'
      +'<ellipse class="scene-hoop" cx="70" cy="36" rx="13" ry="9" transform="rotate(-30 70 36)"'
      +' fill="none" stroke="#DAD3BB" stroke-width="2.2"/>'
      +flyer(104,24,1.2,"scene-flit-a")+flyer(126,42,0.8,"scene-flit-c"),

    /* トンボ用メッシュネット: 水べを とぶ ところを、めの こまかい あみで。 */
    tonbo_net:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#A9E0EF"/>'
      +'<circle class="scene-sun" cx="20" cy="14" r="8" fill="#FFF0A8"/>'
      +'<path class="scene-water" d="M0 58 H160 V84 H0 Z" fill="#2E6E86"/>'
      +'<path class="scene-ripple" d="M10 66 Q18 63 26 66 T42 66 M96 72 Q104 69 112 72 T128 72"'
      +' fill="none" stroke="#8FCADD" stroke-width="1.3" stroke-linecap="round" opacity="0.8"/>'
      +'<path class="scene-reed" d="M18 58 Q17 44 21 36 M26 58 Q26 46 30 40 M142 58 Q141 44 145 36"'
      +' fill="none" stroke="#3E7C3F" stroke-width="1.8" stroke-linecap="round"/>'
      +'<path class="scene-prop" d="M22 80 L56 46" fill="none" stroke="#7A6242" stroke-width="3" stroke-linecap="round"/>'
      +'<path class="scene-bag" d="M60 32 C73 20 90 26 86 38 C83 48 68 48 60 43 Z" fill="#F6F5EA" opacity="0.55"/>'
      +'<ellipse class="scene-hoop" cx="70" cy="37" rx="13" ry="9" transform="rotate(-28 70 37)"'
      +' fill="none" stroke="#DAD3BB" stroke-width="2.2"/>'
      +'<path class="scene-mesh" d="M60 32 L80 44 M66 28 L84 40 M58 38 L74 47"'
      +' fill="none" stroke="#DAD3BB" stroke-width="0.7" opacity="0.8"/>'
      +darter(100,26,1.1,"scene-flit-b")+darter(126,46,0.8,"scene-flit-c"),

    /* スイーピングネット: くさむらを なでると、かくれていた 虫が とびだす。 */
    sweep_net:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#BFE3E8"/>'
      +'<path class="scene-ground" d="M0 54 C40 49 80 58 120 53 C140 50 152 55 160 53 L160 84 L0 84 Z" fill="#4C8541"/>'
      +'<path class="scene-grass" d="M8 84 Q12 62 18 50 M22 84 Q24 62 30 48 M36 84 Q37 62 43 50'
      +' M50 84 Q50 60 55 46 M112 84 Q115 62 121 50 M126 84 Q128 62 134 48 M142 84 Q144 62 150 50"'
      +' fill="none" stroke="#20502C" stroke-width="2.2" stroke-linecap="round"/>'
      +'<path class="scene-swing" d="M106 62 C88 68 62 70 38 66" fill="none" stroke="#FFFFFF"'
      +' stroke-width="1.8" stroke-linecap="round" stroke-dasharray="4 6" opacity="0.55"/>'
      +'<path class="scene-prop" d="M132 30 L98 56" fill="none" stroke="#7A6242" stroke-width="3" stroke-linecap="round"/>'
      +'<path class="scene-bag" d="M88 50 C72 48 64 58 74 67 C83 73 94 66 94 58 Z" fill="#F6F5EA" opacity="0.68"/>'
      +'<ellipse class="scene-hoop" cx="86" cy="57" rx="12" ry="9" transform="rotate(24 86 57)"'
      +' fill="none" stroke="#DAD3BB" stroke-width="2.2"/>'
      +flyer(44,44,0.85,"scene-flit-a")+flyer(24,50,0.7,"scene-flit-c")
      +crawler(60,46,0.8,"scene-flit-b"),

    /* さかなとりあみ: 水の 中を すくう。 */
    water_net:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#9FD8E6"/>'
      +'<path class="scene-bank" d="M0 44 C24 40 40 46 52 50 L0 50 Z" fill="#3E7C3F"/>'
      +'<path class="scene-water" d="M0 50 H160 V84 H0 Z" fill="#2A6480"/>'
      +'<path class="scene-ripple" d="M14 60 Q24 56 34 60 T54 60 M96 68 Q106 64 116 68 T136 68'
      +' M24 74 Q34 70 44 74 T64 74" fill="none" stroke="#8FCADD" stroke-width="1.3"'
      +' stroke-linecap="round" opacity="0.75"/>'
      +'<path class="scene-weed" d="M138 84 Q140 66 146 58 M126 84 Q126 70 131 62"'
      +' fill="none" stroke="#245C4A" stroke-width="1.8" stroke-linecap="round"/>'
      +'<path class="scene-prop" d="M22 20 L62 50" fill="none" stroke="#7A6242" stroke-width="3" stroke-linecap="round"/>'
      +'<path class="scene-bag" d="M64 50 C60 66 82 74 90 62 C94 56 92 52 88 50 Z" fill="#EFEFE0" opacity="0.7"/>'
      +'<path class="scene-hoop" d="M62 50 H92" fill="none" stroke="#DAD3BB" stroke-width="2.4" stroke-linecap="round"/>'
      +'<path class="scene-splash" d="M60 46 Q64 40 68 46 M86 46 Q90 39 94 46"'
      +' fill="none" stroke="#DCF1F7" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>'
      +crawler(76,60,0.95,"scene-stir")+crawler(110,74,0.7,""),

    /* ビーティングセット: えだを たたいて 白い ぬのに おとす。 */
    beating_set:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#2C4A2C"/>'
      +'<path class="scene-branch" d="M0 20 C34 14 62 24 92 18 C118 13 142 20 160 16"'
      +' fill="none" stroke="#4A3726" stroke-width="4.6" stroke-linecap="round"/>'
      +'<path class="scene-leaf" d="M40 20 Q44 12 52 12 Q48 20 40 20 M104 18 Q108 10 116 10 Q112 18 104 18"'
      +' fill="#3E7C3F"/>'
      +'<path class="scene-prop" d="M120 62 L98 30" fill="none" stroke="#7A6242" stroke-width="3.2" stroke-linecap="round"/>'
      +'<path class="scene-tap" d="M100 24 L104 18 M94 24 L92 17 M107 28 L113 24"'
      +' fill="none" stroke="#FFE9A8" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>'
      +'<path class="scene-sheet" d="M22 58 H118 L106 82 H34 Z" fill="#EFEEDD"/>'
      +'<path class="scene-fall" d="M62 26 V48 M78 30 V52 M50 32 V50"'
      +' fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"'
      +' stroke-dasharray="3 5" opacity="0.5"/>'
      +crawler(62,52,0.9,"scene-stir")+crawler(80,56,0.75,"")+crawler(48,54,0.7,""),

    /* 吸虫管: はっぱの うえの ちいさな 虫を すいこむ。 */
    aspirator:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#294A31"/>'
      +'<path class="scene-leaf" d="M6 70 C30 34 84 26 122 44 C92 74 40 80 6 70 Z" fill="#4C8541"/>'
      +'<path class="scene-vein" d="M12 68 C46 58 84 50 116 46 M46 62 L52 50 M74 56 L78 42 M98 51 L100 40"'
      +' fill="none" stroke="#37693A" stroke-width="1.2" stroke-linecap="round"/>'
      +'<path class="scene-prop" d="M132 12 C120 20 116 30 118 42" fill="none" stroke="#C9C2A8"'
      +' stroke-width="2.4" stroke-linecap="round"/>'
      +'<path class="scene-tube" d="M96 54 C104 48 112 44 118 42" fill="none" stroke="#C9C2A8"'
      +' stroke-width="2.4" stroke-linecap="round"/>'
      +'<ellipse class="scene-jar" cx="126" cy="24" rx="7.5" ry="10" fill="#DCEAEF" opacity="0.55"/>'
      +'<path class="scene-suck" d="M86 56 Q92 52 96 54 M84 60 Q90 56 95 57"'
      +' fill="none" stroke="#FFE9A8" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>'
      +crawler(74,58,0.55,"scene-stir")+crawler(58,64,0.45,"")+crawler(88,62,0.4,"scene-flit-c"),

    /* 高所用長竿: こずえまで さおを のばす。 */
    long_pole:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#8FCFE4"/>'
      +'<path class="scene-canopy" d="M60 6 C104 0 138 14 136 34 C134 48 104 54 84 48 C64 42 52 22 60 6 Z" fill="#3E7C3F"/>'
      +'<path class="scene-trunk" d="M100 44 C98 60 100 72 98 84 H112 C110 72 112 60 110 44 Z" fill="#4A3726"/>'
      +'<path class="scene-ground" d="M0 76 H160 V84 H0 Z" fill="#2B5433"/>'
      +'<path class="scene-prop" d="M14 82 L86 26" fill="none" stroke="#7A6242" stroke-width="3.4" stroke-linecap="round"/>'
      +'<path class="scene-joint" d="M36 66 L42 70 M60 47 L66 51"'
      +' fill="none" stroke="#C9B27A" stroke-width="2" stroke-linecap="round"/>'
      +'<ellipse class="scene-hoop" cx="92" cy="21" rx="10" ry="7" transform="rotate(-38 92 21)"'
      +' fill="none" stroke="#DAD3BB" stroke-width="2"/>'
      +'<path class="scene-bag" d="M84 16 C94 8 106 14 102 24 C99 32 87 30 84 25 Z" fill="#F6F5EA" opacity="0.6"/>'
      +crawler(112,22,0.9,"scene-stir")+flyer(130,40,0.7,"scene-flit-c"),

    /* フントラップ: まるい たまを ころがす フンチュウ。 */
    dung_trap:
      '<rect class="scene-sky" x="0" y="0" width="160" height="84" fill="#D9BE7E"/>'
      +'<circle class="scene-sun" cx="30" cy="16" r="9" fill="#FFF0A8"/>'
      +'<path class="scene-far" d="M0 40 C28 30 52 40 78 34 C106 28 134 38 160 33 L160 46 H0 Z" fill="#B79A5C"/>'
      +'<path class="scene-ground" d="M0 46 H160 V84 H0 Z" fill="#8A6E3E"/>'
      +'<path class="scene-grass" d="M14 60 Q17 52 22 49 M138 62 Q141 54 146 51"'
      +' fill="none" stroke="#7A6A32" stroke-width="1.6" stroke-linecap="round"/>'
      +'<path class="scene-track" d="M116 70 C100 68 84 68 70 70" fill="none" stroke="#6E5629"'
      +' stroke-width="1.4" stroke-linecap="round" stroke-dasharray="3 5" opacity="0.8"/>'
      +'<circle class="scene-ball" cx="62" cy="64" r="11" fill="#54401F"/>'
      +'<circle class="scene-ball-mark" cx="58" cy="60" r="1.6" fill="#3E2F16"/>'
      +'<circle class="scene-ball-mark" cx="65" cy="66" r="1.9" fill="#3E2F16"/>'
      +'<circle class="scene-ball-mark" cx="60" cy="69" r="1.2" fill="#3E2F16"/>'
      +crawler(80,68,1.05,"scene-stir")+crawler(120,74,0.7,"")
  };

  /* 添える 1 行。子どもが読む文なので、ひらがな多めで、その道具の手つきを言う。 */
  var CAPTIONS={
    light_trap:"よるの ぬのに あかりを ともすと、虫が つぎつぎ あつまってきた",
    pitfall_trap:"あさ いちばんに 見まわりに いくと、あなの 中に おちていた",
    banana_trap:"あまい においに さそわれて、木の しるに あつまっていた",
    cho_net:"ひるの ひかりの 中、まいあがった ところを そっと つつんだ",
    tonbo_net:"水べを すいっと とんだ ところを、めの こまかい あみで とらえた",
    sweep_net:"くさむらを さっと なでると、かくれていた 虫が とびだした",
    water_net:"水の 中を すくうと、あみの 中で ぱたぱた うごいていた",
    beating_set:"えだを こつんと たたくと、白い ぬのに ぽとりと おちてきた",
    aspirator:"はっぱの うえの ちいさな 虫を、すうっと くだに すいこんだ",
    long_pole:"たかい えだまで さおを のばすと、こずえの 虫に 手が とどいた",
    dung_trap:"けものの ふんの ちかくで、まるい たまを ころがしていた"
  };

  function escapeAttr(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function has(toolId){return Object.prototype.hasOwnProperty.call(SCENES,toolId);}

  /* 場面の絵そのものは飾りなので、読み上げの対象にしない。言葉で伝えるぶんは
     caption() が返す 1 行が受け持つ (絵と文で同じことを 2 度鳴らさない)。 */
  function svg(toolId,opts){
    if(!has(toolId))return "";
    var options=opts||{};
    var className=options.className?"tool-scene "+options.className:"tool-scene";
    return '<svg class="'+escapeAttr(className)+'" viewBox="'+VIEW_BOX+'" aria-hidden="true">'
      +SCENES[toolId]+'</svg>';
  }

  function caption(toolId){return has(toolId)?CAPTIONS[toolId]:"";}

  global.Q4B_KOMOREBI_TOOL_SCENES={ids:Object.keys(SCENES),has:has,svg:svg,caption:caption};
})(typeof window!=="undefined"?window:globalThis);
