"use strict";

/* catalog の jaName が、画面が使う和名 (shared/bugs.js) と一致することを固定する。

   2026-08-17 の検収で、オーストラリア遠征 I の 84 件のうち 62 件で catalog の
   `jaName` が学名のまま残っているのが見つかった (例: `Simosyrphus grandicornis`)。
   zukan-fetch は取得時点の metadata をそのまま写すので、命名がまだ仮称提案の段階
   だった巻はラテン名が入る。あとで bugs.js 側の和名だけを確定させると、catalog は
   取り残される。

   画面表示は bugs.js の `jaName` を見るので子どもの目には触れないが、catalog は
   標本の provenance を配る先でもあり、そこに学名を和名として載せるのは誤りになる。
   欠陥クラスとしては「同じ事実が 2 か所にあって片方だけ直る」ので、片方だけ直せない
   ように assert で縛る。2026-09-06 に 62 件すべてを bugs.js の和名へ揃えた。

   node tests/test_zukan_catalog_janame.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sandbox = {};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
for(const file of ["shared/bugs.js", "zukan_config/zukan_catalog.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
}

const index = sandbox.Q4B_ZUKAN_INDEX;
const species = index.species || index;
const byId = new Map(sandbox.Q4B_BUGS.map(sp => [sp.id, sp]));
const entries = Object.keys(species).filter(key => species[key] && typeof species[key] === "object");

/* かなカナ漢字のどれか 1 文字でもあれば和名とみなす。ラテン文字だけの名前を弾く
   のが目的なので、これで足りる。 */
const JAPANESE = /[ぁ-ゟ゠-ヿ一-鿿]/;

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

test("the catalogue is not empty and every entry names a species bugs.js knows", () => {
  assert.ok(entries.length > 1000, "catalog の件数が少なすぎる: " + entries.length);
  const unknown = entries.filter(key => !byId.has(key));
  assert.deepEqual(unknown, [], "bugs.js に居ない種が catalog にある: " + unknown.slice(0, 5).join(", "));
});

test("no catalogue entry carries a scientific name in the jaName field", () => {
  const latin = entries
    .filter(key => !JAPANESE.test(species[key].jaName || ""))
    .map(key => key + ": " + species[key].jaName);
  assert.deepEqual(latin, [],
    "jaName が和名になっていない (" + latin.length + " 件):\n  " + latin.slice(0, 10).join("\n  "));
});

test("the catalogue and bugs.js agree on every japanese name", () => {
  /* 和名の正本は bugs.js。catalog はその写しなので、ずれたら写し直す側が catalog。 */
  const drift = entries
    .filter(key => {
      const bug = byId.get(key);
      return bug && bug.jaName && species[key].jaName !== bug.jaName;
    })
    .map(key => key + ": catalog=" + species[key].jaName + " / bugs.js=" + byId.get(key).jaName);
  assert.deepEqual(drift, [],
    "catalog と bugs.js の和名がずれている (" + drift.length + " 件):\n  " + drift.slice(0, 10).join("\n  "));
});

console.log("RESULT", passed, "passed, 0 failed");
