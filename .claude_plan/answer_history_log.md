# round 9: 解析用の回答履歴ログ (日次 × カテゴリ集計)

決定 (2026-08-14): 学習解析のために回答履歴の保持を拡張する。ただし判定用の窓 (適応昇降の直近 10 問、トロフィー安定判定の 20 問、recent 20) は一切変更しない (意味論を変えない)。個々の回答の生ログは save.json を圧迫するため保存せず、日次 × カテゴリの集計を各ゲームの自 save 内に持つ。

## データ形式

各ゲームの profile 内に `anslog` を持つ:

```
anslog: {
  "2026-08-14": {
    "wariai": { n: 23, ok: 19, t: [4, 11, 6, 1], x: 1 }
  }
}
```

- n = 有効回答数、ok = 正答数
- t = 応答時間バケット [0-5 秒, 5-15 秒, 15-60 秒, 60 秒以上] の 4 要素。応答時間は「問題表示から確定提出まで」
- x = 中断回答数 (表示から提出までの間にタブ非表示 (visibilitychange hidden) が起きた回答)。x の回答は n/ok には数えるが t には入れない (時間として信用できないため)
- 「画面を開きっぱなしで放置」は 60 秒以上バケットか x に落ち、平均値汚染が起きない (平均は保存しない。バケットのみ)
- キーは短く (n/ok/t/x)。サイズ見積り ~50 bytes/カテゴリ/日 (compact)

## 保持

- 180 日 rolling。読み込み時 (または保存時) に 180 日より古い日付キーを削除する
- それ以前の履歴は fieldnote の commit 履歴 (save.json のスナップショット) から回収できるため、save 内に永久保持しない

## 実装

1. shared/reward.js に共有 helper を新設:
   - `answerTimer()`: `{start()}` で計測開始、`stop()` で `{ms, interrupted}` を返す。visibilitychange (document.hidden) を監視し、start から stop の間に hidden が起きたら interrupted:true。document が無い環境 (node テスト) では ms のみ・interrupted false で動く
   - `logAnswer(anslog, cat, ok, ms, interrupted, today)`: バケット分類と n/ok/x 加算、180 日 prune を行う純関数 (テスト可能に)
   - 両方 export
2. 各ゲームの正解判定箇所 (feedEgg を呼んでいる場所の隣) に接続:
   - keisan (keisan/app.js): 既存の出題表示時点で timer.start、判定時に stop → logAnswer(p.anslog, ...)。既に応答時間を測っている変数があればそれを流用し、interrupted だけ timer から取る
   - kanji (kanji/index.html)、eitango (eitango/index.html): 同様。表示時刻の記録が無ければ質問描画箇所に timer.start を足す
   - komorebi (komorebi/app.js): recordSubmission が elapsed を既に受け取っている。interrupted は timer helper で取得し、profile.anslog へ (saveProfile に同乗)
3. 有効回答の定義は各ゲームの既存の「ゲージ/卵に数える回答」と同じゲートを使う (ヒント・認識失敗・重複は記録しない)
4. q4b_import 連携は本 round の範囲外 (anslog が save.json に載れば fieldnote 経由で読める)

## 回帰テスト

- 新設 tests/test_answer_log.js:
  1. logAnswer のバケット境界 (4999ms→b0、5000ms→b1、60000ms→b3)、x 計上時に t が増えないこと
  2. 180 日 prune (181 日前の日付キーが消え、179 日前が残る)
  3. anslog が無い旧 profile でも初期化されて動く (後方互換)
  4. 各ゲームの hook 存在 (source 正規表現)
- 既存全テスト green。komorebi の validateProfile 系が anslog キーを許容することを確認 (拒否するなら normalizeProfile に枠を足す)

## cache busting

- 変更 js の ?v= を参照ページで +0.0.1。sw.js は触るな (commit 時にオーケストレータが bump)

## 検収

- 全テスト green、zukan_cards/ は diff 判定除外、commit しない
