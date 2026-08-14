---
title: バトル攻防アニメーション改修 設計案 v0.1
author: Shota Shibata
status: draft
updated: 2026-08-14
---

# バトル攻防アニメーション改修 設計案 v0.1

「おうじゃのみち」の攻撃・防御フィードバックを、時間を長めに取って派手にし、
とくに防御の成功と失敗を見た瞬間に区別できるようにするための設計案。
この文書は draft であり、実装は含まない。数値と文言は §6 の未確定事項で確定させる。

対象は `battle.html` の `presentBattleOutcome()` と、それが使う CSS だけ。
ダメージ計算 (`shared/battle.js`) と入力ロックの契約は変えない。

---

## 1. 現状 (実測値)

計測は committed harness (`tests/battle_feedback/harness.py`) の
`boot_battle` / `install_spies` / `fx` を使い、production timing のまま
(`set_timing` を呼ばずに) 4 outcome を 1 回ずつ提出して記録した。
`dt` は `answer(c)` 呼び出しからの経過 ms。計測手順は §5.1 に置く。

### 1.1 outcome × 現演出 × 時間

| outcome | banner | インパクト演出 | モーション実測 | ダメージ数値 | HP バー更新 | 次の問題 |
|---|---|---|---|---|---|---|
| attack_hit (通常) | `ob-attack_hit`「こうげき せいこう！」obPop 250ms | `slashOn("enemy")`: 白い斬撃 1 本 slashGo 350ms + 敵 artbox hitShake 420ms | dt 252.8 開始、~672 終了 | 黄 28px「-20/-10/-5」floatUpStay 900ms、DOM 除去 1400ms | dt 452.0 | dt 1604 |
| attack_hit (かいひ) | 同上 (`ob-attack_hit` のまま) | `missOn("enemy")`: 空振り線 missGo 450ms、artbox は無反応 | ~250 から 700 | グレー「ダメージ 0」 | dt 452 (数値変化なし) | dt 1600 |
| attack_miss | `ob-attack_miss`「こうげき しっぱい…」 | `missOn("enemy")` missGo 450ms | dt 252.2 開始、~702 終了 | グレー「ダメージ 0」 | dt 451.8 (変化なし) | dt 1609 |
| defense_guard | `ob-defense_guard`「ぼうぎょ せいこう！」 | `guardOn("ally")`: 絵文字 🛡️ guardPop 700ms + artbox に `guard-ring` (600ms で除去) | dt 252.3 開始、~952 終了 | 水色 20px「-5/-7/-9」 | dt 451.9 | dt 1602 |
| defense_hit | `ob-defense_hit`「ぼうぎょ しっぱい…」 | `slashOn("ally")` 斬撃 350 + ally hitShake 420 + `sceneFlash()` 白フラッシュ 400 + scene `impact-quake` (predShake) 500 | dt 253.8 開始、~754 終了 | 赤 28px「-10」 | dt 452.5 | dt 1603 |

補助表示として `.ob-sub` に「▲ ゆうり！ / ・ふつう / ▼ ふり…」が出る。
特性 pop (`traitFx`) は `hpDelayMs + i * impactDelayMs` に発火し、traitPop 1100ms。

### 1.2 timing 定数と CSS の実測

| 名前 | 現在値 | 位置 |
|---|---:|---|
| `impactDelayMs` | 250 | `BATTLE_FEEDBACK_TIMING` |
| `hpDelayMs` | 450 | 同上 |
| `bannerDurationMs` | 1400 | 同上。float の DOM 除去と outline 解除も同時刻 |
| `nextQuestionDelayMs` | 1600 | 同上。ここで `nextQuestion()` が走り `st.busy=false` |

CSS keyframes の duration 実測: slashGo 0.35s / hitShake 0.42s / missGo 0.45s /
guardPop 0.7s / predShake 0.5s / flashGo 0.4s / floatUpStay 0.9s / obPop 0.25s /
traitPop 1.1s。`flashClass(box,"guard-ring",600)` と `flashClass(scene,"impact-quake",500)`
は class 保持時間で制御している。

