# 卵育成システム + マスター虫の性別選択 実装計画 (確定版)

最終更新: 2026-06-20

## 目的

「♂♀揃った虫に卵を産ませて、学習しながら育てて成虫にする」を実装する。
同時に、これまで sex='u' 固定だったマスター虫(SS)を新システムに統合し、
ユーザが性別を選んで個体差(サイズ・色違い)も楽しめるようにする。

自家育成個体は通常採集とは別に特別表示し、子供が「自分が育てた」達成感を味わえる。

## 合意済み設計原則

1. **案B 整合**: 完全変態(4段階)・不完全変態(3段階)を生物学的に正確に演出。内部進捗バーは1本で同じ計算式
2. **ホーム画面の専用カード**: 育成中の卵を1行3列で常時表示 (画面遷移なし)
3. **タイプ教科紐付け**: 卵は種のタイプ (Q4BReward.gameFor) に応じた教科で育つ (自動決定)
4. **同時育成は3個上限**: スマホ画面で快適に3列並列、3教科 × 1卵ずつのバランス学習を促進
5. **失敗なし**: 投資した時間が無駄にならない、子供のストレスを避ける
6. **学習画面の正解時に +1 フィードバック**: 該当教科の卵だけ表示
7. **孵化はタップで能動的に**: 子供が能動的に演出を楽しめる
8. **卵タップで該当種の図鑑詳細にジャンプ**: 親個体記録を確認できる
9. **マスター虫の性別選択**: 新規達成時はユーザが♂♀選択 (案A)、反対性別の卵を同時授与 (案B)
10. **レガシーマスター虫の救済**: 図鑑詳細で「♂♀をきめる」ボタン (案2)
11. **自家育成個体の特別扱い**: ♥ お気に入り と並んで 🌟 育成済みマーク
12. **図鑑フィルタに「🌟 育てた子」を追加**: ♥ おきにいり と ✨ いろちがい の隣

## データ構造

### `coll.eggs` (新規)
```js
coll.eggs = [
  {
    id: "hercules_beetle",
    sex: "f",                  // 孵化時の性別 (生成時確定)
    progress: 12,              // 累積正解数 (該当教科のみ)
    target: 1000,              // 必要正解数 (レア度から計算)
    game: "keisan",            // どの教科の問題で +1 (Q4BReward.gameFor で自動)
    origin: "lay" | "master_pair",
    bornAt: "2026-06-20",      // 卵を産んだ日 (孵化後 records.bornAt にコピー)
    shiny: false,              // 孵化時に shiny になる予約 (生成時に確定)
  }
]
```

### `coll.catches[id].records[i]` (拡張)
```js
{
  d: "2026-06-25",       // 孵化日 (成虫化した日)
  s: 78.2,
  sex: "m",
  shiny: false,
  reared: true,          // 自家育成フラグ
  bornAt: "2026-06-12",  // 卵を産んだ日 (育成期間を計算可能)
  legacy: false
}
```

`d` = 孵化日 (成虫化日)
`bornAt` = 卵生成日
育成期間 = `d - bornAt`

### `coll.masterPending` (任意・補助)
- マスター虫で sex='u' のままの種を検出するためのキャッシュ
- 起動時に再計算可能なので必須ではない (`records[0].sex === 'u'` で判定)

## レア度別コスト・育成必要数

| レアリティ | tier | かけらコスト | 必要正解数 | 期間目安(30問/日) |
|---|---:|---:|---:|---:|
| N | 0 | 20 | 10 | 半日 |
| R | 1 | 60 | 30 | 1日 |
| SR | 2 | 200 | 100 | 3-4日 |
| SSR | 3 | 600 | 300 | 10日 |
| SS | 4 | 2000 | 1000 | 1か月 |

種に依存せず、レア度のみで決定 → 公平。

## 完全変態 vs 不完全変態の整合

### `bugs.js` 拡張
```js
sp.metamorphosis: "complete" | "incomplete"
```
- order ベースで一括自動設定 (実装時の起動スクリプト):
  - `complete`: Coleoptera / Lepidoptera / Hymenoptera / Diptera / Megaloptera / Neuroptera / Trichoptera / Mecoptera / Siphonaptera
  - `incomplete`: Orthoptera / Hemiptera / Odonata / Mantodea / Blattodea / Phasmida / Phasmatodea / Dermaptera / Plecoptera / Isoptera / Scorpiones / Araneae

### ステージアイコン
| ステージ | アイコン |
|---|---|
| egg | 🥚 |
| larva (幼虫・芋虫) | 🐛 |
| pupa (蛹) | 🛌 |
| nymph (若虫) | 🦗ミニ もしくは親の縮小版SVG |
| adult (成虫) | 親の通常SVG |

