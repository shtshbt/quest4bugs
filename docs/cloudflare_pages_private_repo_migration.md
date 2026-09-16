# Quest4Bugs minimal Cloudflare Pages migration

Status: PLANNING
Branch: `plan/cloudflare-pages-private-repo-20260916`
Date: 2026-09-16

## 1. Goal

Move Quest4Bugs hosting from GitHub Pages to Cloudflare Pages so that `shtshbt/quest4bugs` can be made private, while preserving the current home/family product behavior and the existing private `quest4bugs_fieldnote` data flow.

This is intentionally a small hosting migration. It is **not** a restart of the older commercial Cloudflare project.

## 2. Non-goals

- Do not merge `commercial/cloudflare-v1` into `main`.
- Do not migrate Fieldnote data to Cloudflare D1/R2.
- Do not replace the current GitHub API/PAT based Fieldnote synchronization unless testing proves a hosting-origin dependency that requires a minimal compatibility fix.
- Do not introduce commercial authentication, billing, IndexedDB authority migration, or Pages Functions backend work.

## 3. Existing work that may be reused

The historical `commercial/cloudflare-v1` branch remains a reference and parts bin only.

Useful prior artifacts include:

- `cloudflare/build-static.mjs`
- Cloudflare Pages deployment assumptions documented in `docs/commercial_cloudflare_v1.md`
- migration and rollback concepts in `docs/commercial_development_migration_flow.md`

Reuse only pieces that reduce the hosting migration. Do not import the commercial storage/auth/backend architecture wholesale.

## 4. Target architecture

```text
GitHub private repository
shtshbt/quest4bugs
        |
        | Cloudflare Git integration / deploy
        v
Cloudflare Pages
        |
        | browser app
        v
Quest4Bugs
        |
        | existing GitHub API/PAT data path
        v
GitHub private repository
shtshbt/quest4bugs_fieldnote
```

The application repository and Fieldnote repository remain separate private GitHub repositories. Cloudflare replaces GitHub Pages only as the site host.

## 5. Migration sequence

### Phase A. Preflight on current `main`

1. Confirm the current GitHub Pages deployment contract and any path assumptions.
2. Identify absolute or GitHub-Pages-specific URLs, service-worker scope/cache assumptions, and repository-name base-path dependencies.
3. Identify Fieldnote code paths that could depend on the current site origin.
4. Decide whether Cloudflare can publish repository root directly or whether a minimal static build directory is preferable.

Exit condition: no unexamined origin/path dependency remains.

### Phase B. Cloudflare preview deployment

1. Create a Cloudflare Pages project connected to `shtshbt/quest4bugs`.
2. Deploy the current application to a Cloudflare preview/staging origin while the GitHub repository is still public and GitHub Pages remains live.
3. Avoid production cutover and avoid changing repository visibility at this stage.
4. If a build step is needed, prefer the smallest possible adaptation. Reuse `cloudflare/build-static.mjs` only if it remains appropriate for the current `main` tree.

Exit condition: the Cloudflare preview loads cleanly with no console/runtime errors attributable to hosting.

### Phase C. Functional parity test

Test at minimum on the Cloudflare preview origin:

- application boot and navigation
- service worker / PWA update behavior if applicable
- normal question/gameplay flow
- save/load behavior
- Fieldnote read
- Fieldnote write
- reload and persistence
- at least one real device, not browser-only testing

The critical gate is that the existing private Fieldnote repository continues to read/write correctly from the Cloudflare-hosted application.

Exit condition: parity with the current GitHub Pages site for the household workflow.

### Phase D. Cutover

Only after Phase C passes:

1. Make Cloudflare Pages the production host.
2. Verify the production origin again.
3. Disable the GitHub Pages deployment workflow.
4. Change `shtshbt/quest4bugs` visibility from public to private.
5. Trigger/verify a Cloudflare deployment from the now-private repository.
6. Re-test Fieldnote read/write and PWA behavior after the visibility change.

Exit condition: production works from Cloudflare while both Quest4Bugs repositories are private.

## 6. Acceptance criteria

- `shtshbt/quest4bugs` is private.
- `shtshbt/quest4bugs_fieldnote` remains private and unchanged in role.
- Quest4Bugs is reachable through Cloudflare Pages.
- Existing household functionality remains intact.
- Fieldnote read and write work from the Cloudflare production origin.
- No Cloudflare D1/R2 migration is required.
- No commercial branch merge is required.
- GitHub Pages is no longer required for production hosting.
- A rollback to the existing GitHub Pages deployment remains possible until final validation is complete.

## 7. Main risks and mitigations

### 7.1 Origin change affects browser-local state

Cloudflare uses a different origin from the current GitHub Pages URL. Browser `localStorage`, IndexedDB, service-worker registrations, and cookies do not automatically transfer across origins.

Mitigation: explicitly determine which state is authoritative before cutover. Do not assume browser-local state appears automatically on the new origin. Use the existing Fieldnote/QuestSave recovery path where applicable and test with the actual household profiles before decommissioning GitHub Pages.

### 7.2 Service-worker stale-cache behavior

Quest4Bugs has explicit cache/version handling. A new origin starts with a clean service-worker state, but migration or later updates could still expose path/version assumptions.

Mitigation: test install, reload, update, and cache invalidation on the Cloudflare origin before cutover.

### 7.3 Fieldnote authorization or origin assumptions

The Fieldnote data path may be logically independent of hosting, but this must be verified rather than assumed.

Mitigation: run real read/write tests against `quest4bugs_fieldnote` from Cloudflare preview before changing repository visibility.

### 7.4 Private-repository deploy permission

Cloudflare must retain GitHub App access to the repository after it becomes private.

Mitigation: prove a fresh deploy after the visibility change before considering the migration complete.

## 8. Rollback

Before repository visibility is changed, rollback is simply to continue using the existing GitHub Pages production site.

After visibility is changed, if Cloudflare production fails:

1. fix Cloudflare GitHub access or deployment configuration first;
2. if immediate restoration is required, temporarily restore the previous repository visibility / GitHub Pages path only as an explicit emergency rollback;
3. do not modify or migrate Fieldnote data as part of hosting rollback.

The migration should therefore keep GitHub Pages live until Cloudflare preview and Fieldnote parity testing are complete.

## 9. Immediate next task

Perform a read-only preflight audit of current `main` for hosting-specific assumptions and Fieldnote/origin coupling. Based on that audit, reduce this plan to the exact file/config changes required for the migration PR.
