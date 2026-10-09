# Research: back navigation, per-screen URLs, home page

Joint research for spec 005 (back + URLs) and spec 006 (home page). Format: Decision / Rationale / Alternatives.

## R1. Router: own History API module, no library

- **Decision**: a small `src/nav/` module on the History API: route parse/format (pure), a navigator (push / replace / back with direction), a back-layer stack, leave guards, and a `useRoute()` hook. `App` reads the route instead of `useState<View>`.
- **Rationale**: 5 route shapes, no nested layouts, no data loaders. The hard part (overlays and guards sharing one history stack) is app-specific and would sit on top of any router anyway. Keeps FR-015 (≤ 3 KB gzip for 005) and constitution V (simplicity).
- **Alternatives**: React Router (≈ 15–20 KB, data APIs unused); wouter (≈ 2 KB, but layers/guards still custom, two models of history to keep in sync); hash routes (`#/orcamentos`), ugly URLs, and Cloudflare `_redirects` already serves `index.html` for every path.

## R2. Overlays take one history entry each ("back layers")

- **Decision**: `useBackLayer(open, onBack)`. When an overlay opens, push an entry `{ idx, layer: n }` on the same URL. `popstate` closes the top layer (calls its `onBack`). When the overlay closes through the UI (button, Esc, outside tap, selection), the layer calls `history.back()` itself and marks the pop as expected so it does not close anything else. Wired into `Modal`, `useDismiss` (Dropdown, HeaderMenu, SendMenu, settings confirm) and the editor's inline confirm popovers.
- **Rationale**: matches Android/Material back semantics (FR-001) with one mechanism for every overlay; nested overlays (dropdown inside the item modal) stack naturally.
- **Race**: a UI close (`history.back()`, async) followed at once by a screen change (`pushState`) would let the pending back pop the new entry. The navigator queues pushes until the expected `popstate` arrives (one microtask-to-frame delay, invisible).
- **Alternatives**: `CloseWatcher` API: native Android back for dialogs, but Chromium only and groups watchers created without user activation (unreliable for nested overlays); keep as possible enhancement. One shared "overlay open" entry: closes all overlays at once, wrong for nested ones. Synthetic Esc on popstate: closes every Esc listener at once.

## R3. Opening a deep URL builds the parent chain

- **Decision**: at boot, if the URL is not `/`, `replaceState('/')` then `pushState` each ancestor down to the current route (e.g. `/` → `/orcamentos` → `/orcamentos/:id`). Each entry carries `idx` (0, 1, 2…).
- **Rationale**: back then walks up the screen map (spec 005 FR-002, US3 scenario 7) and leaves the app only from Início (FR-003). Reload keeps the same screen (FR-007) because the URL is the source of truth.
- **Alternatives**: "back with no in-app history = go to parent" computed on popstate: impossible, the browser has already left the app.

## R4. Direction and scroll

- **Decision**: every entry stores `idx`. On `popstate`, `newIdx < oldIdx` → `data-nav="back"`, else `forward`; pushes are `forward`, menu/tile jumps between top sections are `fade` (spec 004 contract unchanged). `history.scrollRestoration = 'manual'`; the existing list scroll memory (`listScrollRef`) stays, other screens open at top.
- **Rationale**: FR-013, FR-014 with no new visual rules.

## R5. Leave guards for unsaved Catálogo/Configurações

- **Decision**: `useLeaveGuard(dirty, message)` registers a guard. In-app navigation asks `confirm(message)` first. On `popstate` (browser already moved), if a guard says no, push the left entry back and stay. Message: "Descartar as alterações não salvas?". Today menu navigation drops edits silently; this closes that gap too.
- **Rationale**: FR-012; `CatalogEditor` already uses `window.confirm` for discard, so the UI stays consistent. A styled dialog can replace both later (backlog "Unificar componentes").
- **Alternatives**: `beforeunload` only (covers tab close, not in-app back).

## R6. Item draft: raw form state in localStorage, per quote

