---
description: "Task list for Botão voltar, endereço por tela e Início (specs 005 + 006)"
---

# Tasks: Botão voltar, endereço por tela e Início

**Input**: Design documents from `specs/005-voltar-e-urls/` and `specs/006-pagina-inicial/`

**Prerequisites**: plan.md, spec.md (005), ../006-pagina-inicial/spec.md, research.md, data-model.md, contracts/navigation.md, contracts/home.md, quickstart.md

**Tests**: unit tests for pure modules (routes, home summaries, banners, item-draft storage) per research R12 and AGENTS (domain changes need tests); one new Playwright script for back/URL flows. No UI unit tests (Vitest runs in node).

**Story labels**: spec 005 → US1 (voltar fecha janela), US2 (voltar volta tela / Início raiz), US3 (endereço por tela), US4 (item em rascunho). Spec 006 → US5 (blocos de módulo, = 006 US1), US6 (carrossel de banners, = 006 US2).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Record bundle baseline: run `npm run build`, note gzip size of the main JS and CSS in specs/005-voltar-e-urls/quickstart.md (section "Baseline")
- [X] T002 [P] Create folder src/nav/ with empty modules routes.ts, navigator.ts, useRoute.ts, useBackLayer.ts, useLeaveGuard.ts (exports stubbed per contracts/navigation.md)

---

## Phase 2: Foundational (blocking)

**Purpose**: URL-driven screens. After this phase the app behaves as today, but each screen push/pop goes through history.

- [X] T003 [P] Implement `Route`, `parseRoute`, `formatRoute`, `parentOf`, `ancestors`, slug maps (CatalogTab ↔ `vidros|kit-box|acessorios|aluminios|configuracao`, SettingsTab ↔ `cadastro|orcamento|logo`, list filter ↔ `rascunhos|emitidos`) in src/nav/routes.ts per data-model "Route"
- [X] T004 [P] Unit tests in src/nav/routes.test.ts: round-trip every route, missing/unknown tab → first tab, unknown path → home, query `filtro`/`busca` encode/decode (accents, spaces), ancestors of `/orcamentos/:id` = [home, quotes]
- [X] T005 Implement navigator in src/nav/navigator.ts: `HistoryState {app, idx, layer?}`, `push(route, nav)`, `replace(route)`, `back()`, `onChange(listener)` with direction from `idx` (R4), `history.scrollRestoration = 'manual'`, `popstate` handling; boot from `location` (no chain yet)
- [X] T006 Implement `useRoute()` in src/nav/useRoute.ts (subscribe via `useSyncExternalStore`, return `{ route, nav }`)
- [X] T007 In src/components/App.tsx replace `useState<View>` and `navigate()` with `useRoute()`/`navigator.push`: `quotes` → list, `quote` → load by id (reuse `openQuote` logic), `catalog`/`settings` → editors; keep `listScrollRef` save/restore; keep `data-nav` from route `nav`; `/` temporarily renders the list
- [X] T008 In src/components/App.tsx route `goSection`, `openNew`, `openQuote`, editor back arrow and post-delete navigation through the navigator (push for screens, `back()` for the editor arrow when the previous entry is the list)
- [X] T009 Run `npm test`, `npm run lint`, `node scripts/smoke-quote-browser.mjs`; fix regressions

**Checkpoint**: device back walks screens (list ↔ orçamento ↔ catálogo); overlays still leave the screen. URL changes per screen.

---

## Phase 3: User Story 1 - Voltar fecha a janela aberta (P1) 🎯 MVP

**Goal**: every overlay owns one history entry; back closes only the top one (005 FR-001, FR-005).

**Independent Test**: quickstart scenarios 1–2.

