# Forte Vidros — Orçamentos

App mobile-first para emitir orçamentos de vidraçaria. O motor de cálculo espelha as regras da planilha de referência (BOX, Correr, Pivotante, Maxim-ar, Vidro fixo, Espelho), sem usar Google Sheets como banco de dados.

## Stack

- React + Vite + TypeScript
- Motor de precificação puro em `src/domain/pricing`
- Persistência local via IndexedDB (`LocalQuoteRepository`)
- Interface `QuoteRepository` pronta para trocar por API/banco remoto
- PDF com jsPDF

## Backlog

Prioridades vivas em [`BACKLOG.md`](./BACKLOG.md). Estratégia atual: Web desktop primeiro; PWA/responsividade depois.

## Spec Kit

Projeto inicializado com [GitHub Spec Kit](https://github.com/github/spec-kit). Constitution em `.specify/memory/constitution.md`.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npm run build
```

## Uso

1. Abrir no smartphone/navegador
2. Novo orçamento → adicionar itens (calculados ou avulsos)
3. Custos adicionais opcionais; cliente opcional
4. Emitir + PDF (orçamento fica imutável)
5. Criar revisão para alterar um orçamento emitido

## Dados

Catálogo inicial em `src/data/seed/` (exportado da planilha de exemplo). Preços e config ficam no store local do app — editar o seed ou `saveCatalog()` no futuro admin.
