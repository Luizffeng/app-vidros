# Feature Specification: Composição do custo do item (janela "Detalhes do custo")

**Feature Branch**: `003-composicao-do-item`

**Created**: 2026-10-06

**Status**: Draft

**Input**: Backlog: "'+ mais detalhes' no custo do item: modal com composição (vidro, alumínio, ferragem, acessório, mão de obra) com quantidade, unidade, preço unitário e subtotal. Admin edita preço → salva no catálogo geral (bump de versão), recalcula o item aberto, aviso 'Catálogo atualizado'. Vendedor só visualiza."

## Contexto

Hoje "Detalhes do custo" do item mostra só totais por grupo (Vidros, Alumínios, Ferragens...). O vendedor não vê de onde vem cada valor, e quando o admin percebe um preço desatualizado precisa sair do orçamento, achar o código no Catálogo, corrigir e voltar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a composição do item (Priority: P1)

No item do orçamento, tocar em "Detalhes do custo" abre direto uma janela de detalhamento (não expande mais na lista). No topo, o resumo de hoje: totais por grupo, custo, margem e preço. Abaixo, cada linha usada no cálculo: descrição, código, quantidade, unidade (m², m, un, barra), preço unitário e subtotal, agrupadas por Vidro, Alumínio, Ferragem, Acessório e Mão de obra, com o total de cada grupo. A prévia de custo dentro do formulário do item continua como está.

**Why this priority**: entrega valor sozinho (transparência para o vendedor e conferência com a planilha) e é a base para editar preço.

**Independent Test**: abrir um item J4F conhecido e conferir linha a linha contra a planilha de referência.

**Acceptance Scenarios**:

1. **Given** item correr J4F 1950×754, **When** toca em "Detalhes do custo", **Then** a janela abre com o resumo no topo e vê cada vidro, perfil, ferragem e acessório com quantidade, unidade, unitário e subtotal, e a soma dos grupos é igual ao "Custo" do item.
2. **Given** perfil com acréscimo de cor, **When** abre a composição, **Then** a linha mostra o unitário já com o acréscimo e indica o percentual aplicado.
3. **Given** orçamento emitido, **When** abre a composição, **Then** vê os valores congelados na emissão, sem edição.
4. **Given** janela aberta no celular, **When** fecha, **Then** volta ao orçamento na mesma posição de rolagem.

---

### User Story 2 - Admin corrige preço pela composição (Priority: P2)

Admin, em rascunho, toca no preço unitário de uma linha de catálogo e digita o novo valor. Duas ações aparecem:

- **Só neste orçamento**: o preço vale apenas para este orçamento (preço próprio). O Catálogo não muda.
- **Atualizar no catálogo**: abre confirmação no mesmo estilo de "Excluir rascunho?", com o aviso "Novos orçamentos usam o preço novo. Outros rascunhos mostram um aviso para atualizar. Emitidos não mudam." Ao confirmar, o Catálogo guarda o preço novo, o rascunho aberto é recalculado com ele e aparece "Catálogo atualizado". Os outros rascunhos mostram o aviso "Atualizar valores" (spec 002) e só mudam quando alguém tocar nele.

**Why this priority**: economiza o vai e volta ao Catálogo e permite negociar um preço pontual sem mexer na tabela; depende da US1.

**Independent Test**: em rascunho, mudar o unitário de um perfil com cada ação; conferir item recalculado, outro rascunho com o mesmo perfil e o Catálogo.

**Acceptance Scenarios**:

1. **Given** admin em rascunho, **When** escolhe "Só neste orçamento", **Then** todos os itens deste orçamento que usam o código recalculam com o preço novo, a linha mostra a marca "preço deste orçamento" e o Catálogo e os outros rascunhos não mudam.
2. **Given** linha com preço deste orçamento, **When** admin escolhe "Voltar ao preço do catálogo", **Then** a linha volta ao preço do Catálogo e os itens recalculam.
3. **Given** admin em rascunho, **When** escolhe "Atualizar no catálogo" e confirma, **Then** o Catálogo guarda o preço novo, este rascunho recalcula, os outros rascunhos passam a mostrar o aviso "Atualizar valores", orçamentos novos já nascem com o preço novo e aparece "Catálogo atualizado".
4. **Given** a confirmação de "Atualizar no catálogo" aberta, **When** admin toca "Não", **Then** nada muda.
5. **Given** vendedor, **When** abre a composição, **Then** vê os preços sem poder editar.
6. **Given** linha com acréscimo de cor, **When** admin edita, **Then** edita o preço base (sem acréscimo) e o unitário exibido continua com o acréscimo.
7. **Given** linha de mão de obra, **When** admin abre a composição, **Then** a taxa aparece mas não é editável aqui (continua em Catálogo › Mão de obra / margem).

