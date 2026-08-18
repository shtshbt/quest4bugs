# 小道リリース手順書 (事前準備方式)

版: v1.0 (2026-08-14)
親文書: `docs/komorebi_release_linkage.md` (更新カレンダー)、`docs/komorebi_volume_zukan_design.md`

## 1. 方式

更新 1 から 8 の中身 (カテゴリと巻) をすべて事前に仕込んでおき、リリース日にやることを **`CURRENT_RELEASE` を 1 つ上げるだけ**にする。

ゲートは 2 つあり、どちらも同じ番号で開く。

- カテゴリ: `komorebi/app.js` の `CATEGORIES` の `release` (17 本すべて実装・登録済み)
- 巻: volume manifest の `release` (未来の巻は仕込んでも地図・図鑑・抽選に出ない)

## 2. 事前準備の状態表

倍速カレンダー (release_linkage v0.2)。学習カテゴリは更新 1 から 4 に集約、更新 5 から 8 は図鑑の巻のみ。

| 更新 | カテゴリ | 巻 | 巻の準備状態 |
|---|---|---|---|
| 1 | 済 (gate 済、5 本) | マダガスカル Ⅰ (84 種) | 済。写真 76、名前 84 |
| 2 | 済 (5 本。図化を前倒し) | オーストラリア Ⅰ (84 種) | 済 (2026-08-17 freeze)。写真 84、catalog 84、レア度 N57/R17/SR帯10 |
| 3 | 済 (4 本) | ボルネオ Ⅰ | 在庫 188、未着手 |
| 4 | 済 (4 本。全 17 本出揃う) | コスタリカ Ⅰ | 在庫 296、未着手 |
| 5 | なし (図鑑のみ) | マダガスカル Ⅱ | 在庫 126/184、写真・命名続行中 |
| 6 | なし (図鑑のみ) | オーストラリア Ⅱ | 未着手 |
| 7 | なし (図鑑のみ) | ボルネオ Ⅱ | 未着手 |
| 8 | なし (図鑑のみ) | コスタリカ Ⅱ | 未着手 |

巻の準備 = 種選抜 (レア度 + 看板) → volume manifest 作成 (`release: N` 付き) → トロフィー manifest 追記 → freeze。準備できた巻から順に manifest を commit してよい。ゲートが閉じている限り画面に出ない。

## 3. リリース日の手順 (更新 N を出す)

1. `komorebi/app.js` の `CURRENT_RELEASE` を N にする (変更はこの 1 行)
2. `sw.js` の CACHE 版数を上げる (オフラインキャッシュの更新)
3. `komorebi/index.html` の `?v=` を上げる
4. `for f in tests/test_*.js; do node $f; done` — 全 green を確認
5. commit して push (通常 push。`git push origin main`)

5 分で終わる想定。教材・種・写真はすべて事前に入っているので、リリース日に内容の作業は発生しない。

## 3.1 メダル経済 (採集道具・かがやきのうろ) の公開

更新番号とは別のスイッチで出す (2026-08-17 決定)。地域 volume は新奇性が効くうちに、
道具は手が止まりかけた頃に出すほうが効くため、同じ deploy に束ねない。

1. `komorebi/app.js` の `MEDAL_ECONOMY_ON` を `true` にする (変更はこの 1 行)
2. `sw.js` の CACHE 版数を上げる
3. `for f in tests/test_*.js; do node $f; done` — 全 green を確認
4. commit して push

`false` の間に成立したメダルは、うろの初回訪問で遡って奉納できるので取りこぼしはない。
どの道具が出るかは道具ごとの `release` 番号と `CURRENT_RELEASE` の関係で決まる
(release_linkage 2 章の道具列)。

## 4. ゲートが守っていること (テストで固定済み)

- 未公開カテゴリは選択肢に出ない (`test_komorebi_release_gate.js`)
- 未公開の巻は地図・図鑑・抽選に出ない (同上)
- 公開集合が更新カレンダーの行と一致する (同上。カレンダーを直せばテストが検知する)
- 未公開カテゴリのトロフィー枠は目標ボードに出ない

## 5. 巻を仕込むときの注意

- volume manifest に `release: N` と `expedition: N地域内番号` を必ず書く
- 種は先に bugs.js へ `areaOnly:"komorebi"` で入れてよい (在庫は画面に出ない。プールと分母は areaOnly で除外済み)
- トロフィーの代表虫はその巻の看板を既定とし、freeze 時に `komorebi/trophies.js` へ追記する。トロフィーの release はカテゴリ側の release に従う
- 検収は `tests/test_komorebi_acceptance.js` を実 volume に向けて 1 度流す
