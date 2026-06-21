# 卵育成システム + マスター虫の性別選択 実装計画 (確定版)

最終更新: 2026-06-21 (監査ワークフロー反映)

## 目的

「♂♀揃った虫に卵を産ませて、学習しながら育てて成虫にする」を実装する。
同時に、これまで sex='u' 固定だったマスター虫(SS)を新システムに統合し、
ユーザが性別を選んで個体差(サイズ・色違い)も楽しめるようにする。

自家育成個体は通常採集とは別に特別表示し、子供が「自分が育てた」達成感を味わえる。

## 用語表

実装と UI で同じ概念を異なる名前で呼ばないための対応表。

| 内部コード | UI チップ/カードマーク | UI マイクロコピー | 説明文 |
|---|---|---|---|
| `reared: true` | 🐣 そだてた子 | きみが そだてた | 自家育成個体 |
| `origin: "lay"` | — | — | 日次産卵卵 |
| `origin: "master_pair"` | マスター卵 | マスター卵 | マスター達成のペア卵 |
| `origin: "boss_pair"` | ボス卵 | ボスの たまご | ボス10回撃破のペア卵 |
| `coll.eggs[i]` (in progress) | そだてている むし | そだち中 | 育成中の卵 |
| `coll.pendingEggs[i]` | まっている たまご | まっているよ | 保留中の卵 (3枠満杯時) |
| `progress >= target` | ✨ かえる準備OK！ | ✨ タップでかえす | 孵化準備済 (状態バッジ vs CTA ボタン) |
| `coll.catches[id]` | ずかん | ずかん | 図鑑エントリ |

## 通貨

卵コストは既存の **`fossilFragments`** (かせきのかけら、🔶/🪨) を再利用する。
御神木のかけら蓄積に「卵を産ませる」という新用途を追加する設計で、別通貨は新設しない。
amber (こはく) は通常採集の報酬として独立して運用される。

## フィルタチップ色定義

```
♥ おきにいり : ピンク #ff7aa2
✨ いろちがい : アンバー #f5b800
🐣 そだてた子 : 緑   #4a9b3a
🥚 産める     : 黄   #FFB84A
```

`🌟` は keisan で「レア出やすい」マーク用に既使用のため、自家育成マークには **`🐣`** を採用 (合意項目 11-12 のアイコンを置き換え)。

## 合意済み設計原則

1. **案B 整合**: 完全変態(4段階)・不完全変態(3段階)を生物学的に正確に演出。内部進捗バーは1本で同じ計算式
2. **ホーム画面の専用カード**: 育成中の卵を1行3列で常時表示 (画面遷移なし)
3. **タイプ教科紐付け**: 卵は種のタイプ (`eggGameFor(sp)`) に応じた教科で育つ (自動決定)。マスター虫は `sp.master.game` を優先、通常虫は `Q4BReward.gameFor(sp)` 由来
4. **同時育成は3個上限**: スマホ画面で快適に3列並列、3教科 × 1卵ずつのバランス学習を促進 (強制はせず戦略性として許容)
5. **失敗なし**: 投資した時間が無駄にならない、子供のストレスを避ける
6. **学習画面の正解時に +1 フィードバック**: 該当教科の卵だけ表示
7. **孵化はタップで能動的に**: 子供が能動的に演出を楽しめる
8. **卵タップで該当種の図鑑詳細にジャンプ**: 親個体記録を確認できる (ホーム/教科画面ともに自画面 modal で表示、画面遷移なし)
9. **マスター虫の性別選択**: 新規達成時はユーザが♂♀選択 (案A)、反対性別の卵を同時授与 (案B)
10. **レガシーマスター虫の救済**: 図鑑詳細で「♂♀をきめる」ボタン (案2)
11. **自家育成個体の特別扱い**: ♥ お気に入り と並んで 🐣 そだてた子マーク
12. **図鑑フィルタに「🐣 そだてた子」を追加**: ♥ おきにいり と ✨ いろちがい の隣
13. **図鑑フィルタに「🥚 産める」を追加**: 産卵条件 (♂と♀をそれぞれ 1 個体以上記録済み) 達成種だけ抽出
14. **産卵導線は2つ**: (a) 図鑑詳細モーダルからの産卵 (b) ホーム画面の空きスロット「+」から卵選択モーダル。両導線で disabled 方針 (かけら不足/同種育成中/上限到達は disabled+理由表示、ボタン非表示にしない) を共通化
15. **教科別係数は不要**: 各教科 100問/日 単位で平均的、係数なしのシンプル設計
16. **問題数/かけらコストは確定**: 問題数 N=10/R=30/SR=100/SSR=300/SS=1000、かけらコスト N=20/R=60/SR=200/SSR=600/SS=2000
17. **マスター虫詳細**: sex='u' のときのみスタブ表示 (♂♀選択ボタン主体)、sex 確定済みなら records=1 でも通常 detailHTML。masterOnly 種は通常 detailHTML 上部にも常時 🎓 マスター達成記念バッジを表示
18. **ボス昆虫**: 段階的アンロック制 (1回撃破=個体, 10回撃破=反対性別の卵)。卵 trigger は n===10 の1回のみ (生涯1卵)
19. **天敵 (predator:true) は卵対象外**: モズ・サソリ等は戦闘特化、`bossKillReward()` は predator なら null を返す (defence-in-depth)
20. **マスター虫 > ボス昆虫**: 難易度ヒエラルキー明確化
21. **親ペア指定なし**: 個体管理を簡略化、卵から孵した子だけ特別扱い
22. **ホーム卵パネル**: カード全体タップで親の図鑑詳細にジャンプ。孵化準備済はカード自体発光+カード内に「✨ タップでかえす」CTA ボタン (バッジは「✨ かえる準備OK！」)
23. **3枠満杯時の B/B'/C 卵は保留キュー**: `coll.pendingEggs[]` に積み、空きができたらホーム通知バナーで受け取り。報酬消失なし
24. **データ配置**: `coll.eggs` / `coll.pendingEggs` / `coll.stats.breeding` は `breeding` namespace の shared kv に置き、3教科 coll から外す (per-game 分散を回避)
25. **視覚資産は archetype 方式**: 1200種ごと個別 SVG を作らず、~25 種類の archetype を `bug_archetypes.js` lookup で order/family/subfamily からアサイン

## データ構造

`coll.eggs` / `coll.pendingEggs` / `coll.stats.breeding` は **`breeding` namespace の shared kv** に置く (3教科 coll とは別 store)。`fossilFragments` が既に同パターンで運用済 (`shared/storage.js`)。

### `breeding` namespace shared kv (新規)

```js
// QuestSave.save('breeding', pid, breedingState)
breedingState = {
  eggs: [...],              // 育成中の卵 (max 3)
  pendingEggs: [...],       // 保留中の卵 (3枠満杯時の B/B'/C 卵)
  stats: { totalAbandoned: 0 },
  updated: 1719000000000,
}
```

`Q4BReward.setEggStore({get, set, add, remove, size})` を amberStore/fossilFragmentsStore と同形で新設し、各 game/ホームから単一 store を参照する (合算ロジック不要)。

### `coll.eggs[i]` (育成中)

```js
{
  id: "hercules_beetle",
  sex: "f",                  // 孵化時の性別 (生成時確定、決定方法は API による)
  progress: 12,              // 累積正解数 (該当教科のみ)
  target: 1000,              // 必要正解数 (レア度から計算、生成時固定)
  game: "keisan",            // どの教科の問題で +1 (eggGameFor(sp) で自動)
  origin: "lay" | "master_pair" | "boss_pair",
    // lay         = 日次産卵 (フロー A、ユーザがかけらを消費して産卵)
    // master_pair = マスター達成のペア卵 (フロー B / C)
    // boss_pair   = ボス10回撃破のペア卵 (フロー B')
  bornAt: "2026-06-20",      // 卵を産んだ日 (孵化後 records.bornAt にコピー)
  shiny: false,              // 孵化時に shiny になる予約 (生成時に rollShiny で確定)
}
```

### `coll.pendingEggs[i]` (保留中、3枠満杯時)

```js
{
  // coll.eggs[i] と同じスキーマ + 以下:
  queuedAt: "2026-06-25",    // pendingEggs に積まれた日
  // progress は 0 で積まれ、coll.eggs に転送されたタイミングで進行開始
}
```