### 1.3 ダメージ体系 (`shared/battle.js`)

- 攻撃: 有利 20 / ふつう 10 / 不利 5。モズ (`type:"none"`) は弱点なしで常に 10。
- 被ダメ: 防御ミス 10 固定。防御成功でも 有利 5 / ふつう 7 / 不利 9 が必ず入る。
  モズは無属性なので防御成功時は常に 7。
- 補正: ヨロイ (有利以外の攻撃を半減)、どく (防御ミスに +5)、装備 (攻撃 +5 / 被ダメ -3、下限 1)。
  つまり画面に出る数値は 5/7/9 に固定されず、装備込みで 2/4/6 もありうる。
  演出は数値そのものではなく「相性グレード」で分岐させる必要がある。

### 1.4 実測から見えた問題

1. 動いている時間が短い。1.6 秒の提示窓のうち、モーションがあるのは最初の
   0.42 から 0.70 秒だけ。残りの 0.65 から 0.93 秒は完全に静止しており、
   体感の「短さ」は総時間ではなくモーション時間が原因である。
   総時間を伸ばす前に、まず既存の空白を第 2 拍で埋めるほうが効く。
2. 防御成功と失敗の差が弱い。成功は 🛡️ 絵文字が 0.7 秒出るだけで、
   失敗は斬撃 + 画面フラッシュ + 画面全体の揺れ。差はあるが、成功側に
   「数値が減る」という失敗と同じ情報が同居しているため、子どもは
   「まもったのに減った」と読む。成功側の主役が盾ではなく数値になっている。
3. 成功時の数値に赤いグローが残っている。`.dmg-float.guard` は color を
   水色 (rgb(159,208,255)) に上書きするが、`.toAlly` の text-shadow
   (rgb(153,0,0) の外周発光) が残るため、実測で「水色の文字に赤い光」という
   混合サインになっている。20px と 28px のサイズ差はついている。
4. かいひ (dodge) が攻撃ミスと同じ絵になる。正解したのにボスが避けた場合も
   `missOn` + 「ダメージ 0」で、banner だけが `ob-attack_hit` のまま。
   「正解したのに失敗の絵」という、防御成功と同じ型の混乱がここにもある。
5. 攻撃の 20/10/5 が絵で区別できない。斬撃は 3 段階とも同一で、差は数値と
   `.ob-sub` の小さいラベルだけ。有利を取る動機が演出に乗っていない。
6. 特性 pop が次の問題に食い込む。2 個目の trait は 450 + 250 = 700ms 起点で
   1100ms 続くため 1800ms まで残り、`nextQuestionDelayMs` 1600 を超える。
   トビズムカデ (どく + れんぞく) で顕在化する。

### 1.5 天敵戦・ボス戦・かせきのたに・カメレオン戦の共通性

`presentBattleOutcome()` は `o.phase` と `o.outcome` だけで分岐し、
ボスの種別 (predator / insect / chameleon / TANI) を一切参照しない。
したがって攻防の演出は全戦闘で完全に共通である。差分は次の 3 点だけ。

| 項目 | 昆虫ボス | 天敵 | かせきのたに | カメレオン |
|---|---|---|---|---|
| パーティ | 3 匹 | 6 匹 | 6 匹 (HP 持ち越し 5 連戦) | 6 匹 (交代禁止) |
| ボス HP | 60 / 90 / 120 | 90 / 135 / 180、モズ 140 | 上記が 5 体連続 | 160 |
| 入場演出 | `intro-scene` 標準 | `.pred` + フラッシュ | `.exped` + 霧 + OK ボタン | `.cham` |
| 攻防の演出 | 共通 | 共通 | 共通 | 共通 |
| 特性 pop | なし | あり (せんせい/どく/ヨロイ/れんぞく/かいひ) | あり | なし |

