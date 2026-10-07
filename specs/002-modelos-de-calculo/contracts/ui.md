# Contract: UI

## Configurações › Orçamento — seção "Cálculo de margem"

- Placed in the existing `quote` tab of `SettingsEditor`, above "Validade padrão".
- Three rows, one per mode. Each row: checkbox-styled control (radio semantics: `role="radio"` / native `input type="radio"` styled as a box, one group name), mode name (Empresa / Vendedor / Autônomo) in bold, and the description from `data-model.md` beside it.
- Selecting a row changes only the screen draft. Leaving without Salvar keeps the saved mode (FR-002).
- Salvar (existing action bar button):
  - mode unchanged → saves as today, no warning (US2 scenario 5).
  - mode changed → `.remove-pop` `role="alertdialog"` anchored to Salvar:
    - text: "Novos orçamentos passam a usar este cálculo. Rascunhos mostram um aviso para atualizar. Orçamentos emitidos não mudam."
    - buttons: "Sim" (`remove-pop__yes`), "Não".
    - Não / tap outside → nothing saved, popover closes.
    - Sim → save settings only, banner "Configurações salvas." No quote is changed.
- Vendedor role never reaches Settings (existing gate).

## Editor — aviso de rascunho desatualizado

- Shown at the top of the draft editor (below the head, above customer) when `draftOutdated(quote, catalog, settings.marginMode)` is not null. Not shown for emitted quotes.
- Warning style (yellow, compact: text left, small button right), one banner with one button "Atualizar valores". No "keep values" option. Text by flags (words in `**` rendered bold with `<strong>`), with " em DD/MM/AAAA" when the date is known (`outdatedSince`: catalog version date, `AppSettings.marginModeChangedAt`; both flags use the latest):
  - catalog only: "O **catálogo** foi atualizado em 06/10/2026."
  - margin only: "O **cálculo de margem** mudou em 07/10/2026."
  - both: "O **catálogo** e o **cálculo de margem** mudaram em 07/10/2026."
- Tap → `repriceDraft` + persist. Banner is replaced by a smaller one without button: "Valores atualizados." (green). If `failed > 0` it stays yellow and adds "1 item manteve o valor anterior." / "N itens mantiveram o valor anterior.". Cleared when another quote opens.
- Available to admin and vendedor (writes only the quote).
- Revisions created from an older emitted quote show the banner like any draft.

## Item form (`ItemForm`)

- New prop `marginMode`.
- Autônomo: no "Margem (%)" field; preview has no margin line. Stored `markup` is preserved on edit.
- Vendedor: margin line label "Margem (N%) · sem mão de obra".
- Preview uses `priceItem(catalog, input, marginMode)`.

## Item cost detail (`App`, "Detalhes do custo")

- Reads `item.result.breakdown.marginMode ?? 'empresa'`.
- Same label rules as the form.

## Catálogo › Mão de obra / margem (`CatalogEditor`)

- New prop `marginMode`. Autônomo hides the "Margem padrão" block; labor rates stay.

## Customer output

PDF and WhatsApp text unchanged (they never show cost, margin or labor).
