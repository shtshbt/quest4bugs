# quest4bugs — 運用ルール (CRITICAL)

このファイルは **絶対遵守** の運用ルール。違反すると repo が壊れる / GitHub push 拒否 / データ消失リスクあり。

## 🚨 履歴整理事故 (2026-06-22 〜 23) の教訓

bulk_migrate phase で **`zukan_cards/_inbox/` の 4.6 GB / 869 files** を誤って git add → commit → push 試行 → GitHub の **2 GB push pack 制限** で reject 連発。

最終的に `git filter-repo` で `_inbox/` + `original/*_original.*` を全履歴から除去、`origin/main` を force push で書換え (主要 commit / 作者 / 日時は保持、SHA のみ変更)。GitHub size: 1.7 GB → 206 MB。

## 🚫 絶対やらない事

### Git
- `git push --all` — 巨大な local backup branch まで送る → 2 GB 制限再 hit
- `git push --mirror` — 同上
- `git push --force --tags` — 全 tag 盲目的 force、巨大 history 復活リスク
- `git push --force` (生 force) — sandbox で blocked、必要時は `--force-with-lease=ref:旧SHA` を必ず使う
- `main-pre-cleanup-backup` の `git branch -D` — 書き換え前履歴を持つ唯一の ref (物理 backup にも無い)
- `git stash drop` / `git stash clear` — stash は保全 (誤削除リスク)
- `git filter-repo` を現作業 repo で実行 — 必ず別 mirror clone で
- `git reset --hard` を巨大 commit 上で実行する前に backup なしで進む

### ファイル
- `zukan_cards/_inbox/` を **`git add`** (ingestion 段階の元写真、配信不要)
- `zukan_cards/_archive/` を **`git add`** (provenance zip、別 storage 候補)
- `zukan_cards/_pipeline/` を `git add` (中間 stage、再生可能)
- `zukan_cards/processed/*_L1_segmented.png` を `git add` (segment 中間生成物、game 不使用)
- `_original.*` 系の原寸 jpg (bulk_migrate 後は `_resized.jpg` のみ tracked)

これらは **`.gitignore` に既に登録済**。ただし *既に tracked* な file は ignore が効かないため、新規 commit で誤 add の risk あり。

## ✅ 必須運用ルール

### commit 前 safety check (必須)
```bash
git diff --cached --name-only | grep -E '_inbox|_archive|_pipeline|_L1_segmented|_original\.'
# 1 件でも hit したら commit 中止 + git restore --staged で除外
```

### 通常 push
```bash
git push origin main
```
これだけ。tags を更新したい時のみ `git push origin <tag>` で個別指定。

### 巨大 binary を追加する場合
- single file > 10 MB は警戒 (累積で push pack 2 GB hit リスク)
- 1200 種規模の画像は **resize + WebP 化必須** (max 1000-1500px、quality 75-85)
- raw 原本が必要なら別 storage (R2 / S3 / external zip) で host、repo には URL のみ

### 大規模 batch (e.g. zukan-fetch 1200 種) の前
1. `_inbox/` `_archive/` `_pipeline/` が `.gitignore` に含まれてるか確認
2. batch 完了 → `git status` で `_inbox` 等が **Untracked** 表示 (Tracked になっていない)
3. 配信用成果物のみ stage (`zukan_cards/{original,processed,thumb,metadata}/` + `zukan_config/`)

### force push が本当に必要な時
- まず別 mirror clone で test
- `--force-with-lease=ref:旧SHA` で safety lease
- backup branch + 物理 .git backup 必須
- 必ずユーザに事前承認

## 📍 現状参照 (2026-06-23 history rewrite 後)

| 項目 | 値 |
|---|---|
| origin/main HEAD | `6cd52c8` (catalog 893 / 1213 = 73.6%) |
| origin/dev HEAD | `4400c80` |
| tags | 113 件 (v0.1.0 〜 v0.6.0、全 cleaned) |
| catalog 反映済 | 893 種 (残 320 = museum + iNat CC0 + Wikipedia 全 fail の hard-core) |
| GitHub repo size | ~206 MB (元 1.7 GB から 88% 削減) |

