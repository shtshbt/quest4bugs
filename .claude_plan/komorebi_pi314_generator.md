# kom_pi314 生成器 実装計画

## Goal

`komorebi/pi314_generator.js` を新規作成し、3.14 の段 (kom_pi314) の Lv1 から 10 の問題生成を、DOM に触れない純ロジックとして実装する。UI 結線は範囲外 (app.js 側で別途行う)。テストは `tests/test_komorebi_pi314_generator.js` を新規作成する。

仕様の正典は `docs/komorebi_pi314_curriculum.md` (v0.1)。**実装前に全文を読むこと**。以下はその中で実装形式に落とす必要がある部分だけを書く。齟齬があれば curriculum が優先。

## スコープ境界

やる: `komorebi/pi314_generator.js`、`tests/test_komorebi_pi314_generator.js` の 2 ファイルのみ。
やらない: `komorebi/app.js`、HTML、CSS、`komorebi/index.html`、sw.js、他のいかなるファイルの変更も。

## 前提

- ファイル様式は `komorebi/kuku_run.js` に厳密に合わせる (IIFE、ES5 相当、乱数注入、日本語エラー)。
- `Math.random` と `Date.now` を直接呼ばない。乱数は必ず引数の `random` 経由。

## 公開 API

```js
global.Q4B_KOMOREBI_PI314 = {
  config: PI314_CONFIG,
  patterns: ["recall","place","merge","square","advanced","inverse","distribute","decimal"],
  coefficientsForLv: coefficientsForLv,   // (lv) -> 係数の候補配列 (検証用)
  scaffoldCount: scaffoldCount,           // (lv) -> そのレベルの足場付き問題数
  buildSet: buildSet,                     // (lv, random) -> 問題 5 件
  judge: judge,                           // (question, answer) -> boolean
  formatValue: formatValue,               // (milli) -> 表示文字列
  valueOf: valueOf                        // (question) -> 内部値 (1/1000 単位の整数)
};
```

## 値の表現 (curriculum 6.2 の実装形)

**浮動小数で 3.14 を掛けてはならない**。`3.14 * 7` が 21.98 にならない環境がある。

すべての値を 1000 分の 1 単位の整数 (milli) で持つ。単位を 1 つに統一することで、3.14 と 31.4 と 0.314 を同じ演算で扱える。

- 3.14 は `3140`
- 31.4 は `31400`
- 0.314 は `314`
- 3.14×n の内部値は `3140 * n`
- ÷2 は係数側で行う (`3.14×a÷2` は係数 `a/2` へ置き換えてから掛ける)。a を偶数に限る規則はこのため

`formatValue(milli)` は整数から文字列を組み立て、末尾の 0 を落とす。`31400` は `"31.4"`、`157000` は `"157"`、`50240` は `"50.24"`。小数点以下が 0 のときは小数点ごと落とす。

`ans` フィールドには表示と判定に使う数値 (`milli / 1000`) を入れる。判定は許容差 1e-9 の数値比較で、`"157.0"` も正答とする。

## 問題オブジェクト

```js
{
  cat: "kom_pi314",
  format: "normal",
  kind: "num",
  lv: 6,
  pattern: "square",
  subtype: "square",          // advanced と inverse は下位種別を入れる
  coefficients: [16],         // 意味モデル。検証と解説生成に使う
  text: "3.14×16 は いくつですか。",
  scaffold: "3.14×8 = 25.12 です。",   // 足場なしは null
  ans: 50.24,
  waza: {primary: "×16 は ×8 の 2 ばい", alternate: "×10 と ×6 に 分けても 同じ"}
}
```

`waza.alternate` が無い場合は空文字にする (ratio と同じ扱い)。

## Lv 別の生成規則

curriculum 5 章がすべて。実装で迷いやすい点だけ補う。

