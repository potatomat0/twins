-- Fix dependencies before dropping columns
drop view if exists public.mock_profiles_report;
drop view if exists public.high_similarity_pairs;

-- Create new table for heavy/private traits
create table if not exists public.user_traits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pca_dim1 double precision,
  pca_dim2 double precision,
  pca_dim3 double precision,
  pca_dim4 double precision,
  hobby_embedding vector(384),
  b5_cipher text,
  b5_iv text,
  hobbies_cipher text,
  hobbies_iv text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_traits enable row level security;

-- Policies
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'traits_owner_select' and tablename = 'user_traits') then
    create policy "traits_owner_select" on public.user_traits
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'traits_owner_insert' and tablename = 'user_traits') then
    create policy "traits_owner_insert" on public.user_traits
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'traits_owner_update' and tablename = 'user_traits') then
    create policy "traits_owner_update" on public.user_traits
      for update using (auth.uid() = user_id);
  end if;
end$$;

-- Migrate existing data from profiles to user_traits
insert into public.user_traits (
  user_id, pca_dim1, pca_dim2, pca_dim3, pca_dim4, 
  hobby_embedding, b5_cipher, b5_iv, hobbies_cipher, hobbies_iv
)
select 
  id, pca_dim1, pca_dim2, pca_dim3, pca_dim4, 
  hobby_embedding, b5_cipher, b5_iv, hobbies_cipher, hobbies_iv
from public.profiles
on conflict (user_id) do update set
  pca_dim1 = excluded.pca_dim1,
  pca_dim2 = excluded.pca_dim2,
  pca_dim3 = excluded.pca_dim3,
  pca_dim4 = excluded.pca_dim4,
  hobby_embedding = excluded.hobby_embedding,
  b5_cipher = excluded.b5_cipher,
  b5_iv = excluded.b5_iv,
  hobbies_cipher = excluded.hobbies_cipher,
  hobbies_iv = excluded.hobbies_iv;

-- Update my_profile view to include traits
drop view if exists public.my_profile;

create or replace view public.my_profile as
select
  p.id,
  p.username,
  p.age_group,
  p.gender,
  p.character_group,
  p.avatar_url,
  p.elo_rating,
  p.match_allow_elo,
  u.email,
  u.email_confirmed_at,
  t.pca_dim1,
  t.pca_dim2,
  t.pca_dim3,
  t.pca_dim4,
  t.hobby_embedding,
  t.b5_cipher,
  t.b5_iv,
  t.hobbies_cipher,
  t.hobbies_iv
from public.profiles p
join auth.users u on u.id = p.id
left join public.user_traits t on t.user_id = p.id
where p.id = auth.uid();

grant select on public.my_profile to authenticated;

-- Drop migrated columns from profiles
alter table public.profiles 
  drop column if exists pca_dim1,
  drop column if exists pca_dim2,
  drop column if exists pca_dim3,
  drop column if exists pca_dim4,
  drop column if exists hobby_embedding,
  drop column if exists b5_cipher,
  drop column if exists b5_iv,
  drop column if exists hobbies_cipher,
  drop column if exists hobbies_iv;

-- Drop plaintext hobbies column
alter table public.profiles
  drop column if exists hobbies;