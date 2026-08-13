# kom_kuku_ura と kom_kuku_inverse の生成器 実装計画

## Goal

`komorebi/kuku_reverse_generator.js` を新規作成し、九九のうら読み (kom_kuku_ura) と逆引き (kom_kuku_inverse) の問題生成を、DOM に触れない純ロジックとして実装する。2 カテゴリを 1 ファイルに置くのは、同じ九九表と同じおとり生成規則を共有するためである。テストは `tests/test_komorebi_kuku_reverse_generator.js` を新規作成する。

仕様の正典は `docs/komorebi_kuku_reverse_curriculum.md` (v0.1)。**実装前に全文を読むこと**。齟齬があれば curriculum が優先。

## スコープ境界

やる: `komorebi/kuku_reverse_generator.js`、`tests/test_komorebi_kuku_reverse_generator.js` の 2 ファイルのみ。
やらない: `komorebi/app.js`、HTML、CSS、`komorebi/index.html`、sw.js、他のいかなるファイルの変更も。

## 前提

- `shared/kuku_phrases.js` の `Q4B_KUKU_PHRASES` が読み込み済み (わざの文面で句を使える)。
- ファイル様式は `komorebi/kuku_run.js` に合わせる (IIFE、ES5 相当、乱数注入、日本語エラー)。
- `Math.random` と `Date.now` を直接呼ばない。

## 公開 API

```js
global.Q4B_KOMOREBI_KUKU_REVERSE={
  config:REVERSE_CONFIG,
  productsTable:productsTable,       // () -> 九九の積 36 種と分解の対応
  decompositions:decompositions,     // (product) -> [[a,b], ...] 九九内の全分解 (順序違いを含む)
  isKukuProduct:isKukuProduct,       // (n) -> boolean
  buildUraSet:buildUraSet,           // (lv, random) -> 問題 5 件
  buildInverseSet:buildInverseSet,   // (lv, random) -> 問題 5 件
  judge:judge                        // (question, answer) -> boolean
};
```

`judge` は kind ごとに分ける。`choice` は index の一致、`num` は数値の一致、`find_all` は選んだ index の集合が正解集合と完全一致 (順序は問わない)。

## 問題オブジェクト

curriculum 4.2 の形。共通フィールドは `cat` / `format` / `kind` / `lv` / `pattern` / `text` / `scaffold` / `waza`。

- `choice` は `choices` (文字列 4 個) と `ans` (index)
- `find_all` は `choices` (文字列) と `ans` (正解 index の配列)
- `num` は `ans` (数値)

## うら読みのおとり規則 (最重要)

curriculum 2.4 のとおり、**おとりは積が近い式ではなく因数が近い式**にする。

56 (7×8) に対して 7×7=49 や 8×8=64 を並べると、子どもは各選択肢の積を計算して弾く。それは掛け算の練習であってうら読みの訓練ではない。6×8、7×9、6×9 のように因数を 1 ずらした式を並べると、積を出さずに「56 は 7×8」と知っていることだけで切れる。

実装: 正解 `[a,b]` に対し `[a±1, b]`、`[a, b±1]`、`[a±1, b±1]` から 3 個を選ぶ。1 から 9 の範囲外と、正解と同じ積になる組 (交換法則の裏返しを含む) は除く。

## Lv 別の生成規則

curriculum 2.3 と 3.3 がすべて。実装で迷いやすい点だけ補う。

- ura Lv1 から 4: **積が 1 通りにしか分解できない数だけを使う** (順序違いは 1 通りと数える)。2 通り以上に分解できる 12、16、18、24、36 などは答えが定まらないので Lv5 の役目
- ura Lv5: 正解集合は九九内の全分解 (順序違いを含む)。`1×n` は九九の外なので含めない。おとりは他の積になる式
- ura Lv6: 選択肢 4 個のうち 1 個だけが九九表に無い数。九九表の 36 個の値を先に作り、そこに無い 2 桁の数から選ぶ
- ura Lv7: 正解は交換した式ちょうど 1 つ。おとりは因数を 1 ずらした式
- ura Lv8: 2 数はどちらも九九の積で、共通因数が 2 以上あるものを選ぶ。おとりは片方しか作れない数と、どちらも作れない数
- ura Lv9: 答えは共通因数の最大。数値入力
- ura Lv10: Lv1 から 9 を重みつきで再抽選
- inverse Lv1 から 8: 段は指導順 `[2,5,3,4,6,7,8,9]` の該当 1 段。セット内訳は curriculum 3.4 の表
- inverse Lv9: 2 から 9 の段を混合
- inverse Lv10: 全段混合。`p÷□=a` はこの Lv だけに出す

## 制約

1. 余りのある割り算を 1 件も作らない
2. inverse の答えは 1 から 9
3. 選択肢は 4 個、重複なし、正解をちょうど 1 個 (find_all を除く)
4. セット内で同じ fact を 2 回出さない
5. 本文に時間や速さの文言を出さない

## テスト `tests/test_komorebi_kuku_reverse_generator.js`

`tests/test_komorebi_pi314_generator.js` の流儀に合わせ、各 Lv 1000 セットを回す。curriculum 5 章の 12 項目をそのままテストにし、加えて次も確かめる。

13. `decompositions(56)` が `[[7,8],[8,7]]` を返し、`decompositions(12)` が 2×6 と 3×4 の順序違いを含む 4 通りを返すこと
14. `isKukuProduct` が 36 個の値に真、それ以外に偽を返すこと
15. ura Lv1 から 4 のおとりが必ず正解の因数から 1 ずれた組であること (積の近さで作られていないこと)
16. `judge` の find_all が、正解集合と完全一致のときだけ真になること (部分一致は偽)

## 完了条件

- `node tests/test_komorebi_kuku_reverse_generator.js` が `RESULT n passed, 0 failed`
- 変更ファイルが上記 2 つだけ
- 既存テストに影響なし
