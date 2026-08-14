# areaOnly 種の露出面修正 (プール・分母監査の指摘)

監査で見つかった、小道専用種 (bugs.js の areaOnly:"komorebi"、126 種) が本編の表示・分母に漏れる問題の修正。指摘箇所のみを直し、他の挙動を変えない。コードは既存の文体に合わせる。

## 1. (High) eitango 図鑑タブの分母・一覧に 96 種が混入

- `eitango/index.html` の `buildSpecies()` (464-472 行付近) の両分岐に `!b.areaOnly` を追加する:
  - `allBugs.filter(b=>Q4BReward.gameFor(b)==='eitango' && !b.bossOnly && !b.masterOnly && !b.areaOnly)`
  - fallback 側 `allBugs.filter(b=>!b.bossOnly && !b.masterOnly && !b.areaOnly)`
- 効果: zukanFor / scrZukan の一覧と分母から areaOnly 種が消え、同画面のむしかごバー (zukanDenomCount 経由、既に正しい) と分母定義が一致する。

## 2. (High) ポータル達成度バーの分母が生の全種数 (1638)

- `index.html` 1270 行付近:
  `var pool=window.Q4BReward&&Q4BReward.bugs?Q4BReward.bugs.length:547;`
  を、zukanDenomCount の 3 教科合計に差し替える:
  `var pool=window.Q4BReward&&Q4BReward.zukanDenomCount?(Q4BReward.zukanDenomCount('kanji')+Q4BReward.zukanDenomCount('keisan')+Q4BReward.zukanDenomCount('eitango')):1502;`
- 分子 (countSpecies) は既に areaOnly を除外済みなので触らない。

## 3. (Medium/latent) keisan の非フィルタ fallback 経路

- `keisan/app.js` `showZukan()` (904-928 行付近) の fallback (`window.Q4BReward` 不在時に生 BUGS を描画する分岐) で、走査対象を `BUGS.filter(function(b){return !b.areaOnly&&!b.masterOnly&&!b.bossOnly;})` に変える。
- `gachaPull(p)` (1049-1059 行付近) の最終 fallback `return ri(0,BUGS.length-1)` も同じ除外を通した配列から選ぶ形にする (index を返す契約なら、除外済み配列から選んだ要素の BUGS 内 index を返す等、呼び出し側の契約を壊さない最小変更にする)。
- 挙動確認: reward.js が読み込まれている通常経路では死コードなので、既存テストに影響しないはず。

## 4. (Low/latent) masterBugsFor の将来ガード

- `shared/reward.js` の `masterBugsFor(game)` (289 行付近) に `&& !sp.areaOnly` を追加する。現状該当 0 件なので挙動は不変。

## 4b. (Low/latent) pool(game) の未知 game フォールバック

- `shared/reward.js` の `function pool(game){ return POOLS[game] || BUGS; }` (31 行付近) は未知の game 文字列で無フィルタの全種配列 (areaOnly/masterOnly/bossOnly/SS 込み) に静かにフォールバックする。`POOLS[game] || []` に変える (空配列なら抽選が単に何も引けないだけで安全側)。現行の呼び出しは全て 3 教科 literal なので挙動は不変のはず。全テストで確認。

## 5. 回帰テスト

- `tests/test_komorebi_isolation.js` に追記する (既存の「index.html を正規表現で固定する」流儀に合わせる):
  1. index.html の達成度分母が `zukanDenomCount` 3 教科合計を使っていること (旧 `Q4BReward.bugs?Q4BReward.bugs.length` が現れないこと)
  2. eitango/index.html の buildSpecies フィルタに `!b.areaOnly` が含まれること
  3. reward.js を実 load して `masterBugsFor("kanji"/"keisan"/"eitango")` の結果に `areaOnly` 種が 0 件であること (可能なら機能検証、難しければ source 正規表現でよい)

## 6. cache busting

- `keisan/app.js` を変更するので、`keisan/app.js?v=` を参照している全ページ (keisan/index.html、komorebi/index.html) で +0.0.1 bump する。
- `shared/reward.js` を変更するので `reward.js?v=` を全参照ページで +0.0.1 bump する (現在 0.8.3 のはず → 0.8.4)。
- `sw.js` の CACHE を現在値から +1 する (コメントに areaOnly 露出修正と書く)。

## 検収

- `for f in tests/test_*.js; do node $f; done` 全 green
- `git diff --name-only` が上記ファイル群のみ
- commit はしない (レビュー後にこちらで行う)
