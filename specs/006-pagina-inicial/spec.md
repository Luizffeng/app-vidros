# Feature Specification: Página inicial (Início)

**Feature Branch**: `006-pagina-inicial`

**Created**: 2026-10-09

**Status**: Draft (clarificado 2026-10-09)

**Input**: Dono, 2026-10-09: "Gostaria de ter uma homepage também, e o botão de voltar nas telas de config, orçamentos, etc., levasse para essa homepage." Desenho pedido em seguida: "No topo, um carrosselzinho de banners, que vai ocupar a tela inteira lateralmente, com avisos, atualizações, alguma promoção. Logo abaixo do banner, duas colunas com componentes quadrados, cantos arredondados: orçamento, catálogo, configuração, os módulos macro do aplicativo. Dentro de cada componente, um resumo relevante: o catálogo, última atualização; orçamentos, X orçamentos a vencer ou Y emitidos; configuração não precisa ter nada, a não ser algum alerta de atualização obrigatória, uma exclamação. Trazer benchmark do que outros grandes aplicativos fazem." Benchmark: [benchmark.md](benchmark.md).

## Clarifications

### Session 2026-10-09

- Q: Quem vê o resumo do mês (quantidade e soma dos emitidos)? → A: Ninguém; não há resumo do mês.
- Q: Com quantos dias de antecedência um emitido conta como "vencendo"? → A: 7 dias.
- Q: O Início tem busca de orçamento? → A: Não; a busca fica só na lista de Orçamentos.
- Q: De onde vêm os banners? → A: Fixos do app, publicados junto com cada versão (sempre pelo menos 2). Ex.: "Em breve teremos …", "Sabia que no plano anual você economiza R$ …?", "Confira os detalhes das últimas atualizações". Modelos e gatilhos de banner ficam para depois.
- Q: O carrossel passa sozinho? → A: Sim, com troca rápida; pausa ao tocar; dá para arrastar para o próximo ou o anterior.
- Q: Onde fica o "Continuar {código}"? → A: Sai do Início. O orçamento em andamento aparece só como rascunho na lista de Orçamentos.
- Q: Como fica o Início para o vendedor? → A: O papel Vendedor fica desativado por ora (usuários iniciais são autônomos e controlam catálogo e configurações). Todos veem o mesmo Início.

## Contexto

Hoje o app abre direto na lista de orçamentos. Catálogo e Configurações só aparecem no menu, e nada mostra de relance o que pede atenção (propostas perto de vencer, rascunhos parados, cadastro da loja incompleto).

Objetivo: uma tela de entrada com dois blocos:

1. **Carrossel de banners** no topo, de ponta a ponta, com avisos, novidades e divulgação do app.
2. **Grade de módulos**: blocos quadrados, cantos arredondados, em duas colunas, um por módulo (Orçamentos, Catálogo, Configurações), cada um com um resumo curto e um alerta quando algo pede ação.

É também o ponto de retorno do botão voltar (spec 005): Orçamentos, Catálogo e Configurações voltam para o Início, e só no Início o voltar sai do app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver de relance o estado de cada módulo e entrar nele (Priority: P1)

O usuário abre o app e vê a grade de módulos. Cada bloco mostra o nome do módulo, um ícone e um resumo:

- **Orçamentos**: quantos emitidos estão vencendo (validade em 7 dias ou menos), em destaque de atenção, e quantos rascunhos estão em aberto. Sem nada pendente, mostra quantos foram emitidos.
- **Catálogo**: "Atualizado em {data}" (data da versão atual dos preços).
- **Configurações**: nada em situação normal; com pendência obrigatória, selo "!" e o motivo em uma linha (ex.: "Complete o cadastro da loja").
- **Ajuda**: "Em breve", desativado (como no menu hoje), para completar a grade.

Tocar em qualquer parte do bloco abre o módulo.

**Why this priority**: é o coração do Início: navegação para os módulos e o que pede atenção, em um toque.

**Independent Test**: com dados variados (emitidos vencendo, rascunhos, nenhum orçamento, cadastro incompleto), conferir o texto de cada bloco e para onde ele leva.

**Acceptance Scenarios**:

