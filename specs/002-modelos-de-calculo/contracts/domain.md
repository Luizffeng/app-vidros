# Contract: domain functions

Pure functions in `src/domain/`. `App.tsx` is the only UI caller (plus `ItemForm` preview for `priceItem`).

## `buildBreakdown(parts, mode?)` — `src/domain/pricing/math.ts`

```ts
buildBreakdown(
  parts: { labor; glass; aluminum; hardware; accessories; extras; markup },
  mode: MarginMode = 'empresa',
): CostBreakdown
```

- `empresa` output is byte-identical to today's (existing parity tests unchanged).
- Example parts `{ glass: 100, extras: 10, labor: 50, markup: 0.3, others 0 }`:
  - empresa → `finalPrice` 208, `marginAmount` 48
  - vendedor → `finalPrice` 193, `marginAmount` 33
  - autonomo → `finalPrice` 160, `marginAmount` 0

## `priceItem(catalog, input, mode?)` — `src/domain/pricing/index.ts`

```ts
priceItem(catalog: Catalog, input: ItemInput, mode: MarginMode = 'empresa'): PricingResult
```

- Pricers unchanged. The mode is applied once to the pricer result's breakdown parts.
- `custom` ignores the mode.
- Same BOM, labor and costs in every mode (FR-010); only `finalPrice`/margin fields differ.

## `addItem` / `updateItem` — `src/domain/quote.ts`

Gain a trailing `mode: MarginMode = 'empresa'` and forward it to `priceItem`.

## `createEmptyDraft(number, pricingVersion, mode?)`

Sets `quote.marginMode = mode` (default `'empresa'`).

## `draftOutdated(quote, catalog, mode)` — new

```ts
draftOutdated(
  quote: Quote,
  catalog: Catalog,
  mode: MarginMode,
): { catalog: boolean; margin: boolean } | null
```

- `null` for emitted quotes, drafts with only custom items (or no items), and up-to-date drafts.
- `catalog: true` when `quote.pricingVersion !== catalog.config.version`.
- `margin: true` when `(quote.marginMode ?? 'empresa') !== mode`.

## `repriceDraft(quote, catalog, mode)` — new

```ts
repriceDraft(quote: Quote, catalog: Catalog, mode: MarginMode): { quote: Quote; failed: number }
```

- Throws if `quote.status !== 'draft'`.
- Re-prices every non-custom item; on pricer error keeps the stored `result` and increments `failed`.
- Returns the quote with `marginMode = mode`, `pricingVersion = catalog.config.version`, totals recomputed.
- Additional costs and discounts untouched (never get margin).
- Called only from the editor's "Atualizar valores" button.

## Totals (unchanged `withTotals`)

`grandTotal = itemsTotal + additionalTotal − discountTotal` in every mode. Tests must cover a quote with labor, item extra, a Frete additional cost and a discount in all three modes (research R4a).

## `normalizeSettings` — `src/data/defaultSettings.ts`

Adds `marginMode` with default `'empresa'`.
