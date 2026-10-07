# Contract: UI

## Item block (`App.tsx`)

- "Detalhes do custo" becomes a button (same place, same label) that opens `CostDetailModal`. The `<details>` list is removed.
- `ItemForm` cost preview unchanged.

## `CostDetailModal` (new, `src/components/CostDetailModal.tsx`)

Props: `item`, `quote`, `catalog`, `isAdmin`, `marginMode` (spec 002), `onClose`, `onSetOverride(ref, price | null)`, `onUpdateCatalog(ref, price)`.

Layout (390px first):

1. Header: item title (`describeItem`) + close button.
2. Summary: Mão de obra, Vidros, Alumínios, Ferragens, Acessórios, adicionais do item, Custo, Margem (hidden in Autônomo; Vendedor label "· sem mão de obra"), Preço.
3. Groups in order Vidro, Alumínio, Ferragem, Acessório, Mão de obra. Each line: description, code, `quantity unit`, unit price, subtotal. Lines with surcharge show "+N% cor". Group total at the end of each group.

Editing (admin, draft, editable line):

- Unit price renders as a button. Tap → inline money input (prefilled with base price; `data-select-all`) + "Só neste orçamento", "Atualizar no catálogo", "Cancelar".
- Invalid value (empty, negative, text): actions disabled; previous price kept.
- "Só neste orçamento" → `onSetOverride(ref, value)`; line shows "preço deste orçamento".
- Overridden line (admin, draft): link "Voltar ao preço do catálogo" → `onSetOverride(ref, null)`.
- "Atualizar no catálogo" → `.remove-pop` `role="alertdialog"`: "Novos orçamentos usam o preço novo. Outros rascunhos mostram um aviso para atualizar. Emitidos não mudam." Sim / Não. Sim → `onUpdateCatalog(ref, value)`; banner "Catálogo atualizado".
- Aluminum: input is price per barra; hint shows derived R$/m.

Read-only cases (no button, hint text):

- vendedor or emitted: no hint, just values (overridden mark still shown).
- old item: "Recalcule o item para editar."
- inactive/missing source: "Código desativado no catálogo."
- labor: rate shown, not editable (rates live in Catálogo › Mão de obra / margem).

Close: button, Esc, backdrop. Page scroll position unchanged after close.

## App handlers

- `onSetOverride` → `persist(setPriceOverride(quote, catalog, ref, price, settings.marginMode))`.
- `onUpdateCatalog` (admin) → `setCatalogPrice` + `bumpCatalogVersion` → `repo.saveCatalog` → `setCatalog` → `persist(repriceDraft(quote, nextCatalog, mode).quote)`.
