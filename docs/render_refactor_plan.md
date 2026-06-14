---
title: 昆虫描画の精緻化 改修計画
author: Shota Shibata
status: draft
---

# 昆虫描画の精緻化 改修計画

トークンに余裕があるときにフェーズ単位で着手するための計画書。各フェーズは独立して出荷可能（後述のフォールバック連鎖により、未着手フェーズがあっても全種が必ず描画される）。

## 1. 背景と現状

描画は `shared/render.js` の **パラメトリック方式**。`bugSVG(b)` が約 24 個の「型（archetype）」を持ち、各種は **「型 + 2色（c1, c2）」だけ**で描かれる。3ゲーム共通（`Q4BRender.species`）。

- 同一 archetype の種は **色違いのみ**で区別される → 科の中での種ごとの見分けが弱い
- 一方、種データ（`shared/bugs.js`）は豊富で、`family` / `groupJa` / `tags` / `scientificName` / `colors` / `rarity` を持つ。**この既存メタデータを使えば、769種を1件ずつ描き直さずに種ごとの描き分けができる**

### 現状の規模（2026-06時点）

- 総種数: **769**
- rarity 分布: SS **17** / SSR **71** / SR **191** / R **306** / N **184**
- archetype 分布（renderer）: tombo 84・tateha 80・ga 59・shijimi 58・hachi 54・batta 51・kamikiri 49・other 47・kuwagata 42・seseri 27・ageha 25・osamushi 24・semi 22・mizu 22・chou 22・kogane 21・kabuto 15・tentou 15・kemushi 15・kamakiri 14・ari 12・tamamushi 7・hotaru 3・dango 1

## 2. 目標と非目標

**目標**
- 種ごとに見分けられる程度に精緻化する
- 看板種（高レア・代表種）は本物らしい個別描画にする
- インライン SVG のまま維持（画像アセット不要・軽量・色違いシステムと互換）

**非目標**
- 全 769 種を1点ずつ専用作画する（手描きは非現実的、AI 画像化は統一感を壊す）
- 写実的描画／画像ファイル化

## 3. 方針 = A（全種パラメトリック強化）+ B（高レア代表種の個別描画）

コスパ最適の組み合わせ。A で全体の底上げ、B で看板種を特別扱いする。

## 4. 設計

### 4.1 描画パラメータの導出（bugs.js 側）

各種に描画パラメータを与える。ハードコードを避け、**`groupJa` / `tags` → パラメータのマッピングテーブル1枚**で全種を一括カバーする（個別記述を最小化）。

- `pattern`: none / spots / stripes / bands / eyespot / checker / metallic
- `patternColor`: 既存 `c2` を流用可
- `size`: 0.82–1.18 程度（体の大きさ感。既存 `scaleG` で全体拡縮）
- 部位ヒント（archetype が対応する場合のみ参照）:
  - kuwagata 大アゴ: saw（ノコギリ）/ scissor（ハサミ）/ long（ギラファ）/ wide（ヒラタ）
  - kabuto ツノ: single / forked / long / paired
  - 蝶 翅形: round / tailed（尾状突起）/ elongate / scalloped
  - kamikiri 触角長: normal / very_long
- `colors` は現状のまま使用

### 4.2 render.js の拡張

- `patternOverlay(bodyPath, kind, color)`: 本体描画後に、本体形状でクリップして斑点／縞／帯／眼状紋／格子を重ねる共通関数を追加
- `size`: 既存 `scaleG(s, inner)` を使い全体を拡縮
- 部位 variant: 主要 archetype に分岐を入れ、`b.variant` で path を差し替え（例: kuwagata の大アゴ path を variant ごとに用意）
- shiny 互換: `_shift` は色に作用するため、pattern にも自動で色相変換がかかる。sheen（✨）は従来どおり最後に付与

### 4.3 個別描画（bespoke）レジストリ

- `BESPOKE = { species_id: function(c1, c2, shiny){ return innerSVG } }` を追加
- `speciesSVG(sp, shiny)` で `sp.id` が `BESPOKE` にあればそれを使用、なければ archetype 描画にフォールバック
- viewBox は 100×100 統一。脚・触角・sheen は共通部品（ヘルパー関数）を使って描き味を揃える
- 対象は rarity 閾値で決める（**推奨: まず SS 17種 → 次に SSR 71種**）。看板種から着手

### 4.4 フォールバック連鎖（段階導入を可能にする要）

```
bespoke[id]  →  archetype + params(A)  →  既存 archetype（色のみ）
```

どの段でも必ず1つは成立するため、A と B は **独立して部分導入**できる。

## 5. 段階計画（フェーズ）

| Phase | 内容 | 規模 | 効果 |
|---|---|---|---|
| 0 | 設計確定。param スキーマと `groupJa/tags→param` マッピングテーブルの雛形を作る | 小 | 基盤 |
| 1 (A-core) | pattern レイヤ + size を実装し、マッピングで **全種にパラメータ付与**。「色違いだけ」状態を解消 | 中 | 大（全体底上げ） |
| 2 (A-shapes) | 主要 archetype に部位 variant（kuwagata / kabuto / 蝶 / kamikiri 等）を追加 | 中 | 中〜大 |
| 3 (B-hero) | **SS 17種**を個別描画 | 中 | 報酬体験の底上げ |
| 4 (B-extend) | **SSR 71種**を順次個別描画（分割可） | 大 | 看板種が充実 |
| 5 | SR の一部を個別描画 or 据え置きを判断 | 任意 | — |

## 6. 工数・トークンの目安

- Phase 1–2: それぞれ中規模（render.js / bugs.js 改修 + 全種レンダリング検証）。各 1 セッションで収まる想定
- Phase 3（SS 17種）: 約 1 セッション
- Phase 4（SSR 71種）: 10–20 種/セッションで分割。bespoke SVG は LLM 生成 → 人手レビューが現実的。workflow で並列生成も検討
- 各フェーズはフォールバックがあるため **単独で出荷可能**

## 7. 検証

- 全 769 種の SVG が例外なく生成されること（`_gen/` に全種一括レンダリングのスナップショット確認スクリプトを用意）
- viewBox・サイズ・脚位置の統一感、shiny 表示の崩れがないこと
- 図鑑ページ・捕獲演出での見え方（3ゲーム共通描画なので全ゲームで確認）
- 図鑑一覧でインライン SVG 数が増えた際のパフォーマンス

## 8. リスク

- bespoke SVG の品質ばらつき → 脚・触角・sheen の共通部品とスタイルガイドで統一
- パラメータ過多による render.js 肥大 → variant は関数分割し、本体ロジックと分離
- 既存の色違い・サイズ表示との相互作用 → Phase 1 で回帰確認

## 9. 着手単位（依頼の粒度）

フェーズ単位で independent に依頼できる。例:

- 「Phase 1 をやって」= pattern + size + マッピングで全種パラメトリック化
- 「Phase 2 の kuwagata と kabuto の部位 variant をやって」
- 「SS 17種を個別描画して」= Phase 3
- 「SSR のうち海外カブト・クワガタ枠を個別描画して」= Phase 4 の一部

## 10. 関連ファイル

- `shared/render.js` — 描画本体（`bugSVG` / `speciesSVG`、archetype 分岐、shiny の色相変換）
- `shared/bugs.js` — 種データと `refineRenderer`（order/family から renderer を補完）
- `_gen/bugs_*.json` — 種データのソース群
