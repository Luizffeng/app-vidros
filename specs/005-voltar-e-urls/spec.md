# Feature Specification: Botão voltar dentro do app e endereço por tela

**Feature Branch**: `005-voltar-e-urls`

**Created**: 2026-10-08

**Status**: Draft (clarificado 2026-10-09)

**Input**: Dono, 2026-10-08: "Percebi que quando eu clico no botão voltar do Android, do botão nativo, ele saiu da página, e eu já tava numa jornada, num fluxo lá, criando um orçamento. Esse botão não tá atribuído a uma ação dentro do aplicativo. A gente tem que atribuir isso de alguma forma, pra evitar que o cliente clique no botão voltar e saia da página pra parar em outro site, que o botão voltar possa performar dentro do aplicativo. Isso tem que ficar no spec também, e depois a gente pode refinar quais são as melhores práticas. Acho que isso deve tá relacionado com aquela questão de cada página ter um path no URL específico." Junta o item do backlog "URLs por tela (precisa de spec)".

## Clarifications

### Session 2026-10-09

- Q: Na lista de orçamentos, o voltar sai do app? → A: Não. O app ganha uma tela **Início** (página inicial). O voltar em Orçamentos, Catálogo e Configurações leva ao Início; só no Início o voltar sai do app. O conteúdo do Início é definido na spec da Página inicial (backlog).
- Q: Voltar com medidas digitadas no formulário de item descarta sem perguntar? → A: Não descarta. O que foi digitado fica guardado como **item em rascunho** daquele orçamento, pronto para continuar.
- Q: Reabrir o app pelo ícone (depois de fechado) volta ao último orçamento? → A: Abre o Início. (Atalho "Continuar {código}" chegou a ser decidido e foi retirado no desenho da spec 006: o orçamento em andamento aparece como rascunho na lista.)

## Contexto

Hoje o app troca de tela (lista de orçamentos, orçamento, Catálogo, Configurações) e abre janelas (item, prévia do PDF, Enviar, Detalhes do custo) sem avisar o navegador. Para o celular, o app inteiro é uma página só. Resultado:

- O botão voltar do Android (ou o gesto de voltar, ou o voltar do navegador no computador) sai do app e vai para a página anterior do navegador (outro site, a busca, a aba vazia), no meio de um orçamento.
- Recarregar a página sempre volta para a lista, mesmo com um orçamento aberto.
- O endereço é sempre o mesmo; não dá para guardar ou abrir direto um orçamento, o Catálogo ou uma aba de Configurações.

O que está sendo digitado no orçamento já é salvo sozinho, então sair do app não perde o orçamento; o problema é perder o lugar e a sensação de que o app "fechou sozinho". A exceção é o formulário de item: medidas digitadas e ainda não adicionadas se perdem ao fechar.

Objetivo: o voltar do aparelho e do navegador funciona como em apps de celular bem avaliados (padrão de navegação do Android/Material Design): fecha primeiro o que está por cima, depois volta uma tela, e só sai do app a partir do Início. Cada tela tem seu próprio endereço.

### Mapa de telas

```text
Início
├── Orçamentos (lista)
│   └── Orçamento
├── Catálogo (abas por tabela)
└── Configurações (abas)
```

O voltar segue o caminho real que o usuário fez. Quando não há caminho (app aberto direto num endereço ou recarregado), sobe um nível no mapa: Orçamento → Orçamentos → Início.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voltar fecha a janela aberta em vez de sair do app (Priority: P1)

O vendedor está montando um orçamento e abre a janela de item (ou a prévia do PDF, Enviar, Detalhes do custo, o seletor de tipo de item, o menu do topo, um seletor ou uma confirmação pequena). Ele aperta o voltar do Android: a janela fecha e ele continua no orçamento.

**Why this priority**: é o caso relatado pelo dono e o mais frequente: no celular, voltar é o gesto natural para "fechar isso".

**Independent Test**: no celular Android, abrir cada janela e menu do orçamento e apertar voltar; o app continua aberto no orçamento.

**Acceptance Scenarios**:

1. **Given** orçamento aberto com a janela de item aberta, **When** aperta voltar, **Then** a janela fecha e o orçamento continua na tela, na mesma posição de rolagem (o que foi digitado segue a US4).
2. **Given** prévia do PDF aberta, **When** aperta voltar, **Then** a prévia fecha e o orçamento continua na tela.
3. **Given** seletor de tipo de item aberto e o vendedor escolheu um tipo (abriu o formulário do item), **When** aperta voltar, **Then** fecha o formulário e volta ao orçamento (não reabre o seletor de tipo).
4. **Given** menu do topo, seletor (dropdown) ou confirmação pequena aberta ("Excluir rascunho?"), **When** aperta voltar, **Then** só esse elemento fecha.
5. **Given** janela aberta, **When** fecha pelo botão de fechar, Esc ou toque fora, **Then** o próximo voltar não "fecha de novo" uma janela que não existe: age sobre a tela (US2).

