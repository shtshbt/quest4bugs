---
author: Shota Shibata
title: Quest4Bugs Known Issues / 未着手バグ・改善
updated: 2026-06-22
---

# Quest4Bugs Known Issues

最近の集中監査 (kanji 60+ 件・eitango/keisan 各種) のうち、 まだ着手していない
or 着手中の項目を整理する。 commit ごとに「済」へ移し、 残ったものが本ドキュメント。

優先度 = High / Medium / Low。
分類 = `教科` (kanji / eitango / keisan / battle / 全体) + 系統。

---

## High — 次セッションで対応

### 直近報告で未対応 (T 系列)

- **T4 クラウド push queue の偽 synced** — pendingPush が pushAll() を通らず status 更新もないため、 push 中の保存が消える可能性。 dirty generation 方式に。
- **T6 デプロイ更新中の混成 boot** — HTML が新、 JS が旧 caches 返却で migration が旧ロジックで実行される。 build hash + manifest 整合チェック。
- **T7 eggUid 導入** — species ID を卵 ID 兼用しており、 同種の異なる卵を区別できない。 crypto.randomUUID ベース uid に。
- **T8 GitHub commit に名前・履歴が残り続ける** — snapshot 高頻度 commit が past commit に残存。 機密分離 / squash / repo rotate。
- **T10 装備の二重インデックス** — equipped + equippedBy が片方欠落時に補完されず、 唯一品の複製。 equippedBy を導出専用に。

### keisan の学習尺度

- **K9. 時刻逆算 Lv5/6 が「何時何分」を聞いて 分の数字しか採点しない**。 時を
  またいだ理解を問わないと、 出題趣旨と乖離。 時・分を別入力 / `2:45` を `245`
  で入力 / 完全な時刻を 4 択、 のいずれか。
- ~~**K10. 筆算の不要なメモも正解扱い**~~ → v109 で修正
- ~~**K15. eitango freshness 二重消費**~~ → v109 で修正
- ~~**K19. 名前変更が計算側だけに反映**~~ → v109 で QuestSave.updateProfile 経由に統一
- ~~**K20. ミッションから基本カテゴリ 2 つ除外**~~ → v109 で 6 種ローテーションに
- ~~**K21. 「にがした虫」履歴の FIFO 重複**~~ → v109 で pkey 重複統合
- ~~**K22. 平均算 100 点超のテスト得点**~~ → v109 で 0-100 に制限
- ~~**K12. 複数端末同時使用 LWW 消失**~~ → v109 で親画面に赤字警告

### kanji / 全体 (前回 session の積み残し)

- ~~**K11. インポート (バックアップ復元)**~~ → v108 で `restore` モード追加済
- **K13. `kanji_data.js` の自動検査がない** — 漢字キー重複・用例語/例文内の対象
  漢字不在・空の用例・送り仮名 ok==ng・学年外・選択肢重複 を起動時 or CI で
  検査する。 旧形式 oku のような潜伏を未然に検出。

---

## Medium — 設計確認後

- **K14. お手本 hint guard を eitango spell モードへ展開**。 「答えを覗いた直後の
  正解」をどう扱うか eitango 側で別途設計。 keisan は手書きが無いため対象外。
- **K16. mergeStore のフィールドマージ**。 現状の per-KV LWW では「相手側の最近の
  1 問が来ると こちらの 10 問が消える」 ケースが残る。 将来的に SRS 単位の field-
  level マージを導入。

---

## Low / 設計余地

- **K17. audit `lower` 群** (ansSRS の defense-in-depth 等) — 主要修正で実害は
  封じている。 追加の堅牢化は急がず。
- **K18. 親画面の名前変更が p1/p2 固定** (旧指摘の low) — renameProf を id 引数化
  しているのを確認済み。 動的 ID 追加時の挙動は未テスト。

---

## 完了状況

### v118 (今回追加)
- **T1 ボス卵の無限再支給を停止**: boss_zukan.js の load 内の eggGranted true→false
  戻し migration を廃止 (孵化済み卵を「授与失敗」 と誤認する循環の根本) +
  bossesBackfill の救済条件を n>=1 から n>=10 に統一して仕様と整合
