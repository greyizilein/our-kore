-- Core schema reconstruction for the KORE Supabase project.
--
-- WHY THIS FILE EXISTS: profiles, products, orders, announcements,
-- notification_reads, subscriptions, inventory, member_pieces and
-- contact_messages were originally created directly in the Supabase
-- dashboard (not tracked as SQL in this repo). When the project was
-- deleted, that schema was lost. This file reconstructs it from how the
-- app code (src/lib/admin.functions.ts, cms.functions.ts,
-- paystack.functions.ts) actually queries these tables. Review before
-- running on a project that still has data you care about.
--
-- Run this FIRST, before the other files in this folder — avatars.sql
-- alters public.profiles, which this file creates.
-- Safe to re-run: every statement uses IF NOT EXISTS / ON CONFLICT.

-- 1) Profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  fit_size text,
  fit_chest numeric,
  fit_waist numeric,
  fit_hips numeric,
  fit_inseam numeric,
  fit_shoulder numeric,
  fit_height numeric,
  fit_notes text,
  agent_name text,
  agent_style text,
  membership_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users manage own profile') then
    create policy "Users manage own profile" on public.profiles for all
      using (auth.uid() = id) with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Service role write') then
    create policy "Service role write" on public.profiles for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 2) Products (admin-managed catalogue overlay) ---------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  series text not null default '',
  name text not null,
  price_ngn numeric not null default 0,
  status text not null default 'draft',
  sort_order integer not null default 0,
  description text,
  material text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='products' and policyname='Public read active') then
    create policy "Public read active" on public.products for select using (status = 'active');
  end if;
  if not exists (select 1 from pg_policies where tablename='products' and policyname='Service role write') then
    create policy "Service role write" on public.products for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 3) Orders ----------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  currency text not null default 'NGN',
  shipping_method text,
  payment_ref text unique,
  address_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='orders' and policyname='Users read own orders') then
    create policy "Users read own orders" on public.orders for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='orders' and policyname='Service role write') then
    create policy "Service role write" on public.orders for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 4) Announcements + read receipts -----------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  audience text not null default 'all',
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='announcements' and policyname='Public read') then
    create policy "Public read" on public.announcements for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='announcements' and policyname='Service role write') then
    create policy "Service role write" on public.announcements for all using (auth.role() = 'service_role');
  end if;
end $$;

create table if not exists public.notification_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
alter table public.notification_reads enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='notification_reads' and policyname='Users manage own reads') then
    create policy "Users manage own reads" on public.notification_reads for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='notification_reads' and policyname='Service role write') then
    create policy "Service role write" on public.notification_reads for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 5) Subscriptions -----------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null,
  payment_ref text,
  status text not null default 'active',
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='Users read own subscription') then
    create policy "Users read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='Service role write') then
    create policy "Service role write" on public.subscriptions for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 6) Inventory (already documented as a comment in admin.functions.ts) -----
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  collection_slug text not null,
  collection_name text not null,
  piece_slug text not null,
  piece_name text not null,
  piece_number text not null default '',
  total_units integer not null default 0,
  sold_units integer not null default 0,
  booked_units integer not null default 0,
  status text not null default 'active',
  sort_order integer not null default 0,
  updated_at timestamptz default now()
);
alter table public.inventory enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='inventory' and policyname='Public read') then
    create policy "Public read" on public.inventory for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='inventory' and policyname='Service role write') then
    create policy "Service role write" on public.inventory for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 7) Member pieces (already documented as a comment in admin.functions.ts) -
create table if not exists public.member_pieces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references auth.users (id),
  piece_name text not null default '',
  piece_number text not null default '',
  collection text not null default '',
  edition_number text,
  edition_total integer,
  colorway text,
  size text,
  material text,
  fabric_weight text,
  fabric_composition text,
  origin text,
  workshop text,
  artisan text,
  thread_color text,
  thread_count text,
  stitching_type text,
  stitching_density text,
  buttons_material text,
  buttons_origin text,
  lining text,
  hardware text,
  care_instructions text,
  production_date text,
  quality_notes text,
  admin_notes text,
  unlocked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.member_pieces enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='member_pieces' and policyname='Owner or service role') then
    create policy "Owner or service role" on public.member_pieces for select
      using (auth.uid() = user_id or auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where tablename='member_pieces' and policyname='Service role write') then
    create policy "Service role write" on public.member_pieces for all using (auth.role() = 'service_role');
  end if;
end $$;

-- 8) Contact messages (already documented as a comment in admin.functions.ts)
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);
alter table public.contact_messages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='contact_messages' and policyname='Service role only') then
    create policy "Service role only" on public.contact_messages for all using (auth.role() = 'service_role');
  end if;
end $$;
