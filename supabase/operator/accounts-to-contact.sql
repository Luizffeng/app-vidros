-- Contas com teste vencido e sem assinatura, para contato manual (spec 007 FR-028).
-- Ordem dos contatos: 1) lembrete de valor, sem falar de pagamento (ex.: "3 orçamentos seus
-- vencem esta semana"); 2) num contato seguinte, a assinatura. Oferta e novidades só para
-- quem aceita ofertas (`aceita_ofertas`).

select
  left(a.id::text, 8) as codigo,
  a.name as loja,
  a.whatsapp,
  a.marketing_opt_in_at is not null as aceita_ofertas,
  a.trial_ends_at::date as teste_venceu_em,
  (now()::date - a.trial_ends_at::date) as dias_vencido,
  count(q.id) filter (
    where q.payload ->> 'status' = 'emitted'
      and (q.payload ->> 'validUntil')::timestamptz between now() and now() + interval '7 days'
  ) as orcamentos_vencendo_7_dias,
  count(q.id) filter (where q.payload ->> 'status' = 'emitted') as emitidos,
  max(q.updated_at)::date as ultimo_orcamento
from public.accounts a
left join public.quotes q on q.account_id = a.id
where a.plan = 'trial'
  and a.trial_ends_at <= now()
  and a.disabled_at is null
group by a.id
order by orcamentos_vencendo_7_dias desc, a.trial_ends_at desc;
