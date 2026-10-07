# Feature Specification: Cálculo de margem

**Feature Branch**: `002-modelos-de-calculo`

**Created**: 2026-10-06 · **Revised**: 2026-10-07 (três modos definidos pelo dono; adicionais do item com margem, custos adicionais do orçamento e desconto sem margem; rascunho desatualizado mostra aviso com "Atualizar valores" em vez de recálculo automático)

**Status**: Draft

**Input**: Dono, 2026-10-07: "O modelo de cálculo deve trazer três opções: 1 - Margem integral (Empresa): margem sobre todos os itens incluindo mão de obra (exceto adicionais). 2 - Margem sobre material (Vendedor): margem só no material, não incide sobre mão de obra nem adicionais. 3 - Sem margem (Instalador): mão de obra é a única fonte de lucro." Seção com uma caixa por opção (só uma marcada), nome do modo + descrição, botão Salvar e aviso ao salvar. Ajuste do dono no mesmo dia: seção chama "Cálculo de margem"; "adicionais" sem margem são os do orçamento (ex.: Frete); adicional específico do item tem margem. Ajuste 2026-10-07 (tarde): Instalador passa a se chamar Autônomo; aviso do rascunho mostra a data da mudança e, após "Atualizar valores", vira aviso menor "Valores atualizados".

## Contexto

Hoje todo item de catálogo vende por **(material + mão de obra + adicionais do item) × (1 + margem)**. A loja precisa escolher como a margem entra no preço, uma vez, nas Configurações.

Termos usados abaixo:

- **Material**: vidro + alumínio + ferragem + acessório do item.
- **Mão de obra**: valor calculado pelas taxas do catálogo (por m² ou avulso).
- **Adicionais do item**: valores digitados dentro do item (ex.: "Adicional de altura"). São parte do item e recebem margem como o material.
- **Custos adicionais do orçamento**: valores do orçamento inteiro (ex.: Frete, Andaime). Nunca recebem margem, em nenhum modo (já é assim hoje).
- **Margem**: percentual do item (padrão por tipo de produto no catálogo, ajustável no item).

## Os três modos

| Modo | Nome na tela | Preço do item |
| --- | --- | --- |
| Empresa | Margem integral | (material + adicionais do item + mão de obra) × (1 + margem) |
| Vendedor | Margem sobre material | (material + adicionais do item) × (1 + margem) + mão de obra |
| Autônomo | Sem margem | material + adicionais do item + mão de obra |

Empresa é exatamente o cálculo de hoje. Custos adicionais do orçamento (Frete etc.) somam ao total sem margem nos três modos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin escolhe o cálculo de margem (Priority: P1)

Em Configurações › Orçamento, a seção **Cálculo de margem** lista os três modos. Cada linha tem uma caixa de seleção, o nome do modo (Empresa, Vendedor, Autônomo) e, ao lado, a descrição do que acontece com o preço. Só uma caixa fica marcada. A troca só vale depois de tocar em Salvar.

**Why this priority**: sem a escolha nada mais funciona; é o núcleo da feature.

**Independent Test**: marcar cada modo, salvar, criar item conhecido e conferir o valor contra a tabela acima.

**Acceptance Scenarios** (item com material R$ 100, adicional do item R$ 10, mão de obra R$ 50, margem 30%; orçamento com Frete R$ 40 e desconto R$ 20):

1. **Given** modo Empresa, **When** cria o item, **Then** preço do item = R$ 208,00 ((100 + 10 + 50) × 1,3), igual a hoje, e total = R$ 228,00 (208 + 40 − 20).
2. **Given** modo Vendedor, **When** cria o item, **Then** preço do item = R$ 193,00 ((100 + 10) × 1,3 + 50) e total = R$ 213,00.
3. **Given** modo Autônomo, **When** cria o item, **Then** preço do item = R$ 160,00 (100 + 10 + 50) e total = R$ 180,00.
3a. **Given** qualquer modo, **When** soma o orçamento, **Then** o Frete entra por R$ 40,00 e o desconto sai por R$ 20,00, ambos sem margem.
4. **Given** modo Empresa marcado, **When** admin marca Vendedor, **Then** Empresa desmarca sozinho; nada muda até Salvar.
5. **Given** admin marcou outro modo e não salvou, **When** sai da tela ou toca Voltar, **Then** o modo salvo continua valendo.
6. **Given** vendedor, **When** usa o app, **Then** não vê nem altera o modo (Configurações já é só admin).

