-- App Vidros — um estabelecimento, dois papéis.
-- Aplicar no SQL Editor do Supabase (ou `supabase db push`).
-- Depois, no dashboard: Authentication → Providers → Email → desligar "Enable sign ups".
-- Criar dois usuários em Authentication → Users (e-mail + senha).
-- O trigger abaixo grava cada um como vendedor. Promover o Luiz:
--   update public.profiles set role = 'admin' where id = '<uuid do Luiz>';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'vendedor' check (role in ('admin', 'vendedor'))
);

create table public.quotes (
  id text primary key,
  updated_at timestamptz not null,
  payload jsonb not null
);

create index quotes_updated_at_idx on public.quotes (updated_at desc);

create table public.catalog (
  id text primary key default 'current' check (id = 'current'),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.settings (
  id text primary key default 'current' check (id = 'current'),
  payload jsonb not null,
  logo_path text,
  updated_at timestamptz not null default now()
);

create table public.quote_counters (
  year integer primary key,
  value integer not null
);

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;
alter table public.catalog enable row level security;
alter table public.settings enable row level security;
alter table public.quote_counters enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.next_quote_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  insert into public.quote_counters (year, value)
  values (y, 1)
  on conflict (year) do update
    set value = public.quote_counters.value + 1
  returning value into n;
  return format('ORC-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'vendedor');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.is_admin() from public;
revoke all on function public.next_quote_number() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.next_quote_number() to authenticated;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy quotes_select
  on public.quotes for select
  to authenticated
  using (true);

create policy quotes_insert
  on public.quotes for insert
  to authenticated
  with check (true);

create policy quotes_update
  on public.quotes for update
  to authenticated
  using (true)
  with check (true);

create policy quotes_delete
  on public.quotes for delete
  to authenticated
  using (true);

create policy catalog_select
  on public.catalog for select
  to authenticated
  using (true);

create policy catalog_insert
  on public.catalog for insert
  to authenticated
  with check (public.is_admin());

create policy catalog_update
  on public.catalog for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy settings_select
  on public.settings for select
  to authenticated
  using (true);

create policy settings_insert
  on public.settings for insert
  to authenticated
  with check (public.is_admin());

create policy settings_update
  on public.settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update on public.catalog to authenticated;
grant select, insert, update on public.settings to authenticated;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', false)
on conflict (id) do nothing;

create policy logos_read
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logos');

create policy logos_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos' and public.is_admin());

create policy logos_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos' and public.is_admin())
  with check (bucket_id = 'logos' and public.is_admin());

create policy logos_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos' and public.is_admin());
