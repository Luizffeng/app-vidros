# Feature Specification: Transições leves na interface

**Feature Branch**: `004-transicoes`

**Created**: 2026-10-07

**Status**: Implemented (2026-10-08)

**Input**: Dono, 2026-10-07: "Quero planejar efeitos de transição no app: telas, dropdown/select, expansão de seções, troca de tabs, abertura de modal. A intenção é mostrar uma visibilidade dos componentes para o cliente não se perder, mas também precisa ser bem leve para não prejudicar a experiência em celulares e computadores de baixa potência. Podemos seguir padrões de mercado bem avaliados para casos parecidos de sucesso, sem perder a simplicidade da plataforma."

## Contexto

Hoje a troca de tela, a abertura de seção, a troca de aba e a abertura de janela acontecem de uma vez: o conteúdo some e aparece sem indicar de onde veio. Algumas partes já têm efeito de entrada (cabeçalho, menu, lista do seletor), mas sem padrão comum, sem efeito ao fechar e sem respeitar a preferência do aparelho de "reduzir movimento". Alguns efeitos visuais atuais (desfoque atrás das seções e da barra inferior) pesam em aparelhos simples.

Objetivo: cada mudança de tela ou componente mostra, em fração de segundo, o que entrou e de onde, como em apps bem avaliados (Material Design do Google, diretrizes da Apple), sem atrasar o uso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Janelas e menus mostram de onde vêm (Priority: P1)

Ao abrir uma janela (item, prévia do PDF, Enviar, Detalhes do custo), o fundo escurece suavemente e a janela surge: no celular sobe de baixo, no computador cresce levemente no centro. Ao fechar, faz o caminho inverso, mais rápido. Seletores (dropdown), menu do topo e confirmações pequenas ("Excluir rascunho?") abrem a partir do botão que os chamou e fecham suavemente.

**Why this priority**: janelas e menus são onde o usuário mais "se perde" (algo cobre a tela de repente); é a mudança mais visível com menor custo.

**Independent Test**: abrir e fechar cada janela, seletor, menu e confirmação no celular e no computador.

**Acceptance Scenarios**:

1. **Given** celular, **When** toca em adicionar item, **Then** o fundo escurece e a janela sobe de baixo em até 0,25 s.
2. **Given** computador, **When** abre a prévia do PDF, **Then** a janela aparece com leve aumento a partir do centro em até 0,25 s.
3. **Given** janela aberta, **When** fecha (botão, Esc, toque fora), **Then** a janela sai em até 0,15 s e a página volta exatamente à mesma posição.
4. **Given** seletor fechado, **When** toca, **Then** a lista abre a partir do botão; ao escolher ou tocar fora, fecha suavemente.
5. **Given** janela abrindo, **When** o usuário toca de novo rápido (ex.: fechar logo em seguida), **Then** responde na hora, sem esperar o efeito terminar.

---

### User Story 2 - Seções e abas mudam sem pulo (Priority: P1)

Ao abrir ou fechar uma seção do orçamento (Cliente, Itens, Custos adicionais...), o conteúdo desliza e aparece em vez de pular; a seta gira junto. Ao trocar de aba (Configurações, Catálogo), o conteúdo novo aparece com um esmaecer rápido e o marcador da aba ativa desliza para a aba escolhida.

**Why this priority**: são as interações mais frequentes do orçamento; hoje o resto da página "salta".

**Independent Test**: abrir/fechar cada seção do orçamento e trocar todas as abas de Configurações e Catálogo.

**Acceptance Scenarios**:

1. **Given** seção fechada, **When** toca no título, **Then** o conteúdo se revela em até 0,25 s e o que está abaixo desce acompanhando, sem salto.
2. **Given** seção aberta, **When** toca no título, **Then** recolhe em até 0,2 s.
3. **Given** aba Estabelecimento ativa, **When** toca em Orçamento, **Then** o marcador desliza até Orçamento e o conteúdo novo aparece em até 0,15 s.
4. **Given** navegador sem suporte ao efeito de seção, **When** abre a seção, **Then** abre na hora, sem erro, com o conteúdo aparecendo com esmaecer curto.

---

### User Story 3 - Troca de tela com direção (Priority: P2)

Ao ir da lista para um orçamento, a tela nova entra com um deslocamento curto vindo da direita (avançar); ao voltar, vem da esquerda (voltar). Entre Orçamentos, Catálogo e Configurações (menu), a troca é um esmaecer rápido, sem direção.

**Why this priority**: dá orientação ("entrei", "voltei") mas a troca de tela é menos frequente que seções e janelas.

**Independent Test**: lista → orçamento → voltar; menu → Catálogo → Configurações → Orçamentos.

**Acceptance Scenarios**:

1. **Given** lista, **When** abre um orçamento, **Then** a tela do orçamento entra pela direita em até 0,25 s.
2. **Given** orçamento aberto, **When** toca voltar, **Then** a lista entra pela esquerda em até 0,25 s, na posição de rolagem em que estava.
3. **Given** Catálogo, **When** vai para Configurações pelo menu, **Then** troca com esmaecer em até 0,2 s.
4. **Given** navegador sem suporte a transição de tela, **When** troca de tela, **Then** troca na hora como hoje.

---

### User Story 4 - Leve em qualquer aparelho e respeita "reduzir movimento" (Priority: P1)

