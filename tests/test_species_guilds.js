/* 採集ギルド層 (shared/species_guilds.js) の単体と、図鑑ぜんたいに対する被覆の監査。

   ここが見張るのは 3 つ。

     1. 道具とギルドが 1 対 1 で、道具側に判定の複製が無いこと
     2. 判定の主キー (order / family / scientificName) が全種に入っていること
     3. どの巻・どの教科で、どの道具が働くか (worksIn の下限を満たすか)

   3 は表として固定してある。新しい巻を足したり種データを直したりすると、この表の
   どこかが動く。動いたこと自体は失敗ではないが、黙って動くと「更新 5 を打った日に
   フントラップが死札だった」という形でしか気づけない。だから数字で止める。

   node tests/test_species_guilds.js で実行。 */

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {};
context.window = context;
context.global = context;
vm.createContext(context);
for(const file of ["shared/bugs.js", "shared/reward.js", "komorebi/volumes/volume_fixture.js",
  "shared/species_guilds.js", "shared/tools.js"]){
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const guilds = context.Q4B_GUILDS;
const tools = context.Q4B_TOOLS;
const bugs = context.Q4B_BUGS;
const reward = context.Q4BReward;
const byId = new Map(bugs.map(sp => [sp.id, sp]));

/* 巻は fixture の実データ。release は「その巻が出る更新番号」で、MG I だけは
   release を持たない (更新 1 = 最初の巻なので 1 と読む)。 */
const VOLUMES = [
  ["MG1", "volume_fixture", 1],
  ["AU1", "volume_fixture_australia", 2],
  ["BO1", "volume_fixture_borneo", 3],
  ["AU2", "volume_fixture_australia_2", 4],
  ["MG2", "volume_fixture_madagascar_2", 5]
].map(([name, key, release]) => ({
  name, release,
  pool: context.Q4B_KOMOREBI_VOLUMES[key].species.map(entry => byId.get(entry.id)).filter(Boolean)
}));
/* 本編は目で捕獲プールが割れている (reward.js の gameFor)。道具は全図鑑共通なので、
   小道の巻と同じ物差しで見る。 */
const GAMES = ["kanji", "keisan", "eitango"].map(name => ({ name, release: 1, pool: reward.pool(name) }));
const POOLS = VOLUMES.concat(GAMES);

let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }
function hits(toolId, pool){ return pool.filter(sp => tools.matches(toolId, sp)).length; }

test("the tools and the guilds are one to one", () => {
  const keys = guilds.keys();
  /* 第 1 波 11 + 第 2 波 4 (2026-09-06)。数を固定するのは、ギルドだけ足して道具を
     足し忘れる (またはその逆) を止めるため。 */
  assert.equal(keys.length, 15, "ギルドの数が想定と違う");
  assert.equal(new Set(keys).size, keys.length, "ギルド key が重複している");
  const used = tools.list().map(tool => tool.guildKey);
  assert.equal(new Set(used).size, used.length, "2 つの道具が同じギルドを指している");
  assert.equal(used.slice().sort().join(","), keys.slice().sort().join(","),
    "道具とギルドの対応が 1 対 1 でない");
  keys.forEach(key => {
    assert.equal(typeof guilds.label(key), "string");
    assert.ok(guilds.label(key).length > 0, key + " に対象 guild の説明が無い");
  });
  assert.equal(guilds.label("no_such_guild"), "");
  assert.equal(guilds.has("no_such_guild", bugs[0]), false);
  assert.equal(guilds.has("butterfly", null), false);
  assert.equal(guilds.has("butterfly", "not a species"), false);
});

test("the keys the matchers read are present on every species", () => {
  /* 主キーを分類にしたのは、この 3 つだけが全種に入っているから (2026-09-06)。
     habitat は 1397 / 1950、subfamily は 765 / 1950、sizeMm はマダガスカル遠征 II で
     0 件しかない。補助キーが欠けても判定は落ちないが、主キーが欠けたら落ちる。 */
  const missing = bugs.filter(sp => !sp.order || !sp.family || !sp.scientificName);
  assert.equal(missing.length, 0,
    "分類の主キーが欠けた種がある: " + missing.slice(0, 5).map(sp => sp.id).join(", "));
});

test("every tool has somewhere it works by the time it is released", () => {
  /* 道具は release でしか開かないので、その時点で公開済みの巻と本編 3 教科の
     どこか 1 つで働けばよい (worksInAny と同じ読み方)。1 つも無ければ、その道具は
     出したその日から交換画面でグレーアウトしたままになる。 */
  tools.list().forEach(tool => {
    const available = POOLS.filter(entry => entry.release <= tool.release);
    const alive = available.filter(entry => tools.worksIn(tool.id, entry.pool));
    assert.ok(alive.length > 0,
      tool.id + " (更新 " + tool.release + ") はどこでも働かない: "
        + available.map(e => e.name + " " + hits(tool.id, e.pool) + "/" + e.pool.length).join(", "));
  });
});

