-- Fotos internas do orçamento (spec 009). Refs ficam no JSON do quote; bytes no Storage.

insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', false)
on conflict (id) do nothing;

create policy quote_photos_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
  );

create policy quote_photos_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  );

create policy quote_photos_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  )
  with check (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  );

create policy quote_photos_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.account_can_write()
  );