空きができたらホーム画面に通知バナー「○○ の たまごが まっているよ! 受けとる」を出し、ユーザ操作で `coll.eggs` に転送する。性別・shiny は積んだ瞬間に確定して保持。

### `coll.catches[id].records[i]` (拡張)

```js
{
  d: "2026-06-25",       // 孵化日 (成虫化した日)
  s: 78.2,
  sex: "m",
  shiny: false,
  reared: true,          // 自家育成フラグ (孵化フロー E 経由のみ true、それ以外は false or 欠落)
  bornAt: "2026-06-12",  // 卵を産んだ日 (育成期間を計算可能)
  legacy: false          // 既存スキーマ互換 (backfill 由来の疑似 record のみ true, 詳細は docs/zukan_enhancement_plan.md)
}
```

`d` = 孵化日 (成虫化日)
`bornAt` = 卵生成日
育成期間 = `d - bornAt`

**reared フラグの不変条件**: `reared: true` となるのはフロー E (卵孵化) 経由のみ。フロー B (マスター直接授与)・フロー C (レガシー救済)・通常採集・ボス 1 回撃破授与・既存個体は全て `reared: false`。

**backfill ポリシー**: 既存 records への書き戻しは行わない。legacy record には `reared`/`bornAt` の field 自体を追加せず、`hasReared`/`rearedRecords` は truthy 判定で `undefined` を自然に false 扱い → LWW 同期は安全。

### `coll.stats.breeding` (新規・観測指標)

```js
{
  totalAbandoned: 0,         // 卵放棄回数 (Phase 8 のチューニング指標)
}
```

### `coll.masterPending` (必須・C フローの通知導線)

- マスター虫で `records.every(r => r.sex === 'u')` の種を検出するためのキャッシュ
- 図鑑カードの「!」バッジとホームバナー「まだ ♂♀ をきめてない とくべつな虫が N匹 いるよ」の O(1) 判定に使用
- 起動時に再計算可能だが、Phase 6 で必須化する

## レア度別コスト・育成必要数

| レアリティ | tier | かけらコスト | 必要正解数 | 期間目安(30問/日) |
|---|---:|---:|---:|---:|
| N | 0 | 20 | 10 | 半日 |
| R | 1 | 60 | 30 | 1日 |
| SR | 2 | 200 | 100 | 3-4日 |
| SSR | 3 | 600 | 300 | 10日 |
| SS | 4 | 2000 | 1000 | 1か月 |

種に依存せず、レア度のみで決定 → 公平。

実装: `eggCost(sp) = [20,60,200,600,2000][tierOf(sp)]` / `eggTarget(sp) = [10,30,100,300,1000][tierOf(sp)]`。
`spendForEgg(coll, sp)` が `fossilFragmentsStore.spend(eggCost(sp))` を内部で呼ぶ。
進捗表示は分母明示形式「+1 (16/30)」「+1 (290/300)」に統一。

`egg.target` は生成時に固定して記録するため、Phase 8 でテーブルを調整しても既存卵は元の値を維持 (backfill 対象外)。テーブル下方修正で `progress >= target` となった既存卵はそのまま「✨ かえる準備OK！」動線に乗せ、コスト差分返金はしない。

## 完全変態 vs 不完全変態の整合

### `bugs.js` 拡張

```js
// shared/bugs.js 冒頭 (L37 付近)
var METAMORPHOSIS_BY_ORDER = {
  // 完全変態
  Coleoptera:    'complete',
  Lepidoptera:   'complete',
  Hymenoptera:   'complete',
  Diptera:       'complete',
  Megaloptera:   'complete',
  Neuroptera:    'complete',
  Trichoptera:   'complete',
  // 不完全変態
  Orthoptera:    'incomplete',
  Hemiptera:     'incomplete',
  Odonata:       'incomplete',
  Mantodea:      'incomplete',
  Blattodea:     'incomplete',
  Phasmatodea:   'incomplete',
};
// bug() ヘルパ内で派生:
//   metamorphosis: METAMORPHOSIS_BY_ORDER[o.order]  // undefined 許容
```

- bug() ヘルパで order から派生 (orderJa と同じ pattern)。`undefined` 許容により非該当 order を安全に扱う
- 卵対象外の order (Scorpiones / Araneae / Anura / Squamata / Passeriformes / Scolopendromorpha / Scutigeromorpha / Isopoda 等) は `metamorphosis` を付与しない → `canLayEgg()` で除外
- 計画書から削除: 実データに 0 件の order (Mecoptera / Siphonaptera / Dermaptera / Plecoptera / Isoptera) と二分法に該当しない非昆虫 (Scorpiones / Araneae)
- 未知 order に対して bug() 内で警告を出す (silent default を避ける)

### ステージアイコン

| ステージ | デフォルト絵文字 | archetype SVG |
|---|---|---|
| egg | 🥚 | 共通 (`assets/larva_svg/egg.svg`) |
| larva (幼虫・芋虫) | 🐛 | archetype 別 (例: `koganemushi.svg`) |
| pupa (蛹) | 🛌 | archetype 別 (例: `kabuto_pupa.svg`) |
| nymph (若虫) | 🦗 | archetype 別 (例: `yago.svg`) |
| adult (成虫) | — | 親の通常 SVG |

archetype SVG が未制作の場合は絵文字 fallback で動作する。詳細は次セクション「視覚資産: archetype 方式」を参照。

### 進捗→ステージ変換

```js
function currentStage(egg, sp){
  var ratio = egg.progress / egg.target;
  if(sp.metamorphosis === 'complete'){          // 4段階
    if(ratio < 0.25) return 'egg';
    if(ratio < 0.5)  return 'larva';
    if(ratio < 0.85) return 'pupa';
    return 'adult';
  } else {                                       // 3段階 (incomplete)
    if(ratio < 0.35) return 'egg';
    if(ratio < 0.85) return 'nymph';
    return 'adult';
  }
}
```

- 公平: 必要正解数は同じ、演出だけ違う
- 完全変態は「さなぎ期間」が長く、ある瞬間に成虫化のドラマ
- 不完全変態は「幼虫期間」が長く、徐々に大きくなる印象

## 視覚資産: archetype 方式

1200 種ごとに個別 SVG を作らず、**~25 種類の "育成形態 archetype"** を共通アセットとして用意する。
各 bug は `order`/`family`/`subfamily` から `larvaType` / `nymphType` / `pupaType` を自動アサインする。

### archetype 一覧 (初期セット)

完全変態 (larva + pupa):

| archetype | 説明 | 対象群 |
|---|---|---|
| `koganemushi` | コガネムシ型幼虫 (C字曲) | Scarabaeoidea (Scarabaeidae / Lucanidae 等) |
| `kuwagata` | クワガタ型幼虫 | Lucanidae (再分類で `koganemushi` と差別化したい場合) |
| `kamikiri` | カミキリ型幼虫 (elongate, 木質食) | Cerambycidae |
| `zoumushi` | ゾウムシ型幼虫 (小型曲) | Curculionoidea |
| `mizu_kouchu` | 水生甲虫型幼虫 | Dytiscidae / Gyrinidae |
| `imomushi` | イモムシ型 (蝶蛾の典型) | Lepidoptera (既定) |
| `kemushi` | 毛虫型 (有毛) | Lepidoptera (ドクガ・ヒトリガ等) |
| `hachi` | ハチ型幼虫 (白色蜂児) | Hymenoptera |
| `uji` | ウジ型 | Diptera |
| `kabuto_pupa` | 甲虫蛹 (土繭タイプ) | Coleoptera 全般 |
| `chou_pupa` | 蝶蛹 (角あり) | Lepidoptera (チョウ) |
| `ga_pupa` | 蛾蛹 (繭の中) | Lepidoptera (ガ) |
| `hachi_pupa` | ハチ蛹 | Hymenoptera / Diptera |

不完全変態 (nymph):

| archetype | 説明 | 対象群 |
|---|---|---|
| `yago` | ヤゴ型 | Odonata (トンボ・イトトンボ) |
| `batta` | バッタ型若虫 (親の縮小) | Orthoptera (既定) |
| `kamakiri` | カマキリ型若虫 | Mantodea |
| `semi` | セミ型幼虫 (地中型) | Cicadidae |
| `kamemushi_nymph` | カメムシ型若虫 | Hemiptera (Heteroptera 系、将来) |
| `gokiburi` | ゴキブリ型若虫 | Blattodea (将来) |

共通:

| archetype | 説明 |
|---|---|
| `egg` | 卵 (共通) |

### アサイン規則

