# Storage v2 Phase 2 rehearsal promotion request

Date: 2026-08-17

The Phase 2 authority candidate and deterministic rehearsal patch have passed:

- Node authority reconciliation tests;
- full Quest4Bugs regression suite against the patched rehearsal preview;
- real Chromium IndexedDB smoke tests for legacy→shadow backfill;
- real Chromium confirmation that Phase 1 does not reverse-restore shadow data into legacy localStorage;
- real Chromium Phase 2 candidate reconciliation/rollback/WAL behavior.

This marker authorizes the guarded workflow to commit only the tested rehearsal wiring to `agent/storage-v2-shadow`.

It does not authorize any merge into `main`, and it does not authorize IndexedDB as gameplay read authority.