### 進捗→ステージ変換
```js
function currentStage(egg, sp){
  var ratio = egg.progress / egg.target;
  if(sp.metamorphosis === 'complete'){          // 4段階
    if(ratio < 0.25) return 'egg';
    if(ratio < 0.5)  return 'larva';
    if(ratio < 0.85) return 'pupa';
    return 'adult';
  } else {                                       // 3段階
    if(ratio < 0.35) return 'egg';
    if(ratio < 0.85) return 'nymph';
    return 'adult';
  }
}
```
- 公平: 必要正解数は同じ、演出だけ違う
- 完全変態は「さなぎ期間」が長く、ある瞬間に成虫化のドラマ
- 不完全変態は「幼虫期間」が長く、徐々に大きくなる印象

## フロー

### A. 通常虫の卵生成
- トリガー: 図鑑詳細モーダル「🥚 たまごを 産ませる」
- 前提: records に sex='m' AND sex='f' が1つ以上 + amber >= cost + 同時育成数 < 3 + 同種の卵が未育成
- 処理: amber 消費 → sex / shiny を生成時抽選 → coll.eggs に追加

### B. マスター虫の新規達成
- トリガー: 既存の全習得判定
- UI: 「♂♀どちらにする?」モーダル
- 選択結果:
  - 選んだ性別の成虫を授与 (catches に追加, records にも reared:false で記録)
  - 反対性別の卵を coll.eggs に追加 (origin:"master_pair")

### C. レガシーマスター虫の救済
- トリガー: 図鑑詳細を開く
- 検出: `sp.masterOnly && entry.records[0].sex === 'u'`
- UI: 「♂♀をきめる」ボタン → Bと同じフロー
- 副作用: 既存個体の sex/size を確定 + 反対性別の卵を追加

### D. 育成 (学習問題正解で +1)
- トリガー: 各教科の問題正解時
- 処理: `Q4BReward.feedEgg(coll, currentGame)` を呼ぶ
- ロジック: `coll.eggs.filter(e => e.game === currentGame)` の卵だけ progress +1
- UI: 正解フィードバックに「🥚 +1」表示

### E. 孵化
- トリガー: progress >= target → ホーム画面に「✨ かえる準備OK!」表示
- ユーザがタップで能動的に孵化 (3-4段階アニメーション)
- 処理:
  - size = rollSize(sp, egg.sex)
  - records.push({d:today, s:size, sex:egg.sex, shiny:egg.shiny, reared:true, bornAt:egg.bornAt})
  - catches[id].n += 1 / max / min / shiny / normal を更新
  - coll.eggs から該当卵を削除
  - coll.total += 1

## UI 設計

### ホーム画面 - 育成中の卵カード
```
┌──────────────────────────────┐
│ 🥚 そだてている むし (3/3)    │
│ ┌──────┬──────┬──────┐      │
│ │  🐛  │  🛌  │  🦗  │      │
│ │ヘラクレス│オオクワ│オオカマ│      │
│ │   ♂  │   ♀  │   ♀  │      │
│ │▓▓▓░░░│▓▓▓▓▓░│▓░░░░░│      │
│ │16/100│290/300│5/100 │      │
│ │🔵計算│🟣漢字│🟢英語│      │
│ │完全変態│あと  │不完全 │      │
│ │      │10問！│変態   │      │
│ └──────┴──────┴──────┘      │
│ もんだいに せいかいすると      │
│  それぞれの 教科で そだつよ   │
└──────────────────────────────┘
```
- 卵 0 個なら非表示
- 横スクロール不要 (3個上限のため)
- 「あと N問！」が孵化準備近づくと強調
- カード幅 ~115px × 高さ 110-125px
- カード自体タップで該当種の図鑑詳細にジャンプ

### 学習画面の正解フィードバック
```
┌──────────────────────────┐
│ ⭕ せいかい！              │
│ 「いちにち」               │
│ ──────────────────────── │
│ 🥚 そだち中:               │
│  🐛 ヘラクレス +1 (16/100)│
│  🛌 オオクワガタ +1 (290) │
│    ✨ かえる準備OK！      │
│ ──────────────────────── │
│ つぎへ →                   │
└──────────────────────────┘
```
- 該当教科の卵だけ表示 (egg.game === currentGame)
- 孵化準備済みは「✨ かえる準備OK!」で目立たせる

### 図鑑カード (一覧) - 育成済みマーク
```
[虫アート]
カブトムシ✨
レア
35〜85mm
                    ♥ 🌟  ← 右上 (♥お気に入り, 🌟自家育成歴あり)
```
- 判定: `records.some(r => r.reared)`

