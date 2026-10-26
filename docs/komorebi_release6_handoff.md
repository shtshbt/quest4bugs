# 更新 6 (新カテゴリ 4 本) の作業の引き継ぎ

2026-10-26 に週の利用枠が 95% に達したため、作業を止めた。木曜の枠の更新のあとに再開する。ここに書いたことだけで再開できるようにしておく。

## 前提

- 更新 6 はまだ点火しない。`CURRENT_RELEASE` は 5 のまま。
- main に入っている 2 本 (式のかたちをかえる、場面の読みとり) は release 6 で登録しているので、子どもの画面には出ていない。
- 単位のまぜ練習と特殊算の型みわけは main に入れていない。作業ブランチにだけある。

## 4 本の状態

| カテゴリ | 設計 doc | 実装 | 置き場所 |
|---|---|---|---|
| kom_shiki_henkei 式のかたちをかえる (k5) | v0.3.7 (Phase 6 完了) | 完了。main の 97651177 と bf3dd75d | main |
| kom_bamen_yomitori 場面の読みとり (k5) | v0.5.5 (Phase 6 完了) | 完了。main の f193cccb | main |
| kom_unit_mix 単位のまぜ練習 (k10) | v0.2.10 (Phase 6 完了) | 修正 2 回まで済み。全 99 テストが通る。最後の細部レビューだけ未了 | branch claude/impl-unit-mix-20261026 (86f734e0、WIP commit) |
| kom_tokushu_kata 特殊算の型みわけ (k10) | v0.4.5 (Phase 6 完了) | 未着手。codex が BLOCKED (下記) | branch claude/impl-tokushu-kata-20261026 (6711cd21、計画だけ) |

設計 doc は branch claude/k5-new-cats-20261024 (1a738ea0) が正本。main にも途中までの版が入っているが、最新は作業ブランチ側にある。

## 再開の手順

### 1. 単位のまぜ練習 (残り小)

1. worktree: `/home/shota/holon_ecosystem/worktrees/quest4bugs/impl-unit-mix` (無ければ `wt new` で branch claude/impl-unit-mix-20261026 を開く)。
2. 細部レビューを 1 回だけ行う。見る点は `.claude_plan/impl_unit_mix_fix1.md` と `impl_unit_mix_fix2.md` の全項目が入っているかどうか。とくに次の 4 点。
   - 問題文が doc 4.10 と一字一句同じか
   - 分数の表示がこのカテゴリだけに限られているか
   - other_unit の一言が出るか
   - 生成時間の assert が新しい context で測られているか
3. 生成時間は、2026-10-26 の測定で、冷えた最初のセットが最大 158 ms (Lv10、別の codex が動いて負荷が高いとき)、2 回目以降が最大約 110 ms。目標は 100 ms。負荷が無い状態で測り直し、超えていれば原因を見る。
4. 配信ファイルは unit_mix_generator.js (約 70 KB) と unit_mix_data.js (約 212 KB、候補の表だけで、固定の計画は無い)。
5. 全テストが通ったら、WIP commit を正式な commit に整える。sw.js の CACHE を上げ、main へは発案者の承認を得てから入れる。

### 2. 特殊算の型みわけ (残り大)

1. codex の BLOCKED の内容: doc 7.2 章は「誤答への一言は 8 章の型ごとに固定する」と書いているが、8 章に M1 から M16 の解説の文と、差し込む値の定義が無い。
2. 先に doc を v0.4.6 にする。
   - 8 章に、誤答の型 × 形式 (F1 から F6) の解説の文の表を置く。10 歳が読める文で、1 文 30 字前後まで。
   - 差し込む値の出どころを定義する。
   - tools/komorebi/tokushu_kata_audit_sim/ に check_explanations.js を足し、生成器が作りうる全組み合わせで文がちょうど 1 つ決まることを確かめる。
   - 文の一覧は発案者に見せてから確定する。
3. そのあと `.claude_plan/impl_tokushu_kata.md` のまま codex に実装させる。計画には、単位のまぜ練習で起きた問題の禁止を最初から入れてある。大きな事前計算 file を作らない、固定の計画 pool を持たない、1 セット 100 ms 以下、の 3 つ。
4. codex を 2 本同時に走らせると 429 で止まった。1 本ずつ走らせる。

### 3. 更新 6 の点火 (4 本がそろってから)

- `docs/komorebi_release_runbook.md` 3 章の手順で行う。
- 巻 (volume) への収録と `docs/komorebi_release_linkage.md` の更新 6 の行がまだ。昆虫側の準備 (84 種の巻、材割りセットの扱い) も残っている。
- 式のかたちをかえるのカードの寸法は、点火の前に実機で試し打ちする (doc 10.1 の受け入れ条件 3)。

## 費用を抑える進め方 (2026-10-26 の反省)

このセッションでは、Opus の agent に設計、監査、突き合わせ、実装レビューを何十回も回し、週の枠の大半を使った。再開後は次のようにする。

- 設計 doc の小さな修正 (文言、表の追加、数の直し) は、統括の session が直接書く。新しい agent を立てない。
- 機械的な検査 (厳格モード、全数検査、付録の照合) は既存のスクリプトを回すだけにする。agent に測り直させない。
- 実装レビューは 1 本につき 1 回、差分が大きいときだけにする。小さな修正の確認は統括が差分を読む。
- 子ども向けの文を書くときは Sonnet で足りる。

## この作業で分かったこと (sakumon に反映する候補)

1. 設計 sim が規則を寛容に読んでいると、doc の矛盾が実装 (Phase 8) で 1 件ずつ見つかり、そのたびに止まる。Phase 7 で、規則を字句どおりに実装した厳格モードの生成器 (strict_gen.js) と、検証章の全項目を assert にした strict_check.js を作り、全項目を通してから実装に入る。
2. 付録 A の照合は、patternId だけでなく値まで行う (check_appendix.js)。
3. 子どもに見せる解説の文は、(誤答の型 × 形式 × 領域) の全組み合わせで 1 つに決まることを全数で確かめる (check_explanations.js)。固定で出る肢 (同じ、正しい) を誤答に選んだ場合も含める。
4. 実装の計画には、配信の大きさ (300 KB 以下)、冷えた最初のセットの時間 (100 ms 以下)、固定の pool を持たないことを、最初から書く。
5. `wt new` で origin/main から作った branch は、upstream が main になる。素の `git push` が main に送られる危険があるので、作ったらすぐ upstream を外すか、自分の branch に向ける。2026-10-26 に impl branch 2 本でこれを見つけて直した。
6. .git/config の古い config.lock は scratchpad の stale_config.lock に移した (消していない)。
