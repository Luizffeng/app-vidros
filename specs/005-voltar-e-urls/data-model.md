# Data model: back navigation, URLs, item draft, home

No change to stored `Quote`, `Catalog`, `AppSettings` or Supabase schema. New shapes are in-memory, in the URL/history, or in `localStorage` on the device.

## Route (URL)

```text
Route =
  | { screen: 'home' }                                          /                      
  | { screen: 'quotes', filter?: 'draft' | 'emitted', q?: string }  /orcamentos?filtro=&busca=
  | { screen: 'quote', id: string }                            /orcamentos/:id
  | { screen: 'catalog', tab: CatalogTab }                     /catalogo/:tabela
  | { screen: 'settings', tab: SettingsTab }                   /configuracoes/:aba
```

- `CatalogTab` slugs: `vidros`, `kit-box`, `acessorios`, `aluminios`, `configuracao` (map to `CatalogEditor` `Tab`).
- `SettingsTab` slugs: `cadastro`, `orcamento`, `logo` (map to `register`, `quote`, `logo`).
- Parent: `quote` → `quotes` → `home`; `catalog`, `settings`, `quotes` → `home`; `home` has none.
- Validation: unknown path → `home`; unknown tab → first tab; `quote` id not found → `quotes` + notice "Orçamento não encontrado"; admin-only screen for vendedor → `home`.
- Tab and list filter/search changes use `replaceState` (no back step).

## History entry state

```text
HistoryState = { app: 'app-vidros', idx: number, layer?: number }
```

- `idx`: position in the app's stack; drives direction (`back` when it decreases).
- `layer`: present on entries pushed for an open overlay; same URL as the screen under it.
- Entries without `app` (outside the app) are never produced by the app.

## Back layer (runtime)

```text
BackLayer = { id: number, onBack: () => void }
```

Stack in the navigator. Push on overlay open, pop on close. Top layer receives `popstate`. UI-initiated close calls `history.back()` and sets `expectedPops += 1`.

## Leave guard (runtime)

```text
LeaveGuard = { id: number, message: string, active: () => boolean }
```

Checked before any screen change (in-app or `popstate`). One active guard is enough to ask.

## Item draft (localStorage)

Key: `app-vidros:item-draft:{quoteId}`

```text
ItemDraftRecord = {
  create?: ItemFormState          // one unfinished new item
  edits: { [itemId]: ItemFormState }  // unsaved edits of existing items
  savedAt: string                 // ISO
}

ItemFormState = {                 // flat, one key per ItemForm input (src/data/itemDraft.ts)
  kind: ProductKind
  spanCm, widthMm, heightMm, glassColor, profileColor, thicknessMm, subtype,
  finish, espelhoColor, espelhoThickness, markup, customDesc, customAmount, note: string
  hasLatch: boolean
  extraRows: { description: string, amount: string, committed: boolean }[]
}
```

"Differ" is compared with sorted keys, trimmed text, and empty extra rows ignored.

Rules:

- Write on item modal close by back / Esc / Fechar / outside tap when `fields` differ from the empty form for that kind (create) or from the item (edit).
- Delete the part on: "Cancelar", successful add/save, "Descartar". Delete the whole key on emit and on quote delete.
- Ignore and delete a record whose quote no longer exists or is emitted.
- Never read by pricing, totals, PDF, share text.

## Banner (app data, `src/data/banners.ts`)

```text
Banner = {
  id: string
  title: string            // ≤ ~6 words
  text: string             // ≤ 2 lines at 360 px
  image?: string           // /banners/*.webp
  action?: { route: Route } | { url: string }
  from?: string            // ISO date, inclusive
  until?: string           // ISO date, inclusive
}
```

`visibleBanners(all, now)`: in date window, order kept, max 5; if fewer than 2, use `DEFAULT_BANNERS`.

## Module tile summary (computed)

```text
QuoteTileSummary = { expiring: number, drafts: number, emitted: number, total: number }
SettingsPending = ('missing-name' | 'missing-phone')[]
catalogUpdatedOn(version: string): Date | null
```

- `expiring`: emitted quotes whose validity (stored `validUntil`, else computed from emission + default days) is between today and today + 7 days, inclusive. Already expired do not count.
- Text rules in [contracts/home.md](contracts/home.md).
