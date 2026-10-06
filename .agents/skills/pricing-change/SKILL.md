---
name: pricing-change
description: Use when a task changes the price, BOM line, rounding, minimum area, labor, or surcharge that `priceItem` returns for one or more product kinds.
---

# Pricing change

## When to use

- A formula, quantity, rounding step, catalog lookup, or labor/surcharge use changes in `src/domain/pricing/`.
- A user reports a price that differs from the spreadsheet for a specific item.

Not this skill:

- Markup/margin model (`buildBreakdown`). That is a product decision (see `BACKLOG.md` "Modelos de cálculo"). Ask first.
- Only catalog prices or seed rates change. That is data, not a formula.
- A new stored field on `PricingConfig` or `ItemInput`. Use `persisted-field-change` for the field, then come back here for the formula.
- Percent inputs in the item modal. Use `ui-change`.

## Read first

1. `src/domain/pricing/AGENTS.md` (file map and boundaries).
2. `BUSINESS_RULES.md`, section "Pricing rules that the pricers implement": only the bullet for the target kind.
3. The input type for the kind: `rg -n "interface \w+Input|PricingConfig" src/domain/types.ts`, then read only that block.

## Steps

1. Map the kind to one file: box `box.ts`; J2F/J4F/P2F/P4F `correr.ts`; pivotante `pivotante.ts`; maxim-ar `maxiar.ts`; fixo/espelho `fixoEspelho.ts`; custom `priceCustom` in `index.ts`.
2. Read `index.ts` (dispatch) and that one pricer. Open `math.ts` only for helpers the pricer calls (`ceiling`, `roundUp`, `find*`, `buildBreakdown`).
3. Baseline: `npx vitest run src/domain/pricing/pricing.test.ts`.
4. Find the kind's tests: `rg -n "it\(" src/domain/pricing/pricing.test.ts`. Cases are named `calc_<KIND> <size> <glass> <color>` after spreadsheet examples. Read only the matching cases.
5. Add or update a parity case first, using a reference value from the user or the spreadsheet (expected `finalPrice`, cost, or the BOM line that changes). If no reference exists, ask for one rather than inventing the expected number.
6. Make the smallest formula edit. Rates, codes, and surcharges come from `catalog.config` and catalog rows. If a new constant is needed, ask whether it belongs in `PricingConfig`.
7. If other existing parity cases change value, stop and confirm with the user before updating them.
8. If the rule text changed, update the one bullet in `BUSINESS_RULES.md`.

## Scope

- One pricer, maybe one helper in `math.ts`, `pricing.test.ts`, one `BUSINESS_RULES.md` bullet.
- Saved quotes keep their stored `result`. Only new or re-saved items get the new price. Do not reprice existing quotes unless asked.

## Must not

- Open the other pricers, `App.tsx`, the PDF module, or seed JSON other than `src/data/seed/config.json` (default rates).
- Restyle, rename, or "clean up" formulas outside the requested change.
- Hardcode prices, labor rates, or color percentages.
- Change markup-on-full-cost in `buildBreakdown`.
- Wire `labor.boxAvulso` into `priceBox` without an explicit ask (known unused config).
- Move any formula into `src/components/`.

## Validate

- `npx vitest run src/domain/pricing/pricing.test.ts`, then `npm test`.
- `npm run lint` and `npm run build`.
- Report the old and new value for the reference input.
