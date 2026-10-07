# Research: Composição do custo do item

Phase 0 of `/speckit-plan`. Each entry: Decision / Rationale / Alternatives. Depends on spec 002 (`MarginMode`, `draftOutdated`, `repriceDraft`).

## Findings in today's code

- `BomLine` is `{ code, description, quantity, unitPrice, total, category }`. No unit, no catalog reference. Nothing outside `src/domain/pricing/` reads `bom` (PDF and share text do not), so enriching it has no customer-output impact.
- Color surcharge is applied to group totals (`aluminum = aluminumRaw × (1 + surcharge)`, same for hardware) in correr, pivotante and maxiar. BOM lines keep the raw price, so **today the line sum differs from the item cost** whenever the profile color has a surcharge.
- Box glass line: `quantity` = linear meters (fixed + moving), but `total` = quantity × height × valorM2. Quantity × unit ≠ total.
- Labor is only in `breakdown.labor`; there is no BOM line for it. Rates: `temperedPerM2 × área do vão` (correr, pivotante, fixo, espelho), `boxPerM2 × vão × altura` (box), `maxiarAvulso` (maxim-ar, per unit).
- Aluminum `valorMetro` is derived in `CatalogEditor` as `round2(valorBarra / metragemBarra)`.
- `quotes` RLS lets any authenticated user insert/update any quote payload (prices included). Only `catalog` and `settings` writes are admin-only.
- Parity references: J4F exists as `1950×754` (not 2000×1200 as written in the spec).

## R1. Enrich BOM lines in every pricer

- **Decision**: add optional fields to `BomLine`: `unit?: 'm2' | 'm' | 'un'`, `source?: CatalogRef`, `surcharge?: number`. Pricers fill them; aluminum/hardware lines carry `unitPrice` and `total` **with** the surcharge, plus `surcharge`. Box glass `quantity` becomes m² (linear × height). Each pricer appends one labor line (`category: 'mao_de_obra'`, `unit` m² or un, no `source`).
- **Rationale**: makes FR-001/002/003 and SC-001 (sum of lines = cost to the cent) true from the data itself; the modal only groups and renders. Breakdown math untouched (FR-008).
- **Guard**: new invariant test over every existing reference case: per group, `Σ line.total` = breakdown group (round to cents); `labor` line = `breakdown.labor`; every catalog line has `unit` and `source`. Existing `finalPrice`/cost assertions unchanged.
- **Alternatives**: build the composition outside the pricers by re-deriving quantities (duplicates formulas, drifts). Rejected.
- **Scope note**: touches all six pricers' BOM construction only. Pricing-change skill normally limits to one pricer; this feature is explicitly a BOM-shape change, guarded by parity + invariant tests.

## R2. Catalog reference

- **Decision**: `CatalogRef = { table: 'vidros' | 'kitBox' | 'acessorios' | 'aluminios'; id: number }`. Editable field per table: vidros `valorM2`, kitBox `valor`, acessorios `valor`, aluminios `valorBarra` (shown with "R$ X/m" hint; `valorMetro` re-derived with the same rounding as CatalogEditor).
- **Rationale**: `id` is stable across edits; `codigo` may repeat between tables. Editing the stored field avoids rounding drift between barra and metro.
- **Alternatives**: key by `codigo` (ambiguous across tables), edit `valorMetro` directly (fights the derived value). Rejected.

## R3. Preço próprio do orçamento ("Só neste orçamento")

- **Decision**: `Quote.priceOverrides?: PriceOverride[]` with `{ ref: CatalogRef; price: number }` (same field semantics as R2). Pure `withPriceOverrides(catalog, overrides): Catalog` returns a catalog copy with those prices replaced (missing/inactive rows ignored). `addItem`, `updateItem` and `repriceDraft` price against `withPriceOverrides(catalog, quote.priceOverrides)`.
  - Setting an override reprices only items whose BOM has that `ref` (FR-005: all items of this quote using the code). Removing ("Voltar ao preço do catálogo") does the same.
  - Override equal to the catalog price is dropped (spec edge case); checked when set and on `repriceDraft`.
  - Emitted keeps overrides; `createRevision` copies them (structuredClone) (FR-005b).
- **Rationale**: pricers stay unaware of overrides; one pure function; works for new items added later.
- **Alternatives**: patch line totals after pricing (breaks quantities × unit logic and color surcharge). Rejected.

## R4. "Atualizar no catálogo"

- **Decision**: admin only. Pure `setCatalogPrice(catalog, ref, price): Catalog` + `bumpCatalogVersion(version)` (moved from `CatalogEditor` to `src/domain/catalogEdit.ts`, editor imports it). `App` saves the catalog, then runs `repriceDraft` on the open draft (overrides kept). Other drafts get spec 002's banner because their `pricingVersion` is now old.
- **Rationale**: owner decision (spec 002/003, 2026-10-07): only the open draft changes immediately; others follow the "Atualizar valores" rule.

## R5. Permissions (FR-006)

- **Decision**: catalog write stays enforced by RLS (`catalog_update` uses `is_admin()`). "Só neste orçamento" is gated in the UI (`isAdmin`). No new SQL.
- **Rationale**: quote payloads are already client-trusted (any user can write any item price today); a trigger guarding only `priceOverrides` would add a migration without closing the real gap. Spec FR-006 wording updated to say the server rule covers the catalog.
- **Alternatives**: Postgres trigger rejecting `priceOverrides` changes by non-admins (breaks revisions created by vendedor that inherit overrides; partial protection). Rejected; logged as a future hardening item if the owner wants it.

## R6. Modal UX

- **Decision**: new `src/components/CostDetailModal.tsx`, opened by the "Detalhes do custo" button in the item block (replaces `<details>`). Uses the existing `.modal` pattern. Top: summary (groups, Custo, Margem per spec 002 mode, Preço). Below: lines grouped Vidro, Alumínio, Ferragem, Acessório, Mão de obra, each with total. Close restores scroll (no page jump: body not scrolled by the modal).
  - Admin + draft + line with active `source`: unit price is a button; tap opens inline money input with actions "Só neste orçamento", "Atualizar no catálogo", "Cancelar". "Atualizar no catálogo" opens `.remove-pop` confirmation with the spec text.
  - Lines with an override show the mark "preço deste orçamento" and, for admin in draft, "Voltar ao preço do catálogo".
  - Old lines (no `unit`/`source`) show what exists, read-only, with hint "Recalcule o item para editar".
  - Inactive/missing source: read-only with hint "Código desativado no catálogo".
- **Rationale**: owner chose the direct modal (2026-10-07); one place for summary and edits.

## R7. References for SC-002

- **Decision**: validate line by line against the existing J4F 1950×754 reference (already in `pricing.test.ts`). Spec text updated. If the owner has a 2000×1200 sheet, add it as an extra case.
