# Contract: UI — spec 009

360 px. Internal-only — never customer proposal.

## Item — Medidas finais

- Entry: icon button or text button on item card: **Medidas finais** (visible draft + emitted if account can write).
- Opens `Modal` title “Medidas finais: {tipo}”.
- Fields from `seedFinalMeasures` / saved array; labels + decimal inputs.
- Hint under title: “Usadas só na loja. Não saem no PDF nem no WhatsApp.”
- Actions: Cancelar · Salvar (Salvar disabled if unchanged — same pattern as item edit).
- Emitted: does **not** open pricing ItemForm; only this modal.

## Quote — Fotos

- `Section` or `CollapsibleSection` title **Fotos**, hint: **Adicione fotos da obra, projetos, medidas ou anotações.**
- Count pill `n/10`.
- Grid of thumbnails; tap opens fullscreen/lightbox; trash removes (confirm if needed — ConfirmPop).
- Add control: file input `image/*` + capture if available; disabled at 10 with reason `.btn-reason`: “Máximo de 10 fotos neste orçamento.”
- Expired photo: placeholder “Expirada” (no crash).
- Visible draft + emitted when can write; read-only account: view only if we already show quote (no add).

## Negative / firewall

- PDF prévia, WhatsApp text, `describeItem` customer lines: **no** final measures, **no** photo bytes or filenames.
- Item “Editar” (pricing) remains blocked on emitted.
