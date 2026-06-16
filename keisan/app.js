/* keisan/app.js — けいさん昆虫ハンター 本体ロジック
   依存: shared/{storage,bugs,render,bespoke,reward,furigana,yomi}.js（先に読み込み）
   構成: 定数/プロフィール → マスター虫/報酬 → 問題生成器 → 出題ループ → 画面描画
   ※ classic script。onclick属性から参照されるためグローバル関数を維持（IIFEで囲まない）。 */

"use strict";
var DB={v:1, act:null, profiles:[]};

/* ---------- insect data is loaded from ../shared/bugs.js ---------- */
/* ---------- bug SVG archetypes ---------- */
function bugSVG(b){
  var c1=b.c1,c2=b.c2,K="#2A3D2C",inner="";
  var leg='stroke="'+K+'" stroke-width="3" stroke-linecap="round" fill="none"';
  if(b.t==="kabuto"){
    inner='<path d="M40 70 l-9 11 M50 74 l-2 12 M62 71 l9 10 M44 60 l-13 4" '+leg+'/>'
    +'<ellipse cx="56" cy="58" rx="25" ry="20" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M56 40 L58 76" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="37" cy="50" rx="12" ry="10" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M34 46 C26 36 22 26 20 14 L27 16 C29 26 33 35 40 43 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M20 14 l-5 -4 M20 14 l1 -7" '+leg+'/>'
    +'<circle cx="34" cy="51" r="2.4" fill="#fff"/>';
  }else if(b.t==="kuwagata"){
    inner='<path d="M44 72 l-8 11 M56 75 l0 12 M66 70 l9 9 M46 62 l-14 5" '+leg+'/>'
    +'<ellipse cx="58" cy="58" rx="23" ry="19" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M58 41 L59 75" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="38" cy="52" rx="13" ry="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M31 45 C21 38 15 29 15 18 C22 23 28 31 36 39" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
    +'<path d="M30 58 C20 62 13 60 9 50 C17 53 24 52 33 49" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
    +'<path d="M22 30 l6 1 M18 52 l5 -3" stroke="'+K+'" stroke-width="2.5" stroke-linecap="round"/>'
    +'<circle cx="36" cy="52" r="2.4" fill="#fff"/>';
  }else if(b.t==="chou"){
    inner='<path d="M47 50 C30 18 8 16 7 33 C6 47 28 56 46 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M53 50 C70 18 92 16 93 33 C94 47 72 56 54 55 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M47 58 C32 60 16 70 20 82 C24 92 41 84 49 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M53 58 C68 60 84 70 80 82 C76 92 59 84 51 64 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<circle cx="27" cy="36" r="5" fill="'+c2+'"/><circle cx="73" cy="36" r="5" fill="'+c2+'"/>'
    +'<ellipse cx="50" cy="56" rx="5.5" ry="17" fill="'+K+'"/>'
    +'<path d="M47 41 C43 33 39 29 34 26 M53 41 C57 33 61 29 66 26" '+leg+'/>';
  }else if(b.t==="tombo"){
    inner='<ellipse cx="29" cy="42" rx="21" ry="6.5" fill="'+c2+'" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(-13 29 42)"/>'
    +'<ellipse cx="71" cy="42" rx="21" ry="6.5" fill="'+c2+'" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(13 71 42)"/>'
    +'<ellipse cx="31" cy="53" rx="18" ry="5.5" fill="'+c2+'" opacity=".75" stroke="'+K+'" stroke-width="2.5" transform="rotate(-22 31 53)"/>'
    +'<ellipse cx="69" cy="53" rx="18" ry="5.5" fill="'+c2+'" opacity=".75" stroke="'+K+'" stroke-width="2.5" transform="rotate(22 69 53)"/>'
    +'<rect x="46.5" y="36" width="7" height="50" rx="3.5" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M47 50 h6 M47 58 h6 M47 66 h6 M47 74 h6" stroke="'+K+'" stroke-width="2"/>'
    +'<circle cx="50" cy="28" r="8" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="46" cy="26" r="3.4" fill="'+K+'"/><circle cx="54" cy="26" r="3.4" fill="'+K+'"/>';
  }else if(b.t==="semi"){
    inner='<ellipse cx="32" cy="62" rx="9" ry="24" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(18 32 62)"/>'
    +'<ellipse cx="68" cy="62" rx="9" ry="24" fill="#EAF2F8" opacity=".85" stroke="'+K+'" stroke-width="2.5" transform="rotate(-18 68 62)"/>'
    +'<path d="M50 24 C64 24 70 38 68 54 C66 70 58 80 50 82 C42 80 34 70 32 54 C30 38 36 24 50 24 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M38 58 h24 M39 66 h22 M41 73 h18" stroke="'+c2+'" stroke-width="3.5" stroke-linecap="round"/>'
    +'<circle cx="38" cy="30" r="5" fill="'+K+'"/><circle cx="62" cy="30" r="5" fill="'+K+'"/>';
  }else if(b.t==="hachi"){
    inner='<ellipse cx="33" cy="34" rx="16" ry="9" fill="#EAF2F8" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(-22 33 34)"/>'
    +'<ellipse cx="67" cy="34" rx="16" ry="9" fill="#EAF2F8" opacity=".9" stroke="'+K+'" stroke-width="2.5" transform="rotate(22 67 34)"/>'
    +'<ellipse cx="50" cy="60" rx="20" ry="24" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M32 52 h36 M31 62 h38 M34 72 h32" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
    +'<circle cx="50" cy="32" r="11" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="46" cy="30" r="2.6" fill="'+K+'"/><circle cx="54" cy="30" r="2.6" fill="'+K+'"/>'
    +'<path d="M50 84 l0 6" stroke="'+K+'" stroke-width="3" stroke-linecap="round"/>';
  }else if(b.t==="tentou"){
    inner='<circle cx="50" cy="56" r="27" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 30 A27 27 0 0 1 50 83" fill="none" stroke="'+K+'" stroke-width="2.5"/>'
    +'<path d="M28 36 A26 16 0 0 1 72 36 L50 44 Z" fill="'+K+'"/>'
    +'<circle cx="38" cy="50" r="4.5" fill="'+c2+'"/><circle cx="62" cy="50" r="4.5" fill="'+c2+'"/>'
    +'<circle cx="34" cy="66" r="4.5" fill="'+c2+'"/><circle cx="66" cy="66" r="4.5" fill="'+c2+'"/>'
    +'<circle cx="50" cy="74" r="4.5" fill="'+c2+'"/>'
    +'<circle cx="42" cy="32" r="2.2" fill="#fff"/><circle cx="58" cy="32" r="2.2" fill="#fff"/>'
    +'<path d="M40 26 l-4 -7 M60 26 l4 -7" '+leg+'/>';
  }else if(b.t==="ari"){
    inner='<path d="M44 60 l-8 14 M52 62 l0 16 M60 60 l9 13 M46 50 l-12 -10 M54 50 l12 -9" '+leg+'/>'
    +'<ellipse cx="70" cy="60" rx="16" ry="12" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="48" cy="52" r="9" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="29" cy="46" r="12" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M24 36 C20 30 18 26 19 20 M33 35 C33 28 34 24 38 19" '+leg+'/>'
    +'<circle cx="26" cy="45" r="2.4" fill="#fff"/>';
  }else if(b.t==="batta"){
    inner='<path d="M64 62 L84 44 L79 70" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<ellipse cx="50" cy="58" rx="27" ry="11" fill="'+c1+'" stroke="'+K+'" stroke-width="3" transform="rotate(-7 50 58)"/>'
    +'<path d="M30 56 h36" stroke="'+c2+'" stroke-width="3" transform="rotate(-7 50 58)"/>'
    +'<circle cx="25" cy="48" r="9" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="23" cy="46" r="2.4" fill="'+K+'"/>'
    +'<path d="M28 41 C40 30 56 26 72 28 M36 66 l-4 12 M48 68 l-2 12" '+leg+'/>';
  }else if(b.t==="kamakiri"){
    inner='<path d="M56 32 C62 48 60 66 50 84" fill="none" stroke="'+c1+'" stroke-width="9" stroke-linecap="round"/>'
    +'<path d="M55 56 l16 -8 M53 68 l17 -4 M51 78 l14 4" '+leg+'/>'
    +'<path d="M52 40 L32 34 L40 48 Z" fill="'+c2+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M33 35 L25 22" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
    +'<path d="M49 26 L62 22 L56 33 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<circle cx="52" cy="27" r="2.6" fill="'+K+'"/>'
    +'<path d="M58 22 l3 -9 M61 23 l7 -7" '+leg+'/>';
  }else if(b.t==="hotaru"){
    inner='<circle cx="50" cy="80" r="15" fill="#FFE873" opacity=".4"/>'
    +'<ellipse cx="50" cy="52" rx="17" ry="26" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 30 L50 70" stroke="'+K+'" stroke-width="2.5"/>'
    +'<path d="M34 44 h32" stroke="'+c2+'" stroke-width="5" stroke-linecap="round"/>'
    +'<circle cx="50" cy="76" r="9" fill="#FFE873" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="50" cy="24" r="8" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M45 18 l-5 -8 M55 18 l5 -8 M35 50 l-10 6 M65 50 l10 6" '+leg+'/>';
  }else if(b.t==="mizu"){
    inner='<path d="M28 54 C13 58 7 68 9 80 M72 54 C87 58 93 68 91 80" fill="none" stroke="'+K+'" stroke-width="4.5" stroke-linecap="round"/>'
    +'<ellipse cx="50" cy="54" rx="22" ry="27" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 30 L50 78" stroke="'+K+'" stroke-width="2.5"/>'
    +'<path d="M36 44 h28 M37 58 h26" stroke="'+c2+'" stroke-width="3.5" stroke-linecap="round"/>'
    +'<path d="M40 30 C34 24 30 20 28 14 M60 30 C66 24 70 20 72 14" stroke="'+K+'" stroke-width="4" stroke-linecap="round" fill="none"/>'
    +'<circle cx="44" cy="33" r="2.4" fill="#fff"/><circle cx="56" cy="33" r="2.4" fill="#fff"/>';
  }else if(b.t==="kemushi"){
    inner='<circle cx="74" cy="60" r="11" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="62" cy="56" r="12" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="49" cy="58" r="13" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="36" cy="54" r="13" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="25" cy="48" r="13" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<circle cx="21" cy="45" r="2.6" fill="'+K+'"/>'
    +'<path d="M20 37 l-4 -8 M28 36 l2 -9 M30 68 l0 7 M44 72 l0 7 M58 70 l0 7 M72 72 l0 7" '+leg+'/>';
  }else if(b.t==="dango"){
    inner='<path d="M19 68 A31 31 0 0 1 81 68 Z" fill="'+c1+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/>'
    +'<path d="M30 47 A40 40 0 0 0 30 68 M44 39 A60 60 0 0 0 42 68 M58 39 A60 60 0 0 1 60 68 M70 47 A40 40 0 0 1 70 68" fill="none" stroke="'+c2+'" stroke-width="3"/>'
    +'<circle cx="24" cy="62" r="2.6" fill="'+K+'"/>'
    +'<path d="M20 52 l-6 -6 M26 48 l-3 -8 M28 72 l0 5 M40 74 l0 5 M52 74 l0 5 M64 74 l0 5 M74 72 l0 5" '+leg+'/>';
  }else{ /* other: generic beetle */
    inner='<path d="M34 72 l-9 10 M50 78 l0 11 M66 72 l9 10 M33 56 l-12 2 M67 56 l12 2" '+leg+'/>'
    +'<ellipse cx="50" cy="58" rx="22" ry="26" fill="'+c1+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M50 36 L50 82" stroke="'+K+'" stroke-width="2.5"/>'
    +'<ellipse cx="42" cy="52" rx="5" ry="9" fill="'+c2+'" opacity=".8"/>'
    +'<ellipse cx="50" cy="30" rx="11" ry="8" fill="'+c2+'" stroke="'+K+'" stroke-width="3"/>'
    +'<path d="M44 24 l-6 -8 M56 24 l6 -8" '+leg+'/>'
    +'<circle cx="46" cy="29" r="2.2" fill="#fff"/><circle cx="54" cy="29" r="2.2" fill="#fff"/>';
  }
  return '<svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="'+b.n+'">'+inner+'</svg>';
}

