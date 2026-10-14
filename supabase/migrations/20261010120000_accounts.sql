-- App Vidros — uma conta por vidraçaria (spec 007).
-- Cada conta só lê os próprios dados; só grava enquanto está em teste ou com assinatura válida.
-- Dados existentes viram a conta da Forte Vidros (ativa, sem prazo).
-- Depois de aplicar em produção: mover o objeto `logos/shop/logo.png` para `logos/<id da conta>/logo.png`.

-- 1. Tabelas novas e colunas de conta

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  whatsapp text not null default '' check (whatsapp ~ '^[0-9]{0,13}$'),
  plan text not null default 'trial' check (plan in ('trial', 'active')),
  trial_ends_at timestamptz not null default now() + interval '30 days',
  active_until timestamptz,
  disabled_at timestamptz,
  terms_accepted_at timestamptz not null default now(),
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  body text not null check (char_length(body) between 3 and 2000),
  status text not null default 'recebida' check (status in ('recebida', 'respondida', 'feita')),
  reply text,
  replied_at timestamptz,
  shipped_version text,
  created_at timestamptz not null default now()
);

create index suggestions_account_idx on public.suggestions (account_id, created_at desc);

alter table public.profiles add column account_id uuid references public.accounts (id) on delete cascade;
alter table public.profiles alter column role set default 'admin';
alter table public.quotes add column account_id uuid references public.accounts (id) on delete cascade;
alter table public.catalog add column account_id uuid references public.accounts (id) on delete cascade;
alter table public.settings add column account_id uuid references public.accounts (id) on delete cascade;
alter table public.quote_counters add column account_id uuid references public.accounts (id) on delete cascade;

-- 2–3. Forte Vidros: só quando já existem dados ou usuários

do $$
declare
  fv uuid;
  est jsonb := (select payload -> 'establishment' from public.settings where id = 'current');
begin
  if not exists (select 1 from public.profiles)
     and not exists (select 1 from public.quotes)
     and not exists (select 1 from public.catalog)
     and not exists (select 1 from public.settings) then
    return;
  end if;

  insert into public.accounts (name, whatsapp, plan, trial_ends_at, active_until)
  values (
    coalesce(nullif(trim(est ->> 'name'), ''), 'Forte Vidros'),
    left(regexp_replace(coalesce(est ->> 'phone', ''), '\D', '', 'g'), 13),
    'active',
    now(),
    null
  )
  returning id into fv;

  update public.profiles set account_id = fv, role = 'admin';
  update public.quotes set account_id = fv;
  update public.catalog set account_id = fv;
  update public.settings
    set account_id = fv,
        logo_path = case when logo_path is null then null else fv::text || '/logo.png' end;
  update public.quote_counters set account_id = fv;
end;
$$;

-- 4. Chaves por conta

alter table public.quotes alter column account_id set not null;
drop index if exists public.quotes_updated_at_idx;
create index quotes_account_updated_idx on public.quotes (account_id, updated_at desc);

alter table public.catalog drop constraint catalog_pkey;
alter table public.catalog drop column id;
alter table public.catalog alter column account_id set not null;
alter table public.catalog add primary key (account_id);

alter table public.settings drop constraint settings_pkey;
alter table public.settings drop column id;
alter table public.settings alter column account_id set not null;
alter table public.settings add primary key (account_id);

alter table public.quote_counters drop constraint quote_counters_pkey;
alter table public.quote_counters alter column account_id set not null;
alter table public.quote_counters add primary key (account_id, year);

-- 5. Funções

create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.profiles where id = auth.uid();
$$;

create or replace function public.account_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select a.disabled_at is null and (
      (a.plan = 'trial' and now() < a.trial_ends_at)
      or (a.plan = 'active' and (a.active_until is null or now() < a.active_until))
    )
    from public.accounts a
    where a.id = public.current_account_id()
  ), false);
$$;

alter table public.quotes alter column account_id set default public.current_account_id();
alter table public.catalog alter column account_id set default public.current_account_id();
alter table public.settings alter column account_id set default public.current_account_id();
alter table public.suggestions alter column account_id set default public.current_account_id();

