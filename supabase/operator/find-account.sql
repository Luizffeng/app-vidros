-- Achar uma conta pelo código curto (8 caracteres que aparecem na mensagem do WhatsApp),
-- pelo e-mail de login ou pelo WhatsApp. Troque os valores em `p` e rode no SQL Editor.

with p as (
  select
    'e53267a4'::text as short_id,
    ''::text as email,
    ''::text as whatsapp
)
select
  left(a.id::text, 8) as codigo,
  a.id,
  a.name as loja,
  a.whatsapp,
  a.plan,
  a.trial_ends_at as fim_teste,
  a.active_until as ativa_ate,
  a.disabled_at as desativada_em,
  a.marketing_opt_in_at as aceita_ofertas_desde,
  a.created_at as criada_em,
  string_agg(u.email, ', ') as logins
from public.accounts a
left join public.profiles pr on pr.account_id = a.id
left join auth.users u on u.id = pr.id
cross join p
where (p.short_id <> '' and left(a.id::text, 8) = p.short_id)
   or (p.email <> '' and lower(u.email) = lower(p.email))
   or (p.whatsapp <> '' and a.whatsapp like '%' || regexp_replace(p.whatsapp, '\D', '', 'g'))
group by a.id;