- **Decision**: `ItemForm` reports its raw field state (`ItemFormState`: kind + string fields, extras, note) through `onStateChange`, and accepts `initialState`. App stores `app-vidros:item-draft:{quoteId}` = `{ create?: ItemFormState, edits: { [itemId]: ItemFormState }, savedAt }` in `localStorage`. Saved when the item modal closes by back / Esc / Fechar / outside tap with something typed beyond the kind; "Cancelar", successful add/save, emit, quote delete and "Descartar" remove it.
- **Rationale**: raw strings survive incomplete or invalid input (an `ItemInput` needs validation). Device-only matches the spec assumption; no `Quote` shape change, no Supabase migration (constitution III/IV untouched).
- **Alternatives**: persist inside `Quote` (synced, but changes stored shape and revision rules); IndexedDB (async, overkill for < 2 KB per quote); sessionStorage (lost on app close, fails US4 scenario 4).

## R7. Banner carousel: CSS scroll-snap + small autoplay hook

- **Decision**: horizontal scroll container with `scroll-snap-type: x mandatory`, slides at ~88% width so the next one peeks; dots as buttons. `useCarouselAutoplay`: every 5 s `scrollTo` next slide (`behavior: smooth`, wraps to first); pauses on `pointerdown` until `pointerup`/`pointercancel`, on `focusin` until `focusout`, when the page is hidden (`visibilitychange`) or the carousel is off screen (`IntersectionObserver`); any manual swipe/dot resets the 5 s timer; `prefers-reduced-motion` disables autoplay and smooth scrolling. Active slide from `IntersectionObserver` (threshold 0.6).
- **Rationale**: native swipe physics on every phone, no layout work per frame (spec 004 FR-009), no library. W3C APG carousel pattern for roles/labels.
- **Alternatives**: transform-based slider with touch handlers (reimplements swipe, worse on low-end phones); Embla/Swiper (≈ 6–30 KB).

## R8. Banner content ships with the app

- **Decision**: `src/data/banners.ts` exports an ordered list `{ id, title, text, image?, action?: { screen: Route } | { url }, from?, until? }`. Images optional in `public/banners/`. `visibleBanners(list, now)` (pure, tested) filters by date, caps at 5, falls back to the default set when fewer than 2 remain.
- **Rationale**: spec 006 (fixed banners, ≥ 2, no user editing); zero network; templates/triggers later (backlog).

## R9. Home tile summaries are pure functions

- **Decision**: `src/domain/home.ts`: `quoteTileSummary(quotes, now)` → `{ expiring, drafts, emitted, total }` (expiring = emitted, `resolveQuoteValidUntil` between today and today + 7 days inclusive); `catalogUpdatedOn(version)` parses `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM` from `bumpCatalogVersion`; `settingsPending(settings)` → reasons (`missing-name` when name and tradeName are blank, `missing-phone`). Unit tests next to it.
- **Rationale**: testable without the browser; no I/O in domain (AGENTS).

## R10. URL shapes

- **Decision**: `/` Início; `/orcamentos` (`?filtro=rascunhos|emitidos`, `?busca=`); `/orcamentos/:id` (quote id); `/catalogo/:tabela` (`vidros`, `kit-box`, `acessorios`, `aluminios`, `configuracao`); `/configuracoes/:aba` (`cadastro`, `orcamento`, `logo`). Missing segment → first tab. Unknown path → `/` (replace).
- **Rationale**: Portuguese, readable words (FR-006); id is stable across edits and unique per revision; codes like `2026-0014-1` would need a lookup and can be retyped wrong.
- **Alternatives**: `/orcamentos/2026-0014-1` (nicer, but lookup by code and ambiguity during revision creation).

## R11. Roles

- **Decision**: keep the current `isAdmin` gate. Home tiles, routes `/catalogo` and `/configuracoes` follow it (vendedor → `/`, replace). With the vendedor role paused operationally (all users admin), everyone sees the same home (spec 006). Removing the role from code belongs to the auth spec.

## R12. Testing

- **Decision**: unit tests `src/nav/routes.test.ts` (parse/format/ancestors), `src/domain/home.test.ts`, `src/data/banners.test.ts`, item-draft storage helpers. New browser script `scripts/nav-back-browser.mjs`: Playwright `page.goBack()` fires the same `popstate` as Android back; covers overlays, screens, deep link, reload, guards, item draft. Existing smoke/catalog/motion scripts must pass (smoke now starts at Início). Manual check on a real Android phone (quickstart).

## R13. Budget

- **Decision**: nav ≤ 3 KB gzip (spec 005 FR-015). Home (tiles + carousel + banner data, no images) target ≤ 4 KB gzip; banner images ≤ 60 KB each, lazy below the first.
