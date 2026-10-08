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

2026-10-08, antes da feature (commit `f0b190d`), Chromium headless 390×844, CPU 4×, janela de 700 ms por cenário, lista com 41 orçamentos. Gravado com `SAVE_BASELINE=1` em `tmp-browser-qa/motion-perf-baseline.json`; o script compara contra esse arquivo quando ele existe.

| Cenário | fps | Pior quadro (ms) | Tarefas longas | Maior (ms) |
| --- | --- | --- | --- | --- |
| rolar lista | 60 | 17 | 0 | 0 |
| abrir / fechar seletor | 60 / 60 | 17 / 17 | 0 / 0 | 0 / 0 |
| lista → orçamento | 45 | 183 | 2 | 111 |
| abrir janela | 53 | 83 | 1 | 96 |
| fechar janela | 57 | 50 | 1 | 61 |
| fechar / abrir seção Itens | 60 / 60 | 17 / 17 | 0 / 0 | 0 / 0 |
| abrir / fechar menu | 59 / 60 | 33 / 17 | 0 / 0 | 0 / 0 |
| orçamento → lista | 44 | 133 | 2 | 149 |
| menu → Configurações | 59 | 33 | 0 | 0 |
| abas Orçamento / Logo / Cadastro | 59 / 60 / 59 | 33 / 17 / 33 | 0 | 0 |
| menu → Catálogo | 47 | 183 | 1 | 184 |
| rolar catálogo | 60 | 17 | 0 | 0 |

As tarefas longas acima de 50 ms já existem antes da feature: são a renderização do React ao montar a tela ou a janela, não efeito visual. O script aceita esses cenários quando não pioram mais de 15% contra o baseline. Headless não rasteriza o desfoque como um celular real, então a melhoria de rolagem por tirar `backdrop-filter` aparece pouco aqui; conferir no passo 10 do manual.

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
