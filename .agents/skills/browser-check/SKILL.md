---
name: browser-check
description: Use when a change must be verified in the running app (mobile layout, PDF preview, share modal, catalog CRUD/import) before reporting it done.
---

# Browser check

## When to use

- After a visual or flow change from `ui-change` or `customer-output-change`.
- When the user asks to see the app running or to reproduce a UI bug.
- Catalog CRUD or JSON import/export regression.

## Read first

Nothing else by default. Open `scripts/validate-catalog-browser.mjs` only for catalog flows.

## Steps

1. Start the dev server in local mode. The repo `.env` points at the production Supabase project, so a plain `npm run dev` reads and writes real data and shows the login screen. Override both vars with empty values (Vite gives shell env priority over `.env`):

   ```bash
   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1
   ```

   Run it in the background. URL: `http://127.0.0.1:5173`. If a dev server is already running, check whether it shows the login screen; if so it is in remote mode, so do not use it.
2. Open the URL with the browser tool. Viewports: 390×844 first (sales staff use phones), 360 wide for tight rows, 1280 wide only if desktop layout changed.
3. Local mode starts with the seed catalog and admin UI (no login). For emitted-only features (PDF preview, download, share, WhatsApp text): "Novo orçamento", add an item, fill the customer name, "Emitir".
4. Save screenshots under `tmp-browser-qa/` (gitignored). Do not write `tmp-*.png` to the repo root.
5. Quote flow regression (create → item → emit → PDF preview/download): `APP_URL=http://127.0.0.1:5173 node scripts/smoke-quote-browser.mjs`. Catalog regression (edit price, save, new vidro, search, deactivate, situation filter, table switch, reset): `APP_URL=http://127.0.0.1:5173 node scripts/validate-catalog-browser.mjs`. Both run with `reducedMotion: 'reduce'`, so they need no waits for animations; keep that in new scripts. They use Playwright Chromium; if the browser binary is missing, `npx playwright install chromium` needs network. Inside the agent sandbox the Playwright cache path is redirected: run outside it with `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright`.
   Motion or perf change: `APP_URL=… node scripts/motion-perf-browser.mjs` (CPU 4×, median of `RUNS`=3, compares with `tmp-browser-qa/motion-perf-baseline.json`; write a baseline from the code before the change with `SAVE_BASELINE=1`, e.g. a `git worktree` of the previous commit on another port).
6. Stop the dev server if you started it.

## Scope

Observe and report. Fixes go back through the owning skill.

## Must not

- Test against production Supabase (`.env` values) unless the user explicitly asks. Quotes, catalog, and settings writes there are real.
- Type real user credentials.
- Commit screenshots or leave new files in the repo root.
- Edit `.env`.

## Validate

Report the viewport, the steps taken, and what was seen. Embed the key screenshot from `tmp-browser-qa/`.
