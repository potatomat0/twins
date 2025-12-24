-- Allow sender/receiver to update message status (delivered/seen/error)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='messages' and policyname='messages_update_status'
  ) then
    create policy messages_update_status on public.messages
      for update
      using (sender_id = auth.uid() or receiver_id = auth.uid())
      with check (sender_id = auth.uid() or receiver_id = auth.uid());
  end if;
end$$;