test("the guild share per pool holds where it was measured", () => {
  /* 2026-09-06 の実測。行は道具、列は 5 巻 + 本編 3 教科の当たり数。 */
  const EXPECTED = {
    cho_net:       { MG1: 16, AU1:  8, BO1:  9, AU2:  2, MG2:  6, kanji: 245, keisan:   0, eitango:   0 },
    tonbo_net:     { MG1: 29, AU1: 12, BO1: 10, AU2: 11, MG2:  1, kanji:   0, keisan:   0, eitango:  98 },
    light_trap:    { MG1: 13, AU1:  7, BO1: 13, AU2: 18, MG2: 10, kanji: 187, keisan: 131, eitango:  59 },
    banana_trap:   { MG1: 10, AU1: 13, BO1: 12, AU2:  6, MG2:  5, kanji:  86, keisan: 164, eitango:  48 },
    sweep_net:     { MG1: 14, AU1: 23, BO1: 12, AU2: 15, MG2: 14, kanji:   0, keisan: 122, eitango: 152 },
    water_net:     { MG1: 21, AU1: 12, BO1:  7, AU2:  9, MG2:  7, kanji:   0, keisan:  38, eitango: 101 },
    beating_set:   { MG1:  9, AU1: 29, BO1: 29, AU2: 26, MG2: 15, kanji:   0, keisan: 138, eitango:  83 },
    aspirator:     { MG1: 13, AU1: 13, BO1: 13, AU2: 19, MG2: 23, kanji:   0, keisan: 263, eitango: 154 },
    long_pole:     { MG1:  8, AU1:  7, BO1: 17, AU2:  7, MG2:  4, kanji:  31, keisan:   7, eitango:  21 },
    pitfall_trap:  { MG1:  9, AU1:  2, BO1:  7, AU2:  6, MG2: 23, kanji:   0, keisan:  84, eitango:  49 },
    dung_trap:     { MG1:  1, AU1:  0, BO1:  4, AU2:  4, MG2:  4, kanji:   0, keisan:  37, eitango:   1 },
    /* 第 2 波 (更新 6 と 7)。 */
    malaise_trap:  { MG1:  2, AU1:  7, BO1:  8, AU2:  4, MG2:  4, kanji:   0, keisan:   0, eitango: 113 },
    deadwood_set:  { MG1:  3, AU1:  1, BO1:  0, AU2:  2, MG2:  1, kanji:   0, keisan: 147, eitango:   0 },
    surber_net:    { MG1: 10, AU1:  3, BO1:  9, AU2:  4, MG2:  6, kanji:   0, keisan:   8, eitango:  42 },
    window_trap:   { MG1:  3, AU1:  8, BO1:  4, AU2: 10, MG2:  4, kanji:   0, keisan: 213, eitango:   0 }
  };
  const drift = [];
  tools.list().forEach(tool => {
    POOLS.forEach(entry => {
      const got = hits(tool.id, entry.pool);
      const want = EXPECTED[tool.id][entry.name];
      if(got !== want) drift.push(tool.id + "/" + entry.name + ": " + want + " -> " + got);
    });
  });
  assert.deepEqual(drift, [], "被覆が動いた:\n  " + drift.join("\n  "));
});

test("no species is out of reach of every tool, insects aside", () => {
  /* 無所属の虫は、道具を持つほど相対的に出にくくなる (対象種だけ 3 倍になるため)。
     昆虫以外の 4 種 (サソリ・カナヘビ・ヒキガエル・モズ) は天敵・ボス枠で、
     採集の対象ではないので残してよい。 */
  const orphans = bugs.filter(sp => guilds.keysOf(sp).length === 0);
  assert.equal(orphans.map(sp => sp.id).sort().join(","),
    ["daiou_sasori", "mozu", "nihon_hikigaeru", "nihon_kanahebi"].sort().join(","),
    "無所属: " + orphans.map(sp => sp.jaName).join(", "));
});

test("no tool is a near copy of another one", () => {
  /* 重なりそのものは許す。実際の採集も 1 種 1 法ではないし、バナナトラップの
     タテハは ちょうネットでも採れる。禁じるのは「A の対象が B にほとんど飲まれて
     いる」形で、そうなると A を装備する理由が B の下位互換しか残らない。

     2026-09-06 に実際そうなっていたのがフントラップで、53 種のうち 51 種 (96%) が
     落とし穴トラップと重なっていた。餌でしか採れない専門家を落とし穴から外して
     70% まで下げた。上限は 80% に置く (いまの最大は 70%)。 */
  const LIMIT = 0.8;
  const sets = new Map(tools.list().map(tool =>
    [tool.id, new Set(bugs.filter(sp => tools.matches(tool.id, sp)).map(sp => sp.id))]));
  const swallowed = [];
  tools.list().forEach(tool => {
    const mine = sets.get(tool.id);
    tools.list().forEach(other => {
      if(other.id === tool.id) return;
      const shared = [...mine].filter(id => sets.get(other.id).has(id)).length;
      if(shared / mine.size >= LIMIT){
        swallowed.push(tool.id + " の " + shared + "/" + mine.size + " が " + other.id + " と重なる");
      }
    });
  });
  assert.deepEqual(swallowed, [], "他の道具に飲まれている:\n  " + swallowed.join("\n  "));
});

test("the dragonfly net and the water net split at still water", () => {
  /* さかなとりあみ が拾うトンボは、ヤゴをすくえる止水性だけ。渓流のトンボは
     メッシュネットの領分にする。以前は habitat に水域名があるだけで両方に当たり、
     トンボ 163 種のうち 139 種 (85%) が重なっていた。 */
  const dragonflies = bugs.filter(sp => sp.order === "Odonata");
  const shared = dragonflies.filter(sp => tools.matches("water_net", sp));
  assert.equal(dragonflies.length, 163);
  assert.equal(shared.length, 100);
  assert.ok(shared.length / dragonflies.length < 0.7, "トンボが水網に飲まれている");
});

console.log("RESULT", passed, "passed, 0 failed");
