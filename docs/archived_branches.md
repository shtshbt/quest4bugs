# 削除済みブランチの対応表

作業ブランチの名札だけを外し、名前と到達点の対応をここに残す。

対象は **main に完全マージ済み** のブランチに限る。ここに載っている commit は
すべて `origin/main` の履歴から到達できるので、ブランチを消してもコードは 1 行も
失われない。失われるのは「どの作業がどの commit で終わったか」という対応情報だけで、
それを補うのがこの表である。

復元は 1 行。

```bash
git branch claude/t04-q4b-photo-audit dc17fcb
```

削除前に、対象が本当に main の履歴に含まれることを確認すること。

```bash
git merge-base --is-ancestor <branch> origin/main && echo "マージ済み"
```

## 2026-09-01 削除分

2026-07-16 の Campaign 3 タスク群 (T01 から T12) と、2026-08 のメダル経済・採集道具の
Phase ブランチ。いずれも当時 main へ取り込み済みで、名札だけが残っていた。

### Campaign 3 タスクブランチ (2026-07-16)

CLAUDE.md「Campaign 3 unattended sessions」の無人セッション群。ブランチ名の `q4b` は
quest4bugs の略。T06 から T08 は名札が残っていない。

| ブランチ | 到達 SHA | 主な成果物 |
|---|---|---|
| `claude/t01-q4b-media-contract` | `0911419` | `contracts/media_pipeline/` (validator, staging, JSON schema) と契約テスト |
| `claude/t02-q4b-foundry-foundation` | `710633d` | `zukan_foundry/` の土台 (taxonomy, ranking, provenance, negative_cache, staging_consumer) |
| `claude/t03-q4b-collection-reliability` | `f1d1524` | 色違いボーナス・レアリティ engine・卵トランザクションの統一、ポータル修正 |
| `claude/t04-q4b-photo-audit` | `dc17fcb` | `scripts/photo_audit/` (Stretch 成果物、orphan scan、evidence-weak flag) |
| `claude/t05-q4b-source-discovery` | `3dd78a1` | foundry のオフライン source discovery (queries, run_offline, validators) |
| `claude/t09-q4b-battle-feedback` | `1ca6c94` | 4-outcome フィードバックの `presentBattleOutcome` 一本化、`tests/battle_feedback/` |
| `claude/t10-q4b-chameleon` | `38495ff` | カメレオン隠しボスと殿堂 (`shared/battle.js`, `shared/storage.js`) |
| `claude/t11-q4b-species-reserve` | `e7ebf46` | foundry が T04 の records key を受ける修正と fixture テストの分離 |
| `claude/t12-q4b-species-activation` | `baee24e` | 810 種セットの fail-closed な activation 選定 (`zukan_foundry/selection.py`) |

`origin/claude/t09-q4b-battle-feedback` は remote に残してある (ローカルのみ削除)。

### メダル経済・採集道具の Phase ブランチ (2026-08)

| ブランチ | 到達 SHA | 主な成果物 |
|---|---|---|
| `claude/komorebi-medal-phase1` | `a0222c6` | どうぐばこの予備を押せないボタンにしない修正 (`komorebi/uro.js`) |
| `claude/komorebi-phase2` | `c43fb07` | 独立レビューで出た競合と移行の穴をふさぐ (`komorebi/app.js`, save merge) |
| `claude/komorebi-phase3` | `04ff7fe` | `docs/komorebi_tools_design.md` と実装計画書の追加 |
| `claude/komorebi-phase3-fx` | `acf0916` | Phase 3 (演出) の実装結果と統合時の注意を実装計画書へ追記 |

## 削除しないもの

保全対象は CLAUDE.md「保全されてる ref / backup」が正本。ここには理由だけ書く。

| ブランチ | 状態 | 理由 |
|---|---|---|
| `claude/au2-ready` | **未マージ 5 commits** | オーストラリア遠征 II の 84 種が実データで入っている (bugs.js 登録、図鑑カタログ収録、volume 凍結、更新 5 のメダル代表種)。未公開の資産そのもの |
| `claude/photo-acquisition-and-fixes` | **未マージ 1 commit** | GBIF の resume で却下済み種を再問い合わせしない修正 |
| `main-pre-cleanup-backup` | 履歴書き換え前の安全網 | CLAUDE.md で削除禁止 |
| `backup/before-image-cleanup` | 同上 | CLAUDE.md で削除禁止 |
| `pb2-only` / `zukan-batch-c-clean` | 2026-06-23 周辺の作業 backup | 中身未確認。判断は別途 |
| `dev` | `origin/dev` と 256 ahead / 256 behind に分岐 | 履歴書き換えの前後で SHA が変わったまま。触るときは要注意 |
