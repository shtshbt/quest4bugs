# Stage D3: kom_kuku_dan2 判定エンジン 実装計画

## Goal

`komorebi/kuku_dan2.js` を新規作成し、段暗唱 (kom_kuku_dan2) の Lv 表・チャンク構成・音声書き起こしの 5 状態判定・タイム判定を、DOM にも SpeechRecognition にも触れない純ロジックとして実装する。マイク制御とタイムバーの描画は範囲外 (app.js 側で行う)。テストは `tests/test_komorebi_kuku_dan2.js` を新規作成する。

正典は `docs/komorebi_categories.md` 3.2 章と `docs/komorebi_design.md` 7.4 章。齟齬があればそれらが優先。

## 潰す弱点 (実装意図)

九九を「1 句ずつなら言えるが、段として連続で唱えられない」状態。連続高速想起そのものを訓練する。だから判定単位は句ではなくチャンク (3 句 / 5 句 / 9 句) で、認識はチャンド末に 1 回だけ走る。句ごとに認識を待つカラオケ式は、認識レイテンシがテンポを壊すため棄却済み。

## スコープ境界

やる: `komorebi/kuku_dan2.js`、`tests/test_komorebi_kuku_dan2.js` の 2 ファイルのみ。
やらない: `komorebi/app.js`、HTML、CSS、`komorebi/index.html`、sw.js、他のいかなるファイルの変更も。

## 前提

- `shared/kuku_phrases.js` の `Q4B_KUKU_PHRASES` (`table` / `phrase(dan,b)` / `phrasesFor(dan)` / `teachingOrder`) が読み込み済み。
- ファイル様式は `komorebi/kuku_run.js` に合わせる (IIFE・ES5 相当・乱数注入・日本語エラー)。

## 公開 API

```js
global.Q4B_KOMOREBI_KUKU_DAN2 = {
  config: DAN2_CONFIG,
  levelPlan: levelPlan,        // (lv) -> {lv, chunkLength, display, seconds}
  chunkVariants: chunkVariants,// (lv) -> [[b...], ...] そのレベルで出しうるチャンク
  buildChunk: buildChunk,      // (dan, lv, variantIndex) -> チャンク問題
  buildSet: buildSet,          // (dan, lv, random) -> チャンク 5 件
  judgeTranscript: judgeTranscript, // (chunk, transcript) -> {state, matched, missing}
  judgeTiming: judgeTiming,    // (chunk, elapsedMs) -> {inTime, limitMs}
  judgeChunk: judgeChunk       // (chunk, transcript, elapsedMs) -> 統合結果
};
```

## Lv 表 (DAN2_CONFIG.levels)

`display` は `"read"` (式 + 答え + 句のふりがなを出す = よみあげ) か `"recall"` (式のみ)。
秒数は仮置きで、Phase 3 の実子テストで調整する。1 か所にまとめること。

| lv | chunkLength | display | seconds |
|---|---|---|---|
| 1 | 3 | read | 12 |
| 2 | 3 | read | 10 |
| 3 | 3 | recall | 8 |
| 4 | 3 | recall | 6 |
| 5 | 5 | read | 15 |
| 6 | 5 | read | 13 |
| 7 | 5 | recall | 12 |
| 8 | 5 | recall | 10 |
| 9 | 9 | recall | 25 |
| 10 | 9 | recall | 13 |

## チャンク構成 (chunkVariants)

- chunkLength 3 → `[[1,2,3],[4,5,6],[7,8,9]]`
- chunkLength 5 → `[[1,2,3,4,5],[5,6,7,8,9]]` (5 は意図的に重複。categories 3.2)
- chunkLength 9 → `[[1,2,3,4,5,6,7,8,9]]`

`buildSet(dan, lv, random)` は 5 件を返す。variant は `random` で選んだ開始位置から巡回させ、同じ variant が連続しないようにする (variant が 1 種類しかない 9 句は例外で、同じチャンクを 5 回出す。反復が目的なので正しい)。

## チャンク問題オブジェクト

```js
{
  cat: "kom_kuku_dan2",
  format: "voice",
  kind: "voice",
  lv: 3,
  dan: 2,
  variantIndex: 0,
  display: "recall",
  limitMs: 8000,
  phrases: [ {b:1, ans:2, phrase:"にいちがに"}, ... ]   // chunkLength 件
}
```

## 書き起こしの正規化と数列抽出

`judgeTranscript` の前処理:
1. 全角数字を半角へ、英字は小文字へ。
2. 空白・句読点・記号 (`、。,.!?！？ー-`) を除去。
3. 「かける」「掛ける」「×」「x」は除去 (けいさんの `normVoiceText` と同じ扱い)。

