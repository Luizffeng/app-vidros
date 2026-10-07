---
description: "Task list for Cálculo de margem"
---

# Tasks: Cálculo de margem

**Input**: Design documents from `specs/002-modelos-de-calculo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/domain.md, contracts/ui.md, quickstart.md

**Tests**: Requested (spec SC-001; owner 2026-10-07: price tests must cover labor, item values, item extras, quote additional costs and discount). Vitest, colocated `*.test.ts`. Write each test first and see it fail.

**Organization**: grouped by user story. US1 and US2 are P1, US3 is P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1, US2, US3 from spec.md

---

## Phase 1: Setup

**Purpose**: baseline before touching pricing.

- [x] T001 Run `npx vitest run src/domain/pricing/pricing.test.ts` and `npm test`; record that all pass (baseline for "Empresa = today")

---

## Phase 2: Foundational (blocking)

**Purpose**: shared type and stored field every story reads.

- [x] T002 Add `export type MarginMode = 'empresa' | 'vendedor' | 'autonomo'`, `AppSettings.marginMode: MarginMode`, `Quote.marginMode?: MarginMode`, `CostBreakdown.marginMode?: MarginMode` in src/domain/types.ts
- [x] T003 [P] Create src/data/defaultSettings.test.ts: missing `marginMode` → `'empresa'`; unknown string → `'empresa'`; each valid literal kept
- [x] T004 Add `marginMode: 'empresa'` to `defaultSettings()` and validate it in `normalizeSettings` (only the three literals) in src/data/defaultSettings.ts
- [x] T005 [P] In src/domain/quote.test.ts add case: old quote payload without `marginMode` passes `normalizeQuote` with the field absent; quote with unknown `marginMode` gets it dropped
- [x] T006 In `normalizeQuote` drop unknown `marginMode` values (keep absent as absent) in src/domain/quote.ts

**Checkpoint**: `npm test` green; app behaves exactly as before.

---

## Phase 3: User Story 1 - Admin escolhe o cálculo de margem (P1) 🎯 MVP

**Goal**: the saved mode drives item prices; admin picks it in Configurações › Orçamento.

**Independent Test**: set each mode, create the example item, compare with 208 / 193 / 160 and quote totals 228 / 213 / 180 (Frete 40, desconto 20).

### Tests for User Story 1

- [x] T007 [P] [US1] In src/domain/pricing/pricing.test.ts add `buildBreakdown` cases with parts `{ glass: 100, extras: 10, labor: 50, markup: 0.3 }` (others 0): empresa finalPrice 208 / marginAmount 48; vendedor 193 / 33; autonomo 160 / 0; `totalCost` 160 and `marginMode` set in all three; omitted mode equals empresa
- [x] T008 [P] [US1] In src/domain/pricing/pricing.test.ts add: for one existing `calc_*` reference input, `priceItem(catalog, input, mode)` returns the same `bom`, `labor`, `glass`, `aluminum`, `hardware`, `accessories`, `extras`, `totalCost` in all three modes and empresa `finalPrice` equals the current reference (FR-010); `custom` input ignores the mode
- [x] T009 [P] [US1] In src/domain/quote.test.ts add full-quote test per mode: `createEmptyDraft(..., mode)` + `addItem(quote, catalog, espelhoInput with one item extra, mode)` + `setAdditionalCosts([Frete 40])` + `setDiscounts([20])`. Assert: item finalPrice follows the mode formula from its own breakdown parts (labor and item extra included); `additionalTotal` 40 and `discountTotal` 20 in every mode; `grandTotal = itemsTotal + 40 − 20`; `quote.marginMode` = mode; cross-mode `empresa.itemsTotal − vendedor.itemsTotal = labor × markup` and `vendedor.itemsTotal − autonomo.itemsTotal = (material + extra) × markup` (to the cent)

### Implementation for User Story 1

- [x] T010 [US1] Add `mode: MarginMode = 'empresa'` to `buildBreakdown` in src/domain/pricing/math.ts implementing the table in research.md R2; return `marginMode`
- [x] T011 [US1] Add `mode: MarginMode = 'empresa'` to `priceItem` in src/domain/pricing/index.ts; for non-custom kinds rebuild the pricer result's breakdown once with `buildBreakdown(parts, mode)` (pricers untouched)
- [x] T012 [US1] Add trailing `mode: MarginMode = 'empresa'` to `createEmptyDraft` (sets `quote.marginMode`), `addItem` and `updateItem` (forward to `priceItem`) in src/domain/quote.ts
- [x] T013 [US1] In src/components/App.tsx pass `settings.marginMode` to `createEmptyDraft` (openNew), `addItem` (onAddItem), `updateItem` (onUpdateItem) and as prop `marginMode` to `ItemForm`
- [x] T014 [US1] In src/components/ItemForm.tsx accept `marginMode` prop and use it in the preview `priceItem(catalog, input, marginMode)`
- [x] T015 [US1] In src/components/SettingsEditor.tsx add section "Cálculo de margem" at the top of the `quote` tab: three rows (box-styled radio, one group), bold name Empresa/Vendedor/Autônomo + description from data-model.md; edits only `draft.marginMode`
- [x] T016 [US1] Style the three rows for ~390px (name + description side by side, wraps cleanly) in src/index.css

**Checkpoint**: tests T007–T009 green; picking a mode and saving changes new item prices (no warning yet).

---

## Phase 4: User Story 2 - Aviso ao salvar e rascunho desatualizado (P1)

**Goal**: confirm before changing the mode; drafts priced with another mode or catalog version offer "Atualizar valores"; nothing reprices by itself.

**Independent Test**: one draft + one emitted; change mode and confirm; draft keeps 208 and shows the banner; tap → 193; emitted unchanged, no banner; catalog save also triggers the banner.

### Tests for User Story 2

- [x] T017 [P] [US2] In src/domain/quote.test.ts add `draftOutdated` cases: same version + same mode → `null`; only `pricingVersion` differs → `{ catalog: true, margin: false }`; only mode differs → `{ catalog: false, margin: true }`; both → both true; absent `marginMode` vs `'empresa'` → no margin flag; emitted → `null`; draft with only custom items → `null`
- [x] T018 [P] [US2] In src/domain/quote.test.ts add `repriceDraft` cases: empresa draft repriced to vendedor gives the vendedor price, `marginMode` and `pricingVersion` updated, additional costs and discounts unchanged, totals recomputed; item whose catalog row is inactive keeps its stored result and `failed === 1`; emitted throws

### Implementation for User Story 2

- [x] T019 [US2] Implement `draftOutdated(quote, catalog, mode)` and `repriceDraft(quote, catalog, mode)` per contracts/domain.md in src/domain/quote.ts
- [x] T020 [US2] In src/components/SettingsEditor.tsx, on Salvar with `draft.marginMode !== settings.marginMode` show `.remove-pop` `role="alertdialog"` anchored to Salvar with the US2 text and Sim/Não; Não or tap outside closes without saving; Sim saves as today; unchanged mode saves without the popover
- [x] T021 [US2] In src/components/App.tsx render one info banner in the draft editor (below the head) when `draftOutdated(quote, catalog, settings.marginMode)` is not null, text by flags per contracts/ui.md (catalog only / margin only / both in one sentence) + button "Atualizar valores" → `repriceDraft` + `persist`; show "N item(ns) manteve(mantiveram) o valor anterior." when `failed > 0`
- [x] T022 [US2] Add neutral info banner style (not error red) for the outdated-draft banner in src/index.css

**Checkpoint**: quickstart manual steps 4–7 and 10–12 pass.

---

## Phase 5: User Story 3 - Telas mostram só o que o modo usa (P2)

**Goal**: no margin control where it does not change the price.

**Independent Test**: in each mode open item form, cost detail and Catálogo › Mão de obra / margem.

- [x] T023 [P] [US3] In src/components/ItemForm.tsx: Autônomo hides the "Margem (%)" field and the preview margin line (stored `markup` preserved on save); Vendedor labels the margin line "Margem (N%) · sem mão de obra"
- [x] T024 [P] [US3] In src/components/App.tsx "Detalhes do custo": read `item.result.breakdown.marginMode ?? 'empresa'`; hide margin line for autonomo; Vendedor label as in T023
- [x] T025 [P] [US3] In src/components/CatalogEditor.tsx accept `marginMode` prop and hide the "Margem padrão" block when autonomo; pass `settings.marginMode` from src/components/App.tsx

**Checkpoint**: quickstart manual step 8 passes.

---

## Phase 6: Polish & Cross-Cutting

- [x] T026 [P] Update margin rule (three modes; item extras follow material; quote additional costs and discount never get margin; outdated drafts + "Atualizar valores") in BUSINESS_RULES.md
- [x] T027 [P] Add decision entries (mode lives in AppSettings; drafts never reprice silently) in DECISIONS.md
- [x] T028 [P] Replace the "do not change markup-on-full-cost" guidance with the three-mode rule and test requirement in .agents/skills/pricing-change/SKILL.md
- [x] T029 [P] Note `marginMode` props, outdated-draft banner and Settings confirm popover in src/components/AGENTS.md
- [x] T030 Run `npm test`, `npm run lint`, `npm run build`
- [x] T031 Run quickstart.md manual steps in local mode and `APP_URL=http://127.0.0.1:5180 node scripts/smoke-quote-browser.mjs` (browser-check skill)
- [x] T032 Move the backlog item to Done with today's date in BACKLOG.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (T001) → Foundational (T002–T006) → user stories → Polish.
- T002 blocks everything that references `MarginMode`.