1. **Given** 2 emitidos vencendo em até 7 dias e 5 rascunhos, **When** abre o Início, **Then** Orçamentos mostra "2 vencendo" em destaque e "5 rascunhos".
2. **Given** nenhum vencendo e nenhum rascunho, com 12 emitidos, **When** abre o Início, **Then** Orçamentos mostra "12 emitidos".
3. **Given** nenhum orçamento, **When** abre o Início, **Then** Orçamentos mostra "Nenhum orçamento ainda".
4. **Given** catálogo com versão de 10/07/2026, **When** abre o Início, **Then** Catálogo mostra "Atualizado em 10/07/2026".
5. **Given** cadastro da loja sem nome ou sem telefone, **When** abre o Início, **Then** Configurações mostra o selo "!" e "Complete o cadastro da loja"; tocar abre Configurações › Cadastro.
6. **Given** cadastro completo, **When** abre o Início, **Then** Configurações não mostra selo nem resumo.
7. **Given** qualquer bloco ativo, **When** toca nele, **Then** abre o módulo; o voltar (aparelho ou seta do topo) retorna ao Início.
8. **Given** bloco Ajuda, **When** toca nele, **Then** nada acontece (aparece como desativado, "Em breve").

---

### User Story 2 - Banners com avisos e novidades (Priority: P1)

No topo do Início, um carrossel de ponta a ponta mostra os banners publicados com o app (no mínimo 2). Os banners trocam sozinhos; o usuário pode arrastar para o próximo ou o anterior; enquanto o dedo está sobre o banner, a troca para. Pontinhos mostram quantos são e qual está na tela. Um banner pode ter uma ação (abrir uma tela do app ou um endereço externo) ou ser só informativo.

**Why this priority**: é o canal do app para avisar novidades, mudanças e ofertas, pedido explícito do dono.

**Independent Test**: abrir o Início, esperar trocas, arrastar nos dois sentidos, segurar o dedo, tocar num banner com ação e num sem ação; repetir com "reduzir movimento" ligado.

**Acceptance Scenarios**:

1. **Given** Início aberto, **When** passam 5 s sem toque, **Then** o próximo banner entra com deslize curto; depois do último, volta ao primeiro.
2. **Given** banner na tela, **When** arrasta para a esquerda/direita, **Then** vai para o próximo/anterior e a contagem dos 5 s recomeça.
3. **Given** dedo segurando o banner, **When** passam mais de 5 s, **Then** o banner não troca; volta a contar ao soltar.
4. **Given** banner com ação, **When** toca nele, **Then** abre a tela do app indicada (voltar retorna ao Início) ou o endereço externo em outra aba.
5. **Given** banner sem ação, **When** toca nele, **Then** nada acontece além de pausar a troca.
6. **Given** "reduzir movimento" ligado no aparelho, **When** abre o Início, **Then** os banners não trocam sozinhos (só arrastando ou pelos pontinhos).
7. **Given** app em segundo plano ou Início fora da tela, **When** volta, **Then** a troca continua de onde parou, sem pular vários banners de uma vez.
8. **Given** banner com período de exibição (ex.: "Em breve" até 30/11), **When** a data passa, **Then** ele não aparece mais; se sobrarem menos de 2, aparecem os banners padrão do app.

### Edge Cases

- Primeiro uso (nenhum orçamento, cadastro vazio): carrossel normal; Orçamentos "Nenhum orçamento ainda"; Configurações com "!" e "Complete o cadastro da loja".
- Dados carregando (rede lenta): grade aparece com espaços reservados nos resumos; banners e "Novo orçamento" funcionam na hora (banners não dependem da rede).
- Falha ao carregar orçamentos ou configurações: o bloco afetado mostra "Não foi possível carregar"; os outros funcionam.
- Banner com imagem que não carrega: mostra o título e o texto sobre o fundo padrão.
- Texto de banner longo: cortado em 2 linhas com reticências; o banner não cresce de altura.
- Tela larga (computador): carrossel limitado à largura do conteúdo; grade continua em 2 colunas, blocos com tamanho máximo.
- Leitor de tela: carrossel anunciado como "Avisos, banner 1 de 3"; troca automática para quando o foco entra no carrossel; pontinhos são botões com o título do banner.
- Muitos orçamentos (centenas): contagens do bloco calculadas sem atrasar a abertura.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O Início MUST ser a primeira tela ao abrir o app pelo ícone ou pelo endereço raiz, e o destino do voltar de Orçamentos, Catálogo e Configurações (spec 005).
- **FR-002**: O Início MUST ter "Novo orçamento" na barra inferior, com o mesmo comportamento do botão da lista de Orçamentos.
- **FR-003**: O topo MUST ter um carrossel de largura total com os banners do app (mínimo 2, máximo 5 visíveis ao mesmo tempo), pontinhos de posição e a borda do banner seguinte visível.
- **FR-004**: O carrossel MUST trocar sozinho a cada 5 s, em ciclo; MUST pausar enquanto o dedo/ponteiro está sobre ele ou o foco do teclado está nele; MUST permitir arrastar para o próximo e o anterior; cada interação MUST reiniciar a contagem.
- **FR-005**: Com "reduzir movimento" ligado, o carrossel MUST NOT trocar sozinho; troca sem deslize.
- **FR-006**: Cada banner MUST ter título curto e texto de até 2 linhas, MAY ter imagem/ilustração, MAY ter ação (tela do app ou endereço externo) e MAY ter período de exibição (início/fim). Banners vêm com o app (sem cadastro pelo usuário); fora do período não aparecem; se sobrarem menos de 2, entram os banners padrão.
- **FR-007**: Abaixo do carrossel, o Início MUST mostrar uma grade de 2 colunas com blocos quadrados de cantos arredondados, nesta ordem: Orçamentos, Catálogo, Configurações, Ajuda. Bloco inteiro clicável.
- **FR-008**: Bloco Orçamentos MUST mostrar, nesta prioridade: emitidos vencendo (validade em 7 dias ou menos, inclusive hoje) em destaque de atenção; rascunhos em aberto; e, sem nenhum dos dois, total de emitidos; sem orçamentos, "Nenhum orçamento ainda".
- **FR-009**: Bloco Catálogo MUST mostrar "Atualizado em {data}" a partir da versão atual do catálogo.
- **FR-010**: Bloco Configurações MUST mostrar selo "!" e o motivo quando houver pendência obrigatória (nesta versão: cadastro da loja sem nome ou sem telefone) e levar direto à seção pendente; sem pendência, só título e ícone.
- **FR-011**: Bloco Ajuda MUST aparecer desativado com "Em breve" até a Ajuda existir.
- **FR-012**: Alertas MUST ter o motivo escrito, não só cor ou símbolo.
- **FR-013**: O menu do topo MUST ganhar "Início"; o Início MUST seguir o cabeçalho, menu, fundo e transições das outras telas.
- **FR-014**: O Início MUST NOT mostrar resumo do mês, valores somados, busca, lista de orçamentos nem atalho "Continuar".
- **FR-015**: O Início MUST NOT exigir dado novo guardado no servidor; resumos vêm dos orçamentos, do catálogo e das configurações que o app já carrega; banners vêm com o app.

