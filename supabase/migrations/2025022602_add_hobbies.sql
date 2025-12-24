-- Enable pgvector extension for embedding storage
create extension if not exists vector with schema extensions;

-- Add hobbies text array and embedding vector to profiles
alter table public.profiles
  add column if not exists hobbies text[] default '{}',
  add column if not exists hobby_embedding vector(384);

-- Add index for faster vector similarity search (IVFFlat or HNSW)
-- We'll use IVFFlat for now as it's general purpose, though HNSW is better for performance/recall trade-off
-- Note: You need some data for the index to be effectively built usually, but defining it is good.
-- For small datasets, exact search is fine, but let's add HNSW for future proofing.
create index if not exists profiles_hobby_embedding_idx on public.profiles
  using hnsw (hobby_embedding vector_cosine_ops);
