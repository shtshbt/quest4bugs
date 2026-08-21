"use strict";

/* 全ページの <script src> の ?v= が、同じファイルなら同じ版であることを固定する。

   sw.js の fetch handler は「?v= 込みの完全一致」をキャッシュキーにしている
   (sw.js の アセット分岐)。だからページごとに版がずれていると、古い版を書いた
   ページだけがキャッシュに残った旧ファイルを掴み続ける。実際 2026-08-20 時点で
   battle.html だけ shared/reward.js が 0.8.7 (他は 0.8.8)、keisan/app.js が
   0.4.38 (他は 0.4.39) で、バトルだけ 1 世代古い共有モジュールで動いていた。

   あわせて、各ページが読む local な script が sw.js の CORE に載っていることも
   見る。CORE 漏れはオフラインで初めて露見するので、静的に捕まえたい。
   node tests/test_script_versions.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const PAGES = ["index.html", "battle.html", "keisan/index.html",
  "kanji/index.html", "eitango/index.html", "komorebi/index.html",
  /* 開発用の debug ページも版ずれの巣になる (2026-08-20 に storage/reward が旧版のまま
     取り残されていた)。配信はされないが同じ規則で見張る。 */
  "test_zukan.html"];

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS", name); }

/* ページからの相対 src を repo root からの path に直す。 */
function scriptsOf(page) {
  const src = fs.readFileSync(path.join(root, page), "utf8");
  const dir = path.posix.dirname(page) === "." ? "" : path.posix.dirname(page);
  const out = [];
  const re = /<script src="([^"?]+)(?:\?v=([^"]+))?"/g;
  let m;
  while ((m = re.exec(src))) {
    if (/^https?:/.test(m[1])) continue;
    out.push({ raw: m[1], version: m[2] || null,
      resolved: path.posix.normalize(path.posix.join(dir, m[1])) });
  }
  return out;
}

const byModule = new Map();
for (const page of PAGES) {
  for (const s of scriptsOf(page)) {
    if (!byModule.has(s.resolved)) byModule.set(s.resolved, []);
    byModule.get(s.resolved).push({ page, ...s });
  }
}

test("every page requests the same version of a shared module", () => {
  const drift = [];
  for (const [module, uses] of byModule) {
    const versions = [...new Set(uses.map(u => u.version).filter(Boolean))];
    if (versions.length > 1) {
      drift.push(`${module}: ` + uses.map(u => `${u.page}=${u.version}`).join(", "));
    }
  }
  assert.deepEqual(drift, [], "同じファイルをページごとに違う版で読んでいる:\n  " + drift.join("\n  "));
});

test("every script a page loads actually exists", () => {
  const missing = [];
  for (const [module, uses] of byModule) {
    if (!fs.existsSync(path.join(root, module))) missing.push(`${module} (${uses[0].page})`);
  }
  assert.deepEqual(missing, [], "読み込んでいる script が repo に無い");
});

test("every script a page loads is precached in sw.js", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const core = sw.slice(sw.indexOf("var CORE = ["), sw.indexOf("];", sw.indexOf("var CORE = [")));
  const absent = [];
  for (const module of byModule.keys()) {
    if (core.indexOf('"./' + module + '"') < 0) absent.push(module);
  }
  assert.deepEqual(absent, [], "sw.js の CORE に無い script がある (オフラインで落ちる)");
});

/* 道具は全図鑑共通のモジュールになったので、置き場所が shared/ であること自体を固定する。 */
test("the collecting tools live in shared, not under one game", () => {
  assert.ok(fs.existsSync(path.join(root, "shared/tools.js")));
  assert.ok(fs.existsSync(path.join(root, "shared/tool_icons.js")));
  assert.equal(fs.existsSync(path.join(root, "komorebi/tools.js")), false);
  assert.equal(fs.existsSync(path.join(root, "komorebi/assets/tool_icons.js")), false);
});

console.log(`RESULT ${passed} passed, 0 failed`);
