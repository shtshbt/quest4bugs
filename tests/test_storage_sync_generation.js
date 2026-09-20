"use strict";

/* Regression for the 2026-09-19 Fieldnote sync storm.
   A cloud push persists a remote/local merge into localStorage, but that
   persistence is not a new user mutation. If it advances localGeneration,
   pushSnapshot() sees a fresh unsynced generation after every successful PUT
   and schedules another push forever.

   Run: node tests/test_storage_sync_generation.js
*/

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;

async function test(name, fn) {
  await fn();
  passed++;
  console.log("PASS", name);
}

function storageContext() {
  const backing = new Map();
  backing.set("quest4bugs_fieldnote_config_v1", JSON.stringify({
    owner: "shtshbt",
    repo: "quest4bugs_fieldnote",
    branch: "main",
    basePath: "q4b",
    token: "test-token",
    enabled: true
  }));
  backing.set("q4b_last_sync_v1", JSON.stringify({
    lastSuccessAt: 0,
    lastErrorAt: 123,
    lastErrorKind: "error",
    lastErrorMessage: "old resolved error"
  }));

  const localStorage = {
    get length() { return backing.size; },
    key(index) { return Array.from(backing.keys())[index] || null; },
    getItem(key) { return backing.has(key) ? backing.get(key) : null; },
    setItem(key, value) { backing.set(key, String(value)); },
    removeItem(key) { backing.delete(key); }
  };
  const sessionStorage = { getItem() { return null; }, setItem() {} };

  let nextTimerId = 1;
  const timers = [];
  function fakeSetTimeout(fn, ms) {
    const timer = { id: nextTimerId++, fn, ms, cancelled: false };
    timers.push(timer);
    return timer.id;
  }
  function fakeClearTimeout(id) {
    const timer = timers.find(item => item.id === id);
    if (timer) timer.cancelled = true;
  }

  let putCount = 0;
  let getCount = 0;
  function response(status, body) {
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: { get() { return null; } },
      clone() { return this; },
      async json() { return body || {}; }
    };
  }
  async function fetch(_url, options) {
    const method = (options && options.method) || "GET";
    if (method === "GET") {
      getCount++;
      return response(404);
    }
    if (method === "PUT") {
      putCount++;
      return response(200, { content: { sha: "test" } });
    }
    throw new Error("unexpected method " + method);
  }

  const context = {
    console,
    localStorage,
    sessionStorage,
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    structuredClone,
    Date,
    Math,
    Promise,
    TextEncoder,
    TextDecoder,
    fetch,
    btoa(value) { return Buffer.from(value, "binary").toString("base64"); },
    atob(value) { return Buffer.from(value, "base64").toString("binary"); }
  };
  context.window = context;
  context.navigator = {};
  context.addEventListener = function() {};
  context.dispatchEvent = function() {};
  context.CustomEvent = function(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  };
  context.__backing = backing;
  context.__timers = timers;
  context.__putCount = () => putCount;
  context.__getCount = () => getCount;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, "shared/storage.js"), "utf8"),
    context
  );
  return context;
}

function activeTimers(context) {
  return context.__timers.filter(timer => !timer.cancelled);
}

function runNextTimer(context) {
  const timer = activeTimers(context).sort((a, b) => a.ms - b.ms || a.id - b.id)[0];
  assert.ok(timer, "expected a scheduled timer");
  timer.cancelled = true;
  timer.fn();
  return timer.ms;
}

async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

(async () => {
  await test("successful cloud push terminates instead of scheduling another push", async () => {
    const context = storageContext();
    const save = context.QuestSave;

    assert.equal(save.getStatus(), "dirty");
    await save.pushAll();
    await settle();

    assert.equal(context.__putCount(), 1, "one explicit push must produce one PUT");
    assert.equal(save.getStatus(), "synced");
    assert.equal(activeTimers(context).length, 0,
      "successful sync must not create a drain timer without a new local mutation");

    const meta = save.getSyncMeta();
    assert.ok(meta.lastSuccessAt > 0);
    assert.equal(meta.lastErrorAt, 0, "a later successful sync clears the stale error timestamp");
    assert.equal(meta.lastErrorKind, null);
    assert.equal(meta.lastErrorMessage, null);
  });

  await test("a real local mutation still becomes dirty and gets one scheduled push", async () => {
    const context = storageContext();
    const save = context.QuestSave;

    await save.pushAll();
    await settle();
    assert.equal(context.__putCount(), 1);
    assert.equal(activeTimers(context).length, 0);

    await save.save("sync_regression", "p1", { value: 1 });
    assert.equal(save.getStatus(), "dirty");
    assert.equal(activeTimers(context).length, 1,
      "a caller-owned mutation should still schedule the normal debounced push");

    assert.equal(runNextTimer(context), 1500);
    await settle();

    assert.equal(context.__putCount(), 2,
      "the local mutation should produce exactly one additional PUT");
    assert.equal(save.getStatus(), "synced");
    assert.equal(activeTimers(context).length, 0,
      "the mutation push must settle without recursively scheduling itself");
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL", error);
  process.exit(1);
});