改修は 1 箇所で全戦闘に反映される。逆に、演出時間を伸ばしたときに総時間が
最も膨らむのは 180 HP の天敵戦と、かせきのたに 5 連戦である。上限はここで決める (§3.2)。

---

## 2. 新演出案

### 2.1 共通の骨格: 3 拍構成

すべての outcome を「予備動作、インパクト、余韻」の 3 拍で組む。
現状は第 2 拍しか存在せず、第 1 拍がないため因果が読めず、
第 3 拍がないため静止時間が空白に感じられる。

| 拍 | 役割 | 現状 | 新案 |
|---|---|---|---|
| 1 予備動作 | だれが動くのかを先に見せる | なし | 0 から 260ms。攻撃側が構える、または攻撃線が飛ぶ |
| 2 インパクト | 何が起きたか | 250 から 700ms | 260 から 900ms |
| 3 余韻 | 結果の読み取り | 静止のみ | 900 から 1400ms。結果が定着する動き (盾が光って収束、数値が跳ねる) |
| 4 保持 | 読む時間 | 700 から 1600ms が静止 | 1400 から 2050ms が静止。skip 可 |

### 2.2 視覚言語の原則

原則 A: 画面全体に効く演出 (全画面フラッシュ、画面の揺れ) は、自分がダメージを
受けたときだけ使う。防御成功では絶対に使わない。これが成功と失敗の最上位の識別子になる。
現行 test も `defense_guard` で `sceneFlash` 0 回を要求しており、この原則と一致する。

原則 B: 防御成功の主役は盾であり、数値は盾に従属する。数値は盾の下に、
盾の文字より小さく、青系のみで出す。赤い発光は付けない。

原則 C: 相性の差 (5/7/9、20/10/5) は数字ではなく形と色の段階で見せる。
装備補正で数値がずれるため、グレードは `B.advLabel()` の結果から決める。

原則 D: 正解したのに 0 ダメージになるケース (かいひ) は、失敗の絵を流用しない。

### 2.3 防御成功 (削り 5/7/9)

主役は盾。文言は「まもった！」系を大きく、削りは小さく従属させる。

拍の割り当て:

- 0ms: banner「ぼうぎょ せいこう！」。ally の虫が踏ん張る (`q4bBrace`、scale 0.97 に沈んで戻る、140ms)。
- 140ms: ボス側から攻撃線が ally へ飛ぶ (`q4bIncoming`、120ms)。因果の起点を見せる。
- 260ms: 盾が展開して受け止める (`q4bShieldRaise` 180ms + `q4bShieldImpact` 300ms)。
  盾は六角形のインライン SVG。受け止めた瞬間に盾の縁が白く光り、攻撃線が跳ね返って消える。
- 560ms: 相性グレードぶんのヒビが順に入る (`q4bShieldCrack`、1 本 110ms の stagger)。
- 700ms: HP バーが減る。盾の下に小さく削り数値。
- 900ms: 盾が青く収束し (`q4bShieldHold` 500ms)、成功文言が 1 度だけ跳ねる。
- 1400ms 以降: 静止。

相性グレードの段階表示:

| 相性 | 削り | 盾の色 | ヒビ | 主役文言 (案) | 数値表示 (案) |
|---|---:|---|---|---|---|
| ゆうり | 5 | 明るい水色 #bfe3ff | 0 本、盾は無傷 | まもりきった！ | ちょっとだけ -5 |
| ふつう | 7 | 標準青 #9fd0ff | 2 本 | まもった！ | -7 |
| ふり | 9 | くすんだ青 #7fa8cc | 3 本 + 盾が軋む微振動 | もちこたえた！ | ぐっとこらえた -9 |

数値のスタイルは現行の 20px から 18px へ下げ、色は盾色に合わせ、
`.toAlly` 由来の赤いグローを取り除く。位置も現行の art 中央付近から
盾の下に移し、盾より前に出ないようにする。

