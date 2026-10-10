---
description: "Task list for SaaS fase 1 (conta própria e teste grátis)"
---

# Tasks: SaaS fase 1 (conta própria e teste grátis)

**Input**: Design documents from `specs/007-saas-vidracarias/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R16), data-model.md, contracts/database.md, contracts/ui.md, quickstart.md, legal/

**Tests**: unit tests for pure modules (account state, example catalog, onboarding, example-price detection, routes); `scripts/tenant-isolation.mjs` (REST + JWT against local Supabase) for SC-003; `scripts/signup-browser.mjs` (Playwright against local Supabase). No UI unit tests (Vitest runs in node). Never run against production.

**Story labels**: US1 criar conta e teste · US2 Primeiros passos · US3 isolamento · US4 virada da Forte Vidros · US5 Fale com a gente · US6 vencimento · US7 termos, privacidade e excluir conta. FR-003 (telefone, Facebook) has its own phase.

**Delivery steps** (plan.md): 1 = Phases 1–5 · 2 = Phases 6–7 · 3 = Phase 8 · 4 = Phases 9–10 · 5 = Phase 11.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Add `supabase` CLI as devDependency in package.json; run `npx supabase init` to create supabase/config.toml (auth: `enable_signup = true`, `enable_confirmations = false`, site_url `http://127.0.0.1:5179`); add `supabase/.temp/` and `.env.staging.local` to .gitignore
- [ ] T002 Add npm scripts in package.json: `db:start` (`supabase start`), `db:reset` (`supabase db reset`, applies all migrations), `dev:staging` (`vite --mode staging --host 127.0.0.1 --port 5179 --strictPort`); document in specs/007-saas-vidracarias/quickstart.md how to write `.env.staging.local` from `supabase status` output
- [ ] T003 Run `npm run db:start` and `npm run db:reset` with only the init migration; confirm the current app works against it (`npm run dev:staging`, sign in with a user created in local Studio)

---

## Phase 2: Foundational — accounts schema and account service (blocking)

**Purpose**: per-account data and write lock in the database, account in the app context. After this phase production behavior is unchanged for Forte Vidros.

- [ ] T004 Write supabase/migrations/20261010120000_accounts.sql steps 1–3 per contracts/database.md: `accounts`, `suggestions`, nullable `account_id` columns, Forte Vidros account insert (name from `settings.payload->'establishment'->>'name'`, fallback 'Forte Vidros'), backfill of `profiles` and all data rows
- [ ] T005 Same migration, steps 4–5: not null, primary keys (`catalog`/`settings` → `account_id`, `quote_counters` → `(account_id, year)`), index `quotes (account_id, updated_at desc)`, helpers `current_account_id()`/`account_can_write()`, RPCs `create_account`, `get_my_account`, `set_marketing_opt_in`, per-account `next_quote_number`, `delete_my_account`, all policies (table "Policies"), storage policies by folder, trigger `handle_new_user` inserting role `admin`; revoke/grant
- [ ] T006 Same migration, step 6: `settings.logo_path = account_id || '/logo.png'` where not null
- [ ] T007 [P] Add `Account` type and `AccountState` to src/domain/types.ts per data-model.md (fields camelCase: `trialEndsAt`, `activeUntil`, `plan`, `disabledAt`, `termsAcceptedAt`, `marketingOptInAt`)
- [ ] T008 [P] Implement `accountState(account, now)`, `shortId(id)`, `supportMessage(kind, account)` in src/domain/account.ts per data-model "Derived state" (warn ≤ 7 days, `canWrite`)
- [ ] T009 [P] Unit tests in src/domain/account.test.ts: trial day 1/23/29/30/31, warn boundary at 7 and 8 days, active without end, active with end before/after, disabled, expired reason trial vs subscription, `daysLeft` rounding across midnight
- [ ] T010 Create src/data/accountService.ts: interface `AccountService { getMyAccount(); createAccount(input); setMarketingOptIn(value); listSuggestions(); sendSuggestion(body); deleteMyAccount() }`, `SupabaseAccountService` (RPCs + `suggestions` table) and `LocalAccountService` (fixed active account, suggestions in localStorage); factory `createAccountService()` mirroring `createRepository()` in src/data/repository.ts
- [ ] T011 Update src/data/supabaseRepository.ts: catalog/settings read without `id` filter and upsert with `account_id`; quotes upsert with `account_id`; logo path `{accountId}/logo.png`; constructor receives `accountId`; map RLS write errors to "Sua conta está em modo consulta." when the account cannot write
- [ ] T012 Update src/auth/access.tsx: `Access` gains `account: Account | null` and `accountState`; after session, call `getMyAccount()`; role always `admin` (R14); expose `refreshAccount()`; local mode uses `LocalAccountService`; repository created with the account id
- [ ] T013 Replace `is_admin`-based UI gates with full access where they hide Catálogo/Configurações (src/components/AppHeader.tsx, src/components/App.tsx, src/components/HomeScreen.tsx); keep `vendedor` type paths dormant
- [ ] T014 Run `npm test`, `npm run lint`, `npm run build`, existing local-mode browser scripts; fix regressions

