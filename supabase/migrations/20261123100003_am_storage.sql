-- =====================================================================
-- Angels Asset Management (QMS-05) – private file bucket
-- Photos, quotes, invoices, wipe certificates and signed forms.
-- The bucket is private: the app shows files through signed links that expire after 1 hour.
-- =====================================================================
-- ---------------------------------------------------------------------
-- File storage bucket for photos, invoices, quotes and signed forms
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('am-files', 'am-files', false)
on conflict (id) do nothing;
drop policy if exists am_files_read on storage.objects;
drop policy if exists am_files_write on storage.objects;
create policy am_files_read on storage.objects for select to authenticated using (bucket_id = 'am-files');
create policy am_files_write on storage.objects for insert to authenticated with check (bucket_id = 'am-files');
