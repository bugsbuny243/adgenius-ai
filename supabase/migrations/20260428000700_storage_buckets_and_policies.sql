-- Storage buckets and policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('game-artifacts', 'game-artifacts', false, 1073741824, array['application/octet-stream', 'application/zip', 'application/vnd.android.package-archive']),
  ('user-uploads', 'user-uploads', false, 52428800, array['image/png', 'image/jpeg', 'application/pdf', 'application/zip'])
on conflict (id) do update
set public = excluded.public;

-- RLS on storage.objects is expected to already be enabled by Supabase.

drop policy if exists "workspace members can read relevant game artifacts" on storage.objects;
create policy "workspace members can read relevant game artifacts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'game-artifacts'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_member(split_part(name, '/', 1)::uuid)
);

drop policy if exists "service role manages game artifacts" on storage.objects;
create policy "service role manages game artifacts"
on storage.objects
for all
to service_role
using (bucket_id = 'game-artifacts')
with check (bucket_id = 'game-artifacts');

drop policy if exists "users can read own uploads" on storage.objects;
create policy "users can read own uploads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'user-uploads'
  and (
    owner = auth.uid()
    or (
      split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
      and public.is_workspace_member(split_part(name, '/', 2)::uuid)
    )
  )
);

drop policy if exists "users can upload to own folder" on storage.objects;
create policy "users can upload to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "users can update own uploads" on storage.objects;
create policy "users can update own uploads"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'user-uploads'
  and owner = auth.uid()
)
with check (
  bucket_id = 'user-uploads'
  and owner = auth.uid()
);

drop policy if exists "users can delete own uploads" on storage.objects;
create policy "users can delete own uploads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user-uploads'
  and owner = auth.uid()
);

select pg_notify('pgrst', 'reload schema');
