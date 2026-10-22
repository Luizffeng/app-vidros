# Feature Specification: Condições de pagamento

**Feature Branch**: `008-condicoes-de-pagamento`

**Created**: 2026-10-22

**Status**: Draft (clarificado 2026-10-22)

**Input**: Dono, 2026-10-22 (primeira ideia): módulo rico de opções Pix/crédito/parcelas na proposta. Dono, mesmo dia (estreitamento): por enquanto só um texto configurável da loja, no mesmo espírito do CTA de WhatsApp — um campo que o usuário preenche uma vez e aparece em todo orçamento gerado. Placeholder: “Condições de pagamento à combinar.” Módulo avançado (CRM / vendas / gestão) fica para depois.

## Clarifications

### Session 2026-10-22

- Q: Modelo rico (Pix −5%, cartão, 12×) ou só texto da loja? → A: Só texto da loja, igual ideia do CTA WhatsApp; o mesmo texto em todos os orçamentos.
- Q: Desconto à vista altera o total? → A: Fora de escopo nesta versão (não há cálculo de pagamento).
- Q: Edição por orçamento / revisão? → A: Não; configuração única da loja.
- Q: Quem edita? → A: Quem já edita Configurações da loja (mesmo padrão do cadastro / WhatsApp).
- Q: Onde aparece? → A: Na proposta enviada ao cliente (PDF e WhatsApp), em todo orçamento.

## Contexto

Hoje a proposta mostra total, itens, validade etc., sem frase fixa de condições de pagamento. Lojas repetem o mesmo texto em todo envio.

Objetivo desta versão: um campo de texto nas configurações da loja (com placeholder útil). Esse texto entra automaticamente em PDF e WhatsApp de todo orçamento. Sem opções por orçamento, sem % de desconto, sem parcelas calculadas.

Fora desta spec (futuro / CRM): condições por orçamento, Pix com desconto, tabelas de crédito, sinal+saldo estruturado, gateway.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar o texto da loja (Priority: P1)

Em Configurações, o usuário vê um campo “Condições de pagamento” (ou rótulo equivalente), com placeholder: “Condições de pagamento à combinar.” Preenche ou edita, salva. O texto fica gravado na loja.

**Why this priority**: sem o texto da loja, nada aparece na proposta.

**Independent Test**: abrir Configurações, alterar o texto, salvar, reabrir e conferir.

**Acceptance Scenarios**:

1. **Given** campo vazio (primeira vez), **When** abre Configurações, **Then** vê o placeholder “Condições de pagamento à combinar.” (sem gravar o placeholder como valor real).
2. **Given** usuário digita um texto e salva, **When** reabre Configurações, **Then** o mesmo texto aparece.
3. **Given** texto salvo, **When** apaga tudo e salva, **Then** o campo fica vazio e a proposta deixa de mostrar o bloco (US2).

---

### User Story 2 - Texto aparece em todo orçamento na proposta (Priority: P1)

Com texto configurado, qualquer orçamento (rascunho ao emitir/enviar, ou emitido ao baixar PDF / WhatsApp) inclui esse texto na saída para o cliente. Com texto vazio, a proposta segue como hoje, sem bloco vazio.

**Why this priority**: é o efeito visível para o cliente.

**Independent Test**: configurar texto; emitir/enviar um orçamento; conferir PDF e WhatsApp; limpar texto; enviar de novo e confirmar ausência do bloco.

**Acceptance Scenarios**:

1. **Given** loja com texto “Valor à vista. Crédito na venda.”, **When** gera PDF de qualquer orçamento, **Then** o texto aparece na proposta.
2. **Given** o mesmo texto, **When** compartilha WhatsApp, **Then** o texto aparece no conteúdo enviado.
3. **Given** campo vazio na loja, **When** gera PDF ou WhatsApp, **Then** não há título/bloco vazio de condições de pagamento.
4. **Given** dois orçamentos diferentes, **When** envia ambos, **Then** o texto de condições é o mesmo (o da loja).

---

### Edge Cases

- Texto muito longo: aceitar com limite razoável (ex.: algumas centenas de caracteres) e quebrar linha de forma legível no PDF/WhatsApp.
- Só espaços: tratar como vazio (não mostrar bloco).
- Orçamentos antigos: usam o texto **atual** da loja no momento do envio (não “congelam” versão antiga do texto), salvo decisão futura de snapshot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A loja MUST poder configurar um único texto de condições de pagamento nas configurações.
- **FR-002**: O campo MUST ter o placeholder “Condições de pagamento à combinar.”
- **FR-003**: Com texto preenchido, PDF e WhatsApp de todo orçamento MUST incluir esse texto na proposta ao cliente.
- **FR-004**: Com texto vazio (ou só espaços), a proposta MUST NÃO mostrar bloco vazio de condições de pagamento.
- **FR-005**: O texto MUST ser o mesmo para todos os orçamentos da loja (sem override por orçamento nesta versão).
- **FR-006**: A feature MUST NÃO calcular descontos, parcelas ou processar pagamento.
- **FR-007**: Quem pode editar o texto MUST seguir a mesma regra de quem edita as demais configurações da loja (ex.: CTA / cadastro).

### Key Entities

- **Texto de condições de pagamento (loja)**: string opcional gravada nas configurações do estabelecimento; lida na hora de montar PDF e WhatsApp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Configurar ou alterar o texto e ver o efeito num envio de proposta em menos de 1 minuto.
- **SC-002**: Com texto preenchido, 100% dos PDFs e WhatsApps novos incluem o mesmo texto da loja.
- **SC-003**: Com texto vazio, propostas antigas e novas não mostram seção vazia de pagamento.
- **SC-004**: Usuário da loja reconhece o campo como “igual à ideia do WhatsApp”: um lugar só, vale para tudo.

## Assumptions

- Escopo deliberadamente mínimo; evolução rica fica para CRM / vendas / gestão.
- Snapshot do texto no momento da emissão não é necessário no MVP (sempre o texto atual da loja no envio).
- Posição exata no PDF/WhatsApp (após total, antes da validade, etc.) define-se no plano/UI, desde que legível e consistente.
- Não altera fórmulas de preço nem totais do orçamento.
