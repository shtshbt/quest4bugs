# 戦闘演出 v2: 3 Phase 一括実装 (2026-08-14 決定: ①視覚言語 GO ②一括移行 ③スキップ機能は作らない)

仕様の正本は docs/battle_feedback_v2_design.md。全 3 Phase を一括で実装する。design doc が提案していたタップスキップは発案者の決定により作らない (時間は固定再生。その分、上限 2400ms の遵守が絶対条件になる)。

## Phase 1: 防御の成功と失敗の分離

1. 視覚言語の最上位原則: 全画面フラッシュ・画面の揺れ (sceneFlash / shake) は「自分が被弾したとき (防御失敗)」専用
2. 防御成功 (defense_guard): 六角形の盾 SVG が主役 + 「まもりきった!」系文言 (design doc の仮置き文言を使用。実機調整前提)。削り数値は 18px の青で盾の下に従属
3. バグ修正: 防御成功のダメージ数値に .toAlly の赤 text-shadow (rgb(153,0,0)) が残る問題を除去
4. 相性段階: 削り 5/7/9 を盾のヒビ本数 (0/2/3) と盾の色で段階表示。判定は B.advLabel() から (装備補正で数値がずれるため)

## Phase 2: 時間延長と 3 拍構成

5. 予備動作 / インパクト / 余韻 の 3 拍で静止時間を埋める。総時間は design doc の値 (標準 2050ms、劇的な outcome = 有利攻撃・防御失敗のみ 2350ms、上限 2400ms)。スキップは無いので上限厳守
6. 攻撃側の 3 段階化: 有利 20 は爆発的に (ただし sceneFlash は使わず artbox 内で完結)、普通 10 は中、不利 5 は「きかない…」感。grade は BATTLE_OUTCOME_GRADE の第 2 軸として追加し、BATTLE_OUTCOME_TABLE の 4 key は維持
7. nextQuestionDelayMs 等の遅延値を新しい総時間に整合させる

## Phase 3: 残りの混乱源

8. かいひ (正解したがボスが回避) に専用演出を与え、攻撃ミスと絵を分ける (design doc の該当節)
9. 特性ポップ 2 個目が次の問題に食い込む問題 (700ms 起点 + 1100ms > 提示窓) を新しい時間設計内に収める

## 制約

- 対象は battle.html と tests/battle_feedback/ 配下 (タイミング・spy の期待値を新しい時間設計に合わせて更新してよい。検証の意図は弱めない: 期待値の緩和ではなく新設計値への更新であること)。shared/battle.js・sw.js は触らない
- 既存テストの spy 対象関数名 (slashOn / missOn / guardOn / sceneFlash / floatDmg) を維持
- 外部アセット禁止 (インライン SVG・絵文字・CSS のみ)
- design doc と本 plan が食い違う場合は design doc を優先し、REPORT に明記。design doc の未確定 12 点のうち文言と時間の最終値は仮置きのまま実装 (実機調整で確定)

## 検収

- 既存 node テスト全 green (`for f in tests/test_*.js; do node $f; done`)
- tests/battle_feedback/ の harness が動く環境なら、4 outcome + かいひ を production timing で駆動し、各 outcome のモーション終了時刻が総時間内に収まること・spy 呼び出しが期待どおりであることを確認 (playwright 不可なら node のみで可、REPORT に明記)
- 1 ターン総時間が 2400ms を超える outcome が無いことを確認
- zukan_cards/ 配下は diff 判定から除外
- commit はしない (レビュー後にこちらで行う)
