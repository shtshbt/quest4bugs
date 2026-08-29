(function(global){
  "use strict";

  /* 公開スイッチ (更新番号 CURRENT_RELEASE とメダル経済 MEDAL_ECONOMY_ON) の実体は
     shared/economy_flag.js が持つ。御神木パネルを描く portal は app.js を
     読み込まないので、判定に要る 2 つの数だけを切り出して両方から読む
     (tools_implementation_plan 検収指摘 3)。off の間に成立したメダルは、うろの
     初回訪問で遡って奉納できる (uro.pending)。
     読み込み忘れを黙って「全部未公開」に落とさず、その場で止める。公開済みの
     カテゴリまで消えた画面を出すより、読めなかったと言うほうがよい。 */
  function economyFlags(){
    var flags=global.Q4B_ECONOMY;
    if(!flags)throw new Error("公開スイッチを読み込めません");
    return flags;
  }
  function currentRelease(){return economyFlags().currentRelease();}
  function medalEconomyOn(){return economyFlags().on();}

  /* release は「どの更新で公開するか」。volume manifest がそのカテゴリを挙げていても、
     release が CURRENT_RELEASE を超える間は選択肢に出さない。 */
  var CATEGORIES={
    kom_ratio:{course:"k10",name:"割合と比",maxLv:10,release:1},
    kom_kuku_dan2:{course:"k5",name:"2の段暗唱",maxLv:10,release:1},
    kom_kuku_run:{course:"k5",name:"連続九九",maxLv:10,release:1},
    kom_pi314:{course:"k10",name:"3.14の段",maxLv:10,release:1},
    kom_unit_convert:{course:"k10",name:"単位換算",maxLv:10,release:2},
    kom_kuku_ura:{course:"k5",name:"九九のうら読み",maxLv:10,release:2},
    kom_kuku_inverse:{course:"k5",name:"九九の逆引き",maxLv:10,release:3},
    kom_frac_flow:{course:"k10",name:"分数の解き方",maxLv:10,release:3},
    /* 2026-08-28 再編。更新番号は「枠」で、地域も学習カテゴリも準備できた順にあてはめる
       (release_linkage 2 章)。写真ゼロの巻を先の番号に置くとチェーン全体が止まるため、
       完成済みの巻から出す。きまりと数えかた・速さ・情報整理は release 9 で寝ていたが、
       模試ゲートの撤廃 (roster 記録 13) で待つ理由が無くなったので前倒しした。 */
    kom_kisokusei:{course:"k10",name:"きまりと数えかた",maxLv:10,release:5},
    /* 整数の性質は マダガスカル遠征 II (更新 5) の k10 2 本目。CURRENT_RELEASE=3 の
       画面には出ない (curriculum v0.6、release_linkage 2 章)。 */
    kom_seisu:{course:"k10",name:"整数の性質",maxLv:10,release:5},
    kom_hayasa:{course:"k10",name:"速さ",maxLv:10,release:4},
    /* k10 新 3 カテゴリ (2026-08-14 決定)。表示名は各 curriculum doc の題名。
       release 9 なので CURRENT_RELEASE=1 の画面には一切出ない。 */
    /* 2026-08-28 前倒し: 更新 3 の k10 が分数の解き方 1 本だけで、10 歳コースの子は
       ボルネオ I の 84 種を 1 カテゴリで消費してしまう (図鑑がこはく購入でだけ埋まる
       状態になる)。予備在庫の本カテゴリをゲート待ちの 2 本 (kisokusei / hayasa) より
       先に出して、巻あたり k10 2 本の下限を満たす。 */
    kom_ratio_forms:{course:"k10",name:"割合の表現変換",maxLv:10,release:3},
    kom_johou_seiri:{course:"k10",name:"情報整理",maxLv:10,release:4},
    /* 図化だけ release 9 から 2 へ前倒し (2026-08-17 決定)。受験 ROI が 3 本の中で
       最も高く、線分図・面積図・表は割合と速さの土台になるため、更新 2 の k10 枠を
       単位換算と 2 本立てにする。engine + generator は index.html で読込み済み。 */
    kom_diagram_model:{course:"k10",name:"数量関係の図化",maxLv:10,release:2},
    kom_kuku_bridge:{course:"k5",name:"九九の外へ",maxLv:10,release:5},
    kom_equation_select:{course:"k5",name:"文章題の式えらび",maxLv:10,release:4},
    /* 段暗唱は指導順 (2, 5, 3, 4, 6, 7, 8, 9) に 1 更新 2 本ずつ解禁する
       (release_linkage 2 章の倍速カレンダー)。エンジンは段番号駆動なので
       実装はこの行だけ。同 release 内の指導順は宣言順で保たれる。 */
    kom_kuku_dan5:{course:"k5",name:"5の段暗唱",maxLv:10,release:1},
    kom_kuku_dan3:{course:"k5",name:"3の段暗唱",maxLv:10,release:2},
    kom_kuku_dan4:{course:"k5",name:"4の段暗唱",maxLv:10,release:2},
    kom_kuku_dan6:{course:"k5",name:"6の段暗唱",maxLv:10,release:3},
    kom_kuku_dan7:{course:"k5",name:"7の段暗唱",maxLv:10,release:3},
    kom_kuku_dan8:{course:"k5",name:"8の段暗唱",maxLv:10,release:4},
    kom_kuku_dan9:{course:"k5",name:"9の段暗唱",maxLv:10,release:5}
  };

  function isReleased(cat){
    var entry=CATEGORIES[cat];
    return !!entry&&entry.release<=currentRelease();
  }

  /* 段暗唱は 1 段 = 1 カテゴリ。cat 名が段番号を持つので、dan3 以降は
     CATEGORIES に 1 行足すだけで動く。 */
  function danOfCategory(cat){
    var match=/^kom_kuku_dan(\d)$/.exec(cat);
    return match?Number(match[1]):0;
  }
  function isDanCat(cat){return danOfCategory(cat)>0;}
  var COLLECTION_CONFIG={
    gaugeNeed:global.Q4BReward?global.Q4BReward.NEED_DEFAULT:8,
    pityChances:[0,0.25,0.5,0.75,1],
    flagshipWeight:0.25
    /* 採集道具が動かすのは「どの虫か」と「新顔か」の 2 つだけ (tools_design 8 章)。
       8 問 1 匹のレートとレアリティ表 (pickTier) には触れない。効きの強さの定数は
       shared/tools.js (GUILD_WEIGHT / FRESH_BOOST) の 1 か所が持ち、ここには
       重複定義しない (本編の抽選器と数字がずれるのを構造的に防ぐ)。 */
  };
  var RARITIES=["N","R","SR","SSR"];
  /* ゲージに数える回答の形式。ここに無い形式は例外になる (黙って加算されないより、
     登録漏れが即わかるほうがよい)。れんぞく九九はだんラン 1 本で 1 正答。 */
  var FORMAT_KINDS={
    normal:{num:true,frac:true,choice:true,num_unit:true},
    formulation:{choice:true},
    ordering:{order:true},
    diagnosis:{choice:true},
    find_all:{choice:true,find_all:true},
    voice:{voice:true},
    dan_run:{run:true},
    scroll_fill:{choice:true},
    missing_find:{choice:true},
    error_find:{choice:true},
    flash:{choice:true}
  };
  var RATIO_SET_SIZE=5;
  var RATIO_FORM_MIX={
    1:{normal:5,formulation:0,ordering:0,diagnosis:0},
    2:{normal:3,formulation:2,ordering:0,diagnosis:0},
    3:{normal:2,formulation:3,ordering:0,diagnosis:0},
    4:{normal:1,formulation:2,ordering:0,diagnosis:2},
    5:{normal:2,formulation:1,ordering:2,diagnosis:0},
    6:{normal:1,formulation:0,ordering:2,diagnosis:2},
    7:{normal:2,formulation:0,ordering:0,diagnosis:3},
    8:{normal:2,formulation:1,ordering:2,diagnosis:0},
    9:{normal:1,formulation:1,ordering:0,diagnosis:3},
    10:{normal:1,formulation:1,ordering:1,diagnosis:2}
  };
  var RATIO_STATIC_LEVELS={ordering:[5,6,8],diagnosis:[4,6,7,9]};
  var RATIO_PATTERN_BY_LEVEL={4:"find_base",5:"discount",6:"two_step",7:"ratio_share",8:"soutou",9:"baibai"};
  var profile=null, profileId=null, profileRevision=0, profileType="k10", worldMap=null, ratioPool=null, session=null;
  var KOMOREBI_ANSWER_TIMER=global.Q4BReward&&global.Q4BReward.answerTimer?global.Q4BReward.answerTimer():null;
  var zukanModalRerender=null;
  /* 捧げ待ちメダルの回収は 1 回の読み込みにつき 1 度だけ (renderMap を参照)。 */
  var pendingMedalsSwept=false;
  /* ?demo で見え方だけを差し替える確認用モード。保存には一切触れない
     (Phase 3 のピン状態と一覧の見比べ用。実データが入ったら不要)。 */
  var demoProgress={volume_fixture:3,volume_fixture_australia:11,volume_fixture_borneo:5,volume_fixture_costa_rica:1};
  var demoMode=false;

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}

  function validateCatches(catches,full){
    if(!isObject(catches))throw new Error("捕獲データの形式が正しくありません");
    Object.keys(catches).forEach(function(id){
      var entry=catches[id];
      if(!id||!isObject(entry)||!Number.isInteger(entry.n)||entry.n<1)throw new Error("捕獲データの形式が正しくありません");
      if(full&&(!Number.isFinite(entry.max)||!Number.isFinite(entry.min)||entry.min>entry.max||!Array.isArray(entry.records)||entry.records.length!==entry.n))throw new Error("捕獲データの形式が正しくありません");
    });
  }

  function validateCollection(collection){
    if(!isObject(collection))throw new Error("採集データの形式が正しくありません");
    if(!Number.isInteger(collection.gauge)||collection.gauge<0||collection.gauge>=COLLECTION_CONFIG.gaugeNeed)throw new Error("ゲージデータの形式が正しくありません");
    if(!Number.isInteger(collection.totalCatches)||collection.totalCatches<0)throw new Error("採集データの形式が正しくありません");
    validateCatches(collection.catches,true);
    if(collection.pityDuplicates!=null&&(!Number.isInteger(collection.pityDuplicates)||collection.pityDuplicates<0||collection.pityDuplicates>=COLLECTION_CONFIG.pityChances.length))throw new Error("救済データの形式が正しくありません");
    if(collection.submissionSessionId!=null&&(typeof collection.submissionSessionId!=="string"||!collection.submissionSessionId))throw new Error("回答データの形式が正しくありません");
    if(collection.processedSubmissionIds!=null){
      if(!Array.isArray(collection.processedSubmissionIds)||collection.submissionSessionId==null)throw new Error("回答データの形式が正しくありません");
      var submissionIds=Object.create(null);
      collection.processedSubmissionIds.forEach(function(id){
        if(typeof id!=="string"||!id||hasOwn(submissionIds,id))throw new Error("回答データの形式が正しくありません");
        submissionIds[id]=true;
      });
    }else if(collection.submissionSessionId!=null)throw new Error("回答データの形式が正しくありません");
  }

  function validateVolume(volume){
    if(!isObject(volume)||typeof volume.id!=="string"||!volume.id||typeof volume.regionId!=="string"||!volume.regionId||typeof volume.regionName!=="string"||!volume.regionName)throw new Error("遠征データの形式が正しくありません");
    if(volume.frozen!==true||!Number.isInteger(volume.denominator)||volume.denominator<1||!Array.isArray(volume.species)||volume.denominator!==volume.species.length)throw new Error("遠征の分母が正しくありません");
    var ids=Object.create(null),flagships=0;
    volume.species.forEach(function(species){
      if(!isObject(species)||typeof species.id!=="string"||!species.id||RARITIES.indexOf(species.rarity)<0||typeof species.flagship!=="boolean")throw new Error("遠征の種データが正しくありません");
      if(hasOwn(ids,species.id))throw new Error("遠征の種IDが重複しています");
      ids[species.id]=true;
      if(species.flagship){
        /* 看板 = ウルトラレア。遠征の目玉こそ最レアという直感に合わせる (2026-08-14 決定)。 */
        if(species.rarity!=="SSR")throw new Error("看板のレア度が正しくありません");
        flagships++;
      }
    });
    if(flagships!==1)throw new Error("看板は遠征ごとに1種必要です");
    return volume;
  }

  function validateAnswer(answer){
    if(!isObject(answer)||typeof answer.sessionId!=="string"||!answer.sessionId||typeof answer.submissionId!=="string"||!answer.submissionId||!hasOwn(FORMAT_KINDS,answer.format)||!hasOwn(FORMAT_KINDS[answer.format],answer.kind)||typeof answer.correct!=="boolean"||typeof answer.final!=="boolean")throw new Error("回答データの形式が正しくありません");
    ["hintShown","recognitionFailure","answerOnly","debug","retry"].forEach(function(key){
      if(answer[key]!=null&&typeof answer[key]!=="boolean")throw new Error("回答データの形式が正しくありません");
    });
    return answer;
  }

  function qualifiesForGauge(answer){
    validateAnswer(answer);
    return answer.correct&&answer.final&&!answer.hintShown&&!answer.recognitionFailure&&!answer.answerOnly&&!answer.debug;
  }

  function qualifiesForAnswerLog(answer){
    validateAnswer(answer);
    return answer.final&&!answer.hintShown&&!answer.recognitionFailure&&!answer.answerOnly&&!answer.debug;
  }

  function randomValue(random){
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var value=random();
    if(!Number.isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }

  function rewardEngine(){
    if(!global.Q4BReward||typeof global.Q4BReward.selectTier!=="function"||typeof global.Q4BReward.record!=="function")throw new Error("採集機構を読み込めません");
    return global.Q4BReward;
  }

  function pickTier(tiers,random){
    var tier=rewardEngine().selectTier(1,tiers,function(){return randomValue(random);});
    return RARITIES[tier];
  }

  /* equippedTool は省略可。渡さない (未装備) ときの挙動は道具の実装前と 1 ビットも
     変わらない: 重みも乱数の消費本数も同じ。基本ループは道具なしで永久に無料
     (不変条件 5) という約束を、コードの形で守るための引数の置き方。 */
  function pickSpecies(species,random,equippedTool){
    var toolsLib=global.Q4B_TOOLS,reward=global.Q4BReward;
    var weights=species.map(function(item){
      var weight=item.flagship?COLLECTION_CONFIG.flagshipWeight:1;
      /* 対象 guild の重み (3 倍) は shared/tools.js の guildWeightFor が唯一の出所。
         排他にはしない (抽選の意外性を残す)。guild 判定は種データ (bugs.js) 側の
         フィールドで行う: volume の manifest は {id, rarity, flagship} しか持たない
         ので、カタログを引き直す。tools.js を読み込んでいない文脈では効かせない
         (未装備と同じに倒す)。 */
      if(equippedTool&&toolsLib)weight*=toolsLib.guildWeightFor(equippedTool,reward&&reward.spById?reward.spById(item.id):null);
      return weight;
    });
    var total=weights.reduce(function(sum,weight){return sum+weight;},0);
    var value=randomValue(random)*total;
    for(var i=0;i<species.length;i++){
      if(value<weights[i])return species[i];
      value-=weights[i];
    }
    return species[species.length-1];
  }

  function drawCapture(volume,catches,pityDuplicates,random,equippedTool){
    validateVolume(volume);
    validateCatches(catches,false);
    if(!Number.isInteger(pityDuplicates)||pityDuplicates<0||pityDuplicates>=COLLECTION_CONFIG.pityChances.length)throw new Error("救済データの形式が正しくありません");
    var tiers=RARITIES.filter(function(rarity){return volume.species.some(function(species){return species.rarity===rarity;});});
    var incompleteTiers=tiers.filter(function(rarity){return volume.species.some(function(species){return species.rarity===rarity&&!hasOwn(catches,species.id);});});
    var tier=pickTier(tiers,random),pityApplied=false;
    /* 未発見ブーストは pity と同じ層に足す。現行 drawCapture は同一 tier 内で未捕獲種を
       絶対優先するので、ダブりは「完成済み tier を引いた時」にしか起きない。だから
       効かせる場所は完成 tier から未完成 tier への振替確率で、レアリティ表ではない
       (tools_design 8 章)。 */
    var pityChance=COLLECTION_CONFIG.pityChances[pityDuplicates];
    /* +0.25 の実体は shared/tools.js の FRESH_BOOST (小道の drawCapture だけが使う)。
       tools.js を読み込んでいない文脈では未装備と同じに倒す。 */
    if(equippedTool&&global.Q4B_TOOLS)pityChance=Math.min(1,pityChance+global.Q4B_TOOLS.FRESH_BOOST);
    if(incompleteTiers.indexOf(tier)<0&&incompleteTiers.length&&pityChance>0&&randomValue(random)<pityChance){
      tier=pickTier(incompleteTiers,random);
      pityApplied=true;
    }
    var candidates=volume.species.filter(function(species){return species.rarity===tier;});
    var fresh=candidates.filter(function(species){return !hasOwn(catches,species.id);});
    if(fresh.length)candidates=fresh;
    var species=pickSpecies(candidates,random,equippedTool);
    var isNew=!hasOwn(catches,species.id);
    return {
      species:species,
      isNew:isNew,
      pityApplied:pityApplied,
      pityDuplicates:isNew||!incompleteTiers.length?0:Math.min(pityDuplicates+1,COLLECTION_CONFIG.pityChances.length-1)
    };
  }

  function recordCapture(collection,draw,random){
    var id=draw.species.id;
    var rewardCollection={catches:collection.catches,total:collection.totalCatches};
    var recorded=rewardEngine().record(rewardCollection,draw.species,{source:"wild",random:random,game:"komorebi",mode:"volume"});
    collection.catches=rewardCollection.catches;
    collection.totalCatches=rewardCollection.total;
    if(draw.pityDuplicates)collection.pityDuplicates=draw.pityDuplicates;
    else delete collection.pityDuplicates;
    return {id:id,rarity:draw.species.rarity,flagship:draw.species.flagship,isNew:recorded.isNew,n:collection.catches[id].n,size:recorded.size,sex:recorded.sex,shiny:recorded.shiny,pityApplied:draw.pityApplied};
  }

  /* --- 採集道具の接続 --------------------------------------------------------
     道具の状態 (tools / equippedToolId / toolDex) は profile ではなく、こはくと
     同じ共有 kv (QuestSave の toolgear wallet) に住む。本編 3 教科と同じ 1 つの
     道具箱を読むためで、profile 直下の旧フィールドは移行の種としてだけ残る。
     捕獲の 2 経路 (ゲージ・こはく呼び出し) はどちらも drawCapture を通るので、
     効果の適用と耐久の消費もこの 2 か所だけに置く。tools.js や toolgear API を
     読み込んでいない文脈 (単体テスト・古い storage.js) では常に「未装備」に倒れる。

     Q4BReward.setToolsStore は小道では呼ばない: 小道の抽選器 (applyAnswer /
     amberCallCapture) が gear を直接読んで自分で耐久を減らすので、reward.js 側の
     wallet 配線まで生かすと 1 捕獲で 2 回減る (二重消費)。 */

  function toolsModule(){return medalEconomyOn()?(global.Q4B_TOOLS||null):null;}

  function gearStore(){
    var save=global.QuestSave;
    return save&&typeof save.toolGearOf==="function"&&typeof save.toolGearSet==="function"?save:null;
  }

  /* boot 前 (単体テストが applyAnswer を直接叩く文脈) は profileId が未設定なので、
     店と同じ currentProfile へ倒す。boot 後の profileId は currentProfile() と
     同じ値なので、実運用で読み先が割れることはない。 */
  function gearProfileId(){
    if(profileId)return profileId;
    var save=gearStore();
    return save&&typeof save.currentProfile==="function"?save.currentProfile():null;
  }

  /* 読みは毎回 deep clone 相当 (toolGearOf が正規化して組み直す)。返り値を書き
     換えても、storeToolGear を通すまで共有 kv は動かない。 */
  function loadToolGear(){
    var save=gearStore(),pid=gearProfileId();
    return save&&pid?save.toolGearOf(pid):null;
  }

  /* 耐久消費・装備切替・授与は、gear の変更が起きたその場でここを通して永続する。
     profile の保存 (saveProfile) とは独立で、共有 kv なので本編と同じ即時永続の
     意味論になる (per-kv LWW)。 */
  function storeToolGear(gear){
    var save=gearStore(),pid=gearProfileId();
    if(!save||!pid||!gear)return false;
    return save.toolGearSet(pid,gear);
  }

  /* 判定そのものは economy_flag に置いてある (portal と共用)。ここでは tools.js を
     読み込んでいない文脈で「公開済み」と答えないよう、実物の有無だけ足す。 */
  function toolsReleased(){
    return !!toolsModule()&&economyFlags().toolsReleased();
  }

  function releasedTools(){
    var tools=toolsModule(),release=currentRelease();
    return tools?tools.list().filter(function(tool){return tool.release<=release;}):[];
  }

  /* その巻の捕獲プール (種データの配列)。volume の manifest は {id, rarity, flagship}
     しか持たないので、道具の guild 判定に要るフィールドはカタログから引き直す
     (pickSpecies の重み付けと同じ経路)。 */
  function volumeToolPool(volume){
    var reward=global.Q4BReward;
    if(!volume||!Array.isArray(volume.species)||!reward||typeof reward.spById!=="function")return null;
    return volume.species.map(function(species){return reward.spById(species.id);})
      .filter(function(sp){return !!sp;});
  }

  /* ゲートは 3 段。まず MEDAL_ECONOMY_ON でメダル経済ごと開いているか、次に
     道具 1 本ずつの release。公開済みの道具が 1 つでもあれば全部が効く、では
     更新をまたいだ先行実装が漏れる。gear は loadToolGear の返り値 (無ければ null)。

     3 段目は、その巻の対象 guild が下限 (tools.js の GUILD_MIN_SHARE) に届かないとき。抽選の重みが全種 1 倍のまま
     耐久だけが減って壊れるのを防ぐ。装備そのもの (toolgear kv) は書き換えない:
     kv は全ゲーム共通の 1 個で、ここで外すと本編の装備まで消える。pool 省略時は
     この段を掛けない (プールが分からないことを理由に道具を取り上げない)。 */
  function equippedToolOf(gear,pool){
    var tools=toolsModule();
    if(!tools||!gear)return null;
    var tool=tools.equippedTool(gear);
    if(!tool||tool.release>currentRelease())return null;
    if(Array.isArray(pool)&&typeof tools.worksIn==="function"&&!tools.worksIn(tool.id,pool))return null;
    return tool;
  }

  /* 捕獲 1 回につき 1。未装備なら null (何も減らない)。減ったぶんはその場で
     共有 kv へ永続し、profile の保存失敗でも巻き戻さない (本編と同じ意味論)。
     pool は equippedToolOf と同じものを渡す: 効かない巻では減らさない。 */
  function consumeToolDurability(gear,pool){
    var tools=toolsModule();
    if(!tools||!equippedToolOf(gear,pool))return null;
    var used=tools.consume(gear);
    if(used)storeToolGear(gear);
    return used;
  }

  /* 画面に出す道具の名前。5 歳コースには かなの名前が返る (tools.js の yomi)。
     道具の名前は実在の採集法の名前なので漢字が残り、小道のふりがなは辞書引きなので、
     そのまま出すと読めないか、部分一致で誤った読みが付く。名前を出す 6 か所すべてを
     この 1 本に通す。 */
  function toolName(tool){
    var tools=global.Q4B_TOOLS;
    if(!tool)return "";
    return tools&&typeof tools.displayName==="function"?tools.displayName(tool,profileType):(tool.name||"");
  }

  /* 旧 cloneTools / restoreTools (保存失敗時の道具の巻き戻し) は削除した。道具の
     耐久は共有 kv に住み、消費の瞬間に永続済みなので、profile の保存失敗で失われる
     のは高々耐久 1 ポイント。これは本編 (shared/reward.js の walletStore) と同じ
     許容で、ここで kv まで巻き戻すと、並行して進んだ別ページの消費を上書きして
     道具が復活する危険のほうが大きい。 */

  function cloneCollection(collection){return JSON.parse(JSON.stringify(collection));}
  function replaceCollection(target,source){
    Object.keys(target).forEach(function(key){delete target[key];});
    Object.keys(source).forEach(function(key){target[key]=source[key];});
  }

  function applyAnswer(targetProfile,cat,answer,volume,random){
    if(!isObject(targetProfile)||!hasOwn(CATEGORIES,cat))throw new Error("カテゴリが正しくありません");
    validateCollection(targetProfile.collection);
    validateAnswer(answer);
    validateVolume(volume);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var next=cloneCollection(targetProfile.collection),capture=null,toolUse=null;
    if(next.submissionSessionId!==answer.sessionId){
      next.submissionSessionId=answer.sessionId;
      next.processedSubmissionIds=[];
    }
    if(next.processedSubmissionIds.indexOf(answer.submissionId)>=0)return {counted:false,duplicate:true,gauge:next.gauge,capture:null};
    next.processedSubmissionIds.push(answer.submissionId);
    var counted=qualifiesForGauge(answer);
    if(counted){
      next.gauge++;
      if(next.gauge>=COLLECTION_CONFIG.gaugeNeed){
        next.gauge-=COLLECTION_CONFIG.gaugeNeed;
        /* 道具は targetProfile ではなく共有 kv から読む。消費は consumeToolDurability
           の中でその場で永続する (profile の保存とは独立)。 */
        var gear=loadToolGear(),pool=volumeToolPool(volume);
        capture=recordCapture(next,drawCapture(volume,next.catches,next.pityDuplicates||0,random,equippedToolOf(gear,pool)),random);
        toolUse=consumeToolDurability(gear,pool);
      }
    }
    replaceCollection(targetProfile.collection,next);
    return {counted:counted,duplicate:false,gauge:next.gauge,capture:capture,tool:toolUse};
  }

  function volumeProgress(volume,collection){
    validateVolume(volume);
    validateCollection(collection);
    var caught=volume.species.reduce(function(count,species){return count+(hasOwn(collection.catches,species.id)?1:0);},0);
    return {regionId:volume.regionId,volumeId:volume.id,caught:caught,denominator:volume.denominator,complete:caught===volume.denominator};
  }

  function viewCollection(){
    if(!demoMode)return profile.collection;
    var catches={};
    expeditionVolumes().forEach(function(volume){
      volume.species.slice(0,demoProgress[volume.id]||0).forEach(function(species){catches[species.id]={n:1,min:20,max:20,records:[{size:20,sex:"m",shiny:false}]};});
    });
    return {gauge:profile.collection.gauge,totalCatches:0,catches:catches};
  }

  function mapPinState(volume,collection,currentVolumeId){
    if(!volume)return null;
    if(volume.placeholder)return {kind:"placeholder",mark:"…",caught:0,denominator:0,ringValue:0};
    var progress=volumeProgress(volume,collection),ringValue=progress.caught/progress.denominator;
    if(progress.complete)return {kind:"completed",mark:"✓",caught:progress.caught,denominator:progress.denominator,ringValue:1};
    if(volume.id===currentVolumeId)return {kind:"current",mark:"★",caught:progress.caught,denominator:progress.denominator,ringValue:ringValue};
    return {kind:"past",mark:"🦋",caught:progress.caught,denominator:progress.denominator,ringValue:ringValue};
  }

  function formatCourseText(text,type,formatter){
    if(typeof text!=="string")throw new Error("表示データの形式が正しくありません");
    if(type!=="k5")return text;
    if(typeof formatter!=="function")throw new Error("ふりがなを読み込めません");
    return formatter(text);
  }

  /* 仮称には「（仮称）」を添える。小道の種は標準和名を持たないものが大半で、
     こちらで組み立てた名前をそのまま出すと実在の名前として覚えられてしまう。 */
  function speciesName(sp){
    return global.Q4B_SPECIES_DISPLAY_NAME?global.Q4B_SPECIES_DISPLAY_NAME(sp):(sp&&sp.jaName)||"";
  }

  function escapeHtml(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function displayText(text){return formatCourseText(escapeHtml(text),profileType,global.furi5);}
  /* 属性値にはふりがなを通さない。ruby の markup がそのまま読み上げられ、
     placeholder ではタグが文字として表示されてしまう。 */
  function attrText(text){return escapeHtml(text);}

  function validateRatioHistory(history){
    if(!isObject(history)||!Array.isArray(history.itemIds)||!Array.isArray(history.patternIds))throw new Error("割合の履歴データの形式が正しくありません");
    [history.itemIds,history.patternIds].forEach(function(values){
      if(values.some(function(value){return typeof value!=="string"||!value;}))throw new Error("割合の履歴データの形式が正しくありません");
    });
    return history;
  }

  function validateRatioPoolItem(item,ids){
    if(!isObject(item)||typeof item.id!=="string"||!item.id||hasOwn(ids,item.id)||!Number.isInteger(item.lv)||item.lv<1||item.lv>10||typeof item.text!=="string"||!item.text||typeof item.explanation!=="string"||!item.explanation)throw new Error("割合問題データの形式が正しくありません");
    ids[item.id]=true;
    if(item.kind==="order"){
      if(!Array.isArray(item.parts)||item.parts.length<3||item.parts.length>4||item.parts.some(function(part){return typeof part!=="string"||!part;})||!Array.isArray(item.ans)||item.ans.length!==item.parts.length)throw new Error("整列問題データの形式が正しくありません");
      var sorted=item.ans.slice().sort(function(a,b){return a-b;});
      if(sorted.some(function(value,index){return value!==index;}))throw new Error("整列問題の答えが正しくありません");
    }else if(item.kind==="choice"){
      if(!Array.isArray(item.work)||!item.work.length||item.work.some(function(line){return typeof line!=="string"||!line;})||!Array.isArray(item.choices)||item.choices.length!==4||item.choices.some(function(choice){return typeof choice!=="string"||!choice;})||!Number.isInteger(item.ans)||item.ans<0||item.ans>=4)throw new Error("診断問題データの形式が正しくありません");
    }else throw new Error("割合問題の種類が正しくありません");
  }

  function validateRatioPool(pool){
    if(!Array.isArray(pool)||!pool.length)throw new Error("割合問題を読み込めません");
    var ids=Object.create(null);
    pool.forEach(function(item){validateRatioPoolItem(item,ids);});
    return pool;
  }

  function ratioGenerator(){
    var generator=global.Q4B_KOMOREBI_RATIO_GENERATOR;
    if(!generator||typeof generator.generateForLv!=="function"||typeof generator.generatePair!=="function")throw new Error("割合問題の生成器を読み込めません");
    return generator;
  }

  function shuffled(values,random){
    var result=values.slice();
    for(var i=result.length-1;i>0;i--){
      var j=Math.floor(randomValue(random)*(i+1)),tmp=result[i];
      result[i]=result[j];result[j]=tmp;
    }
    return result;
  }

  function staticCandidates(pool,format,lv){
    var kind=format==="ordering"?"order":"choice";
    var levels=lv===10?RATIO_STATIC_LEVELS[format]:[lv];
    return pool.filter(function(item){return item.kind===kind&&levels.indexOf(item.lv)>=0;});
  }

  function pickStaticQuestion(pool,format,lv,recentIds,usedIds,random){
    var candidates=staticCandidates(pool,format,lv).filter(function(item){return usedIds.indexOf(item.id)<0;});
    if(!candidates.length)return null;
    var fresh=candidates.filter(function(item){return recentIds.indexOf(item.id)<0;});
    var source=(fresh.length?fresh:candidates)[Math.floor(randomValue(random)*(fresh.length?fresh.length:candidates.length))];
    var question=JSON.parse(JSON.stringify(source));
    question.sourceLv=source.lv;
    question.lv=lv;
    question.format=format;
    question.waza={primary:source.explanation,alternate:source.alternate||""};
    if(question.kind==="order")question.displayOrder=shuffled(question.ans,random);
    usedIds.push(question.id);
    return question;
  }

  function freshGenerated(lv,format,blocked,random){
    var fallback=null,question=null;
    for(var attempt=0;attempt<60;attempt++){
      question=ratioGenerator().generateForLv(lv,format,random);
      if(!fallback)fallback=question;
      if(blocked.indexOf(question.patternId)<0)return question;
    }
    return fallback;
  }

  function freshGeneratedNormal(pattern,lv,blocked,random){
    var fallback=null,question=null;
    for(var attempt=0;attempt<60;attempt++){
      question=ratioGenerator().generate(pattern,lv,"normal",random);
      if(!fallback)fallback=question;
      if(blocked.indexOf(question.patternId)<0)return question;
    }
    return fallback;
  }

  function freshGeneratedPair(lv,blocked,random){
    var patterns=ratioGenerator().patternsForLv(lv,"formulation"),fallback=null,pair=null;
    for(var attempt=0;attempt<60;attempt++){
      var pattern=patterns[Math.floor(randomValue(random)*patterns.length)];
      pair=ratioGenerator().generatePair(pattern,lv,random);
      if(!fallback)fallback=pair;
      if(blocked.indexOf(pair.normal.patternId)<0)return pair;
    }
    return fallback;
  }

  function markRatioChain(recognition,normal,number){
    var chainId="ratio_chain_"+number;
    recognition.chainId=chainId;
    recognition.chainRole="recognition";
    recognition.chainPatternId=normal.patternId;
    normal.chainId=chainId;
    normal.chainRole="normal";
    return [recognition,normal];
  }

  function appendGeneratedUnit(units,question,usedPatterns){
    usedPatterns.push(question.patternId);
    units.push([question]);
  }

  function buildRatioUnits(pool,lv,mix,recent,random){
    var units=[],usedIds=[],usedPatterns=recent.patternIds.slice(),orders=[],diagnoses=[],i,question;
    for(i=0;i<mix.ordering;i++){
      question=pickStaticQuestion(pool,"ordering",lv,recent.itemIds,usedIds,random);
      if(question)orders.push(question);else mix.normal++;
    }
    for(i=0;i<mix.diagnosis;i++){
      question=pickStaticQuestion(pool,"diagnosis",lv,recent.itemIds,usedIds,random);
      if(question)diagnoses.push(question);else mix.normal++;
    }
    var normalLeft=mix.normal,chainNumber=0;
    while(diagnoses.length&&normalLeft){
      var diagnosis=diagnoses.shift(),pattern=RATIO_PATTERN_BY_LEVEL[diagnosis.sourceLv];
      var child=freshGeneratedNormal(pattern,lv,usedPatterns,random);
      usedPatterns.push(child.patternId);units.push(markRatioChain(diagnosis,child,++chainNumber));normalLeft--;
    }
    diagnoses.forEach(function(item){units.push([item]);});
    return {units:units,orders:orders,normalLeft:normalLeft,formulationCount:mix.formulation,usedPatterns:usedPatterns,chainNumber:chainNumber};
  }

  function finishRatioUnits(state,lv,random){
    while(state.formulationCount&&state.normalLeft){
      var pair=freshGeneratedPair(lv,state.usedPatterns,random);
      state.usedPatterns.push(pair.normal.patternId);
      state.units.push(markRatioChain(pair.formulation,pair.normal,++state.chainNumber));
      state.formulationCount--;state.normalLeft--;
    }
    while(state.formulationCount){
      appendGeneratedUnit(state.units,freshGenerated(lv,"formulation",state.usedPatterns,random),state.usedPatterns);
      state.formulationCount--;
    }
    state.orders.forEach(function(item){state.units.push([item]);});
    while(state.normalLeft){
      appendGeneratedUnit(state.units,freshGenerated(lv,"normal",state.usedPatterns,random),state.usedPatterns);
      state.normalLeft--;
    }
    return state.units;
  }

  function buildRatioSet(pool,lv,history,random){
    validateRatioPool(pool);
    if(!Number.isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var recent=history==null?{itemIds:[],patternIds:[]}:validateRatioHistory(history);
    var mix=Object.assign({},RATIO_FORM_MIX[lv]);
    var units=finishRatioUnits(buildRatioUnits(pool,lv,mix,recent,random),lv,random);
    var questions=[];
    shuffled(units,random).forEach(function(unit){questions=questions.concat(unit);});
    if(questions.length!==RATIO_SET_SIZE)throw new Error("5問セットを作れません");
    return questions;
  }

  function updateRatioHistory(history,questions){
    var next={itemIds:history.itemIds.slice(),patternIds:history.patternIds.slice()};
    questions.forEach(function(question){
      if(question.id)next.itemIds.push(question.id);
      if(question.patternId)next.patternIds.push(question.patternId);
    });
    next.itemIds=next.itemIds.slice(-12);
    next.patternIds=next.patternIds.slice(-12);
    return next;
  }

  function expectedChoiceIndex(question){
    if(Number.isInteger(question.ans))return question.ans;
    return Array.isArray(question.choices)?question.choices.indexOf(question.ans):-1;
  }

  function judgeStandardAnswer(question,answer){
    if(!isObject(question)||!hasOwn(FORMAT_KINDS,question.format)||!hasOwn(FORMAT_KINDS[question.format],question.kind))throw new Error("割合問題の形式が正しくありません");
    if(question.kind==="order"){
      if(!Array.isArray(answer)||!Array.isArray(question.ans)||answer.length!==question.ans.length)return false;
      return question.ans.every(function(value,index){return answer[index]===value;});
    }
    if(question.kind==="choice")return Number.isInteger(answer)&&answer===expectedChoiceIndex(question);
    var numeric=typeof answer==="number"?answer:Number(String(answer).trim());
    return Number.isFinite(numeric)&&Number.isFinite(question.ans)&&Math.abs(numeric-question.ans)<1e-9;
  }

  function mapViewBox(map){
    var values=typeof map.viewBox==="string"?map.viewBox.trim().split(/\s+/).map(Number):[];
    if(values.length!==4||values.some(function(value){return !Number.isFinite(value);})||values[2]<=0||values[3]<=0)throw new Error("地図の表示範囲が正しくありません");
    return values;
  }

  function validMapPath(path){return typeof path==="string"&&path.length>0&&/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/.test(path);}

  function validateMapPayload(map,volumes){
    if(!isObject(map)||!validMapPath(map.land)||!isObject(map.regions)||!isObject(map.pins))throw new Error("地図データの形式が正しくありません");
    mapViewBox(map);
    Object.keys(map.regions).forEach(function(regionId){
      var pin=map.pins[regionId];
      if(!regionId||!validMapPath(map.regions[regionId])||!isObject(pin)||!Number.isFinite(pin.x)||!Number.isFinite(pin.y))throw new Error("地域データの形式が正しくありません");
    });
    (volumes||[]).forEach(function(volume){
      if(!hasOwn(map.regions,volume.regionId)||!hasOwn(map.pins,volume.regionId))throw new Error("遠征地域が地図にありません");
    });
    return map;
  }

  function expeditionVolumes(){
    var volumes=Object.keys(global.Q4B_KOMOREBI_VOLUMES||{}).map(function(id){return global.Q4B_KOMOREBI_VOLUMES[id];});
    if(!volumes.length)throw new Error("遠征データを読み込めません");
    volumes.forEach(function(volume){
      validateVolume(volume);
      if(typeof volume.current!=="boolean"||(volume.placeholder!=null&&typeof volume.placeholder!=="boolean")||!Array.isArray(volume.categories)||!volume.categories.length||volume.categories.some(function(cat){return !hasOwn(CATEGORIES,cat);})||typeof volume.blurb!=="string"||!volume.blurb)throw new Error("遠征の表示データが正しくありません");
    });
    if(volumes.filter(function(volume){return volume.current;}).length!==1)throw new Error("現在の遠征が正しくありません");
    return volumes;
  }

  function currentVolumeId(volumes){return volumes.filter(function(volume){return volume.current;})[0].id;}

  function volumeById(id){
    var volume=(global.Q4B_KOMOREBI_VOLUMES||{})[id];
    if(!volume)throw new Error("遠征を見つけられません");
    return volume;
  }

  /* --- 地域と遠征 ------------------------------------------------------------
     地域 (region) は表示の単位、遠征 (volume) は抽選と分母の単位。ピンと図鑑は
     地域に 1 つ、カテゴリと捕獲プールは遠征に属する (volume_zukan_design 2 章)。 */

  var ROMAN=["","Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ","Ⅶ","Ⅷ","Ⅸ","Ⅹ"];
  function romanNumeral(n){return ROMAN[n]||String(n);}
  function volumeExpedition(volume){return Number.isInteger(volume.expedition)&&volume.expedition>=1?volume.expedition:1;}

  /* volume にも release 番号を持たせ、未来の巻を manifest に仕込んでおける。
     カテゴリと同じく CURRENT_RELEASE 1 か所で公開が決まり、デプロイは番号を
     上げるだけになる (事前準備方式)。release 無しの volume は公開済み扱い。 */
  function isVolumeReleased(volume){
    return !Number.isInteger(volume.release)||volume.release<=currentRelease();
  }

  function regionList(){
    var byRegion={},order=[];
    expeditionVolumes().filter(isVolumeReleased).forEach(function(volume){
      if(!byRegion[volume.regionId]){
        byRegion[volume.regionId]={regionId:volume.regionId,regionName:volume.regionName,volumes:[]};
        order.push(volume.regionId);
      }
      byRegion[volume.regionId].volumes.push(volume);
    });
    return order.map(function(regionId){
      var region=byRegion[regionId];
      region.volumes.sort(function(a,b){return volumeExpedition(a)-volumeExpedition(b);});
      /* 地域の紹介文は最初の遠征のものを使う。巻ごとに変えると地域の顔がぶれる。 */
      region.blurb=region.volumes[0].blurb;
      region.current=region.volumes.some(function(volume){return volume.current;});
      region.placeholder=region.volumes.every(function(volume){return volume.placeholder===true;});
      return region;
    });
  }

  function regionById(regionId){
    var region=regionList().filter(function(r){return r.regionId===regionId;})[0];
    if(!region)throw new Error("地域を見つけられません");
    return region;
  }

  function regionPinState(region,collection){
    var caught=0,denominator=0,complete=true;
    if(region.placeholder)return {kind:"placeholder",mark:"…",caught:0,denominator:0,ringValue:0};
    region.volumes.filter(function(volume){return volume.placeholder!==true;}).forEach(function(volume){
      var progress=volumeProgress(volume,collection);
      caught+=progress.caught;denominator+=progress.denominator;
      if(!progress.complete)complete=false;
    });
    if(complete)return {kind:"completed",mark:"✓",caught:caught,denominator:denominator,ringValue:1};
    if(region.current)return {kind:"current",mark:"★",caught:caught,denominator:denominator,ringValue:denominator?caught/denominator:0};
    return {kind:"past",mark:"🦋",caught:caught,denominator:denominator,ringValue:denominator?caught/denominator:0};
  }

  function createProfile(){
    var lv={},maxLv={};
    Object.keys(CATEGORIES).forEach(function(cat){lv[cat]=1;maxLv[cat]=1;});
    /* uroLog / lv10ClearAt / lapCount / mintedLaps はメダル経済の追加分
       (tools_design 11 章)。既存キーは 1 つも動かさない additive の追記。
       tools / toolDex / equippedToolId は共有 kv (toolgear) へ昇格済みの旧置き場で、
       新しい save では空のまま動かない。古いクライアントとの共存と、旧 save からの
       一方向移行 (toolGearMigrateFromProfile) の種としてだけ残す。 */
    return {schemaVersion:1,unlocked:true,discoverySeen:false,lv:lv,maxLv:maxLv,stats:{},recent:{},adapt:{},anslog:{},daily:{},ratioHistory:{itemIds:[],patternIds:[]},collection:{gauge:0,totalCatches:0,catches:{}},trophies:{},trophyProgress:{},srs:{},lv10ClearAt:{},lapCount:{},mintedLaps:{},tools:[],toolDex:{},uroLog:[],equippedToolId:null};
  }

  function normalizeProfile(data){
    if(data==null)return {profile:createProfile(),changed:true};
    if(typeof data!=="object"||Array.isArray(data))throw new Error("保存データの形式が正しくありません");
    var p=data,changed=false;
    if(p.schemaVersion==null){p.schemaVersion=1;changed=true;}
    else if(p.schemaVersion!==1)throw new Error("保存データの版に対応していません");
    if(p.unlocked==null){p.unlocked=true;changed=true;}
    else if(typeof p.unlocked!=="boolean")throw new Error("解禁データの形式が正しくありません");
    if(p.discoverySeen==null){p.discoverySeen=false;changed=true;}
    else if(typeof p.discoverySeen!=="boolean")throw new Error("発見データの形式が正しくありません");
    ["lv","maxLv","stats","recent","adapt","anslog","trophies","trophyProgress","srs","lv10ClearAt","lapCount","mintedLaps"].forEach(function(key){
      if(p[key]==null){p[key]={};changed=true;}
      else if(typeof p[key]!=="object"||Array.isArray(p[key]))throw new Error("保存データの形式が正しくありません");
    });
    /* daily: 日ごとの解答数 (ホームの学習グラフ / れんぞく日数 / つうさん問題数 の元)。
       anslog は 180 日で切り捨てられるので生涯ぶんを保てない。教科側の keisan p.daily と
       同じ {n,ok} 形にして、ポータルが 3 教科と同じ関数で読めるようにする。既存 save は
       anslog を畳んで一度だけ種を入れる (小道は 2026-08-13 開設なので現時点で欠落なし)。 */
    if(p.daily==null){p.daily={};changed=true;}
    else if(typeof p.daily!=="object"||Array.isArray(p.daily))throw new Error("保存データの形式が正しくありません");
    if(!Object.keys(p.daily).length&&Object.keys(p.anslog).length){
      Object.keys(p.anslog).forEach(function(d){
        var cats=p.anslog[d],n=0,ok=0,cat;
        if(!cats||typeof cats!=="object")return;
        for(cat in cats){
          if(!Object.prototype.hasOwnProperty.call(cats,cat))continue;
          n+=(cats[cat]&&cats[cat].n)||0;
          ok+=(cats[cat]&&cats[cat].ok)||0;
        }
        if(n>0)p.daily[d]={n:n,ok:ok};
      });
      changed=true;
    }
    Object.keys(p.daily).forEach(function(d){
      var e=p.daily[d];
      if(!e||typeof e!=="object"||Array.isArray(e)||!Number.isInteger(e.n)||e.n<0||!Number.isInteger(e.ok)||e.ok<0||e.ok>e.n)throw new Error("保存データの形式が正しくありません");
    });
    Object.keys(CATEGORIES).forEach(function(cat){
      if(p.lv[cat]==null){p.lv[cat]=1;changed=true;}
      else if(!Number.isInteger(p.lv[cat])||p.lv[cat]<1||p.lv[cat]>CATEGORIES[cat].maxLv)throw new Error("レベルデータの形式が正しくありません");
      if(p.maxLv[cat]==null){p.maxLv[cat]=p.lv[cat];changed=true;}
      else if(!Number.isInteger(p.maxLv[cat])||p.maxLv[cat]<1||p.maxLv[cat]>CATEGORIES[cat].maxLv)throw new Error("レベルデータの形式が正しくありません");
      if(p.maxLv[cat]<p.lv[cat]){p.maxLv[cat]=p.lv[cat];changed=true;}
    });
    if(p.ratioHistory==null){p.ratioHistory={itemIds:[],patternIds:[]};changed=true;}
    else{
      validateRatioHistory(p.ratioHistory);
      if(p.ratioHistory.itemIds.length>12){p.ratioHistory.itemIds=p.ratioHistory.itemIds.slice(-12);changed=true;}
      if(p.ratioHistory.patternIds.length>12){p.ratioHistory.patternIds=p.ratioHistory.patternIds.slice(-12);changed=true;}
    }
    if(p.collection==null){p.collection={gauge:0,totalCatches:0,catches:{}};changed=true;}
    else if(typeof p.collection!=="object"||Array.isArray(p.collection))throw new Error("採集データの形式が正しくありません");
    if(p.collection.gauge==null){p.collection.gauge=0;changed=true;}
    else if(!Number.isInteger(p.collection.gauge)||p.collection.gauge<0)throw new Error("ゲージデータの形式が正しくありません");
    if(p.collection.totalCatches==null){p.collection.totalCatches=0;changed=true;}
    else if(!Number.isInteger(p.collection.totalCatches)||p.collection.totalCatches<0)throw new Error("採集データの形式が正しくありません");
    if(p.collection.catches==null){p.collection.catches={};changed=true;}
    else if(typeof p.collection.catches!=="object"||Array.isArray(p.collection.catches))throw new Error("採集データの形式が正しくありません");
    /* 統合が記録の連結だった頃の save は、競合のたびに捕獲履歴が倍化している。
       読み込みで同じ記録を 1 件に畳んで自己修復する。判定は統合と同じ
       dedupRecords なので、直した端末と古い端末が混在しても読むたびに元へ戻る。 */
    var catchesRepaired=false;
    Object.keys(p.collection.catches).forEach(function(id){
      var entry=p.collection.catches[id];
      if(!isObject(entry)||!Array.isArray(entry.records)||!entry.records.length)return;
      var records=dedupRecords(entry.records);
      if(records.length===entry.records.length)return;
      entry.records=records;
      entry.n=records.length;
      catchesRepaired=true;changed=true;
    });
    if(catchesRepaired){
      p.collection.totalCatches=Object.keys(p.collection.catches).reduce(function(total,id){
        var entry=p.collection.catches[id];
        return total+(isObject(entry)&&Number.isInteger(entry.n)?entry.n:0);
      },0);
    }
    validateCollection(p.collection);
    /* 壊れたトロフィーデータを黙って受けない。トロフィーは再授与しないので、
       形が崩れたまま通すと二度と直せない。 */
    if(global.Q4B_KOMOREBI_TROPHIES){
      global.Q4B_KOMOREBI_TROPHIES.validateTrophies(p.trophies);
      global.Q4B_KOMOREBI_TROPHIES.validateProgress(p.trophyProgress);
      /* 周回の 2 つの整数 (lapCount / mintedLaps)。壊れたまま通すと、ロックの起点も
         鋳造の回数も数えられなくなる。 */
      global.Q4B_KOMOREBI_TROPHIES.validateLaps(p);
    }
    /* Lv10 クリア時刻はリセット周回のロックの起点。値は ISO 文字列。 */
    Object.keys(p.lv10ClearAt).forEach(function(cat){
      if(typeof p.lv10ClearAt[cat]!=="string"||!p.lv10ClearAt[cat])throw new Error("クリア日データの形式が正しくありません");
    });
    /* 起点を記録する前に成立していたメダル (Phase 1 より前のセーブ) には起点が無く、
       そのままだとロックが永久に明けずリセット周回へ入れない。授与日で埋める。
       日付だけの文字列でも Date.parse は通るので、ロックの計算は同じに動く。 */
    if(global.Q4B_KOMOREBI_TROPHIES){
      global.Q4B_KOMOREBI_TROPHIES.list().forEach(function(trophy){
        var record=p.trophies[trophy.trophyId];
        if(!isObject(record)||p.lv10ClearAt[trophy.cat])return;
        if(typeof record.at!=="string"||!record.at)return;
        p.lv10ClearAt[trophy.cat]=record.at;
        changed=true;
      });
    }
    /* メダル経済の追加分。古いセーブには無いので既定値を補い、形が違うものは通さない
       (奉納の記録は不滅という約束を、壊れた配列のまま引き継がせない)。
       tools / toolDex / equippedToolId は共有 kv (toolgear) へ昇格済みだが、旧 save の
       受理・保全はこれまで通り行う: 読むのは移行 (toolGearMigrateFromProfile) だけで、
       app.js がここへ書き戻すことはもう無い。 */
    if(p.tools==null){p.tools=[];changed=true;}
    if(p.toolDex==null){p.toolDex={};changed=true;}
    if(p.uroLog==null){p.uroLog=[];changed=true;}
    if(!hasOwn(p,"equippedToolId")){p.equippedToolId=null;changed=true;}
    else if(p.equippedToolId!==null&&typeof p.equippedToolId!=="string")throw new Error("道具データの形式が正しくありません");
    if(global.Q4B_TOOLS){
      global.Q4B_TOOLS.validateTools(p.tools);
      global.Q4B_TOOLS.validateDex(p);
      /* 装備だけが残って本体が無い状態は形の誤りではなく取りこぼし。黙って外す。 */
      if(p.equippedToolId&&!global.Q4B_TOOLS.ownedOf(p,p.equippedToolId).length){p.equippedToolId=null;changed=true;}
    }else if(!Array.isArray(p.tools))throw new Error("道具データの形式が正しくありません");
    if(global.Q4B_KOMOREBI_URO)global.Q4B_KOMOREBI_URO.validateLog(p.uroLog);
    else if(!Array.isArray(p.uroLog))throw new Error("奉納データの形式が正しくありません");
    return {profile:p,changed:changed};
  }

  /* --- 保存の競合解決 --------------------------------------------------------
     二台で遊んで CAS が弾かれたときの突き合わせ。捕獲は append-only の union で、
     メダル経済の追加データも同じ扱いにする。local の丸ごとコピーで返すと、remote
     側の奉納・道具・メダルが黙って消え、「獲得の記録は不滅」(tools_design 2 章
     不変条件 4 と 6) が競合経路だけ守られない。
     方針は 1 つ: どちらの側の記録も減らさない。判断に迷う場面では多い側・進んだ側を
     採り、少しの取りすぎは許して取りこぼしを許さない。 */

  function objectOf(value){return isObject(value)?value:{};}

  /* 奉納ログの union。鍵は cat + 周回 + 日付 + 道具で、同じ鍵の行が何本あるかまで見る。
     2 周目以降は 1 度の鋳造で 2 枚出て、その 2 枚は同じ日に続けて捧げられるので、
     鍵が 1 つでは 2 行が 1 行に潰れてしまう。潰れると記録が消えるだけでなく、
     uro.pending が「まだ捧げていない」と数えて道具がもう 1 つ出てしまう。
     同じ鍵は本数の多い側を採る (両側が同じなら 1 度きり)。並びは日付順に寄せる。 */
  function mergeUroLogs(localLog,remoteLog){
    function group(list){
      var byKey=Object.create(null);
      (Array.isArray(list)?list:[]).forEach(function(entry){
        if(!isObject(entry))return;
        var key=entry.cat+"|"+entry.lap+"|"+entry.date+"|"+entry.tool;
        (byKey[key]||(byKey[key]=[])).push(entry);
      });
      return byKey;
    }
    var local=group(localLog),remote=group(remoteLog),seen=Object.create(null),merged=[];
    Object.keys(remote).concat(Object.keys(local)).forEach(function(key){
      if(seen[key])return;
      seen[key]=true;
      var mine=local[key]||[],theirs=remote[key]||[];
      merged=merged.concat(mine.length>=theirs.length?mine:theirs);
    });
    merged.sort(function(a,b){
      if(a.date!==b.date)return a.date<b.date?-1:1;
      if(a.cat!==b.cat)return a.cat<b.cat?-1:1;
      return (a.lap||0)-(b.lap||0);
    });
    return merged;
  }

  /* 凍結済みの旧クライアント互換。道具は種類ごとに、残りの多い順に並べて
     1 本ずつ突き合わせる。本数は多い側に、
     各 1 本の残耐久は大きい側に寄せる。丸ごと片側を採ると、授かったばかりの 1 本が
     「本数だけ多い、ほとんど壊れかけの写し」に負けて消える (メダルを払ったのに
     何も残らない)。コレクションを奪う操作は存在しない。 */
  function mergeToolBoxes(localTools,remoteTools){
    function group(list){
      var byType=Object.create(null);
      (Array.isArray(list)?list:[]).forEach(function(entry){
        if(!isObject(entry)||typeof entry.type!=="string")return;
        (byType[entry.type]||(byType[entry.type]=[])).push(entry);
      });
      Object.keys(byType).forEach(function(type){
        byType[type].sort(function(a,b){
          return (Number.isFinite(b.remaining)?b.remaining:0)-(Number.isFinite(a.remaining)?a.remaining:0);
        });
      });
      return byType;
    }
    var local=group(localTools),remote=group(remoteTools),seen=Object.create(null),merged=[];
    Object.keys(remote).concat(Object.keys(local)).forEach(function(type){
      if(seen[type])return;
      seen[type]=true;
      var mine=local[type]||[],theirs=remote[type]||[],count=Math.max(mine.length,theirs.length),i;
      for(i=0;i<count;i++){
        var a=mine[i],b=theirs[i];
        if(a&&b)merged.push((Number.isFinite(a.remaining)?a.remaining:0)>=(Number.isFinite(b.remaining)?b.remaining:0)?a:b);
        else merged.push(a||b);
      }
    });
    return merged;
  }

  /* メダルは再授与しないので、記録が 1 つでもある側を残す。同じ銘が両側にあるときは
     先に成立したほうの日付を採る (あとから来た写しで獲得日を書き換えない)。 */
  function mergeTrophies(localTrophies,remoteTrophies){
    var merged={},local=objectOf(localTrophies),remote=objectOf(remoteTrophies);
    Object.keys(remote).forEach(function(id){merged[id]=remote[id];});
    Object.keys(local).forEach(function(id){
      var mine=local[id],theirs=merged[id];
      if(!theirs||String(mine.at)<String(theirs.at))merged[id]=mine;
    });
    return merged;
  }

  /* 凍結済みの旧クライアント互換。道具図鑑も同じ扱い。初めて授かった日は
     片側にしか無いことがあるので union し、
     両側にあるときは早いほうを残す。 */
  function mergeToolDex(localDex,remoteDex){
    var merged={},local=objectOf(localDex),remote=objectOf(remoteDex);
    Object.keys(remote).forEach(function(id){merged[id]=remote[id];});
    Object.keys(local).forEach(function(id){
      if(!merged[id]||String(local[id])<String(merged[id]))merged[id]=local[id];
    });
    return merged;
  }

  /* 安定判定の窓は進んだ側 (有効回答が多い側) を残す。20 問ぶんの積み上げを
     競合で捨てると、鋳造が理由なく遠のく。周回が食い違うカテゴリだけは、この
     あとの mergeLapScopedState が周回に合う側で上書きする。 */
  function mergeTrophyProgress(localProgress,remoteProgress){
    var merged={},local=objectOf(localProgress),remote=objectOf(remoteProgress);
    Object.keys(remote).forEach(function(cat){merged[cat]=remote[cat];});
    Object.keys(local).forEach(function(cat){
      var mine=local[cat],theirs=merged[cat];
      if(!theirs||(isObject(mine)&&(mine.n||0)>=((isObject(theirs)&&theirs.n)||0)))merged[cat]=mine;
    });
    return merged;
  }

  /* Lv10 クリア時刻はリセット周回のロックの起点。遅いほうを採る = 直近のクリアを
     採る。早いほうを採ると、片方の端末の古い記録でロックが先に明ける。 */
  function mergeClearTimes(localTimes,remoteTimes){
    var merged={},local=objectOf(localTimes),remote=objectOf(remoteTimes);
    Object.keys(remote).forEach(function(cat){merged[cat]=remote[cat];});
    Object.keys(local).forEach(function(cat){
      if(!merged[cat]||String(local[cat])>String(merged[cat]))merged[cat]=local[cat];
    });
    return merged;
  }

  /* カテゴリごとの整数は大きいほうを採る (到達 Lv、周回数、鋳造済み周回)。
     いずれも「そこまで進んだ」という記録で、下がることはない。 */
  function mergeMaxByCat(localMap,remoteMap){
    var merged={},local=objectOf(localMap),remote=objectOf(remoteMap);
    Object.keys(remote).forEach(function(cat){merged[cat]=remote[cat];});
    Object.keys(local).forEach(function(cat){
      var mine=local[cat],theirs=merged[cat];
      if(!Number.isFinite(theirs)||(Number.isFinite(mine)&&mine>theirs))merged[cat]=mine;
    });
    return merged;
  }

  /* 周回に属する状態 (いまの Lv、昇降の 10 問窓、安定判定の 20 問窓) は、統合後の
     周回に居る側から丸ごと採る。周回が 1 つ後ろの側の値を混ぜると、リセット前の Lv と
     20 問がそのまま次の周の実績に化けて、競合を起こすだけで Lv1 のままメダルが
     2 枚成立してしまう (鋳造源は習熟のみ、という不変条件 3 が破れる)。
     両方が同じ周回に居るときは手元の Lv をそのまま使う (窓は進んだ側)。 */
  function mergeLapScopedState(merged,localProfile,remoteProfile){
    var local=objectOf(localProfile),remote=objectOf(remoteProfile);
    function lapAt(profile,cat){
      var value=objectOf(profile.lapCount)[cat];
      return Number.isInteger(value)&&value>=1?value:1;
    }
    function windowOf(profile,cat){
      var entry=objectOf(profile.trophyProgress)[cat];
      return isObject(entry)?entry:{n:0,recent:[]};
    }
    Object.keys(CATEGORIES).forEach(function(cat){
      var want=Number.isInteger(merged.lapCount[cat])&&merged.lapCount[cat]>=1?merged.lapCount[cat]:1;
      var mineAt=lapAt(local,cat)===want,theirsAt=lapAt(remote,cat)===want;
      /* 両方が同じ周回。mergeTrophyProgress の結果 (進んだ側) をそのまま使う。 */
      if(mineAt&&theirsAt)return;
      if(theirsAt){
        var theirLv=objectOf(remote.lv)[cat],theirAdapt=objectOf(remote.adapt)[cat];
        merged.lv[cat]=Number.isInteger(theirLv)&&theirLv>=1?theirLv:1;
        merged.adapt[cat]=isObject(theirAdapt)?theirAdapt:{n:0,recent:[]};
        merged.trophyProgress[cat]=windowOf(remote,cat);
        return;
      }
      /* 手元がこの周回に居る。向こうの前の周の窓は持ち込まない。 */
      merged.trophyProgress[cat]=windowOf(local,cat);
    });
    return merged;
  }

  /* 演習ログ (発行速度の監視に使う anslog) の union。uroLog と同じ「どちらの側の記録も
     減らさない」方針だが、鍵は日付 + カテゴリで、1 つの鍵に対して答えた数 (n) が多い
     ほうを丸ごと採る。n は多い側・ok/t/x は少ない側、のように鍵の中で field を混ぜると
     正答数が回答数を上回るような壊れた 1 日ぶんの記録になるので、uroLog が鍵ごとに
     本数の多い配列を丸ごと採るのと同じ考えで、鍵ごとに 1 つのオブジェクトを丸ごと採る。 */
  function mergeAnsLog(localLog,remoteLog){
    var local=objectOf(localLog),remote=objectOf(remoteLog),merged={};
    Object.keys(remote).concat(Object.keys(local)).forEach(function(day){
      if(merged[day])return;
      var localDay=objectOf(local[day]),remoteDay=objectOf(remote[day]),day2={};
      Object.keys(remoteDay).concat(Object.keys(localDay)).forEach(function(cat){
        if(day2[cat])return;
        var mine=localDay[cat],theirs=remoteDay[cat];
        if(!mine){day2[cat]=theirs;return;}
        if(!theirs){day2[cat]=mine;return;}
        day2[cat]=(mine.n||0)>=(theirs.n||0)?mine:theirs;
      });
      merged[day]=day2;
    });
    return merged;
  }

  /* 日ごとの解答数は端末ごとに増える一方なので、日単位で多いほうを採る (anslog と同じ規則)。
     足し算にすると、同じ日を両端末が見ているだけで二重に増える。 */
  function mergeDailyTotals(localDaily,remoteDaily){
    var local=objectOf(localDaily),remote=objectOf(remoteDaily),merged={};
    Object.keys(remote).concat(Object.keys(local)).forEach(function(day){
      if(merged[day])return;
      var mine=local[day],theirs=remote[day];
      if(!mine){merged[day]=theirs;return;}
      if(!theirs){merged[day]=mine;return;}
      merged[day]={n:Math.max(mine.n||0,theirs.n||0),ok:Math.max(mine.ok||0,theirs.ok||0)};
    });
    return merged;
  }

  /* 個体記録の同一性。新しい記録は shared/reward.js が発生時に振る cid、cid の無い
     時代の記録は全 field の一致で見る。競合の統合では両側が共通の履歴を丸ごと
     持っているのが普通なので、素朴な連結は統合のたびに履歴を倍化させる
     (2→4→8… で採集数が数百匹に膨張した 2026-08 の事故の原因)。同じ記録は 1 件に
     畳み、どちらか片側にしか無い記録だけを足す。cid の無い同内容の記録 (同じ日に
     同じ大きさ・性別・shiny) も 1 件に畳まれるが、古いクライアントが膨らませた
     save が混ざっても読むたびに元へ戻る自己修復のほうを採る。 */
  function recordKey(record){
    if(record&&typeof record.cid==="string"&&record.cid)return "c:"+record.cid;
    var value=isObject(record)?record:{};
    return "s:"+JSON.stringify(Object.keys(value).sort().map(function(key){return [key,value[key]];}));
  }
  function dedupRecords(records){
    var seen=Object.create(null);
    return records.filter(function(record){
      var key=recordKey(record);
      if(seen[key])return false;
      seen[key]=true;
      return true;
    });
  }

  function mergeProfileCatches(localProfile,remoteProfile){
    var localCatches=localProfile&&localProfile.collection&&localProfile.collection.catches||{};
    var remoteCatches=remoteProfile&&remoteProfile.collection&&remoteProfile.collection.catches||{};
    var merged=JSON.parse(JSON.stringify(localProfile)), catches={};
    var remote=isObject(remoteProfile)?remoteProfile:{};
    Object.keys(remoteCatches).concat(Object.keys(localCatches)).forEach(function(id){
      if(catches[id])return;
      var remoteEntry=remoteCatches[id], local=localCatches[id], entry={}, key;
      if(remoteEntry)for(key in remoteEntry)entry[key]=remoteEntry[key];
      if(local)for(key in local)entry[key]=local[key];
      entry.records=dedupRecords((remoteEntry&&remoteEntry.records||[]).concat(local&&local.records||[]));
      entry.n=entry.records.length;
      /* 記録のサイズ field は s (shared/reward.js の record)。size を見ていた頃は
         sizes が常に空で、二台で遊んだときに最大個体が統合されなかった。 */
      var sizes=entry.records.map(function(record){return record&&record.s;}).filter(Number.isFinite);
      if(sizes.length){entry.max=Math.max.apply(Math,sizes);entry.min=Math.min.apply(Math,sizes);}
      catches[id]=entry;
    });
    merged.collection.catches=catches;
    merged.collection.totalCatches=Object.keys(catches).reduce(function(total,id){return total+catches[id].n;},0);
    merged.uroLog=mergeUroLogs(localProfile&&localProfile.uroLog,remote.uroLog);
    merged.anslog=mergeAnsLog(localProfile&&localProfile.anslog,remote.anslog);
    merged.daily=mergeDailyTotals(localProfile&&localProfile.daily,remote.daily);
    /* tools / toolDex の統合は後方互換のためだけに残す: 旧クライアントが profile 側へ
       書いた記録を競合で消さない。統合結果を道具の正とはしない — 正は共有 kv
       (toolgear) 側で、app.js はここで作った merged.tools を読まない。 */
    merged.tools=mergeToolBoxes(localProfile&&localProfile.tools,remote.tools);
    merged.toolDex=mergeToolDex(localProfile&&localProfile.toolDex,remote.toolDex);
    merged.trophies=mergeTrophies(localProfile&&localProfile.trophies,remote.trophies);
    merged.trophyProgress=mergeTrophyProgress(localProfile&&localProfile.trophyProgress,remote.trophyProgress);
    merged.lv10ClearAt=mergeClearTimes(localProfile&&localProfile.lv10ClearAt,remote.lv10ClearAt);
    merged.maxLv=mergeMaxByCat(localProfile&&localProfile.maxLv,remote.maxLv);
    merged.lapCount=mergeMaxByCat(localProfile&&localProfile.lapCount,remote.lapCount);
    merged.mintedLaps=mergeMaxByCat(localProfile&&localProfile.mintedLaps,remote.mintedLaps);
    /* 周回に属する状態は、統合後の周回に居る側から採る (リセットを取りこぼさない)。
       戻るのは Lv の進行だけで、図鑑・捕獲済み・奉納記録・到達 Lv には触れない。 */
    mergeLapScopedState(merged,localProfile,remote);
    /* 装備は 1 枠なので union できない。local を優先し、統合後の道具箱に本体が
       無ければ remote の装備、それも無ければ外す (normalizeProfile と同じ自己修復)。
       道具そのものは残っているので、外れても選び直せば済む。 */
    var owned=Object.create(null);
    merged.tools.forEach(function(entry){owned[entry.type]=true;});
    var wanted=[localProfile&&localProfile.equippedToolId,remote.equippedToolId].filter(function(type){
      return typeof type==="string"&&owned[type];
    });
    merged.equippedToolId=wanted.length?wanted[0]:null;
    return merged;
  }

  function saveProfile(){
    if(!profileId||!global.QuestSave)return Promise.reject(new Error("保存できません"));
    if(QuestSave.warnIfDegraded)QuestSave.warnIfDegraded();
    var localProfile=profile;
    return QuestSave.saveVersioned("komorebi",profileId,localProfile,profileRevision).then(function(result){
      if(result&&result.ok){profileRevision=result.revision;return true;}
      if(!result||result.reason!=="conflict")throw new Error("保存できません");
      return QuestSave.loadVersioned("komorebi",profileId,null).then(function(latest){
        var remoteProfile=normalizeProfile(latest.data).profile;
        var mergedProfile=mergeProfileCatches(localProfile,remoteProfile);
        /* 統合の結果を画面と revision に反映するのは、書き込みが通ってから。先に
           revision だけ進めると、再送に失敗して呼び出し側が巻き戻したときに
           「向こうの記録を知らない古い profile」が競合なしで上書きしてしまう。 */
        return QuestSave.saveVersioned("komorebi",profileId,mergedProfile,latest.revision).then(function(retry){
          if(!retry||!retry.ok)throw new Error("保存の競合を解消できません");
          profile=mergedProfile;
          profileRevision=retry.revision;
          return true;
        });
      });
    });
  }

  function todayString(){
    var now=new Date();
    return now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2)+"-"+("0"+now.getDate()).slice(-2);
  }

  function applyPerformance(targetProfile,cat,ok,ms){
    if(!isObject(targetProfile)||!hasOwn(CATEGORIES,cat))throw new Error("カテゴリが正しくありません");
    if(typeof ok!=="boolean"||!Number.isFinite(ms)||ms<0)throw new Error("結果データが正しくありません");
    var trophyModule=global.Q4B_KOMOREBI_TROPHIES,lvAtAnswer=targetProfile.lv[cat];
    var s=targetProfile.stats[cat]||(targetProfile.stats[cat]={ok:0,n:0,ms:0});
    if(!Number.isInteger(s.ok)||!Number.isInteger(s.n)||!Number.isFinite(s.ms))throw new Error("統計データが正しくありません");
    s.n++;if(ok)s.ok++;s.ms+=ms;
    var recent=targetProfile.recent[cat]||(targetProfile.recent[cat]=[]);
    var adapt=targetProfile.adapt[cat]||(targetProfile.adapt[cat]={n:0,recent:[]});
    if(!Array.isArray(recent)||!Number.isInteger(adapt.n)||!Array.isArray(adapt.recent))throw new Error("統計データが正しくありません");
    recent.push(ok?1:0);while(recent.length>20)recent.shift();
    adapt.n++;adapt.recent.push(ok?1:0);while(adapt.recent.length>20)adapt.recent.shift();
    if(adapt.n%10===0){
      var ok10=adapt.recent.slice(-10).reduce(function(sum,value){return sum+value;},0);
      if(ok10>=9&&targetProfile.lv[cat]<CATEGORIES[cat].maxLv){targetProfile.lv[cat]++;targetProfile.maxLv[cat]=Math.max(targetProfile.maxLv[cat],targetProfile.lv[cat]);}
      else if(ok10<=5&&targetProfile.lv[cat]>1)targetProfile.lv[cat]--;
    }
    /* 安定判定は「その回答を出したときの Lv」で数える。昇降のあとの Lv で数えると、
       Lv9 の正答が Lv10 の実績に化ける。 */
    var minted=null;
    if(trophyModule){
      trophyModule.noteAnswer(targetProfile,cat,lvAtAnswer,ok);
      minted=trophyModule.award(targetProfile,cat,todayString());
      if(minted){
        /* リセット周回の 7 日ロックはこの時刻から数える。鋳造の瞬間にしか書かないので
           後から Lv が下がっても起点は動かないが、周回して鋳造し直したときは
           そのつど上書きする (ロックは直近のクリアから数える)。 */
        if(!isObject(targetProfile.lv10ClearAt))targetProfile.lv10ClearAt={};
        targetProfile.lv10ClearAt[cat]=new Date().toISOString();
      }
    }
    /* 返り値は「このひと問で鋳造が成立したメダル」(無ければ null)。交換フローの
       起動点になるので、UI の副作用は trophies.js ではなく呼び出し側に置く。 */
    return minted;
  }

  function recordResult(cat,ok,ms){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    var before=JSON.parse(JSON.stringify(profile));
    try{applyPerformance(profile,cat,ok,ms);}catch(error){return Promise.reject(error);}
    var saved;
    try{saved=saveProfile();}catch(error){profile=before;return Promise.reject(error);}
    return saved.catch(function(error){
      profile=before;
      throw error;
    });
  }

  /* 産卵とこはくの接続 (komorebi_breeding_bonus_gaps 決定 1, 3)。
     小道の有効正答は egg.game="komorebi" の卵だけを育て、こはくは共有ウォレットへ
     学習価値に応じて加算する。本編の卵 (keisan 等) はここからは一切進まない。
     習熟済み (maxLv 到達) カテゴリの周回は本編と同じく価値 0.4 に減衰する。
     返り値は実際にウォレットへ入った整数こはく数 (付与なしは 0)。アキュムレータ制
     なので毎回は 1 にならず、フィードバックの獲得表示はこの値だけを信じる。 */
  function feedSideRewards(cat,result,masteredAtAnswer){
    if(!result||!result.counted)return 0;
    var reward=global.Q4BReward;
    if(!reward)return 0;
    var mastered=masteredAtAnswer!=null?masteredAtAnswer:profile.maxLv&&profile.maxLv[cat]>=CATEGORIES[cat].maxLv;
    var value=mastered?0.4:1;
    var granted=0;
    if(typeof reward.earnAmber==="function"){
      try{
        profile.collection.amberAcc=(profile.collection.amberAcc||0)+value;
        if(profile.collection.amberAcc>=1){
          var amberWhole=Math.floor(profile.collection.amberAcc);
          reward.earnAmber(profile.collection,amberWhole);
          profile.collection.amberAcc-=amberWhole;
          granted=amberWhole;
        }
      }catch(_){granted=0;}
    }
    if(typeof reward.feedEgg==="function"){
      try{
        var fed=reward.feedEgg("komorebi",value,{});
        if(fed&&typeof fed.catch==="function")fed.catch(function(){});
      }catch(_){}
    }
    return granted;
  }

  /* --- こはくの共有ウォレット ------------------------------------------------
     残高と支払いは本編と同じ QuestSave の per-profile 財布 (keisan/app.js が
     Q4BReward.setAmberStore で配線するのと同じ台帳) を直接読む。amber API を
     持たない古い storage.js では残高 0 表示にとどめ、よぶボタンは出さない。 */
  function amberWallet(){
    var save=global.QuestSave;
    return save&&typeof save.amberOf==="function"&&typeof save.amberAdd==="function"&&typeof save.amberSpend==="function"?save:null;
  }

  function amberBalance(){
    var save=amberWallet();
    var value=save&&profileId?save.amberOf(profileId):0;
    return Number.isFinite(value)?value:0;
  }

  /* よぶ 1 回の値段。本編 keisanAmberCatch と同じ 30 (Q4BReward.AMBER_CATCH_COST)。 */
  function amberCallCost(){
    var reward=global.Q4BReward;
    return reward&&Number.isInteger(reward.AMBER_CATCH_COST)?reward.AMBER_CATCH_COST:30;
  }

  /* こはくで よぶ の対象巻。複数巻の地域では現在の遠征を優先し、現在の遠征が
     他地域にあるときは最新の巻を使う (regionList が遠征番号順に並べている)。
     placeholder しか無い地域では対象なし = ボタンを出さない。 */
  function amberCallVolume(region){
    var volumes=region.volumes.filter(function(volume){return volume.placeholder!==true;});
    if(!volumes.length)return null;
    var current=volumes.filter(function(volume){return volume.current;})[0];
    return current||volumes[volumes.length-1];
  }

  /* よぶ の実行。支払い → 抽選 → CAS 保存。保存に失敗したら捕獲を巻き戻して
     こはくを返金する (財布と図鑑が別台帳なので、片方だけ進んだ状態を残さない)。 */
  function amberCallCapture(region,rerender){
    var save=amberWallet(),volume=amberCallVolume(region),cost=amberCallCost();
    if(!save||!volume)return;
    if(amberBalance()<cost||!save.amberSpend(profileId,cost)){
      global.alert("🔶こはくが たりないよ（"+cost+"こ いるよ）");
      return;
    }
    /* 巻き戻すのは捕獲 (collection) だけ。道具の耐久は共有 kv に住み、消費の瞬間に
       永続済みなので、保存失敗でも巻き戻さない (失うのは高々 1 ポイント。本編と
       同じ許容で、kv を戻すと並行する別ページの消費を上書きする)。 */
    var before=cloneCollection(profile.collection),capture,toolUse=null;
    function refund(){
      save.amberAdd(profileId,cost);
      global.alert("ほぞんに しっぱいしました。こはくは かえしたよ");
    }
    function rollback(){
      replaceCollection(profile.collection,before);
    }
    try{
      /* 購入捕獲は重複救済に乗せない (段位 0 で引く)。救済は 8 正答 = 1 捕獲という
         学習量の対価であり、こはく連打が SR/SSR へ誘導される抜け道になっていた
         (2026-08-15 実機で farming を確認)。段位の進行・後退も購入では起こさない:
         recordCapture が上書きする前の段位を引き戻し、学習側の積み上げを守る。
         道具はゲージ捕獲と同じに扱う (装備中は 1 回ぶん減る)。 */
      var keptPity=profile.collection.pityDuplicates;
      var gear=loadToolGear(),pool=volumeToolPool(volume);
      capture=recordCapture(profile.collection,drawCapture(volume,profile.collection.catches,0,Math.random,equippedToolOf(gear,pool)),Math.random);
      if(keptPity!=null)profile.collection.pityDuplicates=keptPity;
      else delete profile.collection.pityDuplicates;
      toolUse=consumeToolDurability(gear,pool);
    }catch(error){
      rollback();
      refund();
      return;
    }
    var saved;
    try{saved=saveProfile();}catch(error){saved=Promise.reject(error);}
    saved.then(function(){
      rerender();
      showAmberCaptureModal(capture,toolUse);
    }).catch(function(){
      rollback();
      refund();
      rerender();
    });
  }

  /* よぶ の捕獲カード。セッションのフィードバックと同じ captureCardHtml を
     モーダルで見せる (捕獲の情報を別実装にしない)。 */
  function showAmberCaptureModal(capture,toolUse){
    var overlay=document.createElement("div");
    overlay.className="kom-modal";
    overlay.id="komAmberModal";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +captureCardHtml(capture,toolUse)
      +'<button type="button" class="kom-modal-close">'+displayText("とじる")+'</button></div>';
    overlay.addEventListener("click",function(event){
      if((event.target===overlay||event.target.className==="kom-modal-close")&&overlay.parentNode)overlay.parentNode.removeChild(overlay);
    });
    document.body.appendChild(overlay);
    if(global.Q4BCaptureCard)global.Q4BCaptureCard.attach(overlay);
    var close=overlay.querySelector(".kom-modal-close");
    if(close)close.focus();
  }

  /* 巻き戻しは profile 全体で取る (collection・統計・ログをまとめて戻す)。道具の
     耐久はもう profile に住んでおらず、共有 kv 側で消費の瞬間に永続済みなので、
     ここでは巻き戻さない: 保存に失敗した回に あみが 1 回ぶん減るのは、本編の
     抽選 (shared/reward.js) と同じ許容 (高々 1 ポイント)。 */
  function recordAnswer(cat,answer,volume,random){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    if(random!=null&&typeof random!=="function")return Promise.reject(new Error("乱数の指定が正しくありません"));
    var before=JSON.parse(JSON.stringify(profile)),result;
    try{
      result=applyAnswer(profile,cat,answer,volume,random||Math.random);
    }catch(error){profile=before;return Promise.reject(error);}
    if(result.duplicate)return Promise.resolve(result);
    return saveProfile().then(function(){result.amberGained=feedSideRewards(cat,result);return result;}).catch(function(error){
      profile=before;
      throw error;
    });
  }

  /* anslog と同じ判定で 1 問ぶん数える。anslog は 180 日で切り捨てるが、こちらは
     切り捨てない (ホームの つうさん / れんぞく日数 が過去を失わないように)。 */
  function bumpDailyTotal(targetProfile,ok){
    if(!targetProfile.daily||typeof targetProfile.daily!=="object")targetProfile.daily={};
    var key=todayString(),entry=targetProfile.daily[key];
    if(!entry||!Number.isInteger(entry.n))entry=targetProfile.daily[key]={n:0,ok:0};
    entry.n++;
    if(ok)entry.ok++;
  }

  function recordSubmission(cat,answer,volume,random,correct,elapsed,interrupted){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    var before=JSON.parse(JSON.stringify(profile)),result,minted=null;
    try{
      result=applyAnswer(profile,cat,answer,volume,random);
      var masteredAtAnswer=profile.maxLv&&profile.maxLv[cat]>=CATEGORIES[cat].maxLv;
      if(!result.duplicate){
        minted=applyPerformance(profile,cat,correct,elapsed);
        if(qualifiesForAnswerLog(answer)){
          profile.anslog=rewardEngine().logAnswer(profile.anslog,cat,correct,elapsed,interrupted,todayString());
          bumpDailyTotal(profile,correct);
        }
      }
    }catch(error){profile=before;return Promise.reject(error);}
    if(result.duplicate)return Promise.resolve(result);
    var saved;
    try{saved=saveProfile();}catch(error){profile=before;return Promise.reject(error);}
    return saved.then(function(){
      result.amberGained=feedSideRewards(cat,result,masteredAtAnswer);
      /* メダルは取得した瞬間に捧げる (不変条件 4: 残高ゼロ)。保存が通ってから
         起動するので、鋳造だけ画面に出て保存が消える、が起きない。 */
      if(minted)offerMintedMedal(minted);
      return result;
    }).catch(function(error){profile=before;throw error;});
  }

  function speciesForArea(bugs){
    return (bugs||global.Q4B_BUGS||[]).filter(function(sp){return sp.areaOnly==="komorebi";});
  }

  function graticuleHtml(box){
    var lines="",i;
    for(i=1;i<6;i++){
      var y=box[1]+box[3]*i/6;
      lines+='<line x1="'+box[0]+'" y1="'+y.toFixed(1)+'" x2="'+(box[0]+box[2])+'" y2="'+y.toFixed(1)+'"></line>';
    }
    for(i=1;i<8;i++){
      var x=box[0]+box[2]*i/8;
      lines+='<line x1="'+x.toFixed(1)+'" y1="'+box[1]+'" x2="'+x.toFixed(1)+'" y2="'+(box[1]+box[3])+'"></line>';
    }
    return lines;
  }

  function mapArtworkHtml(regions,currentRegionId,selectedRegionId){
    var box=mapViewBox(worldMap),byRegion={},regionPaths="",pins="",leader="";
    regions.forEach(function(region){byRegion[region.regionId]=region;});
    Object.keys(worldMap.regions).forEach(function(regionId){
      /* 未解放 (placeholder) 地域は陸地の発光もピンも出さず、未開拓地と同じ見た目にする。 */
      var region=byRegion[regionId],opened=region&&!region.placeholder,className="hl hl-unopened";
      if(opened)className=region.regionId===currentRegionId?"hl hl-current":"hl hl-open";
      regionPaths+='<path class="'+className+'" d="'+escapeHtml(worldMap.regions[regionId])+'"'+(opened?' filter="url(#rich-glow)"':'')+'></path>';
    });
    /* ピンは地域に 1 本。巻が増えてもピンは重ならず、数字は地域の全巻合計になる。
       バッジは地域の上でなく海上のアンカーに置き、地域の代表点から引き出し線で結ぶ。
       小さい島 (マダガスカル等) がバッジに隠れないための配置 (2026-08-15 実機フィードバック)。
       アンカーは viewBox 座標で、正距円筒の経緯度換算で外洋にあることを確認済み。 */
    var PIN_ANCHORS={madagascar:{x:672,y:356},australia:{x:866,y:400},borneo:{x:745,y:305},costa_rica:{x:240,y:250}};
    var leaderLines="";
    regions.forEach(function(region){
      if(region.placeholder)return;
      var state=regionPinState(region,viewCollection()),point=worldMap.pins[region.regionId];
      var anchor=PIN_ANCHORS[region.regionId]||point;
      var left=((anchor.x-box[0])/box[2]*100).toFixed(3),top=((anchor.y-box[1])/box[3]*100).toFixed(3);
      var status=state.kind==="current"?"現在の遠征":state.kind==="past"?"過去の遠征":"完成した遠征";
      var classes="map-pin pin-"+state.kind+(state.kind==="completed"?" pin-done":"")+(region.regionId===selectedRegionId?" pin-selected":"");
      if(anchor!==point){
        leaderLines+='<line class="pin-leader-line" x1="'+point.x+'" y1="'+point.y+'" x2="'+anchor.x+'" y2="'+anchor.y+'"></line>'
          +'<circle class="pin-leader-dot" cx="'+point.x+'" cy="'+point.y+'" r="3"></circle>';
      }
      /* 選択中の地域から下の一覧へ引き出し線を落とす。地図は「どこ」を示し、
         主役は下のカテゴリ一覧という関係を線で結ぶ。 */
      if(region.regionId===selectedRegionId)leader='<span class="map-leader" aria-hidden="true" style="left:'+left+'%;top:'+top+'%"></span>';
      pins+='<button type="button" class="'+classes+'" data-region-id="'+escapeHtml(region.regionId)+'" style="left:'+left+'%;top:'+top+'%;--pin-progress:'+(state.ringValue*360).toFixed(1)+'deg" aria-label="'+escapeHtml(region.regionName+' '+state.caught+'／'+state.denominator+'、'+status)+'">'
        +'<span class="pin-halo" aria-hidden="true"></span><span class="pin-ring" aria-hidden="true"><span class="pin-disc"><span class="pin-mark">'+state.mark+'</span></span></span>'
        +'<span class="pin-name">'+displayText(region.regionName)+'</span><span class="pin-count">'+state.caught+'／'+state.denominator+'</span></button>';
    });
    return '<div class="map-shell"><svg class="map map-rich" viewBox="'+escapeHtml(worldMap.viewBox)+'" role="img" aria-label="こもれびの遠征地図" preserveAspectRatio="xMidYMid meet">'
      +'<defs><radialGradient id="rich-sea" cx="50%" cy="45%" r="72%"><stop offset="0%" stop-color="#17454B"></stop><stop offset="62%" stop-color="#0E3036"></stop><stop offset="100%" stop-color="#071F26"></stop></radialGradient>'
      +'<linearGradient id="rich-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4C8352"></stop><stop offset="55%" stop-color="#38683F"></stop><stop offset="100%" stop-color="#28502F"></stop></linearGradient>'
      +'<radialGradient id="rich-vignette" cx="50%" cy="42%" r="62%"><stop offset="0%" stop-color="#FFE9A8" stop-opacity="0.20"></stop><stop offset="55%" stop-color="#FFD469" stop-opacity="0.05"></stop><stop offset="100%" stop-color="#04141A" stop-opacity="0.55"></stop></radialGradient>'
      +'<filter id="rich-glow" x="-320%" y="-320%" width="740%" height="740%"><feGaussianBlur stdDeviation="7" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>'
      +'<filter id="rich-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"></feTurbulence><feColorMatrix type="saturate" values="0"></feColorMatrix></filter>'
      +'<path id="world-land" d="'+escapeHtml(worldMap.land)+'"></path></defs>'
      +'<rect width="'+box[2]+'" height="'+box[3]+'" x="'+box[0]+'" y="'+box[1]+'" fill="url(#rich-sea)"></rect><g class="rich-latitudes">'+graticuleHtml(box)+'</g>'
      +'<use href="#world-land" class="rich-land-shadow"></use><use href="#world-land" class="rich-land"></use>'+regionPaths+leaderLines
      +'<rect width="'+box[2]+'" height="'+box[3]+'" x="'+box[0]+'" y="'+box[1]+'" filter="url(#rich-grain)" opacity="0.05" class="rich-grain"></rect>'
      +'<rect width="'+box[2]+'" height="'+box[3]+'" x="'+box[0]+'" y="'+box[1]+'" fill="url(#rich-vignette)"></rect></svg><div class="map-pins">'+leader+pins+'</div></div>';
  }

  /* ここから下は学習セッションの共通シェル。ゲージ・Lv ドット・捕獲カード・
     フィードバックはカテゴリを問わず同じものを出す (本編と乖離させないため)。
     CSS の ratio-* クラスは割合専用ではなく、このシェル共通のもの。 */

  function gaugeHtml(){
    return '<span class="ratio-gauge">'+displayText("採集ゲージ")+' <strong>'+displayText(profile.collection.gauge+'／'+COLLECTION_CONFIG.gaugeNeed)+'</strong></span>';
  }

  /* まちがいさがしだけは「値」ではなく「行」を選ばせるため、選択肢の見た目が式になる。 */
  function choiceLabels(question){
    if(question.format==="error_find")return question.lines.map(function(line){return question.dan+"×"+line.b+"＝"+line.value;});
    return question.choices.map(function(choice){return String(choice);});
  }

  function ratioChoiceHtml(question){
    /* 数字だけの選択肢は 2 列で出す。式を選ぶまちがいさがしは横幅がいるので 1 列のまま。 */
    var numeric=question.cat==="kom_kuku_run"&&question.format!=="error_find";
    return '<div class="ratio-choices'+(numeric?" kuku-choices":"")+'">'+choiceLabels(question).map(function(label,index){
      return '<button type="button" class="ratio-choice'+(numeric?" kuku-num":"")+'" data-choice-index="'+index+'">'+displayText(label)+'</button>';
    }).join("")+'</div>';
  }

  /* 分数の回答。整数部と分子と分母の 3 欄をいつも出す。帯分数になる問題だけ
     3 欄にすると、欄を見た時点で「1 より大きい」とわかってしまう。 */
  function fracInputHtml(){
    return '<form class="ratio-number-form frac-form" data-answer-form>'
      +'<div class="frac-input">'
      +'<input name="whole" type="text" inputmode="numeric" autocomplete="off" class="frac-whole" aria-label="'+attrText("整数の部分")+'">'
      +'<span class="frac-stack">'
      +'<input name="num" type="text" inputmode="numeric" autocomplete="off" aria-label="'+attrText("分子")+'">'
      +'<span class="frac-bar" aria-hidden="true"></span>'
      +'<input name="den" type="text" inputmode="numeric" autocomplete="off" aria-label="'+attrText("分母")+'">'
      +'</span></div>'
      +'<button type="submit" class="ratio-submit">'+displayText("答える")+'</button></form>';
  }

  /* 集合完成 (「ぜんぶ えらぶ」)。1 つ選んで即判定にすると、選び終える前に
     判定が走って残りを選べない。選択を溜めてから 1 回で出す。 */
  function multiChoiceHtml(question){
    var selection=(session&&session.multiSelection)||[];
    return '<div class="ratio-choices multi-choices">'+question.choices.map(function(choice,index){
      var on=selection.indexOf(index)>=0;
      return '<button type="button" class="ratio-choice'+(on?" is-selected":"")+'" data-multi-index="'+index+'"'
        +' aria-pressed="'+(on?"true":"false")+'">'+displayText(choice)+'</button>';
    }).join("")+'</div>'
      +'<div class="ratio-order-actions"><button type="button" class="ratio-reset" data-action="reset-multi">'+displayText("やりなおし")+'</button>'
      +'<button type="button" class="ratio-submit" data-action="submit-multi"'+(selection.length?"":" disabled")+'>'+displayText("答える")+'</button></div>';
  }

  function ratioOrderHtml(question){
    return '<ol class="ratio-order-answer" id="ratioOrderAnswer" aria-live="polite"></ol>'
      +'<div class="ratio-parts">'+question.displayOrder.map(function(index){return '<button type="button" class="ratio-part" data-part-index="'+index+'">'+displayText(orderPartText(question.parts[index]))+'</button>';}).join("")+'</div>'
      +'<div class="ratio-order-actions"><button type="button" class="ratio-reset" data-action="reset-order">'+displayText("やりなおし")+'</button>'
      +'<button type="button" class="ratio-submit" data-action="submit-order" disabled>'+displayText("答える")+'</button></div>';
  }

  function orderPartText(part){return isObject(part)&&typeof part.text==="string"?part.text:part;}

  /* --- 数値 + 単位の回答 -----------------------------------------------------
     単位換算だけが使う。数値だけを受け取ると「別の単位で計算し切った答え」が
     ただの計算違いに見えてしまい、何を直せばよいか子どもに渡せない
     (unit_convert curriculum 5 章)。 */

  function unitEngine(){
    var engine=global.Q4B_KOMOREBI_UNIT_CONVERT;
    if(!engine)throw new Error("単位換算を読み込めません");
    return engine;
  }

  function numUnitEngine(question){
    if(question&&question.cat==="kom_hayasa"){
      if(!global.Q4B_KOMOREBI_HAYASA)throw new Error("速さを読み込めません");
      return global.Q4B_KOMOREBI_HAYASA;
    }
    if(question&&question.cat==="kom_johou_seiri")return johouEngine();
    return unitEngine();
  }

  function numUnitHtml(question){
    var engine=numUnitEngine(question);
    var chips=question.unitChoices.map(function(unitId){
      var selected=session&&session.unitSelection===unitId;
      return '<button type="button" class="unit-chip'+(selected?" is-selected":"")+'" data-unit="'+attrText(unitId)+'"'
        +' aria-pressed="'+(selected?"true":"false")+'">'+displayText(engine.unitLabel(unitId))+'</button>';
    }).join("");
    return '<form class="ratio-number-form num-unit-form" data-answer-form>'
      +'<input name="answer" type="text" inputmode="decimal" autocomplete="off" aria-label="'+attrText("答えの数")+'">'
      +'<div class="unit-choices" role="group" aria-label="'+attrText("答えの単位")+'">'+chips+'</div>'
      +'<button type="submit" class="ratio-submit" data-submit-num-unit'+(session&&session.unitSelection?"":" disabled")+'>'+displayText("答える")+'</button></form>';
  }

  /* 情報整理は本文 (文ごと) と問い文と設問を分けて描く。question.text は
     「本文／設問」の暫定連結で、判定ログ用。画面には出さない (johou curriculum 9 章)。 */
  function johouPassageHtml(question){
    var passage=question.passage;
    if(!isObject(passage)||!Array.isArray(passage.sentences)||typeof passage.ask!=="string")throw new Error("情報整理の本文が正しくありません");
    return '<div class="johou-passage">'+passage.sentences.map(function(sentence){return '<p>'+displayText(sentence)+'</p>';}).join("")
      +'<p class="johou-ask">'+displayText(passage.ask)+'</p></div>';
  }

  /* 数量関係の図化の図。engine が返す SVG 文字列をそのまま挿す (escape すると図が消える)。
     1 枚は中央の単図、2 枚は横並びの対比ペア (diagram curriculum 15.3: 375px で 1 図 161px。
     縦積みフォールバックは持たない)。ペアの ア/イ は選択肢と図を結ぶ見出し。 */
  var DIAGRAM_PAIR_MARKS=["ア","イ"];
  function figuresHtml(question){
    if(!Array.isArray(question.figures)||!question.figures.length)return "";
    var pair=question.figures.length===2;
    return '<div class="diagram-figures'+(pair?" is-pair":"")+'">'+question.figures.map(function(svg,index){
      /* 面積図 (viewBox 幅 180) の単図だけ表示幅 220px 上限 (doc 15.3)。 */
      var narrow=!pair&&svg.indexOf('viewBox="0 0 180 ')>=0;
      var mark=pair?'<span class="diagram-figure-mark">'+displayText(DIAGRAM_PAIR_MARKS[index])+'</span>':"";
      return '<div class="diagram-figure'+(narrow?" is-rect":"")+'">'+mark+svg+'</div>';
    }).join("")+'</div>';
  }

  function standardQuestionBodyHtml(question){
    var scaffold=question.scaffold?'<p class="ratio-scaffold">'+displayText(question.scaffold)+'</p>':"";
    var work=question.work?'<div class="ratio-work">'+question.work.map(function(line){return '<p>'+displayText(line)+'</p>';}).join("")+'</div>':"";
    var controls;
    if(question.kind==="choice")controls=ratioChoiceHtml(question);
    else if(question.kind==="find_all")controls=multiChoiceHtml(question);
    else if(question.kind==="order")controls=ratioOrderHtml(question);
    else if(question.kind==="num_unit")controls=numUnitHtml(question);
    else if(question.kind==="frac")controls=fracInputHtml();
    else controls='<form class="ratio-number-form" data-answer-form><input name="answer" type="text" inputmode="decimal" autocomplete="off" aria-label="'+attrText("答え")+'"><button type="submit" class="ratio-submit">'+displayText("答える")+'</button></form>';
    if(question.cat==="kom_johou_seiri")return scaffold+johouPassageHtml(question)+'<h2>'+displayText(question.prompt)+'</h2>'+work+controls;
    return scaffold+'<h2>'+displayText(question.text)+'</h2>'+figuresHtml(question)+work+controls;
  }

  function ratioAnswerText(question){
    if(question.kind==="order")return question.ans.map(function(index){return orderPartText(question.parts[index]);}).join(" → ");
    if(question.kind==="choice")return question.choices[expectedChoiceIndex(question)]||"";
    return String(question.ans);
  }

  /* --- れんぞく九九の画面 ---------------------------------------------------
     時間の可視要素は一切置かない (categories 3.10)。速さは SRS の内部判定だけに
     使い、子どもには見せない。カウントダウンも速度ボーナスも作らない。 */

  function kukuEngine(){
    var engine=global.Q4B_KOMOREBI_KUKU_RUN;
    if(!engine)throw new Error("れんぞく九九を読み込めません");
    return engine;
  }

  function kukuPhrase(dan,b){
    var table=global.Q4B_KUKU_PHRASES;
    if(!table)return "";
    try{return table.phrase(dan,b);}catch(error){return "";}
  }

  /* 単一の句を問う形式だけが SRS の対象。factKey は "8x7" 形式で、まきものは
     行を持つため top-level の b を持たない。ここで 1 か所に解釈をまとめる。 */
  function kukuFact(question){
    var parts=typeof question.factKey==="string"?question.factKey.split("x"):[];
    if(parts.length!==2)return null;
    var dan=Number(parts[0]),b=Number(parts[1]);
    return Number.isInteger(dan)&&Number.isInteger(b)?{dan:dan,b:b}:null;
  }

  function kukuScaffoldHtml(question){
    return question.scaffold?'<p class="ratio-scaffold">'+displayText(question.scaffold)+'</p>':"";
  }

  function kukuScrollHtml(question){
    return '<div class="kuku-scroll">'+question.rows.map(function(row){
      return '<p class="kuku-scroll-row'+(row.blank?" is-blank":"")+'"><span>'+displayText(question.dan+"×"+row.b+"＝")+'</span><strong>'+displayText(row.blank?"？":String(row.value))+'</strong></p>';
    }).join("")+'</div>';
  }

  function kukuBoardHtml(question){
    return '<div class="kuku-board">'+question.shown.map(function(value){
      return '<span class="kuku-chip">'+displayText(String(value))+'</span>';
    }).join("")+'</div>';
  }

  /* だんランは 1 本で 1 問。途中の句は鎖として残し、いま答える句だけを大きく出す。 */
  function kukuChainHtml(question){
    var state=session.runState,done="",step;
    state.results.forEach(function(result,index){
      var past=question.steps[index];
      done+='<span class="kuku-link'+(result.correct?"":" is-wrong")+'">'+displayText(question.dan+"×"+past.b+"＝"+past.ans)+'</span>';
    });
    step=question.steps[state.step];
    return '<div class="kuku-chain">'+done+'</div>'
      +(step?'<h2>'+displayText(question.dan+"×"+step.b+"＝？")+'</h2>'
        +'<div class="ratio-choices kuku-choices">'+step.choices.map(function(choice,index){
          return '<button type="button" class="ratio-choice kuku-num" data-step-choice="'+index+'">'+displayText(String(choice))+'</button>';
        }).join("")+'</div>':"");
  }

  function kukuQuestionBodyHtml(question){
    if(question.format==="dan_run")return '<h2>'+displayText(question.dan+"のだんを つなげよう")+'</h2>'+kukuChainHtml(question);
    var head=kukuScaffoldHtml(question);
    if(question.format==="scroll_fill")return head+'<h2>'+displayText("まきものの あなを うめよう")+'</h2>'+kukuScrollHtml(question)+ratioChoiceHtml(question);
    if(question.format==="missing_find")return head+'<h2>'+displayText(question.dan+"のだんで たりないのは？")+'</h2>'+kukuBoardHtml(question)+ratioChoiceHtml(question);
    if(question.format==="error_find")return head+'<h2>'+displayText("まちがいは どれ？")+'</h2>'+ratioChoiceHtml(question);
    return head+'<h2 class="kuku-flash">'+displayText(question.dan+"×"+question.b+"＝？")+'</h2>'+ratioChoiceHtml(question);
  }

  function kukuAnswerText(question){
    if(question.format==="dan_run")return question.steps.map(function(step){return question.dan+"×"+step.b+"＝"+step.ans;}).join("　");
    if(question.format==="error_find")return question.dan+"×"+question.lines[question.ans].b+"＝"+(question.dan*question.lines[question.ans].b);
    return String(question.ans);
  }

  /* 答え合わせのあとに句を出す。想起の足場は「見せてから数問はさんで問う」ことで
     効くので、正誤に関わらず出す (categories 3.10 の短ループ想起)。 */
  function kukuPhraseCardHtml(question){
    var fact=question.format==="dan_run"?null:kukuFact(question),phrase=fact?kukuPhrase(fact.dan,fact.b):"";
    if(!phrase)return "";
    return '<aside class="ratio-waza"><h3>'+displayText("くくの よみかた")+'</h3><p><span>'+displayText(phrase)+'</span></p></aside>';
  }

  /* --- 段暗唱の画面 ---------------------------------------------------------
     ここだけ時間 UI を持つ (design 決定 6 第 2 次改訂)。見えないタイムアウトは
     理不尽なので、バーが目標の可視化とテンポガイドを兼ねる。 */

  function dan2Engine(){
    var engine=global.Q4B_KOMOREBI_KUKU_DAN2;
    if(!engine)throw new Error("段暗唱を読み込めません");
    return engine;
  }

  function speechCtor(){return global.SpeechRecognition||global.webkitSpeechRecognition||null;}

  /* --- 段暗唱の入力モード (端末ごと) ---------------------------------------
     iOS は SpeechRecognition が実用に達しないので、既定をタップ暗唱にする。
     タップは暗唱の答え合わせであって、本体は声に出して唱えること (設計決定)。 */

  var DAN_INPUT_MODE_KEY="q4b_dan_input_mode";

  function isIosDevice(){
    var nav=global.navigator;
    if(!nav)return false;
    var ua=String(nav.userAgent||"");
    if(/iPhone|iPad|iPod/.test(ua))return true;
    /* iPadOS 13+ は Mac を名乗る。タッチ点数で実機 iPad を拾う。 */
    return /Mac/.test(ua)&&Number(nav.maxTouchPoints||0)>1;
  }

  function storedDanInputMode(){
    try{
      var stored=global.localStorage?global.localStorage.getItem(DAN_INPUT_MODE_KEY):null;
      if(stored==="voice"||stored==="tap")return stored;
    }catch(error){}
    return null;
  }

  function danInputMode(){
    var mode=storedDanInputMode()||(isIosDevice()?"tap":"voice");
    /* 音声認識の無い端末では voice を選んでいても始められないので、タップへ倒す。 */
    return mode==="voice"&&!speechCtor()?"tap":mode;
  }

  function setDanInputMode(mode){
    try{if(global.localStorage)global.localStorage.setItem(DAN_INPUT_MODE_KEY,mode);}catch(error){}
  }

  function dan2PhrasesHtml(chunk){
    return '<ol class="dan2-phrases">'+chunk.phrases.map(function(item){
      var equation=chunk.dan+"×"+item.b+(chunk.display==="read"?"＝"+item.ans:"");
      return '<li><span class="dan2-eq">'+displayText(equation)+'</span>'
        +(chunk.display==="read"?'<span class="dan2-yomi">'+displayText(item.phrase)+'</span>':"")+'</li>';
    }).join("")+'</ol>';
  }

  /* 入力モードの切替ボタン。音声認識の無い端末では voice 側を出さない
     (押しても始められないボタンは子どもには理不尽)。 */
  function dan2ModeToggleHtml(mode){
    if(mode==="tap"&&!speechCtor())return "";
    var label=mode==="tap"?"🎙 こえで こたえる":"👆 タップで となえる";
    var next=mode==="tap"?"voice":"tap";
    return '<div class="dan2-mode-switch"><button type="button" class="dan2-mode-toggle" data-action="dan2-mode" data-mode-next="'+next+'">'+displayText(label)+'</button></div>';
  }

  /* タップ暗唱の開始前。読み札の一覧は音声モードと同じ体裁で先に見せる。 */
  function dan2TapIdleHtml(chunk){
    return dan2PhrasesHtml(chunk)
      +'<div class="dan2-voice"><button type="button" class="ratio-submit" data-action="dan2-tap-start">👆 '+displayText("はじめる")+'</button></div>';
  }

  /* タップ暗唱の進行中。確定した句は読み札全文を小さく残し、現在の句は
     穴あき (stemKana + ＿＿) を大きく出して 4 択で埋める。 */
  function dan2TapStepHtml(tap){
    var done=tap.answers.length?'<ol class="dan2-tap-done">'+tap.steps.slice(0,tap.answers.length).map(function(step){
      return '<li>'+displayText(step.stemKana+step.ansKana)+'</li>';
    }).join("")+'</ol>':"";
    var step=tap.steps[tap.answers.length];
    if(!step)return done;
    return done
      +'<p class="dan2-tap-card">'+displayText(step.stemKana)+'<span class="dan2-tap-blank">＿＿</span></p>'
      +'<div class="dan2-tap-choices">'+step.choices.map(function(choice,index){
        return '<button type="button" class="ratio-choice kuku-num" data-tap-step="'+tap.answers.length+'" data-tap-choice="'+index+'">'+displayText(String(choice))+'</button>';
      }).join("")+'</div>';
  }

  function dan2TapBodyHtml(chunk){
    var tap=session&&session.tap;
    return '<div class="dan2-timebar" aria-hidden="true"><span class="dan2-timebar-fill" id="dan2Timebar"></span></div>'
      +'<h2>'+displayText(chunk.dan+"の段")+'</h2>'
      +'<p class="dan2-tap-guide">'+displayText("こえに だして となえながら えらぼう")+'</p>'
      +'<div id="dan2TapArea">'+(tap&&tap.active?dan2TapStepHtml(tap):dan2TapIdleHtml(chunk))+'</div>'
      +dan2ModeToggleHtml("tap")
      +'<p class="dan2-status" id="dan2Status" role="status"></p>';
  }

  function dan2QuestionBodyHtml(chunk){
    if(danInputMode()==="tap")return dan2TapBodyHtml(chunk);
    var lead=chunk.display==="read"?"こえに 出して よもう":"こえに 出して となえよう";
    return '<div class="dan2-timebar" aria-hidden="true"><span class="dan2-timebar-fill" id="dan2Timebar"></span></div>'
      +'<h2>'+displayText(chunk.dan+"の段　"+lead)+'</h2>'
      +dan2PhrasesHtml(chunk)
      +'<div class="dan2-voice"><button type="button" class="ratio-submit" data-action="dan2-listen">🎙 '+displayText("となえる")+'</button></div>'
      +dan2ModeToggleHtml("voice")
      +'<p class="dan2-status" id="dan2Status" role="status"></p>';
  }

  function dan2AnswerText(chunk){
    return chunk.phrases.map(function(item){return item.phrase;}).join("　");
  }

  /* 詰まった句を れんぞく九九 の再出題デッキへ還流する (categories 3.2)。
     段暗唱で言えなかった句こそ、数値タップで繰り返す価値がある。 */
  function refluxStuckPhrase(chunk,verdict){
    if(!verdict||verdict.missing==null||verdict.missing<0)return;
    var item=chunk.phrases[verdict.missing];
    if(!item||!global.Q4B_KOMOREBI_KUKU_RUN)return;
    reviewKukuFact(chunk.dan,item.b,false,0);
  }

  function questionBodyHtml(question){
    if(question.cat==="kom_kuku_run")return kukuQuestionBodyHtml(question);
    if(isDanCat(question.cat))return dan2QuestionBodyHtml(question);
    return standardQuestionBodyHtml(question);
  }

  function answerText(question){
    /* 図化と整数の性質の find_all は正解集合が ansSet (生成器の契約)。他カテゴリは ans。 */
    if(question.kind==="find_all")return (Array.isArray(question.ans)?question.ans:question.ansSet).map(function(index){return question.choices[index];}).join("　");
    if(question.kind==="frac"){
      /* 表現変換の分数は {n,d}。表記は doc 7.5 の「3/8」形。 */
      if(question.cat==="kom_ratio_forms")return question.ans.n+"/"+question.ans.d;
      return fracEngine().formatFraction(question.ans);
    }
    if(question.cat==="kom_kuku_run")return kukuAnswerText(question);
    if(isDanCat(question.cat))return dan2AnswerText(question);
    if(question.kind==="num_unit")return String(question.ans)+numUnitEngine(question).unitLabel(question.ansUnit);
    return ratioAnswerText(question);
  }

  function reverseEngine(){
    var engine=global.Q4B_KOMOREBI_KUKU_REVERSE;
    if(!engine)throw new Error("九九のうら読みを読み込めません");
    return engine;
  }

  function fracEngine(){
    var engine=global.Q4B_KOMOREBI_FRAC_FLOW;
    if(!engine)throw new Error("分数の解き方を読み込めません");
    return engine;
  }

  function ratioFormsEngine(){
    var engine=global.Q4B_KOMOREBI_RATIO_FORMS;
    if(!engine)throw new Error("割合の表現変換を読み込めません");
    return engine;
  }

  function johouEngine(){
    var engine=global.Q4B_KOMOREBI_JOHOU_SEIRI;
    if(!engine)throw new Error("情報整理を読み込めません");
    return engine;
  }

  function diagramEngine(){
    var engine=global.Q4B_KOMOREBI_DIAGRAM_MODEL;
    if(!engine||!global.Q4B_KOMOREBI_DIAGRAM_ENGINE)throw new Error("数量関係の図化を読み込めません");
    return engine;
  }

  function seisuEngine(){
    var engine=global.Q4B_KOMOREBI_SEISU;
    if(!engine)throw new Error("整数の性質を読み込めません");
    return engine;
  }

  /* 図化の find_all 判定。生成器は正解集合を ansSet で持ち、judge を公開しないので
     ここで集合一致を取る (順不同・重複と範囲外は不正)。 */
  function judgeDiagramFindAll(question,answer){
    if(!Array.isArray(question.ansSet)||!Array.isArray(question.choices))throw new Error("複数選択問題の指定が正しくありません");
    if(!Array.isArray(answer))return false;
    var seen={},picked=[];
    for(var i=0;i<answer.length;i++){
      var value=answer[i];
      if(!Number.isInteger(value)||value<0||value>=question.choices.length||seen[value])return false;
      seen[value]=true;picked.push(value);
    }
    picked.sort(function(a,b){return a-b;});
    var expected=question.ansSet.slice().sort(function(a,b){return a-b;});
    return picked.length===expected.length&&expected.every(function(value,index){return value===picked[index];});
  }

  function judgeAnswer(question,answer){
    if(question.cat==="kom_kuku_run")return kukuEngine().judge(question,answer);
    if(question.cat==="kom_kuku_ura"||question.cat==="kom_kuku_inverse")return reverseEngine().judge(question,answer);
    if(question.kind==="frac"){
      /* 「値は合うが約分が残っている」を名指しするため、真偽値だけでなく verdict を残す。
         判定器はカテゴリで分かれる (表現変換は {n,d} 台帳、分数の解き方は独自形)。 */
      var fracJudge=question.cat==="kom_ratio_forms"?ratioFormsEngine():fracEngine();
      session.verdict=fracJudge.judgeFraction(question,{
        whole:Number(String(answer.whole).trim()||0),
        num:Number(String(answer.num).trim()),
        den:Number(String(answer.den).trim())
      });
      return session.verdict.correct;
    }
    if(question.cat==="kom_johou_seiri"&&question.kind==="find_all")return johouEngine().judge(question,answer);
    if(question.cat==="kom_diagram_model"&&question.kind==="find_all")return judgeDiagramFindAll(question,answer);
    /* 整数の性質は 9.3 章の契約どおり ansSet を持つ。生成器が judge を公開しているので
       そちらに渡す (ans は null なので judgeStandardAnswer では数値比較に落ちてしまう)。 */
    if(question.cat==="kom_seisu"&&question.kind==="find_all")return seisuEngine().judge(question,answer);
    if(question.cat==="kom_frac_flow")return fracEngine().judge(question,answer);
    if(isDanCat(question.cat))return !!(session.verdict&&session.verdict.correct);
    if(question.kind==="num_unit"){
      /* 判定の内訳 (単位だけ違うのか、量そのものが違うのか) をフィードバックで
         使うため、真偽値だけでなく verdict を残す。 */
      session.verdict=numUnitEngine(question).judgeNumUnit(question,answer.value,answer.unit);
      return session.verdict.correct;
    }
    return judgeStandardAnswer(question,answer);
  }

  function wazaCardHtml(question){
    var waza=question.waza||{primary:question.explanation||"",alternate:""};
    if(!waza.primary)return "";
    var alternate=waza.alternate?'<p><strong>'+displayText("別の道")+'</strong><span>'+displayText(waza.alternate)+'</span></p>':"";
    return '<aside class="ratio-waza"><h3>'+displayText("わざ")+'</h3><p><strong>'+displayText("主な道")+'</strong><span>'+displayText(waza.primary)+'</span></p>'+alternate+'</aside>';
  }

  /* 図化の解説カード。4 系統 (correct / correct_alternative / 誤り 8 型 / 読み取り形式)
     の出し分けは生成器 explainCard が済ませている (diagram curriculum 10.1)。 */
  function diagramExplainHtml(question){
    var card=diagramEngine().explainCard(question);
    if(!card||!card.text)return "";
    return '<aside class="ratio-waza"><h3>'+displayText("かいせつ")+'</h3><p><span>'+displayText(card.text)+'</span></p></aside>';
  }

  /* 捕獲カード。共有部品 (shared/capture_card.js) を、小道の捕獲結果 (recordCapture
     の返り値) から Q4BReward.record 互換の形へ写して呼ぶ。道具の場面と残り表示は
     カードが内蔵する (shared/tools_ui.js) ので、toolUse を渡すのは経済が公開の
     ときだけ: 旧 toolSceneHtml / toolStatusHtml と同じ門で、閉じている間は捕獲の
     見た目に 1 要素も増えない。名前は speciesName を通す (仮称に「（仮称）」が付く。
     出所は bugs.js の Q4B_SPECIES_DISPLAY_NAME の 1 本だけ)。photoMode は指定しない:
     共有部品が Q4BRender.species を呼び、ずかんの しゃしん／イラスト切替に従う
     (旧 ratioCaptureHtml の Q4BReward.svg と同じ経路)。 */
  function captureCardHtml(capture,toolUse){
    var card=global.Q4BCaptureCard;
    if(!capture||!card)return "";
    var reward=global.Q4BReward,sp=reward&&reward.spById?reward.spById(capture.id):null;
    if(!sp)return "";
    return card.html({
      sp:Object.assign({},sp,{jaName:speciesName(sp)}),
      size:capture.size,
      shiny:capture.shiny,
      sex:capture.sex,
      isNew:capture.isNew,
      isRecord:capture.isRecord,
      tier:sp.r,
      n:capture.n,
      toolUse:toolsModule()?toolUse:null
    },{text:displayText,course:profileType});
  }

  /* 道具の顔。アイコン (shared/tool_icons.js) があればそれを使い、読み込んで
     いない文脈では tools.js の絵文字へ倒す。捕獲リザルトの道具行は共有部品
     (shared/tools_ui.js) が同じ規則で描くようになったので、ここを通るのは
     うろの授与演出 (showToolGrantedModal) だけ。 */
  function toolFaceHtml(tool,options){
    var icons=global.Q4B_TOOL_ICONS;
    var art=icons&&typeof icons.svg==="function"?icons.svg(tool.id,options):"";
    return art||tool.emoji||"🔧";
  }

  /* 段暗唱は「なぜ駄目だったか」を言わないと理不尽になる。時間切れと言い間違いは
     子どもにとって別のことなので、区別して伝える。 */
  var DAN2_REASONS={
    answer_only:"式も いっしょに となえよう",
    stem_only:"答えまで となえよう",
    wrong_phrase:"じゅんばんに となえよう",
    wrong_tap:"まちがえた 読み札を もういちど となえよう"
  };

  function heardTranscript(transcript){
    var text=String(transcript||"").trim();
    return text?"きこえたことば: "+text:"";
  }

  /* 誤答の理由を名指しする。「なぜ駄目だったか」を言わないと理不尽になるのは
     段暗唱も単位換算も同じで、直す先が違うだけ。 */
  function reasonHtml(question,correct){
    var verdict=session&&session.verdict;
    if(correct||!verdict)return "";
    var reason="";
    if(isDanCat(question.cat))reason=verdict.timedOut?"タイムバーが 切れたよ":(DAN2_REASONS[verdict.state]||"");
    else if(question.kind==="num_unit"||question.kind==="frac")reason=verdict.note||"";
    return reason?'<p class="dan2-reason">'+displayText(reason)+'</p>':"";
  }

  function feedbackHtml(question,correct,result){
    var mark=correct?"正解！":"もう一歩！";
    var answer=correct?"":'<p class="ratio-answer"><strong>'+displayText("答え")+'</strong> '+displayText(answerText(question))+'</p>';
    var card=question.cat==="kom_kuku_run"?kukuPhraseCardHtml(question)
      :question.cat==="kom_diagram_model"?diagramExplainHtml(question)
      :(isDanCat(question.cat)?"":wazaCardHtml(question));
    var heard=!correct&&isDanCat(question.cat)&&session&&session.verdict?heardTranscript(session.verdict.transcript):"";
    /* こはくの獲得行。アキュムレータ制なので毎回は出ない (feedSideRewards の返り値
       が 1 以上のときだけ)。それが正しい見え方で、常時表示にはしない。 */
    var amber=(correct&&result&&Number.isFinite(result.amberGained)&&result.amberGained>0)
      ?'<p class="ratio-amber-gain">🔶 '+displayText("こはくを "+result.amberGained+"こ ひろった！")+'</p>':"";
    return '<div class="ratio-feedback '+(correct?'is-correct':'is-wrong')+'"><h2>'+displayText(mark)+'</h2>'
      +reasonHtml(question,correct)+(heard?'<p class="dan2-heard">'+displayText(heard)+'</p>':"")+answer+card+amber
      +captureCardHtml(result&&result.capture,result&&result.tool)+'</div>';
  }

  /* 本編 keisan/app.js の lvDotsHTML と同じ規則。stats ではなく adapt バッファを見る
     ことが要点で、そうしないと「画面ではあと 1 問なのに実際は 7 問」の乖離が起きる。 */
  function lvDotsHtml(cat){
    var adapt=profile.adapt&&profile.adapt[cat],lv=(profile.lv&&profile.lv[cat])||1;
    var n=adapt?adapt.n:0,inBlock=n%10,recent=adapt?adapt.recent.slice(-inBlock):[],dots="";
    for(var i=0;i<10;i++)dots+=(i<inBlock)?(recent[i]?"●":"✗"):"○";
    return '<span class="ratio-lv" aria-label="'+attrText("レベル"+lv+"、10問中"+inBlock+"問め")+'">Lv'+lv+'　'+dots+'</span>';
  }

  /* メダルの条件を解いている画面に出す。ルールが不可視なままだと、Lv10 に上がった
     あと「解き続けても何も起きない時間」だけが続き、条件を満たしたのか、もう取った
     のかが本人には分からない。
     窓は trophies.js が判定に使う直近 20 問そのもの (rolling) を読む。20 問ごとの
     区切りではないので、序盤で外しても「この 20 問はもう駄目」にはならず、古い誤答が
     窓から出れば戻る。Lv10 のときだけ出す: それ以外の Lv では窓が動かないので、
     置いても数字が固まったまま意味を持たない。 */
  /* 「あと何問」= ここから続けて正解したら成立する、その最小の問数。
     窓は 20 問で回るので、正答数の不足ぶん (17 - いまの正答数) を数えると嘘になる:
     1 問正解しても、窓から出ていくのが正答なら正答数は動かず、表示が何問解いても
     「あと 1 もん」で凍ったままになる (実測でこの通りに固まる)。
     押し出しまで数えたこの値は、正解 1 問につき必ず 1 減る。 */
  function medalAnswersLeft(recent){
    var stability=trophiesModuleOrNull().stability;
    var need=Math.ceil(stability.windowSize*stability.minAccuracy),k,window,ok,i;
    for(k=0;k<=stability.windowSize;k++){
      window=recent.slice();
      for(i=0;i<k;i++)window.push(1);
      window=window.slice(-stability.windowSize);
      if(window.length<stability.windowSize)continue;
      ok=window.reduce(function(sum,value){return sum+value;},0);
      if(ok>=need)return k;
    }
    return stability.windowSize;
  }

  function medalProgressHtml(cat){
    var trophyMod=trophiesModuleOrNull();
    if(!trophyMod||!trophyMod.forCat(cat))return "";
    if(((profile.lv&&profile.lv[cat])||1)!==10)return "";
    var icon=medalWording()?"🏅":"🏆",word=medalWording()?"メダル":"トロフィー";
    /* 今の周回ぶんは鋳造済み。同じ条件をもう一度満たしても何も起きない (再授与は
       しない) ので、そのことを言う。言わないと「クリアしたのに無反応」に見える。 */
    if(trophyMod.mintedLaps(profile,cat)>=trophyMod.lapOf(profile,cat))
      return '<span class="ratio-medal is-done" aria-label="'+attrText(word+"は かくとくずみ")+'">'+icon+' '+displayText("かくとくずみ")+'</span>';
    var stability=trophyMod.stability;
    var entry=profile.trophyProgress&&profile.trophyProgress[cat];
    var recent=entry&&Array.isArray(entry.recent)?entry.recent:[];
    var ok=recent.reduce(function(sum,value){return sum+value;},0);
    return '<span class="ratio-medal" aria-label="'+attrText(word+"の じょうけん、あと "+medalAnswersLeft(recent)+"もん、ちょくきん"+stability.windowSize+"もんで "+ok+"もん せいかい")+'">'
      +icon+' <b>'+displayText("あと"+medalAnswersLeft(recent)+"もん")+'</b> '+displayText(ok+"／"+stability.windowSize)+'</span>';
  }

  function sessionShell(body){
    var cat=session.cat;
    return '<main class="kom-page ratio-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back-map">← '+displayText("小道")+'</button></header>'
      +'<div class="ratio-session-head"><div><h1>'+displayText(CATEGORIES[cat].name)+'</h1><p>'+displayText("第"+(session.index+1)+"／"+session.questions.length+"問")+'</p>'+lvDotsHtml(cat)+medalProgressHtml(cat)+'</div>'+gaugeHtml()+'</div>'
      +'<section class="ratio-panel">'+body+'</section></main>';
  }

  function renderOrderSelection(question){
    var list=document.getElementById("ratioOrderAnswer");
    if(list)list.innerHTML=session.orderSelection.length?session.orderSelection.map(function(index){return '<li>'+displayText(orderPartText(question.parts[index]))+'</li>';}).join(""):'<li class="ratio-order-placeholder">'+displayText("順番に選びましょう")+'</li>';
    Array.prototype.forEach.call(document.querySelectorAll("[data-part-index]"),function(button){
      button.disabled=session.orderSelection.indexOf(Number(button.getAttribute("data-part-index")))>=0;
    });
    var submit=document.querySelector('[data-action="submit-order"]');
    if(submit)submit.disabled=session.orderSelection.length!==question.parts.length;
  }

  /* 選択肢のタップは index で届く。判定側は「値」で比べるので、ここで値へ戻す。
     まちがいさがしは選択肢そのものが行 index なので、どちらでも同じ値になる。 */
  function choiceValue(question,index){
    return question.cat==="kom_kuku_run"?question.choices[index]:index;
  }

  /* --- 段暗唱の音声とタイムバー --------------------------------------------
     タイムの基準は発話終端 (音声活動の終わり)。認識結果の到着時刻で測ると、
     エンジンの遅延が子どもの成績に化けてしまう (categories 3.2)。 */

  function dan2Status(message){
    var node=document.getElementById("dan2Status");
    if(node)node.innerHTML=message?displayText(message):"";
  }

  function startTimebar(limitMs){
    var fill=document.getElementById("dan2Timebar");
    if(!fill)return;
    fill.style.transition="none";
    fill.style.width="100%";
    /* 幅を戻した直後に transition を張ると、ブラウザが 1 フレームにまとめてしまい
       アニメーションが起きない。次のフレームまで待ってから減らし始める。 */
    var start=function(){fill.style.transition="width "+limitMs+"ms linear";fill.style.width="0%";};
    if(typeof global.requestAnimationFrame==="function")global.requestAnimationFrame(function(){global.requestAnimationFrame(start);});
    else setTimeout(start,16);
  }

  /* 発話が終わった時点の残りを止めて見せる。transition の途中の実寸は
     offsetWidth で取れるので、そこで固定する。 */
  function freezeTimebar(){
    var fill=document.getElementById("dan2Timebar");
    if(!fill)return;
    var width=Number.isFinite(fill.offsetWidth)?fill.offsetWidth+"px":fill.style.width;
    fill.style.transition="none";
    fill.style.width=width;
  }

  function retryDan2(message,transcript){
    var fill=document.getElementById("dan2Timebar");
    if(fill){fill.style.transition="none";fill.style.width="100%";}
    var heard=heardTranscript(transcript);
    dan2Status(message+(heard?"　"+heard:""));
  }

  function stopDan2Voice(){
    var voice=session&&session.voice;
    if(!voice)return;
    if(voice.timer){clearTimeout(voice.timer);voice.timer=null;}
    if(voice.rec){try{voice.rec.abort();}catch(error){}voice.rec=null;}
    voice.listening=false;
  }

  function finishDan2(chunk,transcript,elapsedMs){
    var voice=session&&session.voice;
    if(!voice||!voice.listening)return;
    stopDan2Voice();
    freezeTimebar();
    var verdict=dan2Engine().judgeChunk(chunk,transcript,elapsedMs);
    if(!verdict.counted){
      /* 認識失敗はノーカウント。統計にも Lv にも入れず、同じチャンクをやり直す。 */
      retryDan2("ききとれませんでした。もういちど となえてね",transcript);
      return;
    }
    verdict.transcript=transcript;
    session.verdict=verdict;
    refluxStuckPhrase(chunk,verdict);
    submitAnswer({transcript:transcript,elapsedMs:elapsedMs});
  }

  function startDan2Voice(chunk){
    var Ctor=speechCtor();
    if(!Ctor){dan2Status("この ブラウザでは こえが つかえません");return;}
    if(session.voice&&session.voice.listening)return;
    var rec=new Ctor(),active=session;
    session.voice={rec:rec,listening:true,startedAt:Date.now(),speechEndAt:0,timer:null};
    rec.lang="ja-JP";rec.interimResults=false;rec.maxAlternatives=3;rec.continuous=false;
    /* iPad で「イベントが一切来ないまま沈黙」する事例の切り分け用に、開始確認と
       エラーコードと途中終了を画面へ出す。保護者が原因を読める最小の計装。 */
    rec.onstart=function(){if(session===active&&session.voice&&session.voice.listening)dan2Status("きいています…（マイク ON）");};
    rec.onspeechend=function(){if(session===active&&session.voice)session.voice.speechEndAt=Date.now();};
    rec.onerror=function(event){
      if(session!==active)return;
      stopDan2Voice();freezeTimebar();
      var code=event&&event.error?"（"+event.error+"）":"";
      dan2Status("ききとれませんでした。もういちど となえてね"+code);
    };
    rec.onend=function(){
      /* 結果もエラーも出さずに認識だけが終わる iOS の挙動を拾う。listening が
         残ったままの onend = 空振り終了なので、タイムバーを待たずに知らせる。 */
      if(session!==active||!session.voice||!session.voice.listening)return;
      stopDan2Voice();freezeTimebar();
      dan2Status("ききとれませんでした。もういちど となえてね（とちゅうで おわりました）");
    };
    rec.onresult=function(event){
      if(session!==active||!session.voice||!session.voice.listening)return;
      var texts=[],result=event.results&&event.results[0],index;
      if(result)for(index=0;index<result.length;index++)texts.push(result[index].transcript||"");
      var voice=session.voice,end=voice.speechEndAt||Date.now();
      finishDan2(chunk,texts.join(" "),Math.max(0,end-voice.startedAt));
    };
    /* 発話終端が届いていれば、バーが尽きても 1800ms だけ認識結果を待つ。時間は
       発話終端で測るため、遅れて届いた結果でも制限超過を時間内にはできない。
       一度も声が出ていなければ、従来どおり直ちに不正解。 */
    session.voice.timer=setTimeout(function(){
      if(session!==active||!session.voice||!session.voice.listening)return;
      var spoke=session.voice.speechEndAt>0;
      if(spoke){
        freezeTimebar();
        session.voice.timer=setTimeout(function(){
          if(session!==active||!session.voice||!session.voice.listening)return;
          stopDan2Voice();
          retryDan2("ききとれませんでした。もういちど となえてね");
        },1800);
        return;
      }
      stopDan2Voice();
      freezeTimebar();
      session.verdict=dan2Engine().timeoutVerdict(chunk);
      submitAnswer({transcript:"",elapsedMs:chunk.limitMs+1});
    },chunk.limitMs+200);
    dan2Status("きいています…");
    startTimebar(chunk.limitMs);
    try{rec.start();}catch(error){stopDan2Voice();dan2Status("こえを はじめられませんでした");}
  }

  /* --- 段暗唱のタップ入力 ---------------------------------------------------
     タイムバーの途中で画面全体を描き直すとバーが巻き戻るので、進行中の
     描き直しは #dan2TapArea の中身だけに閉じる (だんランの renderCurrent とは
     逆の理由で、部分描画にしてある)。 */

  function stopDan2Tap(){
    var tap=session&&session.tap;
    if(!tap)return;
    if(tap.timer){clearTimeout(tap.timer);tap.timer=null;}
    tap.active=false;
  }

  function renderDan2TapArea(chunk){
    var area=document.getElementById("dan2TapArea");
    if(!area)return;
    var tap=session&&session.tap;
    area.innerHTML=tap&&tap.active?dan2TapStepHtml(tap):dan2TapIdleHtml(chunk);
    bindDan2TapArea(chunk);
  }

  function bindDan2TapArea(chunk){
    var start=document.querySelector('[data-action="dan2-tap-start"]');
    if(start)start.addEventListener("click",function(){startDan2Tap(chunk);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-tap-choice]"),function(button){
      button.addEventListener("click",function(){
        submitDan2TapChoice(chunk,Number(button.getAttribute("data-tap-step")),Number(button.getAttribute("data-tap-choice")));
      });
    });
  }

  function finishDan2Tap(chunk){
    var tap=session&&session.tap;
    if(!tap||!tap.active)return;
    var elapsed=Math.max(0,Date.now()-tap.startedAt);
    stopDan2Tap();
    freezeTimebar();
    var verdict;
    try{verdict=dan2Engine().judgeTapChunk(chunk,tap.answers,elapsed);}
    catch(error){renderQuestion("答えを確かめられませんでした。もう一度試してください。");return;}
    session.verdict=verdict;
    /* verdict.missing はエンジンが wrongIndexes の先頭を入れてある。音声版の
       「詰まった句」と同じ扱いで、まちがえた最初の句を還流する。 */
    refluxStuckPhrase(chunk,verdict);
    submitAnswer({tapAnswers:tap.answers.slice(),elapsedMs:elapsed});
  }

  function startDan2Tap(chunk){
    if(!session||session.pending)return;
    if(session.tap&&session.tap.active)return;
    var steps;
    try{steps=dan2Engine().buildTapSteps(chunk,Math.random);}
    catch(error){dan2Status("もんだいを つくれませんでした");return;}
    var active=session;
    session.tap={steps:steps,answers:[],startedAt:Date.now(),timer:null,active:true};
    /* バー切れは音声版と同じ +200ms の猶予で締める。経過は開始時刻から測るので
       締めた時点で必ず制限超過になり、timedOut の判定はエンジンに任せられる。 */
    session.tap.timer=setTimeout(function(){
      if(session!==active)return;
      finishDan2Tap(chunk);
    },chunk.limitMs+200);
    dan2Status("");
    startTimebar(chunk.limitMs);
    renderDan2TapArea(chunk);
  }

  function submitDan2TapChoice(chunk,stepIndex,choiceIndex){
    var tap=session&&session.tap;
    if(!tap||!tap.active||session.pending)return;
    /* 描き替え前の札の連打を拾わないよう、ボタンが指す句と現在の句を突き合わせる。 */
    if(stepIndex!==tap.answers.length)return;
    var step=tap.steps[stepIndex];
    if(!step||!Number.isInteger(step.choices[choiceIndex]))return;
    tap.answers.push(step.choices[choiceIndex]);
    if(tap.answers.length<tap.steps.length){renderDan2TapArea(chunk);return;}
    finishDan2Tap(chunk);
  }

  function bindQuestion(question){
    document.querySelector('[data-action="back-map"]').addEventListener("click",function(){stopDan2Voice();stopDan2Tap();session=null;renderMap(question.volumeId);});
    var listen=document.querySelector('[data-action="dan2-listen"]');
    if(listen)listen.addEventListener("click",function(){startDan2Voice(question);});
    var modeToggle=document.querySelector('[data-action="dan2-mode"]');
    if(modeToggle)modeToggle.addEventListener("click",function(){
      /* 進行中の聞き取り / タップ途中は破棄して、同じ問題をもう一方のモードで描き直す。 */
      setDanInputMode(modeToggle.getAttribute("data-mode-next")==="tap"?"tap":"voice");
      stopDan2Voice();
      stopDan2Tap();
      session.tap=null;
      renderCurrent();
    });
    if(isDanCat(question.cat))bindDan2TapArea(question);
    Array.prototype.forEach.call(document.querySelectorAll("[data-choice-index]"),function(button){
      button.addEventListener("click",function(){submitAnswer(choiceValue(question,Number(button.getAttribute("data-choice-index"))));});
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-step-choice]"),function(button){
      button.addEventListener("click",function(){submitRunStep(Number(button.getAttribute("data-step-choice")));});
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-part-index]"),function(button){
      button.addEventListener("click",function(){session.orderSelection.push(Number(button.getAttribute("data-part-index")));renderOrderSelection(question);});
    });
    var reset=document.querySelector('[data-action="reset-order"]'),submit=document.querySelector('[data-action="submit-order"]');
    if(reset)reset.addEventListener("click",function(){session.orderSelection=[];renderOrderSelection(question);});
    if(submit)submit.addEventListener("click",function(){submitAnswer(session.orderSelection.slice());});
    Array.prototype.forEach.call(document.querySelectorAll("[data-multi-index]"),function(button){
      button.addEventListener("click",function(){
        var index=Number(button.getAttribute("data-multi-index")),at=session.multiSelection.indexOf(index);
        if(at>=0)session.multiSelection.splice(at,1);
        else session.multiSelection.push(index);
        renderCurrent();
      });
    });
    var resetMulti=document.querySelector('[data-action="reset-multi"]'),submitMulti=document.querySelector('[data-action="submit-multi"]');
    if(resetMulti)resetMulti.addEventListener("click",function(){session.multiSelection=[];renderCurrent();});
    if(submitMulti)submitMulti.addEventListener("click",function(){submitAnswer(session.multiSelection.slice());});
    /* 単位を選んでも描き直さない。描き直すと入力済みの数が消えて、
       数を打ってから単位を押した子だけが打ち直しになる。 */
    Array.prototype.forEach.call(document.querySelectorAll("[data-unit]"),function(button){
      button.addEventListener("click",function(){
        session.unitSelection=button.getAttribute("data-unit");
        Array.prototype.forEach.call(document.querySelectorAll("[data-unit]"),function(chip){
          var on=chip.getAttribute("data-unit")===session.unitSelection;
          chip.classList.toggle("is-selected",on);
          chip.setAttribute("aria-pressed",on?"true":"false");
        });
        var submit=document.querySelector("[data-submit-num-unit]");
        if(submit)submit.disabled=false;
      });
    });
    var form=document.querySelector("[data-answer-form]");
    if(form)form.addEventListener("submit",function(event){
      event.preventDefault();
      if(question.kind==="num_unit"){
        if(!session.unitSelection)return;
        submitAnswer({value:form.elements.answer.value,unit:session.unitSelection});
        return;
      }
      if(question.kind==="frac"){
        submitAnswer({whole:form.elements.whole.value,num:form.elements.num.value,den:form.elements.den.value});
        return;
      }
      submitAnswer(form.elements.answer.value);
    });
  }

  /* 描画のやり直し。だんランは 1 問の途中で何度も描き直すため、計測の起点を
     壊さないよう、初期化を行う renderQuestion とは分けてある。 */
  function renderCurrent(errorMessage){
    var question=session.questions[session.index];
    question.volumeId=session.volumeId;
    var error=errorMessage?'<p class="ratio-error" role="alert">'+displayText(errorMessage)+'</p>':"";
    document.getElementById("app").innerHTML=sessionShell(error+questionBodyHtml(question));
    bindQuestion(question);
    if(question.kind==="order")renderOrderSelection(question);
  }

  function renderQuestion(errorMessage){
    var question=session.questions[session.index];
    stopDan2Voice();
    stopDan2Tap();
    session.tap=null;
    session.orderSelection=[];
    session.multiSelection=[];
    session.unitSelection=null;
    session.startedAt=Date.now();
    if(KOMOREBI_ANSWER_TIMER)KOMOREBI_ANSWER_TIMER.start();
    session.verdict=null;
    session.runState=question.format==="dan_run"?{step:0,results:[],startedAt:Date.now()}:null;
    renderCurrent(errorMessage);
  }

  function renderFeedback(question,correct,result){
    var last=session.index===session.questions.length-1;
    var label=last?"小道へ戻る":"次の問題";
    document.getElementById("app").innerHTML=sessionShell(feedbackHtml(question,correct,result)
      +'<button type="button" class="ratio-next" data-action="ratio-next">'+displayText(label)+'</button>');
    /* めくりのタップ配線 (捕獲カードの飾り)。カードが無い回は何も拾わない。 */
    if(global.Q4BCaptureCard)global.Q4BCaptureCard.attach(document.getElementById("app"));
    document.querySelector('[data-action="back-map"]').addEventListener("click",function(){var id=session.volumeId;stopDan2Voice();stopDan2Tap();session=null;renderMap(id);});
    document.querySelector('[data-action="ratio-next"]').addEventListener("click",function(){
      if(last){var id=session.volumeId;stopDan2Voice();stopDan2Tap();session=null;renderMap(id);}
      else{session.index++;renderQuestion();}
    });
  }

  /* 九九 SRS のデッキは初回の出題で作る。createProfile を変えると既存の保存データの
     形が動くので、遅延生成にしてある。 */
  function kukuDeck(){
    if(!profile.srs.kuku)profile.srs.kuku=kukuEngine().createDeck();
    return profile.srs.kuku;
  }

  function reviewKukuFact(dan,b,correct,ms){
    var engine=kukuEngine(),deck=kukuDeck();
    engine.noteAsked(deck);
    engine.reviewFact(deck,dan,b,correct,ms);
  }

  /* だんランの 1 句。ここでは保存せず、鎖を終えた時点で 1 問として提出する。
     句ごとのレイテンシは累加の検出に使うので、句単位で SRS に渡す。 */
  function submitRunStep(choiceIndex){
    if(!session||session.pending||!session.runState)return;
    var question=session.questions[session.index],state=session.runState,step=question.steps[state.step];
    if(!step)return;
    var value=step.choices[choiceIndex],correct=value===step.ans;
    reviewKukuFact(question.dan,step.b,correct,Math.max(0,Date.now()-state.startedAt));
    state.results.push({correct:correct,value:value});
    state.step++;
    state.startedAt=Date.now();
    if(state.step<question.steps.length){renderCurrent();return;}
    submitAnswer(state.results.map(function(result){return result.value;}));
  }

  function submitAnswer(answer){
    if(!session||session.pending)return;
    var activeSession=session,question=activeSession.questions[activeSession.index],correct;
    try{correct=judgeAnswer(question,answer);}catch(error){renderQuestion("答えを確かめられませんでした。もう一度試してください。");return;}
    activeSession.pending=true;
    var submissionId=activeSession.id+":"+activeSession.index+":"+(activeSession.attempts++);
    var event={sessionId:activeSession.id,submissionId:submissionId,format:question.format,kind:question.kind,correct:correct,final:true,retry:false};
    var answerTiming=KOMOREBI_ANSWER_TIMER?KOMOREBI_ANSWER_TIMER.stop():{interrupted:false};
    var elapsed=Math.max(0,Date.now()-activeSession.startedAt),volume=volumeById(activeSession.volumeId);
    /* SRS は単一の句を想起させる形式だけに効かせる。まちがいさがし・たりないさがしは
       盤面の走査であって句の想起ではないので、レイテンシを混ぜない。 */
    var fact=(question.cat==="kom_kuku_run"&&(question.format==="scroll_fill"||question.format==="flash"))?kukuFact(question):null;
    if(fact)reviewKukuFact(fact.dan,fact.b,correct,elapsed);
    /* 逆引きの誤答も同じデッキへ戻す。どのカテゴリで詰まっても、九九の再出題は
       れんぞく九九 1 か所に集まる (reverse curriculum 3.5)。 */
    if(question.cat==="kom_kuku_inverse"&&!correct&&question.fact&&global.Q4B_KOMOREBI_KUKU_RUN)reviewKukuFact(question.fact.dan,question.fact.b,false,0);
    recordSubmission(activeSession.cat,event,volume,Math.random,correct,elapsed,answerTiming.interrupted).then(function(result){
      if(session!==activeSession)return;
      activeSession.pending=false;renderFeedback(question,correct,result);
    }).catch(function(){
      if(session!==activeSession)return;
      activeSession.pending=false;renderQuestion("答えを保存できませんでした。もう一度試してください。");
    });
  }

  function beginSession(cat,volume,questions,sessionId){
    /* 問題を解いている間は共有のずかん切替トグルを隠す (keisan nextQ と同じ運用)。
       解除はセッションの唯一の出口である renderMap が行う。 */
    if(global.Q4BRender&&global.Q4BRender.setSessionActive)global.Q4BRender.setSessionActive(true);
    session={id:sessionId,cat:cat,volumeId:volume.id,questions:questions,index:0,attempts:0,pending:false,
      orderSelection:[],multiSelection:[],unitSelection:null,startedAt:0,runState:null,tap:null};
    renderQuestion();
    return session;
  }

  function startRatioSession(volume,random){
    if(!profile||!ratioPool)return Promise.reject(new Error("割合問題を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_ratio")<0)return Promise.reject(new Error("この小道では割合と比を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=buildRatioSet(ratioPool,profile.lv.kom_ratio,profile.ratioHistory,generatorRandom);
      sessionId="ratio_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    var previous=JSON.parse(JSON.stringify(profile.ratioHistory));
    profile.ratioHistory=updateRatioHistory(profile.ratioHistory,questions);
    var saved;
    try{saved=saveProfile();}catch(error){profile.ratioHistory=previous;return Promise.reject(error);}
    return saved.then(function(){
      return beginSession("kom_ratio",volume,questions,sessionId);
    }).catch(function(error){profile.ratioHistory=previous;throw error;});
  }

  /* 割合と違って出題履歴を先に保存する必要がない (同じ句の反復こそが目的)。
     SRS デッキの更新は解答のたびに提出と一緒に保存される。 */
  function startKukuRunSession(volume,random){
    if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
    if(!volume||volume.categories.indexOf("kom_kuku_run")<0)return Promise.reject(new Error("この小道ではれんぞく九九を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=kukuEngine().buildSet(profile.lv.kom_kuku_run,kukuDeck(),generatorRandom);
      sessionId="kuku_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_kuku_run",volume,questions,sessionId));
  }

  function startKukuDanSession(cat){
    return function(volume,random){
      if(!profile)return Promise.reject(new Error("保存データを読み込めません"));
      if(!volume||volume.categories.indexOf(cat)<0)return Promise.reject(new Error("この小道では段暗唱を遊べません"));
      /* マイクが無くてもタップ暗唱で遊べる (danInputMode がタップへ倒す) ので、
         ここでは音声認識の有無を条件にしない。 */
      var generatorRandom=random||Math.random,chunks,sessionId;
      try{
        chunks=dan2Engine().buildSet(danOfCategory(cat),profile.lv[cat],generatorRandom);
        sessionId=cat+"_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      }catch(error){return Promise.reject(error);}
      return Promise.resolve(beginSession(cat,volume,chunks,sessionId));
    };
  }

  /* 3.14 の段は normal の 1 形式だけなので、共通シェルの標準レンダラと標準判定を
     そのまま使う。ここで足すのは出題の取り出しだけ。 */
  function startPi314Session(volume,random){
    var engine=global.Q4B_KOMOREBI_PI314;
    if(!profile||!engine)return Promise.reject(new Error("3.14 の段を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_pi314")<0)return Promise.reject(new Error("この小道では3.14の段を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=engine.buildSet(profile.lv.kom_pi314,generatorRandom);
      sessionId="pi314_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_pi314",volume,questions,sessionId));
  }

  /* うら読みと逆引きは同じ生成器を共有する。出題の取り出しだけ cat で分ける。 */
  function startKukuReverseSession(cat){
    return function(volume,random){
      if(!profile||!global.Q4B_KOMOREBI_KUKU_REVERSE)return Promise.reject(new Error("九九のうら読みを読み込めません"));
      if(!volume||volume.categories.indexOf(cat)<0)return Promise.reject(new Error("この小道では遊べません"));
      var generatorRandom=random||Math.random,questions,sessionId;
      try{
        questions=cat==="kom_kuku_ura"
          ?reverseEngine().buildUraSet(profile.lv[cat],generatorRandom)
          :reverseEngine().buildInverseSet(profile.lv[cat],generatorRandom);
        sessionId=cat+"_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      }catch(error){return Promise.reject(error);}
      return Promise.resolve(beginSession(cat,volume,questions,sessionId));
    };
  }

  function startFracFlowSession(volume,random){
    if(!profile||!global.Q4B_KOMOREBI_FRAC_FLOW)return Promise.reject(new Error("分数の解き方を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_frac_flow")<0)return Promise.reject(new Error("この小道では遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=fracEngine().buildSet(profile.lv.kom_frac_flow,generatorRandom);
      sessionId="frac_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_frac_flow",volume,questions,sessionId));
  }

  /* 生成器を 1 つ持つだけのカテゴリは同じ形で開始できる。cat ごとに関数を
     書き足すと、増えるたびに同じ 10 行が並ぶ。 */
  function startGeneratedSession(cat,globalName,errorMessage){
    return function(volume,random){
      var engine=global[globalName];
      if(!profile||!engine)return Promise.reject(new Error(errorMessage));
      if(!volume||volume.categories.indexOf(cat)<0)return Promise.reject(new Error("この小道では遊べません"));
      var generatorRandom=random||Math.random,questions,sessionId;
      try{
        questions=engine.buildSet(profile.lv[cat],generatorRandom);
        sessionId=cat+"_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      }catch(error){return Promise.reject(error);}
      return Promise.resolve(beginSession(cat,volume,questions,sessionId));
    };
  }

  /* 短ループ想起 (ratio_forms curriculum 7.4)。直前セットで使った台帳行を 1 つだけ
     持ち越し、次のセットで別の方向から出す。保存はしない (ページ滞在中のみ)。 */
  var ratioFormsCarry=null;

  function startRatioFormsSession(volume,random){
    if(!profile||!global.Q4B_KOMOREBI_RATIO_FORMS)return Promise.reject(new Error("割合の表現変換を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_ratio_forms")<0)return Promise.reject(new Error("この小道では遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=ratioFormsEngine().buildSet(profile.lv.kom_ratio_forms,generatorRandom,ratioFormsCarry);
      sessionId="kom_ratio_forms_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
      /* 変換問題 (台帳行 m を持つ) から 1 つを一様に選び、次セットの carry にする。 */
      var rows=questions.filter(function(question){return question.m!=null&&question.pattern;});
      if(rows.length){
        var picked=rows[Math.floor(randomValue(generatorRandom)*rows.length)];
        ratioFormsCarry={m:picked.m,pattern:picked.pattern};
      }else ratioFormsCarry=null;
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_ratio_forms",volume,questions,sessionId));
  }

  /* 図化はセッション 1 回だけ createSession し、セット生成はデッキを共有する
     generateSet で行う (肢位置・誤図型の抽選箱を問題ごとに作り直さない)。 */
  function startDiagramModelSession(volume,random){
    if(!profile||!global.Q4B_KOMOREBI_DIAGRAM_MODEL||!global.Q4B_KOMOREBI_DIAGRAM_ENGINE)return Promise.reject(new Error("数量関係の図化を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_diagram_model")<0)return Promise.reject(new Error("この小道では遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId,diagramSession;
    try{
      diagramSession=diagramEngine().createSession(generatorRandom);
      questions=diagramEngine().generateSet(diagramSession,profile.lv.kom_diagram_model);
      sessionId="kom_diagram_model_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    var begun=beginSession("kom_diagram_model",volume,questions,sessionId);
    begun.diagramSession=diagramSession;
    return Promise.resolve(begun);
  }

  function startUnitConvertSession(volume,random){
    if(!profile||!global.Q4B_KOMOREBI_UNIT_CONVERT)return Promise.reject(new Error("単位換算を読み込めません"));
    if(!volume||volume.categories.indexOf("kom_unit_convert")<0)return Promise.reject(new Error("この小道では単位換算を遊べません"));
    var generatorRandom=random||Math.random,questions,sessionId;
    try{
      questions=unitEngine().buildSet(profile.lv.kom_unit_convert,generatorRandom);
      sessionId="unit_"+Date.now()+"_"+Math.floor(randomValue(generatorRandom)*1000000);
    }catch(error){return Promise.reject(error);}
    return Promise.resolve(beginSession("kom_unit_convert",volume,questions,sessionId));
  }

  /* 段暗唱は CATEGORIES に 1 行足すだけで dan3 以降が動く。開始関数もここで
     機械的に作るので、段ごとに分岐を書き足す場所は残さない。 */
  var SESSION_STARTERS={kom_ratio:startRatioSession,kom_kuku_run:startKukuRunSession,
    kom_pi314:startPi314Session,kom_unit_convert:startUnitConvertSession,kom_frac_flow:startFracFlowSession,
    kom_kuku_ura:startKukuReverseSession("kom_kuku_ura"),
    kom_kuku_inverse:startKukuReverseSession("kom_kuku_inverse"),
    kom_kuku_bridge:startGeneratedSession("kom_kuku_bridge","Q4B_KOMOREBI_KUKU_BRIDGE","九九の外へを読み込めません"),
    kom_equation_select:startGeneratedSession("kom_equation_select","Q4B_KOMOREBI_EQUATION_SELECT","文章題の式えらびを読み込めません"),
    kom_kisokusei:startGeneratedSession("kom_kisokusei","Q4B_KOMOREBI_KISOKUSEI","きまりと数えかたを読み込めません"),
    kom_hayasa:startGeneratedSession("kom_hayasa","Q4B_KOMOREBI_HAYASA","速さを読み込めません"),
    kom_ratio_forms:startRatioFormsSession,
    kom_johou_seiri:startGeneratedSession("kom_johou_seiri","Q4B_KOMOREBI_JOHOU_SEIRI","情報整理を読み込めません"),
    kom_seisu:startGeneratedSession("kom_seisu","Q4B_KOMOREBI_SEISU","整数の性質を読み込めません"),
    kom_diagram_model:startDiagramModelSession};
  Object.keys(CATEGORIES).forEach(function(cat){
    if(danOfCategory(cat))SESSION_STARTERS[cat]=startKukuDanSession(cat);
  });

  function categoryButtonsHtml(volume,badge){
    var buttons="";
    /* 未公開の更新に属するカテゴリは選択肢そのものを出さない。volume manifest が
       先に挙げていても、公開は CURRENT_RELEASE 1 か所で決める。 */
    volume.categories.filter(isReleased).filter(function(cat){return CATEGORIES[cat].course===profileType;}).forEach(function(cat){
      /* かつて音声カテゴリはマイクが無いと塞いでいた (design 7.4) が、タップ暗唱が
         代替入力になったので、段暗唱はどの端末でも始められる。 */
      var blocked=SESSION_STARTERS[cat]?"":"準備中";
      /* badge はこのボタンで正答したときに増える図鑑の巻番号。どのボタンが
         どの図鑑を増やすかを、始める前に見えるようにする (volume_zukan_design 3.1)。 */
      var badgeHtml=badge?'<span class="path-badge" aria-label="'+attrText("遠征 "+badge)+'">'+badge+'</span>':"";
      if(!blocked)buttons+='<button type="button" class="path-choice" data-cat="'+cat+'" data-volume-id="'+escapeHtml(volume.id)+'"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span>'+badgeHtml+'<span class="path-choice-note">'+displayText("Lv "+profile.lv[cat])+'</span></button>';
      else buttons+='<button type="button" class="path-choice" disabled aria-disabled="true"><span class="path-choice-name">'+displayText(CATEGORIES[cat].name)+'</span>'+badgeHtml+'<span class="path-choice-note">'+displayText(blocked)+'</span></button>';
      /* リセット周回の入口は そのカテゴリのすぐ下に出す。地図の別の場所に置くと、
         どの小道を戻すのかが押す瞬間に見えない。 */
      buttons+=resetChoiceHtml(cat);
    });
    return buttons;
  }

  /* --- リセット周回 (tools_design 5 章) --------------------------------------
     Lv10 クリアから 7 日のロックが明けたカテゴリに、Lv1 へ戻すボタンが出る。
     選ぶのは本人で、戻るのは Lv の進行だけ。図鑑・捕獲済み・奉納記録・到達 Lv には
     触れない (不変条件 6)。メダル経済が閉じている間は出さない: 戻して得られるのが
     メダルだけなので、経済の外では損しかしない。 */

  function trophiesModuleOrNull(){return global.Q4B_KOMOREBI_TROPHIES||null;}

  function resetReady(cat){
    var trophyMod=trophiesModuleOrNull();
    if(!uroAvailable()||!trophyMod||!profile)return false;
    if(!hasOwn(CATEGORIES,cat)||CATEGORIES[cat].course!==profileType)return false;
    return trophyMod.canReset(profile,cat,Date.now());
  }

  function resetChoiceHtml(cat){
    if(!resetReady(cat))return "";
    return '<button type="button" class="path-reset" data-reset-cat="'+escapeHtml(cat)+'">'
      +'🔁 <span class="path-reset-name">'+displayText(CATEGORIES[cat].name+"を Lv1 から もういちど")+'</span>'
      +'<span class="path-reset-note">'+displayText("メダル 2まい")+'</span></button>';
  }

  /* 確認は 1 枚。文面は仕様どおりで、失うものが無いことも同じ画面で言う
     (「リセット」という語だけを見せると、集めた虫が消えると読める)。 */
  function showResetConfirm(cat,onYes){
    if(!global.document)return;
    var overlay=document.createElement("div");
    overlay.className="kom-modal";
    overlay.id="komResetModal";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +'<div class="kom-reset-ask"><p class="kom-reset-title">'+displayText("Lv1 に リセットしますか?")+'</p>'
      +'<p class="kom-reset-prize">'+displayText("リセットして もういちど Lv10 に なったら、メダルが 2まい!")+'</p>'
      +'<p class="kom-reset-keep">'+displayText("ずかんも つかまえた虫も ほうのうの きろくも そのままだよ")+'</p></div>'
      +'<button type="button" class="kom-reset-go" data-action="reset-yes">'+displayText("リセットする")+'</button>'
      +'<button type="button" class="kom-modal-close">'+displayText("やめる")+'</button></div>';
    overlay.addEventListener("click",function(event){
      var target=event.target;
      if(target===overlay||target.className==="kom-modal-close"){closeModal(overlay);return;}
      var action=target.getAttribute?target.getAttribute("data-action"):null;
      if(action!=="reset-yes"&&target.closest){
        var host=target.closest('[data-action="reset-yes"]');
        if(host)action="reset-yes";
      }
      if(action!=="reset-yes")return;
      closeModal(overlay);
      onYes();
    });
    document.body.appendChild(overlay);
    var close=overlay.querySelector(".kom-modal-close");
    if(close)close.focus();
  }

  /* 実行。周回番号と安定判定の窓は trophies 側、Lv と昇降バッファはこちら側で、
     まとめて 1 回の保存に載せる。保存に失敗したら丸ごと巻き戻す。 */
  function resetCategoryLap(cat,onDone){
    var trophyMod=trophiesModuleOrNull();
    if(!resetReady(cat)||!trophyMod){if(onDone)onDone(false);return;}
    var before=JSON.parse(JSON.stringify(profile));
    var lap=trophyMod.beginNextLap(profile,cat);
    if(!lap){if(onDone)onDone(false);return;}
    profile.lv[cat]=1;
    /* 昇降は adapt の 10 問窓で決まる。空にしないと、前の周の当たりを持ったまま
       Lv1 が始まって 1 問目で上がってしまう。 */
    profile.adapt[cat]={n:0,recent:[]};
    var saved;
    try{saved=saveProfile();}catch(error){saved=Promise.reject(error);}
    saved.then(function(){if(onDone)onDone(true);}).catch(function(){
      profile=before;
      global.alert("ほぞんに しっぱいしました。Lv は そのままだよ");
      if(onDone)onDone(false);
    });
  }

  function pathPanelHtml(region){
    var collection=viewCollection(),volumes=region.volumes.filter(function(volume){return volume.placeholder!==true;}),multi=volumes.length>1,sections="",progressParts=[];
    volumes.forEach(function(volume){
      var numeral=romanNumeral(volumeExpedition(volume)),buttons=categoryButtonsHtml(volume,multi?numeral:"");
      if(!buttons)return;
      /* 巻が複数のときだけ見出しと badge を出す。1 巻の地域に「遠征 Ⅰ」を
         書いても情報がない。 */
      if(multi)sections+='<h3 class="path-exp-head">'+displayText("遠征 "+numeral)+'</h3>';
      sections+='<div class="path-choices" aria-label="'+attrText("あるく小道を えらぼう")+'">'+buttons+'</div>';
      var progress=volumeProgress(volume,collection);
      progressParts.push((multi?numeral+" ":"")+progress.caught+"／"+progress.denominator+(progress.complete?" ✓":""));
    });
    /* 地域の形は世界地図の実寸では読めない (コスタリカは幅 11、豪は 137)。
       形はここで単独に大きく描き、地図は位置を示す役に徹する。 */
    var box=worldMap.regionBoxes&&worldMap.regionBoxes[region.regionId];
    var shape=box?'<svg class="path-shape" viewBox="'+box.join(" ")+'" role="img" aria-label="'+attrText(region.regionName+"の形")+'"><path d="'+escapeHtml(worldMap.regions[region.regionId])+'"></path></svg>':"";
    return '<div class="path-place">'+shape+'<div class="path-place-text"><h2>'+displayText(region.regionName+"の小道")+'</h2><p>'+displayText(region.blurb)+'</p></div></div>'
      +sections
      +'<div class="path-foot"><button type="button" class="path-zukan" data-action="zukan">📖 '+displayText(region.regionName+"の ずかん")+'</button>'
      +'<span class="path-progress">'+displayText("あつめた虫")+'　<strong>'+progressParts.join("　")+'</strong></span>'
      +'<span class="path-amber" aria-label="'+attrText("こはく "+amberBalance()+"こ")+'">🔶'+amberBalance()+'</span></div>';
  }

  function bindPathPanel(region){
    document.querySelector('#pathPanel [data-action="zukan"]').addEventListener("click",function(){renderZukan(region.regionId);});
    Array.prototype.forEach.call(document.querySelectorAll("#pathPanel [data-reset-cat]"),function(button){
      button.addEventListener("click",function(){
        var cat=button.getAttribute("data-reset-cat");
        showResetConfirm(cat,function(){
          button.disabled=true;
          resetCategoryLap(cat,function(){renderMap(region.regionId);});
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#pathPanel [data-cat]"),function(button){
      var cat=button.getAttribute("data-cat"),start=SESSION_STARTERS[cat];
      /* 捕獲プールはボタンが属する巻。badge が示す対応をここが実行する。 */
      var volume=volumeById(button.getAttribute("data-volume-id"));
      if(!start)return;
      button.addEventListener("click",function(){
        button.disabled=true;
        start(volume,Math.random).catch(function(){
          button.disabled=false;
          var panel=document.getElementById("pathPanel");
          if(panel&&!panel.querySelector(".ratio-start-error"))panel.insertAdjacentHTML("afterbegin",'<p class="ratio-start-error" role="alert">'+displayText(CATEGORIES[cat].name+"を始められませんでした。もう一度試してください。")+'</p>');
        });
      });
    });
  }

  function selectRegion(region){
    if(region.placeholder)return;
    var panel=document.getElementById("pathPanel");
    if(!panel)return;
    panel.innerHTML=pathPanelHtml(region);
    bindPathPanel(region);
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      pin.classList.toggle("pin-selected",pin.getAttribute("data-region-id")===region.regionId);
    });
    var leader=document.querySelector(".map-leader"),point=worldMap.pins[region.regionId],box=mapViewBox(worldMap);
    if(leader&&point){
      leader.style.left=((point.x-box[0])/box[2]*100).toFixed(3)+"%";
      leader.style.top=((point.y-box[1])/box[3]*100).toFixed(3)+"%";
    }
  }

  function showRegionBlurb(volume){
    var blurb=document.getElementById("regionBlurb");
    if(blurb)blurb.innerHTML='<strong>'+displayText(volume.regionName)+'</strong><span>'+displayText(volume.blurb)+'</span>';
  }

  /* --- メダル (経済公開前はトロフィー) ---------------------------------------
     入口は地図の下端に置き、専用ページへ送る (ui_design 6 章)。最初の数週間は
     獲得ゼロなので、空の棚をトップに常時置くと虚しく場所も食う。
     保存キー (trophies / trophyProgress) は互換のため据え置き、変えるのは表示だけ。
     その表示も MEDAL_ECONOMY_ON に連動させ、語彙の切り替えを経済の公開日に揃える
     (tools_design 3 章)。 */

  function trophyModule(){
    var module=global.Q4B_KOMOREBI_TROPHIES;
    if(!module)throw new Error("トロフィーデータを読み込めません");
    return module;
  }

  /* 画面 (メダルの棚) と奉納 (うろ) が見る一覧。
     まだ取っていない枠は公開済み・同コースのぶんだけ出す。取りようのない枠を
     並べると、目標ボードが「いつまでも埋まらない棚」に見えてしまう。
     獲得済みの記録はこの絞り込みの外に置く。鋳造 (trophies.js の award) には
     公開ゲートもコースゲートも無いので、表示側だけで絞り込むと「鋳造は済んで
     いるのに、交換ポップアップにも棚にも うろにも出てこないメダル」が生まれる。
     mintedLaps は鋳造の瞬間に焼かれて戻らないため、そのメダルは二度と受け取れない
     (= Lv10 をクリアしたのに何も起きない)。獲得の記録は不滅 (tools_design 2 章)
     を表示側でも守る。コースが食い違う経路は実在する: けいさんでコースを選ぶ前や、
     別端末でけいさんの保存がまだ降りていない間は boot の
     QuestSave.load("keisan") が null を返し、profileType が k10 へ倒れる。 */
  function medalTrophies(){
    var earned=profile&&isObject(profile.trophies)?profile.trophies:{};
    return trophyModule().list().filter(function(trophy){
      if(earned[trophy.trophyId])return true;
      return isReleased(trophy.cat)&&CATEGORIES[trophy.cat].course===profileType;
    });
  }

  /* 表示語彙はメダル経済のスイッチに連動させる。off の間は従来のトロフィー表記の
     ままにして、「メダル」の初出を うろと道具の公開と同じ日に揃える。 */
  function medalWording(){return medalEconomyOn();}

  function trophyEntranceHtml(){
    var all=medalTrophies(),earned=all.filter(function(trophy){return profile.trophies[trophy.trophyId];}).length;
    var label=medalWording()?'🏅 <span>'+displayText("メダル")+'</span>':'🏆 <span>'+displayText("トロフィー")+'</span>';
    return '<div class="kom-trophy-entrance"><button type="button" class="kom-trophy-open" data-action="trophies">'
      +label+' <strong>'+earned+'／'+all.length+'</strong></button></div>';
  }

  function trophySlotHtml(trophy){
    var record=profile.trophies[trophy.trophyId],reward=global.Q4BReward;
    var sp=reward&&reward.spById?reward.spById(trophy.speciesId):null;
    var name=sp?sp.jaName:trophy.speciesId;
    if(!record){
      /* 未獲得の枠も並べる。空のページを「何もない部屋」ではなく目標ボードにし、
         条件が Lv10 到達ではなくクリアであることを初めて見える形にする。 */
      return '<li class="kom-trophy-slot is-locked"><div class="kom-trophy-art">🔒</div>'
        +'<p class="kom-trophy-name">'+displayText("？？？")+'</p>'
        +'<p class="kom-trophy-cond">'+displayText(CATEGORIES[trophy.cat].name+"を Lv10 クリア")+'</p></li>';
    }
    var art=(sp&&reward.svg)?reward.svg(trophyModule().goldSpecies(sp),false):"";
    return '<li class="kom-trophy-slot is-earned"><div class="kom-trophy-art">'+art+'</div>'
      +'<p class="kom-trophy-name">'+displayText(trophyModule().displayName(trophy,name))+'</p>'
      +'<p class="kom-trophy-cond">'+displayText(record.at+" かくとく")+'</p></li>';
  }

  function renderTrophies(volumeId){
    hideZukanModeToggle();
    var all=medalTrophies(),earned=all.filter(function(trophy){return profile.trophies[trophy.trophyId];}).length;
    document.getElementById("app").innerHTML='<main class="kom-page kom-trophy-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText("小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText(medalWording()?"きんいろメダル":"きんいろトロフィー")+'</h1>'
      +'<p>'+displayText("カテゴリを Lv10 クリアすると もらえる")+'　<strong>'+earned+'／'+all.length+'</strong></p></div>'
      +'<ul class="kom-trophy-grid">'+all.map(trophySlotHtml).join("")+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(volumeId);});
  }

  /* --- かがやきのうろ --------------------------------------------------------
     メダルの着地点 (tools_design 4 章)。入口は地図の下端に置き、かせきそうびと同じ
     「一角のボタンから専用ページへ」の配置パターンを踏襲する。新しい画面遷移文法は
     作らない。道具が 1 つも公開されていない間は入口ごと出さない。 */

  function uroModule(){return global.Q4B_KOMOREBI_URO||null;}

  function uroAvailable(){return !!uroModule()&&!!toolsModule()&&toolsReleased()&&!demoMode;}

  function medalSpeciesName(speciesId){
    var reward=global.Q4BReward,sp=reward&&reward.spById?reward.spById(speciesId):null;
    return sp?speciesName(sp):speciesId;
  }

  /* 獲得済みメダルを鋳造順に並べる。順序は奉納の対応づけ (uro.pending) の基準に
     なるので、日付が同じ場合は trophies.js の宣言順で安定させる。
     1 カテゴリ 1 枚ではない: 1 周目は 1 枚、2 周目以降は 1 周につき 2 枚なので、
     周回した cat はその枚数ぶん並ぶ (捧げ待ちが 2 枚出るのはこのため)。 */
  function earnedMedals(){
    var trophyMod=trophyModule(),medals=[];
    medalTrophies().forEach(function(trophy){
      var record=profile.trophies[trophy.trophyId];
      if(!record)return;
      var speciesId=record.speciesId||trophy.speciesId,name=medalSpeciesName(speciesId)+"のメダル";
      var laps=trophyMod.mintedLaps(profile,trophy.cat),lap,i,count;
      for(lap=1;lap<=laps;lap++){
        count=trophyMod.medalsForLap(lap);
        for(i=0;i<count;i++){
          medals.push({trophyId:trophy.trophyId,cat:trophy.cat,speciesId:speciesId,
            at:record.at,lap:lap,name:name});
        }
      }
    });
    return medals.sort(function(a,b){return a.at<b.at?-1:a.at>b.at?1:a.lap-b.lap;});
  }

  function pendingMedals(){
    var uro=uroModule();
    return uro?uro.pending(profile,earnedMedals()):[];
  }

  /* 交換画面に出す道具。公開済みのものだけを並べ、いまの遠征に対象種が 1 種も
     いない道具はグレーアウトする (design 6 章)。 */
  function toolChoices(){
    var volume=currentToolVolume(),tools=toolsModule();
    return releasedTools().map(function(tool){
      var targets=volume&&tools?volume.species.filter(function(species){
        return tools.matches(tool.id,global.Q4BReward&&global.Q4BReward.spById?global.Q4BReward.spById(species.id):null);
      }).length:null;
      return {id:tool.id,name:toolName(tool),emoji:tool.emoji,guild:tool.guild,blurb:tool.blurb,targets:targets};
    });
  }

  function currentToolVolume(){
    var regions=regionList().filter(function(region){return !region.placeholder;});
    if(!regions.length)return null;
    var current=regions.filter(function(region){return region.current;})[0]||regions[0];
    return amberCallVolume(current);
  }

  function uroEntranceHtml(){
    if(!uroAvailable())return "";
    var uro=uroModule();
    return uro.entranceHtml({text:displayText,glow:uro.glow(profile),pending:pendingMedals().length});
  }

  /* 奉納の実行。メダル 1 枚 = 道具 1 つの固定相場で、残高という状態は作らない。
     奉納の記録 (uroLog) は profile に、道具の授与は共有 kv (toolgear) に書く。
     道具は uroLog の保存が通ってから授ける: 先に kv へ授けて profile の保存が
     落ちると、メダルは残るのに道具だけ増える (残高ゼロの原則が破れる)。逆順なら
     失敗時はメダルが残るだけで、押し直せば済む。 */
  function offerMedal(medal,toolId,onDone){
    var uro=uroModule(),tools=toolsModule();
    /* toolgear API の無い古い storage.js では授与先が無い。メダルを消費してから
       道具を取りこぼすくらいなら、奉納そのものを始めない。 */
    if(!uro||!tools||!gearStore()){
      /* 失敗でも約束は返す。黙って返ると交換モーダルが残り 2 枚交換も止まる。 */
      if(onDone)onDone(null,false);
      return;
    }
    var before=JSON.parse(JSON.stringify(profile)),today=todayString();
    var entry=uro.redeem(profile,earnedMedals(),medal,toolId,today);
    if(!entry){if(onDone)onDone(null);return;}
    var saved;
    try{saved=saveProfile();}catch(error){saved=Promise.reject(error);}
    saved.then(function(){
      var firstOfKind=false;
      Promise.resolve().then(function(){
        var gear=loadToolGear();
        /* 道具図鑑の初回授与かどうかは、授与の前にしか分からない。 */
        firstOfKind=!tools.firstGrantAt(gear,toolId);
        tools.grant(gear,toolId,today);
        /* 授与はその場で共有 kv へ (profile の保存とは独立)。 */
        if(!storeToolGear(gear))throw new Error("道具を保存できません");
        return true;
      }).catch(function(){
        /* 奉納ログだけが先に保存済みなので、授与失敗時は追加前へ戻して保存し直す。 */
        profile=before;
        var restored;
        try{restored=saveProfile();}catch(error){restored=Promise.reject(error);}
        return Promise.resolve(restored).catch(function(){}).then(function(){
          global.alert("もういちど ささげてね");
          return false;
        });
      }).then(function(granted){
        /* 失敗でも約束は返す (showMedalExchange の契約)。黙って返ると交換モーダルが
           開いたまま残り、2 周目の 2 枚交換も止まる。 */
        if(granted){if(onDone)onDone(entry,firstOfKind);}
        else if(onDone)onDone(null,false);
      });
    },function(){
      profile=before;
      global.alert("ほぞんに しっぱいしました。メダルは そのままだよ");
      if(onDone)onDone(null,false);
    });
  }

  function closeModal(overlay){
    if(overlay&&overlay.parentNode)overlay.parentNode.removeChild(overlay);
  }

  /* 鋳造成立の瞬間に出す即時交換ポップアップ。こはくの捕獲カードと同じモーダルの
     形を使う (捕獲以外の知らせを別の見た目で出さない)。 */
  function showMedalExchange(medal,onDone,run){
    var uro=uroModule();
    /* 出せない場面でも約束は返す。黙って返ると 2 枚交換の続きが止まったままになる。 */
    if(!uro||!global.document){if(onDone)onDone(null);return;}
    var choices=toolChoices();
    var overlay=document.createElement("div");
    overlay.className="kom-modal";
    overlay.id="komMedalModal";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +uro.exchangeHtml({text:displayText,medalName:medal.name,tools:choices,
        index:run&&run.index,total:run&&run.total})
      +'<button type="button" class="kom-modal-close">'+displayText("あとにする")+'</button></div>';
    overlay.addEventListener("click",function(event){
      var target=event.target;
      if(target===overlay||target.className==="kom-modal-close"){closeModal(overlay);if(onDone)onDone(null);return;}
      /* 実 DOM ではボタンの中の span が target になる。data-tool を持つ親まで辿る。 */
      var toolId=target.getAttribute?target.getAttribute("data-tool"):null;
      if(!toolId&&target.closest){
        var host=target.closest("[data-tool]");
        if(host)toolId=host.getAttribute("data-tool");
      }
      if(!toolId)return;
      offerMedal(medal,toolId,function(entry,firstOfKind){
        closeModal(overlay);
        if(entry)showToolGrantedModal(toolId,firstOfKind);
        if(onDone)onDone(entry);
      });
    });
    document.body.appendChild(overlay);
    var close=overlay.querySelector(".kom-modal-close");
    if(close)close.focus();
  }

  /* さずかった の知らせは 1 枚だけ立てる。2 周目の 2 枚交換では交換 → 授与 →
     交換 → 授与 と続くので、前の 1 枚を残すと最後に閉じるボタンが 2 つ重なる。 */
  var grantedOverlay=null;

  function showToolGrantedModal(toolId,firstOfKind){
    var tools=toolsModule(),tool=tools&&tools.byId(toolId),uro=uroModule();
    if(!tool||!global.document)return;
    closeModal(grantedOverlay);
    var overlay=document.createElement("div");
    grantedOverlay=overlay;
    overlay.className="kom-modal";
    overlay.id="komToolModal";
    /* 初めての 1 本だけ、道具図鑑に載ったことを添える (2 本目からは言わない)。 */
    var dex=firstOfKind?'<p class="uro-granted-dex">'+displayText("はじめての どうぐ! どうぐ ずかんに のこったよ")+'</p>':"";
    /* 奉納の小演出 (tools_design 9 章)。「うろが すこし あかるくなった」と書くだけ
       では、明るくなった うろを見るのに もう 1 画面ぶん歩かせることになる。捧げた
       直後の輝きをその場で 1 枚出し、ひらく動きだけを添える。輝きの値は捧げたあとの
       奉納ログから出るので、演出のためだけの数を持たない。 */
    var hollow=uro&&typeof uro.hollowHtml==="function"?uro.hollowHtml(uro.glow(profile),"is-blooming"):"";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +'<div class="uro-granted'+(firstOfKind?" is-first":"")+'">'
      +hollow
      +'<p class="uro-granted-face">'+toolFaceHtml(tool)+'</p>'
      +'<p class="uro-granted-name">'+displayText(toolName(tool)+"を さずかった!")+'</p>'
      +dex
      +'<p class="uro-granted-note">'+displayText("うろが すこし あかるくなった")+'</p>'
      +'<p class="uro-granted-hint">'+displayText("見たことない虫に であいやすくなりそうだ…!")+'</p></div>'
      +'<button type="button" class="kom-modal-close">'+displayText("とじる")+'</button></div>';
    overlay.addEventListener("click",function(event){
      if(event.target!==overlay&&event.target.className!=="kom-modal-close")return;
      closeModal(overlay);
      if(grantedOverlay===overlay)grantedOverlay=null;
    });
    document.body.appendChild(overlay);
  }

  /* 捧げ待ちのメダルを 1 枚ずつ交換にかける。cat を渡すとそのカテゴリぶんだけ、
     渡さなければ全部。2 周目以降は 1 度の鋳造で 2 枚なので、1 枚選び終えたら残りぶんを
     そのまま続けて出す (道具を 2 つ選ぶ = ポップアップ 2 回)。
     「あとにする」で閉じたときは追わない。残りは うろの捧げ待ちに並ぶ。
     既に捧げ済みなら 1 枚も出さない。保存の再送などで二度呼ばれてもポップアップが
     重ならないようにする。 */
  function offerMedalQueue(cat,onDone){
    if(!uroAvailable()||!global.document){if(onDone)onDone();return;}
    function waiting(){
      return pendingMedals().filter(function(medal){return !cat||medal.cat===cat;});
    }
    var total=waiting().length;
    if(!total){if(onDone)onDone();return;}
    function step(index){
      var left=waiting();
      if(!left.length){if(onDone)onDone();return;}
      showMedalExchange(left[0],function(entry){
        if(entry)step(index+1);
        else if(onDone)onDone();
      },{index:index,total:total});
    }
    step(1);
  }

  /* 鋳造の瞬間に出す交換。 */
  function offerMintedMedal(trophy,onDone){offerMedalQueue(trophy.cat,onDone);}

  function uroPageOptions(){
    var uro=uroModule(),tools=toolsModule(),seen={};
    /* どうぐばこ・装備・道具図鑑は共有 kv (toolgear) を読む。奉納の記録 (uroLog) は
       小道の物語なので profile のまま。 */
    var gear=loadToolGear()||{tools:[],equippedToolId:null,toolDex:{}};
    var owned=gear.tools.map(function(instance){
      var tool=tools.byId(instance.type),first=!seen[instance.type];
      seen[instance.type]=true;
      return {type:instance.type,remaining:instance.remaining,first:first,
        name:tool?toolName(tool):instance.type,emoji:tool?tool.emoji:"🔧"};
    });
    var log=uro.entries(profile).map(function(entry){
      var tool=tools.byId(entry.tool),category=CATEGORIES[entry.cat];
      return {cat:entry.cat,lap:entry.lap,date:entry.date,
        name:medalSpeciesName(entry.speciesId)+"のメダル",
        catName:category?category.name:entry.cat,toolId:entry.tool,
        toolName:tool?toolName(tool):entry.tool,toolEmoji:tool?tool.emoji:"🔧"};
    });
    /* 道具図鑑は 11 種ぶんの枠を常に並べる。未公開のぶんは名前を伏せて 🔒 だけ出す
       (何を集めるかは伏せたまま、いくつ集めるかは見せる)。 */
    var release=currentRelease();
    var dex=tools.list().map(function(tool){
      if(tool.release>release)return {locked:true};
      return {id:tool.id,name:toolName(tool),emoji:tool.emoji,at:tools.firstGrantAt(gear,tool.id)};
    });
    /* 装備の見え方は こはくの画面と同じ判定にそろえる。未公開の道具を装備したままの
       セーブで、片方の画面が「そうび中」もう片方が「なし」になるのを避ける。 */
    var equipped=equippedToolOf(gear);
    return {text:displayText,glow:uro.glow(profile),pending:pendingMedals(),owned:owned,
      equippedToolId:equipped?gear.equippedToolId:null,durability:tools.durability,entries:log,dex:dex};
  }

  function renderUro(backId){
    hideZukanModeToggle();
    var uro=uroModule();
    document.getElementById("app").innerHTML='<main class="kom-page kom-uro-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText("小道")+'</button></header>'
      +uro.pageHtml(uroPageOptions())+'</main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(backId);});
    Array.prototype.forEach.call(document.querySelectorAll(".uro-offer"),function(button){
      button.addEventListener("click",function(){
        var cat=button.getAttribute("data-cat");
        var medal=pendingMedals().filter(function(item){return item.cat===cat;})[0];
        if(!medal)return;
        showMedalExchange(medal,function(){renderUro(backId);});
      });
    });
    /* 装備切替は共有 kv だけを動かす。gear の変更が起きたその場で toolGearSet で
       永続するので、profile の保存 (saveProfile) は要らない。 */
    Array.prototype.forEach.call(document.querySelectorAll(".uro-equip"),function(button){
      button.addEventListener("click",function(){
        var tools=toolsModule(),gear=loadToolGear();
        if(!tools||!gear||!tools.equip(gear,button.getAttribute("data-tool")))return;
        storeToolGear(gear);
        renderUro(backId);
      });
    });
    var unequip=document.querySelector('[data-action="uro-unequip"]');
    if(unequip)unequip.addEventListener("click",function(){
      var gear=loadToolGear();
      if(!toolsModule()||!gear)return;
      toolsModule().equip(gear,null);
      storeToolGear(gear);
      renderUro(backId);
    });
  }

  function renderMap(selectedId){
    /* ずかん以外の画面では切替ボタンを出さない。セッション終了の着地点でもあるので、
       body のセッション属性の解除もここで行う (keisan showHome と同じ役割)。 */
    hideZukanModeToggle();
    if(global.Q4BRender&&global.Q4BRender.setSessionActive)global.Q4BRender.setSessionActive(false);
    var volumes=expeditionVolumes(),regions=regionList();
    validateMapPayload(worldMap,volumes);
    /* selectedId は volume id でも region id でも受ける (セッションからの戻りは
       volume id で来る)。未知の id でも落とさず現在の地域へ寄せる。 */
    var wantedRegion=null;
    regions.forEach(function(region){
      if(!region.placeholder&&region.regionId===selectedId)wantedRegion=region;
      region.volumes.forEach(function(volume){if(!region.placeholder&&volume.id===selectedId)wantedRegion=region;});
    });
    var currentRegion=regions.filter(function(region){return region.current;})[0]||regions[0];
    var selected=wantedRegion||currentRegion;
    /* 1 画面構成: 表題 / 地図 (どこ) / 引き出し線 / 小道の一覧 (主役)。
       地図はカテゴリを選ぶための文脈であって、地域選択を挟む関門にはしない。 */
    document.getElementById("app").innerHTML='<main class="kom-page kom-map-page"><header class="kom-top"><a class="kom-back" href="../keisan/index.html">← けいさん</a></header>'
      +'<div class="kom-title"><h1>'+displayText("木漏れ日の小道")+'</h1><p>'+displayText("あるく小道を えらぼう")+'</p></div>'
      +'<section class="map-panel" aria-label="'+attrText("世界の地図")+'">'+mapArtworkHtml(regions,currentRegion.regionId,selected.regionId)+'</section>'
      +'<section class="path-panel" id="pathPanel" aria-live="polite">'+pathPanelHtml(selected)+'</section>'
      +pathZukanEntranceHtml()
      +trophyEntranceHtml()
      +uroEntranceHtml()+'</main>';
    bindPathPanel(selected);
    document.querySelector('[data-action="trophies"]').addEventListener("click",function(){renderTrophies(selected.regionId);});
    document.querySelector('[data-action="path-zukan"]').addEventListener("click",function(){renderCommonZukan(selected.regionId);});
    var uroEntrance=document.querySelector('[data-action="uro"]');
    if(uroEntrance)uroEntrance.addEventListener("click",function(){renderUro(selected.regionId);});
    Array.prototype.forEach.call(document.querySelectorAll(".map-pin"),function(pin){
      var region=regionById(pin.getAttribute("data-region-id"));
      if(region.placeholder)return;
      pin.addEventListener("click",function(){selectRegion(region);});
      pin.addEventListener("focus",function(){selectRegion(region);});
    });
    /* 取りこぼした捧げ待ちをここで回収する。鋳造の瞬間の交換ポップアップは 2 つの
       ぶんを取りこぼす: メダル経済が閉じている間に成立したメダル (交換の入口ごと
       無かったので、黙って捧げ待ちに積まれる) と、うろへ辿り着かなかった子。
       どちらも本人からは「Lv10 をクリアしたのに何も起こらない」に見える。
       出すのはページの読み込みごとに 1 度きり。地図はセッションの戻り先でもあるので、
       毎回出すと「あとにする」を選んでも小道へ入るたびに再び塞がれる。 */
    if(!pendingMedalsSwept){
      pendingMedalsSwept=true;
      offerMedalQueue(null);
    }
    /* 捧げ待ちの回収が塞いでいる間は出さない (モーダルが 2 枚重なる)。地図は
       セッションの戻り先なので、次に地図へ戻ったときに出る。 */
    maybeShowInactiveToolNotice();
  }

  /* 図鑑の絞り込み。本編 keisan の zukanMatchK と同じ語彙 (レア度 tier / 分類キー /
     未捕獲を隠す / 検索 + 6 トグル: おきにいり / いろちがい / かえした / ×2 /
     たまご / ♂♀) を使うが、状態は小道側に持つ。本編の KZ_* は keisan の
     プロフィールに束縛されているため共有できない。 */
  var zukanFilter={rarity:"",group:"",caughtOnly:false,query:"",expedition:"",region:"",
    fav:false,shiny:false,reared:false,plural:false,egg:false,pair:false};
  /* data-value から直接 zukanFilter を書くため、鍵は許可済みトグルに限定する。 */
  var ZUKAN_FLAG_FILTERS={fav:true,shiny:true,reared:true,plural:true,egg:true,pair:true};

  function zukanGroupKey(sp){ return sp?(sp.familyJa||sp.orderJa||sp.groupJa||""):""; }

  function zukanMatches(sp,record,collection){
    var reward=global.Q4BReward;
    if(zukanFilter.rarity!==""&&sp&&String(reward.tierOf(sp))!==zukanFilter.rarity)return false;
    if(zukanFilter.group!==""&&zukanGroupKey(sp)!==zukanFilter.group)return false;
    if(zukanFilter.caughtOnly&&!record)return false;
    /* 6 トグルは本編 zukanMatchK (keisan/app.js) と同じ判定源。record は
       collection.catches[sp.id]、collection は表示中のずかんの捕獲記録全体。 */
    if(zukanFilter.fav&&!(sp&&reward.isFavorite&&reward.isFavorite(collection,sp.id)))return false;
    if(zukanFilter.shiny&&!(record&&record.shiny))return false;
    if(zukanFilter.reared&&!(sp&&reward.hasReared&&reward.hasReared(collection,sp.id)))return false;
    if(zukanFilter.plural&&!(record&&(record.n||0)>=2))return false;
    if(zukanFilter.egg&&!(sp&&reward.eggsForSpecies&&reward.eggsForSpecies(sp.id).total>0))return false;
    if(zukanFilter.pair&&!(sp&&reward.hasBothSexes&&reward.hasBothSexes(collection,sp.id)))return false;
    var q=zukanFilter.query.trim().toLowerCase();
    if(q&&sp){
      var hay=(sp.jaName+" "+(sp.scientificName||"")+" "+zukanGroupKey(sp)).toLowerCase();
      if(hay.indexOf(q)<0)return false;
    }
    return true;
  }

  function zukanFilterBarHtml(entries){
    var reward=global.Q4BReward,groups=[],seen={};
    entries.forEach(function(item){
      var key=zukanGroupKey(item.sp);
      if(key&&!seen[key]){seen[key]=1;groups.push(key);}
    });
    groups.sort(function(a,b){return a.localeCompare(b,"ja");});
    var tiers=[["","すべて"],["3","ウルトラレア"],["2","スーパーレア"],["1","レア"],["0","ノーマル"]].map(function(pair){
      return '<button type="button" class="zukan-chip'+(zukanFilter.rarity===pair[0]?" is-on":"")+'" data-filter="rarity" data-value="'+pair[0]+'">'+displayText(pair[1])+'</button>';
    }).join("");
    var groupOpts='<option value="">'+displayText("すべての なかま")+'</option>'+groups.map(function(key){
      return '<option value="'+escapeHtml(key)+'"'+(zukanFilter.group===key?" selected":"")+'>'+displayText(key)+'</option>';
    }).join("");
    /* 文言は本編 keisan showZukan の同機能ボタンと同一に保つ (子どもが両画面で
       同じ言葉に出会うため)。 */
    var flags=[["fav","♥ おきにいり"],["shiny","✨ いろちがい"],["reared","🐣 かえした"],
      ["plural","×2 いじょう"],["egg","🥚 たまごあり"],["pair","♂♀ そろい"]].map(function(pair){
      return '<button type="button" class="zukan-chip'+(zukanFilter[pair[0]]?" is-on":"")+'" data-filter="flag" data-value="'+pair[0]+'">'+displayText(pair[1])+'</button>';
    }).join("");
    return '<div class="zukan-filters"><div class="zukan-chips" role="group" aria-label="'+attrText("レア度でしぼる")+'">'+tiers+'</div>'
      +'<div class="zukan-chips" role="group" aria-label="'+attrText("じょうけんでしぼる")+'">'+flags+'</div>'
      +'<div class="zukan-controls"><select id="zukanGroup" aria-label="'+attrText("なかまでしぼる")+'">'+groupOpts+'</select>'
      +'<label class="zukan-toggle"><input type="checkbox" id="zukanCaught"'+(zukanFilter.caughtOnly?" checked":"")+'>'+displayText("つかまえたものだけ")+'</label>'
      +'<input type="search" id="zukanQuery" value="'+escapeHtml(zukanFilter.query)+'" placeholder="'+attrText("なまえでさがす")+'" aria-label="'+attrText("なまえでさがす")+'"></div></div>';
  }

  /* 小道の図鑑。本編とは別カウントで、その volume の種だけを並べる (ui_design 5 章)。
     捕獲済みは本編と同じ描画資産 (Q4BRender 経由の SVG)、未捕獲は ? 枠で残す。 */
  function zukanCardHtml(entry,record){
    var reward=global.Q4BReward,sp=reward&&reward.spById?reward.spById(entry.id):null;
    if(!record){
      return '<li class="zukan-card is-unknown"><div class="zukan-art"><span>？</span></div>'
        +'<div class="zukan-name">'+displayText("まだ つかまえていない")+'</div>'
        +'<div class="zukan-meta"><span class="zukan-tier r'+(sp?sp.r:0)+'">'+displayText(sp&&reward.TIERNAME?reward.TIERNAME[sp.r]:entry.rarity)+'</span></div></li>';
    }
    var art=(sp&&reward.svg)?reward.svg(sp,record.records&&record.records.some(function(r){return r.shiny;})):"";
    var size=Number.isFinite(record.max)?'<span>'+record.max+'mm</span>':"";
    return '<li class="zukan-card'+(entry.flagship?' is-flagship':'')+'" data-species-id="'+escapeHtml(entry.id)+'" tabindex="0" role="button"><div class="zukan-art r'+(sp?sp.r:0)+'">'+art+'</div>'
      +'<div class="zukan-name">'+displayText(sp?speciesName(sp):entry.id)+'</div>'
      +'<div class="zukan-meta"><span class="zukan-tier r'+(sp?sp.r:0)+'">'+displayText(sp&&reward.TIERNAME?reward.TIERNAME[sp.r]:entry.rarity)+'</span>'
      +size+'<span>'+displayText(record.n+"匹")+'</span></div>'
      +(entry.flagship?'<div class="zukan-flag">'+displayText("この遠征の 看板")+'</div>':"")+'</li>';
  }

  /* 地域の全巻の種を 1 冊に連結する。I/II/III は運用の単位であって、子どもに
     とっての意味単位は「マダガスカルの虫」。分冊感を出さない (volume_zukan_design 3.2)。 */
  function regionEntries(region,collection){
    var reward=global.Q4BReward,entries=[];
    region.volumes.filter(function(volume){return volume.placeholder!==true;}).forEach(function(volume){
      var numeral=romanNumeral(volumeExpedition(volume));
      volume.species.forEach(function(entry){
        entries.push({entry:entry,expedition:numeral,regionId:region.regionId,regionName:region.regionName,
          sp:reward&&reward.spById?reward.spById(entry.id):null,record:collection.catches[entry.id]});
      });
    });
    return entries;
  }

  /* 進捗は巻ごとの凍結分母を並べる。合計は添え物で、完成判定は巻ごと (決定 4)。 */
  function regionProgressHtml(region,collection){
    var volumes=region.volumes.filter(function(volume){return volume.placeholder!==true;}),multi=volumes.length>1,parts=[],caught=0,denominator=0;
    volumes.forEach(function(volume){
      var progress=volumeProgress(volume,collection);
      caught+=progress.caught;denominator+=progress.denominator;
      parts.push((multi?romanNumeral(volumeExpedition(volume))+" ":"")+progress.caught+"／"+progress.denominator+(progress.complete?" ✓":""));
    });
    if(multi)parts.push("合計 "+caught+"／"+denominator);
    return parts.join("　");
  }

  function expeditionChipsHtml(region){
    var volumes=region.volumes.filter(function(volume){return volume.placeholder!==true;});
    if(volumes.length<2)return "";
    var chips=[["","すべて"]].concat(volumes.map(function(volume){
      var numeral=romanNumeral(volumeExpedition(volume));
      return [numeral,"遠征 "+numeral];
    })).map(function(pair){
      return '<button type="button" class="zukan-chip'+(zukanFilter.expedition===pair[0]?" is-on":"")+'" data-filter="expedition" data-value="'+escapeHtml(pair[0])+'">'+displayText(pair[1])+'</button>';
    }).join("");
    return '<div class="zukan-chips" role="group" aria-label="'+attrText("遠征でしぼる")+'">'+chips+'</div>';
  }

  /* イラスト/しゃしん切替 (shared/zukan_render.js が Q4BRender に生やす共有トグル)。
     _q4bRerender にはフィルタ状態 (zukanFilter) を保った同画面の再描画関数を登録する
     (本編 keisan/app.js:993 と同じ運用)。ホストは見出しブロック: 小道は viewport
     右上を portal への固定 🏠 リンクが占有しており、画面全体を host にすると
     トグルが 🏠 の下に隠れる。 */
  function mountZukanModeToggle(rerender){
    if(!global.Q4BRender||!global.Q4BRender.setZukanModeToggleVisible)return;
    var host=document.querySelector(".zukan-page .kom-title");
    if(!host)return;
    host._q4bRerender=rerender;
    global.Q4BRender.setZukanModeToggleVisible(true,host);
  }

  function hideZukanModeToggle(){
    if(global.Q4BRender&&global.Q4BRender.setZukanModeToggleVisible)global.Q4BRender.setZukanModeToggleVisible(false);
  }

  /* --- ずかん画面の装備パネル (tools_design 7 章) ------------------------------
     旧インラインウィジェット (toolWidgetHtml / bindToolWidget) は削除し、本編と
     同じ共有部品 (shared/tools_ui.js の panelHtml / bindPanel) に置き換えた。
     表示規則は同じ: 現在の装備を常時表示、札を押すだけで切り替え、道具ゼロや
     経済が閉じている間はパネルごと出さない。demo モードは保存に触れない約束
     なので出さない。 */
  /* 小道ぜんたいの捕獲プール = 公開済みの巻ごとのプールの配列。パネルと知らせは
     こちらを見る: パネルは巻に属さない画面 (地域をまたぐ ずかん) にあるので、
     1 つの巻に対象がいないだけで「つかえない」と言うと、その道具が効く別の巻まで
     否定してしまう。和プール 1 本に割合の下限を当てるのも同じ穴で、対象の少ない
     巻を公開するたびに割合が薄まり、働いている巻ごと倒れる (更新 3 で灯火が
     4.8% に薄まった)。だから巻ごとの配列で渡し、判定は worksInAny (どれか 1 巻で
     働けばよい)。巻ごとの効きは equippedToolOf が volumeToolPool で別に見ている。 */
  function komorebiToolPools(){
    /* 巻データが読めない間 (boot 前・データ差し替え中) は null を返して判定ごと
       降ろす。ここで throw すると、道具の表示ひとつで地図とずかんが落ちる。 */
    try{
      var pools=[];
      expeditionVolumes().filter(isVolumeReleased).forEach(function(volume){
        var pool=volumeToolPool(volume);
        if(Array.isArray(pool)&&pool.length)pools.push(pool);
      });
      return pools.length?pools:null;
    }catch(error){return null;}
  }

  function toolPanelHtml(){
    var ui=global.Q4BToolsUI;
    if(!ui||typeof ui.panelHtml!=="function"||demoMode)return "";
    return ui.panelHtml({gear:loadToolGear(),text:displayText,attrText:attrText,
      course:profileType,economy:global.Q4B_ECONOMY,pools:komorebiToolPools()});
  }

  /* 「ここでは つかえない どうぐ」。本編でセットした道具のまま小道へ来たとき用。
     装備 (toolgear kv) は全ゲーム共通の 1 個なので書き換えず、倒れているのが
     「ここ」だけであることを 1 枚出して伝える。1 ページ読み込みにつき 1 回だけ。 */
  var toolNoticeShown=false;
  function maybeShowInactiveToolNotice(){
    var ui=global.Q4BToolsUI;
    if(toolNoticeShown||demoMode||!ui||typeof ui.inactiveTool!=="function")return;
    if(!global.document||document.querySelector(".kom-modal"))return;   /* 先客のモーダルを踏まない */
    var tool=ui.inactiveTool({gear:loadToolGear(),economy:global.Q4B_ECONOMY,pools:komorebiToolPools()});
    if(!tool)return;
    toolNoticeShown=true;
    var overlay=document.createElement("div");
    overlay.id="toolNoticeOv";
    overlay.className="kom-modal";
    overlay.innerHTML='<div class="kom-modal-card" role="dialog" aria-modal="true">'
      +ui.noticeHtml(tool,{text:displayText,course:profileType})+'</div>';
    overlay.addEventListener("click",function(event){
      if(event.target===overlay&&overlay.parentNode)overlay.parentNode.removeChild(overlay);
    });
    document.body.appendChild(overlay);
    if(typeof ui.bindNotice==="function")ui.bindNotice(overlay,{onClose:function(){
      if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
    }});
    var ok=overlay.querySelector(".q4b-tool-notice-ok");
    if(ok)ok.focus();
  }

  function bindToolPanel(rerender){
    var ui=global.Q4BToolsUI;
    if(!ui||typeof ui.bindPanel!=="function")return;
    /* 既に選ばれている札は bindPanel 側が握りつぶす (連打で書き込みが並ばない)。
       装備切替は gear の変更が起きたその場で toolGearSet へ (profile の保存とは
       独立)。同期で終わるので、旧実装の保存失敗時の巻き戻しはもう要らない。 */
    ui.bindPanel(document,{onEquip:function(type){
      var tools=toolsModule(),gear=loadToolGear();
      if(!tools||!gear||!tools.equip(gear,type))return;
      storeToolGear(gear);
      rerender();
    }});
  }

  function renderZukan(regionId){
    var region=regionById(regionId),collection=viewCollection();
    var entries=regionEntries(region,collection);
    var shown=entries.filter(function(item){
      if(zukanFilter.expedition!==""&&item.expedition!==zukanFilter.expedition)return false;
      return zukanMatches(item.sp,item.record,collection);
    });
    var cards=shown.map(function(item){return zukanCardHtml(item.entry,item.record);}).join("")
      ||'<li class="zukan-empty">'+displayText("じょうけんに あう虫は いないよ。")+'</li>';
    /* こはくの残高と よぶ ボタン。demo モードは保存に触れない約束なので出さない。 */
    var canCall=!demoMode&&amberWallet()&&amberCallVolume(region);
    var amberLine='<p class="zukan-amber">🔶 '+displayText("こはく：")+'<strong>'+amberBalance()+'</strong>'
      +(canCall?'<button type="button" class="zukan-amber-call" data-action="amber-call">🔶 '+displayText("こはくで よぶ（"+amberCallCost()+"）")+'</button>':"")+'</p>';
    document.getElementById("app").innerHTML='<main class="kom-page zukan-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText(region.regionName+"の小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText(region.regionName+"の ずかん")+'</h1>'
      +'<p>'+displayText("あつめた虫")+'　<strong>'+regionProgressHtml(region,collection)+'</strong>'
      +(shown.length!==entries.length?'　<span class="zukan-shown">'+displayText("ひょうじ中 "+shown.length+"種")+'</span>':"")+'</p>'
      +amberLine+'</div>'
      /* 装備パネルは こはく行の直後に独立カードで置く (本編と同じ共有部品)。 */
      +toolPanelHtml()
      +expeditionChipsHtml(region)
      +zukanFilterBarHtml(entries)
      +'<ul class="zukan-grid">'+cards+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(region.regionId);});
    var call=document.querySelector('[data-action="amber-call"]');
    if(call)call.addEventListener("click",function(){amberCallCapture(region,function(){renderZukan(regionId);});});
    bindToolPanel(function(){renderZukan(regionId);});
    bindZukanFilters(function(){renderZukan(regionId);});
    bindZukanCards(entries,function(){renderZukan(regionId);});
    mountZukanModeToggle(function(){renderZukan(regionId);});
  }

  function bindZukanFilters(rerender){
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="rarity"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.rarity=button.getAttribute("data-value");
        rerender();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="expedition"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.expedition=button.getAttribute("data-value");
        rerender();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="region"]'),function(button){
      button.addEventListener("click",function(){
        zukanFilter.region=button.getAttribute("data-value");
        rerender();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter="flag"]'),function(button){
      button.addEventListener("click",function(){
        var key=button.getAttribute("data-value");
        if(!ZUKAN_FLAG_FILTERS[key])return;
        zukanFilter[key]=!zukanFilter[key];
        rerender();
      });
    });
    var group=document.getElementById("zukanGroup");
    if(group)group.addEventListener("change",function(){zukanFilter.group=group.value;rerender();});
    var caught=document.getElementById("zukanCaught");
    if(caught)caught.addEventListener("change",function(){zukanFilter.caughtOnly=caught.checked;rerender();});
    var query=document.getElementById("zukanQuery");
    if(query)query.addEventListener("input",function(){
      zukanFilter.query=query.value;
      rerender();
      var again=document.getElementById("zukanQuery");
      if(again){again.focus();again.setSelectionRange(again.value.length,again.value.length);}
    });
  }

  /* --- 小道の共通図鑑 --------------------------------------------------------
     全地域を横断する読み物としての図鑑 (volume_zukan_design 3.3)。御神木パネルの
     「こもれび N/M」の着地先。捕獲の場ではないので、ここから遠征へは飛ばない。 */

  function pathZukanEntranceHtml(){
    var collection=viewCollection(),caught=0,denominator=0;
    regionList().forEach(function(region){
      region.volumes.forEach(function(volume){
        if(volume.placeholder)return;
        var progress=volumeProgress(volume,collection);
        caught+=progress.caught;denominator+=progress.denominator;
      });
    });
    return '<div class="kom-trophy-entrance"><button type="button" class="kom-trophy-open" data-action="path-zukan">'
      +'📖 <span>'+displayText("こもれびの ずかん")+'</span> <strong>'+caught+'／'+denominator+'</strong></button></div>';
  }

  function renderCommonZukan(backId){
    var collection=viewCollection(),regions=regionList().filter(function(region){return !region.placeholder;}),entries=[];
    regions.forEach(function(region){
      regionEntries(region,collection).forEach(function(item){entries.push(item);});
    });
    var shown=entries.filter(function(item){
      if(zukanFilter.region!==""&&item.regionId!==zukanFilter.region)return false;
      return zukanMatches(item.sp,item.record,collection);
    });
    var regionChips=[["","すべて"]].concat(regions.map(function(region){return [region.regionId,region.regionName];}))
      .map(function(pair){
        return '<button type="button" class="zukan-chip'+(zukanFilter.region===pair[0]?" is-on":"")+'" data-filter="region" data-value="'+escapeHtml(pair[0])+'">'+displayText(pair[1])+'</button>';
      }).join("");
    var cards=shown.map(function(item){return zukanCardHtml(item.entry,item.record);}).join("")
      ||'<li class="zukan-empty">'+displayText("じょうけんに あう虫は いないよ。")+'</li>';
    var caught=entries.filter(function(item){return item.record;}).length;
    document.getElementById("app").innerHTML='<main class="kom-page zukan-page"><header class="kom-top"><button type="button" class="kom-back" data-action="back">← '+displayText("小道")+'</button></header>'
      +'<div class="kom-title"><h1>'+displayText("こもれびの ずかん")+'</h1>'
      +'<p>'+displayText("あつめた虫")+'　<strong>'+caught+'／'+entries.length+'</strong>'
      +(shown.length!==entries.length?'　<span class="zukan-shown">'+displayText("ひょうじ中 "+shown.length+"種")+'</span>':"")+'</p>'
      /* 残高だけ出す。地域横断のここでは よぶ の対象 volume が曖昧なため、ボタンは
         地域ずかん側にしか置かない。 */
      +'<p class="zukan-amber">🔶 '+displayText("こはく：")+'<strong>'+amberBalance()+'</strong></p></div>'
      /* 装備パネルは こはく行の直後に独立カードで置く (地域ずかんと同じ共有部品)。 */
      +toolPanelHtml()
      +'<div class="zukan-chips" role="group" aria-label="'+attrText("ちいきでしぼる")+'">'+regionChips+'</div>'
      +zukanFilterBarHtml(entries)
      +'<ul class="zukan-grid">'+cards+'</ul></main>';
    document.querySelector('[data-action="back"]').addEventListener("click",function(){renderMap(backId);});
    bindToolPanel(function(){renderCommonZukan(backId);});
    bindZukanFilters(function(){renderCommonZukan(backId);});
    bindZukanCards(entries,function(){renderCommonZukan(backId);});
    mountZukanModeToggle(function(){renderCommonZukan(backId);});
  }

  /* 捕獲済みカードをタップすると、本編と同じ詳細 (Q4BZukan.detailHTML) を開く。
     detailHTML は捕獲記録と種を引数で受ける汎用 API なので、小道の記録をそのまま渡せる。 */
  function bindZukanCards(entries,rerender){
    Array.prototype.forEach.call(document.querySelectorAll(".zukan-card[data-species-id]"),function(card){
      function open(){
        var item=entries.filter(function(x){return x.entry.id===card.getAttribute("data-species-id");})[0];
        if(item&&item.record&&item.sp)openZukanModal(item,rerender);
      }
      card.addEventListener("click",open);
      card.addEventListener("keydown",function(event){
        if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}
      });
    });
  }

  /* 本編 keisan の図鑑詳細と同じ体裁: 背景タップで閉じるモーダル、種名・レア度・
     捕獲サイズ・学名・分類・注意・説明の順。中身は共有の Q4BZukan.detailHTML。 */
  function breedingCollection(){
    return {catches:profile.collection.catches,total:profile.collection.totalCatches};
  }

  function refreshZukanModal(spId,redrawScreen){
    var rerender=zukanModalRerender;
    if(typeof rerender!=="function")return;
    if(redrawScreen)rerender();
    var sp=global.Q4BReward&&global.Q4BReward.spById?global.Q4BReward.spById(spId):null;
    var record=profile&&profile.collection&&profile.collection.catches[spId];
    if(sp&&record)openZukanModal({sp:sp,record:record},rerender);
    else closeZukanModal();
  }

  function komorebiLayEgg(spId){
    if(!profile||!profile.collection||!global.Q4BReward||!global.Q4BBreeding)return;
    var sp=global.Q4BReward.spById(spId); if(!sp)return;
    global.Q4BBreeding.openLayConfirm(sp,{coll:breedingCollection(),profileId:profileId,homeHref:"../index.html",onSuccess:function(){
      refreshZukanModal(spId,false);
    }});
  }

  function komorebiAbandonEgg(spId){
    if(!global.Q4BReward)return;
    if(!global.confirm("この たまごを すてる? (返金なし)"))return;
    if(!global.confirm("ほんとうに すてる?"))return;
    global.Q4BReward.abandonEgg(spId).then(function(ok){if(ok)refreshZukanModal(spId,false);});
  }

  function komorebiHatchEgg(spId){
    if(!profile||!profile.collection||!global.Q4BReward)return;
    var coll=breedingCollection();
    global.Q4BReward.hatchEgg(coll,spId).then(function(result){
      if(!result){global.alert("孵化できませんでした (別の たんまつで すすんでいる可能性があります)");return;}
      profile.collection.catches=coll.catches;
      profile.collection.totalCatches=coll.total;
      saveProfile().then(function(){refreshZukanModal(spId,true);},function(){
        global.alert("孵化できませんでした (別の たんまつで すすんでいる可能性があります)");
      });
    });
  }

  function openZukanModal(item,rerender){
    closeZukanModal();
    zukanModalRerender=rerender;
    var reward=global.Q4BReward,sp=item.sp,record=item.record,tier=sp.r;
    var size=sp.sizeMm?sp.sizeMm[0]+"〜"+sp.sizeMm[1]+"mm":"";
    var caught=Number.isFinite(record.max)?record.max+"mm":"";
    var detail=(global.Q4BZukan&&global.Q4BZukan.detailHTML)?global.Q4BZukan.detailHTML(record,sp,{coll:breedingCollection(),onLayEgg:"komorebiLayEgg",onAbandonEgg:"komorebiAbandonEgg",onHatchEgg:"komorebiHatchEgg"}):"";
    var overlay=document.createElement("div");
    overlay.className="kom-modal";
    overlay.id="komZukanModal";
    /* data-zukan-zoom-zone: 共有 lightbox (zukan_lightbox.js) の装着マーカー。
       本編モーダルのクラス名に依存しない明示指定で、写真タップ拡大を有効化する。 */
    /* q4b-zd-night: 共有詳細ブロック (zukan_detail.js) の夜配色を局所的に有効化。
       小道は常時ダークだが body.night は keisan/style.css 全体に効くため使わない。 */
    overlay.innerHTML='<div class="kom-modal-card q4b-zd-night" role="dialog" aria-modal="true" data-zukan-zoom-zone="1">'
      +'<div class="kom-modal-art r'+tier+'">'+(reward.svg?reward.svg(sp,record.records&&record.records.some(function(r){return r.shiny;})):"")+'</div>'
      +'<h3>'+displayText(speciesName(sp))+'</h3>'
      +'<p><span class="zukan-tier r'+tier+'">'+displayText(reward.TIERNAME[tier])+'</span>　'+displayText("×"+record.n)+'</p>'
      +(caught?'<p class="kom-modal-size">'+displayText("つかまえた おおきさ")+' <b>'+caught+'</b>'+(size?'　'+displayText("（種の範囲: "+size+"）"):"")+'</p>':"")
      +(sp.scientificName?'<p class="kom-modal-sci"><i>'+escapeHtml(sp.scientificName)+'</i></p>':"")
      +'<p class="kom-modal-taxon">'+displayText([sp.orderJa,sp.familyJa,sp.groupJa].filter(Boolean).join(" / "))+'</p>'
      +(sp.caution?'<p class="kom-modal-caution">'+displayText(sp.caution)+'</p>':"")
      +(sp.note?'<p class="kom-modal-note">'+displayText(sp.note)+'</p>':"")
      +detail
      +'<button type="button" class="kom-modal-close">'+displayText("とじる")+'</button></div>';
    overlay.addEventListener("click",function(event){
      if(event.target===overlay||event.target.className==="kom-modal-close")closeZukanModal();
    });
    document.body.appendChild(overlay);
    if(global.Q4BZukan&&global.Q4BZukan.attachLightbox)global.Q4BZukan.attachLightbox();
    var close=overlay.querySelector(".kom-modal-close");
    if(close)close.focus();
  }

  function closeZukanModal(){
    var existing=document.getElementById("komZukanModal");
    if(existing&&existing.parentNode)existing.parentNode.removeChild(existing);
    zukanModalRerender=null;
  }

  function renderError(){
    document.getElementById("app").innerHTML='<main class="kom-page"><section class="expedition-panel center"><h1>よみこめませんでした</h1><p>ページを よみなおしてね。</p><a class="kom-back" href="../keisan/index.html">← けいさん</a></section></main>';
  }

  function loadWorldMap(){
    if(typeof global.fetch!=="function")return Promise.reject(new Error("地図を読み込めません"));
    return global.fetch("assets/world_paths.json").then(function(response){
      if(!response.ok)throw new Error("地図を読み込めません");
      return response.json();
    });
  }

  function loadRatioPool(){
    if(typeof global.fetch!=="function")return Promise.reject(new Error("割合問題を読み込めません"));
    return global.fetch("assets/ratio_pool.json").then(function(response){
      if(!response.ok)throw new Error("割合問題を読み込めません");
      return response.json();
    }).then(validateRatioPool);
  }

  function boot(){
    /* 二重消費防止の明示化。小道は共有 reward の wallet を使わず、道具を直接消費する。 */
    if(global.Q4BReward&&typeof Q4BReward.setToolsStore==="function")Q4BReward.setToolsStore(null);
    if(!global.QuestSave){renderError();return;}
    profileId=QuestSave.currentProfile();
    if(!profileId){renderError();return;}
    demoMode=/[?&]demo\b/.test(global.location&&global.location.search||"");
    var pull=QuestSave.syncDown?QuestSave.syncDown().catch(function(){}):Promise.resolve();
    pull.then(function(){return Promise.all([QuestSave.loadVersioned("komorebi",profileId,null),QuestSave.load("keisan",profileId),loadWorldMap(),loadRatioPool()]);}).then(function(data){
      var normalized=normalizeProfile(data[0].data);
      profile=normalized.profile;
      profileRevision=data[0].revision;
      /* profile 直下の旧道具 (tools / equippedToolId / toolDex) を共有 kv (toolgear)
         へ 1 回だけ移す。冪等 (kv が既に在れば何もしない) で、profile 側の
         フィールドは消さない (古いクライアントとの共存とデータ保全)。 */
      if(QuestSave.toolGearMigrateFromProfile)QuestSave.toolGearMigrateFromProfile(profileId,profile);
      profileType=data[1]&&data[1].type==="k5"?"k5":"k10";
      worldMap=validateMapPayload(data[2],expeditionVolumes());
      ratioPool=data[3];
      return normalized.changed?saveProfile():true;
    /* renderMap を直接渡すと Promise の解決値が selectedId として届いてしまう。 */
    }).then(function(){
      /* 御神木パネルのうろ入口はページをまたぐので、?uro=1 で直接うろへ着地させる
         (地図を 1 枚はさむと「押したのに別の画面が出た」になる)。未公開なら地図。 */
      if(/[?&]uro\b/.test(global.location&&global.location.search||"")&&uroAvailable()){renderUro();return;}
      renderMap();
    }).catch(renderError);
  }

  global.komorebiLayEgg=komorebiLayEgg;
  global.komorebiAbandonEgg=komorebiAbandonEgg;
  global.komorebiHatchEgg=komorebiHatchEgg;

  global.Q4B_KOMOREBI={
    categories:CATEGORIES,
    collectionConfig:COLLECTION_CONFIG,
    createProfile:createProfile,
    normalizeProfile:normalizeProfile,
    /* 保存の競合解決。二台で遊んだときにだけ通る経路なので、実機では滅多に踏まない。
       テストから直接叩けないと、記録が消えないことを確かめる手段が無くなる。 */
    mergeProfiles:mergeProfileCatches,
    validateVolume:validateVolume,
    qualifiesForGauge:qualifiesForGauge,
    drawCapture:drawCapture,
    /* 道具の guild 重みを乱数 1 本で検査するための窓。抽選の中身なので公開 API に
       出しておかないと、重み 3 倍の有無を単体で確かめられない。 */
    pickSpecies:pickSpecies,
    /* メダル経済の公開スイッチ。うろの入口は小道の地図下端と御神木パネルの 2 か所に
       あり、後者は shared/breeding.js が economy_flag を直接読んで描く。 */
    medalEconomyOn:medalEconomyOn,
    toolsReleased:toolsReleased,
    releasedTools:releasedTools,
    earnedMedals:function(){return earnedMedals();},
    pendingMedals:function(){return pendingMedals();},
    applyAnswer:applyAnswer,
    recordAnswer:recordAnswer,
    /* 実運用の本線 (セッションの 1 問はここを通る)。鋳造 → 即時交換の起動点なので、
       テストからも同じ入口を叩けるようにしておく。 */
    recordSubmission:recordSubmission,
    volumeProgress:volumeProgress,
    mapPinState:mapPinState,
    validateMapPayload:validateMapPayload,
    validateRatioPool:validateRatioPool,
    ratioFormMix:RATIO_FORM_MIX,
    buildRatioSet:buildRatioSet,
    updateRatioHistory:updateRatioHistory,
    judgeStandardAnswer:judgeStandardAnswer,
    standardQuestionBodyHtml:standardQuestionBodyHtml,
    wazaCardHtml:wazaCardHtml,
    feedbackHtml:feedbackHtml,
    kukuQuestionBodyHtml:kukuQuestionBodyHtml,
    startRatioSession:startRatioSession,
    startKukuRunSession:startKukuRunSession,
    sessionStarters:SESSION_STARTERS,
    isReleased:isReleased,
    currentRelease:currentRelease,
    dan2QuestionBodyHtml:dan2QuestionBodyHtml,
    formatCourseText:formatCourseText,
    applyPerformance:applyPerformance,
    recordResult:recordResult,
    speciesForArea:speciesForArea,
    /* ずかんフィルタの判定を jsdom なしで検査するための窓。zukanFilterState は
       ライブ参照を返す (テストが直接書き換えて判定だけを確かめる)。 */
    zukanMatches:zukanMatches,
    zukanFilterState:function(){return zukanFilter;},
    profile:function(){return profile;}
  };
  /* 公開前後の両方を 1 回の実行で確かめるための切替 (テスト専用の seam)。実体は
     economy_flag 側にあり、ここはそこへの転送でしかない。ハーネスが
     Q4B_KOMOREBI_TEST_HOOKS を立てた文脈でだけ生える。
     実運用で動かすのは economy_flag.js の 2 行だけ。 */
  if(global.Q4B_KOMOREBI_TEST_HOOKS&&economyFlags().setOn){
    global.Q4B_KOMOREBI.setMedalEconomyOn=function(on){economyFlags().setOn(on);};
    global.Q4B_KOMOREBI.setCurrentRelease=function(value){economyFlags().setCurrentRelease(value);};
  }

  if(!global.Q4B_KOMOREBI_NO_BOOT&&global.document)boot();
})(window);
