# Item images

Ícones e diagramas dos tipos de produto no orçamento.

## Estrutura

| Pasta | Conteúdo |
|-------|----------|
| `svg/` | Diagramas vetoriais (fonte). Variantes `-aluminio` para ferragem/perfil cinza. |
| `svg/glass-fill-incolor.svg` | Padrão **repetível** Incolor (`#glass-incolor-tile`, tile 84×56, rotação 32°). Sem emendas de grade. Copiar `<pattern>`; `fill="url(#glass-incolor-tile)"` + `clipPath`. |
| `svg/glass-fill-incolor-gradient.svg` | Variante de teste com gradiente leve no fundo do tile. |
| `svg/porta-pivotante-aluminio-gradient.svg` | Porta pivotante alumínio usando a variante com gradiente. |
| `png/` | Raster exportado ou referências (quando necessário). |

## Convenção de nomes

- `nome-do-item.svg` — ferragens e perfil externo preto (`#000`)
- `nome-do-item-aluminio.svg` — ferragens e perfil externo alumínio (`#9AA0A6`)

Tamanho padrão: **320×240** (`viewBox="0 0 320 240"`).