### Edge Cases

- Item avulso / texto: sem linhas de catálogo; a janela mostra só o resumo.
- Código que ficou inativo depois do item ser criado: linha mostra o preço guardado; edição bloqueada com aviso.
- Admin cancela a edição: nada muda.
- Valor inválido (vazio, negativo, texto): não salva; mantém o anterior.
- Rascunho com preço próprio para o código quando o Catálogo é atualizado: mantém o preço próprio.
- Emitido com preço próprio: continua igual; revisão herda o preço próprio.
- Preço próprio igual ao do Catálogo: deixa de ser preço próprio (sem marca).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: "Detalhes do custo" no item do orçamento MUST abrir uma janela (substitui a lista que expande) com o resumo no topo e todas as linhas do cálculo com descrição, código, quantidade, unidade, preço unitário e subtotal.
- **FR-002**: Linhas MUST ser agrupadas por Vidro, Alumínio, Ferragem, Acessório e Mão de obra, com total por grupo e custo total igual ao "Custo" do item.
- **FR-003**: Linhas com acréscimo de cor MUST mostrar o percentual aplicado.
- **FR-004**: Admin MUST poder editar o preço unitário de linhas de catálogo apenas em rascunho, escolhendo "Só neste orçamento" ou "Atualizar no catálogo".
- **FR-005**: "Só neste orçamento" MUST aplicar o preço a todos os itens do orçamento com aquele código, marcar a linha e permitir voltar ao preço do Catálogo; Catálogo e outros orçamentos MUST NOT mudar.
- **FR-005a**: "Atualizar no catálogo" MUST pedir confirmação com aviso; ao confirmar, MUST salvar no Catálogo (nova versão), recalcular o rascunho aberto (mantendo preços próprios) e avisar "Catálogo atualizado". Outros rascunhos MUST seguir a regra de rascunho desatualizado da spec 002 (aviso + "Atualizar valores"), mantendo preços próprios ao atualizar.
- **FR-005b**: Preço próprio MUST ficar guardado no orçamento, sobreviver à edição do item e à emissão, e ser herdado pela revisão.
- **FR-006**: Vendedor MUST ver a composição sem editar. A gravação no Catálogo MUST ser bloqueada no servidor para não-admin (regra existente); "Só neste orçamento" é bloqueado na tela (orçamentos já são editáveis por qualquer usuário logado).
- **FR-007**: Orçamento emitido MUST mostrar a composição congelada e MUST NOT permitir edição.
- **FR-008**: Valores calculados por tipo de produto MUST continuar idênticos aos de hoje (testes de paridade).

### Key Entities

- **Linha de composição**: descrição, código, grupo, quantidade, unidade, preço unitário, subtotal, origem no catálogo (tabela + item), acréscimo de cor aplicado.
- **Catálogo**: recebe o preço novo e muda de versão.
- **Preço próprio do orçamento**: código do catálogo + preço, válido só naquele orçamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em todos os tipos de produto, soma das linhas = custo do item ao centavo.
- **SC-002**: Composição do J4F 1950×754 bate com a planilha de referência linha a linha.
- **SC-003**: Admin corrige um preço a partir do orçamento em menos de 20 segundos, sem sair da tela.
- **SC-004**: Itens já salvos (sem unidade/origem nas linhas) abrem a composição sem erro.

## Assumptions

- Itens salvos antes desta feature não têm unidade nem origem: a composição mostra o que houver e não permite editar essas linhas até o item ser recalculado.
- Só o preço unitário é editável; quantidades vêm da fórmula e não mudam aqui.
- Mão de obra entra como linha da composição (taxa × área ou avulso), só leitura.
- Admin tem permissão de escrever no Catálogo (regra de hoje).
- Janela direta em vez de "+ mais detalhes" (dono, 2026-10-07): um toque até as linhas, um só lugar para resumo e edição.
- Só admin edita preço, inclusive "Só neste orçamento". Abrir o preço próprio para o vendedor fica para depois, se o dono pedir.
