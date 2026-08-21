import assert from "node:assert/strict";
import fs from "node:fs";
import { requireStagingFamily } from "../functions/_lib/auth.js";
import { validateSnapshot, normalizeGeneration, sha256Hex } from "../functions/_lib/backup.js";

const request = new Request("https://commercial.example/api/backups", {headers:{authorization:"Bearer secret","x-q4b-family":"family_test01"}});

let auth=requireStagingFamily({request,env:{COMMERCIAL_API_ENABLED:"0",COMMERCIAL_STAGING_TOKEN:"secret"}});
assert.equal(auth.ok,false);
assert.equal(auth.response.status,503);

auth=requireStagingFamily({request,env:{COMMERCIAL_API_ENABLED:"1",COMMERCIAL_STAGING_TOKEN:"secret"}});
assert.equal(auth.ok,true);
assert.equal(auth.familyId,"family_test01");

const snapshot=JSON.stringify({v:2,profiles:[],current:null,kv:{},tombstones:{}});
assert.equal(validateSnapshot(snapshot).parsed.v,2);
assert.equal(normalizeGeneration("123"),"123");
assert.rejects(async()=>normalizeGeneration("1/2"));
assert.equal((await sha256Hex(snapshot)).length,64);

const schema=fs.readFileSync(new URL("../cloudflare/schema.sql",import.meta.url),"utf8");
assert.match(schema,/CREATE TABLE IF NOT EXISTS families/);
assert.match(schema,/CREATE TABLE IF NOT EXISTS backup_metadata/);

const template=fs.readFileSync(new URL("../cloudflare/wrangler.template.jsonc",import.meta.url),"utf8");
assert.match(template,/"COMMERCIAL_API_ENABLED": "0"/);
assert.match(template,/"Q4B_DB"/);
assert.match(template,/"Q4B_BACKUPS"/);
assert.doesNotMatch(template,/COMMERCIAL_STAGING_TOKEN\s*"\s*:\s*"[^<]/);

console.log("RESULT commercial Cloudflare contract tests passed");
