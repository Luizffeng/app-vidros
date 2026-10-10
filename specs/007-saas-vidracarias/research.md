# Research: SaaS fase 1 (spec 007)

Each entry: Decision, Rationale, Alternatives considered.

## R1. Tenant model: `accounts` + `profiles.account_id`

**Decision**: New table `accounts` (one row per vidraçaria). `profiles` gains `account_id` (user → account). A `security definer` helper `current_account_id()` returns the caller's account. Every data table (`quotes`, `catalog`, `settings`, `quote_counters`) gains `account_id`, and RLS compares it to `current_account_id()`.

**Rationale**: spec says account = shop = one user, but the Forte Vidros migration may keep extra existing logins (edge case) and a future "Vários usuários por loja" spec needs N users → 1 account. Mapping through `profiles` costs one column and avoids a second migration later. Policies stay one-liners.

**Alternatives**: `account_id = auth.uid()` (no mapping table): simplest, but breaks the moment two logins share a shop and makes the Forte Vidros extra logins impossible. Separate schema per tenant: far too heavy for Supabase + a SPA.

## R2. Singleton rows become per-account rows

**Decision**: `catalog` and `settings` drop `id = 'current'` and use `account_id` as primary key. `quote_counters` primary key becomes `(account_id, year)`. `quotes.id` stays a global UUID primary key (ids come from `crypto.randomUUID()`), plus `account_id` and index `(account_id, updated_at desc)`.

**Rationale**: smallest change to `SupabaseQuoteRepository`: queries swap `.eq('id', 'current')` for no filter (RLS already restricts to one row) and upserts send `account_id`. Quote numbers stay `ORC-YYYY-NNNN`; each account has its own sequence, Forte Vidros keeps its counters (spec US4).

**Alternatives**: keep `id` text and add `account_id` unique: two keys for one thing.

## R3. Server-side write lock for expired accounts

**Decision**: `account_can_write()` (`security definer`, stable) is true when the caller's account is `trial` with `trial_ends_at > now()`, or `active` with `active_until is null or active_until > now()`. All `insert/update/delete` policies on `quotes`, `catalog`, `settings`, logo storage, and `next_quote_number()` require it. `select` policies only check the account.

**Rationale**: FR-027 requires the block on the server. Read stays open so consulting, PDF and WhatsApp resend keep working (FR-023). Deleting drafts is also a write, so it is blocked too: "modo consulta" is read-only, which is easy to explain.

**Alternatives**: client-only check: violates FR-027. Trigger per table: more code than a policy clause.

## R4. Account state is derived, not stored

**Decision**: store `trial_ends_at`, `active_until` (nullable = no end), `disabled_at`. Derive state in one pure function `accountState(account, now)` in `src/domain/account.ts` → `{ kind: 'trial' | 'active' | 'expired' | 'disabled', reason?: 'trial' | 'subscription', endsAt?, daysLeft?, warn: boolean }`. `warn` is true from 7 days before the end (FR-022). The SQL `account_can_write()` mirrors the same rules.

**Rationale**: no cron job to flip a status column at midnight; the two implementations are short and covered by unit tests plus the isolation script.

**Alternatives**: `status` column updated by a scheduled function: one more moving part and a window where the column lies.

## R5. Sign-in methods and account linking

**Decision**: Supabase Auth with: e-mail/senha and Google (step 2, MUST); phone OTP via Twilio Verify with SMS and WhatsApp channels, and Facebook (step 4, SHOULD). Dashboard: enable sign ups; turn **Confirm email off** (spec: no confirmation before use); Google/Facebook OAuth redirect to `https://appvidros.pages.dev/`. Same-email accounts merge through Supabase automatic identity linking (works because emails are auto-confirmed with confirmation off).

**Rationale**: all four are native Supabase providers; no custom auth server. `supabase-js` already handles the OAuth return (`detectSessionInUrl`); the own router ignores the query string it does not know.

**Risk**: with confirmation off, someone could sign up with another person's e-mail first, and a later Google sign-in by the real owner would link to that account. Accepted for phase 1 (low-value target, shop data starts empty); the "Vários usuários por loja" spec revisits linking. Phone OTP has a per-message cost (Twilio), which is why it is step 4.

**Alternatives**: magic link only: one less password but the user must leave the app to open e-mail, which loses non-technical users. Custom WhatsApp OTP: more code, same Twilio cost.

## R6. Account creation after first sign-in

**Decision**: after sign-in, `AccessProvider` loads the caller's account. If none exists, it shows `AccountSetupScreen` (nome da vidraçaria, WhatsApp, aceite dos termos, opt-in de ofertas desmarcado). Submit calls RPC `create_account(name, whatsapp, marketing_opt_in)`, which inserts `accounts` (trial 30 days, `terms_accepted_at = now()`), sets `profiles.account_id`, and returns the account. Catalog and settings rows are created lazily by the repository on first read, as today (catalog from the example catalog, settings with name and WhatsApp prefilled).

**Rationale**: one form for every provider (Google gives no shop name). The trigger `handle_new_user` keeps creating `profiles`, now with `account_id null` and role `admin`.

**Alternatives**: collect shop name before OAuth: state must survive the redirect; more fragile.

## R7. Example catalog with flags, not a second seed file

