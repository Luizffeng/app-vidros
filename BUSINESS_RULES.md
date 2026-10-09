# BUSINESS_RULES

Rules encoded in the current code. Locations are the evidence. Unclear items are marked.

## Access

- Without Supabase env, role is `local` and the UI is the admin UI, because admin means “not vendedor”. `src/auth/access.tsx`, `src/components/App.tsx` (`isAdmin`).
- With Supabase, no session shows `LoginScreen`. Failed password shows a generic invalid message. `src/components/LoginScreen.tsx`.
- `profiles.role === 'admin'` is admin. Any other value, error, or missing row becomes `vendedor`. `loadRole` in `src/auth/access.tsx`.
- Vendedor does not see Catálogo or Configurações. `src/components/AppHeader.tsx`, `goSection` in `App.tsx`.
- Database: any authenticated user can read and write quotes, including delete. Only admin can insert/update catalog and settings, or write the `logos` bucket. `supabase/migrations/20260924120000_init.sql`.
- New auth user is inserted as `vendedor`. `handle_new_user` in the same migration.

## Quote status

- Status is only `draft` or `emitted`. `QuoteStatus` in `src/domain/types.ts`.
- New quote starts `draft`, revision `1`, empty customer, no additional costs. `createEmptyDraft`.
- Emit requires at least one item and a non-blank customer name. Otherwise `emitQuote` throws. `src/domain/quote.ts`. The editor also blocks emit and asks for the name before calling it. `onEmit` in `App.tsx`.
- Emit sets `emittedAt`, `validUntil` from settings validity days (default 15), and `status: 'emitted'`. It does not change prices. `emitQuote`, `computeValidUntil`.
- Validity date is the issue date plus N days, time 23:59:59.999 local. A day count below 1 falls back to 15. Settings normalize clamps days to 1–3650. `computeValidUntil`, `normalizeSettings` in `src/data/defaultSettings.ts`.
- Emitted editor is read-only: no item edits, no customer/cost edits, no emit. PDF preview/download/share and WhatsApp text enable only when emitted. `readOnly` in `App.tsx`.
- Revision clones the quote, new id, `revision + 1`, `parentId` = source `parentId` or source id, status draft, clears `emittedAt` and `validUntil`, keeps the same `number`. `createRevision`.
- UI delete runs only when `status === 'draft'`. `onDeleteDraft` in `App.tsx`. The repository delete has no status check.

## Money

