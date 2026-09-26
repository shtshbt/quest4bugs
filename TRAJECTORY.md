<!-- trajectory-generated: do not edit directly -->
# Project Trajectory

Project: `quest4bugs`  
Registry updated: `2026-09-26T18:41:00-04:00`  
Baseline commit: `9f74821bade367ad28047cc69f2d98662f971a38`

## Current authority

| Topic | Resolution | Disposition | Authority | Scope |
| --- | --- | --- | --- | --- |
| `allowed-media-licenses` | resolved | SUPPORTED | `BLOCKED_DECISIONS.md` | Which media licenses the catalog accepts |
| `identification-name-field` | resolved | SUPPORTED | `BLOCKED_DECISIONS.md` | Which field the identification axis reads |
| `media-gap-record-schema` | resolved | SUPPORTED | `BLOCKED_DECISIONS.md`, `scripts/photo_audit/outputs.py` | The shape of the media gap output consumed by later zukan-fetch lanes |

## Current interpretation / decision

### `allowed-media-licenses`

**CURRENT** · `trj-20260926-licenses-confirmed` · `SUPPORTED`

The evaluated var ALLOWED_MEDIA_LICENSES in zukan_catalog.js is canonical: CC0-1.0, PDM-1.0, CC-BY-4.0 and CC-BY-SA 2.0/2.5/3.0/4.0 are allowed. The header comment was brought in line with it. CC-BY-SA entries carry creditLine, licenseUrl, modifications and institutionRecordUrl, all shown in the zukan detail panel; a modified CC-BY-SA card is shared under the same license.

Scope: Which media licenses the catalog accepts

Limitations: 173 CC-BY-SA entries existed at confirmation; the attribution check covered field presence, not per-image legal review

Reuse rule: Cite as the current license policy. Adding or removing a license requires a new decision.

Do not reuse as current authority:
- `trj-20260828-licenses-provisional (SUPERSEDED)` — Provisionally, the evaluated var ALLOWED_MEDIA_LICENSES in zukan_catalog.js is treated as canonical over the file's own header comment, so the four CC-BY-SA variants are allowed. The audit tool parses that object literal at run time rather than hardcoding a list, so audit results match runtime behaviour. CC-BY-SA entries carry the same attribution requirements as CC-BY.

### `identification-name-field`

**CURRENT** · `trj-20260926-scientificname-confirmed` · `SUPPORTED`

The identification axis compares the entry's top-level scientificName with shared/bugs.js. If specimen.scientificName (or specimenFemale.scientificName) is present it takes precedence, so the decision holds whether or not that field is added later.

Scope: Which field the identification axis reads

Limitations: whether to add specimen.scientificName to the catalog is undecided

Reuse rule: Cite as the current reading of the SPEC's name field.

Do not reuse as current authority:
- `trj-20260828-scientificname-provisional (SUPERSEDED)` — Provisionally, identification reads specimen.scientificName first and falls back to the entry's top-level scientificName, with the same pattern for the female variant. No catalog entry currently carries specimen.scientificName, so in practice the fallback is what runs. If the field is added later it takes precedence automatically.

### `media-gap-record-schema`

**CURRENT** · `trj-20260926-mediagap-adopted` · `SUPPORTED`

The record shape emitted by build_gap_records in scripts/photo_audit/outputs.py is the canonical MediaGapRecord v1, with gapId = <speciesId>::<variant>::<intent>. No other definition exists: the zukan-fetch skill was searched on 2026-09-26 and defines neither MediaGapRecord nor gapId. The reader is zukan_foundry/tests/test_candidates.py.

Scope: The shape of the media gap output consumed by later zukan-fetch lanes

Limitations: the 2026-08-28 audit output still carries the old approximate schemaNote until the next audit run

Reuse rule: Cite outputs.py as the schema. Changing the record shape requires updating its reader.

Do not reuse as current authority:
- `trj-20260828-mediagap-provisional (SUPERSEDED)` — Provisionally, the missing-or-replacement output uses an approximate schema satisfying the elements the SPEC names, with a schemaNote field in the file declaring that it is an approximation because the canonical schema is not present in this repository. gapId is the idempotent key speciesId::variant::intent, verified non-duplicating at run time. new_species is not emitted by this lane.
