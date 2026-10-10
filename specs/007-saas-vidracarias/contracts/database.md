# Contract: database (Supabase) — spec 007

New migration `supabase/migrations/20261010120000_accounts.sql`. Shapes below are the contract; the migration body is written during implementation.

## Helpers (`security definer`, `set search_path = public`)

| Function | Returns | Rule |
| --- | --- | --- |
| `current_account_id()` | uuid null | `select account_id from profiles where id = auth.uid()` |
| `account_can_write()` | boolean | account of the caller exists, `disabled_at is null`, and (`plan = 'trial' and now() < trial_ends_at` or `plan = 'active' and (active_until is null or now() < active_until)`) |

## RPCs (granted to `authenticated`)

| RPC | Input | Output | Rule |
| --- | --- | --- | --- |
| `create_account(p_name text, p_whatsapp text, p_marketing_opt_in boolean)` | | `accounts` row | Fails if caller already has an account. Inserts account (`plan 'trial'`, `trial_ends_at now() + 30 days`, `terms_accepted_at now()`, opt-in date when true) and sets `profiles.account_id`. |
| `get_my_account()` | | `accounts` row or null | Caller's account. |
| `set_marketing_opt_in(p_value boolean)` | | void | Sets/clears `marketing_opt_in_at`. Allowed when expired. |
| `next_quote_number()` | | text `ORC-YYYY-NNNN` | Now per `(current_account_id(), year)`; raises `sem permissão` unless `account_can_write()`. |
| `delete_my_account()` | | void | Deletes the caller's account (cascade) and `auth.users` row. Client removes the logo object first. |

Revoke `execute` from `public` on all of the above; grant to `authenticated`.

## Policies

`A` = `account_id = current_account_id()`, `W` = `A and account_can_write()`.

| Table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| `accounts` | `id = current_account_id()` | via RPC only | via RPC only | via RPC only |
| `profiles` | `id = auth.uid()` | trigger | none | cascade |
| `quotes` | A | W | W | W |
| `catalog` | A | W | W | none |
| `settings` | A | W | W | none |
| `quote_counters` | none (RPC only) | — | — | — |
| `suggestions` | A | A (`status = 'recebida'`, `reply is null`) | none (operator) | cascade |
| `storage.objects` bucket `logos` | `(storage.foldername(name))[1] = current_account_id()::text` | same + `account_can_write()` | same + write | same (also allowed when expired, for account deletion) |

`is_admin()` is no longer used by policies.

## Migration steps (order matters)

1. Create `accounts`, `suggestions`; add nullable `account_id` to `profiles`, `quotes`, `catalog`, `settings`, `quote_counters`.
2. Insert the Forte Vidros account: `plan 'active'`, `active_until null`, `trial_ends_at now()`, `terms_accepted_at now()`, name from current `settings.payload.establishment.name`.
3. Backfill every existing `profiles.account_id` and every data row with that account id (decision for extra logins: see quickstart step "Extra logins").
4. Set `not null`; swap primary keys (`catalog`, `settings` → `account_id`; `quote_counters` → `(account_id, year)`); drop the `id = 'current'` checks and columns.
5. Replace all policies; create helpers and RPCs; trigger `handle_new_user` inserts `profiles (id, role) values (new.id, 'admin')`.
6. Update `settings.logo_path` to `{account_id}/logo.png` (object moved with the Storage API, see quickstart).

## Operator snippets (`supabase/operator/*.sql`, run in the SQL Editor)

| File | Does |
| --- | --- |
| `accounts-to-contact.sql` | Expired trials without `active_until`, with `whatsapp`, `marketing_opt_in_at`, expiry date, and the count of emitted quotes whose `payload->>'validUntil'` falls in the next 7 days (FR-028). |
| `extend-trial.sql` | `trial_ends_at = greatest(trial_ends_at, now()) + interval 'N days'` by short id. |
| `activate.sql` | `plan = 'active', active_until = <date>` by short id. |
| `disable.sql` | set/clear `disabled_at`. |
| `suggestions.sql` | list open suggestions with shop name; reply (`reply`, `replied_at`, `status 'respondida'`); mark done (`status 'feita'`, `shipped_version`). |
| `find-account.sql` | look up by short id, e-mail or WhatsApp. |
