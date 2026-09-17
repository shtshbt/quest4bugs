# Quest4Bugs minimal Cloudflare Pages migration

Status: READY_FOR_IMPLEMENTATION
Branch: `plan/cloudflare-pages-private-repo-20260916`
Date: 2026-09-17

## 1. Goal

Move Quest4Bugs hosting from GitHub Pages to Cloudflare Pages so that `shtshbt/quest4bugs` can be made private, while preserving the current household workflow and the existing private `quest4bugs_fieldnote` data path.

This is a hosting migration only. It is not a restart of the historical commercial Cloudflare work.

## 2. Non-goals

- Do not merge `commercial/cloudflare-v1` into `main`.
- Do not migrate Fieldnote data to Cloudflare D1/R2.
- Do not replace GitHub API/PAT based Fieldnote synchronization unless an actual Cloudflare-origin incompatibility is demonstrated.
- Do not introduce commercial authentication, billing, IndexedDB authority migration, Pages Functions, or a new backend.
- Do not redesign Quest4Bugs storage or gameplay code as part of this migration.

## 3. Preflight findings on current `main`

The read-only audit found no major hosting-origin coupling that requires an application redesign.

### 3.1 Current GitHub Pages contract

`.github/workflows/pages.yml` uploads repository root (`path: .`) directly to GitHub Pages.

This means the present deployment artifact includes development/internal material that is not required at runtime. The Cloudflare migration must not reproduce that behavior.

### 3.2 PWA and path behavior

`manifest.webmanifest` uses relative `start_url` and `scope` (`./`).

`sw.js` also uses relative application paths and explicitly ignores cross-origin requests such as `api.github.com`.

No GitHub-Pages-specific base path requirement was identified in these files.

### 3.3 Fieldnote path

`shared/storage.js` talks directly to the GitHub Contents/Blob APIs for `quest4bugs_fieldnote` using the browser-held PAT. The Fieldnote data path is logically separate from the site host.

No dependency on the current GitHub Pages hostname was identified.

### 3.4 Browser-local state

The storage model is intentionally hybrid:

1. browser `localStorage` for immediate per-origin state
2. private `quest4bugs_fieldnote` repository for cloud synchronization
3. JSON export/import as manual recovery

The PAT/configuration is browser-local and is not transported automatically to a new origin.

Therefore the origin cutover is a data-migration event even though the Fieldnote backend itself is unchanged.

## 4. Implementation decisions

### 4.1 Publish a runtime-only artifact

Cloudflare Pages must publish a generated runtime directory rather than repository root.

The artifact should contain only files needed by the browser application, including the root HTML/PWA files and runtime directories such as `assets`, `shared`, `kanji`, `keisan`, `eitango`, `komorebi`, and other explicitly required browser assets.

It must exclude development/internal content such as:

- `.git`, `.github`, `.claude`, `.claude_plan`
- `docs`, `contracts`, `tests`, `tools`, `scripts`
- `CLAUDE.md`, `BLOCKED_DECISIONS.md`, repository documentation
- Cloudflare implementation files themselves

The historical `commercial/cloudflare-v1/cloudflare/build-static.mjs` may be used as a parts reference, but the implementation must be based on current `main` and must not copy the commercial backend architecture.

### 4.2 Keep the application storage contract unchanged

Do not modify `shared/storage.js` merely because the hosting origin changes.

Only introduce a compatibility fix if preview testing demonstrates a concrete failure attributable to Cloudflare hosting.

### 4.3 Treat preview and production as distinct origins

A successful Cloudflare preview does not migrate or validate production-origin `localStorage`, PAT configuration, service-worker state, or installed PWA state.

Preview testing proves code/hosting compatibility only. The real household-data migration must be repeated on the final production origin.

### 4.4 Keep GitHub Pages live until production validation is complete

Do not disable GitHub Pages and do not make `shtshbt/quest4bugs` private before the Cloudflare production origin has passed the data migration and parity gates below.

## 5. Target architecture