/* ---------- utils ---------- */
function $(id){return document.getElementById(id);}
var app=null;
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(a){a=a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;} return a;}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b); while(b){var t=a%b;a=b;b=t;} return a||1;}
function pad2(n){return (n<10?"0":"")+n;}
function todayStr(){var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function dShift(s,n){var p=s.split("-"),d=new Date(+p[0],+p[1]-1,+p[2]+n); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function fmtDec(n){var s=(Math.round(n*100)/100).toFixed(2); return s.replace(/\.?0+$/,"");}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function say(t){
  try{
    if(!window.speechSynthesis)return;
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(t); u.lang="ja-JP"; u.rate=0.95;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- storage: keisanの本体は1つの「book」に保持し、
   プロフィール一覧は全ゲーム共通の共有レジストリ(QuestSave.profiles)と同期する ---------- */
/* 各プロフィールを独立した kv エントリ "keisan <id>" に保存する。
   旧来は全プロフィールを単一 "_book" にまとめていたため、複数端末で別アカウントを触ると
   last-write-wins で他アカウントの進捗が巻き戻る不具合があった。per-profile 化して各々が
   独立したタイムスタンプでマージされるようにする（他ゲーム eitango/kanji/battle と同じ構造）。 */
function saveProfile(p){ if(p&&p.id&&window.QuestSave) QuestSave.save("keisan", p.id, p); }
function saveAll(){ if(window.QuestSave) DB.profiles.forEach(saveProfile); }
function save(){ saveProfile(P()); }   /* 通常保存＝現在のアカウントのみ（他アカウントのタイムスタンプを動かさない） */
function profIcon(type){ return type==="k5"?"🐞":(type==="k10"?"🪲":"🐛"); }
/* type未設定（他ゲームで作られた子）でもアバター描画が壊れないようフォールバック */
function av(p){ return (p&&AV[p.type])||{n:"",t:"tentou",c1:"#9DB17C",c2:"#5B6B45"}; }
/* 共有レジストリと keisan の profiles を双方向にそろえる */
/* 共有レジストリ(reg)を「正」とする。
   - reg が空のときだけ、旧 keisan の profiles で初回シードする（レガシー移行）。
   - それ以外は reg を権威とし、reg に無い（＝他で削除された）keisan プロフィールは落とす。
   これにより「削除しても keisan が再登録して復活する」二重登録/削除不能バグを解消。 */
function reconcile(reg){
  reg=reg||[];
  var regById={}, i, migrated=false;
  for(i=0;i<reg.length;i++)regById[reg[i].id]=reg[i];
  if(reg.length===0){
    DB.profiles.forEach(function(p){ reg.push({id:p.id,name:p.name,icon:profIcon(p.type)}); });
    if(reg.length){ migrated=true; for(i=0;i<reg.length;i++)regById[reg[i].id]=reg[i]; }
  }
  /* registry を権威に: 削除済み(reg に無い)プロフィールは keisan からも除去 */
  DB.profiles=DB.profiles.filter(function(p){ return regById[p.id]; });
  var keiById={}; for(i=0;i<DB.profiles.length;i++)keiById[DB.profiles[i].id]=DB.profiles[i];
  reg.forEach(function(rp){
    if(!keiById[rp.id]){ var p=newProfile(rp.name,null); p.id=rp.id; p.type=null; DB.profiles.push(p); }
  });
  if(migrated&&window.QuestSave)QuestSave.saveProfiles(reg);
}
function newProfile(name,type){
  return {id:Date.now()+""+ri(100,999), name:name, type:type,
    streak:{n:0,last:null}, caps:{}, missed:[], stats:{}, recent:{}, best:{},
    best5:{}, daily:{}, carryMiss:0, recapture:0, lv:{}, kukuIdx:0, kukuClear:{}, kukuHits:0,
    hsLevel:1, hsRun:0, hsMax:1, hkLevel:1, hkRun:0, hkMax:1, hissanInput:"app", speech:(type==="k5"),
    coll:{gauge:0, total:0, catches:{}}, progressSummary:""};
}
function ensureColl(p){ if(!p.coll)p.coll={gauge:0,total:0,catches:{}};
  /* 旧・ゲーム別amberを共有ウォレットへ一度だけ移行 */
  if(window.QuestSave&&p.id&&p.coll.amber>0&&!p.coll.amberMig){ QuestSave.amberAdd(p.id,p.coll.amber); p.coll.amber=0; p.coll.amberMig=1; saveProfile(p); /* 当該プロフィールを即保存して再移行(二重計上)を防ぐ */ }
  /* 既存catchのサイズを実寸レンジへ一度だけ移行 */
  if(window.Q4BReward&&Q4BReward.migrateSizes&&Q4BReward.migrateSizes(p.coll)) saveProfile(p);
}
function P(){ for(var i=0;i<DB.profiles.length;i++) if(DB.profiles[i].id===DB.act){ensureLvProgress(DB.profiles[i]); return DB.profiles[i];} return null; }
/* 共有ウォレット: 琥珀はプロフィール単位で全ゲーム共通（現在pidを動的参照） */
function pidNow(){ var p=P(); return p?p.id:(window.QuestSave&&QuestSave.currentProfile()); }
if(window.Q4BReward&&window.QuestSave&&Q4BReward.setAmberStore){
  Q4BReward.setAmberStore({
    get:function(){return QuestSave.amberOf(pidNow());},
    add:function(n){return QuestSave.amberAdd(pidNow(),n);},
    spend:function(n){return QuestSave.amberSpend(pidNow(),n);}
  });
}

/* ---------- labels ---------- */
var CATL={hissan:"たし算のひっさん", hikizan:"ひき算のひっさん", kuku:"九九", anzan:"あんざん",
  mix:"四則混合", kufuu:"工夫計算", deci:"小数", frac:"分数", machigai:"まちがいさがし", sougou:"総合",
  warizan:"わり算", wasa:"和差算", jikan:"時間けいさん", kakebun:"かけ算ぶんしょう", noudo:"濃度", tabibito:"旅人算", hiritsu:"比",
  tsurukame:"つるかめ算", kabusoku:"過不足算", heikin:"平均算", soneki:"損益算", shigoto:"仕事算", nenrei:"年齢算", ueki:"植木算",
  ryuusui:"流水算", tsuuka:"通過算", shuuki:"周期算", nichireki:"日暦算", kisokusei:"規則性", hayasahi:"速さと比", shuugou:"集合算",
  bairitsu:"倍数算", shoukyo:"消去算", houjin:"方陣算", baai:"場合の数", hireihanpi:"比例反比例"};
var K5CATS=["hissan","hikizan","kuku","anzan","warizan"], K10CATS=["mix","kufuu","deci","frac","machigai","sougou"];
var K5DEV=["wasa","jikan","kakebun"], K10DEV=["noudo","tabibito","hiritsu","tsurukame","kabusoku","heikin","soneki","shigoto","nenrei","ueki","ryuusui","tsuuka","shuuki","nichireki","kisokusei","hayasahi","shuugou","bairitsu","shoukyo","houjin","baai","hireihanpi"];  /* 発展演習(コース別) */
var LVL_CATS={hissan:1,hikizan:1,kuku:1,anzan:1,warizan:1,wasa:1,jikan:1,kakebun:1,
  mix:1,kufuu:1,deci:1,frac:1,machigai:1,sougou:1,noudo:1,tabibito:1,hiritsu:1,tsurukame:1,kabusoku:1,heikin:1,soneki:1,shigoto:1,nenrei:1,ueki:1,ryuusui:1,tsuuka:1,shuuki:1,nichireki:1,kisokusei:1,hayasahi:1,shuugou:1,bairitsu:1,shoukyo:1,houjin:1,baai:1,hireihanpi:1};  /* Lv1-10対象 */
var TIMED_OK={k5:["anzan","kuku"], k10:["mix","kufuu","deci"]};
var AV={k5:{n:"",t:"tentou",c1:"#E03C2E",c2:"#2A1A14"}, k10:{n:"",t:"kuwagata",c1:"#33302B",c2:"#565046"}};

function clampLv(v){ v=parseInt(v,10); if(!v||v<1)return 1; if(v>10)return 10; return v; }
function legacyHsToLv(v){ v=parseInt(v,10)||1; return v>=4?10:(v>=3?7:(v>=2?4:1)); }
function hsStageFromLv(lv){ lv=clampLv(lv); return lv>=9?4:(lv>=6?3:(lv>=4?2:1)); }
function legacyKukuToLv(p){ return Math.min(10, Math.max(1, ((p&&p.kukuIdx)||0)+1)); }
function syncLegacyFromLv(p){
  if(!p||!p.lv)return;
  p.hsLevel=hsStageFromLv(p.lv.hissan||1); p.hsMax=hsStageFromLv(p.lv.hissan||1);
  p.hkLevel=hsStageFromLv(p.lv.hikizan||1); p.hkMax=hsStageFromLv(p.lv.hikizan||1);
  p.kukuIdx=Math.max(0,Math.min(ORDER.length,(p.lv.kuku||1)-1));
}
function ensureLvProgress(p){
  if(!p)return false;
  var changed=false, cats, i, c;
  if(!p.lv){p.lv={}; changed=true;}
  if(p.lv.hissan==null){p.lv.hissan=legacyHsToLv(p.hsMax||p.hsLevel||1); changed=true;}
  else if(p.hsMax!=null&&p.lv.hissan<legacyHsToLv(p.hsMax)){p.lv.hissan=legacyHsToLv(p.hsMax); changed=true;}
  if(p.lv.hikizan==null){p.lv.hikizan=legacyHsToLv(p.hkMax||p.hkLevel||1); changed=true;}
  else if(p.hkMax!=null&&p.lv.hikizan<legacyHsToLv(p.hkMax)){p.lv.hikizan=legacyHsToLv(p.hkMax); changed=true;}
  if(p.lv.kuku==null){p.lv.kuku=legacyKukuToLv(p); changed=true;}
  else if(p.kukuIdx!=null&&p.lv.kuku<legacyKukuToLv(p)){p.lv.kuku=legacyKukuToLv(p); changed=true;}
  cats=courseCats(p);
  for(i=0;i<cats.length;i++){ c=cats[i]; if(LVL_CATS[c]&&p.lv[c]==null){p.lv[c]=1; changed=true;} p.lv[c]=clampLv(p.lv[c]); }
  syncLegacyFromLv(p);
  return changed;
}
/* カテゴリLvの推移を1日1点で記録（同日は最新で上書き）。📈レベルすいいグラフ用。
   実装後からの記録（過去分は遡れない）。 */
function logLv(p,cat){
  if(!p||!cat||!LVL_CATS[cat])return;
  var lv=(p.lv&&p.lv[cat]); if(lv==null)return;
  if(!p.lvlog)p.lvlog={};
  var arr=p.lvlog[cat]||(p.lvlog[cat]=[]), d=todayStr();
  if(arr.length&&arr[arr.length-1][0]===d)arr[arr.length-1][1]=lv;
  else arr.push([d,lv]);
}
function normalizeAllProgress(){
  var changed=false;
  if(!DB||!DB.profiles)return false;
  DB.profiles.forEach(function(p){ if(ensureLvProgress(p))changed=true; });
  return changed;
}

/* ---------- navigation helpers ---------- */
function render(html){ app.innerHTML=html; window.scrollTo(0,0); }
function topBar(backFn,extra){
  var p=P();
  return '<div class="top">'
    +(backFn?'<button class="backbtn" onclick="'+backFn+'">◀ もどる</button>':'')
    +(p&&!backFn?'<button class="chip" onclick="showProfiles()"><span class="av">'+bugSVG(av(p))+'</span>'+esc(p.name)+'</button>':'')
    +'<span class="sp"></span>'+(extra||"")+'</div>';
}
function kagoChip(){
  var p=P(); if(!p)return ''; ensureColl(p);
  var cnt=(window.Q4BReward?Q4BReward.collectedCount(p.coll):capCount(p));
  var tot=(window.Q4BReward?Q4BReward.poolCount('keisan'):BUGS.length);
  return '<button class="chip kago" onclick="showZukan()">🧺 '+cnt+'/'+tot+'</button>';
}
function fireChip(){var p=P(); if(!p)return ''; return '<span class="chip fire">🔥 '+p.streak.n+'日</span>';}
function capCount(p){var c=0; for(var k in p.caps) c++; return c;}

/* ---------- profile screens ---------- */
function showProfiles(){
  var h='<div class="scr"><div class="hero"><div class="sun"></div><h2>けいさん昆虫ハンター</h2>'
    +'<p style="margin:4px 0 10px">きょうも むしとり に しゅっぱつ！</p><div class="grass"></div></div>';
  if(DB.profiles.length===0){
    h+='<div class="card center"><p>さいしょに ハンターを とうろくしよう</p></div>';
  }
  DB.profiles.forEach(function(p){
    h+='<button class="btn big ghost" style="display:flex;align-items:center;gap:14px;text-align:left" onclick="selProfile(\''+p.id+'\')">'
      +'<span style="width:52px;height:52px;flex:none">'+bugSVG(av(p))+'</span>'
      +'<span>'+esc(p.name)+'<br><span class="note">'+(!p.type?"コースを えらぶ":(p.type==="k5"?"ビギナーコース":"受験チャレンジコース"))+'　🔥'+p.streak.n+'日　🧺'+(function(q){ensureColl(q);return window.Q4BReward?Q4BReward.collectedCount(q.coll):capCount(q);})(p)+'匹</span></span></button>';
  });
  if(DB.profiles.length<4) h+='<button class="btn sm ghost" onclick="showNewProfile()">＋ あたらしいハンターをとうろく</button>';
  h+='</div>';
  render(h);
}
function showNewProfile(){
  render('<div class="scr">'+topBar(DB.profiles.length?"showProfiles()":"")
    +'<div class="card"><h3>あたらしいハンター</h3>'
    +'<p style="margin-top:10px">なまえ</p><input type="text" id="pname" maxlength="10" placeholder="れい：たろう">'
    +'<p style="margin-top:14px">コース</p>'
    +'<button class="btn ghost" id="tA" onclick="selType(\'k5\')">🐞 ビギナーコース<br><span class="note">たしざんの筆算・九九・あんざん</span></button>'
    +'<button class="btn ghost" id="tB" onclick="selType(\'k10\')">🪲 受験チャレンジコース<br><span class="note">四則混合・工夫計算・小数・分数</span></button>'
    +'<button class="btn amber" onclick="makeProfile()">とうろくする</button></div></div>');
  window._ptype=null;
}
function selType(t){window._ptype=t; $("tA").style.borderColor=(t==="k5")?"var(--amber)":"var(--line)"; $("tB").style.borderColor=(t==="k10")?"var(--amber)":"var(--line)";}
function makeProfile(){
  var name=$("pname").value.trim();
  if(!name){alert("なまえを いれてね");return;}
  if(!window._ptype){alert("コースを えらんでね");return;}
  var p=newProfile(name,window._ptype);
  if(window.QuestSave){ var sp=QuestSave.addProfile(name,profIcon(window._ptype)); p.id=sp.id; }
  DB.profiles.push(p); DB.act=p.id;
  if(window.QuestSave)QuestSave.setCurrentProfile(p.id);
  save();
  var bz=window.Q4BBossZukan?Q4BBossZukan.load(p.id):Promise.resolve();
  bz.then(showHome).catch(showHome);
}
function selProfile(id){
  DB.act=id; if(window.QuestSave)QuestSave.setCurrentProfile(id);
  var bz=window.Q4BBossZukan?Q4BBossZukan.load(id):Promise.resolve();
  var p=P();
  if(p&&!p.type){ bz.then(function(){ chooseCourse(p); }).catch(function(){ chooseCourse(p); }); return; }
  save();
  bz.then(showHome).catch(showHome);
}
/* 他ゲームで作られた（コース未設定の）子が初めて遊ぶときコースを決める */
function chooseCourse(p){
  render('<div class="scr">'+topBar("showProfiles()")
    +'<div class="card"><h3>'+esc(p.name)+' の コース</h3>'
    +'<button class="btn ghost" onclick="setCourse(\''+p.id+'\',\'k5\')">🐞 ビギナーコース<br><span class="note">たしざん・ひきざんの筆算・九九・あんざん</span></button>'
    +'<button class="btn ghost" onclick="setCourse(\''+p.id+'\',\'k10\')">🪲 受験チャレンジコース<br><span class="note">四則混合・工夫計算・小数・分数</span></button>'
    +'</div></div>');
}
function setCourse(id,t){
  var p=null,i; for(i=0;i<DB.profiles.length;i++)if(DB.profiles[i].id===id)p=DB.profiles[i];
  if(!p)return;
  p.type=t; p.speech=(t==="k5"); save();
  if(window.QuestSave)QuestSave.profiles().then(function(reg){
    var r=null,j; for(j=0;j<reg.length;j++)if(reg[j].id===id)r=reg[j];
    if(r){ r.icon=profIcon(t); QuestSave.saveProfiles(reg); }
  });
  showHome();
}

/* ---------- home ---------- */
function dueMissed(p){var t=todayStr(); return p.missed.filter(function(m){return m.due<=t;});}
/* Lvに応じてボタン背景を 薄緑(Lv1)→濃緑(Lv10) に濃くする＝進捗がひと目で分かる */
function lvBg(lv){ var t=Math.max(0,Math.min(1,(lv-1)/9)); function mix(a,b){return Math.round(a+(b-a)*t);}
  return 'rgb('+mix(0xEC,0x2C)+','+mix(0xF2,0x5F)+','+mix(0xDB,0x2D)+')'; }
function courseCats(p){ return (p.type==="k5")?K5CATS.concat(K5DEV):K10CATS.concat(K10DEV); }
/* おすすめ(レアブースト対象): 今日未学習 ∪ 総学習量の少ないtop5。まんべんなく学習を促す。 */
function balanceCats(p){
  var cats=courseCats(p), t=todayStr(), set={};
  var sorted=cats.slice().sort(function(a,b){return ((p.stats[a]&&p.stats[a].n)||0)-((p.stats[b]&&p.stats[b].n)||0);});
  sorted.slice(0,5).forEach(function(c){ set[c]='low'; });
  cats.forEach(function(c){ if(((p.lastDone&&p.lastDone[c])||"")!==t){ set[c]=set[c]?'both':'new'; } });
  return set;
}
function isBalanceCat(p,c){ return !!balanceCats(p)[c]; }
function catBtnHTML(c,act,p,mark){
  var leveled=!!LVL_CATS[c], lv=leveled?((p.lv&&p.lv[c])||1):0;
  /* 背景(lvBg)は固定の薄緑→濃緑。文字色も固定にする（var(--ink)は夜モードで白化し薄緑に白文字＝不可視になるため） */
  var sty=leveled?('background:'+lvBg(lv)+';color:'+(lv>=6?'#fff':'#22331a')+';border-color:transparent;box-shadow:0 3px 0 rgba(40,60,30,.22)'):'';
  if(mark) sty+=';outline:3px solid #E8B23A;outline-offset:-1px';
  var lvtag=leveled?'<span style="font-weight:800;opacity:.92">　Lv'+lv+'/10</span>':'';
  var mk=(mark==='low'||mark==='both')?' 🌟':(mark==='new'?' 🆕':'');
  return '<button class="btn sm ghost"'+(sty?' style="'+sty+'"':'')+' onclick="'+act+'">'+CATL[c]+mk+lvtag+'</button>';
}
function showHome(){
  var p=P(); if(!p){showProfiles();return;}
  var t=todayStr(), d=p.daily[t], done=d&&d.md;
  var due=dueMissed(p).length;
  ensureColl(p);
  var night=!!(window.Q4BReward&&Q4BReward.isNightNow&&Q4BReward.isNightNow());
  if(window.Q4BReward&&Q4BReward.setNight)Q4BReward.setNight(night);
  document.body.classList.toggle('night',night);
  var h='<div class="scr">'+topBar(null);
  if(window.Q4BReward)h+=Q4BReward.statusHTML({caught:Q4BReward.collectedCount(p.coll),pool:Q4BReward.poolCount('keisan'),amber:Q4BReward.amberOf(p.coll),streak:p.streak.n,total:p.coll.total});
  h+='<div class="hero"><div class="'+(night?'moon':'sun')+'"></div><h2>'+(done?"きょうのミッション クリア！":"きょうの むしとりミッション")+'</h2>'
    +'<p style="margin:2px 0 12px">'+(night?'🌙 よるは よるの虫が でやすいよ<br>':'')+(done?"れんしゅうで もっと つかまえよう":"クリアすると 昆虫を 1匹 ゲット！")+(due?'<br>🦋 にがした虫が '+due+'匹 まってるよ':"")+'</p>'
    +'<button class="btn big amber" onclick="startMission()">'+(done?"もういちど ちょうせん":"ミッション スタート！")+'</button>'
    +'<div class="grass"></div></div>';
  var bal=balanceCats(p);  /* おすすめ(レアブースト)カテゴリ */
  h+='<div class="card" style="border-color:var(--amber);background:#FFF8ED"><p style="font-weight:800;color:var(--amber-d);margin:0">🌟 まだ やっていない／あまり やっていない（🌟🆕）を やると、めずらしい虫が 出やすいよ！いろいろ やってみよう</p></div>';
  h+='<div class="card"><h3>じぶんで れんしゅう</h3><div class="grid2">';
  var cats=(p.type==="k5")?K5CATS:K10CATS;
  cats.forEach(function(c){
    var act=(c==="kuku")?"showKuku()":((c==="hissan"||c==="hikizan")?"showLevels('"+c+"')":"startPractice('"+c+"')");
    h+=catBtnHTML(c,act,p,bal[c]);
  });
  h+='</div></div>';
  /* 発展演習（コース別。Lv1-10の適応難度） */
  var devs=(p.type==="k5")?K5DEV:K10DEV;
  if(devs&&devs.length){
    h+='<div class="card"><h3>🌟 はってん もんだい <span style="font-size:11px;color:#B26A00;font-weight:700;background:#FFF3D6;border:1px solid #F2C879;border-radius:999px;padding:1px 8px;margin-left:4px">✨ レアな虫が すこし でやすい！</span></h3><div class="grid2">';
    devs.forEach(function(c){
      h+=catBtnHTML(c,"startPractice('"+c+"')",p,bal[c]);
    });
    h+='</div></div>';
  }
  /* timed */
  var th=""; TIMED_OK[p.type].forEach(function(c){
    var rec=p.recent[c]||[], n=rec.length, okn=rec.reduce(function(s,x){return s+x;},0);
    var unlocked=(n>=20&&okn>=19);
    var best=p.best[c];
    th+='<div class="row"><span>'+CATL[c]+(best?'<span class="note">　ベスト '+best+'問</span>':"")+'</span><span class="sp"></span>'
      +(unlocked?'<button class="backbtn" onclick="startTimed(\''+c+'\')">⏱ 60秒</button>'
                :'<span class="note">直近20問で19問正解で解放（いま '+okn+'/'+n+'）</span>')+'</div>';
  });
  h+='<div class="card"><h3>⏱ タイムアタック</h3>'+th+'</div>';
  // 復習ボタン（抜き打ち + 常設小ボタン）
  var revLearned=(p.type==="k5"?K5CATS:K10CATS).filter(function(c){return p.stats[c]&&p.stats[c].n>0;});
  var showRevBanner=(revLearned.length>=2||dueMissed(p).length>=1)&&Math.random()<0.25;
  if(showRevBanner){
    h+='<div class="card" style="border-color:var(--amber);background:#FFF8ED">'
      +'<p style="font-weight:800;color:var(--amber-d);margin:0 0 6px">📣 ふくしゅうチャンス！いつもより めずらしい虫が 出やすいよ！</p>'
      +'<button class="btn amber" onclick="startReview()">ふくしゅうチャレンジ</button></div>';
  }
  h+='<div class="grid2">'
    +'<button class="btn ghost" onclick="showZukan()">📖 むしずかん</button>'
    +'<button class="btn ghost" onclick="showStats()">📊 きろく</button></div>'
    +'<div class="grid2" style="margin-top:0">'
    +'<button class="btn sm ghost" onclick="startReview()">🔁 ふくしゅう</button>'
    +'<button class="btn sm ghost" onclick="showSettings()">⚙ せってい・データ</button></div>';
  h+='</div>';
  render(h);
  checkMastersK();
}

/* ===== マスター虫（全習得限定）===== */
function masterMetK(key){
 var p=P(); if(!p)return false;
 if(key==="add") return ((p.lv&&p.lv.hissan)||legacyHsToLv(p.hsMax||p.hsLevel||1))>=10;
 if(key==="sub") return ((p.lv&&p.lv.hikizan)||legacyHsToLv(p.hkMax||p.hkLevel||1))>=10;
 if(key==="mul") return ((p.lv&&p.lv.kuku)||legacyKukuToLv(p))>=10;
 if(key==="div") return ["anzan","sougou","mix"].some(function(c){var s=p.stats[c];return s&&s.n>=50&&(s.ok/s.n)>=0.9;});
 if(key==="all") return masterMetK("add")&&masterMetK("sub")&&masterMetK("mul")&&masterMetK("div");
 /* per-category マスター: そのカテゴリの Lv が10(制覇)に到達したら獲得 */
 if(LVL_CATS[key]) return ((p.lv&&p.lv[key])||0)>=10;
 return false;
}
var KMASTERLAB={add:"たし算ひっさん",sub:"ひき算ひっさん",mul:"九九",div:"暗算",all:"ぜんぶ"};
function checkMastersK(){
 var p=P(); if(!p||!window.Q4BReward||!Q4BReward.masterBugsFor)return; ensureColl(p);
 var awarded=[];
 Q4BReward.masterBugsFor("keisan").forEach(function(sp){
  if(Q4BReward.masterObtained(p.coll,sp.id))return;
  if(masterMetK(sp.master.key)){ if(Q4BReward.awardMaster(p.coll,sp))awarded.push(sp); }
 });
 if(awarded.length){ save(); showMasterCelebrationK(awarded); }
}
function showMasterCelebrationK(list){ var sp=list[0];
 var inner='<div style="font-size:14px;color:var(--amber-d);font-weight:800">🎓 ぜんぶ習得！</div>'
  +'<div style="width:120px;height:120px;margin:8px auto">'+Q4BReward.svg(sp)+'</div>'
  +'<div style="font-weight:bold;font-size:18px">マスター虫「'+esc(sp.jaName||sp.id)+'」をゲット！</div>'
  +'<div class="note" style="margin-top:4px">'+esc(sp.note||"")+'</div>'
  +(list.length>1?'<div class="note">ほかにも '+(list.length-1)+'匹！</div>':"");
 app.insertAdjacentHTML("beforeend",'<div class="modal" id="md" onclick="closeMd(event)"><div class="mcard center">'+inner+'<button class="btn" style="margin-top:12px" onclick="closeMd()">やったー！</button></div></div>');
}
function keisanMasterSection(){
 if(!window.Q4BReward||!Q4BReward.masterBugsFor)return "";
 var p=P(); var ms=Q4BReward.masterBugsFor("keisan"); if(!ms.length)return "";
 var ord=["hissan","add","hikizan","sub","kuku","mul","anzan","div","warizan","mix","kufuu","deci","frac","machigai","sougou","wasa","jikan","kakebun","noudo","tabibito","hiritsu","tsurukame","kabusoku","heikin","soneki","shigoto","nenrei","ueki","ryuusui","tsuuka","shuuki","nichireki","kisokusei","hayasahi","shuugou","bairitsu","shoukyo","houjin","baai","hireihanpi","all"];
 ms.sort(function(a,b){return ord.indexOf(a.master.key)-ord.indexOf(b.master.key);});
 var got=ms.filter(function(sp){return Q4BReward.masterObtained(p.coll,sp.id);}).length;
 var cells=ms.map(function(sp){ var ok=Q4BReward.masterObtained(p.coll,sp.id);
  return '<div class="zc" style="--rc:#E8B33C'+(ok?"":";opacity:.55")+'"><div class="bs">'+(ok?(window.Q4BRender&&Q4BRender.deco?Q4BRender.deco(sp,0):Q4BReward.svg(sp)):'<div style="font-size:34px;line-height:64px">🎓</div>')+'</div><div class="nm">'+(ok?esc(sp.jaName)+" 🎓":(KMASTERLAB[sp.master.key]||CATL[sp.master.key]||""))+'</div></div>';
 }).join("");
 return '<div class="card"><h3>🎓 マスター虫　<span style="color:var(--amber-d)">'+got+' / '+ms.length+'</span></h3><p class="note" style="margin:2px 0 8px">そのスキルを <b>ぜんぶ習得</b>すると もらえる特別な虫</p><div class="zgrid">'+cells+'</div></div>';
}
/* ---------- zukan ---------- */
function showZukan(){
  var p=P();
  ensureColl(p);
  var pool=window.Q4BReward?Q4BReward.pool('keisan'):[];
  var cnt=window.Q4BReward?Q4BReward.collectedCount(p.coll):capCount(p);
  var tot=pool.length||BUGS.length;
  var rankLabel=window.Q4BReward?Q4BReward.rank(p.coll.total):"";
  var h='<div class="scr">'+topBar("showHome()");
  h+='<div class="card"><h3>📖 むしずかん　<span style="color:var(--amber-d)">'+cnt+' / '+tot+'</span></h3>'
    +'<div class="pbar"><i style="width:'+(tot?Math.round(cnt/tot*100):0)+'%"></i></div>'
    +(rankLabel?'<p style="margin:6px 0 0;font-size:13px;color:var(--sub)">称号：<b style="color:var(--ink)">'+esc(rankLabel)+'</b></p>':"")
    +'</div>';
  if(!window.Q4BReward||!pool.length){
    /* fallback: old BUGS array */
    h+='<div class="zgrid">';
    BUGS.forEach(function(b,i){
      var c=p.caps[i];
      h+='<div class="zc r'+b.r+(c?"":" ")+'" onclick="openBugLegacy('+i+')">'
        +(c>1?'<span class="cnt">×'+c+'</span>':"")
        +'<div class="bs'+(c?"":" sil")+'">'+bugSVG(b)+'</div>'
        +'<div class="nm">'+(c?esc(b.n):"？？？")+'</div></div>';
    });
    h+='</div></div>'; render(h); return;
  }
  /* こはく表示＋ボタン */
  var amberNow=Q4BReward.amberOf(p.coll);
  var canSpend=(amberNow>=Q4BReward.AMBER_CATCH_COST);
  h+='<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    +'<span style="font-size:15px;font-weight:700">🍯 こはく：<b>'+amberNow+'</b></span>'
    +'<button id="amberCatchBtn" class="btn amber" style="margin:0;padding:8px 14px;font-size:14px;width:auto'+(canSpend?'':'opacity:.45;pointer-events:none')+'"'
    +(canSpend?'':' disabled')
    +' onclick="keisanAmberCatch()">🍯 こはくで よぶ（30）</button></div>';
  h+=keisanMasterSection();
  if(window.Q4BBossZukan)h+=Q4BBossZukan.sectionHTML("keisan");  /* 👑 ボス昆虫節 */
  /* Q4BReward ベース: tierOf 降順ソート */
  var sorted=pool.slice().sort(function(a,b){ return Q4BReward.tierOf(b)-Q4BReward.tierOf(a)||(a.jaName<b.jaName?-1:1); });
  h+='<div class="zgrid">';
  sorted.forEach(function(sp){
    var rec=p.coll.catches[sp.id];
    var tier=Q4BReward.tierOf(sp);
    h+='<div class="zc r'+tier+(rec?"":" ")+'" onclick="openBugNew(\''+sp.id+'\')">';
    if(rec&&rec.n>1)h+='<span class="cnt">×'+rec.n+'</span>';
    if(rec){
      /* 通常を基本表示。色違いしか持っていない時のみ色違い表示。✨は色違い所持の印 */
      var recNormal=(rec.normal!=null?rec.normal:1);
      var showShiny=(rec.shiny&&!recNormal)?1:0;
      h+='<div class="bs">'+Q4BReward.svg(sp,showShiny)+'</div>';
      h+='<div class="nm">'+esc(sp.jaName)+(rec.shiny?'✨':"")+'</div>';
    }else{
      h+='<div class="bs sil">'+Q4BReward.svg(sp)+'</div>';
      h+='<div class="nm">？？？</div>';
    }
    h+='</div>';
  });
  h+='</div></div>';
  render(h);
}
function openBugNew(spId){
  var p=P(); ensureColl(p);
  if(!window.Q4BReward)return;
  var pool=Q4BReward.pool('keisan');
  var sp=null; for(var i=0;i<pool.length;i++){if(pool[i].id===spId){sp=pool[i];break;}}
  if(!sp)return;
  var rec=p.coll.catches[sp.id];
  var tier=Q4BReward.tierOf(sp);
  var inner;
  if(!rec){
    inner='<div style="width:140px;height:140px;margin:0 auto" class="sil">'+Q4BReward.svg(sp)+'</div>'
      +'<h3>？？？</h3><p class="note">まだ つかまえていない…<br>もんだいを といて さがそう！</p>'
      +'<p><span class="rtag r'+tier+'">'+Q4BReward.TIERNAME[tier]+'</span></p>';
  }else{
    var sz=Q4BReward.sizeRange(sp);
    var recNormal=(rec.normal!=null?rec.normal:1);
    var forms;
    if(recNormal&&rec.shiny){
      forms='<div style="display:flex;gap:10px;justify-content:center;align-items:flex-end">'
        +'<div><div style="width:104px;height:104px;margin:0 auto">'+Q4BReward.svg(sp,0)+'</div><div class="note">ノーマル</div></div>'
        +'<div><div style="width:104px;height:104px;margin:0 auto">'+Q4BReward.svg(sp,1)+'</div><div class="note">✨いろちがい</div></div></div>';
    }else{
      forms='<div style="width:140px;height:140px;margin:0 auto">'+Q4BReward.svg(sp,rec.shiny?1:0)+'</div>';
    }
    var caught=(rec.min!=null&&rec.min<rec.max)?(rec.min+'〜'+rec.max+'mm'):(rec.max+'mm');
    inner=forms
      +'<h3>'+esc(sp.jaName)+(rec.shiny?'　✨':"")+'</h3>'
      +'<p><span class="rtag r'+tier+'">'+Q4BReward.TIERNAME[tier]+'</span>　×'+rec.n+'</p>'
      +'<p style="font-size:14px;color:var(--sub)">つかまえた おおきさ <b>'+caught+'</b>　（種の範囲: '+sz[0]+'〜'+sz[1]+'mm）</p>'
      +(sp.scientificName?'<p class="note"><i>'+esc(sp.scientificName)+'</i></p>':"")
      +'<p class="note">'+esc([sp.familyJa,sp.groupJa].filter(Boolean).join(' / '))+'</p>'
      +(sp.caution?'<p style="background:#FFF1DE;border-radius:12px;padding:8px;font-size:14px;color:var(--amber-d);font-weight:800">'+esc(sp.caution)+'</p>':"")
      +(sp.note?'<p style="background:var(--green-l);border-radius:12px;padding:10px;font-size:15px">'+esc(sp.note)+'</p>':"");
  }
  app.insertAdjacentHTML("beforeend",'<div class="modal" id="md" onclick="closeMd(event)"><div class="mcard">'+inner
    +'<button class="btn sm ghost" onclick="closeMd()">とじる</button></div></div>');
}
function openBugLegacy(i){
  var p=P(), b=BUGS[i], c=p.caps[i];
  var inner;
  if(!c){ inner='<div style="width:140px;height:140px;margin:0 auto" class="sil">'+bugSVG(b)+'</div>'
    +'<h3>？？？</h3><p class="note">まだ つかまえていない…<br>ミッションをクリアして さがそう！</p>'
    +'<p><span class="rtag r'+b.r+'">'+RAR[b.r]+'</span></p>'; }
  else{ inner='<div style="width:140px;height:140px;margin:0 auto">'+bugSVG(b)+'</div>'
    +'<h3>'+esc(b.n)+'</h3><p><span class="rtag r'+b.r+'">'+RAR[b.r]+'</span>　×'+c+'</p>'
    +(b.scientificName?'<p class="note"><i>'+esc(b.scientificName)+'</i></p>':"")
    +'<p class="note">'+esc([b.familyJa,b.groupJa].filter(Boolean).join(' / '))+'</p>'
    +(b.caution?'<p style="background:#FFF1DE;border-radius:12px;padding:8px;font-size:14px;color:var(--amber-d);font-weight:800">'+esc(b.caution)+'</p>':"")
    +'<p style="background:var(--green-l);border-radius:12px;padding:10px;font-size:15px">'+esc(b.q)+'</p>'; }
  app.insertAdjacentHTML("beforeend",'<div class="modal" id="md" onclick="closeMd(event)"><div class="mcard">'+inner
    +'<button class="btn sm ghost" onclick="closeMd()">とじる</button></div></div>');
}
function closeMd(ev){ if(ev&&ev.target.id!=="md"&&ev.type==="click"&&ev.currentTarget!==ev.target)return; var m=$("md"); if(m)m.remove(); }

/* ---------- gacha ---------- */
function gachaPull(p){
  var s=Math.min(p.streak.n,7);
  var r4=0.006+0.001*s, r3=0.025+0.004*s, r2=0.10+0.01*s, r1=0.27+0.005*s;
  var x=Math.random(), r;
  if(x<r4)r=4; else if(x<r4+r3)r=3; else if(x<r4+r3+r2)r=2; else if(x<r4+r3+r2+r1)r=1; else r=0;
  var pool=[], newOnly=[];
  BUGS.forEach(function(b,i){ if(b.r===r){pool.push(i); if(!p.caps[i])newOnly.push(i);} });
  if(!pool.length)return ri(0,BUGS.length-1);
  var i=(newOnly.length&&Math.random()<0.7)?pick(newOnly):pick(pool);
  return i;
}
function addCapture(p,i){ p.caps[i]=(p.caps[i]||0)+1; save(); return p.caps[i]; }
function keisanAmberCatch(){
  var p=P(); ensureColl(p);
  if(!window.Q4BReward)return;
  var got=Q4BReward.spendForCatch(p.coll,'keisan');
  if(!got){ alert('🍯こはくが たりないよ（30こ いるよ）'); return; }
  save();
  showCapture(null,'🍯こはく30こで つかまえた！',got);
}
function showCapture(i,extraMsg,presetGot){
  var p=P(); ensureColl(p);
  if(window.Q4BReward){
    var got=presetGot||null;
    if(!got){ got=Q4BReward.award(p.coll,'keisan'); save(); }
    if(got){
      var sp=got.sp, tier=got.tier, rec=p.coll.catches[sp.id];
      var tag=got.isNew?'<span class="note" style="color:var(--amber-d);font-weight:800">✨ NEW！ ずかんに とうろく</span>'
        :'<span class="note">×'+rec.n+'匹め'+(got.isRecord?'・じこベスト こうしん!':'')+'</span>';
      var h='<div class="scr">'+topBar();
      h+='<div class="card center"><h2>つかまえた！</h2>'+(extraMsg?'<p style="color:var(--amber-d);font-weight:700">'+extraMsg+'</p>':"")
        +'<div class="flipwrap"><div class="flip">'
        +'<div class="face front r'+tier+'"><div class="bs">'+Q4BReward.svg(sp,got.shiny)+'</div>'
        +'<div class="bn">'+esc(sp.jaName)+(got.shiny?' ✨':'')+'</div><span class="rtag r'+tier+'">'+Q4BReward.TIERNAME[tier]+'</span>'
        +'<span class="note">'+got.size+'mm</span>'+tag+'</div>'
        +'<div class="face back"><span style="font-size:50px">🧺</span></div>'
        +'</div></div>'
        +'<p style="background:var(--green-l);border-radius:12px;padding:10px;font-size:15px">'+esc(sp.note||"")+'</p>'
        +'<button class="btn amber" onclick="showZukan()">ずかんで みる</button>'
        +'<button class="btn ghost sm" onclick="showHome()">ホームへ</button></div></div>';
      render(h); return;
    }
  }
  /* legacy fallback (shared scripts not loaded) */
  if(i==null)i=0;
  var b=BUGS[i], cnt=addCapture(p,i);
  var h='<div class="scr">'+topBar();
  h+='<div class="card center"><h2>つかまえた！</h2>'+(extraMsg?'<p style="color:var(--amber-d);font-weight:700">'+extraMsg+'</p>':"")
    +'<div class="flipwrap"><div class="flip">'
    +'<div class="face front r'+b.r+'"><div class="bs">'+bugSVG(b)+'</div>'
    +'<div class="bn">'+esc(b.n)+'</div><span class="rtag r'+b.r+'">'+RAR[b.r]+'</span>'
    +(cnt>1?'<span class="note">×'+cnt+'匹め</span>':'<span class="note" style="color:var(--amber-d);font-weight:800">✨ NEW！</span>')+'</div>'
    +'<div class="face back"><span style="font-size:50px">🧺</span></div>'
    +'</div></div>'
    +'<p style="background:var(--green-l);border-radius:12px;padding:10px;font-size:15px">'+esc(b.q)+'</p>'
    +'<button class="btn amber" onclick="showZukan()">ずかんで みる</button>'
    +'<button class="btn ghost sm" onclick="showHome()">ホームへ</button></div></div>';
  render(h);
}

/* ---------- stats ---------- */
/* 📈 カテゴリ別 Lv 推移（小さな折れ線の一覧）。p.lvlog にデータがあるカテゴリのみ表示。 */
function lvTrendSection(p){
  if(!p)return '';
  var cats=courseCats(p), rows="", any=false;
  cats.forEach(function(c){
    var log=p.lvlog&&p.lvlog[c];
    if(!log||!log.length){
      var currentLv=clampLv(p.lv&&p.lv[c]);
      log=[[todayStr(),currentLv]];
    }
    any=true;
    var W=120,H=46,pad=5,n=log.length;
    var xy=log.map(function(e,i){
      var x=pad+(W-2*pad)*(n<2?0:i/(n-1));
      var y=pad+(H-2*pad)*(1-((clampLv(e[1])-1)/9));
      return [x,y];
    });
    var cur=clampLv(log[log.length-1][1]), mastered=cur>=10;
    var col=mastered?"#E8B23A":"var(--green)", cold=mastered?"#B26A00":"var(--green-d)";
    var poly=(n>=2)?'<polyline points="'+xy.map(function(q){return q[0].toFixed(1)+","+q[1].toFixed(1);}).join(" ")+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"/>':'';
    var last=xy[xy.length-1];
    rows+='<div style="display:inline-block;width:50%;vertical-align:top;padding:3px;box-sizing:border-box">'
      +'<div style="font-size:11px;font-weight:700;color:#3a4a2c">'+(CATL[c]||c)+' <span style="color:'+cold+'">Lv'+cur+(mastered?" 🎓":"")+'</span></div>'
      +'<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="background:#F3F6EC;border-radius:6px">'
      +'<line x1="'+pad+'" y1="'+pad+'" x2="'+(W-pad)+'" y2="'+pad+'" stroke="#E2C879" stroke-width="1" stroke-dasharray="2 3"/>'
      +poly+'<circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="3" fill="'+cold+'"/></svg></div>';
  });
  if(!any)return '<div class="card"><h3>📈 レベルの すいい</h3>'
    +'<p class="note">けいさんを とくと、ここに カテゴリごとの のびかたグラフが でるよ！（きょうから きろくスタート）</p></div>';
  return '<div class="card"><h3>📈 レベルの すいい</h3><div>'+rows+'</div>'
    +'<p class="note">通常カテゴリも発展カテゴリも対象。履歴がまだ少ないところは、いまのLvを点で表示します。</p></div>';
}
function showStats(){
  var p=P(), h='<div class="scr">'+topBar("showHome()");
  h+='<div class="card center"><h3>🔥 れんぞく '+p.streak.n+'日</h3>'
    +'<p class="note">にがした虫の再ちょうせん待ち：'+p.missed.length+'匹　／　とりもどした数：'+p.recapture+'匹</p></div>';
  /* 総括 */
  h+='<div class="card"><h3>🌱 いまの ちから</h3>'
    +'<p style="font-weight:800;font-size:18px;color:var(--green-d)">'+esc(buildProgressSummary(p))+'</p></div>';
  /* ひっさんレベル・九九バー（k5のみ） */
  if(p.type==="k5"){
    var hsMx=(p.lv&&p.lv.hissan)||legacyHsToLv(p.hsMax||p.hsLevel||1), hkMx=(p.lv&&p.lv.hikizan)||legacyHsToLv(p.hkMax||p.hkLevel||1);
    function lvBar(lv,run){ if(lv>=10)return 100; return Math.round(((lv-1)*5+Math.max(0,Math.min(5,run||0)))/45*100); }
    h+='<div class="card"><h3>✏️ ひっさんレベル</h3>'
      +'<div class="brow"><span class="bl">たし算</span><span class="bt"><span class="bf" style="width:'+lvBar(hsMx,p.hsRun)+'%"></span></span>'
      +'<span class="bv">Lv'+hsMx+' / 10</span></div>'
      +'<div class="brow"><span class="bl">ひき算</span><span class="bt"><span class="bf" style="width:'+lvBar(hkMx,p.hkRun)+'%"></span></span>'
      +'<span class="bv">Lv'+hkMx+' / 10</span></div>'
      +'<p class="note">ミッション/おまかせ練習で 5問せいかいするごとに Lvアップ！</p></div>';
    var kukuN=p.kukuIdx||0, kukuTotal=ORDER.length, kukuHits=p.kukuHits||0;
    var kukuPct=Math.round((kukuN+(kukuN<kukuTotal?Math.min(8,kukuHits)/8:0))/kukuTotal*100);
    h+='<div class="card"><h3>🔢 九九マスター</h3>'
      +'<div class="brow"><span class="bl">マスター段数</span><span class="bt"><span class="bf" style="width:'+kukuPct+'%"></span></span>'
      +'<span class="bv">Lv'+((p.lv&&p.lv.kuku)||legacyKukuToLv(p))+' / 10</span></div>'
      +(kukuN>=kukuTotal?'<p style="font-weight:800;color:var(--amber-d)">🏆 ぜんだんマスター！</p>'
        :'<p class="note">いまの目標：<b>'+ORDER[kukuN]+'の段</b>　ミッションで あと<b>'+Math.max(0,8-kukuHits)+'</b>回せいかいで すすむ（九九チャレンジでも）</p>')
      +'</div>';
  }
  /* heatmap: last 10 weeks */
  var t=todayStr(), cells="", start=dShift(t,-69);
  for(var k=0;k<70;k++){
    var d=dShift(start,k), n=(p.daily[d]||{}).n||0;
    var lv=n===0?"":(n<5?"l1":n<12?"l2":n<25?"l3":"l4");
    cells+='<i class="'+lv+'" title="'+d+'：'+n+'問"></i>';
  }
  h+='<div class="card"><h3>📅 がんばりカレンダー（10週間）</h3><div class="hm">'+cells+'</div>'
    +'<p class="note">こい色ほど たくさん といた日</p></div>';
  /* accuracy bars */
  var bars=""; var cats=(p.type==="k5")?K5CATS:K10CATS;
  cats.forEach(function(c){
    if(c==="sougou")return;
    var s=p.stats[c]; if(!s||!s.n)return;
    var pc=Math.round(s.ok/s.n*100), av=(s.ms/s.n/1000).toFixed(1);
    bars+='<div class="brow"><span class="bl">'+CATL[c]+'</span><span class="bt"><span class="bf" style="width:'+pc+'%"></span></span>'
      +'<span class="bv">'+pc+'%・'+s.n+'問<br>平均'+av+'秒</span></div>';
  });
  h+='<div class="card"><h3>🎯 せいかいりつ</h3>'+(bars||'<p class="note">まだデータがないよ．ミッションをやってみよう！</p>')+'</div>';
  /* answer-time trend (mean per day) */
  var tdays=[];
  for(var tk=20;tk>=0;tk--){var dd=dShift(t,-tk),rec=p.daily[dd];
    if(rec&&rec.n&&rec.ms!=null)tdays.push({d:dd,sec:rec.ms/rec.n/1000});}
  if(tdays.length>=2){
    var W=300,GH=120,pad=24,maxS=0,minS=1e9;
    tdays.forEach(function(o){maxS=Math.max(maxS,o.sec);minS=Math.min(minS,o.sec);});
    if(maxS-minS<0.5)maxS=minS+0.5;
    var pts=tdays.map(function(o,i){
      return {x:pad+(W-2*pad)*(tdays.length<2?0:i/(tdays.length-1)),
        y:pad+(GH-2*pad)*(1-(o.sec-minS)/(maxS-minS))};});
    var poly=pts.map(function(pt){return pt.x.toFixed(1)+","+pt.y.toFixed(1);}).join(" ");
    var dots=pts.map(function(pt){return '<circle cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3" fill="var(--green-d)"/>';}).join("");
    var svg='<svg viewBox="0 0 '+W+' '+GH+'" width="100%" style="max-width:320px">'
      +'<polyline points="'+poly+'" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linejoin="round"/>'+dots
      +'<text x="2" y="14" font-size="10" fill="var(--sub)">'+maxS.toFixed(1)+'秒</text>'
      +'<text x="2" y="'+(GH-6)+'" font-size="10" fill="var(--sub)">'+minS.toFixed(1)+'秒</text></svg>';
    h+='<div class="card"><h3>⏱ かいとう時間の すいい（平均）</h3>'+svg
      +'<p class="note">1問あたりの 平均かいとう時間（みじかいほど 速い）。直近'+tdays.length+'日</p></div>';
  }
  h+=lvTrendSection(p);  /* 📈 カテゴリ別 Lv 推移グラフ */
  var best5="", key, label;
  p.best5=p.best5||{};
  for(key in p.best5){
    label=key.indexOf("mission_")===0?"ミッション":(CATL[key]||key);
    best5+='<div class="row"><span>'+esc(label)+'</span><span class="sp"></span><b>'+fmtSec(p.best5[key])+'</b></div>';
  }
  if(best5)h+='<div class="card"><h3>🏁 5問タイム</h3>'+best5+'<p class="note">5問ぜんぶ正解したときだけ記録されます</p></div>';
  if(p.type==="k5"){
    h+='<div class="card"><h3>✏️ くりあがりメモの かきわすれ</h3>'
      +'<p style="font-size:26px;font-weight:800;margin:4px 0">'+p.carryMiss+' 回</p>'
      +'<p class="note">筆算で，くりあがりを書かずに答え合わせしようとした回数．へっていけばOK！</p></div>';
  }
  if(window.Q4BReward){ ensureColl(p);
    h+='<div class="card"><h3>🏅 しょうごう</h3>'+Q4BReward.rankListHTML(p.coll.total)+'</div>'; }
  h+='</div>';
  render(h);
}

/* ---------- progress ---------- */
function buildProgressSummary(p){
  var parts=[];
  if(p.type==="k5"){
    var hsMx=(p.lv&&p.lv.hissan)||legacyHsToLv(p.hsMax||p.hsLevel||1), hkMx=(p.lv&&p.lv.hikizan)||legacyHsToLv(p.hkMax||p.hkLevel||1);
    parts.push("たし算Lv"+hsMx);
    parts.push("ひき算Lv"+hkMx);
    var kukuN=p.kukuIdx||0;
    parts.push("九九Lv"+((p.lv&&p.lv.kuku)||legacyKukuToLv(p)));
    if(kukuN>=ORDER.length) parts.push("九九ぜんだん");
  }
  var cats=(p.type==="k5")?K5CATS:K10CATS;
  cats.forEach(function(c){
    if(c==="sougou")return;
    var s=p.stats[c]; if(!s||!s.n)return;
    var pc=Math.round(s.ok/s.n*100);
    parts.push(CATL[c]+" "+pc+"%");
  });
  return "けいさん "+(parts.length?parts.join("・"):"はじめたばかり");
}
function updateProgressSummary(p){
  p.progressSummary=buildProgressSummary(p);
}
function showProgress(){
  var p=P(), h='<div class="scr">'+topBar("showHome()");
  var cats=(p.type==="k5")?K5CATS:K10CATS;
  // 総括
  var summary=buildProgressSummary(p);
  h+='<div class="card"><h3>📊 できたこと</h3>'
    +'<p style="font-weight:800;font-size:18px;color:var(--green-d)">'+esc(summary)+'</p></div>';
  // 筆算バー（k5のみ）
  if(p.type==="k5"){
    var hsMx=(p.lv&&p.lv.hissan)||legacyHsToLv(p.hsMax||p.hsLevel||1), hkMx=(p.lv&&p.lv.hikizan)||legacyHsToLv(p.hkMax||p.hkLevel||1);
    function lvBar(lv,run){ if(lv>=10)return 100; return Math.round(((lv-1)*5+Math.max(0,Math.min(5,run||0)))/45*100); }
    h+='<div class="card"><h3>✏️ ひっさんレベル</h3>'
      +'<div class="brow"><span class="bl">たし算</span><span class="bt"><span class="bf" style="width:'+lvBar(hsMx,p.hsRun)+'%"></span></span>'
      +'<span class="bv">Lv'+hsMx+' / 10</span></div>'
      +'<div class="brow"><span class="bl">ひき算</span><span class="bt"><span class="bf" style="width:'+lvBar(hkMx,p.hkRun)+'%"></span></span>'
      +'<span class="bv">Lv'+hkMx+' / 10</span></div>'
      +'<p class="note">ミッション/おまかせ練習で 5問せいかいするごとに Lvアップ！</p></div>';
    // 九九バー
    var kukuN=p.kukuIdx||0, kukuTotal=ORDER.length, kukuHits=p.kukuHits||0;
    /* バーは「マスター段数＋いまの段の進み(hits/8)」で1問ごとに動く */
    var kukuPct=Math.round((kukuN+(kukuN<kukuTotal?Math.min(8,kukuHits)/8:0))/kukuTotal*100);
    h+='<div class="card"><h3>🔢 九九マスター</h3>'
      +'<div class="brow"><span class="bl">マスター段数</span><span class="bt"><span class="bf" style="width:'+kukuPct+'%"></span></span>'
      +'<span class="bv">Lv'+((p.lv&&p.lv.kuku)||legacyKukuToLv(p))+' / 10</span></div>'
      +(kukuN>=kukuTotal?'<p style="font-weight:800;color:var(--amber-d)">🏆 ぜんだんマスター！</p>'
        :'<p class="note">いまの目標：<b>'+ORDER[kukuN]+'の段</b>　ミッションで あと<b>'+Math.max(0,8-kukuHits)+'</b>回せいかいで すすむ（九九チャレンジでも）</p>')
      +'</div>';
  }
  // 各カテゴリせいかいりつバー
  var bars="";
  cats.forEach(function(c){
    if(c==="sougou")return;
    var s=p.stats[c]; if(!s||!s.n)return;
    var pc=Math.round(s.ok/s.n*100);
    bars+='<div class="brow"><span class="bl">'+CATL[c]+'</span><span class="bt"><span class="bf" style="width:'+pc+'%"></span></span>'
      +'<span class="bv">'+pc+'%<br>'+s.n+'問</span></div>';
  });
  h+='<div class="card"><h3>🎯 カテゴリ せいかいりつ</h3>'
    +(bars||'<p class="note">まだデータがないよ。ミッションをやってみよう！</p>')+'</div>';
  h+=lvTrendSection(p);
  if(window.Q4BReward){ ensureColl(p);
    h+='<div class="card"><h3>🏅 しょうごう</h3>'+Q4BReward.rankListHTML(p.coll.total)+'</div>'; }
  h+='</div>';
  render(h);
}

/* ---------- settings ---------- */
function showSettings(){
  var p=P(), h='<div class="scr">'+topBar("showHome()");
  h+='<div class="card"><h3>⚙ せってい（'+esc(p.name)+'）</h3>'
    +'<div class="row"><span>なまえ</span><span class="sp"></span><button class="backbtn" onclick="renameP()">変更</button></div>'
    +'<div class="row"><span>コース</span><span class="sp"></span><span class="note" style="margin-right:8px">'+(p.type==="k5"?"ビギナー":"受験チャレンジ")+'</span><button class="backbtn" onclick="chooseCourse(P())">かえる</button></div>';
  if(p.type==="k5"){
    h+='<div class="row"><span>筆算のとき方</span><span class="sp"></span>'
      +'<button class="backbtn" onclick="toggHissan()">'+(p.hissanInput==="app"?"アプリで1桁ずつ":"紙で解いて答えのみ")+'</button></div>';
  }
  h+='<div class="row"><span>もんだいの読み上げ</span><span class="sp"></span>'
    +'<button class="backbtn" onclick="toggSpeech()">'+(p.speech?"オン":"オフ")+'</button></div></div>';
  h+='<div class="card"><h3>💾 バックアップ（全ハンター分）</h3>'
    +'<p class="note">機種変更やデータ保護用．書き出した文字列を保存しておけば「読み込み」で復元できます．</p>'
    +'<button class="btn sm ghost" onclick="expShow()">書き出す</button>'
    +'<div id="expArea"></div>'
    +'<button class="btn sm ghost" onclick="impShow()">読み込む（復元）</button>'
    +'<div id="impArea"></div></div>';
  h+='<div class="card"><h3>その他</h3>'
    +'<button class="btn sm ghost" onclick="showProfiles()">ハンターを切りかえる</button>'
    +'<button class="btn sm ghost" style="color:var(--red)" onclick="resetAll()">全データを消す</button></div>';
  h+='</div>';
  render(h);
}
function renameP(){var p=P(); var n=prompt("あたらしい なまえ",p.name); if(n&&n.trim()){p.name=n.trim().slice(0,10); save(); showSettings();}}
function toggHissan(){var p=P(); p.hissanInput=(p.hissanInput==="app")?"paper":"app"; save(); showSettings();}
function toggSpeech(){var p=P(); p.speech=!p.speech; save(); showSettings();}
function expShow(){
  $("expArea").innerHTML='<textarea id="expT" readonly>'+esc(JSON.stringify(DB))+'</textarea>'
    +'<div class="grid2"><button class="btn sm ghost" onclick="copyExp()">コピー</button>'
    +'<button class="btn sm ghost" onclick="dlExp()">ファイル保存</button></div>';
}
function copyExp(){
  var t=$("expT"); t.focus(); t.select();
  var done=false;
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t.value); done=true; }
  else{ try{done=document.execCommand("copy");}catch(e){} }
  alert(done?"コピーしました":"うまくコピーできませんでした．長押しで全選択してコピーしてください");
}
function dlExp(){
  var blob=new Blob([JSON.stringify(DB)],{type:"application/json"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="konchu_backup_"+todayStr()+".json"; document.body.appendChild(a); a.click(); a.remove();
}
function impShow(){
  $("impArea").innerHTML='<textarea id="impT" placeholder="ここに書き出した文字列を貼り付け"></textarea>'
    +'<button class="btn sm amber" onclick="doImp()">復元する（いまのデータは上書き）</button>';
}
function doImp(){
  try{
    var d=JSON.parse($("impT").value);
    if(!d||!d.profiles||!Array.isArray(d.profiles)) throw 0;
    DB=d; if(!DB.profiles)DB.profiles=[];
    if(window.QuestSave){ QuestSave.profiles().then(function(reg){ reconcile(reg); saveAll(); alert("復元しました"); showProfiles(); }); }
    else { saveAll(); alert("復元しました"); showProfiles(); }
  }catch(e){alert("読み込めませんでした．文字列を確認してください");}
}
function resetAll(){
  if(confirm("ほんとうに全ハンターのデータを消しますか？元に戻せません")){
    DB={v:1,act:null,profiles:[]}; save(); showProfiles();
  }
}

/* ---------- problem generators ---------- */
var ORDER=[2,5,3,4,6,7,8,9,1];
var Q=null, BUF="", HS=null, FR=null, JLOCK=false, VOICE_REC=null;

function readify(t){return t.replace(/×/g," かける ").replace(/÷/g," わる ").replace(/＋/g," たす ").replace(/−/g," ひく ").replace(/[（）]/g," ")+" は？";}

function carriesOf(a,b){
  var sum=a+b, cols=String(sum).length, need=[], c=0, i;
  for(i=0;i<cols;i++)need.push(0);
  for(i=0;i<cols;i++){
    var s=Math.floor(a/Math.pow(10,i))%10 + Math.floor(b/Math.pow(10,i))%10 + c;
    c=(s>=10)?1:0;
    if(i+1<cols)need[i+1]=c;
  }
  return {cols:cols, need:need};
}
function gHissan(p,lvOv){
  var rawLv=lvOv||((p.lv&&p.lv.hissan)||p.hsLevel||1);
  var lv=hsStageFromLv(rawLv), a=0,b=0,good=false,t=0;
  while(!good&&t<300){ t++;
    if(rawLv>=10){a=ri(1000,9999);b=ri(1000,9999);}      /* Lv10: 4桁＋4桁 */
    else if(lv===1){var a1=ri(2,9),b1=ri(10-a1,9),a2=ri(1,7),b2=ri(1,8-a2); a=a2*10+a1; b=b2*10+b1;}
    else if(lv===2){a=ri(15,99);b=ri(15,99);}
    else if(lv===3){a=ri(100,899);b=ri(15,99);}
    else {a=ri(100,899);b=ri(100,899);}
    if(lv===1){good=true;}
    else{var cs=carriesOf(a,b),any=false,i; for(i=1;i<cs.cols;i++)if(cs.need[i])any=true; good=any;}
  }
  return {cat:"hissan", kind:(p.hissanInput==="app"?"hissan":"num"), a:a, b:b,
    text:a+"＋"+b, say:a+" たす "+b+" は？", ans:a+b};
}
/* くり下がり: 桁iで借りたら桁i+1のメモ(need[i+1])を立てる（たし算のくり上がりと同じセル位置） */
function borrowsOf(a,b){
  var cols=Math.max(String(a).length,String(b).length), need=[], i, br=0;
  for(i=0;i<cols;i++)need.push(0);
  for(i=0;i<cols;i++){
    var top=Math.floor(a/Math.pow(10,i))%10 - br;
    var bot=Math.floor(b/Math.pow(10,i))%10;
    if(top<bot){ br=1; if(i+1<cols)need[i+1]=1; } else { br=0; }
  }
  return {cols:cols, need:need};
}
function gHikizan(p,lvOv){
  var rawLv=lvOv||((p.lv&&p.lv.hikizan)||p.hkLevel||1);
  var lv=hsStageFromLv(rawLv), a=0,b=0,good=false,t=0;
  while(!good&&t<400){ t++;
    if(rawLv>=10){ a=ri(1100,9999); b=ri(1000,a-1); }  /* Lv10: 4桁−4桁 */
    else if(lv===1){ a=ri(11,99); b=ri(1, a%10); }     /* 2桁−1桁・くり下がりなし */
    else if(lv===2){ a=ri(21,99); b=ri(11,a-1); }      /* 2桁−2桁 */
    else if(lv===3){ a=ri(100,899); b=ri(11,99); }     /* 3桁−2桁 */
    else { a=ri(120,999); b=ri(101,a-1); }             /* 3桁−3桁 */
    if(lv===1){ good=(a-b>=0)&&((a%10)>=(b%10)); }
    else{ var bs=borrowsOf(a,b),any=false,i; for(i=1;i<bs.cols;i++)if(bs.need[i])any=true; good=(a>=b)&&any; }
  }
  return {cat:"hikizan", kind:(p.hissanInput==="app"?"hissan":"num"), a:a, b:b,
    text:a+"−"+b, say:a+" ひく "+b+" は？", ans:a-b};
}
function gKuku(p,dan,lv){
  /* Lv1-9 = ORDER の各段に対応（Lv=kukuIdx+1 と整合）、Lv10 = 全段ミックス */
  if(lv==null) lv=legacyKukuToLv(p);
  var d, b=ri(1,9);
  if(dan){ d=dan; }
  else if(lv>=10){ d=ORDER[ri(0,ORDER.length-2)]; }                /* Lv10: 全段ミックス(1の段は除外＝易しすぎ回避) */
  else {
    var idx=Math.min(Math.max(1,lv)-1, ORDER.length-1);
    var target=ORDER[idx], unlocked=ORDER.slice(0, idx+1);          /* そのLvの段を主軸(6割)＋既習段で復習 */
    d=(Math.random()<0.6)?target:pick(unlocked);
  }
  return {cat:"kuku",kind:"num",dan:d,b:b,text:d+"×"+b,say:d+" かける "+b+" は？",ans:d*b};
}
function gAnzan(lv){
  /* Lvに応じて 桁数・演算 を上げる（従来は2桁＋のみで頭打ちだった） */
  if(lv==null) lv=ri(1,10);
  var a,b,c,t,ans;
  if(lv<=2){               /* 2桁＋1〜2桁（繰り上がり） */
    if(Math.random()<0.4){a=ri(12,89);b=ri(4,9);} else {a=ri(12,79);b=ri(10,99-a);}
    t=a+"＋"+b; ans=a+b;
  } else if(lv<=4){        /* 2桁−2桁 / 3桁＋2桁 */
    if(Math.random()<0.5){a=ri(40,99);b=ri(11,a-1);t=a+"−"+b;ans=a-b;}
    else {a=ri(100,400);b=ri(11,99);t=a+"＋"+b;ans=a+b;}
  } else if(lv<=6){        /* 2桁×1桁 / 3桁−3桁 */
    if(Math.random()<0.5){a=ri(11,40);b=ri(3,9);t=a+"×"+b;ans=a*b;}
    else {a=ri(200,800);b=ri(100,a-50);t=a+"−"+b;ans=a-b;}
  } else if(lv<=8){        /* きりのいい× / 割り切れ÷ / 3桁−3桁 */
    var pat=ri(0,2);
    if(pat===0){a=ri(2,9)*10;b=ri(11,29);t=a+"×"+b;ans=a*b;}
    else if(pat===1){b=ri(3,9);c=ri(11,30);a=b*c;t=a+"÷"+b;ans=c;}
    else {a=ri(3,9)*100;b=ri(101,a-50);t=a+"−"+b;ans=a-b;}
  } else {                 /* 2桁×2桁(暗算向き) / 3口の加算 / ×100前後 */
    var pp=ri(0,2);
    if(pp===0){a=ri(11,25);b=ri(11,25);t=a+"×"+b;ans=a*b;}
    else if(pp===1){a=ri(20,90);b=ri(20,90);c=ri(20,90);t=a+"＋"+b+"＋"+c;ans=a+b+c;}
    else {a=ri(11,40);b=ri(95,105);t=a+"×"+b;ans=a*b;}
  }
  return {cat:"anzan",kind:"num",text:t,say:readify(t),ans:ans};
}
function gMix(lv){
  if(lv==null) lv=ri(1,10);
  for(var i=0;i<200;i++){
    var a,b,c,d,t,ans,m,prod;
    if(lv===1){ // a+b×c
      a=ri(10,30);b=ri(2,5);c=ri(2,5);t=a+"＋"+b+"×"+c;ans=a+b*c;
    } else if(lv===2){ // a±b×c
      b=ri(3,6);c=ri(3,6);
      if(Math.random()<0.5){a=ri(20,60);t=a+"＋"+b+"×"+c;ans=a+b*c;}
      else{a=b*c+ri(5,40);t=a+"−"+b+"×"+c;ans=a-b*c;}
    } else if(lv===3){ // (a+b)×c
      a=ri(5,15);b=ri(5,15);c=ri(2,5);t="（"+a+"＋"+b+"）×"+c;ans=(a+b)*c;
    } else if(lv===4){ // (a+b)×c大 / a×b−c
      if(Math.random()<0.5){a=ri(5,15);b=ri(5,15);if(a+b<15)continue;c=ri(3,6);t="（"+a+"＋"+b+"）×"+c;ans=(a+b)*c;}
      else{a=ri(6,12);b=ri(6,12);c=ri(5,a*b-1);t=a+"×"+b+"−"+c;ans=a*b-c;if(ans<0)continue;}
    } else if(lv===5){ // 乗減 / 除加 (積30-80, 除割り切れ)
      if(Math.random()<0.5){a=ri(6,12);b=ri(5,9);prod=a*b;if(prod<30||prod>80)continue;c=ri(5,prod-1);t=a+"×"+b+"−"+c;ans=prod-c;if(ans<0)continue;}
      else{b=ri(3,9);m=ri(4,12);a=b*m;if(a<30||a>80)continue;c=ri(5,40);t=a+"÷"+b+"＋"+c;ans=a/b+c;}
    } else if(lv===6){ // 除加 / 括弧 (積70-100, 除割り切れ, 括弧和20-40)
      if(Math.random()<0.5){b=ri(4,9);m=ri(8,15);a=b*m;if(a<70||a>100)continue;c=ri(5,40);t=a+"÷"+b+"＋"+c;ans=a/b+c;}
      else{a=ri(10,30);b=ri(10,30);if(a+b<20||a+b>40)continue;c=ri(2,5);t="（"+a+"＋"+b+"）×"+c;ans=(a+b)*c;}
    } else if(lv===7){ // (a+b)×c 和20-40 乗数5-8
      a=ri(10,30);b=ri(10,30);if(a+b<20||a+b>40)continue;c=ri(5,8);t="（"+a+"＋"+b+"）×"+c;ans=(a+b)*c;
    } else if(lv===8){ // 2桁乗−減 10-15×8-12
      a=ri(10,15);b=ri(8,12);c=ri(5,a*b-1);t=a+"×"+b+"−"+c;ans=a*b-c;if(ans<0)continue;
    } else if(lv===9){ // (a+b)×c−d 和30-50 乗数5-9 減10-80
      a=ri(15,35);b=ri(15,35);if(a+b<30||a+b>50)continue;c=ri(5,9);d=ri(10,80);ans=(a+b)*c-d;if(ans<0)continue;t="（"+a+"＋"+b+"）×"+c+"−"+d;
    } else { // lv===10 (a+b)×c−d大 / 2桁乗
      if(Math.random()<0.5){a=ri(20,40);b=ri(20,40);if(a+b<40||a+b>60)continue;c=6;d=ri(20,120);ans=(a+b)*c-d;if(ans<0)continue;t="（"+a+"＋"+b+"）×"+c+"−"+d;}
      else{a=ri(12,18);b=ri(9,12);t=a+"×"+b;ans=a*b;}
    }
    return {cat:"mix",kind:"num",text:t,say:readify(t),ans:ans};
  }
  return {cat:"mix",kind:"num",text:"10＋2×3",say:readify("10＋2×3"),ans:16};
}
function gKufuu(lv){
  if(lv==null)lv=ri(1,10);
  var t,ans,hint,n,a,b,c,m,pats,k;
  for(var attempt=0;attempt<200;attempt++){
    if(lv<=2){pats=[1,2];}
    else if(lv<=5){pats=[3,4];}
    else if(lv<=8){pats=[5,4,6];}
    else{pats=[7,8];}
    k=pick(pats);t=null;ans=null;hint=null;
    if(k===1){n=(lv<=1)?ri(7,29):ri(7,49);t=pick(["25×"+n+"×4","4×"+n+"×25",n+"×25×4"]);ans=100*n;hint="25×4＝100 をさきに計算！";}
    else if(k===2){n=(lv<=1)?ri(3,12):ri(3,19);t=pick(["125×"+n+"×8","8×"+n+"×125"]);ans=1000*n;hint="125×8＝1000 をさきに！";}
    else if(k===3){a=(lv<=4)?ri(12,89):ri(20,149);
      if(Math.random()<0.5){t=a+"×99";ans=a*99;hint=a+"×100−"+a+" で計算！";}
      else{t=a+"×101";ans=a*101;hint=a+"×100＋"+a+" で計算！";}}
    else if(k===4){a=(lv<=5)?ri(12,49):ri(12,79);b=ri(11,89);c=100-b;t=a+"×"+b+"＋"+a+"×"+c;ans=a*100;hint=a+"×（"+b+"＋"+c+"）＝"+a+"×100";}
    else if(k===5){m=(lv<=7)?ri(20,200):ri(50,400);t=(m-2)+"＋"+(m-1)+"＋"+m+"＋"+(m+1)+"＋"+(m+2);ans=5*m;hint="まんなかの数 "+m+" ×5！";}
    else if(k===6){a=ri(12,79);
      if(Math.random()<0.5){t=a+"×98";ans=a*98;hint=a+"×100−"+a+"×2 で計算！";}
      else{t=a+"×102";ans=a*102;hint=a+"×100＋"+a+"×2 で計算！";}}
    else if(k===7){a=ri(50,199);
      if(Math.random()<0.5){t="101×"+a;ans=101*a;hint="100×"+a+"＋"+a+" で計算！";}
      else{t="99×"+a;ans=99*a;hint="100×"+a+"−"+a+" で計算！";}}
    else{if(Math.random()<0.5){n=ri(30,99);t=pick(["25×"+n+"×4","4×"+n+"×25"]);ans=100*n;hint="25×4＝100 をさきに計算！";}
      else{a=ri(50,99);b=ri(11,89);c=100-b;t=a+"×"+b+"＋"+a+"×"+c;ans=a*100;hint=a+"×（"+b+"＋"+c+"）＝"+a+"×100";}}
    if(t!=null&&ans!=null&&Number.isInteger(ans)&&ans>=0){
      return {cat:"kufuu",kind:"num",text:t,say:readify(t),ans:ans,hint:hint};
    }
  }
  return {cat:"kufuu",kind:"num",text:"25×8×4",say:readify("25×8×4"),ans:800,hint:"25×4＝100 をさきに計算！"};
}
function gDeci(lv){
  if(lv==null)lv=ri(1,10);
  var x,y,t,ans,kk;
  for(var tr=0;tr<200;tr++){
    if(lv<=2){
      // 加算(1dp)。x,y は 1/10スケール整数
      if(lv===1){ x=ri(1,99); y=ri(1,99); if(x+y>=100)continue; } // a+b<10
      else { x=ri(1,99); y=ri(1,99); if(x+y<100||x+y>180)continue; } // a+b 10-18
      t=fmtDec(x/10)+"＋"+fmtDec(y/10); ans=(x+y)/10; break;
    } else if(lv<=4){
      // 減算(1dp)
      x=ri(11,99); y=ri(1,x-1);
      var xo=x%10, yo=y%10; // 一の位(小数第1位)
      if(lv===3){ if(xo<yo)continue; } // くり下がりなし: 被減数の小数位>=減数
      else { if(xo>=yo)continue; } // くり下がりあり
      t=fmtDec(x/10)+"−"+fmtDec(y/10); ans=(x-y)/10; break;
    } else if(lv<=6){
      // 小数×整数。x は 1/10スケール整数, kk 整数
      kk=ri(2,9); x=ri(11,99);
      var prod=x*kk; // = ans*10
      if(lv===5){ if(prod>=100)continue; } // 結果<10
      else { if(prod<100||prod>=1000)continue; } // 結果10-99
      t=fmtDec(x/10)+"×"+kk; ans=prod/10; break;
    } else if(lv<=8){
      // 小数×小数(2dp)。x,y は 1/10スケール整数。問題文は (x/10)×(y/10)=x*y/100。
      // x*y は整数なので結果は常に小数第2位までで割り切れる(クリーン保証)。
      if(lv===7){ x=ri(11,49); y=ri(11,49); } else { x=ri(51,99); y=ri(51,99); }
      t=fmtDec(x/10)+"×"+fmtDec(y/10); ans=x*y/100; break;
    } else {
      // 小数÷整数(逆算)。答え=x/10, 被除数=x*kk/10, kk整数
      kk=ri(2,9);
      if(lv===9){ x=ri(1,39); } else { x=ri(40,99); }
      var dividend=x*kk; // = 被除数*10
      t=fmtDec(dividend/10)+"÷"+kk; ans=x/10; break;
    }
  }
  return {cat:"deci",kind:"num",dot:true,text:t,say:readify(t),ans:Math.round(ans*100)/100};
}
function frD(n,d){return '<span class="fr"><i>'+n+'</i><i>'+d+'</i></span>';}
function fmtFrac(p,q){
  if(q===1)return ""+p;
  var w=Math.floor(p/q),n=p%q;
  if(n===0)return ""+w;
  return (w? '<span class="mixw">'+w+'</span>':"")+frD(n,q);
}
function gFrac(lv){
  if(lv==null)lv=ri(1,10);
  for(var t=0;t<200;t++){
    var ops;
    if(lv===1)ops=["add"];
    else if(lv<=4)ops=["add","sub"];
    else if(lv===5)ops=["mul"];
    else if(lv===6)ops=["mul","div"];
    else if(lv===7)ops=["add","sub","mul"];
    else ops=["add","sub","mul","div"];
    var op=pick(ops);

    var d1,d2,n1,n2,w1=0,w2=0,mixAllowed=(lv>=9);
    if(lv===1){var d=pick([2,3,4]);d1=d2=d;}
    else if(lv===2){var dd=ri(2,6);d1=d2=dd;}
    else if(lv<=4){d1=ri(2,8);d2=ri(2,8);}
    else if(lv===5||lv===6){d1=ri(2,5);d2=ri(2,5);}
    else if(lv<=9){d1=ri(2,9);d2=ri(2,9);}
    else {d1=ri(3,10);d2=ri(3,10);}

    n1=ri(1,d1-1);n2=ri(1,d2-1);
    if(mixAllowed){w1=ri(0,3);w2=ri(0,3);}

    if(lv===1&&n1+n2>=d1)continue;
    if(lv===2&&op==="add"&&n1+n2>=d1)continue;
    if(lv===2&&op==="sub"&&!(n1>n2))continue;

    var P1=w1*d1+n1,Q1=d1,P2=w2*d2+n2,Q2=d2,p,q,sym,sayop;
    if(op==="add"){p=P1*Q2+P2*Q1;q=Q1*Q2;sym="＋";sayop=" たす ";}
    else if(op==="sub"){
      if(P1*Q2<=P2*Q1)continue;
      p=P1*Q2-P2*Q1;q=Q1*Q2;sym="−";sayop=" ひく ";
    }
    else if(op==="mul"){p=P1*P2;q=Q1*Q2;sym="×";sayop=" かける ";}
    else{p=P1*Q2;q=Q1*P2;sym="÷";sayop=" わる ";}

    if(p===0||q<=0)continue;
    if(lv===3||lv===4){var g0=gcd(p,q);if(p/g0>=q/g0)continue;}

    var g=gcd(p,q),rp=p/g,rq=q/g;
    function frTxt(w,n,d){return w?'<span class="mixw">'+w+'</span>'+frD(n,d):frD(n,d);}
    function frSay(w,n,d){return (w?w+"と":"")+d+"ぶんの"+n;}
    return {cat:"frac",kind:"frac",
      text:frTxt(w1,n1,d1)+" "+sym+" "+frTxt(w2,n2,d2),
      say:frSay(w1,n1,d1)+sayop+frSay(w2,n2,d2)+" は？",
      ans:{p:rp,q:rq}};
  }
}
function gMachi(){
  var pat=ri(1,2), kk=ri(0,2), dl=pick([-3,-2,-1,1,2,3]), lines, expr, fix;
  if(pat===1){
    var a=ri(3,9),b=ri(3,9),c=ri(3,9),d=ri(3,9);
    var v0=a*b; if(kk===0)v0+=dl;
    var v1=c*d; if(kk===1)v1+=dl;
    var v2=v0+v1; if(kk===2)v2+=dl;
    expr=a+"×"+b+"＋"+c+"×"+d;
    lines=["① "+a+"×"+b+"＝"+v0,"② "+c+"×"+d+"＝"+v1,"③ "+v0+"＋"+v1+"＝"+v2];
    fix=(kk===0)?a*b:(kk===1)?c*d:v0+v1;
  }else{
    var a=ri(5,30),b=ri(5,30),c=ri(2,6);
    var v0=a+b; if(kk===0)v0+=dl;
    var v1=v0*c; if(kk===1)v1+=dl;
    var d=ri(5,Math.max(6,v1-1)); if(d>=v1)d=v1-1;
    var v2=v1-d; if(kk===2)v2+=dl;
    expr="（"+a+"＋"+b+"）×"+c+"−"+d;
    lines=["① "+a+"＋"+b+"＝"+v0,"② "+v0+"×"+c+"＝"+v1,"③ "+v1+"−"+d+"＝"+v2];
    fix=(kk===0)?a+b:(kk===1)?v0*c:v1-d;
  }
  return {cat:"machigai",kind:"choice",text:expr,say:null,ans:kk,lines:lines,
    fixmsg:"ほんとうは "+["①","②","③"][kk]+" ＝ "+fix};
}
function gWarizan(lv){
  if(lv==null)lv=ri(1,10);
  var a,b,d,q,dividend,t,ans;
  for(var attempt=0;attempt<200;attempt++){
    t=null;ans=null;
    if(lv<=2){
      // 九九の逆・あまりなし: (a*b)÷a＝b
      a=ri(2,9); b=(lv===1)?ri(2,5):ri(2,9);
      t=(a*b)+"÷"+a; ans=b;
    } else if(lv<=5){
      // 2桁÷1桁(Lv3-4) / 3桁÷1桁(Lv5) あまりなし
      d=ri(2,9);
      if(lv<=4){
        q=ri(2,12); dividend=d*q;
        if(lv===3&&dividend>99)continue;
        t=dividend+"÷"+d; ans=q;
      } else {
        q=ri(13,140); dividend=d*q;
        if(dividend>999)continue;
        if(dividend<100)continue; // 3桁を保つ
        t=dividend+"÷"+d; ans=q;
      }
    } else if(lv<=7){
      // あまりあり・商を答える
      d=ri(2,9);
      dividend=(lv===6)?ri(d+1,99):ri(d+1,300);
      if(dividend%d===0)continue; // あまり>0
      t=dividend+"÷"+d+" のしょう"; ans=Math.floor(dividend/d);
    } else if(lv===8){
      // あまりあり・あまりを答える
      d=ri(2,9);
      dividend=ri(d+1,300);
      if(dividend%d===0)continue;
      t=dividend+"÷"+d+" のあまり"; ans=dividend%d;
    } else {
      // 2桁で割る(除数 11-99) Lv9:あまりなし / Lv10:あまりあり商
      d=ri(11,99);
      if(lv===9){
        q=ri(2,30); dividend=d*q;
        if(dividend>999)continue;
        t=dividend+"÷"+d; ans=q;
      } else {
        q=ri(2,30); dividend=d*q+ri(1,d-1); // あまり 1..d-1 を確保
        if(dividend>999)continue;
        if(dividend%d===0)continue;
        t=dividend+"÷"+d+" のしょう"; ans=Math.floor(dividend/d);
      }
    }
    if(t!=null&&ans!=null&&Number.isInteger(ans)&&ans>0){
      return {cat:"warizan",kind:"num",text:t,say:t.replace("÷"," わる ").replace(" のしょう","").replace(" のあまり",""),ans:ans};
    }
  }
  return {cat:"warizan",kind:"num",text:"6÷2",say:"6 わる 2",ans:3};
}
function gWasa(lv){
  if(lv==null) lv=ri(1,10);
  var NAMES=["たろう","はなこ","ゆうき","さくら","けんた"];
  var ITEMS=["あめ","えんぴつ","シール","けしごむ","ノート"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // おつり1品: M円もって a円のXをかった→おつり
      var M=ri(5,10)*10, a=ri(1,M/10-1)*10;
      ans=M-a;
      if(ans<=0) continue;
      var it=pick(ITEMS);
      t=M+"円もって "+a+"円の"+it+"を かいました。おつりは なん円？";
    }
    else if(lv===2){
      // 合計 or 差
      var a=ri(10,90), b=ri(10,90);
      if(Math.random()<0.5){ ans=a+b; t=a+"円と "+b+"円。あわせて なん円？"; }
      else { ans=Math.abs(a-b); if(ans<=0) continue; t=a+"円と "+b+"円。ちがいは なん円？"; }
    }
    else if(lv===3){
      // おつり2品
      var M=ri(15,30)*10, a=ri(10,90), b=ri(10,90);
      ans=M-(a+b);
      if(ans<=0) continue;
      var i1=pick(ITEMS), i2=pick(ITEMS);
      t=M+"円もって "+a+"円の"+i1+"と "+b+"円の"+i2+"を かいました。おつりは なん円？";
    }
    else if(lv===4||lv===5){
      // 和差算: 大or小を問う（big+small=偶数なので割り切れる）
      var maxv=(lv===4)?40:100;
      var big=ri(10,maxv), small=ri(5,big-1);
      if(small>=big) continue;
      var S=big+small, D=big-small;
      if(D<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      if(Math.random()<0.5){
        ans=big;
        t=n1+"と "+n2+"の あめは あわせて "+S+"こ。ちがいは "+D+"こ。おおいほうは なんこ？";
      } else {
        ans=small;
        t=n1+"と "+n2+"の あめは あわせて "+S+"こ。ちがいは "+D+"こ。すくないほうは なんこ？";
      }
    }
    else if(lv===6){
      // ○個かって△円のこり
      var M=ri(20,50)*10, price=ri(20,80), n=ri(2,5);
      ans=M-price*n;
      if(ans<=0) continue;
      var it=pick(ITEMS);
      t=M+"円もって "+price+"円の"+it+"を "+n+"こ かいました。のこりは なん円？";
    }
    else if(lv===7){
      // 3数の合計 or 2段階おつり
      if(Math.random()<0.5){
        var a=ri(20,90), b=ri(20,90), c=ri(20,90);
        ans=a+b+c;
        t=a+"円と "+b+"円と "+c+"円。あわせて なん円？";
      } else {
        var M=ri(30,60)*10, a=ri(30,90), b=ri(30,90);
        ans=M-a-b;
        if(ans<=0) continue;
        var i1=pick(ITEMS), i2=pick(ITEMS);
        t=M+"円もって "+a+"円の"+i1+"を かい、つぎに "+b+"円の"+i2+"を かいました。のこりは なん円？";
      }
    }
    else if(lv===8){
      // 3者の整理: 基準より多い/少ない→合計
      var n1=pick(NAMES), n2=pick(NAMES), n3=pick(NAMES);
      if(n1===n2||n2===n3||n1===n3) continue;
      var base=ri(10,40), d1=ri(2,15), d2=ri(2,15);
      var v3=base-d2;
      if(v3<=0) continue;
      ans=base+(base+d1)+v3;
      t=n2+"は あめを "+base+"こ もっています。"+n1+"は "+n2+"より "+d1+"こ おおく、"+n3+"は "+n2+"より "+d2+"こ すくないです。3にんで あわせて なんこ？";
    }
    else if(lv===9){
      // 和差算＋おつり複合: 2人合計S差D、おおいほうがused円つかってのこり
      var big=ri(30,120), small=ri(10,big-1);
      if(small>=big) continue;
      var S=big+small, D=big-small;
      if(D<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      var used=ri(5,small-1);
      if(used<=0||used>=small) continue;
      ans=big-used;
      if(ans<=0) continue;
      t=n1+"と "+n2+"の おかねは あわせて "+S+"円、ちがいは "+D+"円。おおいほうが "+used+"円 つかいました。のこりは なん円？";
    }
    else { // lv===10
      // 3者・条件2つ: 合計と1人＋差→残り1人
      var n1=pick(NAMES), n2=pick(NAMES), n3=pick(NAMES);
      if(n1===n2||n2===n3||n1===n3) continue;
      var total=ri(60,150), v1=ri(15,60), d=ri(2,20);
      var v2=v1+d, v3=total-v1-v2;
      if(v3<=0) continue;
      ans=v3;
      t="3にんで あめを あわせて "+total+"こ もっています。"+n1+"は "+v1+"こ、"+n2+"は "+n1+"より "+d+"こ おおいです。"+n3+"は なんこ？";
    }
    break;
  }
  return {cat:"wasa", kind:"num", text:t, say:say, ans:ans};
}
function gJikan(lv){
  function p2(n){return (n<10?"0":"")+n;}
  if(lv==null)lv=ri(1,10);
  for(var i=0;i<200;i++){
    var h,h1,h2,m1,m2,t,ans,say;
    if(lv<=2){ // 同じ時間内の経過 / 次の正時まで
      if(Math.random()<0.5){ // h:m1 -> h:m2 (同じh)
        h=ri(1,9);m1=(lv===1)?ri(0,30):ri(0,50);m2=ri(m1+1,59);
        t=h+"じ"+p2(m1)+"ふんから "+h+"じ"+p2(m2)+"ふんまで なんぷん？";
        ans=m2-m1;say="なんぷん";
      } else { // 次の正時まで
        h=ri(1,9);m1=(lv===1)?ri(10,55):ri(1,59);
        t=h+"じ"+p2(m1)+"ふんから "+(h+1)+"じちょうどまで なんぷん？";
        ans=60-m1;say="なんぷん";
      }
    } else if(lv<=4){ // 時をまたぐ経過 h:m1 -> (h+1):m2
      h=ri(1,9);
      if(lv===3){m1=ri(31,55);m2=ri(1,29);}
      else{m1=ri(20,58);m2=ri(1,55);}
      t=h+"じ"+p2(m1)+"ふんから "+(h+1)+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=(60-m1)+m2;say="なんぷん";
    } else if(lv<=6){ // 任意の2時刻差(分), 数時間以内
      var span=(lv===5)?ri(1,2):ri(2,3);
      h1=ri(1,12-span);m1=ri(0,59);
      h2=h1+span;m2=ri(0,59);
      var tot=(h2*60+m2)-(h1*60+m1);
      if(tot<=0)continue;
      t=h1+"じ"+p2(m1)+"ふんから "+h2+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=tot;say="なんぷん";
    } else if(lv===7){ // ○時間○分は何分？
      var hh=ri(1,3);var mm=ri(1,59);
      t=hh+"じかん"+mm+"ふんは ぜんぶで なんぷん？";
      ans=hh*60+mm;say="なんぷん";
    } else if(lv===8){ // 大きめの時刻差
      h1=ri(1,6);m1=ri(0,59);
      h2=ri(h1+2,11);m2=ri(0,59);
      var tot8=(h2*60+m2)-(h1*60+m1);
      if(tot8<=0)continue;
      t=h1+"じ"+p2(m1)+"ふんから "+h2+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=tot8;say="なんぷん";
    } else if(lv===9){ // またぎ複数時間・繰り上がり
      var hsp=ri(2,4);
      if(Math.random()<0.5){ // 時刻差(借り確定)
        h1=ri(1,12-hsp);m1=ri(20,59);
        h2=h1+hsp;m2=ri(0,m1-1);
        var t9=(h2*60+m2)-(h1*60+m1);
        if(t9<=0)continue;
        t=h1+"じ"+p2(m1)+"ふんから "+h2+"じ"+p2(m2)+"ふんまで なんぷん？";
        ans=t9;say="なんぷん";
      } else { // ○時間○分は何分(大きめ)
        var h9=ri(3,5);var m9=ri(1,59);
        t=h9+"じかん"+m9+"ふんは ぜんぶで なんぷん？";
        ans=h9*60+m9;say="なんぷん";
      }
    } else { // lv===10 複雑な大きい時刻差・繰り上がり
      h1=ri(1,5);m1=ri(15,59);
      h2=ri(h1+3,11);m2=ri(0,m1-1);
      var t10=(h2*60+m2)-(h1*60+m1);
      if(t10<=0)continue;
      t=h1+"じ"+p2(m1)+"ふんから "+h2+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=t10;say="なんぷん";
    }
    if(t!=null&&Number.isInteger(ans)&&ans>0){
      return {cat:"jikan",kind:"num",text:t,say:say,ans:ans};
    }
  }
  return {cat:"jikan",kind:"num",text:"3じ10ぷんから 3じ25ふんまで なんぷん？",say:"なんぷん",ans:15};
}
function gKakebun(lv){
  if(lv==null) lv=ri(1,10);
  if(lv<1) lv=1; if(lv>10) lv=10;
  var cat="kakebun";
  for(var attempt=0; attempt<200; attempt++){
    var r=null;
    if(lv<=2){
      // 単価×個数 / 箱入り×箱数
      var maxP = lv===1 ? 9 : 12;
      var maxN = lv===1 ? 5 : 9;
      if(pick([0,1])===0){
        var item=pick(["りんご","あめ","えんぴつ","シール","クッキー"]);
        var p=ri(2,maxP)*10;          // 単価(10円単位で分かりやすく)
        var n=ri(2,maxN);
        var ans=p*n;
        var t="1こ "+p+"円の "+item+" を "+n+"こ かいます。ぜんぶで いくら？";
        r={cat:cat,kind:"num",text:t,say:null,ans:ans};
      }else{
        var k=ri(2,maxP);             // 1箱の個数
        var m=ri(2,maxN);             // 箱数
        var ans2=k*m;
        var t2="1はこ "+k+"こ入りの おかしが "+m+"はこ あります。ぜんぶで 何こ？";
        r={cat:cat,kind:"num",text:t2,say:null,ans:ans2};
      }
    }else if(lv<=4){
      // 等分(割り切れ)
      var m3 = lv===3 ? ri(2,5) : ri(2,8);
      var per = lv===3 ? ri(2,9) : ri(3,12);
      var N = per*m3;
      var ans3=N/m3;
      var who = lv===3 ? "人" : pick(["人","グループ"]);
      var thing=pick(["あめ","おはじき","カード","くり"]);
      var t3=N+"この "+thing+" を "+m3+who+"で おなじ数ずつ わけます。1"+who+" 何こ？";
      r={cat:cat,kind:"num",text:t3,say:null,ans:ans3};
    }else if(lv<=6){
      // 2段階: 単価×個数+送料 / n個かってM円→おつり
      if(pick([0,1])===0){
        var p5=ri(3, lv===5?9:15)*10;
        var n5=ri(2, lv===5?6:9);
        var sou=ri(2, lv===5?6:12)*50;  // 送料(50円単位)
        var ans5=p5*n5+sou;
        var t5="1こ "+p5+"円の おかしを "+n5+"こ かって、そうりょう "+sou+"円を はらいます。ぜんぶで いくら？";
        r={cat:cat,kind:"num",text:t5,say:null,ans:ans5};
      }else{
        var p6=ri(3, lv===5?9:15)*10;
        var n6=ri(2, lv===5?6:9);
        var cost=p6*n6;
        var pay=(Math.floor(cost/100)+ri(1,5))*100;   // 払う額(おつり>=0)
        var ans6=pay-cost;
        var t6="1こ "+p6+"円の ジュースを "+n6+"こ かって "+pay+"円 だしました。おつりは いくら？";
        r={cat:cat,kind:"num",text:t6,say:null,ans:ans6};
      }
    }else{
      // Lv7-10: ×÷混在・単位あたり・少し複雑
      var sub;
      if(lv<=8) sub=pick([0,1]); else sub=pick([0,1,2]);
      if(sub===0){
        // 1箱k個入りをm箱買い、p人で等分(割り切れ)
        var k7=ri(3, lv<=8?6:9);
        var m7=ri(2, lv<=8?5:8);
        var total=k7*m7;
        // pは totalの約数(2以上, total未満)
        var divs=[]; for(var d=2; d<total; d++){ if(total%d===0) divs.push(d); }
        if(divs.length===0) continue;
        var p7=pick(divs);
        var ans7=total/p7;
        var t7="1はこ "+k7+"こ入りの あめが "+m7+"はこ あります。"+p7+"人で おなじ数ずつ わけると 1人 何こ？";
        r={cat:cat,kind:"num",text:t7,say:null,ans:ans7};
      }else if(sub===1){
        // 単位あたり: a個でb円 → c個でいくら(a|c, 単価整数)
        var unit=ri(lv<=8?2:5, lv<=8?9:20)*10;  // 1個あたりの単価
        var a8=ri(2, lv<=8?5:8);                 // まとめ単位
        var price=unit*a8;                        // a8個でprice円
        var sets=ri(2, lv<=8?5:9);
        var c8=a8*sets;
        var ans8=unit*c8;
        var t8=a8+"こで "+price+"円の えんぴつを "+c8+"こ かうと いくら？";
        r={cat:cat,kind:"num",text:t8,say:null,ans:ans8};
      }else{
        // Lv9-10: 単位あたり×時間 - 消費
        var rate=ri(5,15);            // 1分にrateこ作る
        var min=ri(3,12);
        var made=rate*min;
        var used=ri(2, Math.max(2,Math.floor(made/2)));
        var ans9=made-used;
        var t9="きかいは 1分間に "+rate+"こ おかしを 作ります。"+min+"分間 作って "+used+"こ 食べました。のこりは 何こ？";
        if(ans9<=0) continue;
        r={cat:cat,kind:"num",text:t9,say:null,ans:ans9};
      }
    }
    if(r && Number.isInteger(r.ans) && r.ans>0) return r;
  }
  // フォールバック
  return {cat:cat,kind:"num",text:"1こ 30円の あめを 4こ かいます。ぜんぶで いくら？",say:null,ans:120};
}
function gNoudo(lv){
  if(lv==null)lv=ri(1,10);
  var t="", ans=0;
  for(var iter=0;iter<200;iter++){
    if(lv<=2){
      // 食塩の量: x%の食塩水yg中の食塩は何g？ ans=x*y/100
      var x=ri(5,25);
      var y=ri(1,6)*100;
      if((x*y)%100!==0) continue;
      ans=x*y/100;
      if(ans<=0) continue;
      t=x+"% の食塩水 "+y+"g の中に、食塩は何 g とけている？";
    }
    else if(lv<=4){
      // 濃度を求める: 食塩ag を 水bg にとかす→濃度何%？ ans=100*a/(a+b)
      var a=ri(5,60);
      var b=ri(40,300);
      var denom=a+b;
      if((100*a)%denom!==0) continue;
      ans=100*a/denom;
      if(ans<=0||ans>=100) continue;
      t="食塩 "+a+"g を 水 "+b+"g にとかしました。濃度は何 % ？";
    }
    else if(lv<=6){
      // 加水 or 加塩
      if(Math.random()<0.5){
        // x%の食塩水ag に 水bg を加える→何%？
        var x=ri(5,25), a=ri(1,5)*100, b=ri(1,5)*50;
        if((x*a)%100!==0) continue;
        var salt=x*a/100;
        var denom=a+b;
        if((100*salt)%denom!==0) continue;
        ans=100*salt/denom;
        if(ans<=0||ans>=100) continue;
        t=x+"% の食塩水 "+a+"g に 水 "+b+"g を加えました。濃度は何 % ？";
      } else {
        // x%の食塩水ag に 食塩cg を加える→何%？
        var x=ri(5,25), a=ri(1,5)*100, c=ri(5,60);
        if((x*a)%100!==0) continue;
        var salt=x*a/100;
        var denom=a+c;
        if((100*(salt+c))%denom!==0) continue;
        ans=100*(salt+c)/denom;
        if(ans<=0||ans>=100) continue;
        t=x+"% の食塩水 "+a+"g に 食塩 "+c+"g を加えました。濃度は何 % ？";
      }
    }
    else if(lv<=8){
      // 2液混合: x%ag と y%bg を混ぜる→何%？ ans=(x*a+y*b)/(a+b)
      var x=ri(3,20), y=ri(3,20);
      if(x===y) continue;
      var a=ri(1,5)*100, b=ri(1,5)*100;
      if((x*a)%100!==0 || (y*b)%100!==0) continue;
      var denom=a+b;
      var num=x*a+y*b;
      if(num%denom!==0) continue;
      ans=num/denom;
      if(ans<=0||ans>=100) continue;
      t=x+"% の食塩水 "+a+"g と "+y+"% の食塩水 "+b+"g を混ぜました。濃度は何 % ？";
    }
    else {
      // 蒸発 or 逆算(加水で薄める)
      if(Math.random()<0.5){
        // x%ag から 水bg を蒸発→何%？(食塩不変)
        var x=ri(5,20), a=ri(2,6)*100, b=ri(1,4)*50;
        if(b>=a) continue;
        if((x*a)%100!==0) continue;
        var salt=x*a/100;
        var denom=a-b;
        if(denom<=salt) continue; // 水が残る(濃度<100)
        if((100*salt)%denom!==0) continue;
        ans=100*salt/denom;
        if(ans<=0||ans>=100) continue;
        t=x+"% の食塩水 "+a+"g から 水 "+b+"g を蒸発させました。濃度は何 % ？";
      } else {
        // x%ag を y%にするには 水を何g 加える？
        var x=ri(8,25);
        var y=ri(2,x-1); // 薄めるので y<x
        var a=ri(1,5)*100;
        if((x*a)%100!==0) continue;
        var salt=x*a/100;
        if((salt*100)%y!==0) continue;
        var newMass=salt*100/y;
        ans=newMass-a;
        if(ans<=0) continue;
        t=x+"% の食塩水 "+a+"g を "+y+"% にするには、水を何 g 加えればよい？";
      }
    }
    break;
  }
  // fallback (well-posed)
  if(!t){
    ans=20; t="10% の食塩水 200g の中に、食塩は何 g とけている？";
  }
  return {cat:"noudo",kind:"num",text:t,say:null,ans:ans};
}
function gTabibito(lv){
  if(lv==null) lv=ri(1,10);
  var NAMES=["太郎","花子","ゆうき","さくら","けんた","あきら"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1||lv===2){
      // 出会い算: Dm はなれた2人が向かい合う→何分後に出会う ans=D/(v1+v2)
      var v1=ri(2,12)*(lv===1?5:10);   // m/分
      var v2=ri(2,12)*(lv===1?5:10);
      var minute=ri(2,(lv===1?9:15));
      var sum=v1+v2;
      var D=sum*minute;                // 割り切れるよう逆算
      ans=minute;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      if(ans<=0) continue;
      t=n1+"と "+n2+"が "+D+"m はなれて います。"+n1+"は 分速"+v1+"m、"+n2+"は 分速"+v2+"m で 向かい合って 進みます。何分後に 出会う？";
    }
    else if(lv===3||lv===4){
      // 追いつき算: Dm先を行く人を v1(後)>v2(前) で追う ans=D/(v1-v2)
      var lo=(lv===3?2:4);
      var v2=ri(lo,10)*5;        // 前の人 m/分
      var dv=ri(2,10)*5;         // 速さの差
      var v1=v2+dv;              // 後ろの人(速い)
      var minute=ri(2,(lv===3?9:14));
      var D=dv*minute;          // 逆算で割り切れる
      ans=minute;
      if(ans<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t=n2+"が "+D+"m 先を 分速"+v2+"m で 進んでいます。"+n1+"が 同じ方向に 分速"+v1+"m で 追いかけます。何分後に 追いつく？";
    }
    else if(lv===5){
      // 円周・逆回り→出会い ans=L/(v1+v2)
      var v1=ri(2,12)*5, v2=ri(2,12)*5;
      var minute=ri(2,10);
      var sum=v1+v2;
      var L=sum*minute;
      ans=minute;
      if(ans<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t="まわりが "+L+"m の 池を、"+n1+"と "+n2+"が 同じ場所から 反対向きに 進みます。"+n1+"は 分速"+v1+"m、"+n2+"は 分速"+v2+"m。何分後に はじめて 出会う？";
    }
    else if(lv===6){
      // 円周・同回り→追い越し ans=L/(v1-v2)
      var v2=ri(2,9)*5;
      var dv=ri(2,9)*5;
      var v1=v2+dv;
      var minute=ri(2,10);
      var L=dv*minute;
      ans=minute;
      if(ans<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t="まわりが "+L+"m の 池を、"+n1+"と "+n2+"が 同じ場所から 同じ向きに 進みます。"+n1+"は 分速"+v1+"m、"+n2+"は 分速"+v2+"m。"+n1+"が "+n2+"に はじめて 追いつくのは 何分後？";
    }
    else if(lv===7){
      // 往復: 同じ道Dを行きv1・帰りv2、それぞれ整数分→合計分
      var v1=ri(2,10)*10, v2=ri(2,10)*10;
      var g=gcd(v1,v2);
      var D=v1*v2/g*ri(1,4);   // v1,v2両方で割り切れる距離
      var tt1=D/v1, tt2=D/v2;
      if(tt1!==Math.floor(tt1)||tt2!==Math.floor(tt2)) continue;
      ans=tt1+tt2;
      if(ans<=0) continue;
      var n1=pick(NAMES);
      t=n1+"が 家から "+D+"m 先の 公園へ 行って 帰ります。行きは 分速"+v1+"m、帰りは 分速"+v2+"m。往復で 何分 かかる？";
    }
    else if(lv===8){
      // 出会いまでに進んだ距離を問う = v1×時間
      var v1=ri(3,12)*5, v2=ri(3,12)*5;
      var minute=ri(3,12);
      var sum=v1+v2;
      var D=sum*minute;
      ans=v1*minute;     // n1が出会うまでに進んだ距離
      if(ans<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t=n1+"と "+n2+"が "+D+"m はなれて 向かい合って 進みます。"+n1+"は 分速"+v1+"m、"+n2+"は 分速"+v2+"m。出会うまでに "+n1+"が 進む 道のりは 何m？";
    }
    else if(lv===9){
      // 距離逆算: 速さの和×出会い時間=はじめの距離 ans=(v1+v2)*t
      var v1=ri(4,15)*5, v2=ri(4,15)*5;
      var minute=ri(4,15);
      ans=(v1+v2)*minute;
      if(ans<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t=n1+"は 分速"+v1+"m、"+n2+"は 分速"+v2+"m で 向かい合って 進み、"+minute+"分後に 出会いました。2人は はじめ 何m はなれて いた？";
    }
    else { // lv===10
      // 相手の速さ逆算: D=(v1+v2)*t → v2 = D/t - v1
      var v1=ri(4,15)*5;
      var v2=ri(4,15)*5;
      var minute=ri(4,12);
      var D=(v1+v2)*minute;
      ans=v2;            // 相手の速さ(分速 m)
      if(ans<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t=n1+"と "+n2+"が "+D+"m はなれて 向かい合って 進み、"+minute+"分後に 出会いました。"+n1+"は 分速"+v1+"m です。"+n2+"の 速さは 分速 何m？";
    }
    break;
  }
  return {cat:"tabibito", kind:"num", text:t, say:say, ans:ans};
}
function gHiritsu(lv){
  if(lv==null) lv=ri(1,10);
  var ITEMS=["あめ","シール","えんぴつ","ビー玉","おはじき","カード"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1||lv===2){
      // 比例: 既約の比 a:b。一方が given個 → もう一方は？
      var a=ri(1,(lv===1?5:9)), b=ri(1,(lv===1?5:9));
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,(lv===1?6:9));
      var askA = Math.random()<0.5;       // true: 赤(a側)を与えて青を問う
      var givenVal = askA ? a*k : b*k;
      ans = askA ? b*k : a*k;
      if(ans<=0||givenVal<=0) continue;
      t="赤と青の おはじきの 比は "+a+":"+b+"。"+(askA?"赤":"青")+"が "+givenVal+"個の とき、"+(askA?"青":"赤")+"は なん個？";
    }
    else if(lv===3||lv===4){
      // 比例配分(2): 全部N個を a:b に分ける→おおい/すくない方
      var a=ri(1,(lv===3?4:7)), b=ri(1,(lv===3?4:7));
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,(lv===3?8:12));
      var N=(a+b)*k, partA=a*k, partB=b*k;
      var askBig = Math.random()<0.5;
      var bigPart=Math.max(partA,partB), smallPart=Math.min(partA,partB);
      ans = askBig?bigPart:smallPart;
      if(ans<=0) continue;
      t=pick(ITEMS)+"が ぜんぶで "+N+"個。これを "+a+":"+b+" に分けます。"+(askBig?"おおい":"すくない")+"ほうは なん個？";
    }
    else if(lv===5||lv===6){
      // 比例配分(3): N を a:b:c に分ける→ある1グループ
      var a=ri(1,(lv===5?3:5)), b=ri(1,(lv===5?3:5)), c=ri(1,(lv===5?3:5));
      var k=ri(2,(lv===5?6:9));
      var N=(a+b+c)*k, rs=[a,b,c], which=ri(0,2);
      ans=rs[which]*k;
      if(ans<=0) continue;
      var nm=["1ばんめ","2ばんめ","3ばんめ"][which];
      t=pick(ITEMS)+"が ぜんぶで "+N+"個。これを "+a+":"+b+":"+c+" に分けます。"+nm+"の グループは なん個？";
    }
    else if(lv===7||lv===8){
      // 連比: A:B=a:b1 と B:C=b2:c（共通項B）から A:C を合成して片方を問う
      var a=ri(1,(lv===7?4:6)), b1=ri(2,(lv===7?5:7));
      var b2=ri(2,(lv===7?5:7)), c=ri(1,(lv===7?4:6));
      var ra=a*b2, rc=b1*c;               // 合成 A:C = ra:rc
      var k=ri(2,(lv===7?5:8));
      var askA = Math.random()<0.5;       // true: A側を与えてCを問う
      var givenVal = askA ? ra*k : rc*k;
      ans = askA ? rc*k : ra*k;
      if(ans<=0) continue;
      t="A:B = "+a+":"+b1+"、 B:C = "+b2+":"+c+" です。"+(askA?"A":"C")+"が "+givenVal+"個の とき、"+(askA?"C":"A")+"は なん個？";
    }
    else { // lv 9,10
      var twoStep = (lv===10) && (Math.random()<0.5);
      if(!twoStep){
        // 全体の a/b が given個 → 全体は？（whole を b の倍数にして整数保証）
        var b=ri(2,(lv===9?5:8)), a=ri(1,b-1);
        var whole=b*ri(2,(lv===9?8:12));
        var given=whole*a/b;
        if(!Number.isInteger(given)||given<=0) continue;
        ans=whole;
        t=pick(ITEMS)+"ぜんたいの "+a+"/"+b+"が "+given+"個です。ぜんたいは なん個？";
      } else {
        // 2ステップ: 全体Nのa/bを使った→のこり = N*(b-a)/b
        var b=ri(2,8), a=ri(1,b-1);
        var N=b*ri(3,12);
        ans=N-N*a/b;
        if(!Number.isInteger(ans)||ans<=0) continue;
        t=pick(ITEMS)+"が "+N+"個 あります。ぜんたいの "+a+"/"+b+"を つかいました。のこりは なん個？";
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  return {cat:"hiritsu",kind:"num",text:t,say:say,ans:ans};
}
function gTsurukame(lv){
  if(lv==null) lv=ri(1,10);
  // local gcd (親と重複させない / 現状未使用だが将来の約分用に局所保持)
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=a%b;a=b;b=t;}return a||1;}
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv<=3){
      // 2種(つる/かめ)頭数と足数 → 一方の頭数。lv で数の規模を拡大
      var hi = (lv===1)? ri(4,9) : (lv===2)? ri(6,14) : ri(8,20);   // 頭の合計
      var kame = ri(1, hi-1);                                        // かめの数
      var tsuru = hi - kame;
      var legs = tsuru*2 + kame*4;                                   // 足の合計
      var askKame = Math.random()<0.5;
      ans = askKame ? kame : tsuru;
      if(ans<=0) continue;
      t = "つるとかめが あわせて "+hi+"匹います。足の数は ぜんぶで "+legs+"本です。"
        + (askKame?"かめ":"つる")+"は 何匹いますか。";
    }
    else if(lv<=6){
      // 値段違い2種の個数と合計 → 一方の個数
      var GOODS=[["りんご","みかん"],["シャープペン","えんぴつ"],["ケーキ","プリン"],["ノート","けしゴム"]];
      var pr = pick(GOODS);
      var p1=ri(2,(lv===4?6:9))*10;          // 高い方候補
      var p2=ri(1,(lv===4?5:8))*10;          // 安い方候補
      if(p1===p2) continue;
      if(p1<p2){var tmp=p1;p1=p2;p2=tmp;}    // p1>p2 に整える
      var n  = (lv===4)? ri(4,9) : (lv===5)? ri(6,13) : ri(8,18); // 個数合計
      var n1 = ri(1, n-1);                   // p1(高い)の個数
      var n2 = n - n1;
      var total = p1*n1 + p2*n2;
      var askHigh = Math.random()<0.5;
      ans = askHigh ? n1 : n2;
      if(ans<=0) continue;
      t = "1個 "+p1+"円の "+pr[0]+"と 1個 "+p2+"円の "+pr[1]+"を あわせて "+n+"個 買ったら "
        + "代金は "+total+"円でした。"+(askHigh?pr[0]:pr[1])+"は 何個 買いましたか。";
    }
    else if(lv<=8){
      // 面積図/差の応用
      if(lv===7){
        // 得点つるかめ: 正解+plus / 不正解-minus、全体得点との差から正解数を逆算
        var q = ri(8,15);                    // 問題数
        var plus = ri(3,6), minus = ri(1,3); // 正解+plus, 不正解-minus
        var correct = ri(1, q-1);            // 正解数
        var wrong = q - correct;
        var score = correct*plus - wrong*minus;
        ans = correct;
        if(ans<=0) continue;
        t = "全部で "+q+"問の テストが あります。正解すると "+plus+"点もらえ、"
          + "まちがえると "+minus+"点 ひかれます。"+q+"問 答えて 得点は "+score+"点でした。"
          + "正解は 何問でしたか。";
      } else {
        // lv8: 過不足算(差の応用)。a個ずつだと余り、b個ずつだと余り/不足 → 全体個数
        var ppl = ri(4,9);                   // 人数
        var a = ri(3,6), b = a + ri(1,3);    // a<b 個ずつ配る2案
        var surplus = ri(1, a*2);            // a個ずつ配ると余る数
        var totalItems = a*ppl + surplus;    // 全体個数
        var diff = totalItems - b*ppl;       // b個ずつ: diff>=0余り / <0不足
        ans = totalItems;
        if(ans<=0) continue;
        var phrase = (diff>=0)? (b+"個ずつ配ると "+diff+"個 余ります")
                              : (b+"個ずつ配ると "+(-diff)+"個 足りません");
        t = "おかしを 子ども "+ppl+"人に 配ります。"+a+"個ずつ配ると "+surplus+"個 余り、"
          + phrase+"。おかしは 全部で 何個 ありますか。";
      }
    }
    else {
      // lv9,10: 3種 / 「○○多い」条件付き
      if(lv===9){
        // 3種つるかめ: クモ(8本)・カブト(6本)・つる(2本)。差の条件で一意化
        var head = ri(8,16);
        var spider = ri(2, Math.floor(head/2));      // クモ(8本足)
        var beetle = ri(1, head-spider-1);           // カブト(6本足)
        var crane  = head - spider - beetle;         // つる(2本足)
        if(crane<=0) continue;
        var legs = spider*8 + beetle*6 + crane*2;
        var d = spider - beetle;
        if(d===0) continue;                          // 差0は条件文が成立しない
        var moreStr = (d>0)? ("クモは カブトより "+d+"匹 多く")
                           : ("カブトは クモより "+(-d)+"匹 多く");
        ans = crane;  // つるの数を問う(頭数・足数・差の3条件で一意)
        t = "クモ(足8本)、カブトムシ(足6本)、つる(足2本)が あわせて "+head+"匹 います。"
          + moreStr+"、足の数は ぜんぶで "+legs+"本です。つるは 何匹 いますか。";
      } else {
        // lv10: 「一方が他方より○個多い」条件付き値段つるかめ
        var P1=ri(3,8)*10, P2=ri(1,P1/10-1)*10;     // P1>P2
        if(P2<=0) continue;
        var n1=ri(3,10), more=ri(1,5);
        var n2=n1+more;                              // 安い方が more 個多い
        var total=P1*n1 + P2*n2;
        ans = n1;                                    // 高い方の個数を問う
        if(ans<=0) continue;
        t = "1個 "+P1+"円の ペンと 1個 "+P2+"円の けしゴムを 買います。"
          + "けしゴムは ペンより "+more+"個 多く 買い、代金は ぜんぶで "+total+"円でした。"
          + "ペンは 何個 買いましたか。";
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  return {cat:"tsurukame", kind:"num", text:t, say:null, ans:ans};
}
function gKabusoku(lv){
  if(lv==null) lv=ri(1,10);
  var ITEMS=["あめ","えんぴつ","シール","おりがみ","ビー玉","クッキー"];
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv>=1 && lv<=3){
      // 1人per個ずつ配ると extra あまる / short たりない → 人数
      var per=ri(2,(lv===1?4:6));
      var people=ri(4,(lv===1?8:12));
      var item=pick(ITEMS);
      if(lv===1 || (lv===2 && ri(0,1)===0)){
        // あまる: total = per*people + extra
        var extra=ri(1,per-1>=1?per-1:1);
        var total=per*people+extra;
        ans=people;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        t=item+"を 1人に "+per+"個ずつ 配ると "+extra+"個 あまります。"+item+"は ぜんぶで "+total+"個 あります。子どもは 何人？";
      } else {
        // たりない: total = per*people - shortage
        var shortage=ri(1,per-1>=1?per-1:1);
        var total=per*people-shortage;
        ans=people;
        if(total<=0) continue;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        t=item+"を 1人に "+per+"個ずつ 配るには "+shortage+"個 たりません。"+item+"は ぜんぶで "+total+"個 あります。子どもは 何人？";
      }
    }
    else if(lv>=4 && lv<=6){
      // 両方過不足: 少なく配ると余り / 多く配ると不足 → 人数
      // (perB-perA)*people = remA + shortB  (perB>perA)
      var perA=ri(2,5);
      var perB=perA+ri(1,(lv===6?4:3));
      var people=ri(4,(lv===4?8:14));
      var item=pick(ITEMS);
      var diff=perB-perA;
      var totalDiff=diff*people;
      // 余り remA を 1..totalDiff-1 から、shortB を残りに
      if(totalDiff<2) continue;
      var remA=ri(1,totalDiff-1);
      var shortB=totalDiff-remA;
      if(shortB<=0) continue;
      var total=perA*people+remA; // 検算: =perB*people - shortB
      if(perB*people-shortB!==total) continue;
      ans=people;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=item+"を 1人に "+perA+"個ずつ 配ると "+remA+"個 あまり、1人に "+perB+"個ずつ 配るには "+shortB+"個 たりません。子どもは 何人？";
    }
    else if(lv>=7 && lv<=8){
      // 差集め算: 2通りの配り方の合計差から人数。
      // 1個price円、1人perA個 と perB個 買うと 代金の差 = (perB-perA)*price*people
      var price=ri(2,(lv===7?8:12))*10;
      var perA=ri(1,3);
      var perB=perA+ri(1,(lv===8?4:2));
      var people=ri(3,(lv===7?9:15));
      var item2=pick(["みかん","りんご","ジュース","パン","ノート"]);
      var gap=(perB-perA)*price*people;
      ans=people;
      if(gap<=0||ans<=0||ans!==Math.floor(ans)) continue;
      t="1個 "+price+"円の "+item2+"を、子ども 1人に "+perA+"個ずつ 買うときと "+perB+"個ずつ 買うときでは、代金の合計が "+gap+"円 ちがいます。子どもは 何人？";
    }
    else { // lv 9-10: 長椅子/部屋割り型
      // 1脚perA人ずつ座ると leftPeople人すわれない、perB人ずつ座ると emptyseats人分あく → 椅子の数
      var perA=ri(3,5);
      var perB=perA+ri(1,(lv===10?3:2));
      var benches=ri(4,(lv===9?9:14));
      var leftPeople=ri(1,perA*2);      // perAで座ると座れない人
      var P=perA*benches+leftPeople;    // 総人数
      var emptyseats=perB*benches-P;    // perBで座ったときの空席
      if(emptyseats<1) continue;        // 1席以上あく(自然な文)
      if(emptyseats>=perB) continue;    // 最後の椅子が丸ごと空く以上はNG(well-posed)
      ans=benches;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      if(lv===9){
        t="長椅子に 1脚 "+perA+"人ずつ すわると "+leftPeople+"人 すわれません。1脚 "+perB+"人ずつ すわると ちょうど 全員 すわれて "+emptyseats+"人分 あきます。長椅子は 何脚？";
      } else {
        var item3=pick(["子ども","生徒","お客さん"]);
        t=item3+"を 部屋に 1部屋 "+perA+"人ずつ 入れると "+leftPeople+"人 入れません。1部屋 "+perB+"人ずつ 入れると "+emptyseats+"人分 あきます。部屋は いくつ？";
      }
    }
    break;
  }
  return {cat:"kabusoku", kind:"num", text:t, say:null, ans:ans};
}
function gHeikin(lv){
  if(lv==null) lv=ri(1,10);
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv<=3){
      // 数個の平均。Lv1:3個/小, Lv2:4個, Lv3:5個（個数増で質的に難化）
      var n=(lv===1)?3:(lv===2)?4:5;
      var hi=(lv===1)?30:(lv===2)?50:100;
      var avg=ri(2,hi);            // 先に平均を決め、合計=avg*n を整数値に分配
      var vals=[], rem=avg*n, ok=true;
      for(var k=0;k<n-1;k++){
        var up=rem-(n-1-k);        // 残り要素に最低1ずつ残す
        if(up<1){ok=false;break;}
        var v=ri(1, Math.min(up, hi*2));
        vals.push(v); rem-=v;
      }
      if(!ok||rem<1) continue;
      vals.push(rem);
      var s2=0; for(var z=0;z<vals.length;z++) s2+=vals[z];
      if(s2%n!==0) continue;
      ans=s2/n;
      if(ans<=0) continue;
      t=vals.join("、")+" の平均はいくつ？";
    }
    else if(lv<=6){
      // 平均から合計（Lv4）、または欠けた1つを逆算（Lv5/6）
      if(lv===4){
        var n=ri(3,5), avg=ri(5,100);
        ans=avg*n;
        if(ans<=0) continue;
        t=n+"教科の平均点は "+avg+"点。合計点は何点？";
      } else {
        var n=(lv===5)?ri(3,4):ri(4,6);          // Lv6は教科数を増やし質的に難化
        var avg=ri(5,(lv===5)?80:100);
        var total=avg*n;
        var known=[], ksum=0, ok=true;
        for(var k=0;k<n-1;k++){
          var maxk=Math.min(avg*2, total-ksum-(n-1-k)); // 欠け含む残りに最低1
          if(maxk<1){ok=false;break;}
          var v=ri(1,maxk);
          known.push(v); ksum+=v;
        }
        if(!ok) continue;
        ans=total-ksum;
        if(ans<=0) continue;
        t=n+"教科の平均点は "+avg+"点。"+(n-1)+"教科は "+known.join("、")+"点。残りの教科は何点？";
      }
    }
    else if(lv<=8){
      // 2グループの平均合成
      if(lv===7){
        // 人数の異なる2群を合成（全体平均）
        var nA=ri(2,6), nB=ri(2,6);
        var avgA=ri(4,40), avgB=ri(4,40);
        var totalN=nA+nB, totalSum=nA*avgA+nB*avgB;
        if(totalSum%totalN!==0) continue;
        ans=totalSum/totalN;
        if(ans<=0) continue;
        t=nA+"人の平均は "+avgA+"点、別の "+nB+"人の平均は "+avgB+"点。全員の平均は何点？";
      } else {
        // 全体平均＋一方の群から他方の群の平均を逆算（質的に難）
        var nA=ri(2,5), nB=ri(2,5);
        var totalN=nA+nB;
        var allAvg=ri(10,60), avgA=ri(5,80);
        var sumB=allAvg*totalN - avgA*nA;
        if(sumB<=0) continue;
        if(sumB%nB!==0) continue;
        ans=sumB/nB;
        if(ans<=0) continue;
        t="全員 "+totalN+"人の平均は "+allAvg+"点。そのうち "+nA+"人の平均は "+avgA+"点。のこり "+nB+"人の平均は何点？";
      }
    }
    else {
      // Lv9-10: 平均を上げるのに必要な点数
      if(lv===9){
        // これまでn回の平均がcur。次の1回で全体平均をtargetにするには何点？
        var n=ri(2,4), cur=ri(40,75), target=ri(cur+1, cur+15);
        ans=target*(n+1) - cur*n;          // 次の1回の点数
        if(ans<=0||ans>100) continue;       // 満点100で現実的に
        t="これまで "+n+"回のテストの平均は "+cur+"点。次のテストで全体の平均を "+target+"点にするには、何点とればよい？";
      } else {
        // Lv10: あとnExtra回すべて同じ点で平均をtargetに。1回あたり何点？
        var n=ri(2,4), cur=ri(40,70), nExtra=ri(2,3);
        var target=ri(cur+1, cur+12);
        var extraSum=target*(n+nExtra) - cur*n;
        if(extraSum<=0) continue;
        if(extraSum%nExtra!==0) continue;
        ans=extraSum/nExtra;                // 各回の点数
        if(ans<=0||ans>100) continue;
        t="これまで "+n+"回の平均は "+cur+"点。あと "+nExtra+"回 すべて同じ点をとって、全体の平均を "+target+"点にしたい。1回あたり何点必要？";
      }
    }
    break;
  }
  return {cat:"heikin", kind:"num", text:t, say:say, ans:ans};
}
function gSoneki(lv){
  if(lv==null) lv=ri(1,10);
  var t="", ans=0;
  for(var iter=0;iter<200;iter++){
    if(lv<=3){
      var cost=ri(2,30)*100;
      var profit=ri(1,20)*100;
      if(Math.random()<0.5){
        ans=cost+profit;
        t="原価 "+cost+"円 の品物に "+profit+"円 の利益を見こんで定価をつけました。定価は何円？";
      } else {
        var price=cost+profit;
        ans=price-cost;
        if(ans<=0) continue;
        t="原価 "+cost+"円 の品物を "+price+"円 で売りました。利益は何円？";
      }
    }
    else if(lv<=6){
      var price=ri(5,30)*100;
      var d=ri(1,5);
      var disc=price*d/10;
      if(disc%1!==0) continue;
      ans=price-disc;
      if(ans<=0) continue;
      t="定価 "+price+"円 の品物を "+d+"割引きで売りました。売値は何円？";
    }
    else if(lv<=8){
      var cost=ri(3,40)*100;
      var r=ri(1,5)*10;
      var profit=cost*r/100;
      if(profit%1!==0) continue;
      if(Math.random()<0.5){
        ans=cost+profit;
        t="原価 "+cost+"円 の品物に "+r+"% の利益を見こんで定価をつけました。定価は何円？";
      } else {
        ans=cost;
        t=r+"% の利益を見こんだら、利益が "+profit+"円 になりました。原価は何円？";
      }
    }
    else {
      if(Math.random()<0.5){
        var cost=ri(5,30)*100;
        var mark=ri(2,6)*10;
        var price=cost+cost*mark/100;
        if(price%1!==0) continue;
        var d=ri(1,3);
        var disc=price*d/10;
        if(disc%1!==0) continue;
        var sell=price-disc;
        ans=sell-cost;
        if(ans<=0) continue;
        t="原価 "+cost+"円 の品物に "+mark+"% の利益を見こんで定価をつけ、その定価の "+d+"割引きで売りました。利益は何円？";
      } else {
        var price=ri(6,30)*100;
        var d=ri(1,5);
        var disc=price*d/10;
        if(disc%1!==0) continue;
        var sell=price-disc;
        if(sell<=0) continue;
        ans=price;
        t=d+"割引きで売ったら 売値が "+sell+"円 になりました。定価は何円？";
      }
    }
    if(ans>0 && ans%1===0) break;
  }
  if(!t){ ans=1500; t="原価 1000円 の品物に 500円 の利益を見こんで定価をつけました。定価は何円？"; }
  return {cat:"soneki",kind:"num",text:t,say:null,ans:ans};
}
function gShigoto(lv){
  if(lv==null) lv=ri(1,10);
  function gcdL(x,y){x=Math.abs(x);y=Math.abs(y);while(y){var t=y;y=x%y;x=t;}return x;}
  function lcmL(x,y){return x/gcdL(x,y)*y;}
  var NAMES=["けんた","ゆうこ","たくみ","さくら","まなぶ","あおい"];
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv>=1 && lv<=3){
      // 1人/1台の仕事量×時間。3パターンを質的に分ける
      var sub = (lv===1)?0 : (lv===2)? ri(0,1) : ri(0,2);
      if(sub===0){
        // total = rate × time（積を問う）
        var rate=ri(2,(lv===1?6:9)), time=ri(2,(lv===1?6:9));
        ans=rate*time;
        if(ans<=0) continue;
        t="1日に "+rate+"個 作る 人が、"+time+"日 はたらきます。ぜんぶで 何個 作れる？";
      } else if(sub===1){
        // time = total ÷ rate（割り切れる）
        var rate=ri(2,9), time=ri(2,9), total=rate*time;
        ans=time;
        if(ans<=0) continue;
        t="ぜんぶで "+total+"個の 仕事を、1日に "+rate+"個 すると 何日で 終わる？";
      } else {
        // rate = total ÷ time（割り切れる）
        var rate=ri(2,9), time=ri(2,9), total=rate*time;
        ans=rate;
        if(ans<=0) continue;
        t=total+"個の 仕事を "+time+"日で 終わらせるには、1日に 何個 すれば よい？";
      }
    }
    else if(lv>=4 && lv<=6){
      // 全体仕事を最小公倍数で置き、複数人で何日。答えから逆算して整数を保証
      var threePeople = (lv===6) && (Math.random()<0.5);
      if(!threePeople){
        // いっしょの日数 c を先に決め、da を選び db=da*c/(da-c)（整数のみ）
        var c=ri(2,(lv===4?5:8));
        var da=ri(c+1,(lv===4?12:20));
        if(da<=c) continue;
        var db=da*c/(da-c);
        if(!Number.isInteger(db)||db<=0||db===da) continue;
        ans=c;
        var n1=pick(NAMES), n2=pick(NAMES);
        if(n1===n2) continue;
        t="ある 仕事を "+n1+"は "+da+"日、"+n2+"は "+db+"日で 終わります。2人 いっしょに すると 何日で 終わる？";
      } else {
        // 全体W=最小公倍数を選び、3人の1日仕事量(W約数)を割り当て、合計がW割り切れを確認
        var W=lcmL(lcmL(ri(2,6),ri(2,6)),ri(2,6))*ri(1,3);
        var ds=[];
        for(var q=2;q<=W;q++){ if(W%q===0) ds.push(q); } // W割り切れる日数(=1日量整数)
        if(ds.length<3) continue;
        var da=pick(ds), db=pick(ds), dc=pick(ds);
        if(da===db||db===dc||da===dc) continue;
        var sum=W/da+W/db+W/dc;
        if(W%sum!==0) continue;
        ans=W/sum;
        if(ans<=0) continue;
        t="ある 仕事を A は "+da+"日、B は "+db+"日、C は "+dc+"日で 終わります。3人 いっしょに すると 何日で 終わる？";
      }
    }
    else if(lv===7 || lv===8){
      // 途中から人数変化
      var sub2 = (lv===7)?0 : ri(0,1);
      if(sub2===0){
        // 1人でd日かかる仕事。x日はたらいた後、もう1人加わって残りを2人で。残り日数を問う
        var d=ri(4,(lv===7?10:14));
        var W=d;                       // 1人の1日分=1, 全体=d
        var x=ri(1,d-2);               // 最初の単独日数
        var rest=W-x;                  // 残り仕事（1人×x日ぶん）
        ans=rest/2;                    // 2人で
        if(!Number.isInteger(ans)||ans<=0) continue;
        t="1人で すると "+d+"日 かかる 仕事を、はじめ 1人で "+x+"日 やりました。のこりを 2人で すると、あと 何日で 終わる？";
      } else {
        // 全体W=lcm(da,db)。最初2人でx日→残りを A1人で。rest が rA で割り切れる x のみ採用
        var da=ri(2,10), db=ri(2,10);
        if(da===db) continue;
        var W=lcmL(da,db);
        var rA=W/da, rB=W/db;
        var full=Math.floor(W/(rA+rB));   // 2人で全部終わるまでの目安
        if(full<2) continue;
        var cand=[];
        for(var xx=1; xx<full; xx++){
          var rest0=W-(rA+rB)*xx;
          if(rest0>0 && rest0%rA===0) cand.push(xx);
        }
        if(cand.length===0) continue;
        var x=pick(cand);
        var rest=W-(rA+rB)*x;
        ans=rest/rA;
        if(!Number.isInteger(ans)||ans<=0) continue;
        t="ある 仕事を A は "+da+"日、B は "+db+"日で 終わります。はじめ 2人で "+x+"日 やった あと、A 1人で つづけます。あと 何日で 終わる？";
      }
    }
    else { // lv 9,10: のべ / 水そう注水
      var tank = (Math.random()<0.5);
      if(!tank){
        // のべ人日: p人でd日 → 全体= p*d 人日。p2人だと何日（割り切れ）
        var p=ri(2,(lv===9?6:9)), d=ri(2,(lv===9?8:12));
        var total=p*d;                 // 人日
        var divs=[];
        for(var q=2;q<=total;q++){ if(total%q===0 && q!==p) divs.push(q); }
        if(divs.length===0) continue;
        var p2=pick(divs);
        ans=total/p2;
        if(!Number.isInteger(ans)||ans<=0) continue;
        t=p+"人で すると "+d+"日 かかる 仕事が あります。同じ 仕事を "+p2+"人で すると 何日で 終わる？";
      } else {
        // 水そう注水: 容量Vを 入る量inで → 時間（割り切れ）。lv10は排水も
        var drain = (lv===10) && (Math.random()<0.5);
        if(!drain){
          var inR=ri(2,9), time=ri(2,(lv===9?8:12)), V=inR*time;
          ans=time;
          if(ans<=0) continue;
          t="からの 水そうに 1分間に "+inR+"L 入れます。水そうの ようりょうは "+V+"L です。いっぱいに なるのは 何分後？";
        } else {
          var inR=ri(4,12), outR=ri(1,inR-1), net=inR-outR;
          var time=ri(2,10), V=net*time;
          ans=time;
          if(net<=0||V<=0) continue;
          t="水そうに 1分間に "+inR+"L 入れながら、1分間に "+outR+"L ぬきます。ようりょう "+V+"L の 水そうが いっぱいに なるのは 何分後？";
        }
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  return {cat:"shigoto", kind:"num", text:t, say:null, ans:ans};
}
function gNenrei(lv){
  if(lv==null) lv=ri(1,10);
  var NAMES=["太郎","花子","ゆうき","さくら","けんた","あきら"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1||lv===2||lv===3){
      // 何年後/前の年齢: 単純加減
      var c=pick(NAMES);
      var now=(lv===1?ri(6,12):ri(8,40));
      var y=(lv===1?ri(1,5):ri(2,15));
      if(lv===3){
        // 何年前(過去) ans=now-y、正に保つ
        if(now-y<1) continue;
        ans=now-y;
        t=c+"は 今 "+now+"歳です。"+y+"年前は 何歳でしたか？";
      } else {
        ans=now+y;
        t=c+"は 今 "+now+"歳です。"+y+"年後は 何歳になりますか？";
      }
    }
    else if(lv===4||lv===5||lv===6){
      // 親子の年齢 和・差・和差算
      var oya=ri(30,45), ko=ri(6,14);
      if(oya<=ko) continue;
      if(lv===4){
        // 和
        ans=oya+ko;
        t="お父さんは "+oya+"歳、子どもは "+ko+"歳です。年齢の 和は 何歳ですか？";
      } else if(lv===5){
        // 差
        ans=oya-ko;
        t="お父さんは "+oya+"歳、子どもは "+ko+"歳です。年齢の 差は 何歳ですか？";
      } else {
        // 和差算: 和と差から子を求める ans=(sum-dif)/2
        var sum=oya+ko, dif=oya-ko;
        if((sum-dif)%2!==0) continue;
        ans=(sum-dif)/2;
        if(ans<1) continue;
        t="お父さんと 子どもの 年齢の 和は "+sum+"歳、差は "+dif+"歳です。子どもは 何歳ですか？";
      }
    }
    else if(lv===7||lv===8){
      // □年後にN倍: oya+x = N*(ko+x) を逆算で構成、ans=x
      var N=(lv===7?ri(2,3):ri(2,4));
      var ko=ri(4,12);
      var x=ri(1,12);
      var oya=N*(ko+x)-x;   // 逆算で必ず整数・割り切れる
      if(oya<=ko) continue;
      if(oya>80) continue;
      ans=x;
      t="今 お父さんは "+oya+"歳、子どもは "+ko+"歳です。お父さんの 年齢が 子どもの "+N+"倍に なるのは 何年後ですか？";
    }
    else { // lv===9||lv===10
      // 倍の関係から現在年齢を逆算
      var N=(lv===9?ri(2,4):ri(3,5));
      var ko=ri(5,15);
      var oya=N*ko;   // 今ちょうどN倍
      if(oya>90) continue;
      if(lv===9){
        // 和とN倍から子を求める: ko=sum/(N+1)
        var sum=oya+ko;
        ans=ko;
        t="お父さんの 年齢は 子どもの "+N+"倍で、年齢の 和は "+sum+"歳です。子どもは 何歳ですか？";
      } else {
        // 差とN倍から親を求める: dif=(N-1)*ko, oya=N*ko
        var dif=oya-ko;
        ans=oya;
        t="お父さんの 年齢は 子どもの "+N+"倍で、年齢の 差は "+dif+"歳です。お父さんは 何歳ですか？";
      }
    }
    if(ans>0 && ans===Math.floor(ans)) break;
  }
  return {cat:"nenrei", kind:"num", text:t, say:null, ans:ans};
}
function gUeki(lv){
  if(lv==null) lv=ri(1,10);
  var TREE=["木","はた","電柱","くい","花","旗"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv<=3){
      // 両端あり: 本数 = 長さ÷間隔 + 1
      var gap=pick(lv===1?[2,5,10]:lv===2?[3,4,5,6]:[4,6,8,12]);
      var n=ri((lv===1?2:lv===2?3:4),(lv===1?8:lv===2?12:18)); // 間の数
      var L=gap*n;
      var obj=pick(TREE);
      ans=n+1;
      if(ans<=0) continue;
      t="まっすぐな 道に そって、長さ "+L+"m の あいだに "+gap+"m おきに "+obj+"を 立てます。両はしにも 立てるとき、"+obj+"は 何本 いる？";
    }
    else if(lv<=5){
      // 両端なし: 本数 = 長さ÷間隔 - 1
      var gap=pick(lv===4?[2,4,5]:[3,5,6,8]);
      var n=ri((lv===4?3:4),(lv===4?12:18));
      var L=gap*n;
      var obj=pick(TREE);
      ans=n-1;
      if(ans<=0) continue;
      t="ビルと ビルの あいだ、長さ "+L+"m に "+gap+"m おきに "+obj+"を 立てます。両はしには 立てないとき、"+obj+"は 何本 いる？";
    }
    else if(lv<=7){
      // 円周: 本数 = 一周÷間隔
      var gap=pick(lv===6?[2,5,10]:[4,6,8,12]);
      var n=ri((lv===6?4:5),(lv===6?15:20));
      var L=gap*n;
      var obj=pick(TREE);
      ans=n;
      if(ans<=0) continue;
      t="まわりが "+L+"m の 池の まわりに、"+gap+"m おきに "+obj+"を 立てます。"+obj+"は 何本 いる？";
    }
    else if(lv===8){
      // 間隔の逆算(両端あり): 間隔 = 長さ÷(本数-1)
      var gap=pick([2,3,4,5,6,8,10]);
      var n=ri(3,15);
      var L=gap*n;
      var count=n+1;
      var obj=pick(TREE);
      ans=gap;
      if(ans<=0) continue;
      t="まっすぐな 道に "+obj+"を "+count+"本、両はしも ふくめて 同じ あいだで 立てたら、ぜんたいの 長さは "+L+"m でした。"+obj+"と "+obj+"の あいだは 何m？";
    }
    else if(lv===9){
      // 長さの逆算(両端あり): 長さ = (本数-1)×間隔
      var gap=pick([2,3,4,5,6,8,10]);
      var n=ri(4,18);
      var count=n+1;
      var obj=pick(TREE);
      ans=gap*n;
      if(ans<=0) continue;
      t="まっすぐな 道に "+obj+"を "+count+"本、両はしも ふくめて "+gap+"m おきに 立てます。さいしょの "+obj+"から さいごの "+obj+"まで 何m？";
    }
    else { // lv===10
      // 道の両側(両端あり): 片側(長さ÷間隔+1)×2
      var gap=pick([2,4,5,6,8,10]);
      var n=ri(4,18);
      var L=gap*n;
      var perSide=n+1;
      var obj=pick(TREE);
      ans=perSide*2;
      if(ans<=0) continue;
      t="まっすぐな 道(長さ "+L+"m)の 両がわに、"+gap+"m おきに "+obj+"を 立てます。両はしにも 立てるとき、"+obj+"は ぜんぶで 何本 いる？";
    }
    break;
  }
  return {cat:"ueki", kind:"num", text:t, say:say, ans:ans};
}
function gRyuusui(lv){
  if(lv==null) lv=ri(1,10);
  var NAMES=["太郎","花子","ゆうき","さくら","けんた","あきら"];
  var BOATS=["ボート","船","カヌー","いかだ舟"];
  var t="", ans=0, say=null;
  function gcd(a,b){return b?gcd(b,a%b):a;}

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // 静水時の速さ = (下り+上り)/2 を和差で。和が偶数になるよう構成
      var still=ri(3,12)*5;   // 静水時 m/分
      var flow=ri(1,still/5-1)*5; // 流速 < 静水時
      var down=still+flow, up=still-flow;
      ans=still;
      if(up<=0) continue;
      t="ある"+pick(BOATS)+"は 川を 下ると 分速"+down+"m、上ると 分速"+up+"m です。静水時（流れのないとき）の 速さは 分速 何m？";
    }
    else if(lv===2){
      // 流速 = (下り-上り)/2
      var still=ri(3,12)*5;
      var flow=ri(1,still/5-1)*5;
      var down=still+flow, up=still-flow;
      ans=flow;
      if(up<=0||flow<=0) continue;
      t="ある"+pick(BOATS)+"は 川を 下ると 分速"+down+"m、上ると 分速"+up+"m です。川の 流れの 速さ（流速）は 分速 何m？";
    }
    else if(lv===3){
      // 静水時と流速から、下りor上りの速さ ans=still±flow
      var still=ri(4,12)*5;
      var flow=ri(1,still/5-1)*5;
      var dir=ri(0,1); // 0:下り 1:上り
      ans=(dir===0?still+flow:still-flow);
      if(ans<=0) continue;
      t="静水時の 速さが 分速"+still+"m の "+pick(BOATS)+"が、流れの 速さ 分速"+flow+"m の 川を "+(dir===0?"下ります":"上ります")+"。このときの 速さは 分速 何m？";
    }
    else if(lv===4){
      // 下りの時間 = 距離 / (still+flow)
      var still=ri(4,12)*5;
      var flow=ri(1,still/5-1)*5;
      var down=still+flow;
      var minute=ri(2,12);
      var D=down*minute;
      ans=minute;
      if(ans<=0) continue;
      t="静水時 分速"+still+"m の "+pick(BOATS)+"が、流れ 分速"+flow+"m の 川を "+D+"m 下ります。何分 かかる？";
    }
    else if(lv===5){
      // 上りの距離 = (still-flow)*時間
      var still=ri(5,14)*5;
      var flow=ri(1,still/5-2)*5;
      var up=still-flow;
      var minute=ri(2,12);
      ans=up*minute;
      if(ans<=0||up<=0) continue;
      t="静水時 分速"+still+"m の "+pick(BOATS)+"が、流れ 分速"+flow+"m の 川を "+minute+"分 上りました。進んだ 道のりは 何m？";
    }
    else if(lv===6){
      // 上りの時間 = D/(still-flow)
      var still=ri(6,15)*5;
      var flow=ri(1,still/5-2)*5;
      var up=still-flow;
      var minute=ri(2,12);   // 上りにかかる時間（逆算でDを作る）
      var D=up*minute;
      ans=minute;
      if(ans<=0||up<=0) continue;
      t="流れ 分速"+flow+"m の 川に そった "+D+"m の 道のりを、静水時 分速"+still+"m の "+pick(BOATS)+"が 上ります。何分 かかる？";
    }
    else if(lv===7){
      // 往復時間 = D/down + D/up（両方割り切れる距離を逆算）
      var still=ri(6,15)*5;
      var flow=ri(1,still/5-2)*5;
      var down=still+flow, up=still-flow;
      if(up<=0) continue;
      var g=gcd(down,up);
      var D=down*up/g*ri(1,3);   // down,up両方で割り切れる
      var td=D/down, tu=D/up;
      if(td!==Math.floor(td)||tu!==Math.floor(tu)) continue;
      ans=td+tu;
      if(ans<=0) continue;
      t="ある"+pick(BOATS)+"が、流れ 分速"+flow+"m の 川を "+D+"m 下って、同じ道を 上って もどります。静水時の 速さは 分速"+still+"m。往復で 何分 かかる？";
    }
    else if(lv===8){
      // 静水速さ逆算: 同じ距離Dを下りtd分・上りtu分 → still=(D/td+D/tu)/2
      var still=ri(6,15)*5;
      var flow=ri(1,still/5-2)*5;
      var down=still+flow, up=still-flow;
      if(up<=0) continue;
      var g=gcd(down,up);
      var D=down*up/g*ri(1,3);
      var td=D/down, tu=D/up;
      if(td!==Math.floor(td)||tu!==Math.floor(tu)) continue;
      ans=still;
      if(ans<=0) continue;
      t="ある"+pick(BOATS)+"が、ある 川の 同じ道を 下ると "+td+"分、上ると "+tu+"分 かかります。その 道のりは "+D+"m です。この"+pick(BOATS)+"の 静水時の 速さは 分速 何m？";
    }
    else if(lv===9){
      // 流速逆算: 下り時間・上り時間と距離から flow=(D/td-D/tu)/2
      var still=ri(7,16)*5;
      var flow=ri(1,still/5-2)*5;
      var down=still+flow, up=still-flow;
      if(up<=0||flow<=0) continue;
      var g=gcd(down,up);
      var D=down*up/g*ri(1,3);
      var td=D/down, tu=D/up;
      if(td!==Math.floor(td)||tu!==Math.floor(tu)) continue;
      ans=flow;
      if(ans<=0) continue;
      t="ある"+pick(BOATS)+"が、ある 川の 同じ "+D+"m の 道を 下ると "+td+"分、上ると "+tu+"分 かかります。川の 流れの 速さは 分速 何m？";
    }
    else { // lv===10
      // 流速逆算（静水速さと下り(距離/時間)から）: flow = D/分 - still
      var still=ri(7,16)*5;
      var flow=ri(1,still/5-2)*5;
      var down=still+flow;
      var minute=ri(2,12);
      var D=down*minute;
      ans=flow;
      if(ans<=0) continue;
      t="静水時 分速"+still+"m の "+pick(BOATS)+"が、ある 川を "+D+"m 下るのに "+minute+"分 かかりました。川の 流れの 速さは 分速 何m？";
    }
    break;
  }
  return {cat:"ryuusui", kind:"num", text:t, say:say, ans:ans};
}
function gTsuuka(lv){
  if(lv==null) lv=ri(1,10);
  var TRAINS=["電車","特急","急行","貨物列車","新幹線"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1||lv===2||lv===3){
      // 鉄橋/トンネルを渡る: 時間=(列車長+橋長)÷速さ  ans=秒
      var v=ri(2,(lv===1?15:25));            // m/秒
      var sec=ri(3,(lv===1?12:lv===2?20:30));// 秒(割り切れる答え)
      var dist=v*sec;                        // = 列車長+橋長
      var trainLen=ri(5,(lv===1?20:40))*5;   // 列車長(5の倍数)
      var bridgeLen=dist-trainLen;           // 橋/トンネル長
      if(bridgeLen<=0) continue;
      var place=(lv===3?"トンネル":"鉄橋");
      var verb=(lv===3?"くぐりぬける":"わたりきる");
      ans=sec;
      t="長さ"+trainLen+"m の "+pick(TRAINS)+"が 秒速"+v+"m で 走っています。長さ"+bridgeLen+"m の "+place+"を "+verb+"のに 何秒 かかる？";
    }
    else if(lv===4){
      // 電柱/人を通過: 列車長÷速さ  ans=秒
      var v=ri(3,25);
      var sec=ri(2,15);
      var trainLen=v*sec;
      ans=sec;
      if(ans<=0) continue;
      var obj=pick(["電柱","立っている人","信号機"]);
      t="長さ"+trainLen+"m の "+pick(TRAINS)+"が 秒速"+v+"m で 走っています。"+obj+"を 通過するのに 何秒 かかる？";
    }
    else if(lv===5){
      // 電柱通過から 列車長を逆算: 列車長=速さ×秒  ans=列車長 m
      var v=ri(5,30);
      var sec=ri(2,15);
      ans=v*sec;
      if(ans<=0) continue;
      var obj=pick(["電柱","立っている人","信号機"]);
      t=pick(TRAINS)+"が 秒速"+v+"m で 走り、"+obj+"を 通過するのに "+sec+"秒 かかりました。この列車の 長さは 何m？";
    }
    else if(lv===6){
      // 電柱通過から 速さを逆算: 速さ=列車長÷秒  ans=速さ m/秒
      var v=ri(4,25);                  // 答えとなる速さ
      var sec=ri(2,15);
      var trainLen=v*sec;              // 割り切れる
      ans=v;
      if(ans<=0) continue;
      var obj=pick(["電柱","立っている人","信号機"]);
      t="長さ"+trainLen+"m の "+pick(TRAINS)+"が "+obj+"を 通過するのに "+sec+"秒 かかりました。この列車の 速さは 秒速 何m？";
    }
    else if(lv===7){
      // すれ違い(向かい合う): 時間=(L1+L2)÷(v1+v2)  ans=秒
      var sec=ri(3,15);
      var v1=ri(3,18), v2=ri(3,18);
      var sumV=v1+v2;
      var total=sumV*sec;              // = L1+L2
      var L1=ri(4,30)*5;
      var L2=total-L1;
      if(L2<=0||L2%5!==0) continue;
      ans=sec;
      t="長さ"+L1+"m で 秒速"+v1+"m の 列車Aと、長さ"+L2+"m で 秒速"+v2+"m の 列車Bが 向かい合って 走り、すれちがいます。出会ってから はなれるまで 何秒 かかる？";
    }
    else if(lv===8){
      // 追い越し(同方向): 時間=(L1+L2)÷(v1-v2)  ans=秒
      var sec=ri(3,15);
      var v2=ri(3,12);                 // 前(遅い)
      var dv=ri(2,12);                 // 速さの差
      var v1=v2+dv;                    // 後(速い)
      var total=dv*sec;               // = L1+L2
      var L1=ri(4,20)*5;
      var L2=total-L1;
      if(L2<=0||L2%5!==0) continue;
      ans=sec;
      t="長さ"+L1+"m で 秒速"+v1+"m の 列車Aが、長さ"+L2+"m で 秒速"+v2+"m の 列車Bを 後ろから 追い越します。追いついてから 追い越し終わるまで 何秒 かかる？";
    }
    else if(lv===9){
      // すれ違い時間と片方の長さ・両速さから もう片方の長さを逆算
      // L2 = (v1+v2)*sec - L1   ans=L2(m)
      var sec=ri(3,15);
      var v1=ri(3,18), v2=ri(3,18);
      var sumV=v1+v2;
      var total=sumV*sec;
      var L1=ri(4,30)*5;
      var L2=total-L1;
      if(L2<=0) continue;
      ans=L2;
      t="長さ"+L1+"m で 秒速"+v1+"m の 列車Aと、秒速"+v2+"m の 列車Bが 向かい合って すれちがうのに "+sec+"秒 かかりました。列車Bの 長さは 何m？";
    }
    else { // lv===10
      // 追い越し時間・両長さ・遅い側の速さから 速い側の速さを逆算
      // (v1-v2) = (L1+L2)/sec → v1 = v2 + (L1+L2)/sec   ans=v1(m/秒)
      var sec=ri(3,15);
      var v2=ri(3,12);
      var dv=ri(2,12);
      var v1=v2+dv;
      var total=dv*sec;               // L1+L2
      var L1=ri(4,20)*5;
      var L2=total-L1;
      if(L2<=0||L2%5!==0) continue;
      ans=v1;
      t="長さ"+L1+"m の 列車Aが、長さ"+L2+"m で 秒速"+v2+"m の 列車Bを 後ろから 追い越すのに "+sec+"秒 かかりました。列車Aの 速さは 秒速 何m？";
    }
    break;
  }
  return {cat:"tsuuka", kind:"num", text:t, say:say, ans:ans};
}
function gShuuki(lv){
  if(lv==null) lv=ri(1,10);
  // 色や物の「くり返し列」。種類は番号化して問題文に明記する。
  for(var attempt=0;attempt<200;attempt++){
    var seqsets=[
      {items:["赤","青","黄"], label:"赤・青・黄"},
      {items:["赤","白"], label:"赤・白"},
      {items:["♥","♦","♣","♠"], label:"ハート・ダイヤ・クラブ・スペード"},
      {items:["グー","チョキ","パー"], label:"グー・チョキ・パー"},
      {items:["○","△","□"], label:"まる・さんかく・しかく"},
      {items:["A","B","C","D"], label:"A・B・C・D"}
    ];
    var t=null, ans=null;

    if(lv<=3){
      // くり返し列の N番目の「種類の番号」 or 「ある種類の個数」
      var s=pick(seqsets), p=s.items.length, items=s.items, label=s.label;
      var numNote="（"+items.map(function(x,i){return x+"＝"+(i+1);}).join("、")+"）";
      if(lv===1){
        // 種類番号を答える。Nは比較的小さめ。
        var n1=ri(p+1, p*4);
        var idx1=((n1-1)%p)+1; // 1..p
        t="「"+label+"」のじゅんに ずっと くり返してならべます。"+numNote+
          " 左から "+n1+"番目は どの種類ですか。番号で答えなさい。";
        ans=idx1;
      } else if(lv===2){
        // 種類番号を答える。Nを大きめにして周期計算を要する。
        var n2=ri(p*5, p*9+(p-1));
        var idx2=((n2-1)%p)+1;
        t="「"+label+"」のじゅんに ずっと くり返してならべます。"+numNote+
          " 左から "+n2+"番目は どの種類ですか。番号で答えなさい。";
        ans=idx2;
      } else { // lv===3
        // 全体N個ならべたとき「最初の種類(番号1)」は何個か
        var n3=ri(p*4, p*8+(p-1));
        var full3=Math.floor(n3/p);
        var rem3=n3%p; // 余りの分だけ先頭種類が1個増える
        var cnt3=full3 + (rem3>=1?1:0); // 種類1(先頭)の個数
        t="「"+label+"」のじゅんに くり返して、ぜんぶで "+n3+"個 ならべました。"+numNote+
          " 種類1（"+items[0]+"）は 何個 ありますか。";
        ans=cnt3;
      }
    } else if(lv<=6){
      // N番目までに 特定の種類(k番目)が何個あるか
      var s2=pick(seqsets), p2=s2.items.length, items2=s2.items, label2=s2.label;
      var numNote2="（"+items2.map(function(x,i){return x+"＝"+(i+1);}).join("、")+"）";
      var k; // 何番目の種類を数えるか
      if(lv===4){ k=1; }            // 先頭種類（やさしい）
      else if(lv===5){ k=ri(1,p2); } // 任意の種類
      else { k=ri(2,p2); }           // 先頭以外（余り境界判定が要る）
      var nN;
      if(lv===4){ nN=ri(p2*4, p2*8); }
      else if(lv===5){ nN=ri(p2*5, p2*9+(p2-1)); }
      else { nN=ri(p2*6, p2*10+(p2-1)); }
      var full=Math.floor(nN/p2);
      var rem=nN%p2;
      // 種類kは各周期に1個。余りの中では位置kが余り内(rem>=k)なら+1。
      var cntK=full + (rem>=k?1:0);
      t="「"+label2+"」のじゅんに ずっと くり返してならべます。"+numNote2+
        " 左から "+nN+"番目までに、種類"+k+"（"+items2[k-1]+"）は 何個 ありますか。";
      ans=cntK;
    } else {
      // Lv7-10: 余りを使う逆算。「種類kの m回目」は 左から何番目か。
      var s3=pick(seqsets), p3=s3.items.length, items3=s3.items, label3=s3.label;
      var numNote3="（"+items3.map(function(x,i){return x+"＝"+(i+1);}).join("、")+"）";
      var k3, m3;
      if(lv===7){ k3=1; m3=ri(2,6); }              // 先頭種類のm回目（やさしい逆算）
      else if(lv===8){ k3=ri(1,p3); m3=ri(2,7); }  // 任意種類
      else if(lv===9){ k3=ri(2,p3); m3=ri(3,9); }  // 先頭以外
      else { k3=ri(2,p3); m3=ri(4,12); }           // lv10 大きめ
      // 種類k3は各周期のk3番目に出る。m3回目は (m3-1)周期 + k3番目。
      var pos=(m3-1)*p3 + k3; // 1-indexed 全体位置
      t="「"+label3+"」のじゅんに ずっと くり返してならべます。"+numNote3+
        " 種類"+k3+"（"+items3[k3-1]+"）が "+m3+"回目に出てくるのは 左から何番目ですか。";
      ans=pos;
    }

    if(t!==null && Number.isInteger(ans) && ans>0){
      return {cat:"shuuki",kind:"num",text:t,say:null,ans:ans};
    }
  }
  // fallback (well-posed)
  return {cat:"shuuki",kind:"num",
    text:"「赤・青・黄」のじゅんに ずっと くり返してならべます。（赤＝1、青＝2、黄＝3） 左から 5番目は どの種類ですか。番号で答えなさい。",
    say:null,ans:2};
}
function gNichireki(lv){
  if(lv==null) lv=ri(1,10);
  // 各月の日数 (平年。問題は閏年を避けて作問するので 2月=28 固定)
  var MDAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
  var WD=["月","火","水","木","金","土","日"]; // 月=1..日=7 (1-indexed)
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv<=3){
      // 同月内: 日数差 / N日後の日 / N日前の日
      var m=pick([1,3,4,5,6,7,8,9,10,11,12]); // 2月以外で十分大きい月
      var maxd=MDAYS[m-1];
      var sub=lv; // 1..3 で質的に分岐
      if(sub===1){
        // 日数差: d1 から d2 まで何日後
        var d1=ri(1,maxd-3);
        var d2=ri(d1+1,maxd);
        ans=d2-d1;
        if(ans<=0) continue;
        t=m+"月"+d1+"日から "+m+"月"+d2+"日までは 何日後ですか。";
      } else if(sub===2){
        // N日後の日(同月内)
        var d=ri(1,maxd-2);
        var n=ri(1,maxd-d);
        ans=d+n;
        if(ans<=0 || ans>maxd) continue;
        t=m+"月"+d+"日の "+n+"日後は 何日ですか。(同じ月の 日にちを 数で答えてください)";
      } else {
        // N日前の日(同月内)
        var d2b=ri(3,maxd);
        var n2=ri(1,d2b-1);
        ans=d2b-n2;
        if(ans<=0) continue;
        t=m+"月"+d2b+"日の "+n2+"日前は 何日ですか。(同じ月の 日にちを 数で答えてください)";
      }
    }
    else if(lv<=6){
      // 月をまたぐ: 各月日数を考慮
      var sub2=lv-3; // 1..3
      if(sub2===1){
        // 2か月にまたがる日数差: m月d1 から (m+1)月d2 まで何日後
        var m1=pick([1,3,4,5,6,7,8,9,10,11]); // 翌月が存在し2月をまたがない
        var md1=MDAYS[m1-1];
        var d1c=ri(10,md1);
        var m2=m1+1;
        var md2=MDAYS[m2-1];
        var d2c=ri(1,md2-1);
        ans=(md1-d1c)+d2c; // 当月残り + 翌月分
        if(ans<=0) continue;
        t=m1+"月"+d1c+"日から "+m2+"月"+d2c+"日までは 何日後ですか。";
      } else if(sub2===2){
        // 月をまたぐ N日後の日にち(翌月の何日になるか)
        var m1b=pick([1,3,4,5,6,7,8,9,10,11]);
        var md1b=MDAYS[m1b-1];
        var d1d=ri(15,md1b); // 月後半から
        var rest=md1b-d1d;   // 当月の残り日数
        var into=ri(1,MDAYS[m1b]-1); // 翌月に食い込む日数
        var n3=rest+into;
        ans=into; // 翌月の何日になるか
        if(ans<=0) continue;
        t=m1b+"月"+d1d+"日の "+n3+"日後は "+(m1b+1)+"月の 何日ですか。(日にちを 数で答えてください)";
      } else {
        // 3か月にまたがる日数差(中間月まるごと加算)
        var m1e=pick([1,3,4,5,6,7,8,9]); // +2月が存在し2月をまたがない
        var md1e=MDAYS[m1e-1];
        var d1e=ri(10,md1e);
        var m3=m1e+2;
        var md3=MDAYS[m3-1];
        var d3=ri(1,md3-1);
        ans=(md1e-d1e)+MDAYS[m1e]+d3; // 当月残り + 中間月まるごと + 着地月分
        if(ans<=0) continue;
        t=m1e+"月"+d1e+"日から "+m3+"月"+d3+"日までは 何日後ですか。";
      }
    }
    else {
      // lv7-10: 曜日 (月=1..日=7 で回答・問題文に明記)
      var labelNote="(曜日は 月=1, 火=2, 水=3, 木=4, 金=5, 土=6, 日=7 として 数で答えてください)";
      var startWd=ri(1,7); // 出発曜日(1..7)
      if(lv===7){
        // N日後の曜日 (Nは小さめ)
        var n7=ri(1,13);
        ans=((startWd-1+n7)%7)+1;
        if(ans<=0) continue;
        t=WD[startWd-1]+"曜日の "+n7+"日後は 何曜日ですか。"+labelNote;
      } else if(lv===8){
        // N日後の曜日 (Nが週をまたぐ大きめ)
        var n8=ri(14,60);
        ans=((startWd-1+n8)%7)+1;
        if(ans<=0) continue;
        t=WD[startWd-1]+"曜日の "+n8+"日後は 何曜日ですか。"+labelNote;
      } else if(lv===9){
        // N日前の曜日
        var n9=ri(1,40);
        ans=(((startWd-1-n9)%7)+7)%7+1;
        if(ans<=0) continue;
        t=WD[startWd-1]+"曜日の "+n9+"日前は 何曜日ですか。"+labelNote;
      } else { // lv===10
        // 月をまたぐ日付指定: m月x日が startWd 曜日のとき、翌月y日は何曜日（当月残り＋翌月分で計算）
        var m10=pick([1,3,4,5,6,7,8,9,10,11]);   // 翌月が2月にならない月
        var md10=MDAYS[m10-1];
        var x=ri(10,md10);
        var y=ri(5,MDAYS[m10]-1);                  // 翌月の日
        var diff=(md10-x)+y;
        ans=((startWd-1+diff)%7)+1;
        if(ans<=0) continue;
        t=m10+"月"+x+"日が "+WD[startWd-1]+"曜日のとき、"+(m10+1)+"月"+y+"日は 何曜日ですか。"+labelNote;
      }
    }
    break;
  }
  return {cat:"nichireki", kind:"num", text:t, say:null, ans:ans};
}
function gKisokusei(lv){
  if(lv==null) lv=ri(1,10);
  if(lv<1) lv=1; if(lv>10) lv=10;
  var cat="kisokusei";
  for(var attempt=0; attempt<200; attempt++){
    var r=null;
    if(lv<=3){
      // 等差数列の N番目: a + (n-1)*d
      var a, d, n;
      if(lv===1){ a=ri(1,9); d=ri(1,5); n=ri(4,8); }
      else if(lv===2){ a=ri(2,12); d=ri(2,8); n=ri(5,10); }
      else { a=ri(3,15); d=pick([2,3,4,5,6,7]); n=ri(6,12); }
      var ans=a+(n-1)*d;
      var t="数が 「"+a+", "+(a+d)+", "+(a+2*d)+", "+(a+3*d)+", ……」と ならんでいます。"+n+"番目の 数は？";
      r={cat:cat,kind:"num",text:t,say:null,ans:ans};
    }else if(lv<=6){
      // 等差数列の和: (初項+末項)*項数/2
      var a2, d2, n2;
      if(lv===4){ a2=ri(1,6); d2=1; n2=ri(4,8); }              // 連続整数の和
      else if(lv===5){ a2=ri(1,8); d2=ri(2,4); n2=ri(4,8); }   // 一般等差の和
      else { a2=ri(2,12); d2=pick([2,3,5,10]); n2=ri(5,10); }  // 大きめ等差の和
      var last=a2+(n2-1)*d2;
      var ans2=(a2+last)*n2/2;
      if(!Number.isInteger(ans2)) continue;
      var t2;
      if(lv===4){
        t2=a2+"から "+last+"までの 連続する 整数を ぜんぶ たすと いくつ？";
      }else{
        t2="数が 「"+a2+", "+(a2+d2)+", "+(a2+2*d2)+", ……, "+last+"」と "+n2+"こ ならんでいます。ぜんぶ たすと いくつ？";
      }
      r={cat:cat,kind:"num",text:t2,say:null,ans:ans2};
    }else if(lv<=8){
      if(lv===7){
        // 等比数列の N番目: a * r^(n-1)
        var a3=ri(1,3), rr=pick([2,3]), n3=ri(3, rr===2?6:4);
        var ans3=a3*Math.pow(rr,n3-1);
        var seq=[]; for(var i=0;i<3;i++) seq.push(a3*Math.pow(rr,i));
        var t3="数が 「"+seq[0]+", "+seq[1]+", "+seq[2]+", ……」と、まえの 数を "+rr+"倍 して つづきます。"+n3+"番目の 数は？";
        r={cat:cat,kind:"num",text:t3,say:null,ans:ans3};
      }else{
        // 群数列: 各段に 1,2,3,... 個ならべる。k段目までの累計 = k(k+1)/2
        var k=ri(4,9);
        var ans4=k*(k+1)/2;
        var t4="1段目に 1こ、2段目に 2こ、3段目に 3こ ……と、だんだん 1こずつ ふやして 数を ならべます。"+k+"段目の さいごまでに 数は ぜんぶで 何こ ならびますか？";
        r={cat:cat,kind:"num",text:t4,say:null,ans:ans4};
      }
    }else{
      // Lv9-10: 図形数
      if(lv===9){
        // 三角数 n(n+1)/2
        var n5=ri(5,12);
        var ans5=n5*(n5+1)/2;
        var t5="ボールを 三角形に つみます。1だん目 1こ、2だん目 2こ ……と ふやして "+n5+"だん つむと、ボールは ぜんぶで 何こ？";
        r={cat:cat,kind:"num",text:t5,say:null,ans:ans5};
      }else{
        // 三角数の逆算: 合計から段数を求める（前進の三角数より一段むずかしい）
        var n6=ri(6,15);
        var tot6=n6*(n6+1)/2;
        var t6="ボールを 三角形に つみます。1だん目 1こ、2だん目 2こ ……と ふやしたら、ぜんぶで "+tot6+"こ に なりました。何だん つみましたか？";
        r={cat:cat,kind:"num",text:t6,say:null,ans:n6};
      }
    }
    if(r && Number.isInteger(r.ans) && r.ans>0) return r;
  }
  // フォールバック
  return {cat:cat,kind:"num",text:"数が 「2, 4, 6, 8, ……」と ならんでいます。5番目の 数は？",say:null,ans:10};
}
function gHayasahi(lv){
  if(lv==null) lv=ri(1,10);
  // local gcd（親と重複させない）
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=a%b;a=b;b=t;}return a||1;}
  var NAMES=["たろう","はなこ","けんた","みさき","ゆうた","あおい"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv>=1 && lv<=3){
      // 速さの比：同じ時間に進むと距離の比=速さの比。一方の距離を与え他方を問う
      var a=ri(2,(lv===1?4:(lv===2?6:8))), b=ri(2,(lv===1?4:(lv===2?6:8)));
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;            // 既約の比に正規化
      var k=ri(2,(lv===1?6:(lv===2?9:12)));  // 共通スケール
      var n1=NAMES[0], n2=NAMES[1];
      var askA = Math.random()<0.5;          // true: A側距離を与えてB側を問う
      var givenVal = askA ? a*k : b*k;
      ans = askA ? b*k : a*k;
      if(ans<=0 || givenVal<=0) continue;
      t=n1+"と"+n2+"が 同じ時間 走ると、進む距離の比は "+a+":"+b+" です。"+
        (askA?n1:n2)+"が "+givenVal+"m 進んだとき、"+(askA?n2:n1)+"は 何m 進む？";
    }
    else if(lv>=4 && lv<=6){
      // 同じ距離なら、かかる時間の比は 速さの逆比。速さの比 a:b → 時間の比 b:a
      var a=ri(2,(lv===4?4:(lv===5?6:8))), b=ri(2,(lv===4?4:(lv===5?6:8)));
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,(lv===4?6:(lv===5?9:12)));   // 時間比スケール（分）
      var n1=NAMES[2], n2=NAMES[3];
      var askA = Math.random()<0.5;            // true: A時間を与えてB時間を問う
      var timeA = b*k;                          // A の時間は逆比の b 側
      var timeB = a*k;
      var givenVal = askA ? timeA : timeB;
      ans = askA ? timeB : timeA;
      if(ans<=0 || givenVal<=0) continue;
      t=n1+"と"+n2+"が 同じ道のりを 進みます。速さの比は "+a+":"+b+" です。"+
        (askA?n1:n2)+"は "+givenVal+"分 かかりました。"+(askA?n2:n1)+"は 何分 かかる？";
    }
    else { // lv 7-10：比から具体値を逆算（一方の値が与えられ他方を求める）
      var sub = (lv<=8) ? 0 : 1;   // lv7-8: 速さ比から速さ / lv9-10: 距離=速さ×時間
      if(sub===0){
        // 速さの比 a:b と、片方の「速さ(m/分)」を与え、もう片方の速さを問う
        var a=ri(2,(lv===7?5:7)), b=ri(2,(lv===7?5:7));
        if(a===b) continue;
        if(gcd(a,b)!==1) continue;
        var k=ri(3,(lv===7?9:14));     // 単位あたりの実速度スケール
        var n1=NAMES[4], n2=NAMES[5];
        var askA = Math.random()<0.5;   // 与える側
        var speedA=a*k, speedB=b*k;
        var givenVal = askA ? speedA : speedB;
        ans = askA ? speedB : speedA;
        if(ans<=0 || givenVal<=0) continue;
        t=n1+"と"+n2+"の 速さの比は "+a+":"+b+" です。"+
          (askA?n1:n2)+"の 速さは 分速 "+givenVal+"m です。"+(askA?n2:n1)+"の 速さは 分速 何m？";
      } else {
        // 速さの比 a:b、同じ時間 T 分 進む → 距離 = 速さ×時間。片方の距離を与え他方を問う
        var a=ri(2,(lv===9?5:7)), b=ri(2,(lv===9?5:7));
        if(a===b) continue;
        if(gcd(a,b)!==1) continue;
        var spd=ri(2,(lv===9?6:9));     // 速さの1あたり（分速 m）
        var T=ri(2,(lv===9?8:12));       // 時間（分）
        var n1=NAMES[0], n2=NAMES[3];
        var askA = Math.random()<0.5;
        var distA = a*spd*T, distB = b*spd*T;
        var givenVal = askA ? distA : distB;
        ans = askA ? distB : distA;
        if(ans<=0 || givenVal<=0) continue;
        t=n1+"と"+n2+"が "+T+"分間 進みました。速さの比は "+a+":"+b+" で、"+
          (askA?n1:n2)+"は "+givenVal+"m 進みました。"+(askA?n2:n1)+"は 何m 進む？";
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  return {cat:"hayasahi",kind:"num",text:t,say:say,ans:ans};
}
function gShuugou(lv){
  if(lv==null) lv=ri(1,10);
  // local gcd (親と重複させない / 現状未使用だが将来の約分用に局所保持)
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=a%b;a=b;b=t;}return a||1;}
  var t="", ans=0;

  // クラスの場面・2集合のラベルテンプレ
  var SCENE=[
    {whole:"クラス",unit:"人",A:"犬を かっている人",B:"ねこを かっている人"},
    {whole:"クラス",unit:"人",A:"サッカーが すきな人",B:"野球が すきな人"},
    {whole:"クラス",unit:"人",A:"算数が すきな人",B:"国語が すきな人"},
    {whole:"グループ",unit:"人",A:"電車で 通う人",B:"バスで 通う人"}
  ];

  for(var tries=0; tries<200; tries++){
    if(lv<=3){
      // 2集合: 全体・A・B から 和集合/積集合/片方のみ を問う
      var sc = pick(SCENE);
      var W  = (lv===1)? ri(20,32) : (lv===2)? ri(24,38) : ri(28,40);
      var both = ri(2, Math.floor(W/4));          // A∩B
      var onlyA = ri(1, Math.floor(W/3));         // Aのみ
      var onlyB = ri(1, Math.floor(W/3));         // Bのみ
      var neither = W - (onlyA + onlyB + both);   // どちらでもない
      if(neither < 0) continue;
      var A = onlyA + both;                       // Aの合計
      var B = onlyB + both;                       // Bの合計
      var union = onlyA + onlyB + both;           // A∪B
      if(lv===1){
        ans = both;
        if(ans<=0) continue;
        t = sc.whole+"は ぜんぶで "+W+sc.unit+"です。"+sc.A+"は "+A+sc.unit+"、"
          + sc.B+"は "+B+sc.unit+"、どちらでもない人は "+neither+sc.unit+"です。"
          + "両方とも あてはまる人は 何"+sc.unit+"ですか。";
      } else if(lv===2){
        ans = union;
        if(ans<=0) continue;
        t = sc.whole+"は ぜんぶで "+W+sc.unit+"で、どちらでもない人は "+neither+sc.unit+"です。"
          + sc.A+"か "+sc.B+"の どちらか(または両方)に あてはまる人は 何"+sc.unit+"ですか。";
      } else {
        ans = onlyA;
        if(ans<=0) continue;
        t = sc.A+"は "+A+sc.unit+"いて、そのうち "+sc.B+"でもある人が "+both+sc.unit+"います。"
          + sc.A+"だけ("+sc.B+"では ない)に あてはまる人は 何"+sc.unit+"ですか。";
      }
    }
    else if(lv<=6){
      // 両方 / どちらでもない = 全体 - 和集合 を主題に
      var sc2 = pick(SCENE);
      var W2  = (lv===4)? ri(24,36) : (lv===5)? ri(28,40) : ri(30,44);
      var both2 = ri(2, Math.floor(W2/4));
      var onlyA2 = ri(2, Math.floor(W2/3));
      var onlyB2 = ri(2, Math.floor(W2/3));
      var neither2 = W2 - (onlyA2 + onlyB2 + both2);
      if(neither2 < 1) continue;
      var A2 = onlyA2 + both2;
      var B2 = onlyB2 + both2;
      if(lv===4){
        // どちらでもない = 全体 - 和集合
        ans = neither2;
        t = sc2.whole+" "+W2+sc2.unit+"のうち、"+sc2.A+"は "+A2+sc2.unit+"、"
          + sc2.B+"は "+B2+sc2.unit+"、両方とも あてはまる人は "+both2+sc2.unit+"です。"
          + "どちらにも あてはまらない人は 何"+sc2.unit+"ですか。";
      } else if(lv===5){
        // 両方 を包除原理で逆算
        ans = both2;
        if(ans<=0) continue;
        t = sc2.whole+" "+W2+sc2.unit+"のうち、"+sc2.A+"は "+A2+sc2.unit+"、"
          + sc2.B+"は "+B2+sc2.unit+"、どちらにも あてはまらない人は "+neither2+sc2.unit+"です。"
          + "両方とも あてはまる人は 何"+sc2.unit+"ですか。";
      } else {
        // lv6: 片方だけ
        var askA6 = Math.random()<0.5;
        ans = askA6 ? onlyA2 : onlyB2;
        if(ans<=0) continue;
        t = sc2.whole+" "+W2+sc2.unit+"のうち、"+sc2.A+"は "+A2+sc2.unit+"、"
          + sc2.B+"は "+B2+sc2.unit+"、両方とも あてはまる人は "+both2+sc2.unit+"、"
          + "どちらにも あてはまらない人は "+neither2+sc2.unit+"です。"
          + (askA6?sc2.A+"だけ":sc2.B+"だけ")+"に あてはまる人は 何"+sc2.unit+"ですか。";
      }
    }
    else {
      // lv7-10: 3集合(ベン図)の包除原理。7領域から作問し、レベルで問う対象を変える
      // （従来 Lv7 は「全体−どれでもない」の引き算だけで Lv5/6 より易しい凹みだった）
      var S3=pick([
        {w:"クラス",u:"人",A:"算数",B:"国語",C:"理科",v:"が すきな人"},
        {w:"クラス",u:"人",A:"犬",B:"ねこ",C:"うさぎ",v:"を かっている人"},
        {w:"クラス",u:"人",A:"サッカー",B:"野球",C:"水泳",v:"が すきな人"}
      ]);
      var oA=ri(2,8),oB=ri(2,8),oC=ri(2,8),dAB=ri(1,5),dBC=ri(1,5),dCA=ri(1,5),T=ri(1,4),N=ri(2,6);
      var A7=oA+dAB+dCA+T, B7=oB+dAB+dBC+T, C7=oC+dBC+dCA+T;
      var iAB=dAB+T, iBC=dBC+T, iCA=dCA+T;             // 2つの両方(=ちょうど2つ＋3つ)
      var union=oA+oB+oC+dAB+dBC+dCA+T, total=union+N;
      var givens = S3.w+" "+total+S3.u+"を しらべました。"
        + S3.A+S3.v+"は "+A7+S3.u+"、"+S3.B+S3.v+"は "+B7+S3.u+"、"+S3.C+S3.v+"は "+C7+S3.u+"。"
        + S3.A+"と"+S3.B+"の両方は "+iAB+S3.u+"、"+S3.B+"と"+S3.C+"の両方は "+iBC+S3.u+"、"
        + S3.C+"と"+S3.A+"の両方は "+iCA+S3.u+"、3つ ぜんぶは "+T+S3.u+"です。";
      if(lv===7){          // 少なくとも1つ(和集合) = A+B+C −(2つ)＋(3つ)
        ans=union;
        t=givens+"どれか 1つ以上に あてはまる人は 何"+S3.u+"？";
      } else if(lv===8){   // どれにも当てはまらない = 全体 − 和集合
        ans=N;
        t=givens+"どれにも あてはまらない人は 何"+S3.u+"？";
      } else if(lv===9){   // ちょうど1つだけ
        ans=oA+oB+oC;
        t=givens+"3つの うち ちょうど 1つだけに あてはまる人は 何"+S3.u+"？";
      } else {             // ちょうど2つ
        ans=dAB+dBC+dCA;
        t=givens+"3つの うち ちょうど 2つに あてはまる人は 何"+S3.u+"？";
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  return {cat:"shuugou", kind:"num", text:t, say:null, ans:ans};
}
function gBairitsu(lv){
  if(lv==null) lv=ri(1,10);
  var NAMES=["太郎","花子","ゆうき","さくら","けんた","あきら"];
  var ITEMS=["あめ","おはじき","シール","カード","ビー玉","どんぐり"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1||lv===2||lv===3){
      // 一方が他方のN倍。和または差を与えて各値を求める(倍数の和差算)
      var item=pick(ITEMS);
      var N=(lv===1?2:ri(2,4));
      var small=ri(3,20);
      var big=small*N;            // 大=小のN倍(逆算で割り切れる)
      if(lv===1){
        // 和を与えて「小さい方」を求める: small=sum/(N+1)
        var sum=small+big;
        ans=small;
        t="赤い"+item+"は 青い"+item+"の "+N+"倍です。あわせて "+sum+"個 あります。青い"+item+"は 何個ですか？";
      } else if(lv===2){
        // 差を与えて「小さい方」を求める: small=dif/(N-1)
        var dif=big-small;
        ans=small;
        t="赤い"+item+"は 青い"+item+"の "+N+"倍です。赤い"+item+"は 青い"+item+"より "+dif+"個 多いです。青い"+item+"は 何個ですか？";
      } else {
        // 和を与えて「大きい方」を求める: big=sum*N/(N+1)
        var sum=small+big;
        ans=big;
        t="赤い"+item+"は 青い"+item+"の "+N+"倍です。あわせて "+sum+"個 あります。赤い"+item+"は 何個ですか？";
      }
    }
    else if(lv===4||lv===5||lv===6){
      // 何かを足す/引くとN倍になる
      var item=pick(ITEMS);
      var c=pick(NAMES);
      var N=ri(2,4);
      if(lv===4){
        // 小さい数 s、大きい数に a を足すと s のN倍 → big = N*s - a
        var s=ri(3,15);
        var a=ri(1,12);
        var big=N*s-a;
        if(big<=s) continue;
        ans=big;
        t="青い"+item+"は "+s+"個 あります。赤い"+item+"に "+a+"個 たすと、青い"+item+"の "+N+"倍に なります。赤い"+item+"は 何個ですか？";
      } else if(lv===5){
        // 大きい数から b を引くと 小さい数のN倍 → big = N*s + b
        var s=ri(3,15);
        var b=ri(1,12);
        var big=N*s+b;
        ans=big;
        t="青い"+item+"は "+s+"個 あります。赤い"+item+"から "+b+"個 とると、青い"+item+"の "+N+"倍に なります。赤い"+item+"は 何個ですか？";
      } else {
        // 両方に同じ数 a を足すとN倍: (big+a)=N*(small+a) → small を逆算
        var small=ri(4,20);
        var a=ri(1,10);
        var big=N*(small+a)-a;     // big を逆算
        if(big<=small) continue;
        ans=small;
        t=c+"は 赤い"+item+"を "+big+"個 持っています。二人とも あと "+a+"個 ずつ もらうと、"+c+"の数が もう一人の "+N+"倍に なります。もう一人は 今 何個 持っていますか？";
      }
    }
    else { // lv===7,8,9,10  比の変化(○あげる/もらうと比が変わる)
      var c1=pick(NAMES), c2=c1;
      while(c2===c1) c2=pick(NAMES);
      var item=pick(ITEMS);
      if(lv===7||lv===8){
        // c1 が c2 に m個 あげると c1 が c2 の N倍になる
        var N=(lv===7?2:ri(2,3));
        var m=ri(1,8);
        var b=ri(3,15);           // あげた後の c2
        var aft1=N*b;             // あげた後の c1 = N倍
        var before1=aft1+m;       // 初めの c1
        var before2=b-m;          // 初めの c2
        if(before2<1) continue;
        if(before1<=before2) continue;
        ans=before1;
        t=c1+"は "+c2+"に "+item+"を "+m+"個 あげました。すると "+c1+"の数が "+c2+"の "+N+"倍に なりました。"+c1+"は はじめ 何個 持っていましたか？";
      } else {
        // lv9,10: c1 が m個 もらうと比が p:q に。c2 の数を与えて c1 の初めを求める
        var p=(lv===9?3:pick([3,5])), q=2;   // 2 と互いに素 -> 比はすでに約分済
        if(p<=q) p=q+1;
        var k=ri(2,8);
        var Bv=q*k;
        var aft1=p*k;             // もらった後の c1
        var m=ri(1,10);
        var Av=aft1-m;            // 初めの c1
        if(Av<1) continue;
        if(Av>=aft1) continue;
        ans=Av;
        t=c1+"と "+c2+"が "+item+"を 持っています。"+c1+"が "+m+"個 もらうと、二人の数の 比が "+p+":"+q+"に なりました。このとき "+c2+"は "+Bv+"個 持っています。"+c1+"は はじめ 何個 持っていましたか？";
      }
    }
    if(ans>0 && ans===Math.floor(ans)) break;
  }
  return {cat:"bairitsu", kind:"num", text:t, say:null, ans:ans};
}
function gShoukyo(lv){
  if(lv==null) lv=ri(1,10);
  // 商品ペア（単位は「円」、個数で表現）
  var PAIRS=[
    {a:"りんご",b:"みかん"},{a:"ノート",b:"えんぴつ"},{a:"パン",b:"ジュース"},
    {a:"ケーキ",b:"プリン"},{a:"消しゴム",b:"定規"},{a:"シール",b:"カード"}
  ];
  var TRIO=[
    {a:"おとな",b:"子ども",c:"赤ちゃん",cnt:"人",amt:"人分"},
    {a:"大きい箱",b:"中くらいの箱",c:"小さい箱",cnt:"個",amt:"個分"}
  ];
  var gcd=function(x,y){x=Math.abs(x);y=Math.abs(y);while(y){var t=y;y=x%y;x=t;}return x;};
  var lcm=function(x,y){return x/gcd(x,y)*y;};
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv>=1 && lv<=3){
      // 2品 a,b の2式。bの個数を両式でそろえて消去 → a 1個の値段。
      // 式1: m1*a + n*b = T1 ,  式2: m2*a + n*b = T2 （bの係数 n が共通）
      var p=pick(PAIRS);
      var pa=ri(2,(lv===1?9:15))*10;   // a 1個の値段
      var pb=ri(2,(lv===1?9:15))*10;   // b 1個の値段
      var n =ri(1,(lv===1?2:3));        // 共通の b の個数
      var m1=ri(1,(lv<=2?3:4));
      var m2=ri(1,(lv<=2?3:4));
      if(m1===m2) continue;             // a の係数が同じだと消去できない
      var T1=m1*pa+n*pb;
      var T2=m2*pa+n*pb;
      if(T1<=0||T2<=0) continue;
      ans=pa;                            // 消去で直接出る a 1個の値段
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=p.a+" "+m1+"個と "+p.b+" "+n+"個で "+T1+"円、"+
        p.a+" "+m2+"個と "+p.b+" "+n+"個で "+T2+"円です。"+p.a+" 1個は いくら？";
    }
    else if(lv>=4 && lv<=6){
      // 2式とも係数がそろっていない。片方を倍して b を消去 → a 1個の値段。
      // 式1: m1*a + k1*b = T1 , 式2: m2*a + k2*b = T2
      var p=pick(PAIRS);
      var pa=ri(2,(lv===4?9:18))*10;
      var pb=ri(2,(lv===4?9:18))*10;
      var m1=ri(1,(lv<=5?3:4));
      var k1=ri(1,(lv<=5?3:4));
      var m2=ri(1,(lv<=5?3:4));
      var k2=ri(1,(lv<=5?3:4));
      if(k1===k2) continue;              // b の係数一致だと Lv1-3 と同質（倍が不要）
      var det=m1*k2-m2*k1;
      if(det===0) continue;              // 比例 → 不定（ill-posed）排除
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      if(T1<=0||T2<=0) continue;
      ans=pa;                            // a 1個の値段
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=p.a+" "+m1+"個と "+p.b+" "+k1+"個で "+T1+"円、"+
        p.a+" "+m2+"個と "+p.b+" "+k2+"個で "+T2+"円です。"+p.a+" 1個は いくら？";
    }
    else if(lv>=7 && lv<=8){
      // 2式・大きめ係数。両方を倍して消去（計算量増）。答えは b 1個。
      var p=pick(PAIRS);
      var pa=ri(3,(lv===7?12:20))*10;
      var pb=ri(3,(lv===7?12:20))*10;
      var m1=ri(2,4), k1=ri(2,4), m2=ri(2,4), k2=ri(2,4);
      if(m1===m2 && k1===k2) continue;
      var det=m1*k2-m2*k1;
      if(det===0) continue;
      if(m1%m2===0 || m2%m1===0) continue; // a係数が割り切れない→両式を倍が必要
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      if(T1<=0||T2<=0) continue;
      ans=pb;                            // b 1個の値段
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=p.a+" "+m1+"個と "+p.b+" "+k1+"個で "+T1+"円、"+
        p.a+" "+m2+"個と "+p.b+" "+k2+"個で "+T2+"円です。"+p.b+" 1個は いくら？";
    }
    else { // lv 9-10: 3量（連立 + 差で1量を消去）
      // 式1: m1*a + k1*b = T1 , 式2: m2*a + k2*b = T2 を解いて a を出し、
      // c は a より dc 円安い（最後の引き算で c を求める）。答えは c 1単位。
      var tr=pick(TRIO);
      var pa=ri(3,(lv===9?12:20))*10;   // a 1単位
      var pb=ri(2,(lv===9?9:15))*10;    // b 1単位
      var dc=ri(1,(lv===9?9:15))*10;    // c は a より dc 円安い
      var pc=pa-dc;
      if(pc<=0) continue;
      var m1=ri(1,3), k1=ri(1,3);
      var m2=m1+ri(1,2), k2=ri(1,3);
      if(k1===k2 && m1===m2) continue;
      var det=m1*k2-m2*k1;
      if(det===0) continue;
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      if(T1<=0||T2<=0) continue;
      ans=pc;                            // c 1単位の値段
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=tr.a+" "+m1+tr.cnt+"と "+tr.b+" "+k1+tr.cnt+"で "+T1+"円、"+
        tr.a+" "+m2+tr.cnt+"と "+tr.b+" "+k2+tr.cnt+"で "+T2+"円です。"+
        "また "+tr.c+"は "+tr.a+"より "+dc+"円 安いです。"+tr.c+" 1"+tr.amt+"は いくら？";
    }
    break;
  }
  return {cat:"shoukyo", kind:"num", text:t, say:null, ans:ans};
}
function gHoujin(lv){
  if(lv==null) lv=ri(1,10);
  var ITEMS=["おはじき","ご石","タイル","コイン","おはな","ボール"];
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    var it=pick(ITEMS);

    // Lv1-3: 中実方陣 一辺n → 全体(n^2) / 外周(4n-4) / 内側(n-2)^2
    if(lv>=1 && lv<=3){
      var n=ri(3,12);
      if(lv===1){
        ans=n*n;
        t=it+"を たてよこ おなじ数で すきまなく ならべて、1辺が "+n+"こ の 正方形に しました。ぜんぶで なんこ？";
      } else if(lv===2){
        ans=4*n-4;
        t=it+"を ならべて 1辺 "+n+"こ の 正方形に しました。いちばん そとがわ(まわり)に ある "+it+"は なんこ？";
      } else {
        ans=(n-2)*(n-2);
        t=it+"を ならべて 1辺 "+n+"こ の 正方形に しました。いちばん そとがわを のぞいた、内がわの "+it+"は なんこ？";
      }
    }
    // Lv4-6: 外周/全体 の個数から一辺 or 全体を逆算
    else if(lv>=4 && lv<=6){
      var n=ri(3,15);
      if(lv===4){
        var p=4*n-4;
        ans=n;
        t="ある 正方形の まわり(外周)に "+it+"が "+p+"こ ならんでいます。1辺は なんこ ならんでいますか？";
      } else if(lv===5){
        var tot=n*n;
        ans=n;
        t=it+"を すきまなく ならべて 正方形を つくったら、ぜんぶで "+tot+"こ つかいました。1辺は なんこ？";
      } else {
        var p=4*n-4;
        ans=n*n;
        t="正方形に ならべた "+it+"の まわり(外周)に "+p+"こ あります。"+it+"は ぜんぶで なんこ？";
      }
    }
    // Lv7-10: 中空方陣(ふち m 重)
    else {
      var m=(lv<=8)?2:ri(2,3);
      var n=ri(2*m+1, 14);
      var inner=n-2*m;
      if(inner<1) continue;
      var ring=n*n-inner*inner;
      if(lv===7){
        ans=ring;
        t=it+"を ならべて 1辺 "+n+"こ の 正方形を つくり、まわりから "+m+"重ぶんを ふちに しました。ふちの "+it+"は なんこ？";
      } else if(lv===8){
        ans=n;
        t="1辺が おなじ 正方形で、まわり "+m+"重ぶんの ふちに "+it+"が "+ring+"こ あります。1辺は なんこ?";
      } else if(lv===9){
        ans=ring;
        t=it+"を 1辺 "+n+"こ の 正方形に ならべ、そとがわ "+m+"重を ふちと します。ふちの "+it+"は なんこ？";
      } else {
        ans=inner*inner;
        t=it+"を 1辺 "+n+"こ の 正方形に ならべ、そとがわ "+m+"重ぶんを とりのぞきます。のこった 内がわの "+it+"は なんこ？";
      }
    }

    if(ans>0 && ans===Math.round(ans)){
      return {cat:"houjin",kind:"num",text:t,say:null,ans:ans};
    }
  }
  return {cat:"houjin",kind:"num",text:"1辺 5こ の 正方形に ならべました。ぜんぶで なんこ？",say:null,ans:25};
}
function gBaai(lv){
  if(lv==null) lv=ri(1,10);
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=b;b=a%b;a=t;}return a;}
  function nPr(n,r){var v=1;for(var i=0;i<r;i++)v*=(n-i);return v;}
  function nCr(n,r){if(r<0||r>n)return 0;if(r>n-r)r=n-r;var num=1,den=1;for(var i=0;i<r;i++){num*=(n-i);den*=(i+1);}return num/den;}
  function paths(w,h){return nCr(w+h,h);} /* grid corner-to-corner */

  for(var tries=0; tries<200; tries++){
    var text=null, ans=null;

    if(lv<=3){
      /* 樹形図／積の法則: ○通り × △通り */
      if(lv===1){
        var a=ri(2,4), b=ri(2,4);
        var items=pick([
          ["シャツ","ズボン"],["上着","くつ"],["パン","飲み物"],["ぼうし","かばん"]
        ]);
        text=items[0]+"が"+a+"種類、"+items[1]+"が"+b+"種類あります。組み合わせは全部で何通り？";
        ans=a*b;
      } else if(lv===2){
        var a2=ri(2,6), b2=ri(2,6);
        text="入り口が"+a2+"通り、出口が"+b2+"通りあります。通り方は全部で何通り？";
        ans=a2*b2;
      } else {
        var a3=ri(2,3), b3=ri(2,3), c3=ri(2,4);
        text="前菜が"+a3+"種類、主菜が"+b3+"種類、デザートが"+c3+"種類。コースは全部で何通り？";
        ans=a3*b3*c3;
      }
    } else if(lv<=6){
      /* 順列 nPr: 並べ方 */
      if(lv===4){
        var n4=ri(3,4);
        text=n4+"人が1列に並びます。並び方は全部で何通り？";
        ans=nPr(n4,n4);
      } else if(lv===5){
        var n5=ri(4,5), r5=ri(2,3);
        text=n5+"人の中から"+r5+"人を選んで1列に並べます。並べ方は何通り？";
        ans=nPr(n5,r5);
      } else {
        var n6=ri(5,6), r6=3;
        text=n6+"枚の数字カードから"+r6+"枚を選んで並べ、"+r6+"けたの数を作ります。何通り？";
        ans=nPr(n6,r6);
      }
    } else if(lv<=8){
      /* 組合せ nCr: 選び方 */
      if(lv===7){
        var n7=ri(4,6), r7=2;
        text=n7+"人の中から"+r7+"人の代表を選びます。選び方は何通り？";
        ans=nCr(n7,r7);
      } else {
        var n8=ri(5,7), r8=ri(2,3);
        text=n8+"種類のおかしから"+r8+"種類を選びます。選び方は何通り？";
        ans=nCr(n8,r8);
      }
    } else {
      /* 道順(格子) / 和の法則 */
      if(lv===9){
        var w9=ri(2,3), h9=ri(2,3);
        text="たて"+h9+"区画、よこ"+w9+"区画の道を、遠回りせずに右上まで行きます。道順は何通り？";
        ans=paths(w9,h9);
      } else {
        if(Math.random()<0.5){
          var n10=ri(6,8), r10=3;
          text=n10+"人の中から"+r10+"人の代表を選びます。選び方は何通り？";
          ans=nCr(n10,r10);
        } else {
          var w10=ri(3,4), h10=3;
          text="たて"+h10+"区画、よこ"+w10+"区画の道を、遠回りせずに右上まで行きます。道順は何通り？";
          ans=paths(w10,h10);
        }
      }
    }

    if(text!=null && ans!=null && ans>0 && ans===Math.floor(ans)){
      return {cat:"baai", kind:"num", text:text, say:null, ans:ans};
    }
  }
  return {cat:"baai", kind:"num", text:"赤が2種類、青が3種類。組み合わせは何通り？", say:null, ans:6};
}
function gHireihanpi(lv){
  if(lv==null) lv=ri(1,10);
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=a%b;a=b;b=t;}return a||1;}
  var ITEMS=["くぎ","ねじ","ボルト","タイル","ビーズ","えんぴつ"];
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv>=1 && lv<=3){
      // 比例: x が a のとき y が b。x=c のとき y は? (y=b*c/a)
      // a を約数として持つ b・c を作り割り切れ保証
      var a=ri(2,(lv<=2?5:8));
      var unit=ri(2,(lv===1?6:9));        // 1単位あたり y = unit
      var b=a*unit;                        // x=a で y=b は整数
      var c=a*ri(2,(lv<=2?6:9));           // c は a の倍数 → 割り切れ
      if(c===a) continue;
      ans=b*c/a;                           // = unit*c
      if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
      // 質的難化: Lv1 同単位, Lv2 物量, Lv3 やや大きい数
      var ctx = (lv===1)
        ? "リボン "+a+"m の ねだんは "+b+"円です。"+c+"m では なん円？"
        : (lv===2
          ? "はぐるま が "+a+"回 まわると ベルトは "+b+"cm すすみます。"+c+"回 では なん cm？"
          : "きかい が "+a+"分 で "+b+"個 つくります。"+c+"分 では なん個？");
      t=ctx;
    }
    else if(lv>=4 && lv<=6){
      // 反比例: 積一定 (歯車の歯数×回転 / 人数×日数 = 一定)
      var K, x1, y1, x2;
      if(lv===4){
        // 歯車: 歯数 x1 × 回転 y1 = 歯数 x2 × 回転?
        x1=ri(2,9); y1=ri(2,9); K=x1*y1;
        var divs=[]; for(var d=2; d<=K; d++){ if(K%d===0 && d!==x1) divs.push(d); }
        if(divs.length===0) continue;
        x2=pick(divs); ans=K/x2;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t="歯数 "+x1+" の 歯車が "+y1+"回 まわると、歯数 "+x2+" の 歯車は なん回 まわる？";
      } else if(lv===5){
        // 仕事: x1人で y1日 → x2人なら何日 (x1*y1=x2*?)
        x1=ri(2,9); y1=ri(2,9); K=x1*y1;
        var divs=[]; for(var d=2; d<=K; d++){ if(K%d===0 && d!==x1) divs.push(d); }
        if(divs.length===0) continue;
        x2=pick(divs); ans=K/x2;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t=x1+"人 で "+y1+"日 かかる しごとを、"+x2+"人 で すると なん日？";
      } else {
        // lv6: 速さ×時間=距離一定 (毎分 x1 m で y1分 → 毎分 x2 m なら何分)
        x1=ri(2,12); y1=ri(2,12); K=x1*y1;
        var divs=[]; for(var d=2; d<=K; d++){ if(K%d===0 && d!==x1) divs.push(d); }
        if(divs.length===0) continue;
        x2=pick(divs); ans=K/x2;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t="ある みちのりを 毎分 "+x1+"m で あるくと "+y1+"分。毎分 "+x2+"m では なん分？";
      }
    }
    else { // lv 7-10: 文章で比例/反比例を見分けて逆算
      var isInverse = (Math.random()<0.5);
      if(!isInverse){
        // 比例: a 分 で b → c 分 で?  (b は a の倍数)
        var a=ri(2,(lv<=8?6:9));
        var unit=ri(2,(lv<=8?7:9));
        var b=a*unit;
        var c=a*ri(2,(lv<=8?7:9));
        if(c===a) continue;
        ans=unit*c;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t="水を "+a+"分 入れると "+b+"L たまります。"+c+"分 では なん L？";
      } else {
        // 反比例: 積一定
        var x1=ri(2,(lv<=8?9:12)), y1=ri(2,(lv<=8?9:12)), K=x1*y1;
        var divs=[]; for(var d=2; d<=K; d++){ if(K%d===0 && d!==x1) divs.push(d); }
        if(divs.length===0) continue;
        var x2=pick(divs); ans=K/x2;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t="本を "+x1+"さつ ずつ つむと "+y1+"だん。"+x2+"さつ ずつ では なん だん？";
      }
    }
    if(ans>0 && Number.isInteger(ans) && ans<=200) break;
  }
  return {cat:"hireihanpi",kind:"num",text:t,say:null,ans:ans};
}
function genBy(cat,p,lv){
  if(lv==null && p && LVL_CATS[cat]){ lv=(p.lv&&p.lv[cat])||1; }  /* 適応レベル: 未指定なら現在Lv */
  if(cat==="sougou"){
    /* 総合: 学習済みカテゴリ全体から1問。cat を "sougou" に統一して集計・レベリングする
       （従来は default に落ち subtype の cat になり、p.lv.sougou が上がらないバグだった）。
       難易度は sougou 自身の Lv を各 subtype 生成器へ渡してスケールさせる。 */
    var spool=["mix","kufuu","deci","frac","machigai"];
    if(p) K10DEV.forEach(function(c){ if(p.stats&&p.stats[c]&&p.stats[c].n>0) spool.push(c); });
    var sq=genBy(pick(spool), p, lv);
    sq.cat="sougou";
    return sq;
  }
  if(cat==="hissan")return gHissan(p,lv);
  if(cat==="hikizan")return gHikizan(p,lv);
  if(cat==="kuku")return gKuku(p,null,lv);
  if(cat==="anzan")return gAnzan(lv);
  if(cat==="mix")return gMix(lv);
  if(cat==="kufuu")return gKufuu(lv);
  if(cat==="deci")return gDeci(lv);
  if(cat==="frac")return gFrac(lv);
  if(cat==="warizan")return gWarizan(lv);
  if(cat==="wasa")return gWasa(lv);
  if(cat==="jikan")return gJikan(lv);
  if(cat==="kakebun")return gKakebun(lv);
  if(cat==="noudo")return gNoudo(lv);
  if(cat==="tabibito")return gTabibito(lv);
  if(cat==="hiritsu")return gHiritsu(lv);
  if(cat==="tsurukame")return gTsurukame(lv);
  if(cat==="kabusoku")return gKabusoku(lv);
  if(cat==="heikin")return gHeikin(lv);
  if(cat==="soneki")return gSoneki(lv);
  if(cat==="shigoto")return gShigoto(lv);
  if(cat==="nenrei")return gNenrei(lv);
  if(cat==="ueki")return gUeki(lv);
  if(cat==="ryuusui")return gRyuusui(lv);
  if(cat==="tsuuka")return gTsuuka(lv);
  if(cat==="shuuki")return gShuuki(lv);
  if(cat==="nichireki")return gNichireki(lv);
  if(cat==="kisokusei")return gKisokusei(lv);
  if(cat==="hayasahi")return gHayasahi(lv);
  if(cat==="shuugou")return gShuugou(lv);
  if(cat==="bairitsu")return gBairitsu(lv);
  if(cat==="shoukyo")return gShoukyo(lv);
  if(cat==="houjin")return gHoujin(lv);
  if(cat==="baai")return gBaai(lv);
  if(cat==="hireihanpi")return gHireihanpi(lv);
  if(cat==="machigai")return gMachi();
  return genBy(pick(["mix","kufuu","deci","frac","machigai"]),p);
}

