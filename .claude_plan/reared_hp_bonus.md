# そだてた虫の常時 HP +2 (最終確定版 2026-08-14)

決定: 卵からかえした (reared) 個体を持つ種は、バトルで常時 HP +2。SS も対象 (育てた伝説 = 22)。合成則は「floor の後に加算」で、化石パーツの説明「HP を 20 にする」は一切変えず、そだてた +2 はその上に最後に足される上位レイヤーとして扱う。

- 谷 (かせきのたに、装備が有効): HP = (HP パーツ装備かつ非 SS なら max(素, 20)、それ以外は素) + (そだてた種なら +2)
- 谷の外 (装備無効): HP = 素 + (そだてた種なら +2)

| 谷での HP | 素 | パーツのみ | そだてたのみ | そだてた + パーツ |
|---|---|---|---|---|
| N | 8 | 20 | 10 | 22 |
| R | 10 | 20 | 12 | 22 |
| SR | 13 | 20 | 15 | 22 |
| SSR | 16 | 20 | 18 | 22 |
| SS (パーツ不可) | 20 | - | 22 | - |

設計原則 (docs に明記):
- 平等原則の維持: どの種も「育てる + パーツ」で 22 に並ぶ。育てた伝説だけが強いのではない
- パーツの説明「HP を 20 にする」は不変。そだてた +2 は独立の上位効果として最後に加算、という 2 層の理解
- ガードレール: そだてた常時ボーナスは +2 に固定。将来強化したくなったら HP でなく別軸 (きずな等) へ

## 実装

1. shared/battle.js:
   - `var REARED_HP_BONUS = 2;` を HP_BY_TIER の近くに追加
   - `function bugHP(rarity, reared){ var base = HP_BY_TIER[rarity] || 8; return reared ? base + REARED_HP_BONUS : base; }` (第 2 引数省略時は従来挙動 = 後方互換。SS 除外はしない)
   - export に REARED_HP_BONUS を追加
2. battle.html:
   - パーティ構築時に reared 種の集合を作る: BATTLE_COLLS (keisan/kanji/eitango の coll) を走査し、`catches[id].records` に `reared === true` の record がある種 id の集合。ボス記録 (BATTLE.bosses) 側も走査対象に含める (ボス卵の孵化記録は教科 coll に入るので通常は教科側で拾えるが、両方見て和集合にしておく)
   - `effectiveBugHP(sp)`: `var bonus = isReared(sp.id) ? B.REARED_HP_BONUS : 0;` とし、
     - 装備非有効時: `return B.bugHP(sp.rarity) + bonus;`
     - 装備有効 + eq.hp + 非 SS: `return Math.max(B.bugHP(sp.rarity), HP_FLOOR||20) + bonus;`
     - それ以外: `return B.bugHP(sp.rarity) + bonus;`
   - HP 表示 3 箇所 (パーティ選択 1165 行付近、一覧 1217 行付近、1716 行付近) を reared 込みの実効値にし、reared 種に `🐣+2` バッジを添える
   - equipment の HP スロット説明文 (equipment_data.js の "HPを20にする") は変更しない。代わりに battle.html の HP パーツ装備画面 (openPartyEquip の hp スロット表示付近) に 1 行だけ注記を足す: 「そだてた虫は さらに +2 されるよ」
   - 直接 B.bugHP を呼ぶ残り箇所を grep で全列挙し、戦闘計算と表示がすべて reared 込みで一貫するよう揃える
3. チャメレオン戦など battle.html 内の他モードが effectiveBugHP を通ることを確認 (通っていれば変更不要)
4. 小道種はバトルに出ない (OWNED が 3 教科 coll 由来) ため対象外

## 回帰テスト

- 新設 tests/test_reared_hp.js (shared/battle.js を vm で load):
  1. bugHP("N") === 8 (後方互換)、bugHP("N", true) === 10、bugHP("SSR", true) === 18
  2. bugHP("SS", true) === 22 (伝説も +2)
  3. REARED_HP_BONUS === 2 が export されている
  4. battle.html の source 検査: reared 判定 (records の reared 走査)、`Math.max(...)` の後に bonus を加算する合成順、🐣 バッジ、パーツ画面の注記 1 行が存在する (正規表現)
- 既存テスト (test_t03_*, test_t10_chameleon 等) 全 green を維持

## docs

- docs/breeding_eggs_plan.md (無ければ docs/komorebi_breeding_bonus_gaps.md の末尾) に本決定を追記: 常時 +2 (SS 含む) / 合成は floor→加算 / パーツ説明は不変で上位レイヤーとして理解 / 平等原則は「育てる + パーツで全種 22」で維持 / ガードレール +2 固定

## cache busting

- shared/battle.js の ?v= を参照ページ (battle.html、test_zukan.html。他にあれば grep で列挙) で +0.0.1
- sw.js は触らない (並行する別 round と衝突するため、CACHE bump は commit 時にオーケストレータ側で行う)

## 検収

- `for f in tests/test_*.js; do node $f; done` 全 green
- zukan_cards/ 配下は検収の diff 判定から除外 (並走写真バッチが触る)
- commit はしない (レビュー後にこちらで行う)
