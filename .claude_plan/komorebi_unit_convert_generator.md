# kom_unit_convert 生成器 実装計画

## Goal

`komorebi/unit_convert_generator.js` を新規作成し、単位換算 (kom_unit_convert) の Lv1 から 10 の問題生成と判定を、DOM に触れない純ロジックとして実装する。UI 結線は範囲外。テストは `tests/test_komorebi_unit_convert_generator.js` を新規作成する。

仕様の正典は `docs/komorebi_unit_convert_curriculum.md` (v0.1)。**実装前に全文を読むこと**。以下はその中で実装形式に落とす必要がある部分だけを書く。齟齬があれば curriculum が優先。

## スコープ境界

やる: `komorebi/unit_convert_generator.js`、`tests/test_komorebi_unit_convert_generator.js` の 2 ファイルのみ。
やらない: `komorebi/app.js`、HTML、CSS、`komorebi/index.html`、sw.js、他のいかなるファイルの変更も。

## 前提

- ファイル様式は `komorebi/pi314_generator.js` と `komorebi/kuku_run.js` に合わせる (IIFE、ES5 相当、乱数注入、日本語エラー)。
- `Math.random` と `Date.now` を直接呼ばない。
- **浮動小数で換算しない**。curriculum 3 章のとおり、量は `仮数 (整数) × 10^指数` で持ち、換算は指数の足し引きで行う。

## 単位表 (curriculum 3 章)

```js
var UNITS={
  mm2:{dimension:"area",exp:-6,label:"mm²"},
  cm2:{dimension:"area",exp:-4,label:"cm²"},
  m2:{dimension:"area",exp:0,label:"m²"},
  a:{dimension:"area",exp:2,label:"a"},
  ha:{dimension:"area",exp:4,label:"ha"},
  km2:{dimension:"area",exp:6,label:"km²"},
  mm3:{dimension:"volume",exp:-9,label:"mm³"},
  cm3:{dimension:"volume",exp:-6,label:"cm³"},
  mL:{dimension:"volume",exp:-6,label:"mL"},
  L:{dimension:"volume",exp:-3,label:"L"},
  m3:{dimension:"volume",exp:0,label:"m³"}
};
```

id は ASCII、表示は label。cm3 と mL の指数が等しいことが「mL = cm³ の橋」の実体である。

量 `{mantissa, exp}` を単位 A から B へ移すのは `exp += UNITS[A].exp - UNITS[B].exp` だけ。仮数は触らない。表示のときだけ仮数と指数から文字列を組み立て、末尾の 0 を落とす。

## 公開 API

```js
global.Q4B_KOMOREBI_UNIT_CONVERT={
  config:UNIT_CONFIG,
  units:UNITS,
  unitLabel:unitLabel,             // (id) -> "m²"
  formatQuantity:formatQuantity,   // ({mantissa,exp}) -> "0.45"
  convert:convert,                 // (quantity, fromId, toId) -> quantity
  buildSet:buildSet,               // (lv, random) -> 問題 5 件
  judge:judge,                     // (question, answer) -> boolean  (choice / order 用)
  judgeNumUnit:judgeNumUnit        // (question, value, unitId) -> {correct, state, note}
};
```

`judgeNumUnit` の `state` は 3 通り (curriculum 5 章)。

| state | 条件 | note |
|---|---|---|
| `correct` | 数値も単位も一致 | "" |
| `other_unit` | 選んだ単位で見れば量として等しい | "たしかに 3ha は 300a だけど、きかれているのは m²" |
| `wrong` | それ以外 | "" |

`other_unit` は誤答である。note は UI がそのまま出す文で、単位の表示名と実際の値から組み立てる。

## 問題オブジェクト

```js
{
  cat:"kom_unit_convert",
  format:"normal",        // normal / diagnosis / ordering
  kind:"num_unit",        // num / num_unit / choice / order
  lv:4,
  dimension:"area",
  pattern:"one_step",     // relation / principle / one_step / two_step / bridge_path / inverse / align
  from:{mantissa:5,exp:0,unit:"a"},
  to:"m2",
  text:"5a は 何 m² ですか。",
  scaffold:null,
  ans:500,                // 数値。num と num_unit で使う
  ansUnit:"m2",           // num_unit のみ
  unitChoices:["m2","a","ha","km2"],   // num_unit のみ。4 個
  waza:{primary:"面積の かいだんは ×100",alternate:"a から m² は 1 段 下りる"}
}
```

