-- RLS policies for storage bucket "user-upload" (avatar uploads)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='user-upload select own'
  ) then
    create policy "user-upload select own" on storage.objects
      for select
      using (bucket_id = 'user-upload' and auth.uid() = owner);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='user-upload insert own'
  ) then
    create policy "user-upload insert own" on storage.objects
      for insert
      with check (bucket_id = 'user-upload' and auth.uid() = owner);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='user-upload update own'
  ) then
    create policy "user-upload update own" on storage.objects
      for update
      using (bucket_id = 'user-upload' and auth.uid() = owner)
      with check (bucket_id = 'user-upload' and auth.uid() = owner);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='user-upload delete own'
  ) then
    create policy "user-upload delete own" on storage.objects
      for delete
      using (bucket_id = 'user-upload' and auth.uid() = owner);
  end if;
end$$;
