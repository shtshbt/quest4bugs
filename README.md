# quest4bugs

子ども向け学習ゲーム集。
公開 URL: https://shtshbt.github.io/quest4bugs/

## 構成

```
index.html        ポータル（統一入口：プロフィール選択 + ゲーム選択 + 一括バックアップ/復元 + Fieldnote設定）
shared/storage.js 統一保存層（共有プロフィール + 名前空間KV + Fieldnote同期）
shared/bugs.js    昆虫図鑑データ（112種、全ゲーム共通の昆虫ソース）
keisan/           けいさん昆虫ハンター（計算練習・自己完結）
kanji/            かんじ昆虫ハンター（漢字学習・自己完結）
eitango/          えいたんご昆虫ハンター（英単語学習・自己完結）
```

## 開発ルール

- 各ゲームは `<name>/index.html` として 1 ディレクトリ内で完結させる
  （HTML/CSS/JS/素材すべて）。他ゲームのディレクトリには触れない — 並列開発時の競合防止。
- 共有ファイルは `index.html`（ポータル）と `shared/`。変更時は統合タイミングを調整する。
- 昆虫図鑑データは `docs/bug_data_design.md` の分類・スキーマ方針に従う。
- 学習記録は `shared/storage.js`（`window.QuestSave`）経由で統一保存する。
  - localStorage は単一ストア `q4b_store_v1`（`{profiles, current, kv}`）に集約する。
  - プロフィール（だれが遊ぶか）は全ゲーム共通の共有レジストリ。ポータルで作成・選択する。
  - ゲームは自分の進捗を `QuestSave.save('<game>', <profileId>, state)` / `load(...)` で名前空間保存する。
    ゲーム共通設定は `('<game>', '_settings')`、追加データは `('<game>', '_custom')` 等のキーを使う。
  - 旧 `q4b_<game>_v1` フラットキーは初回ロード時に `('<game>', '_legacy')` へ自動移行する。
- クラウド同期は private repo `quest4bugs_fieldnote` を使う（Contents API）。公開repoにはtokenや学習記録を入れない。
  - Fieldnote 保存先: `q4b/registry.json`（プロフィール一覧）＋ `q4b/data/<ns>/<key>.json`（各保存単位）。
- GitHub token は各端末の `quest4bugs_fieldnote_config_v1` に保存する。手動バックアップの対象には含めない。
- 開発は `dev` ブランチで行い、公開（main へのマージ）は手動で判断する。
- 個人データ（学習記録など）はこの public repo にコミットしない。
  記録は端末のブラウザ内に即時保存し、Fieldnote接続時はprivate repoにも同期する。

All rights reserved
