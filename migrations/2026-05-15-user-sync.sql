-- Cross-device sync tables for cart and saved pieces
-- Run in Supabase SQL editor. Safe to re-run.

create table if not exists public.user_carts (
  user_id uuid primary key references auth.users on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_carts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_carts' and policyname='Users manage own cart') then
    create policy "Users manage own cart" on public.user_carts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.user_saved (
  user_id uuid primary key references auth.users on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_saved enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_saved' and policyname='Users manage own saved') then
    create policy "Users manage own saved" on public.user_saved for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Enable realtime on both tables
alter publication supabase_realtime add table public.user_carts;
alter publication supabase_realtime add table public.user_saved;
