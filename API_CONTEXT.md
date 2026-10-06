# API_CONTEXT

This app does not expose an HTTP API. It is a static SPA that calls Supabase and ViaCEP from the browser.

## Style

- Supabase client (`@supabase/supabase-js`): PostgREST tables and one RPC. No GraphQL. No OpenAPI/Swagger file in the repo.
- ViaCEP: `GET https://viacep.com.br/ws/{8digits}/json/`.
- WhatsApp: `window.open('https://wa.me/?text=...')` when Web Share is missing or fails. `shareQuoteText` in `src/pdf/generateQuotePdf.ts`.

## Clients

| Call | File |
| --- | --- |
| Client singleton | `src/data/supabaseClient.ts` `getSupabase()` |
| Quotes, catalog, settings, logo, quote number | `src/data/supabaseRepository.ts` |
| Login, session, sign-out, `profiles` select | `src/auth/access.tsx`, `src/components/LoginScreen.tsx` |
| CEP | `src/data/viacep.ts` `lookupCep` |

There is no generated client and no DTO package. Request and response bodies are the TypeScript types in `src/domain/types.ts`, stored as `payload` JSON.

## Auth

Anon key only (`.env.example`, `src/vite-env.d.ts`). Session is Supabase Auth. Data calls rely on the user JWT and RLS. Repository maps Postgres `42501` or a row-level-security message to `Sem permissão para gravar.` (`fail()` in `supabaseRepository.ts`). Other errors throw `error.message`.

`next_quote_number` raises `sem sessão` if `auth.uid()` is null. It is `security definer` and granted to `authenticated`.

## Tables and RPC

Source of truth for the SQL contract: `supabase/migrations/20260924120000_init.sql`.

| Target | Operation |
| --- | --- |
| `quotes` | select/upsert/delete. Columns: `id`, `updated_at`, `payload`. |
| `catalog` | select/insert/upsert id `'current'`. |
| `settings` | select/insert/upsert id `'current'`. Columns include `logo_path`. |
| `profiles` | select own row (`id`, `role`) for the signed-in user. |
| `rpc('next_quote_number')` | returns `text`. |
| storage `logos` / `shop/logo.png` | upload, download, remove. |

`quote_counters` is not queried from the client. The RPC updates it.

## JSON contracts

- Quote document: `Quote` in `src/domain/types.ts`. Read path: `normalizeQuote`.
- Catalog document: `Catalog`. Read/write path: `normalizeCatalog` / `parseImportedCatalog` (`src/data/catalogItems.ts`).
- Settings document: `AppSettings` without `logoDataUrl` on the remote payload. Read path: `normalizeSettings`, then optional logo download.

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
- No server middleware and no custom error code enum beyond the RLS remap and thrown `Error` messages from domain/pricing.