```text
GitHub private repository
shtshbt/quest4bugs
        |
        | Cloudflare Git integration / build
        v
runtime-only static artifact
        |
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

## 6. Migration sequence and hard gates

### Phase A. Repository-side implementation

1. Add the minimal runtime-only static build script on an implementation branch created from current `main`.
2. The script must create a clean output directory deterministically.
3. Verify that required runtime files are present in the artifact.
4. Verify that internal/development paths are absent.
5. Do not alter the current GitHub Pages workflow yet.

Gate A passes only if the generated artifact is sufficient to serve Quest4Bugs and does not expose repository-internal material.

### Phase B. Cloudflare preview

1. Create a Cloudflare Pages project connected to `shtshbt/quest4bugs`.
2. Configure the build command to generate the runtime-only artifact and set that artifact as the Pages output directory.
3. Deploy the implementation branch to a preview origin while the repository remains public and GitHub Pages remains live.
4. Check console/runtime errors attributable to hosting.

Preview tests:

- portal boot
- navigation to each main game surface
- ordinary question/gameplay flow
- service-worker registration and reload
- manifest/PWA behavior where supported
- local save/load
- Fieldnote authentication
- Fieldnote read
- Fieldnote write
- reload after write

Gate B passes only if the preview behaves equivalently to the current GitHub Pages deployment for these paths.

Do not use the preview origin as evidence that production-origin browser state has migrated.

### Phase C. Freeze and protect the old origin

Immediately before production cutover, on the current GitHub Pages origin:

1. stop gameplay/writes for the migration window
2. force or wait for Fieldnote `flush`
3. confirm the UI reports successful cloud synchronization and record the latest successful sync time
4. create a fresh JSON export as an independent recovery copy
5. keep the old origin available and unchanged

Gate C passes only when there is no known unsynced household progress on the old origin and the manual export exists.

### Phase D. Production-origin data migration

Make the Cloudflare production origin available while the GitHub repository is still public and GitHub Pages remains available.

On the Cloudflare production origin:

1. open Quest4Bugs as a fresh origin
2. re-enter/reconfigure the GitHub PAT because origin-local configuration does not transfer
3. run the normal Fieldnote `syncDown`/recovery path
4. verify the expected household profiles
5. verify representative progress from each active game
6. verify shared state, including wallet/equipment/breeding or other currently used shared namespaces
7. perform one small controlled write
8. flush/sync it to Fieldnote
9. reload the production origin
10. confirm the controlled write persists and is reflected after reload

If any authoritative state is missing, stop and recover from the old origin/Fieldnote or the JSON export before proceeding.

Gate D passes only when the final Cloudflare production origin has successfully recovered and round-tripped real household data.

### Phase E. Repository privacy cutover

Only after Gate D:

1. change `shtshbt/quest4bugs` from public to private
2. trigger a fresh Cloudflare deployment from the now-private repository
3. confirm Cloudflare still has GitHub App access and the deployment succeeds
4. re-open production and repeat a minimal boot, Fieldnote read/write, and reload test

Gate E passes only when a fresh deployment from the private repository is proven, not merely an already-built public-repo deployment remaining online.

### Phase F. Retire GitHub Pages

Only after Gate E:

1. disable/remove the GitHub Pages deployment workflow
2. verify the Cloudflare production origin once more from at least one real household device
3. leave Fieldnote unchanged

At this point GitHub Pages is no longer a production dependency.

## 7. Acceptance criteria

- `shtshbt/quest4bugs` is private.
- `shtshbt/quest4bugs_fieldnote` remains private and unchanged in role.
- Quest4Bugs is served by Cloudflare Pages from a runtime-only artifact.
- Internal repository material is not included in the public site artifact.
- Existing household functionality remains intact.
- The production Cloudflare origin can recover existing profiles and progress from Fieldnote.
- A controlled write from the production Cloudflare origin survives flush and reload.
- A fresh Cloudflare deployment succeeds after `shtshbt/quest4bugs` becomes private.
- No Cloudflare D1/R2 migration is required.
- No commercial branch merge is required.
- GitHub Pages is no longer required after final validation.
- The pre-cutover JSON export is retained until the migration is considered stable.

## 8. Main risks and mitigations

### 8.1 Unsynced old-origin data

This is the highest data-loss risk. Browser-local state on GitHub Pages does not appear automatically on the Cloudflare origin.

Mitigation: freeze writes, require a successful final Fieldnote flush, record the last successful sync, and create a JSON export before the production-origin migration.

### 8.2 PAT/configuration loss across origins

The PAT and synchronization configuration are origin-local.

Mitigation: explicitly reconfigure them on the final production origin before `syncDown`.

### 8.3 Preview/production false equivalence

Preview and production are separate origins.

Mitigation: use preview only for compatibility testing and perform the real migration and round-trip validation on production.

### 8.4 Accidental publication of repository internals

Publishing repository root would expose files that are irrelevant to the application even after the repository becomes private.

Mitigation: generate and publish a runtime-only artifact. Treat unexpected files in the output as a build failure.

### 8.5 Service-worker stale-cache behavior

A new origin starts with a clean service-worker state, but later updates may still expose cache/version issues.

Mitigation: test initial registration, reload, and at least one update path on Cloudflare before retiring GitHub Pages.

### 8.6 Private-repository deploy permission

A successful deployment made while the repository was public does not prove Cloudflare can fetch it after privacy changes.

Mitigation: require a fresh post-private deployment as a hard gate.

## 9. Rollback

Before repository privacy changes, rollback is simply to continue using the existing GitHub Pages production origin.

If the Cloudflare production-origin data migration fails, do not modify visibility and do not retire GitHub Pages. Recover using Fieldnote first and the pre-cutover JSON export if needed.

After repository privacy changes, if Cloudflare can no longer deploy:

1. fix Cloudflare GitHub App repository access first
2. if immediate service restoration is required, temporarily restore the prior repository visibility/GitHub Pages path as an explicit emergency rollback
3. do not alter or migrate Fieldnote data as part of hosting rollback

## 10. Exact implementation scope for the first PR

Allowed:

- one minimal static-build script and its output-directory convention
- focused tests/checks for artifact inclusion/exclusion
- documentation needed to configure the Cloudflare Pages build/output settings

Forbidden in this PR:

- application storage redesign
- Fieldnote schema changes
- gameplay changes
- commercial authentication/backend code
- disabling GitHub Pages
- changing repository visibility

The first PR is complete when Gate A is mechanically demonstrable. Cloudflare account configuration and household-data cutover occur only after that PR is reviewed and merged.
