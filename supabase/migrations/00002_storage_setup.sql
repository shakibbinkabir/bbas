-- BBAS Storage Setup (PRD Section 11)
-- Buckets: application-documents (private), profile-photos (private)

-- =============================================================================
-- BUCKETS
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- STORAGE RLS POLICIES
-- Path convention: {authority_code}/{application_id}/{document_type}/{filename}
-- =============================================================================

-- ----- application-documents: owners upload/read their own ----------------
create policy "owners_insert_application_documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.applications a
    where a.id::text = split_part(name, '/', 2)
      and a.owner_id = auth.uid()
      and a.status in ('draft', 'information_requested')
  )
);

create policy "owners_select_application_documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.applications a
    where a.id::text = split_part(name, '/', 2)
      and a.owner_id = auth.uid()
  )
);

create policy "owners_update_application_documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.applications a
    where a.id::text = split_part(name, '/', 2)
      and a.owner_id = auth.uid()
      and a.status in ('draft', 'information_requested')
  )
);

create policy "owners_delete_application_documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.applications a
    where a.id::text = split_part(name, '/', 2)
      and a.owner_id = auth.uid()
      and a.status in ('draft', 'information_requested')
  )
);

-- ----- application-documents: officers read in their authority ------------
create policy "officers_select_application_documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.applications a
    join public.user_profiles up on up.id = auth.uid()
    where a.id::text = split_part(name, '/', 2)
      and up.role in ('officer', 'admin')
      and up.authority_id = a.authority_id
  )
);

-- ----- profile-photos: users manage their own (path = {user_id}/...) ------
create policy "users_insert_profile_photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "users_select_profile_photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "users_update_profile_photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "users_delete_profile_photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);