```js
// shared/bug_archetypes.js (新規)
// 優先度の高い順に評価 (subfamily → family → superfamily → order)
var ARCHETYPE_RULES = [
  // 完全変態
  {match: {family: 'Scarabaeidae'},        larva: 'koganemushi', pupa: 'kabuto_pupa'},
  {match: {family: 'Lucanidae'},           larva: 'kuwagata',    pupa: 'kabuto_pupa'},
  {match: {family: 'Cerambycidae'},        larva: 'kamikiri',    pupa: 'kabuto_pupa'},
  {match: {superfamily: 'Curculionoidea'}, larva: 'zoumushi',    pupa: 'kabuto_pupa'},
  {match: {family: 'Dytiscidae'},          larva: 'mizu_kouchu', pupa: 'kabuto_pupa'},
  {match: {family: 'Gyrinidae'},           larva: 'mizu_kouchu', pupa: 'kabuto_pupa'},
  {match: {order: 'Coleoptera'},           larva: 'koganemushi', pupa: 'kabuto_pupa'}, // 既定
  {match: {order: 'Lepidoptera', hairy: true}, larva: 'kemushi', pupa: 'ga_pupa'},
  {match: {order: 'Lepidoptera', clade: 'moth'}, larva: 'imomushi', pupa: 'ga_pupa'},
  {match: {order: 'Lepidoptera'},          larva: 'imomushi',    pupa: 'chou_pupa'}, // 蝶
  {match: {order: 'Hymenoptera'},          larva: 'hachi',       pupa: 'hachi_pupa'},
  {match: {order: 'Diptera'},              larva: 'uji',         pupa: 'hachi_pupa'},
  // 不完全変態
  {match: {order: 'Odonata'},              nymph: 'yago'},
  {match: {order: 'Mantodea'},             nymph: 'kamakiri'},
  {match: {family: 'Cicadidae'},           nymph: 'semi'},
  {match: {order: 'Hemiptera'},            nymph: 'kamemushi_nymph'},
  {match: {order: 'Blattodea'},            nymph: 'gokiburi'},
  {match: {order: 'Orthoptera'},           nymph: 'batta'}, // 既定
];

function archetypesFor(sp){
  for (var i=0; i<ARCHETYPE_RULES.length; i++){
    var r = ARCHETYPE_RULES[i];
    if (matchSp(sp, r.match)) return {larva: r.larva, pupa: r.pupa, nymph: r.nymph};
  }
  return {larva: 'imomushi', pupa: 'kabuto_pupa', nymph: 'batta'}; // 全 fallback
}
```

### 利点

- アセット数: 1200 → ~25 (98% 削減)
- 子供の認知単位として archetype は記憶しやすい
- 「親の縮小版SVG」案より生物学的に正確

### 制作分担

- Phase 1 で `shared/bug_archetypes.js` lookup と `assets/larva_svg/` ディレクトリの枠だけ作る
- Phase 1 〜 6 は絵文字 (`🐛`/`🛌`/`🦗`) fallback で動作する
- Phase 6.5 で ~25 archetype SVG を一括制作 (既存図鑑カードの style と整合させる)
- archetype は固定色 (種代表色のパラメトリック適用は将来検討)
- archetype 未マッチ種への fallback は `imomushi` + `kabuto_pupa` + `batta` で開始 (Phase 8 で見直し)

## フロー

### A. 通常虫の卵生成

- **トリガー**: 図鑑詳細モーダル「🥚 たまごを 産ませる」 (導線①) または ホーム画面「+」スロット → 卵選択モーダル (導線②)
- **前提** (`canLayEgg(sp)`):
  - `records.some(r => r.sex === 'm')` かつ `records.some(r => r.sex === 'f')` (♂と♀をそれぞれ 1 個体以上記録済み)
  - `fossilFragmentsStore.size() >= eggCost(sp)` (かけら充足)
  - `coll.eggs.length < 3` (同時育成上限未到達)
  - `coll.eggs.every(e => e.id !== sp.id)` (同種育成中でない)
- **処理**: `spendForEgg(coll, sp)` でかけら消費 → `sex = rollSex(sp)` / `shiny = rollShiny()` を生成時抽選 → `coll.eggs.push({...})`
- **UI 状態遷移**:
  - 前提未充足時の表示方針を両導線で共通化 — かけら不足 / 同種育成中 / 上限到達はいずれも **disabled + 理由表示** (ボタン非表示にしない)
  - コスト確認ダイアログのキャンセル → 直前のモーダルに戻る (ホームには戻らない)
  - 産卵成功 → コスト確認ダイアログを閉じる → 直前のモーダルも閉じてホームに戻り、該当卵カードでハイライト演出
  - 二重押下防止: 確定ボタンは押下後 disabled

### B. マスター虫の新規達成

- **トリガー**: 既存の全習得判定
- **UI**: 「♂♀どちらにする?」モーダル
- **選択結果**:
  - 選んだ性別の成虫を授与 (`catches` に追加、`records` にも `reared:false` で記録)
  - **空きあり** (`coll.eggs.length < 3`): 反対性別の卵を `coll.eggs` に追加 (`origin: "master_pair"`)
  - **3枠満杯**: 反対性別の卵を `coll.pendingEggs` に追加 → ホーム通知バナーで受け取り誘導
- **キャンセル時挙動** (モーダル外タップ / X / OS back):
  - 既存の `awardMaster()` と同じく `sex='u'`, `size=max` で仮授与 → C のレガシー救済フローに自動フォールバック
  - 卵は授与しない (二重授与防止)
  - 図鑑カードに「!」バッジが点灯し、`coll.masterPending` に記録
- **コスト**: かけら消費なし (達成自体が対価)

### B'. ボス昆虫の段階的アンロック (案D 採用)

- **天敵 (predator:true) は対象外** (モズ・サソリ・クモ等は戦闘特化、卵対象外)。`bossKillReward()` 入口で `if(spById(spId)?.predator) return null;` (defence-in-depth)
- 通常ボス (predator:false) のみ対象
- **報酬ルール**:
  - **1回撃破**: 個体1匹を授与 (sex はランダム)、`records` に追加。`bossesMap[spId] = {n:1, firstSex: rolledSex}` を保存
  - **10回撃破**: **反対性別 (`firstSex` の反対) の「卵」**を授与
    - 空きあり: `coll.eggs` に直接追加 (`origin: "boss_pair"`)
    - 3枠満杯 or 同種育成中: `coll.pendingEggs` に積む
  - **11回目以降**: 通常戦闘報酬のみ (再卵発火なし。生涯1卵)
- **進捗表示**:
  - 9回目撃破後: 状況分岐
    - 通常: 「あと1回で たまごが もらえるよ」
    - 上限到達: 「あと1回! でも いま たまごが いっぱい (3/3)。1ぴき かえすと もらえるよ」
    - 同種育成中: 「あと1回! ○○ を そだて終わると もらえるよ」
  - 図鑑のボス昆虫節に「10回撃破で 反対せいべつの たまごが もらえるよ」を明記
- **マスター虫との難易度関係**:
  - マスター虫: 全習得という長期学習 + ♂♀選択 + SS=1000問の育成
  - ボス昆虫: 10回撃破 (再戦可能) で卵入手
  - → マスター虫の方が時間/努力がかかる (格上)
- **コスト**: かけら消費なし (撃破自体が対価)

### C. レガシーマスター虫の救済

- **トリガー**: 図鑑詳細を開く
- **検出**: `sp.masterOnly && entry.records.every(r => r.sex === 'u')`
- **UI**: 「♂♀をきめる」ボタン → Bと同じフロー (`setMasterSex(coll, sp, chosen)`)
- **副作用**: 既存個体の sex を in-place 更新 + 反対性別の卵を `coll.eggs` または `coll.pendingEggs` に追加
- **キャンセル時挙動**: 何もしない (`sex='u'` のままなのでボタンは次回開いたとき再表示)
- **冪等ガード**: `setMasterSex` 内で「`coll.eggs` または `coll.pendingEggs` に同 id の `master_pair` 卵が既に存在する場合は卵授与をスキップして sex 確定のみ」を実装
- **コスト**: かけら消費なし

### D. 育成 (学習問題正解で +1)