/* ---------- set building ---------- */
function fromMissed(m){var q=JSON.parse(JSON.stringify(m.pay)); q._mid=m.id; return q;}
function buildMission(p){
  var list=[], due=dueMissed(p), cap=(p.type==="k5")?2:2, total=5;
  due.slice(0,cap).forEach(function(m){list.push(fromMissed(m));});
  var r=total-list.length, cats;
  if(p.type==="k5"){cats=shuffle(["hissan","hikizan","kuku","kuku","anzan"]).slice(0,r);}
  else{cats=["mix","kufuu","deci","frac","machigai"];
    while(cats.length<r)cats.push(pick(["mix","kufuu","deci","frac"]));
    cats=cats.slice(0,r);}
  shuffle(cats).forEach(function(c){list.push(genBy(c,p));});
  return list;
}
function buildPractice(cat,p,lv){
  var n=5, list=[], i;
  for(i=0;i<n;i++)list.push(genBy(cat,p,lv));
  return list;
}

/* ---------- quiz flow ---------- */
function startMission(){
  var p=P(), t=todayStr(), first=!(p.daily[t]&&p.daily[t].md);
  Q={mode:"mission",first:first,list:buildMission(p),i:0,ok:0,ms:0};
  nextQ();
}
function startPractice(cat,lv){
  Q={mode:"practice",cat:cat,lv:lv||null,list:buildPractice(cat,P(),lv),i:0,ok:0,ms:0,balanceBoost:isBalanceCat(P(),cat)};
  nextQ();
}
function startReview(){
  var p=P();
  var cats=(p.type==="k5")?K5CATS:K10CATS;
  // 既習カテゴリ（stats[cat].n > 0）
  var learned=cats.filter(function(c){ return p.stats[c]&&p.stats[c].n>0; });
  // missed から優先的に1〜2問
  var list=[], i, due=dueMissed(p);
  // missed優先（最大2問、ただし5問の範囲内）
  var missSlots=Math.min(due.length, learned.length>=2?2:1, 5);
  var missUsed=shuffle(due).slice(0,missSlots);
  missUsed.forEach(function(m){ list.push(fromMissed(m)); });
  // 残りを既習カテゴリからランダムに埋める
  var remain=5-list.length;
  if(learned.length===0){
    // 既習なしの場合は通常ミッション相当
    for(i=0;i<remain;i++) list.push(genBy(pick(cats),p));
  } else {
    var pool=[];
    for(i=0;i<remain;i++) pool.push(pick(learned));
    pool.forEach(function(c){ list.push(genBy(c,p)); });
  }
  Q={mode:"review", list:shuffle(list), i:0, ok:0, ms:0, review:true};
  nextQ();
}
/* 筆算のレベル選択（クリア順に解放・易しいレベルへ戻って反復可） */
function hsMaxOf(p,cat){ ensureLvProgress(p); return clampLv((p.lv&&p.lv[cat])||1); }
function showLevels(cat){
  var p=P(), mx=hsMaxOf(p,cat), label=CATL[cat];
  var desc={1:"2けた基礎",2:"2けた基礎",3:"2けた基礎",4:"2けた",5:"2けた",
    6:"3けた入門",7:"3けた入門",8:"3けた入門",9:"3けた発展",10:"3けた発展"};
  var h='<div class="scr">'+topBar("showHome()");
  h+='<div class="card"><h3>'+label+'：レベルを えらぶ</h3>'
    +'<p class="note">クリアすると つぎの レベルが ひらくよ。やさしい レベルで なんども れんしゅうも できる！</p><div class="tagrow">';
  for(var L=1;L<=10;L++){
    var locked=(L>mx+1), next=(L===mx+1);
    var cls="dan"+(L<=mx?" cl":(locked?" lk":""));
    h+='<button class="'+cls+'" '+(locked?"disabled":"")+' onclick="startPractice(\''+cat+'\','+L+')">Lv'+L+(next?" ✨":"")+'<br><span style="font-size:11px;font-weight:600">'+(desc[L]||"")+'</span></button>';
  }
  h+='</div><p class="note">✨ ＝ つぎの ちょうせん。5問中4問で つぎが ひらくよ</p></div></div>';
  render(h);
}
function showKuku(){
  var p=P(), h='<div class="scr">'+topBar("showHome()");
  h+='<div class="card"><h3>九九マスターへの みち</h3><div class="tagrow">';
  ORDER.forEach(function(dan,idx){
    var cls="dan"+(idx<p.kukuIdx?" cl":(idx>p.kukuIdx?" lk":""));
    h+='<button class="'+cls+'" '+(idx>p.kukuIdx?"disabled":"")+' onclick="kukuChallenge('+dan+')">'+dan+'の段</button>';
  });
  h+='</div>';
  if(p.kukuIdx>=ORDER.length)h+='<p style="font-weight:800;color:var(--amber-d)">🏆 ぜんだんマスター！</p>';
  else h+='<p>いまの目標：<b>'+ORDER[p.kukuIdx]+'の段</b>（9問中8問せいかいで つぎの段へ！）</p>';
  if(p.kukuIdx>=3)h+='<button class="btn sm amber" onclick="startPractice(\'kuku\')">ミックスれんしゅう（5問）</button>';
  h+='<p class="note">段のボタンをおすと 9問チャレンジが はじまるよ</p></div></div>';
  render(h);
}
function kukuChallenge(dan){
  var list=shuffle([1,2,3,4,5,6,7,8,9]).map(function(b){
    return {cat:"kuku",kind:"num",dan:dan,b:b,text:dan+"×"+b,say:dan+" かける "+b+" は？",ans:dan*b};
  });
  Q={mode:"kuku",dan:dan,list:list,i:0,ok:0,ms:0};
  nextQ();
}
function startTimed(cat){
  Q={mode:"timed",timed:true,cat:cat,ok:0,n:0,ms:0,end:Date.now()+60000,fin:false};
  Q.tInt=setInterval(function(){
    if(!Q||!Q.timed){return;}
    var s=Math.max(0,Math.ceil((Q.end-Date.now())/1000));
    var el=$("tleft"); if(el)el.textContent=s;
    if(s<=0)finishTimed();
  },250);
  Q.cur=genBy(cat,P());
  renderQ(Q.cur);
}
function quitQuiz(){
  if(confirm("とちゅうで やめる？")){
    if(Q&&Q.tInt)clearInterval(Q.tInt);
    try{ if(VOICE_REC)VOICE_REC.abort(); }catch(e){}
    try{speechSynthesis.cancel();}catch(e){}
    Q=null; showHome();
  }
}
function curQ(){return Q.timed?Q.cur:Q.list[Q.i];}
function nextQ(){
  if(Q.i>=Q.list.length){finishSet();return;}
  renderQ(Q.list[Q.i]);
}
function nextTimed(){
  if(!Q||Q.fin)return;
  if(Date.now()>=Q.end){finishTimed();return;}
  Q.cur=genBy(Q.cat,P());
  renderQ(Q.cur);
}

