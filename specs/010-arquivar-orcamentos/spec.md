# Feature Specification: Arquivar orçamentos

**Feature Branch**: `010-arquivar-orcamentos`

**Created**: 2026-10-22

**Status**: Draft

**Input**: Usuário, 2026-10-22: feature para arquivar orçamentos; mini botão e/ou segurar o dedo no card; não arquivar uma revisão específica por enquanto; fazer spec antes de implementar.

## Contexto

A lista de orçamentos cresce com rascunhos e emitidos (várias revisões agrupadas por número). Hoje só dá para excluir rascunho; emitido permanece na lista para sempre. A loja precisa esconder orçamentos antigos ou encerrados sem apagar histórico nem PDF válidos.

Objetivo: arquivar o **grupo** do orçamento (todas as revisões do mesmo número) e vê-los só no filtro Arquivados, com opção de desarquivar. Sem apagar dados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arquivar um orçamento da lista (Priority: P1)

Na lista de orçamentos (filtros Todos / Emitidos / Rascunhos), o usuário arquiva um card (grupo). O card some desses filtros. Todas as revisões daquele número passam a arquivadas juntas.

**Why this priority**: é o valor principal — limpar a lista sem perder o orçamento.

**Independent Test**: ter um grupo com 1+ revisões; arquivar; confirmar que some de Todos/Emitidos/Rascunhos e aparece em Arquivados com as mesmas revisões.

**Acceptance Scenarios**:

1. **Given** um card de orçamento na lista principal, **When** o usuário arquiva pelo controle do card (mini ação) ou pelo menu de long-press, **Then** o grupo deixa de aparecer em Todos, Emitidos e Rascunhos.
2. **Given** um orçamento com várias revisões no mesmo número, **When** arquiva, **Then** todas as revisões daquele número ficam arquivadas (não dá para arquivar só uma revisão).
3. **Given** conta em modo consulta (teste/plano vencido), **When** tenta arquivar, **Then** a ação é bloqueada como as demais gravações (aviso de vencimento), sem alterar o estado.

---

### User Story 2 - Ver e abrir arquivados; desarquivar (Priority: P1)

Existe filtro **Arquivados**. Nele o usuário vê só grupos arquivados, abre o orçamento (mesmo fluxo de hoje) e pode desarquivar o grupo, que volta aos filtros normais conforme status (emitido/rascunho).

**Why this priority**: sem ver e trazer de volta, arquivar seria apagar da vista de forma irreversível.

**Independent Test**: arquivar → filtro Arquivados → abrir → desarquivar → aparece de novo no filtro adequado.

**Acceptance Scenarios**:

1. **Given** ao menos um grupo arquivado, **When** escolhe o filtro Arquivados, **Then** vê esses cards e não vê orçamentos ativos.
2. **Given** um grupo arquivado, **When** desarquiva, **Then** some de Arquivados e volta a Todos (e Emitidos ou Rascunhos conforme a revisão mais recente / regras atuais de filtro por status).
3. **Given** filtro Arquivados, **When** a busca está preenchida, **Then** a busca restringe só dentro dos arquivados (mesmo comportamento de busca dos outros filtros).

---

### User Story 3 - Descoberta no celular e no desktop (Priority: P2)

No celular, segurar o dedo no card abre um menu com Arquivar (ou Desarquivar se já arquivado). Há também um controle discreto no card (mini botão/ícone) para quem não usa long-press. Desktop usa o mesmo controle discreto (e long-press não é obrigatório).

**Why this priority**: melhora descoberta; P1 já funciona se existir pelo menos um caminho claro.

**Independent Test**: em viewport estreita, long-press mostra Arquivar; toque no mini controle também arquiva; em desktop o mini controle funciona.

**Acceptance Scenarios**:

1. **Given** card na lista (não arquivado), **When** long-press no card (toque longo), **Then** aparece ação Arquivar sem abrir o orçamento.
2. **Given** card na lista, **When** usa o mini controle de arquivar, **Then** o grupo arquiva (com a mesma confirmação, se houver).
3. **Given** card em Arquivados, **When** long-press ou mini controle, **Then** a ação oferecida é Desarquivar.

