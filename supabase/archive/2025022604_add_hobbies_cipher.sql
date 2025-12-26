-- Add encrypted columns for hobbies
alter table public.profiles
  add column if not exists hobbies_cipher text,
  add column if not exists hobbies_iv text;

-- Note: We are keeping the original 'hobbies' column for now to avoid breaking the app during migration,
-- but the intention is to stop writing to it and eventually drop it or make it null.
