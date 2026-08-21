(function(global){
  "use strict";

  /* 採集道具 (tools_design 6-8 章)。メダル 1 枚と交換で授かる消耗品で、動かすのは
     「どの虫か」と「新顔か」の 2 つだけ。8 問 1 匹のレートとレアリティ表には触れない。

     matcher は実在の採集法に対応させる。色分けのような恣意的な対応を採ると、
     図鑑で覚えた分類の知識が道具選びに効かなくなる。判定は種データの既存フィールド
     ({order, family, familyJa, groupJa, tags, habitat, sizeMm}) だけを読む。 */

  /* 耐久は全図鑑ぶんの合計。8 問 1 匹なので 100 回 = 正解 800 問ぶんで、3 教科
     90 問/日なら 9 日前後もつ。小道だけに効いていた頃の 30 では、本編にも効かせた
     とたん 3 日弱で溶ける (2026-08-20 決定)。ここ 1 本で再調整できる。 */
  var DURABILITY=100;

  function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}

  function toSet(values){
    var set=Object.create(null);
    values.forEach(function(value){set[value]=true;});
    return set;
  }

  function inSet(value,set){return typeof value==="string"&&!!set[value];}

  function anyOf(values,set){
    return Array.isArray(values)&&values.some(function(value){return inSet(value,set);});
  }

  /* データの実語彙に合わせる。aquatic / wetland のような設計書の総称語は
     komorebi/data の種データにはほとんど無く、実際に付いているのは水域の具体名。 */
  var WATER_HABITAT=toSet(["pond","marsh","stream","river","paddy","lake","water","wetland","bog",
    "ricefield","rice_field","mountain_stream","waterside","riverside","riverbank","seepage"]);
  var GRASS_HABITAT=toSet(["grassland","field","farmland","farm","paddy","ricefield","rice_field","forest_edge"]);
  var GROUND_HABITAT=toSet(["ground","bareground","sand"]);
  var HIGH_HABITAT=toSet(["canopy","treetop","tree"]);
  var HIGH_TAGS=toSet(["canopy","treetop","arboreal"]);

  var BUTTERFLY_FAMILY=toSet(["Nymphalidae","Papilionidae","Pieridae","Lycaenidae","Hesperiidae","Riodinidae"]);
  var BUTTERFLY_GROUP=toSet(["タテハ","アゲハ","シロチョウ","シジミ","セセリ","マダラチョウ","ジャノメ"]);
  var MOTH_FAMILY=toSet(["Saturniidae","Sphingidae","Erebidae","Noctuidae","Geometridae","Lasiocampidae","Uraniidae"]);
  var MOTH_GROUP=toSet(["ガ","スズメガ","ヤガ"]);
  var MOTH_TAGS=toSet(["moth","nocturnal","dusk"]);
  var SWEEP_ORDER=toSet(["Orthoptera","Hemiptera"]);
  var BEATING_FAMILY=toSet(["Curculionidae","Chrysomelidae","Cerambycidae","Pentatomidae","Coreidae","Scutelleridae","Lonchodidae","Phasmatidae"]);
  var BEATING_GROUP=toSet(["ナナフシ","ゾウムシ","カミキリ","ハムシ"]);
  var SAP_FAMILY=toSet(["Lucanidae","Scarabaeidae","Cetoniidae","Dynastidae","Passalidae","Nymphalidae"]);
  var SAP_GROUP=toSet(["クワガタムシ","カブトムシ","コガネ","タテハ"]);
  var GROUND_FAMILY=toSet(["Carabidae","Tenebrionidae","Staphylinidae","Silphidae"]);
  var GROUND_GROUP=toSet(["オサムシ","ゴミムシ"]);
  var DUNG_TAGS=toSet(["dung","dung_beetle","coprophagous"]);
  var DUNG_FAMILY=toSet(["Geotrupidae"]);
  var SMALL_MAX_MM=15;

  function habitatOf(sp){return sp&&Array.isArray(sp.habitat)?sp.habitat:[];}
  function tagsOf(sp){return sp&&Array.isArray(sp.tags)?sp.tags:[];}
  function hasTag(sp,tag){return tagsOf(sp).indexOf(tag)>=0;}
  function upperSizeMm(sp){
    return sp&&Array.isArray(sp.sizeMm)&&Number.isFinite(sp.sizeMm[1])?sp.sizeMm[1]:null;
  }

  /* release は「どの更新で交換できるようになるか」。CATEGORIES と同じ番号体系で、
     公開は app.js の CURRENT_RELEASE 1 か所で決める。先行 4 種だけが更新 2 で出る
     (MG I に対象種がいる組。対象ゼロの道具を並べても交換画面が虚しくなるだけ)。

     yomi は 5 歳コースで名前の代わりに出す かな。道具の名前は実在の採集法の名前
     なので漢字が残る (吸虫管・高所用長竿)。小道のふりがなは語の辞書引きで、辞書に
     無い語は素通りするか、部分一致で誤った読みが付く (吸虫管 の 虫 に「むし」)。
     読めない名前と 誤った読み のどちらも避けるため、5 歳コースには かなの名前を
     渡す。漢字を含まない名前は yomi を持たない (同じ文字列を 2 度書かない)。 */
  var TOOLS=[
    {
      id:"cho_net",name:"ちょうネット",emoji:"🥅",release:2,
      guild:"ひるに とぶ チョウ",
      blurb:"ふわりと まいあがる チョウを そっと つつむ、やわらかい あみ。",
      breakText:"あみが やぶれた!",
      match:function(sp){
        return hasTag(sp,"butterfly")||inSet(sp.family,BUTTERFLY_FAMILY)||inSet(sp.groupJa,BUTTERFLY_GROUP);
      }
    },
    {
      id:"tonbo_net",name:"トンボ用メッシュネット",yomi:"トンボようメッシュネット",emoji:"🕸",release:2,
      guild:"トンボ",
      blurb:"めの こまかい あみ。すばやい トンボの はねを いためない。",
      breakText:"あみが やぶれた!",
      match:function(sp){return sp.order==="Odonata";}
    },
    {
      id:"light_trap",name:"灯火採集セット",yomi:"とうかさいしゅうセット",emoji:"🔦",release:2,
      guild:"よるに とぶ 虫",
      blurb:"よるに 白い ぬのを てらす あかり。ガたちが つぎつぎ やってくる。",
      breakText:"ライトが きえた!",
      match:function(sp){
        return anyOf(tagsOf(sp),MOTH_TAGS)||inSet(sp.family,MOTH_FAMILY)||inSet(sp.groupJa,MOTH_GROUP);
      }
    },
    {
      id:"banana_trap",name:"バナナトラップ",emoji:"🍌",release:2,
      guild:"きの しるに あつまる 虫",
      blurb:"あまく じゅくした バナナ。きの しるが すきな 虫が あつまる。",
      breakText:"バナナが なくなった!",
      match:function(sp){return inSet(sp.family,SAP_FAMILY)||inSet(sp.groupJa,SAP_GROUP);}
    },
    /* ここから下は定義だけ先に置く未公開分 (implementation_plan Phase 2)。
       release が CURRENT_RELEASE を超える間は交換画面にも道具箱にも出ない。 */
    {
      id:"sweep_net",name:"スイーピングネット",emoji:"🌾",release:3,
      guild:"くさはらの バッタや カメムシ",
      blurb:"くさむらを さっと なでる あみ。かくれた バッタが とびだす。",
      breakText:"あみが やぶれた!",
      match:function(sp){return inSet(sp.order,SWEEP_ORDER)&&anyOf(habitatOf(sp),GRASS_HABITAT);}
    },
    {
      id:"water_net",name:"さかなとりあみ",emoji:"🐟",release:3,
      guild:"みずべの 虫",
      blurb:"みずの 中を すくう あみ。いけや かわに すむ 虫が あみに のる。",
      breakText:"あみが やぶれた!",
      match:function(sp){return anyOf(habitatOf(sp),WATER_HABITAT);}
    },
    {
      id:"beating_set",name:"ビーティングセット",emoji:"🪵",release:4,
      guild:"えだに かくれる 虫",
      blurb:"えだを たたいて 白い ぬのに おとす。かくれんぼの めいじんが おちてくる。",
      breakText:"ぬのが やぶれた!",
      match:function(sp){
        return sp.order==="Phasmatodea"||inSet(sp.family,BEATING_FAMILY)||inSet(sp.groupJa,BEATING_GROUP);
      }
    },
    {
      id:"aspirator",name:"吸虫管",yomi:"きゅうちゅうかん",emoji:"🧪",release:4,
      guild:"とても ちいさい 虫",
      blurb:"ちいさな 虫を すいこむ ほそい くだ。つまめない 虫も つかまえられる。",
      breakText:"くだが つまった!",
      match:function(sp){
        var upper=upperSizeMm(sp);
        return upper!==null&&upper<SMALL_MAX_MM;
      }
    },
    {
      id:"long_pole",name:"高所用長竿",yomi:"こうしょようながざお",emoji:"🎣",release:5,
      guild:"たかい ところの 虫",
      blurb:"たかい えだまで とどく ながい さお。こずえの 虫に てが とどく。",
      breakText:"さおが おれた!",
      match:function(sp){return anyOf(habitatOf(sp),HIGH_HABITAT)||anyOf(tagsOf(sp),HIGH_TAGS);}
    },
    {
      id:"pitfall_trap",name:"落とし穴トラップ",yomi:"おとしあなトラップ",emoji:"🕳",release:5,
      guild:"じめんを あるく 虫",
      blurb:"じめんに うめた コップ。あるく 虫が ぽとりと おちる。",
      breakText:"コップが われた!",
      match:function(sp){
        if(inSet(sp.family,GROUND_FAMILY)||inSet(sp.groupJa,GROUND_GROUP))return true;
        return sp.order==="Coleoptera"&&anyOf(habitatOf(sp),GROUND_HABITAT);
      }
    },
    {
      id:"dung_trap",name:"フントラップ",emoji:"💩",release:5,
      guild:"フンチュウ",
      blurb:"けものの ふんを つかう わな。ふんが すきな 虫だけが やってくる。",
      breakText:"わなが つかえなくなった!",
      match:function(sp){
        return anyOf(tagsOf(sp),DUNG_TAGS)||inSet(sp.family,DUNG_FAMILY);
      }
    }
  ];

  var BY_ID=Object.create(null);
  TOOLS.forEach(function(tool){BY_ID[tool.id]=tool;});

  function list(){return TOOLS.slice();}
  function byId(id){return BY_ID[id]||null;}

  /* 画面に出す名前。5 歳コースだけ かなの名前へ倒す (yomi を持つ道具のみ)。
     ここを 1 本にしておくと、交換画面・どうぐばこ・図鑑・ウィジェット・リザルト・
     ほうのうの記録で名前が食い違わない。 */
  function displayName(tool,course){
    var entry=typeof tool==="string"?byId(tool):tool;
    if(!entry)return "";
    return course==="k5"&&entry.yomi?entry.yomi:entry.name;
  }

  /* guild 判定。種データが無い (差し替え途中など) 場合は「対象でない」に倒す。
     ここで throw すると 1 種の欠けで捕獲そのものが止まる。 */
  function matches(toolId,sp){
    var tool=byId(toolId);
    if(!tool||!isObject(sp))return false;
    return !!tool.match(sp);
  }

  function countTargets(toolId,speciesList){
    if(!Array.isArray(speciesList))return 0;
    return speciesList.filter(function(sp){return matches(toolId,sp);}).length;
  }

  /* --- instance 管理 ---------------------------------------------------------
     道具は個体で持つ。同じ灯火セットを 4 つ持てば耐久は 4 本ぶん別々に減る。
     装備は 1 枠で、equippedToolId は種類を指す。実際に減る個体は同じ種類の
     先頭 1 本で、壊れたら次の 1 本が黙って引き継ぐ (狩りの途中で選ばせない)。 */

  function toolsOf(profile){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    if(!Array.isArray(profile.tools))profile.tools=[];
    return profile.tools;
  }

  /* 形の誤り (種類が無い、残量が整数でない、0 以下) は通さない。ただし
     「残量が今の耐久上限を超えている」だけは上限へ丸めて直す。耐久を後から
     下方調整したとき、それ以前に配った道具を持っている子のセーブが丸ごと
     読めなくなるのは、壊れたデータではなく仕様変更の側の問題だから。
     装備だけ残って本体が無い状態を黙って外すのと同じ自己修復方針。
     知らない道具の id は弾かず、そのまま持ち越す (validateDex と同じ方針)。
     道具箱は先の更新で増える台帳で、新しい道具を知っている端末が書いた
     instance を古い端末が読むことがある。そこで throw すると、その端末は
     保存の競合解決 (remote を読み直す経路) ごと動かなくなる。耐久上限の
     丸めは、知っている道具にだけ効かせる (知らない道具の上限は分からない)。 */
  function validateTools(tools){
    if(!Array.isArray(tools))throw new Error("道具データの形式が正しくありません");
    tools.forEach(function(entry){
      if(!isObject(entry)||typeof entry.type!=="string"||!entry.type)throw new Error("道具データの形式が正しくありません");
      if(!Number.isInteger(entry.remaining)||entry.remaining<1)throw new Error("道具データの形式が正しくありません");
      if(BY_ID[entry.type]&&entry.remaining>DURABILITY)entry.remaining=DURABILITY;
    });
    return tools;
  }

  function ownedOf(profile,typeId){
    return toolsOf(profile).filter(function(entry){return entry.type===typeId;});
  }

  /* 装備中の 1 本。equippedToolId が指す種類の先頭個体。 */
  function equipped(profile){
    if(!isObject(profile)||typeof profile.equippedToolId!=="string")return null;
    return ownedOf(profile,profile.equippedToolId)[0]||null;
  }

  function equippedTool(profile){
    var instance=equipped(profile);
    return instance?byId(instance.type):null;
  }

  /* --- 道具図鑑 (design 6 章) -------------------------------------------------
     初めて授かった日だけを残す台帳。「11 種すべてを一度は授かる」という第二の
     完成目標で、いま何本持っているか (道具箱) とは別の記録。壊れて手元から消えても
     ここからは消えない (獲得の記録は不滅)。 */

  function dexOf(profile){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    if(!isObject(profile.toolDex))profile.toolDex={};
    return profile.toolDex;
  }

  function firstGrantAt(profile,typeId){
    var dex=isObject(profile)&&isObject(profile.toolDex)?profile.toolDex:null;
    var at=dex?dex[typeId]:null;
    return typeof at==="string"&&at?at:null;
  }

  /* 知らない道具の id は弾かず、そのまま持ち越す。図鑑は先の更新で増える台帳なので、
     新しい道具を知っている端末が書いた記録を古い端末が読むことがある。そこで throw
     すると、その端末は保存の競合解決 (remote を読み直す経路) ごと動かなくなる。
     弾くのは形の誤り (日付が文字列でない、空) だけ。 */
  function validateDex(profile){
    if(!isObject(profile))throw new Error("保存データが正しくありません");
    var dex=profile.toolDex;
    if(dex==null)return profile;
    if(!isObject(dex))throw new Error("道具図鑑の形式が正しくありません");
    Object.keys(dex).forEach(function(id){
      if(typeof dex[id]!=="string"||!dex[id])throw new Error("道具図鑑の形式が正しくありません");
    });
    return profile;
  }

  /* 図鑑に載るのは授与日を渡した授与だけ。日付なしの呼び出し (テストの下ごしらえ)
     で台帳が埋まると、初回授与の記録が実際の授与日とずれる。 */
  function grant(profile,typeId,today){
    if(!BY_ID[typeId])throw new Error("道具の指定が正しくありません");
    var instance={type:typeId,remaining:DURABILITY};
    toolsOf(profile).push(instance);
    if(typeof today==="string"&&today&&!firstGrantAt(profile,typeId))dexOf(profile)[typeId]=today;
    /* 何も装備していないときだけ自動で装備する。装備中の道具を勝手に置き換えない。 */
    if(!equipped(profile))profile.equippedToolId=typeId;
    return instance;
  }

  function equip(profile,typeId){
    if(typeId==null){profile.equippedToolId=null;return true;}
    if(!ownedOf(profile,typeId).length)return false;
    profile.equippedToolId=typeId;
    return true;
  }

  /* 捕獲 1 回につき 1 減る。未装備なら何も起きない (基本ループは道具なしで無料)。 */
  function consume(profile){
    var instance=equipped(profile);
    if(!instance)return null;
    var tool=byId(instance.type);
    instance.remaining--;
    if(instance.remaining>0)return {type:instance.type,remaining:instance.remaining,broke:false,swapped:false};
    var tools=toolsOf(profile);
    tools.splice(tools.indexOf(instance),1);
    var spare=ownedOf(profile,tool.id)[0]||null;
    if(!spare)profile.equippedToolId=null;
    return {type:tool.id,remaining:spare?spare.remaining:0,broke:true,swapped:!!spare};
  }

  global.Q4B_TOOLS={
    durability:DURABILITY,
    list:list,
    byId:byId,
    displayName:displayName,
    matches:matches,
    countTargets:countTargets,
    validateTools:validateTools,
    validateDex:validateDex,
    firstGrantAt:firstGrantAt,
    ownedOf:ownedOf,
    equipped:equipped,
    equippedTool:equippedTool,
    grant:grant,
    equip:equip,
    consume:consume
  };
})(typeof window!=="undefined"?window:globalThis);
