---
description: "Task list for Transições leves na interface"
---

# Tasks: Transições leves na interface

**Input**: Design documents from `specs/004-transicoes/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/motion.md, quickstart.md

**Tests**: performance and reduced-motion checks requested (SC-002, SC-004, SC-005). Browser scripts, no unit tests (no domain logic; Vitest runs in node).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Create scripts/motion-perf-browser.mjs per research R10 (Chrome, CDP CPU 4×, long tasks + frame times for modal open/close, section toggle, tab switch, list ↔ editor, list scroll; pass/fail summary)
- [x] T002 Run the perf script on the current code and save the baseline numbers in specs/004-transicoes/quickstart.md (section "Baseline")
- [x] T003 [P] Set `reducedMotion: 'reduce'` in the Playwright context of scripts/smoke-quote-browser.mjs and scripts/validate-catalog-browser.mjs

---

## Phase 2: Foundational (blocking)

- [x] T004 Add motion tokens (contracts/motion.md) to `:root`, retime `rise`/`menu-in` keyframes to use tokens and `--motion-*` variables, add the `prefers-reduced-motion` block, in src/index.css
- [x] T005 [P] Create src/components/usePresence.ts per contracts/motion.md

**Checkpoint**: app looks the same; reduced motion already disables existing offsets.

---

## Phase 3: User Story 4 - Leve em qualquer aparelho (P1)

**Goal**: remove heavy effects first so later animations start from a cheaper baseline.

- [x] T006 [US4] Remove `backdrop-filter` from `.section.collapsible-section` and `.action-bar`, compensate background opacity; remove per-section `rise` on mount, in src/index.css
- [x] T007 [US4] Re-run the perf script; record scroll improvement vs baseline in specs/004-transicoes/quickstart.md

---

## Phase 4: User Story 1 - Janelas e menus (P1) 🎯 MVP

**Goal**: overlays enter from their origin and exit faster.

**Independent Test**: quickstart manual steps 1–4.

- [x] T008 [US1] In src/components/Modal.tsx use `usePresence`, add internal `requestClose` (button, Esc, backdrop) that sets `data-state="closing"` then calls `onClose` after `--dur-sm`; keep focus and scroll lock/restore
- [x] T009 [US1] Modal backdrop/panel enter and exit styles (≤640px translateY, wider scale; closing layer `pointer-events: none`) in src/index.css
- [x] T010 [P] [US1] In src/components/Dropdown.tsx keep the list mounted while closing via `usePresence`; exit style in src/index.css
- [x] T011 [P] [US1] In src/components/AppHeader.tsx (`HeaderMenu`) use `usePresence` for the menu; exit style in src/index.css
- [x] T012 [US1] In src/components/App.tsx wrap both `.remove-pop` confirmations and the emit popover with `usePresence`; exit style in src/index.css

**Checkpoint**: steps 1–4 pass; smoke script green.

---

## Phase 5: User Story 2 - Seções e abas (P1)

**Goal**: sections reveal without jumps; tabs slide and fade.

**Independent Test**: quickstart manual steps 5–7.

- [x] T013 [US2] Add `interpolate-size: allow-keywords` and `details.collapsible-section::details-content` height/content-visibility transitions, plus `.collapsible-section__body` enter fade for `[open]`, in src/index.css
- [x] T014 [US2] In src/components/SettingsEditor.tsx add the tab indicator element, set `--tab-x`/`--tab-w` from the selected tab on change and resize, key the panel by tab id
- [x] T015 [US2] Tab indicator and panel fade styles in src/index.css
- [x] T016 [P] [US2] In src/components/CatalogEditor.tsx key the table content by `tab` so it fades on switch
- [x] T017 [US2] Run the perf script; if the "Itens" section height animation exceeds SC-002 with many items, add the opt-out class for that section (research R5)

**Checkpoint**: steps 5–7 pass.

---

## Phase 6: User Story 3 - Troca de tela com direção (P2)

**Goal**: forward/back/fade enter on screens; list keeps scroll.

**Independent Test**: quickstart manual step 8.

- [ ] T018 [US3] In src/components/App.tsx set `data-nav` (`forward` list→editor, `back` editor→list, `fade` menu sections) before each `setView`, and key the screen root by view so the enter animation runs once per change
- [ ] T019 [US3] In src/components/App.tsx save `window.scrollY` when leaving the list and restore it after returning
- [ ] T020 [US3] Screen enter keyframes by `data-nav`; remove `rise` from `.topbar` and `.quote-head` to avoid double motion, in src/index.css

**Checkpoint**: step 8 passes.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T021 Run the perf script (all checks) and reduced-motion manual pass (quickstart step 9); record results in specs/004-transicoes/quickstart.md
- [ ] T022 Compare gzip size of `dist/assets/*.js` before/after (≤ +2 KB)
- [ ] T023 [P] Document motion tokens, `usePresence`, and "transform/opacity only" rule in src/components/AGENTS.md
- [ ] T024 [P] Add "use motion tokens; no new animation library" to .agents/skills/ui-change/SKILL.md and reduced-motion/perf script notes to .agents/skills/browser-check/SKILL.md
- [ ] T025 Run `npm test`, `npm run lint`, `npm run build`, smoke and catalog browser scripts
- [ ] T026 Add the item to Done in BACKLOG.md

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T005) → US4 → US1 → US2 → US3 → Polish.
- US4 first so every later measurement starts from the cheaper baseline.
- US1, US2, US3 are independent after Foundational (they touch different components; all edit src/index.css, so CSS edits are sequential).

### Parallel Opportunities

- T003 with T001/T002.
- T005 with T004.
- T010 and T011 (different components; CSS appended sequentially).
- T016 with T014.
- T023 and T024.

## Implementation Strategy

1. MVP = US4 + US1 (lighter app + overlays with motion): most visible gain.
2. US2 sections/tabs.
3. US3 screens.
4. Polish with measurements.

## Notes

- Order relative to specs 002/003: independent. Suggested after 002/003 so the new `CostDetailModal` gets motion for free via `Modal`.
- Commit only when the owner asks; no agent co-author trailers.
