-- Messaging between matched users
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_match_created_idx on public.messages (match_id, created_at desc);

alter table public.messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_select'
  ) then
    create policy messages_select on public.messages
      for select
      using (
        exists (
          select 1 from public.matches m
          where m.id = match_id
            and (m.user_a = auth.uid() or m.user_b = auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_insert'
  ) then
    create policy messages_insert on public.messages
      for insert
      with check (
        sender_id = auth.uid()
        and exists (
          select 1 from public.matches m
          where m.id = match_id
            and (m.user_a = sender_id or m.user_b = sender_id)
            and (receiver_id = m.user_a or receiver_id = m.user_b)
        )
      );
  end if;
end$$;
