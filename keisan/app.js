/* keisan/app.js — けいさん昆虫ハンター 本体ロジック
   依存: shared/{storage,bugs,render,bespoke,reward,furigana,yomi}.js（先に読み込み）
   構成: 定数/プロフィール → マスター虫/報酬 → 問題生成器 → 出題ループ → 画面描画
   ※ classic script。onclick属性から参照されるためグローバル関数を維持（IIFEで囲まない）。 */

"use strict";
var DB={v:1, act:null, profiles:[]};
var KZ_Q="", KZ_R="", KZ_C="", KZ_COMP=false, KZ_FAV=false, KZ_SHINY=false, KZ_HIDE_UNK=false, KZ_REARED=false, KZ_PLURAL=false, KZ_EGG=false, KZ_PAIR=false;
var KEISAN_MASTER_OPEN=(function(){try{var v=localStorage.getItem("q4b_keisan_master_open");return v===null?true:v==="1";}catch(_){return true;}})();
function setKeisanMasterOpen(v){ KEISAN_MASTER_OPEN=!!v; try{localStorage.setItem("q4b_keisan_master_open",v?"1":"0");}catch(_){} }

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
/* 図鑑詳細モーダルのお気に入りハート: トグル → 保存 → ボタン差し替え。 */
window.keisanFavTap=function(id){
  var p=P(); if(!p||!p.coll||!window.Q4BReward) return;
  Q4BReward.toggleFavorite(p.coll, id);
  save();
  var btn=document.querySelector('.q4b-fav-btn[data-bugid="'+id+'"]');
  if(btn){
    var nh=Q4BReward.favoriteButtonHTML(p.coll, id, "keisanFavTap('"+id+"')");
    var tmp=document.createElement('div'); tmp.innerHTML=nh;
    btn.replaceWith(tmp.firstChild);
  }
};
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
function zukanSearchTextK(sp){
  return [sp.id,sp.jaName,sp.scientificName,sp.orderJa,sp.familyJa,sp.groupJa].filter(Boolean).join(" ").toLowerCase();
}
function zukanClassKeyK(sp){ return sp.familyJa||sp.orderJa||sp.groupJa||""; }
function zukanClassOptionsK(list){
  var seen={}, out=[];
  list.forEach(function(sp){ var k=zukanClassKeyK(sp); if(k&&!seen[k]){seen[k]=1; out.push(k);} });
  return out.sort(function(a,b){ return a.localeCompare(b,"ja"); });
}
function zukanMatchK(sp){
  var q=(KZ_Q||"").trim().toLowerCase();
  if(KZ_R!=="" && String(Q4BReward.tierOf(sp))!==String(KZ_R))return false;
  if(KZ_C!=="" && zukanClassKeyK(sp)!==KZ_C)return false;
  if(KZ_FAV){ var p=P(); if(!p||!Q4BReward.isFavorite(p.coll,sp.id)) return false; }
  if(KZ_SHINY){ var p2=P(); var e=p2&&p2.coll&&p2.coll.catches&&p2.coll.catches[sp.id]; if(!e||!e.shiny) return false; }
  if(KZ_HIDE_UNK){ var p3=P(); var e3=p3&&p3.coll&&p3.coll.catches&&p3.coll.catches[sp.id]; if(!e3) return false; }
  if(KZ_REARED){ var p4=P(); if(!Q4BReward.hasReared||!Q4BReward.hasReared(p4&&p4.coll,sp.id))return false; }
  if(KZ_PLURAL){ var p5=P(); var e5=p5&&p5.coll&&p5.coll.catches&&p5.coll.catches[sp.id]; if(!e5||(e5.n||0)<2)return false; }
  if(KZ_EGG){ var cntE=Q4BReward.eggsForSpecies?Q4BReward.eggsForSpecies(sp.id).total:0; if(cntE<=0)return false; }
  if(KZ_PAIR){ var p6=P(); if(!Q4BReward.hasBothSexes||!Q4BReward.hasBothSexes(p6&&p6.coll,sp.id))return false; }
  if(q && zukanSearchTextK(sp).indexOf(q)<0)return false;
  return true;
}
function setKZQ(v){KZ_Q=v||"";showZukan();setTimeout(function(){var e=$("kzq");if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length);}},0);}
/* IME 入力中は input 再生成しない。isComposing チェック + 250ms debounce */
var KZ_Q_T=null;
function kzInput(el,ev){
  if(ev&&ev.isComposing){ KZ_Q=el.value; return; }
  clearTimeout(KZ_Q_T);
  KZ_Q_T=setTimeout(function(){ setKZQ(el.value); }, 250);
}
function setKZR(v){KZ_R=(KZ_R===String(v))?"":String(v);showZukan();}
function setKZC(v){KZ_C=v||"";showZukan();}
function setKZFav(){ KZ_FAV=!KZ_FAV; showZukan(); }
function setKZShiny(){ KZ_SHINY=!KZ_SHINY; showZukan(); }
function setKZHideUnk(){ KZ_HIDE_UNK=!KZ_HIDE_UNK; showZukan(); }
function setKZReared(){ KZ_REARED=!KZ_REARED; showZukan(); }
function setKZPlural(){ KZ_PLURAL=!KZ_PLURAL; showZukan(); }
function setKZEgg(){ KZ_EGG=!KZ_EGG; showZukan(); }
function setKZPair(){ KZ_PAIR=!KZ_PAIR; showZukan(); }
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
/* 卵育成: fossilFragments を卵コストに再利用 + 卵 store を breeding namespace に */
if(window.Q4BReward&&window.QuestSave&&Q4BReward.setFossilStore){
  Q4BReward.setFossilStore({
    get:function(){return QuestSave.fossilOf?QuestSave.fossilOf(pidNow()):0;},
    spend:function(n){return QuestSave.spendFossil?QuestSave.spendFossil(pidNow(),n):false;}
  });
}
if(window.Q4BReward&&window.QuestSave&&Q4BReward.setEggStore){
  Q4BReward.setEggStore({
    get:function(){return QuestSave.breedingOf?QuestSave.breedingOf(pidNow()):{eggs:[],pendingEggs:[],stats:{totalAbandoned:0}};},
    save:function(s){return QuestSave.breedingSet?QuestSave.breedingSet(pidNow(),s):false;}
  });
}
/* 卵生成 / 放棄 ハンドラ (Q4BZukan.detailHTML の opts.onLayEgg/onAbandonEgg から呼ばれる) */
function keisanLayEgg(spId){
  var p=P(); if(!p||!p.coll) return;
  var sp=window.Q4BReward&&Q4BReward.spById(spId); if(!sp) return;
  if(!window.Q4BBreeding) return;
  Q4BBreeding.openLayConfirm(sp,{onConfirm:function(sp){
    var egg=Q4BReward.layEgg(p.coll,sp);
    if(egg){
      save();
      var m=document.getElementById('modal'); if(m&&typeof closeModal==='function')closeModal();
      Q4BBreeding.notifyEggLaid(sp,{homeHref:"../index.html"});
    }
    else { alert('たまごを 産めませんでした'); }
  }});
}
function keisanAbandonEgg(spId){
  if(!confirm('この たまごを すてる? (返金なし)')) return;
  if(!confirm('ほんとうに すてる?')) return;
  if(Q4BReward.abandonEgg(spId)){ save(); var m=document.getElementById('modal'); if(m&&typeof closeModal==='function')closeModal(); }
}
function keisanHatchEgg(spId){
  var p=P(); if(!p) return;
  if(!p.coll) p.coll={catches:{},total:0};
  var r=Q4BReward.hatchEgg(p.coll, spId);
  if(!r){ alert('孵化できませんでした'); return; }
  save();
  var m=document.getElementById('modal'); if(m&&typeof closeModal==='function')closeModal();
  if(window.Q4BBreeding){
    Q4BBreeding.playHatchAnimation({egg:r.egg,sp:r.sp,size:r.size,onClose:function(){},onViewZukan:function(){}});
  }
}

/* ---------- labels ---------- */
var CATL={hissan:"たし算のひっさん", hikizan:"ひき算のひっさん", kuku:"九九", anzan:"あんざん",
  mix:"四則混合", kufuu:"工夫計算", deci:"小数", frac:"分数", machigai:"まちがいさがし", sougou:"総合",
  warizan:"わり算", wasa:"和差算", jikan:"時間けいさん", kakebun:"かけ算ぶんしょう", kukuyomi:"九九あんしょう",
  nanbanme:"なんばんめ",ikutsu:"いくつといくつ",kazoeru:"かずをかぞえる",ookii:"おおきいかず",nagasahikaku:"ながさくらべ",tokei1:"とけい",sansuu100:"100より大きい数",kuraidori:"くらいどり",nagasa:"ながさのたんい",kasa:"かさのたんい",bunsuu1:"はじめての分数",hyou:"ひょうとグラフ",amari:"あまりのあるわり算",omosa:"おもさのたんい",shousuu1:"はじめての小数",bunsuu2:"分数のたしひき",bouguraf:"ぼうグラフ",shikishiki:"□をつかった式",nichireki1:"時こくと時間",gairai:"がい数",menseki:"面積のたんい",kawariwari:"変わり方",kakuchishiki:"角の知識",shakaku:"四角形のなまえ",hakohako:"はこのなまえ",okane:"おかね",jisshuu:"10の合成と分解",
  noudo:"濃度", tabibito:"旅人算", hiritsu:"比",
  tsurukame:"つるかめ算", kabusoku:"過不足算", heikin:"平均算", soneki:"損益算", shigoto:"仕事算", nenrei:"年齢算", ueki:"植木算",
  ryuusui:"流水算", tsuuka:"通過算", shuuki:"周期算", nichireki:"日暦算", kisokusei:"規則性", hayasahi:"速さと比", shuugou:"集合算",
  bairitsu:"倍数算", shoukyo:"消去算", houjin:"方陣算", baai:"場合の数", hireihanpi:"比例反比例"};
var LV_LABELS={
  mix:{
    1:"たし算・ひき算ミックス", 2:"かけ算入り", 3:"わり算入り", 4:"かけ算・わり算を先に",
    5:"2段階計算", 6:"かっこを先に", 7:"かっこ×かけ算", 8:"2けた×2けた",
    9:"かっこ＋ひき算", 10:"総合チャレンジ"
  },
  wasa:{
    1:"1品のおつり", 2:"合計・差", 3:"2品のおつり・3数の合計", 4:"合計からもう片方",
    5:"差からもう片方", 6:"合計と差から多い方", 7:"合計と差から少ない方",
    8:"3人の基準差", 9:"和差算＋おつり", 10:"3人・条件2つ"
  }
};
function lvLabel(cat,lv){ var m=LV_LABELS[cat]; return m?m[clampLv(lv)]:""; }
var LEVEL_GUIDE={
  hissan:["2けた＋1けた","2けた＋2けた","くり上がりあり","くり上がり1回","くり上がり2回","3けた＋1けた","3けた＋2けた","3けた＋3けた","くり上がり2回以上","4けた＋4けた"],
  hikizan:["2けた−1けた","2けた−2けた","くり下がりあり","くり下がり1回","くり下がり2回","3けた−1けた","3けた−2けた","3けた−3けた","くり下がり2回以上","4けた−4けた"],
  kuku:["2の段","5の段","3の段","4の段","6の段","7の段","8の段","9の段","1の段","2〜9の段ミックス"],
  anzan:["1けた加減","2けた加減","かけ算入り","わり算入り","2段階計算","3けた加減","きりのいいかけ算","割り切れるわり算","2けた×2けた入門","暗算総合"],
  warizan:["九九でわる(小)","九九でわる(全)","2けた÷1けた","あまりあり2けた","3けた÷1けた","3けた÷1けた・商2けた","あまりあり3けた","2けたでわる","2けたでわる・あまりあり","商とあまり総合"],
  kufuu:["25×4型","125×8型","×99/101型","分配法則入門","連続5数の和","分配法則標準","×98/102型","分配＋複合","×101/99 大きめ","総合チャレンジ"],
  deci:["加算くり上がりなし","加算くり上がりあり","減算くり下がりなし","減算くり下がりあり","小数×整数","小数÷整数","小数×小数(小)","小数×小数(大)","単位換算","小数の四則総合"],
  frac:["同分母の加減","同分母の加減(範囲広)","異分母(片方が倍数)","異分母の通分","異分母標準","かけ算入門","わり算入門","四則ミックス入門","帯分数入り四則","分数総合"],
  machigai:["九九のミス","たし算のミス","ひき算のミス","符号ミス","順序ミス","かっこミス","小数ミス","分数ミス","複数行の確認","総合チェック"],
  sougou:["既習ミックス入門","既習ミックス基礎","既習ミックス標準","計算順序入り","かっこ入り","小数分数入り","発展混合","弱点復習","時間を意識","総合チャレンジ"],
  jikan:["同じ時の中の経過","次の正時まで","時をまたぐ(小)","時をまたぐ(標準)","開始時刻を求める","終了時刻を求める","時間と分を分に直す","大きめの時刻差","2段階(休憩はさみ)","時間総合"],
  kakebun:["1あたり×個数","個数を求める","単価を求める","2段階かけ算","かけ算標準(多場面)","わり算標準(等分・包含)","×÷混在","単位あたり","消費・残り","文章題総合"],
  kukuyomi:["2の段","5の段","3の段","4の段","6の段","7の段","8の段","9の段","1の段","全段ミックス"],
  nanbanme:["まえからなんばんめ","うしろからなんばんめ","なんばんめかこたえる","10までのれつ","なんばんめかこたえる(10)","なんばんめ と なんこ","りょうほうから","ことばで いちあて","あいだの にんずう","あいだに なんにん"],
  ikutsu:["5までの分解","5の分解","6・7の分解","8・9の分解","10は□と□（前半）","10は□と□（後半）","□と□で10","もういくつで10","3つに分ける","10をつくる応用"],
  kazoeru:["5までかぞえる","10までかぞえる","おおきいのは？","20までかぞえる","10ずつまとめる","100までかぞえる","2とび5とび","じゅんばん","1000までかぞえる","おなじかずのなかま"],
  ookii:["どっちおおい","20までくらべ","じゅんばん","なんばんめ","100までよむ","あいだのかず","10とびとび","30ばんめ","ふごう＜＞","□のかず"],
  nagasahikaku:["どっちがながい","3つくらべ","はしそろえ","まかせて比較","いくつぶん","マス目くらべ","cmはじまり","cmたしひき","cmとmm","ながさの応用"],
  tokei1:["ちょうどのじ","なんじはん","じ・じはんみわけ","あさひるよる","ふんのよみ5とび","なんじなんぷん","1ぷんきざみ","なんぷんあと","なんぷんまえ","あさひる12じ"],
  sansuu100:["100よみ","100だい","3けたよみ","3けたかき","くらべる","せんよみ","かずのせん","10ばい","100ばい","そうごう"],
  kuraidori:["10のまとまり","2けたのくらい","2けたをくみたて","100までのかず","100のまとまり","3けたのくらい","3けたをくみたて","1000までのかず","10のかたまり","10000までのくらい"],
  nagasa:["ながいのは？","いくつぶん","cmをしる","mmをしる","mをしる","ながさをよむ","たしざん","ひきざん","mとcm","ながさの問題"],
  kasa:["おおいすくない","コップでくらべ","Lをしる","dLをしる","LとdLかんさん","mLをしる","たしざんひきざん","LとdLのけいさん","くりあがるけいさん","たんいをえらぶ"],
  bunsuu1:["はんぶん","二分の一","三分の一","四分の一","よみかた","おなじ大きさ","くらべる","ずから よむ","なんこぶん","いろんな分数"],
  hyou:["かずをかぞえる","しゅるいわけ","ひょうをよむ","グラフをよむ","いちばんおおい","おおさくらべ","ぜんぶでいくつ","あてはまる","ふたつくらべ","よみとり名人"],
  amari:["あまりとは","÷2のあまり","÷3のあまり","商とあまり","÷4-6の練習","÷7-9の練習","たしかめ算","文しょう題①","文しょう題②","あまりの きまり"],
  omosa:["おもいのは","てんびん","g(グラム)","kgを よむ","1kg=1000g","gをkgに","kgとg","たしざん","t(トン)","そうごう"],
  shousuu1:["0.1のいみ","0.1なんこ","1は0.1","1より大きい","かずのせん","大小くらべ","たしざん","ひきざん","たんいへんかん","小数の文章"],
  bunsuu2:["ぶんすうよみ","ぶんすうのおおきさ","たしざんきほん","ひきざんきほん","1になるたしざん","1からひく","ぶんすうのいみ","もんだいぶん","3つのけいさん","1またぎけいさん"],
  bouguraf:["1めもり","おおきい","ちいさい","2めもり","5めもり","10めもり","あわせて","ちがい","じゅんい","よみとり"],
  shikishiki:["たす□小","□たす小","ひく□小","□ひく小","たし2けた","ひき2けた","かけ□","わり□","3けた式","文しょう□"],
  nichireki1:["なんじ","なんじはん","なんじなんぷん","1ぷんきざみ","なんぷんあと","なんぷんまえ","なんぷんかん","じこくをまたぐ","じかんとぷん","じこくと時間"],
  gairai:["10の位で四捨五入","切り上げ・切り捨て","100の位で四捨五入","1000の位で四捨五入","上から1けた","上から2けた","万の位までのがい数","がい数のたし算ひき算","がい数のかけ算わり算","がい数のはんい"],
  menseki:["ひろさくらべ","cm2を しる","せいほうけい","ちょうほうけい","おおきい数","m2を しる","たんいかんけい","a と ha","km2 と ふくざつ","おうよう"],
  kawariwari:["ペアでふえる","ひょうをよむ","きまりみつけ","ぼうのかず","わとさ いっしょ","ばいのかんけい","□と○のしき","ひれいよみ","つかってとく","変わり方マスター"],
  kakuchishiki:["ちょっかく","いろんなかく","はんかいてん","いっかいてん","ぶんどき","かくをよむ","かくのたしざん","かくのひきざん","さんかくのかく","おおきいかく"],
  shakaku:["へんのかず","ちょうてん","せいほうけい","ちょうほうけい","せいとちょう","へいこう","だいけい","ひしがた","たいかくせん","なかまわけ"],
  hakohako:["めんのかず","ちょうてん","へんのかず","まとめおぼえ","おなじめん","へいこうへん","ちょうてんあつまる","めんのかたち","みわけよう","そうごうもんだい"],
  okane:["1円と10円","10円と1円","50円・100円","100円までかぞえる","500円玉のとうじょう","おかねでかう","おつりはいくら","おなじきんがく","2つかってあわせる","おかいものマスター"],
  jisshuu:["10までかぞえる","10をつくる","10のなかま","あといくつ","10えん=1えん10まい","10のしき","10からひく","10といくつ","10をつくってたす","10からひいてたす"],
  noudo:["食塩水の全体量","食塩の量","濃さを求める","水を足す","食塩を足す","2液混合入門","2液混合標準","逆算(加水で薄める)","蒸発","濃度総合"],
  tabibito:["同じ向き","向かい合う","追いつき","出会いの時刻","距離を求める","速さを求める","途中変更","往復","複合条件","旅人算総合"],
  hiritsu:["比の約分","比から実数","2項配分","2項配分(差)","比の差逆算","3項配分","連比入門","連比標準","部分量から逆算","配分の複合"],
  tsurukame:["つる・かめ 基礎","つる・かめ 標準","つる・かめ 発展","値段違い2種 基礎","値段違い2種 標準","値段違い2種 発展","得点型","金額型(個数差)","3種つるかめ","金額＋個数差(発展)"],
  kabusoku:["余り型","不足型","2配り方の差","人数を求める","全体を求める","1人分を求める","差集め基本","差集め発展","長椅子型","部屋割り総合"],
  heikin:["単純平均(3個)","単純平均(5教科)","平均から合計","欠けた値(4個)","欠けた値(6個)","人数追加","2群の合成","部分平均逆算","次回必要点","複数回の目標平均"],
  soneki:["定価をつくる","利益","損失","利益率→定価","割引→売値","定価逆算","原価逆算","複数商品","定価＋割引","損益総合"],
  shigoto:["1日量×日数","全体÷1日量","全体÷日数","2人同時","片方の率逆算","3人同時","途中加勢","途中交代","人数変化","水槽注水"],
  nenrei:["年齢差","何年後","何年前","親子の和","親子の差","和差算","3人の和","N倍になる時","和＋倍率逆算","差＋倍率逆算"],
  ueki:["両端あり本数","両端なし本数","円形本数","両端あり全長","両端なし全長","円形一周","両端あり間隔逆算","円形間隔逆算","2段階(花配置)","道の両側"],
  ryuusui:["静水速度逆算","流速逆算","上下流速度","下りの時間","上りの距離","上りの時間","往復","いかだ","静水速度合成","流速合成"],
  tsuuka:["柱通過","信号機通過","トンネル通過","柱通過(標準)","列車長逆算","速さ逆算","すれ違い","追い越し","2列車長逆算","2列車速さ逆算"],
  shuuki:["くり返しの順番","何番目か","色や記号","周期のあまり","個数を数える","逆算入門","逆算標準","大きい番号","複合周期","周期算総合"],
  nichireki:["何日後","何日前","曜日の周期","月をまたぐ","日数を数える","誕生日型","カレンダー差","大きい日数","複合条件","日暦総合"],
  kisokusei:["等差の並び","次の数","何番目","図形の数","表で整理","逆算入門","規則を作る","2段階規則","図形発展","規則性総合"],
  hayasahi:["比+距離","比+時間","比+速さ","異時間+距離","異時間+速さ","異時間+道のり","旅人接続","往復の平均","出発時差","速さ変化"],
  shuugou:["どちらか一方","両方入る","全体を求める","どちらでもない","ベン図入門","ベン図標準","3集合入門","3集合標準","複合条件","集合算総合"],
  bairitsu:["何倍","増え方","減り方","割合接続","元を求める","比と倍","2段階の倍","逆算標準","複合条件","倍数算総合"],
  shoukyo:["同数消去(2式)","同数消去(3式)","同数消去(範囲広)","片方を倍","両方を倍(基本)","両方を倍(範囲広)","両方を倍(b)","両方を倍(b発展)","3量(2消去)","3量複合"],
  houjin:["正方形の全体","外周の数","内側の数","一辺を求める","全体から逆算","外周から逆算","中空方陣","ふちの厚さ","複合条件","方陣算総合"],
  baai:["組み合わせ入門","表で数える","順番あり","順番なし","場合分け","もれなく数える","条件つき","重なり注意","複合条件","場合の数総合"],
  hireihanpi:["比例の倍率","比例計算","反比例の意味","反比例計算","表から判別","式で表す","単位量","判別＋計算","逆算","比例複合"]
};
var ADV_LEVEL_LABELS=["入門","基礎","標準","標準発展","逆算入門","逆算標準","条件整理","複合条件","発展問題","総合チャレンジ"];
function levelGuide(cat){
  var a=LEVEL_GUIDE[cat], out=[], i;
  for(i=1;i<=10;i++) out.push((a&&a[i-1])||lvLabel(cat,i)||ADV_LEVEL_LABELS[i-1]);
  return out;
}
var K5CATS=["hissan","hikizan","kuku","kukuyomi","anzan","warizan"], K10CATS=["mix","kufuu","deci","frac","machigai","sougou"];
/* kukuyomi は基本側(K5CATS)に置く: 自分で練習の「九九」より暗唱の方が低レベルなのに発展側に
   あると逆転していた問題を是正。九九本体(kuku)の隣に並べて段階感を出す。 */
var K5DEV=["wasa","jikan","kakebun","nanbanme","ikutsu","kazoeru","ookii","nagasahikaku","tokei1","sansuu100","kuraidori","nagasa","kasa","bunsuu1","hyou","amari","omosa","shousuu1","bunsuu2","bouguraf","shikishiki","nichireki1","gairai","menseki","kawariwari","kakuchishiki","shakaku","hakohako","okane","jisshuu"], K10DEV=["noudo","tabibito","hiritsu","tsurukame","kabusoku","heikin","soneki","shigoto","nenrei","ueki","ryuusui","tsuuka","shuuki","nichireki","kisokusei","hayasahi","shuugou","bairitsu","shoukyo","houjin","baai","hireihanpi"];  /* 発展演習(コース別) */
var LVL_CATS={hissan:1,hikizan:1,kuku:1,anzan:1,warizan:1,wasa:1,jikan:1,kakebun:1,kukuyomi:1,nanbanme:1,ikutsu:1,kazoeru:1,ookii:1,nagasahikaku:1,tokei1:1,sansuu100:1,kuraidori:1,nagasa:1,kasa:1,bunsuu1:1,hyou:1,amari:1,omosa:1,shousuu1:1,bunsuu2:1,bouguraf:1,shikishiki:1,nichireki1:1,gairai:1,menseki:1,kawariwari:1,kakuchishiki:1,shakaku:1,hakohako:1,okane:1,jisshuu:1,
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
  return '<button class="chip kago" onclick="showZukan()">📖 '+cnt+'/'+tot+'</button>';
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
      +'<span>'+esc(p.name)+'<br><span class="note">'+(!p.type?"コースを えらぶ":(p.type==="k5"?"ビギナーコース":"受験チャレンジコース"))+'　🔥'+p.streak.n+'日　📖'+(function(q){ensureColl(q);return window.Q4BReward?Q4BReward.collectedCount(q.coll):capCount(q);})(p)+'匹</span></span></button>';
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
  /* M5: 旧 saveProfiles 直書きは p.updated を更新せず、 別端末の古いアイコンが
     LWW で勝ち戻る経路があった。 updateProfile 経由で updated も進める。 */
  if(window.QuestSave && QuestSave.updateProfile){
    QuestSave.updateProfile(id, {icon:profIcon(t)});
  }
  showHome();
}

/* ---------- home ---------- */
/* P3: missed を現在コース (k5 / k10) で許可された cat に限定する。 これがないと
   コース変更後に前コースの「にがした虫」がミッション・復習に混入する。 過去コース
   の missed は配列に残し、 コースを戻したら再利用できるようにする (フィルタのみ)。 */
