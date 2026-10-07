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

Reduced motion: offsets 0, scale 1, durations ≤ `--dur-xs`, no height interpolation, no backdrop blur.

Rules: animate only `opacity` and `transform` (exception: `<details>` content height). No animation longer than `--dur-lg`. Exits shorter than entries.

## Component map

| Component | Enter | Exit | Mechanism |
| --- | --- | --- | --- |
| `Modal` backdrop | fade `--dur-md` | fade `--dur-sm` | `usePresence` + `[data-state]` |
| `Modal` panel ≤640px | translateY(`--motion-y`) + fade `--dur-lg` | reverse `--dur-sm` | same |
| `Modal` panel >640px | scale(`--motion-scale`) + fade `--dur-lg` | reverse `--dur-sm` | same |
| `Dropdown` list | `menu-in` `--dur-sm`, origin at trigger | reverse `--dur-xs` | `usePresence` |
| `HeaderMenu` | `menu-in` `--dur-sm`, origin top right | reverse `--dur-xs` | `usePresence` |
| `.remove-pop` confirmations | `menu-in` `--dur-sm` | reverse `--dur-xs` | `usePresence` |
| `CollapsibleSection` | content height `--dur-md` (where supported) + body fade | height collapse `--dur-md` | CSS `::details-content` + `interpolate-size` |
| Settings tabs | indicator slide `--dur-md`; panel fade `--dur-sm` | — | CSS vars from JS measure; keyed panel |
| Catálogo table switch | panel fade `--dur-sm` | — | keyed panel |
| Screen list → editor | from +`--motion-x` + fade `--dur-lg` | — (instant) | `data-nav="forward"` on screen root |
| Screen editor → list | from −`--motion-x` + fade `--dur-lg` | — | `data-nav="back"` |
| Screen menu sections | fade `--dur-md` | — | `data-nav="fade"` |

## `usePresence(open: boolean, exitMs: number)`

Returns `{ mounted: boolean; state: 'open' | 'closing' }`.

- `open` true → `mounted` true, `state` `open` immediately.
- `open` false → `state` `closing`, `mounted` stays true for `exitMs`, then false.
- `open` true again while closing → back to `open`, timer cleared.
- Unmount clears the timer.

## `Modal`

- Close triggers (button, Esc, backdrop) call internal `requestClose`: `state=closing`, `pointer-events: none` on backdrop, then `onClose()` after `--dur-sm`.
- Focus and scroll lock/restore unchanged.
