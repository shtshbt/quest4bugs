# 小道 × 繁殖・通貨・ボーナス系 接続ギャップ (未実装リスト)

- 版: v0.1 (2026-08-14)
- 親文書: `docs/komorebi_design.md` (決定 2.1-8、5.4、6.2、9.2)、`docs/breeding_eggs_plan.md`
- 役割: 「既存処理を流用する」(決定 2.1-8) と宣言したまま接続点が未点検の系統を列挙し、作業再開時の起点にする。breeding 計画 (06-21) が小道設計 (08-11) より先行しており、流用宣言の時点で相互の再点検が行われていない。

---

## 1. 決定 (2026-08-14)

| # | 論点 | 決定 |
|---|---|---|
| 1 | 小道種の卵の育成教科 | **小道の正答で育てる**。`egg.game` に `"komorebi"` を導入し、kom_* カテゴリの正答時に `feedEgg("komorebi")` を呼ぶ |
| 2 | かけら (fossilFragments) | **本編限定**。小道では配らない。小道種の産卵コストは本編で稼いだかけらを使う |
| 3 | こはく (amber) | **小道でも配る**。既存報酬処理を流用 |
| 4 | 雫 | **小道非対応 (暫定)**。切り分ける。9.2 の混入防止リストへ追記 |
| 5 | 朝露ボーナス (6-8 時に色違い出現率上昇) | **小道の捕獲抽選にも適用する**。朝に触るインセンティブは小道でも同じに働く。抽選器が本編と共通ならフラグ確認のみで済む可能性があるが、コード確認が先 (下記 2-4) |

## 2. 未実装 (作業リスト)

1. **METAMORPHOSIS_BY_ORDER への海外目の追加**。`canLayEgg` は `sp.metamorphosis` 必須で、この表は国内主要目のみ。小道は全昆虫目を許容する (design 決定②) ため、表に無い目の海外種は無言で産卵不可になる。enrichment 段階で order は取得済みなので機械的に埋まる。あわせて volume freeze validator に「metamorphosis 未定義種の一覧」を出す検査を追加し、産卵不可種を無言にしない
2. **`eggGameFor` の分岐**。collectionSet を持つ種は `"komorebi"` を返す。`feedEgg("komorebi")` を小道正答時に呼ぶ。逆方向 (本編種の卵が小道正答で育つ) は不可のまま。9.2 の隔離を破らない
3. **小道セッションのこはく付与** (決定 3 の実装)
4. **朝露ボーナスの適用確認**。仕様が docs に一切存在しない (Dropbox 全文検索 0 件、コードのみ)。まずコードから正本仕様 (時間帯 6-8 時、上昇率、判定箇所) を起こして文書化し、小道の捕獲抽選が同じ shiny 抽選を通っているか確認する。通っていなければ適用する
5. **雫の混入防止**。design 9.2 のリストへ「雫は小道で増えない」を追記
6. **(関連) volume 完走後ドロップ**。完走章からは重複のみ落とす案 (地域プールへのフォールバックはドライブを薄めるため不採用方向)。重複の価値 = サイズ・性別・色違いの記録 + ♂♀揃えによる産卵前提づくり。上記 1 と 2 が成立して初めてこの制約が正当化される。確定したら design 5.4 へ追記

## 3. 未決事項

1. ~~breeding UI での小道種の露出範囲~~ → 2026-08-14 決定: 卵の管理は御神木パネルに一元化する (小道ページに別の管理パネルを作らない)。小道種は御神木の卵ピッカーに並び、産まれた卵は御神木パネルの小道専用スロット段に表示される
2. 朝露ボーナスの正本仕様の文書化先 (本書に追記するか独立文書にするか)
3. 雫の最終判断 (暫定切り分けのまま確定するか)

## 4. 受け入れ基準

- 小道種で ♂♀ が揃えば産卵できる (metamorphosis が定義されている)
- 小道種の卵は kom_* 正答でのみ +1 され、本編正答では進まない
- 小道の正答で本編種の卵が進まない
- かけらと雫は小道のプレイで増えない。こはくは増える
- 6-8 時の小道捕獲で、色違い出現率が本編と同率で上昇する

## 5. コード検証結果 (2026-08-14)

komorebi/app.js、shared/reward.js、shared/breeding.js、shared/bugs.js、index.html (ポータル) を突き合わせた検証。

