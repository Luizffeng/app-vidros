-- Liberar a conta depois de um pagamento combinado por fora (fase 1, sem cobrança no app).
-- `ate`: último instante pago. Renovação: rode de novo com a nova data.
-- Sem prazo (como a Forte Vidros): use `null` em `ate`.

with p as (
  select
    'e53267a4'::text as short_id,
    timestamptz '2026-11-10 23:59:59-03' as ate
)
update public.accounts a
set plan = 'active',
    active_until = p.ate
from p
where left(a.id::text, 8) = p.short_id
returning left(a.id::text, 8) as codigo, a.name as loja, a.plan, a.active_until as ativa_ate;
