/* 卵育成: 1200種ごとに個別 SVG を作らず、~25 種類の archetype を order/family/subfamily から自動アサイン。
   未制作の archetype は呼び出し側で絵文字 (🐛/🛌/🦗) fallback。
   詳細: docs/breeding_eggs_plan.md §視覚資産 */
(function(global){
  "use strict";

  /* 優先度の高い順 (subfamily → family → superfamily → order) に評価。
     match の field が全て一致する最初のルールを採用する。 */
  var ARCHETYPE_RULES=[
    /* 完全変態 */
    {match:{family:"Scarabaeidae"},        larva:"koganemushi", pupa:"kabuto_pupa"},
    {match:{family:"Rutelidae"},           larva:"koganemushi", pupa:"kabuto_pupa"},
    {match:{family:"Cetoniidae"},          larva:"koganemushi", pupa:"kabuto_pupa"},
    {match:{family:"Melolonthidae"},       larva:"koganemushi", pupa:"kabuto_pupa"},
    {match:{family:"Dynastidae"},          larva:"koganemushi", pupa:"kabuto_pupa"},
    {match:{family:"Lucanidae"},           larva:"kuwagata",    pupa:"kabuto_pupa"},
    {match:{family:"Cerambycidae"},        larva:"kamikiri",    pupa:"kabuto_pupa"},
    {match:{family:"Curculionidae"},       larva:"zoumushi",    pupa:"kabuto_pupa"},
    {match:{family:"Dytiscidae"},          larva:"mizu_kouchu", pupa:"kabuto_pupa"},
    {match:{family:"Gyrinidae"},           larva:"mizu_kouchu", pupa:"kabuto_pupa"},
    {match:{family:"Hydrophilidae"},       larva:"mizu_kouchu", pupa:"kabuto_pupa"},
    {match:{order:"Coleoptera"},           larva:"koganemushi", pupa:"kabuto_pupa"}, /* 既定 */
    /* チョウ目: 蛾 family を先に拾い、残りは蝶として既定 */
    {match:{family:"Sphingidae"},          larva:"imomushi",    pupa:"ga_pupa"},
    {match:{family:"Saturniidae"},         larva:"kemushi",     pupa:"ga_pupa"},
    {match:{family:"Bombycidae"},          larva:"kemushi",     pupa:"ga_pupa"},
    {match:{family:"Limacodidae"},         larva:"kemushi",     pupa:"ga_pupa"},
    {match:{family:"Erebidae"},            larva:"kemushi",     pupa:"ga_pupa"},
    {match:{family:"Noctuidae"},           larva:"imomushi",    pupa:"ga_pupa"},
    {match:{family:"Geometridae"},         larva:"imomushi",    pupa:"ga_pupa"},
    {match:{family:"Arctiidae"},           larva:"kemushi",     pupa:"ga_pupa"},
    {match:{family:"Lasiocampidae"},       larva:"kemushi",     pupa:"ga_pupa"},
    {match:{family:"Lymantriidae"},        larva:"kemushi",     pupa:"ga_pupa"},
    {match:{order:"Lepidoptera"},          larva:"imomushi",    pupa:"chou_pupa"}, /* 蝶 既定 */
    {match:{order:"Hymenoptera"},          larva:"hachi",       pupa:"hachi_pupa"},
    {match:{order:"Diptera"},              larva:"uji",         pupa:"hachi_pupa"},
    /* 不完全変態 */
    {match:{order:"Odonata"},              nymph:"yago"},
    {match:{order:"Mantodea"},             nymph:"kamakiri"},
    {match:{family:"Cicadidae"},           nymph:"semi"},
    {match:{order:"Hemiptera"},            nymph:"kamemushi_nymph"},
    {match:{order:"Blattodea"},            nymph:"gokiburi"},
    {match:{order:"Orthoptera"},           nymph:"batta"}, /* 既定 */
    {match:{order:"Phasmatodea"},          nymph:"batta"}
  ];

  function matchSp(sp,m){
    var k;
    for(k in m){ if(m.hasOwnProperty(k) && sp[k]!==m[k]) return false; }
    return true;
  }

  /* sp の order/family/subfamily から archetype をルックアップ。
     返り値: {larva, pupa, nymph} のうち該当する key のみ string。完全変態は larva/pupa、不完全変態は nymph。
     卵対象外 order なら fallback (imomushi/kabuto_pupa/batta)。 */
  function archetypesFor(sp){
    if(!sp) return {larva:"imomushi",pupa:"kabuto_pupa",nymph:"batta"};
    var i, r;
    for(i=0;i<ARCHETYPE_RULES.length;i++){
      r=ARCHETYPE_RULES[i];
      if(matchSp(sp,r.match)){
        return {larva:r.larva||null, pupa:r.pupa||null, nymph:r.nymph||null};
      }
    }
    return {larva:"imomushi",pupa:"kabuto_pupa",nymph:"batta"};
  }

  /* 絵文字 fallback (SVG 未制作時): ステージ→絵文字 */
  function stageEmoji(stage){
    if(stage==="egg")    return "🥚";
    if(stage==="larva")  return "🐛";
    if(stage==="pupa")   return "🛌";
    if(stage==="nymph")  return "🦗";
    return "";
  }

  /* 制作済 SVG の whitelist (assets/larva_svg/ に存在するもの)。
     未収載のものは emoji にフォールバック。Phase 6.5 で随時拡充。 */
  var SVG_AVAILABLE={
    egg:1, koganemushi:1, imomushi:1, kabuto_pupa:1, yago:1
    /* 追加予定: kuwagata, kamikiri, zoumushi, mizu_kouchu, kemushi, hachi, uji,
       chou_pupa, ga_pupa, hachi_pupa, batta, kamakiri, semi, kamemushi_nymph, gokiburi */
  };

  /* archetype name → SVG ファイル URL (HTML からの相対パスは呼び出し側で解決) */
  function svgUrl(name, basePath){
    if(!name || !SVG_AVAILABLE[name]) return null;
    var base = basePath || "./assets/larva_svg/";
    return base + name + ".svg";
  }

  /* 卵カード/孵化アニメ用 visual: stage + sp から archetype を引いて
     {svgUrl, emoji, archetype} を返す。svgUrl が null なら emoji を使う側で判断。
     basePath は呼び出し側 (ホーム / 教科ページ) のドキュメントルートに合わせる。 */
  function stageVisualFor(stage, sp, basePath){
    if(stage === "egg"){
      return {archetype:"egg", svgUrl:svgUrl("egg",basePath), emoji:"🥚"};
    }
    if(stage === "adult"){
      /* 成虫: archetype ではなく Q4BRender.species を使う側でハンドル */
      return {archetype:null, svgUrl:null, emoji:""};
    }
    var arch = archetypesFor(sp);
    var name = arch[stage] || null;
    return {archetype:name, svgUrl:svgUrl(name,basePath), emoji:stageEmoji(stage)};
  }

  global.Q4BArchetypes={
    archetypesFor:archetypesFor,
    stageEmoji:stageEmoji,
    stageVisualFor:stageVisualFor,
    svgUrl:svgUrl,
    SVG_AVAILABLE:SVG_AVAILABLE,
    RULES:ARCHETYPE_RULES
  };
})(typeof window!=="undefined"?window:globalThis);
