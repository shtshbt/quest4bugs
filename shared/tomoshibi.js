(function(global){
  "use strict";

  /* れんぞく ともしび の段と報酬の計算 (docs/tomoshibi_streak_design.md 3-4 章)。

     保存と端末間の統合は shared/storage.js (tomoshibi namespace) が持つ。ここは保存
     された日ごとの正解数から状態を導く計算と、その日のボーナスの精算だけを持つ。
     連続日数や段は保存せず毎回 days から導くので、端末ごとに食い違わない。

     段の表がすべての規則の正本で、表示 (段 2 で作る) と報酬の両方がここを読む。 */

  var DAY_MIN=3;    /* この数以上の正解がある日を「続いた日」とする */
  var TOP_MIN=10;   /* にじ の段で topBonus を払う正解数 */
  var DROP_STEPS=2; /* 途切れたら下げる段の数 */

  var TIERS=[
    {id:"aka",  name:"あかの ともしび", from:1,  to:5,    bonus:5},
    {id:"ao",   name:"あおの ともしび", from:6,  to:10,   bonus:10},
    {id:"gin",  name:"ぎんの ともしび", from:11, to:20,   bonus:20},
    {id:"kin",  name:"きんの ともしび", from:21, to:30,   bonus:40},
    {id:"niji", name:"にじの ともしび", from:31, to:null, bonus:40, topBonus:80}
  ];

  var DATE_RE=/^(\d{4})-(\d{2})-(\d{2})$/;
  /* 状態を導くときに遡る日数の上限。これより長い連続でも段は にじ で頭打ちなので、
     変わるのは表示の日数だけ。壊れた古い日付や時計のずれた端末で、正解のたびに
     何万日も回すのを防ぐ。 */
  var LOOKBACK_DAYS=400;

  function pad2(n){return (n<10?"0":"")+n;}

  /* storage.js の todayKey と同じ、端末のローカル日付。 */
  function localToday(){
    var d=new Date();
    return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  }

  /* 日付キーの加算は UTC で行う。ローカル時刻で足すと夏時間の切替日に 1 日が
     23 時間や 25 時間になり、同じ日を 2 回数えたり飛ばしたりする。 */
  function addDays(key,n){
    var m=DATE_RE.exec(key);
    if(!m)throw new Error("日付の形式が正しくありません: "+key);
    var t=Date.UTC(+m[1],+m[2]-1,+m[3])+n*86400000, d=new Date(t);
    return d.getUTCFullYear()+"-"+pad2(d.getUTCMonth()+1)+"-"+pad2(d.getUTCDate());
  }

  function tierIndexOf(day){
    for(var i=TIERS.length-1;i>=0;i--)if(day>=TIERS[i].from)return i;
    return 0;
  }

  function dayTotal(data,date){
    var day=data&&data.days&&data.days[date], total=0, dev;
    if(!day||!day.dev)return 0;
    for(dev in day.dev)total+=Math.max(0,Math.floor(day.dev[dev])||0);
    return total;
  }

  function bonusFor(tierIndex,count){
    var tier=TIERS[tierIndex];
    var base=tier.bonus;
    var top=(tier.topBonus&&count>=TOP_MIN)?tier.topBonus-tier.bonus:0;
    return {base:base,top:top};
  }

  /* days から today 時点の状態を導く。today はまだ終わっていないので、today に
     条件を満たしていなくても途切れとは数えない。

     途切れの規則 (設計 4 章): 条件を満たさなかった日ごとに段を 2 つ下げ、次に
     条件を満たした日を「下がった先の段の最初の日」として再開する。2 日続けて
     休めば 2 回下がる。 */
  function computeState(data,today){
    today=today||localToday();
    if(!DATE_RE.test(today))throw new Error("日付の形式が正しくありません: "+today);
    var floor=addDays(today,-LOOKBACK_DAYS);
    var keys=Object.keys((data&&data.days)||{}).filter(function(k){
      return DATE_RE.test(k)&&k>=floor&&k<=today&&addDays(k,0)===k;
    }).sort();
    var streak=0, pending=null, lastQualified=null, lastDrop=null;
    var restartedToday=false, tierUpToday=false;
    if(keys.length){
      for(var d=keys[0];d<=today;d=addDays(d,1)){
        if(dayTotal(data,d)>=DAY_MIN){
          var before=streak;
          if(pending!=null){
            streak=TIERS[pending].from;
            if(d===today)restartedToday=true;
            pending=null;
          }else{
            streak++;
            if(d===today&&streak>1&&tierIndexOf(streak)>tierIndexOf(before))tierUpToday=true;
          }
          lastQualified=d;
        }else if(d!==today){
          var from=pending!=null?pending:(streak>0?tierIndexOf(streak):null);
          if(from==null)continue;
          if(pending===0)continue;
          /* あか の段で途切れても下がる先が無いので、救済ではなくただのやり直し
             (0 日から)。知らせも出さない。 */
          if(pending==null&&from===0){ streak=0; continue; }
          var to=Math.max(0,from-DROP_STEPS);
          lastDrop={date:d,fromIndex:from,toIndex:to};
          pending=to;
        }
      }
    }
    var todayCount=dayTotal(data,today);
    var qualifiedToday=todayCount>=DAY_MIN;
    var tierIndex=pending!=null?pending:tierIndexOf(Math.max(streak,1));
    var state={
      today:today,
      todayCount:todayCount,
      qualifiedToday:qualifiedToday,
      streakDays:pending!=null?0:streak,
      tierIndex:tierIndex,
      tier:TIERS[tierIndex],
      restartDay:pending!=null?TIERS[pending].from:null,
      restartedToday:restartedToday,
      tierUpToday:tierUpToday,
      lastQualified:lastQualified,
      lastDrop:lastDrop,
      /* 途切れて段が下がり、まだ再開していない */
      dropPending:pending!=null,
      bonusToday:qualifiedToday?bonusFor(tierIndex,todayCount):{base:0,top:0},
      toTop:(qualifiedToday&&TIERS[tierIndex].topBonus&&todayCount<TOP_MIN)?TOP_MIN-todayCount:0,
      next:null
    };
    /* 次の段まで、あと何日条件を満たせばよいか (今日がまだなら今日も 1 日に数える)。
       再開待ちなら再開の日を 1 日目として数える。 */
    if(tierIndex+1<TIERS.length){
      var nextFrom=TIERS[tierIndex+1].from;
      state.next={tierIndex:tierIndex+1,
        daysLeft:pending!=null?nextFrom-TIERS[pending].from+1:nextFrom-streak};
    }
    return state;
  }

  /* 今日のボーナスを精算する。TOMOSHIBI_MODE が "on" のときだけ払う。
     払ったことの記録を先に書き、そのあとでこはくを足す (二重払いより払い損ねを
     選ぶ)。何か払ったら q4b-tomoshibi イベントを出す (演出は段 2 でこれを聞く)。 */
  function settle(pid,today){
    var save=global.QuestSave, eco=global.Q4B_ECONOMY;
    if(!pid||!save||typeof save.tomoshibiOf!=="function"||typeof save.amberAdd!=="function")return null;
    if(!eco||typeof eco.tomoshibiMode!=="function"||eco.tomoshibiMode()!=="on")return null;
    today=today||(typeof save.todayKey==="function"?save.todayKey():localToday());
    var data=save.tomoshibiOf(pid), state=computeState(data,today);
    var result={state:state,basePaid:0,topPaid:0};
    if(!state.qualifiedToday)return result;
    var awarded=(data.awarded&&data.awarded[today])||{base:0,top:0};
    if(!awarded.base&&state.bonusToday.base>0){
      if(save.tomoshibiMarkAwarded(pid,today,"base",state.bonusToday.base)){
        save.amberAdd(pid,state.bonusToday.base);
        result.basePaid=state.bonusToday.base;
      }
    }
    if(!awarded.top&&state.bonusToday.top>0){
      if(save.tomoshibiMarkAwarded(pid,today,"top",state.bonusToday.top)){
        save.amberAdd(pid,state.bonusToday.top);
        result.topPaid=state.bonusToday.top;
      }
    }
    if(result.basePaid||result.topPaid){
      try{ global.dispatchEvent(new global.CustomEvent("q4b-tomoshibi",{detail:result})); }catch(_){}
    }
    return result;
  }

  global.Q4BTomoshibi={
    DAY_MIN:DAY_MIN,
    TOP_MIN:TOP_MIN,
    tiers:function(){return TIERS.map(function(t){return Object.assign({},t);});},
    tierIndexOf:tierIndexOf,
    computeState:computeState,
    settle:settle,
    addDays:addDays
  };
})(typeof window!=="undefined"?window:globalThis);
