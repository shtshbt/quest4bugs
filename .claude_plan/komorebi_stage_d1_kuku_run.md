# Stage D1: kom_kuku_run エンジン 実装計画

## Goal

`komorebi/kuku_run.js` を新規作成し、れんぞく九九 (kom_kuku_run) の 5 形式と九九 SRS を、DOM に一切触れない純ロジックとして実装する。UI 結線は本計画の範囲外 (Stage D2)。テストは `tests/test_komorebi_kuku_run.js` を新規作成する。

正典は `docs/komorebi_categories.md` 3.10 章。以下の仕様はその章を実装形式に落としたものであり、齟齬があれば 3.10 章が優先。

## 潰す弱点 (実装意図。これを外すと機能の意味がない)

暗算が速い子は 8×7 を「8 を 7 回足す」で毎回解けてしまい、正答率が高いまま九九が自動化しない。累加でも正答するため**正誤データでは検出できない**。よって応答レイテンシを無音で計測して累加を検出し、遅い正答の fact を短期間に再出題する。

- **時間の可視要素は一切置かない**。カウントダウン・速度ボーナス・タイム表示・速さの称賛はすべて不採用。レイテンシは内部利用のみ。
- 生成物に「はやい！」「おそい」等の文言を含めない。

## スコープ境界

やる: `komorebi/kuku_run.js` (エンジン)、`tests/test_komorebi_kuku_run.js` (テスト)。
やらない: `komorebi/app.js` への結線、HTML、CSS、`komorebi/index.html` の script 追加、sw.js。他のファイルを一切変更しない。

## 前提 (既存資産)

- `shared/kuku_phrases.js` が `Q4B_KUKU_PHRASES` を公開している (Stage D0 で作成済み):
  - `Q4B_KUKU_PHRASES.table` — `{1:[9 個の読み文字列], ..., 9:[...]}`。index 0 が ×1。
  - `Q4B_KUKU_PHRASES.phrase(dan, b)` — 読みを 1 つ返す。範囲外は例外。
- ファイル様式は `komorebi/ratio_generator.js` に厳密に合わせる:
  - `(function(global){ "use strict"; ... })(window);` の IIFE
  - ES5 相当 (`var` / `function`。アロー関数・class・テンプレートリテラル・`let` / `const` を使わない)
  - 乱数は必ず引数 `random` (0 以上 1 未満を返す関数) 経由。`Math.random` を直接呼ばない
  - `randomValue(random)` 相当の検証ヘルパを持ち、不正な乱数は日本語メッセージの `Error` を投げる
  - エラーメッセージはすべて日本語

## 公開 API

```js
global.Q4B_KOMOREBI_KUKU_RUN = {
  config: KUKU_RUN_CONFIG,   // 仮置き定数 (下記) を 1 か所に集約したオブジェクト
  formats: ["dan_run","scroll_fill","missing_find","error_find","flash"],
  dansForLv: dansForLv,      // (lv, random) -> [段番号]
  factKey: factKey,          // (dan, b) -> "8x7"
  createDeck: createDeck,    // () -> 新しい SRS デッキ
  validateDeck: validateDeck,// (deck) -> deck (壊れていれば例外)
  dueFacts: dueFacts,        // (deck, dans) -> [{key, dan, b, due, slow}] due 昇順
  reviewFact: reviewFact,    // (deck, dan, b, correct, ms) -> {status, interval, due, scaffold}
  noteAsked: noteAsked,      // (deck) -> 出題カウンタを 1 進める
  buildSet: buildSet,        // (lv, deck, random) -> [問題 5 件]
  judge: judge               // (question, answer) -> boolean
};
```

## 仮置き定数 (KUKU_RUN_CONFIG。Phase 3 実測で調整するため 1 か所に集約)

```js
var KUKU_RUN_CONFIG = {
  slowMs: 4000,        // これ以上かかった正答は「計算した疑い」
  fastMs: 2500,        // これ未満の正答は「想起できた」
  runLength: 5,        // だんラン 1 本の句数
  maxInterval: 32,     // SRS 間隔の上限 (出題回数)
  shortLoopGap: 3,     // 足場を見せてから再出題するまでの問題数 (セット内の位置差)
  setSize: 5
};
```

## SRS デッキ

```js
deck = {counter: 0, facts: {"8x7": {interval: 1, due: 3, slow: true, seen: 2}}}
```

