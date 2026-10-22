# Data model: Condições de pagamento (008)

## Entity: AppSettings (extended)

Existing shop settings document. One new field:

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `paymentTerms` | `string` | no (always present after normalize) | `''` | Trimmed; max 500 chars; empty ⇒ omit from PDF/WhatsApp |

Unchanged fields (`quoteValidityDays`, `marginMode`, `establishment`, `logoDataUrl`, `shareCta`, `onboardingDismissedAt`, …) stay as today.

## Persistence

| Adapter | How |
| --- | --- |
| IndexedDB (`LocalQuoteRepository`) | Inside settings value blob — automatic once type + normalize updated |
| Supabase (`settings.payload`) | Same JSON key; **no migration** |

## Normalization rules (`normalizeSettings`)

1. Missing / non-string → `''`.
2. `trim()`.
3. Length > 500 → slice to 500 (after trim).
4. Do **not** substitute the UI placeholder as a stored value.

## Relationships

- **Quote**: none. Output reads current settings at PDF/share time.
- **Account**: settings already scoped by `account_id` (RLS).

## Validation (UI)

- `maxLength={500}` on textarea.
- Save uses the same draft/`onSave` path as other Orçamento fields.

## Out of scope (no entities)

- Payment options, interest tables, per-quote overrides, payment gateway, snapshots on emit.
