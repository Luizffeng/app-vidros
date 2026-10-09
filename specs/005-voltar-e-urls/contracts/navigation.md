# Contract: navigation (back, URLs, layers, guards)

UI contract for `src/nav/` and its callers. Behavior is what the user sees; names are the module surface the plan commits to.

## Routes

| URL | Screen | Parent | Back arrow in header |
| --- | --- | --- | --- |
| `/` | Início | (leaves app) | no |
| `/orcamentos` | Orçamentos | `/` | yes → Início |
| `/orcamentos/:id` | Orçamento | previous screen, else `/orcamentos` | yes (existing) |
| `/catalogo/:tabela` | Catálogo | `/` | yes → Início |
| `/configuracoes/:aba` | Configurações | `/` | yes → Início |

Query on `/orcamentos`: `filtro=rascunhos|emitidos`, `busca=<texto>`. Written with `replaceState`.

## What "back" does (device back, gesture, browser back, header arrow)

Evaluated top to bottom; first match wins.

1. An overlay layer is open → close the top one only (same effect as its close button). Item modal: keeps an item draft (data-model).
2. A leave guard is active and the next step leaves the screen → `confirm("Descartar as alterações não salvas?")`; cancel keeps the user on the screen and the history consistent.
3. Previous app entry exists → go there with `data-nav="back"`.
4. On Início → browser default (leave the app).

Header back arrow = step 3 (`history.back()`), never a new push, so the next device back does not reopen the screen (spec 005 FR-005, US2 scenario 7).

## Module surface

```text
src/nav/routes.ts      parseRoute(location) → Route; formatRoute(Route) → string; parentOf(Route); ancestors(Route)
src/nav/navigator.ts   push(route, nav?) · replace(route) · back() · onChange(listener)
                       pushLayer(onBack) → release(fromUi: boolean)
                       addGuard(message, active) → remove
src/nav/useRoute.ts    useRoute() → { route, nav: 'forward'|'back'|'fade'|null }
src/nav/useBackLayer.ts useBackLayer(open: boolean, onBack: () => void)
src/nav/useLeaveGuard.ts useLeaveGuard(active: boolean, message?: string)
```

Rules:

- `push` while a UI-initiated `history.back()` is pending waits for its `popstate`.
- `useBackLayer(open, onBack)`: on `open` true → `pushLayer`; on `open` false not caused by back → `release(true)` (calls `history.back()`); on back → `onBack()` then `release(false)`.
- Boot: `replaceState` to `/`, then push each ancestor and the current route (R3). Sets `history.scrollRestoration = 'manual'`.
- Screen changes between top sections (menu, home tiles) use `nav: 'fade'`; into an orçamento `forward`; pops use the `idx` comparison.

## Callers

| Overlay / place | Hook |
| --- | --- |
| `Modal` (item, tipo do item, prévia do PDF, Detalhes do custo, Enviar texto) | `useBackLayer(true, requestClose)` while mounted |
| `useDismiss` users: `Dropdown`, `HeaderMenu`, `SendMenu`, Settings margin confirm | `useBackLayer(open, () => onDismiss('back'))` inside `useDismiss` |
| Editor inline confirms (remover item, excluir rascunho, emitir sem nome) | `useBackLayer(pending, clearPending)` in `App` |
| `CatalogEditor`, `SettingsEditor` | `useLeaveGuard(dirty)` |

`DismissReason` gains `'back'`.

## Non-goals

- No route for overlays (`?modal=`): reload never reopens them (spec FR-007).
- No route animation beyond spec 004 `data-nav`.
