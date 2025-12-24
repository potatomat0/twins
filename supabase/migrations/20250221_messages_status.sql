-- Add status tracking to messages
alter table public.messages
  add column if not exists status text not null default 'sent' check (status in ('sending','sent','delivered','seen','error')),
  add column if not exists updated_at timestamptz not null default now();

-- Trigger to keep updated_at current
create or replace function public.set_messages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row
execute procedure public.set_messages_updated_at();
