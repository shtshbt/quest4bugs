/* Quest4Bugs バトルエンジン（共有）。ボスロスター＋相性・ダメージ・HP・解禁ロジック。
   属性=取得元ゲームの3すくみ: かんじ(蝶ガ) ▶ けいさん(甲虫) ▶ えいご(その他) ▶ かんじ。
   ダメージ 有利20/普通10/不利5、ボス被ダメ ミス10/防御成功は相性で5・7・9。技は一律。レア度=HP(粘り)。
   通常ボスHP 60/90/120（帯）、天敵(5の倍数)は帯×1.5=90/135/180、モズ(最終・無属性)=140。
   賢いプレイ(弱点属性で攻撃)なら約5問・普通で約10問。解禁は battle.html の年齢別到達度(REACH)で判定。 */
(function(global){
  "use strict";
  var ROSTER = [{"id":"agrias_tateha","type":"kanji","rarity":"SSR","predator":false,"stage":1,"hp":60,"unlock":200},{"id":"agrippa_suzume","type":"kanji","rarity":"SSR","predator":false,"stage":2,"hp":60,"unlock":250},{"id":"akasuji_kin_himekinkamemushi","type":"eitango","rarity":"SSR","predator":false,"stage":3,"hp":60,"unlock":300},{"id":"caucasus_beetle","type":"keisan","rarity":"SSR","predator":false,"stage":4,"hp":60,"unlock":350},{"id":"nihon_kanahebi","type":"kanji","predator":true,"final":false,"stage":5,"hp":90,"unlock":400},{"id":"didier_shika_kuwagata","type":"keisan","rarity":"SSR","predator":false,"stage":6,"hp":60,"unlock":450},{"id":"emperor_cicada","type":"eitango","rarity":"SSR","predator":false,"stage":7,"hp":60,"unlock":500},{"id":"eurosternus_noko_kuwagata","type":"keisan","rarity":"SSR","predator":false,"stage":8,"hp":60,"unlock":550},{"id":"giraffe_stag_beetle","type":"keisan","rarity":"SSR","predator":false,"stage":9,"hp":60,"unlock":600},{"id":"ashidaka_gumo","type":"keisan","predator":true,"final":false,"stage":10,"hp":90,"unlock":650},{"id":"guntai_ari","type":"eitango","rarity":"SSR","predator":false,"stage":11,"hp":60,"unlock":700},{"id":"hatchou_tonbo","type":"eitango","rarity":"SSR","predator":false,"stage":12,"hp":60,"unlock":750},{"id":"hisamatsu_midorishijimi","type":"kanji","rarity":"SSR","predator":false,"stage":13,"hp":60,"unlock":800},{"id":"kirishima_midorishijimi","type":"kanji","rarity":"SSR","predator":false,"stage":14,"hp":60,"unlock":850},{"id":"oo_jorogumo","type":"eitango","predator":true,"final":false,"stage":15,"hp":90,"unlock":900},{"id":"mukashi_yanma","type":"eitango","rarity":"SSR","predator":false,"stage":16,"hp":90,"unlock":950},{"id":"nanahoshi_kin_kamemushi","type":"eitango","rarity":"SSR","predator":false,"stage":17,"hp":90,"unlock":1000},{"id":"nishiki_tsubamega","type":"kanji","rarity":"SSR","predator":false,"stage":18,"hp":90,"unlock":1050},{"id":"owl_butterfly","type":"kanji","rarity":"SSR","predator":false,"stage":19,"hp":90,"unlock":1100},{"id":"seaka_gokegumo","type":"kanji","predator":true,"final":false,"stage":20,"hp":135,"unlock":1150},{"id":"sashihari_ari","type":"eitango","rarity":"SSR","predator":false,"stage":21,"hp":90,"unlock":1200},{"id":"taiwan_oo_tagame","type":"eitango","rarity":"SSR","predator":false,"stage":22,"hp":90,"unlock":1250},{"id":"titan_kamikiri","type":"keisan","rarity":"SSR","predator":false,"stage":23,"hp":90,"unlock":1300},{"id":"apollo","type":"kanji","rarity":"SS","predator":false,"stage":24,"hp":90,"unlock":1350},{"id":"daiou_sasori","type":"keisan","predator":true,"final":false,"stage":25,"hp":135,"unlock":1400},{"id":"asahina_kimadara_seseri","type":"kanji","rarity":"SS","predator":false,"stage":26,"hp":90,"unlock":1450},{"id":"bhutan_glory","type":"kanji","rarity":"SS","predator":false,"stage":27,"hp":90,"unlock":1500},{"id":"goliath_beetle","type":"keisan","rarity":"SS","predator":false,"stage":28,"hp":90,"unlock":1550},{"id":"gunki_oo_ari","type":"eitango","rarity":"SS","predator":false,"stage":29,"hp":90,"unlock":1600},{"id":"goliath_birdeater","type":"keisan","predator":true,"final":false,"stage":30,"hp":135,"unlock":1650},{"id":"halmus_tentou","type":"keisan","rarity":"SS","predator":false,"stage":31,"hp":90,"unlock":1700},{"id":"hercules_beetle","type":"keisan","rarity":"SS","predator":false,"stage":32,"hp":90,"unlock":1750},{"id":"mandibularis_futamata_kuwagata","type":"keisan","rarity":"SS","predator":false,"stage":33,"hp":90,"unlock":1800},{"id":"morpho_butterfly","type":"kanji","rarity":"SS","predator":false,"stage":34,"hp":90,"unlock":1850},{"id":"nihon_hikigaeru","type":"eitango","predator":true,"final":false,"stage":35,"hp":135,"unlock":1900},{"id":"mukashi_tonbo","type":"eitango","rarity":"SS","predator":false,"stage":36,"hp":120,"unlock":1950},{"id":"neptunus_oo_kabuto","type":"keisan","rarity":"SS","predator":false,"stage":37,"hp":120,"unlock":2000},{"id":"ni_idolomantis_diabolica","type":"eitango","rarity":"SS","predator":false,"stage":38,"hp":120,"unlock":2050},{"id":"oba_kuwa_eda_shaku","type":"kanji","rarity":"SS","predator":false,"stage":39,"hp":120,"unlock":2100},{"id":"oo_geji","type":"eitango","predator":true,"final":false,"stage":40,"hp":180,"unlock":2150},{"id":"parry_futamata_kuwagata","type":"keisan","rarity":"SS","predator":false,"stage":41,"hp":120,"unlock":2200},{"id":"queen_alexandras_birdwing","type":"kanji","rarity":"SS","predator":false,"stage":42,"hp":120,"unlock":2250},{"id":"rainbow_stag_beetle","type":"keisan","rarity":"SS","predator":false,"stage":43,"hp":120,"unlock":2300},{"id":"sasakia_oomurasaki_ss","type":"kanji","rarity":"SS","predator":false,"stage":44,"hp":120,"unlock":2350},{"id":"tobizu_mukade","type":"eitango","predator":true,"final":false,"stage":45,"hp":180,"unlock":2400},{"id":"satanas_oo_kabuto","type":"keisan","rarity":"SS","predator":false,"stage":46,"hp":120,"unlock":2450},{"id":"sekai_saichou_nanafushi","type":"eitango","rarity":"SS","predator":false,"stage":47,"hp":120,"unlock":2500},{"id":"wallace_giant_bee","type":"eitango","rarity":"SS","predator":false,"stage":48,"hp":120,"unlock":2550},{"id":"yonagunisan","type":"kanji","rarity":"SS","predator":false,"stage":49,"hp":120,"unlock":2600},{"id":"mozu","type":"none","predator":true,"final":true,"stage":50,"hp":140,"unlock":2650}];
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
  /* 防御で受けるダメージ。ミス=10(全弾)。成功時は防御役の相性で軽減: 有利5/普通7/不利9（厳しめ）。
     none(モズ)は弱点なし=成功時は普通7扱い。完全無傷にはしない(常に削れる=パーティHP・編成が効く)。
     2万回試行: 弱点あり正答75%→勝率97%/65%→83%、弱点なし75%→55%。速攻5ターンでも1〜2体ロスト。 */
  var DEF_ADV = 5, DEF_NEUTRAL = 7, DEF_DIS = 9;
  function bossDamage(defended, defenderType, bossType){
    if(!defended) return BOSS_DMG;                          // 防御ミス=10
    if(!defenderType || !bossType || bossType==="none") return DEF_NEUTRAL;
    if(BEATS[defenderType]===bossType) return DEF_ADV;      // 有利=5
    if(BEATS[bossType]===defenderType) return DEF_DIS;      // 不利=9
    return DEF_NEUTRAL;                                     // 普通=7
  }
  /* 自軍の虫HP（レア度準拠・粘り） */
  var HP_BY_TIER = { N:8, R:10, SR:13, SSR:16, SS:20 };
  function bugHP(rarity){ return HP_BY_TIER[rarity] || 8; }
  /* 旧ゲージ方式の互換API。現在の画面解禁は年齢別到達度(REACH)で判定する。 */
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
  /* ボス報酬。昆虫ボス=初回のみ種取得＋再戦少量琥珀。天敵=琥珀(帯50/150/300、モズ1000)＋バッジ／再戦も少量琥珀。
     再戦琥珀は腕試しの動機を残す範囲(昆虫10/天敵浅層15/深層20/モズ30)。パーティは1種1匹(重複不可)。 */
  function predAmber(stage){ if(stage>=50)return 1000; if(stage>=36)return 300; if(stage>=16)return 150; return 50; }
  function predAmberRetry(stage){ if(stage>=50)return 30; if(stage>=36)return 20; return 15; }
  var INSECT_RETRY_AMBER=10;
  function bossReward(r, alreadyCleared){
    if(!r) return null;
    if(alreadyCleared){
      /* 再戦も少量琥珀＝再挑戦の旨味は残しつつ farming は抑制。 */
      var amt=r.predator?predAmberRetry(r.stage):INSECT_RETRY_AMBER;
      return { kind:"amber", amber:amt, first:false, predator:!!r.predator, speciesId:(r.predator?null:r.id) };
    }
    if(r.predator){
      return { kind:"amber", amber:predAmber(r.stage), first:true, final:!!r.final,
        badge:(r.final?"champion":"nemesis-"+r.stage), title:(r.final?"おうじゃ":null) };
    }
    return { kind:"species", speciesId:r.id, first:true };
  }
  /* ボス特性（天敵のみ）。運なしが原則だが、最終ボス モズの dodge だけは意図的な例外(20%回避)。 */
  var TRAITS = {
    renzoku:{key:"renzoku",icon:"🦶",name:"れんぞく",desc:"ぼうぎょが 2かい！"},
    doku:   {key:"doku",   icon:"☠️",name:"どく",   desc:"ぼうぎょを まちがえると ダメージ +5！"},
    yoroi:  {key:"yoroi",  icon:"🛡️",name:"ヨロイ",  desc:"ゆうり いがいの こうげきが はんげん！"},
    sensei: {key:"sensei", icon:"⚡",name:"せんせい",desc:"さいしょに ボスが こうげき！"},
    dodge:  {key:"dodge",  icon:"💨",name:"かいひ",  desc:"ときどき こうげきを よける！"}
  };
  /* 特性は弱→強で進む（並び替え後のステージ準拠）。値は配列＝複数特性可。
     トビズムカデ(No.45)は どく＋れんぞく の二重特性（猛毒の多足＝最恐の天敵）。 */
  var PRED_TRAIT = {5:["sensei"],10:["sensei"],15:["doku"],20:["doku"],25:["yoroi"],
    30:["yoroi"],35:["doku","yoroi"],40:["renzoku"],45:["doku","renzoku"],50:["dodge"]};
  function bossTraits(r){ if(!r||!r.predator) return []; var ks=PRED_TRAIT[r.stage]||[];
    return ks.map(function(k){return TRAITS[k];}); }
  function hasTrait(r,key){ var ks=(r&&r.predator)?(PRED_TRAIT[r.stage]||[]):[]; return ks.indexOf(key)>=0; }
  var DODGE_CHANCE = 0.2, DOKU_BONUS = 5;
  /* パーティ上限: 天敵は総力戦の6匹、昆虫ボスは少数精鋭の3匹（HP半減で歯ごたえ・弱点属性必須化）。
     弱点を突き専用編成すれば勝てる＋高帯到達時はコレクションが厚いので詰みにならない。 */
  var INSECT_PARTY = 3, PRED_PARTY = 6;
  function bossPartySize(r){ return (r&&r.predator)?PRED_PARTY:INSECT_PARTY; }
  global.Q4BBattle = {
    roster: ROSTER, BEATS: BEATS, BASE_DMG: BASE_DMG, BOSS_DMG: BOSS_DMG,
    DMG_NEUTRAL: DMG_NEUTRAL, DMG_ADV: DMG_ADV, DMG_DIS: DMG_DIS,
    DEF_ADV: DEF_ADV, DEF_NEUTRAL: DEF_NEUTRAL, DEF_DIS: DEF_DIS,
    damage: damage, bossDamage: bossDamage, advLabel: advLabel, bugHP: bugHP, HP_BY_TIER: HP_BY_TIER,
    unlockCost: unlockCost, unlockedStages: unlockedStages, nextUnlock: nextUnlock, bossAt: bossAt,
    bossReward: bossReward, predAmber: predAmber,
    TRAITS: TRAITS, bossTraits: bossTraits, hasTrait: hasTrait, bossPartySize: bossPartySize,
    INSECT_PARTY: INSECT_PARTY, PRED_PARTY: PRED_PARTY, DODGE_CHANCE: DODGE_CHANCE, DOKU_BONUS: DOKU_BONUS
  };
  /* 全ボス種idを共有→render.deco が roster の全ボスに統一強調枠を付けられる（背景テーマ不統一の解消） */
  global.Q4B_BOSS_IDS = {};
  ROSTER.forEach(function(r){ global.Q4B_BOSS_IDS[r.id] = 1; });
})(window);
