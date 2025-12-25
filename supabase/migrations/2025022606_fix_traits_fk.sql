-- Fix relationship between user_traits and profiles for Postgrest detection
-- Currently both reference auth.users. 
-- We change user_traits to reference profiles(id) so Postgrest sees the link.

alter table public.user_traits
  drop constraint user_traits_user_id_fkey,
  add constraint user_traits_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

-- RLS policies might need adjustment if they relied on auth.users joins, 
-- but they use auth.uid() = user_id which works fine as long as user_id is the auth UUID.
-- Since profiles.id IS the auth UUID, this preserves the logic.
