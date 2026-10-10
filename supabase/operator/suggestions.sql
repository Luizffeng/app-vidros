-- Sugestões das lojas. Rode um bloco por vez.

-- 1. Abertas (sem resposta), mais antigas primeiro. Meta: nenhuma sem resposta em 2 dias úteis.
select
  s.id,
  left(a.id::text, 8) as codigo,
  a.name as loja,
  a.whatsapp,
  s.created_at,
  s.body
from public.suggestions s
join public.accounts a on a.id = s.account_id
where s.status = 'recebida'
order by s.created_at;

-- 2. Responder (a loja vê a resposta no app, em Ajuda › Sugestões).
update public.suggestions
set reply = 'Obrigado! Já anotamos e vamos avisar quando sair.',
    replied_at = now(),
    status = 'respondida'
where id = '00000000-0000-0000-0000-000000000000'
returning id, status, reply;

-- 3. Marcar como feita na versão publicada (aparece "Feito na versão X").
update public.suggestions
set status = 'feita',
    shipped_version = '1.1.0',
    replied_at = coalesce(replied_at, now())
where id = '00000000-0000-0000-0000-000000000000'
returning id, status, shipped_version;
