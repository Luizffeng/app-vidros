---
description: "Task list for Composição do custo do item"
---

# Tasks: Composição do custo do item (janela "Detalhes do custo")

**Input**: Design documents from `specs/003-composicao-do-item/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/domain.md, contracts/ui.md, quickstart.md. **Spec 002 implemented first** (`priceItem(…, mode)`, `repriceDraft`, outdated-draft banner).

**Tests**: requested (FR-008 parity, SC-001 line sum, SC-002 reference). Write each test first and see it fail.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Confirm spec 002 tasks done and `npm test` green; record baseline

---

## Phase 2: Foundational (blocking)

**Purpose**: types and pure catalog helpers used by both stories.

- [ ] T002 In src/domain/types.ts add `CatalogTable`, `CatalogRef`, `PriceOverride`; `BomLine.unit?`, `BomLine.source?`, `BomLine.surcharge?`; add `'mao_de_obra'` to `BomLine.category`; `Quote.priceOverrides?`
- [ ] T003 [P] Create src/domain/catalogEdit.test.ts: `bumpCatalogVersion` same behavior as today's CatalogEditor; `aluminioValorMetro` rounding; `catalogPrice` null for missing/inactive; `setCatalogPrice` per table (aluminios re-derives `valorMetro`, original untouched); `withPriceOverrides` replaces prices and ignores missing/inactive refs
- [ ] T004 Implement src/domain/catalogEdit.ts per contracts/domain.md
- [ ] T005 Replace local `bumpVersion` and the inline `valorMetro` math with imports from src/domain/catalogEdit.ts in src/components/CatalogEditor.tsx

**Checkpoint**: `npm test` green, catalog editor behaves as before.

---

## Phase 3: User Story 1 - Ver a composição do item (P1) 🎯 MVP

**Goal**: "Detalhes do custo" opens a modal with summary and every line, summing to the item cost.

**Independent Test**: J4F 1950×754 Verde 06 Fosco: lines match the reference sheet; group sums = Custo.

### Tests for User Story 1

- [ ] T006 [US1] In src/domain/pricing/pricing.test.ts add an invariant helper run over every existing reference input: per group `Σ line.total` = breakdown field (cents), one `mao_de_obra` line = `breakdown.labor`, every non-labor catalog line has `unit` and `source`; existing `finalPrice`/cost assertions untouched
- [ ] T007 [US1] In src/domain/pricing/pricing.test.ts add: correr with a surcharged profile color → aluminum/hardware `unitPrice` includes surcharge and `surcharge` set; box glass `quantity × unitPrice = total` in m²
- [ ] T008 [P] [US1] Create src/domain/costComposition.test.ts: group order and labels, empty groups omitted, totals; old item lines (no unit/source) → `blockedReason: 'old-item'`; vendedor/emitted → not editable; inactive source → `'inactive'`; labor → `'labor'`; `basePrice` = unit / (1 + surcharge)

### Implementation for User Story 1

- [ ] T009 [P] [US1] Enrich BOM (unit, source, labor line) in src/domain/pricing/fixoEspelho.ts
- [ ] T010 [P] [US1] Enrich BOM (unit, source, labor line; glass quantity in m²) in src/domain/pricing/box.ts
- [ ] T011 [P] [US1] Enrich BOM (unit, source, surcharge in unit/total, labor line) in src/domain/pricing/correr.ts
- [ ] T012 [P] [US1] Enrich BOM (unit, source, surcharge in unit/total, labor line) in src/domain/pricing/pivotante.ts
- [ ] T013 [P] [US1] Enrich BOM (unit, source, surcharge in unit/total, labor line `un`) in src/domain/pricing/maxiar.ts
- [ ] T014 [US1] Implement `composeCost` in src/domain/costComposition.ts per contracts/domain.md
- [ ] T015 [US1] Create src/components/CostDetailModal.tsx (read-only first): header, summary (margin line per spec 002 mode), grouped lines with `quantity unit`, unit, subtotal, "+N% cor", group totals; close by button/Esc/backdrop without scroll jump
- [ ] T016 [US1] In src/components/App.tsx replace the `<details>` "Detalhes do custo" with a button that opens `CostDetailModal` for that item
- [ ] T017 [US1] Modal styles for 390px (line grid, group headers, totals) in src/index.css
- [ ] T018 [US1] Update `scripts/smoke-quote-browser.mjs` if it relied on the `<details>` element; add a step that opens and closes the modal

**Checkpoint**: quickstart manual steps 1–3 and 9; all parity + invariant tests green.

---

## Phase 4: User Story 2 - Admin corrige preço pela composição (P2)

**Goal**: in a draft, admin edits a unit price "Só neste orçamento" or "Atualizar no catálogo".

**Independent Test**: edit an aluminum unit price with each action; check the item, a second draft and the catalog.

### Tests for User Story 2

- [ ] T019 [P] [US2] In src/domain/quote.test.ts add `setPriceOverride` cases: reprices only items whose BOM has the ref (others keep result object); new `addItem` with same code uses override; value equal to catalog removes override; `null` removes; emitted throws
- [ ] T020 [P] [US2] In src/domain/quote.test.ts add: `repriceDraft` keeps overrides and drops those equal to the new catalog price; `createRevision` keeps `priceOverrides`; `normalizeQuote` drops malformed overrides and dedupes by ref

### Implementation for User Story 2

- [ ] T021 [US2] In src/domain/quote.ts apply `withPriceOverrides(catalog, quote.priceOverrides)` in `addItem`, `updateItem`, `repriceDraft`; implement `setPriceOverride`; normalize overrides in `normalizeQuote`
- [ ] T022 [US2] In src/components/CostDetailModal.tsx add editing for editable lines: unit price button → money input (`data-select-all`, base price, aluminum per barra with R$/m hint) + "Só neste orçamento" / "Atualizar no catálogo" / "Cancelar"; invalid value disables actions; "preço deste orçamento" mark; "Voltar ao preço do catálogo"; read-only hints per contracts/ui.md
- [ ] T023 [US2] In src/components/CostDetailModal.tsx add the `.remove-pop` `role="alertdialog"` confirmation for "Atualizar no catálogo" with the spec text and Sim/Não
- [ ] T024 [US2] In src/components/App.tsx add `onSetOverride` (persist `setPriceOverride` with `settings.marginMode`) and admin-only `onUpdateCatalog` (`setCatalogPrice` + `bumpCatalogVersion` → `repo.saveCatalog` → `setCatalog` → persist `repriceDraft` of the open draft → banner "Catálogo atualizado"); pass `isAdmin`

**Checkpoint**: quickstart manual steps 4–8.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T025 [P] Document quote price overrides and composition in BUSINESS_RULES.md
- [ ] T026 [P] Add decision (overrides UI-gated; catalog writes RLS-gated; BOM carries unit/source/surcharge) in DECISIONS.md
- [ ] T027 [P] Document new BomLine fields and labor line in src/domain/pricing/AGENTS.md
- [ ] T028 [P] Note `CostDetailModal` and handlers in src/components/AGENTS.md
- [ ] T029 Run `npm test`, `npm run lint`, `npm run build`
- [ ] T030 Run quickstart.md manual steps in local mode and the smoke script (browser-check skill)
- [ ] T031 Move the backlog item to Done with the date in BACKLOG.md

---

## Dependencies & Execution Order

- Spec 002 → T001 → Foundational (T002–T005) → US1 → US2 → Polish.
- T006–T007 before T009–T013 (tests first). T009–T013 are independent files.
- T014 needs T002; T015 needs T014; T016 needs T015.
- US2 needs US1 (modal and enriched BOM with `source`).

### Parallel Opportunities

- T003 alongside T005 after T004 is drafted (different files).
- T009–T013 (one pricer each).
- T008 alongside T006/T007 (different test files).
- T019/T020 (same file, sequential in practice).
- T025–T028 (different docs).

## Parallel Example: User Story 1

```bash
Task: "Enrich BOM in src/domain/pricing/fixoEspelho.ts"
Task: "Enrich BOM in src/domain/pricing/box.ts"
Task: "Enrich BOM in src/domain/pricing/correr.ts"
Task: "Enrich BOM in src/domain/pricing/pivotante.ts"
Task: "Enrich BOM in src/domain/pricing/maxiar.ts"
```

## Implementation Strategy

1. MVP = US1 (read-only composition): useful on its own, zero price risk.
2. US2 adds the two edit actions.
3. Polish and full validation.

## Notes

- No SQL migration.
- PDF and WhatsApp text unchanged (they do not read the BOM).
- Commit only when the owner asks; no agent co-author trailers.
