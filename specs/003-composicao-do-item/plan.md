# Implementation Plan: Composição do custo do item (janela "Detalhes do custo")

**Branch**: `003-composicao-do-item` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-composicao-do-item/spec.md`

## Summary

"Detalhes do custo" opens a modal with the cost summary and every BOM line (quantity, unit, unit price, subtotal) grouped by Vidro, Alumínio, Ferragem, Acessório and Mão de obra. Pricers enrich BOM lines (unit, catalog reference, color surcharge baked into the unit, labor line, box glass in m²) without changing any price. Admin edits a unit price in a draft with two actions: "Só neste orçamento" stores a quote-level price override applied through `withPriceOverrides(catalog, overrides)`; "Atualizar no catálogo" writes the catalog (version bump), reprices the open draft, and other drafts get spec 002's "Atualizar valores" banner. No SQL migration.

## Technical Context

**Language/Version**: TypeScript 5, React 19

**Primary Dependencies**: Vite, Vitest, Oxlint; Supabase JS (existing)

**Storage**: Unchanged shape. `quotes.payload` gains `priceOverrides`; `catalog.payload` unchanged. Catalog write admin-only by RLS.

**Testing**: Vitest; parity + new BOM invariant in `src/domain/pricing/pricing.test.ts`; `quote.test.ts`; new `catalogEdit.test.ts`, `costComposition.test.ts`; browser smoke script

**Target Platform**: Mobile browsers (~390px) and desktop; Cloudflare Pages

**Project Type**: Single-page web app

**Performance Goals**: Modal opens instantly (pure grouping over stored BOM); price edit reprices only affected items

**Constraints**: Every `finalPrice`/cost identical to today (FR-008); emitted read-only; depends on spec 002 (`priceItem` mode, `repriceDraft`, banner)

**Scale/Scope**: six pricers (BOM only), ~4 domain files, 1 new component, App/CatalogEditor wiring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | Pass | Breakdown untouched; BOM-only edits guarded by all `calc_*` parity cases plus a new line-sum invariant. Prices still come from the catalog (or an explicit quote override). |
| II. Mobile-First Field Quoting | Pass | One tap to the composition; modal designed for 390px. |
| III. Quote Immutability & Revisions | Pass | Emitted composition and overrides read-only; revisions inherit overrides. |
| IV. Storage Abstraction | Pass | New field rides the quote JSON through `QuoteRepository`; catalog save uses the existing method. |
| V. Simplicity & Determinism | Pass | Total reproducible from inputs + catalog version + `marginMode` + `priceOverrides`; overrides applied by one pure function. |
| Workflow: pricing PRs include parity tests | Pass | Existing cases kept; invariant + surcharge + box m² cases added. |

Post-design re-check: passes. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-composicao-do-item/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── domain.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── types.ts                  # CatalogRef, PriceOverride, BomLine unit/source/surcharge, 'mao_de_obra', Quote.priceOverrides
│   ├── catalogEdit.ts            # new: bumpCatalogVersion, aluminioValorMetro, catalogPrice, setCatalogPrice, withPriceOverrides
│   ├── catalogEdit.test.ts       # new
│   ├── costComposition.ts        # new: composeCost view model
│   ├── costComposition.test.ts   # new
│   ├── quote.ts                  # overrides in addItem/updateItem/repriceDraft; setPriceOverride; normalizeQuote
│   ├── quote.test.ts
│   └── pricing/
│       ├── box.ts, correr.ts, pivotante.ts, maxiar.ts, fixoEspelho.ts   # BOM enrichment + labor line
│       └── pricing.test.ts       # invariant, surcharge line, box m²
└── components/
    ├── CostDetailModal.tsx       # new
    ├── App.tsx                   # button opens modal; onSetOverride; onUpdateCatalog
    └── CatalogEditor.tsx         # import bumpCatalogVersion/aluminioValorMetro from domain
```

Docs at implement time: `BUSINESS_RULES.md` (overrides, composition), `DECISIONS.md` (quote overrides are UI-gated; catalog RLS), `src/components/AGENTS.md`, `src/domain/pricing/AGENTS.md` (BOM fields).

**Structure Decision**: existing layout; new pure modules under `src/domain/`, one new component.

## Phases

- **Phase 0**: [research.md](research.md) (R1 to R7, no open questions).
- **Phase 1**: [data-model.md](data-model.md), [contracts/domain.md](contracts/domain.md), [contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md).
- **Phase 2**: [tasks.md](tasks.md).

## Risks

- BOM enrichment touches every pricer. Mitigation: parity cases unchanged + invariant test over all reference inputs before any UI work.
- Old items lack unit/source: modal read-only for them until recalculated (spec SC-004).
- Quote overrides are not enforced server-side (same as all quote prices today). Documented; optional future trigger.

## Complexity Tracking

None.