- [X] T010 [US1] Add back-layer stack to src/nav/navigator.ts: `pushLayer(onBack)` → `release(fromUi)`, `expectedPops` counter, push queue while a UI-initiated back is pending (R2), top layer gets `popstate` before screen handling
- [X] T011 [US1] Implement `useBackLayer(open, onBack)` in src/nav/useBackLayer.ts per contracts/navigation.md (StrictMode-safe: release on unmount without double back)
- [X] T012 [US1] In src/components/Modal.tsx call `useBackLayer(true, requestClose)` while mounted so back runs the same closing animation as the close button
- [X] T013 [US1] In src/components/useDismiss.ts add `'back'` to `DismissReason` and call `useBackLayer(open, () => onDismiss('back'))`; check callers in src/components/Dropdown.tsx, src/components/AppHeader.tsx (`HeaderMenu`), `SendMenu` in src/components/App.tsx and the margin confirm in src/components/SettingsEditor.tsx accept the new reason
- [X] T014 [US1] In src/components/App.tsx register `useBackLayer` for `pendingRemoveId`, `pendingDeleteQuote` and `emitNeedsName` popovers (back clears the pending state)
- [X] T015 [US1] In src/components/App.tsx make the "Tipo do item" → form transition replace the layer (pick → create keeps one entry), so back from the form returns to the orçamento, not to the picker (005 US1 scenario 3)
- [X] T016 [US1] Create scripts/nav-back-browser.mjs (local mode, Playwright, `page.goBack()`): scenarios 1–2 of quickstart (each overlay closes on back; UI close then back goes to the previous screen; fast double back)

**Checkpoint**: Android back never leaves the app while an overlay is open. Ship point.

---

## Phase 4: User Story 2 - Voltar volta uma tela; só sai no Início (P1)

**Goal**: Início is the root; Orçamentos, Catálogo, Configurações go back to it (005 FR-002–FR-004, FR-012–FR-014; 006 FR-001, FR-002, FR-013).

**Independent Test**: quickstart scenarios 3, 4, 7.

- [X] T017 [US2] Create src/components/HomeScreen.tsx: header (`AppHeader` title "Início"), 2-column tile grid (Orçamentos, Catálogo, Configurações, Ajuda disabled "Em breve") without summaries yet, action bar "Novo orçamento" calling `openNew`; styles `.home`, `.tile-grid`, `.tile` in src/index.css per contracts/home.md layout
- [X] T018 [US2] In src/components/App.tsx render `HomeScreen` for `/`; app boot without deep path opens Início (005 FR-020)
- [X] T019 [US2] In src/components/AppHeader.tsx add `'home'` to `AppSection`, menu item "Início", and an optional back arrow (`onBack`) shown on Orçamentos, Catálogo and Configurações that calls `navigator.back()` when the previous entry is Início, else `replace` to Início
- [X] T020 [US2] In src/components/CatalogEditor.tsx and src/components/SettingsEditor.tsx wire the header back arrow; SettingsEditor "Voltar"/cancel button goes to Início instead of `onNavigate('list')`
- [X] T021 [US2] Add leave guards to src/nav/navigator.ts (`addGuard`; on `popstate` with an active guard and `confirm` false, re-push the left entry) and implement `useLeaveGuard(active, message)` in src/nav/useLeaveGuard.ts
- [X] T022 [P] [US2] Use `useLeaveGuard(dirty)` in src/components/CatalogEditor.tsx (message: existing "Descartar as alterações não salvas do catálogo?") and src/components/SettingsEditor.tsx ("Descartar as alterações não salvas?")
- [X] T023 [US2] In src/components/App.tsx: orçamento opened from Início returns to Início on back; list keeps search, filter and scroll when coming back (state survives route change)
- [X] T024 [US2] Extend scripts/nav-back-browser.mjs with quickstart scenarios 3, 4, 7
- [X] T025 [P] [US2] Update scripts/smoke-quote-browser.mjs, scripts/validate-catalog-browser.mjs and scripts/motion-perf-browser.mjs to start at Início and enter the target screen

**Checkpoint**: back leaves the app only from Início; unsaved Catálogo/Configurações ask first.

---

## Phase 5: User Story 5 - Blocos de módulo com resumo (006 US1, P1)

**Goal**: tiles show what needs attention (006 FR-007–FR-012, FR-014, FR-015).

**Independent Test**: quickstart scenario 10; 006 US1 scenarios 1–8.

- [X] T026 [P] [US5] Implement `quoteTileSummary(quotes, now)`, `catalogUpdatedOn(version)`, `settingsPending(settings)` in src/domain/home.ts per research R9 (use `resolveQuoteValidUntil` from src/domain/quote.ts)
- [X] T027 [P] [US5] Unit tests in src/domain/home.test.ts: expiring window (today, +7 inclusive, +8 excluded, already expired excluded, drafts ignored), counts, empty list; catalog version `YYYY-MM-DD` and `YYYY-MM-DDTHH:MM`, invalid → null; pending name/tradeName blank, phone blank, both, none
- [X] T028 [US5] In src/components/HomeScreen.tsx render summaries per contracts/home.md (pluralization, attention color for "vencendo", "!" badge + reason, placeholders while loading, "Não foi possível carregar" on failure, accessible name per tile); Configurações tile with pending goes to `/configuracoes/cadastro`
- [X] T029 [US5] In src/components/App.tsx pass quotes, catalog version and settings (already loaded) to `HomeScreen`; load them on Início if not loaded yet
- [X] T030 [US5] Tile styles in src/index.css: square (`aspect-ratio: 1`), `--radius`, max ~260 px on wide screens, press feedback ≤ `--dur-xs`, disabled Ajuda

