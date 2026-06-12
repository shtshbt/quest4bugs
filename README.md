# quest4bugs

子ども向け学習ゲーム集。GitHub Pages で公開。

公開 URL: https://shtshbt.github.io/quest4bugs/

## 構成

```
index.html        ポータル（ゲーム選択 + 全ゲーム一括バックアップ/復元）
keisan/           けいさん昆虫ハンター（計算練習・自己完結）
kanji/            漢字学習ゲーム（準備中）
eitango/          英単語学習ゲーム（準備中）
```

## 開発ルール

- 各ゲームは `<name>/index.html` として 1 ディレクトリ内で完結させる
  （HTML/CSS/JS/素材すべて）。他ゲームのディレクトリには触れない — 並列開発時の競合防止。
- 共有ファイルは `index.html`（ポータル）のみ。変更時は統合タイミングを調整する。
- 学習記録は localStorage に `q4b_<game>_v<n>` 形式のキーで保存する
  （例: `q4b_keisan_v1`）。ポータルの一括バックアップは `q4b_` プレフィックスを走査する。
- 開発は `dev` ブランチで行い、公開（main へのマージ）は手動で判断する。
- 個人データ（学習記録など）はこの public repo にコミットしない。
  記録は端末のブラウザ内のみ。バックアップはポータルの書き出し機能で行う。

All rights reserved
