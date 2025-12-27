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
  where p.id = target_id
  and (
    -- 1. Match exists
    exists (
      select 1 from matches m
      where (m.user_a = auth.uid() and m.user_b = target_id)
         or (m.user_b = auth.uid() and m.user_a = target_id)
    )
    -- 2. Self lookup
    or target_id = auth.uid()
    -- 3. Pending incoming like
    or (
      select outcome from match_events me
      where me.actor_id = target_id and me.target_id = auth.uid()
      order by me.created_at desc 
      limit 1
    ) = 'like'
  );
end;
$$;

grant execute on function public.get_matched_profile(uuid) to authenticated;
