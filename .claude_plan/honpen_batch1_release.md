# 本編図鑑拡張 第 1 弾 (150 種) 組込リリース

## Goal

quest4bugs 本編に新規昆虫 149 種 (batch 1。選抜時 150 から、性語尾違いの同一種重複 1 件 = ウラミスシジミ Wagimo signata/signatus を除外済み) を追加し、全自動テスト green の状態でリリース可能な commit を作る。学習コンテンツの変更はなし (species-only 拡充)。写真は後追いのため zukan_catalog.js は変更しない (全 150 種が parametric SVG fallback で描画される)。

## 入力 (すべて存在済みが前提)

- entry データ: `zukan_foundry/data/species_reserve/honpen_batch1_entries_{keisan,kanji,eitango}.jsonl` (keisan 50 / kanji 49 / eitango 50 = 計 149 行、1 行 1 JSON、全キー引用符付き)
- スキーマ正典: `zukan_foundry/reports/bugs_js_species_schema.md` (フィールド仕様・挿入位置・引用符規約)
- 選抜リスト (照合用): `zukan_foundry/data/species_reserve/honpen_selection_v1.json` (batch==1 の 150 件)
- 運用規則: repo CLAUDE.md (commit 前 safety check 必須、push は `git push origin main` のみ)

## 手順

### 1. validator の新設: `tools/honpen_release/validate_batch_entries.py`

再利用可能な検証スクリプト (Python 3、stdlib のみ、system python 直接実行不可の環境規則があるため shebang なしのモジュールとして書き、実行方法を docstring に記す)。検証項目:

1. JSONL 3 ファイル計 149 行、パース可能、必須フィールド完全 (スキーマ正典の必須列)
2. id: ヘボン式 snake_case 形式、既存 bugs.js の全 id (`"id":` と `id:` の両引用スタイルを正規表現で抽出) および batch 内で一意
3. jaName: 既存 + batch 内で一意 (括弧注記は除去して比較)
4. scientificName: 選抜リストの batch==1 と 1 対 1 対応 (ただし uramisu_shijimi / Wagimo signata は既存種の性語尾違い重複として除外済み。これ 1 件の欠落のみ許容)
5. rarity: 選抜値と一致、語彙は N/R/SR/SSR のみ (SS は即 fail)
6. sizeMm: [min, max] で 0 < min < max <= 300
7. colors: hex 2 色
8. sexRatio: 合計 1.0
9. 「夜」文字を note に含む種の一覧を警告出力 (fail ではなくレビューリスト。夜行性種の意図的使用は許容)
10. needsTaxonReview=true の種の一覧をレビューリストに出力

exit code: fail 項目があれば非 0。レビューリストは `zukan_foundry/reports/honpen_batch1_review_flags.md` に書き出す。

### 2. bugs.js への組込: `tools/honpen_release/merge_batch_entries.py`

- JSONL の各 entry を `bug({...})` 1 行 (全キー引用符付き、スキーマ正典の列順) に変換し、`shared/bugs.js` の種配列末尾 (スキーマ正典 §挿入位置の指定に従う。セクションコメント `/* 本編拡張 第1弾 (2026-08) */` を先頭に付ける) へ挿入する
- SIZE_MM の 1 行マップと Q4B_SPECIES_MIGRATIONS には一切触れない (sizeMm は inline)
- 変換は決定的 (再実行しても同一出力)。挿入済みかどうかをセクションコメントで検知し、二重挿入を防ぐ

### 3. テスト期待値の更新

新種 149 (keisan 50 / kanji 49 / eitango 50、order 由来で自動割当) により:

- `tests/test_zukan_progress_count.js`: 総種数 1213 → 1362、分母 427/353/423 → 477/402/473、「分母合計 + 天敵 10 = 総種数」の検証は 1362 に
- `tests/test_species_migration.js` ほか、1213 やプール数 (380/333/408 → 430/382/458) を固定している assertion を全 grep して更新
- `zukan_foundry/tests/test_foundry.py`: `len(parsed) == 1213` → 1362。media 数 892 は不変
- 期待値の変更は「なぜその数になるか」をコメント 1 行で残す

### 4. cache bump

- bugs.js を参照する全ページ (index.html / battle.html / keisan/index.html / kanji/index.html / eitango/index.html / test_zukan.html) の `bugs.js?v=` を 1 つ上げる
- `sw.js` の CACHE 名を v127 から v128 へ

### 5. 検証実行

- validator 全 pass
- node tests 全実行 (`for f in tests/test_*.js; do node $f; done`) 全 green
- foundry: `python -m unittest discover -s zukan_foundry/tests` 全 green (zukan venv: `/home/shota/.cache/zukan_venv/bin/python3`、PYTHONPATH に repo root と repo/zukan_foundry)
- `node --check shared/bugs.js`

### 6. commit (リリース)

- commit 前に必ず: `git diff --cached --name-only | grep -E '_inbox|_archive|_pipeline|_L1_segmented|_original\.'` → hit したら中止
- Conventional Commits で 1 commit (例: `feat(zukan): add 149 species (expansion batch 1)`)。push は行わず、commit 作成まで (push は人間が確認後)

## 受け入れ基準

1. validator exit 0、レビューリスト生成済み
2. 全 node テスト + foundry テスト green
3. bugs.js の種数が正確に 1362、新 id 重複ゼロ
4. zukan_catalog.js / SIZE_MM / migrations / 学習コンテンツに変更なし
5. 差分が上記ファイル群のみ (`git status` で意図外の変更なし)

## Out of scope

- 説明文 (note) の日本語品質レビュー — レビューリストを人間が確認する
- 写真取得 (zukan-fetch) と zukan_catalog.js への反映 — 後続の別リリース
- push — 人間の確認後に手動
