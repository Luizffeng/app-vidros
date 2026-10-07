# Specification Quality Checklist: Cálculo de margem

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-06
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 2026-10-06, dono: adicionais sem margem em "Margem só no material"; "Só margem" não cobra mão de obra.
- 2026-10-07, dono: substituído por três modos (Empresa, Vendedor, Autônomo); adicionais nunca recebem margem; seção com caixas + Salvar + aviso; rascunhos recalculam na troca. Pronta para `/speckit-plan`.
- 2026-10-07, dono (ajustes): nome "Cálculo de margem"; adicional do item tem margem, custos adicionais do orçamento (Frete) e desconto nunca; rascunho não recalcula sozinho, mostra aviso com "Atualizar valores" (também após atualização do Catálogo); testes de preço cobrem mão de obra, itens, adicionais do item, adicionais do orçamento e desconto.
