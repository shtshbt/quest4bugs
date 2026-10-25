(function(global){
  "use strict";

  var B="□",TWO=["T_AF","T_SB","T_SF"],BOTH=["T_AB","T_AF","T_SB","T_SF"];
  var CONTEXTS={candy:["あめ","こ","もらって","たべて","ありました"],stickers:["シール","まい","もらって","あげて","ありました"],flowers:["はな","本","さいて","かれて","ありました"],books:["ほん","さつ","かって","あげて","ありました"],cars:["くるま","台","きて","でていって","とまって いました"]};
  var SCAFFOLDS={SC_rei:"れい: 3+□=5 なら、ぜんぶは 5。□=5-3",SC_zenbu:"いちばん おおきい かず (ぜんぶ) は どれかな",SC_ryougawa:"= の むこうの しきは そのまま。うごかすのは □ の となりの かずだけ",SC_hitori:"□ が ひとりの しきは、= の むこうを けいさん すると □ が でる",SC_junban:"おはなしに でてくる じゅんに ならべよう"};
  var WAZA={WZ_zenbu:"いちばん おおきい かず (ぜんぶ) を さがそう。- の まえの かずは ぜんぶ。□ が ぜんぶ なら たす。□ が かたほう なら、ぜんぶから もう かたほうを ひく",WZ_hitotsu:"= の むこうの しきは そのまま うつそう。ひとつの かず だと おもって ぜんぶを さがす。うごかすのは □ の となりの かずだけ",WZ_tashikame:"つくった しきの こたえを □ に いれて、もとの しきが なりたつか たしかめよう",WZ_muki:"= は みぎから よんでも ひだりから よんでも おなじ。むきが ぎゃくでも ぜんぶは かわらない",WZ_hitori:"□ が ひとりの しきは、= の むこうを けいさん すれば □ が わかる",WZ_junban:"おはなしに でてくる じゅんに カードを ならべて、わからない ところに □ を おこう",WZ_ohanashi:"□ に こたえを いれて、おはなしと あうか たしかめよう"};
  function value(random){var n=random();if(typeof n!=="number"||!Number.isFinite(n)||n<0||n>=1)throw new Error("乱数の指定が正しくありません");return n;}
  function integer(random,lo,hi){return lo+Math.floor(value(random)*(hi-lo+1));}
  function pick(items,random){return items[integer(random,0,items.length-1)];}
  function weighted(items,weights,random){var n=value(random);for(var i=0;i<items.length;i++){n-=weights[i];if(n<0)return items[i];}return items[items.length-1];}
  function shuffle(items,random){var out=items.slice();for(var i=out.length-1;i>0;i--){var j=integer(random,0,i),t=out[i];out[i]=out[j];out[j]=t;}return out;}
  function terms(slots){var out=[];for(var i=0;i<slots.length;i+=2)out.push([Number(slots[i]),i===0||slots[i-1]==="+"?1:-1]);return out;}
  function key(items){return items.map(function(t){return (t[1]>0?"+":"-")+t[0];}).sort().join(",");}
  function firstNegative(slots){var n=Number(slots[0]);for(var i=2;i<slots.length;i+=2){var next=Number(slots[i]);if(slots[i-1]==="-"&&n-next<0)return [n,next];n+=slots[i-1]==="+"?next:-next;}return null;}
  function validateSlots(problem,slots){
    if(!problem||problem.cat!=="kom_shiki_henkei"||problem.kind!=="assemble"||!Array.isArray(problem.frame)||!Array.isArray(problem.numberCards))throw new Error("問題の指定が正しくありません");
    if(!Array.isArray(slots)||slots.length!==problem.frame.length)throw new Error("答えの指定が正しくありません");
    var cards=problem.numberCards.slice();
    problem.frame.forEach(function(kind,i){var s=slots[i];if(typeof s!=="string")throw new Error("答えの指定が正しくありません");if(kind==="num"){var at=cards.indexOf(s);if(at<0)throw new Error("答えのカードが正しくありません");cards.splice(at,1);}else if(kind==="eq"?s!=="=":s!=="+"&&s!=="-")throw new Error("答えの指定が正しくありません");});
  }
  function judge(problem,slots){
    if(problem&&problem.kind==="num")return (typeof slots==="string"||typeof slots==="number")&&String(slots).trim()!==""&&Number(slots)===problem.boxValue;
    validateSlots(problem,slots);
    return problem.lv===10?slots.join("")===problem.answerSlots.join(""):key(terms(slots))===key(problem.answerTerms)&&!firstNegative(slots);
  }
  function diagnose(problem,slots){
    if(judge(problem,slots))return [];
    if(problem.kind==="num"){
      if(!/^\d+$/.test(String(slots).trim()))return ["calc_other"];
      var a=problem.numbers.a,b=problem.numbers.b,n=Number(slots),add=problem.patternId.indexOf("solve_add")===0;
      if(n===a||n===b)return ["copy_visible"];
      if(n===(add?Math.abs(a-b):a+b))return ["ignore_op"];
      if(b>=2&&b<=9&&n===(add?a+b*10:a-b*10))return ["place_value"];
      if(n<=99&&((Math.floor(n/10)!==Math.floor(problem.boxValue/10))!==(n%10!==problem.boxValue%10)))return ["digit_slip"];
      return ["calc_other"];
    }
    if(problem.lv===10){
      var ans=problem.answerSlots,v=function(s){return s===B?problem.boxValue:Number(s);},holds=(slots[1]==="+"?v(slots[0])+v(slots[2]):v(slots[0])-v(slots[2]))===v(slots[4]);
      if(holds){if(ans[1]==="+"&&slots[1]==="+"&&slots[0]===ans[2]&&slots[2]===ans[0]&&slots[4]===ans[4])return ["true_commuted"];return [slots[4]===B&&ans[4]!==B?"true_solved":"true_reordered"];}
      var tags=[];
      if(slots[1]!==ans[1])tags.push("op_flip");
      if(slots.indexOf(B)!==ans.indexOf(B))tags.push("unknown_misplaced");
      if(slots.filter(function(s,i){return i%2===0&&s!==B;}).join()!==ans.filter(function(s,i){return i%2===0&&s!==B;}).join())tags.push("known_swap");
      return tags;
    }
    if(key(terms(slots))===key(problem.answerTerms))return ["negative_step"];
    if(problem.frame.length===3){
      if(slots[1]==="+")return [problem.type==="T_AF"?"keep_op":"invert_overapply"];
      if(problem.type!=="T_SF")return ["order_reversal"];
      return [Number(slots[0])===problem.numbers.a?"minuend_swap":"keep_op"];
    }
    var signs={};terms(slots).forEach(function(t){signs[t[0]]=t[1];});
    var aSign=signs[problem.numbers.a],bSign=signs[problem.numbers.b],cSign=signs[problem.numbers.c];
    if(bSign===1&&cSign===1)return [aSign===1?(problem.type==="T_SB"?"invert_overapply":"keep_op"):(problem.type==="T_SB"?"order_reversal":"keep_op")];
    if(bSign===-1&&cSign===-1)return ["minuend_swap"];
    var result=["flip_other_side"];
    if(aSign===-1&&problem.type==="T_SF"||aSign===1&&(problem.type==="T_AB"||problem.type==="T_AF"))result.push("keep_op");
    if(aSign===-1&&problem.type==="T_SB")result.push("order_reversal");
    return result;
  }
  function twoProblem(type,orientation,x,y,aBig){
    var a=type==="T_AF"?x:type==="T_SB"?y:aBig?y:x,d=a===x?y:x;
    var side=type==="T_AF"?B+"+"+a:type==="T_SB"?a+"-"+B:B+"-"+a;
    var answer=type==="T_SF"?[[a,1],[d,1]]:[[y,1],[x,-1]];
    return {type:type,orientation:orientation,numbers:{a:a,d:d,x:x,y:y},text:orientation==="normal"?side+"="+d:d+"="+side,answerTerms:answer,patternId:{T_AF:"add_front",T_SB:"sub_back",T_SF:"sub_front"}[type]+(orientation==="reversed"?"_rev":"")};
  }
  function drawTwo(type,orientation,lv,random){
    var max=lv===2?20:100;
    for(;;){var x=integer(random,2,max),y=integer(random,2,max);if(x<y&&y-x>=2&&y!==2*x&&x+y<=max)return twoProblem(type,orientation,x,y,value(random)<0.5);}
  }
  function bothValid(type,a,b,c,trap){return a>=20&&a<=45&&b>=2&&c>=2&&a>b&&a>c&&b!==c&&Math.abs(a-b-c)>=2&&Math.abs(a-b-c)<=10&&a+b+c>=42&&a+b+c<=88&&((type==="T_SB"||trap)?a>b+c:a<b+c);}
  function bothProblem(type,orientation,a,b,c){
    var side={T_AB:a+"+"+B,T_AF:B+"+"+a,T_SB:a+"-"+B,T_SF:B+"-"+a}[type],other=b+"+"+c;
    return {type:type,orientation:orientation,numbers:{a:a,b:b,c:c},text:orientation==="normal"?side+"="+other:other+"="+side,answerTerms:type==="T_SB"?[[a,1],[b,-1],[c,-1]]:type==="T_SF"?[[b,1],[c,1],[a,1]]:[[b,1],[c,1],[a,-1]],patternId:{T_AB:"both_add_back",T_AF:"both_add_front",T_SB:"both_sub_back",T_SF:"both_sub_front"}[type]+(orientation==="reversed"?"_rev":"")};
  }
  function drawBoth(spec,random,bc){
    if(bc){var candidates=[];for(var a=20;a<=45;a++)if(bothValid(spec.type,a,bc[0],bc[1],spec.trap))candidates.push(a);return candidates.length?bothProblem(spec.type,spec.orientation,pick(candidates,random),bc[0],bc[1]):null;}
    for(;;){var a=integer(random,20,45),d=integer(random,2,10),r=spec.type==="T_SB"||spec.trap?a-d:a+d,b=integer(random,2,r-2),c=r-b;if(bothValid(spec.type,a,b,c,spec.trap))return bothProblem(spec.type,spec.orientation,a,b,c);}
  }
  function storyProblem(role,dir,k1,k2,context){
    var op=dir==="inc"?"+":"-",t=role==="start"?[B,k1,k2]:role==="change"?[k1,B,k2]:[k1,k2,B];
    var box=role==="start"?(dir==="inc"?k2-k1:k2+k1):role==="change"?(dir==="inc"?k2-k1:k1-k2):dir==="inc"?k1+k2:k1-k2;
    if(box<2||box>30||k1<2||k2<2||k1>30||k2>30||Math.abs(k1-k2)<2||k1===2*k2||k2===2*k1)return null;
    var ctx=CONTEXTS[context];
    return {type:role,orientation:"normal",numbers:{K1:k1,K2:k2},context:context,direction:dir,text:ctx[0]+"が "+t[0]+" "+ctx[1]+" "+ctx[4]+"。"+t[1]+" "+ctx[1]+" "+ctx[dir==="inc"?2:3]+"、"+t[2]+" "+ctx[1]+"に なりました。",boxValue:box,answerSlots:[String(t[0]),op,String(t[1]),"=",String(t[2])],patternId:"story_"+dir+"_"+role};
  }
  function drawStory(spec,random){for(;;){var p=storyProblem(spec.type,spec.direction,integer(random,2,30),integer(random,2,30),spec.context);if(p)return p;}}
  function spec(lv,random){
    if(lv===1)return {add:value(random)<0.5,orientation:value(random)<0.5?"normal":"reversed"};
    if(lv===10)return {type:pick(["start","change","result"],random),direction:value(random)<0.5?"inc":"dec",context:pick(Object.keys(CONTEXTS),random)};
    var two=lv===2||lv<=4&&value(random)<0.6,type=weighted(two?TWO:BOTH,two?(lv===2?[1/3,1/3,1/3]:[0.26,0.42,0.32]):[0.03,0.26,0.43,0.28],random);
    return {two:two,type:type,trap:!two&&type==="T_SF"&&value(random)<0.5,orientation:value(random)<(lv===6?1:lv>=7||lv===4&&two?0.5:0)?"reversed":"normal"};
  }
  function drawIntro(s,random){
    for(;;){var a=integer(random,11,89),b=pick([2,3,4,5,6,7,8,9].concat(Array.from({length:79},function(_,i){return i+11;})),random),box=s.add?a+b:a-b;
      if(box<2||box>99||(s.add?a%10+b%10>9||Math.floor(a/10)+Math.floor(b/10)>9:a%10<b%10||Math.floor(a/10)<Math.floor(b/10)))continue;
      var e=a+(s.add?"+":"-")+b;return {type:null,orientation:s.orientation,numbers:{a:a,b:b},text:s.orientation==="normal"?B+"="+e:e+"="+B,boxValue:box,ans:box,patternId:"solve_"+(s.add?"add":"sub")+"_"+(s.orientation==="normal"?"r":"l")};}
  }
  function draw(s,lv,random){return lv===1?drawIntro(s,random):lv===10?drawStory(s,random):s.two?drawTwo(s.type,s.orientation,lv,random):drawBoth(s,random);}
  function finish(p,lv,index,random){
    p.cat="kom_shiki_henkei";p.lv=lv;p.format=lv===1?"normal":"assemble";p.kind=lv===1?"num":"assemble";
    p.pairId=p.pairId||null;p.pairType=p.pairType||null;
    var both=!!p.numbers.c,sc=index>=2||lv===9?null:lv===1?"SC_hitori":lv===2?(index===0?"SC_rei":"SC_zenbu"):lv===10?"SC_junban":both?"SC_ryougawa":"SC_zenbu";
    p.scaffold=sc?{id:sc,text:SCAFFOLDS[sc]}:null;
    p.waza={primary:lv===1?"WZ_hitori":lv===10?"WZ_junban":both?"WZ_hitotsu":"WZ_zenbu",alternate:lv===1?null:lv===10?"WZ_ohanashi":p.orientation==="reversed"?"WZ_muki":"WZ_tashikame"};
    p.prompt=lv===1?"□ に はいる かずを こたえましょう":pick(lv===10?["おはなしの じゅんに □ を つかって しきを つくろう","おはなしの とおりに □ の しきを ならべよう"]:["□ を もとめる しきを つくろう","□ を だす しきを ならべよう"],random);
    if(lv!==1){p.frame=lv===10?["num","op","num","eq","num"]:both?["num","op","num","op","num"]:["num","op","num"];p.numberCards=shuffle((lv===10?[p.numbers.K1,p.numbers.K2,B]:both?[p.numbers.a,p.numbers.b,p.numbers.c]:[p.numbers.a,p.numbers.d]).map(String),random);p.operatorCards=["+","-"];if(lv!==10)p.boxValue=p.answerTerms.reduce(function(n,t){return n+t[0]*t[1];},0);}
    return p;
  }
  function buildSet(lv,random){
    if(!Number.isInteger(lv)||lv<1||lv>10)throw new Error("レベルの指定が正しくありません");
    if(typeof random!=="function")throw new Error("乱数の指定が正しくありません");
    var specs=Array.from({length:5},function(){return spec(lv,random);}),pair=lv>=8?integer(random,0,3):-1;
    if(lv===10){var s=specs[pair],s2={type:s.type,direction:s.direction,context:s.context};if(value(random)<0.5)s2.direction=s.direction==="inc"?"dec":"inc";else s2.type=pick(["start","change","result"].filter(function(t){return t!==s.type;}),random);specs[pair+1]=s2;}
    var out=[];
    for(var i=0;i<5;i++){
      if(i===pair){
        for(;;){var p=draw(specs[i],lv,random),q;
          if(lv===10){var n=p.numbers,t=specs[i+1];q=storyProblem(t.type,t.direction,n.K1,n.K2,t.context)||storyProblem(t.type,t.direction,n.K2,n.K1,t.context);}
          else q=drawBoth(specs[i+1],random,[p.numbers.b,p.numbers.c]);
          if(q&&p.text!==q.text&&!clash(out,p)&&!clash(out.concat([p]),q,true))break;
        }
        p.pairId=q.pairId=1;p.pairType=q.pairType=lv===10?"P2":"P1";out.push(p,q);i++;
      }else{for(;;){var p=draw(specs[i],lv,random);if(!clash(out,p))break;}out.push(p);}
    }
    return out.map(function(p,i){return finish(p,lv,i,random);});
  }
  function clash(out,p,pair){return out.some(function(q){return p.text===q.text;})||!pair&&out.length&&p.numbers.c&&out[out.length-1].numbers.c&&[p.numbers.b,p.numbers.c].sort().join()===[out[out.length-1].numbers.b,out[out.length-1].numbers.c].sort().join();}
  global.Q4B_KOMOREBI_SHIKI_HENKEI={buildSet:buildSet,judge:judge,diagnose:diagnose,firstNegative:firstNegative,waza:WAZA};
})(window);