### 図鑑フィルタチップ - 「🌟 育てた子」を追加
```
[ぜんぶ] [でんせつ] [ウルトラ] [スーパー] [レア] [ノーマル]
[♥ おきにいり] [✨ いろちがい] [🌟 育てた子]
```
- 「🌟 育てた子」フィルタ ON → reared:true 個体を1匹以上持つ種だけ表示
- 色: 緑系 #4a9b3a or 黄系 (お気に入り♥ピンク・色違い✨アンバー との区別)

### 詳細モーダル - 「自分で育てた子」セクション
```
[虫アート]
ヘラクレスオオカブト             ♥ (右上)
♂5 / ♀3
[2x2 ベスト表]
─────────────────────────────
🌟 自分で 育てた子: 2匹
 🐛→🛌→🪲 ♂ 178mm
   2026-06-12 産卵 → 06-25 孵化
   (13日間育成)
 🐛→🛌→🪲 ♀ 71mm
   2026-06-20 産卵 → 07-05 孵化
─────────────────────────────
[サイズ分布グラフ] ← 育成個体は ★ オーバーレイ
[最近5件の表] ← 🌟 マーク付き行は太字背景色
🥚 たまごを 産ませる (🔶 600) ← 前提クリア時のみ
```

### 孵化アニメーション
```
   🥚  →  🐛  →  🛌  →  🪲  (4段階、完全変態)
   🥚  →  🐛  →       🪲   (3段階、不完全変態)

  ✨ かえったよ！ ✨

  ヘラクレスオオカブト ♂
  178mm
  🌟 きみが 13日間 育てた 特別な子だよ

  [図鑑で みる] [とじる]
```

## 新規 API (shared/reward.js)

```js
// レア度→必要正解数 / かけらコスト
function eggTarget(sp){ return [10,30,100,300,1000][tierOf(sp)]; }
function eggCost(sp){ return [20,60,200,600,2000][tierOf(sp)]; }

// 卵を産ませる (前提チェック含む)
function layEgg(coll, sp){ ... }
// マスター卵を授与
function awardMasterEgg(coll, sp, sex){ ... }
// 学習問題正解で該当教科の卵 +1
function feedEgg(coll, game){ ... }
// 卵を孵化 → 成虫化
function hatchEgg(coll, eggIdx){ ... }
// マスター虫の性別を確定 (レガシー救済 + 新規達成共用)
function setMasterSex(coll, sp, chosen){ ... }
// reared 判定
function hasReared(coll, id){
  var e = coll.catches[id];
  return !!(e && e.records && e.records.some(r => r.reared));
}
function rearedRecords(coll, id){
  var e = coll.catches[id];
  return e && e.records ? e.records.filter(r => r.reared) : [];
}
```

## 既存 API の改修

### `awardMaster()`
- 旧: sex='u', size=max 固定
- 新: 引数で chosen sex を受け取り、size を rollSize(sp, sex) で抽選
- レガシーデータは setMasterSex() で個別に救済 (ユーザ操作)

### `record()` (通常採集)
- 引数に `reared:bool` オプション追加 (false 既定)
- 自家育成と通常採集を区別

## 既存ファイルへの変更箇所

| ファイル | 変更内容 |
|---|---|
| `shared/bugs.js` | bug() ヘルパで metamorphosis をパススルー |
| `shared/reward.js` | 上記新規 API + awardMaster 改修 + record 改修 |
| `shared/zukan_detail.js` | reared セクション / ヒストグラム★オーバーレイ |
| `kanji/index.html` | フィルタ「🌟育てた子」追加 / カード🌟マーク / 正解時の卵フィードバック / ホーム画面の卵カード呼び出し |
| `keisan/app.js` | 同上 |
| `eitango/index.html` | 同上 |
| `index.html` (ホーム) | 卵育成カード追加 (新規) |
| `shared/zukan_detail.js` | sexPreviewHTML / bestTableHTML / 詳細モーダル拡張 |
| 新規ファイル: `shared/breeding.js` | 卵生成・育成・孵化の共通 UI ヘルパー |

## 実装フェーズ

### Phase 1: データ基盤 (2時間)
1. bugs.js に metamorphosis フィールド追加 (order から一括自動設定)
2. reward.js に eggs API 追加 (layEgg / feedEgg / hatchEgg / awardMasterEgg / setMasterSex / hasReared / rearedRecords)
3. record() に reared フラグ受取
4. awardMaster() 改修 (chosen sex 抽選)
5. coll.eggs / records[i].bornAt のセーブ・ロード対応

### Phase 2: ホーム画面の卵カード (1.5時間)
1. shared/breeding.js 作成 - 卵カード HTML ヘルパ
2. index.html に「🥚 そだてている むし」カード追加
3. ステージ判定 / 進捗バー / タイプチップ / 完全変態表示
4. 卵タップで該当種の図鑑詳細にジャンプ (各画面で実装)

