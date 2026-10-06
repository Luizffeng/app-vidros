# AI_OPTIMIZATION

Recommendations only. No refactor in this pass.

## Current context costs

- `src/components/App.tsx` (~1666 lines) mixes list, editor, customer, money sections, share modal, and SVG icons. Agents open the whole file for a one-line behavior change.
- `src/components/CatalogEditor.tsx` (~1057) and `ItemForm.tsx` (~886) repeat money/percent parsing that also exists in `App.tsx`.
- `src/data/defaultLogo.ts` is a base64 PNG (~45 KB). Reading it blows the context and teaches nothing.
- `src/domain/pricing/correr.ts` and `pivotante.ts` are formula-dense. Loading every pricer is waste when the task names one product.
- Seed JSON (`src/data/seed/`) and `assets/item-images/` are bulky and irrelevant to most logic edits.
- Stale narrative docs disagree with the code: constitution principle IV (“remote adapter later”) and `.cursor/agents/mobile-local-ios.md` (“no backend required”). Agents that load them re-derive the wrong architecture. The old MVP spec was removed for the same reason.
- `docs/handoff-supabase-cloudflare.md` is a finished deploy brief. Useful once for hosting history, noisy for feature work.
- Spec Kit skills under `.cursor/skills/speckit-*` and `.specify/` are workflow machinery, not app behavior.

## Recommendations

- Keep using `QuoteRepository` + `src/domain/types.ts` as the only persistence contract so agents do not read both adapters unless storage behavior changes.
- When a quote UI task starts, `rg` the handler name in `App.tsx` and read that span. Split `App.tsx` later only if a real change needs it; do not split for tidiness.
- Point pricing work at one file via `src/domain/pricing/AGENTS.md`.
- Leave `defaultLogo.ts` out of context. Logo behavior is `src/data/logo.ts` and `resolveStoredLogo` at the bottom of `defaultLogo.ts` (last ~15 lines). A future change could move the PNG to `public/` and keep a short module. That is a behavior-neutral refactor, not done here.
- If catalog import and quote forms keep drifting, one small money-parse helper would replace three copies. Not required for correctness today.

## Large files that stay relevant

| File | Approx. lines | When it is relevant |
| --- | --- | --- |
| `src/components/App.tsx` | 1666 | Quote UI, emit, list, share buttons |
| `src/components/CatalogEditor.tsx` | 1057 | Catalog screen |
| `src/components/ItemForm.tsx` | 886 | Item modal fields |
| `src/data/defaultLogo.ts` | short logic, huge literal | Almost never |
| `src/pdf/generateQuotePdf.ts` | 327 | Customer PDF layout |
| `src/domain/quote.ts` | 335 | Totals, emit, revision, share text |
| `src/domain/pricing/correr.ts` | 214 | Correr formula only |
| `supabase/migrations/20260924120000_init.sql` | 188 | RLS and schema |

## Shared contract instead of cross-repo search

- `src/domain/types.ts` is already the document schema. Prefer it over inferring fields from SQL or from `App.tsx`.
- `QuoteRepository` method list is the persistence surface. Both adapters must match it.
- No OpenAPI file is justified: there is no public HTTP API. A generated client would duplicate `types.ts`.
- RLS text in the single migration is the authorization contract. Do not re-learn it from the UI.

## Repeated patterns worth a standing instruction

Already captured in root `AGENTS.md`:

- Pricing change → one pricer + `pricing.test.ts`. Do not restyle formulas.
- Persisted field → type, normalizer, both adapters only if the storage shape changes.
- Admin-only write → RLS policy, not only a hidden button.
- Customer PDF/WhatsApp must not gain measures, cost, or margin unless the task says so.

A Cursor skill is worth adding only if agents keep missing those four. The root `AGENTS.md` is enough until that happens.

## Docs to keep updated

Update when the behavior changes, not on every commit:

- `AGENTS.md` folder table if a new top-level module appears.
- `BUSINESS_RULES.md` when emit, roles, totals, or a pricer rule changes.
- `API_CONTEXT.md` when a table, RPC, or env var changes.
- `DECISIONS.md` when a boundary choice is reversed (for example offline sync or multi-shop).
- `README.md` deploy steps when hosting changes.

`PROJECT_SUMMARY.md` and `ARCHITECTURE.md` should change only when a module boundary moves. `BACKLOG.md` stays the product queue; do not copy it into these files.

## Do not load by default

- `src/data/defaultLogo.ts`
- `src/data/seed/*.json` (open `seed/config.json` only for labor/markup defaults)
- `assets/item-images/**` and `tmp-*.png`
- `package-lock.json`
- `specs/**`, `.specify/**` (unless the task is Spec Kit)
- `.cursor/skills/**`, `.cursor/agents/mobile-local-ios.md` (stale on hosting)
- `docs/handoff-supabase-cloudflare.md` (historical; worktree warning at the top is obsolete)
- Full `src/components/App.tsx` when the task is domain, SQL, or pricing
- All of `src/domain/pricing/` when the task names one `kind`
