-- Notifications for likes, mutual likes, and messages
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('like', 'mutual', 'message')),
  payload jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id, read) where read = false;

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'recipient_select'
  ) then
    create policy recipient_select on public.notifications
      for select
      using (recipient_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'recipient_update'
  ) then
    create policy recipient_update on public.notifications
      for update
      using (recipient_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'service_insert'
  ) then
    create policy service_insert on public.notifications
      for insert
      with check (auth.role() = 'service_role');
  end if;
end$$;
