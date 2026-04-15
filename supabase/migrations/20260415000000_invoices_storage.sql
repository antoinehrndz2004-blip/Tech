-- =============================================================================
-- Private storage bucket for uploaded invoice files.
--
-- Convention: objects are keyed as `{company_id}/{uuid}-{filename}`. The first
-- path segment is the company UUID, which is how RLS decides whether the
-- current user may read/write the object.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "invoices storage: owner read" on storage.objects;
create policy "invoices storage: owner read"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and public.is_company_owner(split_part(name, '/', 1)::uuid)
  );

drop policy if exists "invoices storage: owner insert" on storage.objects;
create policy "invoices storage: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and public.is_company_owner(split_part(name, '/', 1)::uuid)
  );

drop policy if exists "invoices storage: owner update" on storage.objects;
create policy "invoices storage: owner update"
  on storage.objects for update
  using (
    bucket_id = 'invoices'
    and public.is_company_owner(split_part(name, '/', 1)::uuid)
  )
  with check (
    bucket_id = 'invoices'
    and public.is_company_owner(split_part(name, '/', 1)::uuid)
  );

drop policy if exists "invoices storage: owner delete" on storage.objects;
create policy "invoices storage: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and public.is_company_owner(split_part(name, '/', 1)::uuid)
  );
