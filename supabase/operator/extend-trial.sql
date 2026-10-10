-- Dar mais dias de teste grátis. Conta com teste vencido volta a gravar na hora.
-- Conta que tem uma assinatura (plan = 'active') não muda: use activate.sql.

with p as (
  select
    'e53267a4'::text as short_id,
    15 as dias
)
update public.accounts a
set trial_ends_at = greatest(a.trial_ends_at, now()) + make_interval(days => p.dias)
from p
where left(a.id::text, 8) = p.short_id
  and a.plan = 'trial'
returning left(a.id::text, 8) as codigo, a.name as loja, a.trial_ends_at as novo_fim_teste;
