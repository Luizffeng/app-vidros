# Quickstart: validate back navigation, URLs, item draft, Início

## Prerequisites

- Local mode dev server: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1`
- Phone test: `npm run dev -- --host` and open the Network URL on an Android phone (Chrome) on the same Wi‑Fi.
- Playwright browsers installed (`npx playwright install chromium` if missing).

## Automated

| Command | Proves |
| --- | --- |
| `npm test` | routes parse/format/ancestors, home summaries, banner window, item-draft storage helpers |
| `npm run lint` · `npm run build` | types, lint, bundle; compare gzip size before/after (≤ +3 KB nav, ≤ +4 KB home) |
| `APP_URL=http://127.0.0.1:5173 node scripts/nav-back-browser.mjs` | scenarios below (uses `page.goBack()`, same `popstate` as Android back) |
| `node scripts/smoke-quote-browser.mjs` · `validate-catalog-browser.mjs` · `motion-perf-browser.mjs` | existing flows still pass (start at Início) |

## Baseline

Main chunk gzip, `vite build` with Supabase env set (2026-10-09):

| Asset | Before (`44e3f5d`) | After 005 + 006 | Delta |
| --- | --- | --- | --- |
| `index-*.js` | 262.84 KB | 268.56 KB | +5.72 KB |
| `index-*.css` | 8.87 KB | 9.53 KB | +0.66 KB |

Total +6.38 KB, under the combined 7 KB budget (nav 3 + home 4); includes the item draft.

## Scenarios (script + manual on Android)

1. **Overlays**: open orçamento → Adicionar item → tipo → back: form closes, still on orçamento. Repeat for prévia do PDF, Enviar menu, Enviar texto, Detalhes do custo, header menu, dropdown, "Excluir rascunho?" confirm. One back per overlay, never leaves the app.
2. **UI close keeps history clean**: open item modal, close with "Fechar", press back once → goes to Orçamentos (not a dead press).
3. **Screens**: Início → Orçamentos → orçamento → back ×3 → app left only on the 3rd from Início. Início → tile Catálogo → back → Início.
4. **Header arrow**: orçamento → arrow → Orçamentos → device back → Início (does not reopen the orçamento).
5. **Deep link + reload**: open `/orcamentos/{id}` directly → back → `/orcamentos` → back → `/` → back leaves. Reload on `/catalogo/aluminios` stays there. Unknown id → Orçamentos + "Orçamento não encontrado".
6. **Tabs/filters**: change Configurações tab twice, back → Início (no tab steps). Change list filter, open orçamento, back → same filter and scroll.
7. **Guard**: edit a catalog price (unsaved) → back → confirm appears; Cancel stays with the edit; OK leaves and drops it.
8. **Item draft**: Adicionar item → Box → type widths → back → banner "Item não terminado: Box" with Continuar/Descartar → Continuar restores values. Leave the orçamento, reload, return → still there. "Cancelar" in the form → no draft. Emit → draft gone.
9. **Item edit draft**: edit an item, change width, back → total unchanged; reopen edit → changed width shown, with discard.
10. **Início tiles**: with 2 emitted expiring in ≤ 7 days and 5 drafts → "2 vencendo · 5 rascunhos"; clear establishment phone → Configurações shows "!" + "Complete o cadastro da loja", tap → Cadastro tab.
11. **Carousel**: wait 5 s → next slide; hold finger → no change; swipe both ways; turn on "Remover animações" (Android) → no auto advance.
12. **Layout**: 360 × 640 viewport → carousel + 2 tile rows + action bar visible without scrolling.

## Expected outcomes

All scenarios pass on Chrome Android and desktop Chrome; spot-check iPhone Safari (edge-swipe back) and Firefox desktop.