- `counter` は出題ごとに `noteAsked` で 1 増える単調カウンタ。`due <= counter` の fact が再出題候補。
- `createDeck()` は `{counter:0, facts:{}}` を返す。
- `validateDeck(deck)` は形式違反 (counter が非負整数でない / facts が object でない / interval や due が非負整数でない / slow が boolean でない) で日本語例外。壊れた保存データを黙って受けない。
- `reviewFact(deck, dan, b, correct, ms)`:
  - `ms` は無音で計測した回答所要ミリ秒。有限の非負数でなければ例外。
  - 未知の fact は `{interval:1, due:0, slow:false, seen:0}` で初期化してから更新する。
  - 判定:
    - `correct === false` → `status:"wrong"`, `interval = 1`, `slow = true`
    - `ms >= slowMs` → `status:"slow"`, `interval = 1`, `slow = true` (累加の疑い)
    - `ms < fastMs` → `status:"fast"`, `interval = min(max(1, 前回 interval) * 2, maxInterval)`, `slow = false`
    - それ以外 → `status:"normal"`, `interval` は据え置き (最低 1)、`slow` は据え置き
  - `due = deck.counter + interval`、`seen++`。
  - 戻り値の `scaffold` は更新後の `slow` と同値 (真なら次の出題で句の足場を付ける)。
- `dueFacts(deck, dans)`: `dans` に属する fact のうち `due <= counter` のものを due 昇順 (同着は key 昇順) で返す。`dans` 省略時は全段。

## 段の選択 (dansForLv)

- Lv1 から 8: 指導順 `[2,5,3,4,6,7,8,9]` の該当 1 段のみを要素とする配列
- Lv9: `[2,3,4,5]` と `[6,7,8,9]` のどちらか一方を `random` で選ぶ (グループ内混合)
- Lv10: `[1,2,3,4,5,6,7,8,9]`
- 範囲外の lv は例外

## 5 形式の問題オブジェクト

共通フィールド: `{cat:"kom_kuku_run", format, kind, lv, dan, factKey, scaffold}`。
`scaffold` は句の読み文字列 (`Q4B_KUKU_PHRASES.phrase`) または `null`。SRS で `slow` が立っている fact を出すときだけ文字列を入れる。

1. **dan_run** (だんラン、`kind:"run"`)
   - `{steps:[{b, ans, choices:[4 個の相異なる整数]}], dan}`。`steps.length === runLength`。
   - b は 1 から始まる連番 (1..runLength)。
   - おとりは `dan*b ± 1` と隣の段の値 `(dan-1)*b` / `(dan+1)*b` から作る (3.10 章「おとりは ±1 と隣の段の値」)。0 以下や答えと同値のものは除き、足りなければ同段の別の積で補う。必ず 4 択・重複なし・答えを 1 つだけ含む。
   - ゲージ規則の都合上、**この 1 本全体で 1 問**。全 step 正解で正答。
2. **scroll_fill** (まきもの穴埋め、`kind:"choice"`)
   - `{rows:[{b, value, blank}], ans, choices}`。連続する 3 句を並べ、真ん中を空欄にする。前後の積が見える足場になる (3.10 章)。
   - b の起点は 1..7 から選び、rows は b, b+1, b+2。
   - おとりは `ans ± dan` (前後の句の値。最も紛れる) と `ans ± 1` から 3 個。答えと重複せず正の整数のみ。
   - 短ループ想起の起点。ここに SRS の対象 fact を置き、`scaffold` に句を入れる。
3. **missing_find** (たりないさがし、`kind:"choice"`)
   - `{shown:[積 8 個。順序は random でシャッフル], ans, choices}`。同じ段の 9 個の積から 1 個を抜き、抜いた値が答え。段の完全性を問う。
   - おとりは同段の他の積ではなく (盤面に見えているため)、`ans ± 1` と隣の段の積から 3 個。盤面 `shown` に含まれる値をおとりにしてはならない。
4. **error_find** (まちがいさがし、`kind:"choice"`)
   - `{lines:[{b, value, wrong}], ans, choices}`。連続する 5 句を式の形で並べ、1 行だけ積を誤らせる。
   - 誤らせ方は `± 1` または `± dan` (隣の句の値)。正しい積と一致してはならない。
   - `ans` は誤り行の index (0 始まり)。`choices` は行 index の配列 `[0,1,2,3,4]`。
