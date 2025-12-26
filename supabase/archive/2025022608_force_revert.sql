-- Forcefully Ensure Single Table Architecture

-- 1. Ensure columns exist in profiles (idempotent)
alter table public.profiles
  add column if not exists pca_dim1 double precision,
  add column if not exists pca_dim2 double precision,
  add column if not exists pca_dim3 double precision,
  add column if not exists pca_dim4 double precision,
  add column if not exists hobby_embedding vector(384),
  add column if not exists b5_cipher text,
  add column if not exists b5_iv text,
  add column if not exists hobbies_cipher text,
  add column if not exists hobbies_iv text,
  add column if not exists hobbies text[];

-- 2. Attempt to rescue data from user_traits if it exists
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'user_traits') then
    update public.profiles p
    set
      pca_dim1 = coalesce(t.pca_dim1, p.pca_dim1),
      pca_dim2 = coalesce(t.pca_dim2, p.pca_dim2),
      pca_dim3 = coalesce(t.pca_dim3, p.pca_dim3),
      pca_dim4 = coalesce(t.pca_dim4, p.pca_dim4),
      hobby_embedding = coalesce(t.hobby_embedding, p.hobby_embedding),
      b5_cipher = coalesce(t.b5_cipher, p.b5_cipher),
      b5_iv = coalesce(t.b5_iv, p.b5_iv),
      hobbies_cipher = coalesce(t.hobbies_cipher, p.hobbies_cipher),
      hobbies_iv = coalesce(t.hobbies_iv, p.hobbies_iv)
    from public.user_traits t
    where p.id = t.user_id;
  end if;
end$$;

-- 3. Nuke user_traits and old views with extreme prejudice
drop view if exists public.my_profile cascade;
drop table if exists public.user_traits cascade;

-- 4. Rebuild the simple view
create or replace view public.my_profile as
select
  p.*,
  u.email,
  u.email_confirmed_at
from public.profiles p
join auth.users u on u.id = p.id
where p.id = auth.uid();

grant select on public.my_profile to authenticated;
