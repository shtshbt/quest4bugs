#!/usr/bin/env bash
# れんぞく ともしび の監視レポートを、同期データの最新から通しで出す。
#
#   tools/tomoshibi_report.sh            # fieldnote の最新 save.json を取ってきて集計
#   tools/tomoshibi_report.sh save.json  # 手元の save.json を集計
#
# 取得には gh (ログイン済み) が要る。取ってきた save.json は一時ファイルに置き、
# 終わったら消す。レポートは stdout、進行の知らせは stderr。
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fieldnote_repo="shtshbt/quest4bugs_fieldnote"
save_path="q4b/save.json"

if [[ $# -ge 1 ]]; then
  node "$repo_root/tools/tomoshibi_report.js" "$1"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh が見つかりません。save.json を引数で渡してください。" >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
echo "fetching $fieldnote_repo/$save_path ..." >&2
if ! gh api "repos/$fieldnote_repo/contents/$save_path" -H "Accept: application/vnd.github.raw" >"$tmp"; then
  echo "save.json を取得できませんでした。" >&2
  exit 1
fi
node "$repo_root/tools/tomoshibi_report.js" "$tmp"
