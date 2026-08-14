# kom_kuku_bridge と kom_equation_select の生成器 実装計画

## Goal

小道の最後の 2 カテゴリの生成器を、DOM に触れない純ロジックとして実装する。2 つは無関係なカテゴリなのでファイルは分ける。

正典は `docs/komorebi_kuku_bridge_curriculum.md` と `docs/komorebi_equation_select_curriculum.md` (どちらも v0.1)。**実装前に両方を全文読むこと**。齟齬があれば curriculum が優先。

## スコープ境界

やる: 次の 4 ファイルのみ。

- `komorebi/kuku_bridge_generator.js` (新規)
- `tests/test_komorebi_kuku_bridge_generator.js` (新規)
- `komorebi/equation_select_generator.js` (新規)
- `tests/test_komorebi_equation_select_generator.js` (新規)

やらない: `komorebi/app.js`、HTML、CSS、`komorebi/index.html`、sw.js、他のいかなるファイルの変更も。

## 前提

- ファイル様式は `komorebi/pi314_generator.js` に合わせる (IIFE、ES5 相当、乱数注入、日本語エラー)。
- `Math.random` と `Date.now` を直接呼ばない。
- 浮動小数を使わない。どちらも整数演算だけで足りる。

## A. kom_kuku_bridge

### 公開 API

```js
global.Q4B_KOMOREBI_KUKU_BRIDGE={
  config:BRIDGE_CONFIG,
  patterns:["times_ten","tens_times","times_hundred","distribute","gather","adjust","double_half"],
  scaffoldCount:scaffoldCount,   // (lv) -> そのレベルの足場付き問題数
  buildSet:buildSet,             // (lv, random) -> 問題 5 件
  judge:judge                    // (question, answer) -> boolean
};
```

### 要点

- 問題オブジェクトは curriculum 6 章の形。`kind` は常に `num`
- 足場の本数は curriculum 3 章の表。足場付きはセットの先頭に並べる
- わざの文言は curriculum 5 章の表にあるものだけを使う
- **本文に漢字を出さない** (k5 カテゴリ)。ひらがなと数字と記号のみ。「7×12 は いくつですか。」の形
- 答えは 4 桁以内
- Lv4 は分けた片方が必ず九九に収まる組に限る
- Lv6 はまとめた結果が 10 か九九に収まる数になる組に限る
- Lv7 は ×9 と ×19 だけ
- Lv8 の倍々は偶数の因数に限る

### テスト

curriculum 7 章の 11 項目をそのままテストにし、各 Lv 1000 セットを回す。

## B. kom_equation_select

### 公開 API

```js
global.Q4B_KOMOREBI_EQUATION_SELECT={
  config:EQUATION_CONFIG,
  structures:["combine","decrease","compare","groups","share","measure","unknown_start","unknown_unit","mixed","two_step"],
  contexts:CONTEXTS,             // 5 種類の文脈
  buildSet:buildSet,             // (lv, random) -> 問題 5 件
  judge:judge                    // (question, answer) -> boolean
};
```

### 要点

- 問題オブジェクトは curriculum 7 章の形。`format` は `formulation`、`kind` は `choice`
- **答えの計算はさせない**。式を選ばせて終わり
- 誤答 3 つは curriculum 4 章の型に 1 対 1 で対応させる。ランダムな式を置かない
- **加法と乗法の Lv に順序反転肢を置かない** (どちらを誤ったのか特定できないため)。順序反転は減法と除法の Lv のみ
- 文脈は 5 種類 (あめ、シール、花、本、車)。人物名を使わない
- **本文はひらがな。数と単位だけ数字と漢字** (12本、5人、20まい)
- 数値は加減 20 まで、乗除は九九の範囲
- Lv9 の不要情報は問いの対象と別の種類の量にする (年齢など)。同種の量を混ぜると別解釈が成り立ち問題が曖昧になる
- Lv10 は 2 式の組を 1 つ選ばせる。順序が入れ替わった選択肢を必ず 1 つ入れる

基準例は `docs/komorebi_sample_items.md` 6 章にある 10 問。文体はそこに合わせる。

### テスト

curriculum 8 章の 11 項目をそのままテストにし、各 Lv 1000 セットを回す。

## 完了条件

- `node tests/test_komorebi_kuku_bridge_generator.js` と `node tests/test_komorebi_equation_select_generator.js` がどちらも `RESULT n passed, 0 failed`
- 変更ファイルが上記 4 つだけ
- 既存テストに影響なし
