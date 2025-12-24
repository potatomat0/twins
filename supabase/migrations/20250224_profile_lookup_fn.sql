-- Secure function to fetch profile/username/avatar for messaging
create or replace function public.get_profile_lookup(ids uuid[])
returns table(id uuid, username text, avatar_url text, email text)
language sql
security definer
set search_path = public
as $$
  select p.id,
         coalesce(p.username, au.raw_user_meta_data->>'username') as username,
         p.avatar_url,
         au.email
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.id = any(ids);
$$;

revoke all on function public.get_profile_lookup(uuid[]) from public;
grant execute on function public.get_profile_lookup(uuid[]) to authenticated;
