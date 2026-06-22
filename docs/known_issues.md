---
author: Shota Shibata
title: Quest4Bugs Known Issues / 未着手バグ・改善
updated: 2026-06-22
---

# Quest4Bugs Known Issues

最近の集中監査 (kanji 60+ 件・eitango/keisan 各種) のうち、 まだ着手していない
or 着手中の項目を整理する。 commit ごとに「済」へ移し、 残ったものが本ドキュメント。

優先度 = High / Medium / Low。
分類 = `教科` (kanji / eitango / keisan / battle / 全体) + 系統。

---

## High — 次セッションで対応

### keisan の学習尺度

- **K9. 時刻逆算 Lv5/6 が「何時何分」を聞いて 分の数字しか採点しない**。 時を
  またいだ理解を問わないと、 出題趣旨と乖離。 時・分を別入力 / `2:45` を `245`
  で入力 / 完全な時刻を 4 択、 のいずれか。
- **K10. 筆算の不要なメモも正解扱い** — 全桁に「1」と書いても答えが合えば正解。
  筆算手順を習得尺度に含めるなら、 不要メモも誤答 or 「SRS / Lv 進行なし」 とする。

### kanji / 全体 (前回 session の積み残し)

- **K11. インポート (バックアップ復元) が LWW マージで古いバックアップから戻せない**。
  親画面の「インポート」 ボタンを 「安全マージ」 と 「強制復元」 に分離し、 強制復元
  では入力 KV の `updated` を現在時刻で打ち直し。 取り込み後に PROFILES を再取得
  して selectProfile(CUR) する流れも要修正。
- **K12. 複数端末同時使用での LWW 消失**。 同じプロフィールを 2 端末で並行使用
  すると、 片方の進捗が丸ごと消える。 当面は「親画面に注意書きと warning banner」
  を出す。 根本対応は SRS / 採集 / ログ単位のフィールドマージ。
- **K13. `kanji_data.js` の自動検査がない** — 漢字キー重複・用例語/例文内の対象
  漢字不在・空の用例・送り仮名 ok==ng・学年外・選択肢重複 を起動時 or CI で
  検査する。 旧形式 oku のような潜伏を未然に検出。

---

## Medium — 設計確認後

- **K14. お手本 hint guard を eitango spell モードへ展開**。 「答えを覗いた直後の
  正解」をどう扱うか eitango 側で別途設計。 keisan は手書きが無いため対象外。
- **K15. eitango: 復習モード以外の `Reward.onAnswer` パス内の freshness**。 kanji と
  同じ二重消費パターンが残る可能性。 caller で 1 回計算 → 共通に渡す再点検。
- **K16. mergeStore のフィールドマージ**。 現状の per-KV LWW では「相手側の最近の
  1 問が来ると こちらの 10 問が消える」 ケースが残る。 将来的に SRS 単位の field-
  level マージを導入。

---

## Low / 設計余地

- **K17. audit `lower` 群** (ansSRS の defense-in-depth 等) — 主要修正で実害は
  封じている。 追加の堅牢化は急がず。
- **K18. 親画面の名前変更が p1/p2 固定** (旧指摘の low) — renameProf を id 引数化
  しているのを確認済み。 動的 ID 追加時の挙動は未テスト。

---

## 完了状況

### v107 (commit 系列 c032984..今回)
- kanji 系: SRS 抜け道 / タイマー競合 / 連打ロック / freshness 二重 / 報酬価値固定 /
  復習 due/wasDue / ST.retests 辞書化 / プロフィール非同期競合 / セッション SEQ /
  送り仮名旧形式 / t_exam scope / CFG.all デバッグ汚染 / 名前 updated / 0 点記録 /
  wasGold / 出題空欄位置 / 音声と表示一致 / hinted SRS skip / 用例 seen Gate /
  stage 統合 / マスター演出キュー / 図鑑タブ維持 / リセット文言 / rq 二重報酬 /
  新出 cap 全入口 / スキルゲート維持
- eitango: ansSRS / ansKids / closeFB 連打ロック / ヌシ戦 feedEgg gate
- keisan: fbNext / keiCatchDone 連打ロック / timed mode の recordStat & save 復活
  / freshness 二重消費 / 引き算 Lv5 再定義 / 復習ブロック+_mid 限定 BOOST /
  適応 Lv 進行除外 / 九九 kukuHits リセット / 音声認識古コールバックガード /
  resetAll 実体化 / ひき算筆算の先頭 0 許可
- storage: persist 失敗検知 + isDegraded() + 赤バナー / mergeStore タイブレーク (ローカル優先)

---

## 着手ポリシー

- High = 次 commit で対応
- Medium = 別 PR / 設計確認後
- Low = ロードマップへ統合 (`roadmap.md` 参照)
