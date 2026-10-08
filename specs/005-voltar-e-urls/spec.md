# Feature Specification: Botão voltar dentro do app e endereço por tela

**Feature Branch**: `005-voltar-e-urls`

**Created**: 2026-10-08

**Status**: Draft

**Input**: Dono, 2026-10-08: "Percebi que quando eu clico no botão voltar do Android, do botão nativo, ele saiu da página, e eu já tava numa jornada, num fluxo lá, criando um orçamento. Esse botão não tá atribuído a uma ação dentro do aplicativo. A gente tem que atribuir isso de alguma forma, pra evitar que o cliente clique no botão voltar e saia da página pra parar em outro site, que o botão voltar possa performar dentro do aplicativo. Isso tem que ficar no spec também, e depois a gente pode refinar quais são as melhores práticas. Acho que isso deve tá relacionado com aquela questão de cada página ter um path no URL específico." Junta o item do backlog "URLs por tela (precisa de spec)".

## Contexto

Hoje o app troca de tela (lista de orçamentos, orçamento, Catálogo, Configurações) e abre janelas (item, prévia do PDF, Enviar, Detalhes do custo) sem avisar o navegador. Para o celular, o app inteiro é uma página só. Resultado:

- O botão voltar do Android (ou o gesto de voltar, ou o voltar do navegador no computador) sai do app e vai para a página anterior do navegador (outro site, a busca, a aba vazia), no meio de um orçamento.
- Recarregar a página sempre volta para a lista, mesmo com um orçamento aberto.
- O endereço é sempre o mesmo; não dá para guardar ou abrir direto um orçamento, o Catálogo ou uma aba de Configurações.

O que está sendo digitado no orçamento já é salvo sozinho, então sair do app não perde o orçamento; o problema é perder o lugar e a sensação de que o app "fechou sozinho".

Objetivo: o voltar do aparelho e do navegador funciona como em apps de celular bem avaliados (padrão de navegação do Android/Material Design): fecha primeiro o que está por cima, depois volta uma tela, e só sai do app a partir da tela inicial. Cada tela tem seu próprio endereço.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voltar fecha a janela aberta em vez de sair do app (Priority: P1)

O vendedor está montando um orçamento e abre a janela de item (ou a prévia do PDF, Enviar, Detalhes do custo, o seletor de tipo de item, o menu do topo, um seletor ou uma confirmação pequena). Ele aperta o voltar do Android: a janela fecha, como se tocasse em fechar/cancelar, e ele continua no orçamento.

**Why this priority**: é o caso relatado pelo dono e o mais frequente: no celular, voltar é o gesto natural para "fechar isso".

**Independent Test**: no celular Android, abrir cada janela e menu do orçamento e apertar voltar; o app continua aberto no orçamento.

**Acceptance Scenarios**:

1. **Given** orçamento aberto com a janela de item aberta, **When** aperta voltar, **Then** a janela fecha (mesmo efeito de "Cancelar") e o orçamento continua na tela, na mesma posição de rolagem.
2. **Given** prévia do PDF aberta, **When** aperta voltar, **Then** a prévia fecha e o orçamento continua na tela.
3. **Given** seletor de tipo de item aberto e o vendedor escolheu um tipo (abriu o formulário do item), **When** aperta voltar, **Then** fecha o formulário e volta ao orçamento (não reabre o seletor de tipo).
4. **Given** menu do topo, seletor (dropdown) ou confirmação pequena aberta ("Excluir rascunho?"), **When** aperta voltar, **Then** só esse elemento fecha.
5. **Given** janela aberta, **When** fecha pelo botão de fechar, Esc ou toque fora, **Then** o próximo voltar não "fecha de novo" uma janela que não existe: age sobre a tela (US2).

---

### User Story 2 - Voltar volta uma tela dentro do app (Priority: P1)

Sem janela aberta, o voltar faz o mesmo que a seta de voltar do app: do orçamento volta para a lista; do Catálogo ou de Configurações volta para a tela de onde veio. Na tela inicial (lista de orçamentos), o voltar sai do app normalmente.

**Why this priority**: completa o fluxo do dono: o vendedor nunca é jogado para fora no meio do trabalho.

**Independent Test**: lista → orçamento → voltar → voltar; lista → menu → Catálogo → voltar; repetir no Android, no iPhone (gesto de voltar no navegador) e no computador (botão voltar do navegador).

**Acceptance Scenarios**:

