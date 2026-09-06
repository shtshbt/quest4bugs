(function(global){
  "use strict";

  /* 採集ギルド: 図鑑の 1 種を「どの採集法で採れるか」へ割り当てる層。

     なぜ種データ (bugs.js の habitat / tags) を書き足すのではなく、この層を作ったか。
     2026-09-06 に実測した 3 つの事実による。

       1. habitat は 1950 種中 1397 種にしか無い。tools_design 6 章の matcher は
          canopy / treetop / arboreal / dung を主キーに置いていたが、canopy 系の語は
          図鑑の語彙に 1 件も存在しなかった (高所用長竿の対象種は全 DB で 1 種)。
       2. sizeMm はマダガスカル遠征 II (80 種) で 0 件、subfamily は小道の巻 5 本すべてで
          0 件。巻ごとに埋まっている field が違うので、field を主キーにした matcher は
          巻が増えるたびに当たり外れが変わる。
       3. 手で書いた語彙は新しい種に引き継がれない。1950 種へ遡って書き足しても、次の
          巻を取り込んだ瞬間にまた穴が開く。

     いっぽう order / family / scientificName は全 1950 種で 100% 埋まっている
     (GBIF 由来なので、新しい巻でも必ず入る)。だから割り当ての主キーは分類にする。
     habitat と tags は「あれば効く」補助キーとして残す (手で書いた事実は捨てない)。

     新しい道具を出すときにやることは、ここへ 1 ギルド足すことだけになる。種データを
     触らないので、bugs.js の diff もレビュー対象も増えない。

     ギルドは排他ではない。1 種が複数のギルドに属してよい (tools_design 8 章が
     guild 重みを「排他にしない」と決めているのと同じ理由で、実際の採集も 1 種 1 法では
     ない)。境界は「その道具で現実に採れるか」だけで引き、重なりは許す。 */

  function toSet(list){
    var set=Object.create(null),i;
    for(i=0;i<list.length;i++)set[list[i]]=true;
    return set;
  }
  function inSet(value,set){return !!(value&&set[value]);}
  function anyOf(list,set){
    if(!Array.isArray(list))return false;
    for(var i=0;i<list.length;i++)if(set[list[i]])return true;
    return false;
  }
  /* 属名。scientificName の第 1 語。全種に入っているので、family だけでは割れない
     ギルド (フンチュウは Scarabaeidae の一部でしかない) の主キーになる。 */
  function genusOf(sp){
    var name=sp&&sp.scientificName;
    if(typeof name!=="string")return "";
    var space=name.indexOf(" ");
    return space<0?name:name.slice(0,space);
  }
  function tagsOf(sp){return sp&&Array.isArray(sp.tags)?sp.tags:[];}
  function habitatOf(sp){return sp&&Array.isArray(sp.habitat)?sp.habitat:[];}
  /* 体長の上限 mm。無い種は null (「小さいと分かっていない」と「小さくない」を混ぜない)。 */
  function upperSizeMm(sp){
    var size=sp&&sp.sizeMm;
    if(!Array.isArray(size)||!size.length)return null;
    var max=null,i,value;
    for(i=0;i<size.length;i++){
      value=Number(size[i]);
      if(!isFinite(value))continue;
      if(max===null||value>max)max=value;
    }
    return max;
  }

  /* --- 分類の共有集合 ------------------------------------------------------
     複数のギルドが同じ集合を見るので、ギルド定義より先に 1 か所へ置く。 */

  /* 昼行性の鱗翅 (チョウ)。Lepidoptera のうちこの科だけがチョウで、残りはガ。
     Castniidae / Zygaenidae / Uraniidae は分類上はガだが昼に飛ぶので、
     ちょうネットの側にも入れる (コメットガの仲間 Chrysiridia は昼のマダガスカル
     を代表する種で、灯火で採るものではない)。 */
  var BUTTERFLY_FAMILY=toSet(["Papilionidae","Pieridae","Nymphalidae","Lycaenidae",
    "Riodinidae","Hesperiidae","Libytheidae","Danaidae","Satyridae"]);
  var DAY_MOTH_FAMILY=toSet(["Castniidae","Zygaenidae","Uraniidae","Sesiidae"]);

  /* 水生。幼虫だけ水中の目 (Trichoptera / Megaloptera / Ephemeroptera / Plecoptera) も
     水網の対象に入れる。すくって採るのは実際そこ。 */
  var AQUATIC_ORDER=toSet(["Trichoptera","Megaloptera","Ephemeroptera","Plecoptera"]);
  var AQUATIC_FAMILY=toSet([
    "Dytiscidae","Noteridae","Gyrinidae","Haliplidae","Hydrophilidae","Hydraenidae",
    "Elmidae","Psephenidae","Dryopidae","Helophoridae","Spercheidae",
    "Belostomatidae","Nepidae","Notonectidae","Corixidae","Naucoridae","Pleidae",
    "Aphelocheiridae","Gerridae","Veliidae","Hydrometridae","Mesoveliidae","Hebridae",
    "Culicidae","Chironomidae","Ceratopogonidae","Dixidae","Simuliidae","Ephydridae",
    "Tipulidae","Chaoboridae"]);
  var AQUATIC_HABITAT=toSet(["pond","marsh","stream","river","paddy","water","lake",
    "wetland","mountain_stream"]);
  /* habitat だけで水生と見なす目。成虫が水辺にいるだけの目 (チョウ) を引き込まない
     ための絞り。 */
  var AQUATIC_HABITAT_ORDER=toSet(["Coleoptera","Hemiptera","Diptera"]);
  /* 止水。トンボを水網の対象にするのはヤゴをすくえる種だけ、という線引きに使う
     (tools_design 6 章が さかなとりあみ の対象に「ヤゴ」を明記しているので、トンボを
     まるごと外すことはしない)。渓流性のトンボは網を入れる水面が無く、実際には
     飛んでいる成虫を メッシュネットで採る。 */
  var STILL_WATER_HABITAT=toSet(["pond","marsh","paddy","lake","wetland","bog","water"]);

  /* 地表徘徊。落とし穴に落ちるのは「歩く虫」で、飛翔で移動する虫ではない。 */
  var GROUND_FAMILY=toSet([
    "Carabidae","Cicindelidae","Tenebrionidae","Staphylinidae","Silphidae","Histeridae",
    "Trogidae","Geotrupidae","Passalidae","Scarabaeidae",
    "Formicidae","Gryllidae","Gryllotalpidae","Trigonidiidae","Myrmecophilidae",
    "Blattidae","Blaberidae","Ectobiidae","Corydiidae",
    /* 落ち葉のあいだを歩くもの。ヒシバッタは裸地や苔の上、ツチカメムシとヒョウタン
       ナガカメムシは地表の種子食で、どれも餌なしの落とし穴に入る常連。 */
    "Tetrigidae","Cydnidae","Rhyparochromidae","Anthicidae","Lygaeidae",
    "Scolopendridae","Scutigeridae","Cryptopidae","Armadillidiidae","Porcellionidae",
    "Lycosidae","Gnaphosidae","Salticidae"]);
  var GROUND_HABITAT=toSet(["ground","bareground","sand","seashore"]);
  /* Scarabaeidae は GROUND_FAMILY に入れたが、樹上のハナムグリまで地表にはしない。
     地表として認めるのは habitat か tag が地面を指している個体だけ。 */
  var GROUND_CONDITIONAL_FAMILY=toSet(["Scarabaeidae"]);
  var GROUND_TAGS=toSet(["ground","ground_beetle","osamushi","gomimushi","litter"]);

  /* 樹冠・高所。長竿が届く先。セミとその近縁 (ヨコバイ上科の大型)、樹冠を飛ぶ
     大型のチョウとガ、樹上性の大型カメムシ。 */
  var CANOPY_FAMILY=toSet([
    "Cicadidae","Tettigarctidae","Fulgoridae","Flatidae","Ricaniidae","Membracidae",
    "Achilidae","Issidae","Dictyopharidae","Nogodinidae","Eurybrachidae",
    "Tessaratomidae","Aradidae",
    "Saturniidae","Uraniidae","Castniidae"]);
  var CANOPY_GENUS=toSet([
    "Ornithoptera","Troides","Trogonoptera","Morpho","Charaxes","Attacus","Argema",
    "Coscinocera","Actias","Papilio","Graphium","Idea","Euploea","Danaus",
    "Chrysiridia","Alcides","Urania","Batocera","Rosenbergia","Xixuthrus"]);
  var CANOPY_HABITAT=toSet(["canopy","treetop","tree"]);
  var CANOPY_TAGS=toSet(["canopy","treetop","arboreal","cicada"]);

  /* フンチュウと腐肉食。フントラップは実際には「けもののフンや しがい を餌にする
     わな」で、集まるのはフン食の甲虫だけではない (シデムシ・エンマムシ・クロバエ)。
     図鑑のフン食甲虫は全 DB で 21 種しかなく、これだけでは巻あたり 5% (下限) に
     届かないので、同じわなに実際に来る腐肉食を同じギルドに置く。名前 (フントラップ)
     と blurb はそのままで、対象 guild の説明を「ふんや しがいに あつまる 虫」にする。 */
  var DUNG_SUBFAMILY=toSet(["Scarabaeinae","Aphodiinae","Geotrupinae","Coprinae"]);
  var DUNG_FAMILY=toSet(["Geotrupidae","Silphidae","Trogidae","Scathophagidae",
    "Calliphoridae","Sarcophagidae","Histeridae"]);
  var DUNG_GENUS=toSet([
    "Onthophagus","Copris","Catharsius","Phanaeus","Onitis","Scarabaeus","Gymnopleurus",
    "Paragymnopleurus","Heliocopris","Sisyphus","Liatongus","Caccobius","Oniticellus",
    "Digitonthophagus","Euoniticellus","Aphodius","Colobopterus","Brachiaphodius",
    "Acrossidius","Geotrupes","Phelotrupes","Kheper","Garreta","Proagoderus",
    "Helictopleurus","Epilissus","Nanos","Apotolamprus","Nicrophorus","Necrophila",
    "Oiceoptoma","Ptomascopus","Trox","Scathophaga"]);
  var DUNG_TAGS=toSet(["dung","dung_beetle","coprophagous","carrion","necrophagous"]);
  /* ハネカクシは餌でわなに来る常連 (フン・しがい どちらにも来る)。地表ギルドとも
     重なるが、重なりは許す方針なのでそのまま両方に入れる。 */
  var DUNG_BYCATCH_FAMILY=toSet(["Staphylinidae"]);

  /* フン・しがいギルドの判定。コガネムシ科を樹液ギルドへ入れるかの分岐でも使うので、
     ギルド表より先に関数として置く。 */
  function isDungGuild(sp){
    if(anyOf(tagsOf(sp),DUNG_TAGS))return true;
    if(inSet(sp.subfamily,DUNG_SUBFAMILY))return true;
    if(inSet(genusOf(sp),DUNG_GENUS))return true;
    if(inSet(sp.family,DUNG_FAMILY))return true;
    return inSet(sp.family,DUNG_BYCATCH_FAMILY);
  }
  /* 餌でしか採れない専門家。落とし穴ギルドから外す境界に使う。

     フントラップは餌を入れた落とし穴でもあるので、放っておくと対象が落とし穴の
     完全な部分集合になる (2026-09-06 の実測で 53 種中 51 種が重なり、フントラップを
     装備する理由が「落とし穴の下位互換」になっていた)。そこで、餌に来ることでしか
     捕まらない専門家は落とし穴の側から外し、餌なしの落とし穴には歩く虫 (オサムシ・
     アリ・コオロギ・ゴキブリ・ヒシバッタ) を残す。
     ハネカクシだけは例外で、林床を歩きまわる捕食者でもあるので両方に置く。 */
  function isDungSpecialist(sp){
    return isDungGuild(sp)&&!inSet(sp.family,DUNG_BYCATCH_FAMILY);
  }

  /* 草地スイーピング。網でなでて落ちるのは、草や低木にとまっている虫。
     habitat grassland を必須にすると、林床をなでる採集 (実際にやる) が落ちるうえ、
     habitat が forest しか書かれていない巻で対象が消える。だから分類で引く。 */
  var SWEEP_ORDER=toSet(["Orthoptera"]);
  var SWEEP_FAMILY=toSet([
    "Cicadellidae","Miridae","Pentatomidae","Acanthosomatidae","Scutelleridae",
    "Lygaeidae","Rhyparochromidae","Coreidae","Alydidae","Berytidae","Tingidae",
    "Cercopidae","Aphrophoridae","Machaerotidae","Nabidae","Reduviidae","Anthocoridae",
    "Delphacidae","Psyllidae","Aphididae","Cixiidae",
    "Chrysomelidae","Curculionidae","Attelabidae","Apionidae","Mordellidae",
    "Cantharidae","Oedemeridae","Malachiidae","Coccinellidae",
    "Pyrgomorphidae","Acrididae","Tetrigidae","Tettigoniidae"]);
  /* 花に来るもの。草はらを網でなでると、草だけでなく花の上のハナアブ・ハナバチ・
     カリバチも入る。ここを足す前は 45 種がどの道具の対象でもなく、その大半が
     ハナアブとハナバチだった (2026-09-06 実測)。 */
  var FLOWER_FAMILY=toSet([
    "Syrphidae","Bombyliidae","Tabanidae","Stratiomyidae","Asilidae","Muscidae",
    "Sphecidae","Crabronidae","Pompilidae","Scoliidae","Mutillidae","Tiphiidae",
    "Megachilidae","Andrenidae","Halictidae","Colletidae","Apidae","Vespidae",
    "Meloidae","Pyrochroidae","Cleridae","Largidae","Pyrrhocoridae","Tephritidae"]);
  /* 水生カメムシは草地では採れない。SWEEP から明示的に外す。 */

  /* ビーティング。枝や葉を叩いて白布へ落とす。落ちてくるのは枝葉にしがみつく虫。 */
  var BEATING_ORDER=toSet(["Phasmatodea","Mantodea","Neuroptera","Araneae"]);
  var BEATING_FAMILY=toSet([
    "Curculionidae","Attelabidae","Chrysomelidae","Cerambycidae","Coccinellidae",
    "Buprestidae","Elateridae","Lycidae","Cantharidae","Mordellidae","Erotylidae",
    "Endomychidae","Anthribidae","Brentidae",
    "Pentatomidae","Acanthosomatidae","Scutelleridae","Tessaratomidae","Coreidae",
    "Reduviidae","Miridae","Tingidae","Membracidae","Fulgoridae","Flatidae","Ricaniidae",
    "Chrysopidae","Hemerobiidae","Myrmeleontidae"]);

  /* 樹液・熟果。バナナトラップに来るもの。 */
  var SAP_FAMILY=toSet([
    "Lucanidae","Passalidae","Nitidulidae","Cetoniidae","Trogossitidae",
    "Nymphalidae","Riodinidae",
    "Drosophilidae","Tephritidae","Vespidae","Apidae","Cerambycidae"]);
  var SAP_GENUS=toSet([
    "Charaxes","Morpho","Polyura","Apatura","Sasakia","Neptis","Euploea","Idea",
    "Xylotrupes","Dynastes","Chalcosoma","Allomyrina","Trypoxylus","Oryctes",
    "Protaetia","Cetonia","Eupoecila","Chondropyga","Neorrhina","Rhomborrhina",
    "Anoplognathus","Dicronocephalus","Torynorrhina"]);
  var SAP_GROUP=toSet(["カブトムシ","カブト","クワガタ","ハナムグリ","カナブン","タテハ"]);
  /* コガネムシ科は樹液・花に来る亜科 (ハナムグリ・カナブン・カブト) だけを樹液へ。
     groupJa で割れる (図鑑は全 1950 種に groupJa を持つ)。 */

  /* 夜行性 (灯火)。ガに加えて、灯火採集の主役である大型甲虫と、水生昆虫の
     夜間飛来 (トビケラ・ヘビトンボ・ゲンゴロウ) を含める。 */
  var NOCTURNAL_ORDER=toSet(["Trichoptera","Megaloptera","Neuroptera","Ephemeroptera",
    "Plecoptera","Blattodea"]);
  var NOCTURNAL_FAMILY=toSet([
    "Lucanidae","Passalidae","Dytiscidae","Hydrophilidae","Belostomatidae","Nepidae",
    "Elateridae","Lampyridae","Gryllotalpidae","Fulgoridae","Cixiidae","Delphacidae",
    "Scarabaeidae"]);
  var NOCTURNAL_SCARAB_GROUP=toSet(["カブトムシ","カブト","コガネ","コガネムシ"]);
  var NOCTURNAL_TAGS=toSet(["night","nocturnal","dusk","firefly","moth"]);

  /* 微小。吸虫管でしか扱えない大きさ。分類で当てたうえで、sizeMm があるときだけ
     大きさでも拾う (sizeMm はマダガスカル遠征 II で 0 件なので、必須にはできない)。 */
  var SMALL_MAX_MM=15;
  var TINY_FAMILY=toSet([
    "Formicidae","Coccinellidae","Chrysomelidae","Cicadellidae","Aphididae",
    "Aleyrodidae","Diaspididae","Coccidae","Psyllidae","Delphacidae","Anthocoridae",
    "Drosophilidae","Chloropidae","Phoridae","Sciaridae","Ceratopogonidae",
    "Halictidae","Andrenidae","Braconidae","Ichneumonidae","Chalcididae","Mymaridae",
    "Formicidae","Apionidae","Latridiidae","Staphylinidae","Nitidulidae"]);
  /* 大きさで拾うときに外す目。チョウとトンボは小型でも吸虫管では扱わない
     (羽が傷む。ちょうネット / トンボ用メッシュネットの領分)。 */
  var TINY_EXCLUDE_ORDER=toSet(["Lepidoptera","Odonata"]);

  /* --- ギルド定義 ----------------------------------------------------------
     key は道具側 (shared/tools.js) が参照する識別子。ja は交換画面と道具箱に
     出す対象 guild の説明で、5 歳コースでも読めるかなに寄せる。 */
  var GUILDS=[
    {
      key:"butterfly", ja:"ひるに とぶ チョウ",
      match:function(sp){
        if(sp.order!=="Lepidoptera")return false;
        return inSet(sp.family,BUTTERFLY_FAMILY)||inSet(sp.family,DAY_MOTH_FAMILY)
          ||anyOf(tagsOf(sp),toSet(["butterfly"]));
      }
    },
    {
      key:"dragonfly", ja:"トンボ",
      match:function(sp){return sp.order==="Odonata";}
    },
    {
      key:"nocturnal", ja:"よるに とぶ 虫",
      match:function(sp){
        if(sp.order==="Lepidoptera"){
          /* ガ = 鱗翅のうちチョウでも昼行性のガでもないもの。科の白名簿を持たずに
             引けるので、新しい巻で見たことのないガ科が来ても落ちない。 */
          return !inSet(sp.family,BUTTERFLY_FAMILY)&&!inSet(sp.family,DAY_MOTH_FAMILY);
        }
        if(inSet(sp.order,NOCTURNAL_ORDER))return true;
        if(inSet(sp.family,NOCTURNAL_FAMILY)){
          /* コガネムシ科は灯火に来る大型 (カブト・コガネ) だけ。ハナムグリは昼。 */
          if(sp.family==="Scarabaeidae")return inSet(sp.groupJa,NOCTURNAL_SCARAB_GROUP);
          return true;
        }
        return anyOf(tagsOf(sp),NOCTURNAL_TAGS)||(sp.note||"").indexOf("夜")>=0;
      }
    },
    {
      key:"sap", ja:"きの しるに あつまる 虫",
      match:function(sp){
        /* コガネムシ科はフン食のものを除いて樹液へ。カブト・ハナムグリ・カナブンだけを
           白名簿で拾う書き方も試したが、根食いの Anoplognathus のような「どちらとも
           言い切れない」種が落ち、公開済みのバナナトラップが更新 4 の巻で 11.9% から
           4.8% へ下がった (2026-09-06 実測)。フンチュウでなければ甘い餌に来る、と
           見なすほうが実際に近く、公開済みの道具の効きも落とさない。 */
        if(sp.family==="Scarabaeidae")return !isDungGuild(sp);
        return inSet(sp.family,SAP_FAMILY)||inSet(sp.groupJa,SAP_GROUP)||inSet(genusOf(sp),SAP_GENUS);
      }
    },
    {
      key:"grassland", ja:"くさはらの バッタや カメムシ",
      match:function(sp){
        /* 水生の家系は草地では採れない。先に外す。 */
        if(inSet(sp.family,AQUATIC_FAMILY))return false;
        if(inSet(sp.order,SWEEP_ORDER))return true;
        return inSet(sp.family,SWEEP_FAMILY)||inSet(sp.family,FLOWER_FAMILY);
      }
    },
    {
      key:"aquatic", ja:"みずべの 虫",
      match:function(sp){
        /* トンボは止水性のものだけ。トンボ用メッシュネットとの境界をここで引く
           (2026-09-06 決定。以前は habitat に pond や stream があるだけで一致し、
           トンボ 163 種のうち 139 種 = 85% が水網とも重なっていた。止水に限ると
           100 種 = 61% になり、両方の道具に固有の領分が残る)。 */
        if(sp.order==="Odonata")return anyOf(habitatOf(sp),STILL_WATER_HABITAT);
        if(inSet(sp.order,AQUATIC_ORDER))return true;
        if(inSet(sp.family,AQUATIC_FAMILY))return true;
        if(inSet(sp.order,AQUATIC_HABITAT_ORDER)&&anyOf(habitatOf(sp),AQUATIC_HABITAT))return true;
        return anyOf(tagsOf(sp),toSet(["aquatic","water"]));
      }
    },
    {
      key:"hidden", ja:"えだに かくれる 虫",
      match:function(sp){
        if(inSet(sp.family,AQUATIC_FAMILY))return false;
        return inSet(sp.order,BEATING_ORDER)||inSet(sp.family,BEATING_FAMILY);
      }
    },
    {
      key:"tiny", ja:"とても ちいさい 虫",
      match:function(sp){
        if(inSet(sp.order,TINY_EXCLUDE_ORDER))return false;
        if(inSet(sp.family,TINY_FAMILY))return true;
        var upper=upperSizeMm(sp);
        return upper!==null&&upper<SMALL_MAX_MM;
      }
    },
    {
      key:"canopy", ja:"たかい ところの 虫",
      match:function(sp){
        if(inSet(sp.family,CANOPY_FAMILY))return true;
        if(inSet(genusOf(sp),CANOPY_GENUS))return true;
        if(anyOf(habitatOf(sp),CANOPY_HABITAT)||anyOf(tagsOf(sp),CANOPY_TAGS))return true;
        /* 大型のカミキリは樹冠性が多い。長竿の対象として自然で、ビーティングとの
           重なりは許す (同じ虫を枝から落とすか、竿ですくうかの違いでしかない)。 */
        if(sp.family==="Cerambycidae"){
          var upper=upperSizeMm(sp);
          return upper!==null&&upper>=40;
        }
        return false;
      }
    },
    {
      key:"ground", ja:"じめんを あるく 虫",
      match:function(sp){
        /* 餌でしか採れない専門家はフントラップの領分。 */
        if(isDungSpecialist(sp))return false;
        if(inSet(sp.family,GROUND_CONDITIONAL_FAMILY))
          return anyOf(habitatOf(sp),GROUND_HABITAT)||anyOf(tagsOf(sp),GROUND_TAGS);
        if(inSet(sp.family,GROUND_FAMILY))return true;
        if(anyOf(tagsOf(sp),GROUND_TAGS))return true;
        /* 飛ばない甲虫が地面にいると書かれていれば地表。 */
        return sp.order==="Coleoptera"&&anyOf(habitatOf(sp),GROUND_HABITAT);
      }
    },
    {
      key:"dung", ja:"ふんや しがいに あつまる 虫",
      match:isDungGuild
    }
  ];

  var BY_KEY=Object.create(null);
  GUILDS.forEach(function(guild){BY_KEY[guild.key]=guild;});

  function keys(){return GUILDS.map(function(guild){return guild.key;});}
  function get(key){return BY_KEY[key]||null;}
  /* その種がそのギルドか。知らない key と種でない値は false (道具を増やす途中で
     key を打ち間違えても、当たりっぱなしにはならない)。 */
  function has(key,sp){
    var guild=BY_KEY[key];
    if(!guild||!sp||typeof sp!=="object")return false;
    return !!guild.match(sp);
  }
  /* その種が属するギルドの一覧。監査 (tests/test_species_guilds.js) と、
     将来の道具追加時の下調べで使う。 */
  function keysOf(sp){
    return GUILDS.filter(function(guild){return has(guild.key,sp);})
      .map(function(guild){return guild.key;});
  }
  function labelOf(key){var guild=BY_KEY[key];return guild?guild.ja:"";}

  global.Q4B_GUILDS={
    keys:keys, get:get, has:has, keysOf:keysOf, label:labelOf,
    /* 大きさの境目だけは道具側 (吸虫管) の説明にも出るので公開する。 */
    SMALL_MAX_MM:SMALL_MAX_MM
  };
})(typeof globalThis!=="undefined"?globalThis:this);
