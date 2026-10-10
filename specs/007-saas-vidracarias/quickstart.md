# Quickstart / validation: SaaS fase 1 (spec 007)

Never run these against production Supabase. Data model: [data-model.md](data-model.md). Contracts: [contracts/database.md](contracts/database.md), [contracts/ui.md](contracts/ui.md).

## Prerequisites (owner)

1. **Staging Supabase project** (or `supabase start` with Docker) with both migrations applied, and a `.env.staging.local` with its URL and anon key (never edit `.env`).
2. Auth providers on staging: sign ups on, Confirm email off, Google OAuth (test client), redirect `http://127.0.0.1:5179/`.
3. Inputs from the owner before opening sign ups in production:
   - Support WhatsApp, e-mail, hours, typical reply time (`src/data/support.ts`).
   - Termos de uso, Política de privacidade, razão social, CNPJ, endereço (`src/data/legal.ts`).
   - Plausible total range for a box padrão (e.g. 1,20 × 1,90 m, incolor 8 mm) and a janela de correr 2 folhas (e.g. 1,20 × 1,00 m) — used by the example-catalog test.
   - Decision on extra existing Forte Vidros logins: map to the Forte Vidros account (default) or delete.

## Automated

| Command | Proves |
| --- | --- |
| `npm test` | `accountState` (trial, warn at 7 days, expired by trial/subscription, disabled), `toExampleCatalog` rounding + plausible totals, `exampleRefsInQuote`, `onboardingTasks` (Forte Vidros-like data → all done), new routes parse/format. |
| `node scripts/tenant-isolation.mjs` (staging env) | SC-003: accounts A and B via REST with each JWT — B cannot read/update/delete A's quotes, catalog, settings, suggestions, logo; per-account quote numbers; expired account cannot insert/update/delete or call `next_quote_number`; expired account can still read and send suggestions. |
| `node scripts/signup-browser.mjs` (staging, e-mail method) | US1 + US2 + US6 happy path: create account → setup → Início with trial line and Primeiros passos 0 de 5 → confirm vidros → emit with example prices shows the warning → force expiry via SQL → Novo orçamento opens the notice and the quote count does not change. |
| Existing `smoke-quote-browser`, `validate-catalog-browser`, `nav-back-browser` (local mode) | Local mode unchanged. |

## Manual scenarios

1. **Google sign up (US1)**: on staging, "Criar conta grátis" → Google → setup form → Início with "Teste grátis: faltam 30 dias". Sign out, "Já tenho conta" with e-mail/senha using the same Gmail → lands in the same account.
2. **Example prices (US2)**: new account, no edits, orçar the box padrão and the janela de correr → totals within the owner's range; catalog rows show "exemplo".
3. **Isolation in UI (US3)**: open a quote URL of account A while signed in as B → "Orçamento não encontrado".
4. **Fale com a gente (US5)**: from Início, Orçamentos, Catálogo reach `/ajuda` in ≤ 2 taps; WhatsApp text has shop name and short id; send a suggestion, reply with `supabase/operator/suggestions.sql`, reload → reply visible.
5. **Expiry (US6)**: `extend-trial.sql` with negative days → expired banner without price talk; Novo orçamento / Revisar / Duplicar open the notice; PDF and WhatsApp resend still work; `activate.sql` → back to normal.
6. **Warn (US6)**: set `trial_ends_at` to now + 6 days → warn banner with "Quero assinar".
7. **Footer and delete (US7)**: footer fits below the tiles at 360 × 640; delete a throwaway account → entry screen, login fails, rows gone.
8. **360 px (SC-006)**: entry, setup, task screens, `/ajuda`, expired notice without horizontal scroll.

## Production cutover (US4)

1. Back up: Supabase dashboard backup + `select count(*), max(payload->>'number')` on `quotes`, `select * from quote_counters`.
2. Apply `20261010120000_accounts.sql` outside working hours.
3. Move logo `shop/logo.png` → `{forte_account_id}/logo.png` (Storage API or dashboard).
4. Deploy the app (push to `main`).
5. Verify: same quote count, numbers and totals; next quote continues the sequence; logo in the PDF; no trial line and no Primeiros passos card.
6. Only then: Auth → enable sign ups and providers in production.