**Checkpoint**: quickstart scenario 10 passes.

---

## Phase 6: User Story 6 - Carrossel de banners (006 US2, P1)

**Goal**: full-width banner carousel with 5 s autoplay and pauses (006 FR-003–FR-006).

**Independent Test**: quickstart scenario 11; 006 US2 scenarios 1–8.

- [X] T031 [P] [US6] Create src/data/banners.ts: `Banner` type, initial banners (at least 2: "Em breve teremos …", "Sabia que no plano anual você economiza R$ …?", "Confira os detalhes das últimas atualizações" without action), `DEFAULT_BANNERS`, `visibleBanners(all, now)` per data-model
- [X] T032 [P] [US6] Unit tests in src/data/banners.test.ts: date window inclusive, order kept, max 5, fallback when fewer than 2
- [X] T033 [US6] Create src/components/BannerCarousel.tsx: scroll-snap track (slides ~88% width), dots as buttons, active slide via `IntersectionObserver` (0.6), APG roles/labels per contracts/home.md, action handling (`route` → `navigator.push`, `url` → new tab)
- [X] T034 [US6] Add `useCarouselAutoplay` (same file or src/components/useCarouselAutoplay.ts): 5000 ms, wrap, pause on pointer down/focus inside/page hidden/off screen, reset on interaction, off with `prefers-reduced-motion` (R7)
- [X] T035 [US6] Carousel styles in src/index.css (`.carousel`, `.carousel__slide`, `.carousel__dots`): fixed ratio, 2-line clamp, no layout shift, hidden scrollbar, reduced motion → `scroll-behavior: auto`
- [X] T036 [US6] Mount `BannerCarousel` at the top of src/components/HomeScreen.tsx; verify 360 × 640 shows carousel + 2 tile rows + action bar without scroll (006 SC-001)

**Checkpoint**: quickstart scenarios 11–12 pass.

---

## Phase 7: User Story 3 - Endereço por tela, recarregar mantém o lugar (P2)

**Goal**: deep links and reload land on the same screen with a sane back chain (005 FR-006–FR-011).

**Independent Test**: quickstart scenarios 5–6.

- [X] T037 [US3] In src/nav/navigator.ts boot: for a non-root URL, `replaceState('/')` then push each ancestor and the current route with increasing `idx` (R3); reload of an already-built chain keeps the existing entries (detect via `history.state.app`)
- [X] T038 [US3] In src/components/App.tsx: quote id not found or not accessible → `replace` to `/orcamentos` + notice "Orçamento não encontrado"; admin-only routes for non-admin → `replace('/')` (R11)
- [X] T039 [US3] Tabs and list filters in the URL via `replace`: src/components/CatalogEditor.tsx and src/components/SettingsEditor.tsx take `tab` + `onTabChange` from the route; list filter/search in src/components/App.tsx sync `filtro`/`busca`
- [X] T040 [US3] Confirm login keeps the requested URL (src/auth/access.tsx renders `LoginScreen` without changing `location`); fix if the gate rewrites the path
- [X] T041 [US3] Extend scripts/nav-back-browser.mjs with quickstart scenarios 5–6 (deep link chain, reload on each tab, unknown id)

**Checkpoint**: reload keeps the screen everywhere (005 SC-003).

---

## Phase 8: User Story 4 - Item digitado não se perde (P2)

**Goal**: unfinished item input survives back/close/reload as an item draft (005 FR-016–FR-019).

**Independent Test**: quickstart scenarios 8–9.