やらないこと: 画面フラッシュ、画面の揺れ、ally artbox の hitShake、赤い数値、
`slashOn("ally")`。これらは防御失敗の専用語彙として温存する。

### 2.4 防御失敗 (ミス 10)

主役は被弾。成功との対比を作るため、盾を「出そうとして割れる」カットを先頭に置く。

- 0ms: banner「ぼうぎょ しっぱい…」。ally が硬直する。
- 140ms: 攻撃線が飛ぶ (成功時と同じモーションを使い、その後の分岐で差を出す)。
- 260ms: 盾が割れて散る (`q4bShieldShatter` 220ms)。盾は出るが機能しない、という 1 コマ。
- 300ms: 直撃。太い斬撃 + 赤いフルスクリーンフラッシュ (`q4bRedFlash` 350ms) +
  scene の揺れを現行 500ms から 650ms へ延長。
- 560ms: ally が仰け反って戻る (`q4bRecoil` 340ms)。
- 700ms: HP バーが減る。赤い数値を 28px から 36px へ拡大し、`q4bNumPop` で 1 度弾ませる。
- 900ms から 1350ms: 赤い vignette が薄れて消える。
- 文言案: 「まもれなかった…」を主役、数値は主役と同格の大きさで良い。

現行の白フラッシュ (`flashGo`) を赤系に置き換えるかは §6 の未確定事項。
白のまま vignette だけ赤にする案もある。

### 2.5 攻撃の 3 段階

| 相性 | ダメージ | 主役の視覚 | モーション | 文言 (案) |
|---|---:|---|---|---|
| ゆうり | 20 | 爆発 | 斬撃 3 本を 80ms stagger + 💥 の scale pop + artbox 内だけの黄色い閃光 + 敵の強めシェイク | こうかは ばつぐん！ |
| ふつう | 10 | 1 撃 | 現行の斬撃を太く長く (350ms から 450ms) + 敵シェイク | こうげき せいこう！ |
| ふり | 5 | 弾かれる | 細く短い斬撃 + 敵が硬直して弾く (`q4bHitStop` 160ms) + 火花なし | きかない…！ |

有利の閃光は `sceneFlash()` を使わず、artbox 内で完結させる。
原則 A (全画面演出は被弾専用) を守るためと、既存 test の
「attack_hit で sceneFlash 0 回」を壊さないため。

数値サイズも 3 段階にする案: 有利 36px / ふつう 28px / 不利 22px。

### 2.6 攻撃ミスとかいひ

- attack_miss: 現行の `missGo` を維持し、余韻に「からぶり…」を出す。
  斬撃が敵の脇を通り抜けた後、敵が一瞬だけ元位置で静止する。
- かいひ (dodge): 敵が横にスッと滑って避ける (`q4bDodgeSlip`、translateX 往復 320ms) +
  💨。斬撃は空を切る。banner は現行どおり `ob-attack_hit` のままだが、
  文言を「よけられた！」に差し替える (`BATTLE_OUTCOME_TABLE` は 4 key のまま、
  msg の差し替えだけ presenter 側で行う)。
  ここを分けないと「正解したのに失敗の絵」が残る。

---

## 3. 時間設計

### 3.1 新しい timing 定数

`BATTLE_FEEDBACK_TIMING` に 3 個追加し、既存 4 個を更新する。

| 名前 | 現在 | 新案 | 倍率 | 意図 |
|---|---:|---:|---:|---|
| `anticipationMs` | (なし) | 140 | 新規 | 予備動作。banner は現行どおり即時 |
| `impactDelayMs` | 250 | 260 | 1.04 | ほぼ据え置き。予備動作の直後に当てる |
| `hpDelayMs` | 450 | 700 | 1.56 | 主モーションが終わってから HP を減らし、因果を読ませる |
| `bannerDurationMs` | 1400 | 1850 | 1.32 | 余韻の終端。float の DOM 除去もここ |
| `nextQuestionDelayMs` | 1600 | 2050 | 1.28 | 通常の 1 ターン提示時間 |
| `dramaticExtraMs` | (なし) | 300 | 新規 | 有利攻撃と防御失敗だけ加算し 2350 にする |
| `skipGuardMs` | (なし) | 400 | 新規 | 提出直後の skip 無効時間 |

