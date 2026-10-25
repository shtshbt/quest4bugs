#!/usr/bin/env bash
# Measure 11 章 of docs/komorebi_tokushu_kata_curriculum.md with both generators (C8).
# usage: tools/komorebi/tokushu_kata_audit_sim/run_all.sh OUT_DIR
# Writes main_<seed>.json / .sum (gen.js + sets.js + audit.js) and indep_<seed>.json (independent/).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="${1:?usage: run_all.sh OUT_DIR}"
mkdir -p "$out"
for seed in 7 99; do
  node "$here/audit.js" "$seed" 3000 20000 > "$out/main_$seed.json" 2> "$out/main_$seed.log" &
  (cd "$here/independent" && node measure.js "$seed" > "$out/indep_$seed.json" 2> "$out/indep_$seed.log") &
done
wait
for seed in 7 99; do node "$here/summary.js" "$out/main_$seed.json" > "$out/main_$seed.sum"; done
echo "done: $out" >&2