## ☢️ `_inbox` を git 履歴に抱えた branch (2026-09-01 に 4 本 → 1 本へ削減)

事故の当事者である `_inbox` は main からは消えたが、**backup branch の履歴には生きている**。
2026-09-01 時点で残るのは 1 本だけ。

| branch | `_inbox` in git | 扱い |
|---|---|---|
| `main-pre-cleanup-backup` | 1102 files / **5.9 GB** | **残す**。書き換え前履歴を持つ唯一の ref (物理 backup にも `aba3f09` は無い) |
| `main` / その他 | 0 files | 安全 |

**この branch で `git push` を打たない。** upstream は解除済みで、素の `git push` は
送り先不明で止まる。**upstream を再設定しないこと。** `origin/main` を upstream に持つ
local branch は `main` だけでよい。checkout する用があるときも、用が済んだら `main` か
作業 branch へ戻る。

危険だったのは upstream 設定だった。`origin/main` を指した状態でこの branch を checkout
して素の `git push` を打つと、**`origin/main` へ 5.9 GB の `_inbox` を送ろうとする**。
2 GB 制限を叩いた事故の再現経路そのもの。

### 2026-09-01 に削除した 3 本

いずれも内容が main にあり (two-dot で 15 万行前後の削除)、`_inbox` の実ファイルも
`zukan_cards/_inbox` に全数あるため、固有情報ゼロと確認して削除した。

| branch | `_inbox` | 削除の根拠 |
|---|---|---|
| `pb2-only` (`ac354e5`) | 555 files / 814 MB | `main-pre-cleanup-backup` から到達可 + 物理 backup にもある |
| `zukan-batch-c-clean` (`a6bf29a`) | 555 files / 814 MB | catalog 897 種 → main は 1256 種。worktree ごと削除 (965 MB 回収) |
| `backup/before-image-cleanup` (`8bf9084`) | 1102 files / 5.9 GB | 物理 backup (5.6 GB) に同じ commit があり冗長 |

照合の詳細は `docs/archived_branches.md`。

## 🔵 保全されてる ref / backup (削除禁止、動作確認期間中)

### ローカル branches
- `main-pre-cleanup-backup` (旧 `aba3f09`、history rewrite 前)。**物理 backup にも無い唯一の保持者**なので、`_inbox` 5.9 GB を抱えていても残す
- ~~`backup/before-image-cleanup`~~ (旧 `8bf9084`) は 2026-09-01 に削除。物理 backup と重複していた

### stash
- 6 件保持 (旧 dirty 状態 / pb2-only state / untracked batch_c file / old WIP ほか)

### 別 path
- `/home/shota/quest4bugs-history-clean.git` (cleaned mirror)
- `/home/shota/quest4bugs-history-test` (test clone)
- `/home/shota/quest4bugs-remote-verification` (新 clone verification)
- `/home/shota/quest4bugs_backup/.git_backup_20260623_121440/` (5.6 GB 物理 .git backup)
- `/home/shota/quest4bugs_backup/archive_zips/*.zip` (1.3 GB provenance zip)

### ローカル _inbox/ 物理 file
555 files / 816 MB を local working tree に保持 (.gitignore 対象、未 tracked)。raw photo は再 fetch / build に必要なら活用可。

## 📝 zukan-fetch skill (~/.claude/skills/zukan-fetch/) の運用

### バッチ起動
```bash
/home/shota/.cache/zukan_venv/bin/python3 ~/.claude/skills/zukan-fetch/bin/zukan_fetch_batch.py \
  --species-list /tmp/species.json \
  --out-root /mnt/c/Users/shota/Dropbox/Private/tools/quest4bugs/zukan_cards \
  --catalog-js /mnt/c/Users/shota/Dropbox/Private/tools/quest4bugs/zukan_config/zukan_catalog.js \
  --dedup-strategy skip --resume --no-merge --io-workers 2
```

### fetch 統合 round の launcher (tools/fetch_round/)

