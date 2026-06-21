# Larva / Pupa / Nymph SVG Archetypes

卵育成システムで使用する archetype SVG を Phase 6.5 で集中制作する。

仕様: `docs/breeding_eggs_plan.md` の「視覚資産: archetype 方式」を参照。
ルックアップ: `shared/bug_archetypes.js` の `Q4BArchetypes.archetypesFor(sp)`。

## 制作予定リスト (~25 個)

### 完全変態 (larva + pupa)
- `koganemushi.svg` コガネムシ型幼虫 (C字曲)
- `kuwagata.svg` クワガタ型幼虫
- `kamikiri.svg` カミキリ型幼虫 (elongate, 木質食)
- `zoumushi.svg` ゾウムシ型幼虫 (小型曲)
- `mizu_kouchu.svg` 水生甲虫型幼虫
- `imomushi.svg` イモムシ型 (蝶蛾の典型)
- `kemushi.svg` 毛虫型 (有毛)
- `hachi.svg` ハチ型幼虫 (白色蜂児)
- `uji.svg` ウジ型
- `kabuto_pupa.svg` 甲虫蛹 (土繭タイプ)
- `chou_pupa.svg` 蝶蛹 (角あり)
- `ga_pupa.svg` 蛾蛹 (繭の中)
- `hachi_pupa.svg` ハチ蛹

### 不完全変態 (nymph)
- `yago.svg` ヤゴ型 (Odonata)
- `batta.svg` バッタ型若虫 (Orthoptera, 既定)
- `kamakiri.svg` カマキリ型若虫 (Mantodea)
- `semi.svg` セミ型幼虫 (地中型)
- `kamemushi_nymph.svg` カメムシ型若虫
- `gokiburi.svg` ゴキブリ型若虫

### 共通
- `egg.svg` 卵 (全種共通)

## Fallback

SVG 未制作時は `shared/bug_archetypes.js` の `stageEmoji(stage)` が返す絵文字で代替:
- egg → 🥚
- larva → 🐛
- pupa → 🛌
- nymph → 🦗

## デザインガイドライン

- 既存図鑑カードと統一感のある線画ベース
- 固定色 (種代表色のパラメトリック適用は将来検討)
- 64x64 viewBox を推奨 (UI で 32px 等にスケール可能)
