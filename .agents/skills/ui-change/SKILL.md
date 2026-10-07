---
name: ui-change
description: Use when changing the quote list/editor, item modal, catalog screen, settings screen, or nav/header in `src/components/` without changing a pricing formula or stored shape.
---

# UI change

## When to use

Layout, copy, buttons, modals, filters, sticky bars, input masks, mobile fit, admin-only visibility. Most commits in this repo are this kind (`feat(editor|catalog|settings|customer|item)`, `style(...)`).

## Read first

1. `src/components/AGENTS.md` (file ownership and skip list).
2. Only when touching gating, emit, or delete: `BUSINESS_RULES.md` "Access" and "Quote status".

## Steps

1. Pick the file: list, editor, customer, costs, discounts, share modal: `App.tsx`. Item fields: `ItemForm.tsx`. Catalog: `CatalogEditor.tsx`. Settings tabs: `SettingsEditor.tsx`. Nav/header menu: `AppHeader.tsx`. Select-on-focus: `selectAllOnFocus.ts` (new value inputs use `inputMode="decimal"` or `data-select-all`). Widgets: `Dropdown.tsx`, `Modal.tsx`, `SearchField.tsx`, `useDismiss.ts`.
2. Locate the span, never the whole file. Search the visible pt-BR label (`"Novo orçamento"`, `"Adicionar item"`, `"Emitir"`) or a handler (`openNew`, `persist`, `onEmit`, `onDeleteDraft`, `goSection`, `readOnly`, `isAdmin`): `rg -n "<label or handler>" src/components/App.tsx`. Read about 60 lines around the hit. Skip the icon functions at the bottom of `App.tsx`.
3. Styles: `src/index.css` is about 2200 lines. `rg -n "\.<class>" src/index.css`, read the matched blocks and any nearby `@media (max-width: …)` override. Reuse existing classes (`.btn-icon`, sticky action bars, `.remove-pop`) before adding new ones.
4. Edit and keep these rules:
   - Quote mutations go through domain functions (`addItem`, `updateItem`, `emitQuote`, `createRevision`) and then `persist` (it queues saves). Do not call `repo.saveQuote` directly.
   - Emitted quotes are `readOnly`. Delete stays draft-only.
   - Admin-only UI sits behind `isAdmin`. A new admin-only write needs RLS: see `persisted-field-change`.
   - Money and percent inputs: reuse the parser already in the same file (`parseMoneyBr` in `App.tsx`; `parseMoney`/`parsePercent` in `CatalogEditor.tsx`; `parseMoney` in `ItemForm.tsx`). Percent in the UI is a fraction in storage (divide by 100). Do not add another copy, and do not extract a shared helper unless the task asks.
   - UI copy is pt-BR and matches existing labels.
5. Vertical space (phones first; owner rule 2026-10-07). New or touched components follow these; a full-app review is in `BACKLOG.md`:
   - Section = `.section` card + `h2`. Its explanation goes right under the title (`.section-hint`), not under the field. Do not repeat the title as the field label (use `aria-labelledby`).
   - Related fields share a row, also at ≤420px where `.grid` collapses: `.field-pair` with `--half` (width + height, thickness + color) or a sized variant (`--cep`, `--number`).
   - Short values (days, %, quantity up to 4 digits): inline label + input sized to content (`.inline-field`, about 4.5–6rem), not a full-width row.
   - Choice rows (radio/checkbox): text left, control right and vertically centered (right-thumb reach).
   - Media + actions side by side (preview left, buttons and hint right) when it fits 360px.
   - Full width only for long text or selects with long options. A lone short field does not leave an empty grid cell on desktop: give it `full` or pair it.
   - Check 360 and 390 px; compare the height before and after.

## Scope

One component file plus matching CSS blocks. If the change needs a new stored value, switch to `persisted-field-change`. If it changes PDF or WhatsApp output, switch to `customer-output-change`.

## Must not

- Put price formulas or Supabase queries in components.
- Load all of `App.tsx`, `CatalogEditor.tsx`, `ItemForm.tsx`, or `index.css`.
- Split `App.tsx` for tidiness.
- Add a router, state library, or UI kit.
- Open `src/data/defaultLogo.ts` or seed JSON.

## Validate

- `npm run lint` and `npm run build` (runs `tsc -b`). Add `npm test` if any `src/domain/` file changed.
- Visual change: run `browser-check` at 390 px; also 360 px for tight rows (customer name + phone, catalog tables).