1. **Given** lista → abriu orçamento, **When** aperta voltar, **Then** volta para a lista, na mesma posição de rolagem e com a mesma busca e filtro, com o efeito de "voltar" da tela.
2. **Given** lista → criou orçamento novo, **When** aperta voltar, **Then** volta para a lista e o rascunho aparece nela (já salvo).
3. **Given** lista → menu → Catálogo, **When** aperta voltar, **Then** volta para a lista.
4. **Given** lista, sem janela aberta, **When** aperta voltar, **Then** sai do app como qualquer site (comportamento padrão do aparelho).
5. **Given** voltou do orçamento para a lista com o voltar, **When** aperta "avançar" no navegador do computador, **Then** reabre o mesmo orçamento.
6. **Given** a seta de voltar do app (no topo do orçamento), **When** toca nela, **Then** o resultado é o mesmo do voltar do aparelho, e o voltar seguinte do aparelho não reabre o orçamento.

---

### User Story 3 - Cada tela tem seu endereço; recarregar não perde o lugar (Priority: P2)

Cada tela principal tem um endereço próprio: lista de orçamentos, um orçamento específico, cada tabela do Catálogo, cada aba de Configurações. Recarregar a página (ou o celular reabrir o app depois de matar o navegador) volta para a mesma tela. Um endereço de orçamento copiado e aberto por outra pessoa logada da loja abre o mesmo orçamento.

**Why this priority**: resolve a perda de lugar ao recarregar e permite deep link interno, mas o problema relatado (sair do app) já fica resolvido com US1 e US2.

**Independent Test**: abrir um orçamento, copiar o endereço, recarregar; abrir o endereço em outra aba/aparelho logado.

**Acceptance Scenarios**:

1. **Given** orçamento aberto, **When** recarrega a página, **Then** o mesmo orçamento abre (janelas abertas antes do recarregar não reabrem).
2. **Given** Catálogo na tabela de ferragens, **When** recarrega, **Then** volta para o Catálogo na mesma tabela.
3. **Given** endereço de um orçamento, **When** outra pessoa logada da loja abre, **Then** vê esse orçamento (rascunho editável ou emitido só leitura, como hoje).
4. **Given** endereço de orçamento que não existe (apagado ou digitado errado), **When** abre, **Then** cai na lista com aviso "Orçamento não encontrado".
5. **Given** vendedor (sem acesso a Catálogo e Configurações), **When** abre o endereço do Catálogo ou de Configurações, **Then** cai na lista, sem ver a tela de admin.
6. **Given** não logado, **When** abre qualquer endereço do app, **Then** vê a tela de login e, depois de entrar, vai para o endereço pedido.

### Edge Cases

