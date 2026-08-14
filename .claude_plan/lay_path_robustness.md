# 産卵経路の堅牢化 (産卵二重経路監査の指摘)

監査 (2026-08-14) で見つかった産卵・孵化経路の問題の修正。round 3 (.claude_plan/storage_sync_hardening.md) の後に適用する。指摘箇所のみ直し、他の挙動を変えない。既存の文体に合わせる。

## 1. (High) layEgg が「保存成功なのに返金」する分岐を持つ

- shared/reward.js の layEgg 内 (829 行付近):
  `if(r.ok && fossilOf(pid)===before-cost) return result(true,...)` が保存成否と残高検査を 1 条件に畳んでいる。r.ok===true (卵は永続化済み) でも、保存中に残高が別要因で動くと返金 + ok:false になり、かけら 0 で卵が残る。
- 修正: r.ok が真なら成功を返す (fossilAfter は実測値)。返金 (refundForEgg + q4b-egg-compensation) は !r.ok のときだけ実行する。

## 2. (High) 冷キャッシュで canLayEgg が育成中の卵を見落とす

- shared/reward.js の `_bs()` (683 行付近) は __bsCache 未ロード時に空の育成状態を返す。ensureBreedingLoaded はどのページからも呼ばれていないため、ページを開いて最初の卵操作までの間、御神木の産卵ピッカーに「今そだてている種」が候補として並び、選ぶと必ず precondition 失敗する。教科図鑑の 🥚×N バッジと「そだてちゅう」行も初回描画で欠落する。
- 修正: `_bs()` の冷キャッシュ fallback を `(eggStore.get && eggStore.get()) || blank` に変える (keisan/app.js の adapter は get を持ち QuestSave.breedingOf を同期で返すので、読み取り系はこれで正しい値になる)。mutation 系は従来どおり _ensureBsLoaded 経由なので挙動不変。

## 3. (Medium) ボス種の産卵可否がボス図鑑と御神木で食い違う

- shared/boss_zukan.js (333-338 行付近): detailHTML / layEgg に渡す coll が `BATTLE.bosses[id]` 1 件だけの合成 coll で、孵化で教科 coll にだけ入った反対性別が見えない。御神木からは産めるのにボス図鑑では disabled になる。
- 修正: ボス図鑑側の coll を「BATTLE.bosses[id].records と gameFor(sp) 教科 coll の同 id records を concat した合成 coll」にする (御神木の merge 規則と揃える)。

## 4. (Medium) 図鑑詳細が待機中の卵を見ない

- shared/zukan_detail.js (507 行付近): ownEgg の探索が bs.eggs のみ。pendingEggs も探索し、見つかったら「📬 まちのたまご」表示にして産卵ボタンを抑止する。
- 同ファイル 490 行付近の disabledReason「…上限 3 に とどいてるよ」は旧仕様 (現仕様は満杯でも産卵可で待機列へ)。上限の記述を削り「いま 同じむしを そだてているよ」だけにする。

## 5. (Low) boss_zukan の孵化が Promise を同期扱い

- shared/boss_zukan.js (344 行付近): `var r = RW.hatchEgg(...); if(!r){...}` を .then 化する (kanjiHatchEgg 等と同じ形)。演出と教科 coll 書戻しが現状壊れている。

## 6. (Low) openLayConfirm のオーバーレイ多重積み

- shared/breeding.js (374-393 行付近): append 前に既存の `#q4bLayConfirmOv` を remove する (notifyEggLaid と同じ規則)。

## 7. (Low) 自動孵化の並列実行で totalReared が取りこぼす

- index.html の _autoHatchReadyEggs (1436 行付近): namespace ごとの処理を Promise.all の並列から直列チェーン (reduce) に変える。hatchEgg が __bsCache を in-place で読む/書くため、並列だと totalReared が 1 しか増えないことがある。

## 8. (Low) 小道段の消失

- shared/breeding.js の homeBreedingPanelHTML: 小道段の表示条件を「小道の卵が eggs にある」から「eggs か pendingEggs に小道の卵がある」に広げる (唯一の小道卵をこうたいした瞬間に段ごと消えるのを防ぐ)。opts に pendingEggs が渡っていなければ渡すよう index.html 側も合わせる。

## 9. (Low) breeding_debug の Promise 同期扱い

- shared/breeding_debug.js (85, 91 行付近): R.layEgg / R.hatchEgg の戻りを .then 化する。?debug=1 専用なので挙動確認は console 出力レベルでよい。

## 見送り (記録のみ、実装しない)

- L3 (満杯予告と queued 判定のデータ源差): S1 修正 + round 3 の revision 保持で不正卵の発生源が減るため許容。docs 側に注記があれば足す程度
- 未定義境界 (小道図鑑の産卵 UI、小道段の「＋」のスコープ) はユーザ判断待ち

## 回帰テスト

- tests/test_t03_breeding.js の流儀に合わせて追加 (同ファイルに足すか、新設 test_lay_path.js):
  1. layEgg: saveVersioned 成功 + 残高が想定外に動いた場合でも ok:true で卵が残り二重返金しない
  2. 冷キャッシュ (__bsCache 破棄状態) で layableSpecies が育成中の種を候補に出さない
  3. zukan_detail の ownEgg が pendingEggs も拾う (source 正規表現でも可)
  4. _autoHatchReadyEggs 直列化後、2 教科同時 ready で totalReared が 2 増える (可能なら)

## cache busting

- 変更した js の ?v= を全参照ページで +0.0.1、sw.js CACHE を +1

## 検収

- `for f in tests/test_*.js; do node $f; done` 全 green
- commit はしない (レビュー後にこちらで行う)
