---
name: customer-output-change
description: Use when changing what the customer receives: quote PDF content or layout, PDF filename, displayed quote code, or WhatsApp/share text.
---

# Customer output change

## When to use

- Add, remove, or reformat a line in the PDF or WhatsApp text (validity, CTA, item note, freight, discount, code).
- Change the PDF filename or the customer-facing quote code.
- Change how the PDF or text is sent (Web Share, `wa.me`, download).

## Read first

1. `DECISIONS.md`: "Customer-facing output hides shop internals".
2. `BUSINESS_RULES.md`: "Customer and display", plus the freight and discount bullets under "Money".

## File map (open only what the task touches)

| Output | Function | Test |
| --- | --- | --- |
| WhatsApp/share text | `quoteShareText` in `src/domain/quote.ts` | `describe('quoteShareText')` in `src/domain/quote.test.ts` |
| PDF content/layout | `generateQuotePdf` in `src/pdf/generateQuotePdf.ts` | `src/pdf/generateQuotePdf.test.ts` |
| Item title/spec (shared by editor, PDF, text) | `describeItem` in `src/domain/itemDescription.ts` | `src/domain/itemDescription.test.ts` |
| Customer code, filename | `displayQuoteNumber`, `formatDisplayQuoteCode`, `quotePdfFilename` in `src/domain/quote.ts` | `src/domain/quote.test.ts` |
| Send text | `shareQuoteText` in `src/pdf/generateQuotePdf.ts` | none |
| Buttons, preview modal | `App.tsx` (search below), `src/components/PdfPreview.tsx` | none |

Buttons in `App.tsx`: `rg -n "generateQuotePdf|shareQuoteText|Prévia do PDF" src/components/App.tsx`.

## Steps

1. Decide whether the change hits the PDF, the text, or both. Default: keep them consistent (same item lines, code without `ORC-`, validity, freight only when > 0, one discount total) unless the task says otherwise.
2. `rg -n` the function, then read only its span.
3. Add or update a test in the matching file, following its existing style (pt-BR test names). When item lines change, keep or add a negative assertion that measures, cost, and margin are absent.
4. Edit. A `describeItem` change also changes the editor list; check that it is intended.
5. Layout change: run `browser-check`, emit a quote in local mode, open "Prévia do PDF". Unit tests do not catch overlap or wrapping.
6. Update `BUSINESS_RULES.md` "Customer and display" if the rule changed.

## Scope

The functions above, their tests, and the action buttons in `App.tsx`. Settings fields (CTA, validity, establishment, logo) belong to `persisted-field-change` if new.

## Must not

- Print `describeItem(...).size`, BOM, cost, markup, or margin to the customer without an explicit product ask.
- Show the internal `ORC-` code, a 0-value freight line, or each discount line separately.
- Enable PDF or share actions for drafts (`readOnly` gates them to emitted quotes).
- Change `formatQuoteCode` (internal app code).
- Open `src/data/defaultLogo.ts`. Logo handling is `src/data/logo.ts`.

## Validate

- `npx vitest run src/domain/quote.test.ts src/pdf/generateQuotePdf.test.ts src/domain/itemDescription.test.ts`, then `npm test`.
- `npm run lint`, `npm run build`.
- For layout changes: a screenshot of the PDF preview at 390 px width.
