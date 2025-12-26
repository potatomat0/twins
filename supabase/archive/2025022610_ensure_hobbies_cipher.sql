-- Ensure all trait columns exist in profiles (Cache Buster)
create extension if not exists vector with schema extensions;

alter table public.profiles
  add column if not exists pca_dim1 double precision,
  add column if not exists pca_dim2 double precision,
  add column if not exists pca_dim3 double precision,
  add column if not exists pca_dim4 double precision,
  add column if not exists hobby_embedding vector(384),
  add column if not exists b5_cipher text,
  add column if not exists b5_iv text,
  add column if not exists hobbies_cipher text,
  add column if not exists hobbies_iv text;

-- Ensure no plaintext hobbies
alter table public.profiles
  drop column if exists hobbies;