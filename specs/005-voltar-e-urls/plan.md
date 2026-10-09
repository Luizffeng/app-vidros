# Implementation Plan: Botão voltar, endereço por tela e Início (specs 005 + 006)

**Branch**: `005-voltar-e-urls` (work on `main`, as in 004) | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md) + [../006-pagina-inicial/spec.md](../006-pagina-inicial/spec.md)

**Input**: Feature specifications `specs/005-voltar-e-urls/spec.md` and `specs/006-pagina-inicial/spec.md` (planned together: Início is the root of the back navigation).

## Summary

A small History API layer (`src/nav/`) replaces `useState<View>` in `App`: every screen gets a Portuguese URL (`/`, `/orcamentos`, `/orcamentos/:id`, `/catalogo/:tabela`, `/configuracoes/:aba`), and every overlay (modal, dropdown, menu, inline confirm) takes one history entry, so the Android back button closes the top overlay, then walks back one screen, and leaves the app only from Início. Deep links rebuild the parent chain at boot; tabs and list filters use `replaceState`; unsaved Catálogo/Configurações ask before leaving. The item form keeps what was typed as a device-local item draft per orçamento. A new Início screen shows a fixed banner carousel (CSS scroll-snap, 5 s auto advance with pause on touch/focus, reduced-motion aware) and a 2-column grid of module tiles with computed summaries (vencendo/rascunhos, catálogo atualizado em, pendência de cadastro). No library, no stored shape change, no SQL.

## Technical Context

**Language/Version**: TypeScript 5, React 19, CSS

**Primary Dependencies**: none new (History API, `IntersectionObserver`, CSS scroll-snap)

**Storage**: `localStorage` for item drafts (device only); no change to IndexedDB/Supabase shapes

**Testing**: Vitest (routes, home summaries, banners, item-draft helpers); new Playwright script `scripts/nav-back-browser.mjs`; existing smoke/catalog/motion scripts; manual Android check

**Target Platform**: Chrome Android (primary), Safari iOS, desktop Chrome/Edge/Firefox; Cloudflare Pages SPA fallback already in `public/_redirects`

**Project Type**: single-page web app

**Performance Goals**: back response ≤ 100 ms (spec 005 SC-004); Início ready as fast as the list with 500 quotes (006 SC-005); carousel smooth at 4× CPU (006 SC-006)

**Constraints**: nav ≤ +3 KB gzip; home ≤ +4 KB gzip (no images); transform/opacity motion only (spec 004); usable at 360 px; no new dependency

**Scale/Scope**: new `src/nav/` (5 small files), `src/domain/home.ts`, `src/data/banners.ts`, `src/data/itemDraft.ts`, `HomeScreen.tsx` + `BannerCarousel.tsx`; edits to `App.tsx`, `AppHeader.tsx`, `Modal.tsx`, `useDismiss.ts`, `ItemForm.tsx`, `CatalogEditor.tsx`, `SettingsEditor.tsx`, `index.css`; 1 new browser script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | N/A | `priceItem` untouched; item drafts never reach pricing until the user submits. |
| II. Mobile-First Field Quoting | Pass | Fixes the Android back exit mid-quote; keeps typed measures; Início fits 360 × 640. |
| III. Quote Immutability & Revisions | Pass | Item drafts live outside `Quote` and are dropped on emit; emitted quotes stay read-only. |
| IV. Storage Abstraction | Pass | No repository change; draft storage is a UI-side helper in `src/data/`, not in domain. |
| V. Simplicity & Determinism | Pass | Own ~150-line router instead of a library; pure route and summary functions with tests. |
| Workflow: UI usable at ~390px | Pass | Quickstart scenario 12 (360 × 640). |

Post-design re-check: passes. Note: `DECISIONS.md` "Single shop" is under revision (SaaS), not affected by this plan.

## Project Structure

### Documentation (this feature)

```text
specs/005-voltar-e-urls/
├── spec.md
├── plan.md                 # this file (covers 005 + 006)
├── research.md             # R1–R13
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── navigation.md       # routes, back order, layers, guards
│   └── home.md             # Início layout, tiles, carousel
├── checklists/requirements.md
└── tasks.md                # next: /speckit-tasks
specs/006-pagina-inicial/
├── spec.md · benchmark.md · checklists/requirements.md
└── plan.md                 # pointer to this plan
```