### User Story Dependencies

- **US1**: after Foundational. No dependency on other stories.
- **US2**: needs T010–T012 (mode-aware pricing) for `repriceDraft`; Settings popover (T020) builds on T015.
- **US3**: needs T013/T014 (mode reaches `ItemForm`/`App`); independent of US2.

### Within Each Story

- Tests first (T007–T009, T017–T018), see them fail, then implement.
- Domain (`math.ts`, `index.ts`, `quote.ts`) before components.

### Parallel Opportunities

- T003 and T005 (different test files).
- T007, T008, T009 (pricing.test.ts vs quote.test.ts; T007/T008 share a file, write sequentially if one editor).
- T017 and T018 (same file, sequential in practice).
- T023, T024, T025 (different components).
- T026–T029 (different docs).

---

## Parallel Example: User Story 3

```bash
Task: "Autônomo/Vendedor margin display in src/components/ItemForm.tsx"
Task: "Cost detail margin line in src/components/App.tsx"
Task: "Hide Margem padrão in src/components/CatalogEditor.tsx"
```

---

## Implementation Strategy

### MVP (US1)

1. T001–T006.
2. T007–T016. Validate 208 / 193 / 160 and 228 / 213 / 180.
3. Stop and check: Empresa prices unchanged everywhere.

### Incremental

1. US1 → mode drives new prices.
2. US2 → safe switching; outdated drafts offer "Atualizar valores" (also after catalog saves).
3. US3 → cleaner screens.
4. Polish → docs, full validation, backlog.

## Notes

- No SQL migration (research R1, R7).
- Customer outputs (PDF, WhatsApp) unchanged.
- Commit only when the owner asks; no agent co-author trailers.
