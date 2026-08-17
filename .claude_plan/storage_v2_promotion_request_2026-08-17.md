# Storage v2 Phase 1 promotion request

Date: 2026-08-17
Branch: `agent/storage-v2-shadow`

This one-time marker records the decision to promote the CI-tested deterministic Phase 1B/1C/1D patch into `shared/storage.js` on the migration branch only.

Preconditions observed before this request:

- `main` remained untouched by storage-v2 work.
- standalone shadow module tests passed.
- QuestSave public-contract test passed.
- strengthened failure-isolation tests passed.
- CI run 6 validated the generated Phase 1B/1C/1D integration against the full Node regression suite successfully.
- CI run 7 repeated the integrated preview successfully and produced the tested `storage.js` artifact.

The guarded promotion workflow must re-apply the deterministic patch, run `git diff --check`, run the full test suite again, and only then commit `shared/storage.js` to `agent/storage-v2-shadow`.

This marker does not authorize any merge into `main`.
