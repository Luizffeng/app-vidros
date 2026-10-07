# Contract: domain functions

Pure. Builds on spec 002 (`priceItem(catalog, input, mode)`, `repriceDraft`).

## Pricers (`src/domain/pricing/*.ts`)

- Return the enriched BOM described in `data-model.md` (unit, source, surcharge, labor line, box glass in m²).
- `breakdown` values unchanged for every input (existing parity tests untouched).

## `src/domain/catalogEdit.ts` (new)

```ts
bumpCatalogVersion(current: string): string           // moved from CatalogEditor, same behavior
aluminioValorMetro(valorBarra: number, metragem: number): number  // round2(barra / metragem), shared with CatalogEditor
catalogPrice(catalog: Catalog, ref: CatalogRef): number | null    // null if row missing or inactive
setCatalogPrice(catalog: Catalog, ref: CatalogRef, price: number): Catalog // new object; aluminios re-derive valorMetro; no version bump
withPriceOverrides(catalog: Catalog, overrides?: PriceOverride[]): Catalog // copy with overridden prices; ignores missing/inactive rows
```

## `src/domain/quote.ts`

```ts
setPriceOverride(quote, catalog, ref, price: number | null, mode): Quote
```

- Draft only (throws otherwise).
- `price === null` or equal to `catalogPrice(catalog, ref)` removes the override.
- Reprices only items whose BOM contains `ref`, against `withPriceOverrides(catalog, next.priceOverrides)` and `mode`. Totals recomputed.

Existing functions:

- `addItem`, `updateItem`: price against `withPriceOverrides(catalog, quote.priceOverrides)`.
- `repriceDraft` (spec 002): same, and drops overrides now equal to the catalog price.
- `createRevision`: keeps `priceOverrides` (already via structuredClone; add test).

## Composition view model (`src/domain/costComposition.ts`, new)

```ts
composeCost(item: QuoteItem, quote: Quote, catalog: Catalog, opts: { isAdmin: boolean }): {
  groups: Array<{ category; label; total; lines: Array<BomLine & {
    editable: boolean
    overridden: boolean
    blockedReason?: 'old-item' | 'inactive' | 'labor' | 'readonly'
    basePrice?: number      // without surcharge, for editing
  }> }>
  totalCost: number
}
```

- Group order: Vidro, Alumínio, Ferragem, Acessório, Mão de obra (empty groups omitted).
- Item extras are not BOM lines; the summary shows them as today.