### Source Code (repository root)

```text
src/
├── nav/                         # new module
│   ├── routes.ts (+ .test.ts)   # Route parse/format/parent/ancestors (pure)
│   ├── navigator.ts             # history stack, idx/direction, layers, guards, pending-back queue
│   ├── useRoute.ts              # React subscription
│   ├── useBackLayer.ts
│   └── useLeaveGuard.ts
├── domain/
│   └── home.ts (+ .test.ts)     # quoteTileSummary, catalogUpdatedOn, settingsPending
├── data/
│   ├── banners.ts (+ .test.ts)  # fixed banners + visibleBanners
│   └── itemDraft.ts (+ .test.ts)# localStorage read/write/remove per quote
├── components/
│   ├── App.tsx                  # route-driven screens; quote load by id; item-draft wiring; inline confirms as layers
│   ├── HomeScreen.tsx           # new: carousel + tiles + action bar
│   ├── BannerCarousel.tsx       # new: scroll-snap + autoplay
│   ├── AppHeader.tsx            # AppSection + 'home'; menu "Início"; optional back arrow
│   ├── Modal.tsx                # useBackLayer
│   ├── useDismiss.ts            # useBackLayer, reason 'back'
│   ├── ItemForm.tsx             # initialState / onStateChange (ItemFormState)
│   ├── CatalogEditor.tsx        # tab from route; useLeaveGuard
│   └── SettingsEditor.tsx       # tab from route; useLeaveGuard; open on a given tab
└── index.css                    # .home-*, .carousel-*, .tile-* using spec 004 tokens
public/banners/                  # optional banner images
scripts/nav-back-browser.mjs     # new
```

Docs at implement time: `AGENTS.md` folder table (`src/nav/`), `src/components/AGENTS.md` (HomeScreen, BannerCarousel, back layers rule: "every overlay uses useBackLayer"), `ARCHITECTURE.md` (routing replaces view state), `BUSINESS_RULES.md` (item draft, vencendo = 7 days), `.agents/skills/browser-check/SKILL.md` (new script; smoke starts at Início).

**Structure Decision**: existing single-app layout plus one new top-level module `src/nav/` (navigation is neither domain nor a component).

## Phases

- **Phase 0**: [research.md](research.md) (R1–R13). No open clarifications.
- **Phase 1**: [data-model.md](data-model.md), [contracts/navigation.md](contracts/navigation.md), [contracts/home.md](contracts/home.md), [quickstart.md](quickstart.md).
- **Phase 2** (`/speckit-tasks`): suggested order:
  1. `routes.ts` + tests; `navigator.ts` + hooks; App reads route (screens only, no Início yet: `/` renders the list temporarily).
  2. Back layers in `Modal`, `useDismiss`, inline confirms; leave guards. Ship point: Android back fixed (spec 005 US1–US2 minus Início).
  3. Início: `home.ts` + tests, `banners.ts`, `HomeScreen`, `BannerCarousel`, menu "Início", header back arrows; `/` → Início.
  4. URL details: deep-link chain, tabs/filters in URL, not-found, role redirect (spec 005 US3).
  5. Item draft: `ItemFormState`, `itemDraft.ts`, App wiring, notice (spec 005 US4).
  6. Browser script, docs, bundle check, Android manual pass.

## Risks

- **Overlay ↔ history races** (UI close then immediate navigation, double back taps): mitigated by the pending-back queue (R2); covered by quickstart scenarios 1–2 and fast double `goBack()` in the script.
- **`App.tsx` size** (~1,800 lines) grows with routing: keep route → screen mapping thin; Início in its own component.
- **Smoke script assumptions** (starts on the list): update scripts to go Início → Orçamentos first.
- **iOS Safari edge swipe** shows the previous page snapshot before `popstate`: overlay closes after the gesture; acceptable, spot-checked.
- **Carousel auto advance vs research advice** (NN/g: no autoplay on mobile): owner decision; pause on touch/focus/off-screen and reduced motion kept.
- **Item draft field names coupled to `ItemForm` state**: `ItemFormState` is versioned implicitly by kind; unknown fields are ignored on restore.

## Complexity Tracking

None.
