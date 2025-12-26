-- Matched pairs (mutual likes)
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create index if not exists matches_user_a_idx on public.matches (user_a);
create index if not exists matches_user_b_idx on public.matches (user_b);

alter table public.matches enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='match_select'
  ) then
    create policy match_select on public.matches
      for select
      using (auth.uid() = user_a or auth.uid() = user_b);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='match_insert'
  ) then
    create policy match_insert on public.matches
      for insert
      with check (auth.role() = 'service_role');
  end if;
end$$;
