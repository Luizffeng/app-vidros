# Research: Transições leves na interface

Phase 0 of `/speckit-plan`. Each entry: Decision / Rationale / Alternatives.

## Findings in today's code

- Entry-only keyframes exist: `rise` (8px up + fade) on `.hero` (0.5s), `.topbar` and `.quote-head` (0.35s), every `.section.collapsible-section` (0.45s); `menu-in` (0.14s) on `.app-menu` and `.dropdown__list`. No exit animations anywhere (components unmount instantly).
- `Modal` (portal) has no enter animation; it locks body scroll and restores `scrollY` on unmount.
- `CollapsibleSection` is a native `<details>`; opening is instant. Chevron already rotates (`transition: transform 0.2s`).
- Settings tabs switch content instantly; the Catálogo "tabs" are a `Dropdown` ("Tabela do catálogo").
- Screens are `useState` views in `App`; no transition between them.
- No `prefers-reduced-motion` rule.
- Costly effects: `backdrop-filter: blur(8px)` on every collapsible section (re-composited while scrolling), `blur(12px)` on the fixed action bar over scrolling content, `blur(4px)` on the modal backdrop.

## R1. One motion scale (FR-006)

- **Decision**: CSS custom properties in `:root`:
  - durations `--dur-xs: 100ms`, `--dur-sm: 150ms`, `--dur-md: 200ms`, `--dur-lg: 250ms`
  - easings `--ease-out: cubic-bezier(0.2, 0, 0, 1)` (entries), `--ease-in: cubic-bezier(0.3, 0, 1, 1)` (exits), `--ease-std: cubic-bezier(0.2, 0, 0, 1)` for state changes
  - distances `--motion-y: 12px`, `--motion-x: 16px`, `--motion-scale: 0.98`
