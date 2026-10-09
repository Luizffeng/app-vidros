# Benchmark: telas iniciais (2026-10-09)

Referências para o Início do App Vidros: carrossel de banners no topo + grade de blocos por módulo (pedido do dono).

## Apps de consumo (Brasil)

| App | Topo | Corpo | O que copiar |
| --- | --- | --- | --- |
| Nubank | Saldo/olá; sem carrossel grande | Cartões por produto (conta, cartão, empréstimo) com 1 número e 1 ação; atalhos em linha; "Descubra mais" em cartões horizontais pequenos | Cada cartão mostra **um** número relevante e leva à tela do produto. Divulgação fica **abaixo** do que é tarefa. Reorganizou o app por "modelo mental" (o que o usuário quer fazer), não por produto. |
| Mercado Pago / Inter / PicPay | Saldo + carrossel de banners (ofertas, novidades) logo abaixo | Grade de atalhos (ícone + rótulo), 4 por linha | Banner com **pedaço do próximo** aparecendo à direita (sinal de que dá para arrastar) e pontinhos de posição. Atalhos de módulo em grade. |
| iFood | Carrossel de promoções | Grade de categorias em blocos arredondados | Blocos quadrados com ícone/imagem e rótulo curto; tocar o bloco inteiro. |

## Apps de gestão (lojista)

| App | Padrão | O que copiar |
| --- | --- | --- |
| Shopify (app e App Home) | Página inicial com métricas-chave, "itens que precisam de atenção", guia de configuração para quem está começando | Bloco mostra o que **pede ação** (ex.: "3 vencendo") antes de números de vaidade. Guia de cadastro some quando concluído. |
| Painéis de vendedor (marketplaces) | Blocos de métrica simplificados: título, 1 valor, etiqueta de urgência, 1 ação | Etiqueta de urgência (cor/ícone) no bloco; no máximo 1 ação por bloco; nada de densidade de números. |
| Widgets iOS/Android, "bento grid" | Blocos de tamanhos fixos (1×1, 2×1) com cantos arredondados | Grade de 2 colunas no celular; bloco largo (2×1) para o módulo principal quando precisar de mais texto. |

## Regras de carrossel (pesquisa de usabilidade)

- **Não passar sozinho no celular** (NN/g): a página é curta, o usuário rola rápido e não vê a troca; o movimento faz parecer anúncio ("cegueira de banner") e atrapalha quem tem dificuldade motora. Se passar sozinho, pausar ao tocar, respeitar "reduzir movimento" e ter controle de pausa (W3C/WCAG para movimento > 5 s).
- **Até 5 banners**; mostrar quantos são e em qual está (pontinhos).
- **Arrastar com o dedo** e mostrar a borda do próximo banner.
- **Nada crítico só no carrossel**: aviso que exige ação (ex.: cadastro incompleto) aparece também no bloco do módulo.
- Texto legível sem zoom: título curto (até ~6 palavras) + 1 linha.
- Altura contida (proporção ~2:1 ou 16:7) para os blocos aparecerem sem rolar num celular de 360 px.

## Regras de blocos (grade)

- Bloco inteiro clicável; título do módulo + ícone; **1 a 2 linhas de resumo**; etiqueta/selo quando pede ação.
- Selo de alerta: ponto ou "!" com cor de atenção, e o motivo escrito no bloco (não só cor).
- Ordem por frequência de uso: Orçamentos primeiro.
- Resumos calculados com o que o app já tem; nada que exija cadastro novo só para o bloco.

## Recomendação para o App Vidros

1. Carrossel no topo, largura total, arrastável, sem passar sozinho, pontinhos, borda do próximo visível, até 5 banners. Banner pode levar a uma tela do app.
2. Grade de 2 colunas com blocos quadrados de cantos arredondados: **Orçamentos** (ex.: "2 vencendo · 5 rascunhos"), **Catálogo** ("Atualizado em 10/07"), **Configurações** (selo "!" + motivo quando falta algo obrigatório).
3. "Continuar {código}" como faixa curta entre o carrossel e a grade (tarefa do dia acima de tudo, como no Nubank/Shopify).
4. "Novo orçamento" na barra inferior, como hoje.

**Decisão do dono (2026-10-09)**, divergindo em dois pontos: o carrossel troca sozinho (5 s, com pausa ao tocar, arrasto e respeito a "reduzir movimento"), e o "Continuar" sai do Início. Ver Clarifications em `spec.md`.

Fontes: [NN/g, carrosséis automáticos](https://www.nngroup.com/articles/auto-forwarding/), [NN/g, carrosséis eficazes](https://www.nngroup.com/articles/designing-effective-carousels/), [NN/g, princípios de homepage](https://www.nngroup.com/articles/homepage-design-principles/), [W3C APG, padrão carrossel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/), [Shopify App Home, homepage](https://shopify.dev/docs/api/app-home/latest/patterns/templates/homepage), [Building Nubank, Tabs](https://building.nubank.com/how-we-created-tabs/).
