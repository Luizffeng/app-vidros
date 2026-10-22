# Quickstart validation: Condições de pagamento (008)

## Prerequisites

- App in local mode or staging with a writable account.
- At least one draft or emitted quote with items (for PDF/WhatsApp).
- `npm test` green before manual checks.

## Automated

```bash
npx vitest run src/data/defaultSettings.test.ts src/domain/quote.test.ts src/pdf/generateQuotePdf.test.ts
npm test
npm run lint
npm run build
```

Expect: normalize covers missing/`''`/trim/500-cap; `quoteShareText` includes terms after Total when set and omits when empty; PDF test asserts presence/absence if the suite already snapshots body text.

## Manual (360–390 px)

1. **Configurar**  
   Configurações › Orçamento → section “Condições de pagamento” shows placeholder `Condições de pagamento à combinar.` when empty.  
   Type `Valor à vista. Crédito na venda.` → Salvar → leave and re-enter → text persists.

2. **PDF**  
   Emit (or open emitted) → Prévia do PDF → after TOTAL, same sentence appears.  
   Clear field → Salvar → Prévia again → no empty “Condições…” block under TOTAL.

3. **WhatsApp**  
   Enviar / texto → after `*Total …*`, before CTA/validity, same sentence.  
   Clear field → message has Total then CTA/validity with no blank payment section.

4. **Same for all quotes**  
   Two different quotes → both show the current shop text (change settings once; both outputs update on next send).

5. **Mobile**  
   At 360 px, Orçamento tab: textarea usable, Salvar reachable (safe-area ok).

## Done when

- SC-001…SC-004 from [spec.md](spec.md) satisfied in the run above.
- [contracts/ui.md](contracts/ui.md) negative cases checked (no empty block, no placeholder persisted).
