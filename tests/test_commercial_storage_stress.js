"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync(path.resolve(__dirname,"../shared/storage_authority.js"),"utf8");

function fakeIndexedDB(){
  const records=new Map(); let created=false;
  const db={
    objectStoreNames:{contains(){return created;}},
    createObjectStore(){created=true;return{};}, close(){},
    transaction(_name,mode){
      const pending=new Map(); let aborted=false, scheduled=false;
      const tx={error:null,oncomplete:null,onerror:null,onabort:null,abort(){aborted=true;setTimeout(()=>tx.onabort&&tx.onabort(),0);},objectStore(){return{
        get(id){const req={result:null,error:null,onsuccess:null,onerror:null};setTimeout(()=>{if(aborted)return;req.result=records.has(id)?structuredClone(records.get(id)):undefined;req.onsuccess&&req.onsuccess();if(mode==="readonly")setTimeout(()=>!aborted&&tx.oncomplete&&tx.oncomplete(),0);else if(!scheduled){scheduled=true;setTimeout(()=>{if(aborted)return;for(const [k,v] of pending)records.set(k,structuredClone(v));tx.oncomplete&&tx.oncomplete();},0);}},0);return req;},
        put(record){pending.set(record.id,structuredClone(record));return{};}
      };}}}; return tx;
    }
  };
  return {open(){const req={result:db,error:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};setTimeout(()=>{if(!created&&req.onupgradeneeded)req.onupgradeneeded();req.onsuccess&&req.onsuccess();},0);return req;},__records:records};
}

function context(idb){
  const c={console,indexedDB:idb,setTimeout,clearTimeout,Date,Math,Number,Promise,TextEncoder,encodeURIComponent,unescape,crypto:webcrypto,Uint8Array};
  c.window=c; vm.createContext(c); vm.runInContext(source,c); return c;
}
function payload(i){return JSON.stringify({v:2,profiles:[{id:"stress",name:"Stress"}],current:"stress",kv:{"keisan\\u0000stress":{v:1,updated:i,revision:i,data:{answers:i,marker:"g"+i}}},tombstones:{}});}

(async()=>{
  const idb=fakeIndexedDB();
  const api=context(idb).Q4BStorageAuthorityCandidate;
  const total=2000;
  for(let i=1;i<=total;i++){
    const result=await api.commit(payload(i),String(i),{reason:"commercial-stress"});
    assert.equal(result.ok,true,"commit "+i+" failed");
  }
  const authority=await api.verifiedAuthority();
  assert.equal(authority.ok,true);
  assert.equal(authority.cryptoVerified,true);
  assert.equal(authority.record.sourceGeneration,String(total));
  assert.equal(authority.record.payload,payload(total));
  const rollback=await api.rollback();
  assert.equal(rollback.sourceGeneration,String(total-1));
  assert.equal(rollback.payload,payload(total-1));

  const stale=await api.commit(payload(total-10),String(total-10));
  assert.equal(stale.ok,false);
  assert.equal(stale.reason,"stale-generation");

  const divergence=await api.commit(JSON.stringify({v:2,profiles:[],current:null,kv:{different:{v:1,data:{x:1}}},tombstones:{}}),String(total));
  assert.equal(divergence.ok,false);
  assert.equal(divergence.reason,"same-generation-divergence");

  const stillLatest=await api.verifiedAuthority();
  assert.equal(stillLatest.record.sourceGeneration,String(total));
  assert.equal(stillLatest.record.payload,payload(total));
  console.log(`RESULT commercial storage stress passed: ${total} sequential verified generations`);
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
