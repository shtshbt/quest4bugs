#!/usr/bin/env bash
# run_fetch_round.sh — fetch 統合 round をワンコマンドで撃つ launcher。
#
# 対象は 3 本の freeze draft から build_round_list.py が組む
# (borneo 優先順 4 波 + 予備、mg 4.2 の追加 fetch と再取得、au 5 章の差し替え候補)。
#
# 既定は dry-run。対象を列挙して species list と manifest を書くだけで、
# zukan-fetch batch は起動しない。実行は --execute を明示したときだけ。
#
# Usage:
#   tools/fetch_round/run_fetch_round.sh                       # 対象を列挙 (既定)
#   tools/fetch_round/run_fetch_round.sh --waves borneo_w1     # 第 1 波だけ列挙
#   tools/fetch_round/run_fetch_round.sh --waves borneo_w1 --execute
#
# Options:
#   --execute                 実際に zukan_fetch_batch.py を起動する
#   --waves <a,b>             wave を前方一致で絞る (borneo / borneo_w1 / mg_refetch ...)
#   --regions <a,b>           borneo,madagascar,australia から絞る
#   --limit <n>               wave 順に先頭 n 種だけ
#   --spares <n>              borneo 5 章の予備を何件足すか (既定 14)
#   --include-carded          既にカードを持つ種も落とさない
#   --io-workers <n>          batch の I/O 並列度 (既定 2、GBIF rate limit 準拠)
#   --quality-max-sources <n> 品質ゲート reject 時に試す source の上限 (既定 4)
#   --no-quality-gate         品質ゲートを無効化する
#   --merge                   catalog.js への append を batch 内で行う (既定は --no-merge)
#   --out-dir <path>          round 成果物の置き場 (既定 zukan_foundry/rounds/<date>)

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_PY="${VENV_PY:-/home/shota/.cache/zukan_venv/bin/python3}"
BATCH="${ZUKAN_FETCH_BATCH:-$HOME/.claude/skills/zukan-fetch/bin/zukan_fetch_batch.py}"
BUILDER="$REPO/tools/fetch_round/build_round_list.py"

EXECUTE=0
WAVES=""
REGIONS="borneo,madagascar,australia"
LIMIT=0
SPARES=14
INCLUDE_CARDED=0
IO_WORKERS=2
QUALITY_MAX_SOURCES=4
QUALITY_GATE=1
MERGE=0
OUT_DIR=""

die() { echo "error: $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)              EXECUTE=1; shift ;;
    --waves)                WAVES="${2:?--waves needs a value}"; shift 2 ;;
    --regions)              REGIONS="${2:?--regions needs a value}"; shift 2 ;;
    --limit)                LIMIT="${2:?--limit needs a value}"; shift 2 ;;
    --spares)               SPARES="${2:?--spares needs a value}"; shift 2 ;;
    --include-carded)       INCLUDE_CARDED=1; shift ;;
    --io-workers)           IO_WORKERS="${2:?--io-workers needs a value}"; shift 2 ;;
    --quality-max-sources)  QUALITY_MAX_SOURCES="${2:?needs a value}"; shift 2 ;;
    --no-quality-gate)      QUALITY_GATE=0; shift ;;
    --merge)                MERGE=1; shift ;;
    --out-dir)              OUT_DIR="${2:?--out-dir needs a value}"; shift 2 ;;
    -h|--help)              sed -n '2,30p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *)                      die "unknown option: $1" ;;
  esac
done

[[ -f "$BUILDER" ]] || die "builder が無い: $BUILDER"
[[ -x "$VENV_PY" ]] || die "venv python が無い: $VENV_PY (VENV_PY= で上書き可)"

if [[ -z "$OUT_DIR" ]]; then
  OUT_DIR="$REPO/zukan_foundry/rounds/$(date +%Y-%m-%d)"
fi
mkdir -p "$OUT_DIR"

SPECIES_JSON="$OUT_DIR/species.json"
MANIFEST="$OUT_DIR/manifest.md"

builder_args=(
  --json "$SPECIES_JSON"
  --manifest "$MANIFEST"
  --regions "$REGIONS"
  --spares "$SPARES"
)
[[ -n "$WAVES" ]] && builder_args+=(--waves "$WAVES")
[[ "$LIMIT" -gt 0 ]] && builder_args+=(--limit "$LIMIT")
[[ "$INCLUDE_CARDED" -eq 1 ]] && builder_args+=(--include-carded)

echo "=== 対象の組み立て ===" >&2
"$VENV_PY" "$BUILDER" "${builder_args[@]}"
COUNT=$("$VENV_PY" -c "import json,sys; print(len(json.load(open(sys.argv[1], encoding='utf-8'))))" "$SPECIES_JSON")
echo "species list : $SPECIES_JSON" >&2
echo "manifest     : $MANIFEST" >&2

batch_args=(
  "$VENV_PY" "$BATCH"
  --species-list "$SPECIES_JSON"
  --out-root "$REPO/zukan_cards"
  --catalog-js "$REPO/zukan_config/zukan_catalog.js"
  --io-workers "$IO_WORKERS"
  --dedup-strategy skip
  --resume
  --quality-max-sources "$QUALITY_MAX_SOURCES"
)
[[ "$MERGE" -eq 0 ]] && batch_args+=(--no-merge)
[[ "$QUALITY_GATE" -eq 0 ]] && batch_args+=(--no-quality-gate)

if [[ "$EXECUTE" -ne 1 ]]; then
  echo >&2
  echo "=== dry-run。撃つときは同じ引数に --execute を足す ===" >&2
  echo "実行される command:" >&2
  printf '  %q' "${batch_args[@]}" >&2
  echo >&2
  exit 0
fi

[[ -f "$BATCH" ]] || die "zukan-fetch batch が無い: $BATCH"

LOG="$OUT_DIR/batch_$(date +%H%M%S).log"
echo >&2
echo "=== 実行 ($COUNT 種、log: $LOG) ===" >&2
"${batch_args[@]}" 2>&1 | tee "$LOG"

echo >&2
echo "=== commit 前 safety check (CLAUDE.md 準拠) ===" >&2
echo "  git -C $REPO status --short | grep -E '_inbox|_archive|_pipeline|_L1_segmented|_original\\.'" >&2
echo "  hit したものは stage しないこと" >&2
