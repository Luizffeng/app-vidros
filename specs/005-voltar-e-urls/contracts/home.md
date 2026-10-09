# Contract: Início (spec 006)

## Layout (360–560 px wide)

```text
┌ sticky head: "App Vidros" / "Início" ······ [menu] ┐
│ ┌ banner carousel (full width, ~2:1, next peeks) ┐ │
│ └──────────────── • ○ ○ ──────────────────────────┘ │
│ ┌ Orçamentos ┐ ┌ Catálogo ┐                         │
│ │ icon       │ │ icon     │   square tiles, radius  │
│ │ summary    │ │ summary  │   = --radius, gap 12 px │
│ └────────────┘ └──────────┘                         │
│ ┌ Configurações ┐ ┌ Ajuda ┐                         │
│ └───────────────┘ └───────┘                         │
└ action bar: [ + Novo orçamento ] ───────────────────┘
```

Wide screens: content max 560 px (same as `.shell`), tiles max ~260 px.

## Tiles

| Tile | Summary text (first match) | Alert | Tap |
| --- | --- | --- | --- |
| Orçamentos | `{e} vencendo` (attention color) + `{d} rascunho(s)`; else `{n} emitido(s)`; none: `Nenhum orçamento ainda` | — | `/orcamentos` (fade) |
| Catálogo | `Atualizado em dd/mm/aaaa`; unparseable version: no line | — | `/catalogo/vidros` |
| Configurações | (none) | `!` badge + `Complete o cadastro da loja` when name/tradeName blank or phone blank | `/configuracoes/cadastro` |
| Ajuda | `Em breve` | — | disabled (`aria-disabled`) |

- Whole tile is one button/link with accessible name "Orçamentos: 2 vencendo, 5 rascunhos".
- Loading: summary line shows a placeholder bar; failure: `Não foi possível carregar`.
- Pluralization: `1 rascunho` / `2 rascunhos`, `1 emitido` / `2 emitidos`, `1 vencendo` / `2 vencendo`.

## Carousel

| Rule | Value |
| --- | --- |
| Slides | 2–5 (`visibleBanners`) |
| Auto advance | every 5000 ms, wraps last → first |
| Pause | while pointer down on the carousel; while focus inside; page hidden; carousel < 50% visible |
| Resume | 5000 ms after the last interaction ends |
| Manual | swipe (scroll-snap), dots |
| Reduced motion | no auto advance, instant scroll |
| Height | fixed ratio; text clamps to 2 lines; no layout shift between slides |
| Action | `route` → in-app push (back returns to Início); `url` → new tab |

Accessibility (W3C APG carousel): region `aria-roledescription="carrossel"` + `aria-label="Avisos"`; each slide `role="group"` `aria-roledescription="banner"` `aria-label="1 de 3"`; dots are buttons named by slide title, current one `aria-current="true"`; no live region while auto advancing.

## Motion

Uses spec 004 tokens: slide change via native smooth scroll; tiles press feedback ≤ `--dur-xs`; screen enter `fade` from menu/tiles.
