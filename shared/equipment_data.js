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

  function svgWrap(label, inner){
    return '<svg viewBox="0 0 120 120" role="img" aria-label="'+label+'" width="100%" height="100%">'
      +'<defs><radialGradient id="eqBg" cx="42%" cy="28%" r="70%"><stop stop-color="#FFF8DA"/><stop offset="1" stop-color="#E8D39A"/></radialGradient></defs>'
      +'<rect x="6" y="6" width="108" height="108" rx="16" fill="url(#eqBg)" stroke="#8B6A2F" stroke-width="3"/>'
      +'<rect x="12" y="12" width="96" height="96" rx="12" fill="none" stroke="#FFF3BE" stroke-width="2" opacity=".75"/>'
      +inner+'</svg>';
  }
  function attackSvg(it){
    var c1=it.colors[0], c2=it.colors[1];
    if(it.rank===1)return svgWrap(it.name,'<path d="M26 73 C43 42 51 35 63 27 C62 44 56 63 42 86 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M94 73 C77 42 69 35 57 27 C58 44 64 63 78 86 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M45 82 L60 48 L75 82" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>');
    if(it.rank===2)return svgWrap(it.name,'<path d="M58 24 C84 30 96 52 88 82 C74 70 62 53 58 24 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M62 24 C36 30 24 52 32 82 C46 70 58 53 62 24 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M34 78 C48 91 72 91 86 78" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    if(it.rank===3)return svgWrap(it.name,'<path d="M60 20 L73 54 L106 48 L81 70 L91 102 L60 84 L29 102 L39 70 L14 48 L47 54 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M60 29 L67 58 L92 56" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>');
    if(it.rank===4)return svgWrap(it.name,'<path d="M60 18 C80 43 89 65 88 90 C73 83 64 67 60 44 C56 67 47 83 32 90 C31 65 40 43 60 18 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><circle cx="60" cy="68" r="8" fill="'+c2+'"/>');
    if(it.rank===5)return svgWrap(it.name,'<path d="M24 84 C47 76 62 52 78 22 L90 32 C76 64 58 92 30 101 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M43 78 L35 60 M56 65 L47 48 M69 48 L60 34" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    return svgWrap(it.name,'<path d="M28 72 C40 38 52 28 60 22 C68 28 80 38 92 72 C78 67 68 55 60 40 C52 55 42 67 28 72 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M38 82 C50 94 70 94 82 82" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>');
  }
  function defenseSvg(it){
    var c1=it.colors[0], c2=it.colors[1];
    if(it.rank===1)return svgWrap(it.name,'<path d="M60 18 L96 32 V59 C96 81 82 96 60 105 C38 96 24 81 24 59 V32 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M60 27 V94 M36 42 H84" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    if(it.rank===2)return svgWrap(it.name,'<ellipse cx="60" cy="60" rx="36" ry="24" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><circle cx="60" cy="60" r="15" fill="'+c2+'" stroke="#2A1B10" stroke-width="3"/><circle cx="60" cy="60" r="6" fill="#FFF8DA"/>');
    if(it.rank===3)return svgWrap(it.name,'<path d="M18 48 C38 24 82 24 102 48 C86 62 34 62 18 48 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M22 76 C42 52 78 52 98 76 C78 90 42 90 22 76 Z" fill="'+c2+'" stroke="#2A1B10" stroke-width="4"/><circle cx="60" cy="62" r="7" fill="#FFF8DA"/>');
    if(it.rank===4)return svgWrap(it.name,'<ellipse cx="60" cy="66" rx="38" ry="30" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M24 66 H96 M60 36 V96" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="66" r="10" fill="#FFF8DA" opacity=".55"/>');
    if(it.rank===5)return svgWrap(it.name,'<path d="M36 86 C34 52 45 28 60 18 C75 28 86 52 84 86 C72 95 48 95 36 86 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M42 82 C48 70 72 70 78 82" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    return svgWrap(it.name,'<path d="M60 18 C78 34 96 44 105 62 C88 72 78 88 60 102 C42 88 32 72 15 62 C24 44 42 34 60 18 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M30 62 H90 M60 32 V92" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>');
  }
  function hpSvg(it){
    var c1=it.colors[0], c2=it.colors[1];
    if(it.rank===1)return svgWrap(it.name,'<path d="M60 22 C74 44 82 59 82 74 C82 88 72 98 60 98 C48 98 38 88 38 74 C38 59 46 44 60 22 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M52 40 C61 45 69 54 70 69" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    if(it.rank===2)return svgWrap(it.name,'<path d="M60 18 C76 34 88 54 88 76 C88 91 76 101 60 101 C44 101 32 91 32 76 C32 54 44 34 60 18 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><circle cx="60" cy="70" r="20" fill="'+c2+'" opacity=".7"/>');
    if(it.rank===3)return svgWrap(it.name,'<path d="M60 20 C80 44 90 62 88 80 C76 93 44 93 32 80 C30 62 40 44 60 20 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M40 75 C52 62 68 62 80 75" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    if(it.rank===4)return svgWrap(it.name,'<circle cx="60" cy="56" r="30" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M60 24 L68 50 L96 50 L73 66 L82 94 L60 76 L38 94 L47 66 L24 50 L52 50 Z" fill="'+c2+'" opacity=".78"/>');
    if(it.rank===5)return svgWrap(it.name,'<path d="M60 18 C74 28 82 42 82 60 C82 81 69 95 60 104 C51 95 38 81 38 60 C38 42 46 28 60 18 Z" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><path d="M44 62 C56 56 64 42 72 30" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>');
    return svgWrap(it.name,'<circle cx="60" cy="60" r="34" fill="'+c1+'" stroke="#2A1B10" stroke-width="4"/><g fill="'+c2+'"><circle cx="43" cy="51" r="5"/><circle cx="60" cy="42" r="5"/><circle cx="77" cy="51" r="5"/><circle cx="50" cy="72" r="5"/><circle cx="70" cy="72" r="5"/></g>');
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
