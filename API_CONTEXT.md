# API_CONTEXT

This app does not expose an HTTP API. It is a static SPA that calls Supabase and ViaCEP from the browser.

## Style

- Supabase client (`@supabase/supabase-js`): PostgREST tables and RPCs. No GraphQL. No OpenAPI/Swagger file in the repo.
- ViaCEP: `GET https://viacep.com.br/ws/{8digits}/json/`.
- WhatsApp: `window.open('https://wa.me/?text=...')` when Web Share is missing or fails. `shareQuoteText` in `src/pdf/generateQuotePdf.ts`.

## Clients

| Call | File |
| --- | --- |
| Client singleton | `src/data/supabaseClient.ts` `getSupabase()` |
| Quotes, catalog, settings, logo, quote number, quote photos | `src/data/supabaseRepository.ts` |
| Account, suggestions, delete account, marketing opt-in | `src/data/accountService.ts` |
| Login, sign-up, session, sign-out, account load | `src/auth/access.tsx`, `src/components/EntryScreen.tsx`, `src/components/AccountSetupScreen.tsx` |
| CEP | `src/data/viacep.ts` `lookupCep` |

There is no generated client and no DTO package. Request and response bodies are the TypeScript types in `src/domain/types.ts`, stored as `payload` JSON (except `accounts` / `suggestions` columns).

## Auth

Anon key only (`.env.example`, `src/vite-env.d.ts`). Session is Supabase Auth. Data calls rely on the user JWT and RLS. Repository maps write failures when the account cannot write to "Sua conta está em modo consulta. Nada foi gravado." (`supabaseRepository.ts`). Other errors throw `error.message`.

`next_quote_number` is per `account_id`, `security definer`, granted to `authenticated`. Account RPCs: `create_account`, `set_marketing_opt_in`, `delete_my_account` (see migration).

## Tables and RPC

Source of truth for SQL: `supabase/migrations/20260924120000_init.sql` then `supabase/migrations/20261010120000_accounts.sql` (and later migrations such as quote-photos). Operator snippets: `supabase/operator/*.sql`.

| Target | Operation |
| --- | --- |
| `accounts` | via RPCs / RLS (own row). Trial/paid/`disabled_at`. |
| `quotes` | select/upsert/delete. Columns include `account_id`, `id`, `updated_at`, `payload`. |
| `catalog` | select/upsert on `account_id`. |
| `settings` | select/upsert on `account_id`. Columns include `logo_path`. |
| `profiles` | select own row (`id`, `role`, `account_id`). |
| `suggestions` | select/insert own account; operator updates replies. |
| `rpc('next_quote_number')` | returns `text` for the current account. |
| `rpc('create_account')` / `set_marketing_opt_in` / `delete_my_account` | account lifecycle. |
| storage `logos` / `{account_id}/logo.png` | upload, download, remove. |
| storage `quote-photos` / `{account_id}/{photo_id}.jpg` | quote evidence photos (spec 009). |

`quote_counters` is not queried from the client. The RPC updates it per account.

## JSON contracts

- Quote document: `Quote` in `src/domain/types.ts`. Read path: `normalizeQuote`.
- Catalog document: `Catalog`. Read/write path: `normalizeCatalog` / `parseImportedCatalog` (`src/data/catalogItems.ts`). Example rows may carry `exemplo: true` (spec 007).
- Settings document: `AppSettings` without `logoDataUrl` on the remote payload. Read path: `normalizeSettings`, then optional logo download. May include `onboardingDismissedAt`.

Changing a field:

1. Update `src/domain/types.ts`.
2. Accept old rows in the matching `normalize*` function.
3. If both adapters persist it, update `LocalQuoteRepository` and `SupabaseQuoteRepository` only when storage shape changes (logo is the existing special case).
4. Add or adjust a unit test near the normalizer or domain function.
5. Add a SQL migration only if RLS, a column, or an RPC must change. JSON-only fields do not need a new column.

Do not invent a parallel schema file. The migration plus `types.ts` are the contract.

## ViaCEP

`ViaCepResult` is declared in `src/data/viacep.ts`. `erro: true` becomes `null`. Non-OK HTTP throws `Falha ao consultar CEP`. Callers: customer block in `App.tsx`, establishment tab in `SettingsEditor.tsx`.

## Not present

- No OpenAPI, GraphQL, tRPC, or Zod schema layer.
- No server middleware and no custom error code enum beyond the write-gate remap and thrown `Error` messages from domain/pricing.
- Phase 1: no billing provider in the app (phase 2).
