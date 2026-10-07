# Pricing

Owns item cost and sell price. Pure functions. No React, no fetch, no repository.

## Files

| File | Owns |
| --- | --- |
| `index.ts` | `priceItem` switch and `priceCustom`. |
| `math.ts` | `ceiling`, money round, catalog lookups, `buildBreakdown`, box span snap. |
| `box.ts` | Box only. |
| `correr.ts` | J2F, J4F, P2F, P4F. |
| `pivotante.ts` | Pivotante, including latch. |
| `maxiar.ts` | Maxim-ar. |
| `fixoEspelho.ts` | `priceFixo` and `priceEspelho`. |
| `pricing.test.ts` | Parity examples. Required when a formula changes. |

Inputs and `PricingConfig`: `src/domain/types.ts`. Human-readable rules: `BUSINESS_RULES.md` (pricing section).

## Boundaries

- Read `index.ts` plus the one pricer for the `kind` in the task. Do not open the other pricers.
- `buildBreakdown(parts, mode)` owns the margin rule (Empresa: margin on full cost; Vendedor: labor without margin; Autônomo: no margin). Pricers call it without a mode; `priceItem` re-applies the mode once. Do not change it unless the task is the margin model.
- Every BOM line has `unit` (`m2` | `m` | `un`), `source` (`{ table, id }` of the catalog row) and, when a color surcharge applies, `surcharge` with `unitPrice`/`total` already including it (`withSurcharge`). Each pricer pushes exactly one labor line (`laborLine`, category `mao_de_obra`). Line totals per group must equal the breakdown group; `pricing.test.ts` checks it. Box glass quantity is m².
- Quote-only prices are applied before pricing (`withPriceOverrides` in `src/domain/catalogEdit.ts`). Pricers never read `Quote`.
- Catalog rows are inputs. Inactive or missing codes throw from `math.ts`.
- UI percent fields live in `src/components/ItemForm.tsx`. This folder receives a fraction (`0.3`, not `30`).

## Skip unless needed

- `pricing.test.ts` when not changing a number or a formula.
- `src/data/seed/` except `config.json` when the question is the default rate table.
- Quote totals, emit, and PDF. Those are `src/domain/quote.ts` and `src/pdf/generateQuotePdf.ts`.
