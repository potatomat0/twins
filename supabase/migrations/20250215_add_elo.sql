-- Add ELO-related columns and match_events table
alter table public.profiles
  add column if not exists elo_rating numeric default 1200,
  add column if not exists match_allow_elo boolean default true;

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  outcome text not null check (outcome in ('like','skip')),
  created_at timestamptz not null default now()
);

-- Index for lookups
create index if not exists match_events_actor_created_idx on public.match_events (actor_id, created_at desc);

-- RLS policies: actor can write/read their own events
alter table public.match_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'match_events' and policyname = 'actor_can_insert'
  ) then
    create policy actor_can_insert on public.match_events
      for insert
      with check (auth.uid() = actor_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'match_events' and policyname = 'actor_can_select'
  ) then
    create policy actor_can_select on public.match_events
      for select
      using (auth.uid() = actor_id);
  end if;
end$$;
