(function(global){
  "use strict";

  var NAMES = {
    attack:[
      "はがねのおおあご","おうごんのかま","おうじゃのツノ",
      "しっこくのどくばり","しろがねのかぎづめ","あかがねのきば"
    ],
    defense:[
      "てっぺきのよろい","すいしょうのふくがん","かがやきのりんぷん",
      "くろがねのこうら","まもりのまゆ","にじいろのはね"
    ],
    hp:[
      "いのちのじゅえき","たいようのはなみつ","にじのあさつゆ",
      "ひかりのかじつ","こもれびのしずく","きらめきのかふん"
    ]
  };
  var PALETTES = {
    attack:[["#9FA8B5","#44505D"],["#E7BE4B","#7A4F18"],["#B8893A","#5E381A"],["#2A2430","#101018"],["#D8DDE5","#59616E"],["#C46A38","#6A2B1D"]],
    defense:[["#778A94","#33464E"],["#9AD7E6","#2B7384"],["#D9C06B","#8A6720"],["#4B5560","#17202A"],["#E9D8B6","#A1744D"],["#4EC9B0","#6044A8"]],
    hp:[["#A65E2E","#5F321C"],["#F0C34A","#E8792A"],["#7AD2E8","#4B83D8"],["#F7E27A","#C9A23A"],["#79B86B","#3E7C3F"],["#F1D4A8","#D58C4D"]]
  };
  var EFFECTS = {
    attack:{value:5, text:"こうげきダメージ +5"},
    defense:{value:3, text:"ぼうぎょ成功時のダメージ -3"},
    hp:{value:20, text:"HPを20にする"}
  };

  function priceFor(index){
    var i=index+1;
    return {
      fossil:i<=3?6:(i<=6?9:(i<=9?12:(i<=12?15:18))),
      dew:i<=3?1:(i<=9?2:3)
    };
  }
  function slotLabel(slot){ return {attack:"こうげき",defense:"まもり",hp:"HP"}[slot]||slot; }
  function makeItems(){
    var out=[], slots=["attack","defense","hp"], rank, si, slot, id, effect, price, cols;
    for(rank=0;rank<6;rank++){
      for(si=0;si<slots.length;si++){
        slot=slots[si];
        id=slot+"_"+(rank+1);
        effect=EFFECTS[slot];
        price=priceFor(out.length);
        cols=PALETTES[slot][rank];
        out.push({
          id:id, slot:slot, rank:rank+1, name:NAMES[slot][rank],
          slotLabel:slotLabel(slot), effect:effect.text, effectValue:effect.value,
          fossilCost:price.fossil, dewCost:price.dew, colors:cols
        });
      }
    }
    return out;
  }
  var ITEMS = makeItems(), BY_ID={};
  ITEMS.forEach(function(it){ BY_ID[it.id]=it; });

  /* SVG: 琥珀色のラウンドプレート＋古代昆虫の部位（化石パーツ）。グラデ＋ハイライト＋影で立体感。 */
  function svgWrap(label, id, inner){
    var gid=id+'g', hid=id+'h', sid=id+'s';
    return '<svg viewBox="0 0 120 120" role="img" aria-label="'+label+'" width="100%" height="100%">'
      +'<defs>'
      +'<radialGradient id="'+gid+'" cx="35%" cy="25%" r="80%"><stop stop-color="#FFF4C2"/><stop offset=".55" stop-color="#E8C77A"/><stop offset="1" stop-color="#9A7028"/></radialGradient>'
      +'<linearGradient id="'+hid+'" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
      +'<filter id="'+sid+'" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" in="SourceAlpha"/><feOffset dy="1.6"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      +'</defs>'
      +'<circle cx="60" cy="60" r="54" fill="url(#'+gid+')" stroke="#6E4B16" stroke-width="2.4"/>'
      +'<ellipse cx="50" cy="38" rx="28" ry="14" fill="url(#'+hid+')" opacity=".75"/>'
      +'<g filter="url(#'+sid+')">'+inner+'</g>'
      +'<circle cx="60" cy="60" r="54" fill="none" stroke="#FFE9A3" stroke-width="1" opacity=".7"/>'
      +'</svg>';
  }
  /* 攻撃: クワガタ大顎/カマキリの鎌/カブトの角/毒針/しろがねの爪/赤銅の牙 */
  function attackSvg(it){
    var c1=it.colors[0], c2=it.colors[1], dark="#1A0E06";
    if(it.rank===1) /* はがねのおおあご: クワガタの左右大顎 */
      return svgWrap(it.name, it.id,
        '<path d="M30 80 C35 50 50 35 60 30 C58 50 50 70 38 88 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M36 50 L42 60 M40 68 L48 76" stroke="'+c2+'" stroke-width="2" stroke-linecap="round"/>'
        +'<path d="M90 80 C85 50 70 35 60 30 C62 50 70 70 82 88 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M84 50 L78 60 M80 68 L72 76" stroke="'+c2+'" stroke-width="2" stroke-linecap="round"/>'
        +'<circle cx="60" cy="40" r="6" fill="'+c2+'" stroke="'+dark+'" stroke-width="2"/>');
    if(it.rank===2) /* おうごんのかま: カマキリの鎌 */
      return svgWrap(it.name, it.id,
        '<path d="M28 88 C30 70 38 56 52 50 L80 30 C90 26 96 32 92 42 L70 58 C68 70 60 82 46 92 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M52 50 L62 38" stroke="'+c2+'" stroke-width="2.5" stroke-linecap="round"/>'
        +'<path d="M40 72 L46 66 M48 80 L54 74" stroke="'+c2+'" stroke-width="2" stroke-linecap="round" opacity=".7"/>'
        +'<circle cx="84" cy="36" r="3" fill="#FFFBE6"/>');
    if(it.rank===3) /* おうじゃのツノ: カブトムシのY字角 */
      return svgWrap(it.name, it.id,
        '<path d="M60 30 L60 78 M60 78 L40 92 M60 78 L80 92" stroke="'+c1+'" stroke-width="10" stroke-linecap="round" fill="none"/>'
        +'<path d="M52 30 C50 24 70 24 68 30 L66 42 L54 42 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 38 L60 70" stroke="'+c2+'" stroke-width="2" opacity=".7"/>'
        +'<path d="M42 88 L48 82 M78 88 L72 82" stroke="'+c2+'" stroke-width="2.5" stroke-linecap="round"/>');
    if(it.rank===4) /* しっこくのどくばり: 蜂の毒針 */
      return svgWrap(it.name, it.id,
        '<path d="M60 22 L72 78 L60 98 L48 78 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 22 L60 88" stroke="'+c2+'" stroke-width="1.5" opacity=".6"/>'
        +'<circle cx="60" cy="96" r="3.5" fill="#FF6B6B" stroke="'+dark+'" stroke-width="1.5"/>'
        +'<path d="M44 40 L52 48 M76 40 L68 48" stroke="'+c2+'" stroke-width="2" stroke-linecap="round"/>');
    if(it.rank===5) /* しろがねのかぎづめ: 鋭い湾曲した爪 */
      return svgWrap(it.name, it.id,
        '<path d="M28 92 C40 80 56 60 70 36 L86 30 C88 38 78 60 60 80 C50 90 38 96 28 92 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M38 84 L48 72 M52 64 L62 50" stroke="'+c2+'" stroke-width="2" stroke-linecap="round"/>'
        +'<ellipse cx="76" cy="36" rx="6" ry="3" fill="#FFFBE6" opacity=".85"/>');
    /* rank6 あかがねのきば: 双牙 */
    return svgWrap(it.name, it.id,
      '<path d="M40 28 C46 50 50 70 42 92 C36 86 32 64 36 38 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
      +'<path d="M80 28 C74 50 70 70 78 92 C84 86 88 64 84 38 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
      +'<path d="M40 40 L42 70 M80 40 L78 70" stroke="'+c2+'" stroke-width="1.5" opacity=".7"/>'
      +'<path d="M52 50 Q60 56 68 50" stroke="'+c2+'" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
  }
  /* 防御: 甲・複眼・鱗粉・甲羅・繭・虹羽 */
  function defenseSvg(it){
    var c1=it.colors[0], c2=it.colors[1], dark="#1A0E06";
    if(it.rank===1) /* てっぺきのよろい: 紋章入りの胸甲 */
      return svgWrap(it.name, it.id,
        '<path d="M60 24 L92 38 L88 70 C84 86 72 94 60 100 C48 94 36 86 32 70 L28 38 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 36 L60 92 M40 50 L80 50" stroke="'+c2+'" stroke-width="2.5" stroke-linecap="round"/>'
        +'<circle cx="60" cy="62" r="7" fill="'+c2+'" stroke="'+dark+'" stroke-width="2"/>'
        +'<circle cx="60" cy="62" r="2.5" fill="#FFFBE6"/>');
    if(it.rank===2) /* すいしょうのふくがん: 多眼の構造 */
      return svgWrap(it.name, it.id,
        '<ellipse cx="60" cy="60" rx="38" ry="28" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<g fill="'+c2+'" stroke="'+dark+'" stroke-width="1">'
        +'<circle cx="44" cy="54" r="6"/><circle cx="60" cy="48" r="7"/><circle cx="76" cy="54" r="6"/>'
        +'<circle cx="48" cy="70" r="5"/><circle cx="60" cy="74" r="6"/><circle cx="72" cy="70" r="5"/>'
        +'</g>'
        +'<circle cx="58" cy="46" r="2" fill="#FFFBE6"/><circle cx="42" cy="52" r="1.5" fill="#FFFBE6"/>');
    if(it.rank===3) /* かがやきのりんぷん: 鱗粉が舞う翅 */
      return svgWrap(it.name, it.id,
        '<path d="M60 36 C82 30 94 46 88 64 C76 70 64 64 60 50 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 36 C38 30 26 46 32 64 C44 70 56 64 60 50 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 36 L60 92" stroke="'+dark+'" stroke-width="2" stroke-linecap="round"/>'
        +'<g fill="'+c2+'" opacity=".9">'
        +'<circle cx="42" cy="78" r="2.5"/><circle cx="52" cy="86" r="2"/><circle cx="68" cy="84" r="2.5"/>'
        +'<circle cx="78" cy="76" r="2"/><circle cx="60" cy="92" r="2"/>'
        +'</g>');
    if(it.rank===4) /* くろがねのこうら: テントウムシ型の半球甲羅 */
      return svgWrap(it.name, it.id,
        '<path d="M22 76 A38 32 0 0 1 98 76 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 50 L60 76" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<g fill="'+c2+'" stroke="'+dark+'" stroke-width="1.2">'
        +'<circle cx="44" cy="62" r="4"/><circle cx="50" cy="72" r="3.5"/>'
        +'<circle cx="76" cy="62" r="4"/><circle cx="70" cy="72" r="3.5"/>'
        +'</g>'
        +'<path d="M30 60 C40 52 50 50 60 52" stroke="#FFFBE6" stroke-width="2" fill="none" opacity=".55"/>');
    if(it.rank===5) /* まもりのまゆ: 繭 */
      return svgWrap(it.name, it.id,
        '<path d="M44 32 C36 56 36 86 56 96 C76 96 84 70 78 38 C72 30 50 28 44 32 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M42 42 C50 46 70 46 80 40 M40 56 C50 60 72 60 82 54 M42 72 C52 76 70 76 78 70" stroke="'+c2+'" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".75"/>'
        +'<ellipse cx="50" cy="40" rx="6" ry="3" fill="#FFFBE6" opacity=".55"/>');
    /* rank6 にじいろのはね */
    return svgWrap(it.name, it.id,
      '<path d="M60 30 C84 28 96 48 92 70 C84 80 72 78 64 70 C62 60 60 48 60 30 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
      +'<path d="M60 30 C36 28 24 48 28 70 C36 80 48 78 56 70 C58 60 60 48 60 30 Z" fill="'+c2+'" stroke="'+dark+'" stroke-width="2.5"/>'
      +'<path d="M60 32 L60 92" stroke="'+dark+'" stroke-width="2"/>'
      +'<path d="M40 50 L50 56 M40 62 L52 64 M68 56 L80 50 M68 64 L82 62" stroke="#FFFBE6" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>');
  }
  /* HP: 樹液・花蜜・朝露・果実・しずく・花粉 */
  function hpSvg(it){
    var c1=it.colors[0], c2=it.colors[1], dark="#1A0E06";
    if(it.rank===1) /* いのちのじゅえき: 樹皮から滴る樹液 */
      return svgWrap(it.name, it.id,
        '<path d="M20 30 C30 40 32 60 28 80 C24 90 18 92 16 86 C20 70 20 50 16 36 Z" fill="#7A5230" stroke="'+dark+'" stroke-width="2"/>'
        +'<path d="M40 36 C56 30 76 36 88 50 C84 70 76 84 64 90 C50 86 42 70 40 50 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M64 50 C72 56 74 70 70 80" stroke="'+c2+'" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
        +'<ellipse cx="56" cy="46" rx="6" ry="3" fill="#FFFBE6" opacity=".7"/>');
    if(it.rank===2) /* たいようのはなみつ: 花と蜜 */
      return svgWrap(it.name, it.id,
        '<g fill="'+c1+'" stroke="'+dark+'" stroke-width="2">'
        +'<ellipse cx="60" cy="38" rx="11" ry="14"/><ellipse cx="42" cy="52" rx="14" ry="11"/>'
        +'<ellipse cx="78" cy="52" rx="14" ry="11"/><ellipse cx="48" cy="72" rx="13" ry="11"/>'
        +'<ellipse cx="72" cy="72" rx="13" ry="11"/>'
        +'</g>'
        +'<circle cx="60" cy="58" r="11" fill="'+c2+'" stroke="'+dark+'" stroke-width="2"/>'
        +'<circle cx="56" cy="54" r="3" fill="#FFFBE6"/>');
    if(it.rank===3) /* にじのあさつゆ: 葉に乗る大粒の朝露 */
      return svgWrap(it.name, it.id,
        '<path d="M20 88 C40 60 70 50 100 60 C90 80 70 92 50 94 C36 94 26 92 20 88 Z" fill="#6FA85A" stroke="'+dark+'" stroke-width="2"/>'
        +'<path d="M30 86 C50 70 80 64 96 66" stroke="#3F7A3A" stroke-width="2" fill="none"/>'
        +'<g stroke="'+dark+'" stroke-width="2">'
        +'<path d="M60 30 C70 44 70 56 60 58 C50 56 50 44 60 30 Z" fill="'+c1+'"/>'
        +'<circle cx="42" cy="56" r="6" fill="'+c2+'"/><circle cx="78" cy="58" r="5" fill="'+c2+'"/>'
        +'</g>'
        +'<circle cx="56" cy="42" r="2.5" fill="#FFFBE6"/>');
    if(it.rank===4) /* ひかりのかじつ: 光る果実 */
      return svgWrap(it.name, it.id,
        '<circle cx="60" cy="64" r="30" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M60 36 C56 28 58 22 62 22 C66 22 64 30 60 36 Z" fill="#5A8233" stroke="'+dark+'" stroke-width="2"/>'
        +'<path d="M60 22 C68 18 76 22 78 28" stroke="#5A8233" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
        +'<ellipse cx="50" cy="56" rx="9" ry="6" fill="#FFFBE6" opacity=".55"/>'
        +'<circle cx="46" cy="52" r="2.5" fill="#FFFBE6"/>'
        +'<path d="M70 78 C76 76 80 72 80 66" stroke="'+c2+'" stroke-width="2" fill="none" opacity=".6"/>');
    if(it.rank===5) /* こもれびのしずく: 雫 */
      return svgWrap(it.name, it.id,
        '<path d="M60 22 C72 44 80 60 80 76 C80 90 70 100 60 100 C50 100 40 90 40 76 C40 60 48 44 60 22 Z" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
        +'<path d="M52 58 C58 64 64 74 64 84" stroke="#FFFBE6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>'
        +'<ellipse cx="50" cy="50" rx="4" ry="6" fill="#FFFBE6" opacity=".7"/>'
        +'<g stroke="'+c2+'" stroke-width="1.5" opacity=".5">'
        +'<path d="M30 36 L36 42 M88 36 L82 42 M28 70 L34 70 M92 70 L86 70"/>'
        +'</g>');
    /* rank6 きらめきのかふん: 花粉の粒子 */
    return svgWrap(it.name, it.id,
      '<circle cx="60" cy="60" r="30" fill="'+c1+'" stroke="'+dark+'" stroke-width="2.5"/>'
      +'<g fill="'+c2+'" stroke="'+dark+'" stroke-width="1.2">'
      +'<circle cx="48" cy="50" r="5"/><circle cx="60" cy="44" r="5.5"/><circle cx="72" cy="50" r="5"/>'
      +'<circle cx="44" cy="64" r="4.5"/><circle cx="76" cy="64" r="4.5"/>'
      +'<circle cx="52" cy="74" r="4.5"/><circle cx="68" cy="74" r="4.5"/><circle cx="60" cy="62" r="4"/>'
      +'</g>'
      +'<g fill="#FFFBE6" opacity=".85">'
      +'<circle cx="46" cy="48" r="1.6"/><circle cx="58" cy="42" r="1.8"/><circle cx="70" cy="48" r="1.6"/>'
      +'</g>');
  }
  function svg(id){
    var it=BY_ID[id]; if(!it)return "";
    if(it.slot==="attack")return attackSvg(it);
    if(it.slot==="defense")return defenseSvg(it);
    return hpSvg(it);
  }

  global.Q4BEquipment = {
    items:ITEMS,
    byId:BY_ID,
    slotLabel:slotLabel,
    svg:svg,
    ATTACK_BONUS:5,
    DEFENSE_REDUCTION:3,
    HP_FLOOR:20
  };
})(window);