- **T2 二重自動孵化を遮断**: _autoHatchReadyEggs に pid-scoped mutex (`__autoHatchInflight`)
  と「hatched.length===0 なら save しない」 安全網。 ready 検出も T5 連携で
  target/progress invariant チェック付きに
- **T3 ポータル切替中の汚染を遮断**: DASH_SEQ + currentProfile 一致確認で
  renderDashboard の継続処理 (autoHatch / autoFinalizeLegacyMaster) を旧 pid
  で走らせない
- **T5 不正卵を自動孵化させない**: storage.js normalizeBreeding に _isValidEgg
  invariant 検証を追加し、 不正卵 (target undefined / progress 異常等) を
  data._brokenEggs に隔離。 autoHatch も Number.isFinite + target>0 を要求
- **T9 clone 残り穴**: profiles()/saveProfiles()/breedingSet() にも deepClone を
  追加して、 caller の in-place 変更が内部 store に漏れる経路を完全閉鎖

### v117 (前回)
- kanji: 認定テスト中の「こたえをみる」 ボタン削除 (書字 2 問 = 最大 20 点の
  ゲート回避封じ) / 認定テスト SES を per-profile localStorage に永続化 +
  「つづきから」 強制で中途リロード破棄ハック封じ
- eitango: retry 正解の報酬経路 (recordCorrect/feedEgg/onAnswer/amber/cal) を
  全て遮断
- 親画面: バックアップ取り込みを「あんぜん マージ」「ぜったい ふくげん」 の
  2 ボタンに分離、 強制復元前に自動エクスポートで rollback 可能に
- 各教科: 捕獲モーダル冒頭で QuestSave.warnIfDegraded() を呼び、 保存失敗時に
  無自覚で消える前に警告
- sw.js + storage.js: install 内 skipWaiting 廃止 + controllerchange をセッ
  ション中は保留しホーム遷移時にバナー (「いま こうしんする / あとで」) で
  通知。 認定テスト・ボス戦中の強制リロードを遮断
- 学習データ: kanji 例文の昆虫「つ」 数え 6 件を別対象 (いし/ドングリ/ボタン/
  木のみ/はっぱ) に変更、 eitango の blanch/concordance/lean on/ellipse 4 件
  の語義/例文整合を修正

### v116 (前回)
- keisan: keisanCatBoost と _kv 判定を reachedLv 基準に (故意 Lv 下降 farming
  封じ) / ensureLvProgress で maxLv 1 度きり移行 (既存ユーザ Lv10 履歴の保全) /
  reconcile で reg.name → p.name の同期 / ミッションに Q.day を持たせ日付また
  ぎで報酬付与しない / sougou patternId に Lv + 元 kind/patternId を組み込み
  別概念上書き防止
- shared/storage.js: load/save の境界で deepClone (structuredClone + JSON
  fallback) し、 caller の in-place 変更が内部 store に漏れて updated 未更新の
  まま同期で消える経路を遮断

### v115 (前回)
- keisan + shared/boss_zukan.js: プロフィール高速切替時にボス救済処理が別の子の
  卵ストアに書き込む経路を PROFILE_LOAD_SEQ + currentProfile 一致確認で遮断 /
  「ぜんぶ」 マスター条件を現コース全カテゴリ Lv10 (sougou 除外) に変更 (user
  設計判断: 真のフルコンプ) / showCapture に boost 引数を追加して復習成功は
  REVIEW_BOOST・ミッション連続日数は streakBoost を適用 / 日暦算 Lv6 で 1 月
  始まりを除外して平年/うるう年曖昧性を解消 / タイムアタック afterJudge で
  期限切れ確認 / displayMasterLabel で判定キーと表示ラベルを統一

### v114 (前回)
- keisan: 0 問セット (K5DEV データ欠落副作用) で報酬抽選される経路を fail-closed
  (startPractice で len<5 ブロック + finishSet に N==0 ガード) / 復習補充の null
  クラッシュ防止 / dueMissed をコースフィルタで前コース苦手混入を遮断 / Lv10 クリア
  を p.lv/maxLv に反映 (旧 `Q.lv<10` ガード解消) / 成績画面の正解率に発展カテゴリ
  を含めかつ Lv 推移は実データありのみに

### v113 (前回)
- shared/breeding.js: 通常卵 (notifyEggLaid) のトースト文言を「かけら→飼育環境→
  自発的産卵」 の三段構成に世界観整合

