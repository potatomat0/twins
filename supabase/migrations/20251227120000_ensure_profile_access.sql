create or replace function public.get_matched_profile(target_id uuid)
returns table (
  id uuid,
  username text,
  age_group text,
  gender text,
  character_group varchar,
  avatar_url text,
  hobbies_cipher text,
  hobbies_iv text,
  pca_dim1 float8,
  pca_dim2 float8,
  pca_dim3 float8,
  pca_dim4 float8
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if:
  -- 1. Users are matched
  -- 2. It is self-lookup
  -- 3. The target user has LIKED the requesting user (latest action)
  if exists (
    select 1 from matches
    where (user_a = auth.uid() and user_b = target_id)
       or (user_b = auth.uid() and user_a = target_id)
  ) 
  or target_id = auth.uid()
  or (
    select outcome 
    from match_events 
    where actor_id = target_id and target_id = auth.uid()
    order by created_at desc 
    limit 1
  ) = 'like'
  then
    return query
    select
      p.id,
      p.username,
      p.age_group,
      p.gender,
      p.character_group,
      p.avatar_url,
      p.hobbies_cipher,
      p.hobbies_iv,
      p.pca_dim1,
      p.pca_dim2,
      p.pca_dim3,
      p.pca_dim4
    from profiles p
    where p.id = target_id;
  else
    return; -- Return empty if not authorized
  end if;
end;
$$;

grant execute on function public.get_matched_profile(uuid) to authenticated;

-- Also ensure get_profile_lookup exists with avatar_url for public list fetching if needed
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

grant execute on function public.get_profile_lookup(uuid[]) to authenticated;
