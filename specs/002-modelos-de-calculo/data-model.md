# Data Model: Cálculo de margem

All fields live inside existing JSON payloads (`settings.payload`, `quotes.payload`). No table or column changes.

## MarginMode

```ts
type MarginMode = 'empresa' | 'vendedor' | 'autonomo'
```

| Value | Nome na tela | Descrição na tela |
| --- | --- | --- |
| `empresa` | Margem integral | Margem sobre material, adicionais do item e mão de obra. |
| `vendedor` | Margem sobre material | Margem sobre material e adicionais do item. Mão de obra sem margem. |
| `autonomo` | Sem margem | Sem margem sobre os itens. A mão de obra é o lucro. |

Defined in `src/domain/types.ts`. Labels/descriptions live with the Settings UI.

## AppSettings (changed)

| Field | Type | Rule |
| --- | --- | --- |
| `marginMode` | `MarginMode` | Required after normalize. Missing or unknown value → `'empresa'` (FR-007). |

Writer: Settings screen, admin only (RLS `settings_update`). Change applies only on Salvar + confirm (FR-002, FR-003).

## Quote (changed)

| Field | Type | Rule |
| --- | --- | --- |
| `marginMode?` | `MarginMode` | Mode of the last full pricing. Absent = `'empresa'`. Set only by `createEmptyDraft` and `repriceDraft`. Frozen on emit (FR-006). Copied by `createRevision`. |
| `pricingVersion` | `string` (existing) | Catalog version of the last full pricing. Now also updated by `repriceDraft`. |

State rules:

- `draft` is **outdated** when `pricingVersion !== catalog.config.version` or `(marginMode ?? 'empresa') !== settings.marginMode`, and it has at least one catalog item. Outdated drafts show one info banner whose text names the cause (catalog, margin, or both); they change only when the user taps "Atualizar valores" (FR-005, FR-005a).
- `emitted`: never outdated, never repriced (constitution III).

## CostBreakdown (changed)

| Field | Type | Rule |
| --- | --- | --- |
| `marginMode?` | `MarginMode` | Mode used by `buildBreakdown`. Absent = `'empresa'`. |

Existing fields keep their meaning:

- `totalCost` = material + extras + labor (all modes).
- `finalPrice`, `marginAmount`, `marginPct` follow the mode table in `research.md` R2.
- `markup` = item's stored markup (kept even in Autônomo, where it is ignored).

Custom items (`priceCustom`): price = typed amount; `marginMode` not applied (spec edge case "Item avulso").

## Validation

- `normalizeSettings`: accept only the three literals; anything else → `'empresa'`.
- `normalizeQuote`: leave `marginMode` absent on old quotes (read as `'empresa'`); drop unknown values.