- **Rationale**: Material 3 "short/medium" durations and emphasized decelerate/accelerate curves; Apple HIG keeps UI motion brief. One table keeps every component consistent and lets reduced motion switch everything in one place.
- **Alternatives**: per-component values (today's state: 0.14s to 0.5s, inconsistent). Rejected.

## R2. Only compositor properties (FR-009, SC-002)

- **Decision**: animate `opacity` and `transform` only. Exception: section height via the native `<details>` mechanism (R5).
- **Rationale**: transform/opacity run on the GPU compositor without layout or paint per frame; this is what keeps 4× CPU throttling smooth.

## R3. Exit animations: tiny `usePresence` hook

- **Decision**: `src/components/usePresence.ts` (~25 lines): `usePresence(open, exitMs) → { mounted, state: 'open' | 'closing' }`. When `open` turns false it keeps the node mounted with `data-state="closing"` for `exitMs`, then unmounts. If `open` turns true again during closing, it cancels (last command wins, FR-007). Used by `Modal`, `Dropdown` list, `HeaderMenu`, and the `.remove-pop` confirmations.
  - `Modal` gets an internal `requestClose` (button, Esc, backdrop) that sets closing, then calls `onClose` after `--dur-sm`. Parent-driven unmounts stay instant (no regression).
  - While closing, `pointer-events: none` on the closing layer so taps reach the page immediately.
- **Rationale**: no library (FR-012); same pattern for all overlays; CSS does the visuals via `[data-state]`.
- **Alternatives**:
  - CSS `@starting-style` + `transition-behavior: allow-discrete` on always-mounted elements. Elegant, but needs every overlay kept in the DOM and has uneven browser support for discrete `display` transitions. Rejected for now.
  - Framer Motion / React Transition Group: +10–30 KB, violates FR-012.

## R4. Modal and overlay visuals (FR-001, FR-002)

- **Decision**:
  - Backdrop: fade `--dur-md` in, `--dur-sm` out. Keep its `blur(4px)` (static layer), dropped under reduced motion.
  - Panel, viewport ≤ 640px: `translateY(var(--motion-y))` + fade in `--dur-lg` with `--ease-out`; out `--dur-sm` `--ease-in`. Wider: `scale(var(--motion-scale))` + fade. Layout stays centered as today (no bottom-sheet redesign).
  - Dropdown list, app menu, remove-pop: existing `menu-in` retimed to `--dur-sm`, `transform-origin` at the trigger side; exit = reverse at `--dur-xs`.
- **Rationale**: matches "sobe de baixo no celular / cresce no computador" with minimal CSS.

## R5. Collapsible sections (FR-003)

- **Decision**: progressive enhancement on the native `<details>`:
  - Where supported: `interpolate-size: allow-keywords` on `:root` and `details::details-content { transition: height var(--dur-md) var(--ease-std), content-visibility var(--dur-md) allow-discrete; height: 0; overflow: clip }` + `details[open]::details-content { height: auto }`.
  - Everywhere: `.collapsible-section__body` fades/translates in (`--dur-md`) when the section opens, so browsers without height interpolation still show where content came from.
  - Remove the per-section `rise` on mount.
- **Rationale**: no JS measuring, native semantics kept; browsers without support degrade to today's instant open plus a fade (US2 scenario 4).
- **Alternatives**: JS height measuring or `grid-template-rows: 0fr → 1fr` (requires replacing `<details>` with custom disclosure and always rendering content). Rejected for simplicity.
- **Risk**: height interpolation recalculates layout per frame. Mitigation: only one section animates at a time; measured in the perf script (R9). If "Itens" with many items drops frames under throttling, disable height animation for that section only (fade stays).

## R6. Tabs (FR-004)

- **Decision**: Settings tabs get one absolutely positioned indicator inside `.tabs`, moved with `transform: translateX(var(--tab-x))` and `width: var(--tab-w)` set from the selected tab's `offsetLeft/offsetWidth` on change and on resize. Panel content keyed by tab id with an enter fade (`--dur-sm`). Catálogo table switch (dropdown) gets the same panel fade.
- **Rationale**: one measurement per change, compositor transform; width change affects only the isolated indicator.

## R7. Screen transitions (FR-005)

- **Decision**: CSS enter-only animation on the screen root, keyed by view. `App` sets `data-nav="forward" | "back" | "fade"` before changing view:
  - list → editor: `forward` (from `+var(--motion-x)` + fade, `--dur-lg`)
  - editor → list: `back` (from `-var(--motion-x)`)
  - menu sections (Orçamentos/Catálogo/Configurações): `fade` (`--dur-md`)
  - Replaces the per-screen `rise` on `.topbar` / `.quote-head`.
  - List scroll position saved when leaving the list and restored on return (US3 scenario 2).
- **Rationale**: elements stay interactive during the animation (FR-007); zero API support concerns; cheapest option.
- **Alternatives**: View Transitions API (`document.startViewTransition`). Gives old+new cross-fade, but blocks pointer input for the transition and snapshots the viewport; on low-end devices the snapshot costs a frame or two. Rejected for now; can be revisited later.

## R8. Reduced motion (FR-008, SC-004)

- **Decision**: `@media (prefers-reduced-motion: reduce)` sets `--motion-y: 0`, `--motion-x: 0`, `--motion-scale: 1`, all durations to `--dur-xs` or 0 for height, disables `interpolate-size`, removes the modal backdrop blur. Keyframes read the variables, so one block covers everything.

## R9. Removing heavy blur (FR-010, SC-005)

- **Decision**: drop `backdrop-filter` from `.section.collapsible-section` and `.action-bar`; compensate with slightly more opaque backgrounds (visual parity checked in screenshots). Keep blur only on the modal backdrop.
- **Rationale**: backdrop blur over scrolling content forces re-rasterization every scroll frame; it is the largest avoidable cost on low-end phones.

## R10. Verification

- **Decision**:
  - Browser scripts run with `reducedMotion: 'reduce'` in the Playwright context, so no extra waits are needed (SC-006).
  - New `scripts/motion-perf-browser.mjs`: Chrome with CDP `Emulation.setCPUThrottlingRate(4)`, records long tasks (`PerformanceObserver('longtask')`) and frame times while opening/closing a modal, toggling sections, switching tabs, navigating list ↔ editor, and scrolling the list; prints a pass/fail summary against SC-002/SC-005. Run before and after (baseline from current main).
  - Manual check on a real phone with "reduzir movimento" on and off.
