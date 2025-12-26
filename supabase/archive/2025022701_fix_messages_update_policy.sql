-- Fix messages update policy to ensure status updates work
-- Drop the policy if it exists to ensure a clean slate
drop policy if exists messages_update_status on public.messages;

-- Create the policy allowing sender or receiver to update the row
-- We use USING to check visibility (must be sender or receiver)
-- We use WITH CHECK to ensure they remain sender or receiver (though usually they can't change those columns due to other constraints or lack of permission, but good to be safe)
create policy messages_update_status on public.messages
  for update
  using (sender_id = auth.uid() or receiver_id = auth.uid())
  with check (sender_id = auth.uid() or receiver_id = auth.uid());