invariant は現行どおり `nextQuestionDelayMs >= bannerDurationMs` を維持する。

モーションの実効時間 (提出からモーション終了まで) の倍率:

| outcome | 現状 | 新案 | 倍率 |
|---|---:|---:|---:|
| attack_hit ゆうり | 672 | 1250 | 1.9 |
| attack_hit ふつう | 672 | 900 | 1.3 |
| attack_hit ふり | 672 | 780 | 1.2 |
| attack_miss | 702 | 800 | 1.1 |
| かいひ | 700 | 850 | 1.2 |
| defense_guard | 952 | 1400 | 1.5 |
| defense_hit | 754 | 1350 | 1.8 |

総時間は 1.28 倍にしか増えないが、静止していた空白 (0.65 から 0.93 秒) を
第 3 拍で埋めるため、体感の派手さはモーション時間の増分以上に上がる。

### 3.2 1 ターンの上限と 1 戦の総時間

1 ターンの提示時間の上限を 2400ms とする。根拠は連戦の総時間である。
攻撃と防御は 1 問ずつ交互なので、提示時間は問題数にそのまま比例する。
正答率 85%、ダメージ ふつう 10 を仮定した試算:

| 局面 | ボス HP | 推定問題数 | 現状 1.6s | 新案 2.05s | 上限 2.4s |
|---|---:|---:|---:|---:|---:|
| 昆虫ボス (有利編成) | 60 | 8 | 12.8s | 16.4s | 19.2s |
| 昆虫ボス (ふつう) | 90 | 22 | 35.2s | 45.1s | 52.8s |
| 天敵 (中層) | 135 | 34 | 54.4s | 69.7s | 81.6s |
| 天敵 オオゲジ (れんぞく、防御 2 連) | 180 | 63 | 100.8s | 129.2s | 151.2s |
| かせきのたに 第 1 層 5 連戦 | 計 330 | 78 | 124.8s | 159.9s | 187.2s |

かせきのたに 5 連戦で 2.4s を全ターンに適用すると 3 分を超える。
したがって 2.4s は「有利攻撃と防御失敗だけ」に限定し、
それ以外は 2.05s に留める。全ターン一律 2.4s は採らない。

連戦向けの追加案 (未確定): かせきのたに の 2 戦目以降は timing を 0.85 倍にする。
第 1 層 5 連戦で 160s から 140s に戻る。

### 3.3 入力ロックと skip

入力ロックの契約は変えない。`answer(c)` 冒頭の `st.busy=true` と
`nextQuestion()` 末尾の `st.busy=false` がロックの唯一の真実源であり、
`inPresentationWindow()` が回答ボタン、テンキー、こうたいの 3 入口を塞ぐ。

skip の仕様案:

- 提出から `skipGuardMs` (400ms) の間はタップを無視する。子どもは連打するため、
  回答ボタンを押した勢いのまま演出が消える事故を防ぐ。
- 400ms 以降に scene のどこかをタップすると、演出を最終状態にスナップして
  ただちに `o.next()` を呼ぶ。アニメーションを途中で止めるのではなく、
  banner、ダメージ数値、HP バーをすべて最終状態にしてから進める。
  途中で切ると「何が起きたか分からない」が悪化する。
- skip しても `st.busy` は false にしない。`next()` の中の `nextQuestion()` が
  従来どおり解除する。二重解除の経路を作らない。
- 800ms 以降に「タップで つぎへ」の薄いヒントを表示する。
- skip の可否そのものは未確定 (§6)。実装する場合は timer を配列で保持する
  構造変更 (§4.2) が前提になる。

---

## 4. 実装方式

### 4.1 presentBattleOutcome への追加で足りるか