- [X] T042 [P] [US4] Create src/data/itemDraft.ts: `ItemDraftRecord`, `readItemDraft(quoteId)`, `saveCreateDraft`, `saveEditDraft`, `clearCreateDraft`, `clearEditDraft`, `clearItemDrafts(quoteId)` on key `app-vidros:item-draft:{quoteId}`; tolerate missing `localStorage` and bad JSON
- [X] T043 [P] [US4] Unit tests in src/data/itemDraft.test.ts with an in-memory `Storage` stub
- [X] T044 [US4] In src/components/ItemForm.tsx add `ItemFormState` (kind, raw string fields, committed extra rows, note), `initialState` prop (seeds every `useState`), `onStateChange` (called on change, debounced is not needed) and `isEmptyFor(kind)` helper; unknown catalog values reopen empty with the existing warning
- [X] T045 [US4] In src/components/App.tsx split close reasons: "Cancelar" (`onCancel`) clears the draft; back/Esc/Fechar/outside save it when not empty (create) or different from the item (edit); successful add/save clears it
- [X] T046 [US4] In src/components/App.tsx show the notice "Item não terminado: {tipo}" with "Continuar" and "Descartar" above the items; "Adicionar item" reopens the create draft; edit reopens with saved edits and a "Descartar alterações" action
- [X] T047 [US4] In src/components/App.tsx clear all item drafts on emit (`onEmit`) and quote delete (`onDeleteDraft`); ignore and remove drafts for emitted/missing quotes on open
- [X] T048 [US4] Extend scripts/nav-back-browser.mjs with quickstart scenarios 8–9

**Checkpoint**: typed measures survive back and reload (005 SC-005).

---

## Phase 9: Polish & Cross-Cutting

- [X] T049 Bundle check vs T001 baseline: nav ≤ +3 KB gzip, home ≤ +4 KB gzip (record in quickstart.md)
- [X] T050 Run `npm test`, `npm run lint`, `npm run build`, all four browser scripts; `motion-perf-browser.mjs` within spec 004 limits incl. carousel
- [X] T051 [P] Docs: AGENTS.md (folder table `src/nav/`, views are routes), src/components/AGENTS.md (HomeScreen, BannerCarousel, "every overlay uses useBackLayer"), ARCHITECTURE.md (routing), BUSINESS_RULES.md (item draft, vencendo = 7 days), .agents/skills/browser-check/SKILL.md (nav script, scripts start at Início)
- [X] T052 [P] BACKLOG.md: move 005/006 to Done with date; keep follow-ups (CloseWatcher, styled confirm dialog, banner templates)
- [ ] T053 Manual pass on Android Chrome and iPhone Safari per quickstart (scenarios 1–12) — owner, on device

## Implementation notes (2026-10-09)

- T006: `useRoute` uses `useState` + `subscribe`, not `useSyncExternalStore`; the sync render added ~30 ms to "lista → orçamento" in `motion-perf-browser.mjs`.
- T019: the header arrow is `up()`: `history.back()` when there is an entry below, else `replace` with the parent route.
- T030/T036: tiles use `aspect-ratio: 1 / 0.94` and the carousel is 6.75rem tall so 360 × 640 fits without scroll.
- T047: drafts of quotes no longer in the list are pruned when the list or Início loads (`pruneItemDrafts`).
- Known edge: browser forward to a new orçamento that was never saved shows "Orçamento não encontrado".

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks all).
- US1 (Phase 3) depends on Phase 2 only. MVP: fixes the reported bug.
- US2 (Phase 4) depends on Phase 2; uses US1 layers for the header menu but works without them.
- US5 and US6 depend on T017 (HomeScreen shell); independent of each other.
- US3 depends on Phase 2; T039 touches the same editors as T020/T022 (do after US2).
- US4 depends on US1 (back closes the item modal through `requestClose`).
- Polish after the stories you ship.

## Parallel Opportunities

- T003 + T004 (routes and tests) alongside T005 drafting.
- T026/T027 (home domain) and T031/T032 (banners) can be written any time after Phase 1; they are pure.
- T042/T043 (item-draft storage) any time after Phase 1.
- T022 editors in parallel; T025 scripts in parallel with T023.

## Parallel Example: US5 + US6

```text
Task: "Implement quoteTileSummary/catalogUpdatedOn/settingsPending in src/domain/home.ts"
Task: "Unit tests in src/domain/home.test.ts"
Task: "Create src/data/banners.ts with visibleBanners"
Task: "Unit tests in src/data/banners.test.ts"
```

## Implementation Strategy

1. Phases 1–3 (routes + overlays on back) → ship: the Android exit bug is gone.
2. Phase 4 + 5 + 6 (Início as root with tiles and carousel) → ship together (005 and 006 enter together per spec assumption).
3. Phase 7 (deep links, reload, tabs in URL) → ship.
4. Phase 8 (item draft) → ship.
5. Phase 9 polish; final browser + manual pass.