/* ---------- quiz render ---------- */
function saySafe(){var q=curQ(); if(q&&q.say)say(q.say);}
function padHTML(dot,okCall,fn){
  fn=fn||"padPress";
  var h='<div class="pad">',i;
  for(i=1;i<=9;i++)h+='<button onclick="'+fn+'(\''+i+'\')">'+i+'</button>';
  h+= dot? '<button onclick="'+fn+'(\'.\')">.</button>' : '<button style="visibility:hidden"></button>';
  h+='<button onclick="'+fn+'(\'0\')">0</button>';
  h+='<button onclick="'+fn+'(\'⌫\')">⌫</button>';
  h+='<button class="ok" onclick="'+okCall+'">こたえあわせ</button></div>';
  return h;
}
/* K10適応レベルの可視化: 現在Lv＋この10問の進み（●正解/✗ミス/○未）。次の判定までを体感できる。 */
function lvDotsHTML(p,cat){
  if(!LVL_CATS[cat])return"";
  var n=(p.stats[cat]&&p.stats[cat].n)||0, inblk=n%10;
  var rec=inblk>0?(p.recent[cat]||[]).slice(-inblk):[];
  var dots=""; for(var i=0;i<10;i++){ dots+=(i<inblk)?(rec[i]?"●":"✗"):"○"; }
  return '<span class="note">　Lv'+((p.lv&&p.lv[cat])||1)+'　'+dots+'</span>';
}
/* 5歳向け発展(K5DEV)の文章題に ふりがな(ruby) を付ける。表示テキストの漢字のみ対象。 */
var FURI5={"円":"えん","人":"にん","数":"かず","何":"なん","個":"こ","分":"ふん","時":"じ","間":"かん"};
function furi5(s){ return s.replace(/[円人数何個分時間]/g, function(c){ return '<ruby>'+c+'<rt>'+(FURI5[c]||"")+'</rt></ruby>'; }); }
function speechRecCtor(){ return window.SpeechRecognition||window.webkitSpeechRecognition||null; }
function voiceKukuHTML(q){
  if(!q||q.cat!=="kuku")return "";
  if(!speechRecCtor())return '<p class="note">このブラウザでは 音声こたえあわせは使えません</p>';
  return '<div class="voicebox"><button class="btn sm amber" onclick="startKukuVoice()">🎙 こえでこたえる</button>'
    +'<span class="note">「'+q.dan+' '+q.b+' '+q.ans+'」のように言ってね</span></div>';
}
function normVoiceText(s){
  return String(s||"").toLowerCase()
    .replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0);})
    .replace(/[\s　、。,.!?！？ー\-]/g,"")
    .replace(/掛ける|かける|かけ|×|x/g,"");
}
var JP_UNIT={ぜろ:0,れい:0,いち:1,ひと:1,に:2,ふた:2,さん:3,よん:4,し:4,ご:5,ろく:6,なな:7,しち:7,はち:8,きゅう:9,く:9};
var KAN_UNIT={"〇":0,"零":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
function jpUnitValue(w){ return JP_UNIT[w]; }
function addCand(out,n){ n=parseInt(n,10); if(!isNaN(n)&&n>=0&&n<=99)out[n]=1; }
function addKanaUnitCandidates(s,out){
  var units=Object.keys(JP_UNIT).sort(function(a,b){return b.length-a.length;}), i=0, j, u, hit;
  while(i<s.length){
    hit=false;
    for(j=0;j<units.length;j++){
      u=units[j];
      if(s.slice(i,i+u.length)===u){addCand(out,JP_UNIT[u]); i+=u.length; hit=true; break;}
    }
    if(!hit)i++;
  }
}
function voiceCandidates(raw){
  var spaced=String(raw||"").replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0);});
  var s=normVoiceText(raw), out={}, m, re, u;
  re=/\d+/g; while((m=re.exec(spaced)))addCand(out,m[0]);
  for(u in KAN_UNIT){ if(s.indexOf(u)>=0)addCand(out,KAN_UNIT[u]); }
  re=/([一二三四五六七八九]?)[十拾]([一二三四五六七八九]?)/g;
  while((m=re.exec(s)))addCand(out,(m[1]?KAN_UNIT[m[1]]:1)*10+(m[2]?KAN_UNIT[m[2]]:0));
  addKanaUnitCandidates(s,out);
  var units=Object.keys(JP_UNIT).sort(function(a,b){return b.length-a.length;}).join("|");
  re=new RegExp("(?:"+units+")?じゅう(?:"+units+")?","g");
  while((m=re.exec(s))){
    var phrase=m[0], a=phrase.split("じゅう")[0], b=phrase.split("じゅう")[1];
    addCand(out,(a?jpUnitValue(a):1)*10+(b?jpUnitValue(b):0));
  }
  return out;
}
function startKukuVoice(){
  if(JLOCK)return;
  var C=speechRecCtor(), q=curQ();
  if(!C||!q||q.cat!=="kuku"){flashMsg("音声こたえあわせは使えません");return;}
  try{ if(VOICE_REC)VOICE_REC.abort(); }catch(e){}
  var rec=new C(); VOICE_REC=rec;
  rec.lang="ja-JP"; rec.interimResults=false; rec.maxAlternatives=3;
  var msg=$("nmsg"); if(msg){msg.textContent="きいています…"; msg.style.color="var(--green-d)";}
  rec.onerror=function(){ if($("nmsg"))$("nmsg").textContent="ききとれませんでした。数字でもこたえられます"; };
  rec.onend=function(){ if(VOICE_REC===rec)VOICE_REC=null; };
  rec.onresult=function(ev){
    var texts=[], i, res=ev.results&&ev.results[0];
    if(res)for(i=0;i<res.length;i++)texts.push(res[i].transcript||"");
    var raw=texts.join(" "), cand=voiceCandidates(raw);
    var ok=!!(cand[q.dan]&&cand[q.b]&&cand[q.ans]);
    if($("ansl"))$("ansl").textContent=raw||"？";
    afterJudge(ok,q,{ansHTML:String(q.ans),top:ok?"こえで 3つ ききとれた！":"きこえたこと："+esc(raw||"")});
  };
  try{rec.start();}catch(e){flashMsg("音声を開始できませんでした");}
}
function renderQ(q){
  JLOCK=false; BUF=""; Q.t0=Date.now();
  var p=P(), h='<div class="scr qwrap">';
  h+='<div class="top"><button class="backbtn" onclick="quitQuiz()">✕ やめる</button><span class="sp"></span>';
  if(Q.timed)h+='<span class="chip fire">⏱ <span id="tleft">'+Math.max(0,Math.ceil((Q.end-Date.now())/1000))+'</span>秒</span><span class="chip kago">'+Q.ok+'問</span>';
  else h+='<span class="chip">'+(Q.i+1)+' / '+Q.list.length+'</span>';
  h+='</div>';
  h+='<div class="qmeta"><span>'+(CATL[q.cat]||"")+(q._mid?"　🦋にがした虫！":"")+lvDotsHTML(p,q.cat)+'</span>'
    +(q.say?'<button class="spk" onclick="saySafe()">🔊 よむ</button>':"")+'</div>';
  if(q.kind==="num"){
    var isWord=(K5DEV.indexOf(q.cat)>=0||K10DEV.indexOf(q.cat)>=0);  /* 文章題は「こたえ」表示。ふりがなは5歳発展のみ */
    var qt=(K5DEV.indexOf(q.cat)>=0)?furi5(q.text):q.text;
    h+='<div class="qcard"><div class="qtext'+(isWord?" word":(q.text.length>9?" mid":""))+'">'+qt+(isWord?'':' ＝')+'</div>'
      +'<div>'+(isWord?'<span class="note">こたえ </span>':'')+'<span class="ansline" id="ansl">？</span></div>'
      +(q.cat==="kuku"?voiceKukuHTML(q):"")
      +'<div class="note" id="nmsg" style="min-height:20px"></div>'
      +padHTML(!!q.dot,"submitNum()")+'</div>';
  }else if(q.kind==="hissan"){
    var sub=(q.cat==="hikizan");
    var cs=sub?borrowsOf(q.a,q.b):carriesOf(q.a,q.b);
    HS={op:sub?"sub":"add",a:q.a,b:q.b,sum:sub?(q.a-q.b):(q.a+q.b),cols:cs.cols,need:cs.need,carries:[],bor:[],ans:[],act:{t:"a",i:0},counted:false};
    for(var i=0;i<HS.cols;i++){HS.carries.push("");HS.bor.push("");HS.ans.push("");}
    h+='<div class="qcard"><div id="hsbox">'+hsGridHTML()+'</div>'
      +'<div class="note" id="nmsg" style="min-height:20px"></div>'
      +padHTML(false,"hsSubmit()","hsPad")+'</div>';
  }else if(q.kind==="frac"){
    FR={w:"",n:"",d:"",act:"n"};
    h+='<div class="qcard"><div class="qtext mid">'+q.text+' ＝</div>'
      +'<div id="frbox">'+frBoxesHTML()+'</div>'
      +'<div class="note">こたえが整数なら ひだりの□だけでOK</div>'
      +'<div class="note" id="nmsg" style="min-height:20px"></div>'
      +padHTML(false,"frSubmit()","frPad")+'</div>';
  }else if(q.kind==="choice"){
    h+='<div class="qcard"><div class="qtext mid">'+q.text+'</div>'
      +'<p style="font-weight:700;margin:6px 0">まちがっている 行は どれ？</p><div class="lines">';
    q.lines.forEach(function(L,i){h+='<button onclick="choiceTap('+i+')">'+L+'</button>';});
    h+='</div></div>';
  }
  h+='</div>';
  render(h);
  if(p.speech&&q.say)say(q.say);
}