**Decision**: pure `toExampleCatalog(seed)` in `src/data/exampleCatalog.ts`: copies the current seed, rounds each price to a "nice" value (≥ 100 → multiple of 10; 20–100 → multiple of 5; < 20 → whole real), and sets `exemplo: true` on every row of `vidros`, `kitBox`, `acessorios`, `aluminios` and on `config`. Editing a price or tapping "Confirmar preços" in a Primeiros passos task clears the flag for that row (or table). Unit test: box padrão and janela de correr totals from the example catalog stay within ±10% of the same quotes priced with the current Forte Vidros seed (owner's decision 2026-10-10: Forte Vidros prices are the plausible reference; spec US2 scenario 3).

**Rationale**: owner asked for round prices close to real ones. Deriving from the current seed keeps them close to market without a second JSON to maintain. Flags reuse the `ativo?` pattern (optional, absent = false) so existing catalogs need no migration.

**Alternatives**: hand-written `catalog-exemplo.json`: drifts from the seed as items change. Table-level "confirmed" flags only: cannot tell which row the emit warning should mention.

## R8. Emit warning for example prices

**Decision**: pure `exampleRefsInQuote(quote, catalog)` returns rows whose `BomLine.source` points to a catalog row with `exemplo: true`, plus `config` when it is still `exemplo` and the quote has labor or margin. `onEmit` shows a `ConfirmPop` ("Este orçamento usa preços de exemplo. Revisar antes?" → Revisar / Emitir assim) when the list is non-empty. Never blocks (FR-015).

**Rationale**: `BomLine.source: CatalogRef` already exists, so the check is exact.

## R9. Primeiros passos state is mostly derived

**Decision**: task completion is computed by `onboardingTasks(catalog, settings, quotes)` in `src/domain/onboarding.ts`:

| Task | Done when |
| --- | --- |
| Sua loja | establishment name and phone filled (reuse `settingsPending`) |
| Seus vidros | no active `vidros` row with `exemplo` |
| Suas ferragens e perfis | no active `kitBox`/`acessorios`/`aluminios` row with `exemplo` |
| Mão de obra e margem | `config.exemplo` absent |
| Seu primeiro orçamento | at least one emitted quote |

Only "Dispensar" is stored: `AppSettings.onboardingDismissedAt?: string`. Existing accounts (Forte Vidros) have no `exemplo` flags and emitted quotes, so every task is already done and the card never shows (FR-030) without a special case.

**Rationale**: no new table, no drift between flags and a checklist.

## R10. Support: WhatsApp + suggestions table

**Decision**: route `/ajuda` (the "Ajuda" tile and menu item, today "Em breve") opens "Fale com a gente": WhatsApp button (`wa.me/<suporte>?text=` with shop name and short account id), hours and typical reply time from `src/data/support.ts`, and "Mandar uma sugestão" with the list of the account's suggestions. Table `suggestions` (account can insert and select own rows; only the operator updates `reply`, `status`, `shipped_version`). Suggestions are not blocked when the account is expired (talking to us must always work).

**Rationale**: WhatsApp conversations never expire and reach a human; suggestions stay in the app forever (FR-018). No chat backend in phase 1.

**Alternatives**: third-party chat widget (Crisp, Tawk): extra script and cookies, and conversations live outside our data; revisit in the "Painel do provedor" spec.

## R11. Operator tooling in phase 1 = SQL snippets

**Decision**: `supabase/operator/` holds commented SQL for the Supabase SQL Editor: extend trial, set `active_until`, disable/enable, list accounts to contact (expired trial, no subscription, WhatsApp, opt-in, emitted quotes expiring in 7 days — FR-028), list/reply/mark suggestions, look up an account by short id.

**Rationale**: spec allows a simple internal tool; the owner already uses the SQL Editor. The "Painel do provedor" spec replaces it.

## R12. Delete account

**Decision**: "Excluir minha conta e dados" → `ConfirmPop` that requires typing `EXCLUIR` → client removes the logo object via Storage API → RPC `delete_my_account()` (`security definer`) deletes the account (cascade to quotes, catalog, settings, counters, suggestions) and `auth.users` row → sign out → entry screen.

**Rationale**: storage objects should be removed through the Storage API, not SQL. Cascade keeps the RPC short.

## R13. Public pages outside the login gate

**Decision**: `/termos`, `/privacidade` and `/novidades` render without a session (checked in `AccessProvider` before the gate). Text lives in `src/data/legal.ts` and `src/data/releaseNotes.ts`; owner provides final legal text (placeholder until then blocks opening sign ups).

## R14. Roles in phase 1

**Decision**: every signed-in user resolves to role `admin` (full access, FR-011). `vendedor` stays in types and RLS helpers only as dormant code for the future multi-user spec; `is_admin()` checks are removed from policies (replaced by account + write checks).

## R15. Rollout order and testing environment

**Decision**: never test against production. Use a local Supabase (`npx supabase start`, Docker is available on the dev machine) with the new migration applied; a cloud staging project only for OAuth checks, created by the owner after he logs in; run `scripts/tenant-isolation.mjs` (two accounts, direct REST calls with each JWT) against it. Production cutover: apply migration → move logo object to `{account_id}/logo.png` → deploy app in the same window; the old app cannot write after the migration (no `id = 'current'`), so the window should be minutes, outside working hours.

## R16. Banners

**Decision**: `src/data/banners.ts` loses the "plano anual" promise until phase 2; it is replaced by a support banner ("Fale com a gente pelo WhatsApp") and the "Ajuda" banner is removed once `/ajuda` exists.