freeze draft 3 本の対象を 1 コマンドで撃つ入口。既定は dry-run で、対象を数えて
`zukan_foundry/rounds/<date>/species.json` と `manifest.md` を書くだけ。batch は
`--execute` を明示したときだけ起動する。

```bash
tools/fetch_round/run_fetch_round.sh                     # 対象を列挙 (既定 dry-run)
tools/fetch_round/run_fetch_round.sh --waves borneo_w1 --execute
```

対象は borneo 優先順 4 波 + 予備 96 種、mg 4.2 の追加 fetch 44 種と再取得 16 種、
au 5 章の差し替え候補 8 種。名前はレポートの表から機械的に読むので、レポートを
編集したら `zukan_foundry/tests/test_build_round_list.py` を回して整合を見る。

### Tier 順 (skill 内蔵)
1-5. Museum (GBIF: USNM / NHMUK / RMNH / MNHN / etc) — CC0 / CC-BY-4.0
6. Wikimedia Commons (WMC)
7. iNaturalist (CC0 only、taxon_id resolve で synonym 対応)
8. Wikipedia article infobox (ja → en、CC-BY-SA 系も accept)

### GBIF rate limit
- `_GBIF_MIN_INTERVAL_SEC = 2.0` (0.5 req/sec ceiling)、429 多発時は `lib/source_discovery.py` でさらに延長
- 1 batch 1 process (subagent fanout は OOM の元凶)
- streaming (`bin/zukan_fetch_batch.py` Phase 1 producer + Phase 2 consumer 並走)

### 必須 cleanup
- batch 後の `_inbox/` `_archive/` `_pipeline/` を `git add` しない
- 配信成果物 (`original/_resized.jpg` `processed/*_L2_grade.webp` `thumb/*` `metadata/*.json` `zukan_config/zukan_catalog.js`) のみ commit

## Campaign 3 unattended sessions

### 目的と構成
Quest4Bugs は、ポータルと計算・漢字・英単語などのゲームからなる子ども向け学習ゲーム集。HTML、CSS、JavaScript と静的 asset で構成され、サーバ側アプリはない。
`.github/workflows/pages.yml` が repository root をそのまま artifact にして GitHub Pages へ配信する。

### install
Fresh clone に project dependency の install は不要。`package.json` や Python dependency manifest はなく、local serve には Python 3 があればよい。
Campaign 3 session は committed file だけを前提とし、WSL 固有 path、Dropbox にだけある untracked file、user-level skill、interactive login、task 自身が起動しない service に依存しない。

### test
現在、committed test framework はない。`package.json`、pytest / Jest / Playwright の設定もない。`test_zukan.html` は browser で確認する図鑑描画 debug page であり、自動 test runner ではない。CI は `.github/workflows/pages.yml` による GitHub Pages deploy のみ。
Campaign 3 session は、自分の変更範囲に対する最小限の committed headless check を追加し、実行した正確な command を作業記録に残すこと。

### lint / build
Committed lint command と build step はない。静的 file は build せず、そのまま配信される。

### run
Repository root で次を実行し、`http://127.0.0.1:8000/` を開く。
```bash
python3 -m venv /tmp/quest4bugs_campaign3_venv && /tmp/quest4bugs_campaign3_venv/bin/python -m http.server 8000 --bind 127.0.0.1 --directory .
```

### screenshot
Committed headless browser や screenshot command はないため、手段は各 task で確認する。Deterministic screenshot を追加する場合は、固定 viewport、固定 URL、page ready の待機条件を指定し、使用した正確な command を作業記録に残すこと。

### forbidden operations
- `zukan_cards/_inbox/`、`zukan_cards/_archive/`、`zukan_cards/_pipeline/` を追加しない。
- `zukan_cards/processed/*_L1_segmented.png` と `_original.*` 系の原寸 asset を追加しない。
- Production image を bulk-download しない。

### branch policy
Campaign 3 session が push できるのは `claude/` prefix の branch のみ。`main` へは絶対に push しない。この規則は Campaign 3 session に限り、この file の通常 push 指示より優先する。

### Python
Python tooling は task ごとに `/tmp` 配下へ作る virtual environment を使用し、system interpreter で直接実行しない。
