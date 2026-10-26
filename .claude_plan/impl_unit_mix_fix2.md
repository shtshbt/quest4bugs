# round: kom_unit_mix 実装の修正 2

作業ツリー: /home/shota/holon_ecosystem/worktrees/quest4bugs/impl-unit-mix。修正 1 (.claude_plan/impl_unit_mix_fix1.md) の未 commit の実装を直す。仕様の正本: docs/komorebi_unit_mix_curriculum.md (v0.2.10)。

修正 1 の 3 (冷えた最初のセットの時間) は、komorebi/unit_mix_data.js という事前計算の data file で解いたが、配信物として受け入れられない。

- 大きさが約 6.9 MB ある。小道のページを開くたびに読み込まれ、sw.js の CORE で全員の端末にキャッシュされる。この PC でも読み込みに約 0.5 秒かかり、子どものスマホでは数秒かかる。
- data.plans に Lv ごとに 512 通りの計画を固定で持っている。計画の種類が有限で固定されると、セットの種類が少なくなり、同じ組み立てが繰り返される。doc の層化と罠の規則を、無限の候補から引く前提でも満たすこと。

## 範囲

1. unit_mix_data.js を廃止するか、次の上限に収まる形に作り直す。
   - 配信 file の合計 (unit_mix_generator.js と data file) は 300 KB 以下。
   - 小道のページの読み込み時に unit_mix 用に使う時間は、この PC の node で 20 ms 以下。
   - 各 Lv の冷えた最初のセットと、1 セットの最悪値は、どちらも 100 ms 以下。
   - 方法は任せる。たとえば、候補の表をその Lv のセットを初めて作るときに必要な分だけ作り、作る量に上限を設ける。あるいは、表を数え上げずに、条件を満たす値を直接引く。
2. 計画は毎回その場で引く。固定の計画の pool は使わない。doc 9.8 の手順 (計画、罠の数え、鏡像、組み立て) をその場で回し、上の時間の上限を守る。
3. 1 の上限 (file の大きさ、読み込みの時間、冷えた時間、最悪値) をテストで assert する。冷えた時間は、新しい vm context で生成器を読み込んでから測る。
4. 前の修正で入れた build_unit_mix_data.js と、data file の一致テストは、data file を廃止するなら一緒に消す。index.html と sw.js の CORE からも外す。
5. ここまでの修正 1 の内容 (問題文の文言、表 B、分数の表示、other_unit の note、速さの表示順、cmp_notsame と diag_missed、型の記録、answerEngine の guard、付録 A を本番の生成器で照合すること、掃除) は崩さない。

## 検収

- `for f in tests/test_*.js; do node "$f"; done` がすべて green、`bash tools/check_version_bumps.sh` が OK。
- zukan_cards/ に diff が無い。commit はしない。
- doc の規則どうしが本当に矛盾するときだけ BLOCKED で止まる。文言の空白や句読点の揺れは 4.10 の形に合わせる。