/* ---------- inputs ---------- */
function flashMsg(t){var el=$("nmsg"); if(el){el.textContent=t; el.style.color="var(--red)"; el.style.fontWeight="700"; setTimeout(function(){if($("nmsg"))$("nmsg").textContent="";},1800);}}
function padPress(d){
  if(JLOCK)return;
  if(d==="⌫")BUF=BUF.slice(0,-1);
  else if(d==="."){if(BUF===""||BUF.indexOf(".")>=0)return; if(BUF.length<8)BUF+=d;}
  else if(BUF.length<8)BUF+=d;
  var el=$("ansl"); if(el)el.textContent=(BUF===""?"？":BUF);
}
function submitNum(){
  if(JLOCK)return;
  var q=curQ();
  if(BUF===""){flashMsg("こたえを いれてね");return;}
  var u=parseFloat(BUF);
  var ok=Math.abs(u-q.ans)<1e-6;
  afterJudge(ok,q,{ansHTML:(q.dot?fmtDec(q.ans):String(q.ans))});
}
function digAt(v,c){return Math.floor(v/Math.pow(10,c))%10;}
function hsGridHTML(){ return HS.op==="sub"?hsGridSubHTML():hsGridAddHTML(); }
function hsGridAddHTML(){
  var aS=String(HS.a), bS=String(HS.b), n=HS.cols, c, d, on;
  var h='<div class="hs" style="grid-template-columns:repeat('+(n+1)+',auto)">';
  h+='<span class="cell" style="height:36px"></span>';
  for(c=n-1;c>=0;c--){
    if(c>=1){on=(HS.act&&HS.act.t==="c"&&HS.act.i===c)?" on":"";
      h+='<button class="cell carry'+on+'" onclick="hsTap(\'c\','+c+')">'+HS.carries[c]+'</button>';}
    else h+='<span class="cell" style="height:36px"></span>';
  }
  h+='<span class="cell"></span>';
  for(c=n-1;c>=0;c--){d=(c<aS.length)?aS[aS.length-1-c]:""; h+='<span class="cell fix">'+d+'</span>';}
  h+='<span class="cell op">＋</span>';
  for(c=n-1;c>=0;c--){d=(c<bS.length)?bS[bS.length-1-c]:""; h+='<span class="cell fix">'+d+'</span>';}
  h+='<div class="rule"></div>';
  h+='<span class="cell"></span>';
  for(c=n-1;c>=0;c--){on=(HS.act&&HS.act.t==="a"&&HS.act.i===c)?" on":"";
    h+='<button class="cell inp'+on+'" onclick="hsTap(\'a\','+c+')">'+HS.ans[c]+'</button>';}
  h+='</div>';
  return h;
}
/* ひき算の筆算: 上の桁(c≧1)をタップ＝「その桁から下に1かす」。
   桁cがかすと c は1へり、c-1 は10ふえる(11のように)。チェーンも正しく計算。 */