---

### User Story 2 - Voltar volta uma tela; só sai do app no Início (Priority: P1)

Sem janela aberta, o voltar volta para a tela anterior. Orçamentos, Catálogo e Configurações voltam para o Início; o orçamento volta para a tela de onde foi aberto (lista de Orçamentos, ou Início quando criado pelo "Novo orçamento" do Início). No Início, o voltar sai do app normalmente. Orçamentos, Catálogo e Configurações ganham também uma seta de voltar no topo, que leva ao Início.

**Why this priority**: completa o fluxo do dono: o vendedor nunca é jogado para fora no meio do trabalho.

**Independent Test**: Início → Orçamentos → orçamento → voltar ×3; Início → Catálogo → voltar; repetir no Android, no iPhone (gesto de voltar no navegador) e no computador (botão voltar do navegador).

**Acceptance Scenarios**:

1. **Given** Início → Orçamentos → abriu orçamento, **When** aperta voltar, **Then** volta para a lista, na mesma posição de rolagem e com a mesma busca e filtro, com o efeito de "voltar" da tela.
2. **Given** lista de orçamentos, **When** aperta voltar (ou a seta do topo), **Then** vai para o Início.
3. **Given** Catálogo ou Configurações, **When** aperta voltar (ou a seta do topo), **Then** vai para o Início.
4. **Given** Início, sem janela aberta, **When** aperta voltar, **Then** sai do app como qualquer site (comportamento padrão do aparelho).
5. **Given** orçamento criado pelo "Novo orçamento" do Início, **When** aperta voltar, **Then** volta para o Início.
6. **Given** voltou do orçamento para a lista com o voltar, **When** aperta "avançar" no navegador do computador, **Then** reabre o mesmo orçamento.
7. **Given** a seta de voltar do app, **When** toca nela, **Then** o resultado é o mesmo do voltar do aparelho, e o voltar seguinte do aparelho não reabre a tela de onde saiu.

---

### User Story 3 - Cada tela tem seu endereço; recarregar não perde o lugar (Priority: P2)

Cada tela tem um endereço próprio: Início, lista de orçamentos, um orçamento específico, cada tabela do Catálogo, cada aba de Configurações. Recarregar a página volta para a mesma tela. Um endereço de orçamento copiado e aberto por outra pessoa logada da loja abre o mesmo orçamento.

**Why this priority**: resolve a perda de lugar ao recarregar e permite link interno, mas o problema relatado (sair do app) já fica resolvido com US1 e US2.

**Independent Test**: abrir um orçamento, copiar o endereço, recarregar; abrir o endereço em outra aba/aparelho logado.

**Acceptance Scenarios**:

1. **Given** orçamento aberto, **When** recarrega a página, **Then** o mesmo orçamento abre (janelas abertas antes do recarregar não reabrem).
2. **Given** Catálogo na tabela de ferragens, **When** recarrega, **Then** volta para o Catálogo na mesma tabela.
3. **Given** endereço de um orçamento, **When** outra pessoa logada da loja abre, **Then** vê esse orçamento (rascunho editável ou emitido só leitura, como hoje).
4. **Given** endereço de orçamento que não existe (apagado ou digitado errado), **When** abre, **Then** cai na lista com aviso "Orçamento não encontrado".
5. **Given** vendedor (sem acesso a Catálogo e Configurações), **When** abre o endereço do Catálogo ou de Configurações, **Then** cai no Início, sem ver a tela de admin.
6. **Given** não logado, **When** abre qualquer endereço do app, **Then** vê a tela de login e, depois de entrar, vai para o endereço pedido.
7. **Given** app aberto direto no endereço de um orçamento, **When** aperta voltar, **Then** vai para a lista; voltar de novo vai para o Início; de novo, sai do app.

---

### User Story 4 - Item digitado não se perde (Priority: P2)

O vendedor começa a adicionar um item (escolhe o tipo, digita medidas) e aperta voltar, toca fora ou fecha a janela antes de "Adicionar item". O que ele digitou não some: fica guardado como item em rascunho daquele orçamento. Ao tocar de novo em "Adicionar item" (ou no aviso do item em rascunho), o formulário reabre com o tipo e os valores digitados. Ele pode terminar e adicionar, ou descartar.

O mesmo vale para a edição de um item já existente: alterações não salvas ficam guardadas para aquele item, sem mudar o item no orçamento até ele tocar em "Salvar alterações".

