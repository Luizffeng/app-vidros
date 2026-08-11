# Item images

Ícones e diagramas dos tipos de produto no orçamento.

## Estrutura

| Pasta | Conteúdo |
|-------|----------|
| `svg/` | Diagramas vetoriais (fonte). Variantes `-aluminio` para perfil/ferragem cinza + vidro Incolor gradiente. |
| `png/` | Raster exportado ou referências (extrações antigas). |

## Vidro Incolor

| Arquivo | Uso |
|---------|-----|
| `svg/glass-fill-incolor.svg` | Padrão plano (tile 84×56). Referência / fallback. |
| `svg/glass-fill-incolor-gradient.svg` | **Padrão ativo** — gradiente `#C8EBFA`→`#A8D8F0` + faixas `#glass-incolor-stripes`. |
| `svg/_glass-gradient-defs.snippet.svg` | Snippet do pattern de faixas para copiar. |

Nos diagramas `-aluminio`: copiar `<pattern id="glass-incolor-stripes">` + `<linearGradient>` por painel; dentro do `clipPath`, duas camadas (gradiente + faixas).

## Convenção de nomes

| Arquivo | Descrição |
|---------|-----------|
| `nome-do-item.svg` | Ferragens e perfil preto (`#000`), vidro branco |
| `nome-do-item-aluminio.svg` | Ferragens/perfil alumínio (`#9AA0A6`), vidro Incolor gradiente |

Tamanho padrão: **320×240** (`viewBox="0 0 320 240"`).

## Catálogo SVG

| # | Item | Slug |
|---|------|------|
| 1 | Porta Pivotante + Fixo | `porta-pivotante-fixo` |
| 2 | Porta Pivotante | `porta-pivotante` |
| 3 | Porta Correr 1 Folha | `porta-correr-1f` |
| 4 | Porta Correr 4 Folhas | `porta-correr-4f` |
| 5 | Porta Correr 2 folhas | `porta-correr-2f` |
| 6 | Maxim-ar (banheiro) | `maxim-ar` |
| 7 | Janela 4 Folhas | `janela-4f` |
| 8 | Janela 2 Folhas | `janela-2f` |
| 9 | Báscula | `bascula` |
