# Components

React UI. No price formulas and no Supabase queries except `LoginScreen` (password sign-in).

## Files

| File | Owns |
| --- | --- |
| `App.tsx` | Views `list` \| `editor` \| `catalog` \| `settings`. Quote state, persist queue, emit, revision, delete, PDF/share actions. Also customer, costs, discounts, and share modal in the same file. |
| `ItemForm.tsx` | Modal fields per product kind. Markup percent → fraction. |
| `CatalogEditor.tsx` | Catalog tables, version bump, calls `parseImportedCatalog`. |
| `SettingsEditor.tsx` | Establishment, validity, share CTA, logo file. |
| `AppNav.tsx` | Orçamentos / Catálogo. Hidden for `vendedor`. |
| `AppHeader.tsx` | Settings menu and sign-out. Settings hidden for `vendedor`. |
| `LoginScreen.tsx` | Email/password form. |
| `PdfPreview.tsx` | pdf.js preview of a blob. |
| `Dropdown.tsx`, `Modal.tsx`, `SearchField.tsx`, `useDismiss.ts` | Shared widgets. |

Domain calls go through `src/domain/quote.ts` and `priceItem`. Persistence is the module-level `repo` from `createRepository()` inside `App.tsx`.

## Boundaries

- Search `App.tsx` for the handler (`onEmit`, `persist`, `onDeleteDraft`, `openNew`) and read that region. Do not load the whole file, and do not read the icon functions at the bottom, unless the task is those icons.
- `readOnly` means `quote.status === 'emitted'`. Keep emit/delete rules in the domain; the UI should keep calling `emitQuote` / checking `draft`.
- Admin gate is `access.role !== 'vendedor'`. Role loading stays in `src/auth/access.tsx`.

## Skip unless needed

- `CatalogEditor.tsx` and `SettingsEditor.tsx` on a quote-flow task.
- `ItemForm.tsx` on a list/PDF/auth task.
- `src/data/defaultLogo.ts` when editing the logo picker. Use `src/data/logo.ts`.
