# Components

React UI. No price formulas and no Supabase queries except `LoginScreen` (password sign-in).

## Files

| File | Owns |
| --- | --- |
| `App.tsx` | Renders the screen of `useRoute()` (`home` \| `quotes` \| `quote` \| `catalog` \| `settings`); screen changes only through `src/nav/navigator.ts` (`push`, `replace`, `goTop` for menu/tiles, `up` for the header arrow). List scroll restore, list filter/search in the URL, quote load by URL id, item draft banner and restore (`src/data/itemDraft.ts`). Quote state, persist queue, emit, revision, delete, PDF/share actions. Also customer, costs, discounts, emitted action bar (Prévia, Baixar PDF, Enviar), send popover (`SendMenu` above Enviar: "Enviar PDF" with `pdfShareMessage`, "Enviar texto") and text share modal ("Copiar" + Enviar) in the same file. Passes `settings.marginMode` to domain calls, `ItemForm`, `CatalogEditor`; outdated-draft banner ("Atualizar valores" → `repriceDraft`). |
| `CostDetailModal.tsx` | "Detalhes do custo" window per item: summary + `composeCost` groups; admin draft edits a line price via `onSetOverride` (→ `setPriceOverride`) or `onUpdateCatalog` (→ `onUpdateCatalogPrice` in `App.tsx`: catalog save + reprice); labor line via `onSetLaborRate` (→ `setItemLaborRate`) or `onUpdateLaborCatalog`. `ItemForm` keeps an item's `laborRate` on edit and previews with the quote's own prices. |
| `ItemForm.tsx` | Modal fields per product kind. Markup percent → fraction. Hides margin field/line in Autônomo mode. `initialState` restores an item draft; `onStateChange(state, dirty)` reports raw input. |
| `HomeScreen.tsx` | Início: `BannerCarousel`, tiles (Orçamentos, Catálogo, Configurações, Ajuda "Em breve") with summaries from `src/domain/home.ts`. No action bar. |
| `BannerCarousel.tsx`, `useCarouselAutoplay.ts` | One fixed banner frame; slides scroll-snap inside it (no peek, no dots), banners from `src/data/banners.ts`; autoplay 5 s with pauses. |
| `CatalogEditor.tsx` | Catalog tables (table dropdown, search, situation filter), version bump. Hides "Margem padrão" in Autônomo mode. Tab comes from the URL; unsaved edits use `useLeaveGuard`. |
| `SettingsEditor.tsx` | Tab comes from the URL; unsaved edits use `useLeaveGuard`. Tabs Cadastro (expandable Estabelecimento), Orçamento (sections Cálculo de margem with confirm on change, Validade padrão, Texto final no WhatsApp), Logo (preview + actions side by side). One card + `h2` per section, explanation under the title (`.section-hint`). Sliding tab indicator (`.tabs__indicator`). |
| `CollapsibleSection.tsx` | `<details>` card with heading and chevron. Editor sections and Settings › Cadastro. Height/fade animation only after the first user toggle. |
| `AppHeader.tsx` | Title, optional back arrow (`onBack`), hamburger menu: Início, Orçamentos, Catálogo, Configurações (hidden for `vendedor`), Ajuda, Sair. Owns `AppSection` and the section icons. `HeaderMenu` is also used in the editor head (`App.tsx`). |
| `selectAllOnFocus.ts` | Global listener (installed in `main.tsx`): `inputMode="decimal"` and `data-select-all` inputs select their value on focus. |
| `LoginScreen.tsx` | Email/password form. |
| `PdfPreview.tsx` | pdf.js preview of a blob. |
| `Dropdown.tsx`, `Modal.tsx`, `SearchField.tsx`, `useDismiss.ts` | Shared widgets. `Modal` plays its exit on Fechar/Esc/backdrop/device back before calling `onClose`. `Modal` and `useDismiss` call `useBackLayer`, so every overlay built on them takes one history entry. |
| `usePresence.ts` | `usePresence(open, exit)` / `<Presence>` keep an overlay mounted with `data-state="closing"` for its exit; `motionMs` reads `--dur-*`. |
| `useScrollEdges.ts` | Called once in `App`. Sets `--head-edge` / `--bar-edge` (0–1, follow the first and last 32px of scroll) on `<html>`; CSS fades the header line and the action bar fade with them. |

Domain calls go through `src/domain/quote.ts` and `priceItem`. Persistence is the module-level `repo` from `createRepository()` inside `App.tsx`.

## Boundaries

- Search `App.tsx` for the handler (`onEmit`, `persist`, `onDeleteDraft`, `openNew`) and read that region. Do not load the whole file, and do not read the icon functions at the bottom, unless the task is those icons.
- `readOnly` means `quote.status === 'emitted'`. Keep emit/delete rules in the domain; the UI should keep calling `emitQuote` / checking `draft`.
- Screen header (title, back/delete/menu, and tabs when the screen has them) sits inside `<div className="sticky-head">` so it stays on top while scrolling. Banners and content go below it.
- `HeaderMenu` is always the last (rightmost) control in a screen header. Screen actions (delete, revise) go to its left.
- Admin gate is `access.role !== 'vendedor'`. Role loading stays in `src/auth/access.tsx`.
- Motion (spec `specs/004-transicoes/contracts/motion.md`): use the `--dur-*`, `--ease-*`, `--motion-*` tokens in `:root`; animate only `opacity` and `transform`/`translate`/`scale` (the `<details>` height is the one exception); enter ≤ `--dur-lg`, exit shorter; rules go in the "Motion" block at the end of `index.css`, which also holds the single `prefers-reduced-motion` block. New overlay: render while `usePresence(...).mounted`, put `data-state` on it, add it to the `[data-state='closing']` rule. Screen changes go through `src/nav/navigator.ts` (`push(route, nav)`, `replace`, `goTop`, `up`); the direction lands in `data-nav`. No animation library.
- Back button: every overlay (window, popover, inline confirm) must close on device back. Use `Modal` or `useDismiss`, or call `useBackLayer(open, onBack)` directly. Check with `scripts/nav-back-browser.mjs`.

## Skip unless needed

- `CatalogEditor.tsx` and `SettingsEditor.tsx` on a quote-flow task.
- `ItemForm.tsx` on a list/PDF/auth task.
- `src/data/defaultLogo.ts` when editing the logo picker. Use `src/data/logo.ts`.