function hsBorrowedInto(c){ return (c+1<HS.cols)&&!!HS.bor[c+1]; } /* c+1 が c にかした */
function hsWork(c){ return digAt(HS.a,c) - (HS.bor[c]?1:0) + (hsBorrowedInto(c)?10:0); }
function hsSubModified(c){ return !!HS.bor[c] || hsBorrowedInto(c); }
function hsGridSubHTML(){
  var bS=String(HS.b), aLen=String(HS.a).length, n=HS.cols, c, d, on;
  var h='<div class="hs" style="grid-template-columns:repeat('+(n+1)+',auto)">';
  /* くり下がりメモ行: その桁の「いまの値」(かりた/かした後)を表示。c≧1 はタップで切替 */
  h+='<span class="cell" style="height:36px"></span>';
  for(c=n-1;c>=0;c--){
    var show=hsSubModified(c)?String(hsWork(c)):"";
    if(c>=1) h+='<button class="cell bor" onclick="hsTap(\'b\','+c+')">'+show+'</button>';
    else h+='<span class="cell bor" style="border-style:solid">'+show+'</span>';
  }
  /* 被減数の行: 値がかわった桁は斜線 */
  h+='<span class="cell"></span>';
  for(c=n-1;c>=0;c--){
    d=(c<aLen)?String(HS.a)[aLen-1-c]:"";
    var cls="cell fix"+(d!==""&&hsSubModified(c)?" struck":"");
    h+='<span class="'+cls+'">'+d+'</span>';
  }
  h+='<span class="cell op">−</span>';
  for(c=n-1;c>=0;c--){d=(c<bS.length)?bS[bS.length-1-c]:""; h+='<span class="cell fix">'+d+'</span>';}
  h+='<div class="rule"></div>';
  h+='<span class="cell"></span>';
  for(c=n-1;c>=0;c--){on=(HS.act&&HS.act.t==="a"&&HS.act.i===c)?" on":"";
    h+='<button class="cell inp'+on+'" onclick="hsTap(\'a\','+c+')">'+HS.ans[c]+'</button>';}
  h+='</div>';
  return h;
}
function hsRefresh(){var el=$("hsbox"); if(el)el.innerHTML=hsGridHTML();}
function hsTap(t,i){
  if(t==="b"){ HS.bor[i]=HS.bor[i]?"":"1"; hsRefresh(); return; }
  HS.act={t:t,i:i}; hsRefresh();
}
function hsPad(d){
  if(JLOCK||!HS.act)return;
  if(HS.act.t==="c"){
    if(d==="⌫")HS.carries[HS.act.i]="";
    else if(d==="1")HS.carries[HS.act.i]="1";
    else{flashMsg((HS.op==="sub"?"くりさがり":"くりあがり")+"メモは 1 だよ");return;}
  }else{
    if(d==="⌫")HS.ans[HS.act.i]="";
    else{HS.ans[HS.act.i]=d; if(HS.act.i+1<HS.cols)HS.act={t:"a",i:HS.act.i+1};}
  }
  hsRefresh();
}
function hsSubmit(){
  if(JLOCK)return;
  var q=curQ(), p=P(), i, miss=false, extra=false, sub=(HS.op==="sub");
  for(i=1;i<HS.cols;i++){
    var mark=sub?HS.bor[i]:HS.carries[i];
    if(HS.need[i]&&!mark)miss=true;
    if(!HS.need[i]&&mark)extra=true;
  }
  if(miss){
    if(!HS.counted){p.carryMiss++;HS.counted=true;save();}
    flashMsg(sub?"✏️ うえの けたを タップして くりさがりしてね！":"✏️ くりあがりを かいてから こたえあわせ！");
    return;
  }
  for(i=0;i<HS.cols;i++)if(HS.ans[i]===""){flashMsg("こたえの けたを ぜんぶ いれてね");return;}
  var s="";
  for(i=HS.cols-1;i>=0;i--)s+=HS.ans[i];
  var ok=(parseInt(s,10)===HS.sum), warn=null;  /* 数値比較: 先頭0(例 09)も正解に（"09"==="9"問題の修正） */
  if(extra){warn="✏️ "+(HS.op==="sub"?"くりさがり":"くりあがり")+"が ない けたに メモが あるよ"; if(!HS.counted){p.carryMiss++;HS.counted=true;}}
  afterJudge(ok,q,{ansHTML:String(HS.sum),warn:warn});
}
function frBoxesHTML(){
  function bx(f,v){var on=(FR.act===f)?" on":""; return '<button class="frbox'+on+'" onclick="frTap(\''+f+'\')">'+v+'</button>';}
  return '<div class="frwrap">'+bx("w",FR.w)
    +'<div class="frcol">'+bx("n",FR.n)+'<div class="bar"></div>'+bx("d",FR.d)+'</div></div>';
}
function frRefresh(){var el=$("frbox"); if(el)el.innerHTML=frBoxesHTML();}
function frTap(f){FR.act=f; frRefresh();}
function frPad(d){
  if(JLOCK)return;
  var f=FR.act;
  if(d==="⌫")FR[f]=FR[f].slice(0,-1);
  else if(d===".")return;
  else if(FR[f].length<3)FR[f]+=d;
  frRefresh();
}
function frSubmit(){
  if(JLOCK)return;
  var q=curQ(), a=q.ans;
  var hasN=(FR.n!==""), hasD=(FR.d!=="");
  if(hasN!==hasD){flashMsg("分子と分母は セットで いれてね");return;}
  if(!hasN&&FR.w===""){flashMsg("こたえを いれてね");return;}
  var W=(FR.w==="")?0:parseInt(FR.w,10);
  if(hasN){
    var N=parseInt(FR.n,10), D=parseInt(FR.d,10);
    if(!D){flashMsg("分母は 1いじょうに してね");return;}
    var num=W*D+N, den=D;
    var eq=(num*a.q===a.p*den);
    if(eq&&gcd(N,D)>1){afterJudge(false,q,{ansHTML:fmtFrac(a.p,a.q),top:"おしい！まだ 約分できるよ"});return;}
    if(eq&&W>0&&N>=D){afterJudge(false,q,{ansHTML:fmtFrac(a.p,a.q),top:"分子は 分母より 小さくしよう"});return;}
    afterJudge(eq,q,{ansHTML:fmtFrac(a.p,a.q)});
  }else{
    afterJudge(W*a.q===a.p,q,{ansHTML:fmtFrac(a.p,a.q)});
  }
}
function choiceTap(i){
  if(JLOCK)return;
  var q=curQ();
  afterJudge(i===q.ans,q,{fix:q.fixmsg});
}