- `choice` (診断) は `choices` (ラベル文字列 4 個) と `ans` (index) を持つ。既存の標準判定がそのまま使える形にする
- `order` (整列) は `parts` (文字列 4 個)、`displayOrder` (提示順の index 配列)、`ans` (正しい順の index 配列) を持つ。`komorebi/ratio_generator.js` の ordering と同じ形にする

## Lv 別の生成規則

curriculum 4 章の配合表と 6 章がすべて。実装で迷いやすい点だけ補う。

- Lv1: 面積の階段 3 関係 (a から m²、ha から a、km² から ha) を出す。答えは常に 100。kind は `num`。5 問なので 2 問重複する
- Lv2: 体積の階段 3 関係 (L から mL、m³ から L、mL から cm³)。mL と cm³ の橋 (答え 1) を必ず 1 問入れる。kind は `num`
- Lv3: 長さの関係を足場に必ず先に示す。1cm² = 100mm²、1m² = 10000cm²、1m³ = 1000000cm³、1cm³ = 1000mm³。kind は `num`。**この Lv だけ答えが 6 桁を超えてよい**
- Lv4: 面積の一段。隣接する 1 段のみ。上りと下りを混ぜる。cm² と m² の段もここに含む
- Lv5: 面積の二段。**扱う単位は m2 / a / ha / km2 に限る** (cm2 を混ぜると 1 段が ×10000 になり「×100 を 2 回」が崩れる)
- Lv6: 体積の一段。mL と cm³ の橋を 1 問入れる
- Lv7: 二段経路 (m³ から mL など)。整列 2 問は curriculum 6 章 Lv7 の 4 部品一本鎖
- Lv8: 上り (小さい単位から大きい単位) を主にする。答えの小数は第 2 位まで
- Lv9: 揃えて計算。`1.2m² - 400cm² は 何 cm² ですか。` の形。目標単位は問題文が指定する
- Lv10: Lv4 から 9 のパターンを重みつきで再抽選。整列 2 問を含む

## 制約

1. 1 問に現れる単位は 2 種まで
2. mm² と mm³ は Lv3 の原理でのみ使う
3. 答えは 6 桁以内 (Lv3 の関係定数は例外)
4. 小数の答えは第 2 位まで
5. 単位選択肢は 4 個、重複なし、同じ次元、正解をちょうど 1 個含む。目標単位に隣接する連続した 4 段から取る
6. 整列の 4 部品は並びが 1 通りに定まること
7. 診断の選択肢は 4 個。正解ラベルは curriculum 7 章の表にあるもの。誤答案が正解と等価でない

## 診断の語彙 (curriculum 7 章)

`正しい` / `10倍のかいだんの数がちがう` / `単位がちがう` / `計算だけまちがえている` / `上りと下りが逆` (Lv8 以降)。

この文字列を canonical とし、生成器はここにない文字列を選択肢に出してはならない。

## テスト `tests/test_komorebi_unit_convert_generator.js`

`tests/test_komorebi_pi314_generator.js` の流儀に合わせる。curriculum 9 章の 10 項目をそのままテストにし、各 Lv 1000 セットを回す。加えて次も確かめる。

11. `convert` が指数の足し引きだけで動き、仮数を変えないこと
12. cm3 と mL の指数が等しく、その 2 単位の換算で値が変わらないこと
13. `formatQuantity` が `{mantissa:45,exp:-2}` を "0.45"、`{mantissa:3,exp:4}` を "30000" にすること
14. `judgeNumUnit` の 3 状態がそれぞれ出ること。特に `other_unit` が誤答であり note に両方の単位が現れること
15. Lv5 の単位が m2 / a / ha / km2 だけであること
16. Lv7 の整列が 4 部品で、正しい順以外のすべての並びが不正になること (全順列評価)
17. 全 Lv の全問で、浮動小数を経由せず仮数と指数から答えを再計算できること

## 完了条件

- `node tests/test_komorebi_unit_convert_generator.js` が `RESULT n passed, 0 failed`
- 変更ファイルが上記 2 つだけ
- 既存テストに影響なし