- **トリガー**: 各教科の問題正解時
- **処理**: `Q4BReward.feedEgg(currentGame)` を呼ぶ (eggStore 経由で 3教科共通の eggs にアクセス)
- **ロジック**: `eggStore.get().eggs.filter(e => e.game === currentGame)` の卵だけ progress +1
- **同教科の卵が複数並ぶ場合**: 全て +1 (3倍効率は子供の戦略性として許容、原則 4 を強制しない)
- **UI**: 正解フィードバックに「🥚 +1 (該当種 progress/target)」を表示。表示順は **孵化準備済優先 → progress 高い順**
- **「いま かえす?」ボタン**: 該当種が孵化準備済になった瞬間に、リザルト UI に「いま かえす?」ホーム遷移ボタンを併設

### E. 孵化

- **トリガー**: `progress >= target` → ホーム卵カードが発光 + カード内「✨ タップでかえす」CTA ボタンが出現
- **副導線**: 該当種の図鑑詳細モーダル経由でも孵化できる (放置救済のため)
- **commit 順序**: タップ時に下記処理 + `save()` を**同期実行** → 完了後にアニメ再生 (アニメ中の離脱でもロールバックなし)
- **処理**:
  - `size = rollSize(sp, egg.sex)`
  - `records.push({d:today, s:size, sex:egg.sex, shiny:egg.shiny, reared:true, bornAt:egg.bornAt})`
  - `catches[id].n += 1` / `max` / `min` / `shiny` / `normal` を更新
  - eggStore から該当卵を削除
  - `coll.total += 1`
  - `coll.pendingEggs[0]` があれば自動的に `coll.eggs` の空きへ転送 (もしくはホーム通知バナーでユーザが受け取る)
- **アニメ完了後の遷移**: 「[図鑑で みる]」ボタンで該当種の図鑑詳細モーダルを開く (ホーム画面経由) / 「[とじる]」でホーム
- **自動孵化**: 採用しない (放置でデータロスは無いが、新規産卵はブロックされ続ける)。これは明示的な仕様

## UI 設計

### ホーム画面 - 育成中の卵カード (空きスロットあり)
```
┌──────────────────────────────┐
│ 🥚 そだてている むし (1/3)    │
│ ┌──────┬──────┬──────┐      │
│ │  🐛  │  ＋  │  ＋  │      │ ← 空きスロットは「+」
│ │ヘラクレス│新しい │新しい │      │
│ │   ♂  │ たまご│ たまご│      │
│ │▓░░░░░│        │      │      │
│ │160/1000│      │      │      │
│ │🔵計算│        │      │      │
│ │完全変態│        │      │      │
│ └──────┴──────┴──────┘      │
│ もんだいに せいかいすると      │
│  それぞれの 教科で そだつよ   │
└──────────────────────────────┘
```
- 卵 0 個でも「+」スロット3個分は表示 (新規ユーザに産卵を促す)
- 育成中卵カード: 該当種の図鑑詳細モーダルをホーム内で表示 (画面遷移なし、`openZukanDetail(id, {scrollTo:'reared'})` で reared セクション scrollIntoView)
- 「+」スロット: **卵選択モーダル**を起動 (後述)
- 上限3に達したら「+」は**非表示**に統一 (グレーアウト案は採用しない)
- 「あと N問！」が孵化準備近づくと強調
- 孵化準備済 (`progress >= target`): 該当卵カード自体を発光させ、カード内に「✨ タップでかえす」CTA ボタンを表示。複数準備済みでも各カード独立に表示
- 保留卵がある場合: ホーム上部に通知バナー「○○ の たまごが まっているよ! 受けとる」を表示。タップで `coll.pendingEggs[0]` を `coll.eggs` の空きへ転送

### ホーム卵カード状態

| 状態 | 表示 |
|---|---|
| 0/3 (新規ユーザ) | 「+」スロット3個 |
| 1/3, 2/3 | 育成中カード + 「+」スロット (残り分) |
| 3/3 (満杯) | 育成中カードのみ、「+」非表示 |
| 1個 孵化準備済 | 該当カード発光 + 「✨ タップでかえす」CTA + 他の育成中/+/保留通知バナー |
| 保留卵あり | カード状態 + 通知バナー上部表示 |

### 卵選択モーダル (ホーム画面の「+」から呼び出し)
```
┌──────────────────────────────┐
│ 🥚 どの たまごを 産ませる？     │
│ 持ってる かけら: 🔶 1200      │
├──────────────────────────────┤
│ 🔍 けんさく                    │
│ [タイプ]🟣漢字 🔵計算 🟢英語  │
│ [レア度]N R SR SSR SS         │
├──────────────────────────────┤
│ ✅ 産卵できる虫 (♂♀あり):     │
│ ┌────┬─────────────────────┐ │
│ │SVG │カブトムシ            │ │
│ │ 🟣 │レア / 30問           │ │
│ │   │コスト 🔶 60           │ │
│ │   │♂5 / ♀2 持ってる      │ │
│ └────┴─────────────────────┘ │
│ ┌────┬─────────────────────┐ │
│ │SVG │ヘラクレスオオカブト   │ │
│ │ 🟣 │でんせつ / 1000問     │ │
│ │   │コスト 🔶 2000        │ │
│ │   │♂3 / ♀1 持ってる      │ │
│ │   │※ かけらが たりない    │ │ ← disabled
│ └────┴─────────────────────┘ │
│ ┌────┬─────────────────────┐ │
│ │SVG │オオクワガタ           │ │
│ │ 🟣 │ウルトラレア / 300問   │ │
│ │   │同種育成中             │ │ ← disabled
│ └────┴─────────────────────┘ │
└──────────────────────────────┘
```
- 本モーダルは**産卵アクション専用導線**。図鑑フィルタ「🥚 産める」(原則13) は探索時の絞り込み補助。両者は同じ `canLayEgg` を共有するが、UI 責務 (探索 vs アクション) が異なる
- 産卵可能な種だけ表示 (♂と♀をそれぞれ 1 個体以上記録済み)
- ソート: タイプ別/レア度別、お気に入り優先
- 各種で disabled 理由を表示 (かけら不足/同種育成中/上限到達)
- タップ → コスト確認ダイアログ → 産卵

#### 空状態の文言

| 状態 | 文言 | アクション |
|---|---|---|
| `layableSpecies(coll)` が空 (♂♀ なし) | 「まだ ♂♀ の そろった むしが いないよ。図鑑で ♂♀ 両方つかまえると たまごが 産めるよ」 | [図鑑へ] |
| 全種かけら不足 | 「かけらが たりないよ。学習で あつめよう」 | [学習画面へ] |
| 全種が同種育成中 | 「いま 3つとも たまご そだち中だよ」 | [とじる] |
| 上限到達で開いた | (そもそも + が非表示なのでこの状態には到達しない) | — |

### 図鑑フィルタチップ (拡張)

```
[ぜんぶ] [でんせつ] [ウルトラ] [スーパー] [レア] [ノーマル]
[♥ おきにいり] [✨ いろちがい] [🐣 そだてた子] [🥚 産める]
```

**色定義表** (フィルタ全集合の正本):

| チップ | アイコン | 色 |
|---|---|---|
| お気に入り | ♥ | ピンク #ff7aa2 |
| いろちがい | ✨ | アンバー #f5b800 |
| そだてた子 | 🐣 | 緑 #4a9b3a |
| 産める | 🥚 | 黄 #FFB84A |

「🐣 そだてた子」フィルタ ON → `records.some(r => r.reared)` が真の種だけ表示
「🥚 産める」フィルタ ON → `canLayEgg(sp)` が真の種だけ表示

### 学習画面の正解フィードバック

```
┌────────────────────────────┐
│ ⭕ せいかい！                │
│ 「いちにち」                 │
│ ────────────────────────── │
│ 🥚 そだち中:                 │
│  🛌 オオクワガタ +1 (290/300)│  ← 孵化準備に近い (先に表示、SSR=300)
│  🐛 ヘラクレス  +1 (160/1000)│  ← progress 順 (SS=1000)
│    ✨ かえる準備OK！[いま かえす?]│  ← 該当時 CTA 併設 (準備済の卵のみ)
│ ────────────────────────── │
│ つぎへ →                     │
└────────────────────────────┘
```

- 該当教科の卵だけ表示 (`egg.game === currentGame`)
- 表示順: **孵化準備済優先 → progress 高い順**
- 孵化準備済みは「✨ かえる準備OK!」バッジ + 「いま かえす?」ホーム遷移ボタンを併設

### 図鑑カード (一覧) - そだてた子マーク