**Why this priority**: evita retrabalho (medir de novo, digitar de novo) quando o voltar é apertado sem querer, sem exigir uma pergunta a cada fechamento.

**Independent Test**: começar um item, digitar medidas, apertar voltar; reabrir "Adicionar item"; sair do orçamento, voltar a ele; recarregar a página.

**Acceptance Scenarios**:

1. **Given** formulário de item novo com medidas digitadas, **When** aperta voltar, **Then** a janela fecha e o orçamento mostra um aviso discreto "Item não terminado: {tipo}" com "Continuar" e "Descartar".
2. **Given** item em rascunho, **When** toca em "Continuar" ou em "Adicionar item", **Then** o formulário abre com o tipo e todos os valores digitados.
3. **Given** item em rascunho, **When** toca em "Descartar", **Then** o rascunho do item some sem mudar o orçamento.
4. **Given** item em rascunho, **When** sai do orçamento, volta a ele ou recarrega a página no mesmo aparelho, **Then** o aviso do item em rascunho continua lá.
5. **Given** edição de um item existente com valores alterados, **When** aperta voltar, **Then** o item no orçamento continua como estava (preço e total não mudam) e reabrir a edição mostra as alterações guardadas, com opção de descartá-las.
6. **Given** formulário aberto sem nada digitado (só escolheu o tipo), **When** aperta voltar, **Then** fecha sem criar rascunho de item.
7. **Given** item em rascunho, **When** o orçamento é emitido, **Then** o rascunho do item não entra no orçamento, no PDF nem no total; o aviso some.

### Edge Cases

- Troca de aba (Catálogo, Configurações) e de filtro da lista: atualiza o endereço, mas não cria um passo de voltar por aba; voltar sai da tela, não percorre as abas (padrão Material para abas).
- Voltar apertado várias vezes rápido: cada toque age sobre um passo; o app nunca fica em estado misto (janela meio fechada, tela trocada por baixo).
- Voltar com um salvamento do orçamento em andamento: a tela volta na hora; o salvamento termina por baixo, como hoje.
- Catálogo ou Configurações com alterações ainda não salvas (que dependem de "Salvar"): o voltar pergunta antes de descartar, com as mesmas opções que o app já dá ao sair dessa tela pelo menu (se não houver aviso hoje, a pergunta é "Descartar alterações?").
- Botão "Cancelar" do formulário de item: descarta de propósito (não cria rascunho de item); só voltar, Esc, fechar e toque fora guardam.
- Item em rascunho com valores que o catálogo não aceita mais (ex.: vidro removido do catálogo): reabre com o campo vazio e aviso, como na edição de item hoje.
- Orçamento apagado com item em rascunho: o rascunho do item é apagado junto.
- Orçamento apagado enquanto aberto em outro aparelho: ao voltar/avançar para ele, mesmo tratamento de "não encontrado".
- Sessão expirada no meio do uso: login aparece; depois de entrar, volta para a tela onde estava.
- Modo local (sem servidor) e app instalado na tela inicial do celular: mesmo comportamento.
- Impressão/PDF e texto do WhatsApp: não mudam; o link do PDF/WhatsApp para o cliente final não usa os endereços internos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O voltar do aparelho, o gesto de voltar e o voltar do navegador MUST fechar primeiro o elemento aberto mais acima (janela, folha Enviar, prévia, menu, seletor, confirmação pequena), com o mesmo efeito de fechá-lo pelo app (formulário de item: FR-016).
- **FR-002**: Sem elemento aberto, o voltar MUST levar à tela anterior do caminho feito dentro do app; sem caminho, MUST subir um nível no mapa de telas (Orçamento → Orçamentos → Início; Catálogo/Configurações → Início).
- **FR-003**: Só no Início, sem elemento aberto, o voltar MUST seguir o padrão do aparelho (sair do app).
- **FR-004**: Orçamentos, Catálogo e Configurações MUST ter seta de voltar no topo que leva ao Início, com o mesmo efeito do voltar do aparelho.
- **FR-005**: Fechar uma janela ou voltar de tela pelos controles do app MUST deixar o histórico coerente: o próximo voltar do aparelho age sobre o passo anterior real, nunca reabre o que foi fechado nem exige toque extra.
- **FR-006**: Início, lista de orçamentos, orçamento (por número/identificador), Catálogo (por tabela) e Configurações (por aba) MUST ter endereços próprios e legíveis em português.
- **FR-007**: Recarregar ou abrir um endereço MUST mostrar a tela correspondente; janelas e menus não fazem parte do endereço e não reabrem.
- **FR-008**: Troca de aba e de filtro MUST atualizar o endereço sem criar passo extra de voltar.
- **FR-009**: Endereço de Catálogo/Configurações aberto por vendedor MUST levar ao Início; a trava real de escrita continua no servidor.
- **FR-010**: Endereço de orçamento inexistente ou inacessível MUST levar à lista com aviso curto.
- **FR-011**: Sem sessão, o endereço pedido MUST ser guardado e aberto depois do login.
- **FR-012**: Voltar de uma tela com alterações não salvas que exigem "Salvar" MUST pedir confirmação antes de descartar.
- **FR-013**: O efeito de troca de tela MUST usar a direção "voltar" quando a mudança vem do voltar do aparelho/navegador ou da seta do app e "avançar" quando vem do avançar (spec 004).
- **FR-014**: A posição de rolagem, a busca e o filtro da lista MUST ser restaurados ao voltar para ela.
- **FR-015**: Sem biblioteca nova pesada; o peso do app MUST não crescer mais que 3 KB comprimido.
- **FR-016**: Fechar o formulário de item por voltar, Esc, botão de fechar ou toque fora, com algo digitado além do tipo, MUST guardar um item em rascunho do orçamento (tipo + valores); "Cancelar" MUST descartar.
- **FR-017**: O orçamento MUST mostrar o item em rascunho com "Continuar" e "Descartar"; "Adicionar item" MUST reabrir o rascunho existente em vez de um formulário vazio.
- **FR-018**: Alterações não salvas na edição de um item MUST ficar guardadas para aquele item sem mudar o item, o preço nem o total até "Salvar alterações".
- **FR-019**: O item em rascunho MUST sobreviver a sair do orçamento e a recarregar a página no mesmo aparelho, e MUST NOT aparecer em totais, PDF, texto do WhatsApp nem orçamento emitido.
- **FR-020**: Abrir o app pelo ícone MUST mostrar o Início, não a última tela.

