"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const shadowSource = fs.readFileSync(path.join(root, "shared/storage_shadow.js"), "utf8");
const storageSource = fs.readFileSync(path.join(root, "shared/storage.js"), "utf8");

function fakeIndexedDB({failOpen=false}={}){
  const records = new Map();
  let created = false;
  const db = {
    objectStoreNames: { contains(){ return created; } },
    createObjectStore(){ created = true; return {}; },
    close(){},
    transaction(){
      const tx = {
        error:null, oncomplete:null, onerror:null, onabort:null,
        objectStore(){
          return {
            put(record){
              records.set(record.id, structuredClone(record));
              setTimeout(() => { if(tx.oncomplete) tx.oncomplete(); }, 0);
            },
            get(id){
              const req = {result:null,error:null,onsuccess:null,onerror:null};
              setTimeout(() => {
                req.result = records.has(id) ? structuredClone(records.get(id)) : undefined;
                if(req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            }
          };
        }
      };
      return tx;
    }
  };
  return {
    records,
    open(){
      const req = {result:db,error:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
      setTimeout(() => {
        if(failOpen){ req.error = new Error("synthetic integration IDB failure"); if(req.onerror) req.onerror(); return; }
        if(!created && req.onupgradeneeded) req.onupgradeneeded();
        if(req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    }
  };
}

function makeLocalStorage(seed){
  const backing = new Map(Object.entries(seed || {}).map(([k,v]) => [k,String(v)]));
  return {
    backing,
    api: {
      get length(){ return backing.size; },
      key(i){ return Array.from(backing.keys())[i] || null; },
      getItem(k){ return backing.has(k) ? backing.get(k) : null; },
      setItem(k,v){ backing.set(k,String(v)); },
      removeItem(k){ backing.delete(k); }
    }
  };
}

function contextWith({seed, idb}){
  const local = makeLocalStorage(seed);
  const ctx = {
    console,
    indexedDB:idb,
    localStorage:local.api,
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    setTimeout,clearTimeout,setInterval(){return 0;},clearInterval(){},
    Date,Math,Promise,structuredClone,TextEncoder,TextDecoder,encodeURIComponent,unescape,
    fetch:async()=>{throw new Error("network disabled")}
  };
  ctx.window=ctx;
  ctx.navigator={};
  ctx.addEventListener=function(){};
  ctx.dispatchEvent=function(){};
  ctx.CustomEvent=function(type,init){this.type=type;this.detail=init&&init.detail;};
  vm.createContext(ctx);
  vm.runInContext(shadowSource,ctx,{filename:"shared/storage_shadow.js"});
  vm.runInContext(storageSource,ctx,{filename:"shared/storage.js"});
  ctx.__local=local;
  return ctx;
}

(async()=>{
  // Normal authoritative save mirrors asynchronously into IndexedDB.
  {
    const idb=fakeIndexedDB();
    const ctx=contextWith({idb});
    const save=ctx.QuestSave;
    const p=save.addProfile("shadow-int","🪲");
    await save.save("keisan",p.id,{level:4,answers:44});
    await ctx.Q4BStorageShadow.flush();

    const verify=await save.verifyShadow();
    assert.equal(verify.match,true);
    assert.equal(verify.generationMatch,true);
    assert.equal(verify.payloadMatch,true);

    const meta=await save.shadowSnapshotMeta();
    assert.equal(meta.exists,true);
    assert.ok(meta.payloadBytes>0);
    assert.ok(meta.checksum);
  }

  // Existing localStorage data is backfilled at boot; no gameplay save required.
  {
    const legacy={v:2,profiles:[{id:"p-old",name:"old",icon:"🪲",created:1,updated:1}],current:"p-old",kv:{"keisan\u0000p-old":{v:1,updated:2,revision:1,data:{level:8}}},tombstones:{}};
    const idb=fakeIndexedDB();
    const ctx=contextWith({idb,seed:{q4b_store_v1:JSON.stringify(legacy),q4b_store_gen:"123"}});
    await ctx.Q4BStorageShadow.flush();
    const verify=await ctx.QuestSave.verifyShadow();
    assert.equal(verify.match,true);
    assert.equal(verify.shadowGeneration,"123");
  }

  // Shadow failure cannot turn a successful legacy save into a failed save.
  {
    const idb=fakeIndexedDB({failOpen:true});
    const ctx=contextWith({idb});
    const save=ctx.QuestSave;
    const p=save.addProfile("legacy-survives","🪲");
    const ok=await save.save("keisan",p.id,{level:99});
    assert.equal(ok,true);
    const raw=ctx.__local.backing.get("q4b_store_v1");
    assert.ok(raw,"legacy authoritative payload must still exist");
    const parsed=JSON.parse(raw);
    assert.equal(parsed.kv[`keisan\u0000${p.id}`].data.level,99);
    const shadowResult=await ctx.Q4BStorageShadow.flush();
    assert.equal(shadowResult.written,false);
    assert.match(shadowResult.error||"",/synthetic integration IDB failure/);
  }

  console.log("RESULT storage shadow integration tests passed");
})().catch(error=>{
  console.error("FAIL",error);
  process.exit(1);
});