---

### User Story 2 - Aviso ao salvar e rascunho desatualizado (Priority: P1)

Ao salvar um modo diferente do atual, aparece confirmação no mesmo estilo de "Excluir rascunho?" com o aviso: "Novos orçamentos passam a usar este cálculo. Rascunhos mostram um aviso para atualizar. Orçamentos emitidos não mudam." Confirmando, o modo é salvo; nenhum rascunho muda sozinho.

Ao abrir um rascunho calculado com outro modo ou com uma versão anterior do Catálogo, aparece no topo um aviso (info) com o botão **Atualizar valores**. O texto diz o que mudou:

- só o Catálogo: "O **catálogo** foi atualizado."
- só o modo: "O **cálculo de margem** mudou."
- os dois: "O **catálogo** e o **cálculo de margem** mudaram."

É sempre um aviso só, com um botão. Tocando, todos os itens do rascunho são recalculados com o Catálogo e o modo atuais e o aviso some. O mesmo aviso vale para qualquer atualização do Catálogo, não só troca de modo.

**Why this priority**: emitido é imutável (constituição); o vendedor decide quando um rascunho já negociado passa a usar preços e regra novos, sem surpresa no valor.

**Independent Test**: com um rascunho e um emitido, trocar o modo, confirmar, reabrir os dois; atualizar o rascunho pelo botão.

**Acceptance Scenarios**:

1. **Given** modo Empresa e um rascunho com o item exemplo, **When** admin troca para Vendedor e confirma, **Then** o rascunho continua com R$ 208,00 e mostra "O **cálculo de margem** mudou." com "Atualizar valores".
2. **Given** o rascunho com o aviso, **When** toca "Atualizar valores", **Then** o item passa a R$ 193,00 e o aviso some.
3. **Given** um emitido criado em Empresa, **When** admin troca para Autônomo e confirma, **Then** o emitido continua com os valores da emissão e não mostra aviso.
4. **Given** a confirmação aberta, **When** admin toca "Não", **Then** nada muda e o modo salvo continua o anterior.
5. **Given** emitido criado em Empresa, **When** cria revisão depois da troca para Vendedor, **Then** a revisão (rascunho) mostra o aviso com "Atualizar valores".
6. **Given** admin salva sem trocar o modo (só outro campo da tela), **When** toca Salvar, **Then** não aparece o aviso de cálculo de margem.
7. **Given** admin salvou o Catálogo com preço novo, **When** abre um rascunho antigo, **Then** vê "O **catálogo** foi atualizado."; ao atualizar, os itens usam o preço novo.
8. **Given** rascunho criado antes de uma troca de modo e de uma atualização do Catálogo, **When** abre, **Then** vê um único aviso "O **catálogo** e o **cálculo de margem** mudaram."
9. **Given** rascunho com item cujo código foi desativado no Catálogo, **When** toca "Atualizar valores", **Then** esse item mantém o valor anterior, os outros recalculam e aparece "1 item manteve o valor anterior".

---

### User Story 3 - Telas mostram só o que o modo usa (Priority: P2)

Em Autônomo não há margem: o campo de margem some do formulário do item, do detalhe do custo e dos padrões de margem do catálogo. Em Vendedor o detalhe do custo mostra a margem calculada só sobre material + adicionais do item.

**Why this priority**: evita ajustar um campo que não muda o preço; não bloqueia o cálculo.

**Independent Test**: em cada modo, abrir item, detalhe do custo e Catálogo › Mão de obra / margem.

**Acceptance Scenarios**:

1. **Given** modo Autônomo, **When** abre o formulário do item, **Then** não há campo de margem e o detalhe do custo não mostra linha de margem.
2. **Given** modo Autônomo, **When** abre Catálogo › Mão de obra / margem, **Then** os padrões de margem não aparecem; as taxas de mão de obra continuam.
3. **Given** modo Vendedor, **When** abre o detalhe do custo, **Then** a linha de margem indica que não incide sobre a mão de obra.

### Edge Cases

