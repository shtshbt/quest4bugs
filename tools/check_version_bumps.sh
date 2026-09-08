#!/usr/bin/env bash
# 配信ファイルの中身を変えたのに ?v= を据え置いていないかを見る。
#
# sw.js の fetch handler は「?v= 込みの完全一致」をキャッシュキーにしている。
# 中身だけ変えて版を据え置くと、復帰した端末は古い実装を掴んだままになる。
# 症状が「その端末でだけ機能が出ない」なので、実機を触るまで気づけない。
#
# tests/test_script_versions.js はページ間で版が揃っているかを見るが、変えたのに
# 動かしていない版は見ない (基準になる過去の状態を知らないため)。ここは git の
# diff を基準にしてそれを埋める。
#
#   tools/check_version_bumps.sh              # origin/main と比べる
#   tools/check_version_bumps.sh HEAD~1       # 直前の commit と比べる
#
# sw.js 自身は ?v= を持たない (CACHE 名で管理する) ので対象外。

set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-origin/main}"
git rev-parse --verify --quiet "$BASE" >/dev/null || { echo "基準 '$BASE' が無い" >&2; exit 2; }

PAGES="index.html battle.html keisan/index.html kanji/index.html eitango/index.html komorebi/index.html test_zukan.html"

# ページ群から「repo root からの path -> ?v= の値」を集める。
# 引数を付けるとその ref の版を、付けないと作業ツリーの版を読む。
collect() {
  local ref="${1:-}" page dir src
  for page in $PAGES; do
    if [ -n "$ref" ]; then
      git show "$ref:$page" 2>/dev/null || continue
    else
      [ -f "$page" ] && cat "$page" || continue
    fi | grep -oE '(src|href)="[^"?]+\?v=[^"]+"' | sed -E 's/^(src|href)="//; s/"$//' |
      while IFS= read -r src; do
        dir="$(dirname "$page")"
        [ "$dir" = "." ] && dir=""
        printf '%s\t%s\n' \
          "$(realpath -m --relative-to=. "${dir:+$dir/}${src%%\?v=*}")" \
          "${src##*\?v=}"
      done
  done | sort -u
}

now_versions="$(collect)"
base_versions="$(collect "$BASE")"
changed="$(git diff --name-only "$BASE" -- . | sort -u)"

[ -n "$changed" ] || { echo "OK: $BASE との差分なし"; exit 0; }

stale=""
while IFS=$'\t' read -r path ver; do
  [ -n "$path" ] || continue
  grep -qxF "$path" <<<"$changed" || continue          # 中身が変わっていない
  base_ver="$(grep -P "^\Q$path\E\t" <<<"$base_versions" | cut -f2 | head -1)"
  [ -n "$base_ver" ] || continue                        # 基準側に無い = 新規ファイル
  [ "$ver" = "$base_ver" ] || continue                  # 版は動いている
  stale="$stale  $path (?v=$ver のまま)"$'\n'
done <<<"$now_versions"

if [ -n "$stale" ]; then
  echo "中身が変わったのに ?v= が据え置きのファイル (基準 $BASE):" >&2
  printf '%s' "$stale" >&2
  echo "版を上げ、sw.js の CACHE 名も合わせて上げること。" >&2
  exit 1
fi

echo "OK: 変わった配信ファイルの ?v= はすべて動いている (基準 $BASE)"