```
[虫アート]
カブトムシ✨
レア
35〜85mm
                    ♥ 🐣  ← 右上 (♥お気に入り, 🐣 自家育成歴あり)
```

- 判定: `records.some(r => r.reared)`
- レガシーマスター虫で `records.every(r => r.sex==='u')` の場合は右上に「!」バッジを追加表示 (C フローへの誘導)

### マスター虫/でんせつ虫の詳細モーダル表示条件 (改修)

**現状**: `Q4BZukan.detailHTML` は通常虫詳細でしか呼ばれていない。マスター虫詳細では独自に静的 HTML を構築。

**改修方針**:
```js
// shared/zukan_detail.js: detailHTML 冒頭分岐
function detailHTML(entry, sp, opts){
  ...backfill...
  var records = entry.records || [];
  
  // sex='u' のスタブ表示 (レガシーマスター虫 救済 UI)
  var allUnknownSex = records.length>=1 && records.every(r => r.sex === 'u');
  if(allUnknownSex){
    return masterStubHTML(entry, sp, opts);  // ♂♀ をきめるボタン主体
  }
  
  // sex 確定済みなら records=1 でも通常の全機能を出す
  // masterOnly 種は通常 detailHTML 上部にも 🎓 マスター達成記念バッジを常時表示
  ...通常 detailHTML (sp.masterOnly なら 🎓 バッジ付き)...
}
```

**3画面の master モーダル改修** (各1行 concat):
```js
// kanji/index.html: openKanjiMasterBug
inner += (window.Q4BZukan ? Q4BZukan.detailHTML(rec, sp, {coll:ST.coll, favCallback:'kanjiFavTap', saveFn:saveST, onPickSex:'kanjiPickMasterSex'}) : '');
// keisan/app.js: openMasterBugK 同様
// eitango/index.html: openMasterBugE 同様
```

**masterStubHTML 仕様** (sex='u' 限定):
- 🎓 マスター達成記念バッジ (新規達成パス・レガシー救済パス両方で見せる)
- `jaName`, レア度名
- 「つかまえた おおきさ: max mm」
- 「♂♀ をきめる」ボタン
  - `onPickSex` を `opts.onPickSex` (window 直下の関数名 string) として受け取り、`'<button onclick="'+opts.onPickSex+'(\''+sp.id+'\')">♂♀ をきめる</button>'` のように展開
  - 押下 → `setMasterSex(spId, sex)` → `coll.catches[spId].records[0].sex` 更新 + `saveFn` 呼び出し → モーダルを `closeModal()` → `openKanjiMasterBug()` 等で再描画して通常 detailHTML に切替

**ボス昆虫の詳細表示** (zukan_detail.js は流用しない):
- `shared/boss_zukan.js` 内に専用 stats セクションを追加
- 表示内容: 撃破回数 / 初回撃破日 / shiny 取得日 / 「あと N 回で たまごが もらえるよ」進捗 / 連勝記録 / **保留卵スロット** (`coll.pendingEggs` に該当 boss_pair 卵があれば「○○ の たまごが まっているよ」)
- ヒストグラム機能は不要 (戦闘特化)

### 詳細モーダル - 「そだてた子」セクション

```
[虫アート]
ヘラクレスオオカブト             ♥ 🎓 (右上、♥お気に入り + 🎓 マスター達成)
♂5 / ♀3
[2x2 ベスト表]
─────────────────────────────
🐣 きみが そだてた子: 2匹
 🐛→🛌→🪲 ♂ 178mm
   2026-06-12 産卵 → 06-25 孵化
   (13日間育成)
 🐛→🛌→🪲 ♀ 71mm
   2026-06-20 産卵 → 07-05 孵化
─────────────────────────────
[サイズ分布グラフ] ← 育成個体は ★ オーバーレイ
[最近5件の表] ← 🐣 マーク付き行は太字背景色
🥚 たまごを 産ませる (🔶 2000) ← 前提クリア時のみ (disabled+理由は前提未充足時、ヘラクレス=SS のコスト)
🥚 たまごを すてる ← 当該種の育成中卵がある時のみ表示 (2 段階要確認、返金なし)
```

### 孵化アニメーション

```
   🥚  →  🐛  →  🛌  →  🪲  (4段階、完全変態)
   🥚  →  🐛  →       🪲   (3段階、不完全変態)

  ✨ かえったよ！ ✨

  ヘラクレスオオカブト ♂
  178mm
  🐣 きみが 13日間 そだてた 特別な子だよ

  [図鑑で みる] [とじる]
```

- 「[図鑑で みる]」: 該当虫の図鑑詳細モーダルを開く (ホーム経由で `openZukanDetail(id)`)
- 「[とじる]」: ホーム画面に戻る

## 新規 API (shared/reward.js)

### sex / shiny / size 確定タイミングの集約

| field | 確定タイミング | 格納先 | 決定方法 |
|---|---|---|---|
| sex | 生成時 | `egg.sex` | layEgg=`rollSex(sp)` / awardMasterEgg=引数の反対性別固定 / bossKillReward 卵=`firstSex` の反対 |
| shiny | 生成時 | `egg.shiny` | `rollShiny()` (`SHINY_CHANCE` = 3%) を全 API 共通で適用 |
| size | 孵化時 | `records[i].s` | `rollSize(sp, egg.sex)` |

### 関数定義

```js
// レア度→必要正解数 / かけらコスト
function eggTarget(sp){ return [10,30,100,300,1000][tierOf(sp)]; }
function eggCost(sp){ return [20,60,200,600,2000][tierOf(sp)]; }

// 教科決定 (masterOnly は sp.master.game を優先)
function eggGameFor(sp){
  if (sp.masterOnly && sp.master && sp.master.game) {
    if (sp.master.game === 'grand') return 'kanji'; // 既定 (Phase 8 で見直し)
    return sp.master.game;
  }
  return Q4BReward.gameFor(sp);
}

// かけら消費ラッパー (両導線で共通使用)
function spendForEgg(coll, sp){
  return fossilFragmentsStore.spend(eggCost(sp));
}

// eggStore (breeding namespace shared kv へのアクセサ、amberStore と同形)
function setEggStore(store){ _eggStore = store; }
// store = { get(), set(state), add(egg), remove(id), size() }

// 卵を産ませる (前提チェック含む)
function layEgg(coll, sp){
  if (!canLayEgg(coll, sp)) return null;
  if (!spendForEgg(coll, sp)) return null;
  var egg = {
    id: sp.id,
    sex: rollSex(sp),
    progress: 0,
    target: eggTarget(sp),
    game: eggGameFor(sp),
    origin: 'lay',
    bornAt: todayStr(),
    shiny: rollShiny(),
  };
  _eggStore.add(egg);
  return egg;
}

// マスター卵を授与 (空きあり → eggs、満杯 → pendingEggs)
// amber/かけら消費なし (達成自体が対価)
function awardMasterEgg(coll, sp, sex){
  // 冪等ガード: 既に同 id の master_pair 卵があれば skip
  var existing = _eggStore.get();
  if (existing.eggs.some(e => e.id === sp.id && e.origin === 'master_pair')) return null;
  if (existing.pendingEggs.some(e => e.id === sp.id && e.origin === 'master_pair')) return null;
  var egg = {
    id: sp.id,
    sex: sex,
    progress: 0,
    target: eggTarget(sp),
    game: eggGameFor(sp),
    origin: 'master_pair',
    bornAt: todayStr(),
    shiny: rollShiny(),
  };
  if (existing.eggs.length < 3) {
    _eggStore.add(egg);
  } else {
    egg.queuedAt = todayStr();
    _eggStore.queue(egg);  // pendingEggs に積む
  }
  return egg;
}

// 学習問題正解で該当教科の卵 +1 (全卵対象、3倍効率は戦略性として許容)
function feedEgg(game){
  var state = _eggStore.get();
  state.eggs.filter(e => e.game === game).forEach(e => { e.progress += 1; });
  _eggStore.set(state);
}

// 卵を孵化 → 成虫化 (id ベース、同期不一致時 silent no-op)
function hatchEgg(coll, id){
  var state = _eggStore.get();
  var egg = state.eggs.find(e => e.id === id);
  if (!egg) return null;
  if (egg.progress < egg.target) return null;
  var sp = spById(id);
  var size = rollSize(sp, egg.sex);
  record(coll, sp, {
    size: size, sex: egg.sex, shiny: egg.shiny,
    reared: true, bornAt: egg.bornAt,
  });
  _eggStore.remove(id);
  // 保留卵があれば空き枠に転送 (ホームバナーで明示通知して受け取り)
  return { egg: egg, size: size };
}

// マスター虫の性別を確定 (レガシー救済 + 新規達成共用)
// in-place 更新、awardMaster は呼ばない (冪等ガード回避)
function setMasterSex(coll, sp, chosen){
  var e = coll.catches[sp.id];
  if (!e || !e.records || !e.records.length) return;
  e.records[0].sex = chosen;
  // sizeBySexMm が定義された種では size 再抽選 + max/min 更新
  if (sp.sizeBySexMm) {
    e.records[0].s = rollSize(sp, chosen);
    e.max = e.records[0].s;
    e.min = e.records[0].s;
  }
  // max/min/normal/master カウンタは保持
  // 反対性別の卵を授与 (eggs または pendingEggs)
  awardMasterEgg(coll, sp, chosen === 'm' ? 'f' : 'm');
}

// reared 判定
function hasReared(coll, id){
  var e = coll.catches[id];
  return !!(e && e.records && e.records.some(r => r.reared));
}
function rearedRecords(coll, id){
  var e = coll.catches[id];
  return e && e.records ? e.records.filter(r => r.reared) : [];
}

// 産卵可能判定 (♂と♀をそれぞれ 1 個体以上 + 上限到達でない + 同種育成中でない + 卵対象 order)
function canLayEgg(coll, sp){
  if (!sp.metamorphosis) return false; // 卵対象外 order (Scorpiones/Araneae/Anura 等)
  var e = coll.catches[sp.id];
  if (!e || !e.records) return false;
  var hasM = e.records.some(r => r.sex === 'm');
  var hasF = e.records.some(r => r.sex === 'f');
  if (!(hasM && hasF)) return false;
  var state = _eggStore.get();
  if (state.eggs.length >= 3) return false;
  if (state.eggs.some(eg => eg.id === sp.id)) return false;
  if (state.pendingEggs.some(eg => eg.id === sp.id)) return false; // 保留中も除外
  if (fossilFragmentsStore.size() < eggCost(sp)) return false;
  return true;
}

// 産卵可能種のリスト (各画面のフィルタ・卵選択モーダル用)
function layableSpecies(coll){
  return BUGS.filter(sp => canLayEgg(coll, sp));
}

// ボス撃破時の報酬計算 (案D 段階的アンロック)
function bossKillReward(spId, bossesMap){
  if (spById(spId)?.predator) return null; // 天敵は卵対象外 (defence-in-depth)
  bossesMap[spId] = bossesMap[spId] || {n:0};
  bossesMap[spId].n += 1;
  var n = bossesMap[spId].n;
  if (n === 1) {
    var firstSex = rollSex(spById(spId));
    bossesMap[spId].firstSex = firstSex;
    return {kind:'specimen', sex: firstSex};
  }
  if (n === 10) {
    var firstSex = bossesMap[spId].firstSex;
    return {kind:'egg', sex: firstSex === 'm' ? 'f' : 'm'};
  }
  return null;   // 11回目以降は通常戦闘報酬のみ (再卵発火なし)
}
```

