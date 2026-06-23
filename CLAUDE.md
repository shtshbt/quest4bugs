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
- backup branch の `git branch -D` — `main-pre-cleanup-backup`、`backup/before-image-cleanup` 等は安全網
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

## 🔵 保全されてる ref / backup (削除禁止、動作確認期間中)

### ローカル branches
- `main-pre-cleanup-backup` (旧 `aba3f09`、history rewrite 前)
- `backup/before-image-cleanup` (旧 `8bf9084`、zukan +81 + PB-2)

### stash
- 4 件保持 (旧 dirty 状態 / pb2-only state / untracked batch_c file / old WIP)

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
