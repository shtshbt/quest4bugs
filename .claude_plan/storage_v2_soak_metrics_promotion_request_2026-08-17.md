# Storage v2 automatic soak metrics promotion request

Date: 2026-08-17

The automatic soak metrics/readiness patch passed its dedicated preview regression together with the disabled read-switch, Phase 2 rehearsal, Phase 1, and real Chromium IndexedDB smoke checks.

It records diagnostic counts only and does not copy child/game payload into the stats record. Readiness is advisory only (`automaticPromotion:false`) and the IndexedDB read-authority hard gate remains disabled.

This marker authorizes committing the tested metrics patch to `agent/storage-v2-shadow`. It does not authorize a merge into `main` or enable IndexedDB gameplay reads.
