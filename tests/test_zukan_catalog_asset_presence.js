"use strict";

/* catalog が指す画像ファイルが 1 枚残らず実在することを固定する。

   2026-06-22〜23 の 3 commit (bulk migrate d9c936c / chunk_b 466016b / clean branch
   6cd52c8) は zukan_cards/metadata・original・processed だけを stage し、
   zukan_cards/thumb を 1 枚も stage しなかった。thumb は生成されていた
   (各 metadata.json の files.thumbnails に記録が残っている) が untracked のまま
   で、その後の履歴整理で作業ツリーごと失われた。結果として 324 種ぶんの
   thumb54/108/216 が「catalog からは参照されているのに実体が無い」状態のまま
   公開され続けた (display と resized は無事だったので、図鑑の一覧サムネイルだけが
   静かに 404 になる形で表面化しづらかった)。

   この欠陥クラス — catalog の参照先が実在しない — を全件 assert で恒常的に
   ゼロに保つ。node tests/test_zukan_catalog_asset_presence.js で実行。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "zukan_config/zukan_catalog.js");

/* catalog.js は `(function(global){...})(window)` の IIFE。window を持つ sandbox で
   評価して index を取り出す (テキスト解析より参照漏れが起きにくい)。 */
const sandbox = {};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(catalogPath, "utf8"), sandbox, { filename: catalogPath });
const index = sandbox.Q4B_ZUKAN_INDEX;

const IMAGE_BLOCKS = ["image", "image_female"];
const FIELDS = ["display", "resized", "thumb54", "thumb108", "thumb216"];

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("PASS", name);
}

test("catalog index loads and has a plausible number of entries", () => {
  assert.ok(index && typeof index === "object", "Q4B_ZUKAN_INDEX was not exported");
  assert.ok(Object.keys(index).length > 900, "entry count looks too low: " + Object.keys(index).length);
});

test("every image path referenced by the catalog exists on disk", () => {
  const missing = [];
  let checked = 0;
  for (const [speciesId, entry] of Object.entries(index)) {
    for (const block of IMAGE_BLOCKS) {
      const img = entry[block];
      if (!img) continue;
      for (const field of FIELDS) {
        const rel = img[field];
        if (!rel) continue;
        checked++;
        if (!fs.existsSync(path.join(root, rel))) missing.push(speciesId + " " + block + "." + field + " -> " + rel);
      }
    }
  }
  assert.ok(checked > 4000, "far fewer paths than expected were checked: " + checked);
  assert.deepEqual(
    missing.slice(0, 20),
    [],
    "catalog references " + missing.length + " image file(s) that do not exist (first 20 shown)"
  );
});

test("every catalog entry carries all five image fields", () => {
  const incomplete = [];
  for (const [speciesId, entry] of Object.entries(index)) {
    for (const block of IMAGE_BLOCKS) {
      const img = entry[block];
      if (!img) continue;
      const lacking = FIELDS.filter((f) => !img[f]);
      if (lacking.length) incomplete.push(speciesId + " " + block + " lacks " + lacking.join(","));
    }
  }
  assert.deepEqual(incomplete, [], "catalog entries with an incomplete image block");
});

console.log("total", passed, "tests passed");
