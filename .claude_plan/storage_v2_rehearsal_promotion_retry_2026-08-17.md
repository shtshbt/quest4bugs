# Storage v2 Phase 2 rehearsal promotion retry

The earlier guarded promotion spent excessive time checking out the full working tree. The promotion workflow now sparse-checks out only shared/tests/tools/.github and reruns the storage regression suite before committing the exact deterministic rehearsal patch.

The prior full preview regression and real Chromium IndexedDB smoke tests were already green. This retry still does not enable IndexedDB gameplay reads and does not touch `main`.
