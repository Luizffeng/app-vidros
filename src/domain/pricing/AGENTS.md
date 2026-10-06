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
- Do not change `buildBreakdown` (markup on full cost) unless the task is the margin model.
- Catalog rows are inputs. Inactive or missing codes throw from `math.ts`.
- UI percent fields live in `src/components/ItemForm.tsx`. This folder receives a fraction (`0.3`, not `30`).

## Skip unless needed

- `pricing.test.ts` when not changing a number or a formula.
- `src/data/seed/` except `config.json` when the question is the default rate table.
- Quote totals, emit, and PDF. Those are `src/domain/quote.ts` and `src/pdf/generateQuotePdf.ts`.
