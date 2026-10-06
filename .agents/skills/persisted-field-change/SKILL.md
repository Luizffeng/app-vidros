---
name: persisted-field-change
description: Use when adding or changing a stored field on Quote, QuoteItem/ItemInput, Catalog, PricingConfig, or AppSettings, adding a repository method, or adding a write that needs Supabase SQL/RLS.
---

# Persisted field change

## When to use

- A new value must survive reload: item note, customer field, settings option, catalog column, config rate.
- A `QuoteRepository` method is added or changed.
- A new admin-only write, table, column, RPC, or storage path is needed.

## Read first

1. `API_CONTEXT.md`, sections "JSON contracts" and "Changing a field". That list is the procedure contract; this skill adds file locations and checks.
2. `DECISIONS.md`: "Quotes, catalog, and settings are JSON documents". Add "Admin writes catalog and settings" only if permissions are involved.
3. The target type only: `rg -n "export (interface|type) (Quote|QuoteItem|ItemInput|Catalog|PricingConfig|AppSettings)\b" src/domain/types.ts`.

## Steps

1. Add the field to the type in `src/domain/types.ts`. Old rows will not have it: make it optional or give it a default in the normalizer.
2. Accept old rows in the matching normalizer:
   - Quote/items: `normalizeQuote` in `src/domain/quote.ts`.
   - Catalog/config: `normalizeCatalog` and `parseImportedCatalog` in `src/data/catalogItems.ts`. Old JSON exports must still import.
   - Settings: `normalizeSettings` and defaults in `src/data/defaultSettings.ts`.
3. Adapters. The JSON payload carries the field in both adapters automatically. Edit `LocalQuoteRepository` (`src/data/repository.ts`) and `SupabaseQuoteRepository` (`src/data/supabaseRepository.ts`) only when the storage shape changes (column, file, field stripped from payload like the logo). Check with `rg -n "payload|logo" src/data/supabaseRepository.ts`.
4. New repository method: add it to `QuoteRepository` in `types.ts` and implement it in both adapters. `App.tsx` is the only caller.
5. Default config value: prefer a normalizer default. Touch `src/data/seed/config.json` only if the seed itself must carry it.
6. Test next to the normalizer: `src/domain/quote.test.ts` or `src/data/catalogItems.test.ts`. Settings has no test file; create `src/data/defaultSettings.test.ts` only if the normalize logic is non-trivial. Include an "old row without the field" case.
7. SQL only when a column must be queried/ordered in SQL, an RLS policy changes, an RPC changes, or storage changes:
   - Create a new file `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_name>.sql`. Do not edit `20260924120000_init.sql`: production already ran it.
   - Admin-only write: policy `using/with check (public.is_admin())`, matching the existing catalog/settings policies. Hiding a button with `isAdmin` is not security.
   - No migration runner exists in the repo. Tell the user to run the file in the Supabase SQL Editor (README "Deploy").
8. UI wiring: follow `ui-change`. If the customer sees the field: follow `customer-output-change`.
9. Docs: `API_CONTEXT.md` if a table, RPC, or env var changed; `BUSINESS_RULES.md` if a rule changed.

## Scope

`types.ts`, one normalizer, its test, adapters only on storage-shape change, optional new migration file.

## Must not

- Add a second persistence path, or call Supabase from `src/components/` (only `LoginScreen` signs in).
- Use or reference the `service_role` key.
- Rename IndexedDB `forte-vidros` or bump `DB_VERSION` without an upgrade path: it hides existing local data.
- Add a column for data that only lives in the JSON payload.
- Add a parallel schema (Zod, OpenAPI, SQL mirror of item fields).
- Drop or rename a field that old rows rely on without a normalizer fallback.

## Validate

- `npm test`, `npm run lint`, `npm run build`.
- Local-mode round trip with `browser-check`: set the field, reload, value persists; an older quote still opens.
- If SQL was added: show the migration and state clearly that it is not applied yet.
