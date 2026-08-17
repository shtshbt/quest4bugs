# Storage v2 disabled read-authority switch promotion request

Date: 2026-08-17

The disabled Phase 2 read-authority switch scaffold has passed the dedicated preview regression together with Phase 1 regression, Phase 2 rehearsal regression, and real Chromium IndexedDB smoke tests.

The scaffold includes marker-protected authority-to-cache restoration, boot-time recovery from a partial restore transaction, conflict stop behavior, and a hard compile-time gate that remains `false`.

This marker authorizes committing only the tested disabled scaffold to `agent/storage-v2-shadow`. It does not enable IndexedDB gameplay reads and does not authorize any merge into `main`.
