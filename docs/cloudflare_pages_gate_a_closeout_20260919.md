# Cloudflare Pages Gate A closeout — 2026-09-19

## Result

**Gate A: PASS.** The seven requested commits integrated without conflicts. The
authorized recursive filter closes the two observed artifact hygiene defects;
clean deterministic packaging and all existing JavaScript regressions pass.
Proceed with the PR against `main`, without merging. Stop before Gate B:
Cloudflare Pages project creation / Git integration / preview configuration.

## Ownership and preflight

- Session: `20260919-cloudflare-gate-a-integration` (single writer).
- Repository: `shtshbt/quest4bugs`.
- Worktree: `/tmp/quest4bugs_cloudflare_gate_a_20260919`.
- Branch: `claude/cloudflare_gate_a_20260919`.
- Base: `19af513cc61232ee0f019573a1f675f5f24b4657`.
- Integrated implementation HEAD: `f8a8d9c50aeb258a89d1d9e5cf15adc7c7b25986`.
- Pre-repair checkpoint: `2d6a6ded712706b9a89a556723901e3095cc2cfb`.
- The user subsequently authorized a bounded recursive copy filter for nested
  `README.md` and `*.tmp.*`, with matching checks/CI and closeout metadata only.
  The final commit is discoverable from this branch/PR HEAD (`git rev-parse HEAD`).
- Fresh `git ls-remote origin refs/heads/main` matched the required base.
- Fresh `gh pr list --state open --json number,headRefName,baseRefName,url`
  returned `[]` before integration.
- `gh repo view --json nameWithOwner,visibility` reported `PUBLIC`.
- `gh api repos/shtshbt/quest4bugs/pages` reported `built`, workflow deployment,
  source `main` at `/`, URL `https://shtshbt.github.io/quest4bugs/`.
- Original checkout was clean on `claude/komorebi-tools` at the same base;
  its branch and files were left untouched. The new branch/worktree had no
  existing competing owner. No commercial branch was merged or cherry-picked.

## Source preservation

All seven commits were cherry-picked in the requested order with `-x` provenance.
No conflict resolution was needed.

| Source | Integrated commit |
| --- | --- |
| `30f503b9619063bcc0a1a4452538f47ba01e90c1` | `7820d71` |
| `3cd5dca7d976902e8793f20e73a06a84eff6964a` | `8f73667` |
| `4596037ff607f1f3a3e144b26dc0159c16778b80` | `d7c5f76` |
| `5abb7f74780de4a65c73b02c47ad92adceff0b37` | `295ad18` |
| `d4ec73d2e9480c89349a87108b06c8dcb1904868` | `c6b9778` |
| `569223fb24a550002fdb962d073e2ef967f66809` | `50f4efc` |
| `775a68b6cddaa81f64bc2345c9c3c4594b8055ff` | `f8a8d9c` |

Before the metadata correction and authorized hygiene repair, `git diff --exit-code 3cd5dca --
docs/cloudflare_pages_private_repo_migration.md` passed. `git diff --exit-code
775a68b -- cloudflare .github/workflows/cloudflare-artifact-check.yml` passed.

## Artifact evidence

`node cloudflare/build-static.mjs` creates `dist-pages` using 12 explicit entries:
`index.html`, `battle.html`, `manifest.webmanifest`, `sw.js`, `assets`, `shared`,
`kanji`, `keisan`, `eitango`, `komorebi`, `zukan_cards`, and
`zukan_config/zukan_catalog.js`. Repository root is not copied.

Final artifact: 9,479 files, 253,190,070 bytes (exactly two files removed from the
pre-repair 9,481-file artifact). Every included file is byte-identical to its
runtime source. A sorted manifest of relative
paths and SHA256 file hashes has SHA256
`74b098ad24aa0179baaf66f54ee6d314a5c53d4e35362f5075f0abfc3f80ff93`
(each record is `path + NUL + hex_hash + newline`).

`bash tests/test_cloudflare_artifact.sh` builds twice, plants a stale directory
between builds, compares all file hashes, and verifies required/excluded paths.
Clean regeneration and deterministic file composition passed. All required
runtime files/directories and all top-level exclusions passed, including `.git`,
`.github`, `.claude`, `.claude_plan`, `docs`, `contracts`, `tests`, `tools`,
`scripts`, `CLAUDE.md`, and `BLOCKED_DECISIONS.md`.

The pre-repair recursive internal-material check failed on exactly:

- `assets/larva_svg/README.md`: asset development plan/documentation.
- `keisan/index.html.tmp.896106.3637fc469744`: tracked temporary HTML.

