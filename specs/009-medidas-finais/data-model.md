# Data model: Medidas finais e fotos (009)

## FinalMeasure

| Field | Type | Notes |
| --- | --- | --- |
| `key` | string | Stable id (`spanCm`, `widthMm`, `heightMm`, `a`…`d`) |
| `label` | string | UI label (pt-BR) |
| `value` | string | As typed (normalize trim on save) |
| `unit` | string? | `cm` / `mm` / omit |

## QuoteItem (extended)

| Field | Type | Notes |
| --- | --- | --- |
| `finalMeasures` | `FinalMeasure[]` \| undefined | `undefined` = never saved → seed on open; array = saved snapshot |

Pricing `input` / `result` unchanged.

## QuotePhoto

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `path` | string | Storage key or `idb:{id}` |
| `createdAt` | ISO string | Retention clock |

## Quote (extended)

| Field | Type | Notes |
| --- | --- | --- |
| `photos` | `QuotePhoto[]` \| undefined | Max 10; default `[]` after normalize |

## Storage objects

| Backend | Location |
| --- | --- |
| Supabase | bucket `quote-photos`, key `{account_id}/{id}.jpg` |
| IndexedDB | store `quote-photos`, key = id, value = Blob |

## Constants

- `QUOTE_PHOTOS_MAX = 10`
- `QUOTE_PHOTO_RETENTION_MS = 180 * 24 * 60 * 60 * 1000` (6×30 days)
- Upload post-compress max **2 MB**; edge **1280 px**

## Normalization (`normalizeQuote`)

- Missing `photos` → `[]`
- Drop photos beyond 10 (keep first 10)
- Missing `finalMeasures` on item → leave undefined
- Invalid photo entries (no id/path/createdAt) dropped

## Revision

`createRevision`: `structuredClone` already copies `finalMeasures` and `photos` (same paths). No re-upload.

## Retention helper

`photoIsAvailable(photo, now = Date): boolean` → age < retention.

## Out of scope

OCR results, production BOM, multiple captions, albums beyond 10.
