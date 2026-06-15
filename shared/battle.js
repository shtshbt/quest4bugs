/* Quest4Bugs バトルエンジン（共有）。ボスロスター＋相性・ダメージ・HP・解禁ロジック。
   属性=取得元ゲームの3すくみ: かんじ(蝶ガ) ▶ けいさん(甲虫) ▶ えいご(その他) ▶ かんじ。
   ダメージ 有利20/普通10/不利5、ボス被ダメ10。技は一律。レア度=HP(粘り)。ボスは習得ゲージで段階解禁。
   ボスHP 60/90/120（90基準）で、賢いプレイ（弱点属性で攻撃）なら約5問・普通で約10問の決着。 */
(function(global){
  "use strict";
  var ROSTER = [{"id":"agrias_tateha","type":"kanji","rarity":"SSR","predator":false,"stage":1,"hp":60,"unlock":200},{"id":"agrippa_suzume","type":"kanji","rarity":"SSR","predator":false,"stage":2,"hp":60,"unlock":250},{"id":"akasuji_kin_himekinkamemushi","type":"eitango","rarity":"SSR","predator":false,"stage":3,"hp":60,"unlock":300},{"id":"caucasus_beetle","type":"keisan","rarity":"SSR","predator":false,"stage":4,"hp":60,"unlock":350},{"id":"tobizu_mukade","type":"eitango","predator":true,"final":false,"stage":5,"hp":60,"unlock":400},{"id":"didier_shika_kuwagata","type":"keisan","rarity":"SSR","predator":false,"stage":6,"hp":60,"unlock":450},{"id":"emperor_cicada","type":"eitango","rarity":"SSR","predator":false,"stage":7,"hp":60,"unlock":500},{"id":"eurosternus_noko_kuwagata","type":"keisan","rarity":"SSR","predator":false,"stage":8,"hp":60,"unlock":550},{"id":"giraffe_stag_beetle","type":"keisan","rarity":"SSR","predator":false,"stage":9,"hp":60,"unlock":600},{"id":"ashidaka_gumo","type":"keisan","predator":true,"final":false,"stage":10,"hp":60,"unlock":650},{"id":"guntai_ari","type":"eitango","rarity":"SSR","predator":false,"stage":11,"hp":60,"unlock":700},{"id":"hatchou_tonbo","type":"eitango","rarity":"SSR","predator":false,"stage":12,"hp":60,"unlock":750},{"id":"hisamatsu_midorishijimi","type":"kanji","rarity":"SSR","predator":false,"stage":13,"hp":60,"unlock":800},{"id":"kirishima_midorishijimi","type":"kanji","rarity":"SSR","predator":false,"stage":14,"hp":60,"unlock":850},{"id":"oo_geji","type":"eitango","predator":true,"final":false,"stage":15,"hp":60,"unlock":900},{"id":"mukashi_yanma","type":"eitango","rarity":"SSR","predator":false,"stage":16,"hp":90,"unlock":950},{"id":"nanahoshi_kin_kamemushi","type":"eitango","rarity":"SSR","predator":false,"stage":17,"hp":90,"unlock":1000},{"id":"nishiki_tsubamega","type":"kanji","rarity":"SSR","predator":false,"stage":18,"hp":90,"unlock":1050},{"id":"owl_butterfly","type":"kanji","rarity":"SSR","predator":false,"stage":19,"hp":90,"unlock":1100},{"id":"seaka_gokegumo","type":"kanji","predator":true,"final":false,"stage":20,"hp":90,"unlock":1150},{"id":"sashihari_ari","type":"eitango","rarity":"SSR","predator":false,"stage":21,"hp":90,"unlock":1200},{"id":"taiwan_oo_tagame","type":"eitango","rarity":"SSR","predator":false,"stage":22,"hp":90,"unlock":1250},{"id":"titan_kamikiri","type":"keisan","rarity":"SSR","predator":false,"stage":23,"hp":90,"unlock":1300},{"id":"apollo","type":"kanji","rarity":"SS","predator":false,"stage":24,"hp":90,"unlock":1350},{"id":"daiou_sasori","type":"keisan","predator":true,"final":false,"stage":25,"hp":90,"unlock":1400},{"id":"asahina_kimadara_seseri","type":"kanji","rarity":"SS","predator":false,"stage":26,"hp":90,"unlock":1450},{"id":"bhutan_glory","type":"kanji","rarity":"SS","predator":false,"stage":27,"hp":90,"unlock":1500},{"id":"goliath_beetle","type":"keisan","rarity":"SS","predator":false,"stage":28,"hp":90,"unlock":1550},{"id":"gunki_oo_ari","type":"eitango","rarity":"SS","predator":false,"stage":29,"hp":90,"unlock":1600},{"id":"oo_jorogumo","type":"eitango","predator":true,"final":false,"stage":30,"hp":90,"unlock":1650},{"id":"halmus_tentou","type":"keisan","rarity":"SS","predator":false,"stage":31,"hp":90,"unlock":1700},{"id":"hercules_beetle","type":"keisan","rarity":"SS","predator":false,"stage":32,"hp":90,"unlock":1750},{"id":"mandibularis_futamata_kuwagata","type":"keisan","rarity":"SS","predator":false,"stage":33,"hp":90,"unlock":1800},{"id":"morpho_butterfly","type":"kanji","rarity":"SS","predator":false,"stage":34,"hp":90,"unlock":1850},{"id":"goliath_birdeater","type":"keisan","predator":true,"final":false,"stage":35,"hp":90,"unlock":1900},{"id":"mukashi_tonbo","type":"eitango","rarity":"SS","predator":false,"stage":36,"hp":120,"unlock":1950},{"id":"neptunus_oo_kabuto","type":"keisan","rarity":"SS","predator":false,"stage":37,"hp":120,"unlock":2000},{"id":"ni_idolomantis_diabolica","type":"eitango","rarity":"SS","predator":false,"stage":38,"hp":120,"unlock":2050},{"id":"oba_kuwa_eda_shaku","type":"kanji","rarity":"SS","predator":false,"stage":39,"hp":120,"unlock":2100},{"id":"nihon_kanahebi","type":"kanji","predator":true,"final":false,"stage":40,"hp":120,"unlock":2150},{"id":"parry_futamata_kuwagata","type":"keisan","rarity":"SS","predator":false,"stage":41,"hp":120,"unlock":2200},{"id":"queen_alexandras_birdwing","type":"kanji","rarity":"SS","predator":false,"stage":42,"hp":120,"unlock":2250},{"id":"rainbow_stag_beetle","type":"keisan","rarity":"SS","predator":false,"stage":43,"hp":120,"unlock":2300},{"id":"sasakia_oomurasaki_ss","type":"kanji","rarity":"SS","predator":false,"stage":44,"hp":120,"unlock":2350},{"id":"nihon_hikigaeru","type":"eitango","predator":true,"final":false,"stage":45,"hp":120,"unlock":2400},{"id":"satanas_oo_kabuto","type":"keisan","rarity":"SS","predator":false,"stage":46,"hp":120,"unlock":2450},{"id":"sekai_saichou_nanafushi","type":"eitango","rarity":"SS","predator":false,"stage":47,"hp":120,"unlock":2500},{"id":"wallace_giant_bee","type":"eitango","rarity":"SS","predator":false,"stage":48,"hp":120,"unlock":2550},{"id":"yonagunisan","type":"kanji","rarity":"SS","predator":false,"stage":49,"hp":120,"unlock":2600},{"id":"mozu","type":"none","predator":true,"final":true,"stage":50,"hp":120,"unlock":2650}];
  /* 3すくみ: key が value に強い（value をやられる側） */
  var BEATS = { kanji:"keisan", keisan:"eitango", eitango:"kanji" };
  /* ダメージは3段階固定（20/10/5）。基礎=普通10、有利20(2倍)、不利5(半分)。ボスの攻撃は10。 */
  var DMG_NEUTRAL = 10, DMG_ADV = 20, DMG_DIS = 5, BASE_DMG = DMG_NEUTRAL, BOSS_DMG = 10;
  /* attacker属性 が boss属性 に対して与えるダメージ。none(モズ)は弱点なし＝常に普通。 */
  function damage(attackerType, bossType){
    if(!attackerType || !bossType || bossType==="none") return DMG_NEUTRAL;
    if(BEATS[attackerType]===bossType) return DMG_ADV;   // 有利（2倍）
    if(BEATS[bossType]===attackerType) return DMG_DIS;   // 不利（半分）
    return DMG_NEUTRAL;                                  // 普通
  }
  function advLabel(attackerType, bossType){
    if(BEATS[attackerType]===bossType) return "ゆうり";
    if(BEATS[bossType]===attackerType) return "ふり";
    return "ふつう";
  }
  /* 自軍の虫HP（レア度準拠・粘り） */
  var HP_BY_TIER = { N:8, R:10, SR:13, SSR:16, SS:20 };
  function bugHP(rarity){ return HP_BY_TIER[rarity] || 8; }
  /* ボス解禁: 通常正解の累計(gauge)で stage を順に解禁。cost(n)=200+50*(n-1) を累積。 */
  function unlockCost(stage){ return 200 + 50*(stage-1); }
  function unlockedStages(totalCorrect){
    var c=0, n=0;
    for(var i=1;i<=ROSTER.length;i++){ c+=unlockCost(i); if(totalCorrect>=c) n=i; else break; }
    return n;  // 解禁済みボス数
  }
  function nextUnlock(totalCorrect){
    var c=0;
    for(var i=1;i<=ROSTER.length;i++){ c+=unlockCost(i); if(totalCorrect<c) return {stage:i, need:c-totalCorrect}; }
    return null;
  }
  function bossAt(stage){ for(var i=0;i<ROSTER.length;i++) if(ROSTER[i].stage===stage) return ROSTER[i]; return null; }
  global.Q4BBattle = {
    roster: ROSTER, BEATS: BEATS, BASE_DMG: BASE_DMG, BOSS_DMG: BOSS_DMG,
    DMG_NEUTRAL: DMG_NEUTRAL, DMG_ADV: DMG_ADV, DMG_DIS: DMG_DIS,
    damage: damage, advLabel: advLabel, bugHP: bugHP, HP_BY_TIER: HP_BY_TIER,
    unlockCost: unlockCost, unlockedStages: unlockedStages, nextUnlock: nextUnlock, bossAt: bossAt
  };
})(window);