数の並びの抽出は**順序を保つ**こと (けいさんの `voiceCandidates` は集合を返すので流用できない)。左から走査し、次の順で最長一致を取る:
- 半角数字の連なり
- 漢数字 (`一`〜`九`、`十` を含む複合)
- かな数詞 (`いち/ひと/に/ふた/さん/よん/し/ご/ろく/なな/しち/はち/きゅう/く` と `じゅう` の複合。`じゅうに` は 12 として 1 語で取る)

## 5 状態判定 (design 7.4)

`judgeTranscript(chunk, transcript)` は次のいずれかの `state` を返す:

- `recognition_failure` — 書き起こしが空、または数もかな句も 1 つも拾えない。**統計にも Lv 判定にも記録しない。誤答でもない。**
- `correct_phrase` — 全句が「前半句 (段・かける数) と答え」の順で、チャンクの順どおりに現れる
- `answer_only` — 全句の答えは順どおりに現れるが、前半句が伴っていない (答えだけ言った)
- `stem_only` — 前半句は現れるが答えが欠けている / 誤っている
- `wrong_phrase` — 上記のいずれでもない (句の抜け・順序違い・別の段)

1 句の照合は次のどちらかで成立とする (音声認識の出力は「ひらがなのまま」と「数字に開いた形」の両方がありうる):
- 正規化した書き起こしに canonical 句 (`にさんがろく` 等) が、直前の句より後ろの位置に現れる
- 抽出した数列に `[dan, b, ans]` が、直前の句より後ろの位置で、この順に (間に他の数が挟まってもよい) 現れる

答えだけの照合は数列に `ans` が順序どおり現れること。

戻り値には `matched` (成立した句数) と `missing` (最初に落ちた句の index、全部成立なら -1) を含める。どの句で詰まったかを app.js が SRS へ還流するため。

## タイム判定

`judgeTiming(chunk, elapsedMs)` → `{inTime: elapsedMs <= chunk.limitMs, limitMs: chunk.limitMs}`。
`elapsedMs` は**発話終端 (音声活動の終わり) 基準**で app.js が計測して渡す。認識結果の到着時刻ではない。エンジン側は値を受け取るだけで、時刻を自分で取らない (`Date.now` を呼ばない)。

`judgeChunk(chunk, transcript, elapsedMs)` は:
- `judgeTranscript` が `recognition_failure` なら `{state:"recognition_failure", correct:false, counted:false, inTime:null}` (ノーカウント再挑戦)
- それ以外は `{state, correct: state==="correct_phrase" && inTime, counted:true, inTime, limitMs, matched, missing}`
- 句は合っていたが時間切れの場合は `state:"correct_phrase"`, `correct:false`, `timedOut:true` とし、時間切れが理由だと app.js が言えるようにする

## テスト `tests/test_komorebi_kuku_dan2.js`

`tests/test_komorebi_kuku_run.js` の流儀に合わせる。ロード順は `shared/kuku_phrases.js` → `komorebi/kuku_dan2.js`。

必須ケース:
1. Lv1 から 10 の `levelPlan` が上の表と一致し、チャンク長が 3→5→9 と単調に伸び、同じチャンク長の中では秒数が単調に減ること (テンポが上がることの回帰)。
2. `chunkVariants` が各チャンク長で上の構成を返し、5 句は 5 が重複していること。
3. `buildSet` が 5 件を返し、3 句・5 句では同じ variant が連続しないこと。9 句では同じチャンクが 5 回出ること。
4. `buildChunk` の `phrases` が `Q4B_KUKU_PHRASES.phrase` と一致すること (読みを別に持たない担保)。
5. 5 状態それぞれを、実際にありうる書き起こしで判定できること:
   - ひらがなのまま (`にいちがにににんがしにさんがろく`) → correct_phrase
   - 数字に開いた形 (`2かける1は2 2かける2は4 2かける3は6`) → correct_phrase
   - 答えだけ (`2 4 6`) → answer_only
   - 前半だけ (`2かける1 2かける2 2かける3`) → stem_only
   - 別の段 (`3かける1は3 …`) → wrong_phrase
   - 空文字・記号だけ → recognition_failure
6. 句が 1 つ抜けた書き起こしが correct_phrase にならず、`missing` が抜けた句の index を指すこと。
7. 順序を入れ替えた書き起こしが correct_phrase にならないこと (連続想起の訓練なので順序が本質)。
8. `judgeTiming` が制限ちょうどを in time とし、1 ミリ秒超過を out にすること。
9. `judgeChunk` で「句は正しいが時間切れ」が `correct:false` かつ `timedOut:true` かつ `counted:true` になること。
10. `recognition_failure` が `counted:false` になること (design 7.4: 認識失敗は統計に記録しない)。
11. エンジンが `Date.now` を呼んでいないこと (ソースを読んで文字列検査してよい)。
12. 全 9 段 × 全 Lv で `buildSet` が例外なく回ること。

## 完了条件

- `node tests/test_komorebi_kuku_dan2.js` が `RESULT n passed, 0 failed`
- 変更ファイルが上記 2 つだけ
- 既存テストに影響なし
