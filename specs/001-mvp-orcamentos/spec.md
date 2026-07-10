# Feature: MVP Orçamentos Forte Vidros

## Summary
Aplicativo mobile-first para vidraceiros emitirem orçamentos no local da medição, com motor de cálculo baseado nas regras da planilha de referência (sem Sheets como banco), persistência local e PDF.

## User Stories

### US1 — Criar orçamento no smartphone
Como vidraceiro, quero criar um orçamento rapidamente após medir, para entregar valor ao cliente no local.

**Acceptance**
- Fluxo utilizável em viewport ~390px
- Cliente/endereço/telefone opcionais
- Autosave local dos rascunhos

### US2 — Itens calculados e avulsos
Como vidraceiro, quero adicionar vários itens (Box, Correr, Pivotante, Maxim-ar, Vidro fixo, Espelho) ou itens textuais com valor.

**Acceptance**
- ≥1 item obrigatório para emitir
- Item avulso: descrição + valor
- Totais atualizam ao adicionar/remover

### US3 — Custos adicionais
Como vidraceiro, quero lançar custos extras do orçamento (deslocamento, andaime, etc.).

**Acceptance**
- Lista de custos adicionais editável
- Entram no total e no PDF

### US4 — Revisões
Como vidraceiro, quero revisar um orçamento emitido sem alterar o histórico.

**Acceptance**
- Emitido é imutável
- “Criar revisão” gera R(n+1) editável ligado ao pai

### US5 — PDF
Como vidraceiro, quero gerar PDF do orçamento para compartilhar.

**Acceptance**
- Emitir gera PDF
- Prévia PDF disponível no rascunho

## Non-Goals (MVP)
- Login multi-usuário
- Sync Google Sheets em runtime
- Backend remoto (interface preparada apenas)

## Success Criteria
- Paridade numérica com exemplos da planilha (testes)
- Orçamento completo em poucos toques no celular
