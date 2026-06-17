(function(global){
  "use strict";

  /* =========================================================================
     Quest4Bugs unified storage layer
     -------------------------------------------------------------------------
     Three tiers:
       1. localStorage (instant, per device)        -> q4b_store_v1
       2. private GitHub repo (auto sync, optional)  -> quest4bugs_fieldnote
       3. JSON export/import (manual last resort)
     Two data shapes share one store:
       - profile registry : [{id,name,icon, ...game-specific passthrough}]
       - namespaced KV    : kv["<ns>\\u0000<key>"] = {v,updated,data}
     Games read/write per-profile state via save(game, profileId, state).
     Profiles are created/named/selected from the portal (single entrance).
     ========================================================================= */

  var STORE_KEY="q4b_store_v1";
  var CONFIG_KEY="quest4bugs_fieldnote_config_v1";
  var LEGACY_KEYS=["q4b_keisan_v1"];
  var SEP="\u0000";
  var SCHEMA="quest4bugs.fieldnote.v2";

  var DEFAULT_CONFIG={
    owner:"shtshbt",
    repo:"quest4bugs_fieldnote",
    branch:"main",
    basePath:"q4b"
  };

  var mem=null;            // in-memory canonical store
  var status="local";      // local | syncing | synced | error
  var statusCbs=[];
  var pushTimers={};       // debounce per cloud path
  var registryTimer=null;

  /* ---------------- low level localStorage ---------------- */
  function safeGet(key,fallback){
    try{var v=localStorage.getItem(key);return v===null?fallback:v;}catch(e){return fallback;}
  }
  function safeSet(key,value){
    try{localStorage.setItem(key,value);return true;}catch(e){return false;}
  }
  function safeRemove(key){
    try{localStorage.removeItem(key);return true;}catch(e){return false;}
  }
  function now(){return Date.now();}
  function pad2(n){return (n<10?"0":"")+n;}
  function stamp(){
    var d=new Date();
    return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+"T"+
      pad2(d.getHours())+":"+pad2(d.getMinutes())+":"+pad2(d.getSeconds());
  }

  /* ---------------- canonical store ---------------- */
  function blankStore(){return {v:2, profiles:[], current:null, kv:{}, tombstones:{}};}
  function migrateLegacy(store){
    // Pull any pre-v2 flat game blobs (e.g. q4b_keisan_v1) into kv once.
    var i, key, gameId, raw;
    for(i=0;i<LEGACY_KEYS.length;i++){
      key=LEGACY_KEYS[i];
      gameId=key.replace(/^q4b_/,"").replace(/_v[0-9]+$/,"");
      if(store.kv[gameId+SEP+"_legacy"])continue;
      raw=safeGet(key,null);
      if(raw===null)continue;
      var parsed=null; try{parsed=JSON.parse(raw);}catch(e){parsed=raw;}
      store.kv[gameId+SEP+"_legacy"]={v:1,updated:now(),data:parsed};
    }
  }
  function loadStore(){
    if(mem)return mem;
    var raw=safeGet(STORE_KEY,null), d=null;
    if(raw){try{d=JSON.parse(raw);}catch(e){}}
    mem=d||blankStore();
    if(!mem.profiles)mem.profiles=[];
    if(!mem.kv)mem.kv={};
    if(!mem.tombstones)mem.tombstones={};
    if(typeof mem.current==="undefined")mem.current=null;
    mem.v=2;
    migrateLegacy(mem);
    return mem;
  }
  function persist(){
    if(!mem)return;
    safeSet(STORE_KEY,JSON.stringify(mem));
  }

  /* ---------------- status ---------------- */
  function setStatus(s){
    status=s;
    for(var i=0;i<statusCbs.length;i++){
      try{statusCbs[i](s);}catch(e){}
    }
  }
  function getStatus(){return status;}
  function onStatus(cb){if(typeof cb==="function"){statusCbs.push(cb);cb(status);}}

  /* ---------------- config (token stays on device, never exported) -------- */
  function cloneDefaults(){
    return {owner:DEFAULT_CONFIG.owner,repo:DEFAULT_CONFIG.repo,
      branch:DEFAULT_CONFIG.branch,basePath:DEFAULT_CONFIG.basePath};
  }
  function normalizeConfig(cfg){
    var out=cloneDefaults(), k;
    cfg=cfg||{};
    for(k in out){if(cfg[k])out[k]=String(cfg[k]).trim();}
    if(cfg.token)out.token=String(cfg.token).trim();
    out.enabled=!!(cfg.enabled&&out.owner&&out.repo&&out.branch&&out.token);
    return out;
  }
  function getConfig(){
    var raw=safeGet(CONFIG_KEY,"");
    if(!raw)return cloneDefaults();
    try{return normalizeConfig(JSON.parse(raw));}catch(e){return cloneDefaults();}
  }
  function saveConfig(cfg){
    var next=normalizeConfig(cfg);
    safeSet(CONFIG_KEY,JSON.stringify(next));
    setStatus(next.enabled?"synced":"local");
    return next;
  }
  function clearConfig(){safeRemove(CONFIG_KEY);setStatus("local");}

  /* ---------------- GitHub Contents API ---------------- */
  function escPathPart(s){return String(s).replace(/[^a-zA-Z0-9_.-]/g,"_");}
  function basePath(cfg){return (cfg.basePath||DEFAULT_CONFIG.basePath).replace(/^\/+|\/+$/g,"");}
  function registryPath(cfg){return basePath(cfg)+"/registry.json";}
  function savePath(cfg){return basePath(cfg)+"/save.json";}
  function dataPath(cfg,ns,key){
    return basePath(cfg)+"/data/"+escPathPart(ns)+"/"+escPathPart(key)+".json";
  }
  function stringToBase64(s){
    var bytes=new TextEncoder().encode(s), bin="", i, step=0x8000;
    for(i=0;i<bytes.length;i+=step){bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+step));}
    return btoa(bin);
  }
  function base64ToString(s){
    var bin=atob(String(s||"").replace(/\n/g,"")), bytes=new Uint8Array(bin.length), i;
    for(i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function githubUrl(cfg,path){
    return "https://api.github.com/repos/"+encodeURIComponent(cfg.owner)+"/"+
      encodeURIComponent(cfg.repo)+"/contents/"+path.split("/").map(encodeURIComponent).join("/");
  }
  function blobUrl(cfg,sha){
    return "https://api.github.com/repos/"+encodeURIComponent(cfg.owner)+"/"+
      encodeURIComponent(cfg.repo)+"/git/blobs/"+encodeURIComponent(sha);
  }
  function authHeaders(cfg){
    return {"Accept":"application/vnd.github+json","Authorization":"Bearer "+cfg.token,
      "X-GitHub-Api-Version":"2022-11-28"};
  }
  async function githubGet(cfg,path){
    /* ブランチは指定せず repo の既定ブランチを使う（main/master の不一致や空repoに強い）。
       404=ファイル未作成、409=空repo はどちらも「無し」として扱う。 */
    var res=await fetch(githubUrl(cfg,path),{method:"GET",headers:authHeaders(cfg)});
    if(res.status===404||res.status===409)return null;
    if(!res.ok)throw new Error("GitHub GET failed: "+res.status);
    var j=await res.json();
    /* Contents API は 1MB 超のファイルで content を空("encoding":"none")にして返す。
       そのままだと pull/push 前マージで本体を読めず同期が無言で失敗する。
       Blobs API(最大100MB)から base64 本体を取り直してから返す。 */
    if(j&&!Array.isArray(j)&&j.sha&&(j.encoding==="none"||((j.content==null||j.content==="")&&(j.size||0)>0))){
      var br=await fetch(blobUrl(cfg,j.sha),{method:"GET",headers:authHeaders(cfg)});
      if(br.ok){ var bj=await br.json(); if(bj&&bj.content){ j.content=bj.content; j.encoding=bj.encoding||"base64"; } }
    }
    return j;
  }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  async function detailOf(res){ try{ return (await res.clone().json()).message||""; }catch(_){ return ""; } }
  /* すべての書き込みを直列化（同時PUTでブランチ参照が衝突して 409 になるのを防ぐ） */
  var putChain=Promise.resolve();

  /* ---------------- cloud push (single snapshot file) ----------------
     全データを1ファイル q4b/save.json に丸ごと保存する。多数の小ファイルを
     個別PUTしていた旧方式は同時書き込みのSHA競合(409)で不安定だったため、
     「GET 1回 + PUT 1回」に集約し、衝突時はリモートを取り直してマージ→再PUTする。 */
  function snapshotDoc(store){
    return JSON.stringify({schema:SCHEMA,kind:"snapshot",savedAt:stamp(),v:2,
      profiles:store.profiles,current:store.current,kv:store.kv,
      tombstones:store.tombstones||{}},null,2);
  }
  /* remote(あれば) を local にマージ: profiles=LWW+tombstone, kv=updatedが新しい方を優先。 */
  function mergeStore(store,remote){
    if(!remote)return;
    mergeRegistry(store,remote); // tombstones/profiles をマージ
    var rk=remote.kv||{},k,inc,ex;
    for(k in rk){ inc=rk[k]; if(!inc||typeof inc!=="object")continue;
      ex=store.kv[k]; if(!ex||(inc.updated||0)>=(ex.updated||0))store.kv[k]=inc; }
    // 削除済みプロフィールの kv を掃除（リモートから再流入した分も含む）
    var alive={}; store.profiles.forEach(function(pp){alive[pp.id]=1;});
    for(k in store.kv){ var pid=k.split(SEP)[1]; if(store.tombstones&&store.tombstones[pid]&&!alive[pid])delete store.kv[k]; }
  }
  /* 1ファイルを丸ごとPUT。毎回リモートを取り直してマージし、sha付きで上書き。
     409/422(sha競合)はマージし直して数回リトライ。複数端末でも進捗を壊さない。 */
  async function pushSnapshotRaw(cfg){
    var attempt,remote,store,body,res,why="";
    for(attempt=0;attempt<6;attempt++){
      remote=await githubGet(cfg,savePath(cfg));
      store=loadStore();
      if(remote&&remote.content){ try{ mergeStore(store,JSON.parse(base64ToString(remote.content))); }catch(_){ } }
      persist();
      body={message:"save "+stamp(),content:stringToBase64(snapshotDoc(store))};
      if(remote&&remote.sha)body.sha=remote.sha;
      res=await fetch(githubUrl(cfg,savePath(cfg)),{method:"PUT",
        headers:Object.assign({"Content-Type":"application/json"},authHeaders(cfg)),
        body:JSON.stringify(body)});
      if(res.ok)return res.json();
      why=await detailOf(res);
      if(res.status===409||res.status===422){ await sleep(250*(attempt+1)); continue; }
      throw new Error("GitHub PUT "+res.status+"："+(why||savePath(cfg)));
    }
    throw new Error("GitHub PUT 409（"+(why||"競合が解消せず")+"）");
  }
  /* すべての書き込みを直列化（同時PUTでブランチ参照が衝突するのを防ぐ） */
  function pushSnapshot(cfg){
    var run=putChain.then(function(){ return pushSnapshotRaw(cfg); });
    putChain=run.catch(function(){});
    return run;
  }
  var snapTimer=null;
  function schedulePush(){
    if(!getConfig().enabled)return;
    if(snapTimer)clearTimeout(snapTimer);
    snapTimer=setTimeout(function(){ pushAll().catch(function(){}); },1500);
  }
  /* 旧API名の互換: いずれも単一スナップショットpushに集約 */
  function schedulePushRegistry(){schedulePush();}
  function schedulePushOne(){schedulePush();}

  /* ---------------- namespaced KV API (Promise) ---------------- */
  function save(ns,key,data){
    var store=loadStore();
    store.kv[ns+SEP+key]={v:1,updated:now(),data:data};
    persist();
    schedulePushOne(ns,key);
    return Promise.resolve(true);
  }
  function load(ns,key){
    var store=loadStore(), entry=store.kv[ns+SEP+key];
    return Promise.resolve(entry?entry.data:null);
  }
  function flush(){
    var cfg=getConfig();
    if(!cfg.enabled)return Promise.resolve(false);
    return pushAll().then(function(){return true;}).catch(function(){return false;});
  }
  /* 起動時の自動取り込み: 同期ONなら remote を pull してローカルにマージする。
     push は自動(debounce)だが pull は従来「取り込み」ボタン頼みだったため、他端末・他アカウントの
     更新が降りてこなかった。各ページの boot からこれを呼ぶことで双方向の自動同期にする。
     未設定・通信失敗はローカル続行（pull は古い内容で上書きしない安全マージなので副作用なし）。 */
  function syncDown(){
    if(!getConfig().enabled)return Promise.resolve(0);
    return pullAll().catch(function(){return 0;});
  }

  /* ---------------- profile registry (shared across games) ---------------- */
  function profiles(){return Promise.resolve(loadStore().profiles.slice());}
  function saveProfiles(list){
    var store=loadStore();
    store.profiles=Array.isArray(list)?list:[];
    persist();
    schedulePushRegistry();
    return Promise.resolve(true);
  }
  function currentProfile(){return loadStore().current;}
  function setCurrentProfile(id){
    var store=loadStore();
    store.current=id;
    persist();
    schedulePushRegistry();
  }
  function addProfile(name,icon){
    var store=loadStore();
    var p={id:"p"+now().toString(36)+Math.floor(Math.random()*999),
      name:String(name||"なまえ"),icon:icon||"🪲",created:now(),updated:now()};
    store.profiles.push(p);
    store.current=p.id;
    persist();
    schedulePushRegistry();
    return p;
  }
  /* name/icon の編集。updated を進めて端末間 last-write-wins を効かせる。 */
  function updateProfile(id,fields){
    var store=loadStore(), i, p;
    fields=fields||{};
    for(i=0;i<store.profiles.length;i++){
      if(store.profiles[i].id===id){
        p=store.profiles[i];
        if(fields.name!=null)p.name=String(fields.name);
        if(fields.icon!=null)p.icon=fields.icon;
        /* 年齢ベース解禁モデル: 生まれ年月("YYYY-MM")と最後に祝った年齢を保持（全ゲーム共通の真実源） */
        if(fields.birth!=null)p.birth=String(fields.birth);
        if(fields.lastBdayAge!=null)p.lastBdayAge=fields.lastBdayAge;
        p.updated=now();
        persist();
        schedulePushRegistry();
        return p;
      }
    }
    return null;
  }
  function deleteProfile(id){
    var store=loadStore();
    if(!store.tombstones)store.tombstones={};
    store.tombstones[id]=now();                 // 墓標: 削除を全端末へ伝播
    store.profiles=store.profiles.filter(function(p){return p.id!==id;});
    if(store.current===id)store.current=store.profiles.length?store.profiles[0].id:null;
    for(var k in store.kv){if(k.split(SEP)[1]===id)delete store.kv[k];}
    persist();
    schedulePushRegistry();
  }

  /* ---------------- shared 琥珀(amber) wallet（プロフィール単位・全ゲーム共通） ----
     どのゲームで稼いでも・使っても同じ財布。kv に wallet/<pid> として保存し同期する。 */
  function amberKey(pid){ return "wallet"+SEP+pid; }
  function amberOf(pid){ var e=loadStore().kv[amberKey(pid)]; return (e&&e.data&&typeof e.data.amber==="number")?e.data.amber:0; }
  function amberSet(pid,val){ var store=loadStore(); store.kv[amberKey(pid)]={v:1,updated:now(),data:{amber:Math.max(0,Math.floor(val)||0)}}; persist(); schedulePush(); }
  function amberAdd(pid,n){ var v=amberOf(pid)+(n||0); amberSet(pid,v); return v; }
  function amberSpend(pid,n){ var v=amberOf(pid); if(v<n)return false; amberSet(pid,v-n); return true; }

  /* ---------------- shared ごしんぼく rewards（プロフィール単位） ----------
     かせきのかけら: 各教科で 1日50問正解した瞬間に +1（各教科1日1個まで）。
     めざめのしずく: 3教科すべてでかけらを見つけた日が3日たまると +1。 */
  var REWARD_SUBJECTS=["keisan","kanji","eitango"];
  function todayKey(){
    var d=new Date();
    return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  }
  function rewardKey(pid){ return "goshin"+SEP+pid; }
  function blankRewardDay(date){
    var subjects={}, i;
    for(i=0;i<REWARD_SUBJECTS.length;i++)subjects[REWARD_SUBJECTS[i]]={correct:0,fragment:false};
    return {date:date,subjects:subjects,dewDay:false};
  }
  function normalizeRewardLogDay(day){
    var i, s;
    day=day&&typeof day==="object"?day:{};
    if(!day.correct||typeof day.correct!=="object")day.correct={};
    if(!day.subjects||typeof day.subjects!=="object")day.subjects={};
    for(i=0;i<REWARD_SUBJECTS.length;i++){
      s=REWARD_SUBJECTS[i];
      day.correct[s]=Math.max(0,Math.floor(day.correct[s])||0);
      day.subjects[s]=!!day.subjects[s];
    }
    day.dewDay=!!day.dewDay;
    day.drop=!!day.drop;
    return day;
  }
  function blankEquipmentData(){
    return {owned:{},equipped:{},equippedBy:{}};
  }
  function normalizeEquipmentData(eq){
    var out=blankEquipmentData(), k, v, sid, slots, slot;
    eq=eq&&typeof eq==="object"?eq:{};
    if(eq.owned&&typeof eq.owned==="object"){
      for(k in eq.owned){
        v=eq.owned[k];
        if(v&&typeof v==="object")out.owned[k]={id:String(v.id||k),obtainedAt:String(v.obtainedAt||"")};
        else if(v)out.owned[k]={id:String(k),obtainedAt:""};
      }
    }
    if(eq.equipped&&typeof eq.equipped==="object"){
      for(sid in eq.equipped){
        slots=eq.equipped[sid];
        if(!slots||typeof slots!=="object")continue;
        out.equipped[sid]={};
        for(slot in slots)if(slots[slot]&&out.owned[slots[slot]])out.equipped[sid][slot]=slots[slot];
      }
    }
    if(eq.equippedBy&&typeof eq.equippedBy==="object"){
      for(k in eq.equippedBy)if(out.owned[k]&&eq.equippedBy[k])out.equippedBy[k]=String(eq.equippedBy[k]);
    }else{
      for(sid in out.equipped){
        slots=out.equipped[sid];
        for(slot in slots)if(slots[slot])out.equippedBy[slots[slot]]=sid;
      }
    }
    return out;
  }
  function normalizeRewardData(data,date){
    var i, s, logDay, d;
    data=data&&typeof data==="object"?data:{};
    data.v=1;
    data.fossilFragments=Math.max(0,Math.floor(data.fossilFragments)||0);
    data.awakeningDrops=Math.max(0,Math.floor(data.awakeningDrops)||0);
    data.dewProgress=Math.max(0,Math.min(2,Math.floor(data.dewProgress)||0));
    if(!data.log||typeof data.log!=="object")data.log={};
    date=date||todayKey();
    logDay=normalizeRewardLogDay(data.log[date]);
    data.log[date]=logDay;
    d=blankRewardDay(date);
    for(i=0;i<REWARD_SUBJECTS.length;i++){
      s=REWARD_SUBJECTS[i];
      d.subjects[s].correct=logDay.correct[s];
      d.subjects[s].fragment=logDay.subjects[s];
    }
    d.dewDay=logDay.dewDay;
    data.daily=d;
    data.equipment=normalizeEquipmentData(data.equipment);
    return data;
  }
  function rewardEntry(pid){
    var store=loadStore(), key=rewardKey(pid), entry=store.kv[key];
    if(!entry||!entry.data){
      entry={v:1,updated:now(),data:normalizeRewardData({},todayKey())};
      store.kv[key]=entry;
    }else{
      entry.data=normalizeRewardData(entry.data,todayKey());
    }
    return {store:store,key:key,entry:entry};
  }
  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function goshinOf(pid){
    if(!pid)return normalizeRewardData({},todayKey());
    var r=rewardEntry(pid);
    return clone(r.entry.data);
  }
  function recordCorrect(pid,subject,n){
    var i, okSub=false, date=todayKey(), r, data, logDay, dsub, awards={fragment:false,dewDay:false,drop:false};
    if(!pid)return {ok:false,error:"missing profile"};
    for(i=0;i<REWARD_SUBJECTS.length;i++)if(REWARD_SUBJECTS[i]===subject)okSub=true;
    if(!okSub)return {ok:false,error:"unknown subject"};
    n=Math.max(1,Math.floor(n)||1);
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,date);
    logDay=normalizeRewardLogDay(data.log[date]);
    data.log[date]=logDay;
    logDay.correct[subject]+=n;
    dsub=data.daily.subjects[subject];
    dsub.correct=logDay.correct[subject];
    if(logDay.correct[subject]>=50&&!logDay.subjects[subject]){
      logDay.subjects[subject]=true;
      dsub.fragment=true;
      data.fossilFragments++;
      awards.fragment=true;
    }
    var all=true;
    for(i=0;i<REWARD_SUBJECTS.length;i++)if(!logDay.subjects[REWARD_SUBJECTS[i]])all=false;
    if(all&&!logDay.dewDay){
      logDay.dewDay=true;
      data.daily.dewDay=true;
      data.dewProgress++;
      awards.dewDay=true;
      if(data.dewProgress>=3){
        data.awakeningDrops++;
        data.dewProgress=0;
        logDay.drop=true;
        awards.drop=true;
      }
    }
    data=normalizeRewardData(data,date);
    r.entry.updated=now();
    r.entry.data=data;
    persist();
    schedulePush();
    return {ok:true,subject:subject,awards:awards,state:clone(data)};
  }
  function equipmentOf(pid){
    if(!pid)return blankEquipmentData();
    var r=rewardEntry(pid);
    r.entry.data=normalizeRewardData(r.entry.data,todayKey());
    return clone(r.entry.data.equipment);
  }
  function itemDef(itemId){
    return global.Q4BEquipment&&global.Q4BEquipment.byId?global.Q4BEquipment.byId[itemId]:null;
  }
  function restoreEquipment(pid,itemId){
    var r, data, item, eq;
    if(!pid)return {ok:false,error:"missing profile"};
    item=itemDef(itemId);
    if(!item)return {ok:false,error:"unknown equipment"};
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,todayKey());
    eq=data.equipment;
    if(eq.owned[item.id])return {ok:false,error:"already owned"};
    /* 動的価格: これが何個目の復元か（所持数+1）で決まる。順不同で公平に */
    var ownedCount=Object.keys(eq.owned||{}).length;
    var price=(global.Q4BEquipment&&global.Q4BEquipment.priceAt)
      ? global.Q4BEquipment.priceAt(ownedCount)
      : {fossil:item.fossilCost||0,dew:item.dewCost||0};
    if(data.fossilFragments<price.fossil)return {ok:false,error:"not enough fossil fragments"};
    if(data.awakeningDrops<price.dew)return {ok:false,error:"not enough awakening drops"};
    data.fossilFragments-=price.fossil;
    data.awakeningDrops-=price.dew;
    eq.owned[item.id]={id:item.id,obtainedAt:stamp()};
    r.entry.updated=now();
    r.entry.data=normalizeRewardData(data,todayKey());
    persist();
    schedulePush();
    return {ok:true,itemId:item.id,state:clone(r.entry.data)};
  }
  function spendAwakeningDrops(pid,n){
    var r, data;
    if(!pid)return {ok:false,error:"missing profile"};
    n=Math.max(1,Math.floor(n)||1);
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,todayKey());
    if(data.awakeningDrops<n)return {ok:false,error:"not enough awakening drops"};
    data.awakeningDrops-=n;
    r.entry.updated=now();
    r.entry.data=normalizeRewardData(data,todayKey());
    persist();
    schedulePush();
    return {ok:true,state:clone(r.entry.data)};
  }
  function canUseHpEquipment(rarity){
    return String(rarity||"").toUpperCase()!=="SS";
  }
  function equipItem(pid,itemId,speciesId,rarity){
    var r, data, item, eq, oldSpecies, oldItem;
    if(!pid||!speciesId)return {ok:false,error:"missing target"};
    item=itemDef(itemId);
    if(!item)return {ok:false,error:"unknown equipment"};
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,todayKey());
    eq=data.equipment;
    if(!eq.owned[item.id])return {ok:false,error:"equipment is not owned"};
    if(item.slot==="hp"&&!canUseHpEquipment(rarity))return {ok:false,error:"hp equipment cannot be used by SS"};
    oldSpecies=eq.equippedBy[item.id];
    if(oldSpecies&&eq.equipped[oldSpecies])delete eq.equipped[oldSpecies][item.slot];
    if(!eq.equipped[speciesId])eq.equipped[speciesId]={};
    oldItem=eq.equipped[speciesId][item.slot];
    if(oldItem)delete eq.equippedBy[oldItem];
    eq.equipped[speciesId][item.slot]=item.id;
    eq.equippedBy[item.id]=speciesId;
    r.entry.updated=now();
    r.entry.data=normalizeRewardData(data,todayKey());
    persist();
    schedulePush();
    return {ok:true,itemId:item.id,speciesId:speciesId,state:clone(r.entry.data)};
  }
  function unequipItem(pid,itemId){
    var r, data, item, eq, sid;
    if(!pid)return {ok:false,error:"missing profile"};
    item=itemDef(itemId);
    if(!item)return {ok:false,error:"unknown equipment"};
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,todayKey());
    eq=data.equipment;
    sid=eq.equippedBy[item.id];
    if(sid&&eq.equipped[sid])delete eq.equipped[sid][item.slot];
    delete eq.equippedBy[item.id];
    r.entry.updated=now();
    r.entry.data=normalizeRewardData(data,todayKey());
    persist();
    schedulePush();
    return {ok:true,itemId:item.id,state:clone(r.entry.data)};
  }

  /* ---------------- connection helpers ---------------- */
  async function testConnection(){
    var cfg=getConfig();
    if(!cfg.enabled)throw new Error("Fieldnote is not configured.");
    await githubGet(cfg,basePath(cfg));
    return true;
  }
  async function autoConnect(){
    var cfg=getConfig();
    setStatus(cfg.enabled?"synced":"local");
    return cfg.enabled;
  }
  async function connectGitHub(opts){
    opts=opts||{};
    var cfg=saveConfig({
      owner:opts.owner||getConfig().owner,
      repo:opts.repo||getConfig().repo,
      branch:opts.branch||getConfig().branch||"main",
      basePath:opts.basePath||"q4b",
      token:opts.token,
      enabled:true
    });
    if(!cfg.enabled)throw new Error("owner / repo / token が必要です");
    await testConnection();
    setStatus("synced");
    // first connect: push everything we already have on this device
    pushAll().catch(function(){});
    return true;
  }
  function connectFirebase(){return Promise.reject(new Error("Firebase 同期は未対応です（GitHub方式を使ってください）"));}
  function firebaseSignIn(){return Promise.reject(new Error("Firebase 同期は未対応です（GitHub方式を使ってください）"));}
  function disconnect(){clearConfig();}

  /* ---------------- bulk sync ---------------- */
  async function pushAll(){
    var cfg=getConfig();
    if(!cfg.enabled)throw new Error("Fieldnote is not configured.");
    setStatus("syncing");
    try{
      await pushSnapshot(cfg);
      setStatus("synced");
      return [{ok:true}];
    }catch(e){setStatus("error");global.QuestSave.lastError=e.message;throw e;}
  }
  function profTs(p){ return (p&&(p.updated||p.created))||0; }
  /* profiles を tombstone + last-write-wins でマージ。
     - tombstones: id->削除時刻。削除がその後の編集より新しければ「削除」が勝つ
     - 生存プロフィールは updated/created が新しい方の name/icon を採用 */
  function mergeRegistry(store,remote){
    if(!store.tombstones)store.tombstones={};
    var rt=(remote&&remote.tombstones)||{}, tid;
    for(tid in rt){ if(!store.tombstones[tid]||rt[tid]>store.tombstones[tid])store.tombstones[tid]=rt[tid]; }
    var byId={}, i, p, ex, tomb;
    for(i=0;i<store.profiles.length;i++)byId[store.profiles[i].id]=store.profiles[i];
    var rp=(remote&&remote.profiles)||[];
    for(i=0;i<rp.length;i++){ p=rp[i]; if(!p||!p.id)continue;
      tomb=store.tombstones[p.id];
      if(tomb&&tomb>=profTs(p))continue;             // この編集より後に削除された → 採用しない
      ex=byId[p.id];
      if(!ex){ store.profiles.push(p); byId[p.id]=p; }
      else if(profTs(p)>profTs(ex)){
        Object.keys(p).forEach(function(k){ ex[k]=p[k]; });
      }
    }
    // ローカルからも、編集より後に削除されたプロフィールを除去
    store.profiles=store.profiles.filter(function(pp){
      var t=store.tombstones[pp.id]; return !(t&&t>=profTs(pp));
    });
    var alive={}; store.profiles.forEach(function(pp){alive[pp.id]=1;});
    if((!store.current||!alive[store.current])&&remote&&remote.current&&alive[remote.current])store.current=remote.current;
    if((!store.current||!alive[store.current]))store.current=store.profiles.length?store.profiles[0].id:null;
  }
  /* 旧方式(registry.json + data/<ns>/<key>.json)の読み出し（移行用フォールバック）。 */
  async function pullLegacy(cfg,store){
    var n=0;
    var reg=await githubGet(cfg,registryPath(cfg));
    if(reg&&reg.content){
      var rdoc=JSON.parse(base64ToString(reg.content));
      mergeRegistry(store,rdoc);n++;
    }
    var dir=await githubGet(cfg,basePath(cfg)+"/data");
    var nsList=Array.isArray(dir)?dir:[];
    for(var i=0;i<nsList.length;i++){
      if(nsList[i].type!=="dir")continue;
      var files=await githubGet(cfg,nsList[i].path);
      files=Array.isArray(files)?files:[];
      for(var j=0;j<files.length;j++){
        var f=files[j];
        if(!f||f.type!=="file"||!/\.json$/.test(f.name))continue;
        var raw=await githubGet(cfg,f.path);
        if(!raw||!raw.content)continue;
        var doc=JSON.parse(base64ToString(raw.content));
        if(doc&&doc.ns&&doc.key){
          var ex=store.kv[doc.ns+SEP+doc.key];
          if(!ex||(doc.updated||0)>=(ex.updated||0)){
            store.kv[doc.ns+SEP+doc.key]={v:1,updated:doc.updated||now(),data:doc.data};
            n++;
          }
        }
      }
    }
    return n;
  }
  async function pullAll(){
    var cfg=getConfig();
    if(!cfg.enabled)throw new Error("Fieldnote is not configured.");
    setStatus("syncing");
    try{
      var store=loadStore(), n=0;
      var snap=await githubGet(cfg,savePath(cfg));
      if(snap&&snap.content){
        try{ mergeStore(store,JSON.parse(base64ToString(snap.content))); n++; }catch(_){ }
      }else{
        n+=await pullLegacy(cfg,store);  // 旧フォーマットからの移行
      }
      persist();
      setStatus("synced");
      return n;
    }catch(e){setStatus("error");throw e;}
  }

  /* ---------------- export / import (string, token excluded) ------------- */
  function exportAll(){
    var store=loadStore();
    return JSON.stringify({schema:SCHEMA,exportedAt:new Date().toISOString(),
      profiles:store.profiles,current:store.current,kv:store.kv,
      tombstones:store.tombstones||{}});
  }
  function importAll(input){
    var obj=input;
    if(typeof input==="string"){try{obj=JSON.parse(input);}catch(e){return Promise.reject(new Error("JSON を読めませんでした"));}}
    if(!obj||typeof obj!=="object")return Promise.reject(new Error("バックアップ形式が不正です"));
    var store=loadStore(), n=0, k;
    if(Array.isArray(obj.profiles))mergeRegistry(store,obj);
    if(obj.kv&&typeof obj.kv==="object"){
      for(k in obj.kv){
        var inc=obj.kv[k];
        if(!inc||typeof inc!=="object")continue;
        var ex=store.kv[k];
        if(!ex||(inc.updated||0)>=(ex.updated||0)){store.kv[k]=inc;n++;}
      }
    }else{
      // legacy flat backup: {"q4b_keisan_v1":"...json string..."}
      for(k in obj){
        if(k.indexOf("q4b_")!==0||typeof obj[k]!=="string")continue;
        var gid=k.replace(/^q4b_/,"").replace(/_v[0-9]+$/,"");
        var val=null; try{val=JSON.parse(obj[k]);}catch(e){val=obj[k];}
        store.kv[gid+SEP+"_legacy"]={v:1,updated:now(),data:val};n++;
      }
    }
    persist();
    if(getConfig().enabled)pushAll().catch(function(){});
    return Promise.resolve(n);
  }

  /* ---------------- legacy compat (loadKey/saveKey) ---------------- */
  function gameIdFromKey(key){
    return String(key||"").replace(/^q4b_/,"").replace(/_v[0-9]+$/,"")||"unknown";
  }
  function loadKey(key,fallback){
    var store=loadStore(), entry=store.kv[gameIdFromKey(key)+SEP+"_legacy"];
    if(!entry)return fallback;
    return typeof entry.data==="string"?entry.data:JSON.stringify(entry.data);
  }
  function saveKey(key,value){
    var gid=gameIdFromKey(key), parsed=null;
    try{parsed=JSON.parse(value);}catch(e){parsed=value;}
    return save(gid,"_legacy",parsed);
  }

  /* ---------------- save-status badge (always visible, no action needed) ----
     子どもは保存操作不要。左下に「ほぞんずみ」を常時表示し、自動保存が効いて
     いることを見える化する。storage.js を読む全ページに自動で出る。 */
  function mountSaveBadge(){
    var doc=global.document;
    if(!doc||!doc.body)return;
    if(doc.getElementById("q4b-savebadge"))return;
    var el=doc.createElement("div");
    el.id="q4b-savebadge";
    el.style.cssText="position:fixed;left:8px;bottom:8px;z-index:9999;"
      +"font:700 12px/1.4 'Hiragino Maru Gothic ProN',system-ui,sans-serif;"
      +"padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.92);"
      +"border:1.5px solid #CFDDB2;color:#2A3D2C;box-shadow:0 2px 6px rgba(0,0,0,.12);"
      +"pointer-events:none;transition:opacity .3s;opacity:.92;user-select:none;-webkit-user-select:none";
    el.title="あそんだ記録は自動で保存されます（保存ボタンは不要）";
    function paint(s){
      var t,bg,bd,c,pe="none";
      if(s==="syncing"){ t="☁️ ほぞん中…"; bg="#FFF6E5"; bd="#F2C879"; c="#9A6A12"; }
      else if(s==="synced"){ t="☁️ ほぞんずみ"; bg="#EAF6E0"; bd="#9FCB7E"; c="#2C5F2D"; }
      else if(s==="error"){ t="⚠️ ほぞんを たしかめてね"; bg="#FCEBEA"; bd="#E7A39C"; c="#B23B2E"; pe="auto"; }
      else { t="💾 ほぞんOK"; bg="rgba(255,255,255,.92)"; bd="#CFDDB2"; c="#2A3D2C"; } // local-only
      el.textContent=t; el.style.background=bg; el.style.borderColor=bd; el.style.color=c; el.style.pointerEvents=pe;
    }
    el.onclick=function(){ if(getStatus()==="error") pushAll().catch(function(){}); };
    doc.body.appendChild(el);
    onStatus(paint); // onStatus は購読時に現在値で即時paintする
  }

  /* ---------------- init ---------------- */
  loadStore();
  setStatus(getConfig().enabled?"synced":"local");

  global.QuestSave={
    // namespaced KV
    load:load, save:save, flush:flush,
    // profiles
    profiles:profiles, saveProfiles:saveProfiles,
    currentProfile:currentProfile, setCurrentProfile:setCurrentProfile,
    addProfile:addProfile, updateProfile:updateProfile, deleteProfile:deleteProfile,
    amberOf:amberOf, amberAdd:amberAdd, amberSpend:amberSpend,
    goshinOf:goshinOf, recordCorrect:recordCorrect,
    equipmentOf:equipmentOf, restoreEquipment:restoreEquipment, equipItem:equipItem, unequipItem:unequipItem,
    spendAwakeningDrops:spendAwakeningDrops,
    // status / connection
    getStatus:getStatus, onStatus:onStatus, autoConnect:autoConnect,
    connectGitHub:connectGitHub, connectFirebase:connectFirebase,
    firebaseSignIn:firebaseSignIn, disconnect:disconnect,
    // config
    getConfig:getConfig, saveConfig:saveConfig, clearConfig:clearConfig, testConnection:testConnection,
    // bulk sync / backup
    pushAll:pushAll, pullAll:pullAll, syncDown:syncDown, exportAll:exportAll, importAll:importAll,
    // legacy compat
    loadKey:loadKey, saveKey:saveKey,
    // ui
    mountSaveBadge:mountSaveBadge,
    defaults:cloneDefaults(),
    lastError:null
  };

  if(global.addEventListener){
    global.addEventListener("visibilitychange",function(){
      if(global.document&&global.document.hidden)flush();
    });
    /* オフライン(機内)→オンライン復帰の瞬間に自動 push。
       復帰時はまず remote を取り込み(pull)他端末分とマージしてから自分の変更を送る。 */
    global.addEventListener("online",function(){
      if(!getConfig().enabled)return;
      pullAll().catch(function(){}).then(function(){ return flush(); }).catch(function(){});
    });
  }
  // 全ページに「ほぞんずみ」表示を自動マウント（保存の見える化）
  if(global.document){
    if(global.document.body)mountSaveBadge();
    else if(global.addEventListener)global.addEventListener("DOMContentLoaded",mountSaveBadge);
  }

  /* ---- PWA: Service Worker 登録＋manifest/iOSメタ注入（全ページ共通・オフライン対応） ----
     storage.js の src から app root を推定し、root の sw.js を登録（root/サブパス両対応）。
     これで機内などオフラインでも起動・プレイ可能になる（進捗は localStorage、復帰時に自動push）。 */
  if(global.document && global.navigator){
    var _base="./";
    try{ var _scr=document.querySelector('script[src*="shared/storage.js"]'); if(_scr&&_scr.src)_base=_scr.src.replace(/shared\/storage\.js.*$/,""); }catch(_e){}
    try{
      if(!document.querySelector('link[rel="manifest"]')){
        var _l=document.createElement("link"); _l.rel="manifest"; _l.href=_base+"manifest.webmanifest";
        (document.head||document.documentElement).appendChild(_l);
      }
      [["apple-mobile-web-app-capable","yes"],["mobile-web-app-capable","yes"],["apple-mobile-web-app-status-bar-style","default"]].forEach(function(m){
        if(!document.querySelector('meta[name="'+m[0]+'"]')){ var e=document.createElement("meta"); e.name=m[0]; e.content=m[1]; (document.head||document.documentElement).appendChild(e); }
      });
    }catch(_e2){}
    if("serviceWorker" in global.navigator && global.addEventListener){
      /* 新しいSWが制御を奪ったら1回だけ自動リロード＝デプロイ更新が確実に反映される（古いキャッシュ居座り対策） */
      var _refreshing=false;
      global.navigator.serviceWorker.addEventListener("controllerchange",function(){
        if(_refreshing)return; _refreshing=true; global.location.reload();
      });
      global.addEventListener("load",function(){
        global.navigator.serviceWorker.register(_base+"sw.js").then(function(reg){ try{reg.update();}catch(_){} }).catch(function(){});
      });
    }
  }
})(window);