## 既存 API の改修

### `awardMaster()`
- 旧: `sex='u'`, `size=max` 固定
- 新: 引数で chosen sex を受け取り、size を `rollSize(sp, sex)` で抽選
- レガシーデータは `setMasterSex()` で個別に救済 (ユーザ操作)
- JSDoc で `awardMasterEgg` との役割差を明示 (こちらは通常授与、後者は卵生成)

### `record()` (通常採集)
- 引数に `reared:bool` オプション追加 (false 既定)
- 自家育成と通常採集を区別

### `Q4BReward.gameFor(sp)` (既存)
- 種の order/分類から `"kanji" | "keisan" | "eitango"` を返す既存関数
- 本機能では `eggGameFor(sp)` が内部で呼び出し、masterOnly 種は `sp.master.game` を優先するラッパを通す
- `gameFor` 自体の改修は不要

## 既存ファイルへの変更箇所

| ファイル | 変更内容 |
|---|---|
| `shared/bugs.js` | bug() ヘルパで `METAMORPHOSIS_BY_ORDER` から派生 (orderJa と同 pattern)、未知 order は警告 |
| `shared/reward.js` | 上記新規 API (`eggGameFor` / `spendForEgg` / `setEggStore` / `layEgg` / `feedEgg` / `hatchEgg(id)` / `awardMasterEgg` / `setMasterSex` / `bossKillReward` / `canLayEgg` / `layableSpecies` / `hasReared` / `rearedRecords`) + `awardMaster` 改修 + `record` 改修 |
| `shared/storage.js` | `breeding` namespace shared kv の I/O (eggStore 実体)。`fossilFragments` namespace と同 pattern |
| `shared/zukan_detail.js` | detailHTML 冒頭分岐 + masterStubHTML + 🎓 バッジ + reared セクション + ヒストグラム★オーバーレイ + sexPreviewHTML 拡張 + bestTableHTML 拡張 |
| `shared/boss_zukan.js` | ボス専用詳細モーダルに stats セクション (撃破回数 / 初回撃破日 / shiny 取得日 / 卵獲得進捗 / 保留卵スロット / 連勝記録) を追加 |
| 新規: `shared/breeding.js` | 卵カード HTML ヘルパ (`mode: 'normal' \| 'kids'` 受領、kids 時は `Furi.ruby()` でルビ付与)、孵化アニメーション、卵選択モーダル |
| 新規: `shared/bug_archetypes.js` | archetype lookup (`ARCHETYPE_RULES` + `archetypesFor(sp)`) |
| 新規: `assets/larva_svg/` | ~25 archetype SVG (Phase 6.5 で集中制作、それまで絵文字 fallback) |
| `kanji/index.html` | フィルタ「🐣 そだてた子」「🥚 産める」追加 / カード 🐣 マーク / 正解時の卵フィードバック / 卵タップで自画面 detail modal 表示 / openZukanDetail 受け口 |
| `keisan/app.js` | 同上 (🌟 既使用との衝突回避のため 🐣 を使用) |
| `eitango/index.html` | 同上 |
| `index.html` (ホーム) | 卵育成カード追加 (新規)、保留卵バナー、レガシー sex='u' 通知バナー、共通 detailHTML mount (画面遷移なしで詳細モーダルを開ける受け口)、レガシーマスター虫の「!」バッジ呼び出し |
| `battle.html` | L1868 の `BATTLE.bosses[rew.speciesId]={n:1}` 上書きを削除し、`rew.first` ガード外で `bossKillReward(spId, BATTLE.bosses)` を毎回呼び出し。`{n:0}` 冪等初期化に統一 |

## 実装フェーズ

### Phase 1: データ基盤 + 監査反映 (3 時間)

1. `shared/bugs.js` に `METAMORPHOSIS_BY_ORDER` 定数追加、bug() で派生 (未知 order は警告)
2. `shared/storage.js` に `breeding` namespace shared kv を追加 (eggs / pendingEggs / stats を 1 blob で持つ)
3. `shared/reward.js` に egg API 群を追加 (`eggGameFor` / `spendForEgg` / `setEggStore` / `layEgg` / `feedEgg` / `hatchEgg(id)` / `awardMasterEgg` / `setMasterSex` / `bossKillReward` / `canLayEgg` / `layableSpecies` / `hasReared` / `rearedRecords`)
4. `record()` に `reared:bool` / `bornAt` オプション追加 (false 既定)
5. `awardMaster()` 改修 (chosen sex 抽選、size 抽選)
6. `coll.masterPending` キャッシュを必須化
7. `coll.stats.breeding = {totalAbandoned: 0}` 初期化
8. `shared/bug_archetypes.js` を新規作成 (lookup 関数だけ実装、SVG なしで絵文字 fallback)
9. `assets/larva_svg/` ディレクトリを枠だけ作成
10. **デバッグヘルパ**: `?debug=1` のとき `window.Q4BDebug = { setEggProgress(spId,n), forceHatchAll(), grantMasterEgg(spId,sex), simulateBossKills(spId,n), grantFragments(n) }` を expose (`reward.js` の既存 API を薄くラップ ~20 行)

### Phase 2: ホーム画面の卵カード (2 時間)

