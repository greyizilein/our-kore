-- Avatar support: storage bucket + profile column
-- Safe to re-run.

-- Add avatar_url to profiles table (profiles table must already exist)
alter table public.profiles add column if not exists avatar_url text;

-- Create avatars storage bucket (public)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Storage policies for avatars
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatars public read'
  ) then
    create policy "Avatars public read" on storage.objects
      for select using (bucket_id = 'avatars');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatars service write'
  ) then
    create policy "Avatars service write" on storage.objects
      for all using (bucket_id = 'avatars' and auth.role() = 'service_role');
  end if;
end $$;
