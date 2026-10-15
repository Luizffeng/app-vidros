---
name: news-update
description: Use when a change app users can see is about to ship (new screen, button, option, text, PDF/WhatsApp output), or when the user asks to add or review "novidades". Updates `src/content/novidades.md`, one section per month, last 6 months.
---

# News update

## When to use

- A task changes what users of the app see or can do. Run it before `ship-change`.
- The user asks "adiciona nas novidades", "revisa as novidades", or a new month started.

Skip: refactors, tests, docs, performance with no visible effect, provider-only tooling (operator SQL, scripts), fixes for bugs nobody noticed. If unsure, ask the user.

## Where it shows

Every role sees it (Suporte has no role gate). Write for any user of the shop, not only the owner; if a change is for the admin only, say where it is ("em Configurações").

`src/content/novidades.md` renders in Suporte › Novidades (`/suporte/novidades`, one collapsible card per month, newest open, item count on the card) and on the public `/novidades` page. Início footer links to it ("Veja as novidades").

## Format

```markdown
# Novidades do app

<one intro paragraph, keep as is>

## Novembro de 2026

- **Nome da coisa** onde fica ou o que faz, em uma frase.

## Outubro de 2026

- ...
```

- One `## Mês de AAAA` per month, month name in Portuguese with capital letter, newest first.
- Each month holds only one bullet list. No paragraphs, sub-headings, or tables inside a month.
- Keep at most 6 months: when adding a 7th, delete the oldest.
- `src/content/markdown.test.ts` ("novidades.md") checks all of the above. Run `npx vitest run src/content`.

## Steps

1. Month: today's date from the session. If its `##` is missing, add it at the top (right after the intro).
2. Re-read the whole month before writing. The month is one summary, not a log:
   - Same feature changed again: rewrite its bullet, do not add a second one.
   - A bullet now wrong (renamed screen, moved option): fix it. Names must match the app today (e.g. "Suporte", "Configurações › Conta").
   - New thing: add one bullet. Order by what matters most to a glazier (quotes, prices, PDF/WhatsApp first; polish last).
   - About 10 bullets max per month: merge small polish into one line ("Telas mais compactas no celular").
3. Older months are history: only fix names that would send the user to a screen that no longer exists.
4. If the change came from a suggestion, the operator marks it shipped with `supabase/operator/suggestions.sql`; mention that to the user.
5. Optional: if the month's headline changed, offer to update the "Novidades do app" banner text in `src/data/banners.ts` (up to 2 lines at 360 px).

## Writing

- pt-BR for glaziers who are not technical. Short, concrete, benefit first.
- Start with the feature in bold, then where it is or what it does: `**Mostrar senha** na tela de entrada.`
- Use the labels the user sees, with ` › ` for paths. No code, file, table, or English terms (no "deploy", "bug", "UI", "RLS").
- No dates or version numbers inside bullets; the month heading is the date.

## Must not

- Edit the intro paragraph or the `#` title without a request.
- Add news for something not shipped yet.
- Touch other files in `src/content/` (terms and privacy are legal texts).
