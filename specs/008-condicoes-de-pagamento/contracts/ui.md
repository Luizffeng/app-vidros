# Contract: UI and customer copy — spec 008

Usable at 360 px. Reuse `Section` + textarea pattern from “Texto final no WhatsApp” (`SettingsEditor`).

## Settings › Orçamento

| Element | Copy / behavior |
| --- | --- |
| Section title | Condições de pagamento |
| Section hint | Aparece no PDF e no WhatsApp de todo orçamento. |
| Control | `<textarea>` , `rows={3}`, `maxLength={500}`, class reuse `settings-cta` or equivalent |
| `aria-label` | Condições de pagamento |
| Placeholder | `Condições de pagamento à combinar.` |
| Empty value | `""` — placeholder visible; nothing stored as placeholder text |
| Save | Same “Salvar” / dirty flow as validity and WhatsApp CTA on this tab |
| Who sees | Same gate as Configurações › Orçamento today |

## WhatsApp / share text (`quoteShareText`)

Order of trailing commercial lines:

1. `*Total {brl}*`
2. blank line + `paymentTerms` **only if** `paymentTerms.trim()` non-empty (user text as-is; preserve internal newlines if textarea has them — join with `\n`)
3. blank line + `shareCta` if non-empty (existing)
4. blank line + `_Validade da proposta: {date}_` (existing)

No automatic title “Condições de pagamento” in the message.

## PDF (`generateQuotePdf`)

After the bold `TOTAL:` line (and discount/subtotal block above it):

- If `settings.paymentTerms.trim()` non-empty: print the text wrapped, font ~9–10, normal weight, small gap under TOTAL.
- If empty: no extra lines, no label.

Header “Validade: …” unchanged.

## Negative contract (must not)

- Show a heading or empty box when `paymentTerms` is blank or whitespace.
- Put measures finais, BOM, margin, or cost near this text.
- Per-quote editor for payment terms in this version.
- Persist the placeholder string as the saved value on first open.
