#!/usr/bin/env bash
# Usage: bash tests/test_cloudflare_artifact.sh
# Verify clean, deterministic runtime packaging without changing application files.
set -euo pipefail

ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
OUT="$ROOT/dist-pages"
EVIDENCE="$(mktemp -d)"
trap 'rm -rf "$EVIDENCE"' EXIT

snapshot() {
  find "$OUT" -type f -print0 | sort -z | xargs -0 sha256sum
}

node "$ROOT/cloudflare/build-static.mjs"
snapshot | tee "$EVIDENCE/first" >/dev/null
# A stale internal directory must disappear on the next build.
mkdir -p "$OUT/.gate_a_stale"
node "$ROOT/cloudflare/build-static.mjs"
test ! -e "$OUT/.gate_a_stale"
snapshot | tee "$EVIDENCE/second" >/dev/null
cmp "$EVIDENCE/first" "$EVIDENCE/second"

for entry in index.html battle.html manifest.webmanifest sw.js shared/storage.js zukan_config/zukan_catalog.js; do
  test -f "$OUT/$entry" || { echo "Missing runtime file: $entry" >&2; exit 1; }
done
for entry in assets shared kanji keisan eitango komorebi zukan_cards; do
  test -d "$OUT/$entry" || { echo "Missing runtime directory: $entry" >&2; exit 1; }
done
for entry in .git .github .claude .claude_plan docs contracts tests tools scripts cloudflare zukan_foundry photo_audit CLAUDE.md BLOCKED_DECISIONS.md README.md; do
  test ! -e "$OUT/$entry" || { echo "Internal path leaked: $entry" >&2; exit 1; }
done
# Match nested documentation and temporary residue, not just root exclusions.
leaks="$(find "$OUT" \( -name 'README.md' -o -name '*.tmp.*' -o -name '_inbox' -o -name '_archive' -o -name '_pipeline' -o -name '*_L1_segmented.png' -o -name '*_original.*' \) -print)"
if [[ -n "$leaks" ]]; then
  printf 'Internal material leaked:\n%s\n' "$leaks" >&2
  exit 1
fi
printf 'PASS: clean deterministic artifact; %s files; required paths present; internal material absent\n' "$(wc -l < "$EVIDENCE/second")" >&2
