# Quickstart: validar Composição do custo

Pré-requisito: spec 002 implementada (cálculo de margem, "Atualizar valores").

## Automático

```bash
npm test
npm run lint
npm run build
```

Esperado:

- Todos os casos `calc_*` com os mesmos valores de hoje.
- Invariante em todos os casos de referência: soma das linhas por grupo = grupo do custo (centavos); linha de mão de obra = mão de obra; linhas de catálogo com unidade e origem.
- Correr com cor que tem acréscimo: unitário do perfil inclui o acréscimo e a linha guarda o percentual.
- Box: vidro em m² (quantidade × unitário = subtotal).
- `setPriceOverride`: recalcula só itens com o código; igual ao catálogo remove; emitido lança.
- `withPriceOverrides` ignora código inativo; revisão herda preços próprios.
- `setCatalogPrice` em alumínio recalcula valor por metro.

## Manual (modo local)

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --host 127.0.0.1 --port 5180 --strictPort
```

1. Novo orçamento: Correr J4F 1950×754 Verde 06 Fosco. Tocar "Detalhes do custo": janela abre; resumo no topo; grupos Vidro/Alumínio/Ferragem/Acessório/Mão de obra; soma = Custo. Conferir linhas com a planilha.
2. Fechar: página na mesma posição.
3. Repetir com cor de perfil com acréscimo: linhas de alumínio mostram "+N% cor".
4. Admin: tocar no unitário do AL 49, digitar valor, "Só neste orçamento": item recalcula, marca "preço deste orçamento". Adicionar outro correr: usa o mesmo preço próprio. Catálogo e outro rascunho não mudam.
5. "Voltar ao preço do catálogo": volta e recalcula.
6. "Atualizar no catálogo" → "Não": nada muda. De novo → "Sim": "Catálogo atualizado"; este rascunho recalculado; outro rascunho mostra "O **catálogo** foi atualizado."; Catálogo mostra o preço novo.
7. Emitir: janela só leitura. Criar revisão: preço próprio mantido.
8. Entrar como vendedor (se Supabase de teste) ou ocultar admin: janela sem edição.
9. Item avulso: janela só com resumo.

Fumaça:

```bash
APP_URL=http://127.0.0.1:5180 node scripts/smoke-quote-browser.mjs
```
