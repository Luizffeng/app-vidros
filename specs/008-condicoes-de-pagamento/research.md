# Research: Condições de pagamento (008)

## R1 — Where to store the text

**Decision**: `AppSettings.paymentTerms: string` (default `''`), inside the existing settings JSON payload.

**Rationale**: Same pattern as `shareCta`. Spec is shop-wide, one value for all quotes. `normalizeSettings` already merges partial payloads; old rows without the key become empty. No SQL migration (persisted-field-change: JSON-only fields stay in payload).

**Alternatives considered**:
- Column on `settings` — unnecessary; nothing queries it in SQL.
- Per-quote field — rejected by clarification (no override this version).
- Hardcoded in seed only — user must edit in Configurações.

## R2 — Settings UI placement and copy

**Decision**: Configurações › **Orçamento** tab, new `Section` after “Texto final no WhatsApp” (or immediately after validity — either order is fine; prefer **after validity, before or after CTA**). Title: **Condições de pagamento**. Hint: short, e.g. “Aparece no PDF e no WhatsApp de todo orçamento.” Placeholder (empty value): `Condições de pagamento à combinar.` `maxLength={500}`. Same save path as the rest of the Orçamento tab (`onSave` / dirty draft).

**Rationale**: Appears on the proposal like validity/CTA; Conta tab is for shop identity and marketing opt-in. Mirrors “Texto final no WhatsApp” control (textarea + Section).

**Alternatives considered**: Conta tab — weaker link to “proposta”; separate tab — overkill for one field.

## R3 — WhatsApp / share text placement

**Decision**: In `quoteShareText`, after `*Total …*`, before `shareCta`, before validity line:

```text
*Total R$ …*

{paymentTerms}          ← only if trim non-empty; plain text, no forced title

{cta}                   ← existing shareCta

_Validade da proposta: …_
```

Pass `paymentTerms` via options (from `settings.paymentTerms` at call site in `App.tsx`), same as `cta` / `validityDays`.

**Rationale**: Spec wants text on the proposal after the commercial total and before validity. CTA stays the closing ask. No empty heading when blank (FR-004).

**Alternatives considered**:
- Titled block “Condições de pagamento:” always — rejected when empty; optional title only when non-empty adds noise for a free-form blurb — **omit title**, print the user’s sentences as-is (they can include their own label if they want).
- After CTA — CTA is “última linha antes da validade” today; inserting payment after CTA would break that product meaning. Keep CTA last before validity.

## R4 — PDF placement

**Decision**: After the `TOTAL:` line (and before shop footer). Multi-line wrap with existing `line()` helper / font size ~9–10. No section title unless we later want one; print body text only when trim non-empty. Header already shows “Validade: …” at the top — payment terms are commercial, so near TOTAL is clearer than next to header validity.

**Rationale**: Customer reads total then how to pay. Empty → no gap/title.

**Alternatives considered**: Next to header validity — mixes dates with payment prose; footer with address — easy to miss.

## R5 — Default and empty behavior

**Decision**: Default `''`. Placeholder is UI-only (never persisted). Whitespace-only → treat as empty (trim in normalize and again at output). Changing settings later changes the next PDF/WhatsApp; no snapshot on emit (spec assumption).

**Rationale**: Matches FR-002/FR-004; unlike `shareCta`, which ships with `DEFAULT_SHARE_CTA`, payment terms start empty so old shops don’t suddenly print a phrase they never chose.

## R6 — Max length

**Decision**: **500** characters in UI and normalize (slice/trim). Longer than `shareCta` (180) because payment copy can be two short sentences; still short enough for PDF/WhatsApp.

**Rationale**: Spec “algumas centenas”; avoid unbounded payload.

## R7 — Roles / permissions

**Decision**: Same as editing other settings on the Orçamento tab (`isAdmin` / existing Settings gate). No new RLS.

**Rationale**: FR-007; settings writes already admin-scoped in UI + RLS on `settings`.

## R8 — Skills and docs on ship

**Decision**: Implement with `persisted-field-change` + `customer-output-change` + `ui-change`. On ship: `news-update`, `BUSINESS_RULES.md` “Customer and display” one bullet, `API_CONTEXT.md` only if JSON contract table lists settings keys (add `paymentTerms` there if documented).

**Rationale**: Standard App Vidros change shape for settings + proposal text.
