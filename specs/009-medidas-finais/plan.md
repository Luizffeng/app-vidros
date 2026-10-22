# Implementation Plan: Medidas finais e fotos do orçamento

**Branch**: work on current line (`007-saas-vidracarias` / `main`); feature dir `009-medidas-finais` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification `specs/009-medidas-finais/spec.md`.

## Summary

Add **internal** production data on quotes: (1) per-item `finalMeasures` (seeded from quote dimensions on first edit, then independent); (2) up to **10** `photos` per quote revision in a private storage bucket (shared path on revision clone). Never appear in PDF/WhatsApp. Editable on draft **and** emitted (pricing stays read-only when emitted). Retention **6 months** from photo `createdAt`. Client compresses images (~300 KB target, 2 MB hard cap). Local mode stores photo blobs in IndexedDB (refs on the quote). No OCR/production module.

## Technical Context

**Language/Version**: TypeScript 5, React 19, CSS, PostgreSQL/Storage (Supabase)

**Primary Dependencies**: none new; reuse canvas compress pattern from `src/data/logo.ts`

**Storage**: Quote JSON fields + new bucket `quote-photos` (`{account_id}/{photoId}.jpg`); local: IDB store `quote-photos`

**Testing**: Vitest — seed/schema of final measures, `createRevision` copies measures + photo refs, retention helper, share/PDF negative tests (no leakage). Manual/browser for upload UI.

**Target Platform**: Chrome Android, Safari/Chrome iOS, desktop; Cloudflare Pages

**Project Type**: SPA + Supabase

**Performance Goals**: compress before upload; list shows thumbnails; full image on tap

**Constraints**: 10 photos/revision; 6-month retention; never customer output; usable 360 px; skills `persisted-field-change`, `ui-change`; update `customer-output-change` / AGENTS with “internal-only” rule

**Scale/Scope**: see Free-tier analysis in spec (~300 full revisions on 1 GB if compressed). New migration for bucket + RLS. New UI: item “Medidas finais” + quote “Fotos” section.

## Constitution Check

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | Pass | Final measures never enter `priceItem`. |
| II. Mobile-First Field Quoting | Pass | Large inputs; camera/file pick; sticky actions. |
| III. Quote Immutability & Revisions | Pass* | Emitted **pricing** stays immutable; final measures/photos are side channels (spec). Revision clones both. Document in BUSINESS_RULES. |
| IV. Storage Abstraction | Pass | Repo methods for photo upload/URL/delete; domain holds refs only. |
| V. Simplicity & Determinism | Pass | Pure helpers for seed fields + retention; no OCR. |

\*Justified exception: internal fields mutable on emitted quotes without new revision — required by FR-001 and owner clarification.

Post-design: update BUSINESS_RULES Quote status + Customer and display (negative rule). Update `src/components/AGENTS.md` / customer-output skill: never print `finalMeasures` / `photos`.

## Delivery steps

1. **Domain + measures UI (US1, US3 measures)**: types, normalize, seed-from-input, save on draft/emitted, `createRevision` keeps measures, PDF/WA negative tests, item UI.
2. **Photos storage + UI (US2, US3 photos)**: migration bucket/RLS, repo upload/signed URL/delete, compress helper, quote Fotos section, max 10, revision shares paths.
3. **Retention + legal (US4)**: hide/expire by `createdAt` + 6 months; privacy/terms one line; optional operator cleanup SQL later.
4. **Ship**: news-update, backlog Done, ship-change.

## Project Structure

### Documentation (this feature)

```text
specs/009-medidas-finais/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ui.md · contracts/database.md
├── checklists/requirements.md · tasks.md
```

### Source Code (repository root)

```text
supabase/migrations/20261022120000_quote_photos.sql
src/domain/
  types.ts                 # FinalMeasure, QuotePhoto, QuoteItem.finalMeasures, Quote.photos
  finalMeasures.ts (+test) # field defs per kind, seedFromInput
  quotePhotos.ts (+test)   # MAX=10, RETENTION_MS, isPhotoAvailable
  quote.ts                 # createRevision copies photos; normalize
src/data/
  quotePhoto.ts            # compress file → JPEG blob
  repository.ts / supabaseRepository.ts  # photo blob CRUD local; storage cloud
src/components/
  FinalMeasuresForm.tsx    # modal/fields
  QuotePhotosSection.tsx   # gallery + add
  App.tsx                  # wire; allow on emitted
src/pdf/ + domain/quote.ts # assert absence (tests)
```

**Structure Decision**: side data on quote/item JSON + dedicated photo blob store; no production module.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Mutate emitted quote (measures/photos) | Spec allows draft+emitted without forcing revision for factory notes | “Only on draft” rejected by owner |
| New storage bucket | Multi-photo evidence; logo bucket must stay logos-only | Data URLs in quote JSON — payload/size/RLS pain |
