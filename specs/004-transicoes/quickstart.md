# Quickstart: validar Transições

## Setup

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --host 127.0.0.1 --port 5180 --strictPort
```

## Automático

```bash
npm test && npm run lint && npm run build
APP_URL=http://127.0.0.1:5180 node scripts/smoke-quote-browser.mjs
APP_URL=http://127.0.0.1:5180 node scripts/motion-perf-browser.mjs   # rodar também antes da feature (baseline)
```

Esperado no script de desempenho (CPU 4× mais lenta): nenhuma tarefa longa > 50 ms causada por abrir/fechar janela, abrir/fechar seção, trocar aba, ir e voltar da lista; rolagem da lista com quadros iguais ou melhores que o baseline.

Tamanho: comparar `dist/assets/*.js` gzip antes/depois (≤ +2 KB).

## Manual

1. Celular (390 px): abrir item novo; janela sobe de baixo; fechar por botão, Esc (computador) e toque fora; página volta ao mesmo ponto.
2. Computador: prévia do PDF cresce do centro; fechar sai rápido.
3. Seletor de status na lista e menu do topo: abrem a partir do botão, fecham suavemente; tocar rápido abre/fecha sem travar.
4. "Excluir rascunho?": abre e fecha suave.
5. Orçamento: abrir/fechar Cliente, Itens, Custos adicionais; sem salto.
6. Configurações: trocar abas; marcador desliza, conteúdo esmaece.
7. Catálogo: trocar tabela; conteúdo esmaece.
8. Lista → orçamento entra pela direita; voltar entra pela esquerda na mesma rolagem; menu entre seções esmaece.
9. Ligar "reduzir movimento" no sistema: repetir 1–8; nada se desloca ou cresce.
10. Rolar lista e catálogo no celular mais simples disponível: sem engasgo; aparência das seções e da barra inferior equivalente a antes (sem desfoque).
