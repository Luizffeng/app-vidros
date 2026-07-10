# Plan: MVP Orçamentos

## Architecture
- **Frontend**: Vite + React + TypeScript (PWA-friendly SPA)
- **Pricing**: pure functions in `src/domain/pricing` (BOX, CORRER, PIVOTANTE, MAXIAR, FIXO, ESPELHO, CUSTOM)
- **Catalog**: seed JSON in `src/data/seed` loaded into IndexedDB (app-owned, not Sheets)
- **Persistence**: `QuoteRepository` interface; `LocalQuoteRepository` (idb) now; remote adapter later
- **PDF**: jsPDF from quote snapshot

## Constitution Check
- ✅ Engine fidelity via parity tests
- ✅ Mobile-first UI
- ✅ Immutable emit + revisions
- ✅ Storage abstraction
- ✅ Deterministic pricing

## Phases
1. Seed + engines + tests
2. Local repository + quote domain
3. Mobile UI
4. PDF + emit/revise
5. GitHub + Spec Kit docs