- `grandTotal = itemsTotal + additionalTotal - discountTotal`. `withTotals` in `src/domain/quote.ts`.
- Item final price for catalog kinds depends on `AppSettings.marginMode` ("Cálculo de margem"). Empresa (default, legacy): `totalCost * (1 + markup)`. Vendedor: `(material + item extras) * (1 + markup) + labor`. Autônomo: `totalCost` (no margin; labor is the profit). Item extras always take the margin in Empresa/Vendedor. `marginPct` is margin / final price. `buildBreakdown(parts, mode)` in `src/domain/pricing/math.ts`; `priceItem(catalog, input, mode)` applies the mode once.
- Quote additional costs (e.g. Frete) and discount are never touched by the margin. They are added/subtracted after item prices in `recomputeTotals`.
- Drafts never reprice silently. A draft where repricing would change some item (catalog edit that affects its items, or a different margin mode) shows one yellow banner with the change date and "Atualizar valores" (`draftOutdated` / `outdatedSince` / `repriceDraft` in `src/domain/quote.ts`). After the tap a smaller "Valores atualizados." note replaces it. Items that fail to reprice keep their old result. Emitted quotes never change.
- "Detalhes do custo" opens a window per item: summary (cost, margin per mode, price) and lines grouped Vidro / Alumínio / Ferragem / Acessório / Mão de obra, each with quantity + unit (m², m, un), unit price, subtotal, and "+N% cor" when a color surcharge applies. Line totals per group equal the breakdown group (cents). `composeCost` in `src/domain/costComposition.ts`, `CostDetailModal.tsx`.
- Admin on a draft can tap a catalog line's unit price. "Só neste orçamento" stores `Quote.priceOverrides` (ref = catalog table + id, price = catalog field: vidro R$/m², kit/acessório R$/un, alumínio R$/barra) and reprices only items that use that code; later items in the same quote use it too. A value equal to the catalog removes the override. "Atualizar no catálogo" (confirmed) writes the catalog, bumps its version, reprices this draft and drops its override for that code; other drafts get the outdated banner. `setPriceOverride`, `withPriceOverrides`, `setCatalogPrice` in `src/domain/`. Emitted quotes, vendedor, and inactive codes are read-only.
- On a draft, a line whose unit price in today's catalog (with this quote's own prices and the item's own labor rate) differs from the stored line shows a yellow "!"; tapping it shows the new price and "Atualizar item" (`updateItem` with the current catalog and mode). `catalogNow` in `composeCost`.
- The labor line edits the rate (R$/m²; maxim-ar R$/peça). "Só neste item" stores `laborRate` on that item's input (`setItemLaborRate`; the catalog rate or empty removes it; editing the item keeps it). "Atualizar no catálogo" (confirmed) writes `config.labor` (Temperado is shared by Correr, Pivotante, Vidro fixo, Espelho), bumps the version and reprices this draft without that item's own rate. `priceItem` applies `laborRate` through `LABOR_KEY`.
- Items priced before line detail existed: opening a draft refreshes their lines silently when today's price is the same to the cent (`refreshItemDetail`). If the price would change, the draft already shows the outdated banner and the window shows one note with "Atualizar item" (`updateItem` with the current catalog). Revisions keep overrides; `repriceDraft` drops overrides equal to the new catalog price.
- Custom item final price is the typed amount. Cost equals that amount. Markup and margin are 0. `priceCustom` in `src/domain/pricing/index.ts`.
- Default markup fractions live on `PricingConfig.defaultMarkup` (seed `src/data/seed/config.json`). The form shows percent and divides by 100. `ItemForm.tsx`.
- Additional costs and discounts need a label and amount ≥ 0. Blank or invalid rows are dropped on normalize. `normalizeCosts`.
- Item extras need a description and amount ≥ 0. A legacy numeric extra becomes one line labeled `Adicional` only if &gt; 0. `normalizeExtras`.
- Freight is an ordinary additional cost the user adds (placeholder `Ex.: Frete`). Opening a draft or creating a revision drops a legacy automatic `Frete` line at 0 (`dropEmptyFreight`). Costs with amount ≤ 0 are omitted from PDF and share text. `generateQuotePdf.ts`, `quoteShareText`.
- Share text shows one discount total, not each discount line. PDF lists discounts only as the total when &gt; 0.

## Catalog

- `ativo === false` is inactive. Omitted `ativo` counts as active. `src/domain/catalogActive.ts`.
- Lookups (`findVidro`, `findKitBox`, `findAcessorio`, `findAluminio`) skip inactive rows and throw if price/code is missing. `src/domain/pricing/math.ts`.
- Rows with empty `codigo` are dropped on normalize. Import requires `config` and the four arrays, each row with numeric `id` and `codigo`. `src/data/catalogItems.ts`.
- Saving the catalog from the editor bumps `config.version` to `YYYY-MM-DD`, or to a minute timestamp if that day string is already the version. `bumpCatalogVersion` in `src/domain/catalogEdit.ts`. Aluminum `valorMetro` = `valorBarra / metragemBarra` (`aluminioValorMetro`).
- First catalog read, local or remote, inserts the seed when no row exists. `LocalQuoteRepository.getCatalog`, `SupabaseQuoteRepository.getCatalog`.

## Pricing rules that the pricers implement

Dispatch: `priceItem` in `src/domain/pricing/index.ts`. Shared helpers: `src/domain/pricing/math.ts`. Parity examples: `src/domain/pricing/pricing.test.ts`.

