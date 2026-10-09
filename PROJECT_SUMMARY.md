# PROJECT_SUMMARY

Compressed context. Open code only after this file points at a path.

## Purpose

Web app for one glass shop to price measured openings, save a draft, emit an immutable quote, and send a customer PDF or WhatsApp text. Shop identity (name, logo, validity) is settings, not a multi-tenant model. Forte Vidros is the default establishment in `src/data/defaultSettings.ts`.

## User-facing capabilities

- Início: banner carousel and tiles per module with what needs attention.
- One URL per screen; device back closes the open window, then goes back one screen. Unsaved item input survives as an item draft.
- Quote list with search and filter Todos / Emitidos / Rascunhos.
- Draft items: box, correr (J2F, J4F, P2F, P4F), pivotante, maxim-ar, vidro fixo, espelho, or free-text (`custom`).
- Per-item extras, quote-level additional costs (freight typed as one), discounts, per-item markup.
- Customer CEP lookup (ViaCEP). Name required to emit.
- Emit locks the quote in the UI. Changes go through a new revision (`ORC-2026-0001` revision 2 displays to the client as `2026-0001-2`).
- Delete draft only (UI). Emitted quotes stay.
- Customer PDF and share text omit internal measures, cost, and margin. Logo and validity are included.
- Catalog CRUD, activate/deactivate, JSON export/import (admin).
- Settings: establishment, validity days, WhatsApp CTA, logo (admin).

## Modules

| Module | Path | Notes |
| --- | --- | --- |
| Shell / quotes UI | `src/components/App.tsx` | Screen per route and persist queue. |
| Navigation | `src/nav/` | Routes, history, back layers, leave guards. |
| Início | `src/components/HomeScreen.tsx` | Tiles from `src/domain/home.ts`, banners from `src/data/banners.ts`. |
| Item form | `src/components/ItemForm.tsx` | Inputs per `ProductKind`. |
| Catalog | `src/components/CatalogEditor.tsx` | Bumps `config.version` on save. |
| Settings | `src/components/SettingsEditor.tsx` | Tabs: establishment, quote, logo. |
| Pricing | `src/domain/pricing/` | One file per family. |
| Quote rules | `src/domain/quote.ts` | Totals, emit, revision, share text. |
| Labels | `src/domain/itemDescription.ts` | Title/spec/size. PDF and WhatsApp use title + spec, not size. |
| Persistence | `src/data/repository.ts`, `supabaseRepository.ts` | |
| Auth | `src/auth/access.tsx` | |
| PDF | `src/pdf/generateQuotePdf.ts` | |
| Schema | `supabase/migrations/20260924120000_init.sql` | |

## Integrations

Supabase (Auth, Postgres, Storage), ViaCEP, WhatsApp web link, Cloudflare Pages. Details: [API_CONTEXT.md](API_CONTEXT.md).

## Entities

Defined in `src/domain/types.ts`.

| Type | Meaning |
| --- | --- |
| `Quote` | `draft` or `emitted`. Number, revision, `parentId`, customer, items, costs, discounts, totals, `pricingVersion`. |
| `QuoteItem` | `input` + priced `result` (BOM and breakdown). |
| `ItemInput` | Discriminated union on `kind`. |
| `Catalog` | `config`, `vidros`, `kitBox`, `acessorios`, `aluminios`. |
| `PricingConfig` | Colors, labor rates, box height, default markups, version string. |
| `AppSettings` | Validity days, establishment, `logoDataUrl`, `shareCta`. |
| `AccessRole` | `local` \| `admin` \| `vendedor` (`src/auth/access.tsx`). |

Postgres tables: `profiles`, `quotes`, `catalog`, `settings`, `quote_counters`. Catalog and settings ids are fixed `'current'`.

## Entry points

`src/main.tsx` → `AccessProvider` → `App`. Repository factory: `createRepository()` in `src/data/repository.ts`.

## Where to look

| Task | Inspect |
| --- | --- |
| Authentication / roles | `src/auth/access.tsx`, `src/components/LoginScreen.tsx`, RLS in `supabase/migrations/20260924120000_init.sql` |
| API / Supabase integration | `src/data/supabaseClient.ts`, `src/data/supabaseRepository.ts`, [API_CONTEXT.md](API_CONTEXT.md) |
| Quote list or editor UI | `src/components/App.tsx` (search the handler). Header/nav menu: `AppHeader.tsx`. Local map: `src/components/AGENTS.md` |
| Item fields / markup input | `src/components/ItemForm.tsx` |
| Pricing formula | `src/domain/pricing/index.ts` then the one pricer. Local map: `src/domain/pricing/AGENTS.md`. Tests: `pricing.test.ts` |
| Emit, revision, totals, WhatsApp text | `src/domain/quote.ts` |
| PDF contents | `src/pdf/generateQuotePdf.ts` |
| Catalog import/export | `src/data/catalogItems.ts`, `src/components/CatalogEditor.tsx` |
| Settings / logo | `src/components/SettingsEditor.tsx`, `src/data/logo.ts`, `src/data/defaultSettings.ts`. Do not open `defaultLogo.ts` |
| Database / RLS | `supabase/migrations/20260924120000_init.sql` |
| CEP / phone / UF | `src/data/viacep.ts`, `src/domain/brazil.ts` |
| Seed prices | `src/data/seed/` and `src/data/seedCatalog.ts` |
| Diagram SVGs | `assets/item-images/README.md`, `.cursor/agents/item-diagram-svg.md` |
| Product backlog | `BACKLOG.md` |
| Deploy | `README.md` (Supabase + Cloudflare). Historical handoff: `docs/handoff-supabase-cloudflare.md` |

Rules with code locations: [BUSINESS_RULES.md](BUSINESS_RULES.md). Layering: [ARCHITECTURE.md](ARCHITECTURE.md).