---

### Edge Cases

- Grupo com só rascunho: pode arquivar; exclusão de rascunho arquivado continua permitida pelas regras atuais de excluir rascunho.
- Grupo com emitidos: arquivar não apaga; PDF/WhatsApp/reenvio continuam possíveis ao abrir o orçamento.
- Revisar um orçamento arquivado: permitido; a nova revisão permanece no grupo arquivado até desarquivar.
- Lista vazia em Arquivados: mensagem clara (nenhum arquivado / nenhum na busca).
- Contadores dos filtros Todos / Emitidos / Rascunhos: não contam grupos arquivados.
- Início (atalhos / listas recentes, se existirem): não destacam orçamentos arquivados como “ativos”.
- Confirmação: arquivar pede confirmação curta (“Arquivar este orçamento?”); desarquivar pode ser direto ou com confirmação leve — preferir confirmação só no arquivar nesta versão.
- Não há arquivamento em massa nesta versão.
- Não há exclusão permanente automática de arquivados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O usuário MUST poder arquivar um orçamento a partir do card na lista, atuando sobre o **grupo** (mesmo número), nunca sobre uma revisão isolada nesta versão.
- **FR-002**: Orçamentos arquivados MUST NÃO aparecer nos filtros Todos, Emitidos e Rascunhos.
- **FR-003**: MUST existir filtro **Arquivados** na lista de orçamentos, mostrando só grupos arquivados.
- **FR-004**: O usuário MUST poder desarquivar um grupo a partir do filtro Arquivados (e pelos mesmos controles do card).
- **FR-005**: Arquivar MUST NÃO apagar orçamentos, revisões, fotos internas nem histórico; emitir/revisar/PDF/WhatsApp seguem as regras atuais ao abrir o item.
- **FR-006**: A UI MUST oferecer (a) controle discreto no card e (b) long-press no card no uso touch, ambos levando a Arquivar ou Desarquivar conforme o estado.
- **FR-007**: Arquivar MUST pedir confirmação; a ação MUST respeitar o bloqueio de escrita da conta (modo consulta).
- **FR-008**: Busca MUST respeitar o filtro ativo (incluindo Arquivados).
- **FR-009**: Contagens dos filtros ativos MUST excluir arquivados.
- **FR-010**: MUST NÃO haver, nesta versão: arquivar revisão isolada, arquivar em lote, auto-arquivar por data, pasta/etiqueta além de arquivado sim/não.

### Key Entities

- **Grupo de orçamento**: conjunto de revisões com o mesmo número (já existente na lista).
- **Estado arquivado do grupo**: marca se o grupo está arquivado; aplica-se a todas as revisões daquele número. Desarquivar limpa a marca do grupo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuário arquiva um orçamento da lista em menos de 10 segundos (incluindo confirmação).
- **SC-002**: Após arquivar, o card não aparece mais em Todos/Emitidos/Rascunhos em 100% dos casos do teste manual.
- **SC-003**: Usuário encontra o orçamento em Arquivados e desarquiva em menos de 15 segundos.
- **SC-004**: Em viewport ~360 px, long-press e mini controle são usáveis sem abrir o orçamento por engano no gesto de arquivar.
- **SC-005**: Nenhuma revisão isolada pode ser arquivada sem as demais do mesmo número.

## Assumptions

- Persistência do estado arquivado acompanha o orçamento/grupo de forma que sobreviva a recarregar o app (local e nuvem), detalhe técnico no plano.
- Se revisões do mesmo número estiverem inconsistentes no dado antigo, a implementação normaliza (grupo inteiro arquivado ou não) — preferência: qualquer revisão arquivada implica grupo arquivado ao carregar, ou um único campo de grupo; plano decide o shape.
- Arquivar não altera imutabilidade do emitido (constitution III).
- URL do filtro Arquivados segue o padrão atual de `?filtro=...`.
- Texto e ícones (rótulo “Arquivar” / “Desarquivar”) definem-se na UI sem mudar o comportamento desta spec.
- Fora de escopo: sync com cliente final, pastas, etiquetas, lixeira com prazo de exclusão.
