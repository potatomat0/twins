  -- Allow any authenticated user to read objects in user-upload
  create policy "auth read user-upload"
  on storage.objects
  for select
  using (bucket_id = 'user-upload' and auth.role() = 'authenticated');

  -- Allow the owner to insert objects under user-upload
  create policy "auth insert user-upload"
  on storage.objects
  for insert
  with check (
    bucket_id = 'user-upload'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'avatars' -- optional: constrain to avatars folder
  );

  -- Allow the owner to update/delete their own objects (optional, but recommended)
  create policy "auth update user-upload"
  on storage.objects
  for update
  using (
    bucket_id = 'user-upload'
    and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'user-upload'
    and auth.role() = 'authenticated'
  );

  create policy "auth delete user-upload"
  on storage.objects
  for delete
  using (
    bucket_id = 'user-upload'
    and auth.role() = 'authenticated'
  );