**Checkpoint**: local Supabase with the new migration; signed-in Forte Vidros user sees the same data; writes go through the account.

---

## Phase 3: User Story 3 - Cada conta vê somente os seus dados (P1)

**Goal**: SC-003 proven by script against local Supabase.

**Independent Test**: `node scripts/tenant-isolation.mjs` passes.

- [ ] T015 [US3] Create scripts/tenant-isolation.mjs: creates users A and B via local auth admin API (service key from `supabase status`), calls `create_account` for each, then with each JWT through REST: A writes quote/catalog/settings/logo/suggestion; B cannot select/update/delete them; each gets `ORC-YYYY-0001`; B opening A's quote id returns nothing
- [ ] T016 [US3] Extend scripts/tenant-isolation.mjs: set A `trial_ends_at` in the past (service key) → A insert/update/delete on quotes/catalog/settings/logo and `next_quote_number` fail; A select and suggestion insert succeed; restore with `plan 'active'` → writes succeed
- [ ] T017 [US3] Handle "Orçamento não encontrado" for a quote URL of another account in src/components/App.tsx (same path as a deleted quote) and verify in the browser against local Supabase with two accounts

**Checkpoint**: isolation and write lock proven at the server.

---

## Phase 4: User Story 4 - Forte Vidros vira a primeira conta (P1)

**Goal**: cutover without losing data.

**Independent Test**: rehearsal on local Supabase with a copy of production-shaped data.

- [ ] T018 [US4] Document the rehearsal in specs/007-saas-vidracarias/quickstart.md: the owner exports production `quotes`, `catalog`, `settings`, `quote_counters`, `profiles` into tmp-browser-qa/ (gitignored; contains customer data, never committed), load into the local DB with only the init migration, then apply the accounts migration
- [ ] T019 [US4] Rehearse: compare quote count, numbers, `grandTotal` sum, counters, catalog version before/after; next quote continues the sequence; logo moved to `{account_id}/logo.png` loads in the PDF; Início shows no trial line and no Primeiros passos card
- [ ] T020 [US4] Write the production cutover checklist in specs/007-saas-vidracarias/quickstart.md "Production cutover" with exact SQL checks and the logo move command; owner decides extra logins (default: keep mapped to Forte Vidros)

**Checkpoint**: delivery step 1 ready to ship (owner runs the cutover).

---

## Phase 5: Operator snippets (supports US4, US5, US6)

- [ ] T021 [P] Create supabase/operator/find-account.sql, extend-trial.sql, activate.sql, disable.sql per contracts/database.md (parameters at the top, commented examples)
- [ ] T022 [P] Create supabase/operator/accounts-to-contact.sql (FR-028: expired trials without subscription, WhatsApp, opt-in, expiry date, emitted quotes with `validUntil` in the next 7 days) and supabase/operator/suggestions.sql (list, reply, mark done)
- [ ] T023 Run every snippet against local Supabase with the isolation script data

---

