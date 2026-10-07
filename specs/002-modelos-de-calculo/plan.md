# Implementation Plan: Cálculo de margem

**Branch**: `002-modelos-de-calculo` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-modelos-de-calculo/spec.md`

## Summary

Store owner picks one of three margin modes (Empresa = today, Vendedor = no margin on labor, Autônomo = no margin) in Configurações › Orçamento. The mode is saved in `AppSettings`, applied once in `priceItem` through `buildBreakdown(parts, mode)`, and recorded on the quote and each item breakdown. Changing the mode (Salvar + confirm) only saves the setting. A draft priced with another mode or an older catalog version shows an info banner with "Atualizar valores", which reprices it through a new pure `repriceDraft` (same banner after any catalog save). Emitted quotes never change. Margin UI hides in Autônomo. Tests cover a full quote (labor, item extra, Frete, discount) in all three modes. No SQL migration.

## Technical Context

**Language/Version**: TypeScript 5, React 19

**Primary Dependencies**: Vite, Vitest, Oxlint; Supabase JS (existing)

**Storage**: Unchanged shape. `settings.payload` and `quotes.payload` JSON (Supabase) or IndexedDB (local). Settings write already admin-only by RLS.

**Testing**: Vitest (node), colocated `*.test.ts`; parity cases in `src/domain/pricing/pricing.test.ts`; browser smoke `scripts/smoke-quote-browser.mjs`

**Target Platform**: Mobile browsers (~390px) and desktop; Cloudflare Pages

**Project Type**: Single-page web app (no backend of our own)

**Performance Goals**: "Atualizar valores" reprices one draft instantly (pure, in memory) plus one save

**Constraints**: Emitted quotes immutable; Empresa must equal today's prices to the cent; pricers untouched

**Scale/Scope**: One shop, two roles (admin, vendedor); ~8 source files touched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | Pass | Per-kind formulas untouched; mode applied after pricers. Empresa default keeps all `calc_*` parity cases; new parity cases for the three modes. |
| II. Mobile-First Field Quoting | Pass | Three-row selector and popover fit 390px; item form gets simpler in Autônomo. |
| III. Quote Immutability & Revisions | Pass | `repriceDraft` rejects emitted; emitted keep `marginMode` and results and never show the banner; revisions behave as drafts. |
| IV. Storage Abstraction | Pass | Fields ride existing JSON payloads through `QuoteRepository`; no adapter shape change. |
| V. Simplicity & Determinism | Pass | Pure functions; quote total reproducible from inputs + catalog version + stored `marginMode`. |
| Workflow: pricing changes ship with parity tests | Pass | Planned in `pricing.test.ts` and `quote.test.ts`. |

Post-design re-check: still passes. No violations, Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-modelos-de-calculo/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── domain.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (not yet)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── types.ts                 # MarginMode; AppSettings.marginMode; Quote.marginMode?; CostBreakdown.marginMode?
│   ├── quote.ts                 # createEmptyDraft/addItem/updateItem take mode; new draftOutdated, repriceDraft; normalizeQuote
│   ├── quote.test.ts            # full quote in 3 modes (labor, item extra, Frete, discount); outdated/reprice; old quote
│   └── pricing/
│       ├── math.ts              # buildBreakdown(parts, mode)
│       ├── index.ts             # priceItem(catalog, input, mode) applies mode once
│       └── pricing.test.ts      # 3-mode parity cases
├── data/
│   ├── defaultSettings.ts       # marginMode default + normalize
│   └── defaultSettings.test.ts  # new: missing/unknown → empresa
└── components/
    ├── App.tsx                  # pass mode; outdated-draft banner + "Atualizar valores"; cost detail label
    ├── SettingsEditor.tsx       # "Cálculo de margem" section + confirm popover
    ├── ItemForm.tsx             # marginMode prop: hide field/label
    └── CatalogEditor.tsx        # marginMode prop: hide "Margem padrão"
```

Docs touched at implement time: `BUSINESS_RULES.md`, `DECISIONS.md`, `.agents/skills/pricing-change/SKILL.md` (margin model is now decided), `src/components/AGENTS.md` if a new UI rule appears.

**Structure Decision**: existing single-project layout; domain stays pure, `App` is the only caller of the repository.

## Phases

- **Phase 0**: [research.md](research.md). Decisions R1 to R7, no open questions.
- **Phase 1**: [data-model.md](data-model.md), [contracts/domain.md](contracts/domain.md), [contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md).
- **Phase 2**: `/speckit-tasks`. Suggested order: types + normalizers; `buildBreakdown`/`priceItem` + full-quote tests (US1); Settings section + confirm (US1/US2); `draftOutdated`/`repriceDraft` + banner (US2); UI hiding (US3); docs.

## Risks

- After launch, every existing draft created before the last catalog save shows the banner (its `pricingVersion` is old). Intended: it is the first time the app tells the user the catalog moved.
- A draft can mix items priced at different versions/modes until the user updates (today's behavior for catalog). The banner makes it visible.

## Complexity Tracking

None.