create or replace function public.create_account(
  p_name text,
  p_whatsapp text,
  p_marketing_opt_in boolean default false
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  acc public.accounts;
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  if public.current_account_id() is not null then
    raise exception 'conta já existe';
  end if;
  if char_length(digits) not between 10 and 13 then
    raise exception 'WhatsApp inválido';
  end if;

  insert into public.accounts (name, whatsapp, marketing_opt_in_at)
  values (trim(p_name), digits, case when p_marketing_opt_in then now() end)
  returning * into acc;

  insert into public.profiles (id, role, account_id)
  values (auth.uid(), 'admin', acc.id)
  on conflict (id) do update set account_id = excluded.account_id;

  return acc;
end;
$$;

create or replace function public.set_marketing_opt_in(p_value boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.accounts
    set marketing_opt_in_at = case when p_value then coalesce(marketing_opt_in_at, now()) end
    where id = public.current_account_id();
$$;

create or replace function public.next_quote_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  acc uuid := public.current_account_id();
  y integer := extract(year from now())::integer;
  n integer;
begin
  if acc is null then
    raise exception 'sem conta';
  end if;
  if not public.account_can_write() then
    raise exception 'conta em modo consulta' using errcode = '42501';
  end if;
  insert into public.quote_counters (account_id, year, value)
  values (acc, y, 1)
  on conflict (account_id, year) do update
    set value = public.quote_counters.value + 1
  returning value into n;
  return format('ORC-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  acc uuid := public.current_account_id();
begin
  if uid is null then
    raise exception 'sem sessão';
  end if;
  if acc is not null and coalesce((select role from public.profiles where id = uid), '') <> 'admin' then
    raise exception 'só o administrador pode excluir a conta' using errcode = '42501';
  end if;
  if acc is not null then
    delete from public.accounts where id = acc;
  end if;
  delete from auth.users where id = uid;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'admin');
  return new;
end;
$$;

revoke all on function public.current_account_id() from public;
revoke all on function public.account_can_write() from public;
revoke all on function public.create_account(text, text, boolean) from public;
revoke all on function public.set_marketing_opt_in(boolean) from public;
revoke all on function public.delete_my_account() from public;
grant execute on function public.current_account_id() to authenticated;
grant execute on function public.account_can_write() to authenticated;
grant execute on function public.create_account(text, text, boolean) to authenticated;
grant execute on function public.set_marketing_opt_in(boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Políticas

alter table public.accounts enable row level security;
alter table public.suggestions enable row level security;

drop policy quotes_select on public.quotes;
drop policy quotes_insert on public.quotes;
drop policy quotes_update on public.quotes;
drop policy quotes_delete on public.quotes;
drop policy catalog_select on public.catalog;
drop policy catalog_insert on public.catalog;
drop policy catalog_update on public.catalog;
drop policy settings_select on public.settings;
drop policy settings_insert on public.settings;
drop policy settings_update on public.settings;

create policy accounts_select_own
  on public.accounts for select
  to authenticated
  using (id = public.current_account_id());

create policy quotes_select
  on public.quotes for select
  to authenticated
  using (account_id = public.current_account_id());

create policy quotes_insert
  on public.quotes for insert
  to authenticated
  with check (account_id = public.current_account_id() and public.account_can_write());

create policy quotes_update
  on public.quotes for update
  to authenticated
  using (account_id = public.current_account_id() and public.account_can_write())
  with check (account_id = public.current_account_id() and public.account_can_write());

create policy quotes_delete
  on public.quotes for delete
  to authenticated
  using (account_id = public.current_account_id() and public.account_can_write());

create policy catalog_select
  on public.catalog for select
  to authenticated
  using (account_id = public.current_account_id());

create policy catalog_insert
  on public.catalog for insert
  to authenticated
  with check (account_id = public.current_account_id() and public.account_can_write());

create policy catalog_update
  on public.catalog for update
  to authenticated
  using (account_id = public.current_account_id() and public.account_can_write())
  with check (account_id = public.current_account_id() and public.account_can_write());

create policy settings_select
  on public.settings for select
  to authenticated
  using (account_id = public.current_account_id());

create policy settings_insert
  on public.settings for insert
  to authenticated
  with check (account_id = public.current_account_id() and public.account_can_write());

create policy settings_update
  on public.settings for update
  to authenticated
  using (account_id = public.current_account_id() and public.account_can_write())
  with check (account_id = public.current_account_id() and public.account_can_write());

create policy suggestions_select
  on public.suggestions for select
  to authenticated
  using (account_id = public.current_account_id());

create policy suggestions_insert
  on public.suggestions for insert
  to authenticated
  with check (
    account_id = public.current_account_id()
    and status = 'recebida'
    and reply is null
    and replied_at is null
    and shipped_version is null
  );

grant select on public.accounts to authenticated;
grant select, insert on public.suggestions to authenticated;

drop policy logos_read on storage.objects;
drop policy logos_insert on storage.objects;
drop policy logos_update on storage.objects;
drop policy logos_delete on storage.objects;

create policy logos_read
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_account_id()::text);

create policy logos_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  );

create policy logos_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  );

create policy logos_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_account_id()::text);
