# round N: kom_seisu 実装

仕様の正本: `docs/komorebi_seisu_curriculum.md` (v0.6)。共通要件: `.claude_plan/k10_new_cats_common.md`。

共通要件からの逸脱が 2 点ある。先に読むこと。

1. release ゲートは `release: 9` ではなく **`release: 3`** で登録する。本カテゴリは共通要件の 5 カテゴリより後に起案され、投入判定が完成順へ変わった (roster 4 章の記録 13)。ただし公開する巻の枠はまだ決まっていないため、`CURRENT_RELEASE` は動かさない。実際の公開値は別 round で決める。**暫定で `release: 9` を置き、公開枠が決まってから下げる**方針とする。
2. 敵ソルバー回帰テストの攻撃の実体は curriculum 側に無い。`docs/komorebi_seisu_audit.md` の **7.4 章 (実装への申し送り)** が正本である。攻撃ごとに対象 Lv、手続き、閾値が書かれているので、その全件を test に実装する。curriculum の 10 章は閾値と測定条件しか持たない (再監査 H8 の対処)。

## 範囲

1. `komorebi/seisu_generator.js` を新設。Lv1-10、全問生成。内部表現と pattern 空間は curriculum 9 章、pattern の全列挙は 3.1 章が正本。約数・倍数・最大公約数・最小公倍数・素因数分解・余りの周期を扱い、単位換算と概数と N 進法は範囲外 (3 章)。
2. セット構成の規則は 4 章。とくに次の 4 つは本カテゴリ固有で、既存カテゴリに前例が無い。
   - 4.4.1 章の場面問題の境界: 全問を与件 3 数に揃える。一致問題にも答えに影響しない境界を付ける
   - 4.4.2 章の四象限規則と、`floor(n ÷ 2)` に相対化された反転の下限
   - 4.3 章の対比ペア: 同一形式どうしに限る。数の多重集合、選択肢集合、答えの型がすべて一致すること
   - 4.2 章の配合列と 9.4 章の patternId 空間サイズ。上限は `ceil(セット長 ÷ 空間サイズ)`
3. 出題順は注入 random で決める (再監査 H1)。足場は前半 2 問、連鎖は認識が先、隣接相異の制約下。対比ペアは隣接させ、ペア内の順序も乱数。
4. 整列 (ordering): 部品設計 7 種、うち 2 種は数を 1 つも含まない。一意性は `requires` / `produces` の位相順序で保証し、数値連鎖に依存しない (4.7 / 9.5 章)。`komorebi/app.js:472` が部品数 3-4 と `ans.length === parts.length` を要求するので、選別形 (捨て部品) は作らない。
5. 診断: ラベルは 8 章の正本表のみ。`correct_alternative` は存在しない (発案者の決定で廃止)。別解の答案は `correct` として出し、正答案の 3 分の 1 以上を別解答案にする (4.8 章)。表層形衝突は 8.2 章の表から各 Lv 2 組以上を実装し、どちらの側を出すかは注入 random。
6. `komorebi/app.js`: CATEGORIES に登録 (course k10、表示名は curriculum の指定、maxLv 10、release は上記 1 のとおり暫定 9)、SESSION_STARTERS 登録。新形式は不要 (normal / formulation / ordering / diagnosis / find_all のみ)。
7. テスト:
   - `tests/test_komorebi_seisu_session.js`: 画面の文面だけから 5 問セッションが解けることを固定。release ゲート型。
   - `tests/test_komorebi_seisu_generator.js`: curriculum 10 章の検証項目のうち機械化可能なもの全件。敵ソルバーは監査 7.4 章の一覧を実装し、各攻撃を 200 セットで閾値未満に固定。あわせて付録 A の全 10 セットを golden case として再現できることを検査する (共通要件 12)。
8. `komorebi/index.html` に script タグ追加、`sw.js` の CORE 配列に行追加。CACHE 文字列は触らない。`komorebi/app.js` の `?v=` を +0.0.1。

## 既存コードの落とし穴 (着手前に確認すること)

1. **`find_all` の正解集合の持ち方が既存カテゴリ間で揃っていない。** `komorebi/app.js:1812` のコメントが「図化の find_all だけ正解集合が `ansSet` (生成器の契約)。他カテゴリは `ans`」と述べ、`answerText` は `Array.isArray(question.ans) ? question.ans : question.ansSet` で両対応している。判定側 (`app.js:1855` 付近) も図化だけ別経路を持つ。本カテゴリは find_all を 6 段 (Lv1、2、3、7、9、10) で使うので、どちらの契約に乗るかを最初に決め、生成器と test の両方で一貫させること。既存の利用は `johou_seiri_generator.js`、`diagram_model_generator.js`、`kuku_reverse_generator.js` の 3 本にあるので、図化以外の 2 本がどちらを使っているかを読んでから決めよ。**契約を混在させると採点が黙って通る形で壊れる。**
2. `komorebi/app.js:472` が整列の部品数を 3 以上 4 以下に制限し、`ans.length === parts.length` を要求する。2056 行目は全部品の選択を submit の条件にしている。curriculum 9.5 章の部品設計 7 種がこの範囲に収まることを確認すること。
3. `FORMAT_KINDS` (`app.js:82`) は形式と kind の対応表である。本カテゴリは既存の 5 形式しか使わないので追加は不要だが、登録漏れはゲージが進まず例外になるため、使う組み合わせが表に存在することを確認せよ。

## 注意

- 付録 A が実装の受け入れ条件である。全 10 段の 5 問セットが構成済みで、制約充足も検算済み。生成器のセット組成がこれを再現できること。
- doc と実装が食い違ったら doc を正としてコードを合わせる。doc 自体の矛盾は BLOCKED で報告して停止し、勝手に解釈しない。本 doc は 3 巡の監査と 1 回の実在証明を経ているが、絶対値の下限が小さい空間で破れる事故が 4 度起きている。同種の破綻を見つけたら BLOCKED で止めること。
- 例題の数値は curriculum 側で検算済みだが、生成器のパラメタ帯 (9.2 章) から作った問題が同じ性質を満たすかは実装側で検査する。とくに 3 数の最大公約数と最小公倍数 (Lv10)、平方数を優先する `div_missing` の N 選択。

## 検収

- `for f in tests/test_*.js; do node $f; done` が全 green
- `zukan_cards/` は diff 判定除外
- commit しない
