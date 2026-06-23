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
  /* PA-1: status を拡張 (local/dirty/syncing/synced/offline/auth-error/conflict/error)。
     旧 3 状態では「ローカル保存はできているが クラウドへ未送信」 を表現できず、
     画面は「ほぞんずみ」 と表示しながら実際は未同期、 という偽 synced が起きていた。 */
  var status="local";
  var statusCbs=[];
  /* PA-1: 最終クラウド同期成功時刻 / 失敗詳細を永続管理 (LAST_SYNC_KEY) */
  var LAST_SYNC_KEY = "q4b_last_sync_v1";
  function _readLastSync(){
    try{ var raw=safeGet(LAST_SYNC_KEY,null); if(!raw) return {}; return JSON.parse(raw)||{}; }catch(_){ return {}; }
  }
  function _writeLastSync(info){
    try{ safeSet(LAST_SYNC_KEY, JSON.stringify(info||{})); }catch(_){}
  }
  function getSyncMeta(){
    var m = _readLastSync();
    return {
      status: status,
      lastSuccessAt: m.lastSuccessAt || 0,
      lastErrorAt: m.lastErrorAt || 0,
      lastErrorKind: m.lastErrorKind || null,
      lastErrorMessage: m.lastErrorMessage || null,
      patExpiresAt: m.patExpiresAt || null
    };
  }
  function _markSyncSuccess(){
    var m=_readLastSync(); m.lastSuccessAt = now();
    m.lastErrorKind = null; m.lastErrorMessage = null;
    _writeLastSync(m);
  }
  function _markSyncError(kind, message){
    var m=_readLastSync(); m.lastErrorAt = now();
    m.lastErrorKind = kind; m.lastErrorMessage = message || "";
    _writeLastSync(m);
  }
  function _classifyError(e){
    var msg = (e && e.message) || String(e||"");
    if(/\b401\b/.test(msg)) return "auth-error";
    if(/\b403\b/.test(msg)) return "auth-error";
    if(/\b409\b/.test(msg) || /\b422\b/.test(msg)) return "conflict";
    if(/NetworkError|Failed to fetch|offline/i.test(msg)) return "offline";
    return "error";
  }
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
  /* localStorage への永続化。 setItem 失敗 (quota / privatemode 等) を黙殺すると
     画面上は正常でも、 リロード後にすべて消える状態が起きる。 ok を返し、 連続失敗時
     には degraded フラグを立てて上位 UI から警告できるようにする (新追加#1)。 */
  var __saveDegraded = false;
  function persist(){
    if(!mem) return true;
    var ok = safeSet(STORE_KEY, JSON.stringify(mem));
    if(!ok){
      __saveDegraded = true;
      try{ if(typeof console!=="undefined") console.warn("[Q4BStorage] localStorage.setItem failed — data may be lost on reload."); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("q4b-storage-degraded")); }catch(_){}
    } else if(__saveDegraded){
      __saveDegraded = false;
      try{ window.dispatchEvent(new CustomEvent("q4b-storage-recovered")); }catch(_){}
    }
    /* PA-1/T4: ローカル書き込みごとに localGeneration を進める。 同期 ON でなければ
       status は "local"、 ON なら未送信を示す "dirty" にする (UI で「☁️ 未保存」
       バッジを出すため)。 */
    _bumpLocalGen();
    if(getConfig().enabled && status !== "syncing") setStatus("dirty");
    return ok;
  }
  function isDegraded(){ return __saveDegraded; }
  /* PA-3: Storage API による永続化要求。 ホーム画面 Web App では granted になり
     やすく、 evict 対象から外れる。 */
  function requestPersistent(){
    if(!global.navigator || !global.navigator.storage || !global.navigator.storage.persist){
      return Promise.resolve({supported:false, persistent:false});
    }
    return global.navigator.storage.persisted().then(function(already){
      if(already) return {supported:true, persistent:true, alreadyPersistent:true};
      return global.navigator.storage.persist().then(function(granted){
        return {supported:true, persistent:!!granted};
      });
    });
  }
  function storageEstimate(){
    if(!global.navigator || !global.navigator.storage || !global.navigator.storage.estimate){
      return Promise.resolve({supported:false});
    }
    return global.navigator.storage.estimate().then(function(e){
      return {supported:true, usage:e.usage||0, quota:e.quota||0};
    });
  }
  /* S5: 保存失敗中に報酬演出を出す直前で 1 回だけ警告する。 「無自覚で消える」 を
     「気付けて行動できる」 に変えるための最小ガード。 sessionStorage で短期抑止。 */
  function warnIfDegraded(){
    if(!__saveDegraded) return false;
    try{
      var k = 'q4bDegradedWarned';
      if(sessionStorage.getItem(k)) return true;
      sessionStorage.setItem(k, '1');
    }catch(_){}
    try{
      alert('⚠ きろくが ほぞんできていません。\nブラウザを とじると 今もらえる ごほうびや 進みが きえます。\nおうちのひとを よんで バックアップ書き出しを してください。');
    }catch(_){}
    return true;
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
    /* PA-1: 設定保存だけでは「同期成功」 ではないので dirty に */
    setStatus(next.enabled ? "dirty" : "local");
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
  /* in-flight ガード: 進行中の push が終わるまで新しい push 要求は coalesce し、
     完了後に「最新の store」で 1 度だけ追加 push する。
     - 連続 _saveBs → schedulePush で API を叩く回数を最小化 (409 連鎖の根本対策)
     - putChain 方式 (直列キュー) は、N 回の save に対し N 回の GET+PUT が走るのが
       無駄だったので置き換え。完了時点の最新 store でまとめて 1 回だけ送る形に。 */
  var inFlightPush=null;
  var pendingPush=false;

  /* ---------------- cloud push (single snapshot file) ----------------
     全データを1ファイル q4b/save.json に丸ごと保存する。多数の小ファイルを
     個別PUTしていた旧方式は同時書き込みのSHA競合(409)で不安定だったため、
     「GET 1回 + PUT 1回」に集約し、衝突時はリモートを取り直してマージ→再PUTする。 */
  function snapshotDoc(store){
    return JSON.stringify({schema:SCHEMA,kind:"snapshot",savedAt:stamp(),v:2,
      profiles:store.profiles,current:store.current,kv:store.kv,
      tombstones:store.tombstones||{}},null,2);
  }
  /* remote(あれば) を local にマージ。 profiles=LWW+tombstone、 kv は CAS namespace
     では logical revision を優先、 それ以外は updated (時刻) で勝者決定。 */
  function mergeStore(store,remote){
    if(!remote)return;
    mergeRegistry(store,remote); // tombstones/profiles をマージ
    var rk=remote.kv||{},k,inc,ex;
    for(k in rk){
      inc=rk[k]; if(!inc||typeof inc!=="object")continue;
      ex=store.kv[k];
      if(!ex){ store.kv[k]=inc; continue; }
      /* PB-1: CAS namespace では logical revision を優先。 「remote が新しい revision」
         を持っていれば必ず取り込む。 同 revision は updated で タイブレーク。
         旧 namespace は従来通り updated だけで判定。
         PB-2: 同 revision で内容が違うのは「CAS 実装漏れ」 の兆候。 console.warn
         + diagnostic event を発火して見逃しを防ぐ。 */
      var ns = k.split(SEP)[0];
      if(isCASNamespace(ns) && (typeof inc.revision==='number') && (typeof ex.revision==='number')){
        if(inc.revision > ex.revision){ store.kv[k]=inc; continue; }
        if(inc.revision < ex.revision) continue;
        /* 同 revision: 内容比較で divergence チェック */
        try{
          var lJson = JSON.stringify(ex.data);
          var rJson = JSON.stringify(inc.data);
          if(lJson !== rJson){
            try{ if(typeof console!=="undefined") console.warn("[Q4BStorage] same_revision_divergence at "+k+" rev="+inc.revision+" (CAS implementation may be missed)"); }catch(_){}
            try{ window.dispatchEvent(new CustomEvent("q4b-same-revision-divergence", {detail:{ns:ns, key:k, revision:inc.revision}})); }catch(_){}
          }
        }catch(_){}
        if((inc.updated||0) > (ex.updated||0)) store.kv[k]=inc;
        continue;
      }
      /* 同 timestamp ではローカル優先 (R6/audit #23) */
      if((inc.updated||0) > (ex.updated||0)) store.kv[k]=inc;
    }
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
      /* PA-2: PAT 期限 header があれば保存 (CORS で見える場合のみ) */
      try{
        var exp = res.headers && res.headers.get && res.headers.get("github-authentication-token-expiration");
        if(exp){
          var m=_readLastSync(); m.patExpiresAt = exp; _writeLastSync(m);
        }
      }catch(_){}
      if(res.ok)return res.json();
      why=await detailOf(res);
      /* PA-2: 401/403 は再試行しても通らないので即失敗。 caller で auth-error 表示 */
      if(res.status===401) throw new Error("GitHub PUT 401："+(why||"トークンが無効か期限切れです"));
      if(res.status===403) throw new Error("GitHub PUT 403："+(why||"権限がありません"));
      if(res.status===409||res.status===422){ await sleep(250*(attempt+1)); continue; }
      throw new Error("GitHub PUT "+res.status+"："+(why||savePath(cfg)));
    }
    throw new Error("GitHub PUT 409（"+(why||"競合が解消せず")+"）");
  }
  /* T4: dirty generation 方式に変更。 旧 pendingPush は最初の push 完了で status を
     synced にし、 後追い push が pushAll を経由せず status 更新も await もされない
     ため、 最新分が未保存のまま「ほぞんずみ」 と表示される偽 synced があった。
     localGeneration と pushedGeneration を比較し、 一致するまで drain する。 */
  var localGeneration = 0;
  var pushedGeneration = 0;
  function _bumpLocalGen(){ localGeneration++; }
  function pushSnapshot(cfg){
    if(inFlightPush){
      pendingPush = true;            /* drain で拾うフラグ */
      return inFlightPush;
    }
    var startedAt = localGeneration;
    var run = pushSnapshotRaw(cfg).then(function(r){
      pushedGeneration = startedAt;
      return r;
    });
    inFlightPush = run;
    function _done(){
      inFlightPush = null;
      /* localGeneration が pushedGeneration より新しい / pendingPush フラグが立って
         いる間は drain を続ける。 後追い push も同じ pushAll 経由で発火させて
         status / lastSuccess を確実に更新する。 */
      if(localGeneration > pushedGeneration || pendingPush){
        pendingPush = false;
        setTimeout(function(){
          if(getConfig().enabled) pushAll().catch(function(){});
        }, 100);
      }
    }
    run.then(_done, _done);
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

  /* R6: caller の in-place 変更が内部 store にこっそり反映されると、 updated が
     古いまま localStorage / 同期に書かれ、 同期で消える経路が生まれていた。
     load/save の境界で deep clone する。 structuredClone がない環境 (古い IE 等)
     は JSON 経由 fallback。 */
  function deepClone(v){
    if(v == null) return v;
    if(typeof structuredClone === 'function'){
      try{ return structuredClone(v); }catch(_){}
    }
    try{ return JSON.parse(JSON.stringify(v)); }catch(_){ return v; }
  }

  /* ---------------- PB-1: CAS-protected namespaces & versioned API ----------------
     CAS の目的は「古い snapshot に基づく save が新しい snapshot を上書きする」 race
     の検出。 expectedRevision は caller が load 時点の revision を保持し、 save 時
     に明示渡しする。 一致しなければ書込み拒否 + 退避 + conflicted 状態に。 */
  var CAS_NAMESPACES = {kanji:1, keisan:1, eitango:1, breeding:1, battle:1, wallet:1};
  var __conflicted = {};       /* {ns+SEP+key: {expectedRevision, actualRevision}} */
  var CONFLICT_BACKUP_PREFIX = "q4b_conflict_backup_";
  var CONFLICT_BACKUP_MAX_PER_PROFILE = 10;
  var CONFLICT_BACKUP_MAX_TOTAL = 30;
  var CONFLICT_BACKUP_TTL_MS = 30 * 86400000;   /* 30 日 */
  var __deviceId = (function(){
    try{
      var k="q4b_device_id_v1", v=safeGet(k,null);
      if(v) return v;
      v = "d"+Math.random().toString(36).slice(2,10)+"-"+Date.now().toString(36);
      safeSet(k, v);
      return v;
    }catch(_){ return "d-unknown"; }
  })();
  function isCASNamespace(ns){ return !!CAS_NAMESPACES[ns]; }
  function getConflicted(ns, key){ return __conflicted[ns+SEP+key] || null; }
  function clearConflicted(ns, key){ delete __conflicted[ns+SEP+key]; }
  /* 競合 backup を localStorage の別 key に保存 (同期対象外)。 上限管理 (30 日 /
     プロフィール 10 件 / 全体 30 件) を満たすため、 起動時に古いものを掃除。 */
  function _listConflictBackupKeys(){
    var keys=[];
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(k && k.indexOf(CONFLICT_BACKUP_PREFIX)===0) keys.push(k);
      }
    }catch(_){}
    return keys;
  }
  function _readBackupMeta(k){
    try{
      var raw = safeGet(k, null); if(!raw) return null;
      var o = JSON.parse(raw);
      return o && {key:k, createdAt:o.createdAt||0, profileId:o.profileId||""};
    }catch(_){ return null; }
  }
  function _pruneConflictBackups(){
    var all = _listConflictBackupKeys().map(_readBackupMeta).filter(Boolean);
    var nowMs = Date.now();
    /* TTL 過ぎは即削除 */
    all = all.filter(function(m){
      if(m.createdAt && (nowMs - m.createdAt) > CONFLICT_BACKUP_TTL_MS){
        safeRemove(m.key); return false;
      }
      return true;
    });
    /* プロフィール別上限 */
    var byProf = {};
    all.forEach(function(m){ (byProf[m.profileId||"_"] = byProf[m.profileId||"_"] || []).push(m); });
    Object.keys(byProf).forEach(function(pid){
      var list = byProf[pid].sort(function(a,b){return b.createdAt - a.createdAt;});
      list.slice(CONFLICT_BACKUP_MAX_PER_PROFILE).forEach(function(m){ safeRemove(m.key); });
    });
    /* 全体上限 (TTL 経過分を取り除いた後の再集計) */
    var remaining = _listConflictBackupKeys().map(_readBackupMeta).filter(Boolean)
      .sort(function(a,b){return b.createdAt - a.createdAt;});
    remaining.slice(CONFLICT_BACKUP_MAX_TOTAL).forEach(function(m){ safeRemove(m.key); });
  }
  function _writeConflictBackup(ns, key, info){
    try{
      var bkKey = CONFLICT_BACKUP_PREFIX + Date.now() + "_" + (info.profileId||"_") + "_" + ns + "_" + key;
      var ok = safeSet(bkKey, JSON.stringify(info));
      if(!ok){
        /* 容量逼迫: 古い backup を削って再試行 */
        _pruneConflictBackups();
        ok = safeSet(bkKey, JSON.stringify(info));
      }
      _pruneConflictBackups();
      return ok ? bkKey : null;
    }catch(_){ return null; }
  }
  function listConflictBackups(profileId){
    var out = _listConflictBackupKeys().map(function(k){
      try{
        var raw = safeGet(k, null);
        if(!raw) return null;
        var o = JSON.parse(raw);
        if(profileId && o.profileId !== profileId) return null;
        return {key:k, profileId:o.profileId, namespace:o.namespace, kvKey:o.key,
          createdAt:o.createdAt, expectedRevision:o.expectedRevision,
          actualRevision:o.actualRevision, deviceId:o.deviceId};
      }catch(_){ return null; }
    }).filter(Boolean);
    return out.sort(function(a,b){return b.createdAt - a.createdAt;});
  }
  function readConflictBackup(backupKey){
    try{
      var raw = safeGet(backupKey, null);
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }
  /* 通常の load/save エントリは {v, updated, data} 形式。 CAS 対応では revision/
     updatedBy も持つ。 旧データは revision 未設定 → 0 扱い。 */
  function _entryRevision(entry){ return (entry && typeof entry.revision==='number') ? entry.revision : 0; }

  /* loadVersioned: caller が revision token を受け取る。 これを save 時に
     expectedRevision として明示渡しすると、 古い snapshot からの書込みは拒否される。 */
  function loadVersioned(ns, key, defaultValue){
    var store = loadStore();
    var entry = store.kv[ns + SEP + key];
    if(!entry){
      return Promise.resolve({data: deepClone(defaultValue==null ? null : defaultValue), revision: 0, fresh: true});
    }
    return Promise.resolve({
      data: deepClone(entry.data),
      revision: _entryRevision(entry),
      updatedAt: entry.updated || 0,
      updatedBy: entry.updatedBy || null,
      fresh: false
    });
  }
  /* saveVersioned: 成功時 {ok:true, revision:N}。 競合時 {ok:false, reason:"conflict",
     expectedRevision, actualRevision, remoteData} を返し、 ローカル候補は退避済み。
     例外は通信系のみで、 競合自体は throw しない (caller が誤って一般エラー扱い
     しないため structured result)。 */
  function saveVersioned(ns, key, data, expectedRevision, opts){
    opts = opts || {};
    var store = loadStore();
    var fullKey = ns + SEP + key;
    var entry = store.kv[fullKey];
    var actual = _entryRevision(entry);
    if(typeof expectedRevision !== 'number'){
      /* CAS 必須なので明示渡しがない場合は失敗を返す。 旧 API は別 save() を使う。 */
      return Promise.resolve({ok:false, reason:"missing-revision", actualRevision:actual});
    }
    if(actual !== expectedRevision){
      /* 競合検出 → ローカル候補を退避 */
      var profileId = "";
      try{
        if(ns === 'kanji' || ns === 'keisan' || ns === 'eitango' || ns === 'breeding' || ns === 'battle' || ns === 'wallet') profileId = key;
      }catch(_){}
      var bkKey = _writeConflictBackup(ns, key, {
        schemaVersion: 1,
        createdAt: Date.now(),
        profileId: profileId,
        namespace: ns,
        key: key,
        expectedRevision: expectedRevision,
        actualRevision: actual,
        deviceId: __deviceId,
        sessionId: opts.sessionId || null,
        localData: deepClone(data),
        remoteData: deepClone(entry ? entry.data : null)
      });
      __conflicted[fullKey] = {expectedRevision: expectedRevision, actualRevision: actual, backupKey: bkKey};
      try{ if(typeof console!=="undefined") console.warn("[Q4BStorage] CAS conflict on "+fullKey+" expected="+expectedRevision+" actual="+actual+" backup="+bkKey); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("q4b-storage-conflict", {detail:{ns:ns, key:key, expectedRevision:expectedRevision, actualRevision:actual, backupKey:bkKey}})); }catch(_){}
      setStatus("conflict");
      return Promise.resolve({
        ok: false,
        reason: "conflict",
        expectedRevision: expectedRevision,
        actualRevision: actual,
        remoteData: deepClone(entry ? entry.data : null),
        backupKey: bkKey
      });
    }
    /* CAS 成功 → revision を +1 して書込み */
    var newRevision = expectedRevision + 1;
    store.kv[fullKey] = {
      v: (entry && entry.v) || 1,
      updated: now(),
      revision: newRevision,
      updatedBy: __deviceId,
      data: deepClone(data)
    };
    persist();
    schedulePushOne(ns, key);
    return Promise.resolve({ok:true, revision:newRevision});
  }
  /* getDeviceId: PB-3 (presence) と conflict backup で利用 */
  function getDeviceId(){ return __deviceId; }
  _pruneConflictBackups();           /* 起動時に 1 度クリーンアップ */

  /* ---------------- namespaced KV API (Promise) ---------------- */
  function save(ns,key,data){
    /* PB-1: CAS 対象 namespace で旧 save が呼ばれた場合は warn (PB-2 完了で throw に変更) */
    if(isCASNamespace(ns)){
      try{ if(typeof console!=="undefined") console.warn("[Q4BStorage] legacy save() on CAS namespace '"+ns+"' — migrate caller to saveVersioned()"); }catch(_){}
    }
    var store=loadStore();
    /* 既存 revision を維持しつつ +1 (旧 caller から書かれた変更も revision を進める) */
    var prev = store.kv[ns+SEP+key];
    var rev = _entryRevision(prev) + 1;
    store.kv[ns+SEP+key]={v:1,updated:now(),revision:rev,updatedBy:__deviceId,data:deepClone(data)};   /* R6 */
    persist();
    schedulePushOne(ns,key);
    return Promise.resolve(true);
  }
  function load(ns,key){
    var store=loadStore(), entry=store.kv[ns+SEP+key];
    return Promise.resolve(entry?deepClone(entry.data):null);          /* R6 */
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
  /* T9: profiles() / saveProfiles() も deep clone する。 旧版は profiles.slice()
     で配列だけ複製、 中の profile object は内部 store と参照共有していた。 caller
     が p.name 等を変更すると updated 未更新で内部状態だけ変わる経路があった。 */
  function profiles(){return Promise.resolve(deepClone(loadStore().profiles));}
  function saveProfiles(list){
    var store=loadStore();
    store.profiles=Array.isArray(list)?deepClone(list):[];
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
     かせきのかけら: 各教科で 1日30問正解した瞬間に +1（各教科1日1個まで）。
     めざめのしずく: 3教科すべてでかけらを見つけた日が3日たまると +1。
     ※50→30に緩和(2026-06-17): 5歳が現実的に届く・長続き優先。律速はしずく側なのでインフレなし。 */
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
    day.dropSeen=!!day.dropSeen;
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
    if(logDay.correct[subject]>=30&&!logDay.subjects[subject]){
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
  /* かせきのたに クリア報酬等で かせきのかけら を直接付与（学習以外の入手経路） */
  function addFossilFragments(pid,n){
    var r, data;
    if(!pid)return {ok:false,error:"missing profile"};
    n=Math.max(0,Math.floor(n)||0);
    if(!n) return {ok:true,added:0};
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,todayKey());
    data.fossilFragments=(data.fossilFragments||0)+n;
    r.entry.updated=now();
    r.entry.data=normalizeRewardData(data,todayKey());
    persist();
    schedulePush();
    return {ok:true,added:n,state:clone(r.entry.data)};
  }
  /* 卵育成: かけらを消費 (restoreEquipment 以外の出口)。
     残高不足なら false を返し state を変更しない。 */
  function spendFossilFragments(pid,n){
    var r, data;
    if(!pid)return false;
    n=Math.max(0,Math.floor(n)||0);
    if(!n) return true;
    r=rewardEntry(pid);
    data=normalizeRewardData(r.entry.data,todayKey());
    if((data.fossilFragments||0)<n) return false;
    data.fossilFragments-=n;
    r.entry.updated=now();
    r.entry.data=normalizeRewardData(data,todayKey());
    persist();
    schedulePush();
    return true;
  }
  function fossilFragmentsOf(pid){
    if(!pid)return 0;
    var r=rewardEntry(pid);
    var data=normalizeRewardData(r.entry.data,todayKey());
    return data.fossilFragments||0;
  }

  /* ---------------- 卵育成 (breeding namespace shared kv) -----------
     coll.eggs / coll.pendingEggs / coll.stats.breeding を per-game coll から外し、
     fossilFragments と同様に shared kv (breeding <pid>) に置く。
     mergeStore が自動で per-kv LWW を適用する。 */
  function breedingKey(pid){ return "breeding"+SEP+pid; }
  function blankBreeding(){ return {eggs:[],pendingEggs:[],stats:{totalAbandoned:0}}; }
  /* T5: 卵の invariant 検証。 旧版は配列存在チェックだけで target/progress 等の
     形を見ておらず、 target が undefined の旧 / 破損データが 0>=0 で自動孵化判定を
     通過していた。 不正卵は quarantine (data._brokenEggs) に退避して自動処理から
     除外、 後で UI から確認/削除できるようにする。 */
  /* U3: 旧 validator は e.game/e.sex が未定義なら通すフェイルオープン。 さらに
     species ID 実在チェック無し。 これらの卵が完成扱いされて undefined namespace
     に保存される / 永久にスロットを占有する経路を遮断するため必須化。 */
  function _isValidEgg(e){
    if(!e || typeof e!=="object") return false;
    if(!e.id || typeof e.id !== "string") return false;
    if(!Number.isFinite(e.progress) || e.progress < 0) return false;
    if(!Number.isFinite(e.target) || e.target <= 0) return false;
    if(e.progress > e.target * 2) return false;
    var validGames = {kanji:1, keisan:1, eitango:1};
    if(!e.game || !validGames[e.game]) return false;     /* game 必須 */
    if(e.sex !== 'm' && e.sex !== 'f') return false;       /* sex 必須 (u は通常卵では不可) */
    /* species 実在チェック (Q4BReward 読込後のみ。 boot 早期は skip して保全) */
    if(global.Q4BReward && global.Q4BReward.spById){
      var sp = global.Q4BReward.spById(e.id);
      if(!sp) return false;
      if(global.Q4BReward.eggGameFor){
        try{
          var expectedG = global.Q4BReward.eggGameFor(sp);
          if(expectedG && expectedG !== e.game) return false;
        }catch(_){}
      }
    }
    return true;
  }
  function normalizeBreeding(data){
    data=data&&typeof data==="object"?data:{};
    if(!Array.isArray(data.eggs))data.eggs=[];
    if(!Array.isArray(data.pendingEggs))data.pendingEggs=[];
    if(!data.stats||typeof data.stats!=="object")data.stats={};
    if(typeof data.stats.totalAbandoned!=="number")data.stats.totalAbandoned=0;
    /* T5: 不正卵を _brokenEggs に隔離 */
    var brokenE = data.eggs.filter(function(e){ return !_isValidEgg(e); });
    var brokenP = data.pendingEggs.filter(function(e){ return !_isValidEgg(e); });
    if(brokenE.length || brokenP.length){
      if(!Array.isArray(data._brokenEggs)) data._brokenEggs=[];
      data._brokenEggs = data._brokenEggs.concat(brokenE).concat(brokenP);
      data.eggs = data.eggs.filter(_isValidEgg);
      data.pendingEggs = data.pendingEggs.filter(_isValidEgg);
      try{ if(typeof console!=="undefined") console.warn("[Q4BStorage] quarantined "+(brokenE.length+brokenP.length)+" broken eggs"); }catch(_){}
    }
    return data;
  }
  function breedingOf(pid){
    if(!pid)return blankBreeding();
    var store=loadStore();
    var e=store.kv[breedingKey(pid)];
    if(!e || !e.data) return normalizeBreeding(blankBreeding());
    /* U3: clone 上で normalize して隔離が発生したら、 canonical store にも書き
       戻して クラウド/バックアップ伝播時に不正卵が消えるようにする。 旧版は
       clone だけ正規化していたため、 書込が発生しない限り破損卵が残存していた。 */
    var copy = clone(e.data);
    var beforeE = (copy.eggs||[]).length, beforeP = (copy.pendingEggs||[]).length;
    var normalized = normalizeBreeding(copy);
    if((normalized.eggs.length !== beforeE) || (normalized.pendingEggs.length !== beforeP)){
      try{
        store.kv[breedingKey(pid)] = {v:1, updated:now(), data:deepClone(normalized)};
        persist();
        schedulePush();
      }catch(_){}
    }
    return normalized;
  }
  function breedingSet(pid,data){
    if(!pid)return false;
    var store=loadStore();
    /* T9: breedingSet も deep clone する。 normalizeBreeding は in-place 変更を
       含むため、 caller の参照と分離しないと「後から caller が egg.progress を
       触ると内部に漏れる」 経路があった。 */
    store.kv[breedingKey(pid)]={v:1,updated:now(),data:deepClone(normalizeBreeding(data))};
    persist();
    schedulePush();
    return true;
  }
  /* しずく取得通知を「見た」マーク。同日2回目以降の通知を全端末で抑制する。
     localStorage のみの旧抑制は端末別だった→ プロフィールデータに保存して同期。 */
  function markDropSeen(pid,date){
    if(!pid)return {ok:false};
    date=date||todayKey();
    var r=rewardEntry(pid);
    var data=normalizeRewardData(r.entry.data,todayKey());
    if(data.log[date]){
      if(data.log[date].dropSeen) return {ok:true,already:true};
      data.log[date].dropSeen=true;
      r.entry.updated=now();
      r.entry.data=normalizeRewardData(data,todayKey());
      persist();
      schedulePush();
    }
    return {ok:true};
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
    /* PA-1: 旧版は cfg.enabled だけで「synced」 と表示する偽 synced だった。
       通信実績がない状態では dirty (= 未確認)。 実際の同期成功で synced に上がる。 */
    setStatus(cfg.enabled ? "dirty" : "local");
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
      _markSyncSuccess();
      /* PA-1: drain 中なら status を保持 (pushSnapshot が drain ループを継続) */
      if(localGeneration > pushedGeneration) setStatus("dirty");
      else setStatus("synced");
      return [{ok:true}];
    }catch(e){
      /* PA-2: エラー種別を分類して保存。 UI 側で 401 と offline と conflict を区別。 */
      var kind = _classifyError(e);
      _markSyncError(kind, e && e.message);
      setStatus(kind);
      global.QuestSave.lastError = e.message;
      throw e;
    }
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
  /* バックアップ取り込み (K-add #5)。
     mode='merge' (既定): LWW で新しい方を採用。 過去バックアップは取り込まれない。
     mode='restore': 入力 KV の updated を「現在時刻」 で打ち直して 強制上書き。
       profiles は registry まるごと obj.profiles で置換 (削除済の復元も可能)。 */
  function importAll(input, mode){
    var obj=input;
    if(typeof input==="string"){try{obj=JSON.parse(input);}catch(e){return Promise.reject(new Error("JSON を読めませんでした"));}}
    if(!obj||typeof obj!=="object")return Promise.reject(new Error("バックアップ形式が不正です"));
    mode = mode || 'merge';
    var store=loadStore(), n=0, k, tNow=now();
    if(mode==='restore'){
      /* U4: 強制復元はバックアップ内容で「完全置換」 にする。 旧版はバックアップ
         に無い KV を残し obj.current も無視していたため、 破損 KV をそのまま
         保持する「overlay」 になっていた。 PAT 等は CONFIG_KEY 側で別管理なので
         store の全置換で safe。 caller は事前に自動エクスポートして rollback
         可能にしている。 */
      store.profiles = Array.isArray(obj.profiles) ? deepClone(obj.profiles) : [];
      store.kv = (obj.kv && typeof obj.kv==='object') ? deepClone(obj.kv) : {};
      store.tombstones = (obj.tombstones && typeof obj.tombstones==='object') ? deepClone(obj.tombstones) : {};
      store.current = (typeof obj.current === 'string' || obj.current === null) ? obj.current : (store.profiles[0] && store.profiles[0].id) || null;
      /* updated を全件 打ち直して LWW で他端末にも勝つ */
      for(k in store.kv){
        if(store.kv[k] && typeof store.kv[k]==='object'){
          store.kv[k].updated = tNow;
          n++;
        }
      }
      store.profiles.forEach(function(p){ if(p) p.updated = tNow; });
    } else if(Array.isArray(obj.profiles)){
      mergeRegistry(store,obj);
    }
    if(mode!=='restore' && obj.kv && typeof obj.kv==="object"){
      for(k in obj.kv){
        var inc=obj.kv[k];
        if(!inc||typeof inc!=="object")continue;
        var ex=store.kv[k];
        if(!ex||(inc.updated||0)>=(ex.updated||0)){store.kv[k]=inc;n++;}
      }
    } else if(!obj.kv){
      // legacy flat backup: {"q4b_keisan_v1":"...json string..."}
      for(k in obj){
        if(k.indexOf("q4b_")!==0||typeof obj[k]!=="string")continue;
        var gid=k.replace(/^q4b_/,"").replace(/_v[0-9]+$/,"");
        var val=null; try{val=JSON.parse(obj[k]);}catch(e){val=obj[k];}
        store.kv[gid+SEP+"_legacy"]={v:1,updated:(mode==='restore'?tNow:now()),data:val};n++;
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
  /* PA-1: 起動時は同期成功実績で初期 status を決める。 lastSuccess があり 24h 以内
     なら synced とみなしてよい (最後の同期が最近) 、 それ以外は dirty。 */
  (function(){
    if(!getConfig().enabled){ setStatus("local"); return; }
    var m = _readLastSync();
    var fresh = m.lastSuccessAt && (now() - m.lastSuccessAt) < 86400000;
    setStatus(fresh ? "synced" : "dirty");
  })();

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
    spendAwakeningDrops:spendAwakeningDrops, addFossil:addFossilFragments,
    spendFossil:spendFossilFragments, fossilOf:fossilFragmentsOf,
    breedingOf:breedingOf, breedingSet:breedingSet,
    markDropSeen:markDropSeen,
    // status / connection
    getStatus:getStatus, onStatus:onStatus, isDegraded:isDegraded, warnIfDegraded:warnIfDegraded, getSyncMeta:getSyncMeta, requestPersistent:requestPersistent, storageEstimate:storageEstimate, autoConnect:autoConnect,
    /* PB-1: CAS API */
    loadVersioned:loadVersioned, saveVersioned:saveVersioned, isCASNamespace:isCASNamespace,
    getConflicted:getConflicted, clearConflicted:clearConflicted,
    listConflictBackups:listConflictBackups, readConflictBackup:readConflictBackup,
    getDeviceId:getDeviceId,
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
      /* S6: 自動リロードはセッション中 (window.SES or window.Q が真) に限り
         保留する。 認定テスト / ボス戦 / 卵孵化中などの不可逆処理が中断される
         のを防ぐ。 待機 SW は ready 状態のまま保持し、 ホーム遷移時 (= SES/Q が
         無くなった瞬間) のページ操作で controllerchange → reload が発火する
         よう、 ページから明示的に SKIP_WAITING を投げる方式に切替え。 */
      var _refreshing=false;
      var _pendingWaitingSw=null;
      function _isInSession(){
        try{ return !!(global.SES || global.Q); }catch(_){ return false; }
      }
      function _activateNow(){
        if(_pendingWaitingSw){
          try{ _pendingWaitingSw.postMessage({type:"SKIP_WAITING"}); }catch(_){}
          _pendingWaitingSw = null;
        }
      }
      function _showUpdateBanner(){
        try{
          if(document.getElementById("q4bSwUpdateToast")) return;
          var t = document.createElement("div");
          t.id = "q4bSwUpdateToast";
          t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#E8F5E9;border:2px solid #4CAF50;border-radius:12px;padding:10px 14px;z-index:9997;box-shadow:0 4px 16px rgba(0,0,0,.2);font-family:inherit;max-width:88vw";
          t.innerHTML = '<div style="font-size:13px;color:#1B5E20;margin-bottom:6px">✨ あたらしい バージョンが あります</div>'
            + '<button id="q4bSwApply" style="border:none;border-radius:8px;background:#4CAF50;color:#fff;padding:8px 14px;font-weight:700;cursor:pointer">いま こうしんする</button>'
            + '<button id="q4bSwLater" style="border:none;border-radius:8px;background:#EEE;color:#333;padding:8px 14px;margin-left:6px;cursor:pointer">あとで</button>';
          document.body.appendChild(t);
          document.getElementById("q4bSwApply").onclick=function(){ _activateNow(); };
          document.getElementById("q4bSwLater").onclick=function(){ if(t.parentNode)t.remove(); };
        }catch(_){}
      }
      function _watchWorker(worker){
        if(!worker) return;
        worker.addEventListener("statechange", function(){
          if(worker.state === "installed" && global.navigator.serviceWorker.controller){
            _pendingWaitingSw = worker;
            if(!_isInSession()) _showUpdateBanner();
            /* セッション中はバナーも出さず、 セッション終了時に表示 */
          }
        });
      }
      global.navigator.serviceWorker.addEventListener("controllerchange",function(){
        if(_refreshing)return; _refreshing=true; global.location.reload();
      });
      global.addEventListener("load",function(){
        global.navigator.serviceWorker.register(_base+"sw.js").then(function(reg){
          if(reg.waiting){ _pendingWaitingSw = reg.waiting; if(!_isInSession()) _showUpdateBanner(); }
          reg.addEventListener("updatefound", function(){ _watchWorker(reg.installing); });
          try{reg.update();}catch(_){}
        }).catch(function(){});
      });
      /* セッション終了時 (画面遷移など) に保留中の更新を表示する: SES が消えた
         直後にユーザがホームへ来たタイミングでバナーを出す。 */
      setInterval(function(){
        if(_pendingWaitingSw && !_isInSession() && !document.getElementById("q4bSwUpdateToast")){
          _showUpdateBanner();
        }
      }, 5000);
    }
  }
})(window);