### v112 (前々回)
- keisan: 選択式 (K5DEV/九九暗唱/まちがいさがし) で誤答時に正解を ansHTML で表示 /
  低 Lv 固定練習 (Q.lv<現Lv) と既クリア段の九九を _kv=0.4 に / マスター判定を
  reachedLv(=max(lv,maxLv)) 基準にしてタイミング依存解消 / lvDotsHTML を p.adapt
  参照に統一 / setCourse のアイコン変更を QuestSave.updateProfile 経由に / 練習
  タイムを cat+lv 別キーで保存 / 加算 Lv4-9 の説明文を実装通りに

### v111 (前回)
- keisan: K5DEV セット内重複排除 (pool shuffle+exclude) / missedKey に lv+patternId
  を反映 / まちがいさがし Lv3 で v0-c<0 ガード / K5DEV データ欠落時を fail-closed
  (nextQ で alert + finishSet) / 割り算音声に「商/余り」 を残す / gFrac fallback
  追加 (sougou 例外回避) / 割り算 Lv6 を qq<=99 で商 2 桁限定

### v110 (前回)
- keisan: 暗算 Lv5 で負数の答えを排除 (入力不能だった) / 復習対象に発展カテゴリ
  K5DEV/K10DEV を含める / タイムアタック解放を p.timedUnlocked[cat] で永続化 /
  リセット時に keisan/_book と keisan/_legacy も削除 / 九九暗唱 2 の段「ににんがに」
  →「にいちがに」 訂正+穴埋め分割を「が」「じゅう」基準の構造的に / 筆算 Lv 説明を
  加算・減算別の実装通り文言に

### v109 (前回)
- keisan: 筆算の不要メモを誤答扱いに / ミッションを全 6 基本カテゴリの「久しく
  触っていない」順で選択 / missed (にがし虫) を pkey で重複統合 / 平均算 Lv2/4/5
  の得点を 0-100 制限 / 名前変更を QuestSave.updateProfile 経由に
- eitango: freshness 二重消費を Reward.freshnessPeek + prefresh で解消
- kanji: 名前変更で共有レジストリも更新
- root: 親画面に「同じ子を 2 台で同時使用は進捗消失リスク」 を赤字で明示

### v108 (前回)
- keisan: 0 点ミッション farming 封じ (3/5 報酬制) / 九九音声 UI から正解併記
  削除+最後の数 判定 / 解放最高 Lv (p.maxLv) を現在 Lv と分離 / タイムアタックを
  適応バッファ p.adapt から除外 / バックアップ復元 restore モード新設 / kanji UI で
  マージ取り込み/強制復元 分離 / 年齢算フォールバック ans=15→20 / 暗算マスター条件を
  p.lv.anzan>=10 に変更

### v107 (commit 系列 c032984..前回)
- kanji 系: SRS 抜け道 / タイマー競合 / 連打ロック / freshness 二重 / 報酬価値固定 /
  復習 due/wasDue / ST.retests 辞書化 / プロフィール非同期競合 / セッション SEQ /
  送り仮名旧形式 / t_exam scope / CFG.all デバッグ汚染 / 名前 updated / 0 点記録 /
  wasGold / 出題空欄位置 / 音声と表示一致 / hinted SRS skip / 用例 seen Gate /
  stage 統合 / マスター演出キュー / 図鑑タブ維持 / リセット文言 / rq 二重報酬 /
  新出 cap 全入口 / スキルゲート維持
- eitango: ansSRS / ansKids / closeFB 連打ロック / ヌシ戦 feedEgg gate
- keisan: fbNext / keiCatchDone 連打ロック / timed mode の recordStat & save 復活
  / freshness 二重消費 / 引き算 Lv5 再定義 / 復習ブロック+_mid 限定 BOOST /
  適応 Lv 進行除外 / 九九 kukuHits リセット / 音声認識古コールバックガード /
  resetAll 実体化 / ひき算筆算の先頭 0 許可
- storage: persist 失敗検知 + isDegraded() + 赤バナー / mergeStore タイブレーク (ローカル優先)

---

## 着手ポリシー

- High = 次 commit で対応
- Medium = 別 PR / 設計確認後
- Low = ロードマップへ統合 (`roadmap.md` 参照)