## Phase 6: User Story 1 - Criar a conta e começar o teste grátis (P1)

**Goal**: open sign up with e-mail/senha and Google, setup screen, 30-day trial.

**Independent Test**: quickstart manual scenario 1 and `scripts/signup-browser.mjs` (e-mail method).

- [ ] T024 [P] [US1] Add routes `/termos`, `/privacidade`, `/novidades`, `/ajuda`, `/primeiros-passos/:tarefa` to src/nav/routes.ts with parents per contracts/ui.md; tests in src/nav/routes.test.ts
- [ ] T025 [P] [US1] Create src/data/legal.ts from specs/007-saas-vidracarias/legal/*.md (sections as data, placeholders kept) and src/data/releaseNotes.ts (current version + short list)
- [ ] T026 [US1] Create src/components/PublicPage.tsx (title + sections, back to entry or Início) and let `AccessProvider` render public routes without a session (R13)
- [ ] T027 [US1] Create src/components/EntryScreen.tsx replacing LoginScreen usage: tagline, "Criar conta grátis" / "Já tenho conta", method list (Google via `signInWithOAuth`, e-mail form reusing the password field with show/hide and "Esqueci a senha" via `resetPasswordForEmail`), links to termos/privacidade; sign up vs sign in by mode
- [ ] T028 [US1] Handle password recovery return (`PASSWORD_RECOVERY` auth event) with a "Nova senha" form in src/components/EntryScreen.tsx, then land in the app
- [ ] T029 [US1] Create src/components/AccountSetupScreen.tsx per contracts/ui.md (nome, WhatsApp masked, opt-in unchecked, terms text with links, "Começar teste grátis de 30 dias"); on submit `createAccount` then `refreshAccount()`; `AccessProvider` shows it when session exists and account is null
- [ ] T030 [US1] Prefill settings on first load for a new account (establishment name and phone from the account) in src/data/supabaseRepository.ts `getSettings` fallback
- [ ] T031 [US1] Trial line on Início ("Teste grátis: faltam {n} dias") in src/components/HomeScreen.tsx from `accountState`
- [ ] T032 [US1] Create scripts/signup-browser.mjs (Playwright, local Supabase): sign up by e-mail → setup → Início with trial line; sign out and sign in again lands in the same account
- [ ] T033 [US1] Configure Google provider in supabase/config.toml (env vars, disabled by default) and document cloud staging OAuth check in specs/007-saas-vidracarias/quickstart.md

**Checkpoint**: new accounts can be created locally; legal pages public.

---

## Phase 7: User Story 6 - Vencimento: consultar à vontade, assinar para orçar (P2, ships with US1)

**Goal**: read-only mode with the expiry notice on every write path; warn and expired banners.

**Independent Test**: quickstart manual scenarios 5 and 6; signup script expiry step.

- [ ] T034 [P] [US6] Create src/components/ExpiredNotice.tsx (Modal) per contracts/ui.md: title/body by reason and date, primary "Quero assinar"/"Renovar" → `wa.me` with `supportMessage`, secondary "Falar com a gente" → `/ajuda`, close returns without changes
- [ ] T035 [US6] Gate write paths in src/components/App.tsx: `openNew`, revise, duplicate, emit, item add/edit/remove, draft delete, catalog save, settings save → open `ExpiredNotice` when `!accountState.canWrite`, before creating any draft or revision
- [ ] T036 [US6] Read-only drafts when expired in src/components/App.tsx (inputs disabled, no autosave) while PDF and WhatsApp resend of emitted quotes keep working
- [ ] T037 [US6] Warn and expired banners on Início in src/components/HomeScreen.tsx with `Banner tone="warn"` per contracts/ui.md (no price talk after expiry)
- [ ] T038 [P] [US6] Create src/data/support.ts (WhatsApp placeholder, e-mail placeholder, hours "Seg. a sex., 10h às 16h", reply "até 1 hora") used by `supportMessage` links
- [ ] T039 [US6] Extend scripts/signup-browser.mjs: expire via service key → Novo orçamento opens the notice and quote count is unchanged; Revisar opens the notice; PDF download works
- [ ] T040 [US6] Update src/data/banners.ts: remove the "plano anual" promise (R16), add a support banner

**Checkpoint**: delivery step 2 ready (sign up stays closed in production until legal text and company data exist).

---

## Phase 8: User Story 2 - Primeiros passos (P1)

**Goal**: example catalog with flags, card with five derived tasks, emit warning.

**Independent Test**: quickstart manual scenario 2; unit tests.

- [ ] T041 [P] [US2] Add optional `exemplo?: boolean` to `Vidro`, `KitBox`, `Acessorio`, `Aluminio`, `PricingConfig` and `onboardingDismissedAt?: string` to `AppSettings` in src/domain/types.ts; keep only `true` in `normalizeCatalog` (src/data/catalogItems.ts) and keep the date in `normalizeSettings` (src/data/defaultSettings.ts)
- [ ] T042 [P] [US2] Implement `toExampleCatalog(seed)` in src/data/exampleCatalog.ts (R7 rounding, flags on all rows and config)
- [ ] T043 [US2] Unit tests in src/data/exampleCatalog.test.ts: rounding table, flags set, box padrão 1,20 × 1,90 incolor 8 mm and correr 2 folhas 1,20 × 1,00 incolor 8 mm within ±10% of the seed totals via `priceItem`
- [ ] T044 [US2] Use the example catalog for new accounts in src/data/supabaseRepository.ts `getCatalog` fallback (local mode keeps the seed)
- [ ] T045 [P] [US2] Implement `onboardingTasks(catalog, settings, quotes)` and `exampleRefsInQuote(quote, catalog)` in src/domain/onboarding.ts per research R8/R9
- [ ] T046 [P] [US2] Unit tests in src/domain/onboarding.test.ts: new account 0/5; Forte Vidros-like data 5/5 (card hidden); inactive example rows ignored; refs from `BomLine.source`; config flag counts only with labor/margin
- [ ] T047 [US2] Clear `exemplo` on price change when saving rows in src/components/CatalogEditor.tsx; show the "exemplo" pill next to flagged prices
- [ ] T048 [US2] Create src/components/OnboardingCard.tsx (Section, pill "{done} de 5", rows with check/chevron, "Dispensar") and render it above the tiles in src/components/HomeScreen.tsx
- [ ] T049 [US2] Create src/components/OnboardingTask.tsx for `/primeiros-passos/:tarefa`: `loja` reuses Cadastro/Logo fields; `vidros`, `ferragens`, `mao-de-obra` list only the task's rows/fields with "Confirmar preços" (clears flags) and "Salvar"; wire the route in src/components/App.tsx
- [ ] T050 [US2] "Seu primeiro orçamento" task opens `/orcamentos` and starts a new quote
- [ ] T051 [US2] Emit warning `ConfirmPop` in src/components/App.tsx `onEmit` when `exampleRefsInQuote` is non-empty ("Revisar" → first affected catalog tab, "Emitir assim")
- [ ] T052 [US2] Pending tasks list in Configurações › Cadastro after "Dispensar" (src/components/SettingsEditor.tsx)

**Checkpoint**: delivery step 3 ready.

---

## Phase 9: User Story 5 - Fale com a gente (P1)

**Goal**: `/ajuda` with WhatsApp and suggestions with replies.

**Independent Test**: quickstart manual scenario 4.

- [ ] T053 [US5] Create src/components/SupportScreen.tsx per contracts/ui.md: hours/reply Section, "Conversar no WhatsApp", "Sugestões" Section with count, textarea + "Enviar", list with status pill and reply; offline send keeps the text and shows an error Banner
- [ ] T054 [US5] Wire `/ajuda` in src/components/App.tsx; enable the Ajuda tile ("Fale com a gente") in src/components/HomeScreen.tsx and the Ajuda menu item in src/components/AppHeader.tsx
- [ ] T055 [US5] "Você pediu, a gente fez" entries in src/data/releaseNotes.ts rendered on `/novidades`; suggestion with `shipped_version` shows "Feito na versão X"
- [ ] T056 [US5] Verify ≤ 2 taps to `/ajuda` from Início, Orçamentos, Catálogo, editor, and from `ExpiredNotice`

---

## Phase 10: User Story 7 - Termos, privacidade e excluir conta (P2)

**Goal**: institutional footer, opt-in toggle, account deletion.

**Independent Test**: quickstart manual scenario 7.

- [ ] T057 [P] [US7] Create src/components/HomeFooter.tsx (links per contracts/ui.md, company data from src/data/legal.ts, app version) below the tiles in src/components/HomeScreen.tsx; carousel and tiles still fit 360 × 640 without scrolling
- [ ] T058 [US7] "Excluir minha conta e dados": `ConfirmPop` with "Digite EXCLUIR" → remove logo via Storage → `deleteMyAccount()` → sign out → entry screen
- [ ] T059 [US7] Opt-in checkbox row in Configurações › Cadastro (src/components/SettingsEditor.tsx) calling `setMarketingOptIn`
- [ ] T060 [US7] Extend scripts/tenant-isolation.mjs: `delete_my_account` removes account rows, suggestions and auth user; other account untouched

**Checkpoint**: delivery step 4 ready.

---

## Phase 11: More sign-in methods (FR-003, step 5)

- [ ] T061 Phone OTP in src/components/EntryScreen.tsx (`signInWithOtp({ phone, options: { channel } })`, SMS and WhatsApp, resend after 30 s, switch method); Twilio Verify settings in supabase/config.toml (disabled by default)
- [ ] T062 Facebook button in src/components/EntryScreen.tsx and provider config in supabase/config.toml (disabled by default)

---

## Phase 12: Polish & cross-cutting

- [ ] T063 [P] Update DECISIONS.md ("Single shop" → "One account per vidraçaria, spec 007"), root AGENTS.md (what this repo is, auth, tests, new scripts), src/components/AGENTS.md (new components), API_CONTEXT.md and ARCHITECTURE.md (accounts, RPCs, policies), README.md (local Supabase, env)
- [ ] T064 [P] Add the new screens to scripts/nav-back-browser.mjs where they run in local mode (`/ajuda`, `/termos`, `/primeiros-passos/*`)
- [ ] T065 Check every new screen at 360 px (SC-006) with the browser-check skill against local Supabase
- [ ] T066 Run `npm test`, `npm run lint`, `npm run build`, all browser scripts, `scripts/tenant-isolation.mjs`; update BACKLOG.md (Now/Done)

---

## Dependencies

- Phase 1 → Phase 2 → everything else.
- Phase 3 (US3) and Phase 4 (US4) depend on Phase 2; ship together as delivery step 1 with Phase 5.
- Phase 6 (US1) depends on Phase 2; Phase 7 (US6) depends on Phase 6 (entry/account context) and ships with it.
- Phase 8 (US2) depends on Phase 6 (new accounts exist); can run in parallel with Phase 7.
- Phase 9 (US5) and Phase 10 (US7) depend on Phase 6 routes; independent of each other.
- Phase 11 depends on Phase 6.

## Parallel opportunities

- Phase 2: T007, T008, T009 in parallel with the migration (T004–T006).
- Phase 5: T021 and T022.
- Phase 6: T024 and T025 first, in parallel.
- Phase 8: T041, T042, T045, T046 in parallel; then UI tasks.
- Phases 9 and 10 in parallel after Phase 6.

## Implementation strategy

1. **MVP = delivery step 1** (Phases 1–5): accounts, isolation, Forte Vidros cutover. Production behaves as today, ready for more accounts.
2. Step 2 (Phases 6–7) and step 3 (Phase 8) together if possible, so every new account starts with flagged example prices and the guide.
3. Step 4 (Phases 9–10) before opening sign up in production (support and deletion must exist on day one of public sign up).
4. Open sign up in production only after BACKLOG "Abrir cadastro em produção" is unblocked (CNPJ, support number, legal review).
5. Step 5 (Phase 11) when the cost of SMS/WhatsApp codes is accepted.
