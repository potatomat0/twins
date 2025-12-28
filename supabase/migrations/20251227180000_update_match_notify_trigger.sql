-- Force replacement of the trigger function to include the delete logic
create or replace function public.handle_new_match_notify()
returns trigger
language plpgsql
security definer
as $$
declare
  prof_a record;
  prof_b record;
begin
  select id, username, avatar_url, age_group, gender, character_group into prof_a from public.profiles where id = new.user_a;
  select id, username, avatar_url, age_group, gender, character_group into prof_b from public.profiles where id = new.user_b;

  -- Cleanup: Remove any existing 'like' notifications between these two (User A <-> User B)
  delete from public.notifications
  where (recipient_id = new.user_a and actor_id = new.user_b and type = 'like')
     or (recipient_id = new.user_b and actor_id = new.user_a and type = 'like');

  -- Notify User A about B
  insert into public.notifications (recipient_id, actor_id, type, payload)
  values (
    new.user_a,
    new.user_b,
    'mutual',
    jsonb_build_object(
      'message', 'You have a mutual match',
      'actor', jsonb_build_object(
        'id', prof_b.id,
        'username', coalesce(prof_b.username, 'Someone'),
        'avatar_url', prof_b.avatar_url,
        'age_group', prof_b.age_group,
        'gender', prof_b.gender,
        'character_group', prof_b.character_group
      )
    )
  );

  -- Notify User B about A
  insert into public.notifications (recipient_id, actor_id, type, payload)
  values (
    new.user_b,
    new.user_a,
    'mutual',
    jsonb_build_object(
      'message', 'You have a mutual match',
      'actor', jsonb_build_object(
        'id', prof_a.id,
        'username', coalesce(prof_a.username, 'Someone'),
        'avatar_url', prof_a.avatar_url,
        'age_group', prof_a.age_group,
        'gender', prof_a.gender,
        'character_group', prof_a.character_group
      )
    )
  );

  return new;
end;
$$;
