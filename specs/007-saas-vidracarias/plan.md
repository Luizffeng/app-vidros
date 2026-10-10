# Implementation Plan: SaaS fase 1 (conta própria e teste grátis)

**Branch**: `007-saas-vidracarias` (work on `main`, as in 004–006) | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification `specs/007-saas-vidracarias/spec.md`.

## Summary

Turn the single-shop app into one account per vidraçaria. Supabase gets an `accounts` table, `account_id` on every data table, and RLS that scopes reads to the caller's account and writes to an account that is in trial or paid (`account_can_write()`). Forte Vidros becomes the first account in the same migration, active without end. Sign up opens with e-mail/senha and Google (phone and Facebook later), then a one-screen "Sua vidraçaria" setup that starts a 30-day trial. New accounts get an example catalog derived from the seed with round prices and `exemplo` flags; a "Primeiros passos" card on Início walks five derived tasks. Expired accounts become read-only: Novo orçamento, Revisar and every write open an expiry notice that points to WhatsApp. "Fale com a gente" (`/ajuda`) offers WhatsApp and in-app suggestions with replies; the operator works through SQL snippets until the "Painel do provedor" spec. Início gains trial/expiry banners and an institutional footer with account deletion.

## Technical Context

**Language/Version**: TypeScript 5, React 19, CSS, PostgreSQL (Supabase)

**Primary Dependencies**: none new in the app; Supabase Auth providers (Google, later Facebook and Twilio Verify for phone)

**Storage**: Supabase Postgres + Storage (new migration); IndexedDB local mode unchanged plus a local account stub; `localStorage` for local-mode suggestions

**Testing**: Vitest (account state, example catalog, onboarding, example-price detection, routes); new `scripts/tenant-isolation.mjs` (REST + JWT, staging) and `scripts/signup-browser.mjs` (Playwright, staging); existing browser scripts in local mode

**Target Platform**: Chrome Android (primary), Safari iOS, desktop browsers; Cloudflare Pages

**Project Type**: single-page web app + Supabase backend (no app-owned server)

**Performance Goals**: sign up to Início ≤ 2 min with Google (SC-001); account load adds one RPC (`get_my_account`) to boot, in parallel with the session check

**Constraints**: usable at 360 px; no new npm dependency; RLS is the only security boundary; never test against production; cutover window of minutes (R15)

**Scale/Scope**: tens to low hundreds of accounts in phase 1. New files: `src/domain/account.ts`, `src/domain/onboarding.ts`, `src/data/exampleCatalog.ts`, `src/data/accountService.ts` (Supabase + local), `src/data/support.ts`, `src/data/legal.ts`, `src/data/releaseNotes.ts`, components `EntryScreen`, `AccountSetupScreen`, `OnboardingCard`, `OnboardingTask`, `SupportScreen`, `ExpiredNotice`, `HomeFooter`, `PublicPage`; 1 migration; `supabase/operator/*.sql`; 2 scripts. Edits: `access.tsx`, `supabaseRepository.ts`, `catalogItems.ts` (flags), `defaultSettings.ts`, `types.ts`, `routes.ts`, `App.tsx` (write gates), `HomeScreen.tsx`, `AppHeader.tsx`, `CatalogEditor.tsx`, `SettingsEditor.tsx`, `banners.ts`, `index.css`, docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | Pass | `priceItem` untouched. Example catalog only changes input prices; parity tests unchanged. New test checks example totals stay plausible. |
| II. Mobile-First Field Quoting | Pass | Sign up in one method screen + one setup screen; all new screens at 360 px (quickstart 8). |
| III. Quote Immutability & Revisions | Pass | Emitted quotes untouched; expired accounts keep reading and resending them; revisions blocked only by the subscription gate. |
| IV. Storage Abstraction | Pass | `QuoteRepository` interface unchanged (scoping is in RLS). Account and suggestions go through a new `AccountService` interface with Supabase and local adapters; domain code stays I/O free. |
| V. Simplicity & Determinism | Pass | Account state derived by one pure function (no cron); onboarding derived from data (one stored date); operator tooling is SQL snippets, not a second app. |
| Workflow: UI usable at ~390px | Pass | Quickstart 8. |

