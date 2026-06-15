# Session Handoff

Date: 2026-06-15

## Current Focus

既存機能を壊さずに、計算ゲームの進度モデル、九九音声判定、バトル解禁要件を整理した。

## Completed

- `keisan/index.html` の巨大インラインJSを `keisan/app.js` に外出しした。
- `keisan/app.js` を git 追跡対象へ追加した。
- 計算進度は `p.lv[cat]` を主データとして Lv1-10 に統一。
  - `hissan` / `hikizan` / `kuku` も `p.lv` に入る。
  - 旧 `hsMax` / `hkMax` / `kukuIdx` は互換用に残し、読み込み時に `p.lv` へ安全に移行する。
  - 旧フィールドの方が進んでいる場合は進度を下げない。
- 筆算レベル選択を Lv1-10 表示に変更。
- 九九音声判定を追加。
  - `SpeechRecognition` / `webkitSpeechRecognition` が使える環境でのみ表示。
  - 「7 8 56」「しち はち ごじゅうろく」「七 八 五十六」形式を候補化し、`dan` / `b` / `ans` の3点が揃えば正解。
  - 非対応端末では従来の数字パッドを使う。
- バトル解禁は到達度ベースで統一。
  - `battle.html` の `reachCalc()` は `kp.lv[c]` を優先。
  - 旧 `kukuIdx` / `hsMax` / `hkMax` は古い保存データ用の fallback。
  - 画面文言を「ボス到達度ゲージ」に変更。
  - `docs/battle_design.md` の旧正解数ゲージ記述を到達度ベースへ修正。

## Validation

- `node --check keisan/app.js`: OK
- `node --check shared/*.js`: OK
- HTML内インラインJS構文:
  - `index.html`: OK
  - `battle.html`: OK
  - `keisan/index.html`: inline scriptなし
  - `kanji/index.html`: OK
  - `eitango/index.html`: OK
- 最小ブラウザスタブで `storage -> bugs -> render -> reward -> keisan/app.js` のロード: OK
- 九九音声テキスト候補化の単体確認:
  - `7 8 56` -> `7,8,56`
  - `しちはちごじゅうろく` -> `7,8,56` を含む
  - `七 八 五十六` -> `7,8,56` を含む

## Not Yet Verified

- 実ブラウザ操作確認。
  - この環境では `playwright` / `jsdom` が未導入。
  - 手動確認推奨: ポータル、プロフィール、計算5問、九九音声、図鑑、保存バッジ、バトル画面。
- バトル中の出題はまだ `battle.html` 内の demo `makeQ()`。
  - 既存SRS/各ゲーム出題器への接続は未実装。
  - バトル解答は各ゲームの学習記録にはまだ反映されない。

## Release Notes

This handoff was prepared for the release commit containing:

- `battle.html`
- `docs/battle_design.md`
- `docs/session_handoff.md`
- `keisan/index.html`
- `keisan/app.js`
- `keisan/style.css`
- `shared/battle.js`

`keisan/app.js` は新規追加で、公開時に必須。
