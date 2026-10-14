# Quickstart / validation: SaaS fase 1 (spec 007)

Never run these against production Supabase. Data model: [data-model.md](data-model.md). Contracts: [contracts/database.md](contracts/database.md), [contracts/ui.md](contracts/ui.md).

## Prerequisites (owner)

1. **Local Supabase** (decided 2026-10-10): `npx supabase start` with Docker (available on the dev machine), both migrations applied, and a `.env.staging.local` pointing at it (never edit `.env`). Sign ups on, Confirm email off in `supabase/config.toml`. A cloud staging project is needed only to test Google/Facebook OAuth end to end; the owner logs in to Supabase himself.
2. Inputs from the owner before opening sign ups in production:
   - Support WhatsApp and e-mail (pending: company number). Hours decided: seg. a sex., 10h às 16h, reply within 1 hour in that window (`src/data/support.ts`).
   - Razão social, CNPJ, endereço (pending: CNPJ being created). Legal drafts in [src/content/legal/](../../src/content/legal/) need those fields and a lawyer's review.
   - Plausible totals: same inputs priced with the Forte Vidros seed, ±10% (decided). Inputs: box padrão 1,20 × 1,90 m incolor 8 mm; janela de correr 2 folhas 1,20 × 1,00 m incolor 8 mm.
   - Decision on extra existing Forte Vidros logins: map to the Forte Vidros account (default) or delete.

## Automated

| Command | Proves |
| --- | --- |
| `npm test` | `accountState` (trial, warn at 7 days, expired by trial/subscription, disabled), `toExampleCatalog` rounding + plausible totals, `exampleRefsInQuote`, `onboardingTasks` (Forte Vidros-like data → all done), new routes parse/format. |
| `node scripts/tenant-isolation.mjs` (staging env) | SC-003: accounts A and B via REST with each JWT — B cannot read/update/delete A's quotes, catalog, settings, suggestions, logo; per-account quote numbers; expired account cannot insert/update/delete or call `next_quote_number`; expired account can still read and send suggestions. A `vendedor` cannot run `delete_my_account` (43 checks). |
| `node scripts/signup-browser.mjs` (local Supabase + `npm run dev:staging`) | US1 + US2 + US5 + US6 + US7 (59 checks): public terms/privacy without session → create account by e-mail → "Sua vidraçaria" → Início with "faltam 30 dias" → Primeiros passos "1 de 5"; Seus vidros opens Catálogo › Vidros with the example banner and dashed prices; editing one price clears its flag; "Confirmar preços" on Mão de obra → "2 de 5" → settings prefilled, no logo → first quote `ORC-YYYY-0001`: Emitir warns about example prices, Revisar opens Catálogo › Vidros, "Emitir assim" emits → "3 de 5", X asks first: Fechar keeps it, "desta vez" hides it until a new app session, "para sempre" is stored and moves the open tasks to Cadastro → warn banner at 6 days → expired banner; Novo orçamento, Revisar and settings save open the notice and write nothing; the notice's "Falar com a gente" opens `/ajuda` and a suggestion still sends; PDF still downloads → sign out and back in lands in the same account → Ajuda tile: WhatsApp link with the shop, provider reply and "Feita na versão" show → opt-in saved → footer (tiles still fit 360 × 640, version, Novidades with "Você pediu, a gente fez") → "Excluir minha conta e dados" needs EXCLUIR, then account and login are gone. |
| Existing `smoke-quote-browser`, `validate-catalog-browser`, `nav-back-browser` (local mode) | Local mode unchanged (no Primeiros passos card). `nav-back` also covers menu → Ajuda → back and direct `/termos` → back. |

## Manual scenarios

1. **Google sign up (US1)**: on staging, "Criar conta grátis" → Google → setup form → Início with "Teste grátis: faltam 30 dias". Sign out, "Já tenho conta" with e-mail/senha using the same Gmail → lands in the same account.
2. **Example prices (US2)**: new account, no edits, orçar the box padrão and the janela de correr → totals within the owner's range; catalog rows show "exemplo".
3. **Isolation in UI (US3)**: open a quote URL of account A while signed in as B → "Orçamento não encontrado".
4. **Fale com a gente (US5)**: from Início, Orçamentos, Catálogo reach `/ajuda` in ≤ 2 taps; WhatsApp text has shop name and short id; send a suggestion, reply with `supabase/operator/suggestions.sql`, reload → reply visible.
5. **Expiry (US6)**: `extend-trial.sql` with negative days → expired banner without price talk; Novo orçamento / Revisar / Duplicar open the notice; PDF and WhatsApp resend still work; `activate.sql` → back to normal.
6. **Warn (US6)**: set `trial_ends_at` to now + 6 days → warn banner with "Quero assinar".
7. **Footer and delete (US7)**: footer fits below the tiles at 360 × 640; delete a throwaway account → entry screen, login fails, rows gone.
8. **360 px (SC-006)**: entry, setup, task screens, `/ajuda`, expired notice without horizontal scroll.