Post-design re-check: passes. `DECISIONS.md` "Single shop" must be rewritten to "One account per vidraçaria (spec 007)" in the same change; root `AGENTS.md` "Do not add tenants or billing outside that spec" now points to this spec.

## Delivery steps

Each step ships on its own and leaves production working.

1. **Accounts and isolation (US3, US4)**: migration, `current_account_id`/`account_can_write`, RLS, per-account counters, `AccountService`, `AccessProvider` loads the account and resolves role `admin`, repository sends `account_id`, logo path per account, `tenant-isolation.mjs`, operator SQL. Sign ups stay closed. Cutover per quickstart.
2. **Sign up and trial (US1, US6 gate, R13 pages)**: `EntryScreen`, `AccountSetupScreen`, `create_account`, Google + e-mail, trial line and warn/expired banners, `ExpiredNotice` on every write path, `/termos`, `/privacidade`, `/novidades`, banners text. Opens sign ups after the owner provides legal text.
3. **Example catalog and Primeiros passos (US2)**: `toExampleCatalog`, `exemplo` flags in catalog UI, task screens, card, emit warning.
4. **Fale com a gente and footer (US5, US7)**: `/ajuda`, suggestions, Ajuda tile and menu, footer, opt-in toggle in Cadastro, `delete_my_account`.
5. **More sign-in methods (FR-003)**: phone OTP (SMS/WhatsApp via Twilio Verify), Facebook.

Steps 2 and 3 should ship together if possible, so no account starts with an unflagged catalog. If step 2 ships alone, new accounts get the example catalog without the card for a short time; acceptable.

## Project Structure

### Documentation (this feature)

```text
specs/007-saas-vidracarias/
├── spec.md
├── plan.md                 # this file
├── research.md             # R1–R16
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── database.md         # tables, helpers, RPCs, policies, migration order, operator SQL
│   └── ui.md               # routes, screens, copy
├── checklists/requirements.md
└── tasks.md                # next: /speckit-tasks
```

### Source Code (repository root)

```text
supabase/
├── migrations/20261010120000_accounts.sql
└── operator/                     # SQL Editor snippets (R11)
src/
├── domain/
│   ├── account.ts (+ .test.ts)   # accountState, shortId, support message text
│   └── onboarding.ts (+ .test.ts)# onboardingTasks, exampleRefsInQuote
├── data/
│   ├── accountService.ts         # AccountService: Supabase + local
│   ├── exampleCatalog.ts (+ .test.ts)
│   ├── support.ts · legal.ts · releaseNotes.ts
│   └── supabaseRepository.ts     # account_id on writes, per-account logo path
├── auth/access.tsx               # account in context, setup gate, public routes
├── nav/routes.ts                 # /ajuda, /primeiros-passos/:t, /novidades, /termos, /privacidade
└── components/
    ├── EntryScreen.tsx · AccountSetupScreen.tsx
    ├── OnboardingCard.tsx · OnboardingTask.tsx
    ├── SupportScreen.tsx · ExpiredNotice.tsx
    ├── HomeFooter.tsx · PublicPage.tsx
    └── (edits) App.tsx, HomeScreen.tsx, AppHeader.tsx, CatalogEditor.tsx, SettingsEditor.tsx
scripts/
├── tenant-isolation.mjs
└── signup-browser.mjs
```

**Structure Decision**: same single SPA; backend logic only as SQL (RLS, RPCs) in one new migration. No server code, no new package.

## Complexity Tracking

No constitution violations. Two new moving parts worth naming:

| Addition | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| `profiles.account_id` mapping instead of `account_id = auth.uid()` | Forte Vidros extra logins and the future multi-user spec | Direct uid breaks as soon as two logins share a shop, forcing a second data migration |
| `AccountService` beside `QuoteRepository` | Account, suggestions and deletion are not quote storage | Growing `QuoteRepository` would make every adapter and test double implement unrelated methods |
