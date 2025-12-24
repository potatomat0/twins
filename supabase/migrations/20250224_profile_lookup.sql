-- View to combine auth.users metadata with public.profiles for messaging/name lookup
create or replace view public.profile_lookup as
select
  p.id,
  coalesce(p.username, (au.raw_user_meta_data->>'username')) as username,
  p.avatar_url,
  au.email
from public.profiles p
join auth.users au on au.id = p.id;

-- No RLS on views; underlying tables enforce policies.

