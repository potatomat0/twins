-- Enable Realtime for critical tables
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.messages;