おおむね足りる。演出の発火はすでに `presentBattleOutcome()` に一本化されており、
`answer(c)` は計算と分類しか持たない。この分離は維持する。
ただし次の 3 点は構造の追加が必要になる。

### 4.2 必要な構造追加

追加 1: グレード軸。outcome は 4 のままだが、実効バリアントは 7 になる
(attack_hit の 3 段階、かいひ、attack_miss、defense_guard の 3 段階、defense_hit)。
`BATTLE_OUTCOME_TABLE` は 4 key のまま保持し (現行 test が key を検証している)、
第 2 軸として `BATTLE_OUTCOME_GRADE` を新設する。

```
var BATTLE_OUTCOME_GRADE = {
  adv:  {cls:"gr-adv", shieldColor:"#bfe3ff", cracks:0, atkMsg:"こうかは ばつぐん！", defMsg:"まもりきった！"},
  neu:  {cls:"gr-neu", shieldColor:"#9fd0ff", cracks:2, atkMsg:"こうげき せいこう！", defMsg:"まもった！"},
  dis:  {cls:"gr-dis", shieldColor:"#7fa8cc", cracks:3, atkMsg:"きかない…！",       defMsg:"もちこたえた！"}
};
```

グレードは `o.effectiveness` (`B.advLabel()` の戻り値) から決める。
装備補正で数値がずれても演出は正しい段階を選べる。

追加 2: timer の集約。現状は `setTimeout` を都度呼び捨てている。skip を入れるなら
`st.fxTimers = []` に push して `skipToEnd()` で全消しできるようにする。
skip を採らない場合はこの追加も不要。

追加 3: 演出関数の新設。既存の `slashOn` / `missOn` / `guardOn` / `sceneFlash` /
`floatDmg` / `traitFx` は名前を維持する。harness の `install_spies` が関数名で
wrap しており、名前を変えると既存 test が全滅する。新しい絵は既存関数の内部で
grade を見て切り替えるか、既存関数から新関数へ委譲する形にする。

新設する関数の目安: `shieldOn(side, grade)`、`shieldShatter(side)`、
`incomingOn(side)`、`burstOn(side)`、`dodgeSlipOn(side)`、`recoilOn(side)`。
JS の増分はおよそ 120 から 160 行。

### 4.3 CSS keyframes の追加規模

新規 keyframes は 14 個程度を見込む。

`q4bBrace` / `q4bIncoming` / `q4bShieldRaise` / `q4bShieldImpact` / `q4bShieldCrack` /
`q4bShieldHold` / `q4bShieldShatter` / `q4bRecoil` / `q4bRedFlash` / `q4bSlashHeavy` /
`q4bBurst` / `q4bHitStop` / `q4bDodgeSlip` / `q4bNumPop`

既存 keyframes (slashGo、hitShake、missGo、guardPop、predShake、flashGo、
floatUpStay、obPop、traitPop) は削除しない。reduced-motion ブロックと既存 test が
参照しており、新旧の切り替えは class の付け外しで行う。
CSS の増分はおよそ 60 から 80 行。`battle.html` の `<style>` 内に追記する。

### 4.4 素材方針

外部アセットは追加しない。

- 盾: 絵文字 🛡️ ではなくインライン SVG の六角形にする。絵文字ではヒビの段階表現と
  色の段階表現ができず、端末ごとの字形差も出るため。path 2 本 (外周と内側) と
  ヒビ用の polyline 3 本を持たせ、`--cracks` の値で表示本数を切り替える。
  盾の色は CSS custom property で grade から注入する。
- 爆発、かいひ、どく、特性: 絵文字を継続使用する (💥 💨 ☠️ 🛡️ ⚡ 🦶)。
  transform と opacity だけを動かし、字形に依存しない。
- 虫の絵: `R.species()` / `R.deco()` が返す既存 SVG には手を入れず、
  外側の `.art` に transform を掛けて仰け反り、踏ん張り、硬直を表現する。
