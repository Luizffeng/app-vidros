# Contract: database / storage — spec 009

## Migration `supabase/migrations/20261022120000_quote_photos.sql`

1. Insert bucket `quote-photos` (`public = false`).
2. Policies on `storage.objects` for `bucket_id = 'quote-photos'`:
   - **select**: authenticated AND `(storage.foldername(name))[1] = current_account_id()::text`
   - **insert**: authenticated AND same folder AND `account_can_write()`
   - **update**: same as insert
   - **delete**: same as insert
3. No new Postgres tables (refs live in `quotes.payload` JSON).

Apply via SQL Editor / `db:reset` locally (README Deploy). Not auto-applied in production.

## Operator (optional, later)

SQL snippet to list/delete objects older than 180 days with zero quote references — out of MVP ship; note in `supabase/operator/` if time allows.

## Quote JSON (existing `quotes` row)

See [data-model.md](../data-model.md). No column changes.
