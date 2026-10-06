---
name: ship-change
description: Use when finishing a task: run checks, sync context docs and BACKLOG.md, write the commit, and decide whether the push deploys production.
---

# Ship change

## When to use

At the end of any task that changed files, and whenever the user asks to commit, push, or close a backlog item.

## Read first

1. `AI_OPTIMIZATION.md`, section "Docs to keep updated".
2. `DECISIONS.md`, section "Docs-only pushes do not deploy".
3. `BACKLOG.md` sections "Now" and "Done" only if a backlog item is involved.

## Steps

1. Checks. If anything outside docs changed (`src/`, `public/`, `index.html`, configs, `package*.json`): `npm test`, `npm run lint`, `npm run build`. Docs-only: skip.
2. Doc sync. Only when behavior changed, and only the matching file:
   - `BUSINESS_RULES.md`: emit, roles, totals, pricer rule, customer output.
   - `API_CONTEXT.md`: table, RPC, env var, storage path.
   - `DECISIONS.md`: a boundary choice reversed.
   - `AGENTS.md` folder table: new top-level module. `src/components/AGENTS.md`, `src/domain/pricing/AGENTS.md`: file ownership changed.
   - `PROJECT_SUMMARY.md`, `ARCHITECTURE.md`: only when a module boundary moved.
   - `README.md`: deploy or hosting steps changed.
3. `BACKLOG.md` (pt-BR, living file). Pulling an item: move it to "Now". Closing one: remove it from "Now"/"Next" and add `- [x] <user-visible outcome>` at the top of "Done", concrete, with an example if useful (see existing lines). New ideas go to "Next"/"Later", never to code comments.
4. Stage only the task's files. Never stage `.env`, `.secrets/`, `dist/`, `tmp-browser-qa/`, or root `tmp-*.png`.
5. Commit message: Conventional Commits, English, lowercase subject. Scopes used in history: `quote`, `editor`, `item`, `customer`, `catalog`, `settings`, `share`, `pdf`, `pricing`, `nav`, `ui`, `data`, `domain`, `backlog`, `svg`. Examples: `feat(share): add proposal validity to WhatsApp text`, `docs(backlog): close J4F comparison and PDF filename`. No agent co-author trailers.
6. Deploy decision. A push to `main` builds Cloudflare Pages whenever any app file changed. For a docs-only commit (`*.md`, `docs/`, `specs/`, `.specify/`, `.cursor/`, `.agents/`, `assets/item-images/`), prefix the subject with `[CI Skip] `: the watch-path excludes live in the Pages dashboard and may not match the README list.

## Scope

Checks, docs touched by this task, git staging and message. Commit or push only when the user asked.

## Must not

- Commit or push without a request. Force-push `main`. Use `--no-verify`.
- Deploy by hand (no `wrangler` flow in the repo) or add a GitHub Actions workflow.
- Rewrite unrelated docs or copy `BACKLOG.md` into other files.
- Update line counts or narrative in docs when behavior did not change.

## Validate

- `git status --short` shows no unintended files.
- `git show --stat HEAD` lists only the expected files.
- Tell the user whether the push will deploy production and why.
