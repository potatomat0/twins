-- Revert table split: Move traits back to profiles

-- 1. Add columns back to profiles
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
  add column if not exists hobbies text[]; -- Adding back plaintext hobbies as nullable fallback/cache if needed

-- 2. Migrate data back from user_traits
update public.profiles p
set
  pca_dim1 = t.pca_dim1,
  pca_dim2 = t.pca_dim2,
  pca_dim3 = t.pca_dim3,
  pca_dim4 = t.pca_dim4,
  hobby_embedding = t.hobby_embedding,
  b5_cipher = t.b5_cipher,
  b5_iv = t.b5_iv,
  hobbies_cipher = t.hobbies_cipher,
  hobbies_iv = t.hobbies_iv
from public.user_traits t
where p.id = t.user_id;

-- 3. Drop the split view and table
drop view if exists public.my_profile;
drop table if exists public.user_traits;

-- 4. Recreate simple my_profile view
create or replace view public.my_profile as
select
  p.*,
  u.email,
  u.email_confirmed_at
from public.profiles p
join auth.users u on u.id = p.id
where p.id = auth.uid();

grant select on public.my_profile to authenticated;
