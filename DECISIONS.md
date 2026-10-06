# DECISIONS

Only choices visible in code or in README / constitution / handoff. Not a changelog.

## Single shop, two roles, no public signup

- **Decision:** One establishment. Roles `admin` and `vendedor`. Users are created in the Supabase dashboard. Signup stays off outside the app.
- **Reason/evidence:** README “Não é SaaS”. Migration header and `handle_new_user` default `vendedor`. No signup call in `LoginScreen.tsx`. No company table.
- **Consequence:** Do not add tenants, billing, or open registration unless the product ask changes. New users are vendedores until SQL promotes them.

## Storage behind `QuoteRepository`

- **Decision:** UI and domain talk to `QuoteRepository`. `createRepository()` picks Supabase if both Vite env vars are non-empty, otherwise IndexedDB.
- **Reason/evidence:** `src/domain/types.ts`, `src/data/repository.ts`. Constitution principle IV. Handoff `docs/handoff-supabase-cloudflare.md`.
- **Consequence:** New persisted fields belong on the TypeScript model and both adapters. Do not call Supabase from `App.tsx`.

## Quotes, catalog, and settings are JSON documents

- **Decision:** Postgres stores `payload jsonb`. IndexedDB stores the same `Quote` / `Catalog` objects. Item kinds are not columns.
- **Reason/evidence:** Migration `quotes.payload`, `catalog.payload`, `settings.payload`. `SupabaseQuoteRepository` reads `payload` and runs `normalizeQuote`.
- **Consequence:** Shape changes need a normalizer for old rows, not a column migration, unless a value must be queried in SQL. Today only `updated_at` is a column used for order.

## Price once, store the snapshot

- **Decision:** `priceItem` is a pure function. The quote item keeps `input` and `result`. Emit does not recalculate.
- **Reason/evidence:** `addItem` / `updateItem` in `src/domain/quote.ts`. Constitution principles I and V.
- **Consequence:** Catalog edits do not change existing items. Repricing means running `updateItem` (or a new explicit migration). Pricing edits need parity tests.

## Spreadsheet is the formula reference, not a database

- **Decision:** No Google Sheets at runtime. Seed JSON in `src/data/seed/` is the initial catalog.
- **Reason/evidence:** README. Constitution principle I. `loadSeedCatalog`.
- **Consequence:** Do not add a Sheets client. Formula changes belong in `src/domain/pricing/` plus `pricing.test.ts`.

## Emitted quote is immutable; a change is a new revision

- **Decision:** Emit sets `status: 'emitted'`. The editor becomes read-only. `createRevision` clones a new draft with the same number and `revision + 1`.
- **Reason/evidence:** `emitQuote`, `createRevision`. `readOnly` in `App.tsx`. Constitution principle III.
- **Consequence:** Keep the old emitted row. Do not overwrite it in place. The database does not enforce this; the app must.

## Customer-facing output hides shop internals

- **Decision:** PDF and WhatsApp text show title, glass/profile spec, note, extras, and prices. They do not print `describeItem` size, BOM, cost, or margin.
- **Reason/evidence:** `quoteShareText` uses `describeItem` title/spec only. `generateQuotePdf` same. README feature list.
- **Consequence:** Internal measures stay on `ItemInput` for the editor and the pricers. Do not add them to the customer PDF without an explicit product change.

## Admin writes catalog and settings; vendedor does not

- **Decision:** RLS allows catalog/settings/logo writes only for `is_admin()`. UI hides Catálogo and Configurações when `role === 'vendedor'`.
- **Reason/evidence:** Migration policies. `AppHeader.tsx` menu omits Orçamentos/Catálogo/Configurações for vendedor. `App.tsx` `goSection` returns early. Handoff doc.
- **Consequence:** Hiding a button is not the security boundary. New admin-only writes need a policy, not only a `isAdmin` check.

## Anon key in the client; no service role

- **Decision:** The SPA uses the Supabase anon key. `service_role` is not referenced.
- **Reason/evidence:** `src/data/supabaseClient.ts`, `.env.example`, README deploy section.
- **Consequence:** Do not put the service role in Vite env. Privileged SQL stays in the dashboard or in `security definer` functions already in the migration.

## Quote numbers are allocated by the adapter

- **Decision:** Local sequence is IndexedDB meta `seq-{year}`. Remote sequence is `next_quote_number()` on `quote_counters`. Format `ORC-{year}-{n}` padded to 4 digits. Display to the client strips the `ORC-` prefix.
- **Reason/evidence:** `LocalQuoteRepository.nextQuoteNumber`, SQL function, `displayQuoteNumber` / `formatDisplayQuoteCode`.
- **Consequence:** Do not compute the next number in the UI. Customer copy and internal ids are different strings.

## Freight is a manual additional cost

- **Decision:** Freight is a regular additional cost the user types in (no fixed line since 2026-10). Automatic km pricing is not implemented.
- **Reason/evidence:** Owner request: fixed `Frete` R$ 0 row was noise. `dropEmptyFreight` cleans legacy drafts. `BACKLOG.md` lists km freight as later.
- **Consequence:** Do not invent a maps API. Do not reintroduce a fixed freight row unless the km backlog item is in scope.

## Spec Kit for larger features

- **Decision:** Larger features get a new spec under `specs/`. The old MVP spec `specs/001-mvp-orcamentos/` was removed. Day-to-day queue stays `BACKLOG.md`.
- **Reason/evidence:** Constitution “Development Workflow”. `BACKLOG.md` header. That spec was incomplete and described a remote adapter as future work after Supabase already existed.
- **Consequence:** Do not restore `001-mvp-orcamentos` or treat it as the source of truth. Small fixes do not need a spec.

## Docs-only pushes do not deploy

- **Decision:** A push that only touches markdown, `docs/`, `specs/`, `.specify/`, `.cursor/`, `.agents/`, or `assets/item-images/` does not deploy production.
- **Reason/evidence:** README deploy section. Production builds come from Cloudflare Pages on `main`, not from a GitHub Actions workflow (none is in the repo). Pages skips a build when every changed path matches Build watch path excludes, or when the commit message starts with `[CI Skip]`.
- **Consequence:** A commit that also changes app code still builds. The exclude list is a Pages project setting. It is not read from a file in git. Until that setting is saved in the dashboard, `[CI Skip]` is the skip that works.