- Item avulso / texto: valor digitado; nenhum modo se aplica.
- Margem 0% em Empresa ou Vendedor: resultado igual a Autônomo, sem erro.
- Orçamentos de antes desta feature: Empresa é o cálculo de hoje, então nada muda no lançamento.
- Custos adicionais do orçamento (Frete, Andaime): fora do item, sem margem em qualquer modo.
- Desconto: valor manual tirado do total final do orçamento; a margem nunca incide sobre ele.
- Rascunho aberto em outro aparelho durante a troca: ao reabrir, mostra o aviso para atualizar.
- Item novo ou editado num rascunho desatualizado: usa Catálogo e modo atuais; o aviso continua até tocar "Atualizar valores" (que recalcula os demais).
- PDF e texto do WhatsApp não mostram custo, margem nem mão de obra; continuam iguais.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Configurações › Orçamento MUST ter a seção Cálculo de margem com os três modos (Empresa, Vendedor, Autônomo), cada um com caixa de seleção, nome e descrição; só um marcado.
- **FR-002**: A troca MUST valer só após Salvar; sair sem salvar MUST manter o modo anterior.
- **FR-003**: Salvar com modo diferente MUST pedir confirmação com o aviso de que novos orçamentos usam o modo novo, rascunhos mostram aviso para atualizar e emitidos não mudam.
- **FR-004**: Preço do item de catálogo MUST seguir a fórmula do modo vigente (tabela "Os três modos"); adicionais do item seguem o material; custos adicionais do orçamento e desconto nunca recebem margem.
- **FR-005**: Rascunho calculado com outro modo ou outra versão do Catálogo MUST mostrar um único aviso com "Atualizar valores", cujo texto diz se mudou o Catálogo, o modo ou os dois; rascunhos MUST NOT ser recalculados sem esse toque; emitidos MUST NOT mostrar o aviso nem mudar.
- **FR-005a**: "Atualizar valores" MUST recalcular todos os itens de catálogo do rascunho com Catálogo e modo atuais; item que não puder ser recalculado MUST manter o valor anterior e a tela MUST informar quantos.
- **FR-006**: Cada orçamento MUST registrar o modo com que foi calculado; o emitido MUST guardar o modo da emissão.
- **FR-007**: Loja sem modo salvo MUST usar Empresa.
- **FR-008**: Em Autônomo, telas MUST esconder margem (item, detalhe do custo, padrões de margem do catálogo).
- **FR-009**: Vendedor MUST NOT alterar o modo; a regra vale também no servidor, não só na tela.
- **FR-010**: Cálculos por tipo de produto (box, correr, pivotante, maxim-ar, fixo, espelho) MUST continuar idênticos; o modo só muda como material, mão de obra, adicionais e margem se combinam.

### Key Entities

- **Configuração da loja**: ganha o cálculo de margem (Empresa, Vendedor ou Autônomo).
- **Orçamento**: registra o modo usado no cálculo; congelado na emissão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para os três modos, o item exemplo da US1 e o total do orçamento (com mão de obra, adicional do item, Frete e desconto) batem o valor esperado ao centavo, em teste automático.
- **SC-002**: 100% dos emitidos mantêm o total depois do lançamento e depois de cada troca de modo.
- **SC-003**: Admin troca o modo e confirma em menos de 30 segundos, sem ajuda.
- **SC-004**: Em nenhum modo aparece campo que não altera o preço.

## Assumptions

- Modo é um por loja; não há escolha por orçamento nem por item.
- A margem continua sendo percentual somado ao custo (markup), como hoje.
- Empresa é o padrão no lançamento e é idêntico ao cálculo de hoje.
- Em Vendedor, adicionais do item recebem margem junto com o material (dono, 2026-10-07: "adicional específico do item tem margem").
- Rascunhos não são recalculados sozinhos: mostram aviso e o usuário decide (dono, 2026-10-07). Vale para troca de modo e para qualquer atualização do Catálogo.
- Qualquer usuário (admin ou vendedor) pode tocar "Atualizar valores" no rascunho; não altera Catálogo nem configuração.
- Sem migração de banco: configuração e orçamento já são guardados como documento JSON, e só admin grava configuração (regra já existente no servidor). Ver `research.md`.