/* ---------- judge / record ---------- */
function recordStat(cat,ok,ms){
  var p=P(), t=todayStr();
  var s=p.stats[cat]||(p.stats[cat]={ok:0,n:0,ms:0});
  s.n++; if(ok)s.ok++; s.ms+=ms;
  var r=p.recent[cat]||(p.recent[cat]=[]);
  r.push(ok?1:0); while(r.length>20)r.shift();
  var d=p.daily[t]||(p.daily[t]={n:0,ok:0});
  d.n++; if(ok)d.ok++; d.ms=(d.ms||0)+ms;
  p.lastDone=p.lastDone||{}; p.lastDone[cat]=t;  /* まんべんなく学習: カテゴリ別の最終学習日 */
}
function handleMissed(q,ok,o){
  var p=P(), t=todayStr(), i;
  if(q._mid){
    for(i=0;i<p.missed.length;i++){
      if(p.missed[i].id===q._mid){
        if(ok){p.missed.splice(i,1);p.recapture++;o.recap=true;}
        else{p.missed[i].due=dShift(t,2);p.missed[i].tries++;}
        break;
      }
    }
  }else if(!ok){
    var pay=JSON.parse(JSON.stringify(q)); delete pay._mid;
    p.missed.push({id:Date.now()+""+ri(100,999),pay:pay,due:dShift(t,1),tries:0});
    while(p.missed.length>40)p.missed.shift();
  }
}
function afterJudge(ok,q,o){
  if(JLOCK)return; JLOCK=true;
  o=o||{};
  var ms=Date.now()-Q.t0; Q.ms+=ms;
  var p=P();
  if(Q.timed){
    Q.n++; if(ok)Q.ok++;
    var fb=document.createElement("div"); fb.className="fb";
    fb.innerHTML='<div class="fbmark '+(ok?"ok":"ng")+'" style="font-size:90px">'+(ok?"⭕":"❌")+'</div>';
    document.body.appendChild(fb);
    setTimeout(function(){fb.remove(); JLOCK=false; nextTimed();},380);
    return;
  }
  if(ok)Q.ok++;
  recordStat(q.cat,ok,ms);
  handleMissed(q,ok,o);
  /* 適応レベル: 10問ごとに直近10問で判定（8↑でLv+1 / 6↓でLv-1、最大10/最小1）。特殊進行カテゴリは下で個別処理。 */
  if(LVL_CATS[q.cat] && q.cat!=="hissan" && q.cat!=="hikizan" && q.cat!=="kuku" && !(Q&&Q.lv)){
    if(!p.lv)p.lv={}; if(p.lv[q.cat]==null)p.lv[q.cat]=1;
    var s10=p.stats[q.cat];
    if(s10 && s10.n>0 && s10.n%10===0){
      var ok10=(p.recent[q.cat]||[]).slice(-10).reduce(function(x,y){return x+y;},0);
      if(ok10>=8 && p.lv[q.cat]<10){ p.lv[q.cat]++; o.lvup="📈 "+(CATL[q.cat]||q.cat)+" レベル"+p.lv[q.cat]+"に アップ！"; }
      else if(ok10<=6 && p.lv[q.cat]>1){ p.lv[q.cat]--; }
    }
  }
  /* 自動進級はミッション/おまかせ練習のみ（レベル選択練習 Q.lv では行わない） */
  if(q.cat==="hissan"&&p.type==="k5"&&!(Q&&Q.lv)){
    if(!p.lv)p.lv={}; if(p.lv.hissan==null)p.lv.hissan=1;
    if(ok){p.hsRun=(p.hsRun>=0)?p.hsRun+1:1;
      if(p.hsRun>=5&&p.lv.hissan<10){p.lv.hissan++;p.hsRun=0;syncLegacyFromLv(p);o.lvup="📈 たし算ひっさん Lv"+p.lv.hissan+"に アップ！";}}
    else{p.hsRun=(p.hsRun<=0)?p.hsRun-1:-1;
      if(p.hsRun<=-3&&p.lv.hissan>1){p.lv.hissan--;p.hsRun=0;syncLegacyFromLv(p);}}
  }
  if(q.cat==="hikizan"&&p.type==="k5"&&!(Q&&Q.lv)){
    if(!p.lv)p.lv={}; if(p.lv.hikizan==null)p.lv.hikizan=1;
    if(p.hkLevel==null){p.hkLevel=1;} if(p.hkRun==null){p.hkRun=0;}
    if(ok){p.hkRun=(p.hkRun>=0)?p.hkRun+1:1;
      if(p.hkRun>=5&&p.lv.hikizan<10){p.lv.hikizan++;p.hkRun=0;syncLegacyFromLv(p);o.lvup="📈 ひき算ひっさん Lv"+p.lv.hikizan+"に アップ！";}}
    else{p.hkRun=(p.hkRun<=0)?p.hkRun-1:-1;
      if(p.hkRun<=-3&&p.lv.hikizan>1){p.lv.hikizan--;p.hkRun=0;syncLegacyFromLv(p);}}
  }
  /* 九九: ミッション/おまかせ練習の周回で「いまの目標の段」を8回正解したら次の段へ進級（5歳）。
     専用の九九チャレンジ(Q.mode==='kuku')は別ロジックで進級するため除外し二重進級を防ぐ。 */
  if(q.cat==="kuku"&&p.type==="k5"&&!(Q&&Q.lv)&&!(Q&&Q.mode==='kuku')&&p.kukuIdx<ORDER.length){
    if(p.kukuHits==null)p.kukuHits=0;
    var ktarget=ORDER[Math.min(p.kukuIdx,ORDER.length-1)];
    if(ok && q.dan===ktarget){
      p.kukuHits++;
      if(p.kukuHits>=8){
        p.kukuClear[ktarget]=1; p.kukuIdx++; p.kukuHits=0;
        if(!p.lv)p.lv={}; p.lv.kuku=legacyKukuToLv(p);
        o.lvup="🎉 "+ktarget+"の段 マスター！"+(p.kukuIdx<ORDER.length?"つぎは "+ORDER[p.kukuIdx]+"の段！":"九九 ぜんぶ クリア！🏆");
      }
    }
  }
  /* 正解時に採集エンジンを進める（タイムアタック中は行わない） */
  if(ok && window.Q4BReward){
    ensureColl(p);
    var iid=q.cat+':'+(q.text||q.say||'');  // 同じ問題の連打を検知（新しさ係数）
    /* レアブースト: 復習=2.0、発展(難問)=1.5(中間)、まんべんなく=2.0、通常=1.0 */
    var _isHatten=(K5DEV.indexOf(q.cat)>=0||K10DEV.indexOf(q.cat)>=0);
    var _boost=(Q&&Q.review)?Q4BReward.REVIEW_BOOST:(_isHatten?Q4BReward.HATTEN_BOOST:((Q&&Q.balanceBoost)?Q4BReward.REVIEW_BOOST:1));
    var got=Q4BReward.onCorrect(p.coll,'keisan', 8, _boost, iid);
    if(got) o.capture=got;
  }
  logLv(p,q.cat);  /* この問題のカテゴリの現在Lvを記録（推移グラフ用・同日上書き） */
  save();
  showFB(ok,q,o,ms);
}
function showFB(ok,q,o,ms){
  var p=P();
  var h='<div class="fb"><div class="fbcard">';
  h+='<div class="fbmark '+(ok?"ok":"ng")+'">'+(ok?"⭕":"❌")+'</div>';
  h+='<h3>'+(ok?"せいかい！":"ざんねん…")+'</h3>';
  if(o.top)h+='<p style="font-weight:800;color:var(--amber-d)">'+o.top+'</p>';
  if(o.recap)h+='<p style="font-weight:800;color:var(--amber-d)">🦋 にがした虫を とりもどした！</p>';
  if(!ok&&o.ansHTML)h+='<div class="fbans">こたえ：'+o.ansHTML+'</div>';
  if(!ok&&o.fix)h+='<div class="fbans" style="font-size:20px">'+o.fix+'</div>';
  if(q.hint)h+='<div class="fbhint">💡 '+q.hint+'</div>';
  if(o.warn)h+='<div class="fbhint">'+o.warn+'</div>';
  if(o.lvup)h+='<p style="font-weight:800;color:var(--green)">'+o.lvup+'</p>';
  if(o.capture&&window.Q4BReward){
    /* 捕獲は「つぎへ」後に あみ振り演出 → リビール（ワクワクのワンクッション） */
    __keiCatch=o.capture;
    h+='<div style="background:var(--green-l);border-radius:14px;padding:10px;margin:8px 0;text-align:center;font-weight:800;color:var(--green-d)">🍃 あみに なにか かかった…!<br><span class="note" style="color:var(--sub)">「つぎへ」で あみを ふろう</span></div>';
  }
  if(p.type==="k10")h+='<p class="note">⏱ '+(ms/1000).toFixed(1)+'秒</p>';
  h+='<button class="btn amber" onclick="fbNext()">つぎへ ▶</button></div></div>';
  app.insertAdjacentHTML("beforeend",h);
}
var __keiCatch=null;
function fbNext(){
  var f=document.querySelector(".fb"); if(f)f.remove();
  if(__keiCatch&&window.Q4BReward){
    var got=__keiCatch; __keiCatch=null;
    Q4BReward.netSwing(function(){ showKeiCatch(got); });
    return; /* keiCatchDone() が つぎへ すすむ */
  }
  JLOCK=false; Q.i++; nextQ();
}
function showKeiCatch(got){
  var sp=got.sp, tags=[];
  if(got.isNew)tags.push('✨ NEW！ずかん登録'); else if(got.isRecord)tags.push('📏 じこベスト更新');
  if(got.shiny&&!got.isNew)tags.push('✨いろちがい');
  app.insertAdjacentHTML("beforeend",'<div class="modal" id="md"><div class="mcard" style="text-align:center">'
    +'<div style="font-weight:800;font-size:18px">🧺 つかまえた！</div>'
    +'<div style="width:120px;height:120px;margin:8px auto">'+Q4BReward.svg(sp,got.shiny)+'</div>'
    +'<div style="font-weight:800;font-size:17px">'+esc(sp.jaName)+(got.shiny?' ✨':'')+'</div>'
    +'<div style="font-size:13px;color:var(--sub)">'+got.size+'mm　<span class="rtag r'+Q4BReward.tierOf(sp)+'">'+Q4BReward.TIERNAME[got.tier]+'</span></div>'
    +(tags.length?'<div class="note" style="color:var(--amber-d);font-weight:800;margin-top:4px">'+tags.join('　')+'</div>':"")
    +'<button class="btn" style="margin-top:12px" onclick="keiCatchDone()">つづける ▶</button></div></div>');
}
function keiCatchDone(){ var m=$("md"); if(m)m.remove(); JLOCK=false; Q.i++; nextQ(); }