- Troca de aba (Catálogo, Configurações) e de filtro da lista: atualiza o endereço, mas não cria um passo de voltar por aba; voltar sai da tela, não percorre as abas (padrão Material para abas).
- Voltar apertado várias vezes rápido: cada toque age sobre um passo; o app nunca fica em estado misto (janela meio fechada, tela trocada por baixo).
- Voltar com um salvamento do orçamento em andamento: a tela volta na hora; o salvamento termina por baixo, como hoje.
- Catálogo ou Configurações com alterações ainda não salvas (que dependem de "Salvar"): o voltar pergunta antes de descartar, com as mesmas opções que o app já dá ao sair dessa tela pelo menu (se não houver aviso hoje, a pergunta é "Descartar alterações?").
- Formulário de item com medidas digitadas e não adicionadas: voltar descarta igual a "Cancelar" hoje (a refinar; ver Assumptions).
- Orçamento apagado enquanto aberto em outro aparelho: ao voltar/avançar para ele, mesmo tratamento de "não encontrado".
- Primeira tela aberta já num endereço interno (ex.: link de orçamento): o voltar a partir dele vai para a lista, não para fora do app.
- Sessão expirada no meio do uso: login aparece; depois de entrar, volta para a tela onde estava.
- Modo local (sem servidor) e app instalado na tela inicial do celular: mesmo comportamento.
- Impressão/PDF e texto do WhatsApp: não mudam; o link do PDF/WhatsApp para o cliente final não usa os endereços internos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O voltar do aparelho, o gesto de voltar e o voltar do navegador MUST fechar primeiro o elemento aberto mais acima (janela, folha Enviar, prévia, menu, seletor, confirmação pequena), com o mesmo efeito de fechá-lo pelo app.
- **FR-002**: Sem elemento aberto, o voltar MUST levar à tela anterior dentro do app (orçamento → lista; Catálogo/Configurações → tela de origem), igual à seta de voltar do app.
- **FR-003**: Na tela inicial (lista), sem elemento aberto, o voltar MUST seguir o padrão do aparelho (sair do app).
- **FR-004**: Se o app foi aberto direto num endereço interno, o primeiro voltar MUST levar à lista antes de sair do app.
- **FR-005**: Fechar uma janela ou voltar de tela pelos controles do app MUST deixar o histórico coerente: o próximo voltar do aparelho age sobre o passo anterior real, nunca reabre o que foi fechado nem exige toque extra.
- **FR-006**: Lista de orçamentos, orçamento (por número/identificador), Catálogo (por tabela) e Configurações (por aba) MUST ter endereços próprios e legíveis em português.
- **FR-007**: Recarregar ou abrir um endereço MUST mostrar a tela correspondente; janelas e menus não fazem parte do endereço e não reabrem.
- **FR-008**: Troca de aba e de filtro MUST atualizar o endereço sem criar passo extra de voltar.
- **FR-009**: Endereço de Catálogo/Configurações aberto por vendedor MUST levar à lista; a trava real de escrita continua no servidor.
- **FR-010**: Endereço de orçamento inexistente ou inacessível MUST levar à lista com aviso curto.
- **FR-011**: Sem sessão, o endereço pedido MUST ser guardado e aberto depois do login.
- **FR-012**: Voltar de uma tela com alterações não salvas que exigem "Salvar" MUST pedir confirmação antes de descartar.
- **FR-013**: O efeito de troca de tela MUST usar a direção "voltar" quando a mudança vem do voltar do aparelho/navegador e "avançar" quando vem do avançar (spec 004).
- **FR-014**: A posição de rolagem, a busca e o filtro da lista MUST ser restaurados ao voltar para ela.
- **FR-015**: Sem biblioteca nova pesada; o peso do app MUST não crescer mais que 3 KB comprimido.

### Key Entities

- **Endereço de tela**: identifica a tela (lista, orçamento X, Catálogo › tabela, Configurações › aba). Não guarda janela aberta nem dados do orçamento.
- **Passo de voltar**: cada tela aberta e cada janela/menu aberto por cima dela. Abas e filtros não são passos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das janelas, menus, seletores e confirmações do app, o voltar do Android fecha o elemento e o app continua aberto.
- **SC-002**: Partindo de qualquer tela ou janela, o vendedor só sai do app depois de chegar à lista e apertar voltar mais uma vez (zero saídas inesperadas no teste de jornada completa: criar orçamento, adicionar 3 itens, prévia, enviar, voltar até sair).
- **SC-003**: Recarregar em qualquer tela principal volta para a mesma tela em 100% dos casos testados (lista, orçamento rascunho, orçamento emitido, cada tabela do Catálogo, cada aba de Configurações).
- **SC-004**: A resposta ao voltar (início do fechamento/troca) aparece em até 100 ms.
- **SC-005**: Testes de navegador existentes (fumaça do orçamento, catálogo, transições) continuam passando.

## Assumptions

- Referências de mercado: navegação do Android/Material Design (voltar fecha o que está por cima, depois volta uma tela; abas não criam passos; sair só da tela inicial) e Apple HIG (gesto de voltar do navegador no iPhone segue a mesma lógica). Usadas como guia; detalhes a refinar com `/speckit-clarify`.
- Na tela inicial o voltar sai do app (padrão do aparelho). Alternativa "aperte voltar de novo para sair" fica para refinar se o dono quiser.
- Formulário de item com dados digitados: voltar descarta igual a "Cancelar" hoje, sem pergunta. Se o dono preferir proteger medidas digitadas, vira pergunta "Descartar item?" (refinar).
- Endereço de orçamento é interno (só pessoas logadas da loja). Não é link público para o cliente final.
- A futura "Página inicial" (backlog) passa a ser a tela inicial quando existir; o FR-003/FR-004 passa a valer para ela.
- O servidor de hospedagem já devolve o app para qualquer endereço, então abrir um endereço interno direto funciona sem mudança de hospedagem.
- Fora do escopo: lembrar entre sessões o último orçamento aberto sem estar no endereço (ex.: reabrir o app pelo ícone volta para a lista), link público de orçamento para o cliente, gesto de arrastar para fechar janela.
