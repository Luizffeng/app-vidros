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

## Baseline

2026-10-08, código antes da feature (commit `f0b190d`, rodado num `git worktree` na porta 5181), Chromium headless 390×844, CPU 4×, janela de 700 ms por cenário, lista com 41 orçamentos, **mediana de 5 rodadas** (uma rodada só oscila até ±40 ms nas telas pesadas). Gravado com `SAVE_BASELINE=1 RUNS=5` em `tmp-browser-qa/motion-perf-baseline.json`; o script compara contra esse arquivo quando ele existe.

| Cenário | fps | Pior quadro (ms) | Tarefas longas | Maior (ms) |
| --- | --- | --- | --- | --- |
| rolar lista | 60 | 17 | 0 | 0 |
| abrir / fechar seletor | 59 / 60 | 33 / 17 | 0 / 0 | 0 / 0 |
| lista → orçamento | 51 | 117 | 2 | 71 |
| abrir janela | 55 | 67 | 1 | 75 |
| fechar janela | 57 | 50 | 1 | 51 |
| fechar / abrir seção Itens | 60 / 60 | 17 / 17 | 0 / 0 | 0 / 0 |
| abrir / fechar menu | 59 / 60 | 33 / 17 | 0 / 0 | 0 / 0 |
| orçamento → lista | 41 | 150 | 2 | 154 |
| menu → Configurações | 57 | 50 | 1 | 54 |
| abas Orçamento / Logo / Cadastro | 59 / 60 / 60 | 33 / 17 / 17 | 0 | 0 |
| menu → Catálogo | 47 | 183 | 1 | 192 |
| rolar catálogo | 60 | 17 | 0 | 0 |

As tarefas longas acima de 50 ms já existem antes da feature: são a renderização do React ao montar a tela ou a janela, não efeito visual. O script aceita esses cenários quando não pioram mais de 15% (+5 ms) contra o baseline. Headless não rasteriza o desfoque como um celular real, então a melhoria de rolagem por tirar `backdrop-filter` não aparece aqui (60 fps antes e depois); conferir no passo 10 do manual.

### Após tirar o desfoque (T007)

Sem `backdrop-filter` nas seções e na barra inferior e sem `rise` por seção: rolagem da lista e do catálogo segue a 60 fps, pior quadro 17 ms, igual ao baseline. Demais cenários dentro da variação.

### Após janelas e menus (fase US1)

Mediana de 5: todos os 17 cenários passam. Fechar janela 51 → 61 ms (a desmontagem acontece depois da saída de 150 ms, mesmo custo deslocado); abrir janela 75 → 86 ms; o resto igual ou melhor.

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