/* ---------- finish ---------- */
function fmtSec(ms){return (Math.round(ms/100)/10).toFixed(1)+"秒";}
function best5Key(q,p){
  if(q.mode==="practice")return q.cat;
  if(q.mode==="mission")return "mission_"+p.type;
  return null;
}
function updateBest5(p,q,N){
  var key, old;
  if(N!==5||q.ok!==N)return "";
  key=best5Key(q,p);
  if(!key)return "";
  p.best5=p.best5||{};
  old=p.best5[key];
  if(!old||q.ms<old){
    p.best5[key]=q.ms;
    return "🏁 5問ぜんぶ正解！自己ベスト "+fmtSec(q.ms);
  }
  return "🏁 5問ぜんぶ正解！自己ベスト "+fmtSec(old);
}
function finishSet(){
  var p=P(), t=todayStr(), N=Q.list.length;
  var scoreLine="せいかい "+Q.ok+"／"+N+"　⏱ "+Math.round(Q.ms/1000)+"秒";
  var best5Line=updateBest5(p,Q,N);
  if(Q.mode==="review"){
    updateProgressSummary(p);
    save();
    var win=(Q.ok>=Math.ceil(N*0.8))&&(Math.random()<0.3);
    if(win){showCapture(gachaPull(p),"ふくしゅう！ "+scoreLine);return;}
    showSetResult("ふくしゅうおわり！",[scoreLine,"8わり正解で めずらしい虫が でやすいよ！"],"startReview()");
    return;
  }
  if(Q.mode==="kuku"){
    var pass=(Q.ok>=8), dan=Q.dan, msg;
    if(pass){
      if(p.kukuIdx<ORDER.length&&ORDER[p.kukuIdx]===dan){
        p.kukuClear[dan]=1; p.kukuIdx++;
        if(!p.lv)p.lv={}; p.lv.kuku=legacyKukuToLv(p);
        msg=dan+"の段 クリア！"+(p.kukuIdx<ORDER.length?" つぎは "+ORDER[p.kukuIdx]+"の段！":" 🏆ぜんだんマスター！");
      }else msg=dan+"の段 ばっちり！";
      updateProgressSummary(p);
      save();
      if(Math.random()<0.3){showCapture(gachaPull(p),msg);return;}
      showSetResult("クリア！",[msg,scoreLine],"showKuku()");
    }else{
      updateProgressSummary(p);
      save();
      showSetResult("もうすこし！",[dan+"の段　"+scoreLine,"9問中8問で クリアだよ"],"kukuChallenge("+dan+")");
    }
    return;
  }
  if(Q.mode==="mission"&&Q.first){
    var d=p.daily[t]||(p.daily[t]={n:0,ok:0});
    d.md=1;
    if(p.streak.last===dShift(t,-1))p.streak.n++;
    else if(p.streak.last!==t)p.streak.n=1;
    p.streak.last=t;
    updateProgressSummary(p);
    save();
    showCapture(gachaPull(p),"ミッションクリア！ 🔥れんぞく"+p.streak.n+"日　"+scoreLine+(best5Line?"　"+best5Line:""));
    return;
  }
  /* レベル選択練習: クリア(4/5以上)で つぎのレベルを解放。再挑戦は同レベル */
  if(Q.mode==="practice"&&Q.lv&&(Q.cat==="hissan"||Q.cat==="hikizan")){
    var cleared=(Q.ok>=4), key=Q.cat, unlocked=false;
    if(!p.lv)p.lv={};
    if(cleared&&Q.lv>=((p.lv&&p.lv[key])||1)&&Q.lv<10){ p.lv[key]=Q.lv+1; syncLegacyFromLv(p); logLv(p,key); unlocked=true; }
    updateProgressSummary(p);
    save();
    var msgs=[scoreLine];
    if(unlocked)msgs.push("🎉 Lv"+(Q.lv+1)+"が ひらいたよ！");
    else if(!cleared)msgs.push("5問中4問で つぎが ひらくよ。もういちど！");
    showSetResult(cleared?("Lv"+Q.lv+" クリア！"):"もうすこし！",msgs,"showLevels('"+Q.cat+"')");
    return;
  }
  updateProgressSummary(p);
  save();
  var win=(Q.ok>=Math.ceil(N*0.8))&&(Math.random()<0.3);
  if(win){showCapture(gachaPull(p),"やったね！ "+scoreLine+(best5Line?"　"+best5Line:""));return;}
  var retry=(Q.mode==="mission")?"startMission()":"startPractice('"+Q.cat+"')";
  showSetResult("おつかれさま！",[scoreLine].concat(best5Line?[best5Line]:[]).concat(["むしの けはい… にげられたみたい．","8わり正解で 30%のかくりつで つかまるよ"]),retry);
}
function showSetResult(title,lines,retryCall){
  var h='<div class="scr">'+topBar();
  h+='<div class="card center"><h2>'+title+'</h2>';
  lines.forEach(function(L){h+='<p style="font-weight:700">'+L+'</p>';});
  h+='<button class="btn amber" onclick="'+retryCall+'">もういちど</button>'
    +'<button class="btn ghost sm" onclick="showHome()">ホームへ</button></div></div>';
  render(h);
}
function finishTimed(){
  if(!Q||Q.fin)return; Q.fin=true;
  clearInterval(Q.tInt);
  var p=P(), cat=Q.cat, best=p.best[cat]||0, isBest=(Q.ok>best);
  if(isBest){p.best[cat]=Q.ok;save();}
  showSetResult("⏱ タイムアップ！",["60秒で "+Q.ok+"問 せいかい！",(isBest?"🏆 じこベスト こうしん！":"ベスト："+(p.best[cat]||0)+"問")],"startTimed('"+cat+"')");
}

/* ---------- boot ---------- */
function boot(){
  app=$("app");
  if(!window.QuestSave){ DB={v:1,act:null,profiles:[]}; showNewProfile(); return; }
  /* 起動時に他端末の更新を自動取り込み（pull）してから読み込む */
  var pull = QuestSave.syncDown ? QuestSave.syncDown().catch(function(){}) : Promise.resolve();
  pull.then(function(){
    return Promise.all([QuestSave.profiles(), QuestSave.load("keisan","_book"), QuestSave.load("keisan","_legacy")]);
  }).then(function(r){
    var reg=r[0]||[], book=r[1], legacy=r[2];
    /* レジストリ各プロフィールの per-profile エントリ "keisan <id>" を読む */
    return Promise.all(reg.map(function(rp){ return QuestSave.load("keisan", rp.id); }))
      .then(function(parts){
        DB={v:1, act:null, profiles:[]};
        var migrated=false, bookById={};
        if(book&&book.profiles)book.profiles.forEach(function(p){ if(p&&p.id)bookById[p.id]=p; });
        reg.forEach(function(rp,i){
          var p=parts[i];
          if(!p&&bookById[rp.id]){ p=bookById[rp.id]; migrated=true; }   /* 旧_book→per-profile へ移行 */
          if(p)DB.profiles.push(p);
        });
        /* レジストリが空（初回・レガシー）なら旧_book/legacy の profiles でシード */
        if(reg.length===0){ var src=book||legacy; if(src&&src.profiles){ DB.profiles=src.profiles.slice(); migrated=true; } }
        reconcile(reg);
        var progressMigrated=normalizeAllProgress();
        DB.act=QuestSave.currentProfile();
        if(!P()){ DB.act=DB.profiles.length?DB.profiles[0].id:null;
          if(DB.act)QuestSave.setCurrentProfile(DB.act); }
        var bz=window.Q4BBossZukan&&DB.act?Q4BBossZukan.load(DB.act):Promise.resolve();
        bz.then(function(){
          if((migrated||progressMigrated)&&DB.profiles.length)saveAll(); // 移行/正規化分を per-profile で一度だけ書き出す
          /* ポータルで選んだ子のホームへ直行（再選択は上のプロフィールチップから） */
          if(!DB.profiles.length)showNewProfile();
          else if(!P())showProfiles();
          else if(!P().type)chooseCourse(P());
          else showHome();
        }).catch(function(){
          if((migrated||progressMigrated)&&DB.profiles.length)saveAll();
          if(!DB.profiles.length)showNewProfile();
          else if(!P())showProfiles();
          else if(!P().type)chooseCourse(P());
          else showHome();
        });
      });
  });
}
boot();