- 色: 既存 palette から取る。盾青 #9fd0ff、被弾赤 #ff8a8a、有利黄 #ffd76a、
  空振りグレー #cfd8e2。新しい色相は増やさない。

### 4.5 reduced-motion

現行の `fx-outline-*` 方式を拡張する。文言、数値、timing は motion 版と同一に保つ
(現行の契約)。

| outcome | reduced-motion 表示 |
|---|---|
| attack_hit (grade 別) | `fx-outline-hit` に grade class を足し、outline の太さと色で 3 段階 |
| attack_miss / かいひ | `fx-outline-miss` (現行のまま) |
| defense_guard | 盾 SVG を静止表示し、ヒビ本数だけ grade で変える。outline は青の二重線 |
| defense_hit | 赤の太い outline + 画面の静的な赤タイント。揺れとフラッシュはなし |

盾を静止表示にすることで、reduced-motion でも成功と失敗の識別が残る。
現行は `.guard-pop{display:none}` で盾が消えるため、成功時の主役が
outline の色だけになっている。ここは改善対象。

### 4.6 特性 pop の再配置

現行は `hpDelayMs + i*impactDelayMs` 起点で traitPop 1100ms のため、
2 個目が `nextQuestionDelayMs` を超える。新 timing でも 700 + 260 + 1100 = 2060 で
2050 をわずかに超える。対処案は 2 つ。

- 案 A: trait pop の起点を bannerDuration 側から逆算し、必ず余韻内に収める。
- 案 B: trait を pop ではなく banner 直下の chip 表示に変え、次の問題まで残す。

案 B のほうが、れんぞく (防御 2 連) の予告として機能する分わかりやすい。未確定。

---

## 5. 検証

### 5.1 現状値の計測手順 (今回実行したもの)

```bash
python3 -m venv /tmp/q4b_bfx_venv
/tmp/q4b_bfx_venv/bin/pip install playwright
```

Chromium は `~/.cache/ms-playwright/` の既存 build を使用した。
計測は `tests/battle_feedback/harness.py` の `serve_repo_root` /
`boot_battle` / `inject_question` / `install_spies` / `fx` を import し、
`set_timing` を呼ばずに production timing のまま 4 outcome を 1 回ずつ提出して、
spy のタイムスタンプと `getComputedStyle` の `animation-name` /
`animation-duration` を採取した。この採取用スクリプトは commit していない。
§5.3 の追加 check としてこの計測を committed 化することを提案する。

### 5.2 既存 harness の実行

```bash
/tmp/q4b_bfx_venv/bin/python tests/battle_feedback/test_battle_feedback.py
/tmp/q4b_bfx_venv/bin/python tests/battle_feedback/capture_screenshots.py
```

改修時に更新が必須になる箇所:

1. `test_battle_feedback.py` の `check_static_contract()` の `defaults` dict
   (250 / 450 / 1400 / 1600) を新値に差し替える。新設の 3 定数も追加する。
2. `capture_screenshots.py` の `HOLD_TIMING` と 700ms 待ち。3 拍構成にすると
   700ms は「ヒビが入っている途中」になる。hold 点を outcome ごとに変えるか、
   余韻の終端 (1400ms) を撮る。
3. `check_effect_path()` の期待は原則 A と一致しているのでそのまま維持できる。
   有利攻撃の閃光を `sceneFlash()` で実装すると
   「attack_hit で sceneFlash 0 回」が落ちるため、artbox 内で完結させる。

### 5.3 追加すべき headless check

1. 防御成功で `sceneFlash` と `impact-quake` が 0 回であること。混乱防止の中核契約。
2. 防御成功のダメージ数値が、防御失敗の数値より `font-size` が小さいこと。
   `getComputedStyle` の比較で判定する。
3. 防御成功の数値の `text-shadow` に赤成分 (rgb(153,0,0)) が含まれないこと。
   §1.4 の問題 3 の回帰を防ぐ。
