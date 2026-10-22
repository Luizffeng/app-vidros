# Architecture

Single-page app. Domain functions are pure. Persistence is one interface with two adapters. The database stores quote/catalog/settings as JSON, not as normalized item tables.

```
main.tsx
  AccessProvider          supabase session + profiles.role, or local passthrough
    App.tsx               renders the route's screen, calls repo + domain
      nav/navigator       URL <-> screen, history entries for screens and overlays
      domain/quote.ts     totals, emit, revision, share text
      domain/pricing      priceItem(catalog, input) -> PricingResult
      pdf/generateQuotePdf
      QuoteRepository
        LocalQuoteRepository      IndexedDB "forte-vidros"
        SupabaseQuoteRepository   quotes/catalog/settings JSONB + storage logo
```

## Modules

- **UI** (`src/components/`): Início, list, editor, catalog, settings. `App.tsx` owns quote state and is the only component that calls `createRepository()`.
- **Navigation** (`src/nav/`): `routes.ts` parses/formats paths (`/`, `/orcamentos?filtro=&busca=`, `/orcamentos/:id`, `/catalogo/:tab`, `/configuracoes/:tab`). `navigator.ts` keeps `history` in step: `push`/`replace` for screens, `goTop` from the menu and tiles (back to Início, then push), `up` for the header arrow, `pushLayer` for overlays, `addGuard` for unsaved editors. Each entry's state is `{app, idx, layer?}`; the path stack is in sessionStorage. A fresh deep link becomes Início → parents → screen. Overlay pops caused by the app's own `history.back()` are counted and ignored.
- **Domain** (`src/domain/`): no fetch, no DOM. `types.ts` is the contract. `quote.ts` mutates quote snapshots. `pricing/` prices one item.
- **Data** (`src/data/`): adapters, seed load, catalog/settings normalize, CEP, logo resize.
- **Auth** (`src/auth/access.tsx`): blocks the tree until login when a Supabase client exists.
- **SQL** (`supabase/migrations/20260924120000_init.sql`): one migration. Quotes are `id` + `updated_at` + `payload jsonb`.

## Data flow

1. Boot loads catalog, settings, and quote list through the repository, then renders the screen in the URL (Início by default). `/orcamentos/:id` loads that quote; unknown id goes to the list with a notice.
2. New draft: `nextQuoteNumber()` then `createEmptyDraft` (`src/domain/quote.ts`). Number shape `ORC-{year}-{seq}` is produced by the adapter, not by the domain.
3. Add/edit item: `addItem` / `updateItem` call `priceItem` and store both `input` and `result` on the item.
4. `persist` in `App.tsx` updates React state immediately, then `saveQuote` on a queue so an older save cannot finish last.
5. Emit copies status, `emittedAt`, and `validUntil` onto the same record. Later edits of an emitted quote are blocked in the UI (`readOnly`), not by the repository.
6. Revision: `createRevision` clones into a new id, same `number`, `revision + 1`, `status: draft`, `parentId` = existing `parentId` or the source id.

Catalog edits do not reprice saved items. A draft item reprices only when that item is saved again through `updateItem`.

## Auth flow

`getSupabase()` returns null without both env vars. Then `AccessProvider` uses role `local`, a stub active `Account`, and renders `App` with no login. `App` treats every role except `vendedor` as admin (`isAdmin`), so local mode sees Catálogo and Configurações.

With env: `EntryScreen` (sign up / sign in, Google when enabled) then `AccountSetupScreen` if the user has no `accounts` row. `AccessProvider` loads `getMyAccount()`, derives `accountState` (trial/active/expired/disabled, `canWrite`). New auth users get `profiles.role = admin` (`handle_new_user` in the accounts migration). Phase 1 keeps the UI on admin paths; `vendedor` stays dormant until multi-user ships.

RLS (accounts migration): rows are scoped by `account_id` = `current_account_id()`. Writes also require `account_can_write()` (trial or paid). Catalog/settings/logo still require admin role policies where defined. Expired accounts can read and resend emitted quotes; `App.tsx` `blocked()` opens `ExpiredNotice` before writes.

## API / integration flow

Browser calls Supabase with the anon key (`src/data/supabaseClient.ts`). Repository methods map to `from('quotes'|'catalog'|'settings')` and `rpc('next_quote_number')` (per account). Account/suggestions go through `AccountService` (`create_account`, `set_marketing_opt_in`, `delete_my_account`, `suggestions` table). Logo file is `logos/{account_id}/logo.png`; the settings row keeps `logo_path` and the payload omits the data URL. Reads turn the file back into a data URL because the PDF path expects one.

ViaCEP is a direct `fetch` in `src/data/viacep.ts` (customer form and settings). WhatsApp is `https://wa.me/?text=` after Web Share, in `shareQuoteText` (`src/pdf/generateQuotePdf.ts`). No Google Sheets at runtime.

## External services

| Service | Use |
| --- | --- |
| Supabase Auth | E-mail/senha + Google (optional). Sign up in the app. |
| Supabase Postgres | `accounts`, JSON documents + per-account `quote_counters`, suggestions. |
| Supabase Storage | Private buckets `logos`, `quote-photos`. |
| ViaCEP | Address from CEP. |
| Cloudflare Pages | Static `dist/`. Project `appvidros`. |
| WhatsApp | Share link + support `wa.me`. No Business API. |
| Asaas (future phase 2) | Not in phase 1. |

## Boundaries

- Domain must not import `src/data` except types that already live in `src/domain/types.ts`. Today `quote.ts` does not import the repository.
- UI must not contain price formulas. Item forms call domain functions.
- Do not add a second persistence path. Extend `QuoteRepository` and both adapters.
- Postgres does not recompute price and does not know item kinds.
- `pricingVersion` on a quote is the catalog version string at draft creation. It is not a foreign key.

## Patterns in use

- Repository interface (`QuoteRepository`).
- Pure pricing + stored snapshot (`QuoteItem.result`).
- JSON document store (IndexedDB and Postgres).
- Normalize on read: `normalizeQuote`, `normalizeCatalog`, `normalizeSettings`.
- Markup is a fraction (`0.3` = 30%). UI percent fields divide by 100 in `ItemForm.tsx`.
- Excel-like `ceiling` / `roundUp` in `src/domain/pricing/math.ts`.

## Debt and unusual patterns

- `App.tsx` (~1666 lines) holds list, editor, customer, costs, discounts, share modal, and icons. Search by function name.
- `labor.boxAvulso` is in `PricingConfig`, seed, and the catalog UI. `priceBox` does not read it.
- Emitted-quote immutability and “only drafts delete” are UI/domain checks. `deleteQuote` / `saveQuote` and quote RLS do not check `status`.
- Local and remote stores do not sync. Env on means Supabase only.
- IndexedDB name is `forte-vidros`. Renaming it hides existing local data (`repository.ts`).
- `assets/item-images/` is not referenced from `src/`. Whether a screen should show those SVGs is not decided in code.
- `.specify/memory/constitution.md` principle IV still says the remote adapter is future. The adapter exists. The same file says customer fields are optional to emit; `emitQuote` requires a customer name. The old MVP spec that repeated the stale plan was removed.
- `src/data/defaultLogo.ts` is a base64 PNG. `resolveStoredLogo` also special-cases one legacy white logo by length and a substring.