Both files already exist on the required main base. The authorized repair adds
one recursive `cp` filter: reject basenames equal to `README.md` or containing
`.tmp.` (the `*.tmp.*` class). It does not hard-code these two paths, change the
allowlist, reorganize sources, or alter application bytes. The artifact test
checks both classes recursively, and artifact CI now runs that deterministic
build/check script. Its PR path triggers also cover the check and workflow.

## Regression evidence

Node: `v24.14.0`. From both the original clean base checkout and the integration
worktree, the release-runbook command with fail-fast handling was run, then
rerun in full after the authorized hygiene repair:

```bash
set -o pipefail
for f in tests/test_*.js; do node "$f" || exit; done
```

All three runs passed: **87 files, 875 PASS assertions, zero failures** per run. This includes
existing storage tests (`test_breeding_storage_komorebi.js`,
`test_tool_gear_store.js`, migration/save tests), service-worker precache/version
checks (`test_script_versions.js`, `test_komorebi_boot.js`, tool icon/scene tests),
release gates, gameplay regressions, and catalog asset-presence checks.
Local stdout logs are `/tmp/quest4bugs_gate_a_base_tests.log` and
`/tmp/quest4bugs_gate_a_integration_tests.log`; the post-repair run is
`/tmp/quest4bugs_gate_a_fixed_tests.log`.

Additional checks:

| Check | Result |
| --- | --- |
| `node cloudflare/build-static.mjs` (post-repair) | PASS |
| `bash tests/test_cloudflare_artifact.sh` (post-repair: two builds, stale-output removal, hash comparison, required paths, recursive exclusions) | PASS |
| `node --check cloudflare/build-static.mjs` | PASS |
| `bash -n tests/test_cloudflare_artifact.sh` | PASS |
| `bash tools/check_version_bumps.sh 19af513cc61232ee0f019573a1f675f5f24b4657` | PASS |
| `git diff --check` | PASS |
| All 93 `sw.js` CORE paths present in completed artifact | PASS |
| All 197 local src/href references in six runtime HTML entry points | PASS |
| Manifest `start_url` and `scope` both `./` | PASS |
| Runtime directories, root HTML/PWA files, `contracts`, and `.github/workflows/pages.yml` vs base | Byte-identical |
| All 9,479 artifact files vs corresponding source files | Byte-identical |

The 93 CORE paths, 197 HTML references, and manifest checks were also rerun
after the final artifact build completed. No artifact readers ran concurrently
with the final build.

One ad hoc path probe was accidentally started while the deterministic build
was still regenerating its output and observed the not-yet-copied catalog.
It was rerun after build completion; all 93 CORE paths and 197 references passed.
This was a check-ordering issue, not a stable artifact failure.

`shared/storage.js` is unchanged. The Fieldnote repository was neither accessed
nor mutated; no live synchronization, PAT changes, or household writes occurred.
No baseline test failure was found. The checkpoint push hook reported
`trajectory: registry_missing` in observe mode and allowed the push. A
`git ls-tree` comparison confirmed `.trajectory/registry.json` is absent in both
the required base and integration HEAD. This is pre-existing local guard
configuration debt; no Trajectory initialization or scope-out repair was made.
No gameplay or storage fix was made.
Cloudflare-origin browser/service-worker and Fieldnote round trips remain Gate B
work; local checks do not establish those results.

## Plan consistency and remaining steps

The plan retains Cloudflare Pages, runtime-only output, separate/private
Fieldnote, origin change as a data-migration event, live GitHub Pages through
production validation, privacy only after production-origin round trip, a fresh
deploy after privacy change, and GitHub Pages retirement last. Only branch,
status, date, and the evidence link were updated.

Gate A is green; create a PR against `main`. Do not merge in this task.
Following human review/merge, the next Gate B
human action is to create/connect a Cloudflare Pages project and deploy a preview
of the integration code with:

| Setting | Exact value |
| --- | --- |
| Build command | `node cloudflare/build-static.mjs` |
| Output directory | `dist-pages` |
| Root directory | repository root |
| Pages Functions | none |

Then test portal/game navigation, normal play, service-worker registration and
reload/update, manifest/PWA, local save/load, and controlled Fieldnote
authentication/read/write/reload. Preview is not production data migration.

No Cloudflare project was created and no Git integration was configured.
Repository visibility remains public; GitHub Pages remains unchanged; Fieldnote
remains unchanged. Gate A does not authorize execution of Gate B in this session.

## Rollback

Abandon the integration branch (and close its PR if one is later created).
Current main and production hosting/data have no changes to undo. Continue using
the existing GitHub Pages origin. Preserve unrelated branches, worktrees,
stashes, and backups.
