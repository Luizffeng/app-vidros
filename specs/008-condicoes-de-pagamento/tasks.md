---
description: "Task list for condições de pagamento (texto da loja na proposta)"
---

# Tasks: Condições de pagamento

**Input**: Design documents from `specs/008-condicoes-de-pagamento/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: Vitest for normalize + `quoteShareText` (+ PDF if suite already asserts body). Skills on implement: `persisted-field-change`, `customer-output-change`, `ui-change`. On ship: `news-update`, `ship-change`.

**Story labels**: US1 configurar texto · US2 aparecer na proposta.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Confirm feature dir and contracts: read `specs/008-condicoes-de-pagamento/contracts/ui.md` and `data-model.md` before coding (no new packages, no migration)

---

## Phase 2: Foundational — settings field (blocking)

**Purpose**: `paymentTerms` on `AppSettings` round-trips empty and filled. Blocks both stories.

- [x] T002 Add `paymentTerms: string` to `AppSettings` in `src/domain/types.ts`
- [x] T003 Default `paymentTerms: ''` in `defaultSettings()` and normalize (trim, max 500, missing → `''`) in `src/data/defaultSettings.ts`
- [x] T004 [P] Tests in `src/data/defaultSettings.test.ts`: old payload without key; whitespace → `''`; length > 500 sliced; placeholder never auto-stored

**Checkpoint**: `npx vitest run src/data/defaultSettings.test.ts` green; local reload keeps empty string.

---

## Phase 3: User Story 1 - Configurar o texto da loja (P1) 🎯 MVP

**Goal**: Configurações › Orçamento shows and saves the field with the exact placeholder.

**Independent Test**: set text, save, reopen → same text; clear → empty + placeholder visible.

- [x] T005 [US1] Add `Section` “Condições de pagamento” on Orçamento tab in `src/components/SettingsEditor.tsx` per `contracts/ui.md` (hint, textarea `maxLength={500}`, placeholder `Condições de pagamento à combinar.`, wire into `draft` / dirty / `onSave`)
- [x] T006 [US1] Manual check at 360 px: field usable, Salvar works (quickstart step 1)

**Checkpoint**: US1 acceptance scenarios 1–3.

---

## Phase 4: User Story 2 - Texto na proposta (P1)

**Goal**: PDF and WhatsApp show current shop text after Total when non-empty; omit when empty.

**Independent Test**: quickstart steps 2–4.

- [x] T007 [US2] Extend `quoteShareText` in `src/domain/quote.ts` with `options.paymentTerms`; insert after Total, before CTA/validity per `contracts/ui.md`
- [x] T008 [P] [US2] Tests in `src/domain/quote.test.ts`: with terms after Total; empty/whitespace omitted; CTA/validity order unchanged
- [x] T009 [US2] Pass `settings.paymentTerms` from `App.tsx` (and any other caller of `quoteShareText`) into share options
- [x] T010 [US2] After `TOTAL:` in `src/pdf/generateQuotePdf.ts`, print wrapped `settings.paymentTerms` when trim non-empty; skip when empty
- [x] T011 [P] [US2] Extend `src/pdf/generateQuotePdf.test.ts` if the file asserts body strings; otherwise cover via browser prévia
- [x] T012 [US2] Manual: PDF prévia + WhatsApp text with and without terms (quickstart 2–4)

**Checkpoint**: US2 acceptance scenarios 1–4; FR-003/FR-004.

---

## Phase 5: Polish & ship

- [x] T013 Update `BUSINESS_RULES.md` “Customer and display”: shop `paymentTerms` on PDF/WhatsApp when non-empty
- [x] T014 [P] If `API_CONTEXT.md` lists settings JSON keys, add `paymentTerms`
- [x] T015 Run `news-update` then `ship-change` (lint, test, build, backlog Done line, commit); placeholder must not appear as default news wording unless user configured it

---

## Dependencies

```text
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5
```

US1 can be demoed without PDF/WhatsApp. US2 needs T002–T004 (settings value available at send).

## Parallel examples

- After T003: T004 alone.
- After T007: T008 in parallel with T010 (different files) once options shape is agreed.
- Phase 5: T013 ∥ T014.

## Implementation strategy

MVP = Phase 2 + US1 + US2 in one PR (feature is tiny). Skip partial ship that saves settings but never prints them.
