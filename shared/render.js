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
  function butterfly(t,c1,c2,K,leg){
    if(t==="ageha"){ /* swallowtail: large wings + hindwing tails */
      return '<path d="M33 80 C29 89 26 95 23 99 M67 80 C71 89 74 95 77 99" fill="none" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
        +scaleG(1.07,wings(c1,c2,K,leg));
    }
    if(t==="tateha"){ /* nymphalid: broad wings + forewing eyespots */
      return scaleG(1.02,wings(c1,c2,K,leg))
        +'<circle cx="24" cy="34" r="3.2" fill="'+K+'"/><circle cx="24" cy="34" r="1.3" fill="#fff"/>'
        +'<circle cx="76" cy="34" r="3.2" fill="'+K+'"/><circle cx="76" cy="34" r="1.3" fill="#fff"/>';
    }
    if(t==="shijimi"){ /* small lycaenid: compact + tiny tails */
      return scaleG(0.72,wings(c1,c2,K,leg))
        +'<path d="M41 76 l-2 6 M59 76 l2 6" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>';
    }
    if(t==="seseri"){ /* skipper: stout body + swept wings + hooked antennae */
      return scaleG(0.8,wings(c1,c2,K,leg))
        +'<ellipse cx="50" cy="58" rx="7.5" ry="14" fill="'+K+'"/>'
        +'<path d="M44 42 C39 34 35 32 32 35 M56 42 C61 34 65 32 68 35" '+leg+'/>';
    }
    if(t==="ga"){ /* moth: roof-folded wings + fuzzy body */
      return '<path d="M50 38 C28 40 14 60 18 80 C30 80 44 70 50 56 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M50 38 C72 40 86 60 82 80 C70 80 56 70 50 56 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
        +'<path d="M30 72 h40" stroke="'+c2+'" stroke-width="3" opacity=".8"/>'
        +'<ellipse cx="50" cy="54" rx="7" ry="18" fill="'+K+'"/>'
        +'<path d="M47 38 C42 30 36 27 30 27 M53 38 C58 30 64 27 70 27" '+leg+'/>'
        +'<circle cx="46" cy="40" r="2.2" fill="#fff"/><circle cx="54" cy="40" r="2.2" fill="#fff"/>';
    }
    return wings(c1,c2,K,leg); /* chou: default */
  }
  function bugSVG(b){
  var c1=b.c1,c2=b.c2,K="#2A3D2C",inner="";
  var leg='stroke="'+K+'" stroke-width="3" stroke-linecap="round" fill="none"';
  if(b.t==="kabuto"){
    inner='<path d="M40 70 l-9 11 M50 74 l-2 12 M62 71 l9 10 M44 60 l-13 4" '+leg+'/>'
    +'<ellipse cx="56" cy="58" rx="25" ry="20" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M56 40 L58 76" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="37" cy="50" rx="12" ry="10" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M34 46 C26 36 22 26 20 14 L27 16 C29 26 33 35 40 43 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M20 14 l-5 -4 M20 14 l1 -7" '+leg+'/>'
    +'<circle cx="34" cy="51" r="2.4" fill="#fff"/>';
  }else if(b.t==="kuwagata"){
    inner='<path d="M44 72 l-8 11 M56 75 l0 12 M66 70 l9 9 M46 62 l-14 5" '+leg+'/>'
    +'<ellipse cx="58" cy="58" rx="23" ry="19" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M58 41 L59 75" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="38" cy="52" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M31 45 C21 38 15 29 15 18 C22 23 28 31 36 39" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
    +'<path d="M30 58 C20 62 13 60 9 50 C17 53 24 52 33 49" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
    +'<path d="M22 30 l6 1 M18 52 l5 -3" stroke="'+K+'" stroke-width="2.5" stroke-linecap="round"/>'
    +'<circle cx="36" cy="52" r="2.4" fill="#fff"/>';
  }else if(b.t==="chou"||b.t==="ageha"||b.t==="tateha"||b.t==="shijimi"||b.t==="seseri"||b.t==="ga"){
    inner=butterfly(b.t,c1,c2,K,leg);
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
    +'<path d="M46 25 C40 12 50 6 40 -2 M54 25 C60 12 50 6 60 -2" fill="none" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>'
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
  return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+b.n+'">'+inner+'</svg>';
}
  function speciesSVG(sp){
    if(!sp)return "";
    var cols=sp.colors||["#7A6B3A","#2A3D2C"];
    return bugSVG({t:sp.renderer||"other", c1:cols[0], c2:cols[1], n:sp.jaName||sp.id||""});
  }
  global.Q4BRender={ draw:bugSVG, species:speciesSVG };
})(window);
