# DECISIONS

Only choices visible in code or in README / constitution / handoff. Not a changelog.

## Single shop, two roles, no public signup

- **Decision:** One establishment. Roles `admin` and `vendedor`. Users are created in the Supabase dashboard. Signup stays off outside the app.
- **Reason/evidence:** README “Não é SaaS”. Migration header and `handle_new_user` default `vendedor`. No signup call in `LoginScreen.tsx`. No company table.
- **Consequence:** Do not add tenants, billing, or open registration unless the product ask changes. New users are vendedores until SQL promotes them.
- **Under revision (2026-10-09):** the owner wants a SaaS (several shops, plans) that stays simple for non-technical users, and the `vendedor` role disabled until there is demand. Both change only through their own specs (backlog: "SaaS", "Login, contas e autorização"); until then this decision holds in code.

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

## Margin mode is a shop setting

- **Decision:** "Cálculo de margem" (`empresa` | `vendedor` | `autonomo`) lives in `AppSettings.marginMode`, default `empresa`. Each priced item stores `breakdown.marginMode`; each quote stores `marginMode`. Missing values mean `empresa`. `marginModeChangedAt` dates the draft banner.
- **Reason/evidence:** Spec `specs/002-modelos-de-calculo/`. Settings are already admin-only by RLS and stored as JSON, so no SQL migration.
- **Consequence:** Changing the mode never reprices drafts silently. Drafts show the "Atualizar valores" banner; emitted quotes keep their stored prices. Pricers stay mode-agnostic; `priceItem` applies the mode.

## Item cost lines and quote-only prices

- **Decision:** `BomLine` carries `unit`, `source` (catalog table + id) and `surcharge`; aluminum/hardware unit prices include the color surcharge, and each pricer adds one `mao_de_obra` line, so lines sum to the breakdown. Quote-only prices live in `Quote.priceOverrides` (JSON payload, no migration) and are applied through `withPriceOverrides` before pricing.
- **Reason/evidence:** Spec `specs/003-composicao-do-item/`. Owners check items line by line against the spreadsheet and need a one-off price without touching the catalog.
- **Labor:** the labor rate is per item (`ItemInput.laborRate`), not a quote override, because one catalog rate (Temperado) serves several kinds and the owner adjusts labor per job.
- **Consequence:** "Só neste orçamento" / "Só neste item" are gated in the UI only (it edits a draft the user can already edit). "Atualizar no catálogo" is gated by catalog RLS (admin write). Items saved before these fields show lines read-only until recalculated. Do not change breakdown math to fit the lines.

## Motion is CSS tokens plus one presence hook

- **Decision:** One duration/easing/distance scale in `:root`; overlays leave through `usePresence`; screens enter by `data-nav` on a keyed `.screen` root; sections use native `<details>` height transitions. Only opacity and transform. No animation library, no View Transitions API, no backdrop blur over scrolling content.
- **Reason/evidence:** Spec `specs/004-transicoes/` (research R1–R9): low-end phones, ≤ 2 KB budget, interaction never blocked (View Transitions blocks input during the snapshot). `scripts/motion-perf-browser.mjs` baseline vs after.
- **Consequence:** New animations reuse the tokens and the "Motion" block at the end of `index.css` and stay covered by its `prefers-reduced-motion` rule. Screen changes go through `navigate` in `App.tsx`. Do not transform `.shell` (it holds the fixed `.action-bar`).

## Spec Kit for larger features

- **Decision:** Larger features get a new spec under `specs/`. The old MVP spec `specs/001-mvp-orcamentos/` was removed. Day-to-day queue stays `BACKLOG.md`.
- **Reason/evidence:** Constitution “Development Workflow”. `BACKLOG.md` header. That spec was incomplete and described a remote adapter as future work after Supabase already existed.
- **Consequence:** Do not restore `001-mvp-orcamentos` or treat it as the source of truth. Small fixes do not need a spec.

## Docs-only pushes do not deploy

- **Decision:** A push that only touches markdown, `docs/`, `specs/`, `.specify/`, `.cursor/`, `.agents/`, or `assets/item-images/` does not deploy production.
- **Reason/evidence:** README deploy section. Production builds come from Cloudflare Pages on `main`, not from a GitHub Actions workflow (none is in the repo). Pages skips a build when every changed path matches Build watch path excludes, or when the commit message starts with `[CI Skip]`.
- **Consequence:** A commit that also changes app code still builds. The exclude list is a Pages project setting. It is not read from a file in git. Until that setting is saved in the dashboard, `[CI Skip]` is the skip that works.