### Phase 3: 卵生成 UI (1時間)
1. 各画面の詳細モーダルに「🥚 たまごを 産ませる」ボタン
2. 前提チェック (♂♀記録 + amber + 上限3 + 重複なし)
3. クリック → コスト消費 + 卵生成 + UI 更新

### Phase 4: 学習中の +1 フィードバック (1.5時間)
1. kanji/keisan/eitango の正解判定箇所に `feedEgg(coll, currentGame)` 追加
2. 正解時のリザルト UI に該当教科の卵+1表示
3. 孵化準備済みは「✨ かえる準備OK！」を強調

### Phase 5: 孵化処理とアニメーション (1.5時間)
1. ホーム画面の「✨ かえる準備OK!」卵カードをタップで孵化
2. 4-3段階アニメーション (完全変態 vs 不完全変態)
3. 育成期間 (d - bornAt) 表示
4. 「🌟 きみが N日間育てた 特別な子だよ」メッセージ

### Phase 6: マスター虫の性別選択 (1.5時間)
1. 新規達成時の「♂♀どちらにする?」モーダル
2. 選択 → 成虫授与 + マスター卵授与
3. レガシー検出: 詳細モーダルに「♂♀をきめる」ボタン (sex='u' のみ)
4. 押下 → 同じフロー

### Phase 7: 自家育成個体の特別表示 (1.5時間)
1. shared/zukan_detail.js に sexPreviewHTML 拡張 / 「自分で育てた子」セクション
2. ヒストグラムバーに reared:true 個体の ★ オーバーレイ
3. 最近の記録テーブルで reared 行を太字+背景色強調
4. 図鑑カードに 🌟 マーク表示 (3画面)
5. 図鑑フィルタに「🌟 育てた子」チップ (3画面)

### Phase 8: バランス調整 (継続)
1. コスト/必要数のチューニング (実プレイ後)
2. アニメーション細部の演出 (孵化時のキラキラ等)
3. 卵カード4個目以降の表示制限の見せ方

## マイグレーション

- 既存 catches データ: 触らない (backfillRecords で対応済み, reared は false)
- 既存マスター虫 (sex='u'): Phase 6 でユーザが詳細モーダル開いて選択
- 既存 amber: そのまま使う
- 同期 (per-kv LWW): coll.eggs / coll.catches[].records[].bornAt は既存メカニズムで透過対応

## エッジケース

### 卵を放棄
- 詳細モーダルに「🥚 たまごを すてる」ボタン (要確認モーダル)
- かけらは返らない (慎重な選択を促す)

### 育成中の親個体が削除？
- 既存仕様で削除不可なので発生しない

### 同種の卵が同時に複数？
- 同時育成は1種1個まで (Phase 1 で前提チェック)

### shiny 確率
- 卵から生まれる成虫も通常の SHINY_CHANCE (3%) を適用
- 卵生成時に shiny 抽選を確定 (生成時の運次第)

### マスター卵の shiny
- master_pair 卵も通常の SHINY_CHANCE 適用
- マスター達成時に授与する成虫の shiny は別途検討 (現状0%)

### 教科をまたぐ卵
- 種に固定 (Q4BReward.gameFor で自動決定)
- 卵生成 UI で教科は選べない

### 育成中の卵が3個埋まっている時、孵化準備済みの卵を孵化せずに新規卵生成は?
- 上限到達でブロック → 「先に孵化させてね」メッセージ

### 育成中卵のかけら返金
- 放棄時のみ返金なし
- 孵化失敗等はないので返金概念は基本不要

## 未決事項

- [ ] かけらコスト数値の最終決定 (子供のかけら所持実態から逆算)
- [ ] 卵生成時の shiny 確率を上げる (例: 5%) か維持か
- [ ] マスター虫の初回授与で shiny 抽選するか
- [ ] レガシー sex='u' のマスター虫を放置した場合の通知設計 (図鑑カードに「!」マーク等)
- [ ] 孵化時の効果音
- [ ] 親個体記録の関連付け (records[i].parents:[recordId1, recordId2]) — 家系図機能の前準備として持つか
- [ ] 同時育成上限を後で5に緩和する余地を残すか
- [ ] 育成中卵を「タップで観察」する補助 UI

## 判断

- 設計の核 (卵→育成→孵化) + マスター虫救済 (♂♀選択+反対性別卵) で性別・ヒストグラム機能と完全統合
- 子供が長期目標を持ちやすい (SS の 1000問育成は数週間〜数か月)
- 教育的価値: ♂♀ペアで卵 / 学習で育つ / 完全変態と不完全変態の正確な演出
- 学習継続の動機: お気に入り種・育てたい虫が学習を引き寄せる
- 自家育成個体は通常採集とは独立に特別扱い → 子供が「自分の物語」を作れる

実装規模: 約 10-12 時間 (Phase 1-2 で動く MVP → Phase 3 以降は段階)