- Lv1: 係数 1 から 5 を 5 問に 1 回ずつ。順序は `random` でシャッフル
- Lv2: 係数 6 から 9。5 問なので 1 個重複し、重複させる係数は 7 に固定
- Lv3: 係数 1 から 9 から 5 個を重複なしで選ぶ
- Lv4: 係数は 10 から 90 の 10 刻みと 100。50 か 100 のどちらかを必ず 1 問入れる (答えが整数になるランドマーク)
- Lv5: `a + b` または `a - b`。まとめた係数は 2 から 10。加算は `|a - b| <= 3`、減算は `b >= 4`。退化 (a = b、b = 0、まとめ結果が 1 以下または 11 以上) を禁止
- Lv6: 平方数 6 個。16 と 25 の出現重みを他の 2 倍にする。足場は primary わざの 1 歩目 (curriculum 5 章 Lv6 の表)
- Lv7: 4 下位種別を混ぜる。`square_diff` / `three_term` / `half` / `merge_to_square`。5 問で 4 種別すべてが最低 1 回出る
- Lv8: `divide` を 3 問、`structure` を 2 問。答えが平方数になる問題を 2 問以上。答えは常に整数の係数
- Lv9: `distribute` (11 から 19 の非平方数) と `decimal` (31.4×a、0.314×a、a は 1 から 9) を混ぜる
- Lv10: Lv3 から 9 のパターンを重みつきで再抽選。まとめ系 (merge、advanced) の重みを 2 倍にする

## 足場

`scaffoldCount(lv)` は curriculum 4 章の表を返す (Lv1-3 と Lv10 は 0、Lv4-6 は 2、Lv7-9 は 1)。

足場付きの問題は **セットの先頭に並べる**。技を見せてから外す順序が崩れると足場の意味がなくなる。

## テスト `tests/test_komorebi_pi314_generator.js`

`tests/test_komorebi_kuku_run.js` の流儀に合わせる (node:assert/strict、vm.createContext、`test(name, fn)`、末尾に `RESULT n passed, 0 failed`)。

curriculum 7 章の validator 10 項目を**そのままテストにする**。静的プールが無いので Python の外部ツールにする理由がなく、生成器のテストに同居させるのが正しい置き場所である。各 Lv について 1000 セットを回して次を確かめる。

1. 答えの一致: `ans` が `coefficients` から整数演算で再計算した値と一致する
2. 係数集合: 各 Lv の係数が curriculum 3 章の表の範囲に収まる
3. 足場配合: 5 問中の足場付き本数が 4 章の表と一致し、足場付きが先頭に並ぶ
4. 退化ケース: 係数 0、a = b の差、まとめた係数が 1 以下または 11 以上、÷2 で奇数係数、が 1 件も無い
5. 足場の整合: Lv6 の足場が primary わざの 1 歩目と一致する (16 の足場に ×10 + ×6 が出ない)
6. 除外語: 本文に 円、半径、直径、円周率、秒、タイム、はやい が現れない
7. 表記: 答えの文字列に末尾の 0 が無い (31.40、157.00 が出ない)
8. 重複: セット内で同じ係数の問題が 2 回出ない (Lv2 の 7 を除く)
9. Lv8 の配合: 演算形 3 問と構造形 2 問。答えが平方数の問題が 2 問以上
10. Lv8 の答えが常に整数の係数であり、積が答えになっていない

加えて次も確かめる。

11. `formatValue` が 31400 を "31.4"、157000 を "157"、50240 を "50.24"、3140 を "3.14" にする
12. 浮動小数を経由していないこと: 全 Lv の全問で `ans * 1000` を丸めた整数が内部値と厳密に一致する
13. `judge` が文字列の "157.0" と数値 157 の両方を正答にし、157.01 を誤答にする
14. Lv1 の 5 問が係数 1 から 5 の並べ替えになっている
15. Lv7 の 5 問に 4 下位種別すべてが現れる
16. Lv10 が Lv3 から 9 のパターンだけを使う

## 完了条件

- `node tests/test_komorebi_pi314_generator.js` が `RESULT n passed, 0 failed`
- 変更ファイルが上記 2 つだけ
- 既存テストに影響なし