function dueMissed(p){
  var t=todayStr();
  var allowed={};
  courseCats(p).forEach(function(c){ allowed[c]=true; });
  /* 計算ホームの sougou 等もコース別で扱う ── sougou は K10 経路に内含されるため
     courseCats が "sougou" を含むかは元の定義に従う。 */
  return p.missed.filter(function(m){
    if(!m || m.due>t) return false;
    if(!m.pay) return false;
    if(!allowed[m.pay.cat]) return false;
    return true;
  });
}
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
  var sub=leveled&&lvLabel(c,lv)?'<br><span style="font-size:11px;font-weight:700;opacity:.9">'+esc(lvLabel(c,lv))+'</span>':'';
  var mk=(mark==='low'||mark==='both')?' 🌟':(mark==='new'?' 🆕':'');
  /* 既習バッジ: Lv>=8 → レア度ひかえめ */
  var rare=(leveled&&lv>=8)?'<span style="display:inline-block;background:#EAEFE0;border:1.5px solid #B9C4A8;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700;color:#6B7A5E;margin-left:4px">📉 レア度ひかえめ</span>':'';
  return '<button class="btn sm ghost"'+(sty?' style="'+sty+'"':'')+' onclick="'+act+'">'+CATL[c]+mk+lvtag+rare+sub+'</button>';
}
/* 既習度ベースの boost. Lv >= 8 → BOOST_LOW (0.4). それ以外 1.0. */
function keisanCatBoost(p, cat){
  if(!window.Q4BReward) return 1;
  if(!LVL_CATS[cat]) return 1;
  var lv = (p && p.lv && p.lv[cat]) || 1;
  return lv >= 8 ? Q4BReward.BOOST_LOW : 1;
}
function showHome(){
  var p=P(); if(!p){showProfiles();return;}
  if(window.Q4BRender&&Q4BRender.setSessionActive) Q4BRender.setSessionActive(false);
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
  /* timed: 解放は永続化 (N3)。 旧コードは常に直近 20 問の現在値で再計算しており、
     タイムアタックで数問間違えると次回解放が消える、 復習や九九チャレンジの成績でも
     unlock 状態が動く、 という不安定さがあった。 一度達成したら p.timedUnlocked[c]
     を永続化して再ロックしない。 */
  if(!p.timedUnlocked) p.timedUnlocked={};
  var th=""; TIMED_OK[p.type].forEach(function(c){
    /* 適応バッファ p.adapt があればそちら優先 (timed/review の自己汚染を排除) */
    var adapt=(p.adapt&&p.adapt[c]);
    var rec = adapt ? adapt.recent : (p.recent[c]||[]);
    var n=rec.length, okn=rec.reduce(function(s,x){return s+x;},0);
    if(n>=20&&okn>=19){ p.timedUnlocked[c]=1; }
    var unlocked=!!p.timedUnlocked[c];
    var best=p.best[c];
    th+='<div class="row"><span>'+CATL[c]+(best?'<span class="note">　ベスト '+best+'問</span>':"")+'</span><span class="sp"></span>'
      +(unlocked?'<button class="backbtn" onclick="startTimed(\''+c+'\')">⏱ 60秒</button>'
                :'<span class="note">直近20問で19問正解で解放（いま '+okn+'/'+n+'）</span>')+'</div>';
  });
  h+='<div class="card"><h3>⏱ タイムアタック</h3>'+th+'</div>';
  // 復習ボタン（抜き打ち + 常設小ボタン）
  /* N2: 発展カテゴリ (K5DEV/K10DEV) も復習対象に含める。 旧コードは基本のみで、
     発展しか触っていない子に「復習チャンス」 バナーが出なかった。 */
  var revLearned=courseCats(p).filter(function(c){return p.stats[c]&&p.stats[c].n>0;});
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
/* M3: 「Lv10 に一度でも到達」 をマスター条件にする。 旧版は p.lv (現在 Lv) のみ
   見ており、 セッション中に Lv10 到達 → その後降格 → ホーム帰還で取り逃しが起きる
   (= タイミング依存) 問題を解消。 reachedLv は p.lv と p.maxLv の最大値。 */
function reachedLv(p, cat){
 return Math.max((p.lv&&p.lv[cat])||0, (p.maxLv&&p.maxLv[cat])||0);
}
function masterMetK(key){
 var p=P(); if(!p)return false;
 if(key==="add") return Math.max(reachedLv(p,"hissan"), legacyHsToLv(p.hsMax||p.hsLevel||1))>=10;
 if(key==="sub") return Math.max(reachedLv(p,"hikizan"), legacyHsToLv(p.hkMax||p.hkLevel||1))>=10;
 if(key==="mul") return Math.max(reachedLv(p,"kuku"), legacyKukuToLv(p))>=10;
 if(key==="div") return reachedLv(p,"anzan")>=10;
 if(key==="all") return masterMetK("add")&&masterMetK("sub")&&masterMetK("mul")&&masterMetK("div");
 if(LVL_CATS[key]) return reachedLv(p,key)>=10;
 return false;
}
var KMASTERLAB={add:"たし算ひっさん",sub:"ひき算ひっさん",mul:"九九",div:"暗算",all:"ぜんぶ"};
function checkMastersK(){
 var p=P(); if(!p||!window.Q4BReward||!Q4BReward.masterBugsFor)return; ensureColl(p);
 var queue=[], awarded=[];
 Q4BReward.masterBugsFor("keisan").forEach(function(sp){
  if(Q4BReward.masterObtained(p.coll,sp.id))return;
  var checkKey=sp.master.key;
  if(p.type==="k5" && sp.master.k5key){ checkKey=sp.master.k5key; }
  if(masterMetK(checkKey)){
   if(window.Q4BBreeding && Q4BBreeding.openMasterSexPickerModal){ queue.push(sp); }
   else { if(Q4BReward.awardMaster(p.coll,sp))awarded.push(sp); }
  }
 });
 if(awarded.length){ save(); showMasterCelebrationK(awarded); }
 if(queue.length){ processKeisanMasterQueue(queue, p); }
}
function processKeisanMasterQueue(queue, p){
 if(!queue.length) return;
 var sp = queue.shift();
 Q4BBreeding.openMasterSexPickerModal({
  sp: sp, isLegacy: false, allowCancel: true,
  onPick: function(sex){
   Q4BReward.awardMaster(p.coll, sp, sex);
   Q4BReward.awardMasterEgg(p.coll, sp, sex==='m'?'f':'m');
   save();
   showMasterCelebrationK([sp]);
   processKeisanMasterQueue(queue, p);
  },
  onCancel: function(){
   Q4BReward.awardMaster(p.coll, sp);
   save();
   processKeisanMasterQueue(queue, p);
  }
 });
}
function keisanPickMasterSex(spId){
 var p=P(); if(!p||!p.coll) return;
 var sp = Q4BReward.spById(spId); if(!sp) return;
 Q4BBreeding.openMasterSexPickerModal({
  sp: sp, isLegacy: true, allowCancel: true,
  onPick: function(sex){
   var ret=Q4BReward.setMasterSex(p.coll, sp, sex);
   if(ret){
    save();
    if(typeof closeModal==='function') closeModal();
    var grantedEgg=(ret!==true)?ret:null;
    var queued=!!(grantedEgg&&grantedEgg.queuedAt);
    if(Q4BBreeding.notifyMasterEggGranted) Q4BBreeding.notifyMasterEggGranted(sp,{skipped:!grantedEgg, queued:queued});
   }
  }
 });
}
function showMasterCelebrationK(list){ var sp=list[0];
 var inner='<div style="font-size:14px;color:var(--amber-d);font-weight:800">🎓 ぜんぶ習得！</div>'
  +'<div style="width:120px;height:120px;margin:8px auto">'+Q4BReward.svg(sp)+'</div>'
  +'<div style="font-weight:bold;font-size:18px">マスター虫「'+esc(sp.jaName||sp.id)+'」をゲット！</div>'
  +'<div class="note" style="margin-top:4px">'+esc(sp.note||"")+'</div>'
  +(list.length>1?'<div class="note">ほかにも '+(list.length-1)+'匹！</div>':"");
 app.insertAdjacentHTML("beforeend",'<div class="modal" id="md" onclick="closeMd(event)"><div class="mcard center">'+zukanDetailHTMLK(inner+'<button class="btn" style="margin-top:12px" onclick="closeMd()">やったー！</button>')+'</div></div>');
}
function zukanDetailHTMLK(html){
  return '<div style="--ink:#2A3D2C;--sub:#5B6B4F;--green-l:#E2EFCB;--amber-d:#CF7F14;background:#FFFDF4;color:#2A3D2C;border-radius:18px;padding:6px 4px;text-align:center">'+html+'</div>';
}
function keisanMasterSection(){
 if(!window.Q4BReward||!Q4BReward.masterBugsFor)return "";
 var p=P(); var ms=Q4BReward.masterBugsFor("keisan"); if(!ms.length)return "";
 var ord=["hissan","add","hikizan","sub","kuku","mul","anzan","div","warizan","mix","kufuu","deci","frac","machigai","sougou","wasa","jikan","kakebun","noudo","tabibito","hiritsu","tsurukame","kabusoku","heikin","soneki","shigoto","nenrei","ueki","ryuusui","tsuuka","shuuki","nichireki","kisokusei","hayasahi","shuugou","bairitsu","shoukyo","houjin","baai","hireihanpi","all"];
 ms.sort(function(a,b){return ord.indexOf(a.master.key)-ord.indexOf(b.master.key);});
 var got=ms.filter(function(sp){return Q4BReward.masterObtained(p.coll,sp.id);}).length;
 var cells=ms.map(function(sp){ var ok=Q4BReward.masterObtained(p.coll,sp.id);
  return '<button type="button" class="zc" onclick="openMasterBugK(\''+sp.id+'\')" style="--rc:#E8B33C'+(ok?"":";opacity:.55")+'"><div class="bs">'+(ok?(window.Q4BRender&&Q4BRender.deco?Q4BRender.deco(sp,0):Q4BReward.svg(sp)):'<div style="font-size:34px;line-height:64px">🎓</div>')+'</div><div class="nm">'+(ok?esc(sp.jaName)+" 🎓":(KMASTERLAB[sp.master.key]||CATL[sp.master.key]||""))+'</div></button>';
 }).join("");
 var arrow=KEISAN_MASTER_OPEN?'▼':'▶';
 return '<details class="card"'+(KEISAN_MASTER_OPEN?' open':'')+' style="padding:0;border:2px solid var(--amber-d);background:linear-gradient(180deg,rgba(245,232,255,.7) 0%,rgba(255,253,244,.6) 100%)" ontoggle="setKeisanMasterOpen(this.open)"><summary style="list-style:none;cursor:pointer;padding:14px;font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;background:rgba(245,232,255,.5);border-radius:12px 12px 0 0"><span style="font-size:22px;color:#A06BD8;display:inline-block;width:22px;text-align:center">'+arrow+'</span>🎓 マスター虫 <span style="color:var(--amber-d);font-size:14px">'+got+' / '+ms.length+'</span><span style="margin-left:auto;font-size:11px;color:#A06BD8;font-weight:700">タップで '+(KEISAN_MASTER_OPEN?'とじる':'ひらく')+'</span></summary>'
   +'<div style="padding:0 14px 14px"><p class="note" style="margin:8px 0">そのスキルを <b>ぜんぶ習得</b>すると もらえる特別な虫</p><div class="zgrid">'+cells+'</div></div></details>';
}
function openMasterBugK(spId){
  var p=P(); ensureColl(p);
  if(!window.Q4BReward||!Q4BReward.masterBugsFor)return;
  var ms=Q4BReward.masterBugsFor("keisan"), sp=null;
  for(var i=0;i<ms.length;i++){ if(ms[i].id===spId){ sp=ms[i]; break; } }
  if(!sp)return;
  var rec=p.coll.catches[sp.id];
  var label=(KMASTERLAB[sp.master.key]||CATL[sp.master.key]||"マスター");
  var tier=Q4BReward.tierOf(sp);
  var inner;
  if(!rec){
    inner='<div style="font-size:44px;line-height:64px">🎓</div>'
      +'<h3>まだ ひみつ</h3><p class="note">「'+esc(label)+'」を ぜんぶ習得すると あらわれるよ。</p>'
      +'<p><span class="rtag r'+tier+'">'+Q4BReward.TIERNAME[tier]+'</span></p>';
  }else{
    var sz=Q4BReward.sizeRange(sp);
    var caught=(rec.min!=null&&rec.min<rec.max)?(rec.min+'〜'+rec.max+'mm'):(rec.max+'mm');
    inner='<div style="width:140px;height:140px;margin:0 auto">'+Q4BReward.svg(sp,0)+'</div>'
      +'<h3>'+esc(sp.jaName)+' 🎓</h3>'
      +'<p><span class="rtag r'+tier+'">'+Q4BReward.TIERNAME[tier]+'</span>　'+esc(label)+' マスター</p>'
      +'<p style="font-size:14px;color:var(--sub)">つかまえた おおきさ <b>'+caught+'</b>　（種の範囲: '+sz[0]+'〜'+sz[1]+'mm）</p>'
      +(sp.scientificName?'<p class="note"><i>'+esc(sp.scientificName)+'</i></p>':"")
      +'<p class="note">'+esc([sp.orderJa,sp.familyJa,sp.groupJa].filter(Boolean).join(' / '))+'</p>'
      +(sp.note?'<p style="background:var(--green-l);border-radius:12px;padding:10px;font-size:15px">'+esc(sp.note)+'</p>':"")
      /* 新書式統合: 性別分布/ヒストグラム/卵生成/レガシー救済/標本情報 */
      +(window.Q4BZukan?Q4BZukan.detailHTML(rec,sp,{coll:p.coll,favCallback:'keisanFavTap',saveFn:save,onLayEgg:'keisanLayEgg',onAbandonEgg:'keisanAbandonEgg',onHatchEgg:'keisanHatchEgg',onPickSex:'keisanPickMasterSex'}):'');
  }
  app.insertAdjacentHTML("beforeend",'<div class="modal" id="md" onclick="closeMd(event)"><div class="mcard">'+zukanDetailHTMLK(inner
    +'<button class="btn sm ghost" onclick="closeMd()">とじる</button>')+'</div></div>');
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
    +'<span style="font-size:15px;font-weight:700">🔶 こはく：<b>'+amberNow+'</b></span>'
    +'<button id="amberCatchBtn" class="btn amber" style="margin:0;padding:8px 14px;font-size:14px;width:auto'+(canSpend?'':'opacity:.45;pointer-events:none')+'"'
    +(canSpend?'':' disabled')
    +' onclick="keisanAmberCatch()">🔶 こはくで よぶ（30）</button></div>';
  h+=keisanMasterSection();
  if(window.Q4BBossZukan)h+=Q4BBossZukan.sectionHTML("keisan");  /* 👑 ボス昆虫節 */
  /* Q4BReward ベース: tierOf 降順ソート */
  var sorted=pool.slice().sort(function(a,b){ return Q4BReward.tierOf(b)-Q4BReward.tierOf(a)||(a.jaName<b.jaName?-1:1); });
  var classOpts=zukanClassOptionsK(sorted);
  var filtered=sorted.filter(zukanMatchK);
  h+='<div class="card" style="padding:12px">'
    +'<input id="kzq" value="'+esc(KZ_Q)+'" oncompositionend="setKZQ(this.value)" oninput="kzInput(this,event)" placeholder="🔍 名前・学名・科名でさがす" style="width:100%;padding:10px 12px;border:2px solid var(--line);border-radius:12px;font:inherit;margin-bottom:8px">'
    +'<label class="note" style="display:block;font-weight:800;margin-bottom:8px">分類 '
    +'<select onchange="setKZC(this.value)" style="width:100%;margin-top:4px;padding:8px 10px;border:2px solid var(--line);border-radius:10px;font:inherit;background:var(--panel);color:var(--ink)">'
    +'<option value="">ぜんぶの科</option>'
    +classOpts.map(function(k){return '<option value="'+esc(k)+'"'+(KZ_C===k?' selected':'')+'>'+esc(k)+'</option>';}).join("")
    +'</select></label>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:800">'
    +[["","ぜんぶ"],["4","でんせつ"],["3","ウルトラレア"],["2","スーパーレア"],["1","レア"],["0","ノーマル"]].map(function(x){
      var on=String(KZ_R)===String(x[0]) || (x[0]===""&&KZ_R==="");
      return '<button class="chip" style="cursor:pointer;'+(on?'background:var(--green);color:#fff':'')+'" onclick="setKZR(\''+x[0]+'\')">'+x[1]+'</button>';
    }).join("")
    +'<button class="chip" style="cursor:pointer;'+(KZ_FAV?'background:#E84A6B;color:#fff':'')+'" onclick="setKZFav()">♥ おきにいり</button>'
    +'<button class="chip" style="cursor:pointer;'+(KZ_SHINY?'background:#E0A32E;color:#fff':'')+'" onclick="setKZShiny()">✨ いろちがい</button>'
    +'<button class="chip" style="cursor:pointer;'+(KZ_HIDE_UNK?'background:var(--green);color:#fff':'')+'" onclick="setKZHideUnk()">❓ かくす</button>'
    +'<button class="chip" style="cursor:pointer;'+(KZ_REARED?'background:#4a9b3a;color:#fff':'')+'" onclick="setKZReared()">🐣 かえした</button>'
    +'<button class="chip" style="cursor:pointer;'+(KZ_PLURAL?'background:#5b8de0;color:#fff':'')+'" onclick="setKZPlural()">×2 いじょう</button>'
    +'<button class="chip" style="cursor:pointer;'+(KZ_EGG?'background:#E8B33C;color:#fff':'')+'" onclick="setKZEgg()">🥚 たまごあり</button>'
    +'<button class="chip" style="cursor:pointer;'+(KZ_PAIR?'background:#E08BB9;color:#fff':'')+'" onclick="setKZPair()">♂♀ そろい</button>'
    +'<span class="note" style="align-self:center;margin-left:auto">表示 '+filtered.length+' / '+sorted.length+'</span></div></div>';
  h+='<div class="zgrid">';
  filtered.forEach(function(sp){
    var rec=p.coll.catches[sp.id];
    var tier=Q4BReward.tierOf(sp);
    var isFav=Q4BReward.isFavorite(p.coll,sp.id);
    h+='<div class="zc r'+tier+(rec?"":" ")+'" style="position:relative" onclick="openBugNew(\''+sp.id+'\')">';
    if(isFav) h+='<span style="position:absolute;top:2px;right:4px;font-size:14px;color:#E84A6B;pointer-events:none;line-height:1;z-index:2">♥</span>';
    if(Q4BReward.hasReared&&Q4BReward.hasReared(p.coll,sp.id)) h+='<span style="position:absolute;top:2px;right:'+(isFav?'22px':'4px')+';font-size:14px;pointer-events:none;line-height:1;z-index:2" title="そだてた子">🐣</span>';
    if(rec&&Q4BReward.isLegacyMasterUnknownSex&&Q4BReward.isLegacyMasterUnknownSex(rec,sp)) h+='<span class="q4b-legacy-badge" style="position:absolute;top:-4px;left:-4px;width:22px;height:22px;background:#A06BD8;color:#fff;font-size:15px;font-weight:900;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(160,107,216,.55),0 0 0 2px #fff;pointer-events:none;line-height:1;z-index:3" title="♂♀ をきめてね">!</span>';
    var _eggCntK=(Q4BReward.eggsForSpecies?Q4BReward.eggsForSpecies(sp.id):{total:0}).total;
    if(_eggCntK>0) h+='<span style="position:absolute;bottom:2px;right:4px;background:#FFF6E0;border:1px solid #E8B33C;border-radius:99px;font-size:9px;font-weight:800;color:#8A5C2C;padding:0 4px;line-height:1.3;pointer-events:none;z-index:2">🥚×'+_eggCntK+'</span>';
    if(rec&&Q4BReward.hasBothSexes&&Q4BReward.hasBothSexes(p.coll,sp.id)) h+='<span title="♂♀そろい" style="position:absolute;bottom:2px;left:40px;background:#FCE8F0;border:1px solid #E08BB9;border-radius:99px;font-size:9px;font-weight:800;color:#A0497A;padding:0 4px;pointer-events:none;line-height:1.3;z-index:2">♂♀</span>';
    if(rec)h+='<span class="cnt">×'+(rec.n||1)+'</span>';
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
  h+=(filtered.length?'':'<p class="note center" style="grid-column:1/-1">みつからないよ。検索やレア度を変えてみてね。</p>')+'</div></div>';
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
      +'<p class="note">'+esc([sp.orderJa,sp.familyJa,sp.groupJa].filter(Boolean).join(' / '))+'</p>'
      +(sp.caution?'<p style="background:#FFF1DE;border-radius:12px;padding:8px;font-size:14px;color:var(--amber-d);font-weight:800">'+esc(sp.caution)+'</p>':"")
      +(sp.note?'<p style="background:var(--green-l);border-radius:12px;padding:10px;font-size:15px">'+esc(sp.note)+'</p>':"")
      +(window.Q4BZukan?Q4BZukan.detailHTML(rec,sp,{coll:P()&&P().coll,favCallback:'keisanFavTap',saveFn:save,onLayEgg:'keisanLayEgg',onAbandonEgg:'keisanAbandonEgg',onHatchEgg:'keisanHatchEgg',onPickSex:'keisanPickMasterSex'}):"");
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
    +'<p class="note">'+esc([b.orderJa,b.familyJa,b.groupJa].filter(Boolean).join(' / '))+'</p>'
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
  if(!got){ alert('🔶こはくが たりないよ（30こ いるよ）'); return; }
  save();
  showCapture(null,'🔶こはく30こで つかまえた！',got);
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
        +'<div class="face back"><span style="font-size:50px">📖</span></div>'
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
    +'<div class="face back"><span style="font-size:50px">📖</span></div>'
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
    /* P5: 旧版は未学習カテゴリにも 仮 Lv1 を作って表示しており、 触ったことのない
       発展 27 カテゴリの折れ線がずらりと並んでいた。 実データ (lvlog または stats)
       が無いカテゴリは出さない。 */
    var s = p.stats && p.stats[c];
    if((!log || !log.length) && (!s || !s.n)) return;
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
  /* accuracy bars: 発展カテゴリも含めて表示 (P5)。 旧 K5CATS/K10CATS のみだと
     和差算・濃度等を何百問解いても 永久に出ない問題があった。 */
  var bars=""; var cats=courseCats(p);
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
  h+='<div class="card"><h3>📚 おうちの方向け</h3>'
    +'<p class="note">分野ごとのLv1-10の学習内容を一覧で確認できます。実際の問題は同じLv内で少しずつ変化します。</p>'
    +'<button class="btn sm ghost" onclick="showLevelGuide()">計算レベル内容一覧</button></div>';
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
function showLevelGuide(){
  var p=P(), cats=courseCats(p), h='<div class="scr">'+topBar("showSettings()");
  h+='<div class="card"><h3>📚 計算レベル内容一覧</h3>'
    +'<p class="note">現在のコースに出る分野だけを表示しています。Lvは正答状況に応じて上下し、同じLvでも数値や文章はランダムに変わります。</p></div>';
  cats.forEach(function(c){
    var g=levelGuide(c);
    h+='<div class="card"><h3>'+esc(CATL[c]||c)+'</h3>'
      +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.35">'
      +'<thead><tr><th style="text-align:left;border-bottom:1px solid #D7E1C0;padding:5px 4px;width:54px">Lv</th>'
      +'<th style="text-align:left;border-bottom:1px solid #D7E1C0;padding:5px 4px">主な内容</th></tr></thead><tbody>';
    for(var i=1;i<=10;i++){
      h+='<tr><td style="font-weight:900;border-bottom:1px solid #EEF2E5;padding:5px 4px">Lv'+i+'</td>'
        +'<td style="border-bottom:1px solid #EEF2E5;padding:5px 4px">'+esc(g[i-1])+'</td></tr>';
    }
    h+='</tbody></table></div></div>';
  });
  h+='</div>';
  render(h);
}
function renameP(){
 var p=P(); var n=prompt("あたらしい なまえ",p.name);
 if(n&&n.trim()){
  var nm=n.trim().slice(0,10);
  p.name=nm;
  /* 共有レジストリにも反映 → 他教科・ポータルでも同じ名前に (K19)。
     QuestSave.updateProfile が p.updated を打つので LWW でも勝つ。 */
  if(window.QuestSave && QuestSave.updateProfile) QuestSave.updateProfile(p.id, {name: nm});
  save(); showSettings();
 }
}
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
  if(confirm("ほんとうに【全ハンターの 計算データ】を消しますか？\n（漢字 / えいご / 共有のかけら などは のこります）\n元に戻せません")){
    /* 各プロフィールの keisan kv に加え、 旧 _book / _legacy も削除 (N4)。
       これがないと 起動時の book backfill ロジック (parts[i] が null なら _book から
       採用) で 消したはずの進捗が復活する。 */
    try{
      if(window.QuestSave && QuestSave.profiles){
        QuestSave.profiles().then(function(pids){
          (pids||[]).forEach(function(prof){
            if(prof && prof.id) QuestSave.save("keisan", prof.id, null);
          });
        });
      }
      if(window.QuestSave && QuestSave.save){
        QuestSave.save("keisan", "_book", null);
        QuestSave.save("keisan", "_legacy", null);
      }
    }catch(_){}
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
/* たし算の筆算: Lv 1-10 で桁数とくり上がりを段階化。
   旧実装は hsStage(1-4)に集約していたため Lv1-3/Lv4-5/Lv6-8 がそれぞれ同一だった。 */
function gHissan(p,lvOv){
  var rawLv=lvOv||((p.lv&&p.lv.hissan)||p.hsLevel||1);
  var lv=clampLv(rawLv);
  var a=0,b=0,good=false,t=0;
  /* 必要なくり上がり回数 (need[i]=1 なら桁 i にくり上がりが必要) */
  function carryCount(A,B){ var c=carriesOf(A,B), n=0; for(var i=1;i<c.cols;i++) if(c.need[i]) n++; return n; }
  while(!good&&t<400){ t++;
    if(lv===1){ /* 2桁＋1桁・くり上がりなし */
      var a1=ri(2,9), b1=ri(0,9-a1), a2=ri(1,8);
      a=a2*10+a1; b=b1;
      good=(carryCount(a,b)===0);
    } else if(lv===2){ /* 2桁＋2桁・くり上がりなし */
      a=ri(11,89); b=ri(10,99-Math.floor(a/10)*10-9);  /* 雑なので再判定で吸収 */
      if(b<10) b=10;
      good=(carryCount(a,b)===0);
    } else if(lv===3){ /* 2桁＋2桁・くり上がりあり (1回でOK) */
      a=ri(15,99); b=ri(15,99);
      good=(carryCount(a,b)>=1);
    } else if(lv===4){ /* 2桁＋2桁・くり上がり 1回ピッタリ */
      a=ri(15,99); b=ri(15,99);
      good=(carryCount(a,b)===1);
    } else if(lv===5){ /* 2桁＋2桁・くり上がり 2回（一の位＋十の位） */
      a=ri(15,99); b=ri(15,99);
      good=(carryCount(a,b)===2);
    } else if(lv===6){ /* 3桁＋1桁 */
      a=ri(100,899); b=ri(2,9);
      good=true;
    } else if(lv===7){ /* 3桁＋2桁・くり上がりあり */
      a=ri(100,899); b=ri(15,99);
      good=(carryCount(a,b)>=1);
    } else if(lv===8){ /* 3桁＋3桁・くり上がりあり */
      a=ri(100,899); b=ri(100,899);
      good=(carryCount(a,b)>=1);
    } else if(lv===9){ /* 3桁＋3桁・くり上がり 2回以上 */
      a=ri(100,899); b=ri(100,899);
      good=(carryCount(a,b)>=2);
    } else { /* Lv10: 4桁＋4桁 */
      a=ri(1000,9999); b=ri(1000,9999);
      good=(carryCount(a,b)>=2);
    }
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
/* ひき算の筆算: Lv 1-10 で桁数とくり下がりを段階化。 */
function gHikizan(p,lvOv){
  var rawLv=lvOv||((p.lv&&p.lv.hikizan)||p.hkLevel||1);
  var lv=clampLv(rawLv);
  var a=0,b=0,good=false,t=0;
  function borrowCount(A,B){ var c=borrowsOf(A,B), n=0; for(var i=1;i<c.cols;i++) if(c.need[i]) n++; return n; }
  while(!good&&t<500){ t++;
    if(lv===1){ /* 2桁−1桁・くり下がりなし */
      a=ri(11,99); b=ri(1, a%10);
      good=((a%10)>=b)&&(a-b>=0);
    } else if(lv===2){ /* 2桁−2桁・くり下がりなし */
      a=ri(21,99); b=ri(10,a-1);
      good=(borrowCount(a,b)===0)&&(a>=b);
    } else if(lv===3){ /* 2桁−2桁・くり下がりあり */
      a=ri(21,99); b=ri(11,a-1);
      good=(borrowCount(a,b)>=1)&&(a>=b);
    } else if(lv===4){ /* 2桁−2桁・くり下がり 1回 */
      a=ri(21,99); b=ri(11,a-1);
      good=(borrowCount(a,b)===1)&&(a>=b);
    } else if(lv===5){ /* 3桁−2桁・くり下がり 2回 (連続くり下がり)
       旧: 「2桁−2桁・くり下がり2回」は数学的に不可能 (borrowCount の最大=1)。
       500 回失敗で条件外の問題が返り、 Lv5 がチートに見える状態だった (K2)。
       3 桁−2 桁で十の位→百の位への連続くり下がり (例: 100−27, 102−15) を要求。 */
      a=ri(100,199); b=ri(11,99);
      good=(borrowCount(a,b)>=2)&&(a>=b);
    } else if(lv===6){ /* 3桁−1桁 */
      a=ri(100,899); b=ri(2,9);
      good=true;
    } else if(lv===7){ /* 3桁−2桁・くり下がりあり */
      a=ri(100,899); b=ri(11,99);
      good=(borrowCount(a,b)>=1)&&(a>=b);
    } else if(lv===8){ /* 3桁−3桁・くり下がりあり */
      a=ri(120,999); b=ri(101,a-1);
      good=(borrowCount(a,b)>=1)&&(a>=b);
    } else if(lv===9){ /* 3桁−3桁・くり下がり 2回以上 */
      a=ri(120,999); b=ri(101,a-1);
      good=(borrowCount(a,b)>=2)&&(a>=b);
    } else { /* Lv10: 4桁−4桁 */
      a=ri(1100,9999); b=ri(1000,a-1);
      good=(borrowCount(a,b)>=2)&&(a>=b);
    }
  }
  return {cat:"hikizan", kind:(p.hissanInput==="app"?"hissan":"num"), a:a, b:b,
    text:a+"−"+b, say:a+" ひく "+b+" は？", ans:a-b};
}
function gKuku(p,dan,lv){
  /* Lv1-9 = ORDER の各段に対応（Lv=kukuIdx+1 と整合）、Lv10 = 全段ミックス */
  if(lv==null) lv=legacyKukuToLv(p);
  var d, b=ri(1,9);
  if(dan){ d=dan; }
  else if(lv>=10){ /* Lv10: 2〜9の段が主、1の段は10%混在 */
    d = (Math.random()<0.9) ? ORDER[ri(0,ORDER.length-2)] : 1;
  }
  else {
    var idx=Math.min(Math.max(1,lv)-1, ORDER.length-1);
    var target=ORDER[idx], unlocked=ORDER.slice(0, idx+1);          /* そのLvの段を主軸(6割)＋既習段で復習 */
    d=(Math.random()<0.6)?target:pick(unlocked);
  }
  return {cat:"kuku",kind:"num",dan:d,b:b,text:d+"×"+b,say:d+" かける "+b+" は？",ans:d*b};
}
function gAnzan(lv){
  /* Lv ごとに「主要演算1種＋既習復習30%」を出題。
     旧実装は Lv1-2 で加算のみ／Lv3-4 でかけ算わり算が出ない欠落があった。 */
  if(lv==null) lv=ri(1,10);
  var a,b,c,t,ans;
  function plain(opStr,A,B,result){ return {t:A+opStr+B, ans:result}; }
  function pickPattern(){
    if(lv===1){ /* 1桁加減（最初は引き算も含む） */
      if(Math.random()<0.5){a=ri(2,9);b=ri(2,9);return plain("＋",a,b,a+b);}
      a=ri(3,9);b=ri(1,a-1);return plain("−",a,b,a-b);
    }
    if(lv===2){ /* 2桁加減（くり上がり/くり下がりあり） */
      if(Math.random()<0.5){a=ri(20,79);b=ri(20,99-a);if(b<5)b=5;return plain("＋",a,b,a+b);}
      a=ri(30,99);b=ri(11,a-5);return plain("−",a,b,a-b);
    }
    if(lv===3){ /* かけ算入り（2桁×1桁中心、九九含む） */
      if(Math.random()<0.3){a=ri(2,9);b=ri(2,9);return plain("×",a,b,a*b);}    /* 復習30% */
      a=ri(11,30);b=ri(2,9);return plain("×",a,b,a*b);
    }
    if(lv===4){ /* わり算入り（割り切れ） */
      if(Math.random()<0.3){a=ri(11,30);b=ri(2,9);return plain("×",a,b,a*b);}  /* 復習30% */
      b=ri(2,9);var q=ri(2,12);a=b*q;return plain("÷",a,b,q);
    }
    if(lv===5){ /* 2段階計算 (a+b)±c や a×b+c */
      var s=ri(0,2);
      if(s===0){
        /* 負数の答えが出ると数字パッドに − キーが無く入力できない (N1)。
           c ≤ a+b に制限して 答えが必ず 0 以上になるようにする。 */
        a=ri(5,20); b=ri(5,20);
        c=ri(3, Math.min(15, a+b));
        return {t:a+"＋"+b+"−"+c, ans:a+b-c};
      }
      if(s===1){a=ri(2,9);b=ri(2,9);c=ri(10,30);return {t:a+"×"+b+"＋"+c, ans:a*b+c};}
      a=ri(2,9);b=ri(2,9);c=ri(2,9);return {t:a+"＋"+b+"×"+c, ans:a+b*c};
    }
    if(lv===6){ /* 3桁加減 */
      if(Math.random()<0.5){a=ri(100,800);b=ri(50,199);return plain("＋",a,b,a+b);}
      a=ri(200,999);b=ri(50,a-50);return plain("−",a,b,a-b);
    }
    if(lv===7){ /* きりのよいかけ算 (×10/×100/×11等) */
      var k=ri(0,2);
      if(k===0){a=ri(2,9)*10;b=ri(11,29);return plain("×",a,b,a*b);}
      if(k===1){a=ri(11,49);b=11;return plain("×",a,b,a*b);}
      a=ri(20,90);b=10;return plain("×",a,b,a*b);
    }
    if(lv===8){ /* 割り切れるわり算（2桁以上） */
      var k2=ri(0,1);
      if(k2===0){b=ri(3,9);var q2=ri(11,30);a=b*q2;return plain("÷",a,b,q2);}
      b=ri(11,19);var q3=ri(3,9);a=b*q3;return plain("÷",a,b,q3);
    }
    if(lv===9){ /* 2桁×2桁 入門 (両端が25まで) */
      a=ri(11,25);b=ri(11,25);return plain("×",a,b,a*b);
    }
    /* lv===10: 暗算総合 — lv1-9 の中から1つランダム */
    return null;
  }
  var r=pickPattern();
  if(!r){
    /* Lv10 総合: 上位 Lv (5-9) からランダム抽出 */
    var subLv=pick([5,6,7,7,8,8,9]);
    return gAnzan(subLv);
  }
  t=r.t; ans=r.ans;
  return {cat:"anzan",kind:"num",text:t,say:readify(t),ans:ans};
}
function gMix(lv){
  if(lv==null) lv=ri(1,10);
  for(var i=0;i<200;i++){
    var a,b,c,d,t,ans,m,prod;
    if(lv===1){ // たし算・ひき算ミックス
      if(Math.random()<0.5){a=ri(12,80);b=ri(8,60);t=a+"＋"+b;ans=a+b;}
      else{a=ri(30,120);b=ri(8,a-5);t=a+"−"+b;ans=a-b;}
    } else if(lv===2){ // かけ算入り
      a=ri(3,9);b=ri(3,9);c=ri(5,40);prod=a*b;
      if(Math.random()<0.5){t=a+"×"+b+"＋"+c;ans=prod+c;}
      else{c=ri(1,prod-1);t=a+"×"+b+"−"+c;ans=prod-c;}
    } else if(lv===3){ // わり算入り
      b=ri(2,9);m=ri(3,12);a=b*m;c=ri(5,40);
      if(Math.random()<0.5){t=a+"÷"+b+"＋"+c;ans=m+c;}
      else{c=ri(1,m-1);t=a+"÷"+b+"−"+c;ans=m-c;}
    } else if(lv===4){ // かけ算・わり算を先に
      if(Math.random()<0.5){
        b=ri(3,9);c=ri(3,9);prod=b*c;
        if(Math.random()<0.5){a=ri(10,60);t=a+"＋"+b+"×"+c;ans=a+prod;}
        else{a=prod+ri(5,50);t=a+"−"+b+"×"+c;ans=a-prod;}
      } else {
        b=ri(2,9);m=ri(4,15);c=b*m;a=ri(10,60);
        t=a+"＋"+c+"÷"+b;ans=a+m;
      }
    } else if(lv===5){ // 2段階計算
      if(Math.random()<0.5){a=ri(4,9);b=ri(4,9);c=ri(5,40);d=ri(1,30);t=a+"×"+b+"＋"+c+"−"+d;ans=a*b+c-d;if(ans<0)continue;}
      else{b=ri(2,9);m=ri(4,15);a=b*m;c=ri(2,7);d=ri(2,9);t=a+"÷"+b+"＋"+c+"×"+d;ans=m+c*d;}
    } else if(lv===6){ // かっこを先に
      a=ri(10,40);b=ri(5,30);c=ri(5,30);
      if(Math.random()<0.5){t="（"+a+"＋"+b+"）−"+c;ans=a+b-c;if(ans<0)continue;}
      else{a=b+ri(5,40);t="（"+a+"−"+b+"）＋"+c;ans=a-b+c;}
    } else if(lv===7){ // かっこ×かけ算
      a=ri(8,25);b=ri(5,20);c=ri(2,6);t="（"+a+"＋"+b+"）×"+c;ans=(a+b)*c;
    } else if(lv===8){ // 2けた×2けた
      a=ri(11,25);b=ri(11,25);t=a+"×"+b;ans=a*b;
    } else if(lv===9){ // かっこ＋ひき算
      a=ri(12,35);b=ri(12,35);c=ri(3,8);d=ri(10,80);ans=(a+b)*c-d;if(ans<0)continue;t="（"+a+"＋"+b+"）×"+c+"−"+d;
    } else { // lv===10 総合チャレンジ
      if(Math.random()<0.34){a=ri(20,40);b=ri(20,40);if(a+b<40||a+b>70)continue;c=ri(5,8);d=ri(20,140);ans=(a+b)*c-d;if(ans<0)continue;t="（"+a+"＋"+b+"）×"+c+"−"+d;}
      else if(Math.random()<0.67){a=ri(12,30);b=ri(12,30);c=ri(5,60);t=a+"×"+b+"＋"+c;ans=a*b+c;}
      else{b=ri(3,9);m=ri(10,25);a=b*m;c=ri(4,9);d=ri(5,40);t=a+"÷"+b+"＋"+c+"×"+d;ans=m+c*d;}
    }
    return {cat:"mix",kind:"num",text:t,say:readify(t),ans:ans};
  }
  return {cat:"mix",kind:"num",text:"10＋2×3",say:readify("10＋2×3"),ans:16};
}
function gKufuu(lv){
  if(lv==null)lv=ri(1,10);
  /* 段階構成（Lvごとに型を限定し、復習10%として既習型を混ぜる）:
       Lv1:  25×4型 (k=1)
       Lv2:  125×8型 (k=2)
       Lv3:  ×99/101型 (k=3)
       Lv4:  分配法則 (k=4)
       Lv5:  連続5数の和 (k=5)
       Lv6:  分配法則 (標準・数値範囲拡大)
       Lv7:  ×98/102型 (k=6)
       Lv8:  分配＋複合 (k=4,6 ミックス)
       Lv9:  ×101/99型 大きめ (k=7)
       Lv10: 全型ランダム総合 (k=1..8) */
  var t,ans,hint,n,a,b,c,m,pats,k;
  for(var attempt=0;attempt<200;attempt++){
    if(lv===1) pats=[1];
    else if(lv===2) pats=[2];
    else if(lv===3) pats=[3];
    else if(lv===4) pats=[4];
    else if(lv===5) pats=[5];
    else if(lv===6) pats=[4];
    else if(lv===7) pats=[6];
    else if(lv===8) pats=[4,6];
    else if(lv===9) pats=[7];
    else pats=[1,2,3,4,5,6,7,8];   /* Lv10 総合 */
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
  /* 段階構成（提言にあわせて演算種別を Lv で分離）:
       Lv1: 小数1桁・加算（くり上がりなし）
       Lv2: 小数1桁・加算（くり上がりあり）
       Lv3: 小数1桁・減算（くり下がりなし）
       Lv4: 小数1桁・減算（くり下がりあり）
       Lv5: 小数×整数        ← 旧: Lv5,6 とも×整数で完全重複
       Lv6: 小数÷整数        ← 旧: ×整数のまま
       Lv7: 小数×小数（小さめ）
       Lv8: 小数×小数（大きめ）
       Lv9: 単位換算・文章題寄り（m↔cm, kg↔g 等の小数換算）
       Lv10: 小数の四則総合 */
  var x,y,t,ans,kk;
  for(var tr=0;tr<300;tr++){
    if(lv<=2){
      if(lv===1){ x=ri(1,99); y=ri(1,99); if(x+y>=100)continue; }
      else { x=ri(1,99); y=ri(1,99); if(x+y<100||x+y>180)continue; }
      t=fmtDec(x/10)+"＋"+fmtDec(y/10); ans=(x+y)/10; break;
    } else if(lv<=4){
      x=ri(11,99); y=ri(1,x-1);
      var xo=x%10, yo=y%10;
      if(lv===3){ if(xo<yo)continue; }
      else { if(xo>=yo)continue; }
      t=fmtDec(x/10)+"−"+fmtDec(y/10); ans=(x-y)/10; break;
    } else if(lv===5){
      /* 小数×整数 */
      kk=ri(2,9); x=ri(11,99);
      t=fmtDec(x/10)+"×"+kk; ans=x*kk/10; break;
    } else if(lv===6){
      /* 小数÷整数（割り切れ） */
      kk=ri(2,9); var q=ri(2,49);
      var dividend=q*kk;
      t=fmtDec(dividend/10)+"÷"+kk; ans=q/10; break;
    } else if(lv===7){
      x=ri(11,49); y=ri(11,49);
      t=fmtDec(x/10)+"×"+fmtDec(y/10); ans=x*y/100; break;
    } else if(lv===8){
      x=ri(51,99); y=ri(51,99);
      t=fmtDec(x/10)+"×"+fmtDec(y/10); ans=x*y/100; break;
    } else if(lv===9){
      /* 単位換算: m↔cm（÷100 / ×100）、kg↔g（÷1000 / ×1000）、L↔dL（÷10 / ×10） */
      var unit=ri(0,2);
      if(unit===0){ /* m → cm */
        x=ri(1,99); t=fmtDec(x/10)+" m は 何 cm？"; ans=x*10;
      } else if(unit===1){ /* kg → g */
        x=ri(1,49); t=fmtDec(x/10)+" kg は 何 g？"; ans=x*100;
      } else { /* L → dL */
        x=ri(1,99); t=fmtDec(x/10)+" L は 何 dL？"; ans=x;
      }
      break;
    } else {
      /* Lv10 総合: 加減乗除をランダムに */
      var pat=ri(0,3);
      if(pat===0){ x=ri(11,99); y=ri(11,99); t=fmtDec(x/10)+"＋"+fmtDec(y/10); ans=(x+y)/10; }
      else if(pat===1){ x=ri(50,99); y=ri(10,x-1); t=fmtDec(x/10)+"−"+fmtDec(y/10); ans=(x-y)/10; }
      else if(pat===2){ x=ri(11,49); y=ri(11,49); t=fmtDec(x/10)+"×"+fmtDec(y/10); ans=x*y/100; }
      else { kk=ri(2,9); var q10=ri(2,49); t=fmtDec(q10*kk/10)+"÷"+kk; ans=q10/10; }
      break;
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
  /* 段階構成:
       Lv1: 同分母 加減      (旧: addのみ → sub も含める)
       Lv2: 同分母 加減      (約分入門相当: 簡約後既約になる問題が混ざる)
       Lv3: 異分母 (片方が他方の倍数)
       Lv4: 異分母 (一般通分)
       Lv5: 異分母 加減 (標準)              ← 旧: mulのみで完全な不一致
       Lv6: かけ算 入門                      ← 旧: mul/div → 純粋に ×
       Lv7: わり算 入門                      ← 旧: add/sub/mul で ÷ が出ない
       Lv8: 四則 ミックス入門
       Lv9: 帯分数あり 四則
       Lv10: 帯分数あり 四則 (分母大きめ) */
  for(var t=0;t<200;t++){
    var ops;
    if(lv<=2)ops=["add","sub"];
    else if(lv<=4)ops=["add","sub"];
    else if(lv===5)ops=["add","sub"];
    else if(lv===6)ops=["mul"];
    else if(lv===7)ops=["div"];
    else if(lv===8)ops=["add","sub","mul","div"];
    else ops=["add","sub","mul","div"];
    var op=pick(ops);

    var d1,d2,n1,n2,w1=0,w2=0,mixAllowed=(lv>=9);
    if(lv===1){var d=pick([2,3,4]);d1=d2=d;}
    else if(lv===2){var dd=ri(2,6);d1=d2=dd;}
    else if(lv===3){
      /* 片方の分母が他方の倍数 (例: 2 と 4, 3 と 6, 3 と 9) */
      var base=pick([2,3,4]); d1=base; d2=base*pick([2,3]);
      if(Math.random()<0.5){ var sw=d1; d1=d2; d2=sw; }
    }
    else if(lv===4){d1=ri(2,8);d2=ri(2,8);}
    else if(lv===5){d1=ri(2,9);d2=ri(2,9);}     /* 異分母標準 */
    else if(lv===6||lv===7){d1=ri(2,5);d2=ri(2,5);}
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
  /* N12: 200 回の試行で生成できなかったときの fallback。 これがないと undefined が
     返り、 sougou path の sq.cat= で例外。 well-posed な分数加算問題を最後に返す。 */
  return {cat:"frac", kind:"frac",
    text:"1/2 ＋ 1/4",
    say:"2ぶんの1 たす 4ぶんの1 は？",
    ans:{p:3, q:4}};
}
/* まちがいさがし: Lv ごとに使う演算種・式の形を変えて 10段階化。
   ミスは「式と整合的な値だが計算すると違う」もの (九九の隣接段 / くり上がり1個ミス /
   小数1桁ズレ / 分子±1) を入れ、見た目だけで検出できないようにする。
   さらに 25% の確率で「ぜんぶ正しい」変種を混入 (q.ans=lines.length が「ぜんぶOK」index)。
   ミス対象は全行 (restatement も含む) に拡張し、どの行も信用できない構造にする。 */
function gMachi(lv){
  if(lv==null) lv=ri(1,10);
  var origLv = lv;
  /* Lv10 (総合) は 1-9 のランダム化だが、2段階提出が分数入力を必要としないよう Lv8 を除外。 */
  if(lv===10) lv=pick([1,2,3,4,5,6,7,9]);
  var lines=null, expr="", fix=0, a,b,c,d,v0,v1,v2, kk, errs, vals, disp;
  var noError = (ri(1,4)===1);         /* 約 25%: ぜんぶ正しい問題 */
  /* mulErr: a*b に対し「九九を1段ずれて読んだ」ミス幅 (+a / -a / +b / -b)。
     正解との差は小さくないが「九九として一見もっともらしい」値になる。 */
  function mulErr(x,y){
    var c=[];
    if(y>1) c.push(-x);
    c.push(+x);
    if(x>1 && y!==x) c.push(-y);
    if(y!==x) c.push(+y);
    return pick(c);
  }
  /* carryErr: 加減算で「くり上がり/くり下がり1個落とした」ミス幅 (±10) 主体、
     稀に桁スリップ (±1) を混ぜる。結果が 1 未満にならないよう範囲を絞る。 */
  function carryErr(val){
    var cs=[];
    [-10,+10,-10,+10,-1,+1].forEach(function(d){ if(val+d>=1) cs.push(d); });
    return cs.length?pick(cs):+1;
  }
  /* decErr: 小数 (内部は ×10 整数) に対する ±0.1 / ±1.0 ミス。
     ±10 (=1.0) はくり上がり忘れ、±1 (=0.1) は桁スリップ。 */
  function decErr(intVal){
    var cs=[];
    [-1,+1,-10,+10].forEach(function(d){ if(intVal+d>=1) cs.push(d); });
    return cs.length?pick(cs):+1;
  }
  /* fracNumErr: 分子 ±1。分母固定で見た目に近い値にする。 */
  function fracNumErr(n){
    var cs=[];
    if(n-1>=1) cs.push(-1);
    cs.push(+1);
    return pick(cs);
  }
  function bld(idx){ return ["①","②","③","④"][idx]; }
  function applyErr(values, errors, hitIdx){
    return values.map(function(x,i){ return (noError||i!==hitIdx)?x:(x+errors[i]); });
  }

  if(lv<=1){
    /* Lv1: 九九 — a×b の3ステップ和 (a,b∈[2,5])。ミスは九九の隣接段。 */
    a=ri(2,5); b=ri(2,5); c=ri(2,5); d=ri(2,5);
    v0=a*b; v1=c*d; v2=v0+v1;
    kk=ri(0,2);
    expr=a+"×"+b+"＋"+c+"×"+d;
    vals=[v0,v1,v2];
    errs=[mulErr(a,b), mulErr(c,d), carryErr(v2)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"×"+b+"＝"+disp[0],"② "+c+"×"+d+"＝"+disp[1],"③ "+v0+"＋"+v1+"＝"+disp[2]];
    fix=vals[kk];
  } else if(lv===2){
    /* Lv2: 加算 — 2桁同士の加算3項。ミスは くり上がり1個落とし (±10) 主体。 */
    a=ri(10,40); b=ri(10,40); c=ri(10,40);
    v0=a+b; v1=v0+c;
    kk=ri(0,2);
    expr=a+"＋"+b+"＋"+c;
    vals=[v0,v1,v1];
    errs=[carryErr(v0), carryErr(v1), carryErr(v1)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"＋"+b+"＝"+disp[0],"② "+v0+"＋"+c+"＝"+disp[1],"③ "+a+"＋"+b+"＋"+c+"＝"+disp[2]];
    fix=vals[kk];
  } else if(lv===3){
    /* Lv3: 減算 — 連続2回の減算。ミスは くり下がり1個落とし。
       N9: 旧コードは c=ri(5,b-1) で c が v0=a-b より大きくなり v1=v0-c が負数に
       なる組合せがあった。 Lv10 の 2 段階提出で真値が負数だと数字パッドに − が
       無く入力不能。 c ≤ min(b-1, v0-1) でガードし、 上限が 5 未満なら 別の Lv へ
       振り替える。 */
    a=ri(50,99); b=ri(10,a-20);
    var _cMax = Math.min(b-1, a-b-1);
    if(_cMax < 5){
      /* 安全な範囲が無いなら このターン は Lv2 (連続加算) に振り替え */
      a=ri(10,40); b=ri(10,40); c=ri(10,40);
      v0=a+b; v1=v0+c;
      kk=ri(0,2);
      expr=a+"＋"+b+"＋"+c;
      vals=[v0,v1,v1];
      errs=[carryErr(v0), carryErr(v1), carryErr(v1)];
      disp=applyErr(vals,errs,kk);
      lines=["① "+a+"＋"+b+"＝"+disp[0],"② "+v0+"＋"+c+"＝"+disp[1],"③ "+a+"＋"+b+"＋"+c+"＝"+disp[2]];
      fix=vals[kk];
    } else {
    c=ri(5, _cMax);
    v0=a-b; v1=v0-c;
    kk=ri(0,2);
    expr=a+"−"+b+"−"+c;
    vals=[v0,v1,v1];
    errs=[carryErr(v0), carryErr(v1), carryErr(v1)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"−"+b+"＝"+disp[0],"② "+v0+"−"+c+"＝"+disp[1],"③ "+a+"−"+b+"−"+c+"＝"+disp[2]];
    fix=vals[kk];
    }                       /* N9: _cMax >= 5 だった通常パスを閉じる */
  } else if(lv===4){
    /* Lv4: 符号 — 乗加減 混合3ステップ。乗算行は九九ミス、加減行はくり上がりミス。 */
    a=ri(3,9); b=ri(3,9); c=ri(10,30);
    v0=a*b; v1=v0+c; v2=v1-ri(3,Math.max(4,v1-5));
    var dminus=v1-v2;
    kk=ri(0,2);
    expr=a+"×"+b+"＋"+c+"−"+dminus;
    vals=[v0,v1,v2];
    errs=[mulErr(a,b), carryErr(v1), carryErr(v2)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"×"+b+"＝"+disp[0],"② "+v0+"＋"+c+"＝"+disp[1],"③ "+v1+"−"+dminus+"＝"+disp[2]];
    fix=vals[kk];
  } else if(lv===5){
    /* Lv5: 順序 — × を先に処理する 3ステップ。 */
    a=ri(2,9); b=ri(2,9); c=ri(10,40); d=ri(2,9);
    v0=a*b; v1=c+v0;
    kk=ri(0,2);
    expr=c+"＋"+a+"×"+b;
    vals=[v0,v1,v1];
    errs=[mulErr(a,b), carryErr(v1), carryErr(v1)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"×"+b+"＝"+disp[0],"② "+c+"＋"+v0+"＝"+disp[1],"③ "+c+"＋"+a+"×"+b+"＝"+disp[2]];
    fix=vals[kk];
  } else if(lv===6){
    /* Lv6: かっこ — (a+b)×c-d。中央行は (v0)×c なので v0 連動の乗算ミスを使う。 */
    a=ri(5,30); b=ri(5,30); c=ri(2,6);
    v0=a+b; v1=v0*c;
    d=ri(5,Math.max(6,v1-1)); if(d>=v1)d=v1-1;
    v2=v1-d;
    kk=ri(0,2);
    expr="（"+a+"＋"+b+"）×"+c+"−"+d;
    vals=[v0,v1,v2];
    errs=[carryErr(v0), mulErr(v0,c), carryErr(v2)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"＋"+b+"＝"+disp[0],"② "+v0+"×"+c+"＝"+disp[1],"③ "+v1+"−"+d+"＝"+disp[2]];
    fix=vals[kk];
  } else if(lv===7){
    /* Lv7: 小数 — ±0.1 / ±1.0 (くり上がり忘れ) 主体。 */
    var ax=ri(20,80), bx=ri(20,60), cx=ri(10,40);  /* /10 で小数化 */
    var av=ax/10, bv=bx/10, cv=cx/10;
    var u0i=(ax+bx), u1i=(ax+bx-cx);
    var u0=u0i/10, u1=u1i/10;
    kk=ri(0,2);
    expr=av.toFixed(1)+"＋"+bv.toFixed(1)+"−"+cv.toFixed(1);
    var ints=[u0i, u1i, u1i];
    errs=[decErr(u0i), decErr(u1i), decErr(u1i)];
    var dispInt=applyErr(ints,errs,kk);
    lines=["① "+av.toFixed(1)+"＋"+bv.toFixed(1)+"＝"+(dispInt[0]/10).toFixed(1),
           "② "+u0.toFixed(1)+"−"+cv.toFixed(1)+"＝"+(dispInt[1]/10).toFixed(1),
           "③ こたえ "+(dispInt[2]/10).toFixed(1)];
    fix=(ints[kk]/10).toFixed(1);
    vals=ints.map(function(x){return x/10;});   /* 真値 (number) を 2段階提出用に保持 */
  } else if(lv===8){
    /* Lv8: 分数 — 同分母加減。ミスは分子 ±1。 */
    var dd=pick([5,6,7,8]);
    var na=ri(1,dd-1), nb=ri(1,dd-1), nc=ri(1,Math.min(na+nb-1,dd-1));
    var k0=na+nb, k1=k0-nc;
    kk=ri(0,2);
    expr=na+"/"+dd+"＋"+nb+"/"+dd+"−"+nc+"/"+dd;
    var nums=[k0,k1,k1];
    errs=[fracNumErr(k0), fracNumErr(k1), fracNumErr(k1)];
    var dispN=applyErr(nums,errs,kk);
    lines=["① "+na+"/"+dd+"＋"+nb+"/"+dd+"＝"+dispN[0]+"/"+dd,
           "② "+k0+"/"+dd+"−"+nc+"/"+dd+"＝"+dispN[1]+"/"+dd,
           "③ こたえ "+dispN[2]+"/"+dd];
    fix=nums[kk]+"/"+dd;
  } else {
    /* Lv9: 複数行 — 4行式 (a×b + c×d + e)。乗算は九九ミス・加算はくり上がりミス。 */
    a=ri(3,9); b=ri(3,9); c=ri(3,9); d=ri(3,9); var e=ri(10,50);
    v0=a*b; v1=c*d; v2=v0+v1; var v3=v2+e;
    kk=ri(0,3);
    expr=a+"×"+b+"＋"+c+"×"+d+"＋"+e;
    vals=[v0,v1,v2,v3];
    errs=[mulErr(a,b), mulErr(c,d), carryErr(v2), carryErr(v3)];
    disp=applyErr(vals,errs,kk);
    lines=["① "+a+"×"+b+"＝"+disp[0],
           "② "+c+"×"+d+"＝"+disp[1],
           "③ "+v0+"＋"+v1+"＝"+disp[2],
           "④ "+v2+"＋"+e+"＝"+disp[3]];
    fix=vals[kk];
  }
  var ansIdx = noError ? lines.length : kk;
  var fixmsg = noError ? "ほんとうは ぜんぶ ただしいよ" : ("ほんとうは "+bld(kk)+" ＝ "+fix);
  /* requireValue (origLv が 9 または 10): 行タップだけで終わらせず「ほんとうの値」も入力させる 2段階提出。
     Lv9 は 4行式で問題形式が最複雑なので、ここから検算必須にする。
     Lv8 (分数) は 1段階のまま (frac 入力 UI を持たないため Lv10 では pick から除外)。
     trueVals は各行の真値配列。Lv7 (小数) のとき dot を有効にして小数点キーを出す。 */
  return {cat:"machigai",kind:"choice",text:expr,say:null,
    ans:ansIdx, lines:lines, noError:noError, fixmsg:fixmsg,
    requireValue:(origLv===9||origLv===10), trueVals:vals, dot:(lv===7), origLv:origLv};
}
function gWarizan(lv){
  if(lv==null)lv=ri(1,10);
  /* 段階構成:
       Lv1: 九九の逆 小範囲 (被除数 1-2桁混在 可)
       Lv2: 九九の逆 全範囲 (被除数 必ず2桁) ← 旧実装は1桁の被除数を許容していた
       Lv3: 2桁÷1桁 あまりなし
       Lv4: 2桁÷1桁 あまりあり (商を答える)            ← 旧実装は「あまりなし」だった
       Lv5: 3桁÷1桁 あまりなし
       Lv6: 3桁÷1桁 あまりあり (商を答える, 商2桁以上)
       Lv7: 3桁÷1桁 あまりあり (被除数を 100-999 に限定)
       Lv8: 2桁で割る あまりなし (商)                  ← 旧実装は「1桁で割る・あまり」だった
       Lv9: 2桁で割る あまりあり (商)
       Lv10: 商 / あまり / 検算 を混在                  ← 旧実装は商のみ */
  var a,b,d,q,dividend,t,ans;
  for(var attempt=0;attempt<200;attempt++){
    t=null;ans=null;
    if(lv===1){
      a=ri(2,9); b=ri(2,5);
      t=(a*b)+"÷"+a; ans=b;
    } else if(lv===2){
      a=ri(2,9); b=ri(2,9);
      dividend=a*b;
      if(dividend<10) continue;       /* 必ず被除数2桁以上 */
      t=dividend+"÷"+a; ans=b;
    } else if(lv===3){
      d=ri(2,9); q=ri(2,11); dividend=d*q;
      if(dividend<10||dividend>99) continue;
      t=dividend+"÷"+d; ans=q;
    } else if(lv===4){
      /* あまりあり 2桁÷1桁 (商) */
      d=ri(3,9); dividend=ri(11,99);
      if(dividend%d===0) continue;
      t=dividend+"÷"+d+" のしょう"; ans=Math.floor(dividend/d);
    } else if(lv===5){
      d=ri(2,9); q=ri(13,140); dividend=d*q;
      if(dividend<100||dividend>999) continue;
      t=dividend+"÷"+d; ans=q;
    } else if(lv===6){
      /* 3桁÷1桁 あまりあり 商 (商は 2 桁: 10..99)。
         N13: 旧版は qq<10 だけで上限が無く、 500÷3=166 のような商 3 桁問題が
         混ざり、 レベル説明「商2けた」と乖離していた。 */
      d=ri(3,9); dividend=ri(100,500);
      if(dividend%d===0) continue;
      var qq=Math.floor(dividend/d);
      if(qq<10||qq>99) continue;
      t=dividend+"÷"+d+" のしょう"; ans=qq;
    } else if(lv===7){
      /* 3桁÷1桁 あまりあり 商 (被除数 100-999 限定) */
      d=ri(2,9); dividend=ri(100,999);
      if(dividend%d===0) continue;
      t=dividend+"÷"+d+" のしょう"; ans=Math.floor(dividend/d);
    } else if(lv===8){
      /* 2桁で割る あまりなし (商) */
      d=ri(11,99); q=ri(2,30); dividend=d*q;
      if(dividend>999) continue;
      t=dividend+"÷"+d; ans=q;
    } else if(lv===9){
      /* 2桁で割る あまりあり (商) */
      d=ri(11,99); q=ri(2,30); dividend=d*q+ri(1,d-1);
      if(dividend>999) continue;
      if(dividend%d===0) continue;
      t=dividend+"÷"+d+" のしょう"; ans=Math.floor(dividend/d);
    } else {
      /* Lv10 総合: 商を問う / あまりを問う / 検算 (商×除数+あまり=被除数 確認) を均等混在 */
      var mode=ri(0,2);
      d=ri(3,9); dividend=ri(50,999);
      if(dividend%d===0) continue;
      if(mode===0){
        t=dividend+"÷"+d+" のしょう"; ans=Math.floor(dividend/d);
      } else if(mode===1){
        t=dividend+"÷"+d+" のあまり"; ans=dividend%d;
      } else {
        /* 検算: 「商×除数+あまり」が被除数になるよう逆問題 */
        var qx=Math.floor(dividend/d), rx=dividend%d;
        t=qx+"×"+d+"＋"+rx+" は いくつ？"; ans=qx*d+rx;
      }
    }
    if(t!=null&&ans!=null&&Number.isInteger(ans)&&ans>0){
      /* N11: 音声で「商か余りか」 を消すと、 ビギナーで読めない子が何を答えるか
         判別できない。 「の しょうは？」「の あまりは？」 として残す。 */
      return {cat:"warizan",kind:"num",text:t,say:t.replace("÷"," わる ").replace(" のしょう"," の しょうは？").replace(" のあまり"," の あまりは？"),ans:ans};
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
      // おつり2品 or 3数の合計
      if(Math.random()<0.6){
        var M=ri(15,30)*10, a=ri(10,90), b=ri(10,90);
        ans=M-(a+b);
        if(ans<=0) continue;
        var i1=pick(ITEMS), i2=pick(ITEMS);
        t=M+"円もって "+a+"円の"+i1+"と "+b+"円の"+i2+"を かいました。おつりは なん円？";
      } else {
        var x=ri(10,70), y=ri(10,70), z=ri(10,70);
        ans=x+y+z;
        t=x+"こ、"+y+"こ、"+z+"こ。あわせて なんこ？";
      }
    }
    else if(lv===4){
      // 合計S、片方a、もう片方
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      var a=ri(8,35), b=ri(8,35), S=a+b;
      ans=b;
      t=n1+"と "+n2+"は あわせて "+S+"こ あめを もっています。"+n1+"は "+a+"こです。"+n2+"は なんこ？";
    }
    else if(lv===5){
      // 差D、片方a、もう片方
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      var base=ri(8,40), D=ri(3,18);
      if(Math.random()<0.5){
        ans=base+D;
        t=n1+"は "+n2+"より "+D+"こ おおく もっています。"+n2+"は "+base+"こです。"+n1+"は なんこ？";
      } else {
        ans=base-D;
        if(ans<=0) continue;
        t=n1+"は "+n2+"より "+D+"こ すくなく もっています。"+n2+"は "+base+"こです。"+n1+"は なんこ？";
      }
    }
    else if(lv===6||lv===7){
      // 合計S、差Dから多い方/少ない方
      var maxv=(lv===6)?60:90;
      var big=ri(15,maxv), small=ri(5,big-1);
      if(small>=big) continue;
      var S=big+small, D=big-small;
      if(D<=0) continue;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      if(lv===6){
        ans=big;
        t=n1+"と "+n2+"の あめは あわせて "+S+"こ。ちがいは "+D+"こ。おおいほうは なんこ？";
      } else {
        ans=small;
        t=n1+"と "+n2+"の あめは あわせて "+S+"こ。ちがいは "+D+"こ。すくないほうは なんこ？";
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
      if(Math.random()<0.5){
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
      } else {
        var M=ri(30,60)*10, a=ri(30,90), b=ri(30,90);
        ans=M-a-b;
        if(ans<=0) continue;
        var i1=pick(ITEMS), i2=pick(ITEMS);
        t=M+"円もって "+a+"円の"+i1+"を かい、つぎに "+b+"円の"+i2+"を かいました。のこりは なん円？";
      }
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
  /* 段階構成:
       Lv1: 同じ時の中の経過 (h:m1 → h:m2)
       Lv2: 次の正時まで (h:m1 → (h+1):00)
       Lv3-4: 時をまたぐ経過
       Lv5: 開始時刻を求める (終了時刻と経過分から)     ← 旧: 任意時刻差
       Lv6: 終了時刻を求める (開始時刻と経過分から)     ← 旧: 任意時刻差
       Lv7: 時間と分を分に直す
       Lv8: 大きめの時刻差
       Lv9: 2段階 (休憩を挟む経過)                      ← 旧: 単純なまたぎ
       Lv10: 開始/終了/経過/単位換算を総合 */
  for(var i=0;i<200;i++){
    var h,h1,h2,m1,m2,t,ans,say;
    if(lv===1){ // 同じ時の中の経過
      h=ri(1,9); m1=ri(0,30); m2=ri(m1+1,59);
      t=h+"じ"+p2(m1)+"ふんから "+h+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=m2-m1; say="なんぷん";
    } else if(lv===2){ // 次の正時まで
      h=ri(1,9); m1=ri(1,59);
      t=h+"じ"+p2(m1)+"ふんから "+(h+1)+"じちょうどまで なんぷん？";
      ans=60-m1; say="なんぷん";
    } else if(lv<=4){ // 時をまたぐ経過 h:m1 -> (h+1):m2
      h=ri(1,9);
      if(lv===3){m1=ri(31,55);m2=ri(1,29);}
      else{m1=ri(20,58);m2=ri(1,55);}
      t=h+"じ"+p2(m1)+"ふんから "+(h+1)+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=(60-m1)+m2; say="なんぷん";
    } else if(lv===5){ // 開始時刻 逆算: 終了 - 経過 = 開始
      h2=ri(2,9); m2=ri(0,59);
      var dur5=ri(10,55);
      var sm=(h2*60+m2)-dur5; if(sm<=0) continue;
      h1=Math.floor(sm/60); m1=sm%60;
      t=h2+"じ"+p2(m2)+"ふんに おわりました。"+dur5+"ふんかかりました。なんじから はじめた？（こたえは ぷんだけ：○じ○ぷんの ぷんを かいてね）";
      ans=h1*60+m1;       /* 「分単位の合計」で答える設計（学習者には開始時刻を口頭で書かせるが、入力は分） */
      /* 上記は教育的に難しいので、別案: 開始の "○ふん" の部分を聞く */
      t=h2+"じ"+p2(m2)+"ふんに おわりました。"+dur5+"ふんかかりました。なんじ なんぷん から はじめた？（こたえは ふん の数字）";
      ans=m1; say="ふん";
      if(m1===0) continue; /* 0分はキリ過ぎなので避ける */
    } else if(lv===6){ // 終了時刻 逆算: 開始 + 経過 = 終了
      h1=ri(1,8); m1=ri(0,55);
      var dur6=ri(10,55);
      var em=(h1*60+m1)+dur6;
      h2=Math.floor(em/60); m2=em%60;
      t=h1+"じ"+p2(m1)+"ふんから はじめました。"+dur6+"ふんかかりました。なんじ なんぷんに おわった？（こたえは ふん の数字）";
      ans=m2; say="ふん";
    } else if(lv===7){ // ○時間○分は何分？
      var hh=ri(1,3); var mm=ri(1,59);
      t=hh+"じかん"+mm+"ふんは ぜんぶで なんぷん？";
      ans=hh*60+mm; say="なんぷん";
    } else if(lv===8){ // 大きめの時刻差
      h1=ri(1,6); m1=ri(0,59);
      h2=ri(h1+2,11); m2=ri(0,59);
      var tot8=(h2*60+m2)-(h1*60+m1);
      if(tot8<=0) continue;
      t=h1+"じ"+p2(m1)+"ふんから "+h2+"じ"+p2(m2)+"ふんまで なんぷん？";
      ans=tot8; say="なんぷん";
    } else if(lv===9){ // 2段階: 休憩をはさんで合計経過
      h1=ri(1,5); m1=ri(0,30);
      var workA=ri(20,45), brk=ri(10,20), workB=ri(20,45);
      t="あさ "+h1+"じ"+p2(m1)+"ふんから べんきょうを はじめました。"+workA+"ふん べんきょうして、"+brk+"ふん きゅうけい、また "+workB+"ふん べんきょうしました。べんきょうは ぜんぶで なんぷん？";
      ans=workA+workB; say="なんぷん";
    } else { // lv===10 総合: 経過/逆算/換算 をランダム
      var mode=ri(0,3);
      if(mode===0){ // 大きい時刻差
        h1=ri(1,5); m1=ri(15,59);
        h2=ri(h1+3,11); m2=ri(0,m1-1);
        var t10=(h2*60+m2)-(h1*60+m1);
        if(t10<=0) continue;
        t=h1+"じ"+p2(m1)+"ふんから "+h2+"じ"+p2(m2)+"ふんまで なんぷん？";
        ans=t10; say="なんぷん";
      } else if(mode===1){ // 換算
        var hh10=ri(2,5), mm10=ri(1,59);
        t=hh10+"じかん"+mm10+"ふんは ぜんぶで なんぷん？";
        ans=hh10*60+mm10; say="なんぷん";
      } else if(mode===2){ // 逆算開始
        h2=ri(3,9); m2=ri(0,59);
        var dur=ri(15,90);
        var sm10=(h2*60+m2)-dur; if(sm10<=0) continue;
        var mm10s=sm10%60;
        if(mm10s===0) continue;
        t=h2+"じ"+p2(m2)+"ふんに おわりました。"+dur+"ふんかかりました。なんじ なんぷん から はじめた？（こたえは ふん）";
        ans=mm10s; say="ふん";
      } else { // 逆算終了
        h1=ri(1,7); m1=ri(0,55);
        var dur10b=ri(15,90);
        var em10=(h1*60+m1)+dur10b;
        var mm10e=em10%60;
        t=h1+"じ"+p2(m1)+"ふんから はじめました。"+dur10b+"ふんかかりました。なんじ なんぷんに おわった？（こたえは ふん）";
        ans=mm10e; say="ふん";
      }
    }
    if(t!=null&&Number.isInteger(ans)&&ans>=0){
      return {cat:"jikan",kind:"num",text:t,say:say,ans:ans};
    }
  }
  return {cat:"jikan",kind:"num",text:"3じ10ぷんから 3じ25ふんまで なんぷん？",say:"なんぷん",ans:15};
}
function gKakebun(lv){
  if(lv==null) lv=ri(1,10);
  if(lv<1) lv=1; if(lv>10) lv=10;
  var cat="kakebun";
  /* 段階構成:
       Lv1: 単価×個数（1あたり×個数）
       Lv2: 個数を求める（合計÷単価）       ← 旧: 単価×個数 と重複
       Lv3: 単価を求める（合計÷個数）       ← 旧: 等分除
       Lv4: 2段階かけ算 (a×b×c)             ← 旧: 等分除と重複
       Lv5: かけ算標準（多様な場面）         ← 旧: 単価+送料
       Lv6: わり算標準（等分除＋包含除）     ← 旧: 単価+おつり
       Lv7: ×÷混在
       Lv8: 単位あたり
       Lv9: 消費・残り
       Lv10: 全形式の総合 */
  for(var attempt=0; attempt<200; attempt++){
    var r=null;
    if(lv===1){
      var item=pick(["りんご","あめ","えんぴつ","シール","クッキー"]);
      var p=ri(2,9)*10, n=ri(2,5);
      r={cat:cat,kind:"num",text:"1こ "+p+"円の "+item+" を "+n+"こ かいます。ぜんぶで いくら？",say:null,ans:p*n};
    } else if(lv===2){
      /* 個数逆算: 合計÷単価 */
      var p2=ri(3,9)*10, n2=ri(2,9), tot2=p2*n2;
      var item2=pick(["りんご","あめ","えんぴつ","シール","クッキー"]);
      r={cat:cat,kind:"num",text:"1こ "+p2+"円の "+item2+" を ぜんぶで "+tot2+"円 かいました。なんこ かった？",say:null,ans:n2};
    } else if(lv===3){
      /* 単価逆算: 合計÷個数 */
      var p3=ri(3,12)*10, n3=ri(2,9), tot3=p3*n3;
      var item3=pick(["パン","ジュース","えんぴつ","くだもの"]);
      r={cat:cat,kind:"num",text:n3+"この "+item3+"を おなじねだんで かったら ぜんぶで "+tot3+"円でした。1こ なん円？",say:null,ans:p3};
    } else if(lv===4){
      /* 2段階かけ算 a×b×c (箱入り×箱数×まとめ買い、または列×段×個数) */
      var a4=ri(2,9), b4=ri(2,9), c4=ri(2,6);
      var pat4=ri(0,1);
      if(pat4===0){
        r={cat:cat,kind:"num",text:"1はこ "+a4+"こ入りの あめが "+b4+"はこ あります。それを "+c4+"セット かいます。ぜんぶで 何こ？",say:null,ans:a4*b4*c4};
      } else {
        r={cat:cat,kind:"num",text:"いすが よこに "+a4+"きゃく、たてに "+b4+"れつ、それが "+c4+"へやに あります。いすは ぜんぶで 何きゃく？",say:null,ans:a4*b4*c4};
      }
    } else if(lv===5){
      /* かけ算標準: 単位あたり、面積、配給など多様な場面 */
      var pat5=ri(0,2);
      if(pat5===0){
        /* 単位あたり */
        var rate5=ri(3,12), time5=ri(3,9);
        r={cat:cat,kind:"num",text:"1分に "+rate5+"こ おかしを 作る きかいで "+time5+"分 作ると 何こ？",say:null,ans:rate5*time5};
      } else if(pat5===1){
        /* 面積 */
        var w5=ri(4,15), h5=ri(3,12);
        r={cat:cat,kind:"num",text:"たて "+h5+"m、よこ "+w5+"m の はたけの 面積は 何 m2？",say:null,ans:w5*h5};
      } else {
        /* 配給 */
        var k5=ri(3,8), per5=ri(2,5);
        r={cat:cat,kind:"num",text:k5+"人に カード を 1人 "+per5+"まいずつ くばります。カードは ぜんぶで 何まい いる？",say:null,ans:k5*per5};
      }
    } else if(lv===6){
      /* わり算標準: 等分除と包含除を均等に */
      var pat6=ri(0,1);
      if(pat6===0){
        /* 等分除: 全体を N人で分ける */
        var nn=ri(3,8), per6=ri(3,12), tot6=nn*per6;
        r={cat:cat,kind:"num",text:tot6+"この おかしを "+nn+"人で おなじ数ずつ わけると 1人 何こ？",say:null,ans:per6};
      } else {
        /* 包含除: 全体に何セット入るか */
        var per6b=ri(3,9), set6=ri(3,12), tot6b=per6b*set6;
        r={cat:cat,kind:"num",text:tot6b+"この りんごを 1ふくろに "+per6b+"こずつ 入れると なんふくろ できる？",say:null,ans:set6};
      }
    }else{
      /* Lv7-10:
           Lv7: ×÷混在 (1箱×m箱÷p人=等分)
           Lv8: 単位あたり (a個でb円から c個)
           Lv9: 消費・残り (rate×時間 − 消費)
           Lv10: 全形式の総合 (Lv1-9 からランダム) */
      if(lv===10){
        /* Lv10 総合: Lv 1-9 をランダム再帰 */
        return gKakebun(ri(1,9));
      }
      var sub;
      if(lv===7) sub=0;
      else if(lv===8) sub=1;
      else sub=2;  /* lv===9 */
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
/* K5DEV発展27カテゴリの汎用生成器: shared/k5_devs_data.js のプールから出題。
   各カテゴリのLv1-10は学習指導要領(小1-小4)に沿った段階仕様で生成済み。 */
/* N10: K5DEV データの読込失敗 / Lv 欠落 / pool 空 のとき fail-closed にして
   null を返す。 旧版は「1+1」 を返し、 1+1 だけで全発展カテゴリを Lv10 にできる
   抜け道だった。 caller (buildPractice / genBy) で null を見て出題ブロック + 警告。 */
function gK5Dev(cat, lv, opts){
  if(lv==null) lv=ri(1,10);
  lv=Math.max(1,Math.min(10,lv));
  var data=window.Q4B_K5DEVS && window.Q4B_K5DEVS[cat];
  if(!data || !data.levels || !data.levels[lv-1]) return null;
  var pool=data.levels[lv-1].pool || [];
  if(!pool.length) return null;
  /* N8: missedKey で別 Lv 弱点が上書きされないよう、 patternId を text の安定
     ハッシュで付与 (data 不変なので text を identifier として使える)。 */
  /* N7: caller (buildPractice) で「セット内重複排除」 のために excludeIdx を渡す。 */
  var exclude = (opts && opts.exclude) || {};
  var candidates = pool.map(function(qq,i){return {idx:i,qq:qq};}).filter(function(o){return !exclude[o.idx];});
  if(!candidates.length) candidates = pool.map(function(qq,i){return {idx:i,qq:qq};});
  var picked = candidates[Math.floor(Math.random()*candidates.length)];
  var q = picked.qq;
  var ans=String(q.ans);
  var choices=[ans];
  (q.distractors||[]).forEach(function(d){ var s=String(d); if(choices.indexOf(s)<0)choices.push(s); });
  return {cat:cat,kind:"choice",text:q.text,say:null,ans:ans,choices:shuffle(choices),
          lv:lv, patternId:'k5dev:'+cat+':'+lv+':'+picked.idx, _k5devIdx:picked.idx};
}
/* 九九暗唱: 「ににんがし」「にさんがろく」のフレーズを覚える専用カテゴリ。
   小学校の指導順(2→5→3→4→6→7→8→9→1)で学習。
   Lv1: 2の段 / Lv2: 5の段 / Lv3: 3の段 / Lv4: 4の段 / Lv5: 6の段
   Lv6: 7の段 / Lv7: 8の段 / Lv8: 9の段 / Lv9: 1の段 / Lv10: 全段ミックス */
function gKukuYomi(lv){
  if(lv==null) lv=ri(1,10);
  /* 九九暗唱表: 各段9個ずつ。読み(全文)で記憶 */
  var KUKU={
    1:["いんいちがいち","いんにがに","いんさんがさん","いんしがし","いんごがご","いんろくがろく","いんしちがしち","いんはちがはち","いんくがく"],
    2:["にいちがに","ににんがし","にさんがろく","にしがはち","にごじゅう","にろくじゅうに","にしちじゅうし","にはちじゅうろく","にくじゅうはち"],  /* N5: 旧「ににんがに」は 2×1 の正規読み 「にいちがに」 に訂正 */
    3:["さんいちがさん","さんにがろく","さざんがく","さんしじゅうに","さんごじゅうご","さぶろくじゅうはち","さんしちにじゅういち","さんぱにじゅうし","さんくにじゅうしち"],
    4:["しいちがし","しにがはち","しさんじゅうに","ししじゅうろく","しごにじゅう","しろくにじゅうし","ししちにじゅうはち","しはさんじゅうに","しくさんじゅうろく"],
    5:["ごいちがご","ごにじゅう","ごさんじゅうご","ごしにじゅう","ごごにじゅうご","ごろくさんじゅう","ごしちさんじゅうご","ごはしじゅう","ごっくしじゅうご"],
    6:["ろくいちがろく","ろくにじゅうに","ろくさんじゅうはち","ろくしにじゅうし","ろくごさんじゅう","ろくろくさんじゅうろく","ろくしちしじゅうに","ろくはしじゅうはち","ろっくごじゅうし"],
    7:["しちいちがしち","しちにじゅうし","しちさんにじゅういち","しちしにじゅうはち","しちごさんじゅうご","しちろくしじゅうに","しちしちしじゅうく","しちはごじゅうろく","しちくろくじゅうさん"],
    8:["はちいちがはち","はちにじゅうろく","はっさんにじゅうし","はちしさんじゅうに","はちごしじゅう","はちろくしじゅうはち","はちしちごじゅうろく","はっぱろくじゅうし","はっくしちじゅうに"],
    9:["くいちがく","くにじゅうはち","くさんにじゅうしち","くしさんじゅうろく","くごしじゅうご","くろくごじゅうし","くしちろくじゅうさん","くはしちじゅうに","くくはちじゅういち"]
  };
  /* 段の値(N)とdan順位の対応 */
  var dans=[2,5,3,4,6,7,8,9,1];
  var dan;
  if(lv>=10){ dan=dans[Math.floor(Math.random()*dans.length)]; }
  else { dan=dans[Math.min(lv-1, dans.length-1)]; }
  var b=ri(1,9);
  var phrase=KUKU[dan][b-1];
  var fullVal=dan*b;
  var pattern=Math.floor(Math.random()*4);
  /* 4つの出題パターン: A: 結果穴埋め / B: 段の名前穴埋め / C: フレーズ→値 / D: 値→フレーズ */
  if(pattern===0){
    /* A: 結果穴埋め "ににんが____" → 選択肢に正解＋紛らわしいもの。
       旧版は末尾 2-3 文字を機械的に切っており「にに-んがし」 のような無意味な分割
       になっていた (N5)。 「が」 直後 / 「じゅう」 直前を 意味のある切れ目として優先。 */
    function splitKukuPhrase(ph){
      var gIdx=ph.indexOf('が');
      if(gIdx>=0 && gIdx+1<ph.length) return {head:ph.substring(0,gIdx+1), tail:ph.substring(gIdx+1)};
      var jIdx=ph.indexOf('じゅう');
      if(jIdx>0) return {head:ph.substring(0,jIdx), tail:ph.substring(jIdx)};
      return {head:ph.substring(0, Math.max(1,ph.length-2)), tail:ph.substring(Math.max(1,ph.length-2))};
    }
    var sp=splitKukuPhrase(phrase);
    var headSimple=sp.head, tail=sp.tail;
    /* 同段の他フレーズから「同じ切り方」 の tail 候補を集める */
    var tails=KUKU[dan].map(function(p){return splitKukuPhrase(p).tail;}).filter(function(t,i,a){return a.indexOf(t)===i&&t!==tail;});
    if(tails.length<3){
      var others=dans.filter(function(d){return d!==dan;}).slice(0,3);
      others.forEach(function(od){ KUKU[od].forEach(function(p){var t=splitKukuPhrase(p).tail;if(tails.indexOf(t)<0&&t!==tail)tails.push(t);}); });
    }
    tails=shuffle(tails).slice(0,3);
    var choicesA=shuffle([tail].concat(tails));
    return {cat:"kukuyomi",kind:"choice",text:'「'+headSimple+'____」の つづきは？',say:null,ans:tail,choices:choicesA};
  }
  if(pattern===1){
    /* B: フレーズ全体から値を答える「ににんがし は いくつ？」→4 */
    var distractors=[];
    while(distractors.length<3){
      var dv=fullVal+(ri(0,1)?ri(1,10):-ri(1,Math.min(fullVal-1,10)));
      if(dv>0&&dv!==fullVal&&distractors.indexOf(dv)<0)distractors.push(dv);
    }
    return {cat:"kukuyomi",kind:"choice",text:'「'+phrase+'」 は いくつ？',say:null,ans:fullVal,choices:shuffle([fullVal].concat(distractors))};
  }
  if(pattern===2){
    /* C: 値→フレーズ "2×4=8 を 九九で よむと？" */
    var wrongPhrases=[];
    /* 同じ段の他、または近い値の他段 */
    KUKU[dan].forEach(function(p){if(p!==phrase&&wrongPhrases.indexOf(p)<0)wrongPhrases.push(p);});
    if(wrongPhrases.length<3){
      dans.filter(function(d){return d!==dan;}).slice(0,3).forEach(function(od){ KUKU[od].forEach(function(p){if(wrongPhrases.indexOf(p)<0)wrongPhrases.push(p);}); });
    }
    wrongPhrases=shuffle(wrongPhrases).slice(0,3);
    return {cat:"kukuyomi",kind:"choice",text:dan+'×'+b+'='+fullVal+' を 九九で よむと？',say:null,ans:phrase,choices:shuffle([phrase].concat(wrongPhrases))};
  }
  /* D: フレーズの次は？「にさんがろく の つぎは？」→「にしがはち」(b+1の同じ段) */
  if(b>=9){ /* 9の次がないので別パターンに振り替え */
    var distractors2=[];
    while(distractors2.length<3){
      var dv2=fullVal+(ri(0,1)?ri(1,10):-ri(1,Math.min(fullVal-1,10)));
      if(dv2>0&&dv2!==fullVal&&distractors2.indexOf(dv2)<0)distractors2.push(dv2);
    }
    return {cat:"kukuyomi",kind:"choice",text:'「'+phrase+'」 は いくつ？',say:null,ans:fullVal,choices:shuffle([fullVal].concat(distractors2))};
  }
  var nextPhrase=KUKU[dan][b];
  var wrongs=[];
  KUKU[dan].forEach(function(p){if(p!==nextPhrase&&p!==phrase&&wrongs.indexOf(p)<0)wrongs.push(p);});
  wrongs=shuffle(wrongs).slice(0,3);
  return {cat:"kukuyomi",kind:"choice",text:'「'+phrase+'」 の つぎは？',say:null,ans:nextPhrase,choices:shuffle([nextPhrase].concat(wrongs))};
}
function gNoudo(lv){
  if(lv==null)lv=ri(1,10);
  var t="", ans=0;
  for(var iter=0;iter<200;iter++){
    if(lv===1){
      // 食塩水全体量: 水ag + 食塩bg = 全体何g？  ※基礎の「濃度＝部分／全体」の意味づけ
      var a1=ri(50,300), b1=ri(10,60);
      ans=a1+b1;
      t="水 "+a1+"g に 食塩 "+b1+"g を とかしました。食塩水は ぜんぶで 何 g？";
    }
    else if(lv===2){
      // 食塩の量: x%の食塩水yg中の食塩は何g？
      var x=ri(5,25);
      var y=ri(1,6)*100;
      if((x*y)%100!==0) continue;
      ans=x*y/100;
      if(ans<=0) continue;
      t=x+"% の食塩水 "+y+"g の中に、食塩は何 g とけている？";
    }
    else if(lv===3){
      // 濃さを求める: 食塩ag を 水bg にとかす→濃度何%？
      var a3=ri(5,60), b3=ri(40,300);
      var denom3=a3+b3;
      if((100*a3)%denom3!==0) continue;
      ans=100*a3/denom3;
      if(ans<=0||ans>=100) continue;
      t="食塩 "+a3+"g を 水 "+b3+"g にとかしました。濃度は何 % ？";
    }
    else if(lv===4){
      // 水を足す: x%の食塩水ag に 水bg を加える→何%？
      var x4=ri(5,25), a4=ri(1,5)*100, b4=ri(1,5)*50;
      if((x4*a4)%100!==0) continue;
      var salt4=x4*a4/100;
      var denom4=a4+b4;
      if((100*salt4)%denom4!==0) continue;
      ans=100*salt4/denom4;
      if(ans<=0||ans>=100) continue;
      t=x4+"% の食塩水 "+a4+"g に 水 "+b4+"g を加えました。濃度は何 % ？";
    }
    else if(lv===5){
      // 食塩を足す: x%の食塩水ag に 食塩cg を加える→何%？
      var x5=ri(5,25), a5=ri(1,5)*100, c5=ri(5,60);
      if((x5*a5)%100!==0) continue;
      var salt5=x5*a5/100;
      var denom5=a5+c5;
      if((100*(salt5+c5))%denom5!==0) continue;
      ans=100*(salt5+c5)/denom5;
      if(ans<=0||ans>=100) continue;
      t=x5+"% の食塩水 "+a5+"g に 食塩 "+c5+"g を加えました。濃度は何 % ？";
    }
    else if(lv===6){
      // 2液混合 入門: x%ag と y%bg (小さめ)
      var x6=ri(3,15), y6=ri(3,15);
      if(x6===y6) continue;
      var a6=ri(1,3)*100, b6=ri(1,3)*100;
      if((x6*a6)%100!==0 || (y6*b6)%100!==0) continue;
      var denom6=a6+b6, num6=x6*a6+y6*b6;
      if(num6%denom6!==0) continue;
      ans=num6/denom6;
      if(ans<=0||ans>=100) continue;
      t=x6+"% の食塩水 "+a6+"g と "+y6+"% の食塩水 "+b6+"g を混ぜました。濃度は何 % ？";
    }
    else if(lv===7){
      // 2液混合 標準: 範囲拡大
      var x7=ri(3,20), y7=ri(3,20);
      if(x7===y7) continue;
      var a7=ri(1,5)*100, b7=ri(1,5)*100;
      if((x7*a7)%100!==0 || (y7*b7)%100!==0) continue;
      var denom7=a7+b7, num7=x7*a7+y7*b7;
      if(num7%denom7!==0) continue;
      ans=num7/denom7;
      if(ans<=0||ans>=100) continue;
      t=x7+"% の食塩水 "+a7+"g と "+y7+"% の食塩水 "+b7+"g を混ぜました。濃度は何 % ？";
    }
    else if(lv===8){
      // 逆算: y%にするには 水を何g 加える？
      var x8=ri(8,25);
      var y8=ri(2,x8-1);
      var a8=ri(1,5)*100;
      if((x8*a8)%100!==0) continue;
      var salt8=x8*a8/100;
      // 食塩量 salt8 / y% = 全体 → 加える水 = 全体 - a8
      var totalGoal=salt8*100/y8;
      if(totalGoal<=a8) continue;
      var addW=totalGoal-a8;
      if(!Number.isInteger(addW)) continue;
      ans=addW;
      t=x8+"% の食塩水 "+a8+"g を "+y8+"% にするには、水を何 g 加える？";
    }
    else if(lv===9){
      // 蒸発: x%ag から bg 蒸発させると何%？(食塩不変)
      var x9=ri(5,20), a9=ri(2,6)*100, b9=ri(1,4)*50;
      if(b9>=a9) continue;
      if((x9*a9)%100!==0) continue;
      var salt9=x9*a9/100, denom9=a9-b9;
      if(denom9<=salt9) continue;
      if((100*salt9)%denom9!==0) continue;
      ans=100*salt9/denom9;
      if(ans<=0||ans>=100) continue;
      t=x9+"% の食塩水 "+a9+"g から 水 "+b9+"g を蒸発させました。濃度は何 % ？";
    }
    else {
      // Lv10 総合: 加水/加塩/蒸発/混合/逆算 をランダム
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
    if(lv===1){
      // 比の意味: 「同じ比に直す」= 約分。例 6:9 を いちばん かんたんな比に。
      var base1=ri(2,5), base2=ri(2,5);
      if(base1===base2) continue;
      if(gcd(base1,base2)!==1) continue;        // 既約の基準比
      var m=ri(2,6);
      var p=base1*m, q=base2*m;
      // どちらを問うか: 約分後の小さい方/大きい方をランダムに
      var askA = Math.random()<0.5;
      ans = askA ? base1 : base2;
      if(ans<=0) continue;
      t=p+":"+q+" を いちばん かんたんな 比に なおすと、"+(askA?"まえ":"うしろ")+"の 数は いくつ？";
    }
    else if(lv===2){
      // 比例の基本: 既約 a:b、一方の実数から他方を求める
      var a=ri(1,6), b=ri(1,6);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,7);
      var askA = Math.random()<0.5;
      var givenVal = askA ? a*k : b*k;
      ans = askA ? b*k : a*k;
      if(ans<=0||givenVal<=0) continue;
      t="赤と青の おはじきの 比は "+a+":"+b+"。"+(askA?"赤":"青")+"が "+givenVal+"個の とき、"+(askA?"青":"赤")+"は なん個？";
    }
    else if(lv===3){
      // 比例配分(2) 小: 全部Nを a:b に分けて、おおい/すくない方
      var a=ri(1,4), b=ri(1,4);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,8);
      var N=(a+b)*k, partA=a*k, partB=b*k;
      var askBig = Math.random()<0.5;
      var bigPart=Math.max(partA,partB), smallPart=Math.min(partA,partB);
      ans = askBig?bigPart:smallPart;
      if(ans<=0) continue;
      t=pick(ITEMS)+"が ぜんぶで "+N+"個。これを "+a+":"+b+" に分けます。"+(askBig?"おおい":"すくない")+"ほうは なん個？";
    }
    else if(lv===4){
      // 比例配分(2) 大 + 差を問う: 多い方と少ない方の差はいくつ？
      var a=ri(2,7), b=ri(1,7);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(3,12);
      var N=(a+b)*k, partA=a*k, partB=b*k;
      var diff=Math.abs(partA-partB);
      ans=diff;
      if(ans<=0) continue;
      t=pick(ITEMS)+"が ぜんぶで "+N+"個。これを "+a+":"+b+" に分けると、おおい ほうと すくない ほうの 差は なん個？";
    }
    else if(lv===5){
      // 比の差からの逆算: a:b に分けたら 差が D だった → 多い方 or 少ない方 or 全体
      var a=ri(2,7), b=ri(1,6);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var big=Math.max(a,b), small=Math.min(a,b);
      var k=ri(2,9);
      var D=(big-small)*k;
      var bigPart=big*k, smallPart=small*k, N=(a+b)*k;
      var ask=ri(0,2); // 0:多い方 1:少ない方 2:全体
      ans = (ask===0)? bigPart : (ask===1)? smallPart : N;
      if(ans<=0) continue;
      var askName=["おおい ほう","すくない ほう","ぜんたい"][ask];
      t=pick(ITEMS)+"を "+a+":"+b+" に 分けたら、おおい ほうと すくない ほうの 差が "+D+"個に なりました。"+askName+"は なん個？";
    }
    else if(lv===6){
      // 比例配分(3): N を a:b:c に分けて、ある1グループ
      var a=ri(1,5), b=ri(1,5), c=ri(1,5);
      var k=ri(2,8);
      var N=(a+b+c)*k, rs=[a,b,c], which=ri(0,2);
      ans=rs[which]*k;
      if(ans<=0) continue;
      var nm=["1ばんめ","2ばんめ","3ばんめ"][which];
      t=pick(ITEMS)+"が ぜんぶで "+N+"個。これを "+a+":"+b+":"+c+" に分けます。"+nm+"の グループは なん個？";
    }
    else if(lv===7){
      // 連比入門: A:B と B:C の共通項B をそろえて A:B:C → A:C をいちばん かんたんな比で
      var a=ri(1,4), b1=ri(2,5);
      var b2=ri(2,5), c=ri(1,4);
      var ra=a*b2, rc=b1*c;                    // 合成 A:C = ra:rc
      var g=gcd(ra,rc);
      var ra2=ra/g, rc2=rc/g;
      if(ra2===rc2) continue;
      var askA = Math.random()<0.5;
      ans = askA ? ra2 : rc2;
      if(ans<=0) continue;
      t="A:B = "+a+":"+b1+"、 B:C = "+b2+":"+c+" です。A:C を いちばん かんたんな 比で あらわすと、"+(askA?"A":"C")+"の 数は いくつ？";
    }
    else if(lv===8){
      // 連比標準: A:B と B:C から A:C を作って、A or C の実数を求める
      var a=ri(1,6), b1=ri(2,7);
      var b2=ri(2,7), c=ri(1,6);
      var ra=a*b2, rc=b1*c;
      var k=ri(2,6);
      var askA = Math.random()<0.5;
      var givenVal = askA ? ra*k : rc*k;
      ans = askA ? rc*k : ra*k;
      if(ans<=0||givenVal<=0) continue;
      t="A:B = "+a+":"+b1+"、 B:C = "+b2+":"+c+" です。"+(askA?"A":"C")+"が "+givenVal+"個の とき、"+(askA?"C":"A")+"は なん個？";
    }
    else if(lv===9){
      // 分数で表された部分量から逆算: 「全体の a/b が given個 → 全体は？」または「のこりが given → 全体は？」
      var b=ri(2,6), a=ri(1,b-1);
      var whole=b*ri(3,10);
      var useRest = Math.random()<0.5;
      if(useRest){
        // のこり (b-a)/b が given → 全体
        var rest=whole*(b-a)/b;
        if(!Number.isInteger(rest)||rest<=0) continue;
        ans=whole;
        t=pick(ITEMS)+"の ぜんたいの "+a+"/"+b+"を つかったら、のこりは "+rest+"個でした。はじめは ぜんぶで なん個？";
      } else {
        var given=whole*a/b;
        if(!Number.isInteger(given)||given<=0) continue;
        ans=whole;
        t=pick(ITEMS)+"ぜんたいの "+a+"/"+b+"が "+given+"個です。ぜんたいは なん個？";
      }
    }
    else { // lv===10
      // 複合2ステップ: 全体Nから a/b を使い、のこりを c:d に分ける → 一方のグループ
      var which=ri(0,1);
      if(which===0){
        // のこりを c:d に分ける
        var b=ri(2,5), a=ri(1,b-1);
        var c=ri(1,4), d=ri(1,4);
        if(c===d) continue;
        if(gcd(c,d)!==1) continue;
        var N=b*(c+d)*ri(2,6);
        var used=N*a/b;
        var rest=N-used;
        if(!Number.isInteger(rest)||rest<=0) continue;
        if(rest%(c+d)!==0) continue;
        var askBig=Math.random()<0.5;
        var bigPart=Math.max(c,d)*(rest/(c+d));
        var smallPart=Math.min(c,d)*(rest/(c+d));
        ans=askBig?bigPart:smallPart;
        if(ans<=0||!Number.isInteger(ans)) continue;
        t=pick(ITEMS)+"が "+N+"個 あります。ぜんたいの "+a+"/"+b+"を つかい、のこりを "+c+":"+d+" に 分けます。"+(askBig?"おおい":"すくない")+"ほうは なん個？";
      } else {
        // 2回の比: A:B = a:b、その後 B のうち c/d を使う → 使った量
        var a=ri(1,5), b=ri(1,5);
        if(a===b) continue;
        if(gcd(a,b)!==1) continue;
        var d=ri(2,5), c=ri(1,d-1);
        var k=d*ri(2,6);
        var N=(a+b)*k;
        var Bpart=b*k;
        var used=Bpart*c/d;
        if(!Number.isInteger(used)||used<=0) continue;
        ans=used;
        t=pick(ITEMS)+"が ぜんぶで "+N+"個 あります。A と B に "+a+":"+b+" で 分け、B の "+c+"/"+d+"を つかいました。つかった のは なん個？";
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  // フォールバック: 最低限 valid な問題を保証
  if(!(ans>0 && Number.isInteger(ans))){
    ans=6;
    t="赤と青の おはじきの 比は 2:3。赤が 4個の とき、青は なん個？";
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
        // lv8: 金額型つるかめ(発展) — 値段違い2種で「合計金額が予算を上回るか足りないか」型
        //      旧実装は過不足算が混入していた(別カテゴリーの内容)ため金額型に戻す。
        var GOODS8=[["りんご","みかん"],["シャープペン","えんぴつ"],["ケーキ","プリン"]];
        var pr8 = pick(GOODS8);
        var pA = ri(5,9)*10;
        var pB = ri(2,pA/10-1)*10;
        if(pB<=0) continue;
        var nT = ri(10,20);                  // 個数合計(大きめ)
        var nA = ri(2, nT-2);
        var nB = nT - nA;
        var total8 = pA*nA + pB*nB;
        ans = nA;                            // 高い方を問う
        if(ans<=0) continue;
        t = "1個 "+pA+"円の "+pr8[0]+"と 1個 "+pB+"円の "+pr8[1]+"を あわせて "+nT+"個 買ったら "
          + "代金は "+total8+"円でした。"+pr8[0]+"は 何個 買いましたか。";
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
  var BUYS=["みかん","りんご","ジュース","パン","ノート"];
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // あまり型のみ：1人per個ずつ配ると extra あまる → 何人？
      var per=ri(2,4);
      var people=ri(4,8);
      var item=pick(ITEMS);
      var extra=ri(1, Math.max(1,per-1));
      var total=per*people+extra;
      ans=people;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=item+"を 1人に "+per+"個ずつ 配ると "+extra+"個 あまります。"+item+"は ぜんぶで "+total+"個 あります。子どもは 何人？";
    }
    else if(lv===2){
      // たりない型のみ：1人per個ずつ配るには shortage 個 たりない → 何人？
      var per=ri(2,5);
      var people=ri(4,10);
      var item=pick(ITEMS);
      var shortage=ri(1, Math.max(1,per-1));
      var total=per*people-shortage;
      if(total<=0) continue;
      ans=people;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=item+"を 1人に "+per+"個ずつ 配るには "+shortage+"個 たりません。"+item+"は ぜんぶで "+total+"個 あります。子どもは 何人？";
    }
    else if(lv===3){
      // 同符号2配り方：両方あまり or 両方たりない → 1人分の差で人数
      // perA<perB として (perB-perA)*people = remA - remB (両あまり) or shortA - shortB
      var perA=ri(2,4);
      var perB=perA+ri(1,3);
      var people=ri(4,10);
      var item=pick(ITEMS);
      var diff=perB-perA;
      if(ri(0,1)===0){
        // 両方あまり：少なく配ると remA あまり、多く配ると remB あまる (remA>remB>=0)
        var remB=ri(0, Math.max(0,perB-2));
        var remA=remB + diff*people; // remA = remB + diff*people
        if(remA<=remB) continue;
        var total=perA*people+remA;
        if(total!==perB*people+remB) continue;
        ans=people;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        t=item+"を 1人に "+perA+"個ずつ 配ると "+remA+"個 あまり、1人に "+perB+"個ずつ 配ると "+remB+"個 あまります。子どもは 何人？";
      } else {
        // 両方たりない：少なく配るとshortAたりない、多く配るとshortBたりない (shortB>shortA>=1)
        var shortA=ri(1, Math.max(1,perA-1));
        var shortB=shortA + diff*people;
        if(shortB<=shortA) continue;
        var total=perA*people-shortA;
        if(total<=0) continue;
        if(total!==perB*people-shortB) continue;
        ans=people;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        t=item+"を 1人に "+perA+"個ずつ 配るには "+shortA+"個 たりず、1人に "+perB+"個ずつ 配るには "+shortB+"個 たりません。子どもは 何人？";
      }
    }
    else if(lv===4){
      // 過不足(余り+不足) → 人数
      var perA=ri(2,4);
      var perB=perA+ri(1,3);
      var people=ri(4,9);
      var item=pick(ITEMS);
      var diff=perB-perA;
      var totalDiff=diff*people;
      if(totalDiff<2) continue;
      var remA=ri(1, totalDiff-1);
      var shortB=totalDiff-remA;
      if(shortB<=0) continue;
      var total=perA*people+remA;
      if(perB*people-shortB!==total) continue;
      ans=people;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t=item+"を 1人に "+perA+"個ずつ 配ると "+remA+"個 あまり、1人に "+perB+"個ずつ 配るには "+shortB+"個 たりません。子どもは 何人？";
    }
    else if(lv===5){
      // 過不足 → 全体個数 (人数→個数を計算するステップを追加)
      var perA=ri(2,5);
      var perB=perA+ri(1,3);
      var people=ri(4,12);
      var item=pick(ITEMS);
      var diff=perB-perA;
      var totalDiff=diff*people;
      if(totalDiff<2) continue;
      var remA=ri(1, totalDiff-1);
      var shortB=totalDiff-remA;
      if(shortB<=0) continue;
      var total=perA*people+remA;
      if(perB*people-shortB!==total) continue;
      ans=total;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t="子どもが "+people+"人 います。"+item+"を 1人に "+perA+"個ずつ 配ると "+remA+"個 あまり、1人に "+perB+"個ずつ 配るには "+shortB+"個 たりません。"+item+"は ぜんぶで 何個？";
    }
    else if(lv===6){
      // 過不足 → 1人分 (人数と「もう一方の per」が与えられて perA を逆算)
      var perA=ri(2,5);
      var perB=perA+ri(1,3);
      var people=ri(4,12);
      var item=pick(ITEMS);
      var diff=perB-perA;
      var totalDiff=diff*people;
      if(totalDiff<2) continue;
      var remA=ri(1, totalDiff-1);
      var shortB=totalDiff-remA;
      if(shortB<=0) continue;
      var total=perA*people+remA;
      if(perB*people-shortB!==total) continue;
      ans=perA;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t="子ども "+people+"人 に "+item+" を 配ります。1人に いくつか ずつ 配ると "+remA+"個 あまり、1人に "+perB+"個ずつ 配るには "+shortB+"個 たりません。"+item+"を 1人に 何個ずつ 配りましたか？(少ない方)";
    }
    else if(lv===7){
      // 差集め算 基本：1個price円、perA個 と perB個 買うと 代金の差 → 人数
      var price=ri(2,8)*10;
      var perA=ri(1,3);
      var perB=perA+ri(1,2);
      var people=ri(3,9);
      var item2=pick(BUYS);
      var gap=(perB-perA)*price*people;
      ans=people;
      if(gap<=0||ans<=0||ans!==Math.floor(ans)) continue;
      t="1個 "+price+"円の "+item2+"を、子ども 1人に "+perA+"個ずつ 買うときと 1人に "+perB+"個ずつ 買うときでは、代金の合計が "+gap+"円 ちがいます。子どもは 何人？";
    }
    else if(lv===8){
      // 差集め算 やや大きめ：価格・個数差ともに拡大
      var price=ri(3,12)*10;
      var perA=ri(1,3);
      var perB=perA+ri(2,4);
      var people=ri(5,15);
      var item2=pick(BUYS);
      var gap=(perB-perA)*price*people;
      ans=people;
      if(gap<=0||ans<=0||ans!==Math.floor(ans)) continue;
      t="1個 "+price+"円の "+item2+"を、子ども 1人に "+perA+"個ずつ 買うときと 1人に "+perB+"個ずつ 買うときでは、代金の合計が "+gap+"円 ちがいます。子どもは 何人？";
    }
    else if(lv===9){
      // 長椅子型：perA人で座ると leftPeople 人すわれない、perB人で座ると emptyseats 人分あく → 椅子の数
      var perA=ri(3,5);
      var perB=perA+ri(1,2);
      var benches=ri(4,9);
      var leftPeople=ri(1,perA*2);
      var P=perA*benches+leftPeople;
      var emptyseats=perB*benches-P;
      if(emptyseats<1) continue;
      if(emptyseats>=perB) continue;
      ans=benches;
      if(ans<=0||ans!==Math.floor(ans)) continue;
      t="長椅子に 1脚 "+perA+"人ずつ すわると "+leftPeople+"人 すわれません。1脚 "+perB+"人ずつ すわると ちょうど 全員 すわれて "+emptyseats+"人分 あきます。長椅子は 何脚？";
    }
    else { // lv===10
      // 部屋割り総合：長椅子型 or 部屋型 or 過不足→人数 をランダム
      var r=ri(0,2);
      if(r===0){
        // 部屋型
        var perA=ri(3,5);
        var perB=perA+ri(1,3);
        var rooms=ri(5,14);
        var leftPeople=ri(1,perA*2);
        var P=perA*rooms+leftPeople;
        var emptyseats=perB*rooms-P;
        if(emptyseats<1) continue;
        if(emptyseats>=perB) continue;
        ans=rooms;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        var who=pick(["子ども","生徒","お客さん"]);
        t=who+"を 部屋に 1部屋 "+perA+"人ずつ 入れると "+leftPeople+"人 入れません。1部屋 "+perB+"人ずつ 入れると "+emptyseats+"人分 あきます。部屋は いくつ？";
      } else if(r===1){
        // 長椅子型(大きめ)
        var perA=ri(3,5);
        var perB=perA+ri(2,3);
        var benches=ri(6,14);
        var leftPeople=ri(1,perA*2);
        var P=perA*benches+leftPeople;
        var emptyseats=perB*benches-P;
        if(emptyseats<1) continue;
        if(emptyseats>=perB) continue;
        ans=benches;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        t="長椅子に 1脚 "+perA+"人ずつ すわると "+leftPeople+"人 すわれません。1脚 "+perB+"人ずつ すわると "+emptyseats+"人分 あきます。長椅子は 何脚？";
      } else {
        // 過不足 → 人数 (難しめ)
        var perA=ri(3,6);
        var perB=perA+ri(2,4);
        var people=ri(6,15);
        var item=pick(ITEMS);
        var diff=perB-perA;
        var totalDiff=diff*people;
        if(totalDiff<2) continue;
        var remA=ri(1, totalDiff-1);
        var shortB=totalDiff-remA;
        if(shortB<=0) continue;
        var total=perA*people+remA;
        if(perB*people-shortB!==total) continue;
        ans=people;
        if(ans<=0||ans!==Math.floor(ans)) continue;
        t=item+"を 1人に "+perA+"個ずつ 配ると "+remA+"個 あまり、1人に "+perB+"個ずつ 配るには "+shortB+"個 たりません。子どもは 何人？";
      }
    }
    break;
  }
  // fallback (well-posed)
  if(!t){
    ans=6;
    t="あめを 1人に 3個ずつ 配ると 2個 あまり、1人に 4個ずつ 配るには 4個 たりません。子どもは 何人？";
  }
  return {cat:"kabusoku", kind:"num", text:t, say:null, ans:ans};
}
function gHeikin(lv){
  if(lv==null) lv=ri(1,10);
  var t="", ans=0, say=null;
  var SUBJ=["こくご","さんすう","りか","しゃかい","えいご","おんがく"];

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // 単純平均（3個・小さい数）：平均の意味づけ
      var n1=3, hi1=20;
      var avg1=ri(2,hi1);
      var vals1=[], rem1=avg1*n1, ok1=true;
      for(var k=0;k<n1-1;k++){
        var up1=rem1-(n1-1-k);
        if(up1<1){ok1=false;break;}
        var v1=ri(1, Math.min(up1, hi1*2));
        vals1.push(v1); rem1-=v1;
      }
      if(!ok1||rem1<1) continue;
      vals1.push(rem1);
      ans=avg1;
      if(ans<=0) continue;
      t=vals1.join("、")+" の へいきんは いくつ？";
    }
    else if(lv===2){
      // 単純平均（4〜5個、範囲拡大）：個数増で質的に難化
      // K22: テストの点は 0..100 に制限 (旧: hi2*2=160 で 100 点超が混ざっていた)
      var n2=ri(4,5), hi2=80;
      var avg2=ri(5,hi2);
      var vals2=[], rem2=avg2*n2, ok2=true;
      for(var k=0;k<n2-1;k++){
        var up2=rem2-(n2-1-k);
        if(up2<1){ok2=false;break;}
        var v2=ri(1, Math.min(up2, 100));
        vals2.push(v2); rem2-=v2;
      }
      if(!ok2||rem2<1||rem2>100) continue;
      vals2.push(rem2);
      ans=avg2;
      if(ans<=0) continue;
      t=n2+"教科のテストは "+vals2.join("、")+"点。へいきんは何点？";
    }
    else if(lv===3){
      // 平均→合計の逆算（積の意味）
      var n3=ri(3,6), avg3=ri(10,90);
      ans=avg3*n3;
      if(ans<=0) continue;
      t=n3+"教科の平均点は "+avg3+"点。ごうけいは何点？";
    }
    else if(lv===4){
      // 欠けた1つを逆算（3〜4教科）：合計-既知＝欠け
      // K22: 既知点も 0..100 に制限
      var n4=ri(3,4), avg4=ri(20,80);
      var total4=avg4*n4;
      var known4=[], ksum4=0, ok4=true;
      for(var k=0;k<n4-1;k++){
        var maxk4=Math.min(100, total4-ksum4-(n4-1-k));
        if(maxk4<1){ok4=false;break;}
        var v4=ri(1,maxk4);
        known4.push(v4); ksum4+=v4;
      }
      if(!ok4) continue;
      ans=total4-ksum4;
      if(ans<=0||ans>100) continue;
      t=n4+"教科の平均点は "+avg4+"点。"+(n4-1)+"教科は "+known4.join("、")+"点。のこりの 1教科は何点？";
    }
    else if(lv===5){
      // 欠けた1つを逆算（5〜6教科、範囲拡大）：個数増で質的に難化
      // K22: 既知点も 0..100 に制限 (旧: avg5*2 で 180 点が混ざっていた)
      var n5=ri(5,6), avg5=ri(30,90);
      var total5=avg5*n5;
      var known5=[], ksum5=0, ok5=true;
      for(var k=0;k<n5-1;k++){
        var maxk5=Math.min(100, total5-ksum5-(n5-1-k));
        if(maxk5<1){ok5=false;break;}
        var v5=ri(1,maxk5);
        known5.push(v5); ksum5+=v5;
      }
      if(!ok5) continue;
      ans=total5-ksum5;
      if(ans<=0||ans>100) continue;
      t=n5+"教科の平均点は "+avg5+"点。"+(n5-1)+"教科は "+known5.join("、")+"点。のこりの 1教科は何点？";
    }
    else if(lv===6){
      // 人数追加 / 1人除外による平均変化
      // パターンA: n人の平均avgに、追加1人(score)が入る→新しい平均
      // パターンB: n人の平均avgから1人(score)が抜ける→残りの平均
      if(Math.random()<0.5){
        var n6=ri(3,6), avg6=ri(40,80);
        var score6=ri(20,95);
        var newTotal6=avg6*n6+score6;
        var newN6=n6+1;
        if(newTotal6%newN6!==0) continue;
        ans=newTotal6/newN6;
        if(ans<=0||ans>100) continue;
        t=n6+"人の平均は "+avg6+"点でした。あとから 1人 ("+score6+"点) が入りました。"+newN6+"人の 平均は何点？";
      } else {
        var n6b=ri(4,6), avg6b=ri(40,80);
        var score6b=ri(20,95);
        var leftTotal6=avg6b*n6b-score6b;
        var leftN6=n6b-1;
        if(leftTotal6<=0) continue;
        if(leftTotal6%leftN6!==0) continue;
        ans=leftTotal6/leftN6;
        if(ans<=0||ans>100) continue;
        t=n6b+"人の平均は "+avg6b+"点でした。そのうち 1人 ("+score6b+"点) が ぬけました。のこり "+leftN6+"人の 平均は何点？";
      }
    }
    else if(lv===7){
      // 2群の平均合成（全体平均）
      var nA7=ri(2,6), nB7=ri(2,6);
      var avgA7=ri(20,80), avgB7=ri(20,80);
      if(avgA7===avgB7) continue;
      var totalN7=nA7+nB7, totalSum7=nA7*avgA7+nB7*avgB7;
      if(totalSum7%totalN7!==0) continue;
      ans=totalSum7/totalN7;
      if(ans<=0||ans>100) continue;
      t=nA7+"人の グループの 平均は "+avgA7+"点、べつの "+nB7+"人の グループの 平均は "+avgB7+"点。ぜんいんの 平均は何点？";
    }
    else if(lv===8){
      // 群平均の逆算：全体平均と片方の群から、もう片方の群の平均を求める
      var nA8=ri(2,5), nB8=ri(2,5);
      var totalN8=nA8+nB8;
      var allAvg8=ri(30,70), avgA8=ri(20,85);
      var sumB8=allAvg8*totalN8 - avgA8*nA8;
      if(sumB8<=0) continue;
      if(sumB8%nB8!==0) continue;
      ans=sumB8/nB8;
      if(ans<=0||ans>100) continue;
      t="ぜんいん "+totalN8+"人の 平均は "+allAvg8+"点。そのうち "+nA8+"人の 平均は "+avgA8+"点。のこり "+nB8+"人の 平均は何点？";
    }
    else if(lv===9){
      // 次の1回で目標平均にするには何点必要か
      var n9=ri(2,4), cur9=ri(40,75);
      var target9=ri(cur9+1, cur9+15);
      ans=target9*(n9+1) - cur9*n9;
      if(ans<=0||ans>100) continue;
      t="これまで "+n9+"回の テストの 平均は "+cur9+"点。つぎの テストで ぜんたいの 平均を "+target9+"点に するには、何点 とれば よい？";
    }
    else { // lv===10
      // あとnExtra回すべて同じ点で目標平均に。1回あたり何点？
      var n10=ri(2,4), cur10=ri(40,70), nExtra10=ri(2,3);
      var target10=ri(cur10+1, cur10+12);
      var extraSum10=target10*(n10+nExtra10) - cur10*n10;
      if(extraSum10<=0) continue;
      if(extraSum10%nExtra10!==0) continue;
      ans=extraSum10/nExtra10;
      if(ans<=0||ans>100) continue;
      t="これまで "+n10+"回の 平均は "+cur10+"点。あと "+nExtra10+"回 すべて 同じ点を とって、ぜんたいの 平均を "+target10+"点に したい。1回あたり 何点 ひつよう？";
    }
    break;
  }
  // fallback (well-posed)
  if(!t){
    ans=50;
    t="3教科の テストは 40、50、60点。へいきんは何点？";
  }
  return {cat:"heikin", kind:"num", text:t, say:say, ans:ans};
}
function gSoneki(lv){
  if(lv==null) lv=ri(1,10);
  var t="", ans=0;
  for(var iter=0;iter<300;iter++){
    if(lv===1){
      // 基礎: 原価+利益=定価 (用語の導入)
      var cost=ri(2,15)*100;
      var profit=ri(1,10)*100;
      ans=cost+profit;
      t="原価 "+cost+"円 の品物に "+profit+"円 の利益を見こんで定価をつけました。定価は何円？";
    }
    else if(lv===2){
      // 売値-原価=利益額 (順方向の差)
      var cost=ri(3,25)*100;
      var profit=ri(1,15)*100;
      var price=cost+profit;
      ans=profit;
      if(ans<=0) continue;
      t="原価 "+cost+"円 の品物を "+price+"円 で売りました。利益は何円？";
    }
    else if(lv===3){
      // 損失: 原価>売値 → 損失額
      var cost=ri(5,30)*100;
      var loss=ri(1,Math.max(1,cost/100-1))*100;
      if(loss>=cost) continue;
      var price=cost-loss;
      if(price<=0) continue;
      ans=loss;
      t="原価 "+cost+"円 の品物を "+price+"円 で売りました。損失は何円？";
    }
    else if(lv===4){
      // 利益率→定価: 原価に r% の利益を見こんで定価
      var cost=ri(3,30)*100;
      var r=ri(1,5)*10; // 10,20,30,40,50%
      var profit=cost*r/100;
      if(profit%1!==0) continue;
      ans=cost+profit;
      if(ans<=0) continue;
      t="原価 "+cost+"円 の品物に "+r+"% の利益を見こんで定価をつけました。定価は何円？";
    }
    else if(lv===5){
      // 定価から割引→売値
      var price=ri(5,40)*100;
      var d=ri(1,5); // 1〜5割引
      var disc=price*d/10;
      if(disc%1!==0) continue;
      ans=price-disc;
      if(ans<=0) continue;
      t="定価 "+price+"円 の品物を "+d+"割引きで売りました。売値は何円？";
    }
    else if(lv===6){
      // 売値と割引率→定価を逆算
      var price=ri(6,40)*100;
      var d=ri(1,5);
      var disc=price*d/10;
      if(disc%1!==0) continue;
      var sell=price-disc;
      if(sell<=0) continue;
      ans=price;
      t=d+"割引きで売ったら 売値が "+sell+"円 になりました。定価は何円？";
    }
    else if(lv===7){
      // 利益率と利益額→原価を逆算
      var cost=ri(3,40)*100;
      var r=ri(1,5)*10;
      var profit=cost*r/100;
      if(profit%1!==0) continue;
      ans=cost;
      if(ans<=0) continue;
      t="ある品物に "+r+"% の利益を見こんで売ったところ、利益が "+profit+"円 になりました。原価は何円？";
    }
    else if(lv===8){
      // 複数商品: 同じ品物を n 個 仕入れて 全部売ったときの合計利益
      var cost=ri(2,15)*100;
      var profit=ri(1,10)*100;
      var n=ri(3,12);
      var price=cost+profit;
      ans=profit*n;
      if(ans<=0) continue;
      t="原価 "+cost+"円 の品物を "+n+"個 仕入れ、1個 "+price+"円 で すべて売りました。合計の利益は何円？";
    }
    else if(lv===9){
      // 売買複合: 原価→マークアップで定価→割引で売値→利益
      var cost=ri(5,30)*100;
      var mark=ri(2,6)*10;     // 20〜60%
      var price=cost+cost*mark/100;
      if(price%1!==0) continue;
      var d=ri(1,3);           // 1〜3割引(まだ利益が残る範囲)
      var disc=price*d/10;
      if(disc%1!==0) continue;
      var sell=price-disc;
      if(sell<=cost) continue; // Lv9 は利益が残るケースに限定
      ans=sell-cost;
      if(ans<=0) continue;
      t="原価 "+cost+"円 の品物に "+mark+"% の利益を見こんで定価をつけ、その定価の "+d+"割引きで売りました。利益は何円？";
    }
    else {
      // Lv10 総合: 利益or損失の判定込み
      var pick10=ri(0,1);
      if(pick10===0){
        // マークアップ+大きめ割引で損失/利益どちらにもなる→金額のみ問う
        var cost=ri(5,30)*100;
        var mark=ri(2,5)*10;     // 20〜50%
        var price=cost+cost*mark/100;
        if(price%1!==0) continue;
        var d=ri(2,5);           // 2〜5割引
        var disc=price*d/10;
        if(disc%1!==0) continue;
        var sell=price-disc;
        if(sell<=0) continue;
        if(sell===cost) continue;
        if(sell>cost){
          ans=sell-cost;
          t="原価 "+cost+"円 の品物に "+mark+"% の利益を見こんで定価をつけ、その定価の "+d+"割引きで売りました。利益は何円？";
        } else {
          ans=cost-sell;
          t="原価 "+cost+"円 の品物に "+mark+"% の利益を見こんで定価をつけ、その定価の "+d+"割引きで売りました。損失は何円？";
        }
      } else {
        // 複数仕入れ + 売れ残り: n個仕入れ、k個だけ売値で売って残りは捨てる → 合計利益or損失
        var cost=ri(2,15)*100;
        var profit=ri(1,8)*100;
        var price=cost+profit;
        var n=ri(5,15);
        var k=ri(Math.ceil(n/2),n);   // 半分以上は売れる
        if(k>=n) continue;            // 必ず売れ残りあり
        var income=price*k;
        var spend=cost*n;
        if(income===spend) continue;
        if(income>spend){
          ans=income-spend;
          t="原価 "+cost+"円 の品物を "+n+"個 仕入れ、1個 "+price+"円 で "+k+"個 売りました。残りは売れず捨てました。合計の利益は何円？";
        } else {
          ans=spend-income;
          t="原価 "+cost+"円 の品物を "+n+"個 仕入れ、1個 "+price+"円 で "+k+"個 売りました。残りは売れず捨てました。合計の損失は何円？";
        }
      }
    }
    if(ans>0 && ans%1===0) break;
  }
  if(!t){
    ans=1500;
    t="原価 1000円 の品物に 500円 の利益を見こんで定価をつけました。定価は何円？";
  }
  return {cat:"soneki",kind:"num",text:t,say:null,ans:ans};
}
function gShigoto(lv){
  if(lv==null) lv=ri(1,10);
  function gcdL(x,y){x=Math.abs(x);y=Math.abs(y);while(y){var t=y;y=x%y;x=t;}return x;}
  function lcmL(x,y){return x/gcdL(x,y)*y;}
  var NAMES=["けんた","ゆうこ","たくみ","さくら","まなぶ","あおい"];
  var t="", ans=0;

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // 全体量を求める: 1日に○個 × 日数(積)。仕事算の前段として「全体量」を意識させる
      var rate=ri(2,8), time=ri(2,8);
      ans=rate*time;
      if(ans<=0) continue;
      var n1=pick(NAMES);
      t=n1+"は 1日に "+rate+"個 おもちゃを 作ります。"+time+"日 はたらくと、ぜんぶで 何個 作れる？";
    }
    else if(lv===2){
      // 日数を求める: 全体○個を1日△個 → 何日(全体を「与えられた量」として置く感覚)
      var rate=ri(2,9), time=ri(3,12), total=rate*time;
      ans=time;
      if(ans<=0) continue;
      var n2=pick(NAMES);
      t="ぜんぶで "+total+"個の しごとが あります。"+n2+"は 1日に "+rate+"個 すすめます。何日で 終わる？";
    }
    else if(lv===3){
      // 1日量を求める: 全体○個を△日 → 1日何個(逆算で割り算)
      var rate=ri(2,9), time=ri(2,9), total=rate*time;
      ans=rate;
      if(ans<=0) continue;
      t=total+"個の しごとを "+time+"日で ちょうど 終わらせるには、1日に 何個 すれば よい？";
    }
    else if(lv===4){
      // 2人同時作業(基本): A は a日、B は b日 → いっしょで何日(整数解のみ)
      // 構成: 一緒の日数 c を先に決め、a を選び b = a*c/(a-c) が整数
      var c=ri(2,5);
      var a=ri(c+1,12);
      if(a<=c) continue;
      var b=a*c/(a-c);
      if(!Number.isInteger(b)||b<=0||b===a) continue;
      ans=c;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t="ある しごとを "+n1+"は "+a+"日、"+n2+"は "+b+"日で 終わらせます。2人 いっしょに すると 何日で 終わる？";
    }
    else if(lv===5){
      // 仕事率の逆算: A は a日、2人いっしょなら c日 → B は何日(整数解のみ)
      // 全体を 1 と置き 1/a + 1/B = 1/c → B = a*c/(a-c)
      var c=ri(2,6);
      var a=ri(c+1,15);
      if(a<=c) continue;
      var b=a*c/(a-c);
      if(!Number.isInteger(b)||b<=0||b===a) continue;
      ans=b;
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t="ある しごとを "+n1+"は "+a+"日で 終わらせます。"+n1+"と "+n2+"が いっしょに すると "+c+"日で 終わります。"+n2+"が 1人で すると 何日で 終わる？";
    }
    else if(lv===6){
      // 3人同時作業: A は a日、B は b日、C は c日 → 3人で何日(整数解のみ)
      // 全体W=lcm(a,b,c) と置き、合計仕事率 W/a+W/b+W/c で W を割って整数
      var a=ri(3,10), b=ri(3,12), c=ri(3,15);
      if(a===b||b===c||a===c) continue;
      var W=lcmL(lcmL(a,b),c);
      var sum=W/a+W/b+W/c;
      if(W%sum!==0) continue;
      ans=W/sum;
      if(ans<=0) continue;
      t="ある しごとを A は "+a+"日、B は "+b+"日、C は "+c+"日で 終わらせます。3人 いっしょに すると 何日で 終わる？";
    }
    else if(lv===7){
      // 途中交代(基礎): 1人→2人。1人でd日かかる仕事を、はじめx日やり、残りを2人で。残り何日？
      // 1人の1日量=1、全体=d。残り(d-x)を2人で → (d-x)/2
      var d=ri(4,12);
      var x=ri(1,d-2);
      var rest=d-x;
      if(rest%2!==0) continue;
      ans=rest/2;
      if(ans<=0) continue;
      var n1=pick(NAMES);
      t=n1+"が 1人で すると "+d+"日 かかる しごとが あります。はじめ "+n1+"が 1人で "+x+"日 やった あと、もう 1人 てつだいに 来て 2人で つづけます。あと 何日で 終わる？";
    }
    else if(lv===8){
      // 途中交代(標準): 2人→1人。A は a日、B は b日。はじめ2人でx日→残りをAだけで何日？
      // 全体W=lcm(a,b)、rA=W/a, rB=W/b。x を rest=W-(rA+rB)*x が rA で割り切れるよう選ぶ
      var a=ri(3,12), b=ri(3,12);
      if(a===b) continue;
      var W=lcmL(a,b);
      var rA=W/a, rB=W/b;
      var full=Math.floor(W/(rA+rB));
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
      var n1=pick(NAMES), n2=pick(NAMES);
      if(n1===n2) continue;
      t="ある しごとを "+n1+"は "+a+"日、"+n2+"は "+b+"日で 終わらせます。はじめ 2人 いっしょに "+x+"日 やった あと、"+n1+"が 1人で つづけます。あと 何日で 終わる？";
    }
    else if(lv===9){
      // のべ人日: p人でd日かかる仕事を、p2人ですると何日？(p*d を p2 で割り切れる p2 を選ぶ)
      var p=ri(2,6), d=ri(3,10);
      var total=p*d;
      var divs=[];
      for(var q=2;q<=total;q++){ if(total%q===0 && q!==p && q<=total) divs.push(q); }
      if(divs.length===0) continue;
      var p2=pick(divs);
      ans=total/p2;
      if(!Number.isInteger(ans)||ans<=0||ans===d) continue;
      t=p+"人で すると "+d+"日 かかる しごとが あります。同じ しごとを "+p2+"人で すると 何日で 終わる？";
    }
    else {
      // Lv10: 水そう注水/排水。注水のみ or 注水しながら排水
      var drain = (Math.random()<0.5);
      if(!drain){
        // 注水のみ: 容量V=inR*time、時間を問う
        var inR=ri(2,9), time=ri(3,12), V=inR*time;
        ans=time;
        if(ans<=0) continue;
        t="からの 水そうに 1分間に "+inR+"L 水を 入れます。水そうの ようりょうは "+V+"L です。いっぱいに なるのは 何分後？";
      } else {
        // 注水しながら排水: 正味 net=inR-outR、容量V=net*time
        var inR=ri(4,12), outR=ri(1,inR-1), net=inR-outR;
        if(net<=0) continue;
        var time=ri(3,10), V=net*time;
        if(V<=0) continue;
        ans=time;
        t="水そうに 1分間に "+inR+"L 入れながら、そこから 1分間に "+outR+"L ぬきます。ようりょう "+V+"L の 水そうが いっぱいに なるのは 何分後？";
      }
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  // フォールバック: ans/text が確定していなければ最も単純な Lv1 型で生成
  if(!(ans>0 && Number.isInteger(ans))){
    var rate=3, time=4;
    ans=rate*time;
    t="1日に "+rate+"個 作る 人が、"+time+"日 はたらくと、ぜんぶで 何個 作れる？";
  }
  return {cat:"shigoto", kind:"num", text:t, say:null, ans:ans};
}
function gNenrei(lv){
  if(lv==null) lv=ri(1,10);
  var NAMES=["太郎","花子","ゆうき","さくら","けんた","あきら"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // 年齢差: 今の2人の年齢差を求める(導入)
      var c1=pick(NAMES), c2=pick(NAMES);
      if(c1===c2) continue;
      var a1=ri(6,12), b1=ri(1,5);
      var older=a1+b1;
      ans=b1;
      t=c1+"は "+older+"歳、"+c2+"は "+a1+"歳です。2人の 年れいの ちがいは 何歳？";
    }
    else if(lv===2){
      // 何年後の年齢: 単純加算
      var c=pick(NAMES);
      var now2=ri(6,15);
      var y2=ri(2,12);
      ans=now2+y2;
      t=c+"は 今 "+now2+"歳です。"+y2+"年後は 何歳に なりますか？";
    }
    else if(lv===3){
      // 何年前の年齢: 単純減算(過去)
      var c=pick(NAMES);
      var now3=ri(15,40);
      var y3=ri(3,12);
      if(now3-y3<1) continue;
      ans=now3-y3;
      t=c+"は 今 "+now3+"歳です。"+y3+"年前は 何歳でしたか？";
    }
    else if(lv===4){
      // 親子の年齢の 和
      var oya4=ri(30,45), ko4=ri(6,14);
      if(oya4<=ko4) continue;
      ans=oya4+ko4;
      t="お父さんは "+oya4+"歳、子どもは "+ko4+"歳です。2人の 年れいの 和は 何歳？";
    }
    else if(lv===5){
      // 親子の年齢の 差
      var oya5=ri(30,48), ko5=ri(5,14);
      if(oya5<=ko5) continue;
      ans=oya5-ko5;
      t="お父さんは "+oya5+"歳、子どもは "+ko5+"歳です。2人の 年れいの 差は 何歳？";
    }
    else if(lv===6){
      // 和差算: 和と差から子どもの年齢を逆算
      var oya6=ri(30,48), ko6=ri(6,15);
      if(oya6<=ko6) continue;
      var sum6=oya6+ko6, dif6=oya6-ko6;
      if((sum6-dif6)%2!==0) continue;
      ans=(sum6-dif6)/2; // = ko6
      if(ans<1) continue;
      t="お父さんと 子どもの 年れいの 和は "+sum6+"歳、差は "+dif6+"歳です。子どもは 何歳？";
    }
    else if(lv===7){
      // 3人問題: 兄弟2人+お母さん、今の和→N年後の和
      var ani=ri(8,14), oto=ri(3,ani-1);
      var haha=ri(32,45);
      if(haha<=ani) continue;
      var y7=ri(3,10);
      var nowSum=ani+oto+haha;
      ans=nowSum+3*y7;
      t="お兄さんは "+ani+"歳、弟は "+oto+"歳、お母さんは "+haha+"歳です。"+y7+"年後の 3人の 年れいの 和は 何歳？";
    }
    else if(lv===8){
      // □年後に 親が 子の N倍: oya+x = N*(ko+x) を逆算で構成
      var N8=ri(2,3);
      var ko8=ri(4,12);
      var x8=ri(2,12);
      var oya8=N8*(ko8+x8)-x8;
      if(oya8<=ko8) continue;
      if(oya8>80) continue;
      // 「N倍」が今すでに成立しているケースは除外
      if(oya8===N8*ko8) continue;
      ans=x8;
      t="今 お父さんは "+oya8+"歳、子どもは "+ko8+"歳です。お父さんの 年れいが 子どもの "+N8+"倍に なるのは 何年後？";
    }
    else if(lv===9){
      // 倍率+和 から現在の子の年齢を逆算: oya = N*ko, sum=oya+ko=(N+1)*ko
      var N9=ri(3,5);
      var ko9=ri(8,15);
      var oya9=N9*ko9;
      if(oya9<25||oya9>60) continue;
      var sum9=oya9+ko9;
      ans=ko9;
      t="今 お父さんの 年れいは 子どもの "+N9+"倍です。2人の 年れいの 和は "+sum9+"歳です。子どもは 何歳？";
    }
    else { // lv===10
      // 倍率+差 から現在の親の年齢を逆算: dif=(N-1)*ko, oya=N*ko
      var N10=ri(3,5);
      var ko10=ri(7,14);
      var oya10=N10*ko10;
      if(oya10<25||oya10>65) continue;
      var dif10=oya10-ko10; // =(N-1)*ko
      ans=oya10;
      t="今 お父さんの 年れいは 子どもの "+N10+"倍で、2人の 年れいの 差は "+dif10+"歳です。お父さんは 何歳？";
    }
    if(ans>0 && ans===Math.floor(ans)) break;
  }
  // fallback (well-posed). 40+x = 2(10+x) ⇒ x=20 (K-add #6: 旧 ans=15 は誤答)
  if(!t){
    ans=20;
    t="お父さんは 40歳、子どもは 10歳です。お父さんが 子どもの 2倍に なるのは 何年後？";
  }
  return {cat:"nenrei", kind:"num", text:t, say:null, ans:ans};
}
function gUeki(lv){
  if(lv==null) lv=ri(1,10);
  var TREE=["木","はた","電柱","くい","花","旗"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // 両端あり・本数(小さめ)
      var gap=pick([2,5,10]);
      var n=ri(2,8); // 間の数
      var L=gap*n;
      var obj=pick(TREE);
      ans=n+1; // 本数
      if(ans<=0) continue;
      t="まっすぐな 道に そって、長さ "+L+"m の あいだに "+gap+"m おきに "+obj+"を 立てます。両はしにも 立てるとき、"+obj+"は 何本 いる？";
    }
    else if(lv===2){
      // 両端なし・本数(間に立てる)
      var gap=pick([2,3,4,5,6]);
      var n=ri(3,12); // 間の数
      var L=gap*n;
      var obj=pick(TREE);
      ans=n-1; // 両はしを除く本数
      if(ans<=0) continue;
      t="ビルと ビルの あいだ、長さ "+L+"m に "+gap+"m おきに "+obj+"を 立てます。両はしには 立てないとき、"+obj+"は 何本 いる？";
    }
    else if(lv===3){
      // 円形・本数
      var gap=pick([2,4,5,6,8]);
      var n=ri(4,15); // 円周上の本数 = 間の数
      var L=gap*n;
      var obj=pick(TREE);
      ans=n; // 円形は本数=間の数
      if(ans<=0) continue;
      t="まわりが "+L+"m の 池の まわりに、"+gap+"m おきに "+obj+"を 立てます。"+obj+"は 何本 いる？";
    }
    else if(lv===4){
      // 両端あり・全長(本数 → 長さ)
      var gap=pick([2,3,4,5,6,8]);
      var count=ri(4,12); // 本数
      var obj=pick(TREE);
      ans=gap*(count-1); // 全長
      if(ans<=0) continue;
      t="まっすぐな 道に "+obj+"を "+count+"本、両はしも ふくめて "+gap+"m おきに 立てます。さいしょの "+obj+"から さいごの "+obj+"まで 何m？";
    }
    else if(lv===5){
      // 両端なし・全長(間に立てた本数 → 全長)
      var gap=pick([2,3,4,5,6,8]);
      var count=ri(3,12); // 間に立てた本数
      var obj=pick(TREE);
      // 間の数 = count + 1
      ans=gap*(count+1);
      if(ans<=0) continue;
      t="ビルと ビルの あいだに "+obj+"を "+count+"本、"+gap+"m おきに 立てました。両はしの ビルから "+gap+"m はなしてあります。ビルから ビルまで 何m？";
    }
    else if(lv===6){
      // 円形・一周の長さ(本数 → 一周)
      var gap=pick([2,4,5,6,8,10]);
      var count=ri(5,18); // 本数=間の数
      var obj=pick(TREE);
      ans=gap*count; // 一周
      if(ans<=0) continue;
      t="まるい 池の まわりに "+obj+"を "+count+"本、"+gap+"m おきに 立てました。池の まわりは 何m？";
    }
    else if(lv===7){
      // 両端あり・間隔の逆算
      var gap=pick([2,3,4,5,6,8,10]);
      var n=ri(3,15);
      var L=gap*n;
      var count=n+1;
      var obj=pick(TREE);
      ans=gap; // 間隔
      if(ans<=0) continue;
      t="まっすぐな 道に "+obj+"を "+count+"本、両はしも ふくめて 同じ あいだで 立てたら、ぜんたいの 長さは "+L+"m でした。"+obj+"と "+obj+"の あいだは 何m？";
    }
    else if(lv===8){
      // 円形・間隔の逆算 (本数と一周から)
      var gap=pick([2,3,4,5,6,8]);
      var count=ri(5,15); // 円形は本数=間の数
      var L=gap*count;    // 一周
      var obj=pick(TREE);
      ans=gap;
      if(ans<=0) continue;
      t="まわりが "+L+"m の 池の まわりに、"+obj+"を "+count+"本、同じ あいだで 立てました。"+obj+"と "+obj+"の あいだは 何m？";
    }
    else if(lv===9){
      // 複合: 木の間に旗を立てる(両端あり・2種類)
      // 木は gap1 おき(両端あり)に count1 本、隣り合う木の間に旗を等間隔で k 本ずつ追加
      var gap1=pick([6,8,10,12]);
      var k=pick([1,2,3]); // 木と木の間に立てる旗の本数
      var count1=ri(3,7);  // 木の本数
      var n1=count1-1;     // 木の間の数
      // 旗は両端の木を除いて、各間に k 本 → 全部で n1*k 本
      var obj1="木";
      var obj2=pick(["旗","花"]);
      var subGap=gap1/(k+1);
      if(!Number.isInteger(subGap)) continue;
      ans=n1*k; // 旗の本数
      if(ans<=0) continue;
      var L=gap1*n1;
      t="まっすぐな 道(長さ "+L+"m)に "+obj1+"を "+count1+"本、両はしも ふくめて "+gap1+"m おきに 立てました。となりあう "+obj1+"の あいだに "+obj2+"を "+k+"本ずつ、同じ あいだで 立てると、"+obj2+"は ぜんぶで 何本？";
    }
    else { // lv===10
      // 総合: 道の両側 or 周回複合
      if(Math.random()<0.5){
        // 道の両側(両端あり)
        var gap=pick([2,4,5,6,8,10]);
        var n=ri(4,18);
        var L=gap*n;
        var perSide=n+1;
        var obj=pick(TREE);
        ans=perSide*2;
        if(ans<=0) continue;
        t="まっすぐな 道(長さ "+L+"m)の 両がわに、"+gap+"m おきに "+obj+"を 立てます。両はしにも 立てるとき、"+obj+"は ぜんぶで 何本 いる？";
      } else {
        // 円形の両端(内側と外側 → ここでは「一周をm 周まわって 本数」)
        // 池のまわりに gap おきに立てて、ちょうど x 周して数えなおすパターンは難しいので、
        // 「池の まわりに 2しゅるい(木と旗)を 交互に 立てる」へ
        var gap=pick([2,3,4,5,6]);
        var pairs=ri(4,12); // 木と旗のペア数
        var L=gap*pairs*2;  // 交互なので間隔は gap、ペアごとに 2*gap
        var obj1="木";
        var obj2="旗";
        ans=pairs; // 木の本数(旗も同じ本数)
        if(ans<=0) continue;
        t="まわりが "+L+"m の 池の まわりに、"+obj1+"と "+obj2+"を こうごに "+gap+"m おきに 立てます。"+obj1+"は 何本 いる？";
      }
    }
    break;
  }
  // フォールバック
  if(!t){
    ans=6;
    t="まっすぐな 道に そって、長さ 10m の あいだに 2m おきに 木を 立てます。両はしにも 立てるとき、木は 何本 いる？";
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
      // 静水速度逆算: still = (down + up) / 2
      var still=ri(3,12)*5;          // 静水時 m/分
      var flow=ri(1,still/5-1)*5;    // 流速 < 静水時
      var down=still+flow, up=still-flow;
      if(up<=0) continue;
      ans=still;
      t="ある"+pick(BOATS)+"は 川を 下ると 分速"+down+"m、上ると 分速"+up+"m です。静水時（流れのないとき）の 速さは 分速 何m？";
    }
    else if(lv===2){
      // 流速逆算: flow = (down - up) / 2
      var still=ri(3,12)*5;
      var flow=ri(1,still/5-1)*5;
      var down=still+flow, up=still-flow;
      if(up<=0||flow<=0) continue;
      ans=flow;
      t="ある"+pick(BOATS)+"は 川を 下ると 分速"+down+"m、上ると 分速"+up+"m です。川の 流れの 速さ（流速）は 分速 何m？";
    }
    else if(lv===3){
      // 上下流速度: still と flow から 下り or 上り の速さ
      var still=ri(4,12)*5;
      var flow=ri(1,still/5-1)*5;
      var dir=ri(0,1); // 0:下り 1:上り
      ans=(dir===0?still+flow:still-flow);
      if(ans<=0) continue;
      t="静水時の 速さが 分速"+still+"m の "+pick(BOATS)+"が、流れの 速さ 分速"+flow+"m の 川を "+(dir===0?"下ります":"上ります")+"。このときの 速さは 分速 何m？";
    }
    else if(lv===4){
      // 下りの所要時間: 時間 = 距離 / (still + flow)
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
      // 上りの距離: D = (still - flow) * 時間
      var still=ri(5,14)*5;
      var flow=ri(1,still/5-2)*5;
      var up=still-flow;
      var minute=ri(2,12);
      ans=up*minute;
      if(ans<=0||up<=0) continue;
      t="静水時 分速"+still+"m の "+pick(BOATS)+"が、流れ 分速"+flow+"m の 川を "+minute+"分 上りました。進んだ 道のりは 何m？";
    }
    else if(lv===6){
      // 上りの時間: 時間 = D / (still - flow)
      var still=ri(6,15)*5;
      var flow=ri(1,still/5-2)*5;
      var up=still-flow;
      var minute=ri(2,12);
      var D=up*minute;
      ans=minute;
      if(ans<=0||up<=0) continue;
      t="流れ 分速"+flow+"m の 川に そった "+D+"m の 道のりを、静水時 分速"+still+"m の "+pick(BOATS)+"が 上ります。何分 かかる？";
    }
    else if(lv===7){
      // 往復時間: D/down + D/up（両方割り切れる距離を逆算）
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
      // いかだ問題: いかだは 流れと 同じ 速さで 進む → 時間 = D / flow
      // ボートの 下り・上り の 分速から 流速を 出させてから、いかだの 所要時間を 問う。
      var still=ri(5,12)*5;
      var flow=ri(1,still/5-1)*5;
      var down=still+flow, up=still-flow;
      if(up<=0||flow<=0) continue;
      var minute=ri(3,15);
      var D=flow*minute;            // いかだで割り切れる距離
      if(D<=0) continue;
      ans=minute;
      t="ある 川を ボートで 下ると 分速"+down+"m、上ると 分速"+up+"m です。この 川を "+D+"m 「いかだ」で 下ると 何分 かかる？（いかだは 流れと 同じ 速さで 進みます）";
    }
    else if(lv===9){
      // 往復条件 → 静水速度逆算: 同じ距離Dを下りtd分・上りtu分 → still = (D/td + D/tu) / 2
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
      t="ある"+pick(BOATS)+"が、ある 川の 同じ "+D+"m の 道を 下ると "+td+"分、上ると "+tu+"分 かかります。この"+pick(BOATS)+"の 静水時の 速さは 分速 何m？";
    }
    else { // lv===10
      // 静水速度と下り条件 → 流速逆算: flow = D / 分 - still
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
  // フォールバック: ループで text が組み立てられなかった場合の最終保証
  if(!t){
    var fStill=40, fFlow=10;
    ans=fStill;
    t="ある"+pick(BOATS)+"は 川を 下ると 分速"+(fStill+fFlow)+"m、上ると 分速"+(fStill-fFlow)+"m です。静水時の 速さは 分速 何m？";
  }
  return {cat:"ryuusui", kind:"num", text:t, say:say, ans:ans};
}
function gTsuuka(lv){
  if(lv==null) lv=ri(1,10);
  var TRAINS=["電車","特急","急行","貨物列車","新幹線"];
  var t="", ans=0, say=null;

  for(var tries=0; tries<200; tries++){
    if(lv===1){
      // 柱通過(基礎): 列車長÷速さ = 秒。小さめの数値。
      var v1=ri(5,15);                // m/秒
      var sec1=ri(2,10);              // 秒
      var trainLen1=v1*sec1;          // m (割り切れる)
      if(trainLen1<=0) continue;
      ans=sec1;
      t="長さ"+trainLen1+"m の "+pick(TRAINS)+"が 秒速"+v1+"m で 走っています。電柱を 通過するのに 何秒 かかる？";
    }
    else if(lv===2){
      // 人/信号機 通過: 列車長÷速さ = 秒。Lv1より少し大きめの数値。
      var v2=ri(6,20);
      var sec2=ri(3,12);
      var trainLen2=v2*sec2;
      if(trainLen2<=0) continue;
      var obj2=pick(["立っている人","信号機","駅員さん"]);
      ans=sec2;
      t="長さ"+trainLen2+"m の "+pick(TRAINS)+"が 秒速"+v2+"m で 走っています。"+obj2+"の 前を 通過するのに 何秒 かかる？";
    }
    else if(lv===3){
      // 鉄橋/トンネル: (列車長+橋長)÷速さ = 秒
      var v3=ri(8,25);
      var sec3=ri(5,25);
      var dist3=v3*sec3;              // = 列車長 + 橋長
      var trainLen3=ri(4,16)*5;       // 5の倍数
      var bridgeLen3=dist3-trainLen3;
      if(bridgeLen3<=0) continue;
      if(bridgeLen3<trainLen3) continue; // 橋の方が長い設定にしておく(自然)
      var isTunnel=(Math.random()<0.5);
      var place3=(isTunnel?"トンネル":"鉄橋");
      var verb3=(isTunnel?"くぐりぬける":"わたりきる");
      ans=sec3;
      t="長さ"+trainLen3+"m の "+pick(TRAINS)+"が 秒速"+v3+"m で 走っています。長さ"+bridgeLen3+"m の "+place3+"を "+verb3+"のに 何秒 かかる？";
    }
    else if(lv===4){
      // 柱通過(標準): 時間を求める。Lv1より数値レンジを拡大。
      var v4=ri(10,30);
      var sec4=ri(4,18);
      var trainLen4=v4*sec4;
      if(trainLen4<=0) continue;
      var obj4=pick(["電柱","信号機","立っている人"]);
      ans=sec4;
      t="長さ"+trainLen4+"m の "+pick(TRAINS)+"が 秒速"+v4+"m で 走っています。"+obj4+"を 通過するのに 何秒 かかる？";
    }
    else if(lv===5){
      // 列車長 逆算: 列車長 = 速さ × 秒
      var v5=ri(8,30);
      var sec5=ri(3,18);
      ans=v5*sec5;
      if(ans<=0) continue;
      var obj5=pick(["電柱","信号機","立っている人"]);
      t=pick(TRAINS)+"が 秒速"+v5+"m で 走り、"+obj5+"を 通過するのに "+sec5+"秒 かかりました。この列車の 長さは 何m？";
    }
    else if(lv===6){
      // 速さ 逆算: 速さ = 列車長 ÷ 秒
      var v6=ri(6,25);                // 答えとなる速さ
      var sec6=ri(3,18);
      var trainLen6=v6*sec6;          // 割り切れるように
      if(trainLen6<=0) continue;
      var obj6=pick(["電柱","信号機","立っている人"]);
      ans=v6;
      t="長さ"+trainLen6+"m の "+pick(TRAINS)+"が "+obj6+"を 通過するのに "+sec6+"秒 かかりました。この列車の 速さは 秒速 何m？";
    }
    else if(lv===7){
      // すれ違い(向かい合う): 時間 = (L1+L2) ÷ (v1+v2)
      var sec7=ri(4,15);
      var v1_7=ri(5,18), v2_7=ri(5,18);
      var sumV7=v1_7+v2_7;
      var total7=sumV7*sec7;          // = L1 + L2
      var L1_7=ri(4,30)*5;
      var L2_7=total7-L1_7;
      if(L2_7<=0||L2_7%5!==0) continue;
      ans=sec7;
      t="長さ"+L1_7+"m で 秒速"+v1_7+"m の 列車Aと、長さ"+L2_7+"m で 秒速"+v2_7+"m の 列車Bが 向かい合って 走り、すれちがいます。出会ってから はなれるまで 何秒 かかる？";
    }
    else if(lv===8){
      // 追い越し(同方向): 時間 = (L1+L2) ÷ (v1-v2)
      var sec8=ri(4,15);
      var v2_8=ri(4,12);              // 前(おそい)
      var dv8=ri(3,12);               // 速さの差
      var v1_8=v2_8+dv8;              // 後(はやい)
      var total8=dv8*sec8;            // = L1 + L2
      var L1_8=ri(4,20)*5;
      var L2_8=total8-L1_8;
      if(L2_8<=0||L2_8%5!==0) continue;
      ans=sec8;
      t="長さ"+L1_8+"m で 秒速"+v1_8+"m の 列車Aが、長さ"+L2_8+"m で 秒速"+v2_8+"m の 列車Bを 後ろから 追い越します。追いついてから 追い越し終わるまで 何秒 かかる？";
    }
    else if(lv===9){
      // すれ違いから 相手列車長 を逆算: L2 = (v1+v2)*sec - L1
      var sec9=ri(4,15);
      var v1_9=ri(5,18), v2_9=ri(5,18);
      var sumV9=v1_9+v2_9;
      var total9=sumV9*sec9;
      var L1_9=ri(4,30)*5;
      var L2_9=total9-L1_9;
      if(L2_9<=0) continue;
      ans=L2_9;
      t="長さ"+L1_9+"m で 秒速"+v1_9+"m の 列車Aと、秒速"+v2_9+"m の 列車Bが 向かい合って すれちがうのに "+sec9+"秒 かかりました。列車Bの 長さは 何m？";
    }
    else if(lv===10){
      // 追い越しから 速さ を逆算: v1 = v2 + (L1+L2)/sec
      var sec10=ri(4,15);
      var v2_10=ri(4,12);
      var dv10=ri(3,12);
      var v1_10=v2_10+dv10;
      var total10=dv10*sec10;         // = L1 + L2
      var L1_10=ri(4,20)*5;
      var L2_10=total10-L1_10;
      if(L2_10<=0||L2_10%5!==0) continue;
      ans=v1_10;
      t="長さ"+L1_10+"m の 列車Aが、長さ"+L2_10+"m で 秒速"+v2_10+"m の 列車Bを 後ろから 追い越すのに "+sec10+"秒 かかりました。列車Aの 速さは 秒速 何m？";
    }
    if(t!=="" && Number.isInteger(ans) && ans>0){
      return {cat:"tsuuka", kind:"num", text:t, say:say, ans:ans};
    }
  }
  // フォールバック (well-posed): 長さ120m の電車が 秒速10m で 電柱を通過 → 12秒
  return {cat:"tsuuka", kind:"num",
    text:"長さ120m の 電車が 秒速10m で 走っています。電柱を 通過するのに 何秒 かかる？",
    say:null, ans:12};
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
    if(lv===1){
      // Lv1: 速さの比から距離（同じ時間に進む距離の比 = 速さの比, 小さい比）
      var a=ri(2,4), b=ri(2,4);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,6);
      var n1=NAMES[0], n2=NAMES[1];
      var givenVal=a*k;
      ans=b*k;
      if(ans<=0) continue;
      t=n1+"と "+n2+"が 同じ時間 走ると、進む きょりの 比は "+a+":"+b+" です。"+
        n1+"が "+givenVal+"m 進んだとき、"+n2+"は 何m 進む？";
    }
    else if(lv===2){
      // Lv2: 同じ道のり → かかる時間は速さの逆比
      var a=ri(2,5), b=ri(2,5);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(3,8);                 // 分のスケール
      var n1=NAMES[2], n2=NAMES[3];
      // 速さの比 a:b → 同じ道のりにかかる時間の比は b:a
      var timeA=b*k, timeB=a*k;
      ans=timeB;
      if(ans<=0) continue;
      t=n1+"と "+n2+"が 同じ道のりを 進みます。速さの 比は "+a+":"+b+" です。"+
        n1+"は "+timeA+"分 かかりました。"+n2+"は 何分 かかる？";
    }
    else if(lv===3){
      // Lv3: 速さの比 + 片方の「分速 m」 → もう片方の速さ
      var a=ri(2,5), b=ri(2,5);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(10,30);               // 分速の単位スケール
      var n1=NAMES[4], n2=NAMES[5];
      var speedA=a*k, speedB=b*k;
      ans=speedB;
      if(ans<=0) continue;
      t=n1+"と "+n2+"の 速さの 比は "+a+":"+b+" です。"+
        n1+"の 速さは 分速 "+speedA+"m です。"+n2+"の 速さは 分速 何m？";
    }
    else if(lv===4){
      // Lv4: 速さの比 + 同じ時間 T 分 → 距離 = 速さ×時間 を使い、一方の距離→他方の距離
      var a=ri(2,5), b=ri(2,5);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var spd=ri(20,60);             // 1あたりの分速 m
      var T=ri(3,8);                 // 分
      var n1=NAMES[0], n2=NAMES[3];
      var distA=a*spd*T, distB=b*spd*T;
      ans=distB;
      if(ans<=0) continue;
      t=n1+"と "+n2+"が "+T+"分間 進みました。速さの 比は "+a+":"+b+" で、"+
        n1+"は "+distA+"m 進みました。"+n2+"は 何m 進んだ？";
    }
    else if(lv===5){
      // Lv5: 「ちがう時間」で進んだ距離が与えられる → 速さの比を求める
      // n1: tA 分で dA m、n2: tB 分で dB m → 速さ vA=dA/tA, vB=dB/tB、比 vA:vB
      var a=ri(2,6), b=ri(2,6);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(10,40);               // 共通スケール (m/分)
      var vA=a*k, vB=b*k;
      var tA=ri(3,9), tB=ri(3,9);
      if(tA===tB) continue;          // 「ちがう時間」にする
      var dA=vA*tA, dB=vB*tB;
      // 答えは a:b を 10倍して 10a+b（2桁の比）として返す形式は子供に難しいので、
      // ここでは「相手の速さ(分速)」を答えにする：n1 の分速だけ与え n2 を問う
      ans=vB;
      if(ans<=0) continue;
      var n1=NAMES[1], n2=NAMES[2];
      t=n1+"は "+tA+"分で "+dA+"m、"+n2+"は "+tB+"分で "+dB+"m 進みました。"+
        n1+"の 速さが 分速 "+vA+"m のとき、"+n2+"の 速さは 分速 何m？";
    }
    else if(lv===6){
      // Lv6: 「同じ道のり」を ちがう時間で進む → 速さは時間の逆比
      // n1 は tA 分、n2 は tB 分、n1 の速さが与えられ n2 の速さを問う
      // vA*tA = vB*tB → vB = vA*tA/tB
      var a=ri(2,6), b=ri(2,6);      // 時間の比
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(2,5);                 // 時間スケール
      var tA=a*k, tB=b*k;            // 分
      // vA を割り切れる形に：vA = b*m とすると vB = a*m
      var m=ri(10,25);
      var vA=b*m, vB=a*m;            // m/分
      ans=vB;
      if(ans<=0) continue;
      var D=vA*tA;                   // 同じ道のり
      var n1=NAMES[4], n2=NAMES[0];
      t=n1+"と "+n2+"が 同じ "+D+"m の 道を 進みました。"+
        n1+"は "+tA+"分、"+n2+"は "+tB+"分 かかりました。"+
        n1+"の 速さが 分速 "+vA+"m のとき、"+n2+"の 速さは 分速 何m？";
    }
    else if(lv===7){
      // Lv7: 速さの比 × 時間の比 → 距離の比（合成）
      // n1 は速さ a, 時間 c 分、n2 は速さ b, 時間 d 分。
      // 距離: dA = a*k * c*m, dB = b*k * d*m。片方の距離を与えて他方を問う。
      var a=ri(2,5), b=ri(2,5);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var c=ri(2,5), d=ri(2,5);
      if(c===d) continue;
      if(gcd(c,d)!==1) continue;
      var k=ri(10,25);               // 速さスケール
      var mt=ri(2,5);                // 時間スケール
      var vA=a*k, vB=b*k;
      var tA=c*mt, tB=d*mt;
      var dA=vA*tA, dB=vB*tB;
      ans=dB;
      if(ans<=0) continue;
      var n1=NAMES[2], n2=NAMES[5];
      t=n1+"と "+n2+"の 速さの 比は "+a+":"+b+" です。"+
        n1+"は "+tA+"分、"+n2+"は "+tB+"分 走ります。"+
        n1+"が "+dA+"m 進んだとき、"+n2+"は 何m 進む？";
    }
    else if(lv===8){
      // Lv8: 往復の平均の速さ（同じ道Dを 行き vA, 帰り vB）
      // 平均の速さ = 2*D / (D/vA + D/vB) = 2*vA*vB/(vA+vB)
      var a=ri(2,6), b=ri(2,6);
      if(a===b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(10,20);
      var vA=a*k, vB=b*k;            // m/分
      var sum=vA+vB;
      var num=2*vA*vB;
      if(num%sum!==0) continue;      // 平均速度が整数になるよう保証
      ans=num/sum;
      if(ans<=0) continue;
      // 距離は問題文用に適当な整数(D は vA, vB の公倍数なら時間も整数)
      var lcm=vA*vB/gcd(vA,vB);
      var D=lcm*ri(1,3);
      var n1=NAMES[3];
      t=n1+"は 家から こうえんまで "+D+"m の 道を、"+
        "行きは 分速 "+vA+"m、帰りは 分速 "+vB+"m で 往復しました。"+
        "往復の 平均の 速さは 分速 何m？";
    }
    else if(lv===9){
      // Lv9: 出発時刻がちがう。先発 n1(速さ vA) が出発、t0 分後に後発 n2(速さ vB, vB>vA) が同じ道を追う。
      // 同じ場所に同時に着くには n2 は (D/vB) 分かかり、n1 は (D/vA) 分かかる。
      // 与: vA, vB, t0 → n2 の所要時間 D/vB を問うのは「追いつき算」相当だが
      // ここでは「n2 が出発してから 何分後に n1 に 追いつく？」を問う:
      // 追いつき時間 = (vA * t0) / (vB - vA)
      var a=ri(2,4), b=ri(3,7);
      if(a>=b) continue;
      if(gcd(a,b)!==1) continue;
      var k=ri(20,40);
      var vA=a*k, vB=b*k;            // vA<vB
      var dv=vB-vA;
      var t0=ri(3,12);               // 先発の先行時間(分)
      var num=vA*t0;
      if(num%dv!==0) continue;
      ans=num/dv;                    // 追いつくまでの時間(分)
      if(ans<=0) continue;
      var n1=NAMES[0], n2=NAMES[4];
      t=n1+"が 分速 "+vA+"m で 家を 出ました。"+t0+"分 おくれて "+n2+"が 同じ 道を 分速 "+vB+"m で 追いかけます。"+
        n2+"が 出発してから 何分後に "+n1+"に 追いつく？";
    }
    else if(lv===10){
      // Lv10: 途中で速さが変わる。前半 T1 分は分速 v1、後半 T2 分は分速 v2 → 全体の道のりは？
      var v1=ri(4,12)*10, v2=ri(4,12)*10;
      if(v1===v2) continue;
      var T1=ri(3,10), T2=ri(3,10);
      var d1=v1*T1, d2=v2*T2;
      ans=d1+d2;
      if(ans<=0) continue;
      var n1=NAMES[5];
      t=n1+"は はじめの "+T1+"分間は 分速 "+v1+"m、"+
        "つぎの "+T2+"分間は 分速 "+v2+"m で 進みました。"+
        "全部で 何m 進んだ？";
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }
  // fallback (well-posed): Lv1 相当の素直な問題
  if(!t || !(ans>0) || !Number.isInteger(ans)){
    ans=12;
    t="たろうと はなこが 同じ時間 走ると、進む きょりの 比は 2:3 です。たろうが 8m 進んだとき、はなこは 何m 進む？";
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
    {a:"りんご",b:"みかん",c:"バナナ"},
    {a:"ノート",b:"えんぴつ",c:"消しゴム"},
    {a:"ケーキ",b:"プリン",c:"クッキー"},
    {a:"パン",b:"ジュース",c:"おにぎり"}
  ];
  var gcd=function(x,y){x=Math.abs(x);y=Math.abs(y);while(y){var t=y;y=x%y;x=t;}return x;};
  var lcm=function(x,y){return x/gcd(x,y)*y;};
  var t="", ans=0;

  for(var tries=0; tries<300; tries++){
    if(lv===1){
      // 同じ b の個数で、a が「1個だけ」増えると T が増える。直接 a 1個の値段を引き算で。
      var p=pick(PAIRS);
      var pa=ri(2,9)*10;     // a 1個 = 20〜90円
      var pb=ri(2,9)*10;     // b 1個
      var n =ri(1,2);         // 共通の b の個数
      var m1=ri(1,2);
      var m2=m1+1;            // a の差は 1 → 引き算するだけで pa
      var T1=m1*pa+n*pb;
      var T2=m2*pa+n*pb;
      ans=pa;
      t=p.a+" "+m1+"こと "+p.b+" "+n+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+n+"こで "+T2+"円です。"+p.a+" 1こは いくら？";
    }
    else if(lv===2){
      // b の個数は同じ、a の個数差が 2〜3 → 差から単価を割り算で求める
      var p=pick(PAIRS);
      var pa=ri(2,12)*10;
      var pb=ri(2,12)*10;
      var n =ri(1,3);
      var m1=ri(1,3);
      var m2=m1+ri(2,3);      // a の差は 2 か 3
      var T1=m1*pa+n*pb;
      var T2=m2*pa+n*pb;
      ans=pa;
      t=p.a+" "+m1+"こと "+p.b+" "+n+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+n+"こで "+T2+"円です。"+p.a+" 1こは いくら？";
    }
    else if(lv===3){
      // b の個数共通だが、文脈を 2 文に分けて読解負荷を増やす（買い物 → 別の日にもう一回）
      var p=pick(PAIRS);
      var pa=ri(3,15)*10;
      var pb=ri(3,15)*10;
      var n =ri(2,3);
      var m1=ri(1,3);
      var m2=m1+ri(1,3);
      if(m1===m2) continue;
      var T1=m1*pa+n*pb;
      var T2=m2*pa+n*pb;
      ans=pa;
      t="きのう "+p.a+"を "+m1+"こ、"+p.b+"を "+n+"こ かったら "+T1+"円でした。"+
        "きょう "+p.a+"を "+m2+"こ、"+p.b+"を "+n+"こ かったら "+T2+"円でした。"+
        p.a+" 1こは いくら？";
    }
    else if(lv===4){
      // 片方の式を整数倍して b の係数をそろえる（k2 = k1 * 整数）
      var p=pick(PAIRS);
      var pa=ri(2,12)*10;
      var pb=ri(2,12)*10;
      var k1=ri(1,2);
      var r =ri(2,3);
      var k2=k1*r;            // k2 は k1 の整数倍 → 式1を r 倍すれば消去
      var m1=ri(1,3);
      var m2=ri(1,4);
      if(m1*r===m2) continue; // m1*r === m2 だと a も同時に消えて不定
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      ans=pa;
      t=p.a+" "+m1+"こと "+p.b+" "+k1+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+k2+"こで "+T2+"円です。"+p.a+" 1こは いくら？";
    }
    else if(lv===5){
      // 片方を倍タイプの拡張：範囲を広げ、答えを b に
      var p=pick(PAIRS);
      var pa=ri(3,15)*10;
      var pb=ri(3,15)*10;
      var m1=ri(1,3);
      var r =ri(2,3);
      var m2=m1*r;            // a の係数を整数倍 → 式1を r 倍して a 消去
      var k1=ri(1,4);
      var k2=ri(1,4);
      if(k1*r===k2) continue;
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      ans=pb;
      t=p.a+" "+m1+"こと "+p.b+" "+k1+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+k2+"こで "+T2+"円です。"+p.b+" 1こは いくら？";
    }
    else if(lv===6){
      // 両方を倍：a の係数が互いに割り切れない → 最小公倍数を取って両式を倍
      var p=pick(PAIRS);
      var pa=ri(3,15)*10;
      var pb=ri(3,15)*10;
      var m1=ri(2,4), m2=ri(2,4);
      if(m1===m2) continue;
      if(m1%m2===0 || m2%m1===0) continue; // 片方倍では消えない係数にする
      var k1=ri(1,4), k2=ri(1,4);
      var det=m1*k2-m2*k1;
      if(det===0) continue;
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      ans=pa;
      t=p.a+" "+m1+"こと "+p.b+" "+k1+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+k2+"こで "+T2+"円です。"+p.a+" 1こは いくら？";
    }
    else if(lv===7){
      // 両方を倍・範囲拡大：係数 2〜5、答えは b
      var p=pick(PAIRS);
      var pa=ri(4,18)*10;
      var pb=ri(4,18)*10;
      var m1=ri(2,5), m2=ri(2,5);
      if(m1===m2) continue;
      if(m1%m2===0 || m2%m1===0) continue;
      var k1=ri(2,5), k2=ri(2,5);
      var det=m1*k2-m2*k1;
      if(det===0) continue;
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      ans=pb;
      t=p.a+" "+m1+"こと "+p.b+" "+k1+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+k2+"こで "+T2+"円です。"+p.b+" 1こは いくら？";
    }
    else if(lv===8){
      // 両方を倍・桁拡大：単価 100 円台もあり得る、答えは a と b ランダム
      var p=pick(PAIRS);
      var pa=ri(5,22)*10;
      var pb=ri(5,22)*10;
      var m1=ri(2,5), m2=ri(2,5);
      if(m1===m2) continue;
      if(m1%m2===0 || m2%m1===0) continue;
      var k1=ri(2,5), k2=ri(2,5);
      if(k1%k2===0 || k2%k1===0) continue; // b も片方倍で消えないように
      var det=m1*k2-m2*k1;
      if(det===0) continue;
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      var askB=(Math.random()<0.5);
      ans=askB?pb:pa;
      t=p.a+" "+m1+"こと "+p.b+" "+k1+"こで "+T1+"円、"+
        p.a+" "+m2+"こと "+p.b+" "+k2+"こで "+T2+"円です。"+
        (askB?p.b:p.a)+" 1こは いくら？";
    }
    else if(lv===9){
      // 真の3量(a,b,c)：3 式から消去して c を求める。
      // 式1: m1*a + k1*b = T1
      // 式2: m2*a + k2*b = T2
      // 式3: a + b + c = T3 （a と b を先に出してから c を引き算で求める）
      var tr=pick(TRIO);
      var pa=ri(3,12)*10;
      var pb=ri(3,12)*10;
      var pc=ri(3,12)*10;
      var m1=ri(1,3), m2=ri(1,3);
      if(m1===m2) continue;
      var k1=ri(1,3), k2=ri(1,3);
      var det=m1*k2-m2*k1;
      if(det===0) continue;
      var T1=m1*pa+k1*pb;
      var T2=m2*pa+k2*pb;
      var T3=pa+pb+pc;
      ans=pc;
      t=tr.a+" "+m1+"こと "+tr.b+" "+k1+"こで "+T1+"円、"+
        tr.a+" "+m2+"こと "+tr.b+" "+k2+"こで "+T2+"円です。"+
        "また "+tr.a+"・"+tr.b+"・"+tr.c+" 1こずつで "+T3+"円です。"+
        tr.c+" 1こは いくら？";
    }
    else { // lv===10
      // 真の3量(a,b,c)：3 式とも 3 変数を含む。
      // 式1: a + b + c = T1
      // 式2: m2*a + k2*b + n2*c = T2
      // 式3: m3*a + k3*b + n3*c = T3
      // 一次独立性を det 3x3 で保証する。
      var tr=pick(TRIO);
      var pa=ri(3,12)*10;
      var pb=ri(3,12)*10;
      var pc=ri(3,12)*10;
      var m2=ri(1,3), k2=ri(1,3), n2=ri(1,3);
      var m3=ri(1,3), k3=ri(1,3), n3=ri(1,3);
      // 行列式: |1 1 1; m2 k2 n2; m3 k3 n3|
      var det3=1*(k2*n3-n2*k3) - 1*(m2*n3-n2*m3) + 1*(m2*k3-k2*m3);
      if(det3===0) continue;
      var T1=pa+pb+pc;
      var T2=m2*pa+k2*pb+n2*pc;
      var T3=m3*pa+k3*pb+n3*pc;
      // 質問対象をランダムに
      var pickAns=ri(1,3);
      var askName, askVal;
      if(pickAns===1){askName=tr.a;askVal=pa;}
      else if(pickAns===2){askName=tr.b;askVal=pb;}
      else {askName=tr.c;askVal=pc;}
      ans=askVal;
      t=tr.a+"・"+tr.b+"・"+tr.c+" 1こずつで "+T1+"円、"+
        tr.a+" "+m2+"こと "+tr.b+" "+k2+"こと "+tr.c+" "+n2+"こで "+T2+"円、"+
        tr.a+" "+m3+"こと "+tr.b+" "+k3+"こと "+tr.c+" "+n3+"こで "+T3+"円です。"+
        askName+" 1こは いくら？";
    }
    if(ans<=0 || ans!==Math.floor(ans)) continue;
    break;
  }
  // fallback
  if(!t){
    ans=80;
    t="りんご 1こと みかん 2こで 220円、りんご 2こと みかん 2こで 300円です。りんご 1こは いくら？";
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
  var t="", ans=0;

  for(var tries=0; tries<300; tries++){
    if(lv===1){
      // 比例の意味: 倍率で考える。x が k 倍になると y も k 倍。
      // a→b の関係で、x が ka になったら y は？(= kb)
      var a=ri(2,6);
      var unit=ri(2,8);
      var b=a*unit;            // x=a で y=b
      var k=ri(2,5);            // 倍率
      ans=b*k;                  // x=ka のとき y=kb
      if(ans<=0||ans>200) continue;
      t="リボン "+a+"m の おもさは "+b+"g です。リボンを "+k+"ばいの ながさに すると、おもさは なん g？";
    }
    else if(lv===2){
      // 比例計算 基本: a→b、c→? を計算 (y=b*c/a, c は a の倍数)
      var a2=ri(2,6);
      var unit2=ri(2,8);
      var b2=a2*unit2;
      var m2=ri(2,7);
      var c2=a2*m2;
      if(c2===a2) continue;
      ans=unit2*c2;             // = b2*c2/a2
      if(ans<=0||ans>300) continue;
      t="えんぴつ "+a2+"本 の ねだんは "+b2+"円 です。おなじ えんぴつ "+c2+"本 では なん円？";
    }
    else if(lv===3){
      // 反比例の意味: 積が一定。x が 2倍 になると y は 1/2 倍。
      // 「x×y = 一定」をイメージさせる導入問題
      var x3=ri(2,6);
      var y3=ri(4,12);
      var k3=ri(2,4);            // x を k3 倍にする
      if(y3%k3!==0) continue;    // y が割り切れる必要
      ans=y3/k3;
      if(ans<=0) continue;
      t="ジュースを "+x3+"人 で わけると 1人 "+y3+"dL ずつ です。人数を "+k3+"ばい に すると、1人 なん dL？";
    }
    else if(lv===4){
      // 反比例計算 基本: x1*y1 = x2*?  歯車モデル
      var x4=ri(2,9), y4=ri(2,9), K4=x4*y4;
      var divs4=[]; for(var d=2; d<=K4; d++){ if(K4%d===0 && d!==x4) divs4.push(d); }
      if(divs4.length===0) continue;
      var x4b=pick(divs4);
      ans=K4/x4b;
      if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
      t="はすう "+x4+" の はぐるまが "+y4+"かい まわると、はすう "+x4b+" の はぐるまは なんかい まわる？";
    }
    else if(lv===5){
      // 表から判断: 表の値が比例か反比例かを答える (kind:num だが 1=比例, 2=反比例 で回答)
      var isProp=(Math.random()<0.5);
      var x1=2, x2=3, x3b=6;
      if(isProp){
        var u5=ri(2,8);
        var y1=u5*x1, y2=u5*x2, y3b=u5*x3b;
        ans=1;
        t="つぎの ひょうは ひれい か はんぴれい？  x="+x1+" のとき y="+y1+"、 x="+x2+" のとき y="+y2+"、 x="+x3b+" のとき y="+y3b+"。  ひれい は 1、 はんぴれい は 2 で こたえてね。";
      } else {
        var K5=12*ri(1,4);     // x1=2,x2=3,x3=6 すべての公倍数=6 の倍数
        if(K5%x1!==0||K5%x2!==0||K5%x3b!==0) continue;
        var yy1=K5/x1, yy2=K5/x2, yy3=K5/x3b;
        ans=2;
        t="つぎの ひょうは ひれい か はんぴれい？  x="+x1+" のとき y="+yy1+"、 x="+x2+" のとき y="+yy2+"、 x="+x3b+" のとき y="+yy3+"。  ひれい は 1、 はんぴれい は 2 で こたえてね。";
      }
    }
    else if(lv===6){
      // 比例定数: y = □ × x の □ を答える (1あたり量)
      var a6=ri(2,7);
      var k6=ri(2,9);            // 比例定数 = 1あたり量
      var b6=a6*k6;
      ans=k6;
      if(ans<=0||ans>20) continue;
      t="水を 入れる じかん x分 と たまる りょう y L が ひれい して います。x="+a6+" の とき y="+b6+" でした。 y = □ × x の □ に 入る かずは？";
    }
    else if(lv===7){
      // 単位量を経由する比例: a 個 で b 円、c 個では？  (1個あたりを意識)
      // ここでは b が a の倍数になるよう保証
      var a7=ri(3,8);
      var u7=ri(3,12);
      var b7=a7*u7;
      var c7=ri(2,12);
      if(c7===a7) continue;
      ans=u7*c7;
      if(ans<=0||ans>500) continue;
      t="おかし "+a7+"こ で "+b7+"円 です。1こ あたりの ねだんを かんがえて、"+c7+"こ では なん円？";
    }
    else if(lv===8){
      // 判別して解く: 文章から比例か反比例かを見抜いて 1段階計算
      var which8=(Math.random()<0.5);
      if(which8){
        // 比例: 距離と時間
        var a8=ri(2,8);
        var u8=ri(3,9);
        var b8=a8*u8;
        var m8=ri(2,6);
        var c8=a8*m8;
        if(c8===a8) continue;
        ans=u8*c8;
        if(ans<=0||ans>500) continue;
        t="(ひれい か はんぴれい か かんがえてね) くるまが "+a8+"分 で "+b8+"km すすみます。おなじ はやさ なら、"+c8+"分 で なん km？";
      } else {
        // 反比例: 人数と日数
        var x8=ri(3,9), y8=ri(3,9), K8=x8*y8;
        var divs8=[]; for(var d=2; d<=K8; d++){ if(K8%d===0 && d!==x8) divs8.push(d); }
        if(divs8.length===0) continue;
        var x8b=pick(divs8);
        ans=K8/x8b;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t="(ひれい か はんぴれい か かんがえてね) "+x8+"人 で "+y8+"日 かかる しごとを、"+x8b+"人 で すると なん日？";
      }
    }
    else if(lv===9){
      // 逆算: y の値から x を求める (比例 or 反比例)
      var which9=(Math.random()<0.5);
      if(which9){
        // 比例の逆算: a→b、y=B のとき x は？(B が unit の倍数になるよう作る)
        var a9=ri(2,6);
        var u9=ri(3,9);
        var b9=a9*u9;
        var m9=ri(2,8);
        var B9=u9*m9;             // 求めたい時の y
        if(B9===b9) continue;
        ans=m9;                    // x = B9/u9
        if(ans<=0||ans>50) continue;
        t="きかいが "+a9+"分 で "+b9+"こ つくります。"+B9+"こ つくるには なん分 かかる？";
      } else {
        // 反比例の逆算: x1*y1=K、y=Y のとき x は？(Y が K の約数)
        var x9b=ri(2,9), y9b=ri(2,9), K9=x9b*y9b;
        var divsY=[]; for(var d=2; d<=K9; d++){ if(K9%d===0 && d!==y9b) divsY.push(d); }
        if(divsY.length===0) continue;
        var Y9=pick(divsY);
        ans=K9/Y9;
        if(!Number.isInteger(ans)||ans<=0||ans>200) continue;
        t="まいぶん "+x9b+"L ずつ 入れると "+y9b+"分 で いっぱい に なる タンク。"+Y9+"分 で いっぱい に するには、まいぶん なん L ずつ 入れる？";
      }
    }
    else if(lv===10){
      // 複合条件: 2段階比例 (単位量を経由して別の単位へ)
      // 例: a 分で b L → c 時間 で何 L？  (分↔時間 の換算をはさむ)
      var a10=ri(2,6);              // 分
      var u10=ri(2,8);              // 1分あたり L
      var b10=a10*u10;              // a10 分で b10 L
      var c10=ri(2,5);              // 時間
      ans=u10*60*c10;               // 1分 u10 L × 60分 × c10 時間
      if(ans<=0||ans>3000) continue;
      t="ホースで "+a10+"分 に "+b10+"L の 水を 入れられます。おなじ いきおいで "+c10+"じかん 入れると、なん L？";
    }
    if(ans>0 && Number.isInteger(ans)) break;
  }

  // フォールバック: tries で決まらなかった場合の最小保証
  if(!(ans>0 && Number.isInteger(ans))){
    ans=12;
    t="2m で 6円 の ひも が あります。 4m では なん円？";
  }
  return {cat:"hireihanpi",kind:"num",text:t,say:null,ans:ans};
}
/* N8: genBy の戻り値に q.lv を付与し、 missedKey で「Lv 別の苦手」 を区別できる
   ようにするための wrapper。 旧コードは q.lv を立てておらず、 missedKey の lv
   フィールドが常に空 → 暗算 Lv1 の加算ミスと Lv10 複合計算ミスが同キーで上書き。 */
function _genByImpl(cat,p,lv){ return _genByRaw(cat,p,lv); }
function genBy(cat,p,lv){
  var resolvedLv = lv;
  if(resolvedLv==null && p && LVL_CATS[cat]){ resolvedLv=(p.lv&&p.lv[cat])||1; }
  var q = _genByRaw(cat,p,resolvedLv);
  if(q && q.lv==null) q.lv = resolvedLv;
  return q;
}
function _genByRaw(cat,p,lv){
  if(lv==null && p && LVL_CATS[cat]){ lv=(p.lv&&p.lv[cat])||1; }  /* 適応レベル: 未指定なら現在Lv */
  if(cat==="sougou"){
    /* 総合: 学習済みカテゴリ全体から1問。cat を "sougou" に統一して集計・レベリングする。
       Lv ごとの構成:
         Lv1-7: 基本5分野＋既習発展からランダム抽出 (難易度=sougou自身の Lv)
         Lv8: 弱点カテゴリを優先抽出（成績下位＝正答率が低いカテゴリから 70%）
         Lv9: 時間意識（解説に「タイム目標」を付与） + sougou Lv に応じた難度
         Lv10: 全形式総合 (高 Lv の発展カテゴリも積極的に混ぜる) */
    var basePool=["mix","kufuu","deci","frac","machigai"];
    var learnedDev=[];
    if(p) K10DEV.forEach(function(c){ if(p.stats&&p.stats[c]&&p.stats[c].n>0) learnedDev.push(c); });
    var spool;
    if(lv===8 && p && p.stats){
      /* 弱点優先: 学習済みカテゴリのうち、正答率が低いものを抽出。
         正答率 = correct/answered。データが少ない (answered<5) は除外して安定化。 */
      var combined=basePool.concat(learnedDev);
      var weakList=[];
      combined.forEach(function(c){
        var s=p.stats[c];
        if(s && s.n>=5){
          var acc=(s.ok||0)/s.n;
          weakList.push({c:c, acc:acc});
        }
      });
      weakList.sort(function(a,b){return a.acc-b.acc;});
      var weak=weakList.slice(0, Math.max(3, Math.floor(weakList.length*0.4))).map(function(x){return x.c;});
      if(weak.length>0 && Math.random()<0.7){
        spool=weak;
      } else {
        spool=combined;
      }
    } else if(lv===9){
      /* 時間意識: Lv7-9 相当の中堅カテゴリを優先（大問の解き直しは時間を食うため） */
      var mid=["mix","kufuu","deci","frac","machigai"];
      learnedDev.forEach(function(c){ mid.push(c); });
      spool=mid;
    } else if(lv===10){
      /* 総合: 発展カテゴリを積極的に */
      spool=learnedDev.length>0 ? basePool.concat(learnedDev,learnedDev) : basePool;
    } else {
      spool=basePool.concat(learnedDev);
    }
    var sq=genBy(pick(spool), p, lv);
    if(!sq) return null;
    /* N8: sougou は元カテゴリも保持して missed 重複統合で別概念が上書きされないように */
    sq.patternId = 'sougou:' + (sq.cat||'?') + ':' + (sq.lv||0);
    sq.cat="sougou";
    sq.lv = lv;               /* 内側 cat の Lv ではなく sougou の Lv で記録 */
    if(lv===9){ sq.timeHint=true; }   /* UI 側で「タイム目標 60s」等を表示するためのフラグ */
    return sq;
  }
  if(cat==="hissan")return gHissan(p,lv);
  if(cat==="hikizan")return gHikizan(p,lv);
  if(cat==="kuku")return gKuku(p,null,lv);
  if(cat==="kukuyomi")return gKukuYomi(lv);
  if(cat==="nanbanme")return gK5Dev("nanbanme",lv);
  if(cat==="ikutsu")return gK5Dev("ikutsu",lv);
  if(cat==="kazoeru")return gK5Dev("kazoeru",lv);
  if(cat==="ookii")return gK5Dev("ookii",lv);
  if(cat==="nagasahikaku")return gK5Dev("nagasahikaku",lv);
  if(cat==="tokei1")return gK5Dev("tokei1",lv);
  if(cat==="sansuu100")return gK5Dev("sansuu100",lv);
  if(cat==="kuraidori")return gK5Dev("kuraidori",lv);
  if(cat==="nagasa")return gK5Dev("nagasa",lv);
  if(cat==="kasa")return gK5Dev("kasa",lv);
  if(cat==="bunsuu1")return gK5Dev("bunsuu1",lv);
  if(cat==="hyou")return gK5Dev("hyou",lv);
  if(cat==="amari")return gK5Dev("amari",lv);
  if(cat==="omosa")return gK5Dev("omosa",lv);
  if(cat==="shousuu1")return gK5Dev("shousuu1",lv);
  if(cat==="bunsuu2")return gK5Dev("bunsuu2",lv);
  if(cat==="bouguraf")return gK5Dev("bouguraf",lv);
  if(cat==="shikishiki")return gK5Dev("shikishiki",lv);
  if(cat==="nichireki1")return gK5Dev("nichireki1",lv);
  if(cat==="gairai")return gK5Dev("gairai",lv);
  if(cat==="menseki")return gK5Dev("menseki",lv);
  if(cat==="kawariwari")return gK5Dev("kawariwari",lv);
  if(cat==="kakuchishiki")return gK5Dev("kakuchishiki",lv);
  if(cat==="shakaku")return gK5Dev("shakaku",lv);
  if(cat==="hakohako")return gK5Dev("hakohako",lv);
  if(cat==="okane")return gK5Dev("okane",lv);
  if(cat==="jisshuu")return gK5Dev("jisshuu",lv);
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
  if(cat==="machigai")return gMachi(lv);
  return genBy(pick(["mix","kufuu","deci","frac","machigai"]),p);
}

/* ---------- set building ---------- */
function fromMissed(m){var q=JSON.parse(JSON.stringify(m.pay)); q._mid=m.id; return q;}
function buildMission(p){
  var list=[], due=dueMissed(p), cap=(p.type==="k5")?2:2, total=5;
  due.slice(0,cap).forEach(function(m){list.push(fromMissed(m));});
  var r=total-list.length, cats;
  if(p.type==="k5"){
    /* K20: 旧 ["hissan","hikizan","kuku","kuku","anzan"] では kukuyomi / warizan が
       永久に出ず、 九九が二重に入っていた。 全 6 基本カテゴリから「久しく触っていない」
       順に優先選択 → ミッションだけで全カテゴリを満遍なくカバー。 */
    var base=["hissan","hikizan","kuku","kukuyomi","anzan","warizan"];
    base.sort(function(a,b){
      var la=(p.lastDone&&p.lastDone[a])||"";
      var lb=(p.lastDone&&p.lastDone[b])||"";
      if(la===lb) return Math.random()-0.5;  /* 同じ日付ならランダム */
      return la<lb?-1:1;                     /* 古い日付 (空文字含む) 優先 */
    });
    cats=base.slice(0,r);
  } else {
    cats=["mix","kufuu","deci","frac","machigai"];
    while(cats.length<r)cats.push(pick(["mix","kufuu","deci","frac"]));
    cats=cats.slice(0,r);
  }
  shuffle(cats).forEach(function(c){list.push(genBy(c,p));});
  return list;
}
function buildPractice(cat,p,lv){
  var n=5, list=[], i;
  /* K5DEV カテゴリは pool が固定サイズ (多くは 5 問) なので、 独立抽出を 5 回繰り返すと
     重複が高頻度で発生する (N7)。 same set 内で出題済 idx を除外する形で gK5Dev を呼ぶ。 */
  if(window.Q4B_K5DEVS && Q4B_K5DEVS[cat]){
    var used={};
    for(i=0;i<n;i++){
      var q=gK5Dev(cat, lv, {exclude:used});
      if(!q){
        /* N10: データ欠落で fail-closed。 これ以上 fill しない。 */
        flashMsg("もんだいデータが よみこめません. ページを よみなおしてね");
        break;
      }
      if(q._k5devIdx!=null) used[q._k5devIdx]=1;
      list.push(q);
    }
    return list;
  }
  for(i=0;i<n;i++){
    var q2=genBy(cat,p,lv);
    if(!q2) continue;
    /* 一般生成器でも 同セット 内で text 重複があれば 3 回まで再抽選 */
    var tries=0;
    while(list.some(function(x){return x && x.text===q2.text;}) && tries<3){
      q2 = genBy(cat,p,lv); tries++;
    }
    if(q2) list.push(q2);
  }
  return list;
}

/* ---------- quiz flow ---------- */
function startMission(){
  var p=P(), t=todayStr(), first=!(p.daily[t]&&p.daily[t].md);
  Q={mode:"mission",first:first,list:buildMission(p),i:0,ok:0,ms:0};
  nextQ();
}
function startPractice(cat,lv){
  /* P1: K5DEV データ欠落 等で buildPractice が 5 問未満を返すと、 0 問でも
     finishSet → ceil(0*0.8)=0, Q.ok>=0 を満たして 30% 抽選に入り 無料で虫が
     取れていた。 5 問揃わなければセッションを開始しない (fail-closed)。 */
  var practiceList = buildPractice(cat,P(),lv);
  if(!practiceList || practiceList.length < 5){
    Q=null;
    alert("もんだいデータを よみこめませんでした. ページを よみなおしてね");
    showHome();
    return;
  }
  Q={mode:"practice",cat:cat,lv:lv||null,list:practiceList,i:0,ok:0,ms:0,balanceBoost:isBalanceCat(P(),cat)};
  nextQ();
}
function startReview(){
  var p=P();
  /* N2: 発展カテゴリ (K5DEV/K10DEV) も復習対象に。 旧 K5CATS のみだと和差算・
     つるかめ算・濃度等を大量に学んでも 復習に出ない / 「復習できる問題がない」と
     表示される問題が出ていた。 */
  var cats=courseCats(p);
  // 既習カテゴリ（stats[cat].n > 0）
  var learned=cats.filter(function(c){ return p.stats[c]&&p.stats[c].n>0; });
  var due=dueMissed(p);
  /* 既習もミス回も 0 なら復習はブロック (K3)。 旧コードは新規問題を生成しつつ
     review=true を立て全問に REVIEW_BOOST が乗っていた。 */
  if(learned.length===0 && due.length===0){
    alert("まだ ふくしゅう できる もんだいが ないよ！\nミッション や れんしゅう で とりくんでみよう");
    return;
  }
  var list=[], i;
  var missSlots=Math.min(due.length, learned.length>=2?2:1, 5);
  var missUsed=shuffle(due).slice(0,missSlots);
  missUsed.forEach(function(m){
    var prob=fromMissed(m);
    /* fromMissed が _mid を保つ前提でブースト判定に使う (handleMissed→afterJudge)。 */
    list.push(prob);
  });
  // 残りを既習カテゴリからランダムに埋める (これらは通常 boost = レアブースト無し)
  var remain=5-list.length;
  if(learned.length){
    var pool=[];
    for(i=0;i<remain;i++) pool.push(pick(learned));
    /* P2: K5DEV データ欠落で genBy が null を返すと旧版で `fillP._reviewFiller=true`
       が例外になっていた。 null を検出したら復習自体を中止 (fail-closed)。 */
    var dataMissing=false;
    pool.forEach(function(c){
      if(dataMissing) return;
      var fillP=genBy(c,p);
      if(!fillP){ dataMissing=true; return; }
      fillP._reviewFiller = true;             /* マーカ: ブーストしない (K3) */
      list.push(fillP);
    });
    if(dataMissing){
      Q=null;
      alert("ふくしゅう問題を よみこめませんでした. ページを よみなおしてね");
      showHome();
      return;
    }
  }
  if(!list.length){
    alert("ふくしゅう問題が ありません");
    return;
  }
  Q={mode:"review", list:shuffle(list), i:0, ok:0, ms:0, review:true};
  nextQ();
}
/* 筆算のレベル選択 (クリア順に解放・易しいレベルへ戻って反復可)。
   現在 Lv (p.lv[cat]) と 解放済み最高 Lv (p.maxLv[cat]) を分離 (K-add #3)。
   失敗で現在 Lv は下がるが、 解放履歴は維持されるので 一度クリアした Lv が
   再ロックされない。 */
function bumpMaxLv(p,cat,lv){
 if(!p.maxLv) p.maxLv={};
 var cur=p.maxLv[cat]||0;
 if(lv>cur) p.maxLv[cat]=clampLv(lv);
}
function hsMaxOf(p,cat){
 ensureLvProgress(p);
 var live = clampLv((p.lv&&p.lv[cat])||1);
 var maxV = clampLv((p.maxLv&&p.maxLv[cat])||0);
 /* 最初の起動・互換: maxLv 未設定なら live を最低限の解放ラインとして採用 */
 return Math.max(live, maxV);
}
function showLevels(cat){
  var p=P(), mx=hsMaxOf(p,cat), label=CATL[cat];
  /* N6: 加算と減算で実問題が異なる (ひき算 Lv5 = 3 桁 -2 桁、 Lv10 = 4 桁 -4 桁 等)
     のに共通の desc を使っていた。 cat 別に実装と一致する説明を持つ。 */
  /* M7: 加算 Lv の実装と表示文言を完全一致させる。 旧版 (N6 修正後でも) Lv4-9 が
     ずれていた (例: Lv4 表示「3けた+1けた」 実装「2けた+2けた くりあがり1回」)。 */
  var DESC={
    hissan: {1:"2けた+1けた",2:"2けた+2けた くりあがりなし",3:"2けた+2けた くりあがり",
             4:"2けた+2けた くりあがり 1回",5:"2けた+2けた くりあがり 2回",
             6:"3けた+1けた",7:"3けた+2けた くりあがり",8:"3けた+3けた くりあがり",
             9:"3けた+3けた くりあがり 2回",10:"4けた+4けた"},
    hikizan: {1:"2けた-1けた",2:"2けた-2けた くりさがりなし",3:"2けた-2けた くりさがり",
              4:"2けた-2けた くりさがり 1回",5:"3けた-2けた くりさがり 2回",
              6:"3けた-1けた",7:"3けた-2けた くりさがり",8:"3けた-3けた くりさがり",
              9:"3けた-3けた くりさがり 2回",10:"4けた-4けた"}
  };
  var desc=DESC[cat]||{};
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
  if(window.Q4BRender&&Q4BRender.setSessionActive) Q4BRender.setSessionActive(true);
  var cur = Q.list[Q.i];
  if(!cur){
    /* N10: 問題が null (K5DEV データ欠落・gFrac 失敗等) のときは fail-closed。
       残りの問題をスキップして set 終了し、 報酬・Lv 進行を抑止。 */
    alert("もんだいデータが よみこめません. ページを よみなおしてね");
    finishSet();
    return;
  }
  renderQ(cur);
}
function nextTimed(){
  if(!Q||Q.fin)return;
  if(Date.now()>=Q.end){finishTimed();return;}
  Q.cur=genBy(Q.cat,P());
  if(!Q.cur){
    alert("もんだいデータが よみこめません. ページを よみなおしてね");
    finishTimed();
    return;
  }
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
  /* M4: 適応 Lv 判定は p.adapt[cat] に分離済 (K-add #4)。 ドット表示も同じバッファ
     を見ないと「画面では あと 1 問なのに 実際は 7 問」 のような乖離が起きる。 */
  var aBuf = (p.adapt && p.adapt[cat]);
  var n = aBuf ? aBuf.n : ((p.stats[cat]&&p.stats[cat].n)||0);
  var inblk = n % 10;
  var src = aBuf ? aBuf.recent : (p.recent[cat]||[]);
  var rec = inblk > 0 ? src.slice(-inblk) : [];
  var dots=""; for(var i=0;i<10;i++){ dots+=(i<inblk)?(rec[i]?"●":"✗"):"○"; }
  return '<span class="note">　Lv'+((p.lv&&p.lv[cat])||1)+'　'+dots+'</span>';
}
/* 5歳向け発展(K5DEV)の文章題に ふりがな(ruby) を付ける。表示テキストの漢字のみ対象。
   ⚠ 順番重要: 長い熟語を先に置換しないと「正三角形→正三角+形」のように分割される。 */
var FURI5_PAIRS=[
  /* === 27カテゴリ追加分の熟語(長い順) === */
  ["正三角形","せいさんかくけい"],["正方形","せいほうけい"],
  ["円玉","えんだま"],["何本","なんぼん"],["何人","なんにん"],["何台","なんだい"],
  ["半分","はんぶん"],["本数","ほんすう"],["色紙","いろがみ"],["分後","ふんご"],
  /* === 単漢字（既存 + 拡張） === */
  ["円","えん"],["人","にん"],["数","かず"],["何","なん"],["個","こ"],
  ["分","ふん"],["時","じ"],["間","かん"],
  ["上","うえ"],["十","じゅう"],["一","いち"],["百","ひゃく"],["倍","ばい"],
  ["千","せん"],["大","だい"],["本","ほん"],["入","はい"],["切","き"],
  ["色","いろ"],["商","しょう"],["小","しょう"],["日","にち"],
  ["白","しろ"],["捨","す"],["金","きん"],["長","なが"],
  ["皿","さら"],["子","こ"],["台","だい"],["同","おな"],
  ["中","なか"],["算","さん"],["辺","へん"],["字","じ"]
];
var FURI5={}; FURI5_PAIRS.forEach(function(p){FURI5[p[0]]=p[1];});  /* 後方互換のため辞書も保持 */
function furi5(s){
  if(!s||s.indexOf("<ruby>")>=0) return s;  /* 既に処理済みは触らない */
  for(var i=0;i<FURI5_PAIRS.length;i++){
    var word=FURI5_PAIRS[i][0], yomi=FURI5_PAIRS[i][1];
    /* rubyタグの内側を保護: 既にrubyが含まれた領域を一時的にプレースホルダ化 */
    var parts=s.split(/(<ruby>[\s\S]*?<\/ruby>)/);
    for(var j=0;j<parts.length;j+=2){
      parts[j]=parts[j].split(word).join('<ruby>'+word+'<rt>'+yomi+'</rt></ruby>');
    }
    s=parts.join('');
  }
  return s;
}
function speechRecCtor(){ return window.SpeechRecognition||window.webkitSpeechRecognition||null; }
function voiceKukuHTML(q){
  if(!q||q.cat!=="kuku")return "";
  if(!speechRecCtor())return '<p class="note">このブラウザでは 音声こたえあわせは使えません</p>';
  /* 旧: 「2 3 6」 のように正解を併記していたため音声問題として成立せず (K-add #2)。
     例示は「式」だけで、 答えは口頭で言わせる。 */
  return '<div class="voicebox"><button class="btn sm amber" onclick="startKukuVoice()">🎙 こえでこたえる</button>'
    +'<span class="note">しきと こたえを こえで 言ってね（れい：「'+q.dan+' かける '+q.b+' は …」）</span></div>';
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
  /* 古いコールバックが次の問題を勝手に判定するレースを封じる (K6)。
     - 開始時の Q (セッション) と q (問題インスタンス) を捕捉
     - onresult で「自分が現在の音声 rec か」「同じセッション・同じ問題か」を確認 */
  var _capturedQ = q;
  var _capturedSession = Q;
  rec.lang="ja-JP"; rec.interimResults=false; rec.maxAlternatives=3;
  var msg=$("nmsg"); if(msg){msg.textContent="きいています…"; msg.style.color="var(--green-d)";}
  rec.onerror=function(){ if($("nmsg"))$("nmsg").textContent="ききとれませんでした。数字でもこたえられます"; };
  rec.onend=function(){ if(VOICE_REC===rec)VOICE_REC=null; };
  rec.onresult=function(ev){
    if(VOICE_REC!==rec) return;                    /* 後発の rec に置き換えられた */
    if(!Q || Q!==_capturedSession) return;          /* セッション破棄 / 新セッション */
    if(curQ()!==_capturedQ) return;                 /* 既に次問へ進んでいる */
    var texts=[], i, res=ev.results&&ev.results[0];
    if(res)for(i=0;i<res.length;i++)texts.push(res[i].transcript||"");
    var raw=texts.join(" "), cand=voiceCandidates(raw);
    /* 集合判定の補強: 「式 (段・かける数) を含む」 かつ 「最後に発話された数値が
       答え」 を要求 (K-add #2)。 例: 1×7=7 で「1、 7」だけ言うと旧判定は通って
       いたが、 厳密判定では順序: 段→かける数→答え を要する。 */
    var spaced = String(raw||"").replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0);});
    var nums = (spaced.match(/\d+/g)||[]).map(function(s){return parseInt(s,10);});
    var hasOperands = !!(cand[_capturedQ.dan] && cand[_capturedQ.b]);
    var lastNumIsAns = (nums.length>0 && nums[nums.length-1] === _capturedQ.ans);
    var ok = hasOperands && (lastNumIsAns || (cand[_capturedQ.ans] && nums.length===0));
    if($("ansl"))$("ansl").textContent=raw||"？";
    afterJudge(ok,_capturedQ,{ansHTML:String(_capturedQ.ans),top:ok?"こえで 3つ ききとれた！":"きこえたこと："+esc(raw||"")});
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
  var nowLv=(Q&&Q.lv)?Q.lv:((p.lv&&p.lv[q.cat])||1), stage=lvLabel(q.cat,nowLv);
  h+='<div class="qmeta"><span>'+(CATL[q.cat]||"")+(stage?'　Lv'+clampLv(nowLv)+'：'+esc(stage):'')+(q._mid?"　🦋にがした虫！":"")+lvDotsHTML(p,q.cat)+'</span>'
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
  }else if(q.kind==="choice" && q.lines){
    /* machigai: ミス行を選ぶ＋「ぜんぶOK」選択肢。
       「ぜんぶ正しい」問題が混ざるので、各行を検算しないと当てられない構造にする。 */
    h+='<div class="qcard"><div class="qtext mid">'+q.text+'</div>'
      +'<p style="font-weight:700;margin:6px 0">どこが まちがい？　ぜんぶ正しければ 🆗</p><div class="lines">';
    q.lines.forEach(function(L,i){h+='<button onclick="choiceTap('+i+')">'+L+'</button>';});
    h+='<button onclick="choiceTap('+q.lines.length+')">🆗 ぜんぶ正しい</button>';
    h+='</div></div>';
  }else if(q.kind==="choice" && q.choices){
    /* 新仕様: 九九暗唱・K5DEV新27カテゴリ用の4択選択。
       問題文と選択肢に ふりがな(furi5)を付与＝5歳でも読める。
       選択肢の値は data-v にプレーンで入れ、onclick はインデックスのみ渡す。
       (旧: 値を onclick に入れていたが < > ' " が混入してHTMLが壊れていた) */
    var qt2=furi5(q.text);
    h+='<div class="qcard"><div class="qtext mid k5choice">'+qt2+'</div>'
      +'<div class="k5choices">';
    q.choices.forEach(function(c,i){
      var raw=String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      h+='<button class="k5cbtn" data-v="'+raw+'" onclick="k5ChoiceTap('+i+')">'+furi5(String(c))+'</button>';
    });
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
  /* 数字確定で音声認識の動作中インスタンスを停止し、 古い voice callback が
     次問を勝手に判定するレースを遮断 (K6 と組合せ)。 */
  try{ if(VOICE_REC){ VOICE_REC.abort(); VOICE_REC=null; } }catch(_){}
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
  /* ひき算筆算では「最上位の連続する空欄」を許す (K8)。 100−99=1 を「001」と
     ゼロパディングしないと出せないのは通常の筆算表記ではない。 加算は最上位桁が
     0 になることがないので従来通り全枠必須。 */
  if(sub){
    var firstFilled = -1;
    for(i=HS.cols-1; i>=0; i--){
      if(HS.ans[i] !== ""){ firstFilled = i; break; }
    }
    if(firstFilled < 0){ flashMsg("こたえの けたを いれてね"); return; }
    /* 先頭の空欄を 0 扱い + 中間 / 一の位の空欄はエラー */
    for(i=0; i<=firstFilled; i++){
      if(HS.ans[i] === ""){ flashMsg("こたえの けたを ぜんぶ いれてね"); return; }
    }
  } else {
    for(i=0;i<HS.cols;i++)if(HS.ans[i]===""){flashMsg("こたえの けたを ぜんぶ いれてね");return;}
  }
  var s="";
  for(i=HS.cols-1;i>=0;i--) s += (HS.ans[i]===""?"0":HS.ans[i]);
  var numericallyOk=(parseInt(s,10)===HS.sum), warn=null;
  /* 不要なくり上がり/くり下がりメモも誤答扱い (K10)。 旧版は警告だけで ok=true の
     まま SRS / Lv 進行・報酬が満額入り、 全桁に「1」 と書いても通る抜け道だった。
     筆算手順の習得尺度として「メモが正しい」 ことも要件にする。 */
  var ok = numericallyOk && !extra;
  if(extra){
    warn="✏️ "+(HS.op==="sub"?"くりさがり":"くりあがり")+"が ない けたに メモが あるよ。けいさんを みなおそう";
    if(!HS.counted){p.carryMiss++;HS.counted=true;}
  }
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
/* machigai 2段階提出 (Lv10 限定) の状態。
   行タップで pickedIdx を保持し、数値入力画面へ遷移。submitMachiVerify で行+値を判定。 */
var MCH=null;
function choiceTap(i){
  if(JLOCK)return;
  var q=curQ();
  /* Lv10 (q.requireValue) で「ぜんぶOK」以外の行タップなら 2段階フェーズへ。 */
  if(q.requireValue && i < q.lines.length){
    MCH={pickedIdx:i};
    renderMachiVerify(q,i);
    return;
  }
  /* M1: 行タップ誤答時にも、 正解の行 (ans=index) を fix で表示する。
     fixmsg が無いケースで「❌ ざんねん」 だけにならないよう ansHTML も付与。 */
  afterJudge(i===q.ans,q,{ansHTML:'せいかいの ぎょう：'+(["①","②","③","④"][q.ans]||'?'), fix:q.fixmsg});
}
/* machigai 2段階提出: 「① の ほんとうの こたえは？」プロンプト＋数値入力。
   topBar/qmeta は renderQ と同じ構造で組み直す (フル再描画で実装簡略化)。 */
function renderMachiVerify(q,idx){
  JLOCK=false; BUF="";
  var p=P(), h='<div class="scr qwrap">';
  h+='<div class="top"><button class="backbtn" onclick="quitQuiz()">✕ やめる</button><span class="sp"></span>';
  if(Q.timed)h+='<span class="chip fire">⏱ <span id="tleft">'+Math.max(0,Math.ceil((Q.end-Date.now())/1000))+'</span>秒</span><span class="chip kago">'+Q.ok+'問</span>';
  else h+='<span class="chip">'+(Q.i+1)+' / '+Q.list.length+'</span>';
  h+='</div>';
  var nowLv=(Q&&Q.lv)?Q.lv:((p.lv&&p.lv[q.cat])||1), stage=lvLabel(q.cat,nowLv);
  h+='<div class="qmeta"><span>'+(CATL[q.cat]||"")+(stage?'　Lv'+clampLv(nowLv)+'：'+esc(stage):'')+'　🔢 2だんかいめ</span></div>';
  var mark=["①","②","③","④"][idx]||"●";
  h+='<div class="qcard"><div class="qtext mid">'+q.text+'</div>'
    +'<p style="font-weight:700;margin:6px 0">'+mark+' の ほんとうの こたえは？</p>'
    +'<div>こたえ <span class="ansline" id="ansl">？</span></div>'
    +'<div class="note" id="nmsg" style="min-height:20px"></div>'
    +padHTML(!!q.dot,"submitMachiVerify()")
    +'</div>';
  h+='</div>';
  render(h);
}
function submitMachiVerify(){
  if(JLOCK)return;
  if(BUF===""){flashMsg("こたえを いれてね");return;}
  var q=curQ(), idx=(MCH?MCH.pickedIdx:-1);
  var mark=["①","②","③","④"][idx]||"●";
  var u=parseFloat(BUF);
  var lineOk=(idx===q.ans);
  var trueV=(q.trueVals&&idx>=0&&idx<q.trueVals.length)?q.trueVals[idx]:null;
  var valOk=(trueV!=null)&&(Math.abs(u-trueV)<1e-6);
  var ok=lineOk&&valOk;
  /* fixmsg を 2段階用に補強: 「行違い」「行は合ってたが値違い」を区別。 */
  var fix2=q.fixmsg;
  if(!ok && lineOk && !valOk){
    fix2=mark+" は あっていた！　ほんとうの こたえは "+(q.dot?trueV.toFixed(1):String(trueV));
  }
  MCH=null;
  afterJudge(ok,q,{fix:fix2});
}
/* 新仕様: index ベースの4択選択（九九暗唱・K5DEV新27カテゴリ用） */
function k5ChoiceTap(idx){
  if(JLOCK)return;
  var q=curQ();
  if(!q||!q.choices)return;
  var picked=q.choices[idx];
  var ok=String(picked)===String(q.ans);
  /* M1: 旧版は fix のみで K5DEV / kukuyomi に fixmsg が無いため誤答時に正解を
     一切表示せず学習効果を損なっていた。 ansHTML で必ず正解を見せる。 */
  afterJudge(ok,q,{ansHTML:esc(String(q.ans)),fix:q.fixmsg});
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
/* 適応 Lv 判定専用統計 (K-add #4)。 タイムアタック / 復習 / 取りこぼし / 固定 Lv
   練習を除外して、 ミッションと現 Lv のおまかせ練習だけを集計。 これがないと
   timed が p.stats.n を消費して 10 問目の Lv 判定が永久に飛ぶ + 直近 10 問に
   timed 結果が混入する。 */
function recordAdaptStat(cat,ok){
  var p=P();
  if(!p.adapt) p.adapt={};
  var a = p.adapt[cat] || (p.adapt[cat]={n:0, recent:[]});
  a.n++; a.recent.push(ok?1:0);
  while(a.recent.length>20) a.recent.shift();
}
/* K21: 同じ概念で複数回間違えた場合に missed が別エントリで埋まり、 古い未解決
   問題が FIFO で押し出される問題を解消。 cat + kind + lv (+ text の特徴) で
   重複統合し、 同概念ヒット時は tries++ / due 更新 / payload 差し替えにとどめる。 */
function missedKey(q){
  /* 数値そのものではなく問題のパターンを特徴づける identifier。
     ランダム数値だけ違う「同じ概念」 を 1 つのエントリに統合する (K21+N8)。
     patternId がある場合はそれを優先 (K5DEV データ別 idx・sougou の元 cat 等)。 */
  if(q && q.patternId) return q.patternId;
  var lv = (q&&q.lv!=null) ? q.lv : '';
  var dan = (q&&q.dan!=null) ? q.dan : '';
  var fix = (q&&q.fixmsg) ? '#'+String(q.fixmsg).slice(0,8) : '';
  return (q.cat||'')+'|'+(q.kind||'')+'|'+lv+'|'+dan+fix;
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
    var pkey = missedKey(q);
    /* 既存に同パターンがあれば差し替え (FIFO 消失防止 K21)。 */
    for(i=0;i<p.missed.length;i++){
      if(p.missed[i].pkey === pkey){
        p.missed[i].pay = pay;
        p.missed[i].due = dShift(t,1);
        p.missed[i].tries = (p.missed[i].tries||0) + 1;
        return;
      }
    }
    p.missed.push({id:Date.now()+""+ri(100,999), pkey:pkey, pay:pay, due:dShift(t,1), tries:0});
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
    /* タイムアタック中も recordStat と recordCorrect は実行する (audit #22)。
       旧コードは return で早期離脱し、 stats/recent/daily/lastDone が更新されず、
       60 秒で 30 問正解しても daily 進捗・カテゴリ統計に一切反映されなかった。
       採集ゲージ・卵給餌・レベル上げは「関門」性質なので skip 維持。 */
    recordStat(q.cat,ok,ms);
    if(ok&&window.QuestSave&&QuestSave.recordCorrect) QuestSave.recordCorrect(pidNow(),"keisan",1);
    save();        /* タイムアタックでも 現プロフィールを保存 (audit #22) */
    var fb=document.createElement("div"); fb.className="fb";
    fb.innerHTML='<div class="fbmark '+(ok?"ok":"ng")+'" style="font-size:90px">'+(ok?"⭕":"❌")+'</div>';
    document.body.appendChild(fb);
    setTimeout(function(){fb.remove(); JLOCK=false; nextTimed();},380);
    return;
  }
  if(ok)Q.ok++;
  recordStat(q.cat,ok,ms);
  if(ok&&window.QuestSave&&QuestSave.recordCorrect)QuestSave.recordCorrect(pidNow(),"keisan",1);
  if(ok&&window.Q4BReward&&Q4BReward.feedEgg){
    /* keisan は問題が auto-generated で itemId 一致がほぼ無いので freshness で十分。
       category 別 Lv が max(10) のときは習熟扱いで value=0.4 に下げる。
       freshness 二重消費の回避: feedEgg と onCorrect が同じ itemId を内部で
       freshnessOf に通すと初見でも 1→0.5。 caller で 1 回 peek して両 API に
       value 反映で渡し、 itemId は null にして内部 push を抑止 (K1)。 */
    var _kv=1;
    var _curLv = (p.lv && p.lv[q.cat]) || 1;
    if(_curLv >= 10) _kv=0.4;
    /* M2: 易しい固定 Lv 練習 (Q.lv < 現在 Lv) も習熟扱いで価値を下げる。 旧コードは
       現在 Lv のみ見ており、 Lv9 の子が Lv1 を周回しても毎回満額になっていた。 */
    if(Q && Q.lv && Q.lv < _curLv) _kv = Math.min(_kv, 0.4);
    /* 九九チャレンジ: クリア済の段は習熟済みなので 0.4。 旧コードは段の進捗を見ず満額。 */
    if(Q && Q.mode==='kuku' && Q.dan && p.kukuClear && p.kukuClear[Q.dan]){
      _kv = Math.min(_kv, 0.4);
    }
    var _iid=q.cat+':'+(q.text||q.say||'');
    ensureColl(p);
    var _fresh = (Q4BReward.freshnessPeek ? Q4BReward.freshnessPeek(p.coll, _iid) : 1);
    Q._keisanIid = _iid;
    Q._keisanEffective = _kv * _fresh;       /* 下の onCorrect ブロックで再利用 */
    Q4BReward.feedEgg("keisan", Q._keisanEffective, {coll:p.coll});
  }
  handleMissed(q,ok,o);
  /* 適応 Lv 進行は ミッション / おまかせ練習 限定。 復習 (review) / タイムアタック
     / 九九チャレンジ / 取りこぼし再挑戦 (_mid) / レベル選択練習 (Q.lv) は除外 (K4)。
     旧コードは「!Q.lv」 だけで判定し、 復習からも進級していたためコメントと実装が
     乖離していた。 */
  var _lvUpdateAllowed = !(Q&&Q.lv) && !(Q&&Q.mode==='review') && !(Q&&Q.timed)
                       && !(Q&&Q.mode==='kuku') && !q._mid;
  if(_lvUpdateAllowed) recordAdaptStat(q.cat, ok);   /* 適応用バッファに分離記録 (K-add #4) */
  if(LVL_CATS[q.cat] && q.cat!=="hissan" && q.cat!=="hikizan" && q.cat!=="kuku" && _lvUpdateAllowed){
    if(!p.lv)p.lv={}; if(p.lv[q.cat]==null)p.lv[q.cat]=1;
    /* 判定は適応バッファ (timed/review/kuku/取りこぼし を除外) を見る。 これがないと
       タイムアタックが p.stats.n を消費して 10 問目を飛ばす + 直近 10 問に timed
       結果が混入する。 */
    var aBuf=(p.adapt && p.adapt[q.cat]);
    if(aBuf && aBuf.n>0 && aBuf.n%10===0){
      var ok10=aBuf.recent.slice(-10).reduce(function(x,y){return x+y;},0);
      if(ok10>=9 && p.lv[q.cat]<10){ p.lv[q.cat]++; bumpMaxLv(p,q.cat,p.lv[q.cat]); o.lvup="📈 "+(CATL[q.cat]||q.cat)+" レベル"+p.lv[q.cat]+"に アップ！"; }
      else if(ok10<=5 && p.lv[q.cat]>1){ p.lv[q.cat]--; }
    }
  }
  /* 自動進級はミッション/おまかせ練習のみ（レベル選択練習・復習・タイム・取りこぼしは除外） */
  if(q.cat==="hissan"&&p.type==="k5"&&_lvUpdateAllowed){
    if(!p.lv)p.lv={}; if(p.lv.hissan==null)p.lv.hissan=1;
    if(ok){p.hsRun=(p.hsRun>=0)?p.hsRun+1:1;
      if(p.hsRun>=5&&p.lv.hissan<10){p.lv.hissan++;p.hsRun=0;syncLegacyFromLv(p);bumpMaxLv(p,"hissan",p.lv.hissan);o.lvup="📈 たし算ひっさん Lv"+p.lv.hissan+"に アップ！";}}
    else{p.hsRun=(p.hsRun<=0)?p.hsRun-1:-1;
      if(p.hsRun<=-3&&p.lv.hissan>1){p.lv.hissan--;p.hsRun=0;syncLegacyFromLv(p);}}
  }
  if(q.cat==="hikizan"&&p.type==="k5"&&_lvUpdateAllowed){
    if(!p.lv)p.lv={}; if(p.lv.hikizan==null)p.lv.hikizan=1;
    if(p.hkLevel==null){p.hkLevel=1;} if(p.hkRun==null){p.hkRun=0;}
    if(ok){p.hkRun=(p.hkRun>=0)?p.hkRun+1:1;
      if(p.hkRun>=5&&p.lv.hikizan<10){p.lv.hikizan++;p.hkRun=0;syncLegacyFromLv(p);bumpMaxLv(p,"hikizan",p.lv.hikizan);o.lvup="📈 ひき算ひっさん Lv"+p.lv.hikizan+"に アップ！";}}
    else{p.hkRun=(p.hkRun<=0)?p.hkRun-1:-1;
      if(p.hkRun<=-3&&p.lv.hikizan>1){p.lv.hikizan--;p.hkRun=0;syncLegacyFromLv(p);}}
  }
  /* 九九: ミッション/おまかせ練習の周回で「いまの目標の段」を8回正解したら次の段へ進級（5歳）。
     専用の九九チャレンジ(Q.mode==='kuku')は別ロジックで進級するため除外し二重進級を防ぐ。 */
  if(q.cat==="kuku"&&p.type==="k5"&&_lvUpdateAllowed&&!(Q&&Q.mode==='kuku')&&p.kukuIdx<ORDER.length){
    if(p.kukuHits==null)p.kukuHits=0;
    var ktarget=ORDER[Math.min(p.kukuIdx,ORDER.length-1)];
    if(ok && q.dan===ktarget){
      p.kukuHits++;
      if(p.kukuHits>=8){
        p.kukuClear[ktarget]=1; p.kukuIdx++; p.kukuHits=0;
        if(!p.lv)p.lv={}; p.lv.kuku=legacyKukuToLv(p);
        bumpMaxLv(p,"kuku",p.lv.kuku);   /* M3: 最高到達 Lv も追従 */
        o.lvup="🎉 "+ktarget+"の段 マスター！"+(p.kukuIdx<ORDER.length?"つぎは "+ORDER[p.kukuIdx]+"の段！":"九九 ぜんぶ クリア！🏆");
      }
    }
  }
  /* 正解時に採集エンジンを進める（タイムアタック中は行わない） */
  if(ok && window.Q4BReward){
    ensureColl(p);
    /* レアブースト: 取りこぼし (_mid) のみ復習 BOOST、 発展(難問)=HATTEN、
       balanceBoost=REVIEW、 既習(Lv>=8)=BOOST_LOW、 それ以外=通常。
       旧 `Q.review` で全問ブーストしていたが、 復習からの新規導入問題まで
       高ブースト + 追加捕獲抽選になっていたため _mid 限定へ (K3)。 */
    var _isHatten=(K5DEV.indexOf(q.cat)>=0||K10DEV.indexOf(q.cat)>=0);
    var _boost;
    if(q._mid) _boost=Q4BReward.REVIEW_BOOST;
    else if(_isHatten) _boost=Q4BReward.HATTEN_BOOST;
    else if(Q&&Q.balanceBoost) _boost=Q4BReward.REVIEW_BOOST;
    else _boost=keisanCatBoost(p, q.cat);
    /* freshness 二重消費の回避 (K1): feedEgg と同じ係数を再利用、 itemId=null。 */
    var _effective = (Q&&Q._keisanEffective!=null) ? Q._keisanEffective : 1;
    var got=Q4BReward.onCorrect(p.coll,'keisan', 8, _boost, null, _effective);
    if(got) o.capture=got;
    if(Q){ Q._keisanIid=null; Q._keisanEffective=null; }
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
var __fbNextLock=false;
function fbNext(){
  /* つぎへ ▶ の二度押し封じ (audit #4): 二回目のタップで捕獲モーダルを飛ばして
     Q.i++ が 2 進む race を遮断。 */
  if(__fbNextLock) return;
  __fbNextLock=true;
  var btn=document.querySelector('.fb button'); if(btn) btn.disabled=true;
  var f=document.querySelector(".fb"); if(f)f.remove();
  if(__keiCatch&&window.Q4BReward){
    var got=__keiCatch; __keiCatch=null;
    Q4BReward.netSwing(function(){ showKeiCatch(got); });
    return; /* keiCatchDone() が つぎへ すすむ + ロック解除 */
  }
  JLOCK=false; Q.i++; __fbNextLock=false; nextQ();
}
function showKeiCatch(got){
  var sp=got.sp, tags=[];
  if(got.isNew)tags.push('✨ NEW！ずかん登録'); else if(got.isRecord)tags.push('📏 じこベスト更新');
  if(got.shiny&&!got.isNew)tags.push('✨いろちがい');
  app.insertAdjacentHTML("beforeend",'<div class="modal" id="md"><div class="mcard" style="text-align:center">'
    +'<div style="font-weight:800;font-size:18px">📖 つかまえた！</div>'
    +'<div style="width:120px;height:120px;margin:8px auto">'+Q4BReward.svg(sp,got.shiny)+'</div>'
    +'<div style="font-weight:800;font-size:17px">'+esc(sp.jaName)+(got.shiny?' ✨':'')+'</div>'
    +'<div style="font-size:13px;color:var(--sub)">'+got.size+'mm　<span class="rtag r'+Q4BReward.tierOf(sp)+'">'+Q4BReward.TIERNAME[got.tier]+'</span></div>'
    +(tags.length?'<div class="note" style="color:var(--amber-d);font-weight:800;margin-top:4px">'+tags.join('　')+'</div>':"")
    +'<button class="btn" style="margin-top:12px" onclick="keiCatchDone()">つづける ▶</button></div></div>');
}
var __keiCatchDoneLock=false;
function keiCatchDone(){
  /* つづける ▶ の二度押し封じ (audit #5): 二回目で Q.i++ が 2 進む race を遮断。 */
  if(__keiCatchDoneLock) return;
  __keiCatchDoneLock=true;
  var btn=document.querySelector('#md button'); if(btn) btn.disabled=true;
  var m=$("md"); if(m)m.remove();
  JLOCK=false; Q.i++; __fbNextLock=false; __keiCatchDoneLock=false; nextQ();
}

/* ---------- finish ---------- */
function fmtSec(ms){return (Math.round(ms/100)/10).toFixed(1)+"秒";}
function best5Key(q,p){
  if(q.mode==="practice"){
    /* M6: 固定 Lv 練習は Lv 別に best を保存する。 旧版は cat だけで Lv1 と Lv10 を
       同じ枠に入れており、 難度上昇後の成長指標として機能しなかった。 */
    if(q.lv) return q.cat+"_lv"+q.lv;
    return q.cat;
  }
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
  /* P1: 0 問セットでクリア扱い → 報酬抽選を防ぐ最終ガード。 通常経路では
     startPractice が阻止するが、 中途で abort された場合等の安全網。 */
  if(!N || Q.aborted){
    Q=null; showHome(); return;
  }
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
        p.kukuHits=0;                       /* 通常学習の途中カウントを次段へ持ち越さない (K5) */
        if(!p.lv)p.lv={}; p.lv.kuku=legacyKukuToLv(p);
        bumpMaxLv(p,"kuku",p.lv.kuku);     /* M3 */
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
    /* 0 点でも「クリア」 + 虫獲得 + 連続記録 になっていた。 3/5 以上を要件に
       した上で 報酬と連続記録を付与。 未達は記録だけ残して再挑戦可能に (K-add #1)。 */
    var passMission = (Q.ok >= 3);
    var d=p.daily[t]||(p.daily[t]={n:0,ok:0});
    if(passMission){
     d.md=1;
     if(p.streak.last===dShift(t,-1))p.streak.n++;
     else if(p.streak.last!==t)p.streak.n=1;
     p.streak.last=t;
     updateProgressSummary(p);
     save();
     showCapture(gachaPull(p),"ミッションクリア！ 🔥れんぞく"+p.streak.n+"日　"+scoreLine+(best5Line?"　"+best5Line:""));
    } else {
     updateProgressSummary(p);
     save();
     showSetResult("もうすこし！",[scoreLine,"5問中3問で クリア！もういちど ちょうせん してみよう"],"startMission()");
    }
    return;
  }
  /* レベル選択練習: クリア(4/5以上)で つぎのレベルを解放。再挑戦は同レベル。
     P4: 旧版は `Q.lv < 10` ガードがあり、 Lv10 クリアが p.lv / p.maxLv に
     反映されなかった (画面では「Lv10 クリア！」 と出るのに マスター未達)。
     Lv10 でも reached=10 を bumpMaxLv で記録、 unlocked 表示は Lv<10 のときだけ。 */
  if(Q.mode==="practice"&&Q.lv&&(Q.cat==="hissan"||Q.cat==="hikizan")){
    var cleared=(Q.ok>=4), key=Q.cat, unlocked=false, allLvCleared=false;
    if(!p.lv)p.lv={};
    var curLvHere = (p.lv&&p.lv[key])||1;
    if(cleared && Q.lv>=curLvHere){
      var reached = Math.min(10, Q.lv+1);
      if(Q.lv===10){
        bumpMaxLv(p, key, 10);
        allLvCleared = true;
      } else {
        p.lv[key] = reached;
        syncLegacyFromLv(p);
        bumpMaxLv(p, key, reached);
        logLv(p, key);
        unlocked = true;
      }
    }
    updateProgressSummary(p);
    save();
    var msgs=[scoreLine];
    if(unlocked) msgs.push("🎉 Lv"+(Q.lv+1)+"が ひらいたよ！");
    else if(allLvCleared) msgs.push("🏆 ぜんレベル クリア！ マスターを めざそう！");
    else if(!cleared) msgs.push("5問中4問で つぎが ひらくよ。もういちど！");
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
/* 外部（battle.html など）からは boot() をスキップして生成器のみ再利用したい。
   window.Q4B_KEISAN_NO_BOOT=true をスクリプト前にセットすれば自動起動を抑止する。 */
window.Q4B_KEISAN={genBy:genBy, K5DEV:K5DEV, K10DEV:K10DEV, K5CATS:K5CATS, K10CATS:K10CATS, LVL_CATS:LVL_CATS, CATL:CATL};
if(!window.Q4B_KEISAN_NO_BOOT) boot();
