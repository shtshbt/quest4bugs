(function(global){
  "use strict";

  /* 学習達成のメダル (design 6.6 / tools_design 3 章)。表示名はメダル経済の公開後だけ
     「メダル」で、それまでは従来のトロフィー表記 (displayName を参照)。
     保存キー (trophyProgress / trophies) はどちらでも互換のため旧名のまま据え置く。
     小道専用のマスター虫は新設せず、既存種の
     パラメトリック SVG を金色化して授与する。地域を重ねるほど新規マスター種の
     選定が厳しくなり持続不能になるため。

     獲得条件は Lv10 到達ではなく Lv10 クリア。到達だけで配ると「上がった瞬間に
     もらえる」ので、安定して解けることの証明にならない。 */

  var GOLD_COLORS=["#F0C24A","#8A6410"];
  /* 仮置き。design 16 章の未確定事項 1 (最終値は実測後)。 */
  var STABILITY={windowSize:20,minAnswers:20,minAccuracy:0.85};

  /* リセット周回 (tools_design 5 章)。Lv10 クリアから 7 日の暦ゲートを置き、その
     あとで本人が選んだときだけ Lv1 に戻す。週 1 回程度の全周回 (Lv1-10 + 安定判定
     = 実質 100 問超の 85% 正答) は farming ではなく復習で、暦時間のロックが上限を
     定めるので無限の蛇口にはならない。2 周目以降の鋳造は 2 枚。 */
  var RESET_LOCK_DAYS=7;
  var DAY_MS=24*60*60*1000;

  /* cat 1 つにトロフィー 1 個。代表虫はその cat の最終 Lv 帯を投入した volume の
     看板が既定で、k5 cat は看板が 1 種しかないので同じ volume の別 SR を指定する
     (design 6.7)。捕獲抽選には一切影響しない。表示専用の対応づけ。 */
  var TROPHIES=[
    {trophyId:"madagascar_ratio",cat:"kom_ratio",speciesId:"oo_onaga_yamamayu",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    {trophyId:"madagascar_kuku_dan2",cat:"kom_kuku_dan2",speciesId:"kanmuri_kareha_kamakiri",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    {trophyId:"madagascar_kuku_run",cat:"kom_kuku_run",speciesId:"oo_togeashi_kirigirisu",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    {trophyId:"madagascar_pi314",cat:"kom_pi314",speciesId:"medama_yamamayu",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    {trophyId:"madagascar_kuku_dan5",cat:"kom_kuku_dan5",speciesId:"benihoshi_oo_ageha",regionId:"madagascar",regionName:"マダガスカルえんせい"},
    /* 更新 2 (オーストラリア遠征 I)。2026-08-17 の volume freeze で確定。
       release_linkage 3 章の規定どおり、看板を割り当てるのは k10 側 1 本で、残りは
       同じ volume の SR 帯から個別指定する。更新 2 は k10 が 2 本あるため、看板
       papilio_ulysses は図化 (kom_diagram_model) に立てた。受験 ROI を優先して
       release 9 から前倒しした新カテゴリを、最も強い虫で支える判断。
       未割当の SR 予備: papilio_aegeus、tectocoris_diophthalmus、
       eupoecila_australasiae、dasypodia_selenophora、myrmecia_forficata。 */
    {trophyId:"australia_diagram_model",cat:"kom_diagram_model",speciesId:"papilio_ulysses",regionId:"australia",regionName:"オーストラリアえんせい"},        // 看板 (SSR) ウリッセスアゲハ
    {trophyId:"australia_unit_convert",cat:"kom_unit_convert",speciesId:"podacanthus_viridiroseus",regionId:"australia",regionName:"オーストラリアえんせい"},  // SSR ベニバネナナフシ
    {trophyId:"australia_kuku_ura",cat:"kom_kuku_ura",speciesId:"lamprima_aurata",regionId:"australia",regionName:"オーストラリアえんせい"},                 // SSR アウラタキンイロクワガタ
    {trophyId:"australia_kuku_dan3",cat:"kom_kuku_dan3",speciesId:"extatosoma_tiaratum",regionId:"australia",regionName:"オーストラリアえんせい"},           // SR ユウレイヒレアシナナフシ
    {trophyId:"australia_kuku_dan4",cat:"kom_kuku_dan4",speciesId:"chrysolopus_spectabilis",regionId:"australia",regionName:"オーストラリアえんせい"},       // SR ホシゾラゾウムシ
    /* 更新 3 (ボルネオ遠征 I)。2026-08-21 の volume 発射待機仕込みで確定。
       release_linkage 3 章の規定どおり、看板を割り当てるのは k10 側 1 本
       (kom_frac_flow) で、残り k5 の 3 本は同じ volume の SR 帯から個別指定する。
       k5 の 3 本は読みやすい名の種を選んだ (AU I precedent)。cat 4 本の release は
       3 なので、CURRENT_RELEASE が 3 に届くまでこの 4 行は画面に出ない
       (事前準備方式。tests/test_komorebi_acceptance.js 15.5 は公開済みどうしを比べる)。
       未割当の SR 予備: troides_amphrysus (アンフリサスキシタアゲハ)、
       neurobasis_longipes (ヒスイカワトンボ)、haaniella_echinata (トゲハダナナフシ)、
       pulchriphyllium_mannani (ウツクシコノハムシ)。 */
    {trophyId:"borneo_frac_flow",cat:"kom_frac_flow",speciesId:"trogonoptera_brookiana",regionId:"borneo",regionName:"ボルネオえんせい"},   // 看板 (SSR) アカエリアゲハ
    /* 2026-08-28 追加。k10 2 本目 (割合の表現変換) の代表虫は、看板が frac_flow で
       埋まっているので上の未割当 SR 予備の先頭から採る。 */
    {trophyId:"borneo_ratio_forms",cat:"kom_ratio_forms",speciesId:"troides_amphrysus",regionId:"borneo",regionName:"ボルネオえんせい"}, // SR アンフリサスキシタアゲハ
    {trophyId:"borneo_kuku_inverse",cat:"kom_kuku_inverse",speciesId:"lyssa_zampa",regionId:"borneo",regionName:"ボルネオえんせい"},        // SR オオツバメガ
    {trophyId:"borneo_kuku_dan6",cat:"kom_kuku_dan6",speciesId:"discotettix_belzebuth",regionId:"borneo",regionName:"ボルネオえんせい"},    // SR ツノヒシバッタ
    {trophyId:"borneo_kuku_dan7",cat:"kom_kuku_dan7",speciesId:"toxodera_hauseri",regionId:"borneo",regionName:"ボルネオえんせい"},         // SR エダカマキリ
    /* 更新 4 (オーストラリア遠征 II)。2026-08-28 の再編で更新 6 から繰り上げ、下の
       据え置きブロックを有効化した。cat の顔ぶれは再編で変わっている: 元案は コスタリカ
       遠征 I から借りる 4 本 (kuku_bridge / equation_select / kuku_dan8 / kuku_dan9) を
       想定していたが、AU II が自前の k10 2 本と k5 2 本を持つ形に変えたため、種は
       freeze draft の 4 種をそのまま使い cat だけを差し替えた。
       看板は k10 側 1 本 (kom_hayasa) に与え、残り 3 本は同じ巻の SSR と SR 帯から個別
       指定する (release_linkage 3 章、ボルネオ I と同じ規定)。 */
    {trophyId:"australia2_hayasa",cat:"kom_hayasa",speciesId:"anoplognathus_viridiaeneus",regionId:"australia",regionName:"オーストラリアえんせい"},  // 看板 (SSR) キンミドリコガネ
    {trophyId:"australia2_johou_seiri",cat:"kom_johou_seiri",speciesId:"aleeta_curvicosta",regionId:"australia",regionName:"オーストラリアえんせい"}, // SSR コナフキゼミ
    {trophyId:"australia2_equation_select",cat:"kom_equation_select",speciesId:"dryococelus_australe",regionId:"australia",regionName:"オーストラリアえんせい"}, // SSR クロオオナナフシ
    {trophyId:"australia2_kuku_dan8",cat:"kom_kuku_dan8",speciesId:"xylotrupes_australicus",regionId:"australia",regionName:"オーストラリアえんせい"}, // SR クロツノカブト
    /* 更新 5 (マダガスカル遠征 II)。2026-08-28 の再編で、借り物の 4 本から自前の 3 本 +
       暫定 1 本の構成へ変えた。看板は k10 側 1 本 (kom_kisokusei) に与える。
       分数の解き方は暫定でこの巻にも載るが、代表虫はボルネオ I 側 (borneo_frac_flow)
       のままである。cat 1 本にトロフィー 1 個の規定どおりで、ここには行を作らない。
       整数の性質の実装が入ったら epilissus_splendidus (SSR ルリミドリマルコガネ) を
       与える。種の根拠は mg_expedition2_freeze_draft.md 2.1 / 2.2 章。 */
    {trophyId:"madagascar2_kisokusei",cat:"kom_kisokusei",speciesId:"phyllocrania_paradoxa",regionId:"madagascar",regionName:"マダガスカルえんせい"}, // 看板 (SSR) ネジレカンムリカマキリ
    {trophyId:"madagascar2_kuku_bridge",cat:"kom_kuku_bridge",speciesId:"madranga_segnita",regionId:"madagascar",regionName:"マダガスカルえんせい"},  // SSR ベニルリヨコバイ
    {trophyId:"madagascar2_kuku_dan9",cat:"kom_kuku_dan9",speciesId:"helictopleurus_quadripunctatus",regionId:"madagascar",regionName:"マダガスカルえんせい"} // SR ヨツボシコガネ
  ];

  /* --- 旧 更新 6 (オーストラリア遠征 II) の据え置きブロックは 2026-08-28 に有効化した ---
     AU II は再編で更新 4 へ繰り上がり、自前の k10 2 本と k5 2 本を持つ巻になった。
     代表種 4 種は freeze draft 2.1 / 2.2 章の選定をそのまま使い、cat だけを新しい
     顔ぶれへ差し替えて上の TROPHIES に入れてある。

     未割当の SR 予備: castiarina_sexplagiata (ダイダイオビタマムシ)、
     podacanthus_typhon (モモバネナナフシ)、rhyothemis_graphiptera
     (キンモンチョウトンボ)、cosmodes_elegans (ミドリモンヤガ)、
     hierodula_werneri (オオミドリカマキリ)、thopha_saccata (オオフクロゼミ)。 */

  /* --- 更新 5 (マダガスカル遠征 II) のメダル代表種 (据え置き。有効化しない) --------
     更新 5 は学習カテゴリを伴わない図鑑ドロップなので、新規トロフィーは 0 件。
     MG II が manifest で挙げる 4 本 (kom_frac_flow / kom_kuku_inverse /
     kom_kuku_dan6 / kom_kuku_dan7) は ボルネオ遠征 I (更新 3) から借りる cat で、
     release_linkage 3 章の規定 (代表虫 = その cat の最終 Lv 帯を投入した巻の看板) では
     代表虫は ボルネオ I 側に立つ (上の borneo_* 4 行が実体)。cat は 1 本につき
     トロフィー 1 個なので (tests/test_komorebi_acceptance.js 15.5 が cat と
     trophyId の一意を見る)、下の 4 行を borneo_* の行と同時に入れることはできない。

     代表虫を MG II 側へ移す判断をしたときだけ、ボルネオ I 側の同じ cat の行を
     外して入れ替える。種の根拠は zukan_foundry/reports/mg_expedition2_freeze_draft.md
     2.1 章 (SSR) と 2.2 章 (SR)、および承認記録 (2026-08-21 の 80 種案選択)。

     {trophyId:"madagascar2_frac_flow",cat:"kom_frac_flow",speciesId:"phyllocrania_paradoxa",regionId:"madagascar",regionName:"マダガスカルえんせい"},       // 看板 (SSR) ネジレカンムリカマキリ
     {trophyId:"madagascar2_kuku_inverse",cat:"kom_kuku_inverse",speciesId:"epilissus_splendidus",regionId:"madagascar",regionName:"マダガスカルえんせい"},   // SSR ルリミドリマルコガネ
     {trophyId:"madagascar2_kuku_dan6",cat:"kom_kuku_dan6",speciesId:"madranga_segnita",regionId:"madagascar",regionName:"マダガスカルえんせい"},             // SSR ベニルリヨコバイ
     {trophyId:"madagascar2_kuku_dan7",cat:"kom_kuku_dan7",speciesId:"helictopleurus_quadripunctatus",regionId:"madagascar",regionName:"マダガスカルえんせい"}, // SR ヨツボシコガネ

     未割当の SR 予備: papilio_epiphorbas (アサギボシアゲハ)、acraea_strattipocles
     (ベニゾメホソチョウ)、appasus_quadrivittatus (スジコオイムシ)、
     parectatosoma_mocquerysi (ベニトゲアシナナフシ)、brancsikia_aeroplana
     (ハイイロカレハカマキリ)。 */

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}

  function list(){return TROPHIES.map(function(trophy){return trophy;});}

  function forCat(cat){
    return TROPHIES.filter(function(trophy){return trophy.cat===cat;})[0]||null;
  }

  /* 金色化に素材は要らない。Q4BRender.species は sp.colors を読むだけなので、
     色だけ差し替えた複製を渡せば金の虫が描ける (ui_design 6 章)。
     看板が写真つきの種になっても、トロフィーは SVG 側を金色化して使う。 */
  function goldSpecies(sp){
    if(!isObject(sp))throw new Error("トロフィーの種データが正しくありません");
    var copy={},key;
    for(key in sp)if(Object.prototype.hasOwnProperty.call(sp,key))copy[key]=sp[key];
    copy.colors=GOLD_COLORS.slice();
    return copy;
  }

  function progressFor(profile,cat){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    if(!isObject(profile.trophyProgress))profile.trophyProgress={};
    var entry=profile.trophyProgress[cat];
    if(!isObject(entry)){entry={n:0,recent:[]};profile.trophyProgress[cat]=entry;}
    return entry;
  }

  function validateProgress(progress){
    if(!isObject(progress))throw new Error("トロフィー進捗の形式が正しくありません");
    Object.keys(progress).forEach(function(cat){
      var entry=progress[cat];
      if(!isObject(entry)||!Number.isInteger(entry.n)||entry.n<0||!Array.isArray(entry.recent))throw new Error("トロフィー進捗の形式が正しくありません");
      if(entry.recent.length>STABILITY.windowSize)throw new Error("トロフィー進捗の形式が正しくありません");
      entry.recent.forEach(function(value){if(value!==0&&value!==1)throw new Error("トロフィー進捗の形式が正しくありません");});
    });
    return progress;
  }

  function validateTrophies(trophies){
    if(!isObject(trophies))throw new Error("トロフィーデータの形式が正しくありません");
    Object.keys(trophies).forEach(function(id){
      var entry=trophies[id];
      if(!isObject(entry)||typeof entry.cat!=="string"||typeof entry.speciesId!=="string"||typeof entry.at!=="string")throw new Error("トロフィーデータの形式が正しくありません");
    });
    return trophies;
  }

  /* Lv10 での有効回答だけを数える。Lv9 以下の正答は安定判定の材料にならない。
     認識失敗や途中試行はそもそも呼ばれない (呼び出し側で弾いている)。 */
  function noteAnswer(profile,cat,lv,correct){
    if(typeof correct!=="boolean"||!Number.isInteger(lv))throw new Error("結果データが正しくありません");
    if(lv!==10)return null;
    var entry=progressFor(profile,cat);
    entry.n++;
    entry.recent.push(correct?1:0);
    while(entry.recent.length>STABILITY.windowSize)entry.recent.shift();
    return entry;
  }

  function qualifies(profile,cat){
    if(!isObject(profile))return false;
    var maxLv=profile.maxLv&&profile.maxLv[cat];
    if(!Number.isInteger(maxLv)||maxLv<10)return false;
    var entry=profile.trophyProgress&&profile.trophyProgress[cat];
    if(!isObject(entry)||entry.n<STABILITY.minAnswers||entry.recent.length<STABILITY.windowSize)return false;
    var ok=entry.recent.reduce(function(sum,value){return sum+value;},0);
    return ok/entry.recent.length>=STABILITY.minAccuracy;
  }

  /* --- 周回 --------------------------------------------------------------
     周回は 2 つの整数だけで数える。lapCount は「いま何周目か」(既定 1)、
     mintedLaps は「どの周回まで鋳造したか」(既定 0)。残高ではなく到達の記録で、
     枚数はここから導出する (1 周目 1 枚、2 周目以降は 1 周につき 2 枚)。 */

  function countMap(profile,key){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    if(!isObject(profile[key]))profile[key]={};
    return profile[key];
  }

  function lapOf(profile,cat){
    var value=isObject(profile)&&isObject(profile.lapCount)?profile.lapCount[cat]:null;
    return Number.isInteger(value)&&value>=1?value:1;
  }

  function mintedLaps(profile,cat){
    var value=isObject(profile)&&isObject(profile.mintedLaps)?profile.mintedLaps[cat]:null;
    if(Number.isInteger(value)&&value>=0)return value;
    /* 周回を作る前に成立していた旧セーブは「1 周ぶん鋳造済み」とみなす。書き戻しは
       しない (読むたびに同じ答えが出るので、保存を起こす理由がない)。 */
    var trophy=forCat(cat);
    return trophy&&isObject(profile)&&isObject(profile.trophies)&&profile.trophies[trophy.trophyId]?1:0;
  }

  function medalsForLap(lap){return lap<=1?1:2;}

  /* その cat でこれまでに鋳造したメダルの総数。奉納ログとの突き合わせ (uro.pending)
     はこの数で行うので、周回が進めば捧げ待ちが 2 枚並ぶ。 */
  function medalCount(profile,cat){
    var laps=mintedLaps(profile,cat),total=0,lap;
    for(lap=1;lap<=laps;lap++)total+=medalsForLap(lap);
    return total;
  }

  /* ロックが明ける時刻 (ミリ秒)。起点は最後に Lv10 を安定クリアした瞬間で、
     鋳造のときにしか書かないので、あとで Lv が下がっても動かない。 */
  function resetReadyAt(profile,cat){
    var at=isObject(profile)&&isObject(profile.lv10ClearAt)?profile.lv10ClearAt[cat]:null;
    if(typeof at!=="string"||!at)return null;
    var time=Date.parse(at);
    return Number.isFinite(time)?time+RESET_LOCK_DAYS*DAY_MS:null;
  }

  /* リセットできるのは、今の周回のメダルが鋳造済みで、かつロックが明けたとき。
     境界はちょうど 7 日で開ける (7 日目に押せない日が 1 日できるほうが不親切)。 */
  function canReset(profile,cat,nowMs){
    if(!forCat(cat))return false;
    if(mintedLaps(profile,cat)<lapOf(profile,cat))return false;
    var ready=resetReadyAt(profile,cat);
    if(ready===null||!Number.isFinite(nowMs))return false;
    return nowMs>=ready;
  }

  /* 次の周回へ進める。触るのは周回番号と安定判定の窓だけで、図鑑・捕獲済み・
     奉納記録には一切手を出さない (不変条件 6)。Lv と adapt の巻き戻しは呼び出し側
     (app.js) が同じ 1 回の保存の中で行う。
     到達 Lv (maxLv) は下げない: 下げると習熟済みの減衰が外れて、易しい問題で
     こはくを稼ぐ道がそのまま開いてしまう。 */
  function beginNextLap(profile,cat){
    if(!forCat(cat))throw new Error("カテゴリが正しくありません");
    var lap=lapOf(profile,cat);
    if(mintedLaps(profile,cat)<lap)return null;
    countMap(profile,"lapCount")[cat]=lap+1;
    /* 安定判定の窓は周回ごとに引き直す。前の周の 20 問が残っていると、Lv10 へ
       戻った瞬間に鋳造が成立してしまう。 */
    countMap(profile,"trophyProgress")[cat]={n:0,recent:[]};
    return lap+1;
  }

  /* 一度獲得したトロフィーは後の Lv 降格でも失わない。同じ周回では再授与しない。
     周回が進んだときだけ、新しい 1 周ぶんとして鋳造が成立する。返り値は鋳造した
     周回と枚数を添えたトロフィーの写し (交換フローの起動点)。 */
  function award(profile,cat,today){
    if(typeof today!=="string"||!today)throw new Error("授与日の指定が正しくありません");
    var trophy=forCat(cat);
    if(!trophy)return null;
    if(!isObject(profile.trophies))profile.trophies={};
    var lap=lapOf(profile,cat);
    if(mintedLaps(profile,cat)>=lap)return null;
    if(!qualifies(profile,cat))return null;
    /* 金の虫の表示は初回の獲得日のまま。周回で日付が書き換わると、最初に届いた日が
       記録から消えてしまう。 */
    if(!profile.trophies[trophy.trophyId])profile.trophies[trophy.trophyId]={cat:cat,speciesId:trophy.speciesId,at:today};
    countMap(profile,"mintedLaps")[cat]=lap;
    var minted={},key;
    for(key in trophy)if(Object.prototype.hasOwnProperty.call(trophy,key))minted[key]=trophy[key];
    minted.lap=lap;
    minted.medals=medalsForLap(lap);
    return minted;
  }

  /* 周回の 2 つの整数の形。壊れた値を通すと、ロックの起点も鋳造の回数も
     数えられなくなる。 */
  function validateLaps(profile){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    [["lapCount",1],["mintedLaps",0]].forEach(function(pair){
      var map=profile[pair[0]];
      if(map==null)return;
      if(!isObject(map))throw new Error("周回データの形式が正しくありません");
      Object.keys(map).forEach(function(cat){
        if(!Number.isInteger(map[cat])||map[cat]<pair[1])throw new Error("周回データの形式が正しくありません");
      });
    });
    return profile;
  }

  /* 表示語彙はメダル経済のスイッチに連動させる。経済が閉じている間は従来のトロフィー
     表記のままにし、「メダル」という言葉の初出を うろと道具の公開と同じ日に揃える
     (先に名前だけ変わると、捧げ先の無い画面で語彙だけ浮く)。
     小道 app を読み込んでいない文脈では従来表記に倒す。 */
  function medalWording(){
    var kom=global.Q4B_KOMOREBI;
    return !!(kom&&typeof kom.medalEconomyOn==="function"&&kom.medalEconomyOn());
  }

  /* 公開後の銘は種名付き (tools_design 3 章)。「マダガスカルオオゴキブリのメダル」の
     ように、どのカテゴリを納めたかが名前で分かる。保存キー (trophyProgress /
     trophies) は互換のためリネームしない。 */
  function displayName(trophy,speciesName){
    if(!medalWording())return trophy.regionName+"の きんいろ"+(speciesName||"トロフィー");
    return (speciesName||"きんいろ")+"のメダル";
  }

  global.Q4B_KOMOREBI_TROPHIES={
    goldColors:GOLD_COLORS.slice(),
    stability:STABILITY,
    resetLockDays:RESET_LOCK_DAYS,
    list:list,
    forCat:forCat,
    goldSpecies:goldSpecies,
    noteAnswer:noteAnswer,
    qualifies:qualifies,
    award:award,
    lapOf:lapOf,
    mintedLaps:mintedLaps,
    medalsForLap:medalsForLap,
    medalCount:medalCount,
    resetReadyAt:resetReadyAt,
    canReset:canReset,
    beginNextLap:beginNextLap,
    displayName:displayName,
    validateProgress:validateProgress,
    validateTrophies:validateTrophies,
    validateLaps:validateLaps
  };
})(typeof window!=="undefined"?window:globalThis);