### Key Entities

- **Banner**: aviso publicado com o app. Título, texto, imagem opcional, ação opcional (tela do app ou endereço externo), período de exibição opcional, ordem. Não editável pelo usuário nesta versão.
- **Bloco de módulo**: um por módulo (Orçamentos, Catálogo, Configurações, Ajuda); título, ícone, resumo calculado na hora, alerta opcional com motivo, destino ao tocar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em um celular de 360 × 640 px, o carrossel e as duas linhas de blocos aparecem sem rolar, com "Novo orçamento" visível na barra.
- **SC-002**: Do toque no ícone até entrar em qualquer módulo: 1 toque.
- **SC-003**: 100% das pendências obrigatórias de Configurações aparecem no bloco com o motivo escrito.
- **SC-004**: O banner não troca enquanto o usuário toca ou segura; com "reduzir movimento", 0 trocas automáticas.
- **SC-005**: Com 500 orçamentos salvos, o Início fica pronto tão rápido quanto a lista com os mesmos dados.
- **SC-006**: Troca de banner fluida com o processador 4× mais lento (mesmo critério da spec 004).

## Assumptions

- **Tempo de troca**: 5 s por banner. Base: leitura de ~3 palavras por segundo (NN/g) para título curto + 2 linhas (~12–15 palavras); o dono pediu troca rápida. A pesquisa recomenda não trocar sozinho no celular; a decisão do dono prevalece, com as proteções de pausa, arrasto e "reduzir movimento" (W3C/WCAG).
- **Papel Vendedor desativado**: todos os usuários têm acesso a Catálogo e Configurações; o Início é igual para todos. Reativar o Vendedor é assunto da spec de Login, contas e autorização (backlog).
- Banners iniciais (mínimo 2) escritos pelo dono a cada versão. O banner "plano anual" é só texto/link nesta versão: o app não tem planos nem cobrança hoje (virão com a spec de SaaS, backlog).
- "Confira os detalhes das últimas atualizações" precisa de um destino (tela ou página de novidades), que não existe hoje; até existir, o banner fica sem ação ou aponta para um endereço externo.
- "Vencendo" usa a validade já calculada em cada emitido (Configurações › Validade padrão). Já vencidos não contam como "vencendo".
- "Atualizado em" usa a data da versão do catálogo; editar um preço sem nova versão não muda a data.
- Pendência obrigatória nesta versão é só o cadastro mínimo da loja (nome e telefone, usados no PDF e no WhatsApp). Outras pendências entram depois com o mesmo selo.
- Rascunhos ficam visíveis só na lista de Orçamentos (contagem no bloco).
- Fora do escopo: banners editáveis pelo usuário, modelos e gatilhos de banner, tela de novidades, resumo do mês, personalizar a grade, notificações.
