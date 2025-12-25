-- Ensure profiles table exists
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  age_group text,
  gender text,
  personality_fingerprint float4,
  pca_dim1 double precision,
  pca_dim2 double precision,
  pca_dim3 double precision,
  pca_dim4 double precision,
  b5_cipher text,
  b5_iv text,
  avatar_url text,
  created_at timestamptz default now(),
  character_group varchar
);

-- Enable RLS and owner-only policy on profiles
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_is_owner'
  ) then
    create policy profiles_is_owner
      on public.profiles
      for all
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;
