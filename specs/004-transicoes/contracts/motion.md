# Contract: motion system

## Tokens (`:root` in `src/index.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--dur-xs` | 100ms | small exits (menu, dropdown, popover); reduced-motion fade |
| `--dur-sm` | 150ms | modal exit, tab panel enter, small enters |
| `--dur-md` | 200ms | backdrop enter, section expand, menu-section screen fade |
| `--dur-lg` | 250ms | modal panel enter, list ↔ editor screen enter |
| `--ease-out` | cubic-bezier(0.2, 0, 0, 1) | entries |
| `--ease-in` | cubic-bezier(0.3, 0, 1, 1) | exits |
| `--ease-std` | cubic-bezier(0.2, 0, 0, 1) | state changes (height, indicator) |
| `--motion-y` | 12px | vertical entry offset |
| `--motion-x` | 16px | horizontal screen offset |
| `--motion-scale` | 0.98 | desktop modal / popover scale |

Reduced motion: offsets 0, scale 1, durations ≤ `--dur-xs`, no height interpolation, no backdrop blur, no tab indicator slide.

Rules: animate only `opacity` and `transform` / `translate` / `scale` (exception: `<details>` content height). Popover keyframes use the individual `translate`/`scale` properties so they compose with positioning `transform` (`.remove-pop`). Enter animations fill `backwards` (no lingering effect after they end); exits fill `both` until unmount. No animation longer than `--dur-lg`. Exits shorter than entries. All motion rules sit in the "Motion" block at the end of `index.css`.

## Component map

| Component | Enter | Exit | Mechanism |
| --- | --- | --- | --- |
| `Modal` backdrop | fade `--dur-md` | fade `--dur-sm` | internal `closing` state + `[data-state]` |
| `Modal` panel ≤640px | translateY(`--motion-y`) + fade `--dur-lg` | reverse `--dur-sm` | same |
| `Modal` panel >640px | scale(`--motion-scale`) + fade `--dur-lg` | reverse `--dur-sm` | same |
| `Dropdown` list | `menu-in` `--dur-sm`, origin at trigger | `menu-out` `--dur-xs` | `usePresence` |
| `HeaderMenu` | `menu-in` `--dur-sm`, origin top right | `menu-out` `--dur-xs` | `usePresence` |
| `SendMenu` (`.send-pop`) | `menu-in` from below (`--pop-dir: 1`) | `menu-out` `--dur-xs` | `usePresence` |
| `.remove-pop` (delete draft, remove item, emit name, settings `save-pop`) | `menu-in` `--dur-sm` | `menu-out` `--dur-xs` | `Presence` |
| `.remove-pop.cost-confirm` (inline in cost modal) | `menu-in` `--dur-sm` | — (in flow; keeping it would delay the layout jump) | CSS only |
| `CollapsibleSection` | content height `--dur-md` (where `interpolate-size` exists) + body fade | height collapse `--dur-md` | `::details-content` transitions, only after the first user toggle (`--animate` class) |
| Settings tabs | indicator slide `--dur-md`; panel fade `--dur-sm` | — | `--tab-x`/`--tab-w` from layout effect + `ResizeObserver`; `.tab-panel` |
| Catálogo table switch | panel fade `--dur-sm` | — | `.tab-panel` keyed by table |
| Screen list → editor | from +`--motion-x` + fade `--dur-lg` | — (instant) | `data-nav="forward"` on `.screen` |
| Screen editor → list | from −`--motion-x` + fade `--dur-lg` | — | `data-nav="back"` |
| Screen menu sections | fade `--dur-md` | — | `data-nav="fade"` |

## `usePresence(open: boolean, exit: 'xs' | 'sm' | 'md' | 'lg')`

Returns `{ mounted: boolean; state: 'open' | 'closing' }`. The exit time is read from `--dur-<exit>` (`motionMs`), so reduced motion shortens it too.

- `open` true → `mounted` true, `state` `open` immediately.
- `open` false → `state` `closing`, `mounted` stays true for the exit duration, then false.
- `open` true again while closing → back to `open`, timer cleared.
- Unmount clears the timer.

`<Presence open exit>{(state) => …}</Presence>` wraps the hook for conditional JSX (popovers inside lists).

Closing layers get `pointer-events: none`, so taps reach the page at once.

## `Modal`

- Close triggers (Fechar, Esc, backdrop) call internal `requestClose`: `data-state="closing"`, `pointer-events: none` on backdrop, then `onClose()` after `--dur-sm`. Parent-driven unmounts (submit, Cancelar inside the form) stay instant.
- Scroll lock and first-field focus run once on mount; restore on unmount.

## Screens (`App.tsx`)

- `navigate(view, nav)` replaces `setView`. Each screen renders inside `<div className="screen" key={view}>`.
- A layout effect sets `data-nav` on that element for `--dur-lg`, then removes it, so content mounted later (banners, totals) does not slide in. No React re-render.
- Children of `.shell` move, not `.shell` itself: a transformed ancestor would re-anchor the fixed `.action-bar`, which only fades.
- Leaving the list saves `scrollY`; returning restores it. Other screens open at the top.