5. **flash** (フラッシュ、`kind:"choice"`)
   - `{b, ans, choices}`。単一の九九 1 句。
   - おとりは dan_run と同じ規則。
   - 短ループ想起の着地点。scroll_fill と同じ fact をここに置き、`scaffold` は `null` (足場なしで想起させる)。

## buildSet

`buildSet(lv, deck, random)` は 5 問の配列を、次の**固定順**で返す:

`[dan_run, scroll_fill, missing_find, error_find, flash]`

- 段は `dansForLv(lv, random)` から選ぶ。Lv9 / Lv10 は問題ごとに段を引き直してよいが、**scroll_fill と flash は必ず同じ段・同じ b (= 同じ fact)** にする。これが 3.10 章の短ループ想起 (「句と一緒に見せ、数問はさんで同じ句を出題する」) の実体で、間に 2 問はさまる配置は `shortLoopGap` を満たす。
- 短ループの対象 fact の選び方:
  1. `dueFacts(deck, dans)` の先頭 (最も長く待っている fact) を使う。
  2. 候補がなければ `random` で段内の b を引く。
- 対象 fact の `slow` が真なら scroll_fill の `scaffold` に句を入れる。偽なら `null`。flash 側は常に `null`。
- `deck` が `null` / `undefined` の場合は空デッキ扱いで動く (保存データが無い初回でも落ちない)。
- 生成した問題は `judge` で必ず判定できること。制約を満たす選択肢が作れない場合は例外ではなく別の値で作り直す (最大 20 回試行し、それでも駄目なら日本語例外)。

## judge

`judge(question, answer)`:
- `run` → `answer` は step ごとの数値配列。長さと全要素が一致すれば true。
- `choice` → `answer` は数値 (missing_find / scroll_fill / flash は値、error_find は行 index)。`question.ans` と厳密一致で true。
- 形式不明・引数不正は日本語例外。

## テスト `tests/test_komorebi_kuku_run.js`

既存 `tests/test_komorebi_ratio_generator.js` の流儀に完全に合わせる (node:assert/strict、`vm.createContext`、`test(name, fn)` ヘルパ、末尾に `RESULT n passed, 0 failed`)。
ロード順は `shared/kuku_phrases.js` → `komorebi/kuku_run.js`。

必須ケース:
1. `dansForLv` が Lv1-8 で指導順の 1 段、Lv9 で 4 段グループ、Lv10 で 9 段を返す。範囲外で例外。
2. 決定的乱数 (数列を順に返す関数) で 5 問セットを作り、形式が固定順の 5 種であること、setSize が 5 であること。
3. **scroll_fill と flash が同じ factKey** であること (短ループ想起の回帰)。
4. 全形式の選択肢が 4 個・重複なし・正解をちょうど 1 個含み、値が正の整数であること。1000 セット分を回して不変であること。
5. missing_find の `shown` が 8 個で、答えが `shown` に含まれず、おとりも `shown` に含まれないこと。
6. error_find の誤り行がちょうど 1 行で、その値が正しい積と異なること。
7. dan_run のおとりに `±1` と隣の段の値が実際に現れること (規則が働いている証拠)。
8. `reviewFact` の 4 分岐: 誤答 → interval 1 / `slowMs` 以上の正答 → interval 1 かつ slow / `fastMs` 未満の正答 → interval 倍増と slow 解除 / 中間 → 据え置き。`maxInterval` で頭打ち。
9. `dueFacts` が due 昇順で、期日前の fact を返さないこと。`noteAsked` で counter が進み、期日が来ること。
10. **遅い正答の fact が次のセットで再出題され、`scaffold` に句が入る**こと (弱点検出から再出題までの一連。レイテンシを注入して決定的に検証)。
11. `validateDeck` が壊れたデッキ (counter が文字列 / interval が負 / facts が配列) で例外。
12. 生成物のどこにも時間・速さに関する文言 (「はやい」「おそい」「秒」「タイム」) が現れないこと (3.10 章の「時間の可視要素は置かない」の回帰)。
13. `buildSet` が deck 未指定でも動くこと。

## 完了条件

- `node tests/test_komorebi_kuku_run.js` が `RESULT n passed, 0 failed`
- 変更ファイルが `komorebi/kuku_run.js` と `tests/test_komorebi_kuku_run.js` の 2 つだけ
- 既存テストに影響なし
