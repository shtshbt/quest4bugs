# Storage v2 Phase 1 promotion retry

Date: 2026-08-17

The first guarded promotion run stalled during a full-history checkout (`fetch-depth: 0`) on this large repository. The promotion workflow was changed to a shallow checkout (`fetch-depth: 1`) and this marker retriggers the same deterministic, fully tested Phase 1B/1C/1D promotion.

The old run is stale relative to this branch tip. If it eventually reaches its push step, Git should reject a non-fast-forward push rather than overwrite newer branch history.

This marker does not authorize any merge into `main`.
