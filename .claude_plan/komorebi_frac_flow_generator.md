# kom_frac_flow 生成器 実装計画

## Goal

`komorebi/frac_flow_generator.js` を新規作成し、分数計算の解法手順 (kom_frac_flow) の問題生成と判定を、DOM に触れない純ロジックとして実装する。テストは `tests/test_komorebi_frac_flow_generator.js` を新規作成する。

仕様の正典は `docs/komorebi_frac_flow_curriculum.md` (v0.1)。**実装前に全文を読むこと**。齟齬があれば curriculum が優先。

## スコープ境界

やる: `komorebi/frac_flow_generator.js`、`tests/test_komorebi_frac_flow_generator.js` の 2 ファイルのみ。
やらない: `komorebi/app.js`、HTML、CSS、`komorebi/index.html`、sw.js、他のいかなるファイルの変更も。

## 前提

- ファイル様式は `komorebi/unit_convert_generator.js` と `komorebi/pi314_generator.js` に合わせる (IIFE、ES5 相当、乱数注入、日本語エラー)。
- `Math.random` と `Date.now` を直接呼ばない。
- 浮動小数を使わない。分数は整数の分子と分母で持ち、約分は最大公約数、通分は最小公倍数で求める。

## 公開 API

```js
global.Q4B_KOMOREBI_FRAC_FLOW={
  config:FRAC_CONFIG,
  gcd:gcd, lcm:lcm,
  reduce:reduce,                 // ({num,den}) -> 既約の {num,den}
  toImproper:toImproper,         // ({whole,num,den}) -> {num,den}
  toMixed:toMixed,               // ({num,den}) -> {whole,num,den}
  formatFraction:formatFraction, // ({whole,num,den}) -> "2 と 1/4"
  buildSet:buildSet,             // (lv, random) -> 問題 5 件
  judge:judge,                   // (question, answer) -> boolean   (choice / order 用)
  judgeFraction:judgeFraction    // (question, {whole,num,den}) -> {correct, state, note}
};
```

`judgeFraction` の `state` は 3 通り。

| state | 条件 | note |
|---|---|---|
| `correct` | 値が等しく、分数部が既約 | "" |
| `not_reduced` | 値は等しいが分数部が既約でない | "約分が のこっているよ" |
| `wrong` | 値が違う | "" |

仮分数と帯分数はどちらでも `correct` とする (curriculum 5 章)。`whole` の空欄は 0 として渡ってくる。

## 問題オブジェクト

curriculum 8.3 の形。

- `frac` は `ans` が `{whole,num,den}`
- `choice` (診断と Lv1 の完成判定と Lv2 の相手探し) は `choices` (文字列 4 個) と `ans` (index)
- `order` (整列) は `parts` / `displayOrder` / `ans` (index 配列)。`komorebi/ratio_generator.js` の ordering と同じ形

## Lv 別の生成規則

curriculum 4 章の配合表と 6 章がすべて。実装で迷いやすい点だけ補う。

- Lv1: 完成判定 (choice) と一発約分 (frac) を混ぜる。一発約分は 1 回の約分で既約になる組に限る
- Lv2: 答えは最小公倍数。おとりは両方の積、和、片方の倍数だが他方の倍数でない数。問いは必ず「いちばん 小さい 分母」と限定する
- Lv3: 異分母加減。整列 2 問は 4 部品の一本鎖で、最後の部品を約分チェックにする
- Lv4: 帯分数の加算。**分数部の和が 1 を超えない組に限る** (繰り上がりは混ぜない)
- Lv5: 帯分数の減算。**分数部が必ず引けない組に限る** (繰り下がりが主題)
- Lv6: 乗法。**分子と分母の間に約分が 2 か所以上成り立つ組に限る**。1 か所だと先にやってもあとでやっても手間が変わらず技の意味が出ない
- Lv7: 除法。診断 2 問のうち 1 問は「ひっくり返す前に約分した」答案
- Lv8: 帯分数の乗除。仮分数化後に約分が成り立ち、答えが整数か簡単な分数になる組を優先
- Lv9: 三口は加減のみ。乗除は 2 項まで
- Lv10: Lv1 から 9 を重みつきで再抽選。整列 2 問を含む

## 制約

1. 答えは常に既約
2. 出題の分母は 2 から 12、答えの分母は 36 以下
3. 選択肢は 4 個、重複なし、正解をちょうど 1 個
4. 整列の 4 部品は並びが 1 通りに定まること
5. 診断のラベルは curriculum 7 章の表にあるものだけ
6. 遠回りの答案 (仮分数経由、あとから約分) の正解ラベルは「正しい」。「正しい (べつのとき方)」というラベルは作らない
7. 本文に時間や速さの文言を出さない

## テスト `tests/test_komorebi_frac_flow_generator.js`

`tests/test_komorebi_unit_convert_generator.js` の流儀に合わせ、各 Lv 1000 セットを回す。curriculum 9 章の 14 項目をそのままテストにし、加えて次も確かめる。

15. `judgeFraction` の 3 状態がそれぞれ出ること。特に 6/8 を 3/4 の問題へ入れて `not_reduced` になること
16. 仮分数 7/5 と帯分数 1 と 2/5 の両方が同じ問題で `correct` になること
17. `reduce` / `toImproper` / `toMixed` が整数だけで往復すること

## 完了条件

- `node tests/test_komorebi_frac_flow_generator.js` が `RESULT n passed, 0 failed`
- 変更ファイルが上記 2 つだけ
- 既存テストに影響なし
