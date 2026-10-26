# round: kom_bamen_yomitori 実装の修正 1

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-bamen。前の round (.claude_plan/impl_bamen_yomitori.md) の未 commit の実装を直す。仕様の正本: docs/komorebi_bamen_yomitori_curriculum.md (v0.5.4)。

## 範囲

1. W17 の一言の〈ひと〉を、子どもが選んだ人ではなく、doc 7.2 の定義どおり「全体を結んだ人」(s5/s5b の p、または未知の人) にする。誤答の型を付けるとき、W17 の当たりごとに結んだ人を一緒に持ち、肢ごとに保存して差し込む。polarity が down の問題で、W17 の肢が p ではない場合を検査する assert を、生成器テストかセッションテストに足す。tools/komorebi/bamen_yomitori_audit_sim/strict_gen.js の同じ箇所 (W17 の差し込み) も同じように直す。
2. セットが規則を満たせないとき、throw せず、doc 4 章の冒頭どおり、ハードな規則 (問題オブジェクトが正しい、肢が互いに異なる) を満たす最も近い候補を返す。満たせなかった規則は、返すセットの violations に記録する。retry の上限で throw しないこと。
3. 選択式の feedback は、choices と同じ順の配列にする (find_all と同じ形)。添字の鍵と型の鍵を同じ object に混ぜない。app.js の読み取り側も合わせる。
4. find_all で正しい候補を落としたときの一言 (doc 7.2 の W18 の行) は、生成器が出す (たとえば find_all の問題に feedbackMissed を持たせる)。app.js に子ども向けの文を直接書かない。
5. find_all の判定は、今の汎用の ansSet の経路のままとする。生成器の judge は、テストだけで使うものとして残してよい。
6. 生成器テストを 30 秒程度に縮める。セット数と偏りの検査の標本数を減らし、比率の検査の帯の余裕が減らした N でも保たれることを確かめてから数を決める。
7. 文の組み立ての残骸を消す。具体的には it.text の二重代入、使っていない nameOfValue、何もしない replace('なん','なん')。q_first の組み立ては qFirstText の経路だけにする。
8. 問題オブジェクトが scene と S など doc 9.3 にない内部の field を持つのは、strict_check を当てるためのテスト用の継ぎ目として受け入れる。生成器の冒頭のコメントに 1 行でそう書く。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` が全 green。`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則や検証項目どうしが矛盾しているときだけ BLOCKED にする。
