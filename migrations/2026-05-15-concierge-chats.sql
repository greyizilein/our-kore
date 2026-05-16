-- Chat history persistence for the concierge
-- Safe to re-run.

create table if not exists public.concierge_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default 'New Chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concierge_chats enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'concierge_chats' and policyname = 'Users manage own chats'
  ) then
    create policy "Users manage own chats" on public.concierge_chats
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists concierge_chats_user_updated_idx
  on public.concierge_chats (user_id, updated_at desc);