1. `shared/breeding.js` 作成 - 卵カード HTML ヘルパ (`mode: 'normal' | 'kids'` 受領)
2. `index.html` に「🥚 そだてている むし」カード追加
3. ステージ判定 (`currentStage`) / 進捗バー / タイプチップ / 完全変態 vs 不完全変態の表示
4. 卵タップで該当種の図鑑詳細をホーム内モーダルで表示 (`openZukanDetail(id, {scrollTo:'reared'})` で reared セクション scrollIntoView)
5. ホーム共通 detail modal mount を新設し、教科横断遷移なしで詳細モーダルを開ける動線を確立
6. 保留卵バナー実装 (`coll.pendingEggs[0]` を `coll.eggs` 空き枠に転送)
7. レガシー sex='u' 通知バナー実装 (`coll.masterPending` から件数を表示)

### Phase 3: 卵生成 UI と 2 つの導線 (2 時間)

1. 各画面の詳細モーダルに「🥚 たまごを 産ませる」ボタン (導線①)
2. 前提チェック (`canLayEgg`) + ボタン **disabled + 理由表示** (ボタン非表示にしない)
3. クリック → コスト確認ダイアログ → `layEgg(coll, sp)` → UI 更新 (二重押下防止)
4. ホーム画面の卵カードに空きスロット「+」表示 (導線②)、上限到達で非表示
5. 「+」タップで卵選択モーダル → 産卵可能種一覧 → 選択 → 産卵
6. 卵選択モーダルの空状態 3 種 (♂♀ 無し / かけら不足 / 全種育成中) のメッセージ + 遷移先を実装
7. 各画面のフィルタに「🥚 産める」チップ追加
8. 卵「すてる」UI (詳細モーダル内、当該種の育成中卵がある時のみ表示、2 段階要確認、`coll.stats.breeding.totalAbandoned++`)

### Phase 4: 学習中の +1 フィードバック (1.5 時間)

1. kanji/keisan/eitango の正解判定箇所に `feedEgg(currentGame)` 追加
2. 正解時のリザルト UI に該当教科の卵 +1 表示 (進捗 0/N 分母明示、孵化準備済優先 → progress 高い順)
3. 孵化準備済みは「✨ かえる準備OK！」バッジ + 「いま かえす?」ホーム遷移 CTA ボタン併設

### Phase 5: 孵化処理とアニメーション (1.5 時間)

1. ホーム画面の卵カード発光 + カード内「✨ タップでかえす」CTA でタップ孵化
2. **commit 順序**: タップ時に処理 + `save()` を同期実行 → 完了後にアニメ再生 (離脱でロールバックなし)
3. 4-3 段階アニメーション (完全変態 4 / 不完全変態 3、archetype SVG または絵文字 fallback)
4. 育成期間 (`d - bornAt`) 表示
5. 「🐣 きみが N 日間 そだてた 特別な子だよ」メッセージ
6. 「[図鑑で みる]」で該当種の詳細モーダルを開く (ホーム経由)
7. 図鑑詳細モーダル経由の孵化サブ導線も実装 (放置救済)

### Phase 6: マスター虫の性別選択 + ボス昆虫の段階的アンロック (2 時間)

**マスター虫**:
1. 新規達成時の「♂♀どちらにする?」モーダル
2. 選択 → 成虫授与 + `awardMasterEgg(coll, sp, opposite)` (空きなしなら pendingEggs)
3. キャンセル時は `sex='u'`, `size=max` で仮授与 → C フローへ自動フォールバック
4. masterOnly 種は通常 detailHTML 上部にも 🎓 マスター達成記念バッジを常時表示
5. レガシー検出: 詳細モーダルに `masterStubHTML` (`records.every(r=>r.sex==='u')` のみ)
6. 「♂♀をきめる」押下 → `setMasterSex(coll, sp, chosen)` → `closeModal` → 再描画で通常 detailHTML に切替
7. 図鑑カードに「!」バッジ (レガシー sex='u') を 3 画面で実装

**ボス昆虫** (天敵 `predator:true` は対象外):
1. `battle.html:1868` の `BATTLE.bosses[rew.speciesId]={n:1}` を削除し、`rew.first` ガード外で `bossKillReward(spId, BATTLE.bosses)` を毎回呼ぶ
2. `BATTLE.bosses[id] = BATTLE.bosses[id] || {n:0}` 冪等初期化に統一
3. 1 回撃破 → 個体 1 匹授与 (records に追加、`bossesMap[id].firstSex` に保存)
4. 10 回撃破 → 反対性別の「卵」を `coll.eggs` (空き) または `coll.pendingEggs` (満杯/同種育成中) に追加 (`origin:"boss_pair"`)
5. ボスバトル後の画面に「あと N 回で たまごが もらえるよ」進捗 (上限到達/同種育成中で分岐)
6. 図鑑のボス昆虫節の説明文に「10 回撃破で 反対せいべつの たまごが もらえるよ」追加
7. ボス専用詳細モーダル (`boss_zukan.js`) に撃破回数 / 卵獲得状況 / 保留卵スロットを表示
8. マイグレーション: 既存 `BATTLE.bosses[id].n=1` は過去撃破回数を表していないが、新規 kill から ++ する形で許容 (過去カウントは諦める)

### Phase 6.5: archetype SVG 制作 (2-3 時間)

1. ~25 archetype の SVG を制作 (`assets/larva_svg/koganemushi.svg` 等)
2. 既存図鑑カードの style と整合 (線画ベース、固定色)
3. 蛹 4 種 (`kabuto_pupa` / `chou_pupa` / `ga_pupa` / `hachi_pupa`) を含む
4. 共通 egg.svg (全種共通)
5. `shared/breeding.js` の卵カードと孵化アニメで SVG を参照 (絵文字 fallback は残す)
6. 種代表色のパラメトリック適用は将来検討

### Phase 7: 自家育成個体の特別表示 (1.5 時間)

1. `shared/zukan_detail.js` に sexPreviewHTML 拡張 / 「そだてた子」セクション
2. ヒストグラムバーに `reared:true` 個体の ★ オーバーレイ
3. 最近の記録テーブルで reared 行を太字+背景色強調
4. 図鑑カードに 🐣 マーク表示 (3 画面)
5. 図鑑フィルタに「🐣 そだてた子」チップ (3 画面)

### Phase 8: バランス調整 (継続)

1. コスト/必要数のチューニング (実プレイ後、`coll.stats.breeding.totalAbandoned` を指標化)
2. アニメーション細部の演出 (孵化時のキラキラ等、`prefers-reduced-motion` 配慮で `@media (prefers-reduced-motion: reduce)` 時はキラキラ停止フェードのみ)
3. 同時育成上限を 5 に緩和した場合の卵カード並べ替え (現状 3 で開始、Phase 8 で見直し)
4. `master.game='grand'` マスター虫の卵 game (現状 kanji 既定 → 様子見)
5. archetype 未マッチ種への fallback の妥当性検証 (`imomushi` + `kabuto_pupa` + `batta` で開始)

## マイグレーション

- **既存 catches データ**: 触らない (`backfillRecords` で対応済み)。legacy record には `reared`/`bornAt` の field 自体を追加せず、`hasReared`/`rearedRecords` は `undefined` を falsy 扱い → LWW 同期は安全 (既存 records への書き戻しなし)
- **既存マスター虫 (sex='u')**: Phase 6 でユーザが図鑑詳細モーダルを開いて選択 (`coll.masterPending` で「!」バッジ + ホームバナー通知)
- **既存 amber / fossilFragments**: そのまま使う (`fossilFragments` に「卵を産ませる」用途を追加)
- **既存 `BATTLE.bosses[id].n=1`**: 過去撃破回数を表していないが、新規 kill から ++ する形で許容 (過去カウントは諦める)。`bossKillReward()` 経由で `firstSex` フィールドが追加で書き込まれる
- **同期 (per-kv LWW)**: kv 粒度 (game/pid 単位) の LWW で field 単位の merge は行わない (後勝ち)。同一 game+pid を複数端末で同時編集した場合の競合は許容制約として明文化
  - `coll.eggs` / `coll.pendingEggs` / `coll.stats.breeding` は `breeding` namespace の別 kv に置くことで競合範囲を限定 (3 教科 coll とは別)
  - `coll.catches[].records[].bornAt` は既存メカニズムで透過対応