4. 相性 3 段階 (ゆうり/ふつう/ふり) で盾の grade class とヒビ本数が切り替わること。
5. 攻撃 3 段階で grade class が切り替わり、有利のときだけ burst 要素が生成されること。
6. かいひ が attack_miss と異なる DOM 要素を生成すること。
7. 演出の実測タイムライン回帰: production timing での
   impact / HP / next の実測 dt が設定値の ±30ms に収まること。§5.1 の計測の committed 化。
8. 1 ターン上限の静的 assert: `nextQuestionDelayMs + dramaticExtraMs <= 2400`。
9. 特性 pop が `nextQuestionDelayMs` を超えて残らないこと (どく + れんぞくの 2 個同時)。
10. skip を実装する場合: 提出から 400ms 以内のタップで `next` が呼ばれないこと、
    400ms 以降のタップで `next` が `nextQuestionDelayMs` より早く呼ばれること、
    skip 後も `st.busy` が `nextQuestion()` まで true のままであること。
11. reduced-motion で防御成功の盾要素が残り、防御失敗と識別できること。

### 5.4 screenshot

現行の 4 枚に加えて、grade 別の 7 バリアント + reduced-motion 2 枚を撮る。
viewport は現行どおり 480 x 900 固定、`device_scale_factor=1`、
`service_workers="block"` を維持する。
hold 点は各 outcome の余韻中央 (提出から約 1100ms) に統一する案を推す。

---

## 6. 未確定事項 (発案者が決める)

1. 文言。「まもりきった！」「まもった！」「もちこたえた！」「まもれなかった…」
   「こうかは ばつぐん！」「きかない…！」「よけられた！」「からぶり…」の可否。
   5 歳児が読める漢字量とひらがな比率。
2. 防御成功で削り数値をそもそも出すか。数値を消して「ちょっとだけ けずられた」の
   定性表示にする案もある。数値は保護者側から見た学習フィードバックとしては有用。
3. 時間の最終値。通常 2050ms、劇的 2350ms、上限 2400ms の是非。
4. skip の可否。タップで短縮を入れるか、完全に無効にするか、設定で切り替えるか。
5. 演出量の設定項目を作るか (ひかえめ / ふつう / たっぷり)。作る場合の保存先は
   `battle` namespace か、既存の設定画面か。
6. 相性の段階表示をヒビ本数でやるか、盾の色でやるか、両方か。
7. かいひ を独立 outcome にするか。`BATTLE_OUTCOME_TABLE` を 4 key から 5 key に
   増やすと既存 test の 4 outcome 前提を書き換えることになる。
8. 防御時の「ゆうり / ふり」ラベルの扱い。攻撃時の ゆうり は与ダメ増、
   防御時の ゆうり は被ダメ減で、同じ語が逆向きの意味になっている。
   防御時だけ「かたい / もろい」等に文言を変えるかどうか。
9. 防御失敗のフラッシュを赤にするか、現行の白のまま vignette だけ赤にするか。
10. かせきのたに 5 連戦で 2 戦目以降の演出を 0.85 倍に短縮するか。
11. 音を入れるか。現状は無音で、`docs/media_polish_ideas.md` に BGM 案がある。
12. 特性 pop を案 A (時間内に収める) と案 B (banner 下の chip) のどちらにするか。

---

## 7. 段階的な導入案

一度に全部入れず、効果の大きい順に 3 段階に分ける。

Phase 1: 防御の成功と失敗の分離。盾 SVG の導入、成功時の数値の従属化
(サイズ縮小、赤グロー除去、盾の下へ移動)、失敗時の被弾強化。
timing は現行のままでも成立する。要望 2 に直接対応する部分であり、単独で価値がある。

Phase 2: 時間設計の更新。3 拍構成と新 timing 定数、余韻の追加。
既存 test の defaults 更新と screenshot の hold 点調整が同時に必要。

Phase 3: 攻撃の 3 段階、かいひ の分離、特性 pop の再配置、skip。
