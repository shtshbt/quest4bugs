# quest4bugs

子ども向け学習ゲーム集。GitHub Pages で公開。

公開 URL: https://shtshbt.github.io/quest4bugs/

## 構成

```
index.html        ポータル（各ゲームへの入口）
games/
  math/           計算練習ゲーム（自己完結）
  kanji/          漢字学習ゲーム（自己完結）
  english/        英単語学習ゲーム（自己完結）
shared/           共通アセット（必要になったら作成）
```

## 開発ルール

- 各ゲームは `games/<name>/` 内で完結させる（HTML/CSS/JS/素材すべて）。
  他ゲームのディレクトリには触れない — 並列開発時の競合防止。
- 共有ファイルは `index.html`（ポータル）と将来の `shared/` のみ。
  これらを変更するときは統合タイミングを調整する。
- 開発は `dev` ブランチで行い、公開（main へのマージ）は手動で判断する。
- 個人データ（学習記録など）はこの public repo にコミットしない。
  当面はブラウザの localStorage を使用し、保存方式は別途検討中。

All rights reserved
