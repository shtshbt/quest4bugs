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

### オーストラリア遠征 II の作業ブランチ (2026-08-18)

| ブランチ | 到達 SHA | 主な成果物 |
|---|---|---|
| `claude/au2-ready` | `1aff78c` | AU II 84 種の bugs.js 登録・図鑑カタログ収録・volume 凍結・標本の性別修正 |

git 上は「未マージ 5 commits」と出るが、**中身はすべて main にある**。2026-08-28 の
リリース枠再編 (`2c3034a`) で AU II の作業が main 側にやり直しで取り込まれ、commit だけが
取り残された形。削除前に 1 本ずつ照合した結果は以下。

| ブランチの commit | main の状態 |
|---|---|
| `ab1e505` 84 種を bugs.js へ登録 | 84 / 84 種あり |
| `6652cf8` 84 種を図鑑カタログへ収録 | 画像 410 / 410 あり |
| `6a2adf5` AU II volume を実データで凍結 | `volume_fixture_australia_2` あり (同一 84 種) |
| `1aff78c` キンモンチョウトンボの標本の性別 | `sexCovered: "f"` 適用済み |
| `3208151` 更新 5 のメダル代表種の対応表 | 無い。ただし後述のとおり陳腐化している |

**このブランチをマージしてはいけない。** main のほうが新しく、正しい。

- ブランチは AU II を `release:5` に置くが、再編後の正は `release:4`
  (`docs/komorebi_release_linkage.md` の更新カレンダー。更新 5 はマダガスカル遠征 II)
- ブランチは AU II のカテゴリを CR I から借りた 4 本 (`kom_kuku_bridge` /
  `kom_equation_select` / `kom_kuku_dan8` / `kom_kuku_dan9`) と想定していたが、再編で
  AU II は `kom_hayasa` / `kom_johou_seiri` / `kom_equation_select` / `kom_kuku_dan8` を
  自前で持つようになった (1 巻 k10 2 本 k5 2 本の不変条件)
- 木そのものを比べると `main` から `au2-ready` は 47,674 行の削除になる。マージは
  2 週間ぶんの巻き戻しを意味する

唯一 main に無かった `3208151` の trophies.js コメントブロックも、移植せずに捨ててよい。
「据え置き、有効化しない」としていた 4 種は main ですでに有効化済みで、しかも同一種:

| メモの提案 | main の実装 |
|---|---|
| `anoplognathus_viridiaeneus` (看板 SSR) | `australia2_hayasa` |
| `aleeta_curvicosta` (SSR) | `australia2_johou_seiri` |
| `dryococelus_australe` (SSR) | `australia2_equation_select` |
| `xylotrupes_australicus` (SR) | `australia2_kuku_dan8` |

メモが「入れられない」とした理由も両方すでに成立していない。AU II は借りた cat ではなく
自前の cat を持ち、1 cat に 2 トロフィーの実例も main に 4 組ある (`kom_frac_flow` /
`kom_kuku_dan6` / `kom_kuku_dan7` / `kom_kuku_inverse` の borneo と madagascar2)。
未割当 SR 予備 6 種も根拠元の `zukan_foundry/reports/au_expedition2_freeze_draft.md`
(main にあり) に全種載っている。

### 種在庫 harvest の resume 修正 (2026-07-17)

| ブランチ | 到達 SHA | 主な成果物 |
|---|---|---|
| `claude/photo-acquisition-and-fixes` | `39cf09a` | 却下済み種を sidecar に記録し、resume 時の GBIF 再問い合わせを止める修正 |

これも git 上は「未マージ 1 commit」だが、**修正は main に入っている**。
`tools/campaign3/t11_species_reserve/harvest_seeds.py` に `rejects_path` /
`load_rejects` / `known rejects` / `rejected.add` の 4 要素がすべてある。

**マージしてはいけない。** main のほうが上位互換で、木の比較では 134,716 行の削除に
なる。ブランチにあって main に無い行は 2 行だけで、どちらも main 側で発展している。

| ブランチの行 | main の状態 |
|---|---|
| `"""Serve harvested seeds to ReserveEngine offline."""` | 同じ docstring が拡張されている |
| `self.seeds, _ = load_cache(cache_path)` | `self.seeds = [self._normalize(seed) for seed in seeds]` に発展 (正規化が追加) |

main はさらに `subject_for_order()` (Lepidoptera を かんじ、Coleoptera を けいさん、
他を えいたんご へ振る `shared/reward.js` の `gameFor` と同じ規則) も持つ。

## 「未マージ」表示の読み方

このページに 2 度出てきたとおり、`git branch` の ahead / behind は **commit の到達性**
しか見ていない。同じ内容が別の commit として main に入っていると、内容が重複していても
「未マージ」と表示される。今回はどちらも、後日の作り直しで main 側に取り込まれていた。

判断は commit 数ではなく内容で行う。

```bash
# ブランチにあって main に無いものだけを見る (three-dot ではなく two-dot)
git diff --stat main <branch>
```

`main <branch>` の two-dot が大量の **削除** を示したら、そのブランチは main より古い
スナップショットで、マージは巻き戻しを意味する。three-dot (`main...<branch>`) は
分岐点からの差なので、この判断には使えない。

## 削除しないもの

保全対象は CLAUDE.md「保全されてる ref / backup」が正本。ここには理由だけ書く。

| ブランチ | 状態 | 理由 |
|---|---|---|
| `main-pre-cleanup-backup` | 履歴書き換え前の安全網 | CLAUDE.md で削除禁止 |
| `backup/before-image-cleanup` | 同上 | CLAUDE.md で削除禁止 |
| `pb2-only` / `zukan-batch-c-clean` | 2026-06-23 周辺の作業 backup | 中身未確認。判断は別途 |
| `dev` | `origin/dev` と 256 ahead / 256 behind に分岐 | 履歴書き換えの前後で SHA が変わったまま。触るときは要注意 |
