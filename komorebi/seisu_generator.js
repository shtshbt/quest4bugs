/* 整数の性質 (kom_seisu) の全問生成器。
   仕様の正本は docs/komorebi_seisu_curriculum.md (v0.6)。敵ソルバーの攻撃集合は
   docs/komorebi_seisu_audit.md 7.4 章。静的プールは持たない (9.1 章)。

   このカテゴリが潰す弱点は「場面が公倍数を求めるものか公約数を求めるものかを、
   語ではなく数量関係で判断できない」の 1 点 (1 章)。したがって生成器の中心は
   問題文の作りではなく、大小語・与件の個数・境界の種類と大小と有効性のどれからも
   向き (gcd / lcm) が引けない状態をセット単位で作ることにある (4.4 章)。

   Math.random と Date.now は呼ばない。乱数は呼び出し側から注入された random() のみ
   (9.1 章。既存 komorebi 生成器の規約)。 */
(function(global){
  "use strict";

  var CAT="kom_seisu";
  var SET_SIZE=5;

  /* --- 3.1 章の pattern 正本 (47 種) -------------------------------------
     patternId は pattern 名そのもの。別体系を作らない (sakumon 教訓 2)。 */
  var PATTERNS={
    div_count:{domain:"divisor",direction:"none",unknown:"count"},
    div_missing:{domain:"divisor",direction:"none",unknown:"source"},
    div_extra:{domain:"divisor",direction:"none",unknown:"source"},
    div_select:{domain:"divisor",direction:"none",unknown:"list"},
    nondiv_select:{domain:"divisor",direction:"none",unknown:"list"},
    mul_select:{domain:"multiple",direction:"none",unknown:"list"},
    mul_count:{domain:"multiple",direction:"none",unknown:"count"},
    mul_capped:{domain:"multiple",direction:"none",unknown:"capped"},
    mul_nth:{domain:"multiple",direction:"none",unknown:"nth"},
    gcd_num:{domain:"common",direction:"gcd",unknown:"gcd"},
    lcm_num:{domain:"common",direction:"lcm",unknown:"lcm"},
    common_div_count:{domain:"common",direction:"gcd",unknown:"count"},
    common_div_select:{domain:"common",direction:"gcd",unknown:"commonList"},
    common_mul_select:{domain:"common",direction:"lcm",unknown:"commonList"},
    gcd3_num:{domain:"common",direction:"gcd",unknown:"gcd"},
    lcm3_num:{domain:"common",direction:"lcm",unknown:"lcm"},
    common_div3_select:{domain:"common",direction:"gcd",unknown:"commonList"},
    common_mul3_select:{domain:"common",direction:"lcm",unknown:"commonList"},
    scene_gcd_size:{domain:"scene",direction:"gcd",unknown:"size"},
    scene_gcd_capped:{domain:"scene",direction:"gcd",unknown:"capped"},
    scene_gcd_count:{domain:"scene",direction:"gcd",unknown:"people"},
    scene_gcd_ways:{domain:"scene",direction:"gcd",unknown:"ways"},
    scene_lcm_ways:{domain:"scene",direction:"lcm",unknown:"ways"},
    scene_gcd_nth:{domain:"scene",direction:"gcd",unknown:"nth"},
    scene_lcm_size:{domain:"scene",direction:"lcm",unknown:"size"},
    scene_lcm_floored:{domain:"scene",direction:"lcm",unknown:"size"},
    scene_lcm_capped:{domain:"scene",direction:"lcm",unknown:"capped"},
    scene_lcm_time:{domain:"scene",direction:"lcm",unknown:"time"},
    scene_lcm_nth:{domain:"scene",direction:"lcm",unknown:"nthTime"},
    factorize:{domain:"factor",direction:"none",unknown:"factorization"},
    gcd_by_factor:{domain:"factor",direction:"gcd",unknown:"gcd"},
    lcm_by_factor:{domain:"factor",direction:"lcm",unknown:"lcm"},
    procedure_gcd:{domain:"factor",direction:"gcd",unknown:"gcd"},
    procedure_lcm:{domain:"factor",direction:"lcm",unknown:"lcm"},
    factor_count:{domain:"factor",direction:"none",unknown:"divisorCount"},
    factor_count_cond:{domain:"factor",direction:"none",unknown:"divisorCount"},
    prime_check:{domain:"factor",direction:"none",unknown:"primes"},
    rem_same:{domain:"remainder",direction:"lcm",unknown:"dividend"},
    rem_zero:{domain:"remainder",direction:"lcm",unknown:"dividend"},
    rem_divisor:{domain:"remainder",direction:"gcd",unknown:"divisorOf"},
    rem_count:{domain:"remainder",direction:"none",unknown:"count"},
    rem_same_select:{domain:"remainder",direction:"lcm",unknown:"list"},
    rem_zero_select:{domain:"remainder",direction:"lcm",unknown:"list"},
    cycle_weekday:{domain:"cycle",direction:"none",unknown:"position"},
    cycle_weekday_back:{domain:"cycle",direction:"none",unknown:"position"},
    cycle_count:{domain:"cycle",direction:"none",unknown:"rounds"},
    cycle_align_count:{domain:"cycle",direction:"lcm",unknown:"rounds"}
  };

  /* 9.3 章の unknown の全列挙 (20 種)。ここに無い値を持つ問題を作らない (検証 15)。 */
  var UNKNOWN_VALUES=["count","list","source","nth","gcd","lcm","commonList","size","people","ways",
    "capped","time","nthTime","factorization","divisorCount","primes","dividend","divisorOf","position","rounds"];

  /* 3.2 章の対比ペア型 (12 種)。 */
  var PAIR_TYPES=["P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11","P12"];

  var SCENE_ALL=["scene_gcd_size","scene_gcd_capped","scene_gcd_count","scene_gcd_ways","scene_gcd_nth",
    "scene_lcm_size","scene_lcm_floored","scene_lcm_capped","scene_lcm_ways","scene_lcm_time","scene_lcm_nth"];

  /* --- 9.4 章の Lv 別 patternId 空間 -----------------------------------------
     Lv9 は 9.4 章の表が 5 種と書くが、付録 A.9 (実在証明) と 6 章の例 4 と 13 章の
     v0.4 修正 8 (N6) が scene_gcd_size を含む 6 種としている。実在証明を採る。 */
  var LV_PATTERNS={
    1:["div_count","div_missing","div_extra","div_select","nondiv_select"],
    2:["mul_select","div_select","mul_count","mul_capped","mul_nth"],
    3:["gcd_num","lcm_num","common_div_count","common_div_select","common_mul_select"],
    4:["scene_gcd_size","scene_gcd_count","scene_gcd_nth","scene_lcm_size","scene_lcm_capped","scene_lcm_nth"],
    5:["factorize","gcd_by_factor","lcm_by_factor","procedure_gcd","procedure_lcm","factor_count","factor_count_cond","prime_check"],
    6:SCENE_ALL.slice(),
    7:["rem_same","rem_zero","rem_divisor","rem_count","rem_same_select","rem_zero_select"],
    8:["cycle_weekday","cycle_weekday_back","cycle_count","cycle_align_count"],
    9:["gcd_num","lcm_num","common_div_select","common_mul_select","scene_lcm_time","scene_gcd_size"],
    10:[]
  };
  (function(){
    /* Lv10 は 3.1 章の 47 種から Lv1 専用の 4 種を除いた 43 種 (9.4 章)。 */
    var lv1only={div_count:true,div_missing:true,div_extra:true,nondiv_select:true};
    LV_PATTERNS[10]=Object.keys(PATTERNS).filter(function(id){return !lv1only[id];});
  })();
  var PATTERN_SPACE={};
  Object.keys(LV_PATTERNS).forEach(function(lv){PATTERN_SPACE[lv]=LV_PATTERNS[lv].length;});

  /* 5.2 章の形式配合。Lv10 だけ固定配合を持たない (整列 1 + 4 形式から 4 問)。 */
  var FORMAT_MIX={
    1:{normal:3,find_all:2,formulation:0,ordering:0,diagnosis:0},
    2:{normal:3,find_all:2,formulation:0,ordering:0,diagnosis:0},
    3:{normal:3,find_all:2,formulation:0,ordering:0,diagnosis:0},
    4:{normal:2,find_all:0,formulation:3,ordering:0,diagnosis:0},
    5:{normal:2,find_all:0,formulation:0,ordering:2,diagnosis:1},
    6:{normal:2,find_all:0,formulation:1,ordering:0,diagnosis:2},
    7:{normal:3,find_all:1,formulation:1,ordering:0,diagnosis:0},
    8:{normal:2,find_all:0,formulation:2,ordering:0,diagnosis:1},
    9:{normal:2,find_all:1,formulation:0,ordering:0,diagnosis:2}
  };

  /* 8 章の診断ラベル正本。canonical 文言はこの表のみを使う。 */
  var DIAGNOSIS_LABELS={
    correct:"正しい",
    swap_gcd_lcm:"公約数と公倍数を取りちがえている",
    word_cue:"大小のことばにつられている",
    not_minimal:"公倍数だがいちばん小さくない",
    not_maximal:"公約数だがいちばん大きくない",
    quotient_remainder:"商とあまりを取りちがえている",
    factor_incomplete:"素数までわり切れていない",
    count_off:"数えかたが 1 ずれている",
    calc_only:"計算だけまちがえている"
  };
  /* 8.1 章の Lv 別可用ラベル (誤りラベルのみ。正答肢は全 Lv で correct の 1 種)。 */
  var AVAILABLE_ERRORS={
    5:["count_off","factor_incomplete","calc_only"],
    6:["swap_gcd_lcm","word_cue","not_minimal","not_maximal","count_off","calc_only"],
    8:["quotient_remainder","count_off","swap_gcd_lcm","calc_only"],
    9:["swap_gcd_lcm","not_minimal","not_maximal","word_cue","calc_only"],
    10:["swap_gcd_lcm","word_cue","not_minimal","not_maximal","quotient_remainder","factor_incomplete","count_off","calc_only"]
  };

  /* 7.1 章のわざ。文言はこの表のみを使う (検証 36)。 */
  var WAZA_ROWS={
    gcd_dir:{text:"分ける話なら公約数。答えはもとの数より小さい",levels:[3,4,6,9,10]},
    lcm_dir:{text:"そろえる話なら公倍数。答えはもとの数より大きい",levels:[3,4,6,8,9,10]},
    divisor_dir:{text:"割る数を聞かれたら、あまりを引いてから約数を考える",levels:[7,10]},
    say_first:{text:"何を分けるのか、何をそろえるのかを先に言う",levels:[4,6,10]},
    rem_pos:{text:"あまりはくり返しの中の位置。商はくり返しの回数",levels:[8,10]},
    factor_step:{text:"小さい素数から順にわって、素数だけにする",levels:[5,10]},
    count_rule:{text:"約数の個数は、素因数の個数に 1 をたしてかける",levels:[1,5,10]},
    check_div:{text:"公約数は 2 数のどちらもわり切る。かけてもどして確かめる",levels:[1,3,5,9,10]},
    check_lcm:{text:"最小公倍数は 2 数の積をこえない",levels:[3,6,9,10]},
    three:{text:"3 つでも同じ。共通する素数を集めれば公約数、多いほうの回数をとれば公倍数",levels:[10]},
    small:{text:"小さい数で一度やってみる",levels:[1,2,3,4,5,6,7,8,9,10]}
  };
  var WAZA_BY_PATTERN={
    div_count:["count_rule","check_div"],div_missing:["count_rule","check_div"],div_extra:["count_rule","check_div"],
    div_select:["check_div"],nondiv_select:["check_div"],
    mul_select:["lcm_dir"],mul_count:["lcm_dir"],mul_capped:["lcm_dir"],mul_nth:["lcm_dir"],
    gcd_num:["gcd_dir","check_div"],lcm_num:["lcm_dir","check_lcm"],
    common_div_count:["check_div"],common_div_select:["gcd_dir","check_div"],common_mul_select:["lcm_dir","check_lcm"],
    gcd3_num:["three"],lcm3_num:["three"],common_div3_select:["three"],common_mul3_select:["three"],
    scene_gcd_size:["gcd_dir","say_first"],scene_gcd_capped:["gcd_dir","say_first"],
    scene_gcd_count:["gcd_dir","say_first"],scene_gcd_ways:["gcd_dir","say_first"],
    scene_gcd_nth:["gcd_dir","say_first"],scene_lcm_size:["lcm_dir","say_first"],
    scene_lcm_floored:["lcm_dir","say_first"],scene_lcm_capped:["lcm_dir","say_first"],
    scene_lcm_ways:["lcm_dir","say_first"],scene_lcm_time:["lcm_dir","say_first"],scene_lcm_nth:["lcm_dir","say_first"],
    factorize:["factor_step"],gcd_by_factor:["factor_step","gcd_dir"],lcm_by_factor:["factor_step","lcm_dir"],
    procedure_gcd:["gcd_dir","factor_step"],procedure_lcm:["lcm_dir","factor_step"],
    factor_count:["count_rule"],factor_count_cond:["count_rule"],prime_check:["factor_step"],
    rem_same:["lcm_dir"],rem_zero:["lcm_dir"],rem_divisor:["divisor_dir"],rem_count:["lcm_dir"],
    rem_same_select:["lcm_dir"],rem_zero_select:["lcm_dir"],
    cycle_weekday:["rem_pos"],cycle_weekday_back:["rem_pos"],cycle_count:["rem_pos"],cycle_align_count:["rem_pos","lcm_dir"]
  };

  var WEEKDAYS=["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];
  var PERSON_NAMES=["りく","みう","かいと","そうた","ゆうま","れん","あおい","はると"];

  /* --- 乱数ヘルパ。すべて注入 random を通す (4.6 章) ------------------------- */
  function randomValue(random){
    var value=random();
    if(typeof value!=="number"||!isFinite(value)||value<0||value>=1)throw new Error("乱数の値が正しくありません");
    return value;
  }
  function randomInt(random,min,max){
    if(max<min)throw new Error("乱数の範囲が正しくありません");
    return min+Math.floor(randomValue(random)*(max-min+1));
  }
  function pick(list,random){
    if(!list||!list.length)throw new Error("選ぶものがありません");
    return list[Math.floor(randomValue(random)*list.length)];
  }
  function shuffle(list,random){
    var copy=list.slice();
    for(var i=copy.length-1;i>0;i--){
      var j=Math.floor(randomValue(random)*(i+1)),tmp=copy[i];copy[i]=copy[j];copy[j]=tmp;
    }
    return copy;
  }
  function sample(list,count,random){return shuffle(list,random).slice(0,count);}

  /* --- 数論ヘルパ。すべて整数演算で閉じる (検証 1) --------------------------- */
  function gcd(a,b){while(b){var t=a%b;a=b;b=t;}return a;}
  function gcd3(a,b,c){return gcd(gcd(a,b),c);}
  function lcm(a,b){return a/gcd(a,b)*b;}
  function lcm3(a,b,c){return lcm(lcm(a,b),c);}
  function divisors(n){
    var out=[];
    for(var d=1;d*d<=n;d++)if(n%d===0){out.push(d);if(d!==n/d)out.push(n/d);}
    return out.sort(function(x,y){return x-y;});
  }
  function commonDivisors(a,b){return divisors(gcd(a,b));}
  function isPrime(n){
    if(n<2)return false;
    for(var d=2;d*d<=n;d++)if(n%d===0)return false;
    return true;
  }
  function primeFactors(n){
    var out=[],value=n,d=2;
    while(d*d<=value){while(value%d===0){out.push(d);value=value/d;}d++;}
    if(value>1)out.push(value);
    return out;
  }
  function factorExponents(n){
    var map={};
    primeFactors(n).forEach(function(p){map[p]=(map[p]||0)+1;});
    return Object.keys(map).map(Number).sort(function(a,b){return a-b;}).map(function(p){return {prime:p,exp:map[p]};});
  }
  function factorProduct(n){return primeFactors(n).join("×");}
  function divisorCount(n){return factorExponents(n).reduce(function(acc,item){return acc*(item.exp+1);},1);}
  function range(min,max){var out=[];for(var i=min;i<=max;i++)out.push(i);return out;}
  function unique(list){
    var seen={},out=[];
    list.forEach(function(value){if(!seen[value]){seen[value]=true;out.push(value);}});
    return out;
  }
  function sortNum(list){return list.slice().sort(function(a,b){return a-b;});}
  function sameSet(a,b){
    var x=sortNum(a),y=sortNum(b);
    return x.length===y.length&&x.every(function(value,index){return value===y[index];});
  }

  /* --- 9.2 章のパラメタ帯 ---------------------------------------------------- */
  var BANDS={
    divisorN:{min:12,max:100},
    multipleN:{min:3,max:15},
    multipleCap:{min:30,max:300},
    multipleK:{min:4,max:60},
    overlapK:{min:30,max:60},
    commonAB:{min:6,max:60},
    sceneRank:{min:2,max:5},
    factorN:{min:24,max:200},
    primeRange:{min:10,max:50},
    remDivisor:{min:2,max:12},
    remDividend:{min:20,max:120},
    remRange:{min:50,max:300},
    cycleDays:{min:20,max:200},
    cycleUnit:{min:4,max:30}
  };

  /* 与件の帯 (9.2 章)。common と scene は同じ帯から引く。 */
  function drawDivisorN(random){
    var pool=range(BANDS.divisorN.min,BANDS.divisorN.max).filter(function(n){
      var count=divisors(n).length;return count>=4&&count<=12&&!isPrime(n);
    });
    return pick(pool,random);
  }
  function drawSquareN(random){
    /* 平方数を優先する (6 章 Lv1 の誤答の典型。div_missing の N 選択)。 */
    var squares=[16,36,64,100].filter(function(n){
      var count=divisors(n).length;return count>=5&&count<=12;
    });
    if(randomValue(random)<0.6)return pick(squares,random);
    return drawDivisorN(random);
  }
  function drawCommonPair(random){
    var pool=[];
    for(var a=BANDS.commonAB.min;a<=BANDS.commonAB.max;a++){
      for(var b=a+1;b<=BANDS.commonAB.max;b++){
        if(gcd(a,b)>=2&&lcm(a,b)<=200)pool.push([a,b]);
      }
    }
    return pick(pool,random);
  }
  function drawCommonPairWith(random,filter){
    var pool=[];
    for(var a=BANDS.commonAB.min;a<=BANDS.commonAB.max;a++){
      for(var b=a+1;b<=BANDS.commonAB.max;b++){
        if(gcd(a,b)>=2&&lcm(a,b)<=200&&filter(a,b))pool.push([a,b]);
      }
    }
    if(!pool.length)throw new Error("2 量の帯に条件を満たす組がありません");
    return pick(pool,random);
  }
  function drawTriple(random){
    /* 3 数 (Lv10 限定)。3 数の最大公約数 2 以上、最小公倍数 4 桁以内。 */
    for(var attempt=0;attempt<400;attempt++){
      var g=pick([2,3,4,6],random),k=sample(range(2,10),3,random).sort(function(x,y){return x-y;});
      var a=g*k[0],b=g*k[1],c=g*k[2];
      if(a<BANDS.commonAB.min||c>BANDS.commonAB.max)continue;
      if(gcd3(a,b,c)<2)continue;
      var l=lcm3(a,b,c);
      if(l>9999||l<12)continue;
      if(a===b||b===c||a===c)continue;
      return {a:a,b:b,c:c,g:gcd3(a,b,c),l:l};
    }
    throw new Error("3 数の帯に条件を満たす組がありません");
  }
  function drawFactorN(random){
    var pool=[];
    for(var n=BANDS.factorN.min;n<=BANDS.factorN.max;n++){
      var exps=factorExponents(n);
      if(exps.length<2||exps.length>3)continue;
      if(exps.some(function(item){return [2,3,5,7].indexOf(item.prime)<0;}))continue;
      pool.push(n);
    }
    return pick(pool,random);
  }

  /* --- 問題オブジェクトの土台 (9.3 章) ------------------------------------- */
  function wazaFor(pattern,lv){
    var keys=WAZA_BY_PATTERN[pattern]||[],primaryKey=null,alternateKey=null;
    keys.forEach(function(key){if(!primaryKey&&WAZA_ROWS[key].levels.indexOf(lv)>=0)primaryKey=key;});
    if(!primaryKey)primaryKey="small";
    if(primaryKey!=="small")alternateKey="small";
    else Object.keys(WAZA_ROWS).forEach(function(key){
      if(!alternateKey&&key!=="small"&&WAZA_ROWS[key].levels.indexOf(lv)>=0)alternateKey=key;
    });
    return {primary:WAZA_ROWS[primaryKey].text,alternate:WAZA_ROWS[alternateKey||"small"].text};
  }
  function baseQuestion(spec){
    var meta=PATTERNS[spec.pattern];
    if(!meta)throw new Error("問題型の指定が正しくありません: "+spec.pattern);
    return {
      cat:CAT,format:spec.format,kind:spec.kind,lv:spec.lv,
      domain:meta.domain,direction:meta.direction,
      ask:spec.ask||"none",unknown:meta.unknown,
      template:spec.template||null,
      pattern:spec.pattern,patternId:spec.pattern,
      params:spec.params||{},numbers:spec.numbers||[],
      boundary:spec.boundary||null,agreement:spec.agreement||null,phrase:spec.phrase||null,
      text:spec.text,scaffold:null,work:spec.work||null,
      choices:spec.choices||null,ans:typeof spec.ans==="undefined"?null:spec.ans,
      ansSet:spec.ansSet||null,candidates:spec.candidates||null,
      parts:spec.parts||null,displayOrder:spec.displayOrder||null,design:spec.design||null,
      errorType:spec.errorType||null,alternative:!!spec.alternative,
      askVariant:spec.askVariant||null,workExpression:spec.workExpression||null,workReason:spec.workReason||null,
      pairId:null,pairType:null,chainId:null,
      waza:wazaFor(spec.pattern,spec.lv)
    };
  }
  /* 選択肢は必ず注入 random で shuffle して正解位置を散らす (4.6 章、検証 29)。 */
  function placeChoices(question,entries,random){
    if(entries.length!==4)throw new Error("選択肢は 4 個です");
    var seen=[];
    entries.forEach(function(entry){
      if(typeof entry.value!=="number")return;
      if(seen.indexOf(entry.value)>=0)throw new Error("誤答が正解と数値的に同値です");
      seen.push(entry.value);
    });
    var texts={};
    entries.forEach(function(entry){
      if(texts[entry.text])throw new Error("選択肢の文言が重複しています");
      texts[entry.text]=true;
    });
    var order=shuffle(entries,random);
    question.choices=order.map(function(entry){return entry.text;});
    question.choiceValues=order.map(function(entry){return entry.value;});
    question.choiceErrors=order.map(function(entry){return entry.error||null;});
    var index=-1;
    order.forEach(function(entry,at){if(entry.correct)index=at;});
    if(index<0)throw new Error("正解の肢がありません");
    question.ans=index;
    return question;
  }
  /* find_all の正解集合は ansSet で持つ (9.3 章)。候補の並びも shuffle する。 */
  function placeCandidates(question,candidates,correctValues,random){
    var order=shuffle(candidates,random),lookup={};
    correctValues.forEach(function(value){lookup[value]=true;});
    question.choices=order.map(String);
    question.candidates=order.slice();
    question.ansSet=order.map(function(value,index){return lookup[value]?index:-1;}).filter(function(i){return i>=0;});
    question.ans=null;
    if(order.length<5||order.length>9)throw new Error("候補の個数が 5 から 9 の外です");
    if(question.ansSet.length<2||question.ansSet.length>=order.length)throw new Error("候補提示型の正解集合が正しくありません");
    return question;
  }

  /* ==========================================================================
     Lv1 から Lv3 (弾層)
     ========================================================================== */
  function buildDivCount(lv,random,forced){
    var n=typeof forced==="number"?forced:drawDivisorN(random);
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"div_count",ask:"count",
      params:{n:n},numbers:[n],text:n+" の約数は全部で何個ですか。",ans:divisors(n).length});
  }
  function divMissingData(random,forced){
    var n=typeof forced==="number"?forced:drawSquareN(random);
    var list=divisors(n),removed=pick(list.filter(function(d){return d>1&&d<n;}),random);
    var outside=range(2,n).filter(function(v){return n%v!==0;});
    var inserted=pick(outside.filter(function(v){return v<n;}),random);
    var shown=sortNum(list.filter(function(d){return d!==removed;}).concat([inserted]));
    return {n:n,list:shown,removed:removed,inserted:inserted};
  }
  function divMissingText(data){
    return data.n+" の約数を小さい順にならべたら "+data.list.join(", ")
      +" になりました。ただし 1 つぬけていて、1 つ約数でないものがまざっています。";
  }
  function buildDivMissing(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"div_missing",
      params:{n:data.n,list:data.list},numbers:[data.n],
      text:divMissingText(data)+"ぬけている数はいくつですか。",ans:data.removed});
  }
  function buildDivExtra(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"div_extra",
      params:{n:data.n,list:data.list},numbers:[data.n],
      text:divMissingText(data)+"まざっている数はどれですか。",ans:data.inserted});
  }
  function divisorCandidates(n,random){
    /* 候補は 5 個から 9 個。約数と非約数を混ぜ、n の倍数 (もう一方の向きの集合) を 1 個以上入れる。 */
    var inside=divisors(n).filter(function(d){return d>1&&d<n;});
    var outside=range(2,Math.min(60,n*2)).filter(function(v){return n%v!==0;});
    var takeIn=sample(inside,Math.min(3,inside.length),random);
    var takeOut=sample(outside,3,random);
    var multiple=n*pick([2,3],random);
    return sortNum(unique(takeIn.concat(takeOut).concat([multiple])));
  }
  function buildDivSelect(lv,n,candidates,random){
    var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:"div_select",ask:"count",
      params:{n:n},numbers:[n],text:candidates.join(", ")+" から "+n+" の約数をすべてえらびましょう。"});
    return placeCandidates(q,candidates,candidates.filter(function(v){return n%v===0;}),random);
  }
  function buildNonDivSelect(lv,n,candidates,random){
    var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:"nondiv_select",ask:"count",
      params:{n:n},numbers:[n],text:candidates.join(", ")+" から "+n+" の約数でないものをすべてえらびましょう。"});
    return placeCandidates(q,candidates,candidates.filter(function(v){return n%v!==0;}),random);
  }
  function buildLv1(random){
    var countN=drawDivisorN(random),data=divMissingData(random);
    var selectN,candidates;
    for(var attempt=0;attempt<200;attempt++){
      selectN=drawDivisorN(random);
      candidates=divisorCandidates(selectN,random);
      var hit=candidates.filter(function(v){return selectN%v===0;}).length;
      if(candidates.length>=5&&candidates.length<=9&&hit>=2&&hit<=candidates.length-2)break;
      candidates=null;
    }
    if(!candidates)throw new Error("Lv1 の候補を作れません");
    var missing=buildDivMissing(1,data),extra=buildDivExtra(1,data);
    markPair(missing,extra,"P9");
    return finalize(1,[buildDivCount(1,random,countN),buildDivSelect(1,selectN,candidates,random),
      missing,extra,buildNonDivSelect(1,selectN,candidates,random)],random);
  }

  function multipleCandidates(n,random){
    var multiples=range(2,9).map(function(k){return n*k;}).filter(function(v){return v<=300;});
    var divs=divisors(n).filter(function(d){return d>1&&d<n;});
    var takeM=sample(multiples,3,random),takeD=sample(divs,Math.min(3,divs.length),random);
    var extra=sample(range(2,40).filter(function(v){return v%n!==0&&n%v!==0;}),2,random);
    return sortNum(unique(takeM.concat(takeD).concat(extra).concat([n])));
  }
  function buildMulSelect(lv,n,candidates,random){
    var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:"mul_select",ask:"count",
      params:{n:n},numbers:[n],text:candidates.join(", ")+" から "+n+" の倍数をすべてえらびましょう。"});
    return placeCandidates(q,candidates,candidates.filter(function(v){return v%n===0;}),random);
  }
  function drawMulCap(random,n){
    /* M ÷ N の商が 4 以上 60 以下。上限の帯は 30 から 300。 */
    var pool=range(BANDS.multipleCap.min,BANDS.multipleCap.max).filter(function(m){
      var q=Math.floor(m/n);return q>=4&&q<=60;
    });
    return pick(pool,random);
  }
  function drawMulK(random,n){
    /* k の帯は 4 から 60、N×k ≤ 300。重なる区間 (30 から 60) から 30% 以上を引く。 */
    var all=range(BANDS.multipleK.min,BANDS.multipleK.max).filter(function(k){return n*k<=300;});
    var overlap=all.filter(function(k){return k>=BANDS.overlapK.min&&k<=BANDS.overlapK.max;});
    if(overlap.length&&randomValue(random)<0.6)return pick(overlap,random);
    return pick(all,random);
  }
  function buildLv2(random){
    var selectN=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random),candidates=null;
    for(var attempt=0;attempt<200;attempt++){
      var draft=multipleCandidates(selectN,random);
      var hitM=draft.filter(function(v){return v%selectN===0;}).length;
      var hitD=draft.filter(function(v){return selectN%v===0;}).length;
      if(draft.length>=5&&draft.length<=9&&hitM>=2&&hitM<=draft.length-2&&hitD>=2&&hitD<=draft.length-2){candidates=draft;break;}
      selectN=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random);
    }
    if(!candidates)throw new Error("Lv2 の候補を作れません");
    var pairN=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random),cap=drawMulCap(random,pairN);
    var nthN=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random),k=drawMulK(random,nthN);
    var mulSelect=buildMulSelect(2,selectN,candidates,random);
    var divSelect=buildDivSelect(2,selectN,candidates,random);
    markPair(mulSelect,divSelect,"P1");
    var count=baseQuestion({lv:2,format:"normal",kind:"num",pattern:"mul_count",ask:"count",
      params:{n:pairN,cap:cap},numbers:[pairN,cap],
      text:cap+" までに "+pairN+" の倍数は何個ありますか。",ans:Math.floor(cap/pairN)});
    var capped=baseQuestion({lv:2,format:"normal",kind:"num",pattern:"mul_capped",ask:"max",
      params:{n:pairN,cap:cap},numbers:[pairN,cap],
      text:pairN+" の倍数のうち、"+cap+" をこえないいちばん大きい数はいくつですか。",ans:Math.floor(cap/pairN)*pairN});
    markPair(count,capped,"P7");
    var nth=baseQuestion({lv:2,format:"normal",kind:"num",pattern:"mul_nth",ask:"nth",
      params:{n:nthN,k:k},numbers:[nthN,k],
      text:nthN+" の倍数を小さい順にならべたとき、"+k+" 番目の数はいくつですか。",ans:nthN*k});
    return finalize(2,[mulSelect,divSelect,nth,count,capped],random);
  }

  function commonCandidates(a,b,random){
    var divs=commonDivisors(a,b),l=lcm(a,b);
    var muls=[l,l*2,l*3].filter(function(v){return v<=999;});
    var takeD=sample(divs,Math.min(3,divs.length),random),takeM=sample(muls,Math.min(2,muls.length),random);
    var noise=sample(range(2,Math.max(12,Math.min(60,l))).filter(function(v){
      return (a%v!==0||b%v!==0)&&(v%a!==0||v%b!==0);
    }),2,random);
    return sortNum(unique(takeD.concat(takeM).concat(noise)));
  }
  function buildCommonDivSelect(lv,a,b,candidates,random){
    var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:"common_div_select",ask:"count",
      params:{a:a,b:b},numbers:[a,b],
      text:candidates.join(", ")+" から "+a+" と "+b+" の公約数をすべてえらびましょう。"});
    return placeCandidates(q,candidates,candidates.filter(function(v){return a%v===0&&b%v===0;}),random);
  }
  function buildCommonMulSelect(lv,a,b,candidates,random){
    var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:"common_mul_select",ask:"count",
      params:{a:a,b:b},numbers:[a,b],
      text:candidates.join(", ")+" から "+a+" と "+b+" の公倍数をすべてえらびましょう。"});
    return placeCandidates(q,candidates,candidates.filter(function(v){return v%a===0&&v%b===0;}),random);
  }
  function commonSelectPair(lv,random){
    for(var attempt=0;attempt<300;attempt++){
      var ab=drawCommonPair(random),a=ab[0],b=ab[1];
      var candidates=commonCandidates(a,b,random);
      if(candidates.length<5||candidates.length>9)continue;
      var divs=candidates.filter(function(v){return a%v===0&&b%v===0;});
      var muls=candidates.filter(function(v){return v%a===0&&v%b===0;});
      if(divs.length<2||divs.length>=candidates.length)continue;
      if(muls.length<2||muls.length>=candidates.length)continue;
      if(sameSet(divs,muls))continue;
      return {a:a,b:b,candidates:candidates};
    }
    throw new Error("公約数と公倍数の候補を作れません");
  }
  function buildLv3(random){
    var ab=drawCommonPairWith(random,function(a,b){return gcd(a,b)!==1&&lcm(a,b)!==gcd(a,b);});
    var g=drawCommonPair(random),setSel=commonSelectPair(3,random);
    var gcdQ=baseQuestion({lv:3,format:"normal",kind:"num",pattern:"gcd_num",
      params:{a:ab[0],b:ab[1]},numbers:[ab[0],ab[1]],
      text:ab[0]+" と "+ab[1]+" の最大公約数はいくつですか。",ans:gcd(ab[0],ab[1])});
    var lcmQ=baseQuestion({lv:3,format:"normal",kind:"num",pattern:"lcm_num",
      params:{a:ab[0],b:ab[1]},numbers:[ab[0],ab[1]],
      text:ab[0]+" と "+ab[1]+" の最小公倍数はいくつですか。",ans:lcm(ab[0],ab[1])});
    markPair(gcdQ,lcmQ,"P2");
    var countQ=baseQuestion({lv:3,format:"normal",kind:"num",pattern:"common_div_count",ask:"count",
      params:{a:g[0],b:g[1]},numbers:[g[0],g[1]],
      text:g[0]+" と "+g[1]+" の公約数は何個ありますか。",ans:commonDivisors(g[0],g[1]).length});
    var divSel=buildCommonDivSelect(3,setSel.a,setSel.b,setSel.candidates,random);
    var mulSel=buildCommonMulSelect(3,setSel.a,setSel.b,setSel.candidates,random);
    markPair(divSel,mulSel,"P8");
    return finalize(3,[gcdQ,lcmQ,countQ,divSel,mulSel],random);
  }

  /* ==========================================================================
     場面 (3.3 章のテンプレートと 4.4 章の四象限)
     ========================================================================== */
  var SCENE_TEMPLATES={
    T1:{units:["cm"],
      gcd:{kindOf:"value",value:"正方形の 1 辺",counter:"cm",
        setup:function(a,b,u){return "たて "+a+u+" よこ "+b+u+" の紙を、あまりなく同じ大きさの正方形に切り分けます。";},
        boundUpper:function(c,u){return "1 辺は "+c+u+" をこえないようにします。";},
        boundLower:function(c,u){return "1 辺は "+c+u+" より長くします。";},
        max:["いちばん大きい","いちばん長い"],min:["いちばん小さい","いちばん短い"],
        nth:["大きいほうから","長いほうから"],count:["何通り","何個"]},
      lcm:{kindOf:"value",value:"正方形の 1 辺",counter:"cm",
        setup:function(a,b,u){return "たて "+a+u+" よこ "+b+u+" のタイルをすきまなくならべて正方形を作ります。";},
        boundUpper:function(c,u){return "1 辺は "+c+u+" をこえないようにします。";},
        boundLower:function(c,u){return "1 辺は "+c+u+" より長くします。";},
        max:["いちばん大きい","いちばん長い"],min:["いちばん小さい","いちばん短い"],
        nth:["大きいほうから","長いほうから"],count:["何通り","何個"]}},
    T2:{units:["こ"],
      gcd:{kindOf:"group",value:"人数",counter:"人",
        setup:function(a,b,u){return "あめ "+a+" "+u+"とガム "+b+" "+u+"を、あまりなく同じ数ずつ分けます。";},
        boundUpper:function(c){return "分ける人数は "+c+" 人をこえないようにします。";},
        boundLower:function(c){return c+" 人より多くに分けます。";},
        max:["いちばん多い","いちばん大きい"],min:["いちばん少ない","いちばん小さい"],
        nth:["多いほうから","大きいほうから"],count:["何通り","何個"]},
      lcm:{kindOf:"value",value:"そろえる数",counter:"こ",
        setup:function(a,b,u){return "あめを "+a+" "+u+"ずつ、ガムを "+b+" "+u+"ずつふくろに入れて、あめとガムの数をそろえます。";},
        boundUpper:function(c,u){return "そろえる数は "+c+" "+u+"をこえないようにします。";},
        boundLower:function(c,u){return "そろえる数は "+c+" "+u+"より多くします。";},
        max:["いちばん多い","いちばん大きい"],min:["いちばん少ない","いちばん小さい"],
        nth:["多いほうから","大きいほうから"],count:["何通り","何個"]}},
    T3:{units:["cm"],
      gcd:{kindOf:"value",value:"切り分けた 1 本の長さ",counter:"cm",
        setup:function(a,b,u){return "長さ "+a+u+" のリボンと長さ "+b+u+" のひもを、あまりなく同じ長さに切り分けます。";},
        boundUpper:function(c,u){return "1 本の長さは "+c+u+" をこえないようにします。";},
        boundLower:function(c,u){return "1 本の長さは "+c+u+" より長くします。";},
        max:["いちばん長い","いちばん大きい"],min:["いちばん短い","いちばん小さい"],
        nth:["長いほうから","大きいほうから"],count:["何通り","何個"]},
      lcm:{kindOf:"value",value:"そろえた長さ",counter:"cm",
        setup:function(a,b,u){return "長さ "+a+u+" のリボンと長さ "+b+u+" のひもを、それぞれ何本かつないで同じ長さにそろえます。";},
        boundUpper:function(c,u){return "そろえた長さは "+c+u+" をこえないようにします。";},
        boundLower:function(c,u){return "そろえた長さは "+c+u+" より長くします。";},
        max:["いちばん長い","いちばん大きい"],min:["いちばん短い","いちばん小さい"],
        nth:["長いほうから","大きいほうから"],count:["何通り","何個"]}},
    T4:{units:["分","秒"],
      gcd:{kindOf:"value",value:"くぎり 1 つの長さ",counter:null,
        setup:function(a,b,u){return a+" "+u+"の作業と "+b+" "+u+"の作業を、あまりなく同じ長さのくぎりに分けます。";},
        boundUpper:function(c,u){return "くぎり 1 つは "+c+" "+u+"をこえないようにします。";},
        boundLower:function(c,u){return "くぎり 1 つは "+c+" "+u+"より長くします。";},
        max:["いちばん長い","いちばん大きい"],min:["いちばん短い","いちばん小さい"],
        nth:["長いほうから","大きいほうから"],count:["何通り","何個"]},
      lcm:{kindOf:"time",value:"同時に光るまでの時間",counter:null,
        setup:function(a,b,u){return "A のライトは "+a+" "+u+"ごと、B のライトは "+b+" "+u+"ごとに光ります。いま同時に光りました。";},
        boundUpper:function(c,u){return "見るのは "+c+" "+u+"後までとします。";},
        boundLower:function(c,u){return "見るのは "+c+" "+u+"後より後とします。";},
        max:["いちばん長い","いちばん大きい"],min:["いちばん短い","いちばん小さい"],
        nth:["回目に","度目に"],count:["何通り","何回"]}},
    T5:{units:["こ"],
      gcd:{kindOf:"group",value:"箱の数",counter:"箱",
        setup:function(a,b,u){return "あめ "+a+" "+u+"とクッキー "+b+" "+u+"を、あまりなく同じ数ずつ箱に入れます。";},
        boundUpper:function(c){return "箱の数は "+c+" 箱をこえないようにします。";},
        boundLower:function(c){return c+" 箱より多くの箱に入れます。";},
        max:["いちばん多い","いちばん大きい"],min:["いちばん少ない","いちばん小さい"],
        nth:["多いほうから","大きいほうから"],count:["何通り","何個"]},
      lcm:{kindOf:"value",value:"そろえた数",counter:"こ",
        setup:function(a,b,u){return "あめが "+a+" "+u+"入った箱と、クッキーが "+b+" "+u+"入った箱をならべて、あめとクッキーの数をそろえます。";},
        boundUpper:function(c,u){return "そろえた数は "+c+" "+u+"をこえないようにします。";},
        boundLower:function(c,u){return "そろえた数は "+c+" "+u+"より多くします。";},
        max:["いちばん多い","いちばん大きい"],min:["いちばん少ない","いちばん小さい"],
        nth:["多いほうから","大きいほうから"],count:["何通り","何個"]}}
  };
  /* pattern ごとに使えるテンプレート。全テンプレートが両向きで使われる (3.3 章)。 */
  var SCENE_TEMPLATE_OF={
    scene_gcd_size:["T1","T3","T4"],scene_gcd_capped:["T1","T3","T4"],
    scene_gcd_nth:["T1","T2","T3","T4","T5"],scene_gcd_ways:["T1","T2","T3","T4","T5"],
    scene_gcd_count:["T2","T5"],
    scene_lcm_size:["T1","T2","T3","T5"],scene_lcm_capped:["T1","T2","T3","T5"],
    scene_lcm_floored:["T1","T2","T3","T5"],scene_lcm_ways:["T1","T2","T3","T5"],
    scene_lcm_time:["T4"],scene_lcm_nth:["T4"]
  };
  /* 4.4.2 章の四象限。境界の大小は min(a,b) 未満なら小、max(a,b) より大きいなら大。 */
  var SCENE_ROLE={
    scene_gcd_size:{ask:"max",bound:"upper",size:"big",effective:false,agreement:"match"},
    scene_lcm_capped:{ask:"max",bound:"upper",size:"big",effective:true,agreement:"reverseA"},
    scene_gcd_capped:{ask:"max",bound:"upper",size:"small",effective:true,agreement:"match",oneSided:true},
    scene_lcm_size:{ask:"min",bound:"lower",size:"small",effective:false,agreement:"match"},
    scene_lcm_time:{ask:"min",bound:"lower",size:"small",effective:false,agreement:"match"},
    scene_gcd_count:{ask:"min",bound:"lower",size:"small",effective:true,agreement:"reverseB"},
    scene_lcm_floored:{ask:"min",bound:"lower",size:"big",effective:true,agreement:"match",oneSided:true},
    scene_gcd_nth:{ask:"nth",bound:"rank",size:"small",effective:null,agreement:null},
    scene_lcm_nth:{ask:"nth",bound:"rank",size:"small",effective:null,agreement:null},
    scene_gcd_ways:{ask:"count",bound:"lower",size:"small",effective:true,agreement:null},
    scene_lcm_ways:{ask:"count",bound:"upper",size:"big",effective:true,agreement:null}
  };

  function sceneBound(pattern,a,b,random){
    var role=SCENE_ROLE[pattern],g=gcd(a,b),l=lcm(a,b);
    if(role.bound==="rank"){
      if(pattern==="scene_gcd_nth"){
        var divs=commonDivisors(a,b);
        if(divs.length<4)throw new Error("順位を問う公約数が足りません");
        return randomInt(random,BANDS.sceneRank.min,Math.min(BANDS.sceneRank.max,divs.length-1));
      }
      var top=BANDS.sceneRank.max;
      while(top>BANDS.sceneRank.min&&l*top>9999)top--;
      return randomInt(random,BANDS.sceneRank.min,top);
    }
    if(role.size==="big"){
      /* 上限 C が大: 最小公倍数以上、その 6 倍以下、かつ max(a, b) より大きい (9.2 章、N2)。 */
      var low=Math.max(l,Math.max(a,b)+1),high=l*6;
      if(role.bound==="lower"){
        /* 下限 L が大: max(a, b) より大きく、最小公倍数の 6 倍以下。L より大きい公倍数が要る。 */
        low=Math.max(a,b)+1;high=l*6-1;
      }
      if(high<low)high=low;
      return randomInt(random,low,high);
    }
    /* 小: 2 以上、最大公約数未満。 */
    if(g<3)throw new Error("境界の帯が空です");
    return randomInt(random,2,g-1);
  }
  function sceneAnswer(pattern,a,b,bound){
    var g=gcd(a,b),l=lcm(a,b),divs=commonDivisors(a,b);
    if(pattern==="scene_gcd_size")return g;
    if(pattern==="scene_gcd_capped"){
      var ok=divs.filter(function(d){return d<=bound;});
      return ok[ok.length-1];
    }
    if(pattern==="scene_gcd_count"){
      var over=divs.filter(function(d){return d>bound;});
      return over[0];
    }
    if(pattern==="scene_gcd_ways")return divs.filter(function(d){return d>bound;}).length;
    if(pattern==="scene_gcd_nth")return divs.slice().reverse()[bound-1];
    if(pattern==="scene_lcm_size"||pattern==="scene_lcm_time")return l;
    if(pattern==="scene_lcm_floored")return (Math.floor(bound/l)+1)*l;
    if(pattern==="scene_lcm_capped")return Math.floor(bound/l)*l;
    if(pattern==="scene_lcm_ways")return Math.floor(bound/l);
    if(pattern==="scene_lcm_nth")return l*bound;
    throw new Error("場面の答えを計算できません: "+pattern);
  }
  function scenePhrases(template,direction,pattern){
    var face=SCENE_TEMPLATES[template][direction],role=SCENE_ROLE[pattern];
    if(role.ask==="max")return face.max;
    if(role.ask==="min")return face.min;
    if(role.ask==="count")return face.count;
    return face.nth.filter(function(text){return !!text;});
  }
  function counterPhrase(counter,unit){
    var label=counter||unit;
    /* 数値と単位の前後にのみ空白を許す (9.6 章)。ASCII 単位だけ前後に空白を置く。 */
    return /^[A-Za-z]/.test(label)?"何 "+label+" ですか。":"何"+label+"ですか。";
  }
  function sceneText(pattern,template,unit,a,b,bound,phrase){
    var meta=PATTERNS[pattern],face=SCENE_TEMPLATES[template][meta.direction],role=SCENE_ROLE[pattern];
    var text=face.setup(a,b,unit);
    if(role.bound==="upper")text+=face.boundUpper(bound,unit);
    else if(role.bound==="lower")text+=face.boundLower(bound,unit);
    var tail=counterPhrase(face.counter,unit);
    if(role.ask==="max"||role.ask==="min"){
      if(face.kindOf==="time")text+="同時に光るまでの時間が"+phrase+"のは"+counterPhrase(null,unit).replace("ですか。","後ですか。");
      else text+=phrase+face.value+"は"+tail;
    }else if(role.ask==="nth"){
      if(face.kindOf==="time")text+=bound+" "+phrase+"同時に光るのは"+counterPhrase(null,unit).replace("ですか。","後ですか。");
      else text+="考えられる"+face.value+"のうち、"+phrase+" "+bound+" 番目は"+tail;
    }else{
      text+="考えられる"+face.value+"は"+phrase+"ありますか。";
    }
    return text;
  }
  function sceneChoiceEntries(pattern,a,b,shared){
    if(shared){
      /* 対比ペアは選択肢集合を完全に一致させる (4.3 章)。散文肢 3 つと算用数字の式 1 つ。 */
      var g0=gcd(a,b),l0=lcm(a,b),meta0=PATTERNS[pattern];
      var correctKey=meta0.direction==="lcm"?"lcm":(pattern==="scene_gcd_size"||pattern==="scene_gcd_capped"?"gcd":"list");
      return [
        {text:a+" と "+b+" の最大公約数",value:g0,correct:correctKey==="gcd",error:correctKey==="gcd"?null:"W1"},
        {text:a+" と "+b+" の最小公倍数",value:l0,correct:correctKey==="lcm",error:correctKey==="lcm"?null:"W1"},
        {text:a+" と "+b+" の公約数をすべて",value:null,correct:correctKey==="list",error:correctKey==="list"?null:"W7"},
        {text:a+"+"+b,value:a+b,error:"W8"}];
    }
    return sceneChoiceEntriesSolo(pattern,a,b);
  }
  function sceneChoiceEntriesSolo(pattern,a,b){
    /* 立式の 4 肢は散文肢 3 つと算用数字の式 1 つに揃える (N7)。 */
    var meta=PATTERNS[pattern],g=gcd(a,b),l=lcm(a,b);
    var gcdText=a+" と "+b+" の最大公約数",lcmText=a+" と "+b+" の最小公倍数";
    var divList=a+" と "+b+" の公約数をすべて",mulList=a+" と "+b+" の公倍数をすべて";
    var sum={text:a+"+"+b,value:a+b,error:"W8"};
    if(pattern==="scene_gcd_size"||pattern==="scene_gcd_capped")
      return [{text:gcdText,value:g,correct:true},{text:lcmText,value:l,error:"W1"},
        {text:divList,value:null,error:"W7"},sum];
    if(pattern==="scene_gcd_count"||pattern==="scene_gcd_nth"||pattern==="scene_gcd_ways")
      return [{text:divList,value:null,correct:true},{text:lcmText,value:l,error:"W1"},
        {text:gcdText,value:g,error:"W2"},sum];
    if(pattern==="scene_lcm_size"||pattern==="scene_lcm_time"||pattern==="scene_lcm_capped"
      ||pattern==="scene_lcm_floored"||pattern==="scene_lcm_nth"||pattern==="scene_lcm_ways")
      return [{text:lcmText,value:l,correct:true},{text:gcdText,value:g,error:"W1"},
        {text:mulList,value:null,error:"W7"},sum];
    throw new Error("立式の肢を作れません: "+pattern);
  }
  function buildSceneQuestion(lv,pattern,format,options,random){
    var meta=PATTERNS[pattern],role=SCENE_ROLE[pattern];
    var template=options.template||pick(SCENE_TEMPLATE_OF[pattern],random);
    var unit=options.unit||pick(SCENE_TEMPLATES[template].units,random);
    var a=options.a,b=options.b,bound=typeof options.bound==="number"?options.bound:sceneBound(pattern,a,b,random);
    var phrases=scenePhrases(template,meta.direction,pattern);
    var phrase=options.phrase&&phrases.indexOf(options.phrase)>=0?options.phrase:pick(phrases,random);
    var answer=sceneAnswer(pattern,a,b,bound);
    if(!(answer>0)||answer>9999)throw new Error("場面の答えが値域の外です");
    if(role.ask==="count"&&answer<2)throw new Error("通り数が 2 未満です");
    if(pattern==="scene_gcd_capped"&&commonDivisors(a,b).filter(function(d){return d<=bound;}).length<2)
      throw new Error("上限以下の公約数が足りません");
    var text=sceneText(pattern,template,unit,a,b,bound,phrase);
    var spec={lv:lv,format:format,pattern:pattern,ask:role.ask,template:template,
      params:{a:a,b:b,bound:bound,unit:unit},numbers:[a,b,bound],
      boundary:{kind:role.bound,value:bound,size:role.size,effective:role.effective,oneSided:!!role.oneSided},
      agreement:role.agreement,phrase:phrase,text:text};
    if(format==="formulation"){
      spec.kind="choice";
      var q=baseQuestion(spec);
      var entries=sceneChoiceEntries(pattern,a,b,options.sharedChoices);
      q.text=text+"はじめに何を求めればよいですか。";
      q.answerValue=answer;
      return placeChoices(q,entries,random);
    }
    spec.kind="num";spec.ans=answer;
    return baseQuestion(spec);
  }

  /* ==========================================================================
     4.4.2 章の四象限に沿った場面 4 問の組み立て
     ========================================================================== */
  var QUADRANT_A={gcd:"scene_gcd_size",lcm:"scene_lcm_capped"};
  var QUADRANT_B={gcd:"scene_gcd_count",lcm:"scene_lcm_size"};

  function scenePairParams(quadrant,random,lv){
    /* 対比ペアは同一の a, b と同一の境界を使う (4.3 章)。 */
    for(var attempt=0;attempt<300;attempt++){
      var ab=drawCommonPair(random),a=ab[0],b=ab[1];
      if(gcd(a,b)<3)continue;
      var probe=quadrant==="A"?QUADRANT_A.gcd:QUADRANT_B.lcm;
      var bound;
      try{bound=sceneBound(probe,a,b,random);}catch(error){continue;}
      try{
        var gcdPattern=quadrant==="A"?QUADRANT_A.gcd:QUADRANT_B.gcd;
        var lcmPattern=quadrant==="A"?QUADRANT_A.lcm:QUADRANT_B.lcm;
        var g1=sceneAnswer(gcdPattern,a,b,bound),g2=sceneAnswer(lcmPattern,a,b,bound);
        if(!(g1>0)||!(g2>0)||g1===g2||g1>9999||g2>9999)continue;
        if(lv&&LV_PATTERNS[lv].indexOf(gcdPattern)<0)continue;
        return {a:a,b:b,bound:bound};
      }catch(error){continue;}
    }
    throw new Error("対比ペアの 2 量を作れません");
  }
  function pairTemplateFor(quadrant,random){
    var gcdPattern=quadrant==="A"?QUADRANT_A.gcd:QUADRANT_B.gcd;
    var lcmPattern=quadrant==="A"?QUADRANT_A.lcm:QUADRANT_B.lcm;
    var shared=SCENE_TEMPLATE_OF[gcdPattern].filter(function(id){return SCENE_TEMPLATE_OF[lcmPattern].indexOf(id)>=0;});
    return pick(shared,random);
  }
  function buildScenePair(lv,quadrant,format,random){
    var params=scenePairParams(quadrant,random,lv);
    var template=pairTemplateFor(quadrant,random),unit=pick(SCENE_TEMPLATES[template].units,random);
    var gcdPattern=quadrant==="A"?QUADRANT_A.gcd:QUADRANT_B.gcd;
    var lcmPattern=quadrant==="A"?QUADRANT_A.lcm:QUADRANT_B.lcm;
    var gcdPhrases=scenePhrases(template,"gcd",gcdPattern),lcmPhrases=scenePhrases(template,"lcm",lcmPattern);
    var gcdPhrase=pick(gcdPhrases,random);
    var lcmChoices=lcmPhrases.filter(function(text){return text!==gcdPhrase;});
    var lcmPhrase=pick(lcmChoices.length?lcmChoices:lcmPhrases,random);
    var options={a:params.a,b:params.b,bound:params.bound,template:template,unit:unit,
      sharedChoices:format==="formulation"};
    var first=buildSceneQuestion(lv,gcdPattern,format,Object.assign({},options,{phrase:gcdPhrase}),random);
    var second=buildSceneQuestion(lv,lcmPattern,format,Object.assign({},options,{phrase:lcmPhrase}),random);
    markPair(first,second,"P3",random);
    return {gcd:first,lcm:second,params:params,template:template,unit:unit};
  }
  function buildSceneWaysSelect(lv,pattern,random,used){
    for(var attempt=0;attempt<300;attempt++){
      try{
        var ab=drawCommonPair(random),a=ab[0],b=ab[1];
        if(gcd(a,b)<3)continue;
        var base=buildSceneQuestion(lv,pattern,"normal",{a:a,b:b},random);
        if(used&&used.indexOf(base.phrase)>=0)continue;
        var bound=base.params.bound,face=SCENE_TEMPLATES[base.template][PATTERNS[pattern].direction];
        var correct,noise;
        if(pattern==="scene_gcd_ways"){
          correct=commonDivisors(a,b).filter(function(d){return d>bound;});
          noise=range(2,Math.max(12,Math.min(60,a))).filter(function(v){
            return correct.indexOf(v)<0&&(a%v!==0||b%v!==0);});
        }else{
          correct=[];
          for(var m=lcm(a,b);m<=bound;m+=lcm(a,b))correct.push(m);
          noise=range(2,Math.max(12,bound)).filter(function(v){return correct.indexOf(v)<0&&(v%a!==0||v%b!==0);});
        }
        if(correct.length<2||correct.length>4)continue;
        var candidates=sortNum(unique(correct.concat(sample(noise,3,random))));
        if(candidates.length<5||candidates.length>9)continue;
        if(correct.length>=candidates.length)continue;
        var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:pattern,ask:"count",
          template:base.template,params:base.params,numbers:base.numbers.slice(),
          boundary:base.boundary,agreement:base.agreement,phrase:base.phrase,
          text:base.text.replace(/考えられる[^。]*ありますか。$/,"考えられる"+face.value+"を、次からすべてえらびましょう。")});
        return placeCandidates(q,candidates,correct,random);
      }catch(error){continue;}
    }
    throw new Error("場面の通り数の候補を作れません: "+pattern);
  }
  function buildSceneSolo(lv,pattern,format,random,used){
    if(format==="find_all")return buildSceneWaysSelect(lv,pattern,random,used);
    for(var attempt=0;attempt<300;attempt++){
      try{
        var ab=drawCommonPair(random);
        if(gcd(ab[0],ab[1])<3)continue;
        var q=buildSceneQuestion(lv,pattern,format,{a:ab[0],b:ab[1]},random);
        if(used&&used.indexOf(q.phrase)>=0)continue;
        return q;
      }catch(error){continue;}
    }
    throw new Error("場面問題を作れません: "+pattern);
  }

  /* ==========================================================================
     素因数分解の領域 (Lv5)
     ========================================================================== */
  var ORDER_DESIGNS={
    D1:{pattern:"factorize",parts:5,freePosition:"1",chained:true},
    D2:{pattern:"factorize",parts:4,freePosition:"1",chained:false},
    D3:{pattern:"gcd_by_factor",parts:4,freePosition:"3",chained:false},
    D4:{pattern:"lcm_by_factor",parts:4,freePosition:"3",chained:false},
    D5:{pattern:"gcd_by_factor",parts:5,freePosition:"4",chained:true},
    D6:{pattern:"procedure_gcd",parts:4,freePosition:"all",chained:false},
    D7:{pattern:"procedure_lcm",parts:4,freePosition:"all",chained:false}
  };
  /* 数ゼロ設計の 3 経路。各手順文を 3 通り以上の言い回しから抽選する (4.7 章、H3)。 */
  var PROCEDURE_ROUTES={
    gcd:{
      factor:[["それぞれを素数だけのかけ算になおす","それぞれを素数のかけ算に分ける","どちらも素数のかけ算の形にする"],
        ["両方に共通してある素数を見つける","どちらにもある素数をさがす","二つに共通する素数だけを取り出す"],
        ["共通している素数をすべてかける","見つけた素数を順にかけ合わせる","取り出した素数をかける"],
        ["出た数が最大公約数","その積が最大公約数になる","かけた答えが最大公約数"]],
      ladder:[["二つの数をならべて書く","二つの数を横にならべる","二つの数を上下にならべて書く"],
        ["どちらもわり切れる数でわる","二つともわれる数でわっていく","共通してわれる数でわる"],
        ["もうわれなくなるまでつづける","共通してわれる数がなくなるまでくり返す","わり切れる数が無くなるまでつづける"],
        ["左にならべた数をすべてかける","わった数を全部かけ合わせる","横に出した数をかける"]],
      listing:[["小さいほうの約数を全部書き出す","小さい数の約数をならべる","小さいほうを割り切る数を書き出す"],
        ["その中から大きいほうもわり切るものを残す","もう一方もわり切る数だけ残す","大きいほうもわれる数に印をつける"],
        ["残った数のいちばん大きいものを見る","残した中で最大の数をさがす","印のついた数のうち最大を選ぶ"],
        ["それが最大公約数","その数が最大公約数になる","選んだ数が最大公約数"]]
    },
    lcm:{
      factor:[["それぞれを素数だけのかけ算になおす","それぞれを素数のかけ算に分ける","どちらも素数のかけ算の形にする"],
        ["同じ素数は多いほうの回数をとる","素数ごとに回数の多いほうを選ぶ","かさなる素数は回数の多いほうを使う"],
        ["選んだ素数をすべてかける","取り出した素数を順にかけ合わせる","集めた素数をかける"],
        ["出た数が最小公倍数","その積が最小公倍数になる","かけた答えが最小公倍数"]],
      ladder:[["二つの数をならべて書く","二つの数を横にならべる","二つの数を上下にならべて書く"],
        ["どちらもわり切れる数でわる","二つともわれる数でわっていく","共通してわれる数でわる"],
        ["もうわれなくなるまでつづける","共通してわれる数がなくなるまでくり返す","わり切れる数が無くなるまでつづける"],
        ["左の数と下にのこった数を全部かける","わった数とのこりをかけ合わせる","外がわの数をすべてかける"]],
      listing:[["大きいほうの倍数を小さい順に書き出す","大きい数の倍数をならべる","大きいほうを何倍かした数を書き出す"],
        ["その中から小さいほうでもわり切れるものをさがす","もう一方でもわれる数を見つける","小さいほうの倍数にもなっている数に印をつける"],
        ["はじめに見つかった数を見る","いちばん先に出てきた数を選ぶ","印のついた数のうち最小を選ぶ"],
        ["それが最小公倍数","その数が最小公倍数になる","選んだ数が最小公倍数"]]
    }
  };
  var PROCEDURE_CHECK={
    gcd:["どちらの数もわり切れるか確かめる","出た数で二つともわってみる","かけてもどして確かめる"],
    lcm:["どちらの数でもわり切れるか確かめる","出た数を二つの数でわってみる","二つの数の積をこえていないか見る"]
  };
  /* 場面の名詞を引用して部品文を問題ごとに変える (4.7 章)。 */
  var PROCEDURE_NOUNS=[["えんぴつ","けしゴム"],["あめ","ガム"],["リボン","ひも"],["カード","シール"],["あめ","クッキー"]];

  /* 部品の格納順そのものも乱数で決める。格納順を正順にすると、画面から読める
     部品の添字をそのまま並べるだけで整列が通ってしまう (4.7 章の提示順の規定は
     表示順にしか掛からないため、保存側で正順を潰しておく)。 */
  function finishOrdering(question,parts,random){
    var permutation=shuffle(range(0,parts.length-1),random);
    question.parts=permutation.map(function(from){return parts[from];});
    question.ans=parts.map(function(part,index){return permutation.indexOf(index);});
    question.displayOrder=shuffle(range(0,parts.length-1),random);
    return question;
  }
  function buildOrderingProcedure(lv,direction,random){
    var route=pick(["factor","ladder","listing"],random);
    var lines=PROCEDURE_ROUTES[direction][route];
    var nouns=pick(PROCEDURE_NOUNS,random);
    var texts=lines.map(function(options){return pick(options,random);});
    texts[0]=nouns[0]+"と"+nouns[1]+"の数について、"+texts[0];
    if(randomValue(random)<0.5)texts.splice(3,0,pick(PROCEDURE_CHECK[direction],random));
    var pattern=direction==="gcd"?"procedure_gcd":"procedure_lcm";
    var keys=texts.map(function(text,index){return "s"+index;});
    var parts=texts.map(function(text,index){
      return {text:text,requires:index?[keys[index-1]]:[],produces:[keys[index]]};
    });
    var q=baseQuestion({lv:lv,format:"ordering",kind:"order",pattern:pattern,
      params:{route:route,nouns:nouns},numbers:[],
      text:nouns[0]+"と"+nouns[1]+"の数の"+(direction==="gcd"?"最大公約数":"最小公倍数")
        +"を求めます。手順を正しい順にならべましょう。",
      parts:parts,design:direction==="gcd"?"D6":"D7"});
    return finishOrdering(q,parts,random);
  }
  function buildOrderingFactorize(lv,design,random,forced){
    var n=typeof forced==="number"?forced:drawFactorN(random),factors=primeFactors(n);
    if(factors.length<3||factors.length>4){
      if(typeof forced==="number")throw new Error("指定された数で整列を作れません");
      return buildOrderingFactorize(lv,design,random);
    }
    var parts,text=n+" を素因数の積で表します。手順を正しい順にならべましょう。";
    if(design==="D1"){
      /* 商を明示する形。部品は 5 つ (先頭の手順文 + わり算 4 つ) に収める。 */
      var steps=factors.slice(0,Math.min(3,factors.length-1)),value=n,rows=[];
      steps.forEach(function(p){rows.push(value+"÷"+p+"="+(value/p));value=value/p;});
      parts=[{text:"小さい素数から順にわる",requires:[],produces:["plan"]}];
      rows.forEach(function(row,index){
        parts.push({text:row,requires:[index?"q"+index:"plan"],produces:["q"+(index+1)]});
      });
      parts.push({text:value+" は素数なのでここで止める",requires:["q"+rows.length],produces:["ans"]});
      while(parts.length>5)parts.splice(parts.length-2,1);
    }else{
      /* わった回数で書く形。部品どうしが値を共有しない (非連鎖形)。 */
      var exps=factorExponents(n);
      parts=[{text:"小さい素数から順に調べる",requires:[],produces:["plan"]}];
      exps.slice(0,exps.length-1).forEach(function(item,index){
        parts.push({text:item.prime+" で "+item.exp+" 回われる",requires:[index?"f"+index:"plan"],produces:["f"+(index+1)]});
      });
      var last=exps[exps.length-1];
      parts.push({text:"のこりの "+last.prime+(last.exp>1?" が "+last.exp+" 回":"")+" は素数",
        requires:["f"+(exps.length-1)],produces:["ans"]});
    }
    if(parts.length<4||parts.length>5)return buildOrderingFactorize(lv,design,random);
    var q=baseQuestion({lv:lv,format:"ordering",kind:"order",pattern:"factorize",
      params:{n:n},numbers:[n],text:text,parts:parts,design:design});
    return finishOrdering(q,parts,random);
  }
  function buildOrderingByFactor(lv,design,random){
    var ab=drawCommonPairWith(random,function(a,b){
      if(gcd(a,b)<4||lcm(a,b)>200)return false;
      if(primeFactors(a).length<2||primeFactors(b).length<2)return false;
      if(primeFactors(gcd(a,b)).length<2||primeFactors(lcm(a,b)).length<2)return false;
      return a!==gcd(a,b)&&b!==gcd(a,b)&&a!==lcm(a,b)&&b!==lcm(a,b);
    });
    var a=ab[0],b=ab[1],direction=design==="D4"?"lcm":"gcd";
    var value=direction==="gcd"?gcd(a,b):lcm(a,b);
    var parts;
    if(design==="D5"){
      /* 連除法。数値の鎖でつながるため Lv5 では使わない (4.7 章)。 */
      var g=gcd(a,b),steps=primeFactors(g).slice(0,2),x=a,y=b,rows=[];
      steps.forEach(function(p){rows.push(p+" で "+x+" と "+y+" をわると "+(x/p)+" と "+(y/p));x=x/p;y=y/p;});
      parts=[{text:a+" と "+b+" をならべて書く",requires:[],produces:["r0"]}];
      rows.forEach(function(row,index){parts.push({text:row,requires:["r"+index],produces:["r"+(index+1)]});});
      parts.push({text:"左にならべた数をかけ合わせる",requires:["r"+rows.length],produces:["plan"]});
      parts.push({text:"出た数 "+value+" が最大公約数",requires:["plan"],produces:["ans"]});
      while(parts.length>5)parts.splice(2,1);
    }else{
      parts=[
        {text:a+" = "+factorProduct(a),requires:[],produces:["fa"]},
        {text:b+" = "+factorProduct(b),requires:["fa"],produces:["fb"]},
        {text:direction==="gcd"?"両方にある数を集める":"多いほうの回数をとって集める",requires:["fb"],produces:["plan"]},
        {text:factorProduct(value)+" = "+value,requires:["plan"],produces:["ans"]}
      ];
    }
    if(parts.length<4||parts.length>5)throw new Error("整列の部品数が 4 または 5 の外です");
    var q=baseQuestion({lv:lv,format:"ordering",kind:"order",
      pattern:direction==="gcd"?"gcd_by_factor":"lcm_by_factor",
      params:{a:a,b:b},numbers:[a,b],
      text:a+" と "+b+" の"+(direction==="gcd"?"最大公約数":"最小公倍数")+"を素因数分解から求めます。手順を正しい順にならべましょう。",
      parts:parts,design:design});
    return finishOrdering(q,parts,random);
  }
  function buildOrdering(lv,design,random,forced){
    if(design==="D6")return buildOrderingProcedure(lv,"gcd",random);
    if(design==="D7")return buildOrderingProcedure(lv,"lcm",random);
    if(design==="D1"||design==="D2")return buildOrderingFactorize(lv,design,random,forced);
    return buildOrderingByFactor(lv,design,random);
  }

  function factorPairData(random){
    var n=drawFactorN(random),exps=factorExponents(n);
    return {n:n,exps:exps,expr:n+" = "+factorProduct(n),
      count:divisorCount(n),
      condCount:divisorCount(n)/(exps[0].exp+1)*exps[0].exp};
  }
  function buildFactorCount(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"factor_count",ask:"count",
      params:{n:data.n},numbers:[data.n],
      text:data.n+" を素因数分解すると "+data.expr+" です。"+data.n+" の約数は全部で何個ありますか。",
      ans:data.count});
  }
  function buildFactorCountCond(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"factor_count_cond",ask:"count",
      params:{n:data.n},numbers:[data.n],
      text:data.n+" を素因数分解すると "+data.expr+" です。"+data.n
        +" の約数のうち、いちばん小さい素数でわり切れるものは何個ありますか。",
      ans:data.condCount});
  }
  function primeCheckData(random){
    for(var attempt=0;attempt<200;attempt++){
      var pool=sample(range(BANDS.primeRange.min,BANDS.primeRange.max),6,random);
      var primes=pool.filter(isPrime);
      if(primes.length>=2&&primes.length<=4)return {list:sortNum(pool),primes:primes};
    }
    throw new Error("素数の候補を作れません");
  }
  function buildPrimeCheck(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"prime_check",ask:"count",
      params:{list:data.list},numbers:data.list.slice(),
      text:data.list.join(", ")+" の中に素数は何個ありますか。",ans:data.primes.length});
  }

  /* ==========================================================================
     余りの領域 (Lv7)
     ========================================================================== */
  function coprimePair(random){
    for(var attempt=0;attempt<300;attempt++){
      var p=randomInt(random,BANDS.remDivisor.min,BANDS.remDivisor.max);
      var q=randomInt(random,BANDS.remDivisor.min,BANDS.remDivisor.max);
      if(p===q||gcd(p,q)!==1)continue;
      if(Math.min(p,q)<3)continue;
      if(lcm(p,q)>60)continue;
      return [Math.min(p,q),Math.max(p,q)];
    }
    throw new Error("互いに素な 2 数を作れません");
  }
  function buildRemSame(lv,format,random){
    var pq=coprimePair(random),p=pq[0],q=pq[1],r=randomInt(random,1,Math.min(p,q)-1);
    var l=lcm(p,q),value=l+r;
    while(value<10)value+=l;
    if(value>99)return buildRemSame(lv,format,random);
    var text=p+" でわっても "+q+" でわっても "+r+" あまる整数のうち、2 けたでいちばん小さい数";
    if(format==="formulation"){
      var q1=baseQuestion({lv:lv,format:"formulation",kind:"choice",pattern:"rem_same",ask:"min",
        params:{p:p,q:q,r:r},numbers:[p,q,r],text:text+"を求めます。はじめに何を求めればよいですか。"});
      q1.answerValue=value;
      return placeChoices(q1,[
        {text:p+" と "+q+" の最小公倍数",value:l,correct:true},
        {text:p+" と "+q+" の最大公約数",value:gcd(p,q),error:"W1"},
        {text:p+" と "+q+" の公約数をすべて",value:null,error:"W7"},
        {text:p+"+"+q+"+"+r,value:p+q+r,error:"W8"}],random);
    }
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"rem_same",ask:"min",
      params:{p:p,q:q,r:r},numbers:[p,q,r],text:text+"はいくつですか。",ans:value});
  }
  function remZeroParams(random){
    for(var attempt=0;attempt<300;attempt++){
      var p=randomInt(random,BANDS.remDivisor.min,BANDS.remDivisor.max);
      var q=randomInt(random,BANDS.remDivisor.min,BANDS.remDivisor.max);
      if(p===q)continue;
      var l=lcm(p,q);
      if(l<6||l>40)continue;
      var m=randomInt(random,BANDS.remRange.min,BANDS.remRange.max);
      if(l>m/2)continue;
      var count=Math.floor(m/l);
      if(count<8)continue;
      if(Math.floor(m/l)*l===Math.floor(m/l))continue;
      return {p:Math.min(p,q),q:Math.max(p,q),m:m,l:l,count:count};
    }
    throw new Error("わり切れる整数の帯を作れません");
  }
  function buildRemZeroFormulation(lv,data,random){
    var l=lcm(data.p,data.q),g=gcd(data.p,data.q);
    var q=baseQuestion({lv:lv,format:"formulation",kind:"choice",pattern:"rem_zero",ask:"max",
      params:{p:data.p,q:data.q,m:data.m},numbers:[data.p,data.q,data.m],
      text:data.p+" でも "+data.q+" でもわり切れる整数のうち、"+data.m
        +" をこえないいちばん大きい数を求めます。はじめに何を求めればよいですか。"});
    q.answerValue=data.count*l;
    return placeChoices(q,[
      {text:data.p+" と "+data.q+" の最小公倍数",value:l,correct:true},
      {text:data.p+" と "+data.q+" の最大公約数",value:g,error:"W1"},
      {text:data.p+" と "+data.q+" の公倍数をすべて",value:null,error:"W7"},
      {text:data.p+"+"+data.q,value:data.p+data.q,error:"W8"}],random);
  }
  function buildRemCountFormulation(lv,data,random){
    var l=lcm(data.p,data.q),g=gcd(data.p,data.q);
    var q=baseQuestion({lv:lv,format:"formulation",kind:"choice",pattern:"rem_count",ask:"count",
      params:{p:data.p,q:data.q,m:data.m},numbers:[data.p,data.q,data.m],
      text:data.p+" でも "+data.q+" でもわり切れる整数のうち、"+data.m
        +" をこえないものは何個あるかを求めます。はじめに何を求めればよいですか。"});
    q.answerValue=data.count;
    return placeChoices(q,[
      {text:data.p+" と "+data.q+" の公倍数をすべて",value:null,correct:true},
      {text:data.p+" と "+data.q+" の最大公約数",value:g,error:"W1"},
      {text:data.p+" と "+data.q+" の公約数をすべて",value:0,error:"W1"},
      {text:data.p+"+"+data.q,value:data.p+data.q,error:"W8"}],random);
  }
  function buildRemZero(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"rem_zero",ask:"max",
      params:{p:data.p,q:data.q,m:data.m},numbers:[data.p,data.q,data.m],
      text:data.p+" でも "+data.q+" でもわり切れる整数のうち、"+data.m+" をこえないいちばん大きい数はいくつですか。",
      ans:data.count*data.l});
  }
  function buildRemCount(lv,data){
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"rem_count",ask:"count",
      params:{p:data.p,q:data.q,m:data.m},numbers:[data.p,data.q,data.m],
      text:data.p+" でも "+data.q+" でもわり切れる整数のうち、"+data.m+" をこえないものは何個ありますか。",
      ans:data.count});
  }
  function buildRemDivisor(lv,random){
    for(var attempt=0;attempt<300;attempt++){
      var n=randomInt(random,BANDS.remDividend.min,BANDS.remDividend.max);
      var r=randomInt(random,1,6);
      if(n<=r)continue;
      var ok=divisors(n-r).filter(function(d){return d>r&&d<n;});
      if(ok.length<3||ok.length>5)continue;
      var noise=range(2,Math.min(40,n)).filter(function(v){
        return ok.indexOf(v)<0&&v!==n;
      });
      var candidates=sortNum(unique(ok.concat(sample(noise,2,random))));
      if(candidates.length<5||candidates.length>9)continue;
      var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:"rem_divisor",ask:"count",
        params:{n:n,r:r},numbers:[n,r],
        text:"あめ "+n+" こを、同じ数ずつ何人かに配ったら "+r+" こあまりました。考えられる人数を、次からすべてえらびましょう。"});
      return placeCandidates(q,candidates,ok,random);
    }
    throw new Error("割る数の候補を作れません");
  }
  function buildRemSelect(lv,pattern,random){
    for(var attempt=0;attempt<300;attempt++){
      var pq=coprimePair(random),p=pq[0],q=pq[1],l=lcm(p,q);
      var r=pattern==="rem_same_select"?randomInt(random,1,Math.min(p,q)-1):0;
      var hits=[],value=l+r;
      while(value<=l*4+r&&hits.length<4){hits.push(value);value+=l;}
      if(hits.length<2)continue;
      var noise=sample(range(10,Math.min(200,l*5)).filter(function(v){
        return v%p!==r%p||v%q!==r%q;
      }),3,random);
      var candidates=sortNum(unique(hits.slice(0,3).concat(noise)));
      if(candidates.length<5||candidates.length>9)continue;
      var correct=candidates.filter(function(v){return v%p===r%p&&v%q===r%q;});
      if(correct.length<2||correct.length>=candidates.length)continue;
      var floor=pattern==="rem_same_select"?null:randomInt(random,1,Math.min(p,q)-1);
      var text=pattern==="rem_same_select"
        ?p+" でわっても "+q+" でわっても "+r+" あまる数を、次からすべてえらびましょう。"
        :p+" でも "+q+" でもわり切れる数のうち、"+floor+" より大きいものを次からすべてえらびましょう。";
      var qq=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:pattern,ask:"count",
        params:{p:p,q:q,r:r,floor:floor},
        numbers:pattern==="rem_same_select"?[p,q,r]:[p,q,floor],text:text});
      return placeCandidates(qq,candidates,correct,random);
    }
    throw new Error("余りの候補を作れません");
  }

  /* ==========================================================================
     周期の領域 (Lv8)
     ========================================================================== */
  function cycleParams(random){
    for(var attempt=0;attempt<200;attempt++){
      var n=randomInt(random,BANDS.cycleDays.min,BANDS.cycleDays.max);
      var quotient=Math.floor(n/7),remainder=n%7;
      if(remainder<2)continue;
      if(remainder===quotient||quotient+remainder===quotient+1)continue;
      /* 商を位置として使う誤答が、あまりを使った正解と同じ曜日にならないこと。 */
      if(quotient%7===remainder%7)continue;
      if([remainder,quotient,quotient+1,quotient+remainder].filter(function(v,i,list){return list.indexOf(v)===i;}).length<4)continue;
      return {n:n,quotient:quotient,remainder:remainder,start:randomInt(random,0,6)};
    }
    throw new Error("周期のパラメタを作れません");
  }
  function cycleChoices(n){
    var quotient=Math.floor(n/7),remainder=n%7;
    return [{text:n+"÷7 のあまり",value:remainder,key:"remainder"},
      {text:n+"÷7 の商",value:quotient,key:"quotient"},
      {text:n+"÷7 の商に 1 をたす",value:quotient+1,key:"quotientPlus"},
      {text:n+"÷7 の商とあまりをたす",value:quotient+remainder,key:"sum"}];
  }
  function buildCycleFormulation(lv,pattern,data,random){
    var entries=cycleChoices(data.n).map(function(entry){
      var correct=pattern==="cycle_weekday"?entry.key==="remainder":entry.key==="quotientPlus";
      return {text:entry.text,value:entry.value,correct:correct,
        error:correct?null:(entry.key==="sum"?"W8":(entry.key==="quotient"&&pattern==="cycle_weekday"?"W5":"W7"))};
    });
    var text=pattern==="cycle_weekday"
      ?"今日は"+WEEKDAYS[data.start]+"です。"+data.n+" 日後は何曜日ですか。しきをえらびましょう。"
      :"今日は"+WEEKDAYS[data.start]+"です。今日から "+data.n+" 日の間に、"+WEEKDAYS[data.start]
        +"は何回ありますか。今日も数えます。しきをえらびましょう。";
    var q=baseQuestion({lv:lv,format:"formulation",kind:"choice",pattern:pattern,ask:"count",
      params:{n:data.n,start:data.start},numbers:[data.n],text:text});
    q.answerValue=pattern==="cycle_weekday"?data.remainder:data.quotient+1;
    return placeChoices(q,entries,random);
  }
  function buildCycleWeekdayNormal(lv,pattern,data,random){
    var offset=data.remainder;
    var index=pattern==="cycle_weekday"?(data.start+offset)%7:((data.start-offset)%7+7)%7;
    var text=pattern==="cycle_weekday"
      ?"今日は"+WEEKDAYS[data.start]+"です。"+data.n+" 日後は何曜日ですか。"
      :"今日は"+WEEKDAYS[data.start]+"です。"+data.n+" 日前は何曜日ですか。";
    var others=shuffle(WEEKDAYS.filter(function(name){return name!==WEEKDAYS[index];}),random).slice(0,3);
    var entries=[{text:WEEKDAYS[index],value:index,correct:true}].concat(others.map(function(name){
      return {text:name,value:WEEKDAYS.indexOf(name),error:"W5"};
    }));
    var q=baseQuestion({lv:lv,format:"normal",kind:"choice",pattern:pattern,ask:"count",
      params:{n:data.n,start:data.start},numbers:[data.n],text:text});
    q.answerValue=index;
    return placeChoices(q,entries,random);
  }
  function alignParams(random){
    for(var attempt=0;attempt<200;attempt++){
      var a=randomInt(random,BANDS.cycleUnit.min,BANDS.cycleUnit.max);
      var b=randomInt(random,BANDS.cycleUnit.min,BANDS.cycleUnit.max);
      if(a===b)continue;
      var l=lcm(a,b);
      if(l>300||l<12)continue;
      var times=randomInt(random,3,8),total=l*times;
      if(total>9999)continue;
      return {a:Math.min(a,b),b:Math.max(a,b),l:l,total:total,times:times};
    }
    throw new Error("同時に光る周期を作れません");
  }

  /* ==========================================================================
     3 つの数 (Lv10 限定。決定 7)
     ========================================================================== */
  function tripleCandidates(triple,random){
    var divs=divisors(triple.g),muls=[triple.l,triple.l*2].filter(function(v){return v<=9999;});
    var takeD=sample(divs,Math.min(4,divs.length),random);
    var noise=sample(range(2,Math.max(12,triple.c)).filter(function(v){
      return divs.indexOf(v)<0&&muls.indexOf(v)<0;
    }),2,random);
    return sortNum(unique(takeD.concat(muls).concat(noise)));
  }
  function buildTripleSelect(lv,pattern,triple,candidates,random){
    var correct=pattern==="common_div3_select"
      ?candidates.filter(function(v){return triple.a%v===0&&triple.b%v===0&&triple.c%v===0;})
      :candidates.filter(function(v){return v%triple.a===0&&v%triple.b===0&&v%triple.c===0;});
    var label=pattern==="common_div3_select"?"公約数":"公倍数";
    var q=baseQuestion({lv:lv,format:"find_all",kind:"find_all",pattern:pattern,ask:"count",
      params:{a:triple.a,b:triple.b,c:triple.c},numbers:[triple.a,triple.b,triple.c],
      text:candidates.join(", ")+" から "+triple.a+" と "+triple.b+" と "+triple.c+" の"+label+"をすべてえらびましょう。"});
    return placeCandidates(q,candidates,correct,random);
  }
  function buildTriplePair(lv,random){
    for(var attempt=0;attempt<300;attempt++){
      var triple=drawTriple(random),candidates=tripleCandidates(triple,random);
      if(candidates.length<5||candidates.length>9)continue;
      var divs=candidates.filter(function(v){return triple.a%v===0&&triple.b%v===0&&triple.c%v===0;});
      var muls=candidates.filter(function(v){return v%triple.a===0&&v%triple.b===0&&v%triple.c===0;});
      if(divs.length<2||divs.length>=candidates.length)continue;
      if(muls.length<2||muls.length>=candidates.length)continue;
      var first=buildTripleSelect(lv,"common_div3_select",triple,candidates,random);
      var second=buildTripleSelect(lv,"common_mul3_select",triple,candidates,random);
      markPair(first,second,"P12");
      return [first,second];
    }
    throw new Error("3 数の対比ペアを作れません");
  }
  function buildTripleNum(lv,pattern,random){
    var triple=drawTriple(random);
    var value=pattern==="gcd3_num"?triple.g:triple.l;
    return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:pattern,
      params:{a:triple.a,b:triple.b,c:triple.c},numbers:[triple.a,triple.b,triple.c],
      text:triple.a+" と "+triple.b+" と "+triple.c+" の"+(pattern==="gcd3_num"?"最大公約数":"最小公倍数")+"はいくつですか。",
      ans:value});
  }

  /* ==========================================================================
     診断 (4.8 章、8 章)。答案は「わけ」「しき」「こたえ」の 3 欄。
     ラベルは 8 章の正本のみ。正答肢は correct の 1 種だけ (発案者の決定 1)。
     ========================================================================== */
  function makeDiagnosis(lv,spec,random){
    var errors=spec.errors;
    if(!errors){
      var pool=AVAILABLE_ERRORS[lv].filter(function(id){return id!==spec.errorType;});
      var take=sample(pool,spec.errorType==="correct"?3:2,random);
      errors=spec.errorType==="correct"?take:[spec.errorType].concat(take);
    }
    if(errors.length!==3)throw new Error("診断の誤り肢は 3 つです");
    if(spec.errorType!=="correct"&&errors.indexOf(spec.errorType)<0)throw new Error("正解ラベルが肢にありません");
    var q=baseQuestion({lv:lv,format:"diagnosis",kind:"choice",pattern:spec.pattern,
      ask:spec.ask||"none",template:spec.template||null,
      params:spec.params||{},numbers:spec.numbers||[],boundary:spec.boundary||null,
      agreement:spec.agreement||null,phrase:spec.phrase||null,
      errorType:spec.errorType,alternative:!!spec.alternative,
      askVariant:spec.askVariant||null,workReason:spec.reason,workExpression:spec.expression,
      text:spec.person+"さんの答案を見て、正しいか、何をまちがえているかをえらびましょう。もんだい: "+spec.text});
    q.work=["わけ "+spec.reason,"しき "+spec.expression,"こたえ "+spec.shown];
    q.errorChoices=errors.slice();
    /* 検証 23 の期待値計算に使う。その問題が成立させられるラベルの集合。 */
    q.errorSupport=(spec.support||["correct"].concat(AVAILABLE_ERRORS[lv])).slice();
    q.correctAnswer=spec.correctAnswer;
    q.shownAnswer=spec.shownAnswer;
    var entries=[{text:DIAGNOSIS_LABELS.correct,value:"correct",correct:spec.errorType==="correct"}]
      .concat(errors.map(function(id){
        return {text:DIAGNOSIS_LABELS[id],value:id,correct:spec.errorType===id};
      }));
    return placeChoices(q,entries,random);
  }
  function radicalOf(n){
    return unique(primeFactors(n)).reduce(function(acc,p){return acc*p;},1);
  }

  function labelsFor(lv,list){
    return list.filter(function(id){return id==="correct"||AVAILABLE_ERRORS[lv].indexOf(id)>=0;});
  }
  /* 誤りラベルは、その問題が成立させられる集合 (support) から一様に引く。
     正答案は 4 分の 1 で、Lv ごとのプール全体の比率を 20 から 30% に保つ (4.8 章)。 */
  function pickLabel(support,random,exclude){
    var blocked=exclude||[];
    var errors=support.filter(function(id){return id!=="correct"&&blocked.indexOf(id)<0;});
    var canCorrect=support.indexOf("correct")>=0&&blocked.indexOf("correct")<0;
    if(canCorrect&&(!errors.length||randomValue(random)<0.25))return "correct";
    if(!errors.length)throw new Error("使える誤りラベルがありません");
    return pick(errors,random);
  }

  /* --- 8.2 章の表層形衝突。同じ答案の式 (または「わけ」) が、もとの問題を変えると
     別のラベルになる組を Lv ごとに 2 組以上持つ。両側は同じパラメタから作る。 --- */
  function factorKindsN(random){
    var pool=[];
    for(var n=BANDS.factorN.min;n<=BANDS.factorN.max;n++){
      var exps=factorExponents(n);
      if(exps.length<2||exps.length>3)continue;
      if(exps.some(function(item){return [2,3,5,7].indexOf(item.prime)<0;}))continue;
      if(exps.reduce(function(acc,item){return acc*item.exp;},1)===exps.length)pool.push(n);
    }
    return pick(pool,random);
  }
  function compositeSplit(n){
    var factors=primeFactors(n);
    if(factors.length<3)return null;
    var merged=factors.slice();
    merged.splice(1,2,factors[1]*factors[2]);
    return n+" = "+merged.join("×");
  }
  function factorCountCase(lv,random){
    var n=factorKindsN(random),exps=factorExponents(n),product=exps.reduce(function(a,i){return a*i.exp;},1);
    var reason=exps.map(function(item){return item.prime+" が "+item.exp+" 個";}).join("、")+"ならんでいるから、その数をかける";
    var expression=exps.map(function(item){return item.exp;}).join("×")+"="+product;
    var head=n+" を素因数分解すると "+n+" = "+factorProduct(n)+" です。";
    function side(kinds){
      return makeDiagnosis(lv,{pattern:"factor_count",person:pick(PERSON_NAMES,random),ask:"count",
        askVariant:kinds?"kinds":"count",
        text:head+(kinds?n+" の素因数分解に素数は何種類ありますか。":n+" の約数は全部で何個ありますか。"),
        reason:reason,expression:expression,shown:product+(kinds?" 種類":" 個"),
        errorType:kinds?"correct":"count_off",params:{n:n},numbers:[n],
        support:labelsFor(lv,["correct","count_off"]),
        correctAnswer:kinds?exps.length:divisorCount(n),shownAnswer:product},random);
    }
    return {a:side(true),b:side(false)};
  }
  function factorizeCase(lv,random){
    var n=drawFactorN(random),split=compositeSplit(n);
    if(!split)return null;
    function side(any){
      return makeDiagnosis(lv,{pattern:"factorize",person:pick(PERSON_NAMES,random),
        askVariant:any?"anyProduct":"prime",
        text:any?n+" を、1 でない数のかけ算で表しましょう。":n+" を素因数の積で表しましょう。",
        reason:"小さい数から順にかけ算に分けた",expression:split,shown:split.split(" = ")[1],
        errorType:any?"correct":"factor_incomplete",params:{n:n},numbers:[n],
        support:labelsFor(lv,["correct","factor_incomplete"]),
        correctAnswer:any?split:n+" = "+factorProduct(n),shownAnswer:split},random);
    }
    return {a:side(true),b:side(false)};
  }
  function sceneExpressionCase(lv,random){
    for(var attempt=0;attempt<200;attempt++){
      try{
        var ab=drawCommonPair(random),a=ab[0],b=ab[1];
        if(gcd(a,b)<3)continue;
        var match=buildSceneQuestion(lv,"scene_gcd_size","normal",{a:a,b:b},random);
        var reverse=buildSceneQuestion(lv,"scene_lcm_capped","normal",{a:a,b:b,bound:match.params.bound,
          template:match.template,unit:match.params.unit},random);
        var first=sceneDiagnosisFrom(lv,match,"correct",random,null,true);
        var second=sceneDiagnosisFrom(lv,reverse,"swap_gcd_lcm",random,null,true);
        if(!first||!second||first.workExpression!==second.workExpression)continue;
        return {a:first,b:second};
      }catch(error){continue;}
    }
    return null;
  }
  function sceneReasonCase(lv,random){
    for(var attempt=0;attempt<200;attempt++){
      try{
        var params=scenePairParams("B",random,null),template=pairTemplateFor("B",random);
        var unit=pick(SCENE_TEMPLATES[template].units,random);
        var phrase=pick(SCENE_TEMPLATES[template].gcd.min.filter(function(text){
          return SCENE_TEMPLATES[template].lcm.min.indexOf(text)>=0;
        }),random);
        var options={a:params.a,b:params.b,bound:params.bound,template:template,unit:unit,phrase:phrase};
        var match=buildSceneQuestion(lv,"scene_lcm_size","normal",options,random);
        var reverse=buildSceneQuestion(lv,"scene_gcd_count","normal",options,random);
        var first=sceneDiagnosisFrom(lv,match,"correct",random,null);
        var second=sceneDiagnosisFrom(lv,reverse,"word_cue",random,null);
        if(!first||!second||first.workReason!==second.workReason)continue;
        return {a:first,b:second};
      }catch(error){continue;}
    }
    return null;
  }
  function alignCase(lv,random){
    var data=alignParams(random);
    function side(inclusive){
      return makeDiagnosis(lv,{pattern:"cycle_align_count",person:pick(PERSON_NAMES,random),ask:"count",
        askVariant:inclusive?"inclusive":"exclusive",
        text:"A のライトは "+data.a+" 秒ごと、B のライトは "+data.b+" 秒ごとに光ります。いま同時に光りました。このあと "
          +data.total+" 秒"+(inclusive?"までのあいだに":"より前に")+"、2 つが同時に光るのは何回ありますか。",
        reason:data.a+" と "+data.b+" の最小公倍数は "+data.l+" だから、"+data.l+" 秒ごとに同時に光る",
        expression:data.total+"÷"+data.l+"="+data.times,shown:data.times+" 回",
        errorType:inclusive?"correct":"count_off",
        params:{a:data.a,b:data.b,total:data.total},numbers:[data.a,data.b,data.total],
        support:labelsFor(lv,["correct","count_off"]),
        correctAnswer:inclusive?data.times:data.times-1,shownAnswer:data.times},random);
    }
    return {a:side(true),b:side(false)};
  }
  function quotientCase(lv,random){
    var data=cycleParams(random);
    var expression=data.n+"÷7="+data.quotient+" あまり "+data.remainder+" で商を使う";
    function side(count){
      return makeDiagnosis(lv,{pattern:count?"cycle_count":"cycle_weekday",person:pick(PERSON_NAMES,random),ask:"count",
        askVariant:count?"excludeToday":null,
        text:count
          ?"今日は"+WEEKDAYS[data.start]+"です。今日から "+data.n+" 日の間に、"+WEEKDAYS[data.start]+"は何回ありますか。今日は数えません。"
          :"今日は"+WEEKDAYS[data.start]+"です。"+data.n+" 日後は何曜日ですか。",
        reason:"くり返しの回数を出して、それを使う",expression:expression,
        shown:count?data.quotient+" 回":WEEKDAYS[(data.start+data.quotient)%7],
        errorType:count?"correct":"quotient_remainder",
        params:{n:data.n,start:data.start},numbers:[data.n],
        support:labelsFor(lv,["correct","quotient_remainder"]),
        correctAnswer:count?data.quotient:WEEKDAYS[(data.start+data.remainder)%7],
        shownAnswer:count?data.quotient:WEEKDAYS[(data.start+data.quotient)%7]},random);
    }
    return {a:side(true),b:side(false)};
  }
  function productCase(lv,random){
    for(var attempt=0;attempt<300;attempt++){
      var ab=drawCommonPair(random),a=ab[0],b=ab[1],g=gcd(a,b),l=lcm(a,b);
      if(g<2||l===g)continue;
      var expression=a+"×"+b+"="+(a*b)+"  "+(a*b)+"÷"+g+"="+l;
      var reason="2 数の積を最大公約数でわると最小公倍数になる";
      var first=makeDiagnosis(lv,{pattern:"lcm_num",person:pick(PERSON_NAMES,random),
        text:a+" と "+b+" の最小公倍数はいくつですか。",reason:reason,expression:expression,shown:l,
        errorType:"correct",alternative:true,params:{a:a,b:b},numbers:[a,b],
        support:labelsFor(lv,["correct","swap_gcd_lcm"]),correctAnswer:l,shownAnswer:l},random);
      var second=makeDiagnosis(lv,{pattern:"gcd_num",person:pick(PERSON_NAMES,random),
        text:a+" と "+b+" の最大公約数はいくつですか。",reason:reason,expression:expression,shown:l,
        errorType:"swap_gcd_lcm",params:{a:a,b:b},numbers:[a,b],
        support:labelsFor(lv,["correct","swap_gcd_lcm"]),correctAnswer:g,shownAnswer:l},random);
      return {a:first,b:second};
    }
    return null;
  }
  function differenceCase(lv,random){
    for(var attempt=0;attempt<400;attempt++){
      var ab=drawCommonPair(random),a=ab[0],b=ab[1],g=gcd(a,b),l=lcm(a,b);
      if(b-a!==g||l===g)continue;
      var expression=b+"-"+a+"="+g,reason="2 数の差が共通の大きさになる";
      var first=makeDiagnosis(lv,{pattern:"gcd_num",person:pick(PERSON_NAMES,random),
        text:a+" と "+b+" の最大公約数はいくつですか。",reason:reason,expression:expression,shown:g,
        errorType:"correct",alternative:true,params:{a:a,b:b},numbers:[a,b],
        support:labelsFor(lv,["correct","swap_gcd_lcm"]),correctAnswer:g,shownAnswer:g},random);
      var second=makeDiagnosis(lv,{pattern:"lcm_num",person:pick(PERSON_NAMES,random),
        text:a+" と "+b+" の最小公倍数はいくつですか。",reason:reason,expression:expression,shown:g,
        errorType:"swap_gcd_lcm",params:{a:a,b:b},numbers:[a,b],
        support:labelsFor(lv,["correct","swap_gcd_lcm"]),correctAnswer:l,shownAnswer:g},random);
      return {a:first,b:second};
    }
    return null;
  }
  var COLLISION_CASES={
    5:[factorCountCase,factorizeCase],
    6:[sceneExpressionCase,sceneReasonCase],
    8:[alignCase,quotientCase],
    9:[productCase,differenceCase],
    10:[factorCountCase,factorizeCase,sceneExpressionCase,sceneReasonCase,alignCase,quotientCase,productCase,differenceCase]
  };
  function collisionCase(lv,index,random){
    var builder=COLLISION_CASES[lv][index];
    for(var attempt=0;attempt<20;attempt++){
      var built=builder(lv,random);
      if(built)return built;
    }
    throw new Error("表層形衝突の組を作れません: Lv"+lv+" の "+index);
  }

  /* --- 領域別の診断 ---------------------------------------------------------- */
  function sceneSupport(lv,question){
    var a=question.params.a,b=question.params.b,g=gcd(a,b),l=lcm(a,b);
    var right=typeof question.ans==="number"?question.ans:question.answerValue;
    var swapped=question.direction==="gcd"?l:g;
    var out=["correct","calc_only"];
    /* 誤答の値が正解と一致する組は成立しない。support は実際に作れるラベルだけを持つ
       (検証 23 の期待値がこの集合から計算される)。 */
    if(swapped!==right&&swapped>0&&swapped<=9999)out.push("swap_gcd_lcm");
    if(swapped!==right&&swapped>0&&(question.ask==="max"||question.ask==="min")
      &&(question.agreement==="reverseA"||question.agreement==="reverseB"))out.push("word_cue");
    if(question.direction==="lcm"&&a*b!==right&&a*b<=9999)out.push("not_minimal");
    if(question.direction==="gcd"&&radicalOf(g)!==right)out.push("not_maximal");
    if((question.ask==="nth"||question.ask==="count")&&right+1<=9999)out.push("count_off");
    return labelsFor(lv,out);
  }
  function sceneDiagnosisFrom(lv,question,errorType,random,errors,forceBase){
    var a=question.params.a,b=question.params.b,g=gcd(a,b),l=lcm(a,b);
    var right=typeof question.ans==="number"?question.ans:question.answerValue;
    var support=sceneSupport(lv,question);
    if(support.indexOf(errorType)<0)return null;
    var reason,expression,shown,wrong,alternative=false;
    if(errorType==="swap_gcd_lcm"){
      reason="2 つの数に共通する数を求める";
      wrong=question.direction==="gcd"?l:g;
      expression=a+" と "+b+" の"+(question.direction==="gcd"?"最小公倍数":"最大公約数")+"は "+wrong;
    }else if(errorType==="word_cue"){
      reason="「"+question.phrase+"」と書いてあるから、"+(question.ask==="max"?"大きいほうを作る":"小さいほうを作る");
      wrong=question.direction==="gcd"?l:g;
      expression=a+" と "+b+" の"+(question.direction==="gcd"?"最小公倍数":"最大公約数")+"は "+wrong;
    }else if(errorType==="not_minimal"){
      reason="2 数をかければ両方でわり切れる";wrong=a*b;
      expression=a+"×"+b+"="+wrong;
    }else if(errorType==="not_maximal"){
      reason="両方にある素数を 1 つずつかける";wrong=radicalOf(g);
      expression=factorProduct(radicalOf(g))+"="+wrong;
    }else if(errorType==="count_off"){
      reason="数えはじめを 1 つずらした";wrong=right+1;
      expression=a+" と "+b+" の公約数は "+commonDivisors(a,b).join(", ");
    }else if(errorType==="calc_only"){
      reason="向きは合っているので、そのまま計算する";wrong=right+pick([1,2],random);
      expression=a+" と "+b+" の"+(question.direction==="gcd"?"最大公約数":"最小公倍数")+"は "+wrong;
    }else{
      reason=(question.ask==="max"||question.ask==="min")
        ?"「"+question.phrase+"」と書いてあるから、"+(question.ask==="max"?"大きいほうを作る":"小さいほうを作る")
        :"2 つの数に共通する数を求める";
      /* Lv10 は別解の道が 2 本増える (8.1 章)。素因数分解から共通の素数を集める道と、
         小さいほうの倍数を順に調べる道。正答案の 3 分の 1 以上を別解にする (4.8 章)。 */
      if(lv===10&&randomValue(random)<0.6){
        alternative=true;
        reason=question.direction==="gcd"
          ?"それぞれを素数のかけ算になおして、共通の素数を集める"
          :"小さいほうの倍数を順に調べて、大きいほうでもわり切れる数をさがす";
      }
      wrong=right;shown=right;
      var base=question.direction==="gcd"?g:l;
      if(forceBase&&right!==base)return null;
      expression=a+" と "+b+" の"+(question.direction==="gcd"?"最大公約数":"最小公倍数")+"は "+base
        +(right===base?"":"。そこから "+right+" を出す");
    }
    if(typeof wrong!=="number"||!(wrong>0)||wrong>9999)return null;
    if(errorType!=="correct"&&wrong===right)return null;
    var built=makeDiagnosis(lv,{pattern:question.pattern,person:pick(PERSON_NAMES,random),ask:question.ask,
      template:question.template,params:question.params,numbers:question.numbers.slice(),
      boundary:question.boundary,agreement:question.agreement,phrase:question.phrase,
      text:question.text,reason:reason,expression:expression,
      shown:typeof shown==="number"?shown:wrong,errorType:errorType,errors:errors,support:support,
      alternative:alternative,correctAnswer:right,shownAnswer:typeof shown==="number"?shown:wrong},random);
    return built;
  }
  function sceneDiagnosisAuto(lv,question,random,exclude,errors){
    var support=sceneSupport(lv,question);
    for(var attempt=0;attempt<20;attempt++){
      var label=pickLabel(support,random,exclude);
      var built=sceneDiagnosisFrom(lv,question,label,random,errors);
      if(built)return built;
    }
    throw new Error("場面の診断を作れません: "+question.pattern);
  }
  function sceneDiagnosis(lv,pattern,random,exclude,errors){
    for(var attempt=0;attempt<200;attempt++){
      try{
        var ab=drawCommonPair(random);
        if(gcd(ab[0],ab[1])<3)continue;
        var base=buildSceneQuestion(lv,pattern,"normal",{a:ab[0],b:ab[1]},random);
        return sceneDiagnosisAuto(lv,base,random,exclude,errors);
      }catch(error){continue;}
    }
    throw new Error("場面の診断を作れません: "+pattern);
  }
  function numDiagnosis(lv,random,exclude,errors){
    for(var attempt=0;attempt<300;attempt++){
      var ab=drawCommonPair(random),a=ab[0],b=ab[1],g=gcd(a,b),l=lcm(a,b);
      if(g<2||l===g)continue;
      var support=labelsFor(lv,["correct","swap_gcd_lcm","word_cue","calc_only"]
        .concat(a*b!==l?["not_minimal"]:[]).concat(radicalOf(g)!==g?["not_maximal"]:[]));
      var label=pickLabel(support,random,exclude);
      if(label==="correct"){
        /* 別解が立つのは Lv9 と Lv10 (8.1 章)。正答案の 3 分の 1 以上を別解にする。 */
        /* 別解が立つ Lv9 と Lv10 では、正答案の 3 分の 1 以上を別解にする (4.8 章)。
           場面の診断の正答案には別解が立たないので、数のみの枠で比率を作る。 */
        if((lv===9||lv===10)&&randomValue(random)<0.85){
          var alt=pick([productCase,differenceCase],random)(lv,random);
          if(alt)return withSupport(alt.a,support);
        }
        return makeDiagnosis(lv,{pattern:"lcm_num",person:pick(PERSON_NAMES,random),
          text:a+" と "+b+" の最小公倍数はいくつですか。",
          reason:"素数のかけ算にして、多いほうの回数をとる",
          expression:a+" と "+b+" の最小公倍数は "+l,shown:l,errorType:"correct",
          params:{a:a,b:b},numbers:[a,b],errors:errors,support:support,
          correctAnswer:l,shownAnswer:l},random);
      }
      if(label==="swap_gcd_lcm"&&randomValue(random)<0.5){
        var swapCase=pick([productCase,differenceCase],random)(lv,random);
        if(swapCase)return withSupport(swapCase.b,support);
      }
      if(label==="swap_gcd_lcm")
        return makeDiagnosis(lv,{pattern:"lcm_num",person:pick(PERSON_NAMES,random),
          text:a+" と "+b+" の最小公倍数はいくつですか。",reason:"2 つの数に共通する数を求める",
          expression:a+" と "+b+" の最大公約数は "+g,shown:g,errorType:"swap_gcd_lcm",
          params:{a:a,b:b},numbers:[a,b],errors:errors,support:support,correctAnswer:l,shownAnswer:g},random);
      if(label==="word_cue")
        return makeDiagnosis(lv,{pattern:"gcd_num",person:pick(PERSON_NAMES,random),
          text:a+" と "+b+" の最大公約数はいくつですか。",reason:"「最大」と書いてあるから、大きいほうを作る",
          expression:a+" と "+b+" の最小公倍数は "+l,shown:l,errorType:"word_cue",
          params:{a:a,b:b},numbers:[a,b],errors:errors,support:support,correctAnswer:g,shownAnswer:l},random);
      if(label==="not_minimal")
        return makeDiagnosis(lv,{pattern:"lcm_num",person:pick(PERSON_NAMES,random),
          text:a+" と "+b+" の最小公倍数はいくつですか。",reason:"2 数をかければ両方でわり切れる",
          expression:a+"×"+b+"="+(a*b),shown:a*b,errorType:"not_minimal",
          params:{a:a,b:b},numbers:[a,b],errors:errors,support:support,correctAnswer:l,shownAnswer:a*b},random);
      if(label==="not_maximal")
        return makeDiagnosis(lv,{pattern:"gcd_num",person:pick(PERSON_NAMES,random),
          text:a+" と "+b+" の最大公約数はいくつですか。",reason:"両方にある素数を 1 つずつかける",
          expression:factorProduct(radicalOf(g))+"="+radicalOf(g),shown:radicalOf(g),errorType:"not_maximal",
          params:{a:a,b:b},numbers:[a,b],errors:errors,support:support,correctAnswer:g,shownAnswer:radicalOf(g)},random);
      var off=l+pick([1,2],random);
      return makeDiagnosis(lv,{pattern:"lcm_num",person:pick(PERSON_NAMES,random),
        text:a+" と "+b+" の最小公倍数はいくつですか。",reason:"素数のかけ算にして、多いほうの回数をとる",
        expression:a+" と "+b+" の最小公倍数は "+off,shown:off,errorType:"calc_only",
        params:{a:a,b:b},numbers:[a,b],errors:errors,support:support,correctAnswer:l,shownAnswer:off},random);
    }
    throw new Error("数のみの診断を作れません");
  }
  function cycleDiagnosis(lv,random,exclude,errors){
    var support=labelsFor(lv,["correct","quotient_remainder","count_off","swap_gcd_lcm","calc_only"]);
    var label=pickLabel(support,random,exclude);
    if(label==="correct"){
      var pair=randomValue(random)<0.5?alignCase(lv,random):quotientCase(lv,random);
      return withSupport(pair.a,support);
    }
    if(label==="quotient_remainder")return withSupport(quotientCase(lv,random).b,support);
    if(label==="count_off"){
      if(randomValue(random)<0.5)return withSupport(alignCase(lv,random).b,support);
      var data=cycleParams(random);
      return makeDiagnosis(lv,{pattern:"cycle_count",person:pick(PERSON_NAMES,random),ask:"count",
        text:"今日は"+WEEKDAYS[data.start]+"です。今日から "+data.n+" 日の間に、"+WEEKDAYS[data.start]+"は何回ありますか。今日も数えます。",
        reason:"くり返しの回数をそのまま答える",
        expression:data.n+"÷7="+data.quotient+" あまり "+data.remainder,shown:data.quotient+" 回",
        errorType:"count_off",params:{n:data.n,start:data.start},numbers:[data.n],
        errors:errors,support:support,correctAnswer:data.quotient+1,shownAnswer:data.quotient},random);
    }
    if(label==="swap_gcd_lcm"){
      for(var attempt=0;attempt<100;attempt++){
        var align=alignParams(random),g=gcd(align.a,align.b);
        if(g===align.l||Math.floor(align.total/g)===align.times)continue;
        return makeDiagnosis(lv,{pattern:"cycle_align_count",person:pick(PERSON_NAMES,random),ask:"count",
          text:"A のライトは "+align.a+" 秒ごと、B のライトは "+align.b+" 秒ごとに光ります。いま同時に光りました。このあと "
            +align.total+" 秒までのあいだに、2 つが同時に光るのは何回ありますか。",
          reason:"2 つに共通する数を求める",
          expression:align.a+" と "+align.b+" の最大公約数は "+g+" だから "+align.total+"÷"+g+"="+Math.floor(align.total/g),
          shown:Math.floor(align.total/g)+" 回",errorType:"swap_gcd_lcm",
          params:{a:align.a,b:align.b,total:align.total},numbers:[align.a,align.b,align.total],
          errors:errors,support:support,correctAnswer:align.times,shownAnswer:Math.floor(align.total/g)},random);
      }
      throw new Error("周期の取りちがえを作れません");
    }
    var calc=alignParams(random),off=calc.times+pick([1,2],random);
    return makeDiagnosis(lv,{pattern:"cycle_align_count",person:pick(PERSON_NAMES,random),ask:"count",
      text:"A のライトは "+calc.a+" 秒ごと、B のライトは "+calc.b+" 秒ごとに光ります。いま同時に光りました。このあと "
        +calc.total+" 秒までのあいだに、2 つが同時に光るのは何回ありますか。",
      reason:calc.a+" と "+calc.b+" の最小公倍数は "+calc.l+" だから、"+calc.l+" 秒ごとに同時に光る",
      expression:calc.total+"÷"+calc.l+"="+off,shown:off+" 回",errorType:"calc_only",
      params:{a:calc.a,b:calc.b,total:calc.total},numbers:[calc.a,calc.b,calc.total],
      errors:errors,support:support,correctAnswer:calc.times,shownAnswer:off},random);
  }
  function primeCheckDiagnosis(lv,random,correct,errors,support){
    var pc=primeCheckData(random),wrong=pc.primes.length+pick([1,-1],random);
    var shown=correct?pc.primes.length:wrong;
    return makeDiagnosis(lv,{pattern:"prime_check",person:pick(PERSON_NAMES,random),ask:"count",
      text:pc.list.join(", ")+" の中に素数は何個ありますか。",
      reason:"1 とその数でしかわれない数を数える",
      expression:"数えた素数は "+shown+" 個",shown:shown+" 個",
      errorType:correct?"correct":"count_off",
      params:{list:pc.list},numbers:pc.list.slice(),errors:errors,
      support:support||labelsFor(lv,["correct","count_off"]),
      correctAnswer:pc.primes.length,shownAnswer:shown},random);
  }
  function withSupport(question,support){question.errorSupport=support.slice();return question;}
  function factorDiagnosis(lv,random,exclude,errors){
    var support=labelsFor(lv,["correct","count_off","factor_incomplete","calc_only"]);
    var label=pickLabel(support,random,exclude);
    var wrap=function(built){return withSupport(built,support);};
    if(label==="correct"){
      if(randomValue(random)<0.34)return wrap(primeCheckDiagnosis(lv,random,true,errors,null));
      return wrap((randomValue(random)<0.5?factorCountCase(lv,random):(factorizeCase(lv,random)||factorCountCase(lv,random))).a);
    }
    if(label==="count_off"){
      if(randomValue(random)<0.34)return wrap(primeCheckDiagnosis(lv,random,false,errors,null));
      return wrap(factorCountCase(lv,random).b);
    }
    if(label==="factor_incomplete"){
      var built=factorizeCase(lv,random);
      return wrap(built?built.b:factorCountCase(lv,random).b);
    }
    var n=drawFactorN(random),exps=factorExponents(n),right=divisorCount(n),wrong=right+pick([1,2],random);
    return makeDiagnosis(lv,{pattern:"factor_count",person:pick(PERSON_NAMES,random),ask:"count",
      text:n+" を素因数分解すると "+n+" = "+factorProduct(n)+" です。"+n+" の約数は全部で何個ありますか。",
      reason:"それぞれの個数に 1 をたしてかける",
      expression:exps.map(function(item){return "("+item.exp+"+1)";}).join("×")+"="+wrong,
      shown:wrong+" 個",errorType:"calc_only",params:{n:n},numbers:[n],
      errors:errors,support:support,correctAnswer:right,shownAnswer:wrong},random);
  }

  /* ==========================================================================
     ペアと連鎖の印、出題順、足場 (4.1 / 4.3 / 4.5 / 4.6 章)
     ========================================================================== */
  function reshuffleChoices(question,random){
    var order=shuffle(range(0,question.choices.length-1),random);
    var choices=[],values=[],errors=[],answer=-1;
    order.forEach(function(from,to){
      choices.push(question.choices[from]);
      values.push(question.choiceValues?question.choiceValues[from]:null);
      errors.push(question.choiceErrors?question.choiceErrors[from]:null);
      if(from===question.ans)answer=to;
    });
    question.choices=choices;question.choiceValues=values;question.choiceErrors=errors;question.ans=answer;
  }
  function markPair(first,second,type,random){
    if(PAIR_TYPES.indexOf(type)<0)throw new Error("対比ペアの型が正しくありません: "+type);
    /* 選択で答えるペアは正解の位置も変える。同じ位置に置くと、位置を固定した
       ソルバーが向きを読まずに 2 問とも取れる (4.3 章の「答えが異なる」)。 */
    if(random&&first.kind==="choice"&&second.kind==="choice"){
      for(var attempt=0;attempt<40&&first.ans===second.ans;attempt++)reshuffleChoices(second,random);
      if(first.ans===second.ans)throw new Error("ペアの正解位置を分けられません");
    }
    var id="pair_"+first.lv+"_"+type;
    first.pairId=id;second.pairId=id;first.pairType=type;second.pairType=type;
  }
  function markChain(recognition,production){
    var id="chain_"+recognition.lv+"_"+recognition.pattern;
    recognition.chainId=id;production.chainId=id;
    recognition.chainRole="recognition";production.chainRole="production";
  }
  function permutations(n){
    var out=[];
    (function walk(prefix,rest){
      if(!rest.length){out.push(prefix);return;}
      rest.forEach(function(value,index){
        walk(prefix.concat([value]),rest.slice(0,index).concat(rest.slice(index+1)));
      });
    })([],range(0,n-1));
    return out;
  }
  var PERMS5=permutations(SET_SIZE);
  function orderingIsValid(order,list){
    var position={};
    order.forEach(function(index,at){position[index]=at;});
    var pairs={},chains={};
    list.forEach(function(question,index){
      if(question.pairId)(pairs[question.pairId]=pairs[question.pairId]||[]).push(index);
      if(question.chainId)(chains[question.chainId]=chains[question.chainId]||[]).push(index);
    });
    var ok=true;
    Object.keys(pairs).forEach(function(key){
      var members=pairs[key];
      if(members.length!==2||Math.abs(position[members[0]]-position[members[1]])!==1)ok=false;
    });
    Object.keys(chains).forEach(function(key){
      var members=chains[key];
      if(members.length!==2){ok=false;return;}
      var recognition=list[members[0]].chainRole==="recognition"?members[0]:members[1];
      var production=recognition===members[0]?members[1]:members[0];
      if(position[production]-position[recognition]!==1)ok=false;
    });
    if(!ok)return false;
    for(var at=0;at+1<order.length;at++){
      var left=list[order[at]],right=list[order[at+1]];
      if(left.patternId!==right.patternId)continue;
      if(left.chainId&&left.chainId===right.chainId)continue;
      return false;
    }
    return true;
  }
  function orderQuestions(list,random){
    var valid=PERMS5.filter(function(order){return orderingIsValid(order,list);});
    if(!valid.length)throw new Error("出題順の制約を同時に満たせません");
    return pick(valid,random).map(function(index){return list[index];});
  }

  /* 足場は前半 2 問に付き、本問の与件の数を使わない。向きが問われる Lv では
     公約数側と公倍数側の両方を示すか、どちらも示さない (4.1 章)。 */
  function scaffoldCandidates(lv,random){
    var out=[];
    if(lv===1||lv===2){
      [10,14,15,21,22,26,33,34,35,38,39,46,51,55,57,58,62,65,69,74].forEach(function(m){
        var divs=divisors(m);
        if(lv===1)out.push({text:m+" の約数は "+divs.join(", ")+" の "+divs.length+" 個です。",numbers:[m].concat(divs)});
        else out.push({text:m+" の倍数は "+m+", "+(m*2)+", "+(m*3)+" とつづきます。"+m+" の約数は "+divs.join(", ")+" です。",
          numbers:[m,m*2,m*3].concat(divs)});
      });
      return shuffle(out,random);
    }
    if(lv===5){
      [12,18,20,28,44,45,50,52,63,68,75,76,92,98,99].forEach(function(m){
        out.push({text:m+" = "+factorProduct(m)+" です。",numbers:[m].concat(primeFactors(m))});
      });
      return shuffle(out,random);
    }
    if(lv===7){
      /* 向きの語を含まない実例。公約数側も公倍数側も名指ししない (S7)。 */
      [13,17,19,23,29,31,37].forEach(function(y){
        [2,3].forEach(function(k){
          [1,2,3,4,5].forEach(function(r){
            out.push({text:(y*k+r)+" を "+y+" でわると "+r+" あまります。",numbers:[y*k+r,y,r]});
          });
        });
      });
      return shuffle(out,random);
    }
    if(lv===8){
      return [{text:"1 週間は 7 日で、7 日後は同じ曜日にもどります。",numbers:[1,7]},
        {text:"曜日は 7 日ごとにもどります。14 日後も同じ曜日です。",numbers:[7,14]}];
    }
    /* 向きが問われる段 (3、4、6、9) は両向きを併記する。 */
    [[4,6],[6,9],[8,10],[9,15],[10,14],[14,21],[15,25],[21,35],[22,33],[25,35],[26,39],[33,55]].forEach(function(row){
      var a=row[0],b=row[1],l=lcm(a,b),divs=commonDivisors(a,b);
      out.push({text:a+" と "+b+" の公約数は "+divs.join(", ")+" です。公倍数は "+l+", "+(l*2)+", "+(l*3)+" とつづきます。",
        numbers:[a,b,l,l*2,l*3].concat(divs)});
    });
    return shuffle(out,random);
  }
  function attachScaffolds(lv,ordered,random){
    if(lv===10)return ordered;
    var candidates=scaffoldCandidates(lv,random),taken=[];
    ordered.slice(0,2).forEach(function(question){
      var chosen=null;
      candidates.forEach(function(entry){
        if(chosen||taken.indexOf(entry.text)>=0)return;
        var clash=entry.numbers.some(function(value){return question.numbers.indexOf(value)>=0;});
        if(!clash)chosen=entry;
      });
      if(!chosen)throw new Error("足場に使える実例がありません");
      taken.push(chosen.text);
      question.scaffold=chosen.text;
    });
    return ordered;
  }
  function finalize(lv,list,random){
    if(list.length!==SET_SIZE)throw new Error("1 セットは 5 問です");
    var ordered=orderQuestions(list,random);
    return attachScaffolds(lv,ordered,random);
  }

  /* ==========================================================================
     Lv4 から Lv10 のセット構築
     ========================================================================== */
  function noWordScenePatterns(lv,direction){
    return LV_PATTERNS[lv].filter(function(id){
      if(PATTERNS[id].domain!=="scene")return false;
      var role=SCENE_ROLE[id];
      if(role.ask!=="count"&&role.ask!=="nth")return false;
      return !direction||PATTERNS[id].direction===direction;
    });
  }
  function buildLv4(random){
    var quadrant=pick(["A","B"],random);
    var pair=buildScenePair(4,quadrant,"normal",random);
    var used=[pair.gcd.phrase,pair.lcm.phrase];
    var otherQuadrant=quadrant==="A"?"B":"A";
    var matchPattern=otherQuadrant==="A"?QUADRANT_A.gcd:QUADRANT_B.lcm;
    var reversePattern=otherQuadrant==="A"?QUADRANT_A.lcm:QUADRANT_B.gcd;
    var soloParams=scenePairParams(otherQuadrant,random,4);
    var soloTemplate=pairTemplateFor(otherQuadrant,random);
    var soloUnit=pick(SCENE_TEMPLATES[soloTemplate].units,random);
    var matchQ=null,reverseQ=null;
    for(var attempt=0;attempt<200&&!matchQ;attempt++){
      var phrases=scenePhrases(soloTemplate,PATTERNS[matchPattern].direction,matchPattern)
        .filter(function(text){return used.indexOf(text)<0;});
      if(!phrases.length)break;
      matchQ=buildSceneQuestion(4,matchPattern,"formulation",
        {a:soloParams.a,b:soloParams.b,bound:soloParams.bound,template:soloTemplate,unit:soloUnit,phrase:pick(phrases,random)},random);
    }
    if(!matchQ)throw new Error("一致問題を作れません");
    used.push(matchQ.phrase);
    var reversePhrases=scenePhrases(soloTemplate,PATTERNS[reversePattern].direction,reversePattern)
      .filter(function(text){return used.indexOf(text)<0;});
    if(!reversePhrases.length)throw new Error("反転問題の言い回しが足りません");
    reverseQ=buildSceneQuestion(4,reversePattern,"formulation",
      {a:soloParams.a,b:soloParams.b,bound:soloParams.bound,template:soloTemplate,unit:soloUnit,phrase:pick(reversePhrases,random)},random);
    used.push(reverseQ.phrase);
    /* 大小語なし枠は公約数側と公倍数側の 2 種から抽選する (4.4.2 章の規則 2、N1)。 */
    var freePattern=pick(noWordScenePatterns(4),random);
    var freeQ=buildSceneSolo(4,freePattern,"formulation",random,used);
    /* 連鎖は立式 (一致問題) の直後に同じ向きの normal を置く。 */
    var production=PATTERNS[matchPattern].direction==="gcd"?pair.gcd:pair.lcm;
    markChain(matchQ,production);
    return finalize(4,[pair.gcd,pair.lcm,matchQ,reverseQ,freeQ],random);
  }

  function buildLv5(random){
    var zero=pick(["D6","D7"],random);
    var diagnosis=factorDiagnosis(5,random,null,null);
    /* 数あり整列は非連鎖形 (D2、D3、D4) に限る。診断が factorize なら整列から外す。 */
    var numberedPool=diagnosis.patternId==="factorize"?["D3","D4"]:["D2","D3","D4"];
    var orderingA=buildOrdering(5,zero,random),orderingB=buildOrdering(5,pick(numberedPool,random),random);
    var data=null;
    for(var tries=0;tries<60&&!data;tries++){
      var draft=factorPairData(random);
      /* 連鎖の 2 問は数値を変える (4.5 章)。 */
      if(draft.n!==diagnosis.params.n)data=draft;
    }
    if(!data)throw new Error("連鎖の数値を変えられません");
    var normalA=buildFactorCount(5,data),normalB=buildFactorCountCond(5,data);
    markPair(normalA,normalB,"P10");
    markChain(diagnosis,diagnosis.patternId==="factor_count"?normalA:normalB);
    return finalize(5,[orderingA,orderingB,diagnosis,normalA,normalB],random);
  }

  function sameLabelSet(a,b){
    if(!a||!b||a.length!==b.length)return false;
    var sortedA=a.slice().sort(),sortedB=b.slice().sort();
    return sortedA.every(function(value,index){return value===sortedB[index];});
  }

  function buildLv6(random){
    var quadrant=pick(["A","B"],random),useOneSided=randomValue(random)<0.4;
    var pair=buildScenePair(6,quadrant,"normal",random);
    var used=[pair.gcd.phrase,pair.lcm.phrase];
    var otherQuadrant=quadrant==="A"?"B":"A";
    var reversePattern=otherQuadrant==="A"?QUADRANT_A.lcm:QUADRANT_B.gcd;
    var matchPattern;
    if(useOneSided)matchPattern=pick(["scene_gcd_capped","scene_lcm_floored"],random);
    else matchPattern=otherQuadrant==="A"?QUADRANT_A.gcd:(randomValue(random)<0.5?QUADRANT_B.lcm:"scene_lcm_time");
    /* 反転問題を診断に、一致問題を立式に、大小語なしをもう 1 問の診断に割り当てる。 */
    var reverseBase=buildSceneSolo(6,reversePattern,"normal",random,used);
    used.push(reverseBase.phrase);
    var matchQ=buildSceneSolo(6,matchPattern,"normal",random,used);
    used.push(matchQ.phrase);
    var freePattern=pick(noWordScenePatterns(6),random);
    var freeBase=buildSceneSolo(6,freePattern,"normal",random,used);
    used.push(freeBase.phrase);
    var reverseDiagnosis=null,freeDiagnosis=null;
    for(var attempt=0;attempt<60&&!freeDiagnosis;attempt++){
      var head=sceneDiagnosisAuto(6,reverseBase,random,null,null);
      var mate=sceneDiagnosisAuto(6,freeBase,random,null,null);
      if(head.errorType===mate.errorType)continue;
      if(sameLabelSet(head.errorChoices,mate.errorChoices))continue;
      reverseDiagnosis=head;freeDiagnosis=mate;
    }
    if(!freeDiagnosis)throw new Error("大小語なしの診断を作れません");
    var matchForm=buildSceneQuestion(6,matchPattern,"formulation",
      {a:matchQ.params.a,b:matchQ.params.b,bound:matchQ.params.bound,
        template:matchQ.template,unit:matchQ.params.unit,phrase:matchQ.phrase},random);
    var production=PATTERNS[reversePattern].direction==="gcd"?pair.gcd:pair.lcm;
    markChain(reverseDiagnosis,production);
    return finalize(6,[pair.gcd,pair.lcm,matchForm,reverseDiagnosis,freeDiagnosis],random);
  }

  function buildLv7(random){
    /* 立式枠は 2 種から抽選する (検証 20)。連鎖は倍数側で組み、rem_divisor は 1 問に収める。 */
    var formulationPattern=pick(["rem_same","rem_zero","rem_count"],random);
    var data=remZeroParams(random);
    var zero=buildRemZero(7,data),count=buildRemCount(7,data);
    markPair(zero,count,"P11");
    var formulation,normalSame=null;
    if(formulationPattern==="rem_same"){
      formulation=buildRemSame(7,"formulation",random);
      for(var attempt=0;attempt<60&&!normalSame;attempt++){
        var candidate=buildRemSame(7,"normal",random);
        if(JSON.stringify(candidate.params)!==JSON.stringify(formulation.params))normalSame=candidate;
      }
      if(!normalSame)throw new Error("連鎖の数値を変えられません");
      markChain(formulation,normalSame);
    }else{
      var other=null;
      for(var tries=0;tries<60&&!other;tries++){
        var draft=remZeroParams(random);
        if(draft.p!==data.p||draft.q!==data.q||draft.m!==data.m)other=draft;
      }
      if(!other)throw new Error("連鎖の数値を変えられません");
      formulation=formulationPattern==="rem_zero"
        ?buildRemZeroFormulation(7,other,random):buildRemCountFormulation(7,other,random);
      normalSame=buildRemSame(7,"normal",random);
      markChain(formulation,formulationPattern==="rem_zero"?zero:count);
    }
    var findAllPattern=pick(["rem_divisor","rem_same_select","rem_zero_select"],random);
    var findAll=findAllPattern==="rem_divisor"?buildRemDivisor(7,random):buildRemSelect(7,findAllPattern,random);
    return finalize(7,[formulation,normalSame,zero,count,findAll],random);
  }

  function buildLv8(random){
    var pairData=cycleParams(random);
    var formWeekday=buildCycleFormulation(8,"cycle_weekday",pairData,random);
    var formCount=buildCycleFormulation(8,"cycle_count",pairData,random);
    markPair(formWeekday,formCount,"P5",random);
    var normalData=null,backData=null;
    for(var tries=0;tries<80&&!normalData;tries++){
      var draft=cycleParams(random);
      /* 連鎖の 2 問は数値を変える (4.5 章)。 */
      if(draft.n!==pairData.n)normalData=draft;
    }
    if(!normalData)throw new Error("連鎖の数値を変えられません");
    backData=cycleParams(random);
    var normalWeekday=buildCycleWeekdayNormal(8,"cycle_weekday",normalData,random);
    var normalBack=buildCycleWeekdayNormal(8,"cycle_weekday_back",backData,random);
    markChain(formWeekday,normalWeekday);
    var diagnosis=cycleDiagnosis(8,random,null,null);
    return finalize(8,[formWeekday,formCount,normalWeekday,normalBack,diagnosis],random);
  }

  function buildLv9(random){
    var numQ=null,sceneQ=null,scenePattern=pick(["scene_gcd_size","scene_lcm_time"],random);
    for(var tries=0;tries<60&&!sceneQ;tries++){
      var head=numDiagnosis(9,random,null,null);
      var mate=sceneDiagnosis(9,scenePattern,random,null,null);
      if(head.errorType===mate.errorType)continue;
      if(sameLabelSet(head.errorChoices,mate.errorChoices))continue;
      numQ=head;sceneQ=mate;
    }
    if(!sceneQ)throw new Error("診断の 2 問を作れません");
    var ab=drawCommonPairWith(random,function(a,b){
      /* 連鎖の 2 問は数値を変える (4.5 章)。 */
      return gcd(a,b)>=2&&lcm(a,b)!==gcd(a,b)&&(a!==numQ.params.a||b!==numQ.params.b);
    });
    var lcmQ=baseQuestion({lv:9,format:"normal",kind:"num",pattern:"lcm_num",
      params:{a:ab[0],b:ab[1]},numbers:[ab[0],ab[1]],
      text:ab[0]+" と "+ab[1]+" の最小公倍数はいくつですか。",ans:lcm(ab[0],ab[1])});
    var gcdQ=baseQuestion({lv:9,format:"normal",kind:"num",pattern:"gcd_num",
      params:{a:ab[0],b:ab[1]},numbers:[ab[0],ab[1]],
      text:ab[0]+" と "+ab[1]+" の最大公約数はいくつですか。",ans:gcd(ab[0],ab[1])});
    markPair(lcmQ,gcdQ,"P2");
    markChain(numQ,numQ.patternId==="lcm_num"?lcmQ:gcdQ);
    var setSel=commonSelectPair(9,random);
    var findAllPattern=pick(["common_div_select","common_mul_select"],random);
    var findAll=findAllPattern==="common_div_select"
      ?buildCommonDivSelect(9,setSel.a,setSel.b,setSel.candidates,random)
      :buildCommonMulSelect(9,setSel.a,setSel.b,setSel.candidates,random);
    return finalize(9,[numQ,lcmQ,gcdQ,sceneQ,findAll],random);
  }

  /* --- Lv10 -------------------------------------------------------------------
     整列 1 問を必ず含み、残る 4 問を 4 形式から取り、うち 1 形式を 2 問にして
     対比ペアとする (5.2 章)。どの形式を 2 問にするかは注入 random で決める。 */
  var FREE_BY_FORMAT={
    find_all:["div_select","mul_select","common_div_select","common_mul_select",
      "common_div3_select","common_mul3_select","rem_divisor","rem_same_select","rem_zero_select",
      "scene_gcd_ways","scene_lcm_ways"],
    normal:["mul_count","mul_capped","mul_nth","common_div_count","gcd3_num","lcm3_num",
      "factor_count_cond","prime_check","rem_same","rem_zero","rem_count","cycle_weekday_back",
      "scene_lcm_floored","scene_lcm_time"],
    formulation:["rem_same","cycle_weekday","cycle_count","scene_gcd_nth","scene_lcm_nth",
      "scene_gcd_ways","scene_lcm_ways","scene_lcm_floored","scene_lcm_time"]
  };
  function buildFreeQuestion(lv,format,pattern,random){
    if(PATTERNS[pattern].domain==="scene")return buildSceneSolo(lv,pattern,format,random,null);
    if(pattern==="div_select"){
      var n=drawDivisorN(random);
      return buildDivSelect(lv,n,divisorCandidates(n,random),random);
    }
    if(pattern==="mul_select"){
      var m=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random);
      return buildMulSelect(lv,m,multipleCandidates(m,random),random);
    }
    if(pattern==="common_div_select"||pattern==="common_mul_select"){
      var sel=commonSelectPair(lv,random);
      return pattern==="common_div_select"
        ?buildCommonDivSelect(lv,sel.a,sel.b,sel.candidates,random)
        :buildCommonMulSelect(lv,sel.a,sel.b,sel.candidates,random);
    }
    if(pattern==="common_div3_select"||pattern==="common_mul3_select"){
      var triple=drawTriple(random);
      return buildTripleSelect(lv,pattern,triple,tripleCandidates(triple,random),random);
    }
    if(pattern==="rem_divisor")return buildRemDivisor(lv,random);
    if(pattern==="rem_same_select"||pattern==="rem_zero_select")return buildRemSelect(lv,pattern,random);
    if(pattern==="mul_count"||pattern==="mul_capped"){
      var n2=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random),cap=drawMulCap(random,n2);
      return pattern==="mul_count"
        ?baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"mul_count",ask:"count",
          params:{n:n2,cap:cap},numbers:[n2,cap],text:cap+" までに "+n2+" の倍数は何個ありますか。",ans:Math.floor(cap/n2)})
        :baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"mul_capped",ask:"max",
          params:{n:n2,cap:cap},numbers:[n2,cap],
          text:n2+" の倍数のうち、"+cap+" をこえないいちばん大きい数はいくつですか。",ans:Math.floor(cap/n2)*n2});
    }
    if(pattern==="mul_nth"){
      var n3=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random),k=drawMulK(random,n3);
      return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"mul_nth",ask:"nth",
        params:{n:n3,k:k},numbers:[n3,k],
        text:n3+" の倍数を小さい順にならべたとき、"+k+" 番目の数はいくつですか。",ans:n3*k});
    }
    if(pattern==="gcd_num"||pattern==="lcm_num"||pattern==="common_div_count"){
      var ab=drawCommonPairWith(random,function(a,b){return gcd(a,b)>=2&&lcm(a,b)!==gcd(a,b);});
      if(pattern==="common_div_count")
        return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"common_div_count",ask:"count",
          params:{a:ab[0],b:ab[1]},numbers:[ab[0],ab[1]],
          text:ab[0]+" と "+ab[1]+" の公約数は何個ありますか。",ans:commonDivisors(ab[0],ab[1]).length});
      return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:pattern,
        params:{a:ab[0],b:ab[1]},numbers:[ab[0],ab[1]],
        text:ab[0]+" と "+ab[1]+" の"+(pattern==="gcd_num"?"最大公約数":"最小公倍数")+"はいくつですか。",
        ans:pattern==="gcd_num"?gcd(ab[0],ab[1]):lcm(ab[0],ab[1])});
    }
    if(pattern==="gcd3_num"||pattern==="lcm3_num")return buildTripleNum(lv,pattern,random);
    if(pattern==="factor_count"||pattern==="factor_count_cond"){
      var data=factorPairData(random);
      return pattern==="factor_count"?buildFactorCount(lv,data):buildFactorCountCond(lv,data);
    }
    if(pattern==="prime_check")return buildPrimeCheck(lv,primeCheckData(random));
    if(pattern==="rem_same")return buildRemSame(lv,format,random);
    if(pattern==="rem_zero"||pattern==="rem_count"){
      var rd=remZeroParams(random);
      return pattern==="rem_zero"?buildRemZero(lv,rd):buildRemCount(lv,rd);
    }
    if(pattern==="cycle_weekday"||pattern==="cycle_weekday_back"){
      var cd=cycleParams(random);
      return format==="formulation"
        ?buildCycleFormulation(lv,"cycle_weekday",cd,random)
        :buildCycleWeekdayNormal(lv,pattern,cd,random);
    }
    if(pattern==="cycle_count"){
      var cc=cycleParams(random);
      if(format==="formulation")return buildCycleFormulation(lv,"cycle_count",cc,random);
      return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"cycle_count",ask:"count",
        params:{n:cc.n,start:cc.start},numbers:[cc.n],
        text:"今日は"+WEEKDAYS[cc.start]+"です。今日から "+cc.n+" 日の間に、"+WEEKDAYS[cc.start]
          +"は何回ありますか。今日も数えます。",ans:cc.quotient+1});
    }
    if(pattern==="cycle_align_count"){
      var ac=alignParams(random);
      return baseQuestion({lv:lv,format:"normal",kind:"num",pattern:"cycle_align_count",ask:"count",
        params:{a:ac.a,b:ac.b,total:ac.total},numbers:[ac.a,ac.b,ac.total],
        text:"A のライトは "+ac.a+" 秒ごと、B のライトは "+ac.b+" 秒ごとに光ります。いま同時に光りました。このあと "
          +ac.total+" 秒までのあいだに、2 つが同時に光るのは何回ありますか。",ans:ac.times});
    }
    throw new Error("自由枠の問題型を作れません: "+pattern);
  }
  function buildLv10FreePair(format,random){
    if(format==="find_all"){
      var recipe=pick(["P1","P8","P12"],random);
      if(recipe==="P12")return buildTriplePair(10,random);
      if(recipe==="P1"){
        for(var attempt=0;attempt<200;attempt++){
          var n=pick(range(BANDS.multipleN.min,BANDS.multipleN.max),random);
          var candidates=multipleCandidates(n,random);
          var hitM=candidates.filter(function(v){return v%n===0;}).length;
          var hitD=candidates.filter(function(v){return n%v===0;}).length;
          if(candidates.length<5||candidates.length>9)continue;
          if(hitM<2||hitM>=candidates.length||hitD<2||hitD>=candidates.length)continue;
          var first=buildMulSelect(10,n,candidates,random),second=buildDivSelect(10,n,candidates,random);
          markPair(first,second,"P1");
          return [first,second];
        }
        throw new Error("P1 のペアを作れません");
      }
      var sel=commonSelectPair(10,random);
      var divSel=buildCommonDivSelect(10,sel.a,sel.b,sel.candidates,random);
      var mulSel=buildCommonMulSelect(10,sel.a,sel.b,sel.candidates,random);
      markPair(divSel,mulSel,"P8");
      return [divSel,mulSel];
    }
    /* formulation の非場面ペアは P5 (位置と回数)。 */
    var data=cycleParams(random);
    var a=buildCycleFormulation(10,"cycle_weekday",data,random);
    var b=buildCycleFormulation(10,"cycle_count",data,random);
    markPair(a,b,"P5",random);
    return [a,b];
  }
  function buildSceneDiagnosisPair(lv,quadrant,random){
    for(var attempt=0;attempt<120;attempt++){
      try{
        var pair=buildScenePair(lv,quadrant,"normal",random);
        /* 2 問の errorType は互いに異なる。ラベルはそれぞれの support から独立に引き、
           衝突したら組ごと引き直す (片側を固定すると Lv のプール全体の分布がずれる)。
           4 肢は 4.3 章のとおり 2 問で完全に一致させるので、3 誤答肢は両方のラベルを含む。 */
        var headSupport=sceneSupport(lv,pair.gcd),head=pickLabel(headSupport,random,null);
        var mateSupport=sceneSupport(lv,pair.lcm).filter(function(id){return id!==head;});
        if(!mateSupport.length)continue;
        var mate=pickLabel(mateSupport,random,null);
        var named=[head,mate].filter(function(id){return id!=="correct";});
        var pool=AVAILABLE_ERRORS[lv].filter(function(id){return named.indexOf(id)<0;});
        var trio=named.concat(sample(pool,3-named.length,random));
        if(trio.length!==3)continue;
        var first=sceneDiagnosisFrom(lv,pair.gcd,head,random,trio);
        var second=sceneDiagnosisFrom(lv,pair.lcm,mate,random,trio);
        if(!first||!second)continue;
        /* 相方は「頭のラベルを除いた集合」から引いた。期待値の母数もそこに合わせる。 */
        first.errorSupport=headSupport.slice();second.errorSupport=mateSupport.slice();
        markPair(first,second,"P3",random);
        return {gcd:first,lcm:second};
      }catch(error){continue;}
    }
    throw new Error("場面の診断ペアを作れません");
  }
  /* Lv10 の自由枠。形式ごとに入りうる pattern を 2 種以上持つ (検証 20)。
     セット内で patternId と言い回しが重ならないよう、使用済みを除いて抽選する。 */
  function buildFreeSlot(lv,format,random,options){
    var opts=options||{},used=opts.usedPatterns||[],phrases=opts.usedPhrases||[];
    if(format==="diagnosis"){
      for(var attempt=0;attempt<60;attempt++){
        try{
          var kind=pick(["num","cycle","factor","scene"],random);
          var built=kind==="num"?numDiagnosis(lv,random,null,null)
            :kind==="cycle"?cycleDiagnosis(lv,random,null,null)
            :kind==="factor"?factorDiagnosis(lv,random,null,null)
            :sceneDiagnosis(lv,pick(noWordScenePatterns(lv),random),random,null,null);
          if(used.indexOf(built.patternId)>=0)continue;
          if(built.phrase&&phrases.indexOf(built.phrase)>=0)continue;
          if(opts.excludeErrors&&opts.excludeErrors.indexOf(built.errorType)>=0)continue;
          return built;
        }catch(error){continue;}
      }
      throw new Error("自由枠の診断を作れません");
    }
    var pool=FREE_BY_FORMAT[format].filter(function(id){return used.indexOf(id)<0;});
    for(var i=0;i<80;i++){
      try{
        var pattern=pick(pool,random);
        var question=buildFreeQuestion(lv,format,pattern,random);
        if(question.phrase&&phrases.indexOf(question.phrase)>=0)continue;
        return question;
      }catch(error){continue;}
    }
    throw new Error("自由枠の問題を作れません: "+format);
  }
  function buildLv10(random){
    var pairFormat=pick(["normal","find_all","formulation","diagnosis"],random);
    var ordering=buildOrdering(10,pick(["D1","D2","D3","D4","D5","D6","D7"],random),random);
    var list;
    if(pairFormat==="find_all"||(pairFormat==="formulation"&&randomValue(random)<0.4)){
      /* MF: 非場面の対比ペア + 場面 2 問 (一致 gcd と反転 B の gcd) + 整列。
         連鎖は認識形式の scene_gcd_count の直後に normal の一致問題を置く。 */
      var freePair=buildLv10FreePair(pairFormat,random);
      var others=["normal","formulation","diagnosis"].filter(function(id){return id!==pairFormat;});
      var recognitionFormat=pick(others.filter(function(id){return id!=="normal";}),random);
      var matchPattern=pick(["scene_gcd_size","scene_gcd_capped"],random);
      var matchQ=buildSceneSolo(10,matchPattern,"normal",random,null);
      var reverseQ=recognitionFormat==="diagnosis"
        ?sceneDiagnosis(10,"scene_gcd_count",random,null,null)
        :buildSceneSolo(10,"scene_gcd_count","formulation",random,[matchQ.phrase]);
      if(reverseQ.phrase===matchQ.phrase)throw new Error("言い回しが重なります");
      markChain(reverseQ,matchQ);
      list=[freePair[0],freePair[1],matchQ,reverseQ,ordering];
    }else{
      var quadrant=randomValue(random)<0.7?"B":"A";
      var pair=pairFormat==="diagnosis"?buildSceneDiagnosisPair(10,quadrant,random)
        :buildScenePair(10,quadrant,pairFormat,random);
      var rest=["normal","find_all","formulation","diagnosis"].filter(function(id){return id!==pairFormat;});
      var usedPhrases=[pair.gcd.phrase,pair.lcm.phrase].filter(Boolean);
      var usedPatterns=[pair.gcd.patternId,pair.lcm.patternId,ordering.patternId];
      if(quadrant==="A"){
        /* 反転 B は scene_gcd_count だけなので、認識形式に 1 問置く。 */
        var qFormat=pick(rest.filter(function(id){return id==="formulation"||id==="diagnosis";}),random);
        var reverse=qFormat==="diagnosis"
          ?sceneDiagnosis(10,"scene_gcd_count",random,null,null)
          :buildSceneSolo(10,"scene_gcd_count","formulation",random,usedPhrases);
        if(reverse.phrase)usedPhrases.push(reverse.phrase);
        usedPatterns.push(reverse.patternId);
        var remainingA=rest.filter(function(id){return id!==qFormat;});
        if(pairFormat==="normal"){
          markChain(reverse,pair.gcd);
          list=[pair.gcd,pair.lcm,reverse,buildFreeSlot(10,pick(remainingA,random),random,
            {excludeErrors:[reverse.errorType],usedPatterns:usedPatterns,usedPhrases:usedPhrases}),ordering];
        }else{
          var productionFormat=pick(["normal","find_all"],random);
          var production=buildSceneSolo(10,pick(noWordScenePatterns(10,"gcd"),random),productionFormat,random,usedPhrases);
          markChain(reverse,production);
          list=[pair.gcd,pair.lcm,reverse,production,ordering];
        }
      }else if(pairFormat==="normal"){
        /* 認識形式の場面 (公倍数側) を置き、ペアの normal へ連鎖させる。 */
        var recognition=buildSceneSolo(10,pick(["scene_lcm_ways","scene_lcm_nth"],random),"formulation",random,usedPhrases);
        markChain(recognition,pair.lcm);
        if(recognition.phrase)usedPhrases.push(recognition.phrase);
        usedPatterns.push(recognition.patternId);
        var other=pick(rest.filter(function(id){return id!=="formulation";}),random);
        list=[pair.gcd,pair.lcm,recognition,buildFreeSlot(10,other,random,
          {usedPatterns:usedPatterns,usedPhrases:usedPhrases}),ordering];
      }else{
        var madeFormat=randomValue(random)<0.85?"find_all":"normal";
        var made=buildSceneSolo(10,pick(noWordScenePatterns(10,"gcd"),random),madeFormat,random,usedPhrases);
        markChain(pair.gcd,made);
        if(made.phrase)usedPhrases.push(made.phrase);
        usedPatterns.push(made.patternId);
        var lastPool=rest.filter(function(id){return id!==madeFormat;});
        var last=(lastPool.indexOf("normal")>=0&&randomValue(random)<0.9)?"normal":pick(lastPool,random);
        var exclude=pairFormat==="diagnosis"?[pair.gcd.errorType,pair.lcm.errorType]:null;
        list=[pair.gcd,pair.lcm,made,buildFreeSlot(10,last,random,
          {excludeErrors:exclude,usedPatterns:usedPatterns,usedPhrases:usedPhrases}),ordering];
      }
    }
    return finalize(10,list,random);
  }

  /* ==========================================================================
     付録 A のセット実在証明を golden case として再現する (共通要件 12、検証 40)。
     doc に書かれた 10 セットを、生成器の部品でそのまま組み直す。
     ========================================================================== */
  function goldenScene(lv,pattern,format,a,b,bound,template,phrase,random){
    return buildSceneQuestion(lv,pattern,format,
      {a:a,b:b,bound:bound,template:template,unit:SCENE_TEMPLATES[template].units[0],phrase:phrase},random);
  }
  function goldenFactorCountDiagnosis(lv,n,random,errors){
    var exps=factorExponents(n),product=exps.reduce(function(acc,item){return acc*item.exp;},1);
    return makeDiagnosis(lv,{pattern:"factor_count",person:"かいと",ask:"count",askVariant:"count",
      text:n+" を素因数分解すると "+n+" = "+factorProduct(n)+" です。"+n+" の約数は全部で何個ありますか。",
      reason:exps.map(function(item){return item.prime+" が "+item.exp+" 個";}).join("、")+"ならんでいるから、その数をかける",
      expression:exps.map(function(item){return item.exp;}).join("×")+"="+product,shown:product+" 個",
      errorType:"count_off",params:{n:n},numbers:[n],errors:errors,
      support:labelsFor(lv,["correct","count_off"]),
      correctAnswer:divisorCount(n),shownAnswer:product},random);
  }
  var GOLDEN={
    1:function(random){
      var candidates=[3,5,6,8,9,12,48],list=[1,2,3,4,8,9,12,18,36];
      var data={n:36,list:list,removed:6,inserted:8};
      var missing=buildDivMissing(1,data),extra=buildDivExtra(1,data);
      markPair(missing,extra,"P9");
      return [buildDivCount(1,random,18),buildDivSelect(1,24,candidates,random),
        missing,extra,buildNonDivSelect(1,24,candidates,random)];
    },
    2:function(random){
      var candidates=[2,3,4,6,8,12,24,36,48];
      var mulSelect=buildMulSelect(2,12,candidates,random),divSelect=buildDivSelect(2,12,candidates,random);
      markPair(mulSelect,divSelect,"P1");
      var count=baseQuestion({lv:2,format:"normal",kind:"num",pattern:"mul_count",ask:"count",
        params:{n:8,cap:60},numbers:[8,60],text:"60 までに 8 の倍数は何個ありますか。",ans:7});
      var capped=baseQuestion({lv:2,format:"normal",kind:"num",pattern:"mul_capped",ask:"max",
        params:{n:8,cap:60},numbers:[8,60],
        text:"8 の倍数のうち、60 をこえないいちばん大きい数はいくつですか。",ans:56});
      markPair(count,capped,"P7");
      var nth=baseQuestion({lv:2,format:"normal",kind:"num",pattern:"mul_nth",ask:"nth",
        params:{n:6,k:45},numbers:[6,45],
        text:"6 の倍数を小さい順にならべたとき、45 番目の数はいくつですか。",ans:270});
      return [mulSelect,divSelect,nth,count,capped];
    },
    3:function(random){
      var candidates=[1,2,3,4,6,8,24,48];
      var gcdQ=baseQuestion({lv:3,format:"normal",kind:"num",pattern:"gcd_num",params:{a:24,b:36},
        numbers:[24,36],text:"24 と 36 の最大公約数はいくつですか。",ans:12});
      var lcmQ=baseQuestion({lv:3,format:"normal",kind:"num",pattern:"lcm_num",params:{a:24,b:36},
        numbers:[24,36],text:"24 と 36 の最小公倍数はいくつですか。",ans:72});
      markPair(gcdQ,lcmQ,"P2");
      var countQ=baseQuestion({lv:3,format:"normal",kind:"num",pattern:"common_div_count",ask:"count",
        params:{a:18,b:30},numbers:[18,30],text:"18 と 30 の公約数は何個ありますか。",ans:4});
      var divSel=buildCommonDivSelect(3,6,8,candidates,random);
      var mulSel=buildCommonMulSelect(3,6,8,candidates,random);
      markPair(divSel,mulSel,"P8");
      return [gcdQ,lcmQ,countQ,divSel,mulSel];
    },
    4:function(random){
      var lcmSize=goldenScene(4,"scene_lcm_size","formulation",10,15,3,"T1","いちばん小さい",random);
      var lcmCapped=goldenScene(4,"scene_lcm_capped","normal",12,18,200,"T1","いちばん長い",random);
      var gcdSize=goldenScene(4,"scene_gcd_size","normal",12,18,200,"T1","いちばん大きい",random);
      markPair(gcdSize,lcmCapped,"P3");
      markChain(lcmSize,lcmCapped);
      var gcdCount=goldenScene(4,"scene_gcd_count","formulation",30,45,2,"T2","いちばん少ない",random);
      var gcdNth=goldenScene(4,"scene_gcd_nth","formulation",36,48,2,"T1","大きいほうから",random);
      return [lcmSize,lcmCapped,gcdSize,gcdCount,gcdNth];
    },
    5:function(random){
      var orderingA=buildOrdering(5,"D2",random,60),orderingB=buildOrdering(5,"D6",random);
      var diagnosis=goldenFactorCountDiagnosis(5,120,random,["count_off","factor_incomplete","calc_only"]);
      var data={n:72,exps:factorExponents(72),expr:"72 = "+factorProduct(72),
        count:divisorCount(72),condCount:divisorCount(72)/(factorExponents(72)[0].exp+1)*factorExponents(72)[0].exp};
      var normalA=buildFactorCount(5,data),normalB=buildFactorCountCond(5,data);
      markPair(normalA,normalB,"P10");
      markChain(diagnosis,normalA);
      return [orderingA,orderingB,diagnosis,normalA,normalB];
    },
    6:function(random){
      var lcmSize=goldenScene(6,"scene_lcm_size","formulation",9,12,2,"T1","いちばん小さい",random);
      var nthBase=goldenScene(6,"scene_gcd_nth","normal",36,48,2,"T1","大きいほうから",random);
      var nthDiag=sceneDiagnosisFrom(6,nthBase,"count_off",random,["count_off","swap_gcd_lcm","calc_only"]);
      var countBase=goldenScene(6,"scene_gcd_count","normal",30,45,2,"T2","いちばん少ない",random);
      var countDiag=sceneDiagnosisFrom(6,countBase,"word_cue",random,["word_cue","not_maximal","not_minimal"]);
      var gcdSize=goldenScene(6,"scene_gcd_size","normal",6,8,100,"T1","いちばん大きい",random);
      var lcmCapped=goldenScene(6,"scene_lcm_capped","normal",6,8,100,"T1","いちばん長い",random);
      markPair(gcdSize,lcmCapped,"P3");
      markChain(countDiag,gcdSize);
      return [lcmSize,nthDiag,countDiag,gcdSize,lcmCapped];
    },
    7:function(random){
      var formulation=baseQuestion({lv:7,format:"formulation",kind:"choice",pattern:"rem_same",ask:"min",
        params:{p:5,q:7,r:3},numbers:[5,7,3],
        text:"5 でわっても 7 でわっても 3 あまる整数のうち、2 けたでいちばん小さい数を求めます。はじめに何を求めればよいですか。"});
      formulation.answerValue=38;
      placeChoices(formulation,[{text:"5 と 7 の最小公倍数",value:35,correct:true},
        {text:"5 と 7 の最大公約数",value:1,error:"W1"},
        {text:"5 と 7 の公約数をすべて",value:null,error:"W7"},
        {text:"5+7+3",value:15,error:"W8"}],random);
      var normalSame=baseQuestion({lv:7,format:"normal",kind:"num",pattern:"rem_same",ask:"min",
        params:{p:3,q:4,r:2},numbers:[3,4,2],
        text:"3 でわっても 4 でわっても 2 あまる整数のうち、2 けたでいちばん小さい数はいくつですか。",ans:14});
      markChain(formulation,normalSame);
      var data={p:4,q:6,m:100,l:12,count:8};
      var zero=buildRemZero(7,data),count=buildRemCount(7,data);
      markPair(zero,count,"P11");
      var findAll=baseQuestion({lv:7,format:"find_all",kind:"find_all",pattern:"rem_divisor",ask:"count",
        params:{n:35,r:3},numbers:[35,3],
        text:"あめ 35 こを、同じ数ずつ何人かに配ったら 3 こあまりました。考えられる人数を、次からすべてえらびましょう。"});
      placeCandidates(findAll,[2,4,6,8,16,32],[4,8,16,32],random);
      return [formulation,normalSame,zero,count,findAll];
    },
    8:function(random){
      var pairData={n:100,quotient:14,remainder:2,start:4};
      var formWeekday=buildCycleFormulation(8,"cycle_weekday",pairData,random);
      var formCount=buildCycleFormulation(8,"cycle_count",pairData,random);
      markPair(formWeekday,formCount,"P5",random);
      var normalWeekday=buildCycleWeekdayNormal(8,"cycle_weekday",{n:60,quotient:8,remainder:4,start:2},random);
      var normalBack=buildCycleWeekdayNormal(8,"cycle_weekday_back",{n:45,quotient:6,remainder:3,start:0},random);
      markChain(formWeekday,normalWeekday);
      var diagnosis=makeDiagnosis(8,{pattern:"cycle_align_count",person:"そうた",ask:"count",askVariant:"inclusive",
        text:"A のライトは 6 秒ごと、B のライトは 8 秒ごとに光ります。いま同時に光りました。このあと 120 秒までのあいだに、2 つが同時に光るのは何回ありますか。",
        reason:"6 と 8 の最小公倍数は 24 だから、24 秒ごとに同時に光る",
        expression:"120÷24=5",shown:"5 回",errorType:"correct",
        params:{a:6,b:8,total:120},numbers:[6,8,120],
        errors:["count_off","quotient_remainder","swap_gcd_lcm"],
        support:labelsFor(8,["correct","count_off"]),correctAnswer:5,shownAnswer:5},random);
      return [formWeekday,formCount,normalWeekday,normalBack,diagnosis];
    },
    9:function(random){
      var alt=makeDiagnosis(9,{pattern:"lcm_num",person:"ゆうま",
        text:"20 と 30 の最小公倍数はいくつですか。",
        reason:"2 数の積を最大公約数でわると最小公倍数になる",
        expression:"20×30=600  600÷10=60",shown:60,errorType:"correct",alternative:true,
        params:{a:20,b:30},numbers:[20,30],errors:["not_minimal","swap_gcd_lcm","calc_only"],
        support:labelsFor(9,["correct","swap_gcd_lcm"]),correctAnswer:60,shownAnswer:60},random);
      var lcmQ=baseQuestion({lv:9,format:"normal",kind:"num",pattern:"lcm_num",params:{a:12,b:18},
        numbers:[12,18],text:"12 と 18 の最小公倍数はいくつですか。",ans:36});
      var gcdQ=baseQuestion({lv:9,format:"normal",kind:"num",pattern:"gcd_num",params:{a:12,b:18},
        numbers:[12,18],text:"12 と 18 の最大公約数はいくつですか。",ans:6});
      markPair(lcmQ,gcdQ,"P2");
      markChain(alt,lcmQ);
      var sceneBase=goldenScene(9,"scene_gcd_size","normal",15,20,200,"T1","いちばん大きい",random);
      var sceneQ=sceneDiagnosisFrom(9,sceneBase,"swap_gcd_lcm",random,["swap_gcd_lcm","word_cue","not_maximal"]);
      var findAll=buildCommonMulSelect(9,15,20,[1,5,10,15,30,60,120],random);
      return [alt,lcmQ,gcdQ,sceneQ,findAll];
    },
    10:function(random){
      var countBase=goldenScene(10,"scene_gcd_count","normal",36,48,2,"T2","いちばん少ない",random);
      var countDiag=sceneDiagnosisFrom(10,countBase,"word_cue",random,["word_cue","not_maximal","quotient_remainder"]);
      var gcdSize=goldenScene(10,"scene_gcd_size","normal",12,18,200,"T1","いちばん大きい",random);
      markChain(countDiag,gcdSize);
      var triple={a:12,b:18,c:24,g:6,l:72},candidates=[1,2,3,6,9,72,144];
      var divSel=buildTripleSelect(10,"common_div3_select",triple,candidates,random);
      var mulSel=buildTripleSelect(10,"common_mul3_select",triple,candidates,random);
      markPair(divSel,mulSel,"P12");
      var ordering=buildOrdering(10,"D7",random);
      return [countDiag,gcdSize,divSel,mulSel,ordering];
    }
  };
  function buildGoldenSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    return finalize(lv,GOLDEN[lv](random),random);
  }

  /* ==========================================================================
     入口
     ========================================================================== */
  function validateLv(lv){
    if(!Number.isInteger(lv)||lv<1||lv>10)throw new Error("Lv の指定が正しくありません");
  }
  var BUILDERS={1:buildLv1,2:buildLv2,3:buildLv3,4:buildLv4,5:buildLv5,
    6:buildLv6,7:buildLv7,8:buildLv8,9:buildLv9,10:buildLv10};
  function buildSet(lv,random){
    validateLv(lv);
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var lastError=null;
    for(var attempt=0;attempt<40;attempt++){
      try{return BUILDERS[lv](random);}catch(error){lastError=error;}
    }
    throw lastError||new Error("セットを作れません");
  }

  function judge(question,answer){
    if(!question||typeof question.kind!=="string")throw new Error("問題の指定が正しくありません");
    if(question.kind==="choice"){
      if(!Array.isArray(question.choices)||!Number.isInteger(question.ans))throw new Error("選択問題の指定が正しくありません");
      return Number.isInteger(answer)&&answer===question.ans;
    }
    if(question.kind==="find_all"){
      if(!Array.isArray(question.choices)||!Array.isArray(question.ansSet))throw new Error("複数選択問題の指定が正しくありません");
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
    if(question.kind==="order"){
      if(!Array.isArray(question.parts)||!Array.isArray(question.ans))throw new Error("整列問題の指定が正しくありません");
      return Array.isArray(answer)&&answer.length===question.ans.length
        &&question.ans.every(function(value,index){return answer[index]===value;});
    }
    var numeric=typeof answer==="number"?answer:Number(String(answer).replace(/^\s+|\s+$/g,""));
    return isFinite(numeric)&&numeric===question.ans;
  }

  global.Q4B_KOMOREBI_SEISU={
    patterns:PATTERNS,unknownValues:UNKNOWN_VALUES,pairTypes:PAIR_TYPES,
    lvPatterns:LV_PATTERNS,patternSpace:PATTERN_SPACE,formatMix:FORMAT_MIX,
    diagnosisLabels:DIAGNOSIS_LABELS,availableErrors:AVAILABLE_ERRORS,wazaRows:WAZA_ROWS,
    sceneTemplates:SCENE_TEMPLATES,sceneRole:SCENE_ROLE,orderDesigns:ORDER_DESIGNS,
    weekdays:WEEKDAYS,bands:BANDS,setSize:SET_SIZE,
    gcd:gcd,lcm:lcm,divisors:divisors,commonDivisors:commonDivisors,
    primeFactors:primeFactors,divisorCount:divisorCount,isPrime:isPrime,
    sceneAnswer:sceneAnswer,collisionCase:collisionCase,
    buildSet:buildSet,buildGoldenSet:buildGoldenSet,judge:judge
  };
})(typeof window!=="undefined"?window:globalThis);
