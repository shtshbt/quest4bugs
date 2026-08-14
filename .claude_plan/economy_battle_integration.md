# round 8: こはく減衰・入れ替えリロール対策・小道昆虫のバトル/装備参加 (2026-08-14 決定 3 件)

決定: ①こはくを学習価値に連動させ既習周回を約 1/4 に減速 (救済通路は維持) ②戦闘の問題を「ターン × 教科」で固定しリロール利得を消す (入れ替えペナルティは付けない) ③小道昆虫をバトルと化石パーツ装備に参加させる (抽選・図鑑分母・通貨の隔離は不変)。

## ① こはくの価値連動減衰

1. shared/reward.js の `onCorrect`: `earnAmber(coll, AMBER_PER_CORRECT)` (満額固定) を、ゲージと同じ `freshnessOf` 係数 × value に連動させる。係数の二重消費を避けるため、既に acc 加算用に計算している係数を再利用する (freshnessOf を 2 回呼ばない)。
   - `amberGain = Math.max(0.25, coef * v)` (下限 0.25 = 約 1/4 減速の下限)
   - 整数ウォレットとの接続は小数アキュムレータ: `coll.amberAcc = (coll.amberAcc||0) + amberGain;` 1 以上になったら整数部を `earnAmber` して減算。coll に amberAcc が増えることになるので、各ゲームの保存経路で問題ないことを確認 (validateCollection 系は未知キー許容のはず)
2. komorebi/app.js の `feedSideRewards`: こはく 1 固定を、feedEgg に渡している value と同じ係数 (習熟済み 0.4 / 通常 1.0) に連動させる。同じアキュムレータ方式 (profile.collection.amberAcc)
3. onCorrect を経由しないでこはくを配る経路が他に無いか grep で確認 (kanji テスト・eitango 通常モードが onCorrect 非経由なら、そこにこはく付与があるか調べ、あれば同じ減衰を適用。無ければ何もしない)
4. 誘導文言: shared/breeding.js の御神木卵パネルの説明行 (「もんだいに せいかいすると、それぞれの 教科で そだつよ」) の直後に 1 行追加:
   「まだ マスターしていない もんだいを とくと、たまごが はやく そだって、こはくも たくさん もらえるよ！」

## ② 戦闘の問題をターン × 教科で固定

- battle.html の出題箇所: 現在は虫を選ぶ (入れ替える) たびに問題を生成している。これを「ターン内は教科ごとに 1 問固定」に変える:
  - `st.turnQuestions = {}` をターン開始時 (前の問題の提出処理後) にクリア
  - 出題時: `var subj = gameFor(選択中の虫); st.turnQuestions[subj] = st.turnQuestions[subj] || 問題生成(subj); その問題を表示`
  - 提出したら消費 (従来どおり)。同ターン中の入れ替えでは同じ問題オブジェクトが再表示される
- 入れ替え操作自体の仕様 (ペナルティなし・自由) は一切変えない

## ③ 小道昆虫のバトル・装備参加

1. battle.html:
   - パーティ候補 (OWNED / BATTLE_COLLS 構築箇所) に komorebi save を追加: `QuestSave.load("komorebi", pid)` → `profile.collection.catches` を読み取り専用で合流。battle から komorebi save への書き込みは一切しない
   - そだてた +2 の reared 走査対象にも komorebi の records を追加
   - 属性は既存の `gameFor(sp)` がそのまま効く (小道種も order を持つ)。追加実装なし。レア度は N/R/SR のみなので HP 8/10/13 (+2)
   - パーティ編成・戦闘中の名前表示は `Q4B_SPECIES_DISPLAY_NAME` があれば経由し、仮称に「（仮称）」を付ける (無い箇所は既存の speciesName 相当を確認して統一)
2. index.html: 化石パーツ装備の対象一覧 (`gatherOwnedSpecies`) に komorebi save を追加 (読み取り専用)。装備効果は谷限定の既存仕様のまま
3. docs: `docs/komorebi_release_linkage.md` の 4 章 (公開前パイプライン) の種選抜項に「バトル属性 (分類ベース: チョウ→かんじ / 甲虫→けいさん / 他→えいご) の配分を確認し、可能な範囲で 3 属性を確保する。実測: MG Ⅰ は 22/4/58 とえいご偏重 (凍結済みのため受容)」を追記。`docs/komorebi_design.md` 9.2 の隔離リストに「バトル・装備・育成は相互乗り入れ (2026-08-14 決定)、抽選・図鑑分母・通貨は隔離のまま」を明記

## 回帰テスト

- tests に追加 (既存の流儀に合わせる):
  1. onCorrect のこはくが value/freshness に連動し下限 0.25 を守る (既習 value=0.4 の連打で 1 問 1 こはくにならない)。適正学習 (value=1、新規問題) は従来どおり 1 問 1 こはく
  2. komorebi feedSideRewards のこはくが習熟時 0.4 になる (test_komorebi_breeding.js を更新: 現在は amber=1 の整数前提なのでアキュムレータ対応に書き換え)
  3. battle.html source 検査: OWNED 構築に komorebi、turnQuestions キャッシュの存在
  4. ターン×教科キャッシュの機能検証が可能なら node で (難しければ source 検査でよい)
- 既存全テスト green

## cache busting

- 変更 js (reward.js / breeding.js / komorebi/app.js) の ?v= を参照ページで +0.0.1。battle.html・index.html は HTML なので不要。sw.js の CACHE bump はオーケストレータが commit 時に行うので触るな

## 検収

- `for f in tests/test_*.js; do node $f; done` 全 green
- zukan_cards/ 配下は diff 判定から除外
- commit はしない (レビュー後にこちらで行う)
