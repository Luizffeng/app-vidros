# Research: Medidas finais e fotos (009)

## R1 — Shape of final measures

**Decision**: `QuoteItem.finalMeasures?: FinalMeasure[]` where `FinalMeasure = { key: string; label: string; value: string; unit?: string }`. Absent/empty array = “never saved”; UI seeds from quote input via `seedFinalMeasures(input)`.

**Rationale**: Flexible for custom A/B/C/D; keys stable for box (`spanCm`), width/height kinds, etc. Saving empty strings still counts as “saved” if user opened and confirmed — use a boolean `finalMeasuresSaved?: boolean` OR treat non-undefined array as saved. **Use**: `finalMeasures` undefined = not saved (seed each open); defined array (possibly empty) = user saved.

**Alternatives**: Parallel typed structs per kind — more TS safety, more churn when kinds grow.

## R2 — Seed mapping (quote → final)

**Decision** (cm for box span as today; mm for width/height products):

| Kind | Seeded fields |
| --- | --- |
| box | Largura (cm) ← `spanCm` |
| correr, pivotante, maxiar, fixo, espelho | Largura (mm) ← `widthMm`, Altura (mm) ← `heightMm` |
| custom | Largura, Altura, Medida A–D (empty values; labels fixed) |

User can edit any value; adding/removing custom keys beyond the template is P2 (MVP = fixed template per kind).

## R3 — Photos on quote

**Decision**: `Quote.photos?: QuotePhoto[]` with `{ id: string; path: string; createdAt: string }`. Max **10**. Order = attach order.

**Rationale**: Revision clones the array (same `path`/`id`). Storage object lifetime = until no quote references it **or** retention cleanup.

## R4 — Bucket and paths

**Decision**: New private bucket `quote-photos`. Object key `{account_id}/{photo_id}.jpg`. RLS: folder name[1] = `current_account_id()`; insert/update/delete for members who can write (mirror logo policies but allow any authenticated account member who can write quotes — today admin; use `account_can_write()` if available).

**Rationale**: Separate from `logos`. Shared path across revisions = no byte clone.

## R5 — Local mode

**Decision**: IndexedDB object store `quote-photos` (db version bump with upgrade). Quote stores `path: "idb:{photo_id}"`. Blobs as JPEG. Same 10 / 6-month rules.

**Rationale**: Spec wants photos in local too; data URLs inside quote JSON blow past practical limits.

## R6 — Compression

**Decision**: New `fileToQuotePhotoBlob(file)` — max edge **1280px**, JPEG quality ~0.72, reject if still > **2 MB** after compress; accept png/jpeg/webp input. Target ~300 KB typical.

**Rationale**: Spec Free-tier analysis; reuse canvas approach from logo.ts with different constants.

## R7 — Emitted mutability

**Decision**: `readOnly` stays for pricing/customer/costs/emit. New flags: `canEditFinalMeasures` and `canEditPhotos` true whenever quote loaded and account can write (draft or emitted). UI: “Medidas finais” on item row; “Fotos” section always (when can write).

**Rationale**: Owner: factory notes after emit without forcing revision.

## R8 — Retention clock

**Decision**: Available iff `now - createdAt < 180 days` (6×30). Display “Expirada” or omit thumbnail. Deletion of expired objects: best-effort on list/open + optional operator SQL; not a cron in MVP.

**Rationale**: Simple; matches “6 months” product language.

## R9 — Customer output firewall

**Decision**: Never pass `finalMeasures`/`photos` into `quoteShareText` / `generateQuotePdf`. Add negative Vitest. Document in BUSINESS_RULES + customer-output skill + AGENTS shared patterns.

## R10 — Privacy copy

**Decision**: One sentence in `politica-de-privacidade.md`: fotos de orçamento ficam só na conta, até 6 meses. Skip deep legal rewrite.