## Local setup

```bash
npm run db:start          # first time pulls Docker images (~3 min)
npx supabase status -o env  # API_URL and ANON_KEY
```

Write `.env.staging.local` (gitignored) with `VITE_SUPABASE_URL=<API_URL>` and `VITE_SUPABASE_ANON_KEY=<ANON_KEY>`, then `npm run dev:staging` (port 5179). `npm run db:reset` reapplies all migrations on an empty database. Studio: http://127.0.0.1:54323. E-mails (password recovery): http://127.0.0.1:54324.

**Google locally** (optional): create an OAuth client (Web) in Google Cloud with redirect URI `http://127.0.0.1:54321/auth/v1/callback`, set `enabled = true` under `[auth.external.google]` in `supabase/config.toml` (do not commit that change), export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, then `npm run db:stop && npm run db:start`. The entry screen shows "Continuar com Google" only when the provider is on. In a cloud project: Authentication → Providers → Google, with the site URL and `https://<host>/` in the redirect allow list.

## Rehearsal with production-shaped data (US4)

The production export contains customer data: keep it in `tmp-browser-qa/` (gitignored), never commit it, delete it after the rehearsal.

1. Owner exports from the production SQL Editor (Download CSV) `profiles`, `quotes`, `catalog`, `settings`, `quote_counters`.
2. Move `20261010120000_accounts.sql` out of `supabase/migrations/` temporarily, `npm run db:reset` (init schema only), import the CSVs in local Studio, move the file back, `npx supabase migration up --local`.
3. Run the "before" and "after" checks below locally; they must match.

Rehearsed 2026-10-10 with synthetic data (settings, catalog, one quote, counter, one profile, logo path): Forte Vidros account created active without end, all rows and the counter backfilled, logo path moved to the account folder, profile role `admin`.

## Production cutover (US4)

Apply by pasting the migration in the Supabase SQL Editor (production has no CLI migration history; `db push` would try to rerun the init migration).

1. **Backup**: Dashboard → Database → Backups (confirm a recent one), then save the "before" result:

   ```sql
   select count(*) as orcamentos,
          sum((payload->>'grandTotal')::numeric) as soma_totais,
          max(payload->>'number') as ultimo_numero
     from public.quotes;
   select * from public.quote_counters order by year;
   select md5(payload::text) as catalogo from public.catalog;
   select md5(payload::text) as config, logo_path from public.settings;
   select count(*) as logins from public.profiles;
   ```

2. **Migrate** (outside working hours): paste and run `supabase/migrations/20261010120000_accounts.sql`.
3. **After** checks: run the same queries (catalog and settings no longer have `id`; the hashes must match), plus:

   ```sql
   select left(id::text, 8) as codigo, name, plan, active_until from public.accounts;  -- 1 row, active, null
   select count(*) from public.profiles where account_id is null;                       -- 0
   select count(*) from public.quotes where account_id is null;                         -- 0
   ```

4. **Logo**: Dashboard → Storage → `logos` → `shop/logo.png` → Move to `<account id>/logo.png` (the full id from step 3, same value as in `settings.logo_path`). If the "before" `logo_path` was null, upload the logo in Configurações › Logo after step 5: from this version a missing logo means no logo in the PDF (the embedded Forte Vidros logo is only the local-mode default).
5. **Deploy**: merge the app changes into `main` (Cloudflare builds). Between steps 2 and 5 the app is down (the old app filters by `id = 'current'`, which no longer exists, and the new app needs `accounts`), so steps 2–5 should take minutes.
6. **Verify in the app**: same quotes, numbers and totals; next quote continues the sequence; logo in the PDF; Catálogo and Configurações save.
7. **Extra logins**: all existing logins now belong to the Forte Vidros account with full access (decision default). To remove one: Authentication → Users → delete.
8. Sign ups stay disabled in production until BACKLOG "Abrir cadastro em produção" is unblocked. The entry screen reads `GET /auth/v1/settings`: with sign ups off it shows only "Entrar" (as today); turning on Authentication → Sign In / Providers → "Allow new users to sign up" shows "Criar conta grátis".
