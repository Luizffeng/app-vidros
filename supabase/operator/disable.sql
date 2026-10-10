-- Suspender (desativar = true) ou reativar (desativar = false) uma conta.
-- Suspensa: só lê, como conta vencida. Nada é apagado.

with p as (
  select
    'e53267a4'::text as short_id,
    true as desativar
)
update public.accounts a
set disabled_at = case when p.desativar then now() end
from p
where left(a.id::text, 8) = p.short_id
returning left(a.id::text, 8) as codigo, a.name as loja, a.disabled_at as desativada_em;
