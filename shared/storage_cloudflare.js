(function(global){
  "use strict";

  var session=null;
  var lastError=null;
  var lastUploadAt=0;

  function configureStaging(opts){
    opts=opts||{};
    var familyId=String(opts.familyId||"");
    var token=String(opts.token||"");
    if(!/^[A-Za-z0-9_-]{6,80}$/.test(familyId))throw new Error("invalid staging family id");
    if(!token)throw new Error("staging token required");
    session={familyId:familyId,token:token};
    return status();
  }

  function clearSession(){session=null;}

  function headers(extra){
    if(!session)throw new Error("cloud backup session not configured");
    return Object.assign({
      "authorization":"Bearer "+session.token,
      "x-q4b-family":session.familyId
    },extra||{});
  }

  async function sha256Hex(text){
    if(!global.crypto||!global.crypto.subtle)throw new Error("WebCrypto unavailable");
    var bytes=new TextEncoder().encode(String(text));
    var digest=await global.crypto.subtle.digest("SHA-256",bytes);
    return Array.from(new Uint8Array(digest),function(b){return b.toString(16).padStart(2,"0");}).join("");
  }

  async function uploadSnapshot(snapshot,meta){
    meta=meta||{};
    snapshot=String(snapshot==null?"":snapshot);
    try{
      var sha=await sha256Hex(snapshot);
      var res=await fetch("/api/backups",{
        method:"POST",
        headers:headers({"content-type":"application/json"}),
        body:JSON.stringify({
          snapshot:snapshot,
          schemaVersion:meta.schemaVersion||"quest4bugs.fieldnote.v2",
          generation:String(meta.generation==null?"0":meta.generation),
          sha256:sha,
          clientCreatedAt:meta.clientCreatedAt||Date.now()
        })
      });
      var body=await res.json().catch(function(){return {};});
      if(!res.ok)throw new Error(body.error||("backup upload failed: "+res.status));
      lastUploadAt=Date.now(); lastError=null;
      return body.backup;
    }catch(e){lastError=(e&&e.message)||String(e);throw e;}
  }

  async function listBackups(limit){
    try{
      var res=await fetch("/api/backups?limit="+encodeURIComponent(limit||20),{headers:headers()});
      var body=await res.json().catch(function(){return {};});
      if(!res.ok)throw new Error(body.error||("backup list failed: "+res.status));
      lastError=null; return body.backups||[];
    }catch(e){lastError=(e&&e.message)||String(e);throw e;}
  }

  async function downloadBackup(id){
    try{
      var res=await fetch("/api/backups/"+encodeURIComponent(id),{headers:headers()});
      if(!res.ok){
        var body=await res.json().catch(function(){return {};});
        throw new Error(body.error||("backup download failed: "+res.status));
      }
      var snapshot=await res.text();
      var expected=res.headers.get("x-q4b-sha256")||"";
      var actual=await sha256Hex(snapshot);
      if(expected&&expected!==actual)throw new Error("download sha256 mismatch");
      lastError=null;
      return {snapshot:snapshot,sha256:actual,generation:res.headers.get("x-q4b-generation"),schemaVersion:res.headers.get("x-q4b-schema")};
    }catch(e){lastError=(e&&e.message)||String(e);throw e;}
  }

  function status(){return {configured:!!session,familyId:session?session.familyId:null,lastUploadAt:lastUploadAt,lastError:lastError};}

  global.Q4BCloudBackup={configureStaging:configureStaging,clearSession:clearSession,uploadSnapshot:uploadSnapshot,listBackups:listBackups,downloadBackup:downloadBackup,status:status,sha256Hex:sha256Hex};
})(typeof window!=="undefined"?window:globalThis);