### Key Entities

- **Endereço de tela**: identifica a tela (Início, lista, orçamento X, Catálogo › tabela, Configurações › aba). Não guarda janela aberta nem dados do orçamento.
- **Passo de voltar**: cada tela aberta e cada janela/menu aberto por cima dela. Abas e filtros não são passos.
- **Item em rascunho**: no máximo um item novo não terminado por orçamento (tipo + valores digitados), mais as alterações não salvas de itens em edição. Guardado no aparelho, ligado ao orçamento; não faz parte do orçamento salvo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das janelas, menus, seletores e confirmações do app, o voltar do Android fecha o elemento e o app continua aberto.
- **SC-002**: Partindo de qualquer tela ou janela, o vendedor só sai do app depois de chegar ao Início e apertar voltar mais uma vez (zero saídas inesperadas no teste de jornada completa: criar orçamento, adicionar 3 itens, prévia, enviar, voltar até sair).
- **SC-003**: Recarregar em qualquer tela volta para a mesma tela em 100% dos casos testados (Início, lista, orçamento rascunho, orçamento emitido, cada tabela do Catálogo, cada aba de Configurações).
- **SC-004**: A resposta ao voltar (início do fechamento/troca) aparece em até 100 ms.
- **SC-005**: Zero medidas perdidas ao fechar o formulário de item sem querer: 100% dos valores digitados reaparecem ao continuar o item em rascunho.
- **SC-006**: Testes de navegador existentes (fumaça do orçamento, catálogo, transições) continuam passando.

## Assumptions

- Referências de mercado: navegação do Android/Material Design (voltar fecha o que está por cima, depois volta uma tela; abas não criam passos; sair só da tela inicial) e Apple HIG (gesto de voltar do navegador no iPhone segue a mesma lógica).
- **Dependência**: o Início vem da spec da Página inicial (backlog), que define o que ele mostra para vendedor e admin. Esta feature e a Página inicial entram juntas; sem ela, o Início seria só atalhos para Orçamentos, Catálogo e Configurações.
- O menu do topo continua em todas as telas (Orçamentos, Catálogo, Configurações, Ajuda, Sair) e ganha "Início".
- Item em rascunho fica só no aparelho onde foi digitado (não aparece em outro celular). Suficiente para o caso "apertei voltar sem querer".
- Endereço de orçamento é interno (só pessoas logadas da loja). Não é link público para o cliente final.
- O servidor de hospedagem já devolve o app para qualquer endereço, então abrir um endereço interno direto funciona sem mudança de hospedagem.
- Reabrir o app pelo ícone (depois de fechar o navegador ou o celular encerrar o app) abre o Início (FR-020). Recarregar a página continua abrindo a mesma tela (FR-007).
- Papel Vendedor desativado por ora (spec 006): os cenários de vendedor (FR-009, US3 cenário 5) só valem quando o papel voltar.
- Fora do escopo: link público de orçamento para o cliente, gesto de arrastar para fechar janela, item em rascunho sincronizado entre aparelhos.
