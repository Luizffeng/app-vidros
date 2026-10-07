# Data Model: Composição do custo do item

All fields live inside existing JSON payloads (`quotes.payload`, `catalog.payload`). No table or column changes.

## CatalogRef (new)

```ts
type CatalogTable = 'vidros' | 'kitBox' | 'acessorios' | 'aluminios'
interface CatalogRef { table: CatalogTable; id: number }
```

Editable price field per table (also the meaning of `PriceOverride.price`):

| table | field | shown as |
| --- | --- | --- |
| vidros | `valorM2` | R$/m² |
| kitBox | `valor` | R$/un |
| acessorios | `valor` | R$/un |
| aluminios | `valorBarra` | R$/barra, with derived R$/m hint |

## BomLine (changed)

| Field | Type | Rule |
| --- | --- | --- |
| `code`, `description`, `quantity`, `unitPrice`, `total` | existing | `unitPrice` and `total` now include the color surcharge when there is one. Box glass `quantity` in m². |
| `category` | `'vidro' \| 'aluminio' \| 'ferragem' \| 'acessorio' \| 'mao_de_obra' \| 'outro'` | `mao_de_obra` new: one labor line per catalog item. |
| `unit?` | `'m2' \| 'm' \| 'un'` | New items always set; old items absent. |
| `source?` | `CatalogRef` | Set on every catalog-priced line; absent on labor, custom, old items. |
| `surcharge?` | `number` | Fraction applied (e.g. 0.1). Absent or 0 = none. Base price = `unitPrice / (1 + surcharge)`. |

Invariant (tested for every reference case): for each group, `Σ total` = matching breakdown field (cents); labor line total = `breakdown.labor`.

Editable line = quote is draft, user is admin, line has `source`, and the source row exists and is active.

## PriceOverride (new) and Quote (changed)

```ts
interface PriceOverride { ref: CatalogRef; price: number }
```

| Quote field | Type | Rule |
| --- | --- | --- |
| `priceOverrides?` | `PriceOverride[]` | At most one per `ref`. `price ≥ 0`. Dropped when equal to the catalog price. Kept on emit; copied to revisions. |

Normalization (`normalizeQuote`): drop malformed entries (unknown table, non-integer id, negative/NaN price), dedupe by ref (last wins).

## Catalog (unchanged shape)

"Atualizar no catálogo" writes the field from the table above and bumps `config.version` (`bumpCatalogVersion`). For aluminios, `valorMetro` is re-derived as `round2(valorBarra / metragemBarra)`.

## State rules

- Draft: overrides apply to every item using the ref (existing and future).
- Emitted: composition and overrides read-only.
- Old item (lines without `unit`/`source`): read-only until the item is recalculated (edit item or "Atualizar valores").
