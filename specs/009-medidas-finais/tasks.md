---
description: "Task list for medidas finais e fotos do orçamento"
---

# Tasks: Medidas finais e fotos

**Input**: `specs/009-medidas-finais/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Vitest for seed/retention/revision/share firewall. Browser for photos.

## Phase 1: Setup

- [x] T001 Read contracts/ui.md + database.md; no new npm deps

## Phase 2: Foundation — types and helpers

- [x] T002 Add `FinalMeasure`, `QuotePhoto`, `QuoteItem.finalMeasures?`, `Quote.photos` in `src/domain/types.ts`
- [x] T003 [P] `src/domain/finalMeasures.ts` + test: `seedFinalMeasures(input)`, templates per kind
- [x] T004 [P] `src/domain/quotePhotos.ts` + test: MAX=10, retention 180d, `photoIsAvailable`
- [x] T005 Extend `normalizeQuote` in `src/domain/quote.ts` for photos/finalMeasures; tests
- [x] T006 Confirm `createRevision` clones measures + photos (structuredClone); test

**Checkpoint**: pure domain green.

## Phase 3: US1 — Medidas finais UI

- [x] T007 `FinalMeasuresForm` / modal component
- [x] T008 Wire item button + save in `App.tsx` (draft **and** emitted; not via pricing ItemForm)
- [x] T009 [P] Negative tests: `quoteShareText` / PDF ignore finalMeasures
- [x] T010 BUSINESS_RULES: emitted may edit final measures; never on customer output

**Checkpoint**: US1 quickstart 1–2, 5 (firewall).

## Phase 4: US2 — Fotos

- [x] T011 Migration `supabase/migrations/20261022120000_quote_photos.sql`
- [x] T012 `src/data/quotePhoto.ts` compress helper + test if pure-enough
- [x] T013 Repo: put/get/delete photo (local data URL path; Supabase storage)
- [x] T014 `QuotePhotosSection` UI + wire App (max 10, hint copy)
- [x] T015 [P] Negative: share/PDF no photo paths/bytes

**Checkpoint**: US2 quickstart 3, 5.

## Phase 5: US3 — Revision

- [x] T016 Test revision copies measures + same photo paths; manual cloud check no second upload

## Phase 6: US4 — Retention + legal

- [x] T017 UI expired placeholder; helper already in T004
- [x] T018 Privacy one-liner 6 months
- [x] T019 AGENTS / customer-output-change skill: internal-only rule

## Phase 7: Ship

- [x] T020 news-update + ship-change when pushing

## Dependencies

```text
P1 → P2 → P3 (US1) → P4 (US2) → P5 → P6 → P7
```

US1 shippable without photos if needed; prefer one PR with both.
