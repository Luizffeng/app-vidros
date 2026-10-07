# Research: Cálculo de margem

Phase 0 of `/speckit-plan`. Each entry: Decision / Rationale / Alternatives.

## R1. Where the mode is stored

- **Decision**: `AppSettings.marginMode` (`'empresa' | 'vendedor' | 'autonomo'`), default `'empresa'` in `normalizeSettings`.
- **Rationale**: the spec puts the control in Configurações › Orçamento, which already saves `AppSettings` with one Salvar button. The `settings` table is a JSON payload with admin-only insert/update RLS (`settings_insert`, `settings_update` use `public.is_admin()`), so FR-009 is enforced server-side with no new SQL.
- **Alternatives**:
  - `PricingConfig.marginMode` (catalog). Keeps `priceItem(catalog, input)` unchanged and rides the catalog version, but Settings would have to write the catalog, and importing a catalog JSON would silently change the store's mode. Rejected.
  - New SQL column. Not needed: nothing queries the mode in SQL (persisted-field-change skill: no column for payload-only data).

## R2. Where the formula lives

- **Decision**: `buildBreakdown(parts, mode = 'empresa')` in `src/domain/pricing/math.ts` computes all three modes. `priceItem(catalog, input, mode = 'empresa')` re-applies the mode once on the pricer's result (`applyMarginMode(result, mode)`), so the six pricers stay untouched.
- **Rationale**: one place for the margin rule; FR-010 (per-kind math unchanged) is structural, not just tested. Default `'empresa'` keeps every existing call and parity test identical.
- **Alternatives**: pass `mode` into each pricer (six edits, violates the pricing-change "one pricer" scope). Rejected.

Formulas (material = glass + aluminum + hardware + accessories; extras = item extras; m = item markup):

| Mode | finalPrice | marginAmount |
| --- | --- | --- |
| empresa | (material + extras + labor) × (1 + m) | (material + extras + labor) × m |
| vendedor | (material + extras) × (1 + m) + labor | (material + extras) × m |
| autonomo | material + extras + labor | 0 |

`totalCost` stays material + extras + labor in all modes. `marginPct = marginAmount / finalPrice` (0 when finalPrice is 0). Autônomo keeps the item's stored `markup` but ignores it, so switching back restores the old margin. Quote additional costs and discounts are outside `buildBreakdown`: `grandTotal = itemsTotal + additionalTotal − discountTotal` in every mode (unchanged `withTotals`).

## R3. What the quote records (FR-006)

- **Decision**: `Quote.marginMode?` and `CostBreakdown.marginMode?`. Absent means `'empresa'` (every quote before this feature was priced that way).
- **Rationale**: quote-level value answers "which mode priced this draft" cheaply (`draftOutdated`). Breakdown-level value lets the cost detail label the margin line without reaching for the quote, and survives in emitted items.
- **Alternatives**: quote-only (cost detail would need the quote passed down); breakdown-only (mismatch check would scan items). Both workable; keeping both is two optional fields with one writer (`priceItem` / `repriceDraft`).

## R4. Outdated drafts (FR-005, FR-005a)

- **Decision**: drafts are never repriced automatically. Two pure functions in `src/domain/quote.ts`:
  - `draftOutdated(quote, catalog, mode): { catalog: boolean; margin: boolean } | null`: `null` unless `quote.status === 'draft'`, the quote has at least one catalog item and at least one flag is true. `catalog` = `quote.pricingVersion !== catalog.config.version`; `margin` = `(quote.marginMode ?? 'empresa') !== mode`. The flags pick the banner text (catalog only, margin only, both in one sentence).
  - `repriceDraft(quote, catalog, mode): { quote, failed }`: re-runs `priceItem` for each non-custom item with the current catalog and mode; an item whose catalog row is gone or inactive keeps its stored `result` and counts as `failed`. Sets `marginMode = mode`, `pricingVersion = catalog.config.version`, recomputes totals.
  - The editor shows one info banner when `draftOutdated` is not null; "Atualizar valores" calls `repriceDraft` and persists. Owner 2026-10-07: text must say what changed; both changes share one message (one button, no stacked banners).
- **Rationale**: owner decision 2026-10-07. Repricing necessarily uses today's catalog, so it also pulls catalog price changes into an already-negotiated draft; the seller decides when. One mechanism covers both mode changes and catalog saves. `pricingVersion` already exists on every quote and was never compared, so old drafts start showing the banner after the next catalog save (intended).
- **Mixed drafts**: adding or editing an item in an outdated draft prices that item with the current catalog and mode (today's behavior for catalog). The banner stays until the user updates. The quote's `marginMode`/`pricingVersion` change only through `repriceDraft` (and `createEmptyDraft`).
- **Alternatives**:
  - Batch reprice all drafts on settings save. Rejected by the owner (silent price changes).
  - Reprice silently on open. Same problem.

## R4a. Test coverage for the full quote (SC-001)

- **Decision**: two layers.
  - `pricing.test.ts`: `buildBreakdown` with fixed parts (glass 100, extras 10, labor 50, markup 0.3) for each mode: 208 / 193 / 160 and margin amounts 48 / 33 / 0.
  - `quote.test.ts`: one real catalog item (espelho) with an item extra, a Frete additional cost of 40 and a discount of 20, built through `createEmptyDraft` + `addItem` + `setAdditionalCosts` + `setDiscounts` in each mode. Assert per mode: item `finalPrice` from its own breakdown parts follows the mode formula (labor and item extra included); `additionalTotal` = 40 and `discountTotal` = 20 in every mode; `grandTotal = itemsTotal + 40 − 20`; and the cross-mode check `empresa.itemsTotal − vendedor.itemsTotal = labor × markup`, `vendedor.itemsTotal − autonomo.itemsTotal = (material + extra) × markup`.
- **Rationale**: owner asked that price tests include labor, item values, item extras, quote additional costs and discount, and prove margin never touches additional costs or the discount. Fixed numbers pin the formula; the real-item case proves the wiring through `addItem` and totals.

## R5. Confirmation UI (FR-003)

- **Decision**: reuse the `.remove-pop` pattern (same as "Excluir rascunho?") anchored to the Settings action bar Salvar button, `role="alertdialog"`, text from US2, buttons Sim / Não. Shown only when `draft.marginMode !== settings.marginMode`. Confirm only saves settings; no quote is touched.
- **Rationale**: owner asked for the existing delete-draft component style; no new modal component.

## R6. Hiding margin in Autônomo (FR-008)

- **Decision**: pass `marginMode` as a prop to `ItemForm` (hide "Margem (%)" field and preview margin line), `CatalogEditor` (hide "Margem padrão" block in "Mão de obra / margem"), and the item cost detail in `App` (hide margin line; Vendedor label adds "· sem mão de obra").
- **Rationale**: props from `App`, which already owns `settings`. No context needed.

## R7. Migration and docs

- **Decision**: no SQL migration. Update `BUSINESS_RULES.md` (margin rule), `DECISIONS.md` (mode in settings, drafts follow mode/catalog), and the pricing-change skill line that forbids changing markup-on-full-cost (now a decided product rule with three modes).