| 受け入れ基準 | 状態 | 根拠 |
|---|---|---|
| 小道種で ♂♀ が揃えば産卵できる | 未実装 | ポータルの卵ピッカー (index.html の _homeEggOpenLayPicker) は keisan / kanji / eitango の save だけを merge しており、小道の捕獲記録 (komorebi save) は canLayEgg から見えない。小道種は永遠に「産める」にならない |
| 小道種の卵は kom_* 正答でのみ +1 | 未実装 | eggGameFor は order ベース (Lepidoptera は kanji、Coleoptera は keisan、他は eitango) のままで "komorebi" を返さない。feedEgg("komorebi") の呼び出しも小道側に存在しない。仮に小道種の卵が生まれた場合、本編正答で育ってしまう |
| 小道の正答で本編種の卵が進まない | 満たす | 小道は feedEgg を一切呼ばない。keisan/app.js の feedEgg("keisan") は keisan 自身の判定関数内のみで、小道の applyAnswer 経路からは呼ばれない (小道ページが keisan/app.js を読み込んでいても発火しない。混線なし) |
| かけらと雫は小道のプレイで増えない | 満たす | komorebi/app.js は fossilFragments にも雫 (equipment rank 5) にも触れる経路を持たない |
| こはくは小道でも増える (決定 3) | 未実装 | 小道の applyAnswer は独自ゲージのみで earnAmber を通らない。共有ウォレット自体は keisan/app.js 先頭の setAmberStore 経由で小道ページにも配線済みなので、小道の有効正答時に加算を呼ぶ実装だけが欠けている |
| 6-8 時の小道捕獲で色違い率上昇 (決定 5) | 実装済み | recordCapture が reward.record を source:"wild" で呼び、shinyChanceFor が 6:00-7:59 に 0.045 (通常 0.015) を適用する。本編の野生捕獲と同一経路・同率 |

補足:

- METAMORPHOSIS_BY_ORDER は現在の小道在庫の全 11 目 (Coleoptera / Lepidoptera / Hymenoptera / Diptera / Trichoptera / Orthoptera / Hemiptera / Odonata / Mantodea / Phasmatodea / Blattodea) を網羅しており、今の在庫に産卵不可種は無い。将来の地域在庫でハサミムシ目、カゲロウ目、カワゲラ目などが入ると欠落し得るため、作業リスト 1 の freeze validator 検査は残す
- breeding.js の GAME_COLOR / GAME_EMOJI / GAME_LABEL に "komorebi" が無い。egg.game に "komorebi" を導入する際は表示 3 点セットの追加も必要
- 育成ゲージの論点 (決定 1 の再確認待ち): egg.game を "komorebi" にすると、小道の卵は共有 3 スロットを占有しつつ小道正答でしか進まない。小道を毎日回している間は本編と同等ペース (SR は 500 正答、1 日 50 正答で 10 日) で育つが、小道から離れるとスロットを塞いだまま停滞する。代替は本編正答でも育つ共有 feed だが、受け入れ基準 2 と矛盾するため実装前に判断が要る
  → 2026-08-14 解決: 小道の卵は小道専用スロット枠 (3 枠、本編 3 枠と別勘定) に入れる。停滞しても本編の育成を塞がないので、決定 1 (小道正答でのみ育つ) を維持できる

## 6. 実装記録 (2026-08-14、§5 の未実装 3 点を解消)

方針決定: 卵の管理 UI は御神木パネルに一元化 (管理場所を分散させない)。小道の卵は本編 3 枠とは別の小道専用スロット 3 枠に入り、停滞しても本編育成を塞がない。

- reward.js: `eggGameFor` が areaOnly:"komorebi" の種に "komorebi" を返す。スロットをプール別勘定にする `eggPoolOf` / `EGG_SLOT_MAX_KOMOREBI=3` を新設し、layEgg / awardEgg / acceptPendingEgg / promotePendingEgg の満杯判定をプール別に変更。`earnAmber` を export
- komorebi/app.js: `feedSideRewards` を新設し、recordAnswer / recordSubmission の有効正答時に `feedEgg("komorebi", 習熟済みなら 0.4)` + こはく +1 (共有ウォレット、keisan/app.js の setAmberStore 配線を流用)。純関数 applyAnswer は無副作用のまま
- breeding.js: GAME_COLOR / EMOJI / LABEL に komorebi (🌿 こもれび)。御神木パネルに小道専用スロット段 (小道の卵があるときだけ表示)。産卵確認と巣モーダルの空き数もプール別
- index.html: 卵ピッカーと親図鑑参照に komorebi save を合流 (小道の ♂♀ 捕獲が canLayEgg に見える)。孵化 2 経路 (手動 / 自動) に komorebi 分岐を追加し、成虫は小道 save の collection へ記録。小道 save 未作成なら孵化を見送る
- テスト: tests/test_komorebi_breeding.js (10 本)。受け入れ基準 5 点 + プール分離 + ヒント回答の非加算を固定
- 残: 完走章の重複ドロップ (作業 6)、volume freeze validator の metamorphosis 検査 (作業 1 の後半)、朝露仕様の文書化先 (未決 2)