- Box (`box.ts`): height is `config.boxDefaultHeightM` (not an input). Glass type `Box`, thickness code `08`. Kit size is the smallest `kitBoxSizesCm` ≥ span, else the largest. Silicone accessory `SILICONE ACT` times `boxSiliconeQty`. Labor is span(m) × height × `labor.boxPerM2`. `labor.boxAvulso` is not used.
- Correr (`correr.ts`): glass type `Temperado`. 2-leaf vs 4-leaf changes glass count and profile meters. Aluminum and hardware costs multiply by `(1 + aluminum color surcharge)`. Labor is vão area × `labor.temperedPerM2`. Profile color must exist in `aluminumColors` or pricing throws.
- Pivotante (`pivotante.ts`): tempered glass, aluminum surcharge on aluminum and hardware. Latch accessory `1335` quantity is 1 only when `hasLatch` is true. Labor is tempered per m².
- Maxim-ar (`maxiar.ts`): glass billed at least 0.25 m². Labor is the flat `labor.maxiarAvulso`, not per m². Cantoneira code `CANT 5/8"` or a description containing `CANTONEIRA 15`.
- Fixo and espelho (`fixoEspelho.ts`): glass billed at least 0.25 m². Fixo adds silicone `SILICONE ACT`, quantity `max(1, ceil(vão area))`. Espelho looks up vidro by `finish` (`Espelho Lapidado` or `Espelho Bisotado`) and has no silicone line. Both use `labor.temperedPerM2` on vão area (before the 0.25 glass minimum).

Color surcharge percents and labor numbers in the seed are data, not hardcoded in the pricers. Current seed: `src/data/seed/config.json`.

## Customer and display

- Internal code is `{number}-{revision}` (`formatQuoteCode`). Customer code strips a leading `ORC-` (`formatDisplayQuoteCode`). PDF filename uses the customer code.
- PDF and WhatsApp omit item size. They show `describeItem` title and spec, optional note, final price, and extras. `src/domain/itemDescription.ts`, `quoteShareText`, `generateQuotePdf`.
- "Enviar PDF" shares only the file and copies `pdfShareMessage` ("Olá, {primeiro nome}! Segue o orçamento {código} da {loja}." + Texto final no WhatsApp) to the clipboard. WhatsApp drops text sent with a file, and a PDF shared from Android Chrome arrives without its thumbnail (the same file attached inside WhatsApp has one); sending only the file is the attempt to get it back. Without file sharing (desktop) it downloads the PDF and opens `wa.me` with the message. `shareOrDownloadPdf`. WhatsApp always shows its own file/caption screen before sending; the web cannot skip it.
- "Enviar texto" opens WhatsApp directly, without the system share sheet: `whatsapp://send` on Android/iPhone, `wa.me` in a new tab on desktop. If the phone page keeps focus for 1.5 s (no WhatsApp), it falls back to the system share sheet; without it, the modal shows "Não foi possível compartilhar no momento. Faça o download do orçamento para realizar o envio." `shareQuoteText`.
- Shop name on PDF and WhatsApp is the nome fantasia; blank falls back to nome/razão social, then `Vidraçaria`. `shopDisplayName` in `src/domain/quote.ts`.
- Legacy customer `address` string is used on the PDF only when structured lines are empty. `formatCustomerAddress`.
- Phone: digits only, max 11, strips leading `55` and zeros. `src/domain/brazil.ts`.
- CEP lookup needs 8 digits. Unknown CEP returns null. HTTP failure throws. `src/data/viacep.ts`.

## Logo

- Accepted upload: PNG, JPEG, WebP, max 5 MB, longest edge scaled to 720 px, stored as PNG data URL. `src/data/logo.ts`.
- Remote save uploads `logos/shop/logo.png` and does not put the data URL in the settings payload. `SupabaseQuoteRepository.saveSettings`.

## What is not a rule yet

- No per-quote owner. Any authenticated user sees every quote (RLS `using (true)`).
- No status besides draft and emitted. No “sent” or “accepted”.
- Km freight and offline sync of IndexedDB into Supabase are backlog only (`BACKLOG.md`), not code.
