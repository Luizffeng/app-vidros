# AGENTS.md

Routing guide. Read this first. Then open only the folder the task needs.

Deeper context: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md), [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), [DECISIONS.md](DECISIONS.md), [API_CONTEXT.md](API_CONTEXT.md). Token notes: [AI_OPTIMIZATION.md](AI_OPTIMIZATION.md).

Reusable procedures (pricing, persisted field, customer output, UI, browser check, ship): `.agents/skills/<name>/SKILL.md`. Open the one that matches the task.

## What this repo is

App Vidros: single-shop SPA to build, emit, and share glass quotes for one establishment (Forte Vidros is seeded data, not a tenant). Not SaaS. No public signup. Production: https://appvidros.pages.dev. Package name: `app-vidros`.

## Stack

React 19, Vite, TypeScript. No router. Vitest (node). Oxlint. Persist via `QuoteRepository`: Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, else IndexedDB. PDF: jsPDF in the browser. Host: Cloudflare Pages (`public/_redirects`).

## Entry points

| Path | Role |
| --- | --- |
| `index.html`, `src/main.tsx` | Boot. Wraps `App` in `AccessProvider`. |
| `src/components/App.tsx` | All quote UI and the only UI caller of the repository. |
| `src/data/repository.ts` `createRepository()` | Chooses IndexedDB vs Supabase. |
| `src/domain/pricing/index.ts` `priceItem` | Pricing dispatch. |
| `src/domain/types.ts` | Shared models and `QuoteRepository`. |

Views are `useState` in `App` (`list` \| `editor` \| `catalog` \| `settings`). There is no URL router.

## Folders

| Path | Owns |
| --- | --- |
| `src/domain/` | Quote lifecycle, totals, share text, item labels. No I/O. |
| `src/domain/pricing/` | Pure price functions. See `src/domain/pricing/AGENTS.md`. |
| `src/data/` | Repository adapters, seed, catalog normalize, ViaCEP, logo bytes. |
| `src/auth/access.tsx` | Session gate and role. |
| `src/components/` | UI. See `src/components/AGENTS.md`. |
| `src/pdf/generateQuotePdf.ts` | Client PDF, download, Web Share, `wa.me`. |
| `src/data/seed/` | Initial catalog JSON. |
| `supabase/migrations/20260924120000_init.sql` | Schema, RLS, quote-number RPC, logo bucket. |
| `assets/item-images/` | SVG/PNG diagrams. Not imported by `src/`. |
| `specs/`, `.specify/` | Future Spec Kit specs and constitution. Not runtime. No feature spec is checked in. |

## Where things live

- **API calls:** `src/data/supabaseRepository.ts`, `src/data/supabaseClient.ts`, `src/auth/access.tsx`, `src/components/LoginScreen.tsx`, `src/data/viacep.ts`. No app-owned HTTP server.
- **Business logic:** `src/domain/quote.ts`, `src/domain/pricing/`. Rules: [BUSINESS_RULES.md](BUSINESS_RULES.md).
- **Auth:** Supabase email/password. Gate: `src/auth/access.tsx`. Real write lock: RLS in the migration. UI hide: `AppNav.tsx`, `AppHeader.tsx`, `App.tsx` (`isAdmin`).
- **State:** React `useState` inside `App`. Only context is `AccessContext`. No Redux/Zustand.
- **Tests:** colocated `*.test.ts` under `src/`. Run `npm test`. Browser catalog script: `scripts/validate-catalog-browser.mjs` (not in `npm test`).
- **Config / env:** `.env.example`, `src/vite-env.d.ts`. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Missing either value means local mode.
- **Integrations:** Supabase (Auth, Postgres, Storage bucket `logos`), ViaCEP, WhatsApp `wa.me`, Cloudflare Pages.

## Context rules

- Start in the smallest folder that owns the task. Use the table above.
- Do not scan the repo, `specs/`, `.specify/`, or `.cursor/` unless the task is Spec Kit, agent skills, or those docs are the subject.
- Do not reopen a file already read unless the edit depends on a part you skipped.
- Expand scope only after evidence the change crosses a boundary (domain vs UI vs SQL).
- Prefer `rg` for a symbol over reading a directory.
- Read the existing function before adding a new pattern. Pricing changes stay pure and need a parity test in `src/domain/pricing/pricing.test.ts`.
- Do not read `src/data/defaultLogo.ts` (embedded PNG). Do not read `src/data/seed/*.json` unless the task is seed data.
- UI quote behavior: search inside `App.tsx` for the handler (`onEmit`, `persist`, `onDeleteDraft`) before reading the whole file.
- Do not change pricing formulas to “clean them up”. Backlog items live in `BACKLOG.md`, not in code comments.
- Doc, backlog, spec, `.cursor/`, `.agents/`, and `assets/item-images/` edits do not deploy by themselves. See the Cloudflare watch paths in `README.md`. A commit that also changes the app still builds.