Os efeitos não podem deixar o app lento. Em aparelhos com "reduzir movimento" ligado, deslocamentos e aumentos somem: fica só um esmaecer muito curto ou nada. Efeitos pesados de desfoque saem das partes que rolam com a página.

**Why this priority**: o público usa celular em obra, muitas vezes simples; um efeito bonito que trava é pior que nenhum.

**Independent Test**: com o processador do computador limitado a 4× mais lento (ferramenta do navegador) e no celular mais simples disponível, repetir US1 a US3; ligar "reduzir movimento" no sistema e repetir.

**Acceptance Scenarios**:

1. **Given** processador 4× mais lento, **When** abre janela, seção, aba ou troca de tela, **Then** não há engasgo visível e o toque seguinte responde na hora.
2. **Given** "reduzir movimento" ligado, **When** abre uma janela, **Then** ela aparece sem subir nem crescer (no máximo esmaecer de 0,1 s).
3. **Given** lista longa de orçamentos ou catálogo, **When** rola a página, **Then** a rolagem fica tão fluida quanto antes da feature ou melhor.

### Edge Cases

- Toques rápidos seguidos (abrir e fechar, trocar abas em sequência): sempre vale o último; nada fica "preso" no meio do efeito.
- Teclado e leitor de tela: foco vai para a janela ao abrir e volta ao botão ao fechar, como hoje; efeitos não atrasam o foco.
- Janela de item com teclado numérico aberto no celular: a subida não esconde o campo focado.
- Prévia do PDF (pesada para desenhar): a janela abre na hora; o PDF aparece quando pronto, sem bloquear o efeito.
- Impressão/PDF e texto do WhatsApp: sem efeito (não se aplicam).
- Primeira carga do app: sem animação em cascata longa; a tela aparece pronta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Janelas MUST ter entrada (fundo escurece + janela sobe de baixo no celular / cresce levemente no computador) e saída mais curta que a entrada.
- **FR-002**: Seletores, menu do topo e confirmações pequenas MUST abrir a partir do botão de origem e fechar com efeito curto.
- **FR-003**: Seções que expandem MUST revelar e recolher o conteúdo sem salto do restante da página onde o navegador suportar; onde não suportar, MUST abrir na hora com esmaecer curto do conteúdo.
- **FR-004**: Troca de aba MUST deslizar o marcador da aba ativa e esmaecer o conteúdo novo.
- **FR-005**: Troca de tela MUST ter direção (avançar: da direita; voltar: da esquerda) entre lista e orçamento, e esmaecer entre seções do menu; sem suporte, MUST trocar na hora.
- **FR-006**: Todos os efeitos MUST durar no máximo 0,25 s (entradas) e 0,15–0,2 s (saídas), com uma única tabela de durações e curvas para o app inteiro.
- **FR-007**: Efeitos MUST NOT bloquear toques: o usuário pode interagir durante qualquer efeito e o último comando vence.
- **FR-008**: Com "reduzir movimento" ligado, deslocamentos, aumentos e deslizes MUST ser desligados (no máximo esmaecer ≤ 0,1 s).
- **FR-009**: Efeitos MUST mover/esmaecer elementos sem recalcular o layout da página a cada quadro, exceto a expansão de seção (FR-003), que usa o recurso nativo do navegador.
- **FR-010**: Desfoque de fundo MUST sair das seções do orçamento e de elementos fixos que ficam sobre conteúdo rolando; pode ficar no fundo das janelas (estático).
- **FR-011**: Foco e leitura por leitor de tela MUST continuar como hoje (abrir janela foca nela; fechar devolve o foco).
- **FR-012**: Nenhuma biblioteca de animação nova; o peso do app MUST não crescer mais que 2 KB comprimido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos componentes listados (telas, janelas, seletores, menu, confirmações, seções, abas) com efeito de entrada e saída seguindo a mesma tabela de durações.
- **SC-002**: Com processador 4× mais lento, nenhum efeito causa travamento perceptível (sem tarefa longa acima de 50 ms causada pelo efeito; animação a ≥ 50 quadros por segundo).
- **SC-003**: Tempo entre o toque e o primeiro sinal visual de resposta ≤ 100 ms em todos os casos.
- **SC-004**: Com "reduzir movimento" ligado, nenhum elemento se desloca ou cresce.
- **SC-005**: Rolagem da lista de orçamentos e do catálogo igual ou mais fluida que antes (medição antes/depois com processador limitado).
- **SC-006**: Testes de navegador existentes (fumaça do orçamento, catálogo) continuam passando sem esperas extras além de ≤ 0,3 s.

## Assumptions

- Referências de mercado: Material Design 3 (durações curtas 100–300 ms, curva de desaceleração para entradas), Apple HIG (respeitar "reduzir movimento", folha que sobe de baixo no celular). Usadas como guia, sem copiar visual.
- Navegadores alvo: versões atuais de Chrome/Edge, Safari (iOS) e Firefox. Recursos novos (transição de tela, expansão nativa de seção) entram como melhoria progressiva: sem suporte, comportamento atual.
- Fora do escopo: animar a entrada/saída de cada item na lista, gestos de arrastar para fechar, animação de números/totais. Podem virar itens do backlog depois.
- O efeito existente de entrada do cabeçalho em toda tela passa a seguir a nova tabela (ou é substituído pela transição de tela) para não somar dois efeitos.