- **forward-compat**: `coll` の save パスは load → mutate → save の object 参照保持パターンで、field 列挙再構築を禁止 (旧 commit の sw キャッシュで新スキーマ save.json を load → push back しても eggs / bornAt が残存することを保証)
- **`appVersion` 埋め込み**: snapshotDoc に `appVersion` を埋め込み、旧端末で新スキーマ版を検出したら「古いバージョンで開いています」の banner を出す (将来実装)
- **save.json サイズ評価**: `bornAt` は `reared:true` 個体のみ ~30bytes/record、`coll.eggs` は max 3 個固定 (各 ~150bytes)、`coll.pendingEggs` も実用上 max ~5 個。長期プレイでも追加分は年間 ~1KB オーダーで 1MB 制限 ([[sync_architecture]] 参照) に対し充分余裕。kv ペイロード telemetry は将来導入候補

## エッジケース

### 卵を放棄
- 詳細モーダルに「🥚 たまごを すてる」ボタン (要確認 2 段階モーダル)
- 当該種の育成中卵がある時のみ表示
- かけらは返らない (慎重な選択を促す)
- `coll.stats.breeding.totalAbandoned` を +1 (Phase 8 のチューニング指標)

### 育成中の親個体が削除？
- 既存仕様で削除不可なので発生しない

### 同種の卵が同時に複数？
- 同時育成は 1 種 1 個まで (`canLayEgg` で前提チェック)
- 保留卵 (`pendingEggs`) にも同種があれば `canLayEgg` は false

### shiny 確率
- 卵から生まれる成虫も通常の `SHINY_CHANCE` (3%) を適用
- 卵生成時に shiny 抽選を確定 (生成時の運次第)
- shiny 確率変更の余地 (5% 等) は未決事項として保留

### マスター卵の shiny
- `master_pair` / `boss_pair` 卵も通常の `SHINY_CHANCE` 適用
- マスター達成時に授与する**成虫**の shiny は別途検討 (現状 0%、未決事項)

### 教科をまたぐ卵
- 種に固定 (`eggGameFor(sp)` で自動決定)
- 卵生成 UI で教科は選べない
- `master.game='grand'` (3 教科共通) のマスター虫は kanji 既定で開始 (Phase 8 で見直し)

### 育成中の卵が 3 個埋まっている時、孵化準備済みの卵を孵化せずに新規卵生成は?
- 上限到達でフロー A はブロック → 「先に かえそう」メッセージ
- フロー B/B'/C は `coll.pendingEggs` に保留 → ホームバナーで受け取り誘導

### `coll.pendingEggs` も満杯 (3 育成中 + N 保留中) の極端ケース
- 当面は `pendingEggs` の長さ上限を設けない (運用上 ~5 個以上は稀)
- 万一 10 個超えるなら UI で集約表示 (未決事項)

### 育成中卵のかけら返金
- 放棄時は返金しない (孵化失敗等のケースは存在しない)

### 天敵 (`predator:true`) のボス昆虫
- 卵対象外 (モズ・サソリ・クモ・カナヘビ等)
- `bossKillReward(spId, ...)` 入口で `if(spById(spId)?.predator) return null;` (defence-in-depth)
- 既存の `BATTLE.bosses[id].n` は初回フラグとして残し、卵は発火しない
- 図鑑詳細モーダルもヒストグラム機能なし、戦闘 stats のみ

### ボス昆虫 11 回目以降の撃破
- 追加報酬なし (通常の戦闘報酬 amber / かけら / PT のみ)
- 再卵発火なし (生涯 1 卵)
- 卵から増えた個体が成虫化した後は通常の卵生成 (`canLayEgg` 経由、高コスト) が解禁
  - メカニズム: 孵化→`records` に sex 追加→♂♀ペア成立→`canLayEgg` true

### 親個体の指定
- なし (種としてのペア成立判定のみ)
- 「どの個体とどの個体が親か」の記録は持たない
- 個体管理の複雑化を回避

### target テーブル変更時の既存卵扱い
- `egg.target` は生成時に固定して記録、後からテーブルが変わっても既存卵は元値を維持 (backfill 対象外)
- 新規卵から新 target を適用
- テーブル下方修正で `progress >= target` となった既存卵はそのまま「✨ かえる準備OK！」動線に乗せ、ユーザのタップで孵化 (自動孵化はしない)
- コスト未消費分の差分返金はしない

### マルチデバイス産卵競合
- per-kv LWW で `breeding` namespace の kv が後勝ち (field merge なし)
- 端末 A で `progress=80`、端末 B で `progress=60` を同時並行更新したら後発 push の state 全体が勝ち、progress が逆行する可能性
- 孵化済み (eggs から削除 + records 追加) と未孵化 (eggs に残存) を別端末で push する場合も後勝ち
- Phase 1 リリース後に実機検証、頻発するなら eggs を更に独立 kv へ分離

## 未決事項

- [x] ~~かけらコスト数値の最終決定~~ → 問題数 N=10/R=30/SR=100/SSR=300/SS=1000、コスト N=20/R=60/SR=200/SSR=600/SS=2000 で確定
- [x] ~~教科別係数の要否~~ → 不要で確定 (各教科 100 問/日単位で平均的)
- [x] ~~ボス昆虫の扱い~~ → 案D 段階的アンロック (1 回個体, 10 回卵) で確定
- [x] ~~天敵の扱い~~ → 卵対象外で確定
- [x] ~~3 枠満杯時の B/B'/C 卵の挙動~~ → `coll.pendingEggs[]` 保留キュー方式で確定
- [x] ~~卵コスト通貨~~ → `fossilFragments` (かせきのかけら) を再利用で確定
- [x] ~~視覚資産の用意方針~~ → archetype 方式 (~25 種で 1200 種カバー) で確定、Phase 6.5 で集中制作
- [x] ~~卵放棄時のかけら返金有無~~ → 返金なしで確定 (慎重な選択を促す)
- [ ] 卵生成時の shiny 確率を上げる (例: 5%) か維持 (3%) か
- [ ] マスター虫の初回授与で shiny 抽選するか (現状 0%)
- [ ] 孵化時の効果音 / メディア SE/BGM 5 フックの方針
  - (1) 産卵成功 (2) 学習中 +1 フィードバック (3) 孵化準備OK 通知 (4) 孵化完了 (5) 卵放棄
  - 各項目は「既存 SE 流用 / 新規 / 不要」の 3 択を Phase 8 で確定
- [ ] 同時育成上限を後で 5 に緩和する余地 (まず 3 でリリース、Phase 8 step 3 連動)
- [ ] ボス 11 回目以降の追加報酬 (将来検討、別 trigger 例 n===50 で別物を渡すか)
- [ ] `master.game='grand'` (3 教科共通) マスター虫の卵 game の最終決定 (3 教科平等抽選 / 固定既定 / kanji 既定)
- [ ] 卵カードの kana モード対応方針 (種名 jaName/kana、短縮表記語彙集合の登録)
- [ ] 種固有の幼虫/若虫アート (nymph/larva) を将来制作するか (現状は archetype + 絵文字 fallback)
- [ ] マルチデバイス並行運用時の `coll.eggs` 同期競合 (Phase 1 リリース後に実機検証)
- [ ] kv ペイロード telemetry の導入是非 (1MB 制限の早期検出)
- [ ] 放置 N 日で自動孵化させる救済の採否 (現状: 採用しない、放置でデータロスは無いが新規産卵はブロックされ続ける)
- [ ] 天敵 (`predator:true`) ボスの `n` フィールド意味の最終整理 (初回フラグ or 累計カウンタ、現状は初回フラグのまま)
- [ ] ホーム卵カード「すてる」導線を親詳細経由のままにするか、長押し直接導線を追加するか
- [ ] archetype に種代表色をパラメトリック適用するか、archetype は固定色か (現状: 固定色)
- [ ] archetype 未マッチ種への fallback (`imomushi` で開始 → Phase 8 見直し)

## 判断

- 設計の核 (卵→育成→孵化) + マスター虫救済 (♂♀選択 + 反対性別卵) で性別・ヒストグラム機能と完全統合
- 子供が長期目標を持ちやすい (SS の 1000 問育成は数週間〜数か月)
- 教育的価値: ♂♀ペアで卵 / 学習で育つ / 完全変態と不完全変態の正確な演出
- 学習継続の動機: お気に入り種・育てたい虫が学習を引き寄せる
- 自家育成個体は通常採集とは独立に特別扱い → 子供が「自分の物語」を作れる
- archetype 方式で視覚資産制作コストを 98% 削減しつつ生物学的正確性を保持

実装規模: 約 12-15 時間 (Phase 1-2 で動く MVP → Phase 3 以降は段階、Phase 6.5 で SVG 集中制作)
