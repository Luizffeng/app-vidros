# Implementation Plan: Condições de pagamento

**Branch**: work on current line (`007-saas-vidracarias` / `main`); feature dir `008-condicoes-de-pagamento` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification `specs/008-condicoes-de-pagamento/spec.md`.

## Summary

Add one optional shop-level string on `AppSettings` (same pattern as `shareCta`): the user edits it under Configurações › Orçamento, next to validity and the WhatsApp closing line. When non-empty (after trim), PDF and WhatsApp include that text for every quote at send time (current settings value, no snapshot). Empty → no heading and no blank block. No pricing, no per-quote override, no SQL migration (field lives in the existing settings JSON payload).

## Technical Context

**Language/Version**: TypeScript 5, React 19, CSS

**Primary Dependencies**: none new (jsPDF already used for PDF)

**Storage**: `AppSettings` JSON in IndexedDB / Supabase `settings.payload` (no new column)

**Testing**: Vitest — `normalizeSettings` (absent/empty/trim), `quoteShareText` (present/absent), PDF unit coverage if the project already asserts footer/body strings in `generateQuotePdf.test.ts`

**Target Platform**: Chrome Android, Safari/Chrome iOS, desktop; Cloudflare Pages

**Project Type**: single-page web app + Supabase (optional) backend

**Performance Goals**: N/A beyond existing emit/share path (one extra string read from settings already in memory)

**Constraints**: usable at 360 px; max length aligned with a short commercial blurb (500 chars); skills `persisted-field-change` + `customer-output-change`; never print internals

**Scale/Scope**: one settings field, one settings UI section, two customer outputs (PDF + WhatsApp). ~6–8 files touched. No new routes, no new tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | Pass | No `priceItem` / catalog / totals change. |
| II. Mobile-First Field Quoting | Pass | One textarea in existing Settings tab; same control height / Section pattern as CTA. |
| III. Quote Immutability & Revisions | Pass | Text is shop settings, not quote body; emit still immutable. Proposal always shows **current** shop text at send (spec assumption). |
| IV. Storage Abstraction | Pass | Field on `AppSettings` via existing `getSettings` / `saveSettings`; both adapters already persist payload JSON. |
| V. Simplicity & Determinism | Pass | One string; trim-empty → omit; no calculators. |
| Workflow: UI ~390px | Pass | Quickstart at 360 px. |

Post-design re-check: passes. No constitution amendment.

## Delivery steps

Single small ship (one PR / one commit series):

1. Domain + normalize: `paymentTerms` on `AppSettings`, default `''`, normalize trim; tests.
2. Settings UI: Section on Orçamento tab; placeholder exact from spec; `maxLength` 500.
3. Customer output: wire into `quoteShareText` and `generateQuotePdf`; tests; `BUSINESS_RULES.md` one bullet.
4. Novidades bullet (ship-change / news-update) when shipping to users.

## Project Structure

### Documentation (this feature)

```text
specs/008-condicoes-de-pagamento/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui.md            # copy + placement
├── checklists/requirements.md
└── tasks.md             # next: /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── types.ts              # AppSettings.paymentTerms
│   └── quote.ts              # quoteShareText(+pdfShareMessage if needed)
├── data/
│   └── defaultSettings.ts    # default + normalizeSettings
├── components/
│   └── SettingsEditor.tsx    # Section + textarea
├── pdf/
│   └── generateQuotePdf.ts   # block after TOTAL when non-empty
└── (tests)
    ├── data/defaultSettings.test.ts
    ├── domain/quote.test.ts
    └── pdf/generateQuotePdf.test.ts   # if assertions fit existing style
```

**Structure Decision**: extend existing settings + share/PDF paths; no new modules or buckets.

## Complexity Tracking

None — no constitution violations.
