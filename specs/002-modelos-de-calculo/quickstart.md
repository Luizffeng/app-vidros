# Quickstart: validar Cálculo de margem

## Pré-requisitos

- `npm install`
- Modo local (sem Supabase de produção):

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --host 127.0.0.1 --port 5180 --strictPort
```

## Automático

```bash
npm test          # parity: buildBreakdown/priceItem nos 3 modos; repriceDraft; normalizeSettings
npm run lint
npm run build
```

Esperado nos testes (contrato em `contracts/domain.md`):

- Partes vidro 100, adicional do item 10, mão de obra 50, margem 30%: Empresa 208, Vendedor 193, Autônomo 160.
- Orçamento completo (espelho real + adicional do item + Frete 40 + desconto 20) nos 3 modos: Frete e desconto iguais em todos; `grandTotal = itens + 40 − 20`; diferença entre modos = só a margem sobre mão de obra / material.
- Todos os casos `calc_*` existentes passam sem mudar valor (Empresa = hoje).
- `draftOutdated`: só versão diferente → `{ catalog: true, margin: false }`; só modo → `{ catalog: false, margin: true }`; os dois → ambos true; emitido ou em dia → `null`.
- `repriceDraft` lança para emitido, mantém item com código inativo e conta `failed`.

## Manual (navegador, modo local)

1. Configurações › Orçamento: seção "Cálculo de margem" com Empresa marcado.
2. Novo orçamento, Espelho 1000×800, adicional do item R$ 10, Frete R$ 40. Anotar preço do item (P1) e total.
3. Emitir esse orçamento. Criar outro rascunho com o mesmo item.
4. Configurações: marcar Vendedor, sair sem salvar, voltar: Empresa continua marcado.
5. Marcar Vendedor, Salvar: aparece o aviso. "Não": nada muda. Salvar de novo, "Sim": "Configurações salvas."
6. Abrir o rascunho: ainda P1, com aviso "O **cálculo de margem** mudou.". Tocar "Atualizar valores": item menor que P1 (mão de obra sem margem), Frete continua R$ 40, aviso some. Detalhe do custo: "Margem (N%) · sem mão de obra".
7. Abrir o emitido: valores iguais aos do passo 2, sem aviso. Criar revisão: revisão mostra o aviso.
8. Marcar Autônomo e confirmar: item sem campo de margem, detalhe sem linha de margem, Catálogo › Mão de obra / margem sem "Margem padrão".
9. Voltar para Empresa e confirmar; atualizar o rascunho: volta a P1.
10. Salvar só a validade (sem trocar o modo): sem aviso.
11. Catálogo: mudar o preço do espelho e salvar. Abrir o rascunho: "O **catálogo** foi atualizado."; atualizar usa o preço novo.
12. Sem atualizar um rascunho, trocar o modo e salvar o Catálogo: um único aviso "O **catálogo** e o **cálculo de margem** mudaram."

Script de fumaça existente continua passando:

```bash
APP_URL=http://127.0.0.1:5180 node scripts/smoke-quote-browser.mjs
```
