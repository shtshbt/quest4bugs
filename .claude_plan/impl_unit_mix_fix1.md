# round: kom_unit_mix 実装の修正 1

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-unit-mix。前の round (.claude_plan/impl_unit_mix.md、仕様の版の記載は v0.2.7 と古いが正本は v0.2.9) の未 commit の実装を直す。仕様の正本: docs/komorebi_unit_mix_curriculum.md (v0.2.9)。

## 範囲

1. 問題文を doc の文言と一字一句同じにする。4.10 章の形と 6 章、付録 A の例 (「12kg を g に なおします。どうしますか。」「1.5時間 は 何分ですか。」「A と B。kg に そろえて くらべると、…」、を の前の空白など) に合わせる。生成器が作る問題文が 4.10 の形に合うことを検査するテストを足す。doc の中で形が割れていて決められないときは、BLOCKED で報告する。
2. speed_apply の not_aligned の解説で差し込む単位の組を、check_explanations.js (表 B) と同じにする。表 B の照合は、テスト用の adapter ではなく、生成器が実際に作った問題の errorValues と feedback に対して、全 pattern について行う。
3. 最初のセットでの遅さを直す。いまは Lv10 の最初のセットに約 1 秒、温まった状態でも 1 セット最大約 1 秒かかる。冷えた状態の最初の 1 セットと、1 セットの最悪値の両方を、各 Lv で 100 ms 以下 (この PC の node) にする。方法は任せる。たとえば、表を tools のスクリプトで事前に計算して komorebi/ の data file として commit し、生成器がそれを読む方法がある。その場合は、data file と生成器の規則が一致することを確かめるテストを足し、新しい file は index.html と sw.js CORE に入れる。テストで冷えた時間と最悪値を assert する。
4. 分数の時間の表示を、共通の displayText の正規表現から外す。生成器が分数を構造的に印を付けて返し (たとえば fraction token か別の field)、kom_unit_mix の問題を表示するときだけ、既存の .fr の部品で描く。ふりがなが付いても壊れないこと。
5. 単位チップがちがうとき、judgeNumUnit の other_unit の note (「たしかに … だけど、きかれているのは …」) を出す (6 章 Lv2)。app.js の kom_unit_mix の分岐で、feedback が空で verdict.state が other_unit のときは verdict.note を出す。
6. 速さの答えの表示順を doc 9.5 の形 (秒速 15m) にする。答えの行と note の両方で、生成器の quantityText を使う。
7. compare の肢で型が付かないものを cmp_bigunit に落とさない。9.7 の決め方から本当の型を導く。正答が左か右のときの「同じ」の肢は、doc v0.2.10 で足す新しい型 (正答が同じでないのに同じを選んだ誤り) に当てる。付録 A.6 の第 4 問もこれで受け入れる。
8. 一致したすべての誤りの型と q.traps を、提出の event に載せる (保存は別 round)。feedback は {text, types} を返す。
9. answerEngine の経路に、読み込みの確認を足す (他の分岐と同じく「…を読み込めません」で throw)。
10. 付録 A のセットを、本番の生成器でも照合する。各問を生成器の問題の形にして、生成器の judge、誤りの型、解説の文が doc の答えと一致すること、setOk が各セットを受け入れることを assert する。spec 9.1 の export 名に judge を足す。
11. 掃除: 呼ばれない realise() と、それだけが使う helper を消す。RECENT を使う。使っていない pids と WAZA の要素を整理する。テストだけが設定する q.hourDisplay をやめ、生成器が値を持つ。waza.alternate を 9.3 どおりにする。
12. 生成器テストを 30 秒程度にする。
13. この plan の元の file (impl_unit_mix.md) の版の記載を v0.2.9 に直す。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` が全 green、`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則や検証項目どうしが矛盾しているときだけ BLOCKED にする。
