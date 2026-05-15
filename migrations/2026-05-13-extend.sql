-- Run this in Supabase SQL editor for the KORE project.
-- Safe to re-run: every statement uses IF NOT EXISTS / ON CONFLICT.

-- 1) Journal posts (the blog) ------------------------------------------------
create table if not exists public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  cover_url text,
  category text not null default 'Note',
  body_md text not null default '',
  tags text[] not null default '{}',
  author text not null default 'KORE',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.journal_posts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='journal_posts' and policyname='Public read published') then
    create policy "Public read published" on public.journal_posts for select using (published = true);
  end if;
  if not exists (select 1 from pg_policies where tablename='journal_posts' and policyname='Service role write') then
    create policy "Service role write" on public.journal_posts for all using (auth.role() = 'service_role');
  end if;
end $$;
create index if not exists journal_posts_published_at_idx on public.journal_posts (published_at desc);

-- 2) Journal storage bucket --------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('journal', 'journal', true)
  on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Journal public read') then
    create policy "Journal public read" on storage.objects for select using (bucket_id = 'journal');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Journal service write') then
    create policy "Journal service write" on storage.objects for all using (bucket_id = 'journal' and auth.role() = 'service_role');
  end if;
end $$;

-- 3) Site content / settings tables (idempotent) ----------------------------
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='site_content' and policyname='Public read') then
    create policy "Public read" on public.site_content for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='site_content' and policyname='Service role write') then
    create policy "Service role write" on public.site_content for all using (auth.role() = 'service_role');
  end if;
end $$;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='site_settings' and policyname='Public read') then
    create policy "Public read" on public.site_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='site_settings' and policyname='Service role write') then
    create policy "Service role write" on public.site_settings for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 4) Seed defaults (only if missing) ----------------------------------------
insert into public.site_settings (key, value) values
  ('whatsapp', jsonb_build_object('number','', 'cta','Continue on WhatsApp', 'greeting','Hi KORE — I''d like to talk to the atelier.'))
  on conflict (key) do nothing;

insert into public.site_content (key, value) values
  ('knowledge:public', jsonb_build_object('body','# KORE — Public Knowledge\n\nReplace this with the real public-facing brand information. The AI may quote anything in this section.\n')),
  ('knowledge:private', jsonb_build_object('body','# KORE — Private Knowledge\n\nInternal context only. The AI uses this for tone and accuracy but will never quote it.\n'))
  on conflict (key) do nothing;
